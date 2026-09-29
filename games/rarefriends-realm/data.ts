/**
 * RareFriends Realm content: skills, the XP curve, items, equipment, monsters, NPCs, shops, recipes and family perks.
 * Everything here is plain data so the engine and the tests can share it.
 */

// ---------- Skills and experience ----------
export const SKILLS = [
  "attack", "strength", "defence", "ranged", "hitpoints", "magic", "prayer", "sigilcraft", "woodcutting", "fletching", "fishing",
  "cooking", "firemaking", "mining", "smithing", "crafting", "thieving", "agility", "slayer",
] as const;
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  attack: "Attack", strength: "Strength", defence: "Defence", ranged: "Ranged", hitpoints: "Hitpoints", magic: "Magic", prayer: "Prayer",
  woodcutting: "Woodcutting", fishing: "Fishing", cooking: "Cooking", firemaking: "Firemaking", mining: "Mining",
  smithing: "Smithing", crafting: "Crafting", thieving: "Thieving", agility: "Agility", slayer: "Slayer",
  sigilcraft: "Sigilcraft", fletching: "Fletching",
};
/** Each skill's colour: its mastery cape, and its trim. */
export const SKILL_COLORS: Record<Skill, [string, string]> = {
  attack: ["#c98f95", "#e2d49e"], strength: ["#8fbf9a", "#e2d49e"], defence: ["#8fa3c9", "#efede7"], ranged: ["#a5a67d", "#efede7"],
  hitpoints: ["#e8e4dc", "#cf6e6e"], magic: ["#6f7ea6", "#e2d49e"], prayer: ["#efede7", "#e2d49e"], woodcutting: ["#8e9f7a", "#c49a74"],
  fishing: ["#8fb3c9", "#efede7"], cooking: ["#9c7aa6", "#e8d4c0"], firemaking: ["#e9a07a", "#e2d49e"], mining: ["#8b8e92", "#c9c2b6"],
  smithing: ["#6d6b67", "#e3a58c"], crafting: ["#b89c86", "#efede7"], thieving: ["#6d6b8a", "#c6bed4"], agility: ["#8f9cb2", "#efede7"],
  slayer: ["#3b3a38", "#cf6e6e"], sigilcraft: ["#c6bed4", "#6f7ea6"], fletching: ["#7d9a86", "#e8d4c0"],
};
/** Small glyphs for XP drops and the skills tab (drawn as text). */
export const SKILL_ICONS: Record<Skill, string> = {
  attack: "⚔", strength: "✊", defence: "⛨", hitpoints: "♥", magic: "✦", prayer: "✚", woodcutting: "🪓", fishing: "🐟",
  cooking: "🍳", firemaking: "🔥", mining: "⛏", smithing: "⚒", crafting: "✂", thieving: "✋", agility: "➶", ranged: "➹", slayer: "☠", sigilcraft: "◈", fletching: "➴",
};
export const MAX_LEVEL = 99;
/** The classic old-school curve: XP needed for each level, index = level. */
export const XP_TABLE: readonly number[] = (() => {
  const table = [0, 0];
  let points = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    points += Math.floor(level + 300 * 2 ** (level / 7));
    table.push(Math.floor(points / 4));
  }
  return table;
})();
export const MAX_XP = 200_000_000;
export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_TABLE[level + 1]) level++;
  return level;
}
/** Realm rate: every XP reward in the game is multiplied by this so a short session still feels like progress. */
export const XP_RATE = 3;

// ---------- Families ----------
export const FAMILY_NAMES = ["Skeleton", "Mask", "Family", "Cellular", "Asymmetry", "Hoverer", "Colossus", "Sparkling", "Hollow"] as const;
export type FamilyPerk = { title: string; text: string };
export const FAMILY_PERKS: readonly FamilyPerk[] = [
  { title: "Bone collector", text: "Burying bones gives 50% more Prayer XP." },
  { title: "Many faces", text: "Thieving succeeds more often and stuns are shorter." },
  { title: "Big family", text: "Shops charge you 10% less." },
  { title: "Regrowth", text: "Hitpoints regenerate twice as fast." },
  { title: "Lopsided luck", text: "8% chance to gather a second resource." },
  { title: "Featherweight", text: "Run energy drains 40% slower." },
  { title: "Colossal swing", text: "+1 max hit in melee." },
  { title: "Glimmer eye", text: "Finds gems three times as often while mining." },
  { title: "Echo magic", text: "+10% magic accuracy, and 1 in 5 spells keeps its sigils." },
];

// ---------- Items ----------
export type EquipSlot = "head" | "cape" | "neck" | "weapon" | "body" | "shield" | "legs" | "hands" | "feet";
export const EQUIP_SLOTS: readonly EquipSlot[] = ["head", "cape", "neck", "weapon", "body", "shield", "legs", "hands", "feet"];
export type Bonuses = { attack: number; strength: number; defence: number; ranged: number; magic: number; prayer: number };
/** An item's picture: a shape in a colour; `kind` picks a variant of the shape (a fish's species, an ore's veins…). */
export type Icon = { shape: IconShape; color: string; accent?: string; kind?: string };
export type IconShape =
  | "drumstick" | "steak" | "coins" | "axe" | "pickaxe" | "sword" | "dagger" | "sabre" | "helm" | "body" | "legs" | "shield" | "boots" | "gloves" | "cape"
  | "amulet" | "log" | "fish" | "ore" | "bar" | "bones" | "sigil" | "staff" | "net" | "rod" | "harpoon" | "pot" | "bucket" | "egg" | "flour"
  | "milk" | "tinderbox" | "hammer" | "knife" | "needle" | "thread" | "chisel" | "gem" | "hide" | "leather" | "meat" | "feather" | "bait"
  | "cake" | "bread" | "berries" | "key" | "wheat" | "lamp" | "scroll" | "silk" | "hood" | "bracer" | "burnt" | "hat" | "crown" | "orb" | "trophy"
  | "bow" | "arrow" | "tablet" | "arrowheads" | "material" | "quiver" | "warbow" | "crossbow" | "bolts" | "limbs" | "stock";
export type Item = {
  id: string; name: string; examine: string; value: number; icon: Icon;
  stackable?: boolean; tradeable?: boolean;
  equip?: { slot: EquipSlot; bonuses: Partial<Bonuses>; requires?: Partial<Record<Skill, number>>; speed?: number; twoHanded?: boolean; staff?: boolean;
    /** A bow or crossbow: its reach, the extra punch it gives each shot, and whether it fires bolts (crossbows) or arrows. */
    bow?: { range: number; strength?: number; bolts?: boolean } };
  heal?: number; bones?: number; tool?: { kind: "axe" | "pickaxe"; tier: number; level: number };
  /** Arrows (fired by any bow) or bolts (by any crossbow), from your pack. */
  ammo?: { strength: number; level: number; bolt?: boolean };
  /** A fixed shop price (instead of value × markup). */
  price?: number;
  /** A mastery cape: the skill it's for (all skills for the Grandmaster's), and whether it's trimmed. */
  mastery?: { skill: Skill | "all"; trimmed: boolean };
  /** Break to teleport (a Realm tablet). */
  tablet?: "hollow_square" | "emberforge" | "oasis" | "frostpeak" | "pier";
};

export const METALS = [
  { id: "pewter", name: "Pewter", level: 1, tier: 1, color: "#a4a7aa", value: 10 },
  { id: "blackiron", name: "Blackiron", level: 5, tier: 2, color: "#5f5e66", value: 35 },
  { id: "ashsteel", name: "Ashsteel", level: 10, tier: 3, color: "#c9c2b6", value: 120 },
  { id: "moonsilver", name: "Moonsilver", level: 20, tier: 4, color: "#9fabc2", value: 380 },
  { id: "glimmer", name: "Glimmer", level: 30, tier: 5, color: "#d9cf9a", value: 900 },
  { id: "rarite", name: "Rarite", level: 40, tier: 6, color: "#d8b6b4", value: 2400 },
  // Forged metals (levels 50–90): smelted from what the Realm's strongest creatures drop, not from ore, at Smithing 86 and up.
  { id: "frostsilver", name: "Frostsilver", level: 50, tier: 7, color: "#bcd8e8", value: 4200 },
  { id: "gloomsteel", name: "Gloomsteel", level: 60, tier: 8, color: "#6d5f8c", value: 6500 },
  { id: "wyrmscale", name: "Wyrmscale", level: 70, tier: 9, color: "#6f9468", value: 9500 },
  { id: "hollowsteel", name: "Hollowsteel", level: 75, tier: 10, color: "#d6cff0", value: 12000 },
  { id: "cindersteel", name: "Cindersteel", level: 80, tier: 11, color: "#d0643f", value: 15000 },
  { id: "ashenheart", name: "Ashenheart", level: 90, tier: 12, color: "#8a817c", value: 22000 },
] as const;
/** The monster-dropped material each forged metal is smelted from (one per bar, with inkcoal). */
export const FORGE_MATERIALS: Partial<Record<MetalId, { id: string; name: string; kind: string; examine: string; value: number }>> = {
  frostsilver: { id: "frost_shard", name: "Frost shard", kind: "crystal", examine: "A shard of never-melting ice from a Frost yeti. Smelted, it makes frostsilver.", value: 1800 },
  gloomsteel: { id: "gloom_shard", name: "Gloom shard", kind: "dark", examine: "A splinter of solid shadow from a gloom hound. Smelted, it makes gloomsteel.", value: 2800 },
  wyrmscale: { id: "wyrm_scale", name: "Wyrm scale", kind: "scale", examine: "A drake's scale, harder than rarite. Smelted, it makes wyrmscale.", value: 4200 },
  hollowsteel: { id: "hollow_essence", name: "Hollow essence", kind: "wisp", examine: "Something the Hollow left behind, cold and weightless. Smelted, it makes hollowsteel.", value: 5400 },
  cindersteel: { id: "cinder_core", name: "Cinder core", kind: "core", examine: "The still-burning heart of a cinder drake. Smelted, it makes cindersteel.", value: 6800 },
  ashenheart: { id: "colossus_ember", name: "Colossus ember", kind: "ember", examine: "An ember from the Ashen Colossus. It never goes out. Smelted, it makes ashenheart.", value: 10000 },
};
/** Each forged metal's glow: the accent on its weapons, armour and bars. */
export const FORGE_GLOW: Partial<Record<MetalId, string>> = { frostsilver: "#eef9ff", gloomsteel: "#b49ae0", wyrmscale: "#c9e07a", hollowsteel: "#ffffff", cindersteel: "#ffcf6a", ashenheart: "#f08a4b" };
/** Forged metals' staffs (smithed, two bars): magic weapons for the high tiers. */
export const FORGED_STAFF_MAGIC: Partial<Record<MetalId, number>> = { frostsilver: 26, gloomsteel: 32, wyrmscale: 38, hollowsteel: 42, cindersteel: 46, ashenheart: 54 };
export type MetalId = typeof METALS[number]["id"];
/** Smithable pieces: bars used, smithing level offset over the metal's base, and relative strength. */
export const SMITH_PIECES = [
  { piece: "dagger", name: "dagger", bars: 1, offset: 0, shape: "dagger", slot: "weapon", att: 4, str: 3, def: 0, speed: 4 },
  { piece: "axe", name: "axe", bars: 1, offset: 1, shape: "axe", slot: "weapon", att: 3, str: 4, def: 0, speed: 5 },
  { piece: "sword", name: "sword", bars: 1, offset: 4, shape: "sword", slot: "weapon", att: 6, str: 5, def: 0, speed: 4 },
  { piece: "pickaxe", name: "pickaxe", bars: 2, offset: 5, shape: "pickaxe", slot: "weapon", att: 3, str: 4, def: 0, speed: 5 },
  { piece: "helm", name: "helm", bars: 2, offset: 7, shape: "helm", slot: "head", att: 0, str: 0, def: 5, speed: 0 },
  { piece: "sabre", name: "sabre", bars: 2, offset: 5, shape: "sabre", slot: "weapon", att: 9, str: 8, def: 0, speed: 4 },
  { piece: "greaves", name: "greaves", bars: 3, offset: 16, shape: "legs", slot: "legs", att: 0, str: 0, def: 11, speed: 0 },
  { piece: "shield", name: "shield", bars: 3, offset: 12, shape: "shield", slot: "shield", att: 0, str: 0, def: 12, speed: 0 },
  { piece: "cuirass", name: "cuirass", bars: 5, offset: 18, shape: "body", slot: "body", att: 0, str: 0, def: 20, speed: 0 },
] as const;
export type SmithPiece = typeof SMITH_PIECES[number]["piece"];
export const SMITHING_BASE: Record<MetalId, number> = { pewter: 1, blackiron: 15, ashsteel: 30, moonsilver: 50, glimmer: 70, rarite: 85,
  frostsilver: 86, gloomsteel: 88, wyrmscale: 90, hollowsteel: 92, cindersteel: 94, ashenheart: 96 };

