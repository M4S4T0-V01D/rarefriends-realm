/**
 * A Place to the North: its people (northworld.ts places them). The Vargskeld in the west ("No chain is stronger than an
 * oath freely given") and the Zoryavik in the east ("An oath means nothing if you abandon what it was sworn to protect"),
 * the old agreement that kept the passes between them, and the organizations on both sides that remember it differently.
 * This is the foundation: who they are, where they stand, what they say about each other and the breaking agreement.
 * The questlines build on it.
 */
import type { Dialogue, Game } from "./state.ts";
import { chat, npcSays, type NpcDef } from "./content.ts";

const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: 9, seed }, ...extra });
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];

export const NORTH_NPCS: Record<string, NpcDef> = {
  // ---------- The Vargskeld ----------
  jarl_hallveig: person("jarl_hallveig", "Jarl Hallveig of Skarnholm", "Holds the Skarnfjord because the people of the Skarnfjord let her. She has never forgotten it, and never lets them forget it either.", 2101),
  lawspeaker_signy: person("lawspeaker_signy", "Lawspeaker Signy", "Keeps the law in her head, as every lawspeaker has: she recites a third of it at every Thing, so in three years everyone has heard all of it.", 2102),
  farwake_master: person("farwake_master", "Guildmaster Torvald of the Farwake", "Navigator, chart-keeper and merchant. Has sailed further than the maps, and drawn the maps since.", 2103),
  shipwright_bersi: person("shipwright_bersi", "Bersi the shipwright", "Builds longships the old way: by eye, by hand, and by arguing with the timber until it agrees.", 2104),
  skarnholm_innkeeper: person("skarnholm_innkeeper", "Gudrun of the Grey Gull", "Keeps the mead hall. Knows which jarl's people drink where, and keeps them apart.", 2105),
  skarnholm_trader: person("skarnholm_trader", "Skarnholm trader", "Sells what the ships brought in this morning, and what they'll take out tomorrow.", 2106),
  ravnsvik_netmender: person("ravnsvik_netmender", "Asta the net-mender", "Mends Ravnsvik's nets and its arguments, with the same patience.", 2107),
  oathmaster_brand: person("oathmaster_brand", "Oathmaster Brand", "Keeps the oath-stone at Oathsworn Hall. Has sworn three oaths in his life, kept two, and talks about the third.", 2108),
  oathsworn_warrior: person("oathsworn_warrior", "Oathsworn warrior", "Swore to the Hall of their own free will, and could leave tomorrow. Hasn't.", 2109),
  ember_keeper_yrsa: person("ember_keeper_yrsa", "Ember-keeper Yrsa", "Keeps the Last Ember and the names of the dead. Says the two are the same work.", 2110),
  ember_skald: person("ember_skald", "Embermoot skald", "Tells the stories of the dead, the true ones and the ones the families asked for.", 2111),
  redwake_captain: person("redwake_captain", "Captain Ulfa of the Redwake", "Captain of a mercenary company with a written code. Fights for whoever pays, until the code says otherwise.", 2112),
  redwake_sellsword: person("redwake_sellsword", "Redwake sellsword", "A sword for hire, with the company's red wave on the shield and a contract in the boot.", 2113),
  vargskeld_villager: person("vargskeld_villager", "Vargskeld villager", "Fisher, farmer or sailor, and probably all three by the end of the year.", 2114),
  vargskeld_housecarl: person("vargskeld_housecarl", "Housecarl", "Sworn to Jarl Hallveig. Chose her; could choose again.", 2115),
  // ---------- The Zoryavik ----------
  prince_radomir: person("prince_radomir", "Prince Radomir of Krasnogor", "Eldest of the princes, and certain that the eldest speaks for the land. His father thought so too.", 2116),
  princess_vesna: person("princess_vesna", "Princess Vesna of the Upper Krasna", "Holds the upper river and its forts, and the view that whoever defends the land speaks for it.", 2117),
  hearth_father_ilya: person("hearth_father_ilya", "Hearth-Father Ilya", "Keeps the House of the Hearth-Fathers: the ancestors' names, the household rites, the bread and the salt.", 2118),
  krasnogor_innkeeper: person("krasnogor_innkeeper", "Marfa of the Bear and Bell", "Keeps the inn on the square, and the peace in it, with a ladle.", 2119),
  krasnogor_trader: person("krasnogor_trader", "Krasnogor merchant", "Furs, honey, wax and amber; and an opinion about every prince.", 2120),
  zoryavik_villager: person("zoryavik_villager", "Zoryavik villager", "Timber, field and hearth. Their family has worked the same land for nine generations, and remembers all nine.", 2121),
  zoryavik_druzhina: person("zoryavik_druzhina", "Druzhina guard", "One of the prince's own men, sworn to the house and the land under it.", 2122),
  hearthwarden_captain: person("hearthwarden_captain", "Hearthwarden-Captain Milena", "Commands the Hearthwardens at the pass. Defends the road for whoever walks it, which the princes find either noble or inconvenient.", 2123),
  hearthwarden: person("hearthwarden", "Hearthwarden", "Keeps the road and the people on it. Asks where you're going, and whether you'll be safe getting there.", 2124),
  freeholds_speaker: person("freeholds_speaker", "Speaker Zdenka of the Freeholds", "Speaks for the Freeholds Compact: free towns, miners and craftspeople who owe the princes nothing and say so.", 2125),
  bereslav_bargewoman: person("bereslav_bargewoman", "Olena the bargewoman", "Runs timber down the Bereza to the sea. Knows every shoal, and every toll the Compact doesn't pay.", 2126),
  zlatna_foreman: person("zlatna_foreman", "Foreman Kazimir", "Runs the mines at Zlatna Gora for the Compact. Has heard every argument for the princes' share, and lost interest in all of them.", 2127),
  archivist_bozhena: person("archivist_bozhena", "Archivist Bozhena", "Keeps the Dawn Archive's chronicles, including the ones that contradict each other. Especially those.", 2128),
  archive_copyist: person("archive_copyist", "Archive copyist", "Copies the chronicles by hand, and notices when the copies don't match.", 2129),
  old_bough_keeper: person("old_bough_keeper", "Old Dobromir of the Bough", "Keeps the Circle's grove. Speaks to the oak more than to people, and is answered more often.", 2130),
};

