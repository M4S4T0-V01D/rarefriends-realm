/**
 * The Prismwild's pictures (render.ts draws them): crystals in four sizes, from a cluster at your ankle to the
 * Shardfields' giants taller than a tower, in six colours, faceted and glowing, a glint running up them; the fae trees
 * (twisted pale bark, canopies of violet, rose and teal with lights hanging in them); fairy rings of mushrooms; the
 * Collegium's lumen lamps; and Fennick's Labyrinth: its crystal doors (shut, or open to a sill), its glyphs and the
 * hourglass at its heart.
 */
import { INK, pixelArt, shadeHex, type Pixels } from "./pixel.ts";

/** The crystals' colours: violet, rose, sky, amber, sea-green, moon-white. */
export const CRYSTAL_COLORS = ["#9a72e8", "#e47ac4", "#6fb8ec", "#ecb45a", "#5fd2a8", "#e8e4f4"] as const;
export const CRYSTAL_FRAMES = 6;

/** One prism: a six-sided column leaning `lean`, base centre (bx, by), `w` wide and `h` tall to its tip, shaded from the left. */
function prism(p: Pixels, bx: number, by: number, w: number, h: number, lean: number, color: string) {
  const half = w / 2, tipH = Math.max(3, w * 0.9), top = by - h, tx = bx + lean, sx = (y: number) => bx + lean * (by - y) / h;
  const light = shadeHex(color, 0.32), mid = color, dark = shadeHex(color, -0.28);
  // Left face (lit), right face (shade), the tip's two facets; a bright edge down the ridge.
  p.poly([[bx - half, by], [bx, by + 1], [sx(top + tipH), top + tipH], [tx - half, top + tipH]], light, null);
  p.poly([[bx, by + 1], [bx + half, by], [tx + half, top + tipH], [sx(top + tipH), top + tipH]], dark, null);
  p.poly([[tx - half, top + tipH], [sx(top + tipH), top + tipH], [tx, top]], shadeHex(color, 0.5), null);
  p.poly([[sx(top + tipH), top + tipH], [tx + half, top + tipH], [tx, top]], mid, null);
  p.line(bx, by, sx(top + tipH), top + tipH, shadeHex(color, 0.6));
  p.poly([[bx - half, by], [tx - half, top + tipH], [tx, top], [tx + half, top + tipH], [bx + half, by], [bx, by + 1]], null, INK);
}
/** A crystal of a size (0 a cluster, 1 a knee-high clump, 2 a spire taller than you, 3 a giant), its colour, a frame of its glint. */
export function crystalArt(size: 0 | 1 | 2 | 3, color: number, frame: number): HTMLCanvasElement {
  const c = CRYSTAL_COLORS[((color % CRYSTAL_COLORS.length) + CRYSTAL_COLORS.length) % CRYSTAL_COLORS.length], f = ((frame % CRYSTAL_FRAMES) + CRYSTAL_FRAMES) % CRYSTAL_FRAMES;
  const [w, h] = ([[16, 16], [22, 30], [28, 58], [64, 150]] as const)[size];
  return pixelArt(`crystal:${size}:${c}:${f}`, w, h, p => {
    const by = h - 2, cx = w / 2;
    // A soft glow on the ground under it.
    p.dither(shadeHex(c, 0.2), (x, y) => { const d = Math.hypot((x - cx) / (w * 0.5), (y - by) / 3); return d < 1 ? 0.35 * (1 - d) : 0; });
    const spec: readonly [number, number, number, number][] = size === 0 ? [[-3, 4, 9, -1], [2, 5, 12, 1], [5, 3, 7, 2]]
      : size === 1 ? [[-5, 5, 16, -2], [1, 7, 26, 1], [6, 5, 14, 3], [-1, 4, 10, -1]]
      : size === 2 ? [[-7, 6, 30, -3], [0, 10, 55, 1], [7, 6, 34, 3], [-3, 5, 18, -2], [4, 4, 14, 2]]
      : [[-20, 14, 84, -6], [-6, 18, 140, -1], [12, 16, 110, 5], [24, 10, 60, 8], [-28, 8, 40, -8], [4, 9, 46, 2]];
    // Back to front, the tallest in the middle.
    for (const [dx, pw, ph, lean] of [...spec].sort((a, b) => a[2] - b[2])) prism(p, cx + dx, by, pw, ph, lean, c);
    // The glint: a white spark climbing the tallest prism.
    const [gdx, , gh, glean] = spec.reduce((a, b) => (b[2] > a[2] ? b : a)), gy = by - (gh * (f + 0.5)) / CRYSTAL_FRAMES, gx = cx + gdx + glean * (by - gy) / gh - 1;
    p.set(gx, gy, "#ffffff"); p.set(gx + 1, gy, "#ffffff"); p.set(gx, gy - 1, shadeHex(c, 0.7)); if (size >= 2) { p.set(gx - 1, gy, shadeHex(c, 0.7)); p.set(gx, gy + 1, shadeHex(c, 0.7)); }
  });
}

