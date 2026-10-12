/**
 * The Hearthkin's country (the Skill overhaul, after the mining country of world.ts buildMiningCountry): Emberforge
 * grown into a mining town (the Fellows of Metal's hall and the Deep under it, the Old Pavilion, a street of
 * Hearthkin houses, Picks & Carts, the ore yard), the Ashen quarry's shaft and its hot tunnel, and Frostpeak moved
 * up the mountain: a town on a high shelf east of the summit, reached by switchbacks through a pass from the
 * Emberforge–Highcairn road, or along the summit ridge through the yetis; the old camp below is the lower lodge now.
 *
 * Everything here is fixed shapes in the mainland's own coordinates (toWorld maps them, dungeon rows included), drawn
 * after every random thing, so the rest of the world stays exactly as it was (hearthkin.ts has the people).
 */
import { T, worldTools, type GenContext } from "./world.ts";
import { COLD_QUENCH_ANVIL, ELDER_ANVIL_NAME, FELLOWS_TRIAL, GUILD_FURNACE } from "./hearthkinnames.ts";

type ToWorld = (x: number, y: number) => [number, number];

export function buildHearthkinCountry(ctx: GenContext, toWorld: ToWorld) {
  const t = worldTools(ctx), { lift, raise, objectAt } = ctx;
  const W = ctx.W;
  const idx = (x: number, y: number) => { const [wx, wy] = toWorld(x, y); return wy * W + wx; };
  const get = (x: number, y: number) => t.get(...toWorld(x, y)), put = (x: number, y: number, terrain: number) => t.put(...toWorld(x, y), terrain);
  const free = (x: number, y: number) => t.free(...toWorld(x, y)), clearAt = (x: number, y: number) => t.clearAt(...toWorld(x, y));
  const rock = (x: number, y: number, kind: Parameters<typeof t.rock>[2]) => { if (free(x, y)) t.rock(...toWorld(x, y), kind); };
  const decor = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => { const [wx, wy] = toWorld(x, y); t.decor(wx, wy, kind, blocks, name); };
  const add = (object: Parameters<typeof t.add>[0]) => { const [wx, wy] = toWorld(object.x, object.y); return t.add({ ...object, x: wx, y: wy }); };
  const npc = (id: string, x: number, y: number, wander = 0) => t.npc(id, ...toWorld(x, y), wander);
  const monsters = (id: string, x0: number, y0: number, x1: number, y1: number, n: number) => { const [ax, ay] = toWorld(x0, y0), [bx, by] = toWorld(x1, y1); t.monsters(id, ax, ay, bx, by, n); };
  const setRegion = (x: number, y: number, id: Parameters<typeof t.setRegion>[2]) => t.setRegion(...toWorld(x, y), id);
  const fillRect = (x0: number, y0: number, x1: number, y1: number, terrain: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, terrain); };
  const clearRect = (x0: number, y0: number, x1: number, y1: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) clearAt(x, y); };
  const building = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", floor: number, roof: Parameters<typeof t.building>[7]) => { const [ax, ay] = toWorld(x0, y0), [bx, by] = toWorld(x1, y1); t.building(ax, ay, bx, by, door, floor, undefined, roof); };
  /** A road that also clears what stood on it (world.ts road paints under trees and boulders). */
  const road = (points: readonly (readonly [number, number])[], width: number, terrain: number) => {
    t.road(points.map(([x, y]) => toWorld(x, y)), width, terrain);
    for (let i = 0; i + 1 < points.length; i++) {
      const [ax, ay] = points[i], [bx, by] = points[i + 1], steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let s = 0; s <= steps; s++) { const cx = ax + (bx - ax) * s / steps, cy = ay + (by - ay) * s / steps; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.hypot(dx, dy) <= width / 2 + 0.2) clearAt(Math.round(cx + dx), Math.round(cy + dy)); }
    }
  };
  const sign = (x: number, y: number, text: string) => { clearAt(x, y); add({ kind: "sign", x, y, blocks: true, name: "Signpost", text }); };
  const station = (kind: "furnace" | "anvil", x: number, y: number, name: string) => { clearAt(x, y); add({ kind, x, y, blocks: true, name }); };
  const GRASSY = new Set<number>([T.GRASS, T.DARK_GRASS, T.GRAVEL, T.SNOW, T.SAND, T.ASH]);

  // ---------- Emberforge: the Fellows of Metal ----------
  // A stone hall on the river's east bank, north of the forge: two guild furnaces, two anvils, a bank booth, the assay,
  // and in the corner the ladder down to the Deep, which only a Fellow may climb (engine.ts: a ladder with a quest on it).
  building(153, 30, 165, 38, "s", T.STONE, { name: "The Fellows of Metal", color: "#6f6a62", walls: "stone", chimney: true });
  station("furnace", 155, 32, GUILD_FURNACE); station("furnace", 157, 32, GUILD_FURNACE); station("anvil", 160, 32, "Anvil"); station("anvil", 162, 32, "Anvil");
  add({ kind: "bank", x: 164, y: 33, blocks: true, name: "Bank booth" }); npc("banker", 163, 33);
  npc("fellows_warden", 159, 35, 1); npc("fellows_assayer", 155, 36);
  decor(154, 34, "banner"); decor(157, 36, "table"); decor(156, 36, "chest", true, "The Fellows' tally chest"); decor(161, 36, "armour", true, "The founder's hammer, on a stand");
  add({ kind: "ladder", x: 164, y: 37, blocks: true, name: "Ladder to the Deep", action: "Climb-down", to: toPoint(toWorld, 76, 226), requires: { quest: FELLOWS_TRIAL }, text: "The Deep is for Fellows of Metal. The Warden makes Fellows." });
  sign(157, 39, "The Fellows of Metal: Emberforge's guild of Mining and Smithing. Guild furnaces, the assay, and the Deep, for Fellows (Mining 50, Smithing 50).");
  // The ore yard east of the hall: carts, props and crates where the Deep's ore comes up.
  for (const [x, y, kind, name] of [[167, 31, "wagon", "Ore cart"], [169, 34, "wagon", "Ore cart"], [167, 36, "logpile", "Pit props, stacked"], [170, 31, "crate", "Crates of inkcoal"], [171, 36, "barrel", "Quench water"]] as const) if (free(x, y)) decor(x, y, kind, true, name);
  // ---------- Emberforge: the Old Pavilion ----------
  // On the gravel rise west of the river, above the quarry's rim, open to the south: a stone floor, a back wall and sides
  // of weathered stone, pillars holding up nothing you can see, a hearth, the Elder anvils, and the Strong Friend at the
  // front, worn smooth where everybody touches him.
  for (let y = 35; y <= 41; y++) for (let x = 127; x <= 137; x++) { put(x, y, T.STONE); clearAt(x, y); }
  for (let x = 127; x <= 137; x++) { put(x, 34, T.WALL); clearAt(x, 34); }
  for (let y = 34; y <= 38; y++) { put(127, y, T.WALL); clearAt(127, y); put(137, y, T.WALL); clearAt(137, y); }
  decor(130, 36, "pillar", true, "Pavilion pillar"); decor(134, 36, "pillar", true, "Pavilion pillar"); decor(129, 40, "pillar", true, "Pavilion pillar"); decor(135, 40, "pillar", true, "Pavilion pillar");
  decor(132, 35, "hearth", true, "The Pavilion hearth");
  station("anvil", 129, 38, ELDER_ANVIL_NAME); station("anvil", 135, 38, ELDER_ANVIL_NAME); station("furnace", 130, 35, "Furnace"); station("furnace", 134, 35, "Furnace");
  npc("pavilion_keeper", 132, 38, 1);
  decor(128, 40, "torch"); decor(136, 40, "torch");
  for (let x = 127; x <= 137; x++) for (let y = 42; y <= 43; y++) { clearAt(x, y); if (GRASSY.has(get(x, y)) || get(x, y) === T.CLIFF) put(x, y, T.GRAVEL); }
  add({ kind: "decor", decor: "strong_friend", x: 132, y: 42, blocks: true, name: "The Strong Friend", clue: "strong_friend" });
  add({ kind: "decor", decor: "plaque", x: 133, y: 42, blocks: true, name: "Worn plaque", clue: "pavilion_plaque" });
  sign(138, 42, "The Old Pavilion: older than Emberforge. The Elder anvils, the Keeper's hearth, and the Strong Friend, whom you touch going in and coming out.");
  // ---------- Emberforge: the Hearthkin street, Picks & Carts by the bridge, the quarry road's people ----------
  building(147, 40, 151, 44, "e", T.WOOD, { name: "A Hearthkin house", color: "#8f6a4a", chimney: true }); decor(148, 41, "bed"); decor(150, 43, "table");
  building(153, 56, 157, 60, "n", T.WOOD, { name: "A Hearthkin house", color: "#6b5a4e", chimney: true }); decor(154, 57, "bed"); decor(156, 59, "chest");
  building(158, 56, 162, 60, "n", T.WOOD, { name: "A Hearthkin house", color: "#7a5c3e", chimney: true }); decor(161, 57, "bed"); decor(159, 59, "barrel");
  building(138, 52, 143, 56, "n", T.WOOD, { name: "Picks & Carts", color: "#5f5e66", chimney: false }); npc("ember_supplier", 140, 54); decor(139, 55, "shelf"); decor(142, 55, "crate", true, "Picks, in their straw");
  for (const [x, y] of [[150, 46], [153, 49], [162, 62], [164, 55]] as const) npc("ember_hearthkin_villager", x, y, 4);
  for (const [x, y] of [[152, 39], [166, 39], [152, 55]] as const) if (free(x, y)) decor(x, y, "lamp");
  // ---------- The Ashen quarry: its master, its shaft, and the hot tunnel off it ----------
  npc("quarry_master", 117, 60, 2); for (const [x, y] of [[112, 50], [120, 57]] as const) npc("ember_hearthkin_villager", x, y, 3);
  clearAt(121, 66); clearAt(121, 67); if (!GRASSY.has(get(121, 66)) && get(121, 66) !== T.STONE) put(121, 66, T.GRAVEL); if (!GRASSY.has(get(121, 67))) put(121, 67, T.GRAVEL);
  add({ kind: "ladder", x: 121, y: 66, blocks: true, name: "Quarry shaft", action: "Climb-down", to: toPoint(toWorld, 6, 209) });
  decor(123, 66, "logpile", true, "Shaft props"); sign(119, 68, "The quarry shaft: pewter, blackiron, inkcoal and refined sigil stone, out of the rain. The hot tunnel off it: salamanders, and nobody makes you.");

  // ---------- Underground: the Fellows' Deep, the quarry shaft and the hot tunnel (the mainland's dungeon rows) ----------
  // (The rows under the Hollow Depths' west end, and west of the Murkmire Crypt: the rest of the band is the other dungeons'.)
  const rooms: [number, number, number, number, Parameters<typeof t.setRegion>[2]][] = [
    [74, 223, 90, 229, "fellows_deep"], [90, 226, 106, 232, "fellows_deep"], [82, 232, 104, 238, "fellows_deep"],
    [4, 206, 20, 214, "ashen_shaft"], [10, 214, 20, 222, "ashen_shaft"], [4, 222, 20, 236, "ashen_shaft"],
  ];
  for (const [x0, y0, x1, y1, id] of rooms) for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) { if (get(x, y) === T.VOID) put(x, y, T.WALL); setRegion(x, y, id); }
  for (const [x0, y0, x1, y1] of rooms) fillRect(x0, y0, x1, y1, T.DUNGEON);
  // The Deep: moonsilver and charged sigil stone near the ladder, glimmer in the east gallery, rarite in the deep one, inkcoal throughout, props and carts, and the spiders at the dark end.
  add({ kind: "ladder", x: 76, y: 225, blocks: true, name: "Ladder up", action: "Climb-up", to: toPoint(toWorld, 163, 37) });
  npc("fellows_foreman", 78, 227, 2);
  for (const [x, y] of [[82, 224], [86, 228], [89, 224], [84, 228]] as const) rock(x, y, "moonsilver");
  for (const [x, y] of [[80, 228], [88, 227]] as const) rock(x, y, "sigil3");
  for (const [x, y] of [[93, 227], [97, 231], [101, 227], [105, 231], [99, 229]] as const) rock(x, y, "glimmer");
  for (const [x, y] of [[85, 236], [92, 234], [99, 237], [103, 233]] as const) rock(x, y, "rarite");
  for (const [x, y] of [[79, 223], [95, 226], [87, 234], [96, 238], [103, 236], [84, 233]] as const) rock(x, y, "inkcoal");
  for (const [x, y] of [[82, 232], [90, 232], [98, 232]] as const) decor(x, y, "pillar", true, "Pit prop");
  for (const [x, y] of [[77, 229], [92, 229], [87, 237]] as const) decor(x, y, "wagon", true, "Ore cart");
  for (const [x, y] of [[75, 223], [90, 226], [104, 226], [83, 238], [104, 238], [94, 232]] as const) decor(x, y, "torch");
  monsters("cave_spider", 84, 234, 103, 237, 6);
  // The quarry shaft: the quarry's own rock, dry; then the hot tunnel, red-lit, where the salamanders are, and the gem rock at its end.
  add({ kind: "ladder", x: 6, y: 208, blocks: true, name: "Ladder up", action: "Climb-up", to: toPoint(toWorld, 121, 67) });
  for (const [x, y] of [[9, 207], [12, 212], [16, 207], [19, 212], [14, 210], [10, 211]] as const) rock(x, y, "pewter");
  for (const [x, y] of [[14, 207], [18, 209], [11, 209], [8, 212], [19, 206]] as const) rock(x, y, "blackiron");
  for (const [x, y] of [[11, 206], [17, 213], [5, 211]] as const) rock(x, y, "inkcoal");
  for (const [x, y] of [[5, 213], [20, 209]] as const) rock(x, y, "sigil2");
  for (const [x, y] of [[8, 209], [15, 209], [19, 213]] as const) decor(x, y, "pillar", true, "Pit prop");
  for (const [x, y] of [[5, 206], [12, 206], [20, 214]] as const) decor(x, y, "torch");
  monsters("ink_rat", 7, 206, 19, 213, 5);
  add({ kind: "sign", x: 11, y: 215, blocks: true, name: "Warning", text: "HOT TUNNEL. Salamanders, the grown kind. The gem rock at the end is yours if you're still standing." });
  for (let y = 216; y <= 222; y++) for (let x = 10; x <= 20; x++) if ((x + y) % 5 === 0) put(x, y, T.ASH);
  for (const [x, y] of [[13, 218], [18, 221], [15, 220]] as const) put(x, y, T.LAVA);
  for (const [x, y] of [[7, 226], [18, 230], [9, 234]] as const) rock(x, y, "moonsilver");
  rock(18, 235, "gem"); decor(5, 225, "torch"); decor(19, 225, "torch"); decor(12, 235, "bones", false, "Somebody's pick, and somebody");
  monsters("ember_salamander", 5, 225, 19, 235, 3); monsters("ember_salamander", 11, 217, 19, 222, 1);

  // ---------- Frostpeak, moved up the mountain ----------
  // The old camp is the lower lodge now (world.ts). The town stands on a shelf cut into the mountain east of the summit,
  // raised above the scree, walled with crag on every side but two: the pass (switchbacks up from the Emberforge–Highcairn
  // road) and the summit ridge (through the yetis).
  const SHELF = { x0: 239, y0: 21, x1: 265, y1: 41 };
  for (let y = SHELF.y0; y <= SHELF.y1; y++) for (let x = SHELF.x0; x <= SHELF.x1; x++) {
    const edge = x === SHELF.x0 || x === SHELF.x1 || y === SHELF.y0 || y === SHELF.y1;
    const passGap = y === SHELF.y1 && x >= 250 && x <= 253, ridgeGap = x === SHELF.x0 && y >= 23 && y <= 25;
    clearAt(x, y); put(x, y, edge && !passGap && !ridgeGap ? T.CLIFF : T.SNOW); lift[idx(x, y)] = 0; raise[idx(x, y)] = 3.2; setRegion(x, y, "frostpeak");
  }
  // The pass: switchbacks up from the road's bend, climbing as they go; the ridge: a snow track west to the summit, through the yetis.
  road([[236, 54], [241, 51], [246, 49], [241, 46], [247, 43], [251, 42], [251, 40]], 2, T.PATH);
  for (let y = 40; y <= 56; y++) for (let x = 232; x <= 256; x++) if (get(x, y) === T.PATH && y > SHELF.y1) { raise[idx(x, y)] = Math.max(raise[idx(x, y)], 3.2 * (56 - y) / 16); setRegion(x, y, "frostpeak"); }
  for (const [x, y] of [[238, 48], [244, 45], [249, 44], [236, 52]] as const) rock(x, y, "moonsilver");
  road([[239, 24], [234, 20], [228, 15]], 2, T.SNOW);
  for (let y = 12; y <= 26; y++) for (let x = 226; x <= 240; x++) if (get(x, y) === T.CLIFF && Math.abs((y - 24) - (x - 239) * (24 - 15) / (239 - 228)) < 2.5) put(x, y, T.SNOW);
  for (const [x, y] of [[236, 14], [242, 22], [233, 22]] as const) rock(x, y, "moonsilver"); rock(238, 18, "rarite"); rock(235, 17, "glimmer");
  monsters("frost_yeti", 230, 12, 240, 24, 3);
  // The town.
  building(246, 25, 252, 29, "s", T.WOOD, { name: "Frostpeak Lodge", color: "#f3f2ee", chimney: true });
  add({ kind: "bank", x: 248, y: 26, blocks: true, name: "Bank booth" }); npc("banker", 249, 27); add({ kind: "range", x: 251, y: 26, blocks: true, name: "Cooking range" }); decor(247, 28, "table");
  building(254, 25, 258, 29, "s", T.WOOD, { name: "Frostpeak Outfitters", color: "#d9d4e6", chimney: true }); npc("outfitter", 256, 27); decor(255, 26, "shelf"); decor(257, 26, "shelf");
  building(244, 33, 250, 38, "n", T.STONE, { name: "Coldhammer's forge", color: "#bcd8e8", walls: "stone", chimney: false });
  station("furnace", 245, 37, "Furnace"); station("anvil", 249, 37, COLD_QUENCH_ANVIL); decor(247, 37, "barrel", true, "The snowmelt trough"); npc("frost_smith_cold", 247, 35, 1); decor(245, 34, "crate", true, "Frost shards, packed in snow");
  building(253, 33, 259, 38, "n", T.STONE, { name: "Oddhand's wrightshop", color: "#8f8a83", walls: "stone", chimney: true });
  station("furnace", 258, 37, "Furnace"); station("anvil", 254, 37, "Anvil"); npc("frost_smith_wright", 256, 35, 1); decor(258, 34, "shelf", true, "Gauges and rock samples"); decor(254, 34, "crate", true, "Rock samples, labelled");
  building(260, 30, 264, 34, "w", T.WOOD, { name: "The Elder's house", color: "#c7d3dc", chimney: true }); npc("frost_elder", 262, 32); decor(263, 31, "bed");
  building(240, 24, 244, 28, "e", T.WOOD, { name: "A Hearthkin house", color: "#9fabc2", chimney: true }); decor(241, 25, "bed");
  building(240, 30, 244, 34, "e", T.WOOD, { name: "A Hearthkin house", color: "#bcd8e8", chimney: true }); decor(241, 31, "bed"); decor(243, 33, "chest");
  for (const [x, y] of [[248, 32], [256, 32], [246, 31]] as const) npc("frost_hearthkin_villager", x, y, 3);
  for (const [x, y] of [[250, 31], [254, 31], [247, 24], [257, 24]] as const) decor(x, y, "lamp");
  decor(252, 32, "bench"); decor(251, 36, "snowman", true, "Snow Friend"); decor(258, 23, "banner");
  add({ kind: "decor", decor: "strong_friend", x: 252, y: 22, blocks: true, name: "The Strong Friend", clue: "strong_friend" });
  decor(253, 22, "torch"); decor(251, 22, "torch");
  for (const [x, y] of [[241, 37], [263, 36], [262, 24], [241, 39]] as const) rock(x, y, "moonsilver");
  for (const [x, y] of [[243, 22], [262, 40], [246, 40]] as const) if (free(x, y)) t.tree(...toWorld(x, y), "pine");
  sign(249, 39, "Frostpeak. The lodge and the bank; Coldhammer's forge; Oddhand's wrightshop; the outfitters. Down the switchbacks: the Emberforge road and Highcairn. West along the ridge: the summit, and the yetis.");
  sign(234, 56, "North, up the switchbacks: Frostpeak, the town on the shelf. West: the lower lodge. East: Highcairn.");
  void objectAt;
}

const toPoint = (toWorld: ToWorld, x: number, y: number) => { const [wx, wy] = toWorld(x, y); return { x: wx, y: wy }; };
