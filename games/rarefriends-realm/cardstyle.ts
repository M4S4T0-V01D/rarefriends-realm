/**
 * Adventurer card styles: backgrounds, portrait backdrops, skill panels, fonts, inks and layouts, unlocked by
 * Presence, quests and achievements. What you pick is saved with your adventure.
 */
import type { Game } from "./state.ts";
import { levelForXp } from "./data.ts";
import { ORDERS, metOrder, type OrderId } from "./knights.ts";

export type CardCategory = "bg" | "frame" | "skills" | "font" | "ink" | "layout" | "banner";
/** The presets by category, plus any custom colours (hex) that override the ink, the background and the backdrop. */
export type CardStyle = Record<CardCategory, string> & { inkColor?: string; bgColor?: string; frameColor?: string; accentColor?: string; bannerColor?: string };
export const CARD_COLOR_KEYS = ["inkColor", "bgColor", "frameColor", "accentColor", "bannerColor"] as const;
export const CARD_COLOR_NAMES: Record<typeof CARD_COLOR_KEYS[number], string> = { inkColor: "Ink colour", bgColor: "Background colour", frameColor: "Backdrop colour", accentColor: "Accent colour", bannerColor: "Banner colour" };
export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
/** An option's lock: Presence, a quest, achievements, or (Return of Raria) an Order or faction whose leader you must have met in the world. */
export type CardOption = { id: string; name: string; presence?: number; quest?: string; achievements?: number; text?: string; order?: OrderId | "fff" | "raria" | "hollowmere" };
export const DEFAULT_CARD: CardStyle = { bg: "paper", frame: "rose", skills: "boxes", font: "mono", ink: "ink", layout: "classic", banner: "auto" };
export const CARD_CATEGORY_NAMES: Record<CardCategory, string> = { bg: "Card background", frame: "Behind your Friend", skills: "Skills panel", font: "Lettering", ink: "Ink", layout: "Layout", banner: "Header banner" };
export const CARD_OPTIONS: Record<CardCategory, readonly CardOption[]> = {
  bg: [
    { id: "paper", name: "Paper", text: "The Realm's own paper and grid." }, { id: "parchment", name: "Parchment" }, { id: "rose", name: "Rose" }, { id: "sage", name: "Sage" }, { id: "sky", name: "Sky" },
    { id: "lavender", name: "Lavender" }, { id: "snow", name: "Snow" }, { id: "slate", name: "Slate" }, { id: "night", name: "Starry night" }, { id: "ocean", name: "Ocean" }, { id: "forest", name: "Forest" },
    { id: "ember", name: "Ember" }, { id: "dusk", name: "Dusk" }, { id: "deadwood", name: "Deadwood" }, { id: "ashfall", name: "Ashfall" }, { id: "gold", name: "Gilt" }, { id: "ink", name: "Ink" }, { id: "void", name: "The Hollow" },
    // Return of Raria: stone, brutal black, glyphs, the far west's colours, and each Order's own ground (its leader met first).
    { id: "stone", name: "Ancient stone", text: "A tablet of old grey stone, cracked." }, { id: "brutal", name: "Brutalist", text: "Heavy black blocks and one white line." }, { id: "glyphs", name: "Glyphs", text: "A ring of magic glyphs on dark violet." },
    { id: "copper", name: "Copper", text: "The Federation's copper and verdigris.", order: "fff" }, { id: "violet", name: "Dusk violet", text: "Raria's violet, the closed eye faint in it.", order: "raria" }, { id: "crimson", name: "Hollowmere crimson", text: "The kingdom's crimson and gold.", order: "hollowmere" },
    { id: "facets", name: "Facets", text: "The Diamond's blue, faceted.", order: "diamond" }, { id: "pages", name: "Pages", text: "The Ink's purple over written pages.", order: "ink" }, { id: "prism", name: "Prism", text: "The Sol's every colour at once.", order: "sol" },
    { id: "greenwood", name: "Greenwood", text: "The Hood's leaves in the sun.", order: "hood" }, { id: "forge", name: "Forge", text: "The Ember's iron and fire.", order: "ember" }, { id: "vespers", name: "Vespers", text: "The Dusk's violet dark, a censer's smoke in it.", order: "dusk" },
  ],
  frame: [
    { id: "rose", name: "Rose" }, { id: "sage", name: "Sage" }, { id: "sky", name: "Sky" }, { id: "sunset", name: "Sunset" }, { id: "lavender", name: "Lavender" }, { id: "snow", name: "Snow" }, { id: "gold", name: "Gold" },
    { id: "ember", name: "Ember" }, { id: "ocean", name: "Ocean" }, { id: "forest", name: "Forest" }, { id: "slate", name: "Slate" }, { id: "night", name: "Night" }, { id: "dawn", name: "Dawn" }, { id: "hollow", name: "Hollow" },
    { id: "starry", name: "Starry" }, { id: "renown", name: "Renown" }, { id: "plain", name: "Plain" }, { id: "fellowship", name: "Fellowship", text: "Your fellowship's banner and emblem behind your Friend." },
    // Return of Raria: the far west's halls behind your Friend, and each Order's (its leader met first).
    { id: "palace", name: "Raria's palace", text: "The throne room of Raria: pillars, the closed eye, violet and silver.", order: "raria" }, { id: "fortress", name: "The Great Hall", text: "The Federation's Great Hall: devices, swords from the ceiling, the cannon.", order: "fff" }, { id: "hollowmere", name: "Hollowmere", text: "The kingdom's crimson banners and the castle wall.", order: "hollowmere" },
    { id: "diamond_hall", name: "Diamond Hall", text: "The Order of the Diamond's hall and god.", order: "diamond" }, { id: "ink_hall", name: "Ink Hall", text: "The Order of the Ink's hall and god.", order: "ink" }, { id: "sol_hall", name: "Sol Hall", text: "The Order of the Sol's hall and god.", order: "sol" },
    { id: "hood_hall", name: "Hood Hall", text: "The Order of the Hood's hall and god.", order: "hood" }, { id: "ember_hall", name: "Ember Fortress", text: "The Order of the Ember's brazier and lava.", order: "ember" }, { id: "dusk_hall", name: "Dusk Hall", text: "The Order of Dusk's dark hall and hooded god.", order: "dusk" },
  ],
  skills: [{ id: "boxes", name: "Boxes" }, { id: "pills", name: "Pills" }, { id: "outline", name: "Outline" }, { id: "soft", name: "Soft" }, { id: "stripes", name: "Stripes" }, { id: "dark", name: "Ink" }, { id: "gilded", name: "Gilded" }],
  font: [{ id: "mono", name: "Mono" }, { id: "serif", name: "Serif" }, { id: "sans", name: "Sans" }, { id: "rounded", name: "Rounded" }, { id: "slab", name: "Slab" }, { id: "narrow", name: "Narrow" }, { id: "cursive", name: "Script" }, { id: "display", name: "Display" }],
  ink: [{ id: "ink", name: "Ink" }, { id: "navy", name: "Navy" }, { id: "wine", name: "Wine" }, { id: "forest", name: "Forest" }, { id: "plum", name: "Plum" }, { id: "ember", name: "Ember" }, { id: "teal", name: "Teal" }, { id: "rose", name: "Rose" }, { id: "slate", name: "Slate" }, { id: "gilt", name: "Gold" }],
  layout: [{ id: "classic", name: "Classic" }, { id: "ledger", name: "Ledger", text: "Skills on the left, your Friend on the right." }, { id: "poster", name: "Poster", text: "A big portrait, the skills beside it." }, { id: "centre", name: "Centre", text: "Your Friend in the middle, skills either side." }, { id: "banner", name: "Banner", text: "Your Friend up top, every skill in a wide row." },
    // Return of Raria: layouts that change the whole page, and each Order's and faction's own (its leader met first).
    { id: "minimal", name: "Minimal", text: "Nothing but the lines: thin rules, small type, lots of air." }, { id: "ancient", name: "Ancient", text: "A stone tablet: chiselled panels, a cracked edge, the skills in columns." }, { id: "brutalist", name: "Brutalist", text: "Heavy black blocks, one white rule, the portrait boxed hard." },
    { id: "facet", name: "Facet", text: "The Diamond's: ornate gilt corners, a faceted frame, the skills as cut stones.", order: "diamond" }, { id: "folio", name: "Folio", text: "The Ink's: a scriptorium page with ruled lines, drop capitals and a purple seal.", order: "ink" },
    { id: "prism", name: "Prism", text: "The Sol's: tilted panels, rays of every colour, nothing quite square.", order: "sol" }, { id: "greenwood", name: "Greenwood", text: "The Hood's: a forest edge, a hood's silhouette, leaves at the margins.", order: "hood" },
    { id: "forge", name: "Forge", text: "The Ember's: riveted iron plates, embers rising, the skills stamped in metal.", order: "ember" }, { id: "vespers", name: "Vespers", text: "The Dusk's: a ceremonial arch, candles, violet drapes, the closed eye.", order: "dusk" },
    { id: "workshop", name: "Workshop", text: "The Federation's: copper panels, gears, red string, FFF across the band.", order: "fff" }, { id: "edict", name: "Edict", text: "Raria's: a military writ, stencilled bars, the Regiment's eye and seal.", order: "raria" },
    { id: "garrison", name: "Garrison", text: "Hollowmere's: crimson banners, the crown, a castle wall behind the skills.", order: "hollowmere" },
  ],
  banner: [{ id: "auto", name: "Auto", text: "Your fellowship's banner if you have one, a plain bar otherwise." }, { id: "none", name: "None" }, { id: "fellowship", name: "Fellowship" },
    ...["plain", "split", "stripes", "chevrons", "checks", "stars", "flames", "waves", "diagonal", "quarters", "border", "dots", "zigzag", "sunburst", "cross", "fade"].map(id => ({ id, name: id[0].toUpperCase() + id.slice(1), text: "Your own banner, in your banner and accent colours." }))],
};
/** Every style is free: the card is the player's. (The checks stay for any option that names a condition.) */
export function cardUnlocked(game: Game, option: CardOption): boolean {
  const player = game.player;
  if (option.order === "fff" && !((player.questData.met_fff ?? 0) >= 1)) return false;
  if (option.order === "raria" && !((player.questData.met_raria ?? 0) >= 1)) return false;
  if (option.order === "hollowmere" && !player.talked.hollowmere_officer) return false;
  if (option.order && option.order in ORDERS && !metOrder(player.questData, option.order as OrderId)) return false;
  if (option.presence && levelForXp(player.xp.presence) < option.presence) return false;
  if (option.quest && (player.quests[option.quest] ?? 0) < 2) return false;
  if (option.achievements && Object.keys(player.achievements).length < option.achievements) return false;
  return true;
}
export const cardRequirement = (option: CardOption) => option.presence ? `Presence ${option.presence}` : option.quest ? option.text ?? option.quest : option.achievements ? `${option.achievements} achievements`
  : option.order === "fff" ? "Meet Fellow Free at the FFF Fortress" : option.order === "raria" ? "Be received by Queen Rara in Raria" : option.order === "hollowmere" ? "Speak with Captain Ashby of the Hollowmere garrison" : option.order ? `Meet ${ORDERS[option.order as OrderId].leaderName} of the ${ORDERS[option.order as OrderId].name}` : "";
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
export const FELLOWSHIP_LOGOS = ["shield", "star", "skull", "flame", "moon", "tree", "wave", "crown", "sword", "eye", "leaf", "bolt", "anchor", "axe", "hammer", "heart", "diamond", "mountain", "sun", "key", "tower", "arrow", "fish", "rose", "hourglass", "lantern", "paw", "cup"] as const;
export const FELLOWSHIP_BANNERS = ["plain", "split", "stripes", "chevrons", "checks", "stars", "flames", "waves", "diagonal", "quarters", "border", "dots", "zigzag", "sunburst", "cross", "fade"] as const;
export const DEFAULT_FELLOWSHIP_COLORS: string[] = ["#1c1b1f", "#e2c46a", "#efede7", "#8a62c8"];
export function cleanFellowshipLook<T extends { name: string; tag: string }>(base: T, raw: unknown): T & { logo?: string; banner?: string; colors?: string[]; since?: number; seen?: Record<number, number> } {
  const out: T & { logo?: string; banner?: string; colors?: string[]; since?: number; seen?: Record<number, number> } = { ...base };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.since === "number" && Number.isFinite(r.since) && r.since > 0 && r.since < 1e7) out.since = Math.floor(r.since);
  if (r.seen && typeof r.seen === "object") { const seen: Record<number, number> = {}; for (const [id, day] of Object.entries(r.seen as Record<string, unknown>).slice(0, 500)) if (/^\d{1,15}$/.test(id) && typeof day === "number" && Number.isFinite(day)) seen[Number(id)] = Math.floor(day); out.seen = seen; }
  if (typeof r.logo === "string" && (FELLOWSHIP_LOGOS as readonly string[]).includes(r.logo)) out.logo = r.logo;
  if (typeof r.banner === "string" && (FELLOWSHIP_BANNERS as readonly string[]).includes(r.banner)) out.banner = r.banner;
  if (Array.isArray(r.colors) && r.colors.length >= 2 && r.colors.length <= 4 && r.colors.every(isHexColor)) out.colors = r.colors.map(color => color.toLowerCase());
  return out;
}
/** A fellowship's emblem, drawn in its colours inside a `size` square at (x, y). */
export function drawEmblem(ctx: CanvasRenderingContext2D, logo: string, x: number, y: number, size: number, colors: readonly string[]) {
  const [bg, fg, ring = fg, detail = bg] = colors, c = size / 2, cx = x + c, cy = y + c, r = size * 0.36;
  ctx.save();
  ctx.fillStyle = detail; ctx.fillRect(x, y, size, size); ctx.strokeStyle = "#161616"; ctx.lineWidth = Math.max(1, size / 32); ctx.strokeRect(x, y, size, size);
  ctx.strokeStyle = ring; ctx.lineWidth = Math.max(1, size / 24); ctx.strokeRect(x + size * 0.06, y + size * 0.06, size * 0.88, size * 0.88);
  ctx.fillStyle = fg; ctx.strokeStyle = fg; ctx.lineWidth = Math.max(1.5, size / 14); ctx.lineJoin = "round"; ctx.lineCap = "round";
  const poly = (points: [number, number][]) => { ctx.beginPath(); points.forEach(([px, py], i) => i ? ctx.lineTo(cx + px * r, cy + py * r) : ctx.moveTo(cx + px * r, cy + py * r)); ctx.closePath(); ctx.fill(); };
  switch (logo) {
    case "star": poly(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? 0.45 : 1; return [Math.cos(a) * d, Math.sin(a) * d]; })); break;
    case "skull": ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.15, r * 0.8, r * 0.75, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx - r * 0.45, cy + r * 0.3, r * 0.9, r * 0.5);
      ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(cx - r * 0.32, cy - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.arc(cx + r * 0.32, cy - r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(cx - r * 0.3, cy + r * 0.45, r * 0.12, r * 0.3); ctx.fillRect(cx + r * 0.18, cy + r * 0.45, r * 0.12, r * 0.3); break;
    case "flame": poly([[0, -1], [0.55, -0.3], [0.7, 0.5], [0.3, 0.9], [0, 1], [-0.3, 0.9], [-0.7, 0.5], [-0.55, -0.3], [-0.2, -0.1]]); ctx.fillStyle = detail; poly([[0, 0.1], [0.3, 0.55], [0, 0.9], [-0.3, 0.55]]); break;
    case "moon": ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(cx + r * 0.45, cy - r * 0.2, r * 0.8, 0, Math.PI * 2); ctx.fill(); break;
    case "tree": poly([[0, -1], [0.7, 0], [0.3, 0], [0.9, 0.7], [0.15, 0.7], [0.15, 1], [-0.15, 1], [-0.15, 0.7], [-0.9, 0.7], [-0.3, 0], [-0.7, 0]]); break;
    case "wave": ctx.beginPath(); ctx.moveTo(cx - r, cy + r * 0.3); for (let i = 0; i <= 8; i++) { const px = cx - r + i * r / 4; ctx.lineTo(px, cy + (i % 2 ? -0.5 : 0.3) * r); } ctx.lineTo(cx + r, cy + r); ctx.lineTo(cx - r, cy + r); ctx.closePath(); ctx.fill(); break;
    case "crown": poly([[-1, 0.7], [-1, -0.5], [-0.5, 0.1], [0, -0.9], [0.5, 0.1], [1, -0.5], [1, 0.7]]); break;
    case "sword": poly([[0, -1], [0.18, -0.7], [0.18, 0.3], [0.5, 0.3], [0.5, 0.5], [0.18, 0.5], [0.18, 1], [-0.18, 1], [-0.18, 0.5], [-0.5, 0.5], [-0.5, 0.3], [-0.18, 0.3], [-0.18, -0.7]]); break;
    case "eye": ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.quadraticCurveTo(cx, cy - r * 1.1, cx + r, cy); ctx.quadraticCurveTo(cx, cy + r * 1.1, cx - r, cy); ctx.fill(); ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2); ctx.fill(); break;
    case "leaf": ctx.beginPath(); ctx.moveTo(cx, cy + r); ctx.quadraticCurveTo(cx - r * 1.2, cy, cx, cy - r); ctx.quadraticCurveTo(cx + r * 1.2, cy, cx, cy + r); ctx.fill(); ctx.strokeStyle = detail; ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.9); ctx.lineTo(cx, cy - r * 0.6); ctx.stroke(); break;
    case "bolt": poly([[0.3, -1], [-0.5, 0.15], [0, 0.15], [-0.3, 1], [0.5, -0.15], [0, -0.15]]); break;
    case "anchor": ctx.beginPath(); ctx.arc(cx, cy - r * 0.75, r * 0.2, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy + r * 0.9); ctx.moveTo(cx - r * 0.6, cy - r * 0.2); ctx.lineTo(cx + r * 0.6, cy - r * 0.2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, r * 0.7, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); break;
    case "axe": poly([[-0.1, -1], [0.1, -1], [0.1, 1], [-0.1, 1]]); poly([[0.1, -0.9], [0.9, -0.7], [0.9, 0.1], [0.1, 0]]); break;
    case "hammer": poly([[-0.12, -0.3], [0.12, -0.3], [0.12, 1], [-0.12, 1]]); poly([[-0.8, -0.9], [0.8, -0.9], [0.8, -0.3], [-0.8, -0.3]]); break;
    case "heart": ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.9); ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.1, cx - r * 0.5, cy - r * 1.1, cx, cy - r * 0.4); ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.1, cx + r * 1.3, cy - r * 0.1, cx, cy + r * 0.9); ctx.fill(); break;
    case "diamond": poly([[0, -1], [0.75, 0], [0, 1], [-0.75, 0]]); ctx.fillStyle = detail; poly([[0, -0.5], [0.37, 0], [0, 0.5], [-0.37, 0]]); break;
    case "mountain": poly([[-1, 0.9], [-0.4, -0.5], [0, 0.1], [0.35, -0.9], [1, 0.9]]); ctx.fillStyle = detail; poly([[0.35, -0.9], [0.55, -0.4], [0.15, -0.4]]); break;
    case "sun": ctx.beginPath(); ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); } break;
    case "key": ctx.beginPath(); ctx.arc(cx - r * 0.45, cy - r * 0.35, r * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - r * 0.15, cy - r * 0.05); ctx.lineTo(cx + r * 0.9, cy + r * 0.9); ctx.moveTo(cx + r * 0.5, cy + r * 0.5); ctx.lineTo(cx + r * 0.75, cy + r * 0.25); ctx.moveTo(cx + r * 0.7, cy + r * 0.7); ctx.lineTo(cx + r * 0.95, cy + r * 0.45); ctx.stroke(); break;
    case "tower": poly([[-0.5, 1], [-0.5, -0.5], [-0.65, -0.5], [-0.65, -0.9], [-0.35, -0.9], [-0.35, -0.7], [-0.15, -0.7], [-0.15, -0.9], [0.15, -0.9], [0.15, -0.7], [0.35, -0.7], [0.35, -0.9], [0.65, -0.9], [0.65, -0.5], [0.5, -0.5], [0.5, 1]]); ctx.fillStyle = detail; poly([[-0.15, 1], [-0.15, 0.3], [0.15, 0.3], [0.15, 1]]); break;
    case "arrow": poly([[0, -1], [0.5, -0.4], [0.15, -0.4], [0.15, 1], [-0.15, 1], [-0.15, -0.4], [-0.5, -0.4]]); break;
    case "fish": ctx.beginPath(); ctx.ellipse(cx - r * 0.15, cy, r * 0.65, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); poly([[0.4, 0], [1, -0.5], [1, 0.5]]); ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(cx - r * 0.5, cy - r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill(); break;
    case "rose": for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45, r * 0.42, r * 0.28, a, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2); ctx.fill(); break;
    case "hourglass": poly([[-0.7, -1], [0.7, -1], [0.1, 0], [0.7, 1], [-0.7, 1], [-0.1, 0]]); ctx.fillStyle = detail; poly([[-0.4, -0.8], [0.4, -0.8], [0, -0.15]]); break;
    case "lantern": poly([[-0.5, -0.5], [0.5, -0.5], [0.4, 0.7], [-0.4, 0.7]]); poly([[-0.25, -0.9], [0.25, -0.9], [0.25, -0.5], [-0.25, -0.5]]); ctx.fillStyle = detail; poly([[-0.3, -0.35], [0.3, -0.35], [0.22, 0.55], [-0.22, 0.55]]); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.14, 0, Math.PI * 2); ctx.fill(); break;
    case "paw": ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.35, r * 0.5, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); for (const [px, py] of [[-0.65, -0.2], [-0.25, -0.6], [0.25, -0.6], [0.65, -0.2]]) { ctx.beginPath(); ctx.arc(cx + px * r, cy + py * r, r * 0.2, 0, Math.PI * 2); ctx.fill(); } break;
    case "cup": poly([[-0.7, -0.9], [0.7, -0.9], [0.5, 0.2], [0.15, 0.4], [0.15, 0.7], [0.5, 0.7], [0.5, 0.95], [-0.5, 0.95], [-0.5, 0.7], [-0.15, 0.7], [-0.15, 0.4], [-0.5, 0.2]]); break;
    default: poly([[-0.9, -0.9], [0.9, -0.9], [0.9, 0.2], [0, 1], [-0.9, 0.2]]); ctx.fillStyle = detail; poly([[-0.6, -0.6], [0.6, -0.6], [0.6, 0.1], [0, 0.65], [-0.6, 0.1]]); ctx.fillStyle = fg; poly([[-0.35, -0.35], [0.35, -0.35], [0.35, 0], [0, 0.35], [-0.35, 0]]);
  }
  ctx.restore();
}
/** A fellowship's banner, drawn in its colours across a band. */
export function drawBanner(ctx: CanvasRenderingContext2D, banner: string, x: number, y: number, w: number, h: number, colors: readonly string[]) {
  const [a, b, c = b, d = a] = colors, alt = (i: number) => (i % 2 ? c : b);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = a; ctx.fillRect(x, y, w, h); ctx.fillStyle = b;
  switch (banner) {
    case "split": { const g = ctx.createLinearGradient(x, y, x + w, y); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); break; }
    case "stripes": for (let px = x - h, i = 0; px < x + w; px += h, i++) { ctx.fillStyle = alt(i); ctx.beginPath(); ctx.moveTo(px, y + h); ctx.lineTo(px + h, y); ctx.lineTo(px + h / 2, y); ctx.lineTo(px - h / 2, y + h); ctx.closePath(); ctx.fill(); } break;
    case "chevrons": for (let px = x; px < x + w; px += h) { ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + h / 2, y + h / 2); ctx.lineTo(px, y + h); ctx.lineTo(px + h / 4, y + h); ctx.lineTo(px + h * 0.75, y + h / 2); ctx.lineTo(px + h / 4, y); ctx.closePath(); ctx.fill(); } break;
    case "checks": { const s = h / 3; for (let j = 0; j < 3; j++) for (let px = x; px < x + w; px += s) if ((Math.round((px - x) / s) + j) % 2 === 0) { ctx.fillStyle = j === 1 ? c : b; ctx.fillRect(px, y + j * s, s, s); } break; }
    case "stars": { let seed = 11; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; for (let i = 0; i < Math.round(w / 12); i++) { const sx = x + r() * w, sy = y + r() * h, sr = 1 + r() * 2.5; ctx.fillStyle = i % 3 === 0 ? d : alt(i); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill(); } break; }
    case "flames": for (let px = x; px < x + w; px += h / 2) { ctx.beginPath(); ctx.moveTo(px, y + h); ctx.quadraticCurveTo(px + h / 4, y + h * 0.1, px + h / 2, y + h); ctx.closePath(); ctx.fill(); } break;
    case "diagonal": { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, a); g.addColorStop(0.5, a); g.addColorStop(0.5, b); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); break; }
    case "quarters": ctx.fillRect(x, y, w / 2, h / 2); ctx.fillRect(x + w / 2, y + h / 2, w / 2, h / 2); break;
    case "border": { const t = Math.max(3, h / 7); ctx.fillRect(x, y, w, t); ctx.fillRect(x, y + h - t, w, t); ctx.fillRect(x, y, t, h); ctx.fillRect(x + w - t, y, t, h); ctx.fillStyle = c; ctx.fillRect(x + t, y + t, w - 2 * t, Math.max(1, t / 3)); ctx.fillRect(x + t, y + h - t - Math.max(1, t / 3), w - 2 * t, Math.max(1, t / 3)); break; }
    case "dots": { const s = h / 4; for (let j = 0; j < 4; j++) for (let px = x + s / 2; px < x + w; px += s) { ctx.fillStyle = alt(j); ctx.beginPath(); ctx.arc(px + (j % 2 ? s / 2 : 0), y + j * s + s / 2, s * 0.22, 0, Math.PI * 2); ctx.fill(); } break; }
    case "zigzag": ctx.beginPath(); ctx.moveTo(x, y + h); for (let px = x; px <= x + w; px += h / 2) { ctx.lineTo(px, y + h * 0.3); ctx.lineTo(px + h / 4, y + h * 0.7); } ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); break;
    case "sunburst": for (let i = 0; i < 12; i++) { const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 0.5) / 12) * Math.PI * 2, R = w; ctx.fillStyle = alt(i); ctx.beginPath(); ctx.moveTo(x + w / 2, y + h / 2); ctx.lineTo(x + w / 2 + Math.cos(a0) * R, y + h / 2 + Math.sin(a0) * R); ctx.lineTo(x + w / 2 + Math.cos(a1) * R, y + h / 2 + Math.sin(a1) * R); ctx.closePath(); ctx.fill(); } break;
    case "cross": { const t = Math.max(4, h / 4); ctx.fillRect(x, y + (h - t) / 2, w, t); ctx.fillRect(x + w * 0.3 - t / 2, y, t, h); break; }
    case "fade": { const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, b); g.addColorStop(0.55, c); g.addColorStop(1, a); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); break; }
    case "waves": for (let row = 0; row < 3; row++) { ctx.strokeStyle = alt(row); ctx.beginPath(); ctx.moveTo(x, y + h * (0.3 + row * 0.3)); for (let px = x; px <= x + w; px += h / 2) ctx.quadraticCurveTo(px + h / 4, y + h * (0.1 + row * 0.3), px + h / 2, y + h * (0.3 + row * 0.3)); ctx.lineWidth = Math.max(2, h / 12); ctx.stroke(); } break;
    default: break;
  }
  if (colors.length >= 4) { ctx.fillStyle = d; ctx.fillRect(x, y, w, Math.max(1, h / 18)); ctx.fillRect(x, y + h - Math.max(1, h / 18), w, Math.max(1, h / 18)); }
  ctx.restore();
}
/** A small preview canvas of an emblem or a banner, for menus. */
export function previewArt(kind: "logo" | "banner", id: string, colors: readonly string[], w = 48, h = 48): HTMLCanvasElement {
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

// ---------- Recruiting: a join link good for a day, and what it says ----------
export const INVITE_HOURS = 24, GAME_URL = "https://m4s4t0-v01d.github.io/rarefriends-realm/";
const b64 = (text: string) => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (text: string) => decodeURIComponent(escape(atob(text.replace(/-/g, "+").replace(/_/g, "/"))));
export type Invite = { name: string; tag: string; logo?: string; banner?: string; colors?: string[]; since?: number; expires: number };
/** A link that joins your fellowship (its look comes along), good for a day. */
export function inviteLink(fellowship: { name: string; tag: string; logo?: string; banner?: string; colors?: string[]; since?: number }, now = Date.now()): string {
  const token = b64(JSON.stringify({ n: fellowship.name, t: fellowship.tag, l: fellowship.logo, b: fellowship.banner, c: fellowship.colors, s: fellowship.since, e: now + INVITE_HOURS * 3_600_000 }));
  return `${GAME_URL}?join=${token}`;
}
/** The invitation in a link, if it's sound and still good. */
export function parseInvite(token: unknown, now = Date.now()): Invite | null {
  if (typeof token !== "string" || token.length > 600) return null;
  try {
    const r = JSON.parse(unb64(token)) as Record<string, unknown>;
    if (typeof r.n !== "string" || !/^[A-Za-z0-9 '_-]{2,16}$/.test(r.n) || /^\d+$/.test(r.n) || typeof r.t !== "string" || !/^[A-Z0-9]{2,5}$/.test(r.t) || typeof r.e !== "number" || r.e < now || r.e > now + INVITE_HOURS * 3_600_000 + 60_000) return null;
    const look = cleanFellowshipLook({ name: r.n, tag: r.t }, { logo: r.l, banner: r.b, colors: r.c, since: r.s });
    return { ...look, expires: r.e };
  } catch { return null; }
}
export const daysSince = (day: number | undefined, now = Date.now()) => day ? Math.max(0, Math.floor(now / 86_400_000) - day) : 0;
