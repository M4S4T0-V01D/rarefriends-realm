/**
 * What Rises in the East: the Mizukai Isles, an archipelago east of the old east coast, built in world coordinates in
 * the EAST_W columns the world grew by (see world.ts).
 *
 * Hinode, the Isle of Sunrise, is the heart of it: Kurohama's harbour on the west coast facing the mainland, the castle
 * town of Takamori in the middle, Mount Kumo and its shrine to the north, the Old Cedars and the Whispering Bamboo,
 * the rice terraces of Tanabe in the south, the hot springs of Yumoto in the eastern foothills, and Kurokage Wood on
 * the north cape, where nobody goes after dark. Round it lie the other islands, each with a reason to be there:
 * Shiogama's fishers, Kibi's tea, Hanazono's blossom, Morishima's fox shrine, Iwaoka's monastery, the ruins of Josaki,
 * Torojima's lanterns, Kusabana's herbs, Ashigane's fires, a cove that isn't on the charts, the Three Stones, Turtle
 * Rock, and far out to the south-east, Hakkotsu, the white island.
 *
 * Every inhabited island has a dock (a "Mizukai boat" object, `dock` = its id, `to` = where you stand on arrival):
 * boats.ts sells passage between them.
 */
import { EAST_X, OVERWORLD_H, T, isWater, regionIndex, type DecorKind, type Floor, type GenContext, type RegionId, type World, type worldTools } from "./world.ts";
import { buildMizukaiTowns } from "./islestowns.ts";

type Tools = ReturnType<typeof worldTools>;
type Blob = readonly [cx: number, cy: number, rx: number, ry: number];
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

/** Each island's land, as blobs (world coordinates), and how ragged its coast is. */
export const ISLANDS: readonly { id: RegionId; blobs: readonly Blob[]; wobble: number }[] = [
  // Hinode: a broad body, the northern mountain shoulder, the north cape (Kurokage), the south-west arm round Kurohama's bay, the east cape.
  { id: "hinode", wobble: 0.5, blobs: [[1440, 262, 88, 74], [1404, 204, 44, 36], [1448, 186, 54, 40], [1490, 166, 36, 28], [1504, 132, 32, 22], [1530, 116, 20, 13],
    [1540, 240, 40, 32], [1574, 258, 22, 15], [1372, 234, 30, 22], [1420, 334, 50, 26], [1398, 360, 26, 17], [1382, 374, 12, 9], [1500, 300, 34, 22], [1506, 202, 16, 13]] },
  { id: "shiogama", wobble: 0.4, blobs: [[1262, 300, 17, 12], [1252, 292, 8, 6]] },
  { id: "kibi", wobble: 0.45, blobs: [[1300, 450, 40, 26], [1324, 432, 18, 14], [1276, 462, 16, 12]] },
  { id: "hanazono", wobble: 0.4, blobs: [[1452, 452, 34, 22], [1474, 440, 14, 12]] },
  { id: "morishima", wobble: 0.5, blobs: [[1600, 420, 36, 30], [1620, 398, 18, 16], [1584, 444, 16, 12]] },
  { id: "iwaoka", wobble: 0.55, blobs: [[1640, 110, 38, 34], [1662, 84, 20, 18], [1618, 132, 18, 14]] },
  { id: "josaki", wobble: 0.35, blobs: [[1626, 276, 26, 22], [1644, 262, 12, 10]] },
  { id: "torojima", wobble: 0.45, blobs: [[1520, 40, 26, 16], [1540, 32, 12, 10]] },
  { id: "kusabana", wobble: 0.4, blobs: [[1696, 332, 16, 15]] },
  { id: "ashigane", wobble: 0.55, blobs: [[1290, 92, 30, 26], [1306, 72, 14, 12]] },
  { id: "smugglers_cove", wobble: 0.3, blobs: [[1226, 176, 20, 18]] },
  { id: "hakkotsu", wobble: 0.5, blobs: [[1690, 486, 24, 20], [1672, 474, 10, 9]] },
  { id: "three_stones", wobble: 0.25, blobs: [[1366, 488, 6, 5], [1380, 484, 7, 6], [1394, 490, 6, 5]] },
  { id: "turtle_rock", wobble: 0.2, blobs: [[1548, 372, 8, 6], [1556, 370, 3, 3]] },
];
/**
 * The docks: an island's landing, the direction its pier runs out to sea, and its boatman. The pier is laid from the
 * shore (found by walking from the island's middle towards the sea) out over the water, so it always meets the land.
 */
