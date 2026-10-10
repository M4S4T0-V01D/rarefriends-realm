/**
 * The Land Before Stone: the Hidden Road, the Mizukai Isles' own Mysteries. Not the shrine's vows nor the Sealwrights'
 * seals: the mountain ascetics' practice of walking where the Isles show what's under them, and coming back.
 *
 * "The Hidden Road": Ascetic Kōdō, below Iwaoka's monastery, will teach someone who climbed the mountain in silence
 * (The Silent Climb). Walk to three places where the Isles show what's under them (the standing mist above Kumoyama,
 * the foxfire on Morishima, the stone on Iwaoka that gives back no echo); bring him the crow mask of a hermit who
 * walked the road and lost it, for burning; then sit with him. He teaches Mist Step, Severing Cut and the Mountain's
 * Shout (techniques.ts). Its discoveries share the Mysteries skill with Kharaveth's: one skill, many traditions.
 */
import { addXp, giveOrDrop, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { discover } from "./mysteries.ts";
import type { WorldObject } from "./world.ts";

const ROAD = "hidden_road";
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: 9, seed }, ...extra });
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
/** The three places, the quest flag each sets, and its discovery. */
const PLACES = [["hr_m", "hr_mist", "The standing mist, above Kumoyama"], ["hr_f", "hr_foxfire", "The foxfire, on Morishima"], ["hr_s", "hr_stone", "The stone with no echo, on Iwaoka"]] as const;
const walked = (game: Game) => PLACES.every(([key]) => data(game, key));

export const HIDDEN_ROAD_NPCS: Record<string, NpcDef> = {
  iwa_kodo: person("iwa_kodo", "Ascetic Kōdō", "A mountain walker in a straw hat as wide as his shoulders, a conch shell on a cord, and sandals worn to the shape of the path. He's always just arrived.", 1470),
};

export const HIDDEN_ROAD_QUESTS: readonly QuestDef[] = [{
  id: ROAD, name: "The Hidden Road", points: 2, difficulty: "Intermediate", start: "Talk to Ascetic Kōdō, where the road starts to climb below Iwaoka's monastery.",
  requirements: ["The Silent Climb", "Combat 44 recommended"],
  rewards: ["2 Quest Points", "4,000 Mysteries XP", "1,500 Presence XP", "The Hidden Road's techniques: Mist Step, Severing Cut and the Mountain's Shout"],
  journal: game => {
    const s = stage(game, ROAD);
    if (s === 0) return ["Below Iwaoka's monastery, where the road starts to climb, a mountain walker in a wide straw hat is resting. He's always just arrived."];
    if (s === 1) return ["Ascetic Kōdō walks the Hidden Road: the places where the Isles show what's under them. He wants me to walk to three of them, and look.",
      ...PLACES.map(([key, , text]) => mark(!!data(game, key), text)), mark(walked(game), "Then go back to Kōdō")];
    if (s === 2) return ["The crow-masked hermits on Iwaoka's slopes walked the Hidden Road once, and lost it. Their masks keep them lost. Kōdō wants one, to burn.",
      mark(has(game.player, "hermits_crow_mask"), "Take a hermit's crow mask"), "• Bring it to Kōdō"];
    return ["Kōdō burned the mask and we sat by the fire until it was out. He taught me to step into mist, to cut a spirit's thread, and to shout like the mountain. QUEST COMPLETE!"];
  },
}];

type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const TEXT: Record<string, readonly [examine: string, look: string, seen: string]> = {
  hr_mist: ["A column of mist standing above the path, as tall as a cedar. The wind goes through the trees round it. It doesn't move.",
    "You stand in the mist. It's warm, like breath, and it smells of the shrine's incense, though the shrine is a long way down.",
    "Inside the mist, the mountain is quiet in a way it isn't outside it. Somewhere under your feet, something very large turns over in its sleep."],
  hr_foxfire: ["Pale flames hanging in the air at the edge of the fox wood, no lantern under them. They go out when you look straight at them.",
    "You look beside the flames, not at them. They stay.",
    "Looked at sideways, the flames are a road: a line of them going off into the wood, further than the island is wide."],
  hr_stone: ["A boulder on Iwaoka's slope, split down the middle. The monks walk round it.",
    "You call into the split. Nothing comes back: not your voice, not the wind, not the sound of the call ending.",
    "The stone keeps what's said to it. Every word ever called into it is still in there, and none of them is lonely."],
};

export const HIDDEN_ROAD_CLUES: Record<string, Clue> = Object.fromEntries(PLACES.map(([key, id]): [string, Clue] => [id, {
  options: () => ["Look"],
  examine: () => TEXT[id][0],
  use: game => {
    const first = !data(game, key);
    // Anyone can look; only someone walking the road sees what's under it.
    if (stage(game, ROAD) < 1) return { text: TEXT[id][1] };
    if (first && stage(game, ROAD) === 1) {
      flag(game, key); discover(game, id);
      if (walked(game)) say(game, "Three places walked. Ascetic Kōdō will want to hear what you saw.");
    }
    return { text: `${TEXT[id][1]} ${TEXT[id][2]}` };
  },
}]));

