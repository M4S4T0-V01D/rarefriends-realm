/**
 * The Realm's bars: one in every town and city (not the villages), each its own. Every bar has a barkeep who sells
 * food, drink (the house's own, and ale) and potions for people on the road; a quiet trader at a corner table who deals
 * in the things a Stealth adventurer wants; a job board of bounties (creatures from round about to put down, goods the
 * town needs brought); and a quest of its own, from the barkeep.
 *
 * The bars themselves are fitted out in the world by barfit.ts; this module is the people, the board and the quests.
 * A job is kept in the player's quest data (job_*), so it's saved with everything else.
 */
import { addXp, count, give, giveOrDrop, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, fetchQuest, npcSays, playerSays, stage, type NpcDef, type QuestDef } from "./content.ts";
import { MONSTERS, item } from "./data.ts";
import { FACTION_MONSTERS } from "./factions.ts";

const art = (family: number, seed: number) => ({ family, seed });

export type BarDef = {
  id: string; name: string; town: string;
  /** Who keeps it (their shop is `shop`), and who sits at the corner table. */
  keeper: string; fence: string; shop: string;
  /** The house's own drink. */
  drink: string;
  /** What the board asks for: creatures from round about, and goods the town wants (with how many). */
  kills: readonly string[]; fetch: readonly (readonly [string, number])[];
  quest: string;
};
export const BARS: readonly BarDef[] = [
  { id: "sleepy", name: "The Sleepy Friend", town: "Friendhollow", keeper: "innkeeper", fence: "fence_sleepy", shop: "inn", drink: "sleepy_stout",
    kills: ["grumblin", "bandit", "wolf", "boar", "thornback", "forest_spider"], fetch: [["cowhide", 5], ["raw_perch", 8], ["oak_logs", 10], ["egg", 6], ["feather", 40]], quest: "bar_sleepy" },
  { id: "prayer", name: "The Seventh Prayer", town: "Raria", keeper: "raria_innkeeper", fence: "fence_prayer", shop: "raria_inn", drink: "lawful_beer",
    kills: ["crown_hound", "greyfield_revenant", "dusk_wraith", "deserter", "wolf"], fetch: [["redwood_logs", 6], ["raw_char", 8], ["pine_logs", 10], ["bones", 10]], quest: "bar_prayer" },
  { id: "vat", name: "The Crooked Vat", town: "Dyemoor", keeper: "vat_keeper", fence: "fence_vat", shop: "bar_vat", drink: "madder_wine",
    kills: ["swamp_lurker", "mire_crawler", "boar", "marsh_adder", "moss_colossus", "bandit"], fetch: [["sweetberry", 10], ["raw_carp", 8], ["willow_logs", 10], ["cowhide", 5]], quest: "bar_vat" },
  { id: "hound", name: "The Obedient Hound", town: "Lawgate", keeper: "lawgate_innkeeper", fence: "fence_hound", shop: "bar_hound", drink: "hounds_bite",
    kills: ["highland_goat", "stone_golem", "crown_hound", "wolf"], fetch: [["blackiron_ore", 8], ["pine_logs", 10], ["large_bones", 5]], quest: "bar_hound" },
  { id: "kettle", name: "The Stone Kettle", town: "Highcairn", keeper: "kettle_keeper", fence: "fence_kettle", shop: "kettle", drink: "cairn_porter",
    kills: ["wolf", "frost_wisp", "cairn_wight", "highland_goat", "frost_yeti", "bandit"], fetch: [["inkcoal", 12], ["blackiron_ore", 8], ["raw_grayling", 6]], quest: "bar_kettle" },
  { id: "freepour", name: "The Free Pour", town: "Freehold", keeper: "freepour_keeper", fence: "fence_freepour", shop: "bar_freepour", drink: "free_cider",
    kills: ["wolf", "bark_lurker", "boar"], fetch: [["pine_logs", 10], ["moonsilver_ore", 5], ["raw_char", 6]], quest: "bar_freepour" },
];
export const barDef = (id: string) => BARS.find(bar => bar.id === id);

