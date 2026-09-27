/**
 * A tiny pixel painter for the Realm's art: polygons, discs and thick lines rasterized with no anti-aliasing onto a
 * small grid, then an ink outline and (optionally) a white halo, like the canonical Rare Friends sprites.
 * The result is a canvas meant to be drawn scaled up with image smoothing off.
 */
export const INK = "#161616";

const cache = new Map<string, HTMLCanvasElement>();
function rgba(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16), a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
  return ((a << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0;
}
export function shadeHex(hex: string, amount: number) {
  const n = parseInt(hex.slice(1, 7), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

export class Pixels {
  readonly data: Uint32Array;
  constructor(readonly w: number, readonly h: number) { this.data = new Uint32Array(w * h); }
  inside(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x: number, y: number) { return this.inside(x, y) ? this.data[y * this.w + x] : 0; }
  set(x: number, y: number, color: string | number) {
    x = Math.round(x); y = Math.round(y);
    if (this.inside(x, y)) this.data[y * this.w + x] = typeof color === "number" ? color : rgba(color);
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    const c = rgba(color);
    for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) this.set(i, j, c);
  }
  /** Thick line (square brush). */
  line(x0: number, y0: number, x1: number, y1: number, color: string, width = 1) {
    const c = rgba(color), steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2)), r = (width - 1) / 2;
    for (let s = 0; s <= steps; s++) {
      const x = x0 + (x1 - x0) * s / steps, y = y0 + (y1 - y0) * s / steps;
      for (let j = Math.round(y - r); j <= Math.round(y + r); j++) for (let i = Math.round(x - r); i <= Math.round(x + r); i++) this.set(i, j, c);
    }
  }
  polyline(points: readonly (readonly [number, number])[], color: string, width = 1) {
    for (let i = 0; i + 1 < points.length; i++) this.line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], color, width);
  }
  /** Filled polygon, with an ink edge unless `stroke` is null. */
  poly(points: readonly (readonly [number, number])[], fill: string | null, stroke: string | null = INK) {
    if (fill) {
      const c = rgba(fill), ys = points.map(p => p[1]);
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
        const cy = y + 0.5, xs: number[] = [];
        for (let i = 0; i < points.length; i++) {
          const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
          if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + (cy - ay) * (bx - ax) / (by - ay));
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
      }
    }
    if (stroke) for (let i = 0; i < points.length; i++) { const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length]; this.line(ax, ay, bx, by, stroke); }
  }
  /** Filled ellipse; `stroke` draws its rim. `shadow` dithers a darker lower-right. */
  disc(cx: number, cy: number, rx: number, ry: number, fill: string, stroke: string | null = INK, shadow?: string) {
    const c = rgba(fill), s = stroke ? rgba(stroke) : 0, d = shadow ? rgba(shadow) : 0;
    const inside = (x: number, y: number) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (!inside(x, y)) continue;
      const rim = stroke && (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1));
      if (rim) { this.set(x, y, s); continue; }
      const lower = (x + 0.5 - cx) / rx + (y + 0.5 - cy) / ry;
      this.set(x, y, shadow && lower > 0.35 && BAYER[y & 3][x & 3] < (lower - 0.35) * 22 ? d : c);
    }
  }
  /** Dither a colour over pixels already painted with `match` (or any non-empty pixel), by a 0..1 density function. */
  dither(color: string, density: (x: number, y: number) => number, match?: string) {
    const c = rgba(color), m = match ? rgba(match) : 0;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = this.data[y * this.w + x];
      if (!v || (m && v !== m)) continue;
      if (BAYER[y & 3][x & 3] / 16 < density(x, y)) this.data[y * this.w + x] = c;
    }
  }
  /** Ink edge around the whole silhouette (outside pixels next to a filled one). */
  outline(color = INK) {
    const c = rgba(color), copy = this.data.slice();
    const filled = (x: number, y: number) => this.inside(x, y) && copy[y * this.w + x] !== 0;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (copy[y * this.w + x]) continue;
      if (filled(x + 1, y) || filled(x - 1, y) || filled(x, y + 1) || filled(x, y - 1)) this.data[y * this.w + x] = c;
    }
  }
  /** One-pixel white halo, as on the canonical sprites. */
  halo(color = "#ffffff") {
    const c = rgba(color), copy = this.data.slice();
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (copy[y * this.w + x]) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && this.inside(x + dx, y + dy) && copy[(y + dy) * this.w + x + dx]) { near = true; break; }
      if (near) this.data[y * this.w + x] = c;
    }
  }
  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas"); canvas.width = this.w; canvas.height = this.h;
    const ctx = canvas.getContext("2d")!, image = ctx.createImageData(this.w, this.h);
    new Uint32Array(image.data.buffer).set(this.data);
    ctx.putImageData(image, 0, 0);
    return canvas;
  }
}
/** Paint once and cache by key. */
export function pixelArt(key: string, w: number, h: number, paint: (p: Pixels) => void): HTMLCanvasElement {
  let canvas = cache.get(key);
  if (canvas) return canvas;
  const p = new Pixels(w, h);
  paint(p);
  canvas = p.toCanvas();
  if (cache.size > 1500) cache.delete(cache.keys().next().value!);
  cache.set(key, canvas);
  return canvas;
}
/** Draw pixel art with its bottom-centre on (x, y), `scale` screen pixels per art pixel. */
export function drawPixels(ctx: CanvasRenderingContext2D, art: HTMLCanvasElement, x: number, y: number, scale: number, alpha = 1, anchorY = 1) {
  const w = art.width * scale, h = art.height * scale;
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha;
  ctx.drawImage(art, Math.round(x - w / 2), Math.round(y - h * anchorY), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = smoothing;
  return { x: x - w / 2, y: y - h * anchorY, w, h };
}
