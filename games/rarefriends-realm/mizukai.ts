/**
 * What Rises in the East: the people of the Mizukai Isles and what they ask of you.
 *
 * Kurohama's harbour folk, who meet every boat from the mainland; the Hall of Takamori, where Lord Naoharu rules
 * Hinode, his sister Lady Suzu does the ruling he doesn't notice, and Captain Ise keeps the peace with a bounty board;
 * Kumoyama's priestess and the Bureau of Seals' sealwright, between them the keepers of the Isles' faith and magic;
 * the islands' own people, each with their island's trouble. The quests run from Landfall (being presented at the Hall)
 * through the Rope and the Brush (the Mizukai tradition), out across the islands, into the old war with Josaki, and at
 * last to Hakkotsu, where the sea has been keeping something.
 */
import { addXp, combatLevel, count, giveOrDrop, has, level, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, fetchQuest, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";

const art = (family: number, seed: number) => ({ family, seed });
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(9, seed), ...extra });
const boatman = (id: string, name: string, examine: string, seed: number): NpcDef => ({ id, name, examine, options: ["Talk-to", "Travel"], art: art(9, seed) });
export const MIZUKAI_NPCS: Record<string, NpcDef> = {
  // Kurohama.
  kuro_harbourmaster: person("kuro_harbourmaster", "Harbourmaster Isamu Kaneda", "Keeper of Kurohama's harbour for thirty years. Meets every boat from the mainland, and remembers every face that got off one.", 1200),
  kuro_innkeeper: person("kuro_innkeeper", "Mistress Chiyo", "Keeps the Sleeping Crane. Has heard every traveller's story, and believes about a third.", 1201, { options: ["Talk-to", "Trade"], shop: "mizukai_inn" }),
  kuro_sealwright: person("kuro_sealwright", "Sealwright Ren Mizushiro", "Of the Bureau of Seals. Writes the spells of the Isles on paper, in ink, with a brush, very fast, and has never once spilt.", 1202, { options: ["Talk-to", "Trade"], shop: "mizukai_seals" }),
  kuro_fishmonger: person("kuro_fishmonger", "Fishmonger Tetsu", "Sells what the sea gave this morning, and argues with it about the price.", 1203, { options: ["Talk-to", "Trade"], shop: "mizukai_fish" }),
  kuro_merchant: person("kuro_merchant", "Okiku", "Keeps the general store. Knows where everything in it is, and most of what's in yours.", 1204, { options: ["Talk-to", "Trade"], shop: "mizukai_general" }),
  kuro_clothier: person("kuro_clothier", "Sayo the clothier", "Dyes and sews the indigo Kurohama wears. Her own sleeves are spotless, which nobody understands.", 1205, { options: ["Talk-to", "Trade"], shop: "mizukai_clothier" }),
  kuro_apothecary: person("kuro_apothecary", "Granny Ume", "The harbour's herbalist. Older than the Exchange, and kinder than the magistrate.", 1206, { options: ["Talk-to", "Trade"], shop: "mizukai_herbs" }),
  kuro_smith: person("kuro_smith", "Smith Tamaki", "Master of the Ironsand Forge. Folds steel the way other people knit, and talks the whole time.", 1207, { options: ["Talk-to", "Trade"], shop: "mizukai_forge" }),
  kuro_magistrate: person("kuro_magistrate", "Magistrate Sugimura", "The harbour's magistrate: the lord's law in Kurohama. Tired, fair, and buried in petitions.", 1208),
  kuro_dockhand: person("kuro_dockhand", "Dockhand Jiro", "Loads and unloads, and listens while he does. Knows which boats come in at night.", 1209),
  mizukai_villager: person("mizukai_villager", "Kurohama local", "A Mizukai islander in indigo and straw, going about the day, polite and in a hurry.", 1210, { options: ["Talk-to", "Pickpocket"], pickpocket: { level: 30, xp: 46, coins: [20, 90], stun: 4, damage: 2, extra: [["rice_ball", 0.1], ["paper_seal", 0.08]] } }),
  mizukai_guard: { id: "mizukai_guard", name: "Takamori foot soldier", examine: "One of the lord's foot soldiers, in a black war-hat with a spear. Watches the harbour road, and you.", options: ["Talk-to"], art: art(10, 1211) },
  // The Hall of Takamori.
  lord_takamori: { id: "lord_takamori", name: "Lord Takamori Naoharu", examine: "Lord of Takamori and of Hinode. Young for it, and he knows it.", options: ["Talk-to"], art: art(10, 1220) },
  lady_suzu: person("lady_suzu", "Lady Suzu", "The lord's elder sister. Keeps the Hall's letters, its guests, and most of its decisions.", 1221),
  takamori_captain: { id: "takamori_captain", name: "Captain Hayato Ise", examine: "Captain of the lord's samurai. Keeps a bounty board and a very short list of people he trusts.", options: ["Talk-to"], art: art(10, 1222) },
  mizukai_samurai: { id: "mizukai_samurai", name: "Takamori samurai", examine: "A samurai of the lord's household, the crane banner at his back. Courteous. Ready.", options: ["Talk-to", "Pickpocket"], art: art(10, 1223), pickpocket: { level: 58, xp: 120, coins: [80, 260], stun: 6, damage: 6, extra: [["spirit_seal", 0.08], ["rice_wine", 0.1]] } },
  takamori_sensei: person("takamori_sensei", "Sensei Kaede", "Teaches the sword at the Takamori dojo. Says the cut is the last part of it.", 1224),
  takamori_armourer: person("takamori_armourer", "Armourer Gonzaburo", "Laces armour for the lord's household. Counts every scale twice.", 1225, { options: ["Talk-to", "Trade"], shop: "mizukai_armour" }),
  takamori_bowyer: person("takamori_bowyer", "Bowyer Asa", "Makes the tall bows of the Isles. Strings one by bracing it against her foot and the sky.", 1226, { options: ["Talk-to", "Trade"], shop: "mizukai_bows" }),
  takamori_teahouse: person("takamori_teahouse", "Hostess Yae", "Keeps the Plum Teahouse by the castle gate. Pours, listens, remembers.", 1227, { options: ["Talk-to", "Trade"], shop: "mizukai_tea" }),
  // Kumoyama.
  kumo_priestess: person("kumo_priestess", "Head Priestess Mitsu", "Keeps the shrine on Mount Kumo. Has rung the morning bell every day for forty years, and been late once.", 1230),
  kumo_attendant: person("kumo_attendant", "Shrine attendant Natsu", "Sells charms and folds fortunes at the shrine office. Folds them very small, so nobody reads them on the steps.", 1231, { options: ["Talk-to", "Trade"], shop: "mizukai_shrine" }),
  kumo_shrine_maiden: person("kumo_shrine_maiden", "Shrine maiden", "A shrine maiden of Kumoyama in white and vermilion, sweeping a path that is already clean.", 1232),
  // Hinode's villages and wild places.
  tanabe_headman: person("tanabe_headman", "Headman Sakuji", "Headman of Tanabe. Counts the rice, and the imps who steal it.", 1240),
  tanabe_farmer: person("tanabe_farmer", "Tanabe farmer", "Up to the knees in a paddy, planting in rows straight enough to rule a page with.", 1241, { options: ["Talk-to", "Pickpocket"], pickpocket: { level: 12, xp: 18, coins: [6, 30], stun: 3, damage: 1, extra: [["rice", 0.3], ["cucumber", 0.1]] } }),
  yumoto_host: person("yumoto_host", "Okami Fumi", "Hostess of the Steaming Moon. Has run the bath-house through three lords and a great many monkeys.", 1242),
  isohama_fisher: person("isohama_fisher", "Isohama fisher", "Mending a net with a needle of whalebone, talking to it.", 1243),
  cedar_woodsman: person("cedar_woodsman", "Woodsman Tobei", "Cuts cedar for the shrines, and asks each tree first.", 1244),
  bamboo_teacher: person("bamboo_teacher", "The Quiet Teacher", "Sits in a tea hut in the bamboo. You didn't hear the door open. You didn't hear anything.", 1245),
  // The islands' people.
  shio_netmender: person("shio_netmender", "Net-mender Oyone", "Shiogama's net-mender. Her knots have held through three typhoons and one sea monk.", 1250),
  shio_fisher: person("shio_fisher", "Shiogama fisher", "Salt in the hair, a basket of squid on one hip.", 1251),
  kibi_teamaster: person("kibi_teamaster", "Tea-master Hanae", "Grows, picks, rolls and pours Kibi's tea. Has opinions about water.", 1252),
  kibi_picker: person("kibi_picker", "Tea picker", "Picks two leaves and a bud, all day, into a basket on her back.", 1253),
  hana_poet: person("hana_poet", "The poet Yugiri", "A poet who came to Hanazono to finish one poem, eleven years ago.", 1254),
  hana_tea: person("hana_tea", "Hostess Momo", "Keeps the Blossom Teahouse. Sweeps the petals off the step, and they come back.", 1255, { options: ["Talk-to", "Trade"], shop: "mizukai_tea" }),
  mori_maiden: person("mori_maiden", "Shrine maiden Kon", "Keeps the fox shrine on Morishima. Her eyes are a little too gold in the lantern light.", 1256),
  iwa_abbot: person("iwa_abbot", "Abbot Jikai", "Abbot of Iwaoka. Speaks rarely. Says more when he doesn't.", 1257),
  iwa_monk: person("iwa_monk", "Iwaoka monk", "A monk of the silent climb. Bows; says nothing.", 1258),
  toro_keeper: person("toro_keeper", "Old Mother Hotaru", "The Lantern Keeper of Torojima. Knows every lantern on the island by name, because every lantern is one.", 1259),
  kusa_herbalist: person("kusa_herbalist", "Herbalist Midori", "Lives alone on Kusabana with the herbs. Talks to them. They do better than anyone's.", 1260),
  cove_boss: person("cove_boss", "Kuze of the Cove", "Runs the cove that isn't on the charts. Charming. Armed. Thinking about you.", 1261),
  // The boatmen, one at each landing.
  boat_eastport: boatman("boat_eastport", "Ferryman Goro", "Runs the eastern ferry from the mainland. Has done the crossing so often he sleeps through it.", 1270),
  boat_kurohama: boatman("boat_kurohama", "Harbour pilot Sen", "Kurohama's pilot: every boat in the harbour goes where she says.", 1271),
  boat_tanabe: boatman("boat_tanabe", "Old Tatsu", "Rows from Tanabe's landing. Older than his boat, and his boat is old.", 1272),
  boat_shiogama: boatman("boat_shiogama", "Ferrywoman Hana", "Runs Shiogama's boat, and Shiogama's gossip.", 1273),
  boat_kibi: boatman("boat_kibi", "Boatman Kenta", "Ferries tea from Kibi, and people when there's room between the chests.", 1274),
  boat_hanazono: boatman("boat_hanazono", "Boatwoman Rin", "Ferries visitors to the blossom island and petals back on her hat.", 1275),
  boat_morishima: boatman("boat_morishima", "Boatman Yasu", "Ferries pilgrims to the fox shrine. Has a fox charm on every oar.", 1276),
  boat_iwaoka: boatman("boat_iwaoka", "Boatman Daigo", "Rows the monks to market. They don't talk, so he talks for everyone.", 1277),
  boat_josaki: boatman("boat_josaki", "Boatman Shin", "Ferries to Josaki, by the captain's order. Doesn't stay to wait.", 1278),
  boat_torojima: boatman("boat_torojima", "Ferrywoman Aki", "Ferries mourners to the Lantern Isle. Never charges a child.", 1279),
  boat_kusabana: boatman("boat_kusabana", "Boatman Toku", "Ferries herbs from Kusabana. Smells of mint, shiso and boat.", 1280),
  boat_ashigane: boatman("boat_ashigane", "Boatwoman Kiku", "The only boatwoman who'll go to Ashigane. Has a scar for each reason the others won't.", 1281),
  boat_smugglers_cove: boatman("boat_smugglers_cove", "A skiff-hand", "Rows a skiff with no name on it. Looks at you as if you're the one who should explain.", 1282),
  boat_three_stones: boatman("boat_three_stones", "Fisher Wataru", "Fishes round the Three Stones and takes the curious out in the afternoon.", 1283),
  boat_turtle_rock: boatman("boat_turtle_rock", "Fisher girl Mei", "Rows wishers out to Turtle Rock. Has wished on it herself, more than once.", 1284),
  boat_hakkotsu: boatman("boat_hakkotsu", "The ferryman without a name", "He was at the landing when you arrived. He was not at the landing before.", 1285),
};

