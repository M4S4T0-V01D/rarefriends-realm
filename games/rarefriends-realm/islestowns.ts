/**
 * The Mizukai Isles' towns, shrines, forests and dungeons (What Rises in the East), laid on the land isles.ts raised.
 *
 * Kurohama is the harbour city facing the mainland: the harbourmaster, the Exchange, the Sleeping Crane, the Bureau of
 * Seals, the Ironsand Forge, the magistrate, the market. Takamori is the castle town at the island's heart, the lord's
 * hall inside a stone-walled bailey under the keep, the dojo, the armourer and the bowyer outside it. The Thousand
 * Steps climb from Takamori through shrine gates to Kumoyama, the shrine on Mount Kumo's shoulder; the mountain path
 * goes on past it to the mouth of the Hollow. Tanabe farms the terraces in the south, Yumoto keeps the hot springs, and
 * Isohama's fishers work the south-east bay. Every other island has its own place: see each block below.
 */
import { OVERWORLD_H, T, isWater, type Building, type DecorKind, type GenContext, type RegionId, type World, type worldTools } from "./world.ts";
import type { RockKind, TreeKind } from "./data.ts";
import { ISLANDS, MIZUKAI_DUNGEONS, MIZUKAI_PLACES, MIZUKAI_ROOFS, type buildIsles } from "./isles.ts";

type Tools = ReturnType<typeof worldTools>;
type Isle = ReturnType<typeof buildIsles>;


