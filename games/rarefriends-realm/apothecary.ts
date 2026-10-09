/**
 * Apothecary: gathering the Realm's herbs and turning them into tonics, potions, poisons, antidotes and, at the top of
 * the skill, mixtures made for one Friend family alone.
 *
 * The chain: pick a herb (raw) → Clean it → grind some (pestle and mortar) → distil a few into essences at a still →
 * brew with a vial of water. Every ecosystem grows its own herbs, so the world itself is part of the skill: forest,
 * swamp, mountain, Deadwood, Ashfall, coast and desert each have a common herb, an uncommon one and a rare one.
 * This module is data and pure helpers; the engine does the picking, brewing and drinking.
 */
import type { IconShape, Item, Skill } from "./data.ts";
import type { Recipe } from "./state.ts";
import type { RegionId } from "./world.ts";

export type Ecosystem = "forest" | "swamp" | "mountain" | "deadwood" | "ashfall" | "coast" | "desert" | "mizukai";
export type HerbDef = {
  id: string; name: string; eco: Ecosystem; level: number; xp: number; shape: IconShape; color: string; accent: string;
  /** How often it grows (how many patches per region), its respawn, and whether a patch gives several picks. */
  rarity: "common" | "uncommon" | "rare" | "very rare"; respawn: number; picks: number; examine: string;
};
/** Where each ecosystem's herbs grow (region ids; the mainland's own regions included, on empty ground only). */
export const ECO_REGIONS: Record<Ecosystem, readonly RegionId[]> = {
  forest: ["whisperwood", "fernwick", "westmarch", "thistle_vale", "the_wilds", "southshore"],
  swamp: ["murkmire", "deadwood", "dyemoor"],
  mountain: ["greyhorn", "ironreach", "drakespine", "frostpeak"],
  deadwood: ["deadwood"],
  ashfall: ["ashfall", "wyrmreach"],
  coast: ["coast", "saltmarrow", "pale_isles", "southshore"],
  desert: ["pale_dunes"],
  mizukai: ["hinode", "kibi", "kusabana", "old_cedars", "whispering_bamboo", "morishima"],
};
export const HERBS: readonly HerbDef[] = [
  // Forest: healing herbs, roots, flowers and bark.
  { id: "feverleaf", name: "Feverleaf", eco: "forest", level: 1, xp: 8, shape: "herb", color: "#7fa86a", accent: "#e2d49e", rarity: "common", respawn: 40, picks: 3, examine: "A broad leaf that cools a fever. The first herb every apothecary learns." },
  { id: "oakroot", name: "Oakroot", eco: "forest", level: 10, xp: 14, shape: "herb", color: "#8a6446", accent: "#c49a74", rarity: "common", respawn: 60, picks: 2, examine: "A knotted root, bitter and strengthening." },
  { id: "moonpetal", name: "Moonpetal", eco: "forest", level: 25, xp: 26, shape: "herb", color: "#c6bed4", accent: "#efede7", rarity: "uncommon", respawn: 120, picks: 2, examine: "A pale flower that opens at night. It smells of rain." },
  { id: "yewbark", name: "Yewbark", eco: "forest", level: 40, xp: 40, shape: "herb", color: "#7d6b5c", accent: "#b0443c", rarity: "rare", respawn: 220, picks: 1, examine: "Bark stripped from an old yew. Poisonous in the wrong hands, which is most of them." },
  // Swamp: poisons, mushrooms, bog roots and strange fungi.
  { id: "bogcap", name: "Bogcap", eco: "swamp", level: 5, xp: 11, shape: "mushroom", color: "#8a8f6a", accent: "#4f5234", rarity: "common", respawn: 50, picks: 3, examine: "A squat brown mushroom. Don't eat it. Do bottle it." },
  { id: "marshroot", name: "Marshroot", eco: "swamp", level: 20, xp: 22, shape: "herb", color: "#6d6b4a", accent: "#a5a67d", rarity: "common", respawn: 70, picks: 2, examine: "A black root that pulls out of the bog with a sigh." },
  { id: "blackgill", name: "Blackgill", eco: "swamp", level: 45, xp: 48, shape: "mushroom", color: "#3b3a40", accent: "#8a62c8", rarity: "rare", respawn: 240, picks: 1, examine: "A fungus with black gills and a violet sheen. One of the Realm's true poisons." },
  // Mountains: alpine flowers, mineral-rich mosses, rare roots.
  { id: "frostbloom", name: "Frostbloom", eco: "mountain", level: 15, xp: 18, shape: "herb", color: "#bcd8e8", accent: "#efede7", rarity: "common", respawn: 70, picks: 2, examine: "A flower that blooms through snow." },
  { id: "ironmoss", name: "Ironmoss", eco: "mountain", level: 30, xp: 32, shape: "herb", color: "#6f7a4a", accent: "#8a8780", rarity: "uncommon", respawn: 120, picks: 2, examine: "Rust-coloured moss off the high rocks. It tastes of nails." },
  { id: "skyroot", name: "Skyroot", eco: "mountain", level: 55, xp: 62, shape: "herb", color: "#8fa3c9", accent: "#efede7", rarity: "rare", respawn: 280, picks: 1, examine: "A root that only grows where the air is thin." },
  // The Deadwood: ghost mushrooms, grave flowers, corrupted vines.
  { id: "ghostcap", name: "Ghostcap", eco: "deadwood", level: 35, xp: 36, shape: "mushroom", color: "#e8e4dc", accent: "#b49ae0", rarity: "common", respawn: 90, picks: 2, examine: "A mushroom that glows faintly in the dark. It grows where the dead walk." },
  { id: "graveflower", name: "Graveflower", eco: "deadwood", level: 50, xp: 55, shape: "herb", color: "#4a3a60", accent: "#efede7", rarity: "uncommon", respawn: 160, picks: 2, examine: "A purple flower that grows from graves and nowhere else." },
  { id: "wraithvine", name: "Wraithvine", eco: "deadwood", level: 70, xp: 84, shape: "herb", color: "#2a2438", accent: "#8a62c8", rarity: "rare", respawn: 320, picks: 1, examine: "A vine that isn't quite there. It is cold to pick." },
  // Ashfall: fire-resistant herbs, volcanic roots and the dragons' own weed.
  { id: "cinderbloom", name: "Cinderbloom", eco: "ashfall", level: 60, xp: 70, shape: "herb", color: "#e3734f", accent: "#f2e28f", rarity: "common", respawn: 120, picks: 2, examine: "An orange flower that grows in hot ash and never scorches." },
  { id: "emberroot", name: "Emberroot", eco: "ashfall", level: 75, xp: 92, shape: "herb", color: "#a0462a", accent: "#f0a050", rarity: "uncommon", respawn: 200, picks: 1, examine: "A root that stays warm for days after it's pulled." },
  { id: "wyrmtongue", name: "Wyrmtongue", eco: "ashfall", level: 85, xp: 120, shape: "herb", color: "#6f8a5c", accent: "#e3734f", rarity: "very rare", respawn: 500, picks: 1, examine: "A forked red-green leaf. The drakes eat it. Nobody knows why." },
  // Coast: salt herbs, kelp, and a weed with pearls in it.
  { id: "saltwort", name: "Saltwort", eco: "coast", level: 1, xp: 8, shape: "herb", color: "#9fb07a", accent: "#efede7", rarity: "common", respawn: 40, picks: 3, examine: "A salty succulent off the dunes. Chew it for the walk." },
  { id: "kelp", name: "Kelp", eco: "coast", level: 12, xp: 15, shape: "herb", color: "#4f6a4a", accent: "#8fb3c9", rarity: "common", respawn: 50, picks: 3, examine: "A long wet ribbon of weed. Good in a draught, better in a stew." },
  { id: "pearlweed", name: "Pearlweed", eco: "coast", level: 65, xp: 76, shape: "herb", color: "#d9d4e6", accent: "#8fb3c9", rarity: "rare", respawn: 300, picks: 1, examine: "A pale weed with a pearl in every frond. The Pale Isles' own." },
  // Desert: drought plants and a rare medicinal rose.
  { id: "sunthorn", name: "Sunthorn", eco: "desert", level: 20, xp: 22, shape: "herb", color: "#a9b59c", accent: "#e2b84a", rarity: "common", respawn: 70, picks: 2, examine: "A cactus pad, spines and all. The juice keeps you walking." },
  // The Mizukai Isles: Kibi's tea, the shrine's herbs, and the rare spirit bell that rings when nobody touches it.
  { id: "tea_leaf", name: "Tea leaf", eco: "mizukai", level: 5, xp: 10, shape: "herb", color: "#6f9a4a", accent: "#c9d9a6", rarity: "common", respawn: 40, picks: 3, examine: "A young tea leaf from Kibi's bushes, two leaves and a bud." },
  { id: "shiso", name: "Shiso", eco: "mizukai", level: 18, xp: 22, shape: "herb", color: "#7a3a4a", accent: "#c98f95", rarity: "common", respawn: 60, picks: 2, examine: "A purple-green leaf with a sharp, clean taste. It settles a poisoned stomach." },
  { id: "moon_mugwort", name: "Moon mugwort", eco: "mizukai", level: 34, xp: 40, shape: "herb", color: "#a9b8a0", accent: "#efe6d2", rarity: "uncommon", respawn: 120, picks: 2, examine: "Silver-backed mugwort picked by moonlight. Burnt, its smoke keeps spirits at arm's length." },
  { id: "kumo_root", name: "Kumo root", eco: "mizukai", level: 50, xp: 58, shape: "herb", color: "#8a6a4a", accent: "#e2d49e", rarity: "uncommon", respawn: 160, picks: 2, examine: "A gnarled mountain root the shrine priests chew before the long rites." },
  { id: "spirit_bell", name: "Spirit bell", eco: "mizukai", level: 68, xp: 80, shape: "herb", color: "#d9d4e6", accent: "#b5452f", rarity: "rare", respawn: 300, picks: 1, examine: "A white bell-flower with a red throat. It rings when nobody touches it, and the foxes come to listen." },
  { id: "dunerose", name: "Dunerose", eco: "desert", level: 48, xp: 52, shape: "herb", color: "#c98f95", accent: "#e2b84a", rarity: "rare", respawn: 240, picks: 1, examine: "A rose that blooms one morning a year in the dunes. Quiet, like the sand." },
];
export const herbDef = (id: string) => HERBS.find(herb => herb.id === id);
/** Herbs that are also ground (pestle and mortar) for stronger brews. */
export const GROUND_HERBS = ["oakroot", "marshroot", "ironmoss", "blackgill", "skyroot", "graveflower", "wraithvine", "emberroot", "kumo_root"] as const;
/** Essences distilled at a still (two clean herbs each), for the high brews and the Friend mixtures. */
export const ESSENCES = [
  { id: "moon_essence", name: "Moon essence", herb: "moonpetal", level: 32, xp: 60, color: "#c6bed4" },
  { id: "grave_essence", name: "Grave essence", herb: "graveflower", level: 56, xp: 110, color: "#4a3a60" },
  { id: "ember_essence", name: "Ember essence", herb: "cinderbloom", level: 64, xp: 130, color: "#e3734f" },
  { id: "pearl_essence", name: "Pearl essence", herb: "pearlweed", level: 70, xp: 150, color: "#d9d4e6" },
  { id: "wyrm_essence", name: "Wyrm essence", herb: "wyrmtongue", level: 88, xp: 240, color: "#6f8a5c" },
  { id: "spirit_essence", name: "Spirit essence", herb: "spirit_bell", level: 72, xp: 160, color: "#d9d4e6" },
] as const;

