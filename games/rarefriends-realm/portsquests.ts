/**
 * The sea ports' quests: one for each new place, none of them with a simply right answer.
 *
 * "Lights Out at Gullwick": Gullwick Light keeps going dark, and two boats have nearly gone onto Wrack Point. Somebody
 * waters the lamp's oil, and somebody hangs a lantern on the point where the Light ought to be. The wreckers are
 * fishers, and the Customs House's new dues are why.
 * "The King's Salt" (Saltreach): the Salt-House says the panners' sacks come in light; the panners say the King's scale
 * is heavy. Both are true.
 * "The Pearl-Divers' Debt" (Merrab): something hunts the deep pearl beds, and the divers can't dive, and the debt to the
 * Gilded Court's factor doubles at the new moon. The factor's ledger says rather more than he does.
 * "What the Tell Remembers" (Tel Ashun): the village digs its bricks out of the mound it stands on, and the diggers have
 * cut down into older layers. Read them, and take what they say to the elder.
 * "The Well's Share" (Ennu's Well): the oasis spring is failing. Something has bored into the old channel; once it's
 * clear, somebody has to say who drinks first.
 */
import { addXp, giveOrDrop, message, sound, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, npcSays, questDone, stage, type QuestDef } from "./content.ts";
import type { WorldObject } from "./world.ts";

export const LIGHTS = "lights_out_gullwick", SALT = "kings_salt", PEARLS = "pearl_divers_debt", TELL = "tell_remembers", WELL = "wells_share";
const FOOTHOLD = "foothold_in_the_stone";
/** The stage each of these quests is done at (content.ts finalStage). */
export const PORTS_FINAL: Readonly<Record<string, number>> = { [LIGHTS]: 5, [SALT]: 3, [PEARLS]: 3, [TELL]: 3, [WELL]: 3 };
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const all = (game: Game, keys: readonly string[]) => keys.every(key => data(game, key));
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const LAYERS = ["tl_0", "tl_1", "tl_2"] as const;

