/**
 * Fennick's Labyrinth (the Prismwild's south-east, prismworld.ts builds it): a hedge maze of crystal-thorn, 31 cells
 * square, that its maker, the Collegium's least respectable wizard, runs as a game. You pay nothing; you get eight
 * minutes. Every ring of the maze you reach closer to its heart pays mazeglass (the deeper, the more), the coffers
 * Fennick hides in its dead ends pay more, and the heart itself pays most and ends the run in triumph. What makes it his:
 * - The maze turns. Crystal doors stand in its passages, in two sets; every TURN ticks one set shuts and the other opens,
 *   so a way that was open is shut a moment later and a way round opens somewhere else. Read the doors, time them.
 * - Glyphs. Some of the dead ends have a sigil across their mouth: step on one and you're out by the edge again. (Only
 *   dead ends: a runner who keeps to the way on never crosses one.)
 * - The coffers move. Most of the other dead ends hold a coffer, and only a few are full on any run (they shine).
 * The maze itself (its passages, doors, glyphs, coffer spots) comes from one seed, the same for every player; the run's
 * own seed picks the full coffers. Nothing here pays without the walking that earns it, and a reload ends a run (the
 * runner is put back outside the gate) keeping what it paid.
 */
import { addXp, giveOrDrop, message, sound, type Game } from "./state.ts";
import { objectAtTile, type World, type WorldObject } from "./world.ts";

/** Where it stands: its north-west corner, how many cells across, and a cell's size in tiles (two of path, one of hedge). */
export const LABYRINTH = { x0: 1568, y0: 230, n: 31, cell: 3 } as const;
export const MAZE_SIZE = LABYRINTH.n * LABYRINTH.cell + 1;
/** The maze's rings, from the outermost (MAX_RING) in to the heart (0). */
const CENTRE = (LABYRINTH.n - 1) / 2;
export const MAX_RING = CENTRE;
/** A run's length, the doors' turn, and what the heart pays over its ring. */
export const RUN_TICKS = 800, TURN = 60, HEART_BONUS = 40;
/** The gate outside (where a run starts from and ends at), and the cell a run starts in (the middle of the south side). */
export const MAZE_GATE = { x: LABYRINTH.x0 + 1 + CENTRE * LABYRINTH.cell, y: LABYRINTH.y0 + MAZE_SIZE + 2 };
const ENTRY_CELL = { i: CENTRE, j: LABYRINTH.n - 1 };

