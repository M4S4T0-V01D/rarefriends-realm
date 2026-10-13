/**
 * Wayfinding (Wayfaring): the north's trails. A trail is a road walked end to end and known: waymarks (cairns) stand
 * beside it every so often (northworld.ts puts them there), and noting every one of them along a road makes it yours.
 * A known trail pays Wayfaring XP once, and running along it costs half the energy: you know where the ground's good.
 * What you've noted is kept by trail (player.trails, a bit for each waymark).
 */
import { addXp, message, sound, type Game, type Player } from "./state.ts";
import { W, H, type World, type WorldObject } from "./world.ts";
import { ROADS, TRAILS } from "./northworld.ts";

export type TrailId = typeof TRAILS[number]["id"];
const marksCache = new WeakMap<World, Map<string, number>>();
/** How many waymarks each trail has (counted from the world, once). */
export function waymarkCount(world: World, id: string): number {
  let counts = marksCache.get(world);
  if (!counts) { counts = new Map(); for (const o of world.objects) if (o.clue === "waymark" && o.text) { const t = o.text.split(":")[0]; counts.set(t, (counts.get(t) ?? 0) + 1); } marksCache.set(world, counts); }
  return counts.get(id) ?? 0;
}
const noted = (player: Player, id: string) => { let n = 0, bits = player.trails[id] ?? 0; while (bits) { n += bits & 1; bits >>>= 1; } return n; };
/** Whether you know a trail end to end. */
export const trailKnown = (game: Game, id: string) => { const all = waymarkCount(game.world, id); return all > 0 && noted(game.player, id) >= all; };
/** Every tile within a step or two of a trail's road, by trail (1 + its index), worked out once per world. */
const tileCache = new WeakMap<World, Uint8Array>();
function trailTiles(world: World): Uint8Array {
  let at = tileCache.get(world);
  if (at) return at;
  at = new Uint8Array(W * H);
  TRAILS.forEach((trail, ti) => {
    const pts = ROADS[trail.road];
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1], steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let s = 0; s <= steps; s++) { const cx = ax + (bx - ax) * s / steps, cy = ay + (by - ay) * s / steps;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = Math.round(cx) + dx, y = Math.round(cy) + dy; if (x >= 0 && y >= 0 && x < W && y < H && dx * dx + dy * dy <= 9) at[y * W + x] = ti + 1; } }
    }
  });
  tileCache.set(world, at);
  return at;
}
/** Whether you're on a trail you know (wayfaring.ts halves the run's cost there). */
export function onKnownTrail(game: Game): boolean {
  const t = trailTiles(game.world)[game.player.y * W + game.player.x];
  return t > 0 && trailKnown(game, TRAILS[t - 1].id);
}
const trailOf = (o: WorldObject) => { const [id, n] = (o.text ?? "").split(":"); const trail = TRAILS.find(t => t.id === id); return trail ? { trail, n: Number(n) } : null; };
/** Note a waymark: the trail learnt a little; all of them, and it's known. */
export function noteWaymark(game: Game, o: WorldObject): string {
  const at = trailOf(o), player = game.player;
  if (!at || !Number.isInteger(at.n) || at.n < 0 || at.n > 30) return "A cairn of stones. Somebody knew the way.";
  const all = waymarkCount(game.world, at.trail.id), bit = 1 << at.n, before = player.trails[at.trail.id] ?? 0;
  if (before & bit) return `You've noted this waymark already (${noted(player, at.trail.id)}/${all} of ${at.trail.name}).`;
  player.trails[at.trail.id] = before | bit; sound(game, "click");
  const n = noted(player, at.trail.id);
  addXp(game, "agility", 25, { raw: true });
  if (n >= all) {
    addXp(game, "agility", 60 * all, { raw: true });
    message(game, `You know ${at.trail.name} now, end to end: running along it costs you half.`, "quest"); sound(game, "quest");
    return `The last waymark of ${at.trail.name}.`;
  }
  return `A waymark of ${at.trail.name}, noted (${n}/${all}).`;
}
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
export const WAYMARK_CLUES: Record<string, { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome }> = {
  waymark: {
    options: () => ["Note-the-way"],
    examine: (game, o) => { const at = trailOf(o); return at ? `A cairn beside ${at.trail.name}, a flat stone on top scratched with the way.` : "A cairn of stones."; },
    use: (game, o) => ({ text: noteWaymark(game, o) }),
  },
};
/** The trails from a save: known ids, bits kept sane. */
export const cleanTrails = (raw: unknown): Record<string, number> => Object.fromEntries(Object.entries(raw && typeof raw === "object" ? raw as Record<string, unknown> : {})
  .filter(([id, v]) => TRAILS.some(t => t.id === id) && typeof v === "number" && Number.isInteger(v) && v > 0 && v < 2 ** 30)) as Record<string, number>;
