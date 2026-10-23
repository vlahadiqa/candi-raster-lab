/* Module 2 -- from-scratch 2D rasteriser. Plain JavaScript, no framework,
 * no <canvas>: the framebuffer is a typed array. The SAME functions drive a
 * browser <canvas> via ctx.putImageData(new ImageData(fb.rgba(), w, h)).
 *
 * CONVENTION (stated once, never mixed):
 *   - y is DOWN (screen / image row order).
 *   - a pixel (x,y) is a POINT SAMPLE at (x+0.5, y+0.5).
 *   - triangle vertices are passed so the total edge(A,B,C) > 0.
 *   - "inside" = all three edge functions >= 0; the top-left rule decides
 *     the exactly-on-edge (== 0) case.
 *
 * Reproduces:
 *   Example E2 / E3 : lineDDA and lineBresenham on (2,1)->(9,5) give
 *     [(2,1),(3,2),(4,2),(5,3),(6,3),(7,4),(8,4),(9,5)]
 *   Example E4      : edgeFn signs for A(1,1) B(6,2) C(3,7)
 *   Example E5      : barycentric interpolation 10/20/40 at (.5,.25,.25) -> 20
 */
import { readFileSync, writeFileSync } from "node:fs";

// ---------------------------------------------------------------- Framebuffer
export class Framebuffer {
  constructor(w, h, bg = [0, 0, 0]) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 3);
    if (bg[0] || bg[1] || bg[2]) this.clear(bg);
  }
  clear(rgb) {
    for (let i = 0; i < this.data.length; i += 3) {
      this.data[i] = rgb[0]; this.data[i + 1] = rgb[1]; this.data[i + 2] = rgb[2];
    }
  }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, rgb) {
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 3;
    this.data[i] = rgb[0]; this.data[i + 1] = rgb[1]; this.data[i + 2] = rgb[2];
  }
  get(x, y) {
    const i = (y * this.w + x) * 3;
    return [this.data[i], this.data[i + 1], this.data[i + 2]];
  }
  // P6 binary PPM: text header then raw RGB bytes (same family as Module 1)
  writePPM(path) {
    const header = Buffer.from(`P6\n${this.w} ${this.h}\n255\n`, "ascii");
    writeFileSync(path, Buffer.concat([header, Buffer.from(this.data.buffer, 0, this.data.length)]));
    return header.length + this.data.length;
  }
  static readPPM(path) {
    const buf = readFileSync(path);
    let p = 0;
    const tok = () => {
      while (p < buf.length && /\s/.test(String.fromCharCode(buf[p]))) p++;
      let s = "";
      while (p < buf.length && !/\s/.test(String.fromCharCode(buf[p]))) s += String.fromCharCode(buf[p++]);
      return s;
    };
    const magic = tok();
    if (magic !== "P6") throw new Error(`${path}: not a P6 PPM (got ${magic})`);
    const w = +tok(), h = +tok(), maxv = +tok();
    if (maxv !== 255) throw new Error(`${path}: maxval ${maxv} != 255`);
    p++; // single whitespace after maxval
    const fb = new Framebuffer(w, h);
    fb.data.set(buf.subarray(p, p + w * h * 3));
    return fb;
  }
}

// --------------------------------------------------------------------- lines
/** DDA line. Returns the list of pixels; also plots into fb if given. */
export function lineDDA(x0, y0, x1, y1, fb = null, rgb = [255, 255, 255]) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const pts = [];
  if (steps === 0) { pts.push([x0, y0]); if (fb) fb.set(x0, y0, rgb); return pts; }
  const xi = dx / steps, yi = dy / steps;
  let x = x0, y = y0;
  for (let k = 0; k <= steps; k++) {
    const px = Math.round(x), py = Math.round(y);
    pts.push([px, py]);
    if (fb) fb.set(px, py, rgb);
    x += xi; y += yi;
  }
  return pts;
}

/** Integer Bresenham, all 8 octants (Zingl form: add / compare only). */
export function lineBresenham(x0, y0, x1, y1, fb = null, rgb = [255, 255, 255]) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const pts = [];
  for (;;) {
    pts.push([x0, y0]);
    if (fb) fb.set(x0, y0, rgb);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}

