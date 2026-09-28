/**
 * The Realm's rules: a 0.6 s game tick, pathfinding, skills, combat, monsters, menus, shops and saves.
 * Pure TypeScript over the Game state, so it runs the same in the browser and in node tests.
 */
import {
  COOKING, CRAFTING, EMOTES, EQUIP_SLOTS, MOUNTS, PETS, mountDef, FLETCH_ARROWS, FLETCH_BOWS, SIGILCRAFT, STAFF_SIGILS, itemCategory, sigilsPerStone, FAMILY_NAMES, FIREMAKING, FISHING_SPOTS, GEM_CUTTING, METALS, MONSTERS, PRAYERS, RELICS, RF_BUNDLES, ROCKS, SHOPS, SHOP_BUY,
  SHOP_SELL, SKILLS, SKILL_NAMES, SMELTING, SMITH_PIECES, SMITH_XP, SPELLS, TREES, WARDROBE, XP_TABLE, isItem, item, levelForXp, smithLevel,
  type EquipSlot, type MetalId, type Skill, type Spell, type SpotKind, type WardrobeId,
} from "./data.ts";
import { cleanDaily } from "./daily.ts";
import { FIRST_STEPS, updateFirstSteps } from "./firststeps.ts";
import { cleanMet } from "./hiscores.ts";
import { addSlayerPoints, slayerBoost, slayerKill, slayerProblem, taskText } from "./slayer.ts";
import { NPCS, examineItem, npcDef, onMonsterKilled, questDone, searchCryptChest, searchWell, talk, tanHides, useCryptAltar } from "./content.ts";
import {
  BANK_SIZE, DAY_MS, INVENTORY_SIZE, REFERRAL_COINS, REFERRALS_PER_DAY, REFERRAL_TICKS, addXp, attackSpeed, bonuses, canHold, count, dropItem, emit, freeSlots, give, giveOrDrop, has, hasTool, isStaffEquipped,
  level, maxHp, maxPrayer, message, prayerBoost, riding, sound, take, weapon, combatLevel, createGame,
  type Activity, type CombatStyle, type Dialogue, type Game, type Monster, type Npc, type Point, type Recipe, type Slot, type Target,
} from "./state.ts";
import { FLOOR_Y, T, W, H, inBounds, isUnderground, isWater, objectAtTile, realPoint, regionAt, terrainAt, tileIndex, walkable, type WorldObject } from "./world.ts";

export { createGame };

// ---------- Movement ----------
export function fireAt(game: Game, x: number, y: number) { return game.fires.find(fire => fire.x === x && fire.y === y) ?? null; }
export function canWalk(game: Game, x: number, y: number) { return walkable(game.world, x, y) && !fireAt(game, x, y); }
function canStep(game: Game, x: number, y: number, dx: number, dy: number) {
  if (!canWalk(game, x + dx, y + dy)) return false;
  if (dx && dy) return canWalk(game, x + dx, y) && canWalk(game, x, y + dy);
  return true;
}
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]] as const;
const RADIUS = 104, SPAN = RADIUS * 2 + 1;
const parents = new Int32Array(SPAN * SPAN);
/**
 * Breadth-first search (8 directions, no corner cutting) from the player to any goal tile. When no goal is reachable,
 * walks to the reachable tile closest to `near`, like the old-school client does.
 */
export function findPath(game: Game, from: Point, goal: (x: number, y: number) => boolean, near?: Point): Point[] | null {
  const ox = from.x - RADIUS, oy = from.y - RADIUS;
  parents.fill(-1);
  const startIndex = RADIUS * SPAN + RADIUS, queue = new Int32Array(SPAN * SPAN);
  let head = 0, tail = 0, best = startIndex, bestDistance = near ? Math.hypot(from.x - near.x, from.y - near.y) : Infinity;
  queue[tail++] = startIndex; parents[startIndex] = startIndex;
  if (goal(from.x, from.y)) return [];
  let found = -1;
  while (head < tail) {
    const index = queue[head++], lx = index % SPAN, ly = (index - lx) / SPAN, x = lx + ox, y = ly + oy;
    for (const [dx, dy] of DIRS) {
      const nx = lx + dx, ny = ly + dy;
      if (nx < 0 || ny < 0 || nx >= SPAN || ny >= SPAN) continue;
      const next = ny * SPAN + nx;
      if (parents[next] >= 0 || !canStep(game, x, y, dx, dy)) continue;
      parents[next] = index; queue[tail++] = next;
      if (goal(x + dx, y + dy)) { found = next; break; }
      if (near) { const distance = Math.hypot(x + dx - near.x, y + dy - near.y); if (distance < bestDistance) { bestDistance = distance; best = next; } }
    }
    if (found >= 0) break;
  }
  const end = found >= 0 ? found : near && best !== startIndex ? best : -1;
  if (end < 0) return null;
  const path: Point[] = [];
  for (let index = end; index !== startIndex; index = parents[index]) path.push({ x: (index % SPAN) + ox, y: Math.floor(index / SPAN) + oy });
  return path.reverse();
}
/** A world-space heading toward (dx, dy); kept when the step is zero. */
function headingTo(dx: number, dy: number, current: Point): Point {
  return dx || dy ? { x: Math.sign(dx), y: Math.sign(dy) } : current;
}
function face(game: Game, x: number, y: number) {
  const player = game.player;
  player.heading = headingTo(x - player.x, y - player.y, player.heading);
}
function moveTo(game: Game, x: number, y: number) {
  const player = game.player;
  game.trail.push({ x: player.x, y: player.y }); if (game.trail.length > 8) game.trail.shift();
  player.prev = { x: player.x, y: player.y }; player.heading = headingTo(x - player.x, y - player.y, player.heading);
  player.x = x; player.y = y; player.moved = game.tick;
}
function stopAll(game: Game) {
  const player = game.player;
  player.path = []; player.target = null; player.activity = null; player.combat = null;
}
/** Click-to-walk. Cancels whatever the player was doing. */
export function walkTo(game: Game, x: number, y: number) {
  if (game.player.stunned > 0) { message(game, "You're stunned!", "warn"); return false; }
  stopAll(game); closeInterfaces(game);
  const path = findPath(game, game.player, (px, py) => px === x && py === y, { x, y });
  if (!path) return false;
  game.player.path = path;
  return true;
}
/** Held movement direction as a world-space vector (the UI converts WASD for the current camera angle). */
export function setHeld(game: Game, held: { dx: number; dy: number } | null) {
  if (held && (held.dx || held.dy)) {
    if (!game.held) { stopAll(game); closeInterfaces(game); }
    game.held = held;
  } else game.held = null;
}
export function closeInterfaces(game: Game) {
  game.ui.bank = false; game.ui.shop = null; game.ui.production = null; game.dialogue = null;
}

// ---------- Targets and reach ----------
const footprint = (monster: Monster) => monster.def.size ?? 1;
function adjacentTo(x: number, y: number, tx: number, ty: number, size = 1) {
  // Cardinal adjacency to a size × size footprint whose corner is (tx, ty).
  const insideX = x >= tx && x < tx + size, insideY = y >= ty && y < ty + size;
  return (insideX && (y === ty - 1 || y === ty + size)) || (insideY && (x === tx - 1 || x === tx + size));
}
const chebyshev = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const monsterByUid = (game: Game, uid: number) => game.monsters.find(monster => monster.uid === uid && !monster.dead) ?? null;
export const npcByUid = (game: Game, uid: number) => game.npcs.find(npc => npc.uid === uid) ?? null;
function targetPoint(game: Game, target: Target): (Point & { size?: number; object?: WorldObject }) | null {
  switch (target.kind) {
    case "object": { const object = game.world.objects[target.id]; return object ? { x: object.x, y: object.y, object } : null; }
    case "npc": { const npc = npcByUid(game, target.uid); return npc ? { x: npc.x, y: npc.y } : null; }
    case "monster": { const monster = monsterByUid(game, target.uid); return monster ? { x: monster.x, y: monster.y, size: footprint(monster) } : null; }
    case "ground": { const ground = game.ground.find(entry => entry.uid === target.uid); return ground ? { x: ground.x, y: ground.y } : null; }
    case "fire": { const fire = game.fires.find(entry => entry.uid === target.uid); return fire ? { x: fire.x, y: fire.y } : null; }
  }
}
function magicRange(target: Target) { return target.kind === "monster" && (target.spell || target.option === "Attack") ? 8 : 0; }
/** A bow's reach (Longrange adds two), or 0 for melee. */
export function bowRange(game: Game) { const bow = weapon(game.player)?.equip?.bow; return bow ? bow.range + (game.player.style === "defensive" ? 2 : 0) : 0; }
/** Tiles between a point and the nearest tile of a size × size footprint (0 inside it). */
function reachGap(at: Point, x: number, y: number, size = 1) { const { gx, gy } = gapTo(at, x, y, size); return Math.max(gx, gy); }
function inReach(game: Game, target: Target, at: Point, point: Point & { size?: number; object?: WorldObject }) {
  if (target.kind === "monster" && castingSpell(game, target)) return chebyshev(at, point) <= magicRange(target) && chebyshev(at, point) >= 1;
  if (target.kind === "monster" && target.option === "Attack" && bowRange(game)) { const gap = reachGap(at, point.x, point.y, point.size ?? 1); return gap >= 1 && gap <= bowRange(game); }
  if (target.kind === "ground" && target.spell) return chebyshev(at, point) <= 8;
  if (target.kind === "ground") return at.x === point.x && at.y === point.y || (!canWalk(game, point.x, point.y) && adjacentTo(at.x, at.y, point.x, point.y));
  if (target.kind === "object" && point.object && !point.object.blocks) return chebyshev(at, point) <= 1;
  return adjacentTo(at.x, at.y, point.x, point.y, point.size ?? 1);
}
function castingSpell(game: Game, target: Target): Spell | null {
  if (target.kind !== "monster") return null;
  const id = target.spell ?? (target.option === "Attack" ? game.player.autocast : null);
  return id ? SPELLS.find(spell => spell.id === id) ?? null : null;
}
/** Start walking to a target and act on arrival. */
export function setTarget(game: Game, target: Target) {
  const player = game.player;
  if (player.stunned > 0) { message(game, "You're stunned!", "warn"); return; }
  closeInterfaces(game);
  player.activity = null; player.combat = null; player.target = target; game.held = null;
  routeToTarget(game);
}
function routeToTarget(game: Game) {
  const player = game.player, target = player.target;
  if (!target) return;
  const point = targetPoint(game, target);
  if (!point) { player.target = null; return; }
  if (inReach(game, target, player, point)) { player.path = []; return; }
  const path = findPath(game, player, (x, y) => inReach(game, target, { x, y }, point), point);
  player.path = path ?? [];
  if (!path) { message(game, "I can't reach that!", "warn"); player.target = null; }
}

// ---------- Menus ----------
/** Something under the pointer. "peer" is another player (its id is their Friend ID). */
export type Pick = { kind: "monster" | "npc" | "object" | "ground" | "fire" | "peer" | "pground"; id: number };
export type MenuOption = { verb: string; noun: string; tone: "object" | "npc" | "monster" | "item" | "plain" | "level"; run: (game: Game) => void };
export type Selection = { kind: "item"; slot: number } | { kind: "spell"; spell: string } | null;
const OBJECT_EXAMINE: Partial<Record<string, string>> = {
  range: "A hot range. Good for cooking.", furnace: "A red hot furnace.", anvil: "Used for smithing.", bank: "A place to keep your things safe.",
  altar: "An altar to the Old Friend.", fountain: "The water sparkles.", mill: "Grain goes in, flour comes out.", dairy_cow: "Fat and full of milk.",
  wheat: "Some ripe wheat.", coop: "Feathers everywhere.", casket: "A chest of Rare Caskets, sold for simulated $RAREFRIENDS.", tanning: "Hides stretched out to dry.",
  well: "A deep stone well.", sign: "A signpost.", sigil_altar: "An old altar. Press sigil stones into it to make sigils.", stump: "This tree has been cut down.", spot: "Ripples on the water.", gate: "An old gate, sealed with shadow.",
};
function objectOptions(game: Game, object: WorldObject): string[] {
  if (game.depleted.has(object.id) && (object.kind === "tree" || object.kind === "rock" || object.kind === "stall" || object.kind === "wheat")) return [];
  switch (object.kind) {
    case "tree": return ["Chop down"];
    case "rock": return ["Mine", "Prospect"];
    case "spot": { const spot = FISHING_SPOTS[object.spot!]; return object.spot === "bait" ? ["Bait", "Net"] : object.spot === "lure" ? ["Lure", "Bait"] : object.spot === "cage" ? ["Cage", "Harpoon"] : [spot.action]; }
    case "range": return ["Cook"];
    case "furnace": return ["Smelt"];
    case "anvil": return ["Smith"];
    case "bank": return ["Bank"];
    case "altar": return object.text === "crypt" ? ["Pray-at", "Search"] : ["Pray-at"];
    case "ladder": case "obstacle": case "gate": return [object.action ?? "Use"];
    case "stall": return ["Steal-from"];
    case "mill": return ["Operate"];
    case "dairy_cow": return ["Milk"];
    case "wheat": return ["Pick"];
    case "coop": return ["Take-egg"];
    case "casket": return ["Open-caskets"];
    case "sign": return ["Read"];
    case "tanning": return ["Tan"];
    case "well": return ["Search"];
    case "sigil_altar": return ["Craft-sigil"];
    case "decor": return object.decor === "chest" ? ["Search"] : [];
    default: return [];
  }
}
const objectName = (game: Game, object: WorldObject) => object.kind === "tree" && game.depleted.has(object.id) ? "Tree stump" : object.kind === "rock" && game.depleted.has(object.id) ? "Rocks" : object.name;
/** Every option for the things under the pointer, in old-school order. The first one is the left-click action. */
export function menuFor(game: Game, picks: readonly Pick[], tile: Point | null, selection: Selection = null): MenuOption[] {
  const out: MenuOption[] = [], player = game.player;
  const used = selection?.kind === "item" ? player.inventory[selection.slot] : null;
  const spell = selection?.kind === "spell" ? SPELLS.find(entry => entry.id === selection.spell) : null;
  const useLabel = used ? `Use ${item(used.id).name} ->` : spell ? `Cast ${spell.name} ->` : null;
  for (const pick of picks) {
    if (pick.kind === "monster") {
      const monster = monsterByUid(game, pick.id);
      if (!monster) continue;
      const noun = `${monster.def.name}  (level-${monster.def.level})`;
      if (spell) { if (spell.target === "monster") out.push({ verb: useLabel!, noun, tone: "monster", run: g => setTarget(g, { kind: "monster", uid: monster.uid, option: "Cast", spell: spell.id }) }); continue; }
      if (used) { out.push({ verb: useLabel!, noun, tone: "monster", run: g => message(g, "Nothing interesting happens.") }); continue; }
      out.push({ verb: "Attack", noun, tone: "monster", run: g => setTarget(g, { kind: "monster", uid: monster.uid, option: "Attack" }) });
      out.push({ verb: "Examine", noun: monster.def.name, tone: "monster", run: g => message(g, monster.def.examine) });
    } else if (pick.kind === "npc") {
      const npc = npcByUid(game, pick.id);
      if (!npc) continue;
      const def = npcDef(npc.id);
      if (spell) continue;
      if (used && selection?.kind === "item") { out.push({ verb: useLabel!, noun: def.name, tone: "npc", run: g => setTarget(g, { kind: "npc", uid: npc.uid, option: "Use", use: selection.slot }) }); continue; }
      for (const option of def.options) out.push({ verb: option, noun: def.name, tone: "npc", run: g => setTarget(g, { kind: "npc", uid: npc.uid, option }) });
      out.push({ verb: "Examine", noun: def.name, tone: "npc", run: g => message(g, def.examine) });
    } else if (pick.kind === "object") {
      const object = game.world.objects[pick.id];
      if (!object || object.name === "__removed") continue;
      const name = objectName(game, object);
      if (useLabel && selection?.kind === "item") { out.push({ verb: useLabel, noun: name, tone: "object", run: g => setTarget(g, { kind: "object", id: object.id, option: "Use", use: selection.slot }) }); continue; }
      if (useLabel) continue;
      for (const option of objectOptions(game, object)) out.push({ verb: option, noun: name, tone: "object", run: g => setTarget(g, { kind: "object", id: object.id, option }) });
      out.push({ verb: "Examine", noun: name, tone: "object", run: g => message(g, examineObject(g, object)) });
    } else if (pick.kind === "ground") {
      const ground = game.ground.find(entry => entry.uid === pick.id);
      if (!ground) continue;
      const noun = ground.n > 1 ? `${item(ground.id).name} (${ground.n})` : item(ground.id).name;
      if (spell?.target === "ground") { out.push({ verb: useLabel!, noun, tone: "item", run: g => setTarget(g, { kind: "ground", uid: ground.uid, option: "Cast", spell: spell.id }) }); continue; }
      if (useLabel) continue;
      out.push({ verb: "Take", noun, tone: "item", run: g => setTarget(g, { kind: "ground", uid: ground.uid, option: "Take" }) });
      out.push({ verb: "Examine", noun: item(ground.id).name, tone: "item", run: g => message(g, examineItem(ground.id)) });
    } else if (pick.kind === "fire") {
      const fire = game.fires.find(entry => entry.uid === pick.id);
      if (!fire) continue;
      if (useLabel && selection?.kind === "item") { out.push({ verb: useLabel, noun: "Fire", tone: "object", run: g => setTarget(g, { kind: "fire", uid: fire.uid, option: "Use", use: selection.slot }) }); continue; }
      out.push({ verb: "Cook-at", noun: "Fire", tone: "object", run: g => setTarget(g, { kind: "fire", uid: fire.uid, option: "Cook" }) });
      out.push({ verb: "Examine", noun: "Fire", tone: "object", run: g => message(g, "A crackling fire.") });
    }
  }
  if (tile) {
    const walk: MenuOption = { verb: "Walk here", noun: "", tone: "plain", run: g => { walkTo(g, tile.x, tile.y); } };
    // Old-school rule: on bare ground, Walk here is the left-click; over things, their first option is.
    const firstReal = out.findIndex(option => option.verb !== "Examine");
    if (firstReal === 0) out.splice(1, 0, walk); else out.unshift(walk);
  }
  return out;
}
function examineObject(game: Game, object: WorldObject): string {
  if (object.kind === "tree") return game.depleted.has(object.id) ? "This tree has been cut down." : `A ${object.name.toLowerCase()}. Woodcutting level ${TREES[object.tree!].level}.`;
  if (object.kind === "rock") return game.depleted.has(object.id) ? "There is currently no ore available in this rock." : `A rock. Mining level ${ROCKS[object.rock!].level}.`;
  if (object.kind === "spot") return `A ${object.name.toLowerCase()}. ${FISHING_SPOTS[object.spot!].catches.map(entry => `${item(entry.fish).name.replace("Raw ", "")} at ${entry.level}`).join(", ")}.`;
  if (object.kind === "obstacle") return `${object.name}. Agility level ${object.obstacle!.level}.`;
  if (object.kind === "stall") return `A ${object.name.toLowerCase()}. Thieving level ${STALLS[object.stall!].level}.`;
  if (object.kind === "decor") return DECOR_EXAMINE[object.decor!] ?? "Nothing special.";
  if (object.kind === "sign") return object.text ?? "A signpost.";
  return OBJECT_EXAMINE[object.kind] ?? object.name;
}
const DECOR_EXAMINE: Partial<Record<string, string>> = {
  statue: "A statue of the First Friend. It looks a lot like yours.", windmill: "Its sails creak in the wind.", snowman: "A Friend made of snow. Its carrot is a pinecone.",
  tent: "Smells of Grumblin.", grave: "Here lies a Friend.", chest: "An old chest.", boat: "It's seen better days.", pillar: "Old stone. Older than the Realm.",
  fence: "A wooden fence.", pine: "A snowy pine.", cactus: "Don't hug it.", palm: "Coconuts, out of reach.", torch: "It flickers.", banner: "The banner of Friendhollow Castle.",
  throne: "Carved oak, gilded, and a cushion somebody sat on too long.", armour: "An empty suit of ashsteel armour. Probably empty.", bed: "Very soft. No time for naps.",
};

