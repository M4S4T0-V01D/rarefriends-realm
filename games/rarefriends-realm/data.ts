/**
 * RareFriends Realm content: skills, the XP curve, items, equipment, monsters, NPCs, shops, recipes and family perks.
 * Everything here is plain data so the engine and the tests can share it.
 */

// ---------- Skills and experience ----------
export const SKILLS = [
  "attack", "strength", "defence", "ranged", "hitpoints", "magic", "prayer", "woodcutting", "fishing",
  "cooking", "firemaking", "mining", "smithing", "crafting", "thieving", "agility", "slayer",
] as const;
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  attack: "Attack", strength: "Strength", defence: "Defence", ranged: "Ranged", hitpoints: "Hitpoints", magic: "Magic", prayer: "Prayer",
  woodcutting: "Woodcutting", fishing: "Fishing", cooking: "Cooking", firemaking: "Firemaking", mining: "Mining",
  smithing: "Smithing", crafting: "Crafting", thieving: "Thieving", agility: "Agility", slayer: "Slayer",
};
/** Each skill's colour: its mastery cape, and its trim. */
export const SKILL_COLORS: Record<Skill, [string, string]> = {
  attack: ["#c98f95", "#e2d49e"], strength: ["#8fbf9a", "#e2d49e"], defence: ["#8fa3c9", "#efede7"], ranged: ["#a5a67d", "#efede7"],
  hitpoints: ["#e8e4dc", "#cf6e6e"], magic: ["#6f7ea6", "#e2d49e"], prayer: ["#efede7", "#e2d49e"], woodcutting: ["#8e9f7a", "#c49a74"],
  fishing: ["#8fb3c9", "#efede7"], cooking: ["#9c7aa6", "#e8d4c0"], firemaking: ["#e9a07a", "#e2d49e"], mining: ["#8b8e92", "#c9c2b6"],
  smithing: ["#6d6b67", "#e3a58c"], crafting: ["#b89c86", "#efede7"], thieving: ["#6d6b8a", "#c6bed4"], agility: ["#8f9cb2", "#efede7"],
  slayer: ["#3b3a38", "#cf6e6e"],
};
/** Small glyphs for XP drops and the skills tab (drawn as text). */
export const SKILL_ICONS: Record<Skill, string> = {
  attack: "⚔", strength: "✊", defence: "⛨", hitpoints: "♥", magic: "✦", prayer: "✚", woodcutting: "🪓", fishing: "🐟",
  cooking: "🍳", firemaking: "🔥", mining: "⛏", smithing: "⚒", crafting: "✂", thieving: "✋", agility: "➶", ranged: "➹", slayer: "☠",
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
export type Icon = { shape: IconShape; color: string; accent?: string };
export type IconShape =
  | "coins" | "axe" | "pickaxe" | "sword" | "dagger" | "sabre" | "helm" | "body" | "legs" | "shield" | "boots" | "gloves" | "cape"
  | "amulet" | "log" | "fish" | "ore" | "bar" | "bones" | "sigil" | "staff" | "net" | "rod" | "harpoon" | "pot" | "bucket" | "egg" | "flour"
  | "milk" | "tinderbox" | "hammer" | "knife" | "needle" | "thread" | "chisel" | "gem" | "hide" | "leather" | "meat" | "feather" | "bait"
  | "cake" | "bread" | "berries" | "key" | "wheat" | "lamp" | "scroll" | "silk" | "hood" | "bracer" | "burnt" | "hat" | "crown" | "orb" | "trophy"
  | "bow" | "arrow" | "tablet";
export type Item = {
  id: string; name: string; examine: string; value: number; icon: Icon;
  stackable?: boolean; tradeable?: boolean;
  equip?: { slot: EquipSlot; bonuses: Partial<Bonuses>; requires?: Partial<Record<Skill, number>>; speed?: number; twoHanded?: boolean; staff?: boolean; bow?: { range: number } };
  heal?: number; bones?: number; tool?: { kind: "axe" | "pickaxe"; tier: number; level: number };
  /** Arrows: fired from your pack by any bow. */
  ammo?: { strength: number; level: number };
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
] as const;
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
export const SMITHING_BASE: Record<MetalId, number> = { pewter: 1, blackiron: 15, ashsteel: 30, moonsilver: 50, glimmer: 70, rarite: 85 };

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
  { id: "pewter_ore", name: "Pewter ore", examine: "Soft grey ore. Smelts straight into pewter.", value: 3, icon: { shape: "ore", color: "#a4a7aa" } },
  { id: "blackiron_ore", name: "Blackiron ore", examine: "This needs refining.", value: 17, icon: { shape: "ore", color: "#8c6f62" } },
  { id: "inkcoal", name: "Inkcoal", examine: "Hmm, a non-renewable energy source!", value: 45, icon: { shape: "ore", color: "#3b3a38" } },
  { id: "moonsilver_ore", name: "Moonsilver ore", examine: "This needs refining.", value: 160, icon: { shape: "ore", color: "#7d8fb8" } },
  { id: "glimmer_ore", name: "Glimmer ore", examine: "This needs refining.", value: 400, icon: { shape: "ore", color: "#86a98b" } },
  { id: "rarite_ore", name: "Rarite ore", examine: "Pale rose ore that only forms where Friends dream.", value: 1100, icon: { shape: "ore", color: "#d8b6b4" } },
  { id: "clay", name: "Clay", examine: "Some hard dry clay.", value: 2, icon: { shape: "ore", color: "#d7c3a5" } },
  ...METALS.map(metal => ({ id: `${metal.id}_bar`, name: `${metal.name} bar`, examine: `It's a bar of ${metal.id === "rarite" ? "rarite" : metal.id}.`, value: metal.value, icon: { shape: "bar" as const, color: metal.color } })),
  // Gems
  { id: "rough_moonstone", name: "Rough moonstone", examine: "An rough moonstone.", value: 50, icon: { shape: "gem", color: "#8fa3c9", accent: "#6d6b67" } },
  { id: "rough_sagestone", name: "Rough sagestone", examine: "An rough sagestone.", value: 100, icon: { shape: "gem", color: "#8fbf9a", accent: "#6d6b67" } },
  { id: "rough_rosestone", name: "Rough rosestone", examine: "An rough rosestone.", value: 200, icon: { shape: "gem", color: "#c98f95", accent: "#6d6b67" } },
  { id: "moonstone", name: "Moonstone", examine: "This looks valuable.", value: 250, icon: { shape: "gem", color: "#8fa3c9" } },
  { id: "sagestone", name: "Sagestone", examine: "This looks valuable.", value: 500, icon: { shape: "gem", color: "#8fbf9a" } },
  { id: "rosestone", name: "Rosestone", examine: "This looks valuable.", value: 1000, icon: { shape: "gem", color: "#c98f95" } },
  // Fish and food
  ...([
    ["minnows", "Minnows", 3, 5], ["perch", "Perch", 4, 8], ["carp", "Carp", 5, 15], ["char", "Char", 7, 25],
    ["grayling", "Grayling", 9, 50], ["inkcrab", "Inkcrab", 12, 150], ["sailfish", "Sailfish", 14, 250], ["inkshark", "Inkshark", 20, 600],
  ] as const).flatMap(([id, name, heal, value]) => [
    { id: `raw_${id}`, name: `Raw ${name.toLowerCase()}`, examine: `I should try cooking this.`, value: Math.round(value * 0.6), icon: { shape: "fish" as const, color: "#b9bfc6" } },
    { id, name, examine: `Some nicely cooked ${name.toLowerCase()}.`, value, heal, icon: { shape: "fish" as const, color: "#d7a883" } },
  ]),
  { id: "raw_chicken", name: "Raw chicken", examine: "I need to cook this first.", value: 2, icon: { shape: "meat", color: "#e8c7c0" } },
  { id: "cooked_chicken", name: "Cooked chicken", examine: "Mmm, this looks tasty.", value: 5, heal: 3, icon: { shape: "meat", color: "#c79a6f" } },
  { id: "raw_beef", name: "Raw beef", examine: "I need to cook this first.", value: 2, icon: { shape: "meat", color: "#c98f95" } },
  { id: "cooked_meat", name: "Cooked meat", examine: "Mmm, this looks tasty.", value: 5, heal: 3, icon: { shape: "meat", color: "#8f6a55" } },
  { id: "bread", name: "Bread", examine: "Nice crispy bread.", value: 12, heal: 5, icon: { shape: "bread", color: "#d9b584" } },
  { id: "cake", name: "Cake", examine: "A plain sponge cake.", value: 50, heal: 12, icon: { shape: "cake", color: "#f1e2c8", accent: "#d8b6b4" } },
  { id: "burnt_food", name: "Burnt food", examine: "Oops!", value: 1, icon: { shape: "burnt", color: "#3b3a38" } },
  // Bones and drops
  { id: "bones", name: "Bones", examine: "Bones are for burying!", value: 5, bones: 4.5, icon: { shape: "bones", color: "#f2efe8" } },
  { id: "large_bones", name: "Large bones", examine: "Ew, it's a pile of bones.", value: 60, bones: 15, icon: { shape: "bones", color: "#e7e1d3" } },
  { id: "ink_bones", name: "Ink bones", examine: "Bones stained black. They feel lighter than they should.", value: 250, bones: 50, icon: { shape: "bones", color: "#6d6b67" } },
  { id: "cowhide", name: "Cowhide", examine: "I should take this to the tanner.", value: 8, icon: { shape: "hide", color: "#efede7", accent: "#3b3a38" } },
  { id: "leather", name: "Leather", examine: "It's a piece of leather.", value: 15, icon: { shape: "leather", color: "#b58b6b" } },
  // Sigils
  ...([
    ["breeze_sigil", "Breeze sigil", "#c7d3dc"], ["tide_sigil", "Tide sigil", "#9fb4d0"], ["stone_sigil", "Stone sigil", "#a89479"],
    ["ember_sigil", "Ember sigil", "#d99a82"], ["thought_sigil", "Thought sigil", "#d6c58f"], ["storm_sigil", "Storm sigil", "#d0b27c"],
    ["path_sigil", "Path sigil", "#8fa0c9"], ["hollow_sigil", "Hollow sigil", "#6d6b67"], ["bloom_sigil", "Bloom sigil", "#9fbf9a"],
    ["star_sigil", "Star sigil", "#e2d49e"], ["shade_sigil", "Shade sigil", "#b9a8c9"],
  ] as const).map(([id, name, color]) => ({ id, name, examine: "Used for magic spells.", value: { path_sigil: 180, hollow_sigil: 180, storm_sigil: 90, bloom_sigil: 120, star_sigil: 60 }[id as string] ?? 5, stackable: true, icon: { shape: "sigil" as const, color } })),
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
    const tier = metal.tier, scale = [1, 1.5, 2.2, 3.1, 4.3, 5.8][tier - 1];
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
        icon: { shape: piece.shape as IconShape, color: metal.color },
        equip: {
          slot: piece.slot as EquipSlot, bonuses,
          requires: metal.level > 1 ? { [requireSkill]: metal.level } : undefined,
          speed: piece.speed || undefined,
        },
        tool: isTool ? { kind: piece.piece as "axe" | "pickaxe", tier, level: metal.level } : undefined,
      });
    }
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
const ARROW_STRENGTH = [7, 10, 16, 22, 31, 49];
const RANGED_GEAR: Item[] = [
  ...BOWS.map(bow => ({
    id: bow.id, name: bow.name, value: bow.value, icon: { shape: "bow" as const, color: bow.color, accent: bow.id === "gloomfang_bow" ? "#cf6e6e" : undefined },
    examine: bow.id === "gloomfang_bow" ? "Strung with something that howls when you draw it." : `A bow of ${bow.id === "shortbow" ? "plain" : bow.name.split(" ")[0].toLowerCase()} wood.`,
    equip: { slot: "weapon" as const, bonuses: { ranged: bow.ranged }, requires: bow.level > 1 ? { ranged: bow.level } : undefined, speed: 4, twoHanded: true, bow: { range: 7 } },
  })),
  ...METALS.map((metal, index) => ({
    id: `${metal.id}_arrow`, name: `${metal.name} arrows`, examine: `Arrows with ${metal.id} heads.`, value: [1, 3, 6, 12, 25, 60][index], stackable: true,
    icon: { shape: "arrow" as const, color: metal.color }, ammo: { strength: ARROW_STRENGTH[index], level: metal.level },
  })),
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
export type RockKind = "pewter" | "clay" | "blackiron" | "inkcoal" | "moonsilver" | "glimmer" | "rarite" | "gem";
export const ROCKS: Record<RockKind, { name: string; level: number; xp: number; ore: string; low: number; high: number; respawn: number; color: string }> = {
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
};
export const SMITH_XP: Record<MetalId, number> = { pewter: 12.5, blackiron: 25, ashsteel: 37.5, moonsilver: 50, glimmer: 62.5, rarite: 75 };
export function smithLevel(metal: MetalId, piece: SmithPiece) {
  const offset = SMITH_PIECES.find(entry => entry.piece === piece)!.offset;
  return Math.min(99, SMITHING_BASE[metal] + offset);
}
export const CRAFTING = [
  { product: "leather_gloves", level: 1, xp: 13.8, leather: 1 },
  { product: "leather_boots", level: 7, xp: 16.25, leather: 1 },
  { product: "leather_hood", level: 9, xp: 18.5, leather: 1 },
  { product: "leather_bracers", level: 11, xp: 22, leather: 1 },
  { product: "leather_jerkin", level: 14, xp: 25, leather: 1 },
  { product: "leather_leggings", level: 18, xp: 27, leather: 1 },
] as const;
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
  { id: "enchant_moonstone", name: "Enchant Moonstone", level: 7, xp: 17.5, sigils: { star_sigil: 1, tide_sigil: 1 }, kind: "enchant", element: "water", target: "item", description: "Turns a cut moonstone into an moonstone pendant." },
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
  { id: "enchant_rosestone", name: "Enchant Rosestone", level: 49, xp: 59, sigils: { star_sigil: 1, ember_sigil: 5 }, kind: "enchant", element: "fire", target: "item", description: "Turns a cut rosestone into an rosestone pendant." },
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
  /** The Slayer level needed to wound it. */
  slayer?: number;
};
const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
export const MONSTERS: Record<string, MonsterDef> = {
  chicken: { id: "chicken", name: "Chicken", level: 1, hp: 3, attack: 1, strength: 1, defence: 1, attackBonus: 0, defenceBonus: 0, maxHit: 1, speed: 4, respawn: 20, wander: 4, examine: "Yep, definitely a chicken.",
    always: [one("bones", 1), one("raw_chicken", 1)], drops: [one("feather", 0.6, 5, 15)], art: 100 },
  cow: { id: "cow", name: "Cow", level: 2, hp: 8, attack: 1, strength: 1, defence: 1, attackBonus: 0, defenceBonus: 0, maxHit: 1, speed: 4, respawn: 25, wander: 5, examine: "Converts grass to beef.",
    always: [one("bones", 1), one("cowhide", 1), one("raw_beef", 1)], drops: [], art: 101, size: 2 },
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
    always: [one("large_bones", 1)], drops: [coins(20, 110, 0.4), one("rough_rosestone", 0.02), one("moonsilver_ore", 0.05), one("frosthide_bracers", 0.02), one("moonsilver_arrow", 0.06, 5, 12)], art: 108 },
  moss_colossus: { id: "moss_colossus", name: "Moss colossus", level: 42, hp: 60, attack: 32, strength: 34, defence: 30, attackBonus: 20, defenceBonus: 22, maxHit: 7, speed: 6, respawn: 60, wander: 3, examine: "A Colossus-family giant, grown over with moss.", size: 2,
    always: [one("large_bones", 1)], drops: [coins(30, 250, 0.6), one("moonsilver_sword", 0.03), one("path_sigil", 0.06, 1, 3), one("rough_sagestone", 0.04), one("ashsteel_cuirass", 0.02)], art: 109 },
  frost_yeti: { id: "frost_yeti", name: "Frost yeti", level: 55, hp: 85, attack: 50, strength: 52, defence: 45, attackBonus: 30, defenceBonus: 32, maxHit: 10, speed: 5, respawn: 60, wander: 4, examine: "Every footstep is an avalanche.", aggressive: true, size: 2,
    always: [one("large_bones", 1)], drops: [coins(80, 400, 0.6), one("glimmer_sabre", 0.02), one("hollow_sigil", 0.08, 2, 5), one("glimmer_ore", 0.06), one("rough_rosestone", 0.04), one("rosestone_pendant", 0.004)], art: 110 },
  shade: { id: "shade", name: "Shade", level: 38, hp: 45, attack: 32, strength: 30, defence: 34, magicDef: 10, attackBonus: 20, defenceBonus: 26, maxHit: 6, speed: 4, respawn: 40, wander: 4, examine: "A shadow with no Friend to belong to.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [coins(40, 220, 0.6), one("hollow_sigil", 0.06, 2, 6), one("moonsilver_helm", 0.03), one("rough_rosestone", 0.02)], art: 111, ink: "#2c2b3a" },
  hollow_sentinel: { id: "hollow_sentinel", name: "Hollow sentinel", level: 64, hp: 95, attack: 60, strength: 60, defence: 58, attackBonus: 40, defenceBonus: 48, maxHit: 12, speed: 5, respawn: 50, wander: 3, examine: "Armour with nothing inside. It still remembers how to fight.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [coins(100, 600, 0.7), one("glimmer_cuirass", 0.02), one("rarite_ore", 0.03), one("hollow_sigil", 0.1, 4, 9), one("path_sigil", 0.08, 2, 5)], art: 112, ink: "#1d1d26" },
  hollow_king: { id: "hollow_king", name: "The Hollow King", level: 92, hp: 250, attack: 80, strength: 82, defence: 70, magicDef: 50, attackBonus: 60, defenceBonus: 70, maxHit: 18, speed: 5, respawn: 100, wander: 2, examine: "A crown floating over an empty ring of shadow.", aggressive: true, size: 3, boss: true,
    always: [one("ink_bones", 1), coins(1000, 3000, 1)], drops: [one("rarite_sabre", 0.12), one("rarite_helm", 0.1), one("moonlit_staff", 0.08), one("rarite_bar", 0.3, 1, 3), one("rosestone_pendant", 0.1)], art: 113, ink: "#111" },
};
Object.assign(MONSTERS, {
  mire_crawler: { id: "mire_crawler", name: "Mire crawler", level: 18, hp: 26, attack: 16, strength: 15, defence: 14, attackBonus: 10, defenceBonus: 10, maxHit: 3, speed: 4, respawn: 30, wander: 4, slayer: 10,
    examine: "Something with too many legs, living under the Murkmire mud. Only a Slayer knows where to hit it.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(10, 60, 0.5), one("bloom_sigil", 0.1, 2, 5), one("blackiron_arrow", 0.15, 8, 20), one("rough_sagestone", 0.03), one("oak_bow", 0.03)], art: 106, ink: "#3d4a36" },
  frost_wisp: { id: "frost_wisp", name: "Frost wisp", level: 36, hp: 44, attack: 30, strength: 28, defence: 30, magicDef: 18, attackBonus: 18, defenceBonus: 22, maxHit: 5, speed: 4, respawn: 35, wander: 5, slayer: 30,
    examine: "A shiver with a face. Blows straight through anyone who hasn't learnt the trick of it.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [coins(30, 180, 0.6), one("star_sigil", 0.12, 4, 10), one("glimmer_arrow", 0.1, 5, 12), one("frosthide_coif", 0.03), one("frosthide_chaps", 0.02), one("rough_rosestone", 0.03)], art: 111, ink: "#5c7f9e" },
  gloom_hound: { id: "gloom_hound", name: "Gloom hound", level: 58, hp: 80, attack: 52, strength: 54, defence: 46, attackBonus: 32, defenceBonus: 34, maxHit: 9, speed: 4, respawn: 45, wander: 5, slayer: 50,
    examine: "A hound made of the dark between two torches.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [coins(100, 500, 0.7), one("gloomfang_bow", 0.012), one("rarite_arrow", 0.08, 5, 15), one("frosthide_vest", 0.02), one("hollow_sigil", 0.1, 3, 8), one("rarite_ore", 0.03)], art: 108, ink: "#2e2440" },
} satisfies Record<string, MonsterDef>);
export function combatLevelOf(monster: MonsterDef) { return monster.level; }

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
export type ShopDef = { id: string; name: string; stock: readonly string[]; general?: boolean };
export const SHOPS: Record<string, ShopDef> = {
  general: { id: "general", name: "Friendhollow General Store", general: true, stock: ["pot", "bucket", "tinderbox", "hammer", "knife", "chisel", "needle", "thread", "small_net", "pewter_axe", "pewter_pickaxe", "bread", "team_cape"] },
  fishing: { id: "fishing", name: "Pike's Tackle", stock: ["small_net", "fishing_rod", "fly_rod", "harpoon", "crab_pot", "fishing_bait", "feather", "raw_minnows"] },
  axes: { id: "axes", name: "Axel's Axes", stock: ["pewter_axe", "blackiron_axe", "ashsteel_axe", "moonsilver_axe", "pewter_pickaxe", "blackiron_pickaxe", "ashsteel_pickaxe", "moonsilver_pickaxe"] },
  swords: { id: "swords", name: "Emberforge Arms", stock: ["pewter_sword", "blackiron_sword", "ashsteel_sword", "pewter_sabre", "blackiron_sabre", "ashsteel_sabre", "moonsilver_sabre", "pewter_shield", "blackiron_shield", "blackiron_helm", "ashsteel_helm", "blackiron_cuirass"] },
  sigils: { id: "sigils", name: "Runa's Sigils", stock: ["breeze_sigil", "tide_sigil", "stone_sigil", "ember_sigil", "thought_sigil", "shade_sigil", "storm_sigil", "bloom_sigil", "star_sigil", "path_sigil", "hollow_sigil", "staff", "breeze_staff", "scholar_hat", "scholar_robe"] },
  crafting: { id: "crafting", name: "Tessa's Tannery", stock: ["needle", "thread", "chisel", "leather", "leather_gloves", "leather_boots"] },
  oasis: { id: "oasis", name: "Oasis Bazaar", stock: ["cake", "bread", "inkshark", "sailfish", "silk", "rough_moonstone", "friends_charm", "moonstone_pendant"] },
  frost: { id: "frost", name: "Frostpeak Outfitters", stock: ["inkcrab", "sailfish", "glimmer_pickaxe", "glimmer_axe", "glimmer_sabre", "glimmer_helm", "glimmer_shield", "hollow_sigil", "path_sigil", "frosthide_coif", "frosthide_bracers", "glimmer_arrow"] },
  armour: { id: "armour", name: "Hollis Armoury", stock: ["pewter_helm", "pewter_cuirass", "pewter_greaves", "pewter_shield", "blackiron_helm", "blackiron_cuirass", "blackiron_greaves", "blackiron_shield",
    "ashsteel_helm", "ashsteel_cuirass", "ashsteel_greaves", "ashsteel_shield", "moonsilver_helm", "moonsilver_shield", "leather_gloves", "leather_boots"] },
  weapons: { id: "weapons", name: "Edge & Hilt", stock: ["pewter_dagger", "pewter_sword", "pewter_sabre", "blackiron_dagger", "blackiron_sword", "blackiron_sabre", "ashsteel_dagger", "ashsteel_sword", "ashsteel_sabre",
    "moonsilver_dagger", "moonsilver_sword", "moonsilver_sabre", "glimmer_sword"] },
  archery: { id: "archery", name: "Fletch & Feather", stock: ["shortbow", "oak_bow", "willow_bow", "maple_bow", "yew_bow", "pewter_arrow", "blackiron_arrow", "ashsteel_arrow", "moonsilver_arrow",
    "hunter_coif", "hunter_vest", "hunter_chaps", "hunter_bracers", "feather"] },
  slayer: { id: "slayer", name: "The Warden's Lodge", stock: ["slayer_gem", "inkcrab", "sailfish", "tablet_hollow_square", "blackiron_arrow", "ashsteel_arrow", "leather_boots"] },
  inn: { id: "inn", name: "The Sleepy Friend", stock: ["bread", "cake", "cooked_meat", "cooked_chicken", "carp", "grayling"] },
  capes: { id: "capes", name: "The Keeper of Capes", stock: [...SKILLS.map(skill => `${skill}_cape`), "grandmaster_cape"] },
};
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