/** A fae tree: a twisted pale trunk, a canopy in one of four colourings, little lights hanging in it (they wink by frame). */
export function faeTreeArt(variant: number, frame: number): HTMLCanvasElement {
  const v = ((variant % 4) + 4) % 4, f = ((frame % 4) + 4) % 4;
  const [leaf, deep, glow] = ([["#a57ee0", "#7650b8", "#ffe7a8"], ["#e48ac8", "#b0569a", "#fff0f8"], ["#5fc8c0", "#36918e", "#e8fff0"], ["#c3a2f0", "#8a6ac8", "#a8e8ff"]] as const)[v];
  return pixelArt(`faetree:${v}:${f}`, 44, 62, p => {
    // The trunk, leaning one way and back.
    p.poly([[19, 61], [25, 61], [24, 46], [27, 36], [23, 28], [20, 30], [22, 37], [18, 46]], "#ddd2e8", INK);
    p.line(21, 58, 21, 47, "#b8aac8"); p.line(23, 40, 24, 33, "#b8aac8");
    p.poly([[22, 36], [12, 26], [14, 25], [23, 33]], "#ddd2e8", INK); p.poly([[24, 32], [33, 22], [35, 24], [25, 34]], "#ddd2e8", INK);
    // The canopy: overlapping blobs, lit from the upper left.
    for (const [x, y, rx, ry] of [[12, 22, 10, 8], [30, 20, 11, 9], [21, 13, 12, 10], [21, 25, 13, 7], [34, 28, 7, 5], [9, 30, 6, 5]] as const) p.disc(x, y, rx, ry, leaf, INK, deep);
    p.dither(shadeHex(leaf, 0.3), (x, y) => (x < 22 && y < 18 ? 0.45 : 0), leaf);
    // Lights hanging in it, winking.
    const lights = [[10, 26], [17, 16], [28, 14], [34, 24], [24, 28], [14, 31], [30, 31]] as const;
    lights.forEach(([x, y], k) => { if ((k + f) % 3 !== 0) { p.set(x, y, glow); p.set(x, y + 1, shadeHex(glow, -0.15)); } });
  });
}
/** A fairy ring: a circle of tiny pale mushrooms with a faint glow inside (flat). */
export function faeRingArt(variant: number): HTMLCanvasElement {
  const v = ((variant % 3) + 3) % 3, cap = (["#f0d8f0", "#e8c0e0", "#d8e8f8"] as const)[v];
  return pixelArt(`faering:${v}`, 30, 14, p => {
    p.dither("#cbb8f0", (x, y) => { const d = Math.hypot((x - 15) / 12, (y - 7) / 5); return d < 1 ? 0.25 : 0; });
    for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2, x = Math.round(15 + Math.cos(a) * 12), y = Math.round(7 + Math.sin(a) * 5); p.set(x, y + 1, "#efe6dc"); p.set(x, y, cap); p.set(x + 1, y, shadeHex(cap, -0.2)); p.set(x, y - 1, INK); }
  });
}
/** A lumen lamp: a slim post of white stone, a crystal hanging lit in a cage of silver (pulsing by frame). */
export function lumenLampArt(frame: number): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4, glow = (["#f4e8ff", "#e8d8ff", "#dccaff", "#e8d8ff"] as const)[f];
  return pixelArt(`lumenlamp:${f}`, 14, 40, p => {
    p.rect(6, 12, 2, 27, "#e8e4ec"); p.rect(8, 12, 1, 27, "#b8b0c4"); p.rect(4, 37, 6, 3, "#c8c0d4");
    p.line(3, 9, 10, 9, "#c0c4cc"); p.line(3, 9, 3, 12, "#c0c4cc"); p.line(10, 9, 10, 12, "#c0c4cc");
    p.poly([[7, 1], [10, 5], [7, 11], [4, 5]], glow, INK); p.set(6, 4, "#ffffff");
    p.dither(glow, (x, y) => { const d = Math.hypot(x - 7, y - 6); return d > 4 && d < 7 ? 0.3 : 0; });
    p.outline(INK);
  });
}
/** A crystal door of the Labyrinth: shut (a tall slab, glowing in its set's colour), or open (a sill and a ghost of it). */
export function mazeDoorArt(open: boolean, set: 0 | 1): HTMLCanvasElement {
  const c = set ? "#e47ac4" : "#9a72e8";
  return pixelArt(`mazedoor:${open ? 1 : 0}:${set}`, 20, 34, p => {
    if (open) {
      p.rect(2, 30, 16, 3, shadeHex(c, -0.2)); p.rect(2, 30, 16, 1, shadeHex(c, 0.3));
      p.dither(shadeHex(c, 0.4), (x, y) => (y > 6 && y < 30 && (x === 3 || x === 16) ? 0.5 : 0));
      p.outline(INK); return;
    }
    p.poly([[3, 33], [3, 6], [10, 1], [17, 6], [17, 33]], c, INK);
    p.poly([[4, 32], [4, 7], [10, 2], [10, 32]], shadeHex(c, 0.3), null);
    p.line(10, 3, 10, 31, shadeHex(c, 0.55));
    // Its set's mark, cut in the face: a circle for one, a diamond for the other.
    if (set) p.poly([[10, 12], [13, 16], [10, 20], [7, 16]], null, "#fff0fa"); else p.disc(10, 16, 3, 3, c, "#f4ecff");
    p.halo(shadeHex(c, 0.5));
  });
}
/** A trap glyph on the floor: a ring of light with Fennick's scrawl in it (flat). */
export function glyphArt(frame: number): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4, c = (["#f0a0e0", "#e88ad8", "#f0a0e0", "#fac0f0"] as const)[f];
  return pixelArt(`mazeglyph:${f}`, 26, 12, p => {
    for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; p.set(13 + Math.cos(a) * 11, 6 + Math.sin(a) * 4.6, c); }
    p.line(7, 6, 11, 3, c); p.line(11, 3, 15, 8, c); p.line(15, 8, 19, 5, c); p.set(13, 6, "#ffffff");
  });
}
/** Fennick's hourglass at the Labyrinth's heart: taller than a door, its sand running upward. */
export function hourglassArt(frame: number): HTMLCanvasElement {
  const f = ((frame % 8) + 8) % 8;
  return pixelArt(`hourglass:${f}`, 30, 52, p => {
    p.rect(3, 47, 24, 4, "#8a6a42"); p.rect(3, 2, 24, 4, "#8a6a42"); p.rect(4, 6, 2, 41, "#a8844e"); p.rect(24, 6, 2, 41, "#a8844e");
    p.poly([[7, 6], [23, 6], [16, 26], [23, 46], [7, 46], [14, 26]], "#e8f0ff", INK);
    // The sand, rising: a heap at the top growing, a thread climbing.
    const heap = 4 + f; p.poly([[15 - heap, 7], [15 + heap, 7], [15, 7 + heap]], "#ecb45a", null);
    p.poly([[9, 45], [21, 45], [15, 45 - (12 - f)]], "#ecb45a", null);
    for (let y = 26; y > 7 + heap; y -= 2) p.set(15, y - (f % 2), "#f4cf7a");
    p.outline(INK);
  });
}