export const BAR_NPCS: Record<string, NpcDef> = {
  vat_keeper: { id: "vat_keeper", name: "Ottilie Crane, of the Crooked Vat", examine: "Keeps the Crooked Vat. Her apron is every colour Dyemoor makes.", options: ["Talk-to", "Trade"], shop: "bar_vat", art: art(4, 1201) },
  freepour_keeper: { id: "freepour_keeper", name: "Pip Freeman, of the Free Pour", examine: "Keeps the Free Pour. Will explain the Federation's position on payment at length.", options: ["Talk-to", "Trade"], shop: "bar_freepour", art: art(6, 1202) },
  fence_sleepy: { id: "fence_sleepy", name: "A quiet man in grey", examine: "He's been at that table all day, and nobody's noticed him.", options: ["Talk-to", "Trade"], shop: "fence", art: art(0, 1211) },
  fence_prayer: { id: "fence_prayer", name: "A woman in correct violet", examine: "Her clothes are exactly to the Law. Her boots aren't.", options: ["Talk-to", "Trade"], shop: "fence", art: art(3, 1212) },
  fence_vat: { id: "fence_vat", name: "A stranger in undyed wool", examine: "The only person in Dyemoor wearing no colour at all. Deliberately.", options: ["Talk-to", "Trade"], shop: "fence", art: art(9, 1213) },
  fence_hound: { id: "fence_hound", name: "A deserter, probably", examine: "His boots are Regiment issue. The rest of him isn't.", options: ["Talk-to", "Trade"], shop: "fence", art: art(2, 1214) },
  fence_kettle: { id: "fence_kettle", name: "A miner who doesn't mine", examine: "Clean hands, in Highcairn.", options: ["Talk-to", "Trade"], shop: "fence", art: art(7, 1215) },
  fence_freepour: { id: "fence_freepour", name: "A Federation 'consultant'", examine: "The Federation pays her for something. Nobody can say what.", options: ["Talk-to", "Trade"], shop: "fence", art: art(1, 1216) },
};
const FENCE_LINES: Record<string, string> = {
  fence_sleepy: "Gloves that don't catch, boots that don't creak, a draught for when you'd rather not be seen. For the trade, you understand. Which trade? Exactly.",
  fence_prayer: "Raria has a law for everything, and a Ranger behind every pillar. You'll want to be quieter than you are. I can help with that, for a fee the Law doesn't know about.",
  fence_vat: "Everyone here's in colour. Nobody looks at the one person who isn't. Remember that, and buy the boots.",
  fence_hound: "Lawgate's watched from the walls, the gate and the bar. Softsole boots; you'll thank me on the walls.",
  fence_kettle: "Miners talk loud and look at the rock. A quiet hand does well in Highcairn. Gloves?",
  fence_freepour: "The Federation believes in free movement. I believe in unheard movement. Same thing, really. Boots?",
};

