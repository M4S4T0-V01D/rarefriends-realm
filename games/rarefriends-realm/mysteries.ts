/**
 * Mysteries: the shared skill of hidden laws, old inscriptions, true names, rites, and the techniques the old traditions
 * teach (The Land Before Stone).
 *
 * It isn't Faith (devotion: blessings, wards, prayer) and it isn't Magic (spells). It is what you have found out, and what
 * you can do with what you know. It trains by finding things out, once each: a discovery recorded, a glyph understood,
 * a passage read, an initiation passed. Nothing gives Mysteries XP twice, so there is no loop to grind; the level is the
 * measure of how much of the hidden world you've actually seen.
 *
 * Azhurak, the people before Kharaveth's dynasties, cut their words in glyphs. A glyph is first *seen* (you know its
 * shape when you meet it again), then *understood* (you know what it means: from a picture beside it, from someone who
 * knows, from working it out). An inscription is *read* when every glyph in it is understood; what it signifies is a
 * matter for discoveries, and for argument.
 */
import { addXp, message, sound, type Game } from "./state.ts";

export type DiscoveryKind = "inscription" | "phenomenon" | "site" | "being" | "contradiction" | "rite";
/** What you saw, what you came to understand, and what you still don't (each shown once you know it). */
export type Discovery = { id: string; name: string; kind: DiscoveryKind; xp: number; observed: string; learned?: string; uncertain?: string };
export type Glyph = { id: string; name: string; looks: string; meaning: string };
export type Inscription = { id: string; name: string; glyphs: readonly string[]; reading: string; where: string };

