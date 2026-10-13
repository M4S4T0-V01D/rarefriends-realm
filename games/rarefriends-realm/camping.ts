/**
 * Camping (Wayfaring): a camp of your own in the wild, from a camp kit (the Wayfarer's Fieldcraft family, smithed):
 * a tent and a fire, where you rest, cook, and, with the better gear and the Wayfaring for it, wake up again when you
 * fall. The rules of where a camp may stand are one table (CAMP_RULES), with places that may override them; a camp
 * that was invalidated, packed or lost sends you back to the fountain, and says so. Setting up earns Wayfaring XP once
 * in a while, not every time. A field altar (moonsilver, from the same family) takes bones at the camp for less than a
 * standing altar gives. The forged metals grow the camp further: a cache (frostsilver) that keeps twelve things while the
 * camp stands, a brazier (gloomsteel) whose fire burns hot (nothing cooked on it burns, resting cures poison, you mend
 * twice as fast beside it), and a waystone (wyrmscale) that walks you back to your fire from anywhere above ground. At
 * the tent you sleep (a full rest and Wayfaring XP, once in a while); at the fire you tend it (Firemaking XP). Every
 * region you first camp in is a new sky: Wayfaring XP, and the trail log (player.camps) remembers.
 */
import { ITEM_LIST, item } from "./data.ts";
import { addXp, freeSlots, give, has, level, maxHp, message, sound, take, type Game, type Player, type Slot } from "./state.ts";
import { OVERWORLD_H, T, W, isUnderground, regionAt, terrainAt, type World, type WorldObject } from "./world.ts";
import { inRingBuilding } from "./world.ts";
import { campZones, type CampZone, type Overlay } from "./overlay.ts";
import { OVERLAYS } from "./overlays/index.ts";

