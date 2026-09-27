/**
 * NPCs, their dialogue and the Realm's quests. Dialogue is built on demand from the player's quest state.
 */
import { FAMILY_NAMES, FAMILY_PERKS, SLAYER_REWARDS, item } from "./data.ts";
import { assignTask, buySlayerReward, currentTask, eligibleTasks, slayerPoints, slayerStreak, taskText } from "./slayer.ts";
import {
  addXp, count, give, giveOrDrop, has, message, sound, take, emit, type Dialogue, type DialogueLine, type Game,
} from "./state.ts";

// ---------- NPC definitions ----------
export type NpcDef = {
  id: string; name: string; examine: string; options: readonly string[];
  art: { canonical: 7730 | 3412 } | { family: number; seed: number };
  shop?: string; pickpocket?: { level: number; xp: number; coins: readonly [number, number]; stun: number; damage: number; extra?: readonly [string, number][] };
};
const art = (family: number, seed: number) => ({ family, seed });
export const NPCS: Record<string, NpcDef> = {
  guide: { id: "guide", name: "Realm Guide", examine: "Knows the Realm by heart.", options: ["Talk-to"], art: art(5, 11) },
  glimmer: { id: "glimmer", name: "Old Glimmer", examine: "Friend #7730. A Hoverer who remembers when the Realm was new.", options: ["Talk-to"], art: { canonical: 7730 } },
  priest: { id: "priest", name: "Brother Ossic", examine: "Friend #3412. A Skeleton who tends the chapel of the Old Friend.", options: ["Talk-to"], art: { canonical: 3412 } },
  banker: { id: "banker", name: "Banker", examine: "Good with money.", options: ["Talk-to", "Bank"], art: art(1, 21) },
  shop_general: { id: "shop_general", name: "Shopkeeper", examine: "Sells a bit of everything.", options: ["Talk-to", "Trade"], shop: "general", art: art(2, 31) },
  pike: { id: "pike", name: "Pike", examine: "Smells faintly of bait.", options: ["Talk-to", "Trade"], shop: "fishing", art: art(3, 41) },
  axel: { id: "axel", name: "Axel", examine: "Sells axes. And pickaxes, grudgingly.", options: ["Talk-to", "Trade"], shop: "axes", art: art(6, 51) },
  armsmaster: { id: "armsmaster", name: "Armsmaster Vey", examine: "Sells swords, shields and the odd cuirass.", options: ["Talk-to", "Trade"], shop: "swords", art: art(4, 61) },
  runa: { id: "runa", name: "Runa", examine: "Her shop hums.", options: ["Talk-to", "Trade"], shop: "sigils", art: art(8, 71) },
  tanner: { id: "tanner", name: "Tessa", examine: "The tanner. Her hands are stained brown.", options: ["Talk-to", "Trade", "Tan-hides"], shop: "crafting", art: art(2, 81) },
  king: { id: "king", name: "King Hollis", examine: "King of Friendhollow. His crown is a little too big for him.", options: ["Talk-to"], art: art(1, 7) },
  royal_guard: { id: "royal_guard", name: "Royal guard", examine: "Guards the King. Takes it very seriously.", options: ["Talk-to"], art: art(0, 223) },
  captain: { id: "captain", name: "Captain Rook", examine: "Captain of the castle guard.", options: ["Talk-to"], art: art(6, 91) },
  guard: { id: "guard", name: "Hall guard", examine: "He looks bored.", options: ["Talk-to", "Pickpocket"], art: art(0, 101),
    pickpocket: { level: 40, xp: 46.8, coins: [20, 40], stun: 5, damage: 2 } },
  cook: { id: "cook", name: "Cook Mabel", examine: "The castle cook. She looks worried.", options: ["Talk-to"], art: art(3, 111) },
  emporium: { id: "emporium", name: "Relic keeper", examine: "Keeper of the Rare Casket chest.", options: ["Talk-to", "Caskets"], art: art(7, 121) },
  villager: { id: "villager", name: "Villager", examine: "One of the Realm's many Friends.", options: ["Talk-to", "Pickpocket"], art: art(4, 131),
    pickpocket: { level: 1, xp: 8, coins: [3, 12], stun: 4, damage: 1 } },
  miller: { id: "miller", name: "Miller Dunn", examine: "Flour on every surface.", options: ["Talk-to"], art: art(2, 141) },
  miner: { id: "miner", name: "Old miner", examine: "Coughs a lot.", options: ["Talk-to"], art: art(6, 151) },
  smith: { id: "smith", name: "Brann the smith", examine: "The Emberforge smith. His forge is cold.", options: ["Talk-to"], art: art(6, 161) },
  outfitter: { id: "outfitter", name: "Frostpeak outfitter", examine: "Wrapped in six scarves.", options: ["Talk-to", "Trade"], shop: "frost", art: art(3, 171) },
  fisher: { id: "fisher", name: "Old fisher", examine: "Hasn't moved from the pier in years.", options: ["Talk-to"], art: art(5, 181) },
  merchant: { id: "merchant", name: "Oasis merchant", examine: "Sells anything that fits on a camel.", options: ["Talk-to", "Trade", "Pickpocket"], shop: "oasis", art: art(1, 191),
    pickpocket: { level: 25, xp: 26, coins: [10, 30], stun: 5, damage: 2, extra: [["silk", 0.1], ["cake", 0.15]] } },
  witch: { id: "witch", name: "Bog witch", examine: "She's stirring something that stirs back.", options: ["Talk-to"], art: art(8, 201) },
  agility: { id: "agility", name: "Coach Skip", examine: "Never stops stretching.", options: ["Talk-to"], art: art(5, 211) },
  armourer: { id: "armourer", name: "Dora Plate", examine: "She's knocked the dents out of half the Realm's helms.", options: ["Talk-to", "Trade"], shop: "armour", art: art(6, 241) },
  weaponsmith: { id: "weaponsmith", name: "Hilt", examine: "Tests every edge on his thumb. Has a lot of plasters.", options: ["Talk-to", "Trade"], shop: "weapons", art: art(0, 251) },
  bowyer: { id: "bowyer", name: "Wren the bowyer", examine: "Smells of beeswax and pine shavings.", options: ["Talk-to", "Trade"], shop: "archery", art: art(3, 261) },
  slayer_master: { id: "slayer_master", name: "Warden Thistle", examine: "The Realm's Slayer Warden. She knows where everything soft is.", options: ["Talk-to", "Assignment", "Rewards", "Trade"], shop: "slayer", art: art(8, 271) },
  rare_trader: { id: "rare_trader", name: "Rare trader", examine: "Deals in Rare Caskets and the good stuff that comes with them.", options: ["Talk-to", "Rare-market", "Caskets"], art: art(7, 281) },
  innkeeper: { id: "innkeeper", name: "Bram the innkeeper", examine: "Runs the Sleepy Friend. Has never seen it busy before noon.", options: ["Talk-to", "Trade"], shop: "inn", art: art(2, 291) },
  cape_keeper: { id: "cape_keeper", name: "Keeper of Capes", examine: "Keeps a cape for every skill, and knows who's earned one.", options: ["Talk-to", "Trade"], shop: "capes", art: art(1, 301) },
};
export const npcDef = (id: string) => NPCS[id];

