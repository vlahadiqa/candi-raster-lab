# candi-raster-lab — Modul 2: Rendering Pipeline & Primitif 2D

Praktikum Grafika Komputer (`25MP7716G030`), S1 Informatika, Universitas Muhammadiyah Surabaya.  
Dikerjakan oleh: **Venerdi**  
Repositori ini adalah kelanjutan langsung dari Modul 1 (**pusaka3d-main**).

**Subjek Warisan Budaya:** Candi Prambanan (Denah Arsitektural Candi Siwa, Sleman, D.I. Yogyakarta). Rujukan foto Modul 1: `01_fasad_bebatuan_candi.jpg`, `03_fasad_tangga_pintu.jpg`, `06_fasad_empat_candi.jpg`, `09_fasad_tangga_batu.jpg`, `10_relief_dinding_batu.jpg`, `15_fasad_bangunan_candi.jpg`.

---

## Aturan & Konvensi

1. **From-Scratch (`raster.mjs`):** JavaScript polos murni dieksekusi dengan Node.js — tanpa framework, tanpa `<canvas>` DOM. Framebuffer adalah typed array `Uint8ClampedArray` (RGB 8-bit per channel).
2. **Konvensi Koordinat & Sampel (konsisten, tidak dicampur):**
   - Sumbu $y$ mengarah ke **BAWAH** di ruang layar/citra (*screen/framebuffer row order*).
   - Titik sampel piksel $(x,y)$ berada tepat di titik tengah **$(x+0.5, y+0.5)$**.
   - Vertex segitiga diurutkan sehingga edge function total $\text{edge}(A,B,C) > 0$.
   - Kondisi "di dalam" = ketiga edge function $\ge 0$.
   - Kasus tepat di edge ($= 0$) diputus secara deterministik oleh **aturan top-left** (*watertight*, 0 celah, 0 double-draw).
3. **Pustaka Grafika (`web/`):** Three.js (orthographic camera $y$-down, `setPixelRatio(1)`, ukuran kanvas tetap $800 \times 600$) untuk viewer interaktif dan deliverable GitHub Pages.

---

## Toolchain Terdeteksi (Gabungan Modul 1 & Modul 2)

Seluruh versi di bawah ini dideteksi langsung melalui perintah terminal di host:

- **Sistem Operasi**: Windows 11 Home Single Language (build 26200) [`Windows-11-10.0.26200-SP0`]
- **Node.js**: `v22.16.0`
- **npm**: `10.9.2`
- **Git**: `2.54.0.windows.1`
- **Python (dari Modul 1)**: `3.12.6` (NumPy `2.4.3`, Pillow `12.1.1`, Pytest `9.1.1`, Matplotlib `3.11.2`)
- **Peramban Web (Browser)**:
  - Google Chrome `155.0.8059.85`
  - Microsoft Edge `155.0.4283.62`
- **Pustaka Grafika**: Three.js `0.160.0` (pinned CDN via importmap & package.json devDependency)
- **Tanggal Audit**: 2026-10-23

---

## Panduan Perintah Cepat

```bash
# 1. Jalankan seluruh pengujian from-scratch
npm test                        # atau node tests.mjs -> ALL CHECKS PASSED

# 2. Render denah Candi Siwa Prambanan (myplan.json)
node draw_plan.mjs --plan myplan.json -w 800 -h 600 --fill

# 3. Contoh Terpandu (Persegi 6x6 E1-E4)
node draw_square.mjs --mode fill

# 4. Diagnosis dan verifikasi perbaikan celah segitiga (Lab 2)
node triangle_gap_bug.mjs

# 5. Benchmark Forward vs Backward Rasterisation (Lab 3)
node bench.mjs --plan myplan.json

# 6. Jalankan server lokal untuk Three.js viewer
npx serve web
# Buka http://localhost:3000/?plan=myplan.json
```

---

## Tabel Komponen Proyek

| Berkas | Peran / Deskripsi | Mengacu Pada |
|---|---|---|
| `raster.mjs` | Framebuffer, `lineDDA`, `lineBresenham` (8 oktan), `edge`, `triangle` (+ top-left & autoWinding), `lineWu`, `barycentric`, `coverage`, PPM P6 I/O | E1–E5, watertightness |
| `metrics.mjs` | Penghitung PSNR, SSIM global, dan statistik piksel | Bandingan citra |
| `plan.mjs` | Pemuat skema denah; fungsi tunggal `worldToScreen` ($y$-flip); `renderPlan` | Studi Kasus Denah |
| `pusaka_plan.json` | Denah lantai skematik bawaan modul (fallback) | Baseline Modul 2 |
| `myplan.json` | Denah lantai Candi Siwa Prambanan (5 kategori, survey meters, $y$-up) | Lab 1 & Tugas Analisis |
| `draw_plan.mjs` | CLI perender denah headless ke `out/plan_scratch.ppm` | Lab 1 |
| `draw_square.mjs` | Contoh Terpandu Lengkap (persegi $6 \times 6$, outline/fill/coverage) | Bagian 10 Modul |
| `triangle_gap_bug.mjs` | Diagnosis & perbaikan celah/double-draw shared edge dengan bukti visual | Lab 2 |
| `bench.mjs` | Tolok ukur waktu Forward vs Backward pada zoom $1\times$ dan $10\times$ | Lab 3 Decision |
| `compare.mjs` | Pembanding dua raster (PPM / PNG via `pngjs`): piksel identik, PSNR, SSIM, citra selisih | Lab 3 Validasi |
| `tests.mjs` | Entry point pengujian otomatis (`npm test`) | Asersi E1–E5, referensi, dll |
| `web/` | Three.js plan viewer interaktif (`index.html`, `viewer.mjs`, `cvd.css`) + legenda aksesibel viridis + toggle CVD | Lab 3 Deliverable |

---

## Tabel Verifikasi (Hasil Eksekusi Nyata)

| Item Pengujian | Status | Tanggal | Lingkungan / Toolchain |
|---|:---:|:---:|---|
| `node tests.mjs` | **ALL CHECKS PASSED (10 ok)** | 2026-10-23 | Node v22.16.0, Windows 11 |
| `node draw_plan.mjs --plan myplan.json -w 800 -h 600 --fill` | **SUKSES** (104 segmen, 1,440,015 byte PPM) | 2026-10-23 | Node v22.16.0 |
| `node draw_square.mjs --mode fill` | **SUKSES** (byte-identik dengan `ref/square_fill_ref.ppm`) | 2026-10-23 | Node v22.16.0 |
| `node triangle_gap_bug.mjs` | **SUKSES** (top-left rule -> twice=0, gaps=0) | 2026-10-23 | Node v22.16.0 |
| `node bench.mjs --plan myplan.json` | **SUKSES** (Forward vs Backward pada 1x & 10x terukur) | 2026-10-23 | Node v22.16.0 |
| Three.js Web Viewer (`web/`) | **Akan diverifikasi penuh di peramban pada Lab 3** | 2026-10-23 | Chrome 155, Edge 155 |
