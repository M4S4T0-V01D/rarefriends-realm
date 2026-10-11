/**
 * The sea ports: what Gullwick, Saltreach, Merrab, Tel Ashun and Ennu's Well sell, eat, wear and fight.
 *
 * Fish stew at Gullwick's inn and salt herring at Saltreach's; dates and flatbread in the desert, and pearls, which
 * nobody eats. Three ports dress in their own clothes (data.ts REGIONAL_CLOTHING): Gullwick in navy ganseys and
 * sailcloth, Saltreach in the panners' salt-white and the violet the Sumptuary Office allows a port, Merrab in the
 * divers' sea-green and blue. Tel Ashun's diggers wear Tamesh's mason's linen and Ennu's Well the Zuri's indigo (render.ts).
 * What there is to fight is mostly people and one old crocodile: Gullwick's wreckers and their chief, Old Saltjaw on
 * Merrab's pearl beds, and the sand-borer in Ennu's Well's channel.
 */
import type { Drop, IconShape, Item, MonsterDef, RegionalSet, ShopDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
const item = (id: string, name: string, examine: string, value: number, shape: IconShape, color: string, accent?: string, extra: Partial<Item> = {}): Item => ({ id, name, examine, value, icon: { shape, color, accent }, ...extra });

export const PORTS_ITEMS: readonly Item[] = [
  item("fish_stew", "Harbour fish stew", "Whatever came off the boats this morning, in a pot with potatoes and milk and pepper. Gullwick's inn has never made it the same way twice. Heals 14.", 80, "pot", "#e6dcc6", "#c98f5f", { heal: 14 }),
  item("salt_herring", "Salt herring", "A herring split, salted and dried on Saltreach's racks until it would keep through a war. Heals 7.", 30, "fish", "#b8b0a0", "#e8e4dc", { heal: 7 }),
  item("pearl", "Pearl", "A pearl off Merrab's beds, pale with a pink light in it. The divers say each one is a year of somebody's breath.", 400, "gem", "#efe8e4", "#d9a8b0", { stackable: true }),
];

/** The quests' gifts (portsquests.ts). */
export const PORTS_GEAR: readonly Item[] = [
  { id: "keepers_oilskin", name: "Keeper's oilskin", examine: "Gullwick Light's spare oilskin, salt-stiff and smelling of lamp oil. The keeper says it's kept three keepers dry and one of them honest.", value: 1800,
    icon: { shape: "cape", color: "#c9a046", accent: "#3a3530" }, equip: { slot: "cape", bonuses: { defence: 5, ranged: 2 }, requires: { defence: 10 } } },
  { id: "true_weight_ring", name: "Ring of the True Weight", examine: "A plain silver ring stamped with the old Saltreach standard, a pound as it was before anyone recast it. It weighs exactly what it says.", value: 2400, weight: 0,
    icon: { shape: "ring", color: "#c9ced6", accent: "#5b4a78" }, equip: { slot: "ring", bonuses: { prayer: 2, defence: 2, magic: 2 } } },
  { id: "pearl_pendant", name: "Merrab pearl pendant", examine: "One pearl from the beds, strung on a diver's cord. The divers of Merrab give it to someone who went into the water for them, which isn't many.", value: 6000, weight: 0,
    icon: { shape: "amulet", color: "#efe8e4", accent: "#2f6f7a" }, equip: { slot: "neck", bonuses: { magic: 6, prayer: 3, defence: 3 }, requires: { defence: 30 } } },
  { id: "brickmakers_gloves", name: "Brickmaker's gloves", examine: "Tel Ashun's brickmaker's gloves, cracked with clay at every knuckle. Tahun's grandfather made the leather; Tahun has made the cracks.", value: 1600,
    icon: { shape: "gloves", color: "#8a6a4a", accent: "#c9a46a" }, equip: { slot: "hands", bonuses: { defence: 4, strength: 3 }, requires: { defence: 15 } } },
  { id: "wellkeepers_headcloth", name: "Well-keeper's headcloth", examine: "An indigo headcloth with a white thread worked through it like running water: Ennu's Well's, for someone who kept it.", value: 1600,
    icon: { shape: "hat", color: "#3b4a6a", accent: "#e6dcc6", kind: "headcloth" }, equip: { slot: "head", bonuses: { defence: 3, prayer: 3 }, requires: { defence: 10 } } },
];

/** Each port's tailor and the clothes of its people (data.ts puts these into REGIONAL_CLOTHING). */
export const PORTS_CLOTHING: readonly RegionalSet[] = [
  { region: "gullwick", shop: "gullwick_clothier", pieces: [
    { id: "gullwick_cap", name: "Gullwick cap", slot: "head", shape: "hood", color: "#2f3f5a", accent: "#c9b48a", examine: "A knitted cap of navy wool, rolled at the brim. Every head on every boat out of Gullwick has one, and argues about whose is warmest.", value: 220 },
    { id: "gansey", name: "Gullwick gansey", slot: "body", shape: "body", kind: "tunic", color: "#2f3f5a", accent: "#e6dcc6", examine: "A fisher's jersey knitted tight in oiled navy wool, ropes and ladders worked down the front. Each family has its own pattern, so the sea can't keep anyone nameless.", value: 650 },
    { id: "canvas_breeches", name: "Sailcloth breeches", slot: "legs", shape: "legs", kind: "trousers", color: "#c9b48a", accent: "#3a3530", examine: "Breeches cut from an old sail, tarred at the knees, as stiff as a door until the third wash.", value: 300 },
    { id: "pilot_cloak", name: "Pilot's cloak", slot: "cape", shape: "cape", color: "#3a3530", accent: "#a5443a", examine: "A heavy black cloak with a red lining, the harbour pilots' own: they wear it red side out when a ship's coming in, so the ship can see who to blame.", value: 600 },
    { id: "sea_boots", name: "Sea boots", slot: "feet", shape: "boots", color: "#2a2624", accent: "#6f5440", examine: "Thigh-high leather boots, greased, folded down at the knee on land and up at sea.", value: 260 },
  ] },
  { region: "saltreach", shop: "saltreach_clothier", pieces: [
    { id: "salt_coif", name: "Panner's coif", slot: "head", shape: "hood", color: "#e8e4dc", accent: "#5b4a78", examine: "A close white coif tied under the chin, against the glare off the pans. The Sumptuary Office allows it a violet edge, one finger wide.", value: 240 },
    { id: "panners_smock", name: "Panner's smock", slot: "body", shape: "body", kind: "tunic", color: "#d8d2c8", accent: "#5b4a78", examine: "A long smock of undyed linen, white with salt to the elbow. Saltreach washes it on the seventh day, after the seventh prayer.", value: 600 },
    { id: "pan_kirtle", name: "Grey kirtle", slot: "legs", shape: "legs", kind: "skirt", color: "#6e6a82", accent: "#e8e4dc", examine: "A violet-grey kirtle tucked up at the hem for the brine, the colour of the capital's roofs in rain.", value: 320 },
    { id: "salt_mantle", name: "Saltreach mantle", slot: "cape", shape: "cape", color: "#5b4a78", accent: "#e8e4dc", examine: "A short violet mantle edged in white, as the port's citizens wear to the Salt-House when they're called. They are called often.", value: 700 },
    { id: "wading_boots", name: "Wading boots", slot: "feet", shape: "boots", color: "#4a4038", accent: "#d8d2c8", examine: "Wooden-soled boots for walking the dikes between the pans, rimed white to the ankle.", value: 220 },
  ] },
  { region: "merrab", shop: "merrab_clothier", pieces: [
    { id: "diver_headcloth", name: "Diver's headcloth", slot: "head", shape: "hat", kind: "headcloth", color: "#2f6f7a", accent: "#e6dcc6", examine: "A sea-green cloth wound close over the hair, the tail tucked in so it can't catch on the reef. Merrab wears it on land too, out of habit and pride.", value: 300 },
    { id: "pearl_wrap", name: "Merrab wrap", slot: "body", shape: "body", kind: "robe", color: "#e6dcc6", accent: "#2f6f7a", examine: "A long wrap of light cotton, white for the sun, a sea-green band at the hem for the harbour.", value: 700 },
    { id: "merrab_trousers", name: "Merrab trousers", slot: "legs", shape: "legs", kind: "trousers", color: "#3b4a6a", accent: "#c9a46a", examine: "Loose indigo trousers gathered at the ankle, salt-faded at the knee from kneeling on the quay to sort the shells.", value: 340 },
    { id: "sea_mantle", name: "Sea-blue mantle", slot: "cape", shape: "cape", color: "#2f5f8a", accent: "#e6dcc6", examine: "A mantle dyed with the blue the divers say is the colour of the beds at noon, ten fathoms down.", value: 800 },
    { id: "reed_sandals", name: "Reed sandals", slot: "feet", shape: "boots", color: "#8a6a4a", accent: "#2f6f7a", examine: "Sandals plaited from shore reeds, light enough to swim in, cheap enough to lose.", value: 160 },
  ] },
];

const set = (region: string) => PORTS_CLOTHING.find(entry => entry.region === region)!.pieces.map(piece => piece.id);
export const PORTS_SHOPS: Record<string, ShopDef> = {
  gullwick_inn: { id: "gullwick_inn", name: "The Gull and Lantern", buys: ["food"], rate: 0.5, stock: ["fish_stew", "bread", "ale", "sailfish", "cake"] },
  gullwick_chandlery: { id: "gullwick_chandlery", name: "Oake's Chandlery", general: true, buys: ["food", "logs", "other", "fish"], rate: 0.55, stock: ["bread", "tinderbox", "knife", "hammer", "bucket", "vial", "vial_of_water", "small_net", "fishing_rod", "fishing_bait", "harpoon", "crab_pot", "pewter_axe"] },
  gullwick_fish: { id: "gullwick_fish", name: "Loveday's Fish Market", buys: ["fish"], rate: 0.7, stock: ["fishing_bait", "feather", "raw_sailfish", "raw_inkcrab", "sailfish", "inkcrab", "fish_stew"] },
  gullwick_clothier: { id: "gullwick_clothier", name: "Sennet's Oilskins", buys: ["other"], rate: 0.5, stock: set("gullwick") },
  saltreach_inn: { id: "saltreach_inn", name: "The Salt Cellar", buys: ["food"], rate: 0.5, stock: ["salt_herring", "bread", "lawful_beer", "barkeeps_stew"] },
  saltreach_stores: { id: "saltreach_stores", name: "Ferris's Provisions", general: true, buys: ["food", "other", "fish"], rate: 0.5, stock: ["bread", "salt_herring", "rock_salt", "pot", "bucket", "tinderbox", "knife", "hammer", "vial", "small_net", "fishing_rod"] },
  saltreach_clothier: { id: "saltreach_clothier", name: "The Salt Weaver's", buys: ["other"], rate: 0.5, stock: set("saltreach") },
  merrab_inn: { id: "merrab_inn", name: "The Sea Gate Inn", buys: ["food"], rate: 0.5, stock: ["flatbread", "dates", "ashar_fish", "spiced_lamb", "spiced_tea"] },
  merrab_stores: { id: "merrab_stores", name: "Hashim's Stores", general: true, buys: ["food", "other", "fish"], rate: 0.55, stock: ["dates", "flatbread", "vial_of_water", "tinderbox", "knife", "hammer", "bucket", "small_net", "harpoon", "fishing_rod", "fishing_bait", "rock_salt"] },
  merrab_clothier: { id: "merrab_clothier", name: "Rasha's Dye House", buys: ["other"], rate: 0.5, stock: set("merrab") },
  tel_ashun_stores: { id: "tel_ashun_stores", name: "Imenet's Pots", general: true, buys: ["food", "other"], rate: 0.5, stock: ["pot", "bucket", "vial", "vial_of_water", "dates", "flatbread", "chisel", "clay"] },
  ennu_stall: { id: "ennu_stall", name: "Liyan's Stall", buys: ["food", "other"], rate: 0.5, stock: ["dates", "flatbread", "vial_of_water", "bucket", "spiced_tea"] },
};

export const PORTS_MONSTERS: Record<string, MonsterDef> = {
  gullwick_wrecker: { id: "gullwick_wrecker", name: "Wrecker", level: 16, hp: 24, attack: 12, strength: 12, defence: 10, attackBonus: 6, defenceBonus: 6, maxHit: 3, speed: 4, respawn: 30, wander: 3, art: 215, ink: "#4a4440",
    examine: "A fisher by daylight, in a gansey with the pattern unpicked so nobody can say whose. By night, someone who hangs a lantern where a lantern shouldn't be.", always: [one("bones", 1)], drops: [coins(4, 40, 0.6), one("raw_sailfish", 0.1), one("fish_stew", 0.05)] },
  wrecker_chief: { id: "wrecker_chief", name: "Kit Tregellas", level: 24, hp: 42, attack: 20, strength: 18, defence: 16, attackBonus: 10, defenceBonus: 10, maxHit: 4, speed: 4, respawn: 60, wander: 2, art: 255, ink: "#3f4a52",
    examine: "Nan Tregellas's son, with a lantern hook in one hand and a gutting knife in the other. He stopped paying the customs house's dues and started collecting them back, off the rocks.", always: [one("bones", 1)], drops: [coins(30, 120, 1), one("sea_boots", 0.1)] },
  saltjaw: { id: "saltjaw", name: "Old Saltjaw", level: 46, hp: 130, attack: 38, strength: 42, defence: 34, attackBonus: 20, defenceBonus: 24, maxHit: 8, speed: 5, respawn: 90, wander: 1, aggressive: true, art: 242, ink: "#3f6a6a",
    examine: "A sea crocodile as long as a diving boat, barnacled along the back, one eye white with an old spear-scar. It has learnt that the divers come up tired.", always: [one("bones", 1)], drops: [one("pearl", 0.5, 1, 3), coins(60, 240, 0.8), one("raw_inkcrab", 0.3, 1, 2)] },
  sand_borer: { id: "sand_borer", name: "Sand-borer", level: 26, hp: 48, attack: 20, strength: 20, defence: 24, attackBonus: 10, defenceBonus: 16, maxHit: 4, speed: 5, respawn: 45, wander: 2, aggressive: true, art: 259, ink: "#b89a6a",
    examine: "A long, many-legged thing armoured in plates the colour of the dunes, that tunnels toward the smell of water and leaves sand behind it wherever it's been.", always: [one("bones", 1)], drops: [coins(10, 80, 0.6), one("dates", 0.3, 1, 3)] },
};
