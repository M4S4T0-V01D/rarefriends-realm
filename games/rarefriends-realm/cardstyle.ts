/**
 * Adventurer card styles: backgrounds, portrait backdrops, skill panels, fonts, inks and layouts, unlocked by
 * Presence, quests and achievements. What you pick is saved with your adventure.
 */
import type { Game } from "./state.ts";
import { levelForXp } from "./data.ts";

export type CardCategory = "bg" | "frame" | "skills" | "font" | "ink" | "layout";
/** The presets by category, plus any custom colours (hex) that override the ink, the background and the backdrop. */
export type CardStyle = Record<CardCategory, string> & { inkColor?: string; bgColor?: string; frameColor?: string };
export const CARD_COLOR_KEYS = ["inkColor", "bgColor", "frameColor"] as const;
export const CARD_COLOR_NAMES: Record<typeof CARD_COLOR_KEYS[number], string> = { inkColor: "Ink colour", bgColor: "Background colour", frameColor: "Backdrop colour" };
export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
export type CardOption = { id: string; name: string; presence?: number; quest?: string; achievements?: number; text?: string };
export const DEFAULT_CARD: CardStyle = { bg: "paper", frame: "rose", skills: "boxes", font: "mono", ink: "ink", layout: "classic" };
export const CARD_CATEGORY_NAMES: Record<CardCategory, string> = { bg: "Card background", frame: "Behind your Friend", skills: "Skills panel", font: "Lettering", ink: "Ink", layout: "Layout" };
export const CARD_OPTIONS: Record<CardCategory, readonly CardOption[]> = {
  bg: [
    { id: "paper", name: "Paper", text: "The Realm's own paper and grid." },
    { id: "parchment", name: "Parchment" },
    { id: "rose", name: "Rose" },
    { id: "night", name: "Starry night", presence: 20 },
    { id: "deadwood", name: "Deadwood", quest: "gravesend_lanterns", text: "Light Gravesend's lanterns." },
    { id: "ashfall", name: "Ashfall", quest: "ashfall_embers", text: "Clear Ashfall's passes." },
    { id: "gold", name: "Gilt", presence: 50 },
    { id: "void", name: "The Hollow", presence: 80 },
  ],
  frame: [
    { id: "rose", name: "Rose" }, { id: "sage", name: "Sage" }, { id: "sky", name: "Sky" }, { id: "sunset", name: "Sunset" },
    { id: "dawn", name: "Dawn", quest: "dawn_vigil", text: "Keep the Dawn Vigil." }, { id: "hollow", name: "Hollow", quest: "hollow_king", text: "End the Hollow King's reign." },
    { id: "starry", name: "Starry", presence: 35 }, { id: "renown", name: "Renown", quest: "the_remembered", text: "Be remembered." },
  ],
  skills: [{ id: "boxes", name: "Boxes" }, { id: "pills", name: "Pills" }, { id: "dark", name: "Ink", presence: 25 }, { id: "gilded", name: "Gilded", presence: 60 }],
  font: [{ id: "mono", name: "Mono" }, { id: "serif", name: "Serif" }, { id: "sans", name: "Sans" }, { id: "display", name: "Display", presence: 25 }],
  ink: [{ id: "ink", name: "Ink" }, { id: "navy", name: "Navy" }, { id: "wine", name: "Wine" }, { id: "forest", name: "Forest" }, { id: "gilt", name: "Gold", achievements: 20, text: "Twenty achievements." }],
  layout: [{ id: "classic", name: "Classic" }, { id: "ledger", name: "Ledger", text: "Skills on the left, your Friend on the right." }, { id: "poster", name: "Poster", text: "A big portrait, the skills beside it." }, { id: "banner", name: "Banner", text: "Your Friend up top, every skill in a wide row." }],
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
  const picked = game.player.card, out: CardStyle = { ...DEFAULT_CARD };
  for (const category of Object.keys(CARD_OPTIONS) as CardCategory[]) {
    const option = CARD_OPTIONS[category].find(entry => entry.id === picked[category]);
    if (option && cardUnlocked(game, option)) out[category] = option.id;
  }
  for (const key of CARD_COLOR_KEYS) if (isHexColor(picked[key])) out[key] = picked[key];
  return out;
}
export function cleanCard(raw: unknown): Record<string, string> {
  const out: Record<string, string> = { ...DEFAULT_CARD };
  if (!raw || typeof raw !== "object") return out;
  for (const category of Object.keys(CARD_OPTIONS) as CardCategory[]) {
    const value = (raw as Record<string, unknown>)[category];
    if (typeof value === "string" && CARD_OPTIONS[category].some(entry => entry.id === value)) out[category] = value;
  }
  for (const key of CARD_COLOR_KEYS) { const value = (raw as Record<string, unknown>)[key]; if (isHexColor(value)) out[key] = value.toLowerCase(); }
  return out;
}
/** Relative luminance, for choosing light or dark text over a custom colour. */
export const isDarkColor = (hex: string) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45; };