/** Each fish's colours: raw (its own) and cooked (browned). */
const FISH_COLORS: Record<string, [string, string]> = {
  minnows: ["#b9c4cc", "#d2a36c"], perch: ["#9fb07a", "#c99a5a"], carp: ["#d9a441", "#c98b45"], char: ["#b98f86", "#c7875a"],
  grayling: ["#9aa3b5", "#c49a6c"], inkcrab: ["#4f6680", "#d9774a"], sailfish: ["#5f86b4", "#c2915c"], inkshark: ["#7d8894", "#b89068"],
};
const ITEMS: Item[] = [
  { id: "coins", name: "Coins", examine: "Lovely money!", value: 1, stackable: true, icon: { shape: "coins", color: "#d9c27a" } },
  // Tools
  { id: "small_net", name: "Small fishing net", examine: "Useful for catching small fish.", value: 5, icon: { shape: "net", color: "#9a8f80" } },
  { id: "fishing_rod", name: "Fishing rod", examine: "Useful for catching perch and carp.", value: 5, icon: { shape: "rod", color: "#9c8672" } },
  { id: "fly_rod", name: "Fly fishing rod", examine: "Useful for catching grayling and char.", value: 5, icon: { shape: "rod", color: "#6d6b67" } },
  { id: "harpoon", name: "Harpoon", examine: "Useful for catching really big fish.", value: 45, icon: { shape: "harpoon", color: "#8b8e92" } },
  { id: "crab_pot", name: "Crab pot", examine: "Useful for catching inkcrabs.", value: 20, icon: { shape: "pot", color: "#9c8672" } },
  { id: "fishing_bait", name: "Fishing bait", examine: "For use with a fishing rod.", value: 3, stackable: true, icon: { shape: "bait", color: "#b69a85" } },
  { id: "feather", name: "Feather", examine: "Used for fly fishing.", value: 2, stackable: true, icon: { shape: "feather", color: "#f2efe8" } },
  { id: "tinderbox", name: "Tinderbox", examine: "Useful for lighting a fire.", value: 1, icon: { shape: "tinderbox", color: "#8b7a66" } },
  { id: "hammer", name: "Hammer", examine: "Good for hitting things.", value: 1, icon: { shape: "hammer", color: "#8b8e92" } },
  { id: "knife", name: "Knife", examine: "A dangerous looking knife.", value: 6, icon: { shape: "knife", color: "#b9bfc6" } },
  { id: "needle", name: "Needle", examine: "Used with a thread to make clothes.", value: 1, icon: { shape: "needle", color: "#c3c6cb" } },
  { id: "thread", name: "Thread", examine: "Used with a needle to make clothes.", value: 1, stackable: true, icon: { shape: "thread", color: "#efede7" } },
  { id: "chisel", name: "Chisel", examine: "Good if you have a bit of sculpting to do.", value: 1, icon: { shape: "chisel", color: "#8b8e92" } },
  { id: "pot", name: "Pot", examine: "This pot is empty.", value: 1, icon: { shape: "pot", color: "#b89c86" } },
  { id: "bucket", name: "Bucket", examine: "It's a wooden bucket.", value: 2, icon: { shape: "bucket", color: "#9c8672" } },
  // Quest and cooking ingredients
  { id: "egg", name: "Egg", examine: "A nice fresh egg.", value: 4, icon: { shape: "egg", color: "#f7f5f0" } },
  { id: "grain", name: "Grain", examine: "Some wheat heads.", value: 2, icon: { shape: "wheat", color: "#e2d7ad" } },
  { id: "pot_of_flour", name: "Pot of flour", examine: "There is flour in this pot.", value: 14, icon: { shape: "flour", color: "#f7f5f0" } },
  { id: "bucket_of_milk", name: "Bucket of milk", examine: "It's a bucket of milk.", value: 6, icon: { shape: "milk", color: "#f7f5f0" } },
  // Logs
  { id: "logs", name: "Logs", examine: "A number of wooden logs.", value: 4, icon: { shape: "log", color: "#9c8672" } },
  { id: "oak_logs", name: "Oak logs", examine: "Logs cut from an oak tree.", value: 20, icon: { shape: "log", color: "#b59c7d" } },
  { id: "willow_logs", name: "Willow logs", examine: "Logs cut from a willow tree.", value: 32, icon: { shape: "log", color: "#a5a67d" } },
  { id: "maple_logs", name: "Maple logs", examine: "Logs cut from a maple tree.", value: 70, icon: { shape: "log", color: "#c49a74" } },
  { id: "yew_logs", name: "Yew logs", examine: "Logs cut from a yew tree.", value: 180, icon: { shape: "log", color: "#7d6b5c" } },
  { id: "ash_logs", name: "Ashwood logs", examine: "Pale logs that hum faintly. From the Frostpeak ashwoods.", value: 400, icon: { shape: "log", color: "#d6d3cc" } },
  // Ores and bars
  { id: "pewter_ore", name: "Pewter ore", examine: "Soft grey ore. Smelts straight into pewter.", value: 3, icon: { shape: "ore", kind: "pewter", color: "#a4a7aa" } },
  { id: "blackiron_ore", name: "Blackiron ore", examine: "This needs refining.", value: 17, icon: { shape: "ore", kind: "blackiron", color: "#8c6f62" } },
  { id: "inkcoal", name: "Inkcoal", examine: "Hmm, a non-renewable energy source!", value: 45, icon: { shape: "ore", kind: "inkcoal", color: "#3b3a38" } },
  { id: "moonsilver_ore", name: "Moonsilver ore", examine: "This needs refining.", value: 160, icon: { shape: "ore", kind: "moonsilver", color: "#7d8fb8" } },
  { id: "glimmer_ore", name: "Glimmer ore", examine: "This needs refining.", value: 400, icon: { shape: "ore", kind: "glimmer", color: "#86a98b" } },
  { id: "rarite_ore", name: "Rarite ore", examine: "Pale rose ore that only forms where Friends dream.", value: 1100, icon: { shape: "ore", kind: "rarite", color: "#d8b6b4" } },
  { id: "clay", name: "Clay", examine: "Some hard dry clay.", value: 2, icon: { shape: "ore", kind: "clay", color: "#d7c3a5" } },
  ...Object.values(FORGE_MATERIALS).map(material => ({ id: material!.id, name: material!.name, examine: material!.examine, value: material!.value,
    icon: { shape: "material" as const, color: METALS.find(metal => FORGE_MATERIALS[metal.id]?.id === material!.id)!.color, kind: material!.kind } })),
  ...METALS.map(metal => ({ id: `${metal.id}_bar`, name: `${metal.name} bar`, examine: `It's a bar of ${metal.id === "rarite" ? "rarite" : metal.id}.`, value: metal.value, icon: { accent: FORGE_GLOW[metal.id], shape: "bar" as const, color: metal.color } })),
  // Gems
  { id: "rough_moonstone", name: "Rough moonstone", examine: "A rough moonstone.", value: 50, icon: { shape: "gem", color: "#8fa3c9", accent: "#6d6b67" } },
  { id: "rough_sagestone", name: "Rough sagestone", examine: "A rough sagestone.", value: 100, icon: { shape: "gem", color: "#8fbf9a", accent: "#6d6b67" } },
  { id: "rough_rosestone", name: "Rough rosestone", examine: "A rough rosestone.", value: 200, icon: { shape: "gem", color: "#c98f95", accent: "#6d6b67" } },
  { id: "moonstone", name: "Moonstone", examine: "This looks valuable.", value: 250, icon: { shape: "gem", color: "#8fa3c9" } },
  { id: "sagestone", name: "Sagestone", examine: "This looks valuable.", value: 500, icon: { shape: "gem", color: "#8fbf9a" } },
  { id: "rosestone", name: "Rosestone", examine: "This looks valuable.", value: 1000, icon: { shape: "gem", color: "#c98f95" } },
  // Fish and food
  ...([
    ["minnows", "Minnows", 3, 5], ["perch", "Perch", 4, 8], ["carp", "Carp", 5, 15], ["char", "Char", 7, 25],
    ["grayling", "Grayling", 9, 50], ["inkcrab", "Inkcrab", 12, 150], ["sailfish", "Sailfish", 14, 250], ["inkshark", "Inkshark", 20, 600],
  ] as const).flatMap(([id, name, heal, value]) => [
    { id: `raw_${id}`, name: `Raw ${name.toLowerCase()}`, examine: `I should try cooking this.`, value: Math.round(value * 0.6), icon: { shape: "fish" as const, kind: id, color: FISH_COLORS[id][0] } },
    { id, name, examine: `Some nicely cooked ${name.toLowerCase()}.`, value, heal, icon: { shape: "fish" as const, kind: id, color: FISH_COLORS[id][1], accent: id === "inkcrab" ? undefined : "#5a3520" } },
  ]),
  { id: "raw_chicken", name: "Raw chicken", examine: "I need to cook this first.", value: 2, icon: { shape: "drumstick", color: "#efc4b8" } },
  { id: "cooked_chicken", name: "Cooked chicken", examine: "Mmm, this looks tasty.", value: 5, heal: 3, icon: { shape: "drumstick", color: "#c7843f", accent: "#6a3a1c" } },
  { id: "raw_beef", name: "Raw beef", examine: "I need to cook this first.", value: 2, icon: { shape: "steak", color: "#c9606a" } },
  { id: "cooked_meat", name: "Cooked meat", examine: "Mmm, this looks tasty.", value: 5, heal: 3, icon: { shape: "steak", color: "#8a5634", accent: "#3e2416" } },
  { id: "bread", name: "Bread", examine: "Nice crispy bread.", value: 12, heal: 5, icon: { shape: "bread", color: "#d9b584" } },
  { id: "cake", name: "Cake", examine: "A plain sponge cake.", value: 50, heal: 12, icon: { shape: "cake", color: "#f1e2c8", accent: "#d8b6b4" } },
  { id: "burnt_food", name: "Burnt food", examine: "Oops!", value: 1, icon: { shape: "burnt", color: "#3b3a38" } },
  // Bones and drops
  { id: "bones", name: "Bones", examine: "Bones are for burying!", value: 5, bones: 4.5, icon: { shape: "bones", kind: "small", color: "#f2efe8" } },
  { id: "large_bones", name: "Large bones", examine: "Ew, it's a pile of bones.", value: 60, bones: 15, icon: { shape: "bones", kind: "large", color: "#e7e1d3" } },
  { id: "drake_bones", name: "Drake bones", examine: "Heavy, and still warm.", value: 900, bones: 72, icon: { shape: "bones", kind: "dragon", color: "#d9c9a8", accent: "#8a4a3a" } },
  { id: "drakehide", name: "Drakehide", examine: "A scaled hide from an ash drake. A crafter could stitch it.", value: 700, icon: { shape: "hide", color: "#6f8a5c", accent: "#3b3a38" } },
  { id: "wyrm_heart", name: "Wyrm heart", examine: "It still glows. Collectors in the Oasis pay a fortune for these.", value: 60_000, icon: { shape: "orb", color: "#e3734f", accent: "#f2e28f" } },
  { id: "sigil_stone", name: "Sigil stone", examine: "A pale, blank stone. An altar can press a sigil into it.", value: 6, icon: { shape: "ore", color: "#d9d4e6" } },
  // Fletching
  { id: "arrow_shaft", name: "Arrow shafts", examine: "Wooden shafts, ready for feathers.", value: 1, stackable: true, icon: { shape: "arrow", color: "#9c8672", accent: "shaft" } },
  { id: "headless_arrow", name: "Headless arrows", examine: "Fletched shafts. They need arrowheads.", value: 2, stackable: true, icon: { shape: "arrow", color: "#efede7", accent: "headless" } },
  ...METALS.map((metal, index) => ({ id: `${metal.id}_arrowheads`, name: `${metal.name} arrowheads`, examine: `Arrowheads smithed from ${metal.id}.`, value: [1, 3, 6, 12, 24, 55, 80, 120, 180, 230, 290, 420][index], stackable: true,
    icon: { shape: "arrowheads" as const, color: metal.color } })),
  { id: "ink_bones", name: "Ink bones", examine: "Bones stained black. They feel lighter than they should.", value: 250, bones: 50, icon: { shape: "bones", kind: "ink", color: "#4a4644", accent: "#8a62c8" } },
  { id: "cowhide", name: "Cowhide", examine: "I should take this to the tanner.", value: 8, icon: { shape: "hide", color: "#efede7", accent: "#3b3a38" } },
  { id: "leather", name: "Leather", examine: "It's a piece of leather.", value: 15, icon: { shape: "leather", color: "#b58b6b" } },
  // Sigils
  ...([
    ["breeze_sigil", "Breeze sigil", "#c7d3dc"], ["tide_sigil", "Tide sigil", "#9fb4d0"], ["stone_sigil", "Stone sigil", "#a89479"],
    ["ember_sigil", "Ember sigil", "#d99a82"], ["thought_sigil", "Thought sigil", "#d6c58f"], ["storm_sigil", "Storm sigil", "#d0b27c"],
    ["path_sigil", "Path sigil", "#8fa0c9"], ["hollow_sigil", "Hollow sigil", "#6d6b67"], ["bloom_sigil", "Bloom sigil", "#9fbf9a"],
    ["star_sigil", "Star sigil", "#e2d49e"], ["shade_sigil", "Shade sigil", "#b9a8c9"],
  ] as const).map(([id, name, color]) => ({ id, name, examine: "Used for magic spells.", value: { path_sigil: 60, hollow_sigil: 70, storm_sigil: 35, bloom_sigil: 45, star_sigil: 25, shade_sigil: 4, thought_sigil: 3 }[id as string] ?? 2, stackable: true, icon: { shape: "sigil" as const, color } })),
  { id: "sweetberry", name: "Sweetberries", examine: "A handful of pale berries. They used to be a bone.", value: 2, heal: 2, icon: { shape: "berries", color: "#c6bed4" } },
  // Thieving loot
  { id: "silk", name: "Silk", examine: "It's a sheet of silk.", value: 30, icon: { shape: "silk", color: "#e9e1ef" } },
  // Quest items
  { id: "crypt_key", name: "Crypt key", examine: "A cold blackiron key from the Murkmire crypt.", value: 0, tradeable: false, icon: { shape: "key", color: "#8b8e92" } },
  { id: "glimmer_shard", name: "Glimmer shard", examine: "A shard of the lost Glimmer. It hums when you face north.", value: 0, tradeable: false, icon: { shape: "gem", color: "#e2d7ad", accent: "#161616" } },
  { id: "forge_ember", name: "Forge ember", examine: "An ember that never cools. Emberforge's heart.", value: 0, tradeable: false, icon: { shape: "orb", color: "#e3a58c" } },
  { id: "hollow_crown", name: "Hollow crown", examine: "The crown of the Hollow King. It weighs nothing at all.", value: 0, tradeable: false, icon: { shape: "crown", color: "#efede7", accent: "#161616" } },
  { id: "realm_scroll", name: "Realm scroll", examine: "A map fragment of the Realm.", value: 0, tradeable: false, icon: { shape: "scroll", color: "#efe3c4" } },
];

