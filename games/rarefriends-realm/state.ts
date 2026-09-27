/**
 * Game state and the small helpers every system shares: inventory, bank, equipment, experience and messages.
 */
import {
  EQUIP_SLOTS, FAMILY_NAMES, MAX_XP, MONSTERS, PRAYERS, RELICS, SKILLS, SKILL_NAMES, XP_RATE, XP_TABLE, item, levelForXp,
  type Bonuses, type EquipSlot, type MonsterDef, type Skill, type SpotKind, type WardrobeId,
} from "./data.ts";
import { createWorld, type World } from "./world.ts";

export const TICK_MS = 600;
export const INVENTORY_SIZE = 28;
export const BANK_SIZE = 400;
export type Slot = { id: string; n: number };
export type Facing = "up" | "down" | "left" | "right";
export type Point = { x: number; y: number };
export type CombatStyle = "accurate" | "aggressive" | "defensive" | "controlled";

/** What the player is doing once they reach their target. */
export type Target =
  | { kind: "object"; id: number; option: string; use?: number }
  | { kind: "npc"; uid: number; option: string; use?: number }
  | { kind: "monster"; uid: number; option: string; spell?: string }
  | { kind: "ground"; uid: number; option: string }
  | { kind: "fire"; uid: number; option: string; use?: number };
export type Activity =
  | { kind: "woodcut"; objectId: number; timer: number }
  | { kind: "mine"; objectId: number; timer: number }
  | { kind: "thieve_stall"; objectId: number; timer: number }
  | { kind: "fish"; objectId: number; timer: number; spot: SpotKind }
  | { kind: "cook"; source: "range" | "fire"; sourceId: number; raw: string; timer: number; left: number }
  | { kind: "produce"; recipe: Recipe; timer: number; left: number }
  | { kind: "obstacle"; objectId: number; timer: number; from: Point; to: Point }
  | { kind: "teleport"; to: Point; timer: number; spell: string }
  | { kind: "firemake"; slot: number; timer: number };
/** Timed crafting at a station or from the inventory. */
export type Recipe = {
  skill: Skill; label: string; level: number; xp: number; ticks: number; station?: "furnace" | "anvil" | "none";
  inputs: Readonly<Record<string, number>>; outputs: Readonly<Record<string, number>>; tools?: readonly string[]; chance?: number; coins?: number;
};

export type Player = {
  x: number; y: number; prev: Point; facing: Facing; moved: number;
  path: Point[]; run: boolean; energy: number;
  xp: Record<Skill, number>; hp: number; prayer: number;
  inventory: (Slot | null)[]; equipment: Partial<Record<EquipSlot, string>>; bank: Slot[];
  style: CombatStyle; autocast: string | null; prayers: string[];
  target: Target | null; activity: Activity | null; combat: number | null;
  attackTimer: number; eatTimer: number; stunned: number; regenTimer: number;
  quests: Record<string, number>; questData: Record<string, number>;
  wardrobe: WardrobeId[]; worn: WardrobeId[]; follower: number | null;
  courseStep: number; kills: number; deaths: number; overhead: { text: string; until: number } | null;
  familyId: number; friendId: number; relics: number[]; followerGeneration: number | null; tutorial: number;
  lastHitBy: number | null; created: number; queuedSpell: string | null;
};
export type Monster = {
  uid: number; def: MonsterDef; x: number; y: number; prev: Point; spawn: Point; hp: number; facing: Facing;
  target: boolean; attackTimer: number; respawnAt: number; dead: boolean; wander: number; moved: number; retreat: number;
};
export type Npc = { uid: number; id: string; x: number; y: number; prev: Point; spawn: Point; wander: number; facing: Facing; moved: number; busy: number };
export type GroundItem = { uid: number; id: string; n: number; x: number; y: number; expires: number };
export type Fire = { uid: number; x: number; y: number; expires: number };
export type Projectile = { from: Point; to: Point; start: number; end: number; color: string };
export type GameEvent =
  | { type: "hit"; on: "player" | "monster"; uid?: number; damage: number; tick: number }
  | { type: "xp"; skill: Skill; amount: number; tick: number }
  | { type: "level"; skill: Skill; level: number; tick: number }
  | { type: "sound"; name: SoundName; tick: number }
  | { type: "projectile"; projectile: Projectile }
  | { type: "death"; tick: number }
  | { type: "quest"; quest: string; tick: number };
