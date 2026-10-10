/**
 * The Land Before Stone: the Orashai way, a tradition you keep like Raria's Law or the Mizukai way.
 *
 * The Orashai are Kharaveth's initiates of the Hidden Sun: they keep the Azhurak glyphs and the first names, and they
 * teach that a thing written truly is a thing done. Kept, the Orashai way puts the Art of the First Script in your
 * spellbook (glyphs written on the air in ochre and lapis ink: Stone, Dust, Sun, Door, Measure, Water, Star, and the
 * First Name) and the Hidden Sun's watchings and rites in place of the Old Friend's prayers. It is given by the Keeper
 * of First Names to those who finish the Orashai Mysteries.
 *
 * Levels and drains mirror the Mizukai way's, so no tradition is the strong one. The glyphs are written with mana (the
 * Orashai's own globe, under Faith) rather than sigils, half the glyph's level a casting, and an Orashai wand or staff in
 * hand writes them for nothing; the strongest want lapis ink besides. The Hidden Sun's rites are paid in faith and ochre ink.
 */
import type { Item, MonsterDef, Prayer, Spell, SpellKind } from "./data.ts";

/** The book kept the Orashai way: glyphs, bindings, doors, offices, roads and the Hidden Sun's rites. */
export const ORASHAI_SPELL_TABS: readonly { id: string; name: string; kinds: readonly SpellKind[] }[] = [
  { id: "combat", name: "Glyphs", kinds: ["strike", "bolt", "blast"] }, { id: "curses", name: "Measures", kinds: ["curse", "bind"] },
  { id: "wards", name: "Doors", kinds: ["ward", "veil"] },
  { id: "utility", name: "Offices", kinds: ["alchemy", "superheat", "grab", "enchant", "bloom", "reveal"] }, { id: "teleports", name: "Roads", kinds: ["teleport"] },
  { id: "faith", name: "Rites", kinds: ["smite", "mend", "aegis", "bless", "pacify"] },
];

export const ORASHAI_SPELLS: readonly Spell[] = [
  { id: "write_stone", name: "Write: Stone", level: 15, xp: 18, sigils: {}, kind: "strike", element: "earth", target: "monster", maxHit: 10, orashai: true, description: "The filled square, written on the air at a foe: a built thing, falling on it (max hit 10)." },
  { id: "write_dust", name: "Write: Dust", level: 25, xp: 24, sigils: {}, kind: "curse", element: "earth", target: "monster", curse: { stat: "defence", amount: 0.1 }, orashai: true, description: "A line broken into dots: what it's written on comes a little apart (−10% defence)." },
  { id: "write_door", name: "Write: Door", level: 30, xp: 34, sigils: { stone_sigil: 1 }, kind: "ward", element: "earth", target: "self", ward: { defence: 0.2, flat: 8, ticks: 100 }, orashai: true, description: "An arch with a gap in it, written round yourself, and you are the gap (+20% defence, +8)." },
  { id: "write_eye", name: "Write: Eye", level: 20, xp: 26, sigils: {}, kind: "reveal", element: "holy", target: "monster", orashai: true, description: "The almond with a point in it, held up: you see what a creature is, and what it is weak to." },
  { id: "write_water", name: "Write: Water", level: 35, xp: 32, sigils: { tide_sigil: 1 }, kind: "bolt", element: "water", target: "monster", maxHit: 18, orashai: true, description: "Three waves stacked, written fast: water out of nowhere, hard (max hit 18)." },
  { id: "write_measure", name: "Write: Measure", level: 40, xp: 36, sigils: { lapis_ink: 1 }, kind: "bind", element: "earth", target: "monster", orashai: true, description: "A bar balanced on a point, written over a foe: it is held in its measure and cannot move." },
  { id: "write_veil", name: "Write: Below", level: 45, xp: 44, sigils: {}, kind: "veil", element: "wind", target: "self", orashai: true, description: "A line with a wedge under it: you are written below notice, and the unwary pass you by." },
  { id: "write_star", name: "Write: Star", level: 60, xp: 50, sigils: { lapis_ink: 1 }, kind: "blast", element: "wind", target: "monster", maxHit: 28, orashai: true, description: "Points scattered round a point: a night's worth of light, at once (max hit 28)." },
  { id: "write_first_name", name: "Write: First Name", level: 70, xp: 60, sigils: { lapis_ink: 2 }, kind: "strike", element: "holy", target: "monster", maxHit: 24, orashai: true, description: "An open ring with the creature's first name in it. Nothing written truly can ignore its name (max hit 24)." },
  { id: "road_to_sefrah", name: "The Road to Sefrah", level: 32, xp: 40, sigils: {}, kind: "teleport", element: "earth", target: "self", teleport: "sefrah", orashai: true, description: "Two lines running together, and the sun: the road to the Gilded City, walked in a breath." },
  { id: "road_to_tamesh", name: "The Road to Tamesh", level: 44, xp: 52, sigils: {}, kind: "teleport", element: "earth", target: "self", teleport: "tamesh", orashai: true, description: "Two lines running together, and stone: the road to the quarry town." },
  { id: "road_below", name: "The Road Below", level: 52, xp: 62, sigils: { lapis_ink: 1 }, kind: "teleport", element: "earth", target: "self", teleport: "foothold", orashai: true, description: "The road and the line with a wedge under it: the old road under the Sunteeth, up the shaft into Foothold." },
  // The Hidden Sun's rites (Faith).
  { id: "rite_of_noon", name: "Rite of Noon", level: 20, xp: 18, sigils: { ochre_ink: 2 }, kind: "smite", element: "holy", target: "monster", skill: "prayer", faith: 2, maxHit: 12, orashai: true, description: "The Hidden Sun stands over a foe for a moment (max hit 12; harder against spirits)." },
  { id: "rite_of_cedar_oil", name: "Rite of Cedar Oil", level: 34, xp: 40, sigils: { ochre_ink: 3 }, kind: "mend", element: "holy", target: "self", skill: "prayer", faith: 4, heal: { now: 14, perTick: 1, ticks: 20 }, orashai: true, description: "The embalmers' oil, for the living: heals 14 at once and more after." },
  { id: "rite_of_the_threshold", name: "Rite of the Threshold", level: 50, xp: 58, sigils: { lapis_ink: 1, ochre_ink: 2 }, kind: "aegis", element: "holy", target: "self", skill: "prayer", faith: 6, ward: { defence: 0.3, reduce: 0.15, ticks: 60 }, orashai: true, description: "You stand in a doorway the Hidden Sun keeps: +30% defence and 15% less damage taken, for a while." },
  { id: "rite_of_the_unnamed", name: "Rite of the Unnamed", level: 58, xp: 54, sigils: { lapis_ink: 2 }, kind: "pacify", element: "holy", target: "monster", skill: "prayer", faith: 4, orashai: true, description: "A name given back to a spirit that lost one. It goes quiet, and wanders off." },
  { id: "rite_of_the_hidden_sun", name: "Rite of the Hidden Sun", level: 76, xp: 62, sigils: { lapis_ink: 3, star_sigil: 2 }, kind: "smite", element: "holy", target: "monster", skill: "prayer", faith: 5, maxHit: 32, orashai: true, description: "The sun that is always there, shown for a heartbeat (max hit 32; harder against spirits)." },
];

