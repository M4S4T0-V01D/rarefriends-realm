/**
 * The Realm: a 350 × 280 tile world, built deterministically from a seed and hand-placed landmarks.
 * Overworld in y < 200; the two dungeons (Murkmire Crypt, Hollow Depths) live in the strip below, reached by ladders.
 * Upper storeys of buildings (the castle's floors) are stored in the rows from FLOOR_Y down, and drawn stacked on the
 * building they belong to: a tile there stands for the real tile (x − dx, y − dy), `level` storeys up.
 */
import type { RockKind, SpotKind, TreeKind } from "./data.ts";
import { buildExpansion } from "./expansion.ts";

export const W = 720, H = 620;
/** The overworld is rows 0–519; rows 520–579 are the dungeons (reached by ladders, never seen from above); rows from FLOOR_Y hold upper storeys. */
export const OVERWORLD_H = 520, DUNGEON_Y = 520, FLOOR_Y = 580;
/**
 * Where the original Realm (the mainland, 350 × 200 with 40 dungeon rows and 40 storey rows) sits in the wider world.
 * Its content is generated in its own coordinates and set in here, so nothing on it moves relative to anything else.
 */
export const MAINLAND = { x: 185, y: 160, w: 350, h: 200, dungeonRows: 40, floorRows: 40 } as const;
/** A mainland coordinate (overworld, dungeon row or storey row) in world coordinates. */
export function mainlandToWorld(x: number, y: number): [number, number] {
  if (y >= MAINLAND.h + MAINLAND.dungeonRows) return [x + MAINLAND.x, FLOOR_Y + (y - MAINLAND.h - MAINLAND.dungeonRows)];
  if (y >= MAINLAND.h) return [x + MAINLAND.x, DUNGEON_Y + (y - MAINLAND.h)];
  return [x + MAINLAND.x, y + MAINLAND.y];
}
/** The mainland's overworld rectangle in world coordinates (inclusive). */
export const MAINLAND_RECT = { x0: MAINLAND.x, y0: MAINLAND.y, x1: MAINLAND.x + MAINLAND.w - 1, y1: MAINLAND.y + MAINLAND.h - 1 } as const;
/** One storey, in world pixels (the height of a wall). */
export const STOREY = 42;
export const T = {
  VOID: 0, GRASS: 1, DARK_GRASS: 2, PATH: 3, COBBLE: 4, SAND: 5, WATER: 6, DEEP: 7, SWAMP: 8, SNOW: 9,
  STONE: 10, WOOD: 11, GRAVEL: 12, DUNGEON: 13, BRIDGE: 14, CLIFF: 15, WALL: 16, FARMLAND: 17, ICE: 18, CARPET: 19, ASH: 20, LAVA: 21,
} as const;
export type Terrain = typeof T[keyof typeof T];
const WALKABLE = new Set<number>([T.GRASS, T.DARK_GRASS, T.PATH, T.COBBLE, T.SAND, T.SWAMP, T.SNOW, T.STONE, T.WOOD, T.GRAVEL, T.DUNGEON, T.BRIDGE, T.FARMLAND, T.ICE, T.CARPET, T.ASH]);
export const isWater = (terrain: number) => terrain === T.WATER || terrain === T.DEEP;
/** The sparring ring east of Market Street: inside it, players may duel each other (safely: nobody dies or loses items). */
export const RING = { x0: 138 + MAINLAND.x, y0: 144 + MAINLAND.y, x1: 144 + MAINLAND.x, y1: 149 + MAINLAND.y };
export const inRing = (x: number, y: number) => x >= RING.x0 && x <= RING.x1 && y >= RING.y0 && y <= RING.y1;

export type ObjectKind =
  | "tree" | "stump" | "rock" | "spot" | "range" | "furnace" | "anvil" | "bank" | "altar" | "ladder" | "stall" | "obstacle"
  | "fountain" | "mill" | "dairy_cow" | "wheat" | "coop" | "gate" | "casket" | "decor" | "sign" | "tanning" | "well" | "sigil_altar" | "wheel" | "herb" | "still";
export type DecorKind =
  | "flowers" | "bush" | "boulder" | "lamp" | "bench" | "crate" | "barrel" | "tent" | "cactus" | "pine" | "dead_tree" | "statue"
  | "grave" | "fence" | "reeds" | "table" | "bed" | "shelf" | "pillar" | "rubble" | "snowman" | "lily" | "banner" | "torch" | "palm" | "hay" | "windmill" | "boat" | "chest"
  | "throne" | "armour" | "logpile" | "stump" | "target" | "ruin_wall" | "old_friend" | "tomb" | "crypt" | "obelisk" | "bones" | "hearth";
export type WorldObject = {
  id: number; kind: ObjectKind; x: number; y: number; name: string; blocks: boolean;
  tree?: TreeKind; rock?: RockKind; spot?: SpotKind; decor?: DecorKind; stall?: StallKind;
  to?: { x: number; y: number }; action?: string; requires?: { quest?: string; item?: string; level?: number };
  obstacle?: { course: string; step: number; level: number; xp: number; ticks: number; lapXp?: number; last?: boolean };
  text?: string; big?: boolean; look?: "stairs";
  /** A shop sign: the item painted on its board ("__horse" for the stables). */
  icon?: string;
  /** A sigil altar: the sigil it presses. */
  sigil?: string;
  /** A crumbling ruin wall's height (pixels). */
  height?: number;
  /** A herb patch: which herb grows here (Apothecary). */
  herb?: string;
};
export type StallKind = "bakery" | "silk" | "gem" | "fish";
export type SpawnDef = { kind: "npc" | "monster"; id: string; x: number; y: number; wander?: number };
export type RegionId =
  | "friendhollow" | "farmland" | "whisperwood" | "ashen_hills" | "emberforge" | "frostpeak" | "glass_lake" | "pale_dunes"
  | "oasis" | "murkmire" | "mossy_ruins" | "crypt" | "hollow_depths" | "coast" | "wizards_tower" | "wyrmreach" | "fernwick" | "greyhorn" | "highcairn"
  // The wider world (2026-10): the lands around the mainland.
  | "deadwood" | "gravesend" | "westmarch" | "drakespine" | "ashfall" | "southshore" | "saltmarrow" | "thistle_vale" | "hollyhock" | "dyemoor"
  | "the_wilds" | "tallgrass" | "ironreach" | "cragmaw" | "quillhaven" | "pale_isles" | "catacombs" | "sea_cave" | "wyrm_lair" | "deep_mine"
  // The dungeon update (2026-10): three more under the lake, the library and the stones.
  | "deepglass" | "drowned_archive" | "howling_vault";
export type Region = { id: RegionId; name: string; label: { x: number; y: number }; danger: number; underground?: boolean };
const MAINLAND_REGIONS = new Set<RegionId>(["coast", "friendhollow", "farmland", "whisperwood", "ashen_hills", "emberforge", "frostpeak", "glass_lake", "pale_dunes", "oasis", "murkmire", "mossy_ruins",
  "wizards_tower", "wyrmreach", "fernwick", "greyhorn", "highcairn", "crypt", "hollow_depths"]);
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
  { id: "wizards_tower", name: "Wizards' Tower", label: { x: 160, y: 124 }, danger: 0 },
  { id: "wyrmreach", name: "Wyrmreach", label: { x: 36, y: 20 }, danger: 5 },
  { id: "fernwick", name: "Fernwick", label: { x: 34, y: 60 }, danger: 0 },
  { id: "greyhorn", name: "Greyhorn Highlands", label: { x: 272, y: 128 }, danger: 2 },
  { id: "highcairn", name: "Highcairn", label: { x: 282, y: 66 }, danger: 0 },
  { id: "crypt", name: "Murkmire Crypt", label: { x: 34, y: 220 }, danger: 3, underground: true },
  { id: "hollow_depths", name: "Hollow Depths", label: { x: 150, y: 220 }, danger: 4, underground: true },
  // The wider world. Labels here are in world coordinates (the mainland's above are moved by createWorld).
  { id: "deadwood", name: "The Deadwood", label: { x: 330, y: 62 }, danger: 3 },
  { id: "gravesend", name: "Gravesend", label: { x: 300, y: 128 }, danger: 0 },
  { id: "westmarch", name: "Westmarch", label: { x: 128, y: 296 }, danger: 2 },
  { id: "drakespine", name: "The Drakespine", label: { x: 74, y: 196 }, danger: 4 },
  { id: "ashfall", name: "Ashfall", label: { x: 72, y: 70 }, danger: 6 },
  { id: "southshore", name: "Southshore", label: { x: 330, y: 416 }, danger: 1 },
  { id: "saltmarrow", name: "Saltmarrow", label: { x: 424, y: 462 }, danger: 0 },
  { id: "thistle_vale", name: "Thistle Vale", label: { x: 150, y: 404 }, danger: 1 },
  { id: "hollyhock", name: "Hollyhock", label: { x: 160, y: 446 }, danger: 0 },
  { id: "dyemoor", name: "Dyemoor", label: { x: 254, y: 468 }, danger: 0 },
  { id: "the_wilds", name: "The Wilds", label: { x: 584, y: 436 }, danger: 2 },
  { id: "tallgrass", name: "Tallgrass", label: { x: 556, y: 398 }, danger: 0 },
  { id: "ironreach", name: "Ironreach", label: { x: 628, y: 250 }, danger: 3 },
  { id: "cragmaw", name: "Cragmaw", label: { x: 632, y: 196 }, danger: 0 },
  { id: "quillhaven", name: "Quillhaven", label: { x: 646, y: 396 }, danger: 0 },
  { id: "pale_isles", name: "The Pale Isles", label: { x: 96, y: 500 }, danger: 2 },
  { id: "catacombs", name: "Deadwood Catacombs", label: { x: 90, y: 534 }, danger: 4, underground: true },
  { id: "wyrm_lair", name: "The Wyrm's Lair", label: { x: 90, y: 566 }, danger: 6, underground: true },
  { id: "sea_cave", name: "Saltmarrow Sea Cave", label: { x: 630, y: 534 }, danger: 2, underground: true },
  { id: "deep_mine", name: "Cragmaw Deep Mine", label: { x: 630, y: 566 }, danger: 3, underground: true },
  { id: "deepglass", name: "Deepglass Caverns", label: { x: 436, y: 534 }, danger: 2, underground: true },
  { id: "drowned_archive", name: "The Drowned Archive", label: { x: 508, y: 534 }, danger: 4, underground: true },
  { id: "howling_vault", name: "The Howling Vault", label: { x: 470, y: 566 }, danger: 6, underground: true },
];
export const regionIndex = (id: RegionId) => REGIONS.findIndex(region => region.id === id);
/** The mainland regions' labels were written in the mainland's own coordinates: move them with it (once, at load). */
for (const region of REGIONS as Region[]) {
  if (MAINLAND_REGIONS.has(region.id)) { const [x, y] = mainlandToWorld(region.label.x, region.label.y); region.label = { x, y }; }
}
export const isUnderground = (y: number) => y >= DUNGEON_Y && y < FLOOR_Y;

/**
 * A building's footprint (walls included) and how its roof looks. Inner rooms (inside another building) have no roof.
 * `storeys` tall buildings show that many storeys of wall from outside; buildings sharing a `complex` (the castle's
 * keep and towers) count as one when you walk in.
 */
