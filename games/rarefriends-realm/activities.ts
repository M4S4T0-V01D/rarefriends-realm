/**
 * Activities: skill challenges set by the Realm's people, run on the game's own mechanics (the Skill overhaul's
 * activity framework). One table of definitions (ACTIVITIES); one run at a time (player.activities.run), started by
 * talking to its host, judged by what the engine reports as you play (every rock mined, every bar smelted, every
 * tile walked, a death) through `activityEvent`, timed by the tick (`activityTick`), scored when its goal is met, paid
 * once, and remembered (player.activities.records: times done, the best score, when last run) so a cooldown holds
 * and a best stands. A run that times out, that you die in, or that you cancel is a failure: nothing paid, the
 * cooldown shortened, try again. Nothing here hands out a reward without the actions that earn it, and a reload
 * changes nothing (the run and the records are saved with the rest).
 *
 * The activities: the Quarry Call (Mining: the quarrymaster calls a rock and a count, and the quarry's faces have to
 * give it up in time), the Assay Run (Smithing: the assayer wants a metal's bars from the guild furnaces, and counts
 * the failures), the Hot Tunnel (an expedition: down the Ashen shaft, the gem rock at the tunnel's end, and back up
 * alive), and the Pass Run (Wayfaring: the lower lodge to Frostpeak's square on foot, against the clock).
 */
import { METALS, ROCKS, SKILL_NAMES, SMELTING, WAYFARER_MARK, item, type Skill } from "./data.ts";
import { addXp, give, giveOrDrop, level, message, sound, type Game } from "./state.ts";
import { regionAt } from "./world.ts";
import { GUILD_FURNACE } from "./hearthkinnames.ts";

export type ActivityEvent =
  | { kind: "mine"; rock: string; x: number; y: number }
  | { kind: "produce"; station: string | null; metal: string | null; failed: boolean }
  | { kind: "death" };
export type ActivityRun = { id: string; startedAt: number; until: number; target: Record<string, number | string>; progress: number; failed: number; marks: Record<string, number> };
export type ActivityRecord = { done: number; best: number; lastAt: number };
export type Activities = { run: ActivityRun | null; records: Record<string, ActivityRecord> };
export const newActivities = (): Activities => ({ run: null, records: {} });

export type ActivityDef = {
  id: string; name: string; skill: Skill; host: string;
  /** What it takes to start: a level, and what to carry. */
  requires: { level: number; items?: readonly [string, number][] };
  /** Ticks allowed, and ticks between runs (a failed run shortens the wait to a third). */
  limit: number; cooldown: number;
  /** The target rolled at the start (the rock, the metal, the count), and the brief in the host's words. */
  roll: (game: Game) => Record<string, number | string>;
  brief: (game: Game, target: Record<string, number | string>) => string;
  /** How far a run has come (0 to 1) given what the engine has reported; a run is scored when it reaches 1. */
  goal: (game: Game, run: ActivityRun) => number;
  /** Where a run stands, in words (the host's status). */
  status: (game: Game, run: ActivityRun) => string;
  /** The score (0 to 1) of a finished run: time left, cleanliness. */
  score: (game: Game, run: ActivityRun) => number;
  /** What a finished run pays, by its score, and what the host promises. */
  reward: (game: Game, run: ActivityRun, score: number) => string;
  promise: string;
};

const timeLeft = (game: Game, run: ActivityRun) => Math.max(0, run.until - game.tick) / Math.max(1, run.until - run.startedAt);
const n = (v: number | string | undefined) => typeof v === "number" ? v : Number(v ?? 0);
const QUARRY_ROCKS = ["pewter", "blackiron", "inkcoal", "moonsilver"] as const;