export function polyline(fb, pts, rgb, close = false) {
  for (let i = 0; i + 1 < pts.length; i++)
    lineBresenham(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], fb, rgb);
  if (close && pts.length > 2) {
    const a = pts[pts.length - 1], b = pts[0];
    lineBresenham(a[0], a[1], b[0], b[1], fb, rgb);
  }
}

// ----------------------------------------------------------------- triangles
export const edge = (ax, ay, bx, by, px, py) =>
  (bx - ax) * (py - ay) - (by - ay) * (px - ax);

/** top-left bias for directed edge X->Y (y-down, total>0 convention). */
function topLeftBias(xx, xy, yx, yy) {
  const dx = yx - xx, dy = yy - xy;
  const isTop = dy === 0 && dx < 0;   // horizontal, interior below it
  const isLeft = dy > 0;              // runs down the screen
  return isTop || isLeft ? 0 : -1;
}

/**
 * Fill triangle A,B,C (each [x,y]) with rgb.
 * opts.topLeft (default true): apply the top-left rule.
 * opts.strictGreater (default false): use ">" instead of ">=" (the crack bug).
 * opts.autoWinding (default false): automatically flip winding if edge(A,B,C) < 0.
 * opts.onFragment(x,y,wA,wB,wC): called per covered pixel (for coverage tests).
 */
export function triangle(fb, A, B, C, rgb = [255, 255, 255], opts = {}) {
  const { topLeft = true, strictGreater = false, onFragment = null, autoWinding = false } = opts;
  let pA = A, pB = B, pC = C;
  if (autoWinding) {
    const tot = edge(pA[0], pA[1], pB[0], pB[1], pC[0], pC[1]);
    if (tot < 0) {
      pB = C;
      pC = B;
    }
  }
  const canDraw = !!(fb && typeof fb.set === "function");
  const W = fb ? fb.w : Infinity, H = fb ? fb.h : Infinity;
  const minX = Math.max(0, Math.floor(Math.min(pA[0], pB[0], pC[0])));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(pA[0], pB[0], pC[0])));
  const minY = Math.max(0, Math.floor(Math.min(pA[1], pB[1], pC[1])));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(pA[1], pB[1], pC[1])));
  const bBC = topLeft ? topLeftBias(pB[0], pB[1], pC[0], pC[1]) : 0;
  const bCA = topLeft ? topLeftBias(pC[0], pC[1], pA[0], pA[1]) : 0;
  const bAB = topLeft ? topLeftBias(pA[0], pA[1], pB[0], pB[1]) : 0;
  const pass = strictGreater ? (v) => v > 0 : (v) => v >= 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;                 // SAMPLE CENTRE
      const wA = edge(pB[0], pB[1], pC[0], pC[1], px, py) + bBC;
      const wB = edge(pC[0], pC[1], pA[0], pA[1], px, py) + bCA;
      const wC = edge(pA[0], pA[1], pB[0], pB[1], px, py) + bAB;
      if (pass(wA) && pass(wB) && pass(wC)) {
        if (canDraw) fb.set(x, y, rgb);
        if (onFragment) onFragment(x, y, wA, wB, wC);
      }
    }
  }
}

// ----------------------------------------------------------------- Wu line & color
/** sRGB uint8 (0..255) -> Linear light float (0..1), matches Module 1 sRGB standard. */
export function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Linear light float (0..1) -> sRGB uint8 (0..255). */
export function linearToSrgb(v) {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(c * 255)));
}