export type Building = {
  x0: number; y0: number; x1: number; y1: number; roof: "gable" | "flat" | "cone" | "none"; color: string; chimney: boolean; name: string;
  storeys?: number; complex?: string;
  /** Extra wall height (pixels) seen only from outside, above the top storey (a tower taller than its floors), and a cone roof's height. */
  tall?: number; spire?: number;
  /** A round tower: its cone roof is eight-sided, fitted to the round wall. */
  round?: boolean;
  /** What the walls are made of: stone brick, half-timbered plaster, or planks. */
  walls?: "stone" | "timber" | "plank";
};
/** An upper storey: the real rectangle it covers and where its tiles are stored (real + (dx, dy)). */
export type Floor = { complex: string; level: number; x0: number; y0: number; x1: number; y1: number; dx: number; dy: number };
export type World = {
  tiles: Uint8Array; region: Uint8Array; objects: WorldObject[]; objectAt: Int32Array; spawns: SpawnDef[];
  buildings: Building[];
  floors: Floor[];
  /** 1 + the index of the (outermost) building covering each tile, or 0. */
  buildingAt: Uint8Array;
  /** Ground height (world pixels) at every tile corner: (W + 1) × (H + 1), corner (i, j) sits at (i − ½, j − ½). */
  heights: Float32Array;
  places: Record<"spawn" | "hollow_square" | "emberforge" | "oasis" | "frostpeak" | "pier" | "crypt" | "depths" | "king" | "fernwick" | "highcairn" | "dawnhold" | "gravesend" | "saltmarrow" | "hollyhock" | "dyemoor" | "tallgrass" | "cragmaw" | "quillhaven" | "ashfall", { x: number; y: number }>;
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

/** Everything a world generator needs: the arrays it paints into and the dice it rolls. */
export type GenContext = {
  W: number; H: number; tiles: Uint8Array; region: Uint8Array; objectAt: Int32Array; lift: Float32Array;
  objects: WorldObject[]; spawns: SpawnDef[]; buildings: Building[]; doorways: [number, number][];
  random: () => number; noise: (x: number, y: number) => number; noise2: (x: number, y: number) => number;
};
/** The painting, placing and building helpers, bound to a context (the mainland's own arrays, or the whole world's). */
export function worldTools(ctx: GenContext) {
  const { W, H, tiles, region, objectAt, objects, spawns, buildings, doorways, random, noise, noise2 } = ctx;
  const tileIndex = (x: number, y: number) => y * W + x;
  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
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
  const building = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", floor: number = T.WOOD, doorAt?: number, roof: Partial<Building> = {}) => {
    const inner = buildings.some(b => x0 > b.x0 && y0 > b.y0 && x1 < b.x1 && y1 < b.y1);
    buildings.push({ x0, y0, x1, y1, roof: inner ? "none" : "gable", color: ROOF_COLORS[buildings.length % ROOF_COLORS.length], chimney: false, name: "",
      walls: floor === T.STONE ? "stone" : floor === T.WOOD && x1 - x0 <= 7 && y1 - y0 <= 6 && buildings.length % 3 === 2 ? "plank" : "timber", ...roof, ...(inner ? { roof: "none" as const } : {}) });
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      put(x, y, edge ? T.WALL : floor); clearAt(x, y);
    }
    const mx = doorAt ?? Math.floor((x0 + x1) / 2), my = doorAt ?? Math.floor((y0 + y1) / 2);
    const gap = (x: number, y: number) => { put(x, y, floor); doorways.push([x, y]); };
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
  const herb = (x: number, y: number, kind: string, name: string) => add({ kind: "herb", herb: kind, x, y, blocks: false, name });
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
  return { tileIndex, inBounds, get, put, setRegion, fillRect, blob, regionBlob, line, road, river, add, decor, clearAt, free, building, scatter, tree, rock, spot, herb, shoreSpots, rockCluster, monster, npc, monsters };
}

/**
 * The mainland: the original 350 × 200 Realm (plus its 40 dungeon rows and 40 storey rows), generated exactly as it
 * always was in its own coordinates, then set into the wider world by createWorld at MAINLAND.x/y.
 */
