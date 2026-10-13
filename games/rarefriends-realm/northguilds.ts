/**
 * The north's guilds at work (A Place to the North): the Farwake Guild (the Vargskeld's navigators, chartmakers and
 * merchants) and the Freeholds Compact (the Zoryavik's free towns, miners and craftsfolk). As with Oathsworn Hall and the
 * Hearthwardens (northfactions.ts): a questline that makes you one of theirs, a quarrel inside it you settle, a members'
 * activity paid in standing (the Farwake Survey, the Compact's Order: activities.ts), and the gear standing brings.
 *
 * The True Chart (the Farwake): the Grey Heron struck an unmarked reef in Skarnholm Bay sailing by a Farwake chart. Her
 * log is in the wreck, on the bay's southern island. Navigator Sigrun says why: the guild sells two charts, the true one
 * to its members and a "trade chart" with the hazards left off to everyone else, so that outsiders hire Farwake pilots.
 * The player sails the bay, takes soundings at the three survey cairns on its islands, and tells Torvald what the guild
 * does with the truth: publish it free (Sigrun's way: the guild's charts are free to all), sell the true chart to anyone
 * who pays, or keep it the guild's (Torvald's way: Sigrun leaves the guild, and its gear comes cheaper to members).
 *
 * The Free Weight (the Freeholds Compact): the princes take a tithe of Zlatna Gora's ore, weighed on the princes' own
 * scale. Speaker Zdenka thinks it weighs light. The player tests it with a bar of known weight, hears the tithe-reeve
 * and the miners' foreman, brings the bars for the Compact's own free weight, and decides at Bereslav: pay the tithe on
 * honest scales, refuse it (the reeve is driven out, and the Compact's own stores open at Bereslav), or let the miners
 * strike until the princes halve it (Kazimir's way; Zdenka didn't want the Compact decided by a strike).
 */
import { addXp, count, give, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import type { WorldObject } from "./world.ts";
import { activityMark } from "./activities.ts";
import { chat, completeQuest, data, npcSays, stage, type NpcDef, type QuestDef } from "./content.ts";
import { standingTalk } from "./northfactions.ts";

export const TRUE_CHART = "true_chart", FREE_WEIGHT = "free_weight";
export const FC_FREE = 1, FC_SELL = 2, FC_SECRET = 3;
export const FW_HONEST = 1, FW_REFUSE = 2, FW_STRIKE = 3;
export const FC_CAIRNS = [["fc_c1", "Take soundings at the survey cairn on the bay's great island"], ["fc_c2", "Take soundings at the survey cairn on the eastern island"], ["fc_c3", "Take soundings at the survey cairn on the northern island"]] as const;
export const FW_PROOF = [["fw_scale", "Test the princes' tithe-scale at Zlatna Gora with a blackiron bar"], ["fw_reeve", "Ask the tithe-reeve whose scale it is"], ["fw_kazimir", "Ask Foreman Kazimir what the miners want"]] as const;
/** The bars the free weight is cast from. */
export const FREE_WEIGHT_BARS = 5;

const flag = (game: Game, key: string) => { game.player.questData[key] = 1; };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const fc = (game: Game) => data(game, "fc_step"), fw = (game: Game) => data(game, "fw_step");
const fcChoice = (game: Game) => data(game, "fc_choice"), fwChoice = (game: Game) => data(game, "fw_choice");
const inFc = (game: Game, step: number) => stage(game, TRUE_CHART) === 1 && fc(game) === step;
const inFw = (game: Game, step: number) => stage(game, FREE_WEIGHT) === 1 && fw(game) === step;

const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: 9, seed }, ...extra });
export const GUILD_NPCS: Record<string, NpcDef> = {
  navigator_sigrun: person("navigator_sigrun", "Navigator Sigrun", "A Farwake navigator with salt in her braids and a chart-case on her back. She's sailed every hazard in the bay, and drawn all of them.", 2149, { gone: game => fcChoice(game) === FC_SECRET }),
  tithe_reeve_gorislav: person("tithe_reeve_gorislav", "Tithe-reeve Gorislav", "Weighs the princes' tenth of every cart of ore that leaves Zlatna Gora. Weighs it on the princes' scale. Doesn't ask about the scale.", 2150, { gone: game => fwChoice(game) === FW_REFUSE }),
};