// ---------- Fellowship looks: emblems, banners and colours, drawn by the game ----------
export const FELLOWSHIP_LOGOS = ["shield", "star", "skull", "flame", "moon", "tree", "wave", "crown", "sword", "eye", "leaf", "bolt"] as const;
export const FELLOWSHIP_BANNERS = ["plain", "split", "stripes", "chevrons", "checks", "stars", "flames", "waves"] as const;
export const DEFAULT_FELLOWSHIP_COLORS: [string, string] = ["#1c1b1f", "#e2c46a"];
export function cleanFellowshipLook<T extends { name: string; tag: string }>(base: T, raw: unknown): T & { logo?: string; banner?: string; colors?: [string, string] } {
  const out: T & { logo?: string; banner?: string; colors?: [string, string] } = { ...base };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.logo === "string" && (FELLOWSHIP_LOGOS as readonly string[]).includes(r.logo)) out.logo = r.logo;
  if (typeof r.banner === "string" && (FELLOWSHIP_BANNERS as readonly string[]).includes(r.banner)) out.banner = r.banner;
  if (Array.isArray(r.colors) && r.colors.length === 2 && isHexColor(r.colors[0]) && isHexColor(r.colors[1])) out.colors = [r.colors[0].toLowerCase(), r.colors[1].toLowerCase()];
  return out;
}
/** A fellowship's emblem, drawn in its colours inside a `size` square at (x, y). */
export function drawEmblem(ctx: CanvasRenderingContext2D, logo: string, x: number, y: number, size: number, colors: [string, string]) {
  const [bg, fg] = colors, c = size / 2, cx = x + c, cy = y + c, r = size * 0.36;
  ctx.save();
  ctx.fillStyle = bg; ctx.fillRect(x, y, size, size); ctx.strokeStyle = "#161616"; ctx.lineWidth = Math.max(1, size / 32); ctx.strokeRect(x, y, size, size);
  ctx.fillStyle = fg; ctx.strokeStyle = fg; ctx.lineWidth = Math.max(1.5, size / 14); ctx.lineJoin = "round"; ctx.lineCap = "round";
  const poly = (points: [number, number][]) => { ctx.beginPath(); points.forEach(([px, py], i) => i ? ctx.lineTo(cx + px * r, cy + py * r) : ctx.moveTo(cx + px * r, cy + py * r)); ctx.closePath(); ctx.fill(); };
  switch (logo) {
    case "star": poly(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? 0.45 : 1; return [Math.cos(a) * d, Math.sin(a) * d]; })); break;
    case "skull": ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.15, r * 0.8, r * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx - r * 0.45, cy + r * 0.3, r * 0.9, r * 0.5);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx - r * 0.32, cy - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.arc(cx + r * 0.32, cy - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx - r * 0.3, cy + r * 0.45, r * 0.12, r * 0.3); ctx.fillRect(cx + r * 0.18, cy + r * 0.45, r * 0.12, r * 0.3); break;
    case "flame": poly([[0, -1], [0.55, -0.3], [0.7, 0.5], [0.3, 0.9], [0, 1], [-0.3, 0.9], [-0.7, 0.5], [-0.55, -0.3], [-0.2, -0.1]]); ctx.fillStyle = bg; poly([[0, 0.1], [0.3, 0.55], [0, 0.9], [-0.3, 0.55]]); break;
    case "moon": ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx + r * 0.45, cy - r * 0.2, r * 0.8, 0, Math.PI * 2); ctx.fill(); break;
    case "tree": poly([[0, -1], [0.7, 0], [0.3, 0], [0.9, 0.7], [0.15, 0.7], [0.15, 1], [-0.15, 1], [-0.15, 0.7], [-0.9, 0.7], [-0.3, 0], [-0.7, 0]]); break;
    case "wave": ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.3); for (let i = 0; i <= 8; i++) { const px = cx - r + i * r / 4; ctx.lineTo(px, cy + (i % 2 ? -0.5 : 0.3) * r); } ctx.lineTo(cx + r, cy + r); ctx.lineTo(cx - r, cy + r); ctx.closePath(); ctx.fill(); break;
    case "crown": poly([[-1, 0.7], [-1, -0.5], [-0.5, 0.1], [0, -0.9], [0.5, 0.1], [1, -0.5], [1, 0.7]]); break;
    case "sword": poly([[0, -1], [0.18, -0.7], [0.18, 0.3], [0.5, 0.3], [0.5, 0.5], [0.18, 0.5], [0.18, 1], [-0.18, 1], [-0.18, 0.5], [-0.5, 0.5], [-0.5, 0.3], [-0.18, 0.3], [-0.18, -0.7]]); break;
    case "eye": ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.quadraticCurveTo(cx, cy - r * 1.1, cx + r, cy); ctx.quadraticCurveTo(cx, cy + r * 1.1, cx - r, cy); ctx.fill(); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2); ctx.fill(); break;
    case "leaf": ctx.beginPath(); ctx.moveTo(cx, cy + r); ctx.quadraticCurveTo(cx - r * 1.2, cy, cx, cy - r); ctx.quadraticCurveTo(cx + r * 1.2, cy, cx, cy + r); ctx.fill(); ctx.strokeStyle = bg; ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.9); ctx.lineTo(cx, cy - r * 0.6); ctx.stroke(); break;
    case "bolt": poly([[0.3, -1], [-0.5, 0.15], [0, 0.15], [-0.3, 1], [0.5, -0.15], [0, -0.15]]); break;
    default: poly([[-0.9, -0.9], [0.9, -0.9], [0.9, 0.2], [0, 1], [-0.9, 0.2]]); ctx.fillStyle = bg; poly([[-0.6, -0.6], [0.6, -0.6], [0.6, 0.1], [0, 0.65], [-0.6, 0.1]]); ctx.fillStyle = fg; poly([[-0.35, -0.35], [0.35, -0.35], [0.35, 0], [0, 0.35], [-0.35, 0]]);
  }
  ctx.restore();
}
/** A fellowship's banner, drawn in its colours across a band. */
export function drawBanner(ctx: CanvasRenderingContext2D, banner: string, x: number, y: number, w: number, h: number, colors: [string, string]) {
  const [a, b] = colors;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = a; ctx.fillRect(x, y, w, h); ctx.fillStyle = b;
  switch (banner) {
    case "split": { const g = ctx.createLinearGradient(x, y, x + w, y); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); break; }
    case "stripes": for (let px = x - h; px < x + w; px += h) { ctx.beginPath(); ctx.moveTo(px, y + h); ctx.lineTo(px + h, y); ctx.lineTo(px + h / 2, y); ctx.lineTo(px - h / 2, y + h); ctx.closePath(); ctx.fill(); } break;
    case "chevrons": for (let px = x; px < x + w; px += h) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + h / 2, y + h / 2); ctx.lineTo(px, y + h); ctx.lineTo(px + h / 4, y + h); ctx.lineTo(px + h * 0.75, y + h / 2); ctx.lineTo(px + h / 4, y); ctx.closePath(); ctx.fill(); } break;
    case "checks": { const s = h / 3; for (let j = 0; j < 3; j++) for (let px = x; px < x + w; px += s) if ((Math.round((px - x) / s) + j) % 2 === 0) ctx.fillRect(px, y + j * s, s, s); break; }
    case "stars": { let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; for (let i = 0; i < Math.round(w / 12); i++) { const sx = x + r() * w, sy = y + r() * h, sr = 1 + r() * 2.5; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill(); } break; }
    case "flames": for (let px = x; px < x + w; px += h / 2) { ctx.beginPath(); ctx.moveTo(px, y + h); ctx.quadraticCurveTo(px + h / 4, y + h * 0.1, px + h / 2, y + h); ctx.closePath(); ctx.fill(); } break;
    case "waves": for (let row = 0; row < 3; row++) { ctx.beginPath(); ctx.moveTo(x, y + h * (0.3 + row * 0.3)); for (let px = x; px <= x + w; px += h / 2) ctx.quadraticCurveTo(px + h / 4, y + h * (0.1 + row * 0.3), px + h / 2, y + h * (0.3 + row * 0.3)); ctx.lineWidth = Math.max(2, h / 12); ctx.strokeStyle = b; ctx.stroke(); } break;
    default: break;
  }
  ctx.restore();
}
/** A small preview canvas of an emblem or a banner, for menus. */
export function previewArt(kind: "logo" | "banner", id: string, colors: [string, string], w = 48, h = 48): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (kind === "logo") drawEmblem(ctx, id, 0, 0, Math.min(w, h), colors); else drawBanner(ctx, id, 0, 0, w, h, colors);
  return canvas;
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