/** The agreement as each side tells it: the same broken thing, seen from either end of the pass. */
const AGREEMENT_V = "The agreement? The passes kept open by both peoples, the roads kept by both, each to stand by the other when the sea or the cold came for them. The Zoryavik stopped keeping their half. Ask them why; they'll tell you a story.";
const AGREEMENT_Z = "The agreement was sworn at the Oathgate: both peoples to keep the passes and the roads, and stand together. The Vargskeld left their half when it stopped paying. They call that freedom.";

export function talkNorth(game: Game, npcId: string, name: string): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const ask = (opening: string[], options: readonly (readonly [string, readonly string[]])[]) => chat(name, npcSays(name, ...opening),
    [...options.map(([label, reply]) => ({ label, then: () => says(...reply) })), { label: "Goodbye.", then: () => null }]);
  switch (npcId) {
    case "jarl_hallveig": return ask(["Welcome to Skarnholm. You came the long road over the land-bridge? Then you've seen more of the north already than most of my housecarls."], [
      ["What is the old agreement?", [AGREEMENT_V, "I'll keep my half until it costs my people more than it saves them. That's not breaking an oath. That's keeping the one I swore to them."]],
      ["Who rules the Vargskeld?", ["Nobody rules the Vargskeld. The jarls lead whoever chooses to follow, and the Thing decides what the law is. If my people stopped choosing me, I'd be a woman with a large hall."]]]);
    case "lawspeaker_signy": return ask(["The law is said aloud at the Thing, a third of it every year. Nothing written can be changed in the night. Nothing said can be forgotten if enough people heard it."], [
      ["What does the law say about the agreement?", ["That it was sworn freely, by both peoples, and binds those who swore it. Whether it binds their grandchildren is the question the Thing has been arguing for three summers."]]]);
    case "farwake_master": return ask(["The Farwake charts the sea, the coasts and the passes, and sells the charts to anyone who can pay. We go where the maps run out, and come back with better maps."], [
      ["Why do the passes matter so much?", ["Timber and iron come over the ridge from the Zoryavik; fish, salt and ships go back. Close the passes and both peoples go without. Everyone knows it. Nobody wants to be the one who opens them first."]]]);
    case "shipwright_bersi": return says(pick(game, ["A longship is built from the keel up and from the people out: a crew that wants to sail her. Timber's the easy part.", "Oak for the keel, pine for the planks, iron for the rivets, and the Zoryavik's iron is the best there is. Was. Before the pass closed."]));
    case "skarnholm_innkeeper": return says(pick(game, ["Hallveig's people drink by the door, the Outer Isles folk by the fire. Don't sit between them.", "Mead's from Skarnholm honey. Bread's from Zoryavik rye, when the carts come. They've not come since spring."]));
    case "skarnholm_trader": return says("Dried cod, salt, rope and sealskin. Zoryavik iron, when there is any, at a price you won't like.");
    case "ravnsvik_netmender": return says(pick(game, ["The herring know nothing about agreements. They come when they come.", "My grandmother married a Zoryavik timber-man. Half of Ravnsvik did, one way or another. Ask the jarls what that makes us."]));
    case "oathmaster_brand": return ask(["Every name on that stone chose to be there. Nobody here was born to serve, or bought, or ordered. They swore, and they can unswear, and most of them never do."], [
      ["What is an oath worth, if you can unswear it?", ["Everything. A chain holds you whether you mean it or not. An oath only holds while you do. No chain is stronger than an oath freely given."]],
      ["And the agreement?", ["Our grandparents swore it freely. Did we? That's the question nobody at the Thing will answer straight."]]]);
    case "oathsworn_warrior": return says(pick(game, ["I swore to the Hall at sixteen. I could walk away tomorrow. That's why I won't.", "Loyalty and obedience aren't the same thing. The Oathmaster makes us learn the difference before he lets us swear."]));
    case "ember_keeper_yrsa": return ask(["The Last Ember has burned since the first ship came ashore. We keep it, and the names of everyone who has died since. A name forgotten is a person lost twice."], [
      ["What do the Keepers remember of the agreement?", ["The skalds tell it three ways, and the families of those who swore it tell it four. We keep all of them. Which is true is not ours to choose; keeping them all is."]]]);
    case "ember_skald": return says(pick(game, ["Ask me for a name and I'll tell you the life that goes with it. Ask me for the truth and I'll tell you which version.", "Hallveig's grandmother swore the agreement at the Oathgate. I have the verse. So does the Zoryavik archive, and our verses don't match."]));
    case "redwake_captain": return ask(["The Redwake fights for pay and keeps its code. We've fought for jarls, for princes and for both against each other. The code says we finish a contract, and we never take one against our own."], [
      ["Who are you fighting for now?", ["Nobody, yet. Three jarls and two princes have asked. When the pass closes properly, someone will pay a great deal, and we'll read the contracts very carefully."]]]);
    case "redwake_sellsword": return says("Coin, a code, and a company. More than most people have.");
    case "vargskeld_villager": return says(pick(game, ["Cold this year. Colder without the carts from over the ridge.", "The jarl asked us at the Thing. We said keep the agreement. Then we said don't. It was a long Thing.", "Free people, the Vargskeld. Free to be hungry, if the pass stays shut."]));
    case "vargskeld_housecarl": return says("I chose Hallveig. Mind her hall, and mind yourself in it.");
    case "prince_radomir": return ask(["Krasnogor welcomes you. You'll have heard the Vargskeld say we abandoned the agreement. We never left the Oathgate. They left it, when it stopped making them rich."], [
      ["What is the old agreement?", [AGREEMENT_Z, "I am the eldest prince. I speak for this land, as my father did, and his. That's what the agreement needs: someone who will answer for it."]],
      ["Who rules the Zoryavik?", ["The princes, by right and by duty. Some of my cousins think the right should go to whoever shouts loudest. Princess Vesna, for instance."]]]);
    case "princess_vesna": return ask(["My brother thinks being born first makes him the land's voice. I hold the upper Krasna, its forts and its people, and I've defended them while he wrote letters."], [
      ["Who speaks for the Zoryavik, then?", ["Whoever keeps the land. Radomir keeps a chair. An oath means nothing if you abandon what it was sworn to protect, and the agreement was sworn to protect the passes, not the princes."]]]);
    case "hearth_father_ilya": return ask(["Bread and salt, and welcome. The House keeps the ancestors' names and the household rites: who owes what to whom, back nine generations. Every family has its duties, and every duty has its family."], [
      ["What do the Hearth-Fathers say of the agreement?", ["That it was a duty passed down, like the hearth. You do not choose your grandmother's duties; you keep them, or you shame her. The Vargskeld think a duty you didn't choose isn't one. We think that's how they've lost so many."]]]);
    case "krasnogor_innkeeper": return says(pick(game, ["Radomir's men drink here, and Vesna's drink across the square, and the Hearthwardens drink wherever there's room.", "Kvass, honey-cake and cabbage soup. And no talk of princes at my tables."]));
    case "krasnogor_trader": return says("Furs, honey, wax and amber. Vargskeld salt, when the pass is open, which it isn't, which is why the salt costs what it does.");
    case "zoryavik_villager": return says(pick(game, ["The land gives what you give it. My family's given it nine generations.", "The princes argue about who speaks for the land. The land doesn't speak. We do the work.", "My uncle married a Vargskeld fisher-girl. We don't talk about it at the House. We talk about it everywhere else."]));
    case "zoryavik_druzhina": return says("For the prince and the land. In that order, if you ask the prince.");
    case "hearthwarden_captain": return ask(["The Hearthwardens keep the roads, the passes and the villages that sit on them. We were sworn to the land, not to any prince, and we take that oath very seriously indeed."], [
      ["Whose side are you on?", ["The road's. And everyone on it. A Vargskeld trader robbed on our side of the ridge is our shame, not his. The princes think that makes us unreliable. The traders think it makes us the only reliable thing left."]]]);
    case "hearthwarden": return says(pick(game, ["Road's safe as far as Krasnogor. Past that, keep your eyes open.", "Wolves on the east road, bandits on the west. The bandits are worse; the wolves at least only want to eat you."]));
    case "freeholds_speaker": return ask(["Bereslav pays no prince's toll. The Compact's towns, miners and craftspeople govern themselves, and the princes have spent a hundred years explaining why that's temporary."], [
      ["What does the Compact want?", ["The passes open, the roads safe, and the princes busy with each other. Trade feeds us; quarrels don't. We'd swear a new agreement tomorrow, and keep it, if anyone asked the people who actually do the work."]]]);
    case "bereslav_bargewoman": return says("Timber down the Bereza, salt and fish back up. When the pass shut, the river became the only road the Compact controls. Mind the shoals.");
    case "zlatna_foreman": return says(pick(game, ["Iron, coal and silver. The princes want the silver. The Compact says it was never theirs. The silver doesn't care.", "Best iron in the north. The Vargskeld shipwrights used to pay double for it. They will again, when the pass opens."]));
    case "archivist_bozhena": return ask(["The Dawn Archive keeps every chronicle of the Zoryavik, and every chronicle that disagrees with it. History isn't one book. It's an argument, carefully indexed."], [
      ["What do the chronicles say about the agreement?", ["Three copies of the agreement, all in the princes' own hand, and none of them say the same thing about who keeps the western pass. Someone changed them. I'd very much like to know who, and when, and for whom."]]]);
    case "archive_copyist": return says("I've copied the Oathgate chronicle four times. The fourth copy is wrong. So was the third. The first is missing.");
    case "old_bough_keeper": return ask(["Walk round, not through. The oak was old when the princes were young, and it will be old when they're forgotten. The Circle keeps the grove, the seasons and the rites, and asks nothing of anyone but care."], [
      ["Does the Circle take a side?", ["The land's side. The oak doesn't know which prince owns it, and it grows just the same. Both peoples once came here to swear. Now neither does."]]]);
  }
  return null;
}