export const DISCOVERIES: Record<string, Discovery> = Object.fromEntries(([
  { id: "sunteeth_draught", name: "The breathing rock", kind: "phenomenon", xp: 240,
    observed: "In a blind canyon of the Sunteeth, cool air breathes out of a crack in the rock, in and out, slow as sleep.",
    learned: "Air that moves like that is coming from somewhere big. There's a hollow under the maze.", uncertain: "Who cut the stele beside it, and whether the crack was always there." },
  { id: "ochre_marks", name: "Two hands at the walls", kind: "contradiction", xp: 300,
    observed: "Hollowmere's white chalk arrows run south through the Sunteeth; some have been smudged out, and ochre arrows drawn beside them, pointing west into the blind canyons.",
    learned: "Somebody led the supply party off the true way on purpose, with the old road's sign: a ring with a dot, the nomads' mark for 'the road below'.", uncertain: "Whether it was meant to lose them, or to save them." },
  { id: "underway_found", name: "The road beneath", kind: "site", xp: 400,
    observed: "Under the Sunteeth runs a road: three wide, paved, dressed stone, older than any wall in Kharaveth that has a name on it.",
    learned: "Azhurak built roads under the ground as well as over it. This one runs from the maze's west side to behind the camp.", uncertain: "Where else it goes, and why anyone would build a road nobody could see." },
  { id: "glyph_wall", name: "The teaching wall", kind: "inscription", xp: 350,
    observed: "In the Underway's shrine hall, a wall of glyphs, each cut beside a picture: a basin, a disc, a scatter of points.",
    learned: "Somebody taught Azhurak's letters here, a picture beside each, as you'd teach a child.", uncertain: "Who they were teaching. The pictures stop halfway along the wall." },
  { id: "sentinel_eye", name: "The eye in the stone", kind: "being", xp: 500,
    observed: "The Underway's sentinel has no face: only an eye cut into the stone, the same eye as the glyph for seeing.",
    learned: "It keeps the road. It doesn't care who walks it; it cares that nobody takes from it.", uncertain: "Who it answers to, now." },
  { id: "counterweight", name: "The counterweight", kind: "phenomenon", xp: 260,
    observed: "A block of dressed stone hangs on a bronze chain in a slot under the road; let it down and, far off, sand pours away from a shaft.",
    learned: "Azhurak engineering still works. Somebody made it to be worked from inside the road, not out." },
  { id: "first_names_lintel", name: "Stone, eye, name", kind: "inscription", xp: 320,
    observed: "Over the refuge in the Underway: the glyphs for stone, for seeing, and a ring that is only ever drawn round something.",
    uncertain: "The scholar at Foothold has heard the south's people speak of a hall where the first names are kept. She thinks the ring is a name." },
  // The heartlands (heartlands.ts, dynasties.ts).
  { id: "seven_crowns", name: "Seven crowns, one name", kind: "site", xp: 420,
    observed: "West of the dunes, seven standing stones in a ring, each crowned with a glyph, and an eighth fallen in the middle with words on it.",
    learned: "Seven rulers, or seven peoples, stood round one name older than any of them.", uncertain: "Whose name. The fallen stone says only that it came first." },
  { id: "first_names_door", name: "The door that sees", kind: "site", xp: 450,
    observed: "In the Ochre Spine a door is cut in the living rock, an eye over it, two bird-headed scribes worn smooth on either side. It doesn't open.",
    learned: "This is the Hall of First Names the scholars and the nomads speak of. The door is shut, not locked: something decides who it opens for.", uncertain: "What it wants of you." },
  { id: "sunken_obelisk", name: "The Sunken Obelisk", kind: "phenomenon", xp: 380,
    observed: "An obelisk sunk to its chest in the sand of the far south-west, its top half clean of drift as if the wind went round it.",
    learned: "It isn't sinking. The country is rising round it: it was set up when the ground here was lower, and the glyphs speak of water measured.", uncertain: "Where the water went." },
  { id: "unfinished_pyramid", name: "The builders' last count", kind: "contradiction", xp: 400,
    observed: "The Unfinished Pyramid's builders cut a tally on it every day the work went on. The last mark is half a stroke.",
    learned: "They stopped in the middle of a day, mid-stroke, and never came back. Tamesh says a plague; Sefrah says a war; the nomads say they were told to stop.", uncertain: "Who told them." },
  { id: "black_stair_wards", name: "The wards of the Black Stair", kind: "rite", xp: 500,
    observed: "Three ward stones set back in their niches under the Black Range, each cut with an eye and a bar on a point: watching, and measure.",
    learned: "Azhurak kept the dead below by measure: so many wards for so much stone. Take one away and the measure is wrong, and what was kept walks." },
  { id: "warden_ring", name: "A face with no name in it", kind: "being", xp: 520,
    observed: "The Stair Warden's face is the open ring that means a name, cut through, with nothing in it.",
    learned: "It keeps the dead whose names were taken off them. It falls when the wards hold, and stands again when they don't.", uncertain: "Who took the names, and why." },
  { id: "three_suns", name: "The three suns", kind: "contradiction", xp: 480,
    observed: "The Grand Matriarch had House Khasreth's falcon cut off her own seal and glyphs cut in its place; on her sarcophagus, three suns where the falcon should be.",
    learned: "She meant no single heir to rule. By measure, to the many names: the seal was a council's, not a crown's.", uncertain: "Whether the heirs will keep to it." },
  // The Orashai (orashaiquests.ts, firstnames.ts).
  { id: "the_silence", name: "The first thing learnt", kind: "rite", xp: 600,
    observed: "In the Antechamber of the Hall of First Names, the Listener asked three questions, and you answered none of them.",
    learned: "The Orashai's first threshold isn't reading. It's knowing when a question is a test of whether you'll answer." },
  { id: "the_unnamed", name: "The first thing named", kind: "being", xp: 700,
    observed: "Below the Hall of Names waited the Unnamed: the first thing the Keeper ever named, and the first that asked to have its name taken back.",
    learned: "A thing without a name doesn't stop. It goes looking for one. When it falls, the name it lost goes home without it.", uncertain: "Whether it will ask for its name again." },
  { id: "orashai_initiation", name: "A first name", kind: "rite", xp: 1500,
    observed: "The Keeper of First Names wrote a first name for you on a tablet of lapis, and gave you the Orashai way.",
    learned: "A first name isn't for saying. It's for being. The First Script is written with it, which is why it works.", uncertain: "What it is. You know. You can't say." },
  { id: "the_asked_god", name: "The god who asked", kind: "contradiction", xp: 650,
    observed: "Low on the Hall of Names' wall, a name scratched out twice. Under the scratches, not a glyph: the mark the Keeper uses when it doesn't know.",
    learned: "The man in the paper bag is a god: the one who asks. At the First Ceremony he asked a question, and nobody had ever done that, and they asked him to leave.", uncertain: "What he asked." },
  { id: "god_weigher", name: "The Weigher", kind: "being", xp: 260,
    observed: "At Tamesh, a figure holding a bar balanced on a point, a bowl at each end. The masons leave chips of stone in the bowls.",
    learned: "Kharaveth's god of measure: of what is owed, and of things staying where they belong." },
  { id: "god_gate_mother", name: "The Gate-Mother", kind: "being", xp: 260,
    observed: "Outside Khetmar, a woman of sandstone standing in an arch. The Banner's riders touch it going out.",
    learned: "Kharaveth's god of thresholds: every way in and every way out, and who is counted through." },
  { id: "god_salt_twins", name: "The Salt Twins", kind: "being", xp: 260,
    observed: "At the Ouresh camp, two pillars of rock salt licked smooth.",
    learned: "The salt riders' gods: two of everything, and everything remembered twice." },
  { id: "god_smoke", name: "The Smoke That Remembers", kind: "being", xp: 260,
    observed: "At the Zuri tents, a brazier of blue resin whose smoke goes straight up in any wind.",
    learned: "The Blue Smoke people's god: what's gone, kept as smoke is kept, by those who know which way it went." },
  // The Hidden Road (hiddenroad.ts): the Mizukai Isles' own Mysteries.
  { id: "hr_mist", name: "The standing mist", kind: "phenomenon", xp: 320,
    observed: "Above Kumoyama, a column of mist as tall as a cedar stands still in the wind. Inside it, the mountain is quiet.",
    learned: "Something very large lies under Mount Kumo, asleep, and breathes out here.", uncertain: "Whether the shrine was built where it is because of the mist, or the mist came because of the shrine." },
  { id: "hr_foxfire", name: "The foxfire road", kind: "phenomenon", xp: 320,
    observed: "At the edge of Morishima's wood, pale flames hang in the air and go out when looked at. Looked at sideways, they stay.",
    learned: "The flames are a road, going further into the wood than the island is wide.", uncertain: "Who walks it, and whether the foxes made it or only use it." },
  { id: "hr_stone", name: "The stone with no echo", kind: "phenomenon", xp: 320,
    observed: "On Iwaoka's slope, a split boulder gives nothing back: not a voice, not the wind, not the end of a call.",
    learned: "The stone keeps what's said to it. Every word called into it is still there.", uncertain: "What happens if it fills up." },
  { id: "crow_mask", name: "The crow masks", kind: "being", xp: 360,
    observed: "Under a crow-masked hermit's mask, nobody: the wind going through.",
    learned: "The hermits walked the Hidden Road and put on masks to see further. The masks kept the seeing and left them the crow.", uncertain: "How many walkers are still up there, and whether they know." },
  { id: "hidden_road", name: "The road under the road", kind: "rite", xp: 500,
    observed: "Ascetic Kōdō burned a crow mask on a fire of pine needles, and far up the slope a person's voice said something, surprised.",
    learned: "The Hidden Road is a practice, not a faith: going, looking, coming back, and helping someone else come back.", uncertain: "Whether Kharaveth's Orashai walk the same road under another name, as Kōdō thinks." },
  // Meghavan's four schools (meghavanschools.ts).
  { id: "cairn_north", name: "The cold made yours", kind: "rite", xp: 300,
    observed: "At the breath cairn above the north seam, counting in for four, hold for four, out for four, the cold stopped being outside you.",
    learned: "The Discipline of Inner Measure: the body keeps a count, and a counted breath is one the mountain can't take." },
  { id: "cairn_spring", name: "The spring's count", kind: "phenomenon", xp: 300,
    observed: "Beside the Ilavati's spring, the water comes out of the rock at the same count as a breath held and let go.",
    uncertain: "Whether you breathed at the water's count, or the water at yours." },
  { id: "cairn_peaks", name: "The fourth breath", kind: "rite", xp: 320,
    observed: "At the snowline under the eastern peaks, on the fourth breath, the heart slows as if it had been waiting to be asked.",
    learned: "The fourth breath is the one that belongs to you: not the third, which is impatience, nor the fifth, which is fear." },
  { id: "pattern_tank", name: "Sevens in the water", kind: "phenomenon", xp: 300,
    observed: "On the Great Tank every seventh ripple comes in higher, and every forty-ninth higher still.",
    learned: "The wind over the tank keeps a count, and the water keeps it for the wind." },
  { id: "pattern_stars", name: "The rains' calendar", kind: "phenomenon", xp: 300,
    observed: "On Sarovan's star wheel the rains come when the river of stars stands overhead.",
    learned: "The sky keeps a calendar and the monsoon reads it. The farmers learnt it from the wheel, or the wheel from the farmers." },
  { id: "pattern_serpent", name: "The serpent's coils", kind: "contradiction", xp: 340,
    observed: "The serpent carved on a pillar of the Great Stepwell is coiled in sevens, and sevens of sevens, the tank's own count.",
    learned: "The Stepwell's builders carved the water's pattern into the stone that holds it up.", uncertain: "Whether the serpent in the cistern learned the count from the carving, or the carver from the serpent." },
  { id: "door_rain", name: "The door at the Gate of Rains", kind: "site", xp: 300,
    observed: "With the Keepers' mark chalked on the Gate of Rains, the road west and the road east were, for a moment, two different roads.",
    learned: "A gate is a door between countries, and the Keepers mark where it is, not who may pass." },
  { id: "door_ford", name: "Ankle deep, between two countries", kind: "site", xp: 300,
    observed: "Marked, the ford below Tirthali showed exactly where Kharaveth stops and the Rain Country starts: in the water, ankle deep." },
  { id: "door_stair", name: "The old door under Sarovan", kind: "site", xp: 360,
    observed: "The air below the Great Stepwell's first landing is older and wetter than the air above it, and keeps its own time.",
    learned: "The Stepwell is a door, and a very old one: the Keepers have known it for as long as there have been Keepers.", uncertain: "What comes through it, besides water." },
  { id: "drowned_record", name: "The serpent's seventh", kind: "inscription", xp: 420,
    observed: "Read as counts, the drowned record in the Great Stepwell's cistern says: seven measures for the tank, seven times seven for the river, one for the serpent who keeps the count.",
    learned: "The Stepwell's builders paid the serpent, in water. The Archive reads Azhurak glyphs as numbers that forgot what they were counting.", uncertain: "Who stopped paying, and when." },
  { id: "inner_measure", name: "The Discipline of Inner Measure", kind: "rite", xp: 500,
    observed: "Breath-master Ojas taught the breath held against venom, and the blow struck on the fourth breath.",
    learned: "Inner Measure is a discipline, not a faith: counting, so that the cold, the fear and the blow are things you do, not things done to you." },
  { id: "living_patterns", name: "The School of Living Patterns", kind: "rite", xp: 450,
    observed: "Astronomer Vidyut taught the reading of a creature's pattern, as you'd read the stars or a tank's ripples.",
    learned: "Everything that lives keeps a pattern, and tells you what it will do, if you're listening." },
  { id: "thresholds", name: "The Keepers of Thresholds", kind: "rite", xp: 500,
    observed: "Door-keeper Ishwari taught the Keepers' mark, and the ward of a threshold chalked where you stand.",
    learned: "The Keepers don't send anything anywhere, as the Mizukai's binders do: they mark the door, and what came through it." },
  { id: "unfinished_things", name: "The Archive of Unfinished Things", kind: "rite", xp: 500,
    observed: "Scholar Anvaya read three rubbings as counts, and a record nobody could read became one somebody could.",
    learned: "The east reads Azhurak as numbers, the Orashai as words. Both are right about different halves of it.", uncertain: "Which half the Azhurak meant." },
] as Discovery[]).map(d => [d.id, d]));