// ---------- Equipment ----------
function metalGear(): Item[] {
  const out: Item[] = [];
  for (const metal of METALS) {
    const tier = metal.tier, scale = [1, 1.5, 2.2, 3.1, 4.3, 5.8, 6.8, 7.8, 8.9, 9.5, 10.2, 11.6][tier - 1];
    for (const piece of SMITH_PIECES) {
      const id = `${metal.id}_${piece.piece}`, name = `${metal.name} ${piece.name}`;
      const bonuses: Partial<Bonuses> = {};
      if (piece.att) bonuses.attack = Math.round(piece.att * scale);
      if (piece.str) bonuses.strength = Math.round(piece.str * scale);
      if (piece.def) bonuses.defence = Math.round(piece.def * scale);
      if (piece.slot === "body" || piece.slot === "legs" || piece.slot === "head") bonuses.magic = -Math.round(piece.def * 0.8);
      const isTool = piece.piece === "axe" || piece.piece === "pickaxe";
      const requireSkill: Skill = piece.slot === "weapon" ? "attack" : "defence";
      out.push({
        id, name, examine: isTool ? `A ${piece.name} made of ${metal.id}.` : `A ${metal.id} ${piece.name}.`,
        value: Math.round(metal.value * piece.bars * 1.6 + 10),
        icon: { shape: piece.shape as IconShape, color: metal.color, accent: FORGE_GLOW[metal.id] },
        equip: {
          slot: piece.slot as EquipSlot, bonuses,
          requires: metal.level > 1 ? { [requireSkill]: metal.level } : undefined,
          speed: piece.speed || undefined,
        },
        tool: isTool ? { kind: piece.piece as "axe" | "pickaxe", tier, level: metal.level } : undefined,
      });
    }
    const magic = FORGED_STAFF_MAGIC[metal.id];
    if (magic) out.push({
      id: `${metal.id}_staff`, name: `${metal.name} staff`, examine: `A staff forged of ${metal.id}, humming with power.`, value: Math.round(metal.value * 2 * 1.6 + 10),
      icon: { shape: "staff", color: metal.color, accent: FORGE_GLOW[metal.id], kind: "forged" },
      equip: { slot: "weapon", bonuses: { attack: tier, strength: tier + 2, magic }, requires: { magic: metal.level }, speed: 5, staff: true },
    });
  }
  return out;
}
const OTHER_GEAR: Item[] = [
  { id: "leather_gloves", name: "Leather gloves", examine: "These will keep my hands warm!", value: 6, icon: { shape: "gloves", color: "#b58b6b" }, equip: { slot: "hands", bonuses: { defence: 1 } } },
  { id: "leather_boots", name: "Leather boots", examine: "Comfortable leather boots.", value: 6, icon: { shape: "boots", color: "#9c7a5f" }, equip: { slot: "feet", bonuses: { defence: 1 } } },
  { id: "leather_hood", name: "Leather hood", examine: "Better than no armour!", value: 24, icon: { shape: "hood", color: "#b58b6b" }, equip: { slot: "head", bonuses: { defence: 2 } } },
  { id: "leather_bracers", name: "Leather bracers", examine: "These should protect my arms.", value: 18, icon: { shape: "bracer", color: "#9c7a5f" }, equip: { slot: "hands", bonuses: { attack: 1, defence: 2 } } },
  { id: "leather_jerkin", name: "Leather jerkin", examine: "Better than no armour!", value: 21, icon: { shape: "body", color: "#b58b6b" }, equip: { slot: "body", bonuses: { defence: 8, magic: 2 } } },
  { id: "leather_leggings", name: "Leather leggings", examine: "Better than no armour!", value: 20, icon: { shape: "legs", color: "#9c7a5f" }, equip: { slot: "legs", bonuses: { defence: 4, magic: 1 } } },
  { id: "scholar_hat", name: "Scholar's hat", examine: "A silly pointed hat.", value: 2, icon: { shape: "hat", color: "#6f7ea6" }, equip: { slot: "head", bonuses: { magic: 2 } } },
  { id: "scholar_robe", name: "Scholar's robe", examine: "I can do magic better in this.", value: 15, icon: { shape: "body", color: "#6f7ea6" }, equip: { slot: "body", bonuses: { magic: 3 } } },
  { id: "staff", name: "Staff", examine: "It's a slightly magical stick.", value: 15, icon: { shape: "staff", color: "#9c8672" }, equip: { slot: "weapon", bonuses: { attack: 2, strength: 3, magic: 4 }, speed: 5, staff: true } },
  { id: "scholar_skirt", name: "Scholar's skirt", examine: "Starry, and very comfortable.", value: 12, icon: { shape: "legs", color: "#6f7ea6" }, equip: { slot: "legs", bonuses: { magic: 2 } } },
  { id: "tide_staff", name: "Tide staff", examine: "A magical staff. Provides unlimited tide sigils.", value: 1500, icon: { shape: "staff", color: "#9fb4d0" }, equip: { slot: "weapon", bonuses: { attack: 4, strength: 5, magic: 10 }, speed: 5, staff: true, requires: { magic: 10 } } },
  { id: "stone_staff", name: "Stone staff", examine: "A magical staff. Provides unlimited stone sigils.", value: 1500, icon: { shape: "staff", color: "#a89479" }, equip: { slot: "weapon", bonuses: { attack: 4, strength: 5, magic: 10 }, speed: 5, staff: true, requires: { magic: 10 } } },
  { id: "ember_staff", name: "Ember staff", examine: "A magical staff. Provides unlimited ember sigils.", value: 1500, icon: { shape: "staff", color: "#e9a07a" }, equip: { slot: "weapon", bonuses: { attack: 4, strength: 5, magic: 10 }, speed: 5, staff: true, requires: { magic: 10 } } },
  { id: "wyrmward_shield", name: "Wyrmward shield", examine: "King Hollis's gift. Dragonfire slides right off it.", value: 200, icon: { shape: "shield", color: "#c9c2b6", accent: "#cf6e6e" }, equip: { slot: "shield", bonuses: { defence: 8 } } },
  { id: "drakehide_bracers", name: "Drakehide bracers", examine: "Scaled drakehide bracers.", value: 2500, icon: { shape: "bracer", color: "#6f8a5c" }, equip: { slot: "hands", bonuses: { ranged: 9, defence: 7 }, requires: { ranged: 50 } } },
  { id: "drakehide_chaps", name: "Drakehide chaps", examine: "Scaled drakehide chaps.", value: 5000, icon: { shape: "legs", color: "#6f8a5c" }, equip: { slot: "legs", bonuses: { ranged: 14, defence: 20 }, requires: { ranged: 50 } } },
  { id: "drakehide_vest", name: "Drakehide vest", examine: "Scaled drakehide. Light, and nearly fireproof.", value: 7500, icon: { shape: "body", color: "#6f8a5c" }, equip: { slot: "body", bonuses: { ranged: 22, defence: 32 }, requires: { ranged: 50 } } },
  { id: "breeze_staff", name: "Breeze staff", examine: "A magical staff. Provides unlimited breeze sigils.", value: 1500, icon: { shape: "staff", color: "#c7d3dc" }, equip: { slot: "weapon", bonuses: { attack: 4, strength: 5, magic: 10 }, speed: 5, staff: true, requires: { magic: 10 } } },
  { id: "moonlit_staff", name: "Moonlit staff", examine: "A staff with a small moon floating at its tip.", value: 9000, icon: { shape: "staff", color: "#9fabc2", accent: "#e2d7ad" }, equip: { slot: "weapon", bonuses: { attack: 8, strength: 8, magic: 20 }, speed: 5, staff: true, requires: { magic: 30 } } },
  { id: "rosestone_pendant", name: "Rosestone pendant", examine: "An enchanted rosestone amulet.", value: 3000, icon: { shape: "amulet", color: "#c98f95" }, equip: { slot: "neck", bonuses: { strength: 10 } } },
  { id: "moonstone_pendant", name: "Moonstone pendant", examine: "An enchanted moonstone amulet.", value: 1200, icon: { shape: "amulet", color: "#8fa3c9" }, equip: { slot: "neck", bonuses: { attack: 4 } } },
  { id: "friends_charm", name: "Old Friend's charm", examine: "A blessed symbol of the Old Friend.", value: 300, icon: { shape: "amulet", color: "#efede7" }, equip: { slot: "neck", bonuses: { prayer: 8 } } },
  { id: "team_cape", name: "Wanderer's cape", examine: "A plain travelling cape.", value: 50, icon: { shape: "cape", color: "#8f8a82" }, equip: { slot: "cape", bonuses: { defence: 1 } } },
  { id: "hollow_cape", name: "Cape of the Hollow", examine: "Proof that you ended the Hollow King's reign.", value: 0, tradeable: false, icon: { shape: "cape", color: "#161616", accent: "#d8b6b4" }, equip: { slot: "cape", bonuses: { attack: 4, strength: 4, defence: 4, magic: 4, prayer: 4 } } },
  { id: "realm_crown", name: "Crown of the Realm", examine: "Worn by the Friend who ended the Hollow King's reign.", value: 0, tradeable: false, icon: { shape: "crown", color: "#e2d49e" }, equip: { slot: "head", bonuses: { defence: 6, prayer: 4 } } },
];

// ---------- Ranged: bows by wood, arrows by metal, hunter's hides ----------
export const BOWS = [
  { id: "shortbow", name: "Shortbow", level: 1, ranged: 8, value: 50, color: "#9c8672" },
  { id: "oak_bow", name: "Oak bow", level: 5, ranged: 14, value: 160, color: "#b59c7d" },
  { id: "willow_bow", name: "Willow bow", level: 20, ranged: 20, value: 320, color: "#a5a67d" },
  { id: "maple_bow", name: "Maple bow", level: 30, ranged: 29, value: 640, color: "#c49a74" },
  { id: "yew_bow", name: "Yew bow", level: 40, ranged: 47, value: 1600, color: "#7d6b5c" },
  { id: "ashwood_bow", name: "Ashwood bow", level: 50, ranged: 69, value: 3200, color: "#d6d3cc" },
  { id: "gloomfang_bow", name: "Gloomfang bow", level: 60, ranged: 88, value: 40000, color: "#4a4458" },
] as const;
/** War bows: a heavier bow from two logs of each wood. Slower to draw than the plain bow, but every arrow lands harder, and it reaches a tile further. */
export const WAR_BOWS = [
  { id: "war_bow", name: "War bow", log: "logs", level: 5, ranged: 12, strength: 16, fletch: 10, xp: 12, value: 140, color: "#9c8672" },
  { id: "oak_war_bow", name: "Oak war bow", log: "oak_logs", level: 10, ranged: 18, strength: 18, fletch: 25, xp: 36, value: 420, color: "#b59c7d" },
  { id: "willow_war_bow", name: "Willow war bow", log: "willow_logs", level: 25, ranged: 26, strength: 22, fletch: 40, xp: 70, value: 850, color: "#a5a67d" },
  { id: "maple_war_bow", name: "Maple war bow", log: "maple_logs", level: 35, ranged: 36, strength: 26, fletch: 55, xp: 105, value: 1700, color: "#c49a74" },
  { id: "yew_war_bow", name: "Yew war bow", log: "yew_logs", level: 45, ranged: 56, strength: 32, fletch: 70, xp: 140, value: 4200, color: "#7d6b5c" },
  { id: "ashwood_war_bow", name: "Ashwood war bow", log: "ash_logs", level: 55, ranged: 80, strength: 38, fletch: 85, xp: 175, value: 8400, color: "#d6d3cc" },
] as const;
/** Crossbow stocks, carved from logs with a knife (Fletching). */
export const STOCKS = [
  { id: "wooden_stock", name: "Wooden stock", value: 12, log: "logs", level: 9, xp: 6, color: "#9c8672" },
  { id: "oak_stock", name: "Oak stock", value: 40, log: "oak_logs", level: 24, xp: 16, color: "#b59c7d" },
  { id: "willow_stock", name: "Willow stock", value: 64, log: "willow_logs", level: 39, xp: 22, color: "#a5a67d" },
  { id: "maple_stock", name: "Maple stock", value: 130, log: "maple_logs", level: 54, xp: 32, color: "#c49a74" },
  { id: "yew_stock", name: "Yew stock", value: 320, log: "yew_logs", level: 69, xp: 50, color: "#7d6b5c" },
  { id: "ashwood_stock", name: "Ashwood stock", value: 700, log: "ash_logs", level: 84, xp: 70, color: "#d6d3cc" },
] as const;
/**
 * Crossbows: metal limbs (two bars at the anvil) fixed to a wooden stock with Crafting. One-handed, so a shield fits;
 * slower than a bow, and each bolt hits harder. They fire bolts, never arrows.
 */
