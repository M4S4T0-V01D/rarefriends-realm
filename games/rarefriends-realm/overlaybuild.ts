/**
 * Buildings in the development world (overlay.ts applies them): one drawn from two corners, with its roof, storeys,
 * doors and a room's furniture; and a copy of one of the world's own buildings (a prefab: its tiles, the building as it's
 * drawn, its furniture and, if wanted, its people), stamped anywhere and turned a quarter at a time. A prefab travels
 * inside the op, so a deployed world never depends on where the copied building happened to be. No DOM: the engine,
 * the bake, the editor and the tests all load it.
 */
import { DECOR_NAMES, FLOOR_Y, OVERWORLD_H, T, W, type Building, type DecorKind, type ObjectKind, type World, type WorldObject } from "./world.ts";

export type Side = "n" | "s" | "e" | "w";
export const SIDES: readonly Side[] = ["n", "s", "e", "w"];
/** The rooms a drawn building can be furnished as. */
export const FURNISH = ["home", "shop", "smithy", "inn", "bank", "chapel", "store"] as const;
export type Furnish = (typeof FURNISH)[number];
/** What a prefab keeps of a building record (everything but where it stands, and which complex its upper floors are). */
export const BUILDING_KEYS = ["roof", "color", "chimney", "name", "storeys", "storeyH", "tall", "spire", "keep", "round", "hip", "walls", "pyramid", "unfinished", "style", "facade", "sign"] as const;
export type PrefabBuilding = Partial<Pick<Building, (typeof BUILDING_KEYS)[number]>>;
/** What a prefab keeps of a thing: what it is and how it looks, never what it leads to (ladders, clues, quests). */
const OBJECT_KEYS = ["tree", "rock", "spot", "decor", "stall", "text", "big", "look", "axis", "icon", "sigil", "height"] as const;
export type PrefabObject = { dx: number; dy: number; kind: ObjectKind; name: string; blocks: boolean } & Partial<Pick<WorldObject, (typeof OBJECT_KEYS)[number]>>;
export type PrefabPerson = { dx: number; dy: number; id: string; wander?: number };
export type Prefab = { name: string; w: number; h: number; tiles: number[]; building: PrefabBuilding; objects: PrefabObject[]; people: PrefabPerson[] };
export const PREFAB_MAX = 48;
/** Things that only mean something where they were made: they're left behind when a building is copied. */
const LEFT_BEHIND = new Set<ObjectKind>(["ladder", "dock", "casket", "obstacle", "herb"]);

/** A copy of one of the world's buildings (by its index in world.buildings): null when it's too big or isn't on the overworld. */
export function extractPrefab(world: World, index: number): Prefab | null {
  const b = world.buildings[index]; if (!b) return null;
  const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
  if (w > PREFAB_MAX || h > PREFAB_MAX || b.y1 >= OVERWORLD_H) return null;
  const tiles: number[] = [];
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) tiles.push(world.tiles[y * W + x]);
  const building: PrefabBuilding = {};
  for (const key of BUILDING_KEYS) if (b[key] !== undefined) (building as Record<string, unknown>)[key] = typeof b[key] === "object" ? { ...(b[key] as object) } : b[key];
  const objects: PrefabObject[] = [];
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
    const id = world.objectAt[y * W + x]; if (id < 0) continue;
    const o = world.objects[id];
    if (o.name === "__removed" || LEFT_BEHIND.has(o.kind) || o.to || o.clue || o.requires || o.action || o.obstacle || o.monster || o.ship || o.dock) continue;
    const copy: PrefabObject = { dx: x - b.x0, dy: y - b.y0, kind: o.kind, name: o.name, blocks: o.blocks };
    for (const key of OBJECT_KEYS) if (o[key] !== undefined) (copy as Record<string, unknown>)[key] = o[key];
    objects.push(copy);
  }
  const people = world.spawns.filter(s => s.kind === "npc" && s.x >= b.x0 && s.x <= b.x1 && s.y >= b.y0 && s.y <= b.y1).map(s => ({ dx: s.x - b.x0, dy: s.y - b.y0, id: s.id, ...(s.wander ? { wander: s.wander } : {}) }));
  return { name: b.name || `A building at ${b.x0},${b.y0}`, w, h, tiles, building, objects, people };
}

/** A prefab turned `rot` quarters clockwise. */
export function turned(prefab: Prefab, rot: number): Prefab {
  const r = ((rot % 4) + 4) % 4; if (!r) return prefab;
  const { w, h } = prefab, odd = r % 2 === 1, nw = odd ? h : w, nh = odd ? w : h;
  const at = (dx: number, dy: number) => r === 1 ? { x: h - 1 - dy, y: dx } : r === 2 ? { x: w - 1 - dx, y: h - 1 - dy } : { x: dy, y: w - 1 - dx };
  const tiles = new Array<number>(nw * nh).fill(T.GRASS);
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const p = at(dx, dy); tiles[p.y * nw + p.x] = prefab.tiles[dy * w + dx]; }
  const objects = prefab.objects.map(o => { const p = at(o.dx, o.dy); return { ...o, dx: p.x, dy: p.y, ...(odd && o.axis ? { axis: o.axis === "ew" ? "ns" as const : "ew" as const } : {}) }; });
  const people = prefab.people.map(o => { const p = at(o.dx, o.dy); return { ...o, dx: p.x, dy: p.y }; });
  return { ...prefab, w: nw, h: nh, tiles, objects, people };
}

