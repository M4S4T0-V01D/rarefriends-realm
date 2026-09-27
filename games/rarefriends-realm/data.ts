/**
 * RareFriends Realm content: skills, the XP curve, items, equipment, monsters, NPCs, shops, recipes and family perks.
 * Everything here is plain data so the engine and the tests can share it.
 */

// ---------- Skills and experience ----------
export const SKILLS = [
  "attack", "strength", "defence", "hitpoints", "magic", "prayer", "woodcutting", "fishing",
  "cooking", "firemaking", "mining", "smithing", "crafting", "thieving", "agility",
] as const;
export type Skill = typeof SKILLS[number];
export const SKILL_NAMES: Record<Skill, string> = {
  attack: "Attack", strength: "Strength", defence: "Defence", hitpoints: "Hitpoints", magic: "Magic", prayer: "Prayer",
  woodcutting: "Woodcutting", fishing: "Fishing", cooking: "Cooking", firemaking: "Firemaking", mining: "Mining",
  smithing: "Smithing", crafting: "Crafting", thieving: "Thieving", agility: "Agility",
};
/** Small glyphs for XP drops and the skills tab (drawn as text). */
export const SKILL_ICONS: Record<Skill, string> = {
  attack: "⚔", strength: "✊", defence: "⛨", hitpoints: "♥", magic: "✦", prayer: "✚", woodcutting: "🪓", fishing: "🐟",
  cooking: "🍳", firemaking: "🔥", mining: "⛏", smithing: "⚒", crafting: "✂", thieving: "✋", agility: "➶",
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
  { title: "Echo magic", text: "+10% magic accuracy, and 1 in 5 spells keeps its runes." },
];

// ---------- Items ----------
export type EquipSlot = "head" | "cape" | "neck" | "weapon" | "body" | "shield" | "legs" | "hands" | "feet";
export const EQUIP_SLOTS: readonly EquipSlot[] = ["head", "cape", "neck", "weapon", "body", "shield", "legs", "hands", "feet"];
export type Bonuses = { attack: number; strength: number; defence: number; magic: number; prayer: number };
export type Icon = { shape: IconShape; color: string; accent?: string };
export type IconShape =
  | "coins" | "axe" | "pickaxe" | "sword" | "dagger" | "scimitar" | "helm" | "body" | "legs" | "shield" | "boots" | "gloves" | "cape"
  | "amulet" | "log" | "fish" | "ore" | "bar" | "bones" | "rune" | "staff" | "net" | "rod" | "harpoon" | "pot" | "bucket" | "egg" | "flour"
  | "milk" | "tinderbox" | "hammer" | "knife" | "needle" | "thread" | "chisel" | "gem" | "hide" | "leather" | "meat" | "feather" | "bait"
  | "cake" | "bread" | "key" | "wheat" | "lamp" | "scroll" | "silk" | "cowl" | "vambrace" | "burnt" | "hat" | "crown" | "orb" | "trophy";
export type Item = {
  id: string; name: string; examine: string; value: number; icon: Icon;
  stackable?: boolean; tradeable?: boolean;
  equip?: { slot: EquipSlot; bonuses: Partial<Bonuses>; requires?: Partial<Record<Skill, number>>; speed?: number; twoHanded?: boolean; staff?: boolean };
  heal?: number; bones?: number; tool?: { kind: "axe" | "pickaxe"; tier: number; level: number };
};

export const METALS = [
  { id: "bronze", name: "Bronze", level: 1, tier: 1, color: "#b38a62", value: 10 },
  { id: "iron", name: "Iron", level: 5, tier: 2, color: "#8b8e92", value: 35 },
  { id: "steel", name: "Steel", level: 10, tier: 3, color: "#c3c6cb", value: 120 },
  { id: "mithril", name: "Mithril", level: 20, tier: 4, color: "#7d8fb8", value: 380 },
  { id: "adamant", name: "Adamant", level: 30, tier: 5, color: "#86a98b", value: 900 },
  { id: "rarite", name: "Rarite", level: 40, tier: 6, color: "#d8b6b4", value: 2400 },
] as const;
export type MetalId = typeof METALS[number]["id"];
/** Smithable pieces: bars used, smithing level offset over the metal's base, and relative strength. */
export const SMITH_PIECES = [
  { piece: "dagger", name: "dagger", bars: 1, offset: 0, shape: "dagger", slot: "weapon", att: 4, str: 3, def: 0, speed: 4 },
  { piece: "axe", name: "axe", bars: 1, offset: 1, shape: "axe", slot: "weapon", att: 3, str: 4, def: 0, speed: 5 },
  { piece: "sword", name: "sword", bars: 1, offset: 4, shape: "sword", slot: "weapon", att: 6, str: 5, def: 0, speed: 4 },
  { piece: "pickaxe", name: "pickaxe", bars: 2, offset: 5, shape: "pickaxe", slot: "weapon", att: 3, str: 4, def: 0, speed: 5 },
  { piece: "full_helm", name: "full helm", bars: 2, offset: 7, shape: "helm", slot: "head", att: 0, str: 0, def: 5, speed: 0 },
  { piece: "scimitar", name: "scimitar", bars: 2, offset: 5, shape: "scimitar", slot: "weapon", att: 9, str: 8, def: 0, speed: 4 },
  { piece: "platelegs", name: "platelegs", bars: 3, offset: 16, shape: "legs", slot: "legs", att: 0, str: 0, def: 11, speed: 0 },
  { piece: "kiteshield", name: "kiteshield", bars: 3, offset: 12, shape: "shield", slot: "shield", att: 0, str: 0, def: 12, speed: 0 },
  { piece: "platebody", name: "platebody", bars: 5, offset: 18, shape: "body", slot: "body", att: 0, str: 0, def: 20, speed: 0 },
] as const;
export type SmithPiece = typeof SMITH_PIECES[number]["piece"];
export const SMITHING_BASE: Record<MetalId, number> = { bronze: 1, iron: 15, steel: 30, mithril: 50, adamant: 70, rarite: 85 };