export type MazeRun = { start: number; until: number; deepest: number; seed: number; taken: number[]; glass: number; warned: number; glyphAt: number };
export type LabyrinthRecord = { best: number; runs: number; hearts: number; glass: number };
export const newLabyrinth = (): LabyrinthRecord => ({ best: MAX_RING + 1, runs: 0, hearts: 0, glass: 0 });
export function cleanLabyrinth(raw: unknown): LabyrinthRecord {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof LabyrinthRecord, unknown>>;
  const int = (v: unknown, lo: number, hi: number, d: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d;
  return { best: int(r.best, 0, MAX_RING + 1, MAX_RING + 1), runs: int(r.runs, 0, 1e6, 0), hearts: int(r.hearts, 0, 1e6, 0), glass: int(r.glass, 0, 1e9, 0) };
}

// ---------- The layout ----------
export type MazeLayout = {
  /** Passages: for each cell, whether it opens east and south (index cell * 2 + 0 east, + 1 south). */
  open: Uint8Array;
  /** Doors: passage index → set 0 or 1 (a door passage is one tile wide, and opens with its set). */
  doors: Map<number, 0 | 1>;
  /** The tiles with a trap glyph (across a dead end's mouth), and the dead ends a coffer stands in. */
  glyphs: { x: number; y: number }[]; coffers: number[];
};
function rng(seed: number) { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const ringOf = (i: number, j: number) => Math.max(Math.abs(i - CENTRE), Math.abs(j - CENTRE));
const inHeart = (i: number, j: number) => ringOf(i, j) <= 1;
let layoutCache: MazeLayout | null = null;
/** The maze: a passage tree grown from the heart (every cell reachable), loops cut through it as doors, glyphs and coffers. */
export function mazeLayout(): MazeLayout {
  if (layoutCache) return layoutCache;
  const N = LABYRINTH.n, random = rng(70111), open = new Uint8Array(N * N * 2), seen = new Uint8Array(N * N);
  const edge = (a: number, b: number) => { const [lo, hi] = a < b ? [a, b] : [b, a]; return hi - lo === 1 ? lo * 2 : lo * 2 + 1; };
  const near = (c: number) => { const i = c % N, j = Math.floor(c / N), out: number[] = []; if (i > 0) out.push(c - 1); if (i < N - 1) out.push(c + 1); if (j > 0) out.push(c - N); if (j < N - 1) out.push(c + N); return out; };
  // The heart: nine cells open into one chamber.
  for (let j = CENTRE - 1; j <= CENTRE + 1; j++) for (let i = CENTRE - 1; i <= CENTRE + 1; i++) { const c = j * N + i; seen[c] = 1; if (i < CENTRE + 1) open[c * 2] = 1; if (j < CENTRE + 1) open[c * 2 + 1] = 1; }
  // The tree, grown outward from the heart (a long-corridored backtracker: it prefers going on to turning).
  const stack = [CENTRE * N + CENTRE + 2]; seen[stack[0]] = 1; open[edge(stack[0], stack[0] - 1)] = 1;
  let last = -1;
  while (stack.length) {
    const c = stack[stack.length - 1], ways = near(c).filter(d => !seen[d]);
    if (!ways.length) { stack.pop(); last = -1; continue; }
    const straight = last >= 0 ? ways.find(d => d - c === last) : undefined, next = straight !== undefined && random() < 0.55 ? straight : ways[Math.floor(random() * ways.length)];
    open[edge(c, next)] = 1; seen[next] = 1; last = next - c; stack.push(next);
  }
  // Doors: about half the passages that cross from one ring to the next, and loops cut through the hedge between rings.
  const doors = new Map<number, 0 | 1>();
  for (let c = 0; c < N * N; c++) for (const d of near(c)) {
    if (d < c) continue;
    const a = [c % N, Math.floor(c / N)] as const, b = [d % N, Math.floor(d / N)] as const, e = edge(c, d);
    if (inHeart(...a) && inHeart(...b)) continue;
    if (ringOf(...a) === ringOf(...b)) continue;
    if (open[e] ? random() < 0.5 : random() < 0.22) { open[e] = 1; doors.set(e, random() < 0.5 ? 0 : 1); }
  }
  // The dead ends (one way in): about one in four has a glyph across its mouth, and the rest a coffer.
  const ways = (c: number) => near(c).filter(d => open[edge(c, d)]);
  const glyphs: { x: number; y: number }[] = [], coffers: number[] = [];
  for (let c = 0; c < N * N; c++) {
    const i = c % N, j = Math.floor(c / N), ring = ringOf(i, j), w = ways(c);
    if ((i === ENTRY_CELL.i && j === ENTRY_CELL.j) || w.length !== 1 || ring <= 1) continue;
    if (ring >= 3 && random() < 0.25) {
      const { x, y } = cellTile(i, j), d = w[0] - c;
      glyphs.push(...(d === 1 ? [{ x: x + 1, y }, { x: x + 1, y: y + 1 }] : d === -1 ? [{ x, y }, { x, y: y + 1 }] : d === N ? [{ x, y: y + 1 }, { x: x + 1, y: y + 1 }] : [{ x, y }, { x: x + 1, y }]));
    } else coffers.push(c);
  }
  return layoutCache = { open, doors, glyphs, coffers };
}
/** A cell's two-by-two of path, its top-left tile. */
export const cellTile = (i: number, j: number) => ({ x: LABYRINTH.x0 + 1 + i * LABYRINTH.cell, y: LABYRINTH.y0 + 1 + j * LABYRINTH.cell });
/** Which cell a tile is in (null on a hedge line, or outside). */
export function cellAt(x: number, y: number) {
  const dx = x - LABYRINTH.x0, dy = y - LABYRINTH.y0;
  if (dx <= 0 || dy <= 0 || dx >= MAZE_SIZE - 1 || dy >= MAZE_SIZE - 1) return null;
  const i = Math.floor(dx / LABYRINTH.cell), j = Math.floor(dy / LABYRINTH.cell);
  return { i, j };
}
export const inLabyrinth = (x: number, y: number) => x >= LABYRINTH.x0 && y >= LABYRINTH.y0 && x < LABYRINTH.x0 + MAZE_SIZE && y < LABYRINTH.y0 + MAZE_SIZE;
/** The ring a tile is in (a hedge line counts with the cell before it), or null outside the maze. */
export function ringAt(x: number, y: number) {
  if (!inLabyrinth(x, y)) return null;
  const i = Math.min(LABYRINTH.n - 1, Math.max(0, Math.floor((x - LABYRINTH.x0 - 1) / LABYRINTH.cell))), j = Math.min(LABYRINTH.n - 1, Math.max(0, Math.floor((y - LABYRINTH.y0 - 1) / LABYRINTH.cell)));
  return ringOf(i, j);
}

/**
 * The maze on the ground (prismworld.ts calls it): hedge everywhere, the cells and their open passages carved out, each
 * door passage one tile wide with its crystal door, the glyphs on the floor, a coffer in every dead end, and the heart's
 * hourglass. `wall`/`floor` paint a tile; `door`, `glyph`, `coffer` and `heart` place things.
 */
export function layLabyrinth(paint: { wall: (x: number, y: number) => void; floor: (x: number, y: number) => void; door: (x: number, y: number, set: 0 | 1) => void; glyph: (x: number, y: number) => void; coffer: (x: number, y: number) => void; heart: (x: number, y: number) => void }) {
  const { x0, y0, n: N } = LABYRINTH, L = mazeLayout();
  for (let y = y0; y < y0 + MAZE_SIZE; y++) for (let x = x0; x < x0 + MAZE_SIZE; x++) paint.wall(x, y);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const { x, y } = cellTile(i, j), c = j * N + i;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) paint.floor(x + dx, y + dy);
    // East: the hedge column after the cell; south: the hedge row under it (a door passage keeps one tile of hedge).
    for (const [e, horizontal] of [[c * 2, true], [c * 2 + 1, false]] as const) {
      if (!L.open[e]) continue;
      const set = L.doors.get(e);
      const a = horizontal ? { x: x + 2, y } : { x, y: y + 2 }, b = horizontal ? { x: x + 2, y: y + 1 } : { x: x + 1, y: y + 2 };
      if (set === undefined) { paint.floor(a.x, a.y); paint.floor(b.x, b.y); }
      else { paint.floor(a.x, a.y); paint.door(a.x, a.y, set); }
      // (In the heart, the hedge posts between its cells go too: one open chamber.)
      if (inHeart(i, j) && inHeart(i + 1, j + 1) && horizontal) paint.floor(x + 2, y + 2);
    }
  }
  for (const g of L.glyphs) paint.glyph(g.x, g.y);
  for (const c of L.coffers) { const { x, y } = cellTile(c % N, Math.floor(c / N)); paint.coffer(x, y); }
  const h = cellTile(CENTRE, CENTRE); paint.heart(h.x, h.y);
}

