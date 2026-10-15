/**
 * The Prismwild: the magical land past the north, in the sea off the Zoryavik's north-east (built after the north, in the
 * grown world's own coordinates). It's reached on foot over the Glass Causeway, a spit of shardstone from the Zoryavik's
 * northern coast, its lamps lit by the Collegium. The grass is lilac; crystals of every colour and size grow out of the
 * ground, from clusters at your ankle to the Shardfields' giants taller than towers; the fae trees hang with lights. Its
 * places:
 * - The Lilac Downs (the Prismwild itself): rolling purple meadows, glimmer moths and glimmer stags, crystals everywhere.
 * - The Collegium of the Seventh Lamp: the wizards' walled college on the downs, where they live and learn: the Great
 *   Hall, the Library, the Seventh Lamp's tower, the students' and tutors' halls, the stores (prismtalk.ts has its people).
 * - The Starwood: a forest of fae trees, dark lilac underfoot, prism wisps drifting through it.
 * - The Fae Hollows: glens of ponds and fairy rings, where the fae live, and Lady Hawthorn holds her court.
 * - The Shardfields: stony hills grown over with crystal, the giants among them, shard golems walking.
 * - Fennick's Labyrinth: the Collegium's maddest wizard's hedge maze, run against the clock (labyrinth.ts).
 */
import { REGIONS, T, W, WALKABLE, isWater, worldTools, type GenContext, type RegionId, type World } from "./world.ts";
import { LABYRINTH, MAZE_GATE, MAZE_SIZE, cellTile, layLabyrinth } from "./labyrinth.ts";

/** The Prismwild's regions (render.ts paints their grass lilac). */
export const PRISM_REGION_IDS: readonly RegionId[] = ["prismwild", "glass_causeway", "collegium", "starwood", "fae_hollows", "shardfields", "fennicks_labyrinth", "spirehollow", "bellwhistle", "mothwick", "shardstead", "tumbledown"];
/** The wizards' towns and villages. */
export const SPIREHOLLOW = { x0: 1206, y0: 102, x1: 1274, y1: 158 } as const, BELLWHISTLE = { x0: 1404, y0: 276, x1: 1474, y1: 328 } as const;
export const MOTHWICK = { x0: 1314, y0: 286, x1: 1348, y1: 316 } as const, SHARDSTEAD = { x0: 1480, y0: 124, x1: 1510, y1: 154 } as const, TUMBLEDOWN = { x0: 1284, y0: 44, x1: 1322, y1: 70 } as const;
const SETTLEMENTS = [SPIREHOLLOW, BELLWHISTLE, MOTHWICK, SHARDSTEAD, TUMBLEDOWN];
/** The land's bounds, and its places. */
export const PRISMWILD = { x0: 1186, y0: 30, x1: 1694, y1: 350 } as const;
export const COLLEGIUM = { x0: 1366, y0: 50, x1: 1446, y1: 118 } as const;
export const STARWOOD = { x: 1400, y: 212, rx: 78, ry: 54 } as const;
export const FAE_HOLLOWS = { x: 1252, y: 272, rx: 58, ry: 56 } as const;
export const SHARDFIELDS = { x: 1600, y: 112, rx: 86, ry: 74 } as const;
/** Where Pell dances in Lady Hawthorn's ring (prismtalk.ts), and the satchel he dropped on the way. */
export const THORN_RING = { x: 1240, y: 262 } as const, PELL_SATCHEL = { x: 1268, y: 236 } as const;
/** The Causeway's row (it runs east from the Zoryavik's coast to the Prismwild's). */
export const CAUSEWAY_Y = 44;

function noiseOf(seed: number, scale: number) {
  let s = seed; const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const size = 64, grid = Array.from({ length: size * size }, () => r()), at = (x: number, y: number) => grid[((y % size + size) % size) * size + ((x % size + size) % size)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
  };
}
const inEllipse = (e: { x: number; y: number; rx: number; ry: number }, x: number, y: number, k = 1) => ((x - e.x) / e.rx) ** 2 + ((y - e.y) / e.ry) ** 2 <= k;

