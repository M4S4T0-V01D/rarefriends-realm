/**
 * The Old Agreement: A Place to the North's main questline (north.ts has its people, northworld.ts its places).
 *
 * A Krasnogor caravan bound for Skarnholm never came through the Oathgate. The wreck is below the hills west of the pass,
 * and the raiders' strongbox up in them holds payment from both sides of the ridge. The leaders, the stone, the skalds and
 * the archive all tell the agreement differently; the first copy, left with the Circle at the Old Bough, says what was
 * sworn: each people to keep both passes and both roads. Both sides altered it when keeping it got expensive.
 *
 * The player decides at the Agreement Stone, and the north changes with it, for that player:
 * 1. Restore it as sworn: the Oathgate bar opens, both traders carry the other people's goods, the leaders swear again.
 * 2. A new agreement sworn by the people who do the work (the Thing, the Compact, the Hearthwardens): the gate opens and the
 *    trade with it; Prince Radomir won't speak to you again.
 * 3. Burn it: the gate stays barred for good (the Wolfsback's goat-track is the only way over), and the Redwake's stores open.
 */
import { addXp, give, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import type { WorldObject } from "./world.ts";
import { chat, completeQuest, data, npcSays, stage, type QuestDef } from "./content.ts";
import { OATH_ROAD } from "./northworld.ts";

export const OLD_AGREEMENT = "old_agreement";
/** The raiders in the hills the caravan's waiting on. */
export const OA_RAIDERS = 5;
/** What the player chose at the stone (questData.oa_choice). */
export const OA_RESTORE = 1, OA_NEW = 2, OA_BURN = 3;
/** The accounts of the agreement to gather before the first copy turns up: [flag, journal line]. */
export const OA_RECORDS = [
  ["oa_hallveig", "Ask Jarl Hallveig about the strongbox"],
  ["oa_radomir", "Ask Prince Radomir about the strongbox"],
  ["oa_west", "Read the Agreement Stone's west face"],
  ["oa_east", "Read the Agreement Stone's east face"],
  ["oa_verse", "Hear the agreement's verse from a skald at Embermoot"],
  ["oa_copies", "See the Dawn Archive's copies at Svetloye"],
] as const;

const step = (game: Game) => data(game, "oa_step");
const choice = (game: Game) => data(game, "oa_choice");
/** Whether the Oathgate road is open to this player (restored, or sworn anew). */
export const passOpen = (game: Game) => choice(game) === OA_RESTORE || choice(game) === OA_NEW;
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const flag = (game: Game, key: string) => { game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const inQuest = (game: Game, s: number) => stage(game, OLD_AGREEMENT) === 1 && step(game) === s;

export const NORTH_QUESTS: readonly QuestDef[] = [
  {
    id: OLD_AGREEMENT, name: "The Old Agreement", points: 3, difficulty: "Experienced",
    start: "Talk to Guildmaster Torvald of the Farwake in Skarnholm, or Hearthwarden-Captain Milena at Hearthwatch.",
    requirements: ["The roads north, from the Vesperwold or the Deadwood", "Combat 30 recommended"],
    rewards: ["3 Quest Points", "6,000 Mysteries XP", "2,500 Attack XP", "5,000 coins", "The title Oathwitness", "The north remembers what you chose: the Oathgate, its traders and its leaders"],
    journal: game => {
      const s = stage(game, OLD_AGREEMENT), at = step(game);
      if (s === 0) return ["A caravan of Zoryavik iron, bound from Krasnogor to Skarnholm, never came through the Oathgate. Guildmaster Torvald in Skarnholm and Captain Milena at Hearthwatch would both like to know why."];
      if (s === 1 && at === 1) return ["A Krasnogor caravan bound for Skarnholm vanished on the Oathgate road. The wreck should be below the hills west of the pass, and whoever did it up in them.",
        mark(!!data(game, "oa_wreck"), "Search the wrecked caravan by the road"), mark(data(game, "oa_raiders") >= OA_RAIDERS, `Raiders put down in the hills: ${Math.min(OA_RAIDERS, data(game, "oa_raiders"))}/${OA_RAIDERS}`),
        mark(!!data(game, "oa_box"), "Open the raiders' strongbox"), "• Tell Torvald or Milena what you found"];
      if (s === 1 && at === 2) return ["Zoryavik silver and a Vargskeld arm-ring in one strongbox: someone on each side of the ridge pays the raiders to keep the road dangerous. Everyone quotes the agreement. Time to find out what it says.",
        ...OA_RECORDS.map(([key, text]) => mark(!!data(game, key), text))];
      if (s === 1 && at === 3) return ["Every account of the agreement disagrees, and the archive's first copy is missing. Both peoples once swore under the oak at the Old Bough; the Circle there keeps older things than the archive does.", "• Ask Old Dobromir at the Old Bough about the first copy"];
      if (s === 1 && at === 4) return ["The first copy: each people to keep both passes and both roads, and to stand by the other. The Zoryavik's copies were recut to leave them only the eastern road; the Vargskeld's verse was changed to put the passes on the Zoryavik. Both sides altered it when keeping it got expensive.",
        mark(has(game.player, "first_copy"), "The first copy of the agreement"), "• Take it to the Agreement Stone at the Oathgate, and decide what it's worth"];
      const c = choice(game);
      if (c === OA_NEW) return ["I took the first copy to the people who do the work. Lawspeaker Signy, Speaker Zdenka and Captain Milena swore a new agreement over it and left the princes out. The Oathgate bar stands open; Prince Radomir won't speak to me. QUEST COMPLETE!"];
      if (c === OA_BURN) return ["I burned the first copy at the Agreement Stone: let each people keep its own side of the ridge. The Oathgate bar stays barred for good, the Wolfsback is the only way over, and the Redwake are hiring. QUEST COMPLETE!"];
      return ["I read the first copy aloud at the Agreement Stone, and Hallveig and Radomir swore it again as it was first sworn, the cut lines and all. The Oathgate bar stands open. QUEST COMPLETE!"];
    },
  },
];

/** The quest's people. Returns null when the quest has nothing to say, and the north's own talk (north.ts) runs. */
export function talkNorthQuest(game: Game, npcId: string, name: string, usual: () => Dialogue | null): Dialogue | null {
  const s = stage(game, OLD_AGREEMENT), at = step(game), c = choice(game);
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const more = (lines: string[], options: Dialogue["options"] = []) => chat(name, npcSays(name, ...lines), [...(options ?? []), { label: "Something else.", then: () => usual() }]);
  const ask = (lines: string[], label: string, reply: string[], key: string) => more(lines, [{ label, then: () => { flag(game, key); checkRecords(game); return says(...reply); } }]);
  switch (npcId) {
    case "farwake_master":
    case "hearthwarden_captain": {
      const torvald = npcId === "farwake_master";
      if (s === 0) return chat(name, npcSays(name, torvald
        ? "A caravan of Zoryavik iron, bound here from Krasnogor, never came through the Oathgate. The Hearthwardens say it left. Nobody says it arrived. The Farwake insured it, so the Farwake would like to know."
        : "A Krasnogor caravan for Skarnholm went through my gate a week ago and never reached the other side of the hills. Vargskeld raiders, they say in Krasnogor. They say something else in Skarnholm. I'd like someone who's neither to look."), [
        { label: "I'll look into it.", then: () => chat(name, npcSays(name, "The wreck should be on the road below the hills west of the Oathgate, if there's a wreck. Mind the raiders up there; they don't wear colours."), undefined, () => {
          game.player.quests[OLD_AGREEMENT] = 1; game.player.questData.oa_step = 1; message(game, "Quest started: The Old Agreement.", "quest"); sound(game, "quest");
        }) },
        { label: "Not today.", then: () => null },
        { label: "Something else.", then: () => usual() },
      ]);
      if (s === 1 && at === 1) {
        if (!data(game, "oa_wreck") || data(game, "oa_raiders") < OA_RAIDERS || !data(game, "oa_box")) return more(["The road below the hills, west of the Oathgate. Find the caravan, and whoever's up in the hills."]);
        return chat(name, npcSays(name, "Zoryavik silver and a Vargskeld arm-ring, in the same box. So someone on each side pays them. That isn't a raid. That's a toll, collected off the road for whoever profits from it being shut.",
          "This is bigger than an insurance claim. Ask the jarl and the prince what they make of it, and read the stone. Everyone quotes the agreement; nobody seems to have read it lately."), undefined, () => {
          game.player.questData.oa_step = 2; say(game, "Whoever pays the raiders, it's someone on both sides. Time to find out what the agreement actually says.");
        });
      }
      if (s === 1) return more([at === 2 ? "The jarl, the prince, the stone, the skalds and the archive. Somebody's account will be the true one. Probably not all of them." : "The first copy? If anyone has it, it's someone who belongs to neither side."]);
      if (s >= 2) return more([torvald
        ? (passOpen(game) ? "Zoryavik iron on my quay again. The Farwake paid the claim and made money on the year anyway." : "No iron, no claim paid. The Farwake will find the money somewhere. The sea's still open.")
        : c === OA_RESTORE ? "The gate's open, and it stays open. That's all we ever wanted to be able to say."
          : c === OA_NEW ? "Sworn by the people who use the road. The Hearthwardens will keep it for them, and I'll sleep better."
            : "Barred, by your word. We'll keep it barred. I hope you're right."]);
      return null;
    }
    case "jarl_hallveig":
      if (s === 1 && at === 2 && !data(game, "oa_hallveig")) return ask(["Welcome back to Skarnholm. You look like someone with a question you'd rather not ask."], "About the raiders' strongbox…",
        ["An arm-ring of the Thing's own pattern. Given to a hundred people for a hundred years of service; any of them could have sold it. Not one of them was told to by me.", "If you want the agreement, read what's left of the stone. Our side's runes are worn; theirs were recut. Ask yourself why anyone recuts a promise."], "oa_hallveig");
      if (s >= 2) return more([c === OA_RESTORE ? "My grandmother's runes, cut out by my grandmother's jarl. I swore the whole thing again, every line of it. It cost me less than I feared."
        : c === OA_NEW ? "The Thing swore it without me. It was the Thing's to swear. I'm still deciding whether that's an insult."
          : "Burned. Well. Now nobody can say which of us broke it. Perhaps that was the kindest thing."]);
      return null;
    case "prince_radomir":
      if (s === 1 && at === 2 && !data(game, "oa_radomir")) return ask(["You've been on the Oathgate road. Sit, then, and tell me what you think you found."], "About the raiders' strongbox…",
        ["Zoryavik silver, from the princes' mint. Every merchant in Krasnogor has a purse of it. So does my sister.", "Ask the Archive at Svetloye for the copies, if you want the truth. They'll show you three, and you'll see why I trust none of them."], "oa_radomir");
      if (s >= 2 && c === OA_NEW) return says("You went to shopkeepers and ditch-wardens and let them swear for the land. We have nothing to say to each other.");
      if (s >= 2) return more([c === OA_RESTORE ? "My grandfather recut a promise to save the price of a garrison. I've paid for the garrison. Don't speak of it again."
        : "Ash. Then the Zoryavik keep what's theirs, and the Vargskeld can learn to buy iron from someone else."]);
      return null;
    case "princess_vesna":
      if (s >= 2) return more([c === OA_RESTORE ? "Radomir swore at the stone, and my forts on the upper Krasna are garrisoned at last, and paid for by both peoples. I'll take it."
        : c === OA_NEW ? "The land swore for itself. Radomir hasn't come out of the Terem since."
          : "So the pass stays shut, and my forts hold it alone. I'll hold it."]);
      return null;
    case "freeholds_speaker":
      if (s >= 2) return more([c === OA_RESTORE ? "The old one, restored. Fine. The Compact's carts will be first through the gate either way."
        : c === OA_NEW ? "A Compact of the passes. The princes are furious. Bereslav is drinking to you."
          : "You burned it? Then the river's still the only road we have. The barges will be busy."]);
      return null;
    case "redwake_captain":
      if (s >= 2 && c === OA_BURN) return more(["You shut the pass. Good for business; I won't pretend otherwise. The company's stores are open to you."], [{ label: "Show me the company's stores.", then: () => { game.ui.shop = "redwake_stores"; return null; } }]);
      if (s >= 2) return more(["Peace on the road. Bad for business. Good for everyone else, I'm told."]);
      return null;
    case "ember_skald":
      if (s === 1 && at === 2 && !data(game, "oa_verse")) return ask(["Ask me for a name and I'll tell you the life that goes with it. Ask me for the truth and I'll tell you which version."], "Tell me the verse of the agreement.",
        ["\"The sworn of the Varn keep the road in the snow; the Zoryavik keep the passes, the high and the low.\" That's how my teacher sang it.", "Her teacher sang the second line differently. I've never sung it that way. I don't know why I remember that."], "oa_verse");
      return null;
    case "archivist_bozhena":
      if (s === 1 && at === 2 && !data(game, "oa_copies")) return ask(["The Dawn Archive keeps every chronicle of the Zoryavik, and every chronicle that disagrees with it. History isn't one book. It's an argument, carefully indexed."], "Show me the copies of the agreement.",
        ["Here. All three in the princes' hand. This one: \"the Zoryavik to keep the eastern road.\" This one: \"the eastern pass.\" This one: \"the road to Hearthwatch.\" None of them says what the Vargskeld keep. Interesting, for an agreement between two peoples.",
          "My copyist swears there was a first copy, older than these. It isn't on any shelf. The Circle at the Old Bough keeps older things than we do."], "oa_copies");
      return null;
    case "old_bough_keeper":
      if (s === 1 && at >= 3 && !has(game.player, "first_copy")) return chat(name, npcSays(name, at === 3
        ? "Here. In the post, behind the carved face, where the swearers left it. Both peoples swore under this oak, and gave the Circle the first copy to keep, because the Circle belongs to neither. Ninety years, and you're the first to ask."
        : "You had it. If you've lost it, the post holds a second, written the same night. We're careful.", "Read it. Then decide what it's for. That isn't ours to do."), undefined, () => {
        give(game.player, "first_copy", 1); game.player.questData.oa_step = 4;
        say(game, "The first copy of the agreement. Take it to the Agreement Stone at the Oathgate.");
      });
      if (s >= 2) return more(["Whatever you did with it, you read it first. That's more than the princes did."]);
      return null;
    case "skarnholm_trader":
      return chat(name, npcSays(name, passOpen(game) ? "Zoryavik iron on the quay again, at a price you'll like for once." : "Dried cod, salt, rope and sealskin. Zoryavik iron, when there is any, at a price you won't like."), [
        { label: "Let's trade.", then: () => { game.ui.shop = passOpen(game) ? "skarnholm_quay_open" : "skarnholm_quay"; return null; } }, { label: "Goodbye.", then: () => null }]);
    case "krasnogor_trader":
      return chat(name, npcSays(name, passOpen(game) ? "Vargskeld fish over the pass again, and the salt price fell by half. Have a look." : "Furs, honey, wax and amber. Vargskeld salt, when the pass is open, which it isn't, which is why the salt costs what it does."), [
        { label: "Let's trade.", then: () => { game.ui.shop = passOpen(game) ? "krasnogor_market_open" : "krasnogor_market"; return null; } }, { label: "Goodbye.", then: () => null }]);
  }
  return null;
}

/** Once every account's gathered, the hunt for the first copy begins. */
function checkRecords(game: Game) {
  if (!inQuest(game, 2) || !OA_RECORDS.every(([key]) => data(game, key))) return;
  game.player.questData.oa_step = 3;
  say(game, "Six accounts of the agreement, and no two agree. The archive's first copy is missing; the Circle at the Old Bough keeps older things.");
}

/** The decision at the stone: what the first copy is worth. */
function decide(game: Game): Dialogue {
  const name = "The Agreement Stone";
  const end = (c: number, text: string) => chat(name, npcSays(name, text), undefined, () => {
    const p = game.player;
    take(p, "first_copy", 1); p.questData.oa_choice = c;
    addXp(game, "mysteries", 6000, { raw: true }); addXp(game, "attack", 2500, { raw: true }); give(p, "coins", 5000);
    completeQuest(game, OLD_AGREEMENT);
  });
  return chat(name, npcSays(name, "You hold the first copy up beside the stone. Word for word, the old agreement: both peoples to keep both passes and both roads, and each to stand by the other.",
    "Word gets round fast in a pass. Hallveig's housecarls and Radomir's druzhina are on the road by morning, and the Hearthwardens, and the Compact's speaker. They're waiting to hear what you'll do with it."), [
    { label: "Restore it, as it was sworn.", then: () => end(OA_RESTORE, "Hallveig reads the runes aloud, and Radomir the letters, and both of them the lines their grandparents cut out. Neither enjoys it. Both swear. The Hearthwardens unbar the gate.") },
    { label: "Let the people who do the work swear a new one.", then: () => end(OA_NEW, "Lawspeaker Signy says the law aloud, Speaker Zdenka signs for the Compact, Captain Milena for the Hearthwardens. The princes are not asked. Radomir leaves before the end. The gate opens for the traders.") },
    { label: "Burn it. Each people keeps its own side.", then: () => end(OA_BURN, "The first copy burns quickly. Nobody stops you. By evening the Hearthwardens have the gate barred for good, and Captain Ulfa is hiring.") },
    { label: "Not yet.", then: () => null },
  ]);
}

type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
export const NORTH_CLUES: Record<string, Clue> = {
  oa_wreck: {
    options: () => ["Search", "Examine"], examine: () => "A caravan wagon on its side by the road, its wheels cut through. Whoever did it took everything but the wagon.",
    use: game => {
      if (!inQuest(game, 1)) return { text: "A wrecked caravan wagon, wheels cut through. Nothing left in it worth taking." };
      if (data(game, "oa_wreck")) return { text: "You've been through the wagon. The waybill said what it needed to." };
      flag(game, "oa_wreck"); addXp(game, "mysteries", 300, { raw: true });
      return { text: "The wheels were cut through, not broken, and the iron's gone. Under the seat: the waybill. Krasnogor to Skarnholm, insured by the Farwake, and a note on the back in a hand that isn't the carter's: \"Leave this one.\"" };
    },
  },
  oa_strongbox: {
    options: () => ["Open", "Examine"], examine: () => "An iron-bound strongbox, newer than the camp around it.",
    use: game => {
      if (!inQuest(game, 1)) return { text: data(game, "oa_box") ? "Empty. You know what was in it." : "A locked strongbox. Not yours, and not your business yet." };
      if (data(game, "oa_box")) return { text: "Empty now. You know what was in it." };
      const left = OA_RAIDERS - data(game, "oa_raiders");
      if (left > 0) return { text: `Raiders are still about; you'd be opening it with your back to them. Put them down first (${OA_RAIDERS - left}/${OA_RAIDERS}).` };
      flag(game, "oa_box"); addXp(game, "thieving", 400, { raw: true });
      say(game, "Payment, from both sides of the ridge. Torvald or Milena should hear about this.");
      return { text: "The lock is cheap; what's in the box isn't. A purse of new Zoryavik silver, and a Vargskeld arm-ring of the Thing's own pattern." };
    },
  },
  oa_west: {
    options: () => ["Read", "Examine"], examine: () => "The Agreement Stone's west face: Vargskeld runes, worn nearly smooth.",
    use: game => {
      if (inQuest(game, 2) && !data(game, "oa_west")) { flag(game, "oa_west"); checkRecords(game); }
      return { text: "The runes are worn nearly smooth, but where the oath lists who keeps what, one line has been chiselled out on purpose: the cuts are sharper than the weather's." };
    },
  },
  oa_east: {
    options: () => ["Read", "Examine"], examine: () => "The Agreement Stone's east face: Zoryavik letters, recut by a newer hand.",
    use: game => {
      if (inQuest(game, 2) && !data(game, "oa_east")) { flag(game, "oa_east"); checkRecords(game); }
      return { text: "The letters were recut by a newer hand. Under the new words, \"the eastern road\", the shadow of older, longer ones shows when the light's low: \"both roads, both passes\"." };
    },
  },
  oa_stone: {
    options: game => inQuest(game, 4) && has(game.player, "first_copy") ? ["Read-aloud", "Examine"] : ["Examine"],
    examine: game => choice(game) === OA_BURN ? "The Agreement Stone, with a smear of ash at its foot." : choice(game) ? "The Agreement Stone. Someone's chalked the cut lines back in, on both faces." : "The Agreement Stone, where the old agreement was sworn. Both faces have been worked on since.",
    use: game => {
      if (!inQuest(game, 4) || !has(game.player, "first_copy")) return { text: "The Agreement Stone, where the old agreement was sworn." };
      game.dialogue = decide(game); sound(game, "click"); return null;
    },
  },
  oa_gate: {
    options: () => ["Open", "Examine"], examine: () => "A timber gate across the Oathgate road, set in a wall the Hearthwardens built from the pass's own stone. Barred with a beam as thick as a man.",
    use: (game, object) => {
      if (passOpen(game)) return { to: { x: object.x + (game.player.x < object.x ? 1 : -1), y: object.y }, text: "The Hearthwardens wave you through the gate." };
      if (choice(game) === OA_BURN) return { text: "The gate's barred for good, by your own word. The Wolfsback's open, if you can climb." };
      return { text: "Barred. \"Nobody through until the agreement's settled,\" calls a Hearthwarden from the wall. \"The Wolfsback's north of here, if you can climb.\"" };
    },
  },
};

/** The raiders in the hills above the Oathgate road, while the caravan's being looked into. */
export function onNorthKill(game: Game, monsterId: string, x: number, y: number) {
  if (monsterId !== "bandit" || !inQuest(game, 1)) return;
  const H = OATH_ROAD.hills;
  if (x < H.x0 || x > H.x1 || y < H.y0 || y > H.y1 || data(game, "oa_raiders") >= OA_RAIDERS) return;
  const n = game.player.questData.oa_raiders = data(game, "oa_raiders") + 1;
  say(game, n >= OA_RAIDERS ? "That's the last of the raiders in these hills, for now. Their strongbox is up at the camp." : `A raider down (${n}/${OA_RAIDERS}).`);
}
