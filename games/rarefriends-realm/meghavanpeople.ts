/**
 * The Land Before Stone: Meghavan's people. Its rulers and the people who argue with them, the shopkeepers and tailors
 * of every town, the guards, the miners, the scholars, the sailors and the villagers of each place in its own dress.
 *
 * The powers, none of them simply right: Queen Saumitra of Ilavarta, whose crown is the tanks, between her engineers
 * and the temple treasurers; the League of Seven Parasols at Mandapur and its Speaker by turn; Lord Varanjit of
 * Shailagarh and the Copper Banner companies he hires; Provost Lalitha of Suvarnatira and the Assembly of Ink and Coin;
 * Grandmother Sukesh of the Kanthari; and Ferrywarden Amul, who keeps the ford at Tirthali and asks very few questions.
 *
 * The clues here (WorldObject.clue, see kharaveth.ts): the Gate of Rains' plaque, the Great Tank's measure, the Great
 * Stepwell, the Speaker's stone.
 */
import { type Dialogue, type Game } from "./state.ts";
import { chat, npcSays, type NpcDef } from "./content.ts";
import type { WorldObject } from "./world.ts";
import { canRub, takeRubbing } from "./meghavanschools.ts";

const art = (family: number, seed: number) => ({ family, seed });
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(9, seed), ...extra });
const soldier = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(10, seed), ...extra });
const trader = (id: string, name: string, examine: string, seed: number, shop: string): NpcDef => person(id, name, examine, seed, { options: ["Talk-to", "Trade"], shop });
const villager = (id: string, name: string, examine: string, seed: number, extra: [string, number][]): NpcDef => person(id, name, examine, seed, {
  options: ["Talk-to", "Pickpocket"], pickpocket: { level: 38, xp: 58, coins: [24, 130], stun: 4, damage: 2, extra } });