export function buildPrismwild(ctx: GenContext, labels: World["labels"], places: World["places"]) {
  const t = worldTools(ctx), { tiles, lift, raise, random } = ctx, P = PRISMWILD;
  const idx = (x: number, y: number) => y * W + x;
  const broad = noiseOf(5101, 52), mid = noiseOf(5111, 17), fine = noiseOf(5123, 6), hills = noiseOf(5131, 29);
  const label = (id: RegionId, x: number, y: number) => { const entry = REGIONS.find(region => region.id === id) as { label: { x: number; y: number } } | undefined; if (entry) { entry.label = { x, y }; labels[id] = { x, y }; } };

  // ---------- The land: a broad rounded island, its coast wandering, firm where the Collegium, the maze and the Causeway's landing are ----------
  const R = 56, cx = (P.x0 + P.x1) / 2, cy = (P.y0 + P.y1) / 2, hx = (P.x1 - P.x0) / 2 - R, hy = (P.y1 - P.y0) / 2 - R;
  const firm = [[LABYRINTH.x0 - 10, LABYRINTH.y0 - 8, LABYRINTH.x0 + MAZE_SIZE + 8, LABYRINTH.y0 + MAZE_SIZE + 14], [COLLEGIUM.x0 - 10, COLLEGIUM.y0 - 8, COLLEGIUM.x1 + 10, COLLEGIUM.y1 + 10], ...SETTLEMENTS.map(r => [r.x0 - 3, r.y0 - 3, r.x1 + 3, r.y1 + 3] as const)] as const;
  const coast = (x: number, y: number) => {
    const qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy;
    let d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R + (broad(x, y) - 0.5) * 30 + (mid(x, y) - 0.5) * 9;
    for (const [a, b, c, e] of firm) if (x >= a && x <= c && y >= b && y <= e) d = Math.min(d, -6);
    return d;
  };
  const X0 = P.x0 - 24, X1 = Math.min(W - 18, P.x1 + 14), Y0 = 18, Y1 = P.y1 + 16;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = idx(x, y), was = tiles[i];
    if (!isWater(was) && was !== T.VOID) continue;   // (the Zoryavik's own coast stays as it is)
    const d = coast(x, y);
    if (d > 4) continue;
    t.clearAt(x, y); t.setRegion(x, y, "prismwild"); lift[i] = 0; raise[i] = 0;
    if (d > 0) { tiles[i] = T.WATER; continue; }
    tiles[i] = d > -3 ? T.SAND : mid(x + 31, y) > 0.6 ? T.DARK_GRASS : T.GRASS;
    // Rolling downs; the inland rises.
    const inland = Math.min(1, -d / 30), h = hills(x, y);
    lift[i] = inland * (0.15 + h * 0.5); raise[i] = inland * (0.25 + Math.max(0, h - 0.4) * 1.6);
  }

  // ---------- The Shardfields: stony hills, crystal everywhere ----------
  for (let y = SHARDFIELDS.y - SHARDFIELDS.ry; y <= SHARDFIELDS.y + SHARDFIELDS.ry; y++) for (let x = SHARDFIELDS.x - SHARDFIELDS.rx; x <= SHARDFIELDS.x + SHARDFIELDS.rx; x++) {
    const i = idx(x, y);
    if (!inEllipse(SHARDFIELDS, x, y, 1 + (mid(x, y) - 0.5) * 0.3) || isWater(tiles[i]) || tiles[i] === T.SAND) continue;
    t.setRegion(x, y, "shardfields");
    const e = 1 - Math.sqrt(((x - SHARDFIELDS.x) / SHARDFIELDS.rx) ** 2 + ((y - SHARDFIELDS.y) / SHARDFIELDS.ry) ** 2), h = hills(x * 1.6, y * 1.6);
    tiles[i] = fine(x, y) > 0.62 ? T.STONE : h > 0.5 || mid(x, y) > 0.55 ? T.GRAVEL : T.DARK_GRASS;
    raise[i] = Math.max(raise[i], e * (1.2 + h * 2.2)); lift[i] = Math.max(lift[i], e * (0.4 + h * 0.6));
  }
  // ---------- The Starwood: lush dark lilac ----------
  for (let y = STARWOOD.y - STARWOOD.ry - 6; y <= STARWOOD.y + STARWOOD.ry + 6; y++) for (let x = STARWOOD.x - STARWOOD.rx - 6; x <= STARWOOD.x + STARWOOD.rx + 6; x++) {
    const i = idx(x, y);
    if (!inEllipse(STARWOOD, x, y, 1 + (broad(x * 2, y * 2) - 0.5) * 0.4) || isWater(tiles[i]) || tiles[i] === T.SAND) continue;
    t.setRegion(x, y, "starwood"); tiles[i] = mid(x, y) > 0.35 ? T.DARK_GRASS : T.GRASS;
  }
  // ---------- The Fae Hollows: glens and ponds ----------
  for (let y = FAE_HOLLOWS.y - FAE_HOLLOWS.ry; y <= FAE_HOLLOWS.y + FAE_HOLLOWS.ry; y++) for (let x = FAE_HOLLOWS.x - FAE_HOLLOWS.rx; x <= FAE_HOLLOWS.x + FAE_HOLLOWS.rx; x++) {
    const i = idx(x, y);
    if (!inEllipse(FAE_HOLLOWS, x, y, 1 + (mid(x * 1.3, y) - 0.5) * 0.35) || isWater(tiles[i]) || tiles[i] === T.SAND) continue;
    t.setRegion(x, y, "fae_hollows"); tiles[i] = fine(x, y) > 0.5 ? T.DARK_GRASS : T.GRASS;
    // Hollows: the ground dips into glens.
    raise[i] = Math.min(raise[i], 0.5); lift[i] = Math.max(0, lift[i] - 0.15);
  }
  for (const [px, py, r] of [[1236, 286, 5], [1262, 296, 4], [1278, 258, 6], [1226, 246, 4], [1290, 288, 3]] as const)
    t.blob(px, py, r, r * 0.75, T.WATER, 0.3, terrain => terrain === T.GRASS || terrain === T.DARK_GRASS);

  // ---------- Fennick's Labyrinth (labyrinth.ts lays it out): level ground, the hedges, the doors, the glyphs, the coffers, the heart ----------
  for (let y = LABYRINTH.y0 - 4; y <= LABYRINTH.y0 + MAZE_SIZE + 8; y++) for (let x = LABYRINTH.x0 - 4; x <= LABYRINTH.x0 + MAZE_SIZE + 3; x++) {
    const i = idx(x, y); t.clearAt(x, y); lift[i] = 0.1; raise[i] = 0; t.setRegion(x, y, "fennicks_labyrinth");
    if (isWater(tiles[i]) || tiles[i] === T.SAND) tiles[i] = T.GRASS;
  }
  const mazeDecor = (x: number, y: number, kind: Parameters<typeof t.decor>[2], clue: string, blocks: boolean, name?: string) => { const o = t.decor(x, y, kind, blocks, name); if (o) ctx.objects[o.id] = { ...o, clue }; };
  layLabyrinth({
    wall: (x, y) => { tiles[idx(x, y)] = T.WALL; },
    floor: (x, y) => { tiles[idx(x, y)] = T.STONE; },
    door: (x, y, set) => mazeDecor(x, y, "maze_door", set ? "maze_door_b" : "maze_door_a", true),
    glyph: (x, y) => mazeDecor(x, y, "maze_glyph", "maze_glyph", false),
    coffer: (x, y) => mazeDecor(x, y, "chest", "maze_coffer", true, "Fennick's coffer"),
    heart: (x, y) => mazeDecor(x + 1, y + 1, "hourglass", "maze_heart", true),
  });
  { const entry = cellTile((LABYRINTH.n - 1) / 2, LABYRINTH.n - 1); mazeDecor(entry.x + 1, entry.y + 1, "lumen_lamp", "maze_thread", true, "Fennick's thread"); }
  // The gate outside: a flagged yard, Fennick and his stall, a sign.
  for (let y = MAZE_GATE.y - 1; y <= MAZE_GATE.y + 4; y++) for (let x = MAZE_GATE.x - 8; x <= MAZE_GATE.x + 8; x++) tiles[idx(x, y)] = T.STONE;
  t.npc("fennick", MAZE_GATE.x + 2, MAZE_GATE.y + 1, 0);
  t.add({ kind: "sign", x: MAZE_GATE.x - 3, y: MAZE_GATE.y, blocks: true, name: "Fennick's Labyrinth", text: "FENNICK'S LABYRINTH. Eight minutes. Every ring nearer the heart pays. The doors turn. Mind the glyphs. Talk to me to run it. (Signed, F.)" });
  for (const dx of [-7, 7]) { t.decor(MAZE_GATE.x + dx, MAZE_GATE.y - 1, "lumen_lamp", true); t.decor(MAZE_GATE.x + dx, MAZE_GATE.y + 4, "prism_spire", true); }

  // ---------- The Collegium of the Seventh Lamp ----------
  const C = COLLEGIUM;
  for (let y = C.y0; y <= C.y1; y++) for (let x = C.x0; x <= C.x1; x++) {
    const i = idx(x, y); t.clearAt(x, y); t.setRegion(x, y, "collegium"); lift[i] = 0.2; raise[i] = 0;
    const edge = x === C.x0 || x === C.x1 || y === C.y0 || y === C.y1;
    tiles[i] = edge ? T.WALL : T.COBBLE;
  }
  const southGate = Math.floor((C.x0 + C.x1) / 2), westGate = Math.floor((C.y0 + C.y1) / 2) + 2;
  for (const x of [southGate, southGate + 1]) tiles[idx(x, C.y1)] = T.COBBLE;
  for (const y of [westGate, westGate + 1]) tiles[idx(C.x0, y)] = T.COBBLE;
  (ctx.ramparts ??= []).push({ x0: C.x0, y0: C.y0, x1: C.x1, y1: C.y1, storeys: 1, walls: "marble" });
  const hall = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Record<string, unknown>) =>
    t.building(x0, y0, x1, y1, door, T.STONE, undefined, { name, walls: "marble", roof: "gable", color: "#5d4a8e", ...extra });
  hall(1392, 54, 1420, 70, "s", "The Great Hall", { storeys: 2, hip: true, facade: "civic" });
  hall(1370, 54, 1386, 70, "e", "The Library of the Seventh Lamp", { storeys: 2, color: "#4a3a6a" });
  hall(1426, 55, 1434, 63, "s", "The Seventh Lamp", { roof: "cone", round: true, storeys: 4, spire: 14, color: "#7a5ab8" });
  t.building(1370, 92, 1388, 104, "n", T.WOOD, undefined, { name: "The Students' Hall", walls: "timber", roof: "gable", color: "#6a4a8a", storeys: 2 });
  t.building(1424, 92, 1442, 104, "n", T.WOOD, undefined, { name: "The Tutors' Hall", walls: "timber", roof: "gable", hip: true, color: "#6a4a8a", storeys: 2 });
  t.building(1392, 100, 1400, 108, "n", T.WOOD, undefined, { name: "The Collegium Stores", walls: "marble", roof: "gable", color: "#8a5ab0", facade: "shop", sign: "staff" });
  // The courtyard: a fountain, lamps, benches, gardens.
  t.add({ kind: "fountain", x: 1405, y: 81, blocks: true, name: "The Lamp Fountain" }); t.add({ kind: "fountain", x: 1406, y: 81, blocks: true, name: "The Lamp Fountain" });
  t.add({ kind: "fountain", x: 1405, y: 82, blocks: true, name: "The Lamp Fountain" }); t.add({ kind: "fountain", x: 1406, y: 82, blocks: true, name: "The Lamp Fountain" });
  for (const [x, y] of [[1398, 76], [1413, 76], [1398, 88], [1413, 88], [1380, 80], [1432, 80], [1405, 112], [1376, 86], [1436, 86]] as const) t.decor(x, y, "lumen_lamp", true);
  for (const [x, y] of [[1401, 78], [1410, 78], [1401, 86], [1410, 86]] as const) t.decor(x, y, "bench", true);
  t.scatter(1372, 74, 1440, 90, 26, (x, y) => { t.decor(x, y, "flowers", false); }, (x, y) => t.free(x, y) && Math.abs(x - 1405) > 4 && tiles[idx(x, y)] === T.COBBLE && (y < 78 || y > 86 || x < 1395 || x > 1416));
  for (const [x, y] of [[1376, 76], [1434, 76], [1376, 88]] as const) t.decor(x, y, "prism_spire", true);
  // The Bursary: the Collegium's bank, its own marble house.
  t.building(1426, 67, 1436, 75, "s", T.STONE, undefined, { name: "The Bursary", walls: "marble", roof: "gable", hip: true, color: "#5d4a8e", facade: "bank" });
  for (const x of [1428, 1431, 1434]) t.add({ kind: "bank", x, y: 70, blocks: true, name: "Bank chest" });
  t.npc("archmagister_vey", 1406, 64, 0); t.npc("tutor_quill", 1396, 103, 0); t.npc("librarian_osk", 1378, 62, 0);
  t.npc("banker", 1431, 68, 0);
  for (const [x, y] of [[1384, 80], [1424, 84], [1405, 92], [1394, 74], [1418, 72], [1380, 98]] as const) t.npc("collegium_student", x, y, 4);
  t.npc("pell_ashby", 1430, 98, 2);
  places.collegium = { x: 1405, y: 90 };

  // ---------- The wizards' towns and villages: Spirehollow, Bellwhistle, Mothwick, Shardstead, Tumbledown ----------
  // Wizards build as they please: towers in hats, a clock that runs backwards, a market in the air, houses in teapots,
  // mushrooms and each other's way.
  const settle = (r: { x0: number; y0: number; x1: number; y1: number }, id: RegionId) => {
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
      const i = idx(x, y); t.clearAt(x, y); t.setRegion(x, y, id); lift[i] = 0.15; raise[i] = 0;
      if (isWater(tiles[i]) || tiles[i] === T.SAND) tiles[i] = T.GRASS;
    }
  };
  const paint = (x0: number, y0: number, x1: number, y1: number, terrain: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles[idx(x, y)] = terrain; };
  const COLOURS = ["#9a72e8", "#e47ac4", "#5fc8c0", "#ecb45a", "#6a4a8a", "#3a7a7a", "#c94a5a"] as const;
  /** A wizard's tower: round, its cone roof drawn up into a tall hat with a spire, in whatever colour its wizard likes. */
  const tower = (x0: number, y0: number, door: "n" | "s" | "e" | "w", colour: number, storeys: number, name = "A wizard's tower") =>
    t.building(x0, y0, x0 + 6, y0 + 6, door, T.WOOD, undefined, { name, walls: storeys % 2 ? "timber" : "plank", roof: "cone", round: true, color: COLOURS[colour % COLOURS.length], storeys, spire: 120 + storeys * 24 + (colour % 3) * 14 });
  /** A big decor house: the picture on one tile, its unseen footings round it so you walk round the whole thing. */
  const big = (x: number, y: number, kind: Parameters<typeof t.decor>[2], name?: string) => {
    t.clearAt(x, y); t.decor(x, y, kind, true, name);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]] as const) { t.clearAt(x + dx, y + dy); t.decor(x + dx, y + dy, "footing", true); }
  };
  const candle = (x: number, y: number) => { t.clearAt(x, y); t.decor(x, y, "giant_candle", true); };
  // Spirehollow, the town of hats: wizards' towers round a square, the Mayor's the tallest, Hattie's hat shop, the bank, the Tilted Toad.
  { const S = SPIREHOLLOW; settle(S, "spirehollow");
    paint(S.x0 + 2, 130, S.x1 - 2, 131, T.PATH); paint(1239, S.y0 + 10, 1241, 138, T.PATH); paint(1228, 122, 1252, 137, T.COBBLE);
    tower(1210, 106, "s", 0, 5, "The Mayor's Spire"); tower(1222, 106, "s", 1, 3); tower(1264, 106, "s", 2, 4);
    t.building(1250, 106, 1258, 112, "s", T.WOOD, undefined, { name: "Hattie's Hats", walls: "timber", roof: "gable", hip: true, color: "#ecb45a", facade: "shop", sign: "spiral_wizard_hat" });
    tower(1210, 141, "n", 6, 3); tower(1222, 143, "n", 4, 2); tower(1266, 141, "n", 5, 3);
    t.building(1254, 141, 1262, 147, "n", T.STONE, undefined, { name: "The Spirehollow Bank", walls: "marble", roof: "gable", hip: true, color: "#6a4a8a", facade: "bank" });
    t.building(1234, 141, 1246, 149, "n", T.WOOD, undefined, { name: "The Tilted Toad", walls: "plank", roof: "gable", color: "#7a4a9a", facade: "inn", storeys: 2 });
    for (const x of [1256, 1258, 1260]) t.add({ kind: "bank", x, y: 143, blocks: true, name: "Bank booth" });
    big(1214, 126, "topsy_tower", "Uncle Bartlemy's tower");
    for (const [x, y] of [[1228, 122], [1252, 122], [1228, 137], [1252, 137], [1236, 126], [1244, 126]] as const) candle(x, y);
    t.npc("mayor_hatterly", 1213, 109, 0); t.npc("hattie_pennyfeather", 1254, 109, 0); t.npc("uncle_bartlemy", 1214, 129, 2); t.npc("banker", 1258, 142, 0);
    for (const [x, y] of [[1232, 126], [1248, 132], [1240, 134], [1230, 133], [1220, 130], [1262, 130]] as const) t.npc("prismwild_villager", x, y, 5);
    t.add({ kind: "sign", x: 1238, y: 120, blocks: true, name: "Spirehollow", text: "SPIREHOLLOW. Population: wizards. Hats are not optional. The Mayor's Spire is the tall one. They're all tall ones." }); }
  // Bellwhistle, the market town: the Backwards Clock, the Fizzing Fountain, the floating market, the Moot, the Kettle, houses in teapots.
  { const B = BELLWHISTLE; settle(B, "bellwhistle");
    paint(1420, 290, 1458, 310, T.COBBLE); paint(B.x0 + 2, 300, B.x1 - 2, 301, T.PATH); paint(1438, B.y0 + 2, 1440, B.y1 - 2, T.PATH);
    big(1439, 288, "backwards_clock", "The Backwards Clock");
    for (const [x, y] of [[1437, 299], [1438, 299], [1437, 300], [1438, 300]] as const) { t.clearAt(x, y); t.add({ kind: "fountain", x, y, blocks: true, name: "The Fizzing Fountain" }); }
    for (const [x, y] of [[1450, 295], [1455, 302], [1450, 308]] as const) { t.clearAt(x, y); t.decor(x, y, "floating_isle", true, "A floating stall"); }
    t.building(1407, 279, 1417, 287, "e", T.STONE, undefined, { name: "The Bellwhistle Moot", walls: "marble", roof: "gable", hip: true, color: "#e47ac4", facade: "civic", storeys: 2 });
    t.building(1461, 279, 1469, 287, "w", T.WOOD, undefined, { name: "The Fizzing Kettle", walls: "timber", roof: "gable", hip: true, color: "#5fc8c0", facade: "shop", sign: "fizzing_tonic" });
    t.building(1407, 313, 1415, 321, "e", T.STONE, undefined, { name: "The Bellwhistle Bank", walls: "marble", roof: "gable", hip: true, color: "#9a72e8", facade: "bank" });
    for (const y of [315, 317, 319]) t.add({ kind: "bank", x: 1410, y, blocks: true, name: "Bank booth" });
    t.building(1461, 313, 1469, 321, "w", T.WOOD, undefined, { name: "A wizard's house", walls: "plank", roof: "gable", hip: true, color: "#ecb45a", storeys: 2 });
    tower(1422, 314, "n", 3, 3); tower(1446, 314, "n", 0, 4); tower(1428, 279, "s", 1, 2); tower(1448, 279, "s", 5, 3);
    big(1415, 301, "teapot_house", "Mrs Kettleby's teapot"); big(1467, 301, "teapot_house", "A teapot house");
    for (const [x, y] of [[1420, 290], [1458, 290], [1420, 310], [1458, 310], [1430, 296], [1446, 304]] as const) candle(x, y);
    t.npc("clockwarden_tibbet", 1441, 291, 0); t.npc("mother_fizzwig", 1465, 283, 0); t.npc("gideon_wickerbottom", 1452, 302, 0); t.npc("mrs_kettleby", 1417, 304, 1); t.npc("banker", 1409, 317, 0);
    for (const [x, y] of [[1426, 294], [1434, 306], [1444, 294], [1428, 304], [1452, 292], [1440, 308], [1424, 300], [1456, 306]] as const) t.npc("prismwild_villager", x, y, 6);
    t.add({ kind: "sign", x: 1436, y: 312, blocks: true, name: "Bellwhistle", text: "BELLWHISTLE. Market every day but Grumpsday. The clock is right; it's going the other way, that's all. Do not drink from the fountain. (Everyone does.)" }); }
  // Mothwick: mushroom houses at the edge of the Fae Hollows, and Old Mossy who tends them.
  { const M = MOTHWICK; settle(M, "mothwick"); paint(M.x0 + 2, 300, M.x1 - 2, 300, T.PATH);
    for (const [x, y] of [[1320, 293], [1330, 291], [1341, 295], [1322, 309], [1333, 310], [1343, 307]] as const) big(x, y, "mushroom_house");
    for (const [x, y] of [[1326, 300], [1338, 302]] as const) { t.clearAt(x, y); t.decor(x, y, "fae_ring", false); }
    candle(1316, 300); candle(1346, 300);
    t.npc("old_mossy", 1331, 299, 1); for (const [x, y] of [[1324, 303], [1336, 297], [1342, 301]] as const) t.npc("prismwild_villager", x, y, 3); t.npc("fae_folk", 1328, 305, 4); }
  // Shardstead: the crystal-miners' village at the Shardfields' edge.
  { const H = SHARDSTEAD; settle(H, "shardstead"); paint(H.x0 + 2, 137, H.x1 - 2, 138, T.PATH); paint(1494, H.y0 + 1, 1495, H.y1 - 1, T.PATH);
    t.building(1482, 126, 1488, 132, "s", T.STONE, undefined, { name: "A miner's house", walls: "stone", roof: "gable", color: "#b8a2d6" });
    t.building(1498, 126, 1504, 132, "s", T.STONE, undefined, { name: "A miner's house", walls: "stone", roof: "gable", color: "#9a72e8" });
    t.building(1482, 143, 1488, 149, "n", T.STONE, undefined, { name: "A miner's house", walls: "stone", roof: "gable", color: "#cbb8f0" });
    t.building(1498, 142, 1507, 150, "n", T.STONE, undefined, { name: "The Sorting Shed", walls: "plank", roof: "gable", color: "#6a4a8a" });
    for (const [x, y] of [[1490, 134], [1506, 136], [1490, 141], [1484, 136]] as const) { t.clearAt(x, y); t.decor(x, y, "prism_crystal", true); }
    for (const [x, y] of [[1500, 140], [1502, 140], [1504, 140]] as const) { t.clearAt(x, y); t.decor(x, y, "crate", true, "A crate of sorted crystal"); }
    t.npc("foreman_glint", 1496, 136, 1); for (const [x, y] of [[1488, 138], [1500, 135], [1492, 141]] as const) t.npc("prismwild_villager", x, y, 3); }
  // Tumbledown: crooked houses on the north coast, and the Leaning Larder.
  { const D = TUMBLEDOWN; settle(D, "tumbledown"); paint(D.x0 + 2, 57, D.x1 - 4, 58, T.PATH);
    for (const [x, y] of [[1290, 52], [1300, 50], [1311, 53], [1294, 65], [1306, 66]] as const) big(x, y, "crooked_house");
    t.building(1314, 60, 1320, 66, "w", T.WOOD, undefined, { name: "The Leaning Larder", walls: "plank", roof: "gable", color: "#8a3a5a" });
    candle(1288, 58); candle(1318, 56);
    t.npc("wilhelmina_crooke", 1302, 59, 2); for (const [x, y] of [[1296, 57], [1310, 58], [1290, 60]] as const) t.npc("prismwild_villager", x, y, 3); }

  // ---------- Roads, lit by lumen lamps ----------
  const roadLine = (points: readonly (readonly [number, number])[]) => {
    t.line(points, 3, (x, y, terrain) => {
      if (terrain === T.WALL || terrain === T.VOID || terrain === T.COBBLE || terrain === T.STONE || terrain === T.WOOD) return;
      t.clearAt(x, y); tiles[idx(x, y)] = isWater(terrain) || terrain === T.BRIDGE ? T.BRIDGE : T.PATH;
    });
    for (let k = 0; k + 1 < points.length; k++) { const [ax, ay] = points[k], [bx, by] = points[k + 1], n = Math.floor(Math.hypot(bx - ax, by - ay) / 14); for (let s = 1; s <= n; s++) { const x = Math.round(ax + (bx - ax) * s / (n + 1)), y = Math.round(ay + (by - ay) * s / (n + 1)) - 3; if (t.free(x, y)) t.decor(x, y, "lumen_lamp", true); } }
  };
  // Where the Causeway comes ashore: the first land along its row.
  let landing = P.x0 - 20; while (landing < P.x0 + 80 && (isWater(tiles[idx(landing, CAUSEWAY_Y)]) || tiles[idx(landing, CAUSEWAY_Y)] === T.VOID)) landing++;
  landing += 2;
  roadLine([[landing, CAUSEWAY_Y], [1250, 64], [1320, 86], [C.x0 - 1, westGate]]);
  roadLine([[southGate, C.y1], [southGate, 128], [1470, 152], [1530, 200], [LABYRINTH.x0 - 8, 250], [LABYRINTH.x0 - 8, MAZE_GATE.y + 6], [MAZE_GATE.x, MAZE_GATE.y + 6], [MAZE_GATE.x, MAZE_GATE.y + 2]]);
  roadLine([[1320, 86], [1300, 150], [1272, 214], [1256, 244]]);
  roadLine([[C.x1, 84], [1470, 92], [1530, 108]]);
  roadLine([[1240, SPIREHOLLOW.y0], [1246, 66]]); roadLine([[SPIREHOLLOW.x1, 130], [1300, 140]]);
  roadLine([[BELLWHISTLE.x1, 300], [LABYRINTH.x0 - 8, 300]]); roadLine([[BELLWHISTLE.x0, 300], [MOTHWICK.x1, 300]]);
  roadLine([[MOTHWICK.x0, 300], [1290, 270], [1262, 248]]); roadLine([[1494, SHARDSTEAD.y0], [1500, 100]]); roadLine([[1303, TUMBLEDOWN.y1], [1300, 80]]);

  // ---------- The Glass Causeway: a spit of shardstone from the Zoryavik's north coast, and a way cleared in from it ----------
  let coastX = PRISMWILD.x0 - 1;
  while (coastX > 1000 && (isWater(tiles[idx(coastX, CAUSEWAY_Y)]) || tiles[idx(coastX, CAUSEWAY_Y)] === T.VOID)) coastX--;
  for (let x = coastX - 1; x <= landing; x++) for (let dy = -2; dy <= 2; dy++) {
    const y = CAUSEWAY_Y + dy, i = idx(x, y);
    if (!isWater(tiles[i]) && x > coastX + 1) continue;
    t.clearAt(x, y); tiles[i] = Math.abs(dy) <= 1 ? T.GRAVEL : T.SAND; lift[i] = 0; raise[i] = 0; t.setRegion(x, y, "glass_causeway");
  }
  for (let x = coastX + 4; x < landing - 2; x += 6) for (const dy of [-2, 2]) { const y = CAUSEWAY_Y + dy; t.clearAt(x, y); t.decor(x, y, (x / 6) % 2 < 1 ? "lumen_lamp" : "prism_crystal", true); }
  // In from the Zoryavik's side to its nearest road (the forest's trees cleared off it).
  { let best: [number, number] | null = null, bestD = 1e9;
    for (let y = 20; y < 200; y++) for (let x = 940; x <= coastX; x++) if (tiles[idx(x, y)] === T.PATH) { const d = Math.hypot(x - coastX, (y - CAUSEWAY_Y) * 1.2); if (d < bestD) { bestD = d; best = [x, y]; } }
    if (best) t.line([[coastX + 1, CAUSEWAY_Y], [best[0], CAUSEWAY_Y], best], 3, (x, y, terrain) => {
      if (terrain === T.WALL || terrain === T.VOID || terrain === T.COBBLE || terrain === T.STONE || terrain === T.WOOD) return;
      t.clearAt(x, y); tiles[idx(x, y)] = isWater(terrain) || terrain === T.BRIDGE ? T.BRIDGE : T.PATH;
    }); }
  t.add({ kind: "sign", x: landing + 3, y: CAUSEWAY_Y - 3, blocks: true, name: "The Prismwild", text: "THE PRISMWILD. The Collegium of the Seventh Lamp: east, along the lamps. The Fae Hollows: south. Fennick's Labyrinth: far south-east. Do not eat anything that glows." });
  t.clearAt(coastX + 3, CAUSEWAY_Y - 2); t.add({ kind: "sign", x: coastX + 3, y: CAUSEWAY_Y - 2, blocks: true, name: "The Glass Causeway", text: "THE GLASS CAUSEWAY. To the Prismwild and the Collegium of the Seventh Lamp. The lamps are lit by the Collegium. Please do not take them." });
  // Two great crystals stand either side of where the Causeway comes ashore.
  const giant = (x: number, y: number) => {
    if (!t.free(x, y)) return false;
    t.decor(x, y, "prism_giant", true);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1], [0, 1]] as const) if (t.free(x + dx, y + dy) && random() < 0.8) t.decor(x + dx, y + dy, "prism_crystal", true);
    return true;
  };
  giant(landing + 4, CAUSEWAY_Y - 6); giant(landing + 4, CAUSEWAY_Y + 6);

  // ---------- The Fae Hollows: the Thorn Ring, Lady Hawthorn's court, the fae, fairy rings ----------
  t.clearAt(THORN_RING.x, THORN_RING.y); t.decor(THORN_RING.x, THORN_RING.y, "fae_ring", false, "The Thorn Ring");
  for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2]] as const) { t.clearAt(THORN_RING.x + dx, THORN_RING.y + dy); t.decor(THORN_RING.x + dx, THORN_RING.y + dy, "fae_tree", true); }
  t.npc("pell_ashby_lost", THORN_RING.x, THORN_RING.y + 1, 0);
  t.npc("lady_hawthorn", THORN_RING.x + 5, THORN_RING.y + 3, 0);
  for (const [x, y] of [[1230, 280], [1262, 268], [1250, 300], [1284, 276], [1222, 262]] as const) t.npc("fae_folk", x, y, 5);
  t.clearAt(PELL_SATCHEL.x, PELL_SATCHEL.y); { const o = t.decor(PELL_SATCHEL.x, PELL_SATCHEL.y, "scuffs", false, "A dropped satchel"); if (o) ctx.objects[o.id] = { ...o, clue: "pell_satchel" }; }
  const inHollows = (x: number, y: number) => inEllipse(FAE_HOLLOWS, x, y, 0.9);
  t.scatter(FAE_HOLLOWS.x - FAE_HOLLOWS.rx, FAE_HOLLOWS.y - FAE_HOLLOWS.ry, FAE_HOLLOWS.x + FAE_HOLLOWS.rx, FAE_HOLLOWS.y + FAE_HOLLOWS.ry, 36, (x, y) => { t.decor(x, y, "fae_ring", false); }, (x, y) => t.free(x, y) && inHollows(x, y));
  t.scatter(FAE_HOLLOWS.x - FAE_HOLLOWS.rx, FAE_HOLLOWS.y - FAE_HOLLOWS.ry, FAE_HOLLOWS.x + FAE_HOLLOWS.rx, FAE_HOLLOWS.y + FAE_HOLLOWS.ry, 140, (x, y) => { t.decor(x, y, "flowers", false); }, (x, y) => t.free(x, y) && inHollows(x, y));
  t.scatter(FAE_HOLLOWS.x - FAE_HOLLOWS.rx, FAE_HOLLOWS.y - FAE_HOLLOWS.ry, FAE_HOLLOWS.x + FAE_HOLLOWS.rx, FAE_HOLLOWS.y + FAE_HOLLOWS.ry, 160, (x, y) => { t.decor(x, y, "fae_tree", true); }, (x, y) => t.free(x, y) && inHollows(x, y) && (x + y) % 3 !== 0 && Math.hypot(x - THORN_RING.x, y - THORN_RING.y) > 6);

  // ---------- The Starwood: fae trees close together, paths left between them ----------
  for (let y = STARWOOD.y - STARWOOD.ry; y <= STARWOOD.y + STARWOOD.ry; y++) for (let x = STARWOOD.x - STARWOOD.rx; x <= STARWOOD.x + STARWOOD.rx; x++) {
    if (!inEllipse(STARWOOD, x, y, 0.92) || x % 3 === 0 || y % 3 === 0 || !t.free(x, y)) continue;
    if (random() < 0.42) t.decor(x, y, "fae_tree", true); else if (random() < 0.03) t.decor(x, y, "prism_crystal", true);
  }
  // ---------- Crystals, everywhere; the Shardfields thick with them, the giants among them ----------
  const inSettlement = (x: number, y: number) => SETTLEMENTS.some(r => x >= r.x0 - 3 && x <= r.x1 + 3 && y >= r.y0 - 3 && y <= r.y1 + 3);
  const land = (x: number, y: number) => t.free(x, y) && !inSettlement(x, y) && (tiles[idx(x, y)] === T.GRASS || tiles[idx(x, y)] === T.DARK_GRASS || tiles[idx(x, y)] === T.GRAVEL || tiles[idx(x, y)] === T.STONE) && !(x >= C.x0 - 2 && x <= C.x1 + 2 && y >= C.y0 - 2 && y <= C.y1 + 2) && !(x >= LABYRINTH.x0 - 4 && y >= LABYRINTH.y0 - 4 && x <= LABYRINTH.x0 + MAZE_SIZE + 3 && y <= LABYRINTH.y0 + MAZE_SIZE + 8);
  const inShards = (x: number, y: number) => inEllipse(SHARDFIELDS, x, y, 0.95);
  let giants = 0;
  for (let k = 0; k < 400 && giants < 22; k++) { const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.85, x = Math.round(SHARDFIELDS.x + Math.cos(a) * r * SHARDFIELDS.rx), y = Math.round(SHARDFIELDS.y + Math.sin(a) * r * SHARDFIELDS.ry); if (land(x, y) && [[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dy]) => land(x + dx, y + dy)) && giant(x, y)) giants++; }
  for (let k = 0, placed = 0; k < 600 && placed < 9; k++) { const x = P.x0 + 20 + Math.floor(random() * (P.x1 - P.x0 - 40)), y = P.y0 + 20 + Math.floor(random() * (P.y1 - P.y0 - 40)); if (!inShards(x, y) && !inEllipse(STARWOOD, x, y) && land(x, y) && [[2, 0], [-2, 0], [0, 2], [0, -2]].every(([dx, dy]) => land(x + dx, y + dy)) && giant(x, y)) placed++; }
  t.scatter(SHARDFIELDS.x - SHARDFIELDS.rx, SHARDFIELDS.y - SHARDFIELDS.ry, SHARDFIELDS.x + SHARDFIELDS.rx, SHARDFIELDS.y + SHARDFIELDS.ry, 160, (x, y) => { t.decor(x, y, "prism_spire", true); }, (x, y) => land(x, y) && inShards(x, y));
  t.scatter(SHARDFIELDS.x - SHARDFIELDS.rx, SHARDFIELDS.y - SHARDFIELDS.ry, SHARDFIELDS.x + SHARDFIELDS.rx, SHARDFIELDS.y + SHARDFIELDS.ry, 420, (x, y) => { t.decor(x, y, "prism_crystal", true); }, (x, y) => land(x, y) && inShards(x, y));
  t.scatter(P.x0, P.y0, P.x1, P.y1, 520, (x, y) => { t.decor(x, y, "prism_crystal", true); }, (x, y) => land(x, y) && !inShards(x, y));
  t.scatter(P.x0, P.y0, P.x1, P.y1, 90, (x, y) => { t.decor(x, y, "prism_spire", true); }, (x, y) => land(x, y) && !inShards(x, y));
  t.scatter(P.x0, P.y0, P.x1, P.y1, 260, (x, y) => { t.decor(x, y, "fae_tree", true); }, (x, y) => land(x, y) && !inShards(x, y) && !inEllipse(STARWOOD, x, y, 1.1));
  t.scatter(P.x0, P.y0, P.x1, P.y1, 380, (x, y) => { t.decor(x, y, "flowers", false); }, (x, y) => land(x, y) && !inShards(x, y));
  t.scatter(P.x0, P.y0, P.x1, P.y1, 30, (x, y) => { t.decor(x, y, "fae_ring", false); }, (x, y) => land(x, y) && !inShards(x, y));
  t.add({ kind: "sign", x: SHARDFIELDS.x - SHARDFIELDS.rx + 14, y: SHARDFIELDS.y + 4, blocks: true, name: "The Shardfields", text: "THE SHARDFIELDS. The crystals grow. So do the golems. The Collegium accepts no responsibility for either." });

  // ---------- The creatures ----------
  const herd = (id: string, n: number, ok: (x: number, y: number) => boolean) => t.scatter(P.x0, P.y0, P.x1, P.y1, n, (x, y) => { t.monster(id, x, y); }, (x, y) => WALKABLE.has(tiles[idx(x, y)]) && ctx.objectAt[idx(x, y)] < 0 && land(x, y) && ok(x, y));
  const downs = (x: number, y: number) => !inShards(x, y) && !inEllipse(STARWOOD, x, y, 1.1) && !inEllipse(FAE_HOLLOWS, x, y, 1.1) && Math.hypot(x - 1405, y - 84) > 60;
  herd("glimmer_moth", 26, downs);
  herd("glimmer_stag", 10, downs);
  herd("thistle_pixie", 16, (x, y) => inEllipse(FAE_HOLLOWS, x, y, 0.9) && Math.hypot(x - THORN_RING.x, y - THORN_RING.y) > 10);
  herd("prism_wisp", 18, (x, y) => inEllipse(STARWOOD, x, y, 0.9));
  herd("shard_golem", 12, (x, y) => inShards(x, y));
  t.npc("shard_warden", SHARDFIELDS.x - SHARDFIELDS.rx + 12, SHARDFIELDS.y + 8, 0);

  // ---------- The labels ----------
  label("prismwild", 1300, 150); label("glass_causeway", Math.round((coastX + landing) / 2), CAUSEWAY_Y - 6); label("collegium", 1406, 46);
  label("starwood", STARWOOD.x, STARWOOD.y); label("fae_hollows", FAE_HOLLOWS.x, FAE_HOLLOWS.y); label("shardfields", SHARDFIELDS.x, SHARDFIELDS.y - 20);
  label("fennicks_labyrinth", LABYRINTH.x0 + (MAZE_SIZE >> 1), LABYRINTH.y0 - 6);
  for (const [id, r] of [["spirehollow", SPIREHOLLOW], ["bellwhistle", BELLWHISTLE], ["mothwick", MOTHWICK], ["shardstead", SHARDSTEAD], ["tumbledown", TUMBLEDOWN]] as const) label(id, Math.round((r.x0 + r.x1) / 2), r.y0 - 2);
}