const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const combat = (game: Game) => combatLevel(game.player);

export const MIZUKAI_QUESTS: readonly QuestDef[] = [
  {
    id: "landfall", name: "Landfall at Kurohama", points: 1, difficulty: "Novice", start: "Talk to Harbourmaster Isamu Kaneda at the harbour office in Kurohama, on Hinode.",
    requirements: [], rewards: ["1 Quest Point", "1,500 coins", "2,000 Presence XP", "Boats to Kibi, Hanazono, Morishima, Iwaoka, Kusabana and Torojima"],
    journal: game => {
      const s = stage(game, "landfall");
      if (s === 0) return ["Everyone who comes to the Isles from the mainland is presented at the Hall of Takamori. Harbourmaster Kaneda in Kurohama arranges it."];
      if (s === 1) return ["The harbourmaster has written me a letter for the Hall of Takamori. Lady Suzu receives guests.", mark(data(game, "ld_suzu") > 0, "Present the letter to Lady Suzu in the Hall of Takamori"), mark(data(game, "ld_prayed") > 0, "Pay your respects at the altar of Kumoyama, up the Thousand Steps"), "• Then back to the harbourmaster"];
      return ["I've been presented at the Hall of Takamori and paid my respects at Kumoyama. The harbourmaster has given me the charts: the islands are open to me. QUEST COMPLETE!"];
    },
  },
  {
    id: "rope_and_brush", name: "The Rope and the Brush", points: 3, difficulty: "Intermediate", start: "Talk to Head Priestess Mitsu at Kumoyama, after Landfall at Kurohama.",
    requirements: ["Landfall at Kurohama", "Faith 20 and Magic 20 recommended"], rewards: ["3 Quest Points", "3,000 Faith XP", "3,000 Magic XP", "The Mizukai tradition: Mizukai Magic and Faith, kept from your spellbook or prayers anywhere", "A shrine robe"],
    journal: game => {
      const s = stage(game, "rope_and_brush"), p = game.player;
      if (s === 0) return ["Head Priestess Mitsu says the shrine's rope is old and the Isles' spirits are restless. She and the Bureau of Seals keep the Isles' faith and magic between them."];
      if (s === 1) return ["The sacred rope must be renewed: rice straw from Tanabe for the rope, and a binding seal from the Bureau of Seals to tie into it.", mark(has(p, "rice_straw"), "Rice straw, from Headman Sakuji in Tanabe"), mark(has(p, "binding_seal"), "A binding seal, from Sealwright Ren in Kurohama"), "• Bring both to the Head Priestess"];
      if (s === 2) return ["The rope is tied. Now ring the bell at four shrines, so the Isles' Friends know the new rope is theirs:", mark(data(game, "rb_kumo") > 0, "Kumoyama, on Mount Kumo"), mark(data(game, "rb_harbour") > 0, "The Harbour Shrine in Kurohama"), mark(data(game, "rb_fox") > 0, "The fox shrine on Morishima"), mark(data(game, "rb_iwaoka") > 0, "The Hall of Silence on Iwaoka"), "• Then back to the Head Priestess"];
      return ["The rope is new and the four shrines have rung. The priestess and the sealwright taught me the Mizukai way: I can keep it from my spellbook or my prayers, anywhere, and set it down again. QUEST COMPLETE!"];
    },
  },
  {
    id: "drowned_paddies", name: "The Drowned Paddies", points: 1, difficulty: "Novice", start: "Talk to Headman Sakuji in Tanabe, on Hinode's southern terraces.",
    requirements: ["Combat 18 recommended"], rewards: ["1 Quest Point", "1,200 Cooking XP", "800 coins", "10 rice balls", "A straw kasa"],
    journal: game => {
      const s = stage(game, "drowned_paddies");
      if (s === 0) return ["The river imps are stealing Tanabe's rice, and the headman is losing count."];
      if (s === 1) return ["Imps in the ditches: put four of them down, and bring three cucumbers to leave on the bunds for the rest (they love cucumbers more than rice).", mark(data(game, "dp_imps") >= 4, `River imps put down: ${Math.min(4, data(game, "dp_imps"))}/4`), mark(count(game.player, "cucumber") >= 3, "Three cucumbers (Okiku's General Store in Kurohama sells them)")];
      return ["The imps have their cucumbers and Tanabe has its rice. The headman says they bowed to him this morning. QUEST COMPLETE!"];
    },
  },
  {
    id: "bath_house_pass", name: "The Bath-House Pass", points: 1, difficulty: "Novice", start: "Talk to Okami Fumi at the Steaming Moon in Yumoto Springs.",
    requirements: [], rewards: ["1 Quest Point", "1,500 Wayfaring XP", "A long soak: rested for a while (more XP)", "500 coins"],
    journal: game => {
      const s = stage(game, "bath_house_pass");
      if (s === 0) return ["Something's wrong at the Steaming Moon in Yumoto. The monkeys look pleased with themselves."];
      if (s === 1) return ["A snow monkey has stolen the Steaming Moon's bath-house pass. One of them has it. Find out which.", mark(has(game.player, "monkey_pass"), "The bath-house pass")];
      return ["I got the pass back from the monkeys, and Okami Fumi let me soak. I feel rested enough to learn anything. QUEST COMPLETE!"];
    },
  },
  {
    id: "first_flush", name: "First Flush", points: 1, difficulty: "Novice", start: "Talk to Tea-master Hanae at the Chaya of Kibi.",
    requirements: ["Landfall at Kurohama"], rewards: ["1 Quest Point", "1,500 Apothecary XP", "5 green teas", "Kibi's tea bushes picked by you on the house"],
    journal: game => {
      const s = stage(game, "first_flush");
      if (s === 0) return ["The first tea of the year goes to the Hall of Takamori. Kibi's tea-master is short of pickers."];
      if (s === 1) return ["Tea-master Hanae needs ten tea leaves picked from Kibi's bushes (raw, straight from the bush).", mark(count(game.player, "tea_leaf") >= 10, `Tea leaves: ${Math.min(10, count(game.player, "tea_leaf"))}/10`)];
      if (s === 2) return ["Hanae rolled and fired the leaves and sealed them in a cedar tin. Deliver the first flush to Lady Suzu in the Hall of Takamori.", mark(has(game.player, "tea_tin"), "The first-flush tin")];
      return ["The first flush reached the Hall. Lady Suzu sent back a cup and a note: 'Bitter at first, then not.' Hanae says that's the highest praise there is. QUEST COMPLETE!"];
    },
  },
  {
    id: "last_blossom", name: "The Last Blossom", points: 2, difficulty: "Intermediate", start: "Talk to the poet Yugiri at the Poet's Villa on Hanazono.",
    requirements: ["Woodcutting 40 recommended", "Combat 36 recommended"], rewards: ["2 Quest Points", "3,000 Presence XP", "1,500 Craftwork XP", "The last blossom poem"],
    journal: game => {
      const s = stage(game, "last_blossom"), p = game.player;
      if (s === 0) return ["A poet on Hanazono has been finishing one poem for eleven years."];
      if (s === 1) return ["Yugiri can't find the poem's last line. He wants a blossom log to burn under the ink, a foxfire for light, and to know what three people of the Isles would say about endings.",
        mark(has(p, "blossom_logs"), "A blossom log (blossom trees, Woodcutting 40)"), mark(has(p, "fox_fire"), "A foxfire (from a foxfire vixen)"),
        mark(data(game, "lb_keeper") > 0, "Ask the Lantern Keeper on Torojima"), mark(data(game, "lb_abbot") > 0, "Ask Abbot Jikai on Iwaoka"), mark(data(game, "lb_teacher") > 0, "Ask the Quiet Teacher in the Whispering Bamboo")];
      return ["Yugiri finished his poem. Three lines, after eleven years. He gave me a copy and asked me never to read it aloud on Hanazono, because the trees would hear it. QUEST COMPLETE!"];
    },
  },
  {
    id: "thousand_gates", name: "A Thousand Gates", points: 2, difficulty: "Intermediate", start: "Talk to Shrine maiden Kon at the fox shrine on Morishima.",
    requirements: ["Combat 36 recommended"], rewards: ["2 Quest Points", "A fox charm", "2,500 Faith XP", "1,500 Magic XP"],
    journal: game => {
      const s = stage(game, "thousand_gates");
      if (s === 0) return ["The foxes of Morishima test the pilgrims who walk their gates. One of them lost something."];
      if (s === 1) return ["Kon says the vixens in the wood are testing visitors too hard. Put five of them down, gently, and bring back the key one of them dropped.", mark(data(game, "tg_vixens") >= 5, `Foxfire vixens: ${Math.min(5, data(game, "tg_vixens"))}/5`), mark(has(game.player, "fox_key"), "The fox's key")];
      return ["I walked the gates, passed the foxes' test, and gave back the key. Kon says the shrine's foxes will know me now. QUEST COMPLETE!"];
    },
  },
  {
    id: "silent_climb", name: "The Silent Climb", points: 2, difficulty: "Intermediate", start: "Talk to Abbot Jikai in the Hall of Silence on Iwaoka.",
    requirements: ["Wayfaring 30 recommended", "Combat 44 recommended"], rewards: ["2 Quest Points", "4,000 Wayfaring XP", "1,500 Faith XP", "Iwaoka's blessing: +5% Wayfaring XP"],
    journal: game => {
      const s = stage(game, "silent_climb");
      if (s === 0) return ["The monks of Iwaoka climb their mountain in silence. The abbot will say what that means, perhaps."];
      if (s === 1) return ["Climb to the top of Iwaoka and touch the summit stone. The crow-masked hermits on the slopes mock climbers into speaking: silence three of them.", mark(data(game, "sc_summit") > 0, "Reach Iwaoka's summit stone"), mark(data(game, "sc_crows") >= 3, `Crow-masked hermits silenced: ${Math.min(3, data(game, "sc_crows"))}/3`)];
      return ["I climbed Iwaoka and said nothing. The abbot said one word to me when I came down. I won't write it here. QUEST COMPLETE!"];
    },
  },
  {
    id: "lanterns_drowned", name: "Lanterns for the Drowned", points: 3, difficulty: "Experienced", start: "Talk to Old Mother Hotaru, the Lantern Keeper, on Torojima.",
    requirements: ["Landfall at Kurohama", "Combat 30 recommended"], rewards: ["3 Quest Points", "6,000 Faith XP", "2,000 coins", "The Lantern Keeper's trust"],
    journal: game => {
      const s = stage(game, "lanterns_drowned");
      if (s === 0) return ["The lanterns on Torojima are going out, one a night, and the Keeper can't relight them fast enough."];
      if (s === 1) return ["The lantern-wights are the lanterns that went out and got up. Put eight of them to rest, and bring three foxfires: a cold flame that never burns down, to relight the great lantern.", mark(data(game, "ld_wights") >= 8, `Lantern-wights put to rest: ${Math.min(8, data(game, "ld_wights"))}/8`), mark(count(game.player, "fox_fire") >= 3, `Foxfires: ${Math.min(3, count(game.player, "fox_fire"))}/3`)];
      return ["The great lantern of Torojima burns with foxfire now, and the wights are quiet. The Keeper says the drowned are still not resting; something on Hakkotsu holds them. QUEST COMPLETE!"];
    },
  },
  {
    id: "josaki_truce", name: "The Broken Treaty", points: 3, difficulty: "Experienced", start: "Talk to Captain Hayato Ise in the Hall of Takamori, with a combat level of 60 or so.",
    requirements: ["Landfall at Kurohama", "Combat 60 recommended"], rewards: ["3 Quest Points", "The Takamori katana", "8,000 Attack XP", "3,000 Presence XP", "The Josaki dead at peace with you"],
    journal: game => {
      const s = stage(game, "josaki_truce");
      if (s === 0) return ["Josaki, the island east of Hinode, has been closed by the lord's order for twenty years. Captain Ise wants it opened."];
      if (s === 1) return ["Captain Ise has given me passage to Josaki. Its ronin and its dead still hold the ruined fortress for a clan that fell twenty years ago. Lady Suzu asked me quietly to bring back anything written.",
        mark(data(game, "jt_ronin") >= 6, `Josaki ronin defeated: ${Math.min(6, data(game, "jt_ronin"))}/6`), mark(has(game.player, "josaki_treaty") || data(game, "jt_lord") > 0, "Face the Shade of Lord Josaki"), "• Bring whatever he held to Lady Suzu"];
      return ["The treaty said Takamori broke the peace first. Lady Suzu read it aloud in the Hall, all of it. The lord did not stop her. The Josaki dead keep the peace with me now; the Hall gave me the clan's own sword. QUEST COMPLETE!"];
    },
  },
  {
    id: "red_ogre", name: "The Red Ogre of Ashigane", points: 3, difficulty: "Experienced", start: "Talk to Captain Hayato Ise in the Hall of Takamori, after The Broken Treaty.",
    requirements: ["The Broken Treaty", "Combat 75 recommended"], rewards: ["3 Quest Points", "The Takamori sashimono", "6,000 Smithing XP", "6,000 Strength XP", "Iron sand from the reopened mine at the Ironsand Forge"],
    journal: game => {
      const s = stage(game, "red_ogre");
      if (s === 0) return ["Ashigane's copper mine has been in the ogres' hands for a generation. Captain Ise pays a bounty on horns."];
      if (s === 1) return ["Boatwoman Kiku will take me to Ashigane. Bring the captain five ogre horns, and go down the mine shaft for the Red Ogre himself.", mark(count(game.player, "ogre_horn") >= 5, `Ogre horns: ${Math.min(5, count(game.player, "ogre_horn"))}/5`), mark(data(game, "ro_red") > 0, "Akagane, the Red Ogre, defeated (behind the red iron door in the Deeps)")];
      return ["Akagane is down and the Ashigane mine is Takamori's again. The captain gave me his own banner. QUEST COMPLETE!"];
    },
  },
  {
    id: "smugglers_cove", name: "The Cove That Isn't There", points: 2, difficulty: "Intermediate", start: "Talk to Magistrate Sugimura at the Magistrate's Office in Kurohama.",
    requirements: ["Stealth 30 recommended", "Combat 30 recommended"], rewards: ["2 Quest Points", "3,000 Stealth XP", "Your choice of the magistrate's reward or the cove's"],
    journal: game => {
      const s = stage(game, "smugglers_cove");
      if (s === 0) return ["The magistrate has a petition about a cove that isn't on the charts. He'd like it to be either on them, or nobody's business."];
      if (s === 1) return ["Find the cove. Dockhand Jiro listens to the night boats. Then get the smugglers' ledger out of their strongbox and bring it to the magistrate.", mark(data(game, "cv_jiro") > 0, "Ask Dockhand Jiro about the night boats"), mark(has(game.player, "smugglers_ledger"), "The smugglers' ledger")];
      return [data(game, "cv_choice") === 2 ? "I told the magistrate the ledger was lost at sea, and gave it back to Kuze. The cove's shop is open to me, and Kuze owes me a favour. The magistrate looked at me a long time. QUEST COMPLETE!" : "I gave the ledger to the magistrate. The name on its last page was his own clerk's. He thanked me, and closed the door, and I heard him sit down very slowly. QUEST COMPLETE!"];
    },
  },
  {
    id: "mountain_kept", name: "What the Mountain Kept", points: 3, difficulty: "Experienced", start: "Talk to Head Priestess Mitsu at Kumoyama, after The Rope and the Brush.",
    requirements: ["The Rope and the Brush", "Combat 65 recommended"], rewards: ["3 Quest Points", "A shrine wand", "8,000 Faith XP", "4,000 Magic XP"],
    journal: game => {
      const s = stage(game, "mountain_kept");
      if (s === 0) return ["The priestess has been listening to the mountain since the new rope was tied. She doesn't like what it's saying."];
      if (s === 1) return ["Under Mount Kumo is the Hollow, where the Isles' oldest spirits were sealed. The seals are failing. Go down by the mouth above the shrine and face the Seal-Breaker behind the last door (a Kumo seal-key opens it).", mark(data(game, "mk_breaker") > 0, "The Seal-Breaker defeated")];
      return ["The Seal-Breaker is unmade and the Hollow's seals are written fresh. The priestess says the mountain is sleeping properly for the first time in her life. QUEST COMPLETE!"];
    },
  },
  {
    id: "sea_gave_back", name: "What the Sea Gave Back", points: 4, difficulty: "Master", start: "Talk to Old Mother Hotaru on Torojima, after Lanterns for the Drowned and The Broken Treaty.",
    requirements: ["Lanterns for the Drowned", "The Broken Treaty", "Combat 90 recommended"], rewards: ["4 Quest Points", "20,000 coins", "15,000 Faith XP", "5,000 Presence XP", "The title 'Who the Sea Gave Back'"],
    journal: game => {
      const s = stage(game, "sea_gave_back");
      if (s === 0) return ["The Lantern Keeper knows what holds the drowned, and she will not say it until she trusts you, and the Hall, both."];
      if (s === 1) return ["On Hakkotsu, the white island, a shrine of bones was built over something hungry: the Starving Colossus, made of everyone the sea took and nobody mourned. Go down under the Bone Gate, through the ribbed door (a rib key opens it), and bring back what it holds.", mark(has(game.player, "colossus_heart") || data(game, "sg_colossus") > 0, "The Starving Colossus laid down"), "• Bring its offering to the Lantern Keeper"];
      return ["The Keeper read every name from the Colossus's bundle aloud, and lit a lantern for each. It took all night. In the morning the sea was calm all the way to the mainland. QUEST COMPLETE!"];
    },
  },
  {
    id: "nets_and_knots", name: "Nets and Knots", points: 1, difficulty: "Novice", start: "Talk to Net-mender Oyone on Shiogama.",
    requirements: [], rewards: ["1 Quest Point", "2,000 Fishing XP", "1,000 Craftwork XP", "The way to Turtle Rock and the Three Stones"],
    journal: game => {
      const s = stage(game, "nets_and_knots");
      if (s === 0) return ["Shiogama's net-mender is behind on her mending and short on twine."];
      if (s === 1) return ["Oyone needs five raw carp to pay the twine-seller and three balls of string to mend with.", mark(count(game.player, "raw_carp") >= 5, `Raw carp: ${Math.min(5, count(game.player, "raw_carp"))}/5`), mark(count(game.player, "string") >= 3, `String: ${Math.min(3, count(game.player, "string"))}/3`)];
      return ["The nets are mended, and Oyone showed me the old fishers' marks: the way to Turtle Rock's wish shrine and the Three Stones. QUEST COMPLETE!"];
    },
  },
  {
    id: "footsteps_bamboo", name: "Footsteps in the Bamboo", points: 1, difficulty: "Intermediate", start: "Talk to the Quiet Teacher in the tea hut in the Whispering Bamboo.",
    requirements: ["Stealth 30"], rewards: ["1 Quest Point", "3,000 Stealth XP", "A Mistwalker's hood"],
    journal: game => {
      const s = stage(game, "footsteps_bamboo");
      if (s === 0) return ["Someone in the bamboo teaches people to be unnoticed. You'd only find them if they let you."];
      if (s === 1) return ["The Quiet Teacher wants proof of light hands: lift five purses from the people of the Isles without being caught.", mark(data(game, "fb_picks") >= 5, `Purses lifted: ${Math.min(5, data(game, "fb_picks"))}/5`)];
      return ["The Teacher poured me tea, which I'm told is the highest honour, and gave me a Mistwalker's hood, which is the useful one. QUEST COMPLETE!"];
    },
  },
];

