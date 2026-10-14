/**
 * The north's last two organizations (A Place to the North): the Redwake Companies (the Vargskeld's mercenary bands,
 * each with a code of its own) and the Dawn Archive (the Zoryavik's historians, who keep every chronicle and every one
 * that disagrees). As with the guilds (northguilds.ts): a questline that makes you one of theirs, a quarrel inside it
 * you settle, a members' activity paid in standing (the Redwake Contract, the Archive's Rubbings: activities.ts), and the
 * gear standing brings.
 *
 * The Red Wave (the Redwake): Captain Ulfa's company has a contract from the jarls to open the Oathgate road. Someone
 * in Krasnogor has hired another company, the Greyhide, to hold it shut, and Bjarte Half-Hand, who rode with the
 * Redwake for twenty years, rides with the Greyhide now. The Redwake's code says a company never takes a contract against
 * its own; the Greyhide's says the contract is everything. The player reads the Greyhide's contract, hears Bjarte and
 * Captain Hrolf, and tells Ulfa what the Redwake does: keep the code and fight for the road (Bjarte falls), make one
 * contract of the two (the companies hold the road together, and the Redwake's gear comes cheaper to its own), or tear
 * the contract up and walk (no company bleeds for princes; the Redwake sells off its spare kit, and the jarls are angry).
 *
 * The Fourth Copy (the Dawn Archive): the Oathgate chronicle, the account of the old agreement, survives in three copies
 * that disagree about who keeps the western pass. Archivist Bozhena wants the first. The player reads the Archive's
 * copy, the princes' copy in the Terem at Krasnogor (it takes Presence to be let near it), and hears the Vargskeld
 * skald's verse; then finds the first copy, in the iron-bound chest in the Oathgate's ruined fort, in a hand only Mysteries
 * can read. It says both: the pass was to be kept by both, and every later copy cut out the half that suited the other.
 * Bozhena asks what the Archive does with it: publish it for both sides to read, shelve it with the others (the Archive
 * keeps; it doesn't decide; its robes come cheaper to its own), or give it to Prince Radomir (paid in silver; the copyist
 * who found the fourth copy wrong leaves the Archive over it).
 */
import { addXp, give, has, level, message, sound, take, type Dialogue, type Game } from "./state.ts";
import type { WorldObject } from "./world.ts";
import { activityMark } from "./activities.ts";
import { chat, completeQuest, data, npcSays, stage, type NpcDef, type QuestDef } from "./content.ts";
import { standingTalk } from "./northfactions.ts";

export const RED_WAVE = "red_wave", FOURTH_COPY = "fourth_copy";
export const RW_CODE = 1, RW_JOINT = 2, RW_WALK = 3;
export const DC_PUBLISH = 1, DC_SHELVE = 2, DC_PRINCE = 3;
export const RW_PROOF = [["rw_contract", "Read the Greyhide's contract on their wagon"], ["rw_bjarte", "Talk to Bjarte Half-Hand in the Greyhide camp"], ["rw_hrolf", "Ask Captain Hrolf of the Greyhide what his code says"]] as const;
export const DC_COPIES = [["dc_archive", "Read the Archive's copy of the Oathgate chronicle"], ["dc_princes", "Read the princes' copy in the Terem at Krasnogor"], ["dc_verse", "Hear the Vargskeld verse from the skald at Embermoot"]] as const;
/** What it takes to be let near the princes' copy, and to read the first one's hand. */
export const PRINCES_PRESENCE = 30, FIRST_MYSTERIES = 30;
/** The silver Prince Radomir pays for the first copy. */
export const PRINCE_PAYS = 8000;

const flag = (game: Game, key: string) => { game.player.questData[key] = 1; };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const rw = (game: Game) => data(game, "rw_step"), dc = (game: Game) => data(game, "dc_step");
const rwChoice = (game: Game) => data(game, "rw_choice"), dcChoice = (game: Game) => data(game, "dc_choice");
const inRw = (game: Game, step: number) => stage(game, RED_WAVE) === 1 && rw(game) === step;
const inDc = (game: Game, step: number) => stage(game, FOURTH_COPY) === 1 && dc(game) === step;

