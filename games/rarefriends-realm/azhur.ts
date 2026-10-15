/**
 * The Labyrinth of Azhur: Azhurak's labyrinth under the Sea of Dunes (built after the north, in the grown world's own
 * coordinates). Azhurak kept the dead below by measure; this is where they kept the measure.
 * - The Gate of Azhur: a sunken court of flagstones in the sand west of the desert road, an avenue of obelisks to it,
 *   colossal heads half-buried, and the gate itself, two pillars and a lintel taller than a temple, a stair going down.
 * - The labyrinth: a true one, thirty-three passages by thirty-three, few loops, a long way to anywhere, hunted by the
 *   Hounds of Azhur and walked by the grit wraiths. At three of its farthest ends stand three shrines (Measure, Water,
 *   the Name), each with its keeper and its key.
 * - The Heart, in the middle, walled all round, its one door wanting the three keys (once; it knows you after): the
 *   Keeper of the Measure, and the hoard.
 * The keys you've taken and whether the Heart knows you are yours (questData).
 */
import { REGIONS, T, W, UNDER_Y, worldTools, type GenContext, type RegionId, type World, type WorldObject } from "./world.ts";
import { addXp, give, has, message, sound, take, type Game } from "./state.ts";
import { AZHUR_KEYS } from "./azhurgear.ts";

/** The gate court (overworld), and the gate in its north wall. */
export const GATE_COURT = { x0: 187, y0: 1018, x1: 223, y1: 1044 } as const;
export const AZHUR_GATE = { x: 205, y: 1018 } as const;
/** The labyrinth (its rows are UNDER_Y + dy): N cells a side, three tiles a cell; the Heart is the middle seven. */
export const LABYRINTH_OF_AZHUR = { x: 90, dy: 930, n: 33 } as const;
const N = LABYRINTH_OF_AZHUR.n, HEART0 = 13, HEART1 = 19, MID = 16;
/** A cell's top-left floor tile (local), and where things are in world coordinates (functions: UNDER_Y isn't set when this module loads). */
const cellTile = (i: number, j: number) => [1 + 3 * i, 1 + 3 * j] as const;
const local = (x: number, y: number) => ({ x: LABYRINTH_OF_AZHUR.x + x, y: UNDER_Y + LABYRINTH_OF_AZHUR.dy + y });
export const labyrinthEntry = () => local(cellTile(MID, N - 1)[0], cellTile(MID, N - 1)[1]);
export const heartDoor = () => local(cellTile(MID, HEART1 + 1)[0], 3 * (HEART1 + 1));

function rng(seed: number) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const inHeart = (i: number, j: number) => i >= HEART0 && i <= HEART1 && j >= HEART0 && j <= HEART1;

/** The maze: which cells join which (a spanning tree by depth-first search, and a few loops), and the shrines' cells. */
export function azhurMaze() {
  const random = rng(70707), open = new Set<string>(), key = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
  const seen = new Uint8Array(N * N), start = (N - 1) * N + MID, stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const c = stack[stack.length - 1], i = c % N, j = Math.floor(c / N);
    const ways = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [i + dx, j + dy] as const).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !inHeart(a, b) && !seen[b * N + a]);
    if (!ways.length) { stack.pop(); continue; }
    const [a, b] = ways[Math.floor(random() * ways.length)], d = b * N + a;
    open.add(key(c, d)); seen[d] = 1; stack.push(d);
  }
  // A few loops, so a wrong turn isn't always a dead end (and a right one isn't always the way).
  for (let k = 0; k < 14; k++) {
    const i = Math.floor(random() * (N - 1)), j = Math.floor(random() * N), c = j * N + i, d = j * N + i + 1;
    if (!inHeart(i, j) && !inHeart(i + 1, j)) open.add(key(c, d));
  }
  const joined = (c: number) => [c - 1, c + 1, c - N, c + N].filter(d => d >= 0 && d < N * N && Math.abs((d % N) - (c % N)) <= 1 && open.has(key(c, d)));
  // How far every cell is from the stair, along the passages.
  const dist = new Int32Array(N * N).fill(-1), queue = [start]; dist[start] = 0;
  for (let q = 0; q < queue.length; q++) for (const d of joined(queue[q])) if (dist[d] < 0) { dist[d] = dist[queue[q]] + 1; queue.push(d); }
  // The shrines: the farthest dead ends in the north-west, the north-east, and the south (away from the stair).
  const deadEnds = Array.from({ length: N * N }, (_, c) => c).filter(c => !inHeart(c % N, Math.floor(c / N)) && joined(c).length === 1 && c !== start);
  const far = (ok: (i: number, j: number) => boolean) => deadEnds.filter(c => ok(c % N, Math.floor(c / N))).sort((a, b) => dist[b] - dist[a])[0];
  const shrines = [far((i, j) => i < MID && j < MID), far((i, j) => i > MID && j < MID), far((i, j) => j > HEART1 && Math.abs(i - MID) > 6)];
  return { open, key, joined, dist, start, shrines, door: (HEART1 + 1) * N + MID };
}

