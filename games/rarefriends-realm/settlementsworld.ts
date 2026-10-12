/**
 * Three settlements grown (the Skill overhaul's stage of settlements): Gravesend's mausoleums and its sexton, with
 * the Ashworth Vault under the first of them; Fernwick's forester, sawpit and notice board; Southshore's beach: the
 * wreck of the Gullwing (Saltmarrow's lost tithe boat, washed up at last), the beachcomber's hut, the hermit on the
 * headland, the old light, rock pools and washed-up crates. Fixed shapes in the world's own frame, drawn last of all
 * (settlements.ts has the people and their quests).
 */
import { T, W, mainlandToWorld, regionIndex, worldTools, type DecorKind, type GenContext, type RegionId } from "./world.ts";

export function buildSettlements(ctx: GenContext) {
  const t = worldTools(ctx), { tiles, region } = ctx;
  const idx = (x: number, y: number) => y * W + x;
  const place = (x: number, y: number, kind: DecorKind, blocks = true, name?: string) => { t.clearAt(x, y); t.decor(x, y, kind, blocks, name); };
  const sign = (x: number, y: number, text: string, name = "Signpost") => { t.clearAt(x, y); t.add({ kind: "sign", x, y, blocks: true, name, text }); };
  const clue = (x: number, y: number, kind: DecorKind, name: string, clueId: string, blocks = true) => { t.clearAt(x, y); t.add({ kind: "decor", decor: kind, x, y, blocks, name, clue: clueId }); };
  const rooms = (id: RegionId, list: readonly (readonly [number, number, number, number])[], floor: number) => {
    for (const [x0, y0, x1, y1] of list) for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) { if (tiles[idx(x, y)] === T.VOID) tiles[idx(x, y)] = T.WALL; region[idx(x, y)] = regionIndex(id); }
    for (const [x0, y0, x1, y1] of list) t.fillRect(x0, y0, x1, y1, floor);
  };

  // ---------- Gravesend: the mausoleum row east of the graves, the sexton, and the Ashworth Vault ----------
  // (Gravesend's square is at 740,134; its graves lie north of the chapel. The mausoleums stand east, each a stone house
  // of the dead with a name over the door; the first is the Ashworths', and its floor has a stair.)
  {
    for (let y = 122; y <= 138; y++) for (let x = 755; x <= 777; x++) if (tiles[idx(x, y)] === T.SWAMP) tiles[idx(x, y)] = T.DARK_GRASS;
    t.building(757, 124, 762, 128, "s", T.STONE, undefined, { name: "Ashworth Mausoleum", color: "#4a3a60", walls: "stone" });
    t.building(766, 124, 771, 128, "s", T.STONE, undefined, { name: "Marrow Mausoleum", color: "#3b3a40", walls: "stone" });
    t.building(775, 124, 780, 128, "s", T.STONE, undefined, { name: "The Unnamed Mausoleum", color: "#55525a", walls: "stone" });
    place(758, 125, "tomb", true, "Ashworth sarcophagus"); place(761, 125, "torch"); place(767, 125, "tomb", true, "Marrow sarcophagus"); place(770, 125, "torch"); place(776, 125, "tomb", true, "A sarcophagus with no name"); place(779, 125, "torch");
    t.add({ kind: "ladder", x: 761, y: 127, blocks: true, name: "Vault stair", action: "Climb-down", to: { x: 8, y: 890 }, requires: { quest: "disturbed_row" }, text: "The stair is barred with the sexton's chain. Dunstan Howe holds the key, and he'll want the row quiet first." });
    t.building(757, 133, 763, 137, "n", T.WOOD, undefined, { name: "The sexton's hut", color: "#6d6b67", chimney: true, walls: "plank" });
    place(758, 136, "bed"); place(762, 134, "shelf", true, "Spades, ropes, and a ledger of plots"); place(762, 136, "barrel", true, "Lamp oil");
    t.npc("sexton", 760, 135, 1);
    t.building(767, 133, 772, 137, "n", T.STONE, undefined, { name: "Marrow's Stoneyard", color: "#8f8a83", walls: "stone" });
    place(768, 134, "crate", true, "Blank headstones"); place(771, 136, "table", true, "A mason's bench, chisels laid out"); t.npc("stonemason", 769, 135, 1);
    for (const [x, y] of [[765, 130], [774, 130], [765, 139], [774, 139]] as const) place(x, y, "lamp");
    // The disturbed row: three graves at the row's east end dug at and left open, and the grave robbers' camp beyond the mausoleums.
    for (const [x, y] of [[759, 118], [765, 118], [771, 118]] as const) clue(x, y, "grave", "A disturbed grave", "disturbed_grave");
    for (const [x, y] of [[762, 118], [768, 118], [774, 118], [759, 115], [765, 115], [771, 115]] as const) place(x, y, "grave", true, "Grave");
    place(783, 120, "tent", true, "A robbers' tent"); place(786, 118, "campfire", false, "A fire, kicked out"); place(785, 122, "crate", true, "Spades, and things that weren't theirs");
    t.monsters("bandit", 780, 114, 790, 124, 3);
    sign(764, 131, "The mausoleums of Gravesend: the Ashworths, the Marrows, and one with no name on it. The sexton keeps the keys. The stoneyard cuts the names.");
    // The Ashworth Vault, under the first mausoleum: a stair down to galleries of the family's dead, who don't all stay put; a hoard at the end.
    rooms("ashworth_vault", [[4, 888, 20, 894], [12, 894, 20, 902], [4, 898, 24, 904]], T.DUNGEON);
    t.add({ kind: "ladder", x: 7, y: 889, blocks: true, name: "Stair up", action: "Climb-up", to: { x: 760, y: 127 } });
    for (const [x, y] of [[10, 889], [16, 892], [18, 898], [8, 902], [22, 900]] as const) place(x, y, "tomb", true, "Ashworth sarcophagus");
    for (const [x, y] of [[6, 893], [14, 901], [20, 903]] as const) place(x, y, "bones", false, "Bones");
    for (const [x, y] of [[5, 888], [19, 888], [13, 895], [24, 898], [5, 904]] as const) place(x, y, "torch");
    place(23, 903, "chest", true, "Ashworth hoard"); sign(5, 890, "'Here lie the Ashworths, who buried their own under the hall and were buried here when the hall went. They are not all quiet.'", "Vault plaque");
    t.monsters("skeleton", 5, 889, 19, 893, 4); t.monsters("cairn_wight", 13, 895, 23, 903, 3);
  }

  // ---------- Fernwick: the forester, the sawpit, the notice board, the witness yew ----------
  // (Fernwick's clearing is at 644–674, 219–241; its street runs east along 230–232.)
  {
    t.building(674, 241, 679, 245, "w", T.WOOD, undefined, { name: "The forester's house", color: "#5a6a4a", chimney: true, walls: "timber" });
    place(678, 242, "bed"); place(678, 244, "shelf", true, "Saws, wedges, a book of trees"); t.npc("forester", 676, 243, 1);
    place(675, 236, "logpile", true, "The sawpit's timber"); place(677, 238, "logpile", true, "Planks, drying"); place(676, 240, "crate", true, "Saw-dust, sacked for the smokehouse");
    place(678, 236, "stump", false, "Sawpit"); place(679, 237, "stump", false, "Sawpit");
    sign(662, 234, "FERNWICK NOTICE BOARD. Logs wanted at the lodge (Rowan). War bows at Hazel's. The forester takes orders for the woods' own logs, and will tell you where the old yew stands. Grumblins in the west wood: go armed.", "Notice board");
    for (const [x, y] of [[664, 236], [674, 233]] as const) place(x, y, "lamp");
    // The witness yew, oldest in the south wood: a stone at its foot that the forester's quest reads.
    const [wx, wy] = mainlandToWorld(22, 106);
    t.clearAt(wx, wy); t.add({ kind: "tree", tree: "yew", x: wx, y: wy, blocks: true, name: "The Witness Yew" });
    clue(wx + 1, wy + 1, "rubble", "A stone at the yew's foot", "witness_stone", false);
  }

  // ---------- Southshore: the Gullwing, the beachcomber, the hermit, the old light, rock pools, washed-up crates ----------
  // (The fisherman's shack stands at 806–810, 428–431; the south road runs down to Saltmarrow; the sea is south of 466.)
  {
    // The wreck: the Gullwing's hull broken on the sand, her timbers scattered, her drowned crew not resting.
    for (let y = 447; y <= 459; y++) for (let x = 780; x <= 796; x++) if (tiles[idx(x, y)] === T.GRASS || tiles[idx(x, y)] === T.DARK_GRASS) { tiles[idx(x, y)] = T.SAND; t.clearAt(x, y); }
    clue(787, 452, "boat", "The Gullwing", "gullwing_wreck"); place(790, 454, "boat", true, "The Gullwing's stern, stove in");
    for (const [x, y] of [[784, 450], [793, 451], [785, 456], [792, 457]] as const) t.add({ kind: "decor", decor: "ruin_wall", x, y, blocks: true, name: "A ship's timber", height: 20 });
    place(788, 457, "barrel", true, "A cask, split, the tithe's coins long gone"); place(782, 453, "bones", false, "A drowned sailor's bones");
    t.monsters("skeleton", 781, 448, 795, 458, 4);
    // The beachcomber's hut, the hermit's shelter on the headland under the old light, the rock pools, the crates the tide leaves.
    t.building(798, 451, 803, 455, "w", T.WOOD, undefined, { name: "Nell's hut", color: "#b9a37a", walls: "plank", chimney: true });
    place(802, 452, "bed"); place(802, 454, "shelf", true, "Shells, glass, a brass thing or two"); t.npc("beachcomber", 800, 453, 1);
    place(796, 457, "boat", true, "Nell's skiff, sound"); place(804, 449, "nets", true, "Nets, mended");
    t.decor(845, 436, "watchtower", true, "The old light"); for (const [x, y] of [[843, 438], [847, 438]] as const) t.add({ kind: "decor", decor: "ruin_wall", x, y, blocks: true, name: "The light-keeper's wall", height: 14 });
    t.clearAt(841, 440); place(841, 440, "tent", true, "Old Sal's shelter"); place(839, 442, "campfire", false, "Sal's fire"); t.npc("hermit", 842, 442, 1);
    t.blob(820, 461, 3, 1.6, T.WATER, 0.1);
    // Cage spots at the pool's edge: a water tile with sand or grass beside it to stand on (three of them, spread round the pool).
    { let placed = 0; for (const [x, y] of [[817, 461], [823, 461], [820, 460], [820, 462], [818, 460], [822, 462], [819, 462], [821, 460]] as const) { if (placed >= 3 || tiles[idx(x, y)] !== T.WATER) continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => [T.SAND, T.GRASS, T.DARK_GRASS].includes(tiles[idx(x + dx, y + dy)] as 1))) { t.spot(x, y, "cage"); placed++; } } }
    for (const [x, y] of [[794, 423], [801, 437], [836, 424], [846, 423], [812, 445]] as const) clue(x, y, "crate", "A washed-up crate", "washed_crate");
    t.monsters("sand_scorpion", 830, 420, 850, 430, 3);
    sign(806, 434, "Southshore. The Gullwing came ashore here, what the sea left of her. Nell's hut, the rock pools, Old Sal under the old light. East along the sand: Saltmarrow. North: the mainland.");
    sign(836, 440, "The old light. It hasn't burned in forty years. Sal says it will again, when there's something out there to burn it for.");
  }
}
