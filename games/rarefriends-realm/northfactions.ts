/**
 * The north's factions at work (A Place to the North): Oathsworn Hall and the Hearthwardens. Each has a questline that
 * makes you one of theirs, a quarrel inside it that you settle, an activity only its members run (activities.ts: the
 * Barrow Watch, the Road Patrol), and standing earned by both that brings its gear (northfactiongear.ts).
 *
 * The Third Oath (Oathsworn Hall): Hallvard of the Hall refused an order, given under his oath of service, to drive the
 * Ravnsvik families off the skerries where they fish the winter. Brand must judge him at the oath-stone. The player
 * stands the Hall's oldest trial (a grave-ring from the Barrowfield's draugr), hears Hallvard, Asta at Ravnsvik and the
 * jarl's steward Ketil (who gave the order in the jarl's name, paid by a merchant who wanted the fishing), reads the
 * oath Hallvard swore, and speaks at the stone: he broke his oath of service (he's cast out; the order stands), he kept
 * the oath he swore (the stone gets his words for everyone, and Ketil is dismissed), or the Thing should judge (the law
 * voids the order, and Hallvard guards the skerries for a winter).
 *
 * The Long Patrol (the Hearthwardens): livestock and travellers lost on the forest road. Warden Bogdan blames Vargskeld
 * raiders and wants the road barred to westerners. The patrol posts show a giant's single tracks and wolves driven
 * before it; the trail leads to the Cut, where the prince's foreman felled the old firs and woke Likho One-Eye. With the
 * Likho dead, the captain asks who answers for the Cut: the prince pays the villages (Radomir won't thank you), the
 * Wardens take the prince's silver and say nothing (Bogdan's way: the Wardens' gear comes cheaper; the villages go
 * unpaid), or the Circle replants the Cut and the Wardens keep it (the foreman's crew leaves the forest).
 */
