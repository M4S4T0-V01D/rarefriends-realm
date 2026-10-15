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

// ---------- The Prismwild's towns and villages: the wizards build as they please ----------
/** A house in a teapot the size of a cottage, steam from its spout, a door in its belly (four glazes). */
export function teapotHouseArt(variant: number, frame: number): HTMLCanvasElement {
  const v = ((variant % 4) + 4) % 4, f = ((frame % 4) + 4) % 4, glaze = (["#e47ac4", "#5fc8c0", "#9a72e8", "#ecb45a"] as const)[v];
  return pixelArt(`teapot:${v}:${f}`, 76, 72, p => {
    p.disc(11, 46, 7, 10, glaze, INK); p.disc(11, 46, 4, 7, "#00000000", null);   // the handle, behind the pot
    p.disc(38, 46, 26, 22, glaze, INK, shadeHex(glaze, -0.25));
    p.dither(shadeHex(glaze, 0.35), (x, y) => (Math.hypot(x - 28, y - 36) < 10 ? 0.5 : 0), glaze);
    p.poly([[62, 44], [72, 30], [75, 31], [66, 50]], glaze, INK);                     // the spout
    p.poly([[26, 26], [50, 26], [46, 20], [30, 20]], shadeHex(glaze, -0.15), INK); p.disc(38, 17, 4, 3, "#ecd27a", INK);  // lid and knob
    p.rect(33, 52, 10, 15, "#5a3a2a"); p.disc(38, 52, 5, 4, "#5a3a2a", null); p.set(41, 60, "#ecd27a");   // the door
    for (const [x, y] of [[22, 42], [50, 42]] as const) { p.disc(x, y, 4, 4, "#fff0b0", INK); p.line(x - 3, y, x + 3, y, INK); }
    for (let k = 0; k < 3; k++) { const y = 26 - k * 7 - f * 2, x = 73 + Math.sin(k + f) * 2; p.disc(x, y, 2 + k * 0.6, 2 + k * 0.6, "#f4f4f8", null); }
    p.rect(14, 66, 48, 3, shadeHex(glaze, -0.4));
  });
}
/** A mushroom house: a stem with a door and a round window, under a spotted cap (four caps). */
export function mushroomHouseArt(variant: number): HTMLCanvasElement {
  const v = ((variant % 4) + 4) % 4, cap = (["#c94a5a", "#9a72e8", "#e47ac4", "#5fa8d8"] as const)[v];
  return pixelArt(`mushroomhouse:${v}`, 64, 74, p => {
    p.poly([[18, 73], [20, 34], [44, 34], [46, 73]], "#efe6d6", INK); p.dither("#d8ccb8", (x, y) => (x > 34 && y > 34 ? 0.6 : 0), "#efe6d6");
    p.rect(27, 54, 10, 19, "#7a5a3a"); p.disc(32, 54, 5, 4, "#7a5a3a", null); p.set(35, 63, "#ecd27a");
    p.disc(32, 42, 4, 4, "#fff0b0", INK); p.line(28, 42, 36, 42, INK); p.line(32, 38, 32, 46, INK);
    p.disc(32, 26, 31, 18, cap, INK, shadeHex(cap, -0.25)); p.rect(1, 26, 63, 10, "#00000000");
    p.poly([[1, 28], [63, 28], [58, 36], [6, 36]], shadeHex(cap, -0.3), INK);
    for (const [x, y, r] of [[18, 16, 4], [36, 10, 5], [50, 20, 3], [26, 26, 3], [44, 28, 2]] as const) p.disc(x, y, r, r * 0.8, "#fbf6ee", null);
  });
}
/** A crooked house: three storeys stacked askew, each leaning its own way, a chimney with a kink in it. */
export function crookedHouseArt(variant: number, frame: number): HTMLCanvasElement {
  const v = ((variant % 3) + 3) % 3, f = ((frame % 4) + 4) % 4, wall = (["#d8c8a8", "#c8d8e0", "#e0c8d8"] as const)[v], roof = (["#6a4a8a", "#3a7a7a", "#8a3a5a"] as const)[v];
  return pixelArt(`crooked:${v}:${f}`, 52, 84, p => {
    const storey = (x: number, y: number, w: number, h: number, lean: number) => { p.poly([[x, y + h], [x + w, y + h], [x + w + lean, y], [x + lean, y]], wall, INK); p.rect(x + lean / 2 + 4, y + 5, 5, 6, "#fff0b0"); p.rect(x + lean / 2 + w - 10, y + 5, 5, 6, "#fff0b0"); };
    storey(10, 58, 30, 24, 3); storey(8, 36, 32, 22, -5); storey(14, 16, 26, 20, 6);
    p.rect(22, 70, 7, 12, "#5a3a2a");
    p.poly([[12, 16], [26, 0], [46, 14], [42, 18], [26, 6], [16, 19]], roof, INK);
    p.poly([[36, 8], [38, 2], [42, 3], [41, 10]], "#8a6a5a", INK);
    for (let k = 0; k < 2; k++) p.disc(41 + k * 2 + (f % 2), 0 - k * 3 + f, 1.6, 1.6, "#e8e8f0", null);
  });
}
/** A tower stood on its head: its cone roof in the ground, its foundations at the top, a few stones floating off them. */
export function topsyTowerArt(frame: number): HTMLCanvasElement {
  const f = ((frame % 6) + 6) % 6;
  return pixelArt(`topsy:${f}`, 44, 112, p => {
    p.poly([[22, 111], [8, 86], [36, 86]], "#6a4a8a", INK);                          // the roof, point down
    p.poly([[9, 86], [9, 30], [35, 30], [35, 86]], "#d8d0c8", INK); p.dither("#b8b0a8", (x, y) => (x > 24 && y > 30 && y < 86 ? 0.55 : 0), "#d8d0c8");
    for (const y of [40, 56, 72]) { p.rect(14, y, 5, 7, "#fff0b0"); p.rect(26, y + 4, 5, 7, "#fff0b0"); }
    p.poly([[5, 30], [39, 30], [36, 22], [8, 22]], "#9a948a", INK);                  // the foundations, at the top
    p.rect(19, 22, 6, 4, "#5a3a2a");                                                  // the door, up there
    for (let k = 0; k < 4; k++) { const y = 16 - k * 4 - Math.round(Math.sin((f + k) * 1.05) * 2), x = 10 + k * 7; p.rect(x, y, 4, 3, "#9a948a"); p.set(x, y, "#c8c2b8"); }
  });
}
/** One of the floating market's isles: a hump of rock hanging in the air with a striped stall on it, bobbing (its shadow stays). */
export function floatingIsleArt(variant: number, frame: number): HTMLCanvasElement {
  const v = ((variant % 3) + 3) % 3, f = ((frame % 8) + 8) % 8, stripe = (["#e47ac4", "#5fc8c0", "#ecb45a"] as const)[v], bob = Math.round(Math.sin(f / 8 * Math.PI * 2) * 3);
  return pixelArt(`isle:${v}:${f}`, 56, 96, p => {
    p.disc(28, 92, 16, 3, "#00000033", null);
    const y = 46 + bob;
    p.poly([[6, y], [50, y], [40, y + 14], [30, y + 26], [22, y + 22], [12, y + 12]], "#8a7a6a", INK);
    p.rect(6, y - 3, 44, 4, "#7aa86a");
    p.poly([[10, y - 3], [10, y - 20], [46, y - 20], [46, y - 3]], "#c8a878", INK);
    for (let k = 0; k < 6; k++) p.poly([[10 + k * 6, y - 20], [16 + k * 6, y - 20], [16 + k * 6, y - 27], [10 + k * 6, y - 27]], k % 2 ? "#fbf6ee" : stripe, INK);
    for (const [x, c] of [[16, "#9a72e8"], [24, "#5fc8c0"], [32, "#ecb45a"], [40, "#e47ac4"]] as const) p.rect(x, y - 9, 4, 5, c);
    for (let k = 0; k < 3; k++) p.set(30 + k * 4, y + 26 + ((f + k) % 4) * 2, "#9a948a");
  });
}
/** A candle the height of a lamp post, dripping, its flame never quite still. */
export function giantCandleArt(frame: number): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4;
  return pixelArt(`candle:${f}`, 16, 60, p => {
    p.rect(3, 54, 10, 5, "#9a948a"); p.rect(4, 14, 8, 41, "#f4ecd8"); p.rect(10, 14, 2, 41, "#d8ccb0");
    for (const [x, y, l] of [[4, 14, 9], [7, 14, 5], [11, 14, 12]] as const) p.rect(x, y, 1, l, "#fbf6ee");
    p.outline(INK);
    const h = [7, 9, 6, 8][f]; p.poly([[8, 13], [5, 13 - h * 0.5], [8, 13 - h], [11, 13 - h * 0.5]], "#ecb45a", null); p.poly([[8, 12], [7, 11 - h * 0.3], [8, 10 - h * 0.6], [9, 11 - h * 0.3]], "#fff8d0", null);
  });
}
/** The backwards clock: a tall tower with a clock face whose hands go the wrong way round. */
export function backwardsClockArt(frame: number): HTMLCanvasElement {
  const f = ((frame % 12) + 12) % 12;
  return pixelArt(`bclock:${f}`, 40, 120, p => {
    p.poly([[8, 119], [8, 34], [32, 34], [32, 119]], "#c8bfd8", INK); p.dither("#a89ec0", (x, y) => (x > 21 && y > 34 ? 0.5 : 0), "#c8bfd8");
    p.poly([[4, 34], [20, 2], [36, 34]], "#5a3a8a", INK); p.set(20, 1, "#ecb45a");
    p.disc(20, 50, 10, 10, "#fbf6ee", INK); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; p.set(20 + Math.cos(a) * 8, 50 + Math.sin(a) * 8, INK); }
    const a = -f / 12 * Math.PI * 2 - Math.PI / 2, b = -f / 3 * Math.PI * 2 - Math.PI / 2;
    p.line(20, 50, 20 + Math.cos(a) * 5, 50 + Math.sin(a) * 5, "#2a2a30"); p.line(20, 50, 20 + Math.cos(b) * 8, 50 + Math.sin(b) * 8, "#c94a5a");
    for (const y of [72, 90]) p.rect(17, y, 6, 8, "#fff0b0"); p.rect(16, 106, 8, 13, "#5a3a2a");
  });
}