export const CROSSBOWS: readonly { metal: MetalId; stock: string; level: number; ranged: number; strength: number; craft: number; xp: number; value: number }[] = [
  { metal: "pewter", stock: "wooden_stock", level: 1, ranged: 12, strength: 10, craft: 8, xp: 12, value: 140 },
  { metal: "blackiron", stock: "oak_stock", level: 10, ranged: 20, strength: 12, craft: 18, xp: 22, value: 380 },
  { metal: "ashsteel", stock: "oak_stock", level: 20, ranged: 28, strength: 14, craft: 28, xp: 34, value: 900 },
  { metal: "moonsilver", stock: "willow_stock", level: 30, ranged: 38, strength: 18, craft: 42, xp: 50, value: 2000 },
  { metal: "glimmer", stock: "maple_stock", level: 40, ranged: 54, strength: 22, craft: 56, xp: 70, value: 4600 },
  { metal: "rarite", stock: "yew_stock", level: 45, ranged: 70, strength: 26, craft: 70, xp: 95, value: 11000 },
  { metal: "frostsilver", stock: "yew_stock", level: 50, ranged: 80, strength: 28, craft: 76, xp: 120, value: 22000 },
  { metal: "gloomsteel", stock: "yew_stock", level: 60, ranged: 90, strength: 30, craft: 80, xp: 140, value: 34000 },
  { metal: "wyrmscale", stock: "ashwood_stock", level: 70, ranged: 102, strength: 33, craft: 84, xp: 165, value: 50000 },
  { metal: "hollowsteel", stock: "ashwood_stock", level: 75, ranged: 110, strength: 35, craft: 88, xp: 185, value: 64000 },
  { metal: "cindersteel", stock: "ashwood_stock", level: 80, ranged: 118, strength: 38, craft: 92, xp: 205, value: 80000 },
  { metal: "ashenheart", stock: "ashwood_stock", level: 90, ranged: 134, strength: 42, craft: 96, xp: 240, value: 120000 },
];
/** Crossbow limbs: two bars each, a few Smithing levels over the metal's dagger. */
export const LIMBS_OFFSET = 6;
const ARROW_STRENGTH = [7, 10, 16, 22, 31, 49, 56, 64, 72, 78, 84, 96], BOLT_STRENGTH = [9, 13, 20, 28, 39, 61, 68, 76, 86, 92, 100, 114];
const RANGED_GEAR: Item[] = [
  ...BOWS.map(bow => ({
    id: bow.id, name: bow.name, value: bow.value, icon: { shape: "bow" as const, color: bow.color, accent: bow.id === "gloomfang_bow" ? "#cf6e6e" : undefined },
    examine: bow.id === "gloomfang_bow" ? "Strung with something that howls when you draw it." : `A bow of ${bow.id === "shortbow" ? "plain" : bow.name.split(" ")[0].toLowerCase()} wood.`,
    equip: { slot: "weapon" as const, bonuses: { ranged: bow.ranged }, requires: bow.level > 1 ? { ranged: bow.level } : undefined, speed: 4, twoHanded: true, bow: { range: 7 } },
  })),
  ...WAR_BOWS.map(bow => ({
    id: bow.id, name: bow.name, value: bow.value, icon: { shape: "warbow" as const, color: bow.color },
    examine: `A tall ${bow.id === "war_bow" ? "" : `${bow.name.split(" ")[0].toLowerCase()} `}bow, hard to draw. Slower than a plain bow, but every arrow lands harder.`,
    equip: { slot: "weapon" as const, bonuses: { ranged: bow.ranged }, requires: { ranged: bow.level }, speed: 5, twoHanded: true, bow: { range: 8, strength: bow.strength } },
  })),
  ...STOCKS.map(stock => ({ id: stock.id, name: stock.name, value: stock.value, icon: { shape: "stock" as const, color: stock.color },
    examine: "A carved crossbow stock. It needs metal limbs." })),
  ...METALS.map(metal => ({ id: `${metal.id}_limbs`, name: `${metal.name} limbs`, value: Math.round(metal.value * 3.2 + 10), icon: { shape: "limbs" as const, color: metal.color },
    examine: `Crossbow limbs of ${metal.id}. Fix them to the right stock.` })),
  ...CROSSBOWS.map(bow => {
    const metal = METALS.find(entry => entry.id === bow.metal)!, stock = STOCKS.find(entry => entry.id === bow.stock)!;
    return {
      id: `${bow.metal}_crossbow`, name: `${metal.name} crossbow`, value: bow.value, icon: { shape: "crossbow" as const, color: metal.color, accent: stock.color },
      examine: `${metal.name} limbs on ${stock.name.toLowerCase().replace(" stock", "")} stock. Fires bolts: slower than a bow, harder hitting, and one-handed, so a shield fits.`,
      equip: { slot: "weapon" as const, bonuses: { ranged: bow.ranged }, requires: bow.level > 1 ? { ranged: bow.level } : undefined, speed: 5, bow: { range: 7, strength: bow.strength, bolts: true } },
    };
  }),
  ...METALS.map((metal, index) => ({
    id: `${metal.id}_bolts`, name: `${metal.name} bolts`, examine: `Stubby bolts with ${metal.id} tips. Any crossbow fires them.`, value: [4, 8, 16, 32, 64, 140, 220, 320, 460, 580, 720, 1100][index], stackable: true,
    icon: { shape: "bolts" as const, color: metal.color }, ammo: { strength: BOLT_STRENGTH[index], level: metal.level, bolt: true },
  })),
  ...METALS.map((metal, index) => ({
    id: `${metal.id}_bolts_unf`, name: `Unfeathered ${metal.id} bolts`, examine: "Bolts straight off the anvil. Feathers will fly them true.", value: [1, 3, 6, 12, 24, 55, 90, 130, 190, 240, 300, 440][index], stackable: true,
    icon: { shape: "bolts" as const, color: metal.color, accent: "unf" },
  })),
  ...METALS.map((metal, index) => ({
    id: `${metal.id}_arrow`, name: `${metal.name} arrows`, examine: `Arrows with ${metal.id} heads.`, value: [3, 6, 12, 24, 48, 110, 180, 260, 380, 480, 600, 900][index], stackable: true,
    icon: { shape: "arrow" as const, color: metal.color }, ammo: { strength: ARROW_STRENGTH[index], level: metal.level },
  })),
  // Hazel's quiver (the Fernwick quest's reward): worn on your back, and most shots fly home to it.
  { id: "hazels_quiver", name: "Hazel's quiver", examine: "Hazel's grandmother's quiver, restitched. Four arrows or bolts in five fly home to it after the shot.", value: 1200, tradeable: false,
    icon: { shape: "quiver", color: "#8a5a3a", accent: "#c9a24a" }, equip: { slot: "cape", bonuses: { ranged: 4, defence: 1 } } },
  { id: "torn_quiver", name: "Torn quiver", examine: "Hazel's family quiver, ripped and muddy, with Grumblin teeth marks. Hazel will want this back.", value: 0, tradeable: false,
    icon: { shape: "quiver", color: "#6d5a48", accent: "torn" } },
  { id: "hunter_coif", name: "Hunter's coif", examine: "A soft leather coif. Keeps the hair out of your eyes.", value: 40, icon: { shape: "hood", color: "#a5a67d" }, equip: { slot: "head", bonuses: { ranged: 3, defence: 2 } } },
  { id: "hunter_vest", name: "Hunter's vest", examine: "Stitched for drawing a bow all day.", value: 90, icon: { shape: "body", color: "#a5a67d" }, equip: { slot: "body", bonuses: { ranged: 8, defence: 6 } } },
  { id: "hunter_chaps", name: "Hunter's chaps", examine: "Hard-wearing leather chaps.", value: 70, icon: { shape: "legs", color: "#8e8f6a" }, equip: { slot: "legs", bonuses: { ranged: 5, defence: 4 } } },
  { id: "hunter_bracers", name: "Hunter's bracers", examine: "They take the sting out of a bowstring.", value: 45, icon: { shape: "bracer", color: "#8e8f6a" }, equip: { slot: "hands", bonuses: { ranged: 4, defence: 2 } } },
  { id: "frosthide_coif", name: "Frosthide coif", examine: "Frost-wolf hide, still cold.", value: 900, icon: { shape: "hood", color: "#c7d3dc" }, equip: { slot: "head", bonuses: { ranged: 6, defence: 8 }, requires: { ranged: 30 } } },
  { id: "frosthide_vest", name: "Frosthide vest", examine: "Frost-wolf hide, laced tight.", value: 2400, icon: { shape: "body", color: "#c7d3dc" }, equip: { slot: "body", bonuses: { ranged: 15, defence: 22 }, requires: { ranged: 30 } } },
  { id: "frosthide_chaps", name: "Frosthide chaps", examine: "Frost-wolf hide chaps.", value: 1600, icon: { shape: "legs", color: "#afbccb" }, equip: { slot: "legs", bonuses: { ranged: 10, defence: 14 }, requires: { ranged: 30 } } },
  { id: "frosthide_bracers", name: "Frosthide bracers", examine: "Frost-wolf hide bracers.", value: 800, icon: { shape: "bracer", color: "#afbccb" }, equip: { slot: "hands", bonuses: { ranged: 7, defence: 5 }, requires: { ranged: 30 } } },
];

// ---------- Slayer, mastery capes, tablets and lamps ----------
const MASTERY_BONUS: Partial<Bonuses> = { attack: 4, strength: 4, defence: 9, ranged: 4, magic: 4, prayer: 4 };
const OTHER_ITEMS: Item[] = [
  { id: "slayer_gem", name: "Warden's gem", examine: "Tells you your Slayer task when you look into it.", value: 1, icon: { shape: "gem", color: "#6d8a8f", accent: "#161616" } },
  { id: "slayer_helm", name: "Warden's helm", examine: "A dark helm that knows your task. +15% accuracy and damage on it.", value: 12000, tradeable: false,
    icon: { shape: "helm", color: "#3b3a38", accent: "#cf6e6e" }, equip: { slot: "head", bonuses: { defence: 12, ranged: 3, magic: 3 }, requires: { defence: 10, slayer: 20 } } },
  ...SKILLS.flatMap(skill => [false, true].map(trimmed => ({
    id: `${skill}_cape${trimmed ? "_t" : ""}`, name: `${SKILL_NAMES[skill]} mastery cape${trimmed ? " (t)" : ""}`, value: 0, price: 99_000, tradeable: false,
    examine: `The cape of a true master of ${SKILL_NAMES[skill]}.${trimmed ? " Trimmed: this Friend has mastered more than one skill." : ""}`,
    icon: { shape: "cape" as const, color: SKILL_COLORS[skill][0], accent: trimmed ? SKILL_COLORS[skill][1] : undefined },
    mastery: { skill, trimmed }, equip: { slot: "cape" as const, bonuses: MASTERY_BONUS, requires: { [skill]: 99 } },
  }))),
  { id: "grandmaster_cape", name: "Grandmaster's cape", examine: "Every skill, mastered. The Realm has run out of things to teach you.", value: 0, price: 1_700_000, tradeable: false,
    icon: { shape: "cape", color: "#e2d49e", accent: "#d8b6b4" }, mastery: { skill: "all", trimmed: true },
    equip: { slot: "cape", bonuses: { attack: 8, strength: 8, defence: 14, ranged: 8, magic: 8, prayer: 8 } } },
  ...([["hollow_square", "Friendhollow"], ["emberforge", "Emberforge"], ["oasis", "Oasis"], ["frostpeak", "Frostpeak"], ["pier", "Pier"]] as const).map(([place, name]) => ({
    id: `tablet_${place}`, name: `${name} tablet`, examine: `Break it to travel to ${name === "Pier" ? "Pike's Pier" : name}.`, value: 120, stackable: true, tablet: place,
    icon: { shape: "tablet" as const, color: { hollow_square: "#e8d4c0", emberforge: "#e9a07a", oasis: "#e2d49e", frostpeak: "#c7d3dc", pier: "#8fa3c9" }[place] },
  })),
  { id: "friendship_cape", name: "Friendship cape", examine: "Given to Friends who bring Friends. Wear it for the Friendship emote.", value: 0, tradeable: false,
    icon: { shape: "cape", color: "#e7a9b0", accent: "#f7f5f0" }, equip: { slot: "cape", bonuses: { attack: 2, strength: 2, defence: 4, ranged: 2, magic: 2, prayer: 2 } } },
  { id: "insight_lamp", name: "Lamp of insight", examine: "Rub it to gain experience in a skill of your choice.", value: 0, tradeable: false, icon: { shape: "lamp", color: "#e2d49e" } },
];

export const ITEM_LIST: readonly Item[] = Object.freeze([...ITEMS, ...metalGear(), ...OTHER_GEAR, ...RANGED_GEAR, ...OTHER_ITEMS]);
const ITEM_MAP = new Map(ITEM_LIST.map(item => [item.id, item]));
export function item(id: string): Item {
  const found = ITEM_MAP.get(id);
  if (!found) throw new Error(`Unknown item ${id}`);
  return found;
}
export const isItem = (id: unknown): id is string => typeof id === "string" && ITEM_MAP.has(id);

