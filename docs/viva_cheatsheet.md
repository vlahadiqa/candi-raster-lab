# docs/viva_cheatsheet.md: Panduan Ujian Viva Lisan (Oral Defense Cheatsheet)

Dokumen ini disiapkan khusus sebagai lembar contekan (*cheatsheet*) untuk membantu Venerdi menjelaskan arsitektur kode, setiap commit Git, serta menjawab pertanyaan kritis dosen penguji saat sesi evaluasi lisan (viva).

---

## 1. Peta Penjelasan per Berkas (Arsitektur Repositori)

| Berkas | Penjelasan Sederhana untuk Dosen | Inti Konsep & Detail Kunci |
|---|---|---|
| `raster.mjs` | "Ini adalah jantung rasteriser from-scratch saya. Berisi representasi memori framebuffer `Uint8ClampedArray` (PPM P6 I/O), fungsi garis integer `lineBresenham` 8 oktan, garis anti-alias `lineWu` dengan blend di linear light, serta rasterisasi segitiga `triangle()` berbasis edge function Pineda dengan aturan top-left dan auto-winding." | Tanpa `<canvas>` DOM. Koordinat $y$-down. Sample di $(x+0.5, y+0.5)$. |
| `plan.mjs` | "Modul untuk memuat berkas JSON denah, mengonversi koordinat dunia survei ($y$-up, meter) ke koordinat piksel layar ($y$-down) lewat fungsi tunggal `worldToScreen`, serta merender seluruh polylines dan siluet segitiga." | Single source of truth untuk flip $y$. Menentukan palet viridis 5 kategori. |
| `myplan.json` | "Denah lantai arsitektural Candi Siwa Prambanan hasil pekerjaan saya (kelanjutan Modul 1). Menggunakan 5 kategori (wall, cella, stair, shrine, axis) dengan 104 segmen dan siluet batur persegi yang pas di kanvas $800 \times 600$." | Sesuai foto fasad batu, tangga, relief, dan denah cruciform batur Candi Siwa. |
| `draw_plan.mjs` | "Skrip CLI untuk merender denah secara headless ke citra `out/plan_scratch.ppm` menggunakan rasteriser from-scratch." | Mendukung argumen fleksibel `--plan`, `--w`, `--h`, `--fill`, `-w`, `-h`. |
| `draw_square.mjs` | "Implementasi Contoh Terpandu Bagian 10 Modul: menggambar persegi $6 \times 6$ (dua segitiga pada diagonal $y=x$) untuk memvalidasi rasteriser terhadap citra referensi." | Menghasilkan citra byte-identik dengan `ref/square_fill_ref.ppm`. |
| `triangle_gap_bug.mjs` | "Skrip diagnosis dan perbaikan celah/double-draw shared-edge. Membuktikan secara matematis dan visual bahwa naive $\ge 0$ menghasilkan 6 double, strict $> 0$ menghasilkan 6 celah, dan aturan top-left menghasilkan 0 double dan 0 celah." | Menghasilkan `gap_coverage_buggy.ppm` dan `gap_coverage_fixed.ppm`. |
| `make_tri_ref.mjs` | "Skrip generator referensi segitiga E4 $A(1,1), B(6,2), C(3,7)$ ke `ref/tri_ref.ppm` pada framebuffer $10 \times 10$." | Digunakan untuk tes kecocokan byte-identik di `tests.mjs`. |
| `draw_asterisk.mjs` | "Uji kesadaran oktan: menggambar 24 jari-jari tiap $15^\circ$ dari pusat dan memverifikasi panjang setiap jari-jari sama dalam $\pm 1$ piksel." | Menangkap jika ada bug atau kesalahan tanda/swap pada salah satu dari 8 oktan Bresenham. |
| `demo_wu.mjs` | "Demonstrasi perbandingan garis anti-aliased Xiaolin Wu dengan blending di ruang linear light versus blending naif sRGB (kelanjutan konsep warna Modul 1)." | Membuktikan bahwa blend di non-linear sRGB menimbulkan dark fringing (PSNR ~33.7 dB). |
| `bench.mjs` | "Tolok ukur performa komparatif: Forward rasterisation (Bresenham) vs Backward rasterisation (per-pixel distance-test) pada zoom $1\times$ dan $10\times$." | Mengukur ms riil dan membuktikan keunggulan Forward ratusan kali lipat. |
| `compare.mjs` | "Skrip komparasi citra: membandingkan raster from-scratch (`plan_scratch.ppm`) terhadap render Three.js (`plan_three.ppm` / `plan_three.png`). Menghitung PSNR, SSIM, jumlah piksel identik, dan citra selisih." | Mendukung PNG via dependensi `pngjs`. |
| `tests.mjs` | "Kumpulan 14 pengujian unit otomatis (`npm test`) yang mencakup asersi E1–E5, watertightness, kecocokan referensi, asterisk 24 jari-jari, auto-winding, dan lineWu." | Master entry-point penjamin mutu; wajib hijau sebelum commit. |
| `web/viewer.mjs` | "Viewer interaktif Three.js di peramban: orthographic camera $y$-down, `setPixelRatio(1)`, memuat denah via `?plan=myplan.json`, legenda viridis aksesibel, toggle filter deuteranopia/protanopia, serta tombol ekspor PPM & PNG." | Deliverable GitHub Pages untuk penilaian visual dan interaktif. |

