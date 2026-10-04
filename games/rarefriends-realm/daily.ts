/**
 * The daily streak and daily challenges. Days are UTC calendar days of the real clock, so everyone's day turns over at
 * the same moment; the three challenges are rolled from the day and your token, so yours are yours alone.
 *
 * Streak: claim once a day for a reward on a seven-day cycle (day 7 is the big one); miss a day and it starts again at 1.
 * Every full week you've kept up adds 25% to the coin rewards (up to +100%). Challenges: gain XP in two skills and defeat
 * some monsters today, each worth coins and a little XP, and all three open the daily chest.
 */
import { SKILL_NAMES, item, type Skill } from "./data.ts";
import { addXp, combatLevel, giveOrDrop, level, message, sound, type Game } from "./state.ts";

export const DAY_MS = 86_400_000;
export const dayNumber = (ms: number) => Math.floor(ms / DAY_MS);
export type Challenge = { kind: "xp"; skill: Skill; target: number } | { kind: "kills"; target: number } | { kind: "orders"; target: number };
export type Daily = {
  /** The last day you claimed a streak reward, your streak and your best. */
  day: number; streak: number; best: number;
  /** Today's challenges (the day they're for), what you had when they began, and which you've claimed. */
  challengeDay: number; challenges: Challenge[]; base: number[]; claimed: boolean[]; chest: boolean;
};
export const newDaily = (): Daily => ({ day: -1, streak: 0, best: 0, challengeDay: -1, challenges: [], base: [], claimed: [], chest: false });

export type Reward = { coins?: number; items?: [string, number][] };
/** The seven-day cycle. */
export const STREAK_REWARDS: readonly Reward[] = [
  { coins: 500 },
  { items: [["cake", 5]] },
  { coins: 1000 },
  { items: [["inkshark", 10]] },
  { coins: 2000 },
  { items: [["breeze_sigil", 100], ["tide_sigil", 100], ["stone_sigil", 100], ["ember_sigil", 100]] },
  { coins: 5000, items: [["insight_lamp", 1]] },
];
export const CHEST_REWARD: Reward = { coins: 1500, items: [["insight_lamp", 1]] };
/** The reward for a given streak day (1-based), with the weekly coin bonus. */
export function streakReward(streak: number): Reward {
  const base = STREAK_REWARDS[(Math.max(1, streak) - 1) % 7], weeks = Math.min(4, Math.floor((Math.max(1, streak) - 1) / 7));
  return { ...base, coins: base.coins ? Math.round(base.coins * (1 + weeks * 0.25)) : undefined };
}
export const rewardText = (reward: Reward) => [...(reward.coins ? [`${reward.coins.toLocaleString()} coins`] : []), ...(reward.items ?? []).map(([id, n]) => `${n > 1 ? `${n} × ` : ""}${item(id).name.toLowerCase()}`)].join(", ");
function grant(game: Game, reward: Reward) {
  if (reward.coins) giveOrDrop(game, "coins", reward.coins);
  for (const [id, n] of reward.items ?? []) giveOrDrop(game, id, n);
}

// ---------- The streak ----------
export type StreakStatus = { today: number; canClaim: boolean; streak: number; next: number; reward: Reward; reset: boolean };
/** Where your streak stands: whether today's reward is waiting, and what claiming would make your streak. */
export function streakStatus(game: Game, now: number): StreakStatus {
  const daily = game.player.daily, today = dayNumber(now), canClaim = daily.day !== today;
  const continues = daily.day === today - 1, next = canClaim ? (continues ? daily.streak + 1 : 1) : daily.streak;
  return { today, canClaim, streak: canClaim && !continues ? 0 : daily.streak, next, reward: streakReward(next), reset: canClaim && !continues && daily.streak > 0 };
}
export function claimStreak(game: Game, now: number) {
  const status = streakStatus(game, now), daily = game.player.daily;
  if (!status.canClaim) return false;
  daily.day = status.today; daily.streak = status.next; daily.best = Math.max(daily.best, daily.streak);
  grant(game, status.reward);
  message(game, `Day ${daily.streak} of your streak: ${rewardText(status.reward)}.${daily.streak % 7 === 0 ? " A full week!" : ""}`, "quest"); sound(game, "level");
  return true;
}

