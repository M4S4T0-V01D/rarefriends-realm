/**
 * Player housing: a cottage of your own on Homestead Row, west of Friendhollow on the Westmarch road. The deed and its
 * upgrades take Presence and coins; furniture takes coins; the look of the place (walls, floor, roof, garden) takes
 * simulated RF through a Rare Casket, like the market. Every Friend sees its own home there: the world is yours.
 */
import { count, maxHp, maxPrayer, message, sound, take, type Game, type Home } from "./state.ts";
import { T, W, WEST_DX, type Building, type DecorKind, type World, type WorldObject } from "./world.ts";
import { presenceLevel, presenceXp } from "./presence.ts";

/** The plot: the cottage's top-left corner; it grows down and to the right with each tier. */
export const HOME_PLOT = { x: 142 + WEST_DX, y: 266 } as const;
export const HOME_TIERS = [
  { tier: 1, name: "Cottage", coins: 25_000, presence: 15, w: 9, h: 7, rested: 0.05 },
  { tier: 2, name: "House", coins: 60_000, presence: 30, w: 11, h: 9, rested: 0.07 },
  { tier: 3, name: "Manor", coins: 150_000, presence: 50, w: 13, h: 11, rested: 0.1 },
] as const satisfies readonly { tier: number; name: string; coins: number; presence: number; w: number; h: number; rested: number }[];
export type HomeTier = typeof HOME_TIERS[number];
const tierAt = (index: number): HomeTier | undefined => (HOME_TIERS as readonly HomeTier[])[index];
export const RESTED_TICKS = 1000;
export type Furnishing = { id: string; name: string; coins: number; presence?: number; decor: DecorKind; kind?: "bed" | "bank" | "altar" | "hearth"; text?: string };
export type Slot = { id: string; name: string; tier: 1 | 2 | 3; at: readonly [number, number]; options: readonly Furnishing[] };
/** Where things go, counted from the inside corner of the cottage (1, 1 is the first floor tile). */
export const SLOTS: readonly Slot[] = [
  { id: "hearth", name: "Hearth", tier: 1, at: [4, 1], options: [
    { id: "cold_hearth", name: "Cold hearth", coins: 0, decor: "rubble", kind: "hearth", text: "Stone, and no fire yet." },
    { id: "lit_hearth", name: "Lit hearth", coins: 2_500, decor: "hearth", kind: "hearth", text: "A fire that warms the room." },
    { id: "great_hearth", name: "Great hearth", coins: 10_000, presence: 30, decor: "hearth", kind: "hearth", text: "A hearth fit for a hall." } ] },
  { id: "bed", name: "Bed", tier: 1, at: [1, 1], options: [
    { id: "straw_cot", name: "Straw cot", coins: 1_500, decor: "bed", kind: "bed", text: "Sleep here to rest: full health, faith and run energy, and a Well Rested XP bonus for ten minutes." },
    { id: "oak_bed", name: "Oak bed", coins: 6_000, decor: "bed", kind: "bed", text: "A proper bed. Sleep here to rest." },
    { id: "canopy_bed", name: "Canopy bed", coins: 20_000, presence: 25, decor: "bed", kind: "bed", text: "Curtains and all. Sleep here to rest." } ] },
  { id: "table", name: "Table", tier: 1, at: [4, 3], options: [
    { id: "plank_table", name: "Plank table", coins: 800, decor: "table" }, { id: "oak_table", name: "Oak table", coins: 3_000, decor: "table" }, { id: "feast_table", name: "Feast table", coins: 12_000, presence: 25, decor: "table" } ] },
  { id: "seat", name: "Seating", tier: 1, at: [3, 4], options: [{ id: "stool", name: "Stool", coins: 300, decor: "bench" }, { id: "bench", name: "Bench", coins: 1_200, decor: "bench" }] },
  { id: "shelf", name: "Shelves", tier: 1, at: [7, 1], options: [{ id: "shelves", name: "Shelves", coins: 1_000, decor: "shelf" }, { id: "library", name: "Library", coins: 8_000, presence: 30, decor: "shelf" }] },
  { id: "lamp", name: "Light", tier: 1, at: [1, 4], options: [{ id: "candle", name: "Candle", coins: 200, decor: "torch" }, { id: "lantern", name: "Lantern", coins: 900, decor: "lamp" }] },
  { id: "plant", name: "Plant", tier: 1, at: [7, 4], options: [{ id: "potted_plant", name: "Potted plant", coins: 400, decor: "bush" }, { id: "flower_bed", name: "Flowers", coins: 1_500, decor: "flowers" }] },
  { id: "chest", name: "Storage", tier: 1, at: [7, 5], options: [
    { id: "chest", name: "Chest", coins: 2_000, decor: "chest", text: "For show." },
    { id: "bank_chest", name: "Bank chest", coins: 50_000, presence: 40, decor: "chest", kind: "bank", text: "Your bank, at home." } ] },
  { id: "stand", name: "Armour stand", tier: 2, at: [1, 6], options: [{ id: "armour_stand", name: "Armour stand", coins: 3_000, decor: "armour" }] },
  { id: "statue", name: "Statue", tier: 2, at: [9, 1], options: [{ id: "friend_statue", name: "Statue of your Friend", coins: 15_000, presence: 35, decor: "statue", text: "Carved in your Friend's likeness." }] },
  { id: "altar", name: "House altar", tier: 3, at: [11, 8], options: [{ id: "house_altar", name: "House altar", coins: 30_000, presence: 60, decor: "old_friend", kind: "altar", text: "Pray at home; the Old Friend hears you here too." }] },
  { id: "throne", name: "High seat", tier: 3, at: [6, 8], options: [{ id: "high_seat", name: "High seat", coins: 25_000, presence: 50, decor: "throne" }] },
];
export type Cosmetic = { id: string; name: string };
/** Looks, each a Rare Casket's worth of simulated RF to change. */
export const HOME_LOOKS: Record<"walls" | "floor" | "roof" | "garden", readonly Cosmetic[]> = {
  walls: [{ id: "timber", name: "Half-timber" }, { id: "plank", name: "Planks" }, { id: "stone", name: "Stone" }],
  floor: [{ id: "wood", name: "Boards" }, { id: "stone", name: "Flagstones" }, { id: "carpet", name: "Carpet" }, { id: "cobble", name: "Cobbles" }],
  roof: [{ id: "#c99a96", name: "Rose tiles" }, { id: "#9aab92", name: "Sage shingles" }, { id: "#8f9cb2", name: "Slate" }, { id: "#cdb98a", name: "Thatch" }, { id: "#a996b5", name: "Plum" }, { id: "#3b3a40", name: "Charcoal" }],
  garden: [{ id: "none", name: "Bare" }, { id: "flowers", name: "Flower beds" }, { id: "hedge", name: "Hedges" }, { id: "lanterns", name: "Lanterns" }, { id: "graves", name: "A family plot" }],
};
export const DEFAULT_HOME = (): Home => ({ tier: 1, walls: "timber", floor: "wood", roof: "#c99a96", garden: "none", furniture: { hearth: "cold_hearth" } });
export const tierOf = (home: Home) => HOME_TIERS[home.tier - 1];
export const slotOpen = (home: Home, slot: Slot) => slot.tier <= home.tier;
export const furnishingOf = (home: Home, slot: Slot) => slot.options.find(option => option.id === home.furniture[slot.id]) ?? null;
/** The next thing you could put in a slot (what's there now is kept if you can't afford better). */
export const nextFurnishing = (home: Home, slot: Slot) => { const current = slot.options.findIndex(option => option.id === home.furniture[slot.id]); return slot.options[current + 1] ?? null; };