---

## 2. Alur Riwayat Commit Git (Mengapa Ini dan Bukan Itu?)

1. **`chore: baseline repo referensi dosen Modul 2`**
   - *Penjelasan*: Mengimpor kode dasar awal Modul 2 dari dosen ke branch `main`, memastikan seluruh 10 tes baseline awal lolos.
2. **`feat: buat myplan.json untuk Candi Siwa Prambanan`**
   - *Penjelasan*: Membuat berkas denah arsitektural berbasis subjek Candi Prambanan dari Modul 1 (5 kategori, 104 segmen, muat proporsional di $800 \times 600$).
3. **`feat: dukung argumen --plan dan opsi fleksibel pada CLI`**
   - *Penjelasan*: Memperbarui `draw_plan.mjs` dan `bench.mjs` agar dapat menerima opsi `--plan`, `-w`, `-h` secara fleksibel tanpa hardcoding.
4. **`docs: perbarui README dengan integrasi toolchain Modul 1 dan status verifikasi`**
   - *Penjelasan*: Mendokumentasikan toolchain terdeteksi riil (OS, Node, npm, Git, Chrome, Edge, Three.js) dan menyatukan kontinuitas dengan Modul 1.
5. **`feat: buat skrip make_tri_ref.mjs, generate ref/tri_ref.ppm, dan tambah tes byte-identik`**
   - *Penjelasan*: Menambahkan citra acuan untuk segitiga E4 dan asersi byte-identik di `tests.mjs`.
6. **`feat: buat draw_asterisk.mjs dan tambah tes kesadaran oktan 24-jari-jari`**
   - *Penjelasan*: Menguji kedelapan oktan Bresenham dengan asterisk 24 jari-jari tiap $15^\circ$ (deviasi panjang $\le 1$ piksel).
7. **`feat: implementasi perkuatan pitfall (autoWinding, lineWu blend linear) dan perjelas triangle_gap_bug`**
   - *Penjelasan*: Menambahkan `autoWinding` agar orientasi vertex CW/CCW terisi konsisten, `lineWu` dengan blend linear light selaras Modul 1, serta output detail piksel double/gaps di `triangle_gap_bug.mjs`.
8. **`feat: dukung pemuatan myplan.json via query param ?plan di web viewer`**
   - *Penjelasan*: Memungkinkan viewer web Three.js memuat denah kustom lewat URL `?plan=myplan.json` dengan fallback cerdas.
9. **`feat: tambah tombol Export PNG dan pasang dependensi pngjs`**
   - *Penjelasan*: Menambahkan tombol ekspor PNG via `toDataURL` dan memasang `pngjs` agar `compare.mjs` dapat mendecoder format PNG langsung.
10. **`feat: simpan screenshot pembuktian aksesibilitas CVD legenda di docs/img`**
    - *Penjelasan*: Merekam bukti visual headless browser filter CVD OFF vs ON yang membuktikan kelima kategori tetap terbedakan.
11. **`feat: perbaiki rendering siluet Three.js DoubleSide dan validasi komparasi raster`**
    - *Penjelasan*: Mendiagnosis bug culling siluet Three.js akibat inversi winding pada sumbu $y$-down dengan menambahkan `side: THREE.DoubleSide`, menghasilkan interior identik ($96.75\%$ piksel cocok, PSNR $24.2\text{ dB}$, SSIM $0.989$).
12. **`docs: tulis dokumen keputusan forward vs backward rasterisation di docs/lab3_decision.md`**
    - *Penjelasan*: Mencatat prediksi tertulis, tabulasi ms empiris ($1.2\text{ ms}$ vs $1240\text{ ms}$), rekonsiliasi, dan 3 kondisi pembalikan pilihan.
