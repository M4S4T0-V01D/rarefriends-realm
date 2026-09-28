/**
 * The world boss: the Ashen Colossus rises in Wyrmreach every two hours of the real clock (on the even UTC hours) and
 * stays twenty minutes, so everyone online meets it at once. Its HP is shared through the shared-fight reports, and
 * everyone who wounded it gets its loot when it falls, whoever lands the last blow.
 */
import { MONSTERS } from "./data.ts";
import { message, sound, type Game } from "./state.ts";
import { objectAtTile, walkable } from "./world.ts";

export const BOSS_EVERY = 2 * 3_600_000, BOSS_LASTS = 20 * 60_000, BOSS_LAIR = { x: 44, y: 32 };
/** The boss window a moment falls in: whether it's up, and when it rises next. */
export function bossWindow(ms: number) {
  const index = Math.floor(ms / BOSS_EVERY), start = index * BOSS_EVERY;
  return { index, start, end: start + BOSS_LASTS, active: ms - start < BOSS_LASTS, next: start + BOSS_EVERY };
}
/** Raise the boss when its window opens and send it back when it closes. Returns what happened, if anything. */
export function updateWorldBoss(game: Game, now: number): "risen" | "gone" | null {
  const window = bossWindow(now), uid = 900_000 + (window.index % 50_000), def = MONSTERS.ashen_colossus;
  const existing = game.monsters.findIndex(monster => monster.def.worldBoss);
  if (window.active) {
    if (existing >= 0 && game.monsters[existing].uid === uid) return null;
    if (existing >= 0) game.monsters.splice(existing, 1);
    // The same tile in every game, so everyone's Colossus stands in the same place.
    let at = BOSS_LAIR;
    search: for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = BOSS_LAIR.x + dx, y = BOSS_LAIR.y + dy;
      if (walkable(game.world, x, y) && !objectAtTile(game.world, x, y)) { at = { x, y }; break search; }
    }
    game.monsters.push({ uid, def, x: at.x, y: at.y, prev: { ...at }, spawn: { ...at }, hp: def.hp, heading: { x: 1, y: 1 }, target: false, attackTimer: 0, respawnAt: 0, dead: false,
      wander: def.wander, moved: 0, retreat: 0, curses: {}, bornAt: game.tick });
    message(game, `The Ashen Colossus has risen in Wyrmreach! It stays twenty minutes, and everyone who wounds it shares the loot.`, "quest"); sound(game, "duel");
    return "risen";
  }
  if (existing < 0) return null;
  const [gone] = game.monsters.splice(existing, 1);
  if (game.player.combat === gone.uid) game.player.combat = null;
  if (!gone.dead) { message(game, "The Ashen Colossus sinks back into the ash. It will rise again in two hours.", "info"); return "gone"; }
  return null;
}