/** The bar's quests: a barkeep's errand each. */
const fetchItems = (game: Game, items: readonly (readonly [string, number])[]) => items.every(([id, n]) => count(game.player, id) >= n);
const takeItems = (game: Game, items: readonly (readonly [string, number])[]) => { for (const [id, n] of items) take(game.player, id, n); };
const journalItems = (game: Game, items: readonly (readonly [string, number])[]) => items.map(([id, n]) => `${count(game.player, id) >= n ? "✓" : "•"} ${item(id).name}: ${Math.min(n, count(game.player, id))}/${n}`);
type BarQuest = { bar: string; name: string; start: string; wants: readonly (readonly [string, number])[]; rewards: string[]; reward: (game: Game) => void; intro: string; offer: string[]; accept: string; done: string[] };
export const BAR_QUESTS: Record<string, BarQuest> = {
  bar_sleepy: { bar: "sleepy", name: "Last Orders", start: "Talk to Bram at the Sleepy Friend, Friendhollow's bar.", wants: [["grain", 6], ["sweetberry", 10]],
    rewards: ["1 Quest Point", "600 coins", "1,500 Cooking XP", "4 Sleepy stouts"], reward: g => { give(g.player, "coins", 600); addXp(g, "cooking", 1500, { raw: true }); giveOrDrop(g, "sleepy_stout", 4); },
    intro: "Bram's cellar is dry, and the harvest fair's in three days.",
    offer: ["The fair's in three days and my cellar's dry. Dry! The Sleepy Friend, dry, at the fair.", "Six grain for the mash and ten sweetberries for the berry stout. Bring them and the first round's yours. The first four rounds."],
    accept: "Six grain, ten sweetberries. The mill's west; the berries grow wild all over.", done: ["That'll mash. That'll mash beautifully.", "Four of the first stouts out of the barrel, as promised. Don't drink them before noon. I mean it."] },
  bar_prayer: { bar: "prayer", name: "The Seventh Toast", start: "Talk to Mother Constance at the Seventh Prayer, in Raria.", wants: [["char", 5], ["bread", 5]],
    rewards: ["1 Quest Point", "900 coins", "2,000 Faith XP", "2,000 Cooking XP", "4 Lawful small beers"], reward: g => { give(g.player, "coins", 900); addXp(g, "prayer", 2000, { raw: true }); addXp(g, "cooking", 2000, { raw: true }); giveOrDrop(g, "lawful_beer", 4); },
    intro: "On the seventh day the Law's toast is drunk at the Seventh Prayer, with char and bread, at the hour.",
    offer: ["On the seventh day, at the hour, the Law's toast is drunk here: char from the Vesper, bread from the Crown's ovens, one measure each.", "The fishmonger is ill, which is not lawful but is true. Five cooked char and five loaves, before the hour. You'll be thanked correctly."],
    accept: "Five char, cooked. Five loaves. The hour does not wait; I will, a little.", done: ["Five and five. Correct.", "Four measures of our small beer, to the Law's strength exactly. Drink them one at a time, as is proper."] },
  bar_vat: { bar: "vat", name: "A Crooked Vintage", start: "Talk to Ottilie Crane at the Crooked Vat, in Dyemoor.", wants: [["sweetberry", 12], ["willow_logs", 4]],
    rewards: ["1 Quest Point", "700 coins", "2,500 Craftwork XP", "4 Madder wines"], reward: g => { give(g.player, "coins", 700); addXp(g, "crafting", 2500, { raw: true }); giveOrDrop(g, "madder_wine", 4); },
    intro: "Ottilie makes madder wine in an old dye vat, and the vat's split.",
    offer: ["They call it the Crooked Vat because the vat's crooked. I make the wine in it. Made. It's split down the stave.", "Four willow logs for new staves, and twelve sweetberries for the sweetening, and I'll have it running red again by the guild's feast."],
    accept: "Four willow, twelve sweetberries. The willows grow by the river.", done: ["Willow staves, sweet berries. Listen to that vat hold.", "First four bottles of the new madder. It goes to your head. That's rather the point."] },
  bar_hound: { bar: "hound", name: "The Hound's Bite", start: "Talk to Hester Vane at the Obedient Hound, in Lawgate.", wants: [["pine_logs", 6], ["large_bones", 6]],
    rewards: ["1 Quest Point", "800 coins", "3,000 Attack XP", "4 Hound's bites"], reward: g => { give(g.player, "coins", 800); addXp(g, "attack", 3000, { raw: true }); giveOrDrop(g, "hounds_bite", 4); },
    intro: "Hester's whiskey is smoked over pine and bone char, and the Regiment drinks it faster than she can smoke it.",
    offer: ["The Regiment drinks my whiskey by the measure, one measure each, and there are a great many of them.", "It's smoked over pine and bone char. Six pine logs and six large bones, and I'll have a cask by the change of the watch."],
    accept: "Six pine, six large bones. Goats and golems on the slopes have the bones; the pines are everywhere.", done: ["That'll smoke a cask. That'll smoke two.", "Four bottles of the Hound's Bite. Don't drink it on the walls."] },
  bar_kettle: { bar: "kettle", name: "Kettle Black", start: "Talk to Oda at the Stone Kettle, in Highcairn.", wants: [["inkcoal", 10], ["raw_grayling", 4]],
    rewards: ["1 Quest Point", "800 coins", "3,000 Mining XP", "4 Cairn porters"], reward: g => { give(g.player, "coins", 800); addXp(g, "mining", 3000, { raw: true }); giveOrDrop(g, "cairn_porter", 4); },
    intro: "The Stone Kettle's stove has gone out, and the miners want their porter.",
    offer: ["The stove's out, the kettle's cold and the porter wants boiling. In Highcairn! The miners will riot. Politely, but they will.", "Ten inkcoal for the stove, and four raw grayling for the miners' supper while it heats. Quick as you can."],
    accept: "Ten inkcoal, four raw grayling. The inkcoal's in the rocks up the pass.", done: ["That's a fire. That's a proper fire.", "Four porters, first from the new boil. Good for the arms. Good for the pick."] },
  bar_freepour: { bar: "freepour", name: "Free Cider", start: "Talk to Pip Freeman at the Free Pour, in Freehold.", wants: [["sweetberry", 15], ["moonsilver_ore", 2]],
    rewards: ["1 Quest Point", "800 coins", "2,000 Smithing XP", "4 Free ciders"], reward: g => { give(g.player, "coins", 800); addXp(g, "smithing", 2000, { raw: true }); giveOrDrop(g, "free_cider", 4); },
    intro: "The Free Pour's cider press has broken a spring, and the Federation says a new one is 'in the pipeline'.",
    offer: ["The press broke a spring. I asked the Federation for a new one. They said it was 'in the pipeline'. The pipeline is a device. The device is in a room. The room is locked.", "Two moonsilver ore and I'll have the artificer's apprentice forge me a spring the honest way, and fifteen sweetberries to press."],
    accept: "Two moonsilver ore, fifteen sweetberries. The moonsilver's in the outcrops west of the fortress.", done: ["A spring! An actual spring, made by an actual person.", "Four ciders, free. Well. Free to you. The Federation can pay for them; I'll send them the bill."] },
};
export const BAR_QUEST_DEFS: QuestDef[] = Object.entries(BAR_QUESTS).map(([id, q]) => ({
  id, name: q.name, points: 1, difficulty: "Novice", start: q.start, requirements: [], rewards: q.rewards,
  journal: (game: Game) => {
    const s = stage(game, id);
    if (s === 0) return [q.intro];
    if (s === 1) return [`${barDef(q.bar)!.name} wants:`, ...journalItems(game, q.wants)];
    return [`${q.intro} I helped. QUEST COMPLETE!`];
  },
} as QuestDef));

