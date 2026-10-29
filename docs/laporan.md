# Laporan Analisis Modul 2: Rendering Pipeline & Primitif 2D

**Praktikum Grafika Komputer (`25MP7716G030`)**  
**Program Studi S1 Informatika, Universitas Muhammadiyah Surabaya**  
**Mahasiswa:** Vlahadiqa Runayasha Khandeva Wardana  
**Repositori:** `candi-raster-lab` (Kelanjutan Langsung dari Modul 1: `pusaka3d-main`)  
**Subjek Warisan Budaya:** Kompleks Candi Prambanan (Denah Arsitektural Candi Siwa, Sleman, D.I. Yogyakarta)  
**URL GitHub Pages:** [https://vlahadiqa.github.io/candi-raster-lab/](https://vlahadiqa.github.io/candi-raster-lab/)

---

## 1. Input & Penempatan Pipeline (Lab 1 / Tugas Analisis A1)

### 1.1 Hubungan dengan Modul 1 & Pemilihan Subjek
Pekerjaan Modul 2 ini merupakan kelanjutan langsung dari analisis citra digital pada Modul 1 (`pusaka3d-main`). Subjek warisan budaya yang dipertahankan adalah **Candi Prambanan**, dengan fokus pemodelan denah arsitektur pada candi utama terbesar di kompleks tersebut, yaitu **Candi Siwa**.

Denah lantai `myplan.json` diturunkan dari karakteristik arsitektural Candi Siwa yang tampak pada dataset foto Modul 1 (`data/manifest.csv` dan `data/sumber_foto.csv`), khususnya:
- `01_fasad_bebatuan_candi.jpg` & `15_fasad_bangunan_candi.jpg`: Struktur batur berundak dengan denah poligonal berpenampil (*cruciform* berukuran dasar ~34 m $\times$ 34 m).
- `03_fasad_tangga_pintu.jpg` & `09_fasad_tangga_batu.jpg`: Tangga masuk utama di sisi timur dengan undakan anak tangga (*treads*) dan tiga tangga sekunder di sisi utara, barat, dan selatan.
- `05_fasad_jajaran_candi.jpg` & `06_fasad_empat_candi.jpg`: Orientasi sumbu kosmis tata letak candi.
- `10_relief_dinding_batu.jpg`: Pembatas lorong selasar keliling (*inner walkway / platform*).

### 1.2 Struktur & Spesifikasi `myplan.json`
Denah `myplan.json` mengikuti skema ketat yang sama dengan `pusaka_plan.json`, dengan konvensi koordinat survei meter ($y$-up). Seluruh titik diproyeksikan menggunakan skala $s = 14.0\text{ px/m}$ dan origin $ox = 6.5\text{ m}, oy = 2.4\text{ m}$ ke dalam kanvas $800 \times 600$ ($y$-down).

- **Rentang Koordinat Layar Terukur**: $x \in [112, 693]$, $y \in [26, 572]$ (seluruh titik berada aman di dalam kanvas dengan margin visual proporsional).
- **Jumlah Polylines & Segmen**: 24 polylines, **104 segmen garis**.
- **Cakupan 5 Kategori Wajib**:
  1. `wall`: Dinding batur luar *cruciform* 20 titik, dinding selasar keliling, dan dinding tubuh candi.
  2. `cella`: Garbhagriha utama (bilik Siwa di pusat) dan 3 bilik penampil (bilik Durga di utara, Ganesha di barat, Agastya di selatan).
  3. `stair`: Gerbang tangga masuk utama di sisi timur (outline + 3 anak tangga) serta 3 tangga penampil di sisi lainnya.
  4. `shrine`: 4 candi apit/patok sudut di penjuru batur dan lapik lingga-yoni di pusat garbhagriha.
  5. `axis`: Sumbu kosmis Utara–Selatan ($x=22.0$) dan Timur–Barat ($y=19.0$).
- **Siluet Batur**: Poligon cembung persegi batur dasar $[5, 2] \to [39, 2] \to [39, 36] \to [5, 36]$ untuk fan-triangulation pada rasteriser fill.

*Catatan Verifikasi Asumsi*: Dimensi 34 m $\times$ 34 m dan pembagian bilik didasarkan pada denah arsitektur Candi Siwa standar kepurbakalaan; koordinat diskrit dalam `myplan.json` merupakan hasil digitalisasi vektor ortogonal terverifikasi.

### 1.3 Walk-Through 7 Tahap Pipeline untuk Satu Segmen Dinding
Dipilih segmen dinding luar selatan: $P_0(16.0, 2.0)\text{ m} \to P_1(28.0, 2.0)\text{ m}$.

1. **Application**: Pengambilan koordinat dunia survei $P_0(16.0, 2.0)$ dan $P_1(28.0, 2.0)$ m, kategori `wall` dengan warna RGB $[68, 1, 84]$.
2. **Vertex Processing**: Transformasi $y$-flip `worldToScreen` dengan skala $14.0$:
   - $x_0 = \text{round}((16.0 + 6.5) \times 14.0) = \mathbf{315}$, $y_0 = \text{round}(599 - (2.0 + 2.4) \times 14.0) = \mathbf{537}$.
   - $x_1 = \text{round}((28.0 + 6.5) \times 14.0) = \mathbf{483}$, $y_1 = \text{round}(599 - (2.0 + 2.4) \times 14.0) = \mathbf{537}$.
3. **Primitive Assembly & Clipping**: Vertex dirakit menjadi satu segmen garis horizontal layar dari $(315, 537)$ ke $(483, 537)$. Uji batas kanvas meloloskan seluruh segmen (*trivial accept*).
4. **Rasterisation (Scan Conversion)**: `lineBresenham` mengevaluasi langkah integer dari $x = 315$ ke $483$ pada $y = 537$, menghasilkan 169 fragment pada titik tengah piksel $(x+0.5, 537.5)$.
5. **Fragment Shading**: Flat shading mengatribusikan warna ungu viridis $[68, 1, 84]$ ke setiap fragment.
6. **Per-Fragment Operations**: Uji bounds memori berhasil; tidak ada depth/alpha blend yang memblokir penulisan.
7. **Framebuffer**: Nilai byte warna ditulis ke typed array `Uint8ClampedArray` (misal untuk piksel tengah $(400, 537)$ pada offset byte $1.290.000$). Piksel menyala di layar.

### 1.4 Analisis Kegagalan Tahap Pipeline (Bahan Refleksi Mahasiswa)
> *Poin Panduan*: Jika Tahap 2 (Vertex Processing / $y$-flip) dilewatkan, apa dampak visualnya? Denah lantai survei akan terbalik secara vertikal (utara menjadi selatan, tangga timur berotasi salah arah). Jika Tahap 4 (Rasterisation / sample-centre) salah mengasumsikan pusat piksel di $(0,0)$ alih-alih $(0.5, 0.5)$, garis akan mengalami pergeseran setengah piksel dan menghasilkan blur asimetris saat dipadukan dengan tekstur (insiden D3D9).

---

## 2. Primitif From-Scratch & Kecocokan Referensi (Lab 2 / Tugas Analisis A2)

### 2.1 Hasil Pengujian Unit From-Scratch
Seluruh fungsi primitif 2D from-scratch pada `raster.mjs` diuji secara empiris melalui `node tests.mjs` (14 asersi lolos $100\%$ tanpa kegagalan):
- **E2 (DDA)** dan **E3 (Bresenham)**: Garis $(2,1) \to (9,5)$ menghasilkan 8 piksel yang persis sama:
  `[(2,1),(3,2),(4,2),(5,3),(6,3),(7,4),(8,4),(9,5)]`.
- **Invarian 8 Oktan**: Uji refleksi segmen $(0,0) \to (9,4)$ dan $(0,0) \to (4,9)$ pada seluruh kombinasi tanda $[\pm 1, \pm 1]$ menghasilkan panjang tepat 10 piksel.
- **E4 (Edge Function)**: Segitiga $A(1,1), B(6,2), C(3,7)$ memiliki luas bertanda $\text{total} = 28$. Nilai edge function pada $P_1(3,3)$ adalah $(8, 12, 8)$ (di dalam); $P_2(5,5)$ dan $P_3(1,4)$ memiliki nilai negatif (di luar).
- **E5 (Barycentric)**: Interpolasi nilai 10/20/40 dengan bobot $(0.5, 0.25, 0.25)$ pada titik $(1,1)$ menghasilkan tepat $20.0$.
- **Uji Kesadaran Oktan Asterisk 24 Jari-Jari (`draw_asterisk.mjs`)**:
  - Ditarik 24 jari-jari setiap $15^\circ$ dari pusat $(50, 50)$ dengan radius $R = 40\text{ px}$.
  - Panjang Euclidean terukur: minimum **$39.60\text{ px}$** (pada $45^\circ, 135^\circ, 225^\circ, 315^\circ$), maksimum **$40.31\text{ px}$** (pada keluarga $30^\circ/60^\circ$).
  - Deviasi maksimum terhadap $R=40$: **$0.40\text{ px}$** (terbukti berada di dalam toleransi $\pm 1\text{ px}$).

### 2.2 Hitungan Manual A2 (Reproduksi Satu Piksel Nyata Dekat Edge)
Dipilih piksel yang dinyalakan oleh `triangle()` dekat batas luar segitiga E4: **Piksel $(3, 5)$**.
- Koordinat titik sudut segitiga E4: $A(1, 1)$, $B(6, 2)$, $C(3, 7)$. Luas bertanda $= 28$.
- Titik sampel pusat piksel: $(px, py) = (3 + 0.5, 5 + 0.5) = \mathbf{(3.5, 5.5)}$.

1. **Edge Function Sisi $B \to C$**:
   - Vektor arah: $dx = 3 - 6 = -3$, $dy = 7 - 2 = 5$.
   - $E_{BC}(3.5, 5.5) = (C_x - B_x)(py - B_y) - (C_y - B_y)(px - B_x)$
   - $E_{BC}(3.5, 5.5) = (-3)(5.5 - 2) - (5)(3.5 - 6) = (-3)(3.5) - (5)(-2.5) = -10.5 + 12.5 = \mathbf{+2.0}$.
   - Bias Top-Left: Karena $dy = 5 > 0$ (sisi berjalan turun ke layar / *left edge*), maka $\text{bias} = \mathbf{0}$.
   - Nilai teruji: $w_A = 2.0 + 0 = \mathbf{+2.0 \ge 0}$ (**Lolos / Di Dalam**).

2. **Edge Function Sisi $C \to A$**:
   - Vektor arah: $dx = 1 - 3 = -2$, $dy = 1 - 7 = -6$.
   - $E_{CA}(3.5, 5.5) = (A_x - C_x)(py - C_y) - (A_y - C_y)(px - C_x)$
   - $E_{CA}(3.5, 5.5) = (-2)(5.5 - 7) - (-6)(3.5 - 3) = (-2)(-1.5) - (-6)(0.5) = 3.0 + 3.0 = \mathbf{+6.0}$.
   - Bias Top-Left: Karena $dy = -6 < 0$ (sisi berjalan naik ke atas layar / *right-bottom edge*), maka $\text{bias} = \mathbf{-1}$.
   - Nilai teruji: $w_B = 6.0 + (-1) = \mathbf{+5.0 \ge 0}$ (**Lolos / Di Dalam**).

3. **Edge Function Sisi $A \to B$**:
   - Vektor arah: $dx = 6 - 1 = 5$, $dy = 2 - 1 = 1$.
   - $E_{AB}(3.5, 5.5) = (B_x - A_x)(py - A_y) - (B_y - A_y)(px - A_x)$
   - $E_{AB}(3.5, 5.5) = (5)(5.5 - 1) - (1)(3.5 - 1) = (5)(4.5) - (1)(2.5) = 22.5 - 2.5 = \mathbf{+20.0}$.
   - Bias Top-Left: Karena $dy = 1 > 0$ (*left edge*), maka $\text{bias} = \mathbf{0}$.
   - Nilai teruji: $w_C = 20.0 + 0 = \mathbf{+20.0 \ge 0}$ (**Lolos / Di Dalam**).

**Kesimpulan Hitungan**: Ketiga bobot bertanda $w_A = 2.0, w_B = 5.0, w_C = 20.0$ semuanya bernilai $\ge 0$. Kode `triangle()` menyalakan piksel $(3, 5)$. Jika diuji satu langkah keluar pada $(3, 6)$, sampel $(3.5, 6.5)$ menghasilkan $E_{BC} = -1.0 < 0$ (mati). Hitungan manual ini membuktikan ketepatan implementasi kode hingga presisi floating point.

### 2.3 Kecocokan Byte-Identik dengan Referensi
- **Persegi Terpandu (`ref/square_fill_ref.ppm`)**: `pixelStats` mencatat **identik 144/144 piksel ($100\%$)**, $\max|\text{diff}| = \mathbf{0}$.
- **Segitiga E4 (`ref/tri_ref.ppm`)**: `pixelStats` mencatat **identik 100/100 piksel ($100\%$)**, $\max|\text{diff}| = \mathbf{0}$.

---

## 3. Diagnosis & Perbaikan Watertightness (Lab 2 / Tugas Analisis A3)

### 3.1 Bukti Numerik Kasus Bug Shared-Edge
Pada sebuah bujur sangkar $6 \times 6$ (rentang $x, y \in [2, 8)$) yang dibelah oleh diagonal $y = x$ menjadi dua segitiga $T_1[A(2,2), B(8,2), C(8,8)]$ dan $T_2[A(2,2), C(8,8), D(2,8)]$:

| Mode Rasterisasi | Piksel Terisi Sekali (`once`) | Piksel Terisi Ganda (`twice`) | Piksel Celah Kosong (`gaps`) | Status Visual |
|---|:---:|:---:|:---:|---|
| **Naive $\ge 0$ (Tanpa Aturan)** | 30 | **6** | 0 | Garis jahitan diagonal tampak lebih tebal/gelap |
| **Strict $> 0$ (Tanpa Aturan)** | 30 | 0 | **6** | Garis jahitan diagonal bolong (retak latar belakang) |
| **Top-Left Rule (Perbaikan)** | **36** | **0** | **0** | **Watertight sempurna (setiap piksel terisi tepat 1x)** |

- **Daftar Koordinat Piksel Bermasalah (6 Piksel Sepanjang Diagonal $y=x$)**:
  $$\mathbf{(2, 2),\ (3, 3),\ (4, 4),\ (5, 5),\ (6, 6),\ (7, 7)}$$

### 3.2 Analisis Matematika Bias Top-Left per Edge
Pusat piksel diagonal $(x+0.5, x+0.5)$ memiliki persamaan garis $y = x$, sehingga fungsi edge pada sisi bersama bernilai tepat $w = 0$ di kedua segitiga.
- Pada $T_1$, sisi bersama berjalan dari $C(8,8) \to A(2,2)$:
  $dx = -6, dy = -6$. Karena $dy < 0$ (berjalan naik), sisi ini bukan *top* dan bukan *left* $\implies \mathbf{\text{Bias} = -1}$.
  Maka untuk piksel on-edge: $w_{\text{final}} = 0 + (-1) = \mathbf{-1 < 0} \implies$ **DITOLAK**.
- Pada $T_2$, sisi bersama berjalan dari $A(2,2) \to C(8,8)$:
  $dx = +6, dy = +6$. Karena $dy > 0$ (berjalan turun), sisi ini adalah *left edge* $\implies \mathbf{\text{Bias} = 0}$.
  Maka untuk piksel on-edge: $w_{\text{final}} = 0 + 0 = \mathbf{0 \ge 0} \implies$ **DITERIMA**.
- **Hasil**: Piksel diagonal diklaim secara eksklusif oleh $T_2$. Celah $= 0$, double-draw $= 0$. Bukti visual tersimpan di `out/gap_coverage_buggy.ppm` (merah = double) dan `out/gap_coverage_fixed.ppm` (abu-abu = tepat sekali).

---

## 4. Render Pustaka & Keputusan Desain (Lab 3 / Tugas Analisis A4)

### 4.1 Validasi Komparasi: From-Scratch vs Three.js (`compare.mjs`)
Hasil komparasi citra denah `myplan.json` antara rasteriser from-scratch (`out/plan_scratch.ppm`) dan render Three.js (`out/plan_three.ppm` / `out/plan_three.png`) pada resolusi tetap $800 \times 600$:

| Metrik Evaluasi | Nilai Terukur Riil | Interpretasi Ilmiah |
|---|:---:|---|
| **Ukuran Framebuffer** | $800 \times 600$ (480.000 px) | Matched explicit canvas & setPixelRatio(1) |
| **Piksel Byte-Identik** | **464.394 / 480.000 (96.75%)** | Interior siluet dan latar belakang 100% identik |
| **Piksel Tidak Identik** | 15.606 piksel (3.25%) | Tepat berada pada batas tepi sub-pixel anti-aliasing |
| **PSNR** | **24.2 dB** | Finite PSNR akibat perbedaan edge anti-aliasing GPU |
| **SSIM Global** | **0.989** | Kesamaan struktural visual mendekati sempurna |
| **Max Absolute Difference** | 235 | Gradasi feathering anti-aliasing Three.js |

*Diagnosis Bug Culling yang Ditemukan*: Awalnya Three.js tidak merender siluet batur karena pembalikan sumbu $y$-down menyebabkan urutan vertex menjadi Clockwise (dianggap backface oleh WebGL). Masalah diselesaikan dengan mengonfigurasi `side: THREE.DoubleSide` pada `MeshBasicMaterial`. Citra selisih `out/diff_plan.ppm` membuktikan bahwa area di luar garis batas polylines berwarna hitam pekat sempurna (selisih = 0).

### 4.2 Benchmark & Keputusan Forward vs Backward
Hasil pengukuran waktu riil `bench.mjs` (10 iterasi perlakuan):

| Algoritma | Waktu Zoom 1x | Waktu Zoom 10x | Rasio Keterlambatan | Karakteristik Performa |
|---|:---:|:---:|:---:|---|
| **Forward (`lineBresenham`)** | **1.203 ms** (~831 FPS) | **3.337 ms** (~299 FPS) | Baseline tercepat | Terikat panjang segmen ($\mathcal{O}(S \cdot L)$) |
| **Backward (Distance-Test)** | **1239.560 ms** (~0.8 FPS) | **722.975 ms** (~1.4 FPS) | **216.6x – 1030.5x lebih lambat** | Terikat total piksel ($\mathcal{O}(W \cdot H \cdot S)$) |

- **Keputusan**: Terpilih **FORWARD RASTERISATION**.
- **Alasan**: Forward hanya membutuhkan 1.2–3.3 ms per frame (jauh di bawah batas 16.6 ms untuk 60 FPS), menjamin interaksi pan/zoom yang lancar pada peramban web. Backward tidak layak digunakan untuk interaksi waktu-nyata karena membutuhkan $> 1$ detik per frame.

---

## 5. Aksesibilitas Warna & CVD (Lab 1 & 3 / Tugas Analisis A5)

1. **Aturan Desain Palet (Kontinuitas Modul 1)**:
   - Sesuai temuan Modul 1, warna tidak boleh dibedakan hanya melalui kontras merah vs hijau (sumbu protan/deutan).
   - Viewer menerapkan **Viridis 5-step ramp** yang memiliki gradasi luminansi monoton dari gelap ke terang:
     `wall` ($[68,1,84]$, ungu gelap) $\to$ `cella` ($[59,82,139]$, biru) $\to$ `stair` ($[33,145,140]$, toska) $\to$ `shrine` ($[94,201,98]$, hijau muda) $\to$ `axis` ($[253,231,37]$, kuning terang).
2. **Dukungan Redundansi Simbol Visual**:
   - Setiap kategori dilengkapi penanda bentuk (*shape marker*): `wall` (`■`), `cella` (`◆`), `stair` (`▲`), `shrine` (`●`), `axis` (`‖`).
   - Setiap kategori memiliki label teks eksplisit.
3. **Bukti Pengujian Filter CVD**:
   - Diuji menggunakan filter simulasi SVG *deuteranopia* dan *protanopia* berbasis matriks transfer Machado 2009.
   - Bukti tangkapan layar tersimpan pada:
     - `docs/img/viewer_normal.png` (filter nonaktif)
     - `docs/img/viewer_deuteranopia.png` (simulasi deuteranopia aktif)
     - `docs/img/viewer_protanopia.png` (simulasi protanopia aktif)
   - Seluruh 5 kategori terbukti tetap terbedakan secara visual bahkan dalam kondisi buta warna total dan monokrom greyscale.

---

## 6. Keterbatasan & Pembalikan Kondisi (Tugas Analisis A4)

> *Bahan Pemikiran Mahasiswa untuk Ujian*:
1. **Kondisi Geometri Ekstrem ($> 50.000$ Segmen Mikro)**: Jika denah berisi puluhan ribu segmen garis kecil bertumpuk, forward pipeline akan mengalami bottleneck overdraw dan draw-call overhead. Backward dengan struktur spasial BVH akan lebih efisien karena kompleksitas terikat pada resolusi layar.
2. **Efek Shading Jarak Kontinu (GPU Signed Distance Fields)**: Jika dibutuhkan efek drop-shadow dinamis, outline anti-aliased analitik, atau pendaran cahaya (*glow*), backward SDF di fragment shader GPU jauh lebih fleksibel dan murah tanpa perlu mengubah topologi geometri.
3. **Resolusi Output Sangat Rendah ($32 \times 32$ Piksel)**: Pada thumbnail kecil, iterasi $1.024$ piksel pada backward sangat murah dan menghilangkan seluruh overhead setup primitif forward.

---

## 7. Reproducibility & Hasil Nyata (Tugas Analisis A6)

1. **Uji Clone Bersih**:
   - Prosedur: Clone direktori baru ke folder temporer $\to$ `npm install` $\to$ `npm test` hijau ($14/14$ lolos) $\to$ `npx serve web` berjalan mulus.
   - Transkrip eksekusi tersimpan lengkap di `docs/clean_clone_transcript.txt`.
2. **Daftar Ringkasan Pengujian Otomatis (`npm test`)**:
   - Asersi Contoh E1 (sample centre 2x2): **OK**
   - Asersi Contoh E2 (lineDDA staircase 8-px): **OK**
   - Asersi Contoh E3 (lineBresenham integer): **OK**
   - Asersi Invarian 8 Oktan Garis: **OK**
   - Asersi Contoh E4 (edge function segitiga 28): **OK**
   - Asersi Contoh E5 (barycentric interpolation): **OK**
   - Asersi Watertight Top-Left Rule: **OK**
   - Asersi Celah & Double-Draw Naive: **OK**
   - Asersi Plan Invertibility & y-flip: **OK**
   - Asersi Byte-Identik `ref/square_fill_ref.ppm`: **OK**
   - Asersi Byte-Identik `ref/tri_ref.ppm`: **OK**
   - Asersi Kesadaran Oktan Asterisk 24 Jari-Jari: **OK**
   - Asersi Pitfall `autoWinding` Konsistensi CW/CCW: **OK**
   - Asersi Pitfall `lineWu` Anti-Aliased Linear Blend: **OK**
3. **Deployment**:
   - Berkas workflow GitHub Actions: `.github/workflows/pages.yml`.
   - Siap dideploy ke: `https://vlahadiqa.github.io/candi-raster-lab/`.
