/**
 * Pixel-art textures for buildings, so walls and roofs share the look of the trees and rocks: every texture pixel is
 * two world pixels, like the scenery art. A face of a box is a parallelogram on screen, so a texture is drawn onto it with
 * one affine transform (no smoothing), then the face gets its ink edge as before.
 */
import { Pixels, pixelArt, shadeHex } from "./pixel.ts";

/** Texture pixels per tile width (a tile edge is 32 world pixels at 2 world pixels per texture pixel). */
export const TEX_PER_TILE = 16;
/** Texture rows per world pixel of height. */
export const TEX_PER_HEIGHT = 0.5;
export type WallStyle = "brick" | "window" | "timber" | "timber_window" | "plank" | "cap" | "dungeon";
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const noise = (x: number, y: number, seed: number) => { let h = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 0) % 1000) / 1000; };

/** A wall face texture, 16 × 24, in a given base colour (the face's shade is baked into the colour). */
export function wallTexture(style: WallStyle, color: string, variant = 0): HTMLCanvasElement {
  return pixelArt(`wall:${style}:${color}:${variant}`, TEX_PER_TILE, 24, p => {
    const W = TEX_PER_TILE, H = 24, mortar = shadeHex(color, -0.2), light = shadeHex(color, 0.07), dark = shadeHex(color, -0.08);
    const glazed = style === "window" || style === "timber_window";
    if (style === "brick" || style === "window" || style === "dungeon" || style === "cap") {
      // Courses of stone, 4 pixels high, joints staggered; each stone a slightly different tone with a lit top edge.
      p.rect(0, 0, W, H, color);
      for (let row = 0; row < H / 4; row++) {
        const y = row * 4, offset = row % 2 ? 4 : 0;
        for (let bx = -offset; bx < W; bx += 8) {
          const tone = (noise(bx + 40, row, variant) - 0.5) * 0.08, stone = shadeHex(color, tone);
          p.rect(bx + 1, y + 1, 7, 3, stone);
          p.rect(bx + 1, y + 1, 7, 1, shadeHex(stone, 0.06));
          for (let yy = y + 2; yy < y + 4; yy++) for (let xx = bx + 1; xx < bx + 8; xx++) if (BAYER[yy & 3][xx & 3] < 3) p.set(xx, yy, shadeHex(stone, -0.05));
        }
        p.rect(0, y, W, 1, mortar);
        for (let bx = -offset; bx <= W; bx += 8) p.rect(bx, y, 1, 4, mortar);
      }
      if (style !== "cap") for (let i = 0; i < 4; i++) { const x = Math.floor(noise(i, 7, variant) * W), y = Math.floor(noise(i, 9, variant) * H); p.set(x, y, noise(i, 3, variant) > 0.5 ? "#8e9d80" : dark); }
    } else if (style === "timber" || style === "timber_window") {
      // Cream plaster between dark oak beams.
      const plaster = color, beam = "#6f5440", beamLight = "#8a6a50";
      p.rect(0, 0, W, H, plaster);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BAYER[y & 3][x & 3] < 2 && noise(x, y, variant) > 0.55) p.set(x, y, shadeHex(plaster, -0.05));
      p.rect(0, 0, W, 2, beam); p.rect(0, 11, W, 2, beam); p.rect(0, H - 2, W, 2, beam);
      p.rect(0, 0, 2, H, beam); p.rect(W - 1, 0, 1, H, beam);
      p.rect(0, 0, W, 1, beamLight); p.rect(0, 11, W, 1, beamLight);
      if (!glazed) for (let i = 0; i < 9; i++) p.set(2 + i * 1.4, 13 + i, beam), p.set(3 + i * 1.4, 13 + i, beam);
    } else if (style === "plank") {
      p.rect(0, 0, W, H, color);
      for (let y = 0; y < H; y += 3) { p.rect(0, y, W, 1, shadeHex(color, -0.18)); p.rect(0, y + 1, W, 1, shadeHex(color, 0.05)); }
      for (let i = 0; i < 3; i++) p.set(Math.floor(noise(i, 1, variant) * W), 2 + Math.floor(noise(i, 2, variant) * 7) * 3, shadeHex(color, -0.25));
    }
    if (glazed) {
      // A leaded window: a dark oak frame, blue-grey glass with a glint, and a stone sill.
      const x0 = 5, y0 = style === "timber_window" ? 3 : 5, w = 6, h = 7;
      p.rect(x0 - 1, y0 - 1, w + 2, h + 2, "#4a3a2e");
      p.rect(x0, y0, w, h, "#5d6f84");
      p.rect(x0, y0, w, 1, "#71849a"); p.set(x0 + 1, y0 + 1, "#c9d5e0"); p.set(x0 + 2, y0 + 1, "#a9b8c8"); p.set(x0 + 1, y0 + 2, "#a9b8c8");
      p.rect(x0 + 3, y0, 1, h, "#3b3a38"); p.rect(x0, y0 + 3, w, 1, "#3b3a38");
      p.rect(x0 - 1, y0 + h + 1, w + 2, 1, shadeHex(color, 0.14));
    }
  });
}
/** Roof shingles: scalloped courses running along the eave, in the roof's colour. */
export function shingleTexture(color: string, cols: number, rows: number): HTMLCanvasElement {
  return pixelArt(`shingle:${color}:${cols}:${rows}`, cols, rows, p => {
    p.rect(0, 0, cols, rows, color);
    for (let row = 0; row * 4 < rows; row++) {
      const y = row * 4, offset = row % 2 ? 2 : 0, tone = shadeHex(color, (noise(row, 3, 1) - 0.5) * 0.06);
      p.rect(0, y, cols, 4, tone);
      for (let x = -offset; x < cols; x += 4) {
        // Each shingle: a lit top, a rounded shadowed bottom, and a dark gap on its right.
        p.set(x + 1, y, shadeHex(tone, 0.08)); p.set(x + 2, y, shadeHex(tone, 0.08));
        p.set(x, y + 3, shadeHex(tone, -0.2)); p.set(x + 3, y + 3, shadeHex(tone, -0.2)); p.set(x + 1, y + 3, shadeHex(tone, -0.1)); p.set(x + 2, y + 3, shadeHex(tone, -0.1));
        p.set(x + 3, y + 1, shadeHex(tone, -0.16)); p.set(x + 3, y + 2, shadeHex(tone, -0.16));
      }
      if (noise(row, 9, 2) > 0.7) p.set(Math.floor(noise(row, 5, 3) * cols), y + 1, shadeHex(color, 0.14));
    }
  });
}
/** The canvas's base transform for this frame (set once per frame, so each face costs one setTransform, not a save/restore). */
let base: DOMMatrix | null = null;
export function beginTextures(ctx: CanvasRenderingContext2D) { base = ctx.getTransform(); ctx.imageSmoothingEnabled = false; }
/** Draw `rows` × `cols` of a texture onto the parallelogram with top-left `o`, top-right `x`, bottom-left `y` (screen). */
export function texturedQuad(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, o: { x: number; y: number }, x: { x: number; y: number }, y: { x: number; y: number }, cols: number, rows: number, alpha = 1) {
  cols = Math.max(1, Math.min(texture.width, Math.round(cols))); rows = Math.max(1, Math.min(texture.height, Math.round(rows)));
  const m = base ?? ctx.getTransform(), a = (x.x - o.x) / cols, b = (x.y - o.y) / cols, c = (y.x - o.x) / rows, d = (y.y - o.y) / rows;
  // base × local, written out (the base is a scale plus translation).
  ctx.setTransform(m.a * a + m.c * b, m.b * a + m.d * b, m.a * c + m.c * d, m.b * c + m.d * d, m.a * o.x + m.c * o.y + m.e, m.b * o.x + m.d * o.y + m.f);
  const previous = ctx.globalAlpha; if (alpha !== 1) ctx.globalAlpha = previous * alpha;
  // A hair of overdraw hides the seams between neighbouring faces.
  ctx.drawImage(texture, 0, 0, cols, rows, -0.02, -0.02, cols + 0.04, rows + 0.04);
  ctx.setTransform(m); ctx.globalAlpha = previous;
}
/** A texture clipped to a triangle (gable ends and pyramid faces): apex `c` over the base `a`–`b`. */
export function texturedTriangle(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, cols: number, rows: number) {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, up = { x: c.x - mid.x, y: c.y - mid.y };
  ctx.save();
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath(); ctx.clip();
  // Map the texture over the parallelogram that holds the triangle, top edge through the apex.
  texturedQuad(ctx, texture, { x: a.x + up.x, y: a.y + up.y }, { x: b.x + up.x, y: b.y + up.y }, a, cols, rows);
  ctx.restore();
}
