/**
 * Seafaring (A Place to the North): vessels of your own, built from real materials, moored where you leave them, sailed
 * over the water the world actually has. A global skill: Wayfaring keeps the land, Seafaring the water.
 *
 * - A vessel is a persistent thing in your save (player.vessels): its kind, name, where it's moored, its hull, its hold.
 *   Moored, it's an object in the world (applyVessels paints them, like a camp); aboard, it's under you and moves with you.
 * - Sailing: aboard, you move over water instead of land (canWalk asks sailable()). Each kind has its waters: small craft
 *   keep to the shallows and the coast, the longship goes anywhere there's water, a barge keeps to rivers and lakes. Nothing
 *   sails underground, through ice or over land.
 * - Going ashore: click land beside the water; you sail to it and step off if the vessel can be beached there, or there's
 *   a pier or a jetty to step onto. The vessel stays where you left it, its hold with it, through logout and back.
 * - Building: a shipwright builds what your Seafaring allows, from planks, rivets (Smithing), sailcloth and rope, all of
 *   them taken; the vessel goes into the water at the yard. Shipwrights saw logs into planks for a fee, and repair hulls.
 * - Teleporting, dying or being moved off the water while aboard leaves the vessel moored where it was (vesselTick).
 */
import { item } from "./data.ts";
import { addXp, count, give, has, level, message, sound, take, type Dialogue, type Game, type Player, type Point, type Slot } from "./state.ts";
import { OVERWORLD_H, T, W, H, WALKABLE, regionAt, type World, type WorldObject } from "./world.ts";
import { chat, npcSays, questDone } from "./content.ts";
import { DOCKS, dockLocked } from "./boats.ts";

export type VesselKind = "rowboat" | "skiff" | "barge" | "longship";
/** Which water a hull takes: the shallows only, the sea near the coast as well, or any water at all. */
export type Waters = "shallow" | "coastal" | "any";
export type VesselDef = {
  kind: VesselKind; name: string; level: number; speed: number; hull: number; hold: number; waters: Waters;
  /** Can be run up on any shore (a pier or a jetty does for the rest). */
  beach: boolean;
  /** Seafaring XP every SAIL_XP_EVERY tiles sailed, and for building it. */
  sailXp: number; buildXp: number;
  build: readonly (readonly [string, number])[]; examine: string;
};
export const VESSELS: Record<VesselKind, VesselDef> = {
  rowboat: { kind: "rowboat", name: "Rowboat", level: 1, speed: 1, hull: 40, hold: 4, waters: "shallow", beach: true, sailXp: 6, buildXp: 80,
    build: [["pine_planks", 6], ["pewter_rivets", 1], ["ships_rope", 1]], examine: "Two oars, three planks to sit on, and enough room for what you caught." },
  skiff: { kind: "skiff", name: "Fishing skiff", level: 15, speed: 2, hull: 70, hold: 8, waters: "coastal", beach: true, sailXp: 10, buildXp: 320,
    build: [["oak_planks", 12], ["blackiron_rivets", 2], ["sailcloth", 1], ["ships_rope", 2]], examine: "A single lugsail and a deep keel: out past the shallows, home before the weather." },
  barge: { kind: "barge", name: "River barge", level: 35, speed: 1, hull: 140, hold: 28, waters: "shallow", beach: true, sailXp: 14, buildXp: 900,
    build: [["pine_planks", 30], ["ashsteel_rivets", 4], ["ships_rope", 4]], examine: "Flat-bottomed and broad, with a deckhouse aft: the Zoryavik's way of moving timber and everything else down a river." },
  longship: { kind: "longship", name: "Longship", level: 50, speed: 3, hull: 200, hold: 16, waters: "any", beach: true, sailXp: 22, buildXp: 2500,
    build: [["oak_planks", 40], ["moonsilver_rivets", 8], ["sailcloth", 4], ["ships_rope", 6], ["blackiron_anchor_chain", 1]],
    examine: "Clinker-built, shallow enough for a fjord and fast enough for the open sea, a dragon at the prow and a striped sail amidships." },
};
export const VESSEL_KINDS = Object.keys(VESSELS) as VesselKind[];
export type Vessel = { id: number; kind: VesselKind; name: string; x: number; y: number; /** Which way its bow points (a world heading, like a walker's). */ heading: Point; hull: number; hold: (Slot | null)[]; /** Tiles sailed (all time). */ sailed: number;
  /** The hull fitting fitted, by metal (moonsilver, glimmer or rarite), or none. */ fitting?: string | null;
  /** Your waking place: if you fall, you wake aboard it (a barge's deckhouse, a longship's awning). */ berth?: boolean };
