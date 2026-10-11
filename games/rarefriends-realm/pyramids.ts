/**
 * The Land Before Stone: the two pyramids by Kharaveth's south coast, south-west of Tamesh, and what is under them.
 *
 * The Unfinished Pyramid was Azhurak's biggest work, and its last. The builders cut a tally on it every day the work went
 * on, and the tally stops halfway through a stroke: the work stopped mid-day and nobody came back. It stands as they left
 * it, the faces climbing to a rough flat top, the ramps slumped against its sides, the sledges and rollers where they
 * were dropped. Inside, the ways the blocks were hauled up still climb, storey by storey, and the builders' dead still
 * haul in them. Under it is why it mattered: Azhurak kept the dead below by measure, so many wards for so much stone,
 * and the pyramid was the stone. It was never all laid, so the measure was never made, and the Uncounted Deep under it,
 * cut for more dead than anyone has counted, is not kept. Its king walks in his hall, and his hoard is behind him.
 *
 * A little way west stands the pyramid that was finished: Queen Siruvet's, a little larger, cased to its gilded cap. Her
 * measure was made. Her household and her guardians keep their posts on every storey, and under it, in the Measured
 * Vault, her Keeper waits by her hoard: not walking, keeping. It's what the Unfinished Pyramid was meant to be.
 *
 * Each pyramid is one building (a complex) with storeys over its ground floor (Floors, kept in the storey rows like the
 * castle's): every storey three tiles in from the one below on every side, so from inside the masonry steps up round you
 * as the faces close in. Each storey's rooms lie under the storey above; what's outside them, in its outer three tiles,
 * is solid stone. The plans: '#' stone, '.' flagstones, ',' grit, 'c' carpet, and things on them (see `THINGS`).
 *
 * Built from heartlands.ts in the grown world's coordinates, in place of the old Unfinished Pyramid. Module constants are
 * literals (see south.ts).
 */
import { DUNGEON_Y, FLOOR_Y, T, type DecorKind, type Floor, type GenContext, type RegionId, type WorldObject, type worldTools } from "./world.ts";
import type { SouthKit } from "./heartlands.ts";

type Tools = ReturnType<typeof worldTools>;
/** The Unfinished Pyramid's footprint: eight times the old one's ground, and then some (37 × 37). */
export const UNFINISHED_PYRAMID = { x0: 702, y0: 810, x1: 738, y1: 846 } as const;
/** Queen Siruvet's pyramid, west of it across the sand (41 × 41). */
export const SIRUVET_PYRAMID = { x0: 636, y0: 804, x1: 676, y1: 844 } as const;
/** The Uncounted Deep's floor (dungeon rows; a wall round it): columns no older dungeon uses. */
export const UNCOUNTED_DEEP = { x0: 1153, y0: 914, x1: 1473, y1: 938 } as const;
/** The Measured Vault (dungeon rows): a long gallery west, and the Keeper's hall east of it, a step up. */
export const MEASURED_VAULT = { west: { x0: 1043, y0: 903, x1: 1149, y1: 911 }, east: { x0: 1153, y0: 897, x1: 1204, y1: 909 } } as const;
/** Where each storey is kept in the storey rows: its left edge (each starts two rows down). */
const STORE_X = { unfinished_pyramid: [806, 840, 868], siruvet_pyramid: [892, 930, 962] } as const;
/** How far in each storey stands from the one below, on every side. */
const STEP = 3;

/** What the Obsidian Legacy's notices and the sites say (and the pyramids' things' names). */
const UNFINISHED_SIGN = "THE UNFINISHED PYRAMID. Built by Azhurak, not finished by anyone. A monument in the keeping of Warden Meretkhet and the Obsidian Legacy. The ways inside are not safe: the builders are still at work. Below it, nothing is safe at all.";
const SIRUVET_SIGN = "THE PYRAMID OF QUEEN SIRUVET, of Azhurak. Finished, cased, and capped in electrum. In the keeping of the Obsidian Legacy, which asks that her household be left to keep it. They will insist.";