// ---------- Inventory actions ----------
export type ItemOption = { verb: string; run: (game: Game) => Selection | void };
export function itemOptions(game: Game, slotIndex: number): ItemOption[] {
  const slot = game.player.inventory[slotIndex];
  if (!slot) return [];
  const definition = item(slot.id), out: ItemOption[] = [];
  if (definition.heal) out.push({ verb: "Eat", run: g => eat(g, slotIndex) });
  if (definition.bones) out.push({ verb: "Bury", run: g => bury(g, slotIndex) });
  if (definition.equip) out.push({ verb: definition.equip.slot === "weapon" || definition.equip.slot === "shield" ? "Wield" : "Wear", run: g => equip(g, slotIndex) });
  if (FIREMAKING[slot.id]) out.push({ verb: "Light", run: g => lightFire(g, slotIndex) });
  if (slot.id === "glimmer_shard") out.push({ verb: "Look-at", run: g => message(g, "The shard hums. Old Glimmer will want it back.") });
  if (definition.tablet) out.push({ verb: "Break", run: g => breakTablet(g, slotIndex) });
  if (slot.id === "insight_lamp") out.push({ verb: "Rub", run: g => { g.ui.lamp = slotIndex; } });
  if (slot.id === "slayer_gem") out.push({ verb: "Check", run: g => message(g, taskText(g)) });
  out.push({ verb: "Use", run: () => ({ kind: "item", slot: slotIndex }) });
  out.push({ verb: "Drop", run: g => drop(g, slotIndex) });
  out.push({ verb: "Examine", run: g => message(g, slot.n >= 100_000 ? `${slot.n.toLocaleString()} x ${definition.name}` : definition.examine) });
  return out;
}
export function eat(game: Game, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot || !item(slot.id).heal) return;
  if (player.eatTimer > 0) return;
  const heal = item(slot.id).heal!, before = player.hp;
  player.hp = Math.min(maxHp(player), player.hp + heal);
  if (slot.id === "cake") { player.inventory[slotIndex] = null; } else take(player, slot.id);
  player.eatTimer = 3; if (player.combat !== null) player.attackTimer = Math.max(player.attackTimer, 3);
  message(game, `You eat the ${item(slot.id).name.toLowerCase()}.${player.hp > before ? " It heals some health." : ""}`); sound(game, "eat");
}
export function bury(game: Game, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot || !item(slot.id).bones) return;
  player.inventory[slotIndex] = null;
  const bonus = player.familyId === 0 ? 1.5 : 1;
  addXp(game, "prayer", item(slot.id).bones! * bonus); message(game, "You dig a hole in the ground… You bury the bones."); sound(game, "bury");
  player.activity = null;
}
export function drop(game: Game, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot) return;
  player.inventory[slotIndex] = null;
  // Tradeable things you drop are shared: other players see them and can pick them up.
  dropItem(game, slot.id, slot.n, player.x, player.y, 200, item(slot.id).tradeable !== false); sound(game, "drop");
}
export function equip(game: Game, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot) return;
  const definition = item(slot.id), equip = definition.equip;
  if (!equip) return;
  for (const [skill, needed] of Object.entries(equip.requires ?? {}) as [Skill, number][]) {
    if (level(game, skill) < needed) { message(game, `You need a ${SKILL_NAMES[skill]} level of ${needed} to ${equip.slot === "weapon" ? "wield" : "wear"} this.`, "warn"); return; }
  }
  const previous = player.equipment[equip.slot];
  // Bows take both hands: wielding one takes off your shield, and a shield takes off a bow.
  const shieldOff = equip.slot === "weapon" && equip.twoHanded ? player.equipment.shield : undefined;
  const weaponOff = equip.slot === "shield" && player.equipment.weapon && item(player.equipment.weapon).equip?.twoHanded ? player.equipment.weapon : undefined;
  if ((shieldOff || weaponOff) && previous && freeSlots(player) === 0) { message(game, "You need a free inventory space to do that.", "warn"); return; }
  player.inventory[slotIndex] = previous ? { id: previous, n: 1 } : null;
  player.equipment[equip.slot] = slot.id;
  if (shieldOff) { delete player.equipment.shield; give(player, shieldOff); }
  if (weaponOff) { delete player.equipment.weapon; give(player, weaponOff); }
  if (equip.slot === "weapon" && player.autocast && !equip.staff) player.autocast = null;
  sound(game, "equip");
}
export function unequip(game: Game, slot: EquipSlot) {
  const player = game.player, id = player.equipment[slot];
  if (!id) return;
  if (freeSlots(player) === 0) { message(game, "You don't have enough free inventory space to do that.", "warn"); return; }
  give(player, id); delete player.equipment[slot];
  if (slot === "weapon") player.autocast = null;
  sound(game, "equip");
}
export function swapSlots(game: Game, a: number, b: number) {
  const inventory = game.player.inventory;
  if (a === b || a < 0 || b < 0 || a >= INVENTORY_SIZE || b >= INVENTORY_SIZE) return;
  [inventory[a], inventory[b]] = [inventory[b], inventory[a]];
}
/** Item on item. */
export function useItemOnItem(game: Game, a: number, b: number) {
  const player = game.player, first = player.inventory[a], second = player.inventory[b];
  if (!first || !second || a === b) return;
  const pair = (x: string, y: string) => (first.id === x && second.id === y) || (first.id === y && second.id === x);
  const other = (id: string) => (first.id === id ? second : first);
  if (first.id === "tinderbox" || second.id === "tinderbox") {
    const logs = first.id === "tinderbox" ? b : a;
    if (FIREMAKING[player.inventory[logs]!.id]) { lightFire(game, logs); return; }
  }
  if (first.id === "needle" || second.id === "needle") {
    if (other("needle").id === "leather" || other("needle").id === "drakehide") { openCrafting(game); return; }
  }
  // Fletching: a knife on logs, feathers on shafts, heads on headless arrows.
  if (first.id === "knife" || second.id === "knife") {
    const log = other("knife").id, bow = FLETCH_BOWS.find(entry => entry.log === log);
    if (bow) { game.ui.production = { title: "What would you like to fletch?", recipes: fletchingRecipes(log) }; return; }
  }
  if (pair("feather", "arrow_shaft")) { startProduction(game, headlessRecipe(), 100); return; }
  const heads = [first.id, second.id].find(id => id.endsWith("_arrowheads"));
  if (heads && (first.id === "headless_arrow" || second.id === "headless_arrow")) { startProduction(game, arrowRecipe(heads.replace("_arrowheads", "") as MetalId), 100); return; }
  if (first.id === "chisel" || second.id === "chisel") {
    const gem = other("chisel").id;
    if (GEM_CUTTING[gem]) { const cut = GEM_CUTTING[gem]; startProduction(game, { skill: "crafting", label: item(cut.cut).name, level: cut.level, xp: cut.xp, ticks: 2, inputs: { [gem]: 1 }, outputs: { [cut.cut]: 1 }, tools: ["chisel"] }, 28); return; }
  }
  if (pair("grain", "pot")) { message(game, "You need to grind the grain at the mill first."); return; }
  message(game, "Nothing interesting happens.");
}

// ---------- Firemaking ----------
const NO_FIRE = new Set<number>([T.WOOD, T.STONE, T.CARPET, T.BRIDGE, T.WALL, T.COBBLE]);
export function lightFire(game: Game, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot || !FIREMAKING[slot.id]) return;
  if (!hasTool(player, "tinderbox")) { message(game, "You need a tinderbox to light a fire.", "warn"); return; }
  const needed = FIREMAKING[slot.id].level;
  if (level(game, "firemaking") < needed) { message(game, `You need a Firemaking level of ${needed} to burn ${item(slot.id).name.toLowerCase()}.`, "warn"); return; }
  if (NO_FIRE.has(terrainAt(game.world, player.x, player.y)) || objectAtTile(game.world, player.x, player.y) || fireAt(game, player.x, player.y)) { message(game, "You can't light a fire here.", "warn"); return; }
  stopAll(game);
  player.activity = { kind: "firemake", slot: slotIndex, timer: 2 };
  message(game, "You attempt to light the logs.");
}

// ---------- Production ----------
export function recipeProblem(game: Game, recipe: Recipe): string | null {
  const player = game.player;
  if (level(game, recipe.skill) < recipe.level) return `You need a ${SKILL_NAMES[recipe.skill]} level of ${recipe.level} to make that.`;
  for (const tool of recipe.tools ?? []) if (!hasTool(player, tool)) return `You need a ${item(tool).name.toLowerCase()} to do that.`;
  for (const [id, n] of Object.entries(recipe.inputs)) if (count(player, id) < n) return `You don't have enough ${item(id).name.toLowerCase()} to make that.`;
  if (recipe.coins && count(player, "coins") < recipe.coins) return "You don't have enough coins.";
  return null;
}
export function startProduction(game: Game, recipe: Recipe, n: number) {
  const problem = recipeProblem(game, recipe);
  game.ui.production = null;
  if (problem) { message(game, problem, "warn"); return; }
  game.player.activity = { kind: "produce", recipe, timer: 1, left: n };
}
export function smeltingRecipes(): Recipe[] {
  return METALS.map(metal => {
    const smelt = SMELTING[metal.id];
    return { skill: "smithing", label: `${metal.name} bar`, level: smelt.level, xp: smelt.xp, ticks: 4, station: "furnace", inputs: smelt.ores, outputs: { [`${metal.id}_bar`]: 1 }, chance: smelt.chance } satisfies Recipe;
  });
}
export function smithingRecipes(metal: MetalId): Recipe[] {
  const name = METALS.find(entry => entry.id === metal)!.name;
  return [...SMITH_PIECES.map(piece => ({
    skill: "smithing" as const, label: `${name} ${piece.name}`, level: smithLevel(metal, piece.piece), xp: SMITH_XP[metal] * piece.bars,
    ticks: 5, station: "anvil" as const, inputs: { [`${metal}_bar`]: piece.bars }, outputs: { [`${metal}_${piece.piece}`]: 1 }, tools: ["hammer"],
  })),
  // Arrowheads for Fletching: fifteen from a bar.
  { skill: "smithing" as const, label: `15 ${name.toLowerCase()} arrowheads`, level: Math.min(99, SMITHING_BASE_OF(metal) + 5), xp: SMITH_XP[metal], ticks: 4, station: "anvil" as const,
    inputs: { [`${metal}_bar`]: 1 }, outputs: { [`${metal}_arrowheads`]: 15 }, tools: ["hammer"] }];
}
const SMITHING_BASE_OF = (metal: MetalId) => smithLevel(metal, "dagger");
// ---------- Sigilcraft ----------
/** Press every sigil stone you carry into this altar's sigil. */
export function craftSigils(game: Game, object: WorldObject) {
  const player = game.player, entry = SIGILCRAFT.find(row => row.sigil === object.sigil);
  if (!entry) return 0;
  if (level(game, "sigilcraft") < entry.level) { message(game, `You need a Sigilcraft level of ${entry.level} to press ${item(entry.sigil).name.toLowerCase()}s.`, "warn"); return 0; }
  const stones = count(player, "sigil_stone");
  if (!stones) { message(game, "You need sigil stones. Mine them in the Wizards' Tower.", "warn"); return 0; }
  const each = sigilsPerStone(level(game, "sigilcraft"), entry.level), made = stones * each;
  take(player, "sigil_stone", stones); give(player, entry.sigil, made);
  addXp(game, "sigilcraft", entry.xp * stones); sound(game, "spell");
  emit(game, { type: "cast", spell: "sigilcraft", tick: game.tick });
  message(game, `You press ${made} ${item(entry.sigil).name.toLowerCase()}s${each > 1 ? ` (${each} per stone)` : ""}.`);
  rollPet(game, "mote", level(game, "sigilcraft"));
  return made;
}
/** Fletching: arrow shafts (15 a log) or a bow from one kind of log. */
export function fletchingRecipes(log: string): Recipe[] {
  const bow = FLETCH_BOWS.find(entry => entry.log === log)!;
  return [
    { skill: "fletching", label: "15 arrow shafts", level: 1, xp: 5, ticks: 3, inputs: { [log]: 1 }, outputs: { arrow_shaft: 15 }, tools: ["knife"] },
    { skill: "fletching", label: item(bow.bow).name, level: bow.level, xp: bow.xp, ticks: 3, inputs: { [log]: 1 }, outputs: { [bow.bow]: 1 }, tools: ["knife"] },
  ];
}
export const headlessRecipe = (): Recipe => ({ skill: "fletching", label: "15 headless arrows", level: 1, xp: 15, ticks: 2, inputs: { arrow_shaft: 15, feather: 15 }, outputs: { headless_arrow: 15 } });
export function arrowRecipe(metal: MetalId): Recipe {
  const tier = FLETCH_ARROWS[metal], name = METALS.find(entry => entry.id === metal)!.name;
  return { skill: "fletching", label: `15 ${name.toLowerCase()} arrows`, level: tier.level, xp: tier.xp * 15, ticks: 2, inputs: { headless_arrow: 15, [`${metal}_arrowheads`]: 15 }, outputs: { [`${metal}_arrow`]: 15 } };
}
export function craftingRecipes(): Recipe[] {
  return CRAFTING.map(entry => ({ skill: "crafting" as const, label: item(entry.product).name, level: entry.level, xp: entry.xp, ticks: 3, inputs: { [entry.hide ?? "leather"]: entry.leather, thread: 1 }, outputs: { [entry.product]: 1 }, tools: ["needle"] }));
}
function openCrafting(game: Game) { game.ui.production = { title: "What would you like to make?", recipes: craftingRecipes() }; }
function openSmithing(game: Game) {
  const player = game.player, metals = METALS.filter(metal => has(player, `${metal.id}_bar`));
  if (!hasTool(player, "hammer")) { message(game, "You need a hammer to work the metal with.", "warn"); return; }
  if (!metals.length) { message(game, "You should select an item from your inventory and use it on the anvil. You don't have any bars.", "warn"); return; }
  const metal = [...metals].sort((a, b) => b.tier - a.tier).find(entry => level(game, "smithing") >= SMELTING[entry.id].level) ?? metals[0];
  game.ui.production = { title: `What would you like to make with ${metal.name.toLowerCase()}?`, recipes: smithingRecipes(metal.id) };
}

