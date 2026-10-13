/**
 * Mounts earned in the wider world (the user's wish, 2026-10-12: "more quest mounts so players can earn them as well as
 * buy them"), one from each of the Realm's peoples (questmountsworld.ts has the places):
 * - The Dawn's Charger: Brother Corwin, the Order of the Dawn's ostler at Dawnhold, after Dawn Against the Hollow. Lay
 *   twenty of the dead to rest with a faith weapon in hand, groom the mare, and she's yours.
 * - The Stag at Dusk: Warden Ysmay of the Order of Dusk, at the Vesperholm abbey in the Silent Peaks. Keep the vigil at
 *   the three stone watchers on the mountain; at the last hour the stag comes down.
 * - The White Calf: Rider-Captain Halzir of the Ouresh, after Salt and Blue Smoke. The calf Bitter-Laugh stole was sold on to
 *   the dune bandits camped in Qeshet: put the three down, cut her hobble, and bring her grain.
 * - Three Tails: Fox-keeper Tamao at the fox shrine on Morishima, after A Thousand Gates. Light the shrine's three
 *   lanterns, test five foxfire vixens, and the three-tailed fox comes to the light.
 */
import { MONSTERS, item, mountDef } from "./data.ts";
import { addXp, count, give, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, data, fetchQuest, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { regionAt } from "./world.ts";
import { LANTERNS, WATCHERS } from "./questmountsworld.ts";

export const DAWNS_CHARGER = "dawns_charger", STAG_AT_DUSK = "stag_at_dusk", WHITE_CALF = "white_calf", THREE_TAILS = "three_tails";
/** The dead a faith weapon lays to rest, the Qeshet bandits, the camel's grain, the vixens. */
export const CHARGER_DEAD = 20, CALF_BANDITS = 3, CALF_GRAIN = 5, FOX_VIXENS = 5;
/** The three stone watchers (clue ids) and the three fox lanterns (questmountsworld.ts places them). */
export { WATCHERS, LANTERNS };

const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const earn = (game: Game, id: string, how: string) => { const mount = mountDef(id)!; if (!game.player.mounts.includes(id)) game.player.mounts.push(id); game.player.lastMount = id; message(game, `${how} ${mount.text}`, "quest"); sound(game, "level"); };
const xp = (game: Game, skill: Parameters<typeof addXp>[1], amount: number) => addXp(game, skill, amount, { raw: true });
const holyArmed = (game: Game) => !!(game.player.equipment.weapon && item(game.player.equipment.weapon).equip?.holy);
const watched = (game: Game) => WATCHERS.filter(id => data(game, id)).length, lit = (game: Game) => LANTERNS.filter(id => data(game, id)).length;
/** The three-tailed fox comes to the light once every lantern burns and the vixens have been tested. */
const foxCame = (game: Game) => stage(game, THREE_TAILS) === 1 && lit(game) === LANTERNS.length && data(game, "tt_vixens") >= FOX_VIXENS;

export const QUEST_MOUNT_NPCS: Record<string, NpcDef> = {
  dawn_ostler: { id: "dawn_ostler", name: "Brother Corwin", examine: "The Order of the Dawn's ostler. Smells of hay and lamp oil, and talks to the horses more than to the knights.", options: ["Talk-to"], art: { family: 0, seed: 146 } },
  dawn_mare: { id: "dawn_mare", name: "White mare", examine: "A white mare in the Order's stall, in the sunrise red. She looks at you as if she's deciding something.", options: ["Talk-to"], art: { family: 0, seed: 1 }, mount: "dawn_charger", gone: game => questDone(game, DAWNS_CHARGER) },
  dusk_warden: { id: "dusk_warden", name: "Warden Ysmay", examine: "A warden of the Order of Dusk, hooded, keeping the abbey on the mountain. She counts the hours under her breath.", options: ["Talk-to"], art: { family: 3, seed: 812 } },
  hobbled_camel: { id: "hobbled_camel", name: "Hobbled camel", examine: "A white camel with a rope hobble on her forelegs, tied to the bandits' tent pole. Young, thin, and furious about it.", options: ["Talk-to"], art: { family: 0, seed: 1 }, mount: "white_camel", gone: game => !!data(game, "wc_freed") },
  fox_keeper: { id: "fox_keeper", name: "Fox-keeper Tamao", examine: "Keeps the fox shrine's lanterns on Morishima. Says the foxes keep her, really.", options: ["Talk-to"], art: { family: 6, seed: 1607 } },
  three_tailed_fox: { id: "three_tailed_fox", name: "Three-tailed fox", examine: "A white fox with three tails, foxfire at each tip. It is looking at you as if you were the one who'd come to see it.", options: ["Talk-to"], art: { family: 0, seed: 1 }, mount: "foxfire_kitsune",
    present: game => foxCame(game) && !data(game, "tt_fox") },
};

export const QUEST_MOUNT_QUESTS: readonly QuestDef[] = [
  {
    id: DAWNS_CHARGER, name: "The Dawn's Charger", points: 1, difficulty: "Experienced", start: "Talk to Brother Corwin, the Order of the Dawn's ostler at Dawnhold, after Dawn Against the Hollow.",
    requirements: ["Dawn Against the Hollow completed", "A faith weapon"], rewards: ["1 Quest Point", "3,000 Faith XP", "1,500 Defence XP", "800 Frens", "The Dawn charger to ride"],
    journal: game => {
      const s = stage(game, DAWNS_CHARGER);
      if (s === 0) return ["Brother Corwin keeps the Order of the Dawn's stable at Dawnhold. There's a white mare in it who won't take a rider."];
      if (s === 1) return ["Corwin says the mare only carries someone who has ridden out the dark: twenty of the dead laid to rest with a faith weapon in hand, and then she wants grooming.",
        mark(data(game, "dc_dead") >= CHARGER_DEAD, `The dead laid to rest with a faith weapon: ${Math.min(CHARGER_DEAD, data(game, "dc_dead"))}/${CHARGER_DEAD}`), mark(!!data(game, "dc_groomed"), "Groom the white mare"), "• Tell Corwin"];
      return ["The white mare took me. The Order calls her a charger; she calls herself nothing, and carries me into the morning. QUEST COMPLETE!"];
    },
  },
  {
    id: STAG_AT_DUSK, name: "The Stag at Dusk", points: 1, difficulty: "Experienced", start: "Talk to Warden Ysmay of the Order of Dusk at the Vesperholm abbey in the Silent Peaks.",
    requirements: ["Combat 60 recommended"], rewards: ["1 Quest Point", "3,000 Ranged XP", "1,500 Faith XP", "800 Frens", "The Dusk stag to ride"],
    journal: game => {
      const s = stage(game, STAG_AT_DUSK);
      if (s === 0) return ["Warden Ysmay keeps the Order of Dusk's abbey on the mountain. She says a stag comes down from the peaks at the last hour, for those who keep the vigil."];
      if (s === 1) return ["Ysmay wants the vigil kept at the three stone watchers on the mountain, the blindfolded ones that move when nobody's looking. Then come back to the abbey at the last hour.",
        mark(watched(game) >= WATCHERS.length, `Vigils kept: ${watched(game)}/${WATCHERS.length}`), "• Tell Ysmay"];
      return ["Three vigils kept, and at the last hour the stag came down the mountain and stood by me. It's violet-dark, silver-horned, and as quiet as the Order. QUEST COMPLETE!"];
    },
  },
  {
    id: WHITE_CALF, name: "The White Calf", points: 1, difficulty: "Experienced", start: "Talk to Rider-Captain Halzir at the Ouresh camp, after Salt and Blue Smoke.",
    requirements: ["Salt and Blue Smoke completed", `${CALF_GRAIN} grain`, "Combat 70 recommended"], rewards: ["1 Quest Point", "3,000 Wayfaring XP", "1,500 Slayer XP", "800 Frens", "The white camel to ride"],
    journal: game => {
      const s = stage(game, WHITE_CALF);
      if (s === 0) return ["Halzir hasn't stopped thinking about the camel calf Bitter-Laugh stole from him two summers ago. Somebody saw a white camel at Qeshet."];
      if (s === 1) return ["The calf was sold on to the dune bandits camped in the ruin of Qeshet, west of the dunes road. Halzir wants the bandits put down, her hobble cut, and grain for her; she'll be thin.",
        mark(data(game, "wc_bandits") >= CALF_BANDITS, `Bandits at Qeshet: ${Math.min(CALF_BANDITS, data(game, "wc_bandits"))}/${CALF_BANDITS}`), mark(!!data(game, "wc_freed"), "Cut the camel's hobble"),
        mark(has(game.player, "grain", CALF_GRAIN), `Grain: ${Math.min(CALF_GRAIN, count(game.player, "grain"))}/${CALF_GRAIN}`), "• Bring them to Halzir"];
      return ["The calf's grown: a white camel, thin from the bandits' keeping and fat again on Halzir's grain. She walked home behind me and decided I was hers. QUEST COMPLETE!"];
    },
  },
  {
    id: THREE_TAILS, name: "Three Tails", points: 1, difficulty: "Experienced", start: "Talk to Fox-keeper Tamao at the fox shrine on Morishima, after A Thousand Gates.",
    requirements: ["A Thousand Gates completed", "A tinderbox", "Combat 40 recommended"], rewards: ["1 Quest Point", "3,000 Magic XP", "1,500 Faith XP", "800 Frens", "The three-tailed fox to ride"],
    journal: game => {
      const s = stage(game, THREE_TAILS);
      if (s === 0) return ["Fox-keeper Tamao says the shrine's lanterns have been dark since the old keeper died, and a fox with three tails used to come to them."];
      if (s === 1) return ["Tamao wants the shrine's three lanterns lit again and five foxfire vixens tested (put down), so the three-tailed fox knows the shrine is kept. Then meet it.",
        mark(lit(game) >= LANTERNS.length, `Lanterns lit: ${lit(game)}/${LANTERNS.length}`), mark(data(game, "tt_vixens") >= FOX_VIXENS, `Vixens tested: ${Math.min(FOX_VIXENS, data(game, "tt_vixens"))}/${FOX_VIXENS}`),
        mark(!!data(game, "tt_fox"), "Meet the three-tailed fox at the shrine"), "• Tell Tamao"];
      return ["The lanterns burn again, and the three-tailed fox came to them, and then to me. Tamao says it chose; I was only there. QUEST COMPLETE!"];
    },
  },
];

/** The stone watchers on the mountain, and the fox shrine's lanterns. */
const watcher = (id: typeof WATCHERS[number]) => ({
  options: () => ["Keep-vigil", "Examine"],
  examine: () => "A stone watcher, carved blindfolded like the Wise Friend, facing down the mountain. The moss on it is on the wrong side, as if it had turned.",
  use: (game: Game) => {
    if (stage(game, STAG_AT_DUSK) !== 1) return { text: "You stand with the watcher a while. Nothing moves. Nothing you see, anyway." };
    if (data(game, id)) return { text: "You've kept the vigil here. The watcher has turned a little further down the mountain." };
    flag(game, id); xp(game, "prayer", 150);
    const n = watched(game);
    say(game, n === WATCHERS.length ? "The third vigil, kept. Ysmay said to come back to the abbey at the last hour." : `A vigil kept at the watcher (${n}/${WATCHERS.length}). When you look back, it's facing you.`);
    return { text: "You keep the vigil in silence, as the Order does. When you look up, the watcher has turned to face you." };
  },
});
const lantern = (id: typeof LANTERNS[number]) => ({
  options: () => ["Light", "Examine"],
  examine: () => "A stone lantern on the path to the fox shrine, cold, with an old fox's paw-print worn into the cap.",
  use: (game: Game) => {
    if (stage(game, THREE_TAILS) !== 1) return { text: "The lantern's cold. Tamao would know whether it ought to be lit." };
    if (data(game, id)) return { text: "It's burning: a small green flame that doesn't flicker when the wind does." };
    if (!has(game.player, "tinderbox")) return { text: "You need a tinderbox to light it." };
    flag(game, id); xp(game, "firemaking", 120);
    const n = lit(game);
    say(game, n === LANTERNS.length ? "All three lanterns burn green. Somewhere up the hill, something with more than one tail stops to look." : `A lantern lit (${n}/${LANTERNS.length}). The flame catches green.`);
    return { text: "The wick takes, and burns green. Foxfire, Tamao would say." };
  },
});
export const QUEST_MOUNT_CLUES: Record<string, { options: () => string[]; examine: () => string; use: (game: Game) => { text: string } }> = {
  ...Object.fromEntries(WATCHERS.map(id => [id, watcher(id)])), ...Object.fromEntries(LANTERNS.map(id => [id, lantern(id)])),
};

export function talkQuestMounts(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  switch (npcId) {
    case "dawn_ostler": {
      if (!questDone(game, "dawn_against_hollow")) return says("The mare? She's not for squires. Not even for most knights. Come back when you've stood against the Hollow with the Order; then we'll see.");
      if (questDone(game, DAWNS_CHARGER)) return says(pick(game, ["How is she? Brush her down after a ride; she likes it more than she lets on.", "The Order's had chargers before her. None of them chose like she does."]));
      return fetchQuest(game, name, DAWNS_CHARGER, {
        offer: ["The white mare in the end stall is Aurora's daughter. Aurora carried the Grandmaster's father into the Hollow and out again. This one has never carried anyone.", `She won't take a rider who hasn't ridden out the dark. Lay ${CHARGER_DEAD} of the dead to rest with a faith weapon in your hand, then groom her. If she lets you, she's yours.`],
        accept: `${CHARGER_DEAD} of the dead, with a faith weapon. Then the brush; she'll tell you if she's willing.`, progress: `${CHARGER_DEAD} of the dead laid to rest with a faith weapon, and then groom her. She's watching.`,
        have: () => data(game, "dc_dead") >= CHARGER_DEAD && !!data(game, "dc_groomed"), take: () => {},
        done: ["She let you. She's never let anyone.", "Take her, then: the Order's charger. She'll carry you into any morning you like."],
        reward: () => { earn(game, "dawn_charger", "Corwin leads the white mare out in the sunrise red, and puts the reins in your hand."); give(player, "coins", 800); xp(game, "prayer", 3000); xp(game, "defence", 1500); },
      });
    }
    case "dawn_mare": {
      if (stage(game, DAWNS_CHARGER) !== 1) return says("The mare looks at you, and then through you, and goes back to her hay.");
      if (data(game, "dc_dead") < CHARGER_DEAD) return says(`She lays her ears back at the brush. Not yet: Corwin said ${CHARGER_DEAD} of the dead, laid to rest with a faith weapon.`);
      if (data(game, "dc_groomed")) return says("She leans into the brush. Corwin will want to know.");
      return chat(name, npcSays(name, "She watches you pick up the brush, and doesn't lay her ears back."), [
        { label: "Groom her.", then: () => { flag(game, "dc_groomed"); say(game, "You groom the white mare, and she lets you. Brother Corwin will want to know."); return says("She leans into the brush, and blows warm air down your neck."); } },
        { label: "Not yet.", then: () => null }]);
    }
    case "dusk_warden": {
      if (questDone(game, STAG_AT_DUSK)) return says(pick(game, ["The last hour is the Order's. The stag keeps it with you now.", "The watchers have turned back up the mountain. They do that, when the vigil's done."]));
      return fetchQuest(game, name, STAG_AT_DUSK, {
        offer: ["The Order keeps the last hour of the day in silence. Up on this mountain, so does something else: a stag, dark as the hour, that comes down to those who keep it properly.", "Keep the vigil at the three stone watchers on the mountain: the blindfolded ones. They'll turn to see who's keeping it. Then come back to me."],
        accept: "Three watchers. Keep it in silence; they can tell.", progress: `${WATCHERS.length - watched(game)} watchers still to keep the vigil with. They're on the mountain, between here and the Blind Shrine.`,
        have: () => watched(game) >= WATCHERS.length, take: () => {},
        done: ["Three. And there: it's the last hour. Look up the path.", "It's come down for you. It'll keep the hour with you now, and walk as quietly as we do."],
        reward: () => { earn(game, "dusk_stag", "At the last hour, a stag comes down the mountain path and stands beside you, silent."); give(player, "coins", 800); xp(game, "ranged", 3000); xp(game, "prayer", 1500); },
      });
    }
    case "hobbled_camel": {
      if (stage(game, WHITE_CALF) !== 1) return says("The camel glares at you. The bandits' hobble is tight, and the bandits are close.");
      if (data(game, "wc_bandits") < CALF_BANDITS) return says("She won't stand still with the bandits about, and they'd rather you left their camel alone.");
      return chat(name, npcSays(name, "The camel stops pulling at the tent pole and looks at your knife."), [
        { label: "Cut the hobble.", then: () => { flag(game, "wc_freed"); say(game, "The hobble parts. The white camel shakes her legs out, spits at the tent, and follows you. Halzir will want her fed."); return says("She spits at the tent, very deliberately, and falls in behind you."); } },
        { label: "Not yet.", then: () => null }]);
    }
    case "ouresh_halzir": {
      // After Salt and Blue Smoke (dynasties.ts), the calf Bitter-Laugh stole; until then, and once she's home, his usual talk.
      if (!questDone(game, "salt_and_smoke") || questDone(game, WHITE_CALF)) return null;
      return fetchQuest(game, name, WHITE_CALF, {
        offer: ["That calf Bitter-Laugh stole: white, she was, the only white one I ever bred. A salt caravan saw a white camel at Qeshet, the dead city west of the road. The dune bandits camp in it now.", `Three of them, the caravan said. Put them down, cut her loose, and bring her ${CALF_GRAIN} grain: they'll have starved her. Do that and she's yours. She never was really mine; she was always going to be somebody's.`],
        accept: `Three bandits, her hobble, ${CALF_GRAIN} grain. Mind her: she spits.`, progress: `Qeshet: three bandits, her hobble, and ${CALF_GRAIN} grain for her. She'll be thin.`,
        have: () => data(game, "wc_bandits") >= CALF_BANDITS && !!data(game, "wc_freed") && has(player, "grain", CALF_GRAIN), take: () => take(player, "grain", CALF_GRAIN),
        done: ["That's her. That's her! Look at her, she's grown, she's thin, she spat at me. That's her.", "She's yours. She followed you all the way from Qeshet, and a camel doesn't follow anyone she hasn't decided on."],
        reward: () => { earn(game, "white_camel", "Halzir feeds her the grain by the handful, and hands you her lead rope."); give(player, "coins", 800); xp(game, "agility", 3000); xp(game, "slayer", 1500); },
      });
    }
    case "fox_keeper": {
      if (!questDone(game, "thousand_gates")) return says("The foxes test everyone who comes up the hill. Kon has a thousand gates for you first; then come and see me.");
      if (questDone(game, THREE_TAILS)) return says(pick(game, ["The lanterns haven't gone out since. The foxes come every night now.", "It chose you. I was only there to light the way."]));
      return fetchQuest(game, name, THREE_TAILS, {
        offer: ["The shrine's three lanterns have been dark since the old keeper died. When they burned, a fox with three tails came to them. I've never seen it; she had.", `Light them (you'll want a tinderbox), and test ${FOX_VIXENS} of the foxfire vixens, so the foxes know the shrine is kept again. Then wait by the shrine. If it comes, it comes to whoever lit them.`],
        accept: `Three lanterns, ${FOX_VIXENS} vixens, and then you wait. Foxes are never in a hurry.`, progress: `${LANTERNS.length - lit(game)} lanterns dark, ${Math.max(0, FOX_VIXENS - data(game, "tt_vixens"))} vixens to test. Then wait for it by the shrine.`,
        have: () => !!data(game, "tt_fox"), take: () => {},
        done: ["It came. It came to you. Three tails, and green fire at every tip.", "It's chosen you; I can see it from here. Go on. It's never carried anyone, and it's been waiting for someone to ask."],
        reward: () => { earn(game, "foxfire_kitsune", "The three-tailed fox steps out from behind the shrine stone and kneels for you."); give(player, "coins", 800); xp(game, "magic", 3000); xp(game, "prayer", 1500); },
      });
    }
    case "three_tailed_fox": {
      if (!foxCame(game) || data(game, "tt_fox")) return null;
      flag(game, "tt_fox"); say(game, "The three-tailed fox circles you once, and sits. Tamao will want to hear it came.");
      return says("It circles you once, three tails trailing green fire, and sits at your feet as if it had always meant to.");
    }
  }
  return null;
}

/** Kills the quests count: the dead with a faith weapon in hand, the bandits in Qeshet, the vixens. */
export function onQuestMountKill(game: Game, monsterId: string, x: number, y: number) {
  const bump = (key: string, goal: number, done: string) => { const n = data(game, key) + 1; game.player.questData[key] = n; if (n === goal) say(game, done); };
  if (stage(game, DAWNS_CHARGER) === 1 && MONSTERS[monsterId]?.undead && holyArmed(game) && data(game, "dc_dead") < CHARGER_DEAD) bump("dc_dead", CHARGER_DEAD, `${CHARGER_DEAD} of the dead laid to rest. The white mare at Dawnhold is waiting for the brush.`);
  if (monsterId === "bandit" && stage(game, WHITE_CALF) === 1 && regionAt(game.world, x, y).id === "qeshet" && data(game, "wc_bandits") < CALF_BANDITS) bump("wc_bandits", CALF_BANDITS, "That's the three bandits. The white camel's at their tent; cut her hobble.");
  if (monsterId === "foxfire_vixen" && stage(game, THREE_TAILS) === 1 && data(game, "tt_vixens") < FOX_VIXENS) bump("tt_vixens", FOX_VIXENS, `${FOX_VIXENS} vixens tested. When the lanterns burn, wait by the shrine.`);
}