/** What a drink does. Boosts are [flat, fraction of level], and wear off a point at a time. */
export type PotionEffect = {
  heal?: number; energy?: number; faith?: number;
  boost?: Partial<Record<Skill, readonly [number, number]>>;
  /** Ticks of protection: antidote (cures too), antifire (dragonfire halved), stealth (harder to notice), tonic (run energy returns twice as fast). */
  antidote?: number; antifire?: number; stealth?: number; tonic?: number;
  /** Ticks of a spirit ward (the Mizukai Isles): wayward spirits don't come for you, and strike a fifth more softly. */
  spiritWard?: number;
  /** A weapon poison: coat your wielded melee weapon for this many hits; each poisoned hit does `damage` four times, every eight ticks. `weaken` also saps the creature's defence. */
  poison?: { damage: number; charges: number; weaken?: boolean };
  /** A Friend mixture: the family it's made for, and how long its effect lasts (ticks). */
  mixture?: { family: number; ticks: number };
};
export type PotionDef = { id: string; name: string; level: number; xp: number; inputs: Readonly<Record<string, number>>; color: string; accent?: string; examine: string; effect: PotionEffect; value: number };
export const POTIONS: readonly PotionDef[] = [
  { id: "healing_tonic", name: "Healing tonic", level: 1, xp: 20, inputs: { clean_feverleaf: 1, vial_of_water: 1 }, color: "#8fbf9a", examine: "Feverleaf in water. Heals 8.", effect: { heal: 8 }, value: 30 },
  { id: "saltwort_tonic", name: "Saltwort tonic", level: 3, xp: 22, inputs: { clean_saltwort: 1, vial_of_water: 1 }, color: "#9fb07a", examine: "Salty and bracing. Restores 30 run energy and heals a little.", effect: { energy: 30, heal: 2 }, value: 35 },
  { id: "weak_poison", name: "Weak poison", level: 10, xp: 36, inputs: { clean_bogcap: 1, vial_of_water: 1 }, color: "#8a8f6a", accent: "#4f5234", examine: "Bogcap in water. Coat a melee weapon: 20 poisoned hits of 2 damage, four times each.", effect: { poison: { damage: 2, charges: 20 } }, value: 60 },
  { id: "attack_potion", name: "Attack potion", level: 12, xp: 42, inputs: { ground_oakroot: 1, vial_of_water: 1 }, color: "#c98f95", examine: "Ground oakroot. Boosts Attack by 3 + 10% of your level.", effect: { boost: { attack: [3, 0.1] } }, value: 80 },
  { id: "antidote", name: "Antidote", level: 16, xp: 50, inputs: { clean_marshroot: 1, clean_saltwort: 1, vial_of_water: 1 }, color: "#efede7", accent: "#8fbf9a", examine: "Marshroot and saltwort. Cures poison and keeps it off for five minutes.", effect: { antidote: 500 }, value: 120 },
  { id: "energy_draught", name: "Energy draught", level: 18, xp: 54, inputs: { clean_kelp: 1, ground_oakroot: 1, vial_of_water: 1 }, color: "#8fb3c9", examine: "Kelp and oakroot. Restores 60 run energy.", effect: { energy: 60 }, value: 90 },
  { id: "strength_potion", name: "Strength potion", level: 22, xp: 62, inputs: { ground_marshroot: 1, vial_of_water: 1 }, color: "#8fbf9a", accent: "#4f7a4a", examine: "Ground marshroot. Boosts Strength by 3 + 10% of your level.", effect: { boost: { strength: [3, 0.1] } }, value: 110 },
  { id: "wayfarer_tonic", name: "Wayfarer's tonic", level: 25, xp: 66, inputs: { clean_sunthorn: 1, vial_of_water: 1 }, color: "#e2b84a", examine: "Sunthorn juice. Run energy comes back twice as fast for five minutes.", effect: { tonic: 500 }, value: 120 },
  { id: "defence_potion", name: "Defence potion", level: 28, xp: 72, inputs: { ground_ironmoss: 1, vial_of_water: 1 }, color: "#8fa3c9", examine: "Ground ironmoss. Boosts Defence by 3 + 10% of your level.", effect: { boost: { defence: [3, 0.1] } }, value: 130 },
  { id: "ranged_potion", name: "Ranged potion", level: 34, xp: 84, inputs: { clean_frostbloom: 1, ground_oakroot: 1, vial_of_water: 1 }, color: "#a5a67d", examine: "Frostbloom and oakroot. Boosts Ranged by 3 + 10% of your level.", effect: { boost: { ranged: [3, 0.1] } }, value: 150 },
  { id: "faith_potion", name: "Faith potion", level: 38, xp: 92, inputs: { clean_ghostcap: 1, vial_of_water: 1 }, color: "#e8e4dc", accent: "#b49ae0", examine: "Ghostcap in water. Restores a quarter of your faith.", effect: { faith: 0.25 }, value: 180 },
  { id: "magic_potion", name: "Magic potion", level: 40, xp: 96, inputs: { clean_moonpetal: 1, vial_of_water: 1 }, color: "#6f7ea6", examine: "Moonpetal in water. Boosts Magic by 3 + 10% of your level.", effect: { boost: { magic: [3, 0.1] } }, value: 180 },
  { id: "stealth_draught", name: "Stealth draught", level: 44, xp: 104, inputs: { clean_dunerose: 1, vial_of_water: 1 }, color: "#8c7a5a", accent: "#3b3a38", examine: "Dunerose. For five minutes monsters are a third less likely to notice you sneaking.", effect: { stealth: 500 }, value: 220 },
  { id: "strong_poison", name: "Strong poison", level: 46, xp: 110, inputs: { ground_blackgill: 1, vial_of_water: 1 }, color: "#3b3a40", accent: "#8a62c8", examine: "Ground blackgill. Coat a melee weapon: 25 poisoned hits of 4 damage, four times each.", effect: { poison: { damage: 4, charges: 25 } }, value: 300 },
  { id: "super_strength", name: "Skyroot draught", level: 58, xp: 140, inputs: { ground_skyroot: 1, vial_of_water: 1 }, color: "#4f7a4a", accent: "#8fa3c9", examine: "Ground skyroot. Boosts Strength by 5 + 15% of your level.", effect: { boost: { strength: [5, 0.15] } }, value: 400 },
  { id: "antifire_potion", name: "Antifire potion", level: 62, xp: 150, inputs: { clean_cinderbloom: 1, vial_of_water: 1 }, color: "#e3734f", accent: "#f2e28f", examine: "Cinderbloom. Dragonfire burns half as hard for five minutes (it stacks with a Wyrmward shield).", effect: { antifire: 500 }, value: 500 },
  // The Mizukai Isles' brews.
  { id: "kibi_tea", name: "Kibi tea", level: 6, xp: 24, inputs: { clean_tea_leaf: 1, vial_of_water: 1 }, color: "#8fb36a", examine: "Tea leaf steeped strong. Restores a tenth of your faith and 20 run energy.", effect: { faith: 0.1, energy: 20 }, value: 40 },
  { id: "shiso_tonic", name: "Shiso tonic", level: 20, xp: 56, inputs: { clean_shiso: 1, vial_of_water: 1 }, color: "#7a3a4a", accent: "#c98f95", examine: "Shiso in water. Cures poison, keeps it off for two minutes, and heals 5.", effect: { antidote: 200, heal: 5 }, value: 90 },
  { id: "spirit_incense", name: "Spirit incense", level: 36, xp: 88, inputs: { clean_moon_mugwort: 2, vial_of_water: 1 }, color: "#a9b8a0", accent: "#efe6d2", examine: "Mugwort smoke in a vial, to break and breathe. For five minutes wayward spirits don't come for you, and strike a fifth more softly.", effect: { spiritWard: 500 }, value: 200 },
  { id: "kumo_draught", name: "Kumo draught", level: 52, xp: 124, inputs: { ground_kumo_root: 1, vial_of_water: 1 }, color: "#8a6a4a", accent: "#e2d49e", examine: "Ground Kumo root. Boosts Faith by 4 + 12% of your level, and restores a fifth of your faith.", effect: { boost: { prayer: [4, 0.12] }, faith: 0.2 }, value: 300 },
  { id: "foxfire_philtre", name: "Foxfire philtre", level: 74, xp: 200, inputs: { spirit_essence: 1, clean_shiso: 1, vial_of_water: 1 }, color: "#8fe0a8", accent: "#d98a3a", examine: "Spirit essence and shiso: it glows green. Boosts Magic by 5 + 15% of your level, and wards you from spirits for five minutes.", effect: { boost: { magic: [5, 0.15] }, spiritWard: 500 }, value: 1000 },
  { id: "wraith_poison", name: "Wraith poison", level: 72, xp: 190, inputs: { ground_wraithvine: 1, clean_ghostcap: 1, vial_of_water: 1 }, color: "#2a2438", accent: "#8a62c8", examine: "Wraithvine and ghostcap. Coat a melee weapon: 30 poisoned hits of 6 damage that also sap the creature's defence. The only poison the undead feel.", effect: { poison: { damage: 6, charges: 30, weaken: true } }, value: 900 },
];
/** Rare recipes for one Friend family each: not stronger potions, but something of that family's own nature, for ten minutes. */
export type MixtureDef = { id: string; name: string; family: number; level: number; xp: number; inputs: Readonly<Record<string, number>>; color: string; accent: string; examine: string; effect: string; word: string };
export const MIXTURES: readonly MixtureDef[] = [
  { id: "mixture_skeleton", name: "Marrow draught", family: 0, level: 80, xp: 400, inputs: { grave_essence: 1, ground_graveflower: 1, large_bones: 1, vial_of_water: 1 }, color: "#e8e4dc", accent: "#4a3a60", word: "rattle", examine: "For Skeleton Friends. Bones buried or offered give double Faith XP, and a bone-white glow follows you.", effect: "Double Faith XP from bones" },
  { id: "mixture_mask", name: "Many-faced tincture", family: 1, level: 81, xp: 410, inputs: { moon_essence: 1, clean_dunerose: 1, silk: 1, vial_of_water: 1 }, color: "#6d6b8a", accent: "#c6bed4", word: "…", examine: "For Mask Friends. Monsters barely notice you sneaking, and your face flickers between masks.", effect: "Sneaking all but unseen" },
  { id: "mixture_family", name: "Hearth cordial", family: 2, level: 82, xp: 420, inputs: { moon_essence: 1, clean_feverleaf: 2, cake: 1, vial_of_water: 1 }, color: "#e7a9b0", accent: "#e2d49e", word: "♥", examine: "For Family Friends. Health regenerates three times as fast and food heals half as much again, in a warm rose light.", effect: "Fast healing, food heals more" },
  { id: "mixture_cellular", name: "Division brew", family: 3, level: 83, xp: 430, inputs: { pearl_essence: 1, ground_ironmoss: 1, clean_kelp: 1, vial_of_water: 1 }, color: "#8fbf9a", accent: "#efede7", word: "÷", examine: "For Cellular Friends. Every gathered log, ore, fish or herb has a one-in-four chance of doubling, and green motes split around you.", effect: "Gathering doubles one time in four" },
  { id: "mixture_asymmetry", name: "Lopsided elixir", family: 4, level: 84, xp: 440, inputs: { moon_essence: 1, ground_skyroot: 1, rough_moonstone: 1, vial_of_water: 1 }, color: "#a9b59c", accent: "#c98f95", word: "?", examine: "For Asymmetry Friends. Every hit you land has a one-in-five chance of landing twice, and you list a little to one side.", effect: "Hits sometimes land twice" },
  { id: "mixture_hoverer", name: "Updraught", family: 5, level: 85, xp: 450, inputs: { pearl_essence: 1, clean_frostbloom: 2, feather: 5, vial_of_water: 1 }, color: "#8fb3c9", accent: "#efede7", word: "~", examine: "For Hoverer Friends. Running costs no energy at all, and you hover a hand's breadth off the ground.", effect: "Running is free" },
  { id: "mixture_colossus", name: "Colossal tonic", family: 6, level: 86, xp: 460, inputs: { ember_essence: 1, ground_emberroot: 1, rarite_bar: 1, vial_of_water: 1 }, color: "#8a3f2e", accent: "#f0a050", word: "!!", examine: "For Colossus Friends. +3 max hit in melee, and the ground shakes a little when you walk.", effect: "+3 max hit" },
  { id: "mixture_sparkling", name: "Glimmerwine", family: 7, level: 88, xp: 480, inputs: { pearl_essence: 1, moon_essence: 1, glimmer_bar: 1, vial_of_water: 1 }, color: "#e2d49e", accent: "#efede7", word: "✦", examine: "For Sparkling Friends. +15% XP in every skill, and you shed sparks.", effect: "+15% XP" },
  { id: "mixture_hollow", name: "Hollow draught", family: 8, level: 90, xp: 500, inputs: { wyrm_essence: 1, grave_essence: 1, hollow_essence: 1, vial_of_water: 1 }, color: "#2a2438", accent: "#8a62c8", word: "", examine: "For Hollow Friends. Spells keep their sigils half the time, and the shadows lean towards you.", effect: "Spells keep sigils half the time" },
];
export const MIXTURE_TICKS = 1000;

