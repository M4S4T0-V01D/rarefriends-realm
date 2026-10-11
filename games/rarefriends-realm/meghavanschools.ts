/**
 * The Land Before Stone: Meghavan's four schools of the Mysteries. Not the Orashai's gods, not the Hidden Road's walking:
 * the east's own ways of finding things out, each with its teacher, its initiation, and what it teaches a fighter.
 *
 * The Discipline of Inner Measure (Shailagarh): breath counted against the cold, and a counter timed to the fourth
 * breath. Breath-master Ojas sends you up to the three breath cairns above the mines. The School of Living Patterns
 * (the observatory outside Sarovan): every creature keeps a pattern, as the stars and the water do. Astronomer Vidyut
 * wants three patterns read. The Keepers of Thresholds (Tirthali): a ford, a gate and a stair are each a door between
 * one place and another; Door-keeper Ishwari teaches marking them, and the creatures that came through one. The Archive
 * of Unfinished Things (Suvarnatira): the Archive's Keeper of Unfinished Things reads Azhurak glyphs as counts, not
 * words, and turns records nobody can read into ones somebody can, by research.
 */
import { addXp, message, sound, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { discover } from "./mysteries.ts";
import type { WorldObject } from "./world.ts";

export const INNER_MEASURE = "counted_breath", LIVING_PATTERNS = "patterns_in_water", THRESHOLDS = "keepers_door", UNFINISHED = "unfinished_page";
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family: 9, seed }, ...extra });
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const all = (game: Game, keys: readonly string[]) => keys.every(key => data(game, key));

/** Each school's three places: [quest flag, clue id, journal line]. */
const CAIRNS = [["im_c0", "breath_cairn_0", "The breath cairn above the north seam"], ["im_c1", "breath_cairn_1", "The breath cairn by the Ilavati's spring"], ["im_c2", "breath_cairn_2", "The breath cairn under the eastern peaks"]] as const;
const PATTERNS = [["lp_tank", "pattern_tank", "The ripples on the Great Tank"], ["lp_wheel", "pattern_wheel", "The observatory's star wheel"], ["lp_pillar", "pattern_pillar", "The serpent pillar in the Great Stepwell"]] as const;
const DOORS = [["kt_gate", "threshold_rain", "The Gate of Rains"], ["kt_ford", "threshold_ford", "The ford below Tirthali"], ["kt_stair", "threshold_stair", "The Great Stepwell's first landing"]] as const;
const RUBBINGS = [["ar_plaque", "rain_gate_plaque", "A rubbing of the Gate of Rains' plaque"], ["ar_stone", "speakers_stone", "A rubbing of the Speaker's stone"], ["ar_record", "drowned_record", "The drowned record, in the Great Stepwell's cistern"]] as const;

export const MEGHAVAN_SCHOOL_NPCS: Record<string, NpcDef> = {
  school_ojas: person("school_ojas", "Breath-master Ojas", "A thin, unhurried old man of the Discipline of Inner Measure, barefoot on the cold stone. He breathes as if he were counting, because he is.", 1790),
  school_vidyut: person("school_vidyut", "Astronomer Vidyut", "Keeper of Sarovan's observatory and the School of Living Patterns: ink-stained, sleepless, and delighted by everything that repeats.", 1791),
  school_ishwari: person("school_ishwari", "Door-keeper Ishwari", "A Keeper of Thresholds, in a saffron shawl with chalk on her fingers. She stands in doorways out of habit, and won't say whose.", 1792),
  school_anvaya: person("school_anvaya", "Scholar Anvaya", "The Archive's Keeper of Unfinished Things: every half-read record, abandoned translation and question nobody answered is on her shelves, and she is fond of all of them.", 1793),
};

