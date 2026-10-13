/**
 * World overlays: the editable layer over the generated world. The generator (world.ts and the expansions) is the base,
 * fixed in code; an overlay is a list of operations on top of it (tiles painted, ground raised, things placed or
 * removed, buildings, spawns, definitions of new things), applied in order. The private development game edits one
 * live (editor.tsx) and keeps it in the save service; a finished overlay is promoted into the public game by committing
 * it under overlays/, where generateWorld applies it after everything else, so production stays a build of the code.
 *
 * Every placed thing has a stable id of the overlay's own (`uid`), so it can be edited or removed later whatever else
 * moved. Applying is deterministic and idempotent for a given base; nothing here draws from a random stream. This
 * module has no DOM: the engine, the bake and the tests all load it.
 */
import { ITEM_LIST, MONSTERS, type MonsterDef, type RockKind, type SpotKind, type TreeKind } from "./data.ts";
import { DECOR_NAMES, FLOOR_Y, H, OVERWORLD_H, ROOF_COLORS, T, TREE_NAMES, W, WALKABLE, buildHeights, indexBuildings, indexObjects, type Building, type DecorKind, type ObjectKind, type World, type WorldObject } from "./world.ts";

/** An NPC an overlay defines: who they are, and what they say (plain lines; the game's own people have scripted talk). */
export type OverlayNpc = { id: string; name: string; examine: string; options: readonly string[]; art: { canonical: 7730 | 3412 } | { family: number; seed: number }; lines?: string[] };
/**
 * A quest an overlay defines: an errand, the Realm's commonest shape (content.ts fetchQuest). Someone (`giver`, one of
 * the game's people or the overlay's own) asks for `count` of an item, in their words (`offer`, then `accept`, then
 * `progress` until you have them, then `done`), and pays in coins, XP in a skill and items. Registered by content.ts
 * (registerDevQuest), which has the quest machinery this module can't import.
 */
export type OverlayQuest = { id: string; name: string; giver: string; item: string; count: number; offer: string[]; accept: string; progress: string; done: string[]; points?: number; difficulty?: string; rewards: { coins?: number; xp?: { skill: string; amount: number }; items?: { id: string; n: number }[] } };
/** Where camping is allowed or forbidden regardless of the rules (camping.ts CAMP_RULES.overrides). */
export type CampZone = { x0: number; y0: number; x1: number; y1: number; allow: boolean; why?: string };

export const OVERLAY_VERSION = 1;
export type Op =
  | { op: "tile"; x: number; y: number; t: number }
  | { op: "fill"; x0: number; y0: number; x1: number; y1: number; t: number }
  | { op: "lift"; x: number; y: number; v: number }
  | { op: "remove"; x: number; y: number }
  | { op: "object"; uid: string; kind: ObjectKind; x: number; y: number; name?: string; blocks?: boolean; decor?: DecorKind; tree?: TreeKind; rock?: RockKind; spot?: SpotKind; text?: string; to?: { x: number; y: number }; look?: "stairs" | "gate"; sigil?: string; icon?: string }
  | { op: "building"; uid: string; x0: number; y0: number; x1: number; y1: number; door: "n" | "s" | "e" | "w"; floor?: number; name?: string; color?: string; chimney?: boolean; walls?: Building["walls"]; roof?: Building["roof"] }
  | { op: "spawn"; uid: string; kind: "npc" | "monster"; id: string; x: number; y: number; wander?: number }
  | { op: "monster"; def: MonsterDef }
  | { op: "npc"; def: OverlayNpc }
  | { op: "item"; def: (typeof ITEM_LIST)[number] }
  | { op: "quest"; def: OverlayQuest }
  | { op: "campzone"; uid: string; x0: number; y0: number; x1: number; y1: number; allow: boolean; why?: string };
/** `frame: 2`: written in the grown world (after the north); an overlay without it is from before, and is moved down with the world when it's read (northframe.ts). */
export type Overlay = { v: 1; frame?: 2; name?: string; ops: Op[] };
export const emptyOverlay = (name = "Development world"): Overlay => ({ v: 1, frame: 2, name, ops: [] });
export const LIMITS = { ops: 200_000, bytes: 4_000_000, fillTiles: 40_000 } as const;

