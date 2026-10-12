/**
 * The settlements' people (the Skill overhaul's stage of settlements; settlementsworld.ts has the places): Gravesend's
 * sexton and stonemason, Fernwick's forester, Southshore's beachcomber and hermit, and their quests. The Disturbed Row
 * (Gravesend): three graves dug at and left open; find what the robbers dropped in them, and put the robbers down at
 * their camp; the sexton's reward is the stair into the Ashworth Vault, which he keeps chained. The Old Yew (Fernwick,
 * Woodcutting 30): five yew logs, and the stone at the Witness Yew's foot read. The Gullwing's Bell (Southshore,
 * Smithing 5): the bell out of the wreck, and ten pewter rivets to hang it again. Shells for Old Sal (Southshore): six
 * shells from the crates the tide leaves. Low and mid quests, each with a prerequisite, a state, and a reward that
 * isn't a weapon handed over: a place, a keepsake, a chart for a skill that doesn't exist yet.
 */
import { TREES, item } from "./data.ts";
import { addXp, count, give, giveOrDrop, has, level, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, data, fetchQuest, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import type { WorldObject } from "./world.ts";
import { HEARTHKIN } from "./sprites.ts";

const person = (id: string, name: string, examine: string, family: number, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family, seed }, ...extra });
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
export const DISTURBED_ROW = "disturbed_row", OLD_YEW = "old_yew", GULLWINGS_BELL = "gullwings_bell", SHELLS_FOR_SAL = "shells_for_sal";
/** The three disturbed graves (their keys when searched), and how many robbers the row wants put down. */
const GRAVES = 3, ROBBERS = 3;
const gravesSearched = (game: Game) => ["dg_1", "dg_2", "dg_3"].filter(key => data(game, key)).length;
void HEARTHKIN;

export const SETTLEMENT_NPCS: Record<string, NpcDef> = {
  sexton: person("sexton", "Sexton Dunstan Howe", "Digs the graves and keeps the keys to the mausoleums. Has a chain for every stair and a reason for every chain.", 9, 601),
  stonemason: person("stonemason", "Edda Marrow", "Cuts the names at Marrow's Stoneyard. Her family's mausoleum is the second one; she cut that too.", 6, 602),
  forester: person("forester", "Forester Tamsin Larch", "Knows every tree in Whisperwood by name, and which ones to leave alone.", 9, 603),
  beachcomber: person("beachcomber", "Nell Tidewater", "Walks the sand every morning for what the sea leaves. Keeps the good things and sells the rest.", 3, 604),
  hermit: person("hermit", "Old Sal", "Lives under the old light with a fire and a view. Hasn't been to a town in years and doesn't see why he'd start.", 0, 605),
};