import { addXp, give, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import type { WorldObject } from "./world.ts";
import { activityMark } from "./activities.ts";
import { item } from "./data.ts";
import { chat, completeQuest, data, npcSays, stage, type NpcDef, type QuestDef } from "./content.ts";

export const THIRD_OATH = "third_oath", LONG_PATROL = "long_patrol";
/** What was decided (questData.to_choice / lp_choice). */
export const TO_OBEY = 1, TO_TRUE = 2, TO_THING = 3;
export const LP_PRINCE_PAYS = 1, LP_SILVER = 2, LP_REPLANT = 3;
export const TO_ACCOUNTS = [["to_stone", "Read Hallvard's oath on the oath-stone"], ["to_hallvard", "Hear Hallvard out"], ["to_asta", "Ask Asta at Ravnsvik about the skerries"], ["to_ketil", "Ask Steward Ketil in Skarnholm who gave the order"]] as const;
export const LP_POSTS = [["lp_post1", "Check the first patrol post, east of Hearthwatch"], ["lp_post2", "Check the second patrol post"], ["lp_post3", "Check the third patrol post, below Krasnogor"]] as const;

/** Standing's rewards: the gear each faction gives, and at what standing. (Taking the prince's silver lowers the Wardens' by 10, and keeping the true chart the Farwake's, the guild's.) */
export const STANDING_GEAR: Record<string, readonly (readonly [string, number])[]> = {
  oathsworn: [["oathsworn_shield", 20], ["oath_helm", 50]],
  hearthwardens: [["hearthwarden_spear", 20], ["hearthwarden_cloak", 50]],
  farwake: [["farwake_sea_cloak", 20], ["farwake_sea_boots", 50]],
  freeholds: [["compact_hammer", 20], ["miners_helm", 50]],
};
/** Getting a lost piece back costs this. */
export const REPLACE_FEE = 2000;
export const standingOf = (game: Game, faction: string) => game.player.standing[faction] ?? 0;
const gearNeeds = (game: Game, faction: string, need: number) => (faction === "hearthwardens" && data(game, "lp_choice") === LP_SILVER) || (faction === "farwake" && data(game, "fc_choice") === 3) ? need - 10 : need;
export const cleanStanding = (raw: unknown): Record<string, number> => Object.fromEntries(Object.entries(raw && typeof raw === "object" ? raw as Record<string, unknown> : {})
  .filter(([id, v]) => id in STANDING_GEAR && typeof v === "number" && Number.isFinite(v)).map(([id, v]) => [id, Math.max(0, Math.min(1e6, Math.floor(v as number)))]));

const flag = (game: Game, key: string) => { game.player.questData[key] = 1; };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const to = (game: Game) => data(game, "to_step"), lp = (game: Game) => data(game, "lp_step");
const toChoice = (game: Game) => data(game, "to_choice"), lpChoice = (game: Game) => data(game, "lp_choice");
const inTo = (game: Game, step: number) => stage(game, THIRD_OATH) === 1 && to(game) === step;
const inLp = (game: Game, step: number) => stage(game, LONG_PATROL) === 1 && lp(game) === step;

// ---------- The people ----------
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: 9, seed }, ...extra });
export const FACTION_NPCS: Record<string, NpcDef> = {
  oathsworn_hallvard: person("oathsworn_hallvard", "Hallvard of the Hall", "An Oathsworn warrior with his shield turned face-down at his feet, waiting to be judged. He doesn't look sorry.", 2145, { gone: game => toChoice(game) === TO_OBEY }),
  steward_ketil: person("steward_ketil", "Steward Ketil", "Keeps the jarl's accounts and seals, and sometimes uses them. Very well dressed for a steward.", 2146, { gone: game => toChoice(game) === TO_TRUE }),
  warden_bogdan: person("warden_bogdan", "Warden Bogdan", "A Hearthwarden of twenty years, broad as a door. He has opinions about westerners, and about who should pay the Wardens.", 2147),
  foreman_stanimir: person("foreman_stanimir", "Foreman Stanimir", "The prince's woodcutting foreman, sawdust in his beard. The old firs came down on his word.", 2148, { gone: game => lpChoice(game) === LP_REPLANT }),
};