// ---------- The plans ----------
const UNFINISHED_GROUND = [
  "##################..#################",
  "##################..#################",
  "##################..#################",
  "###,T,,,x,,,x,,,,#..#............T###",
  "###x,,,,,,,,,,,,,#..#.............###",
  "###,,,,,,,,,,,,,,.................###",
  "###x,,,,,,,,,,,,,#..#.........U...###",
  "###,,,,,,,,,,,,x,#..#.............###",
  "#####,,###########..###########.#####",
  "#####,,###########..###########.#####",
  "###,,,,,,##T...M..........T##.....###",
  "###,,,,,x##................##.....###",
  "###x,,,,,##..o..........o..##.....###",
  "###,,,,,,##................##.....###",
  "###x,,,,,##................##.....###",
  "###,,,,,,.........................###",
  "###,,,,,,##................##.....###",
  "###,,,,,,##..o..........o..##.....###",
  "###x,,,,x##................##.....###",
  "###,,,x,,##T..............T##.....###",
  "##################..#################",
  "##################..#################",
  "##################..#################",
  "##################..#################",
  "###T,,,,,,,,,,,#T....T#..........T###",
  "###,,,,,,,,,,,,#......#...........###",
  "###,,B,,B,,B,,,#......#..W.....W..###",
  "###,,,,,,,,,,,,#......#...........###",
  "###,1,,,,,,,,,,,..................###",
  "###,,,,,,,,,1,,,...........1......###",
  "###,,,,,,,,,,,,#......#...........###",
  "###,,B,,B,,B,,,#..H...#...........###",
  "###,,,,,,,,,,1,#......#..W.....W..###",
  "###,,,,,,,,,,,,#......#...........###",
  "#####################################",
  "#####################################",
  "#####################################",
] as const;
const UNFINISHED_1 = [
  "###############################",
  "###############################",
  "###############################",
  "###T,,,,,,,,,,,,,,,,,,,,,,,D###",
  "###,,x,,1,,,,,,,,,,,x,1,,,,,###",
  "###,,,,,,,,,,,,,,,,,,,,,,,,,###",
  "###,,,########...########,,,###",
  "###,,,########...########,,,###",
  "###,,,########...########,,,###",
  "###,,,###U.....T.....T###,,,###",
  "###,1,###...........2.###,x,###",
  "###,,,###..###...###..###,,,###",
  "###,,,###..###...###..###,,,###",
  "###,,,###..###...###..###,,,###",
  "###,,,,,,.............,,,,,,###",
  "###,,,,,,......2......,,,,1,###",
  "###,,,,,,.............,,,,,,###",
  "###,,,###..###...###..###,,,###",
  "###,,,###..###...###..###,,,###",
  "###,,,###..###...###..###,,,###",
  "###,1,###.2...........###,,,###",
  "###,,,###T.....T.....T###,,,###",
  "###,,,########...########,,,###",
  "###,,,########...########,,,###",
  "###,,,########...########,,,###",
  "###T,,,,,,,,,,,,,,,,,,,,,,,T###",
  "###,,,,,,1,,,,,,,,1,,,,,,,,,###",
  "###K,,,,,,,,,,,,,,,,,,,,,,,K###",
  "###############################",
  "###############################",
  "###############################",
] as const;
const UNFINISHED_2 = [
  "#########################",
  "#########################",
  "#########################",
  "###K....#T.....T#....K###",
  "###..1..#.......#...W.###",
  "###.........2.........###",
  "###...D.#.......#.....###",
  "###.....#.......#T....###",
  "#####.###.......###.#####",
  "###T.................T###",
  "###...................###",
  "###........o.o........###",
  "###..3......3......3..###",
  "###........o.o........###",
  "###...................###",
  "###T.................T###",
  "#####.###.......###.#####",
  "###.....#.......#.....###",
  "###.....#.......#.U...###",
  "###.........2.........###",
  "###.W...#.......#..1..###",
  "###....T#T.....T#.....###",
  "#########################",
  "#########################",
  "#########################",
] as const;
const UNFINISHED_SUMMIT = [
  "###################",
  "#,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,#",
  "#,,xx,,,,,,,,,,,,,#",
  "#,,x,,,,,,,,,,x,,,#",
  "#,,,,,,,,xx,,,,,,,#",
  "#,,,,,3,,,,,,,4,,,#",
  "#,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,R,#",
  "#,R,,,,,xx,,,x,,,,#",
  "#,,,4,,,,x,,,,,,,,#",
  "#,,,,,,,,,,,3,,,,,#",
  "#,,,,xx,,,,,,,,,,,#",
  "#,,,,x,,,,,,x,,,,,#",
  "#,,,,,,,C,,,,,,,,,#",
  "#,,K,,,,,,,,,,,D,,#",
  "#,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,#",
  "###################",
] as const;
const SIRUVET_GROUND = [
  "####################..###################",
  "####################..###################",
  "####################..###################",
  "###T........########..#######........T###",
  "###.x.....x.########..#######.........###",
  "###.........########..#######.........###",
  "###.x.......########..#######....U..x.###",
  "###.........##T............T#.........###",
  "###.........##..............#.........###",
  "###...................................###",
  "###.x.......##..............#.x.....x.###",
  "###.........##..............#.........###",
  "##############..............#############",
  "####################..###################",
  "######TcccccccccccccccccccccccccccT######",
  "######cccocccccocccccccccocccccoccc######",
  "######ccccccccccccccAcccccccccccccc######",
  "######cccccc6ccccccccccccccc6cccccc######",
  "######ccccccccccccccccccccccccccccc######",
  "######cccocccccocccccccccocccccoccc######",
  "######TcccccccccccccccccccccccccccT######",
  "##########.#########.#########.##########",
  "###T.............T##.##T.............T###",
  "###...............##.##...............###",
  "###...............#T..#...............###",
  "###..S...S...S....#...#....S...S...S..###",
  "###...............#...#...............###",
  "###...............#...#...............###",
  "###.....5.........#...#...............###",
  "###...............#...#...............###",
  "###..S...S...S.............S...S...S..###",
  "###...............#...#...............###",
  "###...............#...#...............###",
  "###...............#...#.........5.....###",
  "###...............#...#...............###",
  "###..S...S...S....#.H.#....S...S...S..###",
  "###...............#...#...............###",
  "###...............#..T#...............###",
  "#########################################",
  "#########################################",
  "#########################################",
] as const;
const SIRUVET_1 = [
  "###################################",
  "###################################",
  "###################################",
  "###K......T.............T.....DT###",
  "###...........5.....6...........###",
  "###.............................###",
  "###...##########...##########...###",
  "###...##########...##########...###",
  "###.S.##########...##########.S.###",
  "###...###UcccccccTcccccccT###...###",
  "###...###ccccccccccccccccc###...###",
  "###.5.###cc###ccccccc###cc###...###",
  "###...###cc###ccccccc###cc###...###",
  "###...###cc###ccccccc###cc###...###",
  "###.S.###ccccccccccccccccc###.S.###",
  "###...###ccccccccccccccccc###...###",
  "###......ccccccccccccccccc......###",
  "###......ccc7cccc7cccc7ccc......###",
  "###......ccccccccccccccccc......###",
  "###...###ccccccccccccccccc###...###",
  "###.S.###ccccccccccccccccc###.S.###",
  "###...###cc###ccccccc###cc###...###",
  "###...###cc###ccccccc###cc###...###",
  "###...###cc###ccccccc###cc###.5.###",
  "###...###ccccccccccccccccc###...###",
  "###...###TcccccccTcccccccT###...###",
  "###.S.##########...##########.S.###",
  "###...##########...##########...###",
  "###...##########...##########...###",
  "###T...........................T###",
  "###...........6.....5...........###",
  "###K......T.............T......K###",
  "###################################",
  "###################################",
  "###################################",
] as const;
const SIRUVET_2 = [
  "#############################",
  "#############################",
  "#############################",
  "###......T.........T.....K###",
  "###...........6...........###",
  "###.......................###",
  "###...D...................###",
  "###....######...######....###",
  "###..8.######...######....###",
  "###T...##TcccccccccT##...T###",
  "###....##cocccccccoc##....###",
  "###....##ccccccccccc##....###",
  "###....##cccccoccccc##..6.###",
  "###K.....ccccccccccc......###",
  "###......cc7cc7cc7cc......###",
  "###......ccccccccccc......###",
  "###.6..##cccccoccccc##....###",
  "###....##ccccccccccc##....###",
  "###....##cocccccccoc##....###",
  "###T...##TcccccccccT##...T###",
  "###....######...######.8..###",
  "###....######...######....###",
  "###...................U...###",
  "###.......................###",
  "###...........6...........###",
  "###K.....T.........T.....K###",
  "#############################",
  "#############################",
  "#############################",
] as const;
const SIRUVET_3 = [
  "#######################",
  "#....#...T...T...#....#",
  "#.K..#.....I.....#..K.#",
  "#.....................#",
  "#....#...........#....#",
  "#####......6......#####",
  "#.....TcccccccccT.....#",
  "#.....ccccccccccc.....#",
  "#.....ccocccccocc.....#",
  "#T....ccccccccccc....T#",
  "#.....cccccQccccc.....#",
  "#..7..ccccccccccc..7..#",
  "#.....ccccccccccc.....#",
  "#T....ccocc7ccocc....T#",
  "#.....ccccccccccc.....#",
  "#.....ccccccccccc.....#",
  "#.....TcccccccccT.....#",
  "#####.............#####",
  "#....#.....6.....#....#",
  "#..................D..#",
  "#.K..#...........#....#",
  "#....#...T...T...#....#",
  "#######################",
] as const;