export const PORTS_QUESTS: readonly QuestDef[] = [
  {
    id: LIGHTS, name: "Lights Out at Gullwick", points: 1, difficulty: "Novice", start: "Talk to Harbourmaster Wenna Coyle in her office on Gullwick's harbour street.",
    requirements: ["Combat 20 recommended"],
    rewards: ["1 Quest Point", "1,500 Fishing XP", "800 Presence XP", "800 coins", "The keeper's oilskin"],
    journal: game => {
      const s = stage(game, LIGHTS);
      if (s === 0) return ["Gullwick's harbourmaster is looking at the lighthouse as if it had insulted her."];
      if (s === 1) return ["Gullwick Light has gone dark three nights this month, and two boats nearly went onto the rocks off Wrack Point. Harbourmaster Wenna Coyle wants to know why.",
        mark(!!data(game, "lo_keeper"), "Hear Keeper Ossian Penhale, in the Light"), mark(!!data(game, "lo_log"), "Read the lamp log, in the Light")];
      if (s === 2) return ["Somebody waters the Light's oil on the nights a paid-up cargo boat is due, and a light shows on Wrack Point where no light should be.", "• Find the light on Wrack Point, south of the quay"];
      if (s === 3) return ["A false lantern on Wrack Point, burning the Light's own oil, tied to its pole with a gansey sleeve in the Tregellas pattern. Wreckers.",
        "• Deal with the wreckers' chief on Wrack Point, or ask Nan Tregellas, by the quay, about the pattern"];
      if (s === 4) return [data(game, "lo_nan") ? "Nan Tregellas says the wreckers are fishers the new dues ruined, her son Kit among them, and that she will call him off." : "Kit Tregellas, the wreckers' chief, is dead, and the false lantern is out.",
        "• Tell Harbourmaster Wenna Coyle"];
      return [data(game, "lo_choice") === 1 ? "I told the harbourmaster why the wreckers wrecked. The small boats' dues are halved, and Kit Tregellas's lantern hangs in Gullwick Light now, lit the right way round. QUEST COMPLETE!"
        : "The wreckers' chief is dead and Wrack Point is dark. The dues stand, and the fishers don't look at me on the quay. QUEST COMPLETE!"];
    },
  },
  {
    id: SALT, name: "The King's Salt", points: 1, difficulty: "Novice", start: "Talk to Mother Brannagh by the salt pans at Saltreach.",
    requirements: [],
    rewards: ["1 Quest Point", "1,500 Stealth XP", "1,000 Presence XP", "1,000 coins", "The Ring of the True Weight"],
    journal: game => {
      const s = stage(game, SALT);
      if (s === 0) return ["The salt-panners of Saltreach and the King's Salt-House are not speaking, which in Raria is said very loudly."];
      if (s === 1) return ["The Salt-House fines the panners because their sacks come in light; the panners say the King's scale is heavy. Mother Brannagh wants somebody to weigh it up who isn't in the Ledger.",
        mark(!!data(game, "ks_assessor"), "Hear Tide-assessor Corvin Lisle, in the King's Salt-House"), mark(!!data(game, "ks_scale"), "Look at the King's scale, in the Salt-House"),
        mark(!!data(game, "ks_pans"), "Look at the pan-reeve's weights, in the weighing shed by the pans")];
      if (s === 2) return ["Both of them are cheating, a little: the King's new pound is a tenth heavier than the old one, and nobody was told; the panners have filed their own weights a twentieth light to make up for it.",
        "• Decide what the Tide-assessor hears, or what Mother Brannagh does"];
      return [["", "I told the Assessor about both. Saltreach weighs by the old pound again, and the panners' filed weights went into the furnace. QUEST COMPLETE!",
        "I told the Assessor about the panners' weights, and nothing else. The panners were fined, and the King's pound stands. QUEST COMPLETE!",
        "I told Mother Brannagh what I'd found, and nobody else. The panners keep their file, and the Salt-House keeps its pound. QUEST COMPLETE!"][data(game, "ks_choice")] ?? "QUEST COMPLETE!"];
    },
  },
  {
    id: PEARLS, name: "The Pearl-Divers' Debt", points: 2, difficulty: "Intermediate", start: "Talk to Head diver Yamina on Merrab's quay.",
    requirements: ["A Foothold in the Stone", "Combat 45 recommended"],
    rewards: ["2 Quest Points", "3,000 Pursuance XP", "2,000 Presence XP", "2,500 coins", "A Merrab pearl pendant"],
    journal: game => {
      const s = stage(game, PEARLS);
      if (s === 0) return ["Merrab's divers sit on the quay mending nets they don't need, looking at the sea."];
      if (s === 1) return ["Something hunts the deep pearl beds, so the divers dive only the shallow ones, and their debt to the Gilded Court's factor for their boats doubles at the new moon. Head diver Yamina wants the beds back.",
        mark(!!data(game, "pd_beast"), "Deal with whatever hunts the beds, from the diving rocks south of the town"), mark(!!data(game, "pd_factor"), "Hear Factor Ibrel Dahan, in the Pearl Exchange"),
        mark(!!data(game, "pd_ledger"), "Read the pearl ledger, in the Pearl Exchange")];
      if (s === 2) return ["Old Saltjaw is dead, and the ledger says the divers' pearls are counted small in Merrab and sold large in Sefrah: by Sefrah's count, the boats were paid for two years ago.", "• Tell Head diver Yamina"];
      return [data(game, "pd_choice") === 1 ? "The harbour-captain heard the ledger read. The divers' debt is cancelled, and the Gilded Court lends no more boats in Merrab. QUEST COMPLETE!"
        : "The factor halved the debt and weighs by Sefrah's carat now, and the ledger stays in his strongbox. QUEST COMPLETE!"];
    },
  },
  {
    id: TELL, name: "What the Tell Remembers", points: 1, difficulty: "Novice", start: "Talk to Elder Hazane in her house on top of the tell at Tel Ashun.",
    requirements: ["A Foothold in the Stone"],
    rewards: ["1 Quest Point", "2,000 Mysteries XP", "1,000 Craftwork XP", "1,000 coins", "Brickmaker's gloves"],
    journal: game => {
      const s = stage(game, TELL);
      if (s === 0) return ["Tel Ashun digs its bricks out of the mound it stands on. Lately the digging has stopped every few baskets for an argument."];
      if (s === 1) return ["The brick-diggers have cut down into the tell's old layers. The Legacy's recorder wants the digging stopped; the brickmaker wants bricks. Elder Hazane wants to know what the tell says before she decides.",
        mark(all(game, LAYERS), `Read the three layers in the cut on the tell's east side (${LAYERS.filter(key => data(game, key)).length}/3)`)];
      if (s === 2) return ["The tell is the elder's great-grandmothers' village, on a village that burned and was built again within a year, on a village built by people who counted like Azhurak.", "• Tell Elder Hazane"];
      return [data(game, "tl_choice") === 1 ? "The diggers take their bricks from the upper layers only; the black layer and everything under it are the recorder's to write down. QUEST COMPLETE!"
        : "Tel Ashun has stopped digging the tell. The bricks come from the clay at Ennu's Well now, a day's carry each way, and nobody's happy, and the tell is whole. QUEST COMPLETE!"];
    },
  },
  {
    id: WELL, name: "The Well's Share", points: 1, difficulty: "Novice", start: "Talk to Well-keeper Saliha at Ennu's Well.",
    requirements: ["A Foothold in the Stone", "Combat 25 recommended"],
    rewards: ["1 Quest Point", "1,500 Pursuance XP", "1,200 Presence XP", "1,000 coins", "A well-keeper's headcloth"],
    journal: game => {
      const s = stage(game, WELL);
      if (s === 0) return ["The pool at Ennu's Well is lower than the mark on the nearest palm, and the well-keeper keeps looking at the mark."];
      if (s === 1) return ["Ennu's Well is failing: the old channel from the hills brings in less water every week. Well-keeper Saliha wants to know why.",
        mark(!!data(game, "ws_channel"), "Look at the channel mouth, west of the pool"), mark(!!data(game, "ws_borer"), "Deal with whatever has bored into the channel")];
      if (s === 2) return ["The channel is clear and the water is coming back. Now somebody has to say how it's shared between the village, the gardens and the caravans.", "• Tell Well-keeper Saliha how to share it"];
      return [data(game, "ws_choice") === 1 ? "Ennu's Well shares its water by the old measure: village first, gardens second, caravans third. Caravan-master Ommet paid his share and said so. QUEST COMPLETE!"
        : "Ennu's Well shares its water in equal notches now, and the caravans paid for the channel's clearing. The gardeners are counting their palms. QUEST COMPLETE!"];
    },
  },
];

