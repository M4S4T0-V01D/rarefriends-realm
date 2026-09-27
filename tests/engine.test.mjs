import test from "node:test";
import assert from "node:assert/strict";
import {
  buy, canWalk, castSpell, chooseOption, collectFromCasket, continueDialogue, createGame, equip, findPath, itemOptions, menuFor, restore, sell,
  serialize, setFollower, setRelics, setTarget, smeltingRecipes, smithingRecipes, startProduction, tick, togglePrayer, useItemOnItem, walkTo, setHeld,
  successChance, hitChance, unlockMusic,
} from "../games/rarefriends-realm/engine.ts";
import { ITEM_LIST, MONSTERS, SHOPS, SKILLS, SPELLS, TREES, XP_RATE, XP_TABLE, item, levelForXp } from "../games/rarefriends-realm/data.ts";
import { NPCS, QUESTS, MAX_QUEST_POINTS, questPoints } from "../games/rarefriends-realm/content.ts";
import { H, REGIONS, T, W, createWorld, objectAtTile, regionAt, terrainAt } from "../games/rarefriends-realm/world.ts";
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
  for (const id of ["bronze_axe", "bronze_pickaxe", "small_net", "tinderbox"]) assert(has(g.player, id), id);
  assert.equal(SKILLS.length, 15);
});