type Plan = readonly string[];
type Site = { ground: (x0: number, y0: number, x1: number, y1: number, paving?: number | null, flat?: boolean) => void; area: (x0: number, y0: number, x1: number, y1: number, id: RegionId) => void;
  sign: (x: number, y: number, label: string, text: string) => void };
/** One pyramid: its complex (and region), its footprint, its plans from the ground up, and what stands for what. */
type Pyramid = {
  id: "unfinished_pyramid" | "siruvet_pyramid"; name: string; x0: number; y0: number; plans: readonly Plan[];
  /** The creatures by their plan digits. */
  creatures: Record<string, string>;
  /** Names for the things on its plans. */
  names: Partial<Record<string, string>>;
  /** The coffer's name on each storey (the top one's is its own). */
  coffers: readonly string[];
};
const UNFINISHED: Pyramid = {
  id: "unfinished_pyramid", name: "The Unfinished Pyramid", ...UNFINISHED_PYRAMID, plans: [UNFINISHED_GROUND, UNFINISHED_1, UNFINISHED_2, UNFINISHED_SUMMIT],
  creatures: { 1: "tally_labourer", 2: "overseer_shade", 3: "grit_wraith", 4: "glasswing_vulture" },
  names: { T: "A rush torch in a builders' bracket", x: "Casing blocks, dressed, numbered, never laid", o: "A pier of rough-dressed stone, never faced", B: "A builder's mat, rolled up where he left it",
    W: "A tally scratched into the wall: so many blocks, so many days", C: "The builders' lifting frame, its ropes rotted through", R: "Rollers of cedar, hauled all the way up and never used" },
  coffers: ["", "A builders' coffer", "A builders' coffer", "The overseer's strongbox"],
};
const SIRUVET: Pyramid = {
  id: "siruvet_pyramid", name: "The Pyramid of Queen Siruvet", ...SIRUVET_PYRAMID, plans: [SIRUVET_GROUND, SIRUVET_1, SIRUVET_2, SIRUVET_3],
  creatures: { 5: "linen_retainer", 6: "lapis_guardian", 7: "lamp_keeper", 8: "gold_eater" },
  names: { T: "A bronze lamp on a stand, still burning", x: "Jars sealed with the queen's name ring", o: "A column painted lapis blue, with gold stars on it", S: "A servant's coffin of painted cedar, sealed",
    A: "The offering table: bread, beer and linen, all of it carved in stone", Q: "Queen Siruvet's sarcophagus: lapis and gold over black stone, her name cut whole in its ring" },
  coffers: ["", "A coffer of the queen's household", "A coffer of the queen's household", "The queen's grave-goods"],
};
/** Plan letters that are things, and what kind of thing (the name comes from the pyramid). */
const THINGS: Record<string, { decor: DecorKind; blocks: boolean }> = {
  T: { decor: "torch", blocks: false }, x: { decor: "crate", blocks: true }, o: { decor: "pillar", blocks: true }, B: { decor: "bedroll", blocks: false }, W: { decor: "plaque", blocks: true },
  C: { decor: "device", blocks: true }, R: { decor: "logpile", blocks: true }, S: { decor: "tomb", blocks: true }, A: { decor: "table", blocks: true }, Q: { decor: "tomb", blocks: true },
};
const terrainOf = (ch: string) => ch === "#" ? T.WALL : ch === " " ? T.VOID : ch === "," ? T.GRAVEL : ch === "c" ? T.CARPET : T.STONE;
/** Plan letters you can stand on with nothing there (a landing at the top or the foot of the stairs). */
const BARE = new Set([".", ",", "c"]);

