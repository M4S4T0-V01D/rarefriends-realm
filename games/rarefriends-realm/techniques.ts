/**
 * The Land Before Stone: Mysteries techniques. Not spells: preparations, readings and practised answers, used from the
 * Combat options tab, that a fighter of any kind (a melee one most of all) can learn without Magic or Faith.
 *
 * Three are the Mysteries' common learning (Mysteries level only). Two are the Orashai's, learnt by finishing the
 * Orashai Mysteries (the Weigher's and the Gate-Mother's: the gods of measure and of thresholds). Three are the Hidden
 * Road's, the Mizukai Isles' own Mysteries, learnt from Ascetic Kōdō on Iwaoka (The Hidden Road). Seven are Meghavan's, from
 * its four schools (meghavanschools.ts): the Discipline of Inner Measure's breath, the School of Living Patterns' reading, the
 * Keepers of Thresholds' mark and ward, and the Archive of Unfinished Things' prepared answer.
 *
 * Each has its valid targets and the reasons it fails, a cooldown, a level, and one active preparation at a time:
 * starting another replaces the first, so they never stack. None costs anything but its cooldown; none gives XP
 * (Mysteries XP comes from discoveries, once each).
 */
import { TICK_MS, emit, level, message, sound, type Game, type Monster } from "./state.ts";
import { questDone } from "./content.ts";
import { knows, learn } from "./pursuance.ts";
import { INNER_MEASURE, LIVING_PATTERNS, THRESHOLDS, UNFINISHED } from "./meghavanschools.ts";

export type TechniqueId = "stillness" | "marked_edge" | "pattern_break" | "measured_counter" | "threshold_ward" | "mist_step" | "severing_cut" | "mountain_shout"
  | "held_breath" | "fourth_breath" | "read_pattern" | "threshold_mark" | "doorstone_ward" | "prepared_answer";
export type Technique = {
  id: TechniqueId; name: string; level: number; cooldown: number; tradition: "common" | "orashai" | "mizukai" | "inner_measure" | "living_patterns" | "thresholds" | "unfinished";
  /** What it does, for the Combat options tab. */
  description: string;
  /** The colour of its mark in the world. */
  color: string;
};
export const ORASHAI_TECHNIQUE_QUEST = "orashai_mysteries", HIDDEN_ROAD = "hidden_road";

export const TECHNIQUES: readonly Technique[] = [
  { id: "stillness", name: "Stillness Before Impact", level: 5, cooldown: 20, tradition: "common", color: "#e8e2cf",
    description: "Hold still for two beats before your next blow: it lands truer and a fifth harder. Moving breaks it." },
  { id: "marked_edge", name: "Marked Edge", level: 12, cooldown: 50, tradition: "common", color: "#d8a14a",
    description: "Set your weapon against what your foe is weak to (your Pursuance journal must know it): a sixth harder against that creature for 25 ticks." },
  { id: "measured_counter", name: "The Weigher's Counter", level: 18, cooldown: 30, tradition: "orashai", color: "#c9a24a",
    description: "Wait, weighed, for a blow (6 ticks): the next one a creature lands in reach is halved, and you answer it at once with a sure hit of the same weight. Not against archers or spells." },
  { id: "mist_step", name: "Mist Step", level: 20, cooldown: 60, tradition: "mizukai", color: "#cfd8de",
    description: "Step sideways out of the fight into a breath of mist: whatever's after you loses you, and wanders back. Not the great ones." },
  { id: "pattern_break", name: "Pattern Break", level: 25, cooldown: 60, tradition: "common", color: "#9fc4d8",
    description: "Read the pattern a creature keeps and break it: one that mends itself can't for 30 ticks, and one that rages when hurt doesn't." },
  { id: "severing_cut", name: "Severing Cut", level: 28, cooldown: 25, tradition: "mizukai", color: "#f2f0e6",
    description: "Against a wayward spirit only: your next blow (within 8 ticks) cuts the thread that holds it here, sure and half as hard again." },
  { id: "threshold_ward", name: "The Gate-Mother's Ward", level: 32, cooldown: 100, tradition: "orashai", color: "#b98c5a",
    description: "Stand in a doorway nobody else can see, for 16 ticks: dragonfire and spells come through it at half strength, and no venom or draining touch comes through at all." },
  { id: "mountain_shout", name: "The Mountain's Shout", level: 35, cooldown: 40, tradition: "mizukai", color: "#e0c68c",
    description: "One shout from the belly, at a foe in reach: it falters and loses three beats of its attack (one, if it's a great one)." },
  // Meghavan's four schools.
  { id: "read_pattern", name: "Reading the Pattern", level: 22, cooldown: 80, tradition: "living_patterns", color: "#7fb8c9",
    description: "Watch the creature you're fighting until its pattern shows: your Pursuance journal learns what it's weak to, how it fights and how it guards, at once." },
  { id: "threshold_mark", name: "The Threshold Mark", level: 26, cooldown: 40, tradition: "thresholds", color: "#d98a2b",
    description: "Chalk the Keepers' mark on something that came back through a door (the undead, a wayward spirit): it stands half in the doorway, and your blows strike it a quarter harder for 30 ticks." },
  { id: "held_breath", name: "Held Breath", level: 30, cooldown: 80, tradition: "inner_measure", color: "#d8e4e8",
    description: "Hold the breath you've counted: any venom in you goes still and leaves, and none takes hold for 40 ticks." },
  { id: "doorstone_ward", name: "The Doorstone Ward", level: 38, cooldown: 90, tradition: "thresholds", color: "#c9a46a",
    description: "Chalk a threshold where you stand: for 20 ticks, while you keep to it, every blow that reaches you through it loses a quarter. Step off it and it's only chalk." },
  { id: "fourth_breath", name: "The Fourth Breath", level: 40, cooldown: 30, tradition: "inner_measure", color: "#e8eef0",
    description: "Count four breaths and strike on the fourth: a blow on the fourth or fifth tick can't miss and lands half as hard again. Strike too early and the count is lost." },
  { id: "prepared_answer", name: "The Prepared Answer", level: 45, cooldown: 120, tradition: "unfinished", color: "#9fb4d0",
    description: "Against a great one you've researched (faced and beaten before): for 30 ticks your blows find where it's short, a fifth harder, and its own land a fifth lighter." },
];
export const TECHNIQUE = Object.fromEntries(TECHNIQUES.map(entry => [entry.id, entry])) as Record<TechniqueId, Technique>;

