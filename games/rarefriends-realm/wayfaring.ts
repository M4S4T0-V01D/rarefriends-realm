/**
 * Wayfaring (the skill once called Agility): courses, shortcuts and the Wayfarer's outfit. Run energy comes back faster
 * and drains slower the better you are, hard obstacles can be slipped on, and every lap of a course pays Wayfarer's marks
 * that Coach Skip trades for gear. The obstacle activity itself runs in engine.ts.
 */
import { WAYFARER_MARK, WAYFARER_REWARDS, item } from "./data.ts";
import { count, giveOrDrop, level, message, sound, take, wayfarerPieces, type Game } from "./state.ts";

/**
 * The chance of slipping on an obstacle: none on the easiest (level 1) ones or in the Wayfarer's gloves, a fifth at the
 * obstacle's own level, and gone twelve levels above it.
 */
export function slipChance(game: Game, obstacle: { level: number }) {
  if (obstacle.level <= 1 || game.player.equipment.hands === "wayfarer_gloves") return 0;
  return Math.max(0, Math.min(0.2, (obstacle.level + 12 - level(game, "agility")) / 60));
}
/** Running drains less the better your Wayfaring (40% less at 99), and less again in the Wayfarer's cape (20%, 40% in the full outfit). */
export function runDrain(game: Game) {
  const player = game.player, cape = player.equipment.cape === "wayfarer_cape" ? (wayfarerPieces(player) >= 4 ? 0.6 : 0.8) : 1;
  return (player.familyId === 5 ? 0.36 : 0.6) * (1 - level(game, "agility") * 0.004) * cape;
}
/** Coach Skip's rewards, bought with Wayfarer's marks. */
export function buyWayfarerReward(game: Game, id: string) {
  const reward = WAYFARER_REWARDS.find(entry => entry.id === id), player = game.player;
  if (!reward) return false;
  if (count(player, WAYFARER_MARK) < reward.cost) { message(game, `You need ${reward.cost} Wayfarer's mark${reward.cost > 1 ? "s" : ""} for that. You have ${count(player, WAYFARER_MARK)}.`, "warn"); return false; }
  take(player, WAYFARER_MARK, reward.cost); giveOrDrop(game, reward.id, reward.gives);
  message(game, `Coach Skip hands you ${reward.gives > 1 ? `${reward.gives} ${item(reward.id).name.toLowerCase()}` : item(reward.id).name}.`); sound(game, "coins");
  return true;
}
