/**
 * The Land Before Stone: Meghavan's quests. One to come in by, and one for each of the country's powers, none of them
 * simply in the right.
 *
 * "Caravan of the Rains": a Khetmar caravan wants a guard over the Gate of Rains to Tirthali, where the dacoits are.
 * At the ford, Ferrywarden Amul looks in the crates, and one of them has something in it that was dug up.
 * "The Silted Tank" (Ilavarta): Queen Saumitra's engineers and the temple's treasurers each say the other should pay
 * to dig the silt out of the tanks. Hear them, read the Great Tank's measure, and go down the Great Stepwell, where the
 * old sluice is jammed and something has made the cistern its own.
 * "Seven Parasols, One Shade" (the League): the toll books say Ilavarta's bridge has doubled its toll, and the League
 * is about to say so in the Mandapa. The clerk's figures came from somewhere, and so did his new sandals.
 * "The Pass Toll" (Shailagarh): deserters from the Copper Banner companies have taken the high toll-house and are
 * charging their own toll. Lord Varanjit wants them gone; their captain wants to know why they went.
 * "The Missing Folio" (Suvarnatira): a leaf of the Azhurak star chart is gone from the Archive, and the Obsidian
 * Legacy's envoy is the obvious thief. The Archive's own borrowing ledger is less obvious.
 * "What the Forest Keeps" (the Kanthari): Shailagarh's loggers have moved the grove stones, and Grandmother Sukesh wants
 * them put back, and the licence that moved them taken back to the lord who signed it.
 */
import { addXp, giveOrDrop, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import type { WorldObject } from "./world.ts";

export const CARAVAN = "caravan_of_rains", SILT = "silted_tank", PARASOLS = "seven_parasols", PASS = "pass_toll", FOLIO = "missing_folio", FOREST = "forest_keeps";
const FOOTHOLD = "foothold_in_the_stone";
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: 9, seed }, ...extra });
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const all = (game: Game, keys: readonly string[]) => keys.every(key => data(game, key));
const STONES = ["fk_s0", "fk_s1", "fk_s2"] as const;

export const MEGHAVAN_QUEST_NPCS: Record<string, NpcDef> = {
  caravan_master: person("caravan_master", "Caravan-master Iddo Saraf", "A Kharaveth caravan-master in a dusty headcloth, with twelve mules, four drivers, and a list of everything on every mule that he reads aloud when he's nervous.", 1780),
};