export const GUILD_QUESTS: readonly QuestDef[] = [
  {
    id: TRUE_CHART, name: "The True Chart", points: 2, difficulty: "Experienced",
    start: "Talk to Guildmaster Torvald of the Farwake in Skarnholm.",
    requirements: ["A vessel that can cross Skarnholm Bay (a rowboat will do)", "Seafaring 20 recommended"],
    rewards: ["2 Quest Points", "6,000 Seafaring XP", "2,000 Wayfaring XP", "Sworn to the Farwake Guild: the Farwake Survey and standing with the guild"],
    journal: game => {
      const s = stage(game, TRUE_CHART), at = fc(game), c = fcChoice(game);
      if (s === 0) return ["Guildmaster Torvald of the Farwake, in Skarnholm, has a wreck in the bay and an insurance claim he doesn't like."];
      if (at === 1) return ["The Grey Heron struck a reef in Skarnholm Bay, sailing by a Farwake chart that showed clear water. Her wreck is on the bay's southern island.", mark(has(game.player, "heron_log") || !!data(game, "fc_log"), "Search the wreck of the Grey Heron for her log")];
      if (at === 2) return ["The Heron's chart is a Farwake \"trade chart\", the reef left off. Navigator Sigrun, on Skarnholm's quay, says the guild keeps a true chart for its own. A true chart of the bay can be made at the survey cairns on its islands.", ...FC_CAIRNS.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 3) return ["The soundings agree with the reef, and with Sigrun. Torvald should hear what the true chart says, and decide what the guild does with it.", "• Talk to Guildmaster Torvald"];
      return [c === FC_FREE ? "I told Torvald to publish the true chart, free. Every captain on the bay sails by it now; the guild earns less and is cursed less. I'm sworn to the Farwake. QUEST COMPLETE!"
        : c === FC_SELL ? "I told Torvald to sell the true chart to anyone who pays. Nobody wrecks on the reef who could afford a chart. I'm sworn to the Farwake. QUEST COMPLETE!"
          : "I told Torvald to keep the true chart the guild's. Sigrun left the Farwake; its members' gear comes cheaper. I'm sworn to the Farwake. QUEST COMPLETE!"];
    },
  },
  {
    id: FREE_WEIGHT, name: "The Free Weight", points: 2, difficulty: "Experienced",
    start: "Talk to Speaker Zdenka of the Freeholds in Bereslav.",
    requirements: [`${FREE_WEIGHT_BARS} blackiron bars, and one more to test the scale with`, "Smithing 30 recommended"],
    rewards: ["2 Quest Points", "6,000 Smithing XP", "3,000 Mining XP", "Sworn to the Freeholds Compact: the Compact's Order and standing with the Compact"],
    journal: game => {
      const s = stage(game, FREE_WEIGHT), at = fw(game), c = fwChoice(game);
      if (s === 0) return ["Speaker Zdenka of the Freeholds, in Bereslav, thinks the princes are cheating the miners of Zlatna Gora. She'd like proof."];
      if (at === 1) return ["The princes take a tenth of Zlatna Gora's ore, weighed on their own scale. Zdenka thinks it weighs light.", ...FW_PROOF.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 2) return ["The princes' scale weighs a fifth light, and the reeve only weighs what he's told to. The Compact means to cast its own weight, honest and stamped.", mark(count(game.player, "blackiron_bar") >= FREE_WEIGHT_BARS, `Bring ${FREE_WEIGHT_BARS} blackiron bars to Zdenka for the free weight`)];
      if (at === 3) return ["The free weight is cast. Kazimir's miners and the Compact's speakers are at Bereslav, waiting to hear what's done with it.", "• Talk to Speaker Zdenka"];
      return [c === FW_HONEST ? "I said pay the tithe, on honest scales. The reeve weighs with the free weight now. I'm sworn to the Compact. QUEST COMPLETE!"
        : c === FW_REFUSE ? "I said refuse the tithe. The reeve was driven out of Zlatna Gora, and the Compact's own stores are open in Bereslav. I'm sworn to the Compact. QUEST COMPLETE!"
          : "I said let the miners strike. The princes halved the tithe in a month; Zdenka didn't like the Compact being decided by a strike. I'm sworn to the Compact. QUEST COMPLETE!"];
    },
  },
];
function finish(game: Game, id: string, key: string, choice: number) {
  const p = game.player; p.questData[key] = choice;
  if (id === TRUE_CHART) { flag(game, "farwake_member"); addXp(game, "seafaring", 6000, { raw: true }); addXp(game, "agility", 2000, { raw: true }); p.standing.farwake = (p.standing.farwake ?? 0) + 10; take(p, "bay_soundings", 1); }
  else { flag(game, "freeholds_member"); addXp(game, "smithing", 6000, { raw: true }); addXp(game, "mining", 3000, { raw: true }); p.standing.freeholds = (p.standing.freeholds ?? 0) + 10; }
  completeQuest(game, id);
}

