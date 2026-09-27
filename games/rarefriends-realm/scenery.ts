/**
 * Pixel-art scenery for the Realm: trees, rocks and decor, drawn procedurally on small grids with dithered shading and
 * an ink silhouette, then scaled up without smoothing. Variants come from a seed, so every tree is a little different.
 */
import { INK, Pixels, pixelArt, shadeHex } from "./pixel.ts";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BARK = "#8a7563", BARK_DARK = "#6f5d4c";
type TreeStyle = { canopy: string; shape: "round" | "broad" | "willow" | "cone" | "pale"; w: number; h: number };
const TREES: Record<string, TreeStyle> = {
  tree: { canopy: "#b3c1a6", shape: "round", w: 26, h: 38 }, oak: { canopy: "#a2b096", shape: "broad", w: 32, h: 40 },
  willow: { canopy: "#c2cbab", shape: "willow", w: 32, h: 40 }, maple: { canopy: "#d9b39a", shape: "broad", w: 30, h: 42 },
  yew: { canopy: "#8a9583", shape: "cone", w: 24, h: 46 }, ashwood: { canopy: "#e0e3e8", shape: "pale", w: 28, h: 44 },
};
function trunk(p: Pixels, cx: number, bottom: number, height: number, width = 4) {
  p.rect(cx - width / 2, bottom - height, width, height, BARK);
  p.rect(cx + width / 2 - 1, bottom - height, 1, height, BARK_DARK);
  p.rect(cx - width / 2 - 1, bottom - 2, width + 2, 2, BARK);
  for (let y = bottom - height + 2; y < bottom - 2; y += 3) p.set(cx - 1, y, BARK_DARK);
}
/** Leafy clusters: overlapping discs with dithered shade and a few highlights. */
function canopy(p: Pixels, random: () => number, cx: number, cy: number, rx: number, ry: number, color: string, blobs = 7) {
  const shade = shadeHex(color, -0.13), light = shadeHex(color, 0.1);
  for (let i = 0; i < blobs; i++) {
    const a = random() * Math.PI * 2, d = random() * 0.55;
    p.disc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, rx * (0.45 + random() * 0.25), ry * (0.45 + random() * 0.25), color, null, shade);
  }
  p.disc(cx, cy, rx * 0.72, ry * 0.72, color, null, shade);
  p.dither(shade, (x, y) => Math.max(0, ((x - cx) / rx + (y - cy) / ry) * 0.6), color);
  for (let i = 0; i < 9; i++) { const x = Math.round(cx - rx * 0.5 + random() * rx * 0.7), y = Math.round(cy - ry * 0.6 + random() * ry * 0.6); if (p.get(x, y)) { p.set(x, y, light); p.set(x + 1, y, light); } }
  for (let i = 0; i < 7; i++) { const x = Math.round(cx - rx * 0.6 + random() * rx * 1.2), y = Math.round(cy - ry * 0.3 + random() * ry * 1.0); if (p.get(x, y)) p.set(x, y, shadeHex(color, -0.25)); }
}
export function treeArt(kind: string, variant: number, depleted: boolean): HTMLCanvasElement {
  const style = TREES[kind] ?? TREES.tree;
  if (depleted) return pixelArt(`stump:${kind}`, 14, 9, p => {
    p.rect(3, 3, 8, 5, BARK); p.rect(3, 2, 8, 2, "#cdb9a0"); p.rect(5, 2, 4, 1, "#b89c86"); p.rect(2, 7, 10, 1, BARK_DARK); p.outline();
  });
  return pixelArt(`tree:${kind}:${variant}`, style.w, style.h, p => {
    const random = rng(variant * 977 + kind.length * 131), cx = style.w / 2, bottom = style.h - 2;
    if (style.shape === "cone") {
      trunk(p, cx, bottom, 10, 4);
      for (let i = 0; i < 4; i++) {
        const top = 2 + i * 8, base = top + 14, half = 5 + i * 2.2;
        p.poly([[cx, top], [cx + half, base], [cx - half, base]], shadeHex(style.canopy, i * 0.02), null);
      }
      p.dither(shadeHex(style.canopy, -0.12), x => x > cx ? 0.45 : 0.05);
    } else if (style.shape === "willow") {
      trunk(p, cx, bottom, 16, 4);
      canopy(p, random, cx, 14, 13, 10, style.canopy, 8);
      for (let i = -5; i <= 5; i++) { const x = cx + i * 2.4, len = 10 + Math.floor(random() * 8); p.line(x, 16, x + (random() - 0.5) * 2, 16 + len, i % 2 ? shadeHex(style.canopy, -0.1) : style.canopy, 1); }
    } else {
      const broad = style.shape === "broad", rx = broad ? 14 : 11, ry = broad ? 12 : 12;
      trunk(p, cx, bottom, broad ? 16 : 18, broad ? 5 : 4);
      canopy(p, random, cx, broad ? 15 : 14, rx, ry, style.canopy, broad ? 9 : 7);
      if (style.shape === "pale") p.dither("#c7d3dc", (x, y) => (y < 14 ? 0.15 : 0), style.canopy);
    }
    p.outline();
  });
}
const ROCK_BASE = "#a39e96";
export function rockArt(ore: string, variant: number, depleted: boolean): HTMLCanvasElement {
  return pixelArt(`rock:${ore}:${variant}:${depleted}`, 24, 18, p => {
    const random = rng(variant * 313 + 7), cx = 12, cy = 10, pts: [number, number][] = [];
    for (let i = 0; i < 9; i++) { const a = -Math.PI + i / 9 * Math.PI * 2, r = (depleted ? 0.8 : 1) * (0.8 + random() * 0.3); pts.push([cx + Math.cos(a) * 10 * r, cy + Math.sin(a) * 7 * r - (Math.sin(a) < 0 ? 1 : 0)]); }
    p.poly(pts, depleted ? "#b3aea6" : ROCK_BASE, null);
    p.dither(depleted ? "#a39e96" : "#8f8a83", (x, y) => Math.max(0, ((x - cx) / 10 + (y - cy) / 7) * 0.7));
    p.dither(depleted ? "#c3beb6" : "#bdb8b0", (x, y) => Math.max(0, (-(x - cx) / 10 - (y - cy) / 7) * 0.6));
    p.line(cx - 3, cy - 1, cx + 2, cy + 3, "#8f8a83");
    if (!depleted) for (const [ox, oy] of [[-5, -2], [3, -3], [5, 2], [-2, 3]] as const) { const x = cx + ox + Math.round(random() * 2 - 1), y = cy + oy; p.rect(x, y, 2, 2, ore); p.set(x + 1, y + 1, shadeHex(ore, -0.2)); p.set(x, y, shadeHex(ore, 0.15)); }
    p.outline();
  });
}
const COLORS = { rose: "#d8b6b4", sage: "#b4c3ab", butter: "#e2d7ad", lavender: "#c6bed4", paper: "#efede7", wood: "#9c8672", woodLight: "#b89c86", stone: "#c8c5be", stoneDark: "#a9a59e" };
/** Decor billboards. `frame` animates the few that move (torches, reeds, wheat). */
export function decorArt(kind: string, variant: number, frame = 0): HTMLCanvasElement | null {
  const key = `decor:${kind}:${variant}:${frame}`;
  const random = rng(variant * 71 + frame);
  switch (kind) {
    case "bush": return pixelArt(key, 20, 14, p => { canopy(p, random, 10, 8, 8, 5.5, "#a9b69e", 5); p.outline(); });
    case "flowers": return pixelArt(key, 20, 12, p => {
      for (let i = 0; i < 5; i++) { const x = 3 + Math.floor(random() * 14), y = 5 + Math.floor(random() * 5), c = [COLORS.rose, COLORS.butter, COLORS.lavender, "#ffffff"][Math.floor(random() * 4)];
        p.line(x, y, x, y + 3, "#8e9887"); p.rect(x - 1, y - 1, 3, 2, c); p.set(x, y - 2, c); p.set(x, y - 1, "#e2c46a"); }
    });
    case "boulder": return pixelArt(key, 18, 13, p => { p.poly([[1, 12], [3, 5], [8, 2], [14, 3], [17, 9], [15, 12]], "#b3aea6", null); p.dither("#9a958d", (x, y) => Math.max(0, (x - 8) / 12 + (y - 6) / 10)); p.outline(); });
    case "pine": return pixelArt(key, 22, 34, p => {
      p.rect(10, 26, 3, 7, BARK);
      for (let i = 0; i < 3; i++) { const top = 1 + i * 8, base = top + 13, half = 5 + i * 2.5; p.poly([[11, top], [11 + half, base], [11 - half, base]], "#9aa594", null); p.poly([[11, top], [11 + half * 0.55, top + 6], [11 - half * 0.55, top + 6]], "#f3f2ee", null); }
      p.dither("#879282", (x, y) => x > 11 && y > 8 ? 0.4 : 0, "#9aa594"); p.outline();
    });
    case "dead_tree": return pixelArt(key, 20, 26, p => { p.line(10, 25, 10, 6, "#4a4846", 2); p.line(10, 14, 4, 7, "#4a4846", 1); p.line(10, 11, 16, 4, "#4a4846", 1); p.line(4, 7, 2, 4, "#4a4846"); p.line(16, 4, 18, 5, "#4a4846"); p.outline(); });
    case "cactus": return pixelArt(key, 16, 22, p => {
      p.rect(6, 3, 4, 18, "#a9b59c"); p.rect(10, 9, 3, 2, "#a9b59c"); p.rect(12, 5, 2, 6, "#a9b59c"); p.rect(3, 11, 3, 2, "#a9b59c"); p.rect(2, 7, 2, 6, "#a9b59c");
      for (let y = 4; y < 20; y += 2) p.set(8, y, "#8e9a83"); p.outline();
    });
    case "palm": return pixelArt(key, 34, 34, p => {
      p.polyline([[17, 33], [18, 24], [17, 15], [16, 10]], BARK, 3);
      for (let y = 12; y < 33; y += 3) p.set(17, y, BARK_DARK);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, tx = 16 + Math.cos(a) * 15, ty = 10 + Math.sin(a) * 6 + 4; p.poly([[16, 9], [16 + Math.cos(a) * 7 - Math.sin(a) * 2, 9 + Math.sin(a) * 3 + 2], [tx, ty], [16 + Math.cos(a) * 7 + Math.sin(a) * 2, 9 + Math.sin(a) * 3 - 1]], i % 2 ? "#a9b59c" : "#b4c3ab", null); }
      p.disc(16, 11, 2, 2, "#8a7563", null); p.outline();
    });
    case "reeds": return pixelArt(key, 14, 16, p => { for (let i = 0; i < 5; i++) { const x = 2 + i * 2.5, sway = frame ? 1 : 0; p.line(x, 15, x + sway, 3 + (i % 2) * 3, "#8e9887"); p.rect(x + sway - 0.5, 3 + (i % 2) * 3, 2, 3, "#8a7563"); } });
    case "lily": return pixelArt(key, 16, 8, p => { p.disc(8, 4, 6.5, 3, "#a9b59c", null); p.line(8, 4, 13, 2, "#8e9887"); p.rect(6, 2, 3, 2, COLORS.rose); p.outline(); });
    case "hay": return pixelArt(key, 22, 14, p => { p.poly([[1, 5], [7, 1], [21, 1], [21, 9], [15, 13], [1, 13]], "#e2d7ad", null); p.line(7, 1, 7, 13, "#c9b77f"); p.line(1, 5, 15, 5, "#c9b77f"); p.line(15, 5, 21, 1, "#c9b77f"); p.line(15, 5, 15, 13, "#c9b77f"); p.dither("#d6c58f", (x) => x > 15 ? 0.5 : 0.1); p.outline(); });
    case "barrel": return pixelArt(key, 14, 18, p => { p.poly([[2, 3], [12, 3], [13, 9], [12, 16], [2, 16], [1, 9]], COLORS.woodLight, null); p.disc(7, 3, 5, 1.6, COLORS.wood, null); for (const y of [6, 12]) p.line(1, y, 13, y, "#6d6b67"); p.line(9, 4, 9, 15, "#a88f74"); p.outline(); });
    case "crate": return pixelArt(key, 16, 16, p => { p.rect(1, 3, 14, 12, "#cdb9a0"); p.line(1, 3, 14, 14, COLORS.wood); p.line(1, 14, 14, 3, COLORS.wood); p.rect(1, 3, 14, 2, COLORS.woodLight); p.outline(); });
    case "tent": return pixelArt(key, 34, 22, p => { p.poly([[1, 21], [17, 1], [33, 21]], "#bfb49c", null); p.poly([[17, 1], [33, 21], [22, 21]], "#a99e86", null); p.poly([[14, 21], [17, 12], [20, 21]], "#3b3a38", null); p.line(17, 1, 17, 12, "#8a7563"); p.outline(); });
    case "lamp": return pixelArt(key, 10, 30, p => { p.rect(4, 8, 2, 21, "#3b3a38"); p.rect(2, 28, 6, 2, "#3b3a38"); p.rect(1, 1, 8, 7, "#f4ecc8"); p.rect(1, 1, 8, 1, "#3b3a38"); p.rect(4, 3, 2, 3, "#ffffff"); p.outline(); });
    case "torch": return pixelArt(key, 10, 22, p => { p.rect(4, 9, 2, 12, BARK); p.poly(frame ? [[2, 9], [5, 1], [8, 9]] : [[2, 9], [4, 2], [8, 9]], "#e9a07a", null); p.poly([[4, 9], [5, 5], [6, 9]], "#f4dca0", null); p.outline(); });
    case "banner": return pixelArt(key, 14, 30, p => { p.rect(1, 1, 2, 28, "#3b3a38"); p.poly([[3, 2], [13, 3], [13, 17], [8, 14], [3, 17]], COLORS.rose, null); p.rect(6, 6, 4, 4, COLORS.paper); p.outline(); });
    case "grave": return pixelArt(key, 12, 16, p => { p.poly([[1, 15], [1, 5], [3, 2], [9, 2], [11, 5], [11, 15]], COLORS.stone, null); p.line(6, 5, 6, 11, COLORS.stoneDark); p.line(4, 7, 8, 7, COLORS.stoneDark); p.dither(COLORS.stoneDark, x => x > 7 ? 0.4 : 0, COLORS.stone); p.outline(); });
    case "rubble": return pixelArt(key, 18, 8, p => { for (let i = 0; i < 4; i++) { const x = 2 + random() * 12, y = 3 + random() * 3; p.poly([[x, y + 3], [x + 1, y], [x + 4, y], [x + 5, y + 3]], COLORS.stone, null); } p.outline(); });
    case "snowman": return pixelArt(key, 16, 22, p => { p.disc(8, 16, 6, 5, "#ffffff", null); p.disc(8, 7, 4.5, 4.5, "#ffffff", null); p.set(6, 6, INK); p.set(10, 6, INK); p.rect(8, 8, 3, 1, "#e9a07a"); p.rect(4, 11, 8, 1, COLORS.rose); p.dither("#dfe7ec", (x, y) => x > 9 ? 0.4 : 0, "#ffffff"); p.outline(); });
    case "chest": return pixelArt(key, 16, 13, p => { p.rect(1, 5, 14, 7, COLORS.wood); p.poly([[1, 5], [3, 1], [13, 1], [15, 5]], "#a88f74", null); p.rect(7, 5, 2, 3, "#e2d49e"); p.line(1, 8, 14, 8, "#7a6553"); p.outline(); });
    default: return null;
  }
}