/** The active preparation (not saved): which technique, when it began, where you stood, the creature it's set on, until when. */
export type Preparation = { id: TechniqueId; at: number; x: number; y: number; uid: number | null; until: number };

/** Why you can't use a technique at all yet (level, or the tradition that teaches it), or null. */
export function techniqueLocked(game: Game, technique: Technique): string | null {
  if (technique.tradition === "orashai" && !questDone(game, ORASHAI_TECHNIQUE_QUEST)) return "The Orashai teach it to their initiates: finish The Orashai Mysteries.";
  if (technique.tradition === "mizukai" && !questDone(game, HIDDEN_ROAD)) return "The Hidden Road's: Ascetic Kōdō on Iwaoka teaches it (The Hidden Road).";
  if (technique.tradition === "inner_measure" && !questDone(game, INNER_MEASURE)) return "The Discipline of Inner Measure's: Breath-master Ojas at Shailagarh teaches it (The Counted Breath).";
  if (technique.tradition === "living_patterns" && !questDone(game, LIVING_PATTERNS)) return "The School of Living Patterns': Astronomer Vidyut at Sarovan teaches it (Patterns in the Water).";
  if (technique.tradition === "thresholds" && !questDone(game, THRESHOLDS)) return "The Keepers of Thresholds': Door-keeper Ishwari at Tirthali teaches it (The Keepers' Door).";
  if (technique.tradition === "unfinished" && !questDone(game, UNFINISHED)) return "The Archive of Unfinished Things': Scholar Anvaya at Suvarnatira teaches it (The Unfinished Page).";
  if (level(game, "mysteries") < technique.level) return `You need a Mysteries level of ${technique.level} for that.`;
  return null;
}
export const cooldownLeft = (game: Game, id: TechniqueId) => Math.max(0, (game.player.techniqueReady[id] ?? 0) - game.tick);
const target = (game: Game) => game.player.combat === null ? null : game.monsters.find(monster => monster.uid === game.player.combat && !monster.dead) ?? null;
/** A creature's name without its own article, for "the {x}" (as Pursuance writes it). */
const bare = (monster: Monster) => monster.def.name.replace(/^The /, "");
const near = (game: Game, monster: Monster) => Math.max(Math.abs(monster.x - game.player.x), Math.abs(monster.y - game.player.y)) <= (monster.def.size ?? 1);
const mark = (game: Game, technique: Technique, at: { x: number; y: number }) => emit(game, { type: "technique", id: technique.id, color: technique.color, x: at.x, y: at.y, tick: game.tick });
/** The preparation in force, if it's still in force. */
export function preparation(game: Game, id?: TechniqueId): Preparation | null {
  const now = game.player.preparation;
  if (!now || now.until < game.tick || (id && now.id !== id)) return null;
  return now;
}

