/**
 * Camping (Wayfaring): a camp of your own in the wild, from a camp kit (the Wayfarer's Fieldcraft family, smithed):
 * a tent and a fire, where you rest, cook, and, with the better gear and the Wayfaring for it, wake up again when you
 * fall. The rules of where a camp may stand are one table (CAMP_RULES), with places that may override them; a camp
 * that was invalidated, packed or lost sends you back to the fountain, and says so. Setting up earns Wayfaring XP once
 * in a while, not every time. A field altar (moonsilver, from the same family) takes bones at the camp for less than a
 * standing altar gives.
 */
import { ITEM_LIST, item } from "./data.ts";
import { addXp, freeSlots, has, level, maxHp, message, sound, take, type Game, type Player } from "./state.ts";
import { OVERWORLD_H, T, W, isUnderground, regionAt, terrainAt, type World, type WorldObject } from "./world.ts";
import { inRingBuilding } from "./world.ts";
import { campZones, type CampZone, type Overlay } from "./overlay.ts";
import { OVERLAYS } from "./overlays/index.ts";

export type Camp = { x: number; y: number; tier: number; respawn: boolean; altar: boolean };
/** The Fieldcraft family, by what each piece is for: the kit makes a camp; the rest raise its tier (and have their own uses). */
export const FIELDCRAFT: Record<string, { power: number; what: string }> = {
  pewter_camp_kit: { power: 1, what: "pegs, poles and a bedroll: a camp" }, blackiron_field_stove: { power: 2, what: "a stove: the camp's fire never goes out" },
  ashsteel_camp_lantern: { power: 3, what: "a lantern: a camp you can wake up at" }, moonsilver_field_altar: { power: 4, what: "a field altar, set up at the camp" },
  glimmer_expedition_frame: { power: 5, what: "a frame: a quarter of your load carried for you" }, rarite_wayfarers_compass: { power: 6, what: "a compass: running costs a tenth less" },
};
/**
 * Where a camp may stand. Soft ground only (grass, sand, snow, gravel, ash); out of buildings and underground; not in
 * the Ring; well away from banks, altars and the Realm's workstations (a camp is for the wild, not the town square);
 * away from ladders (no camping on a dungeon's doorstep); not in the dangerous regions (the dragons' and the dead's);
 * and nowhere an override forbids. Overrides allow or forbid rectangles regardless (the editor fills them).
 */