const NUM = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const TEXT = (v: unknown, max = 80) => typeof v === "string" && v.length <= max;
const UID = (v: unknown) => typeof v === "string" && /^[a-z0-9_-]{1,40}$/i.test(v);
// (Made when first asked for: world.ts imports this module, so T isn't there yet while modules load.)
let tileSet: Set<number> | null = null; const TILES = { has: (t: number) => (tileSet ??= new Set<number>(Object.values(T))).has(t) };
/** The ops an overlay may carry, checked one by one; bad ones are dropped (and said why), so a damaged file still loads what it can. */
export function cleanOverlay(raw: unknown, why: string[] = []): Overlay {
  const out = emptyOverlay();
  if (!raw || typeof raw !== "object") { why.push("not an overlay"); return out; }
  const o = raw as Record<string, unknown>;
  if (TEXT(o.name, 80)) out.name = o.name as string;
  if (o.frame !== 2) delete out.frame;
  if (!Array.isArray(o.ops)) { why.push("no ops"); return out; }
  for (const [i, raw] of (o.ops as unknown[]).entries()) {
    if (out.ops.length >= LIMITS.ops) { why.push("too many ops"); break; }
    const op = raw as Record<string, unknown>, bad = (what: string) => { why.push(`op ${i} (${String(op?.op)}): ${what}`); };
    if (!op || typeof op !== "object") { bad("not an op"); continue; }
    const inWorld = NUM(op.x, 0, W - 1) && NUM(op.y, 0, H - 1);
    switch (op.op) {
      case "tile": if (inWorld && TILES.has(op.t as number)) out.ops.push({ op: "tile", x: op.x as number, y: op.y as number, t: op.t as number }); else bad("bad tile"); break;
      case "fill": if (NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && TILES.has(op.t as number) && ((op.x1 as number) - (op.x0 as number) + 1) * ((op.y1 as number) - (op.y0 as number) + 1) <= LIMITS.fillTiles) out.ops.push({ op: "fill", x0: op.x0 as number, y0: op.y0 as number, x1: op.x1 as number, y1: op.y1 as number, t: op.t as number }); else bad("bad fill"); break;
      case "lift": if (inWorld && NUM(op.v, 0, 8)) out.ops.push({ op: "lift", x: op.x as number, y: op.y as number, v: op.v as number }); else bad("bad lift"); break;
      case "remove": if (inWorld) out.ops.push({ op: "remove", x: op.x as number, y: op.y as number }); else bad("bad remove"); break;
      case "object": {
        if (!inWorld || !UID(op.uid) || !TEXT(op.kind, 24)) { bad("bad object"); break; }
        const entry: Extract<Op, { op: "object" }> = { op: "object", uid: op.uid as string, kind: op.kind as ObjectKind, x: op.x as number, y: op.y as number };
        if (TEXT(op.name, 60)) entry.name = op.name as string; if (typeof op.blocks === "boolean") entry.blocks = op.blocks;
        for (const key of ["decor", "tree", "rock", "spot", "look", "sigil", "icon"] as const) if (TEXT(op[key], 32)) (entry as Record<string, unknown>)[key] = op[key];
        if (TEXT(op.text, 300)) entry.text = op.text as string;
        const to = op.to as Record<string, unknown> | undefined; if (to && NUM(to.x, 0, W - 1) && NUM(to.y, 0, H - 1)) entry.to = { x: to.x as number, y: to.y as number };
        out.ops.push(entry); break;
      }
      case "building": {
        if (!UID(op.uid) || !NUM(op.x0, 0, W - 1) || !NUM(op.y0, 0, H - 1) || !NUM(op.x1, 0, W - 1) || !NUM(op.y1, 0, H - 1) || !["n", "s", "e", "w"].includes(op.door as string)) { bad("bad building"); break; }
        const entry: Extract<Op, { op: "building" }> = { op: "building", uid: op.uid as string, x0: op.x0 as number, y0: op.y0 as number, x1: op.x1 as number, y1: op.y1 as number, door: op.door as "n" | "s" | "e" | "w" };
        if (TILES.has(op.floor as number)) entry.floor = op.floor as number; if (TEXT(op.name, 60)) entry.name = op.name as string; if (TEXT(op.color, 9)) entry.color = op.color as string;
        if (typeof op.chimney === "boolean") entry.chimney = op.chimney; if (TEXT(op.walls, 12)) entry.walls = op.walls as Building["walls"]; if (TEXT(op.roof, 8)) entry.roof = op.roof as Building["roof"];
        out.ops.push(entry); break;
      }
      case "spawn": if (inWorld && UID(op.uid) && (op.kind === "npc" || op.kind === "monster") && TEXT(op.id, 48)) out.ops.push({ op: "spawn", uid: op.uid as string, kind: op.kind, id: op.id as string, x: op.x as number, y: op.y as number, ...(NUM(op.wander, 0, 40) ? { wander: op.wander as number } : {}) }); else bad("bad spawn"); break;
      case "monster": if (op.def && typeof op.def === "object" && UID((op.def as MonsterDef).id)) out.ops.push({ op: "monster", def: op.def as MonsterDef }); else bad("bad monster"); break;
      case "npc": if (op.def && typeof op.def === "object" && UID((op.def as OverlayNpc).id)) out.ops.push({ op: "npc", def: op.def as OverlayNpc }); else bad("bad npc"); break;
      case "item": if (op.def && typeof op.def === "object" && UID((op.def as { id: string }).id)) out.ops.push({ op: "item", def: op.def as (typeof ITEM_LIST)[number] }); else bad("bad item"); break;
      case "quest": {
        const d = op.def as Record<string, unknown> | undefined, lines = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every(l => TEXT(l, 300));
        if (!d || typeof d !== "object" || !UID(d.id) || !TEXT(d.name, 60) || !TEXT(d.giver, 48) || !TEXT(d.item, 48) || !NUM(d.count, 1, 1000) || !lines(d.offer) || !TEXT(d.accept, 300) || !TEXT(d.progress, 300) || !lines(d.done) || !d.rewards || typeof d.rewards !== "object") { bad("bad quest"); break; }
        const r = d.rewards as Record<string, unknown>, rewards: OverlayQuest["rewards"] = {};
        if (NUM(r.coins, 0, 1_000_000)) rewards.coins = Math.floor(r.coins as number);
        const xp = r.xp as Record<string, unknown> | undefined; if (xp && TEXT(xp.skill, 20) && NUM(xp.amount, 0, 1_000_000)) rewards.xp = { skill: xp.skill as string, amount: Math.floor(xp.amount as number) };
        if (Array.isArray(r.items)) rewards.items = (r.items as Record<string, unknown>[]).filter(e => e && TEXT(e.id, 48) && NUM(e.n, 1, 1000)).slice(0, 8).map(e => ({ id: e.id as string, n: Math.floor(e.n as number) }));
        out.ops.push({ op: "quest", def: { id: d.id as string, name: d.name as string, giver: d.giver as string, item: d.item as string, count: Math.floor(d.count as number), offer: d.offer as string[], accept: d.accept as string, progress: d.progress as string, done: d.done as string[], ...(NUM(d.points, 0, 5) ? { points: Math.floor(d.points as number) } : {}), ...(TEXT(d.difficulty, 20) ? { difficulty: d.difficulty as string } : {}), rewards } }); break;
      }
      case "campzone": if (UID(op.uid) && NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && typeof op.allow === "boolean") out.ops.push({ op: "campzone", uid: op.uid as string, x0: Math.min(op.x0 as number, op.x1 as number), y0: Math.min(op.y0 as number, op.y1 as number), x1: Math.max(op.x0 as number, op.x1 as number), y1: Math.max(op.y0 as number, op.y1 as number), allow: op.allow, ...(TEXT(op.why, 120) && op.why ? { why: op.why as string } : {}) }); else bad("bad campzone"); break;
      default: bad("unknown op");
    }
  }
  return out;
}

