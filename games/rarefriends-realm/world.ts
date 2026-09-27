/**
 * The Realm: a 240 × 240 tile world, built deterministically from a seed and hand-placed landmarks.
 * Overworld in y < 200; the two dungeons (Murkmire Crypt, Hollow Depths) live in the strip below, reached by ladders.
 */
import type { RockKind, SpotKind, TreeKind } from "./data.ts";

export const W = 240, H = 240;
export const T = {
  VOID: 0, GRASS: 1, DARK_GRASS: 2, PATH: 3, COBBLE: 4, SAND: 5, WATER: 6, DEEP: 7, SWAMP: 8, SNOW: 9,
  STONE: 10, WOOD: 11, GRAVEL: 12, DUNGEON: 13, BRIDGE: 14, CLIFF: 15, WALL: 16, FARMLAND: 17, ICE: 18, CARPET: 19,
} as const;
export type Terrain = typeof T[keyof typeof T];
const WALKABLE = new Set<number>([T.GRASS, T.DARK_GRASS, T.PATH, T.COBBLE, T.SAND, T.SWAMP, T.SNOW, T.STONE, T.WOOD, T.GRAVEL, T.DUNGEON, T.BRIDGE, T.FARMLAND, T.ICE, T.CARPET]);
export const isWater = (terrain: number) => terrain === T.WATER || terrain === T.DEEP;

export type ObjectKind =
  | "tree" | "stump" | "rock" | "spot" | "range" | "furnace" | "anvil" | "bank" | "altar" | "ladder" | "stall" | "obstacle"
  | "fountain" | "mill" | "dairy_cow" | "wheat" | "coop" | "gate" | "casket" | "decor" | "sign" | "tanning" | "well";
export type DecorKind =
  | "flowers" | "bush" | "boulder" | "lamp" | "bench" | "crate" | "barrel" | "tent" | "cactus" | "pine" | "dead_tree" | "statue"
  | "grave" | "fence" | "reeds" | "table" | "bed" | "shelf" | "pillar" | "rubble" | "snowman" | "lily" | "banner" | "torch" | "palm" | "hay" | "windmill" | "boat" | "chest";
export type WorldObject = {
  id: number; kind: ObjectKind; x: number; y: number; name: string; blocks: boolean;
  tree?: TreeKind; rock?: RockKind; spot?: SpotKind; decor?: DecorKind; stall?: StallKind;
  to?: { x: number; y: number }; action?: string; requires?: { quest?: string; item?: string; level?: number };
  obstacle?: { course: string; step: number; level: number; xp: number; ticks: number; lapXp?: number; last?: boolean };
  text?: string; big?: boolean;
};
export type StallKind = "bakery" | "silk" | "gem" | "fish";
export type SpawnDef = { kind: "npc" | "monster"; id: string; x: number; y: number; wander?: number };
export type RegionId =
  | "friendhollow" | "farmland" | "whisperwood" | "ashen_hills" | "emberforge" | "frostpeak" | "glass_lake" | "pale_dunes"
  | "oasis" | "murkmire" | "mossy_ruins" | "crypt" | "hollow_depths" | "coast";
export type Region = { id: RegionId; name: string; label: { x: number; y: number }; danger: number; underground?: boolean };
export const REGIONS: readonly Region[] = [
  { id: "coast", name: "The Pale Coast", label: { x: 10, y: 10 }, danger: 0 },
  { id: "friendhollow", name: "Friendhollow", label: { x: 121, y: 118 }, danger: 0 },
  { id: "farmland", name: "Hollow Farms", label: { x: 88, y: 122 }, danger: 0 },
  { id: "whisperwood", name: "Whisperwood", label: { x: 46, y: 80 }, danger: 1 },
  { id: "ashen_hills", name: "Ashen Hills", label: { x: 112, y: 48 }, danger: 1 },
  { id: "emberforge", name: "Emberforge", label: { x: 160, y: 48 }, danger: 0 },
  { id: "frostpeak", name: "Frostpeak", label: { x: 206, y: 22 }, danger: 3 },
  { id: "glass_lake", name: "Glass Lake", label: { x: 178, y: 166 }, danger: 0 },
  { id: "pale_dunes", name: "Pale Dunes", label: { x: 206, y: 96 }, danger: 2 },
  { id: "oasis", name: "Oasis", label: { x: 190, y: 116 }, danger: 0 },
  { id: "murkmire", name: "Murkmire", label: { x: 44, y: 166 }, danger: 2 },
  { id: "mossy_ruins", name: "Mossy Ruins", label: { x: 120, y: 172 }, danger: 2 },
  { id: "crypt", name: "Murkmire Crypt", label: { x: 34, y: 220 }, danger: 3, underground: true },
  { id: "hollow_depths", name: "Hollow Depths", label: { x: 150, y: 220 }, danger: 4, underground: true },
];
export const regionIndex = (id: RegionId) => REGIONS.findIndex(region => region.id === id);

/** A building's footprint (walls included) and how its roof looks. Inner rooms (inside another building) have no roof. */
export type Building = { x0: number; y0: number; x1: number; y1: number; roof: "gable" | "flat" | "none"; color: string; chimney: boolean; name: string };
export type World = {
  tiles: Uint8Array; region: Uint8Array; objects: WorldObject[]; objectAt: Int32Array; spawns: SpawnDef[];
  buildings: Building[];
  /** 1 + the index of the (outermost) building covering each tile, or 0. */
  buildingAt: Uint8Array;
  /** Ground height (world pixels) at every tile corner: (W + 1) × (H + 1), corner (i, j) sits at (i − ½, j − ½). */
  heights: Float32Array;
  places: Record<"spawn" | "hollow_square" | "emberforge" | "oasis" | "frostpeak" | "pier" | "crypt" | "depths" | "king", { x: number; y: number }>;
};

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Smooth value noise in [0, 1). */
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

export const tileIndex = (x: number, y: number) => y * W + x;
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

