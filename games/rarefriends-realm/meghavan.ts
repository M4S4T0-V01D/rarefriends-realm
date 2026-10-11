/**
 * The Land Before Stone: Meghavan, east of Kharaveth across Khetmar's bay. Kharaveth's traders call it the Rain Country,
 * for the rain that comes every afternoon of the wet months, like a bell.
 *
 * Nobody rules all of it. Ilavarta, the river kingdom, keeps Sarovan and the Ilavati's tanks and canals, and Queen
 * Saumitra's right to rule is that the tanks are kept; her engineers and the temple treasurers are fighting over who pays
 * to dig the silt out. The League of Seven Parasols meets in the open hall at Mandapur, seven rulers under seven shades
 * and a Speaker chosen by turn, and argues with Ilavarta about tolls and river water. Shailagarh, the highland fortress,
 * holds the passes and the mines, and hires Copper Banner companies out of Khetmar, which Ilavarta calls interference.
 * Suvarnatira, on the Golden Shore, is a free port run by its Assembly of Ink and Coin, and keeps the Archive. In the
 * Deepgreen, the Kanthari live in their stilt villages and would like to go on not being anybody's province. Tirthali,
 * at the ford, is everybody's and nobody's: caravans, ferrymen, smugglers, and things dug up that shouldn't be sold.
 *
 * Built after Kharaveth (south.ts), in the grown world's own coordinates. Only the sea is turned to land. Module
 * constants are literals (see south.ts).
 */
import { OVERWORLD_H, T, W, isWater, type Building, type DecorKind, type GenContext, type RegionId, type World, type WorldObject, type worldTools } from "./world.ts";
import type { RockKind, TreeKind } from "./data.ts";
import type { SouthKit } from "./heartlands.ts";

type Tools = ReturnType<typeof worldTools>;

/** Meghavan's bounds (the coast wanders inside them). */
export const MEGHAVAN = { x0: 1066, x1: 1714, y0: 568, y1: 874 } as const;
/** The land: a union of ellipses (cx, cy, rx, ry), wobbled: the bridge from Khetmar's bay, the body, the north-east, the south. */
export const MEGHAVAN_LAND: readonly (readonly [number, number, number, number])[] = [[1110, 705, 60, 40], [1400, 720, 270, 140], [1560, 640, 130, 80], [1300, 820, 180, 55]];
/** The river Ilavati, from its spring in the Shaila Highlands, south-west past Sarovan, then south through the Deepgreen to the sea. */
export const ILAVATI: readonly (readonly [number, number])[] = [[1450, 610], [1380, 660], [1300, 700], [1240, 740], [1250, 800], [1300, 840], [1320, 872]];
/** The Gate of Rains: two pillars and a plaque across the road east of Khetmar. */
export const RAIN_GATE = { x: 1150, y: 705 } as const;
export const TIRTHALI = { x0: 1202, y0: 710, x1: 1230, y1: 734 } as const;
export const SAROVAN = { x0: 1262, y0: 644, x1: 1314, y1: 686 } as const;
export const SHAILAGARH = { x0: 1446, y0: 622, x1: 1494, y1: 658 } as const;
export const MANDAPUR = { x: 1430, y: 770 } as const;
export const SUVARNATIRA = { x0: 1600, y0: 708, x1: 1656, y1: 752 } as const;
export const KANTHAR = { x: 1250, y: 830 } as const;
/** The Ilavati's ford below Tirthali (the free crossing: the Queen's bridge at Sarovan takes a toll). */
export const FORD = { x: 1243, y: 754 } as const;

