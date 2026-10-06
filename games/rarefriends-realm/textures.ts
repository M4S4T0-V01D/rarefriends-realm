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
export type WallStyle = "brick" | "window" | "timber" | "timber_window" | "window_lit" | "timber_window_lit" | "plank" | "cap" | "dungeon";
/** Where a window's glass sits on a 16-wide wall texture (x0, width) and, per wall kind, its top row and height. */
export const PANE = { x0: 5, w: 6, h: 7, top: (timber: boolean) => timber ? 3 : 5 };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const noise = (x: number, y: number, seed: number) => { let h = Math.imul(x * 374761393 + y * 668265263 + seed * 1442695041, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 0) % 1000) / 1000; };

/** A wall face texture, 16 × 24, in a given base colour (the face's shade is baked into the colour). */
export function wallTexture(style: WallStyle, color: string, variant = 0): HTMLCanvasElement {
  return pixelArt(`wall:${style}:${color}:${variant}`, TEX_PER_TILE, 24, p => {
    const W = TEX_PER_TILE, H = 24, mortar = shadeHex(color, -0.2), light = shadeHex(color, 0.07), dark = shadeHex(color, -0.08);
    const lit = style === "window_lit" || style === "timber_window_lit", glazed = lit || style === "window" || style === "timber_window";
    const timberish = style === "timber" || style === "timber_window" || style === "timber_window_lit";
    if (style === "brick" || style === "window" || style === "window_lit" || style === "dungeon" || style === "cap") {
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
    } else if (timberish) {
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
      // A leaded window: a dark oak frame, blue-grey glass with a glint (or, at night, warm lamplight from inside, brightest
      // in the middle), and a stone sill.
      const x0 = PANE.x0, y0 = PANE.top(timberish), w = PANE.w, h = PANE.h;
      p.rect(x0 - 1, y0 - 1, w + 2, h + 2, "#4a3a2e");
      if (lit) {
        p.rect(x0, y0, w, h, "#e9a94f");
        p.rect(x0 + 1, y0 + 1, w - 2, h - 2, "#f6c774"); p.rect(x0 + 2, y0 + 2, w - 4, h - 4, "#ffe2a0");
        p.rect(x0 + 3, y0, 1, h, "#5a3f28"); p.rect(x0, y0 + 3, w, 1, "#5a3f28");
      } else {
        p.rect(x0, y0, w, h, "#5d6f84");
        p.rect(x0, y0, w, 1, "#71849a"); p.set(x0 + 1, y0 + 1, "#c9d5e0"); p.set(x0 + 2, y0 + 1, "#a9b8c8"); p.set(x0 + 1, y0 + 2, "#a9b8c8");
        p.rect(x0 + 3, y0, 1, h, "#3b3a38"); p.rect(x0, y0 + 3, w, 1, "#3b3a38");
      }
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
/** Textured draws in the last frame (for the performance check). */
export const textureStats = { frame: 0, last: 0 };
export function beginTextures(ctx: CanvasRenderingContext2D) { base = ctx.getTransform(); ctx.imageSmoothingEnabled = false; textureStats.last = textureStats.frame; textureStats.frame = 0; }
/** Draw `rows` × `cols` of a texture onto the parallelogram with top-left `o`, top-right `x`, bottom-left `y` (screen). */
export function texturedQuad(ctx: CanvasRenderingContext2D, texture: HTMLCanvasElement, o: { x: number; y: number }, x: { x: number; y: number }, y: { x: number; y: number }, cols: number, rows: number, alpha = 1) {
  textureStats.frame++;
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

// ---------- Ground ----------
export type GroundStyle = "grass" | "lush" | "dirt" | "gravel" | "cobble" | "flag" | "sand" | "snow" | "plank" | "furrow" | "dungeon" | "ice" | "carpet" | "ash" | "swamp" | "brick";
/**
 * A ground tile's detail, 16 × 16, on a transparent background: the tile's own shaded fill shows through, and the
 * texture adds the pixels (blades, pebbles, setts, planks) in tones of the ground's colour. Each tile draws one of four
 * variants, so the ground doesn't repeat.
 */
export function groundTexture(style: GroundStyle, color: string, variant: number): HTMLCanvasElement {
  return pixelArt(`ground:${style}:${color}:${variant}`, TEX_PER_TILE, TEX_PER_TILE, p => {
    const S = TEX_PER_TILE, r = (i: number, salt: number) => noise(i, salt, variant + 11);
    const tone = (amount: number) => shadeHex(color, amount * 1.4);
    const speckle = (n: number, amount: number, salt = 0) => { for (let i = 0; i < n; i++) p.set(Math.floor(r(i, 1 + salt) * S), Math.floor(r(i, 2 + salt) * S), tone(amount)); };
    switch (style) {
      case "grass": case "lush": {
        // Tufts of blades, dark at the root and lit at the tip; the odd flower.
        const tufts = style === "lush" ? 9 : 6;
        for (let i = 0; i < tufts; i++) {
          const x = Math.floor(r(i, 3) * (S - 3)) + 1, y = Math.floor(r(i, 4) * (S - 4)) + 3, blades = 2 + Math.floor(r(i, 5) * 2);
          for (let b = 0; b < blades; b++) { const bx = x + b - 1, tall = 2 + Math.floor(r(i * 3 + b, 6) * 2); const lean = (k: number) => k === tall - 1 ? (b === 0 ? -1 : b === blades - 1 ? 1 : 0) : 0;
            for (let k = 0; k < tall; k++) p.set(bx + lean(k), y - k, tone(k === tall - 1 ? 0.05 : -0.1 - (style === "lush" ? 0.03 : 0))); }
        }
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (BAYER[y & 3][x & 3] === 0 && noise(x, y, variant + 5) > 0.72) p.set(x, y, tone(-0.05));
        if (variant === 3 && style === "grass") { const x = 3 + Math.floor(r(0, 9) * 9), y = 4 + Math.floor(r(1, 9) * 8); p.set(x, y, "#f3eee2"); p.set(x + 1, y, "#e7c9c6"); p.set(x, y + 1, "#e2d07a"); }
        if (variant === 1 && style === "grass") { const x = 4 + Math.floor(r(2, 9) * 8), y = 5 + Math.floor(r(3, 9) * 7); p.set(x, y, "#dfe6f0"); p.set(x + 1, y + 1, "#dfe6f0"); p.set(x + 1, y, "#e2d07a"); }
        break;
      }
      case "dirt": case "gravel": {
        // Pebbles (lit on top, shadowed beneath) and darker trodden patches.
        const pebbles = style === "gravel" ? 14 : 6;
        for (let i = 0; i < pebbles; i++) { const x = Math.floor(r(i, 3) * (S - 2)), y = Math.floor(r(i, 4) * (S - 2)), w = 1 + Math.floor(r(i, 5) * 2);
          p.rect(x, y, w, 1, tone(0.06)); p.rect(x, y + 1, w, 1, tone(-0.12)); }
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (BAYER[y & 3][x & 3] < 2 && noise(x >> 2, y >> 2, variant + 3) > 0.6) p.set(x, y, tone(-0.06));
        speckle(4, -0.14, 7);
        break;
      }
      case "cobble": {
        // Rounded setts in staggered courses: a lit top-left, a shadowed bottom-right, dark joints between.
        for (let row = 0; row < 4; row++) for (let col = -1; col < 4; col++) {
          const x = col * 4 + (row % 2 ? 2 : 0), y = row * 4, t = (noise(col + 9, row, variant) - 0.5) * 0.08, sett = tone(t);
          p.rect(x, y, 4, 1, tone(-0.16)); p.rect(x + 3, y, 1, 4, tone(-0.16));
          p.rect(x, y + 1, 3, 3, sett); p.rect(x, y + 1, 2, 1, shadeHex(sett, 0.07)); p.set(x, y + 2, shadeHex(sett, 0.04)); p.set(x + 2, y + 3, shadeHex(sett, -0.08));
        }
        break;
      }
      case "brick": {
        // Bricks in a running bond, four courses to the tile: each brick its own shade of red, a lit top edge, and dark
        // mortar between (a little soot and wear here and there).
        for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
          const x = col * 6 + (row % 2 ? 3 : 0), y = row * 4, t = (noise(col + 17, row + variant * 4, 7) - 0.5) * 0.14, brick = tone(t);
          p.rect(x, y, 6, 1, tone(-0.22)); p.rect(x + 5, y, 1, 4, tone(-0.22));
          p.rect(x, y + 1, 5, 3, brick); p.rect(x, y + 1, 5, 1, shadeHex(brick, 0.06)); p.set(x + 4, y + 3, shadeHex(brick, -0.08));
        }
        speckle(3, -0.2, 21);
        break;
      }
      case "flag": case "dungeon": {
        // Big flagstones, two by two, with joints, cracks and (in dungeons) moss.
        const joint = tone(style === "dungeon" ? -0.12 : -0.14), off = variant % 2 ? 4 : 0;
        for (const [x, y, w, h] of [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8]]) {
          const t = tone((noise(x, y, variant) - 0.5) * 0.06);
          p.rect(x + (y ? off : 0), y + 1, w - 1, h - 1, t); p.rect(x + (y ? off : 0), y + 1, w - 1, 1, shadeHex(t, 0.05));
        }
        p.rect(0, 0, S, 1, joint); p.rect(0, 8, S, 1, joint); p.rect(7, 0, 1, 8, joint); p.rect(15, 0, 1, 8, joint); p.rect((7 + off) % S, 8, 1, 8, joint); p.rect((15 + off) % S, 8, 1, 8, joint);
        if (variant === 2) p.polyline([[3, 3], [5, 5], [5, 7]], tone(-0.16));
        if (style === "dungeon") speckle(3, 0, 12), [0, 1, 2].forEach(i => p.set(Math.floor(r(i, 13) * S), Math.floor(r(i, 14) * S), "#6f7a62"));
        break;
      }
      case "snow": {
        // Snow with body: soft blue-grey drifts in the hollows, wind-cut crests lit white, packed patches and the odd
        // glint, so a snowfield reads as ground with shape (slope shading shows on its cool off-white base) and never as
        // a blank hole in the land.
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const n = noise(x >> 1, y >> 1, variant + 21);
          if (n > 0.58 && BAYER[y & 3][x & 3] < 3) p.set(x, y, "#b4c0cf"); else if (n < 0.26 && BAYER[y & 3][x & 3] < 2) p.set(x, y, "#eef2f6");
        }
        for (let k = 0; k < 2; k++) { const y0 = 3 + k * 7 + (variant % 3); for (let x = 0; x < S; x++) { const y = y0 + Math.round(Math.sin((x + variant * 5) * 0.4) * 1.5); if (noise(x, k + 4, variant) > 0.3) { p.set(x, y, "#f4f7fa"); p.set(x, y + 1, "#a9b6c6"); } } }
        for (let i = 0; i < 3; i++) { const x = Math.floor(r(i, 31) * S), y = Math.floor(r(i, 32) * S); p.set(x, y, "#ffffff"); p.set(x + 1, y, "#e3eefa"); }
        speckle(4, -0.12, 9);
        break;
      }
      case "sand": {
        // Wind ripples (lit crest, shadowed trough) and grains.
        const lit = tone(0.05), shadow = tone(-0.07);
        for (let k = 0; k < 3; k++) { const y0 = 2 + k * 5 + (variant % 2); for (let x = 0; x < S; x++) { const y = y0 + Math.round(Math.sin((x + variant * 3) * 0.5) * 1.2); if (noise(x, k, variant) > 0.25) { p.set(x, y, lit); p.set(x, y + 1, shadow); } } }
        speckle(5, -0.1, 4);
        break;
      }
      case "plank": {
        // Boards along the tile, dark seams, grain and nails.
        for (let y = 0; y < S; y += 4) { p.rect(0, y, S, 1, tone(-0.18)); p.rect(0, y + 1, S, 1, tone(0.05)); const end = Math.floor(noise(y, 1, variant) * S); p.rect(end, y, 1, 4, tone(-0.18)); p.set((end + 2) % S, y + 2, tone(-0.3)); }
        for (let i = 0; i < 5; i++) { const x = Math.floor(r(i, 3) * 12), y = Math.floor(r(i, 4) * 4) * 4 + 2; p.rect(x, y, 3, 1, tone(-0.07)); }
        break;
      }
      case "furrow": {
        for (let y = 1; y < S; y += 4) { p.rect(0, y, S, 1, tone(0.06)); p.rect(0, y + 1, S, 1, tone(-0.14)); p.rect(0, y + 2, S, 1, tone(-0.08)); }
        speckle(4, -0.2, 3);
        break;
      }
      case "ice": for (let i = 0; i < 2; i++) { const x = Math.floor(r(i, 3) * 10) + 2, y = Math.floor(r(i, 4) * 10) + 2; p.polyline([[x, y], [x + 3, y + 1], [x + 4, y + 4]], "#ffffff"); } speckle(3, -0.06, 2); break;
      case "carpet": p.rect(0, 0, S, 1, tone(-0.14)); p.rect(0, 1, S, 1, "#e2d49e"); p.poly([[8, 4], [12, 8], [8, 12], [4, 8]], tone(0.08), null); p.set(8, 8, "#e2d49e"); break;
      case "ash": speckle(9, -0.18, 1); speckle(4, 0.08, 5); if (variant === 0) p.set(Math.floor(r(0, 8) * S), Math.floor(r(1, 8) * S), "#e0824f"); break;
      case "swamp": for (let i = 0; i < 2; i++) { const x = Math.floor(r(i, 3) * 11), y = Math.floor(r(i, 4) * 12); p.disc(x + 2, y + 1, 2.5, 1.2, tone(-0.1), null); p.set(x + 1, y, tone(0.1)); } speckle(5, -0.14, 6); break;
    }
  });
}