export function buildAzhur(ctx: GenContext, labels: World["labels"]) {
  const t = worldTools(ctx), { tiles, lift, raise, noise2 } = ctx, G = GATE_COURT;
  const idx = (x: number, y: number) => y * W + x;
  const label = (id: RegionId, x: number, y: number) => { const entry = REGIONS.find(region => region.id === id) as { label: { x: number; y: number } } | undefined; if (entry) { entry.label = { x, y }; labels[id] = { x, y }; } };
  const clueAt = (o: WorldObject | null, clue: string, extra: Partial<WorldObject> = {}) => { if (o) ctx.objects[o.id] = { ...o, clue, ...extra }; };
  const put = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => { t.clearAt(x, y); return t.decor(x, y, kind, blocks, name); };

  // ---------- The Gate of Azhur: the court, the avenue, the gate ----------
  for (let y = G.y0 - 8; y <= G.y1 + 3; y++) for (let x = G.x0 - 3; x <= G.x1 + 26; x++) {
    const i = idx(x, y), court = x >= G.x0 && x <= G.x1 && y >= G.y0 && y <= G.y1, avenue = x > G.x1 && x <= G.x1 + 20 && Math.abs(y - (G.y1 - 6)) <= 3;
    if (!court && !avenue && !(y < G.y0 && Math.abs(x - AZHUR_GATE.x) <= 8)) continue;
    t.clearAt(x, y); t.setRegion(x, y, "gate_of_azhur"); raise[i] = 3 / 64; lift[i] = court ? 3 / 64 : 13 / 64;   // (on the bake's own steps)
    tiles[i] = court ? (noise2(x * 0.22, y * 0.22) > 0.72 && Math.abs(x - AZHUR_GATE.x) > 2 ? T.SAND : T.STONE) : avenue ? (Math.abs(y - (G.y1 - 6)) <= 1 ? T.STONE : T.SAND) : T.SAND;
  }
  // The court's walls, fallen to stumps and half under the sand, open on the east to the avenue.
  for (let x = G.x0; x <= G.x1; x += 2) for (const y of [G.y0, G.y1]) if (Math.abs(x - AZHUR_GATE.x) > 3 && noise2(x * 0.5, y) > 0.25) put(x, y, "ruin_wall", true, "A wall of the gate court, mostly sand now");
  for (let y = G.y0 + 2; y <= G.y1; y += 2) { if (noise2(G.x0, y * 0.5) > 0.25) put(G.x0, y, "ruin_wall", true, "A wall of the gate court, mostly sand now"); if (Math.abs(y - (G.y1 - 6)) > 3 && noise2(G.x1, y * 0.5) > 0.25) put(G.x1, y, "ruin_wall", true, "A wall of the gate court, mostly sand now"); }
  // The avenue of obelisks from the desert road, and the road joined to it.
  for (let x = G.x1 + 3; x <= G.x1 + 19; x += 4) { put(x, G.y1 - 9, "obelisk", true, "An obelisk of the avenue, its glyphs worn to a whisper"); put(x, G.y1 - 3, "obelisk", true, "An obelisk of the avenue, its glyphs worn to a whisper"); }
  { let best: [number, number] | null = null, bestD = 1e9;
    for (let y = G.y0 - 20; y <= G.y1 + 20; y++) for (let x = G.x1 + 10; x <= G.x1 + 60; x++) if (tiles[idx(x, y)] === T.PATH) { const d = Math.hypot(x - G.x1 - 20, (y - G.y1 + 6) * 1.5); if (d < bestD) { bestD = d; best = [x, y]; } }
    if (best) t.road([[G.x1 + 20, G.y1 - 6], best], 2.6, T.PATH); }
  // Colossal heads either side of the gate, and sphinx-paws of stone; the sign.
  for (const dx of [-6, 6]) { put(AZHUR_GATE.x + dx, AZHUR_GATE.y + 3, "stone_head", true, "A colossal head of Azhurak, sunk to the chin in sand"); put(AZHUR_GATE.x + dx, AZHUR_GATE.y + 7, "statue", true, "A seated figure with a long-billed bird's head, a measuring rod across its knees"); }
  for (const [x, y] of [[G.x0 + 4, G.y1 - 4], [G.x0 + 10, G.y0 + 6], [G.x0 + 6, G.y0 + 14], [G.x1 - 8, G.y1 - 12]] as const) put(x, y, "broken_pillar", true);
  t.clearAt(G.x1 + 20, G.y1 - 11); t.add({ kind: "sign", x: G.x1 + 20, y: G.y1 - 11, blocks: true, name: "The Gate of Azhur", text: "THE GATE OF AZHUR. In the keeping of the Obsidian Legacy. Below is the labyrinth Azhurak built to keep the measure. Nobody who has gone in has come out with a map. Take bread, and chalk, and a friend." });
  // The gate: two pillars and a lintel taller than a temple; the stair under it (az_gate).
  for (const [dx, dy] of [[-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [-2, 0], [2, 0]] as const) { t.clearAt(AZHUR_GATE.x + dx, AZHUR_GATE.y + dy); t.decor(AZHUR_GATE.x + dx, AZHUR_GATE.y + dy, "footing", true, "The Gate of Azhur"); }
  clueAt(put(AZHUR_GATE.x, AZHUR_GATE.y, "azhur_gate", true, "The Gate of Azhur"), "az_gate", { to: labyrinthEntry() });
  tiles[idx(AZHUR_GATE.x, AZHUR_GATE.y + 1)] = T.STONE;
  t.monsters("sand_scorpion", G.x0 + 2, G.y0 + 2, G.x1 - 2, G.y1 - 2, 3);

  // ---------- The labyrinth ----------
  const L = LABYRINTH_OF_AZHUR, X = L.x, Y = UNDER_Y + L.dy, S = 3 * N + 1, at = (x: number, y: number) => idx(X + x, Y + y);
  for (let y = -2; y <= S + 1; y++) for (let x = -2; x <= S + 1; x++) { tiles[at(x, y)] = T.WALL; t.setRegion(X + x, Y + y, "labyrinth_of_azhur"); }
  for (let y = -2; y <= S + 1; y++) for (let x = -2; x <= S + 1; x++) if (x < 0 || y < 0 || x >= S || y >= S) tiles[at(x, y)] = T.VOID;
  const floor = (ax: number, ay: number, bx: number, by: number) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) tiles[at(x, y)] = T.DUNGEON; };
  const M = azhurMaze();
  for (let c = 0; c < N * N; c++) {
    const i = c % N, j = Math.floor(c / N); if (inHeart(i, j)) continue;
    const [x, y] = cellTile(i, j); floor(x, y, x + 1, y + 1);
    if (i + 1 < N && M.open.has(M.key(c, c + 1))) floor(x + 2, y, x + 2, y + 1);
    if (j + 1 < N && M.open.has(M.key(c, c + N))) floor(x, y + 2, x + 1, y + 2);
  }
  // The Heart: the middle seven cells' ground, walled, its door on the south.
  const [hx0, hy0] = cellTile(HEART0, HEART0), hx1 = cellTile(HEART1, HEART1)[0] + 1, hy1 = cellTile(HEART1, HEART1)[1] + 1;
  floor(hx0, hy0, hx1, hy1);
  const DOOR = heartDoor(); tiles[idx(DOOR.x, DOOR.y)] = T.DUNGEON; tiles[idx(DOOR.x + 1, DOOR.y)] = T.WALL;
  const P = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => put(X + x, Y + y, kind, blocks, name);
  // The stair up to the gate, and the Heart's door (az_heart_door: the three keys, turned once).
  const [ex, ey] = cellTile(MID, N - 1);
  t.add({ kind: "ladder", x: X + ex + 1, y: Y + ey + 1, blocks: true, name: "Stair up to the Gate of Azhur", action: "Climb-up", to: { x: AZHUR_GATE.x, y: AZHUR_GATE.y + 1 } });
  t.add({ kind: "ladder", look: "gate", axis: "ns", x: DOOR.x, y: DOOR.y, blocks: true, name: "The Heart's door", action: "Open", to: { x: DOOR.x, y: DOOR.y - 1 }, clue: "az_heart_door" });
  // The shrines, each with its keeper; torches here and there, so the dark has edges.
  M.shrines.forEach((c, k) => {
    const [x, y] = cellTile(c % N, Math.floor(c / N)), K = AZHUR_KEYS[k];
    clueAt(P(x, y, "obelisk", true, K.shrine), `az_shrine_${K.id}`); P(x + 1, y + 1, "torch");
    t.monster("shrine_keeper", X + x + 1, Y + y, 1);
  });
  const random = rng(4242);
  for (let k = 0; k < 40; k++) { const i = Math.floor(random() * N), j = Math.floor(random() * N); if (inHeart(i, j) || M.shrines.includes(j * N + i) || j * N + i === M.start) continue; const [x, y] = cellTile(i, j); if (t.free(X + x + 1, Y + y)) P(x + 1, y, "torch"); }
  for (let k = 0; k < 30; k++) { const i = Math.floor(random() * N), j = Math.floor(random() * N); if (inHeart(i, j)) continue; const [x, y] = cellTile(i, j); if (t.free(X + x, Y + y + 1)) P(x, y + 1, "bones", false, "Bones of someone who took a wrong turn"); }
  // The Heart: the Keeper of the Measure, a great sand-clock of stone, the hoard.
  const hcx = Math.round((hx0 + hx1) / 2), hcy = Math.round((hy0 + hy1) / 2);
  P(hcx, hy0 + 3, "obelisk", true, "The Measure: an obelisk notched from foot to tip"); P(hcx + 3, hy0 + 6, "chest", true, "The Keeper's hoard");
  for (const [x, y] of [[hx0 + 3, hy0 + 3], [hx1 - 3, hy0 + 3], [hx0 + 3, hy1 - 3], [hx1 - 3, hy1 - 3]] as const) { P(x, y, "statue", true, "A bird-headed scribe, its reed pen raised"); P(x + (x < hcx ? 2 : -2), y, "torch"); }
  for (const [x, y] of [[hx0 + 2, hcy - 4], [hx1 - 2, hcy + 4]] as const) P(x, y, "chest", true, "Labyrinth coffer");
  t.monster("keeper_of_the_measure", X + hcx, Y + hcy, 2);
  // What hunts the passages.
  const inMaze = (x: number, y: number) => tiles[idx(x, y)] === T.DUNGEON && t.free(x, y) && Math.hypot(x - X - hcx, y - Y - hcy) > 16;
  t.scatter(X, Y, X + S, Y + S, 10, (x, y) => t.monster("azhur_hound", x, y, 6), inMaze);
  t.scatter(X, Y, X + S, Y + S, 8, (x, y) => t.monster("grit_wraith", x, y, 4), inMaze);
  t.scatter(X, Y, X + S, Y + S, 6, (x, y) => t.monster("obsidian_scarab", x, y, 4), inMaze);
  // Coffers in some of the other dead ends.
  let coffers = 0;
  for (let c = 0; c < N * N && coffers < 8; c += 37) { const i = c % N, j = Math.floor(c / N); if (inHeart(i, j) || M.shrines.includes(c) || c === M.start || M.joined(c).length !== 1) continue; const [x, y] = cellTile(i, j); P(x + 1, y + 1, "chest", true, "Labyrinth coffer"); coffers++; }

  label("gate_of_azhur", AZHUR_GATE.x, G.y0 - 4); label("labyrinth_of_azhur", X + hcx, Y + hcy);
}