// ---------- Quests ----------
export type QuestDef = { id: string; name: string; points: number; difficulty: string; start: string; requirements: string[]; journal: (game: Game) => string[] };
const stage = (game: Game, quest: string) => game.player.quests[quest] ?? 0;
const data = (game: Game, key: string) => game.player.questData[key] ?? 0;
export const QUESTS: readonly QuestDef[] = [
  {
    id: "friends_feast", name: "A Friend's Feast", points: 1, difficulty: "Novice", start: "Talk to Cook Mabel in the castle kitchen.", requirements: [],
    journal: game => {
      const s = stage(game, "friends_feast");
      if (s === 0) return ["I can start this quest by talking to Cook Mabel in the castle kitchen, north of the fountain."];
      if (s === 1) return ["Cook Mabel needs ingredients for the Realm Feast:",
        `${has(game.player, "egg") ? "✓" : "•"} An egg (the chicken coop at Hollow Farms)`,
        `${has(game.player, "pot_of_flour") ? "✓" : "•"} A pot of flour (grain from the wheat field, milled at the windmill, into a pot)`,
        `${has(game.player, "bucket_of_milk") ? "✓" : "•"} A bucket of milk (the dairy cow in the pen)`];
      return ["The Realm Feast was a success. QUEST COMPLETE!"];
    },
  },
  {
    id: "grumblin_trouble", name: "Grumblin Trouble", points: 1, difficulty: "Novice", start: "Talk to Captain Rook in the castle.", requirements: [],
    journal: game => {
      const s = stage(game, "grumblin_trouble");
      if (s === 0) return ["Captain Rook in the castle might need a hand."];
      if (s === 1) return [`Captain Rook asked me to thin out the Grumblins in Whisperwood, west of the farms. Grumblins defeated: ${Math.min(6, data(game, "grumblins"))}/6.`];
      return ["The Grumblins are quieter now. QUEST COMPLETE!"];
    },
  },
  {
    id: "cold_forge", name: "The Cold Forge", points: 1, difficulty: "Intermediate", start: "Talk to Brann the smith in Emberforge.", requirements: ["Smithing 5 recommended"],
    journal: game => {
      const s = stage(game, "cold_forge");
      if (s === 0) return ["Brann the smith in Emberforge, north-east past the Ashen Hills, looks troubled."];
      if (s === 1) return ["Brann needs metal to wake his forge. Bring him:",
        `${count(game.player, "pewter_bar") >= 3 ? "✓" : "•"} 3 pewter bars (pewter ore at a furnace)`,
        `${count(game.player, "blackiron_bar") >= 2 ? "✓" : "•"} 2 blackiron bars (blackiron ore, Mining 15, Smithing 15)`];
      return ["The Emberforge burns again. QUEST COMPLETE!"];
    },
  },
  {
    id: "hollow_whispers", name: "Hollow Whispers", points: 1, difficulty: "Intermediate", start: "Talk to Brother Ossic in the Friendhollow chapel.", requirements: ["Combat 20 recommended"],
    journal: game => {
      const s = stage(game, "hollow_whispers");
      if (s === 0) return ["Brother Ossic in the chapel west of the fountain hears whispers at night."];
      if (s === 1) return ["The whispers come from the crypt in Murkmire, south-west. I should find a way to quiet them. Maybe something in the crypt holds a key."];
      if (s === 2) return ["I found the crypt key. I should use it at the crypt altar."];
      if (s === 3) return ["The whispers have stopped. I should tell Brother Ossic."];
      return ["The crypt is quiet. QUEST COMPLETE!"];
    },
  },
  {
    id: "lost_glimmer", name: "The Lost Glimmer", points: 2, difficulty: "Intermediate", start: "Talk to Old Glimmer by the fountain.", requirements: [],
    journal: game => {
      const s = stage(game, "lost_glimmer");
      if (s === 0) return ["Old Glimmer, a Hoverer by the fountain, seems to have lost something bright."];
      if (s === 1) return ["Old Glimmer's Glimmer shattered into three shards. I should look:",
        `${data(game, "shard_chief") ? "✓" : "•"} with the loudest Grumblin in Whisperwood`,
        `${data(game, "shard_swamp") ? "✓" : "•"} inside something that lurks in Murkmire`,
        `${data(game, "shard_well") ? "✓" : "•"} down the Friendhollow well, east of the fountain`,
        `Shards carried: ${count(game.player, "glimmer_shard")}/3`];
      return ["The Glimmer shines again. QUEST COMPLETE!"];
    },
  },
  {
    id: "hollow_king", name: "The Hollow King", points: 3, difficulty: "Grandmaster", start: "Talk to Old Glimmer after The Lost Glimmer and Hollow Whispers.", requirements: ["The Lost Glimmer", "Hollow Whispers", "Combat 60+ strongly recommended"],
    journal: game => {
      const s = stage(game, "hollow_king");
      if (s === 0) return ["Old Glimmer will have more to say once the Glimmer is whole and the crypt is quiet."];
      if (s === 1) return ["The Hollow King stirs in the Hollow Depths, beneath the Mossy Ruins south of Friendhollow. The Hollow gate will open for me.", "I must defeat him and bring his crown to Old Glimmer."];
      if (s === 2) return ["I have the Hollow crown. I should bring it to Old Glimmer."];
      return ["The Hollow King is ended. The Realm is safe, for now. QUEST COMPLETE!"];
    },
  },
];
export const questPoints = (game: Game) => QUESTS.reduce((sum, quest) => sum + (stage(game, quest.id) >= finalStage(quest.id) ? quest.points : 0), 0);
export function finalStage(quest: string) { return quest === "hollow_whispers" ? 4 : quest === "hollow_king" ? 3 : 2; }
export const questDone = (game: Game, quest: string) => stage(game, quest) >= finalStage(quest);
export const MAX_QUEST_POINTS = QUESTS.reduce((sum, quest) => sum + quest.points, 0);

