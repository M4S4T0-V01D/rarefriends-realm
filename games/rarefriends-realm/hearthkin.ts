/**
 * The Hearthkin: the mountains' own Rare Friends (the Skill overhaul's people of Emberforge and Frostpeak). Short,
 * broad, slow to warm and impossible to cool, they mine, smelt and smith as other Friends breathe; their art is the
 * HEARTHKIN family (sprites.ts). Emberforge's wear soot and leather and talk of tallies; Frostpeak's wear fur and talk
 * of weather. Both touch the Strong Friend's statue going in and coming out, and neither will tell you who he was.
 *
 * Here: the Fellows of Metal (Emberforge's guild of Mining and Smithing, with its Deep under the town), the Old
 * Pavilion and its Keeper, the Ashen quarry's master, the supply shops, Frostpeak's two legendary smiths and its elder,
 * the camp warden at the lower lodge, and their quests: The Fellows' Trial, The Elder Anvil, The Cold Quench and
 * Veins of the Shoulder. The quests' rewards are places and ways of working, not gear handed over: the Deep and the
 * guild furnaces, the Elder anvils, the cold quench, Oddhand's gauge (engine.ts applies them at the stations).
 *
 * The Strong Friend is foreshadowed and not explained: what the Hearthkin say of him is what they believe.
 */
import { addXp, giveOrDrop, has, level, take, type Dialogue, type Game } from "./state.ts";
import { chat, fetchQuest, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { HEARTHKIN } from "./sprites.ts";
import type { WorldObject } from "./world.ts";

import { COLD_QUENCH, ELDER_ANVIL, FELLOWS_TRIAL, VEINS } from "./hearthkinnames.ts";
export { COLD_QUENCH, COLD_QUENCH_ANVIL, ELDER_ANVIL, ELDER_ANVIL_NAME, FELLOWS_TRIAL, GAUGE_RESPAWN, GAUGE_ROCKS, GUILD_FURNACE, VEINS } from "./hearthkinnames.ts";

const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: HEARTHKIN, seed }, ...extra });
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const short = (game: Game, needs: Partial<Record<"mining" | "smithing", number>>) => Object.entries(needs).filter(([skill, need]) => level(game, skill as "mining") < need).map(([skill, need]) => `${skill === "mining" ? "Mining" : "Smithing"} ${need}`);

/** What each quest asks for (checked against the pack, taken when delivered). */
const WANTS: Record<string, readonly [item: string, n: number][]> = {
  [FELLOWS_TRIAL]: [["moonsilver_bar", 4], ["moonsilver_rivets", 10]],
  [ELDER_ANVIL]: [["blackiron_bar", 10], ["inkcoal", 5]],
  [COLD_QUENCH]: [["frost_shard", 3], ["inkcoal", 6], ["moonsilver_bar", 2]],
  [VEINS]: [["moonsilver_ore", 8], ["rough_moonstone", 1]],
};
const haveAll = (game: Game, quest: string) => WANTS[quest].every(([id, n]) => has(game.player, id, n));
const takeAll = (game: Game, quest: string) => { for (const [id, n] of WANTS[quest]) take(game.player, id, n); };
const NAMES: Record<string, string> = { moonsilver_bar: "moonsilver bars", moonsilver_rivets: "moonsilver rivets", blackiron_bar: "blackiron bars", inkcoal: "inkcoal", frost_shard: "frost shards", moonsilver_ore: "moonsilver ore", rough_moonstone: "rough moonstone" };
const wantLines = (game: Game, quest: string) => WANTS[quest].map(([id, n]) => mark(has(game.player, id, n), `${n} ${NAMES[id]}`));