// ---------- Interactions on arrival ----------
function interact(game: Game) {
  const player = game.player, target = player.target!;
  const point = targetPoint(game, target);
  if (!point) { player.target = null; return; }
  face(game, point.x, point.y);
  player.target = null;
  if (target.kind === "monster") {
    const monster = monsterByUid(game, target.uid);
    if (!monster) return;
    player.combat = monster.uid; player.lastHitBy = null;
    if (target.spell) player.autocast = isStaffEquipped(player) ? player.autocast : null;
    player.queuedSpell = target.spell ?? null;
    return;
  }
  if (target.kind === "ground") {
    const index = game.ground.findIndex(entry => entry.uid === target.uid);
    if (index < 0) return;
    const ground = game.ground[index];
    if (target.spell) { telegrab(game, target.spell, index); return; }
    if (!canHold(player, ground.id, ground.n)) { message(game, "You don't have enough inventory space to hold that item.", "warn"); return; }
    give(player, ground.id, ground.n); game.ground.splice(index, 1); sound(game, "pickup");
    return;
  }
  if (target.kind === "fire") {
    const raw = target.use !== undefined ? player.inventory[target.use]?.id : firstRaw(game);
    startCooking(game, "fire", target.uid, raw);
    return;
  }
  if (target.kind === "npc") { interactNpc(game, target.uid, target.option, target.use); return; }
  interactObject(game, point.object!, target.option, target.use);
}
const firstRaw = (game: Game) => game.player.inventory.find(slot => slot && COOKING[slot.id])?.id;
function startCooking(game: Game, source: "range" | "fire", sourceId: number, raw: string | undefined) {
  if (!raw || !COOKING[raw]) { message(game, raw ? "You can't cook that." : "You don't have anything to cook.", "warn"); return; }
  const recipe = COOKING[raw];
  if (level(game, "cooking") < recipe.level) { message(game, `You need a Cooking level of ${recipe.level} to cook this.`, "warn"); return; }
  game.player.activity = { kind: "cook", source, sourceId, raw, timer: 1, left: count(game.player, raw) };
}

export const STALLS = {
  bakery: { level: 5, xp: 16, respawn: 4, loot: [["bread", 0.7], ["cake", 0.3]] },
  silk: { level: 20, xp: 24, respawn: 8, loot: [["silk", 1]] },
  fish: { level: 42, xp: 42, respawn: 12, loot: [["raw_inkcrab", 0.6], ["raw_sailfish", 0.4]] },
  gem: { level: 75, xp: 160, respawn: 30, loot: [["rough_moonstone", 0.65], ["rough_sagestone", 0.25], ["rough_rosestone", 0.1]] },
} as const;

function interactObject(game: Game, object: WorldObject, option: string, use?: number) {
  const player = game.player;
  if (use !== undefined) { useItemOnObject(game, object, use); return; }
  switch (object.kind) {
    case "sigil_altar": craftSigils(game, object); return;
    case "tree": {
      const tree = TREES[object.tree!], axe = bestTool(game, "axe");
      if (level(game, "woodcutting") < tree.level) { message(game, `You need a Woodcutting level of ${tree.level} to chop down this tree.`, "warn"); return; }
      if (!axe) { message(game, "You do not have an axe which you have the Woodcutting level to use.", "warn"); return; }
      if (!freeSlots(player)) { message(game, "Your inventory is too full to hold any more logs.", "warn"); return; }
      player.activity = { kind: "woodcut", objectId: object.id, timer: 3 }; message(game, "You swing your axe at the tree."); return;
    }
    case "rock": {
      const rock = ROCKS[object.rock!];
      if (option === "Prospect") { message(game, `This rock contains ${rock.ore === "rough_moonstone" ? "gems" : item(rock.ore).name.toLowerCase().replace(" ore", "")}.`); return; }
      if (level(game, "mining") < rock.level) { message(game, `You need a Mining level of ${rock.level} to mine this rock.`, "warn"); return; }
      if (!bestTool(game, "pickaxe")) { message(game, "You need a pickaxe to mine this rock. You do not have a pickaxe which you have the Mining level to use.", "warn"); return; }
      if (!freeSlots(player)) { message(game, "Your inventory is too full to hold any more ore.", "warn"); return; }
      player.activity = { kind: "mine", objectId: object.id, timer: 3 }; message(game, "You swing your pickaxe at the rock."); return;
    }
    case "spot": {
      const kind: SpotKind = option === "Net" ? "net" : option === "Bait" ? "bait" : option === "Lure" ? "lure" : option === "Cage" ? "cage" : object.spot === "deep" ? "deep" : option === "Harpoon" ? "harpoon" : object.spot!;
      const spot = FISHING_SPOTS[kind], lowest = Math.min(...spot.catches.map(entry => entry.level));
      if (level(game, "fishing") < lowest) { message(game, `You need a Fishing level of at least ${lowest} to fish here.`, "warn"); return; }
      if (!hasTool(player, spot.tool)) { message(game, `You need a ${item(spot.tool).name.toLowerCase()} to fish here.`, "warn"); return; }
      if (spot.bait && !has(player, spot.bait)) { message(game, `You don't have any ${item(spot.bait).name.toLowerCase()}s.`, "warn"); return; }
      if (!freeSlots(player)) { message(game, "You can't carry any more fish.", "warn"); return; }
      player.activity = { kind: "fish", objectId: object.id, timer: 4, spot: kind }; message(game, spot.tool === "small_net" ? "You cast out your net…" : "You attempt to catch a fish."); sound(game, "splash"); return;
    }
    case "range": startCooking(game, "range", object.id, firstRaw(game)); return;
    case "furnace": game.ui.production = { title: "What would you like to smelt?", recipes: smeltingRecipes() }; return;
    case "anvil": openSmithing(game); return;
    case "bank": game.ui.bank = true; sound(game, "click"); return;
    case "altar":
      if (option === "Search" && object.text === "crypt") { useCryptAltar(game); return; }
      if (object.text === "crypt" && player.quests.hollow_whispers === 2) { useCryptAltar(game); return; }
      if (player.prayer >= maxPrayer(player)) { message(game, "You already have full prayer points."); return; }
      player.prayer = maxPrayer(player); message(game, "You pray to the Old Friend. You recharge your prayer points."); sound(game, "pray"); return;
    case "ladder": travel(game, object.to!, `You ${object.action?.toLowerCase().replace("-", " ") ?? "climb"} the ${object.name.toLowerCase()}.`); return;
    case "gate": {
      const questOk = !object.requires?.quest || (player.quests[object.requires.quest] ?? 0) >= 1;
      if (!questOk) { message(game, "The gate is sealed with shadow. Something must be done before it opens.", "warn"); return; }
      const through = player.x < object.x ? object.to! : { x: object.x - 1, y: object.y };
      travel(game, through, "The shadow parts, and you pass through the gate."); return;
    }
    case "obstacle": {
      const obstacle = object.obstacle!;
      if (level(game, "agility") < obstacle.level) { message(game, `You need an Agility level of ${obstacle.level} to attempt this.`, "warn"); return; }
      player.activity = { kind: "obstacle", objectId: object.id, timer: obstacle.ticks, from: { x: player.x, y: player.y }, to: object.to! };
      message(game, `You ${object.action?.toLowerCase().replace("-", " ")} the ${object.name.toLowerCase()}…`); sound(game, "jump"); return;
    }
    case "stall": {
      const stall = STALLS[object.stall!];
      if (level(game, "thieving") < stall.level) { message(game, `You need a Thieving level of ${stall.level} to steal from this stall.`, "warn"); return; }
      if (!freeSlots(player)) { message(game, "Your inventory is too full.", "warn"); return; }
      player.activity = { kind: "thieve_stall", objectId: object.id, timer: 2 }; return;
    }
    case "mill":
      if (!has(player, "grain")) { message(game, "You need some grain to put in the hopper.", "warn"); return; }
      if (!has(player, "pot")) { message(game, "You need an empty pot to collect the flour.", "warn"); return; }
      take(player, "grain"); take(player, "pot"); give(player, "pot_of_flour"); message(game, "You operate the mill. Flour pours into your pot."); sound(game, "click"); return;
    case "dairy_cow":
      if (!has(player, "bucket")) { message(game, "You need a bucket to milk the cow.", "warn"); return; }
      take(player, "bucket"); give(player, "bucket_of_milk"); message(game, "You milk the cow."); sound(game, "splash"); return;
    case "wheat":
      if (!freeSlots(player)) { message(game, "Your inventory is full.", "warn"); return; }
      give(player, "grain"); game.depleted.set(object.id, game.tick + 30); message(game, "You pick some grain."); sound(game, "pickup"); return;
    case "coop":
      if (!freeSlots(player)) { message(game, "Your inventory is full.", "warn"); return; }
      give(player, "egg"); message(game, "You take an egg from the coop."); sound(game, "pickup"); return;
    case "casket": game.ui.shop = "__caskets"; sound(game, "click"); return;
    case "sign": message(game, object.text ?? "The sign is blank.", "info"); return;
    case "tanning": tanHides(game); return;
    case "well": searchWell(game); return;
    case "decor": if (object.decor === "chest") searchCryptChest(game); return;
    default: message(game, examineObject(game, object));
  }
}
function useItemOnObject(game: Game, object: WorldObject, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot) return;
  if ((object.kind === "range") && COOKING[slot.id]) { startCooking(game, "range", object.id, slot.id); return; }
  if (object.kind === "furnace" && (slot.id.endsWith("_ore") || slot.id === "inkcoal")) { interactObject(game, object, "Smelt"); return; }
  if (object.kind === "anvil" && slot.id.endsWith("_bar")) {
    const metal = slot.id.replace("_bar", "") as MetalId;
    if (!hasTool(player, "hammer")) { message(game, "You need a hammer to work the metal with.", "warn"); return; }
    game.ui.production = { title: `What would you like to make with ${metal}?`, recipes: smithingRecipes(metal) }; return;
  }
  if (object.kind === "mill" && slot.id === "grain") { interactObject(game, object, "Operate"); return; }
  if (object.kind === "dairy_cow" && slot.id === "bucket") { interactObject(game, object, "Milk"); return; }
  if (object.kind === "altar" && object.text === "crypt" && slot.id === "crypt_key") { useCryptAltar(game); return; }
  if (object.kind === "bank") { bankDepositSlot(game, slotIndex); return; }
  if (object.kind === "sigil_altar" && slot.id === "sigil_stone") { craftSigils(game, object); return; }
  if (object.kind === "well" && slot.id === "bucket") { message(game, "You fill the bucket… then think better of drinking from it, and pour it back."); return; }
  message(game, "Nothing interesting happens.");
}
function bankDepositSlot(game: Game, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot) return;
  const id = slot.id, n = count(player, id);
  take(player, id, n);
  const entry = player.bank.find(bank => bank.id === id);
  if (entry) entry.n += n; else if (player.bank.length < BANK_SIZE) player.bank.push({ id, n }); else { give(player, id, n); message(game, "Your bank is full.", "warn"); return; }
  message(game, `You deposit your ${item(id).name.toLowerCase()}.`); sound(game, "coins");
}
function interactNpc(game: Game, uid: number, option: string, use?: number) {
  const npc = npcByUid(game, uid), player = game.player;
  if (!npc) return;
  const def = npcDef(npc.id);
  npc.busy = 6; npc.heading = headingTo(player.x - npc.x, player.y - npc.y, npc.heading);
  if (use !== undefined) {
    const slot = player.inventory[use];
    if (slot?.id === "cowhide" && npc.id === "tanner") { tanHides(game); return; }
    message(game, "Nothing interesting happens."); return;
  }
  if (option === "Talk-to") { game.dialogue = talk(game, npc.id); sound(game, "click"); return; }
  if (option === "Trade" && def.shop) { game.ui.shop = def.shop; sound(game, "click"); return; }
  if (option === "Bank") { game.ui.bank = true; sound(game, "click"); return; }
  if (option === "Caskets") { game.ui.shop = "__caskets"; sound(game, "click"); return; }
  if (option === "Rare-market") { game.ui.shop = "__market"; sound(game, "click"); return; }
  if (option === "Stables") { game.ui.shop = "__stable"; sound(game, "click"); return; }
  if (option === "Stroke") { player.stats.strokes = (player.stats.strokes ?? 0) + 1; message(game, npc.id === "paddock_unicorn" ? "The unicorn lowers its horn and lets you stroke its mane. It's very soft." : "The horse nuzzles your pockets for an apple."); sound(game, "click"); return; }
  if (option === "Assignment" || option === "Rewards") { game.dialogue = talk(game, `${npc.id}:${option.toLowerCase()}`); sound(game, "click"); return; }
  if (option === "Tan-hides") { tanHides(game); return; }
  if (option === "Pickpocket" && def.pickpocket) { pickpocket(game, npc, def.pickpocket); return; }
}
function pickpocket(game: Game, npc: Npc, pick: NonNullable<ReturnType<typeof npcDef>["pickpocket"]>) {
  const player = game.player, thieving = level(game, "thieving");
  if (thieving < pick.level) { message(game, `You need a Thieving level of ${pick.level} to pickpocket this.`, "warn"); return; }
  if (!freeSlots(player) && !has(player, "coins")) { message(game, "Your inventory is too full.", "warn"); return; }
  const mask = player.familyId === 1 ? 0.1 : 0, chance = Math.min(0.95, 0.55 + (thieving - pick.level) * 0.02 + mask);
  message(game, `You attempt to pick the ${npcDef(npc.id).name.toLowerCase()}'s pocket.`);
  if (game.rng() < chance) {
    const silver = Math.min(RELICS[1].max, player.relics[1] ?? 0) * RELICS[1].coinsPer + (riding(player)?.coins ?? 0);
    const coins = Math.round((pick.coins[0] + Math.floor(game.rng() * (pick.coins[1] - pick.coins[0] + 1))) * (1 + silver));
    give(player, "coins", coins); addXp(game, "thieving", pick.xp); sound(game, "coins");
    for (const [id, p] of pick.extra ?? []) if (game.rng() < p && freeSlots(player)) give(player, id);
    message(game, `You pick the ${npcDef(npc.id).name.toLowerCase()}'s pocket.`);
  } else {
    const stun = player.familyId === 1 ? Math.ceil(pick.stun / 2) : pick.stun;
    player.stunned = stun; player.path = []; damagePlayer(game, 1 + Math.floor(game.rng() * pick.damage), null);
    npcSay(game, npc, "What do you think you're doing?");
    message(game, "You fail to pick the pocket. You've been stunned!", "warn"); sound(game, "stun");
  }
}
export function npcOverhead(game: Game, uid: number) { const entry = game.overheads.get(uid); return entry && entry.until > game.tick ? entry.text : null; }
function npcSay(game: Game, npc: Npc, text: string) { game.overheads.set(npc.uid, { text, until: game.tick + 5 }); }
function travel(game: Game, to: { x: number; y: number }, text: string) {
  const player = game.player;
  stopAll(game);
  player.prev = { x: to.x, y: to.y }; player.x = to.x; player.y = to.y; player.moved = game.tick - 10;
  game.trail = [];
  for (const monster of game.monsters) monster.target = false;
  message(game, text); sound(game, "door");
}