/** What a hull fitting does: the hull it adds (a share of the kind's) and how much longer deep water takes to wear it. */
export const FITTINGS: Record<string, { hull: number; wear: number }> = { moonsilver: { hull: 0.25, wear: 1.5 }, glimmer: { hull: 0.5, wear: 2 }, rarite: { hull: 1, wear: 3 } };
const FITTING_ORDER = ["moonsilver", "glimmer", "rarite"];
/** A vessel's full hull, with its fitting. */
export const maxHull = (v: Vessel) => Math.round(VESSELS[v.kind].hull * (1 + (v.fitting ? FITTINGS[v.fitting]?.hull ?? 0 : 0)));
export const SEA = {
  /** How many vessels one adventurer keeps. */ maxVessels: 3,
  /** Seafaring XP is paid every this many tiles sailed. */ xpEvery: 8,
  /** A hull loses a point every this many tiles on deep water. */ wearEvery: 40,
  /** "Coastal" craft go out on deep water this many tiles from land, no further. */ coastal: 4,
  /** What a shipwright charges to saw a log into a plank, by the plank. */
  sawFee: { pine_planks: 15, oak_planks: 10, ironbark_planks: 60 } as Record<string, number>,
  /** A plank and rivets mend this much of a hull at a shipwright's. */ repairPerPlank: 10,
  /** A berth to wake in: the Seafaring for it, and the kinds that have one. */
  berthLevel: 40, berths: ["barge", "longship"] as readonly VesselKind[],
  /** The ship's bell: the Seafaring to ring a vessel to you, how far from you it comes to, and how often (ticks). */
  bellLevel: 60, bellReach: 10, bellEvery: 1000,
};
/** The logs each plank is sawn from. */
export const PLANK_FROM: Record<string, string> = { pine_planks: "pine_logs", oak_planks: "oak_logs", ironbark_planks: "ironbark_logs" };
/** The shipwrights: who builds what. */
export const SHIPWRIGHTS: Record<string, { yard: string; builds: readonly VesselKind[] }> = {
  shipwright_bersi: { yard: "the Skarnholm slipway", builds: ["rowboat", "skiff", "longship"] },
  gullwick_boatwright: { yard: "the Gullwick hard", builds: ["rowboat", "skiff"] },
  bereslav_bargewoman: { yard: "the Bereslav landing", builds: ["rowboat", "barge"] },
};

const isWaterTile = (tile: number) => tile === T.WATER || tile === T.DEEP;
/** Whether a tile is water at all, above ground (where a vessel can be, whatever its kind and hull). */
const onWater = (world: World, x: number, y: number) => x >= 0 && y >= 0 && x < W && y < OVERWORLD_H && (isWaterTile(world.tiles[y * W + x]) || world.tiles[y * W + x] === T.BRIDGE);
/** How far each water tile is from land (capped), worked out once per world: the coastal craft's leash. */
const shoreCache = new WeakMap<World, Uint8Array>();
export function shoreDistance(world: World): Uint8Array {
  let d = shoreCache.get(world);
  if (d) return d;
  d = new Uint8Array(W * OVERWORLD_H).fill(255);
  const queue = new Int32Array(W * OVERWORLD_H); let tail = 0;
  for (let i = 0; i < W * OVERWORLD_H; i++) if (WALKABLE.has(world.tiles[i]) && world.tiles[i] !== T.BRIDGE) { d[i] = 0; queue[tail++] = i; }
  for (let head = 0; head < tail; head++) {
    const i = queue[head], x = i % W, y = (i - x) / W, next = d[i] + 1;
    if (next > 12) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= OVERWORLD_H) continue; const k = ny * W + nx; if (d[k] > next) { d[k] = next; queue[tail++] = k; } }
  }
  shoreCache.set(world, d);
  return d;
}
/** The vessel you're aboard, or null. */
export const aboard = (player: Player): Vessel | null => player.aboard === null ? null : player.vessels.find(v => v.id === player.aboard) ?? null;
/** Whether a kind of vessel can be on a tile (water it can take, no object in the way, above ground). */
export function sailableFor(world: World, kind: VesselKind, x: number, y: number, damaged = false): boolean {
  if (x < 0 || y < 0 || x >= W || y >= OVERWORLD_H) return false;
  const i = y * W + x, tile = world.tiles[i];
  if (!isWaterTile(tile) && tile !== T.BRIDGE) return false;
  if (tile === T.BRIDGE && !isWaterUnder(world, x, y)) return false;
  const o = world.objectAt[i]; if (o >= 0 && world.objects[o].blocks && world.objects[o].name !== "__removed") return false;
  if (tile === T.DEEP) {
    const waters = damaged ? "shallow" : VESSELS[kind].waters;
    if (waters === "shallow") return false;
    if (waters === "coastal" && shoreDistance(world)[i] > SEA.coastal) return false;
  }
  return true;
}
/** A bridge you can pass under: water on both sides along one axis. */
const isWaterUnder = (world: World, x: number, y: number) =>
  (isWaterTile(world.tiles[y * W + x - 1]) || world.tiles[y * W + x - 1] === T.BRIDGE) && (isWaterTile(world.tiles[y * W + x + 1]) || world.tiles[y * W + x + 1] === T.BRIDGE)
  || (isWaterTile(world.tiles[(y - 1) * W + x]) || world.tiles[(y - 1) * W + x] === T.BRIDGE) && (isWaterTile(world.tiles[(y + 1) * W + x]) || world.tiles[(y + 1) * W + x] === T.BRIDGE);