export function createWorld(seed = 20260927): World {
  const tiles = new Uint8Array(W * H), region = new Uint8Array(W * H), objects: WorldObject[] = [], spawns: SpawnDef[] = [];
  const objectAt = new Int32Array(W * H).fill(-1);
  const random = mulberry(seed), noise = makeNoise(seed, 9), noise2 = makeNoise(seed + 7, 4), coastNoise = makeNoise(seed + 3, 14);
  const get = (x: number, y: number) => inBounds(x, y) ? tiles[tileIndex(x, y)] : T.VOID;
  const put = (x: number, y: number, terrain: number) => { if (inBounds(x, y)) tiles[tileIndex(x, y)] = terrain; };
  const setRegion = (x: number, y: number, id: RegionId) => { if (inBounds(x, y)) region[tileIndex(x, y)] = regionIndex(id); };
  const fillRect = (x0: number, y0: number, x1: number, y1: number, terrain: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, terrain); };
  const blob = (cx: number, cy: number, rx: number, ry: number, terrain: number, wobble = 0.25, only?: (t: number) => boolean) => {
    for (let y = Math.floor(cy - ry * 1.4); y <= cy + ry * 1.4; y++) for (let x = Math.floor(cx - rx * 1.4); x <= cx + rx * 1.4; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, edge = 1 + (noise2(x, y) - 0.5) * wobble * 2;
      if (d <= edge && (!only || only(get(x, y)))) put(x, y, terrain);
    }
  };
  const regionBlob = (cx: number, cy: number, rx: number, ry: number, id: RegionId) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (noise(x, y) - 0.5) * 0.4) setRegion(x, y, id);
    }
  };
  /** Thick polyline: roads and rivers. */
  const line = (points: readonly (readonly [number, number])[], width: number, paint: (x: number, y: number, t: number) => void) => {
    for (let i = 0; i + 1 < points.length; i++) {
      const [ax, ay] = points[i], [bx, by] = points[i + 1], steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t, r = width / 2;
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3) paint(x, y, get(x, y));
        }
      }
    }
  };
  const road = (points: readonly (readonly [number, number])[], width = 2.6, terrain: number = T.PATH) => line(points, width, (x, y, t) => {
    if (isWater(t) || t === T.BRIDGE) put(x, y, T.BRIDGE);
    else if (t !== T.WALL && t !== T.VOID && t !== T.COBBLE && t !== T.WOOD && t !== T.STONE) put(x, y, terrain);
  });
  const river = (points: readonly (readonly [number, number])[], width: number) => line(points, width, (x, y, t) => { if (t !== T.VOID) put(x, y, width > 5 ? T.DEEP : T.WATER); });

  const add = (object: Omit<WorldObject, "id">) => {
    if (!inBounds(object.x, object.y)) return null;
    const index = tileIndex(object.x, object.y);
    if (objectAt[index] >= 0) return null;
    const full = { ...object, id: objects.length } as WorldObject;
    objects.push(full); objectAt[index] = full.id;
    return full;
  };
  const decor = (x: number, y: number, kind: DecorKind, blocks = true, name?: string) =>
    add({ kind: "decor", decor: kind, x, y, blocks, name: name ?? DECOR_NAMES[kind] });
  const clearAt = (x: number, y: number) => {
    if (!inBounds(x, y)) return;
    const index = tileIndex(x, y), id = objectAt[index];
    if (id >= 0) { objects[id] = { ...objects[id], kind: "decor", decor: "flowers", blocks: false, name: "__removed" }; objectAt[index] = -1; }
  };
  const free = (x: number, y: number) => WALKABLE.has(get(x, y)) && objectAt[tileIndex(x, y)] < 0 && get(x, y) !== T.BRIDGE && get(x, y) !== T.PATH && get(x, y) !== T.COBBLE;
  /** Four-walled building with a doorway, floored inside. `door` is the side the doorway faces. */
  const buildings: Building[] = [];
  const building = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", floor: number = T.WOOD, doorAt?: number, roof: Partial<Building> = {}) => {
    const inner = buildings.some(b => x0 > b.x0 && y0 > b.y0 && x1 < b.x1 && y1 < b.y1);
    buildings.push({ x0, y0, x1, y1, roof: inner ? "none" : "gable", color: ROOF_COLORS[buildings.length % ROOF_COLORS.length], chimney: false, name: "", ...roof, ...(inner ? { roof: "none" as const } : {}) });
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      put(x, y, edge ? T.WALL : floor); clearAt(x, y);
    }
    const mx = doorAt ?? Math.floor((x0 + x1) / 2), my = doorAt ?? Math.floor((y0 + y1) / 2);
    const gap = (x: number, y: number) => put(x, y, floor);
    if (door === "s") { gap(mx, y1); gap(mx + 1, y1); }
    if (door === "n") { gap(mx, y0); gap(mx + 1, y0); }
    if (door === "e") { gap(x1, my); gap(x1, my + 1); }
    if (door === "w") { gap(x0, my); gap(x0, my + 1); }
  };
  const scatter = (x0: number, y0: number, x1: number, y1: number, count: number, place: (x: number, y: number) => void, ok: (x: number, y: number) => boolean = free) => {
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 30) {
      const x = x0 + Math.floor(random() * (x1 - x0 + 1)), y = y0 + Math.floor(random() * (y1 - y0 + 1));
      if (ok(x, y)) { place(x, y); placed++; }
    }
  };
  const tree = (x: number, y: number, kind: TreeKind) => add({ kind: "tree", tree: kind, x, y, blocks: true, name: TREE_NAMES[kind] });
  const rock = (x: number, y: number, kind: RockKind) => add({ kind: "rock", rock: kind, x, y, blocks: true, name: "Rocks" });
  const spot = (x: number, y: number, kind: SpotKind) => add({ kind: "spot", spot: kind, x, y, blocks: true, name: kind === "lure" ? "Rod fishing spot" : kind === "deep" ? "Deep fishing spot" : "Fishing spot" });
  const shoreSpots = (x0: number, y0: number, x1: number, y1: number, kind: SpotKind, count: number) => {
    let placed = 0;
    for (let y = y0; y <= y1 && placed < count; y++) for (let x = x0; x <= x1 && placed < count; x++) {
      if (!isWater(get(x, y)) || objectAt[tileIndex(x, y)] >= 0) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => WALKABLE.has(get(x + dx, y + dy)) && get(x + dx, y + dy) !== T.BRIDGE) && random() < 0.35) { spot(x, y, kind); placed++; x += 2; }
    }
  };
  /** A cluster of rocks on open ground around a point. */
  const rockCluster = (cx: number, cy: number, radius: number, kind: RockKind, n: number) =>
    scatter(cx - radius, cy - radius, cx + radius, cy + radius, n, (x, y) => rock(x, y, kind), (x, y) => free(x, y) && Math.hypot(x - cx, y - cy) <= radius);
  const monster = (id: string, x: number, y: number, wander?: number) => spawns.push({ kind: "monster", id, x, y, wander });
  const npc = (id: string, x: number, y: number, wander = 0) => spawns.push({ kind: "npc", id, x, y, wander });
  const monsters = (id: string, x0: number, y0: number, x1: number, y1: number, count: number) =>
    scatter(x0, y0, x1, y1, count, (x, y) => monster(id, x, y), (x, y) => WALKABLE.has(get(x, y)) && objectAt[tileIndex(x, y)] < 0);

  // ---------- Land and sea ----------
  // The overworld is an island in the Pale Sea; the dungeon strip below starts as void.
  for (let y = 0; y < 200; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(x, y, W - 1 - x, 199 - y) + (coastNoise(x, y) - 0.5) * 12;
    const terrain = edge < 4 ? T.DEEP : edge < 7 ? T.WATER : edge < 9 ? T.SAND : noise(x, y) > 0.62 ? T.DARK_GRASS : T.GRASS;
    put(x, y, terrain); setRegion(x, y, edge < 12 ? "coast" : "friendhollow");
  }
  // Region footprints (music, labels, minimap). Order matters: later regions paint over earlier ones.
  const REGION_BLOBS: readonly [RegionId, number, number, number, number][] = [
    ["whisperwood", 44, 82, 40, 44], ["ashen_hills", 114, 48, 30, 26], ["emberforge", 162, 48, 18, 14], ["frostpeak", 206, 22, 36, 22],
    ["pale_dunes", 204, 102, 36, 36], ["glass_lake", 178, 166, 34, 26], ["murkmire", 44, 166, 38, 28], ["mossy_ruins", 122, 172, 26, 20],
    ["farmland", 88, 124, 16, 16], ["oasis", 190, 116, 11, 10], ["friendhollow", 121, 118, 20, 20],
  ];
  for (const [id, cx, cy, rx, ry] of REGION_BLOBS) regionBlob(cx, cy, rx, ry, id);

  // Terrain per region.
  const onLand = (t: number) => t === T.GRASS || t === T.DARK_GRASS;
  blob(206, 22, 38, 22, T.SNOW, 0.3, onLand);
  blob(204, 104, 36, 34, T.SAND, 0.3, onLand);
  blob(44, 168, 38, 28, T.SWAMP, 0.35, onLand);
  blob(114, 50, 26, 20, T.GRAVEL, 0.35, onLand);
  for (let y = 60; y < 128; y++) for (let x = 14; x < 82; x++) if (get(x, y) === T.GRASS && noise2(x, y) > 0.45) put(x, y, T.DARK_GRASS);
  // Cliffs ring the Ashen Hills and Frostpeak so the passes matter.
  for (let y = 24; y < 76; y++) for (let x = 84; x < 144; x++) {
    const d = ((x - 114) / 30) ** 2 + ((y - 50) / 25) ** 2;
    if (d > 0.82 && d < 1.02 && noise2(x, y) > 0.35) put(x, y, T.CLIFF);
  }
  for (let y = 2; y < 46; y++) for (let x = 168; x < 238; x++) {
    const d = ((x - 206) / 38) ** 2 + ((y - 22) / 24) ** 2;
    if (d > 0.86 && d < 1.0 && noise2(x, y) > 0.3) put(x, y, T.CLIFF);
  }
  // Swamp pools and bog channels.
  for (let y = 142; y < 196; y++) for (let x = 8; x < 84; x++) if (get(x, y) === T.SWAMP && noise(x * 1.7, y * 1.7) > 0.7) put(x, y, T.WATER);
  // Frozen tarn in Frostpeak.
  blob(222, 30, 7, 5, T.ICE, 0.2, t => t === T.SNOW);
  blob(222, 30, 5, 3, T.WATER, 0.15, t => t === T.ICE);

  // ---------- Water: the Silverrun and Glass Lake ----------
  blob(178, 168, 26, 17, T.WATER, 0.25);
  blob(182, 170, 18, 10, T.DEEP, 0.2);
  river([[156, 6], [150, 22], [142, 40], [144, 58], [147, 76], [143, 96], [144, 112], [146, 130], [152, 146], [162, 156]], 4.2);
  // A small stream feeding the farm pond, and the Oasis pool.
  blob(92, 138, 4, 3, T.WATER, 0.2);
  blob(190, 116, 5, 4, T.WATER, 0.2);
  // Swamp bog river (crossed by stepping stones or the long way round).
  river([[84, 144], [70, 150], [56, 152], [44, 150], [30, 156], [12, 160]], 3.2);

  // ---------- Roads ----------
  const TOWN = { x: 121, y: 121 };
  road([[TOWN.x, TOWN.y], [104, 121], [84, 118], [70, 110], [58, 98], [48, 92]]);              // west: farms → Grumblin camp
  road([[TOWN.x, TOWN.y], [121, 104], [118, 86], [114, 70], [114, 58]]);                        // north: castle → Ashen pass → mine
  road([[114, 64], [128, 56], [142, 50], [156, 48], [164, 48]]);                                 // mine → Emberforge
  road([[164, 46], [176, 38], [190, 32], [198, 30]]);                                            // Emberforge → Frostpeak camp
  road([[TOWN.x, TOWN.y], [140, 122], [156, 118], [172, 114], [184, 115]]);                     // east bridge → Oasis
  road([[140, 122], [150, 134], [158, 146], [164, 150]]);                                        // east → lake shore
  road([[TOWN.x, TOWN.y], [121, 140], [120, 156], [120, 166]]);                                  // south → Mossy Ruins
  road([[104, 121], [96, 136], [86, 146], [78, 152], [62, 164], [48, 172], [42, 176]]);        // south-west → Murkmire crypt
  road([[114, 58], [100, 58], [84, 70], [68, 76]]);                                              // mine → deep woods
  // Friendhollow's cobbled square and streets.
  blob(TOWN.x, TOWN.y, 14, 13, T.COBBLE, 0.12);
  // Emberforge, Frostpeak camp and Oasis grounds.
  blob(162, 48, 9, 7, T.COBBLE, 0.15);
  blob(196, 30, 6, 4, T.STONE, 0.15);
  blob(186, 110, 6, 4, T.COBBLE, 0.2);

  // ---------- Friendhollow ----------
  building(108, 108, 115, 114, "s", T.WOOD, undefined, { name: "Bank", color: "#9fabc2" });                              // Bank
  building(125, 108, 131, 113, "s");                                       // General store
  building(106, 124, 114, 132, "e", T.WOOD, undefined, { name: "Chapel", color: "#c6bed4" });                            // Chapel of the Old Friend
  building(127, 126, 133, 131, "w");                                       // Tessa's tannery
  building(133, 116, 138, 121, "w");                                       // Runa's Sigils
  building(113, 92, 129, 103, "s", T.STONE, undefined, { name: "Hollow Hall", roof: "flat", color: "#a39e96" });         // Hollow Hall (castle)
  fillRect(119, 104, 122, 107, T.PATH);
  for (let y = 93; y < 103; y++) { put(121, y, T.CARPET); put(122, y, T.CARPET); }
  building(114, 94, 118, 99, "e", T.STONE);                                // Castle kitchen (inside the hall)
  building(148, 104, 155, 109, "w", T.WOOD);                               // Riverside house (fishing), east bank
  // Bank interior.
  for (let x = 109; x <= 114; x++) if (x !== 111 && x !== 112) add({ kind: "bank", x, y: 110, blocks: true, name: "Bank booth" });
  npc("banker", 110, 109); npc("banker", 113, 109);
  // General store.
  npc("shop_general", 128, 110); decor(126, 109, "shelf"); decor(130, 109, "shelf"); decor(126, 112, "crate");
  // Chapel.
  add({ kind: "altar", x: 108, y: 128, blocks: true, name: "Altar" });
  npc("priest", 110, 127);
  for (let y = 126; y <= 130; y += 2) { decor(111, y, "bench"); decor(113, y, "bench"); }
  // Tannery.
  npc("tanner", 131, 128); add({ kind: "tanning", x: 132, y: 129, blocks: true, name: "Tanning rack" }); decor(128, 127, "barrel");
  // Sigil shop.
  npc("runa", 136, 118); decor(137, 117, "shelf"); decor(137, 120, "shelf");
  // Castle.
  npc("captain", 124, 97, 2); npc("guard", 120, 100, 3); npc("guard", 126, 100, 3);
  add({ kind: "range", x: 115, y: 95, blocks: true, name: "Cooking range" }); npc("cook", 116, 97, 1); decor(117, 95, "table");
  decor(125, 94, "banner"); decor(118, 94, "banner", true); decor(128, 94, "pillar"); decor(120, 94, "torch"); decor(123, 94, "torch");
  add({ kind: "casket", x: 127, y: 95, blocks: true, name: "Rare Casket chest" }); npc("emporium", 127, 97);
  // The square.
  add({ kind: "fountain", x: 121, y: 119, blocks: true, name: "Fountain" }); add({ kind: "fountain", x: 122, y: 119, blocks: true, name: "Fountain" });
  add({ kind: "fountain", x: 121, y: 120, blocks: true, name: "Fountain" }); add({ kind: "fountain", x: 122, y: 120, blocks: true, name: "Fountain" });
  decor(117, 117, "lamp"); decor(126, 117, "lamp"); decor(117, 124, "lamp"); decor(126, 124, "lamp");
  decor(119, 125, "statue", true, "Statue of the First Friend");
  decor(116, 121, "bench"); decor(127, 121, "bench");
  add({ kind: "sign", x: 124, y: 124, blocks: true, name: "Signpost", text: "North: Hollow Hall, Ashen Hills. East: Oasis, Glass Lake. South: Mossy Ruins. West: Hollow Farms, Whisperwood." });
  npc("guide", 123, 123); npc("glimmer", 118, 116); // #7730, the Old Glimmer
  for (let i = 0; i < 6; i++) npc("villager", 112 + Math.floor(random() * 20), 115 + Math.floor(random() * 12), 5);
  add({ kind: "well", x: 131, y: 122, blocks: true, name: "Well" });
  // Riverside house: Pike's Tackle.
  npc("pike", 152, 106); decor(154, 105, "barrel"); decor(154, 108, "crate");
  // Trees and flowers around town.
  scatter(98, 100, 146, 142, 26, (x, y) => tree(x, y, "tree"), (x, y) => free(x, y) && get(x, y) === T.GRASS);
  scatter(104, 104, 140, 140, 30, (x, y) => decor(x, y, random() > 0.5 ? "flowers" : "bush", false), (x, y) => free(x, y) && get(x, y) === T.GRASS);
  monsters("ink_rat", 130, 132, 140, 140, 4);

  // ---------- Hollow Farms ----------
  // Cow pen (fenced) with a dairy cow; chicken coop; wheat field; windmill.
  for (let x = 82; x <= 98; x++) { decor(x, 108, "fence"); if (x < 88 || x > 90) decor(x, 116, "fence"); }
  for (let y = 108; y <= 116; y++) { decor(82, y, "fence"); decor(98, y, "fence"); }
  monsters("cow", 84, 109, 96, 115, 5);
  add({ kind: "dairy_cow", x: 92, y: 112, blocks: true, name: "Dairy cow" });
  for (let x = 84; x <= 92; x++) { decor(x, 126, "fence"); decor(x, 134, "fence"); }
  for (let y = 126; y <= 134; y++) { decor(84, y, "fence"); if (y !== 130) decor(92, y, "fence"); }
  monsters("chicken", 85, 127, 91, 133, 5);
  add({ kind: "coop", x: 86, y: 128, blocks: true, name: "Chicken coop" });
  for (let y = 124; y <= 136; y++) for (let x = 96; x <= 102; x++) { put(x, y, T.FARMLAND); if ((x + y) % 2 === 0) add({ kind: "wheat", x, y, blocks: false, name: "Wheat" }); }
  decor(78, 122, "windmill", true, "Windmill"); add({ kind: "mill", x: 79, y: 124, blocks: true, name: "Mill hopper" }); npc("miller", 80, 125, 1);
  decor(87, 120, "hay"); decor(94, 120, "hay"); decor(80, 118, "crate");

  // ---------- Whisperwood ----------
  scatter(56, 70, 82, 118, 90, (x, y) => tree(x, y, "tree"));
  scatter(38, 60, 64, 112, 70, (x, y) => tree(x, y, random() > 0.35 ? "oak" : "tree"));
  scatter(22, 56, 44, 90, 36, (x, y) => tree(x, y, random() > 0.4 ? "maple" : "oak"));
  scatter(14, 94, 30, 118, 14, (x, y) => tree(x, y, "yew"));
  scatter(20, 50, 80, 120, 60, (x, y) => decor(x, y, random() > 0.6 ? "bush" : random() > 0.5 ? "flowers" : "boulder", random() > 0.6));
  // Grumblin camp.
  blob(48, 92, 7, 6, T.PATH, 0.2);
  for (let i = 0; i < 6; i++) clearAt(48 + Math.round(Math.cos(i) * 5), 92 + Math.round(Math.sin(i) * 4));
  decor(44, 89, "tent"); decor(52, 89, "tent"); decor(47, 96, "tent"); decor(49, 92, "torch"); decor(46, 93, "crate");
  monsters("grumblin", 38, 84, 58, 100, 12); monster("grumblin_chief", 49, 94, 3);
  monsters("grumblin", 60, 104, 74, 114, 4);

  // ---------- Ashen Hills: the mine ----------
  const mine = (x: number, y: number, kind: RockKind) => { if (get(x, y) === T.GRAVEL && objectAt[tileIndex(x, y)] < 0) rock(x, y, kind); };
  for (let i = 0; i < 9; i++) { mine(104 + i * 2, 50 + (i % 3), "pewter"); mine(105 + i * 2, 55 + (i % 2), "pewter"); }
  for (let i = 0; i < 5; i++) mine(100 + i, 45 + (i % 2) * 2, "clay");
  for (let i = 0; i < 7; i++) mine(118 + i * 2, 42 + (i % 2) * 2, "blackiron");
  for (let i = 0; i < 6; i++) mine(122 + (i % 3) * 2, 60 + Math.floor(i / 3) * 3, "inkcoal");
  mine(126, 36, "moonsilver"); mine(128, 37, "moonsilver"); mine(106, 38, "gem");
  rockCluster(106, 52, 6, "pewter", 5); rockCluster(110, 56, 6, "pewter", 6); rockCluster(122, 44, 5, "blackiron", 4); rockCluster(124, 62, 5, "inkcoal", 4);
  scatter(90, 30, 138, 70, 30, (x, y) => decor(x, y, "boulder"), (x, y) => free(x, y) && get(x, y) === T.GRAVEL);
  monsters("ink_rat", 98, 40, 130, 64, 8);
  add({ kind: "sign", x: 114, y: 66, blocks: true, name: "Signpost", text: "Ashen Mine. Pewter to the west, blackiron to the north, inkcoal to the east. Mind the rats." }); decor(110, 60, "crate"); decor(112, 61, "barrel");
  npc("miner", 116, 54, 3);

  // ---------- Emberforge ----------
  building(155, 42, 161, 47, "s", T.STONE, undefined, { name: "Forge hall", color: "#8f8a83", chimney: true });           // Forge hall
  add({ kind: "furnace", x: 157, y: 43, blocks: true, name: "Furnace" }); add({ kind: "furnace", x: 158, y: 43, blocks: true, name: "Furnace" });
  add({ kind: "anvil", x: 159, y: 45, blocks: true, name: "Anvil" }); add({ kind: "anvil", x: 156, y: 45, blocks: true, name: "Anvil" });
  npc("smith", 160, 44, 1);
  building(164, 42, 169, 46, "s");                                         // Arms shop
  npc("armsmaster", 166, 44); decor(165, 43, "shelf"); decor(168, 43, "shelf");
  building(163, 50, 168, 54, "n");                                         // Axe shop
  npc("axel", 165, 52); decor(167, 53, "crate");
  building(155, 50, 160, 54, "n");                                         // Emberforge bank
  add({ kind: "bank", x: 157, y: 53, blocks: true, name: "Bank booth" }); add({ kind: "bank", x: 158, y: 53, blocks: true, name: "Bank booth" }); npc("banker", 157, 52);
  decor(162, 49, "lamp"); decor(170, 48, "barrel"); decor(153, 48, "crate");
  add({ kind: "range", x: 171, y: 50, blocks: true, name: "Cooking range" });
  for (let i = 0; i < 4; i++) mine(174 + i * 2, 54, "inkcoal");
  scatter(170, 38, 186, 60, 8, (x, y) => rock(x, y, i2(random) ? "inkcoal" : "blackiron"), (x, y) => free(x, y) && (get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS));

  // ---------- Frostpeak ----------
  building(192, 27, 199, 32, "w", T.WOOD, undefined, { name: "Frostpeak lodge", color: "#f3f2ee", chimney: true });      // Frostpeak lodge
  add({ kind: "bank", x: 197, y: 28, blocks: true, name: "Bank booth" }); npc("banker", 196, 29); npc("outfitter", 194, 30);
  add({ kind: "range", x: 193, y: 28, blocks: true, name: "Cooking range" });
  scatter(172, 6, 236, 44, 60, (x, y) => decor(x, y, random() > 0.3 ? "pine" : "boulder"), (x, y) => free(x, y) && get(x, y) === T.SNOW);
  scatter(200, 36, 230, 44, 10, (x, y) => tree(x, y, "ashwood"), (x, y) => free(x, y) && get(x, y) === T.SNOW);
  decor(188, 34, "snowman", true, "Snow Friend");
  monsters("wolf", 180, 14, 204, 26, 8);
  monsters("frost_yeti", 210, 8, 232, 22, 5);
  rockCluster(214, 36, 5, "glimmer", 5); rockCluster(226, 14, 5, "rarite", 3); rockCluster(206, 40, 4, "moonsilver", 4); rockCluster(186, 20, 4, "inkcoal", 4);
  shoreSpots(214, 24, 230, 36, "deep", 3);

  // ---------- Glass Lake and Pike's Pier ----------
  const lakeShoreSpots = () => {
    let net = 0, bait = 0;
    for (let y = 148; y < 190 && (net < 5 || bait < 4); y++) for (let x = 150; x < 206; x++) {
      if (get(x, y) !== T.WATER || objectAt[tileIndex(x, y)] >= 0) continue;
      const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => WALKABLE.has(get(x + dx, y + dy)));
      if (!shore || random() > 0.08) continue;
      if (x < 176 && net < 5) { spot(x, y, "net"); net++; } else if (bait < 4) { spot(x, y, "bait"); bait++; }
    }
  };
  lakeShoreSpots();
  for (let y = 150; y <= 164; y++) { put(178, y, T.BRIDGE); put(179, y, T.BRIDGE); }
  for (let x = 176; x <= 181; x++) { put(x, 164, T.BRIDGE); put(x, 165, T.BRIDGE); }
  spot(177, 158, "cage"); spot(180, 158, "cage"); spot(175, 164, "harpoon"); spot(182, 164, "harpoon"); spot(178, 166, "deep");
  decor(174, 157, "boat", false, "Rowing boat"); decor(181, 152, "barrel"); decor(177, 152, "crate");
  npc("fisher", 179, 153, 2);
  building(166, 140, 172, 145, "s", T.WOOD, undefined, { name: "Lakeside cabin", chimney: true });                         // Lakeside cabin with a range
  add({ kind: "range", x: 167, y: 141, blocks: true, name: "Cooking range" }); add({ kind: "bank", x: 171, y: 141, blocks: true, name: "Bank deposit box" });
  scatter(150, 138, 206, 192, 30, (x, y) => decor(x, y, random() > 0.5 ? "reeds" : "flowers", false), (x, y) => free(x, y) && (get(x, y) === T.GRASS || get(x, y) === T.SAND));
  scatter(152, 136, 204, 192, 16, (x, y) => tree(x, y, "willow"), (x, y) => free(x, y) && get(x, y) === T.GRASS && [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [0, 2]].some(([dx, dy]) => isWater(get(x + dx, y + dy))));
  scatter(152, 146, 200, 186, 8, (x, y) => decor(x, y, "lily", false), (x, y) => get(x, y) === T.WATER && objectAt[tileIndex(x, y)] < 0);
  // River fishing (lure) and willows north of town.
  let lure = 0;
  for (let y = 86; y < 112 && lure < 5; y += 4) for (let x = 138; x < 152; x++) {
    if (get(x, y) === T.WATER && WALKABLE.has(get(x - 1, y)) && objectAt[tileIndex(x, y)] < 0) { spot(x, y, "lure"); lure++; break; }
  }
  scatter(132, 80, 156, 106, 14, (x, y) => tree(x, y, "willow"), (x, y) => free(x, y) && [[1, 0], [-1, 0], [2, 0], [-2, 0]].some(([dx]) => isWater(get(x + dx, y))));

  // ---------- Pale Dunes and the Oasis ----------
  building(180, 104, 186, 108, "s", T.WOOD, undefined, { name: "Oasis bank", roof: "flat", color: "#e2d7c0" });          // Oasis bank
  add({ kind: "bank", x: 182, y: 105, blocks: true, name: "Bank booth" }); add({ kind: "bank", x: 184, y: 105, blocks: true, name: "Bank booth" }); npc("banker", 183, 106);
  add({ kind: "stall", stall: "bakery", x: 183, y: 112, blocks: true, name: "Bakery stall" });
  add({ kind: "stall", stall: "silk", x: 186, y: 112, blocks: true, name: "Silk stall" });
  add({ kind: "stall", stall: "fish", x: 180, y: 112, blocks: true, name: "Fish stall" });
  add({ kind: "stall", stall: "gem", x: 189, y: 110, blocks: true, name: "Gem stall" });
  npc("merchant", 186, 110, 2); npc("villager", 184, 114, 4); npc("villager", 181, 114, 4);
  scatter(172, 72, 236, 136, 40, (x, y) => decor(x, y, random() > 0.35 ? "cactus" : "boulder"), (x, y) => free(x, y) && get(x, y) === T.SAND);
  scatter(186, 112, 196, 122, 6, (x, y) => decor(x, y, "palm"), (x, y) => free(x, y) && [[2, 0], [0, 2], [-2, 0], [0, -2]].some(([dx, dy]) => isWater(get(x + dx, y + dy))));
  monsters("bandit", 198, 84, 226, 104, 10);
  for (let i = 0; i < 5; i++) { const x = 222 + (i % 3) * 2, y = 118 + Math.floor(i / 3) * 3; if (get(x, y) === T.SAND) rock(x, y, "gem"); }
  decor(214, 78, "rubble"); decor(216, 79, "pillar"); decor(211, 80, "pillar");

  // ---------- Murkmire ----------
  scatter(10, 142, 82, 194, 40, (x, y) => decor(x, y, random() > 0.5 ? "dead_tree" : "reeds", random() > 0.5), (x, y) => free(x, y) && get(x, y) === T.SWAMP);
  scatter(12, 140, 80, 194, 14, (x, y) => tree(x, y, "willow"), (x, y) => free(x, y) && get(x, y) === T.SWAMP);
  monsters("swamp_lurker", 16, 158, 76, 190, 14);
  building(36, 172, 44, 179, "n", T.STONE, undefined, { name: "Crypt", color: "#6d6b67" });                              // The crypt
  add({ kind: "ladder", x: 40, y: 176, blocks: true, name: "Crypt stairs", action: "Climb-down", to: { x: 34, y: 208 } });
  for (let i = 0; i < 8; i++) decor(30 + (i % 4) * 3, 182 + Math.floor(i / 4) * 3, "grave", true, "Grave");
  // Stepping stones over the bog river: an Agility shortcut.
  for (let y = 146; y <= 157; y++) put(60, y, y === 147 || y === 148 || y === 155 || y === 156 ? T.SWAMP : T.WATER);
  put(60, 146, T.SWAMP); put(60, 157, T.SWAMP);
  add({ kind: "obstacle", x: 60, y: 148, blocks: true, name: "Stepping stone", action: "Jump-across", to: { x: 60, y: 156 }, obstacle: { course: "shortcut", step: 0, level: 20, xp: 15, ticks: 4 } });
  add({ kind: "obstacle", x: 60, y: 155, blocks: true, name: "Stepping stone", action: "Jump-across", to: { x: 60, y: 147 }, obstacle: { course: "shortcut", step: 0, level: 20, xp: 15, ticks: 4 } });
  npc("witch", 26, 150, 2);

  // ---------- Mossy Ruins (and the Hollow Rift) ----------
  scatter(100, 156, 144, 192, 34, (x, y) => decor(x, y, random() > 0.5 ? "rubble" : "pillar"), (x, y) => free(x, y));
  scatter(100, 156, 144, 192, 20, (x, y) => tree(x, y, random() > 0.5 ? "oak" : "tree"));
  monsters("moss_colossus", 108, 172, 136, 188, 6);
  blob(122, 186, 4, 3, T.STONE, 0.2);
  add({ kind: "ladder", x: 122, y: 186, blocks: true, name: "Hollow Rift", action: "Climb-down", to: { x: 92, y: 212 } });
  decor(120, 184, "pillar"); decor(124, 184, "pillar"); decor(119, 188, "torch"); decor(125, 188, "torch");

  // ---------- Friendhollow Agility Course (the meadow west of Hollow Hall) ----------
  // Each obstacle crosses a gap you can't walk; you land on the far side and face the next one.
  const COURSE: readonly [string, string, number, number][] = [
    ["Log balance", "Walk-across", 4, 7], ["Obstacle net", "Climb-over", 1, 7], ["Balance beam", "Walk-across", 4, 8],
    ["Rope swing", "Swing-on", 2, 9], ["Low wall", "Climb-over", 1, 7],
  ];
  const courseY = 99;
  fillRect(86, courseY - 2, 112, courseY + 2, T.GRASS);
  for (let x = 86; x <= 112; x++) for (let y = courseY - 2; y <= courseY + 2; y++) clearAt(x, y);
  let cx = 88;
  COURSE.forEach(([name, action, gap, xp], step) => {
    for (let x = cx + 1; x <= cx + gap; x++) put(x, courseY, step === 1 || step === 4 ? T.CLIFF : T.WATER);
    add({ kind: "obstacle", x: cx, y: courseY, blocks: true, name, action, to: { x: cx + gap + 1, y: courseY }, obstacle: { course: "friendhollow", step, level: 1, xp, ticks: Math.max(3, gap + 1), lapXp: 40, last: step === COURSE.length - 1 } });
    cx += gap + 2;
  });
  for (let x = 86; x <= cx; x++) { decor(x, courseY - 1, "fence"); decor(x, courseY + 1, "fence"); }
  clearAt(86, courseY - 1); clearAt(86, courseY + 1); clearAt(cx, courseY - 1); clearAt(cx, courseY + 1);
  npc("agility", 86, courseY + 2, 1);
  add({ kind: "sign", x: 85, y: courseY + 3, blocks: true, name: "Signpost", text: "Friendhollow Agility Course. Start at the log balance, go east, and finish all five obstacles for a lap bonus." });

  // ---------- Wild groves across the open meadows ----------
  const grove = makeNoise(seed + 11, 7), townDistance = (x: number, y: number) => Math.hypot(x - TOWN.x, y - TOWN.y);
  for (let y = 12; y < 196; y++) for (let x = 12; x < 228; x++) {
    const terrain = get(x, y);
    if ((terrain !== T.GRASS && terrain !== T.DARK_GRASS) || !free(x, y) || townDistance(x, y) < 17) continue;
    if (x >= 84 && x <= 114 && y >= 95 && y <= 104) continue; // agility meadow
    const g = grove(x, y), roll = random();
    if (g > 0.66 && roll < 0.3) tree(x, y, townDistance(x, y) > 55 && roll < 0.08 ? "oak" : "tree");
    else if (g > 0.5 && roll < 0.025) decor(x, y, "boulder");
    else if (roll < 0.018) decor(x, y, roll < 0.009 ? "flowers" : "bush", false);
  }
  monsters("cow", 60, 128, 76, 138, 3);

  // ---------- Dungeons ----------
  for (let y = 200; y < H; y++) for (let x = 0; x < W; x++) { put(x, y, T.VOID); setRegion(x, y, "crypt"); }
  // Murkmire Crypt (x 20..70): corridors of skeletons, and the crypt key on the altar.
  const rooms: [number, number, number, number, RegionId, number][] = [
    [28, 205, 42, 214, "crypt", T.DUNGEON], [42, 208, 60, 211, "crypt", T.DUNGEON], [52, 211, 68, 230, "crypt", T.DUNGEON], [24, 218, 52, 232, "crypt", T.DUNGEON],
    [84, 206, 100, 218, "hollow_depths", T.DUNGEON], [100, 210, 150, 214, "hollow_depths", T.DUNGEON], [120, 214, 150, 234, "hollow_depths", T.DUNGEON],
    [150, 222, 176, 226, "hollow_depths", T.DUNGEON], [177, 212, 214, 236, "hollow_depths", T.STONE],
  ];
  for (const [x0, y0, x1, y1, id] of rooms) for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) { if (get(x, y) === T.VOID) put(x, y, T.WALL); setRegion(x, y, id); }
  for (const [x0, y0, x1, y1, , floor] of rooms) fillRect(x0, y0, x1, y1, floor);
  add({ kind: "ladder", x: 32, y: 206, blocks: true, name: "Stairs", action: "Climb-up", to: { x: 40, y: 174 } });
  monsters("skeleton", 52, 212, 68, 230, 8); monsters("skeleton", 26, 219, 48, 231, 6);
  add({ kind: "altar", x: 28, y: 222, blocks: true, name: "Crypt altar", text: "crypt" });
  for (let x = 25; x <= 49; x += 6) { decor(x, 218, "pillar"); decor(x, 232, "torch", true); }
  decor(66, 214, "chest", true, "Old chest");

  // Hollow Depths (x 80..230): shades, hollow sentinels and the king's throne room behind a gate.
  add({ kind: "ladder", x: 90, y: 208, blocks: true, name: "Rope", action: "Climb-up", to: { x: 122, y: 188 } });
  monsters("shade", 86, 208, 100, 218, 5); monsters("shade", 104, 210, 148, 214, 6); monsters("hollow_sentinel", 122, 216, 148, 233, 8);
  add({ kind: "gate", x: 176, y: 224, blocks: true, name: "Hollow gate", action: "Open", to: { x: 177, y: 224 }, requires: { quest: "hollow_king" } });
  for (let y = 221; y <= 227; y++) if (y !== 224) put(176, y, T.WALL);
  monster("hollow_king", 198, 224, 3);
  // A carpet from the gate to the empty throne, lit by braziers.
  for (let x = 177; x <= 205; x++) { put(x, 223, T.CARPET); put(x, 224, T.CARPET); put(x, 225, T.CARPET); }
  for (let x = 182; x <= 202; x += 5) { decor(x, 221, "torch"); decor(x, 227, "torch"); }
  for (let x = 180; x <= 212; x += 8) { decor(x, 213, "pillar"); decor(x, 235, "pillar"); }
  decor(206, 224, "statue", true, "The empty throne");
  for (let x = 124; x <= 148; x += 8) decor(x, 234, "torch");

  // Clean-up: removed markers stop blocking, and every station, rock or spot keeps a side you can stand on.
  for (const object of objects) if (object.name === "__removed") object.blocks = false;
  const NEEDS_ACCESS = new Set<ObjectKind>(["spot", "bank", "range", "furnace", "anvil", "altar", "stall", "ladder", "well", "mill", "coop", "dairy_cow", "casket", "tanning", "sign", "rock", "gate"]);
  const standable = (x: number, y: number) => WALKABLE.has(get(x, y)) && (objectAt[tileIndex(x, y)] < 0 || !objects[objectAt[tileIndex(x, y)]].blocks);
  for (const object of objects) {
    if (!NEEDS_ACCESS.has(object.kind)) continue;
    const sides = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dx, dy]) => [object.x + dx, object.y + dy] as const);
    if (sides.some(([x, y]) => standable(x, y))) continue;
    const clearable = sides.find(([x, y]) => WALKABLE.has(get(x, y)) && objectAt[tileIndex(x, y)] >= 0 && (objects[objectAt[tileIndex(x, y)]].kind === "tree" || objects[objectAt[tileIndex(x, y)]].kind === "decor"));
    if (clearable) clearAt(clearable[0], clearable[1]);
  }
  for (const object of objects) if (object.name === "__removed") object.blocks = false;

  const places: World["places"] = {
    spawn: { x: 121, y: 123 }, hollow_square: { x: 121, y: 122 }, emberforge: { x: 162, y: 49 }, oasis: { x: 186, y: 115 },
    frostpeak: { x: 195, y: 34 }, pier: { x: 178, y: 150 }, crypt: { x: 40, y: 180 }, depths: { x: 122, y: 188 }, king: { x: 198, y: 224 },
  };
  const buildingAt = new Uint8Array(W * H);
  buildings.forEach((b, index) => { if (b.roof === "none") return; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) buildingAt[y * W + x] = index + 1; });
  return { tiles, region, objects, objectAt, spawns, places, heights: buildHeights(tiles, seed), buildings, buildingAt };
}
const i2 = (random: () => number) => random() > 0.5;
/** Faded roof tiles in the Rare Friends accents. */
const ROOF_COLORS = ["#c99a96", "#9aab92", "#8f9cb2", "#cdb98a", "#a996b5"];
const TREE_NAMES: Record<TreeKind, string> = { tree: "Tree", oak: "Oak", willow: "Willow", maple: "Maple tree", yew: "Yew", ashwood: "Ashwood" };
const DECOR_NAMES: Record<DecorKind, string> = {
  flowers: "Flowers", bush: "Bush", boulder: "Boulder", lamp: "Lamp post", bench: "Bench", crate: "Crate", barrel: "Barrel", tent: "Tent",
  cactus: "Cactus", pine: "Pine tree", dead_tree: "Dead tree", statue: "Statue", grave: "Grave", fence: "Fence", reeds: "Reeds", table: "Table",
  bed: "Bed", shelf: "Shelves", pillar: "Pillar", rubble: "Rubble", snowman: "Snow Friend", lily: "Lily pad", banner: "Banner", torch: "Torch",
  palm: "Palm tree", hay: "Hay bales", windmill: "Windmill", boat: "Boat", chest: "Chest",
};

