/**
 * Sorrowmere: the necropolis of the old kings, on the headland east of the Deadwood (built after the north, in the grown
 * world's own coordinates), and the catacombs under it. A megalithic place, made to be got through:
 * - The outer court, inside a wall three storeys high: an avenue of standing stones taller than houses from the west
 *   gate, dolmens and graves, and four mausoleums (the Crowned, the Drowned, the Dusk and the Dawn), each with a cold
 *   brazier. The Litany at the gate says in what order the dead were laid. Light the braziers in that order (with a
 *   tinderbox) and the inner gate opens; light one out of turn and they all go out.
 * - The inner court: the Great Barrow, a stepped mound of stone, and the Gravewarden before it. The Barrow's door wants
 *   the Gravewarden's seal.
 * - The catacombs: an entry hall, then an ossuary maze, crypt wings either side of it with coffers, the half-flooded
 *   Drowned Vault, and the Regent's door, which takes an ossuary key (the catacombs' coffers and dead carry them) and
 *   breaks it, before the Throne of Bones, where the Bone Regent sits on his hoard.
 * What you've lit, and whether the gate is open, is yours (questData), so each player solves it for themselves.
 */
import { REGIONS, T, W, UNDER_Y, isWater, worldTools, type GenContext, type RegionId, type World, type WorldObject } from "./world.ts";
import { addXp, has, message, sound, take, type Game } from "./state.ts";

/** The necropolis (overworld) and the catacombs under it (their rows are UNDER_Y + dy). */
export const SORROWMERE = { x0: 908, y0: 404, x1: 1004, y1: 478 } as const;
export const CATACOMBS = { x: 896, dy: 432, w: 80, h: 76 } as const;
const MID = Math.floor((SORROWMERE.y0 + SORROWMERE.y1) / 2);
/** The inner wall's column, and the gate in it. */
export const INNER_X = SORROWMERE.x0 + 56, INNER_GATE = { x: INNER_X, y: MID };
/** The Great Barrow, and its door on the west face. */
export const BARROW = { x0: SORROWMERE.x0 + 68, y0: MID - 10, x1: SORROWMERE.x0 + 88, y1: MID + 10 } as const;
export const BARROW_DOOR = { x: BARROW.x0, y: MID };
/** The braziers' order, as the Litany gives it. */
export const LITANY = ["crowned", "drowned", "dusk", "dawn"] as const;
type Mausoleum = typeof LITANY[number];
const MAUSOLEUM_NAMES: Record<Mausoleum, string> = { crowned: "The Mausoleum of the Crowned", drowned: "The Mausoleum of the Drowned", dusk: "The Mausoleum of the Dusk", dawn: "The Mausoleum of the Dawn" };
const catacomb = (x: number, y: number) => ({ x: CATACOMBS.x + x, y: UNDER_Y + CATACOMBS.dy + y });
/** Where the catacombs' stair comes down, and the Regent's door (functions: UNDER_Y isn't set when this module loads). */
export const catacombEntry = () => catacomb(40, 6), regentDoor = () => catacomb(40, 61);

