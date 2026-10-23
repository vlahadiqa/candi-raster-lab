/* Module 2 -- draw a 24-ray asterisk (every 15 degrees) from a central point.
 * Tests octant awareness and verifies that every ray has equal length within +-1 pixel.
 * Usage: node draw_asterisk.mjs [--r 40 --out out/asterisk.ppm] */
import { Framebuffer, lineBresenham } from "./raster.mjs";
import { mkdirSync } from "node:fs";

const val = (keys, d) => {
  const ks = Array.isArray(keys) ? keys : [keys];
  for (const k of ks) {
    const i = process.argv.indexOf(k);
    if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("-")) {
      return process.argv[i + 1];
    }
  }
  return d;
};

export function renderAsterisk(R = 40, outPath = "out/asterisk.ppm") {
  const size = Math.ceil(R * 2.5);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const fb = new Framebuffer(size, size, [18, 18, 22]);

  const results = [];
  for (let k = 0; k < 24; k++) {
    const deg = k * 15;
    const rad = deg * Math.PI / 180;
    const x1 = Math.round(cx + R * Math.cos(rad));
    const y1 = Math.round(cy + R * Math.sin(rad));
    const pts = lineBresenham(cx, cy, x1, y1, fb, [240, 240, 255]);
    const last = pts[pts.length - 1];
    const dist = Math.hypot(last[0] - cx, last[1] - cy);
    results.push({ deg, x1, y1, pts, dist });
  }

  if (outPath) {
    mkdirSync("out", { recursive: true });
    fb.writePPM(outPath);
  }
  return { fb, results, cx, cy, R };
}

if (process.argv[1] && process.argv[1].endsWith("draw_asterisk.mjs")) {
  const R = +val(["--r", "-r"], 40);
  const out = val(["--out", "-o"], "out/asterisk.ppm");
  const { results } = renderAsterisk(R, out);
  console.log(`Rendered 24-ray asterisk (radius ${R} px) to ${out}`);
  let maxDelta = 0;
  for (const r of results) {
    const delta = Math.abs(r.dist - R);
    if (delta > maxDelta) maxDelta = delta;
    console.log(`  ray ${String(r.deg).padStart(3)}° -> endpoint (${r.x1},${r.y1}), length=${r.dist.toFixed(2)} px (delta=${delta.toFixed(2)})`);
  }
  console.log(`Maximum length deviation from R=${R}: ${maxDelta.toFixed(2)} px (within +-1 px: ${maxDelta <= 1.0})`);
}
