/**
 * Return of Raria: the far west, built on the land expansion.ts lays down.
 *
 * Deep Westmarch, where the West Road runs on past Westmarch's end into a border nobody drew: Hollowmere's outpost,
 * the Regiment's camps and checkpoint, the Federation's picket line, a battlefield, a ruined tower, a hidden hollow.
 * The Free Marches to the south-west, and the FFF Fortress in them. And Lawgate, Raria's fortress town on its eastern
 * march facing the Drakespine (the kingdom itself, its capital and BarkReach lie on the far-west continent: farwest.ts). Hollowmere's own soldiers stand in Friendhollow and
 * along the Westmarch road, and the Burned walk the ash round the Order of the Ember's fortress.
 */
import { MAINLAND_RECT, T, isWater, legacyMainlandToWorld as mainlandToWorld, type GenContext, type worldTools } from "./world.ts";
import type { DecorKind } from "./world.ts";
import { BURNED_BUILDS } from "./factions.ts";

type Tools = ReturnType<typeof worldTools>;
/** Built on first use: this module is loaded through world.ts, whose T is not initialised until it finishes. */
let walkableSet: Set<number> | null = null;
const walkable = (tt: number) => (walkableSet ??= new Set<number>([T.GRASS, T.DARK_GRASS, T.PATH, T.COBBLE, T.SAND, T.SWAMP, T.SNOW, T.STONE, T.WOOD, T.GRAVEL, T.BRIDGE, T.FARMLAND, T.ASH])).has(tt);

