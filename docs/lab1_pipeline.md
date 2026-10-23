# docs/lab1_pipeline.md: Penelusuran Pipeline & Refleksi Koordinat Piksel

Dokumen ini memuat penelusuran numerik 7 tahap pipeline rendering 2D untuk satu segmen dinding nyata dari `myplan.json`, prediksi komparasi forward vs backward di zoom $10\times$, serta kerangka refleksi teknis insiden Direct3D 9 *sample-centre*.

---

## 1. Penelusuran 7 Tahap Pipeline (Satu Segmen Dinding Riil)

Dipilih satu segmen dinding batur luar dari `myplan.json`:
- **ID Polylines**: `outer_wall` (kategori: `wall`)
- **Titik Asal Geometri ($P_0$)**: $(16.0, 2.0)$ meter
- **Titik Tujuan Geometri ($P_1$)**: $(28.0, 2.0)$ meter
- **Parameter Transformasi**: $W = 800$, $H = 600$, `scale_px_per_m` = $14.0$, `origin_m` = $[6.5, 2.4]$, warna viridis `wall` = $[68, 1, 84]$.

Berikut adalah penelusuran numerik langkah demi langkah sepanjang 7 tahap pipeline:

| No | Tahap Pipeline | Operasi Numerik Nyata | Status Data / Keluaran |
|---|---|---|---|
| **1** | **Application** | Baca `myplan.json`; ambil titik segmen dinding $P_0(16.0, 2.0)$ dan $P_1(28.0, 2.0)$ meter dalam koordinat dunia survei ($y$-up). | Vektor posisi dunia 2D dalam satuan meter; kategori = `wall`, warna RGB = `[68, 1, 84]`. |
| **2** | **Vertex Processing** | Transformasi `worldToScreen`: <br> $x_s = \text{round}((x_m + ox) \times s)$ <br> $y_s = \text{round}(H - 1 - (y_m + oy) \times s)$ <br> Untuk $P_0$: $x_0 = \text{round}((16.0 + 6.5) \times 14.0) = \mathbf{315}$, $y_0 = \text{round}(599 - (2.0 + 2.4) \times 14.0) = \mathbf{537}$. <br> Untuk $P_1$: $x_1 = \text{round}((28.0 + 6.5) \times 14.0) = \mathbf{483}$, $y_1 = \text{round}(599 - (2.0 + 2.4) \times 14.0) = \mathbf{537}$. | Koordinat layar integer integer ($y$-down): $P_0' = (315, 537)$ dan $P_1' = (483, 537)$. |
| **3** | **Primitive Assembly & Clipping** | Merakit kedua vertex layar $(315, 537)$ dan $(483, 537)$ menjadi sebuah primitif segmen garis horizontal berarah. Dilakukan uji batas kanvas: $0 \le x \le 799$ dan $0 \le y \le 599$. Karena seluruh rentang $[315, 483] \times \{537\}$ berada di dalam kanvas, tidak ada pemotongan (*trivial accept*). | Primitif garis 2D aktif sepanjang 169 piksel horizontal pada baris $y = 537$. |
| **4** | **Rasterisation (Scan Conversion)** | Algoritma `lineBresenham` (atau `triangle` jika siluet) mengevaluasi grid piksel integer dari $x = 315$ sampai $x = 483$. Tiap titik dievaluasi pada *sample-centre* $(x + 0.5, 537.5)$. Untuk sampel tengah $(400.5, 537.5)$, garis melintas tepat di atasnya. | 169 kandidat fragment piksel dihasilkan: $[(315, 537), (316, 537), \dots, (400, 537), \dots, (483, 537)]$. |
| **5** | **Fragment Shading** | Menghitung warna untuk setiap fragment. Pada Modul 2 ini digunakan flat shading sesuai `CATEGORY_RGB.wall` = $[68, 1, 84]$ (warna ungu viridis). | Tiap fragment membawa atribut warna: $(x, y, [68, 1, 84])$. |
| **6** | **Per-Fragment Operations** | Uji clipping dan buffer write: fragment berada di dalam rentang memori framebuffer ($0 \le x < 800, 0 \le y < 600$). Tidak ada *depth test* atau *alpha blend* pada garis opaque ini, sehingga fragment langsung diizinkan menulis. | Izin tulis diberikan ke memori pada indeks byte $i = (537 \times 800 + 400) \times 3 = 1.288.800$. |
| **7** | **Framebuffer** | Nilai warna ditulis ke `Uint8ClampedArray` pada byte $i$, $i+1$, $i+2$: <br> `data[1288800] = 68` (Red) <br> `data[1288801] = 1` (Green) <br> `data[1288802] = 84` (Blue). | Piksel $(400, 537)$ di layar menyala dengan warna ungu viridis; citra siap diekspor ke PPM/PNG. |

---

## 2. Prediksi Tertulis: Forward vs Backward Rasterisation pada Zoom 10x

Sebelum mengeksekusi tolok ukur waktu (`bench.mjs`), dilakukan perbandingan teoretis jika kamera di-zoom $10\times$:

- **Forward Rasterisation**:
  - Pada zoom $1\times$, segmen dinding di atas memiliki panjang $169$ piksel.
  - Pada zoom $10\times$, panjang segmen bertambah $10\times$ menjadi $1.690$ piksel (sebagian berada di luar kanvas).
  - Jumlah langkah komputasi loop Bresenham berbanding lurus dengan panjang garis ($\mathcal{O}(L)$). Oleh karena itu, waktu forward diprediksi akan meningkat sebanding dengan faktor zoom (dari ~1.2 ms menjadi ~3.3 ms).
- **Backward Rasterisation**:
  - Pengujian jarak dilakukan per-piksel layar: untuk setiap piksel di kanvas $800 \times 600$, dihitung jarak kuadrat ke seluruh 104 segmen garis.
  - Kompleksitas: $\mathcal{O}(W \cdot H \cdot S)$ di mana $W=800$, $H=600$, $S=104$ tetap sama baik pada zoom $1\times$ maupun $10\times$.
  - Beban komputasi per piksel independen terhadap skala zoom. Waktu backward diprediksi akan datar (*flat* / konstan di kisaran ratusan milidetik).
- **Kesimpulan Prediksi**:
  Forward tetap ratusan kali lebih efisien daripada backward pada zoom $10\times$ untuk scene berbasis denah lantai polylines.

---

## 3. Kerangka Bahan Refleksi: Insiden Direct3D 9 "Directly Mapping Texels to Pixels"

> *Catatan Integritas Akademik: Bagian ini menyajikan fakta teknis, referensi dokumentasi resmi, lokasi kode, dan pertanyaan pemandu. Mahasiswa menyusun esai refleksi pribadi berdasarkan kerangka ini.*

### Fakta Teknis & Sejarah
1. **Perbedaan Konvensi Sample-Centre**:
   - **Direct3D 9**: Mendefinisikan sudut kiri-atas piksel sebagai $(0.0, 0.0)$, sehingga pusat piksel berada pada $(0.5, 0.5)$, namun koordinat texel tekstur dipetakan dari $(0.0, 0.0)$ pada sudut kiri-atas texel. Akibatnya, pemetaan 1:1 langsung antara geometri layar dan texel mengalami pergeseran setengah piksel (*half-pixel offset*).
   - **Solusi Paksa D3D9**: Programmer grafis harus menambahkan offset manual `-0.5` piksel pada koordinat vertex pasca-proyeksi (misal $x - 0.5, y - 0.5$) agar texture sampling mendarat tepat di pusat texel.
   - **Direct3D 10, OpenGL, Vulkan, WebGL**: Memperbaiki inkonsistensi ini dengan menyepakati konvensi integer grid: piksel $(x, y)$ berpusat tepat pada $(x + 0.5, y + 0.5)$, selaras dengan ruang tekstur tanpa offset trik `-0.5`.

2. **Lokasi Pengkodean Sample-Centre di Proyek Ini**:
   - Berkas: `raster.mjs`
   - Baris: ~146 (pada fungsi `triangle`) dan fungsi pengujian E1 di `tests.mjs`:
     ```javascript
     const px = x + 0.5, py = y + 0.5; // SAMPLE CENTRE
     ```
   - Di sini titik evaluasi matematika edge function wajib menggunakan offset `+0.5` agar evaluasi geometris dilakukan persis pada pusat fisik piksel, bukan di sudut integer $(x, y)$.

3. **Uji Kasus Patologis (Checkerboard / Papan Catur)**:
   - Jika sample-centre dievaluasi pada $(x, y)$ sudut kiri-atas alih-alih $(x+0.5, y+0.5)$:
     - Pada citra catur 1-piksel hitam-putih, bilinear filtering akan mengambil sampel tepat pada perbatasan 4 texel sekaligus, menghasilkan warna abu-abu buram merata ($50\%$ blur) alih-alih pola kotak tajam.
     - Kotak persegi $2 \times 2$ pada koordinat $(1, 1)$ akan salah menyalakan piksel $(0,0)$ atau bergeser satu piksel secara visual (diuji pada Contoh E1 di `tests.mjs`).

4. **Sumber Resmi & Dokumentasi**:
   - Microsoft Learn / MSDN: *"Directly Mapping Texels to Pixels (Direct3D 9)"*  
     Tautan: [https://learn.microsoft.com/en-us/windows/win32/direct3d9/directly-mapping-texels-to-pixels](https://learn.microsoft.com/en-us/windows/win32/direct3d9/directly-mapping-texels-to-pixels)
   - Tanggal Rilis Dokumen: Diperbarui secara berkala sejak rilis DirectX 9.0 SDK (2002/2003) hingga era Windows Dev Docs modern.

### Pertanyaan Pemandu untuk Mahasiswa:
1. *Mengapa keputusan arsitektur hardware D3D9 yang menempatkan origin texel pada sudut menyebabkan masalah serius pada fullscreen post-processing (seperti bloom, blur, tone mapping)?*
2. *Bagaimana baris `px = x + 0.5` di `raster.mjs` menjamin bahwa primitif rasteriser kita terbebas dari artefak blur yang sama?*
3. *Apa dampaknya jika sebuah game engine mem-port shader lama dari D3D9 ke D3D11 / Vulkan tanpa menghapus offset -0.5 tersebut?*