/** Use a technique: true if it took. Every refusal says why. */
export function useTechnique(game: Game, id: TechniqueId): boolean {
  const technique = TECHNIQUE[id], player = game.player;
  if (!technique) return false;
  const locked = techniqueLocked(game, technique);
  if (locked) { message(game, locked, "warn"); return false; }
  const wait = cooldownLeft(game, id);
  if (wait) { message(game, `${technique.name} isn't ready again yet (${Math.ceil(wait * TICK_MS / 1000)}s).`, "warn"); return false; }
  const foe = target(game);
  const fail = (text: string) => { message(game, text, "warn"); return false; };
  const prepare = (uid: number | null, ticks: number) => { player.preparation = { id, at: game.tick, x: player.x, y: player.y, uid, until: game.tick + ticks }; };
  switch (id) {
    case "stillness":
      if (!foe) return fail("Stillness is for the moment before a blow: be in a fight first.");
      prepare(foe.uid, 12); message(game, "You go still, and let the fight come to the edge of your weapon."); break;
    case "marked_edge":
      if (!foe) return fail("Mark your edge against something: be in a fight first.");
      if (!knows(game, foe.def.id, "weakness")) return fail(`You don't know what the ${bare(foe)} is weak to yet. Your Pursuance journal will, once you've learnt it.`);
      prepare(foe.uid, 25); message(game, `You set your edge against what the ${bare(foe)} fears.`); break;
    case "pattern_break": {
      if (!foe) return fail("There's no pattern to break: be in a fight first.");
      if (!foe.def.heals && !foe.def.enrage) return fail(`There's no pattern in the ${bare(foe)} to break: it neither mends itself nor rages.`);
      foe.curses.broken = game.tick + 30; message(game, `You see the pattern the ${bare(foe)} keeps, and break it.`); mark(game, technique, foe); break;
    }
    case "measured_counter":
      if (!foe) return fail("The Weigher's counter answers a blow: be in a fight first.");
      if (foe.def.ranged || foe.def.attackStyle === "magic") return fail(`The ${bare(foe)} doesn't come close enough to be weighed.`);
      prepare(foe.uid, 6); message(game, "You wait, weighed, for the blow."); break;
    case "threshold_ward":
      if (!game.monsters.some(monster => monster.target && !monster.dead && (monster.def.breath || monster.def.drain || monster.def.poison || monster.def.attackStyle === "magic")))
        return fail("Nothing here strikes at you with anything the ward keeps out: fire, spells, venom, a draining touch.");
      prepare(null, 16); message(game, "You stand in a doorway nobody else can see."); break;
    case "mist_step": {
      const after = game.monsters.filter(monster => monster.target && !monster.dead);
      if (!after.length) return fail("Nothing's after you to lose.");
      if (after.some(monster => monster.def.boss || monster.def.worldBoss || monster.arena)) return fail("A great one doesn't lose sight of you that easily.");
      for (const monster of after) { monster.target = false; monster.retreat = 4; }
      player.combat = null; player.path = []; player.target = null;
      message(game, "You step sideways into a breath of mist, and out of the fight."); break;
    }
    case "severing_cut":
      if (!foe) return fail("Severing Cut is for a wayward spirit: be in a fight with one first.");
      if (!foe.def.spirit) return fail(`The ${bare(foe)} isn't a wayward spirit: there's no thread to cut.`);
      prepare(foe.uid, 8); message(game, "You find the thread that holds the spirit here."); break;
    case "mountain_shout":
      if (!foe) return fail("Shout at what? Be in a fight first.");
      if (!near(game, foe)) return fail("It has to be in reach to hear the mountain.");
      foe.attackTimer += foe.def.boss || foe.def.worldBoss ? 1 : 3;
      message(game, `You shout from the belly. The ${bare(foe)} falters.`); mark(game, technique, foe); break;
    case "read_pattern": {
      if (!foe) return fail("There's no pattern to read: be in a fight first.");
      const learnt = (["weakness", "abilities", "defences"] as const).filter(fact => learn(game, foe.def.id, fact, true)).length;
      if (!learnt) return fail(`You've read the ${bare(foe)}'s pattern already: your Pursuance journal knows it.`);
      message(game, `You watch the ${bare(foe)} until its pattern repeats, and read it. Your Pursuance journal has it now.`); mark(game, technique, foe); break;
    }
    case "threshold_mark":
      if (!foe) return fail("Mark what? Be in a fight first.");
      if (!foe.def.undead && !foe.def.spirit) return fail(`The ${bare(foe)} never came through a door it shouldn't have: there's nothing for the mark to hold.`);
      prepare(foe.uid, 30); message(game, `You chalk the Keepers' mark on the ${bare(foe)}. It stands half in a doorway.`); mark(game, technique, foe); break;
    case "held_breath":
      if (!player.poison && !game.monsters.some(monster => monster.target && !monster.dead && monster.def.poison)) return fail("There's no venom in you, and nothing here that carries it.");
      player.poison = null; prepare(null, 40); message(game, "You hold the breath you've counted. The venom has nowhere to go."); break;
    case "doorstone_ward":
      if (!game.monsters.some(monster => monster.target && !monster.dead)) return fail("Nothing's coming at you through any door.");
      prepare(null, 20); message(game, "You chalk a threshold where you stand: a line, a gap, a line."); break;
    case "fourth_breath":
      if (!foe) return fail("Count your breath for a blow: be in a fight first.");
      prepare(foe.uid, 6); message(game, "In for one. Out. Two. Three."); break;
    case "prepared_answer":
      if (!foe) return fail("Answer what? Be in a fight first.");
      if (!foe.def.boss && !foe.def.worldBoss) return fail(`The Archive keeps no record of the ${bare(foe)}: it's for the great ones.`);
      if (!game.player.killLog[foe.def.id]) return fail(`You haven't researched the ${bare(foe)}: face it and beat it once, and the Archive's way will have something to answer it with.`);
      prepare(foe.uid, 30); message(game, `You know the ${bare(foe)}'s count, and where it's short.`); mark(game, technique, foe); break;
  }
  player.techniqueReady[id] = game.tick + technique.cooldown;
  if (id === "stillness" || id === "marked_edge" || id === "measured_counter" || id === "threshold_ward" || id === "severing_cut" || id === "mist_step" || id === "held_breath" || id === "doorstone_ward" || id === "fourth_breath") mark(game, technique, player);
  sound(game, "pray");
  return true;
}