export const SETTLEMENT_QUESTS: readonly QuestDef[] = [
  {
    id: DISTURBED_ROW, name: "The Disturbed Row", points: 1, difficulty: "Novice", start: "Talk to Sexton Dunstan Howe at his hut by Gravesend's mausoleums.",
    requirements: ["Combat 15 recommended"], rewards: ["1 Quest Point", "2,000 Faith XP", "500 coins", "The Ashworth Vault: the stair in the first mausoleum, unchained"],
    journal: game => {
      const s = stage(game, DISTURBED_ROW);
      if (s === 0) return ["East of Gravesend's graves stand three mausoleums, and a sexton who keeps their keys. Three graves in the east row have been dug at."];
      if (s === 1) return ["Dunstan wants the robbers' leavings out of the three disturbed graves (search them), and the robbers themselves put down at their camp east of the mausoleums.",
        mark(gravesSearched(game) >= GRAVES, `Disturbed graves searched: ${gravesSearched(game)}/${GRAVES}`), mark(data(game, "dr_robbers") >= ROBBERS, `Grave robbers put down: ${Math.min(ROBBERS, data(game, "dr_robbers"))}/${ROBBERS}`), mark(count(game.player, "grave_token") >= GRAVES, "Bring the grave tokens to Dunstan")];
      return ["The row is quiet and the tokens are back where they belong. Dunstan took the chain off the Ashworths' stair: the Vault is open to me. QUEST COMPLETE!"];
    },
  },
  {
    id: OLD_YEW, name: "The Old Yew", points: 1, difficulty: "Novice", start: "Talk to Forester Tamsin Larch at her house on Fernwick's east side.",
    requirements: ["Woodcutting 30"], rewards: ["1 Quest Point", "3,000 Woodcutting XP", "400 coins", "A forest feathered cap"],
    journal: game => {
      const s = stage(game, OLD_YEW);
      if (s === 0) return ["Fernwick's forester has a job for someone with Woodcutting 30: the south wood's yews, and the oldest of them."];
      if (s === 1) return ["Tamsin wants five yew logs from the south wood, and the stone at the Witness Yew's foot read, so somebody besides her knows what it says.",
        mark(has(game.player, "yew_logs", 5), `Yew logs: ${Math.min(5, count(game.player, "yew_logs"))}/5`), mark(!!data(game, "oy_stone"), "Read the stone at the Witness Yew's foot"), "• Bring the logs to Tamsin"];
      return ["The yews are cut and the stone is read: 'Cut the young, spare the old, and the wood will keep you.' Tamsin gave me the forester's cap. QUEST COMPLETE!"];
    },
  },
  {
    id: GULLWINGS_BELL, name: "The Gullwing's Bell", points: 1, difficulty: "Novice", start: "Talk to Nell Tidewater at her hut on Southshore's beach.",
    requirements: ["Smithing 5"], rewards: ["1 Quest Point", "1,200 Smithing XP", "600 coins", "Nell's tide chart"],
    journal: game => {
      const s = stage(game, GULLWINGS_BELL);
      if (s === 0) return ["The Gullwing, Saltmarrow's tithe boat, came ashore on Southshore's beach, broken. Nell Tidewater keeps the hut nearest the wreck."];
      if (s === 1) return ["Nell wants the Gullwing's bell out of the wreck (search it), and ten pewter rivets smithed to hang it from her hut, so the boat's remembered.",
        mark(has(game.player, "gullwing_bell"), "The Gullwing's bell, from the wreck"), mark(has(game.player, "pewter_rivets", 10), `Pewter rivets: ${Math.min(10, count(game.player, "pewter_rivets"))}/10`), "• Bring them to Nell"];
      return ["The Gullwing's bell hangs from Nell's hut now, and she rings it for the tide. She gave me her chart of the southern currents: for a boat that isn't built yet. QUEST COMPLETE!"];
    },
  },
  {
    id: SHELLS_FOR_SAL, name: "Shells for Old Sal", points: 1, difficulty: "Novice", start: "Talk to Old Sal under the old light on Southshore's headland.",
    requirements: [], rewards: ["1 Quest Point", "600 Crafting XP", "200 coins", "A shell necklace"],
    journal: game => {
      const s = stage(game, SHELLS_FOR_SAL);
      if (s === 0) return ["Under the old light on Southshore's headland sits Old Sal, who collects shells and can't walk the sand for them any more."];
      if (s === 1) return ["Sal wants six sea shells. The crates the tide leaves along the beach have them (search them; the tide fills them again in time).", mark(has(game.player, "sea_shell", 6), `Sea shells: ${Math.min(6, count(game.player, "sea_shell"))}/6`), "• Bring them to Sal"];
      return ["Sal strung the shells and gave me the necklace. He says the sea talks through them, if you hold them right. QUEST COMPLETE!"];
    },
  },
];