const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: 9, seed }, ...extra });
export const COMPANY_NPCS: Record<string, NpcDef> = {
  greyhide_captain: person("greyhide_captain", "Captain Hrolf of the Greyhide", "Captain of the Greyhide company: a grey wolfskin over his mail and a contract in his fist. The Greyhide's code is one line long.", 2151),
  greyhide_sellsword: person("greyhide_sellsword", "Greyhide sellsword", "A Greyhide sword, the grey wolf on the shield. Paid by the day, and counting.", 2152),
  bjarte_half_hand: person("bjarte_half_hand", "Bjarte Half-Hand", "Twenty years with the Redwake, three fingers short and a grey wolfskin newly on his back. He doesn't meet your eye.", 2153, { gone: game => rwChoice(game) === RW_CODE }),
};

export const COMPANY_QUESTS: readonly QuestDef[] = [
  {
    id: RED_WAVE, name: "The Red Wave", points: 2, difficulty: "Experienced",
    start: "Talk to Captain Ulfa at the Redwake camp, below the Oathgate.",
    requirements: ["Attack 40 recommended", "The Greyhide camp is on the Oathgate road, east of the Redwake's"],
    rewards: ["2 Quest Points", "6,000 Attack XP", "3,000 Strength XP", "Signed to the Redwake: the Redwake Contract and standing with the company"],
    journal: game => {
      const s = stage(game, RED_WAVE), at = rw(game), c = rwChoice(game);
      if (s === 0) return ["Captain Ulfa of the Redwake has a contract to open the Oathgate road, and another company camped across it."];
      if (at === 1) return ["The jarls pay the Redwake to open the Oathgate road; someone has paid the Greyhide company to hold it shut. Bjarte Half-Hand, twenty years a Redwake, rides with the Greyhide now. Ulfa wants to know what she's up against.", ...RW_PROOF.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 2) return ["The Greyhide are paid from Krasnogor to hold the road until the Redwake breaks, and Bjarte is among them. Ulfa should hear it, and decide.", "• Talk to Captain Ulfa"];
      return [c === RW_CODE ? "I told Ulfa to keep the code and fight for the road. The Redwake opened it; Bjarte fell on the Greyhide's side. I'm signed to the Redwake. QUEST COMPLETE!"
        : c === RW_JOINT ? "I told Ulfa to make one contract of the two. The companies hold the road together and split the pay; the Redwake's gear comes cheaper to its own. I'm signed to the Redwake. QUEST COMPLETE!"
          : "I told Ulfa to tear up the contract and walk. No company bleeds for the princes' quarrel; the jarls are furious, and the Redwake sells off its spare kit. I'm signed to the Redwake. QUEST COMPLETE!"];
    },
  },
  {
    id: FOURTH_COPY, name: "The Fourth Copy", points: 2, difficulty: "Experienced",
    start: "Talk to Archivist Bozhena at the Dawn Archive in Svetloye.",
    requirements: [`Presence ${PRINCES_PRESENCE}`, `Mysteries ${FIRST_MYSTERIES}`],
    rewards: ["2 Quest Points", "6,000 Mysteries XP", "3,000 Presence XP", "Sworn to the Dawn Archive: the Archive's Rubbings and standing with the Archive"],
    journal: game => {
      const s = stage(game, FOURTH_COPY), at = dc(game), c = dcChoice(game);
      if (s === 0) return ["Archivist Bozhena of the Dawn Archive, at Svetloye, has three copies of one chronicle, and they don't agree."];
      if (at === 1) return ["The Oathgate chronicle, the account of the old agreement, survives in three copies, and each gives the western pass to someone else. Bozhena wants them compared.", ...DC_COPIES.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 2) return ["Every copy cut something. The copyist says the first copy went up to the Oathgate with the people who swore it, and never came back down.", mark(has(game.player, "first_chronicle"), `Search the Oathgate's ruined fort for the first copy (Mysteries ${FIRST_MYSTERIES} to read its hand)`)];
      if (at === 3) return ["The first copy says the pass was to be kept by both, and every later copy cut out the half that suited the other side. Bozhena should see it.", "• Talk to Archivist Bozhena"];
      return [c === DC_PUBLISH ? "I told Bozhena to publish the first copy. Both sides can read what they swore. Both are embarrassed. I'm sworn to the Dawn Archive. QUEST COMPLETE!"
        : c === DC_SHELVE ? "I told Bozhena to shelve it with the others. The Archive keeps; it doesn't decide. Its robes come cheaper to its own. I'm sworn to the Dawn Archive. QUEST COMPLETE!"
          : "I told Bozhena to give it to Prince Radomir. He paid in silver. The copyist left the Archive over it. I'm sworn to the Dawn Archive. QUEST COMPLETE!"];
    },
  },
];
function finish(game: Game, id: string, key: string, choice: number) {
  const p = game.player; p.questData[key] = choice;
  if (id === RED_WAVE) { flag(game, "redwake_member"); addXp(game, "attack", 6000, { raw: true }); addXp(game, "strength", 3000, { raw: true }); p.standing.redwake = (p.standing.redwake ?? 0) + 10; }
  else { flag(game, "archive_member"); addXp(game, "mysteries", 6000, { raw: true }); addXp(game, "presence", 3000, { raw: true }); p.standing.dawn_archive = (p.standing.dawn_archive ?? 0) + 10; take(p, "first_chronicle", 1); if (choice === DC_PRINCE) give(p, "coins", PRINCE_PAYS); }
  completeQuest(game, id);
}
function checkProof(game: Game) {
  if (!inRw(game, 1) || !RW_PROOF.every(([key]) => data(game, key))) return;
  game.player.questData.rw_step = 2; say(game, "Paid from Krasnogor to hold the road till the Redwake breaks, and Bjarte among them. Ulfa should hear it.");
}
function checkCopies(game: Game) {
  if (!inDc(game, 1) || !DC_COPIES.every(([key]) => data(game, key))) return;
  game.player.questData.dc_step = 2; say(game, "Three copies, three western passes. The copyist at the scriptorium might know where the first one went.");
}