const school = (id: string, name: string, points: number, start: string, rewards: string[], places: readonly (readonly [string, string, string])[], intro: string, task: string, done: string, back: string): QuestDef => ({
  id, name, points, difficulty: "Intermediate", start, requirements: ["A Foothold in the Stone", "Mysteries 15"], rewards,
  journal: game => {
    const s = stage(game, id);
    if (s === 0) return [intro];
    if (s === 1) return [task, ...places.map(([key, , text]) => mark(!!data(game, key), text)), mark(all(game, places.map(([key]) => key)), back)];
    return [done];
  },
});
export const MEGHAVAN_SCHOOL_QUESTS: readonly QuestDef[] = [
  school(INNER_MEASURE, "The Counted Breath", 2, "Talk to Breath-master Ojas in the Breath Hall outside Shailagarh's west gate.",
    ["2 Quest Points", "3,000 Mysteries XP", "The Discipline of Inner Measure's techniques: Held Breath and the Fourth Breath"], CAIRNS,
    "Outside Shailagarh's west gate, in a hall with no fire, an old man sits barefoot on the stone and counts his breathing.",
    "Breath-master Ojas teaches the Discipline of Inner Measure. He wants me to sit at the three breath cairns on the heights and count my breath at each, in the cold.",
    "I counted my breath at the three cairns and Ojas taught me to hold it against venom, and to strike on the fourth breath. QUEST COMPLETE!", "Then go back to Ojas"),
  school(LIVING_PATTERNS, "Patterns in the Water", 1, "Talk to Astronomer Vidyut at the observatory north of Sarovan's walls.",
    ["1 Quest Point", "2,500 Mysteries XP", "The School of Living Patterns' technique: Reading the Pattern"], PATTERNS,
    "North of Sarovan's walls, a little tower with a brass star wheel on its roof. Somebody up there is laughing at the sky.",
    "Astronomer Vidyut says everything that lives keeps a pattern, as the stars do and the water. She wants me to read three: in the tank, in the sky, and in stone.",
    "I read the patterns in the tank, the stars and the Stepwell's serpent, and Vidyut taught me to read a creature's the same way. QUEST COMPLETE!", "Then go back to Vidyut"),
  school(THRESHOLDS, "The Keepers' Door", 2, "Talk to Door-keeper Ishwari at the ford post below Tirthali.",
    ["2 Quest Points", "3,000 Mysteries XP", "The Keepers of Thresholds' techniques: the Threshold Mark and the Doorstone Ward"], DOORS,
    "At the ford post below Tirthali a woman in a saffron shawl is chalking marks on the post, and rubbing them out, and chalking them again.",
    "Door-keeper Ishwari of the Keepers of Thresholds says a gate, a ford and a stair are all doors between one place and another. She wants me to mark three of them, as the Keepers do.",
    "I marked the Gate of Rains, the ford and the Stepwell's landing, and Ishwari taught me the Keepers' mark and their ward. QUEST COMPLETE!", "Then go back to Ishwari"),
  school(UNFINISHED, "The Unfinished Page", 2, "Talk to Scholar Anvaya in the Archive of Suvarnatira.",
    ["2 Quest Points", "3,500 Mysteries XP", "The Archive of Unfinished Things' technique: the Prepared Answer"], RUBBINGS,
    "Among the Archive's shelves, a door marked 'Unfinished'. Behind it, a scholar is reading three books at once and finishing none of them.",
    "Scholar Anvaya of the Archive of Unfinished Things reads Azhurak glyphs as counts, not words. She wants rubbings of three old writings in Meghavan, one of them under water.",
    "Anvaya read my rubbings as counts and the drowned record became readable. She taught me the Archive's way with a foe: research it, then answer it. QUEST COMPLETE!", "Then go back to Anvaya"),
];

