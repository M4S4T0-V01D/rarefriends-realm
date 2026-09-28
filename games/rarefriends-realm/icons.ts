/**
 * Pixel-art icons for items, skills, tabs, spells, prayers and orbs, in the Rare Friends style:
 * flat colour, a one-pixel ink edge and a white halo, drawn on small grids and scaled up without smoothing.
 */
import { METALS, type Icon, type Skill } from "./data.ts";
import { INK, Pixels, pixelArt, shadeHex } from "./pixel.ts";

// ---------- Item art: shaded pixel art on a 32-pixel grid ----------
/**
 * Every item is built from parts. Each part is rasterized as a mask, then shaded as a volume lit from the top left:
 * a bright rim on its lit edges, darker dithered bands towards the bottom right, a dark rim on its shadowed edges, a glint
 * on metal and gems, and an ink line where it overlaps an earlier part. The whole item then gets the Rare Friends ink edge
 * and white halo.
 */
const S = 32, MARK = "#ff00ff";
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
type Material = "metal" | "wood" | "cloth" | "gem" | "stone" | "food" | "flat" | "glow";
type Pt = [number, number];
const METAL_COLORS = new Set<string>(METALS.map(metal => metal.color));
const WOOD_C = "#9c7a5c", DARK_WOOD = "#6f5440", GOLD_C = "#d9b866", STEEL_C = "#b9bfc6", PARCH = "#efe3c4", WHITE = "#f7f5f0";
/** Rasterize one part and shade it into the picture. */
function part(p: Pixels, draw: (q: Pixels) => void, color: string, material: Material = "flat", ink = true) {
  const q = new Pixels(S, S); draw(q);
  let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (q.get(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 < 0) return;
  const before = p.data.slice(), w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), inQ = (x: number, y: number) => q.inside(x, y) && q.get(x, y) !== 0;
  const flat = material === "flat" || material === "glow", shiny = material === "metal" || material === "gem";
  const light = shadeHex(color, shiny ? 0.16 : 0.1), lighter = shadeHex(color, shiny ? 0.3 : 0.2), dark = shadeHex(color, -0.12), darker = shadeHex(color, material === "cloth" ? -0.2 : -0.25);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inQ(x, y)) continue;
    const u = (x - x0) / w, v = (y - y0) / h, l = u * 0.45 + v * 0.75, t = BAYER4[y & 3][x & 3] / 16;
    let c = color;
    if (!flat) { if (l > 0.95 + t * 0.2) c = darker; else if (l > 0.64 + t * 0.2) c = dark; else if (l < 0.2 + t * 0.14) c = light; }
    const litEdge = !inQ(x - 1, y) || !inQ(x, y - 1), shadowEdge = !inQ(x + 1, y) || !inQ(x, y + 1);
    if (litEdge && !shadowEdge) c = material === "glow" ? lighter : shiny ? lighter : light;
    else if (shadowEdge && !litEdge && !flat) c = darker;
    if (shiny && !litEdge && !shadowEdge && l > 0.16 && l < 0.3 && t < 0.19) c = "#ffffff";
    p.set(x, y, c);
  }
  if (!ink) return;
  // An ink line where this part overlaps something drawn before it, so the parts read separately.
  const inkValue = (() => { const probe = new Pixels(1, 1); probe.set(0, 0, INK); return probe.data[0]; })();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inQ(x, y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!inQ(nx, ny) && p.inside(nx, ny) && before[ny * S + nx] && before[ny * S + nx] !== inkValue) { p.data[y * S + x] = inkValue; break; }
    }
  }
}
const poly = (points: Pt[]) => (q: Pixels) => q.poly(points, MARK, null);
const disc = (cx: number, cy: number, rx: number, ry = rx) => (q: Pixels) => q.disc(cx, cy, rx, ry, MARK, null);
const stroke = (points: Pt[], width: number) => (q: Pixels) => q.polyline(points, MARK, width);
const box = (x: number, y: number, w: number, h: number) => (q: Pixels) => q.rect(x, y, w, h, MARK);
const all = (...draws: ((q: Pixels) => void)[]) => (q: Pixels) => draws.forEach(draw => draw(q));
const line = (p: Pixels, points: Pt[], color: string, width = 1) => p.polyline(points, color, width);
const dot = (p: Pixels, x: number, y: number, color: string) => p.set(x, y, color);

/** A fish's body facing left: head at (x, y), `len` long and `ht` tall, with a tail; returns where its eye is. */
function fishShape(p: Pixels, x: number, y: number, len: number, ht: number, color: string, tail: "fork" | "round" | "crescent" = "fork", snout = 0) {
  part(p, poly([[x - snout, y], [x + len * 0.18, y - ht * 0.5], [x + len * 0.58, y - ht * 0.56], [x + len * 0.84, y - ht * 0.24], [x + len * 0.84, y + ht * 0.24], [x + len * 0.58, y + ht * 0.5], [x + len * 0.2, y + ht * 0.44]]), color, "food");
  const tx = x + len * 0.8, tailPts: Pt[] = tail === "round" ? [[tx, y], [x + len, y - ht * 0.42], [x + len + 1, y], [x + len, y + ht * 0.42]]
    : tail === "crescent" ? [[tx, y], [x + len + 2, y - ht * 0.8], [x + len - 1, y], [x + len + 2, y + ht * 0.6]] : [[tx, y], [x + len, y - ht * 0.56], [x + len - 2, y], [x + len, y + ht * 0.56]];
  part(p, poly(tailPts), shadeHex(color, -0.08), "food");
  const eye: Pt = [Math.round(x + len * 0.12), Math.round(y - ht * 0.14)];
  dot(p, eye[0], eye[1], INK); dot(p, eye[0] - 1, eye[1], "#ffffff");
  return eye;
}
/** Grill marks across a cooked fish. */
const grill = (p: Pixels, x: number, y: number, len: number, ht: number, accent?: string) => { if (accent) for (let i = 0; i < 3; i++) line(p, [[x + len * (0.28 + i * 0.18), y - ht * 0.4], [x + len * (0.2 + i * 0.18), y + ht * 0.4]], accent); };
/** Each fish its own: minnows in a little school, striped perch, golden scaly carp, red-bellied char, grayling with its tall fin,
 * sailfish with a bill and a sail, a shark's fin and gills for the inkshark, and the inkcrab as a crab. */
