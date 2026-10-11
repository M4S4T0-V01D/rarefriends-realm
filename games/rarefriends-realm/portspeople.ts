/**
 * The sea ports' people: Gullwick's harbour folk, Saltreach's panners and the Crown's assessor, Merrab's divers and
 * the men who buy what they bring up, Tel Ashun's brick-diggers on their mound, Ennu's Well's keeper and the caravans
 * that drink from it, and a packet boatman at every port.
 *
 * Nobody here is simply in the right: Gullwick's Collector raises dues because the harbour wall is falling down, and
 * the fishers who can't pay them have started taking it back off the rocks; Saltreach's Assessor writes everything
 * down and the panners have learnt what not to say; Merrab's factor lends the divers boats and owns their breath; Tel
 * Ashun needs bricks and has a mound of them; Ennu's Well has water for some of the people who want it.
 *
 * The clues here (WorldObject.clue, see kharaveth.ts) are the quests' (portsquests.ts).
 */
import { type Dialogue, type Game } from "./state.ts";
import { chat, npcSays, type NpcDef } from "./content.ts";

const art = (family: number, seed: number) => ({ family, seed });
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(9, seed), ...extra });
const soldier = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(10, seed), ...extra });
const trader = (id: string, name: string, examine: string, seed: number, shop: string): NpcDef => person(id, name, examine, seed, { options: ["Talk-to", "Trade"], shop });
const boatman = (id: string, name: string, examine: string, seed: number): NpcDef => ({ id, name, examine, options: ["Talk-to", "Travel"], art: art(9, seed) });
const villager = (id: string, name: string, examine: string, seed: number, level: number, extra: [string, number][]): NpcDef => person(id, name, examine, seed, {
  options: ["Talk-to", "Pickpocket"], pickpocket: { level, xp: Math.round(level * 1.4), coins: [Math.round(level * 0.6), level * 3], stun: 4, damage: 2, extra } });