function buildMainland(seed: number) {
  const W = MAINLAND.w, H = MAINLAND.h + MAINLAND.dungeonRows + MAINLAND.floorRows, FLOOR_Y = MAINLAND.h + MAINLAND.dungeonRows;
  const tiles = new Uint8Array(W * H), region = new Uint8Array(W * H), objects: WorldObject[] = [], spawns: SpawnDef[] = [];
  const objectAt = new Int32Array(W * H).fill(-1);
  const random = mulberry(seed), noise = makeNoise(seed, 9), noise2 = makeNoise(seed + 7, 4), coastNoise = makeNoise(seed + 3, 14), swell = makeNoise(seed + 55, 26);
  /** Extra height for mountains (0 = the terrain's own relief), per tile. */
  const lift = new Float32Array(W * H);
  const buildings: Building[] = [], doorways: [number, number][] = [];
  const { tileIndex, inBounds, get, put, setRegion, fillRect, blob, regionBlob, road, river, add, decor, clearAt, free, building, scatter, tree, rock, spot, shoreSpots, rockCluster, monster, npc, monsters } =
    worldTools({ W, H, tiles, region, objectAt, lift, objects, spawns, buildings, doorways, random, noise, noise2 });

  // ---------- Land and sea ----------
  // The overworld is an island in the Pale Sea; the dungeon strip below starts as void.
  // East of the old shore the island swells into the Greyhorn Highlands: a bulging, ragged east coast, with the north and
  // south shores curving in towards it so the corners round away. (West of x = 226 the coast is as it always was.)
  for (let y = 0; y < 200; y++) for (let x = 0; x < W; x++) {
    const out = Math.max(0, x - 226) / (W - 226), eastCoast = Math.max(252, 322 + (swell(3, y) - 0.5) * 38 - 72 * ((y - 100) / 100) ** 4);
    const north = y - out ** 1.25 * 44 - (swell(x, 2) - 0.5) * 26 * out, south = 199 - y - out ** 1.25 * 40 - (swell(x, 9) - 0.5) * 26 * out;
    const edge = Math.min(x, north, south, eastCoast - x) + (coastNoise(x, y) - 0.5) * 12;
    const terrain = edge < 4 ? T.DEEP : edge < 7 ? T.WATER : edge < 9 ? T.SAND : noise(x, y) > 0.62 ? T.DARK_GRASS : T.GRASS;
    put(x, y, terrain); setRegion(x, y, edge < 12 ? "coast" : "friendhollow");
  }
  // Region footprints (music, labels, minimap). Order matters: later regions paint over earlier ones.
  const REGION_BLOBS: readonly [RegionId, number, number, number, number][] = [
    ["whisperwood", 44, 82, 40, 44], ["fernwick", 34, 70, 14, 10], ["ashen_hills", 114, 48, 30, 26], ["emberforge", 162, 48, 18, 14], ["frostpeak", 206, 22, 36, 22],
    ["pale_dunes", 204, 102, 36, 36], ["glass_lake", 178, 166, 34, 26], ["murkmire", 44, 166, 38, 28], ["mossy_ruins", 122, 172, 26, 20],
    ["farmland", 88, 124, 16, 16], ["oasis", 190, 116, 11, 10], ["friendhollow", 121, 127, 26, 33], ["wizards_tower", 160, 130, 8, 8], ["wyrmreach", 36, 23, 32, 19],
    ["greyhorn", 276, 100, 50, 84], ["highcairn", 282, 80, 17, 14],
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
  // Wyrmreach: ash fields, lava pools and a crater where the oldest dragon sleeps.
  blob(36, 23, 31, 18, T.ASH, 0.3, onLand);
  for (let y = 4; y < 44; y++) for (let x = 4; x < 70; x++) if (get(x, y) === T.ASH && noise(x * 1.4 + 90, y * 1.4) > 0.7 && Math.hypot(x - 50, y - 38) > 7) put(x, y, T.LAVA);
  for (let y = 6; y < 28; y++) for (let x = 10; x < 36; x++) {
    const d = ((x - 22) / 10) ** 2 + ((y - 16) / 8) ** 2;
    if (d <= 0.78) put(x, y, T.ASH);
    else if (d < 1.02 && !(x > 28 && y >= 15 && y <= 18)) put(x, y, T.CLIFF);
  }
  blob(18, 18, 2.5, 2, T.LAVA, 0.2);
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
  road([[68, 76], [62, 62], [56, 50], [52, 42]], 2.6, T.GRAVEL);                                  // deep woods → Wyrmreach camp
  // Friendhollow's cobbled square and streets.
  blob(TOWN.x, TOWN.y, 17, 15, T.COBBLE, 0.12);
  // Market Street runs south from the square; lanes lead to the inn and the Rare Market.
  fillRect(116, 133, 126, 151, T.COBBLE); fillRect(134, 122, 134, 133, T.COBBLE); fillRect(101, 114, 104, 120, T.COBBLE);
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
  building(148, 104, 155, 109, "w", T.WOOD);                               // Riverside house (fishing), east bank
  // Bank interior.
  for (let x = 109; x <= 114; x++) if (x !== 111 && x !== 112) add({ kind: "bank", x, y: 110, blocks: true, name: "Bank booth" });
  npc("banker", 110, 109); npc("banker", 113, 109);
  // General store.
  npc("shop_general", 128, 110); decor(126, 109, "shelf"); decor(130, 109, "shelf"); decor(126, 112, "crate");
  // Chapel.
  add({ kind: "altar", x: 108, y: 128, blocks: true, name: "Altar" });
  decor(108, 126, "old_friend"); npc("priest", 110, 127); npc("mender", 109, 130);
  for (let y = 126; y <= 130; y += 2) { decor(111, y, "bench"); decor(113, y, "bench"); }
  // Tannery.
  npc("tanner", 131, 128); add({ kind: "tanning", x: 132, y: 129, blocks: true, name: "Tanning rack" }); decor(128, 127, "barrel");
  // Sigil shop.
  npc("runa", 136, 118); decor(137, 117, "shelf"); decor(137, 120, "shelf");
  // The square.
  add({ kind: "fountain", x: 121, y: 119, blocks: true, name: "Fountain" }); add({ kind: "fountain", x: 122, y: 119, blocks: true, name: "Fountain" });
  add({ kind: "fountain", x: 121, y: 120, blocks: true, name: "Fountain" }); add({ kind: "fountain", x: 122, y: 120, blocks: true, name: "Fountain" });
  decor(117, 117, "lamp"); decor(126, 117, "lamp"); decor(117, 124, "lamp"); decor(126, 124, "lamp");
  decor(119, 125, "statue", true, "Statue of the First Friend");
  decor(116, 121, "bench"); decor(127, 121, "bench");
  add({ kind: "sign", x: 124, y: 124, blocks: true, name: "Signpost", text: "North: Friendhollow Castle, Ashen Hills. East: Oasis, Glass Lake. South: Mossy Ruins. West: Hollow Farms, Whisperwood." });
  npc("guide", 123, 123); npc("glimmer", 118, 116); // #7730, the Old Glimmer
  add({ kind: "well", x: 131, y: 122, blocks: true, name: "Well" });
  // ---------- Market Street and the new quarter ----------
  building(108, 135, 115, 141, "e", T.WOOD, undefined, { name: "Hollis Armoury", color: "#8f9cb2", chimney: true });
  npc("armourer", 110, 138); decor(109, 136, "shelf"); decor(112, 136, "shelf"); decor(109, 140, "armour"); decor(111, 140, "armour");
  building(108, 144, 115, 150, "e", T.WOOD, undefined, { name: "Edge & Hilt", color: "#c99a96", chimney: true });
  npc("weaponsmith", 110, 147); decor(109, 145, "shelf"); decor(112, 145, "shelf"); add({ kind: "anvil", x: 110, y: 149, blocks: true, name: "Anvil" });
  building(127, 135, 134, 141, "w", T.WOOD, undefined, { name: "Fletch & Feather", color: "#9aab92" });
  npc("bowyer", 131, 138); decor(133, 136, "shelf"); decor(133, 140, "shelf"); decor(130, 136, "crate"); decor(132, 140, "hay", true, "Straw target");
  building(127, 144, 134, 150, "w", T.STONE, undefined, { name: "The Warden's Lodge", color: "#6d6b67" });
  // Ribbon & Rye Clothiers, west of the street at its south end: shirts, tunics, dresses, trousers and skirts.
  building(106, 159, 113, 164, "e", T.WOOD, undefined, { name: "Ribbon & Rye Clothiers", color: "#c98f95" });
  npc("clothier", 109, 161); decor(107, 160, "shelf", true, "Folded shirts"); decor(107, 163, "armour", true, "Dress form"); decor(111, 163, "table", true, "Cutting table");
  for (let y = 161; y <= 162; y++) for (let x = 114; x <= 118; x++) { put(x, y, T.COBBLE); clearAt(x, y); }
  // Threadneedle Tailors, across the street from Heft & Haft: capes in colours and patterns, and hats.
  building(130, 152, 137, 157, "w", T.WOOD, undefined, { name: "Threadneedle Tailors", color: "#9a5a7a" });
  npc("tailor", 133, 154); decor(135, 153, "shelf", true, "Bolts of cloth"); decor(135, 156, "armour", true, "Tailor's dummy"); decor(132, 156, "crate");
  for (let y = 154; y <= 155; y++) for (let x = 123; x <= 129; x++) { put(x, y, T.COBBLE); clearAt(x, y); }
  // Heft & Haft, at the south end of Market Street: two-handed greatswords, battleaxes and war hammers.
  building(107, 153, 114, 158, "e", T.WOOD, undefined, { name: "Heft & Haft", color: "#8a4a3a" });
  npc("heft", 110, 155); decor(108, 154, "armour", true, "Weapon rack"); decor(108, 157, "armour", true, "Weapon rack"); decor(112, 157, "crate");
  fillRect(115, 155, 118, 156, T.COBBLE);
  npc("slayer_master", 131, 147); decor(133, 145, "banner"); decor(133, 149, "torch"); decor(130, 149, "chest", true, "Trophy chest"); decor(129, 145, "shelf", true, "Trophy shelf");
  // (The inn and the house behind Fletch & Feather are laid out here, then moved at the very end: see "Town tidy-ups".)
  building(135, 124, 141, 131, "w", T.WOOD, undefined, { name: "The Sleepy Friend", color: "#cdb98a", chimney: true });
  npc("innkeeper", 138, 126); add({ kind: "range", x: 140, y: 125, blocks: true, name: "Cooking range" }); decor(137, 129, "table"); decor(139, 129, "table"); decor(138, 128, "bench", false); decor(140, 130, "barrel");
  building(136, 135, 141, 140, "w", T.WOOD, undefined, { name: "House", color: "#a996b5", chimney: true });
  decor(138, 136, "bed"); decor(140, 139, "table");
  building(99, 107, 106, 113, "s", T.CARPET, undefined, { name: "Rare Market", color: "#d8b6b4" });
  npc("rare_trader", 102, 109); add({ kind: "casket", x: 104, y: 109, blocks: true, name: "Rare Casket chest" }); decor(100, 108, "shelf"); decor(105, 108, "banner");
  for (const [x, y] of [[117, 136], [125, 136], [117, 143], [125, 143], [117, 150], [125, 150]]) decor(x, y, "lamp");
  add({ kind: "sign", x: 124, y: 133, blocks: true, name: "Signpost", text: "Market Street. West: Hollis Armoury, Edge & Hilt. East: Fletch & Feather, the Warden's Lodge. The Sleepy Friend inn is over the east bridge; the Rare Market west." });
  decor(119, 139, "bench"); decor(123, 146, "bench"); decor(118, 147, "barrel"); decor(124, 140, "crate");
  scatter(106, 114, 138, 151, 10, (x, y) => npc("villager", x, y, 5), (x, y) => get(x, y) === T.COBBLE && objectAt[tileIndex(x, y)] < 0);
  // Riverside house: Pike's Tackle.
  npc("pike", 152, 106); decor(154, 105, "barrel"); decor(154, 108, "crate");
  // ---------- Friendhollow Castle ----------
  // A keep with four towers, north of the square. The ground floor has the kitchen and the great hall; spiral stairs in
  // the north towers climb to the King's floor (throne room, library, bedchamber, the tower bank), and on up to the roof.
  // Plans are 20 × 20 from (112, 86): # wall, . stone, c carpet, w wood, + doorway, space = outside.
  const CASTLE = { x: 112, y: 86 }, complex = "castle";
  const PLANS: readonly (readonly string[])[] = [[
    "#####          #####",
    "#...#####++#####...#",
    "#...#....cc....#...#",
    "#...+....cc....+...#",
    "#####....cc....#####",
    " #wwwww#.cc.......# ",
    " #wwwww#.cc.......# ",
    " #wwwww+.cc.......# ",
    " #wwwww#.cc.......# ",
    " #######.cc.......# ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    "#####....cc....#####",
    "#...+....cc....+...#",
    "#...#....cc....#...#",
    "#...#####cc#####...#",
    "#####          #####",
  ], [
    "#####          #####",
    "#...############...#",
    "#...#....cc....#...#",
    "#...+....cc....+...#",
    "#####....cc....#####",
    " #wwwww#.cc.#wwwww# ",
    " #wwwww+.cc.+wwwww# ",
    " #wwwww#.cc.#wwwww# ",
    " #wwwww#.cc.#wwwww# ",
    " #######.cc.####### ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    " #.......cc.......# ",
    "#####....cc....#####",
    "#...+....cc....+...#",
    "#...#....cc....#...#",
    "#...############...#",
    "#####          #####",
  ], [
    "#####          #####",
    "#...############...#",
    "#...#..........#...#",
    "#...+..........+...#",
    "#####..........#####",
    " #................# ",
    " #................# ",
    " #................# ",
    " #................# ",
    " #................# ",
    " #................# ",
    " #................# ",
    " #................# ",
    " #................# ",
    " #................# ",
    "#####..........#####",
    "#...+..........+...#",
    "#...#..........#...#",
    "#...############...#",
    "#####          #####",
  ]];
  const floors: Floor[] = [1, 2].map(level => ({ complex, level, x0: CASTLE.x, y0: CASTLE.y, x1: CASTLE.x + 19, y1: CASTLE.y + 19, dx: (level - 1) * 30, dy: FLOOR_Y + 2 - CASTLE.y }));
  /** A tile of the castle plan on a level (upper levels in their storage rows). */
  const at = (level: number, col: number, row: number) => ({ x: CASTLE.x + col + (level ? floors[level - 1].dx : 0), y: CASTLE.y + row + (level ? floors[level - 1].dy : 0) });
  const PLAN_TERRAIN: Record<string, number> = { "#": T.WALL, ".": T.STONE, "+": T.STONE, c: T.CARPET, w: T.WOOD };
  PLANS.forEach((plan, level) => plan.forEach((line, row) => [...line].forEach((ch, col) => {
    if (ch === " ") return;
    const { x, y } = at(level, col, row);
    put(x, y, PLAN_TERRAIN[ch]); clearAt(x, y);
    if (level) setRegion(x, y, "friendhollow");
  })));
  buildings.push({ x0: 113, y0: 87, x1: 130, y1: 104, roof: "flat", color: "#b9b4ab", chimney: false, name: "Friendhollow Castle", storeys: 2, complex, walls: "stone" });
  for (const [col, row, color] of [[0, 0, "#c99a96"], [15, 0, "#8f9cb2"], [0, 15, "#a996b5"], [15, 15, "#9aab92"]] as const) {
    buildings.push({ x0: CASTLE.x + col, y0: CASTLE.y + row, x1: CASTLE.x + col + 4, y1: CASTLE.y + row + 4, roof: "cone", color, chimney: false, name: "Castle tower", storeys: 3, complex, walls: "stone" });
  }
  // The road runs through the gates.
  fillRect(120, 105, 123, 107, T.PATH);
  road([[121.5, 85], [120, 78], [117, 72]]);
  // Spiral stairs: north-west (ground ↔ King's floor) and north-east (ground ↔ King's floor ↔ roof).
  const stairs = (level: number, col: number, row: number, up: boolean, toLevel: number, toCol: number, toRow: number) =>
    add({ kind: "ladder", look: "stairs", ...at(level, col, row), blocks: true, name: "Staircase", action: up ? "Climb-up" : "Climb-down", to: at(toLevel, toCol, toRow) });
  stairs(0, 1, 1, true, 1, 2, 2); stairs(1, 1, 1, false, 0, 2, 2);
  stairs(0, 18, 1, true, 1, 17, 2); stairs(1, 18, 1, false, 0, 17, 2);
  stairs(1, 16, 1, true, 2, 17, 2); stairs(2, 16, 1, false, 1, 17, 2);
  const place = (level: number, col: number, row: number, kind: DecorKind, name?: string, blocks = true) => { const p = at(level, col, row); decor(p.x, p.y, kind, blocks, name); };
  const person = (level: number, col: number, row: number, id: string, wander = 0) => { const p = at(level, col, row); npc(id, p.x, p.y, wander); };
  // Ground floor: the kitchen, the great hall, the Relic keeper, and two guard towers.
  add({ kind: "range", ...at(0, 2, 5), blocks: true, name: "Cooking range" }); person(0, 4, 7, "cook", 1);
  place(0, 5, 5, "table"); place(0, 2, 8, "barrel"); place(0, 6, 8, "crate");
  person(0, 13, 7, "captain", 2); person(0, 7, 13, "guard", 3); person(0, 12, 13, "guard", 3);
  add({ kind: "casket", ...at(0, 16, 5), blocks: true, name: "Rare Casket chest" }); person(0, 15, 6, "emporium");
  place(0, 8, 2, "banner"); place(0, 11, 2, "banner");
  person(0, 16, 12, "cape_keeper"); place(0, 17, 12, "shelf", "Cape rack");
  for (const [col, row] of [[8, 11], [11, 11], [8, 14], [11, 14]]) place(0, col, row, "pillar");
  for (const [col, row] of [[2, 10], [17, 10], [2, 14], [17, 14], [5, 17], [14, 17]]) place(0, col, row, "torch");
  place(0, 1, 16, "armour"); place(0, 1, 18, "armour"); place(0, 3, 18, "crate");
  place(0, 18, 16, "barrel"); place(0, 18, 18, "crate"); place(0, 17, 18, "barrel");
  // The King's floor: the throne room, the royal library, the bedchamber, a long gallery and the tower bank.
  place(1, 9, 2, "throne", "Throne of Friendhollow"); place(1, 10, 2, "throne", "The Queen's throne");
  person(1, 9, 3, "king"); person(1, 6, 3, "royal_guard", 1); person(1, 13, 3, "royal_guard", 1);
  place(1, 5, 2, "banner"); place(1, 14, 2, "banner"); place(1, 7, 2, "torch"); place(1, 12, 2, "torch");
  for (let col = 2; col <= 5; col++) place(1, col, 5, "shelf", "Bookcase");
  place(1, 4, 7, "table"); place(1, 2, 8, "shelf", "Bookcase"); place(1, 3, 8, "shelf", "Bookcase");
  place(1, 16, 5, "bed", "Royal bed"); place(1, 13, 5, "shelf"); place(1, 17, 8, "chest", "Royal chest"); place(1, 14, 8, "table");
  for (const col of [4, 5, 6, 13, 14, 15]) place(1, col, 12, "table", "Banquet table");
  for (const col of [4, 5, 6, 13, 14, 15]) { place(1, col, 11, "bench", undefined, false); place(1, col, 13, "bench", undefined, false); }
  for (const [col, row] of [[8, 11], [11, 11], [8, 14], [11, 14]]) place(1, col, row, "pillar");
  for (const [col, row] of [[2, 10], [17, 10], [2, 14], [17, 14]]) place(1, col, row, "torch");
  add({ kind: "bank", ...at(1, 2, 17), blocks: true, name: "Bank booth" }); person(1, 2, 18, "banker");
  place(1, 18, 18, "bed", "Guest bed"); place(1, 16, 18, "table");
  // The roof: battlements, banners and a lookout.
  for (const [col, row] of [[6, 5], [13, 5], [2, 9], [17, 9], [6, 14], [13, 14]]) place(2, col, row, "banner");
  person(2, 9, 10, "royal_guard", 4);
  // Trees and flowers around town.
  scatter(98, 100, 146, 142, 26, (x, y) => tree(x, y, "tree"), (x, y) => free(x, y) && get(x, y) === T.GRASS);
  scatter(104, 104, 140, 140, 30, (x, y) => decor(x, y, random() > 0.5 ? "flowers" : "bush", false), (x, y) => free(x, y) && get(x, y) === T.GRASS);
  monsters("ink_rat", 136, 142, 146, 152, 4);

  // ---------- Hollow Farms ----------
  // Cow pen (fenced) with a dairy cow; chicken coop; wheat field; windmill.
  // (The cow pen is out on the farm by the windmill, built last so nothing grows in it: see the end of this function.)
  for (let x = 84; x <= 92; x++) { decor(x, 126, "fence"); decor(x, 134, "fence"); }
  for (let y = 126; y <= 134; y++) { decor(84, y, "fence"); if (y !== 130) decor(92, y, "fence"); }
  monsters("chicken", 85, 127, 91, 133, 5);
  add({ kind: "coop", x: 86, y: 128, blocks: true, name: "Chicken coop" });
  for (let y = 124; y <= 136; y++) for (let x = 96; x <= 102; x++) { put(x, y, T.FARMLAND); if ((x + y) % 2 === 0) add({ kind: "wheat", x, y, blocks: false, name: "Wheat" }); }
  // The miller's farmhouse, beside the windmill: a timber cottage with a chimney, its door facing the mill.
  building(71, 118, 76, 122, "e", T.WOOD, undefined, { name: "Farmhouse", color: "#c98b86", chimney: true, walls: "timber" });
  decor(72, 119, "bed"); decor(74, 119, "shelf"); decor(72, 121, "table"); decor(75, 121, "barrel");
  decor(77, 118, "hay"); decor(70, 123, "barrel", true); decor(77, 123, "crate");
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

  // ---------- Fernwick: the woodcutters' village in the heart of Whisperwood ----------
  // A clearing with a street running east to the woods road, Hazel's War Bows (the only place selling war bows) and the
  // lodge (timber yard and bank) on its north side, cottages and a willow pond to the south, oaks and maples all round.
  for (let y = 59; y <= 81; y++) for (let x = 19; x <= 49; x++) if (((x - 34) / 13) ** 2 + ((y - 70) / 9.5) ** 2 <= 1) { clearAt(x, y); if (get(x, y) === T.DARK_GRASS) put(x, y, T.GRASS); }
  road([[68, 76], [58, 75], [49, 72], [40, 71], [24, 71]]);
  for (let y = 66; y <= 80; y++) for (let x = 22; x <= 68; x++) if (get(x, y) === T.PATH) clearAt(x, y);
  building(23, 62, 30, 68, "s", T.WOOD, undefined, { name: "Hazel's War Bows" });
  npc("hazel", 26, 65); decor(24, 63, "shelf"); decor(29, 63, "shelf"); decor(24, 66, "crate"); decor(29, 66, "barrel");
  building(33, 62, 42, 68, "s", T.WOOD, undefined, { name: "Fernwick lodge", chimney: true });
  add({ kind: "bank", x: 34, y: 65, blocks: true, name: "Bank booth" }); add({ kind: "bank", x: 35, y: 65, blocks: true, name: "Bank booth" }); npc("banker", 34, 64);
  npc("villager", 30, 71, 4); npc("villager", 38, 72, 4); npc("villager", 45, 70, 4);
  npc("rowan", 40, 65); decor(41, 63, "logpile", true, "Stacked timber"); decor(41, 66, "crate"); decor(39, 63, "table");
  building(22, 74, 27, 78, "n");                                                                  // Old Birch's cottage
  decor(23, 77, "bed"); decor(26, 75, "table");
  building(42, 74, 47, 78, "n");                                                                  // a woodcutter's cottage
  decor(46, 77, "bed"); decor(43, 75, "chest");
  // The archery butts west of Hazel's, and the woodpile, chopping blocks and torches along the street.
  decor(20, 64, "target"); decor(20, 67, "target"); decor(31, 64, "logpile"); decor(44, 67, "logpile"); decor(45, 69, "stump"); decor(30, 74, "stump");
  decor(32, 69, "torch"); decor(43, 70, "torch"); decor(29, 73, "torch");
  npc("birch", 33, 74, 3);
  // The willow pond.
  blob(35, 77.5, 3.2, 1.8, T.WATER, 0.15);
  for (const [wx, wy] of [[31, 77], [39, 78], [35, 80], [38, 75]] as const) if (free(wx, wy)) tree(wx, wy, "willow");
  decor(33, 79, "reeds", false); decor(37, 76, "lily", false); decor(36, 79, "lily", false);
  for (const [tx, ty, kind] of [[46, 63, "oak"], [48, 66, "oak"], [21, 72, "tree"], [20, 75, "oak"], [30, 60, "maple"], [37, 60, "oak"], [44, 61, "maple"], [49, 77, "tree"]] as const) if (free(tx, ty)) tree(tx, ty, kind);
  add({ kind: "sign", x: 50, y: 71, blocks: true, name: "Signpost", text: "Fernwick, the woodcutters' village. War bows at Hazel's, logs sold and a bank at the lodge. East: the woods road to the Ashen mine and Friendhollow." });

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
  add({ kind: "bank", x: 197, y: 28, blocks: true, name: "Bank booth" }); npc("banker", 196, 29); npc("outfitter", 194, 30); npc("villager", 200, 34, 3); npc("villager", 191, 33, 3);
  add({ kind: "range", x: 193, y: 28, blocks: true, name: "Cooking range" });
  scatter(172, 6, 236, 44, 60, (x, y) => random() > 0.3 ? tree(x, y, "pine") : decor(x, y, "boulder"), (x, y) => free(x, y) && get(x, y) === T.SNOW);
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
  scatter(186, 112, 196, 122, 6, (x, y) => tree(x, y, "palm"), (x, y) => free(x, y) && [[2, 0], [0, 2], [-2, 0], [0, -2]].some(([dx, dy]) => isWater(get(x + dx, y + dy))));
  monsters("bandit", 198, 84, 226, 104, 10);
  for (let i = 0; i < 5; i++) { const x = 222 + (i % 3) * 2, y = 118 + Math.floor(i / 3) * 3; if (get(x, y) === T.SAND) rock(x, y, "gem"); }
  decor(214, 78, "rubble"); decor(216, 79, "pillar"); decor(211, 80, "pillar");

  // ---------- Murkmire ----------
  scatter(10, 142, 82, 194, 40, (x, y) => random() > 0.5 ? tree(x, y, "deadwood") : decor(x, y, "reeds", random() > 0.5), (x, y) => free(x, y) && get(x, y) === T.SWAMP);
  scatter(12, 140, 80, 194, 14, (x, y) => tree(x, y, "willow"), (x, y) => free(x, y) && get(x, y) === T.SWAMP);
  monsters("swamp_lurker", 16, 158, 76, 190, 14);
  building(36, 172, 44, 179, "n", T.STONE, undefined, { name: "Crypt", color: "#6d6b67" });                              // The crypt
  add({ kind: "ladder", x: 40, y: 176, blocks: true, name: "Crypt stairs", action: "Climb-down", to: { x: 34, y: 208 } });
  for (let i = 0; i < 8; i++) decor(30 + (i % 4) * 3, 182 + Math.floor(i / 4) * 3, "grave", true, "Grave");
  // Stepping stones over the bog river: a Wayfaring shortcut.
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

  // ---------- Wayfaring courses ----------
  // Each obstacle crosses a gap you can't walk ([name, action, gap, xp, gap terrain]); you land on the far side and face
  // the next one, and a lap of every obstacle in order pays the course's lap XP and Wayfarer's marks (COURSES in data.ts).
  const course = (id: string, x0: number, y: number, level: number, ground: number, steps: readonly [string, string, number, number, number][], sign: string) => {
    const x1 = x0 + steps.reduce((sum, [, , gap]) => sum + gap + 2, 0);
    fillRect(x0 - 2, y - 2, x1 + 1, y + 2, ground);
    for (let x = x0 - 2; x <= x1 + 1; x++) for (let dy = -2; dy <= 2; dy++) clearAt(x, y + dy);
    let cx = x0;
    steps.forEach(([name, action, gap, xp, terrain], step) => {
      for (let x = cx + 1; x <= cx + gap; x++) put(x, y, terrain);
      add({ kind: "obstacle", x: cx, y, blocks: true, name, action, to: { x: cx + gap + 1, y }, obstacle: { course: id, step, level, xp, ticks: Math.max(3, gap + 1), last: step === steps.length - 1 } });
      cx += gap + 2;
    });
    for (let x = x0 - 2; x <= cx; x++) { decor(x, y - 1, "fence"); decor(x, y + 1, "fence"); }
    clearAt(x0 - 2, y - 1); clearAt(x0 - 2, y + 1); clearAt(cx, y - 1); clearAt(cx, y + 1);
    add({ kind: "sign", x: x0 - 3, y: y + 3, blocks: true, name: "Signpost", text: sign });
    return cx;
  };
  // Friendhollow course (level 1), in the meadow west of the castle, with Coach Skip at its start.
  const courseY = 99;
  course("friendhollow", 88, courseY, 1, T.GRASS, [
    ["Log balance", "Walk-across", 4, 7, T.WATER], ["Obstacle net", "Climb-over", 1, 7, T.CLIFF], ["Balance beam", "Walk-across", 4, 8, T.WATER],
    ["Rope swing", "Swing-on", 2, 9, T.WATER], ["Low wall", "Climb-over", 1, 7, T.CLIFF],
  ], "Friendhollow course. Start at the log balance, go east, and finish all five obstacles for a lap bonus and a Wayfarer's mark.");
  npc("agility", 86, courseY + 2, 1);
  // Oasis dune course (level 30), on the sands south-east of the Oasis.
  course("dunes", 200, 128, 30, T.SAND, [
    ["Palm swing", "Swing-on", 2, 14, T.WATER], ["Sandstone wall", "Climb-over", 1, 12, T.CLIFF], ["Rope bridge", "Walk-across", 5, 18, T.CLIFF],
    ["Ruin ledge", "Edge-along", 3, 15, T.CLIFF], ["Dune leap", "Jump", 2, 16, T.CLIFF], ["Collapsed arch", "Climb-through", 1, 13, T.CLIFF],
  ], "Oasis dune course (Wayfaring 30). Start at the palm swing, go east: six obstacles to a lap, worth two Wayfarer's marks.");
  // Frostpeak ice course (level 55), on the snowfield north of the camp.
  course("frostpeak", 198, 16, 55, T.SNOW, [
    ["Ice ledge", "Edge-along", 3, 26, T.WATER], ["Icicle climb", "Climb-up", 1, 22, T.CLIFF], ["Frozen gap", "Jump", 3, 28, T.WATER],
    ["Snow bridge", "Walk-across", 5, 30, T.WATER], ["Glacier slide", "Slide-down", 4, 24, T.ICE], ["Rope ladder", "Climb-up", 1, 25, T.CLIFF],
  ], "Frostpeak ice course (Wayfaring 55). Start at the ice ledge, go east: six obstacles to a lap, worth three Wayfarer's marks.");

  // ---------- The Greyhorn Highlands and Highcairn ----------
  // East of the Pale Dunes and south of Frostpeak the land climbs into mountains: grassy shoulders, scree slopes, snow on
  // the peaks and broken crags (the roads cut passes through them), all walkable. Highcairn, a stone town, sits on a level
  // plateau in the middle, with roads down to the Frostpeak camp and the Oasis.
  const HC = { x: 282, y: 80 }, peaks = makeNoise(seed + 77, 11);
  for (let y = 6; y < 198; y++) for (let x = 232; x < W; x++) {
    const t = get(x, y);
    if (t !== T.GRASS && t !== T.DARK_GRASS && t !== T.SNOW) continue;
    const town = ((x - HC.x) / 19) ** 2 + ((y - HC.y) / 15) ** 2, ramp = Math.min(1, (x - 232) / 16), m = (peaks(x, y) + 0.1) * ramp;
    lift[tileIndex(x, y)] = town < 1 ? 0 : Math.max(0, m - 0.3) * 2.6 * Math.min(1, town - 1);
    if (town < 1) { put(x, y, T.GRASS); clearAt(x, y); continue; }
    // The Greyhorn's tops are bare grey rock (the snow caps used to sit oddly over the slopes; the Ironreach keeps its snow).
    if (m > 0.5) put(x, y, T.GRAVEL);
    else if (t === T.SNOW && m < 0.4) put(x, y, T.GRASS);
    // Broken crag lines along the ridges.
    if (Math.abs(m - 0.62) < 0.014 && noise2(x, y) > 0.42 && town > 1.8) put(x, y, T.CLIFF);
  }
  // A mountain lake to the south, with trout (char and grayling) for a rod.
  blob(292, 122, 6, 4, T.WATER, 0.2, t => t !== T.CLIFF); blob(292, 122, 3, 2, T.DEEP, 0.15, t => t === T.WATER);
  // Roads: down to the Frostpeak camp, west to the Oasis, and paths to the mine and the lake.
  road([[198, 30], [214, 42], [236, 54], [256, 64], [272, 76]]);
  road([[184, 115], [206, 108], [230, 98], [254, 90], [270, 84]]);
  road([[292, 72], [298, 64], [304, 58]], 2.2, T.GRAVEL);
  road([[284, 92], [288, 104], [291, 116]], 2.2, T.GRAVEL);
  // The town: a cobbled plateau round a fountain square.
  blob(HC.x, HC.y, 15, 11, T.COBBLE, 0.1);
  building(270, 70, 277, 75, "s", T.STONE, undefined, { name: "Highcairn Bank", color: "#6f7ea6" });
  add({ kind: "bank", x: 272, y: 72, blocks: true, name: "Bank booth" }); add({ kind: "bank", x: 273, y: 72, blocks: true, name: "Bank booth" }); npc("banker", 272, 71);
  decor(276, 71, "chest", true, "Strongbox");
  building(287, 70, 294, 75, "s", T.STONE, undefined, { name: "Highcairn Stores", color: "#8a6a50" });
  npc("cairn_trader", 290, 72); decor(288, 71, "shelf"); decor(293, 71, "shelf"); decor(293, 74, "barrel");
  building(268, 84, 277, 91, "n", T.WOOD, undefined, { name: "The Stone Kettle", color: "#b86b4b", chimney: true });
  add({ kind: "range", x: 269, y: 89, blocks: true, name: "Cooking range" }); npc("kettle_keeper", 273, 87, 1);
  decor(275, 89, "table"); decor(271, 86, "table"); decor(276, 86, "barrel");
  building(287, 84, 295, 91, "n", T.STONE, undefined, { name: "Highcairn Forge", color: "#5f5e66", chimney: true });
  add({ kind: "furnace", x: 293, y: 89, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: 289, y: 89, blocks: true, name: "Anvil" }); npc("cairn_smith", 291, 87, 1);
  building(279, 62, 285, 67, "s", T.STONE, undefined, { name: "Mountain Shrine", color: "#c6bed4" });
  add({ kind: "altar", x: 282, y: 64, blocks: true, name: "Mountain shrine" }); decor(282, 63, "old_friend");
  building(262, 77, 266, 81, "e"); decor(263, 78, "bed");
  building(298, 77, 302, 81, "w"); decor(301, 78, "bed");
  building(279, 94, 285, 97, "n"); decor(284, 96, "bed");
  for (const [fx, fy] of [[282, 79], [283, 79], [282, 80], [283, 80]] as const) add({ kind: "fountain", x: fx, y: fy, blocks: true, name: "Fountain" });
  npc("rare_trader", 286, 79); add({ kind: "casket", x: 287, y: 78, blocks: true, name: "Rare Casket chest" });
  for (const [lx, ly] of [[274, 78], [291, 78], [274, 83], [291, 83], [282, 73], [282, 87]] as const) decor(lx, ly, "lamp");
  for (const [bx, by] of [[278, 77], [287, 82]] as const) decor(bx, by, "banner");
  decor(279, 82, "bench"); decor(286, 76, "bench");
  npc("mountain_guide", 280, 84, 3); npc("villager", 285, 84, 5); npc("villager", 277, 80, 5); npc("villager", 280, 76, 5);
  add({ kind: "sign", x: 266, y: 85, blocks: true, name: "Signpost", text: "Highcairn. North-west: the Frostpeak camp. West: the Oasis. North-east: the Greyhorn mine. South: Greyhorn Tarn." });
  // Dawnhold, the chapterhouse of the Order of the Dawn, on a terrace above the sea east of Highcairn: a cobbled
  // causeway through the ridge, a courtyard, the chapel (its altar takes offered bones), and the hall with the armoury.
  road([[297, 81], [304, 82], [310, 82]], 2.2, T.COBBLE);
  for (let y = 70; y <= 94; y++) for (let x = 310; x <= 330; x++) { put(x, y, T.COBBLE); clearAt(x, y); }
  // The chapel: tall, white and stone, with a bell tower at its north-west corner (open from inside the nave).
  const dawnhold = "dawnhold";
  building(312, 74, 319, 80, "s", T.STONE, undefined, { name: "Dawnhold Chapel", color: "#e8e4d6", walls: "stone", storeys: 2, tall: 10, complex: dawnhold });
  building(311, 71, 313, 74, "s", T.STONE, undefined, { name: "Chapel bell tower", color: "#e8e4d6", walls: "stone", roof: "cone", round: true, storeys: 3, spire: 26, complex: dawnhold });
  add({ kind: "altar", x: 315, y: 76, blocks: true, name: "Chapel altar", text: "dawn" }); decor(315, 75, "old_friend"); npc("chaplain", 317, 77);
  decor(313, 76, "torch"); decor(318, 75, "torch"); decor(313, 78, "bench"); decor(318, 78, "bench");
  building(312, 84, 320, 90, "n", T.STONE, undefined, { name: "Dawnhold Hall", color: "#c9a24a", walls: "stone", complex: dawnhold });
  npc("grandmaster", 316, 87); npc("quartermaster", 318, 86); decor(319, 85, "armour", true, "Weapon rack"); decor(319, 88, "armour", true, "Weapon rack");
  decor(313, 85, "banner"); decor(313, 89, "table"); decor(314, 89, "chest", true, "Order strongbox");
  // Dawnhold Keep: a two-storey stone fortress joining the chapel and the hall along their east ends, its gate facing
  // straight down the causeway from Highcairn, with a round tower at each outer corner.
  building(320, 73, 327, 91, "w", T.STONE, 81, { name: "Dawnhold Keep", color: "#b9b4ab", walls: "stone", roof: "flat", storeys: 2, tall: 8, complex: dawnhold });
  building(326, 71, 329, 74, "w", T.STONE, undefined, { name: "Keep tower", color: "#c9a24a", walls: "stone", roof: "cone", round: true, storeys: 3, spire: 22, complex: dawnhold });
  building(326, 90, 329, 93, "w", T.STONE, undefined, { name: "Keep tower", color: "#c9a24a", walls: "stone", roof: "cone", round: true, storeys: 3, spire: 22, complex: dawnhold });
  decor(321, 74, "banner"); decor(321, 90, "banner"); decor(326, 77, "torch"); decor(326, 87, "torch"); decor(326, 82, "throne", true, "Grandmaster's seat");
  decor(323, 76, "armour", true, "Suit of Dawnplate"); decor(323, 88, "armour", true, "Suit of Dawnplate"); decor(325, 79, "table"); decor(325, 85, "table"); decor(322, 79, "banner"); decor(322, 85, "banner");
  for (const [kx, ky] of [[311, 81], [311, 83], [323, 82]] as const) npc("dawn_knight", kx, ky, 3);
  for (const [lx, ly] of [[311, 79], [311, 86]] as const) decor(lx, ly, "lamp");
  decor(319, 81, "torch"); decor(319, 83, "torch");
  decor(310, 80, "banner"); decor(310, 84, "banner");
  add({ kind: "sign", x: 309, y: 83, blocks: true, name: "Signpost", text: "Dawnhold, the Order of the Dawn. All who keep faith are welcome. West: Highcairn." });
  // The Greyhorn mine: glimmer, rarite and moonsilver high on the scree.
  {
    const vein = (cx: number, cy: number, kind: RockKind, n: number) => scatter(cx - 4, cy - 3, cx + 4, cy + 3, n, (x, y) => rock(x, y, kind), (x, y) => free(x, y) && get(x, y) !== T.CLIFF);
    vein(305, 56, "glimmer", 4); vein(310, 60, "rarite", 3); vein(300, 52, "moonsilver", 4); vein(306, 64, "inkcoal", 5);
    add({ kind: "sign", x: 303, y: 60, blocks: true, name: "Signpost", text: "The Greyhorn mine. Glimmer, rarite and moonsilver, for those who can reach them." });
  }
  shoreSpots(284, 116, 300, 128, "lure", 3);
  // Pines on the slopes, trees in the valleys, boulders on the scree.
  scatter(234, 20, W - 8, 190, 170, (x, y) => get(x, y) === T.SNOW || random() < 0.55 ? tree(x, y, "pine") : decor(x, y, "boulder", true), (x, y) => free(x, y) && get(x, y) !== T.COBBLE && ((x - HC.x) / 19) ** 2 + ((y - HC.y) / 15) ** 2 > 1.2);
  scatter(234, 60, W - 8, 190, 70, (x, y) => tree(x, y, random() < 0.5 ? "tree" : random() < 0.6 ? "maple" : "yew"), (x, y) => free(x, y) && (get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS) && ((x - HC.x) / 19) ** 2 + ((y - HC.y) / 15) ** 2 > 1.4);
  monsters("wolf", 240, 36, 300, 66, 6); monsters("frost_yeti", 250, 24, 305, 52, 4); monsters("gloom_hound", 250, 132, 305, 178, 5); monsters("bandit", 238, 90, 262, 118, 4);

  // ---------- Ruins: old houses, round towers and boundary walls, crumbling out in the wild ----------
  {
    // Their own random stream, so adding ruins doesn't reshuffle the rest of the world.
    const random = mulberry(seed + 404), spawnTiles = new Set(spawns.map(spawn => tileIndex(spawn.x, spawn.y)));
    const open = (x: number, y: number) => inBounds(x, y) && free(x, y) && !spawnTiles.has(tileIndex(x, y));
    const stub = (x: number, y: number, height: number) => { if (open(x, y)) add({ kind: "decor", decor: "ruin_wall", x, y, blocks: true, name: "Crumbling wall", height: Math.round(height) }); };
    const litter = (x: number, y: number) => { if (open(x, y) && random() < 0.5) decor(x, y, "rubble", false, "Rubble"); };
    const flag = (x: number, y: number) => { if (open(x, y) && random() < 0.6 && get(x, y) !== T.SAND && get(x, y) !== T.SNOW) put(x, y, T.STONE); };
    /** Somewhere in the box with a clear w × h footprint (and a tile of space round it). */
    const site = (x0: number, y0: number, x1: number, y1: number, w: number, h: number) => {
      for (let tries = 0; tries < 400; tries++) {
        const x = x0 + Math.floor(random() * (x1 - x0 - w)), y = y0 + Math.floor(random() * (y1 - y0 - h));
        let ok = true;
        for (let dy = -1; dy <= h && ok; dy++) for (let dx = -1; dx <= w && ok; dx++) ok = open(x + dx, y + dy);
        if (ok) return [x, y] as const;
      }
      return null;
    };
    const house = (x0: number, y0: number, x1: number, y1: number) => {
      const at = site(x0, y0, x1, y1, 5 + Math.floor(random() * 3), 4 + Math.floor(random() * 3));
      if (!at) return;
      const w = 5 + Math.floor(random() * 2), h = 4 + Math.floor(random() * 2), [hx, hy] = at, door = Math.floor(random() * (w - 2)) + 1;
      for (let y = hy + 1; y < hy + h - 1; y++) for (let x = hx + 1; x < hx + w - 1; x++) flag(x, y);
      for (let y = hy; y < hy + h; y++) for (let x = hx; x < hx + w; x++) {
        const edge = x === hx || x === hx + w - 1 || y === hy || y === hy + h - 1, corner = (x === hx || x === hx + w - 1) && (y === hy || y === hy + h - 1);
        if (!edge) { if (random() < 0.18) litter(x, y); continue; }
        if (y === hy + h - 1 && x === hx + door) continue;                                     // the doorway
        if (!corner && random() < 0.3) { litter(x, y); continue; }                             // fallen stretches
        stub(x, y, corner ? 30 + random() * 26 : 10 + random() * 26);
      }
    };
    const tower = (x0: number, y0: number, x1: number, y1: number) => {
      const at = site(x0, y0, x1, y1, 7, 7);
      if (!at) return;
      const cx = at[0] + 3, cy = at[1] + 3, broken = random() * Math.PI * 2;
      for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < 2.2) { flag(x, y); if (random() < 0.25) litter(x, y); continue; }
        if (d > 3.3) continue;
        // Standing tall on one side, collapsed to stubs and rubble on the other, with a doorway facing south.
        if (y === cy + 3 && x === cx) continue;
        const a = Math.atan2(y - cy, x - cx), fall = (1 + Math.cos(a - broken)) / 2;
        if (fall > 0.82 && random() < 0.6) { litter(x, y); continue; }
        stub(x, y, 16 + (1 - fall) * 70 + random() * 14);
      }
    };
    const wallRun = (x0: number, y0: number, x1: number, y1: number) => {
      const along = random() < 0.5, len = 7 + Math.floor(random() * 6), at = site(x0, y0, x1, y1, along ? len : 1, along ? 1 : len);
      if (!at) return;
      for (let i = 0; i < len; i++) {
        const x = at[0] + (along ? i : 0), y = at[1] + (along ? 0 : i);
        if (random() < 0.2) { litter(x, y); continue; }
        stub(x, y, 12 + random() * 18 + (i % 4 === 0 ? 10 : 0));
      }
    };
    house(18, 98, 44, 124); wallRun(20, 100, 46, 126);                       // Whisperwood's south woods
    tower(86, 60, 104, 80);                                                   // the Ashen Hills' western slopes
    house(58, 140, 76, 152);                                                  // past the Millpond
    house(192, 78, 226, 104); tower(198, 104, 228, 128);                      // the Pale Dunes
    tower(28, 150, 70, 190); wallRun(30, 150, 72, 192);                       // the Murkmire
    tower(172, 6, 234, 44);                                                   // below Frostpeak
    wallRun(162, 150, 204, 192); house(184, 170, 210, 192);                   // round Glass Lake
    house(98, 158, 118, 176); house(124, 160, 146, 186);                      // by the Mossy Ruins
    wallRun(14, 28, 40, 56);                                                  // the Pale Coast
  }

  // ---------- Wild groves across the open meadows ----------
  const grove = makeNoise(seed + 11, 7), townDistance = (x: number, y: number) => Math.hypot(x - TOWN.x, y - TOWN.y);
  for (let y = 12; y < 196; y++) for (let x = 12; x < 228; x++) {
    const terrain = get(x, y);
    if ((terrain !== T.GRASS && terrain !== T.DARK_GRASS) || !free(x, y) || townDistance(x, y) < 17) continue;
    if (x >= 84 && x <= 114 && y >= 95 && y <= 104) continue; // agility meadow
    if (((x - 34) / 13) ** 2 + ((y - 70) / 9.5) ** 2 <= 1 || (x >= 44 && x <= 68 && y >= 69 && y <= 78 && get(x, y) === T.PATH)) continue; // Fernwick and its road
    const g = grove(x, y), roll = random();
    if (g > 0.66 && roll < 0.3) tree(x, y, townDistance(x, y) > 55 && roll < 0.08 ? "oak" : "tree");
    else if (g > 0.5 && roll < 0.025) decor(x, y, "boulder");
    else if (roll < 0.018) decor(x, y, roll < 0.009 ? "flowers" : "bush", false);
  }
  monsters("cow", 60, 128, 76, 138, 3);

  // ---------- The Wizards' Tower (east of the river): three storeys, sigil stones below, the Archmage at the top ----------
  const TOWER = { x: 156, y: 126 }, TOWER_FLOORS: Floor[] = [1, 2].map(level => ({ complex: "wizards", level, x0: TOWER.x, y0: TOWER.y, x1: TOWER.x + 8, y1: TOWER.y + 8, dx: (level - 1) * 12, dy: FLOOR_Y + 25 - TOWER.y }));
  floors.push(...TOWER_FLOORS);
  const towerRows = (door: boolean) => ["  #####  ", " ##...## ", "##.....##", "#.......#", "#.......#", "#.......#", "##.....##", " ##...## ", door ? "  ##+##  " : "  #####  "];
  const tAt = (level: number, col: number, row: number) => ({ x: TOWER.x + col + (level ? TOWER_FLOORS[level - 1].dx : 0), y: TOWER.y + row + (level ? TOWER_FLOORS[level - 1].dy : 0) });
  [0, 1, 2].forEach(level => towerRows(level === 0).forEach((line, row) => [...line].forEach((ch, col) => {
    if (ch === " ") return;
    const { x, y } = tAt(level, col, row);
    put(x, y, ch === "#" ? T.WALL : level === 1 ? T.CARPET : T.STONE); clearAt(x, y);
    if (level) setRegion(x, y, "wizards_tower");
  })));
  buildings.push({ x0: TOWER.x, y0: TOWER.y, x1: TOWER.x + 8, y1: TOWER.y + 8, roof: "cone", color: "#6f7ea6", chimney: false, name: "Wizards' Tower", storeys: 3, complex: "wizards", walls: "stone", tall: 72, spire: 230, round: true });
  const towerStairs = (level: number, col: number, up: boolean, toLevel: number) =>
    add({ kind: "ladder", look: "stairs", ...tAt(level, col, 1), blocks: true, name: "Staircase", action: up ? "Climb-up" : "Climb-down", to: tAt(toLevel, 4, 2) });
  towerStairs(0, 5, true, 1); towerStairs(1, 5, false, 0); towerStairs(1, 3, true, 2); towerStairs(2, 3, false, 1);
  for (const [col, row] of [[1, 3], [1, 5], [7, 3], [7, 5]]) add({ kind: "rock", rock: "sigil", ...tAt(0, col, row), blocks: true, name: "Sigil stone" });
  { const p = tAt(0, 4, 4); npc("apprentice", p.x, p.y, 1); const d = tAt(0, 3, 1); decor(d.x, d.y, "shelf", true, "Spellbooks"); }
  { const t = tAt(1, 2, 4); npc("rare_trader", t.x, t.y); const c = tAt(1, 1, 4); add({ kind: "casket", x: c.x, y: c.y, blocks: true, name: "Rare Casket chest" });
    for (const [col, row] of [[7, 3], [7, 5], [6, 2]]) { const b = tAt(1, col, row); decor(b.x, b.y, "shelf", true, "Bookcase"); }
    const tb = tAt(1, 5, 5); decor(tb.x, tb.y, "table"); }
  { const a = tAt(2, 4, 4); npc("archmage", a.x, a.y, 1);
    for (const [col, row, kind] of [[7, 4, "shelf"], [1, 4, "torch"], [6, 6, "table"], [2, 6, "banner"]] as const) { const d = tAt(2, col, row); decor(d.x, d.y, kind); } }
  road([[150, 131], [160, 135.5]]);
  decor(157, 136, "lamp"); decor(163, 136, "lamp");

  // ---------- Sigil altars, one per sigil, spread across the Realm ----------
  const land0 = (x: number, y: number) => {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r && WALKABLE.has(get(nx, ny)) && get(nx, ny) !== T.BRIDGE && get(nx, ny) !== T.PATH && objectAt[tileIndex(nx, ny)] < 0
        && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([ex, ey]) => WALKABLE.has(get(nx + ex, ny + ey)))) return [nx, ny] as const;
    }
    return [x, y] as const;
  };
  const ALTARS: readonly [string, string, number, number][] = [
    ["breeze_sigil", "Breeze altar", 72, 126], ["thought_sigil", "Thought altar", 54, 62], ["tide_sigil", "Tide altar", 160, 148], ["stone_sigil", "Stone altar", 100, 62],
    ["ember_sigil", "Ember altar", 173, 57], ["shade_sigil", "Shade altar", 30, 146], ["star_sigil", "Star altar", 206, 40], ["storm_sigil", "Storm altar", 212, 88],
    ["bloom_sigil", "Bloom altar", 106, 164], ["path_sigil", "Path altar", 197, 124], ["hollow_sigil", "Hollow altar", 140, 230],
  ];
  for (const [sigil, name, ax, ay] of ALTARS) {
    const [x, y] = land0(ax, ay);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) clearAt(x + dx, y + dy);
    add({ kind: "sigil_altar", sigil, x, y, blocks: true, name });
  }

  // ---------- Wyrmreach: the dragons, and the hunters' camp at the pass ----------
  monsters("ash_drake", 30, 20, 64, 38, 8);
  monsters("cinder_drake", 8, 26, 34, 40, 5);
  monster("emberwyrm", 20, 15, 2);
  { const [cx, cy] = land0(54, 44); decor(cx, cy, "tent"); const [tx, ty] = land0(51, 45); decor(tx, ty, "torch");
    const [hx, hy] = land0(56, 46); npc("drake_hunter", hx, hy, 1);
    const [bx, by] = land0(53, 48); add({ kind: "bank", x: bx, y: by, blocks: true, name: "Bank deposit box" }); }
  add({ kind: "sign", ...(([x, y]) => ({ x, y }))(land0(56, 50)), blocks: true, name: "Signpost", text: "Wyrmreach. Dragons. Their breath burns through anything but a Wyrmward shield: King Hollis keeps a few." });
  // The bone collector, by the chapel.
  { const [bx, by] = land0(104, 134); npc("bone_collector", bx, by, 1); }
  // The Friendhollow stables, beside the Rare Market with the door on the path: a timber stable with the stablemaster,
  // hay and a trough, and a fenced paddock to its west where a chestnut, a grey and a unicorn graze.
  for (let y = 107; y <= 116; y++) for (let x = 81; x <= 98; x++) clearAt(x, y);
  building(90, 108, 97, 112, "s", T.WOOD, undefined, { name: "Friendhollow stables", color: "#b0673e" });
  npc("stablemaster", 93, 110); decor(91, 109, "hay"); decor(96, 109, "hay"); decor(91, 111, "barrel"); decor(96, 111, "hay");
  add({ kind: "sign", x: 95, y: 114, blocks: true, name: "Signpost", text: "The Friendhollow stables. Horses and unicorns for sale: ask Marigold inside. Stroke the horses in the paddock!" });
  for (let x = 81; x <= 88; x++) { decor(x, 108, "fence"); decor(x, 116, "fence"); }
  for (let y = 108; y <= 116; y++) { decor(81, y, "fence"); if (y < 112 || y > 113) decor(88, y, "fence"); }
  npc("paddock_horse", 83, 110, 2); npc("paddock_grey", 86, 113, 2); npc("paddock_unicorn", 84, 114, 2);
  decor(82, 115, "hay"); decor(89, 114, "barrel");
  // General stores in the other towns, so there's somewhere to sell anything wherever you are.
  for (const [id, gx, gy] of [["trader_ember", 170, 45], ["trader_frost", 195, 34], ["trader_oasis", 178, 110]] as const) {
    const [x, y] = land0(gx, gy); npc(id, x, y); decor(x + 1, y - 1, "crate");
  }

  // ---------- Rare Market branches (a trader and a casket chest in each town) ----------
  /** The nearest open land tile to a point (not water, a bridge or a road). */
  const land = (x: number, y: number) => {
    for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) === r && WALKABLE.has(get(nx, ny)) && get(nx, ny) !== T.BRIDGE && objectAt[tileIndex(nx, ny)] < 0) return [nx, ny] as const;
    }
    return [x, y] as const;
  };
  for (const [tx, ty] of [[166, 49], [178, 114], [197, 31], [175, 148], [58, 44]] as const) {
    const [cx, cy] = land(tx + 1, ty); add({ kind: "casket", x: cx, y: cy, blocks: true, name: "Rare Casket chest" });
    const [nx, ny] = land(tx, ty); npc("rare_trader", nx, ny);
  }
  // Slayer creatures: only a Slayer of the right level can wound them.
  monsters("mire_crawler", 18, 168, 62, 194, 8);
  monsters("frost_wisp", 210, 28, 236, 42, 6);
  monsters("thornback", 22, 96, 60, 122, 7);          // the brambly south of Whisperwood
  monsters("cairn_wight", 248, 118, 292, 152, 7);     // the Greyhorn's old cairns, south of Highcairn
  monsters("dune_stalker", 198, 70, 232, 92, 6);      // the northern dunes
  monsters("ember_salamander_young", 98, 30, 132, 52, 6);   // the Ashen Hills: young salamanders, a beginner's foe

  // ---------- Dungeons ----------
  for (let y = 200; y < FLOOR_Y; y++) for (let x = 0; x < W; x++) { put(x, y, T.VOID); setRegion(x, y, "crypt"); }
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
  add({ kind: "altar", x: 28, y: 222, blocks: true, name: "Crypt altar", text: "crypt" }); decor(28, 220, "old_friend");
  for (let x = 25; x <= 49; x += 6) { decor(x, 218, "pillar"); decor(x, 232, "torch", true); }
  decor(66, 214, "chest", true, "Old chest");

  // Hollow Depths (x 80..230): shades, hollow sentinels and the king's throne room behind a gate.
  add({ kind: "ladder", x: 90, y: 208, blocks: true, name: "Rope", action: "Climb-up", to: { x: 122, y: 188 } });
  monsters("gloom_hound", 150, 222, 175, 226, 5);
  monsters("shade", 86, 208, 100, 218, 5); monsters("shade", 104, 210, 148, 214, 6); monsters("hollow_sentinel", 122, 216, 148, 233, 8);
  monsters("hollow_weaver", 150, 222, 176, 226, 2); monsters("hollow_weaver", 124, 226, 148, 233, 3);
  add({ kind: "gate", x: 176, y: 224, blocks: true, name: "Hollow gate", action: "Open", to: { x: 177, y: 224 }, requires: { quest: "hollow_king" } });
  for (let y = 221; y <= 227; y++) if (y !== 224) put(176, y, T.WALL);
  monster("hollow_king", 198, 224, 3);
  // A carpet from the gate to the empty throne, lit by braziers.
  for (let x = 177; x <= 205; x++) { put(x, 223, T.CARPET); put(x, 224, T.CARPET); put(x, 225, T.CARPET); }
  for (let x = 182; x <= 202; x += 5) { decor(x, 221, "torch"); decor(x, 227, "torch"); }
  for (let x = 180; x <= 212; x += 8) { decor(x, 213, "pillar"); decor(x, 235, "pillar"); }
  decor(206, 224, "statue", true, "The empty throne");
  for (let x = 124; x <= 148; x += 8) decor(x, 234, "torch");

  // Nothing grows in a doorway.
  for (const [x, y] of doorways) for (const [dx, dy] of [[0, 0], ...SIDES]) { const o = objectAt[tileIndex(x + dx, y + dy)]; if (o >= 0 && (objects[o].kind === "tree" || (objects[o].kind === "decor" && get(x + dx, y + dy) !== T.WOOD && get(x + dx, y + dy) !== T.STONE && get(x + dx, y + dy) !== T.CARPET))) clearAt(x + dx, y + dy); }
  // Clean-up: removed markers stop blocking, and every station, rock or spot keeps a side you can stand on.
  for (const object of objects) if (object.name === "__removed") object.blocks = false;
  const NEEDS_ACCESS = new Set<ObjectKind>(["wheel", "sigil_altar", "spot", "bank", "range", "furnace", "anvil", "altar", "stall", "ladder", "well", "mill", "coop", "dairy_cow", "casket", "tanning", "sign", "rock", "gate"]);
  const standable = (x: number, y: number) => WALKABLE.has(get(x, y)) && (objectAt[tileIndex(x, y)] < 0 || !objects[objectAt[tileIndex(x, y)]].blocks);
  for (const object of objects) {
    if (!NEEDS_ACCESS.has(object.kind)) continue;
    const sides = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dx, dy]) => [object.x + dx, object.y + dy] as const);
    if (sides.some(([x, y]) => standable(x, y))) continue;
    const clearable = sides.find(([x, y]) => WALKABLE.has(get(x, y)) && objectAt[tileIndex(x, y)] >= 0 && (objects[objectAt[tileIndex(x, y)]].kind === "tree" || objects[objectAt[tileIndex(x, y)]].kind === "decor"));
    if (clearable) clearAt(clearable[0], clearable[1]);
  }
  for (const object of objects) if (object.name === "__removed") object.blocks = false;
  // And every one can be walked to from the spawn (taking ladders and stairs): where a grove walls one in, clear a way.
  const passable = (x: number, y: number) => WALKABLE.has(get(x, y)) && (objectAt[tileIndex(x, y)] < 0 || !objects[objectAt[tileIndex(x, y)]].blocks);
  const flood = () => {
    const seen = new Uint8Array(W * H), queue: number[] = [], taken = new Set<number>();
    const start = (x: number, y: number) => { if (inBounds(x, y) && !seen[tileIndex(x, y)] && passable(x, y)) { seen[tileIndex(x, y)] = 1; queue.push(tileIndex(x, y)); } };
    start(121, 123);
    for (let grew = true; grew;) {
      while (queue.length) { const index = queue.pop()!, x = index % W, y = (index - x) / W; for (const [dx, dy] of SIDES) start(x + dx, y + dy); }
      grew = false;
      for (const ladder of objects) if (ladder.kind === "ladder" && ladder.to && !taken.has(ladder.id) && SIDES.some(([dx, dy]) => inBounds(ladder.x + dx, ladder.y + dy) && seen[tileIndex(ladder.x + dx, ladder.y + dy)])) { taken.add(ladder.id); start(ladder.to.x, ladder.to.y); grew = true; }
    }
    return seen;
  };
  let seen = flood();
  for (const object of objects) {
    if (!NEEDS_ACCESS.has(object.kind) || object.name === "__removed" || SIDES.some(([dx, dy]) => inBounds(object.x + dx, object.y + dy) && seen[tileIndex(object.x + dx, object.y + dy)])) continue;
    // Search out from the object through trees and bushes to the walkable world, then fell what's in the way.
    const from = new Int32Array(W * H).fill(-2), queue: number[] = [];
    for (const [dx, dy] of SIDES) { const x = object.x + dx, y = object.y + dy; if (inBounds(x, y) && WALKABLE.has(get(x, y)) && get(x, y) !== T.BRIDGE) { from[tileIndex(x, y)] = -1; queue.push(tileIndex(x, y)); } }
    let found = -1;
    for (let head = 0; head < queue.length && found < 0; head++) {
      const index = queue[head], x = index % W, y = (index - x) / W;
      if (seen[index]) { found = index; break; }
      for (const [dx, dy] of SIDES) {
        const nx = x + dx, ny = y + dy, next = tileIndex(nx, ny);
        if (!inBounds(nx, ny) || from[next] !== -2 || !WALKABLE.has(get(nx, ny))) continue;
        const blocker = objectAt[next] >= 0 ? objects[objectAt[next]] : null;
        if (blocker && blocker.blocks && blocker.kind !== "tree" && blocker.kind !== "decor") continue;
        from[next] = index; queue.push(next);
      }
    }
    for (let index = found; index >= 0; index = from[index]) { const x = index % W, y = (index - x) / W; const blocker = objectAt[index] >= 0 ? objects[objectAt[index]] : null; if (blocker && (blocker.kind === "tree" || blocker.kind === "decor")) clearAt(x, y); }
    if (found >= 0) { for (const o of objects) if (o.name === "__removed") o.blocks = false; seen = flood(); }
  }

  const places: Pick<World["places"], "spawn" | "hollow_square" | "emberforge" | "oasis" | "frostpeak" | "pier" | "crypt" | "depths" | "king"> = {
    spawn: { x: 121, y: 123 }, hollow_square: { x: 121, y: 122 }, emberforge: { x: 162, y: 49 }, oasis: { x: 186, y: 115 },
    frostpeak: { x: 195, y: 34 }, pier: { x: 178, y: 150 }, crypt: { x: 40, y: 180 }, depths: { x: 122, y: 188 }, king: { x: 198, y: 224 },
  };
  const buildingAt = new Uint8Array(W * H);
  buildings.forEach((b, index) => { if (b.roof === "none") return; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) buildingAt[y * W + x] = index + 1; });
  // Shop and bank signs: a hanging board outside each door, painted with what's sold inside, so they're easy to tell apart.
  const SIGNS: Record<string, [string, string]> = {
    shop_general: ["pot", "Friendhollow General Store"], pike: ["fishing_rod", "Pike's Tackle"], axel: ["pewter_axe", "Axel's Axes"], armsmaster: ["ashsteel_sword", "Emberforge Arms"],
    runa: ["breeze_sigil", "Runa's Sigils"], tanner: ["leather", "Tessa's Tannery"], outfitter: ["glimmer_helm", "Frostpeak Outfitters"], armourer: ["pewter_helm", "Hollis Armoury"],
    weaponsmith: ["pewter_sword", "Edge & Hilt"], bowyer: ["shortbow", "Fletch & Feather"], slayer_master: ["slayer_gem", "The Warden's Lodge"], innkeeper: ["cake", "The Sleepy Friend inn"],
    rare_trader: ["rough_moonstone", "The Rare Market"], stablemaster: ["__horse", "Friendhollow Stables"],
    hazel: ["war_bow", "Hazel's War Bows"], rowan: ["pewter_axe", "Fernwick Timber Yard"],
    heft: ["pewter_greatsword", "Heft & Haft"], mender: ["heartguard_helm", "Hale's Infirmary"], tailor: ["striped_cape", "Threadneedle Tailors"], clothier: ["crimson_dress", "Ribbon & Rye Clothiers"], cairn_trader: ["pot", "Highcairn Stores"], kettle_keeper: ["cake", "The Stone Kettle"], cairn_smith: ["rarite_pickaxe", "Highcairn Forge"],
  };
  const signed = new Set<Building>();
  const signFor = (x: number, y: number, icon: string, label: string) => {
    const home = buildings.find(b => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && b.roof !== "none");
    if (!home || signed.has(home)) return;
    const door = doorways.find(([dx, dy]) => (dx === home.x0 || dx === home.x1 || dy === home.y0 || dy === home.y1) && dx >= home.x0 && dx <= home.x1 && dy >= home.y0 && dy <= home.y1);
    if (!door) return;
    const [dx, dy] = door, nx = dx === home.x0 ? -1 : dx === home.x1 ? 1 : 0, ny = dy === home.y0 ? -1 : dy === home.y1 ? 1 : 0, tx = ny ? 1 : 0, ty = nx ? 1 : 0;
    // Beside the doorway (doors are two tiles wide), one tile out from the wall.
    for (const along of [-1, 2, -2, 3]) {
      const sx = dx + nx + tx * along, sy = dy + ny + ty * along;
      if (free(sx, sy) || (WALKABLE.has(get(sx, sy)) && objectAt[tileIndex(sx, sy)] < 0 && get(sx, sy) !== T.BRIDGE)) {
        add({ kind: "sign", x: sx, y: sy, blocks: true, name: label, text: `${label}.`, icon }); signed.add(home); return;
      }
    }
  };
  for (const spawn of spawns) if (spawn.kind === "npc" && SIGNS[spawn.id]) signFor(spawn.x, spawn.y, ...SIGNS[spawn.id]);
  for (const object of [...objects]) if (object.kind === "bank" && object.name === "Bank booth") signFor(object.x, object.y, "coins", "Bank");
  // Banners of your Friend around the fountain square and at the castle gate.
  for (const [bx, by] of [[113, 117], [131, 117], [113, 131], [131, 131], [119, 106], [124, 106]] as const) if (WALKABLE.has(get(bx, by)) && objectAt[tileIndex(bx, by)] < 0) decor(bx, by, "banner");

  // Millpond: a little pond south of the windmill for beginner fishing (minnows in a net, perch and carp with bait), close to town.
  blob(76, 139, 3.8, 2.4, T.WATER, 0.15, t => t === T.GRASS || t === T.DARK_GRASS);
  for (let y = 134; y <= 144; y++) for (let x = 69; x <= 84; x++) if (isWater(get(x, y))) clearAt(x, y);
  {
    const kinds: SpotKind[] = ["net", "net", "bait"], shore = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => WALKABLE.has(get(x + dx, y + dy)));
    const edge: [number, number][] = [];
    for (let y = 134; y <= 144; y++) for (let x = 69; x <= 84; x++) if (((x - 76) / 5.5) ** 2 + ((y - 139) / 3.6) ** 2 <= 1 && isWater(get(x, y)) && shore(x, y) && objectAt[tileIndex(x, y)] < 0) edge.push([x, y]);
    // Spread the spots round the shore: west, east and north edges.
    const pick = (score: (x: number, y: number) => number) => edge.filter(([x, y]) => objectAt[tileIndex(x, y)] < 0).sort((a, b) => score(...a) - score(...b))[0];
    for (const [kind, score] of [[kinds[0], (x: number) => x], [kinds[1], (x: number) => -x], [kinds[2], (x: number, y: number) => -y * 4 + Math.abs(x - 77)]] as const) {
      const at = pick(score); if (at) spot(at[0], at[1], kind);
    }
    decor(71, 137, "reeds", false); decor(81, 141, "reeds", false); decor(77, 139, "lily", false); decor(74, 142, "bench", true, "Bench");
    add({ kind: "sign", x: 76, y: 135, blocks: true, name: "Signpost", text: "Millpond. Minnows for a small net, perch and carp with a rod and bait. The sheep pen is just north: shear the sheep for wool (shears from any general store) and spin it into string on the farmhouse wheel." });
  }

  // The cow pen, out on the farm by the windmill (built last, so no tree or bush lands inside it), its gate facing the coop.
  for (let y = 126; y <= 134; y++) for (let x = 59; x <= 70; x++) { clearAt(x, y); put(x, y, T.GRASS); }
  for (let x = 59; x <= 70; x++) { decor(x, 126, "fence"); decor(x, 134, "fence"); }
  for (let y = 126; y <= 134; y++) { decor(59, y, "fence"); if (y < 129 || y > 131) decor(70, y, "fence"); }
  monsters("cow", 61, 127, 68, 133, 5);
  add({ kind: "dairy_cow", x: 64, y: 130, blocks: true, name: "Dairy cow" });
  decor(71, 128, "hay"); decor(71, 133, "hay");
  // Newer creatures, placed last so the rest of the Realm is laid out exactly as before.
  monsters("forest_spider", 60, 60, 82, 96, 7);          // Whisperwood's deep woods
  monsters("boar", 16, 98, 42, 124, 6);                  // the southern woods, among the yews
  monsters("sand_scorpion", 196, 72, 234, 126, 7);       // the Pale Dunes
  monsters("highland_goat", 244, 96, 300, 132, 7);       // the Greyhorn slopes
  monsters("stone_golem", 294, 48, 316, 70, 3);          // the Greyhorn mine
  // The sheep pen, between the cows and the chickens, its gate facing the Millpond; the farmhouse keeps a spinning wheel.
  for (let y = 127; y <= 134; y++) for (let x = 73; x <= 82; x++) { clearAt(x, y); put(x, y, T.GRASS); }
  for (let x = 73; x <= 82; x++) { decor(x, 127, "fence"); if (x < 77 || x > 78) decor(x, 134, "fence"); }
  for (let y = 127; y <= 134; y++) { decor(73, y, "fence"); decor(82, y, "fence"); }
  monsters("sheep", 74, 128, 81, 133, 6);
  decor(80, 128, "hay", true, "Hay bales");
  for (const [wx, wy] of [[74, 120], [73, 120], [75, 121], [78, 121]] as const) if (add({ kind: "wheel", x: wx, y: wy, blocks: true, name: "Spinning wheel" })) break;
  for (const [wx, wy] of [[130, 128], [131, 129], [129, 130]] as const) if (add({ kind: "wheel", x: wx, y: wy, blocks: true, name: "Spinning wheel" })) break;
  // ---------- Town tidy-ups, done last so the rest of the Realm is laid out exactly as before ----------
  // The Sleepy Friend moves across the east bridge and the house behind Fletch & Feather moves back towards the river,
  // so neither door faces another building's wall a tile away (at least five tiles clear in front of each).
  const demolish = (x0: number, y0: number, x1: number, y1: number, ground: number, sign?: string) => {
    const index = buildings.findIndex(b => b.x0 === x0 && b.y0 === y0 && b.x1 === x1 && b.y1 === y1);
    if (index >= 0) buildings.splice(index, 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { clearAt(x, y); put(x, y, ground); }
    for (let i = spawns.length - 1; i >= 0; i--) if (spawns[i].x >= x0 && spawns[i].x <= x1 && spawns[i].y >= y0 && spawns[i].y <= y1) spawns.splice(i, 1);
    for (let i = doorways.length - 1; i >= 0; i--) { const [dx, dy] = doorways[i]; if (dx >= x0 && dx <= x1 && dy >= y0 && dy <= y1) doorways.splice(i, 1); }
    if (sign) for (const object of objects) if (object.kind === "sign" && object.name === sign && object.x >= x0 - 3 && object.x <= x1 + 3 && object.y >= y0 - 3 && object.y <= y1 + 3) clearAt(object.x, object.y);
  };
  demolish(135, 124, 141, 131, T.COBBLE, "The Sleepy Friend inn");
  demolish(136, 135, 141, 140, T.GRASS);
  // The Sleepy Friend, on its own across the east bridge: its door on the road from the bridge, a cobbled step up to it.
  building(166, 120, 172, 125, "n", T.WOOD, undefined, { name: "The Sleepy Friend", color: "#cdb98a", chimney: true });
  npc("innkeeper", 171, 123); add({ kind: "range", x: 167, y: 121, blocks: true, name: "Cooking range" }); decor(167, 124, "table"); decor(168, 124, "bench", false); decor(171, 121, "barrel");
  for (let y = 117; y <= 119; y++) for (let x = 169; x <= 170; x++) { clearAt(x, y); put(x, y, T.COBBLE); }
  decor(168, 118, "lamp"); decor(171, 118, "lamp");
  signFor(171, 123, ...SIGNS.innkeeper);
  // The house behind Fletch & Feather, set back five tiles.
  building(140, 135, 145, 140, "w", T.WOOD, undefined, { name: "House", color: "#a996b5", chimney: true });
  decor(142, 136, "bed"); decor(144, 139, "table");
  return { tiles, region, objects, objectAt, spawns, places, lift, buildings, floors, W, H };
}

