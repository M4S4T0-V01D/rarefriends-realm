/**
 * The Land Before Stone: what Meghavan sells, eats, wears and fights.
 *
 * Rice and lentils at every inn, mangoes off the valley's trees, flatbread from the clay ovens, spiced tea on every
 * corner of every town; each town's own clothes from its own tailor (data.ts REGIONAL_CLOTHING): Tirthali's caravan
 * dress, Ilavarta's tank blue and lotus white, Shailagarh's highland wool, the League's parasol colours, the Assembly's
 * ink silks, the Kanthari's leaf-and-bead. The smiths make the curved Ilavati sabre, the push-dagger and Shaila mail.
 * Out in the country: rain frogs and jewelled peafowl in the valley, gaur and hooded serpents on the plains, langurs
 * and crag bears in the highlands, the Deepgreen's tiger, leeches and strangling vines, and people too: dacoits on the
 * Gate of Rains, corsairs on the Golden Shore, and the Copper Banner's deserters in the passes.
 */
import type { Drop, IconShape, Item, MonsterDef, RegionalSet, ShopDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
const item = (id: string, name: string, examine: string, value: number, shape: IconShape, color: string, accent?: string, extra: Partial<Item> = {}): Item => ({ id, name, examine, value, icon: { shape, color, accent }, ...extra });

export const MEGHAVAN_ITEMS: readonly Item[] = [
  item("mango", "Mango", "A ripe mango from the Ilavati's orchards, so soft it has to be eaten leaning forward. Heals 6.", 14, "berries", "#e8a23a", "#6f8f3a", { heal: 6 }),
  item("spiced_tea", "Spiced tea", "Black tea boiled with milk, ginger, cardamom and too much sugar, in a little clay cup you're meant to break after. Heals 5.", 12, "mug", "#c98f5f", "#b5563a", { heal: 5 }),
  item("rice_and_dal", "Rice and lentils", "A bowl of rice with yellow lentils, cumin and a spoon of ghee: what Meghavan eats when it isn't celebrating, and most of what it eats when it is. Heals 16.", 90, "pot", "#e2c46a", "#f0e8d4", { heal: 16 }),
  item("jewelled_feather", "Jewelled feather", "A peafowl's train feather, an eye of blue and bronze at its tip. Suvarnatira's scribes keep one on the desk for luck, and to point at things.", 80, "feather", "#2f6fa8", "#c9a050", { stackable: true }),
  item("tiger_pelt", "Deepgreen tiger pelt", "A striped pelt, heavy and still warm-smelling. The Kanthari say a tiger skin belongs to the forest; the Archive's buyers say it belongs to whoever pays.", 900, "hide", "#d9802b", "#1e1c22", { stackable: true }),
  item("gaur_horn", "Gaur horn", "A wild gaur's horn, curved and grey-green at the tip. Carvers in Mandapur make parasol handles of it.", 160, "bones", "#5f6b4a", "#e6dcc6", { stackable: true }),
];

/** The smiths' work: the curved Ilavati sabre, the push-dagger, and Shaila mail. */
export const MEGHAVAN_GEAR: readonly Item[] = [
  { id: "ilavati_sabre", name: "Ilavati sabre", examine: "A curved sabre of blackiron with a disc pommel and a knuckle guard, as Ilavarta's tank guards carry. It cuts from the saddle or the ghat steps alike.", value: 5200, weight: 1.6,
    icon: { shape: "sabre", color: "#9aa3ad", accent: "#c9a050" }, equip: { slot: "weapon", bonuses: { attack: 34, strength: 30 }, speed: 4, requires: { attack: 40 } } },
  { id: "push_dagger", name: "Push-dagger", examine: "A short, broad blade set crossways in an H-shaped grip, made to be punched rather than swung. Mandapur's duellists say it ends arguments before they're finished.", value: 3600, weight: 0.6,
    icon: { shape: "dagger", color: "#8f9aa6", accent: "#a8643a" }, equip: { slot: "weapon", bonuses: { attack: 28, strength: 24 }, speed: 3, requires: { attack: 35 } } },
  { id: "shaila_mail", name: "Shaila mail", examine: "A coat of fine blackiron rings riveted shut, lined with quilted highland wool so it doesn't freeze to you in the passes. Shailagarh's forge-masters sign each one inside the collar.", value: 9000, weight: 6,
    icon: { shape: "body", color: "#6f7680", accent: "#a5443a" }, equip: { slot: "body", bonuses: { defence: 38, ranged: 6 }, requires: { defence: 40 } } },
  // The quests' gifts (meghavanquests.ts).
  { id: "monsoon_cloak", name: "Monsoon cloak", examine: "An oiled cotton cloak the colour of rain clouds, a Khetmar caravan's thanks. The rain runs off it; the dust doesn't stick.", value: 2500,
    icon: { shape: "cape", color: "#5f6f7a", accent: "#c9a46a" }, equip: { slot: "cape", bonuses: { defence: 4, magic: 2 }, requires: { defence: 20 } } },
  { id: "kept_tank_ring", name: "Ring of the Kept Tank", examine: "A silver ring set with one lapis drop: a tank seen from above. Ilavarta's queens give one to whoever keeps the water.", value: 9000, weight: 0,
    icon: { shape: "ring", color: "#c9ced6", accent: "#2f5f9a" }, equip: { slot: "ring", bonuses: { prayer: 4, magic: 4, defence: 2 }, requires: { defence: 40 } } },
  { id: "speakers_parasol", name: "Speaker's parasol", examine: "A parasol of the League, its ribs gaur horn, its canopy the seven colours. Held up, it's a shade; held out, it's a shield; held by you, it's a debt the League will remember.", value: 7000,
    icon: { shape: "shield", color: "#d9b866", accent: "#6f3f7a" }, equip: { slot: "shield", bonuses: { defence: 24, magic: 6 }, requires: { defence: 45 } } },
  { id: "pass_warden_helm", name: "Pass-warden's helm", examine: "A blackiron helm with a red horsehair crest and a nasal bar, the last pass-warden of Shailagarh's. It has watched the eastern pass for sixty winters.", value: 8000,
    icon: { shape: "helm", color: "#6f7680", accent: "#a5443a" }, equip: { slot: "head", bonuses: { defence: 26, strength: 4 }, requires: { defence: 50 } } },
  { id: "readers_stole", name: "Reader's stole", examine: "A sea-green stole with a pen worked at both ends: the Assembly of Ink and Coin's thanks to someone who read the ledger before believing the envoy.", value: 6000,
    icon: { shape: "cape", color: "#2f6f7a", accent: "#e6dcc6" }, equip: { slot: "cape", bonuses: { magic: 8, defence: 4, prayer: 2 }, requires: { magic: 40 } } },
  { id: "seed_charm", name: "Kanthari seed charm", examine: "Seeds of the grove trees strung on palm fibre. Plant one where you were born, Grandmother Sukesh says, and something of the Deepgreen will grow there. Probably bamboo.", value: 5000,
    icon: { shape: "amulet", color: "#6a4a2a", accent: "#5a7a3a" }, equip: { slot: "neck", bonuses: { defence: 6, ranged: 6, prayer: 2 }, requires: { defence: 35 } } },
];
/** The quests' things you carry for a while. */
export const MEGHAVAN_QUEST_ITEMS: readonly Item[] = [
  item("star_folio", "Star chart folio", "The ninth leaf of the Azhurak star chart: a river of stars across a sheet of beaten bark, bound in lapis thread. It belongs to the Archive, or to Tamesh, or to the sky.", 0, "scroll", "#e6dcc6", "#2f5f9a", { tradeable: false }),
  item("logging_licence", "Logging licence", "Shailagarh's licence to the loggers: pit props from the Deepgreen, signed by Lord Varanjit, with no grove stones drawn on it anywhere.", 0, "scroll", "#e6dcc6", "#a5443a", { tradeable: false }),
];

/** Each town's tailor and the clothes of its people (data.ts puts these into REGIONAL_CLOTHING). */
export const MEGHAVAN_CLOTHING: readonly RegionalSet[] = [
  { region: "tirthali", shop: "tirthali_clothier", pieces: [
    { id: "ford_turban", name: "Ford-town turban", slot: "head", shape: "hat", kind: "turban", color: "#d98a2b", accent: "#2f3f66", examine: "A saffron turban tied the Tirthali way, half Kharaveth and half Meghavan, which is to say tied twice.", value: 380 },
    { id: "caravan_kurta", name: "Caravan kurta", slot: "body", shape: "body", kind: "tunic", color: "#e6dcc6", accent: "#a5443a", examine: "A long cotton shirt to the knee, red-stitched at the collar, cool in the dry months and quick to dry in the wet.", value: 700 },
    { id: "ford_trousers", name: "Ford trousers", slot: "legs", shape: "legs", kind: "trousers", color: "#8a6a4a", accent: "#d98a2b", examine: "Loose trousers rolled to the knee, for the ford, and rolled to the ankle, for everywhere else.", value: 340 },
    { id: "dust_shawl", name: "Dust shawl", slot: "cape", shape: "cape", color: "#c9a46a", accent: "#2f3f66", examine: "A wide shawl of undyed wool, worn over the head against Kharaveth's dust or Meghavan's rain, depending on which way you're going.", value: 420 },
    { id: "ford_sandals", name: "Ford sandals", slot: "feet", shape: "boots", color: "#6f5440", accent: "#d98a2b", examine: "Leather sandals with a toe ring, soaked and dried so many times they've taken the shape of the ford.", value: 200 },
  ] },
  { region: "sarovan", shop: "sarovan_clothier", pieces: [
    { id: "ilavartan_turban", name: "Ilavartan turban", slot: "head", shape: "hat", kind: "turban", color: "#f2ecdc", accent: "#34407a", examine: "A white turban with a blue fold, Ilavarta's colours: the white of the lotus, the blue of a kept tank.", value: 500 },
    { id: "tank_jama", name: "Tank-blue jama", slot: "body", shape: "body", kind: "robe", color: "#34407a", accent: "#f2ecdc", examine: "A long coat flaring from the waist, tank blue, tied at the side. Sarovan's officials wear it to court and to the ghats at dawn.", value: 1300 },
    { id: "pleated_dhoti", name: "Pleated dhoti", slot: "legs", shape: "legs", kind: "skirt", color: "#f0e8d4", accent: "#c9a050", examine: "A length of white cotton wrapped and pleated at the waist, a gold thread along its border.", value: 500 },
    { id: "lotus_shawl", name: "Lotus shawl", slot: "cape", shape: "cape", color: "#efe8da", accent: "#d97a8a", examine: "A fine white shawl worked with pink lotuses along the hem, as the Queen's household wears on festival days.", value: 1000 },
    { id: "ghat_slippers", name: "Ghat slippers", slot: "feet", shape: "boots", color: "#a8643a", accent: "#c9a050", examine: "Soft leather slippers with turned-up toes, left at the top of the ghat steps by everyone who bathes.", value: 260 },
  ] },
  { region: "shailagarh", shop: "shailagarh_clothier", pieces: [
    { id: "highland_cap", name: "Highland cap", slot: "head", shape: "hood", color: "#a5443a", accent: "#e6dcc6", examine: "A round wool cap, red with an undyed band, folded down over the ears when the wind comes over the passes.", value: 320 },
    { id: "shaila_coat", name: "Shaila wool coat", slot: "body", shape: "body", kind: "tunic", color: "#7a6a5a", accent: "#a5443a", examine: "A thick coat of highland wool, belted, the right side crossing over the left. It smells of sheep in the rain, which is honest of it.", value: 1100 },
    { id: "highland_trousers", name: "Highland trousers", slot: "legs", shape: "legs", kind: "trousers", color: "#4a4038", accent: "#a5443a", examine: "Heavy woollen trousers tucked into the boot, patched at the knees by somebody who climbs.", value: 420 },
    { id: "shaila_blanket", name: "Shaila blanket-cloak", slot: "cape", shape: "cape", color: "#a5443a", accent: "#2f2a26", examine: "A red blanket striped in black, worn as a cloak by day and slept under by night. Shailagarh's sentries are never without one.", value: 700 },
    { id: "pass_boots", name: "Pass boots", slot: "feet", shape: "boots", color: "#3a2f28", accent: "#a5443a", examine: "Felt boots with leather soles, laced to the shin. Good on snow, better on scree.", value: 340 },
  ] },
  { region: "mandapur", shop: "mandapur_clothier", pieces: [
    { id: "parasol_hat", name: "Parasol hat", slot: "head", shape: "hat", kind: "wide", color: "#d9b866", accent: "#a5443a", examine: "A wide hat of woven palm, painted inside in the seven colours of the League, so the wearer is shaded by all of them at once.", value: 300 },
    { id: "council_angarkha", name: "Council angarkha", slot: "body", shape: "body", kind: "robe", color: "#e8d6a8", accent: "#6f3f7a", examine: "A wrap coat tied at the chest with cords, worn by the League's delegates. The cords are tied differently for each of the seven, and arguments start there.", value: 1200 },
    { id: "plains_trousers", name: "Plains trousers", slot: "legs", shape: "legs", kind: "trousers", color: "#c9b48a", accent: "#6f3f7a", examine: "Fitted cotton trousers gathered at the ankle, for long walks between towns that disagree with each other.", value: 380 },
    { id: "parasol_mantle", name: "Parasol mantle", slot: "cape", shape: "cape", color: "#6f3f7a", accent: "#d9b866", examine: "A purple mantle with seven gold bars at the hem, one for each parasol. A Speaker wears it for a year, then gives it back.", value: 1100 },
  ] },
  { region: "suvarnatira", shop: "suvarnatira_clothier", pieces: [
    { id: "scholars_cap", name: "Scholar's cap", slot: "head", shape: "hat", kind: "headcloth", color: "#2f6f7a", accent: "#e6dcc6", examine: "A soft cap of sea-green cotton with a long tail down the back, as the Archive's readers wear so the librarians can tell them from the merchants.", value: 420 },
    { id: "ink_silk_robe", name: "Ink-silk robe", slot: "body", shape: "body", kind: "robe", color: "#1e2a3a", accent: "#c9a050", examine: "A robe of silk dyed the colour of good ink, a gold coin stitched at the collar: the Assembly of Ink and Coin, in one garment.", value: 1500 },
    { id: "harbour_trousers", name: "Harbour trousers", slot: "legs", shape: "legs", kind: "trousers", color: "#e6dcc6", accent: "#2f6f7a", examine: "Wide white trousers, salt-stained to the knee, the free port's everyday wear.", value: 360 },
    { id: "assembly_stole", name: "Assembly stole", slot: "cape", shape: "cape", color: "#2f6f7a", accent: "#c9a050", examine: "A long stole of sea green, a pen worked in gold at one end and a coin at the other. You wear it with the pen in front if you're a scholar, the coin if you're a merchant, and both if you're the Provost.", value: 1000 },
    { id: "harbour_sandals", name: "Harbour sandals", slot: "feet", shape: "boots", color: "#8a6a4a", accent: "#2f6f7a", examine: "Cork-soled sandals that float, which is the point, in a port.", value: 220 },
  ] },
  { region: "kanthar", shop: "kanthar_trader", pieces: [
    { id: "bead_headband", name: "Bead headband", slot: "head", shape: "hood", color: "#5a7a3a", accent: "#d94a3a", examine: "A band of red seeds and green beads worn across the brow. Each pattern belongs to a family, and borrowing one is a conversation.", value: 260 },
    { id: "forest_wrap", name: "Forest wrap", slot: "body", shape: "body", kind: "tunic", color: "#4a6a32", accent: "#c9a050", examine: "A wrap of bark-cloth and cotton, dyed in leaf greens. You don't hear a Kanthari coming, and you don't see one either.", value: 600 },
    { id: "kanthari_skirt", name: "Kanthari wrap-skirt", slot: "legs", shape: "legs", kind: "skirt", color: "#6a4a2a", accent: "#5a7a3a", examine: "A wrap-skirt to the knee, striped brown and green, worn by everyone in Kanthar whatever else they wear.", value: 300 },
    { id: "leaf_rain_cape", name: "Leaf rain-cape", slot: "cape", shape: "cape", color: "#3f6a2a", accent: "#7a6440", examine: "A cape of overlapping teak leaves sewn on a palm-fibre net. The monsoon runs off it like off a roof.", value: 480 },
  ] },
];

const set = (region: string) => MEGHAVAN_CLOTHING.find(entry => entry.region === region)!.pieces.map(piece => piece.id);
const GENERAL = ["mango", "flatbread", "spiced_tea", "vial", "vial_of_water", "tinderbox", "knife", "hammer", "bucket", "fishing_rod", "fishing_bait", "pewter_pickaxe", "pewter_axe"];
const INN = ["rice_and_dal", "flatbread", "spiced_tea", "mango"];
const FORGE = ["ilavati_sabre", "push_dagger", "shaila_mail", "blackiron_sword", "blackiron_helm", "blackiron_cuirass", "blackiron_shield", "hammer", "blackiron_pickaxe"];
export const MEGHAVAN_SHOPS: Record<string, ShopDef> = {
  tirthali_stores: { id: "tirthali_stores", name: "Hamir's Stores", general: true, buys: ["food", "logs", "other"], rate: 0.55, stock: [...GENERAL, "rock_salt"] },
  tirthali_inn: { id: "tirthali_inn", name: "The Tirthali Caravanserai Inn", buys: ["food"], rate: 0.5, stock: [...INN, "dates"] },
  tirthali_clothier: { id: "tirthali_clothier", name: "Nalini's Dye House", buys: ["other"], rate: 0.5, stock: set("tirthali") },
  sarovan_general: { id: "sarovan_general", name: "Ishaan's General Goods", general: true, buys: ["food", "logs", "other"], rate: 0.55, stock: GENERAL },
  sarovan_inn: { id: "sarovan_inn", name: "The Lotus Inn", buys: ["food"], rate: 0.5, stock: INN },
  sarovan_forge: { id: "sarovan_forge", name: "Gauri's Forge", buys: ["weapon", "armour", "ore", "bar"], rate: 0.5, stock: FORGE },
  sarovan_clothier: { id: "sarovan_clothier", name: "Padma's Looms", buys: ["other"], rate: 0.5, stock: set("sarovan") },
  shailagarh_general: { id: "shailagarh_general", name: "Kunal's Stores", general: true, buys: ["food", "logs", "other", "ore"], rate: 0.55, stock: [...GENERAL, "blackiron_pickaxe"] },
  shailagarh_inn: { id: "shailagarh_inn", name: "The Pass Fire Inn", buys: ["food"], rate: 0.5, stock: INN },
  shailagarh_forge: { id: "shailagarh_forge", name: "Uday's Forge", buys: ["weapon", "armour", "ore", "bar"], rate: 0.5, stock: FORGE },
  shailagarh_clothier: { id: "shailagarh_clothier", name: "Dolma's Wool Room", buys: ["other"], rate: 0.5, stock: set("shailagarh") },
  mandapur_general: { id: "mandapur_general", name: "Vasant's Stores", general: true, buys: ["food", "logs", "other"], rate: 0.55, stock: GENERAL },
  mandapur_inn: { id: "mandapur_inn", name: "The Seven Shades Inn", buys: ["food"], rate: 0.5, stock: INN },
  mandapur_forge: { id: "mandapur_forge", name: "Revati's Smithy", buys: ["weapon", "armour", "ore", "bar"], rate: 0.5, stock: FORGE },
  mandapur_clothier: { id: "mandapur_clothier", name: "Champa's Weaving", buys: ["other"], rate: 0.5, stock: set("mandapur") },
  suvarnatira_general: { id: "suvarnatira_general", name: "Dray's Harbour Stores", general: true, buys: ["food", "logs", "other", "fish"], rate: 0.55, stock: [...GENERAL, "small_net", "harpoon"] },
  suvarnatira_inn: { id: "suvarnatira_inn", name: "The Inkwell Inn", buys: ["food"], rate: 0.5, stock: INN },
  suvarnatira_forge: { id: "suvarnatira_forge", name: "Kavya's Smithy", buys: ["weapon", "armour", "ore", "bar"], rate: 0.5, stock: FORGE },
  suvarnatira_clothier: { id: "suvarnatira_clothier", name: "Roshni's Silk House", buys: ["other"], rate: 0.5, stock: set("suvarnatira") },
  kanthar_trader: { id: "kanthar_trader", name: "Tula's weaving house", buys: ["other", "food"], rate: 0.5, stock: [...set("kanthar"), "mango", "rice_and_dal"] },
};

export const MEGHAVAN_MONSTERS: Record<string, MonsterDef> = {
  giant_rain_frog: { id: "giant_rain_frog", name: "Giant rain frog", level: 18, hp: 26, attack: 14, strength: 12, defence: 10, attackBonus: 4, defenceBonus: 6, maxHit: 2, speed: 4, respawn: 25, wander: 6, art: 250, ink: "#4f8a3a",
    examine: "A frog the size of a dog, green and gold, its throat swelling like a bell. When the rain starts, every one of them in the valley starts too.", always: [one("bones", 1)], drops: [coins(4, 30, 0.4), one("mango", 0.1)] },
  jewelled_peafowl: { id: "jewelled_peafowl", name: "Jewelled peafowl", level: 22, hp: 30, attack: 16, strength: 14, defence: 14, attackBonus: 6, defenceBonus: 8, maxHit: 3, speed: 4, respawn: 25, wander: 7, art: 246, ink: "#2f6fa8",
    examine: "A peacock in blue and green and bronze, its train a hundred eyes. It screams like somebody in trouble, which is how it gets its way.", always: [one("bones", 1)], drops: [one("jewelled_feather", 0.6, 1, 2), coins(6, 40, 0.4)] },
  monsoon_leech: { id: "monsoon_leech", name: "Monsoon leech", level: 30, hp: 34, attack: 24, strength: 18, defence: 16, attackBonus: 12, defenceBonus: 10, maxHit: 4, speed: 4, respawn: 30, wander: 4, aggressive: true, poisonWeak: 1.5, art: 248, ink: "#3a2f2a",
    examine: "A leech as long as your arm, rising out of the wet grass on its tail when it feels your step. The rain brings them; the dry months bury them.", always: [], drops: [coins(8, 50, 0.5)] },
  rock_langur: { id: "rock_langur", name: "Rock langur", level: 34, hp: 44, attack: 30, strength: 24, defence: 24, attackBonus: 16, defenceBonus: 14, maxHit: 4, speed: 3, respawn: 30, wander: 8, aggressive: true, art: 245, ink: "#b8b0a0",
    examine: "A grey monkey with a black face and a tail longer than it is, sitting on a rock as if it owned the road. Travellers' purses go missing near them, and the langurs don't apologise.", always: [one("bones", 1)], drops: [coins(10, 90, 0.7), one("mango", 0.2)] },
  hooded_serpent: { id: "hooded_serpent", name: "Hooded serpent", level: 38, hp: 42, attack: 32, strength: 26, defence: 22, attackBonus: 18, defenceBonus: 12, maxHit: 5, speed: 3, respawn: 30, wander: 5, aggressive: true, poison: { damage: 5, chance: 0.3 }, art: 249, ink: "#6a5a3a",
    examine: "A long brown snake that rises and spreads its hood when it sees you, two pale marks on the back of it like eyes. The farmers leave it bowls of milk, and a wide path.", always: [one("bones", 1)], drops: [coins(10, 70, 0.4)] },
  wild_gaur: { id: "wild_gaur", name: "Wild gaur", level: 40, hp: 70, attack: 30, strength: 36, defence: 34, attackBonus: 14, defenceBonus: 24, maxHit: 6, speed: 5, respawn: 35, wander: 6, art: 252, ink: "#3a2a22",
    examine: "A wild ox taller than a man at the shoulder, black, white-stockinged, its horns curved up and in. It isn't looking for a fight, and it will finish one.", always: [one("bones", 1)], drops: [one("raw_beef", 0.8, 1, 2), one("gaur_horn", 0.3), coins(12, 80, 0.4)] },
  rain_dacoit: { id: "rain_dacoit", name: "Dacoit", level: 42, hp: 52, attack: 36, strength: 34, defence: 30, attackBonus: 20, defenceBonus: 18, maxHit: 6, speed: 4, respawn: 40, wander: 5, aggressive: true, art: 254, ink: "#5a3a2a",
    examine: "A highway robber of the Gate of Rains, cloth over the face, a curved knife and a grievance. Some were farmers before the tanks silted; some were robbers before that.", always: [one("bones", 1)], drops: [coins(30, 160, 0.9), one("push_dagger", 0.02), one("spiced_tea", 0.2)] },
  shore_corsair: { id: "shore_corsair", name: "Shore corsair", level: 46, hp: 56, attack: 40, strength: 36, defence: 32, attackBonus: 22, defenceBonus: 20, maxHit: 7, speed: 4, respawn: 40, wander: 5, aggressive: true, art: 255, ink: "#2f4f5a",
    examine: "A raider off a low black boat, sea-salt in her braids and a hooked blade in her belt. Suvarnatira pays the harbour watch to chase them, and the corsairs pay them not to.", always: [one("bones", 1)], drops: [coins(40, 200, 0.9), one("ilavati_sabre", 0.02), one("jewelled_feather", 0.1)] },
  vine_strangler: { id: "vine_strangler", name: "Vine strangler", level: 52, hp: 70, attack: 40, strength: 42, defence: 40, magicDef: 20, attackBonus: 22, defenceBonus: 26, maxHit: 7, speed: 5, respawn: 45, wander: 2, aggressive: true, poisonImmune: true, weakness: "fire", art: 253, ink: "#3f6a2a",
    examine: "A knot of creepers that stands up out of the undergrowth and reaches. The Kanthari cut it back every year with a song, and it grows back every year without one.", always: [], drops: [coins(20, 120, 0.6), one("logs", 0.4, 1, 2)] },
  deepgreen_tiger: { id: "deepgreen_tiger", name: "Deepgreen tiger", level: 58, hp: 92, attack: 48, strength: 50, defence: 40, attackBonus: 30, defenceBonus: 26, maxHit: 9, speed: 4, respawn: 60, wander: 6, aggressive: true, art: 247, ink: "#d9802b",
    examine: "Orange and black, the size of a pony, moving through the bamboo without moving it. The Kanthari don't say its name in the forest; they call it 'the one with stripes', politely.", always: [one("bones", 1)], drops: [one("tiger_pelt", 0.5), coins(30, 200, 0.6), one("raw_beef", 0.5)] },
  highland_deserter: { id: "highland_deserter", name: "Banner deserter", level: 60, hp: 80, attack: 50, strength: 48, defence: 46, attackBonus: 32, defenceBonus: 34, maxHit: 9, speed: 4, respawn: 50, wander: 4, aggressive: true, art: 256, ink: "#8f4a2a",
    examine: "A soldier of a Copper Banner company who stopped waiting for his pay, still in the copper-faced coat with the badge cut off. He's kept the sabre.", always: [one("bones", 1)], drops: [coins(60, 260, 0.9), one("blackiron_sabre", 0.04), one("shaila_mail", 0.01)] },
  // The quests' foes, and the Great Stepwell's.
  dacoit_chief: { id: "dacoit_chief", name: "Red Jhanda", level: 54, hp: 84, attack: 46, strength: 44, defence: 38, attackBonus: 28, defenceBonus: 24, maxHit: 8, speed: 4, respawn: 90, wander: 2, aggressive: true, art: 257, ink: "#a5443a",
    examine: "The dacoits' chief, in a red turban he's proud of and a caravan-master's stolen coat he's prouder of. He says he takes only from those who have too much. He decides who that is.", always: [one("bones", 1)], drops: [coins(80, 300, 1), one("push_dagger", 0.1)] },
  deserter_sergeant: { id: "deserter_sergeant", name: "Sergeant Hask", level: 68, hp: 120, attack: 56, strength: 56, defence: 54, attackBonus: 36, defenceBonus: 40, maxHit: 11, speed: 5, respawn: 90, wander: 2, aggressive: true, art: 258, ink: "#8f4a2a",
    examine: "A Copper Banner sergeant of twelve years' service, the badge cut off his coat, a battleaxe across his knees. He kept the books on everything, including how much he was owed.", always: [one("bones", 1)], drops: [coins(100, 400, 1), one("shaila_mail", 0.04)] },
  silt_crawler: { id: "silt_crawler", name: "Silt crawler", level: 56, hp: 76, attack: 42, strength: 44, defence: 48, attackBonus: 24, defenceBonus: 36, maxHit: 8, speed: 5, respawn: 45, wander: 3, aggressive: true, weakness: "wind", art: 259, ink: "#6a5a40",
    examine: "A many-legged thing the colour of river mud, armoured in plates of dried silt, that came up the Stepwell's drains and found the dark agreed with it.", always: [one("bones", 1)], drops: [coins(30, 180, 0.7), one("clay", 0.4, 1, 3), one("gaur_horn", 0.05)] },
  monsoon_serpent: { id: "monsoon_serpent", name: "The Monsoon Serpent", level: 90, hp: 320, attack: 70, strength: 72, defence: 66, magicDef: 60, attackBonus: 50, defenceBonus: 54, maxHit: 17, speed: 5, respawn: 200, wander: 1, aggressive: true, boss: true, size: 2,
    poison: { damage: 7, chance: 0.25 }, weakness: "earth", art: 260, ink: "#2f6f7a",
    examine: "A serpent as long as the cistern is wide, its scales the green of deep tank water, a hood like a storm cloud. The Stepwell's builders carved it on the pillars, holding up the rain. It stopped holding it up.", always: [one("large_bones", 1)], drops: [coins(400, 1500, 1), one("tiger_pelt", 0.3), one("jewelled_feather", 0.5, 2, 5), one("kept_tank_ring", 0.01)] },
  crag_bear: { id: "crag_bear", name: "Crag bear", level: 62, hp: 112, attack: 48, strength: 56, defence: 50, attackBonus: 28, defenceBonus: 34, maxHit: 10, speed: 5, respawn: 60, wander: 4, aggressive: true, art: 251, ink: "#4a3a30",
    examine: "A shaggy black bear with a pale crescent on its chest and claws for digging grubs out of rock, or anything else out of anything else. It rules the scree above the mines.", always: [one("bones", 1)], drops: [one("raw_beef", 0.7, 1, 3), coins(40, 220, 0.6), one("moonsilver_ore", 0.15)] },
};