// ---------- Challenges ----------
export const hash = (n: number, salt: number) => { let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
/** Skills a challenge can ask for (ones anyone can train from the start). */
export const CHALLENGE_SKILLS: readonly Skill[] = ["woodcutting", "fishing", "mining", "cooking", "firemaking", "smithing", "crafting", "fletching", "thieving", "agility", "magic", "ranged", "prayer", "sigilcraft", "attack", "strength", "defence"];
/** XP to gain in a skill for a challenge, by your level in it when the day began. */
export const xpTarget = (skillLevel: number) => Math.round((300 + 3 * skillLevel * skillLevel) / 50) * 50;
const current = (game: Game, challenge: Challenge) => challenge.kind === "xp" ? game.player.xp[challenge.skill] : challenge.kind === "orders" ? (game.player.stats.orders ?? 0) : game.player.kills;
/** Start today's challenges if the day has turned over (call as often as you like). */
export function rollDaily(game: Game, now: number) {
  const daily = game.player.daily, today = dayNumber(now);
  if (daily.challengeDay === today) return false;
  const pool = [...CHALLENGE_SKILLS], picks: Skill[] = [], seed = today * 1_000_003 + game.player.friendId % 1_000_003;
  for (let i = 0; i < 2; i++) picks.push(pool.splice(Math.floor(hash(seed, i) * pool.length), 1)[0]);
  daily.challengeDay = today;
  const third: Challenge = hash(seed, 11) < 0.4 ? { kind: "orders", target: 1 + Math.floor(hash(seed, 12) * 2) } : { kind: "kills", target: 10 + Math.floor(hash(seed, 9) * 3) * 5 };
  daily.challenges = [...picks.map((skill): Challenge => ({ kind: "xp", skill, target: xpTarget(level(game, skill)) })), third];
  daily.base = daily.challenges.map(challenge => current(game, challenge));
  daily.claimed = daily.challenges.map(() => false); daily.chest = false;
  return true;
}
export const challengeText = (challenge: Challenge) => challenge.kind === "xp" ? `Gain ${challenge.target.toLocaleString()} ${SKILL_NAMES[challenge.skill]} XP` : challenge.kind === "orders" ? `Fill ${challenge.target} work order${challenge.target === 1 ? "" : "s"}` : `Defeat ${challenge.target} monsters`;
export function challengeProgress(game: Game, index: number) {
  const daily = game.player.daily, challenge = daily.challenges[index];
  return challenge ? Math.max(0, Math.min(challenge.target, Math.floor(current(game, challenge) - (daily.base[index] ?? 0)))) : 0;
}
export function challengeReward(game: Game, challenge: Challenge): Reward {
  const lvl = challenge.kind === "xp" ? level(game, challenge.skill) : combatLevel(game.player);
  return { coins: challenge.kind === "orders" ? 400 + challenge.target * 300 : 250 + lvl * 15 };
}
export function claimChallenge(game: Game, index: number) {
  const daily = game.player.daily, challenge = daily.challenges[index];
  if (!challenge || daily.claimed[index] || challengeProgress(game, index) < challenge.target) return false;
  daily.claimed[index] = true;
  const reward = challengeReward(game, challenge); grant(game, reward);
  if (challenge.kind === "xp") addXp(game, challenge.skill, Math.round(challenge.target * 0.1), { raw: true });
  message(game, `Daily challenge done: ${challengeText(challenge)}. ${rewardText(reward)}${challenge.kind === "xp" ? ` and ${Math.round(challenge.target * 0.1).toLocaleString()} bonus XP` : ""}.`, "quest"); sound(game, "coins");
  return true;
}
export function claimChest(game: Game) {
  const daily = game.player.daily;
  if (daily.chest || daily.claimed.length === 0 || !daily.claimed.every(Boolean)) return false;
  daily.chest = true; grant(game, CHEST_REWARD); game.player.stats.chests = (game.player.stats.chests ?? 0) + 1;
  message(game, `You open the daily chest: ${rewardText(CHEST_REWARD)}.`, "quest"); sound(game, "level");
  return true;
}
/** Anything waiting today: the streak reward, a finished challenge to claim, or the chest. */
export function dailyWaiting(game: Game, now: number) {
  const daily = game.player.daily;
  return streakStatus(game, now).canClaim || daily.challenges.some((challenge, i) => !daily.claimed[i] && challengeProgress(game, i) >= challenge.target)
    || (!daily.chest && daily.claimed.length > 0 && daily.claimed.every(Boolean));
}
/** A save's daily state, checked (anything odd starts fresh). */
export function cleanDaily(raw: unknown, skills: readonly string[]): Daily {
  const fresh = newDaily();
  if (!raw || typeof raw !== "object") return fresh;
  const r = raw as Record<string, unknown>, int = (v: unknown, min: number, max: number, d: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : d;
  const challenges = Array.isArray(r.challenges) ? r.challenges.slice(0, 3).flatMap((c): Challenge[] => {
    const e = c as Record<string, unknown>, target = int(e?.target, 1, 10_000_000, 0);
    if (!target) return [];
    if (e.kind === "xp" && typeof e.skill === "string" && skills.includes(e.skill)) return [{ kind: "xp", skill: e.skill as Skill, target }];
    return e.kind === "kills" ? [{ kind: "kills", target }] : e.kind === "orders" ? [{ kind: "orders", target }] : [];
  }) : [];
  const base = Array.isArray(r.base) ? r.base.slice(0, challenges.length).map(v => int(v, 0, 1e12, 0)) : [];
  const claimed = Array.isArray(r.claimed) ? r.claimed.slice(0, challenges.length).map(v => v === true) : [];
  if (base.length !== challenges.length || claimed.length !== challenges.length) return { ...fresh, day: int(r.day, -1, 1e7, -1), streak: int(r.streak, 0, 1e6, 0), best: int(r.best, 0, 1e6, 0) };
  return { day: int(r.day, -1, 1e7, -1), streak: int(r.streak, 0, 1e6, 0), best: int(r.best, 0, 1e6, 0), challengeDay: int(r.challengeDay, -1, 1e7, -1), challenges, base, claimed, chest: r.chest === true };
}