/** Where you can go while aboard (engine.ts canWalk asks this instead of the land's rules). */
export function sailable(game: Game, x: number, y: number): boolean {
  const vessel = aboard(game.player);
  return !!vessel && sailableFor(game.world, vessel.kind, x, y, vessel.hull <= 0);
}

// ---------- Moored vessels in the world ----------
const vesselObjects = new WeakMap<World, number[]>();
const removeObject = (world: World, id: number) => { const o = world.objects[id]; if (!o || o.name === "__removed") return; world.objects[id] = { ...o, kind: "decor", decor: "flowers", blocks: false, name: "__removed" }; if (world.objectAt[o.y * W + o.x] === id) world.objectAt[o.y * W + o.x] = -1; };
const addObject = (world: World, object: Omit<WorldObject, "id">) => { const full = { ...object, id: world.objects.length } as WorldObject; world.objects.push(full); world.objectAt[full.y * W + full.x] = full.id; return full.id; };
/** Paint your moored vessels into the world (at the start, after a rebuild, and whenever one moves). The one you're aboard isn't moored. */
export function applyVessels(game: Game) {
  const world = game.world, player = game.player;
  for (const id of vesselObjects.get(world) ?? []) removeObject(world, id);
  const ids: number[] = [];
  for (const v of player.vessels) {
    if (v.id === player.aboard) continue;
    if (world.objectAt[v.y * W + v.x] >= 0) continue;
    ids.push(addObject(world, { kind: "decor", decor: "vessel", ship: v.kind, heading: { ...v.heading }, x: v.x, y: v.y, blocks: true, name: v.name, text: `vessel:${v.id}`, clue: "vessel" }));
  }
  vesselObjects.set(world, ids); game.worldVersion = (game.worldVersion ?? 0) + 1;
}
const vesselOf = (game: Game, object: WorldObject) => object.text?.startsWith("vessel:") ? game.player.vessels.find(v => `vessel:${v.id}` === object.text) ?? null : null;

/** Step aboard a moored vessel from beside it. */
export function board(game: Game, vessel: Vessel): boolean {
  const player = game.player;
  if (player.aboard !== null) { message(game, "You're aboard already.", "warn"); return false; }
  if (Math.abs(player.x - vessel.x) + Math.abs(player.y - vessel.y) > 2) { message(game, "Get closer to it first.", "warn"); return false; }
  player.mount = null; player.path = []; player.target = null; player.activity = null; player.landing = null;
  player.aboard = vessel.id; player.prev = { x: vessel.x, y: vessel.y }; player.x = vessel.x; player.y = vessel.y; player.moved = game.tick;
  // The vessel you last took is the one the ship's bell calls.
  player.vessels = [vessel, ...player.vessels.filter(v => v !== vessel)];
  applyVessels(game); sound(game, "click");
  message(game, vessel.hull <= 0 ? `You climb into the ${vessel.name.toLowerCase()}. The hull's stove in: it'll keep to the shallows until it's mended.` : `You climb aboard the ${vessel.name.toLowerCase()}. Click the water to sail, the shore to land.`);
  return true;
}
/** Whether you can step ashore onto a land tile beside you: a vessel that beaches, or a pier, jetty or landing to step onto. */
export function ashoreProblem(game: Game, x: number, y: number): string | null {
  const player = game.player, vessel = aboard(player);
  if (!vessel) return "You're not aboard anything.";
  if (Math.abs(player.x - x) + Math.abs(player.y - y) !== 1) return "Sail up beside it first.";
  const tile = game.world.tiles[y * W + x];
  if (!WALKABLE.has(tile) || isWaterTile(tile)) return "There's no stepping off there.";
  const o = game.world.objectAt[y * W + x]; if (o >= 0 && game.world.objects[o].blocks && game.world.objects[o].name !== "__removed") return "There's something in the way.";
  const pier = tile === T.WOOD || tile === T.BRIDGE || game.world.objects.some(ob => ob.kind === "dock" && Math.abs(ob.x - x) <= 2 && Math.abs(ob.y - y) <= 2);
  if (!VESSELS[vessel.kind].beach && !pier) return `A ${VESSELS[vessel.kind].name.toLowerCase()} can't be beached: find a pier.`;
  return landingProblem(game, x, y);
}
/**
 * The shores that won't have you yet, by sea the same as by the boatmen: a landing's own coast while that landing is
 * closed to you (the Mizukai Isles before you're presented, Josaki by the lord's order, a sea port you've not walked
 * to), and Kharaveth's whole coast until the road south is safe (A Foothold in the Stone). Nobody sails round a quest.
 */