type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
/** How long a washed-up crate stays empty once searched (ticks): the tide fills it again. */
export const CRATE_TICKS = 3000;
export const SETTLEMENT_CLUES: Record<string, Clue> = {
  disturbed_grave: {
    options: () => ["Search"],
    examine: () => "A grave dug at and left open, the earth thrown anywhere. Whoever did it was in a hurry, or didn't care.",
    use: (game, object) => {
      if (stage(game, DISTURBED_ROW) !== 1) return { text: "You don't like to go through it. The sexton would know what's missing." };
      const key = `dg_${object.x}_${object.y}`, n = gravesSearched(game) + 1;
      if (data(game, key)) return { text: "You've been through this one. Nothing more in it but the dead." };
      game.player.questData[key] = 1; game.player.questData[`dg_${n}`] = 1; giveOrDrop(game, "grave_token", 1);
      if (gravesSearched(game) >= GRAVES) say(game, "That's all three graves. The tokens go back to Dunstan, and the robbers go down.");
      return { text: "Under the thrown earth, a grave token: the little stone disc Gravesend buries with its own, that the robbers dropped when they found it wasn't gold." };
    },
  },
  witness_stone: {
    options: () => ["Read"],
    examine: () => "A stone at the foot of the oldest yew in the south wood, cut a long time ago and kept clear of moss by somebody.",
    use: game => {
      if (stage(game, OLD_YEW) === 1 && !data(game, "oy_stone")) { flag(game, "oy_stone"); say(game, "The stone is read. Tamsin will want to hear it, and her logs."); }
      return { text: "'Cut the young, spare the old, and the wood will keep you.' Under it, smaller: a tally of years, and the same hand each time." };
    },
  },
  gullwing_wreck: {
    options: () => ["Search"],
    examine: () => "The Gullwing, or what the sea left of her: her bow on the sand, her name still on it, her hold open to the gulls.",
    use: game => {
      if (stage(game, GULLWINGS_BELL) !== 1) return { text: "Timbers, weed, and the smell of the tithe that went down with her. The bell's gone from the bow; somebody will want it." };
      if (data(game, "gb_bell")) return { text: "You've had the bell out of her. The rest is timbers and weed." };
      flag(game, "gb_bell"); giveOrDrop(game, "gullwing_bell", 1); say(game, "The Gullwing's bell, out of the sand under her bow. Nell wants it hung, and rivets to hang it with.");
      return { text: "Under the bow, half buried, the bell: brass, green, her name round the rim. It still rings." };
    },
  },
  washed_crate: {
    options: () => ["Search"],
    examine: () => "A crate the tide left, the kind the sea takes off every deck between here and the Isles. Something in it, or nothing.",
    use: (game, object) => {
      const key = `wc_${object.x}_${object.y}`, last = data(game, key);
      if (last && game.tick - last < CRATE_TICKS) return { text: "You've been through this one. The tide will fill it again." };
      game.player.questData[key] = Math.max(1, game.tick);
      const shells = 1 + (game.rng() < 0.5 ? 1 : 0); giveOrDrop(game, "sea_shell", shells);
      if (game.rng() < 0.15) { giveOrDrop(game, "rough_moonstone", 1); return { text: `${shells === 1 ? "A shell" : "Two shells"}, and under the weed a rough moonstone somebody lost over a side.` }; }
      return { text: shells === 1 ? "Weed, sand, and one good shell." : "Weed, sand, and two good shells." };
    },
  },
};

