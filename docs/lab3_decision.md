# docs/lab3_decision.md: Keputusan Forward vs Backward Rasterisation

Dokumen ini memuat analisis perbandingan dua paradigma rendering denah lantai 2D: **Forward** (rasterisasi garis primitif dari geometri ke piksel layar menggunakan algoritma Bresenham) versus **Backward** (pengujian jarak setiap piksel layar terhadap seluruh segmen denah, paradigma ray/distance-test), pada zoom $1\times$ dan $10\times$.

---

## 1. Prediksi Tertulis (Dirumuskan Sebelum Benchmark Dijalankan)

Sebelum mengeksekusi `node bench.mjs`, analisis teoretis kompleksitas komputasi dirumuskan sebagai berikut:

### Hipotesis Kompleksitas
1. **Forward Rasterisation (`lineBresenham`)**:
   - Kompleksitas: $\mathcal{O}(S \cdot \bar{L})$, di mana $S$ adalah jumlah segmen polylines dan $\bar{L}$ adalah panjang rata-rata segmen dalam piksel layar.
   - Karakteristik: Forward hanya mengunjungi piksel-piksel yang berada tepat di sepanjang garis yang digambar.
   - Prediksi Zoom $1\times$: Pada denah 104 segmen dengan panjang rata-rata ~30–50 piksel, total piksel yang diproses berkisar $3.000$ hingga $5.000$ piksel. Waktu eksekusi diprediksi sangat singkat ($< 2\text{ ms}$).
   - Prediksi Zoom $10\times$: Pembesaran $10\times$ meningkatkan panjang segmen sebesar $10\times$ ($\bar{L}_{10\times} \approx 10 \cdot \bar{L}_{1\times}$), sehingga jumlah langkah piksel Bresenham meningkat sebanding ($~3\times - 10\times$ lebih lambat dari zoom $1\times$, bergantung pada clipping batas kanvas).

2. **Backward Rasterisation (Per-Pixel Distance Test)**:
   - Kompleksitas: $\mathcal{O}(W \cdot H \cdot S)$, di mana $W \times H$ adalah resolusi framebuffer ($800 \times 600 = 480.000$ piksel) dan $S$ adalah jumlah segmen.
   - Karakteristik: Untuk setiap piksel $(x,y)$, algoritma menghitung proyeksi titik ke segmen garis menggunakan perkalian dot product dan perbandingan jarak kuadrat ($dx^2 + dy^2 \le 0.5625$).
   - Prediksi Zoom $1\times$: Total evaluasi operasi matematis mencapai $480.000 \times 104 \approx 50.000.000$ operasi. Diprediksi akan memakan waktu ratusan hingga ribuan milidetik ($> 500\text{ ms}$).
   - Prediksi Zoom $10\times$: Karena $W \times H$ dan jumlah segmen $S$ bernilai konstan, beban iterasi teoretis adalah datar (*flat*), tidak bergantung pada skala zoom.

### Prediksi Rasio dan Urutan
Diprediksikan bahwa **Forward akan jauh lebih cepat daripada Backward** pada kedua tingkat zoom, dengan rasio keunggulan Forward mencapai **ratusan hingga seribu kali lipat ($> 200\times - 1000\times$)** pada zoom $1\times$.

---

## 2. Tabulasi Pengukuran Riil (`bench.mjs`)

Pengujian dijalankan pada lingkungan host nyata (Node.js `v22.16.0`, CPU x64 Windows 11, kanvas $800 \times 600$, `iters = 10`):

### A. Subjek Modul: `myplan.json` (Candi Siwa Prambanan, 104 segmen)

| Tingkat Zoom | Forward (ms) | Backward (ms) | Rasio Kecepatan ($T_{\text{bwd}} / T_{\text{fwd}}$) | FPS Forward | FPS Backward |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **$1\times$** | **1.203 ms** | **1239.560 ms** | **1030.5x** | ~831 FPS | ~0.8 FPS |
| **$10\times$** | **3.337 ms** | **722.975 ms** | **216.6x** | ~299 FPS | ~1.4 FPS |

### B. Baseline Modul: `pusaka_plan.json` (Denah Bawaan Dosen, 37 segmen)

| Tingkat Zoom | Forward (ms) | Backward (ms) | Rasio Kecepatan ($T_{\text{bwd}} / T_{\text{fwd}}$) | FPS Forward | FPS Backward |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **$1\times$** | **1.534 ms** | **463.384 ms** | **302.1x** | ~651 FPS | ~2.1 FPS |
| **$10\times$** | **3.381 ms** | **346.456 ms** | **102.5x** | ~295 FPS | ~2.9 FPS |

---

## 3. Rekonsiliasi Hasil Pengukuran vs Prediksi

1. **Kecepatan Forward**:
   - Prediksi terbukti sangat akurat. Pada zoom $1\times$, Forward menyelesaikan penggambaran seluruh 104 segmen dalam **1.203 ms**.
   - Pada zoom $10\times$, waktu Forward meningkat menjadi **3.337 ms** (faktor kenaikan $\approx 2.77\times$). Kenaikan tidak mencapai penuh $10\times$ karena segmen-segmen yang ter-zoom keluar dari kanvas $800 \times 600$ sebagian tetap diiterasi namun tidak menggambar seluruh panjang piksel di layar.
