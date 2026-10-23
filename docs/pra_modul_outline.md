# docs/pra_modul_outline.md: Kerangka Tugas Studi Pendahuluan (Pra-Modul)

Dokumen ini berisi kerangka pertanyaan pemandu Q1–Q5, hitungan matematis terverifikasi untuk contoh-contoh modul, serta daftar bacaan acuan standar industri.

---

## 1. Hitungan Matematis Terverifikasi (Verifikasi Kode & Teori)

### A. Garis DDA & Bresenham: Titik $(2, 1) \to (9, 5)$
- **Parameter Geometri**:
  - $\Delta x = 9 - 2 = 7$
  - $\Delta y = 5 - 1 = 4$
  - $steps = \max(|7|, |4|) = 7$
  - Jumlah piksel tangga (*staircase*): $steps + 1 = \mathbf{8\text{ piksel}}$.
- **Daftar Koordinat Piksel**:
  1. Langkah $k=0$: $(2, 1)$
  2. Langkah $k=1$: $(3, 2)$
  3. Langkah $k=2$: $(4, 2)$
  4. Langkah $k=3$: $(5, 3)$
  5. Langkah $k=4$: $(6, 3)$
  6. Langkah $k=5$: $(7, 4)$
  7. Langkah $k=6$: $(8, 4)$
  8. Langkah $k=7$: $(9, 5)$
- *Status Pengujian*: Lolos asersi `tests.mjs` (E2 & E3).

---

### B. Segitiga E4: $A(1, 1), B(6, 2), C(3, 7)$
- **Luas Bertanda ($2 \times \text{Area}$)**:
  $$\text{total} = \text{edge}(A, B, C) = (B_x - A_x)(C_y - A_y) - (B_y - A_y)(C_x - A_x)$$
  $$\text{total} = (6 - 1)(7 - 1) - (2 - 1)(3 - 1) = (5)(6) - (1)(2) = 30 - 2 = \mathbf{28} > 0$$
  Karena $\text{total} = 28 > 0$, urutan vertex $A, B, C$ memenuhi konvensi orientasi positif ($y$-down).

- **Evaluasi Titik $P_1(3, 3)$**:
  - $E_{BC}(P) = (C_x - B_x)(P_y - B_y) - (C_y - B_y)(P_x - B_x) = (3 - 6)(3 - 2) - (7 - 2)(3 - 6) = (-3)(1) - (5)(-3) = -3 + 15 = \mathbf{12} \ge 0$
  - $E_{CA}(P) = (A_x - C_x)(P_y - C_y) - (A_y - C_y)(P_x - C_x) = (1 - 3)(3 - 7) - (1 - 7)(3 - 3) = (-2)(-4) - (-6)(0) = 8 - 0 = \mathbf{8} \ge 0$
  - $E_{AB}(P) = (B_x - A_x)(P_y - A_y) - (B_y - A_y)(P_x - A_x) = (6 - 1)(3 - 1) - (2 - 1)(3 - 1) = (5)(2) - (1)(2) = 10 - 2 = \mathbf{8} \ge 0$
  - Nilai edge vector: $(8, 12, 8)$. Karena ketiga edge function $\ge 0$, $P_1(3, 3)$ berada **DI DALAM** segitiga.

- **Evaluasi Titik $P_2(5, 5)$**:
  - $E_{BC}(P) = (-3)(5 - 2) - (5)(5 - 6) = (-3)(3) - (5)(-1) = -9 + 5 = \mathbf{-4} < 0$.
  - Karena $E_{BC} < 0$, titik $P_2(5, 5)$ berada **DI LUAR** segitiga.

- **Evaluasi Titik $P_3(1, 4)$**:
  - $E_{CA}(P) = (-2)(4 - 7) - (-6)(1 - 3) = (-2)(-3) - (-6)(-2) = 6 - 12 = \mathbf{-6} < 0$.
  - Karena $E_{CA} < 0$, titik $P_3(1, 4)$ berada **DI LUAR** segitiga.

---

### C. Interpolasi Barycentric pada $P(3, 3)$
- Bobot barycentric:
  $$\lambda_A = \frac{E_{BC}(P)}{\text{total}} = \frac{12}{28} = \mathbf{\frac{3}{7}} \approx 0.4286$$
  $$\lambda_B = \frac{E_{CA}(P)}{\text{total}} = \frac{8}{28} = \mathbf{\frac{2}{7}} \approx 0.2857$$
  $$\lambda_C = \frac{E_{AB}(P)}{\text{total}} = \frac{8}{28} = \mathbf{\frac{2}{7}} \approx 0.2857$$
- Pemeriksaan asersi:
  $$\lambda_A + \lambda_B + \lambda_C = \frac{3}{7} + \frac{2}{7} + \frac{2}{7} = \frac{7}{7} = \mathbf{1.0}$$

---

## 2. Kerangka Soal Studi Pendahuluan Q1–Q5