const ITEMS: Item[] = [
  { id: "coins", name: "Coins", examine: "Lovely money!", value: 1, stackable: true, icon: { shape: "coins", color: "#d9c27a" } },
  // Tools
  { id: "small_net", name: "Small fishing net", examine: "Useful for catching small fish.", value: 5, icon: { shape: "net", color: "#9a8f80" } },
  { id: "fishing_rod", name: "Fishing rod", examine: "Useful for catching sardines and herring.", value: 5, icon: { shape: "rod", color: "#9c8672" } },
  { id: "fly_rod", name: "Fly fishing rod", examine: "Useful for catching salmon and trout.", value: 5, icon: { shape: "rod", color: "#6d6b67" } },
  { id: "harpoon", name: "Harpoon", examine: "Useful for catching really big fish.", value: 45, icon: { shape: "harpoon", color: "#8b8e92" } },
  { id: "lobster_pot", name: "Lobster pot", examine: "Useful for catching lobsters.", value: 20, icon: { shape: "pot", color: "#9c8672" } },
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
  { id: "copper_ore", name: "Copper ore", examine: "This needs refining.", value: 3, icon: { shape: "ore", color: "#c28a62" } },
  { id: "tin_ore", name: "Tin ore", examine: "This needs refining.", value: 3, icon: { shape: "ore", color: "#b9bfc6" } },
  { id: "iron_ore", name: "Iron ore", examine: "This needs refining.", value: 17, icon: { shape: "ore", color: "#8c6f62" } },
  { id: "coal", name: "Coal", examine: "Hmm, a non-renewable energy source!", value: 45, icon: { shape: "ore", color: "#3b3a38" } },
  { id: "mithril_ore", name: "Mithril ore", examine: "This needs refining.", value: 160, icon: { shape: "ore", color: "#7d8fb8" } },
  { id: "adamantite_ore", name: "Adamantite ore", examine: "This needs refining.", value: 400, icon: { shape: "ore", color: "#86a98b" } },
  { id: "rarite_ore", name: "Rarite ore", examine: "Pale rose ore that only forms where Friends dream.", value: 1100, icon: { shape: "ore", color: "#d8b6b4" } },
  { id: "clay", name: "Clay", examine: "Some hard dry clay.", value: 2, icon: { shape: "ore", color: "#d7c3a5" } },
  ...METALS.map(metal => ({ id: `${metal.id}_bar`, name: `${metal.name} bar`, examine: `It's a bar of ${metal.id === "rarite" ? "rarite" : metal.id}.`, value: metal.value, icon: { shape: "bar" as const, color: metal.color } })),
  // Gems
  { id: "uncut_sapphire", name: "Uncut sapphire", examine: "An uncut sapphire.", value: 50, icon: { shape: "gem", color: "#8fa3c9", accent: "#6d6b67" } },
  { id: "uncut_emerald", name: "Uncut emerald", examine: "An uncut emerald.", value: 100, icon: { shape: "gem", color: "#8fbf9a", accent: "#6d6b67" } },
  { id: "uncut_ruby", name: "Uncut ruby", examine: "An uncut ruby.", value: 200, icon: { shape: "gem", color: "#c98f95", accent: "#6d6b67" } },
  { id: "sapphire", name: "Sapphire", examine: "This looks valuable.", value: 250, icon: { shape: "gem", color: "#8fa3c9" } },
  { id: "emerald", name: "Emerald", examine: "This looks valuable.", value: 500, icon: { shape: "gem", color: "#8fbf9a" } },
  { id: "ruby", name: "Ruby", examine: "This looks valuable.", value: 1000, icon: { shape: "gem", color: "#c98f95" } },
  // Fish and food
  ...([
    ["shrimps", "Shrimps", 3, 5], ["sardine", "Sardine", 4, 8], ["herring", "Herring", 5, 15], ["trout", "Trout", 7, 25],
    ["salmon", "Salmon", 9, 50], ["lobster", "Lobster", 12, 150], ["swordfish", "Swordfish", 14, 250], ["shark", "Inkshark", 20, 600],
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
  { id: "big_bones", name: "Big bones", examine: "Ew, it's a pile of bones.", value: 60, bones: 15, icon: { shape: "bones", color: "#e7e1d3" } },
  { id: "ink_bones", name: "Ink bones", examine: "Bones stained black. They feel lighter than they should.", value: 250, bones: 50, icon: { shape: "bones", color: "#6d6b67" } },
  { id: "cowhide", name: "Cowhide", examine: "I should take this to the tanner.", value: 8, icon: { shape: "hide", color: "#efede7", accent: "#3b3a38" } },
  { id: "leather", name: "Leather", examine: "It's a piece of leather.", value: 15, icon: { shape: "leather", color: "#b58b6b" } },
  // Runes
  ...([
    ["air_rune", "Air rune", "#c7d3dc"], ["water_rune", "Water rune", "#9fb4d0"], ["earth_rune", "Earth rune", "#a89479"],
    ["fire_rune", "Fire rune", "#d99a82"], ["mind_rune", "Mind rune", "#d6c58f"], ["chaos_rune", "Chaos rune", "#d0b27c"],
    ["law_rune", "Law rune", "#8fa0c9"], ["death_rune", "Death rune", "#6d6b67"],
  ] as const).map(([id, name, color]) => ({ id, name, examine: "Used for magic spells.", value: id === "law_rune" || id === "death_rune" ? 180 : id === "chaos_rune" ? 90 : 5, stackable: true, icon: { shape: "rune" as const, color } })),
  // Thieving loot
  { id: "silk", name: "Silk", examine: "It's a sheet of silk.", value: 30, icon: { shape: "silk", color: "#e9e1ef" } },
  // Quest items
  { id: "crypt_key", name: "Crypt key", examine: "A cold iron key from the Murkmire crypt.", value: 0, tradeable: false, icon: { shape: "key", color: "#8b8e92" } },
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
  { id: "leather_cowl", name: "Leather cowl", examine: "Better than no armour!", value: 24, icon: { shape: "cowl", color: "#b58b6b" }, equip: { slot: "head", bonuses: { defence: 2 } } },
  { id: "leather_vambraces", name: "Leather vambraces", examine: "These should protect my arms.", value: 18, icon: { shape: "vambrace", color: "#9c7a5f" }, equip: { slot: "hands", bonuses: { attack: 1, defence: 2 } } },
  { id: "leather_body", name: "Leather body", examine: "Better than no armour!", value: 21, icon: { shape: "body", color: "#b58b6b" }, equip: { slot: "body", bonuses: { defence: 8, magic: 2 } } },
  { id: "leather_chaps", name: "Leather chaps", examine: "Better than no armour!", value: 20, icon: { shape: "legs", color: "#9c7a5f" }, equip: { slot: "legs", bonuses: { defence: 4, magic: 1 } } },
  { id: "wizard_hat", name: "Wizard hat", examine: "A silly pointed hat.", value: 2, icon: { shape: "hat", color: "#6f7ea6" }, equip: { slot: "head", bonuses: { magic: 2 } } },
  { id: "wizard_robe", name: "Wizard robe top", examine: "I can do magic better in this.", value: 15, icon: { shape: "body", color: "#6f7ea6" }, equip: { slot: "body", bonuses: { magic: 3 } } },
  { id: "staff", name: "Staff", examine: "It's a slightly magical stick.", value: 15, icon: { shape: "staff", color: "#9c8672" }, equip: { slot: "weapon", bonuses: { attack: 2, strength: 3, magic: 4 }, speed: 5, staff: true } },
  { id: "staff_of_air", name: "Staff of air", examine: "A magical staff. Provides unlimited air runes.", value: 1500, icon: { shape: "staff", color: "#c7d3dc" }, equip: { slot: "weapon", bonuses: { attack: 4, strength: 5, magic: 10 }, speed: 5, staff: true, requires: { magic: 10 } } },
  { id: "moonlit_staff", name: "Moonlit staff", examine: "A staff with a small moon floating at its tip.", value: 9000, icon: { shape: "staff", color: "#9fabc2", accent: "#e2d7ad" }, equip: { slot: "weapon", bonuses: { attack: 8, strength: 8, magic: 20 }, speed: 5, staff: true, requires: { magic: 30 } } },
  { id: "amulet_of_strength", name: "Amulet of strength", examine: "An enchanted ruby amulet.", value: 3000, icon: { shape: "amulet", color: "#c98f95" }, equip: { slot: "neck", bonuses: { strength: 10 } } },
  { id: "amulet_of_accuracy", name: "Amulet of accuracy", examine: "An enchanted sapphire amulet.", value: 1200, icon: { shape: "amulet", color: "#8fa3c9" }, equip: { slot: "neck", bonuses: { attack: 4 } } },
  { id: "holy_symbol", name: "Holy symbol", examine: "A blessed symbol of the Old Friend.", value: 300, icon: { shape: "amulet", color: "#efede7" }, equip: { slot: "neck", bonuses: { prayer: 8 } } },
  { id: "team_cape", name: "Wanderer's cape", examine: "A plain travelling cape.", value: 50, icon: { shape: "cape", color: "#8f8a82" }, equip: { slot: "cape", bonuses: { defence: 1 } } },
  { id: "hollow_cape", name: "Cape of the Hollow", examine: "Proof that you ended the Hollow King's reign.", value: 0, tradeable: false, icon: { shape: "cape", color: "#161616", accent: "#d8b6b4" }, equip: { slot: "cape", bonuses: { attack: 4, strength: 4, defence: 4, magic: 4, prayer: 4 } } },
  { id: "realm_crown", name: "Crown of the Realm", examine: "Worn by the Friend who ended the Hollow King's reign.", value: 0, tradeable: false, icon: { shape: "crown", color: "#e2d49e" }, equip: { slot: "head", bonuses: { defence: 6, prayer: 4 } } },
];

export const ITEM_LIST: readonly Item[] = Object.freeze([...ITEMS, ...metalGear(), ...OTHER_GEAR]);
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
export type RockKind = "copper" | "tin" | "clay" | "iron" | "coal" | "mithril" | "adamantite" | "rarite" | "gem";
export const ROCKS: Record<RockKind, { name: string; level: number; xp: number; ore: string; low: number; high: number; respawn: number; color: string }> = {
  clay: { name: "Clay rocks", level: 1, xp: 5, ore: "clay", low: 128, high: 400, respawn: 2, color: "#d7c3a5" },
  copper: { name: "Copper rocks", level: 1, xp: 17.5, ore: "copper_ore", low: 100, high: 350, respawn: 4, color: "#c28a62" },
  tin: { name: "Tin rocks", level: 1, xp: 17.5, ore: "tin_ore", low: 100, high: 350, respawn: 4, color: "#b9bfc6" },
  iron: { name: "Iron rocks", level: 15, xp: 35, ore: "iron_ore", low: 96, high: 350, respawn: 9, color: "#8c6f62" },
  coal: { name: "Coal rocks", level: 30, xp: 50, ore: "coal", low: 16, high: 100, respawn: 40, color: "#3b3a38" },
  gem: { name: "Gem rocks", level: 40, xp: 65, ore: "uncut_sapphire", low: 28, high: 70, respawn: 60, color: "#9fabc2" },
  mithril: { name: "Mithril rocks", level: 55, xp: 80, ore: "mithril_ore", low: 4, high: 50, respawn: 100, color: "#7d8fb8" },
  adamantite: { name: "Adamantite rocks", level: 70, xp: 95, ore: "adamantite_ore", low: 2, high: 25, respawn: 200, color: "#86a98b" },
  rarite: { name: "Rarite rocks", level: 85, xp: 125, ore: "rarite_ore", low: 1, high: 18, respawn: 400, color: "#d8b6b4" },
};
export type SpotKind = "net" | "bait" | "lure" | "cage" | "harpoon" | "deep";
export type Catch = { fish: string; level: number; xp: number; low: number; high: number };
export const FISHING_SPOTS: Record<SpotKind, { name: string; action: string; tool: string; bait?: string; catches: readonly Catch[] }> = {
  net: { name: "Fishing spot", action: "Net", tool: "small_net", catches: [{ fish: "raw_shrimps", level: 1, xp: 10, low: 48, high: 256 }] },
  bait: { name: "Fishing spot", action: "Bait", tool: "fishing_rod", bait: "fishing_bait", catches: [
    { fish: "raw_herring", level: 10, xp: 30, low: 24, high: 128 }, { fish: "raw_sardine", level: 5, xp: 20, low: 32, high: 192 }] },
  lure: { name: "Rod fishing spot", action: "Lure", tool: "fly_rod", bait: "feather", catches: [
    { fish: "raw_salmon", level: 30, xp: 70, low: 16, high: 96 }, { fish: "raw_trout", level: 20, xp: 50, low: 32, high: 192 }] },
  cage: { name: "Fishing spot", action: "Cage", tool: "lobster_pot", catches: [{ fish: "raw_lobster", level: 40, xp: 90, low: 6, high: 95 }] },
  harpoon: { name: "Fishing spot", action: "Harpoon", tool: "harpoon", catches: [{ fish: "raw_swordfish", level: 50, xp: 100, low: 4, high: 48 }] },
  deep: { name: "Deep fishing spot", action: "Harpoon", tool: "harpoon", catches: [{ fish: "raw_shark", level: 76, xp: 110, low: 3, high: 40 }] },
};
/** Cooking: level, XP and the level at which you stop burning (on a range). */
export const COOKING: Record<string, { cooked: string; level: number; xp: number; stopBurn: number }> = {
  raw_shrimps: { cooked: "shrimps", level: 1, xp: 30, stopBurn: 34 },
  raw_chicken: { cooked: "cooked_chicken", level: 1, xp: 30, stopBurn: 34 },
  raw_beef: { cooked: "cooked_meat", level: 1, xp: 30, stopBurn: 34 },
  raw_sardine: { cooked: "sardine", level: 1, xp: 40, stopBurn: 38 },
  raw_herring: { cooked: "herring", level: 5, xp: 50, stopBurn: 41 },
  raw_trout: { cooked: "trout", level: 15, xp: 70, stopBurn: 50 },
  raw_salmon: { cooked: "salmon", level: 25, xp: 90, stopBurn: 58 },
  raw_lobster: { cooked: "lobster", level: 40, xp: 120, stopBurn: 74 },
  raw_swordfish: { cooked: "swordfish", level: 45, xp: 140, stopBurn: 86 },
  raw_shark: { cooked: "shark", level: 80, xp: 210, stopBurn: 99 },
};
export const FIREMAKING: Record<string, { level: number; xp: number }> = {
  logs: { level: 1, xp: 40 }, oak_logs: { level: 15, xp: 60 }, willow_logs: { level: 30, xp: 90 },
  maple_logs: { level: 45, xp: 135 }, yew_logs: { level: 60, xp: 202.5 }, ash_logs: { level: 70, xp: 280 },
};
/** Smelting: ores in, bar out. Iron has a 50% success rate without a ring (like the classic furnace). */
export const SMELTING: Record<MetalId, { level: number; xp: number; ores: Readonly<Record<string, number>>; chance?: number }> = {
  bronze: { level: 1, xp: 6.2, ores: { copper_ore: 1, tin_ore: 1 } },
  iron: { level: 15, xp: 12.5, ores: { iron_ore: 1 }, chance: 0.5 },
  steel: { level: 30, xp: 17.5, ores: { iron_ore: 1, coal: 2 } },
  mithril: { level: 50, xp: 30, ores: { mithril_ore: 1, coal: 4 } },
  adamant: { level: 70, xp: 37.5, ores: { adamantite_ore: 1, coal: 6 } },
  rarite: { level: 85, xp: 50, ores: { rarite_ore: 1, coal: 8 } },
};
export const SMITH_XP: Record<MetalId, number> = { bronze: 12.5, iron: 25, steel: 37.5, mithril: 50, adamant: 62.5, rarite: 75 };
export function smithLevel(metal: MetalId, piece: SmithPiece) {
  const offset = SMITH_PIECES.find(entry => entry.piece === piece)!.offset;
  return Math.min(99, SMITHING_BASE[metal] + offset);
}
export const CRAFTING = [
  { product: "leather_gloves", level: 1, xp: 13.8, leather: 1 },
  { product: "leather_boots", level: 7, xp: 16.25, leather: 1 },
  { product: "leather_cowl", level: 9, xp: 18.5, leather: 1 },
  { product: "leather_vambraces", level: 11, xp: 22, leather: 1 },
  { product: "leather_body", level: 14, xp: 25, leather: 1 },
  { product: "leather_chaps", level: 18, xp: 27, leather: 1 },
] as const;
export const GEM_CUTTING: Record<string, { cut: string; level: number; xp: number }> = {
  uncut_sapphire: { cut: "sapphire", level: 20, xp: 50 },
  uncut_emerald: { cut: "emerald", level: 27, xp: 67.5 },
  uncut_ruby: { cut: "ruby", level: 34, xp: 85 },
};

// ---------- Magic and prayer ----------
export type Spell = {
  id: string; name: string; level: number; xp: number; runes: Readonly<Record<string, number>>;
  maxHit?: number; teleport?: { x: number; y: number; name: string }; description: string;
};
/** Teleport targets are filled in by the world (town centres). */
export const SPELLS: readonly Spell[] = [
  { id: "home", name: "Home Teleport", level: 1, xp: 0, runes: {}, teleport: { x: 0, y: 0, name: "Friendhollow" }, description: "Return to Friendhollow. Takes a while to cast." },
  { id: "wind_strike", name: "Wind Strike", level: 1, xp: 5.5, runes: { air_rune: 1, mind_rune: 1 }, maxHit: 2, description: "A basic air missile." },
  { id: "water_strike", name: "Water Strike", level: 5, xp: 7.5, runes: { water_rune: 1, air_rune: 1, mind_rune: 1 }, maxHit: 4, description: "A basic water missile." },
  { id: "earth_strike", name: "Earth Strike", level: 9, xp: 9.5, runes: { earth_rune: 2, air_rune: 1, mind_rune: 1 }, maxHit: 6, description: "A basic earth missile." },
  { id: "fire_strike", name: "Fire Strike", level: 13, xp: 11.5, runes: { fire_rune: 3, air_rune: 2, mind_rune: 1 }, maxHit: 8, description: "A basic fire missile." },
  { id: "wind_bolt", name: "Wind Bolt", level: 17, xp: 13.5, runes: { air_rune: 2, chaos_rune: 1 }, maxHit: 9, description: "A low level air missile." },
  { id: "hollow_teleport", name: "Hollow Teleport", level: 25, xp: 35, runes: { law_rune: 1, air_rune: 3, fire_rune: 1 }, teleport: { x: 0, y: 0, name: "Friendhollow" }, description: "Teleports you to Friendhollow square." },
  { id: "water_bolt", name: "Water Bolt", level: 23, xp: 16.5, runes: { water_rune: 2, air_rune: 2, chaos_rune: 1 }, maxHit: 10, description: "A low level water missile." },
  { id: "forge_teleport", name: "Emberforge Teleport", level: 31, xp: 41, runes: { law_rune: 1, air_rune: 3, earth_rune: 1 }, teleport: { x: 0, y: 0, name: "Emberforge" }, description: "Teleports you to Emberforge." },
  { id: "fire_bolt", name: "Fire Bolt", level: 35, xp: 22.5, runes: { fire_rune: 4, air_rune: 3, chaos_rune: 1 }, maxHit: 12, description: "A low level fire missile." },
  { id: "wind_blast", name: "Wind Blast", level: 41, xp: 25.5, runes: { air_rune: 3, death_rune: 1 }, maxHit: 13, description: "A medium level air missile." },
  { id: "fire_blast", name: "Fire Blast", level: 59, xp: 34.5, runes: { fire_rune: 5, air_rune: 4, death_rune: 1 }, maxHit: 16, description: "A medium level fire missile." },
];
export type Prayer = { id: string; name: string; level: number; drain: number; effect: Partial<{ attack: number; strength: number; defence: number; magic: number; protect: boolean }>; description: string };
export const PRAYERS: readonly Prayer[] = [
  { id: "thick_skin", name: "Thick Skin", level: 1, drain: 1 / 12, effect: { defence: 0.05 }, description: "+5% Defence" },
  { id: "burst_of_strength", name: "Burst of Strength", level: 4, drain: 1 / 12, effect: { strength: 0.05 }, description: "+5% Strength" },
  { id: "clarity", name: "Clarity of Thought", level: 7, drain: 1 / 12, effect: { attack: 0.05 }, description: "+5% Attack" },
  { id: "mystic_will", name: "Mystic Will", level: 9, drain: 1 / 12, effect: { magic: 0.05 }, description: "+5% Magic" },
  { id: "rock_skin", name: "Rock Skin", level: 10, drain: 1 / 6, effect: { defence: 0.1 }, description: "+10% Defence" },
  { id: "superhuman_strength", name: "Superhuman Strength", level: 13, drain: 1 / 6, effect: { strength: 0.1 }, description: "+10% Strength" },
  { id: "improved_reflexes", name: "Improved Reflexes", level: 16, drain: 1 / 6, effect: { attack: 0.1 }, description: "+10% Attack" },
  { id: "mystic_lore", name: "Mystic Lore", level: 27, drain: 1 / 6, effect: { magic: 0.1 }, description: "+10% Magic" },
  { id: "steel_skin", name: "Steel Skin", level: 28, drain: 1 / 3, effect: { defence: 0.15 }, description: "+15% Defence" },
  { id: "ultimate_strength", name: "Ultimate Strength", level: 31, drain: 1 / 3, effect: { strength: 0.15 }, description: "+15% Strength" },
  { id: "incredible_reflexes", name: "Incredible Reflexes", level: 34, drain: 1 / 3, effect: { attack: 0.15 }, description: "+15% Attack" },
  { id: "protect_melee", name: "Protect from Melee", level: 37, drain: 1 / 3, effect: { protect: true }, description: "Blocks most melee damage" },
];

// ---------- Monsters ----------
export type Drop = { item: string; min: number; max: number; chance: number };
export type MonsterDef = {
  id: string; name: string; level: number; hp: number; attack: number; strength: number; defence: number; magicDef?: number;
  attackBonus: number; defenceBonus: number; maxHit: number; speed: number; aggressive?: boolean; size?: number;
  respawn: number; wander: number; examine: string; always?: readonly Drop[]; drops: readonly Drop[]; art: number; ink?: string;
  attackStyle?: "melee" | "magic"; boss?: boolean; slayerXp?: number;
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
    always: [one("bones", 1)], drops: [coins(2, 25, 0.45), one("air_rune", 0.1, 3, 8), one("mind_rune", 0.08, 2, 6), one("bronze_dagger", 0.04), one("bronze_full_helm", 0.03), one("fishing_bait", 0.08, 5, 15), one("water_rune", 0.05, 2, 6)], art: 103 },
  grumblin_chief: { id: "grumblin_chief", name: "Grumblin chief", level: 13, hp: 20, attack: 10, strength: 11, defence: 8, attackBonus: 6, defenceBonus: 5, maxHit: 3, speed: 4, respawn: 50, wander: 3, examine: "The loudest Grumblin. That's how they choose.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(20, 80, 0.6), one("iron_scimitar", 0.05), one("earth_rune", 0.1, 5, 12), one("iron_full_helm", 0.05), one("uncut_sapphire", 0.03)], art: 104 },
  bandit: { id: "bandit", name: "Dune bandit", level: 22, hp: 28, attack: 20, strength: 20, defence: 16, attackBonus: 12, defenceBonus: 12, maxHit: 4, speed: 4, respawn: 40, wander: 5, examine: "A Friend who took a wrong turn in life.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(20, 120, 0.7), one("steel_dagger", 0.05), one("chaos_rune", 0.08, 2, 6), one("uncut_emerald", 0.02), one("law_rune", 0.02, 1, 2)], art: 105 },
  swamp_lurker: { id: "swamp_lurker", name: "Swamp lurker", level: 16, hp: 22, attack: 14, strength: 14, defence: 12, attackBonus: 8, defenceBonus: 8, maxHit: 3, speed: 5, respawn: 35, wander: 4, examine: "Mostly mouth, partly mud.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(5, 50, 0.5), one("water_rune", 0.12, 6, 18), one("raw_trout", 0.1), one("uncut_sapphire", 0.02)], art: 106 },
  skeleton: { id: "skeleton", name: "Crypt skeleton", level: 25, hp: 29, attack: 22, strength: 22, defence: 20, attackBonus: 14, defenceBonus: 16, maxHit: 4, speed: 4, respawn: 40, wander: 4, examine: "It rattles when it walks. It used to be a Friend.", aggressive: true,
    always: [one("bones", 1)], drops: [coins(10, 90, 0.6), one("iron_platelegs", 0.03), one("chaos_rune", 0.06, 3, 7), one("death_rune", 0.02, 1, 3), one("steel_full_helm", 0.03)], art: 107 },
  wolf: { id: "wolf", name: "Frost wolf", level: 32, hp: 40, attack: 30, strength: 28, defence: 26, attackBonus: 18, defenceBonus: 18, maxHit: 5, speed: 4, respawn: 40, wander: 6, examine: "Its breath freezes as it growls.", aggressive: true,
    always: [one("big_bones", 1)], drops: [coins(20, 110, 0.4), one("uncut_ruby", 0.02), one("mithril_ore", 0.05)], art: 108 },
  moss_colossus: { id: "moss_colossus", name: "Moss colossus", level: 42, hp: 60, attack: 32, strength: 34, defence: 30, attackBonus: 20, defenceBonus: 22, maxHit: 7, speed: 6, respawn: 60, wander: 3, examine: "A Colossus-family giant, grown over with moss.", size: 2,
    always: [one("big_bones", 1)], drops: [coins(30, 250, 0.6), one("mithril_sword", 0.03), one("law_rune", 0.06, 1, 3), one("uncut_emerald", 0.04), one("steel_platebody", 0.02)], art: 109 },
  frost_yeti: { id: "frost_yeti", name: "Frost yeti", level: 55, hp: 85, attack: 50, strength: 52, defence: 45, attackBonus: 30, defenceBonus: 32, maxHit: 10, speed: 5, respawn: 60, wander: 4, examine: "Every footstep is an avalanche.", aggressive: true, size: 2,
    always: [one("big_bones", 1)], drops: [coins(80, 400, 0.6), one("adamant_scimitar", 0.02), one("death_rune", 0.08, 2, 5), one("adamantite_ore", 0.06), one("uncut_ruby", 0.04), one("amulet_of_strength", 0.004)], art: 110 },
  shade: { id: "shade", name: "Shade", level: 38, hp: 45, attack: 32, strength: 30, defence: 34, magicDef: 10, attackBonus: 20, defenceBonus: 26, maxHit: 6, speed: 4, respawn: 40, wander: 4, examine: "A shadow with no Friend to belong to.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [coins(40, 220, 0.6), one("death_rune", 0.06, 2, 6), one("mithril_full_helm", 0.03), one("uncut_ruby", 0.02)], art: 111, ink: "#2c2b3a" },
  hollow_knight: { id: "hollow_knight", name: "Hollow knight", level: 64, hp: 95, attack: 60, strength: 60, defence: 58, attackBonus: 40, defenceBonus: 48, maxHit: 12, speed: 5, respawn: 50, wander: 3, examine: "Armour with nothing inside. It still remembers how to fight.", aggressive: true,
    always: [one("ink_bones", 1)], drops: [coins(100, 600, 0.7), one("adamant_platebody", 0.02), one("rarite_ore", 0.03), one("death_rune", 0.1, 4, 9), one("law_rune", 0.08, 2, 5)], art: 112, ink: "#1d1d26" },
  hollow_king: { id: "hollow_king", name: "The Hollow King", level: 92, hp: 250, attack: 80, strength: 82, defence: 70, magicDef: 50, attackBonus: 60, defenceBonus: 70, maxHit: 18, speed: 5, respawn: 100, wander: 2, examine: "A crown floating over an empty ring of shadow.", aggressive: true, size: 3, boss: true,
    always: [one("ink_bones", 1), coins(1000, 3000, 1)], drops: [one("rarite_scimitar", 0.12), one("rarite_full_helm", 0.1), one("moonlit_staff", 0.08), one("rarite_bar", 0.3, 1, 3), one("amulet_of_strength", 0.1)], art: 113, ink: "#111" },
};
export function combatLevelOf(monster: MonsterDef) { return monster.level; }

// ---------- NPCs, shops ----------
export type ShopDef = { id: string; name: string; stock: readonly string[]; general?: boolean };
export const SHOPS: Record<string, ShopDef> = {
  general: { id: "general", name: "Friendhollow General Store", general: true, stock: ["pot", "bucket", "tinderbox", "hammer", "knife", "chisel", "needle", "thread", "small_net", "bronze_axe", "bronze_pickaxe", "bread", "team_cape"] },
  fishing: { id: "fishing", name: "Pike's Tackle", stock: ["small_net", "fishing_rod", "fly_rod", "harpoon", "lobster_pot", "fishing_bait", "feather", "raw_shrimps"] },
  axes: { id: "axes", name: "Axel's Axes", stock: ["bronze_axe", "iron_axe", "steel_axe", "mithril_axe", "bronze_pickaxe", "iron_pickaxe", "steel_pickaxe", "mithril_pickaxe"] },
  swords: { id: "swords", name: "Emberforge Arms", stock: ["bronze_sword", "iron_sword", "steel_sword", "bronze_scimitar", "iron_scimitar", "steel_scimitar", "mithril_scimitar", "bronze_kiteshield", "iron_kiteshield", "iron_full_helm", "steel_full_helm", "iron_platebody"] },
  runes: { id: "runes", name: "Runa's Runes", stock: ["air_rune", "water_rune", "earth_rune", "fire_rune", "mind_rune", "chaos_rune", "law_rune", "death_rune", "staff", "staff_of_air", "wizard_hat", "wizard_robe"] },
  crafting: { id: "crafting", name: "Tessa's Tannery", stock: ["needle", "thread", "chisel", "leather", "leather_gloves", "leather_boots"] },
  oasis: { id: "oasis", name: "Oasis Bazaar", stock: ["cake", "bread", "shark", "swordfish", "silk", "uncut_sapphire", "holy_symbol", "amulet_of_accuracy"] },
  frost: { id: "frost", name: "Frostpeak Outfitters", stock: ["lobster", "swordfish", "adamant_pickaxe", "adamant_axe", "adamant_scimitar", "adamant_full_helm", "adamant_kiteshield", "death_rune", "law_rune"] },
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
/** RF-exclusive wardrobe: every casket grants one of these, drawn on your Friend. */
export const WARDROBE = [
  { id: "rose_cape", name: "Rose cape", tier: 0, kind: "cape", color: "#d8b6b4" },
  { id: "sage_scarf", name: "Sage scarf", tier: 0, kind: "scarf", color: "#b4c3ab" },
  { id: "paper_crown", name: "Paper crown", tier: 0, kind: "hat", color: "#efede7" },
  { id: "silver_halo", name: "Silver halo", tier: 1, kind: "halo", color: "#c3c6cb" },
  { id: "blue_cape", name: "Moonblue cape", tier: 1, kind: "cape", color: "#9fabc2" },
  { id: "moon_wisps", name: "Moon wisps", tier: 2, kind: "aura", color: "#afbccb" },
  { id: "starlit_hood", name: "Starlit hood", tier: 2, kind: "hat", color: "#6f7ea6" },
  { id: "golden_aura", name: "Golden aura", tier: 3, kind: "aura", color: "#e2d49e" },
] as const;
export type WardrobeId = typeof WARDROBE[number]["id"];