export const MEGHAVAN_QUESTS: readonly QuestDef[] = [
  {
    id: CARAVAN, name: "Caravan of the Rains", points: 1, difficulty: "Novice", start: "Talk to Caravan-master Iddo Saraf outside Khetmar's east gate.",
    requirements: ["A Foothold in the Stone", "Combat 45 recommended"],
    rewards: ["1 Quest Point", "2,000 Wayfaring XP", "1,000 Presence XP", "1,500 coins", "A monsoon cloak"],
    journal: game => {
      const s = stage(game, CARAVAN);
      if (s === 0) return ["Outside Khetmar's east gate a caravan is waiting to go east into the Rain Country. Its master looks like he's counting the mules again."];
      if (s === 1) return ["Caravan-master Iddo Saraf will take his caravan over the Gate of Rains to Tirthali if somebody deals with the dacoits who've been stopping caravans there.",
        "• Find the dacoits' chief in the hills by the Gate of Rains, and deal with him"];
      if (s === 2) return ["Red Jhanda, the dacoits' chief, is dead, and the caravan went through the Gate of Rains without losing a mule.", "• Meet the caravan at Tirthali: Ferrywarden Amul checks every crate that crosses the ford"];
      return ["The caravan reached Tirthali. One crate held a figure of Azhurak stone, dug up and smuggled, and I decided where it went. QUEST COMPLETE!"];
    },
  },
  {
    id: SILT, name: "The Silted Tank", points: 3, difficulty: "Experienced", start: "Talk to Queen Saumitra in the Palace of the Tanks, Sarovan.",
    requirements: ["A Foothold in the Stone", "Combat 80 recommended (the Great Stepwell)"],
    rewards: ["3 Quest Points", "6,000 Presence XP", "4,000 Pursuance XP", "5,000 coins", "The Ring of the Kept Tank", "The Great Stepwell, opened"],
    journal: game => {
      const s = stage(game, SILT);
      if (s === 0) return ["Queen Saumitra of Ilavarta is crowned at the Great Tank, and keeps her crown by keeping the tanks. The tanks are silting up."];
      if (s === 1) return ["The tanks are a third full of silt. The Queen's engineers want the temple's offerings to dig it out; the temple's treasurers say the offerings are the river's. The Queen asked me to find out which of them is right.",
        mark(!!data(game, "st_dev"), "Hear Chief Engineer Devakar, in the palace"), mark(!!data(game, "st_amb"), "Hear Treasurer Ambika, in the palace"),
        mark(!!data(game, "st_measure"), "Read the Great Tank's measure, at the top of its ghats")];
      if (s === 2) return ["Both of them are right: the silt comes down from the forests the highland loggers have cut, and the Great Stepwell's old sluice, that used to flush the Great Tank, has been jammed shut for years.",
        mark(!!data(game, "st_key"), "Ask Devakar to unchain the Great Stepwell"), mark(!!data(game, "st_serpent"), "Deal with whatever lives in the Stepwell's cistern"),
        mark(!!data(game, "st_wheel"), "Turn the old sluice wheel, in the Stepwell's sluice chamber")];
      if (s === 3) return ["The sluice turned, and the Great Tank's water ran clean through the Stepwell for the first time in a generation.", "• Tell Queen Saumitra"];
      return ["I told the Queen what the tank's measure, the Stepwell and the forests said. The temple pays to replant upstream, the crown pays to dig, and both of them complain about it. QUEST COMPLETE!"];
    },
  },
  {
    id: PARASOLS, name: "Seven Parasols, One Shade", points: 2, difficulty: "Intermediate", start: "Talk to Speaker Hemavati in the Mandapa at Mandapur.",
    requirements: ["A Foothold in the Stone"],
    rewards: ["2 Quest Points", "4,000 Presence XP", "2,500 Thieving XP", "3,000 coins", "The Speaker's parasol"],
    journal: game => {
      const s = stage(game, PARASOLS);
      if (s === 0) return ["The League of Seven Parasols is meeting in the Mandapa, and Speaker Hemavati looks like someone holding seven arguments at once."];
      if (s === 1) return ["The League's toll books say the Queen's bridge at Sarovan has doubled its toll on League carts. The League means to say so in the Mandapa, which would be the end of talking. The Speaker wants to know if it's true first.",
        mark(!!data(game, "sp_raja"), "Hear Raja Indrasen of the Salt Fens, in the Mandapa"), mark(!!data(game, "sp_ledger"), "Read the toll ledger, in the League's Toll Office"),
        mark(!!data(game, "sp_clerk"), "Ask Toll-clerk Pranav about the figures")];
      if (s === 2) return ["The doubled toll is in the clerk's books and nowhere else: he was paid to write it in. Paid in Gilded Court silver.", "• Find the Gilded Court's man in Sarovan"];
      if (s === 3) return ["Factor Ozren Vale admits it: a quarrel between the League and Ilavarta keeps rice prices high, and the Gilded Court buys the rice.", "• Tell Speaker Hemavati"];
      return ["The Speaker read the true figures in the Mandapa. Seven rulers agreed, for once, and the Gilded Court's factor is going home. QUEST COMPLETE!"];
    },
  },
  {
    id: PASS, name: "The Pass Toll", points: 2, difficulty: "Experienced", start: "Talk to Lord Varanjit in his hall at Shailagarh.",
    requirements: ["A Foothold in the Stone", "Combat 70 recommended"],
    rewards: ["2 Quest Points", "5,000 Pursuance XP", "2,000 Presence XP", "3,000 coins", "The pass-warden's helm"],
    journal: game => {
      const s = stage(game, PASS);
      if (s === 0) return ["Lord Varanjit holds the passes. Somebody, it seems, is holding one of them back."];
      if (s === 1) return ["Deserters from the Copper Banner companies have taken the high toll-house on the eastern pass and charge their own toll. Lord Varanjit wants them gone.",
        mark(!!data(game, "pt_marr"), "Hear Captain Ysolde Marr, in the companies' barracks"), mark(!!data(game, "pt_book"), "Look round the high toll-house, east along the highland pass")];
      if (s === 2) return ["The deserters' paybook says they haven't been paid since spring: the Lord's paymaster pays the Marshal, and the Marshal's agent pays the companies, and somewhere between the two the money stops.",
        "• Deal with Sergeant Hask, who leads them"];
      if (s === 3) return ["Sergeant Hask is dead, and the toll-house is Shailagarh's again.", "• Tell Lord Varanjit what the paybook says"];
      return ["Lord Varanjit will pay the companies himself from now on, and not through Khetmar. Captain Marr says that's the first sensible thing a lord has done all year. QUEST COMPLETE!"];
    },
  },
  {
    id: FOLIO, name: "The Missing Folio", points: 2, difficulty: "Intermediate", start: "Talk to Archivist Mahir in the Archive of Suvarnatira.",
    requirements: ["A Foothold in the Stone"],
    rewards: ["2 Quest Points", "3,000 Mysteries XP", "2,000 Presence XP", "2,500 coins", "A reader's stole"],
    journal: game => {
      const s = stage(game, FOLIO);
      if (s === 0) return ["Something is wrong in the Archive of Suvarnatira: the Archivist is counting the leaves of the star chart, again."];
      if (s === 1) return ["A leaf is missing from the Azhurak star chart the Archive and the Obsidian Legacy both claim. Archivist Mahir thinks the Legacy's envoy took it.",
        mark(!!data(game, "mf_envoy"), "Hear Envoy Saqqet, in the Archive"), mark(!!data(game, "mf_desk"), "Look at the Archive's borrowing ledger")];
      if (s === 2) return ["The borrowing ledger says the folio went out to be rebound, to a binder in Tirthali. There's no binder in Tirthali. There's a pedlar with a covered basket.", mark(has(game.player, "star_folio"), "Get the folio back from Pedlar Chandu")];
      if (s === 3) return ["I have the missing leaf of the star chart.", "• Bring it to Archivist Mahir"];
      return ["The folio is back in the Archive. Envoy Saqqet will have a copy, made by the Archive's best hand, and Tamesh will argue about the original for another century. QUEST COMPLETE!"];
    },
  },
  {
    id: FOREST, name: "What the Forest Keeps", points: 2, difficulty: "Intermediate", start: "Talk to Grandmother Sukesh in Kanthar, in the Deepgreen.",
    requirements: ["A Foothold in the Stone"],
    rewards: ["2 Quest Points", "4,000 Woodcutting XP", "2,500 Presence XP", "2,000 coins", "A Kanthari seed charm"],
    journal: game => {
      const s = stage(game, FOREST);
      if (s === 0) return ["The Kanthari of Kanthar don't want to be anybody's province. Grandmother Sukesh looks as if somebody has been trying."];
      if (s === 1) return ["Shailagarh's loggers have moved the stones that mark the Kanthari's grove, and cut inside them. Grandmother Sukesh wants them put back.",
        mark(!!data(game, "fk_logger"), "Hear the loggers, at their camp at the Deepgreen's edge"),
        mark(all(game, STONES), `Set the grove stones back where they belong (${STONES.filter(key => data(game, key)).length}/3)`)];
      if (s === 2) return ["The grove stones are back. The loggers will only cut where their licence says, and their licence says everywhere.",
        mark(has(game.player, "logging_licence") || !!data(game, "fk_varanjit"), "Get the loggers' licence"), mark(!!data(game, "fk_varanjit"), "Take it to Lord Varanjit, who signed it")];
      if (s === 3) return ["Lord Varanjit has torn up the licence and will draw a new one with the Kanthari's stones on it.", "• Tell Grandmother Sukesh"];
      return ["The grove stones are where they were, the licence is a new one, and Grandmother Sukesh gave the loggers tea. The forest keeps the river's banks; now the river may keep its tanks. QUEST COMPLETE!"];
    },
  },
];