function rng(seed: number) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildSorrowmere(ctx: GenContext, labels: World["labels"]) {
  const t = worldTools(ctx), { tiles, lift, raise } = ctx, N = SORROWMERE;
  const idx = (x: number, y: number) => y * W + x;
  const label = (id: RegionId, x: number, y: number) => { const entry = REGIONS.find(region => region.id === id) as { label: { x: number; y: number } } | undefined; if (entry) { entry.label = { x, y }; labels[id] = { x, y }; } };
  const clueAt = (o: WorldObject | null, clue: string) => { if (o) ctx.objects[o.id] = { ...o, clue }; };
  const put = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => { t.clearAt(x, y); return t.decor(x, y, kind, blocks, name); };

  // ---------- The headland: the necropolis's ground, a beach round it, the moor reaching into the bay ----------
  const { noise2 } = ctx;
  for (let y = N.y0 - 12; y <= N.y1 + 12; y++) for (let x = N.x0 - 12; x <= N.x1 + 12; x++) {
    const i = idx(x, y), out = Math.max(N.x0 - x, x - N.x1, N.y0 - y, y - N.y1), reach = 3 + noise2(x * 0.18, y * 0.18) * 8;
    if (out > reach) continue;
    if (out > 0 && !isWater(tiles[i])) continue;   // (the Deadwood's own ground stays as it is)
    t.clearAt(x, y); t.setRegion(x, y, "sorrowmere"); lift[i] = 0.2; raise[i] = 0.25;
    if (out > reach - 1.6) { tiles[i] = T.SAND; continue; }
    tiles[i] = out > 0 ? T.GRASS : noise2(x * 0.3 + 40, y * 0.3) > 0.55 ? T.GRAVEL : noise2(x * 0.2, y * 0.2 + 70) > 0.45 ? T.DARK_GRASS : T.GRASS;
  }
  // The walls: the outer one, three storeys and battlemented, the gate on the west; the inner one, its gate shut.
  for (let y = N.y0; y <= N.y1; y++) for (let x = N.x0; x <= N.x1; x++) if (x === N.x0 || x === N.x1 || y === N.y0 || y === N.y1 || x === INNER_X) tiles[idx(x, y)] = T.WALL;
  for (const y of [MID - 1, MID, MID + 1]) tiles[idx(N.x0, y)] = T.STONE;
  tiles[idx(INNER_X, MID)] = T.STONE;
  (ctx.ramparts ??= []).push({ x0: N.x0, y0: N.y0, x1: N.x1, y1: N.y1, storeys: 3, walls: "stone" });
  // The processional way: flagged, from the gate to the inner gate and on to the Barrow.
  for (let x = N.x0 + 1; x < BARROW.x0; x++) for (let y = MID - 1; y <= MID + 1; y++) if (x !== INNER_X) tiles[idx(x, y)] = T.STONE;
  // Out from the gate, west, to the Deadwood's nearest road.
  { let best: [number, number] | null = null, bestD = 1e9;
    for (let y = N.y0 - 40; y < N.y1 + 40; y++) for (let x = N.x0 - 120; x < N.x0 - 4; x++) if (tiles[idx(x, y)] === T.PATH) { const d = Math.hypot(N.x0 - x, (MID - y) * 1.3); if (d < bestD) { bestD = d; best = [x, y]; } }
    if (best) t.line([[N.x0 - 1, MID], [best[0] + Math.sign(N.x0 - best[0]) * 2, MID], best], 3, (x, y, terrain) => {
      if (terrain === T.WALL || terrain === T.VOID || terrain === T.COBBLE || terrain === T.STONE || terrain === T.WOOD) return;
      t.clearAt(x, y); tiles[idx(x, y)] = isWater(terrain) || terrain === T.BRIDGE ? T.BRIDGE : T.PATH;
    }); }
  // Two great stones outside the gate, and the sign.
  put(N.x0 - 3, MID - 4, "menhir", true, "A standing stone, three times a house's height"); put(N.x0 - 3, MID + 4, "menhir", true, "A standing stone, three times a house's height");
  t.clearAt(N.x0 - 5, MID - 2); t.add({ kind: "sign", x: N.x0 - 5, y: MID - 2, blocks: true, name: "Sorrowmere", text: "SORROWMERE. The old kings' necropolis. The gate is open; the inner gate is not. The Gravewarden keeps the Barrow. Turn back." });

  // ---------- The outer court: the avenue of stones, dolmens, graves, the four mausoleums ----------
  for (let x = N.x0 + 5; x < INNER_X - 3; x += 6) { put(x, MID - 4, "menhir", true, "A standing stone, carved with a king's name"); put(x, MID + 4, "menhir", true, "A standing stone, carved with a queen's name"); }
  const litany = put(N.x0 + 3, MID - 2, "obelisk", true, "The Litany"); clueAt(litany, "sm_litany");
  const mausoleum = (which: Mausoleum, x0: number, y0: number, door: "n" | "s") => {
    t.building(x0, y0, x0 + 10, y0 + 7, door, T.STONE, undefined, { name: MAUSOLEUM_NAMES[which], walls: "stone", roof: "gable", hip: true, color: "#4a4850" });
    const b = put(x0 + 5, door === "s" ? y0 + 3 : y0 + 4, "brazier", true, "A cold brazier"); clueAt(b, `sm_brazier_${which}`);
    put(x0 + 2, y0 + 2, "tomb", true, "A tomb, its lid carved with a crown"); put(x0 + 8, y0 + 2, "tomb", true, "A tomb, its lid carved with a crown");
    put(x0 + 2, y0 + 5, "sarcophagus", true); put(x0 + 8, y0 + 5, "sarcophagus", true);
  };
  mausoleum("dawn", N.x0 + 6, N.y0 + 4, "s"); mausoleum("dusk", N.x0 + 38, N.y0 + 4, "s");
  mausoleum("drowned", N.x0 + 6, N.y1 - 11, "n"); mausoleum("crowned", N.x0 + 38, N.y1 - 11, "n");
  const free = (x: number, y: number) => t.free(x, y) && tiles[idx(x, y)] !== T.STONE && Math.abs(y - MID) > 5;
  t.scatter(N.x0 + 2, N.y0 + 2, INNER_X - 2, N.y1 - 2, 70, (x, y) => { t.decor(x, y, "grave", true); }, free);
  t.scatter(N.x0 + 2, N.y0 + 2, INNER_X - 2, N.y1 - 2, 8, (x, y) => { t.decor(x, y, "dolmen", true); }, (x, y) => free(x, y) && free(x + 1, y) && free(x - 1, y));
  t.scatter(N.x0 + 2, N.y0 + 2, INNER_X - 2, N.y1 - 2, 14, (x, y) => { t.decor(x, y, "dead_tree", true); }, free);
  t.scatter(N.x0 + 2, N.y0 + 2, INNER_X - 2, N.y1 - 2, 10, (x, y) => { t.decor(x, y, "bones", false); }, free);
  t.monsters("skeleton", N.x0 + 2, N.y0 + 2, INNER_X - 2, N.y1 - 2, 8); t.monsters("cairn_wight", N.x0 + 2, N.y0 + 2, INNER_X - 2, N.y1 - 2, 5);
  t.monsters("barrow_shade", N.x0 + 2, N.y0 + 2, INNER_X - 2, N.y1 - 2, 6);
  // The inner gate (sm_inner_gate opens it, for whoever lit the braziers in order).
  t.clearAt(INNER_GATE.x, INNER_GATE.y);
  t.add({ kind: "ladder", look: "gate", axis: "ew", x: INNER_GATE.x, y: INNER_GATE.y, blocks: true, name: "The inner gate", action: "Open", to: { x: INNER_GATE.x + 1, y: INNER_GATE.y }, clue: "sm_inner_gate" });

  // ---------- The inner court: the Great Barrow, the Gravewarden, the kings' stones ----------
  t.building(BARROW.x0, BARROW.y0, BARROW.x1, BARROW.y1, "w", T.STONE, undefined, { name: "The Great Barrow", walls: "stone", roof: "gable", hip: true, pyramid: true, color: "#5a5850" });
  // (Its doorway two tiles wide: one walled up again, the door in the other.)
  tiles[idx(BARROW.x0, MID + 1)] = T.WALL; t.clearAt(BARROW_DOOR.x, BARROW_DOOR.y); tiles[idx(BARROW_DOOR.x, BARROW_DOOR.y)] = T.STONE;
  t.add({ kind: "ladder", look: "gate", axis: "ew", x: BARROW_DOOR.x, y: BARROW_DOOR.y, blocks: true, name: "The Barrow door", action: "Enter", to: catacombEntry(), clue: "sm_barrow_door" });
  for (const [dx, dy] of [[4, -12], [4, 12], [10, -12], [10, 12], [-2, -14], [-2, 14]] as const) put(BARROW.x0 + dx, MID + dy, "menhir", true, "A king's stone");
  for (const dy of [-6, 6]) put(INNER_X + 6, MID + dy, "monument", true, "A king of Sorrowmere, in stone");
  t.monster("gravewarden", INNER_X + 7, MID, 3); t.monsters("sorrow_knight", INNER_X + 2, N.y0 + 2, N.x1 - 2, N.y1 - 2, 3);

  // ---------- The catacombs ----------
  const C = CATACOMBS, X = C.x, Y = UNDER_Y + C.dy, at = (x: number, y: number) => idx(X + x, Y + y);
  for (let y = -2; y <= C.h + 1; y++) for (let x = -2; x <= C.w + 1; x++) { tiles[at(x, y)] = T.VOID; t.setRegion(X + x, Y + y, "sorrowmere_catacombs"); }
  const hall = (ax: number, ay: number, bx: number, by: number, kind: number = T.DUNGEON) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) tiles[at(x, y)] = kind; };
  hall(34, 2, 46, 9);                                    // the entry hall, under the Barrow
  hall(39, 9, 41, 11);                                   // down into the ossuary
  // The ossuary maze: corridors between walls of bones, 13 cells by 9 (three tiles a cell, two of floor).
  const MX = 14, MY = 12, MW = 17, MH = 11, random = rng(31337), seen = new Uint8Array(MW * MH), stack = [Math.floor(MW / 2)];
  const cellFloor = (c: number) => { const cx = MX + (c % MW) * 3, cy = MY + Math.floor(c / MW) * 3; hall(cx, cy, cx + 1, cy + 1); };
  seen[stack[0]] = 1; cellFloor(stack[0]);
  while (stack.length) {
    const c = stack[stack.length - 1], i = c % MW, j = Math.floor(c / MW);
    const ways = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => i + dx >= 0 && i + dx < MW && j + dy >= 0 && j + dy < MH && !seen[(j + dy) * MW + i + dx]);
    if (!ways.length) { stack.pop(); continue; }
    const [dx, dy] = ways[Math.floor(random() * ways.length)], d = (j + dy) * MW + i + dx;
    const cx = MX + i * 3, cy = MY + j * 3;
    if (dx === 1) hall(cx + 2, cy, cx + 2, cy + 1); else if (dx === -1) hall(cx - 1, cy, cx - 1, cy + 1); else if (dy === 1) hall(cx, cy + 2, cx + 1, cy + 2); else hall(cx, cy - 1, cx + 1, cy - 1);
    seen[d] = 1; cellFloor(d); stack.push(d);
  }
  // Loops, so it's a maze and not a single thread.
  for (let k = 0; k < 18; k++) { const i = Math.floor(random() * (MW - 1)), j = Math.floor(random() * MH), cx = MX + i * 3, cy = MY + j * 3; hall(cx + 2, cy, cx + 2, cy + 1); }
  const MAZE_X1 = MX + MW * 3 - 2, MAZE_Y1 = MY + MH * 3 - 2;
  hall(2, 22, 11, 38); hall(11, 29, 13, 31);             // the west crypt, off the maze
  hall(MAZE_X1 + 1, 29, MAZE_X1 + 3, 31); hall(MAZE_X1 + 3, 22, 77, 38);  // the east crypt
  hall(39, MAZE_Y1 + 1, 41, 48);                         // down to
  hall(16, 48, 64, 58);                                  // the Drowned Vault, half under water
  for (let y = 50; y <= 57; y++) for (let x = 18; x <= 62; x++) if (Math.sin(x * 0.31) + Math.cos(y * 0.57) > 0.9 && Math.abs(x - 40) > 3) tiles[at(x, y)] = T.WATER;
  hall(39, 58, 41, 60);                                  // to the Regent's door (at 40, 61)
  hall(24, 62, 56, 74);                                  // the Throne of Bones
  // Walls round every floor.
  const floor = (tile: number) => tile === T.DUNGEON || tile === T.WATER;
  for (let y = -1; y <= C.h; y++) for (let x = -1; x <= C.w; x++) {
    if (tiles[at(x, y)] !== T.VOID) continue;
    let beside = false;
    for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) if (floor(tiles[at(x + dx, y + dy)])) beside = true;
    if (beside) tiles[at(x, y)] = T.WALL;
  }
  const REGENT_DOOR = regentDoor(); tiles[idx(REGENT_DOOR.x, REGENT_DOOR.y)] = T.DUNGEON;
  const P = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => put(X + x, Y + y, kind, blocks, name);
  // The stair up, and the Regent's door (sm_regent_door: an ossuary key, broken in the lock).
  t.add({ kind: "ladder", x: X + 40, y: Y + 3, blocks: true, name: "Stair up to the Barrow", action: "Climb-up", to: { x: BARROW_DOOR.x - 1, y: BARROW_DOOR.y } });
  t.add({ kind: "ladder", look: "gate", axis: "ns", x: REGENT_DOOR.x, y: REGENT_DOOR.y, blocks: true, name: "The Regent's door", action: "Open", to: { x: REGENT_DOOR.x, y: REGENT_DOOR.y + 1 }, clue: "sm_regent_door" });
  for (const [x, y] of [[35, 3], [45, 3], [35, 8], [45, 8]] as const) P(x, y, "torch");
  P(37, 5, "statue", true, "A mourner, her face in her hands"); P(43, 5, "statue", true, "A mourner, his face in his hands");
  // Bones in the maze's walls; coffers in its dead ends and the crypts.
  t.scatter(X + MX, Y + MY, X + MAZE_X1, Y + MAZE_Y1, 26, (x, y) => { t.decor(x, y, "bones", false, "Bones, stacked with care"); }, (x, y) => t.free(x, y) && tiles[idx(x, y)] === T.DUNGEON);
  for (const [x, y] of [[3, 23], [10, 23], [3, 37], [10, 37], [MAZE_X1 + 4, 23], [76, 23], [MAZE_X1 + 4, 37], [76, 37]] as const) P(x, y, "chest", true, "Sorrowmere coffer");
  for (const [x, y] of [[6, 26], [6, 34], [MAZE_X1 + 8, 26], [MAZE_X1 + 8, 34]] as const) P(x, y, "tomb", true, "A king's tomb, broken open");
  for (const [x, y] of [[2, 30], [11, 22], [77, 30], [MAZE_X1 + 3, 22]] as const) P(x, y, "torch");
  for (const x of [20, 30, 50, 60]) { P(x, 48, "torch"); P(x, 58, "torch"); }
  // The Throne of Bones: the Regent, his throne, his hoard.
  P(40, 73, "throne", true, "The Throne of Bones"); P(44, 73, "chest", true, "The Bone Regent's hoard");
  for (const [x, y] of [[25, 63], [55, 63], [25, 73], [55, 73]] as const) P(x, y, "obelisk", true, "A pillar of skulls");
  for (const [x, y] of [[32, 63], [48, 63], [24, 68], [56, 68]] as const) P(x, y, "torch");
  t.monsters("ossuary_ghoul", X + MX, Y + MY, X + MAZE_X1, Y + MAZE_Y1, 8);
  t.monsters("barrow_shade", X + 2, Y + 22, X + 11, Y + 38, 3); t.monsters("barrow_shade", X + MAZE_X1 + 3, Y + 22, X + 77, Y + 38, 3);
  t.monsters("sorrow_knight", X + 16, Y + 48, X + 64, Y + 58, 4);
  t.monster("bone_regent", X + 40, Y + 68, 2);

  label("sorrowmere", Math.round((N.x0 + N.x1) / 2), N.y0 - 3); label("sorrowmere_catacombs", X + 40, Y + 30);
}