export const ACTIVITIES: Record<string, ActivityDef> = {
  quarry_call: {
    id: "quarry_call", name: "The Quarry Call", skill: "mining", host: "quarry_master", requires: { level: 10 }, limit: 900, cooldown: 2400,
    roll: game => { const mining = level(game, "mining"), kinds = QUARRY_ROCKS.filter(kind => ROCKS[kind].level <= mining), rock = kinds[Math.floor(game.rng() * kinds.length)] ?? "pewter"; return { rock, count: rock === "moonsilver" ? 4 : rock === "inkcoal" ? 6 : 10 }; },
    brief: (_game, target) => `The carts want ${target.count} ${ROCKS[target.rock as keyof typeof ROCKS].name.toLowerCase()} out of the quarry's own faces, and they want it before the whistle: nine minutes, by the chapel's count. Only the quarry's rock counts.`,
    goal: (_game, run) => Math.min(1, run.progress / n(run.target.count)),
    status: (_game, run) => `${run.progress} of ${run.target.count} ${ROCKS[run.target.rock as keyof typeof ROCKS].name.toLowerCase()} so far.`,
    score: (game, run) => 0.5 + 0.5 * timeLeft(game, run),
    reward: (game, run, score) => { const xp = Math.round(ROCKS[run.target.rock as keyof typeof ROCKS].xp * n(run.target.count) * (0.6 + score)), coins = Math.round(40 * n(run.target.count) * score); addXp(game, "mining", xp, { raw: true }); give(game.player, "coins", coins); return `${xp} Mining XP and ${coins} coins`; },
    promise: "Mining XP on top of the rock's own, and quarry pay, the quicker the better.",
  },
  assay_run: {
    id: "assay_run", name: "The Assay Run", skill: "smithing", host: "fellows_assayer", requires: { level: 20 }, limit: 600, cooldown: 2400,
    roll: game => { const smithing = level(game, "smithing"), metals = METALS.filter(m => m.tier <= 6 && SMELTING[m.id].level <= smithing), metal = metals[metals.length - 1] ?? METALS[0]; return { metal: metal.id, count: metal.tier >= 4 ? 4 : 8 }; },
    brief: (_game, target) => `${target.count} bars of ${item(`${target.metal}_bar`).name.replace(" bar", "").toLowerCase()} from the guild furnaces, in six minutes, and I'm counting the ones you lose to the fire. Bring your own ore.`,
    goal: (_game, run) => Math.min(1, run.progress / n(run.target.count)),
    status: (_game, run) => `${run.progress} of ${run.target.count} bars, ${run.failed} lost to the fire.`,
    score: (game, run) => Math.max(0.2, (run.progress / Math.max(1, run.progress + run.failed)) * (0.6 + 0.4 * timeLeft(game, run))),
    reward: (game, run, score) => { const smelt = SMELTING[run.target.metal as keyof typeof SMELTING], xp = Math.round(smelt.xp * n(run.target.count) * (0.8 + score)), coins = Math.round(METALS.find(m => m.id === run.target.metal)!.value * n(run.target.count) * 0.4 * score); addXp(game, "smithing", xp, { raw: true }); give(game.player, "coins", coins); return `${xp} Smithing XP and ${coins} coins`; },
    promise: "Smithing XP over the furnace's own, and the Fellows' rate for a clean run.",
  },
  hot_tunnel: {
    id: "hot_tunnel", name: "The Hot Tunnel", skill: "mining", host: "quarry_master", requires: { level: 40, items: [["cooked_meat", 1]] }, limit: 1500, cooldown: 4800,
    roll: () => ({ gem: 1 }),
    brief: () => "Down the shaft, through the hot tunnel, the gem rock at the far end: mine it, and come back up to the quarry on your own feet, in a quarter of an hour. Eat something first; I'll not send anyone down hungry. Die down there and it's off.",
    goal: (game, run) => (run.marks.gem ? 0.5 : 0) + (run.marks.gem && regionAt(game.world, game.player.x, game.player.y).id === "ashen_hills" ? 0.5 : 0),
    status: (_game, run) => run.marks.gem ? "The gem rock's mined. Now back up, alive." : "Not yet at the gem rock.",
    score: (game, run) => 0.5 + 0.5 * timeLeft(game, run),
    reward: (game, _run, score) => { const xp = Math.round(1500 * (0.5 + score)); addXp(game, "mining", xp, { raw: true }); giveOrDrop(game, "rough_moonstone", 1); give(game.player, "coins", Math.round(600 * score)); return `${xp} Mining XP, a rough moonstone and ${Math.round(600 * score)} coins`; },
    promise: "Mining XP, a rough moonstone of the quarry's, and danger money.",
  },
  pass_run: {
    id: "pass_run", name: "The Pass Run", skill: "agility", host: "camp_warden", requires: { level: 20 }, limit: 420, cooldown: 2400,
    roll: () => ({ square: 1 }),
    brief: () => "From this door to Frostpeak's square, on your own feet, inside four minutes. The switchbacks or the ridge, your choice; no glides, no tablets, no sitting on a horse. I'll know.",
    goal: (game, run) => { const square = game.world.places.frostpeak; return Math.hypot(game.player.x - square.x, game.player.y - square.y) <= 3 && !run.marks.jumped ? 1 : 0; },
    status: (game, _run) => { const square = game.world.places.frostpeak; return `${Math.round(Math.hypot(game.player.x - square.x, game.player.y - square.y))} tiles from the square.`; },
    score: (game, run) => 0.4 + 0.6 * timeLeft(game, run),
    reward: (game, _run, score) => { const xp = Math.round(900 * (0.5 + score)); addXp(game, "agility", xp, { raw: true }); if (score > 0.7) giveOrDrop(game, WAYFARER_MARK, 1); return `${xp} Wayfaring XP${score > 0.7 ? " and a Wayfarer's mark" : ""}`; },
    promise: "Wayfaring XP, and a Wayfarer's mark for a fast one.",
  },
};
/** The activities each host sets. */
export const ACTIVITY_HOSTS: Record<string, string[]> = Object.values(ACTIVITIES).reduce((out, def) => { (out[def.host] ??= []).push(def.id); return out; }, {} as Record<string, string[]>);