// ---------- Tools ----------
function bestTool(game: Game, kind: "axe" | "pickaxe") {
  const player = game.player, skill = kind === "axe" ? "woodcutting" : "mining", owned = [...player.inventory.map(slot => slot?.id), player.equipment.weapon];
  let best: { tier: number; id: string } | null = null;
  for (const id of owned) {
    const tool = id ? item(id).tool : undefined;
    if (tool?.kind === kind && level(game, skill) >= tool.level && (!best || tool.tier > best.tier)) best = { tier: tool.tier, id: id! };
  }
  return best;
}
/** The old-school gathering roll: interpolate between `low` at level 1 and `high` at level 99, out of 256. */
export function successChance(skillLevel: number, low: number, high: number) {
  const clamped = Math.max(1, Math.min(99, skillLevel));
  return Math.min(1, (1 + Math.floor(low * (99 - clamped) / 98 + high * (clamped - 1) / 98 + 0.5)) / 256);
}

// ---------- Tick ----------
export function tick(game: Game) {
  updateFirstSteps(game);
  game.tick++; game.playTicks++;
  const player = game.player;
  if (player.stunned > 0) player.stunned--;
  if (player.eatTimer > 0) player.eatTimer--;
  if (player.castTimer > 0) player.castTimer--;
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.overhead && player.overhead.until <= game.tick) player.overhead = null;
  movePlayer(game);
  rideUpkeep(game);
  if (player.boostTicks > 0) { player.boostTicks--; if (player.boostTicks === 0) message(game, "Your referral XP boost has run out. Refer another friend for more!"); }
  // An emote ends when it's done, or when you walk off.
  if (player.emote && (game.tick >= player.emote.until || player.moved === game.tick || player.combat !== null || player.activity)) player.emote = null;
  updatePet(game);
  if (player.target && !player.path.length) {
    const point = targetPoint(game, player.target);
    if (!point) player.target = null;
    else if (inReach(game, player.target, player, point)) interact(game);
    else routeToTarget(game);
  }
  runActivity(game);
  playerCombat(game);
  for (const monster of game.monsters) monsterTick(game, monster);
  for (const npc of game.npcs) npcTick(game, npc);
  upkeep(game);
}
function movePlayer(game: Game) {
  const player = game.player;
  if (player.stunned > 0) return;
  // Held keys walk one screen direction at a time.
  if (game.held) {
    // Held keys give a world-space direction (the UI turns screen keys into it for the camera angle); snap to 8 ways.
    const octant = Math.round(Math.atan2(game.held.dy, game.held.dx) / (Math.PI / 4)), tx = Math.round(Math.cos(octant * Math.PI / 4)), ty = Math.round(Math.sin(octant * Math.PI / 4));
    const mount = riding(player), steps = mount ? mount.speed : player.run && player.energy >= 1 ? 2 : 1, start = { x: player.x, y: player.y };
    let moved = 0;
    for (let i = 0; i < steps; i++) {
      const options: [number, number][] = [[tx, ty], [tx, 0], [0, ty]];
      const step = options.find(([sx, sy]) => (sx || sy) && canStep(game, player.x, player.y, sx, sy));
      if (!step) break;
      moveTo(game, player.x + step[0], player.y + step[1]); moved++;
    }
    if (moved) player.prev = start;
    if (moved >= 2 && !mount) drainRun(game);
    return;
  }
  if (!player.path.length) return;
  const mount = riding(player), steps = mount ? mount.speed : player.run && player.energy >= 1 && player.path.length > 1 ? 2 : 1, start = { x: player.x, y: player.y };
  for (let i = 0; i < steps && player.path.length; i++) {
    const next = player.path[0];
    if (!canStep(game, player.x, player.y, next.x - player.x, next.y - player.y)) {
      const destination = player.path[player.path.length - 1];
      const repath = findPath(game, player, (x, y) => x === destination.x && y === destination.y, destination);
      player.path = repath ?? [];
      break;
    }
    player.path.shift(); moveTo(game, next.x, next.y);
  }
  if (player.x !== start.x || player.y !== start.y) player.prev = start;
  if (!mount && Math.max(Math.abs(player.x - start.x), Math.abs(player.y - start.y)) >= 2) drainRun(game);
}
function drainRun(game: Game) {
  const player = game.player, drain = player.familyId === 5 ? 0.36 : 0.6;
  player.energy = Math.max(0, player.energy - drain);
  if (player.energy <= 0) { player.run = false; message(game, "You're out of run energy.", "warn"); }
}
export function toggleRun(game: Game) {
  const player = game.player;
  if (!player.run && player.energy < 1) { message(game, "You don't have enough energy left to run!", "warn"); return; }
  player.run = !player.run;
}

function runActivity(game: Game) {
  const player = game.player, activity = player.activity;
  if (!activity || player.path.length) return;
  if (--activity.timer > 0) return;
  switch (activity.kind) {
    case "woodcut": return woodcutTick(game, activity);
    case "mine": return mineTick(game, activity);
    case "fish": return fishTick(game, activity);
    case "cook": return cookTick(game, activity);
    case "produce": return produceTick(game, activity);
    case "firemake": return firemakeTick(game, activity);
    case "thieve_stall": return stallTick(game, activity);
    case "obstacle": return obstacleTick(game, activity);
    case "teleport": {
      player.activity = null;
      const place = activity.spell.startsWith("tablet:") ? activity.spell.slice(7) : SPELLS.find(spell => spell.id === activity.spell)?.teleport ?? "hollow_square";
      travel(game, activity.to, `You teleport to ${TELEPORT_NAMES[place] ?? "Friendhollow"}.`); sound(game, "teleport");
    }
  }
}
function gatherBonus(game: Game) { return 1 + Math.min(RELICS[2].max, game.player.relics[2] ?? 0) * RELICS[2].gatherPer + (riding(game.player)?.gather ?? 0); }
function woodcutTick(game: Game, activity: Extract<Activity, { kind: "woodcut" }>) {
  const player = game.player, object = game.world.objects[activity.objectId], tree = TREES[object.tree!], axe = bestTool(game, "axe");
  if (game.depleted.has(object.id) || !axe) { player.activity = null; return; }
  activity.timer = 4; // the chop sound plays on the swing animation
  const chance = Math.min(0.95, successChance(level(game, "woodcutting"), tree.low, tree.high) * (1 + 0.18 * (axe.tier - 1)) * gatherBonus(game));
  if (game.rng() >= chance) return;
  give(player, tree.log); addXp(game, "woodcutting", tree.xp);
  if (player.familyId === 4 && game.rng() < 0.08 && freeSlots(player)) { give(player, tree.log); message(game, "Lopsided luck! You get an extra log."); }
  message(game, `You get some ${item(tree.log).name.toLowerCase()}.`);
  rollPet(game, "stumpy", level(game, "woodcutting"));
  if (game.rng() < tree.deplete) { game.depleted.set(object.id, game.tick + tree.respawn + Math.floor(game.rng() * tree.respawn)); player.activity = null; sound(game, "fell"); return; }
  if (!freeSlots(player)) { message(game, "Your inventory is too full to hold any more logs.", "warn"); player.activity = null; }
}
function mineTick(game: Game, activity: Extract<Activity, { kind: "mine" }>) {
  const player = game.player, object = game.world.objects[activity.objectId], rock = ROCKS[object.rock!], pick = bestTool(game, "pickaxe");
  if (game.depleted.has(object.id) || !pick) { player.activity = null; return; }
  activity.timer = 4; // the pick sound plays on the swing animation
  const gemOdds = (player.familyId === 7 ? 3 : 1) / 256;
  if (game.rng() < gemOdds && freeSlots(player)) {
    const gem = ["rough_moonstone", "rough_moonstone", "rough_sagestone", "rough_rosestone"][Math.floor(game.rng() * 4)];
    give(player, gem); message(game, `You just found ${item(gem).name.toLowerCase().startsWith("uncut e") ? "an" : "a"} ${item(gem).name.replace("Uncut ", "").toLowerCase()}!`);
  }
  const chance = Math.min(0.95, successChance(level(game, "mining"), rock.low, rock.high) * (1 + 0.2 * (pick.tier - 1)) * gatherBonus(game));
  if (game.rng() >= chance) return;
  const ore = object.rock === "gem" ? ["rough_moonstone", "rough_moonstone", "rough_sagestone", "rough_rosestone"][Math.floor(game.rng() * 4)] : rock.ore;
  give(player, ore); addXp(game, "mining", rock.xp);
  if (player.familyId === 4 && game.rng() < 0.08 && freeSlots(player)) { give(player, ore); message(game, "Lopsided luck! You mine a second piece."); }
  if (object.rock === "sigil") { if (!freeSlots(player)) { message(game, "Your inventory is too full to hold any more sigil stones.", "warn"); player.activity = null; } return; }
  message(game, `You manage to mine some ${item(ore).name.toLowerCase().replace(" ore", "")}.`);
  rollPet(game, "pebble", level(game, "mining"));
  game.depleted.set(object.id, game.tick + rock.respawn + Math.floor(game.rng() * rock.respawn * 0.5));
  player.activity = null;
}
function fishTick(game: Game, activity: Extract<Activity, { kind: "fish" }>) {
  const player = game.player, spot = FISHING_SPOTS[activity.spot];
  activity.timer = 5;
  if (!hasTool(player, spot.tool) || (spot.bait && !has(player, spot.bait))) { message(game, "You have run out of bait.", "warn"); player.activity = null; return; }
  if (!freeSlots(player)) { message(game, "You can't carry any more fish.", "warn"); player.activity = null; return; }
  sound(game, "splash");
  for (const entry of spot.catches) {
    if (level(game, "fishing") < entry.level) continue;
    if (game.rng() >= Math.min(0.95, successChance(level(game, "fishing"), entry.low, entry.high) * gatherBonus(game))) continue;
    if (spot.bait) take(player, spot.bait);
    give(player, entry.fish); addXp(game, "fishing", entry.xp); sound(game, "catch");
    if (player.familyId === 4 && game.rng() < 0.08 && freeSlots(player)) give(player, entry.fish);
    message(game, `You catch ${entry.fish === "raw_minnows" ? "some minnows" : `a ${item(entry.fish).name.replace("Raw ", "").toLowerCase()}`}.`);
    rollPet(game, "bubbles", level(game, "fishing"));
    return;
  }
}
function cookTick(game: Game, activity: Extract<Activity, { kind: "cook" }>) {
  const player = game.player, recipe = COOKING[activity.raw];
  if (activity.source === "fire" && !game.fires.some(fire => fire.uid === activity.sourceId)) { message(game, "The fire has gone out."); player.activity = null; return; }
  if (!has(player, activity.raw) || activity.left <= 0) { player.activity = null; return; }
  activity.timer = 4; activity.left--;
  take(player, activity.raw);
  const cooking = level(game, "cooking"), span = Math.max(1, recipe.stopBurn - recipe.level);
  const burn = cooking >= recipe.stopBurn ? 0 : Math.max(0, 0.55 - (cooking - recipe.level) * (0.55 / span)) + (activity.source === "fire" ? 0.08 : 0);
  if (game.rng() < burn) { give(player, "burnt_food"); message(game, `You accidentally burn the ${item(recipe.cooked).name.toLowerCase()}.`); sound(game, "burn"); }
  else { give(player, recipe.cooked); addXp(game, "cooking", recipe.xp); message(game, `You successfully cook ${item(recipe.cooked).name.toLowerCase()}.`); sound(game, "sizzle"); }
  if (!has(player, activity.raw)) player.activity = null;
}
function produceTick(game: Game, activity: Extract<Activity, { kind: "produce" }>) {
  const player = game.player, recipe = activity.recipe;
  if (activity.left <= 0) { player.activity = null; return; }
  const problem = recipeProblem(game, recipe);
  if (problem) { if (activity.left > 0 && activity.timer <= 0) message(game, problem, "warn"); player.activity = null; return; }
  activity.timer = recipe.ticks; activity.left--;
  for (const [id, n] of Object.entries(recipe.inputs)) take(player, id, n);
  if (recipe.coins) take(player, "coins", recipe.coins);
  sound(game, recipe.station === "anvil" ? "anvil" : recipe.station === "furnace" ? "smelt" : "click");
  if (recipe.chance !== undefined && game.rng() >= recipe.chance + level(game, recipe.skill) * 0.004) { message(game, "The ore is too impure and you fail to refine it."); return; }
  for (const [id, n] of Object.entries(recipe.outputs)) give(player, id, n);
  addXp(game, recipe.skill, recipe.xp);
  message(game, recipe.station === "furnace" ? `You retrieve a bar of ${recipe.label.replace(" bar", "").toLowerCase()}.` : `You make ${aOrAn(recipe.label)} ${recipe.label.toLowerCase()}.`);
}
const aOrAn = (word: string) => /^[aeiou]/i.test(word) ? "an" : "a";
function firemakeTick(game: Game, activity: Extract<Activity, { kind: "firemake" }>) {
  const player = game.player, slot = player.inventory[activity.slot];
  if (!slot || !FIREMAKING[slot.id]) { player.activity = null; return; }
  const fm = FIREMAKING[slot.id], chance = Math.min(0.95, 0.35 + (level(game, "firemaking") - fm.level) * 0.03 + 0.1);
  if (game.rng() >= chance) { activity.timer = 2; return; }
  player.inventory[activity.slot] = null; player.activity = null;
  game.fires.push({ uid: game.nextUid++, x: player.x, y: player.y, expires: game.tick + 60 + Math.floor(game.rng() * 60) });
  addXp(game, "firemaking", fm.xp); message(game, "The fire catches and the logs begin to burn."); sound(game, "fire");
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) if (canWalk(game, player.x + dx, player.y + dy)) { moveTo(game, player.x + dx, player.y + dy); break; }
}
function stallTick(game: Game, activity: Extract<Activity, { kind: "thieve_stall" }>) {
  const player = game.player, object = game.world.objects[activity.objectId], stall = STALLS[object.stall!];
  player.activity = null;
  if (game.depleted.has(object.id)) { message(game, "The stall is empty right now."); return; }
  if (!freeSlots(player)) return;
  let roll = game.rng(), loot: string = stall.loot[0][0];
  for (const [id, p] of stall.loot) { if (roll < p) { loot = id; break; } roll -= p; }
  give(player, loot); addXp(game, "thieving", stall.xp); game.depleted.set(object.id, game.tick + stall.respawn);
  message(game, `You steal ${aOrAn(item(loot).name)} ${item(loot).name.toLowerCase()} from the stall.`); sound(game, "pickup");
}
function obstacleTick(game: Game, activity: Extract<Activity, { kind: "obstacle" }>) {
  const player = game.player, object = game.world.objects[activity.objectId], obstacle = object.obstacle!;
  player.activity = null;
  player.prev = { x: player.x, y: player.y }; player.x = activity.to.x; player.y = activity.to.y; player.moved = game.tick;
  addXp(game, "agility", obstacle.xp);
  if (obstacle.course !== "friendhollow") { message(game, "You make it across."); return; }
  if (obstacle.step === player.courseStep + 1 || obstacle.step === 0) player.courseStep = obstacle.step;
  else player.courseStep = -1;
  if (obstacle.last && player.courseStep === obstacle.step) {
    addXp(game, "agility", obstacle.lapXp ?? 0); player.courseStep = -1;
    message(game, "You complete a lap of the Friendhollow Agility Course!", "level"); sound(game, "level");
  } else message(game, "…you make it.");
}

