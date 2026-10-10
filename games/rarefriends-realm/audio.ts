/**
 * The Realm's soundtrack and sound effects, synthesized with WebAudio (no recordings or samples).
 * A hand-written main theme, one track for every area, dungeon and boss themes, and old-school style jingles.
 * Nothing plays until the player's first tap, click or key press.
 */
import type { SoundName } from "./state.ts";
import type { RegionId } from "./world.ts";

export type TrackId = RegionId | "theme" | "boss"
  // The Mizukai Isles' own pieces (What Rises in the East).
  | "mizukai_sunrise" | "mizukai_harbour" | "mizukai_village" | "mizukai_shrine" | "mizukai_forest" | "mizukai_sea" | "mizukai_haunted" | "mizukai_battle" | "mizukai_spirit" | "mizukai_castle";
export type SfxName = SoundName | "slash" | "stab" | "crush" | "punch" | "step_grass" | "step_stone" | "step_wood" | "step_sand" | "step_snow" | "step_swamp"
  | "crackle" | "forge" | "water" | "bird" | "gull" | "frog" | "wind" | "drip" | "rain" | "thunder" | "pop" | "hoof" | "whinny" | "rare" | "duel";
type VoiceKind = "cluck" | "moo" | "squeak" | "grumble" | "growl" | "rattle" | "gurgle" | "whisper" | "clank" | "rumble" | "roar" | "king";
const VOICES: Record<string, { kind: VoiceKind; f0: number; length: number; bright: number; wobble?: number }> = {
  chicken: { kind: "cluck", f0: 620, length: 0.08, bright: 3000 }, cow: { kind: "moo", f0: 150, length: 0.9, bright: 900, wobble: 5 },
  ink_rat: { kind: "squeak", f0: 1800, length: 0.1, bright: 6000 }, grumblin: { kind: "grumble", f0: 170, length: 0.35, bright: 1200, wobble: 11 },
  grumblin_chief: { kind: "grumble", f0: 120, length: 0.5, bright: 1000, wobble: 8 }, bandit: { kind: "grumble", f0: 140, length: 0.3, bright: 1400, wobble: 4 },
  swamp_lurker: { kind: "gurgle", f0: 220, length: 0.4, bright: 800 }, skeleton: { kind: "rattle", f0: 900, length: 0.25, bright: 5000 },
  wolf: { kind: "growl", f0: 180, length: 0.5, bright: 1600, wobble: 18 }, moss_colossus: { kind: "rumble", f0: 70, length: 0.8, bright: 500, wobble: 3 },
  frost_yeti: { kind: "roar", f0: 110, length: 0.8, bright: 1200, wobble: 6 }, shade: { kind: "whisper", f0: 400, length: 0.6, bright: 3000 },
  ash_drake: { kind: "roar", f0: 140, length: 0.7, bright: 1600, wobble: 9 }, cinder_drake: { kind: "roar", f0: 100, length: 0.8, bright: 1300, wobble: 7 },
  emberwyrm: { kind: "king", f0: 55, length: 1.3, bright: 900, wobble: 4 },
  hollow_sentinel: { kind: "clank", f0: 90, length: 0.4, bright: 800 }, hollow_king: { kind: "king", f0: 60, length: 1.1, bright: 700, wobble: 2 },
  mire_crawler: { kind: "gurgle", f0: 320, length: 0.3, bright: 1400 }, frost_wisp: { kind: "whisper", f0: 900, length: 0.5, bright: 5000 },
  gloom_hound: { kind: "growl", f0: 120, length: 0.6, bright: 1100, wobble: 22 },
};
/** General-MIDI-style instruments, like an old-school RPG soundtrack: bright leads up high, plucked strings, light drums. */
type Voice = "lute" | "flute" | "recorder" | "oboe" | "trumpet" | "bell" | "glock" | "harp" | "pizz" | "strings" | "organ" | "pad" | "bass" | "brass" | "pluck" | "choir" | "drone"
  // The Mizukai Isles: a plucked koto, a twanging shamisen, a breathy shakuhachi, the sho's held clusters, a temple bell.
  | "koto" | "shamisen" | "shakuhachi" | "sho" | "kane"
  // ...the festival's shinobue, the court's ryuteki and hichiriki, the noh theatre's nokan, and the storyteller's biwa.
  | "shinobue" | "ryuteki" | "hichiriki" | "nohkan" | "biwa";
type Drum = "kick" | "snare" | "hat" | "shaker" | "tom" | "clank" | "hand" | "rim" | "timpani" | "tambourine" | "deep" | "ride"
  // The Isles' drums: the great taiko, the tight shime-daiko, the wooden clappers.
  | "taiko" | "shime" | "clapper"
  // ...the great odaiko, the taiko's rim (kara), the court's kakko and shoko, the festival's little gong (atarigane), the noh
  // drums (the kotsuzumi's "pon", the otsuzumi's crack) and the drummers' calls ("yo-o", "ha"), and the sea and the wind.
  | "odaiko" | "kara" | "kakko" | "shoko" | "atarigane" | "tsuzumi" | "otsuzumi" | "yo" | "ha" | "wave" | "wind";
/** How a note is played (the Mizukai Isles' ornaments): scooped up into from below, pressed up after the pluck, let fall at
 * the end (each in semitones), or shaken slowly and wide (yuri). */
type Shape = { scoop?: number; up?: number; fall?: number; yuri?: boolean };
type Note = { beat: number; voice: Voice; midi: number; length: number; velocity: number; shape?: Shape };
type Hit = { beat: number; drum: Drum; velocity: number };
export type Track = { id: TrackId; name: string; bpm: number; beats: number; notes: Note[]; hits: Hit[] };

const MODES: Record<string, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], hijaz: [0, 1, 4, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
};
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- The main theme (hand-written) ----------
const N: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "E5:1" → MIDI 76 for 1 beat; "r:2" rests. */
function tune(text: string, voice: Voice, start = 0, velocity = 0.9): Note[] {
  const notes: Note[] = [];
  let beat = start;
  for (const token of text.trim().split(/\s+/)) {
    const [name, length] = token.split(":"), beats = Number(length);
    if (name !== "r") {
      const match = /^([A-G])(#|b)?(\d)$/.exec(name)!;
      notes.push({ beat, voice, midi: 12 * (Number(match[3]) + 1) + N[match[1]] + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0), length: beats * 0.95, velocity });
    }
    beat += beats;
  }
  return notes;
}
/** Accompaniment: a bass (root and fifth, or oom-pah-pah in 3/4), a broken-chord harp or lute up in the fifth octave,
 * and an optional light string bed. Registers stay bright: nothing below C3. */
function chordBed(chords: readonly (readonly number[])[], beatsPer: number, options: { pad?: Voice; arp?: Voice; bass?: boolean | Voice; arpPattern?: readonly number[] }) {
  const notes: Note[] = [], bassVoice: Voice = typeof options.bass === "string" ? options.bass : "bass";
  chords.forEach((chord, bar) => {
    const start = bar * beatsPer, root = chord[0] + 48;
    if (options.pad) for (const midi of chord.slice(2)) notes.push({ beat: start, voice: options.pad, midi: midi + 60, length: beatsPer, velocity: 0.42 });
    if (options.bass !== false) {
      notes.push({ beat: start, voice: bassVoice, midi: root, length: 0.9, velocity: 0.9 });
      if (beatsPer === 3) for (const b of [1, 2]) for (const midi of chord.slice(2)) notes.push({ beat: start + b, voice: "pizz", midi: midi + 60, length: 0.4, velocity: 0.45 });
      else notes.push({ beat: start + 2, voice: bassVoice, midi: root + 7, length: 0.9, velocity: 0.75 });
    }
    if (options.arp) {
      const pattern = options.arpPattern ?? [0, 1, 2, 1, 3, 2, 1, 2], tones = [...chord.slice(1), chord[1] + 12].map(midi => midi + 60);
      for (let step = 0; step < beatsPer * 2; step++) notes.push({ beat: start + step / 2, voice: options.arp, midi: tones[pattern[step % pattern.length] % tones.length], length: 0.45, velocity: 0.42 + (step % 4 === 0 ? 0.12 : 0) });
    }
  });
  return notes;
}
const chords = (root: number, ...names: string[]) => names.map(name => {
  const match = /^([ivIV]+)(.*)$/.exec(name)!, numeral = match[1], degree = ["i", "ii", "iii", "iv", "v", "vi", "vii"].indexOf(numeral.toLowerCase());
  const minor = numeral === numeral.toLowerCase(), base = root + [0, 2, 4, 5, 7, 9, 11][degree] + (match[2].includes("b") ? -1 : 0);
  return [base % 12, base % 12, base % 12 + (minor ? 3 : 4), base % 12 + 7];
});
function themeTrack(): Track {
  const melody = tune(`
    G4:0.5 C5:0.5 E5:1 D5:0.5 C5:0.5 D5:1   E5:1.5 D5:0.5 B4:2   C5:0.5 E5:0.5 A5:1 G5:0.5 E5:0.5 G5:1   A5:1.5 G5:0.5 F5:2
    E5:0.5 G5:0.5 C6:1 B5:0.5 A5:0.5 G5:1   D5:1 E5:0.5 F5:0.5 G5:2   A5:0.5 G5:0.5 F5:0.5 E5:0.5 D5:1 C5:1   D5:3 r:1
    C6:1.5 B5:0.5 A5:2   A5:0.5 G5:0.5 F5:1 C5:2   E5:1 G5:1 C6:1 E6:1   D6:3 B5:1
    C6:0.5 B5:0.5 A5:1 E5:1 A5:1   F5:0.5 G5:0.5 A5:1 C6:1 A5:1   G5:1.5 A5:0.5 B5:1 D6:1   C6:4`, "recorder");
  const harmony = chords(0, "I", "V", "vi", "IV", "I", "V", "IV", "V", "vi", "IV", "I", "V", "vi", "IV", "V", "I");
  const bed = chordBed(harmony, 4, { pad: "strings", arp: "harp", bass: "pizz", arpPattern: [0, 2, 1, 2, 3, 2, 1, 2] });
  const counter = melody.filter((_, index) => index % 3 === 0).map(note => ({ ...note, voice: "lute" as Voice, midi: note.midi - 12, velocity: 0.35, beat: note.beat + 0.5 }));
  const hits: Hit[] = [];
  for (let bar = 0; bar < 16; bar++) {
    hits.push({ beat: bar * 4, drum: "timpani", velocity: 0.55 }, { beat: bar * 4 + 2, drum: "hand", velocity: 0.4 });
    for (let e = 1; e < 8; e += 2) hits.push({ beat: bar * 4 + e / 2, drum: "tambourine", velocity: 0.25 });
  }
  // Second pass: a trumpet takes the tune with a glockenspiel sparkling above, and the drums march.
  const again = (notes: readonly Note[]) => notes.map(note => ({ ...note, beat: note.beat + 64 }));
  const trumpet = melody.map(note => ({ ...note, beat: note.beat + 64, voice: "trumpet" as Voice, velocity: 0.8 }));
  const glock = melody.filter((_, index) => index % 2 === 0).map(note => ({ ...note, beat: note.beat + 64, voice: "glock" as Voice, velocity: 0.4 }));
  const fuller = hits.map(hit => ({ ...hit, beat: hit.beat + 64, velocity: Math.min(1, hit.velocity * 1.2) }));
  for (let bar = 16; bar < 32; bar++) hits.push({ beat: bar * 4 + 1, drum: "snare", velocity: 0.22 }, { beat: bar * 4 + 3, drum: "snare", velocity: 0.26 });
  return { id: "theme", name: "RareFriends Realm", bpm: 100, beats: 128, notes: [...melody, ...counter, ...bed, ...trumpet, ...glock, ...again(bed)], hits: [...hits, ...fuller] };
}

