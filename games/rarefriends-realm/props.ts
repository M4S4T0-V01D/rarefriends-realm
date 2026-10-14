/**
 * The world's props, drawn again (scenery.ts asks here first): the camp and the village (barrels, crates, chests, lamps,
 * torches, hay, logs, tents, carts, troughs), the graveyard and the ruins, the armoury and the wild, each in the hand of
 * the trees and the buildings: a lit top and a shaded side, dithered between, wood with its grain and iron bands, stone
 * in courses with chips and moss, an ink silhouette round it all. Variants (0–2) change the wear, the load, the moss.
 */
import { INK, pixelArt, shadeHex, type Pixels } from "./pixel.ts";
import { ORDERS } from "./knights.ts";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A colour's lit, shaded and deep tones. */
const tone = (c: string) => ({ hi: shadeHex(c, 0.16), lit: shadeHex(c, 0.08), mid: c, dim: shadeHex(c, -0.12), dark: shadeHex(c, -0.26) });
const WOOD = "#9c7a58", WOOD_LIGHT = "#b8946c", OAK = "#7a5a40", IRON = "#5b5e66", IRON_LIGHT = "#8b8e96", BRASS = "#c9a24a", STONE = "#b4afa6", MOSS = "#7f9a5e", STRAW = "#e2cf8f";

/** A box of planks seen from the front: lit along the top, darker to the right and the foot, the joints and the grain. */
function planks(p: Pixels, x: number, y: number, w: number, h: number, color: string, across = true, random = Math.random) {
  const t = tone(color);
  p.rect(x, y, w, h, t.mid);
  if (across) for (let j = y + 3; j < y + h; j += 4) p.line(x, j, x + w - 1, j, t.dark);
  else for (let i = x + 3; i < x + w; i += 4) p.line(i, y, i, y + h - 1, t.dark);
  for (let k = 0; k < (w * h) / 14; k++) { const gx = Math.round(x + random() * (w - 2)), gy = Math.round(y + random() * (h - 1)); if (p.get(gx, gy)) { p.set(gx, gy, t.dim); p.set(gx + 1, gy, t.dim); } }
  p.line(x, y, x + w - 1, y, t.hi);
  p.dither(t.dim, (px, py) => px >= x && px < x + w && py >= y && py < y + h ? Math.max(0, (px - x) / w - 0.55) * 1.6 : 0, t.mid);
}
/** A block of stone: courses, a lit top edge, a shaded right side, chips and a little moss on the north. */
function stoneBlock(p: Pixels, x: number, y: number, w: number, h: number, color: string, random: () => number, moss = 0) {
  const t = tone(color);
  p.rect(x, y, w, h, t.mid);
  p.dither(t.dim, (px, py) => px >= x && px < x + w && py >= y && py < y + h ? Math.max(0, (px - x) / w - 0.5) * 1.4 + (BAYERISH(px, py) ? 0.08 : 0) : 0, t.mid);
  p.line(x, y, x + w - 1, y, t.hi); p.line(x + w - 1, y, x + w - 1, y + h - 1, t.dark);
  for (let k = 0; k < (w * h) / 20; k++) { const cx = Math.round(x + 1 + random() * (w - 3)), cy = Math.round(y + 1 + random() * (h - 2)); p.set(cx, cy, random() < 0.5 ? t.dark : t.lit); }
  for (let k = 0; k < moss * w; k++) { const mx = Math.round(x + random() * (w - 1)), my = Math.round(y + random() * Math.min(3, h)); p.set(mx, my, random() < 0.5 ? MOSS : shadeHex(MOSS, -0.15)); }
}
const BAYERISH = (x: number, y: number) => ((x * 3 + y * 5) & 7) === 0;
/** A drum seen side on (a barrel, a pot, a column): shaded across from a lit left to a dark right, an elliptical top. */
function drum(p: Pixels, cx: number, top: number, bottom: number, rx: number, color: string, lid?: string, bulge = 0) {
  const t = tone(color);
  for (let y = top; y <= bottom; y++) {
    const k = (y - top) / Math.max(1, bottom - top), r = rx + bulge * Math.sin(k * Math.PI);
    for (let x = Math.round(cx - r); x <= Math.round(cx + r); x++) { const u = (x - (cx - r)) / (2 * r); p.set(x, y, u < 0.22 ? t.lit : u > 0.78 ? t.dark : u > 0.6 ? t.dim : t.mid); }
  }
  if (lid) { p.disc(cx, top, rx, Math.max(1.2, rx * 0.35), lid, null); p.line(cx - rx + 1, top, cx + rx - 1, top, shadeHex(lid, 0.12)); }
}