// ---------- Gathering ----------
export type TreeKind = "tree" | "oak" | "willow" | "maple" | "yew" | "ashwood";
export const TREES: Record<TreeKind, { name: string; level: number; xp: number; log: string; low: number; high: number; deplete: number; respawn: number }> = {
  tree: { name: "Tree", level: 1, xp: 25, log: "logs", low: 64, high: 200, deplete: 1, respawn: 12 },
  oak: { name: "Oak tree", level: 15, xp: 37.5, log: "oak_logs", low: 32, high: 100, deplete: 1 / 8, respawn: 14 },
  willow: { name: "Willow tree", level: 30, xp: 67.5, log: "willow_logs", low: 16, high: 50, deplete: 1 / 8, respawn: 14 },
  maple: { name: "Maple tree", level: 45, xp: 100, log: "maple_logs", low: 8, high: 25, deplete: 1 / 8, respawn: 50 },
  yew: { name: "Yew tree", level: 60, xp: 175, log: "yew_logs", low: 4, high: 12, deplete: 1 / 8, respawn: 100 },
  ashwood: { name: "Ashwood tree", level: 70, xp: 250, log: "ash_logs", low: 3, high: 9, deplete: 1 / 10, respawn: 150 },
};
export type RockKind = "pewter" | "clay" | "blackiron" | "inkcoal" | "moonsilver" | "glimmer" | "rarite" | "gem" | "sigil";
export const ROCKS: Record<RockKind, { name: string; level: number; xp: number; ore: string; low: number; high: number; respawn: number; color: string }> = {
  sigil: { name: "Sigil stone", level: 1, xp: 5, ore: "sigil_stone", low: 200, high: 400, respawn: 0, color: "#d9d4e6" },
  clay: { name: "Clay rocks", level: 1, xp: 5, ore: "clay", low: 128, high: 400, respawn: 2, color: "#d7c3a5" },
  pewter: { name: "Pewter rocks", level: 1, xp: 17.5, ore: "pewter_ore", low: 100, high: 350, respawn: 4, color: "#a4a7aa" },
  blackiron: { name: "Blackiron rocks", level: 15, xp: 35, ore: "blackiron_ore", low: 96, high: 350, respawn: 9, color: "#5f5e66" },
  inkcoal: { name: "Inkcoal rocks", level: 30, xp: 50, ore: "inkcoal", low: 16, high: 100, respawn: 40, color: "#3b3a38" },
  gem: { name: "Gem rocks", level: 40, xp: 65, ore: "rough_moonstone", low: 28, high: 70, respawn: 60, color: "#9fabc2" },
  moonsilver: { name: "Moonsilver rocks", level: 55, xp: 80, ore: "moonsilver_ore", low: 4, high: 50, respawn: 100, color: "#7d8fb8" },
  glimmer: { name: "Glimmer rocks", level: 70, xp: 95, ore: "glimmer_ore", low: 2, high: 25, respawn: 200, color: "#d9cf9a" },
  rarite: { name: "Rarite rocks", level: 85, xp: 125, ore: "rarite_ore", low: 1, high: 18, respawn: 400, color: "#d8b6b4" },
};
export type SpotKind = "net" | "bait" | "lure" | "cage" | "harpoon" | "deep";
export type Catch = { fish: string; level: number; xp: number; low: number; high: number };
export const FISHING_SPOTS: Record<SpotKind, { name: string; action: string; tool: string; bait?: string; catches: readonly Catch[] }> = {
  net: { name: "Fishing spot", action: "Net", tool: "small_net", catches: [{ fish: "raw_minnows", level: 1, xp: 10, low: 48, high: 256 }] },
  bait: { name: "Fishing spot", action: "Bait", tool: "fishing_rod", bait: "fishing_bait", catches: [
    { fish: "raw_carp", level: 10, xp: 30, low: 24, high: 128 }, { fish: "raw_perch", level: 5, xp: 20, low: 32, high: 192 }] },
  lure: { name: "Rod fishing spot", action: "Lure", tool: "fly_rod", bait: "feather", catches: [
    { fish: "raw_grayling", level: 30, xp: 70, low: 16, high: 96 }, { fish: "raw_char", level: 20, xp: 50, low: 32, high: 192 }] },
  cage: { name: "Fishing spot", action: "Cage", tool: "crab_pot", catches: [{ fish: "raw_inkcrab", level: 40, xp: 90, low: 6, high: 95 }] },
  harpoon: { name: "Fishing spot", action: "Harpoon", tool: "harpoon", catches: [{ fish: "raw_sailfish", level: 50, xp: 100, low: 4, high: 48 }] },
  deep: { name: "Deep fishing spot", action: "Harpoon", tool: "harpoon", catches: [{ fish: "raw_inkshark", level: 76, xp: 110, low: 3, high: 40 }] },
};
/** Cooking: level, XP and the level at which you stop burning (on a range). */
export const COOKING: Record<string, { cooked: string; level: number; xp: number; stopBurn: number }> = {
  raw_minnows: { cooked: "minnows", level: 1, xp: 30, stopBurn: 34 },
  raw_chicken: { cooked: "cooked_chicken", level: 1, xp: 30, stopBurn: 34 },
  raw_beef: { cooked: "cooked_meat", level: 1, xp: 30, stopBurn: 34 },
  raw_perch: { cooked: "perch", level: 1, xp: 40, stopBurn: 38 },
  raw_carp: { cooked: "carp", level: 5, xp: 50, stopBurn: 41 },
  raw_char: { cooked: "char", level: 15, xp: 70, stopBurn: 50 },
  raw_grayling: { cooked: "grayling", level: 25, xp: 90, stopBurn: 58 },
  raw_inkcrab: { cooked: "inkcrab", level: 40, xp: 120, stopBurn: 74 },
  raw_sailfish: { cooked: "sailfish", level: 45, xp: 140, stopBurn: 86 },
  raw_inkshark: { cooked: "inkshark", level: 80, xp: 210, stopBurn: 99 },
};
export const FIREMAKING: Record<string, { level: number; xp: number }> = {
  logs: { level: 1, xp: 40 }, oak_logs: { level: 15, xp: 60 }, willow_logs: { level: 30, xp: 90 },
  maple_logs: { level: 45, xp: 135 }, yew_logs: { level: 60, xp: 202.5 }, ash_logs: { level: 70, xp: 280 },
};
/** Smelting: ores in, bar out. Blackiron has a 50% success rate without a ring (like the classic furnace). */
export const SMELTING: Record<MetalId, { level: number; xp: number; ores: Readonly<Record<string, number>>; chance?: number }> = {
  pewter: { level: 1, xp: 8, ores: { pewter_ore: 1 } },
  blackiron: { level: 15, xp: 13, ores: { blackiron_ore: 1 }, chance: 0.6 },
  ashsteel: { level: 30, xp: 18, ores: { blackiron_ore: 1, inkcoal: 1 } },
  moonsilver: { level: 50, xp: 30, ores: { moonsilver_ore: 1, inkcoal: 2 } },
  glimmer: { level: 70, xp: 38, ores: { glimmer_ore: 1, inkcoal: 3 } },
  rarite: { level: 85, xp: 50, ores: { rarite_ore: 1, inkcoal: 4 } },
  frostsilver: { level: 86, xp: 60, ores: { frost_shard: 1, inkcoal: 4 } },
  gloomsteel: { level: 88, xp: 70, ores: { gloom_shard: 1, inkcoal: 4 } },
  wyrmscale: { level: 90, xp: 80, ores: { wyrm_scale: 1, inkcoal: 5 } },
  hollowsteel: { level: 92, xp: 88, ores: { hollow_essence: 1, inkcoal: 5 } },
  cindersteel: { level: 94, xp: 96, ores: { cinder_core: 1, inkcoal: 6 } },
  ashenheart: { level: 96, xp: 110, ores: { colossus_ember: 1, inkcoal: 6 } },
};
export const SMITH_XP: Record<MetalId, number> = { pewter: 12.5, blackiron: 25, ashsteel: 37.5, moonsilver: 50, glimmer: 62.5, rarite: 75,
  frostsilver: 85, gloomsteel: 95, wyrmscale: 105, hollowsteel: 115, cindersteel: 125, ashenheart: 140 };
/** The Smithing level for something `offset` levels over a metal's base (forged metals squeeze their pieces into the last few levels). */
export function metalLevel(metal: MetalId, offset: number) {
  const forged = METALS.find(entry => entry.id === metal)!.tier > 6;
  return Math.min(99, SMITHING_BASE[metal] + Math.round(offset * (forged ? 0.25 : 1)));
}
export function smithLevel(metal: MetalId, piece: SmithPiece) {
  return metalLevel(metal, SMITH_PIECES.find(entry => entry.piece === piece)!.offset);
}
export const CRAFTING = [
  { product: "leather_gloves", level: 1, xp: 13.8, leather: 1 },
  { product: "leather_boots", level: 7, xp: 16.25, leather: 1 },
  { product: "leather_hood", level: 9, xp: 18.5, leather: 1 },
  { product: "leather_bracers", level: 11, xp: 22, leather: 1 },
  { product: "leather_jerkin", level: 14, xp: 25, leather: 1 },
  { product: "leather_leggings", level: 18, xp: 27, leather: 1 },
  { product: "drakehide_bracers", level: 57, xp: 62, leather: 1, hide: "drakehide" },
  { product: "drakehide_chaps", level: 60, xp: 124, leather: 2, hide: "drakehide" },
  { product: "drakehide_vest", level: 63, xp: 186, leather: 3, hide: "drakehide" },
] as { product: string; level: number; xp: number; leather: number; hide?: string }[];
/** Fletching: a knife on logs makes arrow shafts or a bow; shafts and feathers make headless arrows; heads finish them. */
export const FLETCH_BOWS = [
  { log: "logs", bow: "shortbow", level: 5, xp: 5 }, { log: "oak_logs", bow: "oak_bow", level: 20, xp: 16.5 },
  { log: "willow_logs", bow: "willow_bow", level: 35, xp: 33 }, { log: "maple_logs", bow: "maple_bow", level: 50, xp: 50 },
  { log: "yew_logs", bow: "yew_bow", level: 65, xp: 67.5 }, { log: "ash_logs", bow: "ashwood_bow", level: 80, xp: 83 },
] as const;
/** Arrow tiers: Fletching level and XP per arrow. Arrowheads come from the anvil (15 per bar). */
export const FLETCH_ARROWS: Record<MetalId, { level: number; xp: number }> = {
  pewter: { level: 1, xp: 1.3 }, blackiron: { level: 15, xp: 2.5 }, ashsteel: { level: 30, xp: 5 }, moonsilver: { level: 45, xp: 7.5 }, glimmer: { level: 60, xp: 10 }, rarite: { level: 75, xp: 12.5 },
  frostsilver: { level: 80, xp: 15 }, gloomsteel: { level: 84, xp: 17.5 }, wyrmscale: { level: 88, xp: 20 }, hollowsteel: { level: 91, xp: 22 }, cindersteel: { level: 93, xp: 24 }, ashenheart: { level: 95, xp: 27 },
};
/** Sigilcraft: the altar for each sigil, the level it needs and XP per stone. Higher levels press more sigils per stone. */
export const SIGILCRAFT = [
  { sigil: "breeze_sigil", level: 1, xp: 5 }, { sigil: "thought_sigil", level: 2, xp: 5.5 }, { sigil: "tide_sigil", level: 5, xp: 6 },
  { sigil: "stone_sigil", level: 9, xp: 6.5 }, { sigil: "ember_sigil", level: 14, xp: 7 }, { sigil: "shade_sigil", level: 20, xp: 7.5 },
  { sigil: "star_sigil", level: 27, xp: 8 }, { sigil: "storm_sigil", level: 35, xp: 8.5 }, { sigil: "bloom_sigil", level: 44, xp: 9 },
  { sigil: "path_sigil", level: 54, xp: 9.5 }, { sigil: "hollow_sigil", level: 65, xp: 10.5 },
] as const;
/** Sigils per stone at your Sigilcraft level: one more for every 11 levels past the altar's. */
export const sigilsPerStone = (level: number, needed: number) => Math.min(6, 1 + Math.floor(Math.max(0, level - needed) / 11));
/** Staffs that stand in for a sigil. */
export const STAFF_SIGILS: Record<string, string> = { breeze_staff: "breeze_sigil", tide_staff: "tide_sigil", stone_staff: "stone_sigil", ember_staff: "ember_sigil" };
export const GEM_CUTTING: Record<string, { cut: string; level: number; xp: number }> = {
  rough_moonstone: { cut: "moonstone", level: 20, xp: 50 },
  rough_sagestone: { cut: "sagestone", level: 27, xp: 67.5 },
  rough_rosestone: { cut: "rosestone", level: 34, xp: 85 },
};