/** Every Apothecary item: raw and clean herbs, ground herbs, essences, vials, the pestle and mortar, potions and mixtures. */
export const APOTHECARY_ITEMS: Item[] = [
  ...HERBS.flatMap((herb): Item[] => [
    { id: herb.id, name: `${herb.name} (raw)`, examine: `${herb.examine} It needs cleaning.`, value: Math.round(herb.level * 2 + 4), icon: { shape: herb.shape, color: herb.color, accent: "#6d6b67", kind: "raw" } },
    { id: `clean_${herb.id}`, name: herb.name, examine: herb.examine, value: Math.round(herb.level * 3 + 6), icon: { shape: herb.shape, color: herb.color, accent: herb.accent } },
  ]),
  ...GROUND_HERBS.map((id): Item => { const herb = herbDef(id)!; return { id: `ground_${id}`, name: `Ground ${herb.name.toLowerCase()}`, examine: `${herb.name}, ground fine in a mortar.`, value: Math.round(herb.level * 4 + 8), icon: { shape: "mortar", color: herb.color, accent: herb.accent, kind: "ground" } }; }),
  ...ESSENCES.map((essence): Item => ({ id: essence.id, name: essence.name, examine: `${herbDef(essence.herb)!.name}, distilled to its essence. For the high brews.`, value: essence.level * 12, icon: { shape: "vial", color: essence.color, accent: "#efede7", kind: "essence" } })),
  { id: "vial", name: "Vial", examine: "An empty glass vial.", value: 4, icon: { shape: "vial", color: "#d9e4ea", accent: "#efede7", kind: "empty" } },
  { id: "vial_of_water", name: "Vial of water", examine: "A vial of clean water, for brewing.", value: 6, icon: { shape: "vial", color: "#9fb4d0", accent: "#efede7" } },
  { id: "mortar", name: "Pestle and mortar", examine: "For grinding herbs fine.", value: 20, icon: { shape: "mortar", color: "#a39e96", accent: "#6d6b67" } },
  ...POTIONS.map((potion): Item => ({ id: potion.id, name: potion.name, examine: potion.examine, value: potion.value, icon: { shape: "vial", color: potion.color, accent: potion.accent ?? "#efede7" }, potion: potion.effect })),
  ...MIXTURES.map((mix): Item => ({ id: mix.id, name: mix.name, examine: mix.examine, value: 2000 + mix.level * 20, tradeable: false, icon: { shape: "vial", color: mix.color, accent: mix.accent, kind: "mixture" }, potion: { mixture: { family: mix.family, ticks: MIXTURE_TICKS } } })),
];