// ---------- Combat ----------
const STYLE_BONUS: Record<CombatStyle, { attack: number; strength: number; defence: number }> = {
  accurate: { attack: 3, strength: 0, defence: 0 }, aggressive: { attack: 0, strength: 3, defence: 0 },
  defensive: { attack: 0, strength: 0, defence: 3 }, controlled: { attack: 1, strength: 1, defence: 1 },
};
export function hitChance(attackRoll: number, defenceRoll: number) {
  return attackRoll > defenceRoll ? 1 - (defenceRoll + 2) / (2 * (attackRoll + 1)) : attackRoll / (2 * (defenceRoll + 1));
}
export function playerMaxHit(game: Game) {
  const player = game.player, boost = prayerBoost(player), style = STYLE_BONUS[player.style];
  const effective = Math.floor(level(game, "strength") * (1 + boost.strength)) + style.strength + 8;
  return Math.floor(0.5 + effective * (bonuses(player).strength + 64) / 640) + (player.familyId === 6 ? 1 : 0);
}
export function playerAccuracy(game: Game, monster: Monster, factor = 1) {
  const player = game.player, boost = prayerBoost(player), style = STYLE_BONUS[player.style];
  const attack = (Math.floor(level(game, "attack") * (1 + boost.attack)) + style.attack + 8) * (bonuses(player).attack + 64) * factor;
  const defence = (monster.def.defence * cursed(game, monster, "defence") + 9) * (monster.def.defenceBonus + 64);
  return hitChance(attack, defence);
}
function spellCost(game: Game, spell: Spell) {
  const sigils = { ...spell.sigils } as Record<string, number>;
  const staff = STAFF_SIGILS[game.player.equipment.weapon ?? ""];
  if (staff) delete sigils[staff];
  return sigils;
}
export function canCast(game: Game, spell: Spell) {
  if (level(game, "magic") < spell.level) return `You need a Magic level of ${spell.level} to cast this spell.`;
  for (const [sigil, n] of Object.entries(spellCost(game, spell))) if (count(game.player, sigil) < n) return "You do not have enough sigils to cast this spell.";
  return null;
}
function playerCombat(game: Game) {
  const player = game.player;
  if (player.combat === null) return;
  const monster = monsterByUid(game, player.combat);
  if (!monster) { player.combat = null; player.queuedSpell = null; return; }
  const spellId = player.queuedSpell ?? player.autocast, spell = spellId ? SPELLS.find(entry => entry.id === spellId && entry.target === "monster") ?? null : null;
  const range = spell ? 0 : bowRange(game), boost = slayerBoost(game, monster.def.id);
  const within = (x: number, y: number) => spell ? chebyshev({ x, y }, monster) <= 8 && chebyshev({ x, y }, monster) >= 1
    : range ? reachGap({ x, y }, monster.x, monster.y, footprint(monster)) >= 1 && reachGap({ x, y }, monster.x, monster.y, footprint(monster)) <= range
    : adjacentTo(x, y, monster.x, monster.y, footprint(monster));
  if (!within(player.x, player.y)) {
    if (!player.path.length || player.path.length > 20) player.path = findPath(game, player, within, monster) ?? [];
    return;
  }
  player.path = []; face(game, monster.x, monster.y);
  if (player.attackTimer > 0) return;
  const unwoundable = slayerProblem(game, monster.def.id);
  if (unwoundable) { message(game, unwoundable, "warn"); player.combat = null; player.queuedSpell = null; return; }
  monster.target = true;
  if (!spell && range) { rangedAttack(game, monster, boost); return; }
  if (spell) {
    const problem = canCast(game, spell);
    if (problem) { message(game, problem, "warn"); player.combat = null; player.queuedSpell = null; player.autocast = null; return; }
    const echo = player.familyId === 8 && game.rng() < 0.2;
    if (!echo) for (const [sigil, n] of Object.entries(spellCost(game, spell))) take(player, sigil, n);
    player.attackTimer = 5;
    const prayers = prayerBoost(player), accuracy = (Math.floor(level(game, "magic") * (1 + prayers.magic)) + 8) * (bonuses(player).magic + 64) * (player.familyId === 8 ? 1.1 : 1) * boost;
    const defence = ((monster.def.magicDef ?? monster.def.defence) * cursed(game, monster, "defence") + 9) * (monster.def.defenceBonus + 64);
    emit(game, { type: "projectile", projectile: { from: { x: player.x, y: player.y }, to: { x: monster.x, y: monster.y }, start: game.tick, end: game.tick + 1, color: SPELL_COLORS[spell.id] ?? ELEMENT_COLORS[spell.element] ?? "#c7d3dc", style: "magic", element: spell.element } });
    sound(game, "spell");
    if (!spell.maxHit) {
      // Curses and Bind: a magic accuracy roll, then an effect instead of damage.
      player.queuedSpell = null; player.combat = null;
      if (game.rng() >= hitChance(accuracy, defence)) { message(game, "Your spell had no effect."); emit(game, { type: "hit", on: "monster", uid: monster.uid, damage: -1, tick: game.tick }); return; }
      addXp(game, "magic", spell.xp);
      if (spell.kind === "bind") { monster.curses.bound = game.tick + 16; message(game, `The ${monster.def.name.toLowerCase()} is rooted to the spot.`); }
      else if (spell.curse) { monster.curses[spell.curse.stat] = game.tick + 100; message(game, `You ${spell.name.toLowerCase()} the ${monster.def.name.toLowerCase()}.`); }
      return;
    }
    const hit = game.rng() < hitChance(accuracy, defence) ? Math.floor(game.rng() * (Math.floor(spell.maxHit! * boost) + 1)) : -1;
    addXp(game, "magic", spell.xp);
    if (hit > 0) { addXp(game, "magic", hit * 2); addXp(game, "hitpoints", hit * 1.33); }
    damageMonster(game, monster, Math.max(0, hit), hit < 0);
    player.queuedSpell = null;
    if (!player.autocast) player.combat = null;
    return;
  }
  player.attackTimer = attackSpeed(player);
  const hit = game.rng() < playerAccuracy(game, monster, boost) ? Math.floor(game.rng() * (Math.floor(playerMaxHit(game) * boost) + 1)) : -1;
  const damage = Math.max(0, Math.min(hit, monster.hp));
  if (damage > 0) {
    const xp = damage * 4;
    if (player.style === "accurate") addXp(game, "attack", xp);
    else if (player.style === "aggressive") addXp(game, "strength", xp);
    else if (player.style === "defensive") addXp(game, "defence", xp);
    else { addXp(game, "attack", xp / 3); addXp(game, "strength", xp / 3); addXp(game, "defence", xp / 3); }
    addXp(game, "hitpoints", damage * 1.33);
  }
  emit(game, { type: "swing", weapon: weaponSound(player.equipment.weapon), tick: game.tick });
  sound(game, hit > 0 ? "hit" : "miss");
  damageMonster(game, monster, Math.max(0, hit), hit < 0);
}
// ---------- Ranged ----------
/** The best arrows in your pack that your Ranged level can use. */
export function bestArrow(game: Game) {
  let best: { id: string; strength: number } | null = null;
  for (const slot of game.player.inventory) {
    const ammo = slot ? item(slot.id).ammo : undefined;
    if (ammo && ammo.level <= level(game, "ranged") && (!best || ammo.strength > best.strength)) best = { id: slot!.id, strength: ammo.strength };
  }
  return best;
}
/** Styles with a bow: Accurate (+3 accuracy), Rapid (a tick faster), Longrange (+2 reach, Defence XP). */
export function rangedMaxHit(game: Game, arrowStrength = bestArrow(game)?.strength ?? 0) {
  const effective = level(game, "ranged") + (game.player.style === "accurate" ? 3 : 0) + 8;
  return Math.floor(0.5 + effective * (arrowStrength + 64) / 640);
}
function rangedAttack(game: Game, monster: Monster, boost: number) {
  const player = game.player, arrow = bestArrow(game);
  if (!arrow) { message(game, "You have no arrows you can use. Fletch & Feather in Friendhollow sells them.", "warn"); player.combat = null; return; }
  take(player, arrow.id, 1);
  player.attackTimer = Math.max(2, attackSpeed(player) - (player.style === "aggressive" ? 1 : 0));
  const accuracy = (level(game, "ranged") + (player.style === "accurate" ? 3 : 0) + 8) * (bonuses(player).ranged + 64) * boost;
  const defence = (monster.def.defence * cursed(game, monster, "defence") + 9) * (monster.def.defenceBonus + 64);
  const hit = game.rng() < hitChance(accuracy, defence) ? Math.floor(game.rng() * (Math.floor(rangedMaxHit(game, arrow.strength) * boost) + 1)) : -1;
  const damage = Math.max(0, Math.min(hit, monster.hp));
  if (damage > 0) {
    if (player.style === "defensive") { addXp(game, "ranged", damage * 2); addXp(game, "defence", damage * 2); } else addXp(game, "ranged", damage * 4);
    addXp(game, "hitpoints", damage * 1.33);
  }
  emit(game, { type: "projectile", projectile: { from: { x: player.x, y: player.y }, to: { x: monster.x, y: monster.y }, start: game.tick, end: game.tick + 1, color: item(arrow.id).icon.color, style: "arrow" } });
  sound(game, "bow");
  // Most arrows can be picked up again where they land.
  if (game.rng() < 0.6) dropItem(game, arrow.id, 1, monster.x, monster.y, 150);
  damageMonster(game, monster, Math.max(0, hit), hit < 0);
}
const SPELL_COLORS: Record<string, string> = { breeze_dart: "#dfe6ea", tide_dart: "#9fb4d0", stone_dart: "#a89479", ember_dart: "#e3a58c", breeze_lance: "#eef2f4", tide_lance: "#8fa3c9", ember_lance: "#e39a7c", breeze_burst: "#ffffff", ember_burst: "#f0a080" };
function damageMonster(game: Game, monster: Monster, damage: number, missed: boolean) {
  const dealt = Math.min(damage, monster.hp);
  monster.hp -= dealt;
  if (dealt > 0) monster.mine = true;
  emit(game, { type: "hit", on: "monster", uid: monster.uid, damage: missed ? -1 : dealt, tick: game.tick });
  if (monster.attackTimer <= 0) monster.attackTimer = 1;
  if (monster.hp <= 0) killMonster(game, monster);
  else if (dealt > 0) creature(game, monster, "hurt");
}
function killMonster(game: Game, monster: Monster) {
  const player = game.player;
  monster.dead = true; monster.target = false; monster.respawnAt = game.tick + monster.def.respawn;
  if (player.combat === monster.uid) player.combat = null;
  player.kills++; player.killLog[monster.def.id] = (player.killLog[monster.def.id] ?? 0) + 1; sound(game, "kill"); creature(game, monster, "death");
  const at = { x: monster.x, y: monster.y }, silver = Math.min(RELICS[1].max, player.relics[1] ?? 0) * RELICS[1].coinsPer + (riding(player)?.coins ?? 0);
  const roll = (drop: { item: string; min: number; max: number }) => {
    const n = drop.min + Math.floor(game.rng() * (drop.max - drop.min + 1));
    dropItem(game, drop.item, drop.item === "coins" ? Math.round(n * (1 + silver)) : n, at.x, at.y);
  };
  for (const drop of monster.def.always ?? []) roll(drop);
  for (const drop of monster.def.drops) if (game.rng() < drop.chance) {
    const before = game.ground.length;
    roll(drop);
    // A rare or valuable drop: a beam of light over it, a chime, and a line in the chat.
    if (drop.item !== "coins" && (drop.chance <= 0.05 || item(drop.item).value >= 1500)) {
      for (const entry of game.ground.slice(before)) entry.rare = true;
      const found = game.ground.find(entry => entry.id === drop.item && entry.x === at.x && entry.y === at.y); if (found) found.rare = true;
      message(game, `Valuable drop: ${item(drop.item).name}!`, "quest"); sound(game, "rare");
    }
  }
  if (monster.def.breath) rollPet(game, "emberling", monster.def.id === "emberwyrm" ? 400 : 99);
  if (monster.def.worldBoss) rollPet(game, "cinderkin", 99);
  onMonsterKilled(game, monster.def.id, at.x, at.y);
  slayerKill(game, monster.def.id);
}
function damagePlayer(game: Game, damage: number, from: Monster | null) {
  const player = game.player;
  player.hp = Math.max(0, player.hp - damage);
  emit(game, { type: "hit", on: "player", damage, tick: game.tick });
  if (damage > 0) sound(game, "hurt");
  if (from && game.autoRetaliate && player.combat === null && !player.path.length && !player.target && (!player.activity || player.activity.kind !== "obstacle")) {
    player.activity = null; player.combat = from.uid; player.attackTimer = Math.max(player.attackTimer, 1);
  }
  if (player.hp <= 0) die(game);
}
function die(game: Game) {
  const player = game.player, spawn = game.world.places.spawn;
  message(game, "Oh dear, you are dead!", "warn"); emit(game, { type: "death", tick: game.tick }); sound(game, "death");
  player.deaths++; stopAll(game); closeInterfaces(game); player.prayers = []; player.hp = maxHp(player); player.energy = 100;
  player.prev = { ...spawn }; player.x = spawn.x; player.y = spawn.y; player.moved = game.tick - 10; player.stunned = 0;
  for (const monster of game.monsters) monster.target = false;
  message(game, "You wake up by the Friendhollow fountain. Your items are safe: the Realm is kind to new heroes.", "info");
}
function monsterTick(game: Game, monster: Monster) {
  const player = game.player;
  if (monster.dead) {
    if (game.tick >= monster.respawnAt) {
      monster.dead = false; monster.hp = monster.def.hp; monster.curses = {}; monster.bornAt = game.tick; monster.x = monster.spawn.x; monster.y = monster.spawn.y; monster.prev = { ...monster.spawn }; monster.target = false;
    }
    return;
  }
  if (monster.attackTimer > 0) monster.attackTimer--;
  const sameLayer = isUnderground(monster.spawn.y) === isUnderground(player.y) && realPoint(game.world, monster.spawn.x, monster.spawn.y).level === realPoint(game.world, player.x, player.y).level;
  // Aggression: attack players whose combat level is at most twice the monster's.
  if (!monster.target && monster.def.aggressive && sameLayer && chebyshev(monster, player) <= 4 && combatLevel(player) <= monster.def.level * 2) { monster.target = true; creature(game, monster, "aggro"); }
  if (monster.target) {
    const leash = Math.max(Math.abs(monster.x - monster.spawn.x), Math.abs(monster.y - monster.spawn.y));
    if (!sameLayer || leash > monster.wander + 12 || chebyshev(monster, player) > 16) { monster.target = false; monster.retreat = 6; return; }
    if (adjacentTo(player.x, player.y, monster.x, monster.y, footprint(monster))) {
      if (monster.attackTimer <= 0) {
        monster.attackTimer = monster.def.speed;
        const boost = prayerBoost(player), style = STYLE_BONUS[player.style];
        const attack = (monster.def.attack * cursed(game, monster, "attack") + 9) * (monster.def.attackBonus + 64);
        const defence = (Math.floor(level(game, "defence") * (1 + boost.defence)) + style.defence + 8) * (bonuses(player).defence + 64);
        let hit = game.rng() < hitChance(attack, defence) ? Math.floor(game.rng() * (Math.floor(monster.def.maxHit * cursed(game, monster, "strength")) + 1)) : 0;
        if (boost.protect) hit = Math.floor(hit * (monster.def.boss ? 0.4 : 0));
        // Dragonfire: a third of a dragon's attacks are breath, which only a Wyrmward shield turns aside.
        if (monster.def.breath && game.rng() < 0.33) {
          const shielded = player.equipment.shield === "wyrmward_shield";
          hit = Math.floor(game.rng() * ((shielded ? 4 : monster.def.breath) + 1));
          emit(game, { type: "projectile", projectile: { from: { x: monster.x, y: monster.y }, to: { x: player.x, y: player.y }, start: game.tick, end: game.tick + 1, color: "#e9733f", style: "fire" } });
          sound(game, "fire");
          message(game, shielded ? "Your shield absorbs most of the dragon's breath." : "You're horribly burnt by the dragonfire! A Wyrmward shield would help.", shielded ? "game" : "warn");
        }
        creature(game, monster, "attack");
        damagePlayer(game, hit, monster);
      }
      return;
    }
    stepMonsterToward(game, monster, player);
    return;
  }
  // Idle wandering.
  if (monster.retreat > 0) { monster.retreat--; stepMonsterToward(game, monster, monster.spawn); return; }
  if (game.rng() < 0.12 && !isBound(game, monster)) {
    const dx = Math.floor(game.rng() * 3) - 1, dy = Math.floor(game.rng() * 3) - 1, nx = monster.x + dx, ny = monster.y + dy;
    if (Math.abs(nx - monster.spawn.x) <= monster.wander && Math.abs(ny - monster.spawn.y) <= monster.wander && monsterCanStep(game, monster, dx, dy)) moveMonster(game, monster, nx, ny);
  }
}
function monsterCanStep(game: Game, monster: Monster, dx: number, dy: number) {
  const size = footprint(monster);
  for (let oy = 0; oy < size; oy++) for (let ox = 0; ox < size; ox++) {
    if (!canStep(game, monster.x + ox, monster.y + oy, dx, dy)) return false;
    if (size === 1 && game.player.x === monster.x + dx && game.player.y === monster.y + dy) return false;
  }
  return true;
}
/** Gap between a point and a size × size footprint (0 = touching or inside). */
function gapTo(point: Point, x: number, y: number, size: number) {
  const gx = point.x < x ? x - point.x : point.x >= x + size ? point.x - (x + size - 1) : 0;
  const gy = point.y < y ? y - point.y : point.y >= y + size ? point.y - (y + size - 1) : 0;
  return { gx, gy, inside: gx === 0 && gy === 0 };
}
/**
 * Old-school "dumb" pathing: take the single step that brings the monster closest to its target, never onto the player.
 * Monsters don't search around walls, so they can get stuck behind things (safespots work).
 */