// ---------- The quests ----------
export const FACTION_QUESTS: readonly QuestDef[] = [
  {
    id: THIRD_OATH, name: "The Third Oath", points: 2, difficulty: "Experienced",
    start: "Talk to Oathmaster Brand at Oathsworn Hall.",
    requirements: ["Combat 45 recommended (the Barrowfield's draugr)"],
    rewards: ["2 Quest Points", "5,000 Attack XP", "3,000 Strength XP", "Sworn to Oathsworn Hall: the Barrow Watch and standing with the Hall"],
    journal: game => {
      const s = stage(game, THIRD_OATH), at = to(game), c = toChoice(game);
      if (s === 0) return ["Oathmaster Brand at Oathsworn Hall has someone to judge, and would rather not do it alone."];
      if (at === 1) return ["Hallvard of the Hall refused an order given under his oath of service. Brand will judge him at the oath-stone, and will hear a stranger only if the stranger stands the Hall's oldest trial.", mark(has(game.player, "grave_ring"), "Bring a grave-ring up from the Barrowfield's draugr"), "• Give it to Brand"];
      if (at === 2) return ["The order was to drive the Ravnsvik families off the skerries where they fish the winter. Before the judgement:", ...TO_ACCOUNTS.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 3) return ["Steward Ketil gave the order in the jarl's name, paid by a merchant who wanted the skerries' fishing; the jarl never knew. Hallvard swore to fight for the Hall \"when the Hall is right\".", "• Speak at the oath-stone: talk to Oathmaster Brand"];
      return [c === TO_OBEY ? "I said Hallvard swore service, and broke it. He's gone from the Hall, and the order stands. I'm sworn to the Hall. QUEST COMPLETE!"
        : c === TO_TRUE ? "I said Hallvard kept the oath he swore. His words are cut on the stone for everyone now, and the jarl dismissed Ketil. I'm sworn to the Hall. QUEST COMPLETE!"
          : "I said the Thing should judge. The law voided the order, and Hallvard guards the skerries this winter. I'm sworn to the Hall. QUEST COMPLETE!"];
    },
  },
  {
    id: LONG_PATROL, name: "The Long Patrol", points: 2, difficulty: "Experienced",
    start: "Talk to Hearthwarden-Captain Milena at Hearthwatch.",
    requirements: ["Combat 55 recommended (Likho One-Eye)"],
    rewards: ["2 Quest Points", "5,000 Defence XP", "3,000 Strength XP", "Sworn to the Hearthwardens: the Road Patrol and standing with the Wardens"],
    journal: game => {
      const s = stage(game, LONG_PATROL), at = lp(game), c = lpChoice(game);
      if (s === 0) return ["Captain Milena at Hearthwatch has a road that's losing travellers, and a warden who's sure he knows why."];
      if (at === 1) return ["Livestock and travellers are going missing on the forest road. Warden Bogdan blames Vargskeld raiders. Captain Milena wants the patrol walked first.", ...LP_POSTS.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 2) return ["Not raiders: a giant's single footprints, wolves driven before it, and a trail to the Cut, south of Krasnogor, where the old firs came down.", mark(!!data(game, "lp_foreman"), "Ask the foreman at the Cut what happened"), mark(has(game.player, "likho_eye") || !!data(game, "lp_likho"), "Put down whatever came out of the old firs"), "• Report to Captain Milena"];
      if (at === 3) return ["Likho One-Eye is dead. The prince's foreman felled the old firs and woke it. Somebody has to answer for the Cut.", "• Talk to Captain Milena"];
      return [c === LP_PRINCE_PAYS ? "I said the prince should pay. Radomir paid the villages for every cow and every traveller; he won't thank me. I'm sworn to the Hearthwardens. QUEST COMPLETE!"
        : c === LP_SILVER ? "I said the Wardens should take the prince's silver and say nothing. Their gear comes cheaper now; the villages went unpaid. I'm sworn to the Hearthwardens. QUEST COMPLETE!"
          : "I said the Circle should replant the Cut, and the Wardens keep it. The foreman's crew left the forest. I'm sworn to the Hearthwardens. QUEST COMPLETE!"];
    },
  },
];
function finish(game: Game, id: string, key: string, choice: number) {
  const p = game.player; p.questData[key] = choice;
  if (id === THIRD_OATH) { flag(game, "oath_member"); addXp(game, "attack", 5000, { raw: true }); addXp(game, "strength", 3000, { raw: true }); p.standing.oathsworn = (p.standing.oathsworn ?? 0) + 10; }
  else { flag(game, "warden_member"); addXp(game, "defence", 5000, { raw: true }); addXp(game, "strength", 3000, { raw: true }); p.standing.hearthwardens = (p.standing.hearthwardens ?? 0) + 10; }
  completeQuest(game, id);
}

/** The standing talk: where you stand, and the gear it's earned (each piece once; a lost one replaced for a fee). */
export function standingTalk(game: Game, name: string, faction: string, usual: () => Dialogue | null): Dialogue {
  const now = standingOf(game, faction), p = game.player;
  const options: NonNullable<Dialogue["options"]> = [];
  for (const [id, need] of STANDING_GEAR[faction]) {
    const needs = gearNeeds(game, faction, need), key = `gear_${id}`, given = !!data(game, key);
    if (now < needs) continue;
    if (!given) options.push({ label: `I've earned the ${itemName(id)}.`, then: () => { give(p, id, 1); flag(game, key); say(game, `You're given the ${itemName(id)}.`); return null; } });
    else if (!has(p, id) && p.equipment[slotOf(id) as keyof typeof p.equipment] !== id) options.push({ label: `I've lost my ${itemName(id)} (${REPLACE_FEE.toLocaleString()} Frens).`, then: () => { if (!take(p, "coins", REPLACE_FEE)) { message(game, `A new one costs ${REPLACE_FEE.toLocaleString()} Frens.`, "warn"); return null; } give(p, id, 1); say(game, `You're given a new ${itemName(id)}.`); return null; } });
  }
  const next = STANDING_GEAR[faction].map(([id, need]) => [id, gearNeeds(game, faction, need)] as const).find(([, need]) => now < need);
  return chat(name, npcSays(name, `Your standing with us: ${now}.${next ? ` At ${next[1]}, the ${itemName(next[0])}.` : ""}`), [...options, { label: "Something else.", then: () => usual() }]);
}
const itemName = (id: string) => item(id).name;
const slotOf = (id: string) => item(id).equip?.slot ?? "weapon";