export function buildMizukaiTowns(ctx: GenContext, t: Tools, isle: Isle, places: World["places"]) {
  const { get, put, add, decor, npc, building, clearAt, fillRect, tree, rock, herb, spot, inBounds, tileIndex, monsters, scatter } = t;
  const { at, nearFree, put2, npcAt, monsterAt, sign, occupied, regionIs, WALKABLE } = isle;
  const R = MIZUKAI_ROOFS, random = ctx.random, pt = ([x, y]: [number, number]) => ({ x, y });
  /** A Mizukai building: hipped roof of dark tile, white plaster between dark posts. */
  const house = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}, floor: number = T.WOOD) =>
    building(x0, y0, x1, y1, door, floor, undefined, { name, style: "mizukai", walls: "mizukai", hip: true, color: R.slate, chimney: false, ...extra });
  /** Clear a patch (objects, spawns), turn rough ground to grass, and pave a square of it. */
  const ground = (x0: number, y0: number, x1: number, y1: number, paving: number | null = null) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inBounds(x, y)) continue;
      const tt = get(x, y);
      if (isWater(tt) || tt === T.VOID || tt === T.WOOD && ctx.objectAt[tileIndex(x, y)] >= 0 && ctx.objects[ctx.objectAt[tileIndex(x, y)]].kind === "dock") continue;
      if (ctx.objectAt[tileIndex(x, y)] >= 0 && ctx.objects[ctx.objectAt[tileIndex(x, y)]].kind !== "dock") clearAt(x, y);
      for (let i = ctx.spawns.length - 1; i >= 0; i--) if (ctx.spawns[i].x === x && ctx.spawns[i].y === y && ctx.spawns[i].kind === "monster") ctx.spawns.splice(i, 1);
      if (tt === T.CLIFF || tt === T.SWAMP || tt === T.SNOW || tt === T.LAVA) put(x, y, T.GRASS);
      if (paving !== null && tt !== T.WOOD && tt !== T.STONE) put(x, y, paving);
      ctx.lift[tileIndex(x, y)] = Math.min(ctx.lift[tileIndex(x, y)], 1.4);
    }
  };
  /** Even out the ground under a site (a town on a slope stands on a terrace). */
  const level = (x0: number, y0: number, x1: number, y1: number) => {
    let sum = 0, n = 0; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { sum += ctx.lift[tileIndex(x, y)]; n++; }
    const mean = sum / Math.max(1, n); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.lift[tileIndex(x, y)] = mean;
  };
  const torii = (x: number, y: number, name = "Shrine gate") => { clearAt(x, y); decor(x, y, "torii", false, name); };
  const lanterns = (points: readonly (readonly [number, number])[], kind: DecorKind = "stone_lantern", name?: string) => { for (const [x, y] of points) if (!occupied(x, y) && WALKABLE(get(x, y))) decor(x, y, kind, true, name); };
  const homeInside = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", what: "home" | "farm" | "fisher" = "home") => {
    const back = door === "s" ? y0 + 1 : door === "n" ? y1 - 1 : (y0 + y1) >> 1, bx = door === "e" ? x0 + 1 : door === "w" ? x1 - 1 : x0 + 1;
    decor(bx, back, "bed", true, what === "fisher" ? "A futon, smelling of the sea" : "A futon, rolled out for the night");
    decor(door === "e" || door === "w" ? bx : x1 - 1, door === "e" || door === "w" ? (door === "e" ? y0 + 1 : y1 - 1) : back, what === "farm" ? "crate" : "shelf", true, what === "farm" ? "Rice in straw sacks" : what === "fisher" ? "Floats, hooks, a mended net" : "A household shrine shelf: a candle, a cup of tea, a name");
  };

  // ---------- Kurohama: the harbour city ----------
  {
    const [cx, cy] = MIZUKAI_PLACES.kurohama;
    // The town is built out to a stone quay on the bay (made ground where the shallows were); the pier runs on out from it.
    const pier = (x: number, y: number) => get(x, y) === T.WOOD && x < cx - 16;
    for (let y = cy - 22; y <= cy + 24; y++) for (let x = cx - 16; x <= cx + 28; x++) {
      if (pier(x, y) || (ctx.objectAt[tileIndex(x, y)] >= 0 && ctx.objects[ctx.objectAt[tileIndex(x, y)]].kind === "dock")) continue;
      put(x, y, x <= cx - 12 ? T.STONE : T.GRAVEL);
    }
    ground(cx - 16, cy - 22, cx + 28, cy + 24, null); level(cx - 16, cy - 22, cx + 28, cy + 24);
    // The quay's edge against the sea, the harbour road through the middle, the cross street.
    fillRect(cx - 12, cy - 1, cx + 28, cy + 1, T.STONE); fillRect(cx + 5, cy - 22, cx + 7, cy + 24, T.STONE);
    // North-west: the harbourmaster, the Exchange, two warehouses.
    house(cx - 11, cy - 10, cx - 5, cy - 3, "s", "Kurohama harbour office", { color: R.charcoal });
    decor(cx - 10, cy - 9, "table", true, "Tide tables, manifests, a stamp worn smooth"); decor(cx - 6, cy - 9, "shelf", true, "Charts of the Isles, every island inked in, and one blank patch west of Ashigane");
    npc("kuro_harbourmaster", cx - 8, cy - 6);
    house(cx - 3, cy - 12, cx + 4, cy - 3, "s", "The Kurohama Exchange", { color: R.charcoal, storeys: 2 }, T.STONE);
    for (const by of [cy - 10, cy - 8, cy - 6]) add({ kind: "bank", x: cx - 2, y: by, blocks: true, name: "Bank booth" }); npc("banker", cx, cy - 8);
    decor(cx + 3, cy - 11, "chest", true, "The Exchange's strongbox, iron-bound, two locks");
    house(cx - 11, cy - 20, cx - 6, cy - 13, "s", "A harbour warehouse", { color: R.charcoal, walls: "mizukai" }); decor(cx - 10, cy - 19, "crate", true, "Bales from the mainland, waiting on the tide"); decor(cx - 7, cy - 19, "barrel");
    house(cx - 3, cy - 21, cx + 3, cy - 15, "s", "A harbour warehouse", { color: R.charcoal }); decor(cx - 2, cy - 20, "crate", true, "Tea from Kibi, in cedar chests"); decor(cx + 2, cy - 20, "barrel");
    // North-east: the Sleeping Crane, the Bureau of Seals, homes.
    house(cx + 9, cy - 12, cx + 18, cy - 3, "s", "The Sleeping Crane", { storeys: 2, color: R.bark });
    npc("kuro_innkeeper", cx + 13, cy - 8); decor(cx + 10, cy - 11, "table"); decor(cx + 16, cy - 11, "table"); decor(cx + 10, cy - 5, "table"); add({ kind: "range", x: cx + 17, y: cy - 5, blocks: true, name: "Inn kitchen range" });
    house(cx + 20, cy - 12, cx + 27, cy - 3, "s", "The Bureau of Seals", { color: R.charcoal, walls: "mizukai" });
    npc("kuro_sealwright", cx + 23, cy - 7); decor(cx + 21, cy - 11, "shelf", true, "Seal paper in reams, ink in cakes, brushes by the hundred"); decor(cx + 26, cy - 11, "table", true, "A writing desk: a half-finished seal drying under a stone");
    house(cx + 9, cy - 21, cx + 14, cy - 15, "s", "A Kurohama house"); homeInside(cx + 9, cy - 21, cx + 14, cy - 15, "s");
    house(cx + 16, cy - 21, cx + 21, cy - 15, "s", "A Kurohama house", { color: R.charcoal }); homeInside(cx + 16, cy - 21, cx + 21, cy - 15, "s");
    house(cx + 23, cy - 21, cx + 28, cy - 15, "s", "A Kurohama house"); homeInside(cx + 23, cy - 21, cx + 28, cy - 15, "s");
    // South-west: the fish market, the general store, the clothier, the herbalist.
    house(cx - 11, cy + 3, cx - 4, cy + 9, "n", "The Kurohama fish market", { color: R.bark, walls: "plank" });
    npc("kuro_fishmonger", cx - 7, cy + 6); decor(cx - 10, cy + 8, "table", true, "Ice, and on it, everything the sea gave this morning"); decor(cx - 5, cy + 8, "barrel");
    house(cx - 2, cy + 3, cx + 3, cy + 9, "n", "Okiku's General Store"); npc("kuro_merchant", cx, cy + 6); decor(cx - 1, cy + 8, "shelf", true, "Everything a traveller forgets, in order");
    house(cx - 11, cy + 12, cx - 5, cy + 18, "n", "Sayo's Clothier", { color: R.charcoal }); npc("kuro_clothier", cx - 8, cy + 15); decor(cx - 10, cy + 17, "shelf", true, "Bolts of indigo cloth, folded square");
    house(cx - 3, cy + 12, cx + 3, cy + 18, "n", "Granny Ume's Herbs"); npc("kuro_apothecary", cx, cy + 15); decor(cx - 2, cy + 17, "shelf", true, "Jars of dried roots, every label in a careful hand"); add({ kind: "still", x: cx + 2, y: cy + 17, blocks: true, name: "Apothecary's still" });
    // South-east: the Ironsand Forge, the magistrate, a house, the harbour shrine.
    house(cx + 9, cy + 3, cx + 16, cy + 10, "n", "The Ironsand Forge", { color: R.charcoal, walls: "plank" }, T.STONE);
    npc("kuro_smith", cx + 12, cy + 6); add({ kind: "furnace", x: cx + 10, y: cy + 9, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: cx + 14, y: cy + 9, blocks: true, name: "Anvil" });
    house(cx + 18, cy + 3, cx + 26, cy + 10, "n", "The Magistrate's Office", { color: R.charcoal, storeys: 2 });
    npc("kuro_magistrate", cx + 22, cy + 7); decor(cx + 19, cy + 9, "table", true, "The magistrate's desk, and on it a petition about a cove that isn't on the charts"); decor(cx + 25, cy + 9, "shelf", true, "Records of the harbour court");
    house(cx + 9, cy + 14, cx + 14, cy + 20, "n", "A Kurohama house"); homeInside(cx + 9, cy + 14, cx + 14, cy + 20, "n");
    // The harbour shrine: a gate, two lanterns, a little hall to the sea's Friend.
    house(cx + 19, cy + 15, cx + 24, cy + 20, "n", "The Harbour Shrine", { walls: "lacquer", color: R.copper });
    add({ kind: "altar", x: cx + 21, y: cy + 18, blocks: true, name: "Harbour shrine altar", text: "mizukai" }); decor(cx + 21, cy + 17, "sacred_rope", true, "The harbour's sacred stone, roped, salt-white with spray. The sea's Friend is honoured here."); decor(cx + 23, cy + 17, "offering_box", true, "An offering box: coins for safe crossings, and a fish-hook or two");
    torii(cx + 21, cy + 13, "The harbour shrine's gate"); lanterns([[cx + 19, cy + 13], [cx + 24, cy + 13]]);
    // Lanterns down the harbour road, people on it, the dockhand on the quay, guards at the east end.
    for (let x = cx - 8; x <= cx + 26; x += 6) { if (!occupied(x, cy - 2)) decor(x, cy - 2, "paper_lantern"); if (!occupied(x + 3, cy + 2)) decor(x + 3, cy + 2, "paper_lantern"); }
    for (const [dx, dy] of [[0, -14], [10, 0], [20, -1], [-4, 12], [6, 18], [16, 12], [24, -18]] as const) npcAt("mizukai_villager", cx + dx, cy + dy, 4);
    npcAt("kuro_dockhand", cx - 13, cy - 8, 2); npcAt("mizukai_guard", cx + 28, cy - 3, 1); npcAt("mizukai_guard", cx + 28, cy + 3, 1);
    for (const [dx, dy] of [[-14, -16], [-14, -12], [-14, 12], [-14, 16]] as const) put2(cx + dx, cy + dy, (dx + dy) % 2 ? "crate" : "barrel");
    put2(cx - 13, cy + 20, "nets", "Nets drying on the quay"); put2(cx - 13, cy - 20, "nets", "Nets drying on the quay");
    sign(cx - 9, cy - 2, "Kurohama", "KUROHAMA, the black-sand harbour of Hinode. Boats to every island from the pier. The Harbour Road runs east to Takamori and the castle; the Thousand Steps climb from Takamori to Kumoyama. Mind the tide; mind the magistrate.", "katana");
    add({ kind: "well", x: cx + 6, y: cy + 12, blocks: true, name: "The harbour well" });
    places.kurohama = { x: cx - 2, y: cy };
  }

  // ---------- Takamori: the castle town ----------
  {
    const [cx, cy] = MIZUKAI_PLACES.takamori;
    ground(cx - 26, cy - 22, cx + 22, cy + 22, null); level(cx - 12, cy - 18, cx + 12, cy + 4);
    for (let y = cy - 22; y <= cy + 22; y++) for (let x = cx - 26; x <= cx + 22; x++) if (!isWater(get(x, y)) && get(x, y) !== T.STONE) put(x, y, ctx.noise2(x * 1.7, y * 1.7) > 0.72 ? T.GRASS : T.GRAVEL);
    // The bailey: a stone-walled square on its raised base, the gate on the south.
    const bx0 = cx - 11, by0 = cy - 17, bx1 = cx + 11, by1 = cy + 2;
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) { put(x, y, x === bx0 || x === bx1 || y === by0 || y === by1 ? T.WALL : T.GRAVEL); ctx.lift[tileIndex(x, y)] += 0.35; }
    for (let d = -1; d <= 1; d++) put(cx + d, by1, T.STONE);
    for (const [tx, ty] of [[bx0, by0], [bx1 - 3, by0], [bx0, by1 - 3], [bx1 - 3, by1 - 3]] as const) house(tx, ty, tx + 3, ty + 3, "s", "A corner tower of Takamori", { color: R.charcoal, storeys: 2, walls: "mizukai" }, T.STONE);
    // The lord's hall, the keep behind it, the garden either side.
    house(cx - 7, cy - 11, cx + 7, cy - 3, "s", "The Hall of Takamori", { color: R.charcoal, storeys: 2 }, T.CARPET);
    npc("lord_takamori", cx, cy - 9); npc("lady_suzu", cx + 3, cy - 8); decor(cx, cy - 10, "throne", true, "The lord's seat: a low dais, a lacquered armrest, a screen of painted cranes behind");
    for (const dx of [-5, 5]) { decor(cx + dx, cy - 10, "armour", true, "Takamori armour on its stand: lacquered plates laced in indigo"); decor(cx + dx, cy - 5, "paper_lantern"); }
    decor(cx - 3, cy - 5, "table", true, "A low table set for tea, the cups turned the proper way"); decor(cx + 4, cy - 5, "shelf", true, "Scrolls of the clan's history: three cabinets of it, and one drawer locked");
    put2(cx, cy - 15, "castle_keep", "Takamori Keep: five roofs high on its stone base, white walls, black tile. The lord's banner on the top. Only the lord climbs it.");
    for (const [dx, dy] of [[-9, -14], [-9, -6], [9, -14], [9, -6]] as const) { const [tx, ty] = [cx + dx, cy + dy]; if (!occupied(tx, ty)) tree(tx, ty, dx < 0 ? "sakura" : "pine"); }
    lanterns([[cx - 3, cy - 1], [cx + 3, cy - 1], [cx - 3, cy - 14], [cx + 3, cy - 14]]);
    npcAt("takamori_captain", cx - 2, cy); npcAt("mizukai_samurai", cx - 2, by1 + 1, 0); npcAt("mizukai_samurai", cx + 2, by1 + 1, 0); npcAt("mizukai_samurai", cx - 6, cy - 2, 3); npcAt("mizukai_samurai", cx + 6, cy - 2, 3);
    // Outside: the dojo west, the armourer and the bowyer east, the teahouse and houses south.
    house(cx - 24, cy + 4, cx - 14, cy + 12, "e", "The Takamori Dojo", { color: R.bark }, T.WOOD);
    npc("takamori_sensei", cx - 19, cy + 8); for (const dy of [5, 11]) decor(cx - 22, cy + dy, "target", true, "A straw practice post, cut almost through"); decor(cx - 16, cy + 5, "armour", true, "Practice armour, bamboo and leather");
    house(cx + 13, cy + 4, cx + 20, cy + 10, "w", "Gonzaburo's Armoury", { color: R.charcoal }, T.STONE); npc("takamori_armourer", cx + 16, cy + 7); decor(cx + 19, cy + 5, "armour", true, "Lacquered armour, laced and ready"); add({ kind: "anvil", x: cx + 19, y: cy + 9, blocks: true, name: "Anvil" });
    house(cx + 13, cy + 13, cx + 20, cy + 19, "w", "Asa's Bows", { color: R.bark }); npc("takamori_bowyer", cx + 16, cy + 16); decor(cx + 19, cy + 14, "shelf", true, "Long bows, taller than you, laminated bamboo, unstrung");
    house(cx - 12, cy + 12, cx - 4, cy + 18, "n", "The Plum Teahouse", { color: R.thatch, walls: "mizukai" }); npc("takamori_teahouse", cx - 8, cy + 15); decor(cx - 11, cy + 17, "table"); decor(cx - 6, cy + 17, "table");
    house(cx - 2, cy + 12, cx + 4, cy + 18, "n", "A Takamori house"); homeInside(cx - 2, cy + 12, cx + 4, cy + 18, "n");
    house(cx + 5, cy + 13, cx + 10, cy + 19, "n", "A Takamori house", { color: R.charcoal }); homeInside(cx + 5, cy + 13, cx + 10, cy + 19, "n");
    house(cx - 24, cy - 12, cx - 17, cy - 6, "e", "A samurai's house", { color: R.charcoal }); homeInside(cx - 24, cy - 12, cx - 17, cy - 6, "e");
    house(cx - 24, cy - 3, cx - 17, cy + 2, "e", "A samurai's house"); homeInside(cx - 24, cy - 3, cx - 17, cy + 2, "e");
    for (const [dx, dy] of [[-14, 0], [0, 8], [10, 2], [-6, 20], [18, -6]] as const) npcAt("mizukai_villager", cx + dx, cy + dy, 4);
    lanterns([[cx - 3, cy + 4], [cx + 3, cy + 4], [cx - 13, cy + 3], [cx + 12, cy + 3]], "paper_lantern");
    sign(cx - 4, cy + 4, "Takamori", "TAKAMORI. Seat of the Takamori, lords of Hinode. The hall receives petitioners from the hour of the snake. Swords are worn, not drawn. The Thousand Steps to Kumoyama begin west of the walls.", "katana");
    add({ kind: "well", x: cx + 6, y: cy + 4, blocks: true, name: "The castle-town well" });
    places.takamori = { x: cx, y: cy + 4 };
  }

  // ---------- Kumoyama: the shrine on Mount Kumo, the Thousand Steps, the pagoda, the sacred spring ----------
  {
    const [cx, cy] = MIZUKAI_PLACES.kumoyama;
    ground(cx - 12, cy - 10, cx + 13, cy + 8, null); level(cx - 12, cy - 10, cx + 13, cy + 8);
    for (let y = cy - 10; y <= cy + 8; y++) for (let x = cx - 12; x <= cx + 13; x++) put(x, y, Math.abs(x - cx) <= 1 ? T.STONE : T.GRAVEL);
    // The steps up from the castle town: shrine gates along the way, lanterns either side.
    const steps: [number, number][] = [];
    for (let y = cy + 9; y <= 274; y++) { const x = Math.round(1438 + (cx - 1438) * Math.max(0, Math.min(1, (274 - y) / (274 - cy - 9)))); for (let d = -1; d <= 1; d++) { clearAt(x + d, y); put(x + d, y, T.STONE); } steps.push([x, y]); }
    steps.forEach(([x, y], i) => { if (i % 9 === 4) torii(x, y, i < 20 ? "A gate on the Thousand Steps" : "A gate on the Thousand Steps, its paint worn by hands"); if (i % 6 === 1) lanterns([[x - 2, y], [x + 2, y]]); });
    // The main hall, the offering hall before it, the shrine office, the pagoda, the spring, the old cedar.
    house(cx - 5, cy - 9, cx + 5, cy - 3, "s", "The Main Hall of Kumoyama", { walls: "lacquer", color: R.copper, storeys: 2 }, T.WOOD);
    add({ kind: "altar", x: cx, y: cy - 7, blocks: true, name: "Kumoyama altar", text: "mizukai" }); decor(cx, cy - 8, "sacred_rope", true, "The shrine's heart: a mirror, a rope, a sprig of evergreen. The Friend of the mountain is here, the priestess says, the way the wind is here.");
    decor(cx - 4, cy - 8, "paper_lantern"); decor(cx + 4, cy - 8, "paper_lantern"); npc("kumo_priestess", cx - 2, cy - 5);
    decor(cx, cy - 1, "offering_box", true, "The offering box before the hall: a bell-rope above it to wake the Friend, and a box below for what you leave"); decor(cx - 2, cy - 1, "guardian", true, "A guardian lion-dog, mouth open: the first sound"); decor(cx + 2, cy - 1, "guardian", true, "A guardian lion-dog, mouth closed: the last sound");
    torii(cx, cy + 4, "The great gate of Kumoyama"); lanterns([[cx - 3, cy + 4], [cx + 3, cy + 4]]);
    house(cx - 12, cy - 2, cx - 7, cy + 4, "e", "The Kumoyama shrine office", { walls: "lacquer", color: R.copper }); npc("kumo_attendant", cx - 9, cy + 1); decor(cx - 11, cy - 1, "shelf", true, "Charms, incense, paper seals, fortunes folded small");
    decor(cx - 11, cy + 3, "wish_board", true, "A wish board hung with wooden plaques: safe crossings, good harvests, 'let my sister come home', 'let me pass the bow examination'");
    put2(cx + 10, cy - 6, "pagoda", "The Kumoyama pagoda: five roofs, a bronze spire, and nobody has ever counted the bells the same way twice");
    t.blob(cx + 9, cy + 3, 3, 2.2, T.WATER, 0.1, tt => !isWater(tt) && tt !== T.WALL); put2(cx + 12, cy + 2, "sacred_rope", "The sacred spring's stone, roped. The water is cold enough to hurt.");
    { const [tx, ty] = nearFree(cx - 9, cy - 8, 2); tree(tx, ty, "cedar"); }
    for (const [dx, dy] of [[-6, 6], [6, 6]] as const) npcAt("kumo_shrine_maiden", cx + dx, cy + dy, 2);
    sign(cx - 3, cy + 6, "Kumoyama", "KUMOYAMA, the shrine on Mount Kumo. Wash your hands at the spring; bow at the gate; ring once. The mountain path continues north past the pagoda. It is not a shrine path beyond the last gate.");
    // On up the mountain: the path to the Hollow's mouth, a last gate.
    const path = [[cx + 8, cy - 9], [cx + 14, cy - 18], [cx + 22, cy - 28], [cx + 26, cy - 34]] as const;
    t.road(path, 2, T.GRAVEL); torii(cx + 14, cy - 18, "The last gate: past it, the mountain is the mountain's");
    places.kumoyama = { x: cx, y: cy + 2 };
  }

  // ---------- Tanabe: the terraces ----------
  {
    const [cx, cy] = MIZUKAI_PLACES.tanabe;
    ground(cx - 12, cy - 6, cx + 12, cy + 8, T.GRAVEL);
    const farm = (x0: number, y0: number, door: "n" | "s" | "e" | "w", name: string) => { house(x0, y0, x0 + 6, y0 + 5, door, name, { color: R.thatch, walls: "mizukai" }); homeInside(x0, y0, x0 + 6, y0 + 5, door, "farm"); };
    farm(cx - 11, cy - 5, "s", "A Tanabe farmhouse"); farm(cx + 5, cy - 5, "s", "A Tanabe farmhouse"); farm(cx - 11, cy + 3, "n", "A Tanabe farmhouse");
    house(cx + 4, cy + 2, cx + 11, cy + 8, "n", "The headman's house", { color: R.thatch, storeys: 2 }); npc("tanabe_headman", cx + 7, cy + 5); decor(cx + 10, cy + 7, "crate", true, "The village's rice tax, counted twice");
    // The paddies: flooded terraces, a ditch of water between each, stepping down the slope.
    // (South of the village, down to the landing: a lane is kept along the middle to the boat.)
    t.road([[cx, cy + 6], [cx, cy + 40]], 2.2, T.GRAVEL);
    for (let row = 0; row < 6; row++) {
      const y0 = cy + 9 + row * 4;
      for (let y = y0; y <= y0 + 2; y++) for (let x = cx - 26; x <= cx + 26; x++) {
        if (at(x, y) < 0 || Math.abs(x - cx) < 3 || isWater(get(x, y)) || get(x, y) === T.STONE) continue;
        if (ctx.buildings.some(b => x >= b.x0 - 1 && x <= b.x1 + 1 && y >= b.y0 - 1 && y <= b.y1 + 1)) continue;
        if (get(x, y) === T.SAND || get(x, y) === T.GRAVEL) continue;
        clearAt(x, y); put(x, y, T.FARMLAND); ctx.lift[tileIndex(x, y)] = Math.max(0, 0.9 - row * 0.15);
      }
      for (let x = cx - 26; x <= cx + 26; x += 1) { const y = y0 + 3; if (at(x, y) >= 0 && Math.abs(x - cx) >= 3 && get(x, y) === T.FARMLAND) put(x, y, (x % 9 === 0) ? T.WATER : T.GRASS); }
    }
    for (const [dx, dy] of [[-16, 14], [14, 18], [-8, 24], [18, 26]] as const) npcAt("tanabe_farmer", cx + dx, cy + dy, 5);
    put2(cx - 2, cy - 2, "wayside_statue", "A little stone figure in a red bib, watching the paddies. Someone has left it a rice ball.");
    put2(cx + 3, cy + 1, "hay", "Rice straw, stacked to dry");
    sign(cx - 3, cy + 1, "Tanabe", "TANABE TERRACES. Rice for Takamori, and for whoever else asks politely. Keep to the bunds. The imps in the ditches are not children, whatever they sound like.");
    places.tanabe = { x: cx, y: cy };
  }

  // ---------- Yumoto: the hot springs ----------
  {
    const [cx, cy] = MIZUKAI_PLACES.yumoto;
    ground(cx - 10, cy - 12, cx + 8, cy + 8, null);
    house(cx - 9, cy - 11, cx + 1, cy - 5, "s", "The Steaming Moon", { storeys: 2, color: R.bark }); npc("yumoto_host", cx - 4, cy - 8);
    decor(cx - 8, cy - 10, "bed", true, "A guest's futon, aired and folded"); decor(cx, cy - 10, "bed", true, "A guest's futon, aired and folded"); decor(cx - 7, cy - 6, "table", true, "Tea, and a cold towel");
    for (const [x, y] of [[cx - 6, cy - 1], [cx + 6, cy + 4], [cx - 2, cy + 8]] as const) put2(x, y, "steam", "A hot spring: the water clouds the air and smells of the mountain's iron");
    lanterns([[cx - 3, cy - 3], [cx + 3, cy - 3], [cx - 8, cy + 4]]);
    for (const [dx, dy] of [[4, -6], [8, 0], [-8, 6], [2, 10]] as const) monsterAt("snow_monkey", cx + dx, cy + dy, 4);
    sign(cx + 2, cy - 2, "Yumoto", "YUMOTO SPRINGS. Wash before you soak. The monkeys were here first and know it.");
    places.yumoto = { x: cx, y: cy - 2 };
  }

  // ---------- Isohama: the fishers of the south-east bay ----------
  {
    const [cx, cy] = MIZUKAI_PLACES.isohama;
    ground(cx - 7, cy - 5, cx + 7, cy + 5, null);
    const hut = (x0: number, y0: number, door: "n" | "s" | "e" | "w") => { house(x0, y0, x0 + 4, y0 + 4, door, "A fisher's hut", { color: R.thatch, walls: "plank" }); homeInside(x0, y0, x0 + 4, y0 + 4, door, "fisher"); };
    hut(cx - 7, cy - 5, "s"); hut(cx + 2, cy - 5, "s"); hut(cx - 3, cy + 2, "n");
    for (const [dx, dy] of [[-6, 2], [6, 2], [0, -1]] as const) put2(cx + dx, cy + dy, (dx === 0 ? "nets" : "drying_rack") as DecorKind, dx === 0 ? "Nets drying" : "A drying rack of split fish");
    npcAt("isohama_fisher", cx + 1, cy + 1, 3); npcAt("isohama_fisher", cx + 5, cy + 4, 3);
    t.shoreSpots(cx - 16, cy - 10, cx + 16, cy + 18, "net", 4); t.shoreSpots(cx - 16, cy - 10, cx + 16, cy + 18, "lure", 2);
  }

  // ---------- The Old Cedars, the Whispering Bamboo, Kurokage Wood ----------
  {
    house(1386, 192, 1391, 197, "s", "The woodsman's hut", { color: R.bark, walls: "plank" }); npc("cedar_woodsman", 1388, 199); decor(1387, 193, "bed"); decor(1390, 193, "logpile", true, "Cedar, split and stacked, enough for a winter and a shrine");
    house(1530, 258, 1535, 263, "w", "A tea hut in the bamboo", { color: R.thatch, walls: "mizukai" }); npc("bamboo_teacher", 1532, 260); decor(1534, 259, "table", true, "A kettle, a bowl, a whisk, and nothing else");
    for (const [x, y] of [[1527, 256], [1527, 265]] as const) lanterns([[x, y]]);
    // Kurokage: a shrine nobody keeps, its gate fallen.
    const [kx, ky] = MIZUKAI_PLACES.kurokage;
    ground(kx - 4, ky - 4, kx + 4, ky + 4, T.GRAVEL);
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3]] as const) put2(kx + dx, ky + dy, "ruin_wall", "A shrine wall, black with moss");
    put2(kx, ky - 2, "sacred_rope", "A sacred rock, its rope rotted through. Something has gnawed it."); put2(kx + 2, ky + 3, "torii", "A shrine gate, fallen on its side. Nobody has stood it up."); put2(kx - 1, ky + 2, "stone_lantern", "A stone lantern, cold, its cap knocked off");
    sign(kx - 3, ky + 5, "Kurokage Wood", "KUROKAGE. The lord's foresters do not come past this stone. Neither should you.");
  }

  // ---------- The islands ----------
  // Shiogama: fishers, nets, the net-mender.
  {
    const cx = 1262, cy = 298;
    ground(cx - 8, cy - 6, cx + 8, cy + 3, null);
    const hut = (x0: number, y0: number, door: "n" | "s" | "e" | "w") => { house(x0, y0, x0 + 4, y0 + 4, door, "A Shiogama hut", { color: R.thatch, walls: "plank" }); homeInside(x0, y0, x0 + 4, y0 + 4, door, "fisher"); };
    hut(cx - 8, cy - 6, "e"); hut(cx + 3, cy - 6, "w"); hut(cx - 2, cy - 8, "s");
    npcAt("shio_netmender", cx, cy - 1); npcAt("shio_fisher", cx - 4, cy + 2, 3); npcAt("shio_fisher", cx + 5, cy + 1, 3);
    for (const [dx, dy] of [[-5, 1], [5, -1], [0, 2]] as const) put2(cx + dx, cy + dy, (dx === 0 ? "nets" : "drying_rack") as DecorKind, dx === 0 ? "The net-mender's nets, half of them mended" : "A drying rack: squid, split and pegged");
    t.shoreSpots(cx - 20, cy - 16, cx + 20, cy + 16, "net", 4); t.shoreSpots(cx - 20, cy - 16, cx + 20, cy + 16, "lure", 3); t.shoreSpots(cx - 20, cy - 16, cx + 20, cy + 16, "deep", 2);
    sign(cx + 2, cy + 3, "Shiogama", "SHIOGAMA. Fish, salt, nets mended. The boat to Kurohama runs when it runs.");
  }
  // Kibi: tea terraces and the tea-master's house.
  {
    const cx = 1300, cy = 452;
    ground(cx - 10, cy - 8, cx + 10, cy + 6, T.GRAVEL);
    house(cx - 5, cy - 7, cx + 5, cy - 1, "s", "The Chaya of Kibi", { color: R.thatch, storeys: 2 }); npc("kibi_teamaster", cx, cy - 4); decor(cx - 4, cy - 6, "table", true, "A tea room's low table, a kettle on the brazier"); decor(cx + 4, cy - 6, "shelf", true, "Tea in cedar chests, by the year");
    const farm = (x0: number, y0: number, door: "n" | "s" | "e" | "w") => { house(x0, y0, x0 + 5, y0 + 4, door, "A Kibi farmhouse", { color: R.thatch }); homeInside(x0, y0, x0 + 5, y0 + 4, door, "farm"); };
    farm(cx - 10, cy + 1, "n"); farm(cx + 5, cy + 1, "n");
    // Tea bushes in rows across the island's hills, the leaf to pick.
    for (let y = cy - 22; y <= cy + 18; y += 3) for (let x = cx - 36; x <= cx + 36; x += 2) {
      if (at(x, y) < 0 || get(x, y) === T.SAND || occupied(x, y) || ctx.buildings.some(b => x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 2) || Math.abs(x - cx) < 2) continue;
      if (Math.abs(y - cy) < 8 && Math.abs(x - cx) < 12) continue;
      if ((x + y) % 4 === 0 && random() < 0.5) herb(x, y, "tea_leaf", "Tea bush"); else decor(x, y, "bush", true, "A tea bush, clipped to the row");
    }
    for (const [dx, dy] of [[-14, -12], [16, -10], [-20, 8], [22, 10]] as const) npcAt("kibi_picker", cx + dx, cy + dy, 4);
    sign(cx + 3, cy, "Kibi", "KIBI. The tea of the Isles. Pick only what's offered; the bushes remember.");
  }
  // Hanazono: the blossom island, the poet's villa, the garden pond.
  {
    const cx = 1452, cy = 454;
    ground(cx - 10, cy - 6, cx + 10, cy + 8, null);
    house(cx - 6, cy - 4, cx + 4, cy + 2, "s", "The Poet's Villa", { color: R.bark, walls: "mizukai" }); npc("hana_poet", cx - 1, cy - 1); decor(cx - 5, cy - 3, "table", true, "A writing table: brush, inkstone, a poem with every line crossed out but the last"); decor(cx + 3, cy - 3, "shelf", true, "Poems in boxes, by season");
    t.blob(cx + 6, cy + 6, 3, 2.2, T.WATER, 0.1, tt => !isWater(tt) && tt !== T.WALL); lanterns([[cx + 2, cy + 6], [cx + 10, cy + 6]]);
    house(cx - 9, cy + 4, cx - 3, cy + 9, "n", "The Blossom Teahouse", { color: R.thatch }); npc("hana_tea", cx - 6, cy + 6); decor(cx - 8, cy + 8, "table");
    scatter(cx - 34, cy - 22, cx + 34, cy + 18, 60, (x, y) => tree(x, y, "sakura"), (x, y) => at(x, y) >= 0 && (get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS) && !occupied(x, y) && !ctx.buildings.some(b => x >= b.x0 - 2 && x <= b.x1 + 2 && y >= b.y0 - 2 && y <= b.y1 + 2) && Math.hypot(x - cx, y - cy) > 7);
    sign(cx + 1, cy + 3, "Hanazono", "HANAZONO, the garden isle. The trees flower all year here, which the priests say is a blessing and the poet says is a lie the island tells.");
  }
  // Morishima: the fox shrine at the top of a tunnel of gates.
  {
    const cx = 1612, cy = 410;
    ground(cx - 6, cy - 6, cx + 6, cy + 4, T.GRAVEL);
    house(cx - 4, cy - 6, cx + 4, cy - 1, "s", "The Fox Shrine of Morishima", { walls: "lacquer", color: R.vermilion }); add({ kind: "altar", x: cx, y: cy - 4, blocks: true, name: "Fox shrine altar", text: "mizukai" }); decor(cx, cy - 5, "sacred_rope", true, "The fox shrine's stone, roped, a fox's paw-print worn into its top.");
    decor(cx - 2, cy - 4, "guardian", true, "A stone fox with a key in its mouth"); decor(cx + 2, cy - 4, "guardian", true, "A stone fox with a jewel in its mouth");
    npc("mori_maiden", cx, cy + 1); decor(cx + 5, cy + 2, "wish_board", true, "Fox-faced plaques, each with a wish written on the back and a face drawn on the front, no two faces alike");
    // The gates: from the landing up through the wood, one every second step.
    const steps: [number, number][] = [[1568, 420], [1582, 420], [1592, 418], [1600, 414], [1608, 412], [cx, cy + 3]];
    t.road(steps, 2, T.GRAVEL);
    for (let i = 0; i + 1 < steps.length; i++) { const [ax, ay] = steps[i], [bx, by] = steps[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2); for (let k = 0; k < n; k++) { const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n); if (!occupied(x, y)) torii(x, y, "One of the thousand gates. Its post is signed by whoever gave it."); } }
    sign(cx - 3, cy + 3, "Morishima", "MORISHIMA. The foxes of this island are the shrine's. Do not follow one off the path, however politely it asks.");
  }
  // Iwaoka: the monastery on the mountain, its pagoda, its monks.
  {
    const cx = 1640, cy = 100;
    ground(cx - 8, cy - 6, cx + 8, cy + 6, T.GRAVEL); level(cx - 8, cy - 6, cx + 8, cy + 6);
    house(cx - 6, cy - 6, cx + 4, cy, "s", "The Hall of Silence", { walls: "lacquer", color: R.charcoal, storeys: 2 }, T.WOOD); add({ kind: "altar", x: cx - 1, y: cy - 4, blocks: true, name: "Iwaoka altar", text: "mizukai" }); decor(cx - 1, cy - 5, "sacred_rope", true, "Iwaoka's stone, roped, its moss left exactly as the mountain grew it."); npc("iwa_abbot", cx - 1, cy - 2);
    house(cx + 2, cy + 2, cx + 8, cy + 6, "w", "The monks' quarters", { color: R.bark }); decor(cx + 7, cy + 3, "bed", true, "A monk's mat. That's all."); decor(cx + 7, cy + 5, "bed", true, "A monk's mat. That's all.");
    put2(cx - 7, cy + 3, "pagoda", "Iwaoka's pagoda, built of stone because the wind took the wooden one");
    for (const [dx, dy] of [[-4, 4], [0, 6], [4, -8]] as const) npcAt("iwa_monk", cx + dx, cy + dy, 2);
    t.road([[1606, 116], [1618, 116], [1626, 110], [1632, 104], [cx, cy + 6]], 2, T.GRAVEL);
    sign(cx - 2, cy + 6, "Iwaoka", "IWAOKA. The monastery of the silent climb. Speak at the gate, if you must; nowhere else.");
  }
  // Josaki: the ruin of the Josaki clan's fortress, still held by those who will not leave.
  {
    const cx = 1630, cy = 272;
    ground(cx - 12, cy - 10, cx + 12, cy + 10, T.GRAVEL);
    for (let y = cy - 10; y <= cy + 10; y++) for (let x = cx - 12; x <= cx + 12; x++) {
      const edge = x === cx - 12 || x === cx + 12 || y === cy - 10 || y === cy + 10;
      if (edge && !(x <= cx - 10 && Math.abs(y - cy) <= 2) && (x + y) % 5 !== 0) { clearAt(x, y); decor(x, y, "ruin_wall", true, "The Josaki wall, burnt, and not rebuilt"); }
    }
    put2(cx + 3, cy - 6, "castle_keep", "The Josaki keep: its roofs fallen in, its stones black. A banner hangs from the top floor that nobody living put there.");
    for (const [dx, dy] of [[-6, -4], [6, 4], [-2, 6], [8, -2], [-8, 3]] as const) put2(cx + dx, cy + dy, (dx + dy) % 2 ? "rubble" : "bones", (dx + dy) % 2 ? "Rubble of the Josaki hall" : "Bones in old armour, never buried");
    put2(cx - 4, cy + 4, "armour", "Josaki armour, laced in green, still standing on its stand"); put2(cx - 10, cy - 1, "stone_lantern", "A stone lantern by the broken gate, its light out these twenty years");
    for (const [dx, dy] of [[-6, 0], [4, 2], [0, -4], [6, -6], [-4, -6]] as const) monsterAt("josaki_ronin", cx + dx, cy + dy, 3);
    for (const [dx, dy] of [[2, 6], [-8, -6], [8, 6]] as const) monsterAt("josaki_retainer", cx + dx, cy + dy, 2);
    monsterAt("lord_josaki", cx + 3, cy - 3, 1);
    sign(cx - 14, cy + 2, "Josaki", "JOSAKI. By order of the lord of Takamori, this island is closed. (Someone has added, in green ink: 'Not by his order.')");
  }
  // Torojima: the Lantern Isle, its graves and its keeper.
  {
    const cx = 1520, cy = 38;
    ground(cx - 4, cy - 2, cx + 4, cy + 3, null);
    house(cx - 3, cy - 2, cx + 2, cy + 2, "s", "The Lantern Keeper's house", { color: R.charcoal }); npc("toro_keeper", cx, cy); decor(cx - 2, cy - 1, "shelf", true, "Lantern paper, wicks, oil, and a list of names as long as your arm");
    for (let y = cy - 14; y <= cy + 12; y += 3) for (let x = cx - 26; x <= cx + 26; x += 4) {
      const [gx, gy] = [x + ((y * 7) % 3) - 1, y];
      if (at(gx, gy) < 0 || occupied(gx, gy) || get(gx, gy) === T.SAND || Math.hypot(gx - cx, gy - cy) < 6) continue;
      if (random() < 0.55) decor(gx, gy, "grave", true, "A sea-grave: a stone for someone the water kept"); else if (random() < 0.45) decor(gx, gy, "stone_lantern", true, "A stone lantern. Some are lit; nobody saw them lit.");
    }
    for (const [dx, dy] of [[-14, -6], [12, -8], [-18, 4], [16, 6], [0, -10], [-6, 8]] as const) monsterAt("lantern_wight", cx + dx, cy + dy, 3);
    for (const [dx, dy] of [[-20, -2], [20, 0]] as const) monsterAt("grudge_wraith", cx + dx, cy + dy, 2);
    sign(cx + 3, cy + 4, "Torojima", "TOROJIMA, the Lantern Isle. Every lantern is a name. If you find one out, tell the keeper. Do not relight it yourself.");
  }
  // Kusabana: herb meadows and the herbalist.
  {
    const cx = 1700, cy = 330;
    ground(cx - 4, cy - 3, cx + 4, cy + 3, null);
    house(cx - 3, cy - 3, cx + 3, cy + 1, "s", "The herbalist's house", { color: R.thatch }); npc("kusa_herbalist", cx, cy - 1); add({ kind: "still", x: cx + 2, y: cy - 2, blocks: true, name: "Apothecary's still" });
    const kinds = ["moon_mugwort", "shiso", "kumo_root", "spirit_bell"] as const;
    scatter(cx - 18, cy - 16, cx + 16, cy + 16, 24, (x, y) => { const k = kinds[Math.floor(random() * kinds.length)]; herb(x, y, k, ({ moon_mugwort: "Moon mugwort", shiso: "Shiso", kumo_root: "Kumo root", spirit_bell: "Spirit bell" })[k]); },
      (x, y) => at(x, y) >= 0 && (get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS) && !occupied(x, y) && Math.hypot(x - cx, y - cy) > 5);
    sign(cx + 3, cy + 2, "Kusabana", "KUSABANA. The herb island. Take a leaf from a plant, not a plant from the island.");
  }
  // Ashigane: the ogres' island, its burnt huts and the mine shaft down to the Deeps.
  {
    const cx = 1292, cy = 92;
    for (const [dx, dy] of [[-8, 6], [6, 8], [-10, -4]] as const) { const [x, y] = nearFree(cx + dx, cy + dy, 3); house(x, y, x + 4, y + 3, "s", "A burnt miners' hut", { roof: "none", walls: "plank", color: R.bark }); }
    for (const [dx, dy] of [[0, 2], [-4, -6], [8, -2]] as const) put2(cx + dx, cy + dy, "bones", "Bones, gnawed. Big teeth.");
    for (const [dx, dy] of [[-12, 0], [10, 4], [-4, 10], [4, -10], [12, -8], [-14, 10]] as const) monsterAt("ash_ogre", cx + dx, cy + dy, 4);
    t.rockCluster(cx + 14, cy + 2, 4, "inkcoal" as RockKind, 4); t.rockCluster(cx - 6, cy + 12, 4, "blackiron" as RockKind, 4); t.rockCluster(cx + 4, cy - 14, 3, "moonsilver" as RockKind, 3);
    sign(cx - 2, cy + 14, "Ashigane", "ASHIGANE. The copper mine. CLOSED. The Red Ogre and his kin hold the shaft. Takamori pays for every horn.");
  }
  // Smugglers' Cove: a camp inside the ring, where nobody is supposed to be.
  {
    const cx = 1216, cy = 176;
    for (const [dx, dy] of [[0, -6], [-2, 6], [4, 9], [6, -9]] as const) put2(cx + dx, cy + dy, "tent", "A smugglers' tent, the flap tied shut");
    for (const [dx, dy] of [[2, -3], [3, 3], [-1, 0], [8, -11], [8, 11]] as const) put2(cx + dx, cy + dy, (dx + dy) % 2 ? "crate" : "barrel", "Contraband: mainland spirits under a tarp, Takamori salt without the seal");
    put2(cx + 1, cy - 1, "chest", "The smugglers' strongbox, locked. There's a ledger in it; you can see the corner.");
    for (const [dx, dy] of [[0, -9], [-3, 3], [5, 7], [8, -6], [10, 10], [12, -12]] as const) monsterAt("cove_smuggler", cx + dx, cy + dy, 3);
    npcAt("cove_boss", cx - 1, cy + 2, 1);
  }
  // The Three Stones: stepping stones between the islets, a ruined watch-post, a sunken chest.
  {
    for (let x = 1371; x <= 1376; x++) put(x, 487, T.BRIDGE); for (let x = 1386; x <= 1390; x++) put(x, 488, T.BRIDGE);
    put2(1394, 490, "ruin_wall", "A watch-post's wall: someone kept a lookout here for something coming from the south"); put2(1366, 488, "stone_lantern", "A stone lantern on a stone in the sea");
    { const [x, y] = nearFree(1395, 491, 3); add({ kind: "decor", decor: "chest", x, y, blocks: true, name: "Three Stones coffer" }); }
    sign(1380, 482, "The Three Stones", "THE THREE STONES. Once a watch-post. Now a place to sit and wonder what they were watching for.");
  }
  // Turtle Rock: a wish shrine on a rock like a turtle's back.
  {
    put2(1548, 371, "wayside_statue", "A stone turtle, polished on the nose by every hand that ever wished"); put2(1546, 373, "offering_box", "An offering box for wishes: one coin, one wish, and the turtle decides"); put2(1550, 373, "torii", "A small shrine gate on Turtle Rock");
  }
  // Hakkotsu: the white island, its bone gate, and the shrine underneath.
  {
    const cx = 1690, cy = 484;
    for (let i = 0; i < 26; i++) { const [x, y] = nearFree(cx - 18 + Math.floor(random() * 36), cy - 14 + Math.floor(random() * 28), 2); if (at(x, y) >= 0 && !occupied(x, y)) decor(x, y, "bones", false, "Bones, white as salt, and too many"); }
    put2(cx, cy - 4, "torii", "The Bone Gate: a shrine gate built of two great white ribs. Whatever they came from is underneath.");
    for (const [dx, dy] of [[-10, 4], [8, 6], [12, -6], [-6, -10]] as const) monsterAt("starved_dead", cx + dx, cy + dy, 3);
  }

  // ---------- Vegetation: each place its own trees ----------
  const nearAnyBuilding = (x: number, y: number, gap: number) => ctx.buildings.some(b => b.style === "mizukai" && x >= b.x0 - gap && x <= b.x1 + gap && y >= b.y0 - gap && y <= b.y1 + gap);
  const openGrass = (x: number, y: number) => (get(x, y) === T.GRASS || get(x, y) === T.DARK_GRASS || get(x, y) === T.SNOW && random() < 0.1) && !occupied(x, y) && !nearAnyBuilding(x, y, 2);
  const plant = (region: RegionId, density: number, pick: (x: number, y: number) => TreeKind | null) => {
    for (let y = 2; y < OVERWORLD_H - 2; y++) for (let x = 1162; x < ctx.W - 2; x++) {
      if (!regionIs(x, y, region) || random() > density || !openGrass(x, y)) continue;
      // Keep a lane clear every few tiles so a wood can be walked through.
      if ((x % 5 === 0 && y % 3 === 0)) continue;
      const kind = pick(x, y); if (kind) tree(x, y, kind);
    }
  };
  plant("old_cedars", 0.2, () => random() < 0.8 ? "cedar" : "pine");
  plant("whispering_bamboo", 0.32, () => "bamboo");
  plant("kurokage", 0.18, () => random() < 0.6 ? "cedar" : random() < 0.5 ? "deadwood" : "maple");
  plant("kumoyama", 0.06, (x, y) => get(x, y) === T.SNOW ? null : random() < 0.7 ? "cedar" : "pine");
  plant("hinode", 0.05, () => random() < 0.35 ? "sakura" : random() < 0.5 ? "maple" : random() < 0.5 ? "pine" : "tree");
  plant("tanabe", 0.02, () => random() < 0.5 ? "sakura" : "tree");
  plant("yumoto", 0.04, () => random() < 0.5 ? "maple" : "cedar");
  plant("morishima", 0.16, () => random() < 0.5 ? "cedar" : random() < 0.5 ? "maple" : "bamboo");
  plant("iwaoka", 0.05, () => random() < 0.7 ? "pine" : "cedar");
  plant("kibi", 0.01, () => "sakura");
  plant("torojima", 0.05, () => random() < 0.6 ? "deadwood" : "pine");
  plant("josaki", 0.03, () => random() < 0.5 ? "pine" : "maple");
  plant("kusabana", 0.03, () => random() < 0.5 ? "sakura" : "tree");
  plant("shiogama", 0.03, () => "pine");
  plant("smugglers_cove", 0.06, () => random() < 0.6 ? "palm" : "pine");
  plant("hakkotsu", 0.02, () => "deadwood");
  // Rocks: the mountain's and the islands'.
  for (const [cx, cy, r, kind, n] of [[1474, 196, 10, "blackiron", 5], [1420, 196, 8, "pewter", 5], [1650, 120, 10, "moonsilver", 4], [1636, 92, 8, "glimmer", 3], [1500, 150, 8, "inkcoal", 4]] as const) t.rockCluster(cx, cy, r, kind as RockKind, n);
  // Fishing round Hinode and the islands.
  t.shoreSpots(1340, 230, 1360, 300, "lure", 4); t.shoreSpots(1520, 160, 1580, 200, "deep", 3); t.shoreSpots(1580, 380, 1640, 460, "net", 3);

  // ---------- Creatures: the wild, and the wayward ----------
  const roam = (id: string, region: RegionId, n: number) => scatter(1162, 2, ctx.W - 3, OVERWORLD_H - 3, n, (x, y) => t.monster(id, x, y), (x, y) => regionIs(x, y, region) && WALKABLE(get(x, y)) && get(x, y) !== T.BRIDGE && !occupied(x, y) && !nearAnyBuilding(x, y, 3));
  roam("parasol_imp", "hinode", 8); roam("mountain_boar", "hinode", 8); roam("bellydrum_badger", "hinode", 6);
  roam("river_imp", "tanabe", 8); roam("river_imp", "hinode", 4);
  roam("mountain_boar", "old_cedars", 6); roam("tree_whisper", "old_cedars", 8);
  roam("foxfire_vixen", "whispering_bamboo", 6); roam("crow_hermit", "kumoyama", 6); roam("serow", "kumoyama", 6);
  roam("silk_widow", "kurokage", 8); roam("crow_hermit", "kurokage", 6); roam("grudge_wraith", "kurokage", 5);
  monsterAt("nightcall_chimera", 1526, 116, 2);
  roam("foxfire_vixen", "morishima", 8); roam("serow", "iwaoka", 5); roam("crow_hermit", "iwaoka", 5);
  // Sea monks rise on the lonely beaches: the north cape, Torojima, Hakkotsu.
  scatter(1462, 100, 1560, 170, 3, (x, y) => t.monster("sea_monk", x, y), (x, y) => get(x, y) === T.SAND && !occupied(x, y));
  scatter(1490, 20, 1560, 60, 2, (x, y) => t.monster("sea_monk", x, y), (x, y) => get(x, y) === T.SAND && !occupied(x, y));
  scatter(1660, 460, 1716, 510, 2, (x, y) => t.monster("sea_monk", x, y), (x, y) => get(x, y) === T.SAND && !occupied(x, y));
  roam("bellydrum_badger", "kibi", 3); roam("parasol_imp", "hanazono", 4); roam("river_imp", "kusabana", 3);

  // ---------- Underground: the Hollow under Kumo, the Ashigane Deeps, the Bone Shrine ----------
  const dungeon = (id: RegionId, rooms: readonly (readonly [number, number, number, number])[], floor: number) => {
    for (const [x0, y0, x1, y1] of rooms) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { put(x, y, floor); t.setRegion(x, y, id); }
  };
  const coffers = (name: string, x0: number, y0: number, x1: number, y1: number, n: number, floor: number) =>
    scatter(x0, y0, x1, y1, n, (x, y) => decor(x, y, "chest", true, name), (x, y) => get(x, y) === floor && ctx.objectAt[tileIndex(x, y)] < 0
      && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => get(x + dx, y + dy) === floor && ctx.objectAt[tileIndex(x + dx, y + dy)] < 0));
  const inside = (d: { x0: number; x1: number; y0: number; y1: number }, n: number, id: string) => scatter(d.x0, d.y0, d.x1, d.y1, n, (x, y) => t.monster(id, x, y), (x, y) => WALKABLE(get(x, y)) && !occupied(x, y));
  {
    // The Hollow under Kumo: a cave the mountain's spirits were sealed in, and the seals failing.
    const d = MIZUKAI_DUNGEONS.kumo_hollow;
    dungeon("kumo_hollow", [[1174, 526, 1200, 534], [1198, 530, 1222, 533], [1218, 522, 1246, 540], [1226, 540, 1229, 544], [1206, 544, 1240, 550], [1247, 535, 1248, 535], [1250, 526, 1270, 548]], T.STONE);
    for (let y: number = d.y0; y <= d.y1; y++) for (let x: number = d.x0; x <= d.x1; x++) if (get(x, y) === T.STONE && ctx.noise2(x * 1.6, y * 1.6) > 0.66 && x !== 1247 && x !== 1248) put(x, y, T.DUNGEON);
    const [mx, my] = nearFree(1474, 182, 4);
    add({ kind: "ladder", x: mx, y: my, blocks: true, name: "The mouth of the Hollow", action: "Climb-down", to: { x: 1177, y: 530 } });
    add({ kind: "ladder", x: 1175, y: 530, blocks: true, name: "Rope up to the mountain", action: "Climb-up", to: pt(nearFree(mx, my + 1, 2)) });
    for (let x = 1180; x <= 1196; x += 8) decor(x, 526, "stone_lantern", true, "A stone lantern inside the mountain: lit, by nobody");
    for (const x of [1222, 1234, 1244]) decor(x, 522, "sacred_rope", true, "A seal-stone, its rope cut");
    decor(1260, 527, "torii", false, "A shrine gate inside the mountain, black with soot"); decor(1268, 546, "chest", true, "The Hollow's hoard: offerings that were never given back");
    add({ kind: "gate", x: 1247, y: 535, blocks: true, name: "The sealed door", action: "Unlock", to: { x: 1250, y: 535 }, requires: { item: "kumo_seal_key" } });
    coffers("Hollow coffer", 1174, 522, 1246, 550, 4, T.STONE);
    inside({ x0: 1174, x1: 1246, y0: 522, y1: 550 }, 8, "lantern_wight"); inside({ x0: 1174, x1: 1246, y0: 522, y1: 550 }, 6, "grudge_wraith"); inside({ x0: 1174, x1: 1246, y0: 522, y1: 550 }, 5, "crow_hermit"); inside({ x0: 1206, x1: 1240, y0: 544, y1: 550 }, 4, "silk_widow");
    t.monster("hollow_seal_breaker", 1262, 538);
  }
  {
    // The Ashigane Deeps: the copper mine the ogres took, its smelting hall, and the Red Ogre's forge.
    dungeon("ashigane_deeps", [[1280, 524, 1310, 530], [1306, 526, 1312, 548], [1290, 542, 1340, 548], [1330, 522, 1350, 544], [1350, 532, 1352, 534], [1353, 533, 1354, 533], [1356, 524, 1390, 550]], T.DUNGEON);
    // The smelting hall's floor runs with slag along its top end (away from the way through).
    for (let y = 522; y <= 527; y++) for (let x = 1331; x <= 1349; x++) if (get(x, y) === T.DUNGEON && ctx.noise2(x * 1.4, y * 1.4) > 0.62 && x !== 1336 && x !== 1342) put(x, y, T.LAVA);
    const [mx, my] = nearFree(1300, 80, 4);
    add({ kind: "ladder", x: mx, y: my, blocks: true, name: "Ashigane mine shaft", action: "Climb-down", to: { x: 1283, y: 527 } });
    add({ kind: "ladder", x: 1281, y: 527, blocks: true, name: "Mine ladder", action: "Climb-up", to: pt(nearFree(mx, my + 1, 2)) });
    add({ kind: "gate", x: 1353, y: 533, blocks: true, name: "The Red Ogre's door", action: "Unlock", to: { x: 1356, y: 533 }, requires: { item: "ogre_key" } });
    for (const [kind, n] of [["blackiron", 6], ["inkcoal", 6], ["moonsilver", 4], ["glimmer", 3]] as const) scatter(1280, 522, 1350, 550, n, (x, y) => rock(x, y, kind as RockKind), (x, y) => get(x, y) === T.DUNGEON && ctx.objectAt[tileIndex(x, y)] < 0);
    for (const x of [1286, 1298, 1318]) decor(x, 524, "torch", true); add({ kind: "furnace", x: 1336, y: 524, blocks: true, name: "Ogre furnace" }); add({ kind: "anvil", x: 1342, y: 524, blocks: true, name: "Ogre anvil" });
    decor(1388, 548, "chest", true, "The Red Ogre's hoard: copper, and things that were not his"); coffers("Deeps coffer", 1280, 522, 1350, 550, 4, T.DUNGEON);
    inside({ x0: 1280, x1: 1350, y0: 522, y1: 550 }, 12, "ash_ogre"); inside({ x0: 1280, x1: 1350, y0: 522, y1: 550 }, 4, "silk_widow");
    t.monster("red_ogre", 1374, 537);
  }
  {
    // The Bone Shrine under Hakkotsu: a shrine built of bones, to keep something hungry asleep.
    dungeon("bone_shrine", [[1400, 524, 1430, 530], [1426, 530, 1430, 548], [1404, 544, 1470, 550], [1450, 540, 1453, 544], [1440, 522, 1470, 540], [1470, 536, 1472, 538], [1473, 537, 1474, 537], [1476, 524, 1500, 556]], T.DUNGEON);
    const [mx, my] = nearFree(1690, 482, 3);
    add({ kind: "ladder", x: mx, y: my, blocks: true, name: "Steps under the Bone Gate", action: "Climb-down", to: { x: 1403, y: 527 } });
    add({ kind: "ladder", x: 1401, y: 527, blocks: true, name: "Steps up to the gate", action: "Climb-up", to: pt(nearFree(mx, my + 1, 2)) });
    add({ kind: "gate", x: 1473, y: 537, blocks: true, name: "The ribbed door", action: "Unlock", to: { x: 1476, y: 537 }, requires: { item: "bone_shrine_key" } });
    for (let x = 1406; x <= 1466; x += 10) { decor(x, 544, "bones", false, "Bones laid in patterns: a prayer in a script nobody reads"); decor(x + 4, 550, "stone_lantern", true, "A lantern of bone, burning cold"); }
    for (const [x, y] of [[1444, 524], [1456, 524], [1466, 530]] as const) decor(x, y, "sacred_rope", true, "A seal-stone, roped in white. It is warm.");
    decor(1498, 554, "chest", true, "What the colossus guarded: the drowned's last offerings"); coffers("Bone Shrine coffer", 1400, 522, 1470, 550, 4, T.DUNGEON);
    inside({ x0: 1400, x1: 1470, y0: 522, y1: 550 }, 10, "starved_dead"); inside({ x0: 1440, x1: 1470, y0: 522, y1: 540 }, 6, "josaki_retainer"); inside({ x0: 1400, x1: 1470, y0: 522, y1: 550 }, 4, "grudge_wraith");
    t.monster("starving_colossus", 1488, 540);
  }
}