export function landingProblem(game: Game, x: number, y: number): string | null {
  const region = regionAt(game.world, x, y);
  const dock = DOCKS.find(d => d.region === region.id);
  if (dock) { const why = dockLocked(game, dock.id); if (why) return `The ${region.name} shore won't have you yet. ${why}`; }
  // (The Sunteeth and Foothold Camp are walked to before it; everything beyond Foothold's south gate waits on it.)
  if (region.south && !["sunward_strait", "sunteeth", "foothold"].includes(region.id) && !questDone(game, "foothold_in_the_stone")) return "Kharaveth's coast is watched from the Sunteeth, and nobody lands on it until Foothold says the road south is safe.";
  return null;
}
/** Step ashore: the vessel stays moored where it is. */
export function goAshore(game: Game, x: number, y: number): boolean {
  const player = game.player, vessel = aboard(player), why = ashoreProblem(game, x, y);
  player.landing = null;
  if (!vessel || why) { if (why) message(game, why, "warn"); return false; }
  vessel.x = player.x; vessel.y = player.y; vessel.heading = { ...player.heading };
  player.aboard = null; player.prev = { x: player.x, y: player.y }; player.x = x; player.y = y; player.moved = game.tick; player.path = [];
  applyVessels(game); sound(game, "click");
  const region = regionAt(game.world, x, y);
  // A first landfall by sea in a region: worth something.
  if (!player.landfalls[region.id]) { player.landfalls[region.id] = 1; addXp(game, "seafaring", 40 + 10 * VESSELS[vessel.kind].level, { raw: true }); message(game, `Your first landfall by sea in ${region.name}.`, "info"); }
  message(game, `You step ashore. Your ${vessel.name.toLowerCase()} stays moored here.`);
  return true;
}
/** A tile sailed: XP now and then, and wear on deep water (engine.ts moveTo calls this while aboard). */
export function sailed(game: Game) {
  const player = game.player, vessel = aboard(player);
  if (!vessel) return;
  vessel.x = player.x; vessel.y = player.y; vessel.heading = { ...player.heading }; vessel.sailed++;
  if (vessel.sailed % SEA.xpEvery === 0) addXp(game, "seafaring", VESSELS[vessel.kind].sailXp);
  const wearEvery = Math.round(SEA.wearEvery * (vessel.fitting ? FITTINGS[vessel.fitting]?.wear ?? 1 : 1));
  if (game.world.tiles[player.y * W + player.x] === T.DEEP && vessel.sailed % wearEvery === 0 && vessel.hull > 0) {
    vessel.hull--;
    if (vessel.hull === 0) message(game, `Your ${vessel.name.toLowerCase()}'s hull is stove in. It'll only keep to the shallows now: get it to a shipwright.`, "warn");
  }
}
/** Each tick: if you've been taken off the water some other way (a teleport, a death, a door), the vessel stays where it was. */
export function vesselTick(game: Game) {
  const player = game.player, vessel = aboard(player);
  if (!vessel) return;
  const there = player.x === vessel.x && player.y === vessel.y, near = Math.max(Math.abs(player.x - vessel.x), Math.abs(player.y - vessel.y)) <= 4;
  if ((there || near) && onWater(game.world, player.x, player.y)) return;
  player.aboard = null; player.landing = null; applyVessels(game);
  message(game, `Your ${vessel.name.toLowerCase()} stays moored where you left it.`, "info");
}