/** Azhurak's glyphs met so far (each one's look, and what it means once understood). */
export const GLYPHS: readonly Glyph[] = [
  { id: "sun", name: "sun", looks: "a disc with a point in it", meaning: "sun, day" },
  { id: "road", name: "road", looks: "two lines running together", meaning: "road, way" },
  { id: "below", name: "below", looks: "a line with a wedge hanging under it", meaning: "below, beneath" },
  { id: "door", name: "door", looks: "an arch with a gap in it", meaning: "door, a way through" },
  { id: "water", name: "water", looks: "three waves stacked", meaning: "water" },
  { id: "star", name: "star", looks: "points scattered round a point", meaning: "star, night" },
  { id: "eye", name: "seeing", looks: "an almond with a point in it", meaning: "seeing, keeping, a watcher" },
  { id: "stone", name: "stone", looks: "a square, filled", meaning: "stone, a built thing" },
  { id: "name", name: "name", looks: "an open ring, like a loop of rope", meaning: "a name" },
  { id: "first", name: "first", looks: "one stroke with a cap on it", meaning: "first, before" },
  { id: "many", name: "many", looks: "three points in a row", meaning: "many" },
  { id: "measure", name: "measure", looks: "a bar balanced on a point", meaning: "measure, what is owed" },
  { id: "crown", name: "crown", looks: "a bowl with three points standing in it", meaning: "crown, a ruler" },
  { id: "hand", name: "hand", looks: "an open hand, five strokes", meaning: "hand, giving" },
  { id: "dust", name: "dust", looks: "a line broken into dots", meaning: "dust, an ending" },
];
export const GLYPH = Object.fromEntries(GLYPHS.map(glyph => [glyph.id, glyph])) as Record<string, Glyph>;

