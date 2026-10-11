/**
 * The Land Before Stone: Kharaveth's north, and the people Hollowmere sent into it.
 *
 * Hollowmere's expedition crossed the Sunteeth and dug in at Foothold Camp, meaning to map a road a caravan could use
 * and come home with it. Its commander wants a road; her lieutenant wants nobody hurt; her cartographer wants his
 * arrows to be right; her scholar wants to know what the glyphs say; her quartermaster wants his mule back. Six days ago
 * the supply party went north through the maze for water and lamp oil and didn't come back. "A Foothold in the Stone"
 * is finding out why: the officers' stories, the last camp, the trail, two hands' chalk on the walls, a breathing crack,
 * the Underway, and what the guide they hired off the steppe was protecting.
 *
 * The clues (WorldObject.clue): things in the world whose options, examine text and outcome depend on what you know.
 */
import { addXp, giveOrDrop, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { discover, knows, learnGlyph, readInscription } from "./mysteries.ts";
import type { WorldObject } from "./world.ts";
import { HEARTLAND_CLUES } from "./dynasties.ts";
import { ORASHAI_CLUES } from "./orashaiquests.ts";
import { HIDDEN_ROAD_CLUES } from "./hiddenroad.ts";
import { MEGHAVAN_CLUES } from "./meghavanpeople.ts";
import { MEGHAVAN_QUEST_CLUES } from "./meghavanquests.ts";
import { MEGHAVAN_SCHOOL_CLUES } from "./meghavanschools.ts";

const art = (family: number, seed: number) => ({ family, seed });
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(9, seed), ...extra });
const soldier = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(10, seed), ...extra });
const QUEST = "foothold_in_the_stone";
/** The party is in the Underway until you've found them and the shaft is open (in either order); then they walk out to the camp. */
const partyOut = (game: Game) => !!data(game, "uw_shaft") && !!data(game, "ft_party");
const inRefuge = (game: Game) => !partyOut(game);
const backInCamp = partyOut;

export const KHARAVETH_NPCS: Record<string, NpcDef> = {
  fh_commander: soldier("fh_commander", "Commander Ysolde Marrow", "Hollowmere's expedition commander. Maps on the table, sand in the maps, a pencil behind each ear in case she loses one.", 1400),
  fh_lieutenant: soldier("fh_lieutenant", "Lieutenant Corwin Ashby", "The commander's second. Counts the water casks twice a day and the soldiers three times.", 1401),
  fh_cartographer: person("fh_cartographer", "Cartographer Pell Danvers", "Hollowmere's mapmaker. White chalk on his fingers, white chalk on his coat, a map of the Sunteeth he'll show you whether you ask or not.", 1402),
  fh_scholar: person("fh_scholar", "Scholar Imre Vantelle", "Sent by Hollowmere's college to copy every inscription the expedition finds. Has copied all four, several times.", 1403),
  fh_quartermaster: person("fh_quartermaster", "Quartermaster Hesk", "Keeps the stores, the ledger and a grudge against the Sunteeth for every cask it has cost him.", 1404, { options: ["Talk-to", "Trade"], shop: "foothold_stores" }),
  fh_sergeant: soldier("fh_sergeant", "Sergeant Brannoch Tull", "Keeps the south gate. Has been to war twice and has never been as uneasy as he is about the dust out there.", 1405),
  fh_soldier: soldier("fh_soldier", "Hollowmere soldier", "One of the expedition's soldiers, a grey tower on the shoulder of a sand-coloured cloak, squinting south.", 1406),
  // The supply party: in the Underway until you open the way out, then back in camp.
  fh_rook_lost: soldier("fh_rook_lost", "Corporal Della Rook", "The supply party's corporal, her leg splinted with a tent pole. Glad to see you. Gladder to see a way out.", 1410, { present: inRefuge }),
  fh_ibbu_lost: person("fh_ibbu_lost", "Ibbu", "The guide the expedition hired off the steppe. Calm, dusty, and watching you the way you'd watch weather.", 1411, { present: inRefuge }),
  fh_rook: soldier("fh_rook", "Corporal Della Rook", "Back in camp, her leg still splinted, telling the story a little better each time.", 1410, { present: backInCamp }),
  fh_ibbu: person("fh_ibbu", "Ibbu", "The steppe guide, back in camp, sitting a little apart from Hollowmere's fire.", 1411, { present: game => backInCamp(game) && data(game, "ft_choice") !== 1 }),
};