// ---------- The hold ----------
/** The hold you can reach: the vessel you're aboard, or one moored beside you. */
export function holdAt(game: Game): Vessel | null {
  const player = game.player, here = aboard(player);
  if (here) return here;
  return player.vessels.find(v => v.id !== player.aboard && Math.abs(v.x - player.x) + Math.abs(v.y - player.y) <= 2) ?? null;
}
export function stowInHold(game: Game, slotIndex: number): boolean {
  const player = game.player, slot = player.inventory[slotIndex], vessel = holdAt(game);
  if (!slot || !vessel) { if (slot && !vessel) message(game, "Your vessel's hold is aboard it: be there.", "warn"); return false; }
  const same = item(slot.id).stackable ? vessel.hold.find(kept => kept?.id === slot.id) : null;
  if (same) same.n = Math.min(2_147_483_647, same.n + slot.n);
  else { const free = vessel.hold.indexOf(null); if (free < 0) { message(game, "The hold is full.", "warn"); return false; } vessel.hold[free] = { ...slot }; }
  player.inventory[slotIndex] = null; sound(game, "click");
  return true;
}
export function takeFromHold(game: Game, index: number): boolean {
  const player = game.player, vessel = holdAt(game), kept = vessel?.hold[index];
  if (!vessel || !kept) return false;
  const left = give(player, kept.id, kept.n);
  if (left === kept.n) { message(game, "Your pack is full.", "warn"); return false; }
  if (left > 0) kept.n = left; else vessel.hold[index] = null;
  sound(game, "click");
  return true;
}

// ---------- The clue machinery: a moored vessel's options ----------
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
export const VESSEL_CLUES: Record<string, { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome }> = {
  vessel: {
    options: (game, object) => { const v = vesselOf(game, object); return v && SEA.berths.includes(v.kind) ? ["Board", "Hold", v.berth ? "Unmake-waking-place" : "Make-waking-place"] : ["Board", "Hold"]; },
    examine: (game, object) => { const v = vesselOf(game, object); return v ? `Your ${VESSELS[v.kind].name.toLowerCase()}, ${v.name === VESSELS[v.kind].name ? "unnamed" : `the ${v.name}`}. Hull ${Math.round(100 * v.hull / maxHull(v))}%. ${VESSELS[v.kind].examine}` : "A vessel."; },
    use: (game, object, option) => {
      const v = vesselOf(game, object);
      if (!v) return { text: "That isn't yours." };
      if (option === "Hold") { if (holdAt(game)?.id === v.id) { game.ui.hold = v.id; sound(game, "click"); return null; } return { text: "Get beside it to reach the hold." }; }
      if (option === "Make-waking-place" || option === "Unmake-waking-place") { toggleBerth(game, v); return null; }
      board(game, v); return null;
    },
  },
};