/**
 * Your blow (melee or ranged) at a creature: what your preparation does to it. Returns multipliers for accuracy and
 * damage, and `sure` for a blow that can't miss; uses up a one-blow preparation.
 */
export function techniqueStrike(game: Game, monster: Monster, melee: boolean): { accuracy: number; damage: number; sure: boolean } {
  const player = game.player, now = preparation(game), none = { accuracy: 1, damage: 1, sure: false };
  if (!now) return none;
  if (now.id === "stillness") {
    if (player.x !== now.x || player.y !== now.y) { player.preparation = null; message(game, "You moved, and the stillness went out of you."); return none; }
    if (game.tick - now.at < 2) return none;
    player.preparation = null; return { accuracy: 1.2, damage: 1.2, sure: false };
  }
  if (now.id === "marked_edge" && now.uid === monster.uid) return { accuracy: 1, damage: 7 / 6, sure: false };
  if (now.id === "severing_cut" && melee && now.uid === monster.uid && monster.def.spirit) { player.preparation = null; return { accuracy: 1, damage: 1.5, sure: true }; }
  if (now.id === "threshold_mark" && now.uid === monster.uid) return { accuracy: 1, damage: 1.25, sure: false };
  if (now.id === "prepared_answer" && now.uid === monster.uid) return { accuracy: 1, damage: 1.2, sure: false };
  if (now.id === "fourth_breath" && now.uid === monster.uid) {
    player.preparation = null;
    if (game.tick - now.at < 4) { message(game, "Too soon: you lost the count."); return none; }
    return { accuracy: 1, damage: 1.5, sure: true };
  }
  return none;
}

/**
 * A creature's attack landing on you: the Weigher's counter (halves a melee blow from the creature it's set on, and
 * returns `counter` damage for you to strike back with) and the Gate-Mother's ward (halves fire and spells, stops venom
 * and drains). Returns the damage to take, and what's kept out.
 */
export function techniqueGuard(game: Game, monster: Monster, hit: number, kind: { melee: boolean; breath: boolean }): { hit: number; counter: number; noVenom: boolean; noDrain: boolean } {
  const ward = preparation(game, "threshold_ward"), weighed = preparation(game, "measured_counter"), held = preparation(game, "held_breath");
  const door = preparation(game, "doorstone_ward"), answer = preparation(game, "prepared_answer");
  let counter = 0;
  if (weighed && weighed.uid === monster.uid && kind.melee && !kind.breath && hit > 0) {
    counter = hit; hit = Math.floor(hit / 2); game.player.preparation = null;
  }
  if (ward && (kind.breath || monster.def.attackStyle === "magic")) hit = Math.floor(hit / 2);
  // The Doorstone Ward holds while you keep to the threshold you chalked; the Prepared Answer lightens the great one it's set on.
  if (door && game.player.x === door.x && game.player.y === door.y) hit = Math.floor(hit * 0.75);
  if (answer && answer.uid === monster.uid) hit = Math.floor(hit * 0.8);
  return { hit, counter, noVenom: !!ward || !!held, noDrain: !!ward };
}

/** A creature whose pattern is broken neither mends itself nor rages. */
export const patternBroken = (game: Game, monster: Monster) => (monster.curses.broken ?? 0) > game.tick;