/** The Hidden Sun's watchings: kept like prayers, in place of the Old Friend's, while you keep the Orashai way. */
export const ORASHAI_PRAYERS: readonly Prayer[] = [
  { id: "watch_of_dawn", name: "Watching of Dawn", level: 1, drain: 1 / 11, effect: { defence: 0.06 }, description: "+6% Defence", orashai: true },
  { id: "watch_of_the_scribe", name: "Watching of the Scribe", level: 5, drain: 1 / 11, effect: { attack: 0.06 }, description: "+6% Attack", orashai: true },
  { id: "watch_of_the_mason", name: "Watching of the Mason", level: 8, drain: 1 / 11, effect: { strength: 0.06 }, description: "+6% Strength", orashai: true },
  { id: "watch_of_the_ibis", name: "Watching of the Ibis", level: 11, drain: 1 / 11, effect: { magic: 0.06 }, description: "+6% Magic", orashai: true },
  { id: "watch_of_noon", name: "Watching of Noon", level: 14, drain: 1 / 6, effect: { defence: 0.12 }, description: "+12% Defence", orashai: true },
  { id: "salt_on_the_tongue", name: "Salt on the Tongue", level: 20, drain: 1 / 6, effect: { purify: true }, description: "Poison is cured and kept off", orashai: true },
  { id: "watch_of_the_road", name: "Watching of the Road", level: 24, drain: 1 / 8, effect: { journey: true }, description: "Running costs half the energy", orashai: true },
  { id: "watch_of_the_unnamed", name: "Watching of the Unnamed", level: 30, drain: 1 / 4, effect: { spirit: 0.3 }, description: "Wayward spirits strike 30% softer", orashai: true },
  { id: "name_held_fast", name: "Name Held Fast", level: 38, drain: 1 / 3, effect: { protect: true }, description: "Blocks most melee damage", orashai: true },
  { id: "the_weighers_due", name: "The Weigher's Due", level: 48, drain: 1 / 3, effect: { defence: 0.1, magic: 0.12, spirit: 0.15 }, description: "+10% Defence, +12% Magic, and spirits strike 15% softer", orashai: true },
  { id: "the_hidden_sun", name: "The Hidden Sun", level: 60, drain: 2 / 5, effect: { attack: 0.14, strength: 0.14, defence: 0.14 }, description: "+14% Attack, Strength and Defence", orashai: true },
  { id: "first_light", name: "First Light", level: 74, drain: 1 / 2, effect: { attack: 0.12, strength: 0.12, defence: 0.12, magic: 0.12, spirit: 0.2 }, description: "+12% Attack, Strength, Defence and Magic, and spirits strike 20% softer", orashai: true },
];

/**
 * The Orashai's wands and staves: while you wield one, the First Script costs no mana (the Staff of the Hidden Sun has a
 * Faith bonus too, so it is a faith staff as well, and the Hidden Sun's rites cost no faith).
 */
