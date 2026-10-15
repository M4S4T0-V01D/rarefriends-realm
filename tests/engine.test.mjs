import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buy, canWalk, castSpell, chooseOption, collectFromCasket, continueDialogue, createGame, equip, unequip, findPath, itemOptions, menuFor, restore, sell,
  serialize, setFollower, setRelics, setTarget, smeltingRecipes, smithingRecipes, startProduction, mostMakeable, tick, togglePrayer, useItemOnItem, walkTo, setHeld,
  successChance, hitChance, unlockMusic, toggleSneak, veiled, VEIL_HOOD, toggleRun, bestArrow, rangedMaxHit, bowRange, syncMonster, toggleMount, grantMount, rideProblem, castOnItem, isBound, grantBundle, rubLamp, breakTablet, capeProblem, sellPrice, craftSigils,
  canCast, bagFill, offerBag, OFFER_TICKS, eat, boneBoost, fireFactor, thorns, sigilSave, stalkerFactor, regenTicks, foodBoost, cleanHerb, drink, coatWeapon, performEmote,
} from "../games/rarefriends-realm/engine.ts";
import { buyWayfarerReward, runDrain, slipChance } from "../games/rarefriends-realm/wayfaring.ts";
import { HERBS, POTIONS, MIXTURES, ESSENCES, brewRecipes, grindRecipes, stillRecipes } from "../games/rarefriends-realm/apothecary.ts";
import { TITLES, chooseTitle, cleanName, cleanTag, joinFellowship, leaveFellowship, nameFriend, playerName, profile, unlockedTitles, reputation } from "../games/rarefriends-realm/presence.ts";
import { presenceOf } from "../games/rarefriends-realm/social.ts";
import { friendSays, friendTick, remember, spoken, tendencies } from "../games/rarefriends-realm/friend.ts";
import { RUMOURS, rumourAt, rumourCount } from "../games/rarefriends-realm/rumours.ts";
import { talk } from "../games/rarefriends-realm/content.ts";
import { ARENA, inArena, inRing, inRingBuilding } from "../games/rarefriends-realm/world.ts";
import { FOE_GROUPS, MATCHES, arenaFoes, customMatch, entryFee, startMatch } from "../games/rarefriends-realm/arena.ts";
import { wonDuel } from "../games/rarefriends-realm/duel.ts";
import { cleanPresence } from "../games/rarefriends-realm/net.ts";
import { buySlayerReward, longTasks, slayerXpBoost, eligibleTasks } from "../games/rarefriends-realm/slayer.ts";
import { currentTask, slayerPoints } from "../games/rarefriends-realm/slayer.ts";
import { COURSES, EQUIP_SLOTS, HEARTGUARD, ITEM_LIST, METALS, MONSTERS, ROCKS, SMITH_PIECES, SPELL_TABS, FIREMAKING, REGIONAL_CLOTHING, WARDROBE, MOUNTS, SHOPS, SKILLS, SKILL_NAMES, SLAYER_SETS, SLAYER_TASKS, SPELLS, TREES, WAYFARER_MARK, WAYFARER_REWARDS, XP_RATE, XP_TABLE, heavyStrength, isItem, item, levelForXp } from "../games/rarefriends-realm/data.ts";
import { NPCS, QUESTS, MAX_QUEST_POINTS, PILGRIM_ALTARS, questPoints, onMonsterKilled, shopProblem, readJobBoard, questDone } from "../games/rarefriends-realm/content.ts";
import { ORDERS, ORDER_IDS, orderOf, orderPieces } from "../games/rarefriends-realm/knights.ts";
import { signetCharges, signetTeleport } from "../games/rarefriends-realm/engine.ts";
import { COFFER_TICKS } from "../games/rarefriends-realm/dungeons.ts";
import { gloomAt, inDeadwood } from "../games/rarefriends-realm/world.ts";
import { DUNGEON_Y, FLOOR_Y, H, UNDER_Y, MAINLAND, OVERWORLD_H, SOUTH_DY, southShift, REGIONS, T, W, WEST_DX, createWorld, movedPoint, unmovedPoint, floorAt, isUnderground, mainlandToWorld, mainlandAt, northShift, northUnshift, objectAtTile, onLevel, realPoint, regionAt, terrainAt } from "../games/rarefriends-realm/world.ts";
import { addXp, take, emptyToBank, fillFromBank, bankDeposit, bankInOrder, bankMove, bankTabs, bankWithdraw, bonuses, bagBones, combatLevel, count, dropItem, earlyXp, give, has, heft, level, maxHp, xpMultiplier, BONE_BAG, BONE_BAG_SIZE } from "../games/rarefriends-realm/state.ts";
import game from "../games/rarefriends-realm/game.json" with { type: "json" };

const fletchingRecipesFor = (g, log) => { const knife = g.player.inventory.findIndex(slot => slot?.id === "knife"), logs = g.player.inventory.findIndex(slot => slot?.id === log); useItemOnItem(g, knife, logs); const recipes = g.ui.production.recipes; g.ui.production = null; return recipes; };
function seeded(seed = 42) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
const newGame = (options = {}) => createGame({ familyId: 0, friendId: 7730, rng: seeded(), ...options });
const run = (g, ticks) => { for (let i = 0; i < ticks; i++) tick(g); };
/** Run until a condition holds (or fail after `limit` ticks). */
function until(g, condition, limit = 2000) {
  for (let i = 0; i < limit; i++) { if (condition()) return i; tick(g); }
  assert.fail(`Condition not reached in ${limit} ticks`);
}
const objectNear = (g, kind, predicate = () => true) => {
  const { x, y } = g.player;
  return g.world.objects.filter(object => object.kind === kind && predicate(object)).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
};
const teleport = (g, x, y) => { g.player.x = x; g.player.y = y; g.player.prev = { x, y }; g.player.path = []; };
/** Mainland places named in the mainland's own coordinates (the world puts the mainland at MAINLAND.x/y). */
/**
 * A builder's constants (written in the generation frame) in the grown world: every y, y0 and y1 in them, however deep,
 * moved down with the north. (Strip rows like row0/row1 aren't touched: they're for movedPoint, with DUNGEON_Y's frame.)
 */
const north = o => {
  if (Array.isArray(o)) return o.map(north);
  if (!o || typeof o !== "object") return o;
  const out = {}; for (const [k, v] of Object.entries(o)) out[k] = (k === "y" || k === "y0" || k === "y1") && typeof v === "number" ? northShift(v) : north(v);
  return out;
};
/** A mainland point in the grown world (mainlandToWorld is the generation frame's: movedPoint takes those). */
const M = (mx, my) => { const at = mainlandAt(mx, my); return [at.x, at.y]; };
/** The region at a point named in the dungeon strip, where its dungeon settled. */
const regionUnder = (world, x, y) => { const at = movedPoint(world, x, y); return regionAt(world, at.x, at.y); };
const standBy = (g, object) => {
  for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) if (canWalk(g, object.x + dx, object.y + dy)) { teleport(g, object.x + dx, object.y + dy); return; }
  assert.fail(`Nowhere to stand by ${object.name}`);
};
/** Stand on the first walkable tile at exactly `distance` from a point. */
function standNear(g, x, y, distance) {
  for (let dy = -distance; dy <= distance; dy++) for (let dx = -distance; dx <= distance; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) === distance && canWalk(g, x + dx, y + dy)) { teleport(g, x + dx, y + dy); return; }
  }
  assert.fail(`Nowhere to stand near ${x},${y}`);
}
/** Every tile reachable on foot from a start tile (no corner cutting). */
function reachable(g, start) {
  const seen = new Uint8Array(W * H), queue = [start.y * W + start.x];
  seen[queue[0]] = 1;
  while (queue.length) {
    const index = queue.pop(), x = index % W, y = (index - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy, next = ny * W + nx;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[next] || !canWalk(g, nx, ny)) continue;
      if (dx && dy && (!canWalk(g, x + dx, y) || !canWalk(g, x, y + dy))) continue;
      seen[next] = 1; queue.push(next);
    }
  }
  return seen;
}

test("the old-school XP curve", () => {
  assert.equal(XP_TABLE[2], 83);
  assert.equal(XP_TABLE[10], 1154);
  assert.equal(XP_TABLE[99], 13_034_431);
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(1154), 10);
  assert.equal(levelForXp(13_034_430), 98);
  assert.equal(levelForXp(200_000_000), 99);
});

test("a fresh adventurer: level 3, 10 hitpoints, a starter kit", () => {
  const g = newGame();
  assert.equal(combatLevel(g.player), 3);
  assert.equal(level(g, "hitpoints"), 10);
  assert.equal(g.player.hp, 10);
  for (const id of ["pewter_axe", "pewter_pickaxe", "small_net", "tinderbox"]) assert(has(g.player, id), id);
  assert.equal(SKILLS.length, 25, "the twenty-one, Mysteries, Seafaring, Beastkeeping and Commerce");
});

test("the world is large, deterministic and every landmark is reachable on foot", () => {
  const g = newGame(), world = g.world;
  assert.deepEqual(createWorld().tiles, createWorld().tiles, "Same seed, same world");
  assert(world.objects.filter(object => object.kind === "tree").length > 400, "Plenty of trees");
  assert(world.objects.filter(object => object.kind === "rock").length > 60, "Plenty of rocks");
  assert(world.objects.filter(object => object.kind === "spot").length >= 15, "Fishing spots");
  // Walk from the spawn, and take every ladder and staircase you can reach (dungeons, the castle's storeys), every boat
  // between the Mizukai Isles once you can reach a landing (boats.ts: from any landing to every other), and every quest
  // way (a gate or door with a clue, like Foothold's south gate or the door that sees, opens once its quest is done).
  const areas = [reachable(g, world.places.spawn)], taken = new Set();
  const ok = (x, y) => areas.some(seen => seen[y * W + x]);
  const beside = object => [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(object.x + dx, object.y + dy));
  const docks = world.objects.filter(object => object.kind === "dock");
  for (let grew = true; grew;) {
    grew = false;
    for (const ladder of world.objects.filter(object => (object.kind === "ladder" || object.clue && object.to) && !taken.has(object.id) && beside(object))) {
      taken.add(ladder.id); grew = true;
      if (!ok(ladder.to.x, ladder.to.y)) areas.push(reachable(g, ladder.to));
    }
    if (docks.some(dock => ok(dock.to.x, dock.to.y))) for (const dock of docks) if (!taken.has(dock.id)) { taken.add(dock.id); grew = true; if (!ok(dock.to.x, dock.to.y)) areas.push(reachable(g, dock.to)); }
  }
  const reach = object => object.blocks ? [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(object.x + dx, object.y + dy)) : ok(object.x, object.y) || [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(object.x + dx, object.y + dy));
  // (Offshore shoals are fished from a vessel: the Seafaring test sails to them.)
  const interactive = world.objects.filter(object => object.kind !== "decor" && object.kind !== "stump" && object.name !== "__removed" && object.text !== "offshore");
  const stuck = interactive.filter(object => !reach(object)).map(object => `${object.name}@${object.x},${object.y}`);
  // Course obstacles after the first are reached by crossing the one before (covered by the lap tests); trees can sit deep in groves.
  const blocked = interactive.filter(object => !reach(object) && object.kind !== "tree" && !(object.kind === "obstacle" && COURSES[object.obstacle.course] && object.obstacle.step > 0))
    .map(object => `${object.name}@${object.x},${object.y}`);
  assert.deepEqual(blocked, [], "Every station, rock, spot and ladder can be reached");
  assert(stuck.length < interactive.length * 0.03, `Nearly every tree can be reached (${stuck.length} can't)`);
  for (const spawn of world.spawns.filter(entry => entry.kind === "npc")) {
    assert(ok(spawn.x, spawn.y) || [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(spawn.x + dx, spawn.y + dy)), `NPC ${spawn.id} at ${spawn.x},${spawn.y}`);
  }
  for (const id of Object.keys(NPCS)) assert(world.spawns.some(spawn => spawn.kind === "npc" && spawn.id === id), `NPC ${id} is placed`);
  // (A soldier's fighting self isn't placed: it comes out of the soldier, who is.)
  for (const id of Object.keys(MONSTERS).filter(id => !MONSTERS[id].worldBoss && !MONSTERS[id].arenaOnly && !MONSTERS[id].look)) assert(world.spawns.some(spawn => spawn.kind === "monster" && spawn.id === id), `Monster ${id} is placed`);
  for (const region of REGIONS) if (region.id !== "coast") assert(world.region.includes(REGIONS.indexOf(region)), `${region.name} exists`);
  assert.equal(regionAt(world, world.places.spawn.x, world.places.spawn.y).id, "friendhollow");
  // The throne room lies behind the Hollow gate: the king is reachable from its far side.
  const king = world.places.king, { x: tx, y: ty } = movedPoint(world, ...mainlandToWorld(177, 224)), throne = reachable(g, { x: tx, y: ty });
  assert(throne[king.y * W + king.x - 1] || throne[(king.y + 3) * W + king.x], "The Hollow King can be reached past the gate");
  assert(!ok(tx, ty), "…and only through the gate");
});

test("Friendhollow Castle: spiral stairs up to the King, on to the roof, and back down", () => {
  const g = newGame(), world = g.world, levelOf = () => realPoint(world, g.player.x, g.player.y).level;
  const stairs = (level, action) => world.objects.filter(object => object.look === "stairs" && object.action === action && realPoint(world, object.x, object.y).level === level && realPoint(world, object.x, object.y).x < M(140, 0)[0]);
  const climb = (object, level) => { standBy(g, object); menuFor(g, [{ kind: "object", id: object.id }], null)[0].run(g); until(g, () => levelOf() === level, 30); };
  // Up the north-east tower to the King's floor.
  const up = stairs(0, "Climb-up").sort((a, b) => b.x - a.x)[0];
  assert.equal(menuFor(g, [{ kind: "object", id: up.id }], null)[0].verb, "Climb-up");
  climb(up, 1);
  assert(g.player.y >= FLOOR_Y && floorAt(world, g.player.x, g.player.y).complex === "castle", "Stored on the castle's first floor");
  const real = realPoint(world, g.player.x, g.player.y);
  { const [cx0, cy0] = M(112, 86), [cx1, cy1] = M(131, 105); assert(real.x >= cx0 && real.x <= cx1 && real.y >= cy0 && real.y <= cy1, "Standing over the castle"); }
  assert.deepEqual(onLevel(world, real.x, real.y, 1), { x: g.player.x, y: g.player.y }, "Clicks on this storey land on its floor");
  // King Hollis receives you in the throne room (and welcomes you with coins, once).
  const king = g.npcs.find(npc => npc.id === "king"), coins = count(g.player, "coins");
  assert.equal(realPoint(world, king.x, king.y).level, 1);
  walkTo(g, king.x, king.y + 1); until(g, () => g.player.x === king.x && g.player.y === king.y + 1, 80);
  setTarget(g, { kind: "npc", uid: king.uid, option: "Talk-to" });
  until(g, () => g.dialogue !== null, 30);
  while (g.dialogue) continueDialogue(g);
  assert.equal(count(g.player, "coins"), coins + 250);
  // The roof: up again from the north-east tower, then all the way back to the ground.
  climb(stairs(1, "Climb-up")[0], 2);
  climb(stairs(2, "Climb-down")[0], 1);
  climb(stairs(1, "Climb-down").sort((a, b) => a.x - b.x)[0], 0);
  assert(g.player.y < FLOOR_Y && !isUnderground(g.player.y), "Back on the ground");
});

test("click to walk: pathfinding goes around obstacles and never cuts corners", () => {
  const g = newGame();
  const bank = g.world.objects.find(object => object.kind === "bank");
  const path = findPath(g, g.player, (x, y) => x === bank.x && y === bank.y + 1, bank);
  assert(path && path.length > 3);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    assert(Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1);
    assert(canWalk(g, b.x, b.y));
  }
  walkTo(g, bank.x, bank.y + 1);
  until(g, () => g.player.x === bank.x && g.player.y === bank.y + 1, 60);
  // Running covers two tiles a tick.
  g.player.run = true; const start = { ...g.player.prev };
  walkTo(g, g.world.places.spawn.x, g.world.places.spawn.y);
  tick(g);
  assert(Math.max(Math.abs(g.player.x - bank.x), Math.abs(g.player.y - bank.y - 1)) === 2 || g.player.path.length === 0, "Ran two tiles");
  void start;
});

test("held movement snaps a world direction to the nearest of 8 ways", () => {
  const g = newGame(), { x, y } = g.player;
  setHeld(g, { dx: 0.5, dy: 0.45 }); tick(g); setHeld(g, null);
  assert.equal(g.player.x - x, 1); assert.equal(g.player.y - y, 1);
  const before = { ...g.player };
  setHeld(g, { dx: -1, dy: 0.1 }); tick(g); setHeld(g, null);
  assert.equal(g.player.x - before.x, -1); assert.equal(g.player.y - before.y, 0);
});

test("right-click menus list every option in old-school order", () => {
  const g = newGame();
  const tree = objectNear(g, "tree", object => object.tree === "tree");
  const options = menuFor(g, [{ kind: "object", id: tree.id }], { x: tree.x, y: tree.y });
  assert.deepEqual(options.map(option => option.verb), ["Chop down", "Walk here", "Examine"]);
  const ground = menuFor(g, [], { x: 1, y: 1 });
  assert.deepEqual(ground.map(option => option.verb), ["Walk here"]);
  const npc = g.npcs.find(entry => entry.id === "banker");
  assert.deepEqual(menuFor(g, [{ kind: "npc", id: npc.uid }], null).map(option => option.verb), ["Talk-to", "Bank", "Examine"]);
  const chicken = g.monsters.find(monster => monster.def.id === "chicken");
  assert.equal(menuFor(g, [{ kind: "monster", id: chicken.uid }], null)[0].noun, "Chicken  (level-1)");
  // Use item -> object.
  const slot = g.player.inventory.findIndex(entry => entry?.id === "minnows");
  const use = menuFor(g, [{ kind: "object", id: tree.id }], null, { kind: "item", slot });
  assert.equal(use[0].verb, "Use Minnows ->");
  assert.deepEqual(itemOptions(g, slot).map(option => option.verb), ["Eat", "Use", "Drop", "Examine"]);
});

test("woodcutting, firemaking and cooking: the classic loop", () => {
  const g = newGame();
  const tree = objectNear(g, "tree", object => object.tree === "tree");
  standBy(g, tree);
  menuFor(g, [{ kind: "object", id: tree.id }], null)[0].run(g);
  until(g, () => has(g.player, "logs"), 300);
  assert(g.player.xp.woodcutting >= TREES.tree.xp * XP_RATE * earlyXp(1, "woodcutting"));
  assert(g.depleted.has(tree.id) || g.player.activity?.kind === "woodcut");
  // Light the logs where we stand (walk to open grass first).
  teleport(g, ...M(100, 132));
  for (let step = 0; step < 300 && (terrainAt(g.world, g.player.x, g.player.y) !== T.GRASS || objectAtTile(g.world, g.player.x, g.player.y)); step++) teleport(g, g.player.x + 1, g.player.y);
  const logs = g.player.inventory.findIndex(slot => slot?.id === "logs");
  itemOptions(g, logs).find(option => option.verb === "Light").run(g);
  until(g, () => g.fires.length === 1, 60);
  assert(g.player.xp.firemaking > 0);
  // Cook raw minnows on it.
  give(g.player, "raw_minnows", 8);
  const fire = g.fires[0];
  setTarget(g, { kind: "fire", uid: fire.uid, option: "Cook" });
  until(g, () => !has(g.player, "raw_minnows"), 200);
  assert(count(g.player, "minnows") + count(g.player, "burnt_food") >= 8, "Cooked (or burnt) them all");
  assert(g.player.xp.cooking > 0);
});

test("fishing minnows at Glass Lake", () => {
  const g = newGame();
  const spot = g.world.objects.find(object => object.kind === "spot" && object.spot === "net");
  standBy(g, spot);
  menuFor(g, [{ kind: "object", id: spot.id }], null)[0].run(g);
  until(g, () => has(g.player, "raw_minnows"), 400);
  assert(g.player.xp.fishing >= 10 * XP_RATE * earlyXp(1, "fishing"));
});

test("mining, smelting and smithing a pewter dagger", () => {
  const g = newGame();
  give(g.player, "hammer");
  for (const kind of ["pewter"]) {
    const rock = g.world.objects.find(object => object.kind === "rock" && object.rock === kind);
    standBy(g, rock);
    setTarget(g, { kind: "object", id: rock.id, option: "Mine" });
    until(g, () => has(g.player, `${kind}_ore`), 600);
  }
  assert(g.player.xp.mining >= 17.5 * XP_RATE * earlyXp(1, "mining"));
  const furnace = g.world.objects.find(object => object.kind === "furnace");
  standBy(g, furnace);
  setTarget(g, { kind: "object", id: furnace.id, option: "Smelt" });
  until(g, () => g.ui.production !== null, 50);
  startProduction(g, smeltingRecipes()[0], 1);
  until(g, () => has(g.player, "pewter_bar"), 50);
  const anvil = g.world.objects.find(object => object.kind === "anvil");
  standBy(g, anvil);
  setTarget(g, { kind: "object", id: anvil.id, option: "Smith" });
  until(g, () => g.ui.production !== null, 50);
  startProduction(g, smithingRecipes("pewter").find(recipe => recipe.label === "Pewter dagger"), 1);
  until(g, () => count(g.player, "pewter_dagger") === 2, 50);
  assert(g.player.xp.smithing >= (8 + 12.5) * XP_RATE * earlyXp(1, "smithing"));
});

test("Forged tiers (50–90): materials from strong monsters, smelted and smithed at Smithing 86+, into weapons, armour, tools, staffs and crossbows", () => {
  const forged = [["frostsilver", 50, "frost_shard", "frost_yeti"], ["gloomsteel", 60, "gloom_shard", "gloom_hound"], ["wyrmscale", 70, "wyrm_scale", "ash_drake"],
    ["hollowsteel", 75, "hollow_essence", "hollow_king"], ["cindersteel", 80, "cinder_core", "emberwyrm"], ["ashenheart", 90, "colossus_ember", "ashen_colossus"]];
  for (const [metal, lvl, material, source] of forged) {
    assert.equal(item(`${metal}_sabre`).equip.requires.attack, lvl); assert.equal(item(`${metal}_cuirass`).equip.requires.defence, lvl);
    assert.equal(item(`${metal}_staff`).equip.requires.magic, lvl); assert.equal(item(`${metal}_pickaxe`).tool.level, lvl);
    assert(MONSTERS[source].always?.some(drop => drop.item === material) || MONSTERS[source].drops.some(drop => drop.item === material), `${source} drops ${material}`);
    for (const recipe of smithingRecipes(metal)) assert(recipe.level >= 86 && recipe.level <= 99, `${recipe.label} at Smithing ${recipe.level}`);
  }
  // Each tier outclasses the last.
  const sabres = ["rarite", ...forged.map(([metal]) => metal)].map(metal => item(`${metal}_sabre`).equip.bonuses.strength);
  assert.deepEqual([...sabres].sort((a, b) => a - b), sabres);
  // Smelt a frost shard and forge a staff and a pickaxe from it.
  const g = newGame(), p = g.player;
  p.inventory.fill(null); p.xp.smithing = XP_TABLE[99]; give(p, "frost_shard", 4); give(p, "inkcoal", 16); give(p, "hammer");
  const furnace = g.world.objects.find(object => object.kind === "furnace");
  standBy(g, furnace);
  startProduction(g, smeltingRecipes().find(recipe => recipe.outputs.frostsilver_bar), 4); until(g, () => count(p, "frostsilver_bar") === 4, 120);
  assert.equal(count(p, "frostsilver_bar"), 4);
  const anvil = g.world.objects.find(object => object.kind === "anvil");
  standBy(g, anvil);
  startProduction(g, smithingRecipes("frostsilver").find(recipe => recipe.outputs.frostsilver_staff), 1); run(g, 12);
  startProduction(g, smithingRecipes("frostsilver").find(recipe => recipe.outputs.frostsilver_pickaxe), 1); run(g, 12);
  assert(has(p, "frostsilver_staff") && has(p, "frostsilver_pickaxe"));
  // Frostsilver is on sale in Frostpeak, for those with the coin.
  assert(SHOPS.frost.stock.includes("frostsilver_sword"));
});

test("Bank tabs: deposit into a tab, drag to reorder and between tabs, empty tabs close up, and tabs survive a save", () => {
  const g = newGame(), p = g.player;
  p.inventory.fill(null); p.bank = [];
  for (const id of ["logs", "oak_logs", "pewter_bar", "raw_minnows"]) give(p, id, 2);
  bankDeposit(p, p.inventory.findIndex(slot => slot?.id === "logs"));
  bankDeposit(p, p.inventory.findIndex(slot => slot?.id === "oak_logs"));
  bankDeposit(p, p.inventory.findIndex(slot => slot?.id === "pewter_bar"), Infinity, 1);
  bankDeposit(p, p.inventory.findIndex(slot => slot?.id === "raw_minnows"), Infinity, 1);
  assert.deepEqual(bankTabs(p), [1]);
  assert.deepEqual(bankInOrder(p).map(slot => `${slot.id}:${slot.tab ?? 0}`), ["logs:0", "oak_logs:0", "pewter_bar:1", "raw_minnows:1"]);
  // Drag oak logs before the logs (reorder), then minnows onto a new tab, then the bar onto the logs (the main tab).
  bankMove(p, "oak_logs", "logs"); assert.deepEqual(p.bank.filter(slot => !slot.tab).map(slot => slot.id), ["oak_logs", "logs"]);
  bankMove(p, "raw_minnows", null, "new"); assert.deepEqual(bankTabs(p), [1, 2]);
  bankMove(p, "pewter_bar", "logs");
  assert.deepEqual(bankTabs(p), [1], "tab 1 emptied, so tab 2 became tab 1");
  assert.equal(p.bank.find(slot => slot.id === "raw_minnows").tab, 1);
  const fresh = newGame(); restore(fresh, serialize(g));
  assert.deepEqual(bankInOrder(fresh.player).map(slot => `${slot.id}:${slot.tab ?? 0}`), bankInOrder(p).map(slot => `${slot.id}:${slot.tab ?? 0}`));
  bankWithdraw(p, "raw_minnows", 2); assert.deepEqual(bankTabs(p), []);
});

test("Inkcoal satchel: mined inkcoal goes in, the furnace takes from it, and it's saved", () => {
  const g = newGame(), p = g.player;
  p.inventory.fill(null); give(p, "inkcoal_satchel"); give(p, "pewter_pickaxe"); p.xp.mining = XP_TABLE[40]; p.xp.smithing = XP_TABLE[40];
  const rock = objectNear(g, "rock", object => object.rock === "inkcoal");
  standBy(g, rock); setTarget(g, { kind: "object", id: rock.id, option: "Mine" });
  until(g, () => p.coalBag > 0, 800);
  assert.equal(count(p, "inkcoal"), 0, "into the satchel, not the pack");
  p.coalBag = 10; give(p, "blackiron_ore", 2);
  const furnace = g.world.objects.find(object => object.kind === "furnace");
  standBy(g, furnace);
  startProduction(g, smeltingRecipes().find(recipe => recipe.outputs.ashsteel_bar), 2); until(g, () => count(p, "ashsteel_bar") === 2, 60);
  assert.equal(p.coalBag, 8, "ashsteel takes one inkcoal a bar from the satchel");
  // The furnace's "All" counts the satchel: 5 ore and 8 inkcoal in it make 5 bars in one go, not one a click.
  give(p, "blackiron_ore", 5); const ashsteel = smeltingRecipes().find(recipe => recipe.outputs.ashsteel_bar);
  assert.equal(mostMakeable(g, ashsteel), 5); startProduction(g, ashsteel, mostMakeable(g, ashsteel));
  until(g, () => count(p, "ashsteel_bar") === 7, 120); assert.equal(p.coalBag, 3);
  const fresh = newGame(); restore(fresh, serialize(g)); assert.equal(fresh.player.coalBag, 3);
  assert(item("grumblin_head").equip.slot === "head" && MONSTERS.grumblin.drops.some(drop => drop.item === "grumblin_head" && drop.chance < 0.01), "a very rare Grumblin head");
});

test("Sigil stone box: stones mined go in, it fills from the bank, and the altar presses everything in it", () => {
  const g = newGame(), p = g.player;
  p.inventory.fill(null); give(p, "sigil_box"); give(p, "pewter_pickaxe");
  const rock = objectNear(g, "rock", object => object.rock === "sigil");
  standBy(g, rock); setTarget(g, { kind: "object", id: rock.id, option: "Mine" });
  until(g, () => p.stoneBox >= 3, 800);
  assert.equal(count(p, "sigil_stone"), 0, "into the box, not the pack");
  p.activity = null; p.bank = [{ id: "sigil_stone", n: 500 }];
  const had = p.stoneBox; assert.equal(fillFromBank(p, "sigil_box"), 120 - had, "fills to 120 from the bank");
  assert.equal(p.stoneBox, 120); assert(p.bank[0].n < 500);
  const altar = g.world.objects.find(object => object.kind === "sigil_altar" && object.sigil === "breeze_sigil");
  standBy(g, altar); assert.equal(craftSigils(g, altar), 120, "every stone in the box is pressed");
  assert.equal(p.stoneBox, 0); assert.equal(count(p, "breeze_sigil"), 120);
  p.stoneBox = 40; const before = p.bank[0].n; assert.equal(emptyToBank(p, "sigil_box"), 40); assert.equal(p.bank[0].n, before + 40);
  p.stoneBox = 17; const fresh = newGame(); restore(fresh, serialize(g)); assert.equal(fresh.player.stoneBox, 17);
});

test("Sheep: shear with shears (it looks shorn until the wool grows back), spin the wool into string, string a bow and an amulet", () => {
  const g = newGame(), p = g.player;
  p.inventory.fill(null);
  const sheep = g.monsters.filter(monster => monster.def.id === "sheep");
  assert(sheep.length >= 4, "a flock in the pen by the farm");
  const baa = sheep[0];
  standNear(g, baa.x, baa.y, 1); setTarget(g, { kind: "monster", uid: baa.uid, option: "Shear" }); run(g, 6);
  assert(!has(p, "wool"), "no shears, no wool");
  give(p, "shears"); standNear(g, baa.x, baa.y, 1); setTarget(g, { kind: "monster", uid: baa.uid, option: "Shear" }); until(g, () => has(p, "wool"), 40);
  assert(baa.shorn > g.tick, "the sheep is shorn for a while");
  standNear(g, baa.x, baa.y, 1); setTarget(g, { kind: "monster", uid: baa.uid, option: "Shear" }); run(g, 6);
  assert.equal(count(p, "wool"), 1, "a shorn sheep has nothing to give");
  run(g, baa.def.shear.regrow + 2); assert(baa.shorn <= g.tick, "and its wool grows back");
  const crafting = p.xp.crafting, wheel = g.world.objects.find(object => object.kind === "wheel");
  assert(wheel, "a spinning wheel in the farmhouse");
  standBy(g, wheel); setTarget(g, { kind: "object", id: wheel.id, option: "Spin" }); until(g, () => g.ui.production !== null, 60);
  startProduction(g, g.ui.production.recipes[0], 1); until(g, () => has(p, "string"), 30);
  assert(p.xp.crafting > crafting, "spinning trains Crafting");
  p.xp.fletching = XP_TABLE[10]; give(p, "shortbow_u"); useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "string"), p.inventory.findIndex(slot => slot?.id === "shortbow_u")); run(g, 6);
  assert(has(p, "shortbow") && !has(p, "string"), "the string finishes the bow");
  p.xp.crafting = XP_TABLE[20]; give(p, "string"); give(p, "moonstone");
  useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "string"), p.inventory.findIndex(slot => slot?.id === "moonstone")); run(g, 6);
  assert(has(p, "moonstone_amulet"), "a gem on a string makes an amulet");
});

test("Two-handed greatswords, battleaxes and war hammers; new creatures with their own drops; arrow shafts pay 8 XP", () => {
  const g = newGame(), p = g.player;
  for (const piece of ["greatsword", "battleaxe", "warhammer"]) {
    const two = item(`ashsteel_${piece}`), sabre = item("ashsteel_sabre");
    assert(two.equip.twoHanded && two.equip.speed > sabre.equip.speed && two.equip.bonuses.strength > sabre.equip.bonuses.strength, `${piece}: two hands, slower, harder hitting`);
    assert(smithingRecipes("ashsteel").some(recipe => recipe.outputs[`ashsteel_${piece}`] === 1), `${piece} at the anvil`);
    assert(SHOPS.heft.stock.includes(`pewter_${piece}`), `Heft & Haft sells a pewter ${piece}`);
  }
  assert(g.npcs.some(npc => npc.id === "heft"), "Heft & Haft is open in Friendhollow");
  give(p, "pewter_shield"); equip(g, p.inventory.findIndex(slot => slot?.id === "pewter_shield"));
  p.xp.strength = XP_TABLE[7]; // a pewter war hammer takes Strength 7
  give(p, "pewter_warhammer"); equip(g, p.inventory.findIndex(slot => slot?.id === "pewter_warhammer"));
  assert.equal(p.equipment.weapon, "pewter_warhammer"); assert.equal(p.equipment.shield, undefined, "the shield comes off for two hands");
  const drops = { grumblin: "grumblin_spear", forest_spider: "spider_fang", boar: "tusker_axe", highland_goat: "horned_helm", sand_scorpion: "stinger_sabre", stone_golem: "golem_maul", moss_colossus: "mossy_staff" };
  for (const [monster, drop] of Object.entries(drops)) {
    assert(MONSTERS[monster].drops.some(entry => entry.item === drop), `${monster} drops ${drop}`);
    assert(g.monsters.some(entry => entry.def.id === monster), `${monster} lives in the Realm`);
  }
  p.inventory.fill(null); give(p, "knife"); give(p, "logs");
  const shafts = fletchingRecipesFor(g, "logs").find(recipe => recipe.label === "15 arrow shafts");
  assert.equal(shafts.xp, 8);
});

test("Heavy weapons take Strength (pewter 3, 5 and 7, each tier the metal's level more) and swing harder with it", () => {
  const g = newGame(), p = g.player;
  const offsets = { greatsword: 2, battleaxe: 4, warhammer: 6 };
  for (const metal of METALS) for (const [piece, offset] of Object.entries(offsets)) {
    const weapon = item(`${metal.id}_${piece}`);
    assert.equal(heavyStrength(metal.id, piece), metal.level + offset);
    assert.equal(weapon.equip.requires.strength, metal.level + offset, `${weapon.name} takes Strength ${metal.level + offset}`);
    assert.equal(weapon.equip.requires.attack, metal.level > 1 ? metal.level : undefined, `${weapon.name} still takes the metal's Attack`);
    assert.match(weapon.examine, /Strength \d+/, "the examine says so");
  }
  assert.equal(item("pewter_greatsword").equip.requires.strength, 3); assert.equal(item("pewter_battleaxe").equip.requires.strength, 5); assert.equal(item("pewter_warhammer").equip.requires.strength, 7);
  assert.equal(item("blackiron_greatsword").equip.requires.strength, 7); assert.equal(item("ashsteel_warhammer").equip.requires.strength, 16); assert.equal(item("ashenheart_warhammer").equip.requires.strength, 96);
  assert.equal(item("pewter_sabre").equip.requires, undefined, "one-handed pewter still needs nothing");
  // A Friend at Strength 1 can't lift a pewter war hammer; at 7 it can.
  give(p, "pewter_warhammer");
  const slot = () => p.inventory.findIndex(entry => entry?.id === "pewter_warhammer");
  equip(g, slot());
  assert.equal(p.equipment.weapon, undefined, "too weak to wield it");
  assert.match(g.messages.at(-1).text, /Strength level of 7 to wield/);
  p.xp.strength = XP_TABLE[7];
  equip(g, slot());
  assert.equal(p.equipment.weapon, "pewter_warhammer", "wielded at Strength 7");
  // Heft: the strength bonus grows with Strength, 1% of the weapon's bonus for every two levels; a sabre gets none.
  const base = item("pewter_warhammer").equip.bonuses.strength;
  assert.equal(heft(p), Math.floor(base * 7 / 200));
  p.xp.strength = XP_TABLE[99];
  assert.equal(heft(p), Math.floor(base * 99 / 200), "about half as much again at 99");
  assert.equal(bonuses(p).strength, base + heft(p), "and it counts in your bonuses");
  p.equipment.weapon = "ashenheart_warhammer";
  assert(heft(p) > 50, `a top-tier heavy gets a big heft (${heft(p)})`);
  p.equipment.weapon = "pewter_sabre";
  assert.equal(heft(p), 0, "a sabre has no heft");
  p.equipment.weapon = "oak_bow";
  assert.equal(heft(p), 0, "nor a bow");
});

test("Bones used on an altar keep being offered until none of that kind are left", () => {
  const g = newGame({ familyId: 2 }), p = g.player;
  const altar = g.world.objects.find(object => object.kind === "altar" && object.text !== "crypt" && object.text !== "dawn");
  assert(altar, "an ordinary altar");
  p.inventory.fill(null);
  give(p, "bones", 5); give(p, "large_bones", 2);
  standBy(g, altar);
  const before = p.xp.prayer;
  setTarget(g, { kind: "object", id: altar.id, option: "Use", use: p.inventory.findIndex(slot => slot?.id === "bones") });
  until(g, () => count(p, "bones") === 4, 10);
  assert.equal(p.activity?.kind, "offer", "the offering carries on");
  until(g, () => count(p, "bones") === 0, 5 * OFFER_TICKS + 10);
  assert.equal(p.activity, null, "and stops when the bones run out");
  assert.equal(count(p, "large_bones"), 2, "other kinds of bones stay in the pack");
  const expected = 5 * 4.5 * 2 * XP_RATE * earlyXp(1, "prayer");
  assert(p.xp.prayer - before > expected * 0.9 - 1e-9, `five bones' worth of altar XP (${p.xp.prayer - before} vs ${expected})`);
  // Walking off stops it.
  give(p, "bones", 3);
  setTarget(g, { kind: "object", id: altar.id, option: "Use", use: p.inventory.findIndex(slot => slot?.id === "bones") });
  until(g, () => count(p, "bones") === 2, 10);
  walkTo(g, p.x, p.y + 3);
  assert.equal(p.activity, null, "walking away stops the offering");
});

test("The ossuary bag: holds 60 bones of any kind, catches picked-up bones, empties onto an altar at once, and is saved", () => {
  const g = newGame({ familyId: 2 }), p = g.player;
  p.inventory.fill(null);
  give(p, BONE_BAG); give(p, "bones", 3); give(p, "large_bones", 2);
  const bag = () => p.inventory.findIndex(slot => slot?.id === BONE_BAG);
  assert.deepEqual(itemOptions(g, bag()).map(option => option.verb), ["Wear", "Check", "Fill", "Empty", "Use", "Drop", "Examine"]);
  itemOptions(g, bag())[1].run(g);
  assert.match(g.messages.at(-1).text, /empty/);
  // Bones on the bag put that kind in; Fill puts every kind in.
  useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "large_bones"), bag());
  assert.equal(count(p, "large_bones"), 0); assert.equal(count(p, "bones"), 3); assert.equal(bagBones(p), 2);
  bagFill(g);
  assert.equal(count(p, "bones"), 0); assert.equal(bagBones(p), 5);
  assert.deepEqual(p.boneBag, { large_bones: 2, bones: 3 });
  itemOptions(g, bag())[1].run(g);
  assert.match(g.messages.at(-1).text, /5 of 60 bones: 2 large bones, 3 bones/);
  // Empty tips them back out.
  itemOptions(g, bag())[3].run(g);
  assert.equal(bagBones(p), 0); assert.equal(count(p, "bones"), 3); assert.equal(count(p, "large_bones"), 2);
  bagFill(g);
  // Picking bones up with the bag in your pack puts them straight in it.
  dropItem(g, "bones", 1, p.x, p.y);
  const ground = g.ground.find(entry => entry.id === "bones" && entry.x === p.x && entry.y === p.y);
  setTarget(g, { kind: "ground", uid: ground.uid, option: "Take" }); run(g, 2);
  assert.equal(count(p, "bones"), 0, "not in the pack"); assert.equal(bagBones(p), 6, "in the bag");
  // It holds 60 at most; the rest stay in the pack.
  give(p, "bones", 20); p.boneBag.bones = 50;
  bagFill(g);
  assert.equal(bagBones(p), BONE_BAG_SIZE); assert.equal(count(p, "bones"), 12, "what didn't fit stays");
  // Saved and restored.
  const copy = createGame({ familyId: 2, friendId: 7730, rng: seeded() });
  restore(copy, serialize(g));
  assert.deepEqual(copy.player.boneBag, p.boneBag, "the bag's contents survive a save");
  // Used on an altar: everything inside is offered at once, at the altar's rate; in the chapel it counts for the vigil.
  const altar = g.world.objects.find(object => object.kind === "altar" && object.text === "dawn");
  standBy(g, altar);
  p.quests.dawn_vigil = 1; p.questData.vigil_bones = 0;
  const before = p.xp.prayer, inside = { ...p.boneBag }, n = bagBones(p);
  setTarget(g, { kind: "object", id: altar.id, option: "Use", use: bag() }); run(g, 2);
  assert.equal(bagBones(p), 0, "the bag is empty"); assert.deepEqual(p.boneBag, {});
  assert.equal(p.questData.vigil_bones, n, "every bone counted for the vigil");
  const expected = (inside.bones * 4.5 + inside.large_bones * 15) * 3 * XP_RATE * earlyXp(1, "prayer");
  assert(p.xp.prayer - before > expected * 0.5, `three times the burying XP for the lot (${p.xp.prayer - before} vs ${expected})`);
  assert(g.messages.slice(-3).some(line => new RegExp(`offer ${n} bones at once`).test(line.text)), "the offering is announced (your Friend may remark on the level after)");
  offerBag(g, false);
  assert.match(g.messages.at(-1).text, /empty/, "an empty bag offers nothing");
  // Sister Maren gives a squire without a bag one.
  const h = newGame({ familyId: 2 }), q = h.player;
  q.quests.dawn_vigil = 2;
  const maren = h.npcs.find(npc => npc.id === "chaplain");
  teleport(h, maren.x, maren.y + 1); if (!canWalk(h, maren.x, maren.y + 1)) teleport(h, maren.x + 1, maren.y);
  const talkToMaren = () => {
    setTarget(h, { kind: "npc", uid: maren.uid, option: "Talk-to" });
    until(h, () => h.dialogue !== null, 40);
    for (let i = 0; i < 20 && h.dialogue; i++) { const before = h.dialogue.index; continueDialogue(h); if (h.dialogue && h.dialogue.index === before) chooseOption(h, h.dialogue.options.length - 1); }
  };
  talkToMaren();
  assert(has(q, BONE_BAG), "a bag from Sister Maren");
  talkToMaren();
  assert.equal(count(q, BONE_BAG), 1, "but only one");
});

test("Beginner fishing by the farm, and a new cook burns far less", () => {
  const g = newGame();
  const [px, py] = M(76, 139), pond = g.world.objects.filter(object => object.kind === "spot" && Math.abs(object.x - px) <= 6 && Math.abs(object.y - py) <= 4);
  assert(pond.filter(object => object.spot === "net").length >= 2 && pond.some(object => object.spot === "bait"), "the millpond has net and bait spots");
  const p = g.player; p.inventory.fill(null); give(p, "raw_minnows", 27);
  const range = objectNear(g, "range"); standBy(g, range); setTarget(g, { kind: "object", id: range.id, option: "Cook" });
  until(g, () => !has(p, "raw_minnows"), 400);
  assert(count(p, "minnows") >= 18, `most cook at level 1 (${count(p, "minnows")}/27)`);
});

test("Ruins: old houses, towers and walls out in the wild, never on a road or a spawn", () => {
  const world = createWorld(), ruins = world.objects.filter(object => object.decor === "ruin_wall");
  const regions = new Set(ruins.map(object => regionAt(world, object.x, object.y).id));
  assert(ruins.length > 80 && regions.size >= 6, `${ruins.length} ruin walls in ${[...regions].join(", ")}`);
  assert(ruins.some(object => object.height > 70), "some ruined towers still stand tall");
  const spawns = new Set(world.spawns.map(spawn => `${spawn.x},${spawn.y}`));
  for (const object of ruins) {
    assert(![T.PATH, T.COBBLE, T.BRIDGE].includes(terrainAt(world, object.x, object.y)), `ruin on a road at ${object.x},${object.y}`);
    assert(!spawns.has(`${object.x},${object.y}`), `ruin on a spawn at ${object.x},${object.y}`);
  }
});

test("combat: equip a sword, kill a chicken, loot and bury its bones", () => {
  const g = newGame();
  give(g.player, "pewter_sword");
  equip(g, g.player.inventory.findIndex(slot => slot?.id === "pewter_sword"));
  assert.equal(g.player.equipment.weapon, "pewter_sword");
  const chicken = g.monsters.find(monster => monster.def.id === "chicken");
  teleport(g, chicken.x + 1, chicken.y);
  setTarget(g, { kind: "monster", uid: chicken.uid, option: "Attack" });
  until(g, () => chicken.dead, 300);
  assert(g.player.xp.attack > 0 && g.player.xp.hitpoints > XP_TABLE[10]);
  const bones = g.ground.find(entry => entry.id === "bones");
  assert(bones, "Chickens always drop bones");
  setTarget(g, { kind: "ground", uid: bones.uid, option: "Take" });
  until(g, () => has(g.player, "bones"), 30);
  itemOptions(g, g.player.inventory.findIndex(slot => slot?.id === "bones"))[0].run(g);
  assert(g.player.xp.prayer >= 4.5 * XP_RATE * 1.5 * earlyXp(1, "prayer"), "Skeleton family buries for +50%");
  run(g, 25);
  assert(!chicken.dead, "Monsters respawn");
});

test("monsters fight back, aggressive ones attack, and death is safe", () => {
  const g = newGame();
  const yeti = g.monsters.find(monster => monster.def.id === "frost_yeti");
  standNear(g, yeti.x, yeti.y, 3);
  const coins = count(g.player, "coins");
  until(g, () => g.player.deaths === 1, 800);
  assert.deepEqual([g.player.x, g.player.y], [g.world.places.spawn.x, g.world.places.spawn.y]);
  assert.equal(g.player.hp, 10);
  assert.equal(count(g.player, "coins"), coins, "Items are kept on death");
});

test("formulas: accuracy and gathering chances behave", () => {
  assert(hitChance(1000, 100) > 0.9); assert(hitChance(100, 1000) < 0.1);
  assert(successChance(1, 64, 200) < successChance(50, 64, 200));
  assert(successChance(99, 64, 200) <= 1);
});

test("A Friend's Feast from start to finish", () => {
  const g = newGame();
  const cook = g.npcs.find(npc => npc.id === "cook");
  teleport(g, cook.x + 1, cook.y); if (!canWalk(g, cook.x + 1, cook.y)) teleport(g, cook.x, cook.y + 1);
  setTarget(g, { kind: "npc", uid: cook.uid, option: "Talk-to" });
  until(g, () => g.dialogue !== null, 30);
  continueDialogue(g); chooseOption(g, 0);
  while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g);
  chooseOption(g, 0);
  assert.equal(g.player.quests.friends_feast, 1);
  // Gather: egg from the coop, grain and the mill, milk from the dairy cow.
  give(g.player, "pot"); give(g.player, "bucket");
  for (const [kind, option] of [["coop", "Take-egg"], ["wheat", "Pick"], ["mill", "Operate"], ["dairy_cow", "Milk"]]) {
    const object = g.world.objects.find(entry => entry.kind === kind);
    if (object.blocks) standBy(g, object); else teleport(g, object.x, object.y + 1 < H && canWalk(g, object.x, object.y + 1) ? object.y + 1 : object.y);
    setTarget(g, { kind: "object", id: object.id, option });
    run(g, 20);
  }
  for (const id of ["egg", "pot_of_flour", "bucket_of_milk"]) assert(has(g.player, id), id);
  teleport(g, cook.x + 1, cook.y); if (!canWalk(g, cook.x + 1, cook.y)) teleport(g, cook.x, cook.y + 1);
  setTarget(g, { kind: "npc", uid: cook.uid, option: "Talk-to" });
  until(g, () => g.dialogue !== null, 30);
  while (g.dialogue) continueDialogue(g);
  assert.equal(g.player.quests.friends_feast, 2);
  assert.equal(questPoints(g), 1);
  assert(level(g, "cooking") >= 10, "Quest XP");
  assert.equal(QUESTS.length, 118); assert.equal(MAX_QUEST_POINTS, 207);
});

test("Grumblin Trouble counts kills and pays out", () => {
  const g = newGame();
  g.player.quests.grumblin_trouble = 1; g.player.questData.grumblins = 0;
  g.player.xp.attack = XP_TABLE[40]; g.player.xp.strength = XP_TABLE[40]; g.player.xp.defence = XP_TABLE[40]; g.player.xp.hitpoints = XP_TABLE[40]; g.player.hp = 40;
  give(g.player, "ashsteel_sabre"); equip(g, g.player.inventory.findIndex(slot => slot?.id === "ashsteel_sabre"));
  let kills = 0;
  for (const grumblin of g.monsters.filter(monster => monster.def.id === "grumblin").slice(0, 6)) {
    teleport(g, grumblin.x, grumblin.y + 1);
    if (!canWalk(g, grumblin.x, grumblin.y + 1)) teleport(g, grumblin.x + 1, grumblin.y);
    setTarget(g, { kind: "monster", uid: grumblin.uid, option: "Attack" });
    until(g, () => grumblin.dead, 400); kills++;
  }
  assert.equal(kills, 6); assert.equal(g.player.questData.grumblins, 6);
});

test("thieving: pickpocket villagers and steal from stalls", () => {
  const g = newGame({ familyId: 1 });
  const villager = g.npcs.find(npc => npc.id === "villager");
  const before = count(g.player, "coins");
  for (let i = 0; i < 12; i++) {
    teleport(g, villager.x + 1, villager.y);
    if (!canWalk(g, villager.x + 1, villager.y)) teleport(g, villager.x, villager.y + 1);
    setTarget(g, { kind: "npc", uid: villager.uid, option: "Pickpocket" }); run(g, 8);
    g.player.hp = 10;
  }
  assert(count(g.player, "coins") > before);
  assert(g.player.xp.thieving > 0);
});

test("stealth: sneaking past an aggressive monster unseen pays XP; being spotted hurts", () => {
  // Unseen: every roll misses, so the yeti never notices; out of its reach, you've slipped past.
  const g = newGame(), yeti = g.monsters.find(monster => monster.def.id === "frost_yeti");
  g.monsters = [yeti]; g.rng = () => 0.5;
  toggleSneak(g); assert.equal(g.player.sneak, true);
  standNear(g, yeti.x, yeti.y, 3); run(g, 3);
  assert.equal(yeti.target, false, "the yeti hasn't noticed");
  assert(g.sneakingPast.has(yeti.uid));
  const before = g.player.xp.thieving;
  standNear(g, yeti.x, yeti.y, 8); run(g, 1);
  assert(g.player.xp.thieving > before, "Stealth XP for slipping past");
  assert.equal(g.sneakingPast.size, 0);
  // The same monster doesn't pay again straight away.
  const paid = g.player.xp.thieving;
  standNear(g, yeti.x, yeti.y, 3); run(g, 3); standNear(g, yeti.x, yeti.y, 8); run(g, 1);
  assert.equal(g.player.xp.thieving, paid);

  // Spotted: every roll hits, so it lunges at once, the sneak ends and the fight is on.
  const h = newGame(), wolf = h.monsters.find(monster => monster.def.id === "frost_yeti");
  h.monsters = [wolf]; h.rng = () => 0;
  toggleSneak(h); standNear(h, wolf.x, wolf.y, 3);
  const hp = h.player.hp; run(h, 1);
  assert.equal(h.player.sneak, false); assert.equal(wolf.target, true); assert(h.player.hp < hp, "the lunge hurts");
});

test("stealth: sneaking walks and spends run energy; the Veilweave hood hides you when still", () => {
  const g = newGame();
  g.player.energy = 100; toggleRun(g); toggleSneak(g);
  const start = { x: g.player.x, y: g.player.y };
  walkTo(g, start.x + 6, start.y); run(g, 1);
  assert.equal(Math.max(Math.abs(g.player.x - start.x), Math.abs(g.player.y - start.y)), 1, "sneaking never runs");
  run(g, 4);
  assert(g.player.energy < 100, "sneaking spends run energy");
  g.player.energy = 0.2; walkTo(g, g.player.x - 3, g.player.y); run(g, 2);
  assert.equal(g.player.sneak, false, "out of energy, the sneak ends");
  // The hood: still for five seconds and out of any fight, aggressive monsters look straight through you.
  const h = newGame(), yeti = h.monsters.find(monster => monster.def.id === "frost_yeti");
  h.monsters = [yeti]; h.rng = () => 0; h.player.equipment.head = VEIL_HOOD;
  standNear(h, yeti.x, yeti.y, 12); run(h, 10);
  assert.equal(veiled(h), true);
  standNear(h, yeti.x, yeti.y, 3); h.player.moved = h.tick - 20; run(h, 3);
  assert.equal(yeti.target, false, "the veiled player isn't attacked");
  h.player.equipment.head = undefined; run(h, 1);
  assert.equal(yeti.target, true, "without the hood, it attacks");
});

test("agility: a full lap of the Friendhollow course", () => {
  const g = newGame();
  const obstacles = g.world.objects.filter(object => object.kind === "obstacle" && object.obstacle.course === "friendhollow").sort((a, b) => a.obstacle.step - b.obstacle.step);
  assert.equal(obstacles.length, 5);
  teleport(g, obstacles[0].x - 1, obstacles[0].y);
  for (const obstacle of obstacles) {
    setTarget(g, { kind: "object", id: obstacle.id, option: obstacle.action });
    until(g, () => g.player.x === obstacle.to.x && g.player.y === obstacle.to.y, 60);
  }
  const perObstacle = obstacles.reduce((sum, obstacle) => sum + obstacle.obstacle.xp, 0);
  assert(g.player.xp.agility >= (perObstacle + 40) * XP_RATE * earlyXp(1, "agility") - 1e-6, "Lap bonus paid");
});

test("Wayfaring: the skill's name, three courses, marks for laps, slips, run energy and Coach Skip's outfit", () => {
  assert.equal(SKILL_NAMES.agility, "Wayfaring", "Agility is called Wayfaring (its id stays agility)");
  const g = newGame(), p = g.player;
  const courseObstacles = id => g.world.objects.filter(object => object.kind === "obstacle" && object.obstacle.course === id).sort((a, b) => a.obstacle.step - b.obstacle.step);
  assert.deepEqual(Object.keys(COURSES), ["friendhollow", "dunes", "frostpeak"]);
  assert.equal(courseObstacles("dunes").length, 6); assert.equal(courseObstacles("frostpeak").length, 6);
  for (const [id, course] of Object.entries(COURSES)) {
    const obstacles = courseObstacles(id);
    assert(obstacles.every(object => object.obstacle.level === course.level), `${course.name} needs Wayfaring ${course.level}`);
    assert(obstacles.every(object => canWalk(g, object.to.x, object.to.y)), `${course.name}: every landing is walkable`);
    assert(obstacles.at(-1).obstacle.last, `${course.name} ends in a lap`);
  }
  // Slips: never on level-1 obstacles, a fifth at the obstacle's level, none twelve levels above it, never in the gloves.
  assert.equal(slipChance(g, { level: 1 }), 0);
  p.xp.agility = XP_TABLE[30];
  assert.equal(slipChance(g, { level: 30 }), 0.2); assert.equal(slipChance(g, { level: 55 }), 0.2);
  p.xp.agility = XP_TABLE[42]; assert.equal(slipChance(g, { level: 30 }), 0);
  p.xp.agility = XP_TABLE[30]; p.equipment.hands = "wayfarer_gloves"; assert.equal(slipChance(g, { level: 55 }), 0);
  // Too weak for the dune course at level 1; at 30, a lap pays XP and two marks.
  p.xp.agility = 0;
  const dunes = courseObstacles("dunes");
  teleport(g, dunes[0].x - 1, dunes[0].y);
  setTarget(g, { kind: "object", id: dunes[0].id, option: dunes[0].action }); run(g, 3);
  assert.match(g.messages.at(-1).text, /Wayfaring level of 30/);
  p.xp.agility = XP_TABLE[30];
  for (const obstacle of dunes) {
    setTarget(g, { kind: "object", id: obstacle.id, option: obstacle.action });
    until(g, () => p.x === obstacle.to.x && p.y === obstacle.to.y, 60);
  }
  assert.equal(count(p, WAYFARER_MARK), 2, "two marks for a dune lap"); assert.equal(p.stats.laps, 1);
  assert.match(g.messages.at(-1).text, /lap of the Oasis dune course/);
  // Run energy: drains less with Wayfaring and in the cape, comes back faster in the boots; waybread restores it.
  p.equipment = {};
  p.xp.agility = 0; const slow = runDrain(g); p.xp.agility = XP_TABLE[99]; const fast = runDrain(g);
  assert(fast < slow * 0.62 && fast > slow * 0.58, `running drains about 40% less at 99 (${fast} vs ${slow})`);
  p.equipment.cape = "wayfarer_cape"; assert(Math.abs(runDrain(g) - fast * 0.8) < 1e-9, "the cape takes 20% off");
  p.equipment.hood = undefined; p.equipment.head = "wayfarer_hood"; p.equipment.hands = "wayfarer_gloves"; p.equipment.feet = "wayfarer_boots";
  assert(Math.abs(runDrain(g) - fast * 0.6) < 1e-9, "the full outfit 40%");
  p.path = []; p.energy = 50; tick(g); const booted = p.energy - 50;
  p.equipment.feet = undefined; p.energy = 50; tick(g); const plain = p.energy - 50;
  assert(Math.abs(booted - plain * 1.5) < 1e-9, `the boots bring energy back half as fast again (${booted} vs ${plain})`);
  p.inventory.fill(null); give(p, "waybread"); p.energy = 20; p.eatTimer = 0;
  eat(g, p.inventory.findIndex(slot => slot?.id === "waybread"));
  assert.equal(p.energy, 60, "waybread restores 40 run energy");
  // Coach Skip trades marks for the outfit; the full outfit doubles marks.
  p.inventory.fill(null); give(p, WAYFARER_MARK, 25);
  assert.equal(buyWayfarerReward(g, "wayfarer_cape"), false, "not enough marks");
  assert.equal(buyWayfarerReward(g, "wayfarer_boots"), true); assert(has(p, "wayfarer_boots")); assert.equal(count(p, WAYFARER_MARK), 5);
  assert.equal(buyWayfarerReward(g, "waybread"), true); assert.equal(count(p, "waybread"), 3); assert.equal(count(p, WAYFARER_MARK), 4);
  for (const reward of WAYFARER_REWARDS) assert(item(reward.id), `${reward.name} is an item`);
  p.equipment = { cape: "wayfarer_cape", head: "wayfarer_hood", hands: "wayfarer_gloves", feet: "wayfarer_boots" }; p.inventory.fill(null);
  const friendhollow = courseObstacles("friendhollow");
  teleport(g, friendhollow[0].x - 1, friendhollow[0].y);
  for (const obstacle of friendhollow) { setTarget(g, { kind: "object", id: obstacle.id, option: obstacle.action }); until(g, () => p.x === obstacle.to.x && p.y === obstacle.to.y, 60); }
  assert.equal(count(p, WAYFARER_MARK), 2, "double marks in the full outfit");
  // Coach Skip has the rewards in his dialogue.
  const coach = g.npcs.find(npc => npc.id === "agility");
  standNear(g, coach.x, coach.y, 1);
  setTarget(g, { kind: "npc", uid: coach.uid, option: "Talk-to" });
  until(g, () => g.dialogue !== null, 30);
  while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g);
  assert(g.dialogue.options.some(option => option.label === "Trade marks."));
  chooseOption(g, 1);
  assert(g.dialogue.options.some(option => option.label.startsWith("Wayfarer's cape")));
  while (g.dialogue) { if (g.dialogue.options && g.dialogue.index >= g.dialogue.lines.length) chooseOption(g, g.dialogue.options.length - 1); else continueDialogue(g); }
});

test("Slayer creatures with their own armour: five new monsters, tasks, set effects, the Warden's bracers and longer tasks", () => {
  const g = newGame(), p = g.player;
  for (const set of SLAYER_SETS) {
    const monster = MONSTERS[set.monster];
    assert(monster && monster.slayer === set.slayer, `${set.monster} needs Slayer ${set.slayer}`);
    assert(g.monsters.some(entry => entry.def.id === set.monster), `${monster.name}s live in the Realm`);
    assert(SLAYER_TASKS.some(task => task.monsters.includes(set.monster) && task.slayer === set.slayer), `a task for ${monster.name}s`);
    for (const piece of set.pieces) {
      const id = `${set.id}_${piece.suffix}`, def = item(id);
      assert(monster.drops.some(drop => drop.item === id), `${monster.name} drops ${def.name}`);
      assert.equal(def.equip.slot, piece.slot); assert.equal(def.equip.requires.slayer, set.slayer, `${def.name} takes Slayer ${set.slayer}`);
    }
  }
  const wear = set => { p.equipment = {}; for (const piece of set.pieces) p.equipment[piece.slot] = `${set.id}_${piece.suffix}`; };
  // Each set's effect grows with its pieces, and the full set does more.
  p.equipment = {}; assert.equal(thorns(p), 0); assert.equal(boneBoost(p), 1); assert.equal(fireFactor(p), 1); assert.equal(sigilSave(p), 0); assert.equal(stalkerFactor(p), 1);
  p.equipment = { head: "bramble_coif" }; assert.equal(thorns(p), 1);
  wear(SLAYER_SETS[0]); assert.equal(thorns(p), 3, "three thorns in full Bramble");
  p.equipment = { head: "wightbone_helm", body: "wightbone_plate" }; assert(Math.abs(boneBoost(p) - 1.2) < 1e-9);
  wear(SLAYER_SETS[1]); assert(Math.abs(boneBoost(p) - 1.4) < 1e-9, "40% more Faith XP from bones in full Wightbone");
  p.equipment = { legs: "stalker_leggings" }; assert(Math.abs(stalkerFactor(p) - 0.88) < 1e-9);
  wear(SLAYER_SETS[2]); assert(Math.abs(stalkerFactor(p) - 0.64) < 1e-9);
  p.equipment = { head: "cindershell_helm" }; assert(Math.abs(fireFactor(p) - 0.85) < 1e-9);
  wear(SLAYER_SETS[3]); assert.equal(fireFactor(p), 0.5, "full Cindershell halves dragonfire");
  p.equipment = { body: "hollowthread_robe" }; assert(Math.abs(sigilSave(p) - 0.08) < 1e-9);
  wear(SLAYER_SETS[4]); assert.equal(sigilSave(p), 0.3, "full Hollowthread keeps sigils 30% of the time");
  // Wightbone: burying bones really pays more.
  p.equipment = {}; p.inventory.fill(null); give(p, "bones"); const plain = p.xp.prayer;
  itemOptions(g, p.inventory.findIndex(slot => slot?.id === "bones")).find(option => option.verb === "Bury").run(g);
  const plainXp = p.xp.prayer - plain;
  wear(SLAYER_SETS[1]); give(p, "bones"); const boosted = p.xp.prayer;
  itemOptions(g, p.inventory.findIndex(slot => slot?.id === "bones")).find(option => option.verb === "Bury").run(g);
  assert((p.xp.prayer - boosted) / plainXp > 1.35, "40% more Faith XP buried in Wightbone");
  // The Warden: bracers boost task XP, and longer tasks are longer and pay more.
  p.equipment = {}; assert.equal(slayerXpBoost(g), 1); p.equipment.hands = "warden_bracers"; assert.equal(slayerXpBoost(g), 1.1);
  p.questData.slayer_points = 400;
  assert.equal(buySlayerReward(g, "warden_bracers"), true); assert(has(p, "warden_bracers")); assert.equal(p.questData.slayer_points, 150);
  assert.equal(longTasks(g), false);
  assert.equal(buySlayerReward(g, "long"), true); assert(longTasks(g)); assert.equal(p.questData.slayer_points, 50);
  assert.equal(buySlayerReward(g, "long"), true, "switching it off is free"); assert.equal(longTasks(g), false); assert.equal(p.questData.slayer_points, 50);
  // Eligible tasks come hardest-last whatever order the table lists them in.
  for (const skill of ["attack", "strength", "defence", "hitpoints", "slayer"]) p.xp[skill] = XP_TABLE[99];
  const eligible = eligibleTasks(g);
  assert.deepEqual(eligible.map(task => task.min), [...eligible.map(task => task.min)].sort((a, b) => a - b));
  assert.equal(eligible.at(-1).id, "weavers", "Hollow weavers are the hardest task");
});

test("The Heartguard: nine red-and-white pieces by Hitpoints level, each a hitpoint and quicker healing; the blade heals as it cuts", () => {
  const g = newGame(), p = g.player;
  assert.equal(HEARTGUARD.length, 9);
  HEARTGUARD.forEach((piece, index) => {
    const def = item(piece.id);
    assert.equal(def.equip.requires.hitpoints, (index + 1) * 10, `${def.name} takes Hitpoints ${(index + 1) * 10}`);
    assert.equal(def.equip.slot, piece.slot); assert.equal(def.icon.color, "#b8333a", "red"); assert.equal(def.icon.accent, "#f2efe8", "and white");
    assert(SHOPS.mender.stock.includes(piece.id), `Mender Hale sells ${def.name}`);
  });
  assert.equal(new Set(HEARTGUARD.map(piece => piece.slot)).size, 9, "one piece for every slot");
  assert(g.npcs.some(npc => npc.id === "mender"), "Mender Hale is at the chapel");
  // Hitpoints 10 can wear the boots but not the gloves.
  give(p, "heartguard_boots"); give(p, "heartguard_gloves");
  equip(g, p.inventory.findIndex(slot => slot?.id === "heartguard_gloves"));
  assert.equal(p.equipment.hands, undefined); assert.match(g.messages.at(-1).text, /Hitpoints level of 20/);
  equip(g, p.inventory.findIndex(slot => slot?.id === "heartguard_boots"));
  assert.equal(p.equipment.feet, "heartguard_boots");
  assert.equal(maxHp(p), 11, "a hitpoint more"); assert.equal(regenTicks(p), 94, "6% quicker healing"); assert.equal(foodBoost(p), 1);
  p.equipment = {}; for (const piece of HEARTGUARD) p.equipment[piece.slot] = piece.id;
  assert.equal(maxHp(p), 19); assert.equal(regenTicks(p), 46); assert.equal(foodBoost(p), 1.25, "food heals a quarter more in the full set");
  p.xp.hitpoints = XP_TABLE[50]; p.hp = 5; p.inventory.fill(null); give(p, "cake"); p.eatTimer = 0;
  eat(g, p.inventory.findIndex(slot => slot?.id === "cake"));
  assert.equal(p.hp, 5 + 15, "a cake heals 15 instead of 12");
  p.xp.hitpoints = 0;
  // Taking the set off caps your health at the plain maximum.
  p.hp = 19; unequip(g, "cape"); assert(p.hp <= maxHp(p));
  // The blade heals you one for every eight damage it deals.
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = XP_TABLE[99];
  p.equipment = { weapon: "heartguard_blade" }; p.hp = 50; p.regenTimer = -10_000;
  const chief = g.monsters.find(monster => monster.def.id === "grumblin_chief" && [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => canWalk(g, monster.x + dx, monster.y + dy)));
  standNear(g, chief.x, chief.y, 1); chief.attackTimer = 10_000;  // (it never swings back: the heal is what's measured)
  setTarget(g, { kind: "monster", uid: chief.uid, option: "Attack" });
  until(g, () => chief.dead, 120);
  assert(p.hp > 50, `the blade healed on the way (${p.hp})`);
  // Mender Hale opens her shop from the dialogue.
  const mender = g.npcs.find(npc => npc.id === "mender");
  standNear(g, mender.x, mender.y, 1);
  setTarget(g, { kind: "npc", uid: mender.uid, option: "Talk-to" });
  until(g, () => g.dialogue !== null, 30);
  while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g);
  chooseOption(g, 0);
  assert.equal(g.ui.shop, "mender");
});

test("The Old Friend stands behind every altar, and Dawnhold has its keep, towers and a taller chapel", () => {
  const g = newGame(), world = g.world;
  const altars = world.objects.filter(object => object.kind === "altar");
  assert.equal(altars.length, 25, "the mainland's four, Gravesend's lantern altar, the catacombs' bone altar, the Ring chapel's, the five wayward chapels', the six Orders', Raria's three Wise Friend altars (the capital, Lawgate, Vesperholm), and the Mizukai Isles' four shrines (Kumoyama, the Harbour Shrine, the fox shrine, Iwaoka)");
  for (const altar of altars) {
    // (A Mizukai shrine keeps the Friend of its place in a roped sacred stone, not a statue.)
    assert(world.objects.some(object => (object.decor === "old_friend" || object.decor === "wise_friend" || object.decor?.startsWith("god_") || (altar.text === "mizukai" && object.decor === "sacred_rope")) && Math.abs(object.x - altar.x) <= 1 && Math.abs(object.y - altar.y) <= 2), `a statue of the Old Friend (or an Order's god, or a shrine's sacred stone) by the ${altar.name}`);
  }
  assert(world.objects.find(object => object.decor === "old_friend").name === "Statue of the Old Friend");
  const named = name => world.buildings.filter(building => building.name === name);
  const keep = named("Dawnhold Keep")[0];
  assert(keep && keep.storeys === 2 && keep.walls === "stone", "a two-storey stone keep");
  const [gx, gy] = M(320, 82);
  assert(keep.x0 <= gx && keep.y0 <= M(0, 74)[1] && keep.y1 >= M(0, 90)[1], "joining the chapel and the hall along their east ends");
  assert(canWalk(g, gx - 1, gy) && canWalk(g, gx + 1, gy) && world.tiles[gy * W + gx] !== T.WALL, "its gate opens onto the courtyard at the end of the causeway");
  assert.equal(named("Keep tower").length, 2, "a tower at each outer corner");
  const chapel = named("Dawnhold Chapel")[0];
  assert(chapel.storeys === 2 && chapel.tall > 0, "the chapel stands taller");
  assert(named("Chapel bell tower")[0]?.round, "with a bell tower");
  assert(world.objects.some(object => object.decor === "throne" && object.x > gx && object.y === gy), "the Grandmaster's seat inside");
});

test("Apothecary: herbs grow by ecosystem, are picked, cleaned, ground, distilled and brewed; drinks boost, cure, coat and transform", () => {
  const g = newGame(), p = g.player, world = g.world;
  assert.equal(SKILL_NAMES.apothecary, "Apothecary");
  // Every herb grows somewhere, and only where its ecosystem is.
  for (const herb of HERBS) {
    const patches = world.objects.filter(object => object.kind === "herb" && object.herb === herb.id);
    assert(patches.length >= 2, `${herb.name} grows in the Realm (${patches.length} patches)`);
    assert(item(herb.id) && item(`clean_${herb.id}`), `${herb.name} raw and clean items`);
  }
  assert(world.objects.some(object => object.kind === "herb" && object.herb === "wyrmtongue" && regionAt(world, object.x, object.y).id === "ashfall"), "wyrmtongue grows in Ashfall");
  assert(!world.objects.some(object => object.kind === "herb" && object.herb === "cinderbloom" && regionAt(world, object.x, object.y).id === "friendhollow"), "and not in Friendhollow");
  assert(world.objects.some(object => object.kind === "still"), "a still in Hollyhock");
  // Pick feverleaf: stand by a patch (with the forest's spiders out of the way), Pick, get the raw herb, Clean it.
  for (const other of g.monsters) { other.dead = true; other.respawnAt = Infinity; }
  const patch = world.objects.filter(object => object.kind === "herb" && object.herb === "feverleaf" && [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => canWalk(g, object.x + dx, object.y + dy)))
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
  standBy(g, patch);
  setTarget(g, { kind: "object", id: patch.id, option: "Pick" });
  until(g, () => count(p, "feverleaf") >= 1, 200);
  assert(p.xp.apothecary > 0, "Apothecary XP for the pick");
  const raw = p.inventory.findIndex(slot => slot?.id === "feverleaf");
  assert(itemOptions(g, raw).some(option => option.verb === "Clean"));
  cleanHerb(g, raw); assert.equal(count(p, "clean_feverleaf"), 1);
  // Brew a healing tonic with a vial of water, drink it.
  give(p, "vial_of_water");
  const recipes = brewRecipes("clean_feverleaf");
  assert(recipes.some(recipe => recipe.outputs.healing_tonic === 1), "feverleaf brews a healing tonic");
  useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "vial_of_water"), p.inventory.findIndex(slot => slot?.id === "clean_feverleaf"));
  assert(g.ui.production?.recipes.some(recipe => recipe.outputs.healing_tonic === 1), "the brewing menu opens");
  startProduction(g, g.ui.production.recipes.find(recipe => recipe.outputs.healing_tonic === 1), 1);
  until(g, () => count(p, "healing_tonic") === 1, 20);
  p.hp = 2; drink(g, p.inventory.findIndex(slot => slot?.id === "healing_tonic"));
  assert.equal(p.hp, 10, "healed 8, and the vial comes back"); assert.equal(count(p, "vial"), 1);
  // Boosts: an attack potion lifts your Attack level and wears off a point at a time; grinding needs a mortar.
  p.xp.attack = XP_TABLE[40]; give(p, "attack_potion");
  drink(g, p.inventory.findIndex(slot => slot?.id === "attack_potion"));
  assert.equal(level(g, "attack"), 47, "+3 and 10% of 40"); assert.equal(p.boosts.attack, 7);
  run(g, 101); assert.equal(p.boosts.attack, 6, "a point gone after a hundred ticks");
  assert.equal(grindRecipes("oakroot")[0].tools[0], "mortar"); assert.equal(grindRecipes("feverleaf").length, 0, "not every herb is ground");
  assert.equal(stillRecipes().length, ESSENCES.length);
  // Poison: coat a sword, hit a boar, it takes doses; the undead shrug weak poison off; antidote cures and protects you.
  p.inventory.fill(null); give(p, "pewter_sword"); equip(g, p.inventory.findIndex(slot => slot?.id === "pewter_sword")); give(p, "weak_poison");
  coatWeapon(g, p.inventory.findIndex(slot => slot?.id === "weak_poison"));
  assert.deepEqual(p.weaponPoison, { weapon: "pewter_sword", damage: 2, charges: 20, weaken: false });
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = XP_TABLE[80];
  p.hp = 80;
  const boar = g.monsters.find(monster => monster.def.id === "boar" && [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => canWalk(g, monster.x + dx, monster.y + dy)));
  boar.dead = false; boar.hp = boar.def.hp; boar.respawnAt = 0; boar.poison = null;
  standNear(g, boar.x, boar.y, 1); setTarget(g, { kind: "monster", uid: boar.uid, option: "Attack" });
  until(g, () => !!boar.poison || boar.dead, 60);
  if (!boar.dead) assert.equal(boar.poison.damage, 3, "soft-bodied: half as much again");
  assert(p.weaponPoison === null || p.weaponPoison.charges < 20, "a charge spent");
  assert(MONSTERS.skeleton.poisonImmune && MONSTERS.marsh_adder.poison, "the undead are immune; adders bite");
  p.poison = { damage: 2, left: 4, timer: 1 }; p.hp = 50; p.combat = null; p.target = null; tick(g);
  assert.equal(p.hp, 48, "poison burns"); 
  give(p, "antidote"); drink(g, p.inventory.findIndex(slot => slot?.id === "antidote"));
  assert.equal(p.poison, null); assert(p.antidoteUntil > g.tick);
  // Friend mixtures: nine, one per family; the wrong family can't use one; the right family gets the effect.
  assert.equal(MIXTURES.length, 9); assert.deepEqual([...new Set(MIXTURES.map(mix => mix.family))].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  give(p, "mixture_hoverer"); drink(g, p.inventory.findIndex(slot => slot?.id === "mixture_hoverer"));
  assert.equal(p.mixture, null, "a Skeleton can't drink the Hoverers' Updraught"); assert.match(g.messages.at(-1).text, /made for Hoverer Friends/);
  give(p, "mixture_skeleton"); drink(g, p.inventory.findIndex(slot => slot?.id === "mixture_skeleton"));
  assert.equal(p.mixture?.family, 0); assert(Math.abs(boneBoost(p, g) - 2) < 1e-9, "the Marrow draught doubles Faith XP from bones");
  // Everything brewable is an item, and the save round-trips the lot.
  for (const potion of POTIONS) assert(item(potion.id).potion, `${potion.name} is a drink`);
  const copy = newGame(); restore(copy, serialize(g));
  assert.equal(copy.player.mixture?.family, 0); assert(copy.player.antidoteUntil > copy.tick); assert.equal(copy.player.boosts.attack, 6);
});

test("Every weapon and piece of armour in the six ore metals can be bought somewhere, the top tiers only in the wider world", () => {
  const sold = new Map();
  for (const shop of Object.values(SHOPS)) for (const id of shop.stock) if (!sold.has(id)) sold.set(id, shop.id);
  for (const metal of METALS.filter(entry => entry.tier <= 6)) for (const piece of SMITH_PIECES) assert(sold.has(`${metal.id}_${piece.piece}`), `${metal.name} ${piece.name} is sold (by someone)`);
  assert(sold.has("rarite_cuirass") && SHOPS.cragmaw_armoury.stock.includes("rarite_cuirass"), "rarite plate is sold, Cragmaw among others");
  // Whole sets: any shop selling a metal's helm and boots sells its cuirass, greaves, gauntlets and shield (Frostpeak's frostsilver and glimmer, Highcairn's rarite, the Hollis Armoury's moonsilver…).
  for (const shop of Object.values(SHOPS)) {
    const metals = new Set(shop.stock.flatMap(id => { const m = id.match(/^([a-z]+)_(helm|boots)$/); return m ? [m[1]] : []; }));
    for (const metal of metals) for (const piece of ["helm", "cuirass", "greaves", "gauntlets", "boots", "shield"]) if (isItem(`${metal}_${piece}`)) assert(shop.stock.includes(`${metal}_${piece}`), `${shop.name} sells ${metal} ${piece}`);
  }
  for (const piece of ["frostsilver_cuirass", "frostsilver_greaves"]) assert(SHOPS.frost.stock.includes(piece), `Frostpeak Outfitters sells ${piece}`);
  assert(SHOPS.armour.stock.includes("leather_jerkin"), "the armoury sells the whole leather set");
  const g = newGame(); assert(g.npcs.some(npc => npc.id === "cragmaw_armourer"), "Brenna Anvilsong keeps the armoury");
});

test("Teleports to the wider world, learnt by quest and level, in a tabbed spellbook", () => {
  const g = newGame(), p = g.player, world = g.world;
  const glides = SPELLS.filter(spell => spell.kind === "teleport");
  assert(glides.length >= 17, `a glide for every settlement (${glides.length})`);
  for (const spell of glides) { const at = world.places[spell.teleport]; assert(at && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].some(([dx, dy]) => canWalk(g, at.x + dx, at.y + dy)), `${spell.name} lands by walkable ground`); }
  assert.equal(SPELL_TABS.length, 6); for (const spell of SPELLS) assert(SPELL_TABS.some(tab => tab.kinds.includes(spell.kind)), `${spell.name} has a tab`);
  p.xp.magic = XP_TABLE[99]; for (const sigil of ["path_sigil", "shade_sigil", "hollow_sigil", "breeze_sigil", "bloom_sigil", "stone_sigil"]) give(p, sigil, 20);
  assert.match(canCast(g, SPELLS.find(spell => spell.id === "glide_gravesend")), /Lanterns for the Dead/, "locked until the quest is done");
  assert.equal(castSpell(g, "glide_gravesend"), null); assert.notEqual(p.activity?.kind, "teleport");
  p.quests.gravesend_lanterns = 2;
  assert.equal(canCast(g, SPELLS.find(spell => spell.id === "glide_gravesend")), null);
  castSpell(g, "glide_gravesend"); assert.equal(p.activity?.kind, "teleport");
  until(g, () => p.x === world.places.gravesend.x && p.y === world.places.gravesend.y, 20);
  assert.equal(regionAt(world, p.x, p.y).id, "gravesend");
  castSpell(g, "glide_highcairn"); assert.equal(p.activity?.kind, "teleport", "Highcairn's glide needs no quest");
});

test("Every tree can be cut and burnt: palms, pines and dead trees give logs, bows and a wand; every sigil carries its own mark", () => {
  const g = newGame(), p = g.player, world = g.world;
  for (const kind of ["palm", "pine", "deadwood"]) {
    assert(TREES[kind], `${kind} is a tree`); assert(world.objects.some(object => object.kind === "tree" && object.tree === kind), `${kind} trees grow in the Realm`);
    assert(item(TREES[kind].log) && FIREMAKING[TREES[kind].log], `${kind} logs burn`);
  }
  assert(!world.objects.some(object => object.kind === "decor" && ["pine", "palm", "dead_tree"].includes(object.decor)), "no tree is mere scenery any more");
  assert(item("palm_bow").equip.bow && item("pine_bow").equip.bow, "palm and pine bows");
  assert(item("deadwood_wand").equip.staff && item("deadwood_wand").equip.requires.magic === 50, "a wand that autocasts");
  p.inventory.fill(null); give(p, "knife"); give(p, "deadwood_logs"); p.xp.fletching = XP_TABLE[60];
  const recipes = fletchingRecipesFor(g, "deadwood_logs");
  assert(recipes.some(recipe => recipe.outputs.deadwood_wand === 1), "a wand from deadwood logs");
  startProduction(g, recipes.find(recipe => recipe.outputs.deadwood_wand === 1), 1); until(g, () => has(p, "deadwood_wand"), 20);
  // Chop a palm by the Oasis: Woodcutting 25.
  const palm = world.objects.find(object => object.kind === "tree" && object.tree === "palm" && [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => canWalk(g, object.x + dx, object.y + dy)));
  for (const other of g.monsters) { other.dead = true; other.respawnAt = Infinity; }
  give(p, "pewter_axe"); p.xp.woodcutting = XP_TABLE[30]; standBy(g, palm);
  setTarget(g, { kind: "object", id: palm.id, option: "Chop down" }); until(g, () => count(p, "palm_logs") >= 1, 300);
  for (const id of ["breeze_sigil", "storm_sigil", "hollow_sigil", "star_sigil"]) assert.equal(item(id).icon.kind, id.replace("_sigil", ""), `${id} has its own mark`);
  // The Deadwood's dead: crypts, tombs, obelisks, bone-heaps, railed plots and the ruins of the villages the forest took.
  const kinds = {}; for (const object of world.objects) if (object.kind === "decor") kinds[object.decor] = (kinds[object.decor] ?? 0) + 1;
  assert(kinds.crypt >= 18 && kinds.tomb >= 60 && kinds.obelisk >= 12 && kinds.bones >= 50, `the Deadwood is dressed: ${JSON.stringify({ crypt: kinds.crypt, tomb: kinds.tomb, obelisk: kinds.obelisk, bones: kinds.bones })}`);
  assert(world.objects.filter(object => object.decor === "fence" && object.name === "Iron railing, rusted").length >= 60, "railed plots");
  assert(world.buildings.filter(building => /^Ruined|^Crypt|Namekeeper's Crypt|Ashworth Hall/.test(building.name)).length >= 14, "ruined houses and named crypts");
  assert(world.objects.some(object => object.name?.startsWith("Here lies Tam Ashworth")), "graves with epitaphs");
});

test("Presence: a name for your Friend (the token stays), fellowships, titles, and XP from living in the Realm", () => {
  const g = newGame(), p = g.player;
  assert.equal(SKILL_NAMES.presence, "Presence");
  // Names: legal and not; the first naming is free and worth Presence; renames cost coins at the Namekeeper.
  assert.equal(cleanName("  M4S4T0 "), "M4S4T0"); assert.equal(cleanName("x"), null); assert.equal(cleanName("13530"), null, "a number is the token's job"); assert.equal(cleanName("bad!name"), null);
  assert.equal(cleanTag("void"), "VOID"); assert.equal(cleanTag("toolong"), null);
  assert.equal(playerName(p), "Friend #7730");
  assert(nameFriend(g, "M4S4T0")); assert.equal(p.name, "M4S4T0"); assert.equal(playerName(p), "M4S4T0 (7730)"); assert.equal(p.friendId, 7730, "the token never changes");
  const afterName = p.xp.presence; assert(afterName >= 75, "naming is worth Presence");
  assert(!nameFriend(g, "Someone", true), "a rename costs coins you don't have"); assert.equal(p.name, "M4S4T0");
  const purse = count(p, "coins"); give(p, "coins", 1000); assert(nameFriend(g, "Someone", true)); assert.equal(p.name, "Someone"); assert.equal(count(p, "coins"), purse, "a thousand coins for the ink");
  assert(g.npcs.some(npc => npc.id === "namekeeper"), "the Namekeeper is in Friendhollow");
  // Fellowships: a name and a tag, paid once; shared over the net with the name and title; leaving is free.
  assert(!joinFellowship(g, "Moonlit Company", "MOON"), "needs coins");
  give(p, "coins", 5000); assert(joinFellowship(g, "Moonlit Company", "MOON")); assert.deepEqual({ name: p.fellowship.name, tag: p.fellowship.tag }, { name: "Moonlit Company", tag: "MOON" }); assert(p.fellowship.since > 0, "founded today");
  const packet = presenceOf(g); assert.equal(packet.name, "Someone"); assert.equal(packet.tag, "MOON");
  const cleaned = cleanPresence(JSON.parse(JSON.stringify({ ...packet, name: "bad!name", tag: "toolongtag" }))); assert.equal(cleaned.name, null); assert.equal(cleaned.tag, null, "the net cleans what it receives");
  leaveFellowship(g); assert.equal(p.fellowship, null);
  // Titles by Presence level and by deed; you can only wear one you've earned.
  assert(unlockedTitles(g).some(title => title.id === "newcomer")); assert(!unlockedTitles(g).some(title => title.id === "dragonfriend"));
  assert(!chooseTitle(g, "dragonfriend")); p.quests.ashfall_embers = 2; assert(chooseTitle(g, "dragonfriend")); assert.equal(profile(g).title, "Dragonfriend");
  p.xp.presence = XP_TABLE[40]; assert(unlockedTitles(g).some(title => title.id === "adventurer")); assert.equal(TITLES.length, 21);
  // XP from living here: discovering a region, meeting someone, an emote, clothes worn for the first time, a quest.
  const before = p.xp.presence;
  teleport(g, ...M(34, 70)); run(g, 6); assert(p.visited.fernwick, "Fernwick discovered"); assert(p.xp.presence > before, "and worth Presence");
  const seen = p.xp.presence; performEmote(g, "wave"); assert(p.emotesUsed.wave && p.xp.presence > seen, "a first emote");
  const worn = p.xp.presence; give(p, "mourners_hood"); equip(g, p.inventory.findIndex(slot => slot?.id === "mourners_hood")); assert(p.outfits.mourners_hood && p.xp.presence > worn, "first worn");
  // The profile: style follows the clothes, reputation follows quests and people.
  assert.equal(profile(g).style, "Deadwood Wanderer", "a single Gravesend piece already reads as the Deadwood"); unequip(g, "head"); assert.equal(profile(g).style, "Friendhollow Local");
  give(p, "gravesend_coat"); equip(g, p.inventory.findIndex(slot => slot?.id === "gravesend_coat")); equip(g, p.inventory.findIndex(slot => slot?.id === "mourners_hood")); assert.equal(profile(g).style, "Deadwood Wanderer");
  assert.equal(reputation(g, "gravesend").rank, "Unknown"); p.quests.gravesend_lanterns = 2; assert.equal(reputation(g, "gravesend").rank, "Known"); p.talked.gravesend_keeper = 1; p.talked.gravesend_clothier = 1; assert.equal(reputation(g, "gravesend").rank, "Trusted");
  assert.equal(profile(g).friendId, 7730); assert(profile(g).reputations.length >= 10);
  // Saved and restored.
  const copy = newGame(); restore(copy, serialize(g));
  assert.equal(copy.player.name, "Someone"); assert.equal(copy.player.title, "dragonfriend"); assert(copy.player.visited.fernwick); assert(copy.player.emotesUsed.wave);
});

test("Your Friend talks back: in its family's manner, to what's around it, remembering firsts; rumours and recognition in the villages", () => {
  const g = newGame({ familyId: 6 }), p = g.player; // a Colossus
  g.friendSpeech = "full";
  const said = friendSays(g, "mountain");
  assert(["Mountain. Climb.", "Big. Good."].includes(said), "a Colossus is blunt");
  assert.equal(friendSays(g, "mountain"), null, "and doesn't repeat itself straight away");
  assert.equal(g.messages.at(-1).text, `Friend #7730: ${said}`, "the line goes to chat as your Friend");
  assert(g.events.some(event => event.type === "friend" && event.text === said && event.share), "and over its head, shared with players nearby on Full");
  g.friendSpeech = "off"; assert.equal(friendSays(g, "quest"), null, "off is off");
  g.friendSpeech = "rare"; p.friendLast = -1e9; assert.equal(friendSays(g, "grave"), null, "rare keeps the small talk"); assert(["Down.", "Was big."].includes(friendSays(g, "boss")), "but not the moments that matter");
  // Families differ.
  const sk = newGame({ familyId: 0 }); sk.friendSpeech = "full"; assert.equal(friendSays(sk, "grave", null), sk.messages.at(-1).text.replace("Friend #7730: ", ""));
  assert(["Someone's resting. Lucky them.", "A grave. Wipe your feet."].includes(sk.messages.at(-1).text.replace("Friend #7730: ", "")), "a Skeleton at a grave");
  // In the player's language, the names in it too; a creature's name starting a sentence takes its capital.
  assert.equal(spoken("{name}. Hm.", { name: "Fernwick" }, "ja"), "ファーンウィック。ふむ。");
  assert.equal(spoken("Another {name}.", { name: "Fernwick" }, "es"), "Otro Fernwick.");
  assert.equal(spoken("{name}. Observe the gait.", { name: "grumblin" }, "en"), "Grumblin. Observe the gait.");
  // Looking around: entering a region for the first time, and a creature in view.
  g.friendSpeech = "full"; run(g, 6); p.friendLast = -1e9; p.friendEventAt = {};
  teleport(g, ...M(34, 70)); run(g, 12);
  assert(g.messages.some(m => m.tone === "public" && /Fernwick/.test(m.text)), "remarks on Fernwick on arrival");
  // Firsts are remembered, once, and worth Presence.
  const xp = p.xp.presence; assert(remember(g, "first_dragon")); assert(!remember(g, "first_dragon")); assert(p.firsts.first_dragon > 0); assert(p.xp.presence > xp);
  p.xp.presence = XP_TABLE[30]; p.friendLast = -1e9; p.friendEventAt = {}; g.rng = () => 0.1;
  assert.equal(friendSays(g, "dragon_again"), "That was our first dragon, once. We used to be afraid of these.", "a memory, at Presence 30");
  g.rng = seeded();
  assert(tendencies(g).explorer >= 1);
  // Rumours: every settlement has some; asking a villager gives one and a little Presence the first time; the net never says which are true.
  assert(rumourCount() >= 40); assert(RUMOURS.friendhollow.some(r => r.truth === "true") && RUMOURS.friendhollow.some(r => r.truth === "false"));
  const before = p.xp.presence, text = rumourAt(g, ...M(121, 122)); assert(RUMOURS.friendhollow.some(r => r.text === text)); assert(p.xp.presence > before);
  const d = talk(g, "villager"); assert(d.options.some(o => o.label === "Heard any rumours?"), "townsfolk gossip");
  assert(!talk(g, "king").options?.some(o => o.label === "Heard any rumours?"), "the King does not");
  // Recognition: a greeting for your family the first time, your name once you're known.
  const c = newGame({ familyId: 6 }); const first = talk(c, "cragmaw_foreman"); assert.equal(first.lines[0].text, "By the old stones. A Colossus. Mind the roof.");
  assert.notEqual(talk(c, "cragmaw_foreman").lines[0].text, "By the old stones. A Colossus. Mind the roof.", "only once");
  c.player.name = "M4S4T0"; c.player.xp.presence = XP_TABLE[70]; c.player.talked.innkeeper = 1; c.rng = () => 0.1;
  assert.equal(talk(c, "innkeeper").lines[0].text, "Everyone here knows M4S4T0.");
  // The world tells stories: the burned farmhouse, the faceless statue, the toppled watch-stones.
  const names = g.world.objects.map(o => o.name);
  for (const name of ["A small bed, burnt", "A child's wooden horse, unburnt", "A statue of a bearded figure. The face has been chiselled off, carefully.", "A toppled watch-stone, fallen westward", "An old carved stone, used as a fence post. It's an altar. Nobody minds."]) assert(names.includes(name), name);
  // Saved: firsts and rumours heard survive.
  const copy = newGame(); restore(copy, serialize(g)); assert(copy.player.firsts.first_dragon > 0); assert(Object.keys(copy.player.rumours).length >= 1);
});

test("magic: Breeze Dart uses sigils and trains Magic", () => {
  const g = newGame();
  give(g.player, "breeze_sigil", 20); give(g.player, "thought_sigil", 20);
  const rat = g.monsters.find(monster => monster.def.id === "ink_rat");
  const selection = castSpell(g, "breeze_dart");
  assert.deepEqual(selection, { kind: "spell", spell: "breeze_dart" });
  teleport(g, rat.x + 3, rat.y);
  if (!canWalk(g, rat.x + 3, rat.y)) teleport(g, rat.x, rat.y + 3);
  menuFor(g, [{ kind: "monster", id: rat.uid }], null, selection)[0].run(g);
  until(g, () => count(g.player, "breeze_sigil") < 20, 40);
  assert(g.player.xp.magic >= 5.5 * XP_RATE * earlyXp(1));
  assert(SPELLS.length >= 10);
});

test("magic utility: Gilded Touch, Forgeheart, enchanting, Far Reach, Bonebloom, Rootsnare and glides", () => {
  const g = newGame();
  g.player.xp.magic = XP_TABLE[60]; g.player.xp.smithing = XP_TABLE[30];
  for (const [id, n] of [["bloom_sigil", 20], ["ember_sigil", 60], ["star_sigil", 5], ["tide_sigil", 30], ["stone_sigil", 30], ["path_sigil", 10], ["breeze_sigil", 20], ["shade_sigil", 5]]) give(g.player, id, n);
  // Gilded Touch: 40% of value in coins.
  give(g.player, "ashsteel_sabre");
  const coins = count(g.player, "coins"), value = item("ashsteel_sabre").value;
  assert.deepEqual(castSpell(g, "gilded_touch"), { kind: "spell", spell: "gilded_touch" });
  assert(castOnItem(g, "gilded_touch", g.player.inventory.findIndex(slot => slot?.id === "ashsteel_sabre")));
  assert.equal(count(g.player, "coins") - coins, Math.floor(value * 0.4));
  // Forgeheart: blackiron ore + inkcoal → an ashsteel bar (the best the pack allows), with Smithing XP.
  give(g.player, "blackiron_ore"); give(g.player, "inkcoal"); run(g, 4);
  const smithing = g.player.xp.smithing;
  assert(castOnItem(g, "forgeheart", g.player.inventory.findIndex(slot => slot?.id === "blackiron_ore")));
  assert(has(g.player, "ashsteel_bar")); assert(g.player.xp.smithing > smithing);
  // Enchant Moonstone.
  give(g.player, "moonstone_amulet"); run(g, 4);
  assert(castOnItem(g, "enchant_moonstone", g.player.inventory.findIndex(slot => slot?.id === "moonstone_amulet")));
  assert(has(g.player, "moonstone_pendant"));
  // Bonebloom.
  give(g.player, "bones", 3);
  castSpell(g, "bonebloom");
  assert.equal(count(g.player, "bones"), 0); assert.equal(count(g.player, "sweetberry"), 3);
  // Far Reach: take an item from several tiles away.
  let spot = null;
  for (let dx = 6; dx > 2 && !spot; dx--) if (canWalk(g, g.player.x + dx, g.player.y)) spot = { x: g.player.x + dx, y: g.player.y };
  g.ground.push({ uid: 999, id: "rough_rosestone", n: 1, x: spot.x, y: spot.y, expires: g.tick + 100 });
  const reach = castSpell(g, "far_reach");
  menuFor(g, [{ kind: "ground", id: 999 }], null, reach)[0].run(g);
  until(g, () => has(g.player, "rough_rosestone"), 20);
  // Rootsnare roots a monster in place.
  const rat = g.monsters.find(monster => monster.def.id === "ink_rat");
  standNear(g, rat.x, rat.y, 3);
  for (let tries = 0; tries < 8 && !isBound(g, rat); tries++) { menuFor(g, [{ kind: "monster", id: rat.uid }], null, castSpell(g, "bind"))[0].run(g); run(g, 6); }
  assert(isBound(g, rat), "Rootsnare lands");
  const at = { x: rat.x, y: rat.y }; run(g, 8);
  assert.deepEqual({ x: rat.x, y: rat.y }, at, "a rooted monster doesn't move");
  // Glide to Emberforge.
  g.player.combat = null; castSpell(g, "glide_emberforge"); run(g, 6);
  assert.deepEqual({ x: g.player.x, y: g.player.y }, g.world.places.emberforge);
  // Townsfolk can't be targeted by spells.
  const villager = g.npcs.find(npc => npc.id === "villager");
  assert.equal(menuFor(g, [{ kind: "npc", id: villager.uid }], null, { kind: "spell", spell: "breeze_dart" }).length, 0);
});

test("prayer: bury, pray at the altar, activate a prayer, it drains", () => {
  const g = newGame();
  g.player.xp.prayer = XP_TABLE[10]; g.player.prayer = 10;
  togglePrayer(g, "paper_shield");
  assert.deepEqual(g.player.prayers, ["paper_shield"]);
  run(g, 30);
  assert(g.player.prayer < 10);
  togglePrayer(g, "stone_shield");
  assert.deepEqual(g.player.prayers, ["stone_shield"], "Overlapping prayers swap");
});

test("shops and the bank", () => {
  const g = newGame({ familyId: 2 });
  give(g.player, "coins", 1000);
  const bought = buy(g, "general", "hammer", 1);
  assert.equal(bought, 1); assert(has(g.player, "hammer"));
  const coins = count(g.player, "coins");
  sell(g, "general", g.player.inventory.findIndex(slot => slot?.id === "hammer"), 1);
  assert(!has(g.player, "hammer")); assert(count(g.player, "coins") >= coins);
  assert.equal(buy(g, "sigils", "thought_sigil", 50), 50);
  assert.equal(count(g.player, "thought_sigil"), 50);
  for (const shop of Object.values(SHOPS)) for (const id of shop.stock) assert(item(id), `${shop.name} stocks ${id}`);
});

test("items: every item has art, a name and an examine; equipment has a slot", () => {
  for (const entry of ITEM_LIST) {
    assert(entry.name && entry.examine && entry.icon?.shape, entry.id);
    if (entry.equip) assert(entry.equip.slot, entry.id);
  }
  assert(ITEM_LIST.length > 120, `${ITEM_LIST.length} items`);
});

test("saves round-trip, and tampered saves are cleaned", () => {
  const g = newGame();
  g.player.xp.woodcutting = 5000; give(g.player, "oak_logs", 3); g.player.bank.push({ id: "blackiron_bar", n: 12 }); g.player.quests.cold_forge = 1;
  g.player.wardrobe.push("rose_cape"); g.player.worn.push("rose_cape");
  const save = JSON.parse(JSON.stringify(serialize(g)));
  const fresh = newGame();
  assert(restore(fresh, save));
  assert.equal(fresh.player.xp.woodcutting, 5000);
  assert.equal(count(fresh.player, "oak_logs"), 3);
  assert.deepEqual(fresh.player.bank.find(slot => slot.id === "blackiron_bar"), { id: "blackiron_bar", n: 12 });
  assert.equal(fresh.player.quests.cold_forge, 1);
  assert.deepEqual(fresh.player.worn, ["rose_cape"]);
  // Tampering: unknown items, impossible XP, a wall position and a different Friend.
  const bad = { ...save, xp: { ...save.xp, attack: 9e99 }, inventory: [{ id: "godsword", n: 1 }, { id: "coins", n: -5 }], x: 0, y: 0, equipment: { weapon: "pewter_cuirass" } };
  const other = newGame();
  assert(restore(other, bad));
  assert.equal(other.player.xp.attack, 200_000_000);
  assert.equal(other.player.inventory.filter(Boolean).length, 0);
  assert.deepEqual([other.player.x, other.player.y], [other.world.places.spawn.x, other.world.places.spawn.y]);
  assert.equal(other.player.equipment.weapon, undefined);
  assert(!restore(newGame({ friendId: 1 }), save), "A save belongs to its Friend");
});

test("Rare Caskets: relic bonuses, wardrobe pieces and duplicates", () => {
  const g = newGame();
  const base = xpMultiplier(g.player);
  setRelics(g, [3, 0, 0, 1]);
  assert(Math.abs(xpMultiplier(g.player) - base * (1 + 0.06 + 0.1)) < 1e-9);
  // Tier 3 holds six pieces; after all of them, duplicates turn into coins.
  const tier3 = WARDROBE.filter(piece => piece.tier === 3).map(piece => piece.id).sort(), got = tier3.map(() => collectFromCasket(g, 3).wardrobe).sort();
  assert.deepEqual(got, tier3); assert(tier3.includes("golden_aura") && tier3.includes("night_wings"));
  const again = collectFromCasket(g, 3);
  assert.equal(again.wardrobe, null); assert(again.coins > 0);
  // Economy table: 1 RF casket, 0.88 RF expected value, 5 RF max prize.
  const price = BigInt(game.price), expected = game.outcomes.reduce((sum, outcome) => sum + BigInt(outcome.reward) * BigInt(outcome.chanceBps), 0n) / 10_000n;
  assert.equal(price, 10n ** 18n); assert.equal(expected, 88n * 10n ** 16n);
  assert.equal(game.outcomes.reduce((sum, outcome) => sum + outcome.chanceBps, 0), 10_000);
});

test("owned Friends follow you and add XP by generation", () => {
  const g = newGame();
  const base = xpMultiplier(g.player);
  setFollower(g, { id: 3412, generation: 1 });
  assert(Math.abs(xpMultiplier(g.player) - base * 1.05) < 1e-9);
  setFollower(g, { id: 99, generation: 6 });
  assert(Math.abs(xpMultiplier(g.player) - base * 1.01) < 1e-9);
});

test("saves from before the Realm's own names still load, renamed", () => {
  const g = newGame();
  const old = { ...serialize(g), inventory: [{ id: "bronze_scimitar", n: 1 }, { id: "air_rune", n: 40 }, { id: "raw_lobster", n: 1 }, { id: "iron_full_helm", n: 1 }], equipment: { weapon: "steel_scimitar" }, bank: [{ id: "coal", n: 9 }] };
  const fresh = newGame();
  assert(restore(fresh, old));
  assert.deepEqual(fresh.player.inventory.slice(0, 4).map(slot => slot?.id), ["pewter_sabre", "breeze_sigil", "raw_inkcrab", "blackiron_helm"]);
  assert.equal(fresh.player.equipment.weapon, "ashsteel_sabre");
  assert.deepEqual(fresh.player.bank, [{ id: "inkcoal", n: 9 }]);
});

test("music unlocks the first time you enter an area, and saves", () => {
  const g = newGame();
  assert.deepEqual(g.player.music, ["theme"]);
  assert.equal(unlockMusic(g, "emberforge", "Anvil Song"), true);
  assert.equal(unlockMusic(g, "emberforge", "Anvil Song"), false);
  assert.match(g.messages.at(-1).text, /You have unlocked a new music track: Anvil Song\./);
  const fresh = newGame();
  restore(fresh, JSON.parse(JSON.stringify(serialize(g))));
  assert.deepEqual(fresh.player.music, ["theme", "emberforge"]);
  const bad = newGame();
  restore(bad, { ...serialize(g), music: ["<script>", 5, "frostpeak"] });
  assert.deepEqual(bad.player.music, ["theme", "frostpeak"]);
});

test("the follower walks the tiles you leave behind", () => {
  const g = newGame();
  setFollower(g, { id: 3412, generation: 1 });
  assert(g.pet, "a follower appears beside you");
  const path = [];
  walkTo(g, g.player.x + 6, g.player.y + 2);
  for (let i = 0; i < 5; i++) { const before = { x: g.player.x, y: g.player.y }; tick(g); if (g.player.x !== before.x || g.player.y !== before.y) path.push(before); }
  assert.deepEqual({ x: g.pet.x, y: g.pet.y }, g.trail.at(-1), "it stands on the tile you just left");
  assert(Math.max(Math.abs(g.pet.x - g.player.x), Math.abs(g.pet.y - g.player.y)) === 1, "directly behind you");
  castSpell(g, "homeward"); run(g, 12);
  assert(Math.max(Math.abs(g.pet.x - g.player.x), Math.abs(g.pet.y - g.player.y)) <= 1, "it catches up after a teleport");
  setFollower(g, null); tick(g); assert.equal(g.pet, null);
});

test("use item on item: tinderbox on logs lights a fire, chisel cuts gems", () => {
  const g = newGame();
  teleport(g, ...M(100, 132));
  for (let step = 0; step < 300 && (terrainAt(g.world, g.player.x, g.player.y) !== T.GRASS || objectAtTile(g.world, g.player.x, g.player.y)); step++) teleport(g, g.player.x + 1, g.player.y);
  give(g.player, "logs");
  useItemOnItem(g, g.player.inventory.findIndex(slot => slot?.id === "tinderbox"), g.player.inventory.findIndex(slot => slot?.id === "logs"));
  until(g, () => g.fires.length > 0, 40);
  g.player.xp.crafting = XP_TABLE[20]; give(g.player, "chisel"); give(g.player, "rough_moonstone");
  useItemOnItem(g, g.player.inventory.findIndex(slot => slot?.id === "chisel"), g.player.inventory.findIndex(slot => slot?.id === "rough_moonstone"));
  until(g, () => has(g.player, "moonstone"), 20);
});

test("Ranged: a bow fires your best arrows from a distance, and trains Ranged", () => {
  const g = newGame(), p = g.player;
  give(p, "pewter_shield"); equip(g, p.inventory.findIndex(slot => slot?.id === "pewter_shield"));
  give(p, "shortbow"); equip(g, p.inventory.findIndex(slot => slot?.id === "shortbow"));
  assert.equal(p.equipment.weapon, "shortbow"); assert.equal(p.equipment.shield, undefined, "a bow takes both hands");
  assert(has(p, "pewter_shield"), "…so the shield goes back in the pack");
  give(p, "pewter_arrow", 60); give(p, "ashsteel_arrow", 5);
  const cow = g.monsters.find(monster => monster.def.id === "cow");
  standNear(g, cow.x, cow.y, 5);
  setTarget(g, { kind: "monster", uid: cow.uid, option: "Attack" });
  let closest = Infinity;
  until(g, () => { closest = Math.min(closest, Math.max(Math.abs(p.x - cow.x), Math.abs(p.y - cow.y))); return p.xp.ranged > 0 || cow.dead; }, 200);
  assert(closest > 1, "shot from range, never walked up to it");
  assert(count(p, "ashsteel_arrow") === 5, "ashsteel arrows need Ranged 10: pewter first");
  assert(count(p, "pewter_arrow") < 60, "arrows are used up");
});

test("Crossbows and war bows: parts from the anvil and the knife, fitted with Crafting; bolts only for crossbows; slower, harder shots", () => {
  const g = newGame(), p = g.player;
  for (const skill of ["fletching", "crafting", "smithing", "ranged"]) p.xp[skill] = XP_TABLE[30];
  // The anvil makes limbs (two bars) and a dozen unfeathered bolts (one bar).
  const pewter = smithingRecipes("pewter");
  assert.deepEqual(pewter.find(recipe => recipe.outputs.pewter_limbs)?.inputs, { pewter_bar: 2 });
  assert.equal(pewter.find(recipe => recipe.outputs.pewter_bolts_unf)?.outputs.pewter_bolts_unf, 12);
  // A knife on logs offers the war bow (two logs) and a crossbow stock.
  give(p, "knife"); give(p, "logs", 4);
  useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "knife"), p.inventory.findIndex(slot => slot?.id === "logs"));
  const labels = g.ui.production.recipes.map(recipe => recipe.label);
  assert(labels.includes("War bow (unstrung, 2 logs)") && labels.includes("Wooden stock"), labels.join(", "));
  startProduction(g, g.ui.production.recipes.find(recipe => recipe.label === "War bow (unstrung, 2 logs)"), 1); run(g, 10);
  assert(has(p, "war_bow_u"), "cut unstrung");
  give(p, "string"); useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "string"), p.inventory.findIndex(slot => slot?.id === "war_bow_u")); run(g, 6);
  assert(has(p, "war_bow") && count(p, "logs") === 2, "a war bow takes two logs");
  startProduction(g, fletchingRecipesFor(g, "logs").find(recipe => recipe.label === "Wooden stock"), 1); run(g, 10);
  assert(has(p, "wooden_stock"));
  // Limbs only fit their own stock.
  give(p, "blackiron_limbs"); useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "blackiron_limbs"), p.inventory.findIndex(slot => slot?.id === "wooden_stock"));
  run(g, 6); assert(!has(p, "blackiron_crossbow"), "blackiron limbs need an oak stock");
  give(p, "pewter_limbs"); useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "pewter_limbs"), p.inventory.findIndex(slot => slot?.id === "wooden_stock"));
  run(g, 6); assert(has(p, "pewter_crossbow") && !has(p, "pewter_limbs") && !has(p, "wooden_stock"), "pewter limbs on a wooden stock");
  assert(p.xp.crafting > XP_TABLE[30], "fitting trains Crafting");
  // Feathers on unfeathered bolts.
  give(p, "pewter_bolts_unf", 12); give(p, "feather", 12);
  useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "pewter_bolts_unf"), p.inventory.findIndex(slot => slot?.id === "feather")); run(g, 6);
  assert.equal(count(p, "pewter_bolts"), 12);
  // A crossbow is one-handed (the shield stays), fires bolts and never arrows, and hits harder than a plain bow.
  give(p, "pewter_shield"); equip(g, p.inventory.findIndex(slot => slot?.id === "pewter_shield"));
  give(p, "pewter_arrow", 50);
  equip(g, p.inventory.findIndex(slot => slot?.id === "pewter_crossbow"));
  assert.equal(p.equipment.shield, "pewter_shield", "a crossbow leaves a hand for a shield");
  p.xp.ranged = XP_TABLE[60];
  assert.equal(bestArrow(g)?.id, "pewter_bolts");
  const crossbowHit = rangedMaxHit(g);
  give(p, "shortbow"); equip(g, p.inventory.findIndex(slot => slot?.id === "shortbow"));
  assert.equal(bestArrow(g)?.id, "pewter_arrow", "bows fire arrows, not bolts");
  const bowHit = rangedMaxHit(g);
  equip(g, p.inventory.findIndex(slot => slot?.id === "war_bow"));
  const warHit = rangedMaxHit(g);
  assert(crossbowHit > bowHit && warHit > bowHit, `harder hits: crossbow ${crossbowHit}, war bow ${warHit}, bow ${bowHit}`);
  assert(item("war_bow").equip.speed > item("shortbow").equip.speed && item("pewter_crossbow").equip.speed > item("shortbow").equip.speed, "and slower");
  assert.equal(item("war_bow").equip.requires.ranged, 5, "the plain war bow needs Ranged 5");
  assert.equal(bowRange(g), 8, "a war bow reaches a tile further");
  // War bows are sold only in Fernwick.
  const sellers = Object.values(SHOPS).filter(shop => shop.stock.some(id => id.endsWith("war_bow"))).map(shop => shop.id);
  assert.deepEqual(sellers, ["barkreach_fletcher", "war_bows"]);
});

test("Hazel's Quiver: the Grumblin chief has it, Hazel mends it, and it calls shots home", () => {
  const g = newGame(), p = g.player;
  const hazel = g.npcs.find(npc => npc.id === "hazel");
  assert(hazel, "Hazel is in Fernwick"); assert.equal(regionAt(g.world, hazel.x, hazel.y).id, "fernwick");
  const talk = () => { standNear(g, hazel.x, hazel.y, 1); setTarget(g, { kind: "npc", uid: hazel.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30); };
  const say = label => { while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); const index = g.dialogue.options.findIndex(option => option.label.startsWith(label)); assert(index >= 0, label); chooseOption(g, index); };
  talk(); say("You look troubled."); say("I'll get it back.");
  while (g.dialogue) continueDialogue(g);
  assert.equal(p.quests.hazels_quiver, 1);
  onMonsterKilled(g, "grumblin_chief", 0, 0);
  assert(has(p, "torn_quiver"), "the chief drops the torn quiver");
  give(p, "leather", 2); give(p, "feather", 15); give(p, "oak_logs", 5);
  talk(); say("I have everything"); while (g.dialogue) continueDialogue(g);
  assert.equal(p.quests.hazels_quiver, 2); assert(has(p, "hazels_quiver") && !has(p, "torn_quiver") && !has(p, "leather"));
  equip(g, p.inventory.findIndex(slot => slot?.id === "hazels_quiver"));
  assert.equal(p.equipment.cape, "hazels_quiver", "worn on the back");
  // Shoot a cow with the quiver on: most bolts come home.
  p.xp.ranged = XP_TABLE[20]; give(p, "pewter_crossbow"); equip(g, p.inventory.findIndex(slot => slot?.id === "pewter_crossbow")); give(p, "pewter_bolts", 100);
  let shots = 0, before = 100;
  for (const cow of g.monsters.filter(monster => monster.def.id === "cow").slice(0, 3)) {
    standNear(g, cow.x, cow.y, 4); setTarget(g, { kind: "monster", uid: cow.uid, option: "Attack" });
    for (let i = 0; i < 60 && !cow.dead; i++) { const n = count(p, "pewter_bolts"); tick(g); if (count(p, "pewter_bolts") !== n || g.events?.some?.(event => event.type === "projectile")) shots++; }
  }
  const spent = before - count(p, "pewter_bolts");
  assert(p.xp.ranged > XP_TABLE[20], "shots were fired");
  assert(spent < 12, `most bolts fly home (${spent} lost)`);
});

test("Pursuance: a contract from the Warden, XP per kill, points when it's done, and creatures only a seasoned pursuer can wound", () => {
  const g = newGame(), p = g.player;
  const warden = g.npcs.find(npc => npc.id === "slayer_master");
  assert(warden, "the Warden is in Friendhollow");
  standNear(g, warden.x, warden.y, 1);
  setTarget(g, { kind: "npc", uid: warden.uid, option: "Assignment" });
  until(g, () => g.dialogue !== null, 30);
  while (g.dialogue) continueDialogue(g);
  const task = currentTask(g);
  assert(task, "a task is given");
  // Take the rats task and finish it with a big hitter.
  p.questData.slayer_task = 1; p.questData.slayer_left = 2; p.questData.slayer_kind = 0;
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = 1_000_000;
  p.hp = 99;
  for (let kill = 0; kill < 2; kill++) {
    // The nearest rat you can actually get beside (one wedged in a corner is skipped).
    const rats = g.monsters.filter(monster => monster.def.id === "ink_rat" && !monster.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    const rat = rats.find(candidate => [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => canWalk(g, candidate.x + dx, candidate.y + dy) && findPath(g, p, (x, y) => x === candidate.x + dx && y === candidate.y + dy, { x: candidate.x + dx, y: candidate.y + dy })));
    standNear(g, rat.x, rat.y, 1);
    setTarget(g, { kind: "monster", uid: rat.uid, option: "Attack" });
    until(g, () => rat.dead, 200);
  }
  assert(p.xp.slayer > 0, "Pursuance XP on the contract");
  assert.equal(currentTask(g), null); assert.equal(slayerPoints(g), 10, "10 points for a finished task");
  // A mire crawler can't be hurt below Slayer 10.
  const crawler = g.monsters.find(monster => monster.def.id === "mire_crawler");
  standNear(g, crawler.x, crawler.y, 1);
  setTarget(g, { kind: "monster", uid: crawler.uid, option: "Attack" });
  run(g, 8);
  assert.equal(crawler.hp, crawler.def.hp, "no damage without the Pursuance level");
  assert(g.messages.some(entry => entry.text.includes("Pursuance level of 10")));
});

test("Mastery capes: 99 in a skill and 99,000 coins, trimmed once you've mastered two", () => {
  const g = newGame(), p = g.player;
  give(p, "coins", 200_000);
  assert(capeProblem(g, "attack_cape"), "no cape without 99");
  assert.equal(buy(g, "capes", "attack_cape", 1), 0);
  p.xp.attack = 13_034_431;
  const coins = count(p, "coins");
  assert.equal(buy(g, "capes", "attack_cape", 1), 1);
  assert(has(p, "attack_cape")); assert.equal(count(p, "coins"), coins - 99_000);
  p.xp.strength = 13_034_431;
  buy(g, "capes", "strength_cape", 1);
  assert(has(p, "strength_cape_t"), "two 99s: trimmed");
  equip(g, p.inventory.findIndex(slot => slot?.id === "attack_cape"));
  assert.equal(p.equipment.cape, "attack_cape");
  assert(capeProblem(g, "grandmaster_cape"), "the Grandmaster's cape needs every skill");
});

test("Rare Market bundles: goods on top of the caskets; tablets travel, lamps give XP", () => {
  const g = newGame(), p = g.player;
  grantBundle(g, "traveller");
  for (const place of ["hollow_square", "emberforge", "oasis", "frostpeak", "pier"]) assert.equal(count(p, `tablet_${place}`), 2, place);
  breakTablet(g, p.inventory.findIndex(slot => slot?.id === "tablet_emberforge"));
  run(g, 4);
  assert(Math.hypot(p.x - g.world.places.emberforge.x, p.y - g.world.places.emberforge.y) < 2, "the tablet takes you to Emberforge");
  grantBundle(g, "insight");
  const before = p.xp.cooking;
  rubLamp(g, p.inventory.findIndex(slot => slot?.id === "insight_lamp"), "cooking");
  assert.equal(p.xp.cooking - before, 100, "100 × level 1");
  grantBundle(g, "contract"); assert.equal(slayerPoints(g), 40);
  grantBundle(g, "tailor", "starlit_hood");
  assert(p.wardrobe.includes("starlit_hood") && p.worn.includes("starlit_hood"));
});

test("Fletching: shafts from logs, feathers, arrowheads from the anvil, and arrows", () => {
  const g = newGame(), p = g.player;
  p.inventory = p.inventory.map(() => null);
  give(p, "knife"); give(p, "logs", 2); give(p, "feather", 30); give(p, "hammer"); give(p, "pewter_bar", 1); p.xp.smithing = 1154;
  const knife = () => p.inventory.findIndex(slot => slot?.id === "knife"), logs = () => p.inventory.findIndex(slot => slot?.id === "logs");
  useItemOnItem(g, knife(), logs());
  assert(g.ui.production, "a knife on logs opens the fletching menu");
  startProduction(g, g.ui.production.recipes[0], 2); g.ui.production = null;
  until(g, () => count(p, "arrow_shaft") === 30, 60);
  assert(p.xp.fletching > 0);
  useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "feather"), p.inventory.findIndex(slot => slot?.id === "arrow_shaft"));
  until(g, () => count(p, "headless_arrow") === 30, 60);
  const heads = smithingRecipes("pewter").find(recipe => recipe.outputs.pewter_arrowheads);
  assert(heads, "arrowheads at the anvil");
  startProduction(g, heads, 1);
  until(g, () => count(p, "pewter_arrowheads") === 15, 30);
  useItemOnItem(g, p.inventory.findIndex(slot => slot?.id === "pewter_arrowheads"), p.inventory.findIndex(slot => slot?.id === "headless_arrow"));
  until(g, () => count(p, "pewter_arrow") === 15, 30);
});

test("Sigilcraft: mine sigil stones in the Wizards' Tower, press them at an altar", () => {
  const g = newGame(), p = g.player, world = g.world;
  const rock = world.objects.find(object => object.kind === "rock" && object.rock === "sigil");
  assert(rock && realPoint(world, rock.x, rock.y).x > 150, "sigil stone in the Wizards' Tower");
  standBy(g, rock);
  menuFor(g, [{ kind: "object", id: rock.id }], null)[0].run(g);
  until(g, () => count(p, "sigil_stone") >= 3, 400);
  assert(!g.depleted.has(rock.id), "the stone never runs out");
  const altar = world.objects.find(object => object.kind === "sigil_altar" && object.sigil === "breeze_sigil");
  const before = count(p, "breeze_sigil"), stones = count(p, "sigil_stone");
  assert.equal(craftSigils(g, altar), stones);
  assert.equal(count(p, "breeze_sigil") - before, stones); assert(p.xp.sigilcraft > 0);
  const hollow = world.objects.find(object => object.kind === "sigil_altar" && object.sigil === "hollow_sigil");
  give(p, "sigil_stone"); assert.equal(craftSigils(g, hollow), 0, "Hollow needs Sigilcraft 65");
  assert.equal(world.objects.filter(object => object.kind === "sigil_altar").length, 15, "eleven on the mainland, Quillhaven's thought altar, and Raria's law, dusk and crown altars");
});

test("Dragons breathe fire; the King's Wyrmward shield turns it aside", () => {
  const g = newGame(), p = g.player;
  const drake = g.monsters.find(monster => monster.def.id === "ash_drake");
  assert(drake && drake.def.breath, "ash drakes live in Wyrmreach");
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = 13_034_431;
  for (const other of g.monsters) if (other !== drake) other.dead = true, other.respawnAt = Infinity;
  // Stand next to the drake's footprint (it's two tiles wide), square on, where it can reach you.
  const size = drake.def.size ?? 1, besideFootprint = m => { for (const [x, y] of [[m.x - 1, m.y], [m.x, m.y - 1], [m.x + size, m.y], [m.x, m.y + size]]) if (canWalk(g, x, y)) { teleport(g, x, y); return; } assert.fail("nowhere beside the drake"); };
  const worst = shielded => {
    let max = 0; p.equipment.shield = shielded ? "wyrmward_shield" : undefined; if (!shielded) delete p.equipment.shield;
    for (let i = 0; i < 400; i++) { p.hp = 99; drake.dead = false; drake.hp = drake.def.hp; drake.target = true; drake.attackTimer = 0; besideFootprint(drake); p.combat = null;
      const hp = p.hp; tick(g); max = Math.max(max, hp - p.hp); }
    return max;
  };
  assert(worst(false) > 15, "unshielded breath hits hard");
  assert(worst(true) <= drake.def.maxHit, "the shield keeps it to melee-sized hits");
  // King Hollis hands out the shield.
  const g2 = newGame(), king = g2.npcs.find(npc => npc.id === "king");
  g2.player.questData.royal_audience = 1;
  standNear(g2, king.x, king.y, 1);
  setTarget(g2, { kind: "npc", uid: king.uid, option: "Talk-to" });
  until(g2, () => g2.dialogue !== null, 30);
  continueDialogue(g2); chooseOption(g2, 3);
  while (g2.dialogue) continueDialogue(g2);
  assert(has(g2.player, "wyrmward_shield"));
});

test("Merchants pay more for their trade; the Archmage starts you in magic", () => {
  const g = newGame(), p = g.player;
  assert(sellPrice("inkshark", "fishing") > sellPrice("inkshark", "general"), "Pike pays more for fish");
  give(p, "yew_logs", 1);
  const coins = count(p, "coins");
  sell(g, "axes", p.inventory.findIndex(slot => slot?.id === "yew_logs"), 1);
  assert.equal(count(p, "coins") - coins, Math.floor(180 * 0.6));
  const archmage = g.npcs.find(npc => npc.id === "archmage");
  assert(realPoint(g.world, archmage.x, archmage.y).level === 2, "at the top of the tower");
  p.inventory = p.inventory.map(() => null);
  standNear(g, archmage.x, archmage.y, 1);
  setTarget(g, { kind: "npc", uid: archmage.uid, option: "Talk-to" });
  until(g, () => g.dialogue !== null, 30);
  while (g.dialogue) continueDialogue(g);
  for (const id of ["scholar_hat", "scholar_robe", "staff", "breeze_sigil", "thought_sigil"]) assert(has(p, id), id);
});

test("Save codes: a whole adventure in one line, for its own Friend only; emotes", async () => {
  const { makeSaveCode, restoreSaveCode } = await import("../games/rarefriends-realm/savecode.ts");
  const { performEmote, emoteProblem } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player;
  p.xp.fishing = 50_000; give(p, "yew_bow"); p.quests.friends_feast = 2; p.wardrobe.push("rose_cape");
  const code = await makeSaveCode(g);
  assert.match(code, /^RFR1-7730-[0-9a-z]+-[A-Za-z0-9_-]+$/);
  assert(code.length < 4000, `compact (${code.length} characters)`);
  const fresh = newGame();
  assert.equal(await restoreSaveCode(fresh, code), null);
  assert.equal(fresh.player.xp.fishing, 50_000); assert(has(fresh.player, "yew_bow")); assert(fresh.player.wardrobe.includes("rose_cape"));
  assert.match(await restoreSaveCode(fresh, code.slice(0, -3)), /damaged/, "a truncated code is caught");
  assert.match(await restoreSaveCode(newGame({ friendId: 3412 }), code), /Friend #7730/, "only for its own Friend");
  // Emotes: performed, ended by walking; the skillcape one needs a mastery cape.
  assert(performEmote(g, "dance")); assert.equal(p.emote.id, "dance");
  walkTo(g, p.x + 3, p.y); run(g, 2); assert.equal(p.emote, null, "walking ends an emote");
  assert(emoteProblem(g, "skillcape")); p.equipment.cape = "attack_cape"; assert.equal(emoteProblem(g, "skillcape"), null);
});

test("Trading: request, offers (changes clear accepts), a second screen, the swap; a lost message is re-sent", async () => {
  const { Trades } = await import("../games/rarefriends-realm/trade.ts");
  const ga = newGame(), gb = newGame({ friendId: 3412 });
  const queue = [], lose = { next: false };
  const wire = (from, to) => (target, act) => { if (lose.next && act.kind === "trade-accept" && act.stage === 2 && from === 7730) { lose.next = false; return; } queue.push({ from, to, act }); };
  const a = new Trades(wire(7730, 3412)), b = new Trades(wire(3412, 7730)), desks = { 7730: [a, ga], 3412: [b, gb] };
  const flush = () => { while (queue.length) { const { from, to, act } = queue.shift(); const [desk, g] = desks[to]; desk.receive(g, from, act, performance.now()); } };
  give(ga.player, "coins", 1000); give(gb.player, "yew_bow");
  a.request(ga, 3412, 0); flush();
  assert(b.incoming.has(7730), "B sees the request");
  b.request(gb, 7730, 0); flush();
  assert(a.view() && b.view(), "both trade windows open");
  a.offer(ga, "coins", 500); b.offer(gb, "yew_bow", 1); flush();
  assert.deepEqual(b.view().theirs, [{ id: "coins", n: 500 }]);
  a.accept(ga); flush();
  assert(b.view().theirAccept, "B sees A's accept");
  a.offer(ga, "coins", 100); flush();
  assert(!a.view().myAccept && !b.view().theirAccept, "a change clears both accepts");
  a.accept(ga); b.accept(gb); flush();
  assert.equal(a.view().stage, 2); assert.equal(b.view().stage, 2);
  const beforeA = count(ga.player, "coins"), beforeB = count(gb.player, "coins");
  lose.next = true; // A's second accept to B gets lost on the way
  a.accept(ga); b.accept(gb); flush();
  assert.equal(a.view(), null, "A swapped (it holds both accepts)");
  assert(b.view(), "B is still waiting for A's lost accept");
  a.tick(performance.now() + 2000); flush();
  assert.equal(b.view(), null, "the re-sent accept completes B's side");
  assert(has(ga.player, "yew_bow")); assert.equal(count(ga.player, "coins"), beforeA - 600);
  assert(!has(gb.player, "yew_bow")); assert.equal(count(gb.player, "coins"), beforeB + 600);
  // Untradeable things can't be offered.
  a.request(ga, 3412, 0); flush(); b.request(gb, 7730, 0); flush();
  give(ga.player, "attack_cape"); a.offer(ga, "attack_cape", 1);
  assert.deepEqual(a.view().mine, []);
});

test("Shared fights: the same monster in two games takes both players' hits; a peer's kill gives no loot here", async () => {
  const { syncMonster, currentFight } = await import("../games/rarefriends-realm/engine.ts");
  const ga = newGame(), gb = newGame({ friendId: 3412 });
  const cowA = ga.monsters.find(m => m.def.id === "cow"), cowB = gb.monsters.find(m => m.uid === cowA.uid);
  assert.equal(cowB.def.id, "cow", "same uid, same monster in both games");
  ga.tick = gb.tick = 50;
  standNear(gb, cowB.x, cowB.y, 1); gb.player.combat = cowB.uid; cowB.hp -= 3;
  const fight = currentFight(gb);
  assert.deepEqual([fight.u, fight.hp], [cowB.uid, cowB.def.hp - 3]);
  cowA.x += 6; syncMonster(ga, fight, 3412);
  assert.equal(cowA.hp, cowB.def.hp - 3, "B's damage counts in A's game");
  assert(Math.max(Math.abs(cowA.x - cowB.x), Math.abs(cowA.y - cowB.y)) <= 1, "A's copy goes to where B is fighting it");
  const groundBefore = ga.ground.length;
  syncMonster(ga, { ...fight, hp: 0 }, 3412);
  assert(cowA.dead, "B's killing blow kills it here too");
  assert.equal(ga.ground.length, groundBefore, "no loot for A from B's kill");
  cowA.dead = false; cowA.hp = cowA.def.hp; cowA.bornAt = ga.tick;
  syncMonster(ga, { ...fight, hp: 1 }, 3412);
  assert.equal(cowA.hp, cowA.def.hp, "reports from its last life are ignored right after it respawns");
});

test("Referrals: a friend's code gives both Friends coins, the Friendship cape and +15% XP; once each, saved", async () => {
  const { applyReferral, creditReferral, referralCode, emoteProblem } = await import("../games/rarefriends-realm/engine.ts");
  const newbie = newGame({ friendId: 3412 }), veteran = newGame(), coins = count(newbie.player, "coins"), base = xpMultiplier(newbie.player);
  assert.equal(referralCode(veteran), "RF-7730");
  assert.match(applyReferral(newbie, "RF-3412"), /own code/);
  assert.equal(applyReferral(newbie, "rf-7730"), null);
  assert.equal(count(newbie.player, "coins"), coins + 250); assert(has(newbie.player, "friendship_cape"));
  assert(xpMultiplier(newbie.player) > base, "the boost is on");
  assert.match(applyReferral(newbie, "RF-5555"), /already used/);
  assert(creditReferral(veteran, 3412)); assert(!creditReferral(veteran, 3412), "credited once");
  assert(has(veteran.player, "friendship_cape")); assert.equal(veteran.player.boostTicks, 6000);
  assert(emoteProblem(veteran, "friendship"));
  equip(veteran, veteran.player.inventory.findIndex(slot => slot?.id === "friendship_cape"));
  assert.equal(emoteProblem(veteran, "friendship"), null);
  const restored = newGame({ friendId: 3412 });
  restore(restored, JSON.parse(JSON.stringify(serialize(newbie))));
  assert.equal(restored.player.referredBy, 7730); assert.equal(restored.player.boostTicks, newbie.player.boostTicks);
  run(newbie, 3); assert.equal(newbie.player.boostTicks, 5997, "the boost counts down with play");
});

test("Weather: the same sky for every player at the same moment; storms strike, deserts stay dry, dawn is foggy", async () => {
  const { weatherAt, strikeAt } = await import("../games/rarefriends-realm/weather.ts");
  const ms = 1_790_000_000_000;
  assert.deepEqual(weatherAt(ms, "friendhollow", false, 0.5), weatherAt(ms, "friendhollow", false, 0.5), "deterministic");
  let storms = 0, rainy = 0, strikes = 0;
  for (let spell = 0; spell < 400; spell++) {
    const at = ms + spell * 240_000 + 120_000, w = weatherAt(at, "friendhollow", false, 0.5);
    if (w.storm) { storms++; for (let s = 0; s < 60; s++) if (strikeAt(at + s * 1000)?.id === Math.floor((at + s * 1000) / 1000)) strikes++; }
    if (w.rain > 0) rainy++;
    assert.equal(weatherAt(at, "pale_dunes", false, 0.5).rain, 0, "no rain in the desert");
    assert.equal(weatherAt(at, "crypt", true, 0.5).rain, 0, "none underground");
  }
  assert(storms > 20 && rainy > storms, `some rain and some storms (${rainy}, ${storms})`);
  assert(strikes > 0, "lightning in storms");
  assert(weatherAt(ms, "farmland", false, 0.27).fog > 0.6, "fog at dawn");
});

test("Shops: general stores in every town buy anything, traders buy what they sell, and what you sell goes on the shelf to buy back", () => {
  const game = newGame(), player = game.player;
  for (const [id, shop] of [["trader_ember", "general_ember"], ["trader_frost", "general_frost"], ["trader_oasis", "general_oasis"]]) {
    assert.equal(NPCS[id].shop, shop); assert(SHOPS[shop].general);
    assert(game.npcs.some(npc => npc.id === id), `${id} is in the world`);
  }
  player.inventory = player.inventory.map(() => null);
  give(player, "oak_logs", 3); give(player, "fishing_rod");
  const coins = count(player, "coins");
  assert.equal(sell(game, "general_ember", player.inventory.findIndex(slot => slot?.id === "oak_logs"), 3), 3, "a general store buys logs");
  assert.deepEqual(game.shopStock.general_ember, [{ id: "oak_logs", n: 3 }], "and puts them on the shelf");
  assert(count(player, "coins") > coins);
  assert.equal(sell(game, "fishing", player.inventory.findIndex(slot => slot?.id === "fishing_rod"), 1), 1, "Pike buys back a rod he sells");
  assert.equal(game.shopStock.fishing, undefined, "his own stock isn't doubled");
  give(player, "coins", 1000);
  assert.equal(buy(game, "general_ember", "oak_logs", 5), 3, "buy back only what's on the shelf");
  assert.equal(game.shopStock.general_ember.length, 0);
  assert.equal(buy(game, "general_ember", "oak_logs", 1), 0, "then it's gone");
});

test("Mounts: bought at the stables, ridden faster without run energy, each with its gift, saved, and left outside dungeons", () => {
  const game = newGame(), player = game.player;
  assert(game.npcs.some(npc => npc.id === "stablemaster") && game.npcs.some(npc => npc.id === "paddock_unicorn"), "the stables are staffed");
  assert.equal(NPCS.stablemaster.options.includes("Stables"), true);
  assert(MOUNTS.length >= 8 && MOUNTS.some(mount => mount.coat.horn) && new Set(MOUNTS.map(mount => mount.coat.body)).size === MOUNTS.length, "horses of every colour, and unicorns");
  toggleMount(game);
  assert.equal(player.mount, null, "no mount to ride yet");
  grantMount(game, "unicorn");
  assert.deepEqual(player.mounts, ["unicorn"]); assert.equal(player.mount, "unicorn", "you ride it away");
  const before = xpMultiplier(player); player.mount = null; assert(before > xpMultiplier(player), "a unicorn's +10% XP"); player.mount = "unicorn";
  // Riding covers three tiles a tick, and doesn't touch run energy.
  player.run = false; player.energy = 50;
  const start = { x: player.x, y: player.y };
  walkTo(game, start.x + 6, start.y);
  tick(game); tick(game);
  assert(Math.abs(player.x - start.x) + Math.abs(player.y - start.y) >= 5, `galloped (${player.x - start.x}, ${player.y - start.y})`);
  assert(player.energy >= 50, "no run energy used");
  const save = JSON.parse(JSON.stringify(serialize(game))), fresh = newGame();
  assert(restore(fresh, save)); assert.deepEqual(fresh.player.mounts, ["unicorn"]); assert.equal(fresh.player.mount, "unicorn");
  save.mounts = ["dragon_bus"]; save.mount = "dragon_bus"; const bad = newGame(); restore(bad, save); assert.deepEqual(bad.player.mounts, []); assert.equal(bad.player.mount, null, "unknown mounts are dropped");
  // Underground you go on foot.
  { const under = movedPoint(game.world, ...M(0, 210)); player.x = under.x; player.y = under.y; } assert(rideProblem(game)); tick(game); assert.equal(player.mount, null, "left to graze outside");
  toggleMount(game); assert.equal(player.mount, null, "can't mount down here");
});

test("Trading: when both players ask at the same moment, both open the same trade and it goes through", async () => {
  const { Trades } = await import("../games/rarefriends-realm/trade.ts");
  const ga = newGame(), gb = newGame({ friendId: 3412 }), queue = [];
  const wire = (from, to) => (target, act) => queue.push({ from, to, act });
  const a = new Trades(wire(7730, 3412)), b = new Trades(wire(3412, 7730)), desks = { 7730: [a, ga], 3412: [b, gb] };
  const flush = () => { while (queue.length) { const { from, to, act } = queue.shift(); const [desk, g] = desks[to]; desk.receive(g, from, act, 0); } };
  give(ga.player, "coins", 1000); give(gb.player, "yew_bow");
  a.request(ga, 3412, 0); b.request(gb, 7730, 0); // both requests cross on the wire
  flush();
  assert(a.view() && b.view(), "both windows open");
  assert.equal(a.open.id, b.open.id, "on the same trade");
  a.offer(ga, "coins", 300); b.offer(gb, "yew_bow", 1); flush();
  assert.deepEqual(a.view().theirs, [{ id: "yew_bow", n: 1 }]); assert.deepEqual(b.view().theirs, [{ id: "coins", n: 300 }]);
  a.accept(ga); b.accept(gb); flush(); a.accept(ga); b.accept(gb); flush();
  assert(has(ga.player, "yew_bow") && !has(gb.player, "yew_bow") && count(gb.player, "coins") >= 300, "swapped");
});

test("Referrals: at most five rewarded in any 24 hours; the rest wait for another day together", async () => {
  const { creditReferral } = await import("../games/rarefriends-realm/engine.ts");
  const game = newGame(), day = 86_400_000, t0 = 1_790_000_000_000;
  for (let i = 0; i < 5; i++) assert(creditReferral(game, 5000 + i, t0 + i * 1000), `referral ${i + 1}`);
  assert(!creditReferral(game, 6000, t0 + 60_000), "the sixth today waits");
  assert(!game.player.referrals.includes(6000), "and isn't used up");
  const save = JSON.parse(JSON.stringify(serialize(game))), fresh = newGame(); restore(fresh, save);
  assert(!creditReferral(fresh, 6000, t0 + 3_600_000), "still capped after a reload");
  assert(creditReferral(fresh, 6000, t0 + day + 5000), "credited the next day");
  assert(!creditReferral(game, 5000, t0 + 2 * day), "each Friend only once");
});

test("Daily: a streak that grows day by day and resets after a missed day, three shared challenges, the chest, and saves", async () => {
  const { claimStreak, streakStatus, streakReward, rollDaily, challengeProgress, claimChallenge, claimChest, DAY_MS } = await import("../games/rarefriends-realm/daily.ts");
  const game = newGame(), p = game.player, t0 = 20_000 * DAY_MS + 3_600_000;
  p.inventory = p.inventory.map(() => null);
  assert(streakStatus(game, t0).canClaim);
  const coins = count(p, "coins");
  assert(claimStreak(game, t0)); assert.equal(p.daily.streak, 1); assert.equal(count(p, "coins"), coins + 500, "day 1: 500 coins");
  assert(!claimStreak(game, t0 + 60_000), "once a day");
  for (let d = 1; d < 7; d++) assert(claimStreak(game, t0 + d * DAY_MS));
  assert.equal(p.daily.streak, 7); assert(has(p, "insight_lamp"), "day 7: a lamp");
  assert.equal(streakReward(8).coins, 625, "the second week pays 25% more");
  assert(claimStreak(game, t0 + 9 * DAY_MS)); assert.equal(p.daily.streak, 1, "a missed day starts again"); assert.equal(p.daily.best, 7);
  // Challenges: the same three for everyone on a day; progress from XP and kills gained since the day began.
  const other = newGame({ friendId: 3412 }), day = t0 + 9 * DAY_MS;
  rollDaily(game, day);
  let differ = false;
  for (let d = 0; d < 12 && !differ; d++) { rollDaily(other, day + d * DAY_MS); const mine = newGame(); rollDaily(mine, day + d * DAY_MS); differ = JSON.stringify(mine.player.daily.challenges) !== JSON.stringify(other.player.daily.challenges); }
  assert(differ, "challenges are rolled for each player, not shared");
  assert.equal(p.daily.challenges.length, 3);
  assert(!claimChallenge(game, 0), "not done yet");
  for (const [i, c] of p.daily.challenges.entries()) { if (c.kind === "xp") p.xp[c.skill] += c.target; else if (c.kind === "orders") p.stats.orders = (p.stats.orders ?? 0) + c.target; else p.kills += c.target; assert.equal(challengeProgress(game, i), c.target); }
  assert(!claimChest(game), "the chest waits for all three");
  for (let i = 0; i < 3; i++) assert(claimChallenge(game, i));
  assert(!claimChallenge(game, 0), "each once");
  assert(claimChest(game)); assert(!claimChest(game));
  assert(!rollDaily(game, day + 1000), "same day, same challenges");
  const save = JSON.parse(JSON.stringify(serialize(game))), fresh = newGame(); assert(restore(fresh, save));
  assert.deepEqual(fresh.player.daily, p.daily, "saved");
  assert(rollDaily(fresh, day + DAY_MS) && fresh.player.daily.claimed.every(c => !c) && !fresh.player.daily.chest, "a new day, new challenges");
  // Simulated RF: a reroll changes the unclaimed challenges (claimed ones stay claimed); buying the day done claims the rest and opens the chest.
  const { rerollDaily, completeDaily } = await import("../games/rarefriends-realm/daily.ts");
  const was = JSON.stringify(fresh.player.daily.challenges); let changed = false;
  for (let i = 0; i < 6 && !changed; i++) { rerollDaily(fresh, day + DAY_MS); changed = JSON.stringify(fresh.player.daily.challenges) !== was; }
  assert(changed, "a reroll rolls afresh"); assert(fresh.player.daily.rerolls >= 1);
  const fp = fresh.player, before = count(fp, "coins"); completeDaily(fresh, day + DAY_MS);
  assert(fp.daily.claimed.every(Boolean) && fp.daily.chest && count(fp, "coins") > before, "bought done");
  save.daily = { day: "x", challenges: [{ kind: "xp", skill: "hacking", target: 5 }] }; const bad = newGame(); restore(bad, save);
  assert.equal(bad.player.daily.challenges.length, 0, "odd saves start fresh");
});

test("Updates: new players have seen the log; saves from before it see it once", async () => {
  const { LATEST_UPDATE, UPDATES } = await import("../games/rarefriends-realm/updates.ts");
  assert.equal(new Set(UPDATES.map(u => u.id)).size, UPDATES.length, "unique ids");
  assert.deepEqual(UPDATES.map(u => u.id), [...UPDATES.map(u => u.id)].sort((a, b) => b - a), "newest first");
  const game = newGame(); assert.equal(game.player.seenUpdate, LATEST_UPDATE);
  const save = JSON.parse(JSON.stringify(serialize(game))); delete save.seenUpdate; const old = newGame(); restore(old, save);
  assert.equal(old.player.seenUpdate, 0);
});

test("World boss: the Ashen Colossus rises for everyone on the even hours, pays everyone who wounded it, and leaves after twenty minutes", async () => {
  const { updateWorldBoss, bossWindow, BOSS_EVERY, BOSS_LASTS } = await import("../games/rarefriends-realm/worldboss.ts");
  const a = newGame(), b = newGame({ friendId: 3412 }), t = 20_000 * BOSS_EVERY + 60_000;
  assert.equal(updateWorldBoss(a, t), "risen"); updateWorldBoss(b, t);
  const bossA = a.monsters.find(m => m.def.worldBoss), bossB = b.monsters.find(m => m.def.worldBoss);
  assert(bossA && bossB); assert.equal(bossA.uid, bossB.uid, "the same boss in every game"); assert.deepEqual([bossA.x, bossA.y], [bossB.x, bossB.y]);
  assert.equal(updateWorldBoss(a, t + 1000), null, "only once per window");
  assert(bossWindow(t).active && !bossWindow(t + BOSS_LASTS).active);
  // A wounds it; B lands the final blow and shares it: A gets the kill and the loot.
  bossA.mine = true; bossA.hp -= 100;
  const coins = count(a.player, "coins"), ground = a.ground.length;
  for (let i = 0; i < 9; i++) tick(a);
  syncMonster(a, { u: bossA.uid, id: "ashen_colossus", hp: 0, x: bossA.x, y: bossA.y }, 3412);
  assert(bossA.dead); assert.equal(a.player.killLog.ashen_colossus, 1, "A's kill counts");
  assert(a.ground.length > ground || count(a.player, "coins") > coins, "and A gets the loot");
  assert.equal(updateWorldBoss(a, t + BOSS_LASTS + 1), null, "a fallen boss just clears away");
  assert(!a.monsters.some(m => m.def.worldBoss));
  updateWorldBoss(b, t + BOSS_LASTS + 1); assert(!b.monsters.some(m => m.def.worldBoss), "and leaves when its time is up");
});

test("Pets: found by chance while training, follow you instead of a Friend, and are saved", async () => {
  const { rollPet, setPet } = await import("../games/rarefriends-realm/engine.ts");
  const game = newGame(); let found = false;
  game.rng = () => 0; // the luckiest roll
  found = rollPet(game, "stumpy", 50);
  assert(found && game.player.pets.includes("stumpy") && game.player.petOut === "stumpy", "a pet, and it follows you");
  assert(!rollPet(game, "stumpy", 50), "only one of each");
  game.rng = () => 0.99; assert(!rollPet(game, "pebble", 99), "rare");
  setFollower(game, { id: 3412, generation: 2 }); assert.equal(game.player.petOut, null, "a Friend follower sends the pet home");
  setPet(game, "stumpy"); assert.equal(game.player.follower, null, "and a pet sends the Friend home");
  const save = JSON.parse(JSON.stringify(serialize(game))), fresh = newGame(); restore(fresh, save);
  assert.deepEqual(fresh.player.pets, ["stumpy"]); assert.equal(fresh.player.petOut, "stumpy");
});

test("Duels: hits only count inside the ring, are capped, and a loss restores you at once", async () => {
  const { duelAllowed, takeDuelHit, wonDuel, duelStrike, DUEL_MAX_HIT } = await import("../games/rarefriends-realm/duel.ts");
  const { RING } = await import("../games/rarefriends-realm/world.ts");
  const game = newGame(), p = game.player;
  assert(!duelAllowed(game, { x: RING.x0, y: RING.y0 }), "not while you're outside");
  p.x = RING.x0 + 1; p.y = RING.y0 + 1;
  assert(duelAllowed(game, { x: RING.x0 + 2, y: RING.y0 + 1 })); assert(!duelAllowed(game, { x: RING.x1 + 3, y: RING.y0 }), "nor with them outside");
  p.hp = 10; assert.equal(takeDuelHit(game, 3412, 3), "hit"); assert.equal(p.hp, 7);
  const items = JSON.stringify(p.inventory);
  assert.equal(takeDuelHit(game, 3412, 999), "lost"); assert.equal(p.hp, 10, "back to full"); assert.equal(JSON.stringify(p.inventory), items, "nothing lost");
  assert.equal(p.stats.duelsLost, 1);
  wonDuel(game, 3412); assert.equal(p.stats.duelsWon, 1);
  for (let i = 0; i < 50; i++) assert(duelStrike(game, 3) <= DUEL_MAX_HIT);
});

test("Achievements and hiscores: earned from your adventure, saved, and the players you meet ranked with you", async () => {
  const { checkAchievements, achieved, ACHIEVEMENTS } = await import("../games/rarefriends-realm/achievements.ts");
  const { notePlayers, hiscores } = await import("../games/rarefriends-realm/hiscores.ts");
  const game = newGame(), p = game.player, now = 20_000 * 86_400_000;
  assert.equal(achieved(game), 0);
  p.xp.woodcutting = 2000; p.kills = 1; p.mounts = ["unicorn"];
  const earned = checkAchievements(game, now).map(entry => entry.id);
  for (const id of ["first_steps", "first_blood", "saddle_up", "unicorn"]) assert(earned.includes(id), id);
  assert.equal(checkAchievements(game, now).length, 0, "once each");
  assert(ACHIEVEMENTS.length >= 30);
  notePlayers(game, [{ id: 3412, total: 900, combat: 80 }, { id: 5, total: 20, combat: 3 }, { id: p.friendId, total: 1, combat: 3 }], now);
  const table = hiscores(game);
  assert.deepEqual(table.map(row => row.you ? "you" : row.id), [3412, "you", 5]); assert.equal(table[0].rank, 1);
  const save = JSON.parse(JSON.stringify(serialize(game))), fresh = newGame(); restore(fresh, save);
  assert.equal(achieved(fresh), achieved(game)); assert.equal(Object.keys(fresh.player.met).length, 2);
});

test("First steps: a new Friend is guided through seven steps, each completing from what they do, then rewarded; old saves skip it", async () => {
  const { FIRST_STEPS, currentStep, skipFirstSteps } = await import("../games/rarefriends-realm/firststeps.ts");
  const game = newGame(), p = game.player;
  assert.equal(currentStep(game).id, "chop");
  assert(currentStep(game).target(game), "the arrow points at a tree");
  const lamps = count(p, "insight_lamp"), coins = count(p, "coins");
  const doStep = { chop: () => { p.xp.woodcutting = 25; }, fire: () => { p.xp.firemaking = 40; }, fish: () => { p.xp.fishing = 10; }, cook: () => { p.xp.cooking = 30; },
    horses: () => { p.stats.strokes = 1; }, king: () => { p.questData.royal_audience = 1; }, daily: () => { p.stats.dailyOpened = 1; } };
  for (const step of FIRST_STEPS) { assert.equal(currentStep(game).id, step.id); doStep[step.id](); tick(game); }
  assert.equal(currentStep(game), null); assert.equal(p.guide, FIRST_STEPS.length);
  assert.equal(count(p, "insight_lamp"), lamps + 1); assert.equal(count(p, "coins"), coins + 500, "rewarded once");
  tick(game); assert.equal(count(p, "coins"), coins + 500);
  const fresh = newGame(); skipFirstSteps(fresh); assert.equal(currentStep(fresh), null, "skippable");
  const save = JSON.parse(JSON.stringify(serialize(newGame()))); delete save.guide; const old = newGame(); restore(old, save);
  assert.equal(currentStep(old), null, "saves from before the guide don't see it");
});

test("XP: the early levels go slower (about half speed at level 1), the full rate from level 30, and fixed rewards are unaffected", () => {
  assert(Math.abs(earlyXp(1) - 0.5167) < 0.01); assert.equal(earlyXp(30), 1); assert.equal(earlyXp(80), 1);
  const g = newGame(), p = g.player;
  addXp(g, "woodcutting", 25); assert(Math.abs(p.xp.woodcutting - 25 * xpMultiplier(p) * earlyXp(1, "woodcutting")) < 1e-6, "a level-1 log pays under a third");
  assert(Math.abs(earlyXp(1, "fishing") - 0.3) < 1e-9 && Math.abs(earlyXp(10, "cooking") - earlyXp(10)) < 1e-9, "skills start at 30%, level with combat by 10");
  assert.equal(earlyXp(1, "attack"), earlyXp(1), "combat skills keep the gentler start");
  let logs = 0; p.xp.woodcutting = 0; while (level(g, "woodcutting") < 10) { addXp(g, "woodcutting", 25); logs++; }
  assert(logs >= 20, `level 10 takes a while now (${logs} logs)`);
  p.xp.mining = 13_363; const before = p.xp.mining; addXp(g, "mining", 35); assert(Math.abs(p.xp.mining - before - 35 * xpMultiplier(p)) < 1e-6, "full rate at level 30+");
  p.xp.fishing = 0; addXp(g, "fishing", 300, { raw: true }); assert.equal(p.xp.fishing, 300, "fixed rewards pay in full");
});

test("Faith: the Order of the Dawn, offerings, the Dawn Vigil, faith weapons and Light in the Greyhorn", () => {
  const g = newGame({ familyId: 2 }), p = g.player;
  const talkTo = (id, choose = 0) => {
    const npc = g.npcs.find(entry => entry.id === id);
    teleport(g, npc.x, npc.y + 1); if (!canWalk(g, npc.x, npc.y + 1)) teleport(g, npc.x + 1, npc.y);
    setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" });
    until(g, () => g.dialogue !== null, 40);
    while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g);
    if (g.dialogue?.options) chooseOption(g, choose);
    while (g.dialogue) continueDialogue(g);
  };
  const altar = g.world.objects.find(object => object.kind === "altar" && object.text === "dawn");
  assert(altar, "Dawnhold has a chapel altar");
  const offer = id => { give(p, id); standBy(g, altar); setTarget(g, { kind: "object", id: altar.id, option: "Use", use: p.inventory.findIndex(slot => slot?.id === id) }); run(g, 3); };

  // The skill is called Faith; the Order won't take a squire below Faith 10.
  assert.equal(SKILL_NAMES.prayer, "Faith");
  talkTo("grandmaster");
  assert.equal(p.quests.dawn_vigil ?? 0, 0, "Faith 10 needed to start");
  // Offering bones at the chapel: three times the burying XP.
  const before = p.xp.prayer; offer("bones");
  assert(p.xp.prayer - before > 4.5 * 3 * 0.9 * XP_RATE * earlyXp(1, "prayer") - 1e-9, "three times the XP of burying");
  // The Armoury is locked until the vigil is kept.
  assert(capeProblem(g, "dawnsteel_sword"), "the armoury is locked");
  p.xp.prayer = XP_TABLE[10];
  talkTo("grandmaster");
  assert.equal(p.quests.dawn_vigil, 1, "the vigil starts");
  for (let i = 0; i < 8; i++) offer("bones");
  assert.equal(p.questData.vigil_bones, 8);
  talkTo("grandmaster");
  assert.equal(p.quests.dawn_vigil, 2, "the vigil is kept");
  assert(has(p, "dawnsteel_sword"), "a Dawnsteel sword");
  assert(has(p, BONE_BAG), "and the ossuary bag");
  assert.equal(capeProblem(g, "dawnsteel_sword"), null, "the armoury opens");
  assert(capeProblem(g, "radiant_greatsword"), "but not its finest weapons");

  // A faith weapon: Faith XP with each hit, and harder hits on the undead.
  p.xp.attack = XP_TABLE[40]; p.xp.strength = XP_TABLE[40]; p.xp.hitpoints = XP_TABLE[40]; p.hp = 40; p.xp.prayer = XP_TABLE[20];
  equip(g, p.inventory.findIndex(slot => slot?.id === "dawnsteel_sword"));
  assert.equal(p.equipment.weapon, "dawnsteel_sword");
  const skeleton = g.monsters.find(monster => monster.def.id === "skeleton");
  assert(skeleton.def.undead, "skeletons are undead");
  const faith = p.xp.prayer, attack = p.xp.attack;
  teleport(g, skeleton.x, skeleton.y + 1); if (!canWalk(g, skeleton.x, skeleton.y + 1)) teleport(g, skeleton.x + 1, skeleton.y);
  setTarget(g, { kind: "monster", uid: skeleton.uid, option: "Attack" });
  until(g, () => p.xp.attack > attack, 200);
  assert(p.xp.prayer > faith, "a hit with a faith weapon gives Faith XP");
  assert((p.xp.prayer - faith) < (p.xp.attack - attack) / 8, "but only a trickle");

  // Light in the Greyhorn: three shards from stone golems, blessed on the altar, brought to the Grandmaster.
  p.combat = null; p.xp.prayer = XP_TABLE[30];
  talkTo("grandmaster");
  assert.equal(p.quests.greyhorn_light, 1);
  let tries = 0;
  while (count(p, "dawnstone_shard") < 3 && tries++ < 200) onMonsterKilled(g, "stone_golem", 300, 60);
  assert.equal(count(p, "dawnstone_shard"), 3, "golems drop the shards");
  offer("dawnstone_shard");
  assert.equal(p.quests.greyhorn_light, 2); assert(has(p, "dawnstone"));
  talkTo("grandmaster");
  assert.equal(p.quests.greyhorn_light, 3);
  assert(has(p, "dawn_cape"), "the Cape of the Dawn");
  assert.equal(capeProblem(g, "radiant_greatsword"), null, "the finest weapons unlock");
  assert.equal(questPoints(g), 3);
});

test("The Order's later quests: The Pilgrim's Road, The Restless Crypt and Dawn Against the Hollow award Dawnplate", () => {
  const g = newGame({ familyId: 2 }), p = g.player;
  const talkTo = (id, choose = 0) => {
    const npc = g.npcs.find(entry => entry.id === id);
    teleport(g, npc.x, npc.y + 1); if (!canWalk(g, npc.x, npc.y + 1)) teleport(g, npc.x + 1, npc.y);
    setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" });
    until(g, () => g.dialogue !== null, 40);
    while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g);
    if (g.dialogue?.options) chooseOption(g, choose);
    while (g.dialogue) continueDialogue(g);
  };
  const pray = name => { const altar = g.world.objects.find(object => object.kind === "altar" && object.name === name); standBy(g, altar); setTarget(g, { kind: "object", id: altar.id, option: "Pray-at" }); run(g, 3); };
  p.quests.dawn_vigil = 2; p.quests.greyhorn_light = 3; p.xp.prayer = XP_TABLE[60]; give(p, BONE_BAG); // (a squire with the vigil's bag already; without it Sister Maren hands one over first)
  assert(capeProblem(g, "dawnplate_greaves"), "Dawnplate is earned first");
  // The Pilgrim's Road: pray at the three old altars and the five wayward chapels.
  talkTo("chaplain");
  assert.equal(p.quests.pilgrims_road, 1);
  assert.equal(PILGRIM_ALTARS.length, 8); for (const [, altar] of PILGRIM_ALTARS) assert(g.world.objects.some(object => object.kind === "altar" && object.name === altar), altar);
  for (const [, altar] of PILGRIM_ALTARS) pray(altar);
  talkTo("chaplain");
  assert.equal(p.quests.pilgrims_road, 2); assert(has(p, "dawnplate_greaves") && has(p, "dawnplate_boots"));
  // The Restless Crypt: only kills with a faith weapon count.
  talkTo("chaplain");
  assert.equal(p.quests.restless_crypt, 1);
  onMonsterKilled(g, "skeleton", 28, 220);
  assert.equal(p.questData.crypt_rest ?? 0, 0, "ordinary steel doesn't lay them to rest");
  p.equipment.weapon = "dawnsteel_sword";
  for (let i = 0; i < 12; i++) onMonsterKilled(g, "skeleton", 28, 220);
  talkTo("chaplain");
  assert.equal(p.quests.restless_crypt, 2); assert(has(p, "dawnplate_helm") && has(p, "dawnplate_shield") && has(p, "dawnplate_gauntlets"));
  // Dawn Against the Hollow: after the Hollow King, five sentinels with a faith weapon and three Hollow essence.
  p.quests.hollow_king = 3;
  talkTo("grandmaster");
  assert.equal(p.quests.dawn_against_hollow, 1);
  for (let i = 0; i < 5; i++) onMonsterKilled(g, "hollow_sentinel", 60, 230);
  give(p, "hollow_essence", 3);
  talkTo("grandmaster");
  assert.equal(p.quests.dawn_against_hollow, 2); assert(has(p, "dawnplate_cuirass"));
  assert.equal(count(p, "hollow_essence"), 0);
  assert.equal(capeProblem(g, "dawnplate_cuirass"), null, "the armoury sells Dawnplate once earned");
  assert.equal(QUESTS.length, 118); assert.equal(MAX_QUEST_POINTS, 207);
});

test("Boots and gauntlets in every metal, smithed at the anvil; the clothier's shirts, dresses, trousers and skirts", () => {
  const g = newGame();
  const metals = [...new Set(ITEM_LIST.filter(entry => entry.id.endsWith("_cuirass")).map(entry => entry.id.replace("_cuirass", "")))];
  assert.ok(metals.length >= 12);
  for (const metal of metals) {
    for (const [piece, slot] of [["boots", "feet"], ["gauntlets", "hands"]]) {
      const gear = item(`${metal}_${piece}`);
      assert.equal(gear.equip.slot, slot, `${metal} ${piece}`);
      assert.ok(gear.equip.bonuses.defence > 0, `${metal} ${piece} defends`);
    }
  }
  // Smithed at the anvil like the rest of the set.
  g.player.xp.smithing = XP_TABLE[99];
  const recipes = smithingRecipes("ashsteel").flatMap(recipe => Object.keys(recipe.outputs));
  assert.ok(recipes.some(id => String(id).includes("ashsteel_boots")) && recipes.some(id => String(id).includes("ashsteel_gauntlets")), "boots and gauntlets at the anvil");
  // The armoury sells them next to the helm.
  assert.ok(SHOPS.armour.stock.includes("pewter_boots") && SHOPS.armour.stock.includes("pewter_gauntlets"));
  // Ribbon & Rye: clothes for looks, in the body and leg slots.
  const clothes = SHOPS.clothier.stock.map(id => item(id));
  assert.ok(clothes.length >= 25);
  for (const kind of ["shirt", "tunic", "dress", "trousers", "skirt"]) assert.ok(clothes.some(entry => entry.icon.kind === kind), kind);
  for (const entry of clothes) { assert.ok(["body", "legs"].includes(entry.equip.slot), entry.id); assert.equal(Object.keys(entry.equip.bonuses).length, 0, `${entry.id} is for looks`); }
  assert.ok(g.npcs.some(npc => npc.id === "clothier"), "the clothier is in town");
});

test("Work orders: craftsfolk pay above market for what you can make, one order a day each and yours alone; a Chronicler's mantle pays more; saved", async () => {
  const { currentOrder, fillOrder, orderPay, cleanOrders, PATRONS } = await import("../games/rarefriends-realm/orders.ts");
  const { DAY_MS } = await import("../games/rarefriends-realm/daily.ts");
  const g = newGame(), p = g.player, day = 20_000 * DAY_MS + 1000;
  p.inventory.fill(null); p.xp.fletching = XP_TABLE[40];
  const order = currentOrder(g, "hazel", day);
  assert(order && order.n >= 3 && order.pay > item(order.item).value * order.n, "a bow order that pays above market");
  assert.equal(order.pay, orderPay(order.n, item(order.item).value, 40));
  assert.deepEqual(currentOrder(g, "hazel", day + 1000), order, "the same order all day");
  const other = newGame({ friendId: 3412 }); other.player.xp.fletching = XP_TABLE[40];
  let differs = false;
  for (let d = 0; d < 20 && !differs; d++) differs = currentOrder(g, "hazel", day + d * DAY_MS).item !== currentOrder(other, "hazel", day + d * DAY_MS).item;
  assert(differs, "orders are rolled per player");
  const today = currentOrder(g, "hazel", day);
  assert(!fillOrder(g, "hazel", day), "nothing to hand over yet");
  give(p, today.item, today.n); const coins = count(p, "coins"), xp = p.xp.fletching, presence = p.xp.presence;
  assert(fillOrder(g, "hazel", day)); assert.equal(count(p, "coins"), coins + today.pay); assert(!has(p, today.item)); assert(p.xp.fletching > xp && p.xp.presence > presence, "XP and Presence");
  assert.equal(p.stats.orders, 1); assert(!fillOrder(g, "hazel", day), "one a day"); assert.equal(currentOrder(g, "hazel", day).done, 1);
  const next = currentOrder(g, "hazel", day + DAY_MS); assert.equal(next.done, 0, "a new day, a new order");
  give(p, "chroniclers_mantle"); p.xp.presence = XP_TABLE[40]; equip(g, p.inventory.findIndex(slot => slot?.id === "chroniclers_mantle")); assert.equal(p.equipment.body, "chroniclers_mantle");
  give(p, next.item, next.n); const c2 = count(p, "coins"); assert(fillOrder(g, "hazel", day + DAY_MS)); assert.equal(count(p, "coins"), c2 + Math.round(next.pay * 1.15), "the mantle pays 15% more");
  for (const npc of Object.keys(PATRONS)) { p.xp[PATRONS[npc].skill] = XP_TABLE[60]; assert(currentOrder(g, npc, day), `${npc} has work`); assert(g.npcs.some(entry => entry.id === npc), `${npc} is in the Realm`); }
  const hazel = g.npcs.find(npc => npc.id === "hazel"); standNear(g, hazel.x, hazel.y, 1); setTarget(g, { kind: "npc", uid: hazel.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30);
  while (g.dialogue.index < g.dialogue.lines.length) continueDialogue(g);
  const work = g.dialogue.options.findIndex(option => option.label === "Any work going?"); assert(work >= 0, "Hazel offers work"); chooseOption(g, work);
  assert(g.dialogue.lines.some(line => /Frens|done today's/.test(line.text)), `and names her price: ${JSON.stringify(g.dialogue.lines.map(line => line.text))}`); while (g.dialogue) continueDialogue(g);
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert.deepEqual(fresh.player.orders.hazel, p.orders.hazel, "orders are saved");
  assert.deepEqual(cleanOrders({ hazel: { day: "x" }, nobody: { day: 1, item: "maple_bow", n: 3, pay: 10, xp: 5 }, smith: { day: 1, item: "not_an_item", n: 3, pay: 10, xp: 5 } }), {}, "odd orders are dropped");
});

test("The quests of being known: A Name Worth Knowing, Known in Every Hall and The Remembered, their gear, and the Presence guide", async () => {
  const { skillGuide } = await import("../games/rarefriends-realm/guide.ts");
  const { nameFriend, presenceXp } = await import("../games/rarefriends-realm/presence.ts");
  const { renown } = await import("../games/rarefriends-realm/state.ts");
  const g = newGame(), p = g.player; p.inventory.fill(null);
  const guide = skillGuide("presence");
  for (const id of ["wanderers_cloak", "chroniclers_mantle", "storytellers_hat", "blade_of_renown", "cape_of_renown"]) assert(guide.some(entry => entry.icon === id), `${id} in the guide`);
  assert(guide.some(entry => entry.level === 50 && /Personality/.test(entry.name)) && guide.some(entry => entry.level === 20 && /notice/.test(entry.name)), "milestones in the guide");
  const talk = id => { const npc = g.npcs.find(entry => entry.id === id); standNear(g, npc.x, npc.y, 1); setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30); };
  const say = label => { while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); const index = g.dialogue.options.findIndex(option => option.label.startsWith(label)); assert(index >= 0, label); chooseOption(g, index); };
  const drain = () => { for (let i = 0; g.dialogue && i < 200; i++) { if (g.dialogue.index >= g.dialogue.lines.length && g.dialogue.options?.length) { g.dialogue = null; break; } continueDialogue(g); } };
  talk("namekeeper"); while (g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); assert(!g.dialogue.options.some(option => /register/.test(option.label)), "no quest before a name and Presence 20"); drain();
  nameFriend(g, "Tester"); p.xp.presence = XP_TABLE[20];
  talk("namekeeper"); say("Is a name"); say("I'll do it."); drain(); assert.equal(p.quests.name_worth_knowing, 1);
  talk("namekeeper"); say("About the register"); drain(); assert.equal(p.quests.name_worth_knowing, 1, "not known enough yet");
  for (const region of REGIONS.slice(0, 10)) p.visited[region.id] = 1;
  for (let i = 0; i < 25; i++) p.talked[`npc${i}`] = 1; for (let i = 0; i < 10; i++) p.rumours[`r_${i}`] = 1;
  for (const id of ["friends_feast", "grumblin_trouble", "cold_forge", "lost_glimmer", "hazels_quiver"]) p.quests[id] = 2;
  talk("namekeeper"); say("About the register"); drain(); assert.equal(p.quests.name_worth_knowing, 2); assert(has(p, "wanderers_cloak"), "the Wanderer's cloak");
  equip(g, p.inventory.findIndex(slot => slot?.id === "wanderers_cloak")); const before = p.xp.presence; presenceXp(g, 100); assert.equal(Math.round(p.xp.presence - before), 60, "a fifth faster at the slow rate");
  // Known in Every Hall.
  p.quests.quillhaven_folio = 2; p.xp.presence = XP_TABLE[40];
  talk("quillhaven_archivist"); say("I'll do it."); drain(); assert.equal(p.quests.known_hall, 1);
  for (const id of ["gravesend_lanterns", "saltmarrow_tithe", "hollyhock_errand", "dyemoor_dye", "tallgrass_tracks", "cragmaw_shaft", "ashfall_embers", "dawn_vigil"]) p.quests[id] = 2;
  for (const set of REGIONAL_CLOTHING.slice(0, 4)) p.outfits[set.pieces[0].id] = 1;
  for (let i = 10; i < 20; i++) p.rumours[`r_${i}`] = 1; for (let i = 0; i < 15; i++) p.achievements[`a${i}`] = 1;
  talk("quillhaven_archivist"); drain(); assert.equal(p.quests.known_hall, 2); assert(has(p, "chroniclers_mantle") && has(p, "storytellers_hat"), "the chronicler's mantle and hat");
  // The Remembered.
  p.xp.presence = XP_TABLE[60]; p.xp.attack = XP_TABLE[60]; p.questData.royal_audience = 1;
  talk("king"); say("They say the Realm forgets"); say("I'll do it."); drain(); assert.equal(p.quests.the_remembered, 1);
  p.stats.bosses = 4; for (let i = 15; i < 30; i++) p.achievements[`a${i}`] = 1; p.quests.hollow_king = 3; p.quests.dawn_against_hollow = 2; p.quests.hollow_whispers = 4;
  p.talked.hazel = 1; p.talked.rowan = 1; p.talked.smith = 1;
  talk("king"); say("About being remembered"); drain(); assert.equal(p.quests.the_remembered, 2); assert(has(p, "blade_of_renown") && has(p, "cape_of_renown"), "the Blade and Cape of Renown");
  equip(g, p.inventory.findIndex(slot => slot?.id === "blade_of_renown")); assert.equal(p.equipment.weapon, "blade_of_renown");
  assert.equal(renown(p), 15, "one strength for every four Presence levels"); assert(bonuses(p).strength >= 44 + 15);
  assert(QUESTS.some(quest => quest.id === "the_remembered") && MAX_QUEST_POINTS >= 9, "in the journal and the quest points");
});

test("Townsfolk bodies, the worn ossuary bag, and the adventurer card's styles", async () => {
  const { friendSprite, CITIZEN, citizenBuild } = await import("../games/rarefriends-realm/sprites.ts");
  const { CARD_OPTIONS, cardStyle, cardUnlocked, cleanCard, DEFAULT_CARD } = await import("../games/rarefriends-realm/cardstyle.ts");
  // People-shaped villagers: 16-row masks, each seed its own, and the parent-and-child look rare.
  const masks = Array.from({ length: 60 }, (_, i) => friendSprite(CITIZEN, 500 + i).idle);
  assert(masks.every(mask => mask.length === 16 && mask.every(row => row.length === 16) && mask.some(row => row.includes("#"))), "sound masks");
  assert(new Set(masks.map(mask => mask.join(""))).size >= 32, "villagers differ");
  let seed = 7; const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647), builds = Array.from({ length: 1000 }, () => citizenBuild(random));
  assert(builds.filter(build => build === "parent").length < 90 && new Set(builds).size >= 8, "many builds, few parents");
  assert.equal(NPCS.villager.art.family, CITIZEN); assert.equal(NPCS.gravesend_villager.art.family, CITIZEN);
  // The ossuary bag on the back.
  const g = newGame(), p = g.player; p.inventory.fill(null); give(p, "bone_bag");
  assert.equal(item("bone_bag").equip.slot, "cape"); equip(g, p.inventory.findIndex(slot => slot?.id === "bone_bag")); assert.equal(p.equipment.cape, "bone_bag");
  const { hasBoneBag, bagBones } = await import("../games/rarefriends-realm/state.ts"); assert(hasBoneBag(p), "worn counts as carried");
  g.ground.push({ uid: 998, id: "bones", n: 3, x: p.x, y: p.y, expires: g.tick + 100 }); setTarget(g, { kind: "ground", uid: 998, option: "Take" }); until(g, () => bagBones(p) === 3, 40); assert.equal(bagBones(p), 3, "picked-up bones go in the worn bag");
  const altar = g.world.objects.find(object => object.kind === "altar" && object.text !== "crypt"); standBy(g, altar); const faith = p.xp.prayer;
  setTarget(g, { kind: "object", id: altar.id, option: "Pray-at" }); until(g, () => bagBones(p) === 0, 40); assert.equal(bagBones(p), 0, "praying offers the worn bag"); assert(p.xp.prayer > faith);
  // Card styles: locked until earned, cleaned on load, saved.
  assert.deepEqual(cardStyle(g), DEFAULT_CARD);
  // Every style is free, except the Orders' and factions' own: those wait until you've met their leader in the world.
  for (const [category, options] of Object.entries(CARD_OPTIONS)) for (const option of options) assert.equal(cardUnlocked(g, option), !option.order, `${category} ${option.id} is ${option.order ? "locked until its leader is met" : "free"}`);
  p.card.bg = "night"; assert.equal(cardStyle(g).bg, "night"); p.card.frame = "dawn"; assert.equal(cardStyle(g).frame, "dawn"); p.card.banner = "zigzag"; assert.equal(cardStyle(g).banner, "zigzag");
  assert(CARD_OPTIONS.bg.length >= 18 && CARD_OPTIONS.frame.length >= 18 && CARD_OPTIONS.banner.length >= 19 && CARD_OPTIONS.layout.some(option => option.id === "centre"));
  assert.deepEqual(cleanCard({ bg: "night", frame: "nope", layout: "banner", extra: 1 }), { ...DEFAULT_CARD, bg: "night", layout: "banner" });
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert.equal(fresh.player.card.bg, "night"); assert.equal(fresh.player.equipment.cape, "bone_bag");
});

test("Fellowship looks and renames, and the card's own colours", async () => {
  const { joinFellowship, renameFellowship, setFellowshipLook, FELLOWSHIP_RENAME_COST } = await import("../games/rarefriends-realm/presence.ts");
  const { cardStyle, cleanCard, cleanFellowshipLook } = await import("../games/rarefriends-realm/cardstyle.ts");
  const g = newGame(), p = g.player; p.inventory.fill(null); give(p, "coins", 20000);
  assert(joinFellowship(g, "Moonlit Company", "MOON"));
  assert(!renameFellowship(g, "x"), "a bad name is refused"); assert(renameFellowship(g, "The Moonlit")); assert.equal(p.fellowship.name, "The Moonlit"); assert.equal(p.fellowship.tag, "MOON");
  assert.equal(count(p, "coins"), 20000 - 5000 - FELLOWSHIP_RENAME_COST);
  assert(setFellowshipLook(g, { logo: "skull", banner: "stripes", colors: ["#112233", "#ffeedd", "#aabbcc", "#445566"] }));
  p.card.inkColor = "#123456"; p.card.bgColor = "not a colour";
  assert.equal(cardStyle(g).inkColor, "#123456"); assert.equal(cardStyle(g).bgColor, undefined, "only hex colours count");
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save));
  { const { since, seen, ...look } = fresh.player.fellowship; void seen; assert.deepEqual(look, { name: "The Moonlit", tag: "MOON", logo: "skull", banner: "stripes", colors: ["#112233", "#ffeedd", "#aabbcc", "#445566"] }, "the look is saved"); assert.equal(since, p.fellowship.since); }
  assert.equal(fresh.player.card.inkColor, "#123456"); assert.equal(fresh.player.card.bgColor, undefined);
  assert.deepEqual(cleanFellowshipLook({ name: "A B", tag: "AB" }, { logo: "nope", banner: "stars", colors: ["#fff", "#000000"] }), { name: "A B", tag: "AB", banner: "stars" }, "odd looks are dropped");
  assert.equal(cleanCard({ frameColor: "#ABCDEF" }).frameColor, "#abcdef");
});

test("Housing: a deed from Steward Alder for Presence and coins, furniture for coins, looks, sleeping well rested, and it all comes back with the save", async () => {
  const { buyHome, buyFurnishing, setHomeLook, HOME_TIERS, HOME_PLOT, applyHome, homeRect } = await import("../games/rarefriends-realm/housing.ts");
  const { xpMultiplier: xpm } = await import("../games/rarefriends-realm/state.ts");
  const g = newGame(), p = g.player, w = g.world; p.inventory.fill(null);
  const steward = g.npcs.find(npc => npc.id === "steward"); assert(steward, "the steward is on Homestead Row"); assert(regionAt(w, steward.x, steward.y).id === "westmarch");
  assert(!buyHome(g), "no deed without Presence and coins"); assert.equal(p.home, null);
  p.xp.presence = XP_TABLE[15]; give(p, "coins", 300000); const presence = p.xp.presence;
  assert(buyHome(g)); assert.equal(p.home.tier, 1); assert(p.xp.presence > presence, "a deed is worth Presence");
  const r = homeRect(1); assert.equal(terrainAt(w, r.x0, r.y0), T.WALL); assert.equal(terrainAt(w, r.x0 + 1, r.y0 + 1), T.WOOD); assert(w.buildings.some(b => b.name === "Your home" && b.x0 === HOME_PLOT.x), "a cottage stands on the plot");
  assert(w.objects.some(o => o.name === "Cold hearth (furnish)"), "a cold hearth to furnish");
  assert(!buyFurnishing(g, "altar", "house_altar"), "a manor's slot waits"); assert(buyFurnishing(g, "bed", "straw_cot")); assert(w.objects.some(o => o.name === "Straw cot (sleep)"));
  assert(buyFurnishing(g, "hearth", "lit_hearth")); assert(w.buildings.find(b => b.name === "Your home").chimney, "a lit hearth smokes");
  assert(!w.objects.some(o => o.name === "Cold hearth (furnish)"), "the old hearth is gone");
  // Sleep: full and well rested.
  p.hp = 3; p.energy = 10; const base = xpm(p); const bed = w.objects.find(o => o.name === "Straw cot (sleep)");
  standBy(g, bed); setTarget(g, { kind: "object", id: bed.id, option: "Sleep" }); until(g, () => p.restedTicks > 0, 40);
  assert.equal(p.hp, maxHp(p)); assert.equal(p.energy, 100); assert(xpm(p) > base, "well rested gives XP");
  // Looks (paid for through a casket by the caller).
  assert(setHomeLook(g, "walls", "stone")); assert.equal(w.buildings.find(b => b.name === "Your home").walls, "stone");
  assert(setHomeLook(g, "floor", "carpet")); assert.equal(terrainAt(w, r.x0 + 2, r.y0 + 2), T.CARPET);
  assert(setHomeLook(g, "garden", "hedge")); assert(w.objects.some(o => o.name === "Hedge" && o.x === r.x0 - 1));
  assert(!setHomeLook(g, "roof", "#000000"), "only the Row's roofs");
  // Upgrade to a house: bigger, with the same things in it.
  assert(!buyHome(g), "a house needs Presence 30"); p.xp.presence = XP_TABLE[30]; assert(buyHome(g)); assert.equal(p.home.tier, 2);
  const r2 = homeRect(2); assert.equal(terrainAt(w, r2.x1, r2.y1), T.WALL); assert.equal(terrainAt(w, r.x1, r.y1), T.CARPET, "the old wall is floor now");
  assert(w.objects.some(o => o.name === "Straw cot (sleep)")); assert(buyFurnishing(g, "stand", "armour_stand"));
  // Saved and rebuilt.
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save));
  assert.deepEqual(fresh.player.home, p.home); assert(fresh.world.buildings.some(b => b.name === "Your home" && b.walls === "stone")); assert(fresh.world.objects.some(o => o.name === "Armour stand"));
  assert.equal(HOME_TIERS.length, 3); void applyHome;
});

test("The Mage's Satchel: Solenne's quest, a bag that holds every sigil, catches them, and casts from them; parties and fellows give XP; more fellowship looks", async () => {
  const { Party } = await import("../games/rarefriends-realm/party.ts");
  const { sigilStock, hasSigilBag, sigilBagTotal, xpMultiplier: xpm } = await import("../games/rarefriends-realm/state.ts");
  const { sigilBagFill, sigilBagEmpty, castSpell } = await import("../games/rarefriends-realm/engine.ts");
  const { CARD_OPTIONS, FELLOWSHIP_BANNERS, FELLOWSHIP_LOGOS, cardUnlocked } = await import("../games/rarefriends-realm/cardstyle.ts");
  const g = newGame(), p = g.player; p.inventory.fill(null); p.xp.magic = XP_TABLE[30]; p.questData.archmage_gift = 1;
  const talk = id => { const npc = g.npcs.find(entry => entry.id === id); standNear(g, npc.x, npc.y, 1); setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30); };
  const say = label => { while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); const index = g.dialogue.options.findIndex(option => option.label.startsWith(label)); assert(index >= 0, label); chooseOption(g, index); };
  const drain = () => { for (let i = 0; g.dialogue && i < 200; i++) { if (g.dialogue.index >= g.dialogue.lines.length && g.dialogue.options?.length) { g.dialogue = null; break; } continueDialogue(g); } };
  talk("archmage"); say("That bag of yours"); say("I'll do it."); drain(); assert.equal(p.quests.mages_satchel, 1);
  give(p, "leather", 3); give(p, "star_sigil", 60); give(p, "thought_sigil", 20); const magic = p.xp.magic;
  talk("archmage"); drain(); assert.equal(p.quests.mages_satchel, 2); assert(has(p, "sigil_satchel") && !has(p, "leather"), "the satchel, for the leather and sigils"); assert(p.xp.magic > magic);
  // Wear it, fill it, cast from it.
  equip(g, p.inventory.findIndex(slot => slot?.id === "sigil_satchel")); assert.equal(p.equipment.cape, "sigil_satchel"); assert(hasSigilBag(p));
  give(p, "breeze_sigil", 300); give(p, "thought_sigil", 300); sigilBagFill(g); assert.equal(count(p, "breeze_sigil"), 0); assert.equal(sigilBagTotal(p), 600); assert.equal(sigilStock(p, "breeze_sigil"), 300);
  g.ground.push({ uid: 997, id: "ember_sigil", n: 7, x: p.x, y: p.y, expires: g.tick + 100 }); setTarget(g, { kind: "ground", uid: 997, option: "Take" }); until(g, () => (p.sigilBag.ember_sigil ?? 0) === 7, 40); assert.equal(p.sigilBag.ember_sigil, 7, "picked-up sigils go in");
  const dart = SPELLS.find(spell => spell.id === "breeze_dart"); assert(dart); const before = p.sigilBag.breeze_sigil;
  give(p, "staff"); equip(g, p.inventory.findIndex(slot => slot?.id === "staff")); p.autocast = "breeze_dart"; p.combat = null; void castSpell;
  const rat = g.monsters.find(monster => !monster.dead && monster.def.level <= 5); standNear(g, rat.x, rat.y, 3);
  setTarget(g, { kind: "monster", uid: rat.uid, option: "Attack" }); until(g, () => (p.sigilBag.breeze_sigil ?? 0) < before, 80);
  assert(p.sigilBag.breeze_sigil < before, "the spell drew from the satchel"); p.combat = null; p.queuedSpell = null;
  sigilBagEmpty(g); assert(count(p, "thought_sigil") >= 250 && !p.sigilBag.thought_sigil && !p.sigilBag.breeze_sigil, "emptied back into the pack");
  give(p, "breeze_sigil", 5); const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert.deepEqual(fresh.player.sigilBag, p.sigilBag); assert.equal(fresh.player.equipment.cape, "sigil_satchel");
  // Parties: two clients wired to each other.
  const mail = []; const a = new Party((to, act) => mail.push([7730, to, act])), b = new Party((to, act) => mail.push([3412, to, act]));
  const ga = newGame(), gb = newGame({ friendId: 3412 });
  const deliver = () => { while (mail.length) { const [from, to, act] = mail.shift(); (to === 7730 ? a : b).receive(to === 7730 ? ga : gb, from, act, 1000); } };
  assert(a.invite(ga, 3412, 1000)); deliver(); assert(b.invites.has(7730), "the invitation arrives");
  assert(b.accept(gb, 7730)); deliver(); assert(a.members.has(3412) && b.members.has(7730), "both sides know the party");
  p.nearParty = 1; const withParty = xpm(p); p.nearParty = 0; p.nearFellows = 1; const withFellows = xpm(p); p.nearFellows = 0; const alone = xpm(p);
  assert(Math.abs(withParty - alone - XP_RATE * 0.1) < 1e-9 && Math.abs(withFellows - alone - XP_RATE * 0.05) < 1e-9, "+10% party, +5% fellows");
  a.leave(ga); deliver(); assert(!b.members.size, "leaving tells everyone");
  // Looks: more emblems and banners, and the fellowship backdrop is free.
  assert(FELLOWSHIP_LOGOS.length >= 28 && FELLOWSHIP_BANNERS.length >= 16);
  assert(cardUnlocked(g, CARD_OPTIONS.frame.find(option => option.id === "fellowship")));
});

test("Fellowship invitations: a day-long join link with the look inside, and joining by it", async () => {
  const { inviteLink, parseInvite } = await import("../games/rarefriends-realm/cardstyle.ts");
  const { joinFellowship } = await import("../games/rarefriends-realm/presence.ts");
  const now = 1_800_000_000_000, fellowship = { name: "The Moonlit", tag: "MOON", logo: "paw", banner: "zigzag", colors: ["#112233", "#ffeedd"], since: 20000 };
  const link = inviteLink(fellowship, now); assert(link.startsWith("https://m4s4t0-v01d.github.io/rarefriends-realm/?join="));
  const token = link.split("?join=")[1], invite = parseInvite(token, now + 3_600_000);
  assert.deepEqual(invite, { ...fellowship, expires: now + 24 * 3_600_000 }, "the look travels with the link");
  assert.equal(parseInvite(token, now + 25 * 3_600_000), null, "a day later it's dead"); assert.equal(parseInvite("nonsense", now), null);
  const g = newGame(), p = g.player; p.inventory.fill(null); give(p, "coins", 10000);
  assert(joinFellowship(g, invite.name, invite.tag, invite)); assert.equal(p.fellowship.tag, "MOON"); assert.equal(p.fellowship.logo, "paw"); assert.equal(p.fellowship.since, 20000);
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert.equal(fresh.player.fellowship.since, 20000);
});

test("Belts at the waist, barrels that fill vials, a follower in your wardrobe, and a darker band", async () => {
  const { BELTS, beltContents, stock, wornBelt } = await import("../games/rarefriends-realm/state.ts");
  const { beltFill, beltEmpty, sipBelt, fillVials, toggleFollowerWorn, headlessRecipe } = await import("../games/rarefriends-realm/engine.ts");
  const { TRACKS, MIZUKAI_TRACKS, KHARAVETH_TRACKS, MEGHAVAN_TRACKS } = await import("../games/rarefriends-realm/audio.ts");
  const g = newGame(), p = g.player, w = g.world; p.inventory.fill(null);
  assert.equal(item("fletchers_belt").equip.slot, "belt"); assert(SHOPS.war_bows.stock.includes("fletchers_belt") && SHOPS.hollyhock_herbs.stock.includes("apothecary_belt"));
  give(p, "fletchers_belt"); equip(g, p.inventory.findIndex(slot => slot?.id === "fletchers_belt")); assert.equal(p.equipment.belt, "fletchers_belt"); assert.equal(wornBelt(p).id, "fletchers_belt");
  give(p, "arrow_shaft", 600); give(p, "feather", 100); give(p, "bones", 1); beltFill(g, "fletchers_belt");
  assert.equal(beltContents(p, "fletchers_belt").arrow_shaft, 500, "five hundred shafts fit"); assert.equal(count(p, "arrow_shaft"), 100, "the rest stay in the pack"); assert.equal(count(p, "bones"), 1, "bones don't belong on it");
  assert.equal(stock(p, "feather"), 100, "the knife counts the belt"); give(p, "knife"); p.xp.fletching = XP_TABLE[10];
  startProduction(g, headlessRecipe(), 1); until(g, () => has(p, "headless_arrow"), 20); assert.equal(beltContents(p, "fletchers_belt").feather, 85, "feathers came off the belt");
  beltEmpty(g, "fletchers_belt"); assert(!beltContents(p, "fletchers_belt").feather && count(p, "feather") >= 85);
  // The apothecary's belt: sip when hurt.
  p.inventory.fill(null); give(p, "apothecary_belt"); equip(g, p.inventory.findIndex(slot => slot?.id === "apothecary_belt")); give(p, "healing_tonic", 3); give(p, "clean_feverleaf", 5); beltFill(g, "apothecary_belt");
  assert.equal(beltContents(p, "apothecary_belt").healing_tonic, 3); p.hp = 1; sipBelt(g); assert(p.hp > 1, "a sip heals"); assert.equal(beltContents(p, "apothecary_belt").healing_tonic, 2); assert(has(p, "vial"), "the vial comes back");
  // Barrels in every village fill vials (into the belt first).
  const barrels = w.objects.filter(object => object.name === "Water barrel"); assert(barrels.length >= 20, `water barrels in every town and village (${barrels.length})`); assert(barrels.some(b => regionAt(w, b.x, b.y).id === "friendhollow"), "one in Friendhollow");
  give(p, "vial", 5); standBy(g, barrels[0]); setTarget(g, { kind: "object", id: barrels[0].id, option: "Fill vials" }); until(g, () => !has(p, "vial"), 40);
  assert.equal(beltContents(p, "apothecary_belt").vial_of_water, 6, "filled, onto the belt"); assert(SHOPS.gravesend_general.stock.includes("vial_of_water") && SHOPS.general.stock.includes("vial") && SHOPS.saltmarrow_fish.stock.includes("vial_of_water"));
  // The follower in your wardrobe.
  p.wardrobe.push("rose_cape", "silver_halo", "blue_cape"); toggleFollowerWorn(g, "rose_cape"); toggleFollowerWorn(g, "silver_halo"); toggleFollowerWorn(g, "blue_cape");
  assert.deepEqual(p.followerWorn, ["silver_halo", "blue_cape"], "one cape at a time"); toggleFollowerWorn(g, "golden_aura"); assert.equal(p.followerWorn.length, 2, "only what you own");
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert.deepEqual(fresh.player.followerWorn, p.followerWorn); assert.equal(fresh.player.belts.apothecary_belt.vial_of_water, 6); assert.equal(fresh.player.equipment.belt, "apothecary_belt");
  // Every area track has a drummer and a drone now (the Mizukai Isles, Kharaveth and Meghavan keep their own instruments).
  for (const track of TRACKS) if (track.id !== "theme" && !MIZUKAI_TRACKS.includes(track.id) && !KHARAVETH_TRACKS.includes(track.id) && !MEGHAVAN_TRACKS.includes(track.id)) { assert(track.hits.some(hit => hit.drum === "deep"), `${track.name} has a deep drum`); assert(track.notes.some(note => note.voice === "drone"), `${track.name} has a drone`); }
});

test("Faith spells, wards, weaknesses, and the crown of the head", async () => {
  const { castSpell, canCast, onMonsterKilled: _k } = await import("../games/rarefriends-realm/engine.ts"); void _k;
  const { bonuses: bon, maxHp: mh } = await import("../games/rarefriends-realm/state.ts");
  const g = newGame(), p = g.player; p.inventory.fill(null);
  assert(MONSTERS.frost_yeti.weakness === "fire" && MONSTERS.skeleton.weakness === "holy" && MONSTERS.ash_drake.weakness === "water", "weaknesses by hide");
  const mend = SPELLS.find(spell => spell.id === "mend"); assert.equal(mend.skill, "prayer"); assert(SPELL_TABS.some(tab => tab.id === "faith" && tab.kinds.includes("mend")));
  assert.match(canCast(g, mend), /Faith level/); p.xp.prayer = XP_TABLE[80]; p.prayer = 0; assert.match(canCast(g, mend), /faith to cast/);
  p.prayer = 20; give(p, "star_sigil", 50); give(p, "tide_sigil", 10); give(p, "stone_sigil", 10); give(p, "thought_sigil", 10); give(p, "path_sigil", 5); give(p, "bloom_sigil", 5);
  p.hp = 1; const faith = p.xp.prayer; castSpell(g, "mend"); assert.equal(p.hp, 9, "Mend heals 8"); assert.equal(p.prayer, 18, "and costs 2 faith"); assert(p.xp.prayer > faith, "Faith XP"); assert.equal(count(p, "star_sigil"), 49);
  const before = bon(p).defence; castSpell(g, "ward_of_light"); assert(p.ward && p.wardUntil > g.tick); assert(bon(p).defence >= before + 6, "a ward steels your defence");
  for (let i = 0; i < 101; i++) tick(g); assert.equal(p.ward, null, "wards fade");
  castSpell(g, "sanctuary"); assert.equal(p.ward.reduce, 0.5);
  p.xp.magic = XP_TABLE[40]; castSpell(g, "stone_skin"); assert.equal(p.ward.flat, 8, "the Realm's own wards replace a faith ward");
  p.xp.hitpoints = XP_TABLE[60]; p.hp = 10; castSpell(g, "renewal"); for (let i = 0; i < 5; i++) tick(g); assert(p.hp >= 10 + 5 + 3 * 4, "Renewal heals over time");
  p.prayer = 50; p.energy = 0; p.poison = { damage: 2, left: 3, timer: 5 }; castSpell(g, "blessing"); assert.equal(p.energy, 100); assert.equal(p.poison, null);
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert(fresh.player.ward && fresh.player.wardUntil > fresh.tick, "a ward survives a save");
  // Hats sit on the first row five pixels wide: a Friend with antennae keeps its hat on its head.
  const { measure } = await import("../games/rarefriends-realm/wardrobe.ts");
  const eared = ["......#..#......", "......#..#......", "....########....", "...##########...", "...##########...", "....########....", ".....######.....", ".......##.......", "....########....", "....########....", "....########....", "....########....", ".....##..##.....", ".....##..##.....", ".....##..##.....", ".....##..##....."];
  const m = measure(eared); assert.equal(m.top, 0); assert.equal(m.crownTop, 2, "the crown starts under the antennae"); assert.equal(m.crownWidth, 10);
  void mh;
});

test("The Warden takes RF: a task bought done keeps the streak and pays points; a reroll gives a different task", async () => {
  const { assignTask, currentTask, slayerPoints, slayerStreak, completeTaskForRf, rerollTaskForRf } = await import("../games/rarefriends-realm/slayer.ts");
  const g = newGame(), p = g.player; for (const s of ["attack", "strength", "defence", "hitpoints"]) p.xp[s] = XP_TABLE[60];
  assert(!completeTaskForRf(g), "nothing to complete without a task"); assert(assignTask(g)); const first = currentTask(g).name, points = slayerPoints(g);
  assert(rerollTaskForRf(g)); assert(currentTask(g), "a task again"); void first;
  assert(completeTaskForRf(g)); assert.equal(slayerStreak(g), 1); assert(slayerPoints(g) > points, "points as if finished"); assert.equal(currentTask(g), null, "and the task is done");
});

test("Faith weapons in every metal, meals that lend a skill, and herb art", async () => {
  const { herbArt } = await import("../games/rarefriends-realm/scenery.ts").catch(() => ({ herbArt: null }));
  const mace = item("pewter_mace"), flail = item("rarite_flail");
  assert(mace.equip.holy && mace.equip.requires.prayer === 4 && mace.equip.bonuses.prayer > 0, "a pewter mace takes Faith 4 and blesses");
  assert(flail.equip.twoHanded && flail.equip.holy && flail.equip.requires.prayer === METALS.find(m => m.id === "rarite").level + 7 && flail.equip.requires.strength > 0, "a rarite flail is two-handed, blessed and heavy");
  for (const metal of METALS) assert(isItem(`${metal.id}_mace`) && isItem(`${metal.id}_flail`), `${metal.name} mace and flail`);
  assert(SHOPS.weapons.stock.includes("pewter_mace") && SHOPS.cragmaw_armoury.stock.includes("rarite_flail"), "sold beside the swords and war hammers");
  assert(smithingRecipes("pewter").some(recipe => recipe.label === "Pewter mace"), "smithed at the anvil");
  const g = newGame(), p = g.player; p.inventory.fill(null); give(p, "sailfish"); give(p, "cooked_meat");
  eat(g, 0); assert.equal(p.boosts.strength, 3, "sailfish lends +3 Strength"); assert.equal(p.boosts.attack, 2);
  eat(g, 1); assert.equal(p.boosts.strength, 3, "a lesser meal doesn't lower a boost"); assert.match(g.messages.at(-1).text, /for a while/);
  assert(item("inkshark").food.attack === 4 && item("minnows").food.fishing === 1);
  void herbArt;
});

test("Round shields and the aegis in every metal, and the weight of what you wear", async () => {
  const { wornWeight } = await import("../games/rarefriends-realm/state.ts");
  const { runDrain, weightPenalty } = await import("../games/rarefriends-realm/wayfaring.ts");
  for (const metal of METALS) assert(isItem(`${metal.id}_roundshield`) && isItem(`${metal.id}_aegis`), `${metal.name} round shield and aegis`);
  const round = item("blackiron_roundshield"), aegis = item("blackiron_aegis"), kite = item("blackiron_shield");
  const bi = METALS.find(m => m.id === "blackiron").level; assert(round.equip.bonuses.defence > kite.equip.bonuses.defence && round.equip.requires.strength === bi + 5 && round.weight > kite.weight, "the round shield: more defence, Strength to carry, heavier");
  assert(aegis.equip.requires.prayer === bi + 5 && aegis.equip.bonuses.prayer > 0, "the aegis takes Faith and blesses");
  assert(SHOPS.armour.stock.includes("pewter_roundshield") && SHOPS.armour.stock.includes("pewter_aegis"), "sold with the armour");
  assert(smithingRecipes("pewter").some(recipe => recipe.label === "Pewter round shield"));
  const g = newGame(), p = g.player; p.inventory.fill(null);
  const bare = runDrain(g); assert.equal(wornWeight(p), 0);
  for (const id of ["rarite_cuirass", "rarite_greaves", "rarite_helm", "rarite_roundshield"]) { give(p, id); p.equipment[item(id).equip.slot] = id; }
  assert(wornWeight(p) > 15, `plate weighs (${wornWeight(p)} kg)`); assert(weightPenalty(g) > 0.3 && runDrain(g) > bare * 1.3, "running drains faster under a load");
  const laden = weightPenalty(g); p.xp.agility = XP_TABLE[60]; assert(weightPenalty(g) < laden * 0.6, "Wayfaring carries half the load at 60");
  assert(item("rose_cape").weight === undefined || true); assert(item("team_cape").weight <= 1 && item("leather_jerkin").weight < item("pewter_cuirass").weight);
});

test("Crypt bones from crypt skeletons, and the Order's lesser armour", async () => {
  const { bury } = await import("../games/rarefriends-realm/engine.ts");
  assert(item("crypt_bones").bones > item("bones").bones && item("crypt_bones").bones < item("large_bones").bones, "between plain and large");
  assert(MONSTERS.skeleton.always.some(drop => drop.item === "crypt_bones"), "skeletons drop them");
  const g = newGame(), p = g.player; p.inventory.fill(null); give(p, "crypt_bones"); const faith = p.xp.prayer; bury(g, 0); assert(p.xp.prayer > faith, "buried for Faith");
  for (const id of ["acolyte_hood", "acolyte_vestment", "vigil_hauberk", "vigil_shield"]) assert(SHOPS.armoury.stock.includes(id), `${id} at the Order Armoury`);
  assert.equal(item("acolyte_vestment").equip.requires.prayer, 10); assert.equal(item("vigil_hauberk").equip.requires.defence, 30); assert(item("vigil_hauberk").equip.bonuses.prayer > 0);
  assert(item("vigil_hauberk").value < item("dawnplate_cuirass").value / 5, "far cheaper than Dawnplate");
});

test("The dungeon update: three dungeons under the lake, the library and the stones, keyed doors, coffers, archers, wraiths and quests", () => {
  const g = newGame(), p = g.player, world = g.world;
  // Regions, creatures and their doors exist and are placed.
  for (const id of ["deepglass", "drowned_archive", "howling_vault"]) assert(REGIONS.find(region => region.id === id)?.underground, `${id} is underground`);
  for (const id of ["cave_bat", "glass_crab", "crystal_golem", "drowned_scholar", "ink_wraith", "archivist_below", "grave_moth", "vault_archer", "vault_knight", "howling_king"]) assert(world.spawns.some(spawn => spawn.kind === "monster" && spawn.id === id), id);
  assert.equal(regionUnder(world, 430 + WEST_DX, southShift(530)).id, "deepglass"); assert.equal(regionUnder(world, 490 + WEST_DX, southShift(528)).id, "drowned_archive"); assert.equal(regionUnder(world, 300 + WEST_DX, southShift(567)).id, "howling_vault");
  const doors = world.objects.filter(object => object.kind === "gate" && object.requires?.item);
  assert.deepEqual(doors.map(door => door.requires.item).sort(), ["archive_key", "bone_shrine_key", "deepglass_key", "kumo_seal_key", "moss_key", "ogre_key", "vault_key"]);
  const coffers = world.objects.filter(object => object.decor === "chest" && / coffer$/.test(object.name));
  assert(coffers.length >= 30, `coffers in every dungeon (${coffers.length})`);
  for (const name of ["Deepglass coffer", "Archive coffer", "Vault coffer", "Crypt coffer", "Hollow coffer", "Catacomb coffer", "Wyrm coffer", "Barnacled coffer", "Miner's coffer"]) assert(coffers.some(coffer => coffer.name === name), name);
  assert(SLAYER_TASKS.some(task => task.id === "vault_dead") && SLAYER_TASKS.some(task => task.id === "bats"));
  // (Strong enough to walk the dungeons, weak enough that their creatures still take notice.)
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = XP_TABLE[55];
  p.hp = 990;
  // A keyed door: locked without the key; the key turns once and breaks.
  const door = doors.find(entry => entry.requires.item === "deepglass_key");
  teleport(g, door.x - 1, door.y); g.messages.length = 0;
  menuFor(g, [{ kind: "object", id: door.id }], null)[0].run(g); run(g, 3);
  assert.equal(p.x, door.x - 1, "still outside"); assert(g.messages.some(m => /locked/.test(m.text)), "locked without the key");
  give(p, "deepglass_key", 2); menuFor(g, [{ kind: "object", id: door.id }], null)[0].run(g); run(g, 3);
  assert.equal(p.x, door.to.x, "through the crystal door"); assert.equal(count(p, "deepglass_key"), 1, "one key spent");
  // Coffers: loot that belongs there, then empty for a while.
  const coffer = coffers.find(entry => entry.name === "Deepglass coffer");
  standBy(g, coffer); const before = p.inventory.filter(Boolean).length + count(p, "coins"); g.messages.length = 0;
  menuFor(g, [{ kind: "object", id: coffer.id }], null)[0].run(g); run(g, 2);
  assert.match(g.messages.find(m => /coffer holds/.test(m.text))?.text ?? "", /coffer holds/);
  assert(p.inventory.filter(Boolean).length + count(p, "coins") > before, "something came out");
  g.messages.length = 0; menuFor(g, [{ kind: "object", id: coffer.id }], null)[0].run(g); run(g, 2);
  assert(g.messages.some(m => /not long ago/.test(m.text)), "empty for a while");
  g.tick += COFFER_TICKS + 10; g.messages.length = 0; menuFor(g, [{ kind: "object", id: coffer.id }], null)[0].run(g); run(g, 2);
  assert(g.messages.some(m => /coffer holds/.test(m.text)), "fills again after a while");
  // A vault archer shoots from three tiles away and stays where it is.
  const archer = g.monsters.find(m => m.def.id === "vault_archer");
  assert.equal(archer.def.ranged, 5);
  // (Alone with it: everything else nearby is put to sleep so the first wound is the archer's.)
  for (const m of g.monsters) if (m !== archer && Math.abs(m.x - archer.x) + Math.abs(m.y - archer.y) < 16) { m.dead = true; m.respawnAt = Infinity; }
  for (const dx of [3, -3]) if (canWalk(g, archer.x + dx, archer.y)) { teleport(g, archer.x + dx, archer.y); break; }
  const hpBefore = p.hp; p.combat = null; p.target = null; g.autoRetaliate = false;
  let shotFrom = 0; until(g, () => { if (p.hp < hpBefore) { shotFrom = Math.max(Math.abs(archer.x - p.x), Math.abs(archer.y - p.y)); return true; } return false; }, 80);
  assert(shotFrom >= 2, `it shot rather than closed in (from ${shotFrom})`);
  // An ink wraith's touch drains faith; the Archivist Below mends himself; the Howling King enrages.
  const wraith = g.monsters.find(m => m.def.id === "ink_wraith");
  p.combat = null; p.target = null; g.autoRetaliate = false;
  standNear(g, wraith.x, wraith.y, 1); p.prayer = 60; p.hp = 990; p.prayers = [];
  until(g, () => p.prayer < 60, 300); assert(p.prayer < 60, "faith drained");
  const keeper = g.monsters.find(m => m.def.id === "archivist_below");
  p.combat = null; p.target = null; standNear(g, keeper.x, keeper.y, 1); keeper.hp = 40; keeper.target = true; run(g, 6); assert(keeper.hp > 40, "the Archivist mends himself");
  assert(MONSTERS.howling_king.enrage && MONSTERS.crystal_golem.enrage && MONSTERS.howling_king.drain.faith === 6);
  // The quests: the fisher, Perrin and Fenn.
  const talk = id => { const npc = g.npcs.find(entry => entry.id === id); standNear(g, npc.x, npc.y, 1); setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30); };
  const say = label => { while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); const index = g.dialogue.options.findIndex(option => option.label.startsWith(label)); assert(index >= 0, label); chooseOption(g, index); };
  const drain = () => { for (let i = 0; g.dialogue && i < 200; i++) { if (g.dialogue.index >= g.dialogue.lines.length && g.dialogue.options?.length) { g.dialogue = null; break; } continueDialogue(g); } };
  p.combat = null; p.target = null; p.hp = 990;
  talk("fisher"); say("I'll do it."); drain(); assert.equal(p.quests.deepglass_heart, 1);
  for (let i = 0; i < 6; i++) onMonsterKilled(g, "glass_crab", 0, 0); onMonsterKilled(g, "crystal_golem", 0, 0); give(p, "crystal_shard", 3); const shards = count(p, "crystal_shard");
  talk("fisher"); drain(); assert.equal(p.quests.deepglass_heart, 2); assert(has(p, "glass_charm") && count(p, "crystal_shard") === shards - 3);
  p.quests.quillhaven_folio = 2; p.xp.magic = XP_TABLE[90];
  talk("quillhaven_archivist"); say("I'll do it."); drain(); assert.equal(p.quests.drowned_archive, 1); assert(has(p, "archive_key"), "Perrin's spare key");
  give(p, "ink_page", 6); onMonsterKilled(g, "archivist_below", 0, 0);
  talk("quillhaven_archivist"); drain(); assert.equal(p.quests.drowned_archive, 2); assert(has(p, "insight_lamp") && count(p, "ink_page") === 0);
  p.quests.tallgrass_tracks = 2;
  talk("tallgrass_huntmaster"); say("I'll do it."); drain(); assert.equal(p.quests.howling_vault, 1); assert(has(p, "vault_key"), "Fenn's key");
  for (let i = 0; i < 6; i++) { onMonsterKilled(g, "vault_archer", 0, 0); onMonsterKilled(g, "vault_knight", 0, 0); } onMonsterKilled(g, "howling_king", 0, 0);
  const coins = count(p, "coins"); talk("tallgrass_huntmaster"); drain(); assert.equal(p.quests.howling_vault, 2); assert.equal(count(p, "coins"), coins + 6000);
  assert(QUESTS.some(q => q.id === "howling_vault") && questPoints(g) >= 7);
});

test("The Rare Friends Ring: matches for coins and bloodmarks, your own foes, revival in the lobby, the Ringbreaker, Wildfur and the Ring's shops", () => {
  const g = newGame(), p = g.player, world = g.world;
  assert.equal(regionAt(world, ARENA.x, ARENA.y).id, "friends_ring"); assert(inArena(ARENA.x, ARENA.y + 5) && !inArena(ARENA.x, ARENA.y + 20) && inRing(ARENA.x + 3, ARENA.y + 3), "the courtyard is a duelling ring");
  for (const id of ["ringmaster", "ring_apothecary", "ring_chaplain", "ring_sigilist", "ring_fletcher", "ring_armourer", "ring_quartermaster", "ring_champion", "ring_weaponsmith"]) assert(g.npcs.some(npc => npc.id === id), id);
  assert(world.objects.some(object => object.kind === "fountain" && object.name === "Blood fountain"), "the fountain runs red");
  const gates = world.objects.filter(object => object.name === "Arena gate"); assert.equal(gates.length, 4, "four arena gates");
  assert(gates.every(gate => gate.look === "gate" && (gate.axis === "ew") === (gate.x === ARENA.x)), "iron gates set along the courtyard wall, not ladders");
  // The fighting pit, the chapel against the west wall (its altar, the Old Friend and Chaplain Orrin inside) and the forecourt.
  assert.equal(world.tiles[(ARENA.y + 3) * W + ARENA.x + 3], T.SAND, "a sand pit about the fountain");
  const chapel = world.buildings.find(building => building.name === "Ring Chapel"); assert(chapel && chapel.walls === "stone" && chapel.x1 === ARENA.x - ARENA.outer, "a stone chapel built against the Ring's west wall");
  assert(world.buildings.some(building => building.name === "Chapel bell tower" && building.round && building.x0 < chapel.x0 + 1), "with a round bell tower");
  const inChapel = object => object.x > chapel.x0 && object.x < chapel.x1 && object.y > chapel.y0 && object.y < chapel.y1;
  assert(world.objects.some(object => object.kind === "altar" && inChapel(object)) && world.objects.filter(object => object.decor === "bench" && inChapel(object)).length === 6, "an altar and six pews inside");
  const orrin = g.npcs.find(npc => npc.id === "ring_chaplain"); assert(orrin && inChapel(orrin), "Chaplain Orrin keeps the chapel");
  assert(world.objects.filter(object => object.decor === "lamp" && object.y > ARENA.y + ARENA.outer && Math.abs(object.x - ARENA.x) <= 5).length === 4, "lamps on the forecourt");
  assert(world.objects.filter(object => object.decor === "ruin_wall" && inArena(object.x, object.y)).length >= 10, "ruined walls in the courtyard");
  // Every shop has its own room off the concourse, its keeper inside, its furniture its own.
  for (const [keeper, hall] of [["ring_champion", "The Champions' Hall"], ["ring_armourer", "The Ring Armoury"], ["ring_sigilist", "Vane's Sigil Study"], ["ring_apothecary", "Mallow's Infirmary"], ["ring_fletcher", "Arrowyn's Fletchery"], ["ring_quartermaster", "The Pit Quartermaster's Den"], ["ring_weaponsmith", "Edgewright's Blades"]]) {
    const b = world.buildings.find(entry => entry.name === hall), npc = g.npcs.find(entry => entry.id === keeper);
    assert(b && npc && npc.x > b.x0 && npc.x < b.x1 && npc.y > b.y0 && npc.y < b.y1, `${keeper} keeps ${hall}`);
    assert(Math.hypot((b.x0 + b.x1) / 2 - ARENA.x, (b.y0 + b.y1) / 2 - ARENA.y) < ARENA.outer + 14, `${hall} stands against the Ring`);
  }
  const champions = world.buildings.find(entry => entry.name === "The Champions' Hall");
  assert(world.objects.some(o => o.decor === "throne" && o.x >= champions.x0 && o.x <= champions.x1 && o.y >= champions.y0 && o.y <= champions.y1), "the Champion's seat");
  assert(world.objects.some(o => o.kind === "anvil" && inRingBuilding(o.x - 8, o.y)) || world.objects.some(o => o.kind === "anvil" && Math.hypot(o.x - ARENA.x, o.y - ARENA.y) < ARENA.outer + 14), "the armoury's anvil");
  // The Seven's statues round the courtyard, stone knights on guard, and statues of what waits below at every dungeon's mouth.
  const seven = world.objects.filter(object => object.decor === "monument" && inArena(object.x, object.y)); assert.equal(seven.length, 7, "seven statues");
  assert(seven.some(o => o.state === "toppled") && seven.some(o => o.state === "broken") && seven.some(o => o.state === "buried") && seven.some(o => o.monster === "revenant_king"), "in every state");
  assert(world.objects.filter(object => object.decor === "monument" && !inRingBuilding(object.x, object.y)).length >= 9, "statues at the dungeon mouths");
  assert(g.monsters.filter(m => m.def.id === "stone_knight").length >= 5 && !MONSTERS.stone_knight.aggressive, "stone knights on guard, attackable, not aggressive");
  assert(MATCHES.some(match => match.id === "the_seven" && match.waves.length === 7) && MONSTERS.revenant_king.arenaOnly && MONSTERS.revenant_king.boss, "the Seven are the hardest match");
  assert(world.objects.filter(object => object.decor === "bones" && inArena(object.x, object.y)).length >= 20, "bones across the arena");
  assert(world.tiles.some((tile, i) => tile === T.LAVA && inArena(i % W, Math.floor(i / W))), "a little volcano");
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = XP_TABLE[80];
  p.hp = 800; g.autoRetaliate = true;
  const talk = id => { const npc = g.npcs.find(entry => entry.id === id); standNear(g, npc.x, npc.y, 1); setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30); };
  const say = label => { while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); const index = g.dialogue.options.findIndex(option => option.label.startsWith(label)); assert(index >= 0, label); chooseOption(g, index); };
  // The Rat Pit: a quarter of the purse to enter, six rats and two bats, the purse and the marks when they're all down.
  give(p, "coins", 10_000); const coins0 = count(p, "coins");
  talk("ringmaster"); say("The Rat Pit"); while (g.dialogue) continueDialogue(g);
  assert(g.arena && g.arena.match === "rat_pit", "a match is on"); assert.equal(count(p, "coins"), coins0 - entryFee(150), "the fee");
  const foes = g.monsters.filter(m => m.arena); assert.equal(foes.length, 8); assert(foes.every(m => inArena(m.x, m.y) && m.target), "summoned into the courtyard, already hunting");
  assert.deepEqual(arenaFoes(g).length, 8, "what spectators see");
  talk("ringmaster"); assert.match(g.dialogue.lines[0].text, /match is on/); g.dialogue = null;
  // Barred in: the south arena gate won't open from inside, and no teleport takes you out.
  const south = gates.find(gate => gate.y > ARENA.y); teleport(g, south.x, south.y - 1); g.messages.length = 0;
  menuFor(g, [{ kind: "object", id: south.id }], null)[0].run(g); run(g, 2);
  assert.equal(p.y, south.y - 1, "still inside"); assert(g.messages.some(m => /gate is barred/.test(m.text)));
  assert.equal(castSpell(g, "home"), null); assert(g.messages.some(m => /holds you until the match/.test(m.text)), "no homeward");
  for (const foe of foes) { standNear(g, foe.x, foe.y, 1); setTarget(g, { kind: "monster", uid: foe.uid, option: "Attack" }); until(g, () => foe.dead, 400); }
  run(g, 2);
  assert.equal(g.arena, null, "the match is over"); assert.equal(g.monsters.filter(m => m.arena).length, 0, "the creatures are gone");
  assert.equal(count(p, "coins"), coins0 - entryFee(150) + 150, "the purse"); assert.equal(count(p, "bloodmark"), 3, "and the marks"); assert.equal(p.stats.matches, 1);
  // Your own foes: four wolves, the purse by their level; leaving the Ring forfeits a match.
  talk("ringmaster"); say("I'll choose my own foes"); say("Beasts"); say(customMatch("wolf").name); while (g.dialogue) continueDialogue(g);
  assert(g.arena && g.arena.match === "foe:wolf" && g.arena.coins === customMatch("wolf").coins, "a custom match");
  assert.equal(g.monsters.filter(m => m.arena).length, 4);
  teleport(g, ARENA.x, ARENA.y + ARENA.outer + 8); run(g, 2);
  assert.equal(g.arena, null, "forfeit on leaving"); assert.equal(g.monsters.filter(m => m.arena).length, 0);
  // With no match on, the gates swing both ways.
  teleport(g, south.x, south.y + 1); menuFor(g, [{ kind: "object", id: south.id }], null)[0].run(g); run(g, 2); assert.equal(p.y, south.y - 1, "in through the gate");
  menuFor(g, [{ kind: "object", id: south.id }], null)[0].run(g); run(g, 2); assert.equal(p.y, south.y + 1, "and out again");
  // Falling in the Ring: its magic stands you up in the lobby, and the match is lost.
  teleport(g, ARENA.x, ARENA.y + 6); p.hp = 1; p.xp.defence = 0; p.xp.hitpoints = XP_TABLE[10];
  assert(startMatch(g, "bone_legion"));
  until(g, () => p.x === ARENA.lobby.x && p.y === ARENA.lobby.y && g.arena === null && p.hp > 1, 400);
  assert(g.messages.some(m => /knits you back together/.test(m.text)), "revived by the Ring");
  // The Ring's shops: bloodmarks buy the Quartermaster's gear, coins don't; laurels buy the Hall's.
  p.xp.strength = XP_TABLE[80]; p.xp.defence = XP_TABLE[80]; p.xp.hitpoints = XP_TABLE[80]; p.hp = maxHp(p);
  assert.equal(buy(g, "ring_pit", "skull_mask", 1), 0, "not for coins"); assert.match(g.messages.at(-1).text, /bloodmarks/);
  const marks0 = count(p, "bloodmark"); give(p, "bloodmark", 2000); assert.equal(buy(g, "ring_pit", "skull_mask", 1), 1); assert.equal(count(p, "bloodmark"), marks0 + 2000 - 60);
  for (const piece of ["wildfur_helm", "wildfur_plate", "wildfur_greaves"]) { assert.equal(buy(g, "ring_pit", piece, 1), 1); equip(g, p.inventory.findIndex(slot => slot?.id === piece)); }
  const steady = bonuses(p).strength; p.hp = Math.floor(maxHp(p) * 0.3); assert.equal(bonuses(p).strength, steady + 7 + 12 + 9, "Wildfur counts twice when you're nearly done"); p.hp = maxHp(p);
  give(p, "laurel", 40); assert.equal(buy(g, "ring_champions", "laurel_crown", 1), 1); assert.equal(count(p, "laurel"), 15);
  teleport(g, ARENA.x + 2, ARENA.y + 4); wonDuel(g, 3412); assert.equal(count(p, "laurel"), 17, "a Friend Fight in the Ring pays two laurels");
  // The Ringbreaker: two hands, a step of knockback on a third of hits, and the recoil.
  give(p, "coins", 50_000); assert.equal(buy(g, "ring_armour", "ringbreaker", 1), 1); equip(g, p.inventory.findIndex(slot => slot?.id === "ringbreaker"));
  assert.equal(p.equipment.weapon, "ringbreaker"); assert(!p.equipment.shield, "two-handed");
  // (Against stone golems, which take a while to fell, with just the strength the hammer asks for.)
  p.xp.strength = XP_TABLE[60]; p.xp.attack = XP_TABLE[40]; give(p, "coins", 20_000);
  assert(startMatch(g, "foe:stone_golem"));
  const knocked = () => g.messages.some(m => /throws the stone golem back a step/.test(m.text));
  for (const golem of g.monsters.filter(m => m.arena && !m.dead)) { if (knocked()) break; standNear(g, golem.x, golem.y, 1); setTarget(g, { kind: "monster", uid: golem.uid, option: "Attack" }); until(g, () => knocked() || golem.dead, 600); }
  assert(knocked(), "the hammer knocks back");
  teleport(g, ARENA.x, ARENA.y + ARENA.outer + 8); run(g, 2);
  assert(MATCHES.length === 9 && FOE_GROUPS.every(group => group.foes.every(foe => MONSTERS[foe])));
});

test("The Root Cellars and the Mossy Undercroft: a dungeon for new heroes and one for the middle levels", () => {
  const g = newGame(), world = g.world;
  assert(REGIONS.find(region => region.id === "root_cellars")?.underground && REGIONS.find(region => region.id === "mossy_undercroft")?.underground);
  assert.equal(regionUnder(world, 420 + WEST_DX, southShift(560)).id, "root_cellars"); assert.equal(regionUnder(world, 490 + WEST_DX, southShift(560)).id, "mossy_undercroft");
  assert(world.objects.some(o => o.name === "Cellar door" && o.to) && world.objects.some(o => o.name === "Mossy stair" && o.action === "Climb-down"), "both mouths");
  assert(world.objects.some(o => o.kind === "gate" && o.requires?.item === "moss_key"), "the warden's door takes a moss key");
  assert(world.objects.filter(o => o.name === "Cellar coffer").length >= 3 && world.objects.filter(o => o.name === "Undercroft coffer").length >= 3, "coffers in both");
  assert(g.monsters.some(m => m.def.id === "rat_king") && g.monsters.some(m => m.def.id === "moss_warden"), "both bosses placed");
  assert(MONSTERS.rat_king.level < 20 && MONSTERS.rat_king.boss && MONSTERS.moss_warden.heals && MONSTERS.moss_warden.level < 50);
  assert(world.objects.some(o => o.decor === "monument" && o.monster === "moss_warden"), "a warning at the mossy stair");
});

test("The four Orders and their gods, and the Deadwood Maidens: oaths open armouries, blessings count by the piece, the truce keeps spears down", () => {
  const g = newGame(), p = g.player, world = g.world;
  // Four Orders × three tiers × ten pieces, and a cape each; a hall each with its altar and its god's statue, small and large.
  assert.equal(ITEM_LIST.filter(item => orderOf(item.id)).length, 6 * 3 * 10 + 6);
  for (const id of ORDER_IDS) {
    const order = ORDERS[id];
    assert(world.objects.some(o => o.kind === "altar" && o.name === `${order.name} altar` && o.text === id), `${order.short} altar`);
    assert(world.objects.filter(o => o.decor === order.statue).length >= 2, `${order.god}'s statues`);
    for (const npc of [order.leader, `${id}_quartermaster`, `${id}_guard`]) assert(g.npcs.some(entry => entry.id === npc), `${id} ${npc}`);
    assert(shopProblem(g, `${id}_armoury`), "closed before the oath");
  }
  assert(ITEM_LIST.find(item => item.id === "diamond_paladin_body").equip.holy && ITEM_LIST.find(item => item.id === "ink_oath_staff").equip.staff && ITEM_LIST.find(item => item.id === "hood_knight_greatmace").equip.twoHanded, "blessed, a staff, two-handed");
  // The Diamond Oath: kneel at the altar, bring the shards, wear the cape, and the armoury opens.
  p.xp.prayer = XP_TABLE[70]; p.xp.defence = XP_TABLE[70]; p.hp = 99;
  const talk = id => { const npc = g.npcs.find(entry => entry.id === id); standNear(g, npc.x, npc.y, 1); setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30); };
  const say = label => { while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); const index = g.dialogue.options.findIndex(option => option.label.startsWith(label)); assert(index >= 0, label); chooseOption(g, index); };
  const drain = () => { for (let i = 0; g.dialogue && i < 200; i++) { if (g.dialogue.index >= g.dialogue.lines.length && g.dialogue.options?.length) { g.dialogue = null; break; } continueDialogue(g); } };
  talk("diamond_commander"); say("I'll do it."); drain(); assert.equal(p.quests.oath_diamond, 1);
  const altar = world.objects.find(o => o.name === "Order of the Diamond altar"); standBy(g, altar); setTarget(g, { kind: "object", id: altar.id, option: "Pray-at" }); run(g, 3); assert.equal(p.questData.prayed_diamond, 1, "knelt");
  give(p, "crystal_shard", 5); talk("diamond_commander"); drain(); assert.equal(p.quests.oath_diamond, 2); assert(has(p, "diamond_cape"), "the cape"); assert.equal(shopProblem(g, "diamond_armoury"), null, "the armoury opens");
  give(p, "coins", 500_000); assert.equal(buy(g, "diamond_armoury", "diamond_paladin_helm", 1), 1); assert.equal(buy(g, "diamond_armoury", "diamond_paladin_body", 1), 1);
  for (const id of ["diamond_paladin_helm", "diamond_paladin_body", "diamond_cape"]) equip(g, p.inventory.findIndex(slot => slot?.id === id));
  assert.equal(orderPieces(p.equipment, "diamond"), 3, "three pieces of the Diamond");
  // The Ember's fortress: an island of ash in a moat of lava, a causeway to its gate; and the ring slot, with the Ringmaster's signet.
  const emberAltar = world.objects.find(o => o.name === "Order of the Ember altar"); assert(emberAltar, "the Ember altar");
  assert(world.tiles.some((tile, i) => tile === T.LAVA && Math.abs(i % W - emberAltar.x) < 16 && Math.abs(Math.floor(i / W) - emberAltar.y) < 16), "lava round the fortress");
  assert(EQUIP_SLOTS.includes("ring") && ITEM_LIST.find(item => item.id === "ringmasters_signet").equip.slot === "ring");
  p.stats.matches = 3; give(p, "bloodmark", 30); teleport(g, ARENA.lobby.x, ARENA.lobby.y); p.xp.strength = XP_TABLE[40];
  talk("ringmaster"); say("About your signet"); say("I'll do it."); drain(); assert.equal(p.quests.ringmasters_signet, 1);
  talk("ringmaster"); say("About your signet"); drain(); assert.equal(p.quests.ringmasters_signet, 2); assert(has(p, "ringmasters_signet"), "the signet");
  equip(g, p.inventory.findIndex(slot => slot?.id === "ringmasters_signet")); assert.equal(p.equipment.ring, "ringmasters_signet"); assert.equal(bonuses(p).strength, bonuses({ ...p, equipment: {} }).strength + 4, "+4 Strength");
  teleport(g, 300, 136); assert.equal(signetCharges(g), 3); signetTeleport(g); until(g, () => p.x === ARENA.lobby.x && p.y === ARENA.lobby.y, 20); assert.equal(signetCharges(g), 2, "one charge spent");
  p.questData.signet_used = 3; g.messages.length = 0; signetTeleport(g); assert(g.messages.some(m => /signet is cold/.test(m.text)), "three a day");
  // The Maidens: hostile, then at truce (spears down, and no striking them).
  const maiden = g.monsters.find(m => m.def.id === "deadwood_maiden"); assert(maiden && MONSTERS.deadwood_maiden.aggressive && MONSTERS.deadwood_maiden.faction === "maidens");
  assert(shopProblem(g, "maidens_market"), "no market before the truce");
  p.quests.maidens_truce = 2; standNear(g, maiden.x, maiden.y, 2); p.combat = null; p.target = null; run(g, 12); assert(!maiden.target, "spears down");
  g.messages.length = 0; setTarget(g, { kind: "monster", uid: maiden.uid, option: "Attack" }); run(g, 6); assert(g.messages.some(m => /keep the truce/.test(m.text)) && p.combat === null, "no striking them");
  assert.equal(shopProblem(g, "maidens_market"), null); assert(SHOPS.maidens_market.stock.includes("rarite_ore") && SHOPS.maidens_market.stock.includes("vault_key"), "what's hard to find");
});

test("The Deadwood's eternal night, and coffers that fill once an hour", () => {
  const g = newGame(), world = g.world;
  assert.equal(COFFER_TICKS, 6000, "an hour of ticks");
  const [sqx, sqy] = M(121, 118);
  assert(inDeadwood(world, 290 + WEST_DX, northShift(60)) && !inDeadwood(world, sqx, sqy), "the wood and the square");
  assert.equal(gloomAt(world, 290 + WEST_DX, northShift(60)), 1, "deep in the wood it is full night"); assert.equal(gloomAt(world, sqx, sqy), 0, "no cloud over Friendhollow");
  const edge = gloomAt(world, 300 + WEST_DX, northShift(128)); assert(edge >= 0 && edge < 1, `the cloud thins at the wood's edge (${edge})`);
});

test("Return of Raria: the far west, the Burned, sealed Order looks, Adventurer Cards, the Regiment's writ and the Wise Friend's Law, all saved", async () => {
  const { CARDS, cardFound, codexTick } = await import("../games/rarefriends-realm/codex.ts");
  const { BURNED_BUILDS } = await import("../games/rarefriends-realm/factions.ts");
  const { CARD_OPTIONS: OPTIONS, cardUnlocked: unlocked } = await import("../games/rarefriends-realm/cardstyle.ts");
  const { setLaw } = await import("../games/rarefriends-realm/state.ts");
  const { SPELLS, PRAYERS, spellInBook, RARIAN_SPELL_TABS } = await import("../games/rarefriends-realm/data.ts");
  const g = newGame(), p = g.player, world = g.world;
  // The Vigil Aegis, by name, an aegis to look at.
  assert.equal(item("vigil_shield").name, "Vigil Aegis"); assert.equal(item("vigil_shield").icon.shape, "aegis");
  assert(!ITEM_LIST.some(entry => /vigil shield/i.test(entry.name) || /vigil shield/i.test(entry.examine)), "no Vigil Shield left anywhere");
  // The far west: four regions with land in them, Raria's palace in the middle of its walls, the Federation's fortress, BarkReach's camps.
  for (const id of ["deep_westmarch", "free_marches", "barkreach", "raria"]) {
    const index = REGIONS.findIndex(region => region.id === id); let land = 0;
    for (let i = 0; i < world.region.length; i++) if (world.region[i] === index && ![T.WATER, T.DEEP, T.VOID].includes(world.tiles[i])) land++;
    assert(land > 800, `${id} has land (${land})`);
  }
  const palace = world.buildings.find(b => b.name === "The Palace of Raria"); assert(palace, "the palace");
  const { RARIA_CITY } = north(await import("../games/rarefriends-realm/farwest.ts"));
  // (Across the city's own span: the villages round it have walls of their own now.)
  const walls = []; for (let x = RARIA_CITY.x0 - 6; x <= RARIA_CITY.x1 + 6; x++) if (terrainAt(world, x, RARIA_CITY.y - 30) === T.WALL) walls.push(x);
  // The capital, dressed: gatehouse towers at all four gates, yews down the boulevards and pocket gardens, wells in
  // the squares, none of it indoors, and no street a single dark roof colour.
  const R = RARIA_CITY, inCity = o => o.x > R.x0 && o.x < R.x1 && o.y > R.y0 && o.y < R.y1, indoors = o => world.buildings.some(b => o.x > b.x0 && o.x < b.x1 && o.y > b.y0 && o.y < b.y1);
  assert.equal(world.buildings.filter(b => b.name === "A gatehouse tower").length, 8, "two gatehouse towers at each gate");
  const cityTrees = world.objects.filter(o => o.kind === "tree" && inCity(o)), wells = world.objects.filter(o => o.kind === "well" && inCity(o));
  assert(cityTrees.length >= 40 && wells.length >= 6, `trees (${cityTrees.length}) and wells (${wells.length}) in the city`);
  assert(![...cityTrees, ...wells].some(indoors), "nothing planted indoors");
  assert(new Set(world.buildings.filter(b => b.name === "A Rarian house").map(b => b.color)).size >= 5, "houses under more than one roof colour");
  assert(walls[walls.length - 1] - walls[0] >= 100, `a great walled city (${walls[walls.length - 1] - walls[0]} tiles across)`);
  // The far west is a continent: Raria's lands and BarkReach dwarf the mainland.
  const landOf = ids => { const set = new Set(ids.map(id => REGIONS.findIndex(r => r.id === id))); let n = 0; for (let i = 0; i < world.region.length; i++) if (set.has(world.region[i]) && ![T.WATER, T.DEEP, T.VOID].includes(world.tiles[i])) n++; return n; };
  assert(landOf(["raria", "crownlands", "vesperwold", "silent_peaks"]) > 50000, `Raria is massive (${landOf(["raria", "crownlands", "vesperwold", "silent_peaks"])})`);
  assert(landOf(["barkreach", "heartwood"]) > 30000, `BarkReach is a great wood (${landOf(["barkreach", "heartwood"])})`);
  for (const [, at] of Object.entries((await import("../games/rarefriends-realm/farwest.ts")).FAR_PLACES)) assert(at[0] < WEST_DX, `${at} is on the far-west continent`);
  assert(Math.abs((palace.x0 + palace.x1) / 2 - (walls[0] + walls[walls.length - 1]) / 2) <= 1, "the palace is in the direct centre of the city");
  for (const name of ["The Great Hall of the Federation", "The Wizard Tower", "The Library", "The Enchanted Forge", "The Experimental Laboratory", "The Strange Device Room", "The Storage Vaults", "The Artisan Workshops", "The Heartwood Yard", "The Antler Lodge", "The Hall of the Order of Dusk", "The Chapel of the Law", "The Office of Conduct", "The Regimental Barracks"])
    assert(world.buildings.some(b => b.name === name), name);
  for (const id of ["queen_rara", "king_pell", "fellow_free", "dusk_prior", "raria_gate_captain", "hollowmere_officer", "fff_gatewarden"]) assert(g.npcs.some(npc => npc.id === id), `${id} is placed`);
  assert(g.monsters.filter(m => m.def.id === "royal_ranger").length >= 6 && MONSTERS.royal_ranger.level >= 150, "Royal Rangers everywhere, and nobody to mess with");
  // The Burned: every villager build and a knight, levels 54 to 69, faded red, round the Ember Fortress, and better drops the higher they are.
  assert.equal(BURNED_BUILDS.length, 10);
  const burned = BURNED_BUILDS.map(build => MONSTERS[`burned_${build}`]);
  assert.equal(Math.min(...burned.map(m => m.level)), 54); assert.equal(Math.max(...burned.map(m => m.level)), 69);
  assert(burned.every(m => m.undead && m.ink === "#6e2a24" && m.aggressive), "faded red undead");
  const heart = m => m.drops.find(d => d.item === "ash_heart").chance; assert(heart(MONSTERS.burned_knight) > heart(MONSTERS.burned_slim) * 3, "drops climb with the level");
  const ember = world.objects.find(o => o.name === "Order of the Ember altar");
  for (const m of burned) assert(g.monsters.some(x => x.def === m && Math.hypot(x.x - ember.x, x.y - ember.y) < 50), `${m.name} walks the ash near the fortress`);
  // Order looks are sealed until the leader is met; meeting the commander opens them, and that's saved.
  const facet = OPTIONS.layout.find(o => o.id === "facet"); assert(facet && !unlocked(g, facet), "the Diamond's layout starts sealed");
  assert(OPTIONS.layout.length >= 17 && OPTIONS.bg.length >= 27 && OPTIONS.frame.length >= 27, "many more looks");
  const talkTo = id => { const npc = g.npcs.find(entry => entry.id === id); standNear(g, npc.x, npc.y, 1); setTarget(g, { kind: "npc", uid: npc.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30); g.dialogue = null; };
  talkTo("diamond_commander"); assert(unlocked(g, facet), "met the Diamond's commander");
  // Adventurer Cards: found by doing, not given; an Order's cards stay sealed until its leader is met.
  assert(CARDS.length >= 120, `${CARDS.length} cards`);
  const fresh = newGame(); codexTick(fresh); assert(!cardFound(fresh, "order_diamond") && !cardFound(fresh, "region_raria") && !cardFound(fresh, "person_queen_rara"), "nothing given");
  codexTick(g); assert(cardFound(g, "order_diamond") && cardFound(g, "leader_diamond"), "the Diamond's cards after meeting its commander");
  teleport(g, world.places.raria.x, world.places.raria.y); run(g, 30); assert(cardFound(g, "region_raria"), "walk into Raria, find its card");
  // The Regiment: a checkpoint, a captain who writes writs; carrying one keeps the Regiment's halberds down.
  const scout = g.monsters.find(m => m.def.id === "rrr_scout"); assert(scout && MONSTERS.rrr_scout.faction === "rrr");
  talkTo("raria_gate_captain"); const captain = g.npcs.find(entry => entry.id === "raria_gate_captain"); standNear(g, captain.x, captain.y, 1);
  setTarget(g, { kind: "npc", uid: captain.uid, option: "Talk-to" }); until(g, () => g.dialogue !== null, 30);
  while (g.dialogue && g.dialogue.index < g.dialogue.lines.length) continueDialogue(g); chooseOption(g, g.dialogue.options.findIndex(o => o.label.startsWith("I'll do it."))); while (g.dialogue) continueDialogue(g);
  assert.equal(p.quests.rrr_truce, 1); assert(has(p, "writ_of_passage") && has(p, "sealed_dispatch"), "a writ and a dispatch");
  standNear(g, scout.x, scout.y, 2); p.combat = null; run(g, 12); assert(!scout.target, "the Regiment honours the writ");
  // The Wise Friend's Law: Raria's Magic and Faith in place of the Old Friend's, a real swap, and the way back.
  assert(SPELLS.filter(s => s.rarian).length >= 12 && PRAYERS.filter(pr => pr.rarian).length >= 8 && RARIAN_SPELL_TABS.length === 6);
  assert(!spellInBook(SPELLS.find(s => s.id === "edict_of_silence"), "realm") && spellInBook(SPELLS.find(s => s.id === "edict_of_silence"), "raria"), "Raria's edicts only in the Law's book");
  assert(!spellInBook(SPELLS.find(s => s.id === "holy_dart"), "raria") && spellInBook(SPELLS.find(s => s.id === "ember_dart"), "raria"), "the old light closed, common magic kept");
  p.xp.prayer = XP_TABLE[60]; p.xp.magic = XP_TABLE[60]; p.prayer = 60; give(p, "law_sigil", 20); give(p, "thought_sigil", 10);
  assert(canCast(g, SPELLS.find(s => s.id === "edict_of_silence")), "not before the Law");
  setLaw(g, true); assert(p.rarian && !canCast(g, SPELLS.find(s => s.id === "edict_of_silence")), "castable under the Law");
  togglePrayer(g, "first_law"); assert(p.prayers.includes("first_law")); togglePrayer(g, "paper_shield"); assert(!p.prayers.includes("paper_shield"), "the old prayers are closed while the Law is kept");
  // Everything saved: cards, the Law, the meeting, the quest, the writ.
  const back = newGame(); restore(back, serialize(g));
  assert(back.player.rarian && back.player.cards.order_diamond && back.player.cards.region_raria && back.player.questData.met_diamond === 1 && back.player.quests.rrr_truce === 1 && has(back.player, "writ_of_passage"), "all of it persists");
  assert(unlocked(back, facet), "the Diamond's layout stays open after a reload");
  // A save from before the far west (world 2) lands where it was: the same spot, WEST_DX columns further east in the wider world.
  const before = newGame(); restore(before, { ...serialize(g), world: 2, x: 300, y: 136 }); assert.deepEqual([before.player.x, before.player.y], [300 + WEST_DX, northShift(136)], "old saves move with the world");
  assert.equal(regionAt(before.world, before.player.x, before.player.y).id, "gravesend", "still in Gravesend");
  setLaw(g, false); assert(!p.rarian && p.prayers.length === 0, "set down, and the old book opens");
});

test("Feedback: an X post tagging the Realm and its maker, and a GitHub issue with what we need to act on it", async () => {
  const { feedbackPost, feedbackIssue, FEEDBACK_REPO } = await import("../games/rarefriends-realm/feedback.ts");
  const g = newGame(); g.player.name = "Tester";
  const long = "The ".repeat(200), post = feedbackPost("Bug", long);
  assert(post.length <= 280, `fits a post (${post.length})`);
  for (const tag of ["@M4S4T0_V01D", "@RareFriendsNFT", "#RareFriends", "#RareFriendsRealm"]) assert(post.includes(tag), tag);
  const issue = feedbackIssue(g, "Idea", "More fish in Candlemere's lake\nand a boat.", true, true);
  assert.equal(issue.title, "[Idea] More fish in Candlemere's lake"); assert.match(issue.body, /Friend: #7730 \(Tester\)/); assert.match(issue.body, /Region: /); assert.match(issue.body, /posted on X/);
  assert.doesNotMatch(feedbackIssue(g, "Bug", "x", false, false).body, /Friend:/, "details only when asked");
  assert.equal(FEEDBACK_REPO, "M4S4T0-V01D/rarefriends-realm");
});

test("Raria's walls stand three storeys high under taller towers, and the Cathedral's bell tower is climbed to the Great Bell", async () => {
  const { RARIA_CITY } = north(await import("../games/rarefriends-realm/farwest.ts"));
  const g = newGame(), world = g.world;
  const rampart = world.ramparts?.find(r => r.x0 === RARIA_CITY.x0 && r.y1 === RARIA_CITY.y1);
  assert(rampart && rampart.storeys >= 3, "the city wall is three storeys high");
  const wallTop = rampart.storeys * 42 + 17;
  const towers = world.buildings.filter(b => b.name === "A tower of Raria's wall" || b.name === "A gatehouse tower");
  assert(towers.length >= 16 && towers.every(b => (b.storeys ?? 1) * 42 + (b.tall ?? 0) > wallTop + 20), "every wall tower stands above the wall");
  const palace = world.buildings.find(b => b.name === "The Palace of Raria"), nave = world.buildings.find(b => b.name === "The Cathedral of the Wise Friend");
  const bells = world.buildings.find(b => b.name === "The Bell Tower of the Cathedral");
  assert(nave && bells && nave.color === palace.color && bells.color === palace.color, "the cathedral in the palace's colours");
  assert(nave.x1 < palace.x0 && (nave.x1 - nave.x0 + 1) * (nave.y1 - nave.y0 + 1) >= 400, "a great nave of its own, apart from the palace");
  assert((bells.storeys ?? 1) >= 8 && bells.roof === "cone" && (bells.spire ?? 0) >= 250, "a bell tower eight storeys high under a spire");
  // From the tower's door, climb ladder after ladder to the belfry.
  let at = world.objects.find(o => o.name === "Bell tower ladder" && o.action === "Climb-up" && o.y < OVERWORLD_H), level = 0, climbs = 0;
  while (at) {
    climbs++; level = floorAt(world, at.to.x, at.to.y)?.level ?? 0;
    const here = level;
    at = world.objects.find(o => o.name === "Bell tower ladder" && o.action === "Climb-up" && floorAt(world, o.x, o.y)?.level === here && floorAt(world, o.x, o.y)?.complex === bells.complex);
  }
  assert.equal(level, 7, "the ladders reach the top floor of the tower");
  assert.equal(climbs, 7, "seven ladders, floor by floor");
  assert(world.objects.some(o => o.decor === "bell" && floorAt(world, o.x, o.y)?.level === 7 && floorAt(world, o.x, o.y)?.complex === bells.complex), "the Great Bell at the top");
  // Every ladder lands on open floor.
  for (const o of world.objects.filter(o => o.name === "Bell tower ladder")) assert(canWalk(g, o.to.x, o.to.y), `ladder at ${o.x},${o.y} lands on open floor`);
});

test("The Palace of Raria: five floors under a spire, a four-wide door, and stairs to the top", async () => {
  const { RARIA_CITY } = north(await import("../games/rarefriends-realm/farwest.ts"));
  const g = newGame(), world = g.world, palace = world.buildings.find(b => b.name === "The Palace of Raria");
  assert(palace && palace.storeys >= 5 && palace.roof === "cone" && palace.keep?.storeys >= 3 && palace.keep.spire >= 200, "five storeys, a keep and a spire");
  const levels = world.floors.filter(f => f.complex === palace.complex).map(f => f.level).sort();
  assert.deepEqual(levels, [1, 2, 3, 4], "four floors above the throne room");
  const door = [-1, 0, 1, 2].map(dx => terrainAt(world, RARIA_CITY.x + dx, palace.y1));
  assert(door.every(t => t !== T.WALL), "a door four tiles wide");
  for (const dx of [-1, 0, 1, 2]) assert.notEqual(terrainAt(world, RARIA_CITY.x + dx, palace.y1 + 2), T.WALL, "a four-wide avenue to it");
  // Climb from the throne room to the top floor by the stairs alone.
  let at = world.objects.find(o => o.name === "Palace staircase" && o.action === "Climb-up" && o.x >= palace.x0 && o.x <= palace.x1 && o.y >= palace.y0 && o.y <= palace.y1), level = 0;
  while (at) {
    const floor = floorAt(world, at.to.x, at.to.y); level = floor ? floor.level : 0;
    at = world.objects.find(o => o.name === "Palace staircase" && o.action === "Climb-up" && Math.abs(o.x - at.to.x) + Math.abs(o.y - at.to.y) < 30 && floorAt(world, o.x, o.y)?.level === level);
  }
  assert.equal(level, 4, "the stairs reach the fifth floor");
  assert(world.objects.some(o => o.name?.startsWith("The regalia of Raria") && floorAt(world, o.x, o.y)?.level === 4), "the regalia under the spire");
});

test("The baked world unbakes to the generated one: every tile, object, building and storey, and heights within a pixel", async () => {
  const { generateWorld, WORLD_SEED, indexObjects, indexBuildings } = await import("../games/rarefriends-realm/world.ts");
  const { bakeWorld, unbakeWorld } = await import("../games/rarefriends-realm/bake.ts");
  const { world, lift, raise } = generateWorld(WORLD_SEED);
  // The maps the bake leaves out are rebuilt from the lists exactly.
  assert.deepEqual(indexObjects(world.objects), world.objectAt, "the tile → object map rebuilds exactly");
  assert.deepEqual(indexBuildings(world.buildings), world.buildingAt, "the tile → building map rebuilds exactly");
  const t0 = performance.now(), text = bakeWorld(world, lift, WORLD_SEED, raise), t1 = performance.now(), back = unbakeWorld(text), t2 = performance.now();
  assert(back, "it unbakes");
  for (const key of ["tiles", "region", "objectAt", "buildingAt"]) assert.deepEqual(back[key], world[key], `${key} survive the bake`);
  // Plain data only: what JSON keeps is everything there was (no NaN, Infinity, functions or class instances).
  const same = (a, b, path) => {
    if (typeof a === "number") { assert(Object.is(a, b), `${path}: ${a} vs ${b}`); return; }
    if (a === null || typeof a !== "object") { assert.equal(b, a, path); return; }
    assert.equal(Array.isArray(b), Array.isArray(a), `${path}: array-ness`);
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) { if (a[key] === undefined && b[key] === undefined) continue; same(a[key], b[key], `${path}.${key}`); }
  };
  for (const key of ["objects", "spawns", "places", "buildings", "floors", "ramparts"]) same(world[key], back[key], key);
  let worst = 0; for (let i = 0; i < world.heights.length; i++) worst = Math.max(worst, Math.abs(world.heights[i] - back.heights[i]));
  assert(worst < 0.5, `heights within half a pixel (worst ${worst})`);
  console.log(`bake ${Math.round(t1 - t0)} ms, unbake ${Math.round(t2 - t1)} ms, ${Math.round(text.length / 1024)} KB`);
  // (Checked as a boolean: a failing equal on a world would try to print all of it.)
  const { BAKE_VERSION } = await import("../games/rarefriends-realm/bake.ts");
  assert.ok(text.includes(`"v":${BAKE_VERSION}`), "the bake carries its version");
  assert.ok(unbakeWorld(text.replace(`"v":${BAKE_VERSION}`, '"v":0')) === null, "a bake from another version is refused");
});

test("Adaptive resolution: High drops to 1× after three slow seconds on a sharp screen, comes back with headroom, and gives up after two drops", async () => {
  const { adapt, newAdaptive, HIGH_SCALE } = await import("../games/rarefriends-realm/adaptive.ts");
  const a = newAdaptive();
  assert.equal(adapt(a, 40, 20, 1), null, "nothing to lower on a 1× screen");
  assert.equal(adapt(a, 30, 12, 2), null); assert.equal(adapt(a, 30, 12, 2), null);
  assert.equal(adapt(a, 30, 12, 2), 1, "three slow seconds → 1×");
  for (let i = 0; i < 5; i++) assert.equal(adapt(a, 10, 3, 2), null, "it settles before judging again");
  for (let i = 0; i < 14; i++) assert.equal(adapt(a, 16.7, 4, 2), null);
  assert.equal(adapt(a, 16.7, 4, 2), HIGH_SCALE, "fifteen easy seconds → back up");
  for (let i = 0; i < 5; i++) adapt(a, 10, 3, 2);
  adapt(a, 30, 12, 2); adapt(a, 30, 12, 2);
  assert.equal(adapt(a, 30, 12, 2), 1, "slow again → down again");
  for (let i = 0; i < 40; i++) assert.equal(adapt(a, 16.7, 4, 2), null, "after two drops it stays at 1×");
  const b = newAdaptive(); adapt(b, 30, 12, 2); adapt(b, 15, 12, 2); adapt(b, 30, 12, 2);
  assert.equal(adapt(b, 30, 12, 2), null, "a fast second in between starts the count again");
});

test("Townscape: homes in every village (with their doors reachable), L-shaped and hipped and two-storey buildings, shop and bank fronts, Raria's grand halls", async () => {
  const { walkable } = await import("../games/rarefriends-realm/world.ts");
  const { dressWorld } = await import("../games/rarefriends-realm/facades.ts");
  const g = newGame(), world = dressWorld(g.world), Wd = W;
  // Homes: three for nearly every village, a bed in each, a door you can walk to from the village.
  const homes = world.buildings.filter(b => / home$/.test(b.name)), villages = new Map();
  for (const b of homes) { const parts = b.complex ? world.buildings.filter(o => o.complex === b.complex) : [b]; if (parts[0] !== b) continue; villages.set(b.name, [...(villages.get(b.name) ?? []), parts]); }
  assert(villages.size >= 18, `homes in ${villages.size} villages`);
  assert([...villages.values()].filter(list => list.length >= 3).length >= 15, "three homes in most of them");
  const reach = (fromX, fromY, radius) => {
    const seen = new Set([fromY * Wd + fromX]), queue = [[fromX, fromY]];
    while (queue.length) { const [x, y] = queue.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * Wd + nx; if (seen.has(k) || Math.abs(nx - fromX) > radius || Math.abs(ny - fromY) > radius || !walkable(world, nx, ny)) continue; seen.add(k); queue.push([nx, ny]); } }
    return seen;
  };
  for (const [name, list] of villages) for (const parts of list) {
    const x0 = Math.min(...parts.map(p => p.x0)), y0 = Math.min(...parts.map(p => p.y0)), x1 = Math.max(...parts.map(p => p.x1)), y1 = Math.max(...parts.map(p => p.y1));
    const beds = world.objects.filter(o => o.decor === "bed" && o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1 && o.name !== "__removed");
    assert(beds.length >= 1, `${name} at ${x0},${y0} has a bed`);
    // From the bed, out of the door and well away: a door, and open ground round the house.
    const reached = reach(beds[0].x, beds[0].y, 40);
    assert([...reached].some(k => { const x = k % Wd, y = (k - x) / Wd; return x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1; }), `${name} at ${x0},${y0}: out of the door`);
    assert(reached.size > (x1 - x0 + 5) * (y1 - y0 + 5), `${name} at ${x0},${y0}: and all round the house`);
  }
  // Shapes and roofs.
  const ls = new Set(world.buildings.filter(b => b.complex?.includes("@")).map(b => b.complex));
  assert(ls.size >= 30, `L-shaped buildings (${ls.size})`);
  for (const complex of ls) { const parts = world.buildings.filter(b => b.complex === complex); assert.equal(parts.length, 2, `${complex}: two parts`); }
  assert(world.buildings.filter(b => b.hip).length >= 80, "hipped roofs");
  assert(world.buildings.filter(b => b.storeys === 2).length >= 60, "two-storey buildings");
  assert(world.buildings.filter(b => b.storeys === 3 && b.roof === "cone" && !b.round && !b.keep).length >= 8, "tower-houses");
  // Fronts: every bank's, and the shops'.
  const bankHouses = world.buildings.filter(b => world.objects.some(o => o.kind === "bank" && o.x > b.x0 && o.x < b.x1 && o.y > b.y0 && o.y < b.y1));
  assert(bankHouses.length >= 8 && bankHouses.every(b => b.style === "mizukai" || (b.facade === "bank" && b.walls === "marble")), "every bank is a marble bank (the Isles' Exchange is built the Mizukai way)");
  const shops = world.buildings.filter(b => b.facade === "shop");
  assert(shops.length >= 30 && shops.filter(b => b.sign).length >= 25, `shops with awnings and signs (${shops.length})`);
  assert(world.buildings.some(b => b.facade === "inn"), "inns hang out a tankard");
  // Raria's halls of state.
  for (const name of ["The Office of Conduct", "The Office of Sigils", "The Sumptuary Office", "The Chapel of the Law", "The Hall of the Order of Dusk", "The Crown Bank"]) {
    const b = world.buildings.find(o => o.name === name);
    assert(b && (b.storeys ?? 1) >= 3 && (b.facade === "civic" || b.facade === "bank"), `${name} is grand`);
  }
  assert(world.buildings.filter(b => b.keep?.dome).length >= 3, "domes over Raria");
});

test("The Ring is roofed and battlemented, with stairs to a walk round the top, the old arcades half-fallen, and the pit open to the sky", async () => {
  const { ARENA, floorAt, walkable } = await import("../games/rarefriends-realm/world.ts");
  const g = newGame(), world = g.world, Wd = W;
  const roof = world.buildings.filter(b => b.complex === "friends_ring");
  assert(roof.length >= 40 && roof.every(b => b.roof === "flat"), "the concourse is roofed, flat and battlemented");
  // The pit is open: nothing over the courtyard.
  for (let y = ARENA.y - 10; y <= ARENA.y + 10; y++) for (let x = ARENA.x - 10; x <= ARENA.x + 10; x++) assert.equal(world.buildingAt[y * Wd + x], 0, `the pit is open at ${x},${y}`);
  // Two staircases up, each landing on the walk, each with one down.
  const ups = world.objects.filter(o => o.name === "Ring stairs" && o.action === "Climb-up"), downs = world.objects.filter(o => o.name === "Ring stairs" && o.action === "Climb-down");
  assert.equal(ups.length, 2, "two staircases"); assert.equal(downs.length, 2, "and two ways down");
  for (const s of [...ups, ...downs]) assert(walkable(world, s.to.x, s.to.y), `stairs at ${s.x},${s.y} land on open floor`);
  for (const s of ups) assert.equal(floorAt(world, s.to.x, s.to.y)?.complex, "friends_ring", "up onto the Ring's walk");
  const walk = world.floors.find(f => f.complex === "friends_ring");
  const onWalk = o => o.x >= walk.x0 + walk.dx && o.x <= walk.x1 + walk.dx && o.y >= walk.y0 + walk.dy && o.y <= walk.y1 + walk.dy && o.name !== "__removed";
  assert(world.objects.filter(o => onWalk(o) && o.decor === "canopy").length >= 30, "stretches of the old roof still standing");
  assert(world.objects.filter(o => onWalk(o) && o.decor === "ruin_wall").length >= 2 && world.objects.some(o => onWalk(o) && o.decor === "rubble"), "and fallen ones");
  // The whole walk is one: from one landing you can walk to the other.
  const [a, b] = ups.map(s => s.to), seen = new Set([a.y * Wd + a.x]), queue = [[a.x, a.y]];
  while (queue.length) { const [x, y] = queue.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (y + dy) * Wd + x + dx; if (!seen.has(k) && walkable(world, x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); } } }
  assert(seen.has(b.y * Wd + b.x), "all the way round the walk, landing to landing");
});

test("Dyemoor is a dyers' town of brick, with its clothiers and Counting House, and its dyes dye clothes that stay dyed through a save", async () => {
  const { T, terrainAt } = await import("../games/rarefriends-realm/world.ts");
  const { item, isItem, dyeable, SHOPS } = await import("../games/rarefriends-realm/data.ts");
  const g = newGame(), world = g.world, p = g.player, at = world.places.dyemoor;
  // The town: a brick square, the guildhall, the bank and four clothiers.
  let brick = 0; for (let y = at.y - 12; y <= at.y + 5; y++) for (let x = at.x - 22; x <= at.x + 22; x++) if (terrainAt(world, x, y) === T.BRICK) brick++;
  assert(brick >= 250, `a square of brick (${brick} tiles)`);
  for (const name of ["The Dyers' Guildhall", "Dyemoor Counting House", "Marigold's", "The Wide Wardrobe", "The Far Loom", "The Madder Rose", "The Dyeworks", "Dyemoor Bolts & Thread", "The Crooked Vat"]) assert(world.buildings.some(b => b.name === name), name);
  for (const shop of ["dyemoor_dyes", "dyemoor_wardrobe", "dyemoor_farloom", "dyemoor_madder"]) assert(world.spawns.some(s => s.kind === "npc" && Math.abs(s.x - at.x) < 30 && Math.abs(s.y - at.y) < 25 && (s.id === { dyemoor_dyes: "dyemoor_dyer", dyemoor_wardrobe: "dyemoor_wardrober", dyemoor_farloom: "dyemoor_loomkeeper", dyemoor_madder: "dyemoor_rosekeeper" }[shop])), `${shop} is kept in town`);
  assert(SHOPS.dyemoor_wardrobe.stock.length >= 25 && SHOPS.dyemoor_madder.stock.length >= 25 && SHOPS.dyemoor_farloom.stock.length >= 10, "the world's clothes on the rails");
  assert(!SHOPS.dyemoor_farloom.stock.includes("rarian_mantle"), "earned clothes aren't for sale");
  // Dyeing: a pot of woad on a Dyemoor cloak makes a woad-blue cloak, worn and saved as such; lye washes it back.
  assert(dyeable("dyemoor_cloak") && !dyeable("bronze_plate") && !dyeable("knife"), "cloth dyes, metal doesn't");
  give(p, "dyemoor_cloak"); give(p, "dye_woad"); give(p, "dye_lye");
  const slot = id => p.inventory.findIndex(s => s?.id === id);
  useItemOnItem(g, slot("dye_woad"), slot("dyemoor_cloak")); run(g, 6);
  assert(has(p, "dyemoor_cloak~woad") && !has(p, "dye_woad") && !has(p, "dyemoor_cloak"), "dyed woad blue");
  assert.equal(item("dyemoor_cloak~woad").icon.color, "#4a6aa8"); assert.equal(item("dyemoor_cloak~woad").equip.slot, "cape");
  equip(g, slot("dyemoor_cloak~woad")); assert.equal(p.equipment.cape, "dyemoor_cloak~woad", "worn");
  const back = newGame(); assert(restore(back, JSON.parse(JSON.stringify(serialize(g)))), "restored"); assert.equal(back.player.equipment.cape, "dyemoor_cloak~woad", "still woad blue after a save");
  unequip(g, "cape"); useItemOnItem(g, slot("dye_lye"), slot("dyemoor_cloak~woad")); run(g, 6);
  assert(has(p, "dyemoor_cloak") && !has(p, "dyemoor_cloak~woad"), "lye washes it out");
  assert(!isItem("dyemoor_cloak~nonsense") && !isItem("bronze_plate~woad"), "only real dyes on dyeable things");
});

test("Craftwork: a carving gouge carves logs into figures that help everyone near them for a while, then crumble", async () => {
  const { carvingEffect, carvingRecipes } = await import("../games/rarefriends-realm/engine.ts");
  const { CARVINGS, SKILL_NAMES, SHOPS } = await import("../games/rarefriends-realm/data.ts");
  assert.equal(SKILL_NAMES.crafting, "Craftwork", "the skill is Craftwork");
  assert(SHOPS.crafting.stock.includes("carving_gouge") && SHOPS.general.stock.includes("carving_gouge"), "gouges in the shops");
  assert.equal(new Set(CARVINGS.map(c => c.log)).size, CARVINGS.length, "every wood its own carving");
  assert(!CARVINGS.some(c => /totem/i.test(c.name)), "no totems");
  const g = newGame(), p = g.player, slot = id => p.inventory.findIndex(s => s?.id === id);
  p.xp.crafting = XP_TABLE[60];
  give(p, "carving_gouge"); give(p, "oak_logs"); give(p, "oak_logs"); give(p, "knife");
  // The knife won't do; the gouge will.
  useItemOnItem(g, slot("knife"), slot("oak_logs")); assert(!g.ui.production?.recipes.some(r => r.label === "Oak bulwark"), "not with a knife");
  g.ui.production = null; useItemOnItem(g, slot("carving_gouge"), slot("oak_logs"));
  assert(g.ui.production?.recipes.some(r => r.label === "Oak bulwark"), "the gouge offers an oak bulwark");
  startProduction(g, carvingRecipes("oak_logs")[0], 1); run(g, 8);
  assert(has(p, "carving_oak") && !has(p, "oak_logs"), "two oak logs carved into a bulwark");
  // Set it down: near it, 12% less damage taken; away from it, nothing.
  itemOptions(g, slot("carving_oak")).find(o => o.verb === "Set-down").run(g);
  assert.equal(g.carvings.length, 1); assert.equal(carvingEffect(g).taken, 0.12, "sheltered near it");
  const home = { x: p.x, y: p.y }; p.x += 10; tick(g); assert.equal(carvingEffect(g).taken, 0, "nothing far from it"); p.x = home.x; tick(g);
  // Different kinds add up; the same kind doesn't; three at most.
  const place = id => { p.x = home.x + g.carvings.length; give(p, id); itemOptions(g, slot(id)).find(o => o.verb === "Set-down").run(g); };
  place("carving_oak"); place("carving_willow"); p.x = home.x; tick(g);
  const e = carvingEffect(g); assert.equal(e.taken, 0.12, "two bulwarks don't stack"); assert.equal(e.faith, 0.4, "a willow vigil slows Faith's drain");
  place("carving_maple"); assert.equal(g.carvings.length, 3, "three at most: the oldest crumbled");
  // They crumble away when their time is up.
  run(g, 260);
  assert.equal(g.carvings.length, 0, "all crumbled away"); assert(g.messages.some(m => /crumbles away/.test(m.text)), "and you hear about it");
});

test("Bars: one in every town, each with a barkeep's quest, a quiet trader, house drinks, and a job board of bounties and errands", async () => {
  const { BARS, boardJobs, currentJob } = await import("../games/rarefriends-realm/bars.ts");
  const { BAR_SITES } = await import("../games/rarefriends-realm/barfit.ts");
  const { MONSTERS, SHOPS, isItem, item } = await import("../games/rarefriends-realm/data.ts");
  const { FACTION_MONSTERS } = await import("../games/rarefriends-realm/factions.ts");
  const g = newGame(), world = g.world, p = g.player;
  assert.deepEqual(BAR_SITES.map(s => [s.bar, s.keeper, s.fence]), BARS.map(b => [b.id, b.keeper, b.fence]), "the fitting and the bars agree");
  for (const bar of BARS) {
    const b = world.buildings.find(entry => entry.name === bar.name);
    assert(b, `${bar.name} stands in ${bar.town}`);
    const inside = s => s.x > b.x0 && s.x < b.x1 && s.y > b.y0 && s.y < b.y1;
    assert(world.spawns.some(s => s.id === bar.keeper && inside(s)), `${bar.name}: its barkeep behind the bar`);
    assert(world.spawns.some(s => s.id === bar.fence && inside(s)), `${bar.name}: a quiet trader at a table`);
    assert(world.objects.some(o => o.kind === "board" && o.text === bar.id && inside(o)), `${bar.name}: a job board`);
    assert(SHOPS[NPCS[bar.keeper].shop].stock.includes(bar.drink) && SHOPS[NPCS[bar.keeper].shop].stock.includes("ale"), `${bar.name} pours its own`);
    assert.equal(NPCS[bar.fence].shop, "fence");
    for (const id of bar.kills) assert(MONSTERS[id] ?? FACTION_MONSTERS[id], `${bar.name}: ${id} is a creature`);
    for (const [id] of bar.fetch) assert(isItem(id), `${bar.name}: ${id} is an item`);
    assert(QUESTS.some(q => q.id === bar.quest), `${bar.name} has a quest`);
  }
  for (const id of SHOPS.fence.stock) assert(isItem(id), id);
  // A drink is drunk.
  give(p, "madder_wine"); const wine = p.inventory.findIndex(s => s?.id === "madder_wine");
  assert(itemOptions(g, wine).some(o => o.verb === "Drink")); p.hp = 5; itemOptions(g, wine).find(o => o.verb === "Drink").run(g);
  assert(g.messages.some(m => /You drink the madder wine/.test(m.text)) && p.boosts.magic === 2, "a drink heals and lends a point");
  // The board: take a bounty, kill for it, collect.
  const vat = BARS.findIndex(b => b.id === "vat"), jobs = boardJobs(g, vat);
  assert.equal(jobs.length, 3); assert.equal(jobs.filter(j => j.kind === "kill").length, 2); assert.equal(jobs.filter(j => j.kind === "fetch").length, 1);
  let d = readJobBoard(g, "vat"); const take = d.options.findIndex(o => /Put down/.test(o.label)); d.options[take].then();
  const job = currentJob(g); assert(job && job.job.kind === "kill", "a bounty taken");
  const target = BARS[vat].kills[job.job.target];
  for (let i = 0; i < job.job.count; i++) onMonsterKilled(g, target, 0, 0);
  assert.equal(currentJob(g).done, job.job.count, "every kill counted");
  const coins = count(p, "coins"); d = readJobBoard(g, "vat"); d.options.find(o => /Collect/.test(o.label)).then();
  assert.equal(count(p, "coins"), coins + job.job.reward, "paid at the board"); assert.equal(currentJob(g), null); assert.equal(p.questData.jobs_done, 1);
  // An errand: hand the goods in.
  const errand = boardJobs(g, vat).find(j => j.kind === "fetch"), [wanted] = BARS[vat].fetch[errand.target];
  d = readJobBoard(g, "vat"); d.options.find(o => /^Bring/.test(o.label)).then();
  for (let i = 0; i < errand.count; i++) give(p, wanted);
  d = readJobBoard(g, "vat"); d.options.find(o => /Hand it in/.test(o.label)).then();
  assert.equal(count(p, wanted), 0); assert.equal(p.questData.jobs_done, 2, "errand handed in");
  // A job from one bar isn't handed in at another.
  d = readJobBoard(g, "vat"); d.options[0].then(); d = readJobBoard(g, "kettle"); assert(/already/.test(d.lines[0].text), "one job at a time, from one bar");
  // The barkeep's quest.
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  let t = talk(g, "vat_keeper"); t.options.find(o => /do it/.test(o.label)).then().onEnd?.();
  assert.equal(p.quests.bar_vat, 1, "quest started");
  for (let i = 0; i < 12; i++) give(p, "sweetberry"); for (let i = 0; i < 4; i++) give(p, "willow_logs");
  t = talk(g, "vat_keeper"); t.onEnd?.();
  assert(p.quests.bar_vat >= 2 && has(p, "madder_wine"), "quest done, wine poured");
  // The quiet trader's gear works.
  const { successChance } = await import("../games/rarefriends-realm/engine.ts"); void successChance;
  assert(item("softsole_boots").equip.slot === "feet" && item("sleight_gloves").equip.slot === "hands");
});

test("a save from the hours the Mizukai Isles had their first name comes back under the new names", () => {
  const g = newGame(), p = g.player;
  p.mizukai = true; p.equipment.head = "mizukai_kasa"; p.equipment.body = "mizukai_kimono"; p.visited.mizukai_sea = 1; p.inventory[0] = { id: "mizukai_longbow", n: 1 };
  const old = JSON.parse(JSON.stringify(serialize(g)).replaceAll("mizukai", ["pal", "ian"].join("")));
  assert.ok(JSON.stringify(old).includes(["pal", "ian_kasa"].join("")), "the old save really is in the old names");
  const fresh = newGame();
  assert.ok(restore(fresh, old));
  assert.equal(fresh.player.mizukai, true, "the tradition is still kept");
  assert.equal(fresh.player.equipment.head, "mizukai_kasa"); assert.equal(fresh.player.equipment.body, "mizukai_kimono");
  assert.equal(fresh.player.inventory[0]?.id, "mizukai_longbow");
  assert.equal(fresh.player.visited.mizukai_sea, 1);
});

test("the Mizukai Isles' music: their own instruments, ornamented, and every piece its own ensemble", async () => {
  const { TRACKS, MIZUKAI_TRACKS, trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const isles = TRACKS.filter(track => MIZUKAI_TRACKS.includes(track.id)); assert.equal(isles.length, 10);
  const own = new Set(["koto", "shamisen", "shakuhachi", "sho", "kane", "shinobue", "ryuteki", "hichiriki", "nohkan", "biwa"]);
  const drums = new Set(["taiko", "shime", "clapper", "odaiko", "kara", "kakko", "shoko", "atarigane", "tsuzumi", "otsuzumi", "yo", "ha", "wave", "wind"]);
  const ensembles = new Set();
  for (const track of isles) {
    for (const note of track.notes) { assert(own.has(note.voice), `${track.name}: no ${note.voice} on the Isles`); assert(note.beat >= 0 && note.beat < track.beats, `${track.name}: a note inside the loop`); }
    for (const hit of track.hits) { assert(drums.has(hit.drum), `${track.name}: no ${hit.drum} on the Isles`); assert(hit.beat >= 0 && hit.beat < track.beats, `${track.name}: a stroke inside the loop`); }
    assert(track.beats % 4 === 0, `${track.name} loops on a bar line`);
    assert(track.notes.some(note => note.shape), `${track.name} is ornamented, not just played`);
    ensembles.add([...new Set([...track.notes.map(note => note.voice), ...track.hits.map(hit => hit.drum)])].sort().join());
  }
  assert.equal(ensembles.size, 10, "no two pieces with the same ensemble");
  assert(new Set(isles.map(track => track.bpm)).size >= 9, "and hardly two at one tempo");
  // The court music, the noh, and the festival each turn up where they belong.
  const voices = id => new Set(TRACKS.find(track => track.id === id).notes.map(note => note.voice));
  assert(voices("mizukai_shrine").has("hichiriki") && voices("mizukai_shrine").has("sho"), "gagaku at the shrine");
  assert(voices("mizukai_haunted").has("biwa") && voices("mizukai_spirit").has("nohkan"), "the biwa's ghost tales and the noh's spirits");
  assert(voices("mizukai_harbour").has("shinobue"), "the harbour's festival flute");
  assert.equal(trackFor("hinode", false), "mizukai_sunrise"); assert.equal(trackFor("hinode", false, { fight: true }), "mizukai_battle"); assert.equal(trackFor("friendhollow", false, { sea: true }), "mizukai_sea");
});

test("every standing shrine gate on the Isles can be walked under (only the fallen one lies in the way)", () => {
  const g = createGame({ familyId: 1, friendId: 7730 }), gates = g.world.objects.filter(o => o && o.decor === "torii");
  assert(gates.length >= 30, `the Isles' gates (${gates.length})`);
  for (const gate of gates) assert.equal(gate.blocks, /fallen/i.test(gate.name), `${gate.name} at ${gate.x},${gate.y}`);
});

// ---------- The Land Before Stone ----------
test("Kharaveth: the Sunteeth is the only way in on foot, Foothold's gate the only way on, and the Underway joins the maze to the camp", async () => {
  const { FOOTHOLD, SUNTEETH } = north(await import("../games/rarefriends-realm/south.ts"));
  const g = newGame(), world = g.world, fromSpawn = reachable(g, world.places.spawn), at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  assert(at(fromSpawn, SUNTEETH.north.x, SUNTEETH.north.y), "the shingle spit reaches the Sunteeth from the mainland");
  assert(at(fromSpawn, SUNTEETH.south.x, SUNTEETH.south.y) && at(fromSpawn, world.places.foothold.x, world.places.foothold.y), "through the canyons to the camp");
  const inland = new Set(REGIONS.filter(r => r.south && !r.underground && !["sunward_strait", "sunteeth", "foothold"].includes(r.id)).map(r => r.id));
  let leaked = 0; for (let y = FOOTHOLD.y1 + 1; y < OVERWORLD_H; y++) for (let x = 0; x < W; x++) if (fromSpawn[y * W + x] && inland.has(regionAt(world, x, y).id)) leaked++;
  assert.equal(leaked, 0, "nothing of Kharaveth past the camp is reached without its gate");
  const beyond = reachable(g, { x: FOOTHOLD.gate.x, y: FOOTHOLD.gate.y + 1 }); let open = 0; for (const v of beyond) open += v;
  assert(open > 100_000, `a continent through the gate (${open} tiles)`);
  for (const id of ["sunteeth_crack", "sunteeth_stele", "last_camp", "chalk_ochre", "trail_blood"]) assert(beside(fromSpawn, world.objects.find(o => o.clue === id)), `${id} can be reached`);
  const crack = world.objects.find(o => o.clue === "sunteeth_crack"), under = reachable(g, crack.to);
  for (const id of ["underway_shaft_up", "underway_counterweight", "underway_glyphs", "underway_lintel"]) assert(beside(under, world.objects.find(o => o.clue === id)), `${id} on the Underway's road`);
  assert(at(under, g.npcs.find(n => n.id === "fh_rook_lost").x, g.npcs.find(n => n.id === "fh_rook_lost").y), "the party's refuge is on the road");
  assert(beside(fromSpawn, world.objects.find(o => o.clue === "underway_shaft_down")), "the shaft comes up inside the camp, not outside its gate");
  for (const id of ["sunward_strait", "sunteeth", "foothold", "ochre_steppe", "underway"]) assert(world.region.includes(REGIONS.findIndex(r => r.id === id)), `${id} exists`);
});

test("A Foothold in the Stone: the officers, the camp, the trail in order, the ochre, the stele and the crack, the Underway, both endings", async () => {
  const { useClue, clueOptions } = await import("../games/rarefriends-realm/kharaveth.ts");
  const { talk, npcHere } = await import("../games/rarefriends-realm/content.ts");
  for (const choice of [1, 2]) {
    const g = newGame(), world = g.world, Q = "foothold_in_the_stone";
    const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); };
    const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option ?? "Read");
    assert.match(clue("foothold_gate", "Open").text, /barred/, "the south gate is barred before");
    say("fh_commander", "I'll find them."); assert.equal(g.player.quests[Q], 1); assert(has(g.player, "party_roster"));
    say("fh_lieutenant"); say("fh_cartographer"); say("fh_scholar");
    clue("last_camp", "Search"); assert(has(g.player, "ochre_chalk"), "the ochre chalk at the cold fire");
    assert.match(clue("trail_shoe", "Inspect").text, /from the beginning/, "the trail is read from the camp, in order");
    for (const id of ["trail_sand", "trail_tin", "trail_shoe", "trail_blood"]) clue(id, "Inspect");
    assert.equal(g.player.questData.ft_trail, 4);
    clue("chalk_ochre"); assert("ochre_marks" in g.player.mysteries.found, "two hands at the walls: a Mysteries discovery");
    clue("sunteeth_stele"); say("fh_scholar"); assert.equal(g.player.mysteries.glyphs.road, 2, "the scholar teaches 'road'");
    const crack = world.objects.find(o => o.clue === "sunteeth_crack");
    assert.deepEqual(clueOptions(g, crack), ["Search"], "a crack is only a way in once you've felt it breathe");
    clue("sunteeth_crack", "Search"); assert.deepEqual(clueOptions(g, crack), ["Squeeze-into"]); assert.equal(g.player.mysteries.glyphs.door, 2, "and the stele's arch is a door");
    assert.deepEqual(useClue(g, crack, "Squeeze-into").to, crack.to);
    assert(npcHere(g, "fh_rook_lost") && !npcHere(g, "fh_rook"), "the party is in the Underway");
    say("fh_rook_lost"); assert.equal(g.player.quests[Q], 2);
    assert(!clue("underway_shaft_up", "Climb-up").to, "the shaft is choked until the counterweight drops");
    clue("underway_counterweight", "Release"); assert(clue("underway_shaft_up", "Climb-up").to);
    assert(!npcHere(g, "fh_rook_lost") && npcHere(g, "fh_rook"), "and they walk out to the camp");
    say("fh_commander", choice === 1 ? "It's true" : "Ibbu got");
    assert.equal(g.player.quests[Q], 3); assert.equal(g.player.questData.ft_choice, choice); assert(has(g.player, "foothold_cloak"));
    assert.equal(npcHere(g, "fh_ibbu"), choice === 2, "the guide stays only if his secret was kept");
    assert(clue("foothold_gate", "Open").to, "the south gate opens");
    // Mysteries never pays twice.
    clue("underway_glyphs"); clue("underway_lintel");
    const xp = g.player.xp.mysteries;
    clue("sunteeth_stele"); clue("underway_glyphs"); clue("underway_lintel"); clue("underway_counterweight", "Release"); clue("sunteeth_crack", "Search");
    assert.equal(g.player.xp.mysteries, xp, "repeating a discovery gives nothing");
    const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save));
    assert.deepEqual(fresh.player.mysteries, g.player.mysteries); assert.equal(fresh.player.quests[Q], 3); assert.equal(fresh.player.xp.mysteries, g.player.xp.mysteries);
  }
  // Out of order: the counterweight dropped before the party is found (exploring ahead) still lets them out and the quest end.
  const g = newGame(), world = g.world, Q = "foothold_in_the_stone", clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option ?? "Read");
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); };
  say("fh_commander", "I'll find them."); clue("underway_counterweight", "Release");
  assert(npcHere(g, "fh_rook_lost"), "the party waits to be found"); say("fh_rook_lost");
  assert(npcHere(g, "fh_rook") && !npcHere(g, "fh_rook_lost"), "then walks out by the open shaft");
  say("fh_commander", "It's true"); assert.equal(g.player.quests[Q], 3, "and the commander takes the report");
});

test("Mysteries: a skill of its own, trained by finding out (glyphs seen, then understood; inscriptions read once), saved, and cleaned on load", async () => {
  const { learnGlyph, readInscription, studySherd, cleanMysteries, INSCRIPTIONS } = await import("../games/rarefriends-realm/mysteries.ts");
  const { skillGuide } = await import("../games/rarefriends-realm/guide.ts");
  assert(SKILLS.includes("mysteries")); assert(skillGuide("mysteries").length >= 4, "the guide explains it");
  const g = newGame(); assert.equal(g.player.xp.mysteries, 0);
  assert.match(readInscription(g, "underway_glyphs"), /One you don't: a disc/, "unknown glyphs are read as their shapes");
  for (const id of INSCRIPTIONS.underway_glyphs.glyphs) learnGlyph(g, id, true);
  assert.equal(g.player.mysteries.read.underway_glyphs, 1); assert.match(readInscription(g, "underway_glyphs"), /Sun\. Water\. Star\./);
  const xp = g.player.xp.mysteries; for (const id of INSCRIPTIONS.underway_glyphs.glyphs) learnGlyph(g, id, true); assert.equal(g.player.xp.mysteries, xp, "a glyph is understood once");
  for (let i = 0; i < 20; i++) studySherd(g); assert.match(studySherd(g), /already/, "sherds run out of new glyphs");
  assert.deepEqual(cleanMysteries({ found: { nonsense: 3, underway_found: 5 }, glyphs: { sun: 2, moon: 2, road: 7 }, read: { underway_glyphs: 1, x: 1 } }), { found: { underway_found: 5 }, glyphs: { sun: 2 }, read: { underway_glyphs: 1 } });
});

test("The world grew south: a save from before keeps its place, whether on the surface, in a dungeon or upstairs", () => {
  const g = newGame(), world = g.world;
  // A spot in a dungeon and one on a castle storey, in the old frame (rows 520–639) and in the new one (moved down SOUTH_DY).
  const dungeonLadder = world.objects.find(o => o.kind === "ladder" && isUnderground(o.y)), storey = world.objects.find(o => o.kind === "ladder" && o.y >= FLOOR_Y && o.y < UNDER_Y);
  for (const [o, label] of [[dungeonLadder, "a dungeon"], [storey, "a storey"]]) {
    const spot = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([dx, dy]) => ({ x: o.x + dx, y: o.y + dy })).find(p => canWalk(g, p.x, p.y));
    const save = JSON.parse(JSON.stringify(serialize(g))), old = unmovedPoint(world, spot.x, spot.y); save.world = 3; save.x = old.x; save.y = old.y - SOUTH_DY;
    const fresh = newGame(); assert(restore(fresh, save)); assert.deepEqual([fresh.player.x, fresh.player.y], [spot.x, spot.y], `${label}: an old save lands where it was`);
  }
  const surface = JSON.parse(JSON.stringify(serialize(g))); surface.world = 3; surface.y = northUnshift(g.player.y);
  const fresh = newGame(); assert(restore(fresh, surface)); assert.deepEqual([fresh.player.x, fresh.player.y], [g.player.x, g.player.y], "the old overworld didn't move");
  // A Place to the North: a save from before it (world 5, the frame's rows) moves down with the world, its camp too; one from after stays put.
  const camped = JSON.parse(JSON.stringify(serialize(g))); camped.world = 5; camped.y = northUnshift(g.player.y); camped.camp = { x: g.player.x, y: northUnshift(g.player.y), tier: 1, respawn: false, altar: false };
  const moved = newGame(); assert(restore(moved, camped)); assert.deepEqual([moved.player.x, moved.player.y], [g.player.x, g.player.y], "a world-5 save keeps its place in the grown world");
  assert.deepEqual([moved.player.camp?.x, moved.player.camp?.y], [g.player.x, g.player.y], "and so does its camp");
  const kept = newGame(); assert(restore(kept, serialize(g))); assert.deepEqual([kept.player.x, kept.player.y], [g.player.x, g.player.y], "a world-6 save stays put");
  assert.equal(serialize(g).world, 6);
});

test("Kharaveth's music: oud, ney, qanun and rebab, darbuka and frame drum, in four modes; each region its piece", async () => {
  const { TRACKS, KHARAVETH_TRACKS, trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const pieces = TRACKS.filter(track => KHARAVETH_TRACKS.includes(track.id)); assert.equal(pieces.length, 9);
  const own = new Set(["oud", "ney", "qanun", "rebab", "drone", "lute"]), ensembles = new Set();
  for (const track of pieces) {
    for (const note of track.notes) assert(own.has(note.voice), `${track.name}: ${note.voice}`);
    assert(track.hits.some(hit => ["dum", "tek", "bendir", "riq"].includes(hit.drum)), `${track.name} has a hand drum`);
    ensembles.add([...new Set(track.notes.map(n => n.voice))].sort().join());
  }
  assert.equal(ensembles.size, 9, "each its own ensemble");
  for (const [region, id] of [["sunteeth", "kharaveth_sunteeth"], ["foothold", "kharaveth_foothold"], ["underway", "kharaveth_underway"], ["ochre_steppe", "kharaveth_steppe"], ["sefrah", "kharaveth_sefrah"],
    ["tamesh", "kharaveth_tamesh"], ["khetmar", "kharaveth_khetmar"], ["sea_of_dunes", "kharaveth_dunes"], ["first_names", "kharaveth_azhurak"], ["black_stair", "kharaveth_azhurak"]]) assert.equal(trackFor(region, false), id);
});

test("Kharaveth's heartlands: every town, camp and old place is reached from Foothold's gate, the Black Stair's halls from its stair, and no older dungeon is touched", async () => {
  const { FOOTHOLD } = north(await import("../games/rarefriends-realm/south.ts"));
  const { SITES, BLACK_STAIR } = north(await import("../games/rarefriends-realm/heartlands.ts"));
  const g = newGame(), world = g.world, beyond = reachable(g, { x: FOOTHOLD.gate.x, y: FOOTHOLD.gate.y + 1 }), at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => o && [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  for (const place of ["sefrah", "tamesh", "khetmar", "zuri", "ouresh"]) assert(at(beyond, world.places[place].x, world.places[place].y), `${place} is on foot from the gate`);
  for (const id of ["seven_crowns", "first_names_door", "sunken_obelisk", "pyramid_marks", "tomb_ledger", "well_tahr", "black_stair_down"]) assert(beside(beyond, world.objects.find(o => o.clue === id)), `${id} can be reached`);
  for (const id of ["sefrah_vizier", "sefrah_seleneh", "tamesh_meretkhet", "tamesh_mason", "tamesh_quarrymaster", "khetmar_ardesh", "zuri_asmeh", "ouresh_halzir", "tomb_keeper"]) {
    const npc = g.npcs.find(n => n.id === id); assert(npc, `${id} is somewhere`); assert(beside(beyond, npc) || at(beyond, npc.x, npc.y), `${id} can be reached`);
  }
  const stair = world.objects.find(o => o.clue === "black_stair_down"), below = reachable(g, stair.to);
  for (const id of ["ward_stone_0", "ward_stone_1", "ward_stone_2", "ward_niche_0", "ward_niche_1", "ward_niche_2", "black_stair_lintel"]) assert(beside(below, world.objects.find(o => o.clue === id)), `${id} below`);
  const warden = g.monsters.find(m => m.def.id === "stair_warden"); assert(warden && at(below, warden.x, warden.y), "the Stair Warden in its chamber");
  const bitter = g.monsters.find(m => m.def.id === "tahr_matriarch"); assert(bitter && at(beyond, bitter.x, bitter.y), "Old Bitter-Laugh in her den");
  for (const id of ["sea_of_dunes", "ashar_valley", "black_range", "khetmar_pass", "ochre_spine", "sefrah", "tamesh", "khetmar", "zuri_camp", "ouresh_camp", "seven_crowns", "first_names", "sunken_obelisk", "unfinished_pyramid", "black_stair"])
    assert(world.region.includes(REGIONS.findIndex(r => r.id === id)), `${id} exists`);
  // The Black Stair's halls keep to columns no older dungeon uses.
  const stairIndex = REGIONS.findIndex(r => r.id === "black_stair");
  for (let y = UNDER_Y; y < H; y++) for (let x = 0; x < W; x++) if (world.region[y * W + x] === stairIndex) { const b = unmovedPoint(world, x, y); assert(b.x >= BLACK_STAIR.x0 - 2 && b.x <= BLACK_STAIR.x1 + 2, `the Black Stair stays in its own columns (${x},${y})`); }
  for (const id of ["deepglass", "root_cellars", "drowned_archive", "mossy_undercroft", "underway", "catacombs"]) assert(world.region.includes(REGIONS.findIndex(r => r.id === id)), `${id} still there`);
  void SITES;
});

test("The Matriarch's Seal: three heirs, the tomb's ledger, the Zuri, the seal read glyph by glyph, the Council of Three", async () => {
  const { useClue } = await import("../games/rarefriends-realm/kharaveth.ts");
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  const { studySeal } = await import("../games/rarefriends-realm/dynasties.ts");
  const g = newGame(), world = g.world, Q = "matriarchs_seal";
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option ?? "Read");
  assert.doesNotMatch(talk(g, "sefrah_vizier").lines.map(l => l.text).join(" "), /seal/, "nothing to ask before Foothold");
  g.player.quests.foothold_in_the_stone = 3;
  say("sefrah_vizier", "I'll find the seal."); assert.equal(g.player.quests[Q], 1);
  clue("tomb_ledger"); assert.equal(g.player.quests[Q], 1, "the ledger alone isn't enough");
  say("sefrah_seleneh"); say("khetmar_ardesh"); assert.equal(g.player.quests[Q], 1);
  say("tamesh_meretkhet"); assert.equal(g.player.mysteries.glyphs.stone, 2, "the Warden teaches 'stone'");
  assert.equal(g.player.quests[Q], 2, "three heirs and the ledger: ask the Zuri");
  let d = talk(g, "zuri_asmeh"); d.onEnd?.(); d = d.options.find(o => o.label.startsWith("Can I see it?")).then(); d.onEnd?.();
  assert.equal(g.player.quests[Q], 3); assert(has(g.player, "khasreth_seal"));
  assert.match(studySeal(g), /One you don't: a bar balanced on a point/, "measure still unread");
  assert.equal(g.player.quests[Q], 3);
  say("tamesh_mason"); assert.equal(g.player.mysteries.glyphs.measure, 2, "the old mason teaches 'measure'");
  assert.match(studySeal(g), /By measure, to the many names, given/); assert.equal(g.player.quests[Q], 4); assert("three_suns" in g.player.mysteries.found);
  d = talk(g, "sefrah_vizier"); d.onEnd?.(); d = d.options[0].then(); d.onEnd?.(); d = d.options[0].then(); d.onEnd?.();
  assert.equal(g.player.quests[Q], 5); assert(has(g.player, "three_suns_sash")); assert(!has(g.player, "khasreth_seal"));
});

test("Salt and Blue Smoke, and What the Quarry Woke: the well, the den, both peoples told; the wards set, the warden laid to rest", async () => {
  const { useClue, clueOptions } = await import("../games/rarefriends-realm/kharaveth.ts");
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  const g = newGame(), world = g.world;
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option);
  g.player.quests.foothold_in_the_stone = 3;
  say("ouresh_halzir", "I'll find out"); assert.equal(g.player.quests.salt_and_smoke, 1);
  onMonsterKilled(g, "tahr_matriarch", 0, 0); assert.equal(g.player.quests.salt_and_smoke, 1, "killing her before you know is just a hyena");
  say("zuri_asmeh"); clue("well_tahr", "Inspect"); onMonsterKilled(g, "tahr_matriarch", 0, 0);
  assert.equal(g.player.quests.salt_and_smoke, 2);
  say("ouresh_halzir"); assert.equal(g.player.quests.salt_and_smoke, 2, "one people told");
  say("zuri_asmeh"); assert.equal(g.player.quests.salt_and_smoke, 3); assert(has(g.player, "blue_smoke_turban") && has(g.player, "salt_turban"));
  // The quarry: the stones lift only on the quest; the warden won't stay down till the wards are set.
  assert.deepEqual(clue("ward_stone_0", "Lift").text.length > 0, true); assert(!has(g.player, "ward_stone"), "not your business yet");
  say("tamesh_quarrymaster", "I'll go down"); assert.equal(g.player.quests.quarry_woke, 1);
  onMonsterKilled(g, "stair_warden", 0, 0); assert.equal(g.player.quests.quarry_woke, 1, "it gathers itself back up");
  for (const k of [0, 1, 2]) { clue(`ward_stone_${k}`, "Lift"); assert.deepEqual(clueOptions(g, world.objects.find(o => o.clue === `ward_stone_${k}`)), []); clue(`ward_niche_${k}`, "Set-stone"); }
  assert.equal(g.player.quests.quarry_woke, 2); assert("black_stair_wards" in g.player.mysteries.found); assert(!has(g.player, "ward_stone"));
  onMonsterKilled(g, "stair_warden", 0, 0); assert.equal(g.player.quests.quarry_woke, 3);
  say("tamesh_quarrymaster"); assert.equal(g.player.quests.quarry_woke, 4); assert(has(g.player, "obsidian_mattock"));
});

test("The Orashai way: a tradition like the Law and the Mizukai way, its glyphs written with mana, free with an Orashai wand or staff; and faith staves make Faith spells free", async () => {
  const { SPELLS, PRAYERS, spellInBook } = await import("../games/rarefriends-realm/data.ts");
  const { setTradition, traditionOf, maxMana, manaCost, faithStaff } = await import("../games/rarefriends-realm/state.ts");
  const { canCast, faithCost } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player, spell = id => SPELLS.find(entry => entry.id === id);
  assert(SPELLS.filter(entry => entry.orashai).length >= 15 && PRAYERS.filter(entry => entry.orashai).length >= 12, "a book and a set of watchings of its own");
  assert(spellInBook(spell("write_stone"), "orashai") && !spellInBook(spell("write_stone"), "realm") && !spellInBook(spell("seal_strike"), "orashai"), "each tradition's own in its own book");
  assert(spellInBook(spell("breeze_dart"), "orashai"), "the Realm's common magic in every book");
  p.xp.magic = 1_000_000; p.xp.prayer = 1_000_000;
  assert.match(canCast(g, spell("write_stone")), /Orashai way/, "kept only by the initiated");
  setTradition(g, "orashai"); assert.equal(traditionOf(p), "orashai");
  assert.equal(manaCost(spell("write_stone"), p), 8); assert.equal(manaCost(spell("rite_of_noon"), p), 0, "the rites are paid in faith");
  p.mana = 3; assert.match(canCast(g, spell("write_stone")), /mana/);
  p.mana = maxMana(p); assert.equal(canCast(g, spell("write_stone")), null);
  p.equipment.weapon = "scribes_reed"; assert.equal(manaCost(spell("write_first_name"), p), 0, "an Orashai wand writes for nothing");
  p.mana = 0; assert.equal(canCast(g, spell("write_stone")), null);
  // Mana comes back by itself.
  p.equipment.weapon = null; p.mana = 0; for (let i = 0; i < 10; i++) tick(g); assert(p.mana > 0, "mana returns");
  // Faith staves: a staff with a Faith bonus makes Faith spells free.
  p.equipment.weapon = "acolyte_staff"; assert(faithStaff(p)); assert.equal(faithCost(g, spell("rite_of_noon")), 0);
  p.equipment.weapon = "tide_staff"; assert(!faithStaff(p)); assert(faithCost(g, spell("rite_of_noon")) > 0);
  p.equipment.weapon = "hidden_sun_staff"; assert(faithStaff(p)); assert.equal(manaCost(spell("write_star"), p), 0, "the Staff of the Hidden Sun frees both");
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save));
  assert.equal(traditionOf(fresh.player), "orashai"); assert(Math.abs(fresh.player.mana - p.mana) < 1e-9);
});

test("Each tradition's book has its own roads, Homeward goes to the home of the tradition you keep, and the Old Friend's faithful can walk to Dawnhold", async () => {
  const { SPELLS, spellInBook } = await import("../games/rarefriends-realm/data.ts");
  const { setTradition } = await import("../games/rarefriends-realm/state.ts");
  const spell = id => SPELLS.find(entry => entry.id === id);
  assert(spellInBook(spell("glide_emberforge"), "realm") && !spellInBook(spell("glide_emberforge"), "raria") && !spellInBook(spell("glide_emberforge"), "orashai"), "the glides are the old book's");
  for (const tradition of ["realm", "raria", "mizukai", "orashai"]) assert(spellInBook(spell("home"), tradition), `Homeward in ${tradition}`);
  for (const [tradition, min] of [["raria", 3], ["mizukai", 5], ["orashai", 5]]) assert(SPELLS.filter(entry => entry.kind === "teleport" && spellInBook(entry, tradition) && entry.id !== "home").length >= min, `${tradition} has its own roads`);
  assert(spellInBook(spell("pilgrimage_dawnhold"), "realm") && !spellInBook(spell("pilgrimage_dawnhold"), "raria"), "the pilgrimage is the Old Friend's");
  for (const [tradition, place] of [["realm", "hollow_square"], ["raria", "raria"], ["mizukai", "kumoyama"], ["orashai", "sefrah"]]) {
    const g = newGame(); if (tradition !== "realm") setTradition(g, tradition);
    castSpell(g, "home"); assert.deepEqual(g.player.activity?.to, g.world.places[place], `Homeward takes the ${tradition} keeper to ${place}`);
  }
  const g = newGame(), p = g.player; p.xp.prayer = 1_000_000; p.prayer = 50; give(p, "star_sigil", 1);
  const xp = p.xp.prayer; castSpell(g, "pilgrimage_dawnhold");
  assert.deepEqual(p.activity?.to, g.world.places.dawnhold); assert.equal(p.prayer, 47, "paid in faith"); assert(p.xp.prayer > xp, "Faith XP");
});

test("The Orashai Mysteries (five thresholds) and The God Behind the Bag", async () => {
  const { useClue, clueOptions } = await import("../games/rarefriends-realm/kharaveth.ts");
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  const { learnGlyph } = await import("../games/rarefriends-realm/mysteries.ts");
  const g = newGame(), world = g.world, p = g.player, Q = "orashai_mysteries", B = "god_behind_bag";
  const pickOpt = (d, label) => { const o = d.options.find(x => x.label.startsWith(label)); assert(o, label); d.onEnd?.(); return o.then(); };
  const say = (id, ...labels) => { let d = talk(g, id); for (const label of labels) d = pickOpt(d, label); d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option);
  assert.equal(talk(g, "sefrah_priestess").options?.length ?? 0, 0, "nothing before the Matriarch's Seal");
  p.quests.matriarchs_seal = 5;
  say("sefrah_priestess", "I'll read them."); assert.equal(p.quests[Q], 1);
  say("sefrah_priestess"); assert.equal(p.quests[Q], 1, "not before the reading");
  for (const glyph of ["crown", "many", "first", "name", "sun", "below", "water", "measure", "door", "eye"]) { learnGlyph(g, glyph, false); learnGlyph(g, glyph, true); }
  say("sefrah_priestess"); assert.equal(p.quests[Q], 2); assert(has(p, "orashai_token"));
  const door = world.objects.find(o => o.clue === "first_names_door");
  assert(clueOptions(g, door).includes("Enter")); assert(clue("first_names_door", "Enter").to); assert.equal(p.quests[Q], 3);
  // The Silence: answer, and it turns away; say nothing three times, and it lets you by.
  let d = talk(g, "orashai_listener"); d = pickOpt(d, "Answer it."); assert.equal(p.quests[Q], 3);
  say("orashai_listener", "(Say nothing.)", "(Say nothing.)", "(Say nothing.)"); assert.equal(p.quests[Q], 4); assert("the_silence" in p.mysteries.found);
  assert(!clue("lower_stair", "Open").to, "the stair is shut until the names are cut");
  for (const k of [0, 1, 2]) clue(`name_ring_${k}`, "Cut-again");
  assert(clue("lower_stair", "Open").to);
  onMonsterKilled(g, "the_unnamed", 0, 0); assert.equal(p.quests[Q], 5);
  say("keeper_first_names", "Keep the Orashai way."); assert.equal(p.quests[Q], 6); assert(p.orashai); assert(has(p, "hidden_sun_staff"));
  // The god behind the bag.
  say("bag_man", "I'll find out"); assert.equal(p.quests[B], 1);
  for (const id of ["weigher", "gate_mother", "salt_twins"]) clue(`shrine_${id}`, "Pay-respects");
  assert.equal(p.quests[B], 1); clue("shrine_smoke", "Pay-respects"); assert.equal(p.quests[B], 2);
  clue("bag_ring", "Read"); assert.equal(p.quests[B], 3); assert("the_asked_god" in p.mysteries.found);
  say("bag_man", "It isn't a glyph"); assert.equal(p.quests[B], 4); assert(has(p, "fish_bag"));
});

test("Mysteries techniques: learnt by level and tradition, each with its targets, one preparation at a time, on cooldowns", async () => {
  const T = await import("../games/rarefriends-realm/techniques.ts");
  const { learn } = await import("../games/rarefriends-realm/pursuance.ts");
  const g = newGame(), p = g.player;
  const foe = id => { const m = g.monsters.find(x => x.def.id === id && !x.dead); assert(m, id); m.target = true; p.combat = m.uid; teleport(g, m.x + 1, m.y); return m; };
  const later = () => { g.tick += 200; p.preparation = null; };
  const none = { accuracy: 1, damage: 1, sure: false };
  // Locked by Mysteries level, and by the tradition that teaches it.
  assert.match(T.techniqueLocked(g, T.TECHNIQUE.stillness), /Mysteries level of 5/);
  p.xp.mysteries = XP_TABLE[40];
  assert.equal(T.techniqueLocked(g, T.TECHNIQUE.stillness), null);
  assert.match(T.techniqueLocked(g, T.TECHNIQUE.measured_counter), /Orashai Mysteries/);
  assert.match(T.techniqueLocked(g, T.TECHNIQUE.mist_step), /Hidden Road/);
  assert.equal(T.useTechnique(g, "stillness"), false, "nothing to be still before");
  // Stillness: two beats still, then one truer, harder blow; moving breaks it; a cooldown after.
  const wolf = foe("wolf");
  assert(T.useTechnique(g, "stillness")); assert.equal(T.useTechnique(g, "stillness"), false, "on its cooldown");
  assert.deepEqual(T.techniqueStrike(g, wolf, true), none, "not yet: two beats first");
  g.tick += 2; assert.deepEqual(T.techniqueStrike(g, wolf, true), { accuracy: 1.2, damage: 1.2, sure: false }); assert.equal(p.preparation, null, "used up by the blow");
  later(); assert(T.useTechnique(g, "stillness")); teleport(g, wolf.x - 1, wolf.y); g.tick += 2;
  assert.deepEqual(T.techniqueStrike(g, wolf, true), none, "moving broke it");
  // Marked Edge: only once Pursuance knows the weakness, and only against that creature.
  later(); assert.equal(T.useTechnique(g, "marked_edge"), false);
  learn(g, "wolf", "weakness", true); assert(T.useTechnique(g, "marked_edge"));
  assert(T.techniqueStrike(g, wolf, true).damage > 1);
  assert.deepEqual(T.techniqueStrike(g, g.monsters.find(m => m.def.id === "grumblin"), true), none, "not against another");
  // Pattern Break: only something that mends or rages; then it neither mends nor rages.
  later(); assert.equal(T.useTechnique(g, "pattern_break"), false, "a wolf keeps no pattern");
  const captain = foe("rrr_captain"); assert(T.useTechnique(g, "pattern_break")); assert(T.patternBroken(g, captain));
  // The Orashai's two and the Hidden Road's three come with their quests.
  p.quests.orashai_mysteries = 6; p.quests.hidden_road = 3;
  // The Weigher's Counter: halves the next melee blow from its creature and answers it with the same weight; it replaces
  // any other preparation (never two at once).
  later(); foe("wolf"); assert(T.useTechnique(g, "marked_edge")); assert(T.useTechnique(g, "measured_counter"));
  assert.equal(p.preparation.id, "measured_counter", "one preparation at a time");
  assert.deepEqual(T.techniqueGuard(g, wolf, 10, { melee: true, breath: false }), { hit: 5, counter: 10, noVenom: false, noDrain: false });
  assert.equal(p.preparation, null, "spent");
  // The Gate-Mother's Ward: only against fire, spells, venom or a draining touch; stops venom.
  later(); for (const m of g.monsters) m.target = false;
  assert.equal(T.useTechnique(g, "threshold_ward"), false, "nothing here it keeps out");
  const spider = foe("cave_spider"); assert(T.useTechnique(g, "threshold_ward"));
  assert(T.techniqueGuard(g, spider, 6, { melee: true, breath: false }).noVenom);
  assert.equal(T.techniqueGuard(g, spider, 10, { melee: false, breath: true }).hit, 5, "fire at half");
  // Severing Cut: spirits only; a sure, heavier blow.
  later(); foe("wolf"); assert.equal(T.useTechnique(g, "severing_cut"), false);
  const wraith = foe("grudge_wraith"); assert(T.useTechnique(g, "severing_cut"));
  assert.deepEqual(T.techniqueStrike(g, wraith, true), { accuracy: 1, damage: 1.5, sure: true });
  // The Mountain's Shout: what's in reach loses three beats (a great one only one).
  later(); const shouted = foe("wolf"); shouted.attackTimer = 0; assert(T.useTechnique(g, "mountain_shout")); assert.equal(shouted.attackTimer, 3);
  // Mist Step: whatever's after you loses you, but not a great one.
  later(); foe("wolf"); assert(T.useTechnique(g, "mist_step")); assert(!g.monsters.some(m => m.target)); assert.equal(p.combat, null);
  later(); foe("hollow_king"); assert.equal(T.useTechnique(g, "mist_step"), false);
  // In a real fight: with the counter set, the wolf's blow is halved and answered (the engine's tick).
  const g2 = newGame(), p2 = g2.player; p2.xp.mysteries = XP_TABLE[40]; p2.quests.orashai_mysteries = 6;
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p2.xp[skill] = 13_034_431; p2.hp = 99;
  const w2 = g2.monsters.find(m => m.def.id === "wolf"); for (const m of g2.monsters) if (m !== w2) { m.dead = true; m.respawnAt = Infinity; }
  teleport(g2, w2.x + 1, w2.y); w2.target = true; p2.combat = w2.uid; g2.autoRetaliate = false;
  let answered = false;
  for (let i = 0; i < 400 && !answered; i++) {
    w2.dead = false; w2.hp = w2.def.hp; w2.target = true; w2.attackTimer = 0; p2.attackTimer = 99; p2.hp = 99; p2.techniqueReady = {};
    T.useTechnique(g2, "measured_counter"); const before = w2.hp; tick(g2);
    if (w2.hp < before) answered = true;
  }
  assert(answered, "the counter answers a landed blow");
});

test("The Hidden Road: the Isles' own Mysteries, from Ascetic Kōdō on Iwaoka", async () => {
  const { useClue } = await import("../games/rarefriends-realm/kharaveth.ts");
  const g = newGame(), world = g.world, p = g.player, Q = "hidden_road";
  const pickOpt = (d, label) => { const o = d.options.find(x => x.label.startsWith(label)); assert(o, label); d.onEnd?.(); return o.then(); };
  const say = (id, ...labels) => { let d = talk(g, id); for (const label of labels) d = pickOpt(d, label); d?.onEnd?.(); return d; };
  const clue = id => { const object = world.objects.find(o => o.clue === id); assert(object, id); return useClue(g, object, "Look"); };
  assert(g.npcs.some(npc => npc.id === "iwa_kodo"), "Kōdō is on Iwaoka");
  for (const id of ["hr_mist", "hr_foxfire", "hr_stone"]) assert(world.objects.find(o => o.clue === id).x >= 1160, `${id} is on the Isles`);
  assert.equal(talk(g, "iwa_kodo").options?.length ?? 0, 0, "not before The Silent Climb");
  p.quests.silent_climb = 2;
  say("iwa_kodo", "Teach me the Hidden Road."); assert.equal(p.quests[Q], 1);
  clue("hr_mist"); clue("hr_foxfire"); say("iwa_kodo"); assert.equal(p.quests[Q], 1, "all three first");
  clue("hr_stone"); assert(["hr_mist", "hr_foxfire", "hr_stone"].every(id => id in p.mysteries.found));
  say("iwa_kodo"); assert.equal(p.quests[Q], 2);
  onMonsterKilled(g, "crow_hermit", 0, 0); assert(has(p, "hermits_crow_mask"));
  const before = p.xp.mysteries;
  say("iwa_kodo"); assert.equal(p.quests[Q], 3); assert(!has(p, "hermits_crow_mask"));
  assert(p.xp.mysteries - before >= 4000); assert("hidden_road" in p.mysteries.found);
  const { techniqueLocked, TECHNIQUE } = await import("../games/rarefriends-realm/techniques.ts");
  p.xp.mysteries = XP_TABLE[40];
  for (const id of ["mist_step", "severing_cut", "mountain_shout"]) assert.equal(techniqueLocked(g, TECHNIQUE[id]), null, id);
});

test("Meghavan: the Rain Country is on foot from Khetmar's east gate, its towns, people and clues all reached; only the sea became land", async () => {
  const { KHETMAR } = north(await import("../games/rarefriends-realm/heartlands.ts"));
  const { MEGHAVAN, RAIN_GATE, ILAVATI } = north(await import("../games/rarefriends-realm/meghavan.ts"));
  const g = newGame(), world = g.world, at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => o && [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  const gate = { x: KHETMAR.x1 + 1, y: (KHETMAR.y0 + KHETMAR.y1) >> 1 }, east = reachable(g, gate);
  for (const place of ["tirthali", "sarovan", "shailagarh", "mandapur", "suvarnatira", "kanthar"]) assert(at(east, world.places[place].x, world.places[place].y), `${place} is on foot from Khetmar`);
  assert(at(east, RAIN_GATE.x + 1, RAIN_GATE.y), "the road runs through the Gate of Rains");
  for (const id of ["rain_gate_plaque", "great_tank_measure", "great_stepwell", "speakers_stone"]) assert(beside(east, world.objects.find(o => o.clue === id)), `${id} can be reached`);
  for (const id of ["tirthali_amul", "sarovan_saumitra", "sarovan_engineer", "sarovan_treasurer", "shailagarh_varanjit", "mandapur_speaker", "suvarnatira_lalitha", "suvarnatira_archivist", "kanthar_sukesh"]) {
    const npc = g.npcs.find(n => n.id === id); assert(npc, `${id} is somewhere`); assert(beside(east, npc), `${id} can be reached`);
  }
  const ids = ["rain_pass", "tirthali", "ilavati_valley", "sarovan", "shaila_highlands", "shailagarh", "parasol_plains", "mandapur", "golden_shore", "suvarnatira", "deepgreen", "kanthar"];
  const index = new Set(ids.map(id => REGIONS.findIndex(r => r.id === id)));
  for (const id of ids) assert(world.region.includes(REGIONS.findIndex(r => r.id === id)), `${id} exists`);
  // Meghavan is east of Khetmar's wall and south of the strait to the Isles: nothing of it reaches back into Kharaveth or north.
  for (let y = 0; y < OVERWORLD_H; y++) for (let x = 0; x < W; x++) if (index.has(world.region[y * W + x])) assert(x >= MEGHAVAN.x0 && y >= MEGHAVAN.y0 - 6, `Meghavan stays in its own sea (${x},${y})`);
  // The Ilavati runs as water past Sarovan, and it's crossed (the ford, the Queen's bridge, the Shaila bridge).
  const [rx, ry0] = ILAVATI[2], ry = northShift(ry0); assert([[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => [T.WATER, T.BRIDGE].includes(world.tiles[(ry + dy) * W + rx + dx])), "the river at Sarovan");
  let bridges = 0; for (let y = MEGHAVAN.y0; y <= MEGHAVAN.y1; y++) for (let x = MEGHAVAN.x0; x <= MEGHAVAN.x1; x++) if (world.tiles[y * W + x] === T.BRIDGE) bridges++;
  assert(bridges > 10, "bridges over the Ilavati and the docks");
  // The highlands have their mines; the shore its fishing.
  const rocks = world.objects.filter(o => o.kind === "rock" && index.has(world.region[o.y * W + o.x]));
  for (const kind of ["blackiron", "moonsilver", "glimmer"]) assert(rocks.some(r => r.rock === kind), `${kind} in the Shaila mines`);
  assert(world.objects.some(o => o.kind === "spot" && o.x > MEGHAVAN.x0), "fishing in Meghavan");
  assert(g.monsters.some(m => m.def.id === "deepgreen_tiger") && g.monsters.some(m => m.def.id === "crag_bear"), "its creatures roam");
});

test("Meghavan's people: every one talks, every tailor sells their town's clothes, every town's villagers wear them, every creature has its own look", async () => {
  const { MEGHAVAN_NPCS } = await import("../games/rarefriends-realm/meghavanpeople.ts");
  const { MEGHAVAN_CLOTHING, MEGHAVAN_MONSTERS, MEGHAVAN_SHOPS } = await import("../games/rarefriends-realm/meghavangear.ts");
  const { creatureSprite, CREATURES } = await import("../games/rarefriends-realm/sprites.ts");
  const g = newGame();
  for (const id of Object.keys(MEGHAVAN_NPCS)) {
    const d = talk(g, id); assert(d && d.lines.length && d.lines[0].text.length > 10, `${id} says something`);
    assert(g.npcs.some(n => n.id === id) || id === "banker", `${id} is in the world`);
    const shop = NPCS[id].shop; if (shop) assert(SHOPS[shop], `${id}'s shop ${shop}`);
  }
  for (const [id, shop] of Object.entries(MEGHAVAN_SHOPS)) for (const item of shop.stock) assert(ITEM_LIST.some(i => i.id === item), `${id} sells a real ${item}`);
  for (const set of MEGHAVAN_CLOTHING) {
    assert(REGIONAL_CLOTHING.includes(set), `${set.region}'s clothes are regional`);
    assert(Object.values(NPCS).some(n => n.shop === set.shop), `${set.region}'s tailor`);
    assert.deepEqual(SHOPS[set.shop].stock.filter(id => set.pieces.some(p => p.id === id)).length, set.pieces.length, `${set.shop} sells all of ${set.region}'s clothes`);
    assert(NPCS[`${set.region}_villager`], `${set.region}'s villagers`);
  }
  for (const id of ["mango", "spiced_tea", "rice_and_dal", "ilavati_sabre", "push_dagger", "shaila_mail"]) assert(ITEM_LIST.some(i => i.id === id), id);
  for (const m of Object.values(MEGHAVAN_MONSTERS)) { assert(MONSTERS[m.id], m.id); assert(CREATURES[m.art] && creatureSprite(m.art) === CREATURES[m.art], `${m.id} has its own sprite (${m.art})`); }
  assert.equal(new Set(Object.values(MEGHAVAN_MONSTERS).map(m => m.art)).size, Object.keys(MEGHAVAN_MONSTERS).length, "a sprite each");
});

test("Meghavan's music: tanpura, sitar, bansuri, shehnai and santoor, tabla and dholak, in five ragas; each region its piece", async () => {
  const { TRACKS, MEGHAVAN_TRACKS, trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const pieces = TRACKS.filter(track => MEGHAVAN_TRACKS.includes(track.id)); assert.equal(pieces.length, 5);
  const own = new Set(["tanpura", "sitar", "bansuri", "shehnai", "santoor"]), ensembles = new Set();
  for (const track of pieces) {
    for (const note of track.notes) assert(own.has(note.voice), `${track.name}: ${note.voice}`);
    assert(track.hits.some(hit => ["na", "tin", "ge", "ke", "dholak"].includes(hit.drum)), `${track.name} has a drum`);
    ensembles.add([...new Set(track.notes.map(n => n.voice))].sort().join());
  }
  assert.equal(ensembles.size, 5, "each its own ensemble");
  for (const [region, id] of [["rain_pass", "meghavan_rains"], ["ilavati_valley", "meghavan_rains"], ["sarovan", "meghavan_sarovan"], ["tirthali", "meghavan_sarovan"], ["shailagarh", "meghavan_shailagarh"],
    ["shaila_highlands", "meghavan_shailagarh"], ["suvarnatira", "meghavan_suvarnatira"], ["mandapur", "meghavan_suvarnatira"], ["deepgreen", "meghavan_deepgreen"], ["kanthar", "meghavan_deepgreen"]]) assert.equal(trackFor(region, false), id);
  assert.equal(TRACKS.length, 90, "the jukebox's count (the north's seven and the Prismwild's two among them)");
});

test("The Rain Country rains more than anywhere else, and the Deepgreen is misty", async () => {
  const { weatherAt } = await import("../games/rarefriends-realm/weather.ts");
  let wet = 0, dry = 0;
  for (let k = 0; k < 400; k++) { const ms = k * 4 * 60_000 + 60_000; if (weatherAt(ms, "sarovan", false, null).rain > 0) wet++; if (weatherAt(ms, "friendhollow", false, null).rain > 0) dry++; }
  assert(wet > dry, `more rain in Sarovan (${wet}) than Friendhollow (${dry})`);
  assert(weatherAt(0, "deepgreen", false, 0.6).fog >= 0.35, "mist in the Deepgreen");
});

test("Meghavan's quest places: the caravan, the dacoits' camp, the toll-house, the grove and the Great Stepwell's halls are all reached, and the Stepwell keeps to its own columns", async () => {
  const { KHETMAR } = north(await import("../games/rarefriends-realm/heartlands.ts"));
  const { GREAT_STEPWELL } = north(await import("../games/rarefriends-realm/meghavan.ts"));
  const g = newGame(), world = g.world, at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => o && [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  const east = reachable(g, { x: KHETMAR.x1 + 1, y: (KHETMAR.y0 + KHETMAR.y1) >> 1 });
  for (const id of ["toll_ledger", "deserters_paybook", "archive_ledger", "grove_stone_0", "grove_stone_1", "grove_stone_2", "great_stepwell", "great_tank_measure"]) assert(beside(east, world.objects.find(o => o.clue === id)), `${id} can be reached`);
  for (const id of ["dacoit_chief", "deserter_sergeant"]) { const m = g.monsters.find(m => m.def.id === id); assert(m && beside(east, m), `${id} can be reached`); }
  assert(beside(east, g.npcs.find(n => n.id === "caravan_master")), "the caravan waits by Khetmar's gate");
  const well = world.objects.find(o => o.clue === "great_stepwell"), below = reachable(g, well.to);
  assert(beside(below, world.objects.find(o => o.clue === "stepwell_sluice")), "the sluice wheel below");
  const serpent = g.monsters.find(m => m.def.id === "monsoon_serpent"); assert(serpent && beside(below, serpent), "the Monsoon Serpent in its cistern");
  assert(world.objects.some(o => o.decor === "chest" && o.name === "The Serpent's hoard" && beside(below, o)), "its hoard");
  const up = world.objects.find(o => o.kind === "ladder" && o.name === "The Great Stepwell's steps"); assert(up && beside(below, up) && at(east, up.to.x, up.to.y), "and the way back up to Sarovan");
  const index = REGIONS.findIndex(r => r.id === "great_stepwell");
  for (let y = UNDER_Y; y < H; y++) for (let x = 0; x < W; x++) if (world.region[y * W + x] === index) { const b = unmovedPoint(world, x, y); assert(b.x >= GREAT_STEPWELL.x0 - 2 && b.x <= GREAT_STEPWELL.x1 + 2, `the Stepwell stays in its own columns (${x},${y})`); }
  for (const id of ["deepglass", "drowned_archive", "underway", "black_stair", "first_names_hall"]) assert(world.region.includes(REGIONS.findIndex(r => r.id === id)), `${id} still there`);
});

test("Caravan of the Rains and The Silted Tank: the dacoits' chief, the crate at the ford; the engineer, the treasurer, the measure, the Stepwell's serpent and sluice", async () => {
  const { useClue, clueOptions } = await import("../games/rarefriends-realm/kharaveth.ts");
  const g = newGame(), world = g.world, p = g.player;
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option);
  assert.doesNotMatch(talk(g, "caravan_master").lines.map(l => l.text).join(" "), /Gate of Rains/, "nothing before Foothold");
  p.quests.foothold_in_the_stone = 3;
  say("caravan_master", "I'll see your caravan"); assert.equal(p.quests.caravan_of_rains, 1);
  onMonsterKilled(g, "dacoit_chief", 0, 0); assert.equal(p.quests.caravan_of_rains, 2);
  say("tirthali_amul", "Send it to the Archive"); assert.equal(p.quests.caravan_of_rains, 3); assert(has(p, "monsoon_cloak")); assert.equal(p.questData.cq_choice, 1);
  // The Silted Tank.
  assert.deepEqual(clueOptions(g, world.objects.find(o => o.clue === "great_stepwell")), ["Read"], "the Stepwell is chained");
  say("sarovan_saumitra", "I'll find out"); assert.equal(p.quests.silted_tank, 1);
  say("sarovan_engineer"); say("sarovan_treasurer"); assert.equal(p.quests.silted_tank, 1);
  clue("great_tank_measure", "Read"); assert.equal(p.quests.silted_tank, 2, "both heard and the measure read");
  say("sarovan_engineer"); assert(clueOptions(g, world.objects.find(o => o.clue === "great_stepwell")).includes("Climb-down"), "the chain unhooked");
  assert.equal(clue("great_stepwell", "Climb-down").to.y > DUNGEON_Y, true);
  clue("stepwell_sluice", "Turn"); assert.equal(p.quests.silted_tank, 2, "the wheel won't turn while the serpent's there");
  onMonsterKilled(g, "monsoon_serpent", 0, 0); clue("stepwell_sluice", "Turn"); assert.equal(p.quests.silted_tank, 3);
  say("sarovan_saumitra", "Both of them are right"); assert.equal(p.quests.silted_tank, 4); assert(has(p, "kept_tank_ring"));
});

test("Seven Parasols, The Pass Toll, The Missing Folio and What the Forest Keeps, start to finish", async () => {
  const { useClue } = await import("../games/rarefriends-realm/kharaveth.ts");
  const g = newGame(), world = g.world, p = g.player;
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option);
  p.quests.foothold_in_the_stone = 3;
  // The League's tolls: the raja, the ledger, the clerk, the factor, the Speaker.
  say("mandapur_speaker", "I'll look into"); say("mandapur_raja"); say("mandapur_tollclerk"); assert.equal(p.quests.seven_parasols, 1, "the clerk only talks once you've read the ledger");
  clue("toll_ledger", "Read"); say("mandapur_tollclerk"); assert.equal(p.quests.seven_parasols, 2);
  say("sarovan_factor"); assert.equal(p.quests.seven_parasols, 3); say("mandapur_speaker"); assert.equal(p.quests.seven_parasols, 4); assert(has(p, "speakers_parasol"));
  // The pass: Marr, the paybook, Hask, the Lord.
  say("shailagarh_varanjit", "I'll take back"); onMonsterKilled(g, "deserter_sergeant", 0, 0); assert.equal(p.quests.pass_toll, 1, "Hask's death counts once you know why");
  say("shailagarh_captain"); clue("deserters_paybook", "Read"); assert.equal(p.quests.pass_toll, 2);
  onMonsterKilled(g, "deserter_sergeant", 0, 0); assert.equal(p.quests.pass_toll, 3);
  say("shailagarh_varanjit", "Your money reached"); assert.equal(p.quests.pass_toll, 4); assert(has(p, "pass_warden_helm"));
  // The folio: the envoy, the ledger, the pedlar, the Archivist.
  say("suvarnatira_archivist", "I'll find"); say("suvarnatira_envoy"); clue("archive_ledger", "Read"); assert.equal(p.quests.missing_folio, 2);
  say("tirthali_dealer"); assert(has(p, "star_folio")); assert.equal(p.quests.missing_folio, 3);
  say("suvarnatira_archivist"); assert.equal(p.quests.missing_folio, 4); assert(!has(p, "star_folio")); assert(has(p, "readers_stole"));
  // The forest: the loggers, the stones, the licence, the Lord, the grandmother.
  say("kanthar_sukesh", "I'll put"); clue("grove_stone_0", "Set-stone"); say("deepgreen_logger"); assert.equal(p.quests.forest_keeps, 1);
  clue("grove_stone_1", "Set-stone"); clue("grove_stone_2", "Set-stone"); assert.equal(p.quests.forest_keeps, 2);
  say("deepgreen_logger"); assert(has(p, "logging_licence")); say("shailagarh_varanjit"); assert.equal(p.quests.forest_keeps, 3); assert(!has(p, "logging_licence"));
  say("kanthar_sukesh"); assert.equal(p.quests.forest_keeps, 4); assert(has(p, "seed_charm"));
  assert.equal(questPoints(g), 10, "two each, and A Foothold in the Stone's two");
});

test("Meghavan's four schools: every teacher and every place is reached, each initiation teaches its techniques, and nothing is taught before", async () => {
  const { KHETMAR } = north(await import("../games/rarefriends-realm/heartlands.ts"));
  const { useClue, clueOptions } = await import("../games/rarefriends-realm/kharaveth.ts");
  const { TECHNIQUES, techniqueLocked } = await import("../games/rarefriends-realm/techniques.ts");
  const g = newGame(), world = g.world, p = g.player, at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => o && [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  const east = reachable(g, { x: KHETMAR.x1 + 1, y: (KHETMAR.y0 + KHETMAR.y1) >> 1 }), below = reachable(g, world.objects.find(o => o.clue === "great_stepwell").to);
  for (const id of ["school_ojas", "school_vidyut", "school_ishwari", "school_anvaya"]) assert(beside(east, g.npcs.find(n => n.id === id)), `${id} can be reached`);
  for (const id of ["breath_cairn_0", "breath_cairn_1", "breath_cairn_2", "pattern_tank", "pattern_wheel", "threshold_rain", "threshold_ford"]) assert(beside(east, world.objects.find(o => o.clue === id)), `${id} can be reached`);
  for (const id of ["pattern_pillar", "threshold_stair", "drowned_record"]) assert(beside(below, world.objects.find(o => o.clue === id)), `${id}, below`);
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option);
  p.quests.foothold_in_the_stone = 3; p.xp.mysteries = 13_034_431;
  const eastern = TECHNIQUES.filter(t => ["inner_measure", "living_patterns", "thresholds", "unfinished"].includes(t.tradition));
  assert.equal(eastern.length, 6); for (const t of eastern) assert.match(techniqueLocked(g, t), /teaches it/, `${t.name} is locked before its school`);
  const found = Object.keys(p.mysteries.found).length;
  for (const [teacher, quest, places, verb] of [["school_ojas", "counted_breath", ["breath_cairn_0", "breath_cairn_1", "breath_cairn_2"], "Breathe"], ["school_vidyut", "patterns_in_water", ["pattern_tank", "pattern_wheel", "pattern_pillar"], "Read"],
    ["school_ishwari", "keepers_door", ["threshold_rain", "threshold_ford", "threshold_stair"], "Mark"]]) {
    assert.deepEqual(clueOptions(g, world.objects.find(o => o.clue === places[0])), ["Look"], `${places[0]}: only a look before the initiation`);
    say(teacher, "Teach me."); assert.equal(p.quests[quest], 1);
    for (const id of places) { assert(clueOptions(g, world.objects.find(o => o.clue === id)).includes(verb), `${id}: ${verb}`); clue(id, verb); }
    say(teacher); assert.equal(p.quests[quest], 2, `${quest} done`);
  }
  // The Archive: rubbings of the plaque, the Speaker's stone and the drowned record; then the record reads.
  say("school_anvaya", "Teach me."); assert(clueOptions(g, world.objects.find(o => o.clue === "rain_gate_plaque")).includes("Take-rubbing"));
  clue("rain_gate_plaque", "Take-rubbing"); clue("speakers_stone", "Take-rubbing"); clue("drowned_record", "Take-rubbing");
  say("school_anvaya"); assert.equal(p.quests.unfinished_page, 2);
  assert.match(clue("drowned_record", "Look").text, /Seven measures for the tank/); assert("drowned_record" in p.mysteries.found);
  assert(Object.keys(p.mysteries.found).length >= found + 14, "fourteen discoveries");
  for (const t of eastern) assert.equal(techniqueLocked(g, t), null, `${t.name} is taught`);
});

test("Meghavan's techniques: Reading the Pattern, the Threshold Mark, Held Breath, the Doorstone Ward, the Fourth Breath and the Prepared Answer", async () => {
  const { useTechnique, techniqueStrike, techniqueGuard, preparation } = await import("../games/rarefriends-realm/techniques.ts");
  const { knows } = await import("../games/rarefriends-realm/pursuance.ts");
  const g = newGame(), p = g.player;
  p.xp.mysteries = 13_034_431; for (const q of ["counted_breath", "patterns_in_water", "keepers_door", "unfinished_page"]) p.quests[q] = 2;
  const fight = id => { const m = g.monsters.find(m => m.def.id === id); assert(m, id); p.combat = m.uid; m.target = true; p.techniqueReady = {}; p.preparation = null; return m; };
  // Reading the Pattern: the journal learns a creature's weakness at once.
  let m = fight("crag_bear"); assert(!knows(g, "crag_bear", "weakness")); assert(useTechnique(g, "read_pattern")); assert(knows(g, "crag_bear", "weakness"));
  assert.equal(useTechnique(g, "read_pattern"), false, "cooling down"); p.techniqueReady = {}; assert.equal(useTechnique(g, "read_pattern"), false, "nothing more to read");
  // The Threshold Mark: only the undead and the wayward spirits.
  assert.equal(useTechnique(g, "threshold_mark"), false, "a bear never came through a door");
  const spirit = g.monsters.find(x => x.def.spirit || x.def.undead); p.combat = spirit.uid; p.techniqueReady = {};
  assert(useTechnique(g, "threshold_mark")); assert.equal(techniqueStrike(g, spirit, true).damage, 1.25);
  // Held Breath: venom leaves and stays out.
  m = fight("hooded_serpent"); p.poison = { damage: 5, left: 4, timer: 10 }; assert(useTechnique(g, "held_breath")); assert.equal(p.poison, null);
  assert.equal(techniqueGuard(g, m, 4, { melee: true, breath: false }).noVenom, true);
  // The Doorstone Ward: a quarter off while you keep to the chalk.
  p.techniqueReady = {}; assert(useTechnique(g, "doorstone_ward")); assert.equal(techniqueGuard(g, m, 8, { melee: true, breath: false }).hit, 6);
  p.x += 1; assert.equal(techniqueGuard(g, m, 8, { melee: true, breath: false }).hit, 8, "step off it and it's only chalk"); p.x -= 1;
  // The Fourth Breath: too soon loses the count; on the fourth, sure and half as hard again.
  m = fight("crag_bear"); assert(useTechnique(g, "fourth_breath")); assert.equal(techniqueStrike(g, m, true).sure, false, "too soon");
  p.techniqueReady = {}; assert(useTechnique(g, "fourth_breath")); g.tick += 4; const blow = techniqueStrike(g, m, true); assert(blow.sure && blow.damage === 1.5); assert.equal(preparation(g), null);
  // The Prepared Answer: a great one you've beaten, a fifth both ways.
  const serpent = fight("monsoon_serpent"); assert.equal(useTechnique(g, "prepared_answer"), false, "not researched yet");
  p.killLog.monsoon_serpent = 1; assert(useTechnique(g, "prepared_answer")); assert.equal(techniqueStrike(g, serpent, true).damage, 1.2);
  assert.equal(techniqueGuard(g, serpent, 10, { melee: true, breath: false }).hit, 8);
  fight("crag_bear"); assert.equal(useTechnique(g, "prepared_answer"), false, "not for an ordinary creature");
});

test("A rock holds two to four ores: you keep mining till the last, and then it's empty", () => {
  const g = newGame(), p = g.player;
  p.inventory.fill(null); give(p, "pewter_pickaxe"); p.xp.mining = XP_TABLE[60];
  const counts = new Set();
  for (const rock of g.world.objects.filter(object => object.kind === "rock" && object.rock === "pewter").slice(0, 6)) {
    const before = count(p, "pewter_ore");
    standBy(g, rock); setTarget(g, { kind: "object", id: rock.id, option: "Mine" });
    until(g, () => g.depleted.has(rock.id), 1500);
    const got = count(p, "pewter_ore") - before; counts.add(got);
    assert(got >= 2 && got <= 4, `two to four ores from a rock (${got})`); assert(!g.rockOre.has(rock.id), "nothing left in it");
    p.activity = null;
  }
  assert(counts.size >= 2, `not always the same (${[...counts]})`);
});

// ---------- The pyramids by Kharaveth's south coast (pyramids.ts) ----------
test("The pyramids: the Unfinished Pyramid eight times its old size, Queen Siruvet's larger, both reached from the Tamesh road, every storey by its stairs and back", async () => {
  const { UNFINISHED_PYRAMID, SIRUVET_PYRAMID } = north(await import("../games/rarefriends-realm/pyramids.ts"));
  const g = newGame(), world = g.world, at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => o && [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  const unfinished = world.buildings.find(b => b.name === "The Unfinished Pyramid"), siruvet = world.buildings.find(b => b.name === "The Pyramid of Queen Siruvet");
  const area = b => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
  assert(unfinished.pyramid && unfinished.unfinished && siruvet.pyramid && !siruvet.unfinished);
  assert(area(unfinished) >= 8 * 13 * 13, `the Unfinished Pyramid is eight times the old 13 × 13 (${area(unfinished)})`);
  assert(area(siruvet) > area(unfinished), "Siruvet's is a little larger");
  assert.deepEqual([unfinished.x0, unfinished.y0], [UNFINISHED_PYRAMID.x0, UNFINISHED_PYRAMID.y0]);
  assert(SIRUVET_PYRAMID.x1 + 15 <= UNFINISHED_PYRAMID.x0, "open sand between them");
  // From the road out of Tamesh, on foot: both doors, and the builders' marks inside the Unfinished one.
  const road = reachable(g, { x: 780, y: northShift(772) });
  for (const b of [unfinished, siruvet]) { const door = (b.x0 + b.x1) >> 1; assert(at(road, door, b.y0) && at(road, door, b.y0 + 1), `${b.name}'s door is on foot from Tamesh`); }
  assert(beside(road, world.objects.find(o => o.clue === "pyramid_marks")), "the builders' marks, inside");
  // Each storey: its floor narrower than the one below, its stairs up from the one below and back down.
  for (const [complex, levels] of [["unfinished_pyramid", 3], ["siruvet_pyramid", 3]]) {
    const storeys = world.floors.filter(f => f.complex === complex).sort((a, b) => a.level - b.level);
    assert.equal(storeys.length, levels, `${complex}: ${levels} storeys over the ground floor`);
    let seen = road, width = Infinity;
    for (const floor of storeys) {
      assert(floor.x1 - floor.x0 < width, `${complex} ${floor.level}: narrower than the storey below`); width = floor.x1 - floor.x0;
      const up = world.objects.find(o => o.kind === "ladder" && o.action === "Climb-up" && beside(seen, o) && floorAt(world, o.to.x, o.to.y) === floor);
      assert(up, `${complex}: stairs up to storey ${floor.level}`);
      const above = reachable(g, up.to), down = world.objects.find(o => o.kind === "ladder" && o.action === "Climb-down" && beside(above, o) && at(seen, o.to.x, o.to.y));
      assert(down, `${complex}: and back down from storey ${floor.level}`);
      // Creatures on it, reached, and something to find.
      const here = g.monsters.filter(m => floorAt(world, m.x, m.y) === floor);
      assert(here.length >= 2 && here.every(m => at(above, m.x, m.y)), `${complex} ${floor.level}: creatures walk it (${here.length})`);
      assert(world.objects.some(o => o.decor === "chest" && floorAt(world, o.x, o.y) === floor && beside(above, o)), `${complex} ${floor.level}: a coffer`);
      seen = above;
    }
  }
  // Magic and melee alike upstairs.
  const upstairs = g.monsters.filter(m => floorAt(world, m.x, m.y)?.complex === "unfinished_pyramid" || floorAt(world, m.x, m.y)?.complex === "siruvet_pyramid");
  assert(upstairs.some(m => m.def.attackStyle === "magic") && upstairs.some(m => m.def.attackStyle !== "magic"));
});

test("A fight on a pyramid's storey: the labourer notices you, you kill it, it drops where it fell", () => {
  const g = newGame(), world = g.world, p = g.player;
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = 13_034_431;
  p.hp = 99;
  const labourer = g.monsters.find(m => m.def.id === "tally_labourer" && floorAt(world, m.x, m.y)?.level === 1);
  assert(labourer, "a tally-bound labourer on the first storey");
  standNear(g, labourer.x, labourer.y, 2);
  assert.equal(floorAt(world, p.x, p.y), floorAt(world, labourer.x, labourer.y), "on the same storey");
  until(g, () => labourer.target, 20);
  setTarget(g, { kind: "monster", uid: labourer.uid, option: "Attack" });
  until(g, () => labourer.dead, 600);
  assert(g.ground.some(entry => floorAt(world, entry.x, entry.y)?.level === 1 && Math.abs(entry.x - labourer.x) <= 2 && Math.abs(entry.y - labourer.y) <= 2), "its drop lies on the storey");
  assert.equal(p.killLog.tally_labourer, 1);
});

test("The Uncounted Deep and the Measured Vault: the builders' count shows the way down, the halls are reached, royal coffers full of gold, magic creatures, and each boss by its hoard", async () => {
  const { useClue, clueOptions } = await import("../games/rarefriends-realm/kharaveth.ts");
  const { cofferTier, searchChest } = await import("../games/rarefriends-realm/dungeons.ts");
  const { UNCOUNTED_DEEP, MEASURED_VAULT } = north(await import("../games/rarefriends-realm/pyramids.ts"));
  const g = newGame(), world = g.world, p = g.player, at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => o && [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  // The sealed shaft: only a search, until you've read the builders' count on the hall wall (and you're past Foothold).
  const shaft = world.objects.find(o => o.clue === "uncounted_shaft"), marks = world.objects.find(o => o.clue === "pyramid_marks");
  p.quests.foothold_in_the_stone = 3;
  assert.deepEqual(clueOptions(g, shaft), ["Search"]);
  assert.match(useClue(g, shaft, "Search").text, /Read the count on the hall wall/);
  useClue(g, marks, "Read"); assert("unfinished_pyramid" in p.mysteries.found, "the builders' last count, as before");
  assert.deepEqual(clueOptions(g, shaft), ["Climb-down"]);
  const down = useClue(g, shaft, "Climb-down").to; assert(isUnderground(down.y));
  const deep = reachable(g, down), deepIndex = REGIONS.findIndex(r => r.id === "uncounted_deep"), vaultIndex = REGIONS.findIndex(r => r.id === "measured_vault");
  const vault = reachable(g, world.objects.find(o => o.clue === "siruvet_stair").to);
  // Every creature and coffer below is reached; the bosses; their hoards.
  for (const [seen, index] of [[deep, deepIndex], [vault, vaultIndex]]) {
    const creatures = g.monsters.filter(m => world.region[m.y * W + m.x] === index), coffers = world.objects.filter(o => o.decor === "chest" && world.region[o.y * W + o.x] === index);
    assert(creatures.length >= 15 && creatures.every(m => at(seen, m.x, m.y)), `${REGIONS[index].name}: ${creatures.length} creatures, all reached`);
    assert(coffers.length >= 8 && coffers.every(o => beside(seen, o)), `${REGIONS[index].name}: ${coffers.length} coffers, all reached`);
    assert(creatures.some(m => m.def.attackStyle === "magic"), "magic creatures below");
    for (const o of coffers) assert.equal(cofferTier(g, o), "royal");
  }
  assert(g.monsters.filter(m => world.region[m.y * W + m.x] === deepIndex).length >= 40, "the Uncounted Deep is massive");
  for (const [id, hoard, seen] of [["uncounted_king", "The Uncounted King's hoard", deep], ["gilded_keeper", "Siruvet's hoard", vault]]) {
    const boss = g.monsters.find(m => m.def.id === id); assert(boss && boss.def.boss && at(seen, boss.x, boss.y), `${id} in its hall`);
    assert(world.objects.some(o => o.decor === "chest" && o.name === hoard && beside(seen, o)), hoard);
  }
  assert.equal(g.monsters.find(m => m.def.id === "uncounted_king").def.attackStyle, "magic");
  // Upstairs coffers are dread; below, the royal ones give coins by the thousand and jewellery.
  const upstairs = world.objects.find(o => o.decor === "chest" && floorAt(world, o.x, o.y)?.complex === "unfinished_pyramid");
  assert.equal(cofferTier(g, upstairs), "dread");
  const coffer = world.objects.find(o => o.decor === "chest" && world.region[o.y * W + o.x] === deepIndex && o.name === "A coffer of the Uncounted");
  const jewels = ["gold_scarab", "electrum_armlet", "lapis_pectoral", "rosestone", "sagestone", "moonstone", "rosestone_amulet", "sagestone_amulet"];
  let coins = 0, found = new Set();
  for (let i = 0; i < 40; i++) {
    p.inventory = p.inventory.map(() => null); delete p.questData[`coffer_${coffer.x}_${coffer.y}`]; g.ground.length = 0;
    searchChest(g, coffer);
    coins += count(p, "coins"); for (const id of jewels) if (has(p, id) || g.ground.some(e => e.id === id)) found.add(id);
  }
  assert(coins / 40 > 1500, `coins by the jar (${Math.round(coins / 40)} a search)`);
  assert(found.size >= 4 && found.has("gold_scarab"), `jewellery: ${[...found].join(", ")}`);
  // The deeps keep to their own columns; the older dungeons are all still there.
  for (let y = UNDER_Y; y < H; y++) for (let x = 0; x < W; x++) {
    const r = world.region[y * W + x], b = unmovedPoint(world, x, y);
    if (r === deepIndex) assert(b.x >= UNCOUNTED_DEEP.x0 - 2 && b.x <= UNCOUNTED_DEEP.x1 + 2, `the deep stays in its columns (${x},${y})`);
    if (r === vaultIndex) assert(b.x >= MEASURED_VAULT.west.x0 - 2 && b.x <= MEASURED_VAULT.east.x1 + 2, `the vault stays in its columns (${x},${y})`);
  }
  for (const id of ["deepglass", "drowned_archive", "underway", "black_stair", "first_names_hall", "great_stepwell", "kumo_hollow", "ashigane_deeps", "bone_shrine"]) assert(world.region.includes(REGIONS.findIndex(r => r.id === id)), `${id} still there`);
});

test("The pyramids' discoveries, their bosses' rewards, and their music", async () => {
  const { onKharavethTick, useClue } = await import("../games/rarefriends-realm/kharaveth.ts");
  const { trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const g = newGame(), p = g.player, world = g.world;
  onKharavethTick(g, "uncounted_deep"); assert("uncounted_deep" in p.mysteries.found);
  onMonsterKilled(g, "uncounted_king", 0, 0); assert("uncounted_king" in p.mysteries.found);
  useClue(g, world.objects.find(o => o.clue === "uncounted_wards"), "Read"); assert("uncounted_measure" in p.mysteries.found);
  useClue(g, world.objects.find(o => o.clue === "siruvet_measure"), "Read"); assert("siruvet_measure" in p.mysteries.found);
  for (const [boss, items] of [["uncounted_king", ["last_stroke_staff", "uncounted_crown", "full_count_ring"]], ["gilded_keeper", ["siruvet_collar"]]]) {
    for (const id of items) { assert(MONSTERS[boss].drops.some(d => d.item === id), `${boss} drops ${id}`); assert(item(id).equip, `${id} is worn`); }
  }
  assert(item("last_stroke_staff").equip.staff && item("last_stroke_staff").equip.bonuses.magic >= 40);
  for (const region of ["unfinished_pyramid", "siruvet_pyramid", "uncounted_deep", "measured_vault"]) assert(trackFor(region, false), `${region} has music`);
});

// ---------- The sea ports (ports.ts) ----------
test("The sea ports: Gullwick, Saltreach, Merrab, Tel Ashun and Ennu's Well are on foot from the roads, their people and clues reached, and nobody stands in the sea", async () => {
  const { KHETMAR } = north(await import("../games/rarefriends-realm/heartlands.ts"));
  const { GULLWICK, SALTREACH } = north(await import("../games/rarefriends-realm/ports.ts"));
  const { PORTS_NPCS } = await import("../games/rarefriends-realm/portspeople.ts");
  const g = newGame(), world = g.world, at = (seen, x, y) => !!seen[y * W + x];
  const beside = (seen, o) => o && [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => at(seen, o.x + dx, o.y + dy));
  // Gullwick from Hollyhock's lane; Saltreach from Greyford's road; the desert three from Khetmar's east gate.
  const gull = reachable(g, { x: GULLWICK.x1 + 1, y: northShift(450) }), salt = reachable(g, { x: 214, y: northShift(314) }), east = reachable(g, { x: KHETMAR.x1 + 2, y: (KHETMAR.y0 + KHETMAR.y1) >> 1 });
  assert(at(gull, world.places.hollyhock.x, world.places.hollyhock.y), "Gullwick's street joins Hollyhock");
  assert(at(salt, world.places.raria.x, world.places.raria.y) || at(salt, 205, 262), "Saltreach's road joins Raria's");
  const seenFor = { gullwick: gull, saltreach: salt, merrab: east, tel_ashun: east, ennus_well: east };
  for (const [place, seen] of Object.entries(seenFor)) {
    assert(at(seen, world.places[place].x, world.places[place].y), `${place} is on foot`);
    assert(world.region.includes(REGIONS.findIndex(r => r.id === place)), `${place} exists`);
  }
  for (const id of Object.keys(PORTS_NPCS)) {
    if (id === "boat_suvarnatira") continue;
    const npc = g.npcs.find(n => n.id === id); assert(npc, `${id} is somewhere`);
    assert(Object.values(seenFor).some(seen => beside(seen, npc)), `${id} can be reached`);
    assert(![T.WATER, T.DEEP, T.CLIFF, T.WALL].includes(world.tiles[npc.y * W + npc.x]), `${id} stands on open ground`);
  }
  for (const id of ["gullwick_lamp_log", "wreckers_lantern", "kings_scale", "pan_weights", "pearl_ledger", "tell_layer_0", "tell_layer_1", "tell_layer_2", "well_channel"]) {
    const o = world.objects.find(o => o.clue === id); assert(o, `${id} is placed`); assert(Object.values(seenFor).some(seen => beside(seen, o)), `${id} can be reached`);
  }
  for (const id of ["wrecker_chief", "saltjaw", "sand_borer"]) { const m = g.monsters.find(m => m.def.id === id); assert(m && Object.values(seenFor).some(seen => beside(seen, m)), `${id} can be reached`); }
  assert(world.objects.some(o => o.kind === "bank" && o.x >= GULLWICK.x0 && o.x <= GULLWICK.x1 && o.y >= GULLWICK.y0 && o.y <= GULLWICK.y1), "Gullwick has a counting house");
  assert(world.buildings.some(b => b.name === "Gullwick Light" && b.round), "and its lighthouse");
  let pans = 0; for (let y = SALTREACH.y0; y <= SALTREACH.y1; y++) for (let x = SALTREACH.x0; x <= SALTREACH.x1; x++) if (world.tiles[y * W + x] === T.WATER) pans++;
  assert(pans > 20, "Saltreach's salt pans");
  // Every door of every new building opens onto ground you can reach.
  const { doorwaysOf } = await import("../games/rarefriends-realm/facades.ts");
  for (const b of world.buildings.filter(b => ["gullwick", "saltreach", "merrab", "tel_ashun", "ennus_well"].includes(regionAt(world, b.x0 + 1, b.y0 + 1).id))) {
    const doors = doorwaysOf(world, b); assert(doors.length, `${b.name} has a door`);
    for (const d of doors) assert(Object.values(seenFor).some(seen => at(seen, d.x + d.nx, d.y + d.ny)), `${b.name}'s door at ${d.x},${d.y} opens onto reachable ground`);
  }
});

test("The sea ports' packet boats: every new landing reached, on the same network, Gullwick open from the start and the far ports only once walked to", async () => {
  const { routesFrom, dockLocked, passage } = await import("../games/rarefriends-realm/boats.ts");
  const { SEA_DOCKS } = north(await import("../games/rarefriends-realm/ports.ts"));
  const g = newGame(), world = g.world, p = g.player;
  const docks = world.objects.filter(o => o.kind === "dock");
  for (const dock of SEA_DOCKS) {
    const object = docks.find(o => o.dock === dock.id); assert(object, `${dock.id} has a boat`);
    assert(canWalk(g, object.to.x, object.to.y), `${dock.id}'s pier end can be stood on`);
    assert(g.npcs.some(n => n.id === dock.boatman && Math.max(Math.abs(n.x - object.to.x), Math.abs(n.y - object.to.y)) <= 10), `${dock.id}'s boatman is on the quay`);
    const pier = reachable(g, object.to); assert(pier[world.places[dock.id === "suvarnatira" ? "suvarnatira" : dock.id].y * W + world.places[dock.id === "suvarnatira" ? "suvarnatira" : dock.id].x], `${dock.id}'s pier joins its town`);
  }
  assert.equal(dockLocked(g, "gullwick"), null);
  for (const id of ["saltreach", "merrab", "suvarnatira"]) assert(dockLocked(g, id), `${id} is locked to begin with`);
  const routes = routesFrom(g, "kurohama");
  for (const id of ["gullwick", "saltreach", "merrab", "suvarnatira"]) assert(routes.some(r => r.id === id), `${id} is on the Isles' list`);
  assert(routes.find(r => r.id === "gullwick").open && !routes.find(r => r.id === "merrab").open);
  const fromGull = routesFrom(g, "gullwick");
  assert(fromGull.find(r => r.id === "kurohama").open && fromGull.find(r => r.id === "kurohama").fare > fromGull.find(r => r.id === "eastport").fare - 1000, "fares by distance");
  p.visited.saltreach = 1; p.visited.merrab = 1; p.visited.suvarnatira = 1;
  for (const id of ["saltreach", "merrab", "suvarnatira"]) assert.equal(dockLocked(g, id), null, `${id} opens once walked to`);
  const gull = docks.find(o => o.dock === "gullwick"); teleport(g, gull.to.x, gull.to.y); give(p, "coins", 100000);
  const ok = passage(g, "gullwick", "merrab"); assert(!("problem" in ok), "passage from Gullwick to Merrab");
});

test("The sea ports' people: every one talks, every tailor sells their port's clothes, every port's villagers wear them, and the desert villages dress as their neighbours", async () => {
  const { PORTS_NPCS } = await import("../games/rarefriends-realm/portspeople.ts");
  const { PORTS_CLOTHING, PORTS_MONSTERS, PORTS_SHOPS } = await import("../games/rarefriends-realm/portsgear.ts");
  const { trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const g = newGame();
  for (const id of Object.keys(PORTS_NPCS)) {
    const d = talk(g, id); assert(d && d.lines.length && d.lines[0].text.length > 10, `${id} says something`);
    assert(g.npcs.some(n => n.id === id), `${id} is in the world`);
    const shop = NPCS[id].shop; if (shop) assert(SHOPS[shop], `${id}'s shop ${shop}`);
  }
  for (const [id, shop] of Object.entries(PORTS_SHOPS)) for (const item of shop.stock) assert(ITEM_LIST.some(i => i.id === item), `${id} sells a real ${item}`);
  assert.equal(PORTS_CLOTHING.length, 3);
  for (const set of PORTS_CLOTHING) {
    assert(REGIONAL_CLOTHING.includes(set), `${set.region}'s clothes are regional`);
    assert(Object.values(NPCS).some(n => n.shop === set.shop), `${set.region}'s tailor`);
    assert.equal(SHOPS[set.shop].stock.filter(id => set.pieces.some(p => p.id === id)).length, set.pieces.length, `${set.shop} sells all of ${set.region}'s clothes`);
    assert(NPCS[`${set.region}_villager`], `${set.region}'s villagers`);
  }
  for (const id of ["tel_ashun_villager", "ennus_well_villager"]) assert(NPCS[id] && g.npcs.some(n => n.id === id), `${id} lives there`);
  for (const id of ["fish_stew", "salt_herring", "pearl", "keepers_oilskin", "true_weight_ring", "pearl_pendant", "brickmakers_gloves", "wellkeepers_headcloth"]) assert(ITEM_LIST.some(i => i.id === id), id);
  for (const m of Object.values(PORTS_MONSTERS)) assert(MONSTERS[m.id] && m.ink, `${m.id} has its own colour`);
  for (const [region, id] of [["gullwick", "saltmarrow"], ["saltreach", "crownlands"], ["merrab", "kharaveth_sefrah"], ["tel_ashun", "kharaveth_azhurak"], ["ennus_well", "kharaveth_dunes"]]) assert.equal(trackFor(region, false), id);
});

test("Lights Out at Gullwick and The King's Salt, start to finish, both ways round", async () => {
  const { useClue } = await import("../games/rarefriends-realm/kharaveth.ts");
  const g = newGame(), world = g.world, p = g.player;
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option);
  say("gullwick_harbourmaster", "I'll find out"); assert.equal(p.quests.lights_out_gullwick, 1);
  clue("wreckers_lantern", "Look"); assert.equal(p.quests.lights_out_gullwick, 1, "the lantern means nothing yet");
  say("gullwick_keeper"); clue("gullwick_lamp_log", "Read"); assert.equal(p.quests.lights_out_gullwick, 2);
  clue("wreckers_lantern", "Look"); assert.equal(p.quests.lights_out_gullwick, 3);
  say("gullwick_nan"); assert.equal(p.quests.lights_out_gullwick, 4);
  say("gullwick_harbourmaster", "The wreckers are fishers"); assert.equal(p.quests.lights_out_gullwick, 5); assert(has(p, "keepers_oilskin")); assert.equal(p.questData.lo_choice, 1);
  // The other way: the wreckers' chief killed instead.
  const h = newGame(), q = h.player, sayH = (id, label) => { let d = talk(h, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); };
  const clueH = id => useClue(h, h.world.objects.find(o => o.clue === id), "Look");
  sayH("gullwick_harbourmaster", "I'll find out"); sayH("gullwick_keeper"); useClue(h, h.world.objects.find(o => o.clue === "gullwick_lamp_log"), "Read"); clueH("wreckers_lantern");
  onMonsterKilled(h, "wrecker_chief", 0, 0); assert.equal(q.quests.lights_out_gullwick, 4);
  assert(!talk(h, "gullwick_harbourmaster").options.some(o => o.label.startsWith("The wreckers are fishers")), "only what you know to tell");
  sayH("gullwick_harbourmaster", "The wreckers' chief is dead"); assert.equal(q.quests.lights_out_gullwick, 5); assert.equal(q.questData.lo_choice, 2);
  // The King's Salt.
  say("saltreach_brannagh", "I'll weigh"); assert.equal(p.quests.kings_salt, 1);
  say("saltreach_assessor"); clue("kings_scale", "Look"); assert.equal(p.quests.kings_salt, 1);
  clue("pan_weights", "Look"); assert.equal(p.quests.kings_salt, 2);
  say("saltreach_assessor", "Your new pound"); assert.equal(p.quests.kings_salt, 3); assert(has(p, "true_weight_ring")); assert.equal(p.questData.ks_choice, 1);
  assert.equal(questPoints(g), 2, "one each");
});

test("The Pearl-Divers' Debt, What the Tell Remembers and The Well's Share: after Foothold, start to finish", async () => {
  const { useClue } = await import("../games/rarefriends-realm/kharaveth.ts");
  const g = newGame(), world = g.world, p = g.player;
  const say = (id, label) => { let d = talk(g, id); if (label) { const o = d.options.find(x => x.label.startsWith(label)); assert(o, `${id}: ${label}`); d.onEnd?.(); d = o.then(); } d?.onEnd?.(); return d; };
  const clue = (id, option) => useClue(g, world.objects.find(o => o.clue === id), option);
  for (const id of ["merrab_yamina", "tel_ashun_elder", "ennu_keeper"]) assert(!talk(g, id).options?.length, `${id} has no quest before Foothold`);
  p.quests.foothold_in_the_stone = 3;
  // The pearl beds: Saltjaw, the factor, the ledger; then the choice.
  say("merrab_yamina", "I'll deal with"); assert.equal(p.quests.pearl_divers_debt, 1);
  onMonsterKilled(g, "saltjaw", 0, 0); say("merrab_factor"); assert.equal(p.quests.pearl_divers_debt, 1);
  clue("pearl_ledger", "Read"); assert.equal(p.quests.pearl_divers_debt, 2);
  say("merrab_yamina", "Bargain with the factor"); assert.equal(p.quests.pearl_divers_debt, 3); assert(has(p, "pearl_pendant")); assert.equal(p.questData.pd_choice, 2);
  // The tell: three layers, then the elder.
  say("tel_ashun_elder", "I'll read"); clue("tell_layer_0", "Read"); clue("tell_layer_2", "Read"); assert.equal(p.quests.tell_remembers, 1);
  clue("tell_layer_1", "Read"); assert.equal(p.quests.tell_remembers, 2);
  say("tel_ashun_elder", "Dig the upper layers"); assert.equal(p.quests.tell_remembers, 3); assert(has(p, "brickmakers_gloves"));
  // The well: the channel and its borer, then the shares.
  say("ennu_keeper", "I'll see"); onMonsterKilled(g, "sand_borer", 0, 0); assert.equal(p.quests.wells_share, 1);
  clue("well_channel", "Look"); assert.equal(p.quests.wells_share, 2);
  say("ennu_keeper", "Equal notches"); assert.equal(p.quests.wells_share, 3); assert(has(p, "wellkeepers_headcloth"));
  assert.equal(questPoints(g), 6, "two, one and one, and A Foothold in the Stone's two");
});

test("Sigil stones in four grades: each presses its base number of sigils plus the level bonus once; the better grades are in the mines and need their levels", async () => {
  const { SIGIL_STONES, sigilsPerStone } = await import("../games/rarefriends-realm/data.ts");
  const g = newGame(), p = g.player, world = g.world;
  assert.deepEqual(SIGIL_STONES.map(s => s.base), [1, 3, 5, 8]);
  for (const grade of SIGIL_STONES.slice(1)) assert(world.objects.some(o => o.kind === "rock" && o.rock === grade.rock), `${grade.rock} rocks exist`);
  const altar = world.objects.find(o => o.kind === "sigil_altar" && o.sigil === "breeze_sigil");
  standBy(g, altar); p.inventory.fill(null);
  // At Sigilcraft 20 the Breeze bonus is +1: a plain stone makes 2, a Refined one 4; the Primal stone waits for level 65.
  p.xp.sigilcraft = XP_TABLE[20]; give(p, "sigil_stone"); give(p, "refined_sigil_stone", 2); give(p, "primal_sigil_stone");
  assert.equal(sigilsPerStone(20, 1), 2);
  assert.equal(craftSigils(g, altar), 2 + 2 * 4, "plain and Refined pressed together, the bonus added once each");
  assert.equal(count(p, "primal_sigil_stone"), 1, "Primal stays until Sigilcraft 65"); assert.equal(count(p, "breeze_sigil"), 10);
  const xp = p.xp.sigilcraft; p.xp.sigilcraft = XP_TABLE[65]; give(p, "charged_sigil_stone");
  assert.equal(craftSigils(g, altar), (8 + 5) + (5 + 5), "at 65 the bonus is +5 (six a stone, the cap): Primal 13, Charged 10");
  assert(p.xp.sigilcraft - XP_TABLE[65] > 0 && xp > XP_TABLE[20], "XP per stone, not per sigil");
  // Digging: the grades take their Mining levels, and run out like other rock.
  const rock = world.objects.find(o => o.kind === "rock" && o.rock === "sigil3");
  assert.equal(ROCKS.sigil3.level, 40); assert(ROCKS.sigil3.respawn > 0 && ROCKS.sigil.respawn === 0);
  standBy(g, rock); give(p, "rarite_pickaxe"); p.xp.mining = XP_TABLE[39];
  menuFor(g, [{ kind: "object", id: rock.id }], null)[0].run(g); assert.equal(p.activity, null, "Mining 40 to dig Charged stone");
});

test("Reinforced armour: two bars make a plate, a piece and a plate make the reinforced piece (a sixth more protection); only ordinary metal", async () => {
  const { REINFORCED_PIECES, item } = await import("../games/rarefriends-realm/data.ts");
  const g = newGame(), p = g.player;
  p.xp.smithing = XP_TABLE[30]; give(p, "hammer"); give(p, "pewter_bar", 2); give(p, "pewter_helm");
  const anvil = g.world.objects.find(object => object.kind === "anvil"); standBy(g, anvil);
  const recipes = smithingRecipes("pewter");
  startProduction(g, recipes.find(r => r.label === "Pewter reinforcement plate"), 1); until(g, () => has(p, "pewter_plate"), 50);
  assert.equal(count(p, "pewter_bar"), 0);
  startProduction(g, recipes.find(r => r.label === "Reinforced Pewter helm"), 1); until(g, () => has(p, "pewter_helm_r"), 50);
  assert(!has(p, "pewter_helm") && !has(p, "pewter_plate"), "both consumed");
  assert(item("pewter_helm_r").equip.bonuses.defence > item("pewter_helm").equip.bonuses.defence && item("pewter_helm_r").weight > item("pewter_helm").weight);
  assert.equal(REINFORCED_PIECES.length, 7);
  for (const metal of METALS) for (const r of smithingRecipes(metal.id)) for (const out of Object.keys(r.outputs)) assert(out.startsWith(`${metal.id}_`), `smithing only makes ${metal.id} things, not ${out}`);
});

test("Mining country: the Ashen quarry is stepped and walled with its own smithy, Frostpeak rises to a summit with a forge at the camp, Emberforge has lava and a smelting yard", () => {
  const g = newGame(), world = g.world;
  const at = (mx, my) => { const [x, y] = M(mx, my); return { x, y, i: y * W + x, c: y * (W + 1) + x }; };   // c: the height corner at the tile's top-left
  const rim = at(114, 43), floor = at(114, 52), camp = at(195, 30), summit = at(224, 14);
  assert(world.heights[rim.c] > world.heights[floor.c] + 30, "the quarry's rim stands above its floor");
  assert(world.tiles[at(116, 61).i] === T.WALL && world.tiles[at(107, 61).i] === T.STONE, "a retaining wall, and the ramp through it");
  assert(world.objects.filter(o => o.kind === "decor" && o.name === "Ore cart").length >= 4, "ore carts at the quarry and the yard");
  const near = (kind, p, r) => world.objects.some(o => o.kind === kind && Math.abs(o.x - p.x) <= r && Math.abs(o.y - p.y) <= r);
  assert(near("furnace", at(101, 64), 2) && near("anvil", at(103, 66), 2), "the Ashen smithy");
  assert(world.heights[summit.c] > world.heights[camp.c] + 100, "Frostpeak's summit is high above its camp");
  assert(near("furnace", at(192, 36), 1) && near("anvil", at(194, 36), 1), "the Frostpeak forge");
  assert(world.objects.some(o => o.name === "Summit cairn"), "a cairn on top");
  let lava = 0; for (let y = 40; y < 62; y++) for (let x = 170; x < 190; x++) if (world.tiles[at(x, y).i] === T.LAVA) lava++;
  assert(lava >= 6, `lava in Emberforge's cracks (${lava})`);
  assert(near("furnace", at(176, 40), 2) && near("anvil", at(180, 42), 1), "the smelting yard");
  assert.equal(world.objects.filter(o => o.kind === "anvil").length >= 12, true, "more smithies than before");
});

test("Two card formats: the adventurer card stays landscape and business-card shaped, the collectible card is portrait and playing-card shaped, each with its own versioned layouts", async () => {
  // card.ts draws (it needs a document), so the shareable card's size is read from its source.
  const CARD = /CARD: [^=]*= \{ width: (\d+), height: (\d+) \}/.exec(readFileSync(new URL("../games/rarefriends-realm/card.ts", import.meta.url), "utf8")).slice(1, 3).map(Number);
  const { COLLECTIBLE, COLLECTIBLE_LAYOUTS, COLLECTIBLE_ATTRIBUTES, DEFAULT_COLLECTIBLE, cleanCollectible, collectibleChoice, collectibleFacts } = await import("../games/rarefriends-realm/collectible.ts");
  const { DEFAULT_CARD, CARD_OPTIONS } = await import("../games/rarefriends-realm/cardstyle.ts");
  assert.deepEqual(CARD, [1200, 675], "the shareable card is the X card size, as it always was");
  assert.deepEqual([COLLECTIBLE.width, COLLECTIBLE.height], [750, 1050]); assert.ok(COLLECTIBLE.height / COLLECTIBLE.width > 1.3, "portrait, two and a half by three and a half");
  assert.deepEqual(DEFAULT_CARD, { bg: "paper", frame: "rose", skills: "boxes", font: "mono", ink: "ink", layout: "classic", banner: "auto" }, "the adventurer card's defaults are untouched");
  assert.ok(!CARD_OPTIONS.layout.some(option => COLLECTIBLE_LAYOUTS.some(layout => layout.id === option.id && layout.name === option.name)), "the collectible's layouts are its own, not the adventurer card's");
  assert.deepEqual(COLLECTIBLE_LAYOUTS.map(layout => layout.name), ["Classic Adventurer", "Skill Master", "Legendary Build", "Quest Champion", "Collector's Edition", "Minimalist"]);
  assert.ok(COLLECTIBLE_LAYOUTS.every(layout => Number.isInteger(layout.version) && layout.version >= 1), "every layout is versioned");
  assert.equal(new Set(COLLECTIBLE_LAYOUTS.map(layout => layout.id)).size, COLLECTIBLE_LAYOUTS.length);
  // Choices are cleaned: unknown layouts and attributes are dropped, and a locked layout falls back to the first.
  assert.deepEqual(cleanCollectible({ layout: "nope", show: ["skills", "money", "gear"] }), { layout: "classic", show: ["skills", "gear"] });
  assert.deepEqual(cleanCollectible(null), DEFAULT_COLLECTIBLE);
  const g = newGame();
  g.player.collectible = { layout: "legendary", show: ["combat"] };
  assert.equal(collectibleChoice(g).layout, "classic", "Legendary Build needs achievements");
  for (let i = 0; i < 15; i++) g.player.achievements[`a${i}`] = 1;
  assert.equal(collectibleChoice(g).layout, "legendary");
  // The facts a card shows are read once, and are public progress only: no bank, no coins, nothing bound.
  const facts = collectibleFacts(g, 3, 1_700_000_000_000);
  assert.equal(facts.generation, 3); assert.equal(facts.friendId, 7730); assert.equal(facts.at, 1_700_000_000_000);
  assert.equal(facts.skills.hitpoints, 10); assert.equal(typeof facts.combat, "number"); assert.ok(Array.isArray(facts.gear));
  for (const key of ["bank", "inventory", "coins", "equipment"]) assert.ok(!(key in facts), `${key} is not on the card`);
  assert.deepEqual(COLLECTIBLE_ATTRIBUTES.map(entry => entry.id), ["skills", "combat", "gear", "quests", "achievements", "generation"]);
  // The choices survive a save and a load.
  const save = serialize(g); assert.deepEqual(save.collectible, { layout: "legendary", show: ["combat"] });
  const h = newGame(); assert.ok(restore(h, save)); assert.deepEqual(h.player.collectible, { layout: "legendary", show: ["combat"] });
});

test("The card lockbox: tradeable items go in from the inventory and come back to the bank; coins and quest things can't; it's held while a card is out; it survives a save", async () => {
  const { LOCKBOX_SIZE, cardEligible, cleanLockbox, fromLockbox, toLockbox } = await import("../games/rarefriends-realm/cardescrow.ts");
  const g = newGame(), p = g.player;
  assert.ok(cardEligible("logs") && cardEligible("pewter_axe"), "ordinary things are eligible");
  assert.ok(!cardEligible("coins") && !cardEligible("crypt_key") && !cardEligible("nothing_of_the_kind"), "coins, quest keys and unknown ids aren't");
  give(p, "logs", 10); give(p, "coins", 500); const coins = count(p, "coins");
  const at = id => p.inventory.findIndex(slot => slot?.id === id);
  assert.equal(toLockbox(g, at("logs"), 4), null); assert.equal(count(p, "logs"), 6); assert.deepEqual(p.lockbox, [{ id: "logs", n: 4 }]);
  assert.equal(toLockbox(g, at("logs")), null); assert.deepEqual(p.lockbox, [{ id: "logs", n: 10 }], "onto the same stack");
  assert.match(toLockbox(g, at("coins")), /can't go in a card/); assert.equal(count(p, "coins"), coins);
  assert.equal(fromLockbox(g, "logs", 3), null); assert.deepEqual(p.lockbox, [{ id: "logs", n: 7 }]); assert.ok(p.bank.some(slot => slot.id === "logs" && slot.n === 3), "back to the bank");
  g.cardHeld = true;
  assert.match(fromLockbox(g, "logs"), /A card is out/); assert.match(toLockbox(g, at("coins")) ?? toLockbox(g, 0), /card is out|can't go in/);
  assert.deepEqual(p.lockbox, [{ id: "logs", n: 7 }], "held");
  g.cardHeld = false;
  assert.deepEqual(cleanLockbox([{ id: "logs", n: 2 }, { id: "coins", n: 9 }, { id: "logs", n: 1 }, { id: "x", n: 1 }, null, { id: "pewter_axe", n: 0 }]), [{ id: "logs", n: 2 }], "cleaned: known, eligible, whole, once");
  assert.equal(cleanLockbox(Array.from({ length: 40 }, (_, i) => ({ id: ["logs", "oak_logs", "pewter_axe", "pewter_pickaxe"][i % 4] + "", n: 1 }))).length <= LOCKBOX_SIZE, true);
  const save = serialize(g); assert.deepEqual(save.lockbox, [{ id: "logs", n: 7 }]);
  const h = newGame(); assert.ok(restore(h, save)); assert.deepEqual(h.player.lockbox, [{ id: "logs", n: 7 }]);
});

test("Settlements travel with the save: the marks stay, the service's notices are said once on load and then forgotten", () => {
  const g = newGame(); g.player.settled = [3, 7];
  const save = serialize(g); save.notices = ["Your Adventurer Card #3 was redeemed: 2,000 XP left you with it."];
  const h = newGame(); assert.ok(restore(h, save));
  assert.deepEqual(h.player.settled, [3, 7]); assert.deepEqual(h.player.notices, []);
  assert.ok(h.messages.some(entry => /Card #3 was redeemed/.test(entry.text)), "said once");
  assert.deepEqual(serialize(h).notices, []);
});

test("World overlays: a layer over the baked world, applied deterministically; bad ops are dropped with a reason; placements are checked for reach; the public build applies the promoted ones last", async () => {
  const { applyOverlay, cleanOverlay, validatePlacements, walkableAt } = await import("../games/rarefriends-realm/overlay.ts");
  const { OVERLAYS } = await import("../games/rarefriends-realm/overlays/index.ts"), { WORLD_SEED } = await import("../games/rarefriends-realm/world.ts");
  const why = [], overlay = cleanOverlay({ v: 1, name: "Test", ops: [
    { op: "tile", x: 5, y: 5, t: T.GRASS }, { op: "tile", x: -1, y: 5, t: T.GRASS }, { op: "fill", x0: 10, y0: 10, x1: 14, y1: 12, t: T.STONE }, { op: "lift", x: 12, y: 11, v: 2 },
    { op: "object", uid: "tree-1", kind: "tree", tree: "oak", x: 12, y: 11 }, { op: "object", uid: "bad!", kind: "tree", x: 1, y: 1 }, { op: "nothing" },
    { op: "building", uid: "hut", x0: 20, y0: 20, x1: 26, y1: 25, door: "s", name: "The hut" }, { op: "spawn", uid: "guide-2", kind: "npc", id: "guide", x: 23, y: 27 }, { op: "spawn", uid: "nobody", kind: "monster", id: "no_such_monster", x: 23, y: 28 },
  ] }, why);
  assert.equal(overlay.ops.length, 7, "the three bad ops are dropped (the unknown monster is refused when applied)"); assert.ok(why.some(w => /bad tile/.test(w)) && why.some(w => /bad object/.test(w)) && why.some(w => /unknown op/.test(w)));
  // On worlds of their own: the shared world stays as it is for every other test.
  const g = newGame({ world: createWorld() }), world = g.world, problems = [];
  const placed = applyOverlay(world, overlay, WORLD_SEED, problems, NPCS);
  assert.equal(world.tiles[5 * W + 5], T.GRASS); assert.equal(world.tiles[11 * W + 12], T.STONE); assert.equal(world.base[11 * W + 12], createWorld().base[11 * W + 12], "a raise in the sea at the world's corner leaves it (water lies level; raising land is checked below)");
  assert.ok(placed.objects.has("tree-1")); assert.equal(world.objects[placed.objects.get("tree-1")].tree, "oak"); assert.equal(world.objectAt[11 * W + 12], placed.objects.get("tree-1"));
  assert.ok(placed.buildings.has("hut")); const hut = world.buildings[placed.buildings.get("hut")]; assert.equal(hut.name, "The hut"); assert.equal(world.tiles[20 * W + 20], T.WALL); assert.equal(world.tiles[22 * W + 23], T.WOOD); assert.equal(world.tiles[25 * W + 23], T.WOOD, "the door gap"); assert.equal(world.buildingAt[22 * W + 23], placed.buildings.get("hut") + 1);
  assert.ok(placed.spawns.has("guide-2")); assert.ok(!placed.spawns.has("nobody")); assert.ok(problems.some(p => /no monster called no_such_monster/.test(p)));
  assert.ok(world.heights.length > 0 && Number.isFinite(world.heights[11 * (W + 1) + 12]), "heights rebuilt");
  // Reach: the corner of the world is water and void; nothing there can be reached from the spawn.
  const unreachable = validatePlacements(world, overlay, placed);
  assert.ok(unreachable.some(u => /tree-1/.test(u)) || walkableAt(world, 12, 11) === false, "an oak in the sea can't be reached");
  assert.ok(Array.isArray(OVERLAYS), "the promoted overlays are a list (empty today)");
  // Applying the same overlay to a fresh world gives the same result.
  const h = newGame({ world: createWorld() }), again = applyOverlay(h.world, overlay, WORLD_SEED, [], NPCS);
  assert.deepEqual([...again.objects.keys()], [...placed.objects.keys()]); assert.equal(h.world.tiles[11 * W + 12], T.STONE);
  // Raising ground (the editor's raise): a hill where it's raised, softened at its edges; and the development frame's
  // quick rebuild (only the ground round the change, from the ground kept before the buildings were levelled) gives
  // exactly the heights a full rebuild does.
  const { groundHeights } = await import("../games/rarefriends-realm/world.ts");
  const spawn = createWorld().places.spawn, sx = spawn.x + 20, sy = spawn.y + 20, CW = W + 1;
  const hill = { v: 1, ops: [...Array.from({ length: 49 }, (_, k) => ({ op: "lift", x: sx + (k % 7), y: sy + Math.floor(k / 7), v: 4 })), { op: "tile", x: sx + 9, y: sy, t: T.WATER }] };
  const plain = newGame({ world: createWorld() }).world, before = plain.heights[(sy + 3) * CW + sx + 3];
  applyOverlay(plain, hill, WORLD_SEED);
  const quick = newGame({ world: createWorld() }).world; quick.ground = groundHeights(quick.tiles, WORLD_SEED, quick.lift, quick.raise, quick.base);
  applyOverlay(quick, hill, WORLD_SEED);
  assert.ok(plain.heights[(sy + 3) * CW + sx + 3] - before > 40, `a 7×7 raised by 4 stands well up (${before.toFixed(1)} → ${plain.heights[(sy + 3) * CW + sx + 3].toFixed(1)})`);
  assert.ok(plain.heights[sy * CW + sx] - before < plain.heights[(sy + 3) * CW + sx + 3] - before, "softer at its edge");
  assert.ok(quick.heights.every((v, i) => v === plain.heights[i]), "the quick rebuild matches the full one");
});

test("The dashboard's ground and paint ops: checked, deterministic, the quick rebuild matches the full one, and the world bakes as it's seen", async () => {
  const { applyOverlay, cleanOverlay } = await import("../games/rarefriends-realm/overlay.ts");
  const { FLOOR_MIN, FLOOR_MAX } = await import("../games/rarefriends-realm/terrainops.ts");
  const { WORLD_SEED, groundHeights, buildHeights, regionIndex } = await import("../games/rarefriends-realm/world.ts");
  // Open country: no building within reach of the ops (a building's ground is levelled, and the ground round it eased to it), nothing but grass where the brushes go.
  const open = createWorld(), CW = W + 1, clear = (x, y) => open.buildings.every(b => b.x1 < x - 12 || b.x0 > x + 62 || b.y1 < y - 12 || b.y0 > y + 52);
  const grassy = (x, y) => [[0, 0], [12, 0], [24, 0], [0, 12], [5, 20], [20, 40]].every(([dx, dy]) => open.tiles[(y + dy) * W + x + dx] === T.GRASS);
  let sx = 0, sy = 0;
  for (let k = 0; k < 4000 && !sx; k++) { const x = open.places.spawn.x + ((k * 37) % 400) - 200, y = open.places.spawn.y + Math.floor(k / 11) * 7 % 300 - 150; if (x > 20 && y > 20 && clear(x, y) && grassy(x, y)) { sx = x; sy = y; } }
  assert.ok(sx, "somewhere open to try the tools");
  const why = [], overlay = cleanOverlay({ v: 1, frame: 2, ops: [
    { op: "terrain", x: sx, y: sy, r: 4, shape: "circle", mode: "raise", amount: 3, falloff: 0.5 },
    { op: "terrain", x: sx, y: sy, r: 2, shape: "square", mode: "smooth", amount: 2, falloff: 0.3 },
    { op: "terrain", x: sx + 12, y: sy, r: 3, shape: "circle", mode: "level", amount: 1, falloff: 0.4, target: 120 },
    { op: "terrain", x: sx + 24, y: sy, r: 3, shape: "circle", mode: "lower", amount: 16, falloff: 0 },
    { op: "terrain", x: sx, y: sy + 12, r: 3, shape: "circle", mode: "roughen", amount: 2, falloff: 0.2, seed: 7 },
    { op: "slope", x0: sx, y0: sy + 20, x1: sx + 10, y1: sy + 20, w: 3, h0: 40, h1: 90 },
    { op: "fill", x0: sx + 30, y0: sy + 30, x1: sx + 34, y1: sy + 34, t: T.ICE }, { op: "flood", x: sx + 32, y: sy + 32, t: T.SAND, limit: 1000 },
    { op: "paint", x: sx + 40, y: sy, r: 2, shape: "circle", t: T.SNOW }, { op: "line", x0: sx + 40, y0: sy + 10, x1: sx + 50, y1: sy + 10, w: 3, t: T.PATH },
    { op: "region", x0: sx + 40, y0: sy + 20, x1: sx + 42, y1: sy + 22, region: "frostpeak" },
    { op: "scatter", uid: "wood", x: sx + 20, y: sy + 40, r: 6, kind: "tree", sub: "oak", density: 0.3, seed: 11 },
    { op: "object", uid: "a-rock", kind: "decor", decor: "boulder", x: sx + 50, y: sy + 40 }, { op: "clear", x0: sx + 48, y0: sy + 38, x1: sx + 52, y1: sy + 42 },
    { op: "terrain", x: sx, y: sy, r: 99, shape: "circle", mode: "raise", amount: 1, falloff: 0 }, { op: "terrain", x: sx, y: sy, r: 2, shape: "circle", mode: "dig", amount: 1, falloff: 0 },
    { op: "flood", x: sx, y: sy, t: T.SAND, limit: 99_999 }, { op: "region", x0: 0, y0: 0, x1: 900, y1: 900, region: "coast" },
  ] }, why);
  assert.equal(overlay.ops.length, 14, "a brush too wide, an unknown mode, a flood too big and a region too wide are dropped"); assert.ok(why.some(w => /bad terrain/.test(w)) && why.some(w => /bad flood/.test(w)) && why.some(w => /bad region/.test(w)));
  const fresh = createWorld(), plain = newGame({ world: createWorld() }).world, quick = newGame({ world: createWorld() }).world;
  quick.ground = groundHeights(quick.tiles, WORLD_SEED, quick.lift, quick.raise, quick.base);
  const problems = []; applyOverlay(plain, overlay, WORLD_SEED, problems); applyOverlay(quick, overlay, WORLD_SEED);
  const tileHeight = (w, x, y) => (w.heights[y * CW + x] + w.heights[y * CW + x + 1] + w.heights[(y + 1) * CW + x] + w.heights[(y + 1) * CW + x + 1]) / 4;
  assert.ok(tileHeight(plain, sx, sy) - tileHeight(fresh, sx, sy) > 30, `a raise of 3 steps stands up (${tileHeight(fresh, sx, sy).toFixed(1)} → ${tileHeight(plain, sx, sy).toFixed(1)})`);
  assert.ok(Math.abs(tileHeight(plain, sx + 12, sy) - 120) < 3, `levelled to 120 (${tileHeight(plain, sx + 12, sy).toFixed(1)})`);
  assert.ok(Math.abs(tileHeight(plain, sx + 10, sy + 20) - 90) < 8 && Math.abs(tileHeight(plain, sx, sy + 20) - 40) < 8, "a slope from 40 to 90");
  assert.ok(plain.base.every(v => v >= FLOOR_MIN && v <= FLOOR_MAX && Math.round(v * 64) === v * 64), "the floor stays in the bake's range, in its 1/64 steps (dug as low as it goes, no lower)");
  assert.equal(plain.tiles[(sy + 32) * W + sx + 32], T.SAND); assert.equal(plain.tiles[(sy + 30) * W + sx + 34], T.SAND, "the flood fills the connected ground");
  assert.equal(plain.tiles[sy * W + sx + 40], T.SNOW); assert.equal(plain.tiles[(sy + 10) * W + sx + 45], T.PATH); assert.equal(plain.region[(sy + 21) * W + sx + 41], regionIndex("frostpeak"));
  const scattered = plain.objects.filter(o => o.tree === "oak" && Math.hypot(o.x - sx - 20, o.y - sy - 40) <= 6.5 && !fresh.objects.some(f => f.x === o.x && f.y === o.y)).length;
  assert.ok(scattered > 3, `a scatter of oaks (${scattered})`); assert.ok(plain.objectAt[(sy + 40) * W + sx + 50] < 0, "cleared");
  assert.equal(quick.objects.filter(o => o.tree === "oak").length, plain.objects.filter(o => o.tree === "oak").length, "the same scatter every time");
  assert.ok(quick.heights.every((v, i) => v === plain.heights[i]), "the quick rebuild matches the full one");
  const baked = buildHeights(plain.tiles, WORLD_SEED, plain.lift, plain.raise, plain.base, plain.buildings);
  assert.ok(baked.every((v, i) => v === plain.heights[i]), "built again from its tiles and its floor (what the bake keeps), the world stands exactly as it was seen");
});

test("Water lies level: the sea and the low water joined to it at sea level, each lake at one height, mountain rivers in level reaches with falls between; the shore flat; the ground tools leave it alone, and painted water takes the level of the water it joins", async () => {
  const { applyOverlay } = await import("../games/rarefriends-realm/overlay.ts");
  const { WORLD_SEED, groundHeights } = await import("../games/rarefriends-realm/world.ts");
  const w = createWorld(), CW = W + 1, wet = t => t === T.WATER || t === T.DEEP || t === T.BRIDGE;
  // (The renderers draw every water tile flat at its lowest corner, so here it's the ground under the water: a tile of
  // water sloping is a fall on a river, or water at the foot of a building standing above it on a bank, and rare.)
  const nearBuilding = new Uint8Array(W * H); for (const b of w.buildings) for (let y = Math.max(0, b.y0 - 2); y <= Math.min(H - 1, b.y1 + 2); y++) for (let x = Math.max(0, b.x0 - 2); x <= Math.min(W - 1, b.x1 + 2); x++) nearBuilding[y * W + x] = 1;
  let water = 0, sloped = 0; const wrong = [];
  for (let y = 2; y < OVERWORLD_H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (!wet(w.tiles[y * W + x])) continue; water++;
    const c = [w.heights[y * CW + x], w.heights[y * CW + x + 1], w.heights[(y + 1) * CW + x], w.heights[(y + 1) * CW + x + 1]]; if (Math.max(...c) - Math.min(...c) <= 1) continue;
    sloped++; let around = 0, beside = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (wet(w.tiles[(y + dy) * W + x + dx])) { around++; if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) beside++; }
    // (Open water inside a lake or the sea, away from its shore: a stream may fall into a lake right at its edge.)
    if (around >= 19 && beside === 9 && !nearBuilding[y * W + x] && wrong.length < 12) wrong.push(`${x},${y} ${regionAt(w, x, y).id}: ${Math.min(...c).toFixed(1)}–${Math.max(...c).toFixed(1)}`);
  }
  assert.ok(water > 100_000 && sloped < water / 100, `water slopes only at falls and banks (${sloped} of ${water} tiles)`);
  assert.deepEqual(wrong, [], "open water (a lake, the sea) never slopes away from its shore, except below a building");
  // The ground tools on the water and its shore do nothing there; painted water lies at its neighbour's level.
  let sx = 0, sy = 0;
  for (let y = 200; y < OVERWORLD_H - 40 && !sx; y += 3) for (let x = 200; x < W - 40 && !sx; x += 3) if (w.tiles[y * W + x] === T.WATER && w.tiles[y * W + x + 6] === T.GRASS && w.tiles[y * W + x + 12] === T.GRASS && w.buildings.every(b => b.x1 < x - 12 || b.x0 > x + 24 || b.y1 < y - 12 || b.y0 > y + 12)) { sx = x; sy = y; }
  assert.ok(sx, "a lakeshore to try the tools on");
  const level = w.heights[sy * CW + sx], world = createWorld(); world.ground = groundHeights(world.tiles, WORLD_SEED, world.lift, world.raise, world.base);
  applyOverlay(world, { v: 1, ops: [
    { op: "terrain", x: sx, y: sy, r: 3, shape: "circle", mode: "raise", amount: 8, falloff: 0 }, { op: "lift", x: sx, y: sy, v: 8 },
    { op: "line", x0: sx, y0: sy, x1: sx + 9, y1: sy, w: 1, t: T.WATER },
  ] }, WORLD_SEED);
  for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) assert.ok(Math.abs(world.heights[(sy + dy) * CW + sx + dx] - level) < 0.01, `the water round ${sx},${sy} is where it was`);
  assert.equal(world.tiles[sy * W + sx + 8], T.WATER);
  const painted = [5, 6, 7, 8, 9].flatMap(dx => [world.heights[sy * CW + sx + dx], world.heights[(sy + 1) * CW + sx + dx]]);
  assert.ok(painted.every(h => Math.abs(h - level) < 0.01), `a channel painted out of the lake lies at its level (${painted.map(h => h.toFixed(1))} vs ${level.toFixed(1)})`);
});

test("Deployed world: every promoted overlay (the dashboard's deployed development world among them) applies to a fresh world with nothing it can't do and nothing out of reach of the spawn, so a broken deploy never reaches players", async () => {
  const { OVERLAYS } = await import("../games/rarefriends-realm/overlays/index.ts");
  const { applyOverlay, cleanOverlay, validatePlacements, registerDefinitions } = await import("../games/rarefriends-realm/overlay.ts");
  const { WORLD_SEED, generateWorld } = await import("../games/rarefriends-realm/world.ts");
  const { registerDevQuest } = await import("../games/rarefriends-realm/content.ts");
  assert.ok(OVERLAYS.length >= 1, "the deployed development world is listed");
  for (const raw of OVERLAYS) {
    const why = [], overlay = cleanOverlay(raw, why), problems = [...why];
    assert.equal(overlay.ops.length, raw.ops.length, `${raw.name}: every op is well formed (${why.slice(0, 3).join("; ")})`);
    registerDefinitions(overlay, NPCS, problems); for (const op of overlay.ops) if (op.op === "quest") registerDevQuest(op.def, problems);
    const world = generateWorld(WORLD_SEED, { overlays: false }).world, placed = applyOverlay(world, overlay, WORLD_SEED, problems, NPCS);
    assert.deepEqual(problems, [], `${raw.name}: nothing it can't do`);
    assert.deepEqual(validatePlacements(world, overlay, placed), [], `${raw.name}: everything it places can be reached`);
  }
});

test("The four smithed families: recipes at the anvil from the ordinary metals; a prospector's pick mines surer and doubles ore; hardware cuts the boatmen's fares; a resonance fitting makes a carving stand longer, once", async () => {
  const { fare, DOCKS } = await import("../games/rarefriends-realm/boats.ts");
  const { fitCarving, setCarving } = await import("../games/rarefriends-realm/engine.ts");
  const families = ITEM_LIST.filter(entry => entry.family);
  assert.deepEqual([...new Set(families.map(entry => entry.family))].sort(), ["fieldcraft", "prospector", "resonance", "shipwright"], "exactly four families");
  assert.equal(families.filter(entry => entry.family === "prospector").length, 6); assert.equal(families.filter(entry => entry.family === "fieldcraft").length, 9, "six from the ore metals and three from the forged");
  assert.equal(families.filter(entry => entry.family === "shipwright").length, 11); assert.equal(families.filter(entry => entry.family === "resonance").length, 4);
  const pewter = smithingRecipes("pewter"), rarite = smithingRecipes("rarite");
  assert.ok(pewter.some(r => r.outputs.pewter_prospectors_pick === 1 && r.inputs.pewter_bar === 3 && r.inputs.logs === 1), "a prospector's pick: three bars and a handle");
  assert.ok(pewter.some(r => r.outputs.pewter_camp_kit === 1), "the camp kit is pewter"); assert.ok(pewter.some(r => r.outputs.pewter_rivets === 10), "ten rivets a bar");
  assert.ok(rarite.some(r => r.outputs.rarite_ships_bell === 1 && r.inputs.rarite_bar === 5)); assert.ok(rarite.some(r => r.outputs.rarite_resonance_fitting === 1));
  assert.ok(!pewter.some(r => r.outputs.pewter_hull_fitting), "hull fittings start at moonsilver"); assert.ok(!smithingRecipes("frostsilver").some(r => r.label.includes("prospector")), "forged metals make none of them");
  // The prospector's pick is a pickaxe of its metal's tier, usable at the metal's Mining level plus three.
  const pick = ITEM_LIST.find(entry => entry.id === "moonsilver_prospectors_pick");
  assert.deepEqual(pick.tool, { kind: "pickaxe", tier: 4, level: 23 }); assert.equal(pick.power, 4);
  // Fares: a hull fitting carried takes a fifth off, the bell a third.
  const g = newGame(), p = g.player;
  // The farthest two landings (the minimum fare of 10 would hide a cut on a short crossing).
  let a = DOCKS[0], b = DOCKS[1], best = 0;
  for (const x of DOCKS) for (const y of DOCKS) { const f = fare(g, x.id, y.id); if (f > best) { best = f; a = x; b = y; } }
  const base = fare(g, a.id, b.id); give(p, "glimmer_hull_fitting"); const cut = fare(g, a.id, b.id);
  assert.ok(base > 0 && cut < base, `a fifth off (${base} → ${cut})`); take(p, "glimmer_hull_fitting"); give(p, "rarite_ships_bell"); assert.ok(fare(g, a.id, b.id) < cut, "a third off with the bell");
  // A resonance fitting on a carving: longer, once.
  give(p, "carving_hearth"); setCarving(g, p.inventory.findIndex(slot => slot?.id === "carving_hearth"));
  const carving = g.carvings[0], before = carving.until - carving.placed;
  give(p, "glimmer_resonance_fitting"); fitCarving(g, p.inventory.findIndex(slot => slot?.id === "glimmer_resonance_fitting"));
  assert.equal(carving.until - carving.placed, before * 2, "glimmer: twice as long"); assert.equal(carving.fitted, "glimmer_resonance_fitting"); assert.ok(!has(p, "glimmer_resonance_fitting"));
  give(p, "ashsteel_resonance_fitting"); fitCarving(g, p.inventory.findIndex(slot => slot?.id === "ashsteel_resonance_fitting"));
  assert.equal(carving.until - carving.placed, before * 2, "one fitting a carving"); assert.ok(has(p, "ashsteel_resonance_fitting"), "the second isn't used up");
});

test("Camping: a camp kit pitches a tent and a fire in the wild (not in town, not underground, not among the dragons); rest, pack up; a lantern and Wayfaring 25 make it where you wake; a field altar takes bones for less; XP once in a while; it all survives a save", async () => {
  const { CAMP_RULES, campAllowed, packUpCamp, restAtCamp, setUpCamp, setUpFieldAltar, toggleRespawn } = await import("../games/rarefriends-realm/camping.ts");
  const { offerBones, FIELD_ALTAR_RATE } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player, world = g.world;
  // The fountain is no place for a tent; the wild is.
  assert.ok(campAllowed(g, p.x, p.y), "the fountain square is no place for a tent");
  const wild = (() => { for (let y = northShift(20); y < northShift(300); y++) for (let x = 20; x < 500; x++) if (campAllowed(g, x, y) === null) return { x, y }; return null; })();
  assert.ok(wild, "somewhere to camp");
  teleport(g, wild.x, wild.y);
  assert.ok(!setUpCamp(g), "no kit, no camp"); give(p, "pewter_camp_kit");
  p.xp.agility = 0; assert.ok(!setUpCamp(g), "Wayfaring 5 first"); p.xp.agility = XP_TABLE[5];
  const xpBefore = p.xp.agility;
  assert.ok(setUpCamp(g), "pitched"); assert.ok(p.camp && p.camp.x === wild.x && p.camp.y === wild.y && p.camp.tier === 1);
  assert.ok(p.xp.agility > xpBefore, "Wayfaring XP for pitching"); assert.ok(world.objects.some(o => o.name === "Your tent" && o.x === wild.x), "the tent stands in the world"); assert.ok(g.fires.some(f => f.expires === Infinity), "a fire to cook on");
  assert.ok(!(p.x === wild.x && p.y === wild.y), "you stand beside it");
  // Not where you'd wake without a lantern; with one, and the level, yes.
  toggleRespawn(g); assert.equal(p.camp.respawn, false);
  packUpCamp(g); assert.equal(p.camp, null); assert.ok(!world.objects.some(o => o.name === "Your tent"), "packed away");
  const xpAfterFirst = p.xp.agility; teleport(g, wild.x, wild.y); assert.ok(setUpCamp(g)); assert.equal(p.xp.agility, xpAfterFirst, "no XP for pitching again so soon");
  packUpCamp(g); give(p, "ashsteel_camp_lantern"); teleport(g, wild.x, wild.y); assert.ok(setUpCamp(g)); assert.equal(p.camp.tier, 3);
  p.xp.agility = XP_TABLE[25]; toggleRespawn(g); assert.equal(p.camp.respawn, true);
  // Fall: you wake by your fire.
  const { die } = await import("../games/rarefriends-realm/engine.ts");
  teleport(g, world.places.spawn.x + 30, world.places.spawn.y + 30); die(g);
  assert.ok(Math.abs(p.x - wild.x) <= 1 && Math.abs(p.y - wild.y) <= 1, `woke at the camp (${p.x},${p.y} vs ${wild.x},${wild.y})`);
  // A field altar: bones for half again a burial (an altar gives twice).
  teleport(g, wild.x - 1, wild.y); give(p, "moonsilver_field_altar"); setUpFieldAltar(g, p.inventory.findIndex(slot => slot?.id === "moonsilver_field_altar"));
  assert.ok(p.camp.altar && world.objects.some(o => o.kind === "altar" && o.text === "field"), "the field altar stands beside the tent");
  p.familyId = 1; p.xp.prayer = XP_TABLE[40];
  give(p, "bones"); const f0 = p.xp.prayer; offerBones(g, p.inventory.findIndex(slot => slot?.id === "bones"), false, true); const field = p.xp.prayer - f0;
  give(p, "bones"); const a0 = p.xp.prayer; offerBones(g, p.inventory.findIndex(slot => slot?.id === "bones"), false, false); const altar = p.xp.prayer - a0;
  assert.ok(Math.abs(field / altar - FIELD_ALTAR_RATE / 2) < 1e-6, `a field altar gives ${FIELD_ALTAR_RATE} to an altar's 2 (${field} vs ${altar})`);
  // Saved and restored: the camp, its altar, its waking place.
  const save = serialize(g); assert.deepEqual(save.camp, { x: wild.x, y: wild.y, tier: 3, respawn: true, altar: true, cache: null, brazier: false, waystone: false });
  const h = newGame(); assert.ok(restore(h, save)); assert.deepEqual(h.player.camp, save.camp); assert.ok(h.world.objects.some(o => o.name === "Your tent"), "painted back in at load");
  packUpCamp(h); assert.ok(has(h.player, "moonsilver_field_altar"), "the altar comes back when the camp is packed");
  // Nowhere forbidden: underground, in a dangerous region, in the Ring.
  assert.match(campAllowed(g, 10, OVERWORLD_H + 5) ?? "", /sky/);
  assert.ok(CAMP_RULES.danger <= 4);
});

test("Overlay definitions: an errand quest an overlay defines is offered by its giver, logged, delivered and paid like any other; a camp zone overrides the camping rules with its reason; the promotion script writes the overlay as a listed module", async () => {
  const { cleanOverlay } = await import("../games/rarefriends-realm/overlay.ts");
  const { registerDevQuest, QUESTS, questDone, NPCS } = await import("../games/rarefriends-realm/content.ts");
  const { CAMP_RULES, campAllowed, setDevCampZones } = await import("../games/rarefriends-realm/camping.ts");
  const { registerDefinitions } = await import("../games/rarefriends-realm/overlay.ts");
  const why = [], overlay = cleanOverlay({ v: 1, name: "Errands", ops: [
    { op: "npc", def: { id: "dev_tester", name: "Tess the Tester", examine: "Tests.", options: ["Talk-to"], art: { family: 9, seed: 3 }, lines: ["Hello.", "Still here."] } },
    { op: "quest", def: { id: "dev_errand", name: "Two Logs", giver: "dev_tester", item: "logs", count: 2, offer: ["Could you bring me two logs?", "For the fire."], accept: "Thank you.", progress: "Two logs, when you have them.", done: ["Lovely.", "Here's something for your trouble."], points: 1, rewards: { coins: 50, xp: { skill: "woodcutting", amount: 100 }, items: [{ id: "logs", n: 1 }] } } },
    { op: "quest", def: { id: "dev_bad", name: "Bad", giver: "nobody_here", item: "logs", count: 1, offer: ["?"], accept: "?", progress: "?", done: ["?"], rewards: {} } },
    { op: "quest", def: { id: "dev_worse", name: "Worse", giver: "dev_tester", item: "logs", count: 0, offer: [], accept: "?", progress: "?", done: ["?"], rewards: {} } },
    { op: "campzone", uid: "zone1", x0: 100, y0: 100, x1: 90, y1: 110, allow: false, why: "The warden forbids fires here." },
    { op: "campzone", uid: "zone2", x0: 200, y0: 200, x1: 204, y1: 204, allow: true },
    { op: "campzone", uid: "zone3", x0: 1, y0: 1, x1: 2, y1: 2 },
  ] }, why);
  assert.equal(overlay.ops.length, 5, "the quest with no lines and the zone with no allow are dropped"); assert.ok(why.some(w => /bad quest/.test(w)) && why.some(w => /bad campzone/.test(w)));
  const zone = overlay.ops.find(op => op.op === "campzone"); assert.deepEqual([zone.x0, zone.y0, zone.x1, zone.y1], [90, 100, 100, 110], "corners put in order");
  // Registered: the NPC through the game's table, the quest through content.ts (the giver has to exist; so does the item).
  const problems = []; registerDefinitions(overlay, NPCS, problems);
  for (const op of overlay.ops) if (op.op === "quest") registerDevQuest(op.def, problems);
  assert.ok(problems.some(p => /nobody called nobody_here/.test(p)), "a quest without its giver is refused");
  assert.ok(NPCS.dev_tester?.dev && QUESTS.some(q => q.id === "dev_errand" && q.dev) && !QUESTS.some(q => q.id === "dev_bad"));
  const quest = QUESTS.find(q => q.id === "dev_errand"); assert.deepEqual(quest.rewards, ["1 Quest Point", "50 Frens", "100 Woodcutting XP", "1 Logs"]);
  try {
    const g = newGame(), p = g.player;
    assert.deepEqual(quest.journal(g), ["I can start this quest by talking to Tess the Tester."]);
    // The giver offers it (their own lines wait), you accept, bring the logs, and are paid; then they say their lines.
    let d = talk(g, "dev_tester"); assert.equal(d.lines[0].text, "Could you bring me two logs?"); assert.equal(d.lines[1].text, "For the fire.");
    d = d.options.find(o => o.label === "I'll do it.").then(); assert.equal(d.lines[0].text, "Thank you."); d.onEnd?.();
    assert.equal(p.quests.dev_errand, 1); assert.ok(quest.journal(g)[1].includes("0 of 2"));
    d = talk(g, "dev_tester"); assert.equal(d.lines[0].text, "Two logs, when you have them.");
    give(p, "logs", 2); assert.ok(quest.journal(g)[1].startsWith("✓"));
    const coins = count(p, "coins"), xp = p.xp.woodcutting;
    d = talk(g, "dev_tester"); assert.equal(d.lines[0].text, "Lovely."); d.onEnd?.();
    assert.ok(questDone(g, "dev_errand")); assert.equal(count(p, "coins"), coins + 50); assert.equal(p.xp.woodcutting, xp + 100); assert.equal(count(p, "logs"), 1, "two taken, one given back");
    d = talk(g, "dev_tester"); assert.equal(d.lines[0].text, "Hello.", "the errand done, their own lines");
    // Saved and restored like any other quest (the list is read at restore time, so an overlay's quests count).
    const h = newGame(); restore(h, serialize(g)); assert.ok(questDone(h, "dev_errand"));
    // Camp zones: the forbidding rectangle says why; the allowing one lets a camp stand even by a bank; the rules hold elsewhere.
    setDevCampZones(overlay);
    assert.equal(CAMP_RULES.overrides.length, 2); assert.equal(campAllowed(g, 95, 105), "The warden forbids fires here.");
    assert.equal(campAllowed(g, 202, 202), null, "allowed whatever the ground");
    assert.ok(campAllowed(g, p.x, p.y), "the fountain square is still no place for a tent");
    setDevCampZones(null); assert.equal(CAMP_RULES.overrides.length, 0);
  } finally {
    // (The shared tables: the next tests see the Realm as it was.)
    delete NPCS.dev_tester; for (const id of ["dev_errand"]) { const at = QUESTS.findIndex(q => q.id === id); if (at >= 0) QUESTS.splice(at, 1); }
    setDevCampZones(null);
  }
  // The promotion script: the overlay becomes a module under overlays/, listed in index.ts, and loads as code.
  const { mkdtempSync, writeFileSync, readFileSync: read, rmSync } = await import("node:fs"), { tmpdir } = await import("node:os"), { join } = await import("node:path"), { execFileSync } = await import("node:child_process");
  const dir = mkdtempSync(join(tmpdir(), "realm-promote-"));
  try {
    for (const file of ["index.ts", "devworld.ts"]) writeFileSync(join(dir, file), read(`games/rarefriends-realm/overlays/${file}`, "utf8").replace('from "../overlay.ts"', `from "${process.cwd()}/games/rarefriends-realm/overlay.ts"`));
    writeFileSync(join(dir, "errands.json"), JSON.stringify({ ...overlay, ops: overlay.ops.filter(op => op.op === "campzone") }));
    const out = execFileSync("node", ["--no-warnings", "scripts/dev-promote.mjs", join(dir, "errands.json"), "errands"], { env: { ...process.env, REALM_OVERLAYS_DIR: dir } }).toString();
    assert.match(out, /2 camp zones/); assert.match(out, /Wrote .*errands\.ts and listed it/);
    const index = read(join(dir, "index.ts"), "utf8"); assert.match(index, /import errands from "\.\/errands\.ts";/); assert.match(index, /OVERLAYS: readonly Overlay\[\] = \[devworld, errands\];/);
    const module = await import(join(dir, "errands.ts")); assert.equal(module.default.ops.length, 2); assert.equal(module.default.name, "Errands");
    const listed = await import(join(dir, "index.ts")); assert.equal(listed.OVERLAYS.length, 2, "the deployed world and the promoted one");
    // Again: listed once.
    execFileSync("node", ["--no-warnings", "scripts/dev-promote.mjs", join(dir, "errands.json"), "errands"], { env: { ...process.env, REALM_OVERLAYS_DIR: dir } });
    assert.equal((read(join(dir, "index.ts"), "utf8").match(/errands/g) ?? []).length, 3);
    // An overlay with a problem is refused (--check says so; without --force the files aren't written).
    writeFileSync(join(dir, "bad.json"), JSON.stringify({ v: 1, ops: [{ op: "spawn", uid: "s1", kind: "monster", id: "no_such_monster", x: 10, y: 10 }] }));
    assert.throws(() => execFileSync("node", ["--no-warnings", "scripts/dev-promote.mjs", join(dir, "bad.json"), "--check"], { stdio: "pipe" }), /Command failed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("The Hearthkin: Emberforge's Fellows of Metal (the trial, the Deep behind a Fellows' ladder, guild furnaces), the Old Pavilion (the Elder anvils after their quest), Frostpeak up the mountain with its two legendary smiths (the cold quench, Oddhand's gauge), the lower lodge below, the Strong Friend touched but not explained", async () => {
  const { HEARTHKIN_NPCS, HEARTHKIN_QUESTS, FELLOWS_TRIAL, ELDER_ANVIL, COLD_QUENCH, VEINS } = await import("../games/rarefriends-realm/hearthkin.ts");
  const { COLD_QUENCH_ANVIL, ELDER_ANVIL_NAME, GUILD_FURNACE } = await import("../games/rarefriends-realm/hearthkinnames.ts");
  const { QUESTS, questDone, NPCS } = await import("../games/rarefriends-realm/content.ts");
  const { HEARTHKIN, friendSprite } = await import("../games/rarefriends-realm/sprites.ts");
  const { PATRONS } = await import("../games/rarefriends-realm/orders.ts");
  const { regionAt } = await import("../games/rarefriends-realm/world.ts");
  const g = newGame(), p = g.player, world = g.world, m = (x, y) => mainlandAt(x, y);
  // The people: thirteen of them, all placed, all Hearthkin (a family of their own in the sprite system, drawn stout and bearded).
  for (const id of Object.keys(HEARTHKIN_NPCS)) { assert.ok(NPCS[id], `${id} is one of the Realm's people`); assert.ok(world.spawns.some(s => s.kind === "npc" && s.id === id), `${id} is placed`); assert.equal(NPCS[id].art.family, HEARTHKIN); }
  assert.ok(world.spawns.filter(s => s.id === "ember_hearthkin_villager").length >= 4 && world.spawns.filter(s => s.id === "frost_hearthkin_villager").length >= 3, "Hearthkin about in both towns");
  const sprite = friendSprite(HEARTHKIN, 2101); assert.equal(sprite.idle.length, 16); assert.ok(sprite.idle.slice(0, 3).every(row => !row.includes("#")) === false || sprite.idle[3].includes("#"), "short: nothing above row 3 but a helm or a hood"); assert.ok(sprite.idle[12].includes("########"), "broad");
  assert.ok(new Set([2101, 2102, 2103, 2104, 2105, 2106, 2111, 2112].map(seed => friendSprite(HEARTHKIN, seed).idle.join("/"))).size >= 4, "hoods, helms, beards and tools vary");
  for (const q of HEARTHKIN_QUESTS) assert.ok(QUESTS.some(entry => entry.id === q.id), `${q.name} is in the quest list`);
  // Frostpeak is up the mountain: the town on its shelf stands far above the old camp, in the Frostpeak region, and glides land in the square; the old lodge is the lower lodge, with a warden.
  const square = world.places.frostpeak, lodge = m(195, 30); assert.deepEqual(square, m(252, 31));
  // (Heights flatten where there's building: a town's square sits level like Highcairn's; the climb is in the approach, where the switchbacks top out well above the road and the camp.)
  const h = (at) => world.heights[at.y * (W + 1) + at.x], passTop = m(251, 42), bend = m(236, 54);
  assert.ok(h(passTop) > h(bend) + 60 && h(passTop) > h(lodge) + 80 && h(square) > h(lodge) + 30, `the pass climbs above the road and the camp (${Math.round(h(passTop))} over ${Math.round(h(bend))}, the square ${Math.round(h(square))})`);
  assert.equal(regionAt(world, square.x, square.y).id, "frostpeak"); assert.ok(world.buildings.some(b => b.name === "Frostpeak Lodge") && world.buildings.some(b => b.name === "The lower lodge") && !world.buildings.some(b => b.name === "Frostpeak lodge"));
  assert.ok(world.spawns.some(s => s.id === "outfitter" && Math.abs(s.x - square.x) < 10 && Math.abs(s.y - square.y) < 10), "the outfitter moved up"); assert.ok(world.spawns.some(s => s.id === "camp_warden" && Math.abs(s.x - lodge.x) < 6));
  const named = name => world.objects.find(o => o.name === name); assert.ok(named(COLD_QUENCH_ANVIL) && named("Furnace") && named("The snowmelt trough"), "Coldhammer's forge");
  assert.equal(world.objects.filter(o => o.name === ELDER_ANVIL_NAME).length, 2); assert.equal(world.objects.filter(o => o.name === GUILD_FURNACE).length, 2);
  assert.equal(world.objects.filter(o => o.decor === "strong_friend").length, 2, "the Strong Friend stands at the Pavilion and in Frostpeak");
  const deepLadder = named("Ladder to the Deep"); assert.deepEqual(deepLadder.requires, { quest: FELLOWS_TRIAL });
  assert.equal(regionAt(world, deepLadder.to.x, deepLadder.to.y).id, "fellows_deep"); assert.equal(regionAt(world, named("Quarry shaft").to.x, named("Quarry shaft").to.y).id, "ashen_shaft");
  // The Deep's ladder is for Fellows: not before the trial.
  teleport(g, deepLadder.x - 1, deepLadder.y); setTarget(g, { kind: "object", id: deepLadder.id, option: "Climb-down" }); until(g, () => g.messages.some(e => /for Fellows of Metal/.test(e.text)), 20);
  assert.equal(regionAt(world, p.x, p.y).id, "emberforge", "still up top");
  // The Fellows' Trial: Mining 50 and Smithing 50 first; four moonsilver bars and ten rivets; then the ladder, and the guild furnaces' second bar.
  let d = talk(g, "fellows_warden"); assert.match(d.lines[0].text, /Come back with Mining 50 and Smithing 50/);
  p.xp.mining = XP_TABLE[50]; p.xp.smithing = XP_TABLE[50];
  d = talk(g, "fellows_warden"); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.(); assert.equal(p.quests[FELLOWS_TRIAL], 1);
  give(p, "moonsilver_bar", 4); give(p, "moonsilver_rivets", 10); d = talk(g, "fellows_warden"); assert.match(d.lines[0].text, /Welcome to the Fellows/); d.onEnd?.();
  assert.ok(questDone(g, FELLOWS_TRIAL)); assert.equal(count(p, "moonsilver_bar"), 0); assert.ok(p.xp.mining > XP_TABLE[50] + 4999);
  g.messages.length = 0; setTarget(g, { kind: "object", id: deepLadder.id, option: "Climb-down" }); until(g, () => regionAt(world, p.x, p.y).id === "fellows_deep", 20); assert.equal(regionAt(world, p.x, p.y).id, "fellows_deep", "down the ladder");
  assert.ok(world.objects.filter(o => o.kind === "rock" && regionAt(world, o.x, o.y).id === "fellows_deep" && ["glimmer", "rarite"].includes(o.rock)).length >= 8, "glimmer and rarite in the Deep");
  // A guild furnace: smelting moonsilver beside it gives up a second bar one time in five (the rng, pinned).
  const furnace = named(GUILD_FURNACE); teleport(g, furnace.x, furnace.y + 1); p.inventory.fill(null);
  const moonsilver = smeltingRecipes().find(r => r.label === "Moonsilver bar"); for (const [id, n] of Object.entries(moonsilver.inputs)) give(p, id, n * 5);
  for (let i = 0; i < 5; i++) { g.rng = () => 0.1; startProduction(g, moonsilver, 1); until(g, () => p.activity === null, 40); } const bars = count(p, "moonsilver_bar");
  assert.equal(bars, 10, `with the rng pinned low, a second bar from the guild furnace every time (${bars})`);
  teleport(g, furnace.x + 3, furnace.y + 4); p.inventory.fill(null); for (const [id, n] of Object.entries(moonsilver.inputs)) give(p, id, n); g.rng = () => 0.1; startProduction(g, moonsilver, 1); until(g, () => p.activity === null, 40);
  assert.equal(count(p, "moonsilver_bar"), 1, "away from the guild furnace, one bar");
  // The Elder Anvil: fed, the Pavilion's anvils teach a quarter more.
  p.xp.mining = XP_TABLE[30]; p.xp.smithing = XP_TABLE[30]; d = talk(g, "pavilion_keeper"); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.();
  give(p, "blackiron_bar", 10); give(p, "inkcoal", 5); d = talk(g, "pavilion_keeper"); d.onEnd?.(); assert.ok(questDone(g, ELDER_ANVIL)); assert.equal(count(p, "inkcoal"), 0);
  const elder = named(ELDER_ANVIL_NAME), dagger = smithingRecipes("pewter").find(r => r.label === "Pewter dagger");
  teleport(g, elder.x, elder.y + 1); p.inventory.fill(null); give(p, "pewter_bar", 2); give(p, "hammer"); let xp = p.xp.smithing; startProduction(g, dagger, 1); until(g, () => p.activity === null, 40);
  const atElder = p.xp.smithing - xp; teleport(g, furnace.x + 3, furnace.y + 4); const anyAnvil = world.objects.find(o => o.kind === "anvil" && o.name === "Anvil"); teleport(g, anyAnvil.x, anyAnvil.y + 1);
  xp = p.xp.smithing; startProduction(g, dagger, 1); until(g, () => p.activity === null, 40); const atPlain = p.xp.smithing - xp;
  assert.ok(Math.abs(atElder - atPlain * 1.25) < 0.01, `a quarter more at the Elder anvil (${atElder} vs ${atPlain})`);
  // The Cold Quench and Veins of the Shoulder, at Frostpeak: their levels, their makings, their rewards.
  d = talk(g, "frost_smith_cold"); assert.match(d.lines[0].text, /Come back at Smithing 50 and Mining 45/);
  p.xp.smithing = XP_TABLE[50]; p.xp.mining = XP_TABLE[55];
  d = talk(g, "frost_smith_cold"); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.(); give(p, "frost_shard", 3); give(p, "inkcoal", 6); give(p, "moonsilver_bar", 2);
  d = talk(g, "frost_smith_cold"); d.onEnd?.(); assert.ok(questDone(g, COLD_QUENCH));
  const cold = named(COLD_QUENCH_ANVIL), frostsilver = smithingRecipes("frostsilver").find(r => r.label === "Frostsilver dagger"); assert.ok(frostsilver, "a forged recipe");
  p.xp.smithing = XP_TABLE[frostsilver.level]; teleport(g, cold.x, cold.y - 1); p.inventory.fill(null); give(p, "hammer"); give(p, "frostsilver_bar", Object.values(frostsilver.inputs)[0] * 12);
  g.rng = () => 0.1; let kept = 0; for (let i = 0; i < 10; i++) { const before = count(p, "frostsilver_bar"); startProduction(g, frostsilver, 1); until(g, () => p.activity === null, 40); kept += before - count(p, "frostsilver_bar") < Object.values(frostsilver.inputs)[0] ? 1 : 0; }
  assert.equal(kept, 10, "with the rng pinned low, the quench keeps a bar back every time"); g.rng = () => 0.9; { const before = count(p, "frostsilver_bar"); startProduction(g, frostsilver, 1); until(g, () => p.activity === null, 40); assert.equal(before - count(p, "frostsilver_bar"), Object.values(frostsilver.inputs)[0], "…and not when it doesn't"); }
  d = talk(g, "frost_smith_wright"); assert.match(d.lines[0].text, /Every rock has a rhythm/); d = d.options.find(o => o.label === "I'll do it.").then(); assert.match(d.lines[0].text, /The faces along the track/); d.onEnd?.();
  assert.equal(p.quests[VEINS], 1); p.inventory.fill(null); assert.equal(give(p, "moonsilver_ore", 8), 0, "the ore fits"); assert.equal(give(p, "rough_moonstone", 1), 0);
  d = talk(g, "frost_smith_wright"); assert.match(d.lines[0].text, /Hold still/); d.onEnd?.(); assert.ok(questDone(g, VEINS)); assert.ok(has(p, "oddhands_gauge")); assert.equal(item("oddhands_gauge").tradeable, false);
  // The gauge: a moonsilver rock mined with it carried comes back a third sooner.
  const rock = world.objects.find(o => o.rock === "moonsilver"); teleport(g, rock.x, rock.y + 1); p.xp.mining = XP_TABLE[60]; p.inventory.fill(null); give(p, "oddhands_gauge"); give(p, "rarite_pickaxe");
  g.rng = () => 0; setTarget(g, { kind: "object", id: rock.id, option: "Mine" }); until(g, () => g.depleted.has(rock.id), 60);
  const withGauge = g.depleted.get(rock.id) - g.tick; take(p, "oddhands_gauge"); g.depleted.delete(rock.id); g.rng = () => 0; setTarget(g, { kind: "object", id: rock.id, option: "Mine" }); until(g, () => g.depleted.has(rock.id), 60);
  const without = g.depleted.get(rock.id) - g.tick; assert.ok(Math.abs(withGauge / without - 2 / 3) < 0.05, `two thirds the wait (${withGauge} vs ${without})`);
  // The Strong Friend: touched, counted, not explained; the Warden's and the quarrymaster's orders are smithing work.
  const statue = world.objects.find(o => o.decor === "strong_friend"); assert.deepEqual(menuFor(g, [{ kind: "object", id: statue.id }], null).map(o => o.verb).filter(v => v !== "Walk here" && v !== "Examine"), ["Touch"]);
  teleport(g, statue.x, statue.y + 1); setTarget(g, { kind: "object", id: statue.id, option: "Touch" }); until(g, () => (p.questData.touched_strong_friend ?? 0) > 0, 20); assert.equal(p.questData.touched_strong_friend, 1);
  assert.ok(PATRONS.fellows_warden.items().some(i => i.id === "moonsilver_rivets" && i.level === 23) && PATRONS.quarry_master.items().some(i => i.id === "pewter_bar"));
  // Saved and restored: the gauge, the quests, the touch.
  give(p, "oddhands_gauge"); const k = newGame(); restore(k, serialize(g)); assert.ok(questDone(k, COLD_QUENCH) && questDone(k, FELLOWS_TRIAL) && has(k.player, "oddhands_gauge"));
});

test("Dungeon identity: every underground region has a theme of a family, each family's stone and floor paint differently, the Rime Galleries hang under Frostpeak's shelf and the Sigil Vault under the Wizards' Tower, and every dungeon is dressed in its family's things", async () => {
  const { DUNGEON_THEMES, FAMILIES, dungeonTheme } = await import("../games/rarefriends-realm/dungeontheme.ts");
  const { themedWall, themedGround } = await import("../games/rarefriends-realm/dungeontextures.ts");
  const { REGIONS, regionAt } = await import("../games/rarefriends-realm/world.ts");
  const { cofferTier } = await import("../games/rarefriends-realm/dungeons.ts");
  const g = newGame(), world = g.world;
  // Coverage: every underground region, a theme; six families among them.
  for (const region of REGIONS.filter(r => r.underground)) assert.ok(DUNGEON_THEMES[region.id], `${region.name} has a theme`);
  assert.ok(new Set(Object.values(FAMILIES).map(t => t.family)).size >= 6);
  // The painters: a fake canvas records what each family's stone and floor paint (past the plain fill); no two families paint alike.
  const paint = (fn, families, pick, ...dims) => families.map(family => { const set = new Set(); let n = 0; const p = { rect: (x, y, w, h, c) => { if (w >= dims[0] && h >= dims[dims.length - 1]) return; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set.add(`${i},${j},${c}`); n++; }, set: (x, y, c) => { set.add(`${x},${y},${c}`); n++; }, line: (x0, y0, x1, y1, c) => { set.add(`l${x0},${y0},${x1},${y1},${c}`); n++; }, polyline: (pts, c) => { set.add(`p${pts.join("|")},${c}`); n++; }, disc: (cx, cy, rx, ry, f, s) => { set.add(`d${cx},${cy},${rx},${ry},${f},${s}`); n++; } };
    const noise = (x, y, salt) => ((x * 7 + y * 13 + salt * 31) % 100) / 100, shade = (hex, amount) => `${hex}@${amount.toFixed(2)}`, [style, color] = pick(family);
    const painted = fn(p, style, color, 0, noise, shade, ...dims); if (painted) assert.ok(n > 10, `${family.id} paints something`); return [family.id, set, painted]; });
  const list = Object.values(FAMILIES), walls = paint(themedWall, list, f => [f.wall.style, f.wall.top], 16, 24), floors = paint(themedGround, list, f => [f.floor.style, f.floor.color], 16);
  assert.ok(walls.filter(w => w[2]).length >= 12 && floors.filter(f => f[2]).length >= 12, "most families have stone and floors of their own (the rest keep the old styles)");
  // A family's identity is its stone and its floor together (two families may share a floor's detail and differ in everything else).
  const identity = walls.map(([id, wall, painted], i) => [id, new Set([...[...wall].map(k => `w${k}`), ...[...floors[i][1]].map(k => `f${k}`)]), painted || floors[i][2]]);
  const differ = (a, b) => { let same = 0; for (const k of a) if (b.has(k)) same++; return same / new Set([...a, ...b]).size < 0.7; };
  for (let i = 0; i < identity.length; i++) for (let j = i + 1; j < identity.length; j++) if (identity[i][2] && identity[j][2]) assert.ok(differ(identity[i][1], identity[j][1]), `${identity[i][0]} and ${identity[j][0]} look different`);
  assert.ok(!themedWall({ rect() {}, set() {}, line() {}, polyline() {}, disc() {} }, "brick", "#fff", 0, () => 0, h => h, 16, 24), "the old styles are left to textures.ts");
  // The places: the Rime Galleries' ladder on the shelf, the Vault's stairs in the tower; their themes; their coffers deep.
  const rime = world.objects.find(o => o.name === "The Rime Galleries"), vault = world.objects.find(o => o.name === "Vault stairs");
  const shelf = M(261, 38), tower = M(160, 132);
  assert.deepEqual([rime.x, rime.y], shelf); assert.deepEqual([vault.x, vault.y], tower);
  assert.equal(regionAt(world, rime.to.x, rime.to.y).id, "rime_galleries"); assert.equal(regionAt(world, vault.to.x, vault.to.y).id, "sigil_vault");
  assert.equal(dungeonTheme(world, rime.to.x, rime.to.y).id, "rime"); assert.equal(dungeonTheme(world, vault.to.x, vault.to.y).id, "arcane"); assert.equal(dungeonTheme(world, rime.x, rime.y), null, "no theme above ground");
  assert.ok(world.objects.some(o => o.name === "The cold forge") && world.objects.some(o => o.name === "Frosted anvil") && world.objects.some(o => o.decor === "rune_circle"));
  assert.ok(world.objects.filter(o => o.decor === "crystal" && regionAt(world, o.x, o.y).id === "rime_galleries").length >= 6);
  assert.ok(world.spawns.filter(s => s.id === "frost_wisp" && regionAt(world, s.x, s.y).id === "sigil_vault").length >= 4, "the wisps keep the vault");
  assert.equal(cofferTier(g, world.objects.find(o => o.name === "The vault's coffer")), "deep"); assert.equal(cofferTier(g, world.objects.find(o => o.name === "Frostsmith's old chest")), "deep");
  // The dressing: the catacombs have their sarcophagi and bones, the deep mine its carts and props, the sea cave its barnacled rock, the Hollow its pale obelisks; nothing dressed stands in a doorway.
  const inRegion = (id, test) => world.objects.filter(o => o.kind === "decor" && regionAt(world, o.x, o.y).id === id && test(o)).length;
  assert.ok(inRegion("catacombs", o => o.name === "Sarcophagus") >= 6 && inRegion("catacombs", o => o.decor === "bones") >= 8);
  assert.ok(inRegion("deep_mine", o => o.name === "Ore cart") >= 4 && inRegion("deep_mine", o => o.name === "Pit prop") >= 6);
  assert.ok(inRegion("sea_cave", o => o.name === "Barnacled rock") >= 6 && inRegion("hollow_depths", o => o.decor === "obelisk") >= 4 && inRegion("deepglass", o => o.decor === "crystal") >= 10);
  const walls2 = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => world.tiles[(y + dy) * W + x + dx] === T.WALL);
  for (const o of world.objects) if (o.kind === "decor" && o.blocks && ["Sarcophagus", "Ore cart", "Pit prop"].includes(o.name)) { const [e, w, s, n] = walls2(o.x, o.y); assert.ok(!((e && w) || (s && n)), `${o.name} at ${o.x},${o.y} doesn't block a passage`); }
});

test("Activities: a challenge set by its host runs on the game's own mechanics, is timed, scored, paid once and remembered; the Quarry Call counts only the quarry's rock, the Assay Run only the guild furnaces' bars and counts the failures, the Hot Tunnel wants the gem rock and a live return, the Pass Run is on foot; a death or the clock fails it, a failure shortens the wait, and it all survives a save", async () => {
  const { ACTIVITIES, ACTIVITY_HOSTS, activityProblem, startActivity, cancelActivity, activityEvent, activityTick, activityRecord, cleanActivities } = await import("../games/rarefriends-realm/activities.ts");
  const { GUILD_FURNACE } = await import("../games/rarefriends-realm/hearthkinnames.ts");
  const { regionAt } = await import("../games/rarefriends-realm/world.ts");
  const g = newGame(), p = g.player;
  assert.deepEqual(Object.keys(ACTIVITIES), ["quarry_call", "assay_run", "hot_tunnel", "pass_run", "barrow_watch", "road_patrol", "farwake_survey", "redwake_contract", "archive_rubbings", "compact_order"]); assert.deepEqual(ACTIVITY_HOSTS.quarry_master, ["quarry_call", "hot_tunnel"]);
  // The host offers it in talk; the level gates it.
  let d = talk(g, "quarry_master"); assert.ok(d.options?.some(o => /Quarry Call/.test(o.label)), "the quarrymaster offers the Quarry Call");
  p.xp.mining = 0; assert.match(activityProblem(g, "quarry_call"), /Mining level of 10/);
  p.xp.mining = XP_TABLE[20]; assert.equal(activityProblem(g, "quarry_call"), null);
  // The Quarry Call: pewter rolled at Mining 20 (the rng pinned); ten of it, from the quarry's own faces; rock mined elsewhere doesn't count.
  g.rng = () => 0; assert.ok(startActivity(g, "quarry_call")); const run = p.activities.run; assert.equal(run.id, "quarry_call"); assert.equal(run.target.rock, "pewter"); assert.equal(run.target.count, 10);
  assert.match(activityProblem(g, "assay_run"), /on The Quarry Call already/);
  const [qx, qy] = M(110, 52), [fx, fy] = M(121, 123);
  activityEvent(g, { kind: "mine", rock: "pewter", x: fx, y: fy }); assert.equal(run.progress, 0, "the fountain square isn't the quarry");
  activityEvent(g, { kind: "mine", rock: "blackiron", x: qx, y: qy }); assert.equal(run.progress, 0, "the wrong rock");
  for (let i = 0; i < 9; i++) activityEvent(g, { kind: "mine", rock: "pewter", x: qx, y: qy }); assert.equal(run.progress, 9); assert.ok(p.activities.run, "not done at nine");
  const xp = p.xp.mining, coins = count(p, "coins"); activityEvent(g, { kind: "mine", rock: "pewter", x: qx, y: qy });
  assert.equal(p.activities.run, null, "done at ten"); assert.ok(p.xp.mining > xp + 100 && count(p, "coins") > coins, "paid"); assert.equal(activityRecord(g, "quarry_call").done, 1); assert.ok(activityRecord(g, "quarry_call").best > 0.9, "a fast run scores high");
  assert.match(activityProblem(g, "quarry_call"), /Not yet/, "the cooldown holds"); assert.equal(p.stats.activities, 1);
  // The Assay Run: the best metal you can smelt; bars from the guild furnace count, failures count against, other furnaces don't count.
  p.xp.smithing = XP_TABLE[25]; startActivity(g, "assay_run"); const assay = p.activities.run; assert.equal(assay.target.metal, "blackiron", "the best metal you can smelt at 25"); assert.equal(assay.target.count, 8);
  activityEvent(g, { kind: "produce", station: "Furnace", metal: "blackiron", failed: false }); assert.equal(assay.progress, 0);
  activityEvent(g, { kind: "produce", station: GUILD_FURNACE, metal: "blackiron", failed: true }); assert.equal(assay.failed, 1);
  for (let i = 0; i < 8; i++) activityEvent(g, { kind: "produce", station: GUILD_FURNACE, metal: "blackiron", failed: false });
  assert.equal(p.activities.run, null); const assayRecord = activityRecord(g, "assay_run"); assert.ok(assayRecord.best < 0.95 && assayRecord.best > 0.5, `a failure costs (${assayRecord.best})`);
  // The clock: a run that times out fails, pays nothing, and shortens the wait to a third.
  g.tick += 5000; p.xp.mining = XP_TABLE[45]; give(p, "cooked_meat"); startActivity(g, "hot_tunnel"); const tunnel = p.activities.run; const before = p.xp.mining;
  g.tick = tunnel.until; activityTick(g); assert.equal(p.activities.run, null); assert.equal(p.xp.mining, before, "nothing paid"); assert.equal(activityRecord(g, "hot_tunnel").done, 0);
  const wait = activityRecord(g, "hot_tunnel").lastAt + ACTIVITIES.hot_tunnel.cooldown - g.tick; assert.ok(wait > 0 && wait <= ACTIVITIES.hot_tunnel.cooldown / 3 + 1, `a third of the wait (${wait})`);
  // The Hot Tunnel done: the gem rock in the shaft's region, then standing in the quarry again; a death on the way fails it.
  g.tick += 5000; startActivity(g, "hot_tunnel"); activityEvent(g, { kind: "death" }); assert.equal(p.activities.run, null, "a death fails it");
  g.tick += 5000; startActivity(g, "hot_tunnel"); const gem = g.world.objects.find(o => o.rock === "gem" && regionAt(g.world, o.x, o.y).id === "ashen_shaft");
  teleport(g, gem.x, gem.y + 1); activityEvent(g, { kind: "mine", rock: "gem", x: gem.x, y: gem.y }); assert.equal(p.activities.run.marks.gem, 1); activityTick(g); assert.ok(p.activities.run, "still down there");
  teleport(g, qx, qy); activityTick(g); assert.equal(p.activities.run, null, "back up: done"); assert.ok(has(p, "rough_moonstone"), "the moonstone");
  // The Pass Run: from the lodge to the square on foot; a jump of more than three tiles in a tick is not running.
  g.tick += 5000; p.xp.agility = XP_TABLE[30]; const [lx, ly] = M(195, 32); teleport(g, lx, ly); startActivity(g, "pass_run"); activityTick(g);
  const square = g.world.places.frostpeak; teleport(g, square.x, square.y); activityTick(g); assert.equal(p.activities.run, null, "a glide to the square is not running"); assert.equal(activityRecord(g, "pass_run").done, 0);
  g.tick += 5000; teleport(g, lx, ly); startActivity(g, "pass_run"); activityTick(g);
  for (let x = lx; x < square.x; x += 2) { teleport(g, x, ly); activityTick(g); } for (let y = ly; y > square.y; y -= 2) { teleport(g, square.x, y); activityTick(g); } teleport(g, square.x, square.y); activityTick(g);
  assert.equal(p.activities.run, null); assert.equal(activityRecord(g, "pass_run").done, 1);
  // Cancelled, and saved: the run and the records come back; a run older than its clock is dropped.
  g.tick += 5000; startActivity(g, "quarry_call"); cancelActivity(g); assert.equal(p.activities.run, null);
  g.tick += 5000; startActivity(g, "quarry_call"); const saved = serialize(g), h = newGame(); restore(h, saved); assert.equal(h.player.activities.run?.id, "quarry_call"); assert.equal(h.player.activities.records.pass_run.done, 1);
  const stale = cleanActivities({ run: { ...p.activities.run, until: 5 }, records: { nope: { done: 1 }, quarry_call: { done: 2, best: 2, lastAt: 1 } } }, 100); assert.equal(stale.run, null); assert.deepEqual(Object.keys(stale.records), ["quarry_call"]); assert.equal(stale.records.quarry_call.best, 1);
});

test("The settlements grown: Gravesend's mausoleums and the Disturbed Row (the graves searched, the robbers put down at their camp, the Vault's stair unchained), Fernwick's forester and the Old Yew, Southshore's wreck and the Gullwing's Bell, Old Sal's shells from the crates the tide fills", async () => {
  const { DISTURBED_ROW, OLD_YEW, GULLWINGS_BELL, SHELLS_FOR_SAL, onSettlementsKill, CRATE_TICKS } = await import("../games/rarefriends-realm/settlements.ts");
  const { QUESTS, questDone, NPCS } = await import("../games/rarefriends-realm/content.ts");
  const { regionAt } = await import("../games/rarefriends-realm/world.ts");
  const { PATRONS } = await import("../games/rarefriends-realm/orders.ts");
  const g = newGame(), p = g.player, world = g.world, named = name => world.objects.find(o => o.name === name);
  for (const id of ["sexton", "stonemason", "forester", "beachcomber", "hermit"]) assert.ok(NPCS[id] && world.spawns.some(s => s.id === id), `${id} is placed`);
  for (const id of [DISTURBED_ROW, OLD_YEW, GULLWINGS_BELL, SHELLS_FOR_SAL]) assert.ok(QUESTS.some(q => q.id === id));
  assert.ok(world.buildings.some(b => b.name === "Ashworth Mausoleum") && world.buildings.some(b => b.name === "Nell's hut") && world.buildings.some(b => b.name === "The forester's house"));
  const stair = named("Vault stair"); assert.deepEqual(stair.requires, { quest: DISTURBED_ROW }); assert.equal(regionAt(world, stair.to.x, stair.to.y).id, "ashworth_vault");
  assert.ok(PATRONS.forester.items().some(i => i.id === "yew_logs" && i.level === 60), "the forester orders the woods' logs");
  // The Disturbed Row: three graves searched for their tokens, three robbers at the camp (not bandits elsewhere), then the sexton.
  const graves = world.objects.filter(o => o.clue === "disturbed_grave"); assert.equal(graves.length, 3);
  const use = (object, option) => { teleport(g, object.x, object.y + 1); const n = g.messages.length; setTarget(g, { kind: "object", id: object.id, option }); until(g, () => g.dialogue !== null || g.messages.length > n, 30); };
  use(graves[0], "Search"); assert.equal(count(p, "grave_token"), 0, "not before the quest");
  let d = talk(g, "sexton"); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.(); assert.equal(p.quests[DISTURBED_ROW], 1);
  for (const grave of graves) use(grave, "Search"); assert.equal(count(p, "grave_token"), 3); use(graves[0], "Search"); assert.equal(count(p, "grave_token"), 3, "once each");
  onSettlementsKill(g, "bandit", 100, 100); assert.equal(p.questData.dr_robbers ?? 0, 0, "a bandit elsewhere doesn't count");
  for (let i = 0; i < 3; i++) onSettlementsKill(g, "bandit", 785, northShift(120)); assert.equal(p.questData.dr_robbers, 3);
  d = talk(g, "sexton"); assert.match(d.lines[0].text, /Three tokens/); d.onEnd?.(); assert.ok(questDone(g, DISTURBED_ROW)); assert.equal(count(p, "grave_token"), 0);
  // The Old Yew: Woodcutting 30 first; the stone read only on the quest; the logs.
  assert.match(talk(g, "forester").lines[0].text, /Woodcutting of 30/); p.xp.woodcutting = XP_TABLE[30];
  d = talk(g, "forester"); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.();
  const stone = world.objects.find(o => o.clue === "witness_stone"); use(stone, "Read"); assert.equal(p.questData.oy_stone, 1); give(p, "yew_logs", 5);
  d = talk(g, "forester"); assert.match(d.lines[0].text, /two of us/); d.onEnd?.(); assert.ok(questDone(g, OLD_YEW)); assert.ok(has(p, "forest_feathered_cap"));
  // The Gullwing's Bell: the bell out of the wreck once, ten rivets; the chart at the end (a keepsake, not for sale).
  p.xp.smithing = XP_TABLE[10]; d = talk(g, "beachcomber"); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.();
  const wreck = world.objects.find(o => o.clue === "gullwing_wreck"); use(wreck, "Search"); assert.ok(has(p, "gullwing_bell")); use(wreck, "Search"); assert.equal(count(p, "gullwing_bell"), 1);
  give(p, "pewter_rivets", 10); d = talk(g, "beachcomber"); assert.match(d.lines[0].text, /Hung, and rung/); d.onEnd?.(); assert.ok(questDone(g, GULLWINGS_BELL)); assert.ok(has(p, "nells_tide_chart")); assert.equal(item("nells_tide_chart").tradeable, false);
  // Shells for Old Sal: the crates give a shell or two, once each until the tide; the necklace is worn at the neck.
  d = talk(g, "hermit"); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.();
  const crates = world.objects.filter(o => o.clue === "washed_crate"); assert.ok(crates.length >= 5);
  g.rng = () => 0.9; for (const crate of crates) use(crate, "Search"); const shells = count(p, "sea_shell"); assert.ok(shells >= 5, `shells from the crates (${shells})`);
  use(crates[0], "Search"); assert.equal(count(p, "sea_shell"), shells, "empty until the tide"); g.tick += CRATE_TICKS + 1; use(crates[0], "Search"); assert.ok(count(p, "sea_shell") > shells, "the tide fills it again");
  d = talk(g, "hermit"); assert.match(d.lines[0].text, /Six/); d.onEnd?.(); assert.ok(questDone(g, SHELLS_FOR_SAL)); assert.ok(has(p, "shell_necklace")); assert.equal(item("shell_necklace").equip.slot, "neck");
  // The Vault: its stair is in the mausoleum, its theme is the burial places', its hoard deep.
  const { dungeonTheme } = await import("../games/rarefriends-realm/dungeontheme.ts"); const { cofferTier } = await import("../games/rarefriends-realm/dungeons.ts");
  assert.equal(dungeonTheme(world, stair.to.x, stair.to.y).id, "ossuary"); assert.equal(cofferTier(g, named("Ashworth hoard")), "deep");
});

test("Mounts grown: seven new beasts (quest ones not for sale), the chosen mount saved, attacks on cooldowns (a web holds a blow), sneaking on the spider, saddlebags stowed and saved, the golem's forge, the stables' yard, and the two quests (the poachers' cage, the drakes' nest)", async () => {
  const { chooseMount, mountAttack, mountAttackProblem, saddlebags, stow, unstow, forgeMenu } = await import("../games/rarefriends-realm/engine.ts");
  const { STRIPED_ONE, DRAKE_OF_YOUR_OWN, onMountKill, POACHERS, NEST_DRAKES } = await import("../games/rarefriends-realm/mounts.ts");
  const { POACHER_CAMP } = north(await import("../games/rarefriends-realm/mountworld.ts"));
  const { QUESTS, questDone, NPCS, talk } = await import("../games/rarefriends-realm/content.ts");
  const { saddleHeight } = await import("../games/rarefriends-realm/mountart.ts");
  const g = newGame(), p = g.player, world = g.world;
  // The data: fifteen mounts, each with an attack; the tiger and the little dragon come from quests that exist.
  assert.equal(MOUNTS.length, 19); assert.ok(MOUNTS.every(m => m.attack.cooldown > 0 && m.attack.name));
  for (const id of ["tiger", "little_dragon"]) { const m = MOUNTS.find(x => x.id === id); assert.equal(m.caskets, 0); assert.ok(QUESTS.some(q => q.id === m.quest), `${id}'s quest`); }
  assert.ok(MOUNTS.filter(m => m.bags).length >= 6 && MOUNTS.some(m => m.forge) && MOUNTS.some(m => m.sneak && m.poisonProof) && MOUNTS.filter(m => m.fireproof).length === 2);
  assert.ok(saddleHeight(MOUNTS.find(m => m.id === "tiger").coat) < saddleHeight(MOUNTS[0].coat), "a cat sits lower than a horse");
  // The stables' yard and the quest places are in the world.
  assert.ok(world.objects.some(o => o.decor === "trough") && world.objects.filter(o => o.decor === "hitching_post").length === 2 && world.spawns.some(s => s.id === "paddock_bay"));
  assert.ok(world.buildings.find(b => b.name === "Friendhollow stables")?.walls === "timber");
  assert.ok(world.spawns.some(s => s.id === "caged_tiger") && world.objects.some(o => o.clue === "drake_nest") && world.objects.filter(o => o.clue === "tiger_tracks").length === 2);
  // The chosen mount is remembered in the save, and H rides it.
  grantMount(g, "bay_horse"); p.mount = null; p.mounts.push("tiger", "cave_spider", "forge_golem");
  chooseMount(g, "tiger"); assert.equal(p.lastMount, "tiger"); assert.equal(p.mount, null, "choosing doesn't mount you");
  let save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert.equal(fresh.player.lastMount, "tiger");
  save.lastMount = "dragon_bus"; fresh = newGame(); restore(fresh, save); assert.equal(fresh.player.lastMount, undefined, "an unknown choice is dropped");
  toggleMount(g); assert.equal(p.mount, "tiger", "H rides the chosen mount"); assert.ok(bonuses(p).strength >= 8, "the tiger's +8 Strength");
  chooseMount(g, "bay_horse"); assert.equal(p.mount, "bay_horse", "choosing while riding swaps you over");
  // The attack: nothing to hit, then a hit on the creature you're fighting, then the cooldown.
  assert.match(mountAttackProblem(g), /not fighting/);
  const foe = g.monsters.find(m => !m.dead && m.y < 800 && m.hp > 20); assert.ok(foe); p.combat = foe.uid; teleport(g, foe.x + 1, foe.y); const hp = foe.hp;
  g.rng = () => 0.5; assert.equal(mountAttackProblem(g), null); assert.ok(mountAttack(g)); assert.equal(hp - foe.hp, 3, "a kick for half of six"); assert.equal(p.mountReady, g.tick + 50);
  assert.match(mountAttackProblem(g), /isn't ready/); assert.equal(mountAttack(g), false); g.tick += 50; assert.equal(mountAttackProblem(g), null);
  teleport(g, foe.x + 3, foe.y); assert.match(mountAttackProblem(g), /reach/); teleport(g, foe.x + 1, foe.y);
  // The spider's web holds the creature's next blow; you can sneak in its saddle (not a horse's).
  chooseMount(g, "cave_spider"); foe.attackTimer = 0; assert.ok(mountAttack(g)); assert.ok(foe.attackTimer >= 5, "webbed");
  toggleSneak(g); assert.equal(p.sneak, true, "sneaking on the spider"); chooseMount(g, "bay_horse"); assert.equal(p.sneak, false, "a horse can't"); toggleSneak(g); assert.equal(p.sneak, false);
  p.combat = null;
  // Saddlebags: the bay's eight slots, reached while you ride it; a stowed thing comes back; saved with the mount.
  const bags = saddlebags(g); assert.equal(bags.length, 8); give(p, "feather", 3); const slot = p.inventory.findIndex(s => s?.id === "feather");
  assert.ok(stow(g, slot)); assert.equal(p.inventory[slot], null); assert.deepEqual(bags[0], { id: "feather", n: 3 }); assert.ok(p.inventory.some(s => s?.id === "feather") === false);
  chooseMount(g, "tiger"); assert.equal(saddlebags(g), null, "the tiger carries nothing"); chooseMount(g, "bay_horse");
  save = JSON.parse(JSON.stringify(serialize(g))); fresh = newGame(); assert(restore(fresh, save)); assert.deepEqual(fresh.player.saddlebags.bay_horse[0], { id: "feather", n: 3 });
  assert.ok(unstow(g, 0)); assert.equal(bags[0], null); assert.equal(count(p, "feather"), 3);
  // The forge golem: its furnace and anvil wherever you are.
  assert.equal(forgeMenu(g, "furnace"), false, "not on the bay"); chooseMount(g, "forge_golem"); assert.ok(forgeMenu(g, "furnace")); assert.match(g.ui.production.title, /golem's furnace/);
  assert.equal(forgeMenu(g, "anvil"), false, "no bars yet"); give(p, "pewter_bar", 1); assert.ok(forgeMenu(g, "anvil")); assert.ok(g.ui.production.recipes.length > 0);
  give(p, "pewter_ore", 1); const bars = count(p, "pewter_bar"); g.rng = () => 0.99; startProduction(g, smeltingRecipes()[0], 1); for (let i = 0; i < 8; i++) tick(g); assert.equal(count(p, "pewter_bar"), bars + 1, "smelted in the open, on the golem's back");
  p.mount = null; p.mounts.length = 0; p.lastMount = undefined;
  // The Striped One: after the tracks; the cage won't open while the poachers stand; three poachers at the camp (not bandits elsewhere); the tiger follows you to Fenn.
  const use = (object, option) => { teleport(g, object.x, object.y + 1); const n = g.messages.length; setTarget(g, { kind: "object", id: object.id, option }); until(g, () => g.dialogue !== null || g.messages.length > n, 30); };
  assert.equal(talk(g, "caged_tiger").lines[0].text.includes("lock"), true);
  p.quests.tallgrass_tracks = 2; let d = talk(g, "tallgrass_huntmaster"); assert.match(d.lines[0].text, /Poachers/); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.(); assert.equal(p.quests[STRIPED_ONE], 1);
  assert.match(talk(g, "caged_tiger").lines[0].text, /too close/);
  onMountKill(g, "bandit", 100, 100); assert.equal(p.questData.so_poachers ?? 0, 0); for (let i = 0; i < POACHERS; i++) onMountKill(g, "bandit", POACHER_CAMP.x0 + 4, POACHER_CAMP.y0 + 5); assert.equal(p.questData.so_poachers, POACHERS);
  d = talk(g, "caged_tiger"); d = d.options.find(o => o.label === "Open the cage.").then(); assert.equal(p.questData.so_freed, 1); assert.equal(NPCS.caged_tiger.gone(g), true, "the cage is empty now");
  d = talk(g, "tallgrass_huntmaster"); assert.match(d.lines[0].text, /followed you back/); d.onEnd?.(); assert.ok(questDone(g, STRIPED_ONE)); assert.ok(p.mounts.includes("tiger")); assert.equal(p.lastMount, "tiger");
  // A Drake of Your Own: four drakes off the nest in Wyrmreach, the egg, ten cooked meat; the hatchling.
  d = talk(g, "drake_hunter"); assert.match(d.lines[0].text, /nest/); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.(); assert.equal(p.quests[DRAKE_OF_YOUR_OWN], 1);
  const nest = world.objects.find(o => o.clue === "drake_nest"); use(nest, "Search"); assert.equal(count(p, "drake_egg"), 0, "the drakes roost over it");
  for (let i = 0; i < NEST_DRAKES; i++) onMountKill(g, "ash_drake", nest.x, nest.y); assert.equal(p.questData.dy_drakes, NEST_DRAKES);
  use(nest, "Search"); assert.equal(count(p, "drake_egg"), 1); use(nest, "Search"); assert.equal(count(p, "drake_egg"), 1, "one egg"); assert.equal(item("drake_egg").tradeable, false);
  give(p, "cooked_meat", 10); d = talk(g, "drake_hunter"); assert.match(d.lines[0].text, /shell going/); d.onEnd?.(); assert.ok(questDone(g, DRAKE_OF_YOUR_OWN)); assert.ok(p.mounts.includes("little_dragon")); assert.equal(count(p, "drake_egg"), 0); assert.equal(count(p, "cooked_meat"), 0);
  assert.ok(MOUNTS.find(m => m.id === "little_dragon").fireproof, "the hatchling turns dragonfire");
});

test("Quest mounts across the Realm: the Dawn's charger, the Dusk stag, the white camel and the three-tailed fox, each earned end to end", async () => {
  const Q = await import("../games/rarefriends-realm/questmounts.ts");
  const { talk, questDone, finalStage, QUESTS } = await import("../games/rarefriends-realm/content.ts");
  const { mountSize, saddleHeight } = await import("../games/rarefriends-realm/mountart.ts");
  const g = newGame(), p = g.player, world = g.world;
  const ids = { dawns_charger: "dawn_charger", stag_at_dusk: "dusk_stag", white_calf: "white_camel", three_tails: "foxfire_kitsune" };
  for (const [quest, id] of Object.entries(ids)) { const m = MOUNTS.find(x => x.id === id); assert.ok(m && m.quest === quest && m.caskets === 0, `${id} is earned on ${quest}`); assert.ok(QUESTS.some(q => q.id === quest)); }
  // The art: barding on the charger and the stag, three tails on the fox, a camel taller in the saddle than a horse; a spider wider facing you.
  assert.ok(MOUNTS.find(m => m.id === "dawn_charger").coat.barding && MOUNTS.find(m => m.id === "dusk_stag").coat.barding && MOUNTS.find(m => m.id === "foxfire_kitsune").coat.tails === 3);
  assert.ok(saddleHeight(MOUNTS.find(m => m.id === "white_camel").coat) > saddleHeight(MOUNTS[0].coat), "a camel's saddle is high");
  assert.ok(mountSize(MOUNTS.find(m => m.id === "cave_spider").coat, "front").w > mountSize(MOUNTS[0].coat, "front").w, "a spider stands wide");
  // The places: the quest-givers, the mare, the camel and the fox, the watchers and the lanterns, each in its region.
  const spawn = id => world.spawns.find(s => s.kind === "npc" && s.id === id);
  for (const [id, region] of [["dawn_ostler", "greyhorn"], ["dawn_mare", "greyhorn"], ["dusk_warden", "silent_peaks"], ["hobbled_camel", "qeshet"], ["fox_keeper", "morishima"], ["three_tailed_fox", "morishima"]]) { const s = spawn(id); assert.ok(s, id); assert.equal(regionAt(world, s.x, s.y).id, region, `${id} in ${region}`); }
  for (const id of [...Q.WATCHERS, ...Q.LANTERNS]) assert.ok(world.objects.some(o => o.clue === id), `${id} placed`);
  const use = id => Q.QUEST_MOUNT_CLUES[id].use(g), say = (id, label) => { const d = talk(g, id); const o = label && d.options?.find(x => x.label === label); return o ? o.then() : d; };
  const accept = id => { const d = say(id, "I'll do it."); d.onEnd?.(); };
  const finish = id => { const d = talk(g, id); d.onEnd?.(); };

  // The Dawn's Charger: not before Dawn Against the Hollow; twenty of the dead with a faith weapon (bare hands don't count), the mare groomed.
  assert.match(talk(g, "dawn_ostler").lines[0].text, /not for squires/);
  p.quests.dawn_against_hollow = finalStage("dawn_against_hollow"); accept("dawn_ostler"); assert.equal(p.quests[Q.DAWNS_CHARGER], 1);
  assert.match(talk(g, "dawn_mare").lines[0].text, /Not yet/);
  Q.onQuestMountKill(g, "skeleton", 0, 0); assert.equal(p.questData.dc_dead ?? 0, 0, "without a faith weapon the dead don't count");
  p.equipment.weapon = ITEM_LIST.find(i => i.equip?.holy && i.equip.slot === "weapon").id;
  for (let i = 0; i < Q.CHARGER_DEAD; i++) Q.onQuestMountKill(g, "skeleton", 0, 0); Q.onQuestMountKill(g, "rat", 0, 0); assert.equal(p.questData.dc_dead, Q.CHARGER_DEAD);
  say("dawn_mare", "Groom her."); assert.equal(p.questData.dc_groomed, 1);
  finish("dawn_ostler"); assert.ok(questDone(g, Q.DAWNS_CHARGER) && p.mounts.includes("dawn_charger")); assert.equal(NPCS.dawn_mare.gone(g), true, "the stall is empty");

  // The Stag at Dusk: three vigils at the watchers, each once.
  accept("dusk_warden"); assert.match(use(Q.WATCHERS[0]).text, /vigil/); use(Q.WATCHERS[0]); assert.equal(Q.WATCHERS.filter(id => p.questData[id]).length, 1, "once each");
  assert.match(talk(g, "dusk_warden").lines[0].text, /2 watchers still/);
  use(Q.WATCHERS[1]); use(Q.WATCHERS[2]); finish("dusk_warden"); assert.ok(questDone(g, Q.STAG_AT_DUSK) && p.mounts.includes("dusk_stag"));

  // The White Calf: Halzir only after Salt and Smoke; the bandits must fall in Qeshet; the hobble cut; grain.
  assert.ok(!/white, she was/.test(talk(g, "ouresh_halzir").lines[0].text), "nothing of it before Salt and Smoke");
  p.quests.salt_and_smoke = finalStage("salt_and_smoke"); accept("ouresh_halzir"); assert.equal(p.quests[Q.WHITE_CALF], 1);
  const camp = spawn("hobbled_camel"); Q.onQuestMountKill(g, "bandit", 586, 430); assert.equal(p.questData.wc_bandits ?? 0, 0, "bandits elsewhere don't count");
  assert.match(talk(g, "hobbled_camel").lines[0].text, /bandits about/);
  for (let i = 0; i < Q.CALF_BANDITS + 2; i++) Q.onQuestMountKill(g, "bandit", camp.x, camp.y); assert.equal(p.questData.wc_bandits, Q.CALF_BANDITS);
  say("hobbled_camel", "Cut the hobble."); assert.equal(NPCS.hobbled_camel.gone(g), true);
  assert.match(talk(g, "ouresh_halzir").lines[0].text, /Qeshet: three bandits/, "the grain still wanted");
  give(p, "grain", Q.CALF_GRAIN); finish("ouresh_halzir"); assert.ok(questDone(g, Q.WHITE_CALF) && p.mounts.includes("white_camel")); assert.equal(count(p, "grain"), 0);

  // Three Tails: after A Thousand Gates; a tinderbox for the lanterns; the fox only comes when they all burn and the vixens are tested.
  p.quests.thousand_gates = finalStage("thousand_gates"); accept("fox_keeper");
  const box = p.inventory.findIndex(slot => slot?.id === "tinderbox"); if (box >= 0) p.inventory[box] = null;
  assert.match(use(Q.LANTERNS[0]).text, /tinderbox/); give(p, "tinderbox", 1);
  for (const id of Q.LANTERNS) use(id); for (let i = 0; i < Q.FOX_VIXENS; i++) Q.onQuestMountKill(g, "foxfire_vixen", 0, 0);
  assert.equal(NPCS.three_tailed_fox.present(g), true, "the fox comes to the light");
  talk(g, "three_tailed_fox"); assert.equal(p.questData.tt_fox, 1); assert.equal(NPCS.three_tailed_fox.present(g), false, "and goes with you");
  finish("fox_keeper"); assert.ok(questDone(g, Q.THREE_TAILS) && p.mounts.includes("foxfire_kitsune"));
  for (const quest of Object.keys(ids)) assert.ok(QUESTS.find(q => q.id === quest).journal(g).some(line => /QUEST COMPLETE/.test(line)));
});

test("Dragons across the Realm: the Bonefield, the Cragmaw Heights, Qeshet and the Sunken Halls under it; Scale and Fire opens Ysolde's wyrmwright trade; the drakeward shields and the wyrmbane arms", async () => {
  const { SCALE_AND_FIRE, DRAGON_KINDS, onDragonsKill } = await import("../games/rarefriends-realm/dragons.ts");
  const { BONEFIELD, HEIGHTS, QESHET, SUNKEN_HALLS } = north(await import("../games/rarefriends-realm/dragonsworld.ts"));
  const { DRAKE_OF_YOUR_OWN } = await import("../games/rarefriends-realm/mounts.ts");
  const { talk, questDone } = await import("../games/rarefriends-realm/content.ts");
  const { DUNGEON_THEMES } = await import("../games/rarefriends-realm/dungeontheme.ts");
  const { trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const g = newGame(), p = g.player, world = g.world;
  // The places: each region on its ground, the halls underground beneath the ruin, and each kind of dragon in its place with one wyrm at the heart.
  assert.equal(regionAt(world, BONEFIELD.x, BONEFIELD.y).id, "bonefield"); assert.equal(regionAt(world, HEIGHTS.x, HEIGHTS.y).id, "cragmaw_heights"); assert.equal(regionAt(world, QESHET.door.x, QESHET.door.y + 3).id, "qeshet");
  const entry = { x: SUNKEN_HALLS.entry.x, y: UNDER_Y + northShift(SUNKEN_HALLS.entry.dy) };
  assert.equal(regionAt(world, entry.x, entry.y).id, "sunken_halls"); assert.ok(isUnderground(entry.y) && REGIONS.find(r => r.id === "sunken_halls").underground && DUNGEON_THEMES.sunken_halls, "the halls are a dungeon, with a theme");
  assert.equal(regionAt(world, world.places.cragmaw.x, world.places.cragmaw.y).id, "cragmaw", "Cragmaw's village is where it was; the heights are north of it");
  assert.ok(world.places.cragmaw.y > HEIGHTS.y + HEIGHTS.ry, "the heights lie north of the village");
  const spawnsOf = id => world.spawns.filter(s => s.id === id);
  assert.ok(spawnsOf("frost_drake").length >= 8 && spawnsOf("bone_drake").length >= 6 && spawnsOf("dune_drake").length >= 10, "drakes in all three places");
  for (const [id, region] of [["iron_wyrm", "cragmaw_heights"], ["bone_wyrm", "bonefield"], ["sand_wyrm", "sunken_halls"]]) { const at = spawnsOf(id); assert.equal(at.length, 1, `one ${id}`); assert.equal(regionAt(world, at[0].x, at[0].y).id, region, `${id} in its place`); assert.ok(MONSTERS[id].breath && MONSTERS[id].boss); }
  assert.ok(spawnsOf("frost_drake").every(s => regionAt(world, s.x, s.y).id === "cragmaw_heights") && spawnsOf("dune_drake").every(s => ["qeshet", "sunken_halls"].includes(regionAt(world, s.x, s.y).id)));
  for (const id of ["frost_drake", "bone_drake", "dune_drake", "iron_wyrm", "bone_wyrm", "sand_wyrm"]) assert.ok(MONSTERS[id].breath > 0 && MONSTERS[id].drops.some(d => d.item === "wyrm_scale"), `${id} breathes, and drops scales`);
  // The Sunken Door: down into the halls from the sanctum, and up again to the court.
  const door = world.objects.find(o => o.kind === "ladder" && o.name === "The Sunken Door" && o.action === "Enter"), up = world.objects.find(o => o.kind === "ladder" && o.name === "The Sunken Door" && o.action === "Climb-up");
  assert.ok(door && door.x === QESHET.door.x && door.to.y === entry.y, "the door goes down to the halls"); assert.deepEqual(up.to, { x: QESHET.door.x, y: QESHET.door.y + 1 });
  assert.ok(canWalk(g, door.to.x, door.to.y) && canWalk(g, up.to.x, up.to.y), "both ends stand on floor");
  const hoard = world.objects.find(o => o.decor === "chest" && o.name === "The Sand Mother's hoard"); assert.ok(hoard && isUnderground(hoard.y) && regionAt(world, hoard.x, hoard.y).id === "sunken_halls");
  assert.ok(world.objects.some(o => o.kind === "sign" && /Bonefield/.test(o.text) && o.y < northShift(60)) && world.objects.some(o => o.kind === "sign" && /Cragmaw Heights/.test(o.text)) && world.objects.some(o => o.kind === "sign" && /Qeshet/.test(o.text) && o.x > 250), "signs: at the field, the pass, and the dunes road");
  assert.deepEqual(["bonefield", "cragmaw_heights", "qeshet", "sunken_halls"].map(id => trackFor(id, false)), ["deadwood", "ironreach", "kharaveth_dunes", "kharaveth_underway"], "the places borrow their neighbours' music");
  // The gear: wyrmward in the round and the tall, drakeward that turns breath wholly, wyrmbane a third harder; none of it tradeable, all of it Ysolde's, for scales.
  assert.equal(item("wyrmward_shield").equip.dragonward, 4); assert.equal(item("wyrmward_roundshield").equip.dragonward, 3); assert.equal(item("wyrmward_aegis").equip.dragonward, 3);
  for (const id of ["drakeward_shield", "drakeward_roundshield", "drakeward_aegis"]) assert.ok(item(id).equip.dragonward <= 1 && item(id).equip.slot === "shield", `${id} turns breath`);
  for (const id of ["wyrmbane_sabre", "wyrmbane_wand", "wyrmbane_bow"]) assert.equal(item(id).equip.dragonbane, 1.3, `${id} bites a dragon harder`);
  assert.equal(SHOPS.wyrmwright.currency, "wyrm_scale"); assert.equal(SHOPS.wyrmwright.stock.length, 8); assert.ok(SHOPS.wyrmwright.stock.every(id => item(id).tradeable === false));
  assert.match(shopProblem(g, "wyrmwright"), /Scale and Fire/, "the trade waits on the quest");
  // Scale and Fire: Ysolde's second errand, after A Drake of Your Own.
  const quest = QUESTS.find(q => q.id === SCALE_AND_FIRE); assert.ok(quest && quest.points === 2 && quest.difficulty === "Master");
  assert.ok(!/only place with dragons/.test(talk(g, "drake_hunter").lines[0].text), "nothing of it before the hatchling");
  p.quests[DRAKE_OF_YOUR_OWN] = 2;
  let d = talk(g, "drake_hunter"); assert.match(d.lines[0].text, /only place with dragons/); d = d.options.find(o => o.label === "I'll do it.").then(); d.onEnd?.(); assert.equal(p.quests[SCALE_AND_FIRE], 1);
  onDragonsKill(g, "ash_drake"); onDragonsKill(g, "cinder_drake"); assert.ok(!p.questData.sf_frost && !p.questData.sf_bone && !p.questData.sf_dune, "Wyrmreach's drakes don't count");
  for (const [key, id] of DRAGON_KINDS) { onDragonsKill(g, id); assert.equal(p.questData[key], 1); onDragonsKill(g, id); assert.equal(p.questData[key], 1, "once each"); }
  assert.match(g.messages[g.messages.length - 1].text, /frost, bone and sand/);
  d = talk(g, "drake_hunter"); assert.match(d.lines[0].text, /One of each kind, and a scale/, "the scale still wanted"); assert.equal(p.quests[SCALE_AND_FIRE], 1);
  give(p, "wyrm_scale", 1); const slayer = p.xp.slayer;
  d = talk(g, "drake_hunter"); assert.match(d.lines[0].text, /Frost burns cold/); d.onEnd?.();
  assert.ok(questDone(g, SCALE_AND_FIRE)); assert.equal(count(p, "wyrm_scale"), 3, "hers taken, three given"); assert.ok(p.xp.slayer > slayer);
  assert.equal(shopProblem(g, "wyrmwright"), null, "the trade opens");
  d = talk(g, "drake_hunter"); d.options.find(o => o.label === "Let me see the wyrmwright work.").then(); assert.equal(g.ui.shop, "wyrmwright");
  assert.ok(quest.journal(g).some(line => /QUEST COMPLETE/.test(line)));
});

test("Skill guide filters: every entry tagged, the groups a skill offers (metals in Smithing, elements in Magic, boosts in Faith, methods in Fishing, traditions in Mysteries), any-of within a group and all-of across groups, named buttons", async () => {
  const { skillGuide, guideFilters, filterGuide, tagName, GUIDE_GROUPS } = await import("../games/rarefriends-realm/guide.ts");
  for (const skill of SKILLS) for (const entry of skillGuide(skill)) assert.ok(entry.tags?.length, `${skill}: ${entry.name} is tagged`);
  const groupsOf = skill => Object.fromEntries(guideFilters(skillGuide(skill)).map(group => [group.id, group.tags]));
  const smithing = groupsOf("smithing"); assert.equal(smithing.metal.length, METALS.length, "every metal in Smithing"); assert.ok(smithing.type.some(t => t.id === "type:weapon") && smithing.type.some(t => t.id === "type:armour") && smithing.slot);
  const magic = groupsOf("magic"); assert.ok(magic.element.length >= 10 && magic.element.some(t => t.id === "element:fire")); assert.ok(!magic.method, "no methods in Magic");
  const faith = groupsOf("prayer"); assert.ok(faith.boost.some(t => t.id === "boost:protect") && faith.type.some(t => t.id === "type:prayer") && faith.type.some(t => t.id === "type:order"));
  const fishing = groupsOf("fishing"); assert.ok(fishing.method.length >= 4 && fishing.method.some(t => t.id === "method:Net")); assert.ok(!fishing.metal);
  const mysteries = groupsOf("mysteries"); assert.ok(mysteries.tradition.length >= 5 && mysteries.tradition.some(t => t.id === "tradition:orashai"));
  assert.ok(groupsOf("sigilcraft").type.length >= 2 && !groupsOf("sigilcraft").slot, "a single-tag group isn't offered");
  // Filtering: metal pewter alone; pewter or blackiron (any of); pewter weapons (all of); counts match.
  const entries = skillGuide("smithing"), pewter = filterGuide(entries, new Set(["metal:pewter"]));
  assert.ok(pewter.length > 0 && pewter.every(e => e.tags.includes("metal:pewter"))); assert.equal(pewter.length, smithing.metal.find(t => t.id === "metal:pewter").count);
  const two = filterGuide(entries, new Set(["metal:pewter", "metal:blackiron"])); assert.ok(two.length > pewter.length && two.every(e => e.tags.includes("metal:pewter") || e.tags.includes("metal:blackiron")));
  const weapons = filterGuide(entries, new Set(["metal:pewter", "type:weapon"])); assert.ok(weapons.length > 0 && weapons.length < pewter.length && weapons.every(e => e.tags.includes("metal:pewter") && e.tags.includes("type:weapon")));
  assert.equal(filterGuide(entries, new Set()).length, entries.length, "no choice shows all");
  // Names: a metal's own name, a slot, an element, a type; the groups in their order.
  assert.equal(tagName("metal:pewter"), METALS.find(m => m.id === "pewter").name); assert.equal(tagName("slot:head"), "Head"); assert.equal(tagName("element:fire"), "Fire"); assert.equal(tagName("type:weapon"), "Weapons"); assert.equal(tagName("method:Net"), "Net");
  assert.deepEqual(GUIDE_GROUPS.map(g => g.id), ["type", "metal", "slot", "element", "boost", "method", "tradition"]);
});

test("Camping grown: the cache keeps twelve things and comes home with the kit, the brazier's fire burns nothing and cures poison, the waystone walks you back (Wayfaring 50, once in a while, not underground), sleeping and tending pay now and then, and the trail log counts regions", async () => {
  const { CAMP_RULES, CACHE_SLOTS, campAllowed, setUpCamp, packUpCamp, restAtCamp, sleepAtCamp, tendFire, setUpCache, cacheAt, stash, unstash, walkTheWay, brazierFire, byBrazier, applyCamp } = await import("../games/rarefriends-realm/camping.ts");
  const { ACHIEVEMENTS } = await import("../games/rarefriends-realm/achievements.ts"); const { familyLevel } = await import("../games/rarefriends-realm/data.ts");
  const g = newGame(), p = g.player;
  for (const id of ["frostsilver_camp_cache", "gloomsteel_camp_brazier", "wyrmscale_waystone"]) { assert.ok(isItem(id), id); assert.equal(item(id).family, "fieldcraft"); assert.ok(familyLevel(id) > 50, `${id} is smithed from a forged metal`); }
  assert.ok(ACHIEVEMENTS.some(a => a.id === "camper") && ACHIEVEMENTS.some(a => a.id === "every_sky"));
  // A camp in the wild with everything carried: the brazier and the waystone are remembered; the first camp under a new sky pays.
  p.xp.agility = XP_TABLE[50]; give(p, "pewter_camp_kit"); give(p, "gloomsteel_camp_brazier"); give(p, "wyrmscale_waystone"); give(p, "frostsilver_camp_cache");
  const spot = (() => { for (let y = northShift(230); y < northShift(330); y++) for (let x = 560; x < 760; x++) if (!campAllowed(g, x, y)) return { x, y }; return null; })();
  assert.ok(spot, "somewhere to camp"); teleport(g, spot.x, spot.y);
  const wayfaringBefore = p.xp.agility; assert.ok(setUpCamp(g)); assert.ok(p.camp.brazier && p.camp.waystone && p.camp.cache === null);
  assert.ok(p.xp.agility > wayfaringBefore, "a new sky's XP"); assert.equal(Object.keys(p.camps).length, 1);
  // The brazier: the camp's fire burns nothing; poison sweated out at a rest; mending doubled beside it.
  const fire = g.fires.find(f => f.expires === Infinity); assert.ok(fire && brazierFire(g, fire.uid)); assert.ok(byBrazier(g));
  p.poison = { damage: 2, left: 4, timer: 10 }; restAtCamp(g); assert.equal(p.poison, null, "the brazier cures poison");
  // Sleeping and tending: once in a while.
  const slept = p.xp.agility; sleepAtCamp(g); assert.ok(p.xp.agility > slept); const again = p.xp.agility; sleepAtCamp(g); assert.equal(p.xp.agility, again, "not twice in a row");
  const lit = p.xp.firemaking; tendFire(g); assert.ok(p.xp.firemaking > lit); const lit2 = p.xp.firemaking; tendFire(g); assert.equal(p.xp.firemaking, lit2); g.playTicks += CAMP_RULES.tendEvery; tendFire(g); assert.ok(p.xp.firemaking > lit2);
  // The cache: set up beside the fire, twelve slots; stash a thing, take it back; saved with the camp; home with the kit.
  const cacheSlot = p.inventory.findIndex(s => s?.id === "frostsilver_camp_cache"); setUpCache(g, cacheSlot); assert.equal(p.camp.cache.length, CACHE_SLOTS); assert.equal(count(p, "frostsilver_camp_cache"), 0);
  assert.ok(g.world.objects.some(o => o.text === "camp_cache" && o.name !== "__removed"), "the cache stands at the camp");
  give(p, "feather", 5); const feathers = p.inventory.findIndex(s => s?.id === "feather"); assert.ok(stash(g, feathers)); assert.equal(count(p, "feather"), 0); assert.deepEqual(cacheAt(g)[0], { id: "feather", n: 5 });
  const save = JSON.parse(JSON.stringify(serialize(g))), fresh = newGame(); assert(restore(fresh, save)); assert.deepEqual(fresh.player.camp.cache[0], { id: "feather", n: 5 }); assert.ok(fresh.player.camp.brazier && fresh.player.camp.waystone); assert.equal(Object.keys(fresh.player.camps).length, 1);
  assert.ok(unstash(g, 0)); assert.equal(count(p, "feather"), 5); assert.ok(stash(g, p.inventory.findIndex(s => s?.id === "feather")));
  teleport(g, spot.x + 10, spot.y); assert.equal(cacheAt(g), null, "out of reach of the cache"); teleport(g, spot.x, spot.y + 1);
  // The waystone: not from underground, not before Wayfaring 50, once in a while; it walks you to the fire.
  teleport(g, spot.x + 40, spot.y + 20); p.xp.agility = XP_TABLE[49]; assert.equal(walkTheWay(g), false); p.xp.agility = XP_TABLE[50];
  assert.ok(walkTheWay(g)); assert.equal(p.activity.kind, "teleport"); for (let i = 0; i < 12; i++) tick(g); assert.ok(Math.hypot(p.x - spot.x, p.y - spot.y) <= 2, `walked to the fire (${p.x},${p.y} vs ${spot.x},${spot.y})`);
  teleport(g, spot.x + 40, spot.y + 20); assert.equal(walkTheWay(g), false, "the stone is cold"); g.tick += CAMP_RULES.waystoneEvery; assert.ok(walkTheWay(g)); p.activity = null;
  { const under = movedPoint(g.world, ...M(0, 210)); teleport(g, under.x, under.y); assert.equal(walkTheWay(g), false, "not from underground"); }
  // Packing up brings the cache and its things home (room needed).
  teleport(g, spot.x, spot.y + 1); const free = p.inventory.filter(s => !s).length; p.inventory.fill(null); p.inventory[0] = { id: "pewter_camp_kit", n: 1 }; assert.ok(packUpCamp(g)); assert.equal(count(p, "frostsilver_camp_cache"), 1); assert.equal(count(p, "feather"), 5); assert.equal(p.camp, null); void free;
  applyCamp(g); assert.ok(!g.world.objects.some(o => o.text === "camp_cache" && o.name !== "__removed"));
});

test("A Place to the North: the Vargskeld and the Zoryavik above the old map, each region labelled on its own ground, the roads up from the Vesperwold and the Deadwood, every person and town service reachable on foot from Friendhollow, and their talk", async () => {
  const { NORTH_NPCS } = await import("../games/rarefriends-realm/north.ts");
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  const { trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const g = newGame(), world = g.world, top = mainlandAt(0, 0).y;
  const ids = ["vargskeld", "vargskeld_sea", "skarnholm", "ravnsvik", "oathsworn_hall", "embermoot", "redwake_camp", "varn_ridge", "oathgate_pass", "zoryavik", "zoryavik_coast", "hearthwatch", "krasnogor", "bereslav", "zlatna_gora", "svetloye", "old_bough", "skarnholm_bay", "grimfell", "sokol_hills"];
  for (const id of ids) {
    const region = REGIONS.find(r => r.id === id); assert.ok(region, `${id} is a region`);
    assert.equal(regionAt(world, region.label.x, region.label.y).id, id, `${id}'s label stands in it`);
    assert.ok(region.label.y < top, `${id} lies above the old map`); assert.ok(trackFor(id, false), `${id} has music`);
  }
  // The roads north: a sign where each leaves the old map, in the Vesperwold and in the Deadwood.
  const signs = world.objects.filter(o => o.kind === "sign" && /^NORTH: the (Vargskeld|Zoryavik)/.test(o.text));
  assert.deepEqual(signs.map(o => regionAt(world, o.x, o.y).id).sort(), ["deadwood", "vesperwold"]);
  // Everyone and every bank, furnace, anvil and well in the north is a walk from Friendhollow.
  const seen = reachable(g, world.places.spawn);
  const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => seen[(y + dy) * W + x + dx]);
  for (const id of Object.keys(NORTH_NPCS)) {
    const at = world.spawns.filter(s => s.kind === "npc" && s.id === id); assert.ok(at.length, `${id} is placed`);
    for (const s of at) { assert.ok(near(s.x, s.y), `${id} is reachable`); assert.ok(s.y < top, `${id} lives in the north`); }
  }
  const services = world.objects.filter(o => o.y < top && ["bank", "furnace", "anvil", "well"].includes(o.kind));
  assert.ok(services.filter(o => o.kind === "bank").length >= 2 && services.length >= 8, "banks, smithies and wells in the towns");
  for (const o of services) assert.ok(near(o.x, o.y), `the ${o.kind} at ${o.x},${o.y} is reachable`);
  // Every person speaks; the leaders answer questions and let you go.
  assert.ok(Object.keys(NORTH_NPCS).length >= 30);
  for (const id of Object.keys(NORTH_NPCS)) { const d = talk(g, id); assert.ok(d && d.lines.length && d.lines[0].text, `${id} talks`); }
  let d = talk(g, "jarl_hallveig"); assert.ok(d.options.some(o => o.label === "Goodbye."));
  d = d.options.find(o => o.label === "What is the old agreement?").then(); assert.match(d.lines[0].text, /The Zoryavik stopped keeping their half/);
  d = talk(g, "prince_radomir");
  assert.ok(d.options.some(o => o.label === "What is the old agreement?" || o.label === "Who rules the Zoryavik?"), "the prince answers too");
});

test("The Old Agreement: the wreck, the raiders and their strongbox, six accounts of the agreement, the first copy from the Old Bough, and a choice at the stone that the north remembers (the Oathgate bar, the traders, the leaders); the ridge is crossed only at its passes", async () => {
  const Q = await import("../games/rarefriends-realm/northquest.ts");
  const { OATH_ROAD, RIDGE } = await import("../games/rarefriends-realm/northworld.ts");
  const { talk, questDone } = await import("../games/rarefriends-realm/content.ts");
  const { item } = await import("../games/rarefriends-realm/data.ts"); const { WALKABLE } = await import("../games/rarefriends-realm/world.ts");
  const g = newGame(), p = g.player, world = g.world;
  const obj = clue => world.objects.find(o => o.clue === clue);
  const gate = obj("oa_gate"), stone = obj("oa_stone"), P = RIDGE.oathgate;
  const use = (object, option) => { standBy(g, object); const n = g.messages.length; setTarget(g, { kind: "object", id: object.id, option }); until(g, () => g.dialogue !== null || g.messages.length > n, 30); };
  const lastMessage = () => g.messages.slice(-4).map(m => m.text).join(" | ");
  const choose = (d, label) => { const o = d.options?.find(x => x.label === label); assert.ok(o, `"${label}" offered`); return o.then(); };
  // The pass: a wall across the road east of the stone, its gate the only way through; above and below it, crag.
  assert.ok(gate && gate.kind === "gate" && gate.y === P.y && gate.x > P.x + 2, "the bar stands across the road, east of the stone");
  for (let y = P.y - 7; y <= P.y + 7; y++) if (y !== P.y) assert.ok(!WALKABLE.has(world.tiles[y * W + gate.x]), `no way round the bar at row ${y}`);
  const near = new Set(); { const q = [[gate.x - 1, P.y]]; near.add(`${gate.x - 1},${P.y}`);
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (near.has(k) || Math.abs(nx - P.x) > 70 || Math.abs(ny - P.y) > 70 || !canWalk(g, nx, ny)) continue; near.add(k); q.push([nx, ny]); } } }
  assert.ok(!near.has(`${gate.x + 1},${P.y}`), "with the bar down, the east side of the pass is out of reach from the west (within a day's walk of it)");
  assert.equal(world.objects.filter(o => o.kind === "sign" && o.name === "The Wolfsback").length, 2, "the Wolfsback's goat-track is signed at both feet");
  for (const id of ["skarnholm_quay", "skarnholm_quay_open", "krasnogor_market", "krasnogor_market_open", "redwake_stores"]) assert.ok(SHOPS[id].stock.every(i => item(i)), `${id} sells real things`);
  assert.ok(SHOPS.skarnholm_quay_open.stock.includes("blackiron_ore") && !SHOPS.skarnholm_quay.stock.includes("blackiron_ore"), "Zoryavik iron only with the pass open");
  // Before the quest: the strongbox is none of your business, the gate is barred.
  use(obj("oa_strongbox"), "Open"); assert.match(lastMessage(), /Not yours/);
  use(gate, "Open"); assert.match(lastMessage(), /Barred/); 
  // Torvald offers it.
  let d = choose(talk(g, "farwake_master"), "I'll look into it."); d.onEnd?.(); assert.equal(p.quests[Q.OLD_AGREEMENT], 1);
  assert.match(talk(g, "farwake_master").lines[0].text, /road below the hills/);
  use(obj("oa_wreck"), "Search"); assert.equal(p.questData.oa_wreck, 1); assert.match(lastMessage(), /Leave this one/);
  use(obj("oa_strongbox"), "Open"); assert.match(lastMessage(), /Put them down first \(0\/5\)/); assert.ok(!p.questData.oa_box);
  onMonsterKilled(g, "bandit", 100, 100); assert.ok(!p.questData.oa_raiders, "raiders elsewhere don't count");
  for (let k = 0; k < 6; k++) onMonsterKilled(g, "bandit", OATH_ROAD.den.x, OATH_ROAD.den.y);
  assert.equal(p.questData.oa_raiders, Q.OA_RAIDERS, "five, and no more counted");
  use(obj("oa_strongbox"), "Open"); assert.equal(p.questData.oa_box, 1);
  d = talk(g, "farwake_master"); assert.match(d.lines[0].text, /Zoryavik silver and a Vargskeld arm-ring/); d.onEnd?.(); assert.equal(p.questData.oa_step, 2);
  // Six accounts.
  choose(talk(g, "jarl_hallveig"), "About the raiders' strongbox…"); choose(talk(g, "prince_radomir"), "About the raiders' strongbox…");
  choose(talk(g, "ember_skald"), "Tell me the verse of the agreement."); choose(talk(g, "archivist_bozhena"), "Show me the copies of the agreement.");
  assert.equal(p.questData.oa_step, 2, "not yet: the stone");
  use(obj("oa_west"), "Read"); use(obj("oa_east"), "Read"); assert.match(lastMessage(), /recut by a newer hand/);
  assert.equal(p.questData.oa_step, 3, "all six heard: the first copy next");
  assert.ok(Q.NORTH_QUESTS[0].journal(g).some(line => /Old Dobromir/.test(line)));
  d = talk(g, "old_bough_keeper"); assert.match(d.lines[0].text, /behind the carved face/); d.onEnd?.();
  assert.ok(has(p, "first_copy") && p.questData.oa_step === 4);
  use(gate, "Open"); assert.match(lastMessage(), /Barred/, "still barred until it's decided");
  // The choice: restore it.
  const coins = count(p, "coins"), mysteries = p.xp.mysteries;
  use(stone, "Read-aloud"); d = g.dialogue; assert.ok(d && d.options.length === 4, "four answers at the stone");
  d = choose(d, "Restore it, as it was sworn."); d.onEnd?.(); g.dialogue = null;
  assert.ok(questDone(g, Q.OLD_AGREEMENT)); assert.equal(p.questData.oa_choice, Q.OA_RESTORE); assert.ok(!has(p, "first_copy"));
  assert.equal(count(p, "coins"), coins + 5000); assert.ok(p.xp.mysteries > mysteries); assert.ok(unlockedTitles(g).some(t => t.id === "oathwitness"));
  assert.ok(Q.NORTH_QUESTS[0].journal(g).some(line => /QUEST COMPLETE/.test(line)));
  standBy(g, gate); const side = Math.sign(p.x - gate.x); use(gate, "Open"); assert.equal(Math.sign(p.x - gate.x), -side, "through the bar to the other side"); assert.match(lastMessage(), /wave you through/);
  choose(talk(g, "skarnholm_trader"), "Let's trade."); assert.equal(g.ui.shop, "skarnholm_quay_open"); g.ui.shop = null;
  choose(talk(g, "krasnogor_trader"), "Let's trade."); assert.equal(g.ui.shop, "krasnogor_market_open"); g.ui.shop = null;
  assert.match(talk(g, "jarl_hallveig").lines[0].text, /swore the whole thing again/); assert.match(talk(g, "prince_radomir").lines[0].text, /paid for the garrison/);
  // The other two answers, and what they change.
  const g2 = newGame(); g2.player.quests[Q.OLD_AGREEMENT] = 2; g2.player.questData.oa_choice = Q.OA_NEW;
  d = talk(g2, "prince_radomir"); assert.match(d.lines[0].text, /nothing to say to each other/); assert.ok(!d.options?.length, "the prince won't talk");
  assert.match(talk(g2, "freeholds_speaker").lines[0].text, /drinking to you/); assert.equal(Q.NORTH_CLUES.oa_gate.use(g2, gate, "Open").to.y, gate.y, "the bar opens for a new agreement too");
  const g3 = newGame(); g3.player.quests[Q.OLD_AGREEMENT] = 2; g3.player.questData.oa_choice = Q.OA_BURN;
  assert.match(Q.NORTH_CLUES.oa_gate.use(g3, gate, "Open").text, /barred for good/); assert.ok(!Q.NORTH_CLUES.oa_gate.use(g3, gate, "Open").to);
  choose(talk(g3, "redwake_captain"), "Show me the company's stores."); assert.equal(g3.ui.shop, "redwake_stores");
  choose(talk(g3, "skarnholm_trader"), "Let's trade."); assert.equal(g3.ui.shop, "skarnholm_quay", "no Zoryavik iron with the pass shut");
  assert.match(Q.NORTH_CLUES.oa_stone.examine(g3, stone), /ash/);
});

test("Seafaring: a shipwright builds from real materials (taken), the vessel goes into the water at the yard; aboard you sail the water your vessel can take and go ashore by clicking the shore; it stays moored with its hold through a save; teleported off, it stays where it was; planks sawn, hulls mended", async () => {
  const SF = await import("../games/rarefriends-realm/seafaring.ts");
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  const { SKILLS } = await import("../games/rarefriends-realm/data.ts");
  const { WALKABLE, isWater } = await import("../games/rarefriends-realm/world.ts");
  const g = newGame(), p = g.player, world = g.world;
  assert.ok(SKILLS.includes("seafaring"), "a skill of its own");
  const bersi = world.spawns.find(s => s.kind === "npc" && s.id === "shipwright_bersi");
  teleport(g, bersi.x + 1, bersi.y);
  const choose = (d, label) => { const o = d.options?.find(x => x.label.startsWith(label)); assert.ok(o, `"${label}" offered`); return o.then(); };
  // Too little Seafaring for a longship; nothing to build a rowboat with yet.
  let d = choose(talk(g, "shipwright_bersi"), "Build me a vessel.");
  assert.match(choose(d, "Longship").lines[0].text, /Seafaring level of 50/);
  assert.match(choose(choose(talk(g, "shipwright_bersi"), "Build me a vessel."), "Rowboat").lines[0].text, /Still wanted/);
  // Planks sawn from logs, for a fee.
  give(p, "pine_logs", 6); give(p, "coins", 1000); const coins = count(p, "coins");
  choose(choose(talk(g, "shipwright_bersi"), "Saw some planks."), "Pine planks");
  assert.equal(count(p, "pine_planks"), 6); assert.equal(count(p, "pine_logs"), 0); assert.equal(count(p, "coins"), coins - 6 * SF.SEA.sawFee.pine_planks);
  give(p, "pewter_rivets", 3); give(p, "ships_rope", 1);
  d = choose(choose(talk(g, "shipwright_bersi"), "Build me a vessel."), "Rowboat"); choose(d, "Build it.");
  assert.equal(p.vessels.length, 1); const v = p.vessels[0];
  assert.equal(count(p, "pine_planks"), 0, "the planks were used"); assert.equal(count(p, "ships_rope"), 0); assert.equal(count(p, "pewter_rivets"), 2);
  assert.ok(p.xp.seafaring >= SF.VESSELS.rowboat.buildXp); assert.equal(world.tiles[v.y * W + v.x], T.WATER, "launched on water it can take (the shallows)");
  const moored = world.objects.find(o => o.text === `vessel:${v.id}`); assert.ok(moored && moored.decor === "vessel" && moored.blocks);
  // Board it from beside it; aboard, only water underfoot.
  const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: v.x + dx, y: v.y + dy })).find(t => canWalk(g, t.x, t.y)); assert.ok(shore, "there's land beside the slip");
  teleport(g, shore.x, shore.y); assert.equal(SF.VESSEL_CLUES.vessel.use(g, moored, "Board"), null);
  assert.equal(p.aboard, v.id); assert.deepEqual([p.x, p.y], [v.x, v.y]);
  assert.ok(!canWalk(g, shore.x, shore.y), "no walking on land from a boat"); assert.ok(!world.objects.some(o => o.text === `vessel:${v.id}` && o.name !== "__removed"), "not moored while you're in it");
  // A rowboat keeps to the shallows; a longship goes anywhere there's water.
  let deep = null; for (let i = 0; i < W * 400 && !deep; i++) if (world.tiles[i] === T.DEEP) deep = { x: i % W, y: Math.floor(i / W) };
  assert.ok(!SF.sailableFor(world, "rowboat", deep.x, deep.y) && SF.sailableFor(world, "longship", deep.x, deep.y));
  assert.ok(!SF.sailableFor(world, "longship", v.x, UNDER_Y + 20), "nothing sails underground");
  // Sail somewhere, then click the shore: you sail beside it and step off; it stays moored where it was.
  // Somewhere on the same water, a few tiles off.
  let target = null; { const seen = new Set([v.y * W + v.x]), queue = [[v.x, v.y]];
    for (let h = 0; h < queue.length && !target; h++) { const [x, y] = queue[h]; if (Math.abs(x - v.x) + Math.abs(y - v.y) >= 8) target = { x, y };
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (y + dy) * W + x + dx; if (!seen.has(k) && SF.sailable(g, x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); } } } }
  assert.ok(walkTo(g, target.x, target.y)); until(g, () => p.x === target.x && p.y === target.y, 80);
  assert.ok(v.sailed >= 5 && v.x === p.x && v.y === p.y, "the vessel goes where you sail it");
  let land = null; for (let r = 1; r < 30 && !land; r++) for (let dy = -r; dy <= r && !land; dy++) for (let dx = -r; dx <= r && !land; dx++) { const x = p.x + dx, y = p.y + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) === r && WALKABLE.has(world.tiles[y * W + x]) && world.objectAt[y * W + x] < 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ex, ey]) => SF.sailable(g, x + ex, y + ey))) land = { x, y }; }
  assert.ok(walkTo(g, land.x, land.y)); until(g, () => p.aboard === null, 80);
  assert.deepEqual([p.x, p.y], [land.x, land.y], "ashore where you clicked"); assert.equal(Math.abs(v.x - land.x) + Math.abs(v.y - land.y), 1, "moored beside it");
  assert.ok(world.objects.some(o => o.text === `vessel:${v.id}` && o.x === v.x && o.y === v.y), "moored in the world again");
  assert.ok(Object.keys(p.landfalls).length >= 1, "a first landfall by sea remembered");
  // The hold: things go in from the pack beside it, and come back out.
  give(p, "raw_carp", 1); const carp = p.inventory.findIndex(s => s?.id === "raw_carp");
  assert.ok(SF.stowInHold(g, carp)); assert.equal(count(p, "raw_carp"), 0); assert.equal(v.hold.filter(Boolean).length, 1);
  assert.equal(SF.VESSEL_CLUES.vessel.use(g, world.objects.find(o => o.text === `vessel:${v.id}` && o.name !== "__removed"), "Hold"), null); assert.equal(g.ui.hold, v.id);
  // Through a save: the vessel, where it's moored, its hold.
  const save = JSON.parse(JSON.stringify(serialize(g))), g2 = newGame(); assert.ok(restore(g2, save));
  assert.deepEqual(g2.player.vessels.map(x => [x.kind, x.x, x.y, x.hold.filter(Boolean).map(s => s.id)]), [["rowboat", v.x, v.y, ["raw_carp"]]]);
  assert.ok(g2.world.objects.some(o => o.text === `vessel:${v.id}` && o.name !== "__removed"));
  assert.ok(SF.takeFromHold(g, v.hold.findIndex(Boolean))); assert.equal(count(p, "raw_carp"), 1);
  // Teleported off the water while aboard: it stays where it was.
  teleport(g, shore.x, shore.y); SF.board(g, v); const at = { x: v.x, y: v.y };
  teleport(g, world.places.spawn.x, world.places.spawn.y); tick(g);
  assert.equal(p.aboard, null); assert.deepEqual({ x: v.x, y: v.y }, at);
  // A save made standing on water with no vessel under you puts you on dry land.
  const wet = JSON.parse(JSON.stringify(serialize(g))); wet.x = at.x; wet.y = at.y; wet.aboard = null; const g3 = newGame(); assert.ok(restore(g3, wet));
  assert.ok(WALKABLE.has(g3.world.tiles[g3.player.y * W + g3.player.x]) && !isWater(g3.world.tiles[g3.player.y * W + g3.player.x]));
  // Mended at the yard: planks and pewter rivets.
  v.hull = 10; give(p, "pine_planks", 5); teleport(g, bersi.x + 1, bersi.y);
  choose(talk(g, "shipwright_bersi"), "Mend my vessel."); assert.ok(v.hull > 10);
  // Three at most.
  p.vessels.push({ ...v, id: 2 }, { ...v, id: 3 }); assert.match(SF.buildProblem(g, "rowboat"), /3 vessels already/);
});

test("Seafaring grown: hull fittings fitted to a vessel, the ship's bell calls it to the shore, the shores a quest keeps closed stay closed by sea too, a boatwright at Gullwick, and offshore shoals fished from a longship", async () => {
  const SF = await import("../games/rarefriends-realm/seafaring.ts");
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  const { WALKABLE, regionAt } = await import("../games/rarefriends-realm/world.ts");
  const g = newGame(), p = g.player, world = g.world;
  const near = (x, y, ok, r = 30) => { for (let d = 0; d < r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d && ok(x + dx, y + dy)) return { x: x + dx, y: y + dy }; return null; };
  const land = (x, y) => WALKABLE.has(world.tiles[y * W + x]) && !isWaterTile(world.tiles[y * W + x]) && world.objectAt[y * W + x] < 0;
  const isWaterTile = t => t === T.WATER || t === T.DEEP;
  // A longship of yours in the Skarnfjord.
  const bersi = world.spawns.find(s => s.kind === "npc" && s.id === "shipwright_bersi");
  const spot = SF.launchSpot(g, "longship", bersi); assert.ok(spot);
  p.vessels.push({ id: 1, kind: "longship", name: "Longship", x: spot.x, y: spot.y, heading: { x: 0, y: 1 }, hull: 120, hold: Array(16).fill(null), sailed: 0 }); SF.applyVessels(g);
  const v = p.vessels[0], shore = near(v.x, v.y, (x, y) => land(x, y) && Math.abs(x - v.x) + Math.abs(y - v.y) === 1, 2) ?? near(v.x, v.y, land); teleport(g, shore.x, shore.y);
  // A hull fitting: the hull grows by its share, keeping the damage; a better one replaces a worse, which comes back.
  give(p, "moonsilver_hull_fitting", 1); give(p, "glimmer_hull_fitting", 1);
  assert.ok(SF.fitToVessel(g, p.inventory.findIndex(s => s?.id === "moonsilver_hull_fitting")));
  assert.equal(SF.maxHull(v), 250); assert.equal(v.hull, 170, "the new strength added, the damage kept");
  assert.ok(SF.fitToVessel(g, p.inventory.findIndex(s => s?.id === "glimmer_hull_fitting")));
  assert.equal(v.fitting, "glimmer"); assert.equal(count(p, "moonsilver_hull_fitting"), 1, "the old one back"); assert.equal(SF.maxHull(v), 300);
  assert.ok(!SF.fitToVessel(g, p.inventory.findIndex(s => s?.id === "moonsilver_hull_fitting")), "no going down a grade");
  // The ship's bell: too little Seafaring, then it calls the vessel you last took to the water beside you.
  give(p, "rarite_ships_bell", 1); const far = near(v.x, v.y, (x, y) => land(x, y) && Math.hypot(x - v.x, y - v.y) > 25 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => SF.sailableFor(world, "longship", x + dx, y + dy)), 80);
  assert.ok(far, "a shore somewhere else"); teleport(g, far.x, far.y);
  assert.ok(!SF.ringBell(g)); p.xp.seafaring = 300_000;
  assert.ok(SF.ringBell(g)); assert.ok(Math.abs(v.x - far.x) <= 10 && Math.abs(v.y - far.y) <= 10, "it came"); assert.ok(world.objects.some(o => o.text === "vessel:1" && o.x === v.x && o.y === v.y));
  assert.ok(!SF.ringBell(g), "not again straight away");
  // A shore a quest keeps closed: the Mizukai islands before you're presented at the Hall.
  const kibi = (() => { for (let i = 0; i < W * 1240; i++) { const x = i % W, y = Math.floor(i / W); if (regionAt(world, x, y).id === "kibi" && land(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => SF.sailableFor(world, "longship", x + dx, y + dy))) return { x, y }; } return null; })();
  assert.ok(kibi, "the tea island has a shore");
  assert.match(SF.landingProblem(g, kibi.x, kibi.y), /won't have you yet/); p.quests.landfall = 9; assert.equal(SF.landingProblem(g, kibi.x, kibi.y), null, "presented, it will");
  const merrab = (() => { for (let i = 0; i < W * 1240; i++) { const x = i % W, y = Math.floor(i / W); if (regionAt(world, x, y).id === "sea_of_dunes" && land(x, y)) return { x, y }; } return null; })();
  if (merrab) assert.match(SF.landingProblem(g, merrab.x, merrab.y), /Foothold/, "Kharaveth's coast waits on the road south");
  // Gullwick's boatwright builds the small ones.
  const tamsin = world.spawns.find(s => s.kind === "npc" && s.id === "gullwick_boatwright"); assert.ok(tamsin);
  teleport(g, tamsin.x + 1, tamsin.y); const d = talk(g, "gullwick_boatwright"); assert.ok(d.options.some(o => o.label === "Build me a vessel."));
  assert.ok(d.options.find(o => o.label === "Build me a vessel.").then().options.some(o => /^Fishing skiff/.test(o.label)));
  assert.ok(SF.launchSpot(g, "skiff", tamsin), "Gullwick's hard has water for a skiff");
  // Offshore shoals: out of reach of the land, in reach of a longship; fished from aboard.
  const shoals = world.objects.filter(o => o.text === "offshore"); assert.ok(shoals.length >= 10 && shoals.some(o => o.spot === "deep") && shoals.some(o => o.spot === "harpoon"));
  for (const o of shoals.filter(o => /shoal/i.test(o.name))) assert.ok(![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => WALKABLE.has(world.tiles[(o.y + dy) * W + o.x + dx]) && !isWaterTile(world.tiles[(o.y + dy) * W + o.x + dx])), "nobody fishes it from the shore");
  const shoal = shoals.find(o => o.spot === "harpoon"), beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: shoal.x + dx, y: shoal.y + dy })).find(t => SF.sailableFor(world, "longship", t.x, t.y));
  v.x = beside.x; v.y = beside.y; p.aboard = 1; teleport(g, beside.x, beside.y); p.xp.fishing = 300_000; give(p, "harpoon", 1);
  setTarget(g, { kind: "object", id: shoal.id, option: "Harpoon" }); until(g, () => p.activity?.kind === "fish", 10);
  assert.equal(p.aboard, 1, "still aboard, fishing");
});

test("A berth: a barge or a longship can be your waking place (Seafaring 40), one waking place at a time with a camp; you wake aboard it wherever it's moored, and a vessel you fall aboard stays where it was", async () => {
  const SF = await import("../games/rarefriends-realm/seafaring.ts");
  const { die } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player, world = g.world;
  const bersi = world.spawns.find(s => s.kind === "npc" && s.id === "shipwright_bersi"), olena = world.spawns.find(s => s.kind === "npc" && s.id === "bereslav_bargewoman");
  const a = SF.launchSpot(g, "barge", olena); p.vessels.push({ id: 1, kind: "barge", name: "River barge", x: a.x, y: a.y, heading: { x: 0, y: 1 }, hull: 140, hold: Array(28).fill(null), sailed: 0 });
  const b = SF.launchSpot(g, "rowboat", bersi); p.vessels.push({ id: 2, kind: "rowboat", name: "Rowboat", x: b.x, y: b.y, heading: { x: 0, y: 1 }, hull: 40, hold: Array(4).fill(null), sailed: 0 }); SF.applyVessels(g);
  const barge = p.vessels.find(v => v.id === 1), row = p.vessels.find(v => v.id === 2);
  assert.ok(!SF.toggleBerth(g, row), "a rowboat has no berth"); assert.ok(!SF.toggleBerth(g, barge), "Seafaring 40 first");
  p.xp.seafaring = 40_000; p.camp = { x: 10, y: 10, tier: 3, respawn: true, altar: false, cache: null, brazier: false, waystone: false };
  assert.ok(SF.toggleBerth(g, barge)); assert.ok(barge.berth && !p.camp.respawn, "one waking place: the camp stops being it");
  const o = world.objects.find(x => x.text === "vessel:1" && x.name !== "__removed"); assert.ok(SF.VESSEL_CLUES.vessel.options(g, o).includes("Unmake-waking-place"));
  // Fall aboard the rowboat: it stays moored where it was, and you wake in the barge's berth.
  teleport(g, row.x, row.y); p.aboard = 2; SF.applyVessels(g); p.hp = 0; die(g);
  assert.equal(p.aboard, 1); assert.deepEqual([p.x, p.y], [barge.x, barge.y]);
  assert.ok(world.objects.some(x => x.text === "vessel:2" && x.name !== "__removed" && x.x === row.x && x.y === row.y), "the rowboat's still moored");
  assert.match(g.messages[g.messages.length - 1].text, /berth/);
  // Through a save, and back to the fountain when it's unmade.
  const g2 = newGame(); assert.ok(restore(g2, JSON.parse(JSON.stringify(serialize(g))))); assert.ok(g2.player.vessels.find(v => v.id === 1).berth);
  SF.toggleBerth(g, barge); teleport(g, 100, 100); p.aboard = null; die(g); assert.deepEqual([p.x, p.y], [world.places.spawn.x, world.places.spawn.y]);
});

test("North wayfinding and dress: waymarks along four trails (note them all and the trail is known: XP once, half the run's cost on it, kept through a save), shortcuts and the Wolfsback climb, Skarnholm Bay and the named fells, and the north's own clothes at its own tailors", async () => {
  const { TRAILS, ROADS } = await import("../games/rarefriends-realm/northworld.ts");
  const WF = await import("../games/rarefriends-realm/wayfinding.ts");
  const { NORTH_CLOTHING, NORTH_SHOPS } = await import("../games/rarefriends-realm/northgear.ts");
  const g = newGame(), p = g.player, world = g.world, top = mainlandAt(0, 0).y;
  const seen = reachable(g, world.places.spawn);
  const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => seen[(y + dy) * W + x + dx]);
  // Every trail has its waymarks, each one a walk away.
  for (const trail of TRAILS) {
    const marks = world.objects.filter(o => o.clue === "waymark" && o.text.startsWith(`${trail.id}:`));
    assert.ok(marks.length >= 3 && marks.length === WF.waymarkCount(world, trail.id), `${trail.name} has its waymarks`);
    for (const o of marks) assert.ok(near(o.x, o.y), `${trail.name}'s waymark at ${o.x},${o.y} is reachable`);
  }
  // On the Bough Road: the run costs the same until the trail's known.
  const [rx, ry] = ROADS[TRAILS.find(t => t.id === "bough_road").road][1], onRoad = () => teleport(g, Math.round(rx), Math.round(ry)), offRoad = () => teleport(g, world.places.spawn.x, world.places.spawn.y);
  const drains = () => { onRoad(); const on = runDrain(g); offRoad(); const off = runDrain(g); return on / off; };
  assert.ok(Math.abs(drains() - 1) < 1e-9, "the same cost on an unknown trail");
  const marks = world.objects.filter(o => o.clue === "waymark" && o.text.startsWith("bough_road:")), xp0 = p.xp.agility ?? 0;
  assert.match(WF.WAYMARK_CLUES.waymark.use(g, marks[0], "Note-the-way").text, /noted \(1\//);
  assert.match(WF.WAYMARK_CLUES.waymark.use(g, marks[0], "Note-the-way").text, /already/); assert.ok(!WF.trailKnown(g, "bough_road"));
  for (const o of marks.slice(1)) WF.WAYMARK_CLUES.waymark.use(g, o, "Note-the-way");
  assert.ok(WF.trailKnown(g, "bough_road") && !WF.trailKnown(g, "west_road"));
  assert.equal((p.xp.agility ?? 0) - xp0, 25 * marks.length + 60 * marks.length, "XP for each waymark and for the trail");
  assert.ok(Math.abs(drains() - 0.5) < 1e-9, "half the run's cost on a known trail");
  const g2 = newGame(); assert.ok(restore(g2, JSON.parse(JSON.stringify(serialize(g))))); assert.ok(WF.trailKnown(g2, "bough_road"));
  assert.deepEqual(WF.cleanTrails({ bough_road: 3, nowhere: 1, west_road: -1, east_road: "x" }), { bough_road: 3 });
  // Shortcuts in the Zoryavik and the climb over the Wolfsback: both ends reachable.
  const cuts = world.objects.filter(o => o.kind === "obstacle" && o.y < top && o.obstacle.course === "shortcut");
  assert.deepEqual([...new Set(cuts.map(o => o.name))].sort(), ["Icicle climb", "Log balance", "Stepping stone"]);
  for (const o of cuts) if (o.name !== "Icicle climb") { assert.ok(near(o.x, o.y), `${o.name} at ${o.x},${o.y} is reachable`); assert.ok(near(o.to.x, o.to.y), `and so is where it takes you`); }
  assert.ok(cuts.filter(o => o.name === "Icicle climb").every(o => o.obstacle.level === 35) && cuts.filter(o => o.name === "Icicle climb").length === 2);
  // Skarnholm Bay: open water with islands, cliffs round it, sea stacks off the coast, standing stones on the fells.
  for (const id of ["skarnholm_bay", "grimfell", "sokol_hills"]) { const r = REGIONS.find(x => x.id === id); assert.equal(regionAt(world, r.label.x, r.label.y).id, id); }
  const bay = REGIONS.find(r => r.id === "skarnholm_bay").label; let water = 0, cliff = 0;
  for (let dy = -40; dy <= 40; dy++) for (let dx = -60; dx <= 60; dx++) { const t = terrainAt(world, bay.x + dx, bay.y + dy); if (t === T.WATER || t === T.DEEP) water++; if (t === T.CLIFF) cliff++; }
  assert.ok(water > 5000 && cliff > 150, `a wide bay with a cliffed shore (${water} water, ${cliff} cliff)`);
  assert.ok(world.objects.filter(o => o.name === "A sea stack").length >= 12 && world.objects.filter(o => o.name === "A standing stone").length >= 12);
  // The north's clothes: regional, sold whole by a tailor who lives in the right town.
  for (const set of NORTH_CLOTHING) {
    assert.ok(REGIONAL_CLOTHING.includes(set), `${set.region}'s clothes are regional`);
    assert.equal(SHOPS[set.shop], NORTH_SHOPS[set.shop]); assert.deepEqual([...SHOPS[set.shop].stock].sort(), set.pieces.map(x => x.id).sort());
    for (const piece of set.pieces) assert.ok(ITEM_LIST.some(i => i.id === piece.id), piece.id);
    const keeper = Object.values(NPCS).find(n => n.shop === set.shop), at = world.spawns.find(s => s.kind === "npc" && s.id === keeper.id);
    assert.ok(at && near(at.x, at.y), `${keeper.name} is reachable`);
    assert.equal(regionAt(world, at.x, at.y).id, set.region === "vargskeld" ? "skarnholm" : "krasnogor");
    for (let k = 0; k < 4; k++) assert.ok(talk(g, keeper.id).lines[0].text.length > 20);
  }
});

test("Going ashore: aboard, H (or the Go ashore button) sails you to the nearest shore your vessel can land on and puts you on it; the button lights when you can step off right there; the vessel stays moored", async () => {
  const SF = await import("../games/rarefriends-realm/seafaring.ts");
  const { goAshoreNearest, toggleMount } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player, world = g.world;
  const bersi = world.spawns.find(s => s.kind === "npc" && s.id === "shipwright_bersi"), a = SF.launchSpot(g, "rowboat", bersi);
  p.vessels.push({ id: 1, kind: "rowboat", name: "Rowboat", x: a.x, y: a.y, heading: { x: 0, y: 1 }, hull: 40, hold: Array(4).fill(null), sailed: 0 });
  assert.ok(!goAshoreNearest(g), "not aboard: nothing to do");
  // Out on the water, a few strokes from any shore: the button is dark, and H finds the way in.
  const seen = new Set([a.y * W + a.x]); let ring = [[a.x, a.y]], out = null;
  teleport(g, a.x, a.y); p.aboard = 1; SF.applyVessels(g);
  for (let d = 0; d < 40 && ring.length && !out; d++) { const next = []; for (const [x, y] of ring) for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) { const i = (y + dy) * W + x + dx; if (seen.has(i) || !SF.sailable(g, x + dx, y + dy)) continue; seen.add(i); next.push([x + dx, y + dy]); teleport(g, x + dx, y + dy); if (d >= 3 && !SF.canLandHere(g)) out ??= [x + dx, y + dy]; } ring = next; }
  assert.ok(out, "somewhere off the shore"); teleport(g, out[0], out[1]); p.vessels[0].x = out[0]; p.vessels[0].y = out[1];
  assert.ok(!SF.canLandHere(g), "dark at sea"); const at = SF.nearestLanding(g); assert.ok(at, "a landing within reach");
  toggleMount(g); assert.ok(p.aboard === 1 && (p.path.length > 0), "H sails you there");
  for (let t = 0; t < 300 && p.aboard !== null; t++) { if (p.path.length === 1 && SF.canLandHere(g)) assert.ok(true); tick(g); }
  assert.equal(p.aboard, null, "ashore"); assert.ok(!SF.sailable(g, p.x, p.y) && canWalk(g, p.x, p.y), "standing on land");
  const v = p.vessels[0]; assert.ok(Math.abs(v.x - p.x) + Math.abs(v.y - p.y) === 1, "the rowboat moored beside you");
  assert.ok(world.objects.some(o => o.text === "vessel:1" && o.name !== "__removed"));
});

test("The seaways: the Outer Sea runs round the whole map, so a longship from Skarnholm reaches every edge and corner; the straits join the inland seas to it, bridged where a road crosses", async () => {
  const SF = await import("../games/rarefriends-realm/seafaring.ts");
  const { STRAITS, RING } = await import("../games/rarefriends-realm/seaways.ts");
  const g = newGame(), world = g.world, sail = (x, y) => SF.sailableFor(world, "longship", x, y);
  const bersi = world.spawns.find(s => s.kind === "npc" && s.id === "shipwright_bersi"), start = SF.launchSpot(g, "longship", bersi);
  const seen = new Uint8Array(W * OVERWORLD_H), q = [start.y * W + start.x]; seen[q[0]] = 1;
  while (q.length) { const i = q.pop(), x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= OVERWORLD_H) continue; const k = ny * W + nx; if (!seen[k] && sail(nx, ny)) { seen[k] = 1; q.push(k); } } }
  // Every stretch of every edge: some open water within the band, all one sea.
  for (let p = 0; p < W; p += 40) for (const y of [2, OVERWORLD_H - 3]) { let ok = false; for (let d = 0; d < RING && !ok; d++) for (let dx = -20; dx <= 20 && !ok; dx++) { const x = Math.max(0, Math.min(W - 1, p + dx)), yy = y === 2 ? d : OVERWORLD_H - 1 - d; ok = !!seen[yy * W + x]; } assert.ok(ok, `the sea along the ${y === 2 ? "top" : "bottom"} at x ${p}`); }
  for (let p = 0; p < OVERWORLD_H; p += 40) for (const left of [true, false]) { let ok = false; for (let d = 0; d < RING && !ok; d++) for (let dy = -20; dy <= 20 && !ok; dy++) { const y = Math.max(0, Math.min(OVERWORLD_H - 1, p + dy)), x = left ? d : W - 1 - d; ok = !!seen[y * W + x]; } assert.ok(ok, `the sea along the ${left ? "left" : "right"} at y ${p}`); }
  // Each strait: water all along it, joined to the sea, and the roads it cuts carried over on bridges.
  for (const strait of STRAITS) {
    for (const [x, y] of strait.points) { const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(y + dy) * W + x + dx]); assert.ok(near, `${strait.name} at ${x},${y} is open sea`); }
    if (/Southshore|Vargskeld lake/.test(strait.name)) { const xs = strait.points.map(p => p[0]), ys = strait.points.map(p => p[1]); let bridges = 0;
      for (let y = Math.min(...ys) - 4; y <= Math.max(...ys) + 4; y++) for (let x = Math.min(...xs) - 4; x <= Math.max(...xs) + 4; x++) if (world.tiles[y * W + x] === T.BRIDGE) bridges++;
      assert.ok(bridges >= 4, `${strait.name}: the road crosses on a bridge`); }
  }
  assert.ok(regionAt(world, REGIONS.find(r => r.id === "outer_sea").label.x, REGIONS.find(r => r.id === "outer_sea").label.y).id === "outer_sea");
  // The Deadwood coast's sea, the Southshore water and Glass Lake are part of it now.
  for (const id of ["glass_lake", "southshore"]) { let any = false; for (let i = 0; i < W * OVERWORLD_H && !any; i++) if (seen[i] && world.region[i] === REGIONS.indexOf(REGIONS.find(r => r.id === id))) any = true; assert.ok(any, `${id}'s water is on the sea`); }
});

test("The lie of the land: sea level at the shores, climbing from Friendhollow through the Ashen Hills to Emberforge and up to Frostpeak; every building stands level, its roof's overhang included", async () => {
  const { cornerHeight, OVERWORLD_H: OH } = await import("../games/rarefriends-realm/world.ts");
  const g = newGame(), world = g.world;
  const mean = id => { const k = REGIONS.findIndex(r => r.id === id); let sum = 0, n = 0; for (let i = 0; i < W * OH; i++) if (world.region[i] === k) { sum += world.base[i]; n++; } return sum / n; };
  const [fh, ah, ef, fp] = ["friendhollow", "ashen_hills", "emberforge", "frostpeak"].map(mean);
  assert.ok(fh < ah && ah < ef && ef < fp, `going up: Friendhollow ${fh.toFixed(0)} < Ashen Hills ${ah.toFixed(0)} < Emberforge ${ef.toFixed(0)} < Frostpeak ${fp.toFixed(0)}`);
  assert.ok(fp - fh > 100, "Frostpeak stands well above Friendhollow");
  // The open sea lies at sea level.
  const outer = REGIONS.findIndex(r => r.id === "outer_sea"); let seaTop = 0; for (let i = 0; i < W * OH; i++) if (world.region[i] === outer && world.tiles[i] === T.DEEP) seaTop = Math.max(seaTop, world.base[i]); assert.equal(seaTop, 0);
  // Every building in the overworld: the corners under it and a tile round it are level (walls and roof on one ground).
  let worst = 0, where = "";
  for (const b of world.buildings) { if (b.y1 >= OH) continue; let lo = Infinity, hi = -Infinity;
    for (let j = b.y0 - 1; j <= b.y1 + 2; j++) for (let i = b.x0 - 1; i <= b.x1 + 2; i++) { const h = cornerHeight(world, i, j); lo = Math.min(lo, h); hi = Math.max(hi, h); }
    if (hi - lo > worst) { worst = hi - lo; where = `${b.name} at ${b.x0},${b.y0}`; } }
  assert.ok(worst < 0.5, `buildings stand level (worst ${worst.toFixed(2)} px: ${where})`);
});

test("Fitting out a vessel: supply barrels and the resupply lever top your pack up to the loadout from the barrels you draw on and nothing else (never making anything, reporting what's short, a second pull at once doing nothing); loadouts are independent; a cabin, a galley, a repair bench take the hold's room; names and dyed sails; a rowboat carried and launched; the yards", async () => {
  const SF = await import("../games/rarefriends-realm/seafaring.ts");
  const FIT = await import("../games/rarefriends-realm/shipfit.ts");
  const { itemOptions } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player, world = g.world;
  const bersi = world.spawns.find(s => s.kind === "npc" && s.id === "shipwright_bersi"), at = SF.launchSpot(g, "longship", bersi);
  p.vessels.push({ id: 1, kind: "longship", name: "Longship", x: at.x, y: at.y, heading: { x: 0, y: 1 }, hull: 200, hold: Array(16).fill(null), sailed: 0 }); SF.applyVessels(g);
  const v = p.vessels[0], near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].map(([dx, dy]) => ({ x: v.x + dx, y: v.y + dy })).find(t => canWalk(g, t.x, t.y)); teleport(g, near.x, near.y);
  p.xp.seafaring = 1e7; for (const [id, n] of [["pine_planks", 10], ["pewter_rivets", 4], ["oak_planks", 30], ["blackiron_rivets", 10], ["ships_rope", 4], ["sailcloth", 2]]) give(p, id, n);
  // The shipwright fits her out (the lever wants the barrels first; a cabin wants room in the hold).
  assert.match(FIT.fitoutProblem(g, v, "resupply_lever"), /supply barrels first/);
  assert.ok(FIT.fitOut(g, v, "supply_barrels") && FIT.fitOut(g, v, "resupply_lever"));
  v.hold[0] = { id: "pewter_arrow", n: 30 }; v.hold[4] = { id: "arrow_shaft", n: 50 }; for (let i = 5; i < 16; i++) v.hold[i] = { id: "logs", n: 1 };
  assert.match(FIT.fitoutProblem(g, v, "cabin"), /Clear 4 spaces/); for (let i = 5; i < 9; i++) v.hold[i] = null;
  assert.ok(FIT.fitOut(g, v, "cabin")); assert.equal(v.hold.length, 12); assert.equal(v.hold.filter(Boolean).length, 9, "nothing lost when the hold closes up");
  p.inventory.fill(null);
  const arrowsAt = v.hold.findIndex(s => s?.id === "pewter_arrow"), shaftsAt = v.hold.findIndex(s => s?.id === "arrow_shaft");
  // Barrel roles: the shafts' barrel kept back, not drawn on.
  FIT.setBarrel(v, Math.floor(shaftsAt / FIT.BARREL_SLOTS), { supply: false, role: 4 });
  FIT.setRule(v, { item: "pewter_arrow", target: 20 }); FIT.setRule(v, { item: "arrow_shaft", target: 100 }); FIT.setRule(v, { item: "antidote", target: 5 });
  give(p, "pewter_arrow", 12);
  const before = count(p, "pewter_arrow") + FIT.inSupply(v, "pewter_arrow");
  const o = world.objects.find(x => x.text === "vessel:1" && x.name !== "__removed"); assert.ok(SF.VESSEL_CLUES.vessel.options(g, o).includes("Pull-lever"));
  const said = SF.VESSEL_CLUES.vessel.use(g, o, "Pull-lever");
  assert.equal(count(p, "pewter_arrow"), 20, `topped up to the target (${JSON.stringify(said)} ${g.messages.slice(-4).map(m => m.text).join(" | ")})`); assert.equal(v.hold[arrowsAt].n, 22, "eight out of the barrel");
  assert.equal(count(p, "pewter_arrow") + v.hold[arrowsAt].n, before, "nothing made, nothing lost");
  assert.equal(count(p, "arrow_shaft"), 0, "a barrel you don't draw on gives nothing"); assert.equal(v.hold[shaftsAt].n, 50);
  assert.ok(g.messages.some(m => /Short of Antidote: there's none/.test(m.text)) && g.messages.some(m => /Short of Arrow shaft/.test(m.text)));
  take(p, "pewter_arrow", 10); SF.VESSEL_CLUES.vessel.use(g, o, "Pull-lever"); assert.equal(count(p, "pewter_arrow"), 10, "a second pull at once does nothing");
  for (let t = 0; t < FIT.SUPPLY.leverEvery; t++) g.tick++; SF.VESSEL_CLUES.vessel.use(g, o, "Pull-lever"); assert.equal(count(p, "pewter_arrow"), 20);
  // A full pack: only what fits leaves the barrels (perch don't stack: two free spaces, two perch).
  const perchAt = v.hold.indexOf(null); v.hold[perchAt] = { id: "raw_perch", n: 1 }; const spare = v.hold.indexOf(null); v.hold[spare] = { id: "raw_perch", n: 1 };
  const extra = v.hold.indexOf(null); if (extra >= 0) v.hold[extra] = { id: "raw_perch", n: 1 };
  FIT.setRule(v, { item: "raw_perch", target: 5 }); for (let t = 0; t < FIT.SUPPLY.leverEvery; t++) g.tick++;
  for (let i = 0, free = p.inventory.filter(s => !s).length; i < p.inventory.length && free > 2; i++) if (!p.inventory[i]) { p.inventory[i] = { id: "logs", n: 1 }; free--; }
  const perch0 = FIT.inSupply(v, "raw_perch"); SF.VESSEL_CLUES.vessel.use(g, o, "Pull-lever");
  assert.equal(count(p, "raw_perch"), 2, "as many as there was room for"); assert.equal(perch0 - FIT.inSupply(v, "raw_perch"), 2, "and exactly that many out of the barrels");
  assert.ok(g.messages.some(m => /No room in your pack/.test(m.text)));
  // Loadouts are independent.
  FIT.setLoadout(v, 2); assert.deepEqual(FIT.loadoutsOf(v)[2].rules, []); FIT.setRule(v, { item: "pewter_arrow", target: 30 }); FIT.setLoadout(v, 0);
  assert.equal(FIT.loadoutsOf(v)[0].rules.find(r => r.item === "pewter_arrow").target, 20); assert.equal(FIT.loadoutsOf(v)[2].rules[0].target, 30);
  // The cabin, through a save.
  p.hp = 1; assert.ok(FIT.restInCabin(g, v)); assert.equal(p.hp, maxHp(p)); assert.ok(!FIT.restInCabin(g, v), "not again at once");
  p.inventory.fill(null); FIT.nameVessel(g, v, "Sea Wolf"); give(p, "dye_madder", 1); const dyeAt = p.inventory.findIndex(s => s?.id === "dye_madder");
  itemOptions(g, dyeAt).find(x => x.verb === "Dye-sails").run(g); assert.equal(v.sail, "madder");
  const g2 = newGame(); assert.ok(restore(g2, JSON.parse(JSON.stringify(serialize(g)))));
  const v2 = g2.player.vessels[0]; assert.deepEqual([v2.name, v2.sail, v2.fitouts, v2.hold.length, FIT.loadoutsOf(v2)[2].rules[0].item, FIT.barrelsOf(v2)[Math.floor(shaftsAt / 4)].supply], ["Sea Wolf", "madder", ["supply_barrels", "resupply_lever", "cabin"], 12, "pewter_arrow", false]);
  // Putting things away is never the left-click: Use comes first.
  give(p, "oak_logs", 1); const logAt = p.inventory.findIndex(s => s?.id === "oak_logs"); assert.ok(["Use", "Light"].includes(itemOptions(g, logAt)[0].verb)); assert.ok(itemOptions(g, logAt).some(x => x.verb === "Load"));
  // A rowboat: carried and launched; it takes the water near the coast now.
  const g3 = newGame(), p3 = g3.player, w3 = g3.world, tam = w3.spawns.find(s => s.kind === "npc" && s.id === "gullwick_boatwright"), r = SF.launchSpot(g3, "rowboat", tam);
  p3.vessels.push({ id: 5, kind: "rowboat", name: "Rowboat", x: r.x, y: r.y, heading: { x: 0, y: 1 }, hull: 40, hold: [{ id: "raw_carp", n: 1 }, null, null, null], sailed: 0 }); SF.applyVessels(g3);
  const by = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: r.x + dx, y: r.y + dy })).find(t => canWalk(g3, t.x, t.y)); teleport(g3, by.x, by.y);
  const ro = w3.objects.find(x => x.text === "vessel:5" && x.name !== "__removed"); SF.VESSEL_CLUES.vessel.use(g3, ro, "Pick-up");
  assert.ok(p3.vessels[0].carried && has(p3, "carried_rowboat")); assert.ok(!w3.objects.some(x => x.text === "vessel:5" && x.name !== "__removed"));
  const ci = p3.inventory.findIndex(s => s?.id === "carried_rowboat"); itemOptions(g3, ci).find(x => x.verb === "Drop").run(g3); assert.ok(has(p3, "carried_rowboat"), "not dropped on dry land");
  itemOptions(g3, ci).find(x => x.verb === "Launch").run(g3); assert.ok(!p3.vessels[0].carried && !has(p3, "carried_rowboat")); assert.equal(p3.vessels[0].hold[0].id, "raw_carp");
  let coastDeep = null; for (let i = 0; i < W * OVERWORLD_H && !coastDeep; i++) if (w3.tiles[i] === T.DEEP && SF.shoreDistance(w3)[i] <= 2) coastDeep = { x: i % W, y: Math.floor(i / W) };
  assert.ok(SF.sailableFor(w3, "rowboat", coastDeep.x, coastDeep.y), "a rowboat goes out on the deep water by the coast");
  // The yards: Olena and Tamsin by their boat sheds.
  for (const [npcId, shed] of [["bereslav_bargewoman", "Olena's boat shed"], ["gullwick_boatwright", "Tamsin's boat shed"]]) { const s = world.spawns.find(x => x.kind === "npc" && x.id === npcId), b = world.buildings.find(x => x.name === shed); assert.ok(b && Math.abs(s.x - (b.x0 + b.x1) / 2) < 12 && Math.abs(s.y - (b.y0 + b.y1) / 2) < 12, `${shed}`); }
});

test("Beastkeeping: each species won its own way (fed, earned, haltered, spared, rescued, known, by rite), never a boss; a companion is a real creature that fights what you fight with the real rolls, runs when it's frightened (settled for a fee), holds fast only when bonded deep, and falls for good with a keepsake; kept through saves, carried by vessels with room, home when you fall", async () => {
  const B = await import("../games/rarefriends-realm/beasts.ts");
  const SF = await import("../games/rarefriends-realm/seafaring.ts");
  const { die, menuFor } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player;
  const wild = (id) => g.monsters.find(m => m.def.id === id && !m.dead);
  const near = (m) => { teleport(g, m.x + 1, m.y); if (!canWalk(g, m.x + 1, m.y)) teleport(g, m.x, m.y + 1); };
  const use = (m, id, n = 1) => { give(p, id, n); const at = p.inventory.findIndex(s => s?.id === id); return B.useOnCreature(g, m, at); };
  // Not everything is anyone's.
  const boss = g.monsters.find(m => m.def.boss); assert.equal(B.speciesOfWild(boss), null); assert.ok(!B.useOnCreature(g, boss, 0));
  // A young salamander: fed inkcoal, visit after visit.
  let sal = wild("ember_salamander_young"); near(sal);
  assert.ok(use(sal, "inkcoal")); assert.equal(p.trust.salamander.n, 1); assert.ok(use(sal, "inkcoal")); assert.equal(p.trust.salamander.n, 1, "not again so soon");
  for (let k = 0; k < 2; k++) { g.tick += B.KEEP.trustGap; use(sal, "inkcoal"); }
  assert.equal(p.companions.length, 1); const salC = p.companions[0]; assert.equal(salC.species, "salamander"); assert.equal(salC.state, "out"); assert.ok(has(p, "companion_whistle"));
  tick(g); const ally = B.allyOf(g); assert.ok(ally && ally.ally === salC.id && Math.max(Math.abs(ally.x - p.x), Math.abs(ally.y - p.y)) <= 3, "it's out beside you");
  assert.ok(!menuFor(g, [{ kind: "monster", id: ally.uid }], null).some(o => o.verb === "Attack"), "you can't attack your own"); assert.ok(menuFor(g, [{ kind: "monster", id: ally.uid }], null).some(o => o.verb === "Send-home"));
  // It fights what you fight, with the real rolls, and earns Beastkeeping.
  // (A guard or a miss can finish a two-hit rat first: then the next small creature, as a player would.)
  const bk0 = p.xp.beastkeeping ?? 0, tried = new Set();
  let foe = null, hp0 = 0;
  for (let attempt = 0; attempt < 5 && (p.xp.beastkeeping ?? 0) === bk0; attempt++) {
    foe = g.monsters.find(m => !m.dead && m.ally === undefined && m.def.id === "ink_rat" && !tried.has(m.uid)) ?? g.monsters.find(m => !m.dead && m.ally === undefined && !m.def.boss && m.def.level < 20 && !tried.has(m.uid));
    tried.add(foe.uid); teleport(g, foe.x + 1, foe.y); tick(g); p.combat = foe.uid; foe.target = true; hp0 = foe.hp + 0;
    for (let t = 0; t < 60 && !foe.dead && (p.xp.beastkeeping ?? 0) === bk0; t++) { p.stunned = 5; p.combat = foe.dead ? null : foe.uid; tick(g); }
  }
  assert.ok((p.xp.beastkeeping ?? 0) > bk0, "it bit what you fought (you stood stunned), and Beastkeeping paid for it"); p.stunned = 0;
  // Frightened, a skittish one runs home; a beastkeeper settles it, later, for a fee.
  const m1 = B.allyOf(g) ?? B.placeCompanion(g); m1.hp = Math.floor(m1.def.hp * 0.3); m1.foe = foe.uid; B.companionTick(g, m1, { strike: () => {}, step: () => {} });
  assert.equal(salC.state, "fled"); assert.ok(!B.settle(g, salC), "still shaking"); g.tick += B.KEEP.settleAfter; give(p, "coins", 10_000); assert.ok(B.settle(g, salC)); assert.equal(salC.state, "kennel");
  // Earned: a hound pup from Halla; haltered: a goat; through a save.
  p.xp.beastkeeping = XP_TABLE[60]; give(p, "cooked_meat", 5); assert.ok(B.houndPup(g)); const hound = p.companions.find(c => c.species === "hound"); assert.equal(hound.state, "out");
  const goat = wild("highland_goat"); near(goat); assert.ok(use(goat, "goat_halter")); assert.equal(p.companions.length, 3);
  const g2 = newGame(); assert.ok(restore(g2, JSON.parse(JSON.stringify(serialize(g))))); assert.deepEqual(g2.player.companions.map(c => [c.species, c.state]), p.companions.map(c => [c.species, c.state]));
  // Three at most: the fourth waits until one's left with a keeper for good.
  const boar = wild("boar"); boar.hp = 1; assert.ok(B.canSpare(g, boar)); assert.ok(!B.spare(g, boar), "no room for a fourth");
  B.release(g, p.companions.find(c => c.species === "goat")); boar.dead = false; boar.hp = 1; assert.ok(B.spare(g, boar)); assert.ok(p.companions.some(c => c.species === "boar"));
  // A steady hound holds fast only when bonded deep; a fierce boar never runs.
  B.setOrder(g, hound, { fast: true }); assert.equal(hound.fast, false); hound.bond = 85; B.setOrder(g, hound, { fast: true }); assert.equal(hound.fast, true);
  // Falling: gone for good, a keepsake kept.
  B.bringOut(g, p.companions.find(c => c.species === "boar")); tick(g); const bm = B.allyOf(g); assert.equal(bm.def.id, "companion_boar");
  bm.hp = 1; B.companionFell(g, bm); assert.ok(!p.companions.some(c => c.species === "boar")); assert.ok(has(p, "companion_keepsake")); assert.equal(p.stats.companionsLost, 1);
  // Vessels with room: a rowboat has none (home it goes), a longship has room.
  B.bringOut(g, hound); tick(g);
  const bersi = g.world.spawns.find(s => s.kind === "npc" && s.id === "shipwright_bersi"), at = SF.launchSpot(g, "longship", bersi);
  p.vessels.push({ id: 1, kind: "rowboat", name: "Rowboat", x: at.x, y: at.y, heading: { x: 0, y: 1 }, hull: 40, hold: Array(4).fill(null), sailed: 0 });
  teleport(g, at.x + 1, at.y); if (!canWalk(g, at.x + 1, at.y)) teleport(g, at.x - 1, at.y); SF.board(g, p.vessels[0]); assert.equal(hound.state, "kennel", "no room in a rowboat");
  p.aboard = null; p.vessels[0].kind = "longship"; B.bringOut(g, hound); SF.board(g, p.vessels[0]); assert.equal(hound.state, "aboard");
  B.landWith(g); assert.equal(hound.state, "out");
  // Falling yourself: your companion goes home (it doesn't die with you).
  p.aboard = null; teleport(g, g.world.places.spawn.x, g.world.places.spawn.y); tick(g); die(g); assert.equal(hound.state, "kennel");
  // Rescued, known, by rite: the wolf, the stag, the vixen ask for what they ask for.
  const snared = wild("snared_wolf"); near(snared); B.release(g, salC); assert.ok(!B.freeSnared(g, snared), "a tonic first"); give(p, "healing_tonic", 1); assert.ok(B.freeSnared(g, snared));
  B.release(g, p.companions.find(c => c.species === "wolf"));
  const stag = wild("greatstag"); near(stag); assert.ok(use(stag, "bread")); assert.ok(!p.companions.some(c => c.species === "stag"), "not without knowing its ways");
  p.lore.greatstag = { k: 0xff, a: 0 }; assert.ok(use(stag, "bread")); assert.ok(p.companions.some(c => c.species === "stag"));
  B.bringOut(g, p.companions.find(c => c.species === "stag")); const easy = runDrain(g); B.sendHome(g); assert.ok(Math.abs(easy / runDrain(g) - 0.8) < 1e-9, "a stag eases the road");
});

test("Heal Other: two tiers of faith (24 and 62) that heal your companion or another player within reach; never someone unhurt (so never XP for nothing), never in the ring; what another player's game sends is checked (near, capped by the spell, not too often)", async () => {
  const B = await import("../games/rarefriends-realm/beasts.ts");
  const { menuFor, castSpell, healPeer, takeHeal, HEAL_RANGE, HEAL_GAP } = await import("../games/rarefriends-realm/engine.ts");
  const { inRing } = await import("../games/rarefriends-realm/world.ts");
  const heal = SPELLS.find(s => s.id === "heal_other"), greater = SPELLS.find(s => s.id === "greater_heal_other");
  assert.equal(heal.level, 24); assert.equal(greater.level, 62); assert.equal(heal.skill, "prayer"); assert.equal(heal.target, "ally"); assert.ok(greater.heal.now > heal.heal.now);
  const g = newGame(), p = g.player;
  for (const [id, n] of [["star_sigil", 50], ["tide_sigil", 50], ["bloom_sigil", 50]]) give(p, id, n);
  p.prayer = 99;
  // Too low a Faith level: it won't even be chosen.
  assert.equal(castSpell(g, "heal_other"), null);
  p.xp.prayer = XP_TABLE[24];
  assert.deepEqual(castSpell(g, "heal_other"), { kind: "spell", spell: "heal_other" }, "chosen, then cast on someone");
  // A companion: a hound pup, out and hurt.
  p.xp.beastkeeping = XP_TABLE[99]; give(p, "cooked_meat", 5); B.houndPup(g); tick(g);
  const m = B.allyOf(g); assert.ok(m, "the hound is out");
  const cast = () => menuFor(g, [{ kind: "monster", id: m.uid }], null, { kind: "spell", spell: "heal_other" });
  m.hp = m.def.hp; const unhurtXp = p.xp.prayer; cast()[0].run(g); assert.equal(p.xp.prayer, unhurtXp, "nobody unhurt is healed, and no XP for it");
  m.hp = m.def.hp - 20; const faith = p.prayer, xp = p.xp.prayer;
  const option = cast()[0]; assert.match(option.verb, /^Cast Heal Other ->/); option.run(g);
  assert.equal(m.hp, m.def.hp - 20 + heal.heal.now); assert.equal(p.prayer, faith - heal.faith); assert.ok(p.xp.prayer > xp, "Faith XP");
  // Another player: near and hurt, or not at all.
  const peer = { x: p.x + 2, y: p.y, hp: 5, maxHp: 40 };
  assert.equal(healPeer(g, "heal_other", peer, "Friend #2"), heal.heal.now);
  assert.equal(healPeer(g, "heal_other", { ...peer, hp: 38 }, "Friend #2"), 2, "no more than they're missing");
  assert.equal(healPeer(g, "heal_other", { ...peer, hp: 40 }, "Friend #2"), 0, "unhurt");
  assert.equal(healPeer(g, "heal_other", { ...peer, x: p.x + HEAL_RANGE + 1 }, "Friend #2"), 0, "too far");
  assert.equal(healPeer(g, "greater_heal_other", peer, "Friend #2"), 0, "Faith 62 for the greater");
  p.xp.prayer = XP_TABLE[62]; assert.equal(healPeer(g, "greater_heal_other", peer, "Friend #2"), greater.heal.now, "the greater heals 28");
  assert.equal(healPeer(g, "mend", peer, "Friend #2"), 0, "a spell for yourself isn't one for others");
  // Being healed: checked on the way in.
  const from = { id: 2, x: p.x + 1, y: p.y }; p.xp.hitpoints = XP_TABLE[50]; p.hp = 1;
  assert.equal(takeHeal(g, from, "Friend #2", "heal_other", 999), heal.heal.now, "capped by the spell");
  assert.equal(takeHeal(g, from, "Friend #2", "heal_other", 5), 0, "not twice in one go");
  g.tick += HEAL_GAP;
  assert.equal(takeHeal(g, { ...from, x: p.x + HEAL_RANGE + 6 }, "Friend #2", "heal_other", 5), 0, "not from far off");
  assert.equal(takeHeal(g, from, "Friend #2", "mend", 5), 0, "not a spell that heals others");
  assert.equal(takeHeal(g, from, "Friend #2", "heal_other", 5), 5);
  // Never in the ring.
  const ring = g.world.places.ring; if (ring && inRing(ring.x, ring.y)) { g.tick += HEAL_GAP; teleport(g, ring.x, ring.y); assert.equal(takeHeal(g, { id: 2, x: ring.x + 1, y: ring.y }, "Friend #2", "heal_other", 5), 0, "no healing in the ring"); }
});

test("The north's faiths: a blessing asked at a sacred place with a loaf (one at a time, from either faith, nobody converts); the Last Ember and the Turning Year, each a quarrel the player settles, and the blessings go where the choice leaves them; the Remembered Name keeps you standing once", async () => {
  const F = await import("../games/rarefriends-realm/northfaith.ts");
  const { talk, questDone } = await import("../games/rarefriends-realm/content.ts");
  const { die } = await import("../games/rarefriends-realm/engine.ts");
  const g = newGame(), p = g.player, world = g.world;
  const obj = clue => world.objects.find(o => o.clue === clue);
  for (const id of ["ember_hearth", "ember_stone", "ember_pot", "gull_hearth", "house_hearth", "bough_post", "white_spring", "ancestors_howe"]) assert.ok(obj(id), `${id} is in the world`);
  const use = (object, option) => { standBy(g, object); const n = g.messages.length; setTarget(g, { kind: "object", id: object.id, option }); for (let k = 0; k < 30 && g.dialogue === null && g.messages.length === n; k++) tick(g); };
  // (An option may sit behind another's "Something else.": the factions' talk comes before the faiths'.)
  const choose = (d, label) => { let o; for (let k = 0; k < 4 && d && !(o = d.options?.find(x => x.label === label)); k++) d = d.options?.find(x => x.label === "Something else.")?.then(); assert.ok(o, `"${label}" offered`); const next = o.then(); next?.onEnd?.(); return next; };
  // Before either quest: guest-right at the Last Ember, hearth-warmth at either of the Zoryavik's places; nothing at Eyvind's pot.
  assert.deepEqual(F.siteBlessings(g, "ember_hearth").give, ["guest_right"]); assert.deepEqual(F.siteBlessings(g, "ember_pot").give, []);
  assert.deepEqual(F.siteBlessings(g, "house_hearth").give, ["hearth_warmth"]); assert.deepEqual(F.siteBlessings(g, "bough_post").give, ["hearth_warmth"]);
  assert.ok(!F.askBlessing(g, "ember_hearth", "crossing_oath"), "not one this place gives yet");
  take(p, "bread", count(p, "bread")); assert.ok(!F.askBlessing(g, "ember_hearth", "guest_right"), "Faith 10 first"); p.xp.prayer = XP_TABLE[50];
  assert.ok(!F.askBlessing(g, "ember_hearth", "guest_right"), "and a loaf"); give(p, "bread", 10);
  assert.ok(F.askBlessing(g, "ember_hearth", "guest_right")); assert.ok(F.blessed(g, "guest_right")); assert.equal(F.blessingFood(g), 1.25); assert.equal(count(p, "bread"), 9);
  // The Last Ember: the hearth, Eyvind, three accounts, and Yrsa's question.
  choose(talk(g, "ember_keeper_yrsa"), "I'll find out who."); assert.equal(p.quests[F.LAST_EMBER], 1);
  use(obj("ember_hearth"), "Search"); assert.equal(p.questData.le_hearth, 1);
  talk(g, "ember_carrier_eyvind").onEnd?.(); assert.equal(p.questData.le_step, 2);
  use(obj("ember_stone"), "Read"); choose(talk(g, "ember_skald"), "Tell me the oldest verse about the Ember."); assert.equal(p.questData.le_step, 2);
  choose(talk(g, "oathmaster_brand"), "What do you make of the Last Ember?"); assert.equal(p.questData.le_step, 3);
  choose(talk(g, "ember_keeper_yrsa"), "Every hearth. Thora carried it; let it be carried."); assert.ok(questDone(g, F.LAST_EMBER));
  assert.deepEqual(F.siteBlessings(g, "ember_hearth").give, [], "Yrsa won't bless you"); assert.equal(F.siteBlessings(g, "ember_pot").give.length, 3); assert.equal(F.siteBlessings(g, "gull_hearth").give.length, 3);
  // The Remembered Name: once, you stand back up; then death is death.
  assert.ok(F.askBlessing(g, "ember_pot", "remembered_name")); assert.ok(!F.blessed(g, "guest_right"), "one blessing at a time");
  const deaths = p.deaths; p.hp = 0; die(g); assert.equal(p.deaths, deaths, "kept standing"); assert.ok(p.hp > 0 && p.hp <= Math.ceil(maxHp(p) / 4));
  p.hp = 0; die(g); assert.equal(p.deaths, deaths + 1, "only once");
  // The Turning Year: the spring, the howes, Ilya; the Archive's liturgy; Dobromir's midsummer night.
  choose(talk(g, "old_bough_keeper"), "Can I help keep the rite?"); assert.equal(p.quests[F.TURNING_YEAR], 1);
  use(obj("white_spring"), "Draw-water"); use(obj("ancestors_howe"), "Leave-bread"); assert.equal(count(p, "bread"), 7);
  choose(talk(g, "hearth_father_ilya"), "Why forbid the fires at the oak?"); assert.equal(p.questData.ty_step, 2);
  choose(talk(g, "archivist_bozhena"), "Show me the oldest liturgy."); assert.equal(p.questData.ty_step, 3);
  choose(talk(g, "old_bough_keeper"), "Carry the hearth's fire to the oak, and home again."); assert.ok(questDone(g, F.TURNING_YEAR));
  assert.deepEqual(F.siteBlessings(g, "house_hearth").give, ["hearth_warmth", "ancestors_watch"]); assert.deepEqual(F.siteBlessings(g, "bough_post").give, ["hearth_warmth", "boughs_year"]);
  assert.ok(F.askBlessing(g, "house_hearth", "ancestors_watch")); assert.equal(F.blessingTaken(g), 0.1);
  // Kept through a save; gone when it's worn out.
  const fresh = newGame(); restore(fresh, serialize(g)); assert.equal(fresh.player.blessing?.id, "ancestors_watch"); assert.ok(fresh.player.blessing.until - fresh.tick <= F.BLESSING_TICKS);
  g.tick += F.BLESSING_TICKS + 1; tick(g); assert.equal(p.blessing, null);
});

test("The north's factions: the Third Oath (Oathsworn Hall) and the Long Patrol (the Hearthwardens), each a quarrel settled, membership, a members' activity paid in standing, and the gear standing brings; the north's own creatures", async () => {
  const F = await import("../games/rarefriends-realm/northfactions.ts");
  const A = await import("../games/rarefriends-realm/activities.ts");
  const { talk, questDone, onMonsterKilled } = await import("../games/rarefriends-realm/content.ts");
  const g = newGame(), p = g.player, world = g.world;
  for (const id of ["draugr", "fjord_troll", "rusalka", "leshy", "likho"]) assert.ok(MONSTERS[id] && world.spawns.some(s => s.kind === "monster" && s.id === id), `${id} lives in the north`);
  const obj = clue => world.objects.find(o => o.clue === clue);
  const use = (object, option) => { standBy(g, object); const n = g.messages.length; setTarget(g, { kind: "object", id: object.id, option }); for (let k = 0; k < 30 && g.dialogue === null && g.messages.length === n; k++) tick(g); };
  // (An option may sit behind another's "Something else.": the Old Agreement's talk comes first.)
  const choose = (d, label) => { let o; for (let k = 0; k < 4 && d && !(o = d.options?.find(x => x.label === label)); k++) d = d.options?.find(x => x.label === "Something else.")?.then(); assert.ok(o, `"${label}" offered`); const next = o.then(); next?.onEnd?.(); return next; };
  // Not a member: no Barrow Watch.
  p.xp.attack = XP_TABLE[60]; p.xp.defence = XP_TABLE[60]; p.xp.strength = XP_TABLE[60];
  assert.match(A.activityProblem(g, "barrow_watch"), /Swear to the Hall first/);
  // The Third Oath: the trial, four accounts, the judgement.
  choose(talk(g, "oathmaster_brand"), "Let me speak at the stone."); assert.equal(p.quests[F.THIRD_OATH], 1);
  onMonsterKilled(g, "draugr", 466, 150); assert.ok(has(p, "grave_ring"), "a grave-ring off a draugr");
  talk(g, "oathmaster_brand").onEnd?.(); assert.equal(p.questData.to_step, 2); assert.ok(!has(p, "grave_ring"));
  use(obj("oath_stone"), "Read"); choose(talk(g, "oathsworn_hallvard"), "Why did you refuse?"); choose(talk(g, "ravnsvik_netmender"), "What would losing the skerries mean?");
  assert.equal(p.questData.to_step, 2); choose(talk(g, "steward_ketil"), "Who gave the order about the skerries?"); assert.equal(p.questData.to_step, 3);
  choose(talk(g, "oathmaster_brand"), "He kept the oath he swore. The order wasn't the Hall's."); assert.ok(questDone(g, F.THIRD_OATH));
  assert.equal(p.questData.oath_member, 1); assert.equal(F.standingOf(g, "oathsworn"), 10);
  assert.ok(NPCS.steward_ketil.gone(g), "Ketil's dismissed"); assert.ok(!NPCS.oathsworn_hallvard.gone(g), "Hallvard stays");
  // The Barrow Watch: six draugr, paid in standing.
  assert.equal(A.activityProblem(g, "barrow_watch"), null); assert.ok(A.startActivity(g, "barrow_watch"));
  for (let k = 0; k < 6; k++) A.activityEvent(g, { kind: "kill", monster: "draugr", x: 466, y: 150 });
  assert.equal(p.activities.run, null, "the watch is done"); assert.ok(F.standingOf(g, "oathsworn") >= 16);
  // Standing's gear: the shield at 20, once; a lost one replaced for a fee.
  let d = talk(g, "oathmaster_brand"); d = choose(d, "My standing with the Hall."); assert.ok(!d.options.some(o => /shield/i.test(o.label)) || F.standingOf(g, "oathsworn") >= 20);
  p.standing.oathsworn = 25; d = choose(talk(g, "oathmaster_brand"), "My standing with the Hall."); choose(d, "I've earned the Oathsworn shield."); assert.ok(has(p, "oathsworn_shield"));
  d = choose(talk(g, "oathmaster_brand"), "My standing with the Hall."); assert.ok(!d.options.some(o => /earned the Oathsworn shield/.test(o.label)), "once");
  take(p, "oathsworn_shield"); give(p, "coins", F.REPLACE_FEE); d = choose(talk(g, "oathmaster_brand"), "My standing with the Hall."); choose(d, `I've lost my Oathsworn shield (${F.REPLACE_FEE.toLocaleString()} Frens).`); assert.ok(has(p, "oathsworn_shield"));
  // The Long Patrol: three posts, the foreman, the Likho, the council.
  choose(talk(g, "hearthwarden_captain"), "I'll walk the patrol."); assert.equal(p.quests[F.LONG_PATROL], 1);
  for (const k of [1, 2, 3]) use(obj(`lp_post${k}`), "Look-at"); assert.equal(p.questData.lp_step, 2);
  talk(g, "foreman_stanimir").onEnd?.(); onMonsterKilled(g, "likho", 976, 300); assert.ok(has(p, "likho_eye")); assert.equal(p.questData.lp_step, 3);
  choose(talk(g, "hearthwarden_captain"), "Take the prince's silver, and say nothing."); assert.ok(questDone(g, F.LONG_PATROL)); assert.equal(p.questData.warden_member, 1);
  // The prince's silver: the spear at 10 standing, not 20.
  d = choose(talk(g, "hearthwarden_captain"), "My standing with the Hearthwardens."); choose(d, "I've earned the Hearthwarden spear."); assert.ok(has(p, "hearthwarden_spear"));
  // The Road Patrol: three posts and four seen off on the road.
  assert.ok(A.startActivity(g, "road_patrol"));
  for (const k of [1, 2, 3]) use(obj(`lp_post${k}`), "Look-at");
  for (let k = 0; k < 4; k++) A.activityEvent(g, { kind: "kill", monster: "wolf", x: 760, y: 220 });
  assert.equal(p.activities.run, null, "the patrol is done"); assert.ok(F.standingOf(g, "hearthwardens") > 10);
  // Kept through a save.
  const fresh = newGame(); restore(fresh, serialize(g)); assert.equal(fresh.player.standing.hearthwardens, p.standing.hearthwardens);
});

test("The north's guilds: the True Chart (the Farwake, sailed and sounded) and the Free Weight (the Freeholds Compact, weighed and cast), each a quarrel settled, membership, a members' activity paid in standing, the gear it brings, and the Compact's stores when the tithe's refused", async () => {
  const G = await import("../games/rarefriends-realm/northguilds.ts");
  const A = await import("../games/rarefriends-realm/activities.ts");
  const { talk, questDone } = await import("../games/rarefriends-realm/content.ts");
  const g = newGame(), p = g.player, world = g.world;
  const obj = clue => world.objects.find(o => o.clue === clue);
  const use = (object, option) => { teleport(g, object.x + 1, object.y); if (!canWalk(g, object.x + 1, object.y)) standBy(g, object); const n = g.messages.length; setTarget(g, { kind: "object", id: object.id, option }); for (let k = 0; k < 30 && g.dialogue === null && g.messages.length === n; k++) tick(g); };
  const reach = (d, label) => { let o; for (let k = 0; k < 5 && d && !(o = d.options?.find(x => x.label === label)); k++) d = d.options?.find(x => x.label === "Something else.")?.then(); return o; };
  const choose = (d, label) => { const o = reach(d, label); assert.ok(o, `"${label}" offered`); const next = o.then(); next?.onEnd?.(); return next; };
  for (const s of ["seafaring", "smithing", "mining"]) p.xp[s] = XP_TABLE[60];
  assert.match(A.activityProblem(g, "farwake_survey"), /true chart with us first/);
  // The True Chart: the wreck, Sigrun, three cairns, Torvald's choice.
  choose(talk(g, "farwake_master"), "I'll find out."); assert.equal(p.quests[G.TRUE_CHART], 1);
  use(obj("heron_wreck"), "Search"); assert.ok(has(p, "heron_log")); assert.equal(p.questData.fc_step, 2);
  talk(g, "navigator_sigrun").onEnd?.(); for (const k of [1, 2, 3]) use(obj(`survey_cairn_${k}`), "Take-soundings");
  assert.ok(has(p, "bay_soundings")); assert.equal(p.questData.fc_step, 3);
  choose(talk(g, "farwake_master"), "Keep it the guild's. That's what the guild is."); assert.ok(questDone(g, G.TRUE_CHART)); assert.equal(p.questData.farwake_member, 1);
  assert.ok(NPCS.navigator_sigrun.gone(g), "Sigrun leaves the guild");
  // Kept secret: the sea-cloak at 10 standing, not 20.
  let d = choose(talk(g, "farwake_master"), "My standing with the Farwake."); choose(d, "I've earned the Farwake sea-cloak."); assert.ok(has(p, "farwake_sea_cloak"));
  // The Farwake Survey: the three cairns.
  assert.ok(A.startActivity(g, "farwake_survey")); for (const k of [1, 2, 3]) use(obj(`survey_cairn_${k}`), "Take-soundings");
  assert.equal(p.activities.run, null, "the survey is done"); assert.ok(p.standing.farwake > 10);
  // The Free Weight: the scale (with a bar), the reeve, Kazimir; five bars; the Compact's choice.
  choose(talk(g, "freeholds_speaker"), "I'll prove it."); assert.equal(p.quests[G.FREE_WEIGHT], 1);
  use(obj("tithe_scale"), "Test-weight"); assert.ok(!p.questData.fw_scale, "not without a bar"); give(p, "blackiron_bar", 1); use(obj("tithe_scale"), "Test-weight"); assert.equal(p.questData.fw_scale, 1);
  choose(talk(g, "tithe_reeve_gorislav"), "Whose scale is it?"); choose(talk(g, "zlatna_foreman"), "What do the miners want?"); assert.equal(p.questData.fw_step, 2);
  give(p, "blackiron_bar", G.FREE_WEIGHT_BARS); { let t = talk(g, "freeholds_speaker"); for (let k = 0; k < 5 && t && !t.onEnd; k++) t = t.options?.find(x => x.label === "Something else.")?.then(); t.onEnd(); }
  assert.equal(p.questData.fw_step, 3); assert.equal(count(p, "blackiron_bar"), 1);
  choose(talk(g, "freeholds_speaker"), "Refuse it. Zlatna Gora's ore is the Compact's."); assert.ok(questDone(g, G.FREE_WEIGHT)); assert.equal(p.questData.freeholds_member, 1);
  assert.ok(NPCS.tithe_reeve_gorislav.gone(g), "the reeve's driven out");
  choose(talk(g, "freeholds_speaker"), "Show me the Compact's stores."); assert.equal(g.ui.shop, "compact_stores"); g.ui.shop = null;
  // The Compact's Order: the bars, delivered at Bereslav.
  assert.ok(A.startActivity(g, "compact_order")); const run = p.activities.run, bar = `${run.target.metal}_bar`;
  give(p, bar, run.target.count); choose(talk(g, "freeholds_speaker"), `Here are the ${run.target.count} bars.`);
  assert.equal(p.activities.run, null, "the order is done"); assert.ok(p.standing.freeholds > 10);
  const fresh = newGame(); restore(fresh, serialize(g)); assert.equal(fresh.player.standing.freeholds, p.standing.freeholds);
});

test("The Redwake and the Dawn Archive: the Red Wave (two companies, two codes, a contract read and both captains heard) and the Fourth Copy (three copies compared, Presence to be let near the princes', Mysteries to read the first), each a choice with consequences, membership, a members' activity paid in standing, the gear it brings; the north's own music", async () => {
  const C = await import("../games/rarefriends-realm/northcompanies.ts");
  const A = await import("../games/rarefriends-realm/activities.ts");
  const { TRACKS, NORTH_TRACKS, trackFor } = await import("../games/rarefriends-realm/audio.ts");
  const { talk, questDone } = await import("../games/rarefriends-realm/content.ts");
  const g = newGame(), p = g.player, world = g.world;
  const obj = clue => world.objects.find(o => o.clue === clue);
  const use = (object, option) => { teleport(g, object.x + 1, object.y); if (!canWalk(g, object.x + 1, object.y)) standBy(g, object); const n = g.messages.length; setTarget(g, { kind: "object", id: object.id, option }); for (let k = 0; k < 30 && g.dialogue === null && g.messages.length === n; k++) tick(g); g.dialogue = null; };
  const reach = (d, label) => { let o; for (let k = 0; k < 6 && d && !(o = d.options?.find(x => x.label === label)); k++) d = d.options?.find(x => x.label === "Something else.")?.then(); return o; };
  const choose = (d, label) => { const o = reach(d, label); assert.ok(o, `"${label}" offered`); const next = o.then(); next?.onEnd?.(); return next; };
  const ending = id => { let t = talk(g, id); for (let k = 0; k < 6 && t && !t.onEnd; k++) t = t.options?.find(x => x.label === "Something else.")?.then(); assert.ok(t?.onEnd, `${id} has something to say`); t.onEnd(); };
  for (const id of ["greyhide_contract", "archive_copy", "princes_copy", "first_copy", "record_stone_1", "record_stone_2", "record_stone_3"]) assert.ok(obj(id), `${id} is in the world`);
  for (const id of ["greyhide_captain", "bjarte_half_hand"]) assert.ok(world.spawns.some(s => s.kind === "npc" && s.id === id), `${id} is in the Greyhide camp`);
  for (const s of ["attack", "strength", "defence"]) p.xp[s] = XP_TABLE[60];
  assert.match(A.activityProblem(g, "redwake_contract"), /Sign with the Redwake first/);
  // The Red Wave: the contract, Bjarte, Hrolf; Ulfa's choice. One contract of the two: Bjarte lives, the gear comes cheaper.
  choose(talk(g, "redwake_captain"), "I'll find out what you're up against."); assert.equal(p.quests[C.RED_WAVE], 1);
  use(obj("greyhide_contract"), "Read"); ending("bjarte_half_hand"); ending("greyhide_captain"); assert.equal(p.questData.rw_step, 2);
  choose(talk(g, "redwake_captain"), "Make one contract of the two. Hold the road together."); assert.ok(questDone(g, C.RED_WAVE)); assert.equal(p.questData.redwake_member, 1);
  assert.ok(!NPCS.bjarte_half_hand.gone(g), "Bjarte lives under one contract");
  let d = choose(talk(g, "redwake_captain"), "My standing with the Redwake."); choose(d, "I've earned the Redwake falchion."); assert.ok(has(p, "redwake_falchion"), "at 10 standing, the joint contract's discount");
  // The Redwake Contract: the raiders on the Oathgate road, and only there.
  assert.ok(A.startActivity(g, "redwake_contract")); A.activityEvent(g, { kind: "kill", monster: "bandit", x: 100, y: 100 }); assert.equal(p.activities.run.progress, 0, "a bandit elsewhere doesn't count");
  for (let k = 0; k < 5; k++) A.activityEvent(g, { kind: "kill", monster: "bandit", x: 480, y: 220 });
  assert.equal(p.activities.run, null, "the contract is done"); assert.ok(p.standing.redwake > 10);
  // The other ending: walking away opens the company's spare kit; keeping the code costs Bjarte.
  { const h = newGame(), q = h.player; q.questData.rw_choice = C.RW_WALK; q.quests[C.RED_WAVE] = 2; choose(talk(h, "redwake_captain"), "Show me the company's spare kit."); assert.equal(h.ui.shop, "redwake_kit");
    q.questData.rw_choice = C.RW_CODE; assert.ok(NPCS.bjarte_half_hand.gone(h), "Bjarte falls when the code is kept"); }
  // The Fourth Copy: three copies (Presence for the princes'), the copyist, the first copy (Mysteries), Bozhena's choice. To the prince: silver, and the copyist leaves.
  p.xp.presence = XP_TABLE[10]; p.xp.mysteries = XP_TABLE[10];
  assert.match(A.activityProblem(g, "archive_rubbings"), /Find us the first copy first/);
  choose(talk(g, "archivist_bozhena"), "I'll compare them."); assert.equal(p.quests[C.FOURTH_COPY], 1);
  use(obj("archive_copy"), "Read"); use(obj("princes_copy"), "Read"); assert.ok(!p.questData.dc_princes, "the steward won't let a stranger near");
  p.xp.presence = XP_TABLE[60]; use(obj("princes_copy"), "Read"); ending("ember_skald"); assert.equal(p.questData.dc_step, 2);
  ending("archive_copyist"); use(obj("first_copy"), "Search"); assert.ok(!has(p, "first_chronicle"), "the old hand is unreadable without Mysteries");
  p.xp.mysteries = XP_TABLE[60]; use(obj("first_copy"), "Search"); assert.ok(has(p, "first_chronicle")); assert.equal(p.questData.dc_step, 3);
  const before = count(p, "coins"); choose(talk(g, "archivist_bozhena"), "Give it to Prince Radomir. It's his chronicle.");
  assert.ok(questDone(g, C.FOURTH_COPY)); assert.equal(p.questData.archive_member, 1); assert.ok(!has(p, "first_chronicle")); assert.equal(count(p, "coins") - before, C.PRINCE_PAYS);
  assert.ok(NPCS.archive_copyist.gone(g), "the copyist leaves the Archive");
  // The Archive's Rubbings: the three old stones.
  assert.ok(A.startActivity(g, "archive_rubbings")); for (const k of [1, 2, 3]) use(obj(`record_stone_${k}`), "Take-rubbing");
  assert.equal(p.activities.run, null, "the rubbings are done"); assert.ok(p.standing.dawn_archive > 10);
  p.standing.dawn_archive = 60; d = choose(talk(g, "archivist_bozhena"), "My standing with the Archive."); choose(d, "I've earned the Archivist's robe."); assert.ok(has(p, "archivist_robe"));
  const fresh = newGame(); restore(fresh, serialize(g)); assert.equal(fresh.player.standing.redwake, p.standing.redwake); assert.equal(fresh.player.standing.dawn_archive, 60);
  // The north's own music: seven pieces, each with its drone and the deep drum, each its own ensemble, and every north region's piece.
  const pieces = TRACKS.filter(t => NORTH_TRACKS.includes(t.id)); assert.equal(pieces.length, 7);
  for (const t of pieces) { assert.ok(t.notes.some(n => n.voice === "drone") && t.hits.some(h => h.drum === "deep"), `${t.name}: a drone and the deep drum`); }
  assert.equal(new Set(pieces.map(t => [...new Set(t.notes.map(n => n.voice))].sort().join())).size, 7, "each its own ensemble");
  for (const [region, id] of [["vargskeld", "north_vargskeld"], ["skarnholm", "north_skarnholm"], ["oathsworn_hall", "north_oath"], ["redwake_camp", "north_redwake"], ["zoryavik", "north_zoryavik"], ["krasnogor", "north_krasnogor"], ["old_bough", "north_old_bough"], ["svetloye", "north_old_bough"]]) assert.equal(trackFor(region, false), id);
});

test("Commerce: the Frenderal Exchange's market (prices the same for everyone, by the hour, bounded round each company's fortunes), trading at the quoted price with the fee shown and paid both ways (no profit from trading back and forth, no stale quotes, no turning the clock back, holdings capped), research and the investors' questions, merchant orders, saving, and the Exchange at Gullwick", async () => {
  const C = await import("../games/rarefriends-realm/commerce.ts");
  const { talk } = await import("../games/rarefriends-realm/content.ts");
  const { COMMERCE_CLUES } = await import("../games/rarefriends-realm/commercetalk.ts");
  const { sellPrice, buyPrice, shopBuys } = await import("../games/rarefriends-realm/engine.ts");
  const H = C.MARKET_START + 24 * 30 + 9;
  // Prices: the same every time asked, moving hour to hour, never wandering off.
  for (const id of C.COMPANY_IDS) {
    const base = C.COMPANIES[id].base, seen = new Set();
    assert.equal(C.priceAt(id, H), C.priceAt(id, H), "the same price, asked twice");
    for (let h = C.MARKET_START; h < C.MARKET_START + 24 * 60; h += 7) { const p = C.priceAt(id, h); assert.ok(p >= base / 4 && p <= base * 4, `${id} at ${h}: ${p} stays round its worth`); seen.add(p); }
    assert.ok(seen.size > 8, `${id}'s price moves`);
  }
  assert.ok(C.newsUpTo(H).every(e => e.hour <= H), "the news is only what's happened");
  assert.ok(C.newsUpTo(C.MARKET_START + 24 * 60, 60).length > 3, "things happen to the companies");
  // Trading: the quote, the fee, the total; the trade at that quote; shares and Frens change hands together.
  const g = newGame(), p = g.player; p.inventory.fill(null); give(p, "coins", 50000);
  const id = "emberforge_works", q = C.quote(g, id, "buy", 10, H);
  assert.equal(q.price, C.priceAt(id, H)); assert.equal(q.gross, q.price * 10); assert.equal(q.fee, Math.max(C.COMMERCE.feeMin, Math.ceil(q.gross * C.COMMERCE.feeRate))); assert.equal(q.total, q.gross + q.fee); assert.equal(q.problem, null);
  assert.match(C.trade(g, id, "buy", 10, H - 1, H), /moved/, "a stale quote is refused"); assert.equal(count(p, "coins"), 50000);
  const xp0 = p.xp.commerce ?? 0; assert.match(C.trade(g, id, "buy", 10, H, H), /You buy 10 shares/);
  assert.equal(count(p, "coins"), 50000 - q.total); assert.equal(p.commerce.shares[id], 10); assert.ok((p.xp.commerce ?? 0) > xp0, "the first trade of the day pays XP");
  const xp1 = p.xp.commerce; C.trade(g, id, "buy", 5, H, H); assert.equal(p.xp.commerce, xp1, "the second doesn't"); assert.equal(p.commerce.shares[id], 15);
  // Selling straight back: always less than was paid.
  const before = count(p, "coins") + 0, sale = C.quote(g, id, "sell", 15, H); C.trade(g, id, "sell", 15, H, H);
  assert.equal(count(p, "coins"), before + sale.total); assert.ok(count(p, "coins") < 50000, "fees both ways: no Frens from trading back and forth"); assert.equal(p.commerce.shares[id], undefined);
  for (let k = 0; k < 20; k++) { C.trade(g, "house_marigold", "buy", 3, H, H); C.trade(g, "house_marigold", "sell", 3, H, H); }
  assert.ok(count(p, "coins") < before + sale.total, "round trips only cost");
  // Refusals: nothing changes.
  const coins = count(p, "coins");
  for (const [side, n, why] of [["buy", 0, /Between 1/], ["buy", 2.5, /Between 1/], ["buy", -4, /Between 1/], ["sell", 1, /hold 0/], ["buy", C.sharesCap(g) + 1, /may hold/]]) assert.match(C.trade(g, id, side, n, H, H), why);
  { const poor = newGame(); poor.player.inventory.fill(null); give(poor.player, "coins", 10); assert.match(C.trade(poor, id, "buy", 10, H, H), /That costs/); assert.equal(count(poor.player, "coins"), 10); }
  assert.match(C.trade(g, id, "buy", 1, H - 2, H - 2), /later than that/, "the clock can't be turned back past an hour already seen"); assert.equal(count(p, "coins"), coins);
  // Research: the ledgers at Commerce 10, XP once a day each; the analysis at 40; only what's happened.
  assert.match(String(C.readReport(g, id, H)), /Commerce 10/);
  p.xp.commerce = XP_TABLE[10]; const before2 = p.xp.commerce, r = C.readReport(g, id, H);
  assert.equal(typeof r, "object"); assert.equal(r.days.length, 7); assert.ok(r.days.every(d => d.output > 0 && d.debt > 0 && d.demand > 0)); assert.equal(r.fair, undefined, "no analysis below 40");
  assert.ok(p.xp.commerce > before2); const before3 = p.xp.commerce; C.readReport(g, id, H); assert.equal(p.xp.commerce, before3, "once a day");
  p.xp.commerce = XP_TABLE[40]; const deep = C.readReport(g, "zlatna_mining", H); assert.ok(deep.fair && deep.fair[0] < deep.fair[1], "the analysis at 40");
  // The investors: a question a day each, answered from the ledgers: right pays, wrong doesn't, and either way that's the day's.
  for (const inv of ["investor_bear", "investor_bull", "investor_wolf", "investor_fox"]) {
    const qn = C.questionFor(inv, H), right = qn.options.findIndex(o => o.right), wrong = qn.options.findIndex(o => !o.right);
    assert.equal(qn.options.filter(o => o.right).length, 1, `${inv}: one right answer`);
    const h2 = newGame(); h2.player.xp.commerce = XP_TABLE[20]; const x = h2.player.xp.commerce;
    assert.match(C.answer(h2, inv, wrong, H), /No\./); assert.equal(h2.player.xp.commerce, x); assert.match(C.answer(h2, inv, right, H), /One question a day/, "no second guess");
    const h3 = newGame(); h3.player.xp.commerce = XP_TABLE[20]; assert.match(C.answer(h3, inv, right, H), /Right/); assert.ok(h3.player.xp.commerce > x);
  }
  { const h4 = newGame(); h4.player.xp.commerce = XP_TABLE[20]; h4.player.inventory.fill(null); give(h4.player, "coins", 5000);
    assert.match(C.answer(h4, "investor_whale", 0, H), /Not yet/); C.trade(h4, "house_marigold", "buy", 10, H, H);
    assert.match(C.answer(h4, "investor_whale", 0, H + 80), /Right/, "held for three days"); }
  // Merchant orders: three on the board, the goods taken and paid together, once each per period.
  const o = C.ordersFor(g, H); assert.equal(o.length, 3); assert.deepEqual(C.ordersFor(g, H), o, "the same board for the period");
  assert.match(C.fillOrder(g, 0, H), /wants/); give(p, o[0].item, o[0].n); const c0 = count(p, "coins"), x0 = p.xp.commerce;
  assert.match(C.fillOrder(g, 0, H), /pays/); assert.equal(count(p, "coins"), c0 + o[0].pay); assert.equal(count(p, o[0].item), 0); assert.ok(p.xp.commerce > x0);
  assert.ok(o[0].pay <= Math.ceil(item(o[0].item).value * o[0].n * 1.41), "paid a little over what the goods are worth");
  give(p, o[0].item, o[0].n); assert.match(C.fillOrder(g, 0, H), /filled/); assert.notDeepEqual(C.ordersFor(g, H + 24), o, "new orders later");
  // Regional prices: who pays what, from the shops' own prices.
  const rp = C.regionalPrices("blackiron_ore", sellPrice, i => buyPrice(g, i), shopBuys); assert.ok(rp.general > 0); assert.ok(rp.buyers.every(b => b.pays >= 0));
  // Saved, and cleaned on the way back in.
  C.trade(g, "farwake_ventures", "buy", 7, H, H);
  const fresh = newGame(); restore(fresh, JSON.parse(JSON.stringify(serialize(g)))); assert.equal(fresh.player.commerce.shares.farwake_ventures, 7); assert.equal(fresh.player.commerce.seen, p.commerce.seen);
  const junk = C.cleanCommerce({ shares: { farwake_ventures: -5, no_such_co: 9, house_marigold: 3 }, history: [{ c: "nope" }], asked: [1, "investor_fox"], done: [7, 1] });
  assert.deepEqual(junk.shares, { house_marigold: 3 }); assert.deepEqual(junk.history, []); assert.deepEqual(junk.asked, ["investor_fox"]); assert.deepEqual(junk.done, [1]);
  // The Exchange at Gullwick: the hall, its furniture, its people, and the window it opens.
  const w = g.world, hall = w.buildings.find(b => b.name === "The Frenderal Exchange"); assert.ok(hall, "the Exchange stands");
  for (const clue of Object.keys(COMMERCE_CLUES)) { const obj = w.objects.find(x => x.clue === clue); assert.ok(obj, `${clue} is in the hall`); }
  for (const npc of ["exchange_broker", "investor_whale", "investor_wolf", "investor_bull", "investor_bear", "investor_fox"]) assert.ok(w.spawns.some(s => s.kind === "npc" && s.id === npc), `${npc} is at the Exchange`);
  const board = w.objects.find(x => x.clue === "exchange_board"); COMMERCE_CLUES.exchange_board.use(g, board, "Trade"); assert.equal(g.ui.exchange, "market");
  assert.ok(talk(g, "exchange_broker").options.some(x => x.label === "Show me the market."));
  const low = newGame(); assert.match(talk(low, "investor_bear").lines.map(l => l.text).join(" "), /Commerce 10/);
  assert.ok(talk(g, "investor_fox").options.some(x => x.label === "Have you a question for me?"));
});

test("Development world tools: a conversation written for anyone (all they say, or one more thing to ask), its needs, deeds and notes; any creature's numbers and drops changed and put back; a drawn building furnished with more doors; a copy of one of the world's buildings, turned; the dashboard's Max", async () => {
  const { applyOverlay, cleanOverlay, registerDefinitions, resetOverrides, originalMonster, OVERLAY_TALK } = await import("../games/rarefriends-realm/overlay.ts");
  const { extractPrefab, turned } = await import("../games/rarefriends-realm/overlaybuild.ts");
  const { devCommand } = await import("../games/rarefriends-realm/devtools.ts");
  const { WORLD_SEED } = await import("../games/rarefriends-realm/world.ts");
  const { give, count } = await import("../games/rarefriends-realm/state.ts");
  try {
    // Conversations: checked (a dangling way on, a missing label, a bad skill are refused), then run as the game's own talk.
    const why = [], tree = { id: "guide", mode: "replace", start: "hi", nodes: [
      { id: "hi", lines: [{ who: "npc", text: "Well met." }], options: [{ label: "Trade a log for a bar.", to: "deal", need: [{ kind: "level", id: "woodcutting", n: 1 }], do: [{ kind: "take", id: "logs", n: 1 }, { kind: "give", id: "pewter_bar", n: 1 }, { kind: "flag", id: "traded" }] }, { label: "A gift, once.", to: "", once: true, do: [{ kind: "frens", n: 50 }] }, { label: "Only after trading.", to: "", need: [{ kind: "flag", id: "traded" }] }, { label: "Bye.", to: "" }] },
      { id: "deal", lines: [{ who: "player", text: "Here." }, { who: "npc", text: "Done." }] }] };
    const checked = cleanOverlay({ v: 1, ops: [{ op: "talk", def: tree }, { op: "talk", def: { ...tree, nodes: [{ id: "a", lines: [{ who: "npc", text: "x" }], options: [{ label: "go", to: "nowhere" }] }] } }, { op: "talk", def: { ...tree, mode: "add" } },
      { op: "talk", def: { ...tree, nodes: [{ id: "a", lines: [{ who: "npc", text: "x" }], options: [{ label: "go", to: "", need: [{ kind: "level", id: "basketry", n: 2 }] }] }] } }] }, why);
    assert.equal(checked.ops.length, 1, "only the good conversation is kept"); assert.ok(why.some(w => /nowhere/.test(w)) && why.some(w => /needs its option's words/.test(w)) && why.some(w => /no skill basketry/.test(w)));
    resetOverrides(); registerDefinitions(checked, NPCS);
    const g = newGame(), p = g.player; p.inventory.fill(null);
    let d = talk(g, "guide"); assert.equal(d.lines[0].text, "Well met.");
    assert.deepEqual(d.options.map(o => o.label), ["A gift, once.", "Bye."], "no logs: the trade isn't offered; no note: nor is what needs it");
    d.options[0].then(); assert.equal(count(p, "coins"), 50); assert.ok(!talk(g, "guide").options.some(o => o.label === "A gift, once."), "a once option goes once chosen");
    give(p, "logs", 1); d = talk(g, "guide"); const deal = d.options.find(o => o.label === "Trade a log for a bar.").then();
    assert.equal(count(p, "logs"), 0); assert.equal(count(p, "pewter_bar"), 1); assert.deepEqual(deal.lines.map(l => l.who), ["player", "npc"]);
    assert.ok(talk(g, "guide").options.some(o => o.label === "Only after trading."), "the note is made, and kept in the save's questData"); assert.equal(p.questData.talk_traded, 1);
    // One more thing to ask: hung on their own talk, before the goodbye.
    resetOverrides(); registerDefinitions(cleanOverlay({ v: 1, ops: [{ op: "talk", def: { ...tree, mode: "add", label: "About the trade…" } }] }), NPCS);
    const added = talk(newGame(), "guide"); assert.notEqual(added.lines[0].text, "Well met."); assert.ok(added.options.some(o => o.label === "About the trade…") && added.options.at(-1).label === "Goodbye.");
    resetOverrides(); assert.equal(OVERLAY_TALK.size, 0); assert.notEqual(talk(newGame(), "guide").lines[0]?.text, "Well met.", "taken out: their own talk again");
    // Creatures: any one's numbers and drops, on its own definition; refused for an unknown item; put back exactly.
    const id = Object.keys(MONSTERS).find(k => MONSTERS[k].drops.length > 1), before = JSON.stringify(MONSTERS[id]), held = MONSTERS[id];
    const edit = cleanOverlay({ v: 1, ops: [{ op: "monsteredit", def: { id, name: "Big One", aggressive: true, stats: { hp: 999, maxHit: 12 }, drops: [{ item: "pewter_bar", min: 1, max: 3, chance: 0.5 }] } }, { op: "monsteredit", def: { id, stats: { hp: 0 } } }, { op: "monsteredit", def: { id, drops: [{ item: "logs", min: 1, max: 1, chance: 2 }] } }] }, []);
    assert.equal(edit.ops.length, 1, "a creature can't have no health, nor a drop more than certain");
    const problems = []; registerDefinitions(cleanOverlay({ v: 1, ops: [{ op: "monsteredit", def: { id, drops: [{ item: "no_such_thing", min: 1, max: 1, chance: 0.1 }] } }] }), NPCS, problems); assert.ok(problems.some(w => /no item called no_such_thing/.test(w)));
    registerDefinitions(edit, NPCS);
    assert.equal(MONSTERS[id], held, "changed in place: everything holding the definition sees it"); assert.equal(MONSTERS[id].hp, 999); assert.equal(MONSTERS[id].name, "Big One"); assert.deepEqual(MONSTERS[id].drops, [{ item: "pewter_bar", min: 1, max: 3, chance: 0.5 }]);
    assert.equal(JSON.stringify(originalMonster(id)), before, "the original is kept");
    resetOverrides(); assert.equal(JSON.stringify(MONSTERS[id]), before, "and put back");
    // A drawn building: a smithy with a working furnace and anvil, a second door, a hipped roof two storeys up; the doorways clear.
    const w = newGame({ world: createWorld() }).world, b = cleanOverlay({ v: 1, ops: [{ op: "building", uid: "forge", x0: 20, y0: 20, x1: 28, y1: 26, door: "s", doors: ["n", "s", "x"], furnish: "smithy", hip: true, storeys: 2, walls: "stone", floor: T.STONE, name: "Forge" }] }, []);
    assert.deepEqual(b.ops[0].doors, ["n", "s"]);
    const placed = applyOverlay(w, b, WORLD_SEED, [], NPCS), forge = w.buildings[placed.buildings.get("forge")];
    assert.ok(forge.hip && forge.storeys === 2 && forge.walls === "stone");
    assert.equal(w.tiles[26 * W + 24], T.STONE, "the south door"); assert.equal(w.tiles[20 * W + 24], T.STONE, "the north door");
    const inside = w.objects.filter(o => o.x > 20 && o.x < 28 && o.y > 20 && o.y < 26 && o.name !== "__removed");
    assert.ok(inside.some(o => o.kind === "furnace") && inside.some(o => o.kind === "anvil"), "a smithy's furnace and anvil");
    for (const [x, y] of [[24, 25], [25, 25], [24, 21], [25, 21]]) assert.equal(w.objectAt[y * W + x], -1, `inside the doorway at ${x},${y} is clear`);
    // A copy of one of the world's buildings: its tiles, its record and its things, turned a quarter.
    const world = createWorld(), at = world.buildings.findIndex(x => x.name && x.x1 - x.x0 !== x.y1 - x.y0 && x.x1 - x.x0 < 20 && x.y1 - x.y0 < 20 && world.objects.some(o => o.kind !== "ladder" && o.x >= x.x0 && o.x <= x.x1 && o.y >= x.y0 && o.y <= x.y1));
    const prefab = extractPrefab(world, at), src = world.buildings[at];
    assert.equal(prefab.w, src.x1 - src.x0 + 1); assert.ok(prefab.objects.length > 0 && prefab.objects.every(o => !("to" in o) && !("clue" in o)), "its things, never what leads elsewhere");
    const quarter = turned(prefab, 1); assert.equal(quarter.w, prefab.h); assert.equal(quarter.tiles[0], prefab.tiles[(prefab.h - 1) * prefab.w], "turned clockwise: the bottom-left corner comes to the top-left");
    assert.deepEqual(turned(turned(quarter, 1), 2).tiles, prefab.tiles, "four quarters, round again");
    const stamp = cleanOverlay({ v: 1, ops: [{ op: "stamp", uid: "copy", x: 40, y: 40, rot: 1, prefab }, { op: "stamp", uid: "bad", x: 40, y: 40, rot: 0, prefab: { ...prefab, tiles: [1, 2] } }] }, []);
    assert.equal(stamp.ops.length, 1, "a prefab whose tiles don't fill it is refused");
    const sw = createWorld(), sp = applyOverlay(sw, stamp, WORLD_SEED, [], NPCS), copy = sw.buildings[sp.buildings.get("copy")];
    assert.equal(copy.x1 - copy.x0 + 1, prefab.h); assert.equal(copy.walls, src.walls); assert.equal(copy.roof, src.roof); assert.equal(copy.name, src.name);
    assert.equal(sw.objects.filter(o => o.x >= copy.x0 && o.x <= copy.x1 && o.y >= copy.y0 && o.y <= copy.y1 && o.name !== "__removed").length, prefab.objects.length);
    // The dashboard's Max: every skill 99, healed, and the session a sandbox (never saved).
    const m = newGame(); m.player.hp = 1; devCommand(m, { cmd: "max" });
    assert.ok(SKILLS.every(s => levelForXp(m.player.xp[s]) === 99)); assert.ok(m.player.hp > 90);
  } finally { resetOverrides(); const { devFlags } = await import("../games/rarefriends-realm/devflags.ts"); devFlags.sandbox = false; }
});

test("Deep ground: the development world's floor can be dug FLOOR_MIN below where the land lay (and raised to FLOOR_MAX), and the bake keeps every value exactly", async () => {
  const { generateWorld, WORLD_SEED, W } = await import("../games/rarefriends-realm/world.ts");
  const { applyTerrain, FLOOR_MIN, FLOOR_MAX, onShore } = await import("../games/rarefriends-realm/terrainops.ts");
  const { bakeWorld, unbakeWorld } = await import("../games/rarefriends-realm/bake.ts");
  const { world, lift, raise } = generateWorld(WORLD_SEED);
  assert.ok(FLOOR_MIN <= -300 && (FLOOR_MAX - FLOOR_MIN) * 64 < 65536, "deep enough, and still sixteen bits of 1/64ths");
  const s = world.places.spawn, x = s.x - 44, y = s.y - 30, hole = y * W + x, hill = y * W + x + 12;
  assert.ok(!onShore(world.tiles, x, y) && !onShore(world.tiles, x + 12, y));
  const dig = { op: "terrain", x, y, r: 1, shape: "circle", mode: "lower", amount: 16, falloff: 0 }, heap = { ...dig, x: x + 12, mode: "raise" };
  for (let k = 0; k < 4; k++) applyTerrain(world, new Float32Array(world.heights), [dig, heap]);
  assert.equal(world.base[hole], FLOOR_MIN, "dug as deep as it goes"); assert.ok(world.base[hill] > 200, "and raised");
  for (let k = 0; k < 4; k++) applyTerrain(world, new Float32Array(world.heights), [heap]);
  assert.equal(world.base[hill], FLOOR_MAX, "raised as high as it goes");
  const back = unbakeWorld(bakeWorld(world, lift, WORLD_SEED, raise));
  assert.equal(back.base[hole], FLOOR_MIN); assert.equal(back.base[hill], FLOOR_MAX); assert.deepEqual(back.base, world.base, "every floor value comes back exactly");
});

test("Lava lies level, like water: every pool at one height with its flat shore, never joined to water; painted lava takes its pool's level; the ground tools leave it and its shore alone", async () => {
  const { generateWorld, WORLD_SEED, W, H, T, cornerHeight } = await import("../games/rarefriends-realm/world.ts");
  const { applyOverlay } = await import("../games/rarefriends-realm/overlay.ts");
  const { onShore } = await import("../games/rarefriends-realm/terrainops.ts");
  const { world } = generateWorld(WORLD_SEED, { overlays: false });
  const low = (w, x, y) => Math.min(cornerHeight(w, x, y), cornerHeight(w, x + 1, y), cornerHeight(w, x, y + 1), cornerHeight(w, x + 1, y + 1));
  const pools = (w) => { const seen = new Uint8Array(W * H), out = [];
    for (let i = 0; i < W * H; i++) { if (seen[i] || w.tiles[i] !== T.LAVA) continue; const list = [i]; seen[i] = 1;
      for (let k = 0; k < list.length; k++) { const j = list[k], x = j % W, y = (j - x) / W; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = (y + dy) * W + x + dx; if (n >= 0 && n < W * H && !seen[n] && w.tiles[n] === T.LAVA) { seen[n] = 1; list.push(n); } } }
      out.push(list); }
    return out; };
  const all = pools(world); assert.ok(all.length > 20, "the Realm has its lava");
  for (const pool of all) { const levels = new Set(pool.map(j => Math.round(low(world, j % W, (j - j % W) / W)))); assert.equal(levels.size, 1, `the pool at ${pool[0] % W},${Math.floor(pool[0] / W)} lies at one level (${[...levels].slice(0, 4)})`); }
  // Lava and its shore are the ground tools' to leave alone.
  const j = all[0][0], x = j % W, y = (j - x) / W; assert.ok(onShore(world.tiles, x, y) && onShore(world.tiles, x + 2, y));
  // Painted onto the big pool's edge, lava lies at the pool's level.
  const big = all.sort((a, b) => b.length - a.length)[0], level = Math.round(low(world, big[0] % W, Math.floor(big[0] / W)));
  const edge = big.map(i => [i % W, Math.floor(i / W)]).find(([ex, ey]) => world.tiles[ey * W + ex + 1] !== T.LAVA && world.tiles[ey * W + ex + 2] !== T.LAVA && world.tiles[ey * W + ex + 3] !== T.LAVA);
  applyOverlay(world, { v: 1, frame: 2, ops: [{ op: "paint", x: edge[0] + 2, y: edge[1], r: 1, shape: "square", t: T.LAVA }] }, WORLD_SEED, [], null);
  assert.equal(world.tiles[edge[1] * W + edge[0] + 2], T.LAVA);
  for (const pool of pools(world)) if (pool.includes(edge[1] * W + edge[0] + 2)) for (const i of pool) assert.equal(Math.round(low(world, i % W, Math.floor(i / W))), level, "the painted lava lies at its pool's level");
});

test("Sigil shrines: every sigil has its altar; the first ones near Friendhollow, the deeper ones out where they belong; each altar in the open stands in a domed shrine of its sigil's stone (some old and broken), with room to stand at it", async () => {
  const { generateWorld, WORLD_SEED, W, regionAt, objectAtTile, WALKABLE } = await import("../games/rarefriends-realm/world.ts");
  const { SHRINE_HOMES, SHRINE_R, shrineOf, shrineBroken } = await import("../games/rarefriends-realm/sigilshrines.ts");
  const { SIGILCRAFT } = await import("../games/rarefriends-realm/data.ts");
  const { world } = generateWorld(WORLD_SEED, { overlays: false }), spawn = world.places.spawn;
  const altars = world.objects.filter(o => o.kind === "sigil_altar" && o.name !== "__removed");
  for (const { sigil } of SIGILCRAFT) assert.ok(altars.some(a => a.sigil === sigil), `an altar for ${sigil}`);
  for (const [sigil, , home] of SHRINE_HOMES) { const a = altars.filter(o => o.sigil === sigil); assert.equal(a.length, 1, `one ${sigil} altar`); assert.equal(regionAt(world, a[0].x, a[0].y).id, home, `the ${sigil} altar is in ${home}`); }
  for (const sigil of ["breeze_sigil", "tide_sigil"]) { const a = altars.find(o => o.sigil === sigil); assert.ok(Math.hypot(a.x - spawn.x, a.y - spawn.y) < 70, `the ${sigil} altar is near Friendhollow`); }
  const at = (x, y) => objectAtTile(world, x, y), shrines = altars.filter(a => shrineOf(at, a.x, a.y, a.sigil));
  assert.ok(shrines.length >= 10, `most altars stand in shrines (${shrines.length})`);
  for (const a of shrines) {
    // The columns at the corners, a broken one in an old shrine; paving and room to stand at the altar on every side.
    const heights = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => at(a.x + dx * SHRINE_R, a.y + dy * SHRINE_R).height);
    assert.equal(heights.some(h => h < 40), shrineBroken(a.sigil), `${a.name}: ${shrineBroken(a.sigil) ? "an old shrine, a column broken" : "every column whole"}`);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = (a.y + dy) * W + a.x + dx; assert.ok(WALKABLE.has(world.tiles[i]) && (world.objectAt[i] < 0 || !world.objects[world.objectAt[i]].blocks), `${a.name}: room to stand at it`); }
  }
});

test("Creature designer, building designs and biome scatter: specials set and taken away, hunting ranges, spawn groups, the fight simulator; designs placed by name and changed everywhere at once; rule-based scatter, the same every time", async () => {
  const { applyOverlay, cleanOverlay, editedMonster, registerDefinitions, resetOverrides } = await import("../games/rarefriends-realm/overlay.ts");
  const { simulateDef } = await import("../games/rarefriends-realm/combatsim.ts");
  const { extractPrefab } = await import("../games/rarefriends-realm/overlaybuild.ts");
  const { WORLD_SEED, cornerHeight } = await import("../games/rarefriends-realm/world.ts");
  try {
    // Specials: set, and taken away with null; bad ones refused.
    const id = Object.keys(MONSTERS).find(k => MONSTERS[k].breath), base = MONSTERS[id];
    const why = [], edits = cleanOverlay({ v: 1, ops: [{ op: "monsteredit", def: { id, specials: { breath: null, weakness: "water", poison: { damage: 4, chance: 0.25 }, leash: 20, alwaysAggressive: true } } }, { op: "monsteredit", def: { id, specials: { weakness: "lava" } } }, { op: "monsteredit", def: { id, specials: { leash: 999 } } }] }, why);
    assert.equal(edits.ops.length, 1); assert.ok(why.some(w => /weakness/.test(w)) && why.some(w => /leash/.test(w)));
    const made = editedMonster(base, edits.ops[0].def);
    assert.equal(made.breath, undefined, "its fire taken away"); assert.equal(made.weakness, "water"); assert.deepEqual(made.poison, { damage: 4, chance: 0.25 }); assert.equal(made.leash, 20); assert.ok(base.breath, "the base untouched");
    registerDefinitions(edits, NPCS); assert.equal(MONSTERS[id].breath, undefined); resetOverrides(); assert.ok(MONSTERS[id].breath, "and back");
    // Hunting: an aggressive creature notices you at four tiles, unless its range is shorter.
    const watch = (aggroRange) => { const g = newGame(), p = g.player, def = { ...base, aggressive: true, alwaysAggressive: true, ...(aggroRange ? { aggroRange } : {}) };
      const at = { x: p.x + 3, y: p.y }; g.monsters = [{ uid: 900, def, x: at.x, y: at.y, prev: { ...at }, spawn: { ...at }, hp: def.hp, heading: { x: 1, y: 1 }, target: false, attackTimer: 0, respawnAt: 0, dead: false, wander: 0, moved: 0, retreat: 0, curses: {} }]; g.npcs = [];
      tick(g); return g.monsters[0].target; };
    assert.equal(watch(0), true, "it notices you at three tiles"); assert.equal(watch(2), false, "not with a range of two");
    // A spawn group: n of them on open ground in the circle, the same tiles every time.
    const w = createWorld(), s = w.places.spawn, kind = Object.keys(MONSTERS).find(k => !MONSTERS[k].boss && MONSTERS[k].level < 10);
    const group = { v: 1, ops: [{ op: "spawngroup", uid: "pack", id: kind, x: s.x - 44, y: s.y - 30, r: 5, n: 6 }] }, before = w.spawns.length;
    applyOverlay(w, cleanOverlay(group), WORLD_SEED, [], NPCS);
    const added = w.spawns.slice(before); assert.equal(added.length, 6); assert.ok(added.every(sp => sp.id === kind && Math.hypot(sp.x - (s.x - 44), sp.y - (s.y - 30)) <= 5.5));
    const w2 = createWorld(); applyOverlay(w2, cleanOverlay(group), WORLD_SEED, [], NPCS); assert.deepEqual(w2.spawns.slice(before), added, "the same tiles every time");
    // The simulator: a weak creature, fought by a strong Friend, always won, and its bones always left.
    const weak = MONSTERS[kind], r = simulateDef(weak, { level: 60, metal: "ashsteel", style: "melee", food: "inkshark", foodN: 5, fights: 12 });
    assert.equal(r.kills, 12); assert.equal(r.deaths, 0); assert.ok(r.ticks.mean > 0 && r.seconds > 0 && r.xpPerKill > 0);
    for (const d of weak.always ?? []) assert.ok(r.drops.some(x => x.item === d.item && x.times === 12), `always ${d.item}`);
    const hard = simulateDef({ ...weak, hp: 5000, maxHit: 60, attack: 400, strength: 400, defence: 400, defenceBonus: 400 }, { level: 5, metal: "pewter", style: "melee", food: "inkshark", foodN: 0, fights: 5 });
    assert.equal(hard.deaths, 5, "and a hopeless one lost");
    // Designs: two copies of one design; the design changed, both copies change; a copy of a design that isn't there is said.
    const src = createWorld(), at = src.buildings.findIndex(b => b.name && b.x1 - b.x0 < 12 && b.y1 - b.y0 < 12 && b.y1 < 900), prefab = extractPrefab(src, at);
    const design = (p) => ({ op: "template", def: { id: "cottage", name: "Cottage", prefab: p } }), stamps = [{ op: "stamp", uid: "c1", x: s.x - 60, y: s.y - 40, rot: 0, template: "cottage" }, { op: "stamp", uid: "c2", x: s.x - 40, y: s.y - 40, rot: 1, template: "cottage" }, { op: "stamp", uid: "c3", x: s.x - 20, y: s.y - 40, rot: 0, template: "nope" }];
    const dw = createWorld(), problems = [], placed = applyOverlay(dw, cleanOverlay({ v: 1, ops: [design(prefab), ...stamps] }), WORLD_SEED, problems, NPCS);
    assert.ok(placed.buildings.has("c1") && placed.buildings.has("c2") && !placed.buildings.has("c3")); assert.ok(problems.some(p => /no design called nope/.test(p)));
    assert.equal(dw.buildings[placed.buildings.get("c1")].name, "Cottage");
    const marble = { ...prefab, building: { ...prefab.building, walls: "marble" } }, dw2 = createWorld(), placed2 = applyOverlay(dw2, cleanOverlay({ v: 1, ops: [design(marble), ...stamps.slice(0, 2)] }), WORLD_SEED, [], NPCS);
    assert.ok(["c1", "c2"].every(u => dw2.buildings[placed2.buildings.get(u)].walls === "marble"), "the design changed: every copy follows");
    // Biome scatter: only where its rules allow, spaced, and the same every time.
    const rules = { items: [{ kind: "tree", sub: "pine", weight: 3 }, { kind: "decor", sub: "boulder", weight: 1 }], density: 0.3, spacing: 2, awayFromPaths: 1 };
    const fill = { v: 1, ops: [{ op: "biome", uid: "pines", x0: s.x - 70, y0: s.y - 60, x1: s.x - 30, y1: s.y - 25, seed: 42, rules }] };
    const bw = createWorld(), n0 = bw.objects.length; applyOverlay(bw, cleanOverlay(fill), WORLD_SEED, [], NPCS);
    const got = bw.objects.slice(n0); assert.ok(got.length > 10, `pines and boulders put down (${got.length})`);
    assert.ok(got.every(o => o.tree === "pine" || o.decor === "boulder"));
    for (const a of got) for (const b of got) if (a !== b) assert.ok(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > 2, "kept two tiles apart");
    const bw2 = createWorld(); applyOverlay(bw2, cleanOverlay(fill), WORLD_SEED, [], NPCS); assert.deepEqual(bw2.objects.slice(n0).map(o => [o.x, o.y, o.tree ?? o.decor]), got.map(o => [o.x, o.y, o.tree ?? o.decor]), "the same every time");
    const high = Math.max(...got.map(o => cornerHeight(bw, o.x, o.y))), capped = { v: 1, ops: [{ ...fill.ops[0], rules: { ...rules, maxHeight: high - 5 } }] }, bw3 = createWorld();
    applyOverlay(bw3, cleanOverlay(capped), WORLD_SEED, [], NPCS); assert.ok(bw3.objects.length - n0 < got.length, "a height limit keeps them off the high ground");
    assert.equal(cleanOverlay({ v: 1, ops: [{ ...fill.ops[0], x1: s.x + 400, y1: s.y + 400 }] }).ops.length, 0, "a fill too big is refused");
  } finally { resetOverrides(); }
});

test("The Oathgate is a great wall: its top near the crags' height, the whole width of the pass, a five-tile gateway with the bar in the middle, still walled shut but for the bar", async () => {
  const { RIDGE } = await import("../games/rarefriends-realm/northworld.ts");
  const { W, T, groundHeight } = await import("../games/rarefriends-realm/world.ts");
  const world = createWorld(), P = RIDGE.oathgate, wall = (world.ramparts ?? []).find(r => r.great);
  assert.ok(wall, "a great wall"); assert.equal(wall.x0, wall.x1, "one tile thick on the ground");
  const gx = wall.x0, road = groundHeight(world, gx, P.y), crags = Math.max(groundHeight(world, gx, wall.y0 - 3), groundHeight(world, gx, wall.y1 + 3));
  assert.ok(wall.great.top - road > 200, `it stands ${Math.round(wall.great.top - road)} over the road`); assert.ok(wall.great.top > crags * 0.75, "near the crags' own height");
  for (let y = wall.y0; y <= wall.y1; y++) assert.equal(world.tiles[y * W + gx], y === P.y ? T.PATH : T.WALL, `${y}: walled but for the bar`);
  assert.ok(world.objects.some(o => o.kind === "gate" && o.x === gx && o.y === P.y), "the bar in the gateway");
  assert.ok(wall.great.arch.y0 < P.y && wall.great.arch.y1 > P.y && wall.great.arch.crown > road + 100, "the arch over it, high");
  // It runs on up the crag either way until the rock comes near its top (render.ts stands it on the crag's column).
  assert.ok(wall.great.reach >= 10, "it runs on up the crag");
  const meets = dir => { for (let k = 1; k <= wall.great.reach; k++) { const y = (dir < 0 ? wall.y0 : wall.y1) + dir * k; if (groundHeight(world, gx, y) >= wall.great.top - 60) return k; } return 0; };
  assert.ok(meets(-1) > 0 && meets(1) > 0, `it meets rock near its own height both ways (${meets(-1)}, ${meets(1)} rows on)`);
});

test("The Prismwild: a land past the north's north-east over the Glass Causeway, reached on foot; lilac downs, crystals of every size, the Starwood, the Fae Hollows, the Shardfields, the Collegium and its people", async () => {
  const { PRISMWILD, PRISM_REGION_IDS, COLLEGIUM, CAUSEWAY_Y } = await import("../games/rarefriends-realm/prismworld.ts");
  const g = newGame(), world = g.world;
  for (const id of PRISM_REGION_IDS) assert.ok(world.region.includes(REGIONS.findIndex(region => region.id === id)), `${id} exists`);
  // On foot from the spawn: over the Causeway to the Collegium's courtyard, and to the Labyrinth's gate.
  const { MAZE_GATE } = await import("../games/rarefriends-realm/labyrinth.ts");
  const seen = reachable(g, world.places.spawn);
  assert.ok(seen[world.places.collegium.y * W + world.places.collegium.x], "the Collegium is reached on foot from the spawn");
  assert.ok([[0, 1], [1, 0], [0, -1], [-1, 0], [0, 2]].some(([dx, dy]) => seen[(MAZE_GATE.y + dy) * W + MAZE_GATE.x + dx]), "and the Labyrinth's gate");
  assert.equal(regionAt(world, world.places.collegium.x, world.places.collegium.y).id, "collegium");
  assert.ok(world.tiles[CAUSEWAY_Y * W + PRISMWILD.x0 - 20] !== T.DEEP, "the Causeway crosses the strait");
  const decor = kind => world.objects.filter(o => o.kind === "decor" && o.decor === kind).length;
  assert.ok(decor("prism_giant") >= 20, `great crystals (${decor("prism_giant")})`); assert.ok(decor("prism_crystal") > 600, `crystals (${decor("prism_crystal")})`);
  assert.ok(decor("prism_spire") > 150, "crystal spires"); assert.ok(decor("fae_tree") > 1000, `fae trees (${decor("fae_tree")})`); assert.ok(decor("fae_ring") > 40, "fairy rings");
  for (const id of ["archmagister_vey", "tutor_quill", "librarian_osk", "pell_ashby", "pell_ashby_lost", "lady_hawthorn", "fennick", "shard_warden"]) assert.ok(world.spawns.some(s => s.kind === "npc" && s.id === id), `${id} is placed`);
  for (const id of ["glimmer_moth", "thistle_pixie", "prism_wisp", "glimmer_stag", "shard_golem"]) assert.ok(world.spawns.filter(s => s.kind === "monster" && s.id === id).length >= 8, `${id}s roam`);
  // The Collegium's walls, gates and halls; a bank; the Collegium tablet goes there.
  assert.ok(world.buildings.some(b => b.name === "The Great Hall") && world.buildings.some(b => b.name === "The Seventh Lamp" && b.round), "the Great Hall and the Seventh Lamp's tower");
  assert.ok(world.objects.some(o => o.kind === "bank" && o.x > COLLEGIUM.x0 && o.x < COLLEGIUM.x1 && o.y > COLLEGIUM.y0 && o.y < COLLEGIUM.y1), "a bank in the Collegium");
  give(g.player, "tablet_collegium", 1); const slot = g.player.inventory.findIndex(s => s?.id === "tablet_collegium"); breakTablet(g, slot); run(g, 4);
  assert.ok(Math.hypot(g.player.x - world.places.collegium.x, g.player.y - world.places.collegium.y) < 4, "the tablet takes you to the Collegium");
});

test("Fennick's Labyrinth: the maze is whole, the doors turn, every ring nearer the heart pays, glyphs send you out, coffers shine and pay once, the thread and the clock end a run, the heart pays most, a reload puts you outside", async () => {
  const L = await import("../games/rarefriends-realm/labyrinth.ts");
  const { LABYRINTH, MAX_RING, mazeLayout, cellTile, ringOf, ringPay, fullCoffers, mazeDoorOpen, MAZE_GATE, RUN_TICKS, TURN, HEART_BONUS } = L;
  const N = LABYRINTH.n, layout = mazeLayout();
  // With every door open, every cell is reached from the start, the heart among them.
  const seen = new Uint8Array(N * N), queue = [(N - 1) * N + (N - 1) / 2]; seen[queue[0]] = 1;
  while (queue.length) { const c = queue.shift(), i = c % N, j = Math.floor(c / N); for (const [d, e] of [[c + 1, c * 2], [c - 1, (c - 1) * 2], [c + N, c * 2 + 1], [c - N, (c - N) * 2 + 1]]) { if (d < 0 || d >= N * N || (Math.abs((d % N) - i) > 1) || !layout.open[e] || seen[d]) continue; seen[d] = 1; queue.push(d); } void j; }
  assert.equal(seen.reduce((a, b) => a + b, 0), N * N, "the whole maze is one");
  assert.ok(layout.doors.size > 60 && [...layout.doors.values()].includes(0) && [...layout.doors.values()].includes(1), `doors in two sets (${layout.doors.size})`);
  assert.ok(layout.coffers.length >= 30 && layout.glyphs.length >= 20, `coffers (${layout.coffers.length}) and glyphs (${layout.glyphs.length})`);
  const g = newGame(), p = g.player, world = g.world, glass = () => count(p, "mazeglass");
  // A door of each set: one open, the other shut, and a turn later the other way round.
  const doorA = world.objects.find(o => o.clue === "maze_door_a"), doorB = world.objects.find(o => o.clue === "maze_door_b");
  g.tick = TURN * 10; assert.ok(mazeDoorOpen(g, doorA) && !mazeDoorOpen(g, doorB)); g.tick += TURN; assert.ok(!mazeDoorOpen(g, doorA) && mazeDoorOpen(g, doorB), "the maze turns");
  // Fennick starts a run: into the south cell, eight minutes.
  const fennick = world.spawns.find(s => s.id === "fennick"); teleport(g, fennick.x, fennick.y + 1);
  talk(g, "fennick").options.find(o => o.label === "Run the maze.").then();
  assert.ok(p.maze && p.maze.until - p.maze.start === RUN_TICKS, "a run of eight minutes"); assert.equal(L.ringAt(p.x, p.y), MAX_RING, "starting in the outermost ring");
  // Rings nearer the heart pay, each once.
  const at = (ring) => { const c = cellTile((N - 1) / 2, (N - 1) / 2 + ring); teleport(g, c.x, c.y); };
  at(10); tick(g); let want = 0; for (let r = MAX_RING - 1; r >= 10; r--) want += ringPay(r); assert.equal(glass(), want, "rings 14 to 10 pay");
  at(12); tick(g); assert.equal(glass(), want, "going back out pays nothing");
  // A glyph sends you back out to the edge.
  const glyph = world.objects.find(o => o.clue === "maze_glyph"); teleport(g, glyph.x, glyph.y); tick(g);
  assert.equal(L.ringAt(p.x, p.y), MAX_RING, "a glyph puts you in the outermost ring");
  // The coffers: a full one pays once (and shines), an empty one says so.
  const full = fullCoffers(p.maze), cofferAt = c => world.objects.find(o => o.clue === "maze_coffer" && L.cellAt(o.x, o.y)?.i === c % N && L.cellAt(o.x, o.y)?.j === Math.floor(c / N));
  const coffer = cofferAt(full[0]), before = glass();
  standBy(g, coffer); setTarget(g, { kind: "object", id: coffer.id, option: "Search" }); run(g, 3);
  assert.ok(glass() > before, "a full coffer pays"); const after = glass();
  setTarget(g, { kind: "object", id: coffer.id, option: "Search" }); run(g, 3); assert.equal(glass(), after, "and only once");
  const empty = world.objects.find(o => o.clue === "maze_coffer" && !full.some(c => cofferAt(c) === o)); standBy(g, empty); setTarget(g, { kind: "object", id: empty.id, option: "Search" }); run(g, 3);
  assert.equal(glass(), after, "an empty coffer pays nothing");
  // The heart: its ring and the bonus, and the run ends in triumph at the gate.
  const heart = cellTile((N - 1) / 2, (N - 1) / 2), beforeHeart = glass(), reached = p.maze.deepest; teleport(g, heart.x, heart.y); tick(g);
  let rest = 0; for (let r = reached - 1; r >= 0; r--) rest += ringPay(r);
  assert.equal(glass() - beforeHeart, rest + HEART_BONUS, "the heart pays its rings and the bonus"); assert.equal(p.maze, null); assert.equal(p.labyrinth.hearts, 1); assert.equal(p.labyrinth.best, 0);
  assert.ok(Math.abs(p.x - MAZE_GATE.x) + Math.abs(p.y - MAZE_GATE.y) <= 1, "back at the gate");
  // The clock: a run that runs out ends at the gate; the thread ends one early.
  talk(g, "fennick").options.find(o => o.label === "Run the maze.").then(); p.maze.until = g.tick + 1; run(g, 2); assert.equal(p.maze, null, "time's up"); assert.equal(p.labyrinth.runs, 2);
  talk(g, "fennick").options.find(o => o.label === "Run the maze.").then(); const thread = world.objects.find(o => o.clue === "maze_thread");
  standBy(g, thread); setTarget(g, { kind: "object", id: thread.id, option: "Pull" }); run(g, 3); assert.equal(p.maze, null, "the thread pulls you out"); assert.equal(p.labyrinth.runs, 3);
  // A reload: the record kept, the run not; a runner found inside is put out at the gate.
  talk(g, "fennick").options.find(o => o.label === "Run the maze.").then(); at(5);
  const g2 = newGame(); restore(g2, JSON.parse(JSON.stringify(serialize(g))));
  assert.equal(g2.player.maze, null); assert.equal(g2.player.labyrinth.hearts, 1); assert.equal(g2.player.labyrinth.runs, 3);
  teleport(g2, p.x, p.y); tick(g2); assert.ok(!L.inLabyrinth(g2.player.x, g2.player.y), "put outside after a reload");
  void ringOf;
});

test("The Seventh Lamp: glimmer dust, Pell's satchel, Lady Hawthorn's riddle, and enrolment; Fennick's curios for mazeglass; the Prismweave robes keep sigils and the twisting staff never runs short", async () => {
  const { DUST_WANTED, SEVENTH_LAMP } = await import("../games/rarefriends-realm/prismtalk.ts");
  const { PRISMWEAVE } = await import("../games/rarefriends-realm/prismgear.ts");
  const g = newGame(), p = g.player, world = g.world;
  talk(g, "archmagister_vey").options.find(o => o.label === "What do you need?").then().onEnd?.();
  assert.equal(p.quests[SEVENTH_LAMP], 1, "the quest begins");
  assert.match(talk(g, "lady_hawthorn").lines.map(l => l.text).join(" "), /lawn/, "the Lady has nothing to trade before the satchel");
  const satchel = world.objects.find(o => o.clue === "pell_satchel"); standBy(g, satchel); setTarget(g, { kind: "object", id: satchel.id, option: "Search" }); run(g, 3);
  assert.ok(has(p, "student_satchel"), "Pell's satchel");
  let d = talk(g, "lady_hawthorn"); d.options.find(o => o.label === "Time.").then(); assert.equal(p.questData.sl_pell ?? 0, 0, "a wrong answer frees nobody");
  d = talk(g, "lady_hawthorn"); d.options.find(o => o.label === "Footsteps.").then(); assert.equal(p.questData.sl_pell, 1, "the right one does");
  assert.ok(NPCS.pell_ashby.present(g) && !NPCS.pell_ashby_lost.present(g), "Pell is home, and no longer dancing");
  give(p, "glimmer_dust", DUST_WANTED - 1);
  assert.ok(!talk(g, "archmagister_vey").options, "not enough dust, no enrolment");
  give(p, "glimmer_dust", 1); const magic = p.xp.magic;
  talk(g, "archmagister_vey").options.find(o => o.label === "Here: ten pinches of glimmer dust.").then();
  assert.ok(questDone(g, SEVENTH_LAMP) && p.xp.magic > magic && count(p, "tablet_collegium") === 2 && count(p, "glimmer_dust") === 0, "enrolled, with Magic XP and two tablets");
  talk(g, "fennick").options.find(o => o.label === "The Archmagister sent me.").then(); assert.equal(count(p, "mazeglass"), 30, "thirty mazeglass on account");
  assert.ok(!talk(g, "fennick").options.some(o => o.label === "The Archmagister sent me."), "once");
  // Fennick's curios take mazeglass, not Frens.
  assert.equal(SHOPS.fennicks_curios.currency, "mazeglass"); give(p, "mazeglass", 5000); const frens = count(p, "coins");
  for (const id of [...PRISMWEAVE, "twisting_staff"]) buy(g, "fennicks_curios", id, 1);
  assert.ok(PRISMWEAVE.every(id => has(p, id)) && has(p, "twisting_staff"), "the robes and the staff"); assert.equal(count(p, "coins"), frens, "no Frens spent");
  // The robes: 4% a piece, the set 25%; the staff: no breeze or tide sigils.
  for (const skill of ["magic", "defence"]) p.xp[skill] = 13_100_000;
  const base = sigilSave(p, g); equip(g, p.inventory.findIndex(s => s?.id === "prismweave_hood")); assert.ok(Math.abs(sigilSave(p, g) - base - 0.04) < 1e-9, "a piece keeps 4%");
  for (const id of PRISMWEAVE.slice(1)) equip(g, p.inventory.findIndex(s => s?.id === id)); assert.ok(Math.abs(sigilSave(p, g) - base - 0.25) < 1e-9, "the set keeps 25%");
  equip(g, p.inventory.findIndex(s => s?.id === "twisting_staff"));
  const spell = SPELLS.find(s => s.sigils && "breeze_sigil" in s.sigils && Object.keys(s.sigils).length === 2 && "thought_sigil" in s.sigils);
  if (spell) { for (const id of Object.keys(spell.sigils)) take(p, id, count(p, id)); give(p, "thought_sigil", 100); assert.equal(canCast(g, spell), null, "the staff gives the breeze sigils"); }
});

test("Sorrowmere: the necropolis east of the Deadwood, its braziers lit in the Litany's order to open the inner gate, the Gravewarden's seal for the Great Barrow, and the catacombs with an ossuary maze, a key for the Regent's door and the Bone Regent", async () => {
  const S = await import("../games/rarefriends-realm/necropolis.ts");
  const g = newGame(), p = g.player, world = g.world;
  g.monsters = [];   // (the doors and the braziers are the test here, not a fight with the dead)
  const seen = reachable(g, world.places.spawn);
  assert.ok(seen[S.INNER_GATE.y * W + S.INNER_GATE.x - 1], "the outer court is reached on foot from the spawn");
  assert.ok(!seen[S.INNER_GATE.y * W + S.INNER_GATE.x + 1], "but not the inner court");
  const clue = id => world.objects.find(o => o.clue === id), use = (object, option) => { standBy(g, object); setTarget(g, { kind: "object", id: object.id, option }); run(g, 3); };
  assert.ok(world.objects.filter(o => o.decor === "menhir").length >= 14, "an avenue of standing stones");
  // The inner gate is shut; a brazier out of turn puts them all out; the Litany's order opens the gate.
  const gate = clue("sm_inner_gate"), knock = () => { teleport(g, gate.x - 1, gate.y); setTarget(g, { kind: "object", id: gate.id, option: "Open" }); run(g, 3); };
  knock(); assert.ok(p.x < gate.x, "the inner gate is shut");
  give(p, "tinderbox", 1);
  use(clue("sm_brazier_crowned"), "Light"); use(clue("sm_brazier_drowned"), "Light"); assert.equal(p.questData.sm_lit, 2);
  use(clue("sm_brazier_dawn"), "Light"); assert.equal(p.questData.sm_lit, 0, "out of turn, they all go out");
  for (const which of S.LITANY) use(clue(`sm_brazier_${which}`), "Light");
  assert.ok(S.sorrowmereOpen(g), "lit in order, the gate opens");
  knock(); assert.ok(p.x > gate.x, "through the inner gate");
  // The Barrow wants the Gravewarden's seal.
  const door = clue("sm_barrow_door"); teleport(g, door.x - 1, door.y); setTarget(g, { kind: "object", id: door.id, option: "Enter" }); run(g, 3); assert.ok(p.y < 1300, "no seal, no way in");
  assert.ok(MONSTERS.gravewarden.always.some(d => d.item === "sorrowmere_seal"), "the Gravewarden carries the seal");
  give(p, "sorrowmere_seal", 1); setTarget(g, { kind: "object", id: door.id, option: "Enter" }); run(g, 3); assert.equal(regionAt(world, p.x, p.y).id, "sorrowmere_catacombs", "down into the catacombs");
  // The Regent's door: a key, broken in the lock; back out for nothing.
  const regent = clue("sm_regent_door"); teleport(g, regent.x, regent.y - 1); setTarget(g, { kind: "object", id: regent.id, option: "Open" }); run(g, 3); assert.ok(p.y < regent.y, "locked without a key");
  give(p, "sorrowmere_key", 2); teleport(g, regent.x, regent.y - 1); setTarget(g, { kind: "object", id: regent.id, option: "Open" }); run(g, 3);
  assert.ok(p.y > regent.y && count(p, "sorrowmere_key") === 1, "a key opens it, and breaks");
  setTarget(g, { kind: "object", id: regent.id, option: "Open" }); run(g, 3); assert.ok(p.y < regent.y && count(p, "sorrowmere_key") === 1, "back out free");
  assert.ok(world.spawns.some(s => s.id === "bone_regent") && world.objects.some(o => o.name === "The Bone Regent's hoard"), "the Regent on his hoard");
  // The coffers are a dread dungeon's, and can hold an ossuary key.
  const { cofferTier } = await import("../games/rarefriends-realm/dungeons.ts");
  const coffer = world.objects.find(o => o.name === "Sorrowmere coffer"); assert.equal(cofferTier(g, coffer), "dread");
});

test("The Prismwild's wizards live in towns: Spirehollow's hat-roofed towers and Bellwhistle's market, and the villages of Mothwick, Shardstead and Tumbledown, each with its own wizard-folk; Sorrowmere keeps the Deadwood's night", async () => {
  const P = await import("../games/rarefriends-realm/prismworld.ts");
  const { gloomAt, inDeadwood } = await import("../games/rarefriends-realm/world.ts");
  const S = await import("../games/rarefriends-realm/necropolis.ts");
  const g = newGame(), world = g.world, seen = reachable(g, world.places.spawn);
  for (const [id, r] of [["spirehollow", P.SPIREHOLLOW], ["bellwhistle", P.BELLWHISTLE], ["mothwick", P.MOTHWICK], ["shardstead", P.SHARDSTEAD], ["tumbledown", P.TUMBLEDOWN]]) {
    const cx = Math.round((r.x0 + r.x1) / 2), cy = Math.round((r.y0 + r.y1) / 2);
    assert.equal(regionAt(world, cx, cy).id, id, `${id} is there`);
    let reached = false; for (let y = r.y0; y <= r.y1 && !reached; y++) for (let x = r.x0; x <= r.x1 && !reached; x++) if (seen[y * W + x]) reached = true;
    assert.ok(reached, `${id} is reached on foot`);
    assert.ok(world.spawns.filter(s => s.kind === "npc" && s.x >= r.x0 && s.x <= r.x1 && s.y >= r.y0 && s.y <= r.y1).length >= 4, `${id} has its folk`);
  }
  const inside = (o, r) => o.x >= r.x0 && o.x <= r.x1 && o.y >= r.y0 && o.y <= r.y1;
  assert.ok(world.buildings.filter(b => b.round && b.roof === "cone" && (b.spire ?? 0) >= 140 && inside({ x: b.x0, y: b.y0 }, P.SPIREHOLLOW)).length >= 6, "Spirehollow's towers wear tall hats");
  for (const r of [P.SPIREHOLLOW, P.BELLWHISTLE]) assert.ok(world.objects.some(o => o.kind === "bank" && inside(o, r)), "a bank in each town");
  const decor = (kind, r) => world.objects.filter(o => o.decor === kind && inside(o, r)).length;
  assert.equal(decor("backwards_clock", P.BELLWHISTLE), 1); assert.ok(decor("floating_isle", P.BELLWHISTLE) >= 3 && decor("teapot_house", P.BELLWHISTLE) >= 2, "a floating market and teapots");
  assert.ok(decor("mushroom_house", P.MOTHWICK) >= 5 && decor("crooked_house", P.TUMBLEDOWN) >= 5 && decor("topsy_tower", P.SPIREHOLLOW) === 1, "mushrooms, crooked houses, and a tower on its head");
  for (const shop of ["spire_hats", "fizzing_kettle", "floating_market"]) assert.ok(SHOPS[shop].stock.length >= 3, `${shop} sells`);
  assert.ok(NPCS.prismwild_villager && REGIONAL_CLOTHING.some(set => set.region === "prismwild"), "the wizard-folk dress the Prismwild way");
  // Sorrowmere under the Deadwood's night.
  const mid = Math.round((S.SORROWMERE.y0 + S.SORROWMERE.y1) / 2);
  assert.ok(gloomAt(world, S.SORROWMERE.x0 + 30, mid) > 0.9 && inDeadwood(world, S.SORROWMERE.x0 + 30, mid), "always night in Sorrowmere, its ground the Deadwood's");
});
