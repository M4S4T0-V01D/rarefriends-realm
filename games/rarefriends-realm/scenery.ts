/**
 * Pixel-art scenery for the Realm: trees, rocks and decor, drawn procedurally on small grids with dithered shading and
 * an ink silhouette, then scaled up without smoothing. Variants come from a seed, so every tree is a little different.
 */
import { INK, Pixels, pixelArt, shadeHex } from "./pixel.ts";
import { ORDERS } from "./knights.ts";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const BARK = "#8a7563", BARK_DARK = "#6f5d4c";
type TreeStyle = { canopy: string; shape: "round" | "broad" | "willow" | "cone" | "pale" | "blossom" | "bamboo"; w: number; h: number };
const TREES: Record<string, TreeStyle> = {
  tree: { canopy: "#b3c1a6", shape: "round", w: 26, h: 38 }, oak: { canopy: "#a2b096", shape: "broad", w: 32, h: 40 },
  willow: { canopy: "#c2cbab", shape: "willow", w: 32, h: 40 }, maple: { canopy: "#d9b39a", shape: "broad", w: 30, h: 42 },
  yew: { canopy: "#8a9583", shape: "cone", w: 24, h: 46 }, ashwood: { canopy: "#e0e3e8", shape: "pale", w: 28, h: 44 },
  // BarkReach (Return of Raria): tall red-canopied redwoods, and the grey, broad ironbarks.
  redwood: { canopy: "#9a4a3a", shape: "cone", w: 26, h: 50 }, ironbark: { canopy: "#7d8a7a", shape: "broad", w: 34, h: 44 },
  // The Mizukai Isles: the old cedars, the blossom trees, the bamboo.
  cedar: { canopy: "#5f7d6a", shape: "cone", w: 28, h: 58 }, sakura: { canopy: "#efc3cf", shape: "blossom", w: 32, h: 40 }, bamboo: { canopy: "#8fb36a", shape: "bamboo", w: 26, h: 52 },
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
/**
 * A herb patch in the same hand as the trees and bushes: a low mound of leaves in the herb's colour with a lit top and
 * a shaded foot, a flower or seed-head in its accent on the uncommon ones, and a thin ring of dark soil so it reads
 * against grass. Mushrooms are a cluster of stems and caps. Picked bare: a few stalks on the soil.
 */
export function herbArt(shape: string, color: string, accent: string, variant: number, rare: boolean, bare: boolean): HTMLCanvasElement {
  return pixelArt(`herb:${shape}:${color}:${accent}:${variant}:${rare}:${bare}`, 26, 22, p => {
    const random = rng(variant * 977 + 13), soil = "#6a5440";
    p.disc(13, 18, 11, 3.2, soil, null); p.dither("#5a4634", (x, y) => (x + y) % 3 === 0 ? 0.5 : 0, soil);
    if (bare) { for (const dx of [-5, -1, 3, 6]) p.line(13 + dx, 17, 13 + dx + (dx < 0 ? -1 : 1), 12, "#8a7563"); p.outline(); return; }
    if (shape === "mushroom") {
      for (const [cx, h, r] of [[7, 8, 4], [14, 12, 5.5], [20, 6, 3.5]] as const) {
        p.rect(cx - 1, 18 - h, 3, h, "#e8e4dc"); p.line(cx - 1, 18 - h, cx - 1, 17, "#c9c2b4");
        p.disc(cx, 18 - h, r, r * 0.62, color, INK, shadeHex(color, -0.2));
        for (let i = 0; i < 3; i++) p.set(Math.round(cx - r * 0.5 + random() * r), Math.round(18 - h - random() * r * 0.4), accent);
      }
      p.outline(); return;
    }
    canopy(p, random, 13, 11, 10, 6.5, color, 6);
    // Leaf tips poking out of the mound, and a few stems showing between them.
    for (let i = 0; i < 6; i++) { const a = Math.PI + random() * Math.PI, x = Math.round(13 + Math.cos(a) * 9), y = Math.round(11 + Math.sin(a) * 6); p.poly([[x, y], [x + Math.round(Math.cos(a) * 3), y + Math.round(Math.sin(a) * 3) - 2], [x + 1, y]], shadeHex(color, 0.12), null); }
    for (let i = 0; i < 3; i++) { const x = Math.round(8 + random() * 10); p.line(x, 14, x + (random() < 0.5 ? -1 : 1), 17, shadeHex(color, -0.3)); }
    if (rare) { p.line(13, 11, 14, 4, shadeHex(color, -0.2)); p.disc(14, 4, 2.6, 2.6, accent, INK); p.set(14, 4, shadeHex(accent, -0.3)); p.disc(8, 7, 1.6, 1.6, accent, INK); }
    p.outline();
  });
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
    } else if (style.shape === "bamboo") {
      // A clump of culms: straight green poles with darker joints, leaning a little, leaves in tufts at the joints.
      for (let k = 0; k < 6; k++) {
        const x0 = 4 + k * 3.4 + random() * 2, top = 4 + random() * 10, lean = (random() - 0.5) * 3, culm = k % 2 ? "#7fa35a" : "#9cc06a";
        p.line(x0, bottom, x0 + lean, top, culm, 2);
        for (let y = bottom - 6; y > top + 2; y -= 7) { const x = x0 + lean * (bottom - y) / (bottom - top); p.set(Math.round(x), y, "#4f6a34"); p.set(Math.round(x) + 1, y, "#4f6a34");
          if (random() < 0.7) { const dir = random() < 0.5 ? -1 : 1; p.line(x, y, x + dir * 5, y - 2, style.canopy); p.line(x + dir * 2, y - 1, x + dir * 6, y + 1, shadeHex(style.canopy, -0.15)); } }
      }
    } else if (style.shape === "blossom") {
      // A blossom tree: a dark crooked trunk forking low, a cloud of pink, and petals falling.
      p.line(cx, bottom, cx - 1, bottom - 12, "#5a3f36", 3); p.line(cx - 1, bottom - 12, cx - 7, bottom - 20, "#5a3f36", 2); p.line(cx - 1, bottom - 12, cx + 6, bottom - 22, "#5a3f36", 2);
      canopy(p, random, cx, 15, 14, 11, style.canopy, 9);
      p.dither("#f8e1e7", (x, y) => y < 12 ? 0.35 : 0.08, style.canopy);
      for (let i = 0; i < 6; i++) p.set(Math.round(cx - 12 + random() * 24), Math.round(28 + random() * 9), "#f3c8d4");
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
    // The gods of the four Orders, carved in stone and painted in their colours, on a plinth: Rare Friends of legend.
    case "god_ember": return pixelArt(key, 26, 38, p => {
      // A great iron brazier on a plinth, and the Ember's flame rising out of it.
      p.rect(4, 31, 18, 6, "#b9b5ae"); p.rect(3, 34, 20, 3, "#8f8a83");
      p.poly([[6, 30], [20, 30], [18, 22], [8, 22]], "#4a4038", INK); p.rect(7, 23, 12, 2, "#6b5b4d"); p.line(13, 30, 13, 26, "#2d2622");
      p.poly([[8, 22], [18, 22], [16, 14], [20, 9], [15, 10], [13, 2], [11, 10], [6, 8], [10, 14]], "#ff6a2a", INK); p.poly([[10, 21], [16, 21], [15, 15], [13, 8], [11, 15]], "#ffd27a", null); p.poly([[12, 21], [14, 21], [13, 15]], "#ffffff", null);
      p.outline();
    });
    case "god_diamond": case "god_ink": case "god_sol": case "god_hood": return pixelArt(key, 30, 44, p => {
      const order = ORDERS[kind.slice(4) as keyof typeof ORDERS], color = order.color, accent = order.accent, dark = order.dark, STONE = "#b9b5ae", STONE_D = "#8f8a83", STONE_L = "#d7d4cd";
      // A stepped plinth with the Order's colour inlaid along its face, and a plaque.
      p.rect(3, 37, 24, 6, STONE); p.rect(2, 40, 26, 3, STONE_D); p.line(3, 37, 26, 37, STONE_L); p.rect(6, 34, 18, 3, STONE); p.line(6, 34, 23, 34, STONE_L); p.rect(8, 38, 14, 2, color); p.rect(11, 41, 8, 1, accent);
      if (kind === "god_diamond") {
        // The Good Friend: a diamond standing on its point, faceted, a sword held upright before it in two small hands, a halo of six points: the promise kept.
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; p.line(15 + Math.cos(a) * 11, 17 + Math.sin(a) * 11, 15 + Math.cos(a) * 14, 17 + Math.sin(a) * 14, accent, 1); }
        p.poly([[15, 3], [27, 17], [15, 34], [3, 17]], color, INK); p.poly([[15, 3], [27, 17], [15, 17]], shadeHex(color, 0.22), null); p.poly([[3, 17], [15, 17], [15, 34]], dark, null);
        p.poly([[9, 10], [21, 10], [15, 17]], shadeHex(color, 0.4), null); p.line(3, 17, 27, 17, accent); p.line(15, 3, 15, 34, shadeHex(color, -0.3)); p.line(9, 10, 21, 10, shadeHex(color, 0.5));
        p.set(11, 13, INK); p.set(19, 13, INK); p.set(11, 12, accent); p.set(19, 12, accent); p.line(13, 20, 17, 20, INK);
        p.line(15, 22, 15, 33, STONE_L, 2); p.rect(12, 24, 7, 2, accent); p.rect(14, 22, 3, 2, dark); p.set(12, 27, dark); p.set(18, 27, dark);
      } else if (kind === "god_ink") {
        // The Squid Friend: a tall mantle, two great eyes, a crown of arms curling down round an open book held in two of them, a quill in a third.
        p.disc(15, 13, 8, 10, color, INK); p.disc(15, 8, 5, 4, shadeHex(color, 0.2), null); p.disc(15, 5, 3, 2, shadeHex(color, 0.35), null);
        p.disc(11, 14, 2.2, 2.2, accent, INK); p.disc(19, 14, 2.2, 2.2, accent, INK); p.set(11, 14, INK); p.set(19, 14, INK); p.set(12, 13, "#ffffff"); p.set(20, 13, "#ffffff");
        for (const [x0, x1] of [[7, 3], [10, 8], [15, 15], [20, 22], [23, 27]] as const) { p.line(x0, 22, x1, 33, dark, 2); p.set(x1, 33, accent); }
        p.rect(9, 26, 12, 6, "#f3eee2"); p.line(15, 26, 15, 31, STONE_D); p.rect(9, 26, 12, 1, STONE_D); for (let y = 28; y <= 30; y++) { p.line(10, y, 13, y, dark); p.line(17, y, 20, y, dark); }
        p.line(24, 20, 27, 15, "#f3eee2", 1); p.line(26, 16, 27, 14, accent);
      } else if (kind === "god_sol") {
        // The Weird Friend: a sun of every colour, its rays each a different hue, a face that will not settle, and a prism at its feet throwing the colours on the plinth.
        const rays = ["#ff5f5f", "#ffb347", "#f7f06d", "#14f195", "#4fc3f7", "#9945ff", "#ff7ad9", "#ffffff", "#ffd27a", "#62e6c0", "#c58cff", "#ff9bd2"];
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r0 = i % 2 ? 7 : 8, r1 = i % 2 ? 12 : 15; p.line(15 + Math.cos(a) * r0, 15 + Math.sin(a) * r0, 15 + Math.cos(a) * r1, 15 + Math.sin(a) * r1, rays[i], 2); }
        p.disc(15, 15, 7.5, 7.5, color, INK); p.disc(15, 15, 5, 5, shadeHex(color, 0.25), null); p.disc(13, 13, 2, 2, "#ffffff", null);
        p.set(12, 13, INK); p.set(17, 14, INK); p.set(17, 13, accent); p.line(12, 18, 17, 18, INK); p.set(18, 17, INK); p.set(11, 17, accent); p.set(19, 16, accent);
        p.poly([[11, 33], [19, 33], [15, 26]], "#e8e4d6", INK); for (let i = 0; i < 5; i++) p.set(20 + i, 30 + (i % 2), rays[i]); for (let i = 0; i < 5; i++) p.set(9 - i, 30 + (i % 2), rays[6 + i]);
      } else {
        // The Hood Friend: a deep hood over a face you can't see, a bow across the back, a sack of coins open at its feet and one hand out, giving.
        p.poly([[15, 2], [24, 13], [24, 33], [6, 33], [6, 13]], color, INK); p.poly([[15, 2], [24, 13], [15, 13], [6, 13]], shadeHex(color, 0.12), null);
        p.poly([[9, 13], [21, 13], [19, 22], [11, 22]], accent, null); p.set(12, 16, "#ffffff"); p.set(18, 16, "#ffffff"); p.set(13, 17, "#ffffff"); p.set(19, 17, "#ffffff");
        p.line(4, 7, 26, 31, "#6b4a2c", 2); p.line(4, 7, 26, 31, dark, 1); p.line(5, 9, 25, 30, "#e2d49e", 1);
        p.poly([[25, 22], [29, 24], [28, 28], [24, 27]], shadeHex(color, 0.3), INK); p.set(27, 25, "#e2d49e"); p.set(26, 26, "#e2d49e");
        p.disc(7, 31, 3.5, 2.5, "#8a7563", INK); p.set(6, 29, "#e2d49e"); p.set(8, 29, "#e2d49e"); p.set(7, 28, "#e2d49e");
      }
      p.outline();
    });
    // The Wise Friend as Raria carves it: seated on a stepped plinth, blindfolded, a book open on its knees, a ring of six lamps about it; and the Order of Dusk's god, the same figure hooded, in violet, a censer at its feet.
    case "wise_friend": case "god_dusk": return pixelArt(key, 32, 46, p => {
      const dusk = kind === "god_dusk", STONE = dusk ? "#5a4a6e" : "#d7d4cd", STONE_D = dusk ? "#3b2a52" : "#b9b5ae", ROBE = dusk ? "#2a2238" : "#e8e4d6", TRIM = dusk ? "#8a6ab0" : "#3b2a52", GOLD = "#c9a84a";
      p.rect(2, 39, 28, 6, STONE); p.rect(1, 42, 30, 3, STONE_D); p.rect(5, 36, 22, 3, STONE); p.line(5, 36, 26, 36, "#ffffff"); p.rect(8, 40, 16, 2, TRIM);
      // The seated body: a broad robe to the plinth, knees forward, the book on them.
      p.poly([[16, 6], [25, 14], [27, 36], [5, 36], [7, 14]], ROBE, INK); p.poly([[7, 14], [16, 6], [16, 36], [5, 36]], shadeHex(ROBE, -0.1), null);
      p.rect(8, 26, 16, 7, shadeHex(ROBE, 0.06)); p.line(8, 26, 23, 26, TRIM); p.rect(10, 28, 12, 5, "#f3eee2"); p.line(16, 28, 16, 32, STONE_D); for (let y = 29; y <= 31; y++) { p.line(11, y, 14, y, TRIM); p.line(18, y, 21, y, TRIM); }
      // The head: a round head on a short neck, the blindfold across it, a thin crown of points.
      p.disc(16, 8, 5.5, 5.5, ROBE, INK); if (dusk) p.poly([[16, 1], [23, 9], [16, 14], [9, 9]], shadeHex(ROBE, -0.15), INK);
      p.rect(10, 7, 12, 3, TRIM); p.line(10, 8, 21, 8, shadeHex(TRIM, -0.3)); p.line(14, 11, 18, 11, INK);
      for (const x of [11, 14, 17, 20]) p.set(x, 2, GOLD); p.line(10, 3, 21, 3, GOLD);
      // The hands on the book, and what stands about it: lamps for the Wise Friend, a censer for the Dusk.
      p.rect(9, 27, 3, 2, ROBE); p.rect(20, 27, 3, 2, ROBE);
      if (!dusk) { for (const [x, y] of [[3, 20], [29, 20], [3, 30], [29, 30]] as const) { p.rect(x - 1, y, 3, 6, STONE_D); p.rect(x - 1, y - 3, 3, 3, "#f4ecc8"); p.set(x, y - 2, "#ffffff"); } }
      else { p.rect(13, 37, 6, 2, GOLD); p.line(16, 33, 16, 37, GOLD); p.disc(16, 35, 2.5, 1.5, "#8a6ab0", null); p.set(15, 33, "#c6bed4"); p.set(17, 32, "#c6bed4"); }
      p.outline();
    });
    // The Federation's cannon: copper, on a wheeled carriage, a verdigris crystal in the breech, and a device, which is a box of brass gears and a glass bulb that is on.
    case "cannon": return pixelArt(key, 34, 22, p => {
      p.disc(8, 17, 4.5, 4.5, "#6b4a2c", INK); p.disc(8, 17, 1.5, 1.5, "#b87333", null); p.disc(24, 17, 4.5, 4.5, "#6b4a2c", INK); p.disc(24, 17, 1.5, 1.5, "#b87333", null);
      p.poly([[4, 14], [28, 14], [26, 10], [6, 10]], "#8a5a3c", INK);
      p.poly([[2, 9], [30, 4], [33, 7], [5, 13]], "#b87333", INK); p.line(3, 10, 30, 5, "#d9a93f"); p.disc(6, 11, 2, 2, "#4fa58a", INK); p.set(6, 10, "#ffffff"); p.line(30, 4, 33, 7, "#4a3a2c");
      p.outline();
    });
    case "device": return pixelArt(key, 18, 24, p => {
      p.rect(2, 10, 14, 12, "#8a5a3c"); p.rect(3, 11, 12, 10, "#b87333"); for (const [x, y] of [[5, 13], [10, 14], [7, 18]] as const) { p.disc(x, y, 2, 2, "#d9a93f", INK); p.set(x, y, "#8a5a3c"); }
      p.rect(7, 4, 4, 6, "#4fa58a"); p.disc(9, 4, 3.5, 3.5, "#bfe8d8", INK); p.disc(9, 4, 1.5, 1.5, "#ffffff", null); p.rect(12, 2, 1, 8, "#4a3a2c"); p.set(13, 1, "#ffffff");
      p.outline();
    });
    // A supply wagon, canvas over hoops, and a watchtower: timber legs, a platform, a roof, a ladder up one side.
    case "wagon": return pixelArt(key, 34, 24, p => {
      p.disc(8, 19, 4.5, 4.5, "#6b4a2c", INK); p.disc(26, 19, 4.5, 4.5, "#6b4a2c", INK); p.set(8, 19, "#cdb9a0"); p.set(26, 19, "#cdb9a0");
      p.rect(3, 12, 28, 5, "#9c8672"); p.line(3, 16, 30, 16, "#6b4a2c"); p.poly([[4, 12], [30, 12], [28, 2], [6, 2]], "#e8e4d6", INK); for (const x of [10, 17, 24]) p.line(x, 3, x, 11, "#cdb9a0");
      p.outline();
    });
    case "watchtower": return pixelArt(key, 26, 56, p => {
      p.line(4, 55, 8, 20, BARK, 2); p.line(22, 55, 18, 20, BARK, 2); p.line(6, 40, 20, 40, BARK_DARK); p.line(5, 48, 21, 48, BARK_DARK); p.line(8, 30, 18, 30, BARK_DARK);
      p.rect(2, 18, 22, 4, "#9c8672"); p.rect(3, 12, 20, 6, "#cdb9a0"); for (let x = 3; x < 23; x += 3) p.rect(x, 10, 2, 3, "#9c8672");
      p.poly([[1, 10], [25, 10], [13, 2]], "#6f5d4c", INK); p.line(22, 55, 20, 24, "#cdb9a0"); for (let y = 26; y < 54; y += 4) p.line(19, y, 23, y, "#cdb9a0");
      p.outline();
    });
    // (The stake wall is drawn in the world by render.ts, log by log, so it keeps its line when the camera turns.)
    case "plaque": return pixelArt(key, 16, 14, p => { p.rect(2, 6, 12, 7, "#8f8a83"); p.rect(1, 1, 14, 6, "#d7d4cd"); p.rect(2, 2, 12, 4, "#c8c5be"); for (let y = 2; y <= 5; y += 1) p.line(3, y, 12 - (y % 2), y, "#8f8a83"); p.outline(); });
    // Faction banners: the Federation's verdigris with FFF in brass, the Regiment's violet with the closed eye, Hollowmere's crimson with the crown.
    // Each Order's banner in its own colours, with its sign: the Diamond's diamond, the Ink's arms, the Sol's sun, the Hood's hood, the Ember's flame, the Dusk's closed eye.
    case "banner_diamond": case "banner_ink": case "banner_sol": case "banner_hood": case "banner_ember": case "banner_dusk": return pixelArt(key, 14, 30, p => {
      const order = ORDERS[kind.slice(7) as keyof typeof ORDERS], field = order.color, mark = order.accent, dark = order.dark;
      p.rect(1, 1, 2, 28, "#3b3a38"); p.rect(0, 1, 4, 1, "#c9a84a"); p.poly([[3, 2], [13, 3], [13, 20], [8, 17], [3, 20]], field, null); p.line(3, 19, 8, 16, dark); p.line(8, 16, 13, 19, dark);
      if (kind === "banner_diamond") p.poly([[8, 5], [11, 9], [8, 14], [5, 9]], mark, null);
      else if (kind === "banner_ink") { p.disc(8, 8, 2.5, 2.5, mark, null); for (const x of [5, 7, 9, 11]) p.line(8, 10, x, 14, mark); }
      else if (kind === "banner_sol") { const rays = ["#ff5f5f", "#f7f06d", "#4fc3f7", "#9945ff"]; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.set(8 + Math.round(Math.cos(a) * 4), 10 + Math.round(Math.sin(a) * 4), rays[i % 4]); } p.disc(8, 10, 2.2, 2.2, mark, null); }
      else if (kind === "banner_hood") { p.poly([[8, 5], [11, 9], [11, 14], [5, 14], [5, 9]], mark, null); p.rect(7, 9, 3, 3, field); }
      else if (kind === "banner_ember") p.poly([[6, 14], [10, 14], [11, 10], [9, 8], [8, 4], [7, 8], [5, 10]], mark, null);
      else { p.line(5, 9, 11, 9, mark); p.line(5, 9, 8, 11, mark); p.line(8, 11, 11, 9, mark); p.set(6, 12, mark); p.set(8, 13, mark); p.set(10, 12, mark); }
      p.outline();
    });
    case "banner_fff": case "banner_rrr": case "banner_hollowmere": return pixelArt(key, 14, 30, p => {
      const field = kind === "banner_fff" ? "#2f7d68" : kind === "banner_rrr" ? "#3b2a52" : "#8a2f2b", mark = kind === "banner_fff" ? "#d9a93f" : kind === "banner_rrr" ? "#d8d6e4" : "#e2c46a";
      p.rect(1, 1, 2, 28, "#3b3a38"); p.poly([[3, 2], [13, 3], [13, 19], [8, 16], [3, 19]], field, null);
      if (kind === "banner_fff") { for (const x of [4, 7, 10]) { p.rect(x, 6, 1, 6, mark); p.rect(x, 6, 2, 1, mark); p.rect(x, 8, 2, 1, mark); } }
      else if (kind === "banner_rrr") { p.disc(8, 9, 3.5, 2.5, mark, null); p.line(5, 9, 11, 9, field); p.set(8, 7, field); }
      else { p.rect(5, 7, 6, 4, mark); for (const x of [5, 7, 9]) p.set(x, 6, mark); p.set(6, 11, mark); p.set(9, 11, mark); }
      p.outline();
    });
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
    case "logpile": return pixelArt(key, 30, 20, p => {
      // Split logs stacked in a pyramid, their cut ends facing you: pale rings and dark hearts.
      const bark = "#7a5a40", ends: [number, number][] = [[5, 16], [11, 16], [17, 16], [23, 16], [8, 11], [14, 11], [20, 11], [11, 6], [17, 6]];
      p.rect(3, 4, 23, 15, bark); p.line(3, 18, 26, 18, "#5a4030");
      for (const [x, y] of ends) { p.disc(x, y, 2.8, 2.6, "#e8d2a8", null); p.disc(x, y, 1.4, 1.2, "#c9a476", null); p.set(x, y, "#9c7a58"); p.set(x - 1, y - 2, "#f6ead0"); }
      p.outline();
    });
    case "stump": return pixelArt(key, 22, 18, p => {
      // A chopping block: a wide stump with an axe bitten into it and a few chips of wood around.
      p.poly([[3, 8], [19, 8], [20, 16], [2, 16]], "#7a5a40", null); p.line(6, 10, 6, 15, "#5a4030"); p.line(14, 9, 15, 15, "#5a4030");
      p.disc(11, 7, 8.4, 3, "#e8d2a8", null); p.disc(11, 7, 5, 1.8, "#d9bd8c", null); p.disc(11, 7, 2, 0.8, "#c9a476", null);
      p.line(12, 6, 17, 0, "#8a6a50", 2); p.poly([[8, 4], [12, 2], [13, 7], [9, 8]], "#b9bfc6", null); p.line(9, 7, 12, 6, "#e8e4da");
      p.set(1, 16, "#e8d2a8"); p.set(20, 17, "#e8d2a8"); p.set(18, 17, "#d9bd8c");
      p.outline();
    });
    case "target": return pixelArt(key, 20, 28, p => {
      // An archery butt: a straw boss on a wooden stand, painted rings, a couple of arrows home.
      p.line(4, 27, 8, 14, "#7a5a40", 2); p.line(16, 27, 12, 14, "#7a5a40", 2); p.line(10, 27, 10, 18, "#5a4030");
      p.disc(10, 11, 8.5, 8.5, "#e2d7ad", null); p.disc(10, 11, 6.5, 6.5, "#8fa3c9", null); p.disc(10, 11, 4.5, 4.5, "#cf6e6e", null); p.disc(10, 11, 2.3, 2.3, "#f2e28f", null);
      p.line(11, 10, 16, 6, "#8a6a50"); p.rect(15, 5, 2, 2, "#efede7"); p.line(7, 13, 3, 9, "#8a6a50"); p.rect(2, 8, 2, 2, "#efede7");
      p.outline();
    });
    case "crate": return pixelArt(key, 16, 16, p => { p.rect(1, 3, 14, 12, "#cdb9a0"); p.line(1, 3, 14, 14, COLORS.wood); p.line(1, 14, 14, 3, COLORS.wood); p.rect(1, 3, 14, 2, COLORS.woodLight); p.outline(); });
    // ---------- The Land Before Stone ----------
    case "campfire": case "campfire_cold": return pixelArt(key, 18, 12, p => {
      // Stones in a ring, logs crossed in them; the cold one grey ash and a last curl of smoke-stain.
      for (const [x, y] of [[2, 8], [5, 10], [9, 11], [13, 10], [16, 8], [14, 6], [4, 6]] as const) p.disc(x, y, 1.6, 1.3, "#9a948a", null);
      p.line(5, 9, 13, 5, "#6f5440", 2); p.line(5, 5, 13, 9, "#7a5c44", 2);
      if (kind === "campfire_cold") { p.disc(9, 7, 3, 1.6, "#bdb8ae", null); p.set(8, 7, "#3b3a38"); p.set(10, 6, "#3b3a38"); }
      else { p.poly([[6, 7], [8, 1], [9, 4], [11, 0], [12, 7]], "#ef9a4c", null); p.poly([[8, 7], [9, 3], [11, 7]], "#ffd26b", null); }
      p.outline();
    });
    case "scuffs": return pixelArt(key, 20, 10, p => {
      // Trodden sand: overlapping prints, boots and hooves, dragged in one direction.
      for (let i = 0; i < 6; i++) { const x = 2 + i * 3 + random() * 1.5, y = 3 + (i % 2) * 3 + random(); p.disc(x, y, 1.3, 0.8, "#b89a6a", null); p.set(Math.round(x + 1), Math.round(y), "#a3865a"); }
      p.line(1, 8, 18, 6, "#c7aa78", 1);
    });
    case "bedroll": return pixelArt(key, 20, 10, p => { p.rect(2, 3, 16, 5, "#7d6a4a"); p.rect(2, 3, 5, 5, "#a99e86"); p.line(7, 3, 7, 7, "#5f5038"); p.rect(13, 4, 4, 3, "#8a7a5a"); p.outline(); });
    case "counterweight": return pixelArt(key, 18, 30, p => {
      // A block of dressed stone hanging in a slot, its chain running up into the dark; Azhurak lines cut round it.
      p.line(9, 0, 9, 10, "#6d6b67", 2); for (let y = 1; y < 10; y += 3) p.rect(8, y, 3, 1, "#8b8e92");
      p.rect(2, 10, 14, 18, "#a39e96"); p.rect(2, 10, 14, 3, "#c3beb6"); p.rect(13, 13, 3, 15, "#8f8a83");
      p.line(4, 17, 13, 17, "#2f3f66"); p.line(4, 22, 13, 22, "#2f3f66"); p.disc(8.5, 19.5, 1.4, 1.4, "#d9b866", null);
      p.outline();
    });
    case "tent": return pixelArt(key, 34, 22, p => { p.poly([[1, 21], [17, 1], [33, 21]], "#bfb49c", null); p.poly([[17, 1], [33, 21], [22, 21]], "#a99e86", null); p.poly([[14, 21], [17, 12], [20, 21]], "#3b3a38", null); p.line(17, 1, 17, 12, "#8a7563"); p.outline(); });
    case "lamp": return pixelArt(key, 10, 30, p => { p.rect(4, 8, 2, 21, "#3b3a38"); p.rect(2, 28, 6, 2, "#3b3a38"); p.rect(1, 1, 8, 7, "#f4ecc8"); p.rect(1, 1, 8, 1, "#3b3a38"); p.rect(4, 3, 2, 3, "#ffffff"); p.outline(); });
    case "torch": return pixelArt(key, 10, 22, p => { p.rect(4, 9, 2, 12, BARK); p.rect(3, 8, 4, 2, "#5f5e66"); p.outline(); });
    case "banner": return pixelArt(key, 14, 30, p => { p.rect(1, 1, 2, 28, "#3b3a38"); p.poly([[3, 2], [13, 3], [13, 17], [8, 14], [3, 17]], COLORS.rose, null); p.rect(6, 6, 4, 4, COLORS.paper); p.outline(); });
    // Three kinds of headstone: the rounded stone, a cross, and a slab leaning the way the frost pushed it, cracked.
    case "grave": return variant === 1 ? pixelArt(key, 12, 18, p => { p.rect(5, 2, 3, 15, COLORS.stone); p.rect(2, 5, 9, 3, COLORS.stone); p.rect(3, 15, 7, 2, COLORS.stoneDark); p.dither(COLORS.stoneDark, x => x > 6 ? 0.4 : 0, COLORS.stone); p.outline(); })
      : variant === 2 ? pixelArt(key, 14, 16, p => { p.poly([[2, 15], [4, 4], [6, 2], [11, 3], [12, 6], [9, 15]], COLORS.stone, null); p.line(7, 6, 6, 11, "#6f6b64"); p.line(6, 11, 8, 13, "#6f6b64"); p.dither("#9fae8a", (x, y) => y > 10 ? 0.35 : 0, COLORS.stone); p.dither(COLORS.stoneDark, x => x > 8 ? 0.4 : 0, COLORS.stone); p.outline(); })
      : pixelArt(key, 12, 16, p => { p.poly([[1, 15], [1, 5], [3, 2], [9, 2], [11, 5], [11, 15]], COLORS.stone, null); p.line(6, 5, 6, 11, COLORS.stoneDark); p.line(4, 7, 8, 7, COLORS.stoneDark); p.dither(COLORS.stoneDark, x => x > 7 ? 0.4 : 0, COLORS.stone); p.outline(); });
    // A heap of old bones and a skull, picked clean.
    case "bones": return pixelArt(key, 18, 9, p => {
      for (let i = 0; i < 3; i++) { const x = 2 + Math.floor(random() * 9), y = 3 + Math.floor(random() * 4); p.line(x, y, x + 5, y - 1, "#e8e4d6"); p.set(x, y + 1, "#e8e4d6"); p.set(x + 5, y - 2, "#e8e4d6"); }
      const sx = 10 + Math.floor(random() * 4); p.disc(sx, 4, 3, 2.6, "#efede7", null); p.set(sx - 1, 4, "#3b3a38"); p.set(sx + 1, 4, "#3b3a38"); p.rect(sx - 1, 6, 3, 1, "#c8c5be");
      p.outline();
    });
    case "rubble": return pixelArt(key, 18, 8, p => { for (let i = 0; i < 4; i++) { const x = 2 + random() * 12, y = 3 + random() * 3; p.poly([[x, y + 3], [x + 1, y], [x + 4, y], [x + 5, y + 3]], COLORS.stone, null); } p.outline(); });
    case "snowman": return pixelArt(key, 16, 22, p => { p.disc(8, 16, 6, 5, "#ffffff", null); p.disc(8, 7, 4.5, 4.5, "#ffffff", null); p.set(6, 6, INK); p.set(10, 6, INK); p.rect(8, 8, 3, 1, "#e9a07a"); p.rect(4, 11, 8, 1, COLORS.rose); p.dither("#dfe7ec", (x, y) => x > 9 ? 0.4 : 0, "#ffffff"); p.outline(); });
    case "chest": return pixelArt(key, 16, 13, p => { p.rect(1, 5, 14, 7, COLORS.wood); p.poly([[1, 5], [3, 1], [13, 1], [15, 5]], "#a88f74", null); p.rect(7, 5, 2, 3, "#e2d49e"); p.line(1, 8, 14, 8, "#7a6553"); p.outline(); });
    // ---------- The Mizukai Isles (What Rises in the East) ----------
    case "torii": return pixelArt(key, 36, 38, p => {
      // A shrine gate: two vermilion posts, a black-capped top beam swept up at the ends, a tie beam under it, and a plaque.
      const RED = variant === 2 ? "#8f6a4a" : "#c0473a", RED_D = shadeHex(RED, -0.2), BLACK = "#2a2626";
      for (const x of [8, 26]) { p.rect(x, 9, 3, 28, RED); p.rect(x + 2, 9, 1, 28, RED_D); p.rect(x - 1, 35, 5, 2, BLACK); }
      p.poly([[1, 4], [5, 6], [31, 6], [35, 4], [34, 8], [2, 8]], BLACK, INK); p.rect(3, 8, 30, 3, RED); p.line(3, 10, 32, 10, RED_D);
      p.rect(5, 15, 26, 3, RED); p.line(5, 17, 30, 17, RED_D); p.rect(16, 10, 4, 6, BLACK); p.rect(17, 11, 2, 4, "#c9a24a");
      p.outline();
    });
    case "stone_lantern": return pixelArt(key, 16, 30, p => {
      // A stone lantern: a stepped base, a round post, the fire box with its window lit, a curled roof, a jewel on top.
      const S = "#a39e96", S_L = "#c3beb6", S_D = "#7d7870";
      p.rect(3, 26, 10, 3, S_D); p.rect(4, 24, 8, 2, S); p.rect(6, 15, 4, 9, S); p.line(6, 15, 6, 23, S_L); p.rect(3, 13, 10, 2, S_D);
      p.rect(4, 8, 8, 5, S); p.rect(6, 9, 4, 3, variant === 1 ? "#3b3a38" : "#f2c46a"); p.set(7, 10, variant === 1 ? "#3b3a38" : "#fff2c0");
      p.poly([[1, 8], [8, 3], [15, 8], [13, 9], [3, 9]], S_D, INK); p.line(3, 7, 8, 4, S_L); p.disc(8, 2, 1.6, 1.6, S, INK);
      p.dither("#8e9d80", (x, y) => y > 22 && (x + y) % 5 === 0 ? 0.6 : 0, S_D);
      p.outline();
    });
    case "pagoda": return pixelArt(key, 48, 112, p => {
      // Five storeys, each a little narrower, each under a wide upswept roof of dark tile; a bronze spire of rings on top.
      const WALL = "#c0473a", WALL_D = "#9a3a30", ROOF = "#3f4651", ROOF_L = "#56606e", BEAM = "#e6dcc6";
      p.rect(8, 104, 32, 6, "#a39e96"); p.rect(6, 108, 36, 3, "#8f8a83");
      for (let k = 0; k < 5; k++) {
        const base = 104 - k * 18, half = 13 - k * 2, roofHalf = half + 8, cx = 24;
        p.rect(cx - half, base - 12, half * 2, 12, WALL); p.rect(cx + half - 3, base - 12, 3, 12, WALL_D); p.line(cx - half, base - 7, cx + half - 1, base - 7, BEAM);
        for (let x = cx - half + 2; x < cx + half - 2; x += 4) p.rect(x, base - 11, 2, 3, "#2a2626");
        p.poly([[cx - roofHalf, base - 12], [cx - roofHalf + 3, base - 16], [cx + roofHalf - 3, base - 16], [cx + roofHalf, base - 12], [cx + roofHalf + 1, base - 14], [cx + roofHalf - 2, base - 18], [cx - roofHalf + 2, base - 18], [cx - roofHalf - 1, base - 14]], ROOF, INK);
        p.line(cx - roofHalf + 3, base - 17, cx + roofHalf - 4, base - 17, ROOF_L);
      }
      p.rect(23, 3, 2, 14, "#b08a3a"); for (let y = 6; y <= 14; y += 2) p.line(21, y, 26, y, "#c9a24a"); p.disc(24, 2, 1.8, 1.8, "#e2c46a", INK);
      p.outline();
    });
    case "castle_keep": return pixelArt(key, 76, 128, p => {
      // A castle keep on a sloped stone base: three storeys of white plaster, black-tiled roofs with gables, gold fish on the ridge.
      const PLASTER = "#efe9dc", PLASTER_D = "#d6cfbf", ROOF = "#2f343c", ROOF_L = "#4a515c", STONE = "#a39e96", STONE_D = "#7d7870", ruined = variant === 1;
      p.poly([[4, 126], [72, 126], [64, 92], [12, 92]], STONE, INK);
      for (let y = 96; y < 126; y += 5) for (let x = 8 + ((y / 5) % 2) * 4; x < 70; x += 8) p.rect(x, y, 6, 4, (x + y) % 3 ? STONE : STONE_D);
      const storey = (y: number, half: number, h: number) => {
        p.rect(38 - half, y - h, half * 2, h, ruined ? "#5a5550" : PLASTER); p.rect(38 + half - 4, y - h, 4, h, ruined ? "#45403c" : PLASTER_D);
        for (let x = 38 - half + 4; x < 38 + half - 6; x += 8) p.rect(x, y - h + 4, 3, 4, "#2a2626");
        p.poly([[38 - half - 8, y - h], [38 - half - 4, y - h - 6], [38 + half + 4, y - h - 6], [38 + half + 8, y - h], [38 + half + 9, y - h - 3], [38 + half + 3, y - h - 9], [38 - half - 3, y - h - 9], [38 - half - 9, y - h - 3]], ruined ? "#3a3632" : ROOF, INK);
        p.line(38 - half - 3, y - h - 8, 38 + half + 2, y - h - 8, ROOF_L);
      };
      storey(92, 24, 16); storey(67, 18, 14); storey(44, 13, 13);
      if (!ruined) { p.poly([[24, 22], [38, 10], [52, 22]], ROOF, INK); p.poly([[33, 22], [38, 16], [43, 22]], PLASTER, INK); p.line(26, 13, 50, 13, ROOF_L); p.rect(23, 9, 3, 4, "#c9a24a"); p.rect(50, 9, 3, 4, "#c9a24a"); p.line(38, 10, 38, 2, "#2a2626"); p.rect(39, 2, 8, 5, "#2f3a5e"); p.set(42, 4, "#efe6d2"); }
      else { p.poly([[26, 22], [32, 14], [36, 20], [44, 12], [50, 22]], "#3a3632", INK); p.line(44, 12, 44, 3, "#2a2626"); p.rect(45, 3, 7, 6, "#4f7a64"); }
      p.outline();
    });
    case "guardian": return pixelArt(key, 20, 24, p => {
      // A guardian lion-dog seated on its plinth, curled mane, one paw on a ball (or, its mouth shut, a cub).
      const S = "#b9b5ae", S_D = "#8f8a83", S_L = "#d7d4cd";
      p.rect(2, 19, 16, 4, S_D); p.line(2, 19, 17, 19, S_L);
      p.poly([[5, 19], [5, 12], [7, 7], [12, 5], [16, 8], [16, 19]], S, INK); p.disc(11, 7, 5, 4.5, S, INK, S_D);
      for (const [x, y] of [[7, 4], [10, 3], [13, 4], [15, 6], [6, 7]] as const) p.disc(x, y, 1.6, 1.6, S_D, null);
      p.set(9, 7, "#2a2626"); p.set(13, 7, "#2a2626"); p.line(9, 9, 13, 9, variant % 2 ? S_D : "#5a4a4a"); p.disc(15, 17, 2, 2, S_L, INK);
      p.line(6, 13, 6, 18, S_L);
      p.outline();
    });
    case "sacred_rope": return pixelArt(key, 28, 24, p => {
      // A great rock with a twisted straw rope round its middle and white paper zigzags hanging from it.
      p.poly([[3, 22], [2, 14], [6, 7], [14, 3], [22, 6], [26, 13], [25, 22]], "#8f8a83", INK); p.dither("#7d7870", (x, y) => (x + y) % 3 === 0 && x > 14 ? 0.7 : 0, "#8f8a83"); p.line(6, 9, 13, 5, "#b3aea6");
      p.rect(2, 12, 24, 3, "#c9b27a"); for (let x = 3; x < 26; x += 2) p.set(x, 13, "#8a6a3a");
      for (const x of [6, 13, 20]) { p.line(x, 15, x + 1, 17, "#ffffff"); p.line(x + 1, 17, x, 19, "#ffffff"); p.line(x, 19, x + 1, 21, "#ffffff"); }
      p.outline();
    });
    case "drying_rack": return pixelArt(key, 26, 24, p => {
      p.line(3, 23, 3, 6, BARK, 2); p.line(23, 23, 23, 6, BARK, 2); p.line(2, 6, 24, 6, BARK_DARK, 2);
      for (const x of [6, 10, 14, 18]) { p.line(x, 7, x, 9, "#6f5d4c"); p.poly([[x - 2, 10], [x + 2, 10], [x + 1, 17], [x, 19], [x - 1, 17]], "#c9b8a6", INK); p.set(x, 12, "#8f7a6a"); }
      p.outline();
    });
    case "steam": return pixelArt(key, 26, 30, p => {
      // A hot spring's pool edged in stones, steam rising off it in curls.
      p.disc(13, 25, 11, 4, "#7fa8c9", INK); p.disc(13, 25, 8, 2.5, "#a9cce3", null);
      for (const [x, y] of [[2, 25], [24, 25], [6, 28], [20, 28], [13, 29]] as const) p.disc(x, y, 2, 1.5, "#a39e96", INK);
      const drift = frame % 2 ? 1 : 0;
      for (const [x, y, r] of [[9, 17, 3], [15, 13, 3.5], [11, 8, 3], [17, 5, 2.5]] as const) p.disc(x + drift, y, r, r * 0.8, "#eef2f4", null);
      p.outline("#c9d2d8");
    });
    case "offering_box": return pixelArt(key, 20, 26, p => {
      // An offering box with a slatted top, and above it the bell on its thick coloured rope.
      p.rect(2, 16, 16, 9, "#7a5a44"); p.rect(2, 16, 16, 2, "#9c7a58"); for (let x = 3; x < 17; x += 2) p.line(x, 16, x, 18, "#4a3a2c"); p.rect(4, 20, 12, 2, "#c9a24a");
      p.line(10, 1, 10, 6, "#2a2626"); p.disc(10, 7, 2.6, 2.4, "#c9a24a", INK); p.line(10, 9, 10, 15, "#c0473a", 2); p.line(11, 9, 11, 15, "#f2f0ea");
      p.outline();
    });
    case "paper_lantern": return pixelArt(key, 14, 34, p => {
      // A red paper lantern hung from a post, ribbed, with black caps.
      p.line(4, 33, 4, 4, "#4a3a2c", 2); p.line(4, 4, 10, 4, "#4a3a2c"); p.line(10, 4, 10, 7, "#2a2626");
      p.disc(10, 13, 4, 5.5, variant === 1 ? "#efe6d2" : "#c0473a", INK); for (const y of [10, 13, 16]) p.line(7, y, 13, y, variant === 1 ? "#c9b8a6" : "#9a3a30");
      p.rect(8, 7, 5, 1, "#2a2626"); p.rect(8, 18, 5, 1, "#2a2626"); p.set(10, 13, "#f2c46a");
      p.outline();
    });
    case "wish_board": return pixelArt(key, 28, 26, p => {
      // A wish board: a little roofed rack hung with wooden plaques.
      p.line(3, 25, 3, 6, BARK, 2); p.line(25, 25, 25, 6, BARK, 2); p.poly([[0, 7], [14, 1], [28, 7], [26, 8], [2, 8]], "#56606e", INK);
      for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) { const x = 5 + k * 5 + (row % 2), y = 10 + row * 5; p.rect(x, y, 4, 4, ["#d9c49a", "#cdb98a", "#e2d4ae"][(k + row) % 3]); p.set(x + 1, y + 1, "#c0473a"); }
      p.outline();
    });
    case "wayside_statue": return pixelArt(key, 12, 18, p => {
      // A little round-headed stone figure in a red bib, hands together.
      p.rect(2, 15, 8, 2, "#8f8a83"); p.poly([[3, 15], [3, 9], [9, 9], [9, 15]], "#b3aea6", INK); p.disc(6, 6, 3.2, 3.2, "#b3aea6", INK);
      p.poly([[3, 9], [9, 9], [6, 13]], "#c0473a", null); p.set(5, 6, "#5a5550"); p.set(7, 6, "#5a5550");
      p.outline();
    });
    case "nets": return pixelArt(key, 28, 20, p => {
      p.line(2, 19, 2, 2, BARK, 2); p.line(26, 19, 26, 2, BARK, 2); p.line(2, 3, 26, 3, BARK_DARK);
      for (let x = 4; x < 26; x += 3) p.line(x, 4, x + (x % 2 ? 1 : -1), 16, "#7a8a8a"); for (let y = 6; y < 17; y += 3) p.line(3, y, 25, y + 1, "#7a8a8a");
      for (const [x, y] of [[7, 15], [15, 16], [22, 14]] as const) p.disc(x, y, 1.5, 1.5, "#d9a93f", INK);
      p.outline();
    });
    case "mizukai_boat": return pixelArt(key, 52, 26, p => {
      // A Mizukai ferry: a long wooden hull with an upswept bow, a straw-roofed cabin amidships, a sculling oar at the stern.
      const bob = frame % 2;
      p.poly([[2, 14 + bob], [6, 19 + bob], [44, 19 + bob], [50, 12 + bob], [46, 14 + bob], [6, 14 + bob]], "#7a5a44", INK); p.line(6, 16 + bob, 45, 16 + bob, "#9c7a58"); p.line(7, 18 + bob, 44, 18 + bob, "#5a4030");
      p.poly([[16, 14 + bob], [16, 9 + bob], [32, 9 + bob], [32, 14 + bob]], "#c9b8a6", INK); p.poly([[13, 9 + bob], [24, 4 + bob], [35, 9 + bob]], "#a8925f", INK); p.line(16, 7 + bob, 32, 7 + bob, "#c9b27a");
      p.line(3, 13 + bob, 6, 23, "#6f5d4c", 2); p.rect(36, 10 + bob, 2, 4, "#c0473a");
      p.disc(26, 23, 22, 2, "#9fc3d9", null);
      p.outline();
    });
    default: return null;
  }
}

