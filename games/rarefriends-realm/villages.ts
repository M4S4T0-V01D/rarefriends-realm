/**
 * The wider world's settlements, each built around what it does: Gravesend keeps the Deadwood's dead, Saltmarrow fishes,
 * Hollyhock grows the Realm's herbs, Dyemoor dyes its cloth, Tallgrass hunts The Wilds, Cragmaw mines Ironreach and
 * Quillhaven keeps the books. Every village has its own people (dressed its own way), shops, a quest, and a few things
 * that are only there because somebody would have put them there.
 */
import { MAINLAND_RECT, T, isWater, type GenContext, type worldTools } from "./world.ts";
import { villageSites } from "./expansion.ts";

type Tools = ReturnType<typeof worldTools>;

export function buildVillages(ctx: GenContext, t: Tools) {
  const { get, put, add, decor, npc, building, clearAt, fillRect, monsters } = t;
  const site = (id: string) => villageSites().find(entry => entry.id === id)!;
  const inMainland = (x: number, y: number) => x >= MAINLAND_RECT.x0 && x <= MAINLAND_RECT.x1 && y >= MAINLAND_RECT.y0 && y <= MAINLAND_RECT.y1;
  /** Level ground for a village: its own paving in the middle, grass around, nothing left standing. */
  const ground = (cx: number, cy: number, rx: number, ry: number, paving: number, square = 4) => {
    for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
      if (inMainland(x, y)) continue;
      clearAt(x, y);
      const tt = get(x, y);
      if (tt === T.CLIFF || tt === T.LAVA || tt === T.SWAMP || tt === T.VOID) put(x, y, paving === T.GRAVEL ? T.GRAVEL : T.GRASS);
      if (isWater(tt) && paving !== T.WOOD) put(x, y, T.GRASS);
    }
    fillRect(cx - square, cy - Math.ceil(square * 0.75), cx + square, cy + Math.ceil(square * 0.75), paving === T.WOOD ? T.COBBLE : paving);
  };
  /** A water barrel: empty vials fill at it, for free. Placed after the ground is levelled. */
  const barrel = (x: number, y: number) => { clearAt(x, y); decor(x, y, "barrel", true, "Water barrel"); };
  const sign = (x: number, y: number, label: string, text: string, icon?: string) => add({ kind: "sign", x, y, blocks: true, name: label, text, icon });
  const lamps = (points: readonly (readonly [number, number])[], kind: "lamp" | "torch" = "lamp") => { for (const [x, y] of points) decor(x, y, kind); };

  // ---------- Gravesend: the graveyard settlement at the Deadwood's edge ----------
  {
    const { x, y } = site("gravesend");
    ground(x, y, 12, 10, T.COBBLE);
    // The chapel of the lanterns, with its altar and the Old Friend; the gravekeeper's lodge; Old Wick's and Pip's shops; cottages.
    building(x - 10, y - 9, x - 3, y - 4, "s", T.STONE, undefined, { name: "Chapel of Lanterns", color: "#4a3a60", walls: "stone" });
    add({ kind: "altar", x: x - 7, y: y - 7, blocks: true, name: "Lantern altar" }); decor(x - 7, y - 8, "old_friend"); decor(x - 9, y - 6, "torch"); decor(x - 4, y - 6, "torch");
    building(x + 3, y - 9, x + 9, y - 4, "s", T.WOOD, undefined, { name: "Gravekeeper's lodge", color: "#3b3a40", chimney: true, walls: "plank" });
    npc("gravesend_keeper", x + 6, y - 6); decor(x + 4, y - 8, "bed"); decor(x + 8, y - 8, "shelf", true, "Register of names"); decor(x + 8, y - 5, "table");
    building(x - 10, y + 3, x - 4, y + 8, "n", T.WOOD, undefined, { name: "Mira's Mourning Wear", color: "#55525a", walls: "plank" });
    npc("gravesend_clothier", x - 7, y + 6); decor(x - 9, y + 7, "shelf"); decor(x - 5, y + 7, "crate");
    building(x + 3, y + 3, x + 9, y + 8, "n", T.WOOD, undefined, { name: "The Last Lantern", color: "#6d6b67", chimney: true });
    npc("gravesend_trader", x + 6, y + 6); decor(x + 8, y + 7, "shelf"); decor(x + 4, y + 7, "barrel"); decor(x + 4, y + 4, "crate");
    for (const [dx, dy] of [[-2, 0], [2, -1], [0, 2]] as const) npc("gravesend_villager", x + dx, y + dy, 3);
    // The graves themselves, row on row north of the chapel, and lanterns everywhere: the dark is what Gravesend fights.
    for (let gy = y - 14; gy >= y - 20; gy -= 2) for (let gx = x - 11; gx <= x + 11; gx += 3) if (!isWater(get(gx, gy))) { clearAt(gx, gy); put(gx, gy, T.DARK_GRASS); decor(gx, gy, "grave"); }
    lamps([[x - 5, y - 2], [x + 5, y - 2], [x - 5, y + 2], [x + 5, y + 2], [x - 12, y - 12], [x + 12, y - 12], [x, y - 12]]);
    decor(x, y, "statue", true, "Memorial to the lost"); decor(x - 12, y, "fence"); decor(x + 12, y, "fence");
    sign(x - 1, y + 10, "Signpost", "Gravesend. North: the graves, the old road and the Deadwood. South: the mainland, over the neck. We keep the lanterns lit; you keep to the road.");
    sign(x + 8, y + 9, "The Last Lantern", "The Last Lantern.", "lamp"); sign(x - 8, y + 9, "Mira's Mourning Wear", "Mira's Mourning Wear.", "mourners_hood");
    monsters("skeleton", x - 14, y - 24, x + 14, y - 16, 4);
    barrel(x - 2, y + 3);
  }

  // ---------- Saltmarrow: the fishing village on the bay ----------
  {
    const { x, y } = site("saltmarrow");
    ground(x, y, 12, 9, T.COBBLE, 5);
    // Docks: planks out over the water to the south and east, boats tied up, the fish market on the quay.
    const plank = (px: number, py: number) => { const there = ctx.objects[ctx.objectAt[py * ctx.W + px]]; if (there && there.kind !== "ladder") clearAt(px, py); put(px, py, T.WOOD); };
    for (let dy = 0; dy <= 18; dy++) for (const dx of [6, 7]) if (isWater(get(x + dx, y + dy)) || dy > 4) plank(x + dx, y + dy);
    for (let dx = 8; dx <= 20; dx++) for (const dy of [2, 3]) plank(x + dx, y + dy);
    decor(x + 8, y + 10, "boat", true, "Fishing boat"); decor(x + 5, y + 14, "boat", true, "Fishing boat"); decor(x + 18, y + 4, "boat", true, "The Gullwing's mast");
    decor(x + 9, y + 1, "barrel"); decor(x + 11, y + 1, "crate"); decor(x + 13, y + 1, "barrel");
    building(x - 10, y - 8, x - 3, y - 3, "s", T.WOOD, undefined, { name: "Harbourmaster's office", color: "#2f5a66", chimney: true, walls: "plank" });
    npc("saltmarrow_harbour", x - 6, y - 5); decor(x - 9, y - 7, "shelf", true, "Tide tables"); decor(x - 4, y - 7, "chest", true, "The tithe chest"); decor(x - 4, y - 4, "table");
    building(x + 1, y - 8, x + 8, y - 3, "s", T.WOOD, undefined, { name: "Saltmarrow Fish Market", color: "#5f8a96" });
    npc("saltmarrow_fishmonger", x + 4, y - 5); decor(x + 2, y - 7, "crate"); decor(x + 7, y - 7, "barrel"); add({ kind: "range", x: x + 7, y: y - 4, blocks: true, name: "Cooking range" });
    building(x - 10, y + 3, x - 4, y + 8, "n", T.WOOD, undefined, { name: "The Oilskin Locker", color: "#e2b84a", walls: "plank" });
    npc("saltmarrow_clothier", x - 7, y + 6); decor(x - 9, y + 7, "shelf"); decor(x - 5, y + 7, "crate");
    building(x - 2, y + 3, x + 4, y + 8, "n", T.STONE, undefined, { name: "Saltmarrow Bank", color: "#8f9cb2", walls: "stone" });
    for (const bx of [x - 1, x + 1, x + 3]) add({ kind: "bank", x: bx, y: y + 7, blocks: true, name: "Bank booth" }); npc("banker", x, y + 6);
    for (const [dx, dy] of [[-2, 0], [2, 1], [7, 6], [9, 2]] as const) npc("saltmarrow_villager", x + dx, y + dy, 3);
    npc("fisher", x + 6, y + 12, 2);
    lamps([[x - 5, y - 1], [x + 5, y - 1], [x - 5, y + 1], [x + 6, y + 6], [x + 6, y + 17]]);
    sign(x + 1, y - 10, "Signpost", "Saltmarrow. The road north goes up to Southshore and the mainland; the ferry at the end of the south dock sails to the Pale Isles. Mind the hut at the end of the north quay. Nobody goes in.");
    sign(x + 7, y - 9, "Saltmarrow Fish Market", "Saltmarrow Fish Market.", "raw_sailfish"); sign(x - 8, y + 9, "The Oilskin Locker", "The Oilskin Locker.", "souwester"); sign(x + 4, y + 9, "Bank", "Bank.", "coins");
    barrel(x - 2, y + 3);
  }

  // ---------- Hollyhock: the apothecary village in Thistle Vale ----------
  {
    const { x, y } = site("hollyhock");
    ground(x, y, 13, 11, T.PATH, 4);
    // Mother Yarrow's apothecary with its bench, drying racks and glasshouse; herb gardens in beds either side; a well; cottages.
    building(x - 11, y - 10, x - 3, y - 4, "s", T.WOOD, undefined, { name: "The Apothecary", color: "#8fbf9a", chimney: true });
    npc("hollyhock_apothecary", x - 7, y - 7); decor(x - 10, y - 9, "shelf", true, "Jars and bottles"); decor(x - 4, y - 9, "shelf", true, "Jars and bottles"); decor(x - 10, y - 5, "table", true, "Apothecary bench"); decor(x - 4, y - 6, "barrel", true, "Water butt");
    add({ kind: "still", x: x - 7, y: y - 9, blocks: true, name: "Still" });
    building(x + 3, y - 10, x + 10, y - 4, "s", T.WOOD, undefined, { name: "Glasshouse", color: "#cfe6f0", walls: "plank" });
    for (const [gx, gy] of [[x + 5, y - 8], [x + 8, y - 8], [x + 5, y - 6], [x + 8, y - 6]] as const) decor(gx, gy, "bush", true, "Strange plant");
    building(x - 11, y + 4, x - 5, y + 9, "n", T.WOOD, undefined, { name: "Petal & Pocket", color: "#c98f95" });
    npc("hollyhock_clothier", x - 8, y + 7); decor(x - 10, y + 8, "shelf"); decor(x - 6, y + 8, "crate");
    building(x + 4, y + 4, x + 10, y + 9, "n", T.STONE, undefined, { name: "Hollyhock Bank", color: "#8f9cb2", walls: "stone" });
    for (const bx of [x + 5, x + 7, x + 9]) add({ kind: "bank", x: bx, y: y + 8, blocks: true, name: "Bank booth" }); npc("banker", x + 7, y + 6);
    add({ kind: "well", x, y, blocks: true, name: "Well" });
    // Herb beds: farmland strips east and west, where the vale's herbs grow (the Apothecary skill's gardens).
    for (const [bx0, bx1] of [[x - 20, x - 13], [x + 13, x + 20]] as const) for (let by = y - 6; by <= y + 6; by++) for (let bx = bx0; bx <= bx1; bx++) { if (!isWater(get(bx, by))) { clearAt(bx, by); put(bx, by, (by - y) % 3 === 0 ? T.PATH : T.FARMLAND); } }
    for (let by = y - 7; by <= y + 7; by += 14) for (let bx = x - 20; bx <= x + 20; bx++) if (Math.abs(bx - x) >= 13) decor(bx, by, "fence");
    decor(x - 14, y + 9, "hay", true, "Drying rack"); decor(x + 14, y + 9, "hay", true, "Drying rack"); decor(x - 2, y - 2, "flowers", false, "Hollyhocks"); decor(x + 2, y + 2, "flowers", false, "Hollyhocks");
    for (const [dx, dy] of [[-3, 1], [3, -1], [-16, 0], [16, 0]] as const) npc("hollyhock_villager", x + dx, y + dy, 3);
    lamps([[x - 4, y - 2], [x + 4, y - 2], [x - 4, y + 2], [x + 4, y + 2]]);
    sign(x + 1, y + 11, "Signpost", "Hollyhock, in Thistle Vale. Everything grows here. East: Dyemoor, down the river. Mother Yarrow teaches Apothecary at her bench.");
    sign(x - 9, y + 10, "Petal & Pocket", "Petal & Pocket.", "herbalists_hat"); sign(x + 9, y + 10, "Bank", "Bank.", "coins"); sign(x - 2, y - 11, "The Apothecary", "The Apothecary.", "pot");
    monsters("sheep", x - 19, y - 5, x - 14, y + 5, 3);
    barrel(x - 2, y + 3);
  }

  // ---------- Dyemoor: the dyers' village on the Thistle ----------
  {
    const { x, y } = site("dyemoor");
    ground(x, y, 12, 9, T.COBBLE, 4);
    building(x - 11, y - 8, x - 4, y - 3, "s", T.WOOD, undefined, { name: "The Dyeworks", color: "#6e4a8a", chimney: true });
    npc("dyemoor_dyer", x - 7, y - 5); decor(x - 10, y - 7, "barrel", true, "Indigo vat"); decor(x - 8, y - 7, "barrel", true, "Madder vat"); decor(x - 6, y - 7, "barrel", true, "Woad vat"); decor(x - 5, y - 4, "table");
    building(x + 2, y - 8, x + 9, y - 3, "s", T.WOOD, undefined, { name: "Marigold's", color: "#a8403a" });
    npc("dyemoor_clothier", x + 5, y - 5); decor(x + 3, y - 7, "shelf"); decor(x + 8, y - 7, "shelf"); decor(x + 8, y - 4, "crate");
    building(x - 11, y + 3, x - 4, y + 8, "n", T.WOOD, undefined, { name: "Dyemoor Bolts & Thread", color: "#3f3f7a", walls: "plank" });
    npc("dyemoor_tailor", x - 7, y + 6); decor(x - 10, y + 7, "shelf"); decor(x - 5, y + 7, "crate"); add({ kind: "wheel", x: x - 5, y: y + 4, blocks: true, name: "Spinning wheel" });
    building(x + 3, y + 3, x + 9, y + 8, "n", T.WOOD, undefined, { name: "Cottage", color: "#e2c46a", chimney: true });
    decor(x + 4, y + 7, "bed"); decor(x + 8, y + 7, "table");
    // Cloth drying on lines down to the river, and the river itself running blue below the vats.
    for (const [dx, dy] of [[-2, 10], [0, 10], [2, 10], [4, 10]] as const) decor(x + dx, y + dy, "banner", true, "Drying cloth");
    for (const [dx, dy] of [[-2, 0], [2, 1], [0, -1]] as const) npc("dyemoor_villager", x + dx, y + dy, 3);
    lamps([[x - 4, y - 1], [x + 4, y - 1], [x - 4, y + 1], [x + 4, y + 1]]);
    sign(x + 1, y - 10, "Signpost", "Dyemoor. West up the river: Hollyhock. North: the crossroads for Southshore, Saltmarrow and the mainland. The river runs blue below the vats; that's normal.");
    sign(x + 8, y - 9, "Marigold's", "Marigold's.", "moorland_frock"); sign(x - 9, y + 9, "Dyemoor Bolts & Thread", "Dyemoor Bolts & Thread.", "thread");
    barrel(x - 2, y + 3);
  }

  // ---------- Tallgrass: the hunters' camp beside The Wilds ----------
  {
    const { x, y } = site("tallgrass");
    ground(x, y, 11, 9, T.PATH, 3);
    // Tents and a long lodge, hides stretched, a butt for archery, a range for the kill.
    building(x - 10, y - 8, x - 2, y - 3, "s", T.WOOD, undefined, { name: "Hunters' lodge", color: "#6f7248", chimney: true, walls: "plank" });
    npc("tallgrass_huntmaster", x - 6, y - 5); decor(x - 9, y - 7, "armour", true, "Trophy antlers"); decor(x - 3, y - 7, "shelf", true, "Pelts"); decor(x - 4, y - 4, "table");
    building(x + 2, y - 8, x + 9, y - 3, "s", T.WOOD, undefined, { name: "Tallgrass Hunting Post", color: "#8a6446", walls: "plank" });
    npc("tallgrass_outfitter", x + 5, y - 5); decor(x + 3, y - 7, "crate"); decor(x + 8, y - 7, "shelf", true, "Bows"); decor(x + 8, y - 4, "barrel", true, "Arrows");
    decor(x - 8, y + 4, "tent"); decor(x - 4, y + 5, "tent"); decor(x + 4, y + 5, "tent"); decor(x + 8, y + 4, "tent");
    npc("tallgrass_clothier", x, y + 5); decor(x + 1, y + 6, "crate", true, "Lark's bundles");
    decor(x - 10, y + 1, "target"); decor(x - 10, y - 1, "target"); add({ kind: "range", x: x + 10, y, blocks: true, name: "Cooking fire" }); decor(x + 10, y + 2, "hay", true, "Stretched hides");
    for (const [dx, dy] of [[-2, 1], [2, -1], [0, 8]] as const) npc("tallgrass_villager", x + dx, y + dy, 4);
    lamps([[x - 3, y - 1], [x + 3, y - 1], [x - 3, y + 2], [x + 3, y + 2]], "torch");
    sign(x + 1, y - 10, "Signpost", "Tallgrass, the hunters' camp. East: The Wilds (boar, wolf, goat, thornback). West along the road: Southshore and the mainland. Walk soft.");
    sign(x + 8, y - 9, "Tallgrass Hunting Post", "Tallgrass Hunting Post.", "oak_bow");
    barrel(x - 2, y + 3);
  }

  // ---------- Cragmaw: the mining camp in the Ironreach pass ----------
  {
    const { x, y } = site("cragmaw");
    ground(x, y, 12, 9, T.GRAVEL, 4);
    building(x - 11, y - 8, x - 4, y - 3, "s", T.STONE, undefined, { name: "Foreman's office", color: "#55525a", walls: "stone", chimney: true });
    npc("cragmaw_foreman", x - 7, y - 5); decor(x - 10, y - 7, "shelf", true, "Assay ledgers"); decor(x - 5, y - 7, "chest", true, "Pay chest"); decor(x - 5, y - 4, "table");
    building(x + 2, y - 8, x + 9, y - 3, "s", T.STONE, undefined, { name: "Cragmaw Ore Exchange", color: "#8a8780", walls: "stone" });
    npc("cragmaw_ore", x + 5, y - 5); decor(x + 3, y - 7, "crate", true, "Ore crate"); decor(x + 8, y - 7, "crate", true, "Ore crate"); decor(x + 8, y - 4, "barrel");
    building(x - 11, y + 3, x - 4, y + 8, "n", T.STONE, undefined, { name: "The Warm Hearth", color: "#b0443c", walls: "stone", chimney: true });
    npc("cragmaw_clothier", x - 7, y + 6); decor(x - 10, y + 7, "shelf"); decor(x - 5, y + 7, "bed"); decor(x - 5, y + 4, "table");
    building(x + 2, y + 3, x + 9, y + 8, "n", T.STONE, undefined, { name: "Cragmaw Bank", color: "#8f9cb2", walls: "stone" });
    for (const bx of [x + 3, x + 5, x + 7]) add({ kind: "bank", x: bx, y: y + 7, blocks: true, name: "Bank booth" }); npc("banker", x + 5, y + 5);
    // The smithy in the open, the shaft behind the camp (its ladder is placed by the expansion), ore crates and a log pile.
    add({ kind: "furnace", x: x + 11, y: y - 1, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: x + 11, y: y + 1, blocks: true, name: "Anvil" });
    // The Ironreach Armoury, beside the smithy: glimmer and rarite, every piece.
    building(x + 11, y + 3, x + 17, y + 8, "w", T.STONE, undefined, { name: "Ironreach Armoury", color: "#d9cf9a", walls: "stone", chimney: true });
    npc("cragmaw_armourer", x + 14, y + 6); decor(x + 16, y + 4, "armour", true, "Rarite plate on a stand"); decor(x + 16, y + 7, "armour", true, "Glimmer plate on a stand"); decor(x + 12, y + 7, "shelf", true, "Blades");
    sign(x + 10, y + 5, "Ironreach Armoury", "Ironreach Armoury.", "rarite_cuirass");
    // The shaft down to the deep mine, behind the camp (the mine's own ladder back up is placed with the dungeon).
    add({ kind: "ladder", x: x + 8, y: y - 6, blocks: true, name: "Mine shaft", action: "Climb-down", to: { x: 552, y: 560 } });
    decor(x - 12, y - 1, "crate", true, "Ore crate"); decor(x - 12, y + 1, "logpile"); decor(x + 8, y - 10, "rubble", true, "Spoil heap"); decor(x + 10, y - 10, "rubble", true, "Spoil heap");
    for (const [dx, dy] of [[-2, 0], [2, 1], [0, -2], [6, -10]] as const) npc("cragmaw_villager", x + dx, y + dy, 3);
    lamps([[x - 4, y - 1], [x + 4, y - 1], [x - 4, y + 1], [x + 4, y + 1], [x + 9, y - 7]], "torch");
    sign(x + 1, y - 10, "Signpost", "Cragmaw, the Ironreach mine. The shaft behind the camp goes down to the deep mine (Foreman Pike's business). West through the pass: Dawnhold and the mainland. South, a long way: Quillhaven.");
    sign(x + 8, y - 9, "Cragmaw Ore Exchange", "Cragmaw Ore Exchange.", "blackiron_ore"); sign(x - 9, y + 9, "The Warm Hearth", "The Warm Hearth.", "fur_hood"); sign(x + 8, y + 9, "Bank", "Bank.", "coins");
    barrel(x - 2, y + 3);
  }

  // ---------- Quillhaven: the scholars' village on the headland ----------
  {
    const { x, y } = site("quillhaven");
    ground(x, y, 12, 10, T.STONE, 4);
    // The library (three floors, they say; one here), the scriptorium, the vestry, a reading garden of standing stones.
    building(x - 11, y - 10, x - 1, y - 3, "s", T.STONE, undefined, { name: "Quillhaven Library", color: "#2f4266", walls: "stone", storeys: 2, tall: 6 });
    npc("quillhaven_archivist", x - 6, y - 6); for (const sx of [x - 10, x - 8, x - 4, x - 2]) decor(sx, y - 9, "shelf", true, "Bookshelves"); decor(x - 6, y - 9, "table", true, "The long table"); decor(x - 10, y - 4, "shelf", true, "Bookshelves"); decor(x - 2, y - 4, "shelf", true, "Bookshelves");
    building(x + 3, y - 10, x + 10, y - 4, "s", T.STONE, undefined, { name: "The Scriptorium", color: "#8fa3c9", walls: "stone" });
    npc("quillhaven_scribe", x + 6, y - 7); decor(x + 4, y - 9, "table", true, "Writing desk"); decor(x + 9, y - 9, "shelf", true, "Sigil ledgers"); decor(x + 9, y - 5, "crate");
    building(x - 10, y + 4, x - 4, y + 9, "n", T.STONE, undefined, { name: "Quillhaven Vestry", color: "#e2c46a", walls: "stone" });
    npc("quillhaven_clothier", x - 7, y + 7); decor(x - 9, y + 8, "shelf"); decor(x - 5, y + 8, "chest", true, "Vestry chest");
    building(x + 3, y + 4, x + 10, y + 9, "n", T.STONE, undefined, { name: "Scholars' hall", color: "#c6bed4", walls: "stone", chimney: true });
    decor(x + 4, y + 8, "bed"); decor(x + 9, y + 8, "bed"); decor(x + 6, y + 6, "table"); add({ kind: "range", x: x + 9, y: y + 5, blocks: true, name: "Cooking range" });
    add({ kind: "sigil_altar", x: x + 12, y, blocks: true, name: "Thought altar", sigil: "thought_sigil" });
    for (const [dx, dy] of [[-12, -2], [-12, 2], [12, -3], [12, 3]] as const) decor(x + dx, y + dy, "pillar", true, "Standing stone");
    decor(x, y, "statue", true, "Statue of the First Archivist");
    for (const [dx, dy] of [[-2, 1], [2, -1], [0, 3]] as const) npc("quillhaven_villager", x + dx, y + dy, 3);
    lamps([[x - 4, y - 2], [x + 4, y - 2], [x - 4, y + 2], [x + 4, y + 2]]);
    sign(x + 1, y + 11, "Signpost", "Quillhaven. The library welcomes readers who are quiet. North, a long road: Cragmaw and the Ironreach pass. West: The Wilds and Tallgrass. The headland's stones are older than the Tower.");
    sign(x + 8, y - 11, "The Scriptorium", "The Scriptorium.", "thought_sigil"); sign(x - 8, y + 10, "Quillhaven Vestry", "Quillhaven Vestry.", "archivist_robe");
    barrel(x - 2, y + 3);
  }

  // ---------- Ember Tamsin's camp, where the Drakespine ends and Ashfall begins ----------
  {
    const x = 72, y = 126;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) { clearAt(x + dx, y + dy); const tt = get(x + dx, y + dy); if (tt === T.CLIFF || tt === T.LAVA || isWater(tt)) put(x + dx, y + dy, T.GRAVEL); }
    decor(x - 3, y - 2, "tent"); decor(x + 3, y - 2, "tent", true, "Tamsin's tent"); decor(x - 2, y + 2, "crate", true, "Finds from the ash"); decor(x + 2, y + 2, "barrel");
    npc("ashfall_trader", x, y); decor(x - 4, y, "torch"); decor(x + 4, y, "torch");
    sign(x, y + 4, "Signpost", "Ashfall. Dragons past this point: ash drakes in the passes, cinder drakes beyond, and the crater at the far end. Ember Tamsin trades here, and will tell you not to go on.");
  }
}