// ---------- Area tracks ----------
type Kit = "tavern" | "march" | "forge" | "desert" | "calm" | "boss" | "heartbeat" | "jig";
type Style = {
  id: TrackId; name: string; bpm: number; root: number; mode: keyof typeof MODES; progression: readonly number[]; meter: 3 | 4;
  lead: Voice; second: Voice; arp: Voice | null; bed: Voice | null; bass: Voice; kit: Kit; energy: number; seed: number; lift?: number;
};
/** Each area's band and mood. Melodies sit around C5–C6; accompaniment around C4–C5; basses from C3. */
const STYLES: readonly Style[] = [
  { id: "friendhollow", name: "Hollow Square", bpm: 108, root: 7, mode: "major", progression: [0, 3, 4, 0, 5, 3, 1, 4], meter: 4, lead: "recorder", second: "oboe", arp: "lute", bed: null, bass: "bass", kit: "tavern", energy: 0.75, seed: 11 },
  { id: "farmland", name: "Hayfields", bpm: 126, root: 2, mode: "mixolydian", progression: [0, 6, 3, 0, 0, 6, 4, 0], meter: 3, lead: "oboe", second: "recorder", arp: "pizz", bed: null, bass: "bass", kit: "jig", energy: 0.85, seed: 23 },
  { id: "whisperwood", name: "Whisperwood", bpm: 96, root: 9, mode: "dorian", progression: [0, 3, 0, 6, 2, 3, 4, 0], meter: 4, lead: "flute", second: "harp", arp: "harp", bed: "strings", bass: "pizz", kit: "calm", energy: 0.6, seed: 31 },
  { id: "fernwick", name: "Woodcutters' Reel", bpm: 118, root: 7, mode: "mixolydian", progression: [0, 4, 6, 0, 3, 0, 4, 0], meter: 3, lead: "recorder", second: "flute", arp: "lute", bed: null, bass: "pizz", kit: "jig", energy: 0.8, seed: 157 },
  { id: "greyhorn", name: "Greyhorn Heights", bpm: 86, root: 2, mode: "dorian", progression: [0, 6, 3, 0, 5, 6, 4, 0], meter: 3, lead: "trumpet", second: "flute", arp: "harp", bed: "strings", bass: "pizz", kit: "calm", energy: 0.6, seed: 163 },
  { id: "highcairn", name: "Hearth of Highcairn", bpm: 112, root: 9, mode: "mixolydian", progression: [0, 3, 4, 0, 6, 3, 4, 0], meter: 4, lead: "recorder", second: "oboe", arp: "lute", bed: null, bass: "bass", kit: "tavern", energy: 0.8, seed: 167 },
  { id: "ashen_hills", name: "Ashen Echoes", bpm: 92, root: 4, mode: "aeolian", progression: [0, 5, 6, 0, 3, 5, 4, 4], meter: 4, lead: "oboe", second: "flute", arp: "pizz", bed: "strings", bass: "bass", kit: "march", energy: 0.6, seed: 41 },
  { id: "emberforge", name: "Anvil Song", bpm: 116, root: 5, mode: "mixolydian", progression: [0, 0, 6, 3, 0, 3, 4, 0], meter: 4, lead: "trumpet", second: "oboe", arp: "lute", bed: null, bass: "bass", kit: "forge", energy: 0.75, seed: 53 },
  { id: "frostpeak", name: "Frostpeak", bpm: 84, root: 11, mode: "lydian", progression: [0, 1, 0, 4, 5, 1, 4, 0], meter: 4, lead: "glock", second: "flute", arp: "harp", bed: "strings", bass: "pizz", kit: "calm", energy: 0.55, seed: 61 },
  { id: "glass_lake", name: "Glass Lake", bpm: 100, root: 0, mode: "major", progression: [0, 5, 3, 4, 0, 5, 1, 4], meter: 3, lead: "harp", second: "flute", arp: "harp", bed: "strings", bass: "pizz", kit: "calm", energy: 0.65, seed: 71 },
  { id: "pale_dunes", name: "Pale Dunes", bpm: 104, root: 2, mode: "hijaz", progression: [0, 1, 0, 6, 0, 1, 6, 0], meter: 4, lead: "oboe", second: "recorder", arp: "pizz", bed: null, bass: "bass", kit: "desert", energy: 0.7, seed: 83 },
  { id: "oasis", name: "Oasis Market", bpm: 124, root: 4, mode: "hijaz", progression: [0, 3, 1, 0, 0, 3, 6, 0], meter: 4, lead: "recorder", second: "oboe", arp: "lute", bed: null, bass: "pizz", kit: "desert", energy: 0.85, seed: 89 },
  { id: "murkmire", name: "Murkmire", bpm: 88, root: 1, mode: "phrygian", progression: [0, 1, 0, 6, 0, 1, 3, 0], meter: 3, lead: "oboe", second: "flute", arp: "pizz", bed: "strings", bass: "bass", kit: "calm", energy: 0.5, seed: 97 },
  { id: "mossy_ruins", name: "Old Stones", bpm: 90, root: 7, mode: "dorian", progression: [0, 6, 3, 4, 0, 6, 2, 4], meter: 4, lead: "harp", second: "recorder", arp: "harp", bed: "strings", bass: "pizz", kit: "calm", energy: 0.6, seed: 103 },
  { id: "coast", name: "The Pale Coast", bpm: 104, root: 5, mode: "major", progression: [0, 4, 5, 3, 0, 4, 3, 0], meter: 3, lead: "recorder", second: "harp", arp: "harp", bed: null, bass: "pizz", kit: "jig", energy: 0.7, seed: 107 },
  { id: "crypt", name: "Crypt of Friends", bpm: 80, root: 3, mode: "harmonic", progression: [0, 5, 3, 4, 0, 5, 1, 4], meter: 4, lead: "organ", second: "glock", arp: "harp", bed: "choir", bass: "pizz", kit: "heartbeat", energy: 0.5, seed: 113 },
  { id: "hollow_depths", name: "Hollow Depths", bpm: 78, root: 6, mode: "aeolian", progression: [0, 1, 0, 6, 0, 1, 5, 4], meter: 4, lead: "flute", second: "glock", arp: "harp", bed: "strings", bass: "pizz", kit: "heartbeat", energy: 0.45, seed: 127 },
  { id: "wizards_tower", name: "Arcane Stair", bpm: 96, root: 2, mode: "lydian", progression: [0, 1, 4, 0, 5, 1, 3, 4], meter: 3, lead: "glock", second: "flute", arp: "harp", bed: "strings", bass: "pizz", kit: "calm", energy: 0.6, seed: 137 },
  { id: "wyrmreach", name: "Wyrmreach", bpm: 112, root: 4, mode: "phrygian", progression: [0, 1, 0, 6, 5, 1, 6, 0], meter: 4, lead: "trumpet", second: "oboe", arp: "pizz", bed: "choir", bass: "bass", kit: "march", energy: 0.8, seed: 149 },
  { id: "boss", name: "The Hollow King", bpm: 144, root: 4, mode: "harmonic", progression: [0, 0, 5, 4, 0, 0, 3, 4], meter: 4, lead: "trumpet", second: "strings", arp: "pizz", bed: "strings", bass: "bass", kit: "boss", energy: 0.9, seed: 131 },
  // The wider world (2026-10).
  { id: "deadwood", name: "The Deadwood", bpm: 72, root: 1, mode: "phrygian", progression: [0, 1, 0, 5, 0, 1, 6, 0], meter: 4, lead: "flute", second: "choir", arp: null, bed: "strings", bass: "pizz", kit: "heartbeat", energy: 0.35, seed: 201 },
  { id: "gravesend", name: "Lanterns at Gravesend", bpm: 92, root: 9, mode: "aeolian", progression: [0, 5, 3, 4, 0, 5, 6, 4], meter: 3, lead: "oboe", second: "bell", arp: "lute", bed: null, bass: "pizz", kit: "calm", energy: 0.5, seed: 203 },
  { id: "westmarch", name: "The Long Road West", bpm: 100, root: 7, mode: "mixolydian", progression: [0, 6, 3, 4, 0, 6, 1, 4], meter: 4, lead: "recorder", second: "flute", arp: "lute", bed: "strings", bass: "bass", kit: "march", energy: 0.6, seed: 205 },
  { id: "drakespine", name: "The Drakespine", bpm: 84, root: 2, mode: "dorian", progression: [0, 3, 6, 0, 5, 3, 4, 0], meter: 4, lead: "trumpet", second: "oboe", arp: "harp", bed: "strings", bass: "pizz", kit: "march", energy: 0.55, seed: 207 },
  { id: "ashfall", name: "Ashfall", bpm: 76, root: 4, mode: "locrian", progression: [0, 1, 0, 4, 0, 1, 5, 0], meter: 4, lead: "brass", second: "choir", arp: null, bed: "pad", bass: "bass", kit: "boss", energy: 0.7, seed: 209 },
  { id: "southshore", name: "Southshore", bpm: 112, root: 0, mode: "major", progression: [0, 4, 5, 3, 0, 4, 1, 3], meter: 4, lead: "flute", second: "lute", arp: "harp", bed: null, bass: "pizz", kit: "calm", energy: 0.6, seed: 211 },
  { id: "saltmarrow", name: "Saltmarrow Shanty", bpm: 120, root: 5, mode: "mixolydian", progression: [0, 3, 4, 0, 0, 3, 4, 0], meter: 3, lead: "recorder", second: "oboe", arp: "lute", bed: null, bass: "bass", kit: "jig", energy: 0.85, seed: 213 },
  { id: "thistle_vale", name: "Thistle Vale", bpm: 96, root: 7, mode: "lydian", progression: [0, 1, 4, 0, 3, 1, 4, 0], meter: 3, lead: "oboe", second: "flute", arp: "harp", bed: "strings", bass: "pizz", kit: "calm", energy: 0.55, seed: 215 },
  { id: "hollyhock", name: "The Apothecary's Garden", bpm: 104, root: 9, mode: "major", progression: [0, 3, 1, 4, 0, 3, 5, 4], meter: 4, lead: "glock", second: "recorder", arp: "lute", bed: null, bass: "pizz", kit: "tavern", energy: 0.65, seed: 217 },
  { id: "dyemoor", name: "Dyemoor", bpm: 110, root: 11, mode: "dorian", progression: [0, 6, 0, 3, 0, 6, 4, 3], meter: 4, lead: "lute", second: "flute", arp: "pizz", bed: null, bass: "bass", kit: "tavern", energy: 0.7, seed: 219 },
  { id: "the_wilds", name: "The Wilds", bpm: 88, root: 2, mode: "aeolian", progression: [0, 6, 5, 0, 0, 6, 3, 0], meter: 4, lead: "flute", second: "oboe", arp: null, bed: "strings", bass: "pizz", kit: "calm", energy: 0.5, seed: 221 },
  { id: "tallgrass", name: "Tallgrass Camp", bpm: 116, root: 4, mode: "mixolydian", progression: [0, 4, 0, 6, 0, 4, 3, 0], meter: 4, lead: "recorder", second: "lute", arp: "lute", bed: null, bass: "bass", kit: "jig", energy: 0.75, seed: 223 },
  { id: "ironreach", name: "Ironreach", bpm: 80, root: 0, mode: "dorian", progression: [0, 5, 3, 6, 0, 5, 4, 0], meter: 4, lead: "trumpet", second: "strings", arp: "harp", bed: "strings", bass: "bass", kit: "march", energy: 0.6, seed: 225 },
  { id: "cragmaw", name: "Cragmaw Hammers", bpm: 112, root: 2, mode: "mixolydian", progression: [0, 6, 0, 3, 0, 6, 4, 0], meter: 4, lead: "oboe", second: "trumpet", arp: "pizz", bed: null, bass: "bass", kit: "forge", energy: 0.8, seed: 227 },
  { id: "quillhaven", name: "Quillhaven Library", bpm: 90, root: 5, mode: "lydian", progression: [0, 1, 4, 0, 5, 1, 4, 0], meter: 4, lead: "harp", second: "glock", arp: "harp", bed: "pad", bass: "pizz", kit: "calm", energy: 0.45, seed: 229 },
  { id: "pale_isles", name: "The Pale Isles", bpm: 98, root: 7, mode: "major", progression: [0, 3, 0, 4, 0, 3, 5, 4], meter: 3, lead: "flute", second: "harp", arp: "lute", bed: null, bass: "pizz", kit: "calm", energy: 0.5, seed: 231 },
  { id: "catacombs", name: "The Catacombs", bpm: 70, root: 3, mode: "harmonic", progression: [0, 1, 0, 5, 0, 1, 4, 0], meter: 4, lead: "organ", second: "choir", arp: null, bed: "choir", bass: "pizz", kit: "heartbeat", energy: 0.4, seed: 233 },
  { id: "wyrm_lair", name: "The Wyrm's Lair", bpm: 84, root: 4, mode: "locrian", progression: [0, 1, 0, 6, 0, 1, 5, 4], meter: 4, lead: "brass", second: "strings", arp: null, bed: "pad", bass: "bass", kit: "boss", energy: 0.8, seed: 235 },
  { id: "sea_cave", name: "The Sea Cave", bpm: 74, root: 9, mode: "aeolian", progression: [0, 6, 0, 3, 0, 6, 5, 0], meter: 4, lead: "flute", second: "glock", arp: "harp", bed: "pad", bass: "pizz", kit: "heartbeat", energy: 0.4, seed: 237 },
  { id: "deep_mine", name: "The Deep Mine", bpm: 86, root: 2, mode: "dorian", progression: [0, 5, 0, 6, 0, 5, 3, 0], meter: 4, lead: "oboe", second: "bell", arp: "pizz", bed: null, bass: "bass", kit: "forge", energy: 0.55, seed: 239 },
  { id: "deepglass", name: "Deepglass", bpm: 76, root: 9, mode: "lydian", progression: [0, 4, 5, 3, 0, 4, 1, 3], meter: 4, lead: "glock", second: "bell", arp: "harp", bed: "pad", bass: "pizz", kit: "heartbeat", energy: 0.4, seed: 241 },
  { id: "drowned_archive", name: "The Drowned Archive", bpm: 66, root: 4, mode: "phrygian", progression: [0, 1, 0, 6, 0, 1, 5, 0], meter: 4, lead: "organ", second: "choir", arp: "harp", bed: "choir", bass: "bass", kit: "heartbeat", energy: 0.35, seed: 251 },
  { id: "root_cellars", name: "The Root Cellars", bpm: 92, root: 7, mode: "dorian", progression: [0, 3, 0, 4, 0, 3, 1, 0], meter: 4, lead: "lute", second: "recorder", arp: "pluck", bed: null, bass: "pizz", kit: "tavern", energy: 0.5, seed: 277 },
  { id: "mossy_undercroft", name: "The Mossy Undercroft", bpm: 74, root: 5, mode: "aeolian", progression: [0, 5, 3, 4, 0, 5, 1, 0], meter: 4, lead: "oboe", second: "harp", arp: "harp", bed: "pad", bass: "bass", kit: "heartbeat", energy: 0.4, seed: 281 },
  // Return of Raria: the border, the Federation, the wood, and the kingdom that wasn't there before.
  { id: "deep_westmarch", name: "The Border", bpm: 88, root: 2, mode: "dorian", progression: [0, 6, 0, 4, 3, 6, 1, 0], meter: 4, lead: "trumpet", second: "oboe", arp: "pizz", bed: "strings", bass: "bass", kit: "march", energy: 0.62, seed: 301, lift: -5 },
  { id: "free_marches", name: "Fortunately, We Built a Solution", bpm: 112, root: 9, mode: "mixolydian", progression: [0, 3, 6, 4, 0, 1, 3, 4], meter: 4, lead: "glock", second: "trumpet", arp: "pluck", bed: "pad", bass: "pizz", kit: "forge", energy: 0.66, seed: 313 },
  { id: "barkreach", name: "BarkReach", bpm: 80, root: 4, mode: "aeolian", progression: [0, 5, 3, 0, 6, 5, 1, 0], meter: 3, lead: "flute", second: "oboe", arp: "harp", bed: "pad", bass: "pizz", kit: "calm", energy: 0.45, seed: 331, lift: -3 },
  { id: "raria_march", name: "The Eastern March", bpm: 80, root: 2, mode: "phrygian", progression: [0, 1, 0, 4, 3, 1, 6, 0], meter: 4, lead: "trumpet", second: "choir", arp: "pizz", bed: "strings", bass: "bass", kit: "march", energy: 0.58, seed: 359, lift: -6 },
  { id: "crownlands", name: "Hymn of the Crownlands", bpm: 76, root: 5, mode: "major", progression: [0, 4, 5, 3, 0, 1, 4, 0], meter: 3, lead: "choir", second: "flute", arp: "harp", bed: "organ", bass: "pizz", kit: "calm", energy: 0.4, seed: 367, lift: -3 },
  { id: "vesperwold", name: "Vespers", bpm: 62, root: 1, mode: "aeolian", progression: [0, 5, 6, 0, 3, 5, 4, 0], meter: 4, lead: "bell", second: "choir", arp: "harp", bed: "drone", bass: "drone", kit: "heartbeat", energy: 0.32, seed: 373, lift: -10 },
  { id: "silent_peaks", name: "The Silent Peaks", bpm: 58, root: 7, mode: "dorian", progression: [0, 3, 0, 6, 0, 3, 4, 0], meter: 4, lead: "flute", second: "choir", arp: null, bed: "pad", bass: "drone", kit: "calm", energy: 0.28, seed: 379, lift: -2 },
  { id: "heartwood", name: "The Heartwood", bpm: 70, root: 4, mode: "phrygian", progression: [0, 1, 5, 0, 6, 1, 4, 0], meter: 3, lead: "oboe", second: "harp", arp: "pluck", bed: "pad", bass: "bass", kit: "heartbeat", energy: 0.38, seed: 383, lift: -5 },
  { id: "greyfields", name: "The Greyfields", bpm: 92, root: 9, mode: "aeolian", progression: [0, 6, 5, 6, 0, 3, 4, 4], meter: 4, lead: "brass", second: "trumpet", arp: "pizz", bed: "strings", bass: "bass", kit: "march", energy: 0.7, seed: 389, lift: -9 },
  { id: "raria", name: "The Wise Friend's Law", bpm: 66, root: 0, mode: "aeolian", progression: [0, 4, 5, 0, 3, 4, 1, 0], meter: 4, lead: "choir", second: "organ", arp: "bell", bed: "organ", bass: "drone", kit: "heartbeat", energy: 0.42, seed: 347, lift: -8 },
  // The Ring: a war march an octave down, brass over a drone, the boss kit's drums the whole way; a place of brutality and death.
  { id: "friends_ring", name: "The Rare Friends Ring", bpm: 96, root: 0, mode: "locrian", progression: [0, 6, 0, 1, 5, 6, 4, 0], meter: 4, lead: "brass", second: "choir", arp: null, bed: "drone", bass: "bass", kit: "boss", energy: 0.9, seed: 271, lift: -12 },
  { id: "howling_vault", name: "The Howling Vault", bpm: 82, root: 7, mode: "harmonic", progression: [0, 6, 0, 5, 0, 6, 4, 0], meter: 4, lead: "brass", second: "choir", arp: null, bed: "choir", bass: "bass", kit: "march", energy: 0.6, seed: 257 },
];
/**
 * An area track in four sections, written like a little folk tune: a two-bar motif that is repeated, sequenced and
 * answered (A), the same tune with a second instrument in thirds (A'), a contrasting bridge (B), and the tune again
 * with the glockenspiel or harp doubling it (A''). Phrases end on the fifth, then the tonic; long notes get grace notes.
 */