export function talkHiddenRoad(game: Game, npcId: string, name: string): Dialogue | null {
  if (npcId !== "iwa_kodo") return null;
  const player = game.player, s = stage(game, ROAD);
  if (s === 0) {
    if (!questDone(game, "silent_climb")) return chat(name, npcSays(name, "You've come from the monastery's gate, not from the top. Climb Iwaoka first, in silence; the abbot will tell you when you have. Then come and walk with me."));
    return chat(name, npcSays(name, "You climbed in silence. Good. Most people who climb in silence are only being quiet. You were listening.",
      "The shrine has its vows and the Sealwrights have their seals. I have the road under the road: the places where the Isles show what's beneath them. Walking there is a practice, like sweeping. Want to learn it?"), [
      { label: "Teach me the Hidden Road.", then: () => chat(name, npcSays(name, "Then walk. Three places: the mist that stands still above Kumoyama, the foxfire at the edge of Morishima's wood, and the stone on this mountain that gives back no echo. Look at each the way you'd look at a person. Come back and tell me."), undefined, () => {
        player.quests[ROAD] = 1; say(game, "Quest started: The Hidden Road.");
      }) },
      { label: "What's the Hidden Road?", then: () => chat(name, npcSays(name, "A way of walking. The vows ask the kami for things. The road asks nothing: it goes and looks. What you learn walking it, you can use, in a fight or out of one. That's all. It isn't a faith; you can keep any faith you like and walk it.")) },
      { label: "Not now.", then: () => null },
    ]);
  }
  if (s === 1 && !walked(game)) return chat(name, npcSays(name, pick(game, ["The mist above Kumoyama, the foxfire on Morishima, the stone here with no echo. Don't hurry. A place you hurried to is a place you haven't been.", "Look beside things, not at them. The foxfire especially."])));
  if (s === 1) return chat(name, npcSays(name, "You walked them. What was under the mist? No: don't tell me. Keep it. Saying it makes it smaller.",
    "There are walkers on this mountain who lost the road: the crow-masked hermits. They put the masks on to see further, and the masks kept the seeing and left them the crow. Bring me a mask. I'll burn it, and one of them can go home."), undefined, () => {
    player.quests[ROAD] = 2; say(game, "Take a hermit's crow mask from one of the crow-masked hermits on Iwaoka's slopes, and bring it to Kōdō.");
  });
  if (s === 2 && !has(player, "hermits_crow_mask")) return chat(name, npcSays(name, pick(game, ["The crow-masked ones, on the slopes. They're spirits now, more than people. A spirit can be cut loose; a mask can be burned.", "Bring me a mask. Don't wear it. Nobody ever thinks they'll be the one who keeps it on."])));
  if (s === 2) return chat(name, npcSays(name, "That's one. Sit.", "(He builds a small fire of pine needles and lays the mask on it. It burns blue, then ordinary. Far up the slope, a crow calls once, and then a person's voice says something, surprised.)",
    "There. That's the road: going, looking, coming back, and helping someone else come back. Now the useful parts.",
    "When something's after you, step sideways into mist, and it loses you. When a spirit's in front of you, find the thread that holds it here and cut that, not the spirit. And when you need a moment, shout from the belly, like the mountain: anything that hears it forgets what it was doing."), undefined, () => {
    take(player, "hermits_crow_mask", 1); finishRoad(game);
  });
  return chat(name, npcSays(name, pick(game, ["The road's the same road in Kharaveth, I'm told. They call what's under it by other names. Names are a lowland habit.", "Mist Step, Severing Cut, the Mountain's Shout. Use them when they're needed, not because you can.", "I've just arrived. I'm always just arriving. It's a good way to see a place."])));
}
function finishRoad(game: Game) {
  if (questDone(game, ROAD)) return;
  discover(game, "hidden_road");
  addXp(game, "mysteries", 4000, { raw: true }); addXp(game, "presence", 1500, { raw: true });
  completeQuest(game, ROAD);
  say(game, "Mist Step, Severing Cut and the Mountain's Shout are yours: Mysteries techniques, in your Combat options.");
}

/** A crow-masked hermit's mask, while you're looking for one (the Hidden Road, stage 2). */
export function onHiddenRoadKill(game: Game, monsterId: string) {
  if (monsterId !== "crow_hermit") return;
  if (stage(game, ROAD) === 2 && !has(game.player, "hermits_crow_mask")) {
    giveOrDrop(game, "hermits_crow_mask"); discover(game, "crow_mask");
    say(game, "The hermit's crow mask comes away in your hand. Under it, nobody: just the wind going through.");
  }
}