export const DOCKS: readonly { id: string; name: string; region: RegionId; from: readonly [number, number]; heading: readonly [number, number]; boatman: string }[] = [
  { id: "eastport", name: "Eastport, on the mainland", region: "mizukai_sea", from: [1100, 404], heading: [1, 0], boatman: "boat_eastport" },
  { id: "kurohama", name: "Kurohama harbour", region: "kurohama", from: [1352, 262], heading: [-1, 0], boatman: "boat_kurohama" },
  { id: "tanabe", name: "Tanabe landing", region: "tanabe", from: [1420, 336], heading: [0, 1], boatman: "boat_tanabe" },
  { id: "shiogama", name: "Shiogama", region: "shiogama", from: [1262, 300], heading: [0, 1], boatman: "boat_shiogama" },
  { id: "kibi", name: "Kibi", region: "kibi", from: [1300, 446], heading: [0, -1], boatman: "boat_kibi" },
  { id: "hanazono", name: "Hanazono", region: "hanazono", from: [1452, 450], heading: [0, -1], boatman: "boat_hanazono" },
  { id: "morishima", name: "Morishima", region: "morishima", from: [1600, 420], heading: [-1, 0], boatman: "boat_morishima" },
  { id: "iwaoka", name: "Iwaoka", region: "iwaoka", from: [1636, 116], heading: [-1, 0], boatman: "boat_iwaoka" },
  { id: "josaki", name: "Josaki", region: "josaki", from: [1622, 278], heading: [-1, 0], boatman: "boat_josaki" },
  { id: "torojima", name: "Torojima", region: "torojima", from: [1520, 42], heading: [0, 1], boatman: "boat_torojima" },
  { id: "kusabana", name: "Kusabana", region: "kusabana", from: [1696, 332], heading: [-1, 0], boatman: "boat_kusabana" },
  { id: "ashigane", name: "Ashigane", region: "ashigane", from: [1292, 96], heading: [0, 1], boatman: "boat_ashigane" },
  { id: "smugglers_cove", name: "Smugglers' Cove", region: "smugglers_cove", from: [1212, 176], heading: [-1, 0], boatman: "boat_smugglers_cove" },
  { id: "three_stones", name: "The Three Stones", region: "three_stones", from: [1380, 484], heading: [0, -1], boatman: "boat_three_stones" },
  { id: "turtle_rock", name: "Turtle Rock", region: "turtle_rock", from: [1548, 372], heading: [-1, 0], boatman: "boat_turtle_rock" },
  { id: "hakkotsu", name: "Hakkotsu", region: "hakkotsu", from: [1690, 486], heading: [-1, 0], boatman: "boat_hakkotsu" },
];
/** Where Hinode's towns are (world coordinates). */
export const MIZUKAI_PLACES = {
  kurohama: [1366, 262], takamori: [1452, 286], kumoyama: [1448, 214], tanabe: [1420, 326], yumoto: [1514, 206], kurokage: [1484, 140], isohama: [1494, 316],
} as const;
/**
 * The Mizukai dungeons in the dungeon strip (x ranges and rows; EAST_X is 1160 and DUNGEON_Y 520, written out because
 * world.ts imports this module before it has set them).
 */
export const MIZUKAI_DUNGEONS = {
  kumo_hollow: { x0: 1174, x1: 1270, y0: 522, y1: 550 },
  ashigane_deeps: { x0: 1280, x1: 1390, y0: 522, y1: 550 },
  bone_shrine: { x0: 1400, x1: 1500, y0: 522, y1: 556 },
} as const;
/** Roof tiles of the Isles: slate blue-grey, charcoal, weathered copper, cypress bark, thatch. */
export const MIZUKAI_ROOFS = { slate: "#56606e", charcoal: "#3f4651", copper: "#5d8a7c", bark: "#7a5a44", thatch: "#a8925f", vermilion: "#a5443a" } as const;