/** The Realm's music leans dark: the bright modes bend to their minor cousins, the tune sits an octave lower, a drone hums under every section and every band has a drummer. */
const DARKER: Record<string, string> = { major: "dorian", lydian: "aeolian", mixolydian: "dorian" };
const DARK_LEADS: Partial<Record<Voice, Voice>> = { glock: "harp", recorder: "flute", trumpet: "brass", bell: "harp", lute: "pluck" };
/**
 * The whole Realm's music leans on the Mossy Undercroft's sound now: a pad under every chord, a harp picking through
 * it, the tune a little slower and the band a little calmer, so even the cheerful places are full and dark with a
 * bright line over them. (The boss theme and the Ring keep their own drums.)
 */
function fuller(style: Style): Style {
  const keep = style.id === "boss" || style.id === "friends_ring";
  return { ...style, bed: style.bed ?? "pad", arp: style.arp ?? "harp", bpm: style.bpm > 84 ? Math.round(style.bpm * 0.92) : style.bpm, energy: keep ? style.energy : Math.min(style.energy, 0.62) };
}
function composeTrack(given: Style): Track {
  const style = fuller(given);
  const random = mulberry(style.seed), scale = MODES[DARKER[style.mode] ?? style.mode], per = style.meter, bars = style.progression.length, loop = bars * per;
  const deg = (degree: number) => style.root + 12 * Math.floor(degree / 7) + scale[((degree % 7) + 7) % 7];
  const triad = (degree: number) => [deg(degree) % 12, deg(degree), deg(degree + 2), deg(degree + 4)];
  // The tune's home note lands between D4 and C#5 whatever the key, so melodies sit in a recorder's sweet spot.
  const top = (style.root >= 2 ? 48 : 60) + (style.lift ?? 0), lead = DARK_LEADS[style.lead] ?? style.lead, second = DARK_LEADS[style.second] ?? style.second;
  const cells = per === 3
    ? [[1, 0.5, 0.5, 1], [0.5, 0.5, 0.5, 0.5, 1], [1.5, 0.5, 1], [1, 1, 1], [2, 1]]
    : [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [1.5, 0.5, 1, 1], [1, 1, 0.5, 0.5, 1], [0.75, 0.25, 1, 1, 1], [2, 1, 1]];
  const pickCell = () => { const lively = random() < style.energy; return cells[lively ? Math.floor(random() * (cells.length - 1)) : cells.length - 1 - Math.floor(random() * 2)]; };
  /** One bar of melody starting near `from` (a scale degree), over `chord`. */
  const bar = (chord: number, from: number, rhythm: readonly number[]) => {
    const degrees: number[] = [], tones = [chord, chord + 2, chord + 4, chord + 7, chord - 3];
    let at = tones.reduce((best, tone) => Math.abs(tone - from) < Math.abs(best - from) ? tone : best, tones[0]);
    for (let i = 0; i < rhythm.length; i++) {
      if (i > 0) { const r = random(), dir = random() < (at > 6 ? 0.7 : at < 1 ? 0.3 : 0.5) ? -1 : 1; at += r < 0.62 ? dir : r < 0.88 ? dir * 2 : dir * 3; }
      at = Math.max(-2, Math.min(8, at)); degrees.push(at);
    }
    return degrees;
  };
  /** An eight-bar phrase: motif, sequence, motif, cadence. */
  const phrase = (progression: readonly number[], start: number) => {
    const cellA = pickCell(), cellB = pickCell(), motif = [bar(progression[0], start, cellA), bar(progression[1], start + 2, cellB)];
    const out: { degrees: number[]; rhythm: readonly number[] }[] = [];
    progression.forEach((chord, i) => {
      if (i === 3) { out.push({ degrees: [...bar(chord, 4, cellB).slice(0, -1), 4], rhythm: [...cellB.slice(0, -1), cellB[cellB.length - 1]] }); return; }  // half cadence on the fifth
      if (i === bars - 1) { const lead = bar(chord, 2, [1]).concat([0]); out.push({ degrees: lead, rhythm: [1, per - 1] }); return; }            // full cadence on the tonic
      const source = motif[i % 2], shift = i === 2 || i === 6 ? progression[i] - progression[i % 2] : 0;
      out.push({ degrees: source.map(d => d + shift), rhythm: i % 2 ? cellB : cellA });
    });
    return out;
  };
  const render = (lines: ReturnType<typeof phrase>, offset: number, voice: Voice, shift = 0, velocity = 0.85, graces = true) => {
    const notes: Note[] = [];
    lines.forEach((line, b) => {
      let beat = offset + b * per;
      line.degrees.forEach((degree, i) => {
        const length = line.rhythm[i] ?? 1, midi = deg(degree + shift) + top;
        if (graces && length >= 1.5 && random() < 0.35) notes.push({ beat: beat - 0.125, voice, midi: deg(degree + shift + 1) + top, length: 0.12, velocity: velocity * 0.7 });
        notes.push({ beat, voice, midi, length: length * 0.9, velocity: velocity * (i === 0 ? 1 : 0.85) });
        beat += length;
      });
    });
    return notes;
  };
  const bridgeProgression = style.progression.map((_, i) => style.progression[(i + Math.floor(bars / 2)) % bars]).map((chord, i) => i === bars - 1 ? 4 : chord);
  const a = phrase(style.progression, 2), b = phrase(bridgeProgression, 4);
  const notes: Note[] = [
    ...render(a, 0, lead),
    ...render(a, loop, lead), ...render(a, loop, second, -2, 0.5, false),
    ...render(b, loop * 2, second, 0, 0.85),
    ...render(a, loop * 3, lead), ...render(a, loop * 3, "harp", 0, 0.3, false).map(note => ({ ...note, midi: note.midi + 12 })),
  ];
  // A drone under each section: the root, two octaves down, held the whole way through.
  for (let section = 0; section < 4; section++) notes.push({ beat: loop * section, voice: "drone", midi: deg(0) + top - 24, length: loop, velocity: 0.6 });
  const patterns = per === 3 ? [[0, 1, 2, 1, 2, 1], [0, 2, 1, 2, 3, 2], [2, 1, 0, 1, 2, 3], [0, 1, 2, 3, 2, 1]] : [[0, 1, 2, 1, 3, 2, 1, 2], [0, 2, 1, 3, 2, 1, 3, 2], [3, 2, 1, 0, 1, 2, 3, 2], [0, 1, 2, 3, 2, 3, 1, 2]];
  [style.progression, style.progression, bridgeProgression, style.progression].forEach((progression, section) => {
    notes.push(...chordBed(progression.map(triad), per, { pad: style.bed ?? undefined, arp: style.arp ?? undefined, bass: style.bass, arpPattern: patterns[section] }).map(note => ({ ...note, beat: note.beat + loop * section })));
  });
  const hits: Hit[] = [];
  for (let barIndex = 0; barIndex < bars * 4; barIndex++) {
    const b0 = barIndex * per, fill = barIndex % bars === bars - 1, busy = Math.floor(barIndex / bars) % 2 === 1;
    const off = (velocity: number) => { for (let e = 1; e < per * 2; e += 2) hits.push({ beat: b0 + e / 2, drum: "tambourine", velocity }); };
    switch (style.kit) {
      case "tavern": hits.push({ beat: b0, drum: "hand", velocity: 0.55 }, { beat: b0 + 2, drum: "hand", velocity: 0.4 }); off(busy ? 0.26 : 0.18); break;
      case "jig": hits.push({ beat: b0, drum: "hand", velocity: 0.55 }); if (per === 3) hits.push({ beat: b0 + 1.5, drum: "hand", velocity: 0.3 }); off(0.22); break;
      case "march": hits.push({ beat: b0, drum: "timpani", velocity: 0.5 }, { beat: b0 + 2, drum: "timpani", velocity: 0.35 }); if (busy) hits.push({ beat: b0 + 1, drum: "snare", velocity: 0.18 }, { beat: b0 + 3, drum: "snare", velocity: 0.22 }); break;
      case "forge": hits.push({ beat: b0, drum: "timpani", velocity: 0.55 }, { beat: b0 + 1, drum: "clank", velocity: 0.4 }, { beat: b0 + 3, drum: "clank", velocity: 0.5 }); off(0.15); break;
      case "desert": for (const [o, v] of [[0, 0.6], [0.75, 0.3], [1.5, 0.45], [2, 0.55], [2.5, 0.3], [3.25, 0.4]] as const) if (o < per) hits.push({ beat: b0 + o, drum: "hand", velocity: v }); off(0.15); break;
      case "calm": if (barIndex % 2 === 0) hits.push({ beat: b0, drum: "shaker", velocity: 0.14 }); break;
      case "boss": hits.push({ beat: b0, drum: "timpani", velocity: 0.7 }, { beat: b0 + 1.5, drum: "timpani", velocity: 0.5 }, { beat: b0 + 2, drum: "timpani", velocity: 0.6 }); for (let e = 0; e < 8; e++) if (e % 2) hits.push({ beat: b0 + e / 2, drum: "snare", velocity: 0.25 }); break;
      case "heartbeat": hits.push({ beat: b0, drum: "timpani", velocity: 0.4 }, { beat: b0 + 0.5, drum: "timpani", velocity: 0.25 }); break;
    }
    if (fill && style.kit !== "calm" && style.kit !== "heartbeat") for (let e = 0; e < 4; e++) hits.push({ beat: b0 + per - 1 + e / 4, drum: "timpani", velocity: 0.25 + e * 0.07 });
    // The drummer: a deep drum on the downbeat everywhere, a kick-and-snare pulse where the band is lively, a low tom
    // and a soft ride where it's calm, so even the quiet places have a heartbeat under them.
    const lively = style.energy >= 0.65;
    hits.push({ beat: b0, drum: "deep", velocity: 0.55 });
    if (lively) { hits.push({ beat: b0, drum: "kick", velocity: 0.5 }); if (per === 4) hits.push({ beat: b0 + 2, drum: "kick", velocity: 0.4 }, { beat: b0 + 1, drum: "snare", velocity: busy ? 0.3 : 0.2 }, { beat: b0 + 3, drum: "snare", velocity: busy ? 0.34 : 0.24 }); else hits.push({ beat: b0 + 1.5, drum: "kick", velocity: 0.3 }, { beat: b0 + 2, drum: "snare", velocity: 0.22 }); for (let e = 1; e < per * 2; e += 2) hits.push({ beat: b0 + e / 2, drum: "hat", velocity: busy ? 0.14 : 0.09 }); }
    else { if (barIndex % 2 === 1) hits.push({ beat: b0 + per - 1.5, drum: "tom", velocity: 0.28 }); if (busy) hits.push({ beat: b0 + 2, drum: "ride", velocity: 0.12 }); if (barIndex % 4 === 3) hits.push({ beat: b0 + per - 0.5, drum: "tom", velocity: 0.22 }); }
  }
  return { id: style.id, name: style.name, bpm: style.bpm, beats: loop * 4, notes, hits };
}
// ---------- The Mizukai Isles (What Rises in the East): ten pieces in the Isles' own forms ----------
/**
 * Each piece is written out by hand in a traditional form, on its own five-note scale, for its own ensemble, and none
 * has chords or a bass line, as in the music they draw on. Instruments share a tune in heterophony (each its own way
 * through the same melody), silence (ma) is part of the phrase, and the ornaments are written in: the shakuhachi's
 * scoop up into a note (meri) and its slow, wide shake (yuri), the koto's press that raises a string after the pluck
 * (oshide), the falls at a phrase's end, and the drummers' calls.
 */
/** "D5:2v+" is D5 for two beats, scooped into and shaken. Flags: v scoop up into it (v2: from two semitones down), ^ press it
 * up after the pluck (^2: a whole tone), ~ let it fall at the end, + yuri, ! accent, p soft. "|" marks a bar and is skipped. */
