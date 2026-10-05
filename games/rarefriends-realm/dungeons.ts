/**
 * Dungeon coffers: every dungeon has chests with random loot that belongs there (coins, bones, sigils, ore, the odd
 * gem), a slim chance at something rare, and sometimes the key to that dungeon's locked door. A coffer searched is
 * empty for a while; the named hoards behind the bosses are richer.
 */
import { item, type Drop } from "./data.ts";
import { addXp, give, giveOrDrop, message, sound, type Game } from "./state.ts";
import { regionAt, type RegionId, type WorldObject } from "./world.ts";
import { searchCryptChest } from "./content.ts";

type Tier = "shallow" | "deep" | "dread";
const TIER: Partial<Record<RegionId, Tier>> = { root_cellars: "shallow", mossy_undercroft: "shallow", crypt: "shallow", sea_cave: "shallow", deepglass: "shallow", hollow_depths: "deep", catacombs: "deep", deep_mine: "deep", drowned_archive: "deep", wyrm_lair: "dread", howling_vault: "dread" };
/** The key a dungeon's coffers can hold. */
const KEYS: Partial<Record<RegionId, string>> = { mossy_undercroft: "moss_key", deepglass: "deepglass_key", drowned_archive: "archive_key", howling_vault: "vault_key" };
/** Ticks before a coffer fills again (fifteen minutes). */
export const COFFER_TICKS = 1500;
/** `chance` here is a weight, not a probability: the commons are drawn by weight. */
const COMMON: Record<Tier, readonly Drop[]> = {
  shallow: [{ item: "coins", min: 40, max: 200, chance: 3 }, { item: "bones", min: 1, max: 3, chance: 2 }, { item: "bloom_sigil", min: 3, max: 8, chance: 1.5 }, { item: "breeze_sigil", min: 4, max: 10, chance: 1.5 },
    { item: "blackiron_arrow", min: 10, max: 25, chance: 1 }, { item: "moonsilver_ore", min: 1, max: 2, chance: 1 }, { item: "crystal_shard", min: 1, max: 2, chance: 0.8 }, { item: "rough_sagestone", min: 1, max: 1, chance: 0.4 }, { item: "bat_wing", min: 2, max: 5, chance: 0.6 }],
  deep: [{ item: "coins", min: 150, max: 600, chance: 3 }, { item: "large_bones", min: 1, max: 2, chance: 1.5 }, { item: "shade_sigil", min: 3, max: 8, chance: 1.5 }, { item: "hollow_sigil", min: 2, max: 5, chance: 1 }, { item: "thought_sigil", min: 3, max: 8, chance: 1.2 },
    { item: "glimmer_ore", min: 1, max: 2, chance: 1 }, { item: "rarite_ore", min: 1, max: 1, chance: 0.5 }, { item: "grave_dust", min: 1, max: 3, chance: 1 }, { item: "rough_rosestone", min: 1, max: 1, chance: 0.4 }, { item: "ink_page", min: 1, max: 1, chance: 0.5 }],
  dread: [{ item: "coins", min: 500, max: 1800, chance: 3 }, { item: "rarite_bar", min: 1, max: 2, chance: 1 }, { item: "hollow_essence", min: 1, max: 1, chance: 0.6 }, { item: "star_sigil", min: 5, max: 12, chance: 1.5 }, { item: "path_sigil", min: 3, max: 8, chance: 1.2 },
    { item: "grave_dust", min: 2, max: 5, chance: 1.2 }, { item: "large_bones", min: 2, max: 3, chance: 1.5 }, { item: "rough_rosestone", min: 1, max: 1, chance: 0.6 }, { item: "glimmer_ore", min: 2, max: 4, chance: 1 }],
};
const RARE: Record<Tier, readonly string[]> = {
  shallow: ["insight_lamp", "glimmer_helm", "crystal_shield", "oak_bow"],
  deep: ["insight_lamp", "glimmer_cuirass", "rarite_helm", "archivist_cowl", "hollowsteel_helm"],
  dread: ["insight_lamp", "vault_helm", "howling_cape", "rarite_sabre", "wyrmscale_shield", "hollowsteel_sabre"],
};
/** The chance of a rare from a coffer; a named hoard doubles it. */
const RARE_CHANCE: Record<Tier, number> = { shallow: 0.04, deep: 0.06, dread: 0.08 };
const KEY_CHANCE = 0.15;
/** The old named chests, and the new bosses' hoards: richer than a coffer. */
const RICH = /hoard|Archivist's chest|Foreman's chest|Barnacled chest|Ossuary chest|Dusty chest/;

function pick<T extends { chance: number }>(rng: () => number, from: readonly T[]): T {
  const total = from.reduce((sum, entry) => sum + entry.chance, 0);
  let roll = rng() * total;
  for (const entry of from) { roll -= entry.chance; if (roll <= 0) return entry; }
  return from[from.length - 1];
}
/** The tier of the dungeon a coffer stands in (none above ground). */
export function cofferTier(game: Game, object: WorldObject): Tier | null { return TIER[regionAt(game.world, object.x, object.y).id] ?? null; }
/** Search a chest: the crypt's quest chest first, then the coffer's loot. */
export function searchChest(game: Game, object: WorldObject) {
  if (object.name === "Old chest" && (game.player.quests.hollow_whispers ?? 0) < 2) { searchCryptChest(game); return; }
  const tier = cofferTier(game, object);
  if (!tier) { message(game, "The chest is empty apart from dust."); return; }
  const key = `coffer_${object.x}_${object.y}`, last = game.player.questData[key];
  if (last !== undefined && game.tick - last < COFFER_TICKS) { message(game, "You searched this coffer not long ago. Whatever fills it hasn't been back yet."); return; }
  game.player.questData[key] = game.tick;
  const rich = RICH.test(object.name), rng = game.rng, found: string[] = [];
  const rolls = (rich ? 3 : 2) + Math.floor(rng() * 2), chosen = new Set<string>();
  for (let i = 0; i < rolls; i++) {
    const drop = pick(rng, COMMON[tier].filter(entry => !chosen.has(entry.item)));
    chosen.add(drop.item);
    const n = drop.min + Math.floor(rng() * (drop.max - drop.min + 1));
    if (drop.item === "coins") give(game.player, "coins", n); else giveOrDrop(game, drop.item, n);
    found.push(n > 1 ? `${n} ${item(drop.item).name.toLowerCase()}` : item(drop.item).name.toLowerCase());
  }
  const dungeonKey = KEYS[regionAt(game.world, object.x, object.y).id];
  if (dungeonKey && rng() < KEY_CHANCE * (rich ? 2 : 1)) { giveOrDrop(game, dungeonKey); found.push(`a ${item(dungeonKey).name.toLowerCase()}`); }
  let rare: string | null = null;
  if (rng() < RARE_CHANCE[tier] * (rich ? 2 : 1)) { rare = RARE[tier][Math.floor(rng() * RARE[tier].length)]; giveOrDrop(game, rare); found.push(`and ${item(rare).name}!`); }
  game.player.stats.coffers = (game.player.stats.coffers ?? 0) + 1;
  addXp(game, "presence", rich ? 6 : 2.5, { raw: true });
  message(game, `${rich ? "The hoard" : "The coffer"} holds ${found.join(", ")}.`, rare ? "quest" : "game");
  sound(game, rare ? "quest" : "coins");
}