/** Where a building's things go, so a room reads as what it is (a bed in a corner, the furnace against the back wall). */
type Spot = "back" | "corner" | "side" | "middle";
const ROOMS: Record<Furnish, readonly (readonly [Spot, ObjectKind, DecorKind?])[]> = {
  home: [["corner", "decor", "bed"], ["back", "decor", "hearth"], ["middle", "decor", "table"], ["corner", "decor", "chest"], ["side", "decor", "shelf"], ["corner", "decor", "barrel"]],
  shop: [["back", "decor", "shelf"], ["back", "decor", "shelf"], ["back", "decor", "shelf"], ["middle", "decor", "table"], ["corner", "decor", "crate"], ["corner", "decor", "barrel"]],
  smithy: [["back", "furnace"], ["middle", "anvil"], ["corner", "decor", "barrel"], ["corner", "decor", "crate"], ["side", "decor", "armour"]],
  inn: [["back", "range"], ["back", "decor", "barrel"], ["middle", "decor", "table"], ["middle", "decor", "table"], ["middle", "decor", "table"], ["side", "decor", "bench"], ["corner", "decor", "barrel"], ["corner", "decor", "hearth"]],
  bank: [["back", "bank"], ["back", "bank"], ["back", "bank"], ["back", "bank"], ["corner", "decor", "chest"], ["corner", "decor", "pillar"]],
  chapel: [["back", "altar"], ["middle", "decor", "bench"], ["middle", "decor", "bench"], ["middle", "decor", "bench"], ["corner", "decor", "torch"], ["corner", "decor", "torch"]],
  store: [["corner", "decor", "crate"], ["corner", "decor", "barrel"], ["corner", "decor", "crate"], ["corner", "decor", "barrel"], ["side", "decor", "crate"], ["side", "decor", "logpile"], ["back", "decor", "shelf"]],
};
const SERVICE_NAMES: Partial<Record<ObjectKind, string>> = { bank: "Bank booth", range: "Cooking range", furnace: "Furnace", anvil: "Anvil", altar: "Altar" };
/** Walk-through furniture (as the world's own benches are). */
const LOW = new Set<string>(["bench"]);

/** The furniture for a drawn building (x0..y1 its walls; doors the sides with a doorway), as things to place: never in a doorway's way. */
export function furnishing(room: Furnish, x0: number, y0: number, x1: number, y1: number, doors: readonly Side[]): Omit<WorldObject, "id">[] {
  const ix0 = x0 + 1, iy0 = y0 + 1, ix1 = x1 - 1, iy1 = y1 - 1; if (ix1 < ix0 || iy1 < iy0) return [];
  const mx = Math.floor((x0 + x1) / 2), my = Math.floor((y0 + y1) / 2), taken = new Set<string>(), key = (x: number, y: number) => `${x},${y}`;
  // The doorways' insides, and the tile in from each, stay clear.
  for (const d of doors) for (const [gx, gy] of d === "s" ? [[mx, y1], [mx + 1, y1]] : d === "n" ? [[mx, y0], [mx + 1, y0]] : d === "e" ? [[x1, my], [x1, my + 1]] : [[x0, my], [x0, my + 1]]) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) taken.add(key(gx + dx, gy + dy));
  }
  const main = doors[0] ?? "s", inside = (x: number, y: number) => x >= ix0 && x <= ix1 && y >= iy0 && y <= iy1;
  const back = main === "s" ? (x: number, y: number) => y === iy0 : main === "n" ? (x: number, y: number) => y === iy1 : main === "e" ? (x: number, y: number) => x === ix0 : (x: number, y: number) => x === ix1;
  const edge = (x: number, y: number) => x === ix0 || x === ix1 || y === iy0 || y === iy1, corner = (x: number, y: number) => (x === ix0 || x === ix1) && (y === iy0 || y === iy1);
  const cells: { x: number; y: number }[] = []; for (let y = iy0; y <= iy1; y++) for (let x = ix0; x <= ix1; x++) cells.push({ x, y });
  const near = (c: { x: number; y: number }) => Math.hypot(c.x - (x0 + x1) / 2, c.y - (y0 + y1) / 2);
  const out: Omit<WorldObject, "id">[] = [];
  for (const [spot, kind, decor] of ROOMS[room]) {
    const fits = (c: { x: number; y: number }) => !taken.has(key(c.x, c.y)) && (spot === "back" ? back(c.x, c.y) && !corner(c.x, c.y) : spot === "corner" ? corner(c.x, c.y) : spot === "side" ? edge(c.x, c.y) && !back(c.x, c.y) && !corner(c.x, c.y) : !edge(c.x, c.y));
    const at = cells.filter(fits).sort((a, b) => near(a) - near(b))[0]; if (!at) continue;
    taken.add(key(at.x, at.y));
    // (Room to walk round what stands in the middle.)
    if (spot === "middle") for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) if (inside(at.x + dx, at.y + dy)) taken.add(key(at.x + dx, at.y + dy));
    out.push({ kind, x: at.x, y: at.y, name: decor ? DECOR_NAMES[decor] : SERVICE_NAMES[kind] ?? kind, blocks: !(decor && LOW.has(decor)), ...(decor ? { decor } : {}) });
  }
  return out;
}

/** A doorway's two tiles in a building's wall. */
export const doorway = (side: Side, x0: number, y0: number, x1: number, y1: number): [number, number][] => {
  const mx = Math.floor((x0 + x1) / 2), my = Math.floor((y0 + y1) / 2);
  return side === "s" ? [[mx, y1], [mx + 1, y1]] : side === "n" ? [[mx, y0], [mx + 1, y0]] : side === "e" ? [[x1, my], [x1, my + 1]] : [[x0, my], [x0, my + 1]];
};

/** Whether a rectangle can take a building: on the map, not across the overworld's edge, not in the rooms below. */
export const buildable = (x0: number, y0: number, x1: number, y1: number) => x0 >= 0 && y0 >= 0 && x1 < W && y1 < FLOOR_Y && !(y1 >= OVERWORLD_H && y0 < OVERWORLD_H);