function creature(game: Game, monster: Monster, action: "attack" | "hurt" | "death" | "aggro") {
  emit(game, { type: "creature", id: monster.def.id, action, x: monster.x, y: monster.y, tick: game.tick });
}
/** What a weapon sounds like when it swings. */
function weaponSound(id: string | undefined): "slash" | "stab" | "crush" | "punch" {
  if (!id) return "punch";
  if (id.includes("dagger")) return "stab";
  if (id.includes("sword") || id.includes("sabre")) return "slash";
  return "crush";
}
/** A curse's multiplier on a monster stat (1 when uncursed). */
function cursed(game: Game, monster: Monster, stat: "attack" | "strength" | "defence") {
  const until = monster.curses[stat];
  if (!until || until <= game.tick) return 1;
  return 1 - (SPELLS.find(spell => spell.curse?.stat === stat)?.curse?.amount ?? 0);
}
export const isBound = (game: Game, monster: Monster) => (monster.curses.bound ?? 0) > game.tick;
function stepMonsterToward(game: Game, monster: Monster, target: Point) {
  if (isBound(game, monster)) return;
  const size = footprint(monster), player = game.player;
  const score = (x: number, y: number) => { const { gx, gy } = gapTo(target, x, y, size); return Math.max(gx, gy) * 10 + Math.min(gx, gy) * 3; };
  let best: [number, number] | null = null, bestScore = score(monster.x, monster.y);
  for (const [dx, dy] of DIRS) {
    const nx = monster.x + dx, ny = monster.y + dy;
    if (gapTo(player, nx, ny, size).inside) continue;
    if (!monsterCanStep(game, monster, dx, dy)) continue;
    const value = score(nx, ny) + (dx && dy ? 1 : 0);
    if (value < bestScore) { bestScore = value; best = [dx, dy]; }
  }
  if (best) moveMonster(game, monster, monster.x + best[0], monster.y + best[1]);
}
function moveMonster(game: Game, monster: Monster, x: number, y: number) {
  monster.prev = { x: monster.x, y: monster.y }; monster.heading = headingTo(x - monster.x, y - monster.y, monster.heading);
  monster.x = x; monster.y = y; monster.moved = game.tick;
}
function npcTick(game: Game, npc: Npc) {
  if (npc.busy > 0) { npc.busy--; return; }
  if (!npc.wander || game.rng() > 0.08) return;
  const dx = Math.floor(game.rng() * 3) - 1, dy = Math.floor(game.rng() * 3) - 1, nx = npc.x + dx, ny = npc.y + dy;
  if (Math.abs(nx - npc.spawn.x) > npc.wander || Math.abs(ny - npc.spawn.y) > npc.wander || !canStep(game, npc.x, npc.y, dx, dy)) return;
  if (nx === game.player.x && ny === game.player.y) return;
  npc.prev = { x: npc.x, y: npc.y }; npc.heading = headingTo(dx, dy, npc.heading); npc.x = nx; npc.y = ny; npc.moved = game.tick;
}
function upkeep(game: Game) {
  const player = game.player;
  for (const [id, until] of game.depleted) if (game.tick >= until) game.depleted.delete(id);
  if (game.fires.length) game.fires = game.fires.filter(fire => fire.expires > game.tick);
  if (game.ground.length) game.ground = game.ground.filter(entry => entry.expires > game.tick);
  // Hitpoints regenerate slowly; Cellular Friends regrow twice as fast.
  if (++player.regenTimer >= (player.familyId === 3 ? 50 : 100)) { player.regenTimer = 0; if (player.hp < maxHp(player)) player.hp++; }
  // Prayer drains while prayers are active.
  if (player.prayers.length) {
    const resist = 1 + bonuses(player).prayer / 30;
    const drain = player.prayers.reduce((sum, id) => sum + (PRAYERS.find(prayer => prayer.id === id)?.drain ?? 0), 0) / resist;
    player.prayer = Math.max(0, player.prayer - drain);
    if (player.prayer <= 0) { player.prayers = []; message(game, "You have run out of prayer points, you can recharge at an altar.", "warn"); }
  }
  const moving = player.path.length > 0 || !!game.held;
  if (!(player.run && moving) || player.mount) player.energy = Math.min(100, player.energy + 0.25 + level(game, "agility") / 110);
}

// ---------- Prayer, magic, style ----------
export function togglePrayer(game: Game, id: string) {
  const player = game.player, prayer = PRAYERS.find(entry => entry.id === id);
  if (!prayer) return;
  if (player.prayers.includes(id)) { player.prayers = player.prayers.filter(entry => entry !== id); sound(game, "click"); return; }
  if (level(game, "prayer") < prayer.level) { message(game, `You need a Prayer level of ${prayer.level} to use ${prayer.name}.`, "warn"); return; }
  if (player.prayer < 1) { message(game, "You need to recharge your prayer points at an altar.", "warn"); return; }
  // Only one prayer per stat: turn off overlapping ones.
  const keys = Object.keys(prayer.effect);
  player.prayers = player.prayers.filter(other => !Object.keys(PRAYERS.find(entry => entry.id === other)?.effect ?? {}).some(key => keys.includes(key)));
  player.prayers.push(id); sound(game, "pray");
}
/**
 * Clicking a spell. Self spells (teleports, Bonebloom) cast straight away. Damage spells autocast with a staff,
 * otherwise they arm "Cast X ->" like curses and Rootsnare (monsters), item spells (Gilded/Golden Touch, Forgeheart, enchanting) and
 * Far Reach (ground items).
 */
export function castSpell(game: Game, id: string): Selection {
  const player = game.player, spell = SPELLS.find(entry => entry.id === id);
  if (!spell) return null;
  const problem = canCast(game, spell);
  if (problem && spell.id !== "home") { message(game, problem, "warn"); return null; }
  if (spell.target === "self") {
    if (spell.kind === "bloom") { bonebloom(game, spell); return null; }
    if (isUnderground(player.y) && spell.id !== "home") { message(game, "A dark force stops you from teleporting underground.", "warn"); return null; }
    if (player.combat !== null && spell.id === "home") { message(game, "You can't use Homeward during combat.", "warn"); return null; }
    stopAll(game); closeInterfaces(game);
    for (const [sigil, n] of Object.entries(spellCost(game, spell))) take(player, sigil, n);
    player.activity = { kind: "teleport", to: game.world.places[spell.teleport ?? "hollow_square"], timer: spell.id === "home" ? 10 : 3, spell: spell.id };
    if (spell.xp) addXp(game, "magic", spell.xp);
    message(game, spell.id === "home" ? "You begin to channel home…" : "You feel the Realm fold around you…"); sound(game, "spell");
    return null;
  }
  if (spell.maxHit && isStaffEquipped(player)) {
    player.autocast = player.autocast === spell.id ? null : spell.id;
    message(game, player.autocast ? `Autocasting ${spell.name}. Attack to cast it; click it again to stop.` : "Autocast off.");
    return null;
  }
  return { kind: "spell", spell: spell.id };
}
const TELEPORT_NAMES: Record<string, string> = { hollow_square: "Friendhollow", emberforge: "Emberforge", oasis: "the Oasis", frostpeak: "Frostpeak", pier: "Pike's Pier" };
const ELEMENT_COLORS: Record<string, string> = { wind: "#e6ecef", water: "#8fa3c9", earth: "#a89479", fire: "#e9a07a", hollow: "#6d6b67", moon: "#c6bed4", gold: "#e2d49e", home: "#e8d4c0" };
function payRunes(game: Game, spell: Spell) { for (const [sigil, n] of Object.entries(spellCost(game, spell))) take(game.player, sigil, n); }
function bonebloom(game: Game, spell: Spell) {
  const player = game.player, slots = player.inventory.map((slot, index) => slot?.id === "bones" ? index : -1).filter(index => index >= 0);
  if (!slots.length) { message(game, "You aren't holding any bones!", "warn"); return; }
  payRunes(game, spell);
  for (const index of slots) player.inventory[index] = { id: "sweetberry", n: 1 };
  addXp(game, "magic", spell.xp); sound(game, "spell");
  message(game, `Your ${slots.length > 1 ? `${slots.length} bones bloom` : "bone blooms"} into sweetberries.`);
}
/** Item spells: Gilded and Golden Touch, Forgeheart and enchanting, cast on an inventory slot. */
export function castOnItem(game: Game, spellId: string, slotIndex: number) {
  const player = game.player, spell = SPELLS.find(entry => entry.id === spellId), slot = player.inventory[slotIndex];
  if (!spell || spell.target !== "item" || !slot) return false;
  if (player.castTimer > 0) return false;
  const problem = canCast(game, spell);
  if (problem) { message(game, problem, "warn"); return false; }
  const definition = item(slot.id);
  if (spell.kind === "alchemy") {
    if (slot.id === "coins") { message(game, "Coins are already made of gold.", "warn"); return false; }
    if (definition.tradeable === false) { message(game, "You can't cast that on this item.", "warn"); return false; }
    const coins = Math.max(1, Math.floor(definition.value * (spell.id === "golden_touch" ? 0.6 : 0.4)));
    payRunes(game, spell); take(player, slot.id, 1); give(player, "coins", coins);
    message(game, `The ${definition.name.toLowerCase()} turns into ${coins} coins.`); sound(game, "coins");
  } else if (spell.kind === "superheat") {
    const metal = METALS.slice().reverse().find(entry => SMELTING[entry.id].ores[slot.id] !== undefined && Object.entries(SMELTING[entry.id].ores).every(([id, n]) => count(player, id) >= n) && level(game, "smithing") >= SMELTING[entry.id].level);
    if (!metal) { message(game, slot.id.endsWith("_ore") || slot.id === "inkcoal" ? "You need the right ores (and Smithing level) for Forgeheart to work." : "Forgeheart only works on ore.", "warn"); return false; }
    payRunes(game, spell);
    for (const [id, n] of Object.entries(SMELTING[metal.id].ores)) take(player, id, n);
    give(player, `${metal.id}_bar`); addXp(game, "smithing", SMELTING[metal.id].xp);
    message(game, `The ore melts into a ${metal.name.toLowerCase()} bar.`); sound(game, "smelt");
  } else if (spell.kind === "enchant") {
    const recipe = spell.id === "enchant_moonstone" ? ["moonstone", "moonstone_pendant"] : ["rosestone", "rosestone_pendant"];
    if (slot.id !== recipe[0]) { message(game, `This spell works on a cut ${recipe[0]}.`, "warn"); return false; }
    payRunes(game, spell); take(player, recipe[0], 1); give(player, recipe[1]);
    message(game, `The ${recipe[0]} glows and becomes an ${item(recipe[1]).name.toLowerCase()}.`); sound(game, "spell");
  }
  addXp(game, "magic", spell.xp); player.castTimer = 3; player.activity = null;
  emit(game, { type: "cast", spell: spell.id, tick: game.tick });
  return true;
}
function telegrab(game: Game, spellId: string, index: number) {
  const player = game.player, spell = SPELLS.find(entry => entry.id === spellId)!, ground = game.ground[index];
  const problem = canCast(game, spell);
  if (problem) { message(game, problem, "warn"); return; }
  if (!canHold(player, ground.id, ground.n)) { message(game, "You don't have enough inventory space to hold that item.", "warn"); return; }
  payRunes(game, spell); give(player, ground.id, ground.n); game.ground.splice(index, 1);
  addXp(game, "magic", spell.xp); sound(game, "spell");
  emit(game, { type: "projectile", projectile: { from: { x: ground.x, y: ground.y }, to: { x: player.x, y: player.y }, start: game.tick, end: game.tick + 1, color: "#e6ecef", style: "magic", element: "wind" } });
}
export function setStyle(game: Game, style: CombatStyle) { game.player.style = style; }
// ---------- Referrals ----------
/** Your referral code: give it to a friend who hasn't played yet. */
export const referralCode = (game: Game) => `RF-${game.player.friendId}`;
const hasItem = (game: Game, id: string) => has(game.player, id) || game.player.bank.some(slot => slot.id === id) || Object.values(game.player.equipment).includes(id);
function referralReward(game: Game) {
  const player = game.player;
  player.boostTicks += REFERRAL_TICKS; giveOrDrop(game, "coins", REFERRAL_COINS);
  if (!hasItem(game, "friendship_cape")) giveOrDrop(game, "friendship_cape");
  sound(game, "quest");
}
/** Use a friend's referral code, once. Returns an error message, or null when it worked. */
export function applyReferral(game: Game, code: string) {
  const player = game.player, match = /^\s*(?:RF-?)?\s*#?(\d{1,15})\s*$/i.exec(code), id = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) return "That isn't a referral code. They look like RF-1234.";
  if (id === player.friendId) return "That's your own code! Give it to a friend instead.";
  if (player.referredBy !== null) return `You've already used Friend #${player.referredBy}'s code.`;
  if (player.referrals.includes(id)) return `Friend #${id} used your code, so you can't use theirs.`;
  player.referredBy = id; referralReward(game);
  message(game, `Referral used! You and Friend #${id} each get 250 coins, a Friendship cape and +15% XP for an hour of play. They get theirs next time you're both online.`, "quest");
  return null;
}
/**
 * A player who used our code is online with us: reward us (once per Friend, and at most five Friends in any 24 hours;
 * past that, they're credited the next time we're online together after the day has rolled on).
 */
export function creditReferral(game: Game, from: number, now = Date.now()) {
  const player = game.player;
  if (from === player.friendId || player.referrals.includes(from) || player.referredBy === from || player.referrals.length >= 500) return false;
  player.referralTimes = player.referralTimes.filter(at => now - at < DAY_MS && at <= now);
  if (player.referralTimes.length >= REFERRALS_PER_DAY) {
    if (!player.referralCapNoted) { player.referralCapNoted = true; message(game, `Friend #${from} used your referral code! You've had ${REFERRALS_PER_DAY} referral rewards today; theirs will be waiting next time you're both online tomorrow.`, "info"); }
    return false;
  }
  player.referralCapNoted = false;
  player.referrals.push(from); player.referralTimes.push(now); referralReward(game);
  message(game, `Friend #${from} joined with your referral code! +250 coins, +15% XP for an hour of play${player.referrals.length === 1 ? ", and a Friendship cape" : ""}.`, "quest");
  return true;
}

// ---------- Shared fights ----------
/** The monster you're fighting right now, to tell other players (the same monster has the same uid in every game). */
export function currentFight(game: Game) {
  const player = game.player, monster = (player.combat !== null ? monsterByUid(game, player.combat) : null) ?? game.monsters.find(entry => entry.target && !entry.dead) ?? null;
  return monster ? { u: monster.uid, id: monster.def.id, hp: monster.hp, x: monster.x, y: monster.y } : null;
}
/**
 * Another player is fighting a monster: our copy takes the lower of the two HPs (so both players' hits count), and
 * if it isn't fighting us it walks over to where theirs is. If their hits finish it, it dies here without loot for us.
 */