/** The ports' quest clues (see kharaveth.ts CLUES). */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const LAYER_TEXT = [
  "Mudbrick walls a hand high, a floor of beaten clay, and a broken jar with a Khetmar stamp on its shoulder: the village of the elder's great-grandmothers, from the years the Banner first walled Khetmar.",
  "A band of ash as thick as a hand, and in it charred roof beams and a scatter of arrowheads of an old Kharaveth shape. The village burned once, all at once. The floor above the ash was laid within a year: they came back.",
  "Under the ash, older bricks, larger, laid in a pattern you've seen in Tamesh's oldest walls, and a threshold stone cut with a glyph of the Azhurak count. The first people here counted like Azhurak's.",
] as const;
export const PORTS_QUEST_CLUES: Record<string, Clue> = {
  gullwick_lamp_log: {
    options: () => ["Read"], examine: () => "The keeper's lamp log: every night's oil, wick and weather.",
    use: game => {
      if (stage(game, LIGHTS) === 1 && !data(game, "lo_log")) { flag(game, "lo_log"); advanceLights(game); }
      return { text: "Thirty years of nights in Ossian's square hand. This month, three nights marked 'DARK: oil watered', and beside each, in the harbourmaster's hand, the boat due in: all three cargo boats, all three paid up at the Customs House before they sailed." };
    },
  },
  wreckers_lantern: {
    options: () => ["Look"], examine: () => "A ship's lantern on a pole at the end of Wrack Point, shuttered on the landward side.",
    use: game => {
      if (stage(game, LIGHTS) === 2) { flag(game, "lo_lantern"); game.player.quests[LIGHTS] = 3; say(game, "Wreckers. Deal with their chief on the point, or ask Nan Tregellas about the pattern on the sleeve."); }
      return { text: "Shuttered so only the sea can see it: from the water it would look like Gullwick Light, half a mile wrong, with the rocks between. The oil in it smells of the Light's own cask. It's tied to its pole with a gansey sleeve, ropes and ladders: the Tregellas pattern." };
    },
  },
  kings_scale: {
    options: () => ["Look"], examine: () => "The King's scale, bronze, under glass, with the Crown's weights in a case beside it.",
    use: game => {
      if (stage(game, SALT) === 1 && !data(game, "ks_scale")) { flag(game, "ks_scale"); advanceSalt(game); }
      return { text: "The King's weights, bright bronze, stamped with the new standard of last spring. Beside them in the case lies an old Saltreach pound, worn smooth: the new one is heavier by a tenth. The Ledger records the recasting. It doesn't record that anybody was told." };
    },
  },
  pan_weights: {
    options: () => ["Look"], examine: () => "The pan-reeve's weights: the panners' own, in stone.",
    use: game => {
      if (stage(game, SALT) === 1 && !data(game, "ks_pans")) { flag(game, "ks_pans"); advanceSalt(game); }
      return { text: "Stone weights, each cut with the Saltreach pound. Every one has been filed on its underside, carefully, by about a twentieth: weighed against these, a panner's sack would come in light at the Salt-House even on an honest scale." };
    },
  },
  pearl_ledger: {
    options: () => ["Read"], examine: () => "The Gilded Court's pearl ledger, open on the factor's desk.",
    use: game => {
      if (stage(game, PEARLS) === 1 && !data(game, "pd_ledger")) { flag(game, "pd_ledger"); advancePearls(game); }
      return { text: "Pearls in, by weight on Merrab's scale; pearls sold, by the Sefrah carat, which is lighter. Every pearl is counted small here and large there. Totted up by Sefrah's count, the divers' boats were paid for two years ago. The factor's own hand, in the margin: 'Do not total.'" };
    },
  },
  ...Object.fromEntries([0, 1, 2].map((k): [string, Clue] => [`tell_layer_${k}`, {
    options: () => ["Read"], examine: () => ["The tell's upper layer, in the face of the cut.", "A black band in the cut, a hand thick.", "The lowest layer the diggers have reached."][k],
    use: game => {
      if (stage(game, TELL) === 1 && !data(game, LAYERS[k])) {
        flag(game, LAYERS[k]); addXp(game, "mysteries", 300, { raw: true });
        if (all(game, LAYERS)) { game.player.quests[TELL] = 2; say(game, "The tell has told you three villages' worth. Take it to Elder Hazane."); }
      }
      return { text: LAYER_TEXT[k] };
    },
  }])),
  well_channel: {
    options: () => ["Look"], examine: () => "The mouth of the old channel that feeds the pool from the hills, under a stone lintel.",
    use: game => {
      if (stage(game, WELL) === 1 && !data(game, "ws_channel")) { flag(game, "ws_channel"); advanceWell(game); }
      return { text: data(game, "ws_borer") || questDone(game, WELL) ? "The channel runs clear under its lintel, a thread of water in it, getting wider." : "Sand packed into the channel, not blown but bored: a tunnel the width of a man's chest runs back into it, and something living has been at the end of it lately." };
    },
  },
};
function advanceLights(game: Game) {
  if (stage(game, LIGHTS) === 1 && all(game, ["lo_keeper", "lo_log"])) { game.player.quests[LIGHTS] = 2; say(game, "Somebody waters the oil and hangs a light on Wrack Point. Find it."); }
}
function advanceSalt(game: Game) {
  if (stage(game, SALT) === 1 && all(game, ["ks_assessor", "ks_scale", "ks_pans"])) { game.player.quests[SALT] = 2; say(game, "Both of them are cheating a little. Decide what the Assessor hears."); }
}
function advancePearls(game: Game) {
  if (stage(game, PEARLS) === 1 && all(game, ["pd_beast", "pd_factor", "pd_ledger"])) { game.player.quests[PEARLS] = 2; say(game, "The beds are clear and the ledger's read. Tell Head diver Yamina."); }
}
function advanceWell(game: Game) {
  if (stage(game, WELL) === 1 && all(game, ["ws_channel", "ws_borer"])) { game.player.quests[WELL] = 2; say(game, "The channel is clear. Now the shares: tell Well-keeper Saliha."); }
}