export function buildWest(ctx: GenContext, t: Tools) {
  const { get, put, add, decor, npc, building, clearAt, fillRect, monsters, monster, tree, rockCluster, scatter, inBounds, tileIndex, shoreSpots } = t;
  const { random, noise2 } = ctx;
  const inMainland = (x: number, y: number) => x >= MAINLAND_RECT.x0 && x <= MAINLAND_RECT.x1 && y >= MAINLAND_RECT.y0 && y <= MAINLAND_RECT.y1;
  const occupied = (x: number, y: number) => ctx.objectAt[tileIndex(x, y)] >= 0 || ctx.spawns.some(spawn => spawn.x === x && spawn.y === y);
  /** The nearest tile you could stand on, for anything that must not be lost to a tree or a wobble of the coast. */
  const nearFree = (x: number, y: number, limit = 8): [number, number] => {
    for (let r = 0; r <= limit; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy; if (!inBounds(nx, ny)) continue;
      if (walkable(get(nx, ny)) && get(nx, ny) !== T.WALL && !occupied(nx, ny)) return [nx, ny];
    }
    return [x, y];
  };
  /** Level ground: everything standing cleared, water and cliff made land, a paved middle. */
  const ground = (cx: number, cy: number, rx: number, ry: number, paving: number | null, square = 0) => {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (!inBounds(x, y) || inMainland(x, y)) continue;
      clearAt(x, y);
      const tt = get(x, y);
      if (tt === T.CLIFF || tt === T.LAVA || tt === T.SWAMP || tt === T.VOID || isWater(tt) || tt === T.WALL) put(x, y, paving === T.GRAVEL || paving === T.ASH ? T.GRAVEL : T.GRASS);
      for (let i = ctx.spawns.length - 1; i >= 0; i--) if (ctx.spawns[i].x === x && ctx.spawns[i].y === y) ctx.spawns.splice(i, 1);
    }
    if (paving !== null && square > 0) fillRect(cx - square, cy - Math.ceil(square * 0.75), cx + square, cy + Math.ceil(square * 0.75), paving);
  };
  const sign = (x: number, y: number, label: string, text: string, icon?: string) => { const [sx, sy] = nearFree(x, y, 3); add({ kind: "sign", x: sx, y: sy, blocks: true, name: label, text, icon }); };
  const put2 = (x: number, y: number, kind: DecorKind, name?: string, blocks = true) => { const [dx, dy] = nearFree(x, y, 3); decor(dx, dy, kind, blocks, name); };
  const npcAt = (id: string, x: number, y: number, wander = 0) => { const [nx, ny] = nearFree(x, y, 4); npc(id, nx, ny, wander); };
  const monsterAt = (id: string, x: number, y: number, wander?: number) => { const [nx, ny] = nearFree(x, y, 4); monster(id, nx, ny, wander); };
  /** A palisade of stakes round a camp, with a gap where the road comes in. */
  const palisade = (x0: number, y0: number, x1: number, y1: number, gap: "n" | "s" | "e" | "w", gapAt?: number, name = "Stake wall") => {
    const gx = gapAt ?? Math.floor((x0 + x1) / 2), gy = gapAt ?? Math.floor((y0 + y1) / 2);
    for (let x = x0; x <= x1; x += 2) { if (!(gap === "n" && Math.abs(x - gx) <= 1)) put2(x, y0, "stake", name); if (!(gap === "s" && Math.abs(x - gx) <= 1)) put2(x, y1, "stake", name); }
    for (let y = y0 + 2; y < y1; y += 2) { if (!(gap === "w" && Math.abs(y - gy) <= 1)) put2(x0, y, "stake", name); if (!(gap === "e" && Math.abs(y - gy) <= 1)) put2(x1, y, "stake", name); }
  };
  /** A military camp: tents round a fire, racks, a wagon, banners and a tower, inside a palisade. */
  const camp = (cx: number, cy: number, who: "rrr" | "fff" | "hollowmere", tents: number, tower = true) => {
    ground(cx, cy, 9, 7, who === "rrr" ? T.GRAVEL : T.PATH, 2);
    palisade(cx - 9, cy - 7, cx + 9, cy + 7, "s");
    decor(cx, cy, "hearth", true, who === "rrr" ? "The Regiment's cookfire, banked to regulation" : who === "fff" ? "A Federation cookfire with a kettle that stirs itself" : "A Hollowmere cookfire");
    const spots: [number, number][] = [[-6, -4], [6, -4], [-6, 3], [6, 3], [0, -5], [-3, 5]];
    for (let i = 0; i < Math.min(tents, spots.length); i++) put2(cx + spots[i][0], cy + spots[i][1], "tent", who === "rrr" ? "A Regiment tent, violet, pitched to the inch" : who === "fff" ? "A Federation tent, patched in four colours" : "A Hollowmere tent");
    const banner: DecorKind = who === "rrr" ? "banner_rrr" : who === "fff" ? "banner_fff" : "banner_hollowmere";
    put2(cx - 2, cy - 7, banner); put2(cx + 2, cy - 7, banner);
    put2(cx + 3, cy, "armour", who === "rrr" ? "Regiment weapon rack: halberds, racked by number" : who === "fff" ? "A rack of Federation weapons, no two alike" : "Hollowmere weapon rack");
    put2(cx - 3, cy, "wagon", who === "rrr" ? "Regiment supply wagon, under seal" : who === "fff" ? "A Federation wagon with a device in it that is on" : "Hollowmere supply wagon");
    if (tower) put2(cx + 7, cy - 6, "watchtower", who === "rrr" ? "Regiment watchtower" : who === "fff" ? "Federation watchtower, with a telescope" : "Hollowmere watchtower");
    put2(cx - 7, cy + 5, "crate", "Supplies"); put2(cx - 6, cy + 5, "barrel");
  };

  // ---------- 1. Deep Westmarch: the border ----------
  // Hollowmere's Westwatch outpost, north of the road at Westmarch's end: the kingdom's last post, and the first place anyone says the word Raria out loud.
  camp(92, 282, "hollowmere", 3);
  npcAt("hollowmere_lieutenant", 92, 280); npcAt("hollowmere_soldier", 88, 284, 2); npcAt("hollowmere_soldier", 96, 284, 2); npcAt("hollowmere_soldier", 92, 286, 3); npcAt("hollowmere_scout", 86, 280, 1);
  sign(92, 292, "Westwatch", "WESTWATCH. The Kingdom of Hollowmere's western post. Travellers are warned: the road beyond is not the kingdom's. Do not accept papers from anyone.", "hollowmere_cape");
  // The Regiment's camp north of the road, on the way to Raria's gate, and the checkpoint on the road itself.
  camp(44, 268, "rrr", 5);
  monsterAt("rrr_captain", 44, 266, 1); monsterAt("rrr_footman", 40, 270, 2); monsterAt("rrr_footman", 48, 270, 2); monsterAt("rrr_footman", 44, 273, 2); monsterAt("rrr_archer", 38, 264, 1); monsterAt("rrr_archer", 50, 264, 1);
  monsters("rrr_scout", 30, 256, 70, 300, 4);
  for (const x of [24, 26, 32, 34, 36]) put2(x, 282, "stake", "The Regiment's checkpoint");
  put2(22, 282, "banner_rrr"); put2(38, 282, "banner_rrr"); put2(36, 284, "wagon", "Regiment supply wagon, under seal"); put2(24, 285, "armour", "Halberds, racked");
  monsterAt("rrr_halberdier", 25, 280, 1); monsterAt("rrr_halberdier", 35, 280, 1);
  npcAt("raria_gate_captain", 30, 289); sign(33, 290, "Checkpoint", "BY ORDER OF THE RARE REALM REGIMENT. The road north is the Kingdom of Raria's. Present your writ. If you have no writ, present yourself to the captain. The Wise Friend sees.", "writ_of_passage");
  // The Federation's picket line, south of the road where the Free Marches begin.
  ground(58, 330, 6, 4, null); put2(58, 328, "banner_fff"); put2(55, 331, "tent", "A Federation tent, patched in four colours"); put2(61, 331, "device", "A Federation device, ticking. It is counting something.");
  npcAt("fff_ranger", 58, 333, 2); monsterAt("fff_picket", 52, 328, 3); monsterAt("fff_picket", 64, 328, 3); monsterAt("fff_picket", 58, 324, 3);
  sign(58, 336, "Picket line", "THE FREE FRIENDS FEDERATION. You are being watched, politely. The Free Marches lie south. We shoot what shoots first. Have a nice day.", "fff_cape_ranger");
  // The Stone Field: where the first fighting was, and the old watch-stones that face west, toppled the same way as the ones on the Westmarch road.
  ground(62, 290, 8, 5, null);
  for (const [x, y] of [[56, 288], [60, 292], [64, 287], [68, 291], [58, 294], [66, 294]] as const) put2(x, y, "bones", "The dead of the Stone Field: Hollowmere's and Raria's, in the same ground", false);
  put2(62, 288, "armour", "A broken halberd, driven into the turf"); put2(60, 290, "armour", "A Hollowmere shield, split"); put2(65, 290, "rubble", "A cold fire, and a cooking pot nobody came back for");
  for (const x of [54, 58, 62, 66, 70]) put2(x, 284, "rubble", "A toppled watch-stone, fallen westward, like the ones on the Westmarch road");
  monsters("deserter", 50, 284, 74, 298, 4); monsters("skeleton", 52, 286, 72, 296, 3); monsters("wolf", 40, 300, 80, 340, 4);
  // Old Westwatch: the tower the kingdom built out here long ago and forgot, ruined, with a deserters' fire in it.
  ground(18, 334, 5, 4, T.GRAVEL, 2);
  for (const [x, y] of [[14, 330], [16, 330], [20, 330], [22, 330], [14, 332], [22, 332], [14, 336], [22, 336], [16, 338], [20, 338]] as const) put2(x, y, "ruin_wall", "The walls of Old Westwatch");
  put2(18, 331, "pillar", "A pillar of Old Westwatch, carved with the crown of Hollowmere and, under it, older, the symbol from the stones"); put2(18, 334, "hearth", "A deserters' fire, still warm"); put2(20, 335, "chest", "A deserter's cache: empty, except for a Regiment writ with the name cut out");
  monsterAt("deserter", 16, 333, 2); monsterAt("deserter", 21, 336, 2);
  // The hidden hollow: a ring of cliff west of the checkpoint with one way in, and in it a statue older than any kingdom, and the one who watches it.
  ground(12, 302, 6, 6, null);
  for (let y = 296; y <= 308; y++) for (let x = 6; x <= 18; x++) { const edge = Math.min(x - 6, 18 - x, y - 296, 308 - y); if (edge <= 1 && !(y >= 301 && y <= 303 && x >= 17)) { clearAt(x, y); put(x, y, T.CLIFF); } }
  for (let y = 298; y <= 306; y++) for (let x = 8; x <= 16; x++) put(x, y, T.DARK_GRASS);
  put2(11, 301, "wise_friend", "A statue of the Wise Friend, blindfolded, moss to the blindfold. Older than any kingdom west of the Spine. Raria says it has always been here. So does the moss."); npcAt("west_watcher", 13, 304);
  put2(9, 305, "torch", "A candle, lit. Somebody comes here."); put2(15, 299, "flowers", "Fresh flowers at the statue's feet, every day", false);
  // Resources: blackiron and pewter on the outcrops, pines on the heights.
  rockCluster(70, 316, 4, "blackiron", 5); rockCluster(76, 276, 4, "pewter", 4); rockCluster(30, 340, 4, "blackiron", 4);
  scatter(4, 256, 84, 346, 36, (x, y) => tree(x, y, random() < 0.5 ? "pine" : "tree"), (x, y) => (get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS) && !occupied(x, y) && Math.abs(y - 300) > 6);
  sign(80, 300, "The West Road", "WEST: Deep Westmarch, the Regiment's checkpoint, and Raria (so the Regiment says). SOUTH: the Free Marches and the FFF Fortress. EAST: Westmarch and the kingdom. Mind the field.");

  // ---------- 2. The Free Marches and the FFF Fortress ----------
  {
    const cx = 40, cy = 404;
    ground(cx, cy, 24, 20, T.COBBLE, 5);
    palisade(cx - 20, cy - 16, cx + 20, cy + 16, "s", cx, "The Federation's palisade: every stake a different height, every one sharp");
    // The Great Hall, two storeys of stone, Fellow Free's office at the north end of it.
    building(cx - 9, cy - 12, cx + 9, cy - 2, "s", T.STONE, undefined, { name: "The Great Hall of the Federation", color: "#2f7d68", walls: "stone", storeys: 2, tall: 6, chimney: true });
    npc("fellow_free", cx, cy - 9); decor(cx - 1, cy - 11, "table", true, "A map of the west covered in red string. Three of the strings go off the map."); decor(cx + 2, cy - 11, "shelf", true, "An enormous stack of paperwork. The bottom sheet is dated before the fortress was built.");
    for (const [dx, dy] of [[-7, -11], [-5, -11], [-3, -11], [7, -11], [5, -11], [-7, -4], [7, -4], [-7, -8], [7, -8], [-4, -4], [4, -4], [-2, -3], [2, -3], [0, -4]] as const) decor(cx + dx, cy + dy, "device", true, "One of fourteen magical devices, all running. This one hums in a different key from the others.");
    decor(cx - 6, cy - 6, "armour", true, "A sword hanging from the ceiling. There are three. Nobody has asked why."); decor(cx + 6, cy - 6, "armour", true, "The second of the three swords hanging from the ceiling."); decor(cx, cy - 6, "armour", true, "The third sword hanging from the ceiling, lower than the others, at exactly head height.");
    decor(cx + 4, cy - 9, "cannon", true, "A half-built magical cannon. It is pointed at the door. It is warm."); npc("fff_knight_asleep", cx - 4, cy - 8); npc("fff_wizard_arguing", cx - 3, cy - 5); decor(cx - 2, cy - 5, "device", true, "A magical artifact that is not a toaster and would like that noted.");
    monster("admiral_peck", cx + 3, cy - 5, 3);
    // The Wizard Tower, the Library and the Laboratory to the sides; the workshops, the forge, the vaults and the device room along the south.
    building(cx - 18, cy - 12, cx - 12, cy - 6, "s", T.STONE, undefined, { name: "The Wizard Tower", color: "#4fa58a", walls: "stone", roof: "cone", round: true, storeys: 2, tall: 12, spire: 14 });
    npc("fff_archwizard", cx - 15, cy - 9); decor(cx - 17, cy - 11, "shelf", true, "Sigils, by colour, then by argument"); decor(cx - 13, cy - 11, "device", true, "A device that grows crystals in jars. The jars are labelled in three hands.");
    building(cx + 12, cy - 12, cx + 18, cy - 6, "s", T.STONE, undefined, { name: "The Library", color: "#1d4f42", walls: "stone", chimney: true });
    npc("fff_librarian", cx + 15, cy - 9); for (const dx of [13, 15, 17]) decor(cx + dx, cy - 11, "shelf", true, "Books. Half the margins are corrections in red ink."); decor(cx + 13, cy - 7, "table", true, "A reading table with a map of Raria on it, annotated: 'NOT THERE IN SPRING'");
    building(cx - 18, cy, cx - 10, cy + 6, "n", T.WOOD, undefined, { name: "The Artisan Workshops", color: "#b87333", walls: "plank", chimney: true });
    npc("fff_artificer", cx - 14, cy + 3); decor(cx - 17, cy + 5, "device", true, "A device being built. Or taken apart. Both, the artificer says."); decor(cx - 11, cy + 5, "crate", true, "Copper, verdigris, gears, teeth"); decor(cx - 11, cy + 1, "table", true, "A workbench with eleven tools on it, in order");
    building(cx - 18, cy + 9, cx - 10, cy + 15, "n", T.STONE, undefined, { name: "The Enchanted Forge", color: "#8a2f2b", walls: "stone", chimney: true });
    add({ kind: "furnace", x: cx - 16, y: cy + 14, blocks: true, name: "The Enchanted Furnace" }); add({ kind: "anvil", x: cx - 12, y: cy + 14, blocks: true, name: "Anvil (it hums)" }); npc("fff_armourer", cx - 14, cy + 11); decor(cx - 11, cy + 11, "armour", true, "Federation plate, drying. Plate does not dry. This plate does.");
    building(cx + 10, cy, cx + 18, cy + 6, "n", T.STONE, undefined, { name: "The Experimental Laboratory", color: "#9945ff", walls: "stone" });
    for (const [dx, dy] of [[11, 5], [13, 5], [15, 5], [17, 5], [17, 1]] as const) decor(cx + dx, cy + dy, "device", true, "An experiment. The label says DO NOT, and then the rest has burnt off."); decor(cx + 12, cy + 1, "table", true, "A bench of glass and copper, with something in a jar that is watching you");
    building(cx + 10, cy + 9, cx + 18, cy + 15, "n", T.STONE, undefined, { name: "The Strange Device Room", color: "#4fa58a", walls: "stone" });
    for (const [dx, dy] of [[11, 11], [14, 10], [17, 11], [12, 14], [16, 14]] as const) decor(cx + dx, cy + dy, "device", true, "A strange device. The artificer says it is for later.");
    building(cx - 3, cy + 9, cx + 4, cy + 15, "n", T.STONE, undefined, { name: "The Storage Vaults", color: "#6d6b67", walls: "stone" });
    for (const [dx, dy] of [[-2, 14], [0, 14], [2, 14], [3, 11], [-2, 11]] as const) decor(cx + dx, cy + dy, "chest", true, "A Federation strongbox, locked with a device"); decor(cx + 1, cy + 11, "crate", true, "Cannon shot. Each one is labelled with the name of the artisan who made it.");
    // The Ranger Yard and the training courtyard: targets, racks, and the rangers who use them.
    for (const [dx, dy] of [[5, 1], [7, 1], [9, 1]] as const) decor(cx + dx, cy + dy, "target", true, "A ranger's target, with a copper arrow dead centre"); decor(cx + 7, cy + 4, "fence"); npc("fff_ranger_captain", cx + 6, cy + 3, 1); decor(cx + 9, cy + 5, "hay", true, "Straw butts");
    decor(cx - 6, cy + 2, "armour", true, "The courtyard's practice rack: glaives and swords"); decor(cx - 8, cy + 4, "target", true, "A knight's target, in pieces"); npc("fff_ranger", cx - 5, cy + 5, 3);
    decor(cx, cy + 2, "cannon", true, "The Federation's cannon, finished, on its carriage, pointed north. At Raria. In case."); decor(cx - 2, cy - 1, "banner_fff"); decor(cx + 2, cy - 1, "banner_fff");
    decor(cx - 19, cy - 14, "banner_fff"); decor(cx + 19, cy - 14, "banner_fff"); for (const [dx, dy] of [[-10, -1], [10, -1], [-10, 8], [10, 8]] as const) decor(cx + dx, cy + dy, "lamp");
    // The gate: the Gate-Warden, and the two wardens who count you in.
    npc("fff_gatewarden", cx, cy + 18); monster("fff_warden", cx - 3, cy + 18, 1); monster("fff_warden", cx + 3, cy + 18, 1); decor(cx - 2, cy + 17, "banner_fff"); decor(cx + 2, cy + 17, "banner_fff");
    sign(cx + 1, cy + 20, "The FFF Fortress", "THE FREE FRIENDS FEDERATION. FFF FORTRESS. No kings, no queens, no bureaucracy except the Gate-Warden, who is sorry about it. State your business to him. Then state it again more slowly.", "fff_cape_elite");
    // Freehold, the village outside the gate: cottages, the outfitter, the bank, a cooking fire, and the Federation's people, who mostly keep to themselves.
    ground(cx + 30, cy + 8, 10, 10, T.PATH, 3);
    building(cx + 24, cy - 4, cx + 30, cy + 1, "s", T.WOOD, undefined, { name: "Free Clothes", color: "#2f7d68", walls: "plank" }); npc("fff_outfitter", cx + 27, cy - 2); decor(cx + 25, cy - 3, "shelf"); decor(cx + 29, cy - 3, "crate");
    building(cx + 33, cy - 4, cx + 39, cy + 1, "s", T.STONE, undefined, { name: "The Free Bank (no fees)", color: "#8f9cb2", walls: "stone" }); for (const bx of [cx + 34, cx + 36, cx + 38]) add({ kind: "bank", x: bx, y: cy - 3, blocks: true, name: "Bank booth" }); npc("banker", cx + 36, cy - 1);
    building(cx + 24, cy + 12, cx + 30, cy + 17, "n", T.WOOD, undefined, { name: "A Freehold cottage", color: "#b87333", walls: "timber", chimney: true }); decor(cx + 25, cy + 16, "bed"); decor(cx + 29, cy + 16, "device", true, "A device for keeping the kettle warm, which also tells the time");
    building(cx + 33, cy + 12, cx + 39, cy + 17, "n", T.WOOD, undefined, { name: "A Freehold cottage", color: "#4fa58a", walls: "plank", chimney: true }); decor(cx + 34, cy + 16, "bed"); decor(cx + 38, cy + 16, "shelf");
    add({ kind: "range", x: cx + 31, y: cy + 6, blocks: true, name: "Cooking fire" }); decor(cx + 28, cy + 5, "bench"); decor(cx + 34, cy + 5, "bench"); decor(cx + 31, cy + 3, "banner_fff"); decor(cx + 31, cy + 9, "lamp");
    for (const [dx, dy] of [[26, 7], [36, 8], [30, 10], [34, 3], [27, 3]] as const) npc("fff_villager", cx + dx, cy + dy, 3);
    sign(cx + 31, cy + 12, "Freehold", "FREEHOLD. Nobody's village. The bank is free. The fire is free. The fish are free if you catch them. The Federation's shops are through the gate; the Gate-Warden decides who the Federation knows.", "fff_cap");
    // Skilling round the marches: blackiron, moonsilver and inkcoal in the outcrops, pines, net and rod spots on the western shore.
    rockCluster(14, 428, 5, "blackiron", 5); rockCluster(30, 434, 4, "moonsilver", 3); rockCluster(22, 438, 4, "inkcoal", 4); rockCluster(70, 430, 4, "pewter", 4);
    scatter(2, 356, 90, 444, 40, (x, y) => tree(x, y, random() < 0.6 ? "pine" : "oak"), (x, y) => (get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS) && !occupied(x, y) && !(Math.abs(x - cx) < 24 && Math.abs(y - cy) < 20));
    shoreSpots(2, 380, 30, 440, "net", 3); shoreSpots(2, 380, 30, 440, "lure", 2);
    // The pickets at the marches' northern edge, and the wild things.
    monsters("fff_picket", 10, 354, 90, 372, 4); monsters("wolf", 4, 426, 90, 444, 3); monsters("bark_lurker", 60, 356, 92, 380, 2);
  }

  // ---------- 3. Lawgate: Raria's eastern march, facing the Drakespine (the kingdom itself is far to the west: farwest.ts) ----------
  {
    const cx = 26, cy = 214, x0 = 10, y0 = 196, x1 = 42, y1 = 232;
    ground(cx, cy, 20, 22, T.COBBLE, 0);
    for (let y = y0 - 3; y <= y1 + 3; y++) for (let x = x0 - 3; x <= x1 + 3; x++) if (inBounds(x, y)) { const tt = get(x, y); if (tt === T.CLIFF || tt === T.SWAMP || isWater(tt)) put(x, y, T.GRASS); }
    // The wall, gates on the West Road (south) and the Crown Road (west) and the Spine road (north); cobbles inside.
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : T.COBBLE);
    for (const x of [cx - 1, cx, cx + 1]) { put(x, y1, T.COBBLE); put(x, y0, T.COBBLE); }
    for (const y of [cy - 1, cy, cy + 1]) put(x0, y, T.COBBLE);
    // The Governor's Hall in the middle, the Lawgate chapel, the garrison, the inn, the provisioner, a sigil press and houses.
    building(cx - 5, cy - 6, cx + 5, cy + 1, "s", T.CARPET, undefined, { name: "The Governor's Hall", color: "#3b2a52", walls: "stone", roof: "flat", storeys: 2, tall: 6 });
    decor(cx, cy - 5, "throne", true, "The Governor's chair: lower than a throne by exactly the regulation height"); npc("lawgate_governor", cx, cy - 4); decor(cx - 4, cy - 5, "banner_rrr"); decor(cx + 4, cy - 5, "banner_rrr"); decor(cx - 3, cy - 1, "wise_friend", true, "The Wise Friend, in the Governor's Hall");
    building(x0 + 2, y0 + 2, x0 + 9, y0 + 9, "s", T.STONE, undefined, { name: "The Lawgate chapel", color: "#efe6c8", walls: "stone", roof: "cone", spire: 8 });
    add({ kind: "altar", x: x0 + 5, y: y0 + 4, blocks: true, name: "Lawgate altar", text: "wise" }); decor(x0 + 5, y0 + 3, "wise_friend", true, "The Wise Friend, over the Lawgate altar"); decor(x0 + 3, y0 + 7, "bench"); decor(x0 + 7, y0 + 7, "bench");
    building(x1 - 9, y0 + 2, x1 - 2, y0 + 9, "s", T.STONE, undefined, { name: "The Lawgate garrison", color: "#4a2b3a", walls: "stone", storeys: 2, chimney: true });
    npc("rrr_soldier", x1 - 5, y0 + 5, 1); for (const dx of [-8, -6, -4]) decor(x1 + dx, y0 + 3, "armour", true, "Regiment plate, racked by number"); decor(x1 - 3, y0 + 7, "bed"); decor(x1 - 8, y0 + 7, "bed");
    building(x0 + 2, y1 - 9, x0 + 9, y1 - 2, "n", T.WOOD, undefined, { name: "The Obedient Hound", color: "#4a3560", walls: "timber", chimney: true });
    npc("lawgate_innkeeper", x0 + 5, y1 - 6); decor(x0 + 3, y1 - 4, "table"); decor(x0 + 7, y1 - 4, "table"); decor(x0 + 8, y1 - 7, "barrel"); add({ kind: "range", x: x0 + 3, y: y1 - 7, blocks: true, name: "Inn kitchen range" });
    building(x1 - 9, y1 - 9, x1 - 2, y1 - 2, "n", T.STONE, undefined, { name: "The Lawgate Exchange", color: "#8f9cb2", walls: "stone" }); for (const bx of [x1 - 8, x1 - 6, x1 - 4]) add({ kind: "bank", x: bx, y: y1 - 3, blocks: true, name: "Bank booth" }); npc("banker", x1 - 6, y1 - 5);
    for (const [dx, dy] of [[-10, 2], [10, 4], [-8, 8], [8, -2], [0, 6]] as const) npc("raria_villager", cx + dx, cy + dy, 3);
    for (const [dx, dy] of [[-6, 4], [6, 4], [-12, -2], [12, -2]] as const) decor(cx + dx, cy + dy, "lamp");
    monster("royal_ranger", x0 + 11, y0 + 11, 0); monster("royal_ranger", x1 - 11, y1 - 11, 0); npc("rrr_soldier", cx - 3, cy + 4, 4); npc("rrr_soldier", cx + 3, cy + 4, 4);
    for (const x of [cx - 2, cx + 2]) { decor(x, y0 + 1, "banner_rrr"); decor(x, y1 - 1, "banner_rrr"); }
    sign(cx + 2, y1 + 2, "Lawgate", "LAWGATE. The Kingdom of Raria's eastern march. The Crown Road runs west to the city of Raria, eleven days by cart, less by the Summons. The Law is kept here; keep it. Writs are shown at the gate.", "rarian_mantle");
    sign(x0 - 2, cy + 3, "The Crown Road", "WEST: the Crown Road across the Crownlands to Raria, the city round the palace. NORTH: the Spine Watch. SOUTH: the West Road, the Regiment's checkpoint, and Hollowmere, which does not know what it is looking at.");
    // The Regiment's training ground outside the south gate, the checkpoint at the gate, farms on the march.
    ground(cx + 16, y1 + 8, 7, 5, T.GRAVEL, 0);
    for (const x of [cx + 12, cx + 14, cx + 16, cx + 18, cx + 20]) put2(x, y1 + 5, "target", "A Regiment target, every arrow in the same hole"); for (const x of [cx + 11, cx + 15, cx + 19]) put2(x, y1 + 12, "stake", "Practice stakes"); put2(cx + 22, y1 + 8, "armour", "Practice halberds"); put2(cx + 10, y1 + 8, "banner_rrr");
    npcAt("rrr_soldier", cx + 14, y1 + 9, 2); npcAt("rrr_soldier", cx + 18, y1 + 9, 2); monsterAt("rrr_footman", cx + 16, y1 + 7, 1);
    for (const x of [cx - 4, cx + 4]) put2(x, y1 + 7, "banner_rrr"); monsterAt("rrr_halberdier", cx - 5, y1 + 6, 1); monsterAt("rrr_halberdier", cx + 5, y1 + 6, 1);
    for (const [fx, fy] of [[12, 244], [40, 246], [10, 254], [42, 256]] as const) { put2(fx, fy, "hay", "Rarian hay, baled to a standard"); put2(fx + 2, fy, "fence"); }
    // The Spine Watch, north on the gravel road, where the Regiment looks at the Drakespine and the Drakespine looks back.
    camp(38, 168, "rrr", 3, true);
    monsterAt("rrr_captain", 38, 166, 1); monsterAt("rrr_archer", 34, 170, 1); monsterAt("rrr_archer", 42, 170, 1); monsterAt("rrr_footman", 38, 172, 2); monsters("rrr_scout", 20, 156, 50, 186, 2);
    sign(cx, y0 - 4, "The north road", "NORTH: the Spine Watch, and the Drakespine beyond it (dragons; the Regiment does not go further).");
  }

  // ---------- 5. Hollowmere: the kingdom shows itself, in Friendhollow and along the Westmarch road ----------
  {
    const m = (mx: number, my: number): [number, number] => mainlandToWorld(mx, my);
    // The garrison officer by the square, soldiers on patrol, a scout, and banners of the crown on the way out of town.
    const [ox, oy] = m(126, 112); npcAt("hollowmere_officer", ox, oy); npcAt("hollowmere_soldier", ...m(118, 116), 6); npcAt("hollowmere_soldier", ...m(130, 122), 6); npcAt("hollowmere_scout", ...m(112, 124), 4); npcAt("hollowmere_messenger", ...m(100, 118), 8);
    const [bx, by] = m(124, 110); put2(bx, by, "banner_hollowmere"); const [bx2, by2] = m(128, 110); put2(bx2, by2, "banner_hollowmere");
    // The road garrison at the mainland's western edge, where the Westmarch road leaves the kingdom.
    camp(176, 240, "hollowmere", 3, true);
    npcAt("hollowmere_soldier", 172, 242, 2); npcAt("hollowmere_soldier", 180, 242, 2); npcAt("hollowmere_messenger", 176, 246, 6); npcAt("hollowmere_scout", 170, 238, 2);
    sign(176, 250, "The road west", "THE KINGDOM OF HOLLOWMERE. The road west is the kingdom's as far as Westwatch, and the kingdom's soldiers walk it. Beyond Westwatch, nobody's. Report anything in violet.", "hollowmere_cape");
    // Patrols along the Westmarch road.
    npcAt("hollowmere_soldier", 150, 290, 8); npcAt("hollowmere_soldier", 120, 292, 8); npcAt("hollowmere_messenger", 134, 290, 10);
  }

  // ---------- 6. The Burned: Ashfall's dead, round the Order of the Ember's fortress ----------
  {
    // Every build the Realm's villages have, and a knight of the Order, scattered through the ash round the lava moat; the low levels nearer the pass, the high nearer the fortress.
    const near: Record<string, [number, number, number, number]> = {};
    BURNED_BUILDS.forEach((build, index) => { const t = index / (BURNED_BUILDS.length - 1); near[`burned_${build}`] = [44 + Math.round(t * 10), 64 + Math.round(t * 8), 104 - Math.round(t * 8), 128 - Math.round(t * 10)]; });
    for (const [id, [ax, ay, bx, by]] of Object.entries(near)) monsters(id, ax, ay, bx, by, id === "burned_knight" ? 2 : 3);
    // Two of them carved at the fortress road: the Order's warning, in the Ring's fashion.
    for (const [x, y, state] of [[62, 118, "toppled"], [84, 118, "buried"]] as const) { const [sx, sy] = nearFree(x, y, 4); add({ kind: "decor", decor: "monument", x: sx, y: sy, blocks: state !== "buried", name: `Statue of one of the Burned (${state})`, monster: "burned_average", state }); }
    sign(72, 124, "The Burned", "THE ORDER OF THE EMBER WARNS YOU. The dead of the villages Ashfall took walk this ash in the red of old embers, every kind of Friend that ever lived in a village, and one of ours. They carry what they carried. Water quenches them. Nothing else does.", "ash_heart");
  }
}
