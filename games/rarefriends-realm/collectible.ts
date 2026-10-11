/**
 * The collectible adventurer card: a portrait, playing-card-shaped picture (750 × 1050, two and a half by three and a
 * half) for collections, galleries and the Realm's own card collection. It is a second format, not a resized
 * adventurer card: the landscape card (card.ts) keeps its own layouts, size and styles for sharing, and nothing here
 * touches them. Each collectible layout is versioned on its own, so a card made from a layout keeps the picture it was
 * made with when the layout is later changed (a new look is a new version).
 *
 * What the card shows is read once into `CollectibleFacts`: the picture and anything that later vouches for the card
 * (a snapshot, a mint) describe the same thing. Only public attributes are read; what's in the bank, what's bound to
 * the character and anything bought stays off the card. Nothing here is a Friend's own state: a card can only ever carry
 * Realm progress (XP, eligible items) between characters, never a Friend's generation, family or anything on chain.
 *
 * This module has no DOM in it (the engine and the tests load it); the drawing is in collectibleart.ts.
 */
import { EQUIP_SLOTS, FAMILY_NAMES, ITEM_LIST, SKILLS, SKILL_NAMES, levelForXp, type Skill } from "./data.ts";
import { MAX_QUEST_POINTS, questPoints } from "./content.ts";
import { ACHIEVEMENTS, achieved } from "./achievements.ts";
import { combatLevel, totalLevel, type Game } from "./state.ts";
import { titleName } from "./presence.ts";
import { CARDS, cardsFound } from "./codex.ts";
import { cardUnlocked, type CardOption } from "./cardstyle.ts";

export const COLLECTIBLE: { readonly width: number; readonly height: number } = { width: 750, height: 1050 };
/** A layout of the collectible card: its own name, look and version. Unlocks work as the adventurer card's (Presence, quests, achievements). */
export type CollectibleLayout = CardOption & { version: number; dark: boolean; paper: string; trim: string; accent: string };
export const COLLECTIBLE_LAYOUTS: readonly CollectibleLayout[] = [
  { id: "classic", name: "Classic Adventurer", version: 1, text: "Your Friend above, your skills below, on the Realm's paper.", dark: false, paper: "#efede7", trim: "#161616", accent: "#e2c46a" },
  { id: "skillmaster", name: "Skill Master", version: 1, text: "Every skill, large, your best three in gold.", presence: 10, dark: false, paper: "#e8e2d0", trim: "#3a2e14", accent: "#c9a227" },
  { id: "legendary", name: "Legendary Build", version: 1, text: "Your gear and your combat, in black and gold.", achievements: 15, dark: true, paper: "#15151a", trim: "#e2c46a", accent: "#e2c46a" },
  { id: "champion", name: "Quest Champion", version: 1, text: "Your quest points and achievements, on royal blue.", presence: 20, dark: true, paper: "#1d2a52", trim: "#c9d4f2", accent: "#e2c46a" },
  { id: "collector", name: "Collector's Edition", version: 1, text: "Cards found, pets, achievements: a collector's frame.", achievements: 25, dark: false, paper: "#f4ead2", trim: "#5a1f2e", accent: "#8a3a4a" },
  { id: "minimalist", name: "Minimalist", version: 1, text: "Name, levels, Friend. Nothing else.", dark: false, paper: "#ffffff", trim: "#161616", accent: "#161616" },
];
/** The public attributes a card may show. (Nothing here is money, bank or bound.) */
export const COLLECTIBLE_ATTRIBUTES: readonly { id: string; name: string }[] = [
  { id: "skills", name: "Skill levels" }, { id: "combat", name: "Combat statistics" }, { id: "gear", name: "Equipped gear" },
  { id: "quests", name: "Quest points" }, { id: "achievements", name: "Achievements" }, { id: "generation", name: "Generation" },
];
export type CollectibleChoice = { layout: string; show: string[] };
export const DEFAULT_COLLECTIBLE: CollectibleChoice = { layout: "classic", show: ["skills", "combat", "quests", "generation"] };
/** The choices as saved: a known layout, known attributes, nothing else. */
export function cleanCollectible(raw: unknown): CollectibleChoice {
  const out: CollectibleChoice = { layout: DEFAULT_COLLECTIBLE.layout, show: [...DEFAULT_COLLECTIBLE.show] };
  if (!raw || typeof raw !== "object") return out;
  const { layout, show } = raw as Record<string, unknown>;
  if (typeof layout === "string" && COLLECTIBLE_LAYOUTS.some(entry => entry.id === layout)) out.layout = layout;
  if (Array.isArray(show)) out.show = COLLECTIBLE_ATTRIBUTES.map(entry => entry.id).filter(id => show.includes(id));
  return out;
}
/** The choices in force: a locked layout falls back to the first. */
export function collectibleChoice(game: Game): CollectibleChoice {
  const picked = cleanCollectible(game.player.collectible), layout = COLLECTIBLE_LAYOUTS.find(entry => entry.id === picked.layout);
  return { layout: layout && cardUnlocked(game, layout) ? layout.id : COLLECTIBLE_LAYOUTS[0].id, show: picked.show };
}

/** What a card shows, read once from the adventure: the picture, and whatever vouches for it later, describe this. */
export type CollectibleFacts = {
  v: 1; friendId: number; name: string | null; family: string; title: string | null; generation: number | null;
  combat: number; total: number; skills: Record<Skill, number>; gear: string[]; questPoints: number; maxQuestPoints: number;
  achievements: number; maxAchievements: number; cardsFound: number; pets: number; kills: number; at: number;
};
export function collectibleFacts(game: Game, generation: number | null = null, now = Date.now()): CollectibleFacts {
  const player = game.player;
  return {
    v: 1, friendId: player.friendId, name: player.name, family: FAMILY_NAMES[player.familyId], title: titleName(player.title) || null, generation,
    combat: combatLevel(player), total: totalLevel(player), skills: Object.fromEntries(SKILLS.map(skill => [skill, levelForXp(player.xp[skill])])) as Record<Skill, number>,
    gear: EQUIP_SLOTS.flatMap(slot => { const id = player.equipment[slot]; const item = id ? ITEM_LIST.find(entry => entry.id === id) : null; return item ? [item.name] : []; }),
    questPoints: questPoints(game), maxQuestPoints: MAX_QUEST_POINTS, achievements: achieved(game), maxAchievements: ACHIEVEMENTS.length,
    cardsFound: cardsFound(game), pets: player.pets.length, kills: player.kills, at: now,
  };
}
