/**
 * A Place to the North: the land above the old world (rows 0 to NORTH_DY - 1, built after everything else has moved down
 * into the grown world, so in the grown world's own coordinates). Two peoples share it, divided by a range of mountains
 * and joined by the passes through it:
 * - The Vargskeld in the west: fjords cut deep into a rugged coast, skerries and islands, cold pine forest, fishing
 *   villages, and Skarnholm at the head of the greatest fjord, where the jarls meet and the shipyards are.
 * - The Zoryavik in the east: forested highlands drained by rivers north to the sea, lakes, timber towns, mines in the
 *   hills, and Krasnogor on its river bend, where the princes quarrel over who speaks for the land.
 * - The Varn Ridge between them: snow and crag, crossed at the Oathgate Pass (where the old agreement was sworn, and is
 *   breaking) and, further north, the Wolfsback.
 * The north joins the old world overland: a long road climbs out of Raria's north into the Vargskeld foothills, and another
 * runs up from the Deadwood through the Zoryavik forest.
 */
import { REGIONS, T, W, WALKABLE, NORTH_DY, isWater, regionIndex, worldTools, type GenContext, type RegionId, type World } from "./world.ts";

/** The north's columns: the old world's breadth (the Mizukai sea beyond it stays sea). */
export const NORTH_X1 = 1150;
/** Where the peoples' lands meet: the Varn Ridge's spine (x), and its two passes (the Oathgate in the south, the Wolfsback in the north). */
export const RIDGE = { x: 640, half: 34, oathgate: { x: 640, y: 236 }, wolfsback: { x: 652, y: 118 } } as const;
/** The north's roads (grown coordinates), each a line of points: the trails (wayfinding.ts) follow the first three and the eastern three. */
export const ROADS: readonly (readonly (readonly [number, number])[])[] = [
  // From Vesperwold's road, north over the land-bridge, past Embermoot, on to Skarnholm.
  [[186, 464], [190, 420], [204, 380], [196, 340], [214, 310], [216, 297], [226, 268], [258, 246], [300, 228]],
  // From the Deadwood's road, north over the eastern land-bridge, past Zlatna Gora, to Krasnogor.
  [[743, 478], [756, 440], [748, 400], [764, 362], [748, 324], [762, 296], [800, 268], [834, 240], [879, 231]],
  // Skarnholm east, past the Redwake camp, through the Oathgate, past Hearthwatch, to Krasnogor's west gate.
  [[338, 204], [392, 214], [446, 238], [508, 252], [556, 262], [600, 240], [640, 236], [684, 241], [708, 241], [760, 230], [810, 210], [845, 203]],
  // Skarnholm west to Ravnsvik; Skarnholm north-east to the Oathsworn headland.
  [[270, 204], [222, 196], [170, 170], [120, 150], [86, 128]],
  [[336, 190], [392, 168], [446, 140], [490, 120], [534, 115]],
  // Krasnogor north to the Old Bough and on to Bereslav; Krasnogor east to Svetloye.
  [[879, 176], [868, 140], [840, 110], [826, 94]],
  [[912, 190], [956, 160], [990, 134], [1016, 117]],
  [[912, 214], [960, 236], [1010, 252], [1056, 262]],
];
/** The trails: a road walked end to end and known (wayfinding.ts). Waymarks stand beside each, one every `every` tiles. */
export const TRAILS = [
  { id: "west_road", name: "The West Road", road: 0 }, { id: "east_road", name: "The East Road", road: 1 },
  { id: "oathgate_road", name: "The Oathgate Road", road: 2 }, { id: "bough_road", name: "The Bough Road", road: 6 },
] as const;
export const WAYMARK_EVERY = 34;
/** The Oathgate road's trouble (northquest.ts): the wrecked caravan by the road, and the raiders' den up in the hills above it. */
export const OATH_ROAD = { wreck: { x: 478, y: 241 }, den: { x: 494, y: 216 }, hills: { x0: 440, y0: 196, x1: 545, y1: 262 } } as const;
const WOLFSBACK_SIGN = "THE WOLFSBACK. A goat-track over the Varn Ridge, the only way across when the Oathgate's shut. Carts can't take it. Yetis can.";

