/**
 * The Land Before Stone: Kharaveth's heartlands, beyond Foothold's south gate.
 *
 * Three dynasties came out of one house. House Khasreth ruled Kharaveth from Sefrah for nine generations; when the Grand
 * Matriarch Ushara Khasreth died, forty days before you arrive, she left three heirs and no seal, and each heir holds a
 * third of the country. The Gilded Court (Lady Seleneh) keeps Sefrah, the Gilded City on the river Ashar: its treasury,
 * its bazaar, its palace with the gold dome. The Obsidian Legacy (Warden Meretkhet) keeps Tamesh, the quarry town at the
 * Black Range's foot, and every monument in the country, and says it is the oldest blood. The Copper Banner (Marshal
 * Ardesh) keeps Khetmar, the fortress on the eastern pass, and the roads, and the army.
 *
 * Between them: the nomads, who were here before the dynasties and expect to be here after. The Zuri, the Blue Smoke
 * people, camp north of the Ochre Spine; the Ouresh salt riders cross the Sea of Dunes in the west. And under all of it,
 * and standing up out of it here and there, Azhurak: the Seven Crowns, the Hall of First Names cut into the Spine, the
 * Sunken Obelisk, the Black Stair in the Black Range, and the Unfinished Pyramid that nobody finished.
 *
 * Built after the north (south.ts), in the grown world's own coordinates. Module constants are literals (see south.ts).
 */
import { DUNGEON_Y, OVERWORLD_H, T, W, isWater, type Building, type DecorKind, type Floor, type GenContext, type RegionId, type World, type WorldObject, type worldTools } from "./world.ts";
import type { RockKind } from "./data.ts";
import { buildPyramids } from "./pyramids.ts";

type Tools = ReturnType<typeof worldTools>;
/** What south.ts lends the heartlands: its coast test, and its careful placers. */
export type SouthKit = {
  land: (x: number, y: number) => boolean; random: () => number;
  nearFree: (x: number, y: number, limit?: number) => [number, number]; occupied: (x: number, y: number) => boolean; open: (t: number) => boolean;
  npcAt: (id: string, x: number, y: number, wander?: number) => void; monsterAt: (id: string, x: number, y: number, wander?: number) => void;
  put2: (x: number, y: number, kind: DecorKind, name?: string, blocks?: boolean) => WorldObject | null;
  clue: (x: number, y: number, object: Omit<WorldObject, "id" | "x" | "y">) => WorldObject | null;
  /** The world's upper storeys (the pyramids keep theirs here). */
  floors?: Floor[];
};

export const SEFRAH = { x0: 780, y0: 644, x1: 836, y1: 692 } as const;
export const TAMESH = { x0: 752, y0: 772, x1: 790, y1: 804 } as const;
export const KHETMAR = { x0: 1028, y0: 684, x1: 1064, y1: 716 } as const;
export const ZURI = { x: 432, y: 686 } as const;
export const OURESH = { x: 236, y: 702 } as const;
/** The Matriarch's tomb, outside Sefrah's east gate: a pyramid still being cased. */
export const MATRIARCH_TOMB = { x0: 846, y0: 646, x1: 856, y1: 656 } as const;
export const SITES = {
  seven_crowns: { x: 250, y: 604 }, first_names: { x: 520, y: 716 }, sunken_obelisk: { x: 330, y: 832 },
  black_stair: { x: 930, y: 792 }, unfinished_pyramid: { x: 720, y: 828 },
} as const;
/** The Black Stair's halls (dungeon rows, in columns no older dungeon uses; the stair itself is in the Black Range). */
export const BLACK_STAIR = { x0: 160, x1: 270, row0: 4, row1: 50 } as const;
/** The Ashar's course and the Ochre Spine's line (south.ts draws them; the heartlands' regions follow them). */
export const ASHAR: readonly (readonly [number, number])[] = [[860, 742], [820, 716], [770, 690], [742, 650], [748, 608], [770, 570], [786, 540]];
export const SPINE: readonly (readonly [number, number])[] = [[300, 800], [380, 770], [450, 735], [520, 718], [590, 690], [650, 664], [700, 650]];

const toLine = (points: readonly (readonly [number, number])[], x: number, y: number) => {
  let best = Infinity;
  for (let k = 0; k + 1 < points.length; k++) {
    const [ax, ay] = points[k], [bx, by] = points[k + 1], dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - dx * u, y - ay - dy * u));
  }
  return best;
};

/** Kharaveth's colours for its buildings: sandstone, mudbrick, the dynasties' roofs. */
const ROOF = { sand: "#cfae7e", mud: "#c2a47c", gold: "#c9a050", lapis: "#2f3f66", copper: "#a8643a", black: "#3a3640", linen: "#e6dcc6" } as const;

