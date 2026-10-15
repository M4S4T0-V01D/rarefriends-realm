/**
 * The Prismwild's people (prismworld.ts places them): the Collegium of the Seventh Lamp's Archmagister, tutor and
 * librarian, its students, Pell Ashby the student who went missing among the fae, Lady Hawthorn who keeps him, the fae
 * folk, the warden at the Shardfields' edge, and Fennick, the wizard who runs the Labyrinth (labyrinth.ts).
 *
 * The Seventh Lamp: Archmagister Vey will enrol anyone who can show they can work the Prismwild's magic (ten pinches of
 * glimmer dust, off the moths) and who'll do the Collegium a kindness first: Pell Ashby went into the Fae Hollows to
 * study the fae and hasn't come out. His satchel lies on the way in; Lady Hawthorn has him dancing in her Thorn Ring and
 * will let him go for the answer to a riddle. Pell comes home, the dust goes to the Archmagister, and you're enrolled:
 * the Collegium's stores, Fennick's welcome at the Labyrinth (and thirty mazeglass on account), Magic XP.
 */
import { addXp, count, giveOrDrop, message, sound, take, type Dialogue, type Game } from "./state.ts";
import type { WorldObject } from "./world.ts";
import { chat, completeQuest, data, npcSays, stage, type NpcDef, type QuestDef } from "./content.ts";
import { MAX_RING, mazeJump, startMazeRun } from "./labyrinth.ts";

export const SEVENTH_LAMP = "seventh_lamp";
/** Glimmer dust the Archmagister wants. */
export const DUST_WANTED = 10;

const flag = (game: Game, key: string) => { game.player.questData[key] = 1; };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const onQuest = (game: Game) => stage(game, SEVENTH_LAMP) === 1;
const pellFreed = (game: Game) => !!data(game, "sl_pell") || stage(game, SEVENTH_LAMP) >= 2;

const person = (id: string, name: string, examine: string, family: number, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: { family, seed }, ...extra });
export const PRISM_NPCS: Record<string, NpcDef> = {
  archmagister_vey: person("archmagister_vey", "Archmagister Halcyon Vey", "The Collegium's head: silver-haired, ink to the elbows, and kinder than she lets on. She has opinions about everyone's handwriting.", 5, 2301),
  tutor_quill: person("tutor_quill", "Tutor Marisol Quill", "Tutor of Sigils, and keeper of the Collegium's stores. She counts every sigil that leaves them.", 9, 2302, { options: ["Talk-to", "Trade"], shop: "collegium_stores" }),
  librarian_osk: person("librarian_osk", "Librarian Osk", "Keeps the Library of the Seventh Lamp, and most of its secrets. Speaks in a whisper even outdoors.", 4, 2303),
  collegium_student: person("collegium_student", "Student", "A student of the Collegium, robes ink-stained, lilac tea in hand, behind on something.", 9, 2304),
  pell_ashby_lost: person("pell_ashby_lost", "Pell Ashby", "A Collegium student, dancing in a fairy ring with a fixed and dreadful smile. He doesn't seem able to stop.", 9, 2305, { present: game => !pellFreed(game) }),
  pell_ashby: person("pell_ashby", "Pell Ashby", "A Collegium student, back at his desk and writing up the fae with feeling. His feet still hurt.", 9, 2305, { present: pellFreed }),
  lady_hawthorn: person("lady_hawthorn", "Lady Hawthorn", "A lady of the fae, crowned with hawthorn, as old as the Hollows and as polite as a knife.", 5, 2306),
  fae_folk: person("fae_folk", "Fae", "One of the fair folk of the Hollows, small, quick and glowing faintly. It's laughing at something, possibly you.", 5, 2307),
  shard_warden: person("shard_warden", "Warden Brannoc", "Keeps watch at the Shardfields' edge for the Collegium, and keeps students out of them, mostly.", 6, 2308),
  fennick: person("fennick", "Fennick", "The Collegium's least respectable wizard: hat askew, robes mismatched, an hourglass on a chain. He built the Labyrinth for fun. Mostly his.", 5, 2309, { options: ["Talk-to", "Trade"], shop: "fennicks_curios" }),
};

