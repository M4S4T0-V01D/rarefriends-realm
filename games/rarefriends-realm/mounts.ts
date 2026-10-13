/**
 * Mounts earned rather than bought (mountworld.ts has the places): The Striped One, from Huntmaster Fenn at Tallgrass
 * (poachers from over the water are camped at The Wilds' east edge with a tiger in a cage of stakes: put the three of
 * them down, open the cage, and the tiger follows you back to Fenn), and A Drake of Your Own, from Ysolde the drake
 * hunter at Wyrmreach (a nest up by the lava with an egg the drakes roost over: clear four of them, bring the egg and
 * ten cooked meat, and she hatches it by her fire). Each ends with a mount nothing in the stables sells.
 */
import { mountDef } from "./data.ts";
import { addXp, combatLevel, count, give, giveOrDrop, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, data, fetchQuest, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { regionAt, northShift } from "./world.ts";
import { POACHER_CAMP } from "./mountworld.ts";
import { QUEST_MOUNT_CLUES, QUEST_MOUNT_NPCS, QUEST_MOUNT_QUESTS, onQuestMountKill, talkQuestMounts } from "./questmounts.ts";

const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
export const STRIPED_ONE = "striped_one", DRAKE_OF_YOUR_OWN = "drake_of_your_own";
/** The poachers at the cage, the drakes over the nest, the meat a hatchling eats. */
export const POACHERS = 3, NEST_DRAKES = 4, HATCHLING_MEAT = 10;
/** A mount earned: yours from now on (ride it with H or from the Mount tab); `how` says how it came to you. */
const earn = (game: Game, id: string, how: string) => { const mount = mountDef(id)!; if (!game.player.mounts.includes(id)) game.player.mounts.push(id); game.player.lastMount = id; message(game, `${how} ${mount.text}`, "quest"); sound(game, "level"); };
const xp = (game: Game, skill: "slayer" | "strength" | "firemaking", amount: number) => addXp(game, skill, amount, { raw: true });

export const MOUNT_NPCS: Record<string, NpcDef> = {
  caged_tiger: { id: "caged_tiger", name: "Caged tiger", examine: "A striped cat the size of a horse, in a cage of stakes, pacing. It has been looking at the poachers the way they'd rather it didn't.", options: ["Talk-to"], art: { family: 0, seed: 1 }, mount: "tiger", gone: game => !!data(game, "so_freed") },
  paddock_bay: { id: "paddock_bay", name: "Horse", examine: "A bay, tied at the hitching post, waiting for whoever's inside.", options: ["Stroke"], art: { family: 0, seed: 1 }, mount: "bay_horse" },
  // The wider world's mounts (questmounts.ts): the Dawn's charger, the Dusk stag, Halzir's white camel, the three-tailed fox.
  ...QUEST_MOUNT_NPCS,
};

export const MOUNT_QUESTS: readonly QuestDef[] = [
  {
    id: STRIPED_ONE, name: "The Striped One", points: 1, difficulty: "Intermediate", start: "Talk to Huntmaster Fenn at Tallgrass, once the tracks there are quiet (and the Howling Vault, if he has that for you first).",
    requirements: ["Tracks in the Tallgrass completed", "Combat 40 recommended"], rewards: ["1 Quest Point", "3,000 Pursuance XP", "1,500 Strength XP", "800 Frens", "A tiger to ride"],
    journal: game => {
      const s = stage(game, STRIPED_ONE);
      if (s === 0) return ["Huntmaster Fenn says poachers came through The Wilds with a tiger in a cage, and are camped at the Wilds' east edge waiting on a buyer."];
      if (s === 1) return ["Fenn wants the three poachers out of The Wilds and the tiger out of its cage: their camp is at the Wilds' east edge, past the long grass. Then tell him.",
        mark(data(game, "so_poachers") >= POACHERS, `Poachers put down: ${Math.min(POACHERS, data(game, "so_poachers"))}/${POACHERS}`), mark(!!data(game, "so_freed"), "Open the cage"), "• Tell Fenn"];
      return ["The poachers are gone and the tiger walked out of its cage and followed me back to Tallgrass. It carries me now; Fenn says there's no stable in the Realm that could have sold me that. QUEST COMPLETE!"];
    },
  },
  {
    id: DRAKE_OF_YOUR_OWN, name: "A Drake of Your Own", points: 1, difficulty: "Experienced", start: "Talk to Ysolde the drake hunter at Wyrmreach.",
    requirements: ["Combat 50 recommended", "Ten cooked meat"], rewards: ["1 Quest Point", "3,000 Pursuance XP", "2,000 Firemaking XP", "800 Frens", "A little green dragon to ride"],
    journal: game => {
      const s = stage(game, DRAKE_OF_YOUR_OWN);
      if (s === 0) return ["Ysolde the drake hunter at Wyrmreach has an egg on her mind: one the drakes left in a nest up by the lava, that won't last another winter cold."];
      if (s === 1) return ["Ysolde wants the drakes cleared off the nest up by Wyrmreach's lava (four of them), the egg out of it (search the nest), and ten cooked meat for whatever hatches.",
        mark(data(game, "dy_drakes") >= NEST_DRAKES, `Drakes off the nest: ${Math.min(NEST_DRAKES, data(game, "dy_drakes"))}/${NEST_DRAKES}`), mark(has(game.player, "drake_egg"), "The egg, from the nest"), mark(has(game.player, "cooked_meat", HATCHLING_MEAT), `Cooked meat: ${Math.min(HATCHLING_MEAT, count(game.player, "cooked_meat"))}/${HATCHLING_MEAT}`), "• Bring them to Ysolde"];
      return ["The egg hatched by Ysolde's fire: a little green dragon, which has decided I'm its mother and carries me about. It hates the cold. QUEST COMPLETE!"];
    },
  },
  ...QUEST_MOUNT_QUESTS,
];

/** The places the quests read: the tiger's tracks, and the drakes' nest. */
export const MOUNT_CLUES: Record<string, { options: () => string[]; examine: () => string; use: (game: Game) => { text: string } }> = {
  tiger_tracks: {
    options: () => ["Read"],
    examine: () => "Tracks in the soft ground: a cat's, as wide as your hand, going east. Beside them, boots, and the ruts of something heavy dragged.",
    use: game => {
      if (stage(game, STRIPED_ONE) === 1) flag(game, "so_tracks");
      return { text: "A big cat's pads, going east; men's boots either side of them, and the ruts of a cage on runners. They went to the Wilds' east edge, where the grass stops." };
    },
  },
  drake_nest: {
    options: () => ["Search"],
    examine: () => "A drake's nest of scorched bone and ash, up by the lava. There's an egg in it the size of a bucket, and the drakes roost over it.",
    use: game => {
      if (stage(game, DRAKE_OF_YOUR_OWN) !== 1) return { text: "An egg, warm from the lava, in a nest of bone. Something will want it kept, and the drakes over it want it left." };
      if (data(game, "dy_drakes") < NEST_DRAKES) return { text: `The drakes roost over the nest; ${NEST_DRAKES} of them want putting down before you can reach the egg.` };
      if (data(game, "dy_egg")) return { text: "The nest is empty now, but for the bones." };
      flag(game, "dy_egg"); giveOrDrop(game, "drake_egg", 1); say(game, "The egg, out of the nest: heavy, warm, and faintly ticking. Ysolde wants it, and ten cooked meat.");
      return { text: "The egg's heavy, warm, and faintly ticking. Don't drop it." };
    },
  },
  ...QUEST_MOUNT_CLUES,
};

export function talkMounts(game: Game, npcId: string, name: string): Dialogue | null {
  const wider = talkQuestMounts(game, npcId, name); if (wider) return wider;
  const player = game.player, says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  switch (npcId) {
    case "caged_tiger": {
      if (data(game, "so_freed")) return says("The cage is empty: stakes, straw, and a smell.");
      if (stage(game, STRIPED_ONE) !== 1) return says("The tiger looks at you through the stakes. The poachers' lock is good, and the poachers are close.");
      if (data(game, "so_poachers") < POACHERS) return says("The poachers are too close; the tiger won't come out while they're by its cage, and they'd rather you didn't try.");
      return chat(name, npcSays(name, "The tiger stops pacing and looks at you. The lock is on your side of the stakes."), [
        { label: "Open the cage.", then: () => { flag(game, "so_freed"); say(game, "The stakes come up. The tiger looks at you for a long moment, then walks off west, towards Tallgrass, at a walk. Fenn will want to know."); return chat(name, npcSays(name, "The tiger steps out, stretches, and goes, west, unhurried, the way you came.")); } },
        { label: "Not yet.", then: () => null }]);
    }
    case "tallgrass_huntmaster": {
      // After the tracks are quiet; the Howling Vault (the huntmaster's other errand, content.ts) comes first once Fenn has it for you.
      const vault = stage(game, "howling_vault") === 1 || (stage(game, "howling_vault") === 0 && combatLevel(player) >= 70);
      if (!questDone(game, "tallgrass_tracks") || questDone(game, STRIPED_ONE) || vault) return null;
      return fetchQuest(game, name, STRIPED_ONE, {
        offer: ["Poachers came through The Wilds a month back, from over the water, with a tiger in a cage: a striped cat the size of a horse, from the grasslands beyond the Isles. They're camped at the Wilds' east edge, past the long grass, waiting on a buyer.", "I want the poachers out of my Wilds and the cat out of its cage. Three of them. Then open the cage, if you dare, and come and tell me."],
        accept: "Three poachers, and the cage open. Mind the cat; it's had a bad month.", progress: "Three poachers and the cage open. I can still hear it from here.",
        have: () => data(game, "so_poachers") >= POACHERS && !!data(game, "so_freed"), take: () => {},
        done: ["It followed you back. All the way from the east edge, at a walk, and it's sitting outside my tent now looking at me like I owe it something.", "It'll carry you, since you carried it out. A tiger. There's no stable in the Realm that would have sold you that."],
        reward: () => { earn(game, "tiger", "Fenn whistles, and the tiger gets up from outside his tent and comes to you."); give(player, "coins", 800); xp(game, "slayer", 3000); xp(game, "strength", 1500); },
      });
    }
    case "drake_hunter": {
      if (questDone(game, DRAKE_OF_YOUR_OWN)) return says(pick(game, ["How's the little one? Feed it. It'll grow into the name you give it.", "Drakes up the pass, and Old Cinder asleep in the crater. Never go without a Wyrmward shield; or a dragon of your own, which turns fire the same way."]));
      return fetchQuest(game, name, DRAKE_OF_YOUR_OWN, {
        offer: ["Up by the lava there's a nest, and in it an egg the drakes left when I thinned them last spring. It won't hatch cold, and it won't last another winter up there.", `Clear the drakes off the nest (${NEST_DRAKES} of them roost over it), bring me the egg, and ${HATCHLING_MEAT} cooked meat: a hatchling eats before it opens its eyes. I'll do the rest.`],
        accept: `${NEST_DRAKES} drakes, the egg, ${HATCHLING_MEAT} cooked meat. Don't drop the egg.`, progress: `${NEST_DRAKES} drakes off the nest, the egg, and ${HATCHLING_MEAT} cooked meat.`,
        have: () => data(game, "dy_drakes") >= NEST_DRAKES && has(player, "drake_egg") && has(player, "cooked_meat", HATCHLING_MEAT), take: () => { take(player, "drake_egg", 1); take(player, "cooked_meat", HATCHLING_MEAT); },
        done: ["Warm it by the fire, turn it, warm it again. There. Hear that? That's a shell going.", "A little green one. It'll grow, but not for a long while, and it's decided you're its mother. It'll carry you; it's stronger than it looks, and it hates the cold."],
        reward: () => { earn(game, "little_dragon", "The hatchling eats the lot, looks at you, and climbs onto your shoulders, then down to stand at your side."); give(player, "coins", 800); xp(game, "slayer", 3000); xp(game, "firemaking", 2000); },
      });
    }
  }
  return null;
}
/** Kills the quests count: the three poachers (bandits at their camp), and the drakes over the nest (in Wyrmreach). */
export function onMountKill(game: Game, monsterId: string, x: number, y: number) {
  onQuestMountKill(game, monsterId, x, y);
  if (monsterId === "bandit" && stage(game, STRIPED_ONE) === 1 && x >= POACHER_CAMP.x0 && x <= POACHER_CAMP.x1 && y >= northShift(POACHER_CAMP.y0) && y <= northShift(POACHER_CAMP.y1)) {
    const n = data(game, "so_poachers") + 1; game.player.questData.so_poachers = n;
    if (n === POACHERS) say(game, "That's the three poachers. The cage is yours to open; the tiger's been waiting.");
  }
  if ((monsterId === "ash_drake" || monsterId === "cinder_drake") && stage(game, DRAKE_OF_YOUR_OWN) === 1 && regionAt(game.world, x, y).id === "wyrmreach") {
    const n = data(game, "dy_drakes") + 1; game.player.questData.dy_drakes = n;
    if (n === NEST_DRAKES) say(game, "The nest is clear of drakes. The egg's in it, by the lava.");
  }
}