export const ORASHAI_FOCI: ReadonlySet<string> = new Set(["scribes_reed", "lapis_rod", "hidden_sun_staff"]);
export const ORASHAI_GEAR: readonly Item[] = [
  { id: "scribes_reed", name: "Scribe's reed", examine: "A reed pen as long as your forearm, its nib cut for glyphs. Wielded, the First Script costs no mana. Magic 30.", value: 3200,
    icon: { shape: "staff", color: "#c9a878", accent: "#c9703a" }, equip: { slot: "weapon", bonuses: { attack: 2, strength: 1, magic: 14 }, requires: { magic: 30 } } },
  { id: "lapis_rod", name: "Lapis rod", examine: "A rod of lapis banded in gold, the kind the Orashai's teachers carry. Wielded, the First Script costs no mana. Magic 45.", value: 12000,
    icon: { shape: "staff", color: "#2f5f9a", accent: "#d9b866" }, equip: { slot: "weapon", bonuses: { attack: 5, strength: 5, magic: 24 }, requires: { magic: 45 } } },
  { id: "hidden_sun_staff", name: "Staff of the Hidden Sun", examine: "A staff of black wood capped with a gold disc that has an eye in it, given by the Keeper of First Names to the initiated. Wielded, the First Script costs no mana and the Hidden Sun's rites no faith. Magic and Faith 60.", value: 40000,
    icon: { shape: "staff", color: "#2a2730", accent: "#e2c46a" }, equip: { slot: "weapon", bonuses: { attack: 9, strength: 10, magic: 34, prayer: 6 }, requires: { magic: 60, prayer: 60 } } },
];

/** The inks the First Script is written in (the Keeper's scriptorium and the Temple of the Hidden Sun sell them). */
export const ORASHAI_ITEMS: readonly Item[] = [
  { id: "ochre_ink", name: "Ochre ink", examine: "Red-yellow ink in a sealed reed, ground from the Spine's ochre. The First Script's common ink.", value: 12, stackable: true, icon: { shape: "bottle", color: "#c9703a", accent: "#5f4128" } },
  { id: "lapis_ink", name: "Lapis ink", examine: "Blue ink ground from lapis, in a sealed reed. For the glyphs that have to last.", value: 60, stackable: true, icon: { shape: "bottle", color: "#2f5f9a", accent: "#d9b866" } },
];

/** The Orashai's things: the initiation token, the Keeper's ibis head (worn by the Keeper; sold to the initiated), the bag. */
export const ORASHAI_QUEST_ITEMS: readonly Item[] = [
  { id: "orashai_token", name: "Orashai token", examine: "A disc of black stone with an eye in it, warm from Anzah's hand. The door that sees will see it.", value: 0, tradeable: false, icon: { shape: "amulet", color: "#2a2730", accent: "#e2c46a" } },
  { id: "ibis_mask", name: "Ibis mask", examine: "A long-billed ibis head of painted wood, as the Keeper's scribes wear to copy names. You can see out of it, mostly.", value: 2500, icon: { shape: "hat", kind: "ibis", color: "#ece8e0", accent: "#1e1c22" }, equip: { slot: "head", bonuses: { magic: 2 } } },
  { id: "fish_bag", name: "Paper bag (fish)", examine: "A paper bag with eyeholes and a fish drawn on it in charcoal. A god wore one like it. Some questions are better worn than answered.", value: 1, icon: { shape: "hat", kind: "fishbag", color: "#d8c49a", accent: "#2a2730" }, equip: { slot: "head", bonuses: {} } },
];

export const ORASHAI_MONSTERS: Record<string, MonsterDef> = {
  nameless_shade: { id: "nameless_shade", spirit: true, name: "Nameless shade", level: 62, hp: 80, attack: 46, strength: 44, defence: 44, magicDef: 50, attackBonus: 28, defenceBonus: 30, maxHit: 9, speed: 4, respawn: 45, wander: 3, aggressive: true, weakness: "holy", attackStyle: "magic", art: 233, ink: "#9fb4d0",
    examine: "Somebody whose name was scratched out of the Hall, still here, still looking for it. It looks at you as if you might have it.", always: [], drops: [{ item: "coins", min: 30, max: 200, chance: 0.7 }, { item: "azhurak_sherd", min: 1, max: 1, chance: 0.2 }, { item: "lapis_ink", min: 1, max: 3, chance: 0.3 }] },
  the_unnamed: { id: "the_unnamed", spirit: true, name: "The Unnamed", level: 84, hp: 220, attack: 66, strength: 64, defence: 70, magicDef: 70, attackBonus: 44, defenceBonus: 54, maxHit: 15, speed: 5, respawn: 120, wander: 2, aggressive: true, poisonImmune: true, weakness: "holy", attackStyle: "magic", art: 240, ink: "#d8d6e4",
    examine: "Tall, pale, its face an open ring with nothing in it. It was the first thing the Keeper ever named, and the first thing that asked to be unnamed. It has changed its mind.", always: [], drops: [{ item: "coins", min: 200, max: 900, chance: 1 }, { item: "lapis_ink", min: 3, max: 8, chance: 1 }] },
};