const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const heardAll = (game: Game) => !!(data(game, "ft_ashby") && data(game, "ft_danvers") && data(game, "ft_vantelle"));

export const KHARAVETH_QUESTS: readonly QuestDef[] = [
  {
    id: QUEST, name: "A Foothold in the Stone", points: 2, difficulty: "Intermediate", start: "Talk to Commander Ysolde Marrow in the command tent at Foothold Camp, south of the Sunteeth.",
    requirements: ["Combat 40 recommended", "The Sunteeth: cross the maze from the mainland's south coast, between Hollyhock and Dyemoor"],
    rewards: ["2 Quest Points", "4,000 Wayfaring XP", "2,500 Pursuance XP", "2,000 Presence XP", "3,000 coins", "The Foothold cloak", "Foothold's south gate opens: Kharaveth beyond"],
    journal: game => {
      const s = stage(game, QUEST), p = game.player;
      if (s === 0) return ["Hollowmere has an expedition camp at the south mouth of the Sunteeth, the maze of sandstone between the mainland and Kharaveth. Its supply party is six days overdue."];
      if (s === 1) return ["Commander Marrow's supply party went north through the Sunteeth for water and lamp oil and never came back: Corporal Rook, two porters, the guide Ibbu, and a mule.",
        mark(heardAll(game), "Hear what the officers think happened: Lieutenant Ashby, Cartographer Danvers, Scholar Vantelle"),
        mark(data(game, "ft_camp") > 0, "Search the party's last camp, the cold fire halfway through the maze"),
        mark(data(game, "ft_trail") >= 4, `Follow their trail from the camp (${Math.min(4, data(game, "ft_trail"))}/4 signs read)`),
        mark(knows(game, "ochre_marks") || data(game, "ft_ochre") > 0, "Work out why the party left the white arrows"),
        mark(knows(game, "sunteeth_draught"), "Find where the trail ends"),
        ...(has(p, "party_roster") ? [] : [])];
      if (s === 2) return ["The party is alive, in the Underway: a road under the maze. Corporal Rook can't climb back through the crack with her leg.",
        mark(data(game, "uw_shaft") > 0, "Find the Underway's other way up (Ibbu says the far end has one, if the stone can be made to move)"),
        mark(partyOut(game), "Then report to Commander Marrow at Foothold Camp")];
      return [data(game, "ft_choice") === 1 ? "I told the commander about the road under the Sunteeth. Hollowmere holds the maze now; Ibbu has gone back to the steppe, and the steppe will hear why. QUEST COMPLETE!"
        : "I let Ibbu tell his own story. Rook is back, the mule has eaten a tent, the commander has her road south, and the old road under the maze is still the steppe people's to keep. QUEST COMPLETE!"];
    },
  },
];