function drawFish(p: Pixels, kind: string, color: string, accent?: string) {
  const dark = shadeHex(color, -0.22), light = shadeHex(color, 0.2);
  switch (kind) {
    case "minnows":
      for (const [x, y] of [[3, 12], [14, 21], [16, 8]] as Pt[]) { fishShape(p, x, y, 13, 5, color); line(p, [[x + 3, y], [x + 9, y]], accent ?? dark); }
      break;
    case "perch": {
      part(p, poly([[9, 11], [10, 4], [12, 9], [14, 3], [16, 9], [18, 4], [20, 10]]), accent ? shadeHex(color, -0.1) : "#d9774a", "food");
      fishShape(p, 3, 17, 26, 12, color);
      if (!accent) for (const x of [10, 14, 18, 22]) line(p, [[x, 12], [x - 1, 18]], dark);
      part(p, poly([[12, 22], [15, 27], [17, 22]]), accent ? dark : "#d9774a", "food"); grill(p, 3, 17, 26, 12, accent); break;
    }
    case "carp": {
      fishShape(p, 3, 17, 26, 15, color, "round");
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) { const x = 9 + i * 4 + (row % 2) * 2, y = 13 + row * 4; dot(p, x, y, light); dot(p, x + 1, y + 1, dark); }
      line(p, [[3, 18], [1, 21]], dark); part(p, poly([[13, 10], [17, 5], [21, 10]]), accent ? dark : "#c9773a", "food"); grill(p, 3, 17, 26, 15, accent); break;
    }
    case "char": {
      fishShape(p, 2, 16, 28, 11, color);
      if (!accent) { part(p, poly([[4, 17], [24, 17], [22, 21], [8, 21]]), "#d9533f", "flat", false); line(p, [[5, 17], [23, 17]], "#e8836a"); for (const [x, y] of [[9, 13], [13, 12], [17, 13], [21, 14], [15, 15], [11, 15]] as Pt[]) dot(p, x, y, "#f3e6d0"); }
      grill(p, 2, 16, 28, 11, accent); break;
    }
    case "grayling": {
      part(p, poly([[8, 15], [9, 5], [14, 2], [20, 3], [22, 14]]), accent ? shadeHex(color, -0.12) : "#8a86b8", "cloth");
      for (const x of [11, 14, 17, 20]) line(p, [[x, 14], [x - 1, 4 + Math.abs(x - 15) * 0.3]], shadeHex(accent ? color : "#8a86b8", -0.22));
      if (!accent) for (const [x, y] of [[12, 7], [16, 6], [15, 10], [19, 9]] as Pt[]) dot(p, x, y, "#c98f95");
      fishShape(p, 3, 19, 27, 10, color); if (!accent) line(p, [[8, 20], [24, 20]], light); grill(p, 3, 19, 27, 10, accent); break;
    }
    case "sailfish": {
      part(p, poly([[9, 16], [11, 3], [19, 2], [26, 8], [27, 15]]), accent ? shadeHex(color, -0.12) : "#3d5a8a", "cloth");
      for (const x of [12, 15, 18, 21, 24]) line(p, [[x, 15], [x - 1, 3 + Math.max(0, x - 18) * 0.9]], shadeHex(accent ? color : "#3d5a8a", -0.2));
      if (!accent) for (const [x, y] of [[13, 7], [17, 6], [21, 9], [16, 11]] as Pt[]) dot(p, x, y, "#9fc6f0");
      fishShape(p, 6, 20, 24, 9, color); part(p, stroke([[6, 20], [0, 19]], 2), shadeHex(color, -0.15), "food");
      if (!accent) line(p, [[10, 22], [24, 22]], light); grill(p, 6, 20, 24, 9, accent); break;
    }
    case "inkshark": {
      part(p, poly([[13, 12], [17, 2], [21, 12]]), shadeHex(color, -0.1), "stone");
      fishShape(p, 2, 17, 27, 12, color, "crescent", 1);
      if (!accent) part(p, poly([[4, 19], [22, 19], [18, 22], [8, 22]]), "#e8e4da", "flat", false);
      for (const x of [9, 11, 13]) line(p, [[x, 14], [x - 1, 18]], dark);
      part(p, poly([[12, 21], [16, 28], [19, 21]]), shadeHex(color, -0.12), "stone"); grill(p, 2, 17, 27, 12, accent); break;
    }
    case "inkcrab": {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) line(p, [[16 + side * (6 + i * 2), 21 + i], [16 + side * (11 + i * 2), 24 + i * 2]], dark, 2);
        part(p, stroke([[16 + side * 6, 16], [16 + side * 10, 11]], 2), color, "stone");
        part(p, all(disc(16 + side * 11, 8, 4, 3.2)), color, "stone"); line(p, [[16 + side * 10, 6], [16 + side * 12, 9]], dark);
      }
      part(p, disc(16, 19, 9, 6.5), color, "stone");
      for (const side of [-1, 1]) { line(p, [[16 + side * 2, 14], [16 + side * 3, 10]], dark); dot(p, 16 + side * 3, 9, INK); }
      line(p, [[11, 18], [21, 18]], light); if (!accent) dot(p, 14, 21, "#c6bed4"); break;
    }
    default: fishShape(p, 3, 16, 26, 12, color); grill(p, 3, 16, 26, 12, accent);
  }
}
/** Bones: a big knobbly thigh bone crossed with a smaller one, ink-stained bones with violet drips, a curved dragon rib. */
function drawBones(p: Pixels, kind: string, color: string, accent?: string) {
  if (kind === "large") {
    part(p, all(stroke([[9, 8], [23, 22]], 3), disc(7, 7, 2.6), disc(10, 5, 2.6), disc(25, 21, 2.6), disc(22, 24, 2.6)), shadeHex(color, -0.08), "stone");
    part(p, all(stroke([[7, 25], [25, 8]], 6), disc(4, 23, 4.6), disc(9, 29, 4.6), disc(23, 4, 4.6), disc(28, 10, 4.6)), color, "stone");
    line(p, [[11, 20], [19, 12]], shadeHex(color, 0.12)); return;
  }
  if (kind === "dragon") {
    part(p, stroke([[5, 28], [8, 20], [13, 13], [20, 8], [28, 5]], 6), color, "stone");
    part(p, stroke([[20, 8], [28, 5]], 3), accent ?? shadeHex(color, -0.3), "stone");
    for (const [a, b] of [[[8, 21], [11, 23]], [[12, 15], [15, 17]], [[17, 10], [19, 13]]] as [Pt, Pt][]) line(p, [a, b], shadeHex(color, -0.25));
    part(p, disc(5, 28, 3.5), shadeHex(color, 0.05), "stone"); return;
  }
  // Ink bones.
  part(p, all(stroke([[8, 24], [24, 8]], 4), disc(6, 22, 3.5), disc(10, 26, 3.5), disc(22, 6, 3.5), disc(26, 10, 3.5)), color, "stone");
  for (const [x, y] of [[13, 21], [18, 16], [21, 12]] as Pt[]) { dot(p, x, y, accent ?? "#8a62c8"); dot(p, x, y + 1, accent ?? "#8a62c8"); }
  dot(p, 17, 22, accent ?? "#8a62c8"); dot(p, 17, 23, shadeHex(accent ?? "#8a62c8", -0.2));
}
/** Ore: a chunk of rock with that metal's own look: dull pewter blobs, dark blackiron with rust, glossy inkcoal lumps, silver
 * moonsilver veins, glimmer crystals, rose rarite crystals, soft clay. */