/** Meghavan's quest clues (see kharaveth.ts CLUES). */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
export const MEGHAVAN_QUEST_CLUES: Record<string, Clue> = {
  great_stepwell: {
    options: game => stepwellOpen(game) ? ["Climb-down", "Read"] : ["Read"],
    examine: () => "The Great Stepwell: a stair of carved stone going down, down, to water.",
    use: (game, object, option) => {
      if (option === "Climb-down" && stepwellOpen(game)) return { to: object.to!, text: "You step over the unhooked chain and go down the Great Stepwell, landing after landing, into the green dark." };
      return { text: stepwellOpen(game) ? "Steps go down four sides of a square shaft to green water far below. The Chief Engineer's chain hangs unhooked from the lowest landing you can see."
        : "Steps go down four sides of a square shaft, landing after landing, galleries of carved pillars along each, to green water far below. A chain is across the lowest landing you can see, and a brass notice: 'Closed by order of the Chief Engineer. Silt. Do not descend.'" };
    },
  },
  great_tank_measure: {
    options: () => ["Read"], examine: () => "The Great Tank's measure: a carved post at the top of the ghats.",
    use: game => {
      if (stage(game, SILT) === 1 && !data(game, "st_measure")) { flag(game, "st_measure"); advanceSilt(game); }
      return { text: "A stone post marked in the Queen's hands of depth, the old marks cut deep and gilded, the water's line now three marks below the lowest gilt. Someone has scratched beside it, small: 'Silt, or sorrow?'" };
    },
  },
  stepwell_sluice: {
    options: game => data(game, "st_wheel") ? ["Look"] : ["Turn"], examine: () => "A great bronze wheel on an axle of teak, green with age, that once opened the sluice under the Great Tank.",
    use: game => {
      if (data(game, "st_wheel")) return { text: "The wheel stands open. Water runs under it, clean, towards the cistern." };
      if (stage(game, SILT) !== 2 || !data(game, "st_serpent")) return { text: stage(game, SILT) === 2 ? "You lean on the wheel. Silt grinds in it, and something in the cistern beyond answers the sound. Not yet." : "A bronze wheel, seized with silt. It hasn't turned in years." };
      flag(game, "st_wheel"); game.player.quests[SILT] = 3; addXp(game, "strength", 2000, { raw: true });
      say(game, "The sluice wheel turns, groaning, and far above you the Great Tank begins to drain its silt through the Stepwell. Tell the Queen.");
      return { text: "You put your back into the wheel. It sticks, shudders, gives, and turns, a whole turn, then another. Somewhere above, a sound like a great breath let out: the Great Tank's water, moving." };
    },
  },
  toll_ledger: {
    options: () => ["Read"], examine: () => "The League's toll ledger, open on the clerk's desk.",
    use: game => {
      if (stage(game, PARASOLS) === 1 && !data(game, "sp_ledger")) { flag(game, "sp_ledger"); advanceParasols(game); }
      return { text: "Seven columns, one for each ruler's roads, and a column for the Queen's bridge. This season the bridge's column doubles, in a fresh hand, and the ink is a different black from the rest. The figures for the League's own roads haven't changed in three years." };
    },
  },
  deserters_paybook: {
    options: () => ["Read"], examine: () => "A soldier's paybook, left on the toll-house table under a stone.",
    use: game => {
      if (stage(game, PASS) === 1 && !data(game, "pt_book")) { flag(game, "pt_book"); advancePass(game); }
      return { text: "A Copper Banner company's paybook. Months of entries: 'Paid by Shailagarh to Khetmar's agent, in full.' Then nothing paid to the company, month after month, in a sergeant's careful hand, and under the last: 'No pay, no Banner. We'll take our own toll.'" };
    },
  },
  archive_ledger: {
    options: () => ["Read"], examine: () => "The Archive's borrowing ledger, chained to a lectern.",
    use: game => {
      if (stage(game, FOLIO) === 1 && !data(game, "mf_desk")) { flag(game, "mf_desk"); advanceFolio(game); }
      return { text: "Every leaf that leaves the reading room, and why. Ten days ago: 'Star chart, ninth leaf, out for rebinding, to the binder at Tirthali.' Signed by an under-librarian who left for Khetmar the next morning." };
    },
  },
  ...Object.fromEntries([0, 1, 2].map((k): [string, Clue] => [`grove_stone_${k}`, {
    options: game => data(game, STONES[k]) ? ["Look"] : ["Set-stone"],
    examine: game => data(game, STONES[k]) ? "A grove stone of the Kanthari, back in its old hollow, moss already reaching for it." : "A grove stone of the Kanthari, carved with a leaf, dragged out of its hollow and left by a stump.",
    use: game => {
      if (data(game, STONES[k])) return { text: "It's back where it was. The moss knows." };
      if (stage(game, FOREST) !== 1) return { text: "A stone carved with a leaf, out of place. Whose place it is isn't your business yet." };
      flag(game, STONES[k]); addXp(game, "woodcutting", 600, { raw: true });
      if (all(game, STONES) && data(game, "fk_logger")) { game.player.quests[FOREST] = 2; say(game, "The three grove stones are back. Now the loggers' licence."); }
      return { text: "You roll the stone back into its hollow. It settles as if it had only been away a moment." };
    },
  }])),
};
function stepwellOpen(game: Game) { return !!data(game, "st_key") || questDone(game, SILT); }
function advanceSilt(game: Game) {
  if (stage(game, SILT) === 1 && all(game, ["st_dev", "st_amb", "st_measure"])) { game.player.quests[SILT] = 2; say(game, "Both of them are right. Ask Chief Engineer Devakar to unchain the Great Stepwell."); }
}
function advanceParasols(game: Game) {
  if (stage(game, PARASOLS) === 1 && all(game, ["sp_raja", "sp_ledger", "sp_clerk"])) { game.player.quests[PARASOLS] = 2; say(game, "The clerk was paid in Gilded Court silver. Find the Gilded Court's man in Sarovan."); }
}
function advancePass(game: Game) {
  if (stage(game, PASS) === 1 && all(game, ["pt_marr", "pt_book"])) { game.player.quests[PASS] = 2; say(game, "The deserters weren't paid. Deal with Sergeant Hask, all the same."); }
}
function advanceFolio(game: Game) {
  if (stage(game, FOLIO) === 1 && all(game, ["mf_envoy", "mf_desk"])) { game.player.quests[FOLIO] = 2; say(game, "Out for rebinding, to a binder in Tirthali. There is no binder in Tirthali."); }
}

