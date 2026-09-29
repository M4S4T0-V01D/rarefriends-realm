import test from "node:test";
import assert from "node:assert/strict";
import {
  buy, canWalk, castSpell, chooseOption, collectFromCasket, continueDialogue, createGame, equip, findPath, itemOptions, menuFor, restore, sell,
  serialize, setFollower, setRelics, setTarget, smeltingRecipes, smithingRecipes, startProduction, tick, togglePrayer, useItemOnItem, walkTo, setHeld,
  successChance, hitChance, unlockMusic, bestArrow, rangedMaxHit, bowRange, syncMonster, toggleMount, grantMount, rideProblem, castOnItem, isBound, grantBundle, rubLamp, breakTablet, capeProblem, sellPrice, craftSigils,
} from "../games/rarefriends-realm/engine.ts";
import { currentTask, slayerPoints } from "../games/rarefriends-realm/slayer.ts";
import { ITEM_LIST, MONSTERS, MOUNTS, SHOPS, SKILLS, SKILL_NAMES, SPELLS, TREES, XP_RATE, XP_TABLE, item, levelForXp } from "../games/rarefriends-realm/data.ts";
import { NPCS, QUESTS, MAX_QUEST_POINTS, questPoints, onMonsterKilled } from "../games/rarefriends-realm/content.ts";
import { FLOOR_Y, H, REGIONS, T, W, createWorld, floorAt, objectAtTile, onLevel, realPoint, regionAt, terrainAt } from "../games/rarefriends-realm/world.ts";
import { addXp, emptyToBank, fillFromBank, bankDeposit, bankInOrder, bankMove, bankTabs, bankWithdraw, combatLevel, count, earlyXp, give, has, level, xpMultiplier } from "../games/rarefriends-realm/state.ts";
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
  assert.equal(SKILLS.length, 19);
});

test("the world is large, deterministic and every landmark is reachable on foot", () => {
  const g = newGame(), world = g.world;
  assert.deepEqual(createWorld().tiles, createWorld().tiles, "Same seed, same world");
  assert(world.objects.filter(object => object.kind === "tree").length > 400, "Plenty of trees");
  assert(world.objects.filter(object => object.kind === "rock").length > 60, "Plenty of rocks");
  assert(world.objects.filter(object => object.kind === "spot").length >= 15, "Fishing spots");
  // Walk from the spawn, and take every ladder and staircase you can reach (dungeons, the castle's storeys).
  const areas = [reachable(g, world.places.spawn)], taken = new Set();
  const ok = (x, y) => areas.some(seen => seen[y * W + x]);
  const beside = object => [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(object.x + dx, object.y + dy));
  for (let grew = true; grew;) {
    grew = false;
    for (const ladder of world.objects.filter(object => object.kind === "ladder" && !taken.has(object.id) && beside(object))) {
      taken.add(ladder.id); grew = true;
      if (!ok(ladder.to.x, ladder.to.y)) areas.push(reachable(g, ladder.to));
    }
  }
  const reach = object => object.blocks ? [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(object.x + dx, object.y + dy)) : ok(object.x, object.y) || [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(object.x + dx, object.y + dy));
  const interactive = world.objects.filter(object => object.kind !== "decor" && object.kind !== "stump" && object.name !== "__removed");
  const stuck = interactive.filter(object => !reach(object)).map(object => `${object.name}@${object.x},${object.y}`);
  // Agility obstacles after the first are reached by crossing the one before (covered by the lap test); trees can sit deep in groves.
  const blocked = interactive.filter(object => !reach(object) && object.kind !== "tree" && !(object.kind === "obstacle" && object.obstacle.course === "friendhollow" && object.obstacle.step > 0))
    .map(object => `${object.name}@${object.x},${object.y}`);
  assert.deepEqual(blocked, [], "Every station, rock, spot and ladder can be reached");
  assert(stuck.length < interactive.length * 0.03, `Nearly every tree can be reached (${stuck.length} can't)`);
  for (const spawn of world.spawns.filter(entry => entry.kind === "npc")) {
    assert(ok(spawn.x, spawn.y) || [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([dx, dy]) => ok(spawn.x + dx, spawn.y + dy)), `NPC ${spawn.id} at ${spawn.x},${spawn.y}`);
  }
  for (const id of Object.keys(NPCS)) assert(world.spawns.some(spawn => spawn.kind === "npc" && spawn.id === id), `NPC ${id} is placed`);
  for (const id of Object.keys(MONSTERS).filter(id => !MONSTERS[id].worldBoss)) assert(world.spawns.some(spawn => spawn.kind === "monster" && spawn.id === id), `Monster ${id} is placed`);
  for (const region of REGIONS) if (region.id !== "coast") assert(world.region.includes(REGIONS.indexOf(region)), `${region.name} exists`);
  assert.equal(regionAt(world, world.places.spawn.x, world.places.spawn.y).id, "friendhollow");
  // The throne room lies behind the Hollow gate: the king is reachable from its far side.
  const king = world.places.king, throne = reachable(g, { x: 177, y: 224 });
  assert(throne[king.y * W + king.x - 1] || throne[(king.y + 3) * W + king.x], "The Hollow King can be reached past the gate");
  assert(!ok(177, 224), "…and only through the gate");
});