/** What the people of the Isles say, and the quests they give. Null for anyone who isn't Mizukai. */
export function talkMizukai(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player;
  if (npcId.startsWith("boat_")) return chat(name, npcSays(name, BOAT_LINES[npcId] ?? "Where to?", "Show me where you want to go, and I'll tell you the fare. You pay when you board, not before."), [
    { label: "Where can you take me?", then: () => { game.ui.boat = npcId.slice(5); return null; } },
    { label: "Not today.", then: () => null },
  ]);
  switch (npcId) {
    // ---------- Kurohama ----------
    case "kuro_harbourmaster": {
      const s = stage(game, "landfall");
      if (s === 0) return chat(name, npcSays(name, "Off the mainland boat? Welcome to Kurohama, and to Hinode, and to the Isles. Everyone who comes ashore is presented at the Hall of Takamori: it's courtesy, and it's the law, and it's the only way I'll give you the charts.", "I'll write you a letter for Lady Suzu at the Hall. The Harbour Road runs east to the castle. On the way back, climb the Thousand Steps to Kumoyama and pay your respects. The mountain likes to know who's on its island."), [
        { label: "I'll go to the Hall.", then: () => chat(name, npcSays(name, "Good. Here. Don't fold it; she notices."), undefined, () => { player.quests.landfall = 1; giveOrDrop(game, "harbour_letter"); say(game, "Quest started: Landfall at Kurohama."); }) },
        { label: "What are the Isles?", then: () => chat(name, npcSays(name, "Hinode, where you're standing: the Isle of Sunrise, the biggest, with the castle and the mountain. Then the rest, all round: Shiogama's fishers, Kibi's tea, Hanazono's blossom, the fox shrine on Morishima, the monks on Iwaoka, Torojima's lanterns, and some I'd rather not name to a visitor.", "We see the sun first, here. Your mainland gets it second-hand.")) },
        { label: "Not yet.", then: () => null },
      ]);
      if (s === 1) {
        if (data(game, "ld_suzu") && data(game, "ld_prayed")) return chat(name, npcSays(name, "Presented and paid your respects. Then you're one of the Isles' guests, and the Isles look after their guests. Here: the charts, and something for your trouble.", "Every boat at every landing will take you now, Kibi, Hanazono, Morishima, Iwaoka, Kusabana, Torojima, for a fair fare. Mind the ones that don't run: there's usually a reason, and it's usually the captain."), undefined, () => {
          giveOrDrop(game, "coins", 1500); addXp(game, "presence", 2000, { raw: true }); completeQuest(game, "landfall");
        });
        return chat(name, npcSays(name, "The Hall of Takamori first: Lady Suzu. Then the Thousand Steps to Kumoyama. Then back here."));
      }
      return chat(name, npcSays(name, pick(game, ["Boats every day to every island that wants visitors. The pilot on the pier sells the passage.", "The black sand is iron. The smith pays children a coin a bucket for it, and they're richer than I am.", "There's a patch on my chart west of Ashigane that I've never inked in. Every harbourmaster before me left it blank too.", "Your mainland's ferry comes in at Eastport. That's what you call it, anyway. We call it 'the mainland pier', and don't think about it."])), [
        { label: "Anywhere else worth sailing?", then: () => { flag(game, "dock_three_stones"); flag(game, "dock_turtle_rock"); return chat(name, npcSays(name, "Turtle Rock, if you've a wish; the fishers row out to it from Shiogama. And the Three Stones, south of Kibi: an old watch-post, nobody remembers what for. Fisher Wataru will take you. Those two are on the charts now, for you.")); } },
        { label: "Goodbye.", then: () => null },
      ]);
    }
    case "kuro_sealwright": {
      if (stage(game, "rope_and_brush") === 1 && !has(player, "binding_seal")) {
        if (count(player, "paper_seal") >= 10) return chat(name, npcSays(name, "Ten seals back. Good: half the parasols in Hinode are seals somebody wrote badly and threw away. I'll use the paper. Hold still.", "There. A binding seal, for the shrine's rope. Don't read it. It doesn't like being read by people it isn't about."), undefined, () => { take(player, "paper_seal", 10); giveOrDrop(game, "binding_seal"); say(game, "Sealwright Ren writes you a binding seal."); });
        return chat(name, npcSays(name, "The priestess wants a binding seal. Of course she does. I'll write one, but the Bureau's out of good paper: bring me ten paper seals (the hopping parasols are made of them, the poor things, or Okiku sells them) and I'll use those."));
      }
      if (stage(game, "rope_and_brush") >= 3) return chat(name, npcSays(name, pick(game, ["You keep the Mizukai way now: your spellbook is seals and bindings. Bring me spirit seals for the stronger ones.", "A seal is a promise written down. Magic is just making the world keep it.", "If a spell goes wrong, it was the brush. It's always the brush."])));
      return chat(name, npcSays(name, pick(game, ["The Bureau of Seals. We write the Isles' magic: seals, bindings, wards. The mainland shouts its spells, I hear. We write ours down.", "Paper seals for the small work, spirit seals for the large. I sell both.", "The priestess and I keep the Isles' faith and magic between us. She'd say she keeps both and I keep the paperwork."])));
    }
    case "kuro_magistrate": {
      const s = stage(game, "smugglers_cove");
      if (s === 0) {
        if (combat(game) < 25) return chat(name, npcSays(name, "Petitions, petitions. Come back when you look like someone who could deal with one."));
        return chat(name, npcSays(name, "A petition from three fishers' widows: boats coming in at night, to a cove that isn't on the charts. The harbourmaster says there's no such cove. The harbourmaster's chart has a blank patch.", "Find it, if it's there. If someone's running things past the harbour, they keep a ledger; they always do. Bring me the ledger."), [
          { label: "I'll find the cove.", then: () => chat(name, npcSays(name, "Talk to the dockhand, Jiro. He listens to boats."), undefined, () => { player.quests.smugglers_cove = 1; say(game, "Quest started: The Cove That Isn't There."); }) },
          { label: "Not my business.", then: () => null },
        ]);
      }
      if (s === 1 && has(player, "smugglers_ledger")) return chat(name, npcSays(name, "That's it? That's the ledger? Give it here. Let me see whose name is on the last page."), [
        { label: "Hand it over.", then: () => chat(name, npcSays(name, "…My own clerk. Twenty years at that desk.", "Thank you. Here: the court's reward, and the court's thanks, which are worth less and cost me more."), undefined, () => {
          take(player, "smugglers_ledger", 1); player.questData.cv_choice = 1; giveOrDrop(game, "coins", 6000); addXp(game, "thieving", 3000, { raw: true }); addXp(game, "presence", 2000, { raw: true }); completeQuest(game, "smugglers_cove");
        }) },
        { label: "Say it was lost at sea.", then: () => chat(name, npcSays(name, "Lost. At sea. With you standing there dry.", "…Very well. The court notes it. Go away."), undefined, () => {
          take(player, "smugglers_ledger", 1); player.questData.cv_choice = 2; addXp(game, "thieving", 5000, { raw: true }); completeQuest(game, "smugglers_cove"); message(game, "You'll take the ledger back to Kuze in the cove. The cove's shop will be open to you.", "quest");
        }) },
      ]);
      if (s === 1) return chat(name, npcSays(name, "The cove, the ledger. The dockhand knows the boats."));
      return chat(name, npcSays(name, pick(game, ["The harbour court sits at the hour of the dragon. I sit earlier. Somebody has to read the petitions.", "Most of the Isles' crimes are about water: who has it, who took it, whose boat was in it.", "The lord's law is simple. It's people that are complicated."])));
    }
    case "kuro_dockhand": {
      if (stage(game, "smugglers_cove") === 1 && !data(game, "cv_jiro")) return chat(name, npcSays(name, "Night boats? …You're asking for the magistrate. All right. West, past Ashigane's shadow, there's an island like a ring with the sea inside it. Boats go in there without lamps.", "The skiff-hands will row you, if you don't look like the magistrate. Tell the harbour pilot 'the cove' and she'll pretend not to hear and put you on the right boat."), undefined, () => { flag(game, "cv_jiro"); say(game, "The cove's on your charts now: Smugglers' Cove."); });
      return chat(name, npcSays(name, pick(game, ["Crates off, crates on. The sea doesn't care what's in them, and neither do I, mostly.", "If you want work, the fish market always needs hands. If you want trouble, wait till dark.", "Ships from your mainland bring wheat and iron. We send back tea, silk and swords. Seems fair."])));
    }
    case "kuro_smith": return chat(name, npcSays(name, pick(game, [
      "Tamahagane: iron sand from the beach, charcoal from the cedars, three days and nights at the furnace, and then the folding. Four sand and two inkcoal for a bloom, if you're doing it yourself (Smithing 60).",
      "A katana's not a sword you swing. It's a sword you draw. The cut is the drawing. Sensei Kaede will tell you the same, louder.",
      questDone(game, "red_ogre") ? "The Ashigane mine's open again, thanks to you. I sell the iron sand now, and I sell it cheap to the one who opened it." : "The best iron sand is on Ashigane, under the ogres. One day somebody will do something about the ogres.",
      "Bring tamahagane to an anvil with a hammer and you can forge your own: katana, nodachi, tanto, the polearms, even a samurai's harness, if your Smithing's good enough.",
    ])));
    case "kuro_innkeeper": return chat(name, npcSays(name, pick(game, ["The Sleeping Crane: rice, soup, eel, tea, rice wine, and a mat for the night. The cranes are painted on the screens; the real ones don't sleep here.", "Everyone from the mainland asks for bread. We have bread. It's made of rice.", "Mind the rice wine. It's warm and it's small and that's how it gets you."])));
    case "kuro_fishmonger": return chat(name, npcSays(name, pick(game, ["Eel's best grilled. Everything's best grilled. Except what's best raw.", "The sea monks off the north cape ate a whole boat last spring. Didn't even spit out the oars.", "Fish from Shiogama, fish from Isohama, fish from wherever the sea's in a good mood."])));
    case "kuro_merchant": return chat(name, npcSays(name, pick(game, ["Rice, soup, cucumbers, hats, nets, everything a traveller forgets, and paper seals, if you're learning.", "Cucumbers sell well in Tanabe. Not to the farmers.", "Mainland coins are good here. So are mainland manners, when people remember them."])));
    case "kuro_clothier": return chat(name, npcSays(name, pick(game, ["Indigo for the street, white for the shrine, black for the castle, and never wrap your kimono left over right unless someone's died.", "A haori with a crane on the back. For visiting. Everyone visits eventually.", "Straw sandals and split-toed socks. You'll walk quieter, I promise."])));
    case "kuro_apothecary": return chat(name, npcSays(name, pick(game, ["Tea leaf for faith, shiso for poison, moon mugwort for spirits, Kumo root for the long rites, and spirit bell for the things I won't brew myself.", "Mugwort smoke keeps the wayward ones off. Burn it in a vial and breathe it: five minutes of peace. Spirit incense, I call it. You can call it what you like.", "Kusabana has the best herbs. Midori grows them. She doesn't like visitors, but she likes people who bring her news."])));
    case "mizukai_villager": return chat(name, npcSays(name, pick(game, ["Good day. You're from the mainland? It shows, in a good way. Mostly.", "The castle's up the Harbour Road; the shrine's up the Thousand Steps from the castle. Everyone gets lost the first time and blames the steps.", "If a parasol hops at you, it's lonely, not dangerous. Mostly.", "The lord is young. The lord's sister is not. That's why things work.", "Josaki? We don't talk about Josaki. My grandmother did, once, and then she went quiet for a week.", "The sun comes up over the sea out there, every morning, first in the world. It's why the Isles are called what they're called, whatever your mainland calls them."])));
    case "mizukai_guard": return chat(name, npcSays(name, pick(game, ["Harbour Road. Takamori's that way. Keep your sword sheathed and your voice down.", "The lord's foot soldiers. We hold the roads, the samurai hold the castle, and the captain holds us.", "Ogres on Ashigane, ghosts on Josaki, smugglers somewhere, and I get the harbour. I'm not complaining. I'm explaining."])));
    // ---------- The Hall of Takamori ----------
    case "lady_suzu": {
      if (stage(game, "landfall") === 1 && !data(game, "ld_suzu")) {
        if (!has(player, "harbour_letter")) return chat(name, npcSays(name, "The harbourmaster sends guests with a letter. You seem to have mislaid it. He'll write another; he enjoys it."));
        return chat(name, npcSays(name, "A guest from the mainland, presented properly. Thank you. The Hall of Takamori receives you; my brother would say so himself if he were not busy being lord.", "Before you go back to the harbour: climb to Kumoyama and pay your respects at the altar. The mountain doesn't care about letters, but it does care about manners."), undefined, () => { take(player, "harbour_letter", 1); flag(game, "ld_suzu"); say(game, "You've been presented at the Hall of Takamori. Now to Kumoyama."); });
      }
      if (stage(game, "first_flush") === 2 && has(player, "tea_tin")) return chat(name, npcSays(name, "The first flush from Kibi. Hanae sent you? Then it will be good. Let me taste it now, while you're here to see me make a face.", "…Bitter at first. Then not. Tell her that. She'll know."), undefined, () => {
        take(player, "tea_tin", 1); for (let i = 0; i < 5; i++) giveOrDrop(game, "green_tea"); addXp(game, "apothecary", 1500, { raw: true }); completeQuest(game, "first_flush");
      });
      if (stage(game, "josaki_truce") === 1 && has(player, "josaki_treaty")) return chat(name, npcSays(name, "Two copies. Both signed. One burnt at the edge, as if someone tried and stopped. Read me the third article.", "'…and the lord of Takamori shall withdraw his ships first.' He didn't. Our father didn't. Josaki kept the treaty and was burned for it, and we've closed the island ever since so nobody could go and look.", "I'm going to read this aloud in the Hall. All of it. My brother may stop me. I don't think he will.", "Take the clan's sword: Takamori owes you that, and more it can't pay. The Josaki dead will know what you did. They're tired of waiting, too."), undefined, () => {
        take(player, "josaki_treaty", 1); giveOrDrop(game, "takamori_katana"); addXp(game, "attack", 8000, { raw: true }); addXp(game, "presence", 3000, { raw: true }); completeQuest(game, "josaki_truce");
      });
      if (stage(game, "josaki_truce") === 1) return chat(name, npcSays(name, "When you go to Josaki: the captain wants it cleared. I want to know why it was closed. If you find anything written, bring it to me, not him."));
      return chat(name, npcSays(name, pick(game, ["My brother rules Hinode. I rule his correspondence. It's very nearly the same thing.", "The Hall receives petitioners from the hour of the snake. Before that, it receives tea.", "Josaki was our neighbour. Then it was our enemy. Then it was nothing at all, by order. I was eight. I remember the smoke.", "Our mother kept the Mizukai way at the shrine, and our father kept it at the Bureau. My brother keeps neither and worries about both."])));
    }
    case "lord_takamori": {
      if (questDone(game, "josaki_truce")) return chat(name, npcSays(name, pick(game, ["My sister read the treaty aloud. I let her. I should have read it myself, years ago. I didn't want to know what my father did.", "Josaki is open. Its dead are quiet. I'm told I should be relieved. I'm told a great many things.", "You have the clan's sword. Carry it better than we did."])));
      return chat(name, npcSays(name, pick(game, ["Takamori has held Hinode for eleven generations. I've held it for three years. The eleven are better at it.", "The mainland sends envoys, the islands send petitions, the spirits send trouble. The Hall answers all three. Mostly my sister does.", "The captain wants Josaki opened. My sister wants it understood. I want it to stop being my problem, which I understand is not an answer a lord gives."])));
    }
    case "takamori_captain": {
      const treaty = stage(game, "josaki_truce"), ogre = stage(game, "red_ogre");
      if (treaty === 0) {
        if (!questDone(game, "landfall")) return chat(name, npcSays(name, "Guests are presented at the Hall before the captain talks to them. Lady Suzu, then me."));
        if (combat(game) < 55) return chat(name, npcSays(name, "Bounties on the board: ogre horns, mostly. Come back when you're the sort who collects them (combat 60, say)."));
        return chat(name, npcSays(name, "Josaki. The island east of us, closed by the old lord's order the year their castle burned. Its ronin still hold it, and its dead walk the walls, and every year a fisher who goes too close doesn't come home.", "I want it opened. The lord wants it forgotten. I'll take someone who isn't a samurai and doesn't care what the lord wants. Boatman Shin will row you, on my word."), [
          { label: "I'll go to Josaki.", then: () => chat(name, npcSays(name, "Six ronin, and whatever commands them. Then come back and tell me it's done."), undefined, () => { player.quests.josaki_truce = 1; say(game, "Quest started: The Broken Treaty. Josaki is on your charts now."); }) },
          { label: "Not yet.", then: () => null },
        ]);
      }
      if (treaty === 1) return chat(name, npcSays(name, data(game, "jt_lord") ? "Lord Josaki's shade, laid down? Then Josaki's done. Lady Suzu wanted to see you. She usually does." : "Josaki. Six ronin and their lord. Boatman Shin rows from Kurohama."));
      if (ogre === 0) return chat(name, npcSays(name, "Josaki's quiet. Good. Now, Ashigane: the copper mine, ogres in it since my grandfather's time, and the Red Ogre under it all, Akagane, who hates this clan for something nobody remembers.", "Five horns for the board, and the Red Ogre for me. Boatwoman Kiku will take you, she's the only one who will."), [
        { label: "I'll go to Ashigane.", then: () => chat(name, npcSays(name, "Down the mine shaft, through the smelting hall. His door's red iron; his ogres carry the key."), undefined, () => { player.quests.red_ogre = 1; say(game, "Quest started: The Red Ogre of Ashigane. Ashigane is on your charts now."); }) },
        { label: "Not yet.", then: () => null },
      ]);
      if (ogre === 1) {
        if (count(player, "ogre_horn") >= 5 && data(game, "ro_red")) return chat(name, npcSays(name, "Five horns, and Akagane down. The mine's ours again; the forge will have its iron sand.", "Take my banner. The crane of Takamori on your back: anyone on Hinode who sees it will know what you did, and the ones who don't will ask."), undefined, () => {
          take(player, "ogre_horn", 5); giveOrDrop(game, "takamori_banner"); addXp(game, "smithing", 6000, { raw: true }); addXp(game, "strength", 6000, { raw: true }); completeQuest(game, "red_ogre");
        });
        return chat(name, npcSays(name, "Five ogre horns and the Red Ogre. Kiku rows from Kurohama."));
      }
      return chat(name, npcSays(name, pick(game, ["The board pays for horns, still: ash ogres come back like weeds.", "Josaki and Ashigane in one season. My grandfather would have made you a retainer. I'm only allowed to make you tea.", "If you see the Nightcall Chimera in Kurokage, don't fight it alone. Don't fight it with friends, either. Just don't."])));
    }
    case "mizukai_samurai": return chat(name, npcSays(name, pick(game, ["The crane of Takamori. We serve the lord, and the lord's sister, and the captain, in an order that changes by the hour.", "A sword is drawn once. If you draw it twice, you weren't paying attention the first time.", "Josaki's samurai were the best swords in the Isles. Our grandfathers said so, after they'd killed them."])));
    case "takamori_sensei": return chat(name, npcSays(name, pick(game, ["The cut is the last part of the sword. Before it: the stance, the breath, the draw, the knowing. Most people practise the cut.", "A katana rewards speed; a nodachi rewards commitment; a naginata rewards distance. Pick the virtue you have, not the one you want.", "Strike the post. No: strike through the post. The post is not where you're aiming."])));
    case "takamori_teahouse": return chat(name, npcSays(name, pick(game, ["The Plum Teahouse. Tea, blossom cakes, rice wine for the samurai off duty. The plum tree died years ago; the name didn't.", "The lord takes his tea bitter. Lady Suzu takes hers stronger.", "Everyone in Takamori comes here eventually. That's how I know everything, and why I say nothing."])));
    case "takamori_armourer": return chat(name, npcSays(name, pick(game, ["Lacquered iron laced in silk. Light for what it stops. Takes an hour to lace and a lifetime to pay for.", "Ashigaru kit for the foot soldiers, samurai harness for the household. Josaki harness I don't sell: only the dead wear that, and the ones who took it off them."])));
    case "takamori_bowyer": return chat(name, npcSays(name, pick(game, ["The yumi is gripped a third of the way up, so it can be shot from a horse, or a boat, or a castle window. Mainlanders always hold it in the middle and look surprised.", "Bamboo and mulberry, laminated, glued with fish. Don't ask what fish."])));
    // ---------- Kumoyama ----------
    case "kumo_priestess": {
      const s = stage(game, "rope_and_brush");
      if (!questDone(game, "landfall")) return chat(name, npcSays(name, "Welcome to Kumoyama. Ring once, bow twice, clap twice, bow once. Have you been presented at the Hall? The mountain doesn't mind, but the Hall does."));
      if (s === 0) return chat(name, npcSays(name, "You paid your respects; the mountain noticed. It's restless. The rope round its heart is forty years old and the Isles' spirits are wandering out through the gaps: the parasols, the lanterns, worse.", "The Isles keep their faith and magic differently from your mainland: a rope and a brush. I keep the rope; the Bureau of Seals keeps the brush. Help me renew the rope and I'll teach you the Mizukai way. Bring rice straw from Tanabe for the rope, and a binding seal from Sealwright Ren for the knot."), [
        { label: "I'll help renew the rope.", then: () => chat(name, npcSays(name, "Headman Sakuji in Tanabe, and Ren in Kurohama. Go gently with Ren. She's very fast and very proud."), undefined, () => { player.quests.rope_and_brush = 1; say(game, "Quest started: The Rope and the Brush."); }) },
        { label: "What is the Mizukai way?", then: () => chat(name, npcSays(name, "Your mainland prays to the Old Friend and casts with sigils. We keep faith with the Thousand Friends: the Friend of each place, each spring, each mountain. Our prayers are vows and blessings; our magic is seals, written. Learn ours and you can keep it beside your own, and change between them as you please, anywhere: the mountain isn't jealous.")) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1) {
        if (has(player, "rice_straw") && has(player, "binding_seal")) return chat(name, npcSays(name, "Straw from Tanabe and Ren's seal. Hold this end. Twist left. Left. Your other left.", "There: the new rope, the seal in the knot. Now ring the bell at four shrines so the Isles' Friends know it's theirs: here, the Harbour Shrine in Kurohama, the fox shrine on Morishima, and the Hall of Silence on Iwaoka. Pray at each altar."), undefined, () => {
          take(player, "rice_straw", 1); take(player, "binding_seal", 1); player.quests.rope_and_brush = 2; say(game, "The new rope is tied. Pray at Kumoyama, the Harbour Shrine, Morishima's fox shrine and Iwaoka's Hall of Silence.");
        });
        return chat(name, npcSays(name, "Rice straw from Headman Sakuji in Tanabe; a binding seal from Sealwright Ren in Kurohama."));
      }
      if (s === 2) {
        if (data(game, "rb_kumo") && data(game, "rb_harbour") && data(game, "rb_fox") && data(game, "rb_iwaoka")) return chat(name, npcSays(name, "Four shrines rang. I heard the last one from here, which I didn't expect. The rope holds.", "Then here is the Mizukai way, as the shrine and the Bureau keep it together: vows and blessings for your Faith; seals, bindings and barriers for your Magic. Keep it from your spellbook or your prayers whenever you like, anywhere you are, and set it down whenever you like. The spells you learn are yours either way.", "Ren will teach you the seals as your Magic grows; I'll teach you the rites as your Faith does. Wear this. It suits you better than it suits the shrine's cupboard."), undefined, () => {
          giveOrDrop(game, "shrine_robe"); addXp(game, "prayer", 3000, { raw: true }); addXp(game, "magic", 3000, { raw: true }); completeQuest(game, "rope_and_brush");
          message(game, "The Mizukai way is open to you: keep it from the top of your spellbook or prayers, anywhere.", "quest");
        });
        return chat(name, npcSays(name, "Pray at the four altars: here, the Harbour Shrine, the fox shrine on Morishima, the Hall of Silence on Iwaoka."));
      }
      const mk = stage(game, "mountain_kept");
      if (mk === 0 && combat(game) >= 55) return chat(name, npcSays(name, "Since the rope was tied I've been listening to the mountain. Under it is the Hollow, where the oldest spirits were sealed when the shrine was young. Something down there has been reading the seals, and found a mistake.", "The mouth is above the pagoda, past the last gate. The seal-keys are paper; the lantern-wights and wraiths down there carry them. Go down and unmake whatever's breaking the seals."), [
        { label: "I'll go down into the Hollow.", then: () => chat(name, npcSays(name, "Take seals. Take more than you think."), undefined, () => { player.quests.mountain_kept = 1; say(game, "Quest started: What the Mountain Kept."); }) },
        { label: "Not yet.", then: () => null },
      ]);
      if (mk === 1) {
        if (data(game, "mk_breaker")) return chat(name, npcSays(name, "Unmade? Then the mountain will sleep. I'll write the seals fresh tonight; Ren will complain about the paper.", "Take this wand. It was my teacher's. Wave it over a thing, and it's clean."), undefined, () => { giveOrDrop(game, "shrine_wand"); addXp(game, "prayer", 8000, { raw: true }); addXp(game, "magic", 4000, { raw: true }); completeQuest(game, "mountain_kept"); });
        return chat(name, npcSays(name, "The Hollow's mouth is above the pagoda, past the last gate. The Seal-Breaker is behind the sealed door."));
      }
      return chat(name, npcSays(name, pick(game, ["Ring once, bow twice, clap twice, bow once. The order matters less than the meaning, but the meaning is easier with the order.", "The Thousand Friends: a Friend for the spring, for the mountain, for the harbour, for the tree. Your Old Friend is one of them, perhaps. He'd be welcome.", "Keep the Mizukai way when you like, set it down when you like. The vows and the seals don't mind which book they're in, as long as you keep your word."])));
    }
    case "kumo_attendant": return chat(name, npcSays(name, pick(game, ["Charms for safe crossings, good harvests, passing examinations. The paper charm softens a spirit's blow. Most people buy it for the crossings.", "Your fortune? Tie it to the tree if it's bad. Keep it if it's good. Most people tie them all, to be safe.", "Paper seals and spirit seals: the Mizukai rites spend them, like your mainland's sigils."])));
    case "kumo_shrine_maiden": return chat(name, npcSays(name, pick(game, ["The path's swept. It's always swept. The sweeping is the prayer.", "The pagoda has five roofs: earth, water, fire, wind, and the one nobody agrees on.", "Wash your hands at the spring. Left, then right, then rinse your mouth from your left hand. Don't drink from the ladle!"])));
    // ---------- Hinode's villages ----------
    case "tanabe_headman": {
      if (stage(game, "rope_and_brush") === 1 && !has(player, "rice_straw")) return chat(name, npcSays(name, "Straw for the shrine's rope? The priestess asked for Tanabe's straw? Ha! Forty years since she asked. Take the best of last year's, and tell her the imps didn't get it."), undefined, () => { giveOrDrop(game, "rice_straw"); say(game, "Headman Sakuji gives you a bundle of rice straw."); });
      return fetchQuest(game, name, "drowned_paddies", {
        offer: ["The river imps. In the ditches, in the paddies, in the rice store. They take a sack a night and leave puddles. If you bow, they bow back and spill their dishes, and then they're weak as kittens. Most people forget to bow.", "Put four of them down, and bring me three cucumbers. We'll leave them on the bunds. The imps love cucumbers more than rice. Everyone does, honestly."],
        accept: "Four imps, three cucumbers. Okiku sells cucumbers in Kurohama, for once she's useful to us.", progress: "Four imps down, three cucumbers. Bow first; it helps.",
        have: () => data(game, "dp_imps") >= 4 && count(player, "cucumber") >= 3, take: () => { take(player, "cucumber", 3); },
        done: ["Four down and cucumbers for the rest. They'll take the cucumbers and leave the rice, if they've any sense, and they have more sense than my son-in-law.", "Here: rice balls for the road, a hat for the sun, and Tanabe's thanks, which are mostly rice."],
        reward: () => { giveOrDrop(game, "rice_ball", 10); giveOrDrop(game, "straw_kasa"); giveOrDrop(game, "coins", 800); addXp(game, "cooking", 1200, { raw: true }); },
      });
    }
    case "tanabe_farmer": return chat(name, npcSays(name, pick(game, ["Plant in rows, flood the paddy, pray for sun, chase the imps. Every year.", "The terraces were cut by our great-great-grandparents. We just keep them.", "Rice for Takamori, rice for us, rice for the imps if we're careless."])));
    case "yumoto_host": return fetchQuest(game, name, "bath_house_pass", {
      offer: ["Welcome to the Steaming Moon. I'd offer you a soak, but the monkeys have stolen the bath-house pass, and I can't open the bath without it. The lord's own rule, from the year the monkeys took the bath over entirely.", "One of them has it. They pass it round. If you can get it back without hurting more of them than you must, the bath is yours for as long as you like."],
      accept: "Thank you. They're about the springs. The one with the pass looks smug; they all look smug.", progress: "The pass. One of the monkeys. The smug one.",
      have: () => has(player, "monkey_pass"), take: () => { take(player, "monkey_pass", 1); },
      done: ["The pass! Chewed, but legible. Into the bath with you, then. Soak until you can't remember the boat.", "There: rested and warm. You'll learn faster for a while; everyone does, after Yumoto."],
      reward: () => { player.restedTicks = Math.max(player.restedTicks, 1500); giveOrDrop(game, "coins", 500); addXp(game, "agility", 1500, { raw: true }); },
    });
    case "isohama_fisher": return chat(name, npcSays(name, pick(game, ["Isohama's three huts and a net. We like it.", "The sea monks rise off the north cape, never here. Here the sea's polite.", "Good fishing off the point. Bring a rod; nets are for people with patience."])));
    case "cedar_woodsman": return chat(name, npcSays(name, pick(game, ["Cedar for the shrines. You ask the tree first. If it says no, you find another.", "The cedar whisperers are the trees' echoes. Cut a tree and they'll come. Cut it politely and they'll only watch.", "Cedar logs burn sweet and long, and fetch a good price from anyone building something holy (Woodcutting 62)."])));
    case "bamboo_teacher": {
      if (stage(game, "last_blossom") === 1 && !data(game, "lb_teacher")) return chat(name, npcSays(name, "Endings? …An ending is the moment you stop being noticed. Tell your poet that."), undefined, () => { flag(game, "lb_teacher"); say(game, "The Quiet Teacher has given you an answer for the poet."); });
      if (level(game, "thieving") < 30 && stage(game, "footsteps_bamboo") === 0) return chat(name, npcSays(name, "…You found the hut. That's something. Come back when your hands are lighter (Stealth 30)."));
      return fetchQuest(game, name, "footsteps_bamboo", {
        offer: ["You found me. Most people walk past this hut a dozen times.", "I teach people to be unnoticed. It's the only thing worth teaching. Show me your hands are light: lift five purses from the people of the Isles, and nobody calls the guard."],
        accept: "Five. Quietly. I'll know.", progress: "Five purses, from the Isles' people. Quietly.",
        have: () => data(game, "fb_picks") >= 5, take: () => {},
        done: ["Five. And I heard none of them. Sit. Tea.", "Take this hood. The Mistwalkers wear it. You won't remember where you put it, which is the point."],
        reward: () => { giveOrDrop(game, "mistwalker_hood"); addXp(game, "thieving", 3000, { raw: true }); },
      });
    }
    // ---------- The islands ----------
    case "shio_netmender": return fetchQuest(game, name, "nets_and_knots", {
      offer: ["Three typhoons and a sea monk, and these nets held. Then the twine-seller doubled his price, and here I am, mending with hair.", "Bring me five raw carp, which is what he'll take, and three balls of string, which is what I'll use, and I'll show you something the fishers don't show visitors."],
      accept: "Five carp, three string. The fishing's good off the pier.", progress: "Five raw carp and three string.",
      have: () => count(player, "raw_carp") >= 5 && count(player, "string") >= 3, take: () => { take(player, "raw_carp", 5); take(player, "string", 3); },
      done: ["Good fish. Good string. Now watch: a sheet bend, twice, and the net remembers its shape.", "And here: the old fishers' marks. South-east, the turtle's back with the wish shrine on it. South of Kibi, three stones in a row with a watch-post nobody remembers. Fisher Mei rows to the turtle, Wataru to the stones. Tell them Oyone sent you."],
      reward: () => { flag(game, "dock_turtle_rock"); flag(game, "dock_three_stones"); addXp(game, "fishing", 2000, { raw: true }); addXp(game, "crafting", 1000, { raw: true }); },
    });
    case "shio_fisher": return chat(name, npcSays(name, pick(game, ["Squid, mostly. Squid, and sometimes squid.", "Oyone's nets have never torn. She'd say 'yet'.", "If you see a great black head rise out of the water, row the other way. Don't answer if it asks you something."])));
    case "kibi_teamaster": return (() => {
      if (stage(game, "first_flush") === 2) return chat(name, npcSays(name, "Have you taken the tin to Lady Suzu yet? It won't improve in your pack. Nothing does."));
      if (!questDone(game, "landfall") && stage(game, "first_flush") === 0) return chat(name, npcSays(name, "Tea? Of course. The first flush goes to the Hall, but you'll have to be presented there before I'd trust you to carry it."));
      const s = stage(game, "first_flush");
      if (s === 0) return chat(name, npcSays(name, "The first tea of the year goes to the Hall of Takamori, every year since there's been a Hall. And this year my pickers are down with a cold and the bushes won't wait.", "Pick me ten tea leaves from the bushes, raw, straight off. Two leaves and a bud. I'll roll and fire them, and you can carry the tin to the Hall."), [
        { label: "I'll pick them.", then: () => chat(name, npcSays(name, "Ten leaves. Two and a bud, not a handful."), undefined, () => { player.quests.first_flush = 1; say(game, "Quest started: First Flush."); }) },
        { label: "Not today.", then: () => null },
      ]);
      if (s === 1) {
        if (count(player, "tea_leaf") < 10) return chat(name, npcSays(name, "Ten tea leaves, raw, off the bushes."));
        return chat(name, npcSays(name, "Good leaves. I'll roll them while you wait. …There. The first flush, in cedar. To Lady Suzu at the Hall. Don't open it."), undefined, () => { take(player, "tea_leaf", 10); player.quests.first_flush = 2; giveOrDrop(game, "tea_tin"); say(game, "Take the first-flush tin to Lady Suzu in the Hall of Takamori."); });
      }
      return chat(name, npcSays(name, pick(game, ["Water off the boil, not boiling. Boiling water is for people who hate tea.", "The Hall liked the first flush. 'Bitter at first, then not.' I'll have that carved on the chaya.", "Pick from the bushes whenever you like; tell them I said so."])));
    })();
    case "kibi_picker": return chat(name, npcSays(name, pick(game, ["Two leaves and a bud. Two leaves and a bud. I say it in my sleep.", "The bushes are older than my grandmother. They remember who picks them carelessly.", "Kibi tea is bitter, then sweet. Like most things worth drinking."])));
    case "hana_poet": {
      const s = stage(game, "last_blossom");
      if (s === 0) return chat(name, npcSays(name, "Eleven years. One poem. Three lines. I have the first two. The third is the ending, and every ending I write is a lie the island tells me.", "I need things I can't get without leaving, and I've decided I can't leave. A blossom log to burn under the ink. A foxfire to write by. And three answers: what the Lantern Keeper on Torojima, the abbot of Iwaoka and the teacher in the bamboo say about endings."), [
        { label: "I'll bring them.", then: () => chat(name, npcSays(name, "Don't tell them it's for a poem. They'll give you a better answer if they think it's for something important."), undefined, () => { player.quests.last_blossom = 1; say(game, "Quest started: The Last Blossom."); }) },
        { label: "Eleven years is a long time.", then: () => chat(name, npcSays(name, "It's the right amount of time. It just keeps not ending.")) },
      ]);
      if (s === 1) {
        if (has(player, "blossom_logs") && has(player, "fox_fire") && data(game, "lb_keeper") && data(game, "lb_abbot") && data(game, "lb_teacher")) return chat(name, npcSays(name, "The Keeper said 'a light for a name'. The abbot said nothing at all, you say. The teacher said 'the moment you stop being noticed'.", "…Oh. Oh, that's it. Hold the foxfire there. Don't breathe on the ink.", "Done. Three lines. Here, a copy. Never read it aloud on Hanazono: the trees would hear the ending and stop flowering."), undefined, () => {
          take(player, "blossom_logs", 1); take(player, "fox_fire", 1); giveOrDrop(game, "blossom_poem"); addXp(game, "presence", 3000, { raw: true }); addXp(game, "crafting", 1500, { raw: true }); completeQuest(game, "last_blossom");
        });
        return chat(name, npcSays(name, "A blossom log, a foxfire, and what the Keeper, the abbot and the teacher say about endings."));
      }
      return chat(name, npcSays(name, pick(game, ["It's finished. I don't know what to do with my mornings.", "The trees here flower all year. It's not a blessing. It's an island that can't let go of spring.", "Read it in the boat on the way home. That's where it's meant to be read."])));
    }
    case "hana_tea": return chat(name, npcSays(name, pick(game, ["Blossom cakes, and tea, and petals in both whether you want them or not.", "The poet comes in every morning and orders the same thing and doesn't drink it. Eleven years.", "The trees flower all year. I've stopped sweeping the step. Well, mostly."])));
    case "mori_maiden": return (() => {
      if (stage(game, "thousand_gates") === 1 && data(game, "tg_vixens") >= 5 && has(player, "fox_key")) return chat(name, npcSays(name, "Five foxes tested and the key brought back. They were testing you, you know. You passed.", "Take this charm. The foxes will know it, and know you."), undefined, () => { take(player, "fox_key", 1); giveOrDrop(game, "fox_charm"); addXp(game, "prayer", 2500, { raw: true }); addXp(game, "magic", 1500, { raw: true }); completeQuest(game, "thousand_gates"); });
      if (stage(game, "thousand_gates") === 0) return chat(name, npcSays(name, "A thousand gates up from the shore, each one given by someone with a wish. The foxes are the shrine's messengers. Lately they've been testing the pilgrims too hard: three went home without their sandals.", "Walk among them. Put five of the vixens down, gently: they come back, foxes always do. One of them dropped a key it shouldn't have had. Bring it to me."), [
        { label: "I'll walk the gates.", then: () => chat(name, npcSays(name, "Don't follow one off the path, however politely it asks."), undefined, () => { player.quests.thousand_gates = 1; say(game, "Quest started: A Thousand Gates."); }) },
        { label: "Not today.", then: () => null },
      ]);
      if (stage(game, "thousand_gates") === 1) return chat(name, npcSays(name, "Five vixens, and the key. The foxes are in the wood all round the gates."));
      return chat(name, npcSays(name, pick(game, ["The foxes like you. That's not always a good thing.", "A key in one fox's mouth, a jewel in the other's: the key to the rice store and the jewel of wisdom. Or the other way round. They won't say.", "Every gate was given for a wish. Some wishes came true. The gates stay either way."])));
    })();
    case "iwa_abbot": {
      if (stage(game, "last_blossom") === 1 && !data(game, "lb_abbot")) return chat(name, npcSays(name, "…"), undefined, () => { flag(game, "lb_abbot"); say(game, "The abbot says nothing at all, for a long time. You think that's his answer."); });
      return fetchQuest(game, name, "silent_climb", {
        offer: ["You came to ask. Climb, instead. To the summit stone, in silence.", "The crow-masked ones on the slopes will mock you. Silence three of them. Then come down."],
        accept: "…", progress: "The summit stone. Three of the crows. Silence.",
        have: () => data(game, "sc_summit") > 0 && data(game, "sc_crows") >= 3, take: () => {},
        done: ["…Good."],
        reward: () => { addXp(game, "agility", 4000, { raw: true }); addXp(game, "prayer", 1500, { raw: true }); },
      });
    }
    case "iwa_monk": return chat(name, npcSays(name, pick(game, ["…", "(The monk bows, and points up the mountain.)", "(The monk smiles, and goes on sweeping.)"])));
    case "toro_keeper": {
      if (stage(game, "last_blossom") === 1 && !data(game, "lb_keeper")) return chat(name, npcSays(name, "Endings? Every lantern here is an ending. A light for a name. That's all an ending needs: a light, and somebody to remember the name."), undefined, () => { flag(game, "lb_keeper"); say(game, "The Lantern Keeper has given you an answer for the poet."); });
      const ln = stage(game, "lanterns_drowned"), sg = stage(game, "sea_gave_back");
      if (ln === 0) return chat(name, npcSays(name, "Every lantern is a name: someone the sea took. I light them each night. Lately they go out faster than I can walk round, and the ones that go out get up and wander. Lantern-wights, you'd call them. Lost.", "Put eight of the wights to rest. And bring me three foxfires, from Morishima's vixens: a cold flame that never burns down. I'll light the great lantern with them, and the rest will hold."), [
        { label: "I'll help you.", then: () => chat(name, npcSays(name, "Gently with them. They were people."), undefined, () => { player.quests.lanterns_drowned = 1; say(game, "Quest started: Lanterns for the Drowned."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (ln === 1) {
        if (data(game, "ld_wights") >= 8 && count(player, "fox_fire") >= 3) return chat(name, npcSays(name, "Eight at rest, and three foxfires. Hold them up, so: into the great lantern.", "There. It'll never go out now. The others will hold, while it does.", "But they're not resting, the drowned. Something holds them. On Hakkotsu, the white island, far out. I'll tell you more when I'm sure of you, and when the Hall has done its own penance."), undefined, () => {
          take(player, "fox_fire", 3); giveOrDrop(game, "coins", 2000); addXp(game, "prayer", 6000, { raw: true }); completeQuest(game, "lanterns_drowned");
        });
        return chat(name, npcSays(name, "Eight wights to rest, three foxfires for the great lantern."));
      }
      if (sg === 0) {
        if (!questDone(game, "josaki_truce")) return chat(name, npcSays(name, "Josaki's dead are on Hakkotsu's shore too, among ours. When the Hall has made its peace with Josaki, come back. Not before."));
        if (combat(game) < 80) return chat(name, npcSays(name, "Hakkotsu. Not yet. You'd be one more lantern."));
        return chat(name, npcSays(name, "The Hall read the treaty aloud, I hear. Then I'll tell you. On Hakkotsu there's a shrine of bones, built long ago over something that ate the drowned: everyone the sea took and nobody mourned. It sleeps when the lanterns burn. It's been waking.", "Go under the Bone Gate. The ribbed door opens to a rib key; the starved dead carry them. Lay the Colossus down and bring me what it's holding. The ferryman will take you. Don't ask his name."), [
          { label: "I'll go to Hakkotsu.", then: () => chat(name, npcSays(name, "Bring back every name. Every one."), undefined, () => { player.quests.sea_gave_back = 1; say(game, "Quest started: What the Sea Gave Back. Hakkotsu is on your charts now."); }) },
          { label: "Not yet.", then: () => null },
        ]);
      }
      if (sg === 1) {
        if (has(player, "colossus_heart")) return chat(name, npcSays(name, "That's it. That's all of them. Sit with me. I'll read them out, and light one for each.", "…It took all night. Look at the sea: calm all the way to your mainland.", "The Isles will remember what you did tonight. I'll make sure of it."), undefined, () => {
          take(player, "colossus_heart", 1); giveOrDrop(game, "coins", 20000); addXp(game, "prayer", 15000, { raw: true }); addXp(game, "presence", 5000, { raw: true }); completeQuest(game, "sea_gave_back");
        });
        return chat(name, npcSays(name, "Under the Bone Gate on Hakkotsu. Lay the Colossus down, and bring me what it holds."));
      }
      return chat(name, npcSays(name, pick(game, ["Every lantern a name. I know them all. I'll know yours, one day, and light it.", "The sea's calm. It's been calm since you came back. It won't last; the sea doesn't. But the names are said.", "Foxfire never goes out. Neither do grudges. That's why we light the one against the other."])));
    }
    case "kusa_herbalist": return chat(name, npcSays(name, pick(game, ["Take a leaf from a plant, not a plant from the island. Write that down.", "Spirit bell rings when nobody touches it. Pick it when it's quiet; it doesn't mind then.", "Granny Ume buys my mugwort. She says it's for incense. It's for incense and her knees.", "Moon mugwort, Kumo root, shiso, tea, spirit bell. The Isles' five. Your mainland has its own; these are ours."])));
    case "cove_boss": {
      if (questDone(game, "smugglers_cove") && data(game, "cv_choice") === 2) return chat(name, npcSays(name, pick(game, ["The ledger came back. With you attached. I like that in a ledger.", "What fell off a boat is for sale, friend. To you, at a friend's price.", "The magistrate's clerk sends his regards. He'd send more, but he's busy being nervous."])), [
        { label: "What's for sale?", then: () => { game.ui.shop = "mizukai_cove"; return null; } },
        { label: "Goodbye.", then: () => null },
      ]);
      return chat(name, npcSays(name, pick(game, ["You're on my island. It isn't on any chart, so technically you're nowhere. Mind your step; nowhere has cliffs.", "Everything here fell off a boat. Including some of my people.", "The strongbox? What strongbox?"])));
    }
  }
  return null;
}
/** Each boatman's greeting. */
const BOAT_LINES: Record<string, string> = {
  boat_eastport: "Eastern ferry to the Isles. Kurohama's the harbour; Shiogama if you smell of fish already.",
  boat_kurohama: "Every boat in this harbour goes where I say, and I say where you pay for.",
  boat_tanabe: "Tanabe landing. Hop in; mind the rice sacks.",
  boat_shiogama: "Shiogama's boat. We go to Kurohama, mostly, and to wherever the squid are.",
  boat_kibi: "Room between the tea chests for one. Two if you're thin.",
  boat_hanazono: "Blossom island and back. You'll have petals on your hat for a week.",
  boat_morishima: "Pilgrims to the fox shrine? The foxes will be waiting. They always are.",
  boat_iwaoka: "The monks don't talk on the crossing. I make up for it.",
  boat_josaki: "Josaki, on the captain's word. I drop you, I don't wait. Wave from the pier when you want me.",
  boat_torojima: "To the Lantern Isle. Quietly, please; some of my passengers are grieving.",
  boat_kusabana: "Kusabana. Midori doesn't like visitors, but she likes the ones who leave.",
  boat_ashigane: "Ashigane. You're sure? Everyone's sure until they see the ogres.",
  boat_smugglers_cove: "You know where you're going? Then I don't, and that's how we both like it.",
  boat_three_stones: "The Three Stones. Lovely for an afternoon. Nobody knows what the watch-post watched for.",
  boat_turtle_rock: "Turtle Rock! One coin in the box, one wish. Mine came true twice.",
  boat_hakkotsu: "…",
  // The sea ports' packets (ports.ts).
  boat_gullwick: "Gullwick packet, for anywhere the sea goes and a few places it shouldn't. Fares by the league, paid at the plank.",
  boat_saltreach: "Every passenger is written in the Ledger, coming and going. Sign here. And here. And there, for the Salt-House.",
  boat_merrab: "My dhow takes pearls east and passengers anywhere. The pearls complain less.",
  boat_suvarnatira: "No crown on my boat, just a fare and, if you're lucky, a good wind.",
};

/** Kills that count for the Isles' quests, and the things creatures carry for them. */
export function onMizukaiKill(game: Game, monsterId: string) {
  const player = game.player;
  const tally = (quest: string, key: string, goal: number, done: string) => {
    if (stage(game, quest) !== 1) return;
    const n = player.questData[key] = (player.questData[key] ?? 0) + 1;
    if (n === goal) say(game, done);
  };
  const carry = (quest: string, itemId: string, chance: number, text: string, atStage = 1) => { if (stage(game, quest) === atStage && !has(player, itemId) && game.rng() < chance) { giveOrDrop(game, itemId); say(game, text); } };
  if (monsterId === "river_imp") tally("drowned_paddies", "dp_imps", 4, "Four river imps put down. Now three cucumbers for the rest, and back to the headman.");
  if (monsterId === "snow_monkey") carry("bath_house_pass", "monkey_pass", 0.3, "The monkey drops a wooden pass, chewed at one corner. The Steaming Moon's bath-house pass!");
  if (monsterId === "foxfire_vixen") { tally("thousand_gates", "tg_vixens", 5, "Five vixens tested. Kon wanted the fox's key too."); if (data(game, "tg_vixens") >= 2) carry("thousand_gates", "fox_key", 0.35, "The vixen drops a tiny brass key at your feet, and waits for you to pick it up."); }
  if (monsterId === "crow_hermit") tally("silent_climb", "sc_crows", 3, "Three crow-masked hermits silenced. Now the summit stone, if you haven't.");
  if (monsterId === "lantern_wight") tally("lanterns_drowned", "ld_wights", 8, "Eight lantern-wights at rest. Three foxfires for the great lantern, and back to the Keeper.");
  if (monsterId === "josaki_ronin") tally("josaki_truce", "jt_ronin", 6, "Six Josaki ronin down. Only their lord is left.");
  if (monsterId === "lord_josaki" && stage(game, "josaki_truce") === 1 && !has(player, "josaki_treaty")) { flag(game, "jt_lord"); giveOrDrop(game, "josaki_treaty"); say(game, "The Shade of Lord Josaki lowers his sword. From his armour falls a scroll case: two copies of a treaty, both signed. He fades looking at it. Lady Suzu will want to see this."); }
  if (monsterId === "red_ogre" && stage(game, "red_ogre") === 1) { flag(game, "ro_red"); say(game, "Akagane, the Red Ogre, falls, and the fire in the smelting hall gutters. Captain Ise will want his horns."); }
  if (monsterId === "hollow_seal_breaker" && stage(game, "mountain_kept") === 1) { flag(game, "mk_breaker"); say(game, "The Seal-Breaker comes apart like wet paper. The Hollow goes still. The priestess will want to know."); }
  if (monsterId === "starving_colossus" && stage(game, "sea_gave_back") === 1 && !has(player, "colossus_heart")) { flag(game, "sg_colossus"); giveOrDrop(game, "colossus_heart"); say(game, "The Starving Colossus kneels, and folds, and is bones. In its ribs is a bundle tied with straw rope: offerings, and names. Hundreds of names. The Lantern Keeper."); }
}
/** Prayers at the Isles' shrines (The Rope and the Brush; Landfall). */
export function onMizukaiAltar(game: Game, altar: { name: string; text?: string }) {
  if (altar.text !== "mizukai") return;
  if (stage(game, "landfall") === 1 && altar.name === "Kumoyama altar" && !data(game, "ld_prayed")) { flag(game, "ld_prayed"); say(game, "You ring the bell, bow, clap, bow. The mountain has seen you. Back to the harbourmaster."); }
  if (stage(game, "rope_and_brush") === 2) {
    const key = ({ "Kumoyama altar": "rb_kumo", "Harbour shrine altar": "rb_harbour", "Fox shrine altar": "rb_fox", "Iwaoka altar": "rb_iwaoka" } as Record<string, string>)[altar.name];
    if (key && !data(game, key)) { flag(game, key); const rung = ["rb_kumo", "rb_harbour", "rb_fox", "rb_iwaoka"].filter(k => data(game, k)).length; say(game, rung === 4 ? "The fourth bell rings. Somewhere far off, so does the first. Back to the Head Priestess." : `The bell rings for the new rope (${rung}/4 shrines).`); }
  }
}
/** Standing on Iwaoka's summit stone (The Silent Climb). */
export function onMizukaiTick(game: Game) {
  const p = game.player;
  if (stage(game, "silent_climb") === 1 && !data(game, "sc_summit") && Math.hypot(p.x - IWAOKA_SUMMIT.x, p.y - IWAOKA_SUMMIT.y) <= 3) { flag(game, "sc_summit"); say(game, "You touch the summit stone of Iwaoka. The wind stops, for exactly as long as you hold your breath."); }
}
/** Iwaoka's summit, where the abbot sends climbers (world coordinates). */
export const IWAOKA_SUMMIT = { x: 1648, y: 104 } as const;
/** Searching something on the Isles for a quest (the smugglers' strongbox): true if it was handled. */
export function onMizukaiSearch(game: Game, name: string): boolean {
  if (!name.startsWith("The smugglers' strongbox")) return false;
  const player = game.player;
  if (stage(game, "smugglers_cove") !== 1) { message(game, "The strongbox is locked, and you have no business with it."); return true; }
  if (has(player, "smugglers_ledger")) { message(game, "You already have the ledger."); return true; }
  if (level(game, "thieving") < 30) { message(game, "You'd need lighter hands to open it unnoticed (Stealth 30).", "warn"); return true; }
  giveOrDrop(game, "smugglers_ledger"); addXp(game, "thieving", 400); say(game, "You work the lock with a hairpin and two prayers. The ledger is yours. Nobody turns round.");
  return true;
}
/** A purse lifted from one of the Isles' people (Footsteps in the Bamboo). */
export function onMizukaiPickpocket(game: Game, npcId: string) {
  if (stage(game, "footsteps_bamboo") !== 1 || !["mizukai_villager", "tanabe_farmer", "mizukai_samurai"].includes(npcId)) return;
  const n = game.player.questData.fb_picks = (game.player.questData.fb_picks ?? 0) + 1;
  if (n === 5) say(game, "Five purses, and nobody the wiser. The Quiet Teacher will know.");
}
/** Why a shop of the Isles won't sell to you, or null. */
export function mizukaiShopProblem(game: Game, shopId: string): string | null {
  if (shopId === "mizukai_cove" && !(questDone(game, "smugglers_cove") && data(game, "cv_choice") === 2)) return "Kuze only sells to friends of the cove.";
  return null;
}