type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
/** A school's place: anyone can look; someone on the initiation does the school's thing there, once. */
const place = (quest: string, key: string, discovery: string, verb: string, examine: string, look: string, done: string): Clue => ({
  options: game => stage(game, quest) === 1 && !data(game, key) ? [verb, "Look"] : ["Look"],
  examine: () => examine,
  use: (game, _object, option) => {
    if (option !== verb || stage(game, quest) !== 1 || data(game, key)) return { text: look };
    flag(game, key); discover(game, discovery);
    return { text: done };
  },
});
export const MEGHAVAN_SCHOOL_CLUES: Record<string, Clue> = {
  breath_cairn_0: place(INNER_MEASURE, "im_c0", "cairn_north", "Breathe", "A cairn of flat stones on the heights above the north seam, a prayer flag of plain cloth on a pole.",
    "A cairn, and the wind, and the mines below.", "You sit by the cairn and count: in for four, hold for four, out for four. The cold stops being outside you and becomes a thing you're doing. The wind goes on, and you go on under it."),
  breath_cairn_1: place(INNER_MEASURE, "im_c1", "cairn_spring", "Breathe", "A cairn by the pool where the Ilavati comes out of the rock.",
    "A cairn by a spring.", "You count your breath beside the spring. The water comes out of the rock at the same count, or you breathe at the water's. It's hard to tell which, and then it doesn't matter."),
  breath_cairn_2: place(INNER_MEASURE, "im_c2", "cairn_peaks", "Breathe", "A cairn under the eastern peaks, where the snow starts.",
    "A cairn at the snowline.", "On the fourth breath at the snowline your heart slows, as if it had been waiting to be asked. Something in you that was clenched lets go."),
  pattern_tank: place(LIVING_PATTERNS, "lp_tank", "pattern_tank", "Read", "The Great Tank's south ghats, where the water laps the lowest step.",
    "Water against stone.", "You watch the ripples. Every seventh comes in higher, and every forty-ninth higher still: the wind over the tank keeps a count, and the water keeps it for the wind."),
  pattern_wheel: place(LIVING_PATTERNS, "lp_wheel", "pattern_stars", "Read", "A brass star wheel on the observatory roof, its rings marked with stars and the months of rain.",
    "A star wheel.", "You turn the wheel. The rains come when the river of stars stands overhead; the wheel knew before the farmers did. The sky keeps a calendar, and the rain reads it."),
  pattern_pillar: place(LIVING_PATTERNS, "lp_pillar", "pattern_serpent", "Read", "A pillar in the Great Stepwell carved with a serpent holding up the rain, its coils counted in sevens.",
    "A carved serpent on a pillar.", "The serpent's coils are counted like the ripples: seven, and seven times seven. The builders carved the tank's pattern into the stone that holds it up. Whatever lives below learned it too."),
  threshold_rain: place(THRESHOLDS, "kt_gate", "door_rain", "Mark", "The Gate of Rains' south pillar, at the height of a hand.",
    "A pillar of the Gate of Rains.", "You chalk the Keepers' mark on the pillar: a line, a gap, a line. For a moment the road west and the road east are two different roads, and you are standing in neither."),
  threshold_ford: place(THRESHOLDS, "kt_ford", "door_ford", "Mark", "The ford post below Tirthali, chalked and rubbed out many times.",
    "A ford post.", "You chalk the mark on the ford post. The river doesn't change, but you know, suddenly, exactly where Kharaveth stops and the Rain Country starts: here, in the water, ankle deep."),
  threshold_stair: place(THRESHOLDS, "kt_stair", "door_stair", "Mark", "The Great Stepwell's first landing, where the steps down meet the steps across.",
    "The first landing.", "You chalk the mark on the landing's edge. The air below is a different air: older, wetter, keeping its own time. A door, and you've just knocked on it."),
  drowned_record: {
    options: game => stage(game, UNFINISHED) === 1 && !data(game, "ar_record") ? ["Take-rubbing", "Look"] : ["Look"],
    examine: () => "A stone tablet half under the cistern's water, cut with glyphs worn almost smooth.",
    use: (game, _object, option) => {
      if (questDone(game, UNFINISHED)) { discover(game, "drowned_record"); return { text: "Read as counts, the drowned record says: 'Seven measures for the tank, seven times seven for the river, and one for the serpent who keeps the count.' The Stepwell's builders paid the serpent, in water." }; }
      if (option !== "Take-rubbing" || stage(game, UNFINISHED) !== 1 || data(game, "ar_record")) return { text: "Glyphs, worn by water. You can see them; you can't read them." };
      flag(game, "ar_record"); addXp(game, "mysteries", 300, { raw: true });
      return { text: "You lay paper on the wet stone and rub it with charcoal. The glyphs come up grey on white, clearer than on the stone. You still can't read them. Somebody in Suvarnatira might." };
    },
  },
};
/** The Archive's rubbings of the plaque and the Speaker's stone: another option on clues meghavanpeople.ts already has. */
export const RUBBING_OPTION = { rain_gate_plaque: "ar_plaque", speakers_stone: "ar_stone" } as const;
export function takeRubbing(game: Game, clue: keyof typeof RUBBING_OPTION): string | null {
  const key = RUBBING_OPTION[clue];
  if (stage(game, UNFINISHED) !== 1 || data(game, key)) return null;
  flag(game, key); addXp(game, "mysteries", 200, { raw: true });
  return "You take a rubbing of the old writing, charcoal on paper, for Scholar Anvaya.";
}
export const canRub = (game: Game, clue: keyof typeof RUBBING_OPTION) => stage(game, UNFINISHED) === 1 && !data(game, RUBBING_OPTION[clue]);