/** Things in the world to look into: their options, what you see when you examine them, and what happens when you do. */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const TRAIL = ["trail_sand", "trail_tin", "trail_shoe", "trail_blood"];
const TRAIL_TEXT = [
  "Boot prints and hoof prints, many, hurried, and heading west: not south, where the white arrows go.",
  "A ration tin with Hollowmere's tower stamped in the lid, dented where something bit it and gave up.",
  "A mule shoe, torn off with the nails still in. Biscuit was running.",
  "Old blood on the rock at hip height: a person's, from the smear. Then the trail goes on, slower, one foot dragging.",
];
const onQuest = (game: Game) => stage(game, QUEST) === 1;
const readClue = (lines: (game: Game, object: WorldObject) => string, effect?: (game: Game, object: WorldObject) => void): Clue => ({
  options: () => ["Read"], examine: lines, use: (game, object) => { const text = lines(game, object); effect?.(game, object); return { text }; },
});
export const CLUES: Record<string, Clue> = {
  chalk_white: readClue(() => "A white chalk arrow, Hollowmere's, pointing south. Pell Danvers draws a neat arrow."),
  chalk_ochre: readClue(() => "An arrow in ochre chalk pointing west, drawn over a smudge where a white one was. Beside it, small: a ring with a point in it.", game => {
    if (onQuest(game)) flag(game, "ft_ochre");
    if (data(game, "ft_danvers")) discover(game, "ochre_marks");
  }),
  last_camp: {
    options: () => ["Search"], examine: () => "A ring of stones, ash, a scatter of things left in a hurry.",
    use: game => {
      if (!onQuest(game)) return { text: "Ash days cold, a hyena's prints all over it. Somebody left in a hurry." };
      if (!data(game, "ft_camp")) { flag(game, "ft_camp"); giveOrDrop(game, "ochre_chalk"); addXp(game, "slayer", 300, { raw: true }); }
      return { text: "The ashes are days cold. Hyena prints everywhere, and over them the party's own, leaving west in a hurry. Half buried in the sand: a stick of ochre chalk, worn to a stub. Not Hollowmere's white." };
    },
  },
  ...Object.fromEntries(TRAIL.map((id, index): [string, Clue] => [id, {
    options: () => ["Inspect"], examine: () => TRAIL_TEXT[index].split(/[:.]/)[0] + ".",
    use: game => {
      if (!onQuest(game) || !data(game, "ft_camp")) return { text: index === 0 ? "Old prints, going west." : "Something passed this way, days ago." };
      const read = data(game, "ft_trail");
      if (index > read) return { text: "Something passed here. It would make more sense followed from the beginning: from their last camp." };
      if (index === read) { game.player.questData.ft_trail = read + 1; addXp(game, "slayer", 400, { raw: true }); }
      return { text: TRAIL_TEXT[index] };
    },
  }])),
  sunteeth_stele: readClue(game => `A stele of dark stone, older than the sandstone round it, the wind's work on every face but one. ${readInscription(game, "sunteeth_stele")}`, game => {
    if (onQuest(game)) flag(game, "ft_stele");
  }),
  sunteeth_crack: {
    // Only once you've felt it breathing do you see it's a way in.
    options: game => knows(game, "sunteeth_draught") ? ["Squeeze-into"] : ["Search"],
    examine: game => knows(game, "sunteeth_draught") ? "The crack in the rock, breathing. There's just room to squeeze in." : "Cracked rock at the end of a blind canyon. It's cooler here than it should be.",
    use: (game, object, option) => {
      if (option === "Squeeze-into" && knows(game, "sunteeth_draught")) return { to: object.to!, text: "You squeeze into the crack, sideways, then down, then into the dark, and the air opens out round you." };
      discover(game, "sunteeth_draught");
      if (game.player.mysteries.glyphs.door === 1) learnGlyph(game, "door", true);
      return { text: "Cool air breathes out of the crack, in, and out, slow as sleep. There's room to squeeze through, just. On the stele behind you, the arch with a gap in it: it's this. A door." };
    },
  },
  underway_lintel: readClue(game => `A lintel of dressed stone over a side passage. ${readInscription(game, "underway_lintel")}`, game => discover(game, "first_names_lintel")),
  underway_glyphs: readClue(() => "A wall of glyphs, each cut beside a picture: a basin, a disc, a scatter of points. The pictures stop halfway along. You follow the first three, picture to glyph.", game => {
    learnGlyph(game, "water", true); learnGlyph(game, "sun", true); learnGlyph(game, "star", true); discover(game, "glyph_wall");
    readInscription(game, "underway_glyphs");
  }),
  underway_marker: readClue(game => `A post of stone where the road turns. ${readInscription(game, "underway_marker")}`),
  underway_refuge: {
    options: () => ["Search"], examine: () => "Blankets, a water cask, a lamp turned low, a mule's nosebag.",
    use: () => ({ text: "The supply party's camp: blankets, the last of the water, a lamp turned low to save the oil, and a splint cut from a tent pole." }),
  },
  underway_counterweight: {
    options: game => data(game, "uw_shaft") ? [] : ["Release"],
    examine: game => data(game, "uw_shaft") ? "The counterweight, down in its slot. Far off, the shaft is clear." : "A block of dressed stone hung on a bronze chain, held up by a bar through the chain. Glyphs round it: road, and a line with a wedge under it.",
    use: game => {
      if (data(game, "uw_shaft")) return { text: "It's down. It stays down." };
      flag(game, "uw_shaft"); discover(game, "counterweight"); addXp(game, "agility", 600, { raw: true });
      return { text: "You lean on the bar until it slides. The stone drops into its slot with a sound you feel in your teeth. Far off and above, a long hiss: sand pouring away from somewhere." };
    },
  },
  underway_shaft_up: {
    options: () => ["Climb-up"], examine: game => data(game, "uw_shaft") ? "A shaft up to the daylight, clear now." : "A shaft, choked solid with sand from above.",
    use: (game, object) => data(game, "uw_shaft") ? { to: object.to!, text: "You climb the old shaft into the sun, behind Foothold's palisade." } : { text: "The shaft is choked with sand from above. Something down here must let it drain." },
  },
  underway_shaft_down: {
    options: () => ["Climb-down"], examine: game => data(game, "uw_shaft") ? "An old shaft, clear of sand, going down into the dark." : "A shaft packed with sand. Whatever kept it clear stopped long ago.",
    use: (game, object) => data(game, "uw_shaft") ? { to: object.to!, text: "You climb down the old shaft into the Underway." } : { text: "Sand, packed hard, as far down as you can reach." },
  },
  foothold_gate: {
    options: () => ["Open"], examine: () => "The palisade's south gate. Beyond it: Kharaveth.",
    use: (game, object) => {
      if (!questDone(game, QUEST)) return { text: "The south gate stays barred until the commander says the road south is safe. The sergeant says it louder." };
      const south = game.player.y < object.y;
      return { to: { x: object.x, y: object.y + (south ? 1 : -1) }, text: south ? "The gate swings open onto Kharaveth." : "You come back in through the gate." };
    },
  },
  ...HEARTLAND_CLUES,
  ...ORASHAI_CLUES,
  // The Hidden Road's three places, on the Isles (the same clue machinery).
  ...HIDDEN_ROAD_CLUES,
  // Meghavan, the Rain Country (meghavanpeople.ts).
  ...MEGHAVAN_CLUES,
  ...MEGHAVAN_QUEST_CLUES,
  ...MEGHAVAN_SCHOOL_CLUES,
};