export const CAMP_RULES = {
  terrains: new Set<number>([T.GRASS, T.DARK_GRASS, T.SAND, T.SNOW, T.GRAVEL, T.ASH]),
  fromTown: 9, fromLadder: 6, danger: 4, wayfaring: 5, respawnWayfaring: 25, respawnTier: 3,
  /** Wayfaring XP for setting up, and how long (ticks played) before it's earned again. */
  xp: 45, xpEvery: 3000,
  overrides: campZones(OVERLAYS) as CampZone[],
};
/** The development world's zones laid over the promoted ones (devlayer.ts, on every rebuild); null takes them away. */
export function setDevCampZones(overlay: Overlay | null) { CAMP_RULES.overrides = [...campZones(OVERLAYS), ...(overlay ? campZones([overlay]) : [])]; }
const TOWN_KINDS = new Set(["bank", "altar", "furnace", "anvil", "range", "wheel", "still", "stall", "mill", "dock", "sigil_altar"]);
/** Why a camp can't stand at a tile, or null when it can. */
export function campAllowed(game: Game, x: number, y: number): string | null {
  const world = game.world;
  const override = CAMP_RULES.overrides.find(o => x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1);
  if (override) return override.allow ? null : override.why ?? "Camping isn't allowed here.";
  if (isUnderground(y) || y >= OVERWORLD_H) return "There's no sky to camp under.";
  if (!CAMP_RULES.terrains.has(terrainAt(world, x, y))) return "The ground here is no good for a tent: find grass, sand, snow, gravel or ash.";
  if (world.buildingAt[y * W + x]) return "Not indoors.";
  if (inRingBuilding(x, y)) return "Not in the Ring.";
  const region = regionAt(world, x, y);
  if (region.danger >= CAMP_RULES.danger) return `Nobody sleeps in ${region.name}.`;
  const near = (kinds: Set<string>, reach: number) => world.objects.some(o => o.name !== "__removed" && kinds.has(o.kind) && Math.abs(o.x - x) <= reach && Math.abs(o.y - y) <= reach);
  if (near(TOWN_KINDS, CAMP_RULES.fromTown)) return "Too close to town: a camp is for the wild.";
  if (near(new Set(["ladder"]), CAMP_RULES.fromLadder)) return "Too close to a way underground.";
  const spawn = world.places.spawn; if (Math.hypot(spawn.x - x, spawn.y - y) < 20) return "Not here, by the fountain.";
  for (const [dx, dy] of [[0, 0], [1, 0]]) { const i = (y + dy) * W + x + dx; if (world.objectAt[i] >= 0) return "There's something in the way."; if (!CAMP_RULES.terrains.has(world.tiles[i])) return "The fire needs ground beside the tent."; }
  if (game.monsters.some(m => !m.dead && m.def.aggressive && Math.hypot(m.x - x, m.y - y) < 6)) return "Not with that about.";
  return null;
}
/** The best Fieldcraft piece carried (the camp's tier), or 0 with none. */
export const fieldcraftTier = (player: Player) => Math.max(0, ...player.inventory.map(slot => slot ? FIELDCRAFT[slot.id]?.power ?? 0 : 0));
export const campObjects = new WeakMap<World, number[]>();
const removeObject = (world: World, id: number) => { const o = world.objects[id]; if (!o || o.name === "__removed") return; world.objects[id] = { ...o, kind: "decor", decor: "flowers", blocks: false, name: "__removed" }; world.objectAt[o.y * W + o.x] = -1; };
const addObject = (world: World, object: Omit<WorldObject, "id">) => { const full = { ...object, id: world.objects.length } as WorldObject; world.objects.push(full); world.objectAt[full.y * W + full.x] = full.id; return full.id; };
/** Paint the player's camp into the world (at the start, after a rebuild, and whenever it changes): the tent, the fire, the altar if set, and the fire you cook on. */
export function applyCamp(game: Game) {
  const world = game.world, camp = game.player.camp, previous = campObjects.get(world) ?? [];
  for (const id of previous) removeObject(world, id);
  game.fires = game.fires.filter(fire => fire.expires !== Infinity);
  campObjects.set(world, []);
  if (!camp) { game.worldVersion = (game.worldVersion ?? 0) + 1; return; }
  const ids: number[] = [];
  ids.push(addObject(world, { kind: "decor", decor: "tent", x: camp.x, y: camp.y, blocks: true, name: "Your tent", text: "camp" }));
  ids.push(addObject(world, { kind: "decor", decor: "campfire", x: camp.x + 1, y: camp.y, blocks: false, name: "Your campfire", text: "camp_fire" }));
  game.fires.push({ uid: game.nextUid++, x: camp.x + 1, y: camp.y, expires: Infinity });
  if (camp.altar) ids.push(addObject(world, { kind: "altar", x: camp.x, y: camp.y + 1, blocks: true, name: "Field altar", text: "field" }));
  campObjects.set(world, ids); game.worldVersion = (game.worldVersion ?? 0) + 1;
}
/** Set up camp where you stand, with the kit in your pack. */
export function setUpCamp(game: Game) {
  const player = game.player;
  if (player.camp) { message(game, `You have a camp already, at ${player.camp.x},${player.camp.y}. Pack it up first.`, "warn"); return false; }
  if (!has(player, "pewter_camp_kit")) { message(game, "You need a camp kit (smithed from pewter) to make a camp.", "warn"); return false; }
  if (level(game, "agility") < CAMP_RULES.wayfaring) { message(game, `You need a Wayfaring level of ${CAMP_RULES.wayfaring} to pitch a tent that stays up.`, "warn"); return false; }
  const why = campAllowed(game, player.x, player.y);
  if (why) { message(game, why, "warn"); return false; }
  const tier = fieldcraftTier(player);
  player.camp = { x: player.x, y: player.y, tier, respawn: false, altar: false };
  // You stand beside it, not in it.
  player.x = player.x; player.prev = { x: player.x, y: player.y };
  for (const [dx, dy] of [[0, 1], [-1, 0], [0, -1], [-1, 1], [1, 1]]) { const nx = player.x + dx, ny = player.y + dy; const i = ny * W + nx; if (nx >= 0 && ny >= 0 && CAMP_RULES.terrains.has(game.world.tiles[i]) && game.world.objectAt[i] < 0) { player.x = nx; player.y = ny; player.prev = { x: nx, y: ny }; break; } }
  applyCamp(game);
  const earned = game.playTicks - player.campXpAt >= CAMP_RULES.xpEvery;
  if (earned) { player.campXpAt = game.playTicks; addXp(game, "agility", CAMP_RULES.xp + 15 * tier); }
  message(game, `You pitch your tent and get a fire going${tier >= 2 ? " on the stove" : ""}.${earned ? "" : " (Wayfaring teaches you nothing new from pitching it again so soon.)"}`); sound(game, "pickup");
  if (tier >= CAMP_RULES.respawnTier && level(game, "agility") >= CAMP_RULES.respawnWayfaring) message(game, "With the lantern lit, this camp can be where you wake up: use the tent.", "info");
  return true;
}
/** Pack the camp up (never while it's the place you'd wake up: unmake that first, so it's never silently gone). */
export function packUpCamp(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return false;
  if (camp.altar && !freeSlots(player)) { message(game, "You need a free slot to take the field altar back.", "warn"); return false; }
  if (camp.altar) { player.inventory[player.inventory.findIndex(slot => !slot)] = { id: "moonsilver_field_altar", n: 1 }; }
  player.camp = null; applyCamp(game);
  message(game, camp.respawn ? "You pack up the camp. You'd wake by the Friendhollow fountain now." : "You pack up the camp."); sound(game, "pickup");
  return true;
}
/** Rest at the camp: health and run energy back, and, with a stove or better, some Faith. */
export function restAtCamp(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return;
  player.hp = maxHp(player); player.energy = 100; if (camp.tier >= 2) player.prayer = Math.max(player.prayer, Math.min(player.prayer + 10, level(game, "prayer")));
  message(game, "You rest by the fire. You feel ready for the road again."); sound(game, "pickup");
}
/** Make the camp the place you wake up, or unmake it. */
export function toggleRespawn(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return;
  if (camp.respawn) { camp.respawn = false; message(game, "You'd wake by the Friendhollow fountain again."); return; }
  if (camp.tier < CAMP_RULES.respawnTier) { message(game, "A camp you can wake up at needs a lantern (ashsteel, from the Fieldcraft family) carried when it's pitched.", "warn"); return; }
  if (level(game, "agility") < CAMP_RULES.respawnWayfaring) { message(game, `You need a Wayfaring level of ${CAMP_RULES.respawnWayfaring} to make a camp your waking place.`, "warn"); return; }
  camp.respawn = true; message(game, "If you fall, you'll wake here, by your fire.", "info");
}
/** Where you wake: the camp, if it's yours to wake at and still stands where you can stand; otherwise null (and a word why). */
export function campRespawn(game: Game): { x: number; y: number } | null {
  const player = game.player, camp = player.camp;
  if (!camp || !camp.respawn) return null;
  const ids = campObjects.get(game.world) ?? [], tent = ids.map(id => game.world.objects[id]).find(o => o && o.name === "Your tent");
  const why = !tent ? "your camp is gone" : campAllowed(game, camp.x, camp.y) && !CAMP_RULES.overrides.length ? null : null;
  void why;
  if (!tent) { player.camp = null; message(game, "Your camp is gone: you wake by the Friendhollow fountain.", "warn"); return null; }
  for (const [dx, dy] of [[0, 1], [-1, 0], [1, 1], [0, -1], [-1, 1]]) { const x = camp.x + dx, y = camp.y + dy, i = y * W + x; if (CAMP_RULES.terrains.has(game.world.tiles[i]) && game.world.objectAt[i] < 0) return { x, y }; }
  message(game, "There's no room to wake at your camp: you wake by the Friendhollow fountain.", "warn"); return null;
}
/** Set the field altar up at the camp (beside the tent), from your pack. */
export function setUpFieldAltar(game: Game, slotIndex: number) {
  const player = game.player, camp = player.camp, slot = player.inventory[slotIndex];
  if (!slot || slot.id !== "moonsilver_field_altar") return;
  if (!camp) { message(game, "A field altar stands at a camp: pitch yours first.", "warn"); return; }
  if (camp.altar) { message(game, "Your camp has its altar already.", "warn"); return; }
  if (Math.hypot(player.x - camp.x, player.y - camp.y) > 3) { message(game, "Go to your camp to set it up.", "warn"); return; }
  const i = (camp.y + 1) * W + camp.x;
  if (!CAMP_RULES.terrains.has(game.world.tiles[i]) || game.world.objectAt[i] >= 0) { message(game, "There's no room beside the tent for it.", "warn"); return; }
  take(player, "moonsilver_field_altar", 1); camp.altar = true; applyCamp(game);
  message(game, "You set the field altar beside your tent. Bones offered here give less than at a standing altar."); sound(game, "pray");
}
/** What a camp item says of itself (the Fieldcraft family's own line, after Examine). */
export const fieldcraftText = (id: string) => FIELDCRAFT[id] ? `Wayfarer's fieldcraft: ${FIELDCRAFT[id].what}.` : null;
/** The Fieldcraft family's carried effects: a quarter of the load off with the frame, a tenth off running with the compass. */
export const carriesFrame = (player: Player) => has(player, "glimmer_expedition_frame");
export const carriesCompass = (player: Player) => has(player, "rarite_wayfarers_compass");
void ITEM_LIST; void item;
