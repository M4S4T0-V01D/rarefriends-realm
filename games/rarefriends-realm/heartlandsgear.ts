/**
 * The Land Before Stone: what Kharaveth's heartlands sell, eat and fight.
 *
 * Sefrah's bazaar and the Lamp and Palm feed you on dates, flatbread and the Ashar's fish; the dynasties' tailors (and
 * the nomads' traders) dress you as one of theirs (data.ts REGIONAL_CLOTHING). Out in the country: dune vipers in the
 * Sea of Dunes, crocodiles and reed cats along the Ashar, scarabs of black glass and the basalt golems of the Black
 * Range, and in the Black Stair the warden that Tamesh's quarry woke. The Matriarch's seal and the Black Stair's ward
 * stones are things you carry for a while.
 */
import type { Drop, IconShape, Item, MonsterDef, ShopDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
const item = (id: string, name: string, examine: string, value: number, shape: IconShape, color: string, accent?: string, extra: Partial<Item> = {}): Item => ({ id, name, examine, value, icon: { shape, color, accent }, ...extra });

export const HEARTLAND_ITEMS: readonly Item[] = [
  item("dates", "Dates", "A twist of sticky dates from the palms along the Ashar. Heals 4.", 8, "berries", "#7a3f22", "#c98f5f", { heal: 4, stackable: false }),
  item("flatbread", "Flatbread", "Bread baked on the side of a clay oven, blistered and soft. Heals 8.", 20, "bread", "#e2c48a", "#a8744a", { heal: 8 }),
  item("ashar_fish", "Grilled river fish", "A fish from the Ashar, split and grilled over charcoal with salt and cumin. Heals 14.", 60, "fish", "#c98f5f", "#5f4128", { heal: 14 }),
  item("spiced_lamb", "Spiced lamb", "Lamb slow-cooked with apricots and black lime, the Lamp and Palm's pride. Heals 18.", 110, "meat", "#8a4a2a", "#d9a878", { heal: 18 }),
  item("rock_salt", "Rock salt", "A slab of salt cut from the flats past the Sea of Dunes. The Ouresh trade it for everything else.", 40, "ore", "#ece8e0", "#a8a098", { stackable: true }),
  item("khasreth_seal", "The Matriarch's seal", "The seal of House Khasreth: a cylinder of black stone. The falcon has been cut off it, and in its place, glyphs. Study it to read them.", 0, "tablet", "#1e1c22", "#d9b866", { tradeable: false }),
  item("ward_stone", "Ward stone", "A stone the size of a loaf, cut with an eye and a bar on a point. It's warm, and it wants to be somewhere.", 0, "ore", "#3a3640", "#d9b866", { tradeable: false }),
];

/** The quests' gifts: the sash the heirs give for the seal, the Warden's mattock for the Black Stair. */
export const HEARTLAND_GEAR: readonly Item[] = [
  { id: "three_suns_sash", name: "Sash of the Three Suns", examine: "Lapis silk worked with three gold suns, one for each heir, none above the others. The Council of Three gives it to the one who read them the seal.", value: 8000,
    icon: { shape: "cape", color: "#2f3f66", accent: "#d9b866" }, equip: { slot: "cape", bonuses: { defence: 6, magic: 4, prayer: 3 }, requires: { defence: 40 } } },
  { id: "obsidian_mattock", name: "Obsidian mattock", examine: "A quarry pick of black-iron with an edge of knapped obsidian set in it, as Tamesh's best cutters carry. Mining 50.", value: 9000,
    icon: { shape: "pickaxe", color: "#1e1c22", accent: "#2f5f9a" }, equip: { slot: "weapon", bonuses: { attack: 26, strength: 28 }, requires: { attack: 45 } }, tool: { kind: "pickaxe", tier: 7, level: 50 } },
];

export const HEARTLAND_SHOPS: Record<string, ShopDef> = {
  sefrah_bazaar: { id: "sefrah_bazaar", name: "Hadiya's Emporium", general: true, buys: ["food", "logs", "other"], rate: 0.55, stock: ["dates", "flatbread", "vial", "vial_of_water", "tinderbox", "knife", "hammer", "bucket", "fishing_rod", "fishing_bait", "pewter_pickaxe", "pewter_axe", "rock_salt"] },
  sefrah_inn: { id: "sefrah_inn", name: "The Lamp and Palm", buys: ["food"], rate: 0.5, stock: ["dates", "flatbread", "ashar_fish", "spiced_lamb"] },
  sefrah_forge: { id: "sefrah_forge", name: "Kerub's Forge", buys: ["weapon", "armour", "ore", "bar"], rate: 0.5, stock: ["blackiron_sword", "blackiron_sabre", "ashsteel_sabre", "blackiron_helm", "blackiron_cuirass", "blackiron_shield", "hammer", "blackiron_pickaxe"] },
};
/** What the nomads' traders carry besides their own people's clothes (data.ts puts the two together). */
export const ZURI_GOODS = ["dates", "flatbread", "vial_of_water", "steppe_headwrap", "steppe_robe", "steppe_sash"] as const;
export const OURESH_GOODS = ["rock_salt", "dates", "vial_of_water", "flatbread"] as const;

export const HEARTLAND_MONSTERS: Record<string, MonsterDef> = {
  dune_viper: { id: "dune_viper", name: "Dune viper", level: 38, hp: 40, attack: 32, strength: 26, defence: 22, attackBonus: 18, defenceBonus: 12, maxHit: 5, speed: 3, respawn: 30, wander: 6, aggressive: true, poison: { damage: 5, chance: 0.3 }, art: 241, ink: "#d8c48a",
    examine: "Sand-coloured, horned over the eyes, moving sideways in loops that leave a row of hooks in the sand. You see the hooks first, if you're lucky.", always: [one("bones", 1)], drops: [coins(10, 70, 0.4), one("azhurak_sherd", 0.02)] },
  reed_cat: { id: "reed_cat", name: "Reed cat", level: 30, hp: 36, attack: 26, strength: 22, defence: 18, attackBonus: 14, defenceBonus: 10, maxHit: 4, speed: 4, respawn: 30, wander: 6, art: 243, ink: "#b39a6a",
    examine: "A lean marsh cat with tufted ears and a ringed tail, hunting the Ashar's reed beds. It would like you to leave its fish alone.", always: [one("bones", 1)], drops: [coins(8, 50, 0.4), one("raw_beef", 0.3)] },
  river_crocodile: { id: "river_crocodile", name: "River crocodile", level: 48, hp: 70, attack: 38, strength: 42, defence: 44, attackBonus: 20, defenceBonus: 30, maxHit: 7, speed: 5, respawn: 40, wander: 4, aggressive: true, art: 242, ink: "#5f6b4a",
    examine: "Long, low, armoured, and still, the way a log is still. The Ashar's people leave it the shallows and keep the deep water for themselves.", always: [one("bones", 1)], drops: [one("raw_beef", 0.6, 1, 2), coins(16, 120, 0.5)] },
  obsidian_scarab: { id: "obsidian_scarab", name: "Obsidian scarab", level: 54, hp: 72, attack: 40, strength: 40, defence: 58, attackBonus: 22, defenceBonus: 46, maxHit: 7, speed: 5, respawn: 40, wander: 4, aggressive: true, weakness: "earth", art: 239, ink: "#2a2730",
    examine: "A horned beetle as big as a shield, its shell black glass split down the middle. Tamesh's cutters say they chew the obsidian out of the rock, and the rock is grateful.", always: [one("bones", 1)], drops: [one("beetle_shell", 0.3), coins(20, 150, 0.6), one("azhurak_sherd", 0.05)] },
  basalt_golem: { id: "basalt_golem", name: "Basalt golem", level: 64, hp: 110, attack: 48, strength: 54, defence: 60, magicDef: 30, attackBonus: 28, defenceBonus: 50, maxHit: 10, speed: 6, respawn: 60, wander: 3, aggressive: true, poisonImmune: true, weakness: "water", art: 244, ink: "#3a3640",
    examine: "A heap of the Black Range's own stone, standing up, with one seam of light in it where a heart would be. It walks the range as if it were counting it.", always: [], drops: [coins(30, 220, 0.8), one("blackiron_ore", 0.4, 1, 3), one("azhurak_sherd", 0.1)] },
  tahr_matriarch: { id: "tahr_matriarch", name: "Old Bitter-Laugh", level: 50, hp: 90, attack: 40, strength: 40, defence: 32, attackBonus: 22, defenceBonus: 20, maxHit: 7, speed: 4, respawn: 120, wander: 3, aggressive: true, art: 230, ink: "#8a6a4a",
    examine: "The oldest hyena in the west, grey in the muzzle, missing an ear, laughing. Her pack has been dragging its kills into the Well of Tahr.", always: [one("bones", 1), one("hyena_pelt", 1)], drops: [coins(40, 200, 1)] },
  stair_warden: { id: "stair_warden", name: "The Stair Warden", level: 76, hp: 180, attack: 60, strength: 62, defence: 66, magicDef: 50, attackBonus: 40, defenceBonus: 50, maxHit: 13, speed: 5, respawn: 120, wander: 2, aggressive: true, poisonImmune: true, spirit: true, weakness: "holy", art: 240, ink: "#2e2b33",
    examine: "A keeper of black basalt, taller than a door, a crook in one hand and a flail in the other. Its face is an open ring, the glyph for a name, and there's no name in it.", always: [], drops: [coins(120, 600, 1), one("azhurak_sherd", 1, 1, 3), one("beetle_shell", 0.4)] },
};