// ---------- Fire (after the pixel fire a friend of the game drew) ----------
/** The fire palette, hottest first: cream core, butter, amber, orange, red-orange, red, crimson, and the dark plum shell. */
const FIRE = ["#ead8b8", "#ebc26b", "#e6a24a", "#df7f3c", "#cd5836", "#a8352f", "#7c2435", "#4c1d2d"];
const EMBERS = ["#cd5836", "#df7f3c", "#7c2435", "#e6a24a"];
/**
 * One frame of a flickering fire, `w` × `h` pixels. Heat falls off from a core low in the middle, stretched upwards so
 * the flame tapers to a dark tip; rising noise tears the edge into tongues, and a few embers float above.
 */
export function fireArt(frame: number, w = 18, h = 26, seed = 1): HTMLCanvasElement {
  return pixelArt(`fire:${w}:${h}:${seed}:${frame}`, w, h, p => {
    const cx = (w - 1) / 2, cy = h * 0.74, t = frame * 0.9;
    const n = (x: number, y: number) => {
      // Rising value noise (two octaves), so tongues climb from frame to frame.
      const f = (sx: number, sy: number, k: number) => { const X = Math.floor(sx), Y = Math.floor(sy), fx = sx - X, fy = sy - Y, r = (a: number, b: number) => { let q = Math.imul(a * 374761393 + b * 668265263 + (seed + k) * 982451653, 1274126177); q ^= q >>> 13; return ((Math.imul(q, 1103515245) >>> 0) % 1000) / 1000; };
        const a = r(X, Y), b = r(X + 1, Y), c = r(X, Y + 1), d = r(X + 1, Y + 1), sx2 = fx * fx * (3 - 2 * fx), sy2 = fy * fy * (3 - 2 * fy);
        return (a * (1 - sx2) + b * sx2) * (1 - sy2) + (c * (1 - sx2) + d * sx2) * sy2; };
      return f(x / 3.2, (y + t * 3) / 3.2, 0) * 0.65 + f(x / 1.6, (y + t * 5) / 1.6, 7) * 0.35;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (w * 0.46), above = y < cy, dy = above ? (cy - y) / (h * 0.8) : (y - cy) / (h * 0.26);
      // Narrower towards the top, a flat-ish base.
      const width = above ? 1 + dy * 0.9 : 1;
      let heat = Math.hypot(dx * width, dy) + (n(x, y) - 0.5) * (0.35 + dy * 0.55);
      if (y === h - 1) heat += 0.12;
      if (heat > 1.02) continue;
      const band = heat < 0.28 ? 0 : heat < 0.42 ? 1 : heat < 0.54 ? 2 : heat < 0.66 ? 3 : heat < 0.78 ? 4 : heat < 0.87 ? 5 : heat < 0.95 ? 6 : 7;
      // The shell is darkest on top; low down it stays red.
      p.set(x, y, FIRE[band === 7 && !above ? 6 : band]);
    }
    // Embers: a few specks drifting up and away.
    for (let i = 0; i < 5; i++) {
      const life = ((frame * 0.23 + i * 0.37 + seed * 0.13) % 1), ex = Math.round(cx + Math.sin(i * 2.4 + seed) * w * 0.42 + life * (i % 2 ? 2 : -2)), ey = Math.round(h * 0.45 - life * h * 0.45);
      if (ex >= 0 && ex < w && ey >= 0 && !p.get(ex, ey)) p.set(ex, ey, EMBERS[i % EMBERS.length]);
    }
  });
}
/** A campfire's log pile: chunky logs criss-crossed, bark with knots, round cut ends with rings, hearth stones and glowing coals. */
export function campfireLogs(seed = 1): HTMLCanvasElement {
  return pixelArt(`campfire-logs:${seed % 2}`, 30, 15, p => {
    const bark = "#7a5a40", barkDark = "#5a4030", barkLight = "#9c7a58";
    const log = (x0: number, y0: number, x1: number, y1: number, end: boolean) => {
      p.line(x0, y0, x1, y1, bark, 4); p.line(x0, y0 - 2, x1, y1 - 2, barkLight); p.line(x0, y0 + 1, x1, y1 + 1, barkDark);
      // A knot or two in the bark.
      const kx = Math.round(x0 + (x1 - x0) * 0.55), ky = Math.round(y0 + (y1 - y0) * 0.55); p.set(kx, ky, barkDark); p.set(kx + 1, ky, barkDark);
      if (end) {
        // The cut end facing you: a pale round face, its ring and heart.
        p.disc(x0, y0 - 0.5, 2.6, 2.6, "#e8d2a8", null); p.disc(x0, y0 - 0.5, 1.4, 1.4, "#c9a476", null); p.set(x0, y0, "#e8d2a8"); p.set(x0 - 1, y0 - 2, "#f6ead0");
      }
    };
    p.disc(15, 10, 7, 2.6, "#4c1d2d", null); p.disc(15, 10, 5, 1.8, "#7c2435", null); p.set(12, 10, "#df7f3c"); p.set(16, 9, "#e6a24a"); p.set(18, 11, "#cd5836");
    log(8, 6, 23, 6, false);
    if (seed % 2) { log(4, 12, 19, 5, true); log(26, 12, 11, 5, true); } else { log(26, 12, 12, 5, true); log(4, 12, 18, 5, true); }
    p.outline();
    p.disc(1.5, 12.5, 1.6, 1.3, "#a9a59e"); p.disc(28.5, 12.5, 1.6, 1.3, "#bdb9b0"); p.disc(15, 13.6, 1.8, 1.2, "#b3aea6");
  });
}