export function syncMonster(game: Game, fight: { u: number; id: string; hp: number; x: number; y: number }, by: number) {
  const monster = game.monsters.find(entry => entry.uid === fight.u && entry.def.id === fight.id);
  if (!monster || monster.dead || game.tick - (monster.bornAt ?? -99) < 8) return;
  if (!monster.target) {
    const far = Math.max(Math.abs(monster.x - fight.x), Math.abs(monster.y - fight.y));
    if (far > 3) { monster.prev = { x: fight.x, y: fight.y }; monster.x = fight.x; monster.y = fight.y; }
    else if (far > 0) stepMonsterToward(game, monster, { x: fight.x, y: fight.y });
  }
  const hp = Math.max(0, Math.min(monster.def.hp, Math.floor(fight.hp)));
  if (hp >= monster.hp) return;
  emit(game, { type: "hit", on: "monster", uid: monster.uid, damage: monster.hp - hp, tick: game.tick });
  monster.hp = hp;
  if (hp > 0) return;
  // A world boss pays everyone who wounded it.
  if (monster.def.worldBoss && monster.mine) { message(game, `Friend #${by} lands the final blow, and the ${monster.def.name.replace(/^The /, "")} falls!`, "quest"); killMonster(game, monster); return; }
  monster.dead = true; monster.target = false; monster.respawnAt = game.tick + monster.def.respawn;
  if (game.player.combat === monster.uid) { game.player.combat = null; game.player.queuedSpell = null; }
  creature(game, monster, "death");
  message(game, `Friend #${by} finished off the ${monster.def.name.toLowerCase()}.`);
}

// ---------- Emotes ----------
/** Why you can't perform an emote (null if you can). */
export function emoteProblem(game: Game, id: string) {
  const emote = EMOTES.find(entry => entry.id === id);
  if (!emote) return "You don't know that emote.";
  if (emote.id === "skillcape" && !item(game.player.equipment.cape ?? "coins").mastery) return "You need to be wearing a mastery cape to perform this emote.";
  if (emote.id === "friendship" && game.player.equipment.cape !== "friendship_cape") return "You need to be wearing the Friendship cape to perform this emote.";
  return null;
}
/** Perform an emote: you stop where you are for its length. */
export function performEmote(game: Game, id: string) {
  const player = game.player, problem = emoteProblem(game, id), emote = EMOTES.find(entry => entry.id === id);
  if (problem || !emote) { message(game, problem ?? "You can't do that.", "warn"); return false; }
  if (player.combat !== null) { message(game, "You're a bit busy for that.", "warn"); return false; }
  player.path = []; player.activity = null; player.target = null;
  player.emote = { id, start: game.tick, until: game.tick + emote.ticks };
  if (id === "skillcape") sound(game, "quest"); else if (id === "cheer" || id === "jump") sound(game, "level");
  return true;
}

// ---------- Dialogue ----------
/** Click to continue: the next line, then the options (if any), then the end. */
export function continueDialogue(game: Game) {
  const dialogue = game.dialogue;
  if (!dialogue || dialogueAtOptions(dialogue)) return;
  if (dialogue.index < dialogue.lines.length - 1 || dialogue.options?.length) { dialogue.index++; return; }
  game.dialogue = null; dialogue.onEnd?.();
}
export function chooseOption(game: Game, index: number) {
  const dialogue = game.dialogue;
  const option = dialogue?.options?.[index];
  if (!dialogue || !option || !dialogueAtOptions(dialogue)) return;
  game.dialogue = null;
  const next = option.then();
  if (next) game.dialogue = next;
}
/** Options show after the last line has been read. */
export const dialogueAtOptions = (dialogue: Dialogue) => dialogue.index >= dialogue.lines.length && !!dialogue.options?.length;

// ---------- Shops ----------
export function buyPrice(game: Game, id: string) { const fixed = item(id).price; return fixed ?? Math.max(1, Math.ceil(item(id).value * SHOP_BUY * (game.player.familyId === 2 ? 0.9 : 1))); }
/** Skills at 99. */
export const masteredSkills = (game: Game) => SKILLS.filter(skill => level(game, skill) >= 99);
/** Why you can't buy a mastery cape yet (null if you can). */
export function capeProblem(game: Game, id: string) {
  const mastery = item(id).mastery;
  if (!mastery) return null;
  if (mastery.skill === "all") return masteredSkills(game).length === SKILLS.length ? null : "The Grandmaster's cape is for Friends who've mastered every skill.";
  return level(game, mastery.skill) >= 99 ? null : `You need level 99 ${SKILL_NAMES[mastery.skill]} for this cape.`;
}
function buyCape(game: Game, id: string) {
  const player = game.player, mastery = item(id).mastery!, problem = capeProblem(game, id), price = buyPrice(game, id);
  if (problem) { message(game, problem, "warn"); return 0; }
  if (count(player, "coins") < price) { message(game, `A mastery cape costs ${price.toLocaleString()} coins.`, "warn"); return 0; }
  if (freeSlots(player) === 0) { message(game, "You don't have enough inventory space.", "warn"); return 0; }
  // Master more than one skill and your capes come trimmed.
  const given = mastery.skill !== "all" && masteredSkills(game).length > 1 ? `${mastery.skill}_cape_t` : id;
  take(player, "coins", price); give(player, given);
  message(game, `The Keeper of Capes hands you the ${item(given).name}. Wear it with pride.`, "quest"); sound(game, "quest");
  return 1;
}
/** What a shop pays: merchants pay more for the goods they deal in. */
export function sellPrice(id: string, shopId?: string) {
  const shop = shopId ? SHOPS[shopId] : undefined, special = shop?.buys?.includes(itemCategory(id));
  return Math.floor(item(id).value * (special ? shop!.rate ?? SHOP_SELL : SHOP_SELL));
}
/** Whether a shop will buy an item. */
export const shopBuys = (shopId: string, id: string) => { const shop = SHOPS[shopId]; return !!shop && (shop.general || shop.stock.includes(id) || !!shop.buys?.includes(itemCategory(id))); };
export function buy(game: Game, shopId: string, id: string, n: number) {
  const shop = SHOPS[shopId], player = game.player;
  const sold = game.shopStock[shopId]?.find(slot => slot.id === id);
  if (!shop || (!shop.stock.includes(id) && !sold)) return 0;
  if (item(id).mastery) return buyCape(game, id);
  if (!shop.stock.includes(id)) n = Math.min(n, sold!.n);
  const price = buyPrice(game, id), stackable = !!item(id).stackable;
  let bought = 0;
  while (bought < n && count(player, "coins") >= price && canHold(player, id)) {
    if (!stackable && freeSlots(player) === 0) break;
    take(player, "coins", price); give(player, id); bought++;
    if (stackable && bought < n) {
      const more = Math.min(n - bought, Math.floor(count(player, "coins") / price));
      if (more > 0) { take(player, "coins", price * more); give(player, id, more); bought += more; }
      break;
    }
  }
  if (sold && !shop.stock.includes(id) && bought) { sold.n -= bought; if (sold.n <= 0) game.shopStock[shopId] = game.shopStock[shopId].filter(slot => slot !== sold); }
  if (!bought) message(game, count(player, "coins") < price ? "You don't have enough coins." : "You don't have enough inventory space.", "warn");
  else sound(game, "coins");
  return bought;
}
export function sell(game: Game, shopId: string, slotIndex: number, n: number) {
  const shop = SHOPS[shopId], player = game.player, slot = player.inventory[slotIndex];
  if (!shop || !slot) return 0;
  const definition = item(slot.id);
  if (slot.id === "coins" || definition.tradeable === false) { message(game, "You can't sell this item.", "warn"); return 0; }
  if (!shopBuys(shopId, slot.id)) { message(game, "You can't sell this item to this shop.", "warn"); return 0; }
  const id = slot.id, selling = Math.min(n, count(player, id)), price = sellPrice(id, shopId);
  take(player, id, selling); if (price * selling > 0) give(player, "coins", price * selling);
  // It goes on the shop's shelves, where you can buy it back.
  if (!shop.stock.includes(id) && selling > 0) {
    const shelf = game.shopStock[shopId] ??= [], entry = shelf.find(slot => slot.id === id);
    if (entry) entry.n += selling; else if (shelf.length < 40) shelf.push({ id, n: selling });
  }
  sound(game, "coins");
  return selling;
}

// ---------- Tablets and lamps ----------
const TABLET_PLACES = { hollow_square: "hollow_square", emberforge: "emberforge", oasis: "oasis", frostpeak: "frostpeak", pier: "pier" } as const;
export function breakTablet(game: Game, slotIndex: number) {
  const player = game.player, slot = player.inventory[slotIndex], place = slot ? item(slot.id).tablet : undefined;
  if (!slot || !place) return;
  if (isUnderground(player.y)) { message(game, "A dark force stops you from teleporting underground.", "warn"); return; }
  stopAll(game); closeInterfaces(game); take(player, slot.id, 1);
  player.activity = { kind: "teleport", to: game.world.places[TABLET_PLACES[place]], timer: 2, spell: `tablet:${place}` };
  message(game, "You break the tablet. The Realm folds around you…"); sound(game, "spell");
}
/** Rub a lamp of insight: 100 × your level in a skill of your choice. */
export function rubLamp(game: Game, slotIndex: number, skill: Skill) {
  const player = game.player;
  game.ui.lamp = null;
  if (player.inventory[slotIndex]?.id !== "insight_lamp") return 0;
  const xp = 100 * level(game, skill);
  take(player, "insight_lamp", 1); addXp(game, skill, xp, { raw: true });
  message(game, `The lamp glows. You gain ${xp.toLocaleString()} ${SKILL_NAMES[skill]} XP.`, "level");
  return xp;
}

// ---------- Rare Market (RF bundles, simulated) ----------
/** Wardrobe pieces the Tailor's pick can give: up to Moonlit tier, ones you don't have yet. */
export const tailorChoices = (game: Game) => WARDROBE.filter(piece => piece.tier <= 2 && !game.player.wardrobe.includes(piece.id));
/** Hand over a bundle's goods (its caskets were already bought through the simulated ledger). */
export function grantBundle(game: Game, id: string, pick?: string) {
  const player = game.player, bundle = RF_BUNDLES.find(entry => entry.id === id);
  if (!bundle) return false;
  switch (bundle.id) {
    case "traveller": for (const place of Object.keys(TABLET_PLACES)) giveOrDrop(game, `tablet_${place}`, 2); break;
    case "hamper": giveOrDrop(game, "inkshark", 10); giveOrDrop(game, "cake", 5); break;
    case "insight": giveOrDrop(game, "insight_lamp"); break;
    case "contract": addSlayerPoints(game, 40); break;
    case "archer": giveOrDrop(game, "maple_bow"); giveOrDrop(game, "moonsilver_arrow", 300); break;
    case "sigils": for (const sigil of ["breeze_sigil", "tide_sigil", "stone_sigil", "ember_sigil", "thought_sigil"]) giveOrDrop(game, sigil, 300); giveOrDrop(game, "hollow_sigil", 30); break;
    case "fletcher": giveOrDrop(game, "arrow_shaft", 600); giveOrDrop(game, "feather", 600); giveOrDrop(game, "ashsteel_arrowheads", 300); break;
    case "dragonslayer": giveOrDrop(game, "wyrmward_shield"); giveOrDrop(game, "drakehide_vest"); giveOrDrop(game, "inkshark", 20); giveOrDrop(game, "rarite_arrow", 200); break;
    case "tailor": {
      const piece = tailorChoices(game).find(entry => entry.id === pick) ?? tailorChoices(game)[0];
      if (piece) { player.wardrobe.push(piece.id); toggleWorn(game, piece.id); message(game, `Wardrobe unlocked: ${piece.name}!`, "level"); }
      else giveOrDrop(game, "coins", 5000);
      break;
    }
  }
  player.questData.rf_bundles = (player.questData.rf_bundles ?? 0) + 1;
  message(game, `Rare Market: ${bundle.name} delivered, with ${bundle.caskets} Rare Casket${bundle.caskets > 1 ? "s" : ""} to open.`, "quest"); sound(game, "coins");
  return true;
}

// ---------- Rare Caskets (RF chance game, simulated) ----------
export function setRelics(game: Game, counts: readonly number[]) { game.player.relics = [0, 1, 2, 3].map(index => Math.max(0, Math.min(99, counts[index] ?? 0))); }
/** Each opened casket grants a wardrobe piece of its tier (or coins for duplicates). */
export function collectFromCasket(game: Game, tier: number): { wardrobe: WardrobeId | null; coins: number } {
  const player = game.player, options = WARDROBE.filter(entry => entry.tier === tier && !player.wardrobe.includes(entry.id));
  if (options.length) {
    const pick = options[Math.floor(game.rng() * options.length)];
    player.wardrobe.push(pick.id); if (!player.worn.some(id => WARDROBE.find(entry => entry.id === id)?.kind === pick.kind)) player.worn.push(pick.id);
    message(game, `Wardrobe unlocked: ${pick.name}!`, "level"); return { wardrobe: pick.id, coins: 0 };
  }
  const coins = [250, 600, 1500, 5000][tier] ?? 250;
  giveOrDrop(game, "coins", coins); message(game, `A duplicate wardrobe piece turns into ${coins} coins.`); return { wardrobe: null, coins };
}
export function toggleWorn(game: Game, id: WardrobeId) {
  const player = game.player, entry = WARDROBE.find(piece => piece.id === id);
  if (!entry || !player.wardrobe.includes(id)) return;
  if (player.worn.includes(id)) { player.worn = player.worn.filter(worn => worn !== id); return; }
  player.worn = player.worn.filter(worn => WARDROBE.find(piece => piece.id === worn)?.kind !== entry.kind);
  player.worn.push(id);
}

// ---------- Followers (owned Friends) ----------
export type OwnedFriend = { id: number; generation: number | null };
export function setFollower(game: Game, friend: OwnedFriend | null) {
  const player = game.player;
  player.follower = friend?.id ?? null; player.followerGeneration = friend?.generation ?? null; game.pet = null;
  if (friend) player.petOut = null;
  if (friend) updatePet(game);
  if (friend) message(game, `Friend #${friend.id} follows you now.`, "info");
}

// ---------- Pets ----------
/** A chance at a pet on a successful action (luckier at higher levels: up to three times the odds at 99). */
export function rollPet(game: Game, id: string, skillLevel: number) {
  const pet = PETS.find(entry => entry.id === id), player = game.player;
  if (!pet || player.pets.includes(id) || game.rng() >= (1 + Math.min(99, skillLevel) / 50) / pet.odds) return false;
  player.pets.push(id);
  message(game, `You have a funny feeling like you're being followed... ${pet.name} has joined you!`, "quest"); sound(game, "rare");
  if (player.follower === null && !player.petOut) { player.petOut = id; game.pet = null; updatePet(game); }
  return true;
}
/** Call a pet you've found to follow you (instead of a Friend), or send it home. */
export function setPet(game: Game, id: string | null) {
  const player = game.player;
  if (id && !player.pets.includes(id)) return;
  player.petOut = id; game.pet = null;
  if (id) { player.follower = null; player.followerGeneration = null; updatePet(game); message(game, `${PETS.find(pet => pet.id === id)!.name} follows you now.`, "info"); }
}