export const PRISM_QUESTS: readonly QuestDef[] = [{
  id: SEVENTH_LAMP, name: "The Seventh Lamp", points: 2, difficulty: "Intermediate",
  start: "Talk to Archmagister Vey in the Great Hall of the Collegium of the Seventh Lamp, in the Prismwild.",
  requirements: ["The way to the Prismwild: the Glass Causeway, off the Zoryavik's north coast", "Magic 20 recommended"],
  rewards: ["2 Quest Points", "8,000 Magic XP", "Enrolled at the Collegium: Fennick puts 30 mazeglass on account", "2 Collegium tablets"],
  journal: game => {
    const s = stage(game, SEVENTH_LAMP);
    if (s === 0) return ["Archmagister Vey, in the Great Hall of the Collegium of the Seventh Lamp, takes students. Not everyone."];
    if (s === 1) return ["Archmagister Vey will enrol me if I can work the Prismwild's magic and do the Collegium a kindness: a student, Pell Ashby, went into the Fae Hollows and hasn't come back.",
      mark(count(game.player, "glimmer_dust") >= DUST_WANTED || !!data(game, "sl_dust"), "Bring ten pinches of glimmer dust (the glimmer moths on the downs have it)"),
      mark(!!data(game, "sl_satchel"), "Look for Pell's trail on the way into the Fae Hollows"),
      mark(pellFreed(game), "Find Pell Ashby, and get him home"),
      "• Then talk to Archmagister Vey"];
    return ["Pell Ashby is home, the Archmagister has her glimmer dust, and I'm enrolled at the Collegium of the Seventh Lamp. Fennick has thirty mazeglass on account for me at the Labyrinth. QUEST COMPLETE!"];
  },
}];

/** The Prismwild's clues: Pell's dropped satchel. */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
export const PRISM_CLUES: Record<string, Clue> = {
  pell_satchel: {
    options: () => ["Search"], examine: () => "Scuffed grass, and a satchel dropped in it.",
    use: game => {
      if (!onQuest(game)) return { text: "Scuffed grass. Someone came this way in a hurry, or dancing." };
      if (!data(game, "sl_satchel")) { flag(game, "sl_satchel"); giveOrDrop(game, "student_satchel"); addXp(game, "magic", 400, { raw: true }); }
      return { text: "A Collegium satchel, wet with dew, full of notes on the fae. The last page: \"Lights in the ring at dusk. Music. I'll only look.\" The scuffs go on south, in little skipping steps." };
    },
  },
};

