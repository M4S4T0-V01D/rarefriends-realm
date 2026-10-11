/**
 * The sea ports: five settlements on the coasts and roads the older lands left empty, and the packet boats that join
 * the ports to the Isles' boats.
 *
 * Gullwick is the mainland's harbour on the Thistle Vale's open-sea bay, west of Hollyhock: a stone quay and wooden
 * piers, a harbourmaster, a customs house that has lately doubled its dues, and Gullwick Light on the point, which keeps
 * going dark. Saltreach is Raria's salt port on the inlet below the capital, where the pans are raked white and every
 * pound is weighed at the King's Salt-House, which is King Pell's, the one office Her Radiance gave him to keep.
 * Merrab is Kharaveth's harbour on the desert's east coast, under the Copper Banner's flag and the Gilded Court's
 * purse, and its divers work the pearl beds off the shore. Inland, Tel Ashun stands on its tell, a mound of every
 * village that ever stood there, which the village is digging up to make bricks of; and south, Ennu's Well keeps an
 * oasis that is beginning to run dry.
 *
 * Built after Meghavan (south.ts), in the grown world's coordinates (the mainland and Raria rows are above the south,
 * so theirs are the same in both frames). Only the five sites themselves are changed. Module constants are literals
 * (world.ts imports this module through south.ts).
 */
import { T, isWater, type Building, type DecorKind, type GenContext, type RegionId, type World, type WorldObject, type worldTools } from "./world.ts";
import { layPier, type Dock } from "./isles.ts";
import type { SouthKit } from "./heartlands.ts";

type Tools = ReturnType<typeof worldTools>;

/** Gullwick: the harbour town, the lighthouse on the north point, and Wrack Point to the south where the wreckers' light is. */
export const GULLWICK = { x0: 523, y0: 438, x1: 580, y1: 476 } as const;
export const GULLWICK_LIGHT = { x0: 524, y0: 442, x1: 528, y1: 446 } as const;
export const WRACK_POINT = { x: 549, y: 473 } as const;
/** Saltreach: the strip of land between the inlet and the river, below Raria; the pans along its south. */
export const SALTREACH = { x0: 145, y0: 298, x1: 173, y1: 331 } as const;
/** Merrab: the harbour on the desert's east coast, and the diving rocks south of it where Old Saltjaw waits. */
export const MERRAB = { x0: 1048, y0: 770, x1: 1091, y1: 806 } as const;
export const DIVING_ROCKS = { x: 1090, y: 811 } as const;
/** Tel Ashun's tell (its crown), and Ennu's Well (its pool), with the old channel that feeds it from the west. */
export const TEL_ASHUN = { x: 1017, y: 755 } as const;
export const ENNUS_WELL = { x: 1025, y: 835 } as const;
export const WELL_CHANNEL = { x: 1008, y: 834 } as const;

/**
 * The sea ports' landings, the same shape as the Isles' (isles.ts DOCKS): each with a pier laid the same way and a
 * packet boat at its end. Suvarnatira's pier is laid off the end of its southern jetty, so nothing in the free port moves.
 */
export const SEA_DOCKS: readonly Dock[] = [
  { id: "gullwick", name: "Gullwick harbour", region: "gullwick", from: [543, 459], heading: [-1, 0], boatman: "boat_gullwick" },
  { id: "saltreach", name: "Saltreach quay", region: "saltreach", from: [150, 312], heading: [-1, 0], boatman: "boat_saltreach" },
  { id: "merrab", name: "Merrab harbour", region: "merrab", from: [1084, 789], heading: [1, 0], boatman: "boat_merrab" },
  { id: "suvarnatira", name: "Suvarnatira, the free port", region: "suvarnatira", from: [1666, 744], heading: [1, 0], boatman: "boat_suvarnatira" },
];

/** The ports' colours: Gullwick's slate and tar, Raria's violets, the desert's sand and mudbrick. */
const ROOF = { slate: "#4f5966", tar: "#3a3530", red: "#a5443a", violet: "#5b4a78", plum: "#7d5a6e", lavender: "#8c7aa6", grey: "#6e6a82", sand: "#cfae7e", mud: "#a8835a", copper: "#b87333", sea: "#2f6f7a" } as const;