export type SoundName =
  | "chop" | "mine" | "splash" | "catch" | "fire" | "sizzle" | "burn" | "smelt" | "anvil" | "hit" | "miss" | "hurt" | "eat" | "bury" | "coins"
  | "pickup" | "drop" | "door" | "level" | "quest" | "spell" | "teleport" | "death" | "stun" | "jump" | "click" | "equip" | "kill" | "pray";
export type Message = { text: string; tone: "game" | "info" | "warn" | "quest" | "level" | "npc" | "public"; tick: number };

export type Game = {
  world: World; tick: number; player: Player; monsters: Monster[]; npcs: Npc[]; ground: GroundItem[]; fires: Fire[];
  depleted: Map<number, number>; messages: Message[]; events: GameEvent[]; rng: () => number; nextUid: number;
  dialogue: Dialogue | null; ui: { shop: string | null; bank: boolean; production: ProductionMenu | null };
  held: { dx: number; dy: number } | null; autoRetaliate: boolean; playTicks: number;
  overheads: Map<number, { text: string; until: number }>;
};
export type DialogueLine = { who: "npc" | "player"; text: string; npc?: string };
export type Dialogue = {
  npc: string; lines: DialogueLine[]; index: number;
  options?: { label: string; then: () => Dialogue | null }[];
  onEnd?: () => void;
};
export type ProductionMenu = { title: string; recipes: Recipe[] };

export function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let sharedWorld: World | null = null;
/** The world is immutable after generation, so every game shares one copy. */
export function realmWorld(): World { return sharedWorld ??= createWorld(); }

export function createPlayer(world: World, familyId: number, friendId: number): Player {
  const spawn = world.places.spawn, xp = Object.fromEntries(SKILLS.map(skill => [skill, 0])) as Record<Skill, number>;
  xp.hitpoints = XP_TABLE[10];
  const inventory: (Slot | null)[] = Array(INVENTORY_SIZE).fill(null);
  ["bronze_axe", "bronze_pickaxe", "small_net", "tinderbox", "bronze_dagger", "shrimps", "shrimps", "bread"].forEach((id, index) => { inventory[index] = { id, n: 1 }; });
  inventory[8] = { id: "coins", n: 25 };
  return {
    x: spawn.x, y: spawn.y, prev: { ...spawn }, facing: "down", moved: 0, path: [], run: false, energy: 100,
    xp, hp: 10, prayer: 1, inventory, equipment: {}, bank: [{ id: "coins", n: 50 }],
    style: "accurate", autocast: null, prayers: [], target: null, activity: null, combat: null,
    attackTimer: 0, eatTimer: 0, stunned: 0, regenTimer: 0, quests: {}, questData: {},
    wardrobe: [], worn: [], follower: null, courseStep: -1, kills: 0, deaths: 0, overhead: null,
    familyId: Math.max(0, Math.min(FAMILY_NAMES.length - 1, familyId)), friendId, relics: [0, 0, 0, 0], followerGeneration: null, tutorial: 0,
    lastHitBy: null, created: Date.now(), queuedSpell: null,
  };
}

export function createGame(options: { familyId: number; friendId: number; rng?: () => number; world?: World }): Game {
  const world = options.world ?? realmWorld(), rng = options.rng ?? Math.random;
  const game: Game = {
    world, tick: 0, player: createPlayer(world, options.familyId, options.friendId), monsters: [], npcs: [], ground: [], fires: [],
    depleted: new Map(), messages: [], events: [], rng, nextUid: 1, dialogue: null, ui: { shop: null, bank: false, production: null },
    held: null, autoRetaliate: true, playTicks: 0, overheads: new Map(),
  };
  for (const spawn of world.spawns) {
    const uid = game.nextUid++, at = { x: spawn.x, y: spawn.y };
    if (spawn.kind === "monster") {
      const def = MONSTERS[spawn.id];
      game.monsters.push({ uid, def, x: at.x, y: at.y, prev: { ...at }, spawn: at, hp: def.hp, facing: "down", target: false, attackTimer: 0, respawnAt: 0, dead: false, wander: spawn.wander ?? def.wander, moved: 0, retreat: 0 });
    } else game.npcs.push({ uid, id: spawn.id, x: at.x, y: at.y, prev: { ...at }, spawn: at, wander: spawn.wander ?? 0, facing: "down", moved: 0, busy: 0 });
  }
  message(game, "Welcome to the Realm. Talk to the Realm Guide by the fountain if you get lost.", "info");
  return game;
}