2. **Karakteristik Backward**:
   - Waktu Backward berada pada orde ribuan milidetik (**1239.560 ms** pada zoom $1\times$).
   - Pada zoom $10\times$, waktu Backward terukur sebesar **722.975 ms** (turun sekitar $41\%$).
   - *Penyebab Deviasi*: Algoritma backward menyertakan optimasi pemutus sirkuit: `if (dx * dx + dy * dy <= 0.5625) { fb.set(...); break; }`. Ketika denah diperbesar $10\times$, luas area piksel yang berada dalam ambang batas garis ($\le 0.75\text{ px}$) meningkat, sehingga kondisi `break` lebih awal terpenuhi pada loop segmen bagian dalam, menghemat sebagian pengujian jarak segmen berikutnya. Meski demikian, Backward tetap ratusan kali lebih lambat dari Forward.

---

## 4. Keputusan untuk Viewer Denah Pan/Zoom

**Pilihan Ter-Commit: FORWARD RASTERISATION (`lineBresenham` / Vertex Pipeline)**.

### Alasan Pertahanan:
1. **Memenuhi Budget Frame Interaktif (60 FPS / 16.6 ms)**:
   - Viewer web interaktif membutuhkan respon mulus saat pengguna melakukan dragging (pan) dan zooming secara kontinu.
   - Forward rasterisation hanya membutuhkan **1.2 ms – 3.3 ms per frame**, setara dengan **300 – 800 FPS**, meninggalkan sisa waktu komputasi yang sangat lega untuk tugas browser lainnya (event handling, layouting, UI update).
   - Sebaliknya, Backward rasterisation membutuhkan **722 ms – 1240 ms per frame** ($< 1.5\text{ FPS}$), yang menyebabkan viewer macet total (*unusable frozen UI*).
2. **Skalabilitas terhadap Luas Layar**:
   - Jika canvas ditingkatkan ke resolusi resolusi tinggi (misal 4K: $3840 \times 2160 = 8.294.400$ piksel), beban Backward melonjak $17.2\times$ menjadi $\approx 21$ detik per frame!
   - Forward rasterisation hampir tidak terpengaruh oleh penambahan resolusi kosong karena kompleksitasnya hanya terikat pada jumlah segmen yang digambar.

---

## 5. Keterbatasan & Kondisi di Mana Pilihan Berbalik

Forward rasterisation tidak selalu menjadi pemenang mutlak di semua skenario grafika komputer. Berikut adalah **3 kondisi konkret** di mana paradigma **Backward** berbalik menjadi lebih unggul dan rasional dibanding Forward:

1. **Kerapatan Segmen Ekstrem (*Dense Segment Soup / Hairball Geometry*)**:
   - *Kondisi*: Jika denah memiliki puluhan ribu segmen garis mikro yang bertumpuk pada area sempit (misal $S \ge 100.000$ segmen akibat model CAD mentah atau simulasi rambut/serat).
   - *Pembalikan*: Biaya Forward membengkak secara linear dengan jumlah segmen ($\mathcal{O}(S)$) dan mengalami pemborosan overdraw parah pada piksel yang sama. Pada Backward dengan bantuan struktur akselerasi spasial (seperti BVH, $k$-d tree, atau uniform grid hierarchy), pencarian jarak segmen terdekat per piksel tereduksi menjadi $\mathcal{O}(\log S)$, sehingga beban komputasi per frame menjadi terikat pada jumlah piksel layar ($\mathcal{O}(\text{pixel})$), bukan jumlah segmen.

2. **Rendering Signed Distance Field (SDF) & Shader Efek Per-Piksel di GPU**:
   - *Kondisi*: Kebutuhan visual tingkat lanjut seperti *sub-pixel anti-aliasing* analitik, garis bergradien halus, bayangan jatuh dinamis (*drop shadow*), efek pendar (*glow*), atau ketebalan garis fleksibel tak terbatas tanpa men-generate geometri baru.
   - *Pembalikan*: Di GPU modern, ribuan core komputasi mengeksekusi fragment shader secara paralel. Evaluasi fungsi jarak analitik per piksel (Backward SDF) berjalan konstan dalam satu draw-call fullscreen quad tanpa overhead manajemen vertex buffer, tessellation, ataupun state-switch pada driver grafika.

3. **Resolusi Output Sangat Kecil (*Micro Thumbnail / Low-Resolution Canvas*)**:
   - *Kondisi*: Render ikon mini-map atau thumbnail resolusi sangat rendah (misal $32 \times 32 = 1.024$ piksel).
   - *Pembalikan*: Total piksel hanya 1.024. Kompleksitas Backward $1.024 \times S$ menjadi sangat murah secara absolut, sementara overhead setup geometri, rasteriser state machine, dan triangle/line setup pada Forward pipeline dapat melebihi komputasi matematis langsung pada piksel.