// ---------- Building, sawing, repairs: the shipwrights ----------
/** Where a new vessel goes into the water: the nearest water it can take, near the yard. */
export function launchSpot(game: Game, kind: VesselKind, from: { x: number; y: number }): { x: number; y: number } | null {
  for (let r = 1; r <= 24; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = from.x + dx, y = from.y + dy;
    if (sailableFor(game.world, kind, x, y) && !game.player.vessels.some(v => v.x === x && v.y === y)) return { x, y };
  }
  return null;
}
/** Why you can't have a kind built, or null. */
export function buildProblem(game: Game, kind: VesselKind): string | null {
  const def = VESSELS[kind], player = game.player;
  if (level(game, "seafaring") < def.level) return `You need a Seafaring level of ${def.level} for a ${def.name.toLowerCase()}.`;
  if (player.vessels.length >= SEA.maxVessels) return `You have ${SEA.maxVessels} vessels already: as many as one adventurer can keep.`;
  const short = def.build.filter(([id, n]) => count(player, id) < n);
  if (short.length) return `Still wanted: ${short.map(([id, n]) => `${n - count(player, id)} × ${item(id).name}`).join(", ")}.`;
  return null;
}
/** Build a vessel at a yard: every material taken, the vessel launched beside it. */
export function buildVessel(game: Game, kind: VesselKind, yard: { x: number; y: number }): Vessel | null {
  const why = buildProblem(game, kind), def = VESSELS[kind], player = game.player;
  if (why) { message(game, why, "warn"); return null; }
  const spot = launchSpot(game, kind, yard);
  if (!spot) { message(game, "There's no water here deep enough to launch it.", "warn"); return null; }
  for (const [id, n] of def.build) take(player, id, n);
  const vessel: Vessel = { id: (player.vessels.reduce((m, v) => Math.max(m, v.id), 0) + 1), kind, name: def.name, x: spot.x, y: spot.y, heading: { x: 0, y: 1 }, hull: def.hull, hold: Array(def.hold).fill(null), sailed: 0 };
  player.vessels.push(vessel); applyVessels(game);
  addXp(game, "seafaring", def.buildXp, { raw: true }); addXp(game, "crafting", Math.round(def.buildXp / 2), { raw: true });
  message(game, `Your ${def.name.toLowerCase()} goes down the slip and into the water. Board it from the shore.`, "quest"); sound(game, "quest");
  return vessel;
}
/** Saw every log of a kind you carry into planks, for the shipwright's fee. */
export function sawPlanks(game: Game, plank: string): number {
  const player = game.player, logs = PLANK_FROM[plank], fee = SEA.sawFee[plank];
  const n = Math.min(count(player, logs), Math.floor(count(player, "coins") / fee));
  if (!n) { message(game, count(player, logs) ? `Sawing ${item(plank).name.toLowerCase()} costs ${fee} coins a plank.` : `Bring ${item(logs).name.toLowerCase()} to saw.`, "warn"); return 0; }
  take(player, logs, n); take(player, "coins", n * fee); give(player, plank, n);
  message(game, `${n} × ${item(plank).name} sawn, for ${n * fee} coins.`); sound(game, "click");
  return n;
}
/** Mend a vessel moored near the yard: a plank and a pewter rivet for each tenth of its hull. */
export function repairVessel(game: Game, vessel: Vessel): boolean {
  const player = game.player, def = VESSELS[vessel.kind], full = maxHull(vessel), missing = full - vessel.hull;
  if (missing <= 0) { message(game, "Its hull is sound."); return false; }
  const plank = def.build.find(([id]) => id.endsWith("_planks"))![0];
  const steps = Math.min(Math.ceil(missing / Math.max(1, Math.round(def.hull * SEA.repairPerPlank / 100))), count(player, plank), count(player, "pewter_rivets"));
  if (!steps) { message(game, `Mending it takes ${item(plank).name.toLowerCase()} and pewter rivets.`, "warn"); return false; }
  take(player, plank, steps); take(player, "pewter_rivets", steps);
  vessel.hull = Math.min(full, vessel.hull + steps * Math.max(1, Math.round(def.hull * SEA.repairPerPlank / 100)));
  addXp(game, "seafaring", steps * 15, { raw: true });
  message(game, `The hull's mended to ${Math.round(100 * vessel.hull / full)}%.`); sound(game, "click");
  return true;
}
/** A shipwright's talk: build, saw, mend, the stores; anything else goes to who they are (usual). */
export function talkShipwright(game: Game, npcId: string, name: string, usual: () => Dialogue | null): Dialogue | null {
  const yard = SHIPWRIGHTS[npcId];
  if (!yard) return null;
  const player = game.player, here = { x: player.x, y: player.y };
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const build = (): Dialogue => chat(name, npcSays(name, `What'll it be? I build ${yard.builds.map(k => VESSELS[k].name.toLowerCase()).join(", ")} at ${yard.yard}, from your materials.`), [
    ...yard.builds.map(kind => {
      const def = VESSELS[kind], why = buildProblem(game, kind);
      return { label: `${def.name} (Seafaring ${def.level}): ${def.build.map(([id, n]) => `${n} × ${item(id).name}`).join(", ")}`, then: () => why ? says(why) : chat(name, npcSays(name, `A ${def.name.toLowerCase()}, then. ${def.examine}`), [
        { label: "Build it.", then: () => { buildVessel(game, kind, here); return null; } }, { label: "Not yet.", then: () => null }]) };
    }),
    { label: "Not now.", then: () => null },
  ]);
  const saw = (): Dialogue => chat(name, npcSays(name, "Logs to planks: pine for hulls that float high, oak for hulls that last, ironbark for hulls nothing gets through. A fee by the plank."), [
    ...Object.keys(PLANK_FROM).map(plank => ({ label: `${item(plank).name} (${SEA.sawFee[plank]} coins each, from ${item(PLANK_FROM[plank]).name.toLowerCase()})`, then: () => { sawPlanks(game, plank); return null; } })),
    { label: "Not now.", then: () => null },
  ]);
  const near = player.vessels.filter(v => v.id !== player.aboard && Math.hypot(v.x - player.x, v.y - player.y) <= 24 && v.hull < maxHull(v));
  return chat(name, npcSays(name, npcId === "shipwright_bersi" ? "Keel, strakes, ribs, and a crew that wants to sail her. Bring me the timber and the iron and I'll give you the rest."
    : npcId === "gullwick_boatwright" ? "Rowboats and skiffs, built on the hard and launched on the tide. Bring the timber and the iron and I'll do the rest." : "Barges, mostly, and rowboats for the ones who fish. Bring the timber and the iron."), [
    { label: "Build me a vessel.", then: build },
    { label: "Saw some planks.", then: saw },
    ...(near.length ? [{ label: "Mend my vessel.", then: () => { repairVessel(game, near[0]); return null; } }] : []),
    { label: "Show me the ship's stores.", then: () => { game.ui.shop = "ship_stores"; return null; } },
    { label: "Something else.", then: () => usual() },
  ]);
}