function completeQuest(game: Game, quest: string, rewards: string[]) {
  game.player.quests[quest] = finalStage(quest);
  const definition = QUESTS.find(entry => entry.id === quest)!;
  message(game, `Congratulations! Quest complete: ${definition.name}. Rewards: ${rewards.join(", ")}.`, "quest");
  emit(game, { type: "quest", quest, tick: game.tick }); sound(game, "quest");
}

// ---------- Dialogue helpers ----------
const npcSays = (npc: string, ...texts: string[]): DialogueLine[] => texts.map(text => ({ who: "npc", text, npc }));
const playerSays = (...texts: string[]): DialogueLine[] => texts.map(text => ({ who: "player", text }));
function chat(npc: string, lines: DialogueLine[], options?: Dialogue["options"], onEnd?: () => void): Dialogue {
  return { npc, lines, index: 0, options, onEnd };
}

/** Pickpocket and quest hooks the engine calls. */
export function onMonsterKilled(game: Game, monsterId: string, x: number, y: number) {
  const player = game.player;
  if (monsterId === "grumblin" && stage(game, "grumblin_trouble") === 1) {
    player.questData.grumblins = (player.questData.grumblins ?? 0) + 1;
    if (player.questData.grumblins === 6) message(game, "That's six Grumblins. I should report to Captain Rook.", "quest");
  }
  const shard = (key: string, where: string) => {
    if (stage(game, "lost_glimmer") !== 1 || data(game, key)) return;
    player.questData[key] = 1; giveOrDrop(game, "glimmer_shard");
    message(game, `A Glimmer shard ${where}!`, "quest"); sound(game, "quest");
  };
  if (monsterId === "grumblin_chief") shard("shard_chief", "falls from the chief's pocket");
  if (monsterId === "swamp_lurker") shard("shard_swamp", "glints in the lurker's mud");
  if (monsterId === "hollow_king" && stage(game, "hollow_king") === 1) {
    player.quests.hollow_king = 2; giveOrDrop(game, "hollow_crown");
    message(game, "The Hollow King fades. His crown drops, weightless, into your hands.", "quest"); sound(game, "quest");
  }
  void x; void y;
}
/** Searching the Friendhollow well during The Lost Glimmer. */
export function searchWell(game: Game) {
  if (stage(game, "lost_glimmer") === 1 && !data(game, "shard_well")) {
    game.player.questData.shard_well = 1; giveOrDrop(game, "glimmer_shard");
    message(game, "You fish around in the well bucket… and find a Glimmer shard!", "quest"); sound(game, "quest");
  } else message(game, "The well is deep and cold. You see your Friend's reflection.");
}
/** The crypt: searching the old chest and blessing the altar. */
export function searchCryptChest(game: Game) {
  if (stage(game, "hollow_whispers") === 1 && !has(game.player, "crypt_key")) {
    giveOrDrop(game, "crypt_key"); game.player.quests.hollow_whispers = 2;
    message(game, "Under a mouldy shroud you find a cold blackiron key.", "quest");
  } else message(game, "The chest is empty apart from dust.");
}
export function useCryptAltar(game: Game) {
  if (stage(game, "hollow_whispers") === 2 && has(game.player, "crypt_key")) {
    take(game.player, "crypt_key"); game.player.quests.hollow_whispers = 3;
    message(game, "You turn the key in the altar. The whispering stops all at once.", "quest"); sound(game, "quest");
  } else message(game, "A cracked altar. Something here wants to be locked.");
}