// ---------- The run ----------
/** Which set of doors is open now (the maze turns every TURN ticks, for everyone alike). */
export const openSet = (game: Game) => (Math.floor(game.tick / TURN) % 2) as 0 | 1;
const doorSet = (object: WorldObject) => object.clue === "maze_door_b" ? 1 : 0;
export const mazeDoorOpen = (game: Game, object: WorldObject) => doorSet(object) === openSet(game);
/** The coffers full on a run: eight of them, the run's seed choosing. */
export function fullCoffers(run: MazeRun) {
  const L = mazeLayout(), random = rng(run.seed), spots = [...L.coffers];
  for (let k = spots.length - 1; k > 0; k--) { const m = Math.floor(random() * (k + 1)); [spots[k], spots[m]] = [spots[m], spots[k]]; }
  return spots.slice(0, 8);
}
const cofferCell = (object: WorldObject) => { const c = cellAt(object.x, object.y); return c ? c.j * LABYRINTH.n + c.i : -1; };
export const cofferLit = (game: Game, object: WorldObject) => { const run = game.player.maze; if (!run) return false; const c = cofferCell(object); return fullCoffers(run).includes(c) && !run.taken.includes(c); };
/** What a ring pays on first reaching it in a run (the outer ring nothing, the heart most). */
export const ringPay = (ring: number) => MAX_RING + 1 - ring;
const pay = (game: Game, n: number) => { const run = game.player.maze!; run.glass += n; game.player.labyrinth.glass += n; giveOrDrop(game, "mazeglass", n); };