// ---------- A berth: waking aboard ----------
/** Make a vessel your waking place (or stop): one waking place at a time, so a camp you'd wake at stops being it. */
export function toggleBerth(game: Game, vessel: Vessel): boolean {
  const player = game.player;
  if (vessel.berth) { vessel.berth = false; message(game, "You'd wake by the Friendhollow fountain again."); return true; }
  if (!SEA.berths.includes(vessel.kind)) { message(game, `A ${VESSELS[vessel.kind].name.toLowerCase()} has no berth to sleep in: a barge's deckhouse has, and a longship's awning.`, "warn"); return false; }
  if (level(game, "seafaring") < SEA.berthLevel) { message(game, `You need a Seafaring level of ${SEA.berthLevel} to make a vessel your waking place.`, "warn"); return false; }
  for (const v of player.vessels) v.berth = false;
  vessel.berth = true; if (player.camp) player.camp.respawn = false;
  message(game, `If you fall, you'll wake in your ${vessel.name.toLowerCase()}'s berth.`, "info");
  return true;
}
/** Where you wake if your vessel's your waking place: aboard it, wherever it's moored (engine.ts die asks first). */
export function berthRespawn(game: Game): Vessel | null {
  const player = game.player, vessel = player.vessels.find(v => v.berth);
  if (!vessel || !onWater(game.world, vessel.x, vessel.y)) return null;
  player.aboard = vessel.id; player.landing = null; player.prev = { x: vessel.x, y: vessel.y }; player.x = vessel.x; player.y = vessel.y;
  player.vessels = [vessel, ...player.vessels.filter(v => v !== vessel)];
  applyVessels(game);
  return vessel;
}

// ---------- Fittings and the bell: the shipwright's hardware the anvil makes ----------
/** Fit a hull fitting from the pack to the vessel you're aboard or beside: a stronger hull that wears slower. A better one replaces a worse (which comes back). */
export function fitToVessel(game: Game, slotIndex: number): boolean {
  const player = game.player, slot = player.inventory[slotIndex], vessel = holdAt(game);
  const metal = slot?.id.endsWith("_hull_fitting") ? slot.id.slice(0, -"_hull_fitting".length) : null;
  if (!slot || !metal || !FITTINGS[metal]) return false;
  if (!vessel) { message(game, "Fit it aboard one of your vessels, or beside it.", "warn"); return false; }
  if (vessel.fitting && FITTING_ORDER.indexOf(vessel.fitting) >= FITTING_ORDER.indexOf(metal)) { message(game, `Your ${vessel.name.toLowerCase()} has a ${item(`${vessel.fitting}_hull_fitting`).name.toLowerCase()} already.`, "warn"); return false; }
  const before = maxHull(vessel), old = vessel.fitting;
  player.inventory[slotIndex] = null;
  if (old) give(player, `${old}_hull_fitting`, 1);
  vessel.fitting = metal; vessel.hull = Math.min(maxHull(vessel), vessel.hull + maxHull(vessel) - before);
  addXp(game, "seafaring", 150 * (FITTING_ORDER.indexOf(metal) + 1), { raw: true }); applyVessels(game); sound(game, "click");
  message(game, `The ${item(`${metal}_hull_fitting`).name.toLowerCase()} goes on: your ${vessel.name.toLowerCase()}'s hull is stronger, and deep water wears it slower.`);
  return true;
}
/** Ring the ship's bell on a shore: the vessel you last took comes to the nearest water it can take beside you. */
export function ringBell(game: Game): boolean {
  const player = game.player, vessel = player.vessels[0];
  if (!has(player, "rarite_ships_bell")) return false;
  if (level(game, "seafaring") < SEA.bellLevel) { message(game, `It rings clear, and nothing answers. (Seafaring ${SEA.bellLevel} to call a vessel.)`, "warn"); return false; }
  if (!vessel) { message(game, "It rings clear across the water. You have no vessel to answer it.", "warn"); return false; }
  if (player.aboard !== null) { message(game, "You're aboard already.", "warn"); return false; }
  if (player.y >= OVERWORLD_H) { message(game, "The bell's no use underground.", "warn"); return false; }
  if (game.tick - player.bellAt < SEA.bellEvery) { message(game, "The bell's still humming from the last time. Give it a while.", "warn"); return false; }
  let best: { x: number; y: number } | null = null, bestD = Infinity;
  for (let dy = -SEA.bellReach; dy <= SEA.bellReach; dy++) for (let dx = -SEA.bellReach; dx <= SEA.bellReach; dx++) {
    const x = player.x + dx, y = player.y + dy, d = Math.abs(dx) + Math.abs(dy);
    if (d >= bestD || !sailableFor(game.world, vessel.kind, x, y) || player.vessels.some(v => v !== vessel && v.x === x && v.y === y)) continue;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ex, ey]) => WALKABLE.has(game.world.tiles[(y + ey) * W + x + ex]) && !isWaterTile(game.world.tiles[(y + ey) * W + x + ex]))) continue;
    best = { x, y }; bestD = d;
  }
  if (!best) { message(game, `It rings clear, but there's no water near enough for your ${vessel.name.toLowerCase()} to come to.`, "warn"); return false; }
  vessel.x = best.x; vessel.y = best.y; player.bellAt = game.tick; applyVessels(game); sound(game, "quest");
  addXp(game, "seafaring", 25);
  message(game, `The bell rings out over the water, and your ${vessel.name.toLowerCase()} comes in to the shore beside you.`);
  return true;
}