// ---------- Messages and events ----------
export function message(game: Game, text: string, tone: Message["tone"] = "game") {
  game.messages.push({ text, tone, tick: game.tick });
  if (game.messages.length > 120) game.messages.splice(0, game.messages.length - 120);
}
export function emit(game: Game, event: GameEvent) {
  game.events.push(event);
  if (game.events.length > 200) game.events.splice(0, game.events.length - 200);
}
export const sound = (game: Game, name: SoundName) => emit(game, { type: "sound", name, tick: game.tick });

// ---------- Experience ----------
export const level = (game: Game, skill: Skill) => levelForXp(game.player.xp[skill]);
export function totalLevel(player: Player) { return SKILLS.reduce((sum, skill) => sum + levelForXp(player.xp[skill]), 0); }
export function totalXp(player: Player) { return SKILLS.reduce((sum, skill) => sum + Math.floor(player.xp[skill]), 0); }
export function combatLevel(player: Player) {
  const L = (skill: Skill) => levelForXp(player.xp[skill]);
  const base = 0.25 * (L("defence") + L("hitpoints") + Math.floor(L("prayer") / 2));
  const melee = 0.325 * (L("attack") + L("strength")), magic = 0.325 * Math.floor(1.5 * L("magic"));
  return Math.floor(base + Math.max(melee, magic));
}
/** XP multiplier from the realm rate, kept Rare Relics and your follower's generation. */
export function xpMultiplier(player: Player) {
  const plain = Math.min(RELICS[0].max, player.relics[0] ?? 0) * RELICS[0].xpPer, golden = (player.relics[3] ?? 0) > 0 ? RELICS[3].xpPer : 0;
  return XP_RATE * (1 + plain + golden + followerBonus(player));
}
/** Owned-Friend followers: Gen 1 +5% XP … Gen 5 and later +1%. */
export function followerBonus(player: Player) {
  if (player.follower === null) return 0;
  const generation = player.followerGeneration ?? 6;
  return [0.05, 0.05, 0.04, 0.03, 0.02, 0.01, 0.01][Math.max(0, Math.min(6, generation))] ?? 0.01;
}
/** Award XP (already scaled by the caller with `scaled`) and announce level-ups. */
export function addXp(game: Game, skill: Skill, base: number, options: { raw?: boolean } = {}) {
  const player = game.player, before = levelForXp(player.xp[skill]);
  const amount = options.raw ? base : base * xpMultiplier(player);
  if (amount <= 0) return;
  player.xp[skill] = Math.min(MAX_XP, player.xp[skill] + amount);
  emit(game, { type: "xp", skill, amount, tick: game.tick });
  const after = levelForXp(player.xp[skill]);
  if (after > before) {
    if (skill === "hitpoints") player.hp += after - before;
    if (skill === "prayer") player.prayer += after - before;
    message(game, `Congratulations, you've just advanced your ${SKILL_NAMES[skill]} level. You are now level ${after}.`, "level");
    emit(game, { type: "level", skill, level: after, tick: game.tick });
    sound(game, "level");
  }
}

// ---------- Inventory ----------
export const freeSlots = (player: Player) => player.inventory.filter(slot => slot === null).length;
export function count(player: Player, id: string) {
  return player.inventory.reduce((sum, slot) => sum + (slot?.id === id ? slot.n : 0), 0);
}
export const has = (player: Player, id: string, n = 1) => count(player, id) >= n;
export function hasTool(player: Player, id: string) { return has(player, id) || Object.values(player.equipment).includes(id); }
/** Whether `n` of an item would fit. */
export function canHold(player: Player, id: string, n = 1) {
  const definition = item(id);
  if (definition.stackable) return player.inventory.some(slot => slot?.id === id) || freeSlots(player) > 0;
  return freeSlots(player) >= n;
}
/** Add items; returns how many didn't fit. */
export function give(player: Player, id: string, n = 1): number {
  const definition = item(id);
  if (definition.stackable) {
    const slot = player.inventory.find(entry => entry?.id === id);
    if (slot) { slot.n = Math.min(2_147_483_647, slot.n + n); return 0; }
    const index = player.inventory.indexOf(null);
    if (index < 0) return n;
    player.inventory[index] = { id, n }; return 0;
  }
  let left = n;
  while (left > 0) {
    const index = player.inventory.indexOf(null);
    if (index < 0) break;
    player.inventory[index] = { id, n: 1 }; left--;
  }
  return left;
}
/** Give, or drop what doesn't fit at the player's feet. */
export function giveOrDrop(game: Game, id: string, n = 1) {
  const left = give(game.player, id, n);
  if (left > 0) { dropItem(game, id, left, game.player.x, game.player.y); message(game, "Your inventory is full, so it falls to the ground.", "warn"); }
}
export function take(player: Player, id: string, n = 1): boolean {
  if (count(player, id) < n) return false;
  let left = n;
  for (let index = player.inventory.length - 1; index >= 0 && left > 0; index--) {
    const slot = player.inventory[index];
    if (slot?.id !== id) continue;
    const used = Math.min(slot.n, left);
    slot.n -= used; left -= used;
    if (slot.n <= 0) player.inventory[index] = null;
  }
  return true;
}
export function dropItem(game: Game, id: string, n: number, x: number, y: number, ticks = 200) {
  const definition = item(id), existing = definition.stackable ? game.ground.find(entry => entry.id === id && entry.x === x && entry.y === y) : undefined;
  if (existing) { existing.n += n; existing.expires = game.tick + ticks; return; }
  if (definition.stackable) game.ground.push({ uid: game.nextUid++, id, n, x, y, expires: game.tick + ticks });
  else for (let i = 0; i < Math.min(n, 28); i++) game.ground.push({ uid: game.nextUid++, id, n: 1, x, y, expires: game.tick + ticks });
  if (game.ground.length > 400) game.ground.splice(0, game.ground.length - 400);
}