type Travel = (game: Game, to: { x: number; y: number }, text: string) => void;
/** A move for talk (Fennick starts a run from his dialogue, where the engine's own travel isn't to hand): everything stopped, you're there. */
export const mazeJump: Travel = (game, to, text) => {
  const p = game.player; p.path = []; p.target = null; p.activity = null; p.combat = null;
  p.prev = { x: to.x, y: to.y }; p.x = to.x; p.y = to.y; p.moved = game.tick - 10; game.trail = [];
  for (const monster of game.monsters) monster.target = false;
  if (text) message(game, text);
};
/** Start a run: into the south cell, the clock going. Fennick's own dialogue calls it (prismtalk.ts). */
export function startMazeRun(game: Game, travel: Travel) {
  const player = game.player;
  if (player.maze) return "You're in the maze already.";
  if (player.aboard !== null || player.mount) return "On foot, please. Fennick won't have anything bigger than you in his hedges.";
  const { x, y } = cellTile(ENTRY_CELL.i, ENTRY_CELL.j);
  player.maze = { start: game.tick, until: game.tick + RUN_TICKS, deepest: MAX_RING, seed: Math.floor(game.rng() * 2 ** 31), taken: [], glass: 0, warned: RUN_TICKS, glyphAt: -1 };
  travel(game, { x, y }, "The hedge closes behind you. Somewhere above, an hourglass turns over. Eight minutes.");
  sound(game, "teleport");
  return null;
}
export function endMazeRun(game: Game, travel: Travel, why: "time" | "heart" | "thread") {
  const player = game.player, run = player.maze;
  if (!run) return;
  const record = player.labyrinth;
  record.runs++; record.best = Math.min(record.best, run.deepest); if (why === "heart") record.hearts++;
  player.maze = null;
  const depth = MAX_RING - run.deepest;
  const said = why === "heart" ? `The heart! The hourglass bursts into light, and Fennick is clapping somewhere. ${run.glass} mazeglass this run.`
    : why === "time" ? `The hourglass runs out, and the hedge lets go of you. You reached ring ${depth} of ${MAX_RING}, and earned ${run.glass} mazeglass.`
    : `You pull Fennick's thread and it pulls you out. You reached ring ${depth} of ${MAX_RING}, and earned ${run.glass} mazeglass.`;
  travel(game, MAZE_GATE, said);
}
/** Each tick: rings reached, glyphs stepped on, the turns and the time; and a runner without a run (after a reload) put outside. */
export function labyrinthTick(game: Game, world: World, travel: Travel) {
  const player = game.player, run = player.maze;
  if (!run) { if (inLabyrinth(player.x, player.y)) travel(game, MAZE_GATE, "The maze has no runner by that name. The hedge puts you outside."); return; }
  if (!inLabyrinth(player.x, player.y)) { player.maze = null; return; }
  const ring = ringAt(player.x, player.y);
  if (ring !== null && ring < run.deepest) {
    let earned = 0; for (let r = run.deepest - 1; r >= ring; r--) earned += ringPay(r);
    run.deepest = ring; pay(game, earned); addXp(game, "agility", 40 * earned, { raw: true });
    if (ring === 0) { pay(game, HEART_BONUS); addXp(game, "magic", 2500, { raw: true }); endMazeRun(game, travel, "heart"); return; }
    message(game, `Ring ${MAX_RING - ring} of ${MAX_RING}: ${earned} mazeglass.`, "info"); sound(game, "coins");
  }
  // A glyph underfoot sends you out to the edge.
  const here = objectAtTile(world, player.x, player.y), at = player.y * 100000 + player.x;
  if (here?.clue === "maze_glyph" && run.glyphAt !== at) {
    const N = LABYRINTH.n, random = rng(run.seed + game.tick), side = Math.floor(random() * 4), k = Math.floor(random() * N);
    const [i, j] = side === 0 ? [k, 0] : side === 1 ? [N - 1, k] : side === 2 ? [k, N - 1] : [0, k], to = cellTile(i, j);
    run.glyphAt = to.y * 100000 + to.x;
    travel(game, to, "A glyph flares under your boot. Laughter from everywhere, and you're somewhere else: right out by the edge.");
    return;
  }
  if (run.glyphAt !== at) run.glyphAt = -1;
  const left = run.until - game.tick;
  if (game.tick > run.start && (game.tick % TURN) === 0) { message(game, "The maze turns: doors shut, and others open.", "info"); sound(game, "click"); }
  for (const [mark, text] of [[300, "Three minutes left."], [100, "One minute left."], [33, "Twenty seconds!"]] as const) if (left <= mark && run.warned > mark) { run.warned = mark; message(game, text, "warn"); }
  if (left <= 0) endMazeRun(game, travel, "time");
}

