/**
 * Slayer: the Warden hands out tasks (kill so many of a creature), each kill on task gives Slayer XP equal to the
 * creature's hitpoints, and a finished task pays Slayer points to spend on her rewards. Some creatures can only be
 * wounded by a Slayer of high enough level. State lives in the player's quest data, so it saves with everything else.
 */
import { MONSTERS, SLAYER_REWARDS, SLAYER_TASKS, type SlayerTask } from "./data.ts";
import { addXp, combatLevel, giveOrDrop, level, message, sound, type Game } from "./state.ts";

const data = (game: Game, key: string) => game.player.questData[key] ?? 0;
/** Your current task, or null. */
export function currentTask(game: Game): SlayerTask | null {
  const index = data(game, "slayer_task") - 1;
  return index >= 0 && data(game, "slayer_left") > 0 ? SLAYER_TASKS[index] ?? null : null;
}
export const slayerPoints = (game: Game) => data(game, "slayer_points");
export const slayerStreak = (game: Game) => data(game, "slayer_streak");
export function onTask(game: Game, monsterId: string) { return !!currentTask(game)?.monsters.some(id => id === monsterId); }
/** The Warden's helm: +15% accuracy and damage on task. */
export function slayerBoost(game: Game, monsterId: string) { return game.player.equipment.head === "slayer_helm" && onTask(game, monsterId) ? 1.15 : 1; }
/** Can you wound this creature at your Slayer level? A message if not. */
export function slayerProblem(game: Game, monsterId: string) {
  const needed = MONSTERS[monsterId]?.slayer ?? 0;
  return level(game, "slayer") < needed ? `You need a Slayer level of ${needed} to know how to wound this creature.` : null;
}
export function taskText(game: Game) {
  const task = currentTask(game);
  return task ? `Your task is to kill ${task.name}: ${data(game, "slayer_left")} to go.` : "You don't have a Slayer task. The Warden in Friendhollow will give you one.";
}
/** Tasks you can be given: your combat level is high enough, and your Slayer level for the creature. */
export function eligibleTasks(game: Game) {
  const combat = combatLevel(game.player), slayer = level(game, "slayer");
  return SLAYER_TASKS.filter(task => combat >= task.min && slayer >= ("slayer" in task ? task.slayer : 1));
}
/** A new task. Returns false (and a message) if you already have one. */
export function assignTask(game: Game, force = false): boolean {
  if (currentTask(game) && !force) return false;
  const options = eligibleTasks(game), pool = options.slice(-6), task = pool[Math.floor(game.rng() * pool.length)] ?? SLAYER_TASKS[0];
  const [low, high] = task.amount, amount = low + Math.floor(game.rng() * (high - low + 1));
  game.player.questData.slayer_task = SLAYER_TASKS.indexOf(task) + 1; game.player.questData.slayer_left = amount;
  message(game, `Your new Slayer task: kill ${amount} ${task.name}.`, "quest");
  return true;
}
/** Called for every kill: XP and progress when it's on task. */
export function slayerKill(game: Game, monsterId: string) {
  if (!onTask(game, monsterId)) return;
  const def = MONSTERS[monsterId], player = game.player;
  addXp(game, "slayer", def.slayerXp ?? def.hp);
  const left = data(game, "slayer_left") - 1;
  player.questData.slayer_left = left;
  if (left > 0) { if (left % 10 === 0 || left <= 3) message(game, `You're doing well: ${left} left on your task.`); return; }
  const streak = slayerStreak(game) + 1, points = streak % 10 === 0 ? 50 : 10;
  player.questData.slayer_streak = streak; player.questData.slayer_points = slayerPoints(game) + points;
  message(game, `You've completed your Slayer task (${streak} in a row) and earned ${points} Slayer points. Return to the Warden for another.`, "quest");
  sound(game, "quest");
}
/** Spend Slayer points. */
export function buySlayerReward(game: Game, id: string) {
  const reward = SLAYER_REWARDS.find(entry => entry.id === id);
  if (!reward) return false;
  if (slayerPoints(game) < reward.cost) { message(game, `You need ${reward.cost} Slayer points for that. You have ${slayerPoints(game)}.`, "warn"); return false; }
  if (id === "skip") {
    if (!currentTask(game)) { message(game, "You don't have a task to cancel.", "warn"); return false; }
    game.player.questData.slayer_points = slayerPoints(game) - reward.cost; assignTask(game, true);
    return true;
  }
  game.player.questData.slayer_points = slayerPoints(game) - reward.cost;
  giveOrDrop(game, id); message(game, `The Warden hands you: ${reward.name}.`); sound(game, "coins");
  return true;
}
export function addSlayerPoints(game: Game, points: number) { game.player.questData.slayer_points = slayerPoints(game) + points; }