export const INSCRIPTIONS: Record<string, Inscription> = {
  sunteeth_stele: { id: "sunteeth_stele", name: "The Sunteeth stele", glyphs: ["road", "below", "first", "door"], reading: "The road below. The first door.", where: "A blind canyon on the Sunteeth's west side" },
  underway_lintel: { id: "underway_lintel", name: "The refuge lintel", glyphs: ["stone", "eye", "name"], reading: "The stone that watches keeps the name.", where: "Over the refuge in the Underway" },
  underway_glyphs: { id: "underway_glyphs", name: "The teaching wall", glyphs: ["sun", "water", "star"], reading: "Sun. Water. Star.", where: "The Underway's shrine hall" },
  underway_marker: { id: "underway_marker", name: "A road marker", glyphs: ["road", "many", "sun", "measure"], reading: "The road: many days, by measure.", where: "Where the Underway turns north" },
  seven_crowns: { id: "seven_crowns", name: "The fallen stone", glyphs: ["crown", "many", "first", "name"], reading: "Many crowns. One first name.", where: "The middle of the Seven Crowns" },
  first_names_door: { id: "first_names_door", name: "The sealed door", glyphs: ["first", "name", "door", "eye"], reading: "The first names. The door that sees.", where: "The Hall of First Names, in the Ochre Spine" },
  sunken_obelisk: { id: "sunken_obelisk", name: "The Sunken Obelisk", glyphs: ["sun", "below", "water", "measure"], reading: "The sun goes below. The water is measured.", where: "The far south-west of the Sea of Dunes" },
  pyramid_marks: { id: "pyramid_marks", name: "Builders' marks", glyphs: ["stone", "many", "sun", "dust"], reading: "Stone, for many days. Then dust.", where: "The Unfinished Pyramid" },
  black_stair_lintel: { id: "black_stair_lintel", name: "The warden's lintel", glyphs: ["stone", "eye", "below", "measure"], reading: "The stone watches below, by measure.", where: "The Black Stair" },
  khasreth_seal: { id: "khasreth_seal", name: "The Matriarch's seal", glyphs: ["measure", "many", "name", "hand"], reading: "By measure, to the many names, given.", where: "The seal of House Khasreth" },
};

