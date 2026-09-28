/**
 * Hiscores among the players you've met: every Friend you've seen online is remembered with their total and combat
 * levels (as they last showed them), and ranked with you. Kept in your save, up to 150 players.
 */
import { combatLevel, totalLevel, type Game } from "./state.ts";

export type Met = { total: number; combat: number; seen: number };
/** Remember (or update) the players around you. `now` is wall-clock ms. */
export function notePlayers(game: Game, players: readonly { id: number; total: number; combat: number }[], now: number) {
  const met = game.player.met, day = Math.floor(now / 86_400_000);
  for (const entry of players) if (entry.id !== game.player.friendId) met[entry.id] = { total: entry.total, combat: entry.combat, seen: day };
  const ids = Object.keys(met);
  if (ids.length > 150) for (const id of ids.sort((a, b) => met[+a].seen - met[+b].seen).slice(0, ids.length - 150)) delete met[+id];
}
export type Rank = { id: number; total: number; combat: number; you: boolean; rank: number };
/** You and everyone you've met, best total level first (combat level breaks ties). */
export function hiscores(game: Game): Rank[] {
  const you = { id: game.player.friendId, total: totalLevel(game.player), combat: combatLevel(game.player), you: true };
  const rows = [you, ...Object.entries(game.player.met).map(([id, entry]) => ({ id: +id, total: entry.total, combat: entry.combat, you: false }))];
  return rows.sort((a, b) => b.total - a.total || b.combat - a.combat || a.id - b.id).map((row, i) => ({ ...row, rank: i + 1 }));
}
export function cleanMet(raw: unknown): Record<number, Met> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<number, Met> = {}, int = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : null;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, 150)) {
    const id = Number(key), e = value as Record<string, unknown>, total = int(e?.total, 1, 3000), combat = int(e?.combat, 3, 200), seen = int(e?.seen, 0, 1e7);
    if (Number.isSafeInteger(id) && id > 0 && total !== null && combat !== null && seen !== null) out[id] = { total, combat, seen };
  }
  return out;
}
