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
  westmarch: [r("Lonely house out in the Westmarch. Door open. Chest dusty. Nobody home. Nobody ever home.", "true")],
  ashfall: [r("Whoever built the ruins in Ashfall built them before the dragons came. Or built them for the dragons. The crater's older than either.", "half")],
};
const REGION_KEY = (id: RegionId): RegionId => ({ farmland: "farmland", coast: "friendhollow", whisperwood: "fernwick", ashen_hills: "emberforge", greyhorn: "highcairn", pale_dunes: "oasis", murkmire: "farmland", glass_lake: "friendhollow", mossy_ruins: "friendhollow", deadwood: "gravesend", southshore: "saltmarrow", thistle_vale: "hollyhock", the_wilds: "tallgrass", ironreach: "cragmaw", drakespine: "ashfall", pale_isles: "saltmarrow" } as Partial<Record<RegionId, RegionId>>)[id] ?? id;
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