export type Camp = { x: number; y: number; tier: number; respawn: boolean; altar: boolean; /** The cache's slots once it's set up (null without one). */ cache?: (Slot | null)[] | null; /** Pitched with the brazier, the waystone, carried. */ brazier?: boolean; waystone?: boolean };
export const CACHE_SLOTS = 12;
/** The Fieldcraft family, by what each piece is for: the kit makes a camp; the rest raise its tier (and have their own uses). */
export const FIELDCRAFT: Record<string, { power: number; what: string }> = {
  pewter_camp_kit: { power: 1, what: "pegs, poles and a bedroll: a camp" }, blackiron_field_stove: { power: 2, what: "a stove: the camp's fire never goes out" },
  ashsteel_camp_lantern: { power: 3, what: "a lantern: a camp you can wake up at" }, moonsilver_field_altar: { power: 4, what: "a field altar, set up at the camp" },
  glimmer_expedition_frame: { power: 5, what: "a frame: a quarter of your load carried for you" }, rarite_wayfarers_compass: { power: 6, what: "a compass: running costs a tenth less" },
  frostsilver_camp_cache: { power: 7, what: "a cache: twelve things kept at the camp" }, gloomsteel_camp_brazier: { power: 8, what: "a brazier: a fire that burns hot" }, wyrmscale_waystone: { power: 9, what: "a waystone: the way back to your fire" },
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
  /** The brazier's tier and the waystone's (and the Wayfaring to walk the way), sleeping's XP and how often, tending's XP and how often, a first camp under a new sky, the waystone's rest between walks. */
  brazierTier: 8, waystoneTier: 9, waystoneWayfaring: 50, sleepXp: 60, sleepEvery: 1500, tendXp: 12, tendEvery: 100, newSkyXp: 120, waystoneEvery: 600,
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
  ids.push(addObject(world, { kind: "decor", decor: camp.brazier ? "hearth" : "campfire", x: camp.x + 1, y: camp.y, blocks: false, name: camp.brazier ? "Your brazier" : "Your campfire", text: "camp_fire" }));
  game.fires.push({ uid: game.nextUid++, x: camp.x + 1, y: camp.y, expires: Infinity });
  if (camp.altar) ids.push(addObject(world, { kind: "altar", x: camp.x, y: camp.y + 1, blocks: true, name: "Field altar", text: "field" }));
  if (camp.cache) ids.push(addObject(world, { kind: "decor", decor: "chest", x: camp.x + 1, y: camp.y + 1, blocks: true, name: "Camp cache", text: "camp_cache" }));
  if (camp.waystone) ids.push(addObject(world, { kind: "decor", decor: "obelisk", x: camp.x - 1, y: camp.y + 1, blocks: true, name: "Your waystone", text: "camp_waystone" }));
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
  const tier = fieldcraftTier(player), region = regionAt(game.world, player.x, player.y);
  player.camp = { x: player.x, y: player.y, tier, respawn: false, altar: false, cache: null, brazier: has(player, "gloomsteel_camp_brazier"), waystone: has(player, "wyrmscale_waystone") };
  // The trail log: a first camp under this region's sky is worth something.
  const first = !player.camps[region.id]; player.camps[region.id] = (player.camps[region.id] ?? 0) + 1;
  // You stand beside it, not in it.
  player.x = player.x; player.prev = { x: player.x, y: player.y };
  for (const [dx, dy] of [[0, 1], [-1, 0], [0, -1], [-1, 1], [1, 1]]) { const nx = player.x + dx, ny = player.y + dy; const i = ny * W + nx; if (nx >= 0 && ny >= 0 && CAMP_RULES.terrains.has(game.world.tiles[i]) && game.world.objectAt[i] < 0) { player.x = nx; player.y = ny; player.prev = { x: nx, y: ny }; break; } }
  applyCamp(game);
  const earned = game.playTicks - player.campXpAt >= CAMP_RULES.xpEvery;
  if (earned) { player.campXpAt = game.playTicks; addXp(game, "agility", CAMP_RULES.xp + 15 * tier); }
  message(game, `You pitch your tent and get a fire going${player.camp.brazier ? " in the brazier" : tier >= 2 ? " on the stove" : ""}.${earned ? "" : " (Wayfaring teaches you nothing new from pitching it again so soon.)"}`); sound(game, "pickup");
  if (first) { addXp(game, "agility", CAMP_RULES.newSkyXp, { raw: true }); message(game, `Your first camp under ${region.name}'s sky. The trail log remembers it: ${Object.keys(player.camps).length} ${Object.keys(player.camps).length === 1 ? "region" : "regions"} camped in.`, "quest"); }
  if (player.camp.waystone) message(game, "The waystone remembers this fire: Walk-the-way, from anywhere above ground, brings you back to it.", "info");
  if (tier >= CAMP_RULES.respawnTier && level(game, "agility") >= CAMP_RULES.respawnWayfaring) message(game, "With the lantern lit, this camp can be where you wake up: use the tent.", "info");
  return true;
}
/** Pack the camp up (never while it's the place you'd wake up: unmake that first, so it's never silently gone). */
export function packUpCamp(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return false;
  const kept = (camp.cache ?? []).filter((slot): slot is Slot => !!slot);
  if (freeSlots(player) < (camp.altar ? 1 : 0) + (camp.cache ? 1 : 0) + kept.length) { message(game, `You need ${(camp.altar ? 1 : 0) + (camp.cache ? 1 : 0) + kept.length} free slots to take the camp's things back.`, "warn"); return false; }
  if (camp.altar) { player.inventory[player.inventory.findIndex(slot => !slot)] = { id: "moonsilver_field_altar", n: 1 }; }
  if (camp.cache) { player.inventory[player.inventory.findIndex(slot => !slot)] = { id: "frostsilver_camp_cache", n: 1 }; for (const slot of kept) give(player, slot.id, slot.n); }
  player.camp = null; applyCamp(game);
  message(game, camp.respawn ? "You pack up the camp. You'd wake by the Friendhollow fountain now." : "You pack up the camp."); sound(game, "pickup");
  return true;
}
/** Rest at the camp: health and run energy back, and, with a stove or better, some Faith. */
export function restAtCamp(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return;
  player.hp = maxHp(player); player.energy = 100; if (camp.tier >= 2) player.prayer = Math.max(player.prayer, Math.min(player.prayer + 10, level(game, "prayer")));
  if (camp.brazier && player.poison) { player.poison = null; message(game, "The brazier's heat sweats the poison out of you."); }
  message(game, "You rest by the fire. You feel ready for the road again."); sound(game, "pickup");
}
/** Sleep at the tent: everything a rest gives, and Wayfaring XP once in a while (a night under the sky is worth something). */
export function sleepAtCamp(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return;
  restAtCamp(game);
  const earned = game.playTicks - player.campSleptAt >= CAMP_RULES.sleepEvery;
  if (earned) { player.campSleptAt = game.playTicks; addXp(game, "agility", CAMP_RULES.sleepXp + 10 * camp.tier, { raw: true }); }
  message(game, earned ? "You sleep under the sky and wake with the light. The road taught you something." : "You sleep a while. Nothing new in it; the road is the teacher."); sound(game, "pickup");
}
/** Tend the fire: Firemaking XP now and then (the stove's and the brazier's never go out, but they still like tending). */
export function tendFire(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return;
  if (game.playTicks - player.campTendAt < CAMP_RULES.tendEvery) { message(game, "The fire's burning well enough."); return; }
  player.campTendAt = game.playTicks; addXp(game, "firemaking", CAMP_RULES.tendXp + 2 * camp.tier, { raw: true });
  message(game, camp.brazier ? "You feed the brazier. It roars." : "You feed the fire and settle the logs."); sound(game, "pickup");
}
/** Whether a fire is the camp's own (and the camp has a brazier): nothing cooked on it burns. */
export function brazierFire(game: Game, uid: number) { return !!game.player.camp?.brazier && game.fires.some(fire => fire.uid === uid && fire.expires === Infinity); }
/** Beside the brazier (within four tiles of the camp), you mend twice as fast. */
export function byBrazier(game: Game) { const camp = game.player.camp; return !!camp?.brazier && Math.hypot(game.player.x - camp.x, game.player.y - camp.y) <= 4; }
/** Set the cache up at the camp (beside the fire), from your pack. */
export function setUpCache(game: Game, slotIndex: number) {
  const player = game.player, camp = player.camp, slot = player.inventory[slotIndex];
  if (!slot || slot.id !== "frostsilver_camp_cache") return;
  if (!camp) { message(game, "A camp cache stands at a camp: pitch yours first.", "warn"); return; }
  if (camp.cache) { message(game, "Your camp has its cache already.", "warn"); return; }
  if (Math.hypot(player.x - camp.x, player.y - camp.y) > 3) { message(game, "Go to your camp to set it up.", "warn"); return; }
  const i = (camp.y + 1) * W + camp.x + 1;
  if (!CAMP_RULES.terrains.has(game.world.tiles[i]) || game.world.objectAt[i] >= 0) { message(game, "There's no room beside the fire for it.", "warn"); return; }
  take(player, "frostsilver_camp_cache", 1); camp.cache = Array(CACHE_SLOTS).fill(null); applyCamp(game);
  message(game, "You set the cache beside the fire. Twelve things keep there while the camp stands; pack up, and they come with the kit."); sound(game, "pickup");
}
/** The cache's slots, when you're at a camp that has one and near enough to reach it; otherwise null. */
export function cacheAt(game: Game): (Slot | null)[] | null {
  const player = game.player, camp = player.camp;
  if (!camp?.cache || Math.hypot(player.x - camp.x, player.y - camp.y) > 3) return null;
  return camp.cache;
}
/** Put a pack slot in the cache (stackables join their kind). */
export function stash(game: Game, slotIndex: number): boolean {
  const player = game.player, slot = player.inventory[slotIndex], cache = cacheAt(game);
  if (!slot || !cache) { if (slot && !cache) message(game, "The cache is at your camp: stash things there.", "warn"); return false; }
  const same = item(slot.id).stackable ? cache.find(kept => kept?.id === slot.id) : null;
  if (same) same.n = Math.min(2_147_483_647, same.n + slot.n);
  else { const free = cache.indexOf(null); if (free < 0) { message(game, "The cache is full.", "warn"); return false; } cache[free] = { ...slot }; }
  player.inventory[slotIndex] = null; sound(game, "click");
  return true;
}
/** Take a cache slot back into your pack (as much as fits). */
export function unstash(game: Game, index: number): boolean {
  const player = game.player, cache = cacheAt(game), kept = cache?.[index];
  if (!cache || !kept) return false;
  const left = give(player, kept.id, kept.n);
  if (left === kept.n) { message(game, "Your pack is full.", "warn"); return false; }
  if (left > 0) kept.n = left; else cache[index] = null;
  sound(game, "click");
  return true;
}
/** Walk the way: the waystone takes you back to your fire from anywhere above ground, once in a while. */
export function walkTheWay(game: Game): boolean {
  const player = game.player, camp = player.camp;
  if (!camp?.waystone) { message(game, "The waystone remembers no fire: pitch a camp with it carried.", "warn"); return false; }
  if (level(game, "agility") < CAMP_RULES.waystoneWayfaring) { message(game, `You need a Wayfaring level of ${CAMP_RULES.waystoneWayfaring} to walk the way.`, "warn"); return false; }
  if (isUnderground(player.y)) { message(game, "The way can't be walked from underground.", "warn"); return false; }
  if (player.combat !== null) { message(game, "Not while you're fighting.", "warn"); return false; }
  const wait = player.waystoneAt + CAMP_RULES.waystoneEvery - game.tick;
  if (wait > 0) { message(game, `The waystone is cold yet: ${Math.ceil(wait * 0.6)} seconds.`, "warn"); return false; }
  const at = campRespawn(game) ?? (() => { for (const [dx, dy] of [[0, 1], [-1, 0], [1, 1], [0, -1], [-1, 1]]) { const x = camp.x + dx, y = camp.y + dy, i = y * W + x; if (CAMP_RULES.terrains.has(game.world.tiles[i]) && game.world.objectAt[i] < 0) return { x, y }; } return null; })();
  if (!at) { message(game, "There's no room by your fire to arrive at.", "warn"); return false; }
  player.waystoneAt = game.tick; player.activity = { kind: "teleport", to: at, timer: 8, spell: "waystone" };
  message(game, "The waystone warms in your hand, and the way opens…"); sound(game, "spell");
  return true;
}
/** Make the camp the place you wake up, or unmake it. */
export function toggleRespawn(game: Game) {
  const player = game.player, camp = player.camp;
  if (!camp) return;
  if (camp.respawn) { camp.respawn = false; message(game, "You'd wake by the Friendhollow fountain again."); return; }
  if (camp.tier < CAMP_RULES.respawnTier) { message(game, "A camp you can wake up at needs a lantern (ashsteel, from the Fieldcraft family) carried when it's pitched.", "warn"); return; }
  if (level(game, "agility") < CAMP_RULES.respawnWayfaring) { message(game, `You need a Wayfaring level of ${CAMP_RULES.respawnWayfaring} to make a camp your waking place.`, "warn"); return; }
  // One waking place at a time: a vessel's berth stops being it.
  for (const v of player.vessels) v.berth = false;
  camp.respawn = true; message(game, "If you fall, you'll wake here, by your fire.", "info");
}
/** Where you wake: the camp, if it's yours to wake at and still stands where you can stand; otherwise null (and a word why). */
export function campRespawn(game: Game): { x: number; y: number } | null {
  const player = game.player, camp = player.camp;
  if (!camp || !camp.respawn) return null;
  const ids = campObjects.get(game.world) ?? [], tent = ids.map(id => game.world.objects[id]).find(o => o && o.name === "Your tent");
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
