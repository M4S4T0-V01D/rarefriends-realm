/**
 * Duels in the sparring ring. Each game rolls its own hits on the player it's fighting and sends them; the other game
 * checks both players stand in the ring, caps the damage, and applies it. At 0 HP the loser is simply back on their
 * feet with full health, and the win is recorded on both sides. Nobody dies, and nothing is lost.
 */
import { bowRange, playerMaxHit, rangedMaxHit } from "./engine.ts";
import { combatLevel, emit, maxHp, message, sound, weapon, type Game } from "./state.ts";
import { inRing } from "./world.ts";

/** No duel hit can exceed this, whatever a message claims. */
export const DUEL_MAX_HIT = 40;
/** Duel stats kept with your save. */
export const stat = (game: Game, key: "duelsWon" | "duelsLost" | "trades" | "chests") => game.player.stats[key] ?? 0;
const bump = (game: Game, key: "duelsWon" | "duelsLost" | "trades" | "chests") => { game.player.stats[key] = stat(game, key) + 1; };
/** How close you must be to swing: melee next to them, a bow or a staff from a few tiles off. */
export function duelReach(game: Game) {
  const held = weapon(game.player)?.equip;
  return held?.bow ? Math.min(7, bowRange(game)) : held?.staff ? 6 : 1;
}
/** Your swing at another player of combat level `theirs`: the damage (0 is a miss). */
export function duelStrike(game: Game, theirs: number) {
  const chance = Math.max(0.2, Math.min(0.85, 0.5 + (combatLevel(game.player) - theirs) * 0.01));
  if (game.rng() >= chance) return 0;
  const max = weapon(game.player)?.equip?.bow ? rangedMaxHit(game) : playerMaxHit(game);
  return 1 + Math.floor(game.rng() * Math.max(1, Math.min(DUEL_MAX_HIT, max)));
}
/** Both players must stand in the ring for a duel hit to count. */
export const duelAllowed = (game: Game, them: { x: number; y: number }) => inRing(game.player.x, game.player.y) && inRing(them.x, them.y);
/** A hit from the player you're dueling. Returns "lost" when it takes you down (you're restored at once). */
export function takeDuelHit(game: Game, from: number, damage: number): "hit" | "lost" {
  const player = game.player, dealt = Math.max(0, Math.min(DUEL_MAX_HIT, player.hp, Math.floor(damage)));
  player.hp -= dealt;
  emit(game, { type: "hit", on: "player", damage: dealt || -1, tick: game.tick }); sound(game, dealt ? "hurt" : "miss");
  if (player.hp > 0) return "hit";
  player.hp = maxHp(player); bump(game, "duelsLost");
  message(game, `Friend #${from} wins the duel! No harm done: you dust yourself off at full health.`, "warn");
  return "lost";
}
export function wonDuel(game: Game, over: number) {
  bump(game, "duelsWon");
  message(game, `You beat Friend #${over} in the sparring ring! (${stat(game, "duelsWon")} win${stat(game, "duelsWon") === 1 ? "" : "s"}, ${stat(game, "duelsLost")} loss${stat(game, "duelsLost") === 1 ? "" : "es"})`, "quest"); sound(game, "duel");
}
export const countStat = bump;