export const MEGHAVAN_NPCS: Record<string, NpcDef> = {
  // The Gate of Rains.
  rain_gate_guard: soldier("rain_gate_guard", "Gate of Rains guard", "One of Ilavarta's border guards in tank blue, a long umbrella of oiled paper strapped to his back beside the spear.", 1700),
  // Tirthali, the ford town.
  tirthali_amul: person("tirthali_amul", "Ferrywarden Amul", "Keeper of the Tirthali ford and of its ledger of crossings. Half Kharaveth and half Meghavan, he says, and all Tirthali, and he'll sell you a crossing in either half.", 1701),
  tirthali_innkeeper: trader("tirthali_innkeeper", "Mother Kesari", "Keeps the caravanserai. She has fed camel drivers from Khetmar and boatmen from the Golden Shore at the same table, and stopped three wars over the pickle.", 1702, "tirthali_inn"),
  tirthali_merchant: trader("tirthali_merchant", "Hamir", "Keeps the stores by the caravanserai. Prices in Kharaveth gold and Meghavan copper, and does the sums faster than you can.", 1703, "tirthali_stores"),
  tirthali_clothier: trader("tirthali_clothier", "Nalini the dyer", "Tirthali's dyer, her hands blue to the wrist with indigo and yellow at the nails with turmeric.", 1704, "tirthali_clothier"),
  tirthali_dealer: person("tirthali_dealer", "Pedlar Chandu", "A pedlar with a covered basket and a smile that comes and goes. The things under the cloth are old, and some of them still have earth on them.", 1705),
  tirthali_guard: soldier("tirthali_guard", "Ford watchman", "A watchman of the ford, paid by the ferrywarden, in a turban of no particular kingdom.", 1706),
  tirthali_villager: villager("tirthali_villager", "Tirthali local", "Someone of the ford town, in a Kharaveth headcloth and a Meghavan shawl, which here is just what people wear.", 1707, [["spiced_tea", 0.4], ["flatbread", 0.3]]),
  // Sarovan: Ilavarta.
  sarovan_saumitra: person("sarovan_saumitra", "Queen Saumitra", "Queen of Ilavarta, Keeper of the Tanks. Her crown is a ring of silver set with a single lapis drop, for a tank seen from above, and she has a mason's calluses under the rings.", 1710),
  sarovan_engineer: person("sarovan_engineer", "Chief Engineer Devakar", "The Queen's chief engineer: canals, sluices, tanks, and the silt in all of them. He carries a measuring rod and a list of costs, and uses both as arguments.", 1711),
  sarovan_treasurer: person("sarovan_treasurer", "Treasurer Ambika", "Treasurer of the Tank Temple, which holds the offerings of three centuries. She says the offerings belong to the river; the engineers say the river needs them now.", 1712),
  sarovan_factor: person("sarovan_factor", "Factor Ozren Vale", "A grain factor of the Gilded Court of Sefrah, in white linen, with a Kharaveth accent and a great deal of interest in the price of rice.", 1713),
  sarovan_tankwarden: person("sarovan_tankwarden", "Ghat-keeper Moti", "Keeper of the Great Tank's ghats: sweeps the steps at dawn, lights the corner lamps at dusk, knows every family that bathes here by the way they come down.", 1714),
  sarovan_tollkeeper: soldier("sarovan_tollkeeper", "Bridge toll-keeper", "Keeps the Queen's toll at the bridge south of Sarovan: by the head, by the cart, by the beast, and an extra copper for asking why.", 1715),
  sarovan_merchant: trader("sarovan_merchant", "Ishaan", "Keeps the general goods shop by the palace. Sells everything a household needs, and tells every customer what the palace is arguing about this week.", 1716, "sarovan_general"),
  sarovan_clothier: trader("sarovan_clothier", "Padma the weaver", "Sarovan's weaver, working tank blue and lotus white on a loom her grandmother built.", 1717, "sarovan_clothier"),
  sarovan_innkeeper: trader("sarovan_innkeeper", "Uncle Bhim", "Keeps the Lotus Inn, and has opinions about everyone who has ever eaten in it, mostly kind.", 1718, "sarovan_inn"),
  sarovan_smith: trader("sarovan_smith", "Gauri the smith", "Sarovan's smith: sluice gates for the engineers, sabres for the tank guards, and a temper for the treasurers, who are slow to pay for either.", 1719, "sarovan_forge"),
  sarovan_guard: soldier("sarovan_guard", "Tank guard", "One of the Queen's tank guards, in blue and white, a curved sabre at the hip and a water-measure on a cord round the neck.", 1720),
  sarovan_villager: villager("sarovan_villager", "Sarovan citizen", "A citizen of Sarovan on the way to the ghats, or the market, or the palace gate to hear what's been decided.", 1721, [["mango", 0.5], ["rice_and_dal", 0.2]]),
  // Shailagarh.
  shailagarh_varanjit: soldier("shailagarh_varanjit", "Lord Varanjit", "Lord of Shailagarh, the passes and the mines. A big quiet man in highland wool and fine mail, who listens until you've finished and then a little longer.", 1730),
  shailagarh_captain: soldier("shailagarh_captain", "Captain Ysolde Marr", "Captain of a Copper Banner company out of Khetmar, hired by Lord Varanjit by the season. She'll tell you she's a soldier, not a guest, and Ilavarta that she's neither.", 1731),
  shailagarh_metallurgist: person("shailagarh_metallurgist", "Assayer Nirmal", "Shailagarh's assayer, who tests every ingot that leaves the mines, and trades letters about furnaces with the Obsidian Legacy's masons at Tamesh.", 1732),
  shailagarh_merchant: trader("shailagarh_merchant", "Kunal", "Keeps the stores on the fortress road. Everything up here costs more, he says, because everything up here had to climb.", 1733, "shailagarh_general"),
  shailagarh_clothier: trader("shailagarh_clothier", "Wool-mistress Dolma", "Spins and weaves the highland wool, and can tell a pass-born sheep from a valley sheep by the feel of the yarn.", 1734, "shailagarh_clothier"),
  shailagarh_innkeeper: trader("shailagarh_innkeeper", "Old Hari", "Keeps the Pass Fire. The fire hasn't gone out in forty years, and neither has Old Hari's pipe.", 1735, "shailagarh_inn"),
  shailagarh_smith: trader("shailagarh_smith", "Forge-master Uday", "Shailagarh's forge-master, who makes Shaila mail one ring at a time and signs each coat inside the collar.", 1736, "shailagarh_forge"),
  shailagarh_guard: soldier("shailagarh_guard", "Shailagarh sentry", "A sentry of the fortress in a red blanket-cloak, watching the passes, the mines, and lately the Copper Banner's companies.", 1737),
  shailagarh_miner: person("shailagarh_miner", "Shaila miner", "A miner of the highland seams, grey with rock dust, a lamp on a hook and a pick over the shoulder.", 1738),
  shailagarh_villager: villager("shailagarh_villager", "Shailagarh local", "Someone of the fortress town in highland wool, cheeks red with the wind.", 1739, [["spiced_tea", 0.4]]),
  // Mandapur: the League of Seven Parasols.
  mandapur_speaker: person("mandapur_speaker", "Speaker Hemavati", "Speaker of the League of Seven Parasols for this year, the ruler of Hemapura for the rest of her life. She speaks for all seven and is careful to sound like none of them.", 1740),
  mandapur_raja: person("mandapur_raja", "Raja Indrasen of the Salt Fens", "The ruler of the Salt Fens, smallest of the seven, whose parasol is white and whose vote is always for sale, he says, though nobody has ever afforded it.", 1741),
  mandapur_tollclerk: person("mandapur_tollclerk", "Toll-clerk Pranav", "Keeps the League's toll books. Seven rulers, seven rates, one clerk, and he has never once been thanked.", 1742),
  mandapur_merchant: trader("mandapur_merchant", "Vasant", "Keeps the stores across from the Mandapa, and sells the delegations everything they forgot to bring, which is everything.", 1743, "mandapur_general"),
  mandapur_clothier: trader("mandapur_clothier", "Champa the weaver", "Weaves the League's delegates their coats, cords and all, and knows exactly how each of the seven ties them.", 1744, "mandapur_clothier"),
  mandapur_innkeeper: trader("mandapur_innkeeper", "Bhanu", "Keeps the Seven Shades, where the League's arguments go after the Mandapa closes.", 1745, "mandapur_inn"),
  mandapur_smith: trader("mandapur_smith", "Revati the smith", "Mandapur's smith, who makes push-daggers for the delegates' guards and parasol ribs for the delegates.", 1746, "mandapur_forge"),
  mandapur_guard: soldier("mandapur_guard", "Parasol guard", "A guard of the League in a purple sash, a different ruler's badge on each shoulder this month.", 1747),
  mandapur_villager: villager("mandapur_villager", "Mandapur local", "Someone of the council town, who has heard every argument in the League twice and has a third of their own.", 1748, [["mango", 0.4], ["spiced_tea", 0.3]]),
  // Suvarnatira: the free port.
  suvarnatira_lalitha: person("suvarnatira_lalitha", "Provost Lalitha", "Provost of Suvarnatira, elected by the Assembly of Ink and Coin for her honesty and kept for her memory, which is long and specific.", 1750),
  suvarnatira_archivist: person("suvarnatira_archivist", "Archivist Mahir", "Keeper of the Archive's catalogue: a slight man with ink to the elbows, who reads the old scripts of four countries and argues with the dead in all of them.", 1751),
  suvarnatira_envoy: person("suvarnatira_envoy", "Envoy Saqqet", "An envoy of the Obsidian Legacy of Tamesh, in black linen with a lapis border, here about a star chart the Legacy says is theirs.", 1752),
  suvarnatira_scholar: person("suvarnatira_scholar", "Assembly scholar", "A scholar of the Assembly with a satchel of palm-leaf books, reading as they walk.", 1753),
  suvarnatira_merchant: trader("suvarnatira_merchant", "Anselm Dray", "A ship's chandler from somewhere across the sea, who came to Suvarnatira for a season twenty years ago.", 1754, "suvarnatira_general"),
  suvarnatira_clothier: trader("suvarnatira_clothier", "Roshni the silk-seller", "Sells silk from the far east and cotton from the valley, and dyes the Assembly's stoles in a vat she won't let anyone see.", 1755, "suvarnatira_clothier"),
  suvarnatira_innkeeper: trader("suvarnatira_innkeeper", "Farida", "Keeps the Inkwell Inn, where scholars pay in coin and merchants pay in news.", 1756, "suvarnatira_inn"),
  suvarnatira_smith: trader("suvarnatira_smith", "Kavya the smith", "Suvarnatira's smith: anchors, hinges, sabres for the harbour watch, and the Archive's brass lamps.", 1757, "suvarnatira_forge"),
  suvarnatira_guard: soldier("suvarnatira_guard", "Harbour watch", "A guard of the free port's harbour watch, sea-green sash, sabre, and a whistle she isn't afraid to use.", 1758),
  suvarnatira_sailor: person("suvarnatira_sailor", "Sailor", "A sailor off a trading dhow, salt in the beard and tar on the hands.", 1759),
  suvarnatira_villager: villager("suvarnatira_villager", "Suvarnatira citizen", "A citizen of the free port, with ink on one hand and a coin in the other.", 1760, [["spiced_tea", 0.4], ["mango", 0.3]]),
  // Kanthar: the Kanthari.
  kanthar_sukesh: person("kanthar_sukesh", "Grandmother Sukesh", "Eldest of the Kanthari of Kanthar, small, sharp, wrapped in leaf-green. She has sent away tax collectors from three kingdoms and offered all of them tea first.", 1770),
  kanthar_trader: trader("kanthar_trader", "Tula the weaver", "Weaves bamboo and bark-cloth, and trades the village's cloth for rice and salt when the river is low enough to carry them.", 1771, "kanthar_trader"),
  kanthar_hunter: person("kanthar_hunter", "Kanthari hunter", "A hunter of the Deepgreen with a bamboo bow and no shoes, who has heard you coming for some time.", 1772),
  kanthar_villager: villager("kanthar_villager", "Kanthari villager", "One of the Kanthari, in leaf greens and seed beads.", 1773, [["mango", 0.5]]),
  deepgreen_logger: person("deepgreen_logger", "Highland logger", "A logger from the highlands in a wool cap, felling teak for Shailagarh's pit props on a licence the Kanthari never signed.", 1774),
};