// ---------- The save ----------
const headingOf = (raw: unknown): Point => { const h = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}; const x = Math.sign(Number(h.x) || 0), y = Math.sign(Number(h.y) || 0); return x || y ? { x, y } : { x: 0, y: 1 }; };
const cleanSlot = (raw: unknown): Slot | null => { if (!raw || typeof raw !== "object") return null; const s = raw as Record<string, unknown>; return typeof s.id === "string" && typeof s.n === "number" && Number.isFinite(s.n) && s.n >= 1 ? { id: s.id, n: Math.floor(Math.min(s.n, 2_147_483_647)) } : null; };
/** The vessels from a save, kept sane: known kinds, on the map, holds the size they should be, at most the maximum. */
export function cleanVessels(raw: unknown, isItem: (id: string) => boolean): Vessel[] {
  if (!Array.isArray(raw)) return [];
  const out: Vessel[] = [];
  for (const entry of raw.slice(0, SEA.maxVessels)) {
    if (!entry || typeof entry !== "object") continue;
    const v = entry as Record<string, unknown>, kind = v.kind as VesselKind;
    if (!VESSELS[kind] || typeof v.id !== "number" || !Number.isInteger(v.id) || out.some(o => o.id === v.id)) continue;
    if (typeof v.x !== "number" || typeof v.y !== "number" || !Number.isInteger(v.x) || !Number.isInteger(v.y) || v.x < 0 || v.y < 0 || v.x >= W || v.y >= H) continue;
    const def = VESSELS[kind], hold = Array.from({ length: def.hold }, (_, i) => { const s = cleanSlot(Array.isArray(v.hold) ? v.hold[i] : null); return s && isItem(s.id) ? s : null; });
    out.push({ id: v.id, kind, name: typeof v.name === "string" && v.name.length <= 24 ? v.name : def.name, x: v.x, y: v.y, heading: headingOf(v.heading),
      hull: 0, hold, sailed: typeof v.sailed === "number" && Number.isFinite(v.sailed) ? Math.max(0, Math.floor(v.sailed)) : 0, fitting: typeof v.fitting === "string" && FITTINGS[v.fitting] ? v.fitting : null,
      berth: v.berth === true && SEA.berths.includes(kind) && !out.some(o => o.berth) });
    const kept = out[out.length - 1]; kept.hull = typeof v.hull === "number" && Number.isFinite(v.hull) ? Math.max(0, Math.min(maxHull(kept), Math.floor(v.hull))) : maxHull(kept);
  }
  return out;
}
/** After a load: aboard only if the vessel's there and on water it can take; never left standing on water. */
export function settleAboard(game: Game) {
  const player = game.player, vessel = aboard(player);
  if (vessel && (player.x !== vessel.x || player.y !== vessel.y || !onWater(game.world, player.x, player.y))) player.aboard = null;
  if (player.aboard === null && isWaterTile(game.world.tiles[player.y * W + player.x])) {
    // On the water with no vessel under you: to the nearest dry land.
    for (let r = 1; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = player.x + dx, y = player.y + dy, i = y * W + x;
      if (x >= 0 && y >= 0 && x < W && y < H && WALKABLE.has(game.world.tiles[i]) && game.world.objectAt[i] < 0) { player.x = x; player.y = y; player.prev = { x, y }; applyVessels(game); return; }
    }
  }
  applyVessels(game);
}
/** Whether there's a hold to stow in (for the item menu). */
export const canStow = (game: Game) => !!holdAt(game);
