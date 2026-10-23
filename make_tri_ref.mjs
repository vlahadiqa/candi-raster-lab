/* Module 2 -- generate reference raster for triangle E4: A(1,1) B(6,2) C(3,7).
 * Writes ref/tri_ref.ppm (10x10 framebuffer). */
import { Framebuffer, triangle } from "./raster.mjs";
import { mkdirSync } from "node:fs";

mkdirSync("ref", { recursive: true });
const fb = new Framebuffer(10, 10);
const A = [1, 1], B = [6, 2], C = [3, 7];
const rgb = [230, 120, 40];

triangle(fb, A, B, C, rgb, { topLeft: true });
const bytes = fb.writePPM("ref/tri_ref.ppm");
console.log(`Generated ref/tri_ref.ppm (${bytes} bytes, 10x10 FB)`);