// ---------- Deeds and upgrades ----------
export function buyHome(game: Game): boolean {
  const player = game.player, next = tierAt(player.home ? player.home.tier : 0);
  if (!next) { message(game, "Your manor is as grand as the Realm allows."); return false; }
  if (presenceLevel(player) < next.presence) { message(game, `The steward wants a name the Realm knows: Presence ${next.presence} for a ${next.name.toLowerCase()}.`, "warn"); return false; }
  if (count(player, "coins") < next.coins) { message(game, `A ${next.name.toLowerCase()} costs ${next.coins.toLocaleString()} coins.`, "warn"); return false; }
  take(player, "coins", next.coins);
  if (!player.home) { player.home = DEFAULT_HOME(); presenceXp(game, 300); message(game, "The deed is yours: a cottage on Homestead Row, west of Friendhollow on the Westmarch road.", "quest"); }
  else { player.home.tier = next.tier as 1 | 2 | 3; presenceXp(game, 200); message(game, `Your home is a ${next.name.toLowerCase()} now.`, "quest"); }
  sound(game, "quest"); applyHome(game);
  return true;
}
export function buyFurnishing(game: Game, slotId: string, optionId: string): boolean {
  const player = game.player, home = player.home, slot = SLOTS.find(entry => entry.id === slotId), option = slot?.options.find(entry => entry.id === optionId);
  if (!home || !slot || !option) return false;
  if (!slotOpen(home, slot)) { message(game, `That needs a ${HOME_TIERS[slot.tier - 1].name.toLowerCase()}.`, "warn"); return false; }
  if (home.furniture[slot.id] === option.id) return false;
  if (option.presence && presenceLevel(player) < option.presence) { message(game, `${option.name} needs Presence ${option.presence}.`, "warn"); return false; }
  if (count(player, "coins") < option.coins) { message(game, `${option.name} costs ${option.coins.toLocaleString()} coins.`, "warn"); return false; }
  take(player, "coins", option.coins);
  home.furniture[slot.id] = option.id; message(game, `${option.name}: placed.`, "quest"); sound(game, "coins"); applyHome(game);
  return true;
}
/** A look, paid for already (through a casket): walls, floor, roof or garden. */
export function setHomeLook(game: Game, kind: keyof typeof HOME_LOOKS, id: string): boolean {
  const home = game.player.home;
  if (!home || !HOME_LOOKS[kind].some(entry => entry.id === id)) return false;
  home[kind] = id; message(game, `Your home's ${kind}: ${HOME_LOOKS[kind].find(entry => entry.id === id)!.name.toLowerCase()}.`, "quest"); sound(game, "quest"); applyHome(game);
  return true;
}
/** Sleep: health, faith and run energy back in full, and Well Rested for ten minutes. */
export function sleep(game: Game) {
  const player = game.player, tier = player.home ? tierOf(player.home) : HOME_TIERS[0];
  player.hp = maxHp(player); player.prayer = maxPrayer(player); player.energy = 100; player.restedTicks = RESTED_TICKS;
  message(game, `You sleep. You wake well rested: +${Math.round(tier.rested * 100)}% XP for ten minutes.`, "quest"); sound(game, "level");
}
export const restedBonus = (player: { home: Home | null; restedTicks: number }) => player.restedTicks > 0 && player.home ? tierOf(player.home).rested : 0;