export const PORTS_NPCS: Record<string, NpcDef> = {
  // Gullwick.
  gullwick_harbourmaster: person("gullwick_harbourmaster", "Harbourmaster Wenna Coyle", "Gullwick's harbourmaster: berths, tides, quarrels and the lighthouse, all hers. She has a voice for shouting across water and uses it indoors.", 1800),
  gullwick_collector: person("gullwick_collector", "Collector Abel Prowse", "Collector of the port's dues, in a good black coat and a worse temper. The harbour wall is falling into the sea, he says, and the sea doesn't pay dues.", 1801),
  gullwick_keeper: person("gullwick_keeper", "Keeper Ossian Penhale", "Keeper of Gullwick Light for thirty years, salt-white of beard and soot-black of hand. He has not let the lamp go out once in thirty years, he says, until this month.", 1802),
  gullwick_innkeeper: trader("gullwick_innkeeper", "Merry Tull", "Keeps the Gull and Lantern, and the harbour's news, and a stew that has been going in the same pot since her mother's day.", 1803, "gullwick_inn"),
  gullwick_chandler: trader("gullwick_chandler", "Bram Oake", "Gullwick's chandler: rope, tar, oil, hooks and floats, and the price of all of them by heart.", 1804, "gullwick_chandlery"),
  gullwick_fishmonger: trader("gullwick_fishmonger", "Loveday the fishwife", "Sells the morning's catch off the quay, guts it faster than you can point at it, and knows which boat every fish came off.", 1805, "gullwick_fish"),
  gullwick_ropemaker: person("gullwick_ropemaker", "Ropemaker Garrow", "Lays rope in the ropewalk, walking backwards the length of the shed all day. He has walked to Saltmarrow and back, he says, without leaving Gullwick.", 1806),
  gullwick_clothier: trader("gullwick_clothier", "Sennet", "Sells oilskins and knits ganseys, each in its family's pattern. She can tell you whose son you are by your jersey.", 1807, "gullwick_clothier"),
  gullwick_nan: person("gullwick_nan", "Nan Tregellas", "A fisher's widow in a gansey too big for her, mending a net at her door. Her son's boat hasn't gone out in a month, and she has stopped saying why.", 1808),
  gullwick_fisher: person("gullwick_fisher", "Gullwick fisher", "A fisher off one of the luggers, mending, baiting, or complaining about the dues, and sometimes all three.", 1809),
  gullwick_watch: soldier("gullwick_watch", "Harbour watch", "One of the harbour watch, paid by the Collector, with a lantern, a cudgel and opinions about the Collector.", 1810),
  gullwick_villager: villager("gullwick_villager", "Gullwick local", "Someone of the harbour town in a navy gansey, smelling of the sea and saying so.", 1811, 18, [["fish_stew", 0.2], ["bread", 0.3]]),
  // Saltreach.
  saltreach_assessor: person("saltreach_assessor", "Tide-assessor Corvin Lisle", "The Crown's assessor at Saltreach, in violet and silver, the Ledger of Salt open on his arm. He weighs, he writes, and he has never once been wrong, in writing.", 1820),
  saltreach_brannagh: person("saltreach_brannagh", "Mother Brannagh", "Eldest of the salt-panners, white to the elbows, her rake taller than she is. She has paid the King's salt for fifty years and has started to wonder what it weighs.", 1821),
  saltreach_reeve: person("saltreach_reeve", "Pan-reeve Dunstan", "Keeps the pans' own weights in the weighing shed, so the panners know what to expect before the Salt-House tells them.", 1822),
  saltreach_innkeeper: trader("saltreach_innkeeper", "Ysmay", "Keeps the Salt Cellar, which serves one measure of small beer each, as the Law asks, and a great deal of salt herring, which it doesn't.", 1823, "saltreach_inn"),
  saltreach_merchant: trader("saltreach_merchant", "Goodman Ferris", "Keeps the provisions by the quay: bread of the one kind at the one price, and everything else at whatever the Ledger allows.", 1824, "saltreach_stores"),
  saltreach_clothier: trader("saltreach_clothier", "Weaver Aldith", "Weaves the port's smocks and coifs in salt-white, and the one violet the Sumptuary Office allows a port.", 1825, "saltreach_clothier"),
  saltreach_panner: person("saltreach_panner", "Salt-panner", "A panner raking the drying salt into ridges, white-rimed to the knee, squinting against the glare off the pans.", 1826),
  saltreach_guard: soldier("saltreach_guard", "Salt-House guard", "A guard of the King's Salt-House in a violet tabard, who checks the seals on every sack and the faces on every boat.", 1827),
  saltreach_villager: villager("saltreach_villager", "Saltreach citizen", "A citizen of the salt port in white and violet, on the way to the Salt-House, or back from it, or praying about it.", 1828, 30, [["salt_herring", 0.4], ["bread", 0.3]]),
  // Merrab.
  merrab_yamina: person("merrab_yamina", "Head diver Yamina", "Head of Merrab's pearl divers, broad-shouldered, her ears ringing from twenty years of the deep beds. She can hold her breath longer than you can hold a conversation.", 1840),
  merrab_factor: person("merrab_factor", "Factor Ibrel Dahan", "The Gilded Court's pearl factor at Merrab, in white linen with a gold-worked collar. He lends the divers their boats, buys their pearls, and keeps the book of what they owe.", 1841),
  merrab_harbourmaster: soldier("merrab_harbourmaster", "Harbour-captain Seddik", "The Copper Banner's captain of Merrab's harbour, who collects Khetmar's dues and would rather be collecting anything else, preferably somewhere with shade.", 1842),
  merrab_innkeeper: trader("merrab_innkeeper", "Auntie Nour", "Keeps the Sea Gate Inn, and keeps the divers fed whether or not they can pay, which the factor finds very irritating.", 1843, "merrab_inn"),
  merrab_merchant: trader("merrab_merchant", "Hashim", "Keeps the stores on the harbour street: dates, rope, oil and diving stones, all priced in Sefrah gold and argued about in Khetmar copper.", 1844, "merrab_stores"),
  merrab_clothier: trader("merrab_clothier", "Rasha the dyer", "Merrab's dyer, her arms blue to the elbow, who dyes the divers' sea-green and swears it brings the pearls up faster.", 1845, "merrab_clothier"),
  merrab_boatwright: person("merrab_boatwright", "Boatwright Ayyub", "Builds and mends the diving boats in the yard by the harbour, in Meghavan teak, with a mouthful of nails.", 1846),
  merrab_diver: person("merrab_diver", "Pearl diver", "One of Merrab's divers, salt-cracked and sun-dark, a diving stone on a cord over the shoulder. Nobody's been down to the deep beds for weeks.", 1847),
  merrab_guard: soldier("merrab_guard", "Banner harbour guard", "A soldier of the Copper Banner on harbour duty, sabre at the hip, eyes on the pearl boats and the dues box both.", 1848),
  merrab_villager: villager("merrab_villager", "Merrab local", "Someone of the harbour town in white and sea-green, with salt in the hair and a shell on a string at the throat.", 1849, 36, [["dates", 0.5], ["flatbread", 0.3]]),
  // Tel Ashun.
  tel_ashun_elder: person("tel_ashun_elder", "Elder Hazane", "Elder of Tel Ashun, small and dusty, leaning on a staff cut from a roof beam older than she is. She speaks for the village and listens for the mound.", 1860),
  tel_ashun_brickmaker: person("tel_ashun_brickmaker", "Brickmaker Tahun", "Makes Tel Ashun's mudbricks, and has made them from the tell itself since the river clay ran out, because the tell is clay already, only older.", 1861),
  tel_ashun_recorder: person("tel_ashun_recorder", "Recorder Khaset", "A recorder of the Obsidian Legacy out of Tamesh, in black linen bordered with lapis, who has come to write the tell down before it's all bricks.", 1862),
  tel_ashun_potter: trader("tel_ashun_potter", "Potter Imenet", "Throws pots from the tell's clay and sells them to the village that dug it up. Some of her pots are older than her; she sells those too.", 1863, "tel_ashun_stores"),
  tel_ashun_digger: person("tel_ashun_digger", "Brick-digger", "A digger at the cut in the mound, with a mattock and a basket, grey with the dust of a hundred years at a time.", 1864),
  tel_ashun_villager: villager("tel_ashun_villager", "Tel Ashun local", "Someone of the village on the mound, in Tamesh's plain linen, which is what the masons' cousins wear.", 1865, 30, [["dates", 0.4], ["flatbread", 0.3]]),
  // Ennu's Well.
  ennu_keeper: person("ennu_keeper", "Well-keeper Saliha", "Keeper of Ennu's Well, who measures out the water by the tally stick, and has been measuring out less of it every week.", 1870),
  ennu_caravaneer: person("ennu_caravaneer", "Caravan-master Ommet", "Master of a caravan of forty camels between Merrab and the steppe, who has paid for Ennu's water for twenty years and means to go on drinking it.", 1871),
  ennu_gardener: person("ennu_gardener", "Date-gardener Ferhat", "Tends the date gardens round the pool, and talks to the palms. The palms have been answering less.", 1872),
  ennu_trader: trader("ennu_trader", "Liyan", "Sells dates, flatbread and water skins from a stall by the pool, and the water at a price nobody is supposed to call a price.", 1873, "ennu_stall"),
  ennu_herder: person("ennu_herder", "Camel-herd", "A herd with the caravan's camels, who has opinions about every one of them and shares none of them with the camels.", 1874),
  ennus_well_villager: villager("ennus_well_villager", "Ennu's Well local", "Someone of the oasis in Zuri indigo, a water jar on the hip, watching the level of the pool.", 1875, 30, [["dates", 0.5]]),
  // The packet boats, one at each port (boats.ts, mizukai.ts BOAT_LINES).
  boat_gullwick: boatman("boat_gullwick", "Packet-master Hesketh", "Master of the Gullwick packet, red-faced from forty years of wind, who has been to every port on the chart and three that aren't.", 1812),
  boat_saltreach: boatman("boat_saltreach", "Boatwoman Elsbet", "Rows the Saltreach packet out to the ships, and writes every passenger in the Ledger, coming and going.", 1829),
  boat_merrab: boatman("boat_merrab", "Captain Nadira", "Captain of a trading dhow out of Merrab, who carries pearls east and passengers wherever they'll pay to go.", 1850),
  boat_suvarnatira: boatman("boat_suvarnatira", "Pilot Varun", "The free port's pilot, who brings every ship in past the shoals, and takes passengers out on the packet when there's room among the books.", 1876),
};

