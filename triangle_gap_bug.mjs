/* Module 2 -- DIAGNOSE-AND-FIX: shared-edge cracks / double-draws.
 *
 * The bug artifact: a quad drawn as two triangles WITHOUT the top-left rule.
 * Your Lab 2 task -- from the rendered pixels only, before reading the fix:
 *   1. show which pixels are covered twice (or missing) and count them;
 *   2. state the cause;
 *   3. switch to the top-left rule;
 *   4. prove 0 doubles and 0 gaps.
 *
 *   node triangle_gap_bug.mjs            # runs all three modes, prints evidence
 */
import { Framebuffer, triangle, coverage } from "./raster.mjs";
import { mkdirSync } from "node:fs";

mkdirSync("out", { recursive: true });

// same 6x6 square + diagonal as the Fully Worked Example
const T1 = [[2, 2], [8, 2], [8, 8]];
const T2 = [[2, 2], [8, 8], [2, 8]];
const W = 12, H = 12;

function run(label, opts) {
  const fb = new Framebuffer(W, H);
  triangle(fb, T1[0], T1[1], T1[2], [230, 120, 40], opts);
  triangle(fb, T2[0], T2[1], T2[2], [40, 130, 180], opts);
  const cov = coverage(W, H, [T1, T2], opts);
  console.log(
    `${label.padEnd(26)} once=${cov.once}  twice=${cov.twice}  gaps=${cov.gaps}`
  );
  return { fb, cov };
}

console.log("== evidence: two triangles tiling a 6x6 quad along y = x ==");
const buggy = run("naive >=0 (no rule)", { topLeft: false });
const cracks = run("strict >0 (no rule)", { topLeft: false, strictGreater: true });
const fixed = run("top-left rule", { topLeft: true });

// 1. Koordinat piksel double (tergambar ganda pada naive >= 0)
const doublePixels = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (buggy.cov.counts[y * W + x] >= 2) doublePixels.push([x, y]);
  }
}
console.log(`\n[1] Piksel double (naive >=0, jumlah = ${doublePixels.length}):`);
console.log("    " + doublePixels.map(([x, y]) => `(${x},${y})`).join(", "));

// 2. Koordinat piksel celah / retak (gaps pada strict > 0)
// Dalam coverage(), strictGreater membuat on-edge pixel tidak terisi sama sekali
const gapPixels = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const inUnion = (x >= 2 && x < 8 && y >= 2 && y < 8);
    if (inUnion && cracks.cov.counts[y * W + x] === 0) gapPixels.push([x, y]);
  }
}
console.log(`\n[2] Piksel celah (strict >0, jumlah = ${gapPixels.length}):`);
console.log("    " + gapPixels.map(([x, y]) => `(${x},${y})`).join(", "));

// 3. Citra coverage untuk kasus bug (naive) vs fixed (top-left)
const covImgBuggy = new Framebuffer(W, H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = buggy.cov.counts[y * W + x];
    covImgBuggy.set(x, y, c >= 2 ? [220, 30, 30] : c === 1 ? [120, 120, 120] : [0, 0, 0]);
  }
}
covImgBuggy.writePPM("out/gap_coverage_buggy.ppm");

const covImgFixed = new Framebuffer(W, H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = fixed.cov.counts[y * W + x];
    covImgFixed.set(x, y, c >= 2 ? [220, 30, 30] : c === 1 ? [120, 120, 120] : [0, 0, 0]);
  }
}
covImgFixed.writePPM("out/gap_coverage_fixed.ppm");
fixed.fb.writePPM("out/gap_fixed.ppm");

console.log("\n[3] Penjelasan Bias Top-Left per Edge:");
console.log("    Aturan Top-Left (Direct3D 10 / Vulkan / POSIX convention):");
console.log("    - Top edge: garis horizontal dengan dx < 0 (interior berada di bawahnya). Bias = 0.");
console.log("    - Left edge: garis yang berjalan turun di layar (dy > 0). Bias = 0.");
console.log("    - Selain itu (bottom / right edge): Bias = -1.");
console.log("");
console.log("    Analisis Edge Segitiga T1 [A(2,2), B(8,2), C(8,8)]:");
console.log("      * Edge A->B: (8,2)-(2,2) -> dx=+6, dy=0   => Bottom edge  => Bias = -1");
console.log("      * Edge B->C: (8,8)-(8,2) -> dx=0,  dy=+6  => Left edge    => Bias =  0");
console.log("      * Edge C->A: (2,2)-(8,8) -> dx=-6, dy=-6  => Right/Bottom => Bias = -1  <-- SHARED EDGE DI T1");
console.log("");
console.log("    Analisis Edge Segitiga T2 [A(2,2), C(8,8), D(2,8)]:");
console.log("      * Edge A->C: (8,8)-(2,2) -> dx=+6, dy=+6  => Left edge    => Bias =  0  <-- SHARED EDGE DI T2");
console.log("      * Edge C->D: (2,8)-(8,8) -> dx=-6, dy=0   => Top edge     => Bias =  0");
console.log("      * Edge D->A: (2,2)-(2,8) -> dx=0,  dy=-6  => Right edge   => Bias = -1");
console.log("");
console.log("    Hasil Pemutusan Shared Edge C-A vs A-C:");
console.log("      Piksel diagonal y = x memiliki w_edge == 0 pada kedua segitiga.");
console.log("      - Pada T1: w + (-1) = -1 < 0  => DITOLAK (tidak digambar di T1)");
console.log("      - Pada T2: w + ( 0) =  0 >= 0 => DITERIMA (digambar tepat sekali di T2)");
console.log(`\n[4] Bukti Hasil Perbaikan:`);
console.log(`    once = ${fixed.cov.once} (tepat 36 piksel)`);
console.log(`    twice = ${fixed.cov.twice} (0 double)`);
console.log(`    gaps = ${fixed.cov.gaps} (0 celah)`);
console.log("    Citra tersimpan: out/gap_coverage_buggy.ppm, out/gap_coverage_fixed.ppm, out/gap_fixed.ppm");

if (!(fixed.cov.twice === 0 && fixed.cov.gaps === 0))
  throw new Error("top-left rule did not produce a watertight fill");
