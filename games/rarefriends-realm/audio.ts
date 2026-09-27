/**
 * The Realm's soundtrack and sound effects, synthesized with WebAudio (no recordings or samples).
 * A hand-written main theme, one track for every area, dungeon and boss themes, and old-school style jingles.
 * Nothing plays until the player's first tap, click or key press.
 */
import type { SoundName } from "./state.ts";
import type { RegionId } from "./world.ts";

export type TrackId = RegionId | "theme" | "boss";
type Voice = "lute" | "flute" | "bell" | "harp" | "organ" | "pad" | "bass" | "brass" | "pluck" | "choir";
type Drum = "kick" | "snare" | "hat" | "shaker" | "tom" | "clank" | "hand" | "rim";
type Note = { beat: number; voice: Voice; midi: number; length: number; velocity: number };
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
function chordBed(chords: readonly (readonly number[])[], beatsPer: number, options: { pad?: Voice; arp?: Voice; bass?: boolean; arpPattern?: readonly number[] }) {
  const notes: Note[] = [];
  chords.forEach((chord, bar) => {
    const start = bar * beatsPer;
    if (options.pad) for (const midi of chord.slice(1)) notes.push({ beat: start, voice: options.pad, midi: midi + 48, length: beatsPer, velocity: 0.5 });
    if (options.bass !== false) {
      notes.push({ beat: start, voice: "bass", midi: chord[0] + 36, length: beatsPer / 2 - 0.1, velocity: 0.9 });
      notes.push({ beat: start + beatsPer / 2, voice: "bass", midi: chord[0] + 36 + (bar % 2 ? 7 : 0), length: beatsPer / 2 - 0.1, velocity: 0.75 });
    }
    if (options.arp) {
      const pattern = options.arpPattern ?? [0, 1, 2, 1, 3, 2, 1, 2], tones = [...chord.slice(1), chord[1] + 12].map(midi => midi + 60);
      for (let step = 0; step < beatsPer * 2; step++) notes.push({ beat: start + step / 2, voice: options.arp, midi: tones[pattern[step % pattern.length] % tones.length], length: 0.45, velocity: 0.45 + (step % 4 === 0 ? 0.15 : 0) });
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
    C6:0.5 B5:0.5 A5:1 E5:1 A5:1   F5:0.5 G5:0.5 A5:1 C6:1 A5:1   G5:1.5 A5:0.5 B5:1 D6:1   C6:4`, "flute");
  const harmony = chords(0, "I", "V", "vi", "IV", "I", "V", "IV", "V", "vi", "IV", "I", "V", "vi", "IV", "V", "I");
  const bed = chordBed(harmony, 4, { pad: "pad", arp: "harp", arpPattern: [0, 2, 1, 2, 3, 2, 1, 2] });
  const counter = melody.filter((_, index) => index % 3 === 0).map(note => ({ ...note, voice: "lute" as Voice, midi: note.midi - 12, velocity: 0.35, beat: note.beat + 0.5 }));
  const hits: Hit[] = [];
  for (let bar = 0; bar < 16; bar++) {
    hits.push({ beat: bar * 4, drum: "kick", velocity: 0.8 }, { beat: bar * 4 + 2, drum: "kick", velocity: 0.55 }, { beat: bar * 4 + 1, drum: "snare", velocity: 0.35 }, { beat: bar * 4 + 3, drum: "snare", velocity: 0.4 });
    for (let e = 0; e < 8; e++) hits.push({ beat: bar * 4 + e / 2, drum: "shaker", velocity: e % 2 ? 0.2 : 0.3 });
  }
  return { id: "theme", name: "RareFriends Realm", bpm: 92, beats: 64, notes: [...melody, ...counter, ...bed], hits };
}

// ---------- Area tracks (composed from a motif per area) ----------
type Style = {
  id: TrackId; name: string; bpm: number; root: number; mode: keyof typeof MODES; progression: readonly number[]; beatsPer: 3 | 4;
  lead: Voice; arp?: Voice; pad?: Voice; drums: "none" | "soft" | "march" | "forge" | "hand" | "drive" | "heartbeat"; density: number; octave: number; seed: number;
};
const STYLES: readonly Style[] = [
  { id: "friendhollow", name: "Hollow Square", bpm: 96, root: 7, mode: "major", progression: [0, 3, 4, 0, 5, 3, 1, 4], beatsPer: 4, lead: "lute", arp: "harp", pad: "pad", drums: "soft", density: 0.7, octave: 5, seed: 11 },
  { id: "farmland", name: "Hayfields", bpm: 112, root: 2, mode: "mixolydian", progression: [0, 6, 3, 0, 0, 6, 4, 0], beatsPer: 3, lead: "flute", arp: "pluck", drums: "soft", density: 0.8, octave: 5, seed: 23 },
  { id: "whisperwood", name: "Whisperwood", bpm: 80, root: 9, mode: "dorian", progression: [0, 3, 0, 6, 2, 3, 4, 0], beatsPer: 4, lead: "flute", arp: "harp", pad: "pad", drums: "none", density: 0.5, octave: 5, seed: 31 },
  { id: "ashen_hills", name: "Ashen Echoes", bpm: 74, root: 4, mode: "aeolian", progression: [0, 5, 6, 0, 3, 5, 4, 4], beatsPer: 4, lead: "organ", arp: "pluck", pad: "pad", drums: "heartbeat", density: 0.45, octave: 4, seed: 41 },
  { id: "emberforge", name: "Anvil Song", bpm: 108, root: 5, mode: "harmonic", progression: [0, 0, 5, 4, 0, 3, 4, 0], beatsPer: 4, lead: "brass", arp: "pluck", drums: "forge", density: 0.65, octave: 4, seed: 53 },
  { id: "frostpeak", name: "Frostpeak", bpm: 68, root: 11, mode: "lydian", progression: [0, 1, 0, 4, 5, 1, 4, 0], beatsPer: 4, lead: "bell", arp: "bell", pad: "choir", drums: "none", density: 0.45, octave: 5, seed: 61 },
  { id: "glass_lake", name: "Glass Lake", bpm: 84, root: 0, mode: "major", progression: [0, 5, 3, 4, 0, 5, 1, 4], beatsPer: 3, lead: "flute", arp: "harp", pad: "pad", drums: "none", density: 0.55, octave: 5, seed: 71 },
  { id: "pale_dunes", name: "Pale Dunes", bpm: 94, root: 2, mode: "hijaz", progression: [0, 1, 0, 6, 0, 1, 6, 0], beatsPer: 4, lead: "flute", arp: "pluck", pad: "pad", drums: "hand", density: 0.7, octave: 5, seed: 83 },
  { id: "oasis", name: "Oasis Market", bpm: 116, root: 4, mode: "hijaz", progression: [0, 3, 1, 0, 0, 3, 6, 0], beatsPer: 4, lead: "lute", arp: "pluck", drums: "hand", density: 0.85, octave: 5, seed: 89 },
  { id: "murkmire", name: "Murkmire", bpm: 66, root: 1, mode: "locrian", progression: [0, 1, 0, 4, 0, 1, 3, 0], beatsPer: 3, lead: "organ", arp: "pluck", pad: "choir", drums: "heartbeat", density: 0.4, octave: 4, seed: 97 },
  { id: "mossy_ruins", name: "Old Stones", bpm: 72, root: 7, mode: "dorian", progression: [0, 6, 3, 4, 0, 6, 2, 4], beatsPer: 4, lead: "harp", arp: "harp", pad: "choir", drums: "soft", density: 0.5, octave: 5, seed: 103 },
  { id: "coast", name: "The Pale Coast", bpm: 86, root: 5, mode: "major", progression: [0, 4, 5, 3, 0, 4, 3, 0], beatsPer: 3, lead: "flute", arp: "harp", pad: "pad", drums: "none", density: 0.5, octave: 5, seed: 107 },
  { id: "crypt", name: "Crypt of Friends", bpm: 60, root: 3, mode: "harmonic", progression: [0, 5, 3, 4, 0, 5, 1, 4], beatsPer: 4, lead: "organ", pad: "choir", drums: "heartbeat", density: 0.4, octave: 4, seed: 113 },
  { id: "hollow_depths", name: "Hollow Depths", bpm: 58, root: 6, mode: "phrygian", progression: [0, 1, 0, 6, 0, 1, 5, 4], beatsPer: 4, lead: "choir", arp: "bell", pad: "pad", drums: "heartbeat", density: 0.35, octave: 4, seed: 127 },
  { id: "boss", name: "The Hollow King", bpm: 136, root: 4, mode: "harmonic", progression: [0, 0, 5, 4, 0, 0, 3, 4], beatsPer: 4, lead: "brass", arp: "pluck", pad: "choir", drums: "drive", density: 0.8, octave: 4, seed: 131 },
];
function composeTrack(style: Style): Track {
  const random = mulberry(style.seed), scale = MODES[style.mode], per = style.beatsPer, bars = style.progression.length;
  const deg = (degree: number) => style.root + 12 * Math.floor(degree / 7) + scale[((degree % 7) + 7) % 7];
  const triad = (degree: number) => [deg(degree) % 12, deg(degree), deg(degree + 2), deg(degree + 4)];
  const harmony = style.progression.map(triad);
  // A two-bar motif, answered and varied: A A' B A'' across the loop, landing on the tonic.
  const rhythms = per === 3 ? [[1, 1, 1], [2, 1], [1.5, 0.5, 1], [3]] : [[1, 1, 1, 1], [2, 1, 1], [1.5, 0.5, 2], [1, 0.5, 0.5, 2], [0.5, 0.5, 1, 2], [4]];
  const motif: { length: number; step: number }[][] = [];
  for (let bar = 0; bar < 2; bar++) {
    const rhythm = rhythms[Math.floor(random() * (rhythms.length - 1))];
    motif.push(rhythm.map(length => ({ length, step: Math.floor(random() * 5) - 2 })));
  }
  const notes: Note[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const chord = style.progression[bar], phrase = Math.floor(bar / 2), cell = motif[bar % 2], last = bar === bars - 1;
    let beat = bar * per, degree = chord + (phrase === 2 ? 2 : 0) + 7 * (style.octave - 5);
    for (const [index, { length, step }] of (last ? [{ length: per, step: 0 }] : cell).entries()) {
      if (index > 0) degree += phrase === 1 ? -step : phrase === 3 ? step + (index === cell.length - 1 ? -1 : 0) : step;
      // Strong beats snap to a chord tone.
      if (index === 0 && !last) { const tones = [chord, chord + 2, chord + 4].map(tone => tone + 7 * (style.octave - 5)); degree = tones.reduce((best, tone) => Math.abs(tone - degree) < Math.abs(best - degree) ? tone : best, tones[0]); }
      if (last) degree = 7 * (style.octave - 5);
      if (random() < style.density || index === 0) notes.push({ beat, voice: style.lead, midi: deg(degree) + 60, length: length * 0.92, velocity: 0.75 + random() * 0.2 });
      beat += length;
    }
  }
  // Answer phrase an octave down on the second pass, so the loop doesn't feel short.
  const loop = bars * per, answer = notes.map(note => ({ ...note, beat: note.beat + loop, midi: note.midi + (style.lead === "bell" ? 12 : -12), velocity: note.velocity * 0.8 }));
  const bed = [...chordBed(harmony, per, { pad: style.pad, arp: style.arp, arpPattern: per === 3 ? [0, 1, 2, 1, 2, 1] : undefined }),
    ...chordBed(harmony, per, { pad: style.pad, arp: style.arp, arpPattern: per === 3 ? [0, 2, 1, 2, 3, 2] : [0, 2, 1, 3, 2, 1, 3, 2] }).map(note => ({ ...note, beat: note.beat + loop }))];
  const hits: Hit[] = [];
  for (let bar = 0; bar < bars * 2; bar++) {
    const b = bar * per;
    switch (style.drums) {
      case "soft": hits.push({ beat: b, drum: "kick", velocity: 0.55 }); if (per === 4) hits.push({ beat: b + 2, drum: "rim", velocity: 0.35 }); for (let e = 0; e < per * 2; e++) hits.push({ beat: b + e / 2, drum: "shaker", velocity: 0.18 }); break;
      case "march": hits.push({ beat: b, drum: "kick", velocity: 0.7 }, { beat: b + 1, drum: "snare", velocity: 0.4 }, { beat: b + 3, drum: "snare", velocity: 0.45 }); break;
      case "forge": hits.push({ beat: b, drum: "kick", velocity: 0.8 }, { beat: b + 1, drum: "clank", velocity: 0.55 }, { beat: b + 2.5, drum: "clank", velocity: 0.35 }, { beat: b + 3, drum: "clank", velocity: 0.6 }, { beat: b + 2, drum: "kick", velocity: 0.5 }); break;
      case "hand": for (const [offset, velocity] of [[0, 0.7], [0.75, 0.35], [1.5, 0.5], [2, 0.6], [2.5, 0.3], [3.25, 0.45]] as const) if (offset < per) hits.push({ beat: b + offset, drum: "hand", velocity }); for (let e = 0; e < per * 2; e++) hits.push({ beat: b + e / 2, drum: "shaker", velocity: 0.16 }); break;
      case "drive": for (let e = 0; e < 8; e++) hits.push({ beat: b + e / 2, drum: e % 4 === 2 ? "snare" : e % 2 ? "hat" : "kick", velocity: e % 4 === 2 ? 0.6 : 0.5 }); hits.push({ beat: b + 3.5, drum: "tom", velocity: 0.5 }); break;
      case "heartbeat": hits.push({ beat: b, drum: "kick", velocity: 0.55 }, { beat: b + 0.4, drum: "kick", velocity: 0.35 }); break;
      case "none": if (bar % 2 === 0) hits.push({ beat: b, drum: "shaker", velocity: 0.12 }); break;
    }
  }
  return { id: style.id, name: style.name, bpm: style.bpm, beats: loop * 2, notes: [...notes, ...answer, ...bed], hits };
}
export const TRACKS: readonly Track[] = [themeTrack(), ...STYLES.map(composeTrack)];
export const trackById = (id: TrackId) => TRACKS.find(track => track.id === id) ?? TRACKS[0];
/** Which track plays where: each region has its own, and the Hollow King's throne room its boss theme. */
export function trackFor(region: RegionId, nearBoss: boolean): TrackId { return nearBoss ? "boss" : region; }

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
      this.reverb = ctx.createConvolver(); this.wet = ctx.createGain(); this.wet.gain.value = 0.28;
      const length = Math.floor(ctx.sampleRate * 2.2), impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) { const data = impulse.getChannelData(channel); for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6; }
      this.reverb.buffer = impulse; this.reverb.connect(this.wet).connect(this.master);
      const warmth = ctx.createBiquadFilter(); warmth.type = "lowpass"; warmth.frequency.value = 6200; warmth.connect(this.master);
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
        this.voice(note.voice, note.midi, at, note.length * secondsPerBeat, note.velocity, this.fade!);
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
  private voice(voice: Voice, midi: number, t: number, length: number, velocity: number, bus: AudioNode) {
    const ctx = this.ctx!, f = hz(midi), gain = ctx.createGain(), v = velocity;
    gain.connect(bus);
    switch (voice) {
      case "lute": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(3200, t); filter.frequency.exponentialRampToValueAtTime(700, t + 0.5); filter.connect(gain);
        this.osc("triangle", f, t, t + length + 0.6, filter); this.osc("sawtooth", f * 2, t, t + 0.3, filter, -4);
        this.env(gain, t, 0.12 * v, 0.005, 0, Math.min(1.2, length + 0.4)); break; }
      case "flute": { const vibrato = ctx.createOscillator(), depth = ctx.createGain(); vibrato.frequency.value = 5.2; depth.gain.value = f * 0.006; vibrato.connect(depth);
        const o = this.osc("sine", f, t, t + length + 0.3, gain); depth.connect(o.frequency); vibrato.start(t + 0.15); vibrato.stop(t + length + 0.3);
        this.osc("triangle", f * 2, t, t + length + 0.3, gain).detune.value = 3;
        this.env(gain, t, 0.09 * v, 0.06, Math.max(0, length - 0.1), 0.25); break; }
      case "bell": { const mod = ctx.createOscillator(), depth = ctx.createGain(); mod.frequency.value = f * 3.5; depth.gain.setValueAtTime(f * 2, t); depth.gain.exponentialRampToValueAtTime(f * 0.1, t + 1.2);
        mod.connect(depth); const o = this.osc("sine", f, t, t + 2.4, gain); depth.connect(o.frequency); mod.start(t); mod.stop(t + 2.4);
        this.env(gain, t, 0.07 * v, 0.003, 0, 2.2); break; }
      case "harp": this.osc("triangle", f, t, t + 1.4, gain); this.osc("sine", f * 2, t, t + 0.6, gain); this.env(gain, t, 0.08 * v, 0.003, 0, 1.2); break;
      case "pluck": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(2400, t); filter.frequency.exponentialRampToValueAtTime(400, t + 0.25); filter.connect(gain);
        this.osc("square", f, t, t + 0.5, filter); this.env(gain, t, 0.045 * v, 0.003, 0, 0.35); break; }
      case "organ": for (const [ratio, level] of [[1, 1], [2, 0.5], [3, 0.25], [4, 0.12]] as const) { const g = ctx.createGain(); g.gain.value = level; g.connect(gain); this.osc("sine", f * ratio, t, t + length + 0.4, g); }
        this.env(gain, t, 0.06 * v, 0.04, Math.max(0, length - 0.05), 0.3); break;
      case "pad": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1100; filter.connect(gain);
        this.osc("sawtooth", f, t, t + length + 1, filter, -8); this.osc("sawtooth", f, t, t + length + 1, filter, 8);
        this.env(gain, t, 0.022 * v, Math.min(0.8, length / 3), Math.max(0, length - 0.8), 0.9); break; }
      case "choir": { const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 900; filter.Q.value = 1.4; filter.connect(gain);
        for (const detune of [-10, 0, 10]) this.osc("sawtooth", f, t, t + length + 1.2, filter, detune);
        this.env(gain, t, 0.05 * v, Math.min(0.9, length / 2), Math.max(0, length - 0.9), 1.0); break; }
      case "brass": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.setValueAtTime(500, t); filter.frequency.linearRampToValueAtTime(2200, t + 0.08); filter.frequency.exponentialRampToValueAtTime(900, t + length); filter.connect(gain);
        this.osc("sawtooth", f, t, t + length + 0.3, filter); this.osc("sawtooth", f, t, t + length + 0.3, filter, 7);
        this.env(gain, t, 0.07 * v, 0.03, Math.max(0, length - 0.05), 0.18); break; }
      case "bass": { const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 480; filter.connect(gain);
        this.osc("triangle", f, t, t + length + 0.2, filter); this.osc("square", f / 2, t, t + length + 0.2, filter).detune.value = 2;
        this.env(gain, t, 0.2 * v, 0.01, Math.max(0, length - 0.1), 0.12); break; }
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
      case "kick": this.thump(t, 120, 42, 0.28, 0.5 * v, bus); break;
      case "snare": this.noiseBurst(t, 0.16, 1800, 0.16 * v, bus); this.thump(t, 220, 160, 0.08, 0.12 * v, bus); break;
      case "hat": this.noiseBurst(t, 0.04, 7000, 0.07 * v, bus); break;
      case "shaker": this.noiseBurst(t, 0.06, 5200, 0.05 * v, bus, "bandpass", 1.2); break;
      case "rim": this.thump(t, 900, 700, 0.03, 0.12 * v, bus); break;
      case "tom": this.thump(t, 180, 90, 0.25, 0.3 * v, bus); break;
      case "hand": this.thump(t, 320, 180, 0.12, 0.26 * v, bus); this.noiseBurst(t, 0.03, 2400, 0.05 * v, bus); break;
      case "clank": { const ctx = this.ctx!, gain = ctx.createGain(); gain.connect(bus); for (const ratio of [1, 2.76, 5.4]) this.osc("square", 880 * ratio * (0.97 + Math.random() * 0.06), t, t + 0.4, gain);
        this.env(gain, t, 0.03 * v, 0.001, 0, 0.35); break; }
    }
  }

  // ---------- Sound effects ----------
  sfx(name: SoundName) {
    if (!this.ctx || this.ctx.state !== "running" || !this.sfxOn || this.muted) return;
    const now = this.ctx.currentTime, last = this.lastSfx.get(name) ?? 0;
    if (now - last < 0.05) return;
    this.lastSfx.set(name, now);
    const t = now + 0.005, bus = this.sfxBus;
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
      case "level": this.fanfare(t, [72, 76, 79, 84], [0, 0.12, 0.24, 0.42], 0.5); break;
      case "quest": this.fanfare(t, [67, 72, 76, 79, 76, 79, 84], [0, 0.15, 0.3, 0.45, 0.75, 0.9, 1.1], 0.9); break;
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