// ---------- Recipes ----------
const r = (skill: Skill, label: string, level: number, xp: number, ticks: number, inputs: Record<string, number>, outputs: Record<string, number>, extra: Partial<Recipe> = {}): Recipe => ({ skill, label, level, xp, ticks, inputs, outputs, station: "none", ...extra });
/** Grinding: a clean herb into a ground one, with the pestle and mortar. */
export const grindRecipes = (herb: string): Recipe[] => GROUND_HERBS.includes(herb as typeof GROUND_HERBS[number]) ? [r("apothecary", `Ground ${herbDef(herb)!.name.toLowerCase()}`, herbDef(herb)!.level, Math.round(herbDef(herb)!.xp * 0.6), 2, { [`clean_${herb}`]: 1 }, { [`ground_${herb}`]: 1 }, { tools: ["mortar"] })] : [];
/** Distilling at a still: two clean herbs into an essence. */
export const stillRecipes = (): Recipe[] => ESSENCES.map(essence => r("apothecary", essence.name, essence.level, essence.xp, 4, { [`clean_${essence.herb}`]: 2 }, { [essence.id]: 1 }, { station: "still" }));
/** Brewing with a vial of water: every potion whose inputs include the ingredient you used. */
export const brewRecipes = (ingredient: string): Recipe[] => [
  ...POTIONS.filter(potion => ingredient in potion.inputs || ingredient === "vial_of_water").map(potion => r("apothecary", potion.name, potion.level, potion.xp, 3, { ...potion.inputs }, { [potion.id]: 1 })),
  ...MIXTURES.filter(mix => ingredient in mix.inputs || ingredient === "vial_of_water").map(mix => r("apothecary", mix.name, mix.level, mix.xp, 5, { ...mix.inputs }, { [mix.id]: 1 })),
];
export const isPotion = (item: Item) => !!item.potion;