// ---------- Building it in the world ----------
const FLOOR_TILE: Record<string, number> = { wood: T.WOOD, stone: T.STONE, carpet: T.CARPET, cobble: T.COBBLE };
const homeObjects = new WeakMap<World, number[]>();
const removeObject = (world: World, id: number) => { const object = world.objects[id]; if (!object || object.name === "__removed") return; world.objects[id] = { ...object, kind: "decor", decor: "flowers", blocks: false, name: "__removed" }; if (world.objectAt[object.y * W + object.x] === id) world.objectAt[object.y * W + object.x] = -1; };
const addObject = (world: World, object: Omit<WorldObject, "id">) => {
  const index = object.y * W + object.x; const old = world.objectAt[index]; if (old >= 0) removeObject(world, old);
  const full = { ...object, id: world.objects.length } as WorldObject; world.objects.push(full); world.objectAt[index] = full.id; return full;
};
/** The home's footprint for a tier, with a one-tile garden margin. */
export const homeRect = (tier: number) => { const t = HOME_TIERS[tier - 1]; return { x0: HOME_PLOT.x, y0: HOME_PLOT.y, x1: HOME_PLOT.x + t.w - 1, y1: HOME_PLOT.y + t.h - 1 }; };
export const atHome = (game: Game) => { const home = game.player.home; if (!home) return false; const r = homeRect(home.tier), p = game.player; return p.x > r.x0 && p.x < r.x1 && p.y > r.y0 && p.y < r.y1; };
/** Paint (or repaint) your home into the world: the cottage, its garden, and everything you've put in it. */
export function applyHome(game: Game) {
  const world = game.world, home = game.player.home;
  const previous = homeObjects.get(world) ?? [];
  for (const id of previous) removeObject(world, id);
  const built = world.buildings.findIndex(building => building.name === "Your home");
  const old = built >= 0 ? world.buildings[built] : null;
  if (old) { for (let y = old.y0 - 1; y <= old.y1 + 1; y++) for (let x = old.x0 - 1; x <= old.x1 + 1; x++) { world.tiles[y * W + x] = T.GRASS; world.buildingAt[y * W + x] = 0; } world.buildings.splice(built, 1); }
  homeObjects.set(world, []);
  if (!home) { game.worldVersion = (game.worldVersion ?? 0) + 1; return; }
  const tier = tierOf(home), r = homeRect(home.tier), ids: number[] = [];
  const building: Building = { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, roof: "gable", color: home.roof, chimney: home.furniture.hearth !== "cold_hearth", name: "Your home", walls: home.walls as Building["walls"] };
  world.buildings.push(building); const index = world.buildings.length;
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
    const edge = x === r.x0 || x === r.x1 || y === r.y0 || y === r.y1;
    world.tiles[y * W + x] = edge ? T.WALL : FLOOR_TILE[home.floor] ?? T.WOOD; world.buildingAt[y * W + x] = index;
    const id = world.objectAt[y * W + x]; if (id >= 0) removeObject(world, id);
  }
  const doorX = Math.floor((r.x0 + r.x1) / 2); world.tiles[r.y1 * W + doorX] = FLOOR_TILE[home.floor] ?? T.WOOD; world.tiles[r.y1 * W + doorX + 1] = FLOOR_TILE[home.floor] ?? T.WOOD;
  // The garden: a ring outside the walls, bar the path from the door.
  for (let y = r.y0 - 1; y <= r.y1 + 1; y++) for (let x = r.x0 - 1; x <= r.x1 + 1; x++) {
    const ring = x === r.x0 - 1 || x === r.x1 + 1 || y === r.y0 - 1 || y === r.y1 + 1; if (!ring) continue;
    const id = world.objectAt[y * W + x]; if (id >= 0) removeObject(world, id);
    world.tiles[y * W + x] = y === r.y1 + 1 && (x === doorX || x === doorX + 1) ? T.PATH : T.GRASS;
    if (y === r.y1 + 1 && (x === doorX || x === doorX + 1)) continue;
    const corner = (x === r.x0 - 1 || x === r.x1 + 1) && (y === r.y0 - 1 || y === r.y1 + 1);
    const kind: DecorKind | null = home.garden === "flowers" ? ((x + y) % 2 ? "flowers" : null) : home.garden === "hedge" ? "bush" : home.garden === "lanterns" ? (corner ? "lamp" : null) : home.garden === "graves" ? ((x + y) % 3 === 0 && y !== r.y1 + 1 ? "grave" : null) : null;
    if (kind) ids.push(addObject(world, { kind: "decor", decor: kind, x, y, blocks: kind !== "flowers", name: kind === "grave" ? "A family grave" : kind === "lamp" ? "Garden lantern" : kind === "bush" ? "Hedge" : "Flower bed" }).id);
  }
  // Furniture at its slots.
  for (const slot of SLOTS) {
    const option = furnishingOf(home, slot); if (!option || !slotOpen(home, slot)) continue;
    const x = r.x0 + slot.at[0], y = r.y0 + slot.at[1];
    if (x >= r.x1 || y >= r.y1) continue;
    const base = { x, y, blocks: true, name: option.name };
    if (option.kind === "bank") ids.push(addObject(world, { ...base, kind: "bank" }).id);
    else if (option.kind === "altar") ids.push(addObject(world, { ...base, kind: "altar", text: "home" }).id);
    else ids.push(addObject(world, { ...base, kind: "decor", decor: option.decor, name: option.kind === "bed" ? `${option.name} (sleep)` : option.kind === "hearth" ? `${option.name} (furnish)` : option.name }).id);
  }
  homeObjects.set(world, ids);
  game.worldVersion = (game.worldVersion ?? 0) + 1;
  void tier;
}
export function cleanHome(raw: unknown): Home | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>, home = DEFAULT_HOME();
  home.tier = r.tier === 2 || r.tier === 3 ? r.tier : 1;
  for (const key of ["walls", "floor", "roof", "garden"] as const) if (typeof r[key] === "string" && HOME_LOOKS[key].some(entry => entry.id === r[key])) home[key] = r[key] as string;
  if (r.furniture && typeof r.furniture === "object") for (const slot of SLOTS) { const id = (r.furniture as Record<string, unknown>)[slot.id]; if (typeof id === "string" && slot.options.some(option => option.id === id)) home.furniture[slot.id] = id; }
  return home;
}
export const homeDeed = (game: Game) => { const home = game.player.home, next = tierAt(home ? home.tier : 0); return { home, next, presence: presenceLevel(game.player), coins: count(game.player, "coins") }; };