export const HEARTHKIN_NPCS: Record<string, NpcDef> = {
  // ---------- Emberforge ----------
  fellows_warden: person("fellows_warden", "Warden Durra Ironhollow", "Head of the Fellows of Metal. Arms like anvils, and a voice like one being struck.", 2101),
  fellows_foreman: person("fellows_foreman", "Foreman Brack Tollund", "Keeps the Fellows' Deep: the tally, the props, the air. Smells of inkcoal and wet rope.", 2102),
  fellows_assayer: person("fellows_assayer", "Assayer Pim Ashgrove", "Weighs ore on a brass scale and tells you what it's worth before it's on the pan.", 2103, { options: ["Talk-to", "Trade"], shop: "fellows_assay" }),
  pavilion_keeper: person("pavilion_keeper", "Keeper Aud Stonebrow", "Older than anyone in Emberforge, and the Pavilion is older than her. She sweeps it every morning.", 2104),
  ember_supplier: person("ember_supplier", "Marrow Quick", "Picks & Carts. Sells what a miner forgot at home, at a price that remembers it.", 2105, { options: ["Talk-to", "Trade"], shop: "ember_supply" }),
  quarry_master: person("quarry_master", "Quarrymaster Hesk Blackmantle", "Runs the Ashen quarry's tallies and tempers. Chalk on every finger.", 2106),
  ember_hearthkin_villager: person("ember_hearthkin_villager", "Emberforge Hearthkin", "One of the Hearthkin of Emberforge: soot to the elbows, leather apron, a grin like a furnace door.", 2107),
  // ---------- Frostpeak ----------
  frost_smith_cold: person("frost_smith_cold", "Sigrún Coldhammer", "The Frostsmith. Her forge runs cold on purpose: frostsilver is quenched in snowmelt, and nothing else will do.", 2111),
  frost_smith_wright: person("frost_smith_wright", "Bramble Oddhand", "The Mountain-wright. Six fingers on the left hand, and every one of them knows rock.", 2112),
  frost_elder: person("frost_elder", "Elder Ysolde Rimeward", "The oldest voice in Frostpeak. Remembers when the town was a camp, and before that, when it was a town.", 2113),
  frost_hearthkin_villager: person("frost_hearthkin_villager", "Frostpeak Hearthkin", "One of the Hearthkin of Frostpeak: fur to the chin, frost in the beard, and no hurry whatever.", 2114),
  camp_warden: person("camp_warden", "Camp warden Tove", "Keeps the lower lodge for those going up, and those coming down.", 2115),
};

export const HEARTHKIN_QUESTS: readonly QuestDef[] = [
  {
    id: FELLOWS_TRIAL, name: "The Fellows' Trial", points: 2, difficulty: "Intermediate", start: "Talk to Warden Durra Ironhollow at the Fellows of Metal's hall in Emberforge.",
    requirements: ["Mining 50", "Smithing 50"], rewards: ["2 Quest Points", "5,000 Mining XP", "5,000 Smithing XP", "A Fellow of Metal: the Fellows' Deep under Emberforge, and the guild furnaces"],
    journal: game => {
      const s = stage(game, FELLOWS_TRIAL);
      if (s === 0) return ["The Fellows of Metal keep a hall in Emberforge, north of the forge. Their Warden takes new Fellows at Mining 50 and Smithing 50."];
      if (s === 1) return ["Warden Ironhollow wants moonsilver work that will pass her eye: bars, and rivets from the Shipwright's family.", ...wantLines(game, FELLOWS_TRIAL), "• Bring them to the Warden"];
      return ["I am a Fellow of Metal. The Deep under the hall is open to me, and the guild furnaces give up a second bar now and then. QUEST COMPLETE!"];
    },
  },
  {
    id: ELDER_ANVIL, name: "The Elder Anvil", points: 1, difficulty: "Intermediate", start: "Talk to Keeper Aud Stonebrow at the Old Pavilion in Emberforge.",
    requirements: ["Mining 30", "Smithing 30"], rewards: ["1 Quest Point", "4,000 Smithing XP", "The Elder anvils: a quarter more Smithing XP at the Old Pavilion"],
    journal: game => {
      const s = stage(game, ELDER_ANVIL);
      if (s === 0) return ["West of Emberforge stands the Old Pavilion, open to the weather, older than the town. Its Keeper sweeps it every morning."];
      if (s === 1) return ["Keeper Stonebrow will let me work the Elder anvils when I've fed them: blackiron bars for the Pavilion's own stores, and inkcoal for its hearth.", ...wantLines(game, ELDER_ANVIL), "• Bring them to the Keeper"];
      return ["The Elder anvils ring for me now. Everything I smith at the Pavilion teaches me more. QUEST COMPLETE!"];
    },
  },
  {
    id: COLD_QUENCH, name: "The Cold Quench", points: 2, difficulty: "Experienced", start: "Talk to Sigrún Coldhammer in Frostpeak, high on the mountain.",
    requirements: ["Smithing 50", "Mining 45"], rewards: ["2 Quest Points", "9,000 Smithing XP", "The cold quench: at Coldhammer's anvil, forged metal keeps a bar back one time in five"],
    journal: game => {
      const s = stage(game, COLD_QUENCH);
      if (s === 0) return ["Sigrún Coldhammer, the Frostsmith of Frostpeak, quenches frostsilver in snowmelt. She teaches it to those who bring her the makings."];
      if (s === 1) return ["The cold quench wants frost shards from the yetis, inkcoal for the forge, and moonsilver bars for the trough's lining.", ...wantLines(game, COLD_QUENCH), "• Bring them to Sigrún"];
      return ["Sigrún showed me the cold quench. At her anvil, forged metal keeps a bar back one time in five. QUEST COMPLETE!"];
    },
  },
  {
    id: VEINS, name: "Veins of the Shoulder", points: 2, difficulty: "Experienced", start: "Talk to Bramble Oddhand in Frostpeak, high on the mountain.",
    requirements: ["Mining 55"], rewards: ["2 Quest Points", "7,000 Mining XP", "Oddhand's gauge: moonsilver, glimmer and rarite rocks come back a third sooner for you"],
    journal: game => {
      const s = stage(game, VEINS);
      if (s === 0) return ["Bramble Oddhand, the Mountain-wright of Frostpeak, reads rock the way others read books. He wants moonsilver from the mountain's own veins."];
      if (s === 1) return ["Oddhand wants moonsilver ore (the mountain's faces, the summit's, the quarry's, any) and a rough moonstone to set in the gauge.", ...wantLines(game, VEINS), "• Bring them to Oddhand"];
      return ["Oddhand set the moonstone in a brass gauge and gave it to me. Carried, it reads the vein: moonsilver, glimmer and rarite come back a third sooner. QUEST COMPLETE!"];
    },
  },
];