/** The guilds' people. Null when there's nothing of theirs to say (and the next talk in the north's chain runs). */
export function talkNorthGuilds(game: Game, npcId: string, name: string, usual: () => Dialogue | null): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const more = (lines: string[], options: Dialogue["options"] = []) => chat(name, npcSays(name, ...lines), [...(options ?? []), { label: "Something else.", then: () => usual() }]);
  const ask = (lines: string[], label: string, reply: string[], key: string, after: () => void) => more(lines, [{ label, then: () => { flag(game, key); after(); return says(...reply); } }]);
  const sc = stage(game, TRUE_CHART), ac = fc(game), cc = fcChoice(game), sw = stage(game, FREE_WEIGHT), aw = fw(game), cw = fwChoice(game);
  const run = game.player.activities.run;
  switch (npcId) {
    case "farwake_master": {
      if (sc === 0) return more(["The Grey Heron, chartered by the Farwake, struck a reef in our own bay. Her captain says our chart showed clear water. He would say that. I'd like to know."], [
        { label: "I'll find out.", then: () => chat(name, npcSays(name, "She went down off the bay's southern island. If her log's still aboard, it'll tell you what chart she was sailing by. You'll need a boat."), undefined, () => {
          game.player.quests[TRUE_CHART] = 1; game.player.questData.fc_step = 1; say(game, "Quest started: The True Chart.");
        }) },
        { label: "Not now.", then: () => null }]);
      if (sc === 1 && ac <= 2) return more([ac === 1 ? "The southern island. Her log, if it's there." : "Sigrun's been talking to you. Of course she has."]);
      if (sc === 1 && ac === 3) return chat(name, npcSays(name, "Your soundings. The reef, where you say it is, and where the trade chart doesn't. I know. I've always known. The guild sells the true chart to its own and the trade chart to everyone else, and everyone else hires our pilots. That's how the Farwake eats.", "So. You've made a true chart of the bay. What does the guild do with it?"), [
        { label: "Publish it, free, for every captain.", then: () => chat(name, npcSays(name, "Free. The guild will earn less, and drown fewer strangers. Sigrun will be unbearable. Very well."), undefined, () => { finish(game, TRUE_CHART, "fc_choice", FC_FREE); say(game, "The true chart of the bay is free to every captain. You're sworn to the Farwake."); }) },
        { label: "Sell the true chart to anyone who pays.", then: () => chat(name, npcSays(name, "One chart, the true one, for anyone with the silver. The pilots will grumble. The insurers will cheer. A merchant's answer, and I'm a merchant."), undefined, () => { finish(game, TRUE_CHART, "fc_choice", FC_SELL); say(game, "The true chart is sold to anyone who pays. You're sworn to the Farwake."); }) },
        { label: "Keep it the guild's. That's what the guild is.", then: () => chat(name, npcSays(name, "The guild's, then, and its members'. Sigrun will leave over it. Let her; she can draw her own charts somewhere else. You're one of ours now, and ours sail by the true one."), undefined, () => { finish(game, TRUE_CHART, "fc_choice", FC_SECRET); say(game, "The true chart stays the guild's. Sigrun leaves the Farwake. You're sworn to it."); }) },
        { label: "Not yet.", then: () => null }]);
      if (sc >= 2) return more([cc === FC_FREE ? "Every fishing boat on the bay has our chart nailed up in it. Free. It's the strangest advertising I've ever paid for." : cc === FC_SELL ? "We sell one chart now, the true one, to anyone. The pilots found other work. Most of them." : "The guild keeps its charts. Our members sail safe."], [
        { label: "My standing with the Farwake.", then: () => standingTalk(game, name, "farwake", usual) }]);
      return null;
    }
    case "navigator_sigrun":
      if (inFc(game, 2) && !data(game, "fc_sigrun")) return chat(name, npcSays(name, "That's a trade chart. The reef's left off it on purpose. The guild draws two of every coast: the true one for its members, and the one it sells to everyone else, so they hire a Farwake pilot or take their chances.",
        "I've told Torvald it'll drown someone. Now it has. Want proof he can't wave away? Make your own chart. There are survey cairns on the bay's three big islands; take soundings at each, and you'll have the bay as it is."), undefined, () => { flag(game, "fc_sigrun"); });
      if (inFc(game, 2)) return more(["The three cairns, on the great island, the eastern one and the northern one. Soundings at each."]);
      if (sc >= 2) return says(cc === FC_FREE ? "Free charts. I never thought he'd do it. I'm drawing the outer coast next, for nothing." : "One true chart, for sale. Better than two. Not as good as free.");
      return says("Every hazard in this bay has a name and a date. I'd rather it didn't get any more of either.");
    case "freeholds_speaker": {
      if (run?.id === "compact_order" && !run.marks.delivered) {
        const metal = String(run.target.metal), want = Number(run.target.count), bar = `${metal}_bar`;
        if (count(game.player, bar) >= want) return chat(name, npcSays(name, "The Compact's order. Let's see it."), [
          { label: `Here are the ${want} bars.`, then: () => { take(game.player, bar, want); activityMark(game, "compact_order", "delivered"); return null; } }, { label: "Not yet.", then: () => usual() }]);
      }
      if (sw === 0) return more(["The princes take a tenth of every cart of ore out of Zlatna Gora, weighed on the princes' own scale. The miners say a tenth feels like an eighth. I think they're right, and I can't prove it."], [
        { label: "I'll prove it.", then: () => chat(name, npcSays(name, "Take a blackiron bar to Zlatna Gora: a bar's weight is a bar's weight, the Compact's smiths make them true. Put it on the princes' scale and see what it says. Talk to the reeve who weighs, and to Kazimir, who digs."), undefined, () => {
          game.player.quests[FREE_WEIGHT] = 1; game.player.questData.fw_step = 1; say(game, "Quest started: The Free Weight.");
        }) },
        { label: "Not now.", then: () => null }]);
      if (sw === 1 && aw === 1) return more(["The scale, the reeve and Kazimir. A blackiron bar for the scale."]);
      if (sw === 1 && aw === 2) return count(game.player, "blackiron_bar") >= FREE_WEIGHT_BARS ? chat(name, npcSays(name, `${FREE_WEIGHT_BARS} bars. The Compact's founder will cast them into one weight, stamped with the free mark, and every cart in the Compact will be weighed against it.`), undefined, () => {
        take(game.player, "blackiron_bar", FREE_WEIGHT_BARS); game.player.questData.fw_step = 3; say(game, "The free weight is cast. Zdenka will put it to the Compact.");
      }) : more([`Light by a fifth. Then we cast our own weight, honest and stamped. ${FREE_WEIGHT_BARS} blackiron bars, please; the founder's waiting.`]);
      if (sw === 1 && aw === 3) return chat(name, npcSays(name, "Here it is: the free weight. Kazimir's miners are outside, and half the Compact's speakers. The princes' reeve is pretending he isn't listening.", "What does the Compact do?"), [
        { label: "Pay the tithe, on honest scales.", then: () => chat(name, npcSays(name, "A tenth, weighed true. The princes can hardly say no to their own law, kept honestly. It's less than I wanted. It's more than we had."), undefined, () => { finish(game, FREE_WEIGHT, "fw_choice", FW_HONEST); say(game, "The tithe is paid on honest scales. You're sworn to the Compact."); }) },
        { label: "Refuse it. Zlatna Gora's ore is the Compact's.", then: () => chat(name, npcSays(name, "Then the reeve goes home to Krasnogor, and the ore stays where it's dug. The princes will be furious. The Compact's stores will open here: our iron, at our price, for anyone."), undefined, () => { finish(game, FREE_WEIGHT, "fw_choice", FW_REFUSE); say(game, "The Compact refuses the tithe; the reeve is driven out. The Compact's stores open in Bereslav. You're sworn to the Compact."); }) },
        { label: "Let the miners strike until the princes halve it.", then: () => chat(name, npcSays(name, "Kazimir's way. It'll work; the princes need the iron more than the miners need the princes. I didn't want the Compact decided by who can go hungry longest. It's decided."), undefined, () => { finish(game, FREE_WEIGHT, "fw_choice", FW_STRIKE); say(game, "The miners strike; the princes halve the tithe. You're sworn to the Compact."); }) },
        { label: "Not yet.", then: () => null }]);
      if (sw >= 2) return more([cw === FW_HONEST ? "Every cart weighed against the free weight. The miners still grumble about the tenth. They grumble less." : cw === FW_REFUSE ? "No tithe, no reeve, and a prince who won't say my name. The stores are doing well." : "A twentieth, after the strike. Kazimir's a hero in Zlatna Gora. I'm the woman who wanted to talk."], [
        ...(cw === FW_REFUSE ? [{ label: "Show me the Compact's stores.", then: () => { game.ui.shop = "compact_stores"; return null; } }] : []),
        { label: "My standing with the Compact.", then: () => standingTalk(game, name, "freeholds", usual) }]);
      return null;
    }
    case "tithe_reeve_gorislav":
      if (inFw(game, 1) && !data(game, "fw_reeve")) return ask(["Ore for the princes' tenth? On the scale, then."], "Whose scale is it?",
        ["The princes'. Sent from the Terem in a box with their seal on it. I weigh what goes on it and write down what it says.", "Light? I've never weighed anything on another scale. Why would I?"], "fw_reeve", () => checkProof(game));
      if (sw >= 2) return says(cw === FW_HONEST ? "I weigh against the free weight now. The carts come out the same. The princes get less. Nobody's thanked me." : "A twentieth now. Less to weigh. Fewer people shouting at me.");
      return says("A tenth of every cart, for the princes. I just weigh it.");
    case "zlatna_foreman":
      if (inFw(game, 1) && !data(game, "fw_kazimir")) return ask(["Every cart we fill, the princes take a tenth, and it feels like an eighth."], "What do the miners want?",
        ["To be paid for what we dig, and taxed on what we dig, not on what the princes' box says we dug.", "The Speaker wants to talk. My miners want to put their picks down until the princes listen. I'm with my miners."], "fw_kazimir", () => checkProof(game));
      if (sw >= 2) return says(cw === FW_STRIKE ? "We put our picks down, and the princes halved it in a month. I'll tell that story till I die." : cw === FW_REFUSE ? "No tithe. The princes say they'll send the druzhina. Let them walk up here." : "Honest scales. It's a start.");
      return null;
    case "prince_radomir":
      if (sw >= 2 && cw === FW_REFUSE) return more(["The Compact refuses our tithe and sends our reeve home in a cart. Freeholds. Free of what? Of us, apparently."]);
      if (sw >= 2 && cw === FW_STRIKE) return more(["A strike. They put their picks down, and we halved the tithe. Don't tell me that was clever."]);
      return null;
  }
  return null;
}
function checkProof(game: Game) {
  if (!inFw(game, 1) || !FW_PROOF.every(([key]) => data(game, key))) return;
  game.player.questData.fw_step = 2; say(game, "The scale's light, the reeve just weighs, and the miners are ready to strike. Zdenka should hear it.");
}
function checkCairns(game: Game) {
  if (!inFc(game, 2) || !FC_CAIRNS.every(([key]) => data(game, key))) return;
  give(game.player, "bay_soundings", 1); game.player.questData.fc_step = 3; say(game, "Soundings from all three cairns: a true chart of the bay, the reef and all. Torvald should see it.");
}