// ---------- Magic and prayer ----------
export type SpellKind = "strike" | "bolt" | "blast" | "curse" | "bind" | "teleport" | "alchemy" | "superheat" | "grab" | "enchant" | "bloom";
export type SpellTarget = "monster" | "item" | "ground" | "self";
export type Spell = {
  id: string; name: string; level: number; xp: number; sigils: Readonly<Record<string, number>>; kind: SpellKind; element: string; target: SpellTarget;
  maxHit?: number; teleport?: "hollow_square" | "emberforge" | "oasis" | "frostpeak" | "pier"; curse?: { stat: "attack" | "strength" | "defence"; amount: number };
  description: string;
};
/** The Realm's spellbook, in level order: combat, curses, utility and teleports. */
export const SPELLS: readonly Spell[] = [
  { id: "home", name: "Homeward", level: 1, xp: 0, sigils: {}, kind: "teleport", element: "home", target: "self", teleport: "hollow_square", description: "Return to Friendhollow. Slow to cast, free, and not in combat." },
  { id: "breeze_dart", name: "Breeze Dart", level: 1, xp: 5.5, sigils: { breeze_sigil: 1, thought_sigil: 1 }, kind: "strike", element: "wind", target: "monster", maxHit: 2, description: "A basic air missile." },
  { id: "muddle", name: "Muddle", level: 3, xp: 13, sigils: { shade_sigil: 1, tide_sigil: 3, stone_sigil: 2 }, kind: "curse", element: "hollow", target: "monster", curse: { stat: "attack", amount: 0.1 }, description: "Lowers a monster's accuracy by 10% for a minute." },
  { id: "tide_dart", name: "Tide Dart", level: 5, xp: 7.5, sigils: { tide_sigil: 1, breeze_sigil: 1, thought_sigil: 1 }, kind: "strike", element: "water", target: "monster", maxHit: 4, description: "A basic water missile." },
  { id: "enchant_moonstone", name: "Enchant Moonstone", level: 7, xp: 17.5, sigils: { star_sigil: 1, tide_sigil: 1 }, kind: "enchant", element: "water", target: "item", description: "Turns a cut moonstone into a moonstone pendant." },
  { id: "stone_dart", name: "Stone Dart", level: 9, xp: 9.5, sigils: { stone_sigil: 2, breeze_sigil: 1, thought_sigil: 1 }, kind: "strike", element: "earth", target: "monster", maxHit: 6, description: "A basic earth missile." },
  { id: "wilt", name: "Wilt", level: 11, xp: 21, sigils: { shade_sigil: 1, tide_sigil: 3, stone_sigil: 2 }, kind: "curse", element: "hollow", target: "monster", curse: { stat: "strength", amount: 0.1 }, description: "Lowers a monster's strength by 10% for a minute." },
  { id: "ember_dart", name: "Ember Dart", level: 13, xp: 11.5, sigils: { ember_sigil: 3, breeze_sigil: 2, thought_sigil: 1 }, kind: "strike", element: "fire", target: "monster", maxHit: 8, description: "A basic fire missile." },
  { id: "bonebloom", name: "Bonebloom", level: 15, xp: 25, sigils: { bloom_sigil: 1, stone_sigil: 2, tide_sigil: 2 }, kind: "bloom", element: "earth", target: "self", description: "Turns every bone in your pack into sweetberries." },
  { id: "breeze_lance", name: "Breeze Lance", level: 17, xp: 13.5, sigils: { breeze_sigil: 2, storm_sigil: 1 }, kind: "bolt", element: "wind", target: "monster", maxHit: 9, description: "A low level air missile." },
  { id: "bind", name: "Rootsnare", level: 20, xp: 30, sigils: { bloom_sigil: 2, stone_sigil: 3, tide_sigil: 3 }, kind: "bind", element: "earth", target: "monster", description: "Roots a monster in place for ten seconds." },
  { id: "gilded_touch", name: "Gilded Touch", level: 21, xp: 31, sigils: { bloom_sigil: 1, ember_sigil: 3 }, kind: "alchemy", element: "fire", target: "item", description: "Turns an item into coins: 40% of its value." },
  { id: "tide_lance", name: "Tide Lance", level: 23, xp: 16.5, sigils: { tide_sigil: 2, breeze_sigil: 2, storm_sigil: 1 }, kind: "bolt", element: "water", target: "monster", maxHit: 10, description: "A low level water missile." },
  { id: "glide_friendhollow", name: "Glide to Friendhollow", level: 25, xp: 35, sigils: { path_sigil: 1, breeze_sigil: 3, ember_sigil: 1 }, kind: "teleport", element: "moon", target: "self", teleport: "hollow_square", description: "Teleports you to Friendhollow square." },
  { id: "curse", name: "Brittle", level: 27, xp: 29, sigils: { shade_sigil: 1, tide_sigil: 2, stone_sigil: 3 }, kind: "curse", element: "hollow", target: "monster", curse: { stat: "defence", amount: 0.12 }, description: "Lowers a monster's defence by 12% for a minute." },
  { id: "glide_emberforge", name: "Glide to Emberforge", level: 31, xp: 41, sigils: { path_sigil: 1, breeze_sigil: 3, stone_sigil: 1 }, kind: "teleport", element: "fire", target: "self", teleport: "emberforge", description: "Teleports you to Emberforge." },
  { id: "far_reach", name: "Far Reach", level: 33, xp: 43, sigils: { path_sigil: 1, breeze_sigil: 1 }, kind: "grab", element: "wind", target: "ground", description: "Takes an item from the ground up to eight tiles away." },
  { id: "ember_lance", name: "Ember Lance", level: 35, xp: 22.5, sigils: { ember_sigil: 4, breeze_sigil: 3, storm_sigil: 1 }, kind: "bolt", element: "fire", target: "monster", maxHit: 12, description: "A low level fire missile." },
  { id: "glide_oasis", name: "Glide to the Oasis", level: 37, xp: 48, sigils: { path_sigil: 1, breeze_sigil: 1, ember_sigil: 2 }, kind: "teleport", element: "gold", target: "self", teleport: "oasis", description: "Teleports you to the Oasis in the Pale Dunes." },
  { id: "breeze_burst", name: "Breeze Burst", level: 41, xp: 25.5, sigils: { breeze_sigil: 3, hollow_sigil: 1 }, kind: "blast", element: "wind", target: "monster", maxHit: 13, description: "A medium level air missile." },
  { id: "forgeheart", name: "Forgeheart", level: 43, xp: 53, sigils: { bloom_sigil: 1, ember_sigil: 4 }, kind: "superheat", element: "fire", target: "item", description: "Melts ore into a bar in your hands, no furnace needed (and trains Smithing)." },
  { id: "glide_frostpeak", name: "Glide to Frostpeak", level: 45, xp: 55.5, sigils: { path_sigil: 2, tide_sigil: 2, breeze_sigil: 2 }, kind: "teleport", element: "water", target: "self", teleport: "frostpeak", description: "Teleports you to the Frostpeak lodge." },
  { id: "glide_pier", name: "Glide to the Pier", level: 48, xp: 58, sigils: { path_sigil: 2, tide_sigil: 3 }, kind: "teleport", element: "water", target: "self", teleport: "pier", description: "Teleports you to Pike's Pier on Glass Lake." },
  { id: "enchant_rosestone", name: "Enchant Rosestone", level: 49, xp: 59, sigils: { star_sigil: 1, ember_sigil: 5 }, kind: "enchant", element: "fire", target: "item", description: "Turns a cut rosestone into a rosestone pendant." },
  { id: "golden_touch", name: "Golden Touch", level: 55, xp: 65, sigils: { bloom_sigil: 1, ember_sigil: 5 }, kind: "alchemy", element: "gold", target: "item", description: "Turns an item into coins: 60% of its value." },
  { id: "ember_burst", name: "Ember Burst", level: 59, xp: 34.5, sigils: { ember_sigil: 5, breeze_sigil: 4, hollow_sigil: 1 }, kind: "blast", element: "fire", target: "monster", maxHit: 16, description: "A medium level fire missile." },
];
export type Prayer = { id: string; name: string; level: number; drain: number; effect: Partial<{ attack: number; strength: number; defence: number; magic: number; protect: boolean }>; description: string };
export const PRAYERS: readonly Prayer[] = [
  { id: "paper_shield", name: "Paper Shield", level: 1, drain: 1 / 12, effect: { defence: 0.05 }, description: "+5% Defence" },
  { id: "warm_heart", name: "Warm Heart", level: 4, drain: 1 / 12, effect: { strength: 0.05 }, description: "+5% Strength" },
  { id: "clear_ink", name: "Clear Ink", level: 7, drain: 1 / 12, effect: { attack: 0.05 }, description: "+5% Attack" },
  { id: "quiet_mind", name: "Quiet Mind", level: 9, drain: 1 / 12, effect: { magic: 0.05 }, description: "+5% Magic" },
  { id: "stone_shield", name: "Stone Shield", level: 10, drain: 1 / 6, effect: { defence: 0.1 }, description: "+10% Defence" },
  { id: "bright_heart", name: "Bright Heart", level: 13, drain: 1 / 6, effect: { strength: 0.1 }, description: "+10% Strength" },
  { id: "sharp_ink", name: "Sharp Ink", level: 16, drain: 1 / 6, effect: { attack: 0.1 }, description: "+10% Attack" },
  { id: "deep_mind", name: "Deep Mind", level: 27, drain: 1 / 6, effect: { magic: 0.1 }, description: "+10% Magic" },
  { id: "mountain_shield", name: "Mountain Shield", level: 28, drain: 1 / 3, effect: { defence: 0.15 }, description: "+15% Defence" },
  { id: "burning_heart", name: "Burning Heart", level: 31, drain: 1 / 3, effect: { strength: 0.15 }, description: "+15% Strength" },
  { id: "perfect_ink", name: "Perfect Ink", level: 34, drain: 1 / 3, effect: { attack: 0.15 }, description: "+15% Attack" },
  { id: "friends_ward", name: "Friend's Ward", level: 37, drain: 1 / 3, effect: { protect: true }, description: "Blocks most melee damage" },
];