/** A player's Mysteries record: discoveries (the tick each was made), glyphs (1 seen, 2 understood), inscriptions read. */
export type MysteriesRecord = { found: Record<string, number>; glyphs: Record<string, 1 | 2>; read: Record<string, 1> };
export const newMysteries = (): MysteriesRecord => ({ found: {}, glyphs: {}, read: {} });

/** Read a saved record, keeping only what the game knows of (and nothing it doesn't). */
export function cleanMysteries(raw: unknown): MysteriesRecord {
  const out = newMysteries();
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  const map = (value: unknown) => value && typeof value === "object" ? Object.entries(value as Record<string, unknown>) : [];
  for (const [id, tick] of map(r.found)) if (id in DISCOVERIES && typeof tick === "number" && Number.isFinite(tick)) out.found[id] = Math.max(0, Math.floor(tick));
  for (const [id, state] of map(r.glyphs)) if (id in GLYPH && (state === 1 || state === 2)) out.glyphs[id] = state;
  for (const [id, state] of map(r.read)) if (id in INSCRIPTIONS && state === 1) out.read[id] = 1;
  return out;
}

export const knows = (game: Game, id: string) => id in game.player.mysteries.found;
export const glyphState = (game: Game, id: string) => game.player.mysteries.glyphs[id] ?? 0;