const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];

export function talkMeghavan(game: Game, npcId: string, name: string): Dialogue | null {
  const say = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  switch (npcId) {
    // ---------- The Gate of Rains ----------
    case "rain_gate_guard": return say(pick(game, ["Welcome to Meghavan. It will rain this afternoon. It rained yesterday afternoon. It will rain tomorrow.", "Tirthali is east, along the road. Don't leave the road at dusk: the dacoits know it better than we do.", "Kharaveth? We see their caravans every week. They come in dusty and go out wet."]));
    // ---------- Tirthali ----------
    case "tirthali_amul": return say(pick(game, ["The ford's free, the bridge at Sarovan isn't. That's why Tirthali exists, and why the Queen sighs when she hears its name.", "Everyone crosses here: caravans, pilgrims, Shailagarh's ore, the League's spice. I write them all down. Some of them I write down very small.", "Half the town came from Kharaveth, half from here, and all of it argues in both languages."]));
    case "tirthali_innkeeper": return say(pick(game, ["Sit, eat. Rice and lentils, flatbread, tea. If you want something else, you're in the wrong caravanserai.", "Khetmar's riders and Shailagarh's miners at one table, and nobody's drawn a blade yet tonight. That's my cooking."]));
    case "tirthali_merchant": return say(pick(game, ["Kharaveth gold or Meghavan copper? Either. Both. I'll make the change in the third.", "Salt from the Ouresh, pepper from the shore. Everything crosses at Tirthali, and some of it stays."]));
    case "tirthali_clothier": return say("Madder red, indigo blue, turmeric yellow. Tirthali dresses like both its halves and gets wet like neither.");
    case "tirthali_dealer": return say(pick(game, ["Old things. Beautiful old things. Where from? From the ground, friend, where all old things come from.", "A Queen's officer asked me what was in the basket. I told him lunch. It's mostly lunch.", "The Archive in Suvarnatira pays well for anything with writing on it. They don't ask, and I don't tell."]));
    case "tirthali_guard": return say(pick(game, ["The ferrywarden pays us. Not the Queen, not the League. That's why we're polite to everyone.", "Watch your purse by the ford. The langurs come down from the hills and they've learned knots."]));
    case "tirthali_villager": return say(pick(game, ["My father came from Kharaveth with a caravan and stayed for my mother. Half the town has a story like that.", "The ford's low in the dry months, deep in the wet. You learn to read the water or you learn to swim.", "Sarovan's that way. They'll tell you it's the centre of the world. It's the centre of Ilavarta, which is smaller."]));
    // ---------- Sarovan ----------
    case "sarovan_saumitra": return say(pick(game, ["A Queen of Ilavarta is crowned at the Great Tank, with water poured on her hands. If the tanks fail, so does she. My great-grandmother's did, and so did she.", "My engineers want the temple's gold to dig out the silt. My treasurers want it to stay where the river gave it. Both of them are right, which is the worst kind of argument.", "The League wants our water, Shailagarh wants our roads, the Gilded Court wants our rice. Everyone wants Ilavarta except Ilavarta, who just wants rain."]));
    case "sarovan_engineer": return say(pick(game, ["Every tank in the valley is a third full of silt. A third! In ten years the rain will run straight to the sea, and so will we.", "The temple has three centuries of offerings in its vaults. Three centuries of gold, given to the river. I'm only asking to give it to the river properly.", "Look at this rod. That's the Great Tank's depth when I was a boy. This mark's today. Do the arithmetic; I have."]));
    case "sarovan_treasurer": return say(pick(game, ["The engineers would empty the vaults into a ditch and call it a canal. What's given to the river isn't ours to spend.", "Devakar is a good man with a bad plan. He'd dig out the silt and in ten years dig it out again. Someone must pay for the forests upstream that let it in.", "The offerings are an account the river keeps. You don't spend an account; you keep it."]));
    case "sarovan_factor": return say(pick(game, ["The Gilded Court buys Ilavarta's rice. Ilavarta buys Kharaveth's salt and linen. Everybody's happy, mostly.", "Prices? Prices are the weather. I merely carry an umbrella.", "Lady Seleneh sends her regards to the Queen. And an offer for next year's harvest, at this year's price."]));
    case "sarovan_tankwarden": return say(pick(game, ["Dawn and dusk, the whole city comes down the ghats. You can tell who's quarrelling by who takes which steps.", "The water's lower than my father's day. Lower than my day, come to that. The engineers say silt. I say sorrow, but I'm only a ghat-keeper."]));
    case "sarovan_tollkeeper": return say(pick(game, ["Toll's by the head, by the cart, by the beast. The ford at Tirthali's free, if you like wet boots.", "The League says the Queen's toll is robbery. The Queen says the bridge didn't build itself. I say pay up, please."]));
    case "sarovan_merchant": return say(pick(game, ["Rice, lentils, wicks, rope. Everything a house needs, and the news from the palace thrown in.", "The engineers were in here buying rope. The treasurers were in here buying locks. Draw your own conclusions."]));
    case "sarovan_clothier": return say("Tank blue and lotus white: Ilavarta's colours. Wear them at the ghats and the old women will nod at you.");
    case "sarovan_innkeeper": return say(pick(game, ["Welcome to the Lotus! The rice is from the valley, the lentils from the plains, and the arguments from the palace.", "Eat before the rain. Everybody comes in at once when it starts."]));
    case "sarovan_smith": return say(pick(game, ["Sluice gates for the engineers, sabres for the guards, and an invoice for the treasurers they haven't paid since spring.", "An Ilavati sabre: curved for the cut, a disc on the pommel so it doesn't leave your hand on wet steps."]));
    case "sarovan_guard": return say(pick(game, ["Keep to the ghats' left side going down, right side coming up. It's the law, and the old women enforce it.", "The Queen's peace is kept in Sarovan. Outside the walls it's kept by whoever's nearest."]));
    case "sarovan_villager": return say(pick(game, ["The Queen will find the money. She always finds the money. The question is whose.", "My grandmother swam in the Great Tank at its deepest. I can stand in it now.", "Have you tried the mangoes? Of course you haven't, you're still dry. Here: no, they're mine. Buy your own."]));
    // ---------- Shailagarh ----------
    case "shailagarh_varanjit": return say(pick(game, ["The passes are mine and the mines are mine. I didn't take them from anyone; I just stayed when everyone else went down to the warm.", "Ilavarta calls my Copper Banner companies foreign interference. Ilavarta has never paid a highland soldier through a winter.", "Tamesh's masons and my assayers share what they know of the furnace. Stone and iron should talk. Kings rarely do."]));
    case "shailagarh_captain": return say(pick(game, ["The Marshal sells our swords by the season and Lord Varanjit buys them. It's honest work, if you don't ask the Queen.", "Two of my riders went over the pass and didn't come back. Deserters, the Lord says. Unpaid, I say. Same thing, in the end."]));
    case "shailagarh_metallurgist": return say(pick(game, ["Blackiron from the north seam, moonsilver from the east. I test every ingot, and Tamesh tests my tests.", "The Obsidian Legacy writes to me about furnace draughts. I write back about their quarries. We've never met, and we're the best of friends."]));
    case "shailagarh_merchant": return say("Rope, pitons, lamp oil, blankets. You'll want all four before the pass, and you'll only remember three.");
    case "shailagarh_clothier": return say("Highland wool. It itches, it smells of sheep, and it keeps you alive. Pick two.");
    case "shailagarh_innkeeper": return say(pick(game, ["Forty years this fire's been lit. Sit by it. Everybody does, in the end.", "Miners, soldiers, smugglers, a princess once. The fire doesn't ask, and neither do I."]));
    case "shailagarh_smith": return say("Shaila mail: ten thousand rings, every one riveted. I sign them inside the collar, so you know who to blame.");
    case "shailagarh_guard": return say(pick(game, ["Three passes, one fortress. The fortress wins.", "The hired companies drink at the Pass Fire. We drink somewhere else."]));
    case "shailagarh_miner": return say(pick(game, ["The north seam's blackiron, the east seam's moonsilver, and the deep seam glimmers. Pay the tithe and dig where you like.", "Bears in the scree, deserters in the passes, and the tithe-man at the door. A miner's life.", "The loggers bring props down from the Deepgreen. The Kanthari don't like it. The mine doesn't care who likes it."]));
    case "shailagarh_villager": return say(pick(game, ["Lord Varanjit's fair. Hard, but fair. Like the mountain.", "The valley folk say we're cold. We say they're damp."]));
    // ---------- Mandapur ----------
    case "mandapur_speaker": return say(pick(game, ["The League is seven rulers who'd each rather be one. For a year I speak for all of them, and every one of them thinks I'm speaking for the others.", "Ilavarta's bridge toll is a tax on the whole plain. We've told the Queen so, politely, seven times.", "No parasol stands higher than another's. That's the whole of our law, and it's harder to keep than it sounds."]));
    case "mandapur_raja": return say(pick(game, ["The Salt Fens are the smallest of the seven. We have one vote, a white parasol, and a great deal of salt. Two of those are useful.", "The Speaker is a fine woman. She'll be a finer one in a year, when it's somebody else's turn."]));
    case "mandapur_tollclerk": return say(pick(game, ["Seven rulers, seven rates, one toll. I add them up, divide them seven ways, and everybody says I've cheated them.", "League roads cost less than the Queen's bridge. That's the League's whole policy, really."]));
    case "mandapur_merchant": return say("Delegates forget everything. Ink, cord, sandals, their own ruler's name. I sell them all of it back.");
    case "mandapur_clothier": return say("Each of the seven ties the angarkha's cords their own way. Tie them wrong in the Mandapa and you've declared something.");
    case "mandapur_innkeeper": return say(pick(game, ["The Mandapa closes at dusk. The arguing moves here at dusk and a minute.", "Seven delegations, seven tables, and they all want the one by the window."]));
    case "mandapur_smith": return say("A push-dagger: you don't swing it, you punch it. The delegates' guards like them. They're quick, and they're quiet.");
    case "mandapur_guard": return say(pick(game, ["I've a different badge each month. This month I'm guarding the Red Hills. Next month, I'll guard them from the Red Hills.", "Keep your voice down near the Mandapa. Somebody's always about to say something important."]));
    case "mandapur_villager": return say(pick(game, ["The League argued for nine days about where to stand a parasol. Nine. My wedding took one.", "The plain is League country. The water in it is Ilavarta's, they say. The rain doesn't know whose it is.", "The Speaker is from Hemapura this year. Next year, the Two Rivers. They'll argue about that too."]));
    // ---------- Suvarnatira ----------
    case "suvarnatira_lalitha": return say(pick(game, ["Suvarnatira owes no crown. We owe the Assembly, and the Assembly owes its readers and its ships. It's a better debt.", "The Obsidian Legacy says our star chart is theirs. It may be. It may also be older than they are, which is the trouble with being the oldest blood.", "Ilavarta, the League, Shailagarh, the Kanthari: all of them send scholars to our Archive. None of them send money. We manage."]));
    case "suvarnatira_archivist": return say(pick(game, ["We read Azhurak glyphs differently here than the Orashai do. They read them as words. We read them as numbers that forgot what they counted.", "Four hundred thousand leaves in the Archive, and a catalogue of three hundred thousand. Somewhere in the other hundred is everything.", "The star chart? Azhurak, I'm almost sure. Almost. The Legacy's envoy is entirely sure, which makes me less."]));
    case "suvarnatira_envoy": return say(pick(game, ["The chart was carried out of Kharaveth a hundred years ago by a thief who sold it here. The Legacy keeps every monument of Azhurak. This is one.", "The Provost is gracious. The Archivist is learned. Neither of them will give me the chart. I am patient; I'm from Tamesh."]));
    case "suvarnatira_scholar": return say(pick(game, ["Sorry, I was reading. I'm always reading. Did you know the Kanthari count in twelves?", "The Archive's open to anyone with clean hands and a reason. My reason is that I can't stop."]));
    case "suvarnatira_merchant": return say("Rope, tar, biscuit, oil, charts. A port's needs are simple; it's the sailors who aren't.");
    case "suvarnatira_clothier": return say("Silk from the east, cotton from the valley, and the Assembly's ink-dye, which is a secret. A good one.");
    case "suvarnatira_innkeeper": return say(pick(game, ["Scholars pay in coin, merchants pay in news. Sailors pay in songs, mostly, which is why they eat at the back.", "Sit by the window, you'll see every ship come in. Sit by the door, you'll hear what's on them."]));
    case "suvarnatira_smith": return say("Anchors, hinges, sabres and lamps. The Archive orders the lamps by the hundred. Reading is hard on brass.");
    case "suvarnatira_guard": return say(pick(game, ["Harbour watch. The corsairs work the shore south of here. If you see a low black boat, don't wave.", "No crown, no toll on books. Plenty of tolls on everything else, though."]));
    case "suvarnatira_sailor": return say(pick(game, ["Monsoon wind takes us east in summer and brings us home in winter. You don't sail against it; you wait.", "Seen the far islands, I have. Seen the Mizukai ships too, way off. They don't stop here. Yet."]));
    case "suvarnatira_villager": return say(pick(game, ["Free port, free city, free advice: don't argue with a librarian.", "The Provost walks to the Hall every morning. Anyone can stop her and complain. Most people do.", "Ink in one hand, coin in the other. That's the Assembly, and that's Suvarnatira."]));
    // ---------- Kanthar ----------
    case "kanthar_sukesh": return say(pick(game, ["Three kingdoms have sent people to count us. We gave them tea, and they went home, and they're still counting.", "The loggers come further in every year with Shailagarh's stamp on their axes. The forest doesn't belong to Shailagarh. It doesn't belong to us, either; we belong to it.", "Ilavarta wants us as a province, the League as an eighth parasol. A parasol is for keeping the sky off. We like the sky."]));
    case "kanthar_trader": return say("Bark-cloth, bamboo, beads. The river's low, so I'll take rice and salt for them. In the wet months I'll take nothing; nothing gets here.");
    case "kanthar_hunter": return say(pick(game, ["You walk like a cart. The tiger heard you an hour ago. Lucky for you it's not hungry.", "Don't take more than you need from the forest. It counts, and it remembers."]));
    case "kanthar_villager": return say(pick(game, ["Ask before you cut anything here. Even a leaf. Especially a leaf.", "The houses stand on stilts because the river comes up every monsoon. We don't fight the river. We step back.", "Grandmother Sukesh decides. Grandmother has decided most things since before my mother was born."]));
    case "deepgreen_logger": return say(pick(game, ["We've a licence from Shailagarh. The Kanthari say Shailagarh can't licence what isn't its own. We just fell the trees.", "Pit props, for the mines. No props, no mines, no blackiron, no sabres. Everybody wants the sabres."]));
  }
  return null;
}