/** The Strong Friend, as the Hearthkin tell it: never the same way twice, and never all of it. */
const STRONG_FRIEND = [
  "The Strong Friend? He was one of us. Then he was more. That's all anyone knows, and more than most will say.",
  "Touch the statue going in and coming out. Don't ask me why. My mother did it, and the mountain hasn't fallen on me yet.",
  "They say his statue was carved from life. They say a lot of things. The face is worn off, so you'll have to take their word.",
  "There's a city under the mountains, older than Emberforge, where they still keep his feast. Nobody I know has seen it. Everybody I know has an uncle who has.",
  "Some say he lifted the mountain. Some say he's under it. The Keeper says both, which is the Keeper for you.",
];
const EMBER_LINES = [
  "Mind the carts. They don't mind you.",
  "A Fellow of Metal gets the Deep and the good furnaces. The rest of us get the view.",
  "Pewter's for learning. Blackiron's for living. Moonsilver's for showing off.",
  "The Pavilion was here before the town. The town just grew up round it, like moss round a stone.",
  "Frostpeak moved up the mountain, where it used to be. Took them long enough.",
];
const FROST_LINES = [
  "You came up the switchbacks? Then you've earned the fire. Sit.",
  "The yetis keep the summit. We keep the shoulder. It's an arrangement.",
  "Sigrún's forge is the coldest in the Realm and the best. Don't tell her I said the second part.",
  "Oddhand can tell you what's in a rock by licking it. Don't ask him to.",
  "The old camp down the hill was us, once. We came back up when the snow let us.",
];

type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
/** The Strong Friend's statues and the Pavilion's plaque: looked at, touched, read; what they say is what's worn into them. */
export const HEARTHKIN_CLUES: Record<string, Clue> = {
  strong_friend: {
    options: () => ["Touch"],
    examine: () => "A squat figure in dark stone, broad as it's tall, a hammer across its knees. The face is worn smooth by ten thousand thumbs. It looks like the Hearthkin; or they look like it.",
    use: game => { game.player.questData.touched_strong_friend = (game.player.questData.touched_strong_friend ?? 0) + 1; return { text: pick(game, ["You touch the statue's knee, where the stone is darkest and smoothest. It's warm. The Pavilion's hearth is a long way off.", "You touch the hammer. Under the wear there are marks on the haft, too worn to read, in no script you know.", "You touch the statue. A Hearthkin passing does the same without looking, and nods to you as if you'd said something."]) }; },
  },
  pavilion_plaque: {
    options: () => ["Read"],
    examine: () => "A bronze plaque let into the Pavilion's floor, polished by feet to a few readable words.",
    use: () => ({ text: "'…was one of us. Then he was more. He lifted…' The rest is worn away. Below, smaller, in a different hand: 'He is under.'" }),
  },
};

