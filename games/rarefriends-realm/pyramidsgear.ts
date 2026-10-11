/**
 * The Land Before Stone: what the two pyramids by Kharaveth's south coast hold, and what keeps them (pyramids.ts).
 *
 * In the Unfinished Pyramid, the builders' dead still haul for a count that will never come out right: tally-bound
 * labourers on the ramps inside, the overseers' shades with their measuring rods, and the grit wraiths, the things that
 * came up out of the stone the day the work stopped. Below it, in the Uncounted Deep, everything the Azhurak meant to
 * keep down by measure walks: the uncounted dead, the ward-scribes who kept the wards and the tally-wraiths who are what
 * is left of the count, gold-eater scarabs in the treasury, measure golems, drowned overseers, and the Uncounted King.
 *
 * In Queen Siruvet's pyramid the measure was made, and her keepers keep their posts rather than walk: linen-bound
 * retainers, lapis guardians, lamp-keepers with their lamps still lit, and in the Measured Vault under it, the Gilded
 * Keeper. Both pyramids are full of what was buried with the people who built them: gold scarabs, electrum armlets,
 * lapis pectorals, cut stones, and coins by the jar.
 */
import type { Drop, IconShape, Item, MonsterDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
const item = (id: string, name: string, examine: string, value: number, shape: IconShape, color: string, accent?: string, extra: Partial<Item> = {}): Item => ({ id, name, examine, value, icon: { shape, color, accent }, ...extra });
const GOLD = "#d9b866", LAPIS = "#2f4f8a", ELECTRUM = "#e2d6a0", CEDAR = "#3a2a22";

/** What was buried with Azhurak's dead, for the dealers in Sefrah and anybody else who buys gold. */
export const PYRAMID_ITEMS: readonly Item[] = [
  item("gold_scarab", "Gold scarab", "A beetle the size of a thumb, cast in gold, its belly cut with a name ring that somebody has carefully scratched out. Azhurak buried them by the handful.", 1800, "gem", GOLD, "#8a6a2a", { stackable: true }),
  item("electrum_armlet", "Electrum armlet", "A band of pale gold and silver for the upper arm, worked with a row of tally strokes all the way round. Too small for any arm you know.", 3200, "ring", ELECTRUM, "#9aa3ad", { stackable: true }),
  item("lapis_pectoral", "Lapis pectoral", "A breast ornament of gold cells set with lapis and carnelian: a disc held up between two hands. Sefrah's dealers stop haggling when they see one.", 5000, "amulet", LAPIS, GOLD, { stackable: true }),
];

/** The bosses' things: the Uncounted King's staff, crown and ring, and Queen Siruvet's collar from her Keeper. */
export const PYRAMID_GEAR: readonly Item[] = [
  { id: "last_stroke_staff", name: "Staff of the Last Stroke", examine: "An overseer's measuring rod of black cedar shod in electrum, a tally cut down its length that stops halfway through a stroke. Pointed at something, it finishes the count.", value: 64000, weight: 1.4,
    icon: { shape: "staff", color: CEDAR, accent: ELECTRUM }, equip: { slot: "weapon", bonuses: { attack: 10, strength: 12, magic: 48 }, speed: 5, staff: true, requires: { magic: 75 } } },
  { id: "uncounted_crown", name: "Crown of the Uncounted", examine: "A crown of beaten gold with three points standing in a bowl, the glyph for a ruler, and an empty name ring on the brow where a name was never cut.", value: 48000, weight: 0.6,
    icon: { shape: "crown", color: GOLD, accent: "#3a3640" }, equip: { slot: "head", bonuses: { defence: 18, magic: 12, prayer: 4 }, requires: { defence: 70, magic: 60 } } },
  { id: "full_count_ring", name: "Ring of the Full Count", examine: "A gold ring cut with a tally that runs all the way round and meets itself, stroke for stroke. Whoever wore it had nothing left owing.", value: 30000, weight: 0,
    icon: { shape: "ring", color: GOLD, accent: LAPIS }, equip: { slot: "ring", bonuses: { attack: 4, strength: 4, magic: 6, prayer: 3 }, requires: { defence: 60 } } },
  { id: "siruvet_collar", name: "Siruvet's collar", examine: "A broad collar of gold and lapis beads strung in rows, a clasp at each shoulder in the shape of a balance. Queen Siruvet was buried in it, and her Keeper kept it.", value: 36000, weight: 0.4,
    icon: { shape: "amulet", color: GOLD, accent: LAPIS }, equip: { slot: "neck", bonuses: { strength: 4, defence: 8, magic: 8, prayer: 4 }, requires: { defence: 60 } } },
];

/** Everything that keeps the pyramids, above and below. */
export const PYRAMID_MONSTERS: Record<string, MonsterDef> = {
  // The Unfinished Pyramid, inside: the builders' dead, the overseers, the things that stopped the work.
  tally_labourer: { id: "tally_labourer", undead: true, poisonImmune: true, name: "Tally-bound labourer", level: 58, hp: 78, attack: 46, strength: 46, defence: 40, attackBonus: 26, defenceBonus: 26, maxHit: 8, speed: 5, respawn: 45, wander: 3, aggressive: true, weakness: "holy", art: 261, ink: "#b8a27e",
    examine: "One of the Unfinished Pyramid's builders, dried to leather and rope, a casing block roped to its back. It's still hauling. The count isn't done, so neither is it.", always: [one("bones", 1)], drops: [coins(40, 240, 0.8), one("azhurak_sherd", 0.08), one("gold_scarab", 0.03)] },
  overseer_shade: { id: "overseer_shade", undead: true, spirit: true, poisonImmune: true, name: "Overseer's shade", level: 66, hp: 82, attack: 54, strength: 48, defence: 44, magicDef: 56, attackBonus: 34, defenceBonus: 30, maxHit: 10, speed: 5, respawn: 50, wander: 3, aggressive: true, attackStyle: "magic", drain: { faith: 2 }, weakness: "holy", art: 262, ink: "#7a6f9a",
    examine: "The shade of an overseer of the works, a measuring rod in its hand, still checking every block against a count that stopped. It doesn't like what it finds, and it blames you.", always: [], drops: [coins(60, 320, 0.9), one("azhurak_sherd", 0.1), one("gold_scarab", 0.05), one("electrum_armlet", 0.01)] },
  grit_wraith: { id: "grit_wraith", spirit: true, poisonImmune: true, name: "Grit wraith", level: 70, hp: 86, attack: 56, strength: 52, defence: 46, magicDef: 58, attackBonus: 36, defenceBonus: 30, maxHit: 11, speed: 4, respawn: 50, wander: 4, aggressive: true, attackStyle: "magic", weakness: "water", art: 263, ink: "#a88a5a",
    examine: "A column of grinding sand with a face in it that keeps coming apart. The builders' tally says what the last stroke was: dust. This is what it meant.", always: [], drops: [coins(60, 300, 0.9), one("gold_scarab", 0.06), one("rough_rosestone", 0.05)] },
  // The Uncounted Deep: everything the Azhurak kept below by measure, walking.
  uncounted_dead: { id: "uncounted_dead", undead: true, poisonImmune: true, name: "Uncounted dead", level: 74, hp: 98, attack: 60, strength: 60, defence: 52, attackBonus: 38, defenceBonus: 36, maxHit: 12, speed: 5, respawn: 50, wander: 3, aggressive: true, weakness: "holy", art: 264, ink: "#cdbf9e",
    examine: "One of the dead the Uncounted Deep was cut to hold, in linen gone the colour of the rock. It was meant to be kept here by measure, and the measure was never made.", always: [one("bones", 1)], drops: [coins(100, 500, 1), one("gold_scarab", 0.08), one("moonstone", 0.06), one("azhurak_sherd", 0.08)] },
  gold_eater: { id: "gold_eater", poisonImmune: true, name: "Gold-eater scarab", level: 78, hp: 104, attack: 58, strength: 62, defence: 70, magicDef: 30, attackBonus: 36, defenceBonus: 56, maxHit: 12, speed: 4, respawn: 50, wander: 4, aggressive: true, weakness: "earth", poison: { damage: 6, chance: 0.25 }, art: 234, ink: "#c9a050",
    examine: "A scarab as big as a shield, its shell the colour of the gold it chews. The deep's treasuries are full of half-eaten things, and these are full of the other half.", always: [], drops: [coins(150, 600, 1), one("gold_scarab", 0.3, 1, 2), one("beetle_shell", 0.4, 1, 2), one("electrum_armlet", 0.02)] },
  ward_scribe: { id: "ward_scribe", undead: true, poisonImmune: true, name: "Ward-scribe", level: 80, hp: 102, attack: 62, strength: 56, defence: 54, magicDef: 70, attackBonus: 40, defenceBonus: 38, maxHit: 13, speed: 5, respawn: 55, wander: 3, aggressive: true, attackStyle: "magic", heals: 6, weakness: "fire", art: 262, ink: "#3f5a8a",
    examine: "A priest-scribe of the wards, a reed pen in one hand, writing a ward on the air that never finishes. It mends itself with half-written signs when it's hurt.", always: [one("bones", 1)], drops: [coins(120, 560, 1), one("star_sigil", 0.4, 6, 14), one("sagestone", 0.06), one("lapis_pectoral", 0.01)] },
  drowned_overseer: { id: "drowned_overseer", undead: true, poisonImmune: true, name: "Drowned overseer", level: 82, hp: 108, attack: 62, strength: 60, defence: 56, magicDef: 66, attackBonus: 40, defenceBonus: 40, maxHit: 13, speed: 5, respawn: 55, wander: 3, aggressive: true, attackStyle: "magic", weakness: "fire", art: 262, ink: "#3f6a6a",
    examine: "An overseer who went down to measure the water in the deep and stayed to keep measuring it. Water runs out of its sleeves when it lifts its rod.", always: [one("bones", 1)], drops: [coins(140, 600, 1), one("moonstone", 0.1, 1, 2), one("gold_scarab", 0.08), one("electrum_armlet", 0.02)] },
  tally_wraith: { id: "tally_wraith", undead: true, spirit: true, poisonImmune: true, name: "Tally-wraith", level: 84, hp: 112, attack: 64, strength: 60, defence: 54, magicDef: 72, attackBonus: 42, defenceBonus: 38, maxHit: 14, speed: 4, respawn: 60, wander: 4, aggressive: true, attackStyle: "magic", drain: { faith: 3 }, weakness: "holy", art: 263, ink: "#d8d2c0",
    examine: "A pale thing wound in strokes of light, a tally that came loose from the walls. Every hit it lands takes a stroke of your faith to add to itself.", always: [], drops: [coins(160, 640, 1), one("rosestone", 0.04), one("gold_scarab", 0.1), one("full_count_ring", 0.002)] },
  measure_golem: { id: "measure_golem", poisonImmune: true, name: "Measure golem", level: 86, hp: 150, attack: 62, strength: 70, defence: 72, magicDef: 40, attackBonus: 40, defenceBonus: 60, maxHit: 15, speed: 6, respawn: 70, wander: 2, aggressive: true, enrage: true, weakness: "water", art: 244, ink: "#a8865a",
    examine: "A balance of sandstone the height of two people, a beam across its shoulders and a pan at each end of it. It weighs what comes into the treasury, and you come up short.", always: [], drops: [coins(200, 800, 1), one("rarite_bar", 0.1, 1, 2), one("electrum_armlet", 0.04), one("lapis_pectoral", 0.015)] },
  uncounted_king: { id: "uncounted_king", undead: true, poisonImmune: true, boss: true, name: "The Uncounted King", level: 108, hp: 460, attack: 84, strength: 80, defence: 76, magicDef: 84, attackBonus: 56, defenceBonus: 60, maxHit: 20, speed: 5, respawn: 220, wander: 1, aggressive: true, size: 2,
    attackStyle: "magic", enrage: true, heals: 10, drain: { faith: 4 }, weakness: "holy", art: 265, ink: "#c9a050",
    examine: "The king the Unfinished Pyramid was for, crowned, robed, and taller than his own door. His name ring is empty: a name is cut when the count is done, and his never was. He has been counting ever since.",
    always: [one("large_bones", 1)], drops: [coins(1500, 4000, 1), one("gold_scarab", 0.7, 1, 3), one("lapis_pectoral", 0.3), one("rosestone", 0.4, 1, 2), one("last_stroke_staff", 0.025), one("uncounted_crown", 0.02), one("full_count_ring", 0.03)] },
  // Queen Siruvet's pyramid and the Measured Vault: keepers that keep their posts.
  linen_retainer: { id: "linen_retainer", undead: true, poisonImmune: true, name: "Linen-bound retainer", level: 62, hp: 84, attack: 50, strength: 50, defence: 44, attackBonus: 30, defenceBonus: 30, maxHit: 9, speed: 5, respawn: 45, wander: 2, aggressive: true, weakness: "fire", art: 264, ink: "#e6dcc6",
    examine: "One of Queen Siruvet's household, wrapped in good linen and buried with her to go on serving. It serves by keeping you out of the rooms it was told to keep.", always: [one("bones", 1)], drops: [coins(60, 300, 0.9), one("gold_scarab", 0.04), one("moonstone", 0.04)] },
  lapis_guardian: { id: "lapis_guardian", poisonImmune: true, name: "Lapis guardian", level: 68, hp: 100, attack: 54, strength: 56, defence: 60, magicDef: 36, attackBonus: 34, defenceBonus: 46, maxHit: 10, speed: 5, respawn: 50, wander: 2, aggressive: true, weakness: "earth", art: 236, ink: "#2f4f8a",
    examine: "A guardian of blue stone flecked with gold, a staff of bronze across its chest. It stands where it was put, and it will stand there after you've gone, one way or another.", always: [], drops: [coins(80, 360, 1), one("azhurak_sherd", 0.1), one("sagestone", 0.04), one("gold_scarab", 0.04)] },
  lamp_keeper: { id: "lamp_keeper", spirit: true, poisonImmune: true, name: "Lamp-keeper", level: 72, hp: 88, attack: 56, strength: 50, defence: 48, magicDef: 62, attackBonus: 38, defenceBonus: 32, maxHit: 11, speed: 5, respawn: 50, wander: 3, aggressive: true, attackStyle: "magic", weakness: "water", art: 267, ink: "#e8b860",
    examine: "A keeper of the queen's lamps, a lamp held up in both hands, still lit. It throws the flame at whatever the queen wouldn't have wanted in her rooms.", always: [], drops: [coins(80, 380, 1), one("rough_rosestone", 0.06), one("gold_scarab", 0.05), one("electrum_armlet", 0.01)] },
  gilded_keeper: { id: "gilded_keeper", poisonImmune: true, boss: true, name: "The Gilded Keeper", level: 92, hp: 340, attack: 72, strength: 74, defence: 74, magicDef: 60, attackBonus: 48, defenceBonus: 56, maxHit: 16, speed: 5, respawn: 180, wander: 1, aggressive: true, size: 2, enrage: true, weakness: "earth", art: 266, ink: "#d9b866",
    examine: "Queen Siruvet's Keeper, gold over basalt, a balance in one hand and a flail in the other. Her measure was made and her pyramid finished, so it doesn't walk: it waits, by her hoard, for whatever comes short.",
    always: [one("large_bones", 1)], drops: [coins(800, 2500, 1), one("gold_scarab", 0.6, 1, 2), one("electrum_armlet", 0.3), one("sagestone", 0.4, 1, 2), one("siruvet_collar", 0.03)] },
};