export function terrainAt(world: World, x: number, y: number) { return inBounds(x, y) ? world.tiles[tileIndex(x, y)] : T.VOID; }
export function objectAtTile(world: World, x: number, y: number): WorldObject | null {
  if (!inBounds(x, y)) return null;
  const id = world.objectAt[tileIndex(x, y)];
  return id >= 0 ? world.objects[id] : null;
}
/** Whether a tile can be stood on (terrain and blocking objects). Dynamic blocks (depleted trees etc.) keep blocking. */
export function walkable(world: World, x: number, y: number) {
  if (!inBounds(x, y) || !WALKABLE.has(world.tiles[tileIndex(x, y)])) return false;
  const object = objectAtTile(world, x, y);
  return !object || !object.blocks;
}
// ---------- Topology ----------
/** How hilly each terrain is (peak height in world pixels). Flat ground (towns, floors, water) is 0. */
const RELIEF: Record<number, number> = {
  [T.GRASS]: 46, [T.DARK_GRASS]: 58, [T.PATH]: 26, [T.SAND]: 38, [T.SWAMP]: 10, [T.SNOW]: 84, [T.GRAVEL]: 60, [T.CLIFF]: 90, [T.FARMLAND]: 6,
};
const FLAT = new Set<number>([T.VOID, T.WATER, T.DEEP, T.BRIDGE, T.COBBLE, T.WOOD, T.STONE, T.CARPET, T.WALL, T.DUNGEON, T.ICE]);
/**
 * Rolling hills from two noise octaves, scaled by each terrain's relief, eased to flat ground near water, towns,
 * buildings and bridges (so shores and streets stay level), then blurred once for gentle slopes.
 */