// ---------- Bank ----------
export function bankDeposit(player: Player, slotIndex: number, n = Infinity) {
  const slot = player.inventory[slotIndex];
  if (!slot) return false;
  const moving = Math.min(n, count(player, slot.id)), id = slot.id;
  if (!player.bank.some(entry => entry.id === id) && player.bank.length >= BANK_SIZE) return false;
  take(player, id, moving);
  const entry = player.bank.find(bank => bank.id === id);
  if (entry) entry.n += moving; else player.bank.push({ id, n: moving });
  return true;
}
export function bankDepositAll(player: Player) {
  for (let index = 0; index < player.inventory.length; index++) if (player.inventory[index]) bankDeposit(player, index);
}
export function bankDepositWorn(player: Player) {
  for (const slot of EQUIP_SLOTS) {
    const id = player.equipment[slot];
    if (!id) continue;
    const entry = player.bank.find(bank => bank.id === id);
    if (entry) entry.n++; else player.bank.push({ id, n: 1 });
    delete player.equipment[slot];
  }
  if (player.autocast && !isStaffEquipped(player)) player.autocast = null;
}
export function bankWithdraw(player: Player, id: string, n: number) {
  const entry = player.bank.find(bank => bank.id === id);
  if (!entry) return 0;
  const definition = item(id), room = definition.stackable ? (canHold(player, id) ? entry.n : 0) : freeSlots(player);
  const moving = Math.max(0, Math.min(n, entry.n, room));
  if (!moving) return 0;
  give(player, id, moving); entry.n -= moving;
  if (entry.n <= 0) player.bank.splice(player.bank.indexOf(entry), 1);
  return moving;
}

// ---------- Equipment ----------
export function bonuses(player: Player): Bonuses {
  const total: Bonuses = { attack: 0, strength: 0, defence: 0, magic: 0, prayer: 0 };
  for (const id of Object.values(player.equipment)) {
    const equip = id ? item(id).equip : undefined;
    if (!equip) continue;
    for (const key of Object.keys(total) as (keyof Bonuses)[]) total[key] += equip.bonuses[key] ?? 0;
  }
  return total;
}
export const weapon = (player: Player) => player.equipment.weapon ? item(player.equipment.weapon) : null;
export const isStaffEquipped = (player: Player) => !!weapon(player)?.equip?.staff;
export const attackSpeed = (player: Player) => weapon(player)?.equip?.speed ?? 4;
/** Active prayer multipliers. */
export function prayerBoost(player: Player) {
  const boost = { attack: 0, strength: 0, defence: 0, magic: 0, protect: false };
  for (const id of player.prayers) {
    const prayer = PRAYERS.find(entry => entry.id === id);
    if (!prayer) continue;
    boost.attack = Math.max(boost.attack, prayer.effect.attack ?? 0);
    boost.strength = Math.max(boost.strength, prayer.effect.strength ?? 0);
    boost.defence = Math.max(boost.defence, prayer.effect.defence ?? 0);
    boost.magic = Math.max(boost.magic, prayer.effect.magic ?? 0);
    boost.protect ||= !!prayer.effect.protect;
  }
  return boost;
}
export const maxHp = (player: Player) => levelForXp(player.xp.hitpoints);
export const maxPrayer = (player: Player) => levelForXp(player.xp.prayer);