/** Meghavan's clues (things in the world to look into: see kharaveth.ts CLUES). */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const readClue = (text: string, examine: string): Clue => ({ options: () => ["Read"], examine: () => examine, use: () => ({ text }) });
/** A writing the Archive of Unfinished Things wants a rubbing of (meghavanschools.ts), while its initiation asks for one. */
const rubbed = (id: "rain_gate_plaque" | "speakers_stone", clue: Clue): Clue => ({
  options: (game, object) => canRub(game, id) ? [...clue.options(game, object), "Take-rubbing"] : clue.options(game, object),
  examine: clue.examine,
  use: (game, object, option) => option === "Take-rubbing" ? { text: takeRubbing(game, id) ?? "You have a rubbing of it already." } : clue.use(game, object, option),
});
export const MEGHAVAN_CLUES: Record<string, Clue> = {
  rain_gate_plaque: rubbed("rain_gate_plaque", readClue("Cut in two scripts, Meghavan's and Kharaveth's: 'Here the rain begins. Whoever passes under the clouds is a guest of the rain; whoever does harm under them is the rain's enemy.' Under it, newer and smaller: 'Tolls payable at Tirthali or Sarovan, by order of the Keeper of the Tanks.'",
    "A bronze plaque set in the gateway's south pillar, green with weather.")),
  great_tank_measure: readClue("A stone post marked in the Queen's hands of depth, the old marks cut deep and gilded, the water's line now three marks below the lowest gilt. Someone has scratched beside it, small: 'Silt, or sorrow?'",
    "The Great Tank's measure: a carved post at the top of the ghats."),
  great_stepwell: readClue("Steps go down four sides of a square shaft, landing after landing, galleries of carved pillars along each, to green water far below. A chain is across the lowest landing you can see, and a brass notice: 'Closed by order of the Chief Engineer. Silt. Do not descend.'",
    "The Great Stepwell: a stair of carved stone going down, down, to water."),
  speakers_stone: rubbed("speakers_stone", readClue("A low stone in the middle of the Mandapa, worn smooth where seven generations of Speakers have stood. Cut round its edge: 'I speak for seven. Seven hear me. None stands higher.' Someone has added, in chalk: 'Except when it rains.'",
    "The Speaker's stone, at the heart of the Mandapa.")),
};