/** The quests' talk; null when someone has nothing to say about them (meghavanpeople.ts has their everyday talk). */
export function talkMeghavanQuests(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, says = (...lines: string[]) => npcSays(name, ...lines);
  switch (npcId) {
    case "caravan_master": {
      const s = stage(game, CARAVAN);
      if (!questDone(game, FOOTHOLD)) return chat(name, says("The road east is the Banner's to open and Hollowmere's to ask about. Come back when Hollowmere's let you out of its fence."));
      if (s === 0) return chat(name, says("Twelve mules: linen, salt, glass, lamp oil, and one crate the Obsidian Legacy's quartermaster sealed himself and wouldn't say what was in it. Four drivers. One of me.",
        "Dacoits have stopped three caravans at the Gate of Rains this season. The Banner won't ride past its own bay. I need somebody who will."), [
        { label: "I'll see your caravan over the Gate of Rains.", then: () => chat(name, says("The Gate's a day east. The dacoits camp in the hills south of the road; their chief wears a red turban and is proud of it. Deal with him and we'll go through. I'll meet you at Tirthali, at the ford."), undefined, () => { player.quests[CARAVAN] = 1; say(game, "Quest started: Caravan of the Rains."); }) },
        { label: "What's in the sealed crate?", then: () => chat(name, says("I don't know, and I'm paid not to. That's the most expensive kind of crate there is."), [{ label: "I'll guard it anyway.", then: () => null }]) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1) return chat(name, says(pick(game, ["The dacoits are in the hills south of the Gate. Their chief's the one in the red turban. I'm counting the mules again.", "Linen, salt, glass, oil, the crate. Linen, salt, glass, oil, the crate. It helps."])));
      return chat(name, says(pick(game, ["We made it! Twelve mules, four drivers, one crate. I'll be telling this one in Khetmar for a year.", "Tirthali, then Sarovan, then home. The rain's on the way. It's always on the way."])));
    }
    case "tirthali_amul": {
      if (stage(game, CARAVAN) === 2) return chat(name, says("The Khetmar caravan! Through the Gate with all its mules. You'll be the one who dealt with Red Jhanda, then. The ford thanks you, and so do I.",
        "I look in every crate that crosses: it's the ledger's rule. This one has the Obsidian Legacy's seal and, inside, under the straw, this: a seated figure of Azhurak stone, earth still in the folds. Dug up somewhere in Kharaveth, and not by anyone with a right to."), [
        { label: "Send it to the Archive at Suvarnatira.", then: () => chat(name, says("The Archive. Hm. They'll write it down and argue about it, and nobody will sell it again. I'll send it with the next boat down the river."), undefined, () => finishCaravan(game, 1)) },
        { label: "Send it back to Tamesh, where it came from.", then: () => chat(name, says("Back to Kharaveth, to the Legacy that keeps every monument and sealed this one into a crate. I'll put it on the caravan home, with a note. A polite one."), undefined, () => finishCaravan(game, 2)) },
      ]);
      return null;
    }
    // ---------- The Silted Tank ----------
    case "sarovan_saumitra": {
      const s = stage(game, SILT);
      if (s === 0) return chat(name, says("You've come a long way to stand in a palace that's arguing with itself. Have you seen my tanks? A third full of silt. In ten years the rain will run to the sea and Ilavarta with it.",
        "My engineers want the temple's offerings to dig. My treasurers want the offerings left to the river. I've heard them both too often to hear either. Will you hear them for me?"), [
        { label: "I'll find out who's right.", then: () => chat(name, says("Devakar and Ambika are both here, glaring at each other from opposite pillars. And read the Great Tank's measure, at the top of the ghats. The water doesn't take sides."), undefined, () => { player.quests[SILT] = 1; say(game, "Quest started: The Silted Tank."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1 || s === 2) return chat(name, says(pick(game, ["Well? Which of them is right? Don't tell me both. Everybody says both.", "The Stepwell had a sluice once that flushed the Great Tank. My great-grandmother's engineers closed it. I never knew why."])));
      if (s === 3) return chat(name, says("The Great Tank is moving. I watched from the balcony: the silt going down through the Stepwell like smoke. Tell me what you found."), [
        { label: "Both of them are right. The silt comes from the cut forests upstream.", then: () => chat(name, says("The forests. Shailagarh's loggers, and the Kanthari's grove. So the temple pays to replant upstream, because the offerings are the river's and that's where the river begins, and the crown pays to dig, because the tanks are the crown's.",
          "They'll both hate it. That's how I'll know it's fair. Wear this: the ring of a kept tank. My mother gave one to the engineer who dug the last canal."), undefined, () => finishSilt(game)) },
      ]);
      return null;
    }
    case "sarovan_engineer": {
      if (stage(game, SILT) === 1 && !data(game, "st_dev")) return chat(name, says("Look at the measure on the Great Tank, then tell me I'm wrong. A third full of silt! Dig it out, and the temple's vaults are full of gold the river gave and the river needs.",
        "And the Stepwell. My predecessor's predecessor chained it shut: its sluice jammed, and something took to living in the cistern below. Nobody's been down in forty years."), undefined, () => { flag(game, "st_dev"); advanceSilt(game); });
      if (stage(game, SILT) === 2 && !data(game, "st_key")) return chat(name, says("The sluice under the Stepwell. Yes. If it turned, the Great Tank would flush its own silt, the old way, through the Stepwell and out to the river.",
        "I'll unhook the chain. Mind the cistern. The last man who went down came back up and became a priest."), undefined, () => { flag(game, "st_key"); say(game, "Devakar has unchained the Great Stepwell. Go down it, find the sluice wheel, and whatever's in the cistern."); });
      return null;
    }
    case "sarovan_treasurer": {
      if (stage(game, SILT) === 1 && !data(game, "st_amb")) return chat(name, says("Dig, dig, dig. Devakar would dig the same silt out every ten years until the vaults are empty and the tanks are full of it again.",
        "Ask where it comes from. Up the Ilavati, past Shailagarh, the loggers are cutting the forests that held the river's banks. The silt is the forest, coming down to see us."), undefined, () => { flag(game, "st_amb"); advanceSilt(game); });
      return null;
    }
    // ---------- Seven Parasols, One Shade ----------
    case "mandapur_speaker": {
      const s = stage(game, PARASOLS);
      if (s === 0) return chat(name, says("The toll books say the Queen's bridge has doubled its toll on League carts. Six of the seven want to say so in the Mandapa tomorrow. Once it's said in the Mandapa, it can't be unsaid.",
        "I'd like to know if it's true before we say it. A stranger can ask questions a Speaker can't."), [
        { label: "I'll look into the tolls.", then: () => chat(name, says("Start with Indrasen of the Salt Fens: he's the seventh, and he doesn't believe it. Then the toll office, and its clerk."), undefined, () => { player.quests[PARASOLS] = 1; say(game, "Quest started: Seven Parasols, One Shade."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1 || s === 2) return chat(name, says(pick(game, ["Tomorrow, in the Mandapa. Unless you find me something first.", "Seven parasols, one shade. That's the saying. It's never once been true on a hot day."])));
      if (s === 3) return chat(name, says("The Gilded Court paid our clerk to double Ilavarta's toll in our books? So that we'd quarrel with the Queen, and rice would stay dear, and Sefrah would buy it?",
        "Then I'll read the true figures in the Mandapa tomorrow, and the Gilded Court's factor can explain himself to seven rulers at once. Take this: a Speaker's parasol. I'll have it back when it's your turn."), undefined, () => finishParasols(game));
      return null;
    }
    case "mandapur_raja": {
      if (stage(game, PARASOLS) === 1 && !data(game, "sp_raja")) return chat(name, says("Doubled? The Salt Fens send forty carts a month over that bridge and we've paid the same toll since my father's day. I've the receipts. The others haven't asked to see them.",
        "Somebody's figures are wrong, and it isn't the Queen's toll-keeper. He can't add well enough to cheat."), undefined, () => { flag(game, "sp_raja"); advanceParasols(game); });
      return null;
    }
    case "mandapur_tollclerk": {
      if (stage(game, PARASOLS) === 1 && !data(game, "sp_clerk")) {
        if (!data(game, "sp_ledger")) return chat(name, says("The figures? They're in the ledger. The ledger's on the desk. I'm sure they're right."));
        return chat(name, says("The new hand. Yes. The bridge's column. I... A man from Sarovan said the League's figures were out of date. He gave me the new ones. And forty silver for my trouble, in Kharaveth coin.",
          "I didn't think it would matter! Seven rulers never agree on anything. I didn't think they'd agree on this."), undefined, () => { flag(game, "sp_clerk"); advanceParasols(game); });
      }
      return null;
    }
    case "sarovan_factor": {
      if (stage(game, PARASOLS) === 2) return chat(name, says("The League's toll clerk. Forty silver. You have been busy.",
        "Consider: if the League and Ilavarta quarrel, carts stop, rice sits in the valley, its price goes up, and the Gilded Court, which buys Ilavarta's rice, buys less of it dearly instead of more cheaply. It's only arithmetic. Lady Seleneh is very good at arithmetic.",
        "Tell the Speaker. I'll be on the next caravan to Sefrah, and I'll be replaced by someone with better handwriting."), undefined, () => { flag(game, "sp_factor"); player.quests[PARASOLS] = 3; say(game, "Tell Speaker Hemavati what the Gilded Court's factor admitted."); });
      return null;
    }
    // ---------- The Pass Toll ----------
    case "shailagarh_varanjit": {
      const s = stage(game, PASS);
      if (stage(game, FOREST) === 2 && has(player, "logging_licence") && !data(game, "fk_varanjit")) return chat(name, says("My licence. The Kanthari's grove. I signed it for pit props, not for a grove.",
        "(He tears it across, slowly.) The loggers will have a new one with the Kanthari's stones drawn on it. Tell the grandmother Shailagarh keeps its word, when it remembers what it said."), undefined, () => {
        take(player, "logging_licence", 1); flag(game, "fk_varanjit"); player.quests[FOREST] = 3; say(game, "Lord Varanjit tore up the licence. Tell Grandmother Sukesh.");
      });
      if (s === 0) return chat(name, says("The high toll-house on the eastern pass is mine, and men from the Copper Banner companies I hire have taken it, and they're charging travellers a toll of their own. In my pass.",
        "I want them gone. Captain Marr wants them talked to. Do whichever you like, as long as they're gone."), [
        { label: "I'll take back the toll-house.", then: () => chat(name, says("Hear Marr first, she'll insist. The toll-house is east along the highland road, past the mines."), undefined, () => { player.quests[PASS] = 1; say(game, "Quest started: The Pass Toll."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1 || s === 2) return chat(name, says(pick(game, ["The toll-house is east, past the mines. Every day they hold it, my pass is somebody else's.", "Marr says they're owed. Everybody's owed. I pay Khetmar for her companies every month, in full."])));
      if (s === 3) return chat(name, says("Hask is dead and the toll-house is mine. What's that? Their paybook."), [
        { label: "Your money reached Khetmar's agent. It never reached the companies.", then: () => chat(name, says("(He reads it twice.) So I've been paying the Marshal's agent to keep my soldiers poor.",
          "From now on Shailagarh pays its companies itself, here, in silver, on the first of the month. Tell Marr. And take this helm: the last pass-warden's. He'd have liked you; he never trusted Khetmar either."), undefined, () => finishPass(game)) },
      ]);
      return null;
    }
    case "shailagarh_captain": {
      if (stage(game, PASS) === 1 && !data(game, "pt_marr")) return chat(name, says("Hask was my sergeant. Twelve years. He didn't desert: he stopped waiting.",
        "None of us have been paid since spring. The Lord says he pays Khetmar, Khetmar says it pays us. Look in the toll-house. Hask kept books on everything; he'll have kept books on that."), undefined, () => { flag(game, "pt_marr"); advancePass(game); });
      if (questDone(game, PASS)) return chat(name, says(pick(game, ["Paid on the first of the month, in silver, by the Lord's own hand. I never thought I'd see it.", "Hask was a good sergeant. He should have been paid, not buried."])));
      return null;
    }
    // ---------- The Missing Folio ----------
    case "suvarnatira_archivist": {
      const s = stage(game, FOLIO);
      if (s === 0) return chat(name, says("Ninety-nine leaves. The star chart has a hundred. I've counted it eleven times, and I'll count it a twelfth while you watch.",
        "The ninth leaf is gone: the one with the river of stars on it. And the Obsidian Legacy's envoy has sat at that desk every day for a month."), [
        { label: "I'll find the missing leaf.", then: () => chat(name, says("Talk to Saqqet, if you can stand it. And look at the borrowing ledger by the door: everything that leaves the reading room is written in it. Everything."), undefined, () => { player.quests[FOLIO] = 1; say(game, "Quest started: The Missing Folio."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1 || s === 2) return chat(name, says(pick(game, ["Ninety-nine. Still ninety-nine. I counted again.", "If the Legacy has it, they'll say they always had it. That's how the oldest blood works."])));
      if (s === 3 && has(player, "star_folio")) return chat(name, says("The ninth leaf! The river of stars! A pedlar's basket? With lunch? Never mind. Never mind.",
        "Saqqet will have a copy, made by my best hand, and the Legacy can argue for the original by letter, which is how scholars should argue. Take this stole, from the Assembly: you read things before you believe them."), undefined, () => { take(player, "star_folio", 1); finishFolio(game); });
      return null;
    }
    case "suvarnatira_envoy": {
      if (stage(game, FOLIO) === 1 && !data(game, "mf_envoy")) return chat(name, says("The Archivist thinks I took it. Of course he does. If I wanted the chart, I'd want all of it, and I'd ask the Provost for it in writing, which I have, fourteen times.",
        "The ninth leaf was bound in lapis thread, as Tamesh binds. The others are in cotton. Somebody here rebound it, once. Somebody here knows bookbinders."), undefined, () => { flag(game, "mf_envoy"); advanceFolio(game); });
      return null;
    }
    case "tirthali_dealer": {
      if (stage(game, FOLIO) === 2 && !has(player, "star_folio")) return chat(name, says("A leaf of old writing? Stars on it? I might. Under the lunch. It came to me from a young librarian on his way to Khetmar, who needed travelling money more than he needed stars.",
        "The Archive wants it back? Then the Archive can have it. I'm a pedlar, not a fool: the Assembly has long arms and longer memories."), undefined, () => {
        giveOrDrop(game, "star_folio"); player.quests[FOLIO] = 3; say(game, "Pedlar Chandu gave you the missing folio. Take it back to Archivist Mahir.");
      });
      return null;
    }
    // ---------- What the Forest Keeps ----------
    case "kanthar_sukesh": {
      const s = stage(game, FOREST);
      if (s === 0) return chat(name, says("Sit. Tea. Now: the loggers from Shailagarh have moved the stones round our grove and cut inside them, three great trees, older than Shailagarh's walls.",
        "I won't fight Shailagarh. I want the stones back where they were, and the paper that moved them taken back to the lord who signed it."), [
        { label: "I'll put the stones back.", then: () => chat(name, says("The grove is west of here, along the river. The stones are carved with a leaf; you'll find them by the stumps. Talk to the loggers too: they're not wicked, only paid."), undefined, () => { player.quests[FOREST] = 1; say(game, "Quest started: What the Forest Keeps."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1 || s === 2) return chat(name, says(pick(game, ["The stones first, then the paper. A forest is patient, but it isn't infinitely patient.", "The trees hold the riverbank. Cut them and the bank comes down to Sarovan as mud, and the Queen sends someone to count us."])));
      if (s === 3) return chat(name, says("The lord tore it up? Himself? Then Shailagarh remembers what it said, today.",
        "Take this charm: seeds of the grove trees, strung. If you plant one where you were born, something of the Deepgreen will grow there. Probably bamboo. Bamboo grows anywhere."), undefined, () => finishForest(game));
      return null;
    }
    case "deepgreen_logger": {
      const s = stage(game, FOREST);
      if (s === 1 && !data(game, "fk_logger")) return chat(name, says("The grove stones? We moved them. The licence says pit props from the Deepgreen, it doesn't say round any stones. Shailagarh's lord signed it; take it up with him.",
        "Put them back if you like. We'll only cut where the licence says, and the licence says everywhere."), undefined, () => {
        flag(game, "fk_logger"); if (all(game, STONES)) { player.quests[FOREST] = 2; say(game, "The three grove stones are back. Now the loggers' licence."); }
      });
      if (s === 2 && !has(player, "logging_licence") && !data(game, "fk_varanjit")) return chat(name, says("You want the licence? Take it to the lord, then. If he draws a new one, we'll cut where the new one says. We're loggers, not lawyers."), undefined, () => giveOrDrop(game, "logging_licence"));
      return null;
    }
  }
  return null;
}

function finishCaravan(game: Game, choice: 1 | 2) {
  game.player.questData.cq_choice = choice;
  giveOrDrop(game, "coins", 1500); giveOrDrop(game, "monsoon_cloak");
  addXp(game, "agility", 2000, { raw: true }); addXp(game, "presence", 1000, { raw: true });
 
  completeQuest(game, CARAVAN);
}
function finishSilt(game: Game) {
  giveOrDrop(game, "coins", 5000); giveOrDrop(game, "kept_tank_ring");
  addXp(game, "presence", 6000, { raw: true }); addXp(game, "slayer", 4000, { raw: true });
  completeQuest(game, SILT);
}
function finishParasols(game: Game) {
  giveOrDrop(game, "coins", 3000); giveOrDrop(game, "speakers_parasol");
  addXp(game, "presence", 4000, { raw: true }); addXp(game, "thieving", 2500, { raw: true });
  completeQuest(game, PARASOLS);
}
function finishPass(game: Game) {
  giveOrDrop(game, "coins", 3000); giveOrDrop(game, "pass_warden_helm");
  addXp(game, "slayer", 5000, { raw: true }); addXp(game, "presence", 2000, { raw: true });
  completeQuest(game, PASS);
}
function finishFolio(game: Game) {
  giveOrDrop(game, "coins", 2500); giveOrDrop(game, "readers_stole");
  addXp(game, "mysteries", 3000, { raw: true }); addXp(game, "presence", 2000, { raw: true });
  completeQuest(game, FOLIO);
}
function finishForest(game: Game) {
  giveOrDrop(game, "coins", 2000); giveOrDrop(game, "seed_charm");
  addXp(game, "woodcutting", 4000, { raw: true }); addXp(game, "presence", 2500, { raw: true });
  completeQuest(game, FOREST);
}

export function onMeghavanKill(game: Game, monsterId: string) {
  if (monsterId === "dacoit_chief" && stage(game, CARAVAN) === 1) { game.player.quests[CARAVAN] = 2; say(game, "Red Jhanda is dead. The caravan can go through the Gate of Rains: meet it at Tirthali."); }
  if (monsterId === "monsoon_serpent") {
   
    if (stage(game, SILT) === 2 && !data(game, "st_serpent")) { flag(game, "st_serpent"); say(game, "The Monsoon Serpent sinks into the cistern and doesn't rise. The sluice wheel is free to turn."); }
  }
  if (monsterId === "deserter_sergeant" && stage(game, PASS) === 2) { game.player.quests[PASS] = 3; say(game, "Sergeant Hask is dead. Tell Lord Varanjit what the paybook said."); }
}