/** Xiaolin Wu's anti-aliased line algorithm with linear-light blending (Module 1 color physics). */
export function lineWu(x0, y0, x1, y1, fb = null, rgb = [255, 255, 255], opts = { linear: true }) {
  const pts = [];
  const plot = (x, y, alpha) => {
    if (alpha <= 0) return;
    alpha = Math.min(1, Math.max(0, alpha));
    pts.push([x, y, alpha]);
    if (!fb || !fb.inside(x, y)) return;
    const bg = fb.get(x, y);
    if (opts.linear) {
      // Linear light blend: decode sRGB -> linear mix -> re-encode sRGB
      const r = linearToSrgb(srgbToLinear(rgb[0]) * alpha + srgbToLinear(bg[0]) * (1 - alpha));
      const g = linearToSrgb(srgbToLinear(rgb[1]) * alpha + srgbToLinear(bg[1]) * (1 - alpha));
      const b = linearToSrgb(srgbToLinear(rgb[2]) * alpha + srgbToLinear(bg[2]) * (1 - alpha));
      fb.set(x, y, [r, g, b]);
    } else {
      // Naive non-linear sRGB blend (dark fringe / energy loss artifact)
      const r = Math.round(rgb[0] * alpha + bg[0] * (1 - alpha));
      const g = Math.round(rgb[1] * alpha + bg[1] * (1 - alpha));
      const b = Math.round(rgb[2] * alpha + bg[2] * (1 - alpha));
      fb.set(x, y, [r, g, b]);
    }
  };

  let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  let [ax0, ay0, ax1, ay1] = [x0, y0, x1, y1];
  if (steep) {
    [ax0, ay0] = [ay0, ax0];
    [ax1, ay1] = [ay1, ax1];
  }
  if (ax0 > ax1) {
    [ax0, ax1] = [ax1, ax0];
    [ay0, ay1] = [ay1, ay0];
  }

  const dx = ax1 - ax0, dy = ay1 - ay0;
  const gradient = dx === 0 ? 1 : dy / dx;

  // endpoint 1
  let xend = Math.round(ax0);
  let yend = ay0 + gradient * (xend - ax0);
  let xgap = 1 - ((ax0 + 0.5) % 1);
  const xpxl1 = xend;
  const ypxl1 = Math.floor(yend);
  if (steep) {
    plot(ypxl1, xpxl1, (1 - (yend % 1)) * xgap);
    plot(ypxl1 + 1, xpxl1, (yend % 1) * xgap);
  } else {
    plot(xpxl1, ypxl1, (1 - (yend % 1)) * xgap);
    plot(xpxl1, ypxl1 + 1, (yend % 1) * xgap);
  }
  let intery = yend + gradient;

  // endpoint 2
  xend = Math.round(ax1);
  yend = ay1 + gradient * (xend - ax1);
  xgap = (ax1 + 0.5) % 1;
  const xpxl2 = xend;
  const ypxl2 = Math.floor(yend);
  if (steep) {
    plot(ypxl2, xpxl2, (1 - (yend % 1)) * xgap);
    plot(ypxl2 + 1, xpxl2, (yend % 1) * xgap);
  } else {
    plot(xpxl2, ypxl2, (1 - (yend % 1)) * xgap);
    plot(xpxl2, ypxl2 + 1, (yend % 1) * xgap);
  }

  // main line loop
  for (let x = xpxl1 + 1; x < xpxl2; x++) {
    const y = Math.floor(intery);
    const f = intery - y;
    if (steep) {
      plot(y, x, 1 - f);
      plot(y + 1, x, f);
    } else {
      plot(x, y, 1 - f);
      plot(x, y + 1, f);
    }
    intery += gradient;
  }
  return pts;
}

/** Barycentric coords of P in triangle A,B,C (unbiased). Sum to 1. */
export function barycentric(A, B, C, P) {
  const total = edge(A[0], A[1], B[0], B[1], C[0], C[1]);
  const wA = edge(B[0], B[1], C[0], C[1], P[0], P[1]) / total;
  const wB = edge(C[0], C[1], A[0], A[1], P[0], P[1]) / total;
  const wC = edge(A[0], A[1], B[0], B[1], P[0], P[1]) / total;
  return [wA, wB, wC];
}

/**
 * Coverage map for a set of triangles: how many times each pixel is filled.
 * Returns { once, twice, gaps, counts } where `gaps` counts pixels that are
 * inside the exact geometric union (unbiased >=0 test) but filled 0 times.
 */
export function coverage(w, h, tris, opts = {}) {
  const counts = new Int32Array(w * h);
  for (const [A, B, C] of tris)
    triangle({ w, h }, A, B, C, null, {
      ...opts,
      onFragment: (x, y) => { counts[y * w + x]++; },
    });
  // geometric union: unbiased, non-strict, no top-left rule
  const union = new Uint8Array(w * h);
  for (const [A, B, C] of tris)
    triangle({ w, h }, A, B, C, null, {
      topLeft: false, strictGreater: false,
      onFragment: (x, y) => { union[y * w + x] = 1; },
    });
  let once = 0, twice = 0, gaps = 0;
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] === 1) once++;
    else if (counts[i] >= 2) twice++;
    if (union[i] && counts[i] === 0) gaps++;
  }
  return { once, twice, gaps, counts };
}