function drawOre(p: Pixels, kind: string, color: string) {
  const rock = (c: string) => part(p, poly([[4, 23], [6, 12], [14, 5], [24, 7], [29, 17], [25, 27], [12, 29]]), c, "stone");
  switch (kind) {
    case "pewter": rock("#8f8a84"); for (const [cx, cy, r] of [[12, 15, 3.5], [20, 21, 3.8], [21, 11, 2.6], [11, 23, 2.2]] as [number, number, number][]) part(p, disc(cx, cy, r), color, "metal"); break;
    case "blackiron":
      rock("#6d6b67");
      for (const pts of [[[9, 12], [14, 9], [16, 15], [11, 17]], [[17, 18], [23, 16], [24, 22], [18, 24]], [[18, 9], [22, 10], [21, 13]]] as Pt[][]) part(p, poly(pts), "#3b3a38", "metal");
      line(p, [[8, 20], [12, 22]], color); line(p, [[20, 13], [25, 14]], color); dot(p, 15, 25, color); break;
    case "inkcoal":
      for (const [cx, cy, rx, ry] of [[11, 20, 7, 6], [21, 21, 7, 5.5], [16, 12, 6.5, 5.5]] as [number, number, number, number][]) part(p, disc(cx, cy, rx, ry), "#2e2d2c", "metal");
      for (const [x, y] of [[9, 18], [19, 19], [14, 10]] as Pt[]) dot(p, x, y, "#7d8894"); break;
    case "moonsilver":
      rock("#a9a59e");
      part(p, all(stroke([[7, 21], [12, 16], [17, 17], [24, 11]], 2), stroke([[13, 24], [18, 21], [25, 22]], 2), stroke([[12, 9], [16, 12]], 2)), color, "metal");
      for (const [x, y] of [[12, 16], [24, 11], [18, 21]] as Pt[]) dot(p, x, y, "#ffffff"); break;
    case "glimmer":
      rock("#8f8a84");
      for (const pts of [[[10, 20], [12, 8], [15, 19]], [[15, 20], [19, 5], [22, 18]], [[20, 22], [26, 13], [25, 23]]] as Pt[][]) part(p, poly(pts), color, "glow");
      for (const [x, y] of [[12, 10], [19, 7], [25, 14]] as Pt[]) dot(p, x, y, "#ffffff"); break;
    case "rarite":
      rock("#8f8a84");
      for (const pts of [[[8, 22], [9, 12], [13, 9], [15, 20]], [[14, 22], [16, 7], [21, 5], [22, 20]], [[21, 24], [24, 14], [27, 16], [26, 24]]] as Pt[][]) part(p, poly(pts), color, "gem");
      break;
    case "clay":
      part(p, poly([[5, 22], [7, 14], [14, 9], [23, 10], [28, 17], [25, 25], [13, 27]]), color, "food");
      for (let i = 0; i < 3; i++) line(p, [[10 + i * 4, 14 + i], [16 + i * 4, 18 + i]], shadeHex(color, -0.12)); break;
    default: rock("#8f8a84"); part(p, disc(16, 17, 4), color, "metal");
  }
}
export function itemArt(icon: Icon): HTMLCanvasElement {
  return pixelArt(`item3:${icon.shape}:${icon.kind ?? ""}:${icon.color}:${icon.accent ?? ""}`, S, S, p => {
    const color = icon.color, accent = icon.accent, metal = METAL_COLORS.has(color) || color === STEEL_C;
    const armour: Material = metal ? "metal" : "cloth", dark = shadeHex(color, -0.28), light = shadeHex(color, 0.22);
    switch (icon.shape) {
      case "coins":
        for (const [cx, cy] of [[11, 23], [21, 20], [15, 14]] as Pt[]) { part(p, disc(cx, cy, 8, 4.5), color, "metal"); line(p, [[cx - 4, cy], [cx + 4, cy]], shadeHex(color, -0.2)); }
        break;
      case "axe":
        part(p, stroke([[8, 29], [21, 5]], 3), WOOD_C, "wood"); line(p, [[10, 25], [12, 22]], DARK_WOOD);
        part(p, poly([[14, 5], [23, 2], [29, 7], [28, 18], [22, 15], [17, 11]]), color, "metal");
        line(p, [[28, 7], [27, 16]], shadeHex(color, 0.32)); break;
      case "pickaxe":
        part(p, stroke([[9, 30], [19, 8]], 3), WOOD_C, "wood");
        part(p, poly([[2, 13], [8, 7], [17, 4], [26, 6], [31, 12], [24, 9], [17, 8], [9, 10]]), color, "metal"); break;
      case "sword":
        part(p, all(stroke([[9, 23], [26, 6]], 4), poly([[25, 3], [29, 3], [29, 7]])), color, "metal");
        line(p, [[11, 21], [25, 7]], shadeHex(color, -0.18));
        part(p, stroke([[5, 18], [14, 27]], 3), GOLD_C, "metal");
        part(p, stroke([[4, 28], [8, 24]], 3), DARK_WOOD, "wood"); part(p, disc(3.5, 29.5, 2), GOLD_C, "metal"); break;
      case "dagger":
        part(p, all(stroke([[12, 21], [23, 10]], 4), poly([[22, 7], [26, 6], [25, 10]])), color, "metal");
        line(p, [[14, 19], [22, 11]], shadeHex(color, -0.18));
        part(p, stroke([[8, 17], [15, 24]], 3), GOLD_C, "metal"); part(p, stroke([[6, 27], [10, 23]], 3), DARK_WOOD, "wood"); break;
      case "sabre":
        part(p, all(stroke([[9, 24], [13, 15], [19, 9], [28, 5]], 4), poly([[27, 3], [30, 4], [28, 7]])), color, "metal");
        line(p, [[11, 21], [14, 15], [20, 10], [26, 7]], shadeHex(color, 0.28));
        part(p, all(stroke([[5, 20], [9, 26]], 3), stroke([[9, 26], [13, 26]], 2)), GOLD_C, "metal"); part(p, stroke([[4, 29], [8, 25]], 3), DARK_WOOD, "wood"); break;
      case "helm":
        part(p, poly([[6, 27], [6, 14], [9, 8], [16, 4], [23, 8], [26, 14], [26, 27], [20, 27], [20, 21], [12, 21], [12, 27]]), color, armour);
        part(p, box(9, 15, 14, 3), INK, "flat", false);
        if (accent) part(p, stroke([[16, 2], [16, 9]], 3), accent, "cloth"); else line(p, [[16, 5], [16, 13]], light);
        if (metal) { dot(p, 8, 23, light); dot(p, 24, 23, light); }
        break;
      case "hood":
        part(p, poly([[5, 29], [6, 13], [10, 7], [16, 3], [22, 7], [26, 13], [27, 29], [16, 25]]), color, "cloth");
        part(p, disc(16, 17, 5.5, 6), "#2e2c2a", "flat");
        line(p, [[9, 27], [14, 24]], dark); line(p, [[23, 27], [18, 24]], dark); break;
      case "hat":
        part(p, disc(16, 25, 13, 4), color, "cloth");
        part(p, poly([[8, 25], [24, 25], [20, 14], [22, 4], [16, 8], [13, 14]]), color, "cloth");
        line(p, [[9, 23], [23, 23]], accent ?? GOLD_C, 2); dot(p, 15, 16, GOLD_C); dot(p, 18, 12, GOLD_C); break;
      case "crown":
        part(p, all(box(5, 18, 22, 9), poly([[5, 19], [5, 8], [10, 14]]), poly([[10, 18], [16, 5], [22, 18]]), poly([[22, 14], [27, 8], [27, 19]])), color, "metal");
        part(p, disc(16, 22, 2.5), accent ?? "#cf6e6e", "gem"); part(p, disc(9, 22, 1.8), "#8fa3c9", "gem"); part(p, disc(23, 22, 1.8), "#8fbf9a", "gem"); break;
      case "body":
        part(p, poly([[9, 5], [23, 5], [29, 11], [27, 18], [23, 16], [23, 29], [9, 29], [9, 16], [5, 18], [3, 11]]), color, armour);
        part(p, poly([[12, 5], [20, 5], [16, 10]]), "#2e2c2a", "flat", false);
        line(p, [[16, 11], [16, 27]], dark); line(p, [[9, 16], [23, 16]], dark);
        if (metal) { for (const [x, y] of [[11, 13], [21, 13], [11, 25], [21, 25]] as Pt[]) dot(p, x, y, light); }
        else line(p, [[10, 20], [22, 20]], dark);
        if (accent) line(p, [[10, 28], [22, 28]], accent, 2);
        break;
      case "legs":
        part(p, poly([[8, 4], [24, 4], [26, 29], [18, 29], [16, 13], [14, 29], [6, 29]]), color, armour);
        part(p, box(8, 4, 16, 3), shadeHex(color, -0.2), "flat"); line(p, [[16, 8], [16, 13]], dark);
        if (metal) { part(p, disc(10, 18, 2.5), color, "metal"); part(p, disc(22, 18, 2.5), color, "metal"); } break;
      case "shield":
        part(p, poly([[5, 4], [27, 4], [27, 16], [16, 30], [5, 16]]), color, metal ? "metal" : "wood");
        part(p, all(box(14, 5, 4, 22), box(6, 11, 20, 4)), accent ?? shadeHex(color, -0.22), "flat");
        part(p, disc(16, 13, 3), metal ? shadeHex(color, 0.2) : STEEL_C, "metal"); break;
      case "boots":
        part(p, poly([[7, 7], [16, 7], [16, 19], [27, 20], [28, 27], [7, 27]]), color, armour);
        part(p, box(6, 26, 23, 3), shadeHex(color, -0.35), "flat"); line(p, [[7, 11], [16, 11]], dark); break;
      case "gloves":
        part(p, poly([[8, 29], [7, 14], [9, 9], [12, 12], [13, 5], [16, 5], [17, 11], [19, 5], [22, 6], [22, 12], [25, 9], [27, 11], [25, 20], [24, 29]]), color, armour);
        part(p, box(8, 24, 16, 5), shadeHex(color, -0.15), armour); break;
      case "bracer":
        part(p, poly([[8, 6], [24, 8], [23, 28], [9, 26]]), color, armour);
        for (const y of [12, 18, 23]) line(p, [[9, y], [23, y + 1]], shadeHex(color, -0.3), 2); break;
      case "cape":
        part(p, poly([[10, 3], [22, 3], [29, 28], [22, 26], [16, 29], [10, 26], [3, 28]]), color, "cloth");
        line(p, [[13, 6], [9, 25]], dark); line(p, [[19, 6], [23, 25]], dark); line(p, [[16, 6], [16, 27]], dark);
        part(p, box(9, 3, 14, 3), shadeHex(color, 0.12), "cloth");
        if (accent) { line(p, [[4, 27], [10, 25], [16, 28], [22, 25], [28, 27]], accent, 2); part(p, disc(16, 15, 3), accent, "metal"); }
        break;
      case "amulet":
        line(p, [[8, 4], [8, 11], [12, 16], [16, 18], [20, 16], [24, 11], [24, 4]], GOLD_C, 1);
        part(p, disc(16, 23, 6, 6.5), GOLD_C, "metal"); part(p, disc(16, 23, 4, 4.5), color, "gem"); break;
      case "log":
        part(p, poly([[7, 11], [24, 5], [30, 11], [28, 20], [9, 26]]), color, "wood");
        for (const [a, b] of [[[12, 13], [25, 9]], [[13, 18], [27, 14]], [[14, 22], [26, 19]]] as [Pt, Pt][]) line(p, [a, b], shadeHex(color, -0.22));
        part(p, disc(8.5, 18.5, 5.5, 8), "#e8d4b8", "wood"); part(p, disc(8.5, 18.5, 3, 4.5), "#d4b890", "flat", false); dot(p, 8, 18, "#9c7a5c"); break;
      case "fish":
        if (icon.kind) { drawFish(p, icon.kind, color, accent); break; }
        part(p, poly([[2, 16], [7, 10], [15, 8], [23, 11], [26, 16], [23, 21], [15, 24], [7, 22]]), color, "food");
        part(p, poly([[23, 16], [31, 9], [29, 16], [31, 23]]), shadeHex(color, -0.08), "food");
        part(p, poly([[12, 9], [16, 4], [19, 9]]), shadeHex(color, -0.12), "food");
        dot(p, 7, 14, INK); dot(p, 6, 14, "#ffffff"); line(p, [[10, 12], [10, 20]], dark);
        for (const [x, y] of [[14, 14], [18, 14], [16, 18], [20, 18]] as Pt[]) dot(p, x, y, shadeHex(color, 0.18)); break;
      case "ore":
        if (icon.kind) { drawOre(p, icon.kind, color); break; }
        part(p, poly([[4, 23], [6, 12], [14, 5], [24, 7], [29, 17], [25, 27], [12, 29]]), "#8f8a84", "stone");
        for (const [cx, cy, r] of [[12, 15, 3.5], [20, 21, 3.8], [21, 11, 2.6], [11, 23, 2.2]] as [number, number, number][]) part(p, disc(cx, cy, r), color, "metal"); break;
      case "bar":
        part(p, poly([[3, 17], [10, 10], [29, 10], [22, 17]]), shadeHex(color, 0.14), "metal");
        part(p, poly([[3, 17], [22, 17], [22, 25], [3, 25]]), color, "metal");
        part(p, poly([[22, 17], [29, 10], [29, 18], [22, 25]]), shadeHex(color, -0.14), "metal");
        line(p, [[7, 21], [18, 21]], shadeHex(color, -0.25)); break;
      case "bones":
        if (icon.kind && icon.kind !== "small") { drawBones(p, icon.kind, color, accent); break; }
        part(p, all(stroke([[8, 24], [24, 8]], 4), disc(6, 22, 3.5), disc(10, 26, 3.5), disc(22, 6, 3.5), disc(26, 10, 3.5)), color, "stone");
        if (accent) line(p, [[12, 20], [20, 12]], accent); break;
      case "sigil":
        part(p, poly([[7, 7], [16, 3], [25, 7], [26, 23], [16, 29], [6, 23]]), "#c8c5be", "stone");
        part(p, disc(16, 16, 6), color, "glow"); part(p, disc(16, 16, 2.5), shadeHex(color, 0.3), "flat", false);
        line(p, [[9, 9], [12, 8]], "#e8e6e0"); break;
      case "staff":
        part(p, stroke([[5, 30], [22, 9]], 3), WOOD_C, "wood"); line(p, [[9, 25], [11, 23]], DARK_WOOD); line(p, [[14, 19], [16, 17]], DARK_WOOD);
        part(p, all(stroke([[20, 10], [19, 5]], 2), stroke([[21, 9], [27, 7]], 2)), DARK_WOOD, "wood");
        part(p, disc(24, 6, 4.5), accent ?? color, "gem"); break;
      case "net":
        for (let i = 0; i < 5; i++) { line(p, [[7 + i * 4, 5], [7 + i * 4, 24]], "#6d6b67"); line(p, [[5, 7 + i * 4], [25, 7 + i * 4]], "#6d6b67"); }
        part(p, stroke([[2, 30], [8, 24]], 3), WOOD_C, "wood"); part(p, stroke([[5, 5], [25, 5], [25, 25], [5, 25], [5, 5]], 2), "#8a7563", "wood"); break;
      case "rod":
        part(p, stroke([[4, 30], [27, 3]], 3), color, "wood"); part(p, disc(9, 24, 3), STEEL_C, "metal");
        line(p, [[27, 3], [29, 21]], "#4a4846"); part(p, disc(29, 23, 1.8), "#cf6e6e", "flat"); break;
      case "harpoon":
        part(p, stroke([[4, 30], [22, 9]], 3), WOOD_C, "wood");
        part(p, all(poly([[20, 8], [29, 2], [25, 12]]), stroke([[21, 11], [18, 7]], 2)), color, "metal"); break;
      case "pot":
        part(p, poly([[7, 12], [25, 12], [28, 20], [23, 28], [9, 28], [4, 20]]), color, "stone");
        part(p, disc(16, 12, 9.5, 3), shadeHex(color, 0.1), "stone"); part(p, disc(16, 12, 7, 1.8), "#3b3a38", "flat", false); break;
      case "bucket": case "milk":
        part(p, poly([[6, 12], [26, 12], [23, 28], [9, 28]]), icon.shape === "milk" ? WOOD_C : color, "wood");
        line(p, [[7, 17], [25, 17]], DARK_WOOD, 2); line(p, [[8, 24], [24, 24]], DARK_WOOD, 2);
        line(p, [[6, 12], [9, 4], [23, 4], [26, 12]], "#6d6b67");
        if (icon.shape === "milk") part(p, disc(16, 12, 9.5, 2.5), WHITE, "flat"); break;
      case "flour":
        part(p, poly([[7, 13], [25, 13], [28, 21], [23, 29], [9, 29], [4, 21]]), "#b89c86", "stone");
        part(p, disc(16, 12, 9, 4.5), color, "food"); break;
      case "egg": part(p, disc(16, 17, 8, 10.5), color, "food"); dot(p, 13, 11, "#ffffff"); dot(p, 12, 12, "#ffffff"); break;
      case "wheat":
        for (let i = -1; i <= 1; i++) { line(p, [[16 + i * 3, 30], [16 + i * 6, 9]], "#9c8a5c"); part(p, disc(16 + i * 6, 9, 3, 6.5), color, "food"); }
        break;
      case "tinderbox":
        part(p, box(5, 11, 22, 15), color, "wood"); part(p, box(5, 9, 22, 4), shadeHex(color, 0.12), "wood");
        part(p, disc(21, 18, 3), "#e3a58c", "glow"); part(p, box(9, 16, 6, 5), "#6d6b67", "stone"); break;
      case "hammer":
        part(p, stroke([[8, 30], [18, 11]], 3), WOOD_C, "wood");
        part(p, poly([[9, 5], [26, 9], [24, 17], [7, 13]]), color, "metal"); break;
      case "knife":
        part(p, stroke([[5, 28], [13, 20]], 4), DARK_WOOD, "wood");
        part(p, poly([[13, 18], [28, 4], [26, 11], [17, 23]]), color, "metal"); line(p, [[16, 20], [27, 6]], shadeHex(color, 0.3)); break;
      case "needle": line(p, [[6, 27], [25, 6]], "#6d6b67", 2); line(p, [[7, 26], [25, 7]], color); part(p, disc(24, 7, 2), WHITE, "flat"); break;
      case "thread":
        part(p, box(8, 7, 16, 3), WOOD_C, "wood"); part(p, box(8, 23, 16, 3), WOOD_C, "wood"); part(p, box(10, 10, 12, 13), color, "cloth");
        for (const y of [13, 16, 19]) line(p, [[10, y], [21, y + 1]], shadeHex(color, -0.15)); break;
      case "chisel":
        part(p, stroke([[6, 28], [16, 18]], 4), WOOD_C, "wood"); part(p, poly([[15, 16], [26, 5], [29, 8], [18, 19]]), color, "metal"); break;
      case "gem":
        part(p, poly([[6, 12], [11, 6], [21, 6], [26, 12], [16, 28]]), color, "gem");
        line(p, [[6, 12], [26, 12]], shadeHex(color, -0.25)); line(p, [[11, 7], [14, 12], [16, 27]], shadeHex(color, 0.25)); line(p, [[21, 7], [18, 12], [16, 27]], shadeHex(color, -0.18));
        if (accent) { for (const [x, y] of [[9, 20], [23, 19], [16, 4]] as Pt[]) dot(p, x, y, accent); }
        break;
      case "hide":
        part(p, poly([[4, 9], [12, 5], [22, 6], [28, 13], [26, 26], [13, 29], [4, 21]]), color, "cloth");
        part(p, disc(12, 15, 3.5, 3), accent ?? dark, "flat", false); part(p, disc(20, 21, 3, 2.5), accent ?? dark, "flat", false); break;
      case "leather":
        part(p, poly([[5, 9], [26, 6], [27, 25], [6, 27]]), color, "cloth"); line(p, [[8, 12], [24, 9]], dark);
        for (let x = 8; x < 25; x += 3) dot(p, x, 23 - Math.round((x - 8) * 0.1), light); break;
      case "drumstick": {
        // A drumstick: a meaty teardrop on a bone with a two-knob end; cooked, it's golden with a crispy skin and grill marks.
        part(p, stroke([[6, 27], [13, 20]], 3), WHITE, "stone"); part(p, all(disc(4, 27, 2.4), disc(7, 30, 2.4)), WHITE, "stone");
        part(p, poly([[11, 22], [11, 13], [16, 6], [24, 3], [29, 8], [28, 16], [22, 22], [15, 24]]), color, "food");
        if (accent) { for (const [a, b] of [[[14, 11], [24, 21]], [[18, 7], [27, 16]]] as [Pt, Pt][]) line(p, [a, b], accent); for (const [x, y] of [[21, 9], [15, 17], [25, 12]] as Pt[]) dot(p, x, y, shadeHex(color, 0.25)); }
        else for (const [x, y] of [[19, 8], [23, 11], [16, 15], [21, 16], [25, 7]] as Pt[]) dot(p, x, y, shadeHex(color, 0.12));
        break;
      }
      case "steak": {
        // A steak: a thick slab with a rim of fat along its edge and marbling; cooked, it's browned with a grill cross-hatch.
        part(p, poly([[4, 13], [10, 6], [20, 4], [28, 9], [29, 18], [24, 25], [13, 27], [5, 22]]), color, "food");
        line(p, [[5, 14], [10, 7], [20, 5], [27, 10]], accent ? "#e2c48a" : "#f3e6d0", 3);
        if (accent) { for (let i = 0; i < 3; i++) line(p, [[9 + i * 6, 12], [15 + i * 6, 24]], accent); for (let i = 0; i < 2; i++) line(p, [[8, 16 + i * 5], [26, 13 + i * 5]], accent); }
        else { line(p, [[11, 14], [15, 16], [19, 15]], "#f0d0c8"); line(p, [[14, 21], [19, 20], [23, 22]], "#f0d0c8"); dot(p, 22, 13, "#f0d0c8"); }
        break;
      }
      case "meat":
        part(p, stroke([[20, 12], [28, 4]], 3), WHITE, "stone"); part(p, disc(28, 4, 2), WHITE, "stone");
        part(p, disc(14, 18, 11, 9), color, "food"); break;
      case "feather":
        line(p, [[5, 29], [24, 5]], "#8a7563");
        part(p, poly([[8, 25], [11, 13], [22, 4], [24, 8], [18, 19]]), color, "cloth");
        for (let i = 0; i < 4; i++) line(p, [[10 + i * 3, 22 - i * 4], [13 + i * 3, 18 - i * 4]], shadeHex(color, -0.12)); break;
      case "bait": for (const [cx, cy] of [[10, 13], [20, 11], [14, 21], [23, 21]] as Pt[]) part(p, disc(cx, cy, 4.5, 2.6), color, "food"); break;
      case "cake":
        part(p, poly([[4, 18], [16, 11], [28, 18], [28, 26], [16, 31], [4, 26]]), color, "food");
        part(p, poly([[4, 18], [16, 11], [28, 18], [16, 24]]), accent ?? "#d8b6b4", "food");
        line(p, [[4, 22], [16, 28], [28, 22]], shadeHex(color, -0.18)); part(p, disc(16, 15, 2), "#cf6e6e", "gem"); break;
      case "berries":
        for (const [cx, cy] of [[11, 19], [18, 17], [14, 12], [21, 23], [10, 25], [17, 24]] as Pt[]) part(p, disc(cx, cy, 3.8), color, "gem");
        part(p, poly([[14, 8], [19, 3], [22, 7]]), "#8e9887", "cloth"); break;
      case "bread":
        part(p, disc(16, 19, 13, 8.5), color, "food");
        for (const x of [10, 15, 20]) line(p, [[x, 15], [x + 3, 21]], shadeHex(color, -0.22)); break;
      case "key":
        part(p, all(disc(10, 10, 6), stroke([[13, 14], [26, 27]], 3), stroke([[20, 23], [24, 19]], 3), stroke([[24, 27], [27, 24]], 2)), color, "metal");
        part(p, disc(10, 10, 2.5), "#ffffff", "flat", false); break;
      case "lamp":
        part(p, all(disc(15, 21, 10, 5), poly([[22, 19], [31, 14], [30, 17], [24, 23]])), color, "metal");
        part(p, stroke([[6, 18], [3, 14], [6, 12]], 2), color, "metal"); part(p, box(12, 26, 7, 3), shadeHex(color, -0.2), "metal");
        part(p, poly([[29, 13], [31, 6], [27, 10]]), "#f2d58a", "glow"); break;
      case "scroll":
        part(p, box(7, 7, 18, 19), color, "cloth"); part(p, disc(16, 7, 10, 2.5), shadeHex(color, -0.1), "cloth"); part(p, disc(16, 26, 10, 2.5), shadeHex(color, -0.1), "cloth");
        for (const y of [11, 15, 19]) line(p, [[10, y], [22, y]], "#8a7563"); line(p, [[10, 22], [17, 22]], "#8a7563"); break;
      case "silk":
        part(p, poly([[4, 11], [28, 6], [28, 21], [4, 26]]), color, "cloth"); line(p, [[7, 14], [26, 10]], "#ffffff"); line(p, [[6, 20], [26, 16]], shadeHex(color, -0.12)); break;
      case "burnt":
        // Charred to a black lump, glowing cracks, and a last wisp of smoke.
        part(p, poly([[4, 22], [7, 15], [13, 12], [21, 13], [27, 17], [28, 24], [20, 28], [9, 28]]), "#2e2a28", "stone");
        line(p, [[9, 20], [13, 22], [16, 19]], "#d9774a"); line(p, [[19, 22], [23, 20], [25, 23]], "#cd5836"); dot(p, 14, 25, "#e6a24a");
        line(p, [[15, 10], [13, 7], [16, 4], [14, 1]], "#b3aea6"); line(p, [[20, 10], [22, 7], [20, 5]], "#c8c5be");
        break;
      case "orb": part(p, disc(16, 16, 10.5), color, "gem"); if (accent) part(p, disc(16, 16, 4), accent, "glow"); break;
      case "trophy":
        part(p, poly([[8, 4], [24, 4], [22, 15], [16, 18], [10, 15]]), color, "metal"); part(p, stroke([[16, 18], [16, 24]], 3), color, "metal");
        part(p, box(9, 24, 14, 5), shadeHex(color, -0.12), "metal"); break;
      case "bow":
        part(p, stroke([[8, 3], [15, 7], [20, 16], [15, 25], [8, 29]], 3), color, "wood");
        line(p, [[8, 3], [8, 29]], "#efede7"); part(p, box(17, 13, 5, 6), accent ?? "#8a5a4a", "cloth");
        if (accent) part(p, disc(20, 16, 2), accent, "gem"); break;
      case "arrow": {
        const variant = accent;
        for (const off of [-5, 0, 5]) {
          line(p, [[4, 28 + off], [24, 8 + off]], "#9c7a5c", 2);
          if (variant !== "shaft") { line(p, [[4, 28 + off], [9, 23 + off]], "#efede7", 3); line(p, [[5, 25 + off], [7, 23 + off]], "#cf6e6e"); }
          if (!variant) part(p, poly([[22, 6 + off], [28, 4 + off], [26, 10 + off]]), color, "metal");
        }
        break;
      }
      case "arrowheads":
        for (const [x, y] of [[9, 12], [20, 9], [14, 22], [24, 22]] as Pt[]) part(p, poly([[x, y - 6], [x + 5, y + 3], [x, y + 1], [x - 5, y + 3]]), color, "metal");
        break;
      case "tablet":
        part(p, poly([[6, 5], [26, 5], [28, 27], [4, 27]]), "#c8c5be", "stone");
        part(p, disc(16, 16, 6), color, "glow"); line(p, [[16, 11], [16, 21]], INK); line(p, [[11, 16], [21, 16]], INK); break;
    }
    p.outline(); p.halo();
  });
}