export function talkSettlements(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  switch (npcId) {
    case "sexton":
      if (questDone(game, DISTURBED_ROW)) return says(pick(game, ["The Ashworths' stair is open to you. Mind them; they don't all stay put.", "Quiet row, quiet town. Thank you for that.", "The Marrows' stair stays chained. Edda's family, Edda's say."]));
      return fetchQuest(game, name, DISTURBED_ROW, {
        offer: ["Three graves in the east row, dug at in the night and left open. Grave robbers, camped east of the mausoleums, looking for gold the dead don't have.", "Go through the three graves for what they dropped (our grave tokens: stone, not gold, which is why they dropped them), and put the three of them down. Then we'll talk about the Ashworths' stair."],
        accept: "The graves are the open ones at the row's east end. The camp's past the mausoleums. Go careful; they're desperate, which is worse than brave.", progress: "The three graves, the three robbers, and the tokens back to me.",
        have: () => gravesSearched(game) >= GRAVES && data(game, "dr_robbers") >= ROBBERS && has(player, "grave_token", GRAVES), take: () => { take(player, "grave_token", GRAVES); },
        done: ["Three tokens, three robbers, and the row quiet. That's Gravesend's debt to you.", "The Ashworths' stair: the chain's off. What's under there is theirs, and they're not all quiet, but there's a hoard at the end that nobody's claimed in a hundred years. Go armed."],
        reward: () => { addXp(game, "prayer", 2000, { raw: true }); give(player, "coins", 500); },
      });
    case "stonemason": return says(pick(game, ["A name costs the same cut deep as cut shallow. I cut deep. The weather can have the shallow ones.", "The Marrow mausoleum's mine: my family's, and my chisel. The Unnamed one was here before any of us, and nobody's opened it, and nobody will.", "The Ashworths buried their own under the hall floor, once. Then the hall went, and they came here. Ask the sexton. Ask him twice."]));
    case "forester": {
      if (level(game, "woodcutting") < 30 && stage(game, OLD_YEW) === 0) return says("The south wood's yews want a Woodcutting of 30, and so does the job I've got. Come back when the oaks are easy.");
      if (questDone(game, OLD_YEW)) return says(pick(game, ["Cut the young, spare the old. The wood keeps the ones who keep it.", "I take orders for the woods' own logs, if you've a mind to sell."]));
      return fetchQuest(game, name, OLD_YEW, {
        offer: ["The south wood's yews are the oldest trees in Whisperwood, and one of them is older than the rest: the Witness Yew. There's a stone at its foot that I've read, and nobody else living has.", "Cut me five yew logs from the south wood (not the Witness; never the Witness), and read the stone, so there's two of us who know what it says."],
        accept: "The yews are south of the village, past the pond and the grumblins' reach. The Witness is the big one. Mind the stone; it's older than the tree.", progress: "Five yew logs, and the stone read.",
        have: () => has(player, "yew_logs", 5) && !!data(game, "oy_stone"), take: () => { take(player, "yew_logs", 5); },
        done: ["'Cut the young, spare the old, and the wood will keep you.' Good. Now there's two of us.", "The cap's a forester's. Wear it in the wood and the wood will know you."],
        reward: () => { addXp(game, "woodcutting", 3000, { raw: true }); give(player, "coins", 400); giveOrDrop(game, "forest_feathered_cap", 1); },
      });
    }
    case "beachcomber": {
      if (level(game, "smithing") < 5 && stage(game, GULLWINGS_BELL) === 0) return says("I've a job wants rivets, and rivets want a smith of 5 or so. The sand's yours meanwhile; so are the crates.");
      if (questDone(game, GULLWINGS_BELL)) return says(pick(game, ["The bell rings for the tide now. The Gullwing's remembered.", "The chart's the southern currents, as far as I've rowed them. One day there'll be a boat that needs it.", "The sea leaves a crate most mornings. Search them; what's in them is yours."]));
      return fetchQuest(game, name, GULLWINGS_BELL, {
        offer: ["The Gullwing. Saltmarrow's tithe boat; she went down with the season's tithe and came ashore here, in pieces, a month after. Her bell's still in the bow, under the sand.", "Get the bell out of her, and smith me ten pewter rivets to hang it from the hut, and I'll ring it for the tide, so she's remembered. Pewter's enough; it's the ringing that matters."],
        accept: "The wreck's on the sand west of here. Her crew didn't all leave her. The rivets: pewter bars at any anvil, ten to a bar.", progress: "The bell out of the wreck, and ten pewter rivets.",
        have: () => has(player, "gullwing_bell") && has(player, "pewter_rivets", 10), take: () => { take(player, "gullwing_bell", 1); take(player, "pewter_rivets", 10); },
        done: ["There. Hung, and rung. Hear it? That's the Gullwing, and she's home.", "Take this: my chart of the currents south of here, as far as I've rowed them. There's no boat for it yet. There will be."],
        reward: () => { addXp(game, "smithing", 1200, { raw: true }); give(player, "coins", 600); giveOrDrop(game, "nells_tide_chart", 1); },
      });
    }
    case "hermit":
      if (questDone(game, SHELLS_FOR_SAL)) return says(pick(game, ["Hold a shell to your ear. That's not the sea you hear. It's the sea remembering.", "The old light will burn again. Not for a boat. For something bigger coming the other way.", "Forty years I've sat here. The sea's said one thing in all that time, and I'm still working out what."]));
      return fetchQuest(game, name, SHELLS_FOR_SAL, {
        offer: ["I used to walk the sand every morning for shells. Knees won't do it now. The crates the tide leaves have the good ones, if you'll go through them.", "Six good shells, and I'll string you something the sea talks through."],
        accept: "The crates are along the sand, east and west. The tide fills them again, in its own time.", progress: "Six shells. The crates have them.",
        have: () => has(player, "sea_shell", 6), take: () => { take(player, "sea_shell", 6); },
        done: ["Six. Good ones, too. Hold still.", "There. Wear it, and hold a shell to your ear when the beach is empty. That's not the sea you'll hear."],
        reward: () => { addXp(game, "crafting", 600, { raw: true }); give(player, "coins", 200); giveOrDrop(game, "shell_necklace", 1); },
      });
  }
  return null;
}
/** The grave robbers put down at their camp east of Gravesend's mausoleums count for the sexton (bandits anywhere else don't). */
export function onSettlementsKill(game: Game, monsterId: string, x: number, y: number) {
  if (monsterId !== "bandit" || stage(game, DISTURBED_ROW) !== 1 || x < 776 || x > 794 || y < 110 || y > 128) return;
  const n = data(game, "dr_robbers") + 1; game.player.questData.dr_robbers = n;
  if (n === ROBBERS) say(game, "That's the three of them. Dunstan will want his tokens, and the row's quiet.");
}
/** Which logs the forester orders: every tree's. */
export const FORESTER_LOGS = () => Object.values(TREES).map(tree => ({ id: tree.log, level: tree.level }));
void item;