// ---------- The things in it ----------
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
/** A door's two sides (it stands in a one-tile gap of hedge: east-west or north-south), and the far one from you. */
function through(game: Game, object: WorldObject) {
  const floor = (x: number, y: number) => !!cellAt(x, y) && (x - LABYRINTH.x0) % LABYRINTH.cell !== 0 && (y - LABYRINTH.y0) % LABYRINTH.cell !== 0;
  const ew = floor(object.x - 1, object.y) && floor(object.x + 1, object.y);
  const p = game.player;
  return ew ? { x: p.x < object.x ? object.x + 1 : object.x - 1, y: object.y } : { x: object.x, y: p.y < object.y ? object.y + 1 : object.y - 1 };
}
const door: Clue = {
  options: (game, object) => mazeDoorOpen(game, object) ? ["Pass"] : ["Inspect"],
  examine: (game, object) => mazeDoorOpen(game, object) ? "A crystal door, standing open. It hums. It won't stay open." : "A crystal door, shut, humming. When the maze turns, it will open again.",
  use: (game, object) => {
    if (!mazeDoorOpen(game, object)) return { text: "Shut fast. It hums, and it will turn: the maze turns every half minute or so." };
    return { to: through(game, object), text: "" };
  },
};
export const LABYRINTH_CLUES: Record<string, Clue> = {
  maze_door_a: door, maze_door_b: door,
  maze_glyph: { options: () => ["Inspect"], examine: () => "A glyph on the floor, faintly lit. Fennick's handwriting, and he's laughing in it.", use: () => ({ text: "Better stepped round than on." }) },
  maze_coffer: {
    options: () => ["Search"],
    examine: game => game.player.maze ? "One of Fennick's coffers. The full ones shine." : "A coffer, locked. They open only for a runner.",
    use: (game, object) => {
      const run = game.player.maze, c = cofferCell(object);
      if (!run) return { text: "Shut fast. Fennick's coffers open only for someone running his maze." };
      if (run.taken.includes(c)) return { text: "You've emptied this one." };
      if (!fullCoffers(run).includes(c)) return { text: "Empty. Fennick moves the full ones about between runs: the full ones shine." };
      run.taken.push(c);
      const ring = ringAt(object.x, object.y) ?? MAX_RING, n = 4 + Math.round((MAX_RING - ring) * 0.6) + Math.floor(game.rng() * 4);
      pay(game, n); addXp(game, "magic", 60 * n, { raw: true }); sound(game, "rare");
      if (game.rng() < 0.3) { const sigil = (["breeze_sigil", "tide_sigil", "stone_sigil", "ember_sigil", "thought_sigil"] as const)[Math.floor(game.rng() * 5)]; giveOrDrop(game, sigil, 25); }
      return { text: `The coffer springs open: ${n} mazeglass, warm from the dark.` };
    },
  },
  maze_thread: {
    // (Pulling it ends the run: the engine does that, as it moves you.)
    options: game => game.player.maze ? ["Pull"] : ["Inspect"],
    examine: () => "Fennick's thread, tied off at the south gate: pull it and it pulls you out.",
    use: () => ({ text: "A silver thread, tied off. It's for runners." }),
  },
  maze_heart: { options: () => ["Inspect"], examine: () => "Fennick's hourglass, as tall as a door, its sand running upward.", use: () => ({ text: "The sand runs up. Fennick says it's the right way and everyone else's is wrong." }) },
};