### Q1. Dua Arah Rendering (Forward vs Backward)
- *Pertanyaan*: Apa perbedaan mendasar antara rendering maju (*forward / object-order*) dan rendering mundur (*backward / image-order*) dalam hal perulangan luar (*outer loop*) dan pemanfaatan cache memori?
- *Bahan Analisis*:
  - Forward: Outer loop melintasi primitif (garis, poligon). Tiap primitif memproyeksikan piksel. Menguntungkan memori geometri lokal, cocok untuk rasterisasi pipa perangkat keras GPU.
  - Backward: Outer loop melintasi setiap piksel layar $(x, y)$. Tiap piksel menembakkan ray/query ke scene. Cocok untuk ray tracing, distance field (SDF), efek pantulan/refraksi global.

### Q2. Framebuffer & Konvensi Sample-Centre
- *Pertanyaan*: Mengapa pemilihan pusat piksel pada $(x+0.5, y+0.5)$ lebih superior dibanding sudut $(x, y)$, dan bagaimana hubungannya dengan integrasi Monte Carlo serta filtering tekstur?
- *Bahan Analisis*:
  - Piksel adalah sebuah area kontinu $[x, x+1] \times [y, y+1]$, bukan kotak kecil diskrit. Sampel di pusat mewakili aproksimasi integral area titik tengah (*midpoint rule*).
  - Mencegah bias asimetri sistematis saat membalik citra secara horizontal/vertikal.

### Q3. Algoritma Rasterisasi Garis: DDA vs Bresenham
- *Pertanyaan*: Mengapa Bresenham menjadi standar hardware rasterizer dibanding DDA meskipun komputasi floating-point modern saat ini sudah sangat cepat?
- *Bahan Analisis*:
  - DDA memerlukan akumulator floating point ($x += x_{\text{inc}}$) yang rentan akumulasi *round-off error* pada garis yang sangat panjang, serta membutuhkan operasi konversi `Math.round()` per piksel.
  - Bresenham Zingl hanya menggunakan operasi aritmatika integer dasar: penjumlahan, pergeseran bit, dan perbandingan ($2 \cdot \text{err} \ge dy$). Sangat hemat gerbang logika silikon pada ASIC/FPGA GPU.

### Q4. Rasterisasi Segitiga & Watertight Shared-Edge
- *Pertanyaan*: Jelaskan fenomena celah (*cracks*) dan penggambaran ganda (*double-draws*) ketika dua segitiga berdampingan berbagi edge bersama, serta bagaimana aturan Top-Left memecahkannya.
- *Bahan Analisis*:
  - Jika digunakan $\ge 0$ tanpa aturan, piksel yang sampelnya jatuh tepat di garis pemisah ($w=0$) akan diklaim oleh kedua segitiga (tergambar 2 kali, bermasalah pada semi-transparansi).
  - Jika digunakan $> 0$, piksel di garis pemisah diabaikan oleh kedua segitiga, menghasilkan celah latar belakang transparan bocor (retak visual).
  - Aturan Top-Left memberi bias $0$ pada top/left edge dan $-1$ pada right/bottom edge, menjamin partisi ruang bersifat eksklusif dan tuntas (*disjoint union*).

### Q5. Interpolasi Barycentric & Perspective Correction
- *Pertanyaan*: Mengapa bobot barycentric 2D di ruang layar tidak bisa langsung digunakan untuk menginterpolasi koordinat tekstur $(u, v)$ pada proyeksi perspektif 3D tanpa pembagian dengan $w$?
- *Bahan Analisis*:
  - Transformasi perspektif bersifat non-linear ($1/w$). Garis lurus tetap lurus, tetapi jarak berjarak sama di dunia 3D termampatkan di layar.
  - Interpolasi harus menginterpolasi atribut yang dibagi dengan $z$ (atau $w$), yaitu $(u/w, v/w, 1/w)$, lalu membaginya kembali di fragment shader (*perspective-correct interpolation*).

---

## 3. Daftar Bacaan Referensi

1. **Marschner, S., & Shirley, P.** (2021). *Fundamentals of Computer Graphics* (5th Edition). CRC Press.
   - **Bab 3: Raster Images**: Konsep representasi grid, pixel coordinate conventions, dan anti-aliasing.
   - **Bab 8–9: The Graphics Pipeline & Surface Operations**: Transformasi koordinat, clipping, dan rasterisasi poligon.
2. **Hughes, J. F., van Dam, A., McGuire, M., Sklar, D. F., Foley, J. D., Feiner, S. K., & Akeley, K.** (2014). *Computer Graphics: Principles and Practice* (3rd Edition). Addison-Wesley.
   - **Bab 3: The 2D Graphics Pipeline**: Forward rendering, line rasterisation (Bresenham), dan triangle rasterisation.
   - **Bab 18: Rasterization and Shading**: Edge functions (Pineda algorithm), rules for shared edges, and half-space tests.
3. **Microsoft Learn / MSDN Documentation**. (2003–2024).
   - *Directly Mapping Texels to Pixels (Direct3D 9)*. Tautan: [https://learn.microsoft.com/en-us/windows/win32/direct3d9/directly-mapping-texels-to-pixels](https://learn.microsoft.com/en-us/windows/win32/direct3d9/directly-mapping-texels-to-pixels).