// ---------- The shrines and the Heart (kharaveth.ts lists these clues) ----------
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const shrine = (k: typeof AZHUR_KEYS[number]): Clue => ({
  options: () => ["Take-key", "Read"],
  examine: () => `${k.shrine}: an obelisk with a key hung on it by a bronze chain, glyphs round its foot.`,
  use: (game, _object, option) => {
    const p = game.player;
    if (option === "Read") return { text: `Round the shrine's foot, in Azhurak glyphs and a later hand under them: "${k.id === "measure" ? "What is kept is kept by measure." : k.id === "water" ? "What is paid is paid in water." : "What is named is never lost."}"` };
    if (has(p, k.item) || p.questData.az_heart) return { text: "The chain hangs empty now." };
    give(p, k.item, 1); p.questData[`az_key_${k.id}`] = 1; addXp(game, "mysteries", 600, { raw: true }); sound(game, "quest");
    return { text: `You lift the ${k.name} off its chain. It's heavier than a key should be.` };
  },
});
export const AZHUR_CLUES: Record<string, Clue> = {
  az_gate: {
    options: () => ["Enter", "Read"], examine: () => "The Gate of Azhur: two pillars and a lintel taller than a temple, a stair going down into the dark between them.",
    use: (_game, object, option) => option === "Read"
      ? { text: "Cut across the lintel, in Azhurak glyphs and a dynasty's translation beside them: \"Three keys keep the Heart: Measure, Water, the Name. They lie at the far ends of the way. Whoever finds the three will find the Heart; whoever finds the Heart will be measured.\"" }
      : { to: object.to, text: "You go down the long stair under the Gate of Azhur. The light goes before you're halfway." },
  },
  ...Object.fromEntries(AZHUR_KEYS.map(k => [`az_shrine_${k.id}`, shrine(k)])),
  az_heart_door: {
    options: () => ["Open"], examine: () => "The Heart's door: one slab of black bronze with three keyholes in a row, each under a glyph.",
    use: () => ({ text: "The Heart's door has three keyholes: Measure, Water, the Name." }),
  },
};
/** The Heart's door (the engine calls this before the clue): the three keys, turned once, and it knows you after. */
export function azhurDoor(game: Game, object: WorldObject, travel: (game: Game, to: { x: number; y: number }, text: string) => void): boolean {
  if (object.clue !== "az_heart_door") return false;
  const p = game.player;
  if (p.y < object.y) { travel(game, { x: object.x, y: object.y + 1 }, "You go back out through the Heart's door, into the labyrinth."); return true; }
  if (p.questData.az_heart) { travel(game, object.to!, "The Heart's door knows you, and opens."); return true; }
  const missing = AZHUR_KEYS.filter(k => !has(p, k.item));
  if (missing.length) { message(game, `The Heart's door has three keyholes. You're missing the ${missing.map(k => k.name).join(", ")}. They lie at the far ends of the labyrinth.`, "warn"); return true; }
  for (const k of AZHUR_KEYS) take(p, k.item, 1);
  p.questData.az_heart = 1; addXp(game, "mysteries", 4000, { raw: true }); sound(game, "quest");
  travel(game, object.to!, "You turn the three keys, one after another. The door opens on the Heart of the labyrinth.");
  return true;
}