export function buildPyramids(ctx: GenContext, t: Tools, kit: SouthKit, floors: Floor[], site: Site) {
  const { get, put, add, decor, setRegion, tileIndex, building, clearAt, fillRect } = t;
  const { monsterAt, put2, clue } = kit, lift = ctx.lift;

  /**
   * Raise a pyramid: its building (one complex, storeys tall), its ground floor laid over the building's own floor, its
   * storeys kept in the storey rows, the things and creatures on every floor, and stairs where one floor's 'U' stands
   * over the next floor's 'D'. Returns where its ground floor's descent ('H') stands.
   */
  const raise = (p: Pyramid) => {
    const size = p.plans[0].length, x1 = p.x0 + size - 1, y1 = p.y0 + size - 1;
    building(p.x0, p.y0, x1, y1, "n", T.STONE, undefined, { name: p.name, walls: "sandstone", pyramid: true, hip: true, roof: "gable", chimney: false, complex: p.id,
      storeys: p.plans.length - (p.id === "unfinished_pyramid" ? 1 : 0), color: p.id === "unfinished_pyramid" ? "#c9a878" : "#dcc08e", ...(p.id === "unfinished_pyramid" ? { unfinished: true } : {}) });
    // Each storey: where it really stands (three tiles in per storey), and where its tiles are kept.
    const levels = p.plans.map((plan, level) => {
      const rx0 = p.x0 + level * STEP, ry0 = p.y0 + level * STEP, n = plan.length;
      if (!level) return { plan, rx0, ry0, dx: 0, dy: 0 };
      const floor: Floor = { complex: p.id, level, x0: rx0, y0: ry0, x1: rx0 + n - 1, y1: ry0 + n - 1, dx: STORE_X[p.id][level - 1] - rx0, dy: FLOOR_Y + 2 - ry0 };
      floors.push(floor);
      return { plan, rx0, ry0, dx: floor.dx, dy: floor.dy };
    });
    const at = (level: number, col: number, row: number) => ({ x: levels[level].rx0 + col + levels[level].dx, y: levels[level].ry0 + row + levels[level].dy });
    let descent: { x: number; y: number } | null = null;
    levels.forEach(({ plan }, level) => plan.forEach((line, row) => [...line].forEach((ch, col) => {
      const { x, y } = at(level, col, row);
      put(x, y, terrainOf(ch)); clearAt(x, y);
      if (level) { setRegion(x, y, p.id); lift[tileIndex(x, y)] = 0; }
      const thing = THINGS[ch];
      if (thing) decor(x, y, thing.decor, thing.blocks, p.names[ch]);
      else if (ch === "K") decor(x, y, "chest", true, p.coffers[level]);
      else if (p.creatures[ch]) t.monster(p.creatures[ch], x, y, 2);
      else if (ch === "M") add({ kind: "sign", x, y, blocks: true, name: "Builders' marks", clue: "pyramid_marks", text: "" });
      else if (ch === "I") add({ kind: "sign", x, y, blocks: true, name: "The queen's measure", clue: "siruvet_measure", text: "" });
      else if (ch === "H") descent = { x, y };
    })));
    // The stairs: up from each 'U', down from the 'D' over it, each landing beside the other's foot.
    const landing = (level: number, col: number, row: number) => {
      const plan = levels[level].plan;
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (BARE.has(plan[row + dy]?.[col + dx] ?? "")) return at(level, col + dx, row + dy);
      return at(level, col, row + 1);
    };
    for (let level = 0; level + 1 < levels.length; level++) levels[level].plan.forEach((line, row) => [...line].forEach((ch, col) => {
      if (ch !== "U") return;
      const up = levels[level + 1], ucol = col - STEP, urow = row - STEP;
      if (up.plan[urow]?.[ucol] !== "D") return;
      const foot = at(level, col, row), top = at(level + 1, ucol, urow);
      add({ kind: "ladder", look: "stairs", ...foot, blocks: true, name: "Stairs", action: "Climb-up", to: landing(level + 1, ucol, urow) });
      add({ kind: "ladder", look: "stairs", ...top, blocks: true, name: "Stairs", action: "Climb-down", to: landing(level, col, row) });
    }));
    return descent as { x: number; y: number } | null;
  };

  // ---------- The Unfinished Pyramid: its site, its ramps and its builders' leavings ----------
  const U = UNFINISHED_PYRAMID, ucx = (U.x0 + U.x1) >> 1;
  site.ground(U.x0 - 8, U.y0 - 9, U.x1 + 8, U.y1 + 8, T.GRAVEL);
  site.area(U.x0 - 10, U.y0 - 11, U.x1 + 10, U.y1 + 10, "unfinished_pyramid");
  const shaft = raise(UNFINISHED);
  // The builders' ramps against its faces, slumped: mudbrick embankments running out from the south and east faces.
  for (let k = 0; k < 7; k++) {
    for (const side of [-1, 1]) put2(ucx + side * 3, U.y1 + 2 + k, "ruin_wall", "The builders' ramp, slumped");
    put2(U.x1 + 2 + k, U.y0 + 12 + (k >> 1), "ruin_wall", "The builders' ramp, slumped");
  }
  for (let y = U.y1 + 1; y <= U.y1 + 8; y++) for (let x = ucx - 2; x <= ucx + 2; x++) if (get(x, y) === T.GRAVEL) put(x, y, T.SAND);
  for (const [x, y, kind, name] of [
    [U.x0 - 4, U.y0 - 5, "wagon", "A stone sledge, its runners sunk in the sand"], [U.x0 - 6, U.y0 + 6, "wagon", "A stone sledge with a casing block still roped to it"],
    [U.x1 + 4, U.y0 - 4, "logpile", "Rollers of old cedar, split and dry"], [U.x1 + 6, U.y0 + 2, "logpile", "Rollers of old cedar, split and dry"],
    [U.x0 - 3, U.y0 + 14, "crate", "Casing blocks, dressed, numbered, never laid"], [U.x0 - 5, U.y0 + 18, "crate", "Casing blocks, dressed, numbered, never laid"], [U.x0 - 3, U.y0 + 24, "crate", "Casing blocks, dressed, numbered, never laid"],
    [U.x1 + 3, U.y0 + 24, "crate", "Casing blocks, dressed, numbered, never laid"], [U.x1 + 5, U.y1 - 4, "crate", "Casing blocks, dressed, numbered, never laid"], [U.x0 + 4, U.y1 + 4, "crate", "Casing blocks, dressed, numbered, never laid"],
    [U.x1 - 5, U.y1 + 5, "device", "A builders' lifting frame, fallen on its side"], [U.x0 - 6, U.y1 + 2, "campfire_cold", "The builders' hearth, cold for longer than anyone has counted"],
    [U.x0 - 4, U.y1 + 4, "bones", "Bones, sand-scoured, in a row, as if they lay down to sleep"], [U.x1 + 6, U.y1 + 3, "rubble", "Spoil from the ramps"], [U.x0 - 7, U.y0 + 28, "rubble", "Spoil from the ramps"],
  ] as const) put2(x, y, kind as DecorKind, name);
  // The forecourt at the door, and the road from Tamesh to it.
  fillRect(ucx - 2, U.y0 - 6, ucx + 3, U.y0 - 1, T.PATH);
  site.sign(ucx - 4, U.y0 - 3, "The Unfinished Pyramid", UNFINISHED_SIGN);

  // ---------- Queen Siruvet's pyramid, west across the sand ----------
  const S = SIRUVET_PYRAMID, scx = (S.x0 + S.x1) >> 1;
  site.ground(S.x0 - 6, S.y0 - 10, S.x1 + 6, S.y1 + 5, null);
  site.area(S.x0 - 8, S.y0 - 12, S.x1 + 8, S.y1 + 6, "siruvet_pyramid");
  const stair = raise(SIRUVET);
  // Her causeway: dressed stone from the door north, an obelisk each side of its head, her statues along it.
  fillRect(scx - 1, S.y0 - 9, scx + 2, S.y0 - 1, T.STONE);
  for (const side of [-1, 1]) {
    const x = side < 0 ? scx - 3 : scx + 4;
    decor(x, S.y0 - 8, "obelisk", true, "An obelisk of red granite, its glyphs cut whole and sharp, a cap of electrum on its point");
    for (const y of [S.y0 - 5, S.y0 - 2]) decor(x, y, "statue", true, "Queen Siruvet seated in black stone, her hands flat on her knees, her face worn but whole");
  }
  site.sign(scx - 5, S.y0 - 6, "The Pyramid of Queen Siruvet", SIRUVET_SIGN);
  // A path between the two forecourts.
  t.line([[ucx - 2, U.y0 - 4], [700, U.y0 - 7], [680, S.y0 - 6], [scx + 3, S.y0 - 6]], 2.2, (x, y, tt) => { if (tt === T.SAND || tt === T.GRAVEL || tt === T.STONE) put(x, y, T.PATH); });

  // ---------- The Uncounted Deep, under the Unfinished Pyramid ----------
  {
    const D = UNCOUNTED_DEEP, X = D.x0, Y = D.y0, deep = REGION_INDEX("uncounted_deep");
    for (let y = Y - 2; y <= D.y1 + 1; y++) for (let x = X - 2; x <= D.x1 + 2; x++) { put(x, y, T.VOID); setRegion(x, y, "uncounted_deep"); }
    const hall = (ax: number, ay: number, bx: number, by: number, kind: number = T.DUNGEON) => { for (let y = Y + ay; y <= Y + by; y++) for (let x = X + ax; x <= X + bx; x++) put(x, y, kind); };
    hall(1, 1, 11, 9, T.STONE);                 // the shaft's foot, under the sealed block
    hall(11, 4, 72, 10);                        // the Counting Gallery
    hall(37, 10, 39, 14, T.STONE);              // down to
    hall(14, 15, 66, 23);                       // the Builders' Ossuary
    hall(72, 1, 112, 23, T.STONE);              // the Slump, where the roof came down
    hall(112, 1, 170, 23);                      // the Drowned Measure
    hall(170, 3, 222, 21);                      // the Ward Hall
    hall(222, 6, 226, 8, T.STONE); hall(226, 1, 262, 11);    // the Treasury of the Count
    hall(222, 16, 226, 18, T.STONE); hall(226, 14, 262, 23); // the Weighing Room
    hall(262, 5, 268, 7, T.STONE); hall(262, 18, 268, 20, T.STONE); hall(268, 1, 308, 23); // the Hall of the Uncounted
    hall(308, 10, 312, 14, T.STONE); hall(312, 8, 319, 16, T.STONE);                         // and the hoard behind the king
    // The Drowned Measure: black water between causeways (one along, three across), the coffers at their ends.
    for (let y = Y + 1; y <= Y + 23; y++) for (let x = X + 114; x <= X + 168; x++) {
      const along = y >= Y + 11 && y <= Y + 13, across = [124, 142, 160].some(c => x >= X + c - 1 && x <= X + c + 1);
      if (!along && !across) put(x, y, (x * 7 + y * 3) % 13 === 0 ? T.DEEP : T.WATER);
    }
    // The Slump: fallen blocks everywhere but a way through that winds between them (and a nook off it).
    const way: [number, number, number, number][] = [[72, 6, 82, 8], [80, 6, 82, 19], [80, 17, 94, 19], [92, 4, 94, 19], [92, 4, 106, 6], [104, 4, 106, 14], [104, 12, 112, 14], [82, 9, 88, 12], [94, 16, 102, 20]];
    const onWay = (x: number, y: number) => way.some(([ax, ay, bx, by]) => x >= X + ax && x <= X + bx && y >= Y + ay && y <= Y + by);
    for (let y = Y + 1; y <= Y + 23; y++) for (let x = X + 73; x <= X + 111; x++) {
      if (onWay(x, y)) continue;
      const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if (h % 5 < 3) put(x, y, T.WALL); else decor(x, y, h % 2 ? "rubble" : "boulder", true, h % 2 ? "Fallen roof, in slabs" : "A casing block that came down from above");
    }
    // Walls round everything that's floor (only round this deep's own: the older dungeons beside it are left as they are).
    const floor = (tt: number) => tt === T.STONE || tt === T.DUNGEON || tt === T.WATER || tt === T.DEEP;
    for (let y = Y - 1; y <= D.y1 + 1; y++) for (let x = X - 1; x <= D.x1 + 1; x++) {
      if (get(x, y) !== T.VOID) continue;
      let beside = false;
      for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) if (floor(get(x + dx, y + dy)) && ctx.region[tileIndex(x + dx, y + dy)] === deep) beside = true;
      if (beside) put(x, y, T.WALL);
    }
    // The way up, and the sealed block above it that leads down (pyramidsclues.ts: once you've read the builders' count).
    const foot = { x: X + 4, y: Y + 3 };
    if (shaft) {
      add({ kind: "ladder", x: foot.x, y: foot.y - 1, blocks: true, name: "The builders' shaft", action: "Climb-up", to: { x: shaft.x, y: shaft.y + 1 } });
      add({ kind: "ladder", x: shaft.x, y: shaft.y, blocks: true, name: "The sealed shaft", action: "Climb-down", to: foot, clue: "uncounted_shaft" });
    }
    const things = (kind: DecorKind, name: string, blocks: boolean, points: readonly (readonly [number, number])[]) => { for (const [dx, dy] of points) put2(X + dx, Y + dy, kind, name, blocks); };
    // The gallery: pillars in two rows, the tally running along its north wall between them.
    for (let dx = 15; dx <= 69; dx += 6) { put2(X + dx, Y + 5, "pillar", "A pillar cut with the count: strokes in fives, from the floor to as high as a builder could reach"); put2(X + dx, Y + 9, "pillar", "A pillar cut with the count: strokes in fives, from the floor to as high as a builder could reach"); }
    things("plaque", "The tally, cut in the wall: stroke after stroke, row after row, going on past where the builders' tally upstairs stopped", true, [[18, 4], [30, 4], [42, 4], [54, 4], [66, 4]]);
    // The ossuary's coffins, row on row; the ward hall's empty niches; the treasury's balance; the king's hall.
    for (let dx = 18; dx <= 62; dx += 5) { put2(X + dx, Y + 17, "tomb", "A coffin of plain cedar, its lid pushed off from inside"); put2(X + dx, Y + 21, "tomb", "A coffin of plain cedar, its lid pushed off from inside"); }
    for (let dx = 174; dx <= 218; dx += 4) { put2(X + dx, Y + 4, "pillar", "A ward niche, empty: it was cut for a ward that was never set"); put2(X + dx, Y + 20, "pillar", "A ward niche, empty: it was cut for a ward that was never set"); }
    clue(X + 196, Y + 5, { kind: "sign", blocks: true, name: "The count of wards", clue: "uncounted_wards", text: "" });
    things("device", "A great balance of bronze, one pan resting on the floor, the other high and empty", true, [[244, 18]]);
    for (let dx = 272; dx <= 304; dx += 6) { put2(X + dx, Y + 6, "pillar", "A column carved as a bundle of measuring rods"); put2(X + dx, Y + 18, "pillar", "A column carved as a bundle of measuring rods"); }
    things("throne", "The Uncounted King's throne, its back cut with a name ring that has nothing in it", true, [[305, 12]]);
    clue(X + 288, Y + 2, { kind: "sign", blocks: true, name: "The king's lintel", clue: "uncounted_lintel", text: "" });
    things("bones", "Bones, sorted into heaps by size, as if someone had been counting them", false, [[20, 20], [50, 16], [130, 12], [200, 12], [280, 3], [290, 21]]);
    // Coffers everywhere, and the hoard behind the king.
    const coffer = "A coffer of the Uncounted";
    things("chest", coffer, true, [[16, 22], [64, 16], [40, 22], [100, 20], [124, 2], [142, 22], [160, 2], [168, 12], [172, 4], [220, 20],
      [230, 2], [236, 2], [242, 2], [248, 2], [254, 2], [260, 2], [234, 10], [252, 10], [228, 22], [260, 22], [314, 9], [314, 15]]);
    put2(X + 318, Y + 12, "chest", "The Uncounted King's hoard");
    // Light: brackets along the walls, every few paces, in every hall.
    const torches: [number, number][] = [[2, 2], [10, 2], [2, 8], [10, 8], [38, 12], [15, 16], [65, 16], [15, 22], [65, 22], [73, 7], [111, 13], [113, 11], [169, 13], [113, 1], [169, 1], [113, 23], [169, 23],
      [171, 4], [221, 4], [171, 20], [221, 20], [227, 2], [261, 2], [227, 10], [261, 10], [227, 15], [261, 15], [227, 22], [261, 22], [269, 2], [307, 2], [269, 22], [307, 22], [310, 12], [313, 9], [313, 15], [318, 9], [318, 15]];
    for (let dx = 13; dx <= 71; dx += 8) torches.push([dx, 4], [dx, 10]);
    for (let dx = 20; dx <= 62; dx += 8) torches.push([dx, 15], [dx, 23]);
    for (let dx = 176; dx <= 216; dx += 8) torches.push([dx, 3], [dx, 21]);
    for (let dx = 276; dx <= 300; dx += 8) torches.push([dx, 1], [dx, 23]);
    for (const [dx, dy] of [[81, 7], [93, 18], [105, 5], [86, 10], [99, 18]]) torches.push([dx, dy]);
    // Standing lamps out on the causeways over the water, round the ward hall's middle, and round the king.
    for (let dx = 118; dx <= 166; dx += 8) torches.push([dx, dx % 16 ? 11 : 13]);
    for (const c of [124, 142, 160]) torches.push([c - 1, 5], [c + 1, 19]);
    for (const [dx, dy] of [[186, 8], [206, 8], [186, 16], [206, 16], [196, 12], [244, 6], [244, 19], [278, 8], [278, 16], [302, 8], [302, 16], [284, 6], [296, 6], [284, 18], [296, 18], [40, 7], [64, 19], [28, 19]]) torches.push([dx, dy]);
    for (const [dx, dy] of torches) put2(X + dx, Y + dy, "torch", "A bracket lamp, burning on something that isn't oil", false);
    // What walks here.
    const pack = (id: string, points: readonly (readonly [number, number])[], wander = 3) => { for (const [dx, dy] of points) monsterAt(id, X + dx, Y + dy, wander); };
    pack("uncounted_dead", [[24, 7], [36, 7], [48, 7], [60, 7]]); pack("ward_scribe", [[66, 7]]);
    pack("uncounted_dead", [[22, 19], [30, 19], [38, 19], [46, 19], [54, 19], [62, 19]]);
    pack("gold_eater", [[81, 12], [86, 18], [93, 10], [100, 5], [105, 9]], 2);
    pack("drowned_overseer", [[124, 6], [142, 17], [160, 7], [133, 12], [151, 12]], 2); pack("uncounted_dead", [[118, 12], [164, 12]], 2);
    pack("ward_scribe", [[180, 9], [190, 15], [204, 9], [214, 15]]); pack("tally_wraith", [[185, 12], [198, 17], [210, 12]]);
    pack("measure_golem", [[236, 6], [252, 6]], 2); pack("gold_eater", [[230, 6], [244, 4], [258, 8]], 2);
    pack("measure_golem", [[232, 19], [244, 21], [256, 19]], 2); pack("tally_wraith", [[244, 15]]);
    pack("ward_scribe", [[276, 9], [276, 15]], 2); pack("tally_wraith", [[300, 9], [300, 15]], 2);
    monsterAt("uncounted_king", X + 290, Y + 12, 1);
  }

  // ---------- The Measured Vault, under Queen Siruvet's ----------
  {
    const { west: Wv, east: E } = MEASURED_VAULT, vault = REGION_INDEX("measured_vault");
    for (let y = Wv.y0 - 2; y <= Wv.y1 + 2; y++) for (let x = Wv.x0 - 2; x <= Wv.x1 + 1; x++) { put(x, y, T.VOID); setRegion(x, y, "measured_vault"); }
    for (let y = E.y0 - 2; y <= E.y1 + 2; y++) for (let x = E.x0 - 3; x <= E.x1 + 2; x++) { put(x, y, T.VOID); setRegion(x, y, "measured_vault"); }
    const hall = (ax: number, ay: number, bx: number, by: number, kind: number = T.DUNGEON) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) put(x, y, kind); };
    hall(Wv.x0, Wv.y0, Wv.x0 + 9, Wv.y1, T.STONE);            // the foot of the queen's stair
    hall(Wv.x0 + 9, Wv.y0 + 1, Wv.x0 + 57, Wv.y1 - 1);       // the Gallery of Lamps
    hall(Wv.x0 + 57, Wv.y0, Wv.x1, Wv.y1);                   // the Hall of Offerings
    hall(Wv.x1, Wv.y0 + 2, E.x0, Wv.y0 + 4, T.STONE);        // a step up, east
    hall(E.x0, E.y0, E.x1, E.y1);                             // the Hall of the Balance
    const floor = (tt: number) => tt === T.STONE || tt === T.DUNGEON;
    for (let y = E.y0 - 1; y <= Wv.y1 + 1; y++) for (let x = Wv.x0 - 1; x <= E.x1 + 1; x++) {
      if (get(x, y) !== T.VOID || ctx.region[tileIndex(x, y)] !== vault) continue;
      let beside = false;
      for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) if (floor(get(x + dx, y + dy)) && ctx.region[tileIndex(x + dx, y + dy)] === vault) beside = true;
      if (beside) put(x, y, T.WALL);
    }
    const foot = { x: Wv.x0 + 3, y: Wv.y0 + 2 };
    if (stair) {
      add({ kind: "ladder", x: foot.x, y: foot.y - 1, blocks: true, name: "The queen's stair", action: "Climb-up", to: { x: stair.x, y: stair.y + 1 } });
      add({ kind: "ladder", x: stair.x, y: stair.y, blocks: true, name: "A stair under the floor", action: "Climb-down", to: foot, clue: "siruvet_stair" });
    }
    for (let x = Wv.x0 + 12; x <= Wv.x0 + 54; x += 6) { put2(x, Wv.y0 + 1, "torch", "A bronze lamp on a stand, still burning", false); put2(x, Wv.y1 - 1, "torch", "A bronze lamp on a stand, still burning", false); put2(x + 3, Wv.y0 + 2, "pillar", "A column painted lapis blue, with gold stars on it"); put2(x + 3, Wv.y1 - 2, "pillar", "A column painted lapis blue, with gold stars on it"); }
    for (let x = Wv.x0 + 62; x <= Wv.x1 - 4; x += 8) { put2(x, Wv.y0 + 1, "table", "An offering table, its loaves and jars carved in stone"); put2(x + 4, Wv.y1 - 1, "tomb", "A sealed coffin of the queen's household"); }
    for (const [x, y] of [[Wv.x0 + 1, Wv.y0], [Wv.x0 + 8, Wv.y0], [Wv.x0 + 1, Wv.y1], [Wv.x0 + 8, Wv.y1], [Wv.x0 + 58, Wv.y0], [Wv.x1 - 1, Wv.y0], [Wv.x0 + 58, Wv.y1], [Wv.x1 - 1, Wv.y1], [Wv.x0 + 80, Wv.y0], [Wv.x0 + 80, Wv.y1],
      [E.x0 + 1, E.y0], [E.x1, E.y0], [E.x0 + 1, E.y1], [E.x1, E.y1], [E.x0 + 13, E.y0], [E.x0 + 26, E.y0], [E.x0 + 39, E.y0], [E.x0 + 13, E.y1], [E.x0 + 26, E.y1], [E.x0 + 39, E.y1]] as const)
      put2(x, y, "torch", "A bronze lamp on a stand, still burning", false);
    put2(E.x0 + 30, E.y0 + 6, "device", "The queen's balance: two pans of gold, level, and nothing in either");
    for (let x = E.x0 + 6; x <= E.x1 - 6; x += 8) { put2(x, E.y0 + 2, "pillar", "A column painted lapis blue, with gold stars on it"); put2(x, E.y1 - 2, "pillar", "A column painted lapis blue, with gold stars on it"); }
    const coffer = "A coffer of the Measured Vault";
    for (const [x, y] of [[Wv.x0 + 59, Wv.y0], [Wv.x0 + 82, Wv.y0], [Wv.x1, Wv.y1], [Wv.x0 + 30, Wv.y0 + 1], [E.x1 - 2, E.y0], [E.x1 - 2, E.y1], [E.x0 + 2, E.y1]] as const) put2(x, y, "chest", coffer);
    put2(E.x1, E.y0 + 6, "chest", "Siruvet's hoard");
    const pack = (id: string, points: readonly (readonly [number, number])[], wander = 3) => { for (const [x, y] of points) monsterAt(id, x, y, wander); };
    pack("lamp_keeper", [[Wv.x0 + 18, Wv.y0 + 4], [Wv.x0 + 30, Wv.y0 + 4], [Wv.x0 + 42, Wv.y0 + 4], [Wv.x0 + 52, Wv.y0 + 4]]); pack("linen_retainer", [[Wv.x0 + 24, Wv.y0 + 5], [Wv.x0 + 47, Wv.y0 + 5]]);
    pack("lapis_guardian", [[Wv.x0 + 64, Wv.y0 + 4], [Wv.x0 + 78, Wv.y0 + 4], [Wv.x0 + 92, Wv.y0 + 4]], 2); pack("gold_eater", [[Wv.x0 + 70, Wv.y0 + 6], [Wv.x0 + 100, Wv.y0 + 3]], 2);
    pack("lapis_guardian", [[E.x0 + 8, E.y0 + 6], [E.x1 - 8, E.y0 + 3]], 2); pack("lamp_keeper", [[E.x0 + 18, E.y0 + 3], [E.x0 + 18, E.y1 - 3]], 2);
    monsterAt("gilded_keeper", E.x0 + 38, E.y0 + 6, 1);
  }
  void DUNGEON_Y; void ([] as WorldObject[]);
}

import { REGIONS } from "./world.ts";
const REGION_INDEX = (id: RegionId) => REGIONS.findIndex(region => region.id === id);
