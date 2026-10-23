/* Module 2 -- render the Pusaka3D floor plan headless with the from-scratch
 * rasteriser.  node draw_plan.mjs --w 800 --h 600 [--plan pusaka_plan.json]
 *                                 [--fill] [--out out/plan_scratch.ppm] */
import { loadPlan, renderPlan, newFramebufferForPlan } from "./plan.mjs";
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
const w = +val(["--w", "-w"], 800);
const h = +val(["--h", "-h"], 600);
const planPath = val(["--plan", "-p"], "pusaka_plan.json");
const out = val(["--out", "-o"], "out/plan_scratch.ppm");
const fill = process.argv.includes("--fill");

mkdirSync("out", { recursive: true });
const plan = loadPlan(planPath);
const fb = newFramebufferForPlan(plan, w, h);
const segs = renderPlan(fb, plan, { fillSilhouette: fill });
const n = fb.writePPM(out);
console.log(`plan "${plan.name}"`);
console.log(`polylines: ${plan.polylines.length}   segments: ${segs}   ` +
  `framebuffer: ${w}x${h}   ${fill ? "silhouette FILLED" : "outline only"}`);
console.log(`wrote ${out} (${n} bytes)`);
