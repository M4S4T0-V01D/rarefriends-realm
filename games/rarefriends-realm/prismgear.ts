/**
 * The Prismwild's things (prismworld.ts, prismtalk.ts, labyrinth.ts): mazeglass, the coin of Fennick's Labyrinth, and
 * what it buys at his curio stall (the Prismweave robes, his twisting staff, the prism focus, lilac tea); the Collegium's
 * own stores (sigils, a tablet home); and the land's creatures: glimmer moths and thistle pixies in the meadows,
 * prism wisps in the Starwood, glimmer stags (who mind their own business), and the shard golems of the Shardfields.
 * A leaf (types only), so data.ts can list them.
 */
import type { Drop, Item, MonsterDef, RegionalSet, ShopDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
const VIOLET = "#7a4fc9", ROSE = "#e07ac8";

/** The Prismweave robes: each piece gives spells a 4% chance to keep their sigils; the whole set, 25% (engine.ts sigilSave). */
export const PRISMWEAVE = ["prismweave_hood", "prismweave_robe", "prismweave_skirt", "prismweave_gloves", "prismweave_boots"] as const;
/** Fennick's twisting staff: never short of breeze or tide sigils (engine.ts spellCost). */
export const PRISM_STAFF_SIGILS: Record<string, readonly string[]> = { twisting_staff: ["breeze_sigil", "tide_sigil"] };

export const PRISM_ITEMS: readonly Item[] = [
  { id: "mazeglass", name: "Mazeglass", examine: "A bead of violet glass, warm, that rings like a bell when it's tapped. Fennick pays his runners in it, and takes it back at his stall.", value: 0, stackable: true, tradeable: false,
    icon: { shape: "gem", color: VIOLET, accent: ROSE } },
  { id: "prismweave_hood", name: "Prismweave hood", examine: "A hood of violet cloth shot with rose, the weave catching light like a prism. Spells cast in it sometimes keep their sigils.", value: 6000, price: 300, tradeable: false,
    icon: { shape: "hood", color: VIOLET, accent: ROSE }, equip: { slot: "head", bonuses: { magic: 10, defence: 5 }, requires: { magic: 40 } } },
  { id: "prismweave_robe", name: "Prismweave robe", examine: "A long robe of violet and rose prismweave, the colours turning as it moves. Spells cast in it sometimes keep their sigils.", value: 12000, price: 600, tradeable: false,
    icon: { shape: "body", color: VIOLET, accent: ROSE, kind: "robe" }, equip: { slot: "body", bonuses: { magic: 18, defence: 10 }, requires: { magic: 45 } } },
  { id: "prismweave_skirt", name: "Prismweave skirt", examine: "A robe skirt of prismweave, rose at the hem. Spells cast in it sometimes keep their sigils.", value: 9000, price: 450, tradeable: false,
    icon: { shape: "legs", color: ROSE, accent: VIOLET }, equip: { slot: "legs", bonuses: { magic: 13, defence: 7 }, requires: { magic: 45 } } },
  { id: "prismweave_gloves", name: "Prismweave gloves", examine: "Fine violet gloves, the fingertips rose. Spells cast in them sometimes keep their sigils.", value: 4000, price: 200, tradeable: false,
    icon: { shape: "gloves", color: VIOLET, accent: ROSE }, equip: { slot: "hands", bonuses: { magic: 6, defence: 3 }, requires: { magic: 40 } } },
  { id: "prismweave_boots", name: "Prismweave boots", examine: "Soft rose boots stitched with violet. Spells cast in them sometimes keep their sigils.", value: 4000, price: 200, tradeable: false,
    icon: { shape: "boots", color: ROSE, accent: VIOLET }, equip: { slot: "feet", bonuses: { magic: 6, defence: 3 }, requires: { magic: 40 } } },
  { id: "twisting_staff", name: "Twisting staff", examine: "A staff of crystal-thorn wood that won't grow straight, a prism caught in its crook. It never runs short of breeze or tide sigils.", value: 18000, price: 900, tradeable: false,
    icon: { shape: "staff", color: VIOLET, accent: ROSE }, equip: { slot: "weapon", bonuses: { attack: 6, strength: 8, magic: 26 }, speed: 5, staff: true, requires: { magic: 55 } } },
  { id: "prism_focus", name: "Prism focus", examine: "A hand-sized prism in a silver cage, held in the off hand. Light bends round it, and so do spells.", value: 10000, price: 500, tradeable: false,
    icon: { shape: "orb", color: "#cbb8f0", accent: ROSE }, equip: { slot: "shield", bonuses: { magic: 16, defence: 6, prayer: 2 }, requires: { magic: 50 } } },
  { id: "lilac_tea", name: "Lilac tea", examine: "A flask of the Collegium's lilac tea, sweet and faintly fizzy. Students live on it.", value: 80, price: 3, heal: 12,
    icon: { shape: "bottle", color: "#b89ae0", accent: "#f0e6ff" } },
  { id: "tablet_collegium", name: "Collegium tablet", examine: "Break it to travel to the Collegium of the Seventh Lamp, in the Prismwild.", value: 160, stackable: true, tablet: "collegium",
    icon: { shape: "tablet", color: "#cbb8f0" } },
  { id: "student_satchel", name: "Pell's satchel", examine: "A Collegium student's satchel, wet with dew and full of notes about fairies. Pell Ashby will want it back.", value: 0, tradeable: false,
    icon: { shape: "satchel", color: "#6a5a8a", accent: "#e2c46a" } },
  { id: "glimmer_dust", name: "Glimmer dust", examine: "Dust from a glimmer moth's wings, shining faintly violet. The Collegium's tutors want it for their lessons.", value: 40, stackable: true,
    icon: { shape: "material", color: "#cbb8f0", accent: ROSE } },
  { id: "fizzing_tonic", name: "Fizzing tonic", examine: "A tonic from Mother Fizzwig's kettle. It fizzes in the bottle, in your mouth and, briefly, in your ears.", value: 140, heal: 16,
    icon: { shape: "bottle", color: "#5fc8c0", accent: "#fbf6ee" } },
  { id: "starlight_biscuit", name: "Starlight biscuit", examine: "A biscuit shaped like a star, baked in Bellwhistle. It's still faintly warm, and nobody can say why.", value: 30, heal: 6,
    icon: { shape: "bread", color: "#ecd27a", accent: "#9a72e8" } },
  { id: "shard_heart", name: "Shard heart", examine: "The prism at a shard golem's core, still humming. Worth a great deal to the Collegium.", value: 2500,
    icon: { shape: "gem", color: "#9a7ae8", accent: "#f0e6ff" } },
];

/** What the Prismwild's wizard-folk wear (data.ts puts it into REGIONAL_CLOTHING): Hattie Pennyfeather makes it in Spirehollow. */
export const PRISM_CLOTHING: readonly RegionalSet[] = [
  { region: "prismwild", shop: "spire_hats", pieces: [
    { id: "spiral_wizard_hat", name: "Spiral wizard hat", slot: "head", shape: "hat", color: "#6a4a8a", accent: "#ecd27a", examine: "A pointed hat that curls round on itself twice before it gets to the point. Hattie says it's how the magic gets in.", value: 260 },
    { id: "starry_robe", name: "Moon-and-star robe", slot: "body", shape: "body", kind: "robe", color: "#3a3a7a", accent: "#ecd27a", examine: "A long blue robe sewn with yellow moons and stars, a few of them upside down. Every wizard in the Prismwild owns one; none of them will admit it.", value: 520 },
    { id: "patchwork_robe", name: "Patchwork robe", slot: "body", shape: "body", kind: "robe", color: "#c94a5a", accent: "#5fc8c0", examine: "A robe made of every other robe its owner wore out, patched together in no order at all. Spirehollow's favourite.", value: 400 },
    { id: "stripy_stockings", name: "Stripy stockings", slot: "legs", shape: "legs", kind: "trousers", color: "#e47ac4", accent: "#fbf6ee", examine: "Long stockings in pink and white stripes, worn under a robe by people who'd rather you didn't see them, and over one by people who would.", value: 180 },
    { id: "curly_slippers", name: "Curly-toed slippers", slot: "feet", shape: "boots", color: "#9a72e8", accent: "#ecd27a", examine: "Velvet slippers whose toes curl up and round. A bell on each toe, for finding them in the morning.", value: 220 },
    { id: "starry_cloak", name: "Starry cloak", slot: "cape", shape: "cape", color: "#2a2a5a", accent: "#ecd27a", examine: "A night-blue cloak with stars that are slowly, very slowly, moving across it.", value: 600 },
    // What wizards wear on their heads when nobody stops them.
    { id: "boot_hat", name: "Boot hat", slot: "head", shape: "hat", kind: "boot", color: "#7a4a2a", accent: "#ecd27a", examine: "A boot, worn on the head, sole to the sky. The other one's on a foot somewhere. Hattie says boots are very in.", value: 150 },
    { id: "pink_boot_hat", name: "Pink boot hat", slot: "head", shape: "hat", kind: "boot", color: "#e47ac4", accent: "#fbf6ee", examine: "A pink boot, worn on the head. It's laced, for safety.", value: 150 },
    { id: "teapot_hat", name: "Teapot hat", slot: "head", shape: "hat", kind: "teapot", color: "#5fc8c0", accent: "#ecd27a", examine: "A teapot, worn on the head. Mrs Kettleby disapproves. Mrs Kettleby lives in one.", value: 240 },
    { id: "fishbowl_hat", name: "Fishbowl helm", slot: "head", shape: "hat", kind: "fishbowl", color: "#cfe8f8", accent: "#ec8a3a", examine: "A glass fishbowl, worn over the head, with a fish in it. The fish was consulted. The fish said yes.", value: 300 },
    { id: "candle_hat", name: "Birthday hat", slot: "head", shape: "hat", kind: "candles", color: "#e47ac4", accent: "#fbf6ee", examine: "A round cap with three lit candles stood in it. Every day is somebody's birthday, and in Spirehollow it's usually the hat's.", value: 220 },
    { id: "propeller_cap", name: "Propeller cap", slot: "head", shape: "hat", kind: "propeller", color: "#ecb45a", accent: "#9a72e8", examine: "A segmented cap with a little propeller on top that turns whether or not there's any wind.", value: 180 },
    { id: "lampshade_hat", name: "Lampshade", slot: "head", shape: "hat", kind: "lampshade", color: "#f0d8a0", accent: "#c94a5a", examine: "A fringed lampshade, worn as a hat. Uncle Bartlemy started it. Nobody has finished it.", value: 120 },
    { id: "mushroom_cap", name: "Mushroom cap", slot: "head", shape: "hat", kind: "mushroom", color: "#c94a5a", accent: "#fbf6ee", examine: "A great red cap with white spots, from Mothwick. It is, they promise, not a mushroom. Mostly.", value: 200 },
    { id: "crystal_antlers", name: "Crystal antlers", slot: "head", shape: "hat", kind: "antlers", color: "#6a4a8a", accent: "#cbb8f0", examine: "A circlet with antlers of violet crystal growing out of it. They grow a little more every full moon.", value: 420 },
    { id: "towering_hat", name: "Towering hat", slot: "head", shape: "hat", kind: "tower", color: "#3a7a7a", accent: "#ecd27a", examine: "A wizard's hat three times taller than a wizard's hat should be, bent twice on the way up. Doorways are a problem.", value: 360 },
    // And on the rest of them.
    { id: "pyjama_robe", name: "Pyjama robe", slot: "body", shape: "body", kind: "robe", color: "#8ad0e8", accent: "#e47ac4", examine: "Striped pyjamas, worn as a robe, all day, to lectures. In the Prismwild nobody notices.", value: 160 },
    { id: "clashing_robe", name: "Clashing robe", slot: "body", shape: "body", kind: "robe", color: "#ec8a3a", accent: "#4ac860", examine: "Orange and green, with a purple sash. It's said to be the most powerful colour combination in magic, by the people who wear it.", value: 380 },
    { id: "pocket_robe", name: "Robe of many pockets", slot: "body", shape: "body", kind: "robe", color: "#8a6a4a", accent: "#ecd27a", examine: "Sixty-one pockets. Its owner knows what's in fifty of them. The others have opinions.", value: 440 },
    { id: "polkadot_pantaloons", name: "Polka-dot pantaloons", slot: "legs", shape: "legs", kind: "trousers", color: "#ecd27a", accent: "#c94a5a", examine: "Big yellow pantaloons with red spots. They swish.", value: 200 },
    { id: "odd_boots", name: "Odd boots", slot: "feet", shape: "boots", color: "#5fc8c0", accent: "#e47ac4", examine: "Two boots that aren't a pair, and never were. They get along.", value: 160 },
    { id: "bedsheet_cape", name: "Bedsheet cape", slot: "cape", shape: "cape", color: "#f4f0e8", accent: "#8ad0e8", examine: "A bedsheet, tied at the neck. Several wizards insist it is the cloak of a forgotten order. It has a laundry mark.", value: 90 },
    { id: "feather_boa", name: "Feather boa", slot: "cape", shape: "cape", color: "#e47ac4", accent: "#ecd27a", examine: "A boa of pink feathers, long enough to wear as a cloak if you wind it right. Moults.", value: 260 },
  ] },
];

export const PRISM_SHOPS: Record<string, ShopDef> = {
  // Hattie Pennyfeather's in Spirehollow: the Prismwild's own clothes, and every wizard hat there is.
  spire_hats: { id: "spire_hats", name: "Hattie's Hats", buys: ["other"], rate: 0.5, stock: ["spiral_wizard_hat", "boot_hat", "pink_boot_hat", "teapot_hat", "fishbowl_hat", "candle_hat", "propeller_cap", "lampshade_hat", "mushroom_cap", "crystal_antlers", "towering_hat",
    "starry_robe", "patchwork_robe", "pyjama_robe", "clashing_robe", "pocket_robe", "stripy_stockings", "polkadot_pantaloons", "curly_slippers", "odd_boots", "starry_cloak", "bedsheet_cape", "feather_boa", "crimson_wizard_hat", "emerald_wizard_hat", "midnight_wizard_hat", "plum_wizard_hat", "ashen_wizard_hat", "golden_wizard_hat"] },
  // Mother Fizzwig's kettle in Bellwhistle: tea, tonic and biscuits.
  fizzing_kettle: { id: "fizzing_kettle", name: "The Fizzing Kettle", buys: ["food"], rate: 0.5, stock: ["lilac_tea", "fizzing_tonic", "starlight_biscuit"] },
  // Gideon Wickerbottom's floating market in Bellwhistle: a stall in the air, selling what a wizard runs out of.
  floating_market: { id: "floating_market", name: "The Floating Market", buys: ["sigil", "magic"], rate: 0.55, stock: ["breeze_sigil", "tide_sigil", "stone_sigil", "ember_sigil", "thought_sigil", "star_sigil", "staff", "tablet_collegium", "glimmer_dust"] },
  // Fennick's curio stall at the Labyrinth's gate: mazeglass only.
  fennicks_curios: { id: "fennicks_curios", name: "Fennick's Curios", currency: "mazeglass", stock: ["prismweave_hood", "prismweave_robe", "prismweave_skirt", "prismweave_gloves", "prismweave_boots", "twisting_staff", "prism_focus", "lilac_tea"] },
  // The Collegium's stores: the sigils its students burn through, tea and a tablet home.
  collegium_stores: { id: "collegium_stores", name: "The Collegium Stores", buys: ["sigil", "magic"], rate: 0.5, stock: ["breeze_sigil", "tide_sigil", "stone_sigil", "ember_sigil", "thought_sigil", "star_sigil", "path_sigil", "staff", "tablet_collegium", "lilac_tea"] },
};

export const PRISM_MONSTERS: Record<string, MonsterDef> = {
  glimmer_moth: { id: "glimmer_moth", name: "Glimmer moth", level: 14, hp: 18, attack: 10, strength: 8, defence: 10, magicDef: 4, attackBonus: 6, defenceBonus: 6, maxHit: 2, speed: 4, respawn: 25, wander: 5, art: 135, ink: "#b89ae0",
    examine: "A moth as broad as your hand, its wings dusted violet. It glows. It would like your lantern.", always: [one("glimmer_dust", 1, 1, 3)], drops: [coins(4, 30, 0.5), one("breeze_sigil", 0.2, 3, 8)] },
  thistle_pixie: { id: "thistle_pixie", name: "Thistle pixie", level: 20, hp: 26, attack: 16, strength: 14, defence: 14, magicDef: 18, attackBonus: 10, defenceBonus: 10, maxHit: 3, speed: 4, respawn: 30, wander: 6, aggressive: true, art: 103, ink: "#e07ac8",
    examine: "A pixie in a thistle-head cap, all elbows and spite. It thinks you're funny. It's going to show you how funny.", always: [], drops: [coins(10, 60, 0.6), one("thought_sigil", 0.15, 2, 6), one("glimmer_dust", 0.4, 1, 2)] },
  prism_wisp: { id: "prism_wisp", name: "Prism wisp", level: 34, hp: 40, attack: 26, strength: 22, defence: 24, magicDef: 30, attackBonus: 16, defenceBonus: 18, maxHit: 5, speed: 4, respawn: 35, wander: 6, aggressive: true, art: 111, ink: "#9a7ae8",
    examine: "A light that drifts between the Starwood's trees, changing colour as it goes. Following it is a bad idea that everyone has once.", always: [], drops: [coins(20, 120, 0.6), one("star_sigil", 0.15, 2, 6), one("glimmer_dust", 0.5, 1, 3)] },
  glimmer_stag: { id: "glimmer_stag", name: "Glimmer stag", level: 40, hp: 70, attack: 32, strength: 36, defence: 34, attackBonus: 18, defenceBonus: 22, maxHit: 7, speed: 5, respawn: 60, wander: 8, art: 178, ink: "#cbb8f0",
    examine: "A white stag with antlers of violet crystal, grazing the purple grass. It's not afraid of you. It doesn't need to be.", always: [one("bones", 1)], drops: [coins(30, 200, 0.6), one("crystal_shard", 0.3, 1, 2)] },
  shard_golem: { id: "shard_golem", name: "Shard golem", level: 72, hp: 130, attack: 58, strength: 62, defence: 70, magicDef: 40, attackBonus: 30, defenceBonus: 50, maxHit: 12, speed: 6, respawn: 70, wander: 3, aggressive: true, size: 2, weakness: "earth", art: 120, ink: "#8a6ae0",
    examine: "A walking heap of violet crystal, as tall as a cottage, with a prism for a heart. The Shardfields grow them, the Collegium says, the way a meadow grows hares.", always: [one("crystal_shard", 1, 2, 4)], drops: [coins(80, 500, 0.8), one("shard_heart", 0.08), one("star_sigil", 0.2, 4, 10)] },
};