/** Value noise in [0, 1), periodic over 64 cells of `scale` tiles (as world.ts's own). */
function noiseOf(seed: number, scale: number) {
  let s = seed; const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const size = 64, grid = Array.from({ length: size * size }, () => r()), at = (x: number, y: number) => grid[((y % size + size) % size) * size + ((x % size + size) % size)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
  };
}
const smoothstep = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function buildNorth(ctx: GenContext, labels: World["labels"]) {
  const t = worldTools(ctx), { tiles, lift, raise, random } = ctx, N = NORTH_DY;
  const idx = (x: number, y: number) => y * W + x;
  const broad = noiseOf(4101, 58), mid = noiseOf(4111, 19), fine = noiseOf(4127, 6), ridgeN = noiseOf(4133, 23), wet = noiseOf(4139, 31);

  // ---------- The old coast below: which columns of the old world's top row are land (the north meets them) ----------
  const oldLand = new Float32Array(W);
  for (let x = 0; x < W; x++) { let n = 0; for (let dy = 0; dy < 4; dy++) if (!isWater(tiles[idx(x, N + dy)]) && tiles[idx(x, N + dy)] !== T.VOID) n++; oldLand[x] = n / 4; }
  // Smeared sideways, so a coast that meets the old one turns gently into it.
  const oldSoft = new Float32Array(W);
  for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let dx = -14; dx <= 14; dx++) { const xx = x + dx; if (xx >= 0 && xx < W) { s += oldLand[xx]; n++; } } oldSoft[x] = s / n; }

  // ---------- The fjords: long inlets cut in from the north sea, wandering south into the Vargskeld coast ----------
  const FJORDS: readonly (readonly [number, number])[][] = [
    [[96, 0], [104, 40], [92, 78], [110, 112]],
    [[236, 0], [244, 22], [254, 50]],                                    // the Skarn Sound, out of Skarnholm Bay to the sea
    [[366, 0], [352, 52], [372, 96], [360, 128]],
    [[470, 0], [482, 38], [462, 74]],
  ];
  const nearFjord = (x: number, y: number) => {
    let best = Infinity;
    for (const line of FJORDS) for (let k = 0; k + 1 < line.length; k++) {
      const [ax, ay] = line[k], [bx, by] = line[k + 1], L = (bx - ax) ** 2 + (by - ay) ** 2, u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L));
      // The inlet narrows towards its head.
      const along = (k + u) / (line.length - 1), d = Math.hypot(x - (ax + u * (bx - ax)), y - (ay + u * (by - ay))) / (line === FJORDS[1] ? 15 - 2 * along : 9 - 5 * along);
      if (d < best) best = d;
    }
    return best;
  };

  // ---------- Skarnholm Bay: a great bay behind the Skarn Sound, Skarnholm on its southern shore, islands out in it ----------
  const BAY = { x: 262, y: 112, rx: 80, ry: 64 };
  // The shore wanders in coves and points (two scales of noise), and a harbour lobe reaches down to Skarnholm's quay.
  const bayAt = (x: number, y: number) => Math.min(
    Math.hypot((x - BAY.x) / BAY.rx, (y - BAY.y) / BAY.ry) / (0.74 + mid(x * 1.3 + 300, y * 1.3) * 0.36 + fine(x * 1.5 + 17, y * 1.5) * 0.18),
    Math.hypot((x - 298) / 30, (y - 168) / 13));
  /** The bay's islands: the Gull Holm, the Ness, a couple of skerries [x, y, rx, ry]. */
  const ISLES = [[236, 94, 11, 7], [292, 118, 8, 6], [212, 134, 5, 4], [274, 78, 4, 3], [310, 92, 3, 3]] as const;
  const isleAt = (x: number, y: number) => Math.min(...ISLES.map(([ix, iy, rx, ry]) => Math.hypot((x - ix) / rx, (y - iy) / ry) / (0.8 + fine(x + 5, y + 9) * 0.4)));
  // ---------- Fells and hills: high ground with tors on top, so the land rises and falls instead of lying flat ----------
  /** [x, y, rx, ry, height]: the Vargskeld's fells (bare, snow-capped in the north) and the Zoryavik's rounded hills. */
  const HILLS = [[130, 238, 34, 24, 3.0], [418, 278, 30, 20, 2.4], [152, 58, 30, 20, 3.2], [470, 300, 22, 16, 2.0], [60, 300, 28, 24, 2.6],
    [982, 304, 40, 26, 2.2], [826, 334, 26, 20, 2.8], [900, 58, 40, 24, 2.0], [1100, 160, 30, 30, 2.4], [1060, 70, 26, 18, 1.8]] as const;
  const hillAt = (x: number, y: number) => { let best = 0, height = 0;
    for (const [hx, hy, rx, ry, h] of HILLS) { const d = Math.hypot((x - hx) / rx, (y - hy) / ry) / (0.8 + mid(x * 2 + 70, y * 2) * 0.4); if (d < 1) { const f = (1 - d * d) ** 1.4; if (f > best) { best = f; height = h; } } }
    return { f: best, h: height }; };
  /** Whether a tile is on one of the hills (by its index in HILLS): the Grimfell is the first, the Sokol Hills the sixth. */
  const inHill = (k: number, x: number, y: number) => { const [hx, hy, rx, ry] = HILLS[k]; return Math.hypot((x - hx) / rx, (y - hy) / ry) < 0.95; };
  /** How far a tile is from the ridge's spine, in half-widths (under 1: on the ridge). */
  const ridgeAt = (x: number, y: number) => Math.abs(x - (RIDGE.x + (ridgeN(x, y) - 0.5) * 34)) / (RIDGE.half * (0.65 + mid(x * 0.3 + 400, y) * 0.8));
  // ---------- Land and sea, height and ground ----------
  for (let y = 0; y < N; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    if (x > NORTH_X1 + 30) continue;                         // the Mizukai sea: leave it
    const e = broad(x, y) * 0.55 + mid(x, y) * 0.3 + fine(x, y) * 0.15;
    // Open sea along the top (islands only), the land filling in southward, and fading east into the Mizukai sea.
    let land = e - 0.48 + smoothstep(8, 70, y) * 0.32 - 0.16 - smoothstep(NORTH_X1 - 70, NORTH_X1 + 25, x) * 0.6 - smoothstep(26, 0, x) * 0.5;
    // The bottom rows meet the old coast: land where it's land, sea where it's sea.
    const toOld = smoothstep(N - 60, N - 1, y); land = land * (1 - toOld) + (oldSoft[x] - 0.42 + (e - 0.5) * 0.4) * toOld;
    // The Varn Ridge stands tall all the way from the coast down to the strait, so it's always land: wider and narrower as it goes.
    const ridgeD = ridgeAt(x, y);
    if (ridgeD < 1 && y > 22) land = Math.max(land, 0.08 * (1 - ridgeD) + 0.02);
    // The fjords cut through it on the Vargskeld side.
    if (x < 560 && nearFjord(x, y) < 1) land = Math.min(land, -0.05);
    // Skarnholm Bay, deepest in the middle, and its islands.
    const b = bayAt(x, y);
    if (b < 1) land = Math.min(land, -0.03 - (1 - b) * 0.3);
    if (isleAt(x, y) < 1) land = Math.max(land, 0.03 + (1 - isleAt(x, y)) * 0.1);
    // The top rows are open sea, always: the north's coasts all open onto it, so a vessel can go round from one to another.
    if (y < 4) land = Math.min(land, -0.1 + y * 0.01);
    if (land <= 0) { tiles[i] = land < -0.06 ? T.DEEP : T.WATER; continue; }
    // Ground: shingle at the shore; the Vargskeld's rock and heath, the ridge's crag and snow, the Zoryavik's forest floor.
    const shore = land < 0.025, wetness = wet(x, y);
    if (shore) tiles[i] = x < RIDGE.x ? (fine(x + 7, y) > 0.55 ? T.GRAVEL : T.SAND) : T.SAND;
    else if (ridgeD < 1) {
      // Peaks where the spine and the noise agree; crag and scree on their shoulders; pine-dark foothills below.
      const peak = (1 - ridgeD) * (0.55 + fine(x + 21, y) * 0.3 + mid(x + 77, y + 9) * 0.35);
      tiles[i] = peak > 0.78 ? T.SNOW : peak > 0.5 ? (fine(x + 31, y) > 0.45 ? T.CLIFF : T.GRAVEL) : peak > 0.3 ? T.GRAVEL : T.DARK_GRASS;
      raise[i] = Math.max(raise[i], peak * 3.6); lift[i] = Math.max(lift[i], peak * 0.9);
    } else if (x < RIDGE.x) tiles[i] = y < 44 && fine(x, y + 13) > 0.74 ? T.SNOW : mid(x + 50, y) > 0.72 ? T.GRAVEL : wetness > 0.62 ? T.DARK_GRASS : T.GRASS;
    else tiles[i] = wetness > 0.7 ? T.SWAMP : mid(x + 90, y) > 0.55 ? T.DARK_GRASS : T.GRASS;
    // The fells and hills: scree and heather going up, a bare or snowy top, tors of crag standing out of it.
    const hill = shore ? { f: 0, h: 0 } : hillAt(x, y);
    if (hill.f > 0.12) {
      raise[i] = Math.max(raise[i], hill.f * hill.h); lift[i] = Math.max(lift[i], hill.f * 0.8);
      const west = x < RIDGE.x, top = hill.f > 0.72, tor = hill.f > 0.5 && fine(x + 51, y + 7) > 0.74;
      tiles[i] = tor ? T.CLIFF : top ? (west ? (y < 140 ? T.SNOW : T.GRAVEL) : (fine(x + 3, y) > 0.5 ? T.GRAVEL : T.DARK_GRASS)) : hill.f > 0.4 ? (west ? (mid(x + 9, y) > 0.5 ? T.GRAVEL : T.DARK_GRASS) : T.DARK_GRASS) : tiles[i];
    }
    // The Zoryavik rolls: long swells under the forest, where the Vargskeld is broken and rocky.
    lift[i] = Math.max(lift[i], (e - 0.45) * (x < RIDGE.x ? 1.4 : 1.5));
  }

  // ---------- The Vargskeld's sea cliffs: where deep water comes close, the coast stands up out of it ----------
  // (Not at the towns' shores: Skarnholm's quay, Ravnsvik's beach, the Oathsworn headland's landing.)
  const sheltered = (x: number, y: number) => (x > 246 && x < 350 && y > 158 && y < 236) || (x > 40 && x < 130 && y > 100 && y < 160) || (x > 510 && x < 560 && y > 90 && y < 130);
  for (let y = 4; y < N - 60; y++) for (let x = 2; x < RIDGE.x - 40; x++) {
    const i = idx(x, y);
    if (isWater(tiles[i]) || tiles[i] === T.CLIFF || sheltered(x, y) || fine(x * 2 + 11, y * 2) < 0.42) continue;
    // (Round Skarnholm Bay its shore stands up too, wherever it isn't Skarnholm's.)
    const inBay = bayAt(x, y) < 1.25;
    let deep = false; for (let dy = -2; dy <= 2 && !deep; dy++) for (let dx = -2; dx <= 2 && !deep; dx++) { const tt = tiles[idx(x + dx, y + dy)]; deep = tt === T.DEEP || (inBay && Math.abs(dx) + Math.abs(dy) <= 1 && isWater(tt)); }
    if (deep) { tiles[i] = T.CLIFF; raise[i] = Math.max(raise[i], 1.4 + fine(x, y) * 1.2); lift[i] = Math.max(lift[i], 0.6); }
  }
  // ---------- The Skarn: down off the Grimfell, north to the bay ----------
  t.river([[136, 226], [150, 214], [168, 204], [186, 196], [200, 186], [214, 174], [226, 160]], 3);
  // ---------- Ice on the ridge's northern shoulders: snow that never melted, packed hard ----------
  for (let y = 22; y < 150; y++) for (let x = RIDGE.x - 60; x <= RIDGE.x + 60; x++) { const i = idx(x, y); if (tiles[i] === T.SNOW && raise[i] > 2.2 && fine(x * 2 + 5, y * 2 + 3) > 0.5) tiles[i] = T.ICE; }

  // ---------- The land runs on into the old world: above Raria in the west, above the Deadwood in the east ----------
  // (Elsewhere a strait divides them: the Wyrmreach bay, and the sea off the Cragmaw Heights.) Down each column the sea between
  // the north's shore and the old coast fills in, the bridge's edges wandering so the coast turns, rather than ends.
  for (const [x0, x1, id] of [[130, 390, "vargskeld"], [710, 920, "zoryavik"]] as const) for (let x = x0 - 50; x <= x1 + 50; x++) {
    // Across the middle the land runs right down to the old coast; towards the ends it reaches less far, and raggedly.
    const middle = smoothstep(-45, 45, Math.min(x - x0, x1 - x)), deepest = N - 60 + Math.round(middle * 160 * (0.75 + fine(x, 3) * 0.5));
    for (let y = N - 60; y < Math.min(deepest, N + 100); y++) {
      const i = idx(x, y), tile = tiles[i];
      if (y >= N && !isWater(tile)) break;                                  // the old coast: as far as it goes
      if (!isWater(tile) || middle + (mid(x * 2 + 5, y * 2) - 0.5) * 0.7 < 0.42) continue;
      tiles[i] = mid(x + 11, y) > 0.55 ? T.DARK_GRASS : T.GRASS; lift[i] = 0.1; t.setRegion(x, y, id);
    }
  }
  // ---------- The spine: a wall of crag down the ridge's middle, coast to strait, that nobody walks over ----------
  // (The ridge is crossed at its passes, carved through it below: the Oathgate road and the Wolfsback's goat-track.)
  const spineAt = (y: number) => ({ c: Math.round(RIDGE.x + (ridgeN(RIDGE.x, y) - 0.5) * 34), w: 3 + Math.round(mid(RIDGE.x * 0.3 + 400, y) * 4) });
  for (let y = 0; y < N; y++) {
    const { c, w } = spineAt(y);
    for (let x = c - w; x <= c + w; x++) { const i = idx(x, y); if (isWater(tiles[i]) || tiles[i] === T.VOID) continue; tiles[i] = T.CLIFF; raise[i] = Math.max(raise[i], 3.2); lift[i] = Math.max(lift[i], 0.9); }
  }
  // ---------- Rivers in the Zoryavik, north to the sea; lakes in the forest ----------
  const RIVERS: readonly (readonly [number, number])[][] = [
    [[880, N - 2], [872, 300], [884, 250], [866, 214], [880, 160], [868, 110], [884, 60], [874, 10]],     // the Krasna, through Krasnogor
    [[1010, 330], [1000, 270], [1016, 210], [998, 150], [1012, 90], [1004, 30]],                          // the Bereza, past Bereslav
    [[760, 300], [778, 250], [770, 200], [790, 150], [776, 100], [792, 50], [780, 12]],                   // the Ilm, down from the ridge
  ];
  // Each river's course wanders between its points.
  for (const river of RIVERS) {
    const course: [number, number][] = [];
    for (let k = 0; k + 1 < river.length; k++) { const [ax, ay] = river[k], [bx, by] = river[k + 1]; for (let s = 0; s < 6; s++) { const u = s / 6, y = ay + (by - ay) * u; course.push([Math.round(ax + (bx - ax) * u + (wet(ax, y) - 0.5) * 14), Math.round(y)]); } }
    course.push([...river[river.length - 1]] as [number, number]);
    t.river(course, 4);
  }
  for (const [cx, cy, rx, ry] of [[940, 130, 12, 8], [820, 264, 9, 6], [1064, 190, 10, 7]] as const) t.blob(cx, cy, rx, ry, T.WATER, 0.3);

  // ---------- Regions: the two peoples' lands and the ridge between ----------
  for (let y = 0; y < N; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), tile = tiles[i];
    if (tile === T.VOID || x > NORTH_X1 + 30) continue;
    const ridgeD = ridgeAt(x, y);
    let id: RegionId = isWater(tile) ? (x < RIDGE.x ? "vargskeld_sea" : "zoryavik_coast") : ridgeD < 1 ? "varn_ridge" : x < RIDGE.x ? "vargskeld" : "zoryavik";
    // Named ground of its own: Skarnholm Bay (its water and islands), the Grimfell, the Sokol Hills.
    const b = bayAt(x, y);
    if (b < 1 || (isWater(tile) && b < 1.2 && y > 40)) id = "skarnholm_bay";
    else if (inHill(0, x, y)) id = "grimfell";
    else if (inHill(5, x, y)) id = "sokol_hills";
    t.setRegion(x, y, id);
  }

  // ---------- Settlements: the helpers ----------
  /** Level, open ground for a settlement: no water, crag or snow, nothing standing, flat (the region set). */
  /** Every settlement's ground (the forest and the boulders keep out of it). */
  const settled: [number, number, number, number][] = [];
  const ground = (x0: number, y0: number, x1: number, y1: number, id: RegionId, paving: number = T.GRASS) => {
    settled.push([x0 - 3, y0 - 3, x1 + 3, y1 + 3]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y); t.clearAt(x, y); lift[i] = 0; raise[i] = 0; t.setRegion(x, y, id);
      if (isWater(tiles[i]) || tiles[i] === T.CLIFF || tiles[i] === T.SNOW || tiles[i] === T.SWAMP || tiles[i] === T.SAND) tiles[i] = paving;
    }
  };
  /** A Vargskeld longhouse (plank walls, a turf roof hipped at both ends) or a Zoryavik house (logs, a steep red roof). */
  const STYLE = {
    longhouse: { walls: "plank" as const, roof: "gable" as const, hip: true, color: "#5f7448" },
    hall: { walls: "plank" as const, roof: "gable" as const, hip: true, color: "#4e6239", storeys: 2 },
    izba: { walls: "plank" as const, roof: "gable" as const, color: "#9a3b2c" },
    terem: { walls: "timber" as const, roof: "gable" as const, color: "#7d2f26", storeys: 2 },
    tower: { walls: "plank" as const, roof: "cone" as const, round: true, color: "#6f2a22", storeys: 2, spire: 10 },
    stone: { walls: "stone" as const, roof: "gable" as const, color: "#6d6b67" },
  };
  const house = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, style: keyof typeof STYLE, floor: number = T.WOOD, extra: Partial<Parameters<typeof t.building>[7]> = {}) =>
    t.building(x0, y0, x1, y1, door, floor, undefined, { ...STYLE[style], name, ...extra });
  const sign = (x: number, y: number, name: string, text: string) => { t.clearAt(x, y); t.add({ kind: "sign", x, y, blocks: true, name, text }); };
  const put2 = (x: number, y: number, kind: Parameters<typeof t.decor>[2], name?: string, blocks = true) => { if (t.inBounds(x, y) && !isWater(tiles[idx(x, y)])) { t.clearAt(x, y); t.decor(x, y, kind, blocks, name); } };
  /** Marks the object standing at (x, y) as a clue (northquest.ts says what it does). */
  const clue = (x: number, y: number, id: string) => { const at = ctx.objectAt[idx(x, y)]; if (at >= 0) ctx.objects[at] = { ...ctx.objects[at], clue: id }; };
  /** The nearest open, walkable tile (no object, no road) to (x, y), rings outwards. */
  const openNear = (x: number, y: number) => {
    for (let r = 0; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r && t.free(x + dx, y + dy) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([ex, ey]) => WALKABLE.has(tiles[idx(x + dx + ex, y + dy + ey)]))) return { x: x + dx, y: y + dy };
    }
    return { x, y };
  };
  const npc = (id: string, x: number, y: number, wander = 0) => { t.clearAt(x, y); t.npc(id, x, y, wander); };
  /** A plank pier from (x, y) out over the water, `length` tiles in direction (dx, dy). */
  const pier = (x: number, y: number, dx: number, dy: number, length: number) => { for (let k = 0; k < length; k++) for (const s of [0, 1]) { const px = x + dx * k + (dy ? s : 0), py = y + dy * k + (dx ? s : 0); tiles[idx(px, py)] = T.WOOD; lift[idx(px, py)] = 0; raise[idx(px, py)] = 0; } };

  // ---------- Skarnholm: the jarls' town at the head of the Skarnfjord ----------
  // The Thing-field where the jarls meet, the Thinghall, the jarl's own hall, the Farwake Guild's house on the quay, the shipyard
  // and its slipway into the fjord, the mead hall, the smithy, the bank, and longhouses round it all.
  {
    const X0 = 270, Y0 = 182, X1 = 338, Y1 = 226, cx = (X0 + X1) >> 1;
    ground(X0, Y0, X1, Y1, "skarnholm"); t.fillRect(X0 + 2, Y0 + 2, X1 - 2, Y0 + 4, T.GRAVEL);
    t.fillRect(cx - 1, Y0, cx + 1, Y1, T.PATH); t.fillRect(X0, (Y0 + Y1) >> 1, X1, ((Y0 + Y1) >> 1) + 1, T.PATH);
    // The quay along the fjord's head, and the piers.
    for (let x = X0; x <= X0 + 30; x++) { tiles[idx(x, Y0 - 1)] = T.WOOD; tiles[idx(x, Y0)] = T.WOOD; }
    pier(X0 + 6, Y0 - 2, 0, -1, 8); pier(X0 + 20, Y0 - 2, 0, -1, 6);
    // The shipyard: a slipway running down into the water, a hull on it half planked, timber stacked.
    for (let y = Y0 - 6; y < Y0 + 6; y++) for (let x = X0 + 11; x <= X0 + 15; x++) { tiles[idx(x, y)] = y < Y0 ? T.WOOD : T.GRAVEL; lift[idx(x, y)] = 0; }
    put2(X0 + 13, Y0 + 2, "boat", "A longship on the slip, half planked"); put2(X0 + 10, Y0 + 4, "logpile", "Seasoned oak for keels"); put2(X0 + 16, Y0 + 4, "logpile", "Pine for planking");
    house(X0 + 18, Y0 + 3, X0 + 28, Y0 + 9, "s", "The Farwake Guild's house", "longhouse");
    // The Thinghall and the Thing-field before it: a ring of standing stones where the jarls stand to be heard.
    house(cx - 9, Y0 + 12, cx + 9, Y0 + 22, "s", "The Thinghall of Skarnholm", "hall");
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; put2(Math.round(cx + 18 + Math.cos(a) * 6), Math.round(Y0 + 30 + Math.sin(a) * 4), "obelisk", "A Thing-stone, names cut down its face"); }
    put2(cx + 18, Y0 + 30, "plaque", "The Law Rock: where the Lawspeaker stands to say the law aloud");
    house(X0 + 3, Y0 + 12, X0 + 15, Y0 + 20, "e", "Jarl Hallveig's hall", "hall");
    house(X1 - 14, Y0 + 3, X1 - 3, Y0 + 9, "s", "The Mead Hall of the Grey Gull", "longhouse");
    house(X0 + 4, Y1 - 10, X0 + 13, Y1 - 4, "n", "The Skarnholm smithy", "longhouse", T.STONE);
    t.add({ kind: "furnace", x: X0 + 6, y: Y1 - 7, blocks: true, name: "Furnace" }); t.add({ kind: "anvil", x: X0 + 10, y: Y1 - 7, blocks: true, name: "Anvil" });
    house(X1 - 13, Y1 - 10, X1 - 3, Y1 - 4, "n", "The Skarnholm counting-house", "longhouse");
    t.add({ kind: "bank", x: X1 - 8, y: Y1 - 7, blocks: true, name: "Bank chest" });
    for (const [hx, hy] of [[X0 + 2, Y0 + 24], [X0 + 16, Y1 - 10], [cx + 4, Y1 - 9], [X1 - 14, Y0 + 13], [X1 - 14, Y0 + 24]] as const) house(hx, hy, hx + 9, hy + 5, "n", "A longhouse", "longhouse");
    t.add({ kind: "well", x: cx + 3, y: (Y0 + Y1 >> 1) + 3, blocks: true, name: "The town well" });
    put2(X0 + 2, Y0 + 2, "nets", "Nets drying"); put2(X0 + 4, Y0 + 2, "drying_rack", "Cod drying on the rack"); put2(X1 - 2, Y0 + 2, "banner", "The Skarnholm banner: a grey gull on a blue field");
    t.shoreSpots(X0 - 10, Y0 - 20, X0 + 34, Y0 - 1, "lure", 4);
    npc("jarl_hallveig", X0 + 9, Y0 + 16); npc("lawspeaker_signy", cx + 18, Y0 + 32); npc("farwake_master", X0 + 23, Y0 + 6); npc("shipwright_bersi", X0 + 13, Y0 + 6);
    // Halla the houndmaster and her yard of hounds (Beastkeeping: beastfolk.ts).
    { const at = openNear(cx - 14, Y0 + 30); npc("houndmaster_halla", at.x, at.y); put2(at.x + 1, at.y + 1, "trough", "A water trough, chewed at the corners"); put2(at.x - 1, at.y + 1, "hay", "Straw for the kennels"); }
    npc("skarnholm_innkeeper", X1 - 8, Y0 + 6); npc("skarnholm_trader", cx + 4, Y0 + 25, 2); { const at = openNear(cx - 6, Y0 + 25); npc("skarnholm_weaver", at.x, at.y); }
    for (let k = 0; k < 6; k++) npc(k % 2 ? "vargskeld_housecarl" : "vargskeld_villager", cx - 14 + k * 5, (Y0 + Y1 >> 1) + 2, 6);
    sign(cx + 2, Y1 + 1, "Skarnholm", "SKARNHOLM, at the head of the Skarnfjord. The Thing meets at midsummer and when it must. Speak at the Law Rock, not in the street. The Farwake keeps the charts; the jarl keeps the rest.");
  }

  // ---------- Ravnsvik: a fishing village on the outer coast ----------
  {
    const X0 = 54, Y0 = 118, X1 = 84, Y1 = 136;
    ground(X0, Y0, X1, Y1, "ravnsvik");
    for (const [hx, hy] of [[X0 + 2, Y0 + 2], [X0 + 12, Y0 + 3], [X0 + 3, Y0 + 10], [X0 + 15, Y0 + 11]] as const) house(hx, hy, hx + 8, hy + 5, "e", "A fisher's longhouse", "longhouse");
    for (const [dx, dy] of [[24, 4], [26, 8], [22, 14]] as const) put2(X0 + dx, Y0 + dy, dx === 24 ? "nets" : "drying_rack", dx === 24 ? "Nets, mended and drying" : "Fish drying on the rack");
    pier(X0 - 1, Y0 + 8, -1, 0, 6); put2(X0 - 6, Y0 + 7, "boat", "A fishing boat, pulled up");
    t.shoreSpots(X0 - 20, Y0 - 10, X0 + 4, Y1 + 10, "net", 3); t.shoreSpots(X0 - 20, Y0 - 10, X0 + 4, Y1 + 10, "harpoon", 2);
    npc("ravnsvik_netmender", X0 + 23, Y0 + 6); npc("vargskeld_villager", X0 + 10, Y0 + 9, 4); npc("vargskeld_villager", X0 + 18, Y0 + 15, 4);
    sign(X1 + 1, Y0 + 9, "Ravnsvik", "RAVNSVIK. Cod, herring, and the news from the sea before Skarnholm has it.");
  }

  // ---------- Oathsworn Hall: a fortified hall on its headland, the oath-stone before it ----------
  {
    const X0 = 512, Y0 = 84, X1 = 556, Y1 = 114, cx = (X0 + X1) >> 1;
    ground(X0, Y0, X1, Y1, "oathsworn_hall");
    ctx.ramparts?.push({ x0: X0 + 2, y0: Y0 + 2, x1: X1 - 2, y1: Y1 - 2, storeys: 1, walls: "plank" });
    for (let x = X0 + 2; x <= X1 - 2; x++) for (const y of [Y0 + 2, Y1 - 2]) tiles[idx(x, y)] = T.WALL;
    for (let y = Y0 + 2; y <= Y1 - 2; y++) for (const x of [X0 + 2, X1 - 2]) tiles[idx(x, y)] = T.WALL;
    for (let d = -1; d <= 1; d++) tiles[idx(cx + d, Y1 - 2)] = T.PATH;
    house(cx - 10, Y0 + 5, cx + 10, Y0 + 15, "s", "Oathsworn Hall", "hall");
    put2(cx, Y0 + 19, "obelisk", "The oath-stone: every name sworn on it, and the oath beside each, in the sworn one's own words");
    for (const [tx, ty] of [[X0 + 6, Y1 - 7], [X0 + 9, Y1 - 7], [X1 - 9, Y1 - 7], [X1 - 6, Y1 - 7]] as const) put2(tx, ty, "target", "A practice post, hacked half through");
    put2(X0 + 5, Y0 + 5, "armour", "A rack of shields, each painted by its bearer"); put2(X1 - 5, Y0 + 5, "banner", "The Oathsworn banner: two hands clasped over a sword");
    npc("oathmaster_brand", cx, Y0 + 18); for (let k = 0; k < 4; k++) npc("oathsworn_warrior", X0 + 8 + k * 9, Y1 - 9, 3);
    sign(cx + 3, Y1, "Oathsworn Hall", "OATHSWORN HALL. Nobody here was made to serve. Everybody here chose to. Ask the Oathmaster what that costs.");
  }

  // ---------- Embermoot: the Keepers of the Last Ember, their hall and the runestones of the remembered dead ----------
  {
    const X0 = 196, Y0 = 268, X1 = 236, Y1 = 296, cx = (X0 + X1) >> 1;
    ground(X0, Y0, X1, Y1, "embermoot");
    house(cx - 7, Y0 + 3, cx + 7, Y0 + 12, "s", "The Hall of the Last Ember", "hall", T.STONE);
    put2(cx, Y0 + 7, "hearth", "The Last Ember: a fire that has not gone out since the first ship came", false);
    for (let k = 0; k < 14; k++) { const x = X0 + 3 + (k % 7) * 5, y = Y0 + 17 + Math.floor(k / 7) * 5; put2(x, y, "obelisk", k % 3 ? "A runestone for the remembered dead" : "A runestone, its runes recut by a different hand"); }
    for (let k = 0; k < 4; k++) put2(X1 - 3, Y0 + 4 + k * 4, "grave", "A howe, turf over stone");
    npc("ember_keeper_yrsa", cx + 2, Y0 + 14); npc("ember_skald", cx - 6, Y0 + 15, 2);
    sign(cx, Y1 + 1, "Embermoot", "EMBERMOOT. The Keepers of the Last Ember. Here the dead are remembered by name. Ask, and a skald will tell you theirs; tell yours, and it will be kept.");
  }

  // ---------- The Redwake camp, below the Oathgate's western approach ----------
  {
    const X0 = 556, Y0 = 252, X1 = 590, Y1 = 272;
    ground(X0, Y0, X1, Y1, "redwake_camp", T.GRAVEL);
    for (const [tx, ty] of [[X0 + 3, Y0 + 3], [X0 + 12, Y0 + 2], [X0 + 22, Y0 + 4], [X0 + 5, Y0 + 13], [X0 + 18, Y0 + 14]] as const) put2(tx, ty, "tent", "A Redwake tent, patched in red");
    put2(X0 + 14, Y0 + 9, "campfire", "The company fire", false); put2(X0 + 28, Y0 + 9, "banner", "The Redwake banner: a red wave on black"); put2(X0 + 26, Y0 + 15, "wagon", "A baggage wagon, its contracts nailed to the side");
    npc("redwake_captain", X0 + 15, Y0 + 11); for (let k = 0; k < 3; k++) npc("redwake_sellsword", X0 + 8 + k * 8, Y0 + 7, 4);
    sign(X1 + 1, Y0 + 9, "The Redwake camp", "THE REDWAKE COMPANY. Contracts taken, honoured, and finished. Ask the Captain about our code; we have one, which is more than some.");
  }

  // ---------- The Oathgate road's trouble: a caravan wrecked below the hills, and the raiders' hideout above them ----------
  {
    const wreck = openNear(OATH_ROAD.wreck.x, OATH_ROAD.wreck.y);
    t.add({ kind: "decor", decor: "wagon", x: wreck.x, y: wreck.y, blocks: true, name: "A wrecked caravan wagon", clue: "oa_wreck" });
    const den = openNear(OATH_ROAD.den.x, OATH_ROAD.den.y);
    for (const [dx, dy] of [[-3, -1], [3, -1], [-2, 2]] as const) put2(den.x + dx, den.y + dy, "tent", "A raiders' lean-to");
    put2(den.x + 1, den.y + 2, "campfire", "A raiders' fire, banked", false);
    t.add({ kind: "decor", decor: "chest", x: den.x, y: den.y, blocks: true, name: "The raiders' strongbox", clue: "oa_strongbox" });
  }

  // ---------- The Oathgate Pass: the road through the ridge, the Agreement Stone, the ruined fort ----------
  {
    const P = RIDGE.oathgate;
    for (let y = P.y - 8; y <= P.y + 8; y++) for (let x = P.x - 48; x <= P.x + 48; x++) { const i = idx(x, y); if (Math.abs(y - P.y) <= 2 + Math.abs(x - P.x) / 24) { t.clearAt(x, y); tiles[i] = T.GRAVEL; raise[i] = Math.min(raise[i], 1.2); t.setRegion(x, y, "oathgate_pass"); } }
    put2(P.x, P.y - 3, "monument", "The Agreement Stone"); clue(P.x, P.y - 3, "oa_stone");
    put2(P.x - 2, P.y - 3, "plaque", "The Agreement Stone's west face: Vargskeld runes, worn"); clue(P.x - 2, P.y - 3, "oa_west");
    put2(P.x + 2, P.y - 3, "plaque", "The Agreement Stone's east face: Zoryavik letters, recut"); clue(P.x + 2, P.y - 3, "oa_east");
    for (const [dx, dy] of [[-8, -5], [-6, -5], [-4, -5], [6, -5], [8, -5], [-8, 4], [8, 4]] as const) put2(P.x + dx, P.y + dy, "ruin_wall", "The old fort's wall, fallen to the height of a knee");
    sign(P.x - 5, P.y + 3, "The Oathgate", "THE OATHGATE. The old agreement was sworn here: the passes kept open by both, the roads kept by both, each to stand by the other. Both sides say the other broke it.");
    // The Oathgate's bar: a timber gate in a wall across the pass, inside the spine, east of the stone. The Hearthwardens keep
    // it barred until the agreement's settled (northquest.ts decides, for each player). Above and below the road the wall runs
    // on as crag until it meets the spine, so there's no going round.
    // The pass is a saddle, not a slot: snowy shoulders either side of the road, the crag set back from it and falling away
    // towards it, so the camera sees down into the pass (cliff tiles stand tall, and a row of them hides whoever's behind).
    for (let y = P.y - 7; y <= P.y + 7; y++) for (let x = P.x - 48; x <= P.x + 48; x++) {
      const i = idx(x, y), d = Math.abs(y - P.y);
      if (d > 2 && tiles[i] === T.CLIFF) tiles[i] = d >= 5 ? T.SNOW : T.GRAVEL;
    }
    for (let y = P.y - 16; y <= P.y + 16; y++) for (let x = P.x - 52; x <= P.x + 52; x++) { const d = Math.abs(y - P.y); if (d > 2) { const i = idx(x, y); raise[i] = Math.min(raise[i], 0.6 + (d - 2) * 0.14); } }
    const sp = spineAt(P.y), gx = Math.max(P.x + 5, sp.c + sp.w - 1);
    const inSpine = (y: number) => { const r = spineAt(y); return gx >= r.c - r.w && gx <= r.c + r.w; };
    for (let y = P.y - 7; y <= P.y + 7; y++) { const i = idx(gx, y); if (WALKABLE.has(tiles[i])) { t.clearAt(gx, y); tiles[i] = y === P.y ? T.PATH : T.WALL; } }
    for (const dir of [-1, 1]) for (let y = P.y + dir * 8; Math.abs(y - P.y) < 48 && !inSpine(y); y += dir) { const i = idx(gx, y); if (!isWater(tiles[i])) { t.clearAt(gx, y); tiles[i] = T.CLIFF; raise[i] = Math.max(raise[i], 3.2); } }
    t.add({ kind: "gate", axis: "ns", x: gx, y: P.y, blocks: true, name: "The Oathgate bar", action: "Open", to: { x: gx + 1, y: P.y }, clue: "oa_gate" });
  }

  // ---------- The Wolfsback: a goat-track over the ridge's spine, snow underfoot, for those who climb ----------
  {
    const F = RIDGE.wolfsback;
    for (let x = F.x - 50; x <= F.x + 50; x++) {
      const cy = F.y + Math.round(Math.sin((x - F.x) / 9) * 3);
      for (let y = cy - 1; y <= cy + 1; y++) { const i = idx(x, y); if (isWater(tiles[i])) continue; t.clearAt(x, y); tiles[i] = Math.abs(x - F.x) < 30 ? T.SNOW : T.GRAVEL; raise[i] = Math.min(raise[i], 2.2); }
    }
    const end = (x: number) => ({ x, y: F.y + Math.round(Math.sin((x - F.x) / 9) * 3) });
    // At the spine the track gives out: an icy step of crag, climbed over (Wayfaring), the same either way.
    const sp = spineAt(F.y), c = sp.c, top = end(c), west = end(c - 2), east = end(c + 2);
    for (let x = c - 1; x <= c + 1; x++) for (let y = top.y - 2; y <= top.y + 2; y++) { t.clearAt(x, y); tiles[idx(x, y)] = T.CLIFF; }
    t.add({ kind: "obstacle", x: c - 1, y: top.y, blocks: true, name: "Icicle climb", action: "Climb-over", to: { x: east.x, y: east.y }, obstacle: { course: "shortcut", step: 0, level: 35, xp: 45, ticks: 5 } });
    t.add({ kind: "obstacle", x: c + 1, y: top.y, blocks: true, name: "Icicle climb", action: "Climb-over", to: { x: west.x, y: west.y }, obstacle: { course: "shortcut", step: 0, level: 35, xp: 45, ticks: 5 } });
    // A sign at each foot of the track, on the first dry ground in from its end.
    for (const side of [-1, 1]) for (let d = 47; d > 20; d--) {
      const at = end(F.x + side * d), spot = [at.y - 2, at.y + 2].find(y => WALKABLE.has(tiles[idx(at.x, y)]) && WALKABLE.has(tiles[idx(at.x, at.y)]));
      if (spot !== undefined) { sign(at.x, spot, "The Wolfsback", WOLFSBACK_SIGN); break; }
    }
  }

  // ---------- Hearthwatch: the Hearthwardens' fort on the pass's eastern side ----------
  {
    const X0 = 684, Y0 = 226, X1 = 708, Y1 = 250, cx = (X0 + X1) >> 1;
    ground(X0, Y0, X1, Y1, "hearthwatch");
    ctx.ramparts?.push({ x0: X0, y0: Y0, x1: X1, y1: Y1, storeys: 1, walls: "plank" });
    for (let x = X0; x <= X1; x++) for (const y of [Y0, Y1]) tiles[idx(x, y)] = T.WALL;
    for (let y = Y0; y <= Y1; y++) for (const x of [X0, X1]) tiles[idx(x, y)] = T.WALL;
    for (let d = -1; d <= 1; d++) { tiles[idx(X0, cx - X0 + Y0 + d)] = T.PATH; tiles[idx(X1, cx - X0 + Y0 + d)] = T.PATH; }
    house(X0 + 2, Y0 + 2, X0 + 7, Y0 + 7, "s", "A watchtower of Hearthwatch", "tower"); house(X1 - 7, Y0 + 2, X1 - 2, Y0 + 7, "s", "A watchtower of Hearthwatch", "tower");
    house(cx - 5, Y1 - 9, cx + 5, Y1 - 3, "n", "The Hearthwardens' barracks", "izba");
    npc("hearthwarden_captain", cx, Y0 + 9); npc("hearthwarden", cx - 4, Y0 + 12, 4); npc("hearthwarden", cx + 4, Y0 + 12, 4);
    sign(X0 - 1, cx - X0 + Y0 + 3, "Hearthwatch", "HEARTHWATCH. The Hearthwardens keep this pass, and the roads east of it, for whoever needs them kept. State your business; we'll still help you if it's bad.");
  }

  // ---------- Krasnogor: the princes' seat on the Krasna's bend ----------
  // A palisade with round towers at its corners, the Terem (the princes' hall) under a gilded dome, the House of the Hearth-Fathers
  // (their tradition's own), the market square, the river gate, log houses with red roofs.
  {
    const X0 = 846, Y0 = 176, X1 = 912, Y1 = 230, cx = (X0 + X1) >> 1, cy = (Y0 + Y1) >> 1;
    ground(X0 - 3, Y0 - 3, X1 + 3, Y1 + 3, "krasnogor");
    ctx.ramparts?.push({ x0: X0, y0: Y0, x1: X1, y1: Y1, storeys: 2, walls: "plank" });
    for (let x = X0; x <= X1; x++) for (const y of [Y0, Y1]) tiles[idx(x, y)] = T.WALL;
    for (let y = Y0; y <= Y1; y++) for (const x of [X0, X1]) tiles[idx(x, y)] = T.WALL;
    for (let d = -1; d <= 1; d++) { tiles[idx(cx + d, Y1)] = T.COBBLE; tiles[idx(X0, cy + d)] = T.COBBLE; tiles[idx(X1, cy + d)] = T.COBBLE; tiles[idx(cx + d, Y0)] = T.COBBLE; }
    t.fillRect(X0 + 1, cy - 1, X1 - 1, cy + 1, T.COBBLE); t.fillRect(cx - 1, Y0 + 1, cx + 1, Y1 - 1, T.COBBLE);
    for (const [tx, ty] of [[X0 - 2, Y0 - 2], [X1 - 3, Y0 - 2], [X0 - 2, Y1 - 3], [X1 - 3, Y1 - 3]] as const) house(tx, ty, tx + 5, ty + 5, "s", "A tower of Krasnogor's palisade", "tower");
    house(cx - 11, Y0 + 4, cx + 11, Y0 + 16, "s", "The Terem of Krasnogor", "terem", T.CARPET, { roof: "cone", keep: { size: 5, storeys: 1, spire: 18, dome: true }, color: "#7d2f26" });
    house(X0 + 4, Y0 + 4, X0 + 16, Y0 + 14, "e", "The House of the Hearth-Fathers", "terem", T.WOOD, { roof: "cone", keep: { size: 3, storeys: 1, spire: 14, dome: true }, color: "#3e5a3a" });
    put2(cx + 6, cy + 5, "table", "A trestle of honey and wax"); for (const [sx, sy] of [[cx - 8, cy + 4], [cx - 4, cy + 4], [cx + 4, cy + 4], [cx + 8, cy + 4]] as const) put2(sx, sy, "crate", "Furs, honey, wax and amber, for sale");
    t.add({ kind: "well", x: cx + 3, y: cy - 4, blocks: true, name: "The square's well" });
    house(X1 - 15, Y0 + 4, X1 - 4, Y0 + 11, "s", "The Krasnogor counting-house", "izba"); t.add({ kind: "bank", x: X1 - 10, y: Y0 + 7, blocks: true, name: "Bank chest" });
    house(X0 + 4, Y1 - 12, X0 + 14, Y1 - 4, "n", "The smithy of the Krasna", "izba", T.STONE); t.add({ kind: "furnace", x: X0 + 6, y: Y1 - 8, blocks: true, name: "Furnace" }); t.add({ kind: "anvil", x: X0 + 10, y: Y1 - 8, blocks: true, name: "Anvil" });
    house(X1 - 15, Y1 - 12, X1 - 4, Y1 - 4, "n", "The Bear and Bell", "izba");
    for (const [hx, hy] of [[X0 + 18, Y1 - 12], [cx + 4, Y1 - 12], [X0 + 4, cy + 4], [X1 - 14, cy + 4], [X0 + 18, Y0 + 4]] as const) house(hx, hy, hx + 7, hy + 5, "s", "A log house", "izba");
    npc("prince_radomir", cx - 3, Y0 + 9); npc("princess_vesna", cx + 4, Y0 + 9); npc("hearth_father_ilya", X0 + 10, Y0 + 9);
    npc("krasnogor_innkeeper", X1 - 10, Y1 - 8); npc("krasnogor_trader", cx, cy + 6, 2); { const at = openNear(cx + 8, cy + 6); npc("krasnogor_tailor", at.x, at.y); } { const at = openNear(cx - 12, cy + 8); npc("beastward_mstislav", at.x, at.y); put2(at.x + 1, at.y + 1, "trough", "A trough for the beasts in his keeping"); }
    for (let k = 0; k < 6; k++) npc(k % 2 ? "zoryavik_druzhina" : "zoryavik_villager", X0 + 8 + k * 9, cy + 2, 6);
    sign(cx + 2, Y1 + 2, "Krasnogor", "KRASNOGOR, on the Krasna. The princes sit in the Terem, when they sit together. The Hearth-Fathers keep the House; the market keeps the rest.");
  }

  // ---------- Bereslav: the river town, the Freeholds Compact's ----------
  {
    const X0 = 1016, Y0 = 102, X1 = 1052, Y1 = 128, cx = (X0 + X1) >> 1;
    ground(X0, Y0, X1, Y1, "bereslav");
    house(cx - 7, Y0 + 3, cx + 7, Y0 + 11, "s", "The Freeholds Compact's hall", "terem");
    for (const [hx, hy] of [[X0 + 2, Y0 + 2], [X1 - 9, Y0 + 2], [X0 + 2, Y1 - 8], [X1 - 9, Y1 - 8], [cx - 4, Y1 - 7]] as const) house(hx, hy, hx + 7, hy + 5, "n", "A log house", "izba");
    pier(X0 - 2, Y0 + 14, -1, 0, 5); put2(X0 - 6, Y0 + 13, "boat", "A river barge, laden with timber"); put2(X0 + 4, Y0 + 15, "logpile", "Timber for the river");
    npc("freeholds_speaker", cx, Y0 + 13); npc("zoryavik_villager", cx + 6, Y1 - 10, 5);
    // Olena's yard, up the bank north of the town: a long boat shed with a barge on the stocks, a slipway down into the
    // Bereza, timber seasoning under a lean-to, a sawpit, the pitch pot, rope, and her sign.
    {
      const YX = X0 - 3, YY = Y0 - 11;   // the yard's corner (west, by the river)
      ground(YX, YY, YX + 22, Y0 - 2, "bereslav");
      house(YX + 4, YY + 1, YX + 15, YY + 6, "s", "Olena's boat shed", "izba", T.WOOD, { color: "#6e4a2c" });
      put2(YX + 9, YY + 3, "boat", "A barge on the stocks, half planked, her ribs still showing aft");
      put2(YX + 6, YY + 2, "table", "The workbench: adzes, augers, a bevel gauge, and a pot of pitch keeping warm");
      put2(YX + 13, YY + 2, "shelf", "Treenails by the thousand, oakum in hanks, and a drawer of rivets sorted by metal");
      put2(YX + 14, YY + 5, "chest", "The yard's tool chest, its lid carved with every barge she's launched");
      // The slipway: planks from the shed's west end down to the water, greased.
      for (let x = YX; x <= YX + 3; x++) for (const y of [YY + 3, YY + 4]) { const i = idx(x, y); tiles[i] = T.WOOD; lift[i] = 0; raise[i] = 0; }
      pier(YX - 1, YY + 3, -1, 0, 3);
      // The yard itself, outside: timber under a lean-to, the sawpit, the pitch pot, rope, a cart.
      put2(YX + 17, YY + 1, "canopy", "A lean-to over the seasoning timber");
      for (const [lx, ly] of [[YX + 17, YY + 2], [YX + 18, YY + 2], [YX + 19, YY + 3]] as const) put2(lx, ly, "logpile", "Oak and pine, seasoning: a year for every inch");
      put2(YX + 20, YY + 6, "logpile", "The sawpit: a log on the trestles, one sawyer above and one below");
      put2(YX + 6, YY + 8, "barrel", "The pitch pot over a slow fire. It smells like every boatyard there ever was");
      put2(YX + 9, YY + 8, "nets", "Coils of tarred rope, and a hawser for the next launch");
      put2(YX + 12, YY + 8, "crate", "Crates of iron from the smiths: rivets, chain, a rudder's pintles");
      put2(YX + 18, YY + 8, "wagon", "A timber cart, its shafts down");
      put2(YX + 15, YY + 9, "drying_rack", "Sailcloth stretched to dry, mended where the last one tore");
      sign(YX + 2, Y0 - 3, "Olena's Yard", "OLENA'S YARD, BERESLAV. Barges built to order and rowboats for the fishing, from your timber and your iron. Planks sawn. Hulls mended. Fitting out: ask.");
      npc("bereslav_bargewoman", YX + 9, YY + 7);
    }
    sign(cx + 3, Y1 + 1, "Bereslav", "BERESLAV, a free town of the Compact. No prince's toll on this river. Ask the Speaker why, and have an afternoon free.");
  }

  // ---------- Zlatna Gora: the mining town under the ridge ----------
  {
    const X0 = 726, Y0 = 296, X1 = 764, Y1 = 322, cx = (X0 + X1) >> 1;
    ground(X0, Y0, X1, Y1, "zlatna_gora", T.GRAVEL);
    house(cx - 5, Y0 + 3, cx + 5, Y0 + 9, "s", "The miners' guildhouse", "izba");
    house(X0 + 3, Y1 - 9, X0 + 12, Y1 - 3, "n", "The smelter", "izba", T.STONE); t.add({ kind: "furnace", x: X0 + 6, y: Y1 - 6, blocks: true, name: "Furnace" }); t.add({ kind: "anvil", x: X0 + 9, y: Y1 - 6, blocks: true, name: "Anvil" });
    for (const [hx, hy] of [[X1 - 10, Y0 + 3], [X1 - 10, Y1 - 9]] as const) house(hx, hy, hx + 7, hy + 5, "w", "A miner's house", "izba");
    t.rockCluster(X0 - 6, Y0 + 6, 3, "blackiron", 5); t.rockCluster(X0 - 4, Y1 - 2, 3, "inkcoal", 4); t.rockCluster(X1 + 6, Y0 + 4, 3, "moonsilver", 4);
    npc("zlatna_foreman", cx, Y0 + 12); npc("zoryavik_villager", cx - 6, Y0 + 16, 4); npc("zoryavik_villager", cx + 6, Y0 + 16, 4);
    sign(cx + 2, Y1 + 1, "Zlatna Gora", "ZLATNA GORA. Iron, coal and a seam of silver the princes would like back. The Compact says it was never theirs.");
  }

  // ---------- Svetloye: the Dawn Archive ----------
  {
    const X0 = 1056, Y0 = 250, X1 = 1086, Y1 = 274, cx = (X0 + X1) >> 1;
    ground(X0, Y0, X1, Y1, "svetloye");
    house(cx - 9, Y0 + 3, cx + 9, Y0 + 13, "s", "The Dawn Archive", "stone", T.STONE, { roof: "cone", keep: { size: 3, storeys: 1, spire: 12, dome: true }, color: "#c9a53a" });
    for (const [sx, sy] of [[cx - 7, Y0 + 5], [cx - 4, Y0 + 5], [cx + 4, Y0 + 5], [cx + 7, Y0 + 5]] as const) put2(sx, sy, "shelf", "Chronicles, shelved by year and disputed by the shelf");
    house(X0 + 2, Y1 - 8, X0 + 10, Y1 - 3, "n", "The scriptorium", "izba");
    npc("archivist_bozhena", cx, Y0 + 9); npc("archive_copyist", X0 + 6, Y1 - 5, 2);
    sign(cx + 3, Y1 + 1, "The Dawn Archive", "THE DAWN ARCHIVE at Svetloye. Every chronicle of the Zoryavik, and every chronicle that disagrees with it. Read here; do not take; argue quietly.");
  }

  // ---------- The Old Bough: the Circle's sacred grove ----------
  {
    const cx = 820, cy = 84;
    ground(cx - 12, cy - 9, cx + 12, cy + 9, "old_bough", T.DARK_GRASS);
    t.clearAt(cx, cy); t.tree(cx, cy, "oak");
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; put2(Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 6), k % 3 ? "stump" : "obelisk", k % 3 ? "A stump, ribbons tied round it" : "A carved post: a face in the wood, eyes closed"); }
    npc("old_bough_keeper", cx + 2, cy + 3, 2);
    sign(cx - 3, cy + 10, "The Old Bough", "THE OLD BOUGH. The Circle keeps this grove as their grandmothers did. Walk round, not through. The oak was old when the princes were young.");
  }

  // ---------- Roads: north from Raria, north from the Deadwood, and through the pass between the peoples ----------
  // (t.road bridges water as it crosses it.)
  // The roads run clear: an old ruin wall or a tree the new road crosses (the eastern road climbs through the Deadwood's ruins) comes down.
  for (const points of ROADS) {
    t.road(points, 2.4, T.PATH);
    t.line(points, 2.4, (x, y) => { const id = ctx.objectAt[idx(x, y)]; if (id < 0) return; const o = ctx.objects[id]; if (o.kind === "tree" || o.decor === "ruin_wall") t.clearAt(x, y); });
  }
  for (const [x, y, text] of [
    [189, 458, "NORTH: the Vargskeld, by the long road over the land-bridge: Embermoot, then Skarnholm on its fjord. Cold, and further than it looks."],
    [748, 470, "NORTH: the Zoryavik, through the forest: Zlatna Gora under the ridge, then Krasnogor on the Krasna. Keep to the road; the forest keeps itself."],
  ] as const) sign(x, y, "Signpost", text);

  // ---------- What lives in the north (until the north's own creatures come) ----------
  t.monsters("wolf", 60, 140, 560, 330, 26); t.monsters("snared_wolf", 60, 140, 560, 330, 3); t.monsters("crag_bear", 380, 60, 600, 200, 6); t.monsters("cairn_wight", 150, 250, 260, 330, 6);
  t.monsters("highland_goat", RIDGE.x - 30, 60, RIDGE.x + 30, 320, 12); t.monsters("frost_yeti", RIDGE.x - 20, 40, RIDGE.x + 20, 160, 5);
  t.monsters("boar", 700, 60, 1120, 330, 26); t.monsters("greatstag", 700, 40, 1120, 330, 18); t.monsters("wolf", 700, 60, 1120, 330, 16); t.monsters("snared_wolf", 700, 60, 1120, 330, 3); t.monsters("crag_bear", 940, 40, 1120, 200, 6);
  t.monsters("bandit", 440, 200, 540, 260, 5);
  t.shoreSpots(150, 40, 560, 140, "deep", 8); t.shoreSpots(700, 40, 1140, 120, "net", 8);
  // Offshore shoals, out of reach of the shore (Seafaring): harpoon shoals a few tiles out, where a skiff can go, and deep
  // shoals far out on the open sea, for a longship. Marked offshore: nobody fishes them from the land.
  {
    const far = new Uint8Array(W * N).fill(255), queue = new Int32Array(W * N); let tail = 0;
    for (let i = 0; i < W * N; i++) if (WALKABLE.has(tiles[i])) { far[i] = 0; queue[tail++] = i; }
    for (let head = 0; head < tail; head++) { const i = queue[head], x = i % W, y = (i - x) / W, d = far[i] + 1; if (d > 14) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= N) continue; const k = ny * W + nx; if (far[k] > d) { far[k] = d; queue[tail++] = k; } } }
    const placed: { x: number; y: number }[] = [];
    const shoals = (spot: "harpoon" | "deep", lo: number, hi: number, want: number) => {
      for (let tries = 0, n = 0; tries < 4000 && n < want; tries++) {
        const x = 20 + Math.floor(random() * (NORTH_X1 - 40)), y = 6 + Math.floor(random() * (N - 70)), i = idx(x, y);
        if (tiles[i] !== T.DEEP || far[i] < lo || far[i] > hi || ctx.objectAt[i] >= 0 || placed.some(p => Math.hypot(p.x - x, p.y - y) < 24)) continue;
        t.add({ kind: "spot", spot, x, y, blocks: true, name: spot === "deep" ? "Deep shoal" : "Offshore shoal", text: "offshore" }); placed.push({ x, y }); n++;
      }
    };
    shoals("harpoon", 3, 4, 7); shoals("deep", 7, 13, 7);
  }

  // ---------- Forest: cold pine in the Vargskeld, deep mixed forest in the Zoryavik, thinning on the heights ----------
  // (Only on the north's own ground, the land-bridges included, and never in a settlement.)
  const wild = new Set((["vargskeld", "zoryavik", "varn_ridge", "skarnholm_bay", "grimfell", "sokol_hills"] as const).map(id => regionIndex(id)));
  const open = (x: number, y: number) => t.free(x, y) && (tiles[idx(x, y)] === T.GRASS || tiles[idx(x, y)] === T.DARK_GRASS) && wild.has(ctx.region[idx(x, y)])
    && !settled.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  t.scatter(20, 30, RIDGE.x - 40, N + 70, 2900, (x, y) => { const r = random(); t.tree(x, y, r > 0.45 ? "pine" : r > 0.2 ? "tree" : "ashwood"); }, (x, y) => open(x, y) && mid(x + 3, y) > 0.42);
  t.scatter(RIDGE.x + 40, 20, NORTH_X1 - 10, N + 70, 5600, (x, y) => { const r = random(); t.tree(x, y, r > 0.55 ? "pine" : r > 0.3 ? "oak" : r > 0.12 ? "tree" : "ironbark"); }, (x, y) => open(x, y) && mid(x + 3, y) > 0.34);
  t.scatter(RIDGE.x - 60, 20, RIDGE.x + 60, N - 6, 500, (x, y) => t.tree(x, y, "pine"), (x, y) => open(x, y));
  t.scatter(20, 20, NORTH_X1, N + 70, 700, (x, y) => t.decor(x, y, "boulder"), (x, y) => open(x, y) && random() > 0.5);
  // Willows along the Zoryavik's rivers and lakes; meadows of flowers in the forest's clearings.
  const byWater = (x: number, y: number) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isWater(tiles[idx(x + dx, y + dy)])) return true; return false; };
  t.scatter(RIDGE.x + 40, 20, NORTH_X1 - 10, N + 40, 900, (x, y) => t.tree(x, y, "willow"), (x, y) => open(x, y) && byWater(x, y));
  t.scatter(RIDGE.x + 40, 20, NORTH_X1 - 10, N + 40, 1400, (x, y) => t.decor(x, y, "flowers", false), (x, y) => open(x, y) && mid(x + 3, y) <= 0.34 && fine(x, y + 40) > 0.55);
  // Sea stacks off the Vargskeld's cliffs: pillars of rock the sea cut loose.
  for (let tries = 0, n = 0; tries < 6000 && n < 26; tries++) {
    const x = 4 + Math.floor(random() * (RIDGE.x - 50)), y = 6 + Math.floor(random() * (N - 70)), i = idx(x, y);
    if (tiles[i] !== T.WATER || ctx.objectAt[i] >= 0) continue;
    let cliff = false; for (let dy = -2; dy <= 2 && !cliff; dy++) for (let dx = -2; dx <= 2 && !cliff; dx++) cliff = tiles[idx(x + dx, y + dy)] === T.CLIFF;
    if (cliff) { t.decor(x, y, "rock_spire", true, "A sea stack"); n++; }
  }
  // Standing stones on the Vargskeld's fell tops, a ring on each, whoever raised them.
  for (const [hx, hy] of HILLS) if (hx < RIDGE.x) for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2, x = Math.round(hx + Math.cos(a) * 4), y = Math.round(hy + Math.sin(a) * 3);
    if (t.free(x, y) && WALKABLE.has(tiles[idx(x, y)])) t.decor(x, y, "obelisk", true, "A standing stone");
  }
  // The bay's islands: pine and rock.
  for (const [ix, iy, rx, ry] of ISLES) t.scatter(ix - rx, iy - ry, ix + rx, iy + ry, Math.round(rx * ry * 0.4), (x, y) => { if (random() > 0.35) t.tree(x, y, "pine"); else t.decor(x, y, "boulder"); }, (x, y) => t.free(x, y) && WALKABLE.has(tiles[idx(x, y)]) && !isWater(tiles[idx(x, y)]));

  // ---------- Labels (in the grown world: the north is built after everything else has moved) ----------
  const label = (id: RegionId, x: number, y: number) => { const entry = REGIONS.find(region => region.id === id) as { label: { x: number; y: number } } | undefined; if (entry) { entry.label = { x, y }; labels[id] = { x, y }; } };
  // ---------- Waymarks: a cairn beside a trail every so often, read to learn the way (wayfinding.ts) ----------
  TRAILS.forEach(trail => {
    const pts = ROADS[trail.road]; let n = 0, carried = WAYMARK_EVERY;
    const markAt = (x: number, y: number, dx: number, dy: number) => {
      const len = Math.hypot(dx, dy) || 1, px = Math.round(x - dy / len * 3), py = Math.round(y + dx / len * 3), at = openNear(px, py);
      t.add({ kind: "decor", decor: "obelisk", x: at.x, y: at.y, blocks: true, name: "A waymark", text: `${trail.id}:${n++}`, clue: "waymark" });
    };
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1], len = Math.hypot(bx - ax, by - ay);
      for (let d = carried; d < len; d += WAYMARK_EVERY) markAt(ax + (bx - ax) * d / len, ay + (by - ay) * d / len, bx - ax, by - ay);
      carried = WAYMARK_EVERY - ((len - carried) % WAYMARK_EVERY + WAYMARK_EVERY) % WAYMARK_EVERY;
      if (k === pts.length - 2) markAt(bx, by, bx - ax, by - ay);
    }
  });

  // ---------- Wayfaring shortcuts: a short crossing where the walk round is long ----------
  // Each is found where the land gives it: two banks facing each other across a few tiles of water (or crag), free on both
  // sides, that are a long walk apart. Never across the ridge's spine: the Oathgate and the Wolfsback are its crossings.
  {
    const walk = (i: number) => WALKABLE.has(tiles[i]) && tiles[i] !== T.BRIDGE && (ctx.objectAt[i] < 0 || !ctx.objects[ctx.objectAt[i]].blocks);
    const inSpine = (x: number, y: number) => { const r = spineAt(y); return Math.abs(x - r.c) <= r.w + 6; };
    // The land you can walk to: both ends of a shortcut must be on it (no shortcut to an island nobody reaches).
    const reached = new Uint8Array(W * (N + 60)), queue0: number[] = [];
    // (Seeded from the roads, which every town is on.)
    for (let i = 0; i < W * N; i++) if (tiles[i] === T.PATH && ctx.objectAt[i] < 0) { reached[i] = 1; queue0.push(i); }
    for (let head = 0; head < queue0.length; head++) { const i = queue0[head], x = i % W, y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = idx(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= N + 60 || reached[k] || !walk(k)) continue; reached[k] = 1; queue0.push(k); } }
    /** Steps on foot from a to b, if it's under `cap`; otherwise cap. */
    const walkSteps = (ax: number, ay: number, bx: number, by: number, cap: number) => {
      const seen = new Map<number, number>(), queue: number[] = [idx(ax, ay)]; seen.set(queue[0], 0);
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head], d = seen.get(i)!, x = i % W, y = (i - x) / W;
        if (x === bx && y === by) return d;
        if (d >= cap) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = idx(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= N + 60 || seen.has(k) || !walk(k)) continue; seen.set(k, d + 1); queue.push(k); }
      }
      return cap;
    };
    // A fishing spot with no walkable land beside it (by an island, under a cliff) is fished from a boat: offshore, like the shoals.
    for (const o of ctx.objects) if (o.kind === "spot" && o.y < N + 60 && o.text !== "offshore" && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reached[idx(o.x + dx, o.y + dy)])) o.text = "offshore";
    const shortcut = (x0: number, y0: number, x1: number, y1: number, gap: "water" | "crag", name: string, action: string, level: number, xp: number) => {
      const across = (i: number) => gap === "water" ? isWater(tiles[i]) : tiles[i] === T.CLIFF;
      let best: { ax: number; ay: number; bx: number; by: number; dx: number; dy: number; k: number; score: number } | null = null;
      for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
        if (!walk(idx(x, y)) || !reached[idx(x, y)]) continue;
        // Water: at least three tiles across, so a vessel still passes between the two ends; crag: two or more.
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) for (let k = gap === "water" ? 3 : 2; k <= 7; k++) {
          let ok = true; for (let j = 1; j <= k && ok; j++) { const gx = x + dx * j, gy = y + dy * j; ok = across(idx(gx, gy)) && ctx.objectAt[idx(gx, gy)] < 0 && !inSpine(gx, gy); }
          const bx = x + dx * (k + 1), by = y + dy * (k + 1);
          if (!ok || !walk(idx(bx, by)) || !reached[idx(bx, by)]) continue;
          const score = walkSteps(x, y, bx, by, 160) - k * 4;
          if (score > 40 && (!best || score > best.score)) best = { ax: x, ay: y, bx, by, dx, dy, k, score };
          break;
        }
      }
      if (!best) return;
      const { ax, ay, bx, by, dx, dy, k } = best;
      t.add({ kind: "obstacle", x: ax + dx, y: ay + dy, blocks: true, name, action, to: { x: bx, y: by }, obstacle: { course: "shortcut", step: 0, level, xp, ticks: 3 + Math.ceil(k / 2) } });
      t.add({ kind: "obstacle", x: bx - dx, y: by - dy, blocks: true, name, action, to: { x: ax, y: ay }, obstacle: { course: "shortcut", step: 0, level, xp, ticks: 3 + Math.ceil(k / 2) } });
    };
    shortcut(840, 236, 905, 320, "water", "Stepping stone", "Jump-across", 15, 20);   // the Krasna, below Krasnogor
    shortcut(985, 120, 1035, 230, "water", "Log balance", "Walk-across", 25, 30);     // the Bereza, by Bereslav
    shortcut(755, 140, 805, 280, "water", "Stepping stone", "Jump-across", 20, 25);   // the Ilm, down from the ridge
  }

  // The north's lift and raise on the bake's own steps (bake.ts keeps them to 1/64), so the baked world rebuilds its heights
  // exactly: the ridge's crag stands tall, and a rounding there shows as a ledge.
  for (let i = 0; i < W * N; i++) { lift[i] = Math.round(lift[i] * 64) / 64; raise[i] = Math.round(raise[i] * 64) / 64; }
  label("vargskeld", 420, 170); label("zoryavik", 960, 260); label("varn_ridge", RIDGE.x, 170); label("vargskeld_sea", 260, 24); label("zoryavik_coast", 1100, 30);
  label("skarnholm_bay", 258, 116); label("grimfell", 124, 244); label("sokol_hills", 990, 312);
  for (const [id, x, y] of [["skarnholm", 304, 200], ["ravnsvik", 69, 124], ["oathsworn_hall", 534, 92], ["embermoot", 216, 274], ["redwake_camp", 573, 256], ["oathgate_pass", 640, 236],
    ["hearthwatch", 696, 232], ["krasnogor", 879, 184], ["bereslav", 1034, 108], ["zlatna_gora", 745, 300], ["svetloye", 1071, 254], ["old_bough", 820, 76]] as const) label(id, x, y);
}