/** The factions' people. Null when there's nothing of theirs to say (and the north's own talk runs). */
export function talkNorthFactions(game: Game, npcId: string, name: string, usual: () => Dialogue | null): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const more = (lines: string[], options: Dialogue["options"] = []) => chat(name, npcSays(name, ...lines), [...(options ?? []), { label: "Something else.", then: () => usual() }]);
  const ask = (lines: string[], label: string, reply: string[], key: string) => more(lines, [{ label, then: () => { flag(game, key); checkAccounts(game); return says(...reply); } }]);
  const so = stage(game, THIRD_OATH), at = to(game), co = toChoice(game), sp = stage(game, LONG_PATROL), ap = lp(game), cp = lpChoice(game);
  switch (npcId) {
    case "oathmaster_brand": {
      if (so === 0) return more(["Hallvard of the Hall refused an order. Given under his oath of service, through the jarl's seal. Tomorrow I judge him at the stone, and whatever I say, half the Hall will say I'm wrong."], [
        { label: "Let me speak at the stone.", then: () => chat(name, npcSays(name, "A stranger speaks at the stone if the stranger has stood the Hall's oldest trial. Go down to the Barrowfield, south-west of here, and bring me a grave-ring off a draugr. Then we'll see."), undefined, () => {
          game.player.quests[THIRD_OATH] = 1; game.player.questData.to_step = 1; say(game, "Quest started: The Third Oath.");
        }) },
        { label: "Not now.", then: () => null }]);
      if (so === 1 && at === 1) return has(game.player, "grave_ring") ? chat(name, npcSays(name, "Cold, isn't it. They always are. You've stood the trial.", "The order was to clear the Ravnsvik families off the skerries, where they fish the winter. Hallvard refused. Read what he swore, on the stone. Hear him, and the families, and whoever gave the order. Then come and speak."), undefined, () => {
        take(game.player, "grave_ring", 1); game.player.questData.to_step = 2; say(game, "The trial's stood. Now the oath, the man, the families and the order.");
      }) : more(["The Barrowfield, south-west of the Hall. A grave-ring off a draugr. They don't give them up."]);
      if (so === 1 && at === 2) return more(["The stone, Hallvard, the families, and whoever gave the order. Then speak."]);
      if (so === 1 && at === 3) return chat(name, npcSays(name, "The Hall's gathered at the stone. Hallvard's shield is face-down at his feet. Speak, then: did he break his oath?"), [
        { label: "He swore service. He broke it.", then: () => chat(name, npcSays(name, "Then he goes. An oath of service is an oath, and the Hall can't keep people who choose which orders they'll take. The order stands; I'll not like it."), undefined, () => { finish(game, THIRD_OATH, "to_choice", TO_OBEY); say(game, "Hallvard is cast out of the Hall. You're sworn to it."); }) },
        { label: "He kept the oath he swore. The order wasn't the Hall's.", then: () => chat(name, npcSays(name, "\"When the Hall is right.\" Then the Hall had better be right. I'll have his words cut on the stone, for every oath after his. And the jarl will hear about her steward."), undefined, () => { finish(game, THIRD_OATH, "to_choice", TO_TRUE); say(game, "Hallvard keeps his place, and his words go on the stone. Ketil is dismissed. You're sworn to the Hall."); }) },
        { label: "The Hall shouldn't judge its own. Let the Thing.", then: () => chat(name, npcSays(name, "The Hall has judged its own since there was a Hall. But the law's the law, and Signy knows it better than I do. Very well: the Thing."), undefined, () => { finish(game, THIRD_OATH, "to_choice", TO_THING); say(game, "The Thing voids the order. Hallvard guards the skerries for a winter. You're sworn to the Hall."); }) },
        { label: "Not yet.", then: () => null }]);
      if (so >= 2) return more([co === TO_OBEY ? "The Hall's stricter for it. Fewer of them, and they all do what they're told." : co === TO_TRUE ? "Every new oath is sworn with his words in it now. The young ones say them louder than the rest." : "The Thing ruled, and the Hall abides by it. I'd still rather we'd judged our own."], [
        { label: "My standing with the Hall.", then: () => standingTalk(game, name, "oathsworn", usual) }]);
      return null;
    }
    case "oathsworn_hallvard":
      if (inTo(game, 2) && !data(game, "to_hallvard")) return ask(["Come to look at the oathbreaker?"], "Why did you refuse?",
        ["I swore to fight for the Hall when the Hall is right. Look at the stone: those are my words. The order came with the jarl's seal on it, and it said to put forty families off the only fishing they have in winter.", "That isn't the Hall being right. That's somebody being paid. I'll take whatever Brand gives me. I won't take that order."], "to_hallvard");
      if (so >= 2) return says(co === TO_TRUE ? "My words on the stone. I never meant them for anyone but me." : "I'm off to the skerries for the winter. Cold work, but it's the right side of the argument.");
      return null;
    case "ravnsvik_netmender":
      if (inTo(game, 2) && !data(game, "to_asta")) return ask(["Mending, always mending."], "What would losing the skerries mean?",
        ["The skerries are where the cod come in winter. Forty families fish them; without them we eat what we salted in the autumn, and it never lasts.", "The order said a merchant from the south has the rights now. Nobody asked us. Nobody here has ever been asked."], "to_asta");
      if (so >= 2) return says(co === TO_OBEY ? "The merchant's boats are on the skerries now. We'll manage. We always manage. I don't forgive." : "The skerries are ours again. Hallvard's welcome at any fire in Ravnsvik.");
      return null;
    case "steward_ketil":
      if (inTo(game, 2) && !data(game, "to_ketil")) return ask(["The jarl's busy. I'm the jarl's steward. What is it?"], "Who gave the order about the skerries?",
        ["I did. Under the jarl's seal, which is what the seal is for. A merchant paid well for the fishing rights, and the jarl's treasury needed it.", "Did she know? She signs what I put in front of her. It's a large hall, and a long winter."], "to_ketil");
      if (so >= 2) return says(co === TO_OBEY ? "The order stood. I knew it would." : "The Thing fined me a year's wages. I've paid. Don't look so pleased.");
      return null;
    case "jarl_hallveig":
      if (so >= 2 && co === TO_TRUE) return more(["My own steward, selling my people's winter under my own seal. I've a new steward, and I read everything now."]);
      return null;
    case "lawspeaker_signy":
      if (so >= 2 && co === TO_THING) return more(["An order against the law is no order, whoever's seal is on it. The Thing said so aloud, so nobody can forget it."]);
      return null;
    case "hearthwarden_captain": {
      if (sp === 0) {
        return more(["Cows gone from the forest farms, and two travellers this month who never reached Krasnogor. Bogdan says Vargskeld raiders and wants the road barred to anyone from the west. I want the patrol walked first."], [
          { label: "I'll walk the patrol.", then: () => chat(name, npcSays(name, "Three posts on the road to Krasnogor, each with its marker. Look at the ground round every one. Then tell me who's doing this."), undefined, () => {
            game.player.quests[LONG_PATROL] = 1; game.player.questData.lp_step = 1; say(game, "Quest started: The Long Patrol.");
          }) },
          { label: "Not now.", then: () => null }]);
      }
      if (sp === 1 && ap === 1) return more(["Three posts, east along the road. Look at the ground."]);
      if (sp === 1 && ap === 2) return more(["One footprint the size of a cart, and wolves running ahead of it? Then it isn't raiders. Find the thing, and the reason it's out."]);
      if (sp === 1 && ap === 3) return chat(name, npcSays(name, "Likho One-Eye. My grandmother told stories about it to keep us out of the old firs. And the prince's foreman cut them down.", "Bogdan's here, and the village headmen. Somebody answers for the Cut. Who?"), [
        { label: "The prince. He pays the villages.", then: () => chat(name, npcSays(name, "Then I'll take it to the Terem myself, with the headmen and the eye. Radomir will pay. He won't love us for it."), undefined, () => { finish(game, LONG_PATROL, "lp_choice", LP_PRINCE_PAYS); say(game, "The prince pays the villages. You're sworn to the Hearthwardens."); }) },
        { label: "Take the prince's silver, and say nothing.", then: () => chat(name, npcSays(name, "Bogdan's way. The Wardens will be better armed for it, and the villages will remember who didn't speak for them. Very well. It's said."), undefined, () => { finish(game, LONG_PATROL, "lp_choice", LP_SILVER); say(game, "The Wardens take the prince's silver. Their gear comes cheaper; the villages go unpaid. You're sworn to the Hearthwardens."); }) },
        { label: "Let the Circle replant the Cut, and the Wardens keep it.", then: () => chat(name, npcSays(name, "Old Dobromir will plant firs he'll never see grown. The foreman's crew can cut somewhere else. And the Wardens will keep the Cut, so nobody cuts it again."), undefined, () => { finish(game, LONG_PATROL, "lp_choice", LP_REPLANT); say(game, "The Circle replants the Cut; the foreman's crew leaves the forest. You're sworn to the Hearthwardens."); }) },
        { label: "Not yet.", then: () => null }]);
      if (sp >= 2) return more([cp === LP_SILVER ? "The prince's silver buys good spears. I try not to think about what else it buys." : cp === LP_PRINCE_PAYS ? "The headmen were paid to the last cow. The road's quiet." : "The Cut's green again, just. The Wardens walk it every week."], [
        { label: "My standing with the Hearthwardens.", then: () => standingTalk(game, name, "hearthwardens", usual) }]);
      return null;
    }
    case "warden_bogdan":
      if (sp === 1 && ap <= 2) return says("Vargskeld raiders. I've seen it before. Bar the road to westerners, and the cows stop going missing. The captain wants proof. I've got twenty years.");
      if (sp === 1 && ap === 3) return says("A giant? From a story? Fine. Fine. I was wrong about the raiders. I'm not wrong about who should be paying for the Wardens.");
      if (sp >= 2) return says(cp === LP_SILVER ? "Paid by the prince, as we should be. Good spears. Good boots. Ask the captain about your standing." : "Twenty years, and I was wrong about the raiders. I can say it. Once.");
      return says("State your business. We'll still help you if it's bad. That's the captain's line, not mine.");
    case "foreman_stanimir":
      if (inLp(game, 2) && !data(game, "lp_foreman")) return chat(name, npcSays(name, "The old firs? The prince wanted new beams for the Terem roof, and they were the biggest. The Circle's old man said something would come out of them. Something did. My men won't come back here."), undefined, () => { flag(game, "lp_foreman"); checkLikho(game); });
      if (sp >= 2) return says(cp === LP_PRINCE_PAYS ? "The prince paid for the cows out of the timber money. The beams are still going on his roof." : "The Wardens walk the Cut now. We cut elsewhere.");
      return says("Mind the stumps. And whatever's in the trees.");
    case "prince_radomir":
      if (sp >= 2 && cp === LP_PRINCE_PAYS) return more(["You made me pay for cows. My foreman cut trees on my land, and I paid for cows. Go away."]);
      return null;
    case "old_bough_keeper":
      if (sp >= 2 && cp === LP_REPLANT) return more(["Fir seedlings in the Cut, a hundred of them. I'll not see them grown. Somebody will."]);
      return null;
  }
  return null;
}
function checkAccounts(game: Game) {
  if (!inTo(game, 2) || !TO_ACCOUNTS.every(([key]) => data(game, key))) return;
  game.player.questData.to_step = 3; say(game, "The oath, the man, the families and the order. Brand is waiting at the stone.");
}
function checkLikho(game: Game) {
  if (!inLp(game, 2) || !data(game, "lp_foreman") || !data(game, "lp_likho")) return;
  game.player.questData.lp_step = 3; say(game, "The Likho is dead, and the foreman's told you why it woke. Captain Milena should hear it.");
}
function checkPosts(game: Game) {
  if (!inLp(game, 1) || !LP_POSTS.every(([key]) => data(game, key))) return;
  game.player.questData.lp_step = 2; say(game, "Not raiders: a giant's tracks, and wolves driven before it, toward the Cut south of Krasnogor.");
}