// ---------- Mounts ----------
/** Why you can't ride here (null if you can): not underground, and not upstairs. */
export function rideProblem(game: Game) {
  const player = game.player;
  if (isUnderground(player.y)) return "There's no room to ride down here.";
  if (player.y >= FLOOR_Y) return "You can't ride a horse up the stairs.";
  return null;
}
/** Get on a mount you own (the last one you rode, or `id`), or off the one you're on. */
export function toggleMount(game: Game, id?: string) {
  const player = game.player;
  if (player.mount && (!id || id === player.mount)) { message(game, `You climb down from your ${mountDef(player.mount)!.name.toLowerCase()}.`); player.mount = null; sound(game, "click"); return; }
  const choice = id ?? player.lastMount ?? player.mounts[0];
  if (!choice || !player.mounts.includes(choice)) { message(game, "You don't own a mount. The Friendhollow stables sell them.", "warn"); return; }
  const problem = rideProblem(game);
  if (problem) { message(game, problem, "warn"); return; }
  player.mount = choice; player.lastMount = choice; player.emote = null;
  message(game, `You mount your ${mountDef(choice)!.name.toLowerCase()}.`); sound(game, "whinny");
}
/** A new mount from the stables (bought with RF); you ride it straight away where you can. */
export function grantMount(game: Game, id: string) {
  const player = game.player, mount = mountDef(id);
  if (!mount) return;
  if (!player.mounts.includes(id)) player.mounts.push(id);
  message(game, `The stablemaster leads out your ${mount.name.toLowerCase()}. ${mount.text}`, "quest"); sound(game, "level");
  if (!rideProblem(game)) { player.mount = id; player.lastMount = id; }
}
/** While riding: climb down where a horse can't go, and a gentle mount's healing. */
function rideUpkeep(game: Game) {
  const player = game.player, mount = riding(player);
  if (!mount) return;
  if (rideProblem(game)) { player.mount = null; message(game, `You leave your ${mount.name.toLowerCase()} to graze and go on foot.`); return; }
  if (mount.heal && game.tick % mount.heal === 0 && player.hp > 0 && player.hp < maxHp(player)) player.hp++;
}

/**
 * The follower walks like an old-school pet: it steps onto the tile you just left (two when you run),
 * waits beside you when you stop, and finds its way back to your side after a teleport.
 */
function updatePet(game: Game) {
  const player = game.player;
  if (player.follower === null && !player.petOut) { game.pet = null; return; }
  const pet = game.pet;
  const beside = () => {
    const behind = game.trail[game.trail.length - 1];
    if (behind && Math.max(Math.abs(behind.x - player.x), Math.abs(behind.y - player.y)) === 1 && canWalk(game, behind.x, behind.y)) return behind;
    for (const [dx, dy] of [[-player.heading.x, -player.heading.y], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if ((dx || dy) && canWalk(game, player.x + dx, player.y + dy)) return { x: player.x + dx, y: player.y + dy };
    return { x: player.x, y: player.y };
  };
  if (!pet) { const at = beside(); game.pet = { x: at.x, y: at.y, prev: { ...at }, heading: { ...player.heading }, moved: 0 }; return; }
  const far = Math.max(Math.abs(pet.x - player.x), Math.abs(pet.y - player.y));
  if (far > 4) { const at = beside(); pet.prev = { ...at }; pet.x = at.x; pet.y = at.y; pet.moved = game.tick - 10; return; }
  if (player.moved === game.tick && game.trail.length) {
    const target = game.trail[game.trail.length - 1];
    if (target.x !== pet.x || target.y !== pet.y) {
      pet.prev = { x: pet.x, y: pet.y }; pet.heading = headingTo(target.x - pet.x, target.y - pet.y, pet.heading);
      pet.x = target.x; pet.y = target.y; pet.moved = game.tick;
    }
  } else if (far === 0) {
    const at = beside(); pet.prev = { x: pet.x, y: pet.y }; pet.x = at.x; pet.y = at.y; pet.moved = game.tick;
  } else if (player.moved !== game.tick) pet.heading = headingTo(player.x - pet.x, player.y - pet.y, pet.heading);
}

// ---------- Saves ----------
export const SAVE_VERSION = 1;
export type SaveData = {
  v: 1; friendId: number; x: number; y: number; run: boolean; energy: number; xp: Record<string, number>; hp: number; prayer: number;
  inventory: (Slot | null)[]; equipment: Record<string, string>; bank: Slot[]; style: CombatStyle; autocast: string | null;
  quests: Record<string, number>; questData: Record<string, number>; wardrobe: string[]; worn: string[]; follower: number | null; followerGeneration: number | null;
  kills: number; deaths: number; tutorial: number; guide?: number; created: number; playTicks: number; retaliate: boolean; music: string[];
  met?: unknown; achievements?: Record<string, number>; pets?: string[]; petOut?: string | null; killLog?: Record<string, number>; stats?: Record<string, number>; referredBy?: number | null; referrals?: number[]; referralTimes?: number[]; boostTicks?: number; mounts?: string[]; mount?: string | null; daily?: unknown; seenUpdate?: number;
};
export function serialize(game: Game): SaveData {
  const player = game.player;
  return {
    v: 1, friendId: player.friendId, x: player.x, y: player.y, run: player.run, energy: Math.round(player.energy), xp: { ...player.xp }, hp: player.hp, prayer: Math.round(player.prayer * 10) / 10,
    inventory: player.inventory.map(slot => slot ? { ...slot } : null), equipment: { ...player.equipment } as Record<string, string>, bank: player.bank.map(slot => ({ ...slot })),
    style: player.style, autocast: player.autocast, quests: { ...player.quests }, questData: { ...player.questData }, wardrobe: [...player.wardrobe], worn: [...player.worn],
    follower: player.follower, followerGeneration: player.followerGeneration, kills: player.kills, deaths: player.deaths, tutorial: player.tutorial, guide: player.guide, created: player.created,
    playTicks: game.playTicks, retaliate: game.autoRetaliate, music: [...player.music],
    referredBy: player.referredBy, referrals: [...player.referrals], referralTimes: [...player.referralTimes], boostTicks: player.boostTicks, mounts: [...player.mounts], mount: player.mount, met: JSON.parse(JSON.stringify(player.met)), achievements: { ...player.achievements }, pets: [...player.pets], petOut: player.petOut, killLog: { ...player.killLog }, stats: { ...player.stats }, daily: JSON.parse(JSON.stringify(player.daily)), seenUpdate: player.seenUpdate,
  };
}
const QUEST_IDS = ["friends_feast", "grumblin_trouble", "cold_forge", "hollow_whispers", "lost_glimmer", "hollow_king"];
const int = (value: unknown, min: number, max: number, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
/** Item and spell ids from saves made before the Realm's own names (old id → new id). */
const RENAMED: Record<string, string> = {
  uncut_sapphire: "rough_moonstone", uncut_emerald: "rough_sagestone", uncut_ruby: "rough_rosestone", sapphire: "moonstone", emerald: "sagestone", ruby: "rosestone",
  amulet_of_strength: "rosestone_pendant", amulet_of_accuracy: "moonstone_pendant", holy_symbol: "friends_charm", staff_of_air: "breeze_staff",
  wizard_hat: "scholar_hat", wizard_robe: "scholar_robe", big_bones: "large_bones", leather_body: "leather_jerkin", leather_cowl: "leather_hood",
  leather_vambraces: "leather_bracers", leather_chaps: "leather_leggings", lobster_pot: "crab_pot", banana: "sweetberry", copper_ore: "pewter_ore", tin_ore: "pewter_ore",
  iron_ore: "blackiron_ore", coal: "inkcoal", mithril_ore: "moonsilver_ore", adamantite_ore: "glimmer_ore", raw_shark: "raw_inkshark", shark: "inkshark",
  air_rune: "breeze_sigil", water_rune: "tide_sigil", earth_rune: "stone_sigil", fire_rune: "ember_sigil", mind_rune: "thought_sigil", chaos_rune: "storm_sigil",
  law_rune: "path_sigil", death_rune: "hollow_sigil", nature_rune: "bloom_sigil", cosmic_rune: "star_sigil", body_rune: "shade_sigil",
  wind_strike: "breeze_dart", water_strike: "tide_dart", earth_strike: "stone_dart", fire_strike: "ember_dart", wind_bolt: "breeze_lance", water_bolt: "tide_lance",
  fire_bolt: "ember_lance", wind_blast: "breeze_burst", fire_blast: "ember_burst",
};
const RENAMED_PART: Record<string, string> = {
  bronze: "pewter", iron: "blackiron", steel: "ashsteel", mithril: "moonsilver", adamant: "glimmer", scimitar: "sabre", platebody: "cuirass", platelegs: "greaves", kiteshield: "shield",
  shrimps: "minnows", sardine: "perch", herring: "carp", trout: "char", salmon: "grayling", lobster: "inkcrab", swordfish: "sailfish",
};
export function migrateId(id: string) {
  if (isItem(String(id)) || SPELLS.some(spell => spell.id === id)) return id;
  return RENAMED[id] ?? id.replace("_full_helm", "_helm").split("_").map(part => RENAMED_PART[part] ?? part).join("_");
}
const slotOf = (value: unknown, maxN = 2_147_483_647): Slot | null => {
  if (!value || typeof value !== "object") return null;
  const { n } = value as { id?: unknown; n?: unknown }, raw = (value as { id?: unknown }).id, id = typeof raw === "string" ? migrateId(raw) : raw;
  if (!isItem(id) || typeof n !== "number" || !Number.isFinite(n) || n < 1) return null;
  const amount = int(n, 1, maxN, 0);
  if (!amount) return null;
  return { id, n: item(id).stackable ? amount : 1 };
};
/**
 * Restore a save onto a fresh game for the same Friend. Every field is checked: unknown items, impossible numbers or
 * a position you can't stand on are dropped or reset, so a tampered save can't break the game.
 */
export function restore(game: Game, raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const save = raw as Partial<SaveData>;
  if (save.v !== 1) return false;
  const player = game.player;
  if (typeof save.friendId === "number" && save.friendId !== player.friendId) return false;
  for (const skill of SKILLS) player.xp[skill] = typeof save.xp?.[skill] === "number" ? Math.max(0, Math.min(200_000_000, save.xp[skill])) : player.xp[skill];
  player.xp.hitpoints = Math.max(XP_TABLE[10], player.xp.hitpoints);
  player.hp = int(save.hp, 1, maxHp(player), maxHp(player));
  player.prayer = Math.max(0, Math.min(maxPrayer(player), typeof save.prayer === "number" ? save.prayer : maxPrayer(player)));
  player.inventory = Array.from({ length: INVENTORY_SIZE }, (_, index) => slotOf(save.inventory?.[index]));
  player.equipment = {};
  for (const slot of EQUIP_SLOTS) {
    const saved = save.equipment?.[slot], id = typeof saved === "string" ? migrateId(saved) : saved;
    if (isItem(id) && item(id).equip?.slot === slot) player.equipment[slot] = id;
  }
  const bank: Slot[] = [];
  for (const entry of Array.isArray(save.bank) ? save.bank.slice(0, BANK_SIZE) : []) {
    const slot = slotOf(entry);
    if (!slot) continue;
    const existing = bank.find(other => other.id === slot.id);
    if (existing) existing.n += slot.n; else bank.push({ id: slot.id, n: int((entry as Slot).n, 1, 2_147_483_647, 1) });
  }
  player.bank = bank;
  const x = int(save.x, 0, W - 1, -1), y = int(save.y, 0, H - 1, -1);
  if (inBounds(x, y) && walkable(game.world, x, y)) { player.x = x; player.y = y; player.prev = { x, y }; }
  player.run = !!save.run; player.energy = int(save.energy, 0, 100, 100);
  player.style = (["accurate", "aggressive", "defensive", "controlled"] as const).includes(save.style as CombatStyle) ? save.style as CombatStyle : "accurate";
  const autocast = typeof save.autocast === "string" ? migrateId(save.autocast) : null;
  player.autocast = autocast && SPELLS.some(spell => spell.id === autocast && spell.maxHit) && isStaffEquipped(player) ? autocast : null;
  player.quests = {}; player.questData = {};
  for (const id of QUEST_IDS) { const value = int(save.quests?.[id], 0, 4, 0); if (value) player.quests[id] = value; }
  for (const [key, value] of Object.entries(save.questData ?? {})) if (/^[a-z_]{1,24}$/.test(key)) player.questData[key] = int(value, 0, 1000, 0);
  player.wardrobe = (save.wardrobe ?? []).filter((id): id is WardrobeId => WARDROBE.some(entry => entry.id === id)).filter((id, index, list) => list.indexOf(id) === index);
  player.worn = (save.worn ?? []).filter((id): id is WardrobeId => player.wardrobe.includes(id as WardrobeId));
  player.follower = typeof save.follower === "number" && Number.isSafeInteger(save.follower) && save.follower > 0 ? save.follower : null;
  player.followerGeneration = player.follower !== null ? int(save.followerGeneration, 1, 255, 6) : null;
  player.kills = int(save.kills, 0, 1e9, 0); player.deaths = int(save.deaths, 0, 1e9, 0); player.tutorial = int(save.tutorial, 0, 100, 0);
  // Saves from before the guided start have played already: it counts as done.
  player.guide = save.guide === undefined ? FIRST_STEPS.length : int(save.guide, -1, FIRST_STEPS.length, FIRST_STEPS.length);
  player.created = int(save.created, 0, 1e15, Date.now());
  game.playTicks = int(save.playTicks, 0, 1e10, 0); game.autoRetaliate = save.retaliate !== false;
  player.music = ["theme", ...(Array.isArray(save.music) ? save.music : []).filter((id): id is string => typeof id === "string" && /^[a-z_]{1,24}$/.test(id) && id !== "theme")].slice(0, 32);
  const friendNumber = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value < 1e15 && value !== player.friendId ? value : null;
  player.referredBy = friendNumber(save.referredBy);
  player.referrals = [...new Set((Array.isArray(save.referrals) ? save.referrals : []).map(friendNumber).filter((id): id is number => id !== null))].slice(0, 500);
  player.boostTicks = int(save.boostTicks, 0, REFERRAL_TICKS * 50, 0);
  player.referralTimes = (Array.isArray(save.referralTimes) ? save.referralTimes : []).filter((at): at is number => typeof at === "number" && Number.isFinite(at) && at > 0).slice(-REFERRALS_PER_DAY);
  player.mounts = MOUNTS.filter(mount => Array.isArray(save.mounts) && save.mounts.includes(mount.id)).map(mount => mount.id);
  player.mount = typeof save.mount === "string" && player.mounts.includes(save.mount) ? save.mount : null;
  player.daily = cleanDaily(save.daily, SKILLS);
  player.met = cleanMet(save.met);
  player.achievements = Object.fromEntries(Object.entries(save.achievements && typeof save.achievements === "object" ? save.achievements : {}).filter(([id, day]) => /^[a-z0-9_]{1,32}$/.test(id) && typeof day === "number" && Number.isFinite(day)).slice(0, 100).map(([id, day]) => [id, Math.floor(day as number)]));
  player.pets = PETS.filter(pet => Array.isArray(save.pets) && save.pets.includes(pet.id)).map(pet => pet.id);
  player.petOut = typeof save.petOut === "string" && player.pets.includes(save.petOut) && player.follower === null ? save.petOut : null;
  player.stats = Object.fromEntries(Object.entries(save.stats && typeof save.stats === "object" ? save.stats : {}).filter(([key, n]) => /^[a-zA-Z]{1,24}$/.test(key) && typeof n === "number" && Number.isFinite(n)).slice(0, 40).map(([key, n]) => [key, Math.max(0, Math.min(1e9, Math.floor(n as number)))]));
  player.killLog = Object.fromEntries(Object.entries(save.killLog && typeof save.killLog === "object" ? save.killLog : {}).filter(([id, n]) => id in MONSTERS && typeof n === "number" && Number.isFinite(n)).map(([id, n]) => [id, Math.max(0, Math.min(1e7, Math.floor(n as number)))]));
  // Saves from before the update log see it from the start.
  player.seenUpdate = int(save.seenUpdate, 0, 1e6, 0);
  return true;
}

// ---------- Music unlocks ----------
/** Visiting an area unlocks its track, old-school style. Returns true the first time. */
export function unlockMusic(game: Game, id: string, name: string) {
  if (game.player.music.includes(id)) return false;
  game.player.music.push(id);
  message(game, `You have unlocked a new music track: ${name}.`, "info");
  return true;
}

// ---------- Queries for the UI ----------
export const skillLevels = (game: Game) => Object.fromEntries(SKILLS.map(skill => [skill, level(game, skill)])) as Record<Skill, number>;
export const regionName = (game: Game) => regionAt(game.world, game.player.x, game.player.y).name;
export function nextLevelXp(xp: number) { const current = levelForXp(xp); return current >= 99 ? null : XP_TABLE[current + 1]; }
export const familyName = (game: Game) => FAMILY_NAMES[game.player.familyId];
export { NPCS, questDone, isWater, tileIndex };