export function buildIsles(ctx: GenContext, t: Tools, places: World["places"], floors: Floor[]) {
  const { get, put, add, decor, npc, clearAt, monster, inBounds, tileIndex, road, river } = t;
  const OH = OVERWORLD_H, X0 = EAST_X - 24, W = ctx.W, random = ctx.random;
  const n1 = makeNoise(8101, 22), n2 = makeNoise(8102, 8), n3 = makeNoise(8103, 4), rn = makeNoise(8104, 14);
  const ridge = (x: number, y: number) => 1 - Math.abs(rn(x, y) * 2 - 1);
  const occupied = (x: number, y: number) => ctx.objectAt[tileIndex(x, y)] >= 0 || ctx.spawns.some(spawn => spawn.x === x && spawn.y === y);
  const WALKABLE = (tt: number) => tt === T.GRASS || tt === T.DARK_GRASS || tt === T.PATH || tt === T.COBBLE || tt === T.SAND || tt === T.STONE || tt === T.WOOD || tt === T.GRAVEL || tt === T.FARMLAND || tt === T.SNOW || tt === T.BRIDGE || tt === T.CARPET || tt === T.SWAMP || tt === T.ASH;
  /** A building's doorway, or the tile in front of one (never blocked by anything placed). */
  const doorway = (x: number, y: number) => ctx.doorways.some(([dx, dy]) => Math.abs(dx - x) + Math.abs(dy - y) <= 1);
  const nearFree = (x: number, y: number, limit = 8): [number, number] => {
    for (let r = 0; r <= limit; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue;
      if (WALKABLE(get(nx, ny)) && get(nx, ny) !== T.BRIDGE && !occupied(nx, ny) && !doorway(nx, ny)) return [nx, ny];
    }
    return [x, y];
  };
  const put2 = (x: number, y: number, kind: DecorKind, name?: string, blocks = true) => { const [dx, dy] = nearFree(x, y, 3); decor(dx, dy, kind, blocks, name); };
  const npcAt = (id: string, x: number, y: number, wander = 0) => { const [nx, ny] = nearFree(x, y, 5); npc(id, nx, ny, wander); };
  const monsterAt = (id: string, x: number, y: number, wander?: number) => { const [nx, ny] = nearFree(x, y, 5); monster(id, nx, ny, wander); };
  const sign = (x: number, y: number, label: string, text: string, icon?: string) => { const [sx, sy] = nearFree(x, y, 3); add({ kind: "sign", x: sx, y: sy, blocks: true, name: label, text, icon }); };
  const regionIs = (x: number, y: number, id: RegionId) => ctx.region[tileIndex(x, y)] === regionIndex(id);

  // ---------- 1. Land: every island's blobs, a ragged coast, sand where it meets the sea ----------
  const SW = W - X0, land = new Int8Array(SW * OH).fill(-1);
  const at = (x: number, y: number) => (x >= X0 && x < W && y >= 0 && y < OH) ? land[y * SW + (x - X0)] : -1;
  ISLANDS.forEach((island, index) => {
    for (const [cx, cy, rx, ry] of island.blobs) {
      for (let y = Math.max(1, Math.floor(cy - ry * 1.5)); y <= Math.min(OH - 3, cy + ry * 1.5); y++) for (let x = Math.max(EAST_X + 2, Math.floor(cx - rx * 1.5)); x <= Math.min(W - 3, cx + rx * 1.5); x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, edge = 1 + (n1(x, y) - 0.5) * island.wobble * 2 + (n3(x, y) - 0.5) * 0.25;
        if (d <= edge) land[y * SW + (x - X0)] = index;
      }
    }
  });
  // Kurohama's bay: the sea comes in under the west coast, so the harbour faces the mainland in shelter.
  for (let y = 236; y <= 290; y++) for (let x = 1320; x <= 1350; x++) if (((x - 1326) / 22) ** 2 + ((y - 262) / 24) ** 2 <= 1 + (n2(x, y) - 0.5) * 0.3) land[y * SW + (x - X0)] = -1;
  // Hinode's bays: the Kurokage inlet between the north cape and the east cape, and Isohama's bay in the south-east.
  const carve = (cx: number, cy: number, rx: number, ry: number) => { for (let y = Math.floor(cy - ry * 1.3); y <= cy + ry * 1.3; y++) for (let x = Math.floor(cx - rx * 1.3); x <= cx + rx * 1.3; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (n2(x, y) - 0.5) * 0.35) land[y * SW + (x - X0)] = -1; };
  carve(1552, 186, 24, 20); carve(1468, 342, 22, 14); carve(1350, 318, 16, 12);
  // Smugglers' Cove is a ring round a lagoon, open to the sea on the east (towards nobody's charts).
  for (let y = 162; y <= 190; y++) for (let x = 1214; x <= 1246; x++) { const d = Math.hypot((x - 1228) / 11, (y - 176) / 9); if (d <= 1 || (x > 1232 && Math.abs(y - 176) <= 2)) land[y * SW + (x - X0)] = -1; }
  // Distance to the sea and to the land, for the sand and the shallows.
  const toSea = new Uint8Array(SW * OH).fill(255), toLand = new Uint8Array(SW * OH).fill(255);
  const sweep = (from: Uint8Array, isSource: (i: number) => boolean, limit: number) => {
    const queue: number[] = [];
    for (let i = 0; i < SW * OH; i++) if (isSource(i)) { from[i] = 0; queue.push(i); }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], d = from[i]; if (d >= limit) continue;
      const x = i % SW, y = (i - x) / SW;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= SW || ny >= OH) continue;
        const j = ny * SW + nx; if (from[j] > d + 1) { from[j] = d + 1; queue.push(j); }
      }
    }
  };
  sweep(toSea, i => land[i] < 0, 8); sweep(toLand, i => land[i] >= 0, 5);
  for (let y = 0; y < OH; y++) for (let x = EAST_X; x < W; x++) {
    const i = y * SW + (x - X0);
    if (land[i] >= 0) put(x, y, toSea[i] <= 1 ? T.SAND : n3(x, y) > 0.64 ? T.DARK_GRASS : T.GRASS);
    else if (get(x, y) === T.DEEP || get(x, y) === T.WATER) put(x, y, toLand[i] <= 3 ? T.WATER : T.DEEP);
  }

  // ---------- 2. Regions: every island its own; Hinode in quarters; the sea between ----------
  const hinodeZone = (x: number, y: number): RegionId => {
    const wx = x + (n2(x, y) - 0.5) * 14, wy = y + (n2(y + 300, x) - 0.5) * 14;
    if (Math.hypot(wx - 1366, wy - 262) < 28) return "kurohama";
    if (Math.hypot(wx - 1452, wy - 288) < 24) return "takamori";
    if (Math.hypot(wx - 1514, wy - 206) < 18) return "yumoto";
    if (wy < 156 && wx > 1470) return "kurokage";
    if (((wx - 1448) / 40) ** 2 + ((wy - 196) / 34) ** 2 <= 1) return "kumoyama";
    if (wx < 1418 && wy < 238) return "old_cedars";
    if (wx > 1502 && wy > 232 && wy < 296) return "whispering_bamboo";
    if (wy > 316) return "tanabe";
    return "hinode";
  };
  for (let y = 0; y < OH; y++) for (let x = EAST_X; x < W; x++) {
    const owner = at(x, y);
    if (owner < 0) { if (isWater(get(x, y))) t.setRegion(x, y, "mizukai_sea"); continue; }
    const id = ISLANDS[owner].id;
    t.setRegion(x, y, id === "hinode" ? hinodeZone(x, y) : id);
  }
  // (The mainland's own east coast keeps its regions: Eastport's pier is the Mizukai Sea's only on the water.)

  // ---------- 3. Terrain: Mount Kumo, the cedar slopes, the terraces, the north cape, the islands' own ground ----------
  const lift = ctx.lift;
  for (let y = 0; y < OH; y++) for (let x = EAST_X; x < W; x++) {
    const owner = at(x, y); if (owner < 0) continue;
    const tt = get(x, y); if (tt === T.SAND) continue;
    const id = ISLANDS[owner].id, m = ridge(x * 0.9, y * 0.9), n = n3(x, y), i = tileIndex(x, y);
    if (id === "hinode") {
      // The mountain: Kumo's peak north of the middle, its shoulders falling away east and west; snow on the summit.
      // (The range runs from the Old Cedars' hills north-west of the peak to the cape's spine north-east of it.)
      const peak = Math.max(0, 1 - Math.hypot((x - 1450) / 52, (y - 184) / 40)), shoulder = Math.max(0, 1 - Math.hypot((x - 1404) / 42, (y - 204) / 34)) * 0.55, spine = Math.max(0, 1 - Math.hypot((x - 1494) / 30, (y - 158) / 20)) * 0.6;
      const high = peak ** 1.15 * 3.6 + shoulder + spine + Math.max(0, m - 0.55) * 1.1 * (peak + shoulder + spine > 0.1 ? 1 : 0.3);
      lift[i] = high;
      if (high > 2.55) put(x, y, T.SNOW);
      else if (high > 2.0 && n > 0.42) put(x, y, T.CLIFF);
      else if (high > 1.4) put(x, y, n > 0.5 ? T.GRAVEL : T.DARK_GRASS);
      else if (regionIs(x, y, "kurokage")) { put(x, y, n1(x * 1.4, y * 1.4) < 0.22 ? T.SWAMP : n > 0.55 ? T.GRASS : T.DARK_GRASS); lift[i] = Math.max(lift[i], Math.max(0, m - 0.6) * 1.2); }
      else if (regionIs(x, y, "old_cedars") && n > 0.35) put(x, y, T.DARK_GRASS);
      else if (regionIs(x, y, "tanabe")) lift[i] = Math.max(0, 0.5 - (y - 316) / 60) * 1.2;
    } else if (id === "iwaoka") {
      const high = Math.max(0, 1 - Math.hypot((x - 1646) / 34, (y - 104) / 30)) ** 1.2 * 2.6 + Math.max(0, m - 0.6);
      lift[i] = high;
      if (high > 2.2) put(x, y, T.SNOW); else if (high > 1.5 && n > 0.4) put(x, y, T.CLIFF); else if (high > 0.9) put(x, y, T.GRAVEL);
    } else if (id === "ashigane") {
      const high = Math.max(0, 1 - Math.hypot((x - 1300) / 24, (y - 82) / 20)) * 2.2;
      lift[i] = high;
      put(x, y, high > 1.7 && n > 0.5 ? T.LAVA : high > 1.2 ? T.ASH : n > 0.55 ? T.GRAVEL : T.ASH);
    } else if (id === "hakkotsu") { put(x, y, n > 0.55 ? T.GRAVEL : T.ASH); lift[i] = Math.max(0, m - 0.55) * 0.8; }
    else if (id === "torojima") { put(x, y, n > 0.4 ? T.DARK_GRASS : T.GRASS); }
    else if (id === "josaki") { put(x, y, n > 0.6 ? T.GRAVEL : T.GRASS); lift[i] = Math.max(0, 1 - Math.hypot((x - 1630) / 20, (y - 272) / 16)) * 0.9; }
    else if (id === "morishima") { if (n > 0.3) put(x, y, T.DARK_GRASS); lift[i] = Math.max(0, m - 0.6) * 0.9; }
    else if (id === "three_stones" || id === "turtle_rock") put(x, y, n > 0.5 ? T.GRAVEL : T.GRASS);
  }
  // Water: the Kumo river from the mountain west past Takamori and out through Kurohama's bay; the Tanabe stream south; Yumoto's hot pools.
  river([[1440, 214], [1430, 236], [1418, 252], [1406, 270], [1394, 290], [1374, 298], [1350, 302]], 2.4);
  river([[1468, 220], [1478, 250], [1470, 290], [1452, 320], [1440, 352]], 2);
  for (const [px, py, r] of [[1508, 202, 3], [1520, 210, 2.5], [1512, 214, 2]] as const) t.blob(px, py, r, r * 0.8, T.WATER, 0.2, tt => !isWater(tt));

  // ---------- 4. Roads ----------
  road([[1356, 262], [1380, 268], [1404, 276], [1430, 284], [1444, 288]]);                                               // the Harbour Road, Kurohama to Takamori
  road([[1458, 294], [1440, 310], [1424, 324], [1420, 334]], 2.2, T.GRAVEL);                                              // south to Tanabe
  road([[1462, 284], [1484, 262], [1500, 236], [1512, 214]], 2.2, T.GRAVEL);                                              // east to Yumoto
  road([[1512, 210], [1508, 184], [1500, 160], [1504, 140]], 2, T.GRAVEL);                                               // the cape path into Kurokage
  road([[1462, 292], [1484, 304], [1496, 314]], 2, T.GRAVEL);                                                             // to Isohama's fishers
  road([[1370, 252], [1390, 230], [1396, 212]], 2, T.GRAVEL);                                                             // the woodcutters' track into the Old Cedars

  // ---------- 5. Docks: a pier out to sea from each landing, a moored boat at its end, its boatman on the quay ----------
  for (const dock of DOCKS) {
    // Walk from the landing towards the sea until the water, then lay the pier on out; the land behind is the quay.
    let [x, y] = dock.from as [number, number];
    const [hx, hy] = dock.heading;
    for (let k = 0; k < 120 && !isWater(get(x + hx, y + hy)); k++) { x += hx; y += hy; }
    const shoreX = x, shoreY = y, side = hx === 0 ? [1, 0] : [0, 1];
    // A paved quay on the land side.
    for (let k = -3; k <= 0; k++) for (let s = -2; s <= 2; s++) { const qx = shoreX + hx * k + side[0] * s, qy = shoreY + hy * k + side[1] * s; if (!isWater(get(qx, qy))) { clearAt(qx, qy); put(qx, qy, T.STONE); } }
    const LENGTH = 6;
    for (let k = 1; k <= LENGTH; k++) for (const s of [0, 1]) { const px = shoreX + hx * k + side[0] * s, py = shoreY + hy * k + side[1] * s; clearAt(px, py); put(px, py, T.WOOD); }
    for (let k = 1; k <= LENGTH + 3; k++) for (const s of [-1, 2]) { const wx = shoreX + hx * k + side[0] * s, wy = shoreY + hy * k + side[1] * s; if (isWater(get(wx, wy))) put(wx, wy, T.WATER); }
    for (let k = LENGTH + 1; k <= LENGTH + 3; k++) for (const s of [0, 1]) { const wx = shoreX + hx * k + side[0] * s, wy = shoreY + hy * k + side[1] * s; put(wx, wy, T.WATER); }
    const endX = shoreX + hx * LENGTH, endY = shoreY + hy * LENGTH;
    // The boat is moored beyond the pier's end; you stand at the end to board, and arrive there.
    add({ kind: "dock", x: endX + hx, y: endY + hy, blocks: true, name: "Mizukai boat", dock: dock.id, to: { x: endX, y: endY } });
    for (const s of [-1, 2]) { const lx = shoreX + side[0] * s, ly = shoreY + side[1] * s; if (!occupied(lx, ly) && WALKABLE(get(lx, ly))) decor(lx, ly, dock.id === "eastport" ? "lamp" : "stone_lantern"); }
    npcAt(dock.boatman, shoreX - hx * 2 + side[0] * 2, shoreY - hy * 2 + side[1] * 2);
    if (dock.id !== "eastport") t.setRegion(endX, endY, dock.region);
  }

  const isle = { at, nearFree, put2, npcAt, monsterAt, sign, occupied, regionIs, WALKABLE };
  buildMizukaiTowns(ctx, t, isle, places);
  return isle;
}