// ---------- Dialogue ----------
export function talk(game: Game, npcId: string): Dialogue {
  const player = game.player, def = NPCS[npcId.split(":")[0]], name = def.name;
  switch (npcId) {
    case "slayer_master:assignment": case "slayer_master": {
      const task = currentTask(game);
      if (task) return chat(name, npcSays(name, `${taskText(game)} Come back when they're done.`, `Points: ${slayerPoints(game)}. Tasks in a row: ${slayerStreak(game)}. Every tenth task pays five times over.`));
      if (npcId === "slayer_master") return chat(name, npcSays(name, "Slayer is simple. I tell you what to kill, you kill that many, I pay you in points. Some things only a Slayer knows how to hurt."), [
        { label: "Give me a task.", then: () => talk(game, "slayer_master:assignment") },
        { label: "What can points buy?", then: () => talk(game, "slayer_master:rewards") },
        { label: "Maybe later.", then: () => null },
      ]);
      if (!eligibleTasks(game).length) return chat(name, npcSays(name, "Come back when you can hold a sword the right way round."));
      assignTask(game);
      return chat(name, npcSays(name, `${taskText(game)} Take a Warden's gem from my shop if you want to check on it.`));
    }
    case "slayer_master:rewards": {
      const points = slayerPoints(game);
      return chat(name, npcSays(name, `You have ${points} Slayer points.`), [
        ...SLAYER_REWARDS.map(reward => ({ label: `${reward.name} (${reward.cost} points)`, then: () => { buySlayerReward(game, reward.id); return null; } })),
        { label: "Nothing for now.", then: () => null },
      ]);
    }
    case "rare_trader": return chat(name, npcSays(name, "Rare Caskets, and bundles to go with them. Every bundle buys caskets with simulated $RAREFRIENDS, and I add something useful on top.",
      "There's one of me in Friendhollow, Emberforge, the Oasis, Frostpeak and on Pike's Pier."), [
      { label: "Show me the Rare Market.", then: () => { game.ui.shop = "__market"; return null; } },
      { label: "Show me the caskets.", then: () => { game.ui.shop = "__caskets"; return null; } },
      { label: "Just looking.", then: () => null },
    ]);
    case "cape_keeper": {
      const mastered = (Object.keys(player.xp) as (keyof typeof player.xp)[]).filter(skill => player.xp[skill] >= 13_034_431);
      if (!mastered.length) return chat(name, npcSays(name, "Every skill has a cape, and every cape has one price: 99,000 coins, and level 99. Come back when you've mastered something.",
        "Master two skills and I'll trim every cape you buy. Master them all and there's something special."));
      return chat(name, npcSays(name, `A master of ${mastered.length === 1 ? "a skill" : `${mastered.length} skills`}! Pick your cape: 99,000 coins each${mastered.length > 1 ? ", trimmed" : ""}.`), [
        { label: "Let me see the capes.", then: () => { game.ui.shop = "capes"; return null; } },
        { label: "Not today.", then: () => null },
      ]);
    }
    case "bowyer": return chat(name, npcSays(name, "Any bow fires any arrow, but you need the Ranged level for the arrowheads. Arrows come from your pack, and most can be picked up again.",
      "Rapid shoots faster, Longrange reaches further and trains Defence too. Hides for archers are on the shelf."), [
      { label: "Let me trade.", then: () => { game.ui.shop = "archery"; return null; } },
      { label: "Thanks.", then: () => null },
    ]);
    case "innkeeper": return chat(name, npcSays(name, (["Welcome to the Sleepy Friend! Bread, cake and a hot meal.", "The King eats here, you know. Once. He liked the cake.", "Night's coming. Best be indoors or by a lamp."] as const)[Math.floor(game.rng() * 3)]), [
      { label: "What's on the menu?", then: () => { game.ui.shop = "inn"; return null; } },
      { label: "Just passing through.", then: () => null },
    ]);
    case "guide": {
      const family = FAMILY_NAMES[player.familyId], perk = FAMILY_PERKS[player.familyId];
      const tips = (): Dialogue => chat(name, npcSays(name,
        "Left-click does the first option. Right-click anything for every option, like Examine.",
        "Hold WASD or the arrows to walk. Toggle Run by the minimap. Scroll to zoom. Press M for the world map.",
        "Chop trees, fish at the lake, mine in the Ashen Hills north of here. Cook your catch on a range or a fire.",
        "Quests are in the quest tab. Cook Mabel and Captain Rook in the castle always need help.",
      ));
      return chat(name, npcSays(name, `Welcome to the Realm, ${family}. Your Friend's family gives you a perk: ${perk.title}. ${perk.text}`), [
        { label: "How do I play?", then: tips },
        { label: "Where should I go first?", then: () => chat(name, npcSays(name,
          "Try the trees around town with your axe, then fish minnows at Glass Lake to the south-east.",
          "Hollow Farms to the west has cows and chickens. Grumblins in Whisperwood are good practice, if you're brave.",
          "The bank is north-west of the fountain. Deposit what you don't need.")) },
        { label: "What are Rare Caskets?", then: () => chat(name, npcSays(name,
          "The Relic keeper in the castle sells Rare Caskets for simulated $RAREFRIENDS.",
          "Each holds a Rare Relic you keep for a bonus or redeem for RF, plus a wardrobe piece for your Friend.")) },
        { label: "Can I get a new starter kit?", then: () => {
          if (has(player, "pewter_axe") || has(player, "tinderbox")) return chat(name, npcSays(name, "You still have your tools. Check your inventory!"));
          for (const id of ["pewter_axe", "pewter_pickaxe", "small_net", "tinderbox"]) giveOrDrop(game, id);
          return chat(name, npcSays(name, "Here you go: an axe, a pickaxe, a net and a tinderbox. Look after them."));
        } },
      ]);
    }
    case "cook": {
      const s = stage(game, "friends_feast");
      if (s === 0) return chat(name, npcSays(name, "Oh dear, oh dear. The Realm Feast is tonight and I've nothing to bake with!"), [
        { label: "What's wrong?", then: () => chat(name, npcSays(name, "I need an egg, a pot of flour and a bucket of milk. Could you fetch them?",
          "Eggs are in the coop at Hollow Farms, west of town. The dairy cow's in the pen there too. Grain grows in the field, and Miller Dunn will tell you about the mill."), [
          { label: "I'll get them.", then: () => { player.quests.friends_feast = 1; message(game, "Quest started: A Friend's Feast.", "quest"); return chat(name, npcSays(name, "Bless you! A pot and a bucket are in the General Store if you need them.")); } },
          { label: "Not right now.", then: () => null },
        ]) },
        { label: "Nothing, bye.", then: () => null },
      ]);
      if (s === 1) {
        const ready = has(player, "egg") && has(player, "pot_of_flour") && has(player, "bucket_of_milk");
        if (!ready) return chat(name, npcSays(name, "Have you got my egg, pot of flour and bucket of milk? Check your quest journal if you've forgotten."));
        return chat(name, [...playerSays("I have everything!"), ...npcSays(name, "Wonderful! The Feast is saved. Take this, and my secrets of the range.")], undefined, () => {
          take(player, "egg"); take(player, "pot_of_flour"); take(player, "bucket_of_milk"); give(player, "pot"); give(player, "bucket");
          addXp(game, "cooking", 1500, { raw: true }); giveOrDrop(game, "coins", 300); giveOrDrop(game, "cake", 2);
          completeQuest(game, "friends_feast", ["1 Quest Point", "1,500 Cooking XP", "300 coins", "2 cakes"]);
        });
      }
      return chat(name, npcSays(name, "Everyone's still talking about the Feast! Use my range whenever you like."));
    }
    case "captain": {
      const s = stage(game, "grumblin_trouble");
      if (s === 0) return chat(name, npcSays(name, "Grumblins. Grumbling. All night, from Whisperwood. My guards can't sleep."), [
        { label: "Can I help?", then: () => { player.quests.grumblin_trouble = 1; player.questData.grumblins = 0; message(game, "Quest started: Grumblin Trouble.", "quest");
          return chat(name, npcSays(name, "Defeat six of them. Their camp is in Whisperwood, west past the farms. Take a sword from Emberforge if you have one, or at least that dagger.")); } },
        { label: "Sounds like your problem.", then: () => null },
      ]);
      if (s === 1) {
        if (data(game, "grumblins") < 6) return chat(name, npcSays(name, `Only ${data(game, "grumblins")} so far. I still hear grumbling.`));
        return chat(name, npcSays(name, "Silence at last! Take this sabre. You've earned it."), undefined, () => {
          giveOrDrop(game, "blackiron_sabre"); addXp(game, "attack", 1200, { raw: true }); addXp(game, "strength", 1200, { raw: true }); giveOrDrop(game, "coins", 200);
          completeQuest(game, "grumblin_trouble", ["1 Quest Point", "1,200 Attack XP", "1,200 Strength XP", "Blackiron sabre", "200 coins"]);
        });
      }
      return chat(name, npcSays(name, "The Hall sleeps well thanks to you."));
    }
    case "smith": {
      const s = stage(game, "cold_forge");
      if (s === 0) return chat(name, npcSays(name, "The forge went cold when the ember was stolen. A forge needs metal to remember how to burn."), [
        { label: "What can I bring?", then: () => { player.quests.cold_forge = 1; message(game, "Quest started: The Cold Forge.", "quest");
          return chat(name, npcSays(name, "Three pewter bars and two blackiron bars. Smelt them at my furnace. It still works if you coax it.")); } },
        { label: "Good luck with that.", then: () => null },
      ]);
      if (s === 1) {
        if (count(player, "pewter_bar") < 3 || count(player, "blackiron_bar") < 2) return chat(name, npcSays(name, "Three pewter bars and two blackiron bars. The furnace is right there."));
        return chat(name, npcSays(name, "Listen to that… the forge remembers! Here, a ashsteel pickaxe and some inkcoal to go with it."), undefined, () => {
          take(player, "pewter_bar", 3); take(player, "blackiron_bar", 2); giveOrDrop(game, "ashsteel_pickaxe"); giveOrDrop(game, "inkcoal", 10); giveOrDrop(game, "forge_ember");
          addXp(game, "smithing", 2500, { raw: true }); addXp(game, "mining", 1200, { raw: true });
          completeQuest(game, "cold_forge", ["1 Quest Point", "2,500 Smithing XP", "1,200 Mining XP", "Ashsteel pickaxe", "10 inkcoal"]);
        });
      }
      return chat(name, npcSays(name, "Use my anvils any time. Hammer in your pack, bars in your hand."));
    }
    case "priest": {
      const s = stage(game, "hollow_whispers");
      if (s === 0) return chat(name, npcSays(name, "Rattle rattle. Forgive me, old habit. I hear whispers at night, from the Murkmire crypt."), [
        { label: "I'll look into it.", then: () => { player.quests.hollow_whispers = 1; message(game, "Quest started: Hollow Whispers.", "quest");
          return chat(name, npcSays(name, "The crypt is south-west, past the farms, in the swamp. The skeletons there were Friends once. Be kind, and be quick.")); } },
        { label: "How do I train Prayer?", then: () => chat(name, npcSays(name, "Bury bones. Large bones and ink bones are worth more. Pray at my altar to restore your prayer points.")) },
        { label: "No thanks.", then: () => null },
      ]);
      if (s < 3) return chat(name, npcSays(name, "The whispers go on. The crypt is in Murkmire, south-west."));
      if (s === 3) return chat(name, npcSays(name, "Silence! You did it. Wear this. The Old Friend watches over those who wear it."), undefined, () => {
        giveOrDrop(game, "friends_charm"); addXp(game, "prayer", 2500, { raw: true }); giveOrDrop(game, "large_bones", 5);
        completeQuest(game, "hollow_whispers", ["1 Quest Point", "2,500 Prayer XP", "Old Friend's charm", "5 large bones"]);
      });
      return chat(name, npcSays(name, "May your bones rest easy, when the time comes. Not soon, I hope."));
    }
    case "glimmer": {
      const s = stage(game, "lost_glimmer"), k = stage(game, "hollow_king");
      if (s === 0) return chat(name, npcSays(name, "Hmmm. Hmmmmm. My Glimmer is gone. Shattered. Three shards, scattered to the corners."), [
        { label: "I'll find the shards.", then: () => { player.quests.lost_glimmer = 1; message(game, "Quest started: The Lost Glimmer.", "quest");
          return chat(name, npcSays(name, "One went to the loudest Grumblin. One sank into something in the Murkmire mud. One fell down the well, here in town.")); } },
        { label: "Who are you?", then: () => chat(name, npcSays(name, "I'm Friend #7730. I was hovering here before the fountain. Before the town, even.")) },
      ]);
      if (s === 1) {
        if (count(player, "glimmer_shard") < 3) return chat(name, npcSays(name, `You have ${count(player, "glimmer_shard")} of 3 shards. The grumbler, the mud, the well.`));
        return chat(name, npcSays(name, "Ahhh. It hums again. Take this staff. And this: the Realm remembers you now."), undefined, () => {
          take(player, "glimmer_shard", 3); giveOrDrop(game, "breeze_staff"); giveOrDrop(game, "thought_sigil", 100); giveOrDrop(game, "path_sigil", 5);
          addXp(game, "magic", 2500, { raw: true });
          completeQuest(game, "lost_glimmer", ["2 Quest Points", "2,500 Magic XP", "Breeze staff", "100 thought sigils", "5 path sigils"]);
        });
      }
      if (k === 0) {
        if (!questDone(game, "hollow_whispers")) return chat(name, npcSays(name, "The Glimmer shows me the crypt. It's still whispering. Help Brother Ossic, then come back."));
        return chat(name, npcSays(name, "Now the Glimmer shows me the deepest place. The Hollow King is waking in the Hollow Depths, under the Mossy Ruins."), [
          { label: "I'll end him.", then: () => { player.quests.hollow_king = 1; message(game, "Quest started: The Hollow King.", "quest");
            return chat(name, npcSays(name, "The Hollow gate will open for you now. Bring food. Lots. And pray. The Hollow Rift is south, past the ruins.")); } },
          { label: "Maybe later.", then: () => null },
        ]);
      }
      if (k === 1) return chat(name, npcSays(name, "The Hollow King is waiting. Rift in the Mossy Ruins, south. Bring food."));
      if (k === 2 && has(player, "hollow_crown")) return chat(name, npcSays(name, "His crown. Weightless, like I said. Wear this one instead. It's heavier, in the good way."), undefined, () => {
        take(player, "hollow_crown"); giveOrDrop(game, "realm_crown"); giveOrDrop(game, "hollow_cape"); giveOrDrop(game, "coins", 10_000);
        for (const skill of ["attack", "strength", "defence", "hitpoints", "magic"] as const) addXp(game, skill, 5000, { raw: true });
        completeQuest(game, "hollow_king", ["3 Quest Points", "Crown of the Realm", "Cape of the Hollow", "10,000 coins", "5,000 XP in five combat skills"]);
      });
      if (k === 2) return chat(name, npcSays(name, "You beat him but lost his crown? Find it. It can't have gone far. It weighs nothing, after all."));
      return chat(name, npcSays(name, "Hover well, hero."));
    }
    case "miller": return chat(name, npcSays(name, "Pick grain from the wheat field, then use it on the hopper. Bring a pot to catch the flour. Easy!"));
    case "miner": return chat(name, npcSays(name, "Pewter anyone can mine. Blackiron's further in. Inkcoal at the south end. There's moonsilver and a gem rock at the north edge, if you're good."));
    case "banker": return chat(name, npcSays(name, "Good day. Would you like to access your bank account?"), [
      { label: "Yes please.", then: () => { game.ui.bank = true; return null; } },
      { label: "No thanks.", then: () => null },
    ]);
    case "emporium": return chat(name, npcSays(name, "Rare Caskets, one simulated RF each. Every casket holds a Rare Relic and a wardrobe piece for your Friend.", "Keep a relic for its bonus, or redeem it for its RF value. Your wardrobe stays either way."), [
      { label: "Show me the caskets.", then: () => { emit(game, { type: "sound", name: "click", tick: game.tick }); game.ui.shop = "__caskets"; return null; } },
      { label: "Maybe later.", then: () => null },
    ]);
    case "agility": return chat(name, npcSays(name, "Five obstacles, in order, then again! Finish a lap for a bonus. Agility makes your run energy come back faster."));
    case "witch": return chat(name, npcSays(name, "Heh heh. The stepping stones to the north need Agility 20. The crypt's the other way. Mind the lurkers, dearie."));
    case "fisher": return chat(name, npcSays(name, "Cages for inkcrabs, harpoons for sailfish, off the end of the pier. Inksharks in the deep bit, if you've the skill. And there's a deep spot up on the Frostpeak tarn."));
    case "tanner": return chat(name, npcSays(name, "I'll tan cowhides into leather for 2 coins each. Then use a needle and thread on the leather to craft armour."), [
      { label: "Tan my hides.", then: () => { tanHides(game); return null; } },
      { label: "Trade.", then: () => { game.ui.shop = "crafting"; return null; } },
      { label: "Bye.", then: () => null },
    ]);
    case "villager": return chat(name, npcSays(name, (["Nice day for it.", "Have you been up the castle stairs? The King receives visitors.", "They say there's a king under the ruins. A hollow one.", "I'd buy a Rare Casket if I had any RF.", "Warden Thistle's always looking for Slayers. Market Street, south of the fountain.", "Wren's bows are the best in the Realm. Ask anyone. Ask Wren."] as const)[Math.floor(game.rng() * 6)]));
    case "guard": return chat(name, npcSays(name, "Move along."));
    case "royal_guard": return chat(name, npcSays(name, (["The King is receiving visitors. Mind your manners.", "The view from the roof? Best in the Realm. Stairs in the north-east tower.", "No running in the throne room."] as const)[Math.floor(game.rng() * 3)]));
    case "king": {
      const talk: Dialogue["options"] = [
        { label: "Who are you?", then: () => chat(name, npcSays(name, "Hollis, King of Friendhollow, by the grace of the First Friend and a very close vote.", "This was a hall, once. Then it grew towers. Then it grew me.")) },
        { label: "Tell me about the Realm.", then: () => chat(name, npcSays(name, "North: the Ashen Hills and the Emberforge. East: the Oasis and Glass Lake. South: the Mossy Ruins, and under them...",
          questDone(game, "hollow_king") ? "Nothing, now. You saw to that." : "Something hollow that wants a throne. Old Glimmer, by the fountain, knows more than I do.")) },
        { label: "Can I help the kingdom?", then: () => chat(name, npcSays(name, QUESTS.every(quest => questDone(game, quest.id)) ? "You already have, in every way I can think of. Rest a while." :
          "My cook is always short of something, my captain can't sleep for the Grumblins, and Brother Ossic hears whispers. Start with them.")) },
        { label: "Goodbye, Your Majesty.", then: () => null },
      ];
      if (!data(game, "royal_audience")) return chat(name, npcSays(name, "A visitor! Welcome to Friendhollow Castle. Here: every Friend on the road should have a little coin."), undefined, () => {
        player.questData.royal_audience = 1; giveOrDrop(game, "coins", 250); message(game, "King Hollis gives you 250 coins.");
      });
      if (questDone(game, "hollow_king")) return chat(name, npcSays(name, "The hero of the Hollow Depths, in my throne room! Sit anywhere. Not there, that's the Queen's."), talk);
      return chat(name, npcSays(name, "Welcome back, friend. What can the crown do for you?"), talk);
    }
    default:
      if (def.shop) return chat(name, npcSays(name, "Hello! Care to see my wares?"), [
        { label: "Yes please.", then: () => { game.ui.shop = def.shop!; return null; } },
        { label: "No thanks.", then: () => null },
      ]);
      return chat(name, npcSays(name, "Hello there."));
  }
}

export function tanHides(game: Game) {
  const player = game.player, hides = count(player, "cowhide"), affordable = Math.floor(count(player, "coins") / 2), n = Math.min(hides, affordable);
  if (!hides) { message(game, "You don't have any cowhides to tan."); return; }
  if (!n) { message(game, "You need 2 coins per hide."); return; }
  take(player, "cowhide", n); take(player, "coins", n * 2); give(player, "leather", n);
  message(game, `Tessa tans ${n} cowhide${n > 1 ? "s" : ""} into leather.`); sound(game, "coins");
}
export const examineItem = (id: string) => item(id).examine;