13. **`ci: siapkan GitHub Actions workflow untuk deployment GitHub Pages`**
    - *Penjelasan*: Mengonfigurasi `.github/workflows/pages.yml` untuk mempublikasikan folder `web/` ke GitHub Pages secara otomatis.
14. **`docs: lengkapi laporan analisis komprehensif dan bahan viva`**
    - *Penjelasan*: Menyusun dokumen `laporan.md`, `pra_modul_outline.md`, `lab1_pipeline.md`, dan transkrip reproduksi bersih.

---

## 3. Tanya Jawab Kunci Ujian Viva (FAQ)

### Pertanyaan 1: "Mengapa kita menggunakan integer Bresenham dan bukan algoritma DDA sederhana?"
> **Jawaban Anda**:  
> "DDA menggunakan aritmatika floating point dengan penambahan desimal berulang ($x += dx/steps$). Pada garis panjang atau proses komputasi masif, akumulasi *round-off error* dapat memicu deviasi piksel, selain memerlukan fungsi pembulatan `Math.round()` di setiap langkah. Sebaliknya, Bresenham (bentuk Zingl) hanya menggunakan aritmatika integer murni (penjumlahan, pengurangan, pergeseran bit $\times 2$, dan perbandingan tanda). Ini merepresentasikan hardware rasterizer silikon nyata yang sangat efisien dan deterministik."

### Pertanyaan 2: "Jelaskan apa itu aturan Top-Left dan mengapa tanpa aturan itu sebuah mesh 3D di Modul 3 bisa rusak?"
> **Jawaban Anda**:  
> "Ketika dua segitiga bersebelahan berbagi satu sisi (*shared edge*), piksel yang titik tengahnya $(x+0.5, y+0.5)$ jatuh persis di garis batas memiliki nilai edge function $w = 0$ di kedua segitiga.  
> Jika kita menggunakan kondisi $\ge 0$, kedua segitiga akan menggambar piksel tersebut (double-draw), menyebabkan warna menjadi lebih gelap/terang dua kali lipat saat blending transparan.  
> Jika kita menggunakan $> 0$, kedua segitiga menolak piksel itu, menghasilkan celah retak (*cracks*) tembus pandang ke latar belakang.  
> Aturan Top-Left menetapkan kepemilikan eksklusif: sisi yang merupakan *top edge* (horizontal ke kiri) atau *left edge* (turun ke bawah) diberi bias $0$, sedangkan sisi lainnya diberi bias $-1$. Dengan begitu, setiap piksel perbatasan diklaim tepat oleh satu segitiga saja (*watertight*)."

### Pertanyaan 3: "Mengapa pada komparasi raster between from-scratch dan Three.js, PSNR bernilai ~24-30 dB dan bukan tak-hingga (inf)?"
> **Jawaban Anda**:  
> "Nilai PSNR tidak tak-hingga karena rasteriser from-scratch kita adalah integer hard-edge rasteriser (setiap piksel menyala $100\%$ atau mati $0\%$), sedangkan Three.js menggunakan GPU WebGL yang menerapkan sub-pixel anti-aliasing pada edge garis dan siluet.  
> Bagian interior siluet dan latar belakang terbukti $100\%$ identik (selisih = 0). Ketidakcocokan hanya terjadi pada selebar 1–2 piksel di sepanjang batas luar garis segmen denah. Citra selisih `out/diff_plan.ppm` membuktikan bahwa area di luar batas garis adalah hitam pekat sempurna."

### Pertanyaan 4: "Bagaimana jika canvas ditingkatkan ke resolusi 4K atau WebGPU?"
> **Jawaban Anda**:  
> "Jika canvas ditingkatkan ke 4K ($3840 \times 2160$), Forward rasterisation tetap sangat cepat karena kompleksitasnya hanya bergantung pada jumlah segmen garis yang digambar ($\mathcal{O}(S \cdot L)$), bukan total piksel layar. Sebaliknya, Backward rasterisation akan mengalami kolaps performa karena harus mengevaluasi 8.3 juta piksel terhadap setiap segmen.  
> Namun, jika kita menggunakan WebGPU dengan compute shader, kita bisa memanfaatkan ribuan thread GPU untuk mengevaluasi backward ray/SDF secara masif paralel dalam satu dispatch, atau menggunakan hardware rasterizer WebGPU pipeline untuk forward mesh dengan efisiensi mendekati nol overhead CPU."