export function createWorld(seed = 20260927): World {
  const main = buildMainland(seed);
  const tiles = new Uint8Array(W * H).fill(T.DEEP), region = new Uint8Array(W * H), objects: WorldObject[] = [], spawns: SpawnDef[] = [];
  const objectAt = new Int32Array(W * H).fill(-1), lift = new Float32Array(W * H), buildings: Building[] = [], floors: Floor[] = [];
  for (let y = OVERWORLD_H; y < H; y++) for (let x = 0; x < W; x++) tiles[y * W + x] = T.VOID;
  // Set the mainland in: its overworld at MAINLAND.x/y, its dungeon rows into the dungeon strip, its storeys into the storey rows.
  for (let y = 0; y < main.H; y++) for (let x = 0; x < main.W; x++) {
    const [wx, wy] = mainlandToWorld(x, y), from = y * main.W + x, to = wy * W + wx;
    tiles[to] = main.tiles[from]; region[to] = main.region[from]; lift[to] = main.lift[from];
  }
  for (const object of main.objects) {
    const [x, y] = mainlandToWorld(object.x, object.y), moved: WorldObject = { ...object, x, y };
    if (object.to) { const [tx, ty] = mainlandToWorld(object.to.x, object.to.y); moved.to = { x: tx, y: ty }; }
    objects.push(moved); if (object.name !== "__removed") objectAt[y * W + x] = moved.id;
  }
  for (const spawn of main.spawns) { const [x, y] = mainlandToWorld(spawn.x, spawn.y); spawns.push({ ...spawn, x, y }); }
  for (const b of main.buildings) { const [x0, y0] = mainlandToWorld(b.x0, b.y0), [x1, y1] = mainlandToWorld(b.x1, b.y1); buildings.push({ ...b, x0, y0, x1, y1 }); }
  // A storey's tiles sit at real + (dx, dy): the real rectangle moves with the mainland, the stored rows move to the world's storey rows.
  const localFloorY = MAINLAND.h + MAINLAND.dungeonRows;
  for (const f of main.floors) { const [x0, y0] = mainlandToWorld(f.x0, f.y0), [x1, y1] = mainlandToWorld(f.x1, f.y1); floors.push({ ...f, x0, y0, x1, y1, dy: f.dy + (FLOOR_Y - localFloorY) - MAINLAND.y }); }
  const places = Object.fromEntries(Object.entries(main.places).map(([key, at]) => { const [x, y] = mainlandToWorld(at.x, at.y); return [key, { x, y }]; })) as World["places"];
  // Where the wider world's glides land (and two mainland towns that never had one): a village square, a courtyard, a camp.
  const m = (x: number, y: number) => { const [wx, wy] = mainlandToWorld(x, y); return { x: wx, y: wy }; };
  Object.assign(places, { fernwick: m(36, 72), highcairn: m(282, 84), dawnhold: m(316, 82), gravesend: { x: 300, y: 136 }, saltmarrow: { x: 424, y: 466 }, hollyhock: { x: 160, y: 452 }, dyemoor: { x: 254, y: 470 }, tallgrass: { x: 556, y: 402 }, cragmaw: { x: 632, y: 204 }, quillhaven: { x: 646, y: 404 }, ashfall: { x: 72, y: 128 } });
  // The wider world around it.
  const ctx: GenContext = { W, H, tiles, region, objectAt, lift, objects, spawns, buildings, doorways: [], random: mulberry(seed + 4242), noise: makeNoise(seed + 11, 9), noise2: makeNoise(seed + 19, 4) };
  buildExpansion(ctx, worldTools(ctx), seed);
  for (const object of objects) if (object.name === "__removed") object.blocks = false;
  const buildingAt = new Uint8Array(W * H);
  buildings.forEach((b, index) => { if (b.roof === "none") return; for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) buildingAt[y * W + x] = index + 1; });
  return { tiles, region, objects, objectAt, spawns, places, heights: buildHeights(tiles, seed, lift), buildings, buildingAt, floors };
}
const i2 = (random: () => number) => random() > 0.5;
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
/** Faded roof tiles in the Rare Friends accents. */
const ROOF_COLORS = ["#c99a96", "#9aab92", "#8f9cb2", "#cdb98a", "#a996b5"];
const TREE_NAMES: Record<TreeKind, string> = { tree: "Tree", oak: "Oak", willow: "Willow", maple: "Maple tree", yew: "Yew", ashwood: "Ashwood", palm: "Palm tree", pine: "Pine tree", deadwood: "Dead tree" };
const DECOR_NAMES: Record<DecorKind, string> = {
  flowers: "Flowers", bush: "Bush", boulder: "Boulder", lamp: "Lamp post", bench: "Bench", crate: "Crate", barrel: "Water barrel", tent: "Tent",
  cactus: "Cactus", pine: "Pine tree", dead_tree: "Dead tree", statue: "Statue", grave: "Grave", fence: "Fence", reeds: "Reeds", table: "Table",
  bed: "Bed", shelf: "Shelves", pillar: "Pillar", rubble: "Rubble", snowman: "Snow Friend", lily: "Lily pad", banner: "Banner", torch: "Torch",
  palm: "Palm tree", hay: "Hay bales", windmill: "Windmill", boat: "Boat", chest: "Chest", throne: "Throne", armour: "Suit of armour",
  logpile: "Log pile", stump: "Chopping block", target: "Archery target", ruin_wall: "Crumbling wall", old_friend: "Statue of the Old Friend",
  tomb: "Stone tomb", crypt: "Crypt", obelisk: "Obelisk", bones: "Bones", hearth: "Hearth",
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
  [T.ASH]: 62, [T.GRASS]: 46, [T.DARK_GRASS]: 58, [T.PATH]: 26, [T.SAND]: 38, [T.SWAMP]: 10, [T.SNOW]: 84, [T.GRAVEL]: 60, [T.CLIFF]: 90, [T.FARMLAND]: 6,
};
const FLAT = new Set<number>([T.LAVA, T.VOID, T.WATER, T.DEEP, T.BRIDGE, T.COBBLE, T.WOOD, T.STONE, T.CARPET, T.WALL, T.DUNGEON, T.ICE]);
/**
 * Rolling hills from two noise octaves, scaled by each terrain's relief, eased to flat ground near water, towns,
 * buildings and bridges (so shores and streets stay level), then blurred once for gentle slopes.
 */
