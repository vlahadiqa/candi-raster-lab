/* Module 2 -- demo Xiaolin Wu line rasterisation: linear-light blending vs naive sRGB blending.
 * Connects directly to Module 1 concept: alpha blending and downscaling must happen in linear light!
 * Writes out/wu_linear_vs_naive.ppm */
import { Framebuffer, lineWu } from "./raster.mjs";
import { psnr, pixelStats } from "./metrics.mjs";
import { mkdirSync } from "node:fs";

mkdirSync("out", { recursive: true });
const W = 200, H = 100;

// Test on a challenging background: red background with green line
// (classic CVD and gamma pitfall: naive sRGB blend darkens heavily in the middle)
const bg = [220, 40, 30];
const fg = [40, 200, 50];

const fbLinear = new Framebuffer(W, H, bg);
const fbNaive  = new Framebuffer(W, H, bg);

// Draw several diagonal and shallow lines
const lines = [
  [10, 10, 190, 30],
  [10, 30, 190, 80],
  [10, 80, 190, 20],
  [30, 90, 170, 10],
];

for (const [x0, y0, x1, y1] of lines) {
  lineWu(x0, y0, x1, y1, fbLinear, fg, { linear: true });
  lineWu(x0, y0, x1, y1, fbNaive,  fg, { linear: false });
}

fbLinear.writePPM("out/wu_linear.ppm");
fbNaive.writePPM("out/wu_naive.ppm");

// Side-by-side comparison image: left = linear light, right = naive sRGB
const sideBySide = new Framebuffer(W * 2 + 4, H, [0, 0, 0]);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    sideBySide.set(x, y, fbLinear.get(x, y));
    sideBySide.set(W + 4 + x, y, fbNaive.get(x, y));
  }
}
sideBySide.writePPM("out/wu_linear_vs_naive.ppm");

const st = pixelStats(fbLinear, fbNaive);
const p = psnr(fbLinear, fbNaive);
console.log(`Wu line blend comparison (linear light vs naive sRGB):`);
console.log(`  Identical pixels: ${st.identical}/${st.total} (${(st.identical/st.total*100).toFixed(1)}%)`);
console.log(`  Max absolute diff: ${st.maxAbs}`);
console.log(`  PSNR between linear and naive: ${p.toFixed(2)} dB`);
console.log(`Wrote out/wu_linear.ppm, out/wu_naive.ppm, out/wu_linear_vs_naive.ppm`);