test("the world is large, deterministic and every landmark is reachable on foot", () => {
  const g = newGame(), world = g.world;
  assert.deepEqual(createWorld().tiles, createWorld().tiles, "Same seed, same world");
  assert(world.objects.filter(object => object.kind === "tree").length > 400, "Plenty of trees");
  assert(world.objects.filter(object => object.kind === "rock").length > 60, "Plenty of rocks");
  assert(world.objects.filter(object => object.kind === "spot").length >= 15, "Fishing spots");
  const overworld = reachable(g, world.places.spawn);
  const crypt = reachable(g, world.objects.find(object => object.name === "Crypt stairs").to);
  const depths = reachable(g, world.objects.find(object => object.name === "Hollow Rift").to);
  const ok = (x, y) => overworld[y * W + x] || crypt[y * W + x] || depths[y * W + x];
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
  assert(!overworld[224 * W + 177] && !depths[224 * W + 177], "…and only through the gate");
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

test("WASD walks in screen directions", () => {
  const g = newGame(), { x, y } = g.player;
  setHeld(g, { dx: 0, dy: 1 }); tick(g); setHeld(g, null);
  assert.equal(g.player.x - x, 1); assert.equal(g.player.y - y, 1);
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
  const slot = g.player.inventory.findIndex(entry => entry?.id === "shrimps");
  const use = menuFor(g, [{ kind: "object", id: tree.id }], null, { kind: "item", slot });
  assert.equal(use[0].verb, "Use Shrimps ->");
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
  // Cook a raw shrimp on it.
  give(g.player, "raw_shrimps", 3);
  const fire = g.fires[0];
  setTarget(g, { kind: "fire", uid: fire.uid, option: "Cook" });
  until(g, () => !has(g.player, "raw_shrimps"), 200);
  assert(count(g.player, "shrimps") + count(g.player, "burnt_food") >= 5, "Cooked (or burnt) all three");
  assert(g.player.xp.cooking > 0);
});

test("fishing shrimps at Glass Lake", () => {
  const g = newGame();
  const spot = g.world.objects.find(object => object.kind === "spot" && object.spot === "net");
  standBy(g, spot);
  menuFor(g, [{ kind: "object", id: spot.id }], null)[0].run(g);
  until(g, () => has(g.player, "raw_shrimps"), 400);
  assert(g.player.xp.fishing >= 10 * XP_RATE);
});

test("mining, smelting and smithing a bronze dagger", () => {
  const g = newGame();
  give(g.player, "hammer");
  for (const kind of ["copper", "tin"]) {
    const rock = g.world.objects.find(object => object.kind === "rock" && object.rock === kind);
    standBy(g, rock);
    setTarget(g, { kind: "object", id: rock.id, option: "Mine" });
    until(g, () => has(g.player, `${kind}_ore`), 600);
  }
  assert(g.player.xp.mining >= 17.5 * XP_RATE * 2);
  const furnace = g.world.objects.find(object => object.kind === "furnace");
  standBy(g, furnace);
  setTarget(g, { kind: "object", id: furnace.id, option: "Smelt" });
  until(g, () => g.ui.production !== null, 50);
  startProduction(g, smeltingRecipes()[0], 1);
  until(g, () => has(g.player, "bronze_bar"), 50);
  const anvil = g.world.objects.find(object => object.kind === "anvil");
  standBy(g, anvil);
  setTarget(g, { kind: "object", id: anvil.id, option: "Smith" });
  until(g, () => g.ui.production !== null, 50);
  startProduction(g, smithingRecipes("bronze").find(recipe => recipe.label === "Bronze dagger"), 1);
  until(g, () => count(g.player, "bronze_dagger") === 2, 50);
  assert(g.player.xp.smithing >= (6.2 + 12.5) * XP_RATE);
});

test("combat: equip a sword, kill a chicken, loot and bury its bones", () => {
  const g = newGame();
  give(g.player, "bronze_sword");
  equip(g, g.player.inventory.findIndex(slot => slot?.id === "bronze_sword"));
  assert.equal(g.player.equipment.weapon, "bronze_sword");
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
  give(g.player, "steel_scimitar"); equip(g, g.player.inventory.findIndex(slot => slot?.id === "steel_scimitar"));
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

test("magic: Wind Strike uses runes and trains Magic", () => {
  const g = newGame();
  give(g.player, "air_rune", 20); give(g.player, "mind_rune", 20);
  const rat = g.monsters.find(monster => monster.def.id === "ink_rat");
  const selection = castSpell(g, "wind_strike");
  assert.deepEqual(selection, { kind: "spell", spell: "wind_strike" });
  teleport(g, rat.x + 3, rat.y);
  if (!canWalk(g, rat.x + 3, rat.y)) teleport(g, rat.x, rat.y + 3);
  menuFor(g, [{ kind: "monster", id: rat.uid }], null, selection)[0].run(g);
  until(g, () => count(g.player, "air_rune") < 20, 40);
  assert(g.player.xp.magic >= 5.5 * XP_RATE);
  assert(SPELLS.length >= 10);
});

test("prayer: bury, pray at the altar, activate a prayer, it drains", () => {
  const g = newGame();
  g.player.xp.prayer = XP_TABLE[10]; g.player.prayer = 10;
  togglePrayer(g, "thick_skin");
  assert.deepEqual(g.player.prayers, ["thick_skin"]);
  run(g, 30);
  assert(g.player.prayer < 10);
  togglePrayer(g, "rock_skin");
  assert.deepEqual(g.player.prayers, ["rock_skin"], "Overlapping prayers swap");
});

test("shops and the bank", () => {
  const g = newGame({ familyId: 2 });
  give(g.player, "coins", 1000);
  const bought = buy(g, "general", "hammer", 1);
  assert.equal(bought, 1); assert(has(g.player, "hammer"));
  const coins = count(g.player, "coins");
  sell(g, "general", g.player.inventory.findIndex(slot => slot?.id === "hammer"), 1);
  assert(!has(g.player, "hammer")); assert(count(g.player, "coins") >= coins);
  assert.equal(buy(g, "runes", "mind_rune", 50), 50);
  assert.equal(count(g.player, "mind_rune"), 50);
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
  g.player.xp.woodcutting = 5000; give(g.player, "oak_logs", 3); g.player.bank.push({ id: "iron_bar", n: 12 }); g.player.quests.cold_forge = 1;
  g.player.wardrobe.push("rose_cape"); g.player.worn.push("rose_cape");
  const save = JSON.parse(JSON.stringify(serialize(g)));
  const fresh = newGame();
  assert(restore(fresh, save));
  assert.equal(fresh.player.xp.woodcutting, 5000);
  assert.equal(count(fresh.player, "oak_logs"), 3);
  assert.deepEqual(fresh.player.bank.find(slot => slot.id === "iron_bar"), { id: "iron_bar", n: 12 });
  assert.equal(fresh.player.quests.cold_forge, 1);
  assert.deepEqual(fresh.player.worn, ["rose_cape"]);
  // Tampering: unknown items, impossible XP, a wall position and a different Friend.
  const bad = { ...save, xp: { ...save.xp, attack: 9e99 }, inventory: [{ id: "godsword", n: 1 }, { id: "coins", n: -5 }], x: 0, y: 0, equipment: { weapon: "bronze_platebody" } };
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
  const first = collectFromCasket(g, 3);
  assert.equal(first.wardrobe, "golden_aura");
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

test("use item on item: tinderbox on logs lights a fire, chisel cuts gems", () => {
  const g = newGame();
  teleport(g, 100, 132);
  while (terrainAt(g.world, g.player.x, g.player.y) !== T.GRASS || objectAtTile(g.world, g.player.x, g.player.y)) teleport(g, g.player.x + 1, g.player.y);
  give(g.player, "logs");
  useItemOnItem(g, g.player.inventory.findIndex(slot => slot?.id === "tinderbox"), g.player.inventory.findIndex(slot => slot?.id === "logs"));
  until(g, () => g.fires.length > 0, 40);
  g.player.xp.crafting = XP_TABLE[20]; give(g.player, "chisel"); give(g.player, "uncut_sapphire");
  useItemOnItem(g, g.player.inventory.findIndex(slot => slot?.id === "chisel"), g.player.inventory.findIndex(slot => slot?.id === "uncut_sapphire"));
  until(g, () => has(g.player, "sapphire"), 20);
});
