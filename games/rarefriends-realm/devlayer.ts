/**
 * The development layer inside the game (the host's editor is host/editor.tsx; the overlay is overlay.ts): when the
 * frame is opened as `game.html?dev=1`, the pristine world is kept as it came from the bake, and an overlay from the
 * host is laid over a fresh copy of it, so every edit (and every undo) is the bake plus the overlay, never a stack of
 * edits on edits. The public host never opens the frame this way, and never sends these messages.
 */
import { ITEM_LIST, MONSTERS, ROCKS, SKILLS, TREES } from "./data.ts";
import { NPCS, QUESTS, registerDevQuest } from "./content.ts";
import { applyCamp, setDevCampZones } from "./camping.ts";
import { DECOR_NAMES, T, W, WORLD_SEED, regionAt, type World } from "./world.ts";
import { applyOverlay, registerDefinitions, validatePlacements, type Overlay, type Placed } from "./overlay.ts";
import { realmWorld, setSharedWorld, spawnCreatures, type Game } from "./state.ts";
import { applyHome } from "./housing.ts";
import { resetLighting } from "./lighting.ts";
import type { DevCatalog, DevPick } from "./roster.ts";

export const isDevFrame = () => typeof location !== "undefined" && new URLSearchParams(location.search).get("dev") === "1";
let pristine: World | null = null;
/** A copy of a world's own arrays and lists (objects and buildings copied one by one; the rest shared, being immutable). */
function cloneWorld(world: World): World {
  return { ...world, tiles: new Uint8Array(world.tiles), region: new Uint8Array(world.region), objects: world.objects.map(o => ({ ...o })), objectAt: new Int32Array(world.objectAt), spawns: world.spawns.map(s => ({ ...s })),
    buildings: world.buildings.map(b => ({ ...b })), buildingAt: new Uint16Array(world.buildingAt), heights: new Float32Array(world.heights), lift: world.lift ? new Float32Array(world.lift) : undefined, raise: world.raise ? new Float32Array(world.raise) : undefined };
}
/** Keep the world as it came (before the player's home or any overlay touches it). Called once, at the start, in a dev frame. */
export function keepPristine() { if (!pristine) pristine = cloneWorld(realmWorld()); }
/** Where the overlay's things landed in the current world, by uid (for the editor's inspector). */
export let placed: Placed = { objects: new Map(), buildings: new Map(), spawns: new Map() };
/** Lay an overlay over a fresh copy of the pristine world and make it the game's: what couldn't be done, and what can't be reached. */
export function rebuildWorld(game: Game, overlay: Overlay): { problems: string[]; unreachable: string[] } {
  keepPristine();
  const world = cloneWorld(pristine!), problems: string[] = [];
  registerDefinitions(overlay, NPCS as Record<string, unknown>, problems);
  for (const op of overlay.ops) if (op.op === "quest") registerDevQuest(op.def, problems);
  // (A quest taken out of the overlay is taken out of the list, and out of the player's log.)
  for (const quest of [...QUESTS]) if (quest.dev && !overlay.ops.some(op => op.op === "quest" && op.def.id === quest.id)) { (QUESTS as unknown[]).splice(QUESTS.indexOf(quest), 1); delete game.player.quests[quest.id]; }
  setDevCampZones(overlay);
  placed = applyOverlay(world, overlay, WORLD_SEED, problems, NPCS as Record<string, unknown>);
  const unreachable = validatePlacements(world, overlay, placed);
  setSharedWorld(world); game.world = world;
  spawnCreatures(game); applyHome(game); applyCamp(game);
  game.worldVersion = (game.worldVersion ?? 0) + 1; resetLighting(world);
  return { problems, unreachable };
}
/** What the editor can place and paint: the game's own catalogues, by id and name. */
export function catalog(game: Game): DevCatalog {
  const uniq = (list: string[]) => [...new Set(list)];
  return {
    tiles: { ...T }, decor: Object.keys(DECOR_NAMES), trees: Object.keys(TREES), rocks: Object.keys(ROCKS), spots: ["net", "bait", "lure", "cage", "harpoon", "deep"],
    npcs: Object.values(NPCS).map(n => ({ id: n.id, name: n.name })), monsters: Object.values(MONSTERS).map(m => ({ id: m.id, name: m.name, level: m.level, art: m.art })),
    items: ITEM_LIST.map(i => ({ id: i.id, name: i.name })), skills: [...SKILLS], quests: QUESTS.map(q => ({ id: q.id, name: q.name })),
    kinds: uniq(["decor", "tree", "rock", "spot", "furnace", "anvil", "range", "altar", "bank", "ladder", "sign", "well", "chest", ...game.world.objects.map(o => o.kind)]),
    spawn: { ...game.world.places.spawn },
  };
}
/** What's under a tile, for the editor's inspector. */
export function pick(game: Game, x: number, y: number, overlay: Overlay): DevPick {
  const world = game.world, i = y * W + x, id = world.objectAt[i], object = id >= 0 ? world.objects[id] : null;
  const uid = object ? [...placed.objects.entries()].find(([, index]) => index === id)?.[0] : undefined;
  const b = world.buildingAt[i] ? world.buildings[world.buildingAt[i] - 1] : null, bindex = world.buildingAt[i] - 1;
  void overlay;
  return { x, y, tile: world.tiles[i], lift: world.lift?.[i] ?? 0, object: object ? { id, kind: object.kind, name: object.name, ...(uid ? { uid } : {}) } : null, building: b ? { index: bindex, name: b.name } : null, region: regionAt(world, x, y).name };
}