// ---------- The puzzle, the doors (kharaveth.ts lists these clues) ----------
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const lit = (game: Game) => game.player.questData.sm_lit ?? 0;
export const sorrowmereOpen = (game: Game) => !!game.player.questData.sm_open;
/** Whether a brazier is burning for this player (render.ts draws its flame). */
export function brazierLit(game: Game, object: WorldObject) {
  const which = (object.clue ?? "").replace("sm_brazier_", "") as Mausoleum, k = LITANY.indexOf(which);
  return k >= 0 && (sorrowmereOpen(game) || k < lit(game));
}
const brazier = (which: Mausoleum): Clue => ({
  options: game => brazierLit(game, { clue: `sm_brazier_${which}` } as WorldObject) ? ["Inspect"] : ["Light"],
  examine: game => brazierLit(game, { clue: `sm_brazier_${which}` } as WorldObject) ? "The brazier burns, low and blue." : "A brazier of black iron, cold, full of old ash and new kindling.",
  use: game => {
    const p = game.player, k = LITANY.indexOf(which);
    if (sorrowmereOpen(game) || k < lit(game)) return { text: "It burns, low and blue." };
    if (!has(p, "tinderbox")) return { text: "You need a tinderbox to light it." };
    if (k === lit(game)) {
      p.questData.sm_lit = k + 1; sound(game, "fire"); addXp(game, "firemaking", 300, { raw: true });
      if (k + 1 === LITANY.length) { p.questData.sm_open = 1; addXp(game, "prayer", 2000, { raw: true }); sound(game, "quest"); message(game, "The fourth brazier catches. Far off, stone grinds on stone: the inner gate is opening.", "quest"); }
      return { text: "The brazier catches, and burns low and blue." };
    }
    p.questData.sm_lit = 0; sound(game, "hurt");
    return { text: "The kindling flares and dies, and every brazier you've lit goes out with it. The dead were laid in an order; light them in it." };
  },
});
export const SORROWMERE_CLUES: Record<string, Clue> = {
  sm_litany: { options: () => ["Read"], examine: () => "An obelisk by the gate, carved with the Litany of Sorrowmere.",
    use: () => ({ text: "The Litany of Sorrowmere: \"First the Crowned, who ruled; then the Drowned, who sailed; then the Dusk, who mourned; last the Dawn, who woke. Light them their way as they were laid.\"" }) },
  sm_brazier_crowned: brazier("crowned"), sm_brazier_drowned: brazier("drowned"), sm_brazier_dusk: brazier("dusk"), sm_brazier_dawn: brazier("dawn"),
  sm_inner_gate: {
    options: () => ["Open"], examine: game => sorrowmereOpen(game) ? "The inner gate, standing open." : "The inner gate, shut. Over it: 'Light the dead their way.'",
    use: (game, object) => {
      if (!sorrowmereOpen(game)) return { text: "The inner gate won't move. Cut over it: 'Light the dead their way.' The four mausoleums have braziers in them." };
      return { to: { x: game.player.x < object.x ? object.x + 1 : object.x - 1, y: object.y }, text: "You pass through the inner gate." };
    },
  },
  sm_barrow_door: {
    options: () => ["Enter"], examine: () => "The Great Barrow's door: a slab of black stone with a round socket cut in it, the size of a palm.",
    use: () => ({ text: "The door has a round socket in it, the size of a palm." }),
  },
  sm_regent_door: {
    options: () => ["Open"], examine: () => "The Regent's door: iron-bound bone, a lock shaped like a jaw.",
    use: () => ({ text: "The Regent's door is locked. It wants an ossuary key." }),
  },
};
/** The two doors that want things (the engine calls this before the clue: it moves you). */
export function sorrowmereDoor(game: Game, object: WorldObject, travel: (game: Game, to: { x: number; y: number }, text: string) => void): boolean {
  const p = game.player;
  if (object.clue === "sm_barrow_door") {
    if (!has(p, "sorrowmere_seal")) { message(game, "The door has a round socket in it, the size of a palm. The Gravewarden wears something that size at its throat.", "warn"); return true; }
    travel(game, object.to!, "You set the seal in the socket. The slab sinks into the floor, and a stair goes down."); return true;
  }
  if (object.clue === "sm_regent_door") {
    if (p.y > object.y) { travel(game, { x: object.x, y: object.y - 1 }, "You go back through the Regent's door."); return true; }
    if (!has(p, "sorrowmere_key")) { message(game, "The Regent's door is locked. It wants an ossuary key: the catacombs' coffers and dead have them.", "warn"); return true; }
    take(p, "sorrowmere_key", 1); travel(game, object.to!, "The ossuary key turns, and breaks in the lock. The door swings open on the Throne of Bones."); return true;
  }
  return false;
}
