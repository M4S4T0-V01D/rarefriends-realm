/**
 * Scale and Fire: Ysolde's second errand (after A Drake of Your Own, mounts.ts), and the way into her wyrmwright trade.
 * The Realm has three more kinds of dragon now (dragonsworld.ts has the places): frost drakes on the Cragmaw Heights,
 * bone drakes in the Bonefield, dune drakes at Qeshet, each with a wyrm of its own at the heart. Ysolde wants one of
 * each put down, and a wyrm scale brought back; then she'll turn scales into shields no breath gets through and arms
 * that bite a dragon harder than anything else (data.ts, the wyrmwright shop, for wyrm scales).
 */
import { addXp, give, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, data, fetchQuest, npcSays, questDone, stage, type QuestDef } from "./content.ts";
import { DRAKE_OF_YOUR_OWN } from "./mounts.ts";

export const SCALE_AND_FIRE = "scale_and_fire";
/** The three kinds: the flag each kill sets, the monster, and the journal's word for it. */
export const DRAGON_KINDS = [
  ["sf_frost", "frost_drake", "A frost drake, on the Cragmaw Heights"],
  ["sf_bone", "bone_drake", "A bone drake, in the Bonefield"],
  ["sf_dune", "dune_drake", "A dune drake, at Qeshet in the Sea of Dunes"],
] as const;
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };

export const DRAGON_QUESTS: readonly QuestDef[] = [
  {
    id: SCALE_AND_FIRE, name: "Scale and Fire", points: 2, difficulty: "Master", start: "Talk to Ysolde the drake hunter at Wyrmreach, once the hatchling is yours.",
    requirements: ["A Drake of Your Own completed", "Slayer 62 recommended", "Combat 90 recommended", "A Wyrmward shield"],
    rewards: ["2 Quest Points", "8,000 Slayer XP", "4,000 Defence XP", "Three wyrm scales", "Ysolde's wyrmwright trade: Wyrmward and Drakeward shields in every shape, and the Wyrmbane arms, for wyrm scales"],
    journal: game => {
      const s = stage(game, SCALE_AND_FIRE);
      if (s === 0) return ["Ysolde says there are more dragons in the Realm than Wyrmreach's: frost drakes on the Cragmaw Heights north of Ironreach, bone drakes in the Bonefield in the Deadwood's north-east, dune drakes at Qeshet, the ruin in the Sea of Dunes. She wants to know how each one's fire goes through a shield."];
      if (s === 1) return ["Ysolde wants one of each of the new dragons put down, and a wyrm scale brought back to her: she means to make shields of them.",
        ...DRAGON_KINDS.map(([key, , text]) => mark(!!data(game, key), text)), mark(has(game.player, "wyrm_scale"), "A wyrm scale for Ysolde"), "• Tell Ysolde"];
      return ["Frost, bone and sand, and I walked out of all three. Ysolde works wyrm scale now: shields in every shape that dragonfire can't get through, and arms that bite a dragon a third harder. She trades them for scales. QUEST COMPLETE!"];
    },
  },
];

export function talkDragons(game: Game, npcId: string, name: string): Dialogue | null {
  if (npcId !== "drake_hunter" || !questDone(game, DRAKE_OF_YOUR_OWN)) return null;
  const player = game.player;
  if (questDone(game, SCALE_AND_FIRE)) return chat(name, npcSays(name, pick(game, ["Scales. Bring me scales, and I'll turn them into something no breath gets through.", "Frost, bone and sand, and you walked out of all three. Let me see what I can make you.", "The drakeward shields are cindersteel over scale: a dragon's own fire can't warm them. The wyrmbane arms are ground for one thing, and they do it."])), [
    { label: "Let me see the wyrmwright work.", then: () => { game.ui.shop = "wyrmwright"; return null; } },
    { label: "Later.", then: () => null }]);
  return fetchQuest(game, name, SCALE_AND_FIRE, {
    offer: ["Wyrmreach isn't the only place with dragons; it's just the one with a village next to it. Frost drakes on the Cragmaw Heights, north of Ironreach, a bone kind in the Deadwood's north-east where the Old One died, and the dune drakes at Qeshet, the ruin in the Sea of Dunes. Each has a wyrm at the heart of it.",
      "Put down one of each (one, I'm not asking you to clear them) and bring me a wyrm scale. I want to know how frost, bone and sand go through a shield, and then I want to make one they don't."],
    accept: "A frost drake, a bone drake, a dune drake, and a scale. Take the Wyrmward; you'll want it.", progress: "One of each kind, and a scale. The heights are north of Ironreach's coast; the Bonefield's past the maidens' village; Qeshet's west of the dunes road.",
    have: () => DRAGON_KINDS.every(([key]) => !!data(game, key)) && has(player, "wyrm_scale"), take: () => take(player, "wyrm_scale", 1),
    done: ["Frost burns cold, bone burns dry, sand burns like a forge. And the scale turns all three, if there's enough of it over the face of the shield.", "Cindersteel over wyrmscale: nothing they breathe gets through that. I'll make them, and the arms to go with; bring me scales and I'll trade."],
    reward: () => { give(player, "wyrm_scale", 3); addXp(game, "slayer", 8000, { raw: true }); addXp(game, "defence", 4000, { raw: true }); },
  });
}

/** Kills the quest counts: the first of each kind, wherever it falls. */
export function onDragonsKill(game: Game, monsterId: string) {
  if (stage(game, SCALE_AND_FIRE) !== 1) return;
  for (const [key, id] of DRAGON_KINDS) {
    if (monsterId !== id || data(game, key)) continue;
    game.player.questData[key] = 1;
    const left = DRAGON_KINDS.filter(([other]) => !data(game, other)).length;
    say(game, left === 0 ? "That's frost, bone and sand. Ysolde wants a wyrm scale besides, and then to hear about it." : "One of Ysolde's kinds down. She wanted one of each, and a scale.");
  }
}
