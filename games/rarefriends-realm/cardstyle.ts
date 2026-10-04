/**
 * Adventurer card styles: backgrounds, portrait backdrops, skill panels, fonts, inks and layouts, unlocked by
 * Presence, quests and achievements. What you pick is saved with your adventure.
 */
import type { Game } from "./state.ts";
import { levelForXp } from "./data.ts";

export type CardCategory = "bg" | "frame" | "skills" | "font" | "ink" | "layout";
export type CardStyle = Record<CardCategory, string>;
export type CardOption = { id: string; name: string; presence?: number; quest?: string; achievements?: number; text?: string };
export const DEFAULT_CARD: CardStyle = { bg: "paper", frame: "rose", skills: "boxes", font: "mono", ink: "ink", layout: "classic" };
export const CARD_CATEGORY_NAMES: Record<CardCategory, string> = { bg: "Card background", frame: "Behind your Friend", skills: "Skills panel", font: "Lettering", ink: "Ink", layout: "Layout" };
export const CARD_OPTIONS: Record<CardCategory, readonly CardOption[]> = {
  bg: [
    { id: "paper", name: "Paper", text: "The Realm's own paper and grid." },
    { id: "parchment", name: "Parchment", presence: 10 },
    { id: "night", name: "Starry night", presence: 20 },
    { id: "rose", name: "Rose", presence: 30 },
    { id: "deadwood", name: "Deadwood", quest: "gravesend_lanterns", text: "Light Gravesend's lanterns." },
    { id: "ashfall", name: "Ashfall", quest: "ashfall_embers", text: "Clear Ashfall's passes." },
    { id: "gold", name: "Gilt", presence: 60 },
    { id: "void", name: "The Hollow", presence: 80 },
  ],
  frame: [
    { id: "rose", name: "Rose" }, { id: "sage", name: "Sage", presence: 5 }, { id: "sky", name: "Sky", presence: 15 }, { id: "sunset", name: "Sunset", presence: 25 },
    { id: "dawn", name: "Dawn", quest: "dawn_vigil", text: "Keep the Dawn Vigil." }, { id: "hollow", name: "Hollow", quest: "hollow_king", text: "End the Hollow King's reign." },
    { id: "starry", name: "Starry", presence: 45 }, { id: "renown", name: "Renown", quest: "the_remembered", text: "Be remembered." },
  ],
  skills: [{ id: "boxes", name: "Boxes" }, { id: "pills", name: "Pills", presence: 12 }, { id: "dark", name: "Ink", presence: 35 }, { id: "gilded", name: "Gilded", presence: 70 }],
  font: [{ id: "mono", name: "Mono" }, { id: "serif", name: "Serif", presence: 8 }, { id: "sans", name: "Sans", presence: 18 }, { id: "display", name: "Display", presence: 40 }],
  ink: [{ id: "ink", name: "Ink" }, { id: "navy", name: "Navy", presence: 10 }, { id: "wine", name: "Wine", presence: 22 }, { id: "forest", name: "Forest", presence: 33 }, { id: "gilt", name: "Gold", achievements: 20, text: "Twenty achievements." }],
  layout: [{ id: "classic", name: "Classic" }, { id: "ledger", name: "Ledger", presence: 30, text: "Skills on the left, your Friend on the right." }, { id: "banner", name: "Banner", presence: 50, text: "Your Friend up top, every skill in a wide row." }],
};
export function cardUnlocked(game: Game, option: CardOption): boolean {
  const player = game.player;
  if (option.presence && levelForXp(player.xp.presence) < option.presence) return false;
  if (option.quest && (player.quests[option.quest] ?? 0) < 2) return false;
  if (option.achievements && Object.keys(player.achievements).length < option.achievements) return false;
  return true;
}
export const cardRequirement = (option: CardOption) => option.presence ? `Presence ${option.presence}` : option.quest ? option.text ?? option.quest : option.achievements ? `${option.achievements} achievements` : "";
/** The style you'll actually get: anything you've picked but no longer qualify for falls back to the default. */
export function cardStyle(game: Game): CardStyle {
  const picked = game.player.card, out = { ...DEFAULT_CARD };
  for (const category of Object.keys(CARD_OPTIONS) as CardCategory[]) {
    const option = CARD_OPTIONS[category].find(entry => entry.id === picked[category]);
    if (option && cardUnlocked(game, option)) out[category] = option.id;
  }
  return out;
}
export function cleanCard(raw: unknown): CardStyle {
  const out = { ...DEFAULT_CARD };
  if (!raw || typeof raw !== "object") return out;
  for (const category of Object.keys(CARD_OPTIONS) as CardCategory[]) {
    const value = (raw as Record<string, unknown>)[category];
    if (typeof value === "string" && CARD_OPTIONS[category].some(entry => entry.id === value)) out[category] = value;
  }
  return out;
}

// ---------- Fellowship art, from the site's fellowships folder ----------
export type FellowshipArt = { logo: HTMLImageElement | null; bg: HTMLImageElement | null };
/** Where fellowship logos and backgrounds live: `<TAG>/logo.png` and `<TAG>/bg.png` under the preview site. */
export const FELLOWSHIP_ART_URL = "https://m4s4t0-v01d.github.io/rarefriends-realm/preview/fellowships/";
const artCache = new Map<string, Promise<FellowshipArt>>();
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (typeof Image === "undefined") { resolve(null); return; }
    const image = new Image(); image.crossOrigin = "anonymous";
    image.onload = () => resolve(image); image.onerror = () => resolve(null);
    image.src = url;
  });
}
export function fellowshipArt(tag: string): Promise<FellowshipArt> {
  const clean = /^[A-Z0-9]{2,5}$/.test(tag) ? tag : null;
  if (!clean) return Promise.resolve({ logo: null, bg: null });
  let pending = artCache.get(clean);
  if (!pending) {
    pending = Promise.all([loadImage(`${FELLOWSHIP_ART_URL}${clean}/logo.png`), loadImage(`${FELLOWSHIP_ART_URL}${clean}/bg.png`)]).then(([logo, bg]) => ({ logo, bg }));
    artCache.set(clean, pending);
  }
  return pending;
}