export function buildHeartlands(ctx: GenContext, t: Tools, places: World["places"], kit: SouthKit) {
  const { get, put, add, decor, npc, setRegion, tileIndex, inBounds, building, clearAt, fillRect, road } = t;
  const { land, random, nearFree, occupied, npcAt, monsterAt, put2, clue } = kit, lift = ctx.lift;
  const regionOf = (x: number, y: number) => ctx.region[tileIndex(x, y)];
  const steppe = REGION_INDEX("ochre_steppe");

  // ---------- 1. The heartlands' regions: the broad country first, then the towns and the old places ----------
  for (let y = 520; y < OVERWORLD_H; y++) for (let x = 40; x <= 1110; x++) {
    if (regionOf(x, y) !== steppe) continue;
    const wob = (ctx.noise(x * 0.4, y * 0.4) - 0.5) * 30;
    if (((x - 900) / (150 + wob)) ** 2 + ((y - 790) / 74) ** 2 <= 1) setRegion(x, y, "black_range");
    else if (toLine(ASHAR, x, y) < 24 + wob * 0.3 && y > 600) setRegion(x, y, "ashar_valley");
    else if (x > 975 + wob) setRegion(x, y, "khetmar_pass");
    else if (x < 400 + wob * 2) setRegion(x, y, "sea_of_dunes");
    else if (toLine(SPINE, x, y) < 26 + wob * 0.3) setRegion(x, y, "ochre_spine");
  }
  const area = (x0: number, y0: number, x1: number, y1: number, id: RegionId) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inBounds(x, y) && land(x, y)) setRegion(x, y, id); };
  const round = (cx: number, cy: number, r: number, id: RegionId) => area(cx - r, cy - r, cx + r, cy + r, id);

  /** Clear a site (objects, monster spawns), take the cliffs and dunes out of it, and pave it if asked. */
  const ground = (x0: number, y0: number, x1: number, y1: number, paving: number | null = null, flat = true) => {
    let sum = 0, n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inBounds(x, y)) { sum += lift[tileIndex(x, y)]; n++; }
    const mean = Math.min(1.2, sum / Math.max(1, n));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inBounds(x, y) || isWater(get(x, y))) continue;
      clearAt(x, y);
      for (let i = ctx.spawns.length - 1; i >= 0; i--) if (ctx.spawns[i].x === x && ctx.spawns[i].y === y) ctx.spawns.splice(i, 1);
      const tt = get(x, y);
      if (tt === T.CLIFF || tt === T.ASH || tt === T.VOID) put(x, y, T.SAND);
      if (paving !== null) put(x, y, paving);
      if (flat) lift[tileIndex(x, y)] = mean;
    }
  };
  /** A Kharaveth house: sandstone or mudbrick, flat-roofed (they sleep on the roofs in summer). */
  const house = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}, floor: number = T.WOOD) =>
    building(x0, y0, x1, y1, door, floor, undefined, { name, walls: "sandstone", roof: "flat", color: ROOF.sand, chimney: false, ...extra });
  const mud = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}) =>
    house(x0, y0, x1, y1, door, name, { walls: "mudbrick", color: ROOF.mud, ...extra }, T.GRAVEL);
  const home = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", what: string) => {
    const back = door === "s" ? y0 + 1 : door === "n" ? y1 - 1 : (y0 + y1) >> 1, bx = door === "e" ? x0 + 1 : door === "w" ? x1 - 1 : x0 + 1;
    decor(bx, back, "bed", true, "A low bed under a linen sheet"); decor(door === "e" || door === "w" ? bx : x1 - 1, door === "e" || door === "w" ? (door === "e" ? y0 + 1 : y1 - 1) : back, "shelf", true, what);
  };
  const sign = (x: number, y: number, label: string, text: string) => { const [sx, sy] = nearFree(x, y, 3); add({ kind: "sign", x: sx, y: sy, blocks: true, name: label, text }); };
  const villagers = (id: string, cx: number, cy: number, points: readonly (readonly [number, number])[]) => { for (const [dx, dy] of points) npcAt(id, cx + dx, cy + dy, 4); };

  // ---------- 2. The roads: out of Foothold's gate east over the Ashar to Sefrah, and west along the Spine to the nomads ----------
  const ROADS: readonly (readonly (readonly [number, number])[])[] = [
    [[634, 640], [660, 648], [700, 654], [730, 662], [760, 668], [780, 668]],                 // Foothold to Sefrah's west gate, the Ashar bridged
    [[808, 692], [806, 720], [796, 748], [780, 772]],                                         // Sefrah's south gate to Tamesh
    [[836, 668], [870, 672], [920, 676], [970, 686], [1010, 696], [1028, 700]],              // Sefrah's east gate to Khetmar
    [[634, 640], [600, 650], [560, 662], [510, 676], [460, 684], [ZURI.x + 6, ZURI.y]],       // Foothold west to the Zuri tents
    [[ZURI.x - 8, ZURI.y + 2], [380, 694], [320, 700], [OURESH.x + 8, OURESH.y]],            // on west into the dunes to the Ouresh
    [[OURESH.x, OURESH.y - 8], [244, 660], [250, SITES.seven_crowns.y + 8]],                 // the Ouresh to the Seven Crowns
    [[510, 676], [518, 694], [520, SITES.first_names.y - 4]],                                 // up into the Spine to the Hall of First Names
    [[780, 772], [752, 800], [722, 805]],                                                     // Tamesh down to the Unfinished Pyramid's door
  ];
  for (const points of ROADS) road(points, 2.4, T.PATH);
  // The caravan ways across the dunes are only cairns and a line of camel droppings: a trail, not a road.
  for (const points of [[[OURESH.x, OURESH.y + 6], [280, 760], [320, 812], [SITES.sunken_obelisk.x, SITES.sunken_obelisk.y - 6]], [[860, 676], [900, 720], [920, 770]]] as const)
    t.line(points, 1.4, (x, y, tt) => { if (tt === T.SAND || tt === T.GRAVEL) put(x, y, T.PATH); });

  // ---------- 3. Sefrah, the Gilded City ----------
  {
    const { x0, y0, x1, y1 } = SEFRAH, cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    ground(x0 - 3, y0 - 3, x1 + 3, y1 + 3, null);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : ctx.noise2(x * 1.3, y * 1.3) > 0.7 ? T.GRAVEL : T.SAND);
    area(x0 - 2, y0 - 2, x1 + 2, y1 + 2, "sefrah");
    ctx.ramparts?.push({ x0, y0, x1, y1, storeys: 2, walls: "sandstone" });
    // Three gates (west to the river, south to Tamesh, east to Khetmar); the Avenue of the Sun east to west, the Way of the Court north.
    for (let d = -1; d <= 1; d++) { put(x0, cy + d, T.COBBLE); put(x1, cy + d, T.COBBLE); put(cx + d, y1, T.COBBLE); }
    fillRect(x0 + 1, cy - 1, x1 - 1, cy + 1, T.COBBLE); fillRect(cx - 1, y0 + 14, cx + 1, y1 - 1, T.COBBLE);
    for (const [tx, ty] of [[x0, y0], [x1 - 3, y0], [x0, y1 - 3], [x1 - 3, y1 - 3]] as const)
      house(tx, ty, tx + 3, ty + 3, "s", "A tower of Sefrah's wall", { roof: "flat", storeys: 3, color: ROOF.gold }, T.STONE);
    // The palace of the Gilded Court: a hall of state under a gold dome, at the head of the Way.
    building(cx - 10, y0 + 2, cx + 10, y0 + 13, "s", T.CARPET, undefined, { name: "The Palace of the Gilded Court", walls: "sandstone", roof: "cone", storeys: 2, spire: 30, color: ROOF.gold, keep: { size: 6, storeys: 1, spire: 100, dome: true } });
    npc("sefrah_vizier", cx - 3, y0 + 8); npc("sefrah_seleneh", cx + 3, y0 + 6);
    decor(cx, y0 + 4, "throne", true, "The Grand Matriarch's chair, empty, a white cloth over it for the forty days"); decor(cx - 8, y0 + 4, "banner", true, "The Gilded Court's banner: a gold sun on lapis");
    decor(cx + 8, y0 + 4, "banner", true, "House Khasreth's old banner: a falcon over three lines. All three dynasties still fly it, under their own"); decor(cx - 8, y0 + 11, "table", true, "The Court's table of audience, set for three");
    for (const dx of [-6, 6]) decor(cx + dx, y0 + 15, "statue", true, "A Khasreth matriarch in sandstone, her hands on a seal");
    // The treasury (the bank), the Temple of the Hidden Sun, the clerks' houses.
    house(x0 + 3, y0 + 3, x0 + 12, y0 + 11, "s", "The Sefrah Treasury", { storeys: 2, color: ROOF.lapis }, T.STONE);
    for (const by of [y0 + 5, y0 + 7]) add({ kind: "bank", x: x0 + 5, y: by, blocks: true, name: "Treasury counter" }); npc("banker", x0 + 8, y0 + 6);
    decor(x0 + 11, y0 + 4, "chest", true, "A Treasury strongbox with the Court's sun on the lid and three locks: one for each heir, these days");
    house(x1 - 13, y0 + 3, x1 - 3, y0 + 12, "s", "The Temple of the Hidden Sun", { storeys: 2, color: ROOF.lapis, walls: "sandstone" }, T.STONE);
    npc("sefrah_priestess", x1 - 8, y0 + 7); decor(x1 - 8, y0 + 4, "obelisk", true, "A small obelisk of black stone, older than the temple round it, an eye cut near the top");
    decor(x1 - 11, y0 + 4, "torch", false, "A temple lamp"); decor(x1 - 5, y0 + 4, "torch", false, "A temple lamp");
    // The bazaar south-west of the Avenue: stalls under awnings, a well in the middle.
    for (const [sx, sy, kind, name] of [[x0 + 4, cy + 4, "silk", "Linen stall"], [x0 + 8, cy + 4, "bakery", "Date and bread stall"], [x0 + 12, cy + 4, "gem", "Lapis and carnelian stall"],
      [x0 + 4, cy + 9, "fish", "River fish stall"], [x0 + 8, cy + 9, "silk", "Dye stall"], [x0 + 12, cy + 9, "bakery", "Spice stall"]] as const)
      add({ kind: "stall", stall: kind, x: sx, y: sy, blocks: true, name });
    for (const [ax, ay] of [[x0 + 6, cy + 6], [x0 + 10, cy + 6], [x0 + 14, cy + 11]] as const) put2(ax, ay, "canopy", "A striped awning");
    add({ kind: "well", x: x0 + 17, y: cy + 7, blocks: true, name: "The bazaar well" });
    house(x0 + 3, cy + 14, x0 + 10, y1 - 2, "n", "Hadiya's Emporium"); npc("sefrah_merchant", x0 + 6, cy + 17); decor(x0 + 4, y1 - 3, "shelf", true, "Everything from rope to rosewater, priced in Sefrah's gold and in Hollowmere's coin, at different rates");
    house(x0 + 13, cy + 14, x0 + 20, y1 - 2, "n", "Tahmira's Linens", { color: ROOF.linen }); npc("sefrah_clothier", x0 + 16, cy + 17); decor(x0 + 14, y1 - 3, "shelf", true, "Linen in bolts, white, whiter, and the white the Court wears");
    // South-east: the Lamp and Palm, the smithy, the houses of the city.
    house(cx + 4, cy + 4, cx + 14, cy + 12, "n", "The Lamp and Palm", { storeys: 2, color: ROOF.sand });
    npc("sefrah_innkeeper", cx + 9, cy + 7); decor(cx + 5, cy + 10, "table"); decor(cx + 12, cy + 10, "table"); add({ kind: "range", x: cx + 13, y: cy + 5, blocks: true, name: "Clay oven" });
    house(cx + 17, cy + 4, cx + 25, cy + 11, "n", "Kerub's Forge", { walls: "mudbrick", color: ROOF.mud }, T.STONE);
    npc("sefrah_smith", cx + 21, cy + 7); add({ kind: "furnace", x: cx + 18, y: cy + 10, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: cx + 23, y: cy + 10, blocks: true, name: "Anvil" });
    for (const [hx, hy] of [[cx + 4, cy + 15], [cx + 13, cy + 15], [cx + 20, cy + 15]] as const) { house(hx, hy, hx + 6, hy + 6, "n", "A Sefrah house", { color: (hx + hy) % 2 ? ROOF.sand : ROOF.linen }); home(hx, hy, hx + 6, hy + 6, "n", "Jars of oil and dates, a folded rug, a lamp"); }
    for (const [hx, hy] of [[x0 + 3, y0 + 15], [x1 - 10, y0 + 15]] as const) { house(hx, hy, hx + 7, hy + 6, "s", "A courtier's house", { color: ROOF.gold }); home(hx, hy, hx + 7, hy + 6, "s", "A scribe's palette, a lapis inkwell, letters to all three heirs, unsent"); }
    // Palms down the Avenue, the river quay outside the west gate, the guards, the people.
    for (let x = x0 + 4; x <= x1 - 4; x += 7) for (const dy of [-3, 3]) if (!occupied(x, cy + dy) && get(x, cy + dy) !== T.WALL) t.tree(x, cy + dy, "palm");
    for (let y = y0 + 15; y <= y1 - 3; y += 6) for (const dx of [-3, 3]) if (!occupied(cx + dx, y) && get(cx + dx, y) !== T.WALL) decor(cx + dx, y, "lamp", true, "A bronze street lamp");
    for (const [gx, gy] of [[x0 - 1, cy - 2], [x0 - 1, cy + 2], [cx - 2, y1 + 1], [cx + 2, y1 + 1], [x1 + 1, cy - 2], [x1 + 1, cy + 2]] as const) npcAt("sefrah_guard", gx, gy, 1);
    villagers("sefrah_villager", cx, cy, [[-14, 0], [-4, 2], [8, -1], [18, 1], [-20, 8], [0, 20], [-16, -12], [14, -10]]);
    sign(x0 - 3, cy - 3, "Sefrah", "SEFRAH, the Gilded City. Seat of House Khasreth these nine generations; seat of the Gilded Court since the Grand Matriarch's death. The Treasury is open. The Temple of the Hidden Sun is in mourning. Tamesh is south; Khetmar is east; Foothold is west, over the Ashar.");
    places.sefrah = { x: cx, y: cy };
  }
  // The Matriarch's tomb, outside the east gate: a pyramid still being cased, and the house of the embalmers beside it.
  {
    const M = MATRIARCH_TOMB;
    ground(M.x0 - 4, M.y0 - 3, M.x1 + 8, M.y1 + 6, null);
    building(M.x0, M.y0, M.x1, M.y1, "s", T.STONE, undefined, { name: "The Tomb of Ushara Khasreth", walls: "sandstone", pyramid: true, hip: true, roof: "gable", color: "#dcc08e", chimney: false });
    decor((M.x0 + M.x1) >> 1, M.y0 + 3, "tomb", true, "The Grand Matriarch's sarcophagus, sealed. Where every Khasreth lid has the falcon, hers has three suns, freshly cut");
    clue(M.x0 + 2, M.y0 + 6, { kind: "decor", decor: "table", blocks: true, name: "The tomb ledger", clue: "tomb_ledger" });
    house(M.x1 + 3, M.y0 + 1, M.x1 + 8, M.y0 + 7, "w", "The embalmers' house", { walls: "mudbrick", color: ROOF.mud }); npc("tomb_keeper", M.x1 + 5, M.y0 + 4);
    for (const [sx, sy] of [[M.x0 - 2, M.y1 + 3], [M.x1 + 2, M.y1 + 3], [M.x0 - 3, M.y0 + 2]] as const) put2(sx, sy, "crate", "Casing stones, dressed and numbered");
    area(M.x0 - 4, M.y0 - 3, M.x1 + 9, M.y1 + 6, "sefrah");
  }

  // ---------- 4. Tamesh, the quarry town of the Obsidian Legacy ----------
  {
    const { x0, y0, x1, y1 } = TAMESH, cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    ground(x0 - 2, y0 - 2, x1 + 2, y1 + 2, T.GRAVEL);
    area(x0 - 2, y0 - 2, x1 + 18, y1 + 2, "tamesh");
    fillRect(x0, cy - 1, x1 + 4, cy + 1, T.PATH);
    // The Warden's house (two storeys, the best stone in town, which is saying something), the masons' hall, the houses.
    house(cx - 6, y0 + 1, cx + 6, y0 + 9, "s", "The Warden's House", { storeys: 2, color: ROOF.black }, T.STONE);
    npc("tamesh_meretkhet", cx, y0 + 5); decor(cx - 4, y0 + 2, "banner", true, "The Obsidian Legacy's banner: a black obelisk on lapis"); decor(cx + 4, y0 + 2, "shelf", true, "Plans of every monument in Kharaveth, some of them twice: once as built, once as it ought to have been");
    house(x0 + 1, y0 + 1, x0 + 9, y0 + 8, "s", "The Masons' Hall", { walls: "sandstone", color: ROOF.black }, T.STONE);
    npc("tamesh_mason", x0 + 5, y0 + 4); decor(x0 + 2, y0 + 2, "table", true, "A mason's table: a cubit rod, a square, a plumb bob, and a block marked with the glyph for measure");
    decor(x0 + 8, y0 + 2, "statue", true, "A half-cut statue of a seated woman, still joined to its block at the back");
    mud(x1 - 9, y0 + 1, x1 - 1, y0 + 8, "s", "Ketty's Weaving"); npc("tamesh_clothier", x1 - 5, y0 + 4); decor(x1 - 2, y0 + 2, "shelf", true, "Black linen and blue thread, nothing else, and no apology for it");
    for (const [hx, hy] of [[x0 + 1, cy + 3], [x0 + 9, cy + 3], [cx + 3, cy + 3], [x1 - 7, cy + 3]] as const) { mud(hx, hy, hx + 6, hy + 6, "n", "A Tamesh house"); home(hx, hy, hx + 6, hy + 6, "n", "A stonecutter's tools, wrapped in oiled cloth, and a child's clay obelisk"); }
    add({ kind: "furnace", x: cx - 3, y: cy - 4, blocks: true, name: "Furnace" }); add({ kind: "anvil", x: cx + 3, y: cy - 4, blocks: true, name: "Anvil" });
    add({ kind: "well", x: cx, y: cy + 1, blocks: true, name: "The quarry well" });
    // The quarry, east into the Range's foot: terraces cut in black stone, ore in the faces, the quarrymaster's shed.
    const qx0 = x1 + 3, qx1 = x1 + 17, qy0 = y0 + 2, qy1 = y1 - 2;
    for (let y = qy0; y <= qy1; y++) for (let x = qx0; x <= qx1; x++) { put(x, y, (x + y) % 5 === 0 ? T.GRAVEL : T.STONE); lift[tileIndex(x, y)] = 0.2 + (x - qx0) * 0.08; clearAt(x, y); }
    for (const [rx, ry, kind] of [[qx1 - 1, qy0 + 2, "blackiron"], [qx1 - 1, qy0 + 5, "inkcoal"], [qx1 - 1, qy0 + 9, "blackiron"], [qx1 - 3, qy1 - 2, "glimmer"], [qx1 - 1, qy1 - 6, "inkcoal"], [qx0 + 6, qy1, "pewter"], [qx0 + 9, qy0, "clay"]] as const)
      t.rock(rx, ry, kind as RockKind);
    put2(qx0 + 2, qy0 + 1, "logpile", "Timber for the sledges"); put2(qx0 + 4, qy1 - 1, "crate", "Black stone blocks, roped for the sledge");
    npcAt("tamesh_quarrymaster", qx0 + 3, cy, 1);
    for (const [dx, dy] of [[5, -6], [8, 4], [11, -2]] as const) npcAt("tamesh_stonecutter", qx0 + dx, cy + dy, 2);
    villagers("tamesh_villager", cx, cy, [[-12, 0], [0, 3], [10, -1], [-6, 12], [6, 12]]);
    sign(x0 - 2, cy - 3, "Tamesh", "TAMESH, the quarry town. Seat of Warden Meretkhet and the Obsidian Legacy, keepers of every monument in Kharaveth. Every stone in Sefrah's walls came from here, and Tamesh would like that remembered.");
    places.tamesh = { x: cx, y: cy };
  }

  // ---------- 5. Khetmar, the Copper Banner's fortress on the eastern pass ----------
  {
    const { x0, y0, x1, y1 } = KHETMAR, cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
    ground(x0 - 3, y0 - 3, x1 + 3, y1 + 3, null);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : T.GRAVEL);
    area(x0 - 3, y0 - 3, x1 + 3, y1 + 3, "khetmar");
    ctx.ramparts?.push({ x0, y0, x1, y1, storeys: 2, walls: "sandstone" });
    for (let d = -1; d <= 1; d++) { put(x0, cy + d, T.STONE); put(x1, cy + d, T.STONE); }
    fillRect(x0 + 1, cy - 1, x1 - 1, cy + 1, T.STONE);
    for (const [tx, ty] of [[x0, y0], [x1 - 4, y0], [x0, y1 - 4], [x1 - 4, y1 - 4]] as const)
      house(tx, ty, tx + 4, ty + 4, "s", "A tower of Khetmar", { roof: "flat", storeys: 3, color: ROOF.copper }, T.STONE);
    // The Marshal's hall, the barracks, the armoury, the stables, the drill yard.
    house(cx - 7, y0 + 3, cx + 7, y0 + 11, "s", "The Marshal's Hall", { storeys: 2, color: ROOF.copper }, T.STONE);
    npc("khetmar_ardesh", cx, y0 + 6); decor(cx - 5, y0 + 4, "banner", true, "The Copper Banner: a copper pennant on indigo, battle-torn on purpose"); decor(cx + 5, y0 + 4, "table", true, "A map of the eastern pass and, past it, a country drawn in with question marks: the Rain Country");
    house(x0 + 2, cy + 3, x0 + 14, y1 - 2, "n", "The barracks", { color: ROOF.copper }); for (let bx = x0 + 3; bx <= x0 + 12; bx += 3) decor(bx, y1 - 3, "bed", true, "A soldier's cot, made tight enough to bounce a coin on");
    house(cx + 3, cy + 3, x1 - 2, y1 - 2, "n", "The Banner armoury", { color: ROOF.copper }, T.STONE); npc("khetmar_outfitter", cx + 9, cy + 7); decor(x1 - 3, y1 - 3, "armour", true, "Copper scale coats on stands, polished for an inspection that's always tomorrow");
    for (const [ax, ay] of [[cx - 4, cy + 4], [cx - 2, cy + 6]] as const) put2(ax, ay, "target", "A practice target, well used");
    npc("khetmar_captain", cx - 3, cy - 3);
    for (const [gx, gy] of [[x0 - 1, cy - 2], [x0 - 1, cy + 2], [x1 + 1, cy - 2], [x1 + 1, cy + 2], [cx - 6, cy], [cx + 6, cy]] as const) npcAt("khetmar_soldier", gx, gy, 1);
    villagers("khetmar_villager", cx, cy, [[-10, -4], [10, -4], [0, 6]]);
    put2(x1 + 3, y0 + 2, "watchtower", "The pass watchtower: it looks east, at the Rain Country");
    sign(x0 - 3, cy - 3, "Khetmar", "KHETMAR, the fortress of the eastern pass. Held by Marshal Ardesh and the Copper Banner. Past the pass, the road goes on east toward the Rain Country; the Banner advises travellers to wait for a caravan, and charges for the advice.");
    places.khetmar = { x: cx, y: cy };
  }

  // ---------- 6. The nomads: the Zuri's blue fires north of the Spine, the Ouresh salt camp in the dunes ----------
  const camp = (cx: number, cy: number, id: RegionId, tents: readonly (readonly [number, number])[]) => {
    ground(cx - 12, cy - 9, cx + 12, cy + 9, null, false);
    round(cx, cy, 13, id);
    for (const [dx, dy] of tents) { const [tx, ty] = nearFree(cx + dx, cy + dy, 2); decor(tx, ty, "tent", true, id === "zuri_camp" ? "A Zuri tent, indigo felt over a frame of tamarisk" : "An Ouresh tent, pale and low, salt-white along the hem"); }
  };
  camp(ZURI.x, ZURI.y, "zuri_camp", [[-8, -5], [-2, -7], [5, -6], [9, -1], [-9, 3], [7, 5], [-3, 6]]);
  put2(ZURI.x, ZURI.y, "campfire", "The Zuri fire: it burns blue, with resin they won't name", false);
  put2(ZURI.x + 1, ZURI.y + 1, "steam", "Blue smoke", false);
  npcAt("zuri_asmeh", ZURI.x - 2, ZURI.y - 2); npcAt("zuri_trader", ZURI.x + 5, ZURI.y + 2); npcAt("zuri_ibbu", ZURI.x + 3, ZURI.y - 3, 1);
  villagers("zuri_villager", ZURI.x, ZURI.y, [[-6, 0], [4, -3], [0, 5], [8, 2]]);
  put2(ZURI.x - 10, ZURI.y + 6, "hay", "Camel fodder"); put2(ZURI.x + 10, ZURI.y - 6, "drying_rack", "Indigo cloth drying");
  places.zuri = { x: ZURI.x, y: ZURI.y + 2 };
  camp(OURESH.x, OURESH.y, "ouresh_camp", [[-7, -4], [0, -7], [7, -4], [-8, 4], [8, 4]]);
  put2(OURESH.x, OURESH.y, "campfire", "The Ouresh fire", false);
  for (const [dx, dy] of [[-4, 6], [-2, 7], [2, 7], [4, 6]] as const) put2(OURESH.x + dx, OURESH.y + dy, "crate", "Slabs of rock salt, roped in pairs for a camel");
  npcAt("ouresh_halzir", OURESH.x + 2, OURESH.y - 2); npcAt("ouresh_trader", OURESH.x - 4, OURESH.y + 3);
  villagers("ouresh_villager", OURESH.x, OURESH.y, [[-5, -1], [5, 1], [0, 4]]);
  places.ouresh = { x: OURESH.x, y: OURESH.y + 2 };
  // The Well of Tahr, the oasis between the two peoples' grazing (and the reason they're not speaking).
  clue(332, 756, { kind: "well", blocks: true, name: "The Well of Tahr", clue: "well_tahr" });
  round(330, 760, 9, "sea_of_dunes");
  // Old Bitter-Laugh's den, under the Spine's west end: bones, a scrape in the rock, the pack.
  ground(300, 780, 312, 790, null, false);
  for (const [dx, dy] of [[-3, -2], [2, -3], [-2, 3], [3, 2]] as const) put2(306 + dx, 785 + dy, "bones", "Gnawed bones, some of them a camel's");
  put2(306, 781, "rubble", "The den: a scrape under an overhang, reeking");
  monsterAt("tahr_matriarch", 306, 786, 2);
  for (const [dx, dy] of [[-5, 1], [5, 0], [0, 5]] as const) monsterAt("sunteeth_hyena", 306 + dx, 785 + dy, 3);

  // ---------- 7. Azhurak, standing up out of the sand ----------
  // The Seven Crowns: seven standing stones in a ring, each crowned with a different glyph, a fallen eighth in the middle.
  {
    const { x, y } = SITES.seven_crowns;
    ground(x - 9, y - 9, x + 9, y + 9, null);
    round(x, y, 10, "seven_crowns");
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 - Math.PI / 2, sx = Math.round(x + Math.cos(a) * 6), sy = Math.round(y + Math.sin(a) * 6); clearAt(sx, sy); decor(sx, sy, "obelisk", true, "A crowned stone of the Seven Crowns"); }
    clue(x, y, { kind: "sign", blocks: true, name: "The fallen stone", clue: "seven_crowns", text: "" });
  }
  // The Hall of First Names: a door cut into the Spine's cliff, shut, an eye over it.
  {
    const { x, y } = SITES.first_names;
    ground(x - 6, y - 3, x + 6, y + 5, T.STONE);
    round(x, y, 8, "first_names");
    for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= -4; dy++) if (Math.abs(dx) > 1 || dy < -4) { put(x + dx, y + dy, T.CLIFF); lift[tileIndex(x + dx, y + dy)] = 2.4; }
    for (const dx of [-3, 3]) decor(x + dx, y - 3, "pillar", true, "A pillar cut out of the living rock, a column of glyphs down its face");
    clue(x, y - 4, { kind: "sign", blocks: true, name: "The sealed door", clue: "first_names_door", text: "" });
    for (const dx of [-2, 2]) decor(x + dx, y + 2, "statue", true, "A seated figure with a long-billed bird's head, worn almost smooth, a reed pen in its hand");
  }
  // The Sunken Obelisk: an obelisk sunk to its chest in the sand, the top half of its glyphs above it.
  {
    const { x, y } = SITES.sunken_obelisk;
    ground(x - 6, y - 6, x + 6, y + 6, null, false);
    round(x, y, 8, "sunken_obelisk");
    clue(x, y, { kind: "decor", decor: "obelisk", blocks: true, name: "The Sunken Obelisk", clue: "sunken_obelisk" });
    for (const [dx, dy] of [[-4, -3], [4, -2], [-3, 4], [5, 3]] as const) put2(x + dx, y + dy, "ruin_wall", "A wall of a court that was here, mostly sand now");
  }
  // The Unfinished Pyramid, and Queen Siruvet's finished one west of it, with the deeps under both (pyramids.ts).
  if (kit.floors) buildPyramids(ctx, t, kit, kit.floors, { ground, area, sign });
  // The Black Stair: steps cut down into the Black Range, where Tamesh's quarry broke through into something older.
  {
    const { x, y } = SITES.black_stair;
    ground(x - 5, y - 3, x + 5, y + 5, T.STONE);
    round(x, y, 6, "black_range");
    put2(x - 3, y + 3, "rubble", "Quarry spoil, and under it, steps"); put2(x + 3, y + 3, "crate", "The quarrymen's tools, dropped where they stood");
    const B = BLACK_STAIR, by0 = DUNGEON_Y + B.row0;
    add({ kind: "ladder", x, y: y - 1, blocks: true, name: "The Black Stair", action: "Climb-down", to: { x: B.x0 + 8, y: by0 + 5 }, clue: "black_stair_down" });
  }

  // ---------- 8. The Black Stair below: a stair, a hall of wards, the warden's chamber ----------
  {
    const B = BLACK_STAIR, by0 = DUNGEON_Y + B.row0, by1 = DUNGEON_Y + B.row1;
    for (let y = by0 - 2; y <= by1 + 2; y++) for (let x = B.x0 - 2; x <= B.x1 + 2; x++) { put(x, y, T.VOID); setRegion(x, y, "black_stair"); }
    const hall = (x0: number, y0: number, x1: number, y1: number, kind: number = T.DUNGEON) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, kind); };
    hall(B.x0 + 4, by0 + 2, B.x0 + 14, by0 + 9, T.STONE);              // the foot of the stair, where the quarrymen broke in
    hall(B.x0 + 14, by0 + 5, B.x0 + 44, by0 + 7, T.STONE);             // a passage east
    hall(B.x0 + 44, by0 + 2, B.x0 + 70, by0 + 20);                     // the hall of wards: three niches, three stones that should be in them
    hall(B.x0 + 56, by0 + 20, B.x0 + 58, by0 + 32, T.STONE);           // down again
    hall(B.x0 + 40, by0 + 32, B.x0 + 78, by0 + 44);                    // the warden's chamber
    hall(B.x0 + 78, by0 + 36, B.x0 + 100, by0 + 38, T.STONE); hall(B.x0 + 92, by0 + 26, B.x0 + 106, by0 + 40); // a side gallery of the dead
    for (let y = by0 - 1; y <= by1 + 1; y++) for (let x = B.x0 - 1; x <= B.x1 + 1; x++) {
      if (get(x, y) !== T.VOID) continue;
      let beside = false;
      for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) { const tt = get(x + dx, y + dy); if (tt === T.STONE || tt === T.DUNGEON) beside = true; }
      if (beside) put(x, y, T.WALL);
    }
    add({ kind: "ladder", x: B.x0 + 6, y: by0 + 3, blocks: true, name: "The Black Stair", action: "Climb-up", to: { x: SITES.black_stair.x, y: SITES.black_stair.y + 1 } });
    // The three wards: niches in the hall's north wall, and the stones the quarrymen knocked out of them, scattered.
    for (const [k, nx] of [[0, B.x0 + 48], [1, B.x0 + 57], [2, B.x0 + 66]] as const) {
      add({ kind: "decor", decor: "pillar", x: nx, y: by0 + 3, blocks: true, name: "A ward niche", clue: `ward_niche_${k}` });
    }
    for (const [k, wx, wy] of [[0, B.x0 + 10, by0 + 8], [1, B.x0 + 52, by0 + 17], [2, B.x0 + 100, by0 + 38]] as const) clue(wx, wy, { kind: "decor", decor: "rubble", blocks: true, name: "A fallen ward stone", clue: `ward_stone_${k}` });
    clue(B.x0 + 59, by0 + 34, { kind: "sign", blocks: true, name: "The warden's lintel", clue: "black_stair_lintel", text: "" });
    for (const [x, y] of [[B.x0 + 9, by0 + 3], [B.x0 + 30, by0 + 6], [B.x0 + 46, by0 + 3], [B.x0 + 68, by0 + 3], [B.x0 + 57, by0 + 26], [B.x0 + 44, by0 + 33], [B.x0 + 74, by0 + 33], [B.x0 + 41, by0 + 38], [B.x0 + 77, by0 + 38], [B.x0 + 51, by0 + 43], [B.x0 + 67, by0 + 43], [B.x0 + 96, by0 + 28]] as const) put2(x, y, "torch", "Old torch bracket", false);
    for (const [x, y] of [[B.x0 + 94, by0 + 30], [B.x0 + 104, by0 + 30], [B.x0 + 98, by0 + 39]] as const) put2(x, y, "tomb", "A sealed sarcophagus of black stone");
    for (let k = 0; k < 5; k++) monsterAt("dust_walker", B.x0 + 20 + k * 9, by0 + 6, 3);
    for (let k = 0; k < 4; k++) monsterAt("obsidian_scarab", B.x0 + 46 + k * 6, by0 + 12, 3);
    for (let k = 0; k < 4; k++) monsterAt("tomb_beetle", B.x0 + 94 + (k % 2) * 8, by0 + 28 + (k >> 1) * 8, 3);
    monsterAt("stair_warden", B.x0 + 59, by0 + 39, 2);
    put2(B.x0 + 105, by0 + 27, "chest", "A coffer of black stone");
  }

  // ---------- 9. The heartlands' creatures, by country ----------
  const populate = (id: RegionId, monsters: readonly string[], count: number) => {
    const index = REGION_INDEX(id);
    for (let k = 0, tries = 0; k < count && tries < count * 60; tries++) {
      const x = 60 + Math.floor(random() * 1040), y = 540 + Math.floor(random() * 330);
      if (regionOf(x, y) !== index || !land(x, y) || !kit.open(get(x, y)) || occupied(x, y)) continue;
      monsterAt(monsters[k % monsters.length], x, y, 5); k++;
    }
  };
  populate("sea_of_dunes", ["sand_scorpion", "dune_jackal", "dune_viper", "sand_scorpion"], 26);
  populate("ochre_spine", ["rock_skink", "glasswing_vulture", "sunteeth_hyena"], 18);
  populate("ashar_valley", ["river_crocodile", "dune_jackal", "reed_cat"], 14);
  populate("black_range", ["obsidian_scarab", "dust_walker", "basalt_golem"], 16);
  populate("khetmar_pass", ["dune_jackal", "glasswing_vulture", "dust_walker"], 12);
  populate("ochre_steppe", ["dune_jackal", "sand_scorpion", "glasswing_vulture"], 18);
  // River fishing on the Ashar, and the reeds along it.
  t.shoreSpots(740, 600, 830, 740, "lure", 6);
  void ([] as readonly WorldObject[]); void W;
}

import { REGIONS } from "./world.ts";
const REGION_INDEX = (id: RegionId) => REGIONS.findIndex(region => region.id === id);