function buildHeights(tiles: Uint8Array, seed: number): Float32Array {
  const broad = makeNoise(seed + 21, 13), fine = makeNoise(seed + 33, 5);
  // Distance (in tiles, capped) from every tile to the nearest flat tile.
  const distance = new Uint8Array(W * H).fill(255), queue: number[] = [];
  for (let i = 0; i < W * H; i++) if (FLAT.has(tiles[i])) { distance[i] = 0; queue.push(i); }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head], x = index % W, y = (index - x) / W, d = distance[index];
    if (d >= 6) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const next = ny * W + nx;
      if (distance[next] > d + 1) { distance[next] = d + 1; queue.push(next); }
    }
  }
  const CW = W + 1, raw = new Float32Array(CW * (H + 1));
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
    let relief = 0, near = 255, count = 0;
    for (const [tx, ty] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) { near = 0; continue; }
      const t = tiles[ty * W + tx];
      relief += RELIEF[t] ?? 0; count++; near = Math.min(near, distance[ty * W + tx]);
    }
    const ease = Math.min(1, near / 4), smooth = ease * ease * (3 - 2 * ease);
    const shape = broad(i, j) * 0.75 + fine(i, j) * 0.25;
    raw[j * CW + i] = count ? (relief / count) * (0.12 + 0.88 * Math.pow(Math.max(0, shape), 1.6)) * smooth : 0;
  }
  const heights = new Float32Array(raw.length);
  for (let j = 0; j <= H; j++) for (let i = 0; i <= W; i++) {
    let sum = 0, n = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const x = i + di, y = j + dj; if (x >= 0 && y >= 0 && x <= W && y <= H) { sum += raw[y * CW + x]; n++; } }
    heights[j * CW + i] = raw[j * CW + i] === 0 ? 0 : sum / n;
  }
  return heights;
}
/** Ground height under any point (tile centres are at integer coordinates), by bilinear interpolation of the corners. */
export function groundHeight(world: World, x: number, y: number): number {
  const u = Math.max(0, Math.min(W - 0.001, x + 0.5)), v = Math.max(0, Math.min(H - 0.001, y + 0.5)), i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, CW = W + 1, h = world.heights;
  const a = h[j * CW + i], b = h[j * CW + i + 1], c = h[(j + 1) * CW + i], d = h[(j + 1) * CW + i + 1];
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}
export function cornerHeight(world: World, i: number, j: number) { return world.heights[Math.max(0, Math.min(H, j)) * (W + 1) + Math.max(0, Math.min(W, i))]; }

export function regionAt(world: World, x: number, y: number): Region {
  return REGIONS[inBounds(x, y) ? world.region[tileIndex(x, y)] : 0] ?? REGIONS[0];
}