const RIDDLE = "\"The more of them you take, the more of them you leave behind.\" What are they?";
/** The Prismwild's people. Null when they've nothing to say (and the talk chain goes on). */
export function talkPrismwild(game: Game, npcId: string, name: string): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const ask = (lines: string[], options: Dialogue["options"]) => chat(name, npcSays(name, ...lines), options);
  const p = game.player, s = stage(game, SEVENTH_LAMP);
  switch (npcId) {
    case "archmagister_vey": {
      if (s === 0) return ask(["Welcome to the Collegium of the Seventh Lamp. You came over the Causeway, so you're either a student, a merchant or lost. We teach the first, tolerate the second, and the third usually becomes the first.",
        "I'll enrol you if you can show me two things: that you can work this land's magic, and that you'll do the Collegium a kindness."], [
        { label: "What do you need?", then: () => chat(name, npcSays(name, "Ten pinches of glimmer dust, from the moths on the downs: the Prismwild's magic, in a form you can carry. And a student, Pell Ashby, went into the Fae Hollows to the south a week ago to observe the fae. He hasn't come back. The fae keep what interests them.", "Bring me the dust, and bring Pell home."), undefined, () => {
          p.quests[SEVENTH_LAMP] = 1; say(game, "Quest started: The Seventh Lamp.");
        }) },
        { label: "What is the Seventh Lamp?", then: () => says("Six lamps were lit in the Realm's first age, the old books say, one for each school of the art. The seventh was lit here, for the art itself. That's its tower, the tall one. It still burns. We keep it.") },
        { label: "Not now.", then: () => null }]);
      if (s === 1) {
        const dust = count(p, "glimmer_dust") >= DUST_WANTED || !!data(game, "sl_dust");
        if (dust && pellFreed(game)) return ask(["Pell's home: I heard him from here, telling the students about it. And you've the dust?"], [
          { label: "Here: ten pinches of glimmer dust.", then: () => {
            if (!data(game, "sl_dust")) { if (count(p, "glimmer_dust") < DUST_WANTED) return says("That isn't ten. I can count; it's the first thing we teach."); take(p, "glimmer_dust", DUST_WANTED); flag(game, "sl_dust"); }
            addXp(game, "magic", 8000, { raw: true }); giveOrDrop(game, "tablet_collegium", 2); flag(game, "sl_fennick"); completeQuest(game, SEVENTH_LAMP);
            return says("Then you're enrolled. Your name's in the book, in your own handwriting, which we'll work on. Go and see Fennick at his Labyrinth: I've told him to put you on account. Don't let him explain the rules; just run.");
          } }, { label: "Not yet.", then: () => null }]);
        return says(dust ? "You've the dust. Now Pell: the Fae Hollows, south of here. Mind the rings." : pellFreed(game) ? "Pell's home, and grateful. Now the dust: ten pinches, off the glimmer moths on the downs." : "Ten pinches of glimmer dust from the moths, and Pell Ashby home from the Fae Hollows, to the south.");
      }
      return says("The Seventh Lamp still burns, and you're one of the reasons we keep it lit. Study hard. Run Fennick's maze if you must.");
    }
    case "lady_hawthorn": {
      if (onQuest(game) && !pellFreed(game)) {
        if (!data(game, "sl_satchel")) return says("You're stepping on my lawn, mortal. Everyone's stepping on my lawn today.");
        return ask(["You've his satchel. He's mine now: he came into my ring of his own will, and he dances beautifully. But I'll trade. Answer me a riddle, and he goes home. Answer wrong, and you may try again tomorrow. Or now. I'm not unkind.", RIDDLE], [
          { label: "Footsteps.", then: () => { flag(game, "sl_pell"); addXp(game, "magic", 1500, { raw: true }); say(game, "Lady Hawthorn laughs, and the music in the Thorn Ring stops."); return says("Footsteps! Clever. Take him, then: he's worn out his shoes in any case. Tell your Archmagister the Hollows keep what interests them, and that she interests me."); } },
          { label: "Time.", then: () => says("Time? You can't take time, mortal. It takes you. Try again.") },
          { label: "Holes.", then: () => says("Holes you leave behind, but you don't take them. Try again.") },
          { label: "I'll think about it.", then: () => null }]);
      }
      return says(pellFreed(game) ? "Your student's gone home. The ring is so quiet now. You'll visit? Everyone says they'll visit." : "The Hollows are mine, mortal, and the rings in them, and anything that dances in them. Mind your feet.");
    }
    case "pell_ashby_lost":
      return says(onQuest(game) ? "Can't stop. Can't stop! It's wonderful. Help. It's wonderful. Talk to her, the lady, she likes riddles, she asks everyone riddles. Help!" : "Can't stop! It's wonderful! Please go away! Help!");
    case "pell_ashby":
      return says(s === 1 ? "You got me out! I'll never look at a fairy ring again. Well. Not up close. Thank you. Tell the Archmagister I'm writing it up." : "My feet still hurt. My paper on the fae is going to be magnificent, though. Footnotes the length of your arm.");
    case "tutor_quill": return says("Sigils for students, at the Collegium's price, and lilac tea, because nobody here sleeps. Trade with me if you need anything.");
    case "librarian_osk": return says(...[
      "The Library holds the Collegium's books, and the Prismwild's: they grow here, did you know? Crystal, I mean. Not books. Books are written.",
      "The Shardfields grow faster every century. The golems, too. Warden Brannoc says it's nothing. Warden Brannoc says most things are nothing.",
      "Fennick? He was a brilliant student. Then a brilliant tutor. Then he built a maze. We don't talk about the years in between.",
    ].slice(game.tick % 3, game.tick % 3 + 1));
    case "collegium_student": return says(...[
      "I've an exam on the Seventh Lamp tomorrow. The question is always the same: why is it the seventh? Nobody's answer is ever right.",
      "Don't step in the fairy rings. Pell did. We're all still talking about it.",
      "Fennick's Labyrinth paid for my robes. Two hours of running in circles and a coffer with my name on it. Well, with a shine on it.",
      "Lilac tea. It's the only thing keeping me upright.",
    ].slice(game.tick % 4, game.tick % 4 + 1));
    case "fae_folk": return says(...["Lights in the ring at dusk! Come and dance!", "Mortal! You're very big. Are you lost? Everyone's lost.", "The Lady likes riddles. Do you like riddles? We like you. So far."].slice(game.tick % 3, game.tick % 3 + 1));
    case "shard_warden": return says("The Shardfields, past me: crystals as tall as towers, and golems that grow out of them. They're slow, they're stubborn and they hit like a falling wall. Earth spells crack them best. I'd stay on the downs, myself.");
    case "fennick": {
      const hearts = p.labyrinth.hearts, best = p.labyrinth.best <= MAX_RING ? `Your best: ring ${MAX_RING - p.labyrinth.best} of ${MAX_RING}.${hearts === 1 ? " You've reached the heart once." : hearts > 1 ? ` You've reached the heart ${hearts} times.` : ""}` : "You haven't run it yet.";
      const opts: Dialogue["options"] = [
        { label: "Run the maze.", then: () => { const why = startMazeRun(game, mazeJump); if (why) message(game, why, "warn"); return null; } },
        { label: "How does it work?", then: () => says("Eight minutes. You start at the south gate. Every ring of the maze you reach nearer the heart pays mazeglass, more the deeper you go, and the heart pays forty on top and ends your run in glory.",
          "The crystal doors: there are two sets, and the maze turns every thirty-six seconds; one set shuts and the other opens. A way that's shut now is open in a moment. Time them.",
          "The dead ends: some have my coffers in, and on any run a few of them are full: they shine. Some have glyphs across their mouths. Step on one of those and you're back out by the edge. I find it very funny.",
          "Pull my thread at the south gate to stop early; you keep what you've earned. Spend the mazeglass at my stall: robes, a staff, a focus, tea.") },
        { label: "How am I doing?", then: () => says(best, p.labyrinth.runs === 1 ? `Altogether you've earned ${p.labyrinth.glass} mazeglass in one run.` : `Altogether you've earned ${p.labyrinth.glass} mazeglass in ${p.labyrinth.runs} runs.`) },
      ];
      if (data(game, "sl_fennick") === 1 && !data(game, "sl_account")) opts.unshift({ label: "The Archmagister sent me.", then: () => { flag(game, "sl_account"); giveOrDrop(game, "mazeglass", 30); return says("Halcyon sent you? Then you're on account. Thirty mazeglass, to start. Don't spend it all on tea. Or do. I'm not your tutor."); } });
      opts.push({ label: "Not now.", then: () => null });
      return ask(p.maze ? ["You're in my maze! Why are you talking to me?"] : ["Welcome to my Labyrinth! Eight minutes, fifteen rings of hedge, two sets of doors, a few glyphs, and the heart.", best], opts);
    }
  }
  return null;
}