export function buildPorts(ctx: GenContext, t: Tools, places: World["places"], kit: SouthKit) {
  const { get, put, add, decor, npc, setRegion, tileIndex, inBounds, building, clearAt, fillRect, road } = t;
  const lift = ctx.lift, random = kit.random;
  const sea = (tt: number) => tt === T.DEEP || tt === T.WATER;
  const occupied = (x: number, y: number) => ctx.objectAt[tileIndex(x, y)] >= 0 || ctx.spawns.some(spawn => spawn.x === x && spawn.y === y);
  const OPEN = new Set<number>([T.SAND, T.GRAVEL, T.STONE, T.PATH, T.GRASS, T.DARK_GRASS, T.WOOD, T.COBBLE, T.CARPET, T.FARMLAND, T.BRICK]);
  const open = (tt: number) => OPEN.has(tt);
  /** A building's doorway, or the tile in front of one (never blocked by anything placed). */
  const doorway = (x: number, y: number) => ctx.doorways.some(([dx, dy]) => Math.abs(dx - x) + Math.abs(dy - y) <= 1);
  const nearFree = (x: number, y: number, limit = 6): [number, number] => {
    for (let r = 0; r <= limit; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy; if (inBounds(nx, ny) && open(get(nx, ny)) && !occupied(nx, ny) && !doorway(nx, ny)) return [nx, ny];
    }
    return [x, y];
  };
  const npcAt = (id: string, x: number, y: number, wander = 0) => { const [nx, ny] = nearFree(x, y, 4); npc(id, nx, ny, wander); };
  const monsterAt = (id: string, x: number, y: number, wander?: number) => { const [nx, ny] = nearFree(x, y, 4); t.monster(id, nx, ny, wander); };
  const put2 = (x: number, y: number, kind: DecorKind, name?: string, blocks = true) => { const [dx, dy] = nearFree(x, y, 3); return decor(dx, dy, kind, blocks, name); };
  const clue = (x: number, y: number, object: Omit<WorldObject, "id" | "x" | "y">) => { const [cx, cy] = nearFree(x, y, 3); return add({ ...object, x: cx, y: cy }); };
  const sign = (x: number, y: number, label: string, text: string) => { const [sx, sy] = nearFree(x, y, 3); add({ kind: "sign", x: sx, y: sy, blocks: true, name: label, text }); };
  const villagers = (id: string, cx: number, cy: number, points: readonly (readonly [number, number])[]) => { for (const [dx, dy] of points) npcAt(id, cx + dx, cy + dy, 4); };
  /** A site's ground cleared (objects, spawns), its cliffs, swamp and (unless kept) water taken out, paved if asked, and levelled if asked. */
  const ground = (x0: number, y0: number, x1: number, y1: number, paving: number | null = null, flat = true, keepWater = true) => {
    let sum = 0, n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!sea(get(x, y)) && get(x, y) !== T.VOID) { sum += lift[tileIndex(x, y)]; n++; }
    const mean = Math.min(1, sum / Math.max(1, n));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const tt = get(x, y);
      if (tt === T.VOID || keepWater && isWater(tt)) continue;
      clearAt(x, y);
      for (let i = ctx.spawns.length - 1; i >= 0; i--) if (ctx.spawns[i].x === x && ctx.spawns[i].y === y) ctx.spawns.splice(i, 1);
      if (tt === T.CLIFF || tt === T.SNOW || tt === T.SWAMP || isWater(tt)) put(x, y, T.GRASS);
      if (paving !== null) put(x, y, paving);
      if (flat) lift[tileIndex(x, y)] = mean;
    }
  };
  /** A site's land (not its sea) given to a region. */
  const area = (x0: number, y0: number, x1: number, y1: number, id: RegionId) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!sea(get(x, y)) && get(x, y) !== T.VOID) setRegion(x, y, id); };
  /** Pave the land within `reach` tiles of the sea as a quay. */
  const quay = (x0: number, y0: number, x1: number, y1: number, reach: number, paving: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (sea(get(x, y)) || get(x, y) === T.VOID) continue;
      let near = false;
      for (let dy = -reach; dy <= reach && !near; dy++) for (let dx = -reach; dx <= reach && !near; dx++) if (sea(get(x + dx, y + dy))) near = true;
      if (near) { clearAt(x, y); put(x, y, paving); }
    }
  };
  /** A wooden pier out over the water, two planks wide (WOOD only where it's water, so it meets the quay). */
  const pier = (x: number, y: number, dx: number, dy: number, length: number) => {
    for (let k = 0; k < length; k++) for (const s of [0, 1]) { const px = x + dx * k + (dy ? s : 0), py = y + dy * k + (dx ? s : 0); if (isWater(get(px, py))) { clearAt(px, py); put(px, py, T.WOOD); } }
  };
  const home = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", bed: string, what: string) => {
    const back = door === "s" ? y0 + 1 : door === "n" ? y1 - 1 : (y0 + y1) >> 1, bx = door === "e" ? x0 + 1 : door === "w" ? x1 - 1 : x0 + 1;
    decor(bx, back, "bed", true, bed); decor(door === "e" || door === "w" ? bx : x1 - 1, door === "e" || door === "w" ? (door === "e" ? y0 + 1 : y1 - 1) : back, "shelf", true, what);
  };
  /** Gullwick's houses: grey stone under slate, or whitewashed timber; a fisher's cottage of tarred planks. */
  const stone = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}, floor: number = T.STONE) =>
    building(x0, y0, x1, y1, door, floor, undefined, { name, walls: "stone", roof: "gable", color: ROOF.slate, chimney: true, ...extra });
  const timber = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}) =>
    building(x0, y0, x1, y1, door, T.WOOD, undefined, { name, walls: "timber", roof: "gable", color: ROOF.slate, chimney: true, ...extra });
  /** A Rarian house: every one alike, plastered, under a violet roof; the Crown's offices in pale marble. */
  const rarian = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}) =>
    building(x0, y0, x1, y1, door, T.WOOD, undefined, { name, walls: "timber", roof: "gable", hip: true, color: ROOF.violet, chimney: true, ...extra });
  /** A desert house: sandstone or mudbrick, flat-roofed, as all over Kharaveth. */
  const flat = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}) =>
    building(x0, y0, x1, y1, door, T.WOOD, undefined, { name, walls: "sandstone", roof: "flat", color: ROOF.sand, chimney: false, ...extra });
  const mud = (x0: number, y0: number, x1: number, y1: number, door: "n" | "s" | "e" | "w", name: string, extra: Partial<Building> = {}) =>
    building(x0, y0, x1, y1, door, T.WOOD, undefined, { name, walls: "mudbrick", roof: "flat", color: ROOF.mud, chimney: false, ...extra });

  // ---------- 1. Gullwick, the harbour of the Thistle Vale ----------
  {
    const G = GULLWICK;
    ground(G.x0, G.y0, G.x1, G.y1, null, true, true);
    area(518, 436, G.x1, 478, "gullwick");
    // The quay all along the shore, the fish market's end of it wide; Harbour Street from the quay to Hollyhock's lane, and Chandlers' Row.
    quay(G.x0, 440, 552, G.y1, 2, T.STONE);
    fillRect(527, 448, G.x1, 451, T.COBBLE); fillRect(553, G.y0, 555, 474, T.COBBLE);
    for (let y = 452; y <= 455; y++) for (let x = 529; x <= 551; x++) if (!sea(get(x, y))) put(x, y, T.STONE);
    // Gullwick Light, on the north point, where the river comes down to the sea.
    const L = GULLWICK_LIGHT;
    building(L.x0, L.y0, L.x1, L.y1, "s", T.STONE, undefined, { name: "Gullwick Light", walls: "stone", roof: "cone", round: true, storeys: 4, spire: 26, color: ROOF.red, chimney: false });
    npc("gullwick_keeper", L.x0 + 2, L.y0 + 2);
    clue(L.x0 + 1, L.y0 + 1, { kind: "decor", decor: "table", blocks: true, name: "The lamp log", clue: "gullwick_lamp_log" });
    decor(L.x1 - 1, L.y0 + 1, "barrel", true, "The great lamp's oil cask, its tap locked");
    // The harbourmaster's office, the customs house, the inn and the counting house, facing the street.
    stone(531, 440, 538, 446, "s", "The Harbourmaster's Office");
    npc("gullwick_harbourmaster", 534, 443); decor(532, 441, "table", true, "A chart of the bay, the rocks off Wrack Point inked in red, twice"); decor(537, 441, "shelf", true, "Tide tables, berth books, and a brass telescope with a crack in the lens");
    stone(541, 439, 551, 446, "s", "The Customs House", { storeys: 2, facade: "civic" });
    npc("gullwick_collector", 546, 442); decor(542, 440, "chest", true, "The dues chest, iron-bound, three locks and one key"); decor(550, 440, "shelf", true, "Ledgers of dues: berth, landing, anchorage, and a new column, headed 'harbour improvement'");
    sign(549, 447, "The schedule of dues", "DUES OF THE PORT OF GULLWICK, by order of the Collector. Berth: by the foot of keel. Landing: by the basket. Anchorage: by the night. Harbour improvement: by the boat, whether it is improved or not. Paid at the Customs House before the catch is sold.");
    timber(558, 439, 567, 446, "s", "The Gull and Lantern", { storeys: 2 });
    npc("gullwick_innkeeper", 562, 442); decor(559, 444, "table"); decor(565, 444, "table"); add({ kind: "range", x: 566, y: 440, blocks: true, name: "Inn range" });
    stone(570, 440, 578, 446, "s", "The Gullwick Counting House", {}, T.STONE);
    for (const by of [442, 444]) add({ kind: "bank", x: 572, y: by, blocks: true, name: "Counting-house desk" }); npc("banker", 575, 443);
    // The fish market on the quay.
    for (const [sx, name] of [[539, "Herring stall"], [542, "Crab stall"], [545, "Sailfish stall"]] as const) add({ kind: "stall", stall: "fish", x: sx, y: 453, blocks: true, name });
    npcAt("gullwick_fishmonger", 543, 455); put2(548, 453, "barrel", "A barrel of salted herring, the lid weighted with a stone"); put2(531, 452, "nets", "Nets drying on the quay rail");
    // The chandlery, the tailor, the houses, and the ropewalk: a long low shed where the rope is laid, the length of a cable.
    stone(544, 456, 551, 461, "n", "Oake's Chandlery", { color: ROOF.tar });
    npc("gullwick_chandler", 547, 458); decor(550, 460, "shelf", true, "Rope, tar, lamp oil, hooks, floats, and a box of compasses that all agree");
    timber(558, 453, 564, 458, "n", "Sennet's Oilskins");
    npc("gullwick_clothier", 561, 455); decor(563, 457, "shelf", true, "Ganseys folded by family pattern, oilskins hung by the shoulders like drowned men");
    for (const [hx, hy, x1, y1] of [[567, 453, 572, 458], [574, 453, 579, 458]] as const) { timber(hx, hy, x1, y1, "n", "A Gullwick house"); home(hx, hy, x1, y1, "n", "A box bed with a patchwork quilt", "A kettle, a clock that stopped at high tide and was left that way, and a gansey half knitted"); }
    stone(558, 461, 579, 466, "w", "The Ropewalk", { color: ROOF.tar, chimney: false });
    npc("gullwick_ropemaker", 563, 463); decor(570, 462, "drying_rack", true, "Hemp yarn hung on the rack to stretch"); decor(576, 465, "logpile", true, "Coils of finished cable, tarred and stacked");
    for (const [hx, hy] of [[558, 468], [565, 468]] as const) { timber(hx, hy, hx + 5, hy + 5, "n", "A Gullwick house"); home(hx, hy, hx + 5, hy + 5, "n", "A box bed with a patchwork quilt", "A shelf of floats and a jar of pennies for the lifeboat"); }
    building(572, 468, 577, 473, "n", T.WOOD, undefined, { name: "A net loft", walls: "plank", roof: "gable", color: ROOF.tar, chimney: false }); decor(573, 472, "nets", true, "Nets hung from the rafters to dry, every one mended a hundred times");
    building(543, 463, 548, 468, "e", T.WOOD, undefined, { name: "Nan Tregellas's cottage", walls: "plank", roof: "gable", color: ROOF.tar, chimney: true });
    npc("gullwick_nan", 545, 465); home(543, 463, 548, 468, "e", "A narrow bed under a fisher's quilt", "Her husband's gansey, folded, and a lantern with the glass taken out");
    // The piers: one at the fish market, one for the fishing boats; the packet pier is laid with the other ports' (section 9).
    pier(535, 455, -1, 0, 7); pier(539, 466, -1, 0, 7);
    for (const [bx, by] of [[531, 457], [534, 465]] as const) if (isWater(get(bx, by))) decor(bx, by, "boat", true, "A Gullwick lugger, its brown sail furled");
    // Wrack Point: black rocks off the south end, where a light in the wrong place puts a ship on them.
    for (let y = 469; y <= G.y1; y++) for (let x = 540; x <= 556; x++) if (!sea(get(x, y)) && get(x, y) !== T.COBBLE && Math.hypot(x - WRACK_POINT.x, (y - WRACK_POINT.y) * 1.4) < 6.5) { clearAt(x, y); put(x, y, (x + y) % 3 ? T.STONE : T.GRAVEL); lift[tileIndex(x, y)] = 0.35; }
    for (const [dx, dy] of [[-6, 1], [3, 2], [-3, -2], [5, -1]] as const) put2(WRACK_POINT.x + dx, WRACK_POINT.y + dy, "boulder", "A black rock, weed to the high-water mark");
    put2(WRACK_POINT.x - 4, WRACK_POINT.y - 3, "tent", "A hide of old sailcloth, weighted with stones");
    clue(WRACK_POINT.x + 2, WRACK_POINT.y + 1, { kind: "decor", decor: "lamp", blocks: true, name: "A lantern on a pole", clue: "wreckers_lantern" });
    monsterAt("wrecker_chief", WRACK_POINT.x - 1, WRACK_POINT.y, 2);
    for (const [dx, dy] of [[-5, 0], [1, -3], [4, 2]] as const) monsterAt("gullwick_wrecker", WRACK_POINT.x + dx, WRACK_POINT.y + dy, 2);
    // The people of the harbour.
    npcAt("gullwick_fisher", 536, 463, 2); npcAt("gullwick_fisher", 533, 452, 2);
    npcAt("gullwick_watch", 539, 449, 1); npcAt("gullwick_watch", 579, 452, 1);
    villagers("gullwick_villager", 554, 450, [[-14, 1], [-4, 3], [8, -1], [18, 2], [0, 12]]);
    sign(579, 447, "Gullwick", "GULLWICK, the harbour of the Thistle Vale. Harbourmaster Wenna Coyle keeps the harbour, the Collector keeps the dues, and Gullwick Light keeps everyone else off the rocks. Packets sail from the quay to every port that pays. Hollyhock is east along the lane.");
    for (const [fx, fy] of [[556, 445], [568, 451], [552, 459]] as const) put2(fx, fy, "lamp", "A harbour lamp, lit at dusk by the watch");
    t.shoreSpots(G.x0, 440, 545, G.y1, "net", 3);
    places.gullwick = { x: 554, y: 450 };
  }

  // ---------- 2. Saltreach, Raria's salt port ----------
  {
    const S = SALTREACH;
    ground(S.x0 - 1, S.y0 - 1, S.x1, S.y1, null, true, true);
    area(S.x0 - 2, S.y0 - 2, S.x1 + 1, S.y1 + 1, "saltreach");
    quay(S.x0 - 1, S.y0, 150, S.y1, 2, T.STONE);
    // The street from the quay to the bridge, the walk along the pans.
    fillRect(147, 311, S.x1, 313, T.COBBLE);
    // The King's Salt-House, where every pound is weighed; a house; the inn.
    rarian(149, 300, 157, 308, "s", "The King's Salt-House", { walls: "marble", storeys: 2, facade: "civic" });
    npc("saltreach_assessor", 153, 303);
    clue(151, 302, { kind: "decor", decor: "device", blocks: true, name: "The King's scale", clue: "kings_scale" });
    decor(156, 301, "shelf", true, "The Ledger of Salt, a volume a month, bound in violet: every sack, every pan, every name");
    rarian(159, 301, 163, 307, "s", "A Saltreach house"); home(159, 301, 163, 307, "s", "A narrow bed, made to the Office of Conduct's pattern", "One book, the same book as next door's, and a salt cellar of white glaze");
    rarian(165, 300, 172, 308, "s", "The Salt Cellar", { color: ROOF.plum });
    npc("saltreach_innkeeper", 168, 303); decor(166, 306, "table"); add({ kind: "range", x: 171, y: 301, blocks: true, name: "Inn range" });
    // South of the street: the provisioner, the weaver, two more houses alike.
    rarian(148, 315, 154, 320, "n", "Ferris's Provisions", { color: ROOF.grey });
    npc("saltreach_merchant", 151, 317); decor(149, 319, "shelf", true, "Bread of the one kind at the one price, salt herring in barrels, salt in sacks of three sizes");
    rarian(156, 315, 161, 320, "n", "The Salt Weaver's", { color: ROOF.lavender });
    npc("saltreach_clothier", 158, 317); decor(160, 319, "shelf", true, "Smocks and coifs in salt-white, mantles in the one violet a port may wear");
    for (const hx of [163, 168]) { rarian(hx, 315, hx + 4, 320, "n", "A Saltreach house"); home(hx, 315, hx + 4, 320, "n", "A narrow bed, made to the Office of Conduct's pattern", "One book, the same book as next door's, and a salt cellar of white glaze"); }
    // The pans: shallow squares of brine between dikes, raked white as they dry; the pan-reeve's weighing shed at their end.
    for (let y = 321; y <= 321; y++) for (let x = 147; x <= S.x1; x++) if (!sea(get(x, y))) put(x, y, T.STONE);
    for (let y = 322; y <= 330; y++) for (let x = 149; x <= 164; x++) { clearAt(x, y); lift[tileIndex(x, y)] = 0; put(x, y, (x - 149) % 5 === 0 || (y - 322) % 4 === 0 ? T.STONE : T.WATER); }
    rarian(166, 322, 172, 327, "w", "The pan-reeve's weighing shed", { color: ROOF.grey, chimney: false });
    npc("saltreach_reeve", 169, 324);
    clue(170, 323, { kind: "decor", decor: "table", blocks: true, name: "The pan-reeve's weights", clue: "pan_weights" });
    for (const [cx, cy] of [[165, 329], [158, 331], [151, 331]] as const) put2(cx, cy, "crate", "Sacks of salt, sewn shut and sealed with the King's mark");
    npcAt("saltreach_brannagh", 157, 321, 1); npcAt("saltreach_panner", 152, 326, 2); npcAt("saltreach_panner", 162, 330, 2);
    // The barge pier for the salt, and the boats.
    pier(144, 304, -1, 0, 6); if (isWater(get(141, 302))) decor(141, 302, "boat", true, "A salt barge, low in the water, its hold sealed by the Salt-House");
    npcAt("saltreach_guard", 147, 309, 1); npcAt("saltreach_guard", S.x1, 310, 1);
    villagers("saltreach_villager", 160, 312, [[-8, -2], [4, 2], [10, -2], [-2, -3]]);
    sign(S.x1 - 1, 309, "Saltreach", "SALTREACH, the King's salt port. By order of the Crown, every pound of salt is weighed at the King's Salt-House before it leaves the pans, and written in the Ledger of Salt. Boats sail from the quay. The capital is north; Greyford and the King's road are east, over the bridge.");
    // The road east over the river to Greyford and the King's road north to the capital.
    road([[S.x1, 312], [182, 313], [196, 314], [214, 314]], 2.4, T.PATH);
    places.saltreach = { x: 160, y: 312 };
  }

  // ---------- 3. Merrab, Kharaveth's harbour on the east coast ----------
  {
    const M = MERRAB;
    ground(M.x0, M.y0, M.x1, M.y1, null, true, true);
    area(M.x0 - 2, M.y0 - 2, M.x1 + 1, 814, "merrab");
    quay(1080, M.y0, M.x1, M.y1, 2, T.STONE);
    fillRect(M.x0, 788, 1088, 790, T.STONE);
    // North of the harbour street: the inn, the stores, the Banner's harbour office, a divers' hut.
    flat(1050, 777, 1059, 786, "s", "The Sea Gate Inn", { storeys: 2 });
    npc("merrab_innkeeper", 1054, 780); decor(1051, 784, "table"); decor(1057, 784, "table"); add({ kind: "range", x: 1058, y: 778, blocks: true, name: "Clay oven" });
    flat(1062, 779, 1068, 786, "s", "Hashim's Stores");
    npc("merrab_merchant", 1065, 781); decor(1063, 780, "shelf", true, "Dates, rope, lamp oil, diving stones with holes bored through, and nose-clips of tortoiseshell");
    flat(1071, 778, 1078, 786, "s", "The Harbour Office", { color: ROOF.copper });
    npc("merrab_harbourmaster", 1074, 781); decor(1072, 779, "banner", true, "The Copper Banner's pennant, and under it a smaller flag: Khetmar's harbour"); decor(1077, 779, "table", true, "The harbour book: boats in, boats out, and dues to Khetmar in a careful hand");
    mud(1081, 780, 1085, 786, "s", "A divers' hut"); home(1081, 780, 1085, 786, "s", "A mat of woven reed", "Diving stones on a cord, a nose-clip, and a basket for the shells");
    for (const [hx, hy] of [[1051, 770], [1061, 771]] as const) { flat(hx, hy, hx + 5, hy + 5, "n", "A Merrab house"); home(hx, hy, hx + 5, hy + 5, "n", "A rope bed under a striped blanket", "A water jar, a string of shells, and a lamp from Sefrah"); }
    // South of it: the Pearl Exchange, the dye house, the boatwright's yard, the divers' huts and houses.
    flat(1050, 792, 1058, 800, "n", "The Pearl Exchange", { color: ROOF.sea, storeys: 2 });
    npc("merrab_factor", 1054, 795);
    clue(1056, 798, { kind: "decor", decor: "table", blocks: true, name: "The pearl ledger", clue: "pearl_ledger" });
    decor(1051, 798, "chest", true, "A strongbox of the Gilded Court, sealed in gold wax");
    flat(1061, 792, 1067, 799, "n", "Rasha's Dye House", { color: ROOF.sea });
    npc("merrab_clothier", 1064, 794); decor(1066, 797, "shelf", true, "Cotton in sea-green, white and indigo, and a vat of blue the colour of the beds at noon");
    for (const [dx, dy, kind, name] of [[1072, 795, "boat", "A diving boat up on trestles, its seams being caulked"], [1076, 798, "logpile", "Teak from Meghavan for keels, paid for in pearls"], [1074, 800, "drying_rack", "Oyster shells drying, before the opening"]] as const) put2(dx, dy, kind, name);
    npcAt("merrab_boatwright", 1074, 796, 1);
    for (const hy of [793, 800]) { mud(1080, hy, 1084, hy + 5, "n", "A divers' hut"); home(1080, hy, 1084, hy + 5, "n", "A mat of woven reed", "Diving stones on a cord, a nose-clip, and a basket for the shells"); }
    for (const hx of [1050, 1060]) { flat(hx, 802, hx + 5, 806, "n", "A Merrab house"); home(hx, 802, hx + 5, 806, "n", "A rope bed under a striped blanket", "A water jar, a string of shells, and a lamp from Sefrah"); }
    // The divers' jetty, and their boats.
    pier(1092, 798, 1, 0, 5); if (isWater(get(1095, 800))) decor(1095, 800, "boat", true, "A pearling boat, the divers' stones coiled in the bow");
    // The diving rocks: a ledge of black rock off the shore south of the town, and the beds beyond it.
    for (let y = DIVING_ROCKS.y - 3; y <= DIVING_ROCKS.y + 3; y++) for (let x = DIVING_ROCKS.x - 5; x <= DIVING_ROCKS.x + 2; x++) {
      if (Math.hypot(x - DIVING_ROCKS.x, (y - DIVING_ROCKS.y) * 1.3) > 4.2 || get(x, y) === T.DEEP) continue;
      clearAt(x, y); put(x, y, (x * 7 + y) % 4 ? T.STONE : T.GRAVEL); lift[tileIndex(x, y)] = 0.15;
    }
    for (const [dx, dy] of [[-4, -2], [-3, 3]] as const) put2(DIVING_ROCKS.x + dx, DIVING_ROCKS.y + dy, "boulder", "A black rock, barnacled to the tideline: the divers' rocks");
    put2(DIVING_ROCKS.x - 6, DIVING_ROCKS.y - 2, "nets", "Shell baskets, left where the divers dropped them and ran");
    monsterAt("saltjaw", DIVING_ROCKS.x + 1, DIVING_ROCKS.y, 1);
    // The people of the harbour.
    npcAt("merrab_yamina", 1083, 791, 1);
    for (const [dx, dy] of [[1087, 795], [1079, 791], [1086, 783]] as const) npcAt("merrab_diver", dx, dy, 2);
    npcAt("merrab_guard", M.x0, 787, 1); npcAt("merrab_guard", 1086, 787, 1);
    villagers("merrab_villager", 1066, 789, [[-12, 0], [-2, 1], [6, -1], [14, 1]]);
    for (const px of [1060, 1070, 1079]) if (!occupied(px, 787) && get(px, 787) === T.SAND) t.tree(px, 787, "palm");
    sign(1050, 787, "Merrab", "MERRAB, the harbour of the east coast. The Copper Banner keeps the harbour for Khetmar, the Gilded Court buys the pearls, and the divers keep the beds and everybody else in bread. Khetmar is north up the road; Tel Ashun is off it to the west; Ennu's Well is south.");
    places.merrab = { x: 1066, y: 789 };
  }

  // ---------- 4. Tel Ashun, the village on the tell ----------
  {
    const { x, y } = TEL_ASHUN;
    ground(x - 14, y - 13, x + 13, y + 13, null, false);
    area(x - 16, y - 15, x + 15, y + 15, "tel_ashun");
    // The tell: a mound of every village that stood here, flat-topped, the dug face of it on the east toward the rocks.
    for (let yy = y - 13; yy <= y + 13; yy++) for (let xx = x - 14; xx <= x + 13; xx++) {
      const d = Math.hypot((xx - x) / 12, (yy - y) / 9), i = tileIndex(xx, yy);
      if (d > 1) { if (get(xx, yy) === T.GRAVEL || get(xx, yy) === T.SAND) lift[i] = Math.min(lift[i], 0.2); continue; }
      lift[i] = d < 0.55 ? 1.1 : 1.1 * (1 - (d - 0.55) / 0.45);
      put(xx, yy, d < 0.55 ? T.SAND : T.GRAVEL);
    }
    for (let yy = y - 4; yy <= y + 4; yy++) for (let xx = x + 9; xx <= x + 11; xx++) { put(xx, yy, T.STONE); lift[tileIndex(xx, yy)] = 0.5; }
    // On the top: the elder's house, the Legacy's recorder's tent, the old cistern.
    mud(x - 6, y - 6, x, y - 1, "s", "Elder Hazane's house");
    npc("tel_ashun_elder", x - 3, y - 4); decor(x - 5, y - 5, "shelf", true, "Pots of every age dug from the mound, the oldest at the bottom, nobody's sure why");
    put2(x + 4, y - 5, "tent", "The recorder's tent: black linen, a lapis border, the Obsidian Legacy's");
    npcAt("tel_ashun_recorder", x + 4, y - 2, 1);
    add({ kind: "well", x: x + 1, y: y + 3, blocks: true, name: "The cistern on the tell" });
    // The dug face: three layers, one over the other, where the brick-diggers have cut into the mound.
    [[x + 10, y - 3], [x + 10, y], [x + 10, y + 3]].forEach(([cx, cy], k) => clue(cx, cy, { kind: "decor", decor: "ruin_wall", blocks: true, name: ["The cut's upper layer", "The cut's black layer", "The cut's lowest layer"][k], clue: `tell_layer_${k}` }));
    npcAt("tel_ashun_digger", x + 8, y - 5, 1); npcAt("tel_ashun_digger", x + 8, y + 5, 1);
    // At its foot: the potter, the houses, the brickmaker's yard where the mound becomes bricks.
    mud(x - 13, y - 10, x - 8, y - 5, "e", "Imenet's Pots");
    npc("tel_ashun_potter", x - 11, y - 8); decor(x - 12, y - 6, "shelf", true, "Water jars, lamps, cooking pots, all of the tell's own clay");
    for (const hx of [x - 4, x + 3]) { mud(hx, y + 7, hx + 5, y + 12, "n", "A Tel Ashun house"); home(hx, y + 7, hx + 5, y + 12, "n", "A mat and a rolled blanket", "A brick from the tell, older than the house, kept for luck"); }
    for (const [hx, hy, x1, y1, door] of [[x - 15, y - 1, x - 10, y + 4, "e"], [x + 2, y - 18, x + 7, y - 13, "s"]] as const) { mud(hx, hy, x1, y1, door, "A Tel Ashun house"); home(hx, hy, x1, y1, door, "A mat and a rolled blanket", "A brick from the tell, older than the house, kept for luck"); }
    for (const [dx, dy] of [[-12, 6], [-12, 9], [-9, 6], [-9, 9]] as const) put2(x + dx, y + dy, "rubble", "Mudbricks drying in rows, stamped with the brickmaker's thumb");
    npcAt("tel_ashun_brickmaker", x - 7, y + 7, 1);
    villagers("tel_ashun_villager", x, y, [[-6, 3], [2, -1], [-10, -2]]);
    sign(x - 13, y - 2, "Tel Ashun", "TEL ASHUN, on its mound. Elder Hazane speaks for the village. Mudbrick for sale by the hundred. The mound is not for sale, the Elder says, though it is, she admits, for digging.");
    places.tel_ashun = { x: x - 4, y: y + 1 };
  }

  // ---------- 5. Ennu's Well, the oasis to the south ----------
  {
    const { x, y } = ENNUS_WELL;
    ground(x - 17, y - 15, x + 16, y + 12, null, true);
    area(x - 19, y - 17, x + 18, y + 14, "ennus_well");
    // The pool, the palms round it, the date gardens, the well; the old channel that feeds it from the hills to the west.
    for (let yy = y - 6; yy <= y + 6; yy++) for (let xx = x - 7; xx <= x + 7; xx++) {
      const d = Math.hypot((xx - x) / 4.6, (yy - y) / 3.4);
      if (d <= 1) { put(xx, yy, T.WATER); lift[tileIndex(xx, yy)] = 0; } else if (d <= 1.7) put(xx, yy, T.GRASS);
    }
    for (let xx = WELL_CHANNEL.x - 4; xx < x - 4; xx++) { const yy = y - 1 + Math.round((xx - WELL_CHANNEL.x) / 12); clearAt(xx, yy); put(xx, yy, T.STONE); }
    clue(WELL_CHANNEL.x, WELL_CHANNEL.y - 1, { kind: "decor", decor: "rubble", blocks: true, name: "The channel mouth", clue: "well_channel" });
    monsterAt("sand_borer", WELL_CHANNEL.x - 4, WELL_CHANNEL.y, 2);
    for (let yy = y + 5; yy <= y + 9; yy++) for (let xx = x - 12; xx <= x - 5; xx++) put(xx, yy, T.FARMLAND);
    for (let yy = y - 9; yy <= y - 6; yy++) for (let xx = x + 6; xx <= x + 13; xx++) put(xx, yy, T.FARMLAND);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, px = Math.round(x + Math.cos(a) * 7), py = Math.round(y + Math.sin(a) * 5); if (!occupied(px, py) && open(get(px, py))) t.tree(px, py, "palm"); }
    add({ kind: "well", x: x + 7, y: y - 1, blocks: true, name: "Ennu's Well" });
    // The keeper's house, the houses, Liyan's stall, the caravan ground.
    mud(x - 2, y - 14, x + 4, y - 9, "s", "The well-keeper's house");
    npc("ennu_keeper", x + 1, y - 12); decor(x - 1, y - 13, "shelf", true, "Tally sticks of water shares, one notch a day, going back three keepers");
    for (const [hx, hy, door] of [[x - 13, y - 13, "s"], [x + 9, y + 4, "w"], [x - 4, y + 7, "n"]] as const) { mud(hx, hy, hx + 5, hy + 5, door, "An Ennu's Well house"); home(hx, hy, hx + 5, hy + 5, door, "A mat under a palm-fibre blanket", "A water jar, its lid tied down, and a dried date-palm frond for the floor"); }
    add({ kind: "stall", stall: "bakery", x: x + 6, y: y + 2, blocks: true, name: "Liyan's stall" }); npcAt("ennu_trader", x + 6, y + 4);
    for (const [dx, dy] of [[11, -3], [14, 0], [12, 4]] as const) put2(x + dx, y + dy, "tent", "A caravan tent, staked against the wind");
    put2(x + 15, y - 5, "hay", "Fodder for the caravan's camels");
    npcAt("ennu_caravaneer", x + 12, y - 1, 1); npcAt("ennu_herder", x + 14, y + 7, 2); npcAt("ennu_gardener", x - 9, y + 4, 2);
    villagers("ennus_well_villager", x, y, [[-9, -4], [4, 7], [9, -6]]);
    sign(x + 3, y - 8, "Ennu's Well", "ENNU'S WELL. Water for the village first, for the gardens second, for the caravans third, and for the thirsty always. Ask the well-keeper before you fill more than a skin.");
    places.ennus_well = { x: x + 1, y: y - 7 };
  }

  // ---------- 6. The desert roads: Khetmar's east gate down the coast to Merrab, Tel Ashun off it, Ennu's Well south ----------
  road([[1066, 703], [1068, 722], [1064, 746], [1054, 762], [1046, 776], [1046, 789]], 2.4, T.PATH);
  road([[1064, 746], [1050, 745], [1036, 745], [TEL_ASHUN.x + 8, TEL_ASHUN.y - 9], [TEL_ASHUN.x + 2, TEL_ASHUN.y - 7]], 2.2, T.PATH);
  road([[MERRAB.x0, 791], [1047, 806], [1040, 818], [ENNUS_WELL.x + 4, ENNUS_WELL.y - 8]], 2.2, T.PATH);

  // ---------- 7. Creatures of the desert round the new places (the ones already there) ----------
  {
    const towns = new Set(["merrab", "tel_ashun", "ennus_well"].map(id => REGION_INDEX(id as RegionId)));
    const near = (x: number, y: number) => ctx.spawns.some(spawn => spawn.kind === "npc" && Math.abs(spawn.x - x) < 10 && Math.abs(spawn.y - y) < 10);
    const kinds = ["dune_jackal", "glasswing_vulture", "dust_walker", "obsidian_scarab"];
    for (let k = 0, tries = 0; k < 10 && tries < 800; tries++) {
      const x = 1000 + Math.floor(random() * 92), y = 720 + Math.floor(random() * 140);
      if (towns.has(ctx.region[tileIndex(x, y)]) || !open(get(x, y)) || get(x, y) === T.PATH || occupied(x, y) || near(x, y)) continue;
      monsterAt(kinds[k % kinds.length], x, y, 5); k++;
    }
  }

  // ---------- 9. The sea docks: a pier and a packet boat at each port, its boatman on the quay ----------
  const WALKABLE = (tt: number) => open(tt) || tt === T.BRIDGE || tt === T.SWAMP;
  for (const dock of SEA_DOCKS) {
    const { endX, endY } = layPier(t, dock, { occupied, walkable: WALKABLE, npcAt, lamp: "lamp", boat: "Packet boat", region: true });
    void endX; void endY;
  }

  // ---------- 10. Nothing out of reach: in each site, what no path leads to is taken away (and the builder told) ----------
  {
    const walk = new Set<number>([...OPEN, T.SWAMP, T.BRIDGE]);
    const SITES: readonly [number, number, number, number, number, number][] = [
      [GULLWICK.x0 - 4, GULLWICK.y0 - 4, GULLWICK.x1, GULLWICK.y1 + 2, GULLWICK.x1, 450],
      [SALTREACH.x0 - 10, SALTREACH.y0 - 4, SALTREACH.x1 + 2, SALTREACH.y1 + 2, SALTREACH.x1, 312],
      [MERRAB.x0 - 4, MERRAB.y0 - 4, MERRAB.x1 + 10, 816, MERRAB.x0, 789],
      [TEL_ASHUN.x - 16, TEL_ASHUN.y - 15, TEL_ASHUN.x + 15, TEL_ASHUN.y + 15, TEL_ASHUN.x + 2, TEL_ASHUN.y - 7],
      [ENNUS_WELL.x - 19, ENNUS_WELL.y - 17, ENNUS_WELL.x + 18, ENNUS_WELL.y + 14, ENNUS_WELL.x + 4, ENNUS_WELL.y - 8],
    ];
    for (const [x0, y0, x1, y1, sx, sy] of SITES) {
      const w = x1 - x0 + 1, seen = new Uint8Array(w * (y1 - y0 + 1)), id = (x: number, y: number) => (y - y0) * w + (x - x0);
      const passable = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && walk.has(get(x, y)) && !(ctx.objectAt[tileIndex(x, y)] >= 0 && ctx.objects[ctx.objectAt[tileIndex(x, y)]].blocks);
      const q: [number, number][] = [[sx, sy]]; seen[id(sx, sy)] = 1;
      for (let k = 0; k < q.length; k++) { const [x, y] = q[k]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const nx = x + dx, ny = y + dy; if (passable(nx, ny) && !seen[id(nx, ny)]) { seen[id(nx, ny)] = 1; q.push([nx, ny]); } } }
      const reached = (x: number, y: number) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1 && seen[id(nx, ny)] === 1; });
      for (const object of ctx.objects) if ((object.kind === "rock" || object.kind === "spot" || object.kind === "tree") && object.x >= x0 && object.x <= x1 && object.y >= y0 && object.y <= y1 && !reached(object.x, object.y)) clearAt(object.x, object.y);
      for (let i = ctx.spawns.length - 1; i >= 0; i--) { const sp = ctx.spawns[i]; if (sp.kind === "monster" && sp.x >= x0 && sp.x <= x1 && sp.y >= y0 && sp.y <= y1 && !reached(sp.x, sp.y) && !QUEST_FOES.has(sp.id)) ctx.spawns.splice(i, 1); }
    }
  }
}

/** The quests' foes are never taken away (a test reaches them, and so must you). */
const QUEST_FOES = new Set(["wrecker_chief", "saltjaw", "sand_borer"]);

import { REGIONS } from "./world.ts";
const REGION_INDEX = (id: RegionId) => REGIONS.findIndex(region => region.id === id);