/** Record a discovery: the first time only, with its Mysteries XP and a little Presence. Returns whether it was new. */
export function discover(game: Game, id: string): boolean {
  const record = game.player.mysteries, def = DISCOVERIES[id];
  if (!def || id in record.found) return false;
  record.found[id] = game.tick;
  addXp(game, "mysteries", def.xp, { raw: true }); addXp(game, "presence", Math.round(def.xp / 2), { raw: true });
  message(game, `Mysteries discovery: ${def.name}.`, "quest"); sound(game, "quest");
  return true;
}

/** See a glyph (the first time: a little XP), or come to understand it (more, and it may let an inscription be read). */
export function learnGlyph(game: Game, id: string, understood: boolean): boolean {
  const record = game.player.mysteries, was = record.glyphs[id] ?? 0, now = understood ? 2 : 1;
  if (!(id in GLYPH) || was >= now) return false;
  record.glyphs[id] = now;
  addXp(game, "mysteries", understood ? 120 : 30, { raw: true });
  if (understood) message(game, `You understand an Azhurak glyph: ${GLYPH[id].looks} means "${GLYPH[id].meaning}".`, "info");
  for (const inscription of Object.values(INSCRIPTIONS)) if (!(inscription.id in record.read) && seenAll(game, inscription) && inscription.glyphs.every(glyph => record.glyphs[glyph] === 2)) {
    record.read[inscription.id] = 1; addXp(game, "mysteries", 300, { raw: true });
    message(game, `You can read ${inscription.name.replace(/^The /, "the ")} now: "${inscription.reading}"`, "quest");
  }
  return true;
}
const seenAll = (game: Game, inscription: Inscription) => inscription.glyphs.every(glyph => (game.player.mysteries.glyphs[glyph] ?? 0) >= 1);

/** Look at an inscription: every glyph in it is seen, and it's read out as far as you understand it. */
export function readInscription(game: Game, id: string): string {
  const inscription = INSCRIPTIONS[id];
  if (!inscription) return "Marks too worn to make out.";
  for (const glyph of inscription.glyphs) learnGlyph(game, glyph, false);
  if (id in game.player.mysteries.read) return `Azhurak glyphs, cut deep. You read them: "${inscription.reading}"`;
  // A sentence a glyph, so each reads in any language: what you understand, and the shapes of what you don't yet.
  const words = inscription.glyphs.map(glyph => glyphState(game, glyph) === 2 ? `A glyph you know: ${GLYPH[glyph].meaning.split(",")[0]}.` : `One you don't: ${GLYPH[glyph].looks}.`);
  return `Azhurak glyphs, cut deep. ${words.join(" ")}`;
}

/** Study an inscribed sherd: one glyph on it you haven't seen, or nothing new. */
export function studySherd(game: Game): string {
  const unseen = GLYPHS.filter(glyph => !game.player.mysteries.glyphs[glyph.id] && glyph.id !== "measure" && glyph.id !== "hand");
  if (!unseen.length) return "The sherd's glyphs are ones you know by sight already.";
  const glyph = unseen[Math.floor(game.rng() * unseen.length)];
  learnGlyph(game, glyph.id, false);
  return `Among the marks on the sherd, one you haven't seen before: ${glyph.looks}.`;
}