/** The props' art, by kind (null: not one of these). */
export function propArt(kind: string, variant: number, frame = 0): HTMLCanvasElement | null {
  const key = `prop:${kind}:${variant}:${frame}`, random = rng(variant * 131 + kind.length * 17 + frame);
  switch (kind) {
    // ---------- The camp and the village ----------
    case "barrel": return pixelArt(key, 16, 21, p => {
      // A cooper's barrel: staves bellied out, three iron hoops, a lid with its bung; one in three stands open with something in it.
      drum(p, 8, 4, 19, 6, WOOD, OAK, 1.2);
      for (let i = 3; i <= 13; i += 2) p.line(i, 5, i, 18, shadeHex(WOOD, -0.18));
      for (const y of [6, 11, 16]) { p.line(1, y, 15, y, IRON); p.line(2, y - 1, 14, y - 1, IRON_LIGHT); }
      if (variant === 1) { p.disc(8, 4, 5, 1.6, "#3a2c20", null); p.disc(8, 3, 3.2, 1.2, "#cfa76a", null); p.set(7, 2, "#e8c98a"); }
      else { p.disc(8, 4, 6, 2, OAK, null); p.line(3, 4, 13, 4, shadeHex(OAK, 0.15)); p.set(10, 4, "#3a2c20"); }
      p.outline();
    });
    case "crate": return pixelArt(key, 18, 18, p => {
      // A packing crate: a lid of planks seen from above, the side boarded across with a brace, iron corners; a stencilled mark.
      p.poly([[1, 5], [5, 1], [17, 1], [13, 5]], WOOD_LIGHT, null);
      for (let x = 6; x < 16; x += 3) p.line(x, 1, x - 4, 5, shadeHex(WOOD_LIGHT, -0.12));
      planks(p, 1, 5, 12, 12, WOOD, true, random);
      p.poly([[13, 5], [17, 1], [17, 13], [13, 17]], shadeHex(WOOD, -0.2), null);
      p.line(1, 6, 12, 16, OAK, 1); p.line(2, 5, 13, 16, shadeHex(WOOD, 0.1));
      for (const [x, y] of [[1, 5], [12, 5], [1, 16], [12, 16]] as const) { p.set(x, y, IRON); }
      if (variant === 2) { p.rect(4, 9, 3, 3, "#3b3a38"); p.set(5, 10, WOOD); }
      p.outline();
    });
    case "chest": return pixelArt(key, 20, 16, p => {
      // A strongbox: a rounded lid of planks over an oak body, iron straps and corners, a brass lock plate catching the light.
      planks(p, 2, 7, 16, 8, OAK, true, random);
      for (let x = 2; x < 18; x++) { const k = (x - 2) / 15, y = Math.round(6 - Math.sin(k * Math.PI) * 4); p.line(x, y, x, 7, x < 7 ? WOOD_LIGHT : x > 14 ? shadeHex(WOOD, -0.15) : WOOD); }
      for (let x = 2; x < 18; x++) p.set(x, Math.round(6 - Math.sin((x - 2) / 15 * Math.PI) * 4), shadeHex(WOOD_LIGHT, 0.15));
      for (const x of [5, 14]) { p.line(x, 2, x, 14, IRON); p.line(x + 1, 3, x + 1, 14, IRON_LIGHT); }
      p.line(2, 7, 17, 7, IRON);
      p.rect(9, 7, 3, 4, BRASS); p.set(10, 9, "#3b2a1a"); p.set(9, 7, "#f0d78a");
      if (variant === 1) { p.set(4, 12, "#e2c46a"); p.set(16, 13, "#e2c46a"); }
      p.outline();
    });
    case "lamp": return pixelArt(key, 12, 34, p => {
      // A street lamp: a fluted iron post on a stepped foot, a scrolled arm, a glazed lantern with a cap and its flame.
      p.rect(3, 31, 6, 2, IRON); p.rect(4, 29, 4, 2, IRON_LIGHT); p.rect(5, 11, 2, 18, IRON); p.line(5, 12, 5, 28, IRON_LIGHT);
      p.rect(4, 10, 4, 1, IRON_LIGHT);
      p.poly([[2, 3], [10, 3], [9, 10], [3, 10]], "#f4e3a8", null); p.dither("#f8f0c8", (x, y) => y < 6 && x < 7 ? 0.6 : 0, "#f4e3a8");
      p.line(6, 3, 6, 9, IRON); p.line(2, 6, 10, 6, IRON);
      p.rect(1, 2, 10, 1, IRON); p.poly([[2, 2], [10, 2], [6, -1]], "#3b3a38", null); p.set(6, 0, BRASS);
      p.disc(6, 7, 1.2, 1.6, "#ffffff", null);
      p.outline();
    });
    case "torch": return pixelArt(key, 10, 24, p => {
      // A torch on a post: a pole bound in rope under an iron cup of pitch (the flame is drawn burning over it).
      p.rect(4, 9, 3, 14, WOOD); p.line(4, 10, 4, 22, WOOD_LIGHT); p.line(6, 10, 6, 22, OAK);
      for (const y of [12, 15]) { p.line(3, y, 7, y + 1, STRAW); }
      p.poly([[2, 6], [8, 6], [7, 9], [3, 9]], IRON, null); p.line(2, 6, 8, 6, IRON_LIGHT); p.rect(3, 5, 5, 1, "#2a2220");
      p.rect(3, 22, 5, 2, "#6b6058");
      p.outline();
    });
    case "bench": return pixelArt(key, 26, 14, p => {
      // A plank bench: a seat of two boards on stout legs, a back rail, worn smooth where people sit.
      planks(p, 1, 3, 24, 3, WOOD, false, random); p.line(1, 3, 24, 3, WOOD_LIGHT);
      p.rect(2, 7, 22, 2, WOOD_LIGHT); p.line(2, 8, 23, 8, OAK); p.dither("#cba57a", (x, y) => y === 7 && x > 6 && x < 19 ? 0.5 : 0);
      for (const x of [3, 21]) { p.rect(x, 9, 2, 4, OAK); p.rect(x, 5, 2, 2, OAK); }
      p.outline();
    });
    case "hay": return pixelArt(key, 24, 16, p => {
      // A bale of hay, bound twice, straw sticking out of its ends and its top; or a loose stook.
      if (variant === 2) { p.poly([[2, 15], [12, 1], [22, 15]], STRAW, null); for (let i = 0; i < 18; i++) { const x = 4 + random() * 16, y = 4 + random() * 10; p.line(x, y, x + (random() - 0.5) * 3, y + 2, shadeHex(STRAW, -0.15)); } p.line(6, 10, 18, 10, "#9c7a44"); p.outline(); return; }
      p.rect(2, 4, 20, 11, STRAW); p.poly([[2, 4], [6, 1], [22, 1], [22, 4]], shadeHex(STRAW, 0.1), null); p.rect(18, 1, 4, 14, shadeHex(STRAW, -0.12));
      for (let i = 0; i < 40; i++) { const x = 2 + random() * 19, y = 2 + random() * 12; p.line(x, y, x + 2, y + (random() - 0.5), random() < 0.5 ? shadeHex(STRAW, -0.18) : shadeHex(STRAW, 0.08)); }
      for (const x of [7, 14]) { p.line(x, 4, x, 14, "#7a5a30"); p.line(x + 2, 1, x, 4, "#7a5a30"); }
      for (let i = 0; i < 6; i++) p.set(1, 5 + i * 2, shadeHex(STRAW, -0.1));
      p.outline();
    });
    case "logpile": return pixelArt(key, 30, 20, p => {
      // Split logs stacked in a pyramid, their cut ends to you: rings, a dark heart, bark round each; a wedge in the top one.
      const bark = "#6f5040", ends: [number, number][] = [[5, 15], [11, 15], [17, 15], [23, 15], [8, 10], [14, 10], [20, 10], [11, 5], [17, 5]];
      p.rect(3, 4, 24, 15, bark); p.line(3, 18, 26, 18, "#4a3428");
      for (const [x, y] of ends) {
        p.disc(x, y, 3, 2.8, "#5a4030", null); p.disc(x, y, 2.4, 2.2, "#e2c896", null); p.disc(x, y, 1.4, 1.2, "#cfa872", null); p.set(x, y, "#8a6a48");
        p.set(x - 1, y - 2, "#f4e4c0"); if (random() < 0.4) p.line(x, y, x + 2, y - 1, "#9a7a52");
      }
      p.poly([[16, 2], [19, 2], [17, 6]], IRON_LIGHT, null);
      p.outline();
    });
    case "stump": return pixelArt(key, 22, 18, p => {
      // A chopping block: a wide stump, its top in rings, an axe bitten into it, chips about its foot.
      planks(p, 3, 8, 16, 8, "#7a5a40", false, random); p.rect(2, 15, 18, 1, "#5a4030");
      p.disc(11, 8, 8.4, 3, "#e2c896", null); p.disc(11, 8, 5.5, 2, "#d4b27e", null); p.disc(11, 8, 2.5, 1, "#c09a66", null); p.line(4, 8, 18, 8, "#f0dcb0");
      p.line(13, 7, 18, 0, "#8a6a50", 2); p.poly([[9, 5], [13, 3], [14, 8], [10, 9]], "#b9bfc6", null); p.line(10, 8, 13, 7, "#eef0f2");
      for (const [x, y] of [[1, 16], [20, 17], [18, 17], [3, 17]] as const) p.set(x, y, "#e2c896");
      p.outline();
    });
    case "target": return pixelArt(key, 22, 30, p => {
      // An archery butt: a straw boss on a trestle, painted rings, arrows home in it (more in one, a miss in another).
      p.line(4, 29, 8, 15, OAK, 2); p.line(18, 29, 14, 15, OAK, 2); p.line(11, 29, 11, 20, shadeHex(OAK, -0.2), 2);
      p.disc(11, 12, 9.5, 9.5, STRAW, INK, shadeHex(STRAW, -0.15)); p.disc(11, 12, 7, 7, "#6f8fc0", null); p.disc(11, 12, 5, 5, "#d4dce8", null); p.disc(11, 12, 3.4, 3.4, "#c95a52", null); p.disc(11, 12, 1.6, 1.6, "#f2d46a", null);
      for (let i = 0; i < 8; i++) { const a = random() * Math.PI * 2; p.set(11 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, shadeHex(STRAW, -0.25)); }
      const arrows = variant === 0 ? [[12, 11, 18, 6], [8, 14, 3, 10]] : variant === 1 ? [[11, 12, 17, 8], [10, 10, 5, 4], [14, 15, 20, 12]] : [[13, 8, 19, 3]];
      for (const [x0, y0, x1, y1] of arrows) { p.line(x0, y0, x1, y1, "#8a6a50"); p.rect(x1 - 1, y1 - 1, 2, 2, "#efede7"); p.set(x1, y1 - 1, "#c95a52"); }
      p.outline();
    });
    case "tent": return pixelArt(key, 36, 24, p => {
      // A ridge tent of oiled canvas: guy ropes pegged out, the near side in shade, a flap tied back on a dark inside.
      const canvas = variant === 1 ? "#c9b88e" : variant === 2 ? "#b5a58a" : "#d6c9a4";
      p.poly([[2, 22], [18, 2], [34, 22]], canvas, null); p.poly([[18, 2], [34, 22], [24, 22]], shadeHex(canvas, -0.14), null);
      for (let y = 6; y < 22; y += 4) p.line(18 - (y - 2) * 0.8 + 2, y, 18 + (y - 2) * 0.8 - 2, y, shadeHex(canvas, -0.06));
      p.poly([[14, 22], [18, 11], [22, 22]], "#3a2e26", null); p.poly([[18, 11], [22, 22], [25, 22]], shadeHex(canvas, 0.1), null); p.line(18, 11, 25, 22, shadeHex(canvas, -0.2));
      p.line(18, 0, 18, 3, OAK); p.set(18, 0, "#c95a52");
      for (const [x0, x1] of [[2, 0], [34, 35]] as const) p.line(x0, 21, x1, 23, "#8a7a5a");
      p.outline();
    });
    case "campfire": case "campfire_cold": return pixelArt(key, 20, 13, p => {
      // A ring of blackened stones, logs crossed in it; the cold one grey ash, a last ember, a curl of smoke-stain.
      for (const [x, y] of [[2, 9], [5, 11], [10, 12], [15, 11], [18, 9], [15, 6], [4, 6], [10, 5]] as const) { p.disc(x, y, 2, 1.5, "#8f8a83", null); p.set(x - 1, y - 1, "#b4afa6"); p.set(x + 1, y, "#5f5a54"); }
      p.line(5, 10, 15, 5, "#5a4030", 2); p.line(5, 5, 15, 10, "#6f5040", 2); p.line(6, 4, 14, 9, "#8a6a50");
      if (kind === "campfire_cold") { p.disc(10, 8, 3.6, 1.8, "#bdb8ae", null); p.set(9, 8, "#3b3a38"); p.set(11, 7, "#3b3a38"); p.set(10, 8, "#e0703a"); }
      else { p.disc(10, 8, 3.4, 1.6, "#f0a040", null); p.set(9, 8, "#ffe28a"); p.set(11, 8, "#ffe28a"); }
      p.outline();
    });
    case "bedroll": return pixelArt(key, 22, 11, p => {
      // A bedroll laid out: a wool blanket over a hide, the pillow end rolled, a pack beside it.
      p.rect(2, 3, 16, 6, "#7d6a4a"); p.rect(2, 3, 16, 1, "#9a8664"); p.rect(2, 4, 5, 5, "#b8a886"); p.line(7, 3, 7, 8, "#5f5038");
      for (let x = 9; x < 18; x += 3) p.line(x, 4, x, 8, "#6a5a3c");
      p.rect(18, 4, 3, 5, "#6b4a2c"); p.line(18, 5, 20, 5, "#8a6a40");
      p.outline();
    });
    case "boat": return pixelArt(key, 40, 18, p => {
      // A rowboat drawn up on the shore: clinker planking, a darker strake along the gunwale, two thwarts, oars shipped,
      // the inside in shadow; one in three turned keel-up.
      if (variant === 2) { p.poly([[2, 13], [8, 6], [32, 6], [38, 13]], WOOD, null); for (let x = 8; x < 33; x += 4) p.line(x, 6, x - 2, 13, OAK); p.line(8, 6, 32, 6, WOOD_LIGHT); p.line(2, 13, 38, 13, OAK); p.outline(); return; }
      p.poly([[1, 6], [39, 6], [33, 15], [7, 15]], WOOD, null);
      for (const y of [9, 12]) p.line(3 + (y - 6) * 0.6, y, 37 - (y - 6) * 0.6, y, OAK);
      p.poly([[3, 6], [37, 6], [34, 9], [6, 9]], "#4a3628", null);
      p.line(1, 6, 39, 6, WOOD_LIGHT); p.line(1, 7, 39, 7, "#6b4a2c");
      for (const x of [14, 26]) p.rect(x, 6, 3, 3, WOOD_LIGHT);
      p.line(10, 5, 31, 8, "#c9a878", 1); p.line(29, 4, 34, 9, "#c9a878", 1); p.rect(31, 7, 4, 2, "#b8946c");
      p.outline();
    });
    case "trough": return pixelArt(key, 26, 14, p => {
      // A water trough: a long box of planks, iron-banded, brim-full, the water catching the sky.
      planks(p, 2, 6, 22, 7, WOOD, true, random); p.poly([[2, 6], [5, 3], [25, 3], [24, 6]], WOOD_LIGHT, null);
      p.poly([[4, 6], [6, 4], [23, 4], [22, 6]], "#7fa6c9", null); p.line(8, 5, 14, 5, "#bfd8ea"); p.set(18, 5, "#e8f2f8");
      for (const x of [5, 20]) p.line(x, 6, x, 12, IRON);
      p.outline();
    });
    case "hitching_post": return pixelArt(key, 24, 20, p => {
      // A hitching rail: two posts and a worn rail, iron rings on it, a rope hanging from one.
      for (const x of [3, 19]) { p.rect(x, 4, 3, 15, WOOD); p.line(x, 4, x, 18, WOOD_LIGHT); p.line(x + 2, 5, x + 2, 18, OAK); p.rect(x - 1, 3, 5, 1, WOOD_LIGHT); }
      p.rect(3, 6, 19, 2, WOOD_LIGHT); p.line(3, 7, 21, 7, OAK);
      for (const x of [9, 14]) for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1], [0, 2]] as const) p.set(x + dx, 8 + dy, IRON);
      p.line(14, 10, 15, 13, STRAW); p.line(15, 13, 13, 16, STRAW); p.set(13, 17, STRAW);
      p.outline();
    });
    case "wagon": return pixelArt(key, 38, 26, p => {
      // A supply wagon: spoked wheels, a bed of planks, a canvas tilt over hoops; a load of sacks showing at the tail.
      for (const x of [9, 29]) { p.disc(x, 20, 5, 5, OAK, INK); p.disc(x, 20, 3.4, 3.4, "#5a4030", null); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; p.line(x, 20, x + Math.cos(a) * 4, 20 + Math.sin(a) * 4, WOOD_LIGHT); } p.set(x, 20, IRON_LIGHT); }
      planks(p, 3, 13, 32, 5, WOOD, true, random); p.line(3, 13, 34, 13, WOOD_LIGHT); p.line(3, 17, 34, 17, OAK);
      const cloth = variant === 1 ? "#d8cfb4" : "#e8e2cc";
      p.poly([[5, 13], [33, 13], [31, 3], [7, 3]], cloth, null); p.disc(19, 4, 12, 2.5, cloth, null); p.dither(shadeHex(cloth, -0.12), (x, y) => x > 24 ? 0.5 : 0, cloth);
      for (const x of [11, 19, 27]) p.line(x, 3, x, 12, shadeHex(cloth, -0.18));
      p.disc(33, 12, 2.5, 2, "#c9b48a", null); p.disc(30, 12, 2.2, 1.8, "#b8a27a", null);
      p.line(1, 15, 3, 15, OAK); p.line(0, 14, 0, 16, OAK);
      p.outline();
    });
    // ---------- The graveyard ----------
    case "grave": return variant === 1 ? pixelArt(key, 14, 20, p => {
      // A stone cross on a stepped foot, lichen on its arms, the name worn off.
      stoneBlock(p, 5, 2, 4, 15, STONE, random, 0.3); stoneBlock(p, 2, 5, 10, 4, STONE, random, 0.4); p.set(6, 6, shadeHex(STONE, -0.3)); p.set(7, 7, shadeHex(STONE, -0.3));
      stoneBlock(p, 3, 16, 8, 3, shadeHex(STONE, -0.08), random); p.outline();
    }) : variant === 2 ? pixelArt(key, 16, 18, p => {
      // A slab leaning the way the frost pushed it, cracked across, half its face in moss.
      p.poly([[3, 17], [4, 5], [7, 2], [12, 3], [13, 6], [11, 17]], STONE, null);
      p.dither(shadeHex(STONE, -0.14), (x, y) => x > 9 ? 0.6 : 0, STONE); p.line(4, 5, 7, 2, shadeHex(STONE, 0.15));
      p.line(8, 6, 7, 10, "#5f5a54"); p.line(7, 10, 9, 12, "#5f5a54");
      p.dither(MOSS, (x, y) => y > 12 && x < 8 ? 0.55 : 0); p.rect(1, 16, 14, 2, "#6a5a48"); p.outline();
    }) : pixelArt(key, 14, 18, p => {
      // A round-topped headstone, an inscription in three worn lines, a posy of flowers at its foot.
      p.poly([[2, 17], [2, 6], [4, 2], [10, 2], [12, 6], [12, 17]], STONE, null);
      p.dither(shadeHex(STONE, -0.14), (x, y) => x > 8 ? 0.55 : 0, STONE); p.line(3, 4, 5, 2, shadeHex(STONE, 0.15)); p.line(5, 2, 9, 2, shadeHex(STONE, 0.15));
      for (const y of [7, 9, 11]) p.line(4, y, 10 - (y === 11 ? 2 : 0), y, shadeHex(STONE, -0.32));
      p.rect(1, 16, 12, 2, "#6a5a48"); p.set(4, 15, "#d8b6b4"); p.set(5, 14, "#e2d7ad"); p.set(6, 15, "#d8b6b4"); p.line(5, 15, 5, 16, "#7f9a5e");
      p.outline();
    });
    case "bones": return pixelArt(key, 20, 10, p => {
      // Old bones picked clean: long bones crossed, ribs, a skull half in the earth.
      for (let i = 0; i < 3; i++) { const x = 2 + Math.floor(random() * 9), y = 4 + Math.floor(random() * 4); p.line(x, y, x + 6, y - 1, "#e8e4d6"); p.set(x - 1, y, "#efe9da"); p.set(x - 1, y + 1, "#efe9da"); p.set(x + 7, y - 2, "#efe9da"); p.set(x + 7, y - 1, "#efe9da"); p.line(x + 1, y + 1, x + 5, y, "#c8c2b2"); }
      for (let k = 0; k < 3; k++) p.line(4 + k * 2, 8, 6 + k * 2, 5, "#d8d2c2");
      const sx = 13 + Math.floor(random() * 3); p.disc(sx, 5, 3.4, 3, "#f1ece0", null); p.rect(sx - 2, 7, 4, 2, "#e0dacb"); p.set(sx - 1, 5, "#2a2826"); p.set(sx + 1, 5, "#2a2826"); p.set(sx, 7, "#2a2826"); p.set(sx - 2, 3, "#ffffff");
      p.outline();
    });
    case "rubble": return pixelArt(key, 24, 14, p => {
      // A heap of fallen stone: a few big dressed blocks tumbled together, smaller broken pieces and grit round them,
      // the big ones lit on top and shaded down their sides, moss in the cracks.
      const blocks: [number, number, number, number][] = variant === 0 ? [[3, 6, 8, 5], [10, 3, 7, 6], [15, 7, 6, 4]] : variant === 1 ? [[2, 7, 6, 4], [7, 4, 9, 6], [16, 6, 5, 5], [11, 9, 5, 3]] : [[4, 5, 10, 6], [14, 8, 6, 4]];
      for (const [x, y, w, h] of blocks) {
        const c = random() < 0.5 ? STONE : "#a7a197", t = tone(c);
        p.rect(x, y + 2, w, h, t.dim); p.rect(x, y, w, 2, t.lit); p.line(x, y, x + w - 1, y, t.hi); p.rect(x + w - 2, y + 2, 2, h, t.dark);
        if (random() < 0.6) p.line(x + 2, y + 2, x + 3, y + h, t.dark);
        if (variant !== 1 && random() < 0.5) { p.set(x + 1, y, MOSS); p.set(x + 2, y, shadeHex(MOSS, -0.1)); }
      }
      for (let i = 0; i < 9; i++) { const x = 1 + random() * 22, y = 11 + random() * 2; p.set(x, y, random() < 0.5 ? "#8f8a83" : "#b4afa6"); if (random() < 0.4) p.set(x + 1, y, "#6f6b64"); }
      p.outline();
    });
    case "plaque": return pixelArt(key, 18, 16, p => {
      // A plaque on a squat plinth: a bronze plate, green at the edges, letters you can still read.
      stoneBlock(p, 3, 9, 12, 6, "#a7a197", random);
      p.rect(1, 1, 16, 8, "#9a7a3a"); p.rect(2, 2, 14, 6, "#c9a24a"); p.dither("#6fa08a", (x, y) => x < 3 || x > 14 || y > 6 ? 0.5 : 0, "#c9a24a");
      for (const y of [3, 5]) for (let x = 4; x < 14; x += 2) p.set(x, y, "#6b5020");
      p.line(2, 2, 15, 2, "#f0d78a");
      p.outline();
    });
    // ---------- The armoury ----------
    case "armour": return pixelArt(key, 20, 40, p => {
      // A suit of plate on its stand: a crested helm with a dark visor slit, pauldrons, a breastplate with a ridge, a
      // fauld, greaves on a wooden cross-stand and a round base; one holds a halberd, one a shield, one stands bare.
      const steel = "#a9adb4", t = tone(steel);
      p.rect(9, 30, 2, 7, OAK); p.rect(4, 36, 12, 3, OAK); p.line(4, 36, 15, 36, WOOD_LIGHT);
      // Greaves and sabatons.
      for (const x of [6, 11]) { p.rect(x, 26, 3, 9, t.mid); p.line(x, 26, x, 34, t.hi); p.line(x + 2, 26, x + 2, 34, t.dark); p.rect(x - 1, 34, 5, 2, t.dim); }
      // The fauld, the breastplate and its ridge, the belt.
      p.poly([[5, 22], [15, 22], [16, 27], [4, 27]], t.dim, null); for (const y of [24, 26]) p.line(5, y, 15, y, t.dark);
      p.poly([[5, 12], [15, 12], [16, 21], [4, 21]], t.mid, null); p.line(10, 12, 10, 21, t.hi); p.dither(t.dim, (x, y) => x > 11 && y > 12 && y < 22 ? 0.55 : 0, t.mid);
      p.line(4, 21, 16, 21, "#6b4a2c"); p.set(10, 21, BRASS);
      // Pauldrons and arms down at its sides.
      for (const [x, dir] of [[2, -1], [15, 1]] as const) { p.disc(x + 1.5, 13, 2.8, 2.2, t.lit, null); p.rect(x + (dir < 0 ? 0 : 1), 14, 2, 8, t.dim); p.rect(x + (dir < 0 ? 0 : 1), 21, 2, 2, t.dark); }
      // The helm: a great helm, its slit dark, a plume or crest in the stand's colours.
      p.poly([[6, 4], [14, 4], [15, 10], [5, 10]], t.mid, null); p.poly([[6, 4], [10, 2], [14, 4]], t.lit, null); p.line(6, 7, 14, 7, "#1e1c22"); p.line(10, 3, 10, 10, t.hi); p.set(8, 9, "#1e1c22"); p.set(12, 9, "#1e1c22");
      const plume = ["#c95a52", "#4f6fb0", "#e2c46a"][variant % 3]; p.poly([[10, 2], [12, 0], [15, 1], [13, 3]], plume, null);
      if (variant === 0) { p.line(18, 2, 18, 38, OAK); p.poly([[16, 3], [19, 0], [19, 6]], IRON_LIGHT, null); p.line(17, 6, 19, 6, IRON); }
      if (variant === 1) { p.poly([[13, 15], [19, 15], [19, 24], [16, 28], [13, 24]], "#4f6fb0", null); p.line(16, 16, 16, 26, "#e2c46a"); p.line(13, 19, 19, 19, "#e2c46a"); }
      p.outline();
    });
    // ---------- The wild ----------
    case "flowers": return pixelArt(key, 22, 13, p => {
      // A clump of wildflowers: leaves first, then stems and heads of two or three colours, a bee's worth of yellow.
      const palettes = [["#e7a6a6", "#f2e6a8", "#ffffff"], ["#c6b4e2", "#f2d0a8", "#e8e0ff"], ["#f0b070", "#f6e08a", "#e8a0b8"]][variant % 3];
      for (let i = 0; i < 6; i++) { const x = 3 + random() * 16, y = 9 + random() * 3; p.line(x, y, x + (random() - 0.5) * 3, y - 2, i % 2 ? "#7f9a5e" : "#94ad70"); }
      for (let i = 0; i < 7; i++) {
        const x = 3 + Math.floor(random() * 16), y = 3 + Math.floor(random() * 6), c = palettes[Math.floor(random() * 3)];
        p.line(x, y + 1, x, y + 5, "#7f9a5e"); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c); p.set(x, y, "#e8c450");
      }
    });
    case "bush": return pixelArt(key, 24, 18, p => {
      // A round shrub: clumps of leaves heaped up, each clump lit on its top and dark beneath, leaves picked out in
      // light and shade, the dark of the inside showing at the foot; berries or blossom on some.
      const leaf = variant === 2 ? "#93a77e" : "#9fb38a", t = tone(leaf), clumps: [number, number, number, number][] = [[7, 11, 6, 4.5], [17, 11, 6, 4.5], [12, 9, 7, 5.5], [9, 6, 4.5, 3.5], [15, 6, 5, 4], [12, 4, 4, 3]];
      p.disc(12, 14, 10, 3.5, t.dark, null);
      for (const [x, y, rx, ry] of clumps) { p.disc(x, y, rx, ry, t.mid, null); p.dither(t.dim, (px, py) => Math.hypot((px - x) / rx, (py - y) / ry) < 1 && py > y ? 0.65 : 0, t.mid); p.dither(t.lit, (px, py) => Math.hypot((px - x) / rx, (py - y) / ry) < 0.8 && py < y - 1 ? 0.5 : 0, t.mid); }
      for (let i = 0; i < 26; i++) { const x = Math.round(3 + random() * 18), y = Math.round(2 + random() * 12); if (p.get(x, y)) { const c = random() < 0.55 ? t.hi : t.dark; p.set(x, y, c); if (random() < 0.5) p.set(x + 1, y, c); } }
      if (variant === 1) for (let i = 0; i < 6; i++) { const x = 5 + random() * 14, y = 5 + random() * 8; if (p.get(Math.round(x), Math.round(y))) { p.set(x, y, "#c94a52"); p.set(x + 1, y - 1, "#f08a8a"); } }
      if (variant === 2) for (let i = 0; i < 5; i++) { const x = 5 + random() * 14, y = 3 + random() * 7; if (p.get(Math.round(x), Math.round(y))) p.set(x, y, "#f6f0e2"); }
      p.outline();
    });
    case "boulder": return pixelArt(key, 22, 16, p => {
      // A weathered boulder: a heavy rounded block, its top lit, cracks and lichen, sunk a little into the grass.
      const t = tone("#aca79e");
      p.poly([[1, 15], [2, 7], [6, 2], [13, 1], [19, 4], [21, 11], [19, 15]], t.mid, null);
      p.dither(t.dim, (x, y) => Math.max(0, (x - 10) / 12 + (y - 7) / 10) * 0.9, t.mid); p.dither(t.dark, (x, y) => Math.max(0, (x - 13) / 10 + (y - 9) / 8) * 0.6);
      p.dither(t.hi, (x, y) => Math.max(0, (8 - x) / 10 + (5 - y) / 6) * 0.8, t.mid);
      p.line(9, 4, 11, 9, t.dark); p.line(11, 9, 10, 12, t.dark);
      for (let i = 0; i < 5; i++) p.set(4 + random() * 12, 2 + random() * 4, variant === 1 ? "#c9c26a" : MOSS);
      p.rect(2, 14, 18, 1, "#7f9a5e");
      p.outline();
    });
    case "cactus": return pixelArt(key, 18, 26, p => {
      // A saguaro: a ribbed trunk and two arms, spines catching the light, a pink flower on top of one.
      const g = "#8fae7a", t = tone(g);
      const column = (x: number, y0: number, y1: number, w: number) => { p.rect(x, y0, w, y1 - y0, g); p.line(x, y0, x, y1 - 1, t.lit); p.line(x + w - 1, y0, x + w - 1, y1 - 1, t.dark); for (let y = y0 + 1; y < y1; y += 2) p.set(x + Math.floor(w / 2), y, t.dim); p.disc(x + w / 2 - 0.5, y0, w / 2, 1.5, g, null); };
      column(7, 3, 25, 5); column(12, 10, 14, 4); column(14, 5, 12, 3); column(2, 13, 17, 5); column(2, 8, 15, 3);
      for (let i = 0; i < 10; i++) p.set(3 + random() * 13, 4 + random() * 20, "#f0ecd8");
      if (variant === 1) { p.set(9, 1, "#e88aa8"); p.set(10, 2, "#e88aa8"); p.set(8, 2, "#e88aa8"); p.set(9, 2, "#f6d06a"); }
      p.rect(5, 25, 9, 1, "#c9a878");
      p.outline();
    });
    case "dead_tree": return pixelArt(key, 24, 30, p => {
      // A dead tree: grey wood stripped of bark, a split trunk, crooked branches, a broken one hanging.
      const t = tone("#7d7670");
      p.line(12, 29, 12, 8, t.mid, 3); p.line(11, 28, 11, 9, t.lit); p.line(13, 28, 13, 10, t.dark);
      p.line(12, 18, 5, 10, t.mid, 2); p.line(5, 10, 3, 5, t.mid); p.line(12, 14, 19, 6, t.mid, 2); p.line(19, 6, 22, 4, t.mid); p.line(16, 9, 17, 3, t.mid);
      p.line(12, 9, 10, 2, t.mid); p.line(8, 14, 6, 18, t.dim); p.line(6, 18, 5, 21, t.dim);
      p.rect(9, 28, 7, 2, t.dark); p.line(13, 20, 14, 24, "#3b3a38");
      p.outline();
    });
    case "reeds": return pixelArt(key, 16, 18, p => {
      // Reeds at the water's edge: blades bending with the wind (two frames), bulrush heads on a few.
      for (let i = 0; i < 6; i++) { const x = 2 + i * 2.2, sway = frame ? 1 : 0, top = 3 + (i % 3) * 2; p.line(x, 17, x + sway + (i % 2 ? 1 : -1), top, i % 2 ? "#8e9a72" : "#a2ad84"); if (i % 2 === 0) { p.rect(x + sway - 1, top - 1, 2, 4, "#7a5a40"); p.set(x + sway, top - 2, "#a2ad84"); } }
      p.outline();
    });
    case "lily": return pixelArt(key, 18, 9, p => {
      // Lily pads on still water: two round leaves notched to the middle, a white flower with a yellow heart.
      p.disc(6, 5, 5, 2.6, "#8fae7a", null, "#6f8f5a"); p.line(6, 5, 10, 4, "#c9d8b0"); p.disc(13, 6, 3.5, 1.8, "#9fbe8a", null);
      p.disc(9, 3, 2.2, 1.6, "#ffffff", null); p.set(9, 3, "#f0c850"); p.set(8, 2, "#f6dce8");
    });
    case "snowman": return pixelArt(key, 18, 26, p => {
      // A Snow Friend: three packed balls, coal eyes, a pinecone nose, stick arms, a scarf in a stripe of red.
      p.disc(9, 20, 7, 5.5, "#ffffff", null, "#dfe6ee"); p.disc(9, 12, 5.5, 4.5, "#ffffff", null, "#dfe6ee"); p.disc(9, 5, 4.2, 4, "#ffffff", null, "#dfe6ee");
      p.set(7, 4, INK); p.set(11, 4, INK); p.rect(9, 6, 3, 1, "#a07850"); p.set(8, 7, INK); p.set(10, 7, INK);
      p.rect(5, 9, 9, 2, "#c95a52"); p.rect(11, 10, 2, 4, "#c95a52"); p.set(6, 9, "#e8e4d6"); p.set(10, 9, "#e8e4d6");
      p.line(4, 12, 0, 9, "#6f5040"); p.line(14, 12, 17, 8, "#6f5040"); for (const y of [12, 14, 17]) p.set(9, y, INK);
      p.outline();
    });
    // ---------- The Orders' gods ----------
    case "god_diamond": case "god_ink": case "god_sol": case "god_hood": case "god_ember": case "god_dusk": return pixelArt(key, 40, 62, p => {
      const id = kind.slice(4) as keyof typeof ORDERS, order = ORDERS[id], color = order.color, accent = order.accent, dark = order.dark, c = tone(color);
      const MARBLE = id === "dusk" ? "#5a4a6e" : "#d9d5cc", m = tone(MARBLE), cx = 20;
      // An aura behind the figure in the Order's colour, a ring of light dithered out into the air.
      p.dither(shadeHex(color, 0.3), (x, y) => { const d = Math.hypot(x - cx, (y - 22) * 1.1); return d > 13 && d < 18 ? 0.18 + 0.12 * Math.cos((d - 15.5) * 1.3) : 0; });
      // The plinth: three steps of dressed marble, the Order's colour inlaid in a band, its sign in a roundel on the face,
      // a bronze plate under it, candles and an offering at the foot.
      stoneBlock(p, 2, 55, 36, 6, shadeHex(MARBLE, -0.1), random, 0.15); stoneBlock(p, 5, 50, 30, 5, MARBLE, random); stoneBlock(p, 8, 45, 24, 5, shadeHex(MARBLE, 0.05), random);
      p.rect(5, 52, 30, 1, color); p.line(5, 53, 34, 53, dark);
      p.disc(cx, 47.5, 4, 3, dark, null); p.disc(cx, 47.5, 3, 2.2, color, null);
      const emblem = (x: number, y: number, col: string) => {
        if (id === "diamond") p.poly([[x, y - 2], [x + 2, y], [x, y + 2], [x - 2, y]], col, null);
        else if (id === "ink") { p.set(x, y - 1, col); for (const dx of [-2, -1, 1, 2]) p.set(x + dx, y + 1, col); p.set(x, y, col); }
        else if (id === "sol") { p.set(x, y, col); for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) p.set(x + dx, y + dy, col); }
        else if (id === "hood") { p.poly([[x, y - 2], [x + 2, y], [x + 2, y + 2], [x - 2, y + 2], [x - 2, y]], col, null); p.set(x, y + 1, dark); }
        else if (id === "ember") { p.poly([[x - 1, y + 2], [x + 2, y + 2], [x + 1, y - 1], [x, y - 2], [x - 2, y]], col, null); }
        else { p.line(x - 2, y, x + 2, y, col); p.set(x - 1, y + 1, col); p.set(x + 1, y + 1, col); p.set(x, y - 1, col); }
      };
      emblem(cx, 47, accent);
      p.rect(15, 56, 10, 3, "#9a7a3a"); p.line(15, 56, 24, 56, "#e2c46a"); for (let x = 16; x < 24; x += 2) p.set(x, 57, "#5a4020");
      for (const x of [4, 35]) { p.rect(x, 50, 2, 5, "#efe6cc"); p.set(x, 49, "#ffd27a"); p.set(x, 48, "#fff4c8"); }
      p.disc(11, 54, 2, 1, "#c95a52", null); p.set(12, 53, "#e2c46a"); p.disc(29, 54, 1.6, 1, "#e2c46a", null);
      // The god itself, on the top step.
      if (id === "diamond") {
        // The Good Friend: a great diamond standing on its point, faceted in light and shade, a sword held upright before
        // it, a halo of six points; two kind eyes in the crown facet.
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; p.line(cx + Math.cos(a) * 14, 20 + Math.sin(a) * 14, cx + Math.cos(a) * 18, 20 + Math.sin(a) * 18, accent, 1); p.set(cx + Math.cos(a) * 19, 20 + Math.sin(a) * 19, "#ffffff"); }
        p.poly([[cx, 3], [cx + 14, 20], [cx, 44], [cx - 14, 20]], c.mid, null);
        p.poly([[cx, 3], [cx + 14, 20], [cx + 5, 20], [cx, 11]], c.lit, null); p.poly([[cx, 3], [cx, 11], [cx - 5, 20], [cx - 14, 20]], c.hi, null);
        p.poly([[cx - 14, 20], [cx - 5, 20], [cx, 44]], c.dim, null); p.poly([[cx + 5, 20], [cx + 14, 20], [cx, 44]], dark, null); p.poly([[cx - 5, 20], [cx + 5, 20], [cx, 44]], c.mid, null);
        p.line(cx - 14, 20, cx + 14, 20, accent); p.line(cx, 3, cx - 5, 20, shadeHex(color, 0.35)); p.line(cx, 3, cx + 5, 20, shadeHex(color, 0.2));
        p.set(cx - 3, 15, INK); p.set(cx + 3, 15, INK); p.set(cx - 3, 14, "#ffffff"); p.set(cx + 3, 14, "#ffffff"); p.line(cx - 2, 18, cx + 2, 18, dark);
        p.line(cx, 24, cx, 42, "#eef0f4", 2); p.line(cx + 1, 25, cx + 1, 41, "#b8bcc6"); p.rect(cx - 4, 27, 9, 2, BRASS); p.rect(cx - 1, 23, 3, 3, dark); p.set(cx, 22, "#c95a52");
        for (let i = 0; i < 4; i++) p.set(cx - 8 + random() * 16, 8 + random() * 24, "#ffffff");
      } else if (id === "ink") {
        // The Squid Friend: a tall mantle shaded to the right, two great wise eyes, a crown of arms curling to the plinth,
        // an open book held in two of them, a quill in a third, ink dripping.
        p.disc(cx, 17, 10, 13, c.mid, null, c.dim); p.disc(cx - 2, 10, 6, 6, c.lit, null); p.disc(cx - 3, 7, 3, 2.5, c.hi, null);
        p.dither(dark, (x, y) => x > cx + 4 && y > 12 && y < 31 ? 0.45 : 0, c.mid);
        for (const ex of [cx - 4, cx + 4]) { p.disc(ex, 19, 3, 3, accent, INK); p.disc(ex, 19.5, 1.6, 1.8, "#1a1230", null); p.set(ex - 1, 18, "#ffffff"); }
        const arms: [number, number, number][] = [[-9, -14, 1], [-5, -8, -1], [-1, -2, 1], [3, 4, -1], [7, 10, 1], [10, 15, -1]];
        for (const [x0, x1, curl] of arms) { p.polyline([[cx + x0 * 0.6, 29], [cx + x0, 35], [cx + x1, 42], [cx + x1 + curl * 2, 44], [cx + x1 + curl * 2, 42]], dark, 2); p.set(cx + x1 + curl * 2, 41, accent); }
        p.poly([[cx - 8, 33], [cx, 35], [cx + 8, 33], [cx + 8, 40], [cx, 42], [cx - 8, 40]], "#f6f0e2", null); p.line(cx, 35, cx, 42, "#c8bfa8");
        for (const y of [36, 38]) { p.line(cx - 6, y, cx - 2, y + 1, dark); p.line(cx + 2, y + 1, cx + 6, y, dark); }
        p.line(cx + 11, 30, cx + 16, 22, "#f6f0e2", 1); p.line(cx + 15, 23, cx + 17, 20, accent); p.set(cx + 11, 31, INK); p.set(cx + 11, 33, INK);
      } else if (id === "sol") {
        // The Weird Friend: a sun of every colour, each ray a different hue, a face that won't settle, and a prism at its
        // feet throwing the colours across the plinth.
        const rays = ["#ff5f5f", "#ffb347", "#f7f06d", "#14f195", "#4fc3f7", "#9945ff", "#ff7ad9", "#ffffff", "#ffd27a", "#62e6c0", "#c58cff", "#ff9bd2", "#7ad0ff", "#f0ff8a", "#ff8f6a", "#b0f0c8"];
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r0 = 10, r1 = i % 2 ? 15 : 19; p.line(cx + Math.cos(a) * r0, 20 + Math.sin(a) * r0, cx + Math.cos(a) * r1, 20 + Math.sin(a) * r1, rays[i], i % 2 ? 1 : 2); }
        p.disc(cx, 20, 10, 10, c.mid, INK, c.dim); p.disc(cx - 1, 19, 7, 7, c.lit, null); p.disc(cx - 3, 16, 3, 3, c.hi, null); p.set(cx - 4, 15, "#ffffff");
        p.set(cx - 4, 19, INK); p.set(cx + 3, 18, INK); p.set(cx + 3, 17, accent); p.polyline([[cx - 4, 24], [cx - 1, 25], [cx + 2, 23], [cx + 4, 24]], INK); p.set(cx + 6, 21, accent);
        p.poly([[cx - 6, 43], [cx + 6, 43], [cx, 33]], "#eef4f8", null); p.line(cx, 33, cx + 6, 43, "#b8c8d8"); p.line(cx - 3, 38, cx + 1, 36, "#ffffff");
        for (let i = 0; i < 7; i++) { p.line(cx + 6, 41, cx + 16, 39 + i * 0.7, rays[i], 1); p.line(cx - 6, 41, cx - 16, 39 + i * 0.7, rays[8 + i], 1); }
      } else if (id === "hood") {
        // The Hood Friend: a cloaked figure, the hood deep over a face you can't see but for two glints, a bow across the
        // back, a sack of coins open at its feet and a hand held out, giving.
        p.line(cx - 15, 8, cx + 13, 40, "#6b4a2c", 2); p.line(cx - 14, 10, cx + 12, 39, "#e2d49e"); p.line(cx - 15, 8, cx - 15, 14, "#e2d49e");
        p.poly([[cx, 2], [cx + 10, 14], [cx + 12, 44], [cx - 12, 44], [cx - 10, 14]], c.mid, null);
        p.poly([[cx, 2], [cx + 10, 14], [cx + 12, 44], [cx + 4, 44], [cx + 3, 14]], c.dim, null); p.line(cx - 9, 16, cx - 11, 43, c.lit);
        for (const x of [-6, 0, 6]) p.line(cx + x, 26, cx + x * 1.2, 43, shadeHex(color, -0.2));
        p.poly([[cx - 6, 11], [cx + 6, 11], [cx + 5, 21], [cx - 5, 21]], "#141414", null); p.set(cx - 2, 15, "#ffffff"); p.set(cx + 3, 15, "#ffffff"); p.set(cx - 2, 16, accent);
        p.poly([[cx, 2], [cx + 7, 10], [cx - 7, 10]], c.hi, null);
        p.poly([[cx + 10, 30], [cx + 17, 31], [cx + 17, 34], [cx + 10, 34]], c.lit, null); p.disc(cx + 17, 32, 1.6, 1.6, "#d8b896", null); p.set(cx + 18, 30, "#e2d49e");
        p.disc(cx - 11, 42, 5, 3.6, "#8a6a4a", null, "#6a4a32"); p.line(cx - 14, 39, cx - 8, 39, "#5a4030");
        for (const [x, y] of [[-12, 38], [-10, 37], [-8, 38], [-11, 36], [-5, 44], [-3, 44], [-15, 44]] as const) { p.set(cx + x, y, "#e2c46a"); p.set(cx + x + 1, y, "#b8963a"); }
      } else if (id === "ember") {
        // The Ember: a great bronze brazier on three lion's feet, its bowl chased with flames, and the Ember's fire carved
        // rising out of it in red stone shot with gold.
        for (const x of [cx - 10, cx, cx + 10]) { p.line(x, 34, x - (x - cx) * 0.3, 44, "#6b4a2c", 2); p.disc(x - (x - cx) * 0.3, 44, 2, 1.2, "#8a6a3a", null); }
        p.poly([[cx - 14, 26], [cx + 14, 26], [cx + 10, 35], [cx - 10, 35]], "#8a5a2c", null); p.line(cx - 14, 26, cx + 14, 26, "#e2a65a"); p.rect(cx - 13, 27, 26, 2, "#a8743a");
        for (let x = cx - 10; x <= cx + 10; x += 4) p.poly([[x - 1, 34], [x + 1, 34], [x, 30]], "#c98a3a", null);
        p.poly([[cx - 12, 26], [cx + 12, 26], [cx + 9, 16], [cx + 14, 8], [cx + 6, 11], [cx + 3, 1], [cx - 1, 9], [cx - 6, 4], [cx - 6, 12], [cx - 13, 9], [cx - 9, 17]], c.mid, null);
        p.poly([[cx - 8, 26], [cx + 8, 26], [cx + 6, 18], [cx + 2, 8], [cx - 2, 15], [cx - 5, 11], [cx - 6, 19]], accent, null);
        p.poly([[cx - 4, 26], [cx + 4, 26], [cx + 2, 19], [cx, 14], [cx - 2, 19]], "#fff6d0", null);
        p.dither(dark, (x, y) => x > cx + 5 && y > 10 && y < 26 ? 0.4 : 0, c.mid);
        for (let i = 0; i < 5; i++) p.set(cx - 10 + random() * 20, 2 + random() * 10, "#ffd27a");
      } else {
        // The Dusk: the Wise Friend hooded and seated, robed in violet-black, blindfolded, a closed book on its knees, a
        // censer smoking at its feet, a crescent over its head.
        for (let y = 0; y <= 8; y++) for (let x = cx - 4; x <= cx + 4; x++) if (Math.hypot(x - cx, y - 4) <= 4 && Math.hypot(x - cx - 2, y - 3) > 3.4) p.set(x, y, accent);
        const robe = tone("#4a3a66");
        p.poly([[cx, 6], [cx + 11, 18], [cx + 13, 44], [cx - 13, 44], [cx - 11, 18]], robe.mid, null); p.poly([[cx, 6], [cx + 11, 18], [cx + 13, 44], [cx + 3, 44]], robe.dark, null); p.line(cx - 11, 19, cx - 13, 43, robe.hi);
        p.poly([[cx, 6], [cx + 7, 14], [cx, 19], [cx - 7, 14]], shadeHex(color, 0.15), null); p.rect(cx - 6, 13, 12, 2, accent); p.line(cx - 6, 14, cx + 5, 14, shadeHex(accent, -0.3));
        p.rect(cx - 9, 32, 18, 6, shadeHex(color, 0.12)); p.rect(cx - 6, 33, 12, 4, "#2e2440"); p.line(cx - 6, 33, cx + 5, 33, accent); p.set(cx, 35, "#e2c46a");
        for (const x of [-8, -3, 3, 8]) p.line(cx + x, 20, cx + x * 1.3, 31, shadeHex(color, 0.08));
        p.line(cx, 38, cx, 42, "#e2c46a"); p.disc(cx, 42, 2.5, 1.5, accent, null); for (let i = 0; i < 4; i++) p.set(cx - 1 + random() * 3, 36 - i * 2, "#c6bed4");
      }
      p.outline();
    });
    case "stone_head": return pixelArt(key, 34, 30, p => {
      // A great carved head sunk to the chin: a heavy brow, blind eyes, a long nose, lips pressed shut, a crack across one
      // cheek and moss in the hollows; the earth heaped round it.
      const t = tone("#a9a49b");
      p.poly([[5, 26], [4, 12], [8, 4], [17, 1], [26, 4], [30, 12], [29, 26]], t.mid, null);
      p.dither(t.dim, (x, y) => x > 20 ? 0.55 : 0, t.mid); p.dither(t.hi, (x, y) => x < 11 && y < 14 ? 0.45 : 0, t.mid);
      p.rect(8, 11, 18, 2, t.dark); p.line(8, 10, 26, 10, t.hi);
      for (const ex of [11, 22]) { p.disc(ex, 14.5, 3, 1.6, t.dim, null); p.line(ex - 2, 14, ex + 2, 14, t.dark); }
      p.poly([[16, 13], [18, 13], [19, 20], [15, 20]], t.lit, null); p.line(18, 14, 19, 20, t.dark); p.line(15, 20, 19, 20, t.dark);
      p.line(13, 23, 21, 23, t.dark); p.line(14, 24, 20, 24, t.dim);
      p.line(24, 16, 27, 22, "#5f5a54"); p.line(27, 22, 26, 25, "#5f5a54");
      for (let i = 0; i < 14; i++) p.set(5 + random() * 24, 2 + random() * 9, random() < 0.6 ? MOSS : shadeHex(MOSS, -0.15));
      p.poly([[0, 29], [4, 24], [12, 26], [22, 25], [30, 24], [34, 29]], "#7a6a52", null); p.dither("#8f9a6a", (x, y) => y < 27 ? 0.5 : 0.2, "#7a6a52");
      p.outline();
    });
    case "crystal": return pixelArt(key, 26, 30, p => {
      // A cluster of pale mineral: hexagonal shards leaning out of the rock, each with a lit face and a cold dark one, a
      // light inside them, glints at the tips.
      p.poly([[2, 29], [5, 24], [21, 23], [25, 29]], "#8a857d", null); p.dither("#6f6b64", (x, y) => x > 15 ? 0.5 : 0.1, "#8a857d");
      const shard = (x: number, base: number, top: number, w: number, lean: number, c: string) => {
        const t2 = tone(c), tip = [x + lean, top] as const;
        p.poly([[x - w, base], [x - w + lean, top + 4], tip, [x + lean, base]], t2.hi, null); p.poly([[x + lean, base], tip, [x + w + lean, top + 4], [x + w, base]], t2.dim, null);
        p.line(x + lean, base - 1, tip[0], tip[1] + 1, t2.lit); p.set(tip[0], tip[1], "#ffffff"); p.set(tip[0] - 1, tip[1] + 2, "#ffffff");
      };
      shard(8, 26, 8, 3, -2, "#cfe4ee"); shard(15, 27, 1, 4, 1, "#e6f4fa"); shard(20, 26, 11, 3, 3, "#bcd2e0"); shard(11, 27, 15, 2, -1, "#d8eaf2");
      p.dither("#ffffff", (x, y) => y > 6 && y < 22 && x > 12 && x < 18 ? 0.2 : 0);
      p.outline();
    });
    case "palm": return pixelArt(key, 36, 38, p => {
      // A palm: a curving ringed trunk, a crown of long arched fronds with their ribs, coconuts under it.
      p.polyline([[17, 37], [19, 28], [19, 19], [17, 11]], "#9c8065", 4); p.polyline([[16, 37], [18, 28], [18, 19], [16, 11]], "#b89c80", 1);
      for (let y = 14; y < 37; y += 3) p.line(16, y, 20, y - 1, "#6f5a46");
      const fronds = 8;
      for (let i = 0; i < fronds; i++) {
        const a = i / fronds * Math.PI * 2 + 0.2, len = 13 + (i % 2) * 3, tx = 17 + Math.cos(a) * len, ty = 11 + Math.sin(a) * len * 0.45 + 5, mx = 17 + Math.cos(a) * len * 0.55, my = 11 + Math.sin(a) * len * 0.2 - 2;
        p.polyline([[17, 10], [mx, my], [tx, ty]], i % 2 ? "#7f9a5e" : "#94ad70", 2);
        for (let k = 1; k <= 4; k++) { const f = k / 5, x = 17 + (tx - 17) * f, y = 10 + (ty - 10) * f - Math.sin(f * Math.PI) * 3; p.line(x, y, x + Math.sin(a) * 2, y + 2, "#6f8a50"); }
      }
      for (const [x, y] of [[15, 12], [19, 12], [17, 13]] as const) p.disc(x, y, 1.6, 1.6, "#7a5a40", null);
      p.outline();
    });
    case "pine": return pixelArt(key, 26, 40, p => {
      // A snowy pine: four tiers of dark needles, each lit on its left, snow lying along every tier, a straight trunk.
      p.rect(12, 32, 3, 7, "#6f5040"); p.line(12, 33, 12, 38, "#8a6a50");
      for (let i = 0; i < 4; i++) {
        const top = 2 + i * 8, base = top + 12, half = 4 + i * 2.6;
        p.poly([[13, top], [13 + half, base], [13 - half, base]], "#5f7a62", null);
        p.poly([[13, top], [13 - half, base], [13 - half * 0.2, base]], "#759278", null);
        p.line(13 - half, base, 13 + half, base, "#f3f2ee"); p.line(13 - half * 0.6, base - 1, 13 + half * 0.2, base - 1, "#f3f2ee");
      }
      p.poly([[13, 1], [15, 4], [11, 4]], "#ffffff", null);
      p.dither("#4a6450", (x, y) => x > 14 ? 0.35 : 0, "#5f7a62");
      p.outline();
    });
    case "banner_diamond": case "banner_ink": case "banner_sol": case "banner_hood": case "banner_ember": case "banner_dusk": case "banner_fff": case "banner_rrr": case "banner_hollowmere": return pixelArt(key, 18, 38, p => {
      // A standard: a dark pole with a gilt finial, a crossbar, the cloth hanging in folds (lit, shaded) to a fringed
      // swallowtail, the device in the middle.
      const order = kind.startsWith("banner_") && kind.slice(7) in ORDERS ? ORDERS[kind.slice(7) as keyof typeof ORDERS] : null;
      const field = order?.color ?? (kind === "banner_fff" ? "#2f7d68" : kind === "banner_rrr" ? "#3b2a52" : "#8a2f2b"), mark = order?.accent ?? (kind === "banner_fff" ? "#d9a93f" : kind === "banner_rrr" ? "#d8d6e4" : "#e2c46a");
      const dark = order?.dark ?? shadeHex(field, -0.3), t = tone(field);
      p.rect(2, 3, 2, 34, "#3b3330"); p.line(2, 3, 2, 36, "#5a504a"); p.rect(1, 0, 4, 3, BRASS); p.set(2, 0, "#fff0b0");
      p.rect(3, 5, 14, 1, "#3b3330");
      p.poly([[4, 6], [16, 6], [16, 28], [13, 25], [10, 29], [7, 25], [4, 28]], t.mid, null);
      for (const x of [7, 10, 13]) { p.line(x, 6, x, 25, t.lit); p.line(x + 1, 6, x + 1, 25, t.dim); }
      p.dither(dark, (x, y) => x > 13 ? 0.4 : 0, t.mid);
      for (const [x, y] of [[4, 28], [7, 25], [10, 29], [13, 25], [16, 28]] as const) p.set(x, y + 1, BRASS);
      const cx = 10, cy = 15;
      if (kind === "banner_diamond") { p.poly([[cx, cy - 6], [cx + 4, cy], [cx, cy + 6], [cx - 4, cy]], mark, null); p.line(cx, cy - 6, cx, cy + 6, shadeHex(mark, -0.2)); }
      else if (kind === "banner_ink") { p.disc(cx, cy - 2, 3.4, 3.4, mark, null); p.set(cx - 1, cy - 2, dark); p.set(cx + 1, cy - 2, dark); for (const x of [cx - 4, cx - 1, cx + 1, cx + 4]) p.line(cx, cy + 1, x, cy + 6, mark); }
      else if (kind === "banner_sol") { const rays = ["#ff5f5f", "#f7f06d", "#4fc3f7", "#9945ff", "#14f195", "#ffb347", "#ff7ad9", "#ffffff"]; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.line(cx + Math.cos(a) * 3, cy + Math.sin(a) * 3, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, rays[i]); } p.disc(cx, cy, 2.6, 2.6, mark, null); }
      else if (kind === "banner_hood") { p.poly([[cx, cy - 6], [cx + 4, cy - 1], [cx + 4, cy + 6], [cx - 4, cy + 6], [cx - 4, cy - 1]], mark, null); p.rect(cx - 2, cy - 1, 4, 4, dark); p.set(cx - 1, cy + 1, field); p.set(cx + 1, cy + 1, field); }
      else if (kind === "banner_ember") { p.poly([[cx - 3, cy + 6], [cx + 3, cy + 6], [cx + 4, cy + 1], [cx + 1, cy - 2], [cx, cy - 7], [cx - 1, cy - 2], [cx - 4, cy + 1]], mark, null); p.poly([[cx - 1, cy + 6], [cx + 1, cy + 6], [cx, cy + 1]], "#ffffff", null); }
      else if (kind === "banner_dusk") { p.line(cx - 4, cy, cx + 4, cy, mark); p.line(cx - 4, cy, cx, cy + 3, mark); p.line(cx, cy + 3, cx + 4, cy, mark); for (const x of [cx - 3, cx, cx + 3]) p.set(x, cy + 5, mark); }
      else if (kind === "banner_fff") { for (const x of [5, 9, 13]) { p.rect(x, cy - 5, 2, 9, mark); p.rect(x, cy - 5, 3, 2, mark); p.rect(x, cy - 1, 3, 1, mark); } }
      else if (kind === "banner_rrr") { p.disc(cx, cy, 5, 3, mark, null); p.line(cx - 5, cy, cx + 5, cy, field); p.set(cx, cy - 2, field); p.set(cx, cy - 3, field); }
      else { p.rect(cx - 4, cy - 2, 9, 6, mark); for (const x of [cx - 4, cx, cx + 4]) { p.set(x, cy - 3, mark); p.set(x, cy - 4, mark); } p.set(cx - 2, cy + 1, "#c95a52"); p.set(cx + 2, cy + 1, "#4f6fb0"); }
      p.outline();
    });
    // ---------- The Federation's engines, the watch, the old works ----------
    case "cannon": return pixelArt(key, 38, 26, p => {
      // The magical cannon: a copper barrel banded in brass on a wheeled carriage, a verdigris crystal glowing in its breech.
      const cu = tone("#b87333");
      for (const x of [9, 27]) { p.disc(x, 20, 5, 5, OAK, INK); p.disc(x, 20, 3.4, 3.4, "#5a4030", null); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; p.line(x, 20, x + Math.cos(a) * 4, 20 + Math.sin(a) * 4, WOOD_LIGHT); } p.set(x, 20, BRASS); }
      p.poly([[4, 16], [32, 16], [29, 11], [7, 11]], "#7a5236", null); p.line(7, 11, 29, 11, "#9c6a46");
      p.poly([[2, 11], [33, 4], [36, 8], [5, 15]], cu.mid, null); p.line(3, 11, 33, 5, cu.hi); p.line(5, 14, 35, 8, cu.dark);
      for (const k of [0.3, 0.55, 0.8]) { const x = 3 + k * 31, y = 11 - k * 7; p.line(x, y, x + 1, y + 4, BRASS); }
      p.disc(36, 6, 1.6, 2.2, "#2a1a10", null);
      p.disc(6, 12, 2.6, 2.6, "#4fa58a", INK); p.set(5, 11, "#d8fff0"); p.dither("#8af0c8", (x, y) => Math.hypot(x - 6, y - 12) < 5 && Math.hypot(x - 6, y - 12) > 3 ? 0.2 : 0);
      p.outline();
    });
    case "device": return pixelArt(key, 20, 28, p => {
      // A Federation device: a brass box of gears and dials on short legs, a glass bulb on top that is on.
      for (const x of [4, 15]) p.rect(x, 24, 2, 3, "#5a4030");
      p.rect(2, 11, 16, 13, "#8a5a3c"); p.rect(3, 12, 14, 11, "#b87333"); p.line(3, 12, 16, 12, "#d9a06a"); p.line(16, 13, 16, 22, "#7a4a2c");
      for (const [x, y, r] of [[7, 16, 2.6], [13, 15, 1.8], [10, 20, 2]] as const) { p.disc(x, y, r, r, "#d9a93f", INK); p.set(x, y, "#8a5a3c"); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.set(x + Math.cos(a) * (r + 0.6), y + Math.sin(a) * (r + 0.6), "#b88a2a"); } }
      p.rect(13, 19, 3, 3, "#2a2a2a"); p.set(14, 20, "#7fe0b0");
      p.rect(8, 6, 4, 5, "#4fa58a"); p.disc(10, 5, 4, 4, "#bfe8d8", INK); p.disc(10, 5, 2, 2, "#ffffff", null); p.set(9, 3, "#ffffff");
      p.rect(15, 2, 1, 9, "#4a3a2c"); p.set(15, 1, "#ff6a5a");
      p.outline();
    });
    case "watchtower": return pixelArt(key, 30, 60, p => {
      // A timber watchtower: four splayed legs braced with crosses, a ladder up one side, a platform with a railing of
      // planks, a pitched roof of boards, a pennant.
      for (const [x0, x1] of [[4, 8], [26, 22]] as const) { p.line(x0, 59, x1, 22, WOOD, 3); p.line(x0 - 1, 59, x1 - 1, 22, WOOD_LIGHT); }
      for (const [y0, y1] of [[54, 40], [40, 28]] as const) { p.line(6, y0, 22, y1, OAK); p.line(24, y0, 8, y1, OAK); }
      p.line(23, 59, 21, 25, "#cdb9a0"); p.line(26, 59, 24, 25, "#cdb9a0"); for (let y = 27; y < 58; y += 4) p.line(21, y, 25, y, "#cdb9a0");
      planks(p, 2, 19, 26, 4, WOOD, true, random); p.line(2, 19, 27, 19, WOOD_LIGHT);
      planks(p, 3, 12, 24, 7, "#b8946c", false, random); for (let x = 3; x < 27; x += 4) p.rect(x, 10, 2, 3, WOOD);
      p.poly([[0, 11], [30, 11], [15, 1]], "#6f5d4c", null); p.poly([[15, 1], [30, 11], [15, 11]], "#5a4a3c", null); for (let x = 4; x < 27; x += 3) p.line(x, 11, 15, 1, "#7d6a58");
      p.line(15, 1, 15, -1, OAK); p.poly([[16, -1], [22, 1], [16, 3]], "#c95a52", null);
      p.outline();
    });
    case "counterweight": return pixelArt(key, 20, 32, p => {
      // A block of dressed stone hanging in its slot on a chain running up into the dark; Azhurak lines cut round it, a
      // gold boss at their centre.
      for (let y = 0; y < 10; y += 2) { p.rect(9, y, 3, 1, IRON_LIGHT); p.set(8, y + 1, IRON); p.set(12, y + 1, IRON); }
      stoneBlock(p, 2, 10, 16, 20, "#a39e96", random); p.rect(2, 10, 16, 2, "#c3beb6");
      p.line(4, 17, 15, 17, "#2f3f66"); p.line(4, 23, 15, 23, "#2f3f66"); p.line(4, 17, 4, 23, "#2f3f66"); p.line(15, 17, 15, 23, "#2f3f66");
      p.disc(9.5, 20, 1.8, 1.8, "#d9b866", null); p.set(9, 19, "#fff0b0");
      p.outline();
    });
    default: return null;
  }
}
