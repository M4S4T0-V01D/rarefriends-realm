/**
 * First steps: a short guided start for a new Friend. Seven steps that show the Realm off in a few minutes (a tree, a
 * fire, a fish, the cooking, the stables, the King, the Realm Daily), each with a line of help and a golden arrow over
 * where to go. Each step completes itself from what you do in the world; the last pays a reward. Skippable at any time.
 */
import type { WorldObject } from "./world.ts";
import { giveOrDrop, message, sound, type Game } from "./state.ts";

export type Target = { x: number; y: number; lift?: number };
export type FirstStep = { id: string; title: string; text: string; done: (game: Game) => boolean; target?: (game: Game) => Target | null };
const nearest = <T extends { x: number; y: number }>(game: Game, list: readonly T[]) => {
  const p = game.player; let best: T | null = null, far = Infinity;
  for (const entry of list) { const d = Math.abs(entry.x - p.x) + Math.abs(entry.y - p.y); if (d < far) { far = d; best = entry; } }
  return best;
};
const objects = (game: Game, test: (object: WorldObject) => boolean) => game.world.objects.filter(object => test(object) && !game.depleted.has(object.id));
const npc = (game: Game, id: string) => game.npcs.find(entry => entry.id === id) ?? null;

export const FIRST_STEPS: readonly FirstStep[] = [
  { id: "chop", title: "Chop a tree", text: "Click any tree to chop it with your axe. Right-click anything to see everything you can do with it.",
    done: game => game.player.xp.woodcutting > 0, target: game => nearest(game, objects(game, object => object.kind === "tree" && object.tree === "tree")) },
  { id: "fire", title: "Light a fire", text: "Right-click your logs and choose Light (or use your tinderbox on them).",
    done: game => game.player.xp.firemaking > 0 },
  { id: "fish", title: "Catch a fish", text: "Take your small net to the fishing spot (the ripples on the water) and click it.",
    done: game => game.player.xp.fishing > 0, target: game => nearest(game, objects(game, object => object.kind === "spot" && object.spot === "net")) },
  { id: "cook", title: "Cook your catch", text: "Use the raw fish on a fire, or on the cooking range in the Sleepy Friend inn.",
    done: game => game.player.xp.cooking > 0, target: game => nearest(game, [...game.fires, ...objects(game, object => object.kind === "range")]) },
  { id: "horses", title: "Meet the horses", text: "Visit the stables west of the castle and right-click a horse in the paddock to Stroke it. Mounts are sold here, and carry you faster than you can run.",
    done: game => (game.player.stats.strokes ?? 0) > 0, target: game => npc(game, "paddock_unicorn") ?? npc(game, "paddock_horse") },
  { id: "king", title: "Meet King Hollis", text: "Climb the castle's spiral stairs (click them) to the King's hall on the first floor, and talk to him.",
    done: game => !!game.player.questData.royal_audience, target: game => { const king = npc(game, "king"); return king && { x: king.x, y: king.y, lift: 20 }; } },
  { id: "daily", title: "Open the Realm Daily", text: "Click the 🔥 button on the minimap: a reward every day you play, daily challenges, the world boss's timer and the update log.",
    done: game => (game.player.stats.dailyOpened ?? 0) > 0 },
];
export const FIRST_STEPS_REWARD = { coins: 500, lamp: 1 };
/** The step you're on (null when finished or skipped). */
export const currentStep = (game: Game) => game.player.guide >= 0 && game.player.guide < FIRST_STEPS.length ? FIRST_STEPS[game.player.guide] : null;
/** Move on past any steps you've done (call every tick). Returns true when the guide just finished. */
export function updateFirstSteps(game: Game) {
  const player = game.player;
  let step = currentStep(game), advanced = false;
  while (step && step.done(game)) {
    player.guide++; advanced = true;
    const next = currentStep(game);
    if (next) { message(game, `Done: ${step.title}. Next: ${next.title}. ${next.text}`, "quest"); sound(game, "quest"); }
    step = next;
  }
  if (advanced && !step) {
    giveOrDrop(game, "coins", FIRST_STEPS_REWARD.coins); giveOrDrop(game, "insight_lamp", FIRST_STEPS_REWARD.lamp);
    message(game, `First steps complete! The Realm Guide sends 500 coins and a Lamp of insight (rub it for XP in any skill). The Realm is yours: try a quest, ride, or find other players.`, "quest");
    sound(game, "level");
    return true;
  }
  return false;
}
export function skipFirstSteps(game: Game) { game.player.guide = -1; message(game, "First steps skipped. The Realm Guide by the fountain is always happy to help."); }