// ---------- Monsters ----------
export type Drop = { item: string; min: number; max: number; chance: number };
export type MonsterDef = {
  id: string; name: string; level: number; hp: number; attack: number; strength: number; defence: number; magicDef?: number;
  attackBonus: number; defenceBonus: number; maxHit: number; speed: number; aggressive?: boolean; size?: number;
  respawn: number; wander: number; examine: string; always?: readonly Drop[]; drops: readonly Drop[]; art: number; ink?: string;
  attackStyle?: "melee" | "magic"; boss?: boolean; slayerXp?: number;
  /** A world boss: it rises on a schedule for everyone at once, and everyone who wounds it gets loot. */
  worldBoss?: boolean;
  /** The Slayer level needed to wound it. */
  slayer?: number;
  /** Dragonfire: its top hit when it breathes (a Wyrmward shield turns it to a few points). */
  breath?: number;
};
const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
export const MONSTERS: Record<string, MonsterDef> = {
  chicken: { id: "chicken", name: "Chicken", level: 1, hp: 3, attack: 1, strength: 1, defence: 1, attackBonus: 0, defenceBonus: 0, maxHit: 1, speed: 4, respawn: 20, wander: 4, examine: "Yep, definitely a chicken.",
    always: [one("bones", 1), one("raw_chicken", 1)], drops: [one("feather", 0.6, 5, 15)], art: 100 },
  cow: { id: "cow", name: "Cow", level: 2, hp: 8, attack: 1, strength: 1, defence: 1, attackBonus: 0, defenceBonus: 0, maxHit: 1, speed: 4, respawn: 25, wander: 5, examine: "Converts grass to beef.",
    always: [one("bones", 1), one("cowhide", 1), one("raw_beef", 1)], drops: [], art: 101 },
  ink_rat: { id: "ink_rat", name: "Ink rat", level: 1, hp: 2, attack: 1, strength: 1, defence: 1, attackBonus: 0, defenceBonus: 0, maxHit: 1, speed: 4, respawn: 15, wander: 6, examine: "A rat made of spilled ink. It squeaks in monochrome.",
    always: [one("bones", 1)], drops: [coins(1, 4, 0.3)], art: 102 },
  grumblin: { id: "grumblin", name: "Grumblin", level: 5, hp: 7, attack: 4, strength: 4, defence: 1, attackBonus: 2, defenceBonus: 0, maxHit: 2, speed: 4, respawn: 25, wander: 6, examine: "An ugly, grumbling green-grey creature.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(2, 25, 0.45), one("breeze_sigil", 0.1, 3, 8), one("thought_sigil", 0.08, 2, 6), one("pewter_dagger", 0.04), one("pewter_helm", 0.03), one("fishing_bait", 0.08, 5, 15), one("tide_sigil", 0.05, 2, 6), one("pewter_arrow", 0.12, 4, 12), one("shortbow", 0.02)], art: 103 },
  grumblin_chief: { id: "grumblin_chief", name: "Grumblin chief", level: 13, hp: 20, attack: 10, strength: 11, defence: 8, attackBonus: 6, defenceBonus: 5, maxHit: 3, speed: 4, respawn: 50, wander: 3, examine: "The loudest Grumblin. That's how they choose.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(20, 80, 0.6), one("blackiron_sabre", 0.05), one("stone_sigil", 0.1, 5, 12), one("blackiron_helm", 0.05), one("rough_moonstone", 0.03)], art: 104 },
  bandit: { id: "bandit", name: "Dune bandit", level: 22, hp: 28, attack: 20, strength: 20, defence: 16, attackBonus: 12, defenceBonus: 12, maxHit: 4, speed: 4, respawn: 40, wander: 5, examine: "A Friend who took a wrong turn in life.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(20, 120, 0.7), one("ashsteel_dagger", 0.05), one("storm_sigil", 0.08, 2, 6), one("rough_sagestone", 0.02), one("path_sigil", 0.02, 1, 2), one("ashsteel_arrow", 0.1, 5, 15), one("willow_bow", 0.02)], art: 105 },
  swamp_lurker: { id: "swamp_lurker", name: "Swamp lurker", level: 16, hp: 22, attack: 14, strength: 14, defence: 12, attackBonus: 8, defenceBonus: 8, maxHit: 3, speed: 5, respawn: 35, wander: 4, examine: "Mostly mouth, partly mud.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(5, 50, 0.5), one("tide_sigil", 0.12, 6, 18), one("raw_char", 0.1), one("rough_moonstone", 0.02)], art: 106 },
  skeleton: { id: "skeleton", name: "Crypt skeleton", level: 25, hp: 29, attack: 22, strength: 22, defence: 20, attackBonus: 14, defenceBonus: 16, maxHit: 4, speed: 4, respawn: 40, wander: 4, examine: "It rattles when it walks. It used to be a Friend.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(10, 90, 0.6), one("blackiron_greaves", 0.03), one("storm_sigil", 0.06, 3, 7), one("hollow_sigil", 0.02, 1, 3), one("ashsteel_helm", 0.03)], art: 107 },
  wolf: { id: "wolf", name: "Frost wolf", level: 32, hp: 40, attack: 30, strength: 28, defence: 26, attackBonus: 18, defenceBonus: 18, maxHit: 5, speed: 4, respawn: 40, wander: 6, examine: "Its breath freezes as it growls.", aggressive: true,
    always: [one("large_bones", 1)], drops: [one("frost_shard", 0.03), coins(20, 110, 0.4), one("rough_rosestone", 0.02), one("moonsilver_ore", 0.05), one("frosthide_bracers", 0.02), one("moonsilver_arrow", 0.06, 5, 12)], art: 108 },
  moss_colossus: { id: "moss_colossus", name: "Moss colossus", level: 42, hp: 60, attack: 32, strength: 34, defence: 30, attackBonus: 20, defenceBonus: 22, maxHit: 7, speed: 6, respawn: 60, wander: 3, examine: "A Colossus-family giant, grown over with moss.", size: 2,
    always: [one("large_bones", 1)], drops: [coins(30, 250, 0.6), one("moonsilver_sword", 0.03), one("path_sigil", 0.06, 1, 3), one("rough_sagestone", 0.04), one("ashsteel_cuirass", 0.02)], art: 109 },
  frost_yeti: { id: "frost_yeti", name: "Frost yeti", level: 55, hp: 85, attack: 50, strength: 52, defence: 45, attackBonus: 30, defenceBonus: 32, maxHit: 10, speed: 5, respawn: 60, wander: 4, examine: "Every footstep is an avalanche.", aggressive: true, size: 2,
    always: [one("large_bones", 1)], drops: [one("frost_shard", 0.3), one("frostsilver_helm", 0.012), one("frostsilver_sabre", 0.008), coins(80, 400, 0.6), one("glimmer_sabre", 0.02), one("hollow_sigil", 0.08, 2, 5), one("glimmer_ore", 0.06), one("rough_rosestone", 0.04), one("rosestone_pendant", 0.004)], art: 110 },
  shade: { id: "shade", name: "Shade", level: 38, hp: 45, attack: 32, strength: 30, defence: 34, magicDef: 10, attackBonus: 20, defenceBonus: 26, maxHit: 6, speed: 4, respawn: 40, wander: 4, examine: "A shadow with no Friend to belong to.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [one("gloom_shard", 0.05), coins(40, 220, 0.6), one("hollow_sigil", 0.06, 2, 6), one("moonsilver_helm", 0.03), one("rough_rosestone", 0.02)], art: 111, ink: "#2c2b3a" },
  hollow_sentinel: { id: "hollow_sentinel", name: "Hollow sentinel", level: 64, hp: 95, attack: 60, strength: 60, defence: 58, attackBonus: 40, defenceBonus: 48, maxHit: 12, speed: 5, respawn: 50, wander: 3, examine: "Armour with nothing inside. It still remembers how to fight.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [one("gloom_shard", 0.08), one("hollow_essence", 0.2), one("gloomsteel_shield", 0.008), coins(100, 600, 0.7), one("glimmer_cuirass", 0.02), one("rarite_ore", 0.03), one("hollow_sigil", 0.1, 4, 9), one("path_sigil", 0.08, 2, 5)], art: 112, ink: "#1d1d26" },
  hollow_king: { id: "hollow_king", name: "The Hollow King", level: 92, hp: 250, attack: 80, strength: 82, defence: 70, magicDef: 50, attackBonus: 60, defenceBonus: 70, maxHit: 18, speed: 5, respawn: 100, wander: 2, examine: "A crown floating over an empty ring of shadow.", aggressive: true, size: 3, boss: true,
    always: [one("ink_bones", 1), coins(1000, 3000, 1)], drops: [one("hollow_essence", 1, 3, 5), one("hollowsteel_sabre", 0.1), one("hollowsteel_helm", 0.08), one("hollowsteel_staff", 0.06), one("rarite_sabre", 0.12), one("rarite_helm", 0.1), one("moonlit_staff", 0.08), one("rarite_bar", 0.3, 1, 3), one("rosestone_pendant", 0.1)], art: 113, ink: "#111" },
};
Object.assign(MONSTERS, {
  mire_crawler: { id: "mire_crawler", name: "Mire crawler", level: 18, hp: 26, attack: 16, strength: 15, defence: 14, attackBonus: 10, defenceBonus: 10, maxHit: 3, speed: 4, respawn: 30, wander: 4, slayer: 10,
    examine: "Something with too many legs, living under the Murkmire mud. Only a Slayer knows where to hit it.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(10, 60, 0.5), one("bloom_sigil", 0.1, 2, 5), one("blackiron_arrow", 0.15, 8, 20), one("rough_sagestone", 0.03), one("oak_bow", 0.03)], art: 106, ink: "#3d4a36" },
  frost_wisp: { id: "frost_wisp", name: "Frost wisp", level: 36, hp: 44, attack: 30, strength: 28, defence: 30, magicDef: 18, attackBonus: 18, defenceBonus: 22, maxHit: 5, speed: 4, respawn: 35, wander: 5, slayer: 30,
    examine: "A shiver with a face. Blows straight through anyone who hasn't learnt the trick of it.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [one("frost_shard", 0.06), coins(30, 180, 0.6), one("star_sigil", 0.12, 4, 10), one("glimmer_arrow", 0.1, 5, 12), one("frosthide_coif", 0.03), one("frosthide_chaps", 0.02), one("rough_rosestone", 0.03)], art: 111, ink: "#5c7f9e" },
  gloom_hound: { id: "gloom_hound", name: "Gloom hound", level: 58, hp: 80, attack: 52, strength: 54, defence: 46, attackBonus: 32, defenceBonus: 34, maxHit: 9, speed: 4, respawn: 45, wander: 5, slayer: 50,
    examine: "A hound made of the dark between two torches.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [one("gloom_shard", 0.3), one("gloomsteel_sword", 0.01), one("gloomsteel_helm", 0.01), coins(100, 500, 0.7), one("gloomfang_bow", 0.012), one("rarite_arrow", 0.08, 5, 15), one("frosthide_vest", 0.02), one("hollow_sigil", 0.1, 3, 8), one("rarite_ore", 0.03)], art: 108, ink: "#2e2440" },
  ash_drake: { id: "ash_drake", name: "Ash drake", level: 68, hp: 90, attack: 58, strength: 60, defence: 56, magicDef: 40, attackBonus: 34, defenceBonus: 40, maxHit: 9, speed: 5, respawn: 45, wander: 5, breath: 32, size: 2,
    examine: "A young dragon, all ash and appetite. Mind the breath.", aggressive: true,
    always: [one("drake_bones", 1), one("drakehide", 1)], drops: [one("wyrm_scale", 0.3), one("wyrmscale_helm", 0.01), coins(200, 900, 0.7), one("rarite_ore", 0.06), one("hollow_sigil", 0.1, 5, 15), one("path_sigil", 0.08, 3, 8), one("rough_rosestone", 0.05), one("rarite_arrow", 0.08, 8, 20)], art: 114, ink: "#3b3a38" },
  cinder_drake: { id: "cinder_drake", name: "Cinder drake", level: 86, hp: 125, attack: 76, strength: 80, defence: 72, magicDef: 56, attackBonus: 44, defenceBonus: 52, maxHit: 12, speed: 5, respawn: 55, wander: 4, breath: 45, size: 2,
    examine: "Its scales crack like cooling lava.", aggressive: true,
    always: [one("drake_bones", 1), one("drakehide", 1, 1, 2)], drops: [one("wyrm_scale", 0.35, 1, 2), one("cinder_core", 0.08), one("wyrmscale_sabre", 0.01), one("wyrmscale_shield", 0.008), coins(500, 1800, 0.75), one("rarite_bar", 0.08, 1, 2), one("drakehide_bracers", 0.02), one("rarite_sabre", 0.01), one("hollow_sigil", 0.12, 8, 20)], art: 114, ink: "#6b2a22" },
  emberwyrm: { id: "emberwyrm", name: "Old Cinder", level: 148, hp: 340, attack: 110, strength: 112, defence: 96, magicDef: 70, attackBonus: 70, defenceBonus: 80, maxHit: 20, speed: 5, respawn: 120, wander: 2, breath: 65, size: 3, boss: true,
    examine: "The oldest dragon in the Realm. The mountain is warm because she sleeps in it.", aggressive: true,
    always: [one("drake_bones", 1, 3, 3), coins(3000, 9000, 1)], drops: [one("cinder_core", 1, 1, 3), one("colossus_ember", 0.1), one("cindersteel_sabre", 0.08), one("cindersteel_shield", 0.06), one("wyrm_heart", 0.25), one("drakehide_vest", 0.08), one("drakehide_chaps", 0.1), one("rarite_helm", 0.1), one("rarite_bar", 0.4, 2, 5), one("gloomfang_bow", 0.02)], art: 114, ink: "#161616" },
  ashen_colossus: { id: "ashen_colossus", name: "The Ashen Colossus", level: 210, hp: 1500, attack: 120, strength: 118, defence: 110, magicDef: 90, attackBonus: 70, defenceBonus: 70, maxHit: 18, speed: 6, respawn: 99_999, wander: 1,
    size: 3, boss: true, worldBoss: true, aggressive: true, examine: "A Colossus-family giant of cinder and ash. It wakes every two hours, and it takes a crowd to put it back to sleep.",
    always: [one("large_bones", 1, 2, 4), coins(4000, 12_000, 1), one("rarite_bar", 1, 1, 3)], drops: [one("colossus_ember", 1, 2, 4), one("ashenheart_sabre", 0.04), one("ashenheart_helm", 0.05), one("ashenheart_staff", 0.03), one("wyrm_heart", 0.3), one("rarite_helm", 0.12), one("drakehide_vest", 0.1), one("gloomfang_bow", 0.04), one("rough_rosestone", 0.25, 1, 3), one("insight_lamp", 0.2)],
    art: 109, ink: "#5a1f14" },
} satisfies Record<string, MonsterDef>);
export function combatLevelOf(monster: MonsterDef) { return monster.level; }

// ---------- Emotes ----------
/** Emotes: how long they play (ticks), and what unlocks the special ones. */
export const EMOTES = [
  { id: "wave", name: "Wave", ticks: 4 }, { id: "bow", name: "Bow", ticks: 4 }, { id: "dance", name: "Dance", ticks: 7 }, { id: "cheer", name: "Cheer", ticks: 5 },
  { id: "clap", name: "Clap", ticks: 4 }, { id: "laugh", name: "Laugh", ticks: 5 }, { id: "cry", name: "Cry", ticks: 5 }, { id: "think", name: "Think", ticks: 5 },
  { id: "jump", name: "Jump for joy", ticks: 4 }, { id: "yes", name: "Yes", ticks: 3 }, { id: "no", name: "No", ticks: 3 }, { id: "spin", name: "Spin", ticks: 4 },
  { id: "flex", name: "Flex", ticks: 4 },
  { id: "skillcape", name: "Skillcape", ticks: 8, needs: "a mastery cape (wear one)" },
  { id: "friendship", name: "Friendship", ticks: 8, needs: "the Friendship cape (wear it): refer a friend, or use a friend's code" },
] as const;
export type EmoteId = typeof EMOTES[number]["id"];

// ---------- Slayer ----------
/** Tasks the Warden hands out: the creatures that count, how many, and the combat level you need for them. */
export const SLAYER_TASKS = [
  { id: "rats", name: "ink rats", monsters: ["ink_rat"], min: 1, amount: [12, 20] },
  { id: "cows", name: "cows", monsters: ["cow"], min: 1, amount: [10, 18] },
  { id: "grumblins", name: "Grumblins", monsters: ["grumblin", "grumblin_chief"], min: 3, amount: [15, 30] },
  { id: "lurkers", name: "swamp lurkers", monsters: ["swamp_lurker"], min: 12, amount: [15, 30] },
  { id: "crawlers", name: "mire crawlers", monsters: ["mire_crawler"], min: 15, amount: [15, 30], slayer: 10 },
  { id: "bandits", name: "dune bandits", monsters: ["bandit"], min: 20, amount: [20, 40] },
  { id: "skeletons", name: "crypt skeletons", monsters: ["skeleton"], min: 22, amount: [20, 40] },
  { id: "wolves", name: "frost wolves", monsters: ["wolf"], min: 28, amount: [20, 40] },
  { id: "wisps", name: "frost wisps", monsters: ["frost_wisp"], min: 30, amount: [20, 40], slayer: 30 },
  { id: "colossi", name: "moss colossi", monsters: ["moss_colossus"], min: 38, amount: [15, 35] },
  { id: "shades", name: "shades", monsters: ["shade"], min: 40, amount: [20, 40] },
  { id: "yetis", name: "frost yetis", monsters: ["frost_yeti"], min: 50, amount: [15, 30] },
  { id: "hounds", name: "gloom hounds", monsters: ["gloom_hound"], min: 55, amount: [20, 40], slayer: 50 },
  { id: "sentinels", name: "hollow sentinels", monsters: ["hollow_sentinel"], min: 60, amount: [20, 40] },
  { id: "drakes", name: "drakes", monsters: ["ash_drake", "cinder_drake"], min: 70, amount: [10, 25] },
] as const;
export type SlayerTask = typeof SLAYER_TASKS[number];
/** What Slayer points buy from the Warden. */
export const SLAYER_REWARDS = [
  { id: "skip", name: "Cancel my task", cost: 30, text: "A new task, and your streak stays." },
  { id: "slayer_helm", name: "Warden's helm", cost: 150, text: "+15% accuracy and damage on task (Slayer 20, Defence 10)." },
  { id: "gloomfang_bow", name: "Gloomfang bow", cost: 600, text: "The Warden's own bow (Ranged 60)." },
  { id: "insight_lamp", name: "Lamp of insight", cost: 100, text: "Experience in a skill of your choice." },
] as const;

// ---------- NPCs, shops ----------
/** Kinds of goods merchants buy. */
export type Category = "fish" | "logs" | "ore" | "bar" | "gem" | "hide" | "bow" | "arrow" | "sigil" | "armour" | "weapon" | "magic" | "food" | "bones" | "jewellery" | "other";
export function itemCategory(id: string): Category {
  const it = item(id), shape = it.icon.shape, slot = it.equip?.slot;
  if (shape === "fish") return "fish";
  if (shape === "log") return "logs";
  if (id === "sigil_stone" || shape === "sigil") return "sigil";
  if (shape === "ore" || shape === "material") return "ore";
  if (shape === "bar") return "bar";
  if (shape === "gem" && id !== "slayer_gem") return "gem";
  if (shape === "hide" || shape === "leather" || id.startsWith("drakehide") || id.startsWith("leather_") || id.startsWith("hunter_") || id.startsWith("frosthide")) return "hide";
  if (shape === "bow" || shape === "warbow" || shape === "crossbow" || shape === "limbs" || shape === "stock") return "bow";
  if (shape === "arrow" || shape === "arrowheads" || shape === "bolts") return "arrow";
  if (it.equip?.staff || id.startsWith("scholar")) return "magic";
  if (shape === "amulet" || id === "wyrm_heart") return "jewellery";
  if (slot === "weapon") return "weapon";
  if (slot && slot !== "cape") return "armour";
  if (it.heal) return "food";
  if (it.bones) return "bones";
  return "other";
}
export type ShopDef = { id: string; name: string; stock: readonly string[]; general?: boolean; buys?: readonly Category[]; rate?: number };
export const SHOPS: Record<string, ShopDef> = {
  general: { id: "general", name: "Friendhollow General Store", general: true, stock: ["pot", "bucket", "tinderbox", "hammer", "knife", "chisel", "needle", "thread", "small_net", "pewter_axe", "pewter_pickaxe", "bread", "team_cape"] },
  general_ember: { id: "general_ember", name: "Emberforge General Store", general: true, stock: ["pot", "bucket", "tinderbox", "hammer", "knife", "chisel", "pewter_pickaxe", "pewter_axe", "bread", "cooked_meat"] },
  general_frost: { id: "general_frost", name: "Frostpeak Trading Post", general: true, stock: ["pot", "bucket", "tinderbox", "hammer", "knife", "needle", "thread", "pewter_axe", "bread", "cooked_meat", "fishing_bait"] },
  general_oasis: { id: "general_oasis", name: "Oasis Sundries", general: true, stock: ["pot", "bucket", "tinderbox", "knife", "chisel", "needle", "thread", "small_net", "fishing_bait", "bread"] },
  fishing: { id: "fishing", name: "Pike's Tackle", buys: ["fish"], rate: 0.6, stock: ["small_net", "fishing_rod", "fly_rod", "harpoon", "crab_pot", "fishing_bait", "feather", "raw_minnows"] },
  axes: { id: "axes", name: "Axel's Axes", buys: ["logs"], rate: 0.6, stock: ["pewter_axe", "blackiron_axe", "ashsteel_axe", "moonsilver_axe", "pewter_pickaxe", "blackiron_pickaxe", "ashsteel_pickaxe", "moonsilver_pickaxe"] },
  swords: { id: "swords", name: "Emberforge Arms", buys: ["ore", "bar", "weapon", "armour"], rate: 0.55, stock: ["pewter_sword", "blackiron_sword", "ashsteel_sword", "pewter_sabre", "blackiron_sabre", "ashsteel_sabre", "moonsilver_sabre", "pewter_shield", "blackiron_shield", "blackiron_helm", "ashsteel_helm", "blackiron_cuirass"] },
  sigils: { id: "sigils", name: "Runa's Sigils", buys: ["sigil", "magic"], rate: 0.6, stock: ["breeze_sigil", "tide_sigil", "stone_sigil", "ember_sigil", "thought_sigil", "shade_sigil", "storm_sigil", "bloom_sigil", "star_sigil", "path_sigil", "hollow_sigil", "staff", "breeze_staff", "scholar_hat", "scholar_robe"] },
  crafting: { id: "crafting", name: "Tessa's Tannery", buys: ["hide"], rate: 0.6, stock: ["needle", "thread", "chisel", "leather", "leather_gloves", "leather_boots"] },
  oasis: { id: "oasis", name: "Oasis Bazaar", buys: ["gem", "jewellery", "food"], rate: 0.7, stock: ["cake", "bread", "inkshark", "sailfish", "silk", "rough_moonstone", "friends_charm", "moonstone_pendant"] },
  frost: { id: "frost", name: "Frostpeak Outfitters", stock: ["inkcrab", "sailfish", "glimmer_pickaxe", "glimmer_axe", "glimmer_sabre", "glimmer_helm", "glimmer_shield", "hollow_sigil", "path_sigil", "frosthide_coif", "frosthide_bracers", "glimmer_arrow",
    "rarite_pickaxe", "rarite_axe", "frostsilver_pickaxe", "frostsilver_axe", "frostsilver_sword", "frostsilver_helm", "frostsilver_shield", "frostsilver_arrow", "frostsilver_bolts"] },
  armour: { id: "armour", name: "Hollis Armoury", buys: ["armour"], rate: 0.55, stock: ["pewter_helm", "pewter_cuirass", "pewter_greaves", "pewter_shield", "blackiron_helm", "blackiron_cuirass", "blackiron_greaves", "blackiron_shield",
    "ashsteel_helm", "ashsteel_cuirass", "ashsteel_greaves", "ashsteel_shield", "moonsilver_helm", "moonsilver_shield", "leather_gloves", "leather_boots"] },
  weapons: { id: "weapons", name: "Edge & Hilt", buys: ["weapon"], rate: 0.55, stock: ["pewter_dagger", "pewter_sword", "pewter_sabre", "blackiron_dagger", "blackiron_sword", "blackiron_sabre", "ashsteel_dagger", "ashsteel_sword", "ashsteel_sabre",
    "moonsilver_dagger", "moonsilver_sword", "moonsilver_sabre", "glimmer_sword"] },
  archery: { id: "archery", name: "Fletch & Feather", buys: ["bow", "arrow", "logs"], rate: 0.6, stock: ["knife", "arrow_shaft", "headless_arrow", "shortbow", "oak_bow", "willow_bow", "maple_bow", "yew_bow", "pewter_arrow", "blackiron_arrow", "ashsteel_arrow", "moonsilver_arrow",
    "pewter_crossbow", "blackiron_crossbow", "ashsteel_crossbow", "pewter_bolts", "blackiron_bolts", "ashsteel_bolts",
    "hunter_coif", "hunter_vest", "hunter_chaps", "hunter_bracers", "feather"] },
  // Fernwick, the woodcutters' village: the only place that sells war bows, and the best price for logs.
  war_bows: { id: "war_bows", name: "Hazel's War Bows", buys: ["bow", "arrow"], rate: 0.6, stock: ["war_bow", "oak_war_bow", "willow_war_bow", "maple_war_bow", "yew_war_bow",
    "moonsilver_crossbow", "wooden_stock", "oak_stock", "willow_stock", "pewter_bolts", "blackiron_bolts", "ashsteel_bolts", "moonsilver_bolts", "pewter_arrow", "blackiron_arrow", "ashsteel_arrow", "feather", "knife"] },
  timber: { id: "timber", name: "Fernwick Timber Yard", buys: ["logs"], rate: 0.75, stock: ["pewter_axe", "blackiron_axe", "ashsteel_axe", "moonsilver_axe", "knife", "tinderbox", "logs", "oak_logs", "willow_logs", "bread", "cooked_meat"] },
  slayer: { id: "slayer", name: "The Warden's Lodge", stock: ["slayer_gem", "inkcrab", "sailfish", "tablet_hollow_square", "blackiron_arrow", "ashsteel_arrow", "leather_boots"] },
  inn: { id: "inn", name: "The Sleepy Friend", buys: ["fish", "food"], rate: 0.55, stock: ["bread", "cake", "cooked_meat", "cooked_chicken", "carp", "grayling"] },
  wizards: { id: "wizards", name: "The Tower Stores", buys: ["sigil", "magic"], rate: 0.6, stock: ["breeze_sigil", "tide_sigil", "stone_sigil", "ember_sigil", "thought_sigil", "shade_sigil", "star_sigil",
    "staff", "breeze_staff", "tide_staff", "stone_staff", "ember_staff", "scholar_hat", "scholar_robe", "scholar_skirt", "tablet_hollow_square"] },
  bones: { id: "bones", name: "Bone Collector", buys: ["bones", "hide"], rate: 0.65, stock: ["bones", "large_bones"] },
  capes: { id: "capes", name: "The Keeper of Capes", stock: [...SKILLS.map(skill => `${skill}_cape`), "grandmaster_cape"] },
};
// ---------- Pets ----------
/** Little companions found by chance while you train (1 in `odds` per action, luckier at higher levels). */
export type PetDef = { id: string; name: string; from: string; odds: number; text: string };
export const PETS: readonly PetDef[] = [
  { id: "stumpy", name: "Stumpy", from: "Woodcutting", odds: 700, text: "A tree stump with ideas above its station, and a leaf on top." },
  { id: "pebble", name: "Pebble", from: "Mining", odds: 700, text: "A rock that followed you home. It sparkles when it's happy." },
  { id: "bubbles", name: "Bubbles", from: "Fishing", odds: 700, text: "A tiny fish in its own floating bubble." },
  { id: "mote", name: "Mote", from: "Sigilcraft", odds: 250, text: "A speck of sigil light that likes your company." },
  { id: "emberling", name: "Emberling", from: "Dragons", odds: 60, text: "A baby drake. Mostly harmless. Mostly." },
  { id: "cinderkin", name: "Cinderkin", from: "The Ashen Colossus", odds: 6, text: "A chip off the old Colossus, still warm." },
];
export const petDef = (id: string | null | undefined) => PETS.find(pet => pet.id === id);

// ---------- Mounts (the Friendhollow stables) ----------
/** A horse's coat: body, mane and tail, hooves, and markings. */
export type Coat = { body: string; mane: string; hoof: string; socks?: string; blaze?: string; pattern?: "dapple" | "piebald" | "stars"; horn?: string; rainbow?: boolean };
/**
 * Mounts, bought from the stablemaster with simulated RF (each buys Rare Caskets, like the Rare Market's bundles, and the
 * mount comes with them). Riding carries you `speed` tiles a tick without run energy, and each mount has its own gifts.
 */
export type MountDef = {
  id: string; name: string; caskets: number; speed: 2 | 3; coat: Coat; text: string;
  xp?: number; gather?: number; coins?: number; defence?: number; heal?: number; light?: boolean;
};
export const MOUNTS: readonly MountDef[] = [
  { id: "chestnut_horse", name: "Chestnut horse", caskets: 2, speed: 2, coat: { body: "#b0673e", mane: "#6f3a24", hoof: "#3b2a22", blaze: "#f3ece0" },
    text: "A steady gallop: two tiles a tick without tiring." },
  { id: "piebald_pony", name: "Piebald pony", caskets: 2, speed: 2, coat: { body: "#f3efe6", mane: "#3b3a38", hoof: "#3b3a38", pattern: "piebald" }, heal: 20,
    text: "Gallops without tiring, and a cuddle mends you: 1 HP every 12 seconds." },
  { id: "bay_horse", name: "Bay horse", caskets: 3, speed: 2, coat: { body: "#8a4f33", mane: "#2e2522", hoof: "#2e2522", socks: "#2e2522" }, gather: 0.05,
    text: "Gallops without tiring, and carries your tools: gather 5% faster." },
  { id: "grey_horse", name: "Dapple grey", caskets: 3, speed: 2, coat: { body: "#c9c7c2", mane: "#8a8782", hoof: "#57555a", pattern: "dapple" }, coins: 0.1,
    text: "Gallops without tiring, and has a nose for loot: +10% coins from drops and pickpocketing." },
  { id: "palomino", name: "Palomino", caskets: 4, speed: 2, coat: { body: "#e2b56a", mane: "#f6ecd6", hoof: "#6f5440", socks: "#f6ecd6" }, xp: 0.05,
    text: "Gallops without tiring, and everyone learns a little faster in golden company: +5% XP." },
  { id: "black_warhorse", name: "Black warhorse", caskets: 4, speed: 2, coat: { body: "#3a3638", mane: "#1d1b1c", hoof: "#1d1b1c", blaze: "#e8e4da" }, defence: 8,
    text: "Gallops without tiring, and never flinches: +8 Defence bonus while you ride." },
  { id: "unicorn", name: "Unicorn", caskets: 6, speed: 3, coat: { body: "#f7f5f0", mane: "#e7a9b0", hoof: "#c9c2b6", horn: "#ebc26b", rainbow: true }, xp: 0.1, heal: 10,
    text: "Canters three tiles a tick, +10% XP, and its horn mends you: 1 HP every 6 seconds." },
  { id: "moon_unicorn", name: "Moonlit unicorn", caskets: 8, speed: 3, coat: { body: "#3d4263", mane: "#c6d4f0", hoof: "#23263a", horn: "#dfe7f5", pattern: "stars" }, xp: 0.1, gather: 0.1, light: true,
    text: "Canters three tiles a tick, +10% XP, gathers 10% faster, and lights the dark around you." },
];
export const mountDef = (id: string | null | undefined) => MOUNTS.find(mount => mount.id === id);

/** Buy price multipliers. */
export const SHOP_BUY = 1.3, SHOP_SELL = 0.4;

// ---------- Casket (the RF chance game) ----------
/** Kept Rare Relic bonuses, one per casket tier (index = outcome id − 1). */
export const RELICS = [
  { name: "Plain Relic", text: "+2% XP in every skill per relic (max 5)", xpPer: 0.02, max: 5 },
  { name: "Silver Relic", text: "+10% coins from drops and pickpockets per relic (max 3)", coinsPer: 0.1, max: 3 },
  { name: "Moonlit Relic", text: "Gather 10% faster per relic (max 3)", gatherPer: 0.1, max: 3 },
  { name: "Golden Relic", text: "+10% XP and a golden aura while kept", xpPer: 0.1, max: 1 },
] as const;
/**
 * Rare Market bundles. The simulated economy has one thing RF can buy (the Rare Casket), so every bundle buys caskets
 * (open them any time at a casket chest) and adds guaranteed goods on top.
 */
export const RF_BUNDLES = [
  { id: "traveller", name: "Traveller's satchel", caskets: 1, text: "Two of every Realm tablet: break one to travel to Friendhollow, Emberforge, the Oasis, Frostpeak or the Pier." },
  { id: "hamper", name: "Hero's hamper", caskets: 1, text: "Ten inksharks and five cakes, for the Hollow Depths." },
  { id: "insight", name: "Lamp of insight", caskets: 2, text: "Rub it for experience in a skill of your choice (100 × your level)." },
  { id: "contract", name: "Slayer's contract", caskets: 2, text: "40 Slayer points from the Warden." },
  { id: "archer", name: "Archer's quiver", caskets: 2, text: "A maple bow and 300 moonsilver arrows." },
  { id: "tailor", name: "Tailor's pick", caskets: 3, text: "Choose any wardrobe piece up to Moonlit tier, straight onto your Friend." },
  { id: "sigils", name: "Sigil sack", caskets: 1, text: "300 each of breeze, tide, stone, ember and thought sigils, and 30 hollow sigils." },
  { id: "fletcher", name: "Fletcher's crate", caskets: 1, text: "600 arrow shafts, 600 feathers and 300 ashsteel arrowheads." },
  { id: "dragonslayer", name: "Dragonslayer's kit", caskets: 3, text: "A Wyrmward shield, a drakehide vest, 20 inksharks and 200 rarite arrows, for Wyrmreach." },
] as const;
export type RfBundle = typeof RF_BUNDLES[number];
/** RF-exclusive wardrobe: every casket grants one of these, drawn on your Friend. */
export const WARDROBE = [
  { id: "rose_cape", name: "Rose cape", tier: 0, kind: "cape", color: "#d8b6b4" },
  { id: "sage_scarf", name: "Sage scarf", tier: 0, kind: "scarf", color: "#b4c3ab" },
  { id: "paper_crown", name: "Paper crown", tier: 0, kind: "hat", color: "#e6d7b0" },
  { id: "butter_bow", name: "Butter bow", tier: 0, kind: "bow", color: "#e2d49e" },
  { id: "silver_halo", name: "Silver halo", tier: 1, kind: "halo", color: "#d6d9dd" },
  { id: "blue_cape", name: "Moonblue cape", tier: 1, kind: "cape", color: "#9fabc2" },
  { id: "lantern_familiar", name: "Lantern familiar", tier: 1, kind: "lantern", color: "#f2e28f" },
  { id: "moon_wisps", name: "Moon wisps", tier: 2, kind: "aura", color: "#afbccb" },
  { id: "starlit_hood", name: "Starlit hood", tier: 2, kind: "hat", color: "#6f7ea6" },
  { id: "ink_wings", name: "Ink wings", tier: 2, kind: "wings", color: "#5a5963" },
  { id: "golden_aura", name: "Golden aura", tier: 3, kind: "aura", color: "#e2d49e" },
  { id: "rarite_crown", name: "Rarite crown", tier: 3, kind: "hat", color: "#d8b6b4" },
] as const;
export type WardrobeId = typeof WARDROBE[number]["id"];