// ---------- 16-pixel UI icons: skills, tabs, orbs ----------
const G16 = 18;
type Painter = (p: Pixels) => void;
function icon16(key: string, paint: Painter) { return pixelArt(`ui:${key}`, G16, G16, p => { paint(p); p.halo(); }); }
const WOOD = "#9c8672", STEEL = "#b9bfc6", GOLD = "#e2d49e", ROSE = "#d8b6b4", SAGE = "#b4c3ab", BLUE = "#9fb4d0", PAPER = "#efede7", FIRE = "#e9a07a";
const SKILL_PAINTERS: Record<Skill, Painter> = {
  attack: p => { p.line(3, 14, 13, 4, INK, 3); p.line(3, 14, 13, 4, STEEL, 1); p.line(2, 10, 7, 15, INK, 2); },
  strength: p => { p.poly([[4, 9], [9, 4], [14, 6], [14, 12], [9, 15], [5, 13]], ROSE); p.line(7, 8, 11, 8, INK); p.line(7, 11, 11, 11, INK); },
  defence: p => { p.poly([[3, 3], [14, 3], [14, 9], [8.5, 15], [3, 9]], STEEL); p.line(8.5, 4, 8.5, 13, INK); },
  hitpoints: p => { p.disc(6, 6.5, 3.5, 3.5, "#cf6e6e"); p.disc(11, 6.5, 3.5, 3.5, "#cf6e6e"); p.poly([[3, 8], [14, 8], [8.5, 15]], "#cf6e6e"); p.set(5, 5, "#ffffff"); },
  magic: p => { p.poly([[8.5, 1], [10.5, 6.5], [16, 8], [10.5, 9.5], [8.5, 16], [6.5, 9.5], [1, 8], [6.5, 6.5]], "#b6c3e0"); },
  prayer: p => { p.rect(7, 2, 3, 13, PAPER); p.rect(3, 6, 11, 3, PAPER); p.poly([[7, 2], [10, 2], [10, 6], [14, 6], [14, 9], [10, 9], [10, 15], [7, 15], [7, 9], [3, 9], [3, 6], [7, 6]], null); },
  woodcutting: p => { p.line(4, 15, 11, 3, INK, 3); p.line(4, 15, 11, 3, WOOD, 1); p.poly([[8, 2], [15, 4], [14, 9], [11, 7]], STEEL); },
  fishing: p => { p.poly([[1, 9], [5, 5], [12, 6], [15, 9], [12, 12], [5, 13]], BLUE); p.poly([[13, 9], [17, 5], [17, 13]], BLUE); p.set(4, 8, INK); },
  cooking: p => { p.disc(7, 10, 6, 4, "#6d6b67"); p.line(12, 9, 16, 6, INK, 2); p.line(5, 4, 5, 6, "#c8c5be"); p.line(8, 3, 8, 6, "#c8c5be"); },
  firemaking: p => { p.poly([[4, 15], [3, 10], [6, 5], [7, 9], [9, 2], [12, 8], [13, 6], [14, 11], [13, 15]], FIRE); p.poly([[7, 15], [7, 11], [9, 8], [11, 12], [11, 15]], GOLD, null); },
  mining: p => { p.line(5, 15, 10, 5, INK, 3); p.line(5, 15, 10, 5, WOOD, 1); p.poly([[2, 6], [9, 2], [16, 5], [10, 6]], STEEL); },
  smithing: p => { p.poly([[2, 8], [15, 8], [13, 11], [11, 11], [11, 14], [6, 14], [6, 11], [4, 11]], "#8b8e92"); p.line(10, 6, 14, 2, INK, 2); p.rect(8, 1, 5, 3, STEEL); },
  crafting: p => { p.line(3, 15, 14, 3, INK, 2); p.line(3, 15, 14, 3, STEEL); p.disc(13, 4, 1.5, 1.5, PAPER); p.line(6, 5, 10, 13, ROSE, 2); },
  thieving: p => { p.poly([[4, 16], [3, 8], [5, 7], [6, 11], [6, 4], [8, 4], [8, 10], [9, 3], [11, 3], [11, 10], [12, 5], [14, 6], [13, 16]], "#e8d4c0"); },
  agility: p => { p.poly([[2, 11], [10, 11], [11, 7], [13, 7], [15, 14], [2, 14]], "#b89c86"); p.line(3, 9, 7, 5, SAGE, 2); p.line(6, 5, 9, 3, SAGE, 2); },
  ranged: p => { p.polyline([[5, 1], [10, 4], [12, 9], [10, 14], [5, 16]], INK, 3); p.polyline([[5, 1], [10, 4], [12, 9], [10, 14], [5, 16]], WOOD); p.line(5, 2, 5, 15, PAPER); p.line(2, 12, 15, 5, INK, 2); p.line(2, 12, 15, 5, "#c8c5be"); p.poly([[14, 3], [17, 3], [16, 7]], STEEL); },
  sigilcraft: p => { p.poly([[8.5, 1], [15, 6], [13, 15], [4, 15], [2, 6]], "#d9d4e6"); p.disc(8.5, 9, 3, 3, "#6f7ea6"); p.set(8, 8, "#ffffff"); },
  fletching: p => { p.line(2, 15, 14, 3, INK, 2); p.line(2, 15, 14, 3, WOOD); p.poly([[12, 1], [16, 1], [16, 5]], STEEL); p.poly([[1, 12], [5, 16], [2, 16]], PAPER); p.poly([[3, 10], [7, 14], [4, 14]], "#d8b6b4"); },
  slayer: p => { p.disc(8.5, 7, 6, 5.5, "#e8e4dc"); p.rect(5, 11, 7, 4, "#e8e4dc"); p.rect(5, 5, 3, 3, INK); p.rect(10, 5, 3, 3, INK); p.rect(8, 9, 1, 2, INK); p.line(6, 14, 11, 14, INK); p.line(1, 16, 16, 1, "#cf6e6e", 1); },
};
export const skillArt = (skill: Skill) => icon16(`skill:${skill}`, SKILL_PAINTERS[skill]);
export type TabIcon = "combat" | "skills" | "quests" | "inventory" | "equipment" | "prayer" | "magic" | "friends" | "settings" | "emotes";
const TAB_PAINTERS: Record<TabIcon, Painter> = {
  combat: p => { p.line(2, 14, 13, 3, INK, 3); p.line(2, 14, 13, 3, STEEL); p.line(15, 14, 4, 3, INK, 3); p.line(15, 14, 4, 3, STEEL); p.rect(3, 12, 3, 3, GOLD); p.rect(12, 12, 3, 3, GOLD); },
  skills: p => { for (let i = 0; i < 3; i++) p.rect(2 + i * 5, 12 - i * 4, 4, 4 + i * 4, [SAGE, BLUE, GOLD][i]); },
  quests: p => { p.poly([[4, 2], [14, 2], [14, 15], [4, 15]], "#efe3c4"); p.line(6, 6, 12, 6, INK); p.line(6, 9, 12, 9, INK); p.line(6, 12, 10, 12, INK); p.rect(2, 1, 14, 2, WOOD); p.rect(2, 15, 14, 2, WOOD); },
  inventory: p => { p.poly([[3, 6], [14, 6], [15, 16], [2, 16]], "#b58b6b"); p.poly([[6, 6], [6, 3], [11, 3], [11, 6]], null); p.rect(7, 9, 3, 2, GOLD); },
  equipment: p => { p.poly([[3, 14], [3, 6], [8.5, 1], [14, 6], [14, 14]], STEEL); p.rect(5, 7, 7, 2, INK); p.line(8.5, 2, 8.5, 6, "#ffffff"); },
  prayer: p => { p.rect(7, 1, 3, 15, PAPER); p.rect(3, 5, 11, 3, PAPER); p.poly([[7, 1], [10, 1], [10, 5], [14, 5], [14, 8], [10, 8], [10, 16], [7, 16], [7, 8], [3, 8], [3, 5], [7, 5]], null); },
  magic: p => { p.line(3, 16, 12, 4, INK, 3); p.line(3, 16, 12, 4, WOOD); p.poly([[12, 0], [13.5, 3.5], [17, 4.5], [13.5, 5.5], [12, 9], [10.5, 5.5], [7, 4.5], [10.5, 3.5]], "#b6c3e0"); },
  friends: p => { p.disc(8.5, 7, 6, 5.5, INK, INK); p.rect(5, 12, 2, 3, INK); p.rect(10, 12, 2, 3, INK); p.rect(6, 6, 2, 2, "#ffffff"); p.rect(10, 6, 2, 2, "#ffffff"); p.rect(4, 3, 2, 2, INK); p.rect(11, 3, 2, 2, INK); },
  emotes: p => { p.disc(8.5, 8.5, 7, 7, GOLD); p.rect(5, 5, 2, 3, INK); p.rect(10, 5, 2, 3, INK); p.line(5, 11, 8.5, 13, INK); p.line(8.5, 13, 12, 11, INK); },
  settings: p => { p.disc(8.5, 8.5, 6, 6, "#8b8e92"); for (const [x, y] of [[8, 0], [8, 15], [0, 8], [15, 8], [2, 2], [14, 14], [2, 14], [14, 2]] as Pt[]) p.rect(x, y, 2, 2, "#8b8e92"); p.disc(8.5, 8.5, 2.5, 2.5, "#242322"); },
};
export const tabArt = (tab: TabIcon) => icon16(`tab:${tab}`, TAB_PAINTERS[tab]);
export type OrbIcon = "hitpoints" | "prayer" | "run" | "walk" | "map";
const ORB_PAINTERS: Record<OrbIcon, Painter> = {
  hitpoints: SKILL_PAINTERS.hitpoints, prayer: SKILL_PAINTERS.prayer,
  run: p => { p.poly([[3, 12], [9, 12], [10, 8], [13, 7], [15, 13], [15, 15], [3, 15]], GOLD); p.line(4, 10, 8, 6, SAGE, 2); p.line(7, 6, 10, 4, SAGE, 2); },
  walk: p => { p.poly([[3, 12], [9, 12], [10, 8], [13, 7], [15, 13], [15, 15], [3, 15]], "#9a968f"); },
  map: p => { p.poly([[2, 4], [6, 2], [11, 4], [16, 2], [16, 14], [11, 16], [6, 14], [2, 16]], "#efe3c4"); p.line(6, 2, 6, 14, INK); p.line(11, 4, 11, 16, INK); p.disc(9, 9, 1.5, 1.5, "#cf6e6e", null); },
};
export const orbArt = (orb: OrbIcon) => icon16(`orb:${orb}`, ORB_PAINTERS[orb]);