const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];

export function talkPorts(game: Game, npcId: string, name: string): Dialogue | null {
  const say = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  switch (npcId) {
    // ---------- Gullwick ----------
    case "gullwick_harbourmaster": return say(pick(game, ["Every boat in or out of Gullwick goes past my window. I know who's late, who's lying, and who's both.", "The Light's mine to see kept. Ossian keeps it. Somebody keeps putting it out. That's three people, and only two of them are honest.", "The Collector wants a new harbour wall. The fishers want to eat. The sea wants the wall. I want a quiet week, and I'll want it for ever."]));
    case "gullwick_collector": return say(pick(game, ["The harbour wall is falling into the sea, stone by stone. Dues build walls. Sentiment doesn't.", "The fishers say the dues are too high. The dues are exactly as high as the wall is long, and the wall is very long.", "I'm not loved. Collectors aren't. I'm right, which is worse."]));
    case "gullwick_keeper": return say(pick(game, ["Thirty years I've kept her lit. Dusk to dawn, every night. You learn her moods: a lamp's a living thing, near enough.", "Saltmarrow lost the Gullwing on the rocks before there was a light here. They built her after. Some nights I think of that.", "Oil, wick, glass, and a keeper who doesn't sleep. That's all a lighthouse is."]));
    case "gullwick_innkeeper": return say(pick(game, ["Sit down, love, you're letting the weather in. Stew's the same as yesterday's, only better.", "Fishers at the window, the Collector's men by the door, and nobody sits in between. I put the stew in between."]));
    case "gullwick_chandler": return say(pick(game, ["Rope, tar, hooks, floats, oil. Everything a boat needs except luck. Luck's at the inn, I'm told.", "Half my customers are on the slate since the dues went up. A slate doesn't float, I tell them. They laugh. I don't."]));
    case "gullwick_fishmonger": return say(pick(game, ["Fresh this morning! Well. This morning's this morning. Yesterday's is cheaper.", "Half the boats are tied up. Can't pay the landing dues, so they don't land. So I've nothing to sell. So nobody pays me. Round it goes."]));
    case "gullwick_ropemaker": return say(pick(game, ["Walk backwards, twist, walk backwards. A cable's three hundred paces, and I've walked every one of them twice.", "The Light's oil comes in on rope I laid, the boats are tied up with rope I laid, and the Collector's men hang their lanterns on rope I laid. I'm everyone's, me."]));
    case "gullwick_clothier": return say("Every family's gansey has its own pattern. Ropes, ladders, nets, waves. If the sea gives one back, we know whose it is.");
    case "gullwick_nan": return say(pick(game, ["My husband went down off Wrack Point the year the Light was dark for a storm. Twenty years. I don't go out on the point.", "Kit's boat's tied up. Can't pay the dues, can't fish; can't fish, can't pay. He's young. Young men find other things to do."]));
    case "gullwick_fisher": return say(pick(game, ["Landing dues, berth dues, and now harbour improvement. I've improved nothing but my vocabulary.", "Don't go out on Wrack Point at night. Not for any reason. Not for any reason you'd want to tell the watch."]));
    case "gullwick_watch": return say(pick(game, ["The Collector pays us. The fishers feed us. You can see the difficulty.", "Quiet tonight. Too quiet. The Light's lit, at least. So far."]));
    case "gullwick_villager": return say(pick(game, ["Saltmarrow's further along the coast. They say they're the real harbour. They also say their tithe stops storms.", "The packet goes everywhere now. My cousin went to the Isles and came back with a hat. Just a hat. Says it was worth it.", "Hollyhock's just east. Their gardens, our fish. We get on, mostly. Mostly about the fish."]));
    // ---------- Saltreach ----------
    case "saltreach_assessor": return say(pick(game, ["Every pound of salt that leaves Saltreach is weighed, sealed and written in the Ledger. The salt duty is King Pell's: the one office Her Radiance gave him to keep. We keep it exactly.", "A panner says the Salt-House cheats. I show him the Ledger. The Ledger is never wrong; it's written.", "The King reads every column of the Ledger of Salt himself. He has ink on his fingers from it. He is very kind about it, which is worse."]));
    case "saltreach_brannagh": return say(pick(game, ["Fifty years I've raked these pans. The salt's the same. The sea's the same. The duty's grown every year, and nobody can tell me why.", "The Assessor writes everything down. So we've learnt what not to say. That's what the Ledger teaches, if you let it."]));
    case "saltreach_reeve": return say(pick(game, ["The pans' weights are ours: we weigh before the Salt-House does, so we know what we're owed. Usually we're owed more than we get.", "Brine in, sun on, rake it, sack it, weigh it, seal it. The sun does most of the work. The Salt-House takes most of the salt."]));
    case "saltreach_innkeeper": return say(pick(game, ["One measure of small beer, as the Law asks. Herring's as much as you like; the Law hasn't said anything about herring yet.", "The panners drink at the back, the Salt-House men at the front. Nobody drinks much. The Ledger's open at both ends."]));
    case "saltreach_merchant": return say("Bread of the one kind, at the one price. Salt herring, which isn't in the Law, so I can charge what I like. I don't. Somebody might write it down.");
    case "saltreach_clothier": return say("Salt-white for the pans, violet for the Salt-House. The Sumptuary Office lets a port have one violet, one finger wide. I make the most of the finger.");
    case "saltreach_panner": return say(pick(game, ["Rake it into ridges, let the wind take the wet. The glare'll blind you by noon if you don't keep the coif low.", "We pay the King's salt on every sack. Then the King's salt is weighed again in the capital. It never weighs the same twice. Funny, that."]));
    case "saltreach_guard": return say(pick(game, ["Every sack sealed, every seal checked, every boat written down. That's Saltreach.", "Move along, citizen. Or stay. Either way, you're in the Ledger."]));
    case "saltreach_villager": return say(pick(game, ["Seven prayers a week, one at the Salt-House. That's how we count them here.", "The capital's just north. You can see the towers from the pans on a clear day. They can see us too, which is the point.", "I was born in Saltreach. I think. The Ledger says so, and the Ledger is never wrong."]));
    // ---------- Merrab ----------
    case "merrab_yamina": return say(pick(game, ["Ten fathoms on one breath, and back up with a basket of shells. I've done it twenty years. My ears have stopped thanking me.", "The deep beds are the good ones. Nobody's been down for weeks. Something down there has learnt we come up tired."]));
    case "merrab_factor": return say(pick(game, ["The Gilded Court lends the boats, buys the pearls and keeps the book. Without the Court, the divers would be fishing for sardines.", "A pearl is a debt the sea pays back slowly. I merely keep the accounts."]));
    case "merrab_harbourmaster": return say(pick(game, ["Khetmar's harbour, Khetmar's dues. The Marshal wants a port on the east coast. The Marshal has one. It's hot.", "Boats from Meghavan bring teak and rice; boats from Merrab take pearls and salt. The Banner takes a tenth of both, politely."]));
    case "merrab_innkeeper": return say(pick(game, ["Eat, eat, you look like a diver after a dry week. Pay when you're paid. The factor hates that.", "The divers' tables are by the window, so they can see the beds. They haven't been looking lately."]));
    case "merrab_merchant": return say("Diving stones, nose-clips, rope, dates. Gold or copper, I'll take either, and argue about both.");
    case "merrab_clothier": return say("Sea-green for the divers. Brings the pearls up faster, my grandmother said. She also said it brought her husband home, so she wasn't always right.");
    case "merrab_boatwright": return say(pick(game, ["Meghavan teak, Merrab hands. A diving boat lasts thirty years if the divers do.", "Half the boats are up on the trestles, mending. No diving, no money; no money, no mending. I mend them anyway."]));
    case "merrab_diver": return say(pick(game, ["We dive the shallow beds now. Small shells, small pearls, small money. The debt doesn't get any smaller.", "Old Saltjaw. We called him that when he was smaller. He's not smaller now."]));
    case "merrab_guard": return say(pick(game, ["Copper Banner, harbour duty. The sea's the only thing round here that doesn't pay the Marshal.", "Watch your purse on the quay. Not because of thieves: because of Hashim."]));
    case "merrab_villager": return say(pick(game, ["Everybody in Merrab owes the factor something. Even the factor's cook. Especially the factor's cook.", "Khetmar's up the road. Meghavan's across the water. We're in between, which is where the money goes past.", "The pearls go to Sefrah, the divers stay here. That's the trade."]));
    // ---------- Tel Ashun ----------
    case "tel_ashun_elder": return say(pick(game, ["The tell is our grandmothers' houses, and theirs, and theirs, all the way down. Every village here was built on the last.", "We need bricks. The river clay's gone. The tell's clay. You see the difficulty, and so does everybody, every morning."]));
    case "tel_ashun_brickmaker": return say(pick(game, ["Water, straw, tell clay, a mould and the sun. A hundred bricks a day. The tell's been here a thousand years; it can spare a hundred bricks.", "My bricks are the best in the east because the clay's been made once already. Twice, some of it."]));
    case "tel_ashun_recorder": return say(pick(game, ["The Obsidian Legacy keeps every monument in Kharaveth. A tell is a monument nobody meant to build.", "I write each layer before it's dug. Ash, floor, ash, floor. Sometimes a doorway. Once, a child's toy."]));
    case "tel_ashun_potter": return say("Pots from the tell's clay. And pots from the tell: we dig those up too, sometimes whole. They hold water better than mine.");
    case "tel_ashun_digger": return say(pick(game, ["Dig, basket, carry, tip. Every basket's a year, the recorder says. I've carried a hundred years this morning.", "Found a hearth yesterday. Ash still black in it. Somebody cooked there before Khetmar had a wall."]));
    case "tel_ashun_villager": return say(pick(game, ["My house is new bricks from old clay. My grandmother's house is under it. Her grandmother's is under hers.", "The Legacy's woman writes everything down. She's very polite about the digging. Very."]));
    // ---------- Ennu's Well ----------
    case "ennu_keeper": return say(pick(game, ["One notch a day for every share. The village, the gardens, the caravans. The notches are the same; the water isn't.", "Ennu dug this well when there was no village, only Ennu and thirst. We've kept it since. We've never kept it so low."]));
    case "ennu_caravaneer": return say(pick(game, ["Forty camels, twenty years, and Ennu's water every crossing. We pay. We've always paid. A well isn't a well if you can't drink from it.", "Merrab to the steppe is nine days without Ennu's Well. Nine days is a long way to be thirsty."]));
    case "ennu_gardener": return say(pick(game, ["The palms drink first, or they don't fruit. No dates, no trade; no trade, no village. Palms are very persuasive.", "The water's lower every week. The old channel from the hills is half dry, and the sand's getting into it from somewhere."]));
    case "ennu_trader": return say("Dates, bread, a skin of water. The water's free. The skin is very expensive.");
    case "ennu_herder": return say(pick(game, ["That one bites. That one spits. That one's mine, and does both.", "Camels can go a week without water. They don't like to, and they tell you about it the whole week."]));
    case "ennus_well_villager": return say(pick(game, ["Village first, gardens second, caravans third. That's the old measure. The caravans don't like being third.", "The pool used to come up to that palm. Now look.", "The Zuri camp here in the dry months. We dress like them; they drink like us."]));
  }
  return null;
}