// ---------- The job board ----------
let monsterDefs: Record<string, { name: string; level: number } | undefined> | null = null;
/** Every creature's name and level (made on first use: the creature tables load after this module). */
const MONSTER_DEFS = new Proxy({} as Record<string, { name: string; level: number } | undefined>, { get: (_, id: string) => (monsterDefs ??= { ...MONSTERS, ...FACTION_MONSTERS } as Record<string, { name: string; level: number } | undefined>)[id] });
const hash = (a: number, b: number, c: number) => { let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 7, 668265263) ^ Math.imul(c + 3, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export type Job = { kind: "kill" | "fetch"; target: number; count: number; reward: number };
/** The three jobs pinned on a bar's board: two bounties and an errand, changed each time you finish one. */
export function boardJobs(game: Game, barIndex: number): Job[] {
  const bar = BARS[barIndex], round = game.player.questData.jobs_done ?? 0, jobs: Job[] = [];
  const kills = bar.kills.map((id, index) => ({ id, index })).filter(entry => MONSTER_DEFS[entry.id]);
  for (let k = 0; k < 2 && kills.length; k++) {
    const pick = kills[Math.floor(hash(barIndex, round, k) * kills.length) % kills.length], level = MONSTER_DEFS[pick.id]!.level, n = 5 + Math.floor(hash(barIndex, round, k + 10) * 6);
    if (jobs.some(job => job.kind === "kill" && job.target === pick.index)) continue;
    jobs.push({ kind: "kill", target: pick.index, count: n, reward: Math.round(60 + level * n * 3.5) });
  }
  const fetch = Math.floor(hash(barIndex, round, 20) * bar.fetch.length) % bar.fetch.length, [id, n] = bar.fetch[fetch];
  jobs.push({ kind: "fetch", target: fetch, count: n, reward: Math.round(40 + item(id).value * n * 1.6) });
  return jobs;
}
const jobName = (bar: BarDef, job: Job) => job.kind === "kill" ? `Put down ${job.count} ${plural(MONSTER_DEFS[bar.kills[job.target]]!.name, job.count)}` : `Bring ${job.count} ${item(bar.fetch[job.target][0]).name.toLowerCase()}`;
const plural = (name: string, n: number) => { const lower = name.toLowerCase(); return n === 1 ? lower : lower.endsWith("s") ? lower : lower.endsWith("y") && !/[aeiou]y$/.test(lower) ? `${lower.slice(0, -1)}ies` : lower.endsWith("f") ? `${lower.slice(0, -1)}ves` : `${lower}s`; };
/** The job you've taken, if any. */
export function currentJob(game: Game): { bar: BarDef; barIndex: number; job: Job; done: number } | null {
  const data = game.player.questData, index = (data.job_bar ?? 0) - 1;
  if (index < 0 || !BARS[index]) return null;
  return { bar: BARS[index], barIndex: index, job: { kind: data.job_kind === 2 ? "fetch" : "kill", target: data.job_target ?? 0, count: data.job_count ?? 0, reward: data.job_reward ?? 0 }, done: data.job_done ?? 0 };
}
function clearJob(game: Game) { for (const key of ["job_bar", "job_kind", "job_target", "job_count", "job_done", "job_reward"]) delete game.player.questData[key]; }
/** A bounty's kill, wherever it falls. */
export function onBountyKill(game: Game, monsterId: string) {
  const current = currentJob(game);
  if (!current || current.job.kind !== "kill" || current.bar.kills[current.job.target] !== monsterId || current.done >= current.job.count) return;
  const done = game.player.questData.job_done = current.done + 1;
  message(game, done >= current.job.count ? `Bounty done: ${done}/${current.job.count}. Collect your reward at ${current.bar.name}'s board.` : `Bounty: ${done}/${current.job.count}.`, done >= current.job.count ? "quest" : "info");
}
/** Reading a bar's job board: take a job, see how one's going, hand it in, or give it up. */
export function jobBoard(game: Game, barId: string): Dialogue {
  const barIndex = BARS.findIndex(bar => bar.id === barId), bar = BARS[barIndex], name = "Job board";
  if (!bar) return chat(name, npcSays(name, "The notices have all blown away."));
  const current = currentJob(game), data = game.player.questData;
  if (current && current.barIndex !== barIndex) {
    return chat(name, npcSays(name, `You've a job from ${current.bar.name} in ${current.bar.town} already: ${jobName(current.bar, current.job)}. Finish it there, or give it up.`), [
      { label: "Give it up.", then: () => { clearJob(game); return chat(name, npcSays(name, "You take the old notice down.")); } },
      { label: "Leave the board.", then: () => null },
    ]);
  }
  if (current) {
    const { job } = current, fetchId = job.kind === "fetch" ? bar.fetch[job.target][0] : null;
    const ready = job.kind === "kill" ? current.done >= job.count : count(game.player, fetchId!) >= job.count;
    const progress = job.kind === "kill" ? `${current.done}/${job.count}` : `${Math.min(job.count, count(game.player, fetchId!))}/${job.count} in your pack`;
    const collect = () => {
      if (job.kind === "fetch") take(game.player, fetchId!, job.count);
      give(game.player, "coins", job.reward);
      if (job.kind === "kill") addXp(game, "slayer", Math.round(job.reward * 0.6), { raw: true });
      addXp(game, "presence", Math.round(job.reward * 0.4), { raw: true });
      data.jobs_done = (data.jobs_done ?? 0) + 1; clearJob(game); sound(game, "coins");
      message(game, `Job done: ${job.reward.toLocaleString()} coins.`, "quest");
      return chat(name, npcSays(name, `${bar.name}'s barkeep pays out ${job.reward.toLocaleString()} coins, and pins up a fresh notice.`));
    };
    if (ready) return chat(name, npcSays(name, `Your job: ${jobName(bar, job)} (${progress}). Done.`), [
      { label: job.kind === "fetch" ? "Hand it in." : "Collect the reward.", then: collect },
      { label: "Not yet.", then: () => null },
    ]);
    return chat(name, npcSays(name, `Your job: ${jobName(bar, job)} (${progress}). ${job.kind === "kill" ? "Come back when it's done." : "Bring them here."} Reward: ${job.reward.toLocaleString()} coins.`), [
      { label: "Give it up.", then: () => { clearJob(game); return chat(name, npcSays(name, "You take your notice down. Someone else can have it.")); } },
      { label: "Leave the board.", then: () => null },
    ]);
  }
  const jobs = boardJobs(game, barIndex);
  return chat(name, npcSays(name, `${bar.name}'s board: bounties and errands, paid in coin at this board. One at a time.`), [
    ...jobs.map(job => ({ label: `${jobName(bar, job)} (${job.reward.toLocaleString()} coins)`, then: () => {
      Object.assign(data, { job_bar: barIndex + 1, job_kind: job.kind === "kill" ? 1 : 2, job_target: job.target, job_count: job.count, job_done: 0, job_reward: job.reward });
      message(game, `Job taken: ${jobName(bar, job)}.`, "quest"); sound(game, "quest");
      return chat(name, playerSays(`I'll ${jobName(bar, job).toLowerCase()}.`));
    } })),
    { label: "Leave the board.", then: () => null },
  ]);
}

/** The bar people's talk: barkeeps with their quests, and the quiet traders. Null for anyone else. */
export function talkBar(game: Game, npcId: string, name: string, everyday: () => Dialogue): Dialogue | null {
  if (FENCE_LINES[npcId]) return chat(name, npcSays(name, FENCE_LINES[npcId]));
  const bar = BARS.find(entry => entry.keeper === npcId);
  if (!bar) return null;
  const quest = BAR_QUESTS[bar.quest];
  if (stage(game, bar.quest) >= 2) return everyday();
  return fetchQuest(game, name, bar.quest, {
    offer: quest.offer, accept: quest.accept, progress: `${quest.wants.map(([id, n]) => `${n} ${item(id).name.toLowerCase()}`).join(" and ")}. When you've got them.`,
    have: () => fetchItems(game, quest.wants), take: () => takeItems(game, quest.wants), done: quest.done, reward: () => quest.reward(game),
  });
}