const FAILED_COOLDOWN = 1 / 3;
export const activityRecord = (game: Game, id: string): ActivityRecord => game.player.activities.records[id] ?? { done: 0, best: 0, lastAt: -1e9 };
/** Why an activity can't start now, or null. */
export function activityProblem(game: Game, id: string): string | null {
  const def = ACTIVITIES[id], player = game.player, record = activityRecord(game, id);
  if (player.activities.run) return player.activities.run.id === id ? "You're on it already." : `You're on ${ACTIVITIES[player.activities.run.id].name} already. Finish that, or give it up.`;
  if (level(game, def.skill) < def.requires.level) return `You need a ${SKILL_NAMES[def.skill]} level of ${def.requires.level} for that.`;
  for (const [itemId, count] of def.requires.items ?? []) if (player.inventory.reduce((sum, slot) => sum + (slot?.id === itemId ? slot.n : 0), 0) < count) return `Bring ${count} ${item(itemId).name.toLowerCase()} first.`;
  const wait = record.lastAt + def.cooldown - game.tick;
  if (wait > 0) return `Not yet: ${Math.ceil(wait / 100)} minutes, by the chapel's count.`;
  return null;
}
/** Start a run: the target rolled, the clock set. */
export function startActivity(game: Game, id: string, target = ACTIVITIES[id].roll(game)): boolean {
  const problem = activityProblem(game, id); if (problem) { message(game, problem, "warn"); return false; }
  const def = ACTIVITIES[id];
  game.player.activities.run = { id, startedAt: game.tick, until: game.tick + def.limit, target, progress: 0, failed: 0, marks: {} };
  message(game, `${def.name}. ${def.brief(game, target)}`, "quest"); sound(game, "quest");
  return true;
}
/** Give a run up (it counts as a failure: a shorter wait, nothing paid). */
export function cancelActivity(game: Game, why = "You give it up.") {
  const run = game.player.activities.run; if (!run) return;
  const record = activityRecord(game, run.id);
  game.player.activities.records[run.id] = { ...record, lastAt: game.tick - Math.round(ACTIVITIES[run.id].cooldown * (1 - FAILED_COOLDOWN)) };
  game.player.activities.run = null;
  message(game, `${ACTIVITIES[run.id].name}. ${why}`, "warn");
}
function finishActivity(game: Game) {
  const run = game.player.activities.run!, def = ACTIVITIES[run.id], score = Math.max(0, Math.min(1, def.score(game, run))), record = activityRecord(game, run.id);
  game.player.activities.run = null;
  const paid = def.reward(game, run, score), best = score > record.best;
  game.player.activities.records[run.id] = { done: record.done + 1, best: Math.max(record.best, score), lastAt: game.tick };
  game.player.stats.activities = (game.player.stats.activities ?? 0) + 1;
  message(game, `${def.name} done${best ? ", your best yet" : ""} (${Math.round(score * 100)}%): ${paid}.`, "quest"); sound(game, "quest");
}
/** What the engine reports as you play: the run advances, and finishes when its goal is met. */
export function activityEvent(game: Game, event: ActivityEvent) {
  const run = game.player.activities.run; if (!run) return;
  const def = ACTIVITIES[run.id];
  if (event.kind === "death") { cancelActivity(game, "You fell. Nothing's paid for that."); return; }
  if (run.id === "quarry_call" && event.kind === "mine" && event.rock === run.target.rock && regionAt(game.world, event.x, event.y).id === "ashen_hills") { run.progress++; if (run.progress < n(run.target.count)) message(game, `${def.name}. ${def.status(game, run)}`); }
  if (run.id === "assay_run" && event.kind === "produce" && event.station === GUILD_FURNACE && event.metal === run.target.metal) { if (event.failed) run.failed++; else run.progress++; }
  if (run.id === "hot_tunnel" && event.kind === "mine" && event.rock === "gem" && regionAt(game.world, event.x, event.y).id === "ashen_shaft" && !run.marks.gem) { run.marks.gem = 1; message(game, `${def.name}. ${def.status(game, run)}`, "quest"); }
  if (def.goal(game, run) >= 1) finishActivity(game);
}
/** Every tick: the clock, the places that count (the pass run's end; a jump that isn't running), and the finish. */
export function activityTick(game: Game) {
  const run = game.player.activities.run; if (!run) return;
  const def = ACTIVITIES[run.id], player = game.player;
  if (run.id === "pass_run") {
    const last = run.marks.lastX !== undefined ? { x: run.marks.lastX, y: run.marks.lastY } : null;
    if (last && Math.hypot(player.x - last.x, player.y - last.y) > 3) { run.marks.jumped = 1; cancelActivity(game, "That wasn't running. Tove saw."); return; }
    run.marks.lastX = player.x; run.marks.lastY = player.y;
  }
  if (game.tick >= run.until) { cancelActivity(game, "Time's up."); return; }
  if (def.goal(game, run) >= 1) finishActivity(game);
}
/** The save's shape, checked (a run older than its own limit is dropped; records are kept as numbers). */
export function cleanActivities(raw: unknown, tick: number): Activities {
  const out = newActivities(); if (!raw || typeof raw !== "object") return out;
  const o = raw as { run?: unknown; records?: unknown }, num = (v: unknown, lo: number, hi: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : fallback;
  if (o.records && typeof o.records === "object") for (const [id, r] of Object.entries(o.records as Record<string, Record<string, unknown>>)) if (ACTIVITIES[id] && r && typeof r === "object") out.records[id] = { done: num(r.done, 0, 1e6, 0), best: num(r.best, 0, 1, 0), lastAt: num(r.lastAt, -1e9, 1e9, -1e9) };
  const run = o.run as Record<string, unknown> | null | undefined;
  if (run && typeof run === "object" && typeof run.id === "string" && ACTIVITIES[run.id] && typeof run.target === "object" && run.target) {
    const r: ActivityRun = { id: run.id, startedAt: num(run.startedAt, 0, 1e9, tick), until: num(run.until, 0, 1e9, tick), target: { ...(run.target as Record<string, number | string>) }, progress: num(run.progress, 0, 1e6, 0), failed: num(run.failed, 0, 1e6, 0), marks: {} };
    if (run.marks && typeof run.marks === "object") for (const [k, v] of Object.entries(run.marks as Record<string, unknown>)) if (typeof v === "number") r.marks[k] = v;
    if (r.until > tick) out.run = r;
  }
  return out;
}