/** Places: the Heron's wreck, the survey cairns, the princes' scale. */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const cairn = (key: string, survey: string): Clue => ({
  options: () => ["Take-soundings", "Examine"], examine: () => "A Farwake survey cairn: a stack of stones with a bronze plate on top, a compass rose cut in it, and a lead line coiled in a niche.",
  use: game => {
    activityMark(game, "farwake_survey", survey);
    if (inFc(game, 2) && !data(game, key)) { flag(game, key); addXp(game, "seafaring", 300, { raw: true }); checkCairns(game); return { text: "You drop the cairn's lead line off the rocks and note the depths, and the bearings to the other islands off the plate. One more piece of the bay as it really is." }; }
    return { text: "You take soundings off the rocks and note the bearings. The bay hasn't moved since last time." };
  },
});
export const GUILD_CLUES: Record<string, Clue> = {
  heron_wreck: {
    options: () => ["Search", "Examine"], examine: () => "The Grey Heron, a Farwake-chartered trader, on her side on the rocks, her keel opened by the reef.",
    use: game => {
      if (!inFc(game, 1)) return { text: "The Grey Heron, broken on the reef. Nothing left aboard worth the climb." };
      give(game.player, "heron_log", 1); flag(game, "fc_log"); game.player.questData.fc_step = 2; addXp(game, "seafaring", 200, { raw: true });
      say(game, "A Farwake trade chart, the reef left off. Navigator Sigrun, on Skarnholm's quay, reads charts better than anyone.");
      return { text: "In the captain's chest, wrapped in oilcloth: the log, and folded in it the chart she sailed by. The Farwake's mark in the corner, \"trade chart\" in small letters underneath, and no reef where the Heron struck one." };
    },
  },
  survey_cairn_1: cairn("fc_c1", "cairn1"),
  survey_cairn_2: cairn("fc_c2", "cairn2"),
  survey_cairn_3: cairn("fc_c3", "cairn3"),
  tithe_scale: {
    options: game => inFw(game, 1) && !data(game, "fw_scale") ? ["Test-weight", "Examine"] : ["Examine"],
    examine: game => fwChoice(game) === FW_HONEST ? "The tithe-scale, with the Compact's free weight beside it, stamped." : "The princes' tithe-scale: brass pans, an iron beam, the princes' seal on the box it came in.",
    use: game => {
      if (!inFw(game, 1) || data(game, "fw_scale")) return { text: "The princes' tithe-scale." };
      if (!has(game.player, "blackiron_bar")) return { text: "You need something of known weight to test it with: a blackiron bar from a Compact smith would do." };
      flag(game, "fw_scale"); addXp(game, "smithing", 200, { raw: true }); checkProof(game);
      return { text: "A blackiron bar weighs a bar. On the princes' scale it weighs four-fifths of one. Load the princes' tenth until this scale says a tenth, and you've handed over an eighth." };
    },
  },
};