/** The quests' talk; null when someone has nothing to say about them (portspeople.ts has their everyday talk). */
export function talkPortsQuests(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, says = (...lines: string[]) => npcSays(name, ...lines);
  const notYet = () => chat(name, says("You've come a long way round to stand in my doorway. Hollowmere's still counting who goes south past its fence; come back when it's done counting you."));
  switch (npcId) {
    // ---------- Lights Out at Gullwick ----------
    case "gullwick_harbourmaster": {
      const s = stage(game, LIGHTS);
      if (s === 0) return chat(name, says("Three nights this month Gullwick Light has gone dark, and two cargo boats nearly went onto Wrack Point. Ossian swears he hasn't missed a night in thirty years.",
        "Either he's lying, or he's old, or somebody wants ships on the rocks. I'd like to know which before the Collector decides for me."), [
        { label: "I'll find out what's putting the Light out.", then: () => chat(name, says("Ossian's in the Light, on the point. He keeps a log of every night; read it. And don't let him give you the speech about the Gullwing."), undefined, () => { player.quests[LIGHTS] = 1; say(game, "Quest started: Lights Out at Gullwick."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s >= 1 && s <= 3) return chat(name, says(pick(game, ["Well? Is it Ossian? Tell me it isn't Ossian.", "Another boat's due Thursday. Paid up at the Customs House, the Collector says, as if the rocks check."])));
      if (s === 4) {
        const options: { label: string; then: () => Dialogue | null }[] = [];
        if (data(game, "lo_nan")) options.push({ label: "The wreckers are fishers the new dues ruined. Nan will call her son off.", then: () => chat(name, says("Kit Tregellas. I held him when he was christened. And the boats he went for were the ones that paid the dues.",
          "I'll take it to the Collector, and he'll shout, and I'll shout louder: the small boats' dues halved, or no harbour wall, because there'll be no harbour. Kit's lantern can hang in the Light, lit the right way round. Take this, from Ossian: his spare oilskin."), undefined, () => finishLights(game, 1)) });
        if (data(game, "lo_chief")) options.push({ label: "The wreckers' chief is dead, and the false light is out.", then: () => chat(name, says("Then the rocks are dark and the Light is lit, and that's my job done and yours. Whoever he was.",
          "The Collector will be pleased. Ossian sent this for you: his spare oilskin. He says it keeps the weather out. It doesn't keep the rest out."), undefined, () => finishLights(game, 2)) });
        return chat(name, says("You've been out on Wrack Point. I can smell it on you. Well?"), options);
      }
      return null;
    }
    case "gullwick_keeper": {
      if (stage(game, LIGHTS) === 1 && !data(game, "lo_keeper")) return chat(name, says("I didn't let her go out. I'd sooner go out myself. Somebody's been at the oil cask in the night: tapped it, drawn off the oil, filled it back up with seawater. She gutters and dies by midnight.",
        "And on those nights I've seen a light on Wrack Point, low down, where nobody's got any business with a light. It's all in the log."), undefined, () => { flag(game, "lo_keeper"); advanceLights(game); });
      return null;
    }
    case "gullwick_nan": {
      if (stage(game, LIGHTS) === 3 && !data(game, "lo_nan")) return chat(name, says("Ropes and ladders. It's ours. It's Kit's: I knitted that sleeve.",
        "The dues took his boat off the water, and the boats that paid the dues kept sailing past him. So he hangs a lantern, and the paid-up boats come onto the rocks, and he takes the cargo back. It isn't right. It isn't right either that they took his boat.",
        "I'll call him off. He'll come in if I ask. Tell the harbourmaster why, and not just what."), undefined, () => { flag(game, "lo_nan"); player.quests[LIGHTS] = 4; say(game, "Nan Tregellas will call her son off. Tell Harbourmaster Wenna Coyle."); });
      return null;
    }
    // ---------- The King's Salt ----------
    case "saltreach_brannagh": {
      const s = stage(game, SALT);
      if (s === 0) return chat(name, says("The Salt-House fines us every week: our sacks come in a tenth light, it says. We weigh every sack on our own weights before it goes, and they're right on our weights. So it's the King's scale that's heavy.",
        "The Assessor says the Ledger is never wrong. The Ledger is never wrong because he writes it. Will you weigh it up? You're not in it, yet."), [
        { label: "I'll weigh it up.", then: () => chat(name, says("Hear the Assessor, he'll insist. Look at the King's scale in the Salt-House, and at our weights in Dunstan's shed. And then tell me I'm wrong, if you can."), undefined, () => { player.quests[SALT] = 1; say(game, "Quest started: The King's Salt."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1) return chat(name, says("Well? It's the scale, isn't it? Fifty years, and it was the scale."));
      if (s === 2) return chat(name, says("Both? The King's pound heavier, and our weights filed? I filed them. Of course I filed them. Forty years of fines, and then a pound a tenth heavier and nobody told."), [
        { label: "Keep your weights. I won't tell the Salt-House.", then: () => chat(name, says("Then the King keeps his pound and we keep our file, and the Ledger's wrong exactly as much as it was. It's not justice. It's arithmetic. Take this: the old pound, in silver. Somebody should have it."), undefined, () => finishSalt(game, 3)) },
        { label: "I'll tell the Assessor. Both things.", then: () => null },
      ]);
      return null;
    }
    case "saltreach_assessor": {
      const s = stage(game, SALT);
      if (s === 1 && !data(game, "ks_assessor")) return chat(name, says("The panners' sacks come in a tenth light, every one, and I fine them for it, exactly as the Law asks. It's written.",
        "Look at the King's scale yourself. The King's own standard, recast in the capital last spring, true to the grain. The Ledger records it."), undefined, () => { flag(game, "ks_assessor"); advanceSalt(game); });
      if (s === 2) return chat(name, says("You've been in the weighing shed. Well? The panners' weights, I expect."), [
        { label: "Your new pound is a tenth heavy, and nobody was told. And the panners filed theirs to make up for it.", then: () => chat(name, says("(He reads the old pound's stamp. He reads it again.) Not told. It was recorded. Recording is telling, in Raria. It is supposed to be.",
          "I'll write to the King. He'll be kind about it, and Saltreach will weigh by the old pound, and the panners' weights go in the furnace. Both, in the Ledger. Take this: a ring of the old standard. It's true; it's the only thing in this building that is."), undefined, () => finishSalt(game, 1)) },
        { label: "The panners filed their weights. That's why the sacks are light.", then: () => chat(name, says("Filed. Of course. It's written now: fines for every panner who held a filed weight, and the weights broken. The King's pound stands.",
          "The Crown thanks you, in writing. And in silver: a ring of the old standard, which we don't use."), undefined, () => finishSalt(game, 2)) },
      ]);
      return null;
    }
    // ---------- The Pearl-Divers' Debt ----------
    case "merrab_yamina": {
      const s = stage(game, PEARLS);
      if (!questDone(game, FOOTHOLD)) return notYet();
      if (s === 0) return chat(name, says("The deep beds are where the pearls are. Something's hunting there: it took a diver's basket off his arm last month, and nearly the arm. Now we dive the shallows, and come up with grit.",
        "And at the new moon our debt to the factor doubles, for the boats he lent us. No deep beds, no pearls; no pearls, no paying. Will you go to the diving rocks?"), [
        { label: "I'll deal with whatever's hunting the beds.", then: () => chat(name, says("From the diving rocks south of the town. It comes up to the rocks when there's someone on them. And while you're asking about things that eat divers, ask the factor about the debt."), undefined, () => { player.quests[PEARLS] = 1; say(game, "Quest started: The Pearl-Divers' Debt."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1) return chat(name, says(pick(game, ["The rocks are south of the town, past the last hut. Mind the white eye.", "The new moon's in nine days. I'm not counting. Everyone else is."])));
      if (s === 2) return chat(name, says("Saltjaw's dead? We'll dive the deep beds at dawn. And the ledger says what? Paid for? Two years ago?"), [
        { label: "Take the ledger to the harbour-captain. The boats were paid for.", then: () => chat(name, says("The Banner and the Court have no love lost. Seddik will read it out on the quay, and enjoy it. And the Court will lend no more boats in Merrab, ever, and we'll build our own, slowly.",
          "Wear this. One pearl from the deep beds, on a diver's cord. We give it to someone who went into the water for us."), undefined, () => finishPearls(game, 1)) },
        { label: "Bargain with the factor: half the debt, Sefrah's carat, and the ledger stays shut.", then: () => chat(name, says("Half, and a fair weight from now on, and he keeps his secret and his boats keep coming. It's less than we're owed and more than we had.",
          "Wear this. One pearl from the deep beds, on a diver's cord. We give it to someone who went into the water for us."), undefined, () => finishPearls(game, 2)) },
      ]);
      return null;
    }
    case "merrab_factor": {
      if (stage(game, PEARLS) === 1 && !data(game, "pd_factor")) return chat(name, says("The divers owe the Court for their boats: four hundred pearls at the last count. The contract says the debt doubles at the new moon. I didn't write the contract; Sefrah did.",
        "I am not a cruel man. I am a careful one. My ledger is open to anyone who can read it, which in Merrab is nobody."), undefined, () => { flag(game, "pd_factor"); advancePearls(game); });
      return null;
    }
    // ---------- What the Tell Remembers ----------
    case "tel_ashun_elder": {
      const s = stage(game, TELL);
      if (!questDone(game, FOOTHOLD)) return notYet();
      if (s === 0) return chat(name, says("We dig our bricks from the tell; the river clay ran out in my mother's time. Now the diggers have cut down through the old floors, and the Legacy's recorder says stop, and Tahun says bricks don't grow.",
        "Before I decide, I'd like to know what the tell says. It's been saying it a long time and nobody's listened. Read the cut for me."), [
        { label: "I'll read the tell.", then: () => chat(name, says("The cut is on the east side, toward the rocks. Three layers, the diggers say: one we know, one black, and one nobody knows. Come back and tell me what they are."), undefined, () => { player.quests[TELL] = 1; say(game, "Quest started: What the Tell Remembers."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1) return chat(name, says("Three layers, on the east side. Read all of them. The tell doesn't like being half listened to."));
      if (s === 2) return chat(name, says("My great-grandmothers on top. Then a village that burned, and came back within a year. Then people who counted like Azhurak. All under my floor.",
        "So. What do we do with that, and still have bricks?"), [
        { label: "Dig the upper layers for bricks. Leave the black layer and below for the recorder.", then: () => chat(name, says("Our own grandmothers' houses for bricks, and the burned village and the old one left whole. They'd understand, I think. They built on each other too.",
          "Tahun sends you these. He says a pair of hands that can read a tell can wear his gloves."), undefined, () => finishTell(game, 1)) },
        { label: "Stop digging the tell. Carry clay from Ennu's Well instead.", then: () => chat(name, says("A day there, a day back, every load. Tahun will curse you, and me. And the tell stays whole, every village of it.",
          "He sends you these anyway. He says a pair of hands that can read a tell can wear his gloves, even if they've cost him his clay."), undefined, () => finishTell(game, 2)) },
      ]);
      return null;
    }
    // ---------- The Well's Share ----------
    case "ennu_keeper": {
      const s = stage(game, WELL);
      if (!questDone(game, FOOTHOLD)) return notYet();
      if (s === 0) return chat(name, says("See the mark on the palm? That's where the pool was at the turn of the year. See the water? That's where it is now. The spring isn't failing. The channel from the hills is.",
        "I can't leave the well, and the young ones won't go into the channel. Something's in it. Will you?"), [
        { label: "I'll see what's in the channel.", then: () => chat(name, says("The channel mouth is west of the pool, under the stone lintel. Mind your feet: there's a hole in the sand there now that wasn't, and holes have things at the bottom."), undefined, () => { player.quests[WELL] = 1; say(game, "Quest started: The Well's Share."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1) return chat(name, says(pick(game, ["The channel mouth is west of the pool. Whatever's in it, it's drinking our water or blocking it.", "Another notch less today. I cut it small."])));
      if (s === 2) return chat(name, says("It's coming back. Listen: you can hear it in the channel. Now the hard part. Ommet wants equal notches for his camels; Ferhat wants the old measure for his palms. Somebody has to say, and they'd both rather it wasn't me."), [
        { label: "The old measure: village first, gardens second, caravans third.", then: () => chat(name, says("The way Ennu set it. Ommet will pay and complain, and come back next year, because there's nowhere else.",
          "Wear this: a keeper's headcloth, with the water running through it. You kept the well this month."), undefined, () => finishWell(game, 1)) },
        { label: "Equal notches, and the caravans pay for clearing the channel.", then: () => chat(name, says("Equal. Ferhat will count his palms every morning, and Ommet will pay for the clearing and think he's bought something. Maybe he has.",
          "Wear this: a keeper's headcloth, with the water running through it. You kept the well this month."), undefined, () => finishWell(game, 2)) },
      ]);
      return null;
    }
    case "ennu_caravaneer": {
      if (stage(game, WELL) === 2) return chat(name, says("Equal shares. Twenty years we've paid for Ennu's water, and drunk third. A camel drinks what it drinks; it doesn't care what the old measure says."));
      return null;
    }
    case "ennu_gardener": {
      if (stage(game, WELL) === 2) return chat(name, says("The old measure. Ennu set it. The palms drink before the camels or there are no dates, and without dates there's no village for the caravans to drink at."));
      return null;
    }
  }
  return null;
}

function finishLights(game: Game, choice: 1 | 2) {
  game.player.questData.lo_choice = choice;
  giveOrDrop(game, "coins", 800); giveOrDrop(game, "keepers_oilskin");
  addXp(game, "fishing", 1500, { raw: true }); addXp(game, "presence", 800, { raw: true });
  completeQuest(game, LIGHTS);
}
function finishSalt(game: Game, choice: 1 | 2 | 3) {
  game.player.questData.ks_choice = choice;
  giveOrDrop(game, "coins", 1000); giveOrDrop(game, "true_weight_ring");
  addXp(game, "thieving", 1500, { raw: true }); addXp(game, "presence", 1000, { raw: true });
  completeQuest(game, SALT);
}
function finishPearls(game: Game, choice: 1 | 2) {
  game.player.questData.pd_choice = choice;
  giveOrDrop(game, "coins", 2500); giveOrDrop(game, "pearl_pendant");
  addXp(game, "slayer", 3000, { raw: true }); addXp(game, "presence", 2000, { raw: true });
  completeQuest(game, PEARLS);
}
function finishTell(game: Game, choice: 1 | 2) {
  game.player.questData.tl_choice = choice;
  giveOrDrop(game, "coins", 1000); giveOrDrop(game, "brickmakers_gloves");
  addXp(game, "mysteries", 2000, { raw: true }); addXp(game, "crafting", 1000, { raw: true });
  completeQuest(game, TELL);
}
function finishWell(game: Game, choice: 1 | 2) {
  game.player.questData.ws_choice = choice;
  giveOrDrop(game, "coins", 1000); giveOrDrop(game, "wellkeepers_headcloth");
  addXp(game, "slayer", 1500, { raw: true }); addXp(game, "presence", 1200, { raw: true });
  completeQuest(game, WELL);
}

export function onPortsKill(game: Game, monsterId: string) {
  if (monsterId === "wrecker_chief" && stage(game, LIGHTS) === 3 && !data(game, "lo_chief")) { flag(game, "lo_chief"); game.player.quests[LIGHTS] = 4; say(game, "Kit Tregellas is dead, and Wrack Point is dark. Tell Harbourmaster Wenna Coyle."); }
  if (monsterId === "saltjaw" && stage(game, PEARLS) === 1 && !data(game, "pd_beast")) { flag(game, "pd_beast"); say(game, "Old Saltjaw sinks off the rocks and doesn't come up. The deep beds are the divers' again."); advancePearls(game); }
  if (monsterId === "sand_borer" && stage(game, WELL) === 1 && !data(game, "ws_borer")) { flag(game, "ws_borer"); say(game, "The sand-borer is dead, and the channel can be cleared."); advanceWell(game); }
}
