/**
 * Rumours: what people say when you ask. Every settlement has its own, some true, some half-true, some nonsense,
 * and a few that point at things nobody explains. Hearing a new one is worth a little Presence. Nothing here is
 * confirmed by the game itself; that's the point.
 */
import { addXp, type Game } from "./state.ts";
import { regionAt, type RegionId } from "./world.ts";

export type Rumour = { text: string; truth: "true" | "half" | "false" };
const r = (text: string, truth: Rumour["truth"] = "half"): Rumour => ({ text, truth });
export const RUMOURS: Partial<Record<RegionId, readonly Rumour[]>> = {
  friendhollow: [
    r("I've never seen King Hollis leave the castle. Not once. Not even for the Feast.", "true"),
    r("The castle wasn't built for a king. It was built against something that came from the west. Ask anyone old enough and watch them change the subject."),
    r("The Namekeeper's register goes back further than the town does. There are names in it in a hand nobody can read.", "true"),
    r("There's a door under the fountain. The water's to keep people from finding it.", "false"),
    r("Old Glimmer remembers when the Realm was new. Some say he remembers when it wasn't here at all."),
    r("The Mossy Ruins have a stair going down, under the moss. Whatever the ruins were, the cellars are still there, and so is the one who kept them.", "true"),
    r("Glass Lake's gone cloudy on the east shore, and there's a crack in the rock there that wasn't there in spring. Something under it glows at night.", "true"),
    r("Raria wasn't there before. I'll say it till I die. My uncle walked the Drakespine as a boy and there was nothing west but drakes.", "half"),
    r("No one remembers them crossing the Spine. Not one shepherd, not one drake-hunter. How does an entire kingdom simply appear?", "true"),
    r("They say Raria's been there for centuries and we just never looked. The castle looks west. Somebody looked, once.", "half"),
    r("The garrison by the square isn't for the Grumblins any more. Captain Ashby has a map with a hole in it.", "true"),
  ],
  farmland: [
    r("The windmill turns on still days. The miller says it's the slope. There is no slope.", "false"),
    r("A family out past the Westmarch road vanished years back. House is still there. Nobody's touched it.", "true"),
    r("The cows won't graze the north corner of the pen. Never have."),
    r("There's a cellar door in the grass past the mill. The miller says it's his. The miller has never gone down it.", "true"),
  ],
  fernwick: [
    r("Children here learn their trees before their letters. Hazel could name an oak from its shadow at six.", "true"),
    r("The Whisperwood whispers. That's not a name, that's a warning. Don't answer it."),
    r("Hazel's grandmother made a bow for the castle, once. They say it's still in the armoury. They say it's never been drawn.", "half"),
    r("Rowan swears there's a stump in the deep wood that grows back overnight."),
  ],
  emberforge: [
    r("Brann's forge was lit from an ember that never cools. He keeps it in a box and he won't say where the box is.", "true"),
    r("The Ashen Hills used to be green. The Ashen Hills used to be a lot of things."),
    r("Something under the hills sings when the furnace is hot. The smiths call it the draught. It isn't the draught."),
  ],
  highcairn: [
    r("The mountain shrine is older than the town, older than Dawnhold, older than the Order. The stones under it are older than that.", "true"),
    r("Dawnhold's knights weren't knights to begin with. They were the people who kept the altars swept. Then something happened at one.", "half"),
    r("There's a village beyond the Ironreach that doesn't like Friends. I've never met anyone who's been.", "half"),
    r("The golems in the Greyhorn mine aren't digging. They're guarding."),
  ],
  oasis: [
    r("The Oasis never runs dry. Not in drought, not in the hottest summer. The water comes from somewhere it shouldn't."),
    r("The stalls sell things from the dunes that nobody dug up. Ask where they came from and the price goes up.", "true"),
    r("Dune stalkers only hunt alone. If you see two, you're already in trouble."),
  ],
  frostpeak: [
    r("The Frostpeak camp was a town, once. The town's still up there, under the snow.", "half"),
    r("Yetis bury their dead. In the ice. Face down."),
    r("The wisps lead people off cliffs. Or to things. Depends who you ask, and whether they came back."),
  ],
  wizards_tower: [
    r("The Tower wasn't built by wizards. The wizards moved in after.", "half"),
    r("The Archmage has read a page that says the Friends did not come to this world. He has read another that says they were made here. He has stopped reading."),
  ],
  gravesend: [
    r("Don't take the old road past the third lantern after sunset. Something's been moving between the trees.", "true"),
    r("The Catacombs under the ruined chapel go further than anyone's walked. Mira says the bottom gallery has a door in it.", "half"),
    r("My grandmother comes to the fence on foggy nights. She's in the north plot. We wave.", "half"),
    r("The Deadwood was green once. The trees died in a single night. Nobody says why.", "half"),
    r("There's a shrine deep in the Deadwood with a statue like the Old Friend's, but the face is chiselled off. The Order doesn't like it mentioned.", "true"),
    r("Over the river west of the Deadwood there's a round building like a Hoverer lying down. The Ring, they call it. Fighters go in; the ones who lose come out anyway. Nobody knows how.", "true"),
  ],
  saltmarrow: [
    r("The hut at the end of the north quay has a trapdoor. The tide comes up through it, and sometimes other things.", "true"),
    r("There's a grave on the little isle west of the Pale Isles. One grave. No name. The ferry won't go there.", "true"),
    r("The Gullwing didn't sink. It sailed west, past the Drakespine, and didn't come back. Brine paid the tithe anyway.", "half"),
    r("A drowned pier sticks out of the Pale Isles' south shore. There was never a village there to build it.", "true"),
  ],
  hollyhock: [
    r("Everything in the vale grows twice as fast. Mother Yarrow says it's the river. The river comes from under the hills.", "half"),
    r("There's a farmer up the vale using an old carved stone as a fence post. It's an altar. He doesn't care.", "true"),
    r("Wyrmtongue won't grow anywhere but Ashfall. Yarrow has tried. The seeds crawl out of the pot overnight.", "half"),
  ],
  dyemoor: [
    r("The river runs blue below the vats. It ran blue before the vats, too. The vats were built where it was already blue.", "half"),
    r("Vell's grandfather dyed a cloak for the Hollow King. Vell says that's a lie. Vell has the receipt."),
    r("The Thistle road crosses old stonework under the mud, older than any road. Look when it's dry.", "true"),
  ],
  tallgrass: [
    r("The ring of standing stones in The Wilds: game won't cross it. Hunters won't either, after dark.", "true"),
    r("Fenn tracked a wolf to the Ironreach snow and found footprints beside its that weren't a wolf's. Or a man's.", "half"),
    r("Thornbacks weren't always thorned. Something in the thickets did that to them."),
    r("The ring of stones has a hole in the middle now. Fenn says it was always there and the grass just grew over it. Fenn is lying.", "true"),
  ],
  cragmaw: [
    r("The deep mine's richest seam runs under an old machine. Gears the size of cartwheels, stopped. Nobody built it. Nobody knows what it did.", "true"),
    r("Pike came up from the mainland with one pickaxe and a grudge. The grudge is still here.", "half"),
    r("Snow on the peaks all year, and yetis, and something bigger that only comes down in the worst storms."),
  ],
  quillhaven: [
    r("The library goes down three floors. The bottom one is below the sea. The books down there are dry.", "half"),
    r("The folio shows a city where Ashfall is. The folio also shows the Realm without a Deadwood. The folio is older than both.", "true"),
    r("The standing stones on the headland share a symbol with the ones in The Wilds and one in the Deadwood. Perrin has a map. He won't show it."),
    r("One text says the Friends did not come to this world. Another says they were made here. Perrin keeps them on opposite shelves.", "true"),
    r("The bottom floor of the library flooded a hundred years ago and the first archivist went down to save the books. The trapdoor's still there. So is he.", "true"),
  ],
  westmarch: [r("Lonely house out in the Westmarch. Door open. Chest dusty. Nobody home. Nobody ever home.", "true"),
    r("The watch-stones along the road all fell westward. Not the way the wind blows. The way something pushed.", "true"),
    r("Raria crossed the mountains in the night, a whole kingdom of them. Or that's what the soldiers say, when they're not saying the other thing.", "false"),
    r("Hollowmere's sending more soldiers west every week. They come back quieter.", "true")],
  deep_westmarch: [
    r("Raria wasn't there before. My father farmed this side of the Spine. There was nothing west of him but drakes and fog.", "half"),
    r("Their soldiers were already dug in before anyone knew their name. Stakes, banners, a checkpoint. You don't build that in a night.", "true"),
    r("Raria was hidden. Under a glamour, under the fog, under the ground. Pick one; I've heard all three this week.", "false"),
    r("The Stone Field was the first fighting. Nobody can say who started it. Both sides say the other was already there.", "true"),
    r("There's a hollow in the cliffs west of the checkpoint with one way in. Someone keeps flowers there.", "true"),
    r("The Federation pays for Regiment dispatches. The Regiment pays for Federation devices. Some of us just sell rope.", "half"),
  ],
  raria_march: [
    r("Lawgate's Governor keeps the oldest roll of the march in a drawer. It has Lawgate on it, and a blank where Hollowmere should be.", "true"),
    r("The Crown Road is eleven days to the capital by cart. The Regiment does it in seven. The Rangers do it in three, and nobody sees them on it.", "half"),
    r("The Spine Watch had a tower. Then the Federation's cannon fired. Now it has a story.", "true"),
  ],
  crownlands: [
    r("The Crownlands feed the capital, the capital feeds the Law, and the Law feeds us. Mostly bread.", "half"),
    r("Candlemere's tithe is short again. The reeve hasn't slept. The Assessor's clerk comes at the turn of the month.", "true"),
    r("My family farmed this field before the Law was written down. The chaplain says that isn't possible.", "true"),
    r("The Federation came through with a device that milked the cows. The Regiment took it. The cows miss it.", "true"),
  ],
  vesperwold: [
    r("Be indoors for the last bell. Whatever's in the wood after it, the Order doesn't see it, so it doesn't have to write it down.", "true"),
    r("The Rangers' Hold is in the north of the wold. Nobody visits. Everybody has been seen.", "true"),
    r("The abbey's copies of the Law are read aloud once a year. The reading takes nine days.", "half"),
  ],
  silent_peaks: [
    r("The stone watchers in the peaks move when nobody's looking. They're carved blindfolded, like the Wise Friend.", "true"),
    r("There's a shrine up there older than Raria. The hermit says the eyes under the blindfold are carved open.", "true"),
    r("Moonsilver in the scree, glimmer by the tarn, rarite if you climb high enough and come back down.", "true"),
  ],
  heartwood: [
    r("The Ironbark Elder walks. Every lurker in BarkReach grew from its fallen bark. The rangers leave it offerings and a wide path.", "true"),
    r("Barkholm refused the Crown's tithe twice. The first collector got lost for a month. The second got lost for good.", "half"),
    r("There's a glade with cliffs all round and a statue in it, sunk to the chest. Raria says it never put it there.", "true"),
  ],
  greyfields: [
    r("Two years of fighting and neither side's losing. That's the trouble.", "true"),
    r("The dead in the Greyfields don't remember whose side they were on. They just keep at it.", "true"),
    r("The Federation's cannon at Freecamp is called 'Second Opinion'. The Regiment's war table has it marked in red.", "true"),
    r("The cairn on the battlefield has FFF scratched on one side and RRR on the other. Nobody owns up to either.", "true"),
  ],
  free_marches: [
    r("The Federation has a cannon. Nine feet of copper. It fired once, and something on the Drakespine isn't there any more.", "true"),
    r("Fellow Free has fourteen devices running in his hall. He says one is for later. Nobody knows when later is.", "true"),
    r("The chicken at the fortress is an admiral. That's not a joke. Ask anyone there and watch them not laugh.", "true"),
    r("The Federation's got a spy in Raria. Raria's got a spy in the Federation. They both know. Nobody minds.", "half"),
    r("The Gate-Warden asks three questions. Honest answers get you in. I lied once. He let me in anyway and wrote down the lie.", "true"),
  ],
  barkreach: [
    r("Lurkers look like stumps. The rangers burn the real stumps so they can tell which is which.", "true"),
    r("There's a glade in the east of the wood with cliffs all round, and a statue in it that Raria says it never put there.", "true"),
    r("A Royal Ranger stood in the north wood for a whole day. Didn't move. The greatstags walked round it.", "half"),
    r("Ironbark grows a heart of grey wood. Lurkers grow round it. Nobody's sure which came first.", "half"),
    r("The Regiment's scouts count trees. Why would anyone count trees? Unless you meant to own them.", "true"),
  ],
  // The Mizukai Isles: what Kurohama's people say over tea.
  kurohama: [
    r("The harbourmaster's chart has a blank patch west of Ashigane. Every harbourmaster before him left it blank too. Nobody says why.", "true"),
    r("The Red Ogre of Ashigane hates the whole of Takamori for something the first lord did. Nobody remembers what. The ogre does.", "true"),
    r("The Bureau of Seals writes a seal for every boat that leaves. The boats that came back without one, the sea kept something from.", "half"),
    r("They say the lord's sister reads every letter in the Hall before the lord does. They say the lord prefers it.", "true"),
    r("A fisher swore he saw a lantern walking on Torojima's shore with nobody holding it. The Keeper says she knows its name.", "true"),
    r("Josaki's castle burned twenty years ago, the same night as the treaty was signed. People who say that out loud stop being invited to the Hall."),
    r("The sea monks off the north cape ask for a bucket. Give one with a hole in the bottom and they'll bail all night and never sink you.", "true"),
    r("The great spirit under Hakkotsu is made of everyone the sea took and nobody mourned. My grandmother said that to frighten me. It worked; it still does.", "true"),
  ],
  takamori: [
    r("Lord Naoharu has held Hinode three years. His sister has held it longer, people say, and they don't mean the title.", "true"),
    r("Captain Ise has a bounty on ogre horns. Somebody's grandfather made a living at it. Somebody's grandfather is buried on Ashigane.", "true"),
    r("The dojo's sensei once cut a falling leaf in four before it reached the floor. She says it was three, and the fourth was the wind.", "half"),
    r("The Takamori keep has five roofs. The fifth was added after Josaki burned. Nobody says what the fourth was for."),
  ],
  hinode: [
    r("The sun comes up over Hinode first, before anywhere in the Realm. That's why it's the Isle of Sunrise. That, and the Hall likes the name.", "true"),
    r("Parasols that hop are only lonely. Lanterns that walk are something else.", "true"),
    r("Kurokage Wood has a cry like a thrush in the dark. The lord's foresters won't go past the stone after sunset, and they're paid to.", "true"),
    r("The monkeys at Yumoto stole the bath-house pass again. The Steaming Moon has had that pass since three lords ago.", "true"),
  ],
  raria: [
    r("Raria has always been here. Her Radiance says so. The stones say so. I was born here. I think.", "half"),
    r("Raria simply returned. That's the word the chaplain uses. Returned. He never says from where.", "true"),
    r("Raria was summoned. Not built. Summoned. Don't say that in the market.", "false"),
    r("The Rangers are behind the pillars. There's always a Ranger behind the pillar at the chapel's corner. It's a comfort.", "true"),
    r("Tam Merrow prays four times a week instead of seven. The Assessor knows. Everyone knows the Assessor knows.", "true"),
    r("The King reads all night. He's read the Law twice. The second time was to see if it said anything different.", "true"),
    r("Raria conquered this land a thousand years ago and lost it, and now it's back for it. The Order of Dusk keeps the old maps. Closed.", "half"),
  ],
  ashfall: [r("Whoever built the ruins in Ashfall built them before the dragons came. Or built them for the dragons. The crater's older than either.", "half"),
    r("The Burned walk the ash round the Ember Fortress, every kind of Friend that ever lived in a village. The Order of the Ember knows their numbers. They don't say them.", "true"),
    r("Water quenches the Burned. Nothing else does. The Order carries buckets on patrol and doesn't laugh about it.", "true")],
};
const REGION_KEY = (id: RegionId): RegionId => ({ farmland: "farmland", coast: "friendhollow", whisperwood: "fernwick", ashen_hills: "emberforge", greyhorn: "highcairn", pale_dunes: "oasis", murkmire: "farmland", glass_lake: "friendhollow", mossy_ruins: "friendhollow", deadwood: "gravesend", southshore: "saltmarrow", thistle_vale: "hollyhock", the_wilds: "tallgrass", ironreach: "cragmaw", drakespine: "ashfall", pale_isles: "saltmarrow",
  shiogama: "kurohama", kibi: "hinode", hanazono: "hinode", tanabe: "hinode", yumoto: "hinode", isohama: "hinode", morishima: "hinode", iwaoka: "hinode", torojima: "kurohama", kusabana: "hinode", old_cedars: "hinode", whispering_bamboo: "hinode", kumoyama: "takamori" } as Partial<Record<string, RegionId>>)[id] ?? id;
/** A rumour from where the speaker lives (one you haven't heard, while there are any), and a little Presence for a new one. */
export function rumourAt(game: Game, x: number, y: number): string {
  const region = REGION_KEY(regionAt(game.world, x, y).id), pool = RUMOURS[region] ?? RUMOURS.friendhollow!;
  const keyOf = (rumour: Rumour) => `${region}_${pool.indexOf(rumour)}`;
  const fresh = pool.filter(rumour => !game.player.rumours[keyOf(rumour)]);
  const pick = (fresh.length ? fresh : pool)[Math.floor(game.rng() * (fresh.length ? fresh : pool).length)];
  const key = keyOf(pick);
  if (!game.player.rumours[key]) { game.player.rumours[key] = 1; addXp(game, "presence", 2.5, { raw: true }); }
  return pick.text;
}
export const rumourCount = () => Object.values(RUMOURS).reduce((sum, pool) => sum + pool!.length, 0);