const toLine = (points: readonly (readonly [number, number])[], x: number, y: number) => {
  let best = Infinity;
  for (let k = 0; k + 1 < points.length; k++) {
    const [ax, ay] = points[k], [bx, by] = points[k + 1], dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - dx * u, y - ay - dy * u));
  }
  return best;
};
function mulberry(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(seed: number, scale: number) {
  const r = mulberry(seed), size = 64, grid = Array.from({ length: size * size }, () => r());
  const at = (x: number, y: number) => grid[((y % size + size) % size) * size + ((x % size + size) % size)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
}

/** Meghavan's colours: terracotta tile roofs, the highlands' slate, the Deepgreen's palm thatch, the marble of Sarovan. */
const ROOF = { tile: "#b5563a", tileDark: "#9a4630", slate: "#5a5f66", thatch: "#7a6440", marble: "#efe8da", indigo: "#34407a", saffron: "#d98a2b", sea: "#2f6f7a", sand: "#cfae7e" } as const;

export function buildMeghavan(ctx: GenContext, t: Tools, places: World["places"], kit: SouthKit) {
  const { get, put, add, decor, npc, setRegion, tileIndex, inBounds, building, clearAt, fillRect, road } = t;
  const { random } = kit, lift = ctx.lift;
  const n1 = makeNoise(7101, 30), n2 = makeNoise(7102, 9), n3 = makeNoise(7103, 4), big = makeNoise(7104, 60), rn = makeNoise(7105, 14), wet = makeNoise(7106, 20);
  const ridge = (x: number, y: number) => 1 - Math.abs(rn(x, y) * 2 - 1);
  const sea = (tt: number) => tt === T.DEEP || tt === T.WATER;
  const occupied = (x: number, y: number) => ctx.objectAt[tileIndex(x, y)] >= 0 || ctx.spawns.some(spawn => spawn.x === x && spawn.y === y);
  const OPEN = new Set<number>([T.SAND, T.GRAVEL, T.STONE, T.PATH, T.GRASS, T.DARK_GRASS, T.WOOD, T.COBBLE, T.CARPET, T.FARMLAND, T.SNOW, T.DUNGEON, T.BRICK]);
  const open = (tt: number) => OPEN.has(tt);
  const nearFree = (x: number, y: number, limit = 6): [number, number] => {
    for (let r = 0; r <= limit; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy; if (inBounds(nx, ny) && open(get(nx, ny)) && !occupied(nx, ny)) return [nx, ny];
    }
    return [x, y];
  };
  const npcAt = (id: string, x: number, y: number, wander = 0) => { const [nx, ny] = nearFree(x, y, 4); npc(id, nx, ny, wander); };
  const monsterAt = (id: string, x: number, y: number, wander?: number) => { const [nx, ny] = nearFree(x, y, 4); t.monster(id, nx, ny, wander); };
  const put2 = (x: number, y: number, kind: DecorKind, name?: string, blocks = true) => { const [dx, dy] = nearFree(x, y, 3); return decor(dx, dy, kind, blocks, name); };
  const clue = (x: number, y: number, object: Omit<WorldObject, "id" | "x" | "y">) => { const [cx, cy] = nearFree(x, y, 3); return add({ ...object, x: cx, y: cy }); };
  const sign = (x: number, y: number, label: string, text: string) => { const [sx, sy] = nearFree(x, y, 3); add({ kind: "sign", x: sx, y: sy, blocks: true, name: label, text }); };

  // ---------- 1. The land: only the sea east of Kharaveth becomes Meghavan ----------
  const BOXES = [SAROVAN, SHAILAGARH, SUVARNATIRA, TIRTHALI].map(b => ({ x0: b.x0 - 6, y0: b.y0 - 6, x1: b.x1 + 6, y1: b.y1 + 6 }));
  const shape = (x: number, y: number) => {
    if (x < MEGHAVAN.x0 || x > MEGHAVAN.x1 || y < MEGHAVAN.y0 || y > MEGHAVAN.y1) return false;
    if (BOXES.some(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1)) return true;
    if (y < 572 + (n1(x, 3) - 0.5) * 6 || y > 872 + (n1(x, 9) - 0.5) * 4) return false;
    const wob = (n1(x, y) - 0.5) * 0.55 + (n3(x, y) - 0.5) * 0.1;
    return MEGHAVAN_LAND.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + wob);
  };
  const BW = MEGHAVAN.x1 - MEGHAVAN.x0 + 1, mask = new Uint8Array(BW * (MEGHAVAN.y1 - MEGHAVAN.y0 + 1));
  const at = (x: number, y: number) => (y - MEGHAVAN.y0) * BW + (x - MEGHAVAN.x0);
  /** A tile of Meghavan (sea before, land now): only these are ever painted, so Kharaveth's shore stays as it was. */
  const land = (x: number, y: number) => x >= MEGHAVAN.x0 && x <= MEGHAVAN.x1 && y >= MEGHAVAN.y0 && y <= MEGHAVAN.y1 && mask[at(x, y)] === 1;
  for (let y = MEGHAVAN.y0; y <= MEGHAVAN.y1; y++) for (let x = MEGHAVAN.x0; x <= MEGHAVAN.x1; x++) {
    if (!sea(get(x, y)) || !shape(x, y)) continue;
    mask[at(x, y)] = 1; put(x, y, T.GRASS); lift[tileIndex(x, y)] = 0; setRegion(x, y, "ilavati_valley");
  }
  // Pockets of sea the land closed round (a lake the size of a field, cut off): filled in, so the bay is land to the gate.
  {
    const x0 = MEGHAVAN.x0 - 30, x1 = W - 1, y0 = 536, y1 = OVERWORLD_H - 1, w = x1 - x0 + 1, seen = new Uint8Array(w * (y1 - y0 + 1)), q: number[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x === x0 || x === x1 || y === y0 || y === y1) && sea(get(x, y))) { seen[(y - y0) * w + x - x0] = 1; q.push((y - y0) * w + x - x0); }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % w + x0, y = Math.floor(i / w) + y0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const nx = x + dx, ny = y + dy; if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue; const j = (ny - y0) * w + nx - x0; if (!seen[j] && sea(get(nx, ny))) { seen[j] = 1; q.push(j); } } }
    for (let y = MEGHAVAN.y0; y <= MEGHAVAN.y1; y++) for (let x = MEGHAVAN.x0; x <= MEGHAVAN.x1; x++) if (sea(get(x, y)) && !seen[(y - y0) * w + x - x0]) { mask[at(x, y)] = 1; put(x, y, T.GRASS); setRegion(x, y, "ilavati_valley"); }
  }
  // The shallows round the new coast, the open sea deep (as south.ts does for Kharaveth's).
  for (let y = 536; y < OVERWORLD_H; y++) for (let x = MEGHAVAN.x0 - 30; x < W; x++) {
    if (!sea(get(x, y))) continue;
    let near = false;
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3 && !near; dx++) { const tt = get(x + dx, y + dy); if (!sea(tt) && tt !== T.VOID) near = true; }
    put(x, y, near ? T.WATER : T.DEEP);
  }
  const coastAway = (x: number, y: number, r: number) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (sea(get(x + dx, y + dy))) return Math.hypot(dx, dy); return Infinity; };

  // ---------- 2. The ground: the Gate of Rains dry and greening, the valley's fields, the highlands' stone, the Deepgreen ----------
  const highland = (x: number, y: number) => {
    const wob = (n1(x * 1.3, y) - 0.5) * 18;
    return Math.max(0, Math.min(1, (664 + wob - y) / 34)) * Math.max(0, Math.min(1, (x - 1372) / 26)) * Math.max(0, Math.min(1, (1622 - x) / 22));
  };
  const deep = (x: number, y: number) => Math.max(0, Math.min(1, (y - 780 - (n1(x, y * 0.7) - 0.5) * 24) / 14)) * Math.max(0, Math.min(1, (x - 1146) / 12)) * Math.max(0, Math.min(1, (1344 - x) / 14));
  const shore = (x: number, y: number) => Math.max(0, Math.min(1, (x - 1556 - (n1(x, y) - 0.5) * 20) / 16)) * (y > 650 ? 1 : 0.3);
  for (let y = MEGHAVAN.y0; y <= MEGHAVAN.y1; y++) for (let x = MEGHAVAN.x0; x <= MEGHAVAN.x1; x++) {
    if (!land(x, y)) continue;
    const i = tileIndex(x, y), n = n3(x, y), b = big(x, y), hl = highland(x, y), dg = deep(x, y), gs = shore(x, y);
    const dry = Math.max(0, Math.min(1, (1178 - x) / 100)), m = ridge(x, y);
    lift[i] = Math.max(0, b - 0.5) * 1.1 + dry * m * 0.9 + hl * (0.6 + m * 2.4);
    const sand = coastAway(x, y, 2) <= 2;
    if (hl > 0.25) {
      if (hl > 0.9 && m > 0.86 && lift[i] > 2.7 && n > 0.45) put(x, y, T.SNOW);                 // snow on the peaks
      else if (hl > 0.45 && m > 0.64 && n > 0.42) put(x, y, T.CLIFF);
      else put(x, y, n > 0.55 ? T.STONE : n > 0.3 ? T.GRAVEL : T.DARK_GRASS);
    } else if (dg > 0.3) {
      lift[i] = Math.min(lift[i], 0.4);
      put(x, y, wet(x, y) > 0.7 ? (n > 0.62 ? T.WATER : T.SWAMP) : n > 0.25 ? T.DARK_GRASS : T.GRASS);
    } else if (sand && (gs > 0.3 || n > 0.5)) { put(x, y, T.SAND); lift[i] = 0; }
    else if (gs > 0.5) put(x, y, coastAway(x, y, 4) <= 4 ? T.SAND : n > 0.6 ? T.SAND : T.GRASS);
    else if (dry > 0.15 && n2(x, y) < dry * 0.95) put(x, y, n > 0.55 ? T.GRAVEL : T.SAND);       // the Gate of Rains: dry hills greening eastward
    else if (x > 1330 && b < 0.42 && n2(x, y) > 0.55) put(x, y, n > 0.5 ? T.GRAVEL : T.SAND);  // the Parasol Plains' dry fields
    else put(x, y, n2(x, y) > 0.68 ? T.DARK_GRASS : T.GRASS);
  }
  // The Ilavati: out of a spring in the highlands, past Sarovan, down through the Deepgreen to the sea. Green along it.
  for (let k = 0; k + 1 < ILAVATI.length; k++) {
    const [ax, ay] = ILAVATI[k], [bx, by] = ILAVATI[k + 1], steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let s = 0; s <= steps; s++) {
      const cx = ax + (bx - ax) * s / steps, cy = ay + (by - ay) * s / steps, width = 1.2 + (k / ILAVATI.length) * 0.6;
      for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
        const x = Math.round(cx + dx), y = Math.round(cy + dy), d = Math.hypot(dx, dy); if (!land(x, y)) continue;
        const tt = get(x, y), i = tileIndex(x, y);
        if (d <= width) { put(x, y, T.WATER); lift[i] = 0; }
        else if (d <= 5 && tt !== T.WATER) { put(x, y, n3(x, y) > 0.55 ? T.DARK_GRASS : T.GRASS); lift[i] = Math.min(lift[i], 0.25); }
        else if (d <= 8.5 && (tt === T.SAND || tt === T.GRAVEL) && n2(x, y) > 0.4) put(x, y, T.GRASS);
      }
    }
  }
  // The spring: a pool under the rocks where the river starts.
  for (let y = 604; y <= 616; y++) for (let x = 1444; x <= 1458; x++) if (land(x, y) && Math.hypot(x - 1451, y - 610) <= 3.2) { put(x, y, T.WATER); lift[tileIndex(x, y)] = 0.8; }
  // The tanks: reservoirs dug in the valley, stone-banked, the old way of keeping the rain for the dry months.
  const TANKS: readonly (readonly [number, number, number])[] = [[1222, 694, 5], [1196, 764, 5], [1352, 712, 5], [1340, 620, 6], [1180, 676, 4]];
  for (const [ox, oy, r] of TANKS) {
    for (let y = oy - r - 3; y <= oy + r + 3; y++) for (let x = ox - r - 3; x <= ox + r + 3; x++) {
      if (!land(x, y)) continue;
      const d = Math.max(Math.abs(x - ox) * 0.8, Math.abs(y - oy)) + (n3(x, y) - 0.5);
      if (d <= r * 0.8) put(x, y, T.WATER); else if (d <= r + 0.6) put(x, y, T.STONE); else if (d <= r + 2.5) put(x, y, T.GRASS);
      if (d <= r + 2.5) lift[tileIndex(x, y)] = 0;
    }
  }

  // ---------- 3. The regions: the country first, then the towns ----------
  for (let y = MEGHAVAN.y0; y <= MEGHAVAN.y1; y++) for (let x = MEGHAVAN.x0; x <= MEGHAVAN.x1; x++) {
    if (!land(x, y)) continue;
    const wob = (n1(x * 0.5, y * 0.5) - 0.5) * 20;
    let id: RegionId = "ilavati_valley";
    if (x < 1180 + wob * 0.5) id = "rain_pass";
    else if (highland(x, y) > 0.12) id = "shaila_highlands";
    else if (shore(x, y) > 0.35) id = "golden_shore";
    else if (deep(x, y) > 0.2) id = "deepgreen";
    else if (x > 1336 + wob && toLine(ILAVATI, x, y) > 20 && y > 668) id = "parasol_plains";
    setRegion(x, y, id);
  }
  const area = (x0: number, y0: number, x1: number, y1: number, id: RegionId) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (land(x, y)) setRegion(x, y, id); };
  /** Clear a site (objects, spawns), take the cliffs and water out of it unless asked, pave it if asked. */
  const ground = (x0: number, y0: number, x1: number, y1: number, paving: number | null = null, flat = true, keepWater = true) => {
    let sum = 0, n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (land(x, y)) { sum += lift[tileIndex(x, y)]; n++; }
    const mean = Math.min(1, sum / Math.max(1, n));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!land(x, y) || keepWater && isWater(get(x, y))) continue;
      clearAt(x, y);
      for (let i = ctx.spawns.length - 1; i >= 0; i--) if (ctx.spawns[i].x === x && ctx.spawns[i].y === y) ctx.spawns.splice(i, 1);
      const tt = get(x, y);
      if (tt === T.CLIFF || tt === T.SNOW || tt === T.SWAMP || isWater(tt)) put(x, y, T.GRASS);
      if (paving !== null) put(x, y, paving);
      if (flat) lift[tileIndex(x, y)] = mean;
    }
  };
  /** A Meghavan house: timber and plaster under a terracotta tile roof, hipped. */
  const house = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}, floor: number = T.WOOD) =>
    building(x0, y0, x1, y1, door, floor, undefined, { name, walls: "timber", roof: "gable", hip: true, color: ROOF.tile, chimney: false, ...extra });
  /** A Kharaveth house in Tirthali: sandstone, flat-roofed, as across the bay. */
  const flat = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}) =>
    building(x0, y0, x1, y1, door, T.WOOD, undefined, { name, walls: "sandstone", roof: "flat", color: ROOF.sand, chimney: false, ...extra });
  const home = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", what: string) => {
    const back = door === "s" ? y0 + 1 : door === "n" ? y1 - 1 : (y0 + y1) >> 1, bx = door === "e" ? x0 + 1 : door === "w" ? x1 - 1 : x0 + 1;
    decor(bx, back, "bed", true, "A rope bed under a cotton quilt"); decor(door === "e" || door === "w" ? bx : x1 - 1, door === "e" || door === "w" ? (door === "e" ? y0 + 1 : y1 - 1) : back, "shelf", true, what);
  };
  const villagers = (id: string, cx: number, cy: number, points: readonly (readonly [number, number])[]) => { for (const [dx, dy] of points) npcAt(id, cx + dx, cy + dy, 4); };

  // ---------- 4. The roads: Khetmar's east gate, the Gate of Rains, Tirthali, the ford, Sarovan, the highlands, the plains, the shore ----------
  const ROADS: readonly (readonly (readonly [number, number])[])[] = [
    [[1065, 700], [1100, 703], [RAIN_GATE.x, RAIN_GATE.y], [1180, 712], [TIRTHALI.x0 - 1, 722]],                              // Khetmar to Tirthali, through the Gate of Rains
    [[TIRTHALI.x1 + 1, 720], [1246, 708], [1256, 690], [SAROVAN.x0 - 1, 666]],                                               // Tirthali to Sarovan's west gate
    [[SAROVAN.x1 + 1, 664], [1340, 660], [1380, 651], [1412, 640], [1436, 640], [SHAILAGARH.x0 - 1, 640]],                   // Sarovan to Shailagarh, over the upper Ilavati
    [[1216, TIRTHALI.y1 + 1], [1230, 744], [FORD.x, FORD.y], [1290, 764], [1350, 769], [MANDAPUR.x - 18, MANDAPUR.y]],         // Tirthali over the ford to Mandapur
    [[1288, SAROVAN.y1 + 1], [1296, 704], [1316, 720], [1350, 742], [1390, 762], [MANDAPUR.x - 18, MANDAPUR.y - 2]],           // Sarovan over the Queen's bridge to Mandapur
    [[MANDAPUR.x + 18, MANDAPUR.y], [1500, 760], [1560, 746], [SUVARNATIRA.x0 - 1, 730]],                                     // Mandapur to Suvarnatira
    [[1216, TIRTHALI.y1 + 1], [1214, 760], [1226, 790], [1240, 816], [KANTHAR.x - 4, KANTHAR.y - 10]],                         // Tirthali down to Kanthar
    [[MANDAPUR.x, MANDAPUR.y - 16], [1440, 720], [1460, 680], [1470, SHAILAGARH.y1 + 1]],                                       // Mandapur north to Shailagarh's south gate
  ];
  for (const points of ROADS) road(points, 2.4, T.PATH);
  // The Ford: stepping stones and gravel bars across the Ilavati (a road over water would be a bridge; this one wets your feet).
  for (let y = FORD.y - 3; y <= FORD.y + 3; y++) for (let x = FORD.x - 3; x <= FORD.x + 3; x++) if (land(x, y) && get(x, y) === T.BRIDGE) put(x, y, (x + y) % 3 ? T.GRAVEL : T.STONE);

  // ---------- 5. The Gate of Rains: two pillars and a plaque across the road ----------
  {
    const { x, y } = RAIN_GATE;
    ground(x - 6, y - 6, x + 6, y + 6, null, true);
    area(x - 30, y - 30, x + 30, y + 30, "rain_pass");
    for (const dy of [-3, 3]) { clearAt(x, y + dy); put(x, y + dy, T.STONE); decor(x, y + dy, "pillar", true, "A pillar of the Gate of Rains, carved with clouds"); }
    clue(x + 1, y - 4, { kind: "decor", decor: "plaque", blocks: true, name: "The plaque on the Gate of Rains", clue: "rain_gate_plaque" });
    npcAt("rain_gate_guard", x + 2, y - 2, 1); npcAt("rain_gate_guard", x + 2, y + 2, 1);
    put2(x + 6, y - 5, "watchtower", "The rain watch: it looks west, at Kharaveth");
    sign(x - 4, y + 3, "The Gate of Rains", "THE GATE OF RAINS. Here begins Meghavan. Ilavarta keeps the road to Tirthali; the League keeps its own roads, and says so; Shailagarh keeps the passes. Travellers are asked to carry water in the dry months and a cloak in the wet.");
    for (const [dx, dy] of [[-12, -6], [10, 8], [-16, 9]] as const) put2(x + dx, y + dy, "boulder", "A boulder with green on its north side: the rain reaches this far");
  }

  // ---------- 6. Tirthali, the ford town ----------
  {
    const { x0, y0, x1, y1 } = TIRTHALI, cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    ground(x0 - 3, y0 - 3, x1 + 3, y1 + 3, null);
    area(x0 - 6, y0 - 6, x1 + 6, y1 + 10, "tirthali");
    fillRect(x0, cy - 1, x1, cy + 1, T.PATH); fillRect(cx - 1, cy, cx + 1, y1 + 2, T.PATH);
    // The caravanserai: a courtyard of rooms round the camels, the town's reason to be.
    flat(x0 + 1, y0 + 1, x0 + 10, y0 + 9, "s", "The Tirthali Caravanserai Inn", { storeys: 2 });
    npc("tirthali_innkeeper", x0 + 5, y0 + 4); decor(x0 + 2, y0 + 7, "table"); decor(x0 + 8, y0 + 7, "table"); add({ kind: "range", x: x0 + 9, y: y0 + 2, blocks: true, name: "Clay oven" });
    put2(x0 + 1, y0 + 10, "hay", "Fodder for the caravan beasts"); put2(x0 + 10, y0 + 10, "wagon", "A caravan wagon from Khetmar, its cover beaded with rain");
    // Hamir's stores (Kharaveth stone), Nalini's dyes (Meghavan timber), the ferrywarden's house by the ford road.
    flat(x1 - 9, y0 + 1, x1 - 1, y0 + 7, "s", "Hamir's Stores"); npc("tirthali_merchant", x1 - 5, y0 + 3); decor(x1 - 2, y0 + 2, "shelf", true, "Rope, lamp oil, salt from the Ouresh and pepper from the Golden Shore, priced in two currencies");
    house(x0 + 1, cy + 3, x0 + 8, y1 - 1, "n", "Nalini's Dye House"); npc("tirthali_clothier", x0 + 4, cy + 6); decor(x0 + 2, y1 - 2, "shelf", true, "Cloth dyed with madder, indigo and turmeric, hung to dry in all three colours");
    house(x1 - 9, cy + 3, x1 - 1, y1 - 1, "n", "The Ferrywarden's House"); npc("tirthali_amul", x1 - 5, cy + 6); decor(x1 - 2, y1 - 2, "table", true, "A ledger of crossings: who, how many, how wet, and a column headed 'did not ask'");
    for (const [hx, hy, kind] of [[cx - 2, y0 + 1, "flat"]] as const) {
      if (kind === "flat") { flat(hx, hy, hx + 5, hy + 6, "s", "A Tirthali house"); home(hx, hy, hx + 5, hy + 6, "s", "Brass pots, a Kharaveth rug, a Meghavan rain cloak on a peg"); }
      else { house(hx, hy, hx + 5, hy + 6, "n", "A Tirthali house"); home(hx, hy, hx + 5, hy + 6, "n", "A water jar, a string of dried chillies, a Kharaveth lamp"); }
    }
    add({ kind: "well", x: cx + 4, y: cy - 2, blocks: true, name: "The ford-town well" });
    npcAt("tirthali_dealer", x1 + 3, y0 + 2, 1);
    for (const [gx, gy] of [[x0 - 1, cy - 2], [cx + 3, y1 + 3]] as const) npcAt("tirthali_guard", gx, gy, 1);
    villagers("tirthali_villager", cx, cy, [[-8, 0], [6, 1], [0, -6], [-2, 9], [10, -3]]);
    sign(x0 - 3, cy - 3, "Tirthali", "TIRTHALI, the ford town. Ferrywarden Amul keeps the crossing. Caravans rest at the caravanserai. Sarovan is north-east; the ford and Mandapur are south-east; the Deepgreen and Kanthar are south. What is bought in Tirthali is the buyer's own business, says the ferrywarden; what is dug up is the Queen's, says the Queen.");
    // The ford itself: the gravel bars, a ferry post for the wet months.
    put2(FORD.x - 3, FORD.y - 2, "boat", "The ferry, drawn up for the dry months"); put2(FORD.x + 3, FORD.y + 2, "pillar", "The ford post, marked in hands of water depth");
    places.tirthali = { x: cx, y: cy };
  }

  // ---------- 7. Sarovan, the capital of Ilavarta ----------
  {
    const { x0, y0, x1, y1 } = SAROVAN, cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    ground(x0 - 3, y0 - 3, x1 + 3, y1 + 3, null);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : ctx.noise2(x * 1.2, y * 1.2) > 0.72 ? T.GRAVEL : T.GRASS);
    area(x0 - 3, y0 - 3, x1 + 3, y1 + 12, "sarovan");
    ctx.ramparts?.push({ x0, y0, x1, y1, storeys: 2, walls: "marble" });
    // Gates west (to Tirthali), east (to the highlands), south (to the river and the Queen's bridge); the Royal Way, and the Tank Way.
    for (let d = -1; d <= 1; d++) { put(x0, cy + d, T.COBBLE); put(x1, cy - 2 + d, T.COBBLE); put(cx + d, y1, T.COBBLE); }
    fillRect(x0 + 1, cy - 1, x1 - 1, cy + 1, T.COBBLE); fillRect(x1 - 6, cy - 3, x1 - 1, cy - 1, T.COBBLE); fillRect(cx - 1, y0 + 14, cx + 1, y1 - 1, T.COBBLE);
    for (const [tx, ty] of [[x0, y0], [x1 - 3, y0], [x0, y1 - 3], [x1 - 3, y1 - 3]] as const)
      building(tx, ty, tx + 3, ty + 3, "s", T.STONE, undefined, { name: "A tower of Sarovan's wall", walls: "marble", roof: "cone", storeys: 3, spire: 40, color: ROOF.tile });
    // The palace of the Keeper of the Tanks: marble, a dome over the hall of audience.
    building(cx - 10, y0 + 2, cx + 10, y0 + 12, "s", T.CARPET, undefined, { name: "The Palace of the Tanks", walls: "marble", roof: "cone", storeys: 2, spire: 30, color: ROOF.tile, keep: { size: 6, storeys: 1, spire: 100, dome: true }, facade: "civic" });
    npc("sarovan_saumitra", cx, y0 + 6); npc("sarovan_engineer", cx - 6, y0 + 8); npc("sarovan_treasurer", cx + 6, y0 + 8);
    decor(cx, y0 + 3, "throne", true, "The Keeper's seat: a plain stone bench, a brass water-measure set in its arm");
    decor(cx - 8, y0 + 3, "banner", true, "Ilavarta's banner: a white lotus on a blue square, a tank seen from above");
    decor(cx + 8, y0 + 3, "table", true, "A model of the Ilavati in clay, every tank and canal on it, little flags where the silt is worst");
    decor(cx - 8, y0 + 10, "shelf", true, "The engineers' rolls: depths, flows, and costs, in red ink, rising");
    decor(cx + 8, y0 + 10, "chest", true, "The temple's offering chest, locked twice: once by the treasurers, once by the Queen");
    // The Great Tank: a stepped reservoir in the city's heart, its ghats running down on every side.
    const tx0 = x0 + 4, ty0 = cy + 4, tx1 = x0 + 22, ty1 = y1 - 4;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      const edge = Math.min(x - tx0, tx1 - x, y - ty0, ty1 - y), i = tileIndex(x, y); clearAt(x, y);
      if (edge >= 3) { put(x, y, T.WATER); lift[i] = 0; } else { put(x, y, T.STONE); lift[i] = 0.12 + edge * 0.06; }
    }
    for (const [px, py] of [[tx0, ty0], [tx1, ty0], [tx0, ty1], [tx1, ty1]] as const) decor(px, py, "pillar", true, "A lamp pillar at a corner of the Great Tank");
    clue(tx0 + 9, ty0 - 1, { kind: "sign", blocks: true, name: "The Great Tank's measure", clue: "great_tank_measure", text: "" });
    npcAt("sarovan_tankwarden", tx0 + 4, ty0 - 1, 2);
    // The Great Stepwell, east of the Tank: steps down four sides to the water far below, galleries along them.
    const sx0 = cx + 5, sy0 = cy + 4, sx1 = cx + 14, sy1 = cy + 13;
    for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) {
      const edge = Math.min(x - sx0, sx1 - x, y - sy0, sy1 - y), i = tileIndex(x, y); clearAt(x, y);
      if (edge >= 4) { put(x, y, T.WATER); lift[i] = 0; } else { put(x, y, T.STONE); lift[i] = 0.5 - edge * 0.12; }
    }
    for (const [px, py] of [[sx0, sy0], [sx1, sy0], [sx0, sy1], [sx1, sy1]] as const) decor(px, py, "pillar", true, "A carved pillar of the Great Stepwell's top gallery");
    clue(cx + 9, sy0 - 1, { kind: "decor", decor: "plaque", blocks: true, name: "The Great Stepwell", clue: "great_stepwell" });
    // Bank (the Royal Treasury), the market, the inn, the forge, the looms, the houses.
    house(x1 - 13, y0 + 2, x1 - 4, y0 + 10, "s", "The Royal Treasury of Ilavarta", { walls: "marble", storeys: 2, color: ROOF.tileDark }, T.STONE);
    for (const by of [y0 + 4, y0 + 6]) add({ kind: "bank", x: x1 - 11, y: by, blocks: true, name: "Treasury counter" }); npc("banker", x1 - 8, y0 + 5);
    house(x0 + 3, y0 + 2, x0 + 11, y0 + 9, "s", "Ishaan's General Goods"); npc("sarovan_merchant", x0 + 7, y0 + 4); decor(x0 + 4, y0 + 3, "shelf", true, "Rice in sacks, lentils in jars, lamp wicks, rope, and a basket of mangoes nobody is guarding");
    house(x0 + 3, y0 + 13, x0 + 11, cy - 3, "e", "Padma's Looms", { color: ROOF.saffron }); npc("sarovan_clothier", x0 + 6, y0 + 16); decor(x0 + 4, y0 + 14, "shelf", true, "Cotton in tank blue and lotus white, folded by the length");
    house(x1 - 12, y0 + 13, x1 - 3, cy - 4, "w", "The Lotus Inn", { storeys: 2 }); npc("sarovan_innkeeper", x1 - 7, y0 + 16); decor(x1 - 4, y0 + 14, "table"); add({ kind: "range", x: x1 - 4, y: cy - 6, blocks: true, name: "Clay oven" });
    house(x1 - 9, y1 - 9, x1 - 2, y1 - 2, "n", "Gauri's Forge", { walls: "stone", color: ROOF.slate }, T.STONE);
    npc("sarovan_smith", x1 - 5, y1 - 5); add({ kind: "furnace", x: x1 - 8, y: y1 - 3, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: x1 - 3, y: y1 - 3, blocks: true, name: "Anvil" });
    for (const [hx, hy] of [[x1 - 8, cy + 3]] as const) { house(hx, hy, hx + 5, hy + 5, "e", "A Sarovan house"); home(hx, hy, hx + 5, hy + 5, "e", "A brass lamp, a water jar, a palm-leaf book of the tank songs"); }
    // Market stalls along the Royal Way.
    for (const [sx, sy, kind, name] of [[cx - 12, cy - 3, "bakery", "Rice and lentil stall"], [cx - 7, cy - 3, "fish", "River fish stall"], [cx + 6, cy - 3, "silk", "Cotton stall"], [cx + 11, cy - 3, "gem", "Brass and bead stall"]] as const)
      add({ kind: "stall", stall: kind, x: sx, y: sy, blocks: true, name });
    npcAt("sarovan_factor", cx - 9, cy - 5, 1);
    for (const [gx, gy] of [[x0 - 1, cy - 2], [x0 - 1, cy + 2], [x1 + 1, cy - 4], [x1 + 1, cy], [cx - 2, y1 + 1], [cx + 2, y1 + 1], [cx - 4, y0 + 13], [cx + 4, y0 + 13]] as const) npcAt("sarovan_guard", gx, gy, 1);
    villagers("sarovan_villager", cx, cy, [[-16, -2], [-4, 2], [8, 1], [16, -1], [-2, 12], [6, -8], [-10, 16]]);
    for (let x = x0 + 4; x <= x1 - 4; x += 8) if (!occupied(x, cy - 3) && get(x, cy - 3) === T.GRASS) t.tree(x, cy - 3, "palm");
    sign(x0 - 3, cy - 3, "Sarovan", "SAROVAN, the city of the tanks. Seat of Queen Saumitra, Keeper of the Tanks, and of the kingdom of Ilavarta. The Great Tank is open to all at dawn and dusk. The Queen's bridge is south of the city: toll by the head, by the cart, by the beast.");
    // Outside the south gate: the ghats down to the Ilavati, and the Queen's toll at the bridge.
    for (let y = y1 + 2; y <= y1 + 12; y++) for (let x = cx + 4; x <= x1 + 2; x++) if (land(x, y) && !isWater(get(x, y)) && get(x, y) !== T.PATH && toLine(ILAVATI, x, y) < 5) { put(x, y, T.STONE); clearAt(x, y); }
    npcAt("sarovan_tollkeeper", 1300, 702, 1);
    places.sarovan = { x: cx, y: cy };
  }

  // ---------- 8. Shailagarh, the highland fortress ----------
  {
    const { x0, y0, x1, y1 } = SHAILAGARH, cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    ground(x0 - 3, y0 - 3, x1 + 3, y1 + 3, null, true, false);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : (x + y) % 7 === 0 ? T.GRAVEL : T.STONE);
    area(x0 - 4, y0 - 4, x1 + 4, y1 + 4, "shailagarh");
    ctx.ramparts?.push({ x0, y0, x1, y1, storeys: 3, walls: "stone" });
    for (let d = -1; d <= 1; d++) { put(x0, cy + d, T.COBBLE); put(cx + d, y1, T.COBBLE); }
    fillRect(x0 + 1, cy - 1, cx + 1, cy + 1, T.COBBLE); fillRect(cx - 1, cy, cx + 1, y1 - 1, T.COBBLE);
    for (const [tx, ty] of [[x0, y0], [x1 - 4, y0], [x0, y1 - 4], [x1 - 4, y1 - 4]] as const)
      building(tx, ty, tx + 4, ty + 4, "s", T.STONE, undefined, { name: "A tower of Shailagarh", walls: "stone", roof: "flat", storeys: 4, color: ROOF.slate });
    // The lord's hall at the top of the rock, the assay house and the forge beside it; the stores and the wool room on the
    // west road; the inn and the barracks of the hired companies below.
    building(cx - 8, y0 + 2, cx + 8, y0 + 10, "s", T.STONE, undefined, { name: "Lord Varanjit's Hall", walls: "stone", roof: "gable", hip: true, storeys: 2, color: ROOF.slate, facade: "civic" });
    npc("shailagarh_varanjit", cx, y0 + 5); decor(cx - 6, y0 + 3, "banner", true, "Shailagarh's banner: a white peak on red, three stars over it for the three passes");
    decor(cx + 6, y0 + 3, "table", true, "A map of the passes, the mines, and the Copper Banner's companies marked in pins that cost a great deal each");
    house(x0 + 6, y0 + 2, x0 + 14, y0 + 9, "e", "The Assay House", { walls: "stone", color: ROOF.slate }, T.STONE);
    npc("shailagarh_metallurgist", x0 + 10, y0 + 5); decor(x0 + 7, y0 + 3, "table", true, "Scales, crucibles, a touchstone, and a blackiron ingot stamped with the Obsidian Legacy's obelisk");
    house(x1 - 14, y0 + 2, x1 - 6, y0 + 9, "w", "Uday's Forge", { walls: "stone", color: ROOF.slate }, T.STONE);
    npc("shailagarh_smith", x1 - 10, y0 + 5); add({ kind: "furnace", x: x1 - 13, y: y0 + 8, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: x1 - 7, y: y0 + 8, blocks: true, name: "Anvil" });
    house(x0 + 6, y0 + 10, x0 + 13, cy - 3, "s", "Kunal's Stores", { walls: "stone", color: ROOF.slate }, T.STONE); npc("shailagarh_merchant", x0 + 9, y0 + 12); decor(x0 + 7, y0 + 11, "shelf", true, "Rope, pitons, lamp oil, dried apricots and blankets, all of it priced for people who have climbed a long way");
    house(x1 - 14, y0 + 10, x1 - 7, cy - 3, "s", "Dolma's Wool Room", { walls: "stone", color: ROOF.slate }, T.STONE); npc("shailagarh_clothier", x1 - 11, y0 + 12); decor(x1 - 8, y0 + 11, "shelf", true, "Highland wool in red and undyed grey, thick enough to stand up on its own");
    house(x0 + 6, cy + 4, x0 + 16, y1 - 5, "n", "The Pass Fire Inn", { walls: "stone", color: ROOF.slate }, T.STONE); npc("shailagarh_innkeeper", x0 + 10, cy + 7); decor(x0 + 7, y1 - 6, "table"); add({ kind: "range", x: x0 + 15, y: cy + 5, blocks: true, name: "Clay oven" });
    house(x1 - 18, cy + 4, x1 - 6, y1 - 5, "n", "The companies' barracks", { walls: "stone", color: ROOF.slate }, T.STONE);
    npc("shailagarh_captain", x1 - 12, cy + 7); for (let bx = x1 - 17; bx <= x1 - 8; bx += 4) decor(bx, y1 - 6, "bed", true, "A soldier's cot, a copper pennant hung over it");
    for (const [gx, gy] of [[x0 - 1, cy - 2], [x0 - 1, cy + 2], [cx - 2, y1 + 1], [cx + 2, y1 + 1], [cx - 9, cy], [cx + 9, cy - 3]] as const) npcAt("shailagarh_guard", gx, gy, 1);
    villagers("shailagarh_villager", cx, cy, [[-8, -2], [4, -2], [-2, 4]]);
    sign(x0 - 3, cy - 4, "Shailagarh", "SHAILAGARH, the fortress of the passes. Held by Lord Varanjit. The mines are open to those who pay the mine-tithe; the passes are open to those who pay the pass-toll; the fortress is open to those who are asked in.");
    // The mines, north and east under the peaks: blackiron, moonsilver, and the glimmer that lights the deep seams.
    for (const [mx, my, kinds] of [[1432, 606, ["blackiron", "blackiron", "inkcoal"]], [1506, 610, ["moonsilver", "blackiron", "moonsilver"]], [1540, 628, ["glimmer", "moonsilver", "glimmer"]], [1500, 664, ["blackiron", "inkcoal", "pewter"]]] as const) {
      ground(mx - 4, my - 3, mx + 4, my + 3, T.GRAVEL, false);
      kinds.forEach((kind, k) => { const [rx, ry] = nearFree(mx - 3 + k * 3, my - 2, 2); t.rock(rx, ry, kind as RockKind); });
      put2(mx, my + 2, "logpile", "Pit props of highland pine"); put2(mx + 3, my + 2, "crate", "Ore baskets, wet, waiting for the mule");
      npcAt("shailagarh_miner", mx - 1, my + 1, 2);
    }
    places.shailagarh = { x: cx, y: cy };
  }

  // ---------- 9. Mandapur, the League's council town ----------
  {
    const { x, y } = MANDAPUR;
    ground(x - 20, y - 17, x + 20, y + 18, null);
    area(x - 22, y - 19, x + 22, y + 20, "mandapur");
    for (let yy = y - 17; yy <= y + 11; yy++) for (let xx = x - 20; xx <= x + 20; xx++) if (land(xx, yy) && (Math.abs(yy - y) <= 1 || Math.abs(xx - x) <= 1 && yy < y)) put(xx, yy, T.PATH);
    // The Mandapa: an open hall on pillars, its floor stone, no walls so nobody can say they weren't heard; seven parasols round it.
    for (let yy = y - 4; yy <= y + 4; yy++) for (let xx = x - 6; xx <= x + 6; xx++) put(xx, yy, T.STONE);
    for (const [dx, dy] of [[-6, -4], [0, -4], [6, -4], [-6, 4], [0, 4], [6, 4]] as const) decor(x + dx, y + dy, "pillar", true, "A pillar of the Mandapa, garlanded");
    clue(x, y, { kind: "decor", decor: "table", blocks: true, name: "The Speaker's stone", clue: "speakers_stone" });
    const PARASOLS = ["The parasol of Kollur: saffron", "The parasol of the Salt Fens: white", "The parasol of Vanagiri: green", "The parasol of the Two Rivers: blue", "The parasol of Hemapura: gold", "The parasol of the Red Hills: red", "The parasol of Tamrali: indigo"];
    PARASOLS.forEach((name, k) => { const a = k / 7 * Math.PI * 2 - Math.PI / 2, px = Math.round(x + Math.cos(a) * 10), py = Math.round(y + Math.sin(a) * 9); clearAt(px, py); decor(px, py, "canopy", true, name); });
    npc("mandapur_speaker", x - 2, y - 1); npc("mandapur_raja", x + 3, y + 1);
    // The town round it: the inn the delegations argue in afterwards, the stores, the weavers, the smithy, the toll office.
    house(x - 18, y - 15, x - 11, y - 9, "s", "The Seven Shades Inn"); npc("mandapur_innkeeper", x - 15, y - 12); add({ kind: "range", x: x - 12, y: y - 14, blocks: true, name: "Clay oven" });
    house(x + 11, y - 15, x + 18, y - 9, "s", "Vasant's Stores"); npc("mandapur_merchant", x + 14, y - 12);
    house(x - 18, y + 9, x - 11, y + 15, "n", "Champa's Weaving", { color: ROOF.saffron }); npc("mandapur_clothier", x - 15, y + 12);
    house(x + 11, y + 9, x + 18, y + 15, "n", "Revati's Smithy", { walls: "stone", color: ROOF.slate }, T.STONE); npc("mandapur_smith", x + 14, y + 12); add({ kind: "furnace", x: x + 12, y: y + 10, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: x + 17, y: y + 10, blocks: true, name: "Anvil" });
    house(x - 4, y + 12, x + 3, y + 17, "n", "The League's Toll Office"); npc("mandapur_tollclerk", x - 1, y + 14);
    for (const [gx, gy] of [[x - 21, y - 2], [x + 21, y + 2], [x, y - 16]] as const) npcAt("mandapur_guard", gx, gy, 1);
    villagers("mandapur_villager", x, y, [[-13, 0], [13, -2], [-4, -12], [6, 11]]);
    sign(x - 21, y - 5, "Mandapur", "MANDAPUR. Here the League of Seven Parasols meets under the open sky, and the Speaker speaks for all seven until the next turn. No ruler's parasol stands higher than another's. Tolls on League roads are paid at the office by the south step.");
    places.mandapur = { x, y: y + 7 };
  }

  // ---------- 10. Suvarnatira, the free port and the scholars' city ----------
  {
    const { x0, y0, x1, y1 } = SUVARNATIRA, cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    ground(x0 - 3, y0 - 3, x1 + 3, y1 + 3, null, true, false);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, (x * 3 + y) % 11 === 0 ? T.BRICK : T.COBBLE);
    area(x0 - 4, y0 - 4, x1 + 18, y1 + 4, "suvarnatira");
    // The Archive: the greatest library east of anywhere, marble, its dome a reading room.
    building(cx - 9, y0 + 2, cx + 9, y0 + 14, "s", T.CARPET, undefined, { name: "The Archive of Suvarnatira", walls: "marble", roof: "cone", storeys: 3, spire: 30, color: ROOF.sea, keep: { size: 6, storeys: 1, spire: 100, dome: true }, facade: "civic" });
    npc("suvarnatira_archivist", cx - 4, y0 + 7); npc("suvarnatira_envoy", cx + 5, y0 + 9);
    for (const [sx, sy] of [[cx - 8, y0 + 3], [cx - 5, y0 + 3], [cx + 5, y0 + 3], [cx + 8, y0 + 3], [cx - 8, y0 + 12], [cx + 8, y0 + 12]] as const) decor(sx, sy, "shelf", true, "Shelves of palm-leaf books, bound in boards, each with a label in three scripts");
    decor(cx, y0 + 3, "table", true, "A reading desk under the dome, a star chart weighted flat with four inkpots");
    // The Assembly of Ink and Coin's hall, the counting house (a bank), the market by the docks, the inn, the smithy, the silk house.
    building(x0 + 2, y0 + 2, x0 + 13, y0 + 11, "s", T.STONE, undefined, { name: "The Hall of the Assembly of Ink and Coin", walls: "marble", roof: "gable", hip: true, storeys: 2, color: ROOF.tile, facade: "civic" });
    npc("suvarnatira_lalitha", x0 + 7, y0 + 5); decor(x0 + 3, y0 + 3, "banner", true, "The Assembly's banner: a pen crossed with a coin, on sea green");
    house(x1 - 12, y0 + 2, x1 - 2, y0 + 10, "s", "The Counting House", { walls: "marble", color: ROOF.tileDark }, T.STONE);
    for (const by of [y0 + 4, y0 + 6]) add({ kind: "bank", x: x1 - 10, y: by, blocks: true, name: "Counting-house desk" }); npc("banker", x1 - 7, y0 + 5);
    house(x0 + 2, cy + 3, x0 + 10, y1 - 2, "n", "The Inkwell Inn", { storeys: 2 }); npc("suvarnatira_innkeeper", x0 + 6, cy + 6); decor(x0 + 3, y1 - 3, "table"); add({ kind: "range", x: x0 + 9, y: cy + 4, blocks: true, name: "Clay oven" });
    house(x0 + 13, cy + 3, x0 + 20, y1 - 2, "n", "Roshni's Silk House", { color: ROOF.saffron }); npc("suvarnatira_clothier", x0 + 16, cy + 6); decor(x0 + 14, y1 - 3, "shelf", true, "Silk from the far east, cotton from the valley, and ink-dyed stoles for the Assembly");
    house(x1 - 20, cy + 3, x1 - 13, y1 - 2, "n", "Dray's Harbour Stores"); npc("suvarnatira_merchant", x1 - 17, cy + 6); decor(x1 - 19, y1 - 3, "shelf", true, "Ship's biscuit, rope, tar, lamp oil, and charts of coasts nobody you know has seen");
    house(x1 - 10, cy + 3, x1 - 2, y1 - 2, "n", "Kavya's Smithy", { walls: "stone", color: ROOF.slate }, T.STONE); npc("suvarnatira_smith", x1 - 6, cy + 6); add({ kind: "furnace", x: x1 - 9, y: cy + 4, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: x1 - 3, y: cy + 4, blocks: true, name: "Anvil" });
    for (const [sx, sy, kind, name] of [[cx - 6, cy + 1, "fish", "Sea fish stall"], [cx - 2, cy + 1, "bakery", "Spice and tea stall"], [cx + 2, cy + 1, "silk", "Silk stall"], [cx + 6, cy + 1, "gem", "Pearl stall"]] as const)
      add({ kind: "stall", stall: kind, x: sx, y: sy, blocks: true, name });
    npcAt("suvarnatira_scholar", cx, y0 + 16, 3);
    // The docks: jetties out over the water from the east side, ships' boats, the harbour watch.
    for (const jy of [y0 + 10, cy, y1 - 8]) {
      for (let x = x1 + 1; x <= x1 + 16 && x < W - 2; x++) { if (land(x, jy) || isWater(get(x, jy)) || get(x, jy) === T.SAND || get(x, jy) === T.GRASS) { put(x, jy, T.BRIDGE); put(x, jy + 1, T.BRIDGE); clearAt(x, jy); clearAt(x, jy + 1); } }
      const boat = jy + 3; if (isWater(get(x1 + 12, boat))) decor(x1 + 12, boat, "boat", true, "A trading dhow, its sail furled, its eyes painted on the bow");
    }
    for (let y = y0; y <= y1; y++) for (let x = x1 + 1; x <= x1 + 3; x++) if (land(x, y) && !isWater(get(x, y)) && get(x, y) !== T.BRIDGE) put(x, y, T.WOOD);
    put2(x1 + 2, y0 + 3, "crate", "Crates stencilled with a coin and a pen: the Assembly's mark"); put2(x1 + 2, y1 - 3, "barrel", "A barrel of lamp oil, bound for the Archive");
    npcAt("suvarnatira_sailor", x1 + 6, cy + 1, 2); npcAt("suvarnatira_sailor", x1 + 4, y0 + 11, 2);
    for (const [gx, gy] of [[x0 - 1, cy - 2], [x0 - 1, cy + 2], [x1 + 2, cy - 3]] as const) npcAt("suvarnatira_guard", gx, gy, 1);
    villagers("suvarnatira_villager", cx, cy, [[-14, 0], [-6, 3], [8, -1], [14, 2], [0, 10]]);
    for (let x = x0 - 1; x <= x1; x += 6) if (!occupied(x, y0 - 2) && get(x, y0 - 2) !== T.WALL && land(x, y0 - 2)) t.tree(x, y0 - 2, "palm");
    sign(x0 - 3, cy - 4, "Suvarnatira", "SUVARNATIRA, the free port. Governed by the Assembly of Ink and Coin under Provost Lalitha. No crown is owed here and no toll on books. The Archive admits any reader with clean hands and a reason; the harbour admits any ship that pays its berth.");
    places.suvarnatira = { x: cx, y: cy };
  }

  // ---------- 11. Kanthar, the Kanthari's stilt village in the Deepgreen ----------
  {
    const { x, y } = KANTHAR;
    ground(x - 12, y - 10, x + 12, y + 10, null, false);
    area(x - 14, y - 12, x + 14, y + 12, "kanthar");
    const stilt = (hx: number, hy: number, name: string) => building(hx, hy, hx + 5, hy + 4, "s", T.WOOD, undefined, { name, walls: "plank", roof: "gable", color: ROOF.thatch, chimney: false });
    stilt(x - 3, y - 9, "Grandmother Sukesh's house"); npc("kanthar_sukesh", x - 1, y - 7);
    stilt(x - 11, y - 3, "A stilt house of the Kanthari"); stilt(x + 6, y - 4, "A stilt house of the Kanthari"); stilt(x - 9, y + 4, "Tula's weaving house"); npc("kanthar_trader", x - 7, y + 6);
    stilt(x + 5, y + 4, "A stilt house of the Kanthari");
    put2(x, y, "campfire", "The village fire, kept under a roof of leaves", false);
    for (const [dx, dy, kind, name] of [[3, 2, "drying_rack", "Fish and bamboo shoots drying"], [-4, 2, "logpile", "Bamboo, cut and stacked"], [9, 0, "drying_rack", "Pepper vines drying"], [-12, 8, "boat", "A dugout canoe"]] as const) put2(x + dx, y + dy, kind, name);
    npcAt("kanthar_hunter", x + 3, y - 2, 2); npcAt("kanthar_hunter", x - 6, y + 1, 2);
    villagers("kanthar_villager", x, y, [[-4, -2], [5, 1], [0, 6], [-8, 0]]);
    sign(x + 10, y - 8, "Kanthar", "KANTHAR, of the Kanthari. The forest is not a road. Ask before you cut, ask before you hunt, ask before you take anything that grows. Grandmother Sukesh answers for the village.");
    // The loggers' camp at the Deepgreen's edge, a day's walk from the village and closer every year.
    ground(1300, 788, 1312, 798, null, false);
    for (const [dx, dy] of [[0, 0], [4, 2], [8, 0]] as const) put2(1302 + dx, 790 + dy, "logpile", "Teak logs, stamped with Shailagarh's peak");
    put2(1306, 795, "tent", "A loggers' tent, the canvas green with mould"); npcAt("deepgreen_logger", 1304, 793, 2); npcAt("deepgreen_logger", 1309, 791, 2);
    places.kanthar = { x, y: y + 2 };
  }

  // ---------- 12. Trees, rocks and fishing: the country's own things ----------
  const plant = (x0: number, y0: number, x1: number, y1: number, count: number, kinds: readonly TreeKind[], ok: (x: number, y: number) => boolean) =>
    t.scatter(x0, y0, x1, y1, count, (x, y) => t.tree(x, y, kinds[Math.floor(random() * kinds.length)]), (x, y) => land(x, y) && !occupied(x, y) && ok(x, y));
  const regionIs = (x: number, y: number, id: RegionId) => ctx.region[tileIndex(x, y)] === REGION_INDEX(id);
  const soft = (x: number, y: number) => get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS;
  plant(1146, 776, 1344, 872, 520, ["bamboo", "willow", "palm", "maple", "bamboo", "palm"], (x, y) => regionIs(x, y, "deepgreen") && soft(x, y));
  plant(1376, 572, 1626, 668, 170, ["pine", "pine", "cedar"], (x, y) => regionIs(x, y, "shaila_highlands") && (soft(x, y) || get(x, y) === T.GRAVEL));
  plant(1180, 580, 1400, 780, 150, ["tree", "oak", "palm", "willow"], (x, y) => regionIs(x, y, "ilavati_valley") && soft(x, y));
  plant(1330, 660, 1580, 872, 110, ["tree", "palm", "oak"], (x, y) => regionIs(x, y, "parasol_plains") && soft(x, y));
  plant(1550, 650, MEGHAVAN.x1, 872, 90, ["palm", "palm", "palm", "tree"], (x, y) => regionIs(x, y, "golden_shore") && (soft(x, y) || get(x, y) === T.SAND));
  t.scatter(MEGHAVAN.x0, 640, 1180, 780, 40, (x, y) => { const r = random(); if (r < 0.5) decor(x, y, "bush", true, "A thorn bush, greening"); else decor(x, y, "boulder"); }, (x, y) => land(x, y) && !occupied(x, y) && regionIs(x, y, "rain_pass") && open(get(x, y)));
  t.scatter(1180, 580, 1600, 870, 60, (x, y) => decor(x, y, "flowers", false, "Monsoon lilies"), (x, y) => land(x, y) && !occupied(x, y) && soft(x, y) && !regionIs(x, y, "shaila_highlands"));
  for (const [cx, cy, kind, n] of [[1400, 596, "blackiron", 4], [1560, 600, "moonsilver", 3], [1590, 640, "glimmer", 3], [1120, 690, "clay", 3], [1340, 860, "clay", 3]] as const) t.rockCluster(cx, cy, 8, kind as RockKind, n);
  t.shoreSpots(1240, 600, 1460, 870, "lure", 8);
  t.shoreSpots(1560, 680, MEGHAVAN.x1, 860, "net", 6);
  t.shoreSpots(1600, 740, MEGHAVAN.x1, 800, "deep", 3);

  // ---------- 13. The creatures, by country ----------
  const populate = (id: RegionId, monsters: readonly string[], count: number) => {
    const index = REGION_INDEX(id);
    for (let k = 0, tries = 0; k < count && tries < count * 80; tries++) {
      const x = MEGHAVAN.x0 + Math.floor(random() * BW), y = MEGHAVAN.y0 + Math.floor(random() * (MEGHAVAN.y1 - MEGHAVAN.y0));
      if (ctx.region[tileIndex(x, y)] !== index || !land(x, y) || !open(get(x, y)) || get(x, y) === T.PATH || occupied(x, y)) continue;
      monsterAt(monsters[k % monsters.length], x, y, 5); k++;
    }
  };
  populate("rain_pass", ["rain_dacoit", "rock_langur", "hooded_serpent"], 14);
  populate("ilavati_valley", ["jewelled_peafowl", "giant_rain_frog", "monsoon_leech", "wild_gaur"], 22);
  populate("parasol_plains", ["wild_gaur", "hooded_serpent", "rain_dacoit", "jewelled_peafowl"], 20);
  populate("shaila_highlands", ["crag_bear", "rock_langur", "highland_deserter"], 20);
  populate("golden_shore", ["giant_rain_frog", "jewelled_peafowl", "shore_corsair"], 12);
  populate("deepgreen", ["deepgreen_tiger", "monsoon_leech", "vine_strangler", "hooded_serpent"], 26);
  void W; void OVERWORLD_H;
}

import { REGIONS } from "./world.ts";
const REGION_INDEX = (id: RegionId) => REGIONS.findIndex(region => region.id === id);