/** Kills the factions care about: a draugr's grave-ring for the trial; the Likho, for the patrol. */
export function onFactionKill(game: Game, monsterId: string) {
  if (monsterId === "draugr" && inTo(game, 1) && !has(game.player, "grave_ring")) { give(game.player, "grave_ring", 1); say(game, "Among the draugr's bones, a grave-ring, cold as the howe. Take it to Brand."); }
  if (monsterId === "likho" && inLp(game, 2) && !data(game, "lp_likho")) { flag(game, "lp_likho"); give(game.player, "likho_eye", 1); say(game, "Likho One-Eye falls, and the forest goes quiet. You take its eye for the captain."); checkLikho(game); }
}

// ---------- The places ----------
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const post = (key: string, mark: string, text: string): Clue => ({
  options: () => ["Look-at", "Examine"], examine: () => "A Hearthwardens' patrol post: a carved marker, the hearth-and-pass badge on top, the last patrol's notch below it.",
  use: game => {
    activityMark(game, "road_patrol", mark);
    if (inLp(game, 1) && !data(game, key)) { flag(game, key); addXp(game, "agility", 150, { raw: true }); checkPosts(game); return { text }; }
    return { text: "The post's marker, notched by the last patrol. The ground round it's been walked over since." };
  },
});
export const FACTION_CLUES: Record<string, Clue> = {
  oath_stone: {
    options: () => ["Read", "Examine"], examine: game => toChoice(game) === TO_TRUE ? "The oath-stone. Below the names, newly cut, words for every oath sworn after: \"when the Hall is right\"." : "The oath-stone: every name sworn on it, and the oath beside each, in the sworn one's own words.",
    use: game => {
      if (inTo(game, 2) && !data(game, "to_stone")) { flag(game, "to_stone"); checkAccounts(game); }
      return { text: "Among the names, Hallvard's, and his oath beside it in his own cutting: \"I will fight for the Hall, and with the Hall, when the Hall is right.\"" };
    },
  },
  lp_post1: post("lp_post1", "post1", "Wolf tracks, a lot of them, all running east, and in the soft ground beside the road one footprint as long as a cart. Only one. Whatever made it walks on one foot, or very far apart."),
  lp_post2: post("lp_post2", "post2", "A cow's skull, picked clean, and the same single footprint, deeper here. Something carried something heavy east, toward the forest south of Krasnogor."),
  lp_post3: post("lp_post3", "post3", "The tracks turn off the road here, south into the forest, toward the Cut where the prince's men have been felling. The wolves' tracks go round it in a wide ring, as if they were afraid of it too."),
};
