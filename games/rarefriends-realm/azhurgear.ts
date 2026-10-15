/**
 * The Labyrinth of Azhur's things (azhur.ts builds the Gate of Azhur in the Sea of Dunes and the labyrinth under it):
 * the three keys its Heart wants, what the Keeper of the Measure keeps, and what hunts the passages. A leaf (types
 * only), so data.ts can list them.
 */
import type { Drop, Item, MonsterDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });

/** The three keys, each on its shrine at one of the labyrinth's far ends. */
export const AZHUR_KEYS = [
  { id: "measure", item: "key_of_measure", name: "Key of Measure", shrine: "The Shrine of Measure", color: "#c9a050" },
  { id: "water", item: "key_of_water", name: "Key of Water", shrine: "The Shrine of Water", color: "#4f8fc0" },
  { id: "name", item: "key_of_the_name", name: "Key of the Name", shrine: "The Shrine of the Name", color: "#9a6ab0" },
] as const;

export const AZHUR_ITEMS: readonly Item[] = [
  ...AZHUR_KEYS.map((k): Item => ({ id: k.item, name: k.name, examine: `A key of Azhurak bronze as long as a forearm, its bow cut with one glyph. The Heart of the labyrinth has a lock for it.`, value: 0, tradeable: false,
    icon: { shape: "key", color: k.color, accent: "#3a3640" } })),
  { id: "rod_of_the_measure", name: "Rod of the Measure", examine: "A measuring rod of black bronze, notched along its length in Azhurak counts. It measures spells out, and wastes none of them.", value: 34000,
    icon: { shape: "staff", color: "#3a3640", accent: "#c9a050" }, equip: { slot: "weapon", bonuses: { magic: 24, attack: 6, defence: 6 }, requires: { magic: 75 } } },
  { id: "labyrinth_cloak", name: "Cloak of the Labyrinth", examine: "A long cloak of sand-coloured linen, a maze worked into it in thread of gold. Whoever wears it never quite loses their way.", value: 22000,
    icon: { shape: "cape", color: "#cfae7e", accent: "#c9a050" }, equip: { slot: "cape", bonuses: { defence: 8, ranged: 6, magic: 6 }, requires: { defence: 60 } } },
];

export const AZHUR_MONSTERS: Record<string, MonsterDef> = {
  azhur_hound: { id: "azhur_hound", name: "Hound of Azhur", level: 66, hp: 96, attack: 56, strength: 58, defence: 48, magicDef: 30, attackBonus: 30, defenceBonus: 34, maxHit: 10, speed: 4, respawn: 40, wander: 6, aggressive: true, poisonImmune: true, art: 238, ink: "#2a2830",
    examine: "A long, jackal-headed hound of black basalt. It hunts the labyrinth by smell, and it never gets lost.", always: [], drops: [coins(80, 360, 0.7), one("rough_moonstone", 0.03), one("crystal_shard", 0.2, 1, 2)] },
  shrine_keeper: { id: "shrine_keeper", name: "Shrine keeper", level: 80, hp: 140, attack: 64, strength: 66, defence: 70, magicDef: 50, attackBonus: 36, defenceBonus: 50, maxHit: 12, speed: 6, respawn: 80, wander: 2, aggressive: true, poisonImmune: true, size: 2, art: 236, ink: "#c9a050",
    examine: "A guardian of lapis and sandstone, set to keep a shrine and a key. It has been keeping them a long time.", always: [], drops: [coins(200, 900, 1), one("star_sigil", 0.25, 4, 10), one("rough_rosestone", 0.08)] },
  keeper_of_the_measure: { id: "keeper_of_the_measure", name: "The Keeper of the Measure", level: 134, hp: 420, attack: 110, strength: 116, defence: 112, magicDef: 72, attackBonus: 60, defenceBonus: 78, maxHit: 20, speed: 6, respawn: 180, wander: 2, aggressive: true, poisonImmune: true, enrage: true, size: 3, art: 244, ink: "#3a3640",
    examine: "The labyrinth's heart and its keeper: a colossus of black bronze holding a measuring rod, set here by Azhurak to keep the measure of everything below. It has measured you already.", always: [coins(2000, 6000, 1)],
    drops: [one("rod_of_the_measure", 0.05), one("labyrinth_cloak", 0.05), one("star_sigil", 0.4, 10, 25), one("rarite_bar", 0.3, 1, 3), one("gold_scarab", 0.3, 1, 2)] },
};