/**
 * Definitions an overlay adds (monsters, items; NPCs through `npcs`, the game's table, which this module can't import),
 * registered where the game looks them up. Overlay-made things are prefixed, so they can't shadow the game's own.
 */
export const DEV_PREFIX = "dev_";
export function registerDefinitions(overlay: Overlay, npcs: Record<string, unknown> | null, why: string[] = []) {
  for (const op of overlay.ops) {
    if (op.op === "monster") { if (!op.def.id.startsWith(DEV_PREFIX)) { why.push(`monster ${op.def.id}: ids of the overlay's own start with ${DEV_PREFIX}`); continue; } (MONSTERS as Record<string, MonsterDef>)[op.def.id] = op.def; }
    if (op.op === "npc") { if (!op.def.id.startsWith(DEV_PREFIX)) { why.push(`npc ${op.def.id}: ids of the overlay's own start with ${DEV_PREFIX}`); continue; } if (npcs) npcs[op.def.id] = { ...op.def, dev: true }; }
    if (op.op === "item") { if (!op.def.id.startsWith(DEV_PREFIX)) { why.push(`item ${op.def.id}: ids of the overlay's own start with ${DEV_PREFIX}`); continue; } if (!ITEM_LIST.some(item => item.id === op.def.id)) (ITEM_LIST as unknown as unknown[]).push(op.def); }
  }
}