test("Friendhollow Castle: spiral stairs up to the King, on to the roof, and back down", () => {
  const g = newGame(), world = g.world, levelOf = () => realPoint(world, g.player.x, g.player.y).level;
  const stairs = (level, action) => world.objects.filter(object => object.look === "stairs" && object.action === action && realPoint(world, object.x, object.y).level === level && realPoint(world, object.x, object.y).x < 140);
  const climb = (object, level) => { standBy(g, object); menuFor(g, [{ kind: "object", id: object.id }], null)[0].run(g); until(g, () => levelOf() === level, 30); };
  // Up the north-east tower to the King's floor.
  const up = stairs(0, "Climb-up").sort((a, b) => b.x - a.x)[0];
  assert.equal(menuFor(g, [{ kind: "object", id: up.id }], null)[0].verb, "Climb-up");
  climb(up, 1);
  assert(g.player.y >= FLOOR_Y && floorAt(world, g.player.x, g.player.y).complex === "castle", "Stored on the castle's first floor");
  const real = realPoint(world, g.player.x, g.player.y);
  assert(real.x >= 112 && real.x <= 131 && real.y >= 86 && real.y <= 105, "Standing over the castle");
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
  assert(g.player.y < 200, "Back on the ground");
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
  teleport(g, 100, 132);
  while (terrainAt(g.world, g.player.x, g.player.y) !== T.GRASS || objectAtTile(g.world, g.player.x, g.player.y)) teleport(g, g.player.x + 1, g.player.y);
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
  const fresh = newGame(); restore(fresh, serialize(g)); assert.equal(fresh.player.coalBag, 8);
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

test("Beginner fishing by the farm, and a new cook burns far less", () => {
  const g = newGame();
  const pond = g.world.objects.filter(object => object.kind === "spot" && Math.abs(object.x - 76) <= 6 && Math.abs(object.y - 139) <= 4);
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
  assert.equal(QUESTS.length, 12); assert.equal(MAX_QUEST_POINTS, 19);
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
  // Tier 3 holds two pieces; after both, duplicates turn into coins.
  const first = collectFromCasket(g, 3), second = collectFromCasket(g, 3);
  assert.deepEqual([first.wardrobe, second.wardrobe].sort(), ["golden_aura", "rarite_crown"]);
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
  teleport(g, 100, 132);
  while (terrainAt(g.world, g.player.x, g.player.y) !== T.GRASS || objectAtTile(g.world, g.player.x, g.player.y)) teleport(g, g.player.x + 1, g.player.y);
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
  assert.deepEqual(sellers, ["war_bows"]);
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

test("Slayer: a task from the Warden, XP per kill, points when it's done, and creatures only a Slayer can wound", () => {
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
  p.questData.slayer_task = 1; p.questData.slayer_left = 2;
  for (const skill of ["attack", "strength", "defence", "hitpoints"]) p.xp[skill] = 1_000_000;
  p.hp = 99;
  for (let kill = 0; kill < 2; kill++) {
    const rat = g.monsters.filter(monster => monster.def.id === "ink_rat" && !monster.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    standNear(g, rat.x, rat.y, 1);
    setTarget(g, { kind: "monster", uid: rat.uid, option: "Attack" });
    until(g, () => rat.dead, 200);
  }
  assert(p.xp.slayer > 0, "Slayer XP on task");
  assert.equal(currentTask(g), null); assert.equal(slayerPoints(g), 10, "10 points for a finished task");
  // A mire crawler can't be hurt below Slayer 10.
  const crawler = g.monsters.find(monster => monster.def.id === "mire_crawler");
  standNear(g, crawler.x, crawler.y, 1);
  setTarget(g, { kind: "monster", uid: crawler.uid, option: "Attack" });
  run(g, 8);
  assert.equal(crawler.hp, crawler.def.hp, "no damage without the Slayer level");
  assert(g.messages.some(entry => entry.text.includes("Slayer level of 10")));
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
  assert.equal(world.objects.filter(object => object.kind === "sigil_altar").length, 11);
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
  player.y = 210; assert(rideProblem(game)); tick(game); assert.equal(player.mount, null, "left to graze outside");
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
  rollDaily(game, day); rollDaily(other, day);
  assert.deepEqual(game.player.daily.challenges.map(c => c.kind === "xp" ? c.skill : "kills"), other.player.daily.challenges.map(c => c.kind === "xp" ? c.skill : "kills"));
  assert.equal(p.daily.challenges.length, 3);
  assert(!claimChallenge(game, 0), "not done yet");
  for (const [i, c] of p.daily.challenges.entries()) { if (c.kind === "xp") p.xp[c.skill] += c.target; else p.kills += c.target; assert.equal(challengeProgress(game, i), c.target); }
  assert(!claimChest(game), "the chest waits for all three");
  for (let i = 0; i < 3; i++) assert(claimChallenge(game, i));
  assert(!claimChallenge(game, 0), "each once");
  assert(claimChest(game)); assert(!claimChest(game));
  assert(!rollDaily(game, day + 1000), "same day, same challenges");
  const save = JSON.parse(JSON.stringify(serialize(game))), fresh = newGame(); assert(restore(fresh, save));
  assert.deepEqual(fresh.player.daily, p.daily, "saved");
  assert(rollDaily(fresh, day + DAY_MS) && fresh.player.daily.claimed.every(c => !c) && !fresh.player.daily.chest, "a new day, new challenges");
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
  p.quests.dawn_vigil = 2; p.quests.greyhorn_light = 3; p.xp.prayer = XP_TABLE[60];
  assert(capeProblem(g, "dawnplate_greaves"), "Dawnplate is earned first");
  // The Pilgrim's Road: pray at the three old altars.
  talkTo("chaplain");
  assert.equal(p.quests.pilgrims_road, 1);
  for (const altar of ["Altar", "Mountain shrine", "Crypt altar"]) pray(altar);
  talkTo("chaplain");
  assert.equal(p.quests.pilgrims_road, 2); assert(has(p, "dawnplate_greaves"));
  // The Restless Crypt: only kills with a faith weapon count.
  talkTo("chaplain");
  assert.equal(p.quests.restless_crypt, 1);
  onMonsterKilled(g, "skeleton", 28, 220);
  assert.equal(p.questData.crypt_rest ?? 0, 0, "ordinary steel doesn't lay them to rest");
  p.equipment.weapon = "dawnsteel_sword";
  for (let i = 0; i < 12; i++) onMonsterKilled(g, "skeleton", 28, 220);
  talkTo("chaplain");
  assert.equal(p.quests.restless_crypt, 2); assert(has(p, "dawnplate_helm") && has(p, "dawnplate_shield"));
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
  assert.equal(QUESTS.length, 12); assert.equal(MAX_QUEST_POINTS, 19);
});