function phrase(text: string, voice: Voice, start = 0, velocity = 0.85, shift = 0): Note[] {
  const notes: Note[] = [];
  let beat = start;
  for (const token of text.trim().split(/\s+/)) {
    if (token === "|") continue;
    const match = /^([A-G][#b]?\d|r):([\d.]+)(.*)$/.exec(token);
    if (!match) throw new Error(`Not a note: ${token}`);
    const length = Number(match[2]), flags = match[3];
    if (match[1] !== "r") {
      const pitch = /^([A-G])(#|b)?(\d)$/.exec(match[1])!, shape: Shape = {};
      let accent = 1;
      for (let k = 0; k < flags.length; k++) {
        const flag = flags[k], amount = () => (/\d/.test(flags[k + 1] ?? "") ? Number(flags[++k]) : 1);
        if (flag === "v") shape.scoop = amount(); else if (flag === "^") shape.up = amount(); else if (flag === "~") shape.fall = amount();
        else if (flag === "+") shape.yuri = true; else if (flag === "!") accent = 1.25; else if (flag === "p") accent = 0.6;
      }
      notes.push({ beat, voice, midi: 12 * (Number(pitch[3]) + 1) + N[pitch[1]] + (pitch[2] === "#" ? 1 : pitch[2] === "b" ? -1 : 0) + shift,
        length: length * 0.96, velocity: Math.min(1, velocity * accent), shape: Object.keys(shape).length ? shape : undefined });
    }
    beat += length;
  }
  return notes;
}
const MIZUKAI_DRUMS: ReadonlySet<string> = new Set(["taiko", "shime", "clapper", "odaiko", "kara", "kakko", "shoko", "atarigane", "tsuzumi", "otsuzumi", "yo", "ha", "wave", "wind"]);
/** A drummer's line: "taiko:1! kara:0.5 r:0.5", "yo+tsuzumi:1" for two at once. ! accent, p soft. */
function strokes(text: string, start = 0, velocity = 0.7): Hit[] {
  const hits: Hit[] = [];
  let beat = start;
  for (const token of text.trim().split(/\s+/)) {
    if (token === "|") continue;
    const match = /^([a-z+]+):([\d.]+)([!p]?)$/.exec(token);
    if (!match) throw new Error(`Not a stroke: ${token}`);
    if (match[1] !== "r") for (const drum of match[1].split("+")) {
      if (!MIZUKAI_DRUMS.has(drum)) throw new Error(`Not one of the Isles' drums: ${drum}`);
      hits.push({ beat, drum: drum as Drum, velocity: Math.min(1, velocity * (match[3] === "!" ? 1.3 : match[3] === "p" ? 0.55 : 1)) });
    }
    beat += Number(match[2]);
  }
  return hits;
}
/** The same bar's strokes, bar after bar. */
const everyBar = (bars: number, per: number, bar: (b0: number, index: number) => Hit[]) => Array.from({ length: bars }, (_, index) => bar(index * per, index)).flat();
/** Another player's way through the same tune: later by `delay`, `shift` semitones away, softer, on their own instrument. */
function hetero(notes: readonly Note[], voice: Voice, shift: number, delay: number, velocity: number, keep: (note: Note) => boolean = () => true): Note[] {
  return notes.filter(keep).map(note => ({ ...note, voice, midi: note.midi + shift, beat: note.beat + delay, velocity: note.velocity * velocity }));
}
/** The note sounding at a beat (for the shamisen and koto picking out the tune under a flute). */
const sounding = (notes: readonly Note[], beat: number) => [...notes].reverse().find(note => note.beat <= beat + 0.01 && note.beat + note.length / 0.96 > beat + 0.01) ?? null;
/** The notes of a scale (pitch classes above `tonic`) between two MIDI notes. */
const scaleNotes = (tonic: number, steps: readonly number[], low: number, high: number) => {
  const out: number[] = [];
  for (let midi = low; midi <= high; midi++) if (steps.includes(((midi - tonic) % 12 + 12) % 12)) out.push(midi);
  return out;
};
/** The koto's flowing figures (like the opening of Haru no Umi): eighth notes wandering up and down the scale from each bar's centre, never a chord. */
function flow(centres: readonly number[], scale: readonly number[], per: number, start: number, velocity: number): Note[] {
  const figure = [0, 2, 1, 3, 2, 4, 3, 1], notes: Note[] = [];
  centres.forEach((centre, bar) => {
    const at = scale.indexOf(centre);
    for (let step = 0; step < per * 2; step++) {
      const midi = scale[Math.max(0, Math.min(scale.length - 1, at + figure[step % figure.length]))];
      notes.push({ beat: start + bar * per + step / 2, voice: "koto", midi, length: 0.5, velocity: velocity * (step % 4 === 0 ? 1.2 : step % 2 ? 0.75 : 0.95) });
    }
  });
  return notes;
}
/** A koto's sararin: a sweep up the strings in half a beat. */
const sararin = (beat: number, scale: readonly number[], from: number, count: number, velocity: number): Note[] =>
  scale.slice(scale.indexOf(from), scale.indexOf(from) + count).map((midi, k) => ({ beat: beat + k * 0.06, voice: "koto" as Voice, midi, length: 0.8, velocity: velocity * (0.7 + k * 0.04) }));
/** A koto's kororin: three strings plucked downwards, quick. */
const kororin = (beat: number, scale: readonly number[], top: number, velocity: number): Note[] =>
  [0, 1, 2].map(k => ({ beat: beat + k * 0.18, voice: "koto" as Voice, midi: scale[Math.max(0, scale.indexOf(top) - k)], length: 0.6, velocity }));
/** Wrap a canon's tail round to the loop's start. */
const wrap = (notes: readonly Note[], beats: number) => notes.map(note => ({ ...note, beat: note.beat % beats }));

type MizukaiPiece = { id: TrackId; name: string; bpm: number; beats: number; tonic: number; scale: readonly number[]; level?: number; notes: () => Note[]; hits: () => Hit[] };
function composeMizukai(piece: MizukaiPiece): Track {
  const notes = piece.notes(), hits = piece.hits();
  const outside = [...notes, ...hits].find(entry => entry.beat < 0 || entry.beat >= piece.beats);
  if (outside) throw new Error(`${piece.name}: something at beat ${outside.beat}, outside its ${piece.beats} beats`);
  // Every note of the tune on the piece's own five (the bell and the sho's clusters ring their own way).
  const stray = notes.find(note => note.voice !== "kane" && note.voice !== "sho" && !piece.scale.includes(((note.midi - piece.tonic) % 12 + 12) % 12));
  if (stray) throw new Error(`${piece.name}: MIDI ${stray.midi} is off its scale`);
  // The quiet pieces (a koto alone, the court's few instruments) brought up to sit with the others.
  const level = piece.level ?? 1;
  return { id: piece.id, name: piece.name, bpm: piece.bpm, beats: piece.beats, notes: notes.map(note => ({ ...note, velocity: note.velocity * level })), hits: hits.map(hit => ({ ...hit, velocity: hit.velocity * level })) };
}
// Scales, as steps above the tonic: yo (bright, open), min'yo (the folk songs'), in (miyako-bushi: the half-steps of the koto
// and the ghosts), hirajoshi, kumoi, and the court's ritsu.
const YO = [0, 2, 5, 7, 9], MINYO = [0, 3, 5, 7, 10], IN = [0, 1, 5, 7, 8], HIRAJOSHI = [0, 2, 3, 7, 8], KUMOI = [0, 2, 3, 7, 9], RITSU = [0, 2, 5, 7, 10];
const D = 62, E = 64, G = 67, A = 69, CS = 61;
const MIZUKAI_PIECES: readonly MizukaiPiece[] = [
  // Like Haru no Umi: the koto's flowing figures like the morning sea, the shakuhachi singing over it in yo, a bell at dawn.
  { id: "mizukai_sunrise", name: "Hinode, Isle of Sunrise", bpm: 84, beats: 64, tonic: D, scale: YO,
    notes: () => {
      const tune = phrase(`A4:2v B4:1 D5:1 | E5:3+ D5:1 | B4:1 A4:1 G4:2~ | A4:4+ | D5:2v E5:1 G5:1 | A5:3+ G5:1 | E5:1 D5:1 B4:1 D5:1 | E5:4+ |
        G5:2v E5:1 D5:1 | B4:3+ A4:1 | G4:1 A4:1 B4:1 D5:1 | E5:4~ | D5:1 B4:1 A4:2v | G4:1 E4:1 G4:2 | A4:1 B4:1 G4:1 E4:1 | D4:4+`, "shakuhachi", 0, 0.82);
      const koto = scaleNotes(D, YO, D - 12, D + 24);
      return [...tune, ...flow([50, 55, 52, 57, 50, 55, 59, 52, 55, 50, 52, 57, 59, 55, 52, 50], koto, 4, 0, 0.3), { beat: 0, voice: "kane", midi: 50, length: 4, velocity: 0.5 }];
    },
    hits: () => strokes("wave+odaiko:32p wave:32p", 0, 0.5) },
  // A fishermen's min'yo: the shinobue's tune, the shamisen picking it out underneath, taiko, the little gong, and the calls.
  { id: "mizukai_harbour", name: "Kurohama Harbour", bpm: 104, beats: 64, tonic: E, scale: MINYO,
    notes: () => {
      const tune = phrase(`E5:1 G5:1 A5:2 | B5:1.5 A5:0.5 G5:1 E5:1 | G5:1 A5:1 B5:1 D6:1 | B5:3+ r:1 | A5:1 B5:0.5 A5:0.5 G5:1 E5:1 | G5:2 A5:1 G5:1 | E5:1 D5:1 E5:1 G5:1 | E5:3~ r:1 |
        B5:1 D6:1 E6:2! | D6:1 B5:1 A5:2 | B5:1 A5:1 G5:1 A5:1 | B5:2v A5:2 | G5:1 A5:1 B5:1 A5:1 | G5:1 E5:1 D5:2 | E5:1 G5:1 A5:1 G5:1 | E5:4+`, "shinobue", 0, 0.8);
      const shamisen: Note[] = [];
      for (let beat = 0; beat < 64; beat++) {
        const note = sounding(tune, beat);
        if (note) shamisen.push({ beat, voice: "shamisen", midi: note.midi - 12, length: 0.45, velocity: beat % 4 === 0 ? 0.62 : 0.46 });
        shamisen.push({ beat: beat + 0.5, voice: "shamisen", midi: E, length: 0.3, velocity: 0.3 });
      }
      return [...tune, ...shamisen];
    },
    hits: () => [...everyBar(16, 4, (b0, bar) => [...strokes("taiko:1! kara:1 taiko:0.5 taiko:0.5 kara:1", b0), ...strokes("atarigane:1.5! atarigane:0.5 atarigane:1.5 atarigane:0.5", b0, 0.5),
      ...(bar % 4 === 3 ? strokes(bar % 8 === 7 ? "r:3 yo:1" : "r:3.5 ha:0.5", b0, 0.75) : []), ...(bar % 8 === 7 ? strokes("r:3 clapper:0.5! clapper:0.5!", b0, 0.7) : [])])] },
  // A koto duet in hirajoshi, like Sakura or Rokudan: the tune with its presses, a second koto low with its sweeps and
  // kororin, and the second time round a shakuhachi joins, holding the long notes.
  { id: "mizukai_village", name: "Under the Eaves", bpm: 76, beats: 128, tonic: A, scale: HIRAJOSHI, level: 1.45,
    notes: () => {
      const a = `A4:1 B4:1 C5:2^ | B4:1 A4:1 F4:2~ | E4:1 F4:1 A4:1 B4:1 | C5:2^ B4:2 | E5:1 C5:1 B4:1 A4:1 | B4:1 C5:1 B4:1 A4:0.5 F4:0.5 | E4:4~ | r:4`;
      const b = `E5:1 F5:1 E5:2^ | C5:1 B4:1 C5:2 | E5:1 F5:1 A5:2^ | F5:1 E5:1 C5:2 | B4:1 C5:1 E5:1 C5:1 | B4:1 A4:1 F4:2~ | E4:1 F4:1 A4:2^ | A4:4`;
      const tune = phrase(`${a} | ${b} | ${a} | ${b}`, "koto", 0, 0.75), scale = scaleNotes(A, HIRAJOSHI, A - 24, A + 24);
      const low: Note[] = [];
      for (let bar = 0; bar < 32; bar++) {
        const note = sounding(tune, bar * 4);
        if (note) low.push({ beat: bar * 4, voice: "koto", midi: note.midi - 12, length: 1.5, velocity: 0.34 });
        // Where the tune rests, the low koto answers it.
        else low.push(...[64, 60, 59].map((midi, k) => ({ beat: bar * 4 + k * 0.75, voice: "koto" as Voice, midi, length: k === 2 ? 1.5 : 0.75, velocity: 0.36, shape: k === 2 ? { fall: 1 } : undefined })));
        if (bar % 4 === 3) low.push(...kororin(bar * 4 + 3, scale, 64, 0.32));
      }
      const sweeps = [0, 32, 64, 96].flatMap(beat => sararin(beat, scale, 57, 8, 0.3));
      const flute = hetero(tune.filter(note => note.beat >= 64), "shakuhachi", 0, 0.1, 0.62, note => note.length >= 0.9).map(note => ({ ...note, shape: { scoop: 1, yuri: note.length >= 1.9 } }));
      return [...tune, ...low, ...sweeps, ...flute];
    },
    hits: () => [] },
  // Gagaku: the sho's held clusters, the hichiriki's slow line with its slides (enbai), the ryuteki twining round it an octave
  // up, the kakko's rolls, the shoko's chimes, and the great drum.
  { id: "mizukai_shrine", name: "Kumoyama", bpm: 44, beats: 64, tonic: E, scale: RITSU, level: 1.35,
    notes: () => {
      const tune = phrase(`E4:4v2 | F#4:2 A4:2~ | B4:4v2 | B4:2+ A4:2 | F#4:4 | E4:2v2 F#4:2 | E4:4+ | r:4 |
        A4:4v2 | B4:2 D5:2v | B4:4+ | A4:2 F#4:2~ | F#4:2 A4:2 | F#4:2 E4:2v2 | E4:4+ | r:4`, "hichiriki", 0, 0.75);
      const flute = hetero(tune, "ryuteki", 12, 0.12, 0.62).map(note => ({ ...note, shape: { ...note.shape, scoop: 1 } }));
      const sho = [64, 64, 69, 66, 69, 71, 69, 64].map((midi, k) => ({ beat: k * 8, voice: "sho" as Voice, midi, length: 7.9, velocity: 0.55 }));
      return [...tune, ...flute, ...sho];
    },
    hits: () => everyBar(16, 4, (b0, bar) => [
      ...(bar % 2 === 0 ? strokes("kakko:0.5p kakko:0.3p kakko:0.25 kakko:0.2 kakko:0.15 kakko:0.6!", b0, 0.5) : strokes("r:2 kakko:1", b0, 0.5)),
      ...strokes(bar % 4 === 3 ? "r:1 shoko:0.5 shoko:0.5" : "r:1 shoko:1", b0, 0.45),
      ...(bar % 2 === 1 ? strokes(bar % 4 === 3 ? "r:3 odaiko:1!" : "r:3 odaiko:1p", b0, 0.7) : [])]) },
  // Honkyoku for two shakuhachi in kumoi: the second follows the first six beats behind, the cedars' wind between.
  { id: "mizukai_forest", name: "The Old Cedars", bpm: 60, beats: 64, tonic: D, scale: KUMOI,
    notes: () => {
      const tune = phrase(`A4:2v B4:2 A4:1 F4:1 E4:2~ | r:2 D4:2v E4:1 F4:1 A4:2+ | B4:3v A4:1 F4:2 E4:2 | D4:6+ r:2 |
        F4:2v A4:2 B4:2 D5:2 | E5:4+ D5:1 B4:1 A4:2 | F4:2 E4:1 D4:1 E4:2v F4:2 | D4:6~ r:2`, "shakuhachi", 0, 0.82);
      const canon = wrap(hetero(tune, "shakuhachi", 0, 6, 0.55), 64);
      return [...tune, ...canon, { beat: 16, voice: "koto", midi: 76, length: 3, velocity: 0.28 }, { beat: 48, voice: "koto", midi: 81, length: 3, velocity: 0.28 }];
    },
    hits: () => [...strokes("odaiko:24p wind:24 wind:16", 0, 0.45)] },
  // A rowing song (funauta) in yo: the shakuhachi sings it, the oars beat on the drums, the shamisen keeps the boat, the sea swells.
  { id: "mizukai_sea", name: "Crossing the Eastern Sea", bpm: 72, beats: 64, tonic: G, scale: YO,
    notes: () => {
      const tune = phrase(`G4:2 A4:1 C5:1 | D5:3v C5:1 | A4:2 G4:1 A4:1 | C5:4+ | D5:1 E5:1 D5:2 | C5:1 A4:1 G4:2~ | A4:1 C5:1 A4:1 G4:1 | E4:4+ |
        C5:2 D5:1 E5:1 | G5:3v E5:1 | D5:2 C5:1 D5:1 | E5:4+ | D5:1 C5:1 A4:2 | G4:1 A4:1 C5:2v | A4:1 G4:1 E4:1 D4:1 | G4:4+`, "shakuhachi", 0, 0.82);
      const oars = Array.from({ length: 16 }, (_, bar) => [{ beat: bar * 4 + 1, voice: "shamisen" as Voice, midi: G - 12, length: 0.5, velocity: 0.38 }, { beat: bar * 4 + 3, voice: "shamisen" as Voice, midi: D - 12, length: 0.5, velocity: 0.3 }]).flat();
      return [...tune, ...oars];
    },
    hits: () => [...everyBar(16, 4, (b0, bar) => [...strokes("odaiko:2p taiko:2p", b0, 0.6), ...(bar % 4 === 3 ? strokes("r:3.5 yo:0.5p", b0, 0.6) : [])]), ...strokes("wave:8 wave:8 wave:8 wave:8 wave:8 wave:8 wave:8 wave:8", 0, 0.45)] },
  // A ghost story told on the biwa: struck strings, pressed and buzzing, long silences, the noh flute's cry (its top, the
  // hishigi, a shriek), the kotsuzumi's "pon" after the drummer's call, and a far bell.
  { id: "mizukai_haunted", name: "Lanterns of the Drowned", bpm: 54, beats: 64, tonic: E, scale: IN,
    notes: () => {
      const biwa = phrase(`E3:1! r:1 E3:0.5 F3:0.5 A3:2^2 r:3 | B3:1! C4:1^ B3:2~ r:4 | E3:0.5! E3:0.5 E3:1 F3:2^ E3:4~ | r:8 |
        A3:1! B3:1 C4:2^ B3:1 A3:1 F3:2 | E3:4~ r:4 | F3:0.5! E3:0.5 F3:1 A3:2^ r:4 | E3:2! r:6`, "biwa", 0, 0.85);
      const nohkan = phrase(`r:8 | r:2 E5:2v F5:1 A5:3+ | r:8 | B5:2v C6:1 B5:1 A5:4~ | r:8 | r:4 E6:4! | r:8 | A5:2v F5:2 E5:4+`, "nohkan", 0, 0.7);
      return [...biwa, ...nohkan, { beat: 0, voice: "kane", midi: 52, length: 6, velocity: 0.35 }, { beat: 32, voice: "kane", midi: 52, length: 6, velocity: 0.3 }];
    },
    hits: () => [...everyBar(8, 8, (b0, bar) => bar % 2 === 0 ? strokes("r:6 yo:1 tsuzumi:1!", b0, 0.6) : bar % 4 === 3 ? strokes("otsuzumi:8!", b0, 0.6) : []), ...strokes("r:16 wind:32 wind:16", 0, 0.35)] },
  // Kumi-daiko: the great drum, the nagado taiko's "don doko", rim clicks, the tsugaru shamisen's driving runs, the
  // shinobue over the top, and the players' shouts.
  { id: "mizukai_battle", name: "Steel and Blossom", bpm: 144, beats: 64, tonic: A, scale: MINYO,
    notes: () => {
      const runs = `A4:0.5! A4:0.5 C5:0.5 D5:0.5 E5:0.5! D5:0.5 C5:0.5 A4:0.5 | G4:0.5! A4:0.5 C5:0.5 A4:0.5 G4:0.5 E4:0.5 G4:0.5 A4:0.5 |
        A4:0.5! C5:0.5 D5:0.5 E5:0.5 G5:0.5! E5:0.5 D5:0.5 C5:0.5 | D5:1! C5:0.5 A4:0.5 C5:1 A4:1 | E5:0.5! E5:0.5 D5:0.5 C5:0.5 D5:0.5! C5:0.5 A4:0.5 G4:0.5 |
        A4:0.5! C5:0.5 A4:0.5 G4:0.5 E4:1 G4:1 | A4:0.5! A4:0.5 E5:0.5 A4:0.5 D5:0.5 A4:0.5 C5:0.5 A4:0.5 | A4:2! r:2`;
      const shamisen = phrase(`${runs} | ${runs}`, "shamisen", 0, 0.78);
      const fue = phrase(`E5:2v G5:2 | A5:3! G5:1 | E5:2 D5:1 C5:1 | D5:4+ | E5:2v G5:1 A5:1 | C6:3! A5:1 | G5:1 E5:1 D5:1 E5:1 | A4:4+ |
        A5:2v C6:2 | D6:3! C6:1 | A5:2 G5:1 E5:1 | G5:4+ | A5:1 G5:1 E5:1 D5:1 | E5:2 G5:2v | A5:1 G5:1 E5:1 D5:1 | A5:4!+`, "shinobue", 0, 0.78);
      return [...shamisen, ...fue];
    },
    hits: () => everyBar(16, 4, (b0, bar) => [
      ...strokes("taiko:1! taiko:0.5 taiko:0.5 taiko:1! taiko:1", b0, 0.75), ...strokes("r:0.5 kara:2 kara:1 kara:0.5", b0, 0.5),
      ...strokes("shime:0.5 shime:0.5p shime:0.5! shime:0.5p shime:0.5 shime:0.5p shime:0.5! shime:0.5p", b0, 0.45),
      ...(bar % 2 === 0 ? strokes("odaiko:4!", b0, 0.8) : []),
      ...(bar % 8 === 7 ? strokes("r:3 taiko:0.25 taiko:0.25 taiko:0.25! taiko:0.25!", b0, 0.7) : []),
      ...(bar % 4 === 3 ? strokes(bar === 15 ? "r:2.5 yo:1 ha:0.5" : bar % 8 === 7 ? "r:3 yo:1" : "r:3.5 ha:0.5", b0, 0.8) : [])]) },
  // A noh hayashi at full pitch: the nokan's wild line with its shrieks, the otsuzumi's crack and the kotsuzumi's "pon"
  // locked together with the drummers' "yo-o" and "ho", the stick drum, the great drum's footsteps, a bell.
  { id: "mizukai_spirit", name: "The Great Spirit", bpm: 120, beats: 64, tonic: CS, scale: IN,
    notes: () => [...phrase(`C#5:1v D5:1 F#5:2+ | G#5:0.5! A5:0.5 G#5:1 F#5:2~ | D5:1 C#5:1 r:2 | C#6:4!+ | A5:1v G#5:1 F#5:1 D5:1 | C#5:2+ D5:1 F#5:1 | G#5:1! A5:1 C#6:2v | D6:4!+ |
        r:2 C#5:1v D5:1 | F#5:2 G#5:1 A5:1 | G#5:1! F#5:1 D5:1 C#5:1 | r:4 | A5:1v C#6:1 D6:2+ | C#6:1! A5:1 G#5:1 F#5:1 | D5:1 F#5:1 G#5:1 A5:1 | C#6:4!~`, "nohkan", 0, 0.78),
      { beat: 0, voice: "kane", midi: CS - 12, length: 4, velocity: 0.45 }, { beat: 32, voice: "kane", midi: CS - 12, length: 4, velocity: 0.45 }],
    hits: () => everyBar(16, 4, (b0, bar) => [
      ...(bar % 2 === 0 ? strokes("yo:0.5 tsuzumi:0.5 otsuzumi:1! ha:0.5 tsuzumi:0.25 tsuzumi:0.25 otsuzumi:1!", b0, 0.7) : strokes("tsuzumi:1 ha:0.5 otsuzumi:1.5! tsuzumi:1", b0, 0.65)),
      ...strokes("r:1.5 kakko:2! kakko:0.5!", b0, 0.6),
      ...(bar % 4 === 3 ? strokes("odaiko:2! odaiko:2!", b0, 0.85) : [])]) },
  // Sankyoku for the lord's hall: shakuhachi, koto and shamisen through one stately tune in kumoi (the koto picking it out on
  // the beat, the shamisen on the bar), the ceremonial drum, the clappers, the bell.
  { id: "mizukai_castle", name: "The Hall of Takamori", bpm: 72, beats: 64, tonic: E, scale: KUMOI,
    notes: () => {
      const tune = phrase(`E4:2v F#4:1 G4:1 | B4:3+ C#5:1 | B4:1 G4:1 F#4:1 E4:1 | F#4:4+ | G4:2v B4:1 C#5:1 | E5:3+ C#5:1 | B4:1 C#5:1 B4:1 G4:1 | B4:4~ |
        E5:2v F#5:1 E5:1 | C#5:3+ B4:1 | G4:1 B4:1 C#5:1 B4:1 | G4:4 | F#4:1 G4:1 B4:2v | C#5:1 B4:1 G4:1 F#4:1 | E4:2 F#4:1 G4:1 | E4:4+`, "shakuhachi", 0, 0.8);
      const scale = scaleNotes(E, KUMOI, E - 12, E + 24), koto: Note[] = [], shamisen: Note[] = [];
      for (let beat = 0; beat < 64; beat++) {
        const note = sounding(tune, beat);
        if (note) koto.push({ beat, voice: "koto", midi: note.midi + 12, length: 0.9, velocity: beat % 4 === 0 ? 0.42 : 0.32, shape: note.length >= 2.5 && note.beat === beat ? { up: 1 } : undefined });
        if (note && beat % 4 === 0) shamisen.push({ beat, voice: "shamisen", midi: note.midi - 12, length: 0.8, velocity: 0.5 });
      }
      for (const bar of [3, 7, 11]) koto.push(...kororin(bar * 4 + 3.4, scale, 76, 0.3));
      return [...tune, ...koto, ...shamisen, { beat: 0, voice: "kane", midi: E - 12, length: 4, velocity: 0.4 }, { beat: 32, voice: "kane", midi: E - 12, length: 4, velocity: 0.35 }];
    },
    hits: () => [...everyBar(8, 8, b0 => strokes("odaiko:4! taiko:4p", b0, 0.6)), ...strokes("r:63 clapper:0.5! clapper:0.5!", 0, 0.7)] },
];
/** Which Mizukai piece plays where. */
const MIZUKAI_REGION_TRACK: Partial<Record<RegionId, TrackId>> = {
  hinode: "mizukai_sunrise", kurohama: "mizukai_harbour", shiogama: "mizukai_harbour", smugglers_cove: "mizukai_harbour", takamori: "mizukai_castle",
  kumoyama: "mizukai_shrine", iwaoka: "mizukai_shrine", old_cedars: "mizukai_forest", whispering_bamboo: "mizukai_forest", morishima: "mizukai_forest",
  tanabe: "mizukai_village", yumoto: "mizukai_village", kibi: "mizukai_village", hanazono: "mizukai_village", kusabana: "mizukai_village",
  kurokage: "mizukai_haunted", josaki: "mizukai_haunted", torojima: "mizukai_haunted", ashigane: "mizukai_haunted", hakkotsu: "mizukai_haunted",
  kumo_hollow: "mizukai_haunted", ashigane_deeps: "mizukai_haunted", bone_shrine: "mizukai_haunted",
  mizukai_sea: "mizukai_sea", three_stones: "mizukai_sea", turtle_rock: "mizukai_sea",
};

export const TRACKS: readonly Track[] = [themeTrack(), ...STYLES.map(composeTrack), ...MIZUKAI_PIECES.map(composeMizukai)];
/** The Mizukai pieces (for tests). */
export const MIZUKAI_TRACKS: readonly TrackId[] = MIZUKAI_PIECES.map(piece => piece.id);
export const trackById = (id: TrackId) => TRACKS.find(track => track.id === id) ?? TRACKS[0];
/** Which track plays where: each region has its own, and the Hollow King's throne room its boss theme. */
export function trackFor(region: RegionId, nearBoss: boolean, mizukai: { sea?: boolean; fight?: boolean; spirit?: boolean } = {}): TrackId {
  if (nearBoss) return "boss";
  // The Mizukai Isles: the place's own piece, the sea's on a crossing, and in a fight the battle (or, against one of the great spirits, theirs).
  if (mizukai.sea) return "mizukai_sea";
  const isles = MIZUKAI_REGION_TRACK[region];
  if (isles) return mizukai.spirit ? "mizukai_spirit" : mizukai.fight ? "mizukai_battle" : isles;
  return region;
}

// ---------- Engine ----------
export class RealmAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode; private musicBus!: GainNode; private sfxBus!: GainNode; private reverb!: ConvolverNode; private wet!: GainNode; private noise!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private track: Track = TRACKS[0]; private pending: Track | null = null; private position = 0; private nextTime = 0; private noteIndex = 0; private hitIndex = 0;
  private lastSfx = new Map<string, number>(); private fade: GainNode | null = null;
  musicOn = true; sfxOn = true; muted = false; musicVolume = 0.7; sfxVolume = 0.8;

  get trackId() { return (this.pending ?? this.track).id; }
  get trackName() { return (this.pending ?? this.track).name; }
  get ready() { return this.ctx?.state === "running"; }

  unlock() {
    if (!this.ctx) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      const ctx = this.ctx = new Context();
      const glue = ctx.createDynamicsCompressor(), output = ctx.createGain();
      glue.threshold.value = -18; glue.knee.value = 10; glue.ratio.value = 4; glue.attack.value = 0.004; glue.release.value = 0.25;
      output.gain.value = 1.3; glue.connect(output).connect(ctx.destination);
      this.master = ctx.createGain(); this.master.connect(glue);
      // A small hall: generated impulse response, so everything sits in the same space.
      this.reverb = ctx.createConvolver(); this.wet = ctx.createGain(); this.wet.gain.value = 0.22;
      const length = Math.floor(ctx.sampleRate * 3.2), impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) { const data = impulse.getChannelData(channel); for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6; }
      this.reverb.buffer = impulse; this.reverb.connect(this.wet).connect(this.master);
      const warmth = ctx.createBiquadFilter(); warmth.type = "lowpass"; warmth.frequency.value = 6500; warmth.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.connect(warmth); this.musicBus.connect(this.reverb);
      this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.applyLevels();
    }
    try { const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession; if (session) session.type = "playback"; } catch { /* unsupported */ }
    if (this.ctx.state !== "running") {
      const primer = this.ctx.createBufferSource(); primer.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate); primer.connect(this.ctx.destination); primer.start();
      void this.ctx.resume().catch(() => { /* retried on the next gesture */ });
    }
    this.syncMusic();
  }
  setMuted(muted: boolean) { this.muted = muted; this.applyLevels(); this.syncMusic(); }
  setMusic(on: boolean) { this.musicOn = on; this.applyLevels(); this.syncMusic(); }
  setSfx(on: boolean) { this.sfxOn = on; this.applyLevels(); }
  setVolumes(music: number, sfx: number) { this.musicVolume = Math.max(0, Math.min(1, music)); this.sfxVolume = Math.max(0, Math.min(1, sfx)); this.applyLevels(); }
  /** Switch tracks with a short crossfade (at the next beat). */
  play(id: TrackId) {
    const next = trackById(id);
    if (next === this.track && !this.pending) return;
    if (this.pending === next) return;
    if (!this.ctx || !this.timer) { this.track = next; this.pending = null; this.position = 0; this.noteIndex = 0; this.hitIndex = 0; return; }
    this.pending = next;
  }
  dispose() { if (this.timer) clearInterval(this.timer); this.timer = null; void this.ctx?.close(); this.ctx = null; }

  private applyLevels() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, now, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicOn ? this.musicVolume * 1.1 : 0, now, 0.2);
    this.sfxBus.gain.setTargetAtTime(this.sfxOn ? this.sfxVolume * 1.2 : 0, now, 0.02);
  }
  private syncMusic() {
    const playing = Boolean(this.ctx && this.musicOn && !this.muted);
    if (playing && !this.timer) { this.nextTime = this.ctx!.currentTime + 0.1; this.timer = setInterval(() => this.schedule(), 50); }
    if (!playing && this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  private schedule() {
    const ctx = this.ctx!;
    if (ctx.state !== "running") return;
    const horizon = ctx.currentTime + 0.25;
    while (this.nextTime < horizon) {
      const track = this.track, secondsPerBeat = 60 / track.bpm, step = 0.25;
      if (!this.fade) { this.fade = ctx.createGain(); this.fade.connect(this.musicBus); this.fade.gain.value = 1; }
      // Change track on a bar line (or right away if we're between tracks).
      if (this.pending && this.position % 4 === 0) {
        const old = this.fade; old.gain.setTargetAtTime(0, this.nextTime, 0.4); setTimeout(() => old.disconnect(), 3000);
        this.fade = ctx.createGain(); this.fade.gain.setValueAtTime(0.0001, this.nextTime); this.fade.gain.exponentialRampToValueAtTime(1, this.nextTime + 1.2); this.fade.connect(this.musicBus);
        this.track = this.pending; this.pending = null; this.position = 0; this.noteIndex = 0; this.hitIndex = 0;
        continue;
      }
      const notes = sortedNotes(this.track), hits = sortedHits(this.track);
      while (this.noteIndex < notes.length && notes[this.noteIndex].beat < this.position + step) {
        const note = notes[this.noteIndex++], at = this.nextTime + (note.beat - this.position) * secondsPerBeat;
        this.voice(note.voice, note.midi, at, note.length * secondsPerBeat, note.velocity, this.fade!, note.shape);
      }
      while (this.hitIndex < hits.length && hits[this.hitIndex].beat < this.position + step) {
        const hit = hits[this.hitIndex++], at = this.nextTime + (hit.beat - this.position) * secondsPerBeat;
        this.drum(hit.drum, at, hit.velocity, this.fade!);
      }
      this.position += step; this.nextTime += step * secondsPerBeat;
      if (this.position >= this.track.beats) { this.position = 0; this.noteIndex = 0; this.hitIndex = 0; }
    }
  }

  // ---------- Instruments ----------
  private env(gain: GainNode, t: number, peak: number, attack: number, hold: number, release: number) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }
  private osc(type: OscillatorType, frequency: number, t: number, stop: number, into: AudioNode, detune = 0) {
    const osc = this.ctx!.createOscillator(); osc.type = type; osc.frequency.value = frequency; osc.detune.value = detune;
    osc.connect(into); osc.start(t); osc.stop(stop); return osc;
  }
  /** A note's ornaments on an oscillator's pitch: the scoop up into it, the press up after the pluck, the fall at the end. */
  private shapePitch(o: OscillatorNode, f: number, t: number, length: number, shape: Shape | undefined) {
    if (!shape) return;
    const p = o.frequency, end = t + length, pressed = f * 2 ** ((shape.up ?? 0) / 12);
    if (shape.scoop) { p.cancelScheduledValues(t); p.setValueAtTime(f * 2 ** (-shape.scoop / 12), t); p.exponentialRampToValueAtTime(f, t + Math.min(0.4, Math.max(0.12, length * 0.35))); }
    if (shape.up) { const at = t + Math.max(0.13, Math.min(0.5, length * 0.4)); p.setValueAtTime(f, at); p.exponentialRampToValueAtTime(pressed, at + 0.14); }
    if (shape.fall) { const at = Math.max(t + 0.3, end - Math.min(0.5, length * 0.35)); p.setValueAtTime(pressed, at); p.exponentialRampToValueAtTime(pressed * 2 ** (-shape.fall / 12), end + 0.15); }
  }
  private voice(voice: Voice, midi: number, t: number, length: number, velocity: number, bus: AudioNode, shape?: Shape) {
    const ctx = this.ctx!, f = hz(midi), gain = ctx.createGain(), v = velocity;
    gain.connect(bus);
    switch (voice) {
      case "lute": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(3200, t); filter.frequency.exponentialRampToValueAtTime(700, t + 0.5); filter.connect(gain);
        this.osc("triangle", f, t, t + length + 0.6, filter); this.osc("sawtooth", f * 2, t, t + 0.3, filter, -4);
        this.env(gain, t, 0.12 * v, 0.005, 0, Math.min(1.2, length + 0.4)); break; }
      case "flute": case "recorder": {
        // Breathy wind lead: a sine with delayed vibrato, a touch of octave and a puff of air at the start.
        const vibrato = ctx.createOscillator(), depth = ctx.createGain(); vibrato.frequency.value = voice === "flute" ? 5.4 : 4.6; depth.gain.value = f * (voice === "flute" ? 0.007 : 0.004); vibrato.connect(depth);
        const o = this.osc(voice === "flute" ? "sine" : "triangle", f, t, t + length + 0.2, gain); depth.connect(o.frequency); vibrato.start(t + 0.18); vibrato.stop(t + length + 0.2);
        const octave = ctx.createGain(); octave.gain.value = voice === "flute" ? 0.18 : 0.1; octave.connect(gain); this.osc("sine", f * 2, t, t + length + 0.2, octave);
        this.noiseBurst(t, 0.05, f * 2, 0.012 * v, gain, "bandpass", 2);
        this.env(gain, t, (voice === "flute" ? 0.1 : 0.11) * v, 0.035, Math.max(0, length - 0.08), 0.12); break; }
      case "oboe": {
        // Reedy double-reed lead: a narrow pulse through a bright band.
        const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = Math.min(4000, f * 3); filter.Q.value = 0.9; filter.connect(gain);
        const vibrato = ctx.createOscillator(), depth = ctx.createGain(); vibrato.frequency.value = 5; depth.gain.value = f * 0.005; vibrato.connect(depth);
        const o = this.osc("square", f, t, t + length + 0.15, filter); depth.connect(o.frequency); vibrato.start(t + 0.12); vibrato.stop(t + length + 0.15);
        this.osc("sawtooth", f, t, t + length + 0.15, filter, 6);
        this.env(gain, t, 0.08 * v, 0.03, Math.max(0, length - 0.06), 0.1); break; }
      case "trumpet": {
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(900, t); filter.frequency.linearRampToValueAtTime(4200, t + 0.05); filter.frequency.exponentialRampToValueAtTime(2200, t + length); filter.connect(gain);
        this.osc("sawtooth", f, t, t + length + 0.15, filter); this.osc("square", f, t, t + length + 0.15, filter, -4);
        this.env(gain, t, 0.06 * v, 0.025, Math.max(0, length - 0.05), 0.1); break; }
      case "glock": {
        // A bright struck bar: pure tone plus a high partial that fades fast.
        this.osc("sine", f, t, t + 1.3, gain); const ping = ctx.createGain(); ping.gain.setValueAtTime(0.6, t); ping.gain.exponentialRampToValueAtTime(0.001, t + 0.25); ping.connect(gain); this.osc("sine", f * 4.2, t, t + 0.3, ping);
        this.env(gain, t, 0.07 * v, 0.002, 0, 1.1); break; }
      case "pizz": {
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(3200, t); filter.frequency.exponentialRampToValueAtTime(700, t + 0.2); filter.connect(gain);
        this.osc("sawtooth", f, t, t + 0.4, filter); this.osc("triangle", f, t, t + 0.4, filter);
        this.env(gain, t, 0.09 * v, 0.004, 0, 0.26); break; }
      case "strings": case "pad": {
        // A light, bright string section (not a dark pad): detuned saws, gentle swell, open filter.
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 3400; filter.connect(gain);
        this.osc("sawtooth", f, t, t + length + 0.5, filter, -7); this.osc("sawtooth", f, t, t + length + 0.5, filter, 7);
        this.env(gain, t, 0.022 * v, Math.min(0.35, length / 3), Math.max(0, length - 0.35), 0.4); break; }
      case "bell": { const mod = ctx.createOscillator(), depth = ctx.createGain(); mod.frequency.value = f * 3.5; depth.gain.setValueAtTime(f * 2, t); depth.gain.exponentialRampToValueAtTime(f * 0.1, t + 1.2);
        mod.connect(depth); const o = this.osc("sine", f, t, t + 2.4, gain); depth.connect(o.frequency); mod.start(t); mod.stop(t + 2.4);
        this.env(gain, t, 0.07 * v, 0.003, 0, 2.2); break; }
      case "harp": this.osc("triangle", f, t, t + 1.4, gain); this.osc("sine", f * 2, t, t + 0.6, gain); this.env(gain, t, 0.08 * v, 0.003, 0, 1.2); break;
      case "drone": {
        // Two detuned saws two octaves down, through a slow low-pass sweep: the dark floor under the tune.
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(220, t); filter.frequency.linearRampToValueAtTime(420, t + length * 0.5); filter.frequency.linearRampToValueAtTime(200, t + length); filter.Q.value = 2; filter.connect(gain);
        this.osc("sawtooth", f, t, t + length + 1.5, filter, -6); this.osc("sawtooth", f, t, t + length + 1.5, filter, 6); this.osc("sine", f / 2, t, t + length + 1.5, filter);
        this.env(gain, t, 0.05 * v, Math.min(2, length / 4), Math.max(0, length - 2), 1.5); break; }
      case "pluck": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(2400, t); filter.frequency.exponentialRampToValueAtTime(400, t + 0.25); filter.connect(gain);
        this.osc("square", f, t, t + 0.5, filter); this.env(gain, t, 0.045 * v, 0.003, 0, 0.35); break; }
      case "organ": for (const [ratio, level] of [[1, 1], [2, 0.6], [4, 0.3], [6, 0.12]] as const) { const g = ctx.createGain(); g.gain.value = level; g.connect(gain); this.osc("sine", f * ratio, t, t + length + 0.4, g); }
        this.env(gain, t, 0.06 * v, 0.04, Math.max(0, length - 0.05), 0.3); break;
      case "choir": { const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 1500; filter.Q.value = 1.1; filter.connect(gain);
        for (const detune of [-10, 0, 10]) this.osc("sawtooth", f, t, t + length + 1.2, filter, detune);
        this.env(gain, t, 0.05 * v, Math.min(0.9, length / 2), Math.max(0, length - 0.9), 1.0); break; }
      case "brass": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(500, t); filter.frequency.linearRampToValueAtTime(2200, t + 0.08); filter.frequency.exponentialRampToValueAtTime(900, t + length); filter.connect(gain);
        this.osc("sawtooth", f, t, t + length + 0.3, filter); this.osc("sawtooth", f, t, t + length + 0.3, filter, 7);
        this.env(gain, t, 0.07 * v, 0.03, Math.max(0, length - 0.05), 0.18); break; }
      case "koto": {
        // A koto string: a bright pluck that bends a hair flat as it settles, rings, and dulls.
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(5200, t); filter.frequency.exponentialRampToValueAtTime(900, t + 0.6); filter.connect(gain);
        const a = this.osc("triangle", f, t, t + 1.8, filter), b = this.osc("sawtooth", f, t, t + 0.5, filter, 3);
        a.frequency.setValueAtTime(f * 1.008, t); a.frequency.exponentialRampToValueAtTime(f, t + 0.05); b.frequency.setValueAtTime(f * 1.008, t); b.frequency.exponentialRampToValueAtTime(f, t + 0.05);
        this.osc("sine", f * 2, t, t + 0.5, filter); this.shapePitch(a, f, t, length, shape); this.shapePitch(b, f, t, length, shape);
        this.env(gain, t, 0.085 * v, 0.002, 0, Math.min(1.6, length + 0.9)); break; }
      case "shamisen": {
        // A shamisen: the plectrum's click, a nasal twang through a narrow band, and the buzz of the open string (sawari).
        const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.frequency.setValueAtTime(Math.min(5000, f * 4), t); band.frequency.exponentialRampToValueAtTime(Math.min(3000, f * 2), t + 0.3); band.Q.value = 2.2; band.connect(gain);
        const string = this.osc("sawtooth", f, t, t + 0.6, band); this.shapePitch(string, f, t, length, shape); this.osc("square", f * 1.003, t, t + 0.35, band);
        this.noiseBurst(t, 0.025, 3200, 0.05 * v, gain, "bandpass", 3);
        this.env(gain, t, 0.12 * v, 0.002, 0, Math.min(0.55, length + 0.25)); break; }
      case "shakuhachi": {
        // A shakuhachi: breath before the note, a scoop up into the pitch, a slow vibrato, and air all the way through.
        // Its yuri is slower and wider, the head nodding.
        const vibrato = ctx.createOscillator(), depth = ctx.createGain(); vibrato.frequency.value = shape?.yuri ? 3.1 : 4.2; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(f * (shape?.yuri ? 0.024 : 0.009), t + Math.min(1, length * 0.6)); vibrato.connect(depth);
        const o = this.osc("sine", f, t, t + length + 0.25, gain); o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); depth.connect(o.frequency); vibrato.start(t); vibrato.stop(t + length + 0.25);
        const breathy = ctx.createGain(); breathy.gain.value = 0.22; breathy.connect(gain); const body = this.osc("triangle", f, t, t + length + 0.25, breathy);
        this.shapePitch(o, f, t, length, shape); this.shapePitch(body, f, t, length, shape);
        this.noiseBurst(t - 0.03, 0.09, f * 2, 0.02 * v, gain, "bandpass", 1.5); this.noiseBurst(t, Math.max(0.1, length), f * 2.2, 0.006 * v, gain, "bandpass", 4);
        this.env(gain, t, 0.1 * v, 0.06, Math.max(0, length - 0.1), 0.2); break; }
      case "sho": {
        // The sho's held cluster: the root, a fourth, a fifth, the octave and the ninth, swelling in and breathing.
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 3800; filter.connect(gain);
        for (const ratio of [1, 4 / 3, 1.5, 2, 2.25]) this.osc("triangle", f * ratio, t, t + length + 0.6, filter, (Math.random() - 0.5) * 6);
        this.env(gain, t, 0.016 * v, Math.min(0.6, length / 3), Math.max(0, length - 0.6), 0.6); break; }
      case "shinobue": case "ryuteki": case "nohkan": {
        // Side-blown bamboo flutes. The shinobue is bright and piercing, the court's ryuteki breathier and lower in its colour,
        // and the noh theatre's nokan out of tune with itself on purpose (two voices a quarter-tone apart), its top a shriek.
        const nohkan = voice === "nohkan", court = voice === "ryuteki", shriek = nohkan && midi >= 86;
        const vibrato = ctx.createOscillator(), depth = ctx.createGain(); vibrato.frequency.value = court ? 4.4 : nohkan ? 5.6 : 6.2;
        depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(f * (shape?.yuri ? 0.016 : 0.006), t + Math.min(0.8, length * 0.7)); vibrato.connect(depth);
        const o = this.osc("sine", f, t, t + length + 0.15, gain); depth.connect(o.frequency); vibrato.start(t); vibrato.stop(t + length + 0.15); this.shapePitch(o, f, t, length, shape);
        const over = ctx.createGain(); over.gain.value = court ? 0.14 : 0.3; over.connect(gain); const o2 = this.osc(shriek ? "square" : "sine", f * 2, t, t + length + 0.15, over); this.shapePitch(o2, f * 2, t, length, shape);
        if (nohkan) { const off = ctx.createGain(); off.gain.value = 0.45; off.connect(gain); const o3 = this.osc("sine", f * 1.014, t, t + length + 0.15, off); this.shapePitch(o3, f * 1.014, t, length, shape); }
        this.noiseBurst(t - 0.02, 0.07, f * 2.5, (court ? 0.035 : 0.028) * v, gain, "bandpass", 1.5);
        this.noiseBurst(t, Math.max(0.1, length), f * (court ? 2 : 3), (court ? 0.016 : shriek ? 0.03 : 0.01) * v, gain, "bandpass", court ? 2 : 3);
        this.env(gain, t, (court ? 0.075 : shriek ? 0.07 : 0.082) * v, nohkan ? 0.02 : 0.035, Math.max(0, length - 0.06), 0.12); break; }
      case "hichiriki": {
        // The hichiriki: a short double reed, nasal and loud for its size, sliding up into its notes (enbai) and swaying slowly.
        const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = Math.min(3600, f * 2.6); band.Q.value = 1.3;
        const soft = ctx.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 3800; band.connect(soft).connect(gain);
        const vibrato = ctx.createOscillator(), depth = ctx.createGain(); vibrato.frequency.value = 4.4; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(f * (shape?.yuri ? 0.014 : 0.006), t + Math.min(1.2, length * 0.6)); vibrato.connect(depth);
        const reed = this.osc("sawtooth", f, t, t + length + 0.2, band), reed2 = this.osc("square", f, t, t + length + 0.2, band, 8);
        depth.connect(reed.frequency); depth.connect(reed2.frequency); vibrato.start(t); vibrato.stop(t + length + 0.2);
        const enbai = shape ?? { scoop: 1.5 }; this.shapePitch(reed, f, t, length, enbai); this.shapePitch(reed2, f, t, length, enbai);
        this.noiseBurst(t, 0.06, f * 3, 0.02 * v, gain, "bandpass", 2);
        this.env(gain, t, 0.07 * v, 0.08, Math.max(0, length - 0.12), 0.2); break; }
      case "biwa": {
        // The biwa: struck with a big plectrum (the bachi's crack), the string buzzing on its high frets (sawari), pressed up
        // and let fall, and ringing a long while in the silence after.
        const body = ctx.createBiquadFilter(); body.type = "lowpass"; body.frequency.setValueAtTime(3400, t); body.frequency.exponentialRampToValueAtTime(700, t + 0.5); body.connect(gain);
        const buzz = ctx.createBiquadFilter(); buzz.type = "highpass"; buzz.frequency.value = 1400; const buzzGain = ctx.createGain(); buzzGain.gain.setValueAtTime(0.5, t); buzzGain.gain.exponentialRampToValueAtTime(0.02, t + 1.6); buzz.connect(buzzGain).connect(gain);
        const string = this.osc("sawtooth", f, t, t + 2.4, body), second = this.osc("square", f, t, t + 1.2, body, 5), sawari = this.osc("sawtooth", f, t, t + 2, buzz, 14);
        for (const o of [string, second, sawari]) this.shapePitch(o, f, t, length, shape);
        this.noiseBurst(t, 0.03, 2600, 0.12 * v, gain, "bandpass", 1.8); this.thump(t, 300, 180, 0.05, 0.05 * v, gain);
        this.env(gain, t, 0.11 * v, 0.002, 0, Math.min(2.2, length + 1.2)); break; }
      case "kane": { const mod = ctx.createOscillator(), depth = ctx.createGain(); mod.frequency.value = f * 2.76; depth.gain.setValueAtTime(f * 1.6, t); depth.gain.exponentialRampToValueAtTime(f * 0.05, t + 2.5);
        mod.connect(depth); const o = this.osc("sine", f, t, t + 4, gain); depth.connect(o.frequency); mod.start(t); mod.stop(t + 4); this.osc("sine", f * 0.5, t, t + 4, gain);
        this.env(gain, t, 0.06 * v, 0.004, 0, 3.6); break; }
      case "bass": {
        // A plucked bass (acoustic, MIDI-style) in the third octave: no sub-octave rumble.
        const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(1600, t); filter.frequency.exponentialRampToValueAtTime(500, t + 0.3); filter.connect(gain);
        this.osc("triangle", f, t, t + length + 0.2, filter); this.osc("sawtooth", f, t, t + 0.25, filter, 3);
        this.env(gain, t, 0.13 * v, 0.006, Math.max(0, length * 0.4), 0.25); break; }
    }
  }
  private noiseBurst(t: number, length: number, frequency: number, level: number, bus: AudioNode, type: BiquadFilterType = "highpass", q = 0.7) {
    const ctx = this.ctx!, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noise; source.playbackRate.value = 0.8 + Math.random() * 0.4; filter.type = type; filter.frequency.value = frequency; filter.Q.value = q;
    source.connect(filter).connect(gain).connect(bus);
    this.env(gain, t, level, 0.002, 0, length); source.start(t, Math.random() * 0.5); source.stop(t + length + 0.05);
  }
  private thump(t: number, from: number, to: number, length: number, level: number, bus: AudioNode) {
    const ctx = this.ctx!, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(to, t + length); osc.connect(gain).connect(bus);
    this.env(gain, t, level, 0.002, 0, length); osc.start(t); osc.stop(t + length + 0.05);
  }
  private drum(drum: Drum, t: number, v: number, bus: AudioNode) {
    switch (drum) {
      case "kick": this.thump(t, 110, 55, 0.18, 0.3 * v, bus); break;
      case "deep": this.thump(t, 70, 36, 0.42, 0.34 * v, bus); this.noiseBurst(t, 0.04, 200, 0.03 * v, bus, "lowpass"); break;
      case "ride": this.noiseBurst(t, 0.3, 6000, 0.035 * v, bus, "bandpass", 2.5); break;
      case "timpani": this.thump(t, 150, 105, 0.5, 0.32 * v, bus); this.noiseBurst(t, 0.05, 300, 0.05 * v, bus, "lowpass"); break;
      case "tambourine": this.noiseBurst(t, 0.07, 7500, 0.07 * v, bus); for (const ratio of [1, 1.41]) { const g = this.ctx!.createGain(); g.connect(bus); this.osc("square", 5200 * ratio, t, t + 0.08, g); this.env(g, t, 0.004 * v, 0.001, 0, 0.07); } break;
      case "snare": this.noiseBurst(t, 0.16, 1800, 0.16 * v, bus); this.thump(t, 220, 160, 0.08, 0.12 * v, bus); break;
      case "hat": this.noiseBurst(t, 0.04, 7000, 0.07 * v, bus); break;
      case "shaker": this.noiseBurst(t, 0.06, 5200, 0.05 * v, bus, "bandpass", 1.2); break;
      case "rim": this.thump(t, 900, 700, 0.03, 0.12 * v, bus); break;
      case "tom": this.thump(t, 180, 90, 0.25, 0.3 * v, bus); break;
      case "hand": this.thump(t, 320, 180, 0.12, 0.26 * v, bus); this.noiseBurst(t, 0.03, 2400, 0.05 * v, bus); break;
      case "taiko": this.thump(t, 96, 44, 0.65, 0.42 * v, bus); this.noiseBurst(t, 0.12, 160, 0.06 * v, bus, "lowpass"); this.thump(t, 180, 90, 0.06, 0.08 * v, bus); break;
      case "shime": this.thump(t, 460, 330, 0.07, 0.18 * v, bus); this.noiseBurst(t, 0.03, 2600, 0.05 * v, bus, "bandpass", 2); break;
      case "clapper": this.thump(t, 1700, 1500, 0.025, 0.16 * v, bus); this.thump(t + 0.012, 1450, 1300, 0.02, 0.1 * v, bus); break;
      // The Isles' drums.
      case "odaiko": this.thump(t, 70, 34, 1.1, 0.55 * v, bus); this.noiseBurst(t, 0.25, 120, 0.08 * v, bus, "lowpass"); this.thump(t, 150, 75, 0.08, 0.1 * v, bus); break;
      case "kara": this.thump(t, 1150, 950, 0.03, 0.14 * v, bus); this.noiseBurst(t, 0.02, 3600, 0.06 * v, bus, "bandpass", 3); break;
      case "kakko": this.thump(t, 430, 330, 0.05, 0.16 * v, bus); this.noiseBurst(t, 0.035, 2900, 0.07 * v, bus, "bandpass", 2); break;
      case "shoko": case "atarigane": {
        // Small bronze gongs struck with horn-tipped sticks: the court's shoko lower and longer, the festival's atarigane bright and short.
        const ctx = this.ctx!, gain = ctx.createGain(), high = drum === "atarigane", base = high ? 2100 : 1250; gain.connect(bus);
        for (const ratio of high ? [1, 2.42, 3.9] : [1, 2.7, 4.1]) this.osc("square", base * ratio * (0.99 + Math.random() * 0.02), t, t + (high ? 0.25 : 0.5), gain);
        this.noiseBurst(t, 0.015, high ? 6000 : 4000, 0.05 * v, bus, "bandpass", 2);
        this.env(gain, t, (high ? 0.014 : 0.016) * v, 0.001, 0, high ? 0.2 : 0.42); break; }
      case "tsuzumi": {
        // The kotsuzumi's "pon": a hollow, ringing note that sags as the player's hand loosens the cords.
        this.thump(t, 340, 250, 0.42, 0.3 * v, bus); this.thump(t, 680, 520, 0.14, 0.06 * v, bus); this.noiseBurst(t, 0.02, 1800, 0.04 * v, bus, "bandpass", 2); break; }
      case "otsuzumi": this.noiseBurst(t, 0.05, 3000, 0.22 * v, bus, "highpass"); this.thump(t, 1300, 1000, 0.04, 0.2 * v, bus); break;
      case "yo": case "ha": {
        // The drummers' calls (kakegoe): a long "yo-o" before a stroke, a short "ha" or "ho" with one. A voice through two formants.
        const ctx = this.ctx!, long = drum === "yo", gain = ctx.createGain(), length = long ? 0.5 : 0.18; gain.connect(bus);
        for (const [centre, q] of (long ? [[620, 2.2], [1050, 3]] : [[880, 2], [1450, 3]]) as [number, number][]) {
          const formant = ctx.createBiquadFilter(); formant.type = "bandpass"; formant.frequency.value = centre; formant.Q.value = q; formant.connect(gain);
          const throat = this.osc("sawtooth", long ? 290 : 340, t, t + length + 0.1, formant); throat.frequency.setValueAtTime(long ? 290 : 340, t); throat.frequency.exponentialRampToValueAtTime(long ? 185 : 250, t + length);
        }
        this.noiseBurst(t, long ? 0.12 : 0.06, long ? 900 : 1300, 0.05 * v, bus, "bandpass", 1.5);
        this.env(gain, t, 0.09 * v, long ? 0.05 : 0.015, long ? 0.22 : 0.05, long ? 0.25 : 0.1); break; }
      case "wave": case "wind": {
        // A long breath of the sea or the cedars: looped noise, swelling and falling away, the wind's colour drifting.
        const ctx = this.ctx!, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), sea = drum === "wave", length = sea ? 4.5 : 6;
        source.buffer = this.noise; source.loop = true; filter.type = sea ? "lowpass" : "bandpass"; filter.Q.value = sea ? 0.7 : 0.9;
        filter.frequency.setValueAtTime(sea ? 420 : 700, t); filter.frequency.linearRampToValueAtTime(sea ? 900 : 1500, t + length * 0.45); filter.frequency.linearRampToValueAtTime(sea ? 380 : 800, t + length);
        source.connect(filter).connect(gain).connect(bus);
        gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime((sea ? 0.05 : 0.03) * v, t + length * 0.4); gain.gain.linearRampToValueAtTime(0.0001, t + length);
        source.start(t, Math.random() * 0.5); source.stop(t + length + 0.05); break; }
      case "clank": { const ctx = this.ctx!, gain = ctx.createGain(); gain.connect(bus); for (const ratio of [1, 2.76, 5.4]) this.osc("square", 880 * ratio * (0.97 + Math.random() * 0.06), t, t + 0.4, gain);
        this.env(gain, t, 0.03 * v, 0.001, 0, 0.35); break; }
    }
  }

  // ---------- Rain: a continuous bed of soft noise that swells and fades with the weather (no rhythm) ----------
  private rainGain: GainNode | null = null;
  setRain(level: number) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    if (!this.rainGain) {
      // Four seconds of its own noise, so the loop never pulses audibly.
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
      const band = ctx.createBiquadFilter(); band.type = "bandpass"; band.frequency.value = 2200; band.Q.value = 0.4;
      const soft = ctx.createBiquadFilter(); soft.type = "lowpass"; soft.frequency.value = 5200;
      this.rainGain = ctx.createGain(); this.rainGain.gain.value = 0;
      source.connect(band).connect(soft).connect(this.rainGain).connect(this.sfxBus); source.start();
    }
    const target = this.sfxOn && !this.muted ? Math.max(0, Math.min(1, level)) * 0.05 : 0;
    this.rainGain.gain.setTargetAtTime(target, ctx.currentTime, 1.2);
  }

  // ---------- Sound effects ----------
  /** A sound effect; `gain` scales it (for distance). */
  sfx(name: SfxName, gain = 1) {
    // Automated runs keep a log of every sound asked for (to track down noises).
    if (typeof navigator !== "undefined" && navigator.webdriver) { const log = ((globalThis as unknown as { __sfxLog?: string[] }).__sfxLog ??= []); log.push(name); if (log.length > 500) log.shift(); }
    if (!this.ctx || this.ctx.state !== "running" || !this.sfxOn || this.muted || gain <= 0.01) return;
    const now = this.ctx.currentTime, last = this.lastSfx.get(name) ?? 0;
    if (now - last < 0.05) return;
    this.lastSfx.set(name, now);
    const t = now + 0.005, bus = this.scaled(gain);
    const tone = (type: OscillatorType, midi: number, at: number, length: number, level: number) => { const gain = this.ctx!.createGain(); gain.connect(bus); this.osc(type, hz(midi), at, at + length + 0.05, gain); this.env(gain, at, level, 0.004, 0, length); };
    switch (name) {
      case "chop": this.thump(t, 260, 120, 0.09, 0.4, bus); this.noiseBurst(t, 0.07, 900, 0.18, bus, "bandpass", 2); break;
      case "mine": for (const ratio of [1, 2.3]) tone("triangle", 88 + ratio * 4, t, 0.18, 0.12); this.noiseBurst(t, 0.05, 3000, 0.15, bus); break;
      case "splash": this.noiseBurst(t, 0.3, 700, 0.14, bus, "lowpass"); break;
      case "catch": tone("sine", 72, t, 0.1, 0.18); tone("sine", 79, t + 0.08, 0.14, 0.18); break;
      case "fire": for (let i = 0; i < 5; i++) this.noiseBurst(t + i * 0.05 + Math.random() * 0.03, 0.03, 2600, 0.12, bus); break;
      case "sizzle": this.noiseBurst(t, 0.5, 4500, 0.08, bus); break;
      case "burn": this.noiseBurst(t, 0.35, 400, 0.18, bus, "lowpass"); tone("sawtooth", 40, t, 0.3, 0.06); break;
      case "smelt": this.noiseBurst(t, 0.6, 500, 0.16, bus, "bandpass", 0.6); break;
      case "anvil": this.drum("clank", t, 1.2, bus); break;
      case "hit": this.thump(t, 180, 70, 0.12, 0.45, bus); this.noiseBurst(t, 0.05, 1200, 0.12, bus); break;
      case "miss": this.noiseBurst(t, 0.12, 2500, 0.08, bus, "bandpass", 3); break;
      case "hurt": this.thump(t, 150, 60, 0.18, 0.4, bus); tone("square", 50, t, 0.1, 0.05); break;
      case "eat": for (let i = 0; i < 3; i++) this.noiseBurst(t + i * 0.09, 0.05, 1600, 0.14, bus, "bandpass", 2); break;
      case "bury": this.noiseBurst(t, 0.2, 500, 0.2, bus, "lowpass"); this.noiseBurst(t + 0.2, 0.2, 500, 0.15, bus, "lowpass"); break;
      case "coins": for (let i = 0; i < 3; i++) tone("triangle", 96 + i * 3, t + i * 0.05, 0.12, 0.07); break;
      case "pickup": tone("triangle", 76, t, 0.06, 0.12); tone("triangle", 83, t + 0.05, 0.08, 0.1); break;
      case "drop": tone("triangle", 67, t, 0.08, 0.12); tone("triangle", 60, t + 0.05, 0.1, 0.1); break;
      case "equip": this.noiseBurst(t, 0.08, 2000, 0.1, bus, "bandpass", 1.5); tone("triangle", 64, t, 0.08, 0.08); break;
      case "door": this.thump(t, 90, 60, 0.2, 0.3, bus); this.noiseBurst(t, 0.3, 300, 0.1, bus, "lowpass"); break;
      case "click": tone("square", 84, t, 0.02, 0.04); break;
      case "spell": for (let i = 0; i < 5; i++) tone("sine", 84 + i * 2, t + i * 0.03, 0.12, 0.06); this.noiseBurst(t, 0.3, 3000, 0.06, bus); break;
      case "teleport": for (let i = 0; i < 8; i++) tone("sine", 60 + i * 3, t + i * 0.07, 0.2, 0.07); break;
      case "stun": tone("square", 55, t, 0.08, 0.1); for (let i = 0; i < 3; i++) tone("sine", 96 - i, t + 0.1 + i * 0.08, 0.06, 0.06); break;
      case "jump": this.noiseBurst(t, 0.15, 1400, 0.1, bus, "bandpass", 1); break;
      case "kill": tone("triangle", 60, t, 0.12, 0.12); tone("triangle", 55, t + 0.1, 0.25, 0.12); break;
      case "pray": for (const midi of [72, 76, 79]) tone("sine", midi, t, 0.6, 0.05); break;
      case "death": for (let i = 0; i < 5; i++) tone("triangle", 67 - i * 3, t + i * 0.18, 0.3, 0.12); break;
      case "fell": this.thump(t, 140, 50, 0.5, 0.45, bus); this.noiseBurst(t + 0.05, 0.6, 600, 0.18, bus, "lowpass"); for (let i = 0; i < 4; i++) this.noiseBurst(t + 0.2 + i * 0.07, 0.06, 2200, 0.08, bus, "bandpass", 2); break;
      case "slash": this.sweep(t, 3200, 900, 0.16, 0.2, bus); break;
      case "rain": for (let i = 0; i < 3; i++) this.noiseBurst(t + i * 0.28, 0.5, 2600 + Math.random() * 1200, 0.05, bus, "bandpass", 0.6); break;
      case "thunder": {
        // A crack, then a long low roll that rumbles away.
        this.noiseBurst(t, 0.25, 1800, 0.35, bus, "lowpass", 0.8); this.thump(t, 90, 40, 0.8, 0.5, bus);
        for (let i = 0; i < 6; i++) this.noiseBurst(t + 0.15 + i * 0.35 + Math.random() * 0.15, 0.9, 140 + Math.random() * 120, 0.45 - i * 0.06, bus, "lowpass", 0.9);
        break;
      }
      case "pop": {
        // A firework: a low boom, then a shower of crackles.
        this.thump(t, 200, 55, 0.35, 0.3, bus); this.noiseBurst(t, 0.22, 1500, 0.2, bus, "lowpass");
        for (let i = 0; i < 9; i++) this.noiseBurst(t + 0.12 + i * 0.045 + Math.random() * 0.04, 0.02, 5200 + Math.random() * 2000, 0.06, bus);
        break;
      }
      case "hoof": this.thump(t, 520, 260, 0.05, 0.22, bus); this.noiseBurst(t, 0.025, 2400, 0.07, bus, "bandpass", 2.5); this.thump(t + 0.11, 460, 240, 0.05, 0.18, bus); break;
      case "whinny": {
        // A horse's call: a bright buzzy voice that leaps up and shakes its way down.
        const ctx = this.ctx!, osc = ctx.createOscillator(), lfo = ctx.createOscillator(), depth = ctx.createGain(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        osc.type = "sawtooth"; osc.frequency.setValueAtTime(620, t); osc.frequency.linearRampToValueAtTime(1150, t + 0.14); osc.frequency.exponentialRampToValueAtTime(480, t + 1.0);
        lfo.frequency.value = 24; depth.gain.setValueAtTime(20, t); depth.gain.linearRampToValueAtTime(90, t + 0.9); lfo.connect(depth).connect(osc.frequency);
        filter.type = "bandpass"; filter.frequency.value = 1500; filter.Q.value = 1.6; osc.connect(filter).connect(gain).connect(bus);
        gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.16, t + 0.05); gain.gain.setValueAtTime(0.14, t + 0.6); gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
        osc.start(t); lfo.start(t); osc.stop(t + 1.1); lfo.stop(t + 1.1);
        this.noiseBurst(t + 0.95, 0.25, 700, 0.08, bus, "lowpass");
        break;
      }
      case "rare": for (const [i, midi] of [84, 88, 91, 96, 100].entries()) tone("triangle", midi, t + i * 0.07, 0.35, 0.07); tone("sine", 108, t + 0.36, 0.5, 0.04); break;
      case "duel": tone("square", 60, t, 0.12, 0.06); tone("square", 67, t + 0.12, 0.12, 0.06); tone("square", 72, t + 0.24, 0.3, 0.07); this.drum("clank", t + 0.24, 0.8, bus); break;
      case "bow": tone("triangle", 45, t, 0.18, 0.18); this.thump(t, 520, 180, 0.12, 0.2, bus); this.sweep(t + 0.02, 4200, 2600, 0.12, 0.08, bus); break;
      case "stab": this.sweep(t, 2400, 1600, 0.08, 0.2, bus); this.thump(t + 0.06, 300, 180, 0.05, 0.12, bus); break;
      case "crush": this.sweep(t, 900, 300, 0.18, 0.22, bus); break;
      case "punch": this.thump(t, 200, 90, 0.08, 0.35, bus); this.noiseBurst(t, 0.04, 900, 0.12, bus, "lowpass"); break;
      case "step_grass": this.noiseBurst(t, 0.07, 1800, 0.045, bus, "bandpass", 0.8); break;
      case "step_stone": this.thump(t, 380 + Math.random() * 60, 220, 0.04, 0.09, bus); this.noiseBurst(t, 0.02, 3000, 0.03, bus); break;
      case "step_wood": this.thump(t, 190 + Math.random() * 30, 120, 0.07, 0.14, bus); break;
      case "step_sand": this.noiseBurst(t, 0.09, 3800, 0.04, bus, "highpass"); break;
      case "step_snow": this.noiseBurst(t, 0.1, 2400, 0.06, bus, "bandpass", 1.6); this.noiseBurst(t + 0.03, 0.05, 4200, 0.03, bus); break;
      case "step_swamp": this.noiseBurst(t, 0.12, 500, 0.08, bus, "lowpass"); this.thump(t, 140, 90, 0.08, 0.05, bus); break;
      case "crackle": for (let i = 0; i < 3; i++) this.noiseBurst(t + Math.random() * 0.25, 0.015 + Math.random() * 0.02, 1800 + Math.random() * 3000, 0.1, bus, "bandpass", 3); this.noiseBurst(t, 0.3, 400, 0.03, bus, "lowpass"); break;
      case "forge": this.noiseBurst(t, 0.9, 260, 0.08, bus, "lowpass"); break;
      case "water": this.noiseBurst(t, 1.1, 700, 0.05, bus, "lowpass"); this.noiseBurst(t + 0.4, 0.8, 1200, 0.025, bus, "bandpass", 0.8); break;
      case "bird": { const base = 84 + Math.floor(Math.random() * 6); for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) this.chirp(t + i * 0.09, hz(base + (i % 2 ? 3 : 0)), hz(base + 7), 0.06, 0.05, bus); break; }
      case "gull": this.chirp(t, hz(86), hz(78), 0.3, 0.06, bus); this.chirp(t + 0.35, hz(86), hz(80), 0.22, 0.05, bus); break;
      case "frog": for (let i = 0; i < 2; i++) { const gain = this.ctx!.createGain(); gain.connect(bus); const o = this.osc("square", 110, t + i * 0.18, t + i * 0.18 + 0.12, gain); o.frequency.setValueAtTime(140, t + i * 0.18); o.frequency.exponentialRampToValueAtTime(90, t + i * 0.18 + 0.1); this.env(gain, t + i * 0.18, 0.05, 0.005, 0.03, 0.08); } break;
      case "wind": this.noiseBurst(t, 2.2, 700, 0.07, bus, "bandpass", 0.5); break;
      case "drip": this.chirp(t, hz(96), hz(90), 0.06, 0.08, bus); this.chirp(t + 0.12, hz(88), hz(84), 0.05, 0.03, bus); break;
      case "level": this.fanfare(t, [72, 76, 79, 84], [0, 0.12, 0.24, 0.42], 0.5); break;
      case "quest": this.fanfare(t, [67, 72, 76, 79, 76, 79, 84], [0, 0.15, 0.3, 0.45, 0.75, 0.9, 1.1], 0.9); break;
    }
  }
  private scaled(gain: number): AudioNode {
    if (gain >= 0.999) return this.sfxBus;
    const node = this.ctx!.createGain(); node.gain.value = gain; node.connect(this.sfxBus);
    setTimeout(() => node.disconnect(), 4000);
    return node;
  }
  /** A filtered noise sweep: whooshes and swings. */
  private sweep(t: number, from: number, to: number, length: number, level: number, bus: AudioNode) {
    const ctx = this.ctx!, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = this.noise; filter.type = "bandpass"; filter.Q.value = 1.5; filter.frequency.setValueAtTime(from, t); filter.frequency.exponentialRampToValueAtTime(to, t + length);
    source.connect(filter).connect(gain).connect(bus); this.env(gain, t, level, 0.01, length * 0.3, length * 0.7); source.start(t, Math.random() * 0.5); source.stop(t + length + 0.05);
  }
  private chirp(t: number, from: number, to: number, length: number, level: number, bus: AudioNode) {
    const ctx = this.ctx!, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(to, t + length); osc.connect(gain).connect(bus);
    this.env(gain, t, level, 0.005, length * 0.4, length * 0.6); osc.start(t); osc.stop(t + length + 0.05);
  }
  /** Monster voices: every creature sounds like itself when it attacks, is hurt, dies, spots you or idles nearby. */
  creature(id: string, action: "attack" | "hurt" | "death" | "aggro" | "idle", gain = 1) {
    if (!this.ctx || this.ctx.state !== "running" || !this.sfxOn || this.muted || gain <= 0.01) return;
    const now = this.ctx.currentTime, key = `creature:${id}:${action}`, last = this.lastSfx.get(key) ?? 0;
    if (now - last < 0.12) return;
    this.lastSfx.set(key, now);
    const voice = VOICES[id] ?? VOICES.grumblin, t = now + 0.005, bus = this.scaled(gain * (action === "hurt" ? 0.55 : 1));
    const pitch = action === "death" ? 0.75 : action === "hurt" ? 1.15 : action === "aggro" ? 1.05 : 1, length = voice.length * (action === "death" ? 1.6 : action === "hurt" ? 0.6 : 1);
    const body = (type: OscillatorType, f0: number, f1: number, level: number, at = t, len = length) => {
      const gainNode = this.ctx!.createGain(), filter = this.ctx!.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = voice.bright; filter.connect(gainNode); gainNode.connect(bus);
      const osc = this.osc(type, f0 * pitch, at, at + len + 0.05, filter); osc.frequency.setValueAtTime(f0 * pitch, at); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * pitch), at + len);
      if (voice.wobble) { const lfo = this.ctx!.createOscillator(), depth = this.ctx!.createGain(); lfo.frequency.value = voice.wobble; depth.gain.value = f0 * 0.06; lfo.connect(depth).connect(osc.frequency); lfo.start(at); lfo.stop(at + len + 0.05); }
      this.env(gainNode, at, level, 0.01, len * 0.5, len * 0.5);
    };
    switch (voice.kind) {
      case "cluck": for (let i = 0; i < (action === "idle" ? 3 : 2); i++) body("triangle", voice.f0 * 1.1, voice.f0 * 0.8, 0.12, t + i * 0.11, 0.07); break;
      case "moo": body("sawtooth", voice.f0, voice.f0 * 0.85, 0.12); break;
      case "squeak": body("sine", voice.f0 * 1.3, voice.f0, 0.08, t, 0.08); if (action !== "hurt") body("sine", voice.f0 * 1.4, voice.f0 * 1.1, 0.06, t + 0.1, 0.06); break;
      case "grumble": body("square", voice.f0, voice.f0 * 0.7, 0.07); this.noiseBurst(t, length, 500, 0.04, bus, "lowpass"); break;
      case "growl": body("sawtooth", voice.f0, voice.f0 * (action === "aggro" ? 1.6 : 0.8), 0.1); this.noiseBurst(t, length, 700, 0.06, bus, "bandpass", 1); break;
      case "rattle": for (let i = 0; i < 6; i++) this.thump(t + i * 0.035, 1400 + Math.random() * 600, 900, 0.02, 0.1, bus); break;
      case "gurgle": for (let i = 0; i < 4; i++) this.chirp(t + i * 0.07, voice.f0 * (1 + Math.random() * 0.4), voice.f0 * 0.6, 0.06, 0.07, bus); this.noiseBurst(t, length, 400, 0.05, bus, "lowpass"); break;
      case "whisper": this.noiseBurst(t, length * 1.2, 1600, 0.07, bus, "bandpass", 4); this.noiseBurst(t + 0.1, length, 2600, 0.04, bus, "bandpass", 6); break;
      case "clank": this.drum("clank", t, 1, bus); body("square", voice.f0, voice.f0 * 0.9, 0.05); break;
      case "rumble": body("sawtooth", voice.f0, voice.f0 * 0.6, 0.14); this.thump(t, 70, 35, length, 0.4, bus); break;
      case "roar": body("sawtooth", voice.f0, voice.f0 * 0.7, 0.14); body("square", voice.f0 * 1.5, voice.f0, 0.05); this.noiseBurst(t, length, 900, 0.1, bus, "bandpass", 0.8); break;
      case "king": body("sawtooth", voice.f0, voice.f0 * 0.5, 0.14, t, length * 1.3); this.voice("choir", 40, t, length * 1.4, 1.6, bus); this.thump(t, 60, 30, 0.8, 0.5, bus); break;
    }
  }
  /** Talking: a few soft blips pitched to the speaker (like old handheld RPGs). */
  speak(seed: number, words: number) {
    if (!this.ctx || this.ctx.state !== "running" || !this.sfxOn || this.muted) return;
    const t = this.ctx.currentTime + 0.01, base = 62 + (seed % 14), bus = this.scaled(0.8);
    for (let i = 0; i < Math.min(8, Math.max(2, words)); i++) {
      const gain = this.ctx.createGain(); gain.connect(bus);
      this.osc("triangle", hz(base + [0, 2, 4, 2, 5, 0, 3, 7][(i + seed) % 8]), t + i * 0.075, t + i * 0.075 + 0.07, gain);
      this.env(gain, t + i * 0.075, 0.05, 0.004, 0.02, 0.04);
    }
  }
  /** Old-school jingle: a short brassy fanfare with a harp roll. */
  private fanfare(t: number, notes: readonly number[], times: readonly number[], hold: number) {
    const bus = this.sfxBus;
    notes.forEach((midi, index) => {
      const at = t + times[index], length = index === notes.length - 1 ? hold : 0.18;
      this.voice("brass", midi, at, length, 1.2, bus); this.voice("harp", midi + 12, at, length, 1, bus);
    });
    this.voice("pad", notes[0] - 12, t, times[times.length - 1] + hold, 1.2, bus);
  }
}
const noteCache = new WeakMap<Track, Note[]>(), hitCache = new WeakMap<Track, Hit[]>();
function sortedNotes(track: Track) { let notes = noteCache.get(track); if (!notes) noteCache.set(track, notes = [...track.notes].sort((a, b) => a.beat - b.beat)); return notes; }
function sortedHits(track: Track) { let hits = hitCache.get(track); if (!hits) hitCache.set(track, hits = [...track.hits].sort((a, b) => a.beat - b.beat)); return hits; }