/** The companies' and the Archive's people. Null when there's nothing of theirs to say (and the next talk in the north's chain runs). */
export function talkNorthCompanies(game: Game, npcId: string, name: string, usual: () => Dialogue | null): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const more = (lines: string[], options: Dialogue["options"] = []) => chat(name, npcSays(name, ...lines), [...(options ?? []), { label: "Something else.", then: () => usual() }]);
  const sr = stage(game, RED_WAVE), ar = rw(game), cr = rwChoice(game), sd = stage(game, FOURTH_COPY), ad = dc(game), cd = dcChoice(game);
  switch (npcId) {
    case "redwake_captain": {
      if (sr === 0) return more(["The jarls have paid the Redwake to open the Oathgate road, and somebody's paid the Greyhide to hold it shut. They're camped across it, east of us. And Bjarte Half-Hand is with them: twenty years in my company, and now he wears a grey wolf."], [
        { label: "I'll find out what you're up against.", then: () => chat(name, npcSays(name, "Read their contract; the Greyhide nail theirs to the wagon, proud of it. Talk to Bjarte, if he'll talk. And ask Hrolf what his code says. It's short."), undefined, () => {
          game.player.quests[RED_WAVE] = 1; game.player.questData.rw_step = 1; say(game, "Quest started: The Red Wave.");
        }) },
        { label: "Not now.", then: () => null }]);
      if (sr === 1 && ar === 1) return more(["Their contract, Bjarte, and Hrolf's code. East along the road."]);
      if (sr === 1 && ar === 2) return chat(name, npcSays(name, "Krasnogor's silver, to hold the road until we break. And Bjarte with them, knowing it. The code says we finish a contract, and we never take one against our own. Bjarte made himself not our own. Or did he?", "You've seen both camps. What does the Redwake do?"), [
        { label: "Keep the code. Finish the contract; fight for the road.", then: () => chat(name, npcSays(name, "The code, then. We open the road, whoever's on it. I'll tell Bjarte myself, before."), undefined, () => { finish(game, RED_WAVE, "rw_choice", RW_CODE); say(game, "The Redwake opened the Oathgate road. Bjarte fell on the Greyhide's side. You're signed to the Redwake."); }) },
        { label: "Make one contract of the two. Hold the road together.", then: () => chat(name, npcSays(name, "One road, two companies, one contract, and the pay split down the middle. Hrolf will haggle. Hrolf always haggles. But no Redwake kills a Redwake, even a grey one."), undefined, () => { finish(game, RED_WAVE, "rw_choice", RW_JOINT); say(game, "The Redwake and the Greyhide hold the Oathgate road together. You're signed to the Redwake."); }) },
        { label: "Tear it up and walk. No company bleeds for princes.", then: () => chat(name, npcSays(name, "We give back the jarls' silver, and they'll curse us for a generation. Fine. The company lives to read another contract. We'll sell the spare kit to pay for the walk."), undefined, () => { finish(game, RED_WAVE, "rw_choice", RW_WALK); say(game, "The Redwake tore up its contract and walked. The jarls are furious; the company's spare kit is for sale. You're signed to the Redwake."); }) },
        { label: "Not yet.", then: () => null }]);
      if (sr >= 2) return more([cr === RW_CODE ? "The road's open. We buried Bjarte with his own company. The Redwake one." : cr === RW_JOINT ? "Red and grey on the same road. Hrolf still haggles." : "We're between contracts. The jarls won't hire us; the princes might, which the jarls will hate even more."], [
        { label: "My standing with the Redwake.", then: () => standingTalk(game, name, "redwake", usual) },
        ...(cr === RW_WALK ? [{ label: "Show me the company's spare kit.", then: () => { game.ui.shop = "redwake_kit"; return null; } }] : [])]);
      return null;
    }
    case "greyhide_captain":
      if (inRw(game, 1) && !data(game, "rw_hrolf")) return chat(name, npcSays(name, "Our code? The contract is everything. That's the whole of it. We don't ask who pays or why, and we don't stop until it's done.",
        "Ulfa's lot have a code as long as a saga and they still end up on the same roads as us. Tell her the Greyhide hold this road till Krasnogor says otherwise, or till the Redwake breaks. Whichever."), undefined, () => { flag(game, "rw_hrolf"); checkProof(game); });
      if (sr >= 2 && cr === RW_JOINT) return says("Half the pay, half the road, twice the swords. Ulfa drives a hard bargain. Don't tell her I said so.");
      if (sr >= 2 && cr === RW_CODE) return says("The Redwake opened the road. We were paid till then. Contract's done.");
      return says("The Greyhide hold this road. Pay the toll or go round.");
    case "bjarte_half_hand":
      if (inRw(game, 1) && !data(game, "rw_bjarte")) return chat(name, npcSays(name, "Ulfa sent you. Of course she did.",
        "Twenty years. And when my hand went, the Redwake's code said a three-fingered sword gets a half share. The Greyhide pay a whole one. Their code's shorter, but it pays.", "Tell her I won't draw on her. Tell her I don't know if that's true."), undefined, () => { flag(game, "rw_bjarte"); checkProof(game); });
      if (sr >= 2 && cr === RW_JOINT) return says("One contract. I can look at Ulfa again. Nearly.");
      return says("Mind the road.");
    case "greyhide_sellsword": return says(sr >= 2 && cr === RW_JOINT ? "Red and grey, side by side. Strange times." : "Grey wolf, grey pay. Move along.");
    case "archivist_bozhena": {
      if (sd === 0) return more(["The Oathgate chronicle: the account of the old agreement, as it was sworn. We have one copy, the princes have one, and the Vargskeld skalds have it as a verse. Each gives the western pass to someone else. History is an argument, but this one has been edited."], [
        { label: "I'll compare them.", then: () => chat(name, npcSays(name, "Ours is on the shelf behind me. The princes keep theirs in the Terem at Krasnogor, and they're particular who reads it. The verse, ask the skald at Embermoot."), undefined, () => {
          game.player.quests[FOURTH_COPY] = 1; game.player.questData.dc_step = 1; say(game, "Quest started: The Fourth Copy.");
        }) },
        { label: "Not now.", then: () => null }]);
      if (sd === 1 && ad <= 2) return more([ad === 1 ? "Ours, the princes', and the verse. Then we'll know what was cut." : "The first copy. If it's anywhere, it's somewhere nobody's looked for a long time."]);
      if (sd === 1 && ad === 3) return chat(name, npcSays(name, "The first copy. In the old hand. \"The western pass to be kept by both, the roads by both, each to stand by the other.\" Every later copy cut out the half that suited the other side.", "The Archive keeps chronicles. This one could end an argument, or start a worse one. What do we do with it?"), [
        { label: "Publish it. Let both sides read what they swore.", then: () => chat(name, npcSays(name, "Copies to the jarls, copies to the princes, a copy nailed to the Agreement Stone. Both sides will be embarrassed. Embarrassment is underrated."), undefined, () => { finish(game, FOURTH_COPY, "dc_choice", DC_PUBLISH); say(game, "The first copy of the Oathgate chronicle is published, to both sides. You're sworn to the Dawn Archive."); }) },
        { label: "Shelve it with the others. The Archive keeps; it doesn't decide.", then: () => chat(name, npcSays(name, "On the shelf, with the three that disagree with it, and an index card explaining why. Anyone may read it. Nobody will be told to."), undefined, () => { finish(game, FOURTH_COPY, "dc_choice", DC_SHELVE); say(game, "The first copy is shelved with the others. You're sworn to the Dawn Archive."); }) },
        { label: "Give it to Prince Radomir. It's his chronicle.", then: () => chat(name, npcSays(name, "His, is it. He'll pay, and he'll put it somewhere very safe, and nobody will read it again. That's a choice too. Not one I'd make."), undefined, () => { finish(game, FOURTH_COPY, "dc_choice", DC_PRINCE); say(game, `Prince Radomir paid ${PRINCE_PAYS.toLocaleString()} Frens for the first copy. The copyist left the Archive. You're sworn to the Dawn Archive.`); }) },
        { label: "Not yet.", then: () => null }]);
      if (sd >= 2) return more([cd === DC_PUBLISH ? "The jarls wrote to complain. So did the princes. In the same week. I've framed both letters." : cd === DC_SHELVE ? "Four copies now, on one shelf. People come to read all four. That's what an archive is for." : "The prince has it. Somewhere very safe. We have the index card."], [
        { label: "My standing with the Archive.", then: () => standingTalk(game, name, "dawn_archive", usual) }]);
      return null;
    }
    case "archive_copyist":
      if (inDc(game, 2) && !data(game, "dc_hint")) return chat(name, npcSays(name, "The first copy? It went up to the Oathgate with the people who swore it: one for the stone, they said. It never came down. If it's anywhere, it's in the old fort up there, in whatever they kept their papers in.",
        "The hand will be the old one. You'll need to know the old letters to read it."), undefined, () => flag(game, "dc_hint"));
      if (sd >= 2) return says("Four copies now. The fourth one's still wrong. At least we know how.");
      return null;
    case "ember_skald":
      if (inDc(game, 1) && !data(game, "dc_verse")) return chat(name, npcSays(name, "The Oathgate verse? \"West to the Vargskeld, east to the princes, and the pass between to the both of them.\" That's how my grandmother had it.",
        "The archive's copy gives the pass to the princes, I'm told. Ours gives it to us, if you don't sing the last line. Most don't."), undefined, () => { flag(game, "dc_verse"); checkCopies(game); });
      return null;
    case "prince_radomir":
      if (sd >= 2 && cd === DC_PRINCE) return more(["The first copy of the Oathgate chronicle is in the Terem's strongroom, where it belongs. My thanks were paid in silver."]);
      if (sd >= 2 && cd === DC_PUBLISH) return more(["The Archive nailed a copy to the Agreement Stone. The jarls read it. We read it. Nobody enjoyed it."]);
      return null;
  }
  return null;
}