/** The camping overrides some overlays carry, in order (camping.ts lays them over its rules). */
export const campZones = (overlays: readonly Overlay[]): CampZone[] => overlays.flatMap(overlay => overlay.ops.flatMap(op => op.op === "campzone" ? [{ x0: op.x0, y0: op.y0, x1: op.x1, y1: op.y1, allow: op.allow, ...(op.why ? { why: op.why } : {}) }] : []));

/** Where the overlay's placed things are in a world, by uid: object index, building index or spawn index. */
export type Placed = { objects: Map<string, number>; buildings: Map<string, number>; spawns: Map<string, number> };

/**
 * Apply an overlay to a live world, in place: tiles, lifts, removals, objects, buildings, spawns, then the indexes and
 * the heights rebuilt. Returns where things landed, and a list of what couldn't be done (an object on an occupied
 * tile, a building off the overworld). The world's `lift`/`raise` (kept from generation or the bake) make the heights.
 */
export function applyOverlay(world: World, overlay: Overlay, seed: number, why: string[] = [], npcs: Record<string, unknown> | null = null): Placed {
  const placed: Placed = { objects: new Map(), buildings: new Map(), spawns: new Map() };
  const index = (x: number, y: number) => y * W + x, lift = world.lift ?? (world.lift = new Float32Array(W * H)), raise = world.raise ?? (world.raise = new Float32Array(W * H));
  let tilesChanged = false, objectsChanged = false, buildingsChanged = false;
  const removeAt = (x: number, y: number) => {
    const id = world.objectAt[index(x, y)];
    if (id >= 0) { world.objects[id] = { ...world.objects[id], kind: "decor", decor: "flowers", blocks: false, name: "__removed" }; world.objectAt[index(x, y)] = -1; objectsChanged = true; }
  };
  for (const op of overlay.ops) {
    if (op.op === "tile") { world.tiles[index(op.x, op.y)] = op.t; tilesChanged = true; }
    else if (op.op === "fill") { for (let y = Math.min(op.y0, op.y1); y <= Math.max(op.y0, op.y1); y++) for (let x = Math.min(op.x0, op.x1); x <= Math.max(op.x0, op.x1); x++) world.tiles[index(x, y)] = op.t; tilesChanged = true; }
    else if (op.op === "lift") { lift[index(op.x, op.y)] = op.v; tilesChanged = true; }
    else if (op.op === "remove") removeAt(op.x, op.y);
    else if (op.op === "object") {
      if (world.objectAt[index(op.x, op.y)] >= 0) { why.push(`${op.uid}: the tile ${op.x},${op.y} is taken`); continue; }
      const name = op.name ?? (op.kind === "decor" && op.decor ? DECOR_NAMES[op.decor] : op.kind === "tree" && op.tree ? TREE_NAMES[op.tree as TreeKind] : op.kind === "rock" ? "Rocks" : op.kind[0].toUpperCase() + op.kind.slice(1));
      const object: WorldObject = { id: world.objects.length, kind: op.kind, x: op.x, y: op.y, name, blocks: op.blocks ?? (op.kind !== "spot" && op.kind !== "ladder" && !(op.kind === "decor" && (op.decor === "flowers" || op.decor === "lily" || op.decor === "reeds"))) };
      for (const key of ["decor", "tree", "rock", "spot", "text", "to", "look", "sigil", "icon"] as const) if (op[key] !== undefined) (object as Record<string, unknown>)[key] = op[key];
      world.objects.push(object); world.objectAt[index(op.x, op.y)] = object.id; placed.objects.set(op.uid, object.id); objectsChanged = true;
    }
    else if (op.op === "building") {
      const x0 = Math.min(op.x0, op.x1), x1 = Math.max(op.x0, op.x1), y0 = Math.min(op.y0, op.y1), y1 = Math.max(op.y0, op.y1), floor = op.floor ?? T.WOOD;
      if (x1 - x0 < 2 || y1 - y0 < 2) { why.push(`${op.uid}: a building needs three tiles each way`); continue; }
      if (y1 >= OVERWORLD_H && y0 < OVERWORLD_H) { why.push(`${op.uid}: a building can't straddle the overworld's edge`); continue; }
      const building: Building = { x0, y0, x1, y1, roof: op.roof ?? "gable", color: op.color ?? ROOF_COLORS[world.buildings.length % ROOF_COLORS.length], chimney: op.chimney ?? false, name: op.name ?? "", walls: op.walls ?? (floor === T.STONE ? "stone" : "timber") };
      world.buildings.push(building); placed.buildings.set(op.uid, world.buildings.length - 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { world.tiles[index(x, y)] = x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : floor; removeAt(x, y); }
      const mx = Math.floor((x0 + x1) / 2), my = Math.floor((y0 + y1) / 2), gap = (x: number, y: number) => { world.tiles[index(x, y)] = floor; };
      if (op.door === "s") { gap(mx, y1); gap(mx + 1, y1); } if (op.door === "n") { gap(mx, y0); gap(mx + 1, y0); }
      if (op.door === "e") { gap(x1, my); gap(x1, my + 1); } if (op.door === "w") { gap(x0, my); gap(x0, my + 1); }
      tilesChanged = true; buildingsChanged = true;
    }
    else if (op.op === "spawn") {
      const known = op.kind === "npc" ? (npcs ? !!npcs[op.id] : true) : !!MONSTERS[op.id];
      if (!known) { why.push(`${op.uid}: no ${op.kind} called ${op.id}`); continue; }
      world.spawns.push({ kind: op.kind, id: op.id, x: op.x, y: op.y, ...(op.wander ? { wander: op.wander } : {}) }); placed.spawns.set(op.uid, world.spawns.length - 1);
    }
  }
  if (objectsChanged) world.objectAt = indexObjects(world.objects);
  if (buildingsChanged) world.buildingAt = indexBuildings(world.buildings);
  if (tilesChanged) world.heights = buildHeights(world.tiles, seed, lift, raise);
  return placed;
}

/** Whether a tile can be walked on in a world (terrain and blocking objects; no creatures). */
export const walkableAt = (world: World, x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && WALKABLE.has(world.tiles[y * W + x]) && (world.objectAt[y * W + x] < 0 || !world.objects[world.objectAt[y * W + x]].blocks);
/** Every tile on foot from a start (no corner cutting), as a bitmap; the editor's reachability check. */
export function reachableFrom(world: World, sx: number, sy: number): Uint8Array {
  const seen = new Uint8Array(W * H), queue = [sy * W + sx]; if (!walkableAt(world, sx, sy)) return seen; seen[queue[0]] = 1;
  while (queue.length) {
    const i = queue.pop()!, x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !walkableAt(world, nx, ny)) continue;
      if (dx && dy && (!walkableAt(world, x + dx, y) || !walkableAt(world, x, y + dy))) continue;
      seen[ny * W + nx] = 1; queue.push(ny * W + nx);
    }
  }
  return seen;
}
/** What's wrong with an overlay's placements in a world: things nobody can reach on foot from the spawn (ladders link levels, so each level is checked from its first reachable tile). */
export function validatePlacements(world: World, overlay: Overlay, placed: Placed): string[] {
  const out: string[] = [], from = reachableFrom(world, world.places.spawn.x, world.places.spawn.y);
  const near = (x: number, y: number) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && from[(y + dy) * W + x + dx]);
  for (const op of overlay.ops) {
    if (op.op === "object" && placed.objects.has(op.uid) && op.y < FLOOR_Y && !near(op.x, op.y)) out.push(`${op.name ?? op.kind} at ${op.x},${op.y} (${op.uid}) can't be reached from the spawn`);
    if (op.op === "spawn" && placed.spawns.has(op.uid) && !near(op.x, op.y)) out.push(`${op.kind} ${op.id} at ${op.x},${op.y} (${op.uid}) can't be reached from the spawn`);
    if (op.op === "building" && placed.buildings.has(op.uid)) { const b = world.buildings[placed.buildings.get(op.uid)!]; let door = false; for (let y = b.y0; y <= b.y1 && !door; y++) for (let x = b.x0; x <= b.x1; x++) if ((x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1) && walkableAt(world, x, y) && near(x, y)) { door = true; break; } if (!door) out.push(`building ${op.name ?? op.uid}: its door can't be reached from the spawn`); }
  }
  return out;
}