/** A clue's options, examine text and use (null if the object isn't one). */
export const clueOptions = (game: Game, object: WorldObject) => object.clue && CLUES[object.clue] ? CLUES[object.clue].options(game, object) : null;
export const clueExamine = (game: Game, object: WorldObject) => object.clue && CLUES[object.clue] ? CLUES[object.clue].examine(game, object) : null;
export function useClue(game: Game, object: WorldObject, option: string): ClueOutcome | undefined {
  const clue = object.clue ? CLUES[object.clue] : undefined;
  return clue ? clue.use(game, object, option) : undefined;
}

export function talkKharaveth(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, s = stage(game, QUEST);
  switch (npcId) {
    case "fh_commander": {
      if (s === 0) return chat(name, npcSays(name, "You came through the Sunteeth on your own? Then you're either lost or useful. Hollowmere's expedition: we mean to map a road into Kharaveth that a caravan can use, and come home with it.", "Six days ago I sent the supply party back north to the coast for water casks and lamp oil. They should have been back in two. Corporal Rook, two porters, a guide we hired off the steppe, and a mule. My officers each have a theory, and not one of them has a corporal."), [
        { label: "I'll find them.", then: () => chat(name, npcSays(name, "Good. Here: the roster. Talk to my officers, then go to Rook's last camp, the cold fire halfway through the maze. Come back with people, or with the truth."), undefined, () => { player.quests[QUEST] = 1; giveOrDrop(game, "party_roster"); say(game, "Quest started: A Foothold in the Stone."); }) },
        { label: "What is Kharaveth?", then: () => chat(name, npcSays(name, "Desert, mostly, as far as we've seen it. Three great houses rule the south, the steppe people say, and quarrel. There were people before them who built in stone, and before them, if our scholar's right, people who didn't need to. We've met none of them yet. We've met a great many hyenas."), [{ label: "I'll find your party.", then: () => null }]) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1) return chat(name, npcSays(name, heardAll(game) ? "Ashby says deserters, Danvers says somebody moved his arrows, Vantelle says lights. Rook's last camp is the cold fire halfway through. Start there and follow them." : "Talk to my officers first: Ashby, Danvers, Vantelle. Each of them knows something, and each of them is sure they know the rest."));
      if (s === 2 && !partyOut(game)) return chat(name, npcSays(name, "Alive? Under the maze? Then get them out. If Rook can't climb, find another way. Whatever that guide knows, use it."));
      if (s === 2) return chat(name, npcSays(name, "Rook's back, and the porters, and the mule, who has eaten a tent. Rook says the guide took them down a crack in the rock, along a road under the ground, and up a shaft behind my own palisade.", "A road under the Sunteeth. Is that true? And whose is it?"), [
        { label: "It's true. The road comes up behind your camp.", then: () => chat(name, npcSays(name, "A road no hyena walks, from the maze's west side to behind my palisade. Then Hollowmere holds the Sunteeth, under and over. That changes everything.", "And the guide moved Danvers's arrows to hide it. I'll thank him for Rook's life, and then he can find another expedition."), undefined, () => finish(game, 1)) },
        { label: "Ibbu got them to shelter. The rest is his to tell.", then: () => chat(name, npcSays(name, "Hm. Keeping someone else's secret in my camp.", "Rook's alive, and the gate's open south, and that's what I sent you for. He stays on as guide. I'll be watching my walls."), undefined, () => finish(game, 2)) },
      ]);
      return chat(name, npcSays(name, pick(game, ["The south gate's open to you. Kharaveth is big, and we've mapped about a thumbnail of it.", "Danvers is redrawing every arrow in white. Twice.", "When the great houses send someone, I'll want you here. I'm told they send someone eventually."])));
    }
    case "fh_lieutenant": {
      if (s === 1) { flag(game, "ft_ashby"); return chat(name, npcSays(name, "Deserted. Six days' supplies, a mule, and the maze between them and anyone who'd ask questions. I've seen it before.", "The guide talked them into it, you mark me. The steppe people know where to sell a mule, and they don't love Hollowmere.")); }
      return chat(name, npcSays(name, pick(game, ["Water casks: nineteen. Soldiers: twenty-six. The numbers don't care how hot it is.", "The hyenas laugh at night. I've decided it isn't at us.", "Every expedition loses someone. I'd like ours to lose fewer."])));
    }
    case "fh_cartographer": {
      if (s === 1) { flag(game, "ft_danvers"); if (data(game, "ft_ochre")) discover(game, "ochre_marks");
        return chat(name, npcSays(name, "My chalk was right. White arrows, every turn, south to the camp. I walked it twice.", "If they went wrong, something moved my arrows. I'm not saying the rocks move. I'm saying I'd like to know who's been at my walls.")); }
      return chat(name, npcSays(name, pick(game, ["The Sunteeth isn't a maze anyone built. The wind did it, and the wind doesn't care if you get out.", "I've mapped a thumbnail of Kharaveth. It's a very detailed thumbnail.", "Never trust a canyon that turns left twice."])));
    }
    case "fh_scholar": {
      // Vantelle reads Azhurak a little: shown the stele's glyphs, she teaches the two she knows.
      if (s === 1 && !data(game, "ft_vantelle")) { flag(game, "ft_vantelle"); return chat(name, npcSays(name, "Lights. Two nights before they were due, west in the towers, low down, like lamps behind rock. The lieutenant says fireflies.", "There are no fireflies in a desert, lieutenant.")); }
      if (player.mysteries.glyphs.road && player.mysteries.glyphs.road < 2) return chat(name, npcSays(name, "You've seen glyphs out there? Describe them. Two lines running together? That's 'road'. A line with a wedge hanging under it: 'below'. Hollowmere's had a few Azhurak stones since the Spine, and those two are always together.", "Together they mean the road below. Somebody thought there was one."), undefined, () => { learnGlyph(game, "road", true); learnGlyph(game, "below", true); });
      if (knows(game, "first_names_lintel")) return chat(name, npcSays(name, "Stone, seeing, and a ring. I'd bet my college the ring is a name. The steppe people talk of a hall in the south where the oldest names are kept: names from before the great houses renamed everything.", "If that hall exists, I want to see it before the houses decide who it belongs to."));
      return chat(name, npcSays(name, pick(game, ["Azhurak: the people before the great houses. They cut letters in stone and roads under the ground, and the houses say they were their ancestors. The houses say a lot.", "I've copied every glyph the expedition has found. All twelve of them.", "Bring me anything with marks on it. Sherds especially: Azhurak broke a great many pots."])));
    }
    case "fh_quartermaster": return chat(name, npcSays(name, pick(game, s === 1 ? ["Two water casks, forty days of hard biscuit, the good lamp oil, and Biscuit. The mule. I'm not sentimental. I put a deposit on that mule."]
      : ["Stores, at frontier prices, which is to say: more. The steppe wraps are worth it, though. I tried a summer without one.", "Biscuit's back. She's eaten a tent. I'm adding it to her account."])));
    case "fh_sergeant": return chat(name, npcSays(name, questDone(game, QUEST) ? pick(game, ["The commander says you're to come and go. Mind the dust that walks.", "Scorpions south, jackals west, and the dust. I don't like the dust."]) : "South gate stays shut till the commander says the road south is safe. Out there's Kharaveth, and Kharaveth's out there."));
    case "fh_soldier": return chat(name, npcSays(name, pick(game, ["Hot. It's hot. I'm from Hollowmere; it's never this hot.", "The towers look like teeth from up on the wall. Sun teeth. That's where the name came from, Danvers says.", "Keep your water topped up and your eyes on the rocks.", "We dug the well ourselves. Twelve feet. Don't drink from the barrel, that's the lieutenant's."])));
    case "fh_rook_lost": {
      if (!data(game, "ft_party")) return chat(name, npcSays(name, "Hollowmere? Did Marrow send you? Thank the Old Friend.", "We followed the arrows. Then the arrows went wrong, and the hyenas came, and I went down on the rock, and Ibbu said 'down', so we went down. I can't climb back through that crack on this leg. Ibbu says there's another way up at the far end of the road, if the stone can be made to move."), undefined, () => {
        flag(game, "ft_party"); if (stage(game, QUEST) === 1) { player.quests[QUEST] = 2; say(game, "You've found the supply party, alive, in the Underway."); }
      });
      return chat(name, npcSays(name, data(game, "uw_shaft") ? "The shaft's clear? Then we're walking out of here. Well. Hopping." : "The far end of the road, Ibbu says. A stone that moves. Go carefully: there's a stone man at the shrine with a bronze staff, and he isn't friendly."));
    }
    case "fh_ibbu_lost": {
      flag(game, "ft_ibbu");
      if (!knows(game, "ochre_marks") && (data(game, "ft_ochre") || data(game, "ft_camp"))) discover(game, "ochre_marks");
      return chat(name, npcSays(name, "You followed the ochre. Good eyes. I drew it.", "The white arrows go south through the teeth, and the hyenas have learned that the white arrows go south too: they wait at the third turn. My mother's people mark the old road with ochre: a ring, with a point in it. The road below. We don't show it to people who'd sell it. But I don't let people die for it either."), [
        { label: "Whose road is it?", then: () => chat(name, npcSays(name, "Azhurak's, the scholars would say. The road's own, my mother would say. The great houses would say it's theirs, the minute they heard of it. That's why they don't hear of it.")) },
        { label: "How do we get Rook out?", then: () => chat(name, npcSays(name, "The far end comes up behind your camp. There's a stone that holds the sand in the shaft, and a stone that lets it go. Find the second.")) },
      ]);
    }
    case "fh_rook": return chat(name, npcSays(name, pick(game, ["I'll be on my feet in a week. The commander says two. We've a bet.", "I'll go back through the Sunteeth when they pave it.", "Biscuit carried me the last mile. Biscuit is a hero. Don't tell her."])));
    case "fh_ibbu": return chat(name, npcSays(name, pick(game, data(game, "ft_choice") === 2 ? ["You let me tell it. The steppe will hear that a stranger can keep a secret.", "When you go south, look for tents with blue smoke. Tell them Ibbu says you can keep a road."] : ["The steppe's wide. Walk it slowly."])));
  }
  return null;
}
function finish(game: Game, choice: 1 | 2) {
  game.player.questData.ft_choice = choice;
  take(game.player, "party_roster", 1); take(game.player, "ochre_chalk", 1);
  giveOrDrop(game, "coins", 3000); giveOrDrop(game, "foothold_cloak");
  addXp(game, "agility", 4000, { raw: true }); addXp(game, "slayer", 2500, { raw: true }); addXp(game, "presence", 2000, { raw: true });
  completeQuest(game, QUEST);
}

/** Kharaveth's ticks: finding yourself on the road under the maze is a discovery. */
export function onKharavethTick(game: Game, regionId: string) {
  if (regionId === "underway") discover(game, "underway_found");
}
export function onKharavethKill(game: Game, monsterId: string) {
  if (monsterId === "underway_sentinel") discover(game, "sentinel_eye");
}