/** Places: the Greyhide's contract, the chronicle's copies, the Oathgate fort's chest, the old inscriptions. */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const inscription = (survey: string, text: string): Clue => ({
  options: () => ["Take-rubbing", "Examine"], examine: () => text,
  use: game => {
    const run = game.player.activities.run;
    if (run?.id === "archive_rubbings" && !run.marks[survey]) { activityMark(game, "archive_rubbings", survey); return { text: "You lay paper over the letters and rub them up with charcoal: a clean copy for the Archive." }; }
    return { text: "Old letters, cut deep. The Archive takes rubbings of stones like this, for its members' errands." };
  },
});
export const COMPANY_CLUES: Record<string, Clue> = {
  greyhide_contract: {
    options: () => ["Read", "Examine"], examine: () => "The Greyhide's contract, nailed to their wagon for anyone to see: the Greyhide are proud of their contracts.",
    use: game => {
      if (inRw(game, 1) && !data(game, "rw_contract")) { flag(game, "rw_contract"); checkProof(game); }
      return { text: "\"The Greyhide company to hold the Oathgate road against all comers, and in particular against the company called the Redwake, until the said company is broken or withdraws. Paid from the Krasnogor treasury, a silver a sword a day.\" Unsigned. Sealed with a plain seal." };
    },
  },
  archive_copy: {
    options: game => inDc(game, 1) && !data(game, "dc_archive") ? ["Read", "Examine"] : ["Examine"], examine: () => "Chronicles, shelved by year and disputed by the shelf. The Oathgate chronicle's Archive copy is here.",
    use: game => {
      if (inDc(game, 1) && !data(game, "dc_archive")) { flag(game, "dc_archive"); addXp(game, "mysteries", 200, { raw: true }); checkCopies(game); }
      return { text: "The Archive's copy: \"...the passes kept open by both, the roads kept by both, and the western pass to the princes, who shall keep it for both.\" The ink of the last clause is newer than the rest." };
    },
  },
  princes_copy: {
    options: () => ["Read", "Examine"], examine: () => "A lectern in the Terem, and on it, under glass, the princes' copy of the Oathgate chronicle.",
    use: game => {
      if (!inDc(game, 1)) return { text: "The princes' copy of the Oathgate chronicle, under glass. The steward watches you look at it." };
      if (level(game, "presence") < PRINCES_PRESENCE) return { text: `The steward steps between you and the lectern. "The princes' chronicle is read by those the princes know." (Presence ${PRINCES_PRESENCE})` };
      if (!data(game, "dc_princes")) { flag(game, "dc_princes"); addXp(game, "presence", 200, { raw: true }); checkCopies(game); }
      return { text: "The steward lifts the glass for you. The princes' copy: \"...and the western pass to the princes, to keep or to close as the princes see fit.\" No mention of the roads, or of standing by anyone." };
    },
  },
  first_copy: {
    options: () => ["Search", "Examine"], examine: () => "An iron-bound chest in the Oathgate fort's ruined guardroom, rusted shut a long time ago.",
    use: game => {
      if (!inDc(game, 2)) return { text: has(game.player, "first_chronicle") ? "Empty now." : "A rusted chest. Mouse nests and old straw." };
      if (level(game, "mysteries") < FIRST_MYSTERIES) return { text: `Under the straw, a roll of vellum in the old hand: letters you can see but not read. (Mysteries ${FIRST_MYSTERIES})` };
      give(game.player, "first_chronicle", 1); game.player.questData.dc_step = 3; addXp(game, "mysteries", 400, { raw: true });
      say(game, "The first copy of the Oathgate chronicle. Bozhena should see it.");
      return { text: "Under the straw, wrapped in oiled hide: the first copy, in the old hand. \"The western pass to be kept by both, the roads by both, each to stand by the other.\" Nobody's version. Everybody's." };
    },
  },
  record_stone_1: inscription("stone1", "A boundary stone by the Hearthwatch road, its letters older than the princes."),
  record_stone_2: inscription("stone2", "A waystone above Zlatna Gora, cut with a list of names and a date nobody can read."),
  record_stone_3: inscription("stone3", "A stone by the Bereza at Bereslav, the river's old name cut in it."),
};