export function talkHearthkin(game: Game, npcId: string, name: string): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const needs = (quest: string, levels: Partial<Record<"mining" | "smithing", number>>, refusal: string) => {
    const lacking = short(game, levels);
    return stage(game, quest) === 0 && lacking.length ? says(`${refusal} ${lacking.join(" and ")} first.`) : null;
  };
  switch (npcId) {
    case "fellows_warden": {
      const gate = needs(FELLOWS_TRIAL, { mining: 50, smithing: 50 }, "The Fellows take miners and smiths who've proved it. Come back with"); if (gate) return gate;
      return fetchQuest(game, name, FELLOWS_TRIAL, {
        offer: ["The Fellows of Metal: a hall, a Deep, the best furnaces in the Realm, and a door that only opens for Fellows.", "You want in? Show me moonsilver work. Four bars, clean, and ten rivets from the Shipwright's family. I'll know if you bought them."],
        accept: "Good. The Deep waits for nobody, but it'll wait for you.", progress: "Four moonsilver bars and ten moonsilver rivets. The anvil's through there if you're short.",
        have: () => haveAll(game, FELLOWS_TRIAL), take: () => takeAll(game, FELLOWS_TRIAL),
        done: ["…Clean. The rivets are even. Welcome to the Fellows.", "The gate to the Deep is yours, and the guild furnaces: they give up a second bar now and then, for those who know how to ask. Brack keeps the Deep. Pim buys what you bring up."],
        reward: () => { addXp(game, "mining", 5000, { raw: true }); addXp(game, "smithing", 5000, { raw: true }); },
      });
    }
    case "fellows_foreman":
      if (!questDone(game, FELLOWS_TRIAL)) return says("The Deep's for Fellows. The Warden makes Fellows. I make sure they come back up.");
      return says(pick(game, ["The Deep: glimmer and rarite in the far galleries, moonsilver nearer the ladder, charged sigil stone where the props are new. Cave spiders in the dark end; they came up from somewhere we haven't found yet.",
        "Mind the props. Mind the air. Mind the spiders. In that order.", "Nobody's dug past the far wall. There's a sound behind it some nights, like a very large bell, very far down. The Warden says it's the mountain settling. The Keeper says nothing at all."]));
    case "fellows_assayer": return says("Bring me ore and I'll weigh it true: the Fellows pay better than the old miner down the hill, because we melt it ourselves. Picks for the deep rock, too, if yours is short.");
    case "pavilion_keeper": {
      const gate = needs(ELDER_ANVIL, { mining: 30, smithing: 30 }, "The Elder anvils aren't for beginners. Come back at"); if (gate) return gate;
      if (questDone(game, ELDER_ANVIL)) return chat(name, npcSays(name, pick(game, ["The anvils like you. I can hear it.", "Sweep your filings into the hearth. The Pavilion keeps what's given."])), [
        { label: "Tell me about the Strong Friend.", then: () => says(pick(game, STRONG_FRIEND)) },
        { label: "Tell me about the Pavilion.", then: () => says("Older than the town. Older than the Fellows. The pillars were quarried from somewhere there isn't a quarry. The anvils were here when the first Hearthkin came down the mountain, and they were already old.") },
        { label: "Goodbye.", then: () => null },
      ]);
      return fetchQuest(game, name, ELDER_ANVIL, {
        offer: ["This is the Old Pavilion. It was here before Emberforge, and it'll be here after. The Elder anvils are its own; they teach anyone who works them, if they've been fed.", "Feed them: ten blackiron bars for the Pavilion's stores, and five inkcoal for its hearth. Then they're yours to work."],
        accept: "Good. Stack the bars by the hearth when you have them.", progress: "Ten blackiron bars and five inkcoal. The hearth's hungry; it always was.",
        have: () => haveAll(game, ELDER_ANVIL), take: () => takeAll(game, ELDER_ANVIL),
        done: ["There. The hearth's lit, and the anvils have heard your name.", "Work them whenever you like. Everything you make here teaches you a quarter more than it would elsewhere. And touch the statue going out. Everybody does."],
        reward: () => addXp(game, "smithing", 4000, { raw: true }),
      });
    }
    case "ember_supplier": return says("Picks & Carts. A pick for every rock up to moonsilver, inkcoal when the quarry's slow, and bread, because nobody ever remembers bread.");
    case "quarry_master": return says(pick(game, ["The quarry: pewter on the floor, blackiron on the terraces, inkcoal east, moonsilver on the upper lip. The shaft by the shed goes down to more of the same, out of the rain.",
      "The shaft's safe. The tunnel off the shaft isn't: there's heat in it, and things that like heat. Nobody makes you go in. The gem rock at the end makes some go in.",
      "Rats in the shaft, same as up here. Salamanders in the tunnel, and not the small kind. Mind the signs."]));
    case "ember_hearthkin_villager": return says(game.rng() < 0.3 ? pick(game, STRONG_FRIEND) : pick(game, EMBER_LINES));
    // ---------- Frostpeak ----------
    case "frost_smith_cold": {
      const gate = needs(COLD_QUENCH, { smithing: 50, mining: 45 }, "The cold quench isn't for warm hands. Come back at"); if (gate) return gate;
      if (questDone(game, COLD_QUENCH)) return says(pick(game, ["Snowmelt, never river water. River water remembers the valley.", "Forged metal at my anvil keeps a bar back now and then. That's the quench, not me."]));
      return fetchQuest(game, name, COLD_QUENCH, {
        offer: ["Frostsilver. Everyone forges it hot and quenches it hot, and wonders why it's brittle. I quench it in snowmelt, in a trough lined with moonsilver, and it doesn't break.", "I'll show you. Bring me three frost shards from the yetis on the summit, six inkcoal, and two moonsilver bars for the trough."],
        accept: "The yetis are over the shoulder, where the wind is. Don't go up alone if you can help it.", progress: "Three frost shards, six inkcoal, two moonsilver bars. The trough's waiting.",
        have: () => haveAll(game, COLD_QUENCH), take: () => takeAll(game, COLD_QUENCH),
        done: ["Watch. Hot bar, cold trough, and the steam you don't breathe. Again. Again. Now you.", "That's the cold quench. At my anvil, one time in five, forged metal keeps a bar back: the quench takes less than the fire does. It won't work anywhere else. Nowhere else is this cold."],
        reward: () => addXp(game, "smithing", 9000, { raw: true }),
      });
    }
    case "frost_smith_wright": {
      const gate = needs(VEINS, { mining: 55 }, "I don't talk rock with people who can't hear it yet. Come back at"); if (gate) return gate;
      if (questDone(game, VEINS)) return says(pick(game, ["The gauge reads the vein. Keep it on you and the deep rock heals faster for you; it knows it's being listened to.", "Rarite's on the summit among the yetis, glimmer on the scree below. The Fellows' Deep has both, under Emberforge, if you're a Fellow."]));
      return fetchQuest(game, name, VEINS, {
        offer: ["Every rock has a rhythm. Moonsilver's is slow. Glimmer's is slower. Rarite's you can feel in your teeth. I make gauges that hear it.", "Bring me eight moonsilver ore from the mountain's own veins, and a rough moonstone to set in the brass, and I'll make one for you."],
        accept: "The faces along the track are the safe ones. The summit's are richer, and the yetis know it.", progress: "Eight moonsilver ore and a rough moonstone. The gem rock by the quarry's north edge has the stone.",
        have: () => haveAll(game, VEINS), take: () => takeAll(game, VEINS),
        done: ["Hold still. There. Brass, moonstone, six marks: one for each finger.", "Carry it and the deep rock comes back a third sooner for you: moonsilver, glimmer, rarite. It listens to the gauge. Don't lose it; I don't make two for anyone."],
        reward: () => { addXp(game, "mining", 7000, { raw: true }); giveOrDrop(game, "oddhands_gauge", 1); },
      });
    }
    case "frost_elder": return chat(name, npcSays(name, pick(game, ["Frostpeak was a town, then a camp, then a town again. The snow decides. We just wait for it.", "The lower lodge is where we wintered when the pass closed. Tove keeps it now, for the ones still coming up."])), [
      { label: "Tell me about the Strong Friend.", then: () => says(pick(game, STRONG_FRIEND)) },
      { label: "Tell me about the smiths.", then: () => says("Sigrún learnt the cold quench from her grandmother, who learnt it from the snow. Bramble was born with the extra finger and the extra ear, and the mountain's been talking to him since.") },
      { label: "Goodbye.", then: () => null },
    ]);
    case "frost_hearthkin_villager": return says(game.rng() < 0.3 ? pick(game, STRONG_FRIEND) : pick(game, FROST_LINES));
    case "camp_warden": return says(pick(game, ["This is the lower lodge: the old Frostpeak camp. The town's up the mountain now, where it always was. Bank here, warm up, then take the track east and up through the pass.",
      "Two ways up: the switchbacks through the pass, which is the way, and the summit ridge, which is the yetis' way. Guess which one I recommend."]));
  }
  return null;
}
