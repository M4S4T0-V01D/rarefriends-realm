import test from "node:test";
import assert from "node:assert/strict";
import {
  buy, canWalk, castSpell, chooseOption, collectFromCasket, continueDialogue, createGame, equip, findPath, itemOptions, menuFor, restore, sell,
  serialize, setFollower, setRelics, setTarget, smeltingRecipes, smithingRecipes, startProduction, tick, togglePrayer, useItemOnItem, walkTo, setHeld,
  successChance, hitChance, unlockMusic, castOnItem, isBound, grantBundle, rubLamp, breakTablet, capeProblem, sellPrice, craftSigils,
} from "../games/rarefriends-realm/engine.ts";
import { currentTask, slayerPoints } from "../games/rarefriends-realm/slayer.ts";
import { ITEM_LIST, MONSTERS, SHOPS, SKILLS, SPELLS, TREES, XP_RATE, XP_TABLE, item, levelForXp } from "../games/rarefriends-realm/data.ts";
import { NPCS, QUESTS, MAX_QUEST_POINTS, questPoints } from "../games/rarefriends-realm/content.ts";
import { FLOOR_Y, H, REGIONS, T, W, createWorld, floorAt, objectAtTile, onLevel, realPoint, regionAt, terrainAt } from "../games/rarefriends-realm/world.ts";
import { combatLevel, count, give, has, level, xpMultiplier } from "../games/rarefriends-realm/state.ts";
import game from "../games/rarefriends-realm/game.json" with { type: "json" };

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
  for (const id of Object.keys(MONSTERS)) assert(world.spawns.some(spawn => spawn.kind === "monster" && spawn.id === id), `Monster ${id} is placed`);
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
  assert(g.player.xp.woodcutting >= TREES.tree.xp * XP_RATE);
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
  assert(g.player.xp.fishing >= 10 * XP_RATE);
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
  assert(g.player.xp.mining >= 17.5 * XP_RATE);
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
  assert(g.player.xp.smithing >= (8 + 12.5) * XP_RATE);
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
  assert(g.player.xp.prayer >= 4.5 * XP_RATE * 1.5, "Skeleton family buries for +50%");
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
  assert.equal(QUESTS.length, 6); assert.equal(MAX_QUEST_POINTS, 9);
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
  assert(g.player.xp.agility >= (perObstacle + 40) * XP_RATE, "Lap bonus paid");
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
  assert(g.player.xp.magic >= 5.5 * XP_RATE);
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
  give(g.player, "moonstone"); run(g, 4);
  assert(castOnItem(g, "enchant_moonstone", g.player.inventory.findIndex(slot => slot?.id === "moonstone")));
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
  const worst = shielded => {
    let max = 0; p.equipment.shield = shielded ? "wyrmward_shield" : undefined; if (!shielded) delete p.equipment.shield;
    for (let i = 0; i < 400; i++) { p.hp = 99; drake.dead = false; drake.hp = drake.def.hp; drake.target = true; drake.attackTimer = 0; standNear(g, drake.x, drake.y, 1); p.combat = null;
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