function buildHeights(tiles: Uint8Array, seed: number, lift?: Float32Array): Float32Array {
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
      relief += (RELIEF[t] ?? 0) * (1 + (lift?.[ty * W + tx] ?? 0)); count++; near = Math.min(near, distance[ty * W + tx]);
    }
    const ease = Math.min(1, near / 4), smooth = ease * ease * (3 - 2 * ease);
    // The hill noise is sampled in the mainland's own coordinates, so its relief is exactly what it always was (the wider world sees the same field, shifted).
    const shape = broad(i - MAINLAND.x, j - MAINLAND.y) * 0.75 + fine(i - MAINLAND.x, j - MAINLAND.y) * 0.25;
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

// ---------- Storeys ----------
/** The upper storey a stored tile belongs to (null on the ground, underground, or off any floor). */
export function floorAt(world: World, x: number, y: number): Floor | null {
  if (y < FLOOR_Y - 0.5) return null;
  // The tile a point rounds to decides first (so a corner shared by two storeys belongs to the right one), then edges.
  const rx = Math.round(x), ry = Math.round(y);
  for (const floor of world.floors) if (rx >= floor.x0 + floor.dx && rx <= floor.x1 + floor.dx && ry >= floor.y0 + floor.dy && ry <= floor.y1 + floor.dy) return floor;
  for (const floor of world.floors) if (x >= floor.x0 + floor.dx - 0.5 && x <= floor.x1 + floor.dx + 0.5 && y >= floor.y0 + floor.dy - 0.5 && y <= floor.y1 + floor.dy + 0.5) return floor;
  return null;
}
/** Where a tile really is: its ground position and how many storeys up. */
export function realPoint(world: World, x: number, y: number) {
  const floor = floorAt(world, x, y);
  return floor ? { x: x - floor.dx, y: y - floor.dy, level: floor.level } : { x, y, level: 0 };
}
/** A ground position seen from a storey: the stored tile on `level` of that complex if it covers (x, y), else the ground. */
export function onLevel(world: World, x: number, y: number, level: number, complex?: string) {
  if (level > 0) for (const floor of world.floors) {
    if (floor.level !== level || (complex && floor.complex !== complex) || x < floor.x0 || x > floor.x1 || y < floor.y0 || y > floor.y1) continue;
    if (world.tiles[tileIndex(x + floor.dx, y + floor.dy)] !== T.VOID) return { x: x + floor.dx, y: y + floor.dy };
  }
  return { x, y };
}
/** The building (index + 1) whose footprint covers a ground tile, and its complex. */
export function complexAt(world: World, x: number, y: number) {
  const index = inBounds(x, y) ? world.buildingAt[tileIndex(x, y)] : 0, building = index ? world.buildings[index - 1] : null;
  return building ? building.complex ?? `#${index}` : null;
}

export function regionAt(world: World, x: number, y: number): Region {
  return REGIONS[inBounds(x, y) ? world.region[tileIndex(x, y)] : 0] ?? REGIONS[0];
}