export function talkMeghavanSchools(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, says = (...lines: string[]) => npcSays(name, ...lines);
  const teach = (quest: string, places: readonly (readonly [string, string, string])[], first: string[], start: string, waiting: readonly string[], finish: string[], finished: () => void, after: readonly string[]): Dialogue => {
    const s = stage(game, quest);
    if (s === 0) {
      if (!questDone(game, "foothold_in_the_stone")) return chat(name, says("Hollowmere's people are welcome to sit. To learn, come back when Hollowmere's let you out of its fence."));
      return chat(name, says(...first), [
        { label: "Teach me.", then: () => chat(name, says(start), undefined, () => { player.quests[quest] = 1; say(game, `Quest started: ${MEGHAVAN_SCHOOL_QUESTS.find(q => q.id === quest)!.name}.`); }) },
        { label: "Not now.", then: () => null },
      ]);
    }
    if (s === 1 && !all(game, places.map(([key]) => key))) return chat(name, says(pick(game, waiting)));
    if (s === 1) return chat(name, says(...finish), undefined, finished);
    return chat(name, says(pick(game, after)));
  };
  switch (npcId) {
    case "school_ojas": return teach(INNER_MEASURE, CAIRNS,
      ["You came up the pass breathing like a bellows. Everyone does. The mountain takes your breath and doesn't give it back unless you ask properly.", "The Discipline of Inner Measure is only that: asking properly. Breath, counted. A blow, timed to the count. The cold, made into something you do rather than something done to you."],
      "Three cairns on the heights: above the north seam, by the Ilavati's spring, under the eastern peaks where the snow starts. Sit at each and count your breath until the cold is yours. Then come back.",
      ["Three cairns. Don't hurry between them; you'll only have to count longer.", "In for four, hold for four, out for four. Again. Again."],
      ["You counted at all three. Your breathing's different: you're not doing it any more, you're keeping it.", "Two things, then. Held Breath: when venom's coming, hold the breath you've counted, and it can't take you. And the Fourth Breath: count four, and strike on the fourth, not before and not after. On the fourth, nothing misses."],
      () => finishSchool(game, INNER_MEASURE, "inner_measure", 3000, "Held Breath and the Fourth Breath are yours: Mysteries techniques, in your Combat options."),
      ["In for four, hold for four, out for four. You remember.", "Lord Varanjit's sentries come to me in winter. Cold makes students of everyone.", "The fourth breath. Not the third because you're impatient, not the fifth because you're afraid."]);
    case "school_vidyut": return teach(LIVING_PATTERNS, PATTERNS,
      ["Everything that lives keeps a pattern! The stars keep one, the water keeps one, the peafowl keeps one when it screams. Find the pattern and you know what it will do before it does.", "The School of Living Patterns is the reading of them. Shall I teach you to read?"],
      "Read three: the ripples on the Great Tank, from its south ghats; my star wheel, on the roof above us; and the serpent pillar down in the Great Stepwell. Then tell me what they had in common.",
      ["The tank, the wheel, the pillar. Look until it repeats, then look until you see why.", "Sevens. No, don't let me tell you. Go and look."],
      ["Sevens! In the water, in the sky, in the stone. The builders knew; the rain knows; and now you know.", "A creature is the same. Watch one fight and you'll see its pattern: what it's weak to, how it strikes, what it guards. Reading the Pattern: look, and the pattern tells you. Your Pursuance journal will thank me."],
      () => finishSchool(game, LIVING_PATTERNS, "living_patterns", 2500, "Reading the Pattern is yours: a Mysteries technique, in your Combat options."),
      ["Sevens, everywhere. I'm sorry. I'm not sorry.", "The Queen asked me if the rains will come on time. I said yes. The stars said yes first.", "Read before you strike. Everything tells you what it's going to do, if you're listening."]);
    case "school_ishwari": return teach(THRESHOLDS, DOORS,
      ["A ford is a door. A gate is a door. A stair is a door. Everything that goes from one place to another goes through one, and the Keepers of Thresholds keep them.", "Not like the Mizukai's spirit-binders: we don't send anything anywhere. We mark where the door is, and what came through it. Will you learn the mark?"],
      "Three doors: the Gate of Rains, this ford, and the Great Stepwell's first landing. Mark each with the Keepers' mark: a line, a gap, a line. Come back and I'll show you what else it's for.",
      ["The Gate, the ford, the Stepwell's landing. Chalk each. Don't step through while you're marking it.", "A line, a gap, a line. The gap is the important part."],
      ["Three doors marked. You felt it, at the Stepwell? Everyone does. That one's very old.", "Now: the Threshold Mark. Anything that came back through a door it shouldn't have, the dead, the wayward spirits, the things that cross over, you can mark, and it's half in the doorway: you strike it harder. And the Doorstone Ward: chalk a threshold where you stand, and blows that come at you through it lose a quarter of themselves."],
      () => finishSchool(game, THRESHOLDS, "thresholds", 3000, "The Threshold Mark and the Doorstone Ward are yours: Mysteries techniques, in your Combat options."),
      ["Every door's a little bit open. That's what makes it a door.", "The ferrywarden lets me chalk his post. He says it keeps the ford honest. It keeps the ford a ford.", "Mark what crossed over. Ward where you stand. Never both in the same doorway."]);
    case "school_anvaya": return teach(UNFINISHED, RUBBINGS,
      ["The Orashai read Azhurak glyphs as words. We read them as counts: so much water, so many days, so many stones. A glyph is a number that forgot what it was counting.", "The Archive of Unfinished Things keeps everything nobody finished reading. I'd like you to help finish something."],
      "Bring me rubbings: of the plaque on the Gate of Rains, of the Speaker's stone in the Mandapa, and of the drowned record in the Great Stepwell's cistern. I'll lend you the charcoal and paper. The last is under water. Mind the serpent.",
      ["The plaque, the stone, the drowned record. Rubbings, not guesses.", "Under water, yes. The best records always are."],
      ["Counts. Look: the plaque counts the rains, the stone counts the Speakers, and the drowned record counts the tank's water in sevens, and pays one seventh to something it calls the serpent. Readable, at last.", "That's the Archive's way with a foe, too. Research it: the Archive keeps a record of every great beast someone has faced and lived. Then answer it: you know its count, and you strike where it's short. The Prepared Answer."],
      () => finishSchool(game, UNFINISHED, "unfinished_things", 3500, "The Prepared Answer is yours: a Mysteries technique, in your Combat options."),
      ["Unfinished isn't the same as abandoned. Unfinished is waiting.", "The Orashai would call that drowned record a prayer. I call it an invoice.", "Research, then answer. Never answer first."]);
  }
  return null;
}
function finishSchool(game: Game, quest: string, rite: string, xp: number, taught: string) {
  if (questDone(game, quest)) return;
  discover(game, rite);
  addXp(game, "mysteries", xp, { raw: true });
  completeQuest(game, quest);
  say(game, taught);
}
