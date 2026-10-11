/**
 * Weather, from the real clock, so every player in the Realm has the same sky at the same time: the day is cut into
 * four-minute spells of clear skies, rain or storms (fading in and out), and in a storm lightning strikes on seconds the
 * clock picks, so everyone sees the same flash. Morning brings ground fog; the Murkmire is always misty.
 */
export type Weather = { rain: number; storm: boolean; fog: number };
export type Strike = { id: number; at: number; x: number; y: number; seed: number };
const SPELL_MS = 4 * 60_000;
/** Meghavan's regions (the Rain Country). */
const RAIN_COUNTRY: ReadonlySet<string> = new Set(["rain_pass", "tirthali", "ilavati_valley", "sarovan", "shaila_highlands", "shailagarh", "parasol_plains", "mandapur", "golden_shore", "suvarnatira", "deepgreen", "kanthar"]);
const hash = (n: number, salt = 0) => { let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

/** The sky at a moment (wall-clock ms) over a region, and a time of day (0–1) for the morning fog. */
export function weatherAt(ms: number, region: string, underground: boolean, timeOfDay: number | null): Weather {
  if (underground) return { rain: 0, storm: false, fog: 0 };
  const spell = Math.floor(ms / SPELL_MS), roll = hash(spell), within = (ms % SPELL_MS) / SPELL_MS;
  // Meghavan, the Rain Country, is wetter than anywhere: rain more often than not, and the Deepgreen always misty.
  const rainy = RAIN_COUNTRY.has(region), kind = roll < (rainy ? 0.36 : 0.58) ? "clear" : roll < (rainy ? 0.86 : 0.84) ? "rain" : "storm";
  // Ramp in over the first sixth of the spell and out over the last.
  const ramp = Math.min(1, within * 6, (1 - within) * 6), dry = region === "pale_dunes" || region === "oasis" || region === "frostpeak";
  const rain = kind === "clear" || dry ? 0 : (kind === "storm" ? 1 : 0.6) * ramp;
  const dawn = timeOfDay === null ? 0 : Math.max(0, 1 - Math.abs(timeOfDay - 0.27) / 0.09);
  const fog = Math.min(1, Math.max(dawn * 0.85, region === "murkmire" ? 0.5 : region === "deepgreen" || region === "kanthar" ? 0.35 : 0, rain * 0.25));
  return { rain, storm: kind === "storm" && !dry && ramp > 0.5, fog };
}
/** The latest lightning strike at or before `ms` (within the last few seconds), in a storm. */
export function strikeAt(ms: number): Strike | null {
  for (let second = Math.floor(ms / 1000); second > Math.floor(ms / 1000) - 4; second--) {
    if (hash(second, 7) >= 0.09) continue;
    const at = second * 1000 + Math.floor(hash(second, 8) * 700);
    if (at > ms) continue;
    return { id: second, at, x: hash(second, 9), y: 0.35 + hash(second, 10) * 0.4, seed: Math.floor(hash(second, 11) * 1e6) };
  }
  return null;
}