// ---------- Spell and prayer icons (generated from their element) ----------
const ELEMENT_COLORS: Record<string, string> = { wind: "#e6ecef", water: "#8fa3c9", earth: "#a89479", fire: "#e9a07a", hollow: "#6d6b67", moon: "#c6bed4", gold: "#e2d49e", home: "#e8d4c0" };
/** Spell icon: an element orb with a shape by kind (bolt, strike, blast, curse, teleport, alchemy, utility). */
export function spellArt(id: string, element: string, kind: string): HTMLCanvasElement {
  const color = ELEMENT_COLORS[element] ?? "#c7d3dc";
  return pixelArt(`spell:${id}`, 20, 20, p => {
    switch (kind) {
      case "strike": p.disc(10, 10, 5, 5, color, INK, shadeHex(color, -0.15)); p.line(3, 15, 7, 11, color, 2); break;
      case "bolt": p.poly([[11, 1], [5, 11], [9, 11], [7, 19], [15, 8], [11, 8], [13, 1]], color); break;
      case "blast": p.poly([[10, 1], [12, 7], [18, 5], [13, 10], [18, 15], [12, 13], [10, 19], [8, 13], [2, 15], [7, 10], [2, 5], [8, 7]], color); break;
      case "curse": p.disc(10, 10, 7, 7, "#3b3a38", INK); p.disc(10, 10, 3, 3, color, null); p.line(4, 4, 16, 16, color, 1); break;
      case "bind": p.disc(10, 10, 7, 7, SAGE, INK); p.line(3, 8, 17, 12, "#6d8a64", 2); p.line(3, 12, 17, 8, "#6d8a64", 2); break;
      case "teleport": p.disc(10, 12, 7, 4, color, INK); p.poly([[10, 1], [13, 9], [7, 9]], "#ffffff"); p.line(10, 3, 10, 12, INK); break;
      case "alchemy": p.poly([[7, 2], [13, 2], [12, 7], [17, 16], [3, 16], [8, 7]], "#ffffff"); p.poly([[5, 12], [15, 12], [17, 16], [3, 16]], GOLD, null); p.line(7, 2, 13, 2, INK); break;
      case "superheat": p.rect(4, 11, 12, 5, "#8b8e92"); p.poly([[5, 11], [7, 4], [9, 8], [11, 2], [13, 7], [15, 11]], FIRE); break;
      case "grab": p.poly([[4, 18], [3, 9], [5, 8], [6, 12], [6, 4], [8, 4], [8, 10], [9, 3], [11, 3], [11, 10], [12, 5], [14, 6], [13, 18]], "#e8d4c0"); p.disc(15, 4, 2.5, 2.5, GOLD); break;
      case "enchant": p.disc(10, 12, 5, 5.5, "#8fa3c9"); p.poly([[10, 1], [11, 4], [14, 5], [11, 6], [10, 9], [9, 6], [6, 5], [9, 4]], "#ffffff"); break;
      case "bloom": for (const [bx, by] of [[7, 12], [12, 11], [10, 7], [14, 15], [6, 16]]) p.disc(bx, by, 2.6, 2.6, "#c6bed4"); p.line(10, 3, 10, 7, "#8e9887"); p.line(10, 3, 13, 2, "#8e9887"); break;
      default: p.disc(10, 10, 6, 6, color);
    }
    p.halo();
  });
}
const PRAYER_KIND: Record<string, [string, string]> = {
  paper_shield: ["skin", "#c8c5be"], stone_shield: ["skin", "#a39e96"], mountain_shield: ["skin", "#8b8e92"],
  warm_heart: ["strength", ROSE], bright_heart: ["strength", "#cf8e8e"], burning_heart: ["strength", "#cf6e6e"],
  clear_ink: ["eye", "#c7d3dc"], sharp_ink: ["eye", "#afbccb"], perfect_ink: ["eye", "#8fa3c9"],
  quiet_mind: ["star", "#c6bed4"], deep_mind: ["star", "#b3a6d0"], friends_ward: ["protect", GOLD],
};
export function prayerArt(id: string): HTMLCanvasElement {
  const [kind, color] = PRAYER_KIND[id] ?? ["star", PAPER];
  return pixelArt(`prayer:${id}`, 18, 18, p => {
    if (kind === "skin") p.poly([[3, 3], [15, 3], [15, 9], [9, 16], [3, 9]], color);
    else if (kind === "strength") { p.poly([[4, 9], [9, 4], [14, 6], [14, 12], [9, 15], [5, 13]], color); p.line(7, 8, 11, 8, INK); }
    else if (kind === "eye") { p.disc(9, 9, 7, 4, "#ffffff"); p.disc(9, 9, 2.5, 2.5, color); p.set(9, 9, INK); }
    else if (kind === "protect") { p.poly([[3, 3], [15, 3], [15, 9], [9, 16], [3, 9]], color); p.line(5, 12, 13, 4, INK, 2); p.line(5, 4, 13, 12, INK, 2); }
    else p.poly([[9, 1], [11, 7], [17, 9], [11, 11], [9, 17], [7, 11], [1, 9], [7, 7]], color);
    p.halo();
  });
}
/** Emote icons: a Friend's face with the emote's expression. */
export function emoteArt(id: string): HTMLCanvasElement {
  return pixelArt(`emote:${id}`, 20, 20, p => {
    const face = id === "skillcape" ? "#e2d49e" : id === "cry" ? "#c7d3dc" : id === "flex" ? "#e8c7a8" : "#efe3c4";
    p.disc(10, 11, 7, 7, face);
    const eyes = (y = 9) => { p.rect(7, y, 2, 2, INK); p.rect(11, y, 2, 2, INK); };
    switch (id) {
      case "wave": eyes(); p.line(7, 14, 12, 14, INK); p.poly([[15, 2], [18, 1], [19, 6], [16, 7]], face); break;
      case "bow": p.line(6, 10, 9, 10, INK); p.line(11, 10, 14, 10, INK); p.line(8, 14, 12, 14, INK); break;
      case "dance": eyes(); p.line(7, 13, 10, 15, INK); p.line(10, 15, 13, 13, INK); p.rect(15, 1, 1, 5, INK); p.rect(16, 1, 2, 1, INK); p.rect(14, 5, 2, 2, INK); break;
      case "cheer": eyes(8); p.disc(10, 14, 2.5, 2, "#8a3a3a", null); p.line(2, 4, 4, 1, "#d8b6b4", 2); p.line(16, 1, 18, 4, "#afbccb", 2); break;
      case "clap": eyes(); p.line(7, 14, 12, 14, INK); p.poly([[2, 14], [5, 11], [6, 15]], face); p.poly([[18, 14], [15, 11], [14, 15]], face); break;
      case "laugh": p.line(6, 9, 9, 8, INK); p.line(11, 8, 14, 9, INK); p.disc(10, 13.5, 3, 2.2, "#8a3a3a", null); break;
      case "cry": eyes(); p.line(7, 15, 10, 13, INK); p.line(10, 13, 13, 15, INK); p.rect(7, 11, 1, 3, "#5f9be0"); p.rect(12, 11, 1, 3, "#5f9be0"); break;
      case "think": eyes(); p.line(8, 14, 12, 13, INK); p.disc(16, 3, 2.5, 2.5, "#ffffff"); p.rect(15, 2, 2, 1, INK); p.set(16, 4, INK); break;
      case "jump": eyes(8); p.disc(10, 13, 2, 2, "#8a3a3a", null); p.line(3, 19, 17, 19, INK); break;
      case "yes": eyes(); p.line(7, 13, 10, 15, INK); p.line(10, 15, 13, 13, INK); p.line(15, 3, 16, 5, "#5a9a5a", 2); p.line(16, 5, 19, 1, "#5a9a5a", 2); break;
      case "no": eyes(); p.line(7, 14, 12, 14, INK); p.line(15, 1, 19, 5, "#cf6e6e", 2); p.line(19, 1, 15, 5, "#cf6e6e", 2); break;
      case "spin": eyes(); p.line(7, 14, 12, 14, INK); p.polyline([[2, 6], [4, 2], [8, 1]], INK); p.polyline([[18, 14], [16, 18], [12, 19]], INK); break;
      case "flex": p.line(6, 9, 9, 10, INK); p.line(11, 10, 14, 9, INK); p.line(7, 14, 13, 14, INK); p.disc(17, 8, 2.5, 2.5, face); break;
      case "friendship": eyes(); p.line(7, 13, 10, 15, INK); p.line(10, 15, 13, 13, INK); p.disc(4, 4, 2, 2, "#e7677a", null); p.disc(7, 4, 2, 2, "#e7677a", null); p.poly([[2, 5], [9, 5], [5.5, 9]], "#e7677a", null); break;
      case "skillcape": eyes(); p.line(7, 13, 10, 15, INK); p.line(10, 15, 13, 13, INK); p.poly([[3, 19], [6, 12], [14, 12], [17, 19]], "#6f7ea6"); break;
    }
    p.halo();
  });
}
/** A canvas's data URL, cached (for <img> in React panels). */
const urls = new WeakMap<HTMLCanvasElement, string>();
export function artUrl(canvas: HTMLCanvasElement) { let url = urls.get(canvas); if (!url) urls.set(canvas, url = canvas.toDataURL()); return url; }
