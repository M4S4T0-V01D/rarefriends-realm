/**
 * Return of Raria: the two powers of the far west and everything they carry.
 *
 * The Free Friends Federation (FFF) holds the Free Marches south-west of Westmarch from the FFF Fortress: wizards,
 * knights, rangers and artisans who answer to nobody and build everything themselves. Their gear is copper and
 * verdigris, patched, experimental and very good.
 *
 * The Kingdom of Raria holds the land beyond the Drakespine, its walled city round the palace of Queen Rara, Keeper of
 * the Wise Friend's Law. The Rare Realm Regiment (RRR) is its army, the Raria Royal Rangers the royal family's own
 * guard, and the Order of Dusk its faith's knights. Rarian gear is dusk violet, ivory and silver: formal, uniform,
 * blessed and watched.
 *
 * Between them, in Deep Westmarch and BarkReach, the border war; and in Ashfall, the Burned: the dead villagers of
 * every build the Realm has, walking in faded red, the Order of the Ember's reason for being there.
 */
import type { Bonuses, Drop, EquipSlot, IconShape, Item, MonsterDef, Skill } from "./data.ts";

export const FFF = { name: "The Free Friends Federation", short: "FFF", color: "#2f7d68", accent: "#d9a93f", copper: "#b87333", verdigris: "#4fa58a", dark: "#1d4f42" } as const;
export const RARIA = { name: "The Kingdom of Raria", short: "Raria", color: "#3b2a52", accent: "#d8d6e4", ivory: "#efe6c8", gold: "#c9a84a", wine: "#4a2b3a", steel: "#9ea3ad", dusk: "#2a2238", duskLight: "#8a6ab0" } as const;
/** Friendhollow's kingdom, named at last: the crown King Hollis wears. */
export const HOLLOWMERE = { name: "The Kingdom of Hollowmere", short: "Hollowmere", color: "#8a2f2b", accent: "#e2c46a" } as const;

type GearDef = { id: string; name: string; slot: EquipSlot; shape: IconShape; kind?: string; color: string; accent?: string; bonuses: Partial<Bonuses>; requires?: Partial<Record<Skill, number>>;
  value: number; weight?: number; speed?: number; two?: boolean; staff?: boolean; bow?: { range: number; strength?: number; bolts?: boolean }; holy?: boolean; examine: string; ammo?: { strength: number; level: number; bolt?: boolean }; tradeable?: boolean };
const gear = (def: GearDef): Item => ({
  id: def.id, name: def.name, examine: def.examine, value: def.value, weight: def.weight, icon: { shape: def.shape, color: def.color, accent: def.accent, kind: def.kind },
  ...(def.tradeable === false ? { tradeable: false } : {}), ...(def.ammo ? { stackable: true, ammo: def.ammo } : {}),
  ...(def.ammo ? {} : { equip: { slot: def.slot, bonuses: def.bonuses, requires: def.requires, ...(def.speed ? { speed: def.speed } : {}), ...(def.two ? { twoHanded: true } : {}), ...(def.staff ? { staff: true } : {}), ...(def.bow ? { bow: def.bow } : {}), ...(def.holy ? { holy: true } : {}) } }),
});

// ---------- The Federation's gear: copper and verdigris, every combat style, and the capes that say FFF ----------
const F = FFF.copper, FV = FFF.verdigris, FB = FFF.accent;
const fff = (id: string, name: string, slot: EquipSlot, shape: IconShape, bonuses: Partial<Bonuses>, requires: Partial<Record<Skill, number>>, value: number, examine: string, extra: Partial<GearDef> = {}): GearDef =>
  ({ id: `fff_${id}`, name: `FFF ${name}`, slot, shape, color: extra.color ?? F, accent: extra.accent ?? FV, bonuses, requires, value, examine, ...extra });
export const FFF_GEAR: readonly GearDef[] = [
  // Melee: Federation steel, copper-washed, hammered by artisans who argue about every rivet.
  fff("sword", "sword", "weapon", "sword", { attack: 46, strength: 42 }, { attack: 50 }, 6400, "A Federation sword: copper-washed steel, a verdigris guard, and a maker's mark on the ricasso (a different one on every blade).", { speed: 4, weight: 2 }),
  fff("greatsword", "greatsword", "weapon", "greatsword", { attack: 64, strength: 70 }, { attack: 50, strength: 50 }, 12000, "Two hands, a copper blade as long as a ranger is tall, and a counterweight that somebody insisted was also a hammer.", { speed: 6, two: true, weight: 8 }),
  fff("glaive", "glaive", "weapon", "spear", { attack: 58, strength: 60 }, { attack: 50 }, 10000, "A glaive: a long haft and a curved copper blade. The Federation's knights fight in a line with these and call it 'the argument'.", { speed: 5, two: true, weight: 6, kind: "glaive" }),
  fff("mace", "mace", "weapon", "mace", { attack: 44, strength: 46 }, { attack: 50 }, 6000, "A copper-headed mace with verdigris flanges. Heavier than it looks, like most Federation things.", { speed: 4, weight: 3 }),
  fff("tower_shield", "tower shield", "shield", "aegis", { defence: 40 }, { defence: 50 }, 7200, "A tall copper shield with FFF hammered across the face in letters a hand high. Subtle it is not.", { weight: 6, accent: FB }),
  fff("heater", "heater shield", "shield", "shield", { defence: 30, attack: 1 }, { defence: 50 }, 5200, "A Federation heater shield, copper on steel, the three Fs picked out in brass.", { weight: 4, accent: FB }),
  fff("helm", "helm", "head", "helm", { defence: 22 }, { defence: 50 }, 4800, "A copper-washed helm with a verdigris crest. The visor was added by a knight who kept losing bets.", { weight: 2 }),
  fff("cuirass", "cuirass", "body", "body", { defence: 58 }, { defence: 50 }, 14000, "Federation plate: copper over steel, riveted by artisans, with a small engraved cannon on the breast for luck.", { weight: 7, kind: "plate" }),
  fff("greaves", "greaves", "legs", "legs", { defence: 34 }, { defence: 50 }, 8000, "Copper-washed greaves, verdigris at the knee.", { weight: 4 }),
  fff("gauntlets", "gauntlets", "hands", "gloves", { defence: 10, attack: 2 }, { defence: 50 }, 3200, "Articulated copper gauntlets. Every finger moves; two of them whir.", { weight: 1 }),
  fff("boots", "sabatons", "feet", "boots", { defence: 10 }, { defence: 50 }, 3200, "Copper sabatons with sprung heels. A ranger's idea.", { weight: 1 }),
  // Ranged: the Rangers' Yard, where every bow is a little different and every arrow is tested on the quartermaster's door.
  fff("longbow", "longbow", "weapon", "warbow", { ranged: 74 }, { ranged: 50 }, 9600, "A Federation longbow laminated from three woods and a strip of copper. It draws like an argument and lands like the end of one.", { speed: 5, two: true, bow: { range: 8, strength: 34 }, weight: 2, color: "#8a5a3c", accent: FV }),
  fff("repeater", "repeater crossbow", "weapon", "crossbow", { ranged: 66 }, { ranged: 50 }, 11000, "A Federation repeater: a copper box magazine drops a bolt into the groove on every draw. Faster than any other crossbow, and it only jams on Tuesdays.", { speed: 4, bow: { range: 7, strength: 28, bolts: true }, weight: 4, color: "#8a5a3c", accent: F }),
  fff("ranger_hood", "ranger's hood", "head", "hood", { ranged: 8, defence: 10 }, { ranged: 50 }, 3600, "A verdigris-green hood with a copper clasp. Rangers wear it up in the trees and down in the taverns.", { weight: 1, color: FV, accent: F }),
  fff("ranger_jerkin", "ranger's jerkin", "body", "body", { ranged: 18, defence: 24 }, { ranged: 50 }, 9000, "A green leather jerkin plated with copper scales where it counts.", { weight: 3, kind: "tunic", color: FV, accent: F }),
  fff("ranger_chaps", "ranger's chaps", "legs", "legs", { ranged: 12, defence: 16 }, { ranged: 50 }, 6000, "Green leather chaps, copper at the knee.", { weight: 2, color: FV, accent: F }),
  fff("ranger_bracers", "ranger's bracers", "hands", "bracer", { ranged: 7, defence: 4 }, { ranged: 50 }, 3000, "Copper-studded bracers. The left one has a tiny compass in it that points at the fortress.", { weight: 1, color: FV, accent: F }),
  fff("broadheads", "broadhead arrows", "weapon", "arrow", {}, {}, 60, "Federation broadheads: copper-tipped, a verdigris band on the shaft. They go through things.", { ammo: { strength: 46, level: 50 }, color: F, accent: FV }),
  fff("bolts", "bolts", "weapon", "bolts", {}, {}, 80, "Copper-headed bolts for the repeater, or any crossbow.", { ammo: { strength: 56, level: 50, bolt: true }, color: F, accent: FV }),
  // Magic: the Wizard Tower's robes, which are reinforced, because Federation wizards stand in the front line out of principle.
  fff("wizard_robe", "wizard's robe", "body", "body", { magic: 15, defence: 6 }, { magic: 50 }, 7000, "A verdigris robe with copper thread at the seams, cut for running. Federation wizards run towards things.", { weight: 1, kind: "robe", color: FV, accent: F }),
  fff("reinforced_robe", "reinforced robe", "body", "body", { magic: 10, defence: 26 }, { magic: 50, defence: 40 }, 9000, "A wizard's robe with copper plates sewn into the lining. Heavier, safer, and still a robe.", { weight: 3, kind: "robe", color: FV, accent: F }),
  fff("battle_robe", "battle robe", "body", "body", { magic: 12, defence: 18, strength: 4 }, { magic: 50, attack: 40 }, 9500, "A short robe over mail, for wizards who finish arguments with a mace.", { weight: 3, kind: "robe", color: "#1d4f42", accent: F }),
  fff("mage_coat", "mage coat", "body", "body", { magic: 16, defence: 10, ranged: 4 }, { magic: 50 }, 8800, "A long copper-buttoned coat with eleven pockets, nine of them for sigils and two for bread.", { weight: 2, kind: "shirt", color: "#2f7d68", accent: F }),
  fff("wizard_hat", "wizard's hat", "head", "hat", { magic: 7 }, { magic: 50 }, 3600, "A tall verdigris hat, the point bent where its owner walked into the laboratory lintel.", { weight: 1, color: FV, accent: F }),
  fff("hood", "wizard's hood", "head", "hood", { magic: 5, defence: 7 }, { magic: 50 }, 3400, "A copper-clasped hood for wizards who dislike hats.", { weight: 1, color: "#1d4f42", accent: F }),
  fff("spellward", "spellward", "shield", "shield", { magic: 10, defence: 14 }, { magic: 50 }, 6400, "A small copper shield etched with a ward that hums. It turns spells a little and arguments entirely.", { weight: 2, accent: FB, kind: "glow" }),
  fff("arcane_shield", "arcane shield", "shield", "roundshield", { magic: 6, defence: 24 }, { magic: 50, defence: 40 }, 7200, "A round copper shield with a verdigris glyph that was definitely drawn freehand.", { weight: 3, accent: FB }),
  fff("staff", "staff", "weapon", "staff", { attack: 4, strength: 4, magic: 19 }, { magic: 50 }, 9000, "A copper-shod staff with a verdigris crystal that the Tower grew in a jar. It casts true and it opens bottles.", { speed: 5, staff: true, weight: 2, accent: FV }),
  fff("wand", "wand", "weapon", "staff", { magic: 15 }, { magic: 50 }, 7000, "A short copper wand, one-handed: a staff for autocasting, with room for a shield or a spellbook in the other hand.", { speed: 4, staff: true, weight: 1, kind: "wand", accent: FV }),
  fff("spellbook", "spellbook", "shield", "scroll", { magic: 12, prayer: 2 }, { magic: 50 }, 6000, "A Federation spellbook, copper-bound, held in the off hand. Half the margins are corrections in red ink.", { weight: 2, color: "#1d4f42", accent: F }),
  fff("cape_magical", "cape of the Tower", "cape", "cape", { magic: 4, defence: 4 }, { magic: 50 }, 5000, "A verdigris cape with FFF in brass across the back and a copper hem that crackles in the rain.", { weight: 1, kind: "fff", color: FV, accent: FB }),
  fff("device_pack", "device pack", "cape", "satchel", { magic: 3, defence: 3 }, { magic: 40 }, 4000, "A copper back-pack of Federation devices, four of them running. Nobody is sure what two of them do.", { weight: 3, accent: FV }),
  fff("tinker_ring", "tinker's ring", "ring", "ring", { magic: 3, attack: 2 }, { magic: 40 }, 4200, "A copper ring with a tiny verdigris gear that turns when you cast.", { accent: FV }),
  fff("focus_amulet", "focus amulet", "neck", "amulet", { magic: 6 }, { magic: 50 }, 5600, "A copper amulet with a verdigris lens. Look through it and spells look slightly embarrassed.", { accent: FV }),
  // Hybrids: the Federation does not believe in choosing.
  fff("warcaster_plate", "warcaster plate", "body", "body", { defence: 44, magic: 8 }, { defence: 50, magic: 50 }, 13000, "Plate for a wizard: copper over steel with a verdigris casting-channel down the breast. The Tower and the forge built it together, once, and still argue about it.", { weight: 6, kind: "plate" }),
  fff("skirmisher_jerkin", "skirmisher's jerkin", "body", "body", { defence: 30, ranged: 12, attack: 4 }, { defence: 45, ranged: 45 }, 9800, "A ranger's jerkin with a knight's shoulders: for people who shoot, then close.", { weight: 3, kind: "tunic", color: FV, accent: F }),
  fff("arcane_bow", "arcane bow", "weapon", "bow", { ranged: 62, magic: 10 }, { ranged: 50, magic: 50 }, 12000, "A copper-limbed bow with a verdigris crystal at the grip: it draws on sigils as well as arrows, and the Tower insists it is not a staff.", { speed: 4, two: true, bow: { range: 8, strength: 20 }, weight: 2, color: "#8a5a3c", accent: FV }),
  // The capes, which say FFF, because they do.
  fff("cape_wizard", "wizard's cape", "cape", "cape", { magic: 3 }, { magic: 30 }, 2600, "A verdigris cape, FFF in brass across the back. The wizards' cut, with a hood that nobody uses.", { weight: 1, kind: "fff", color: FV, accent: FB }),
  fff("cape_knight", "knight's cape", "cape", "cape", { defence: 4 }, { defence: 30 }, 2600, "A copper-red cape, FFF in brass across the back. The knights' cut, short enough to swing a glaive under.", { weight: 1, kind: "fff", color: F, accent: FB }),
  fff("cape_ranger", "ranger's cape", "cape", "cape", { ranged: 3 }, { ranged: 30 }, 2600, "A dark green cape, FFF in brass across the back. The rangers' cut, mottled for the trees.", { weight: 1, kind: "fff", color: "#1d4f42", accent: FB }),
  fff("cape_artisan", "artisan's cape", "cape", "cape", { defence: 1 }, {}, 2000, "A leather-brown cape, FFF in brass across the back, with a loop for a hammer. The artisans' cut.", { weight: 1, kind: "fff", color: "#6b4a2c", accent: FB }),
  fff("cape_elite", "elite cape", "cape", "cape", { attack: 2, defence: 3, ranged: 2, magic: 2 }, {}, 20000, "A black cape with FFF in bright brass across the back: Fellow Free's own gift, given to those the Federation calls its own.", { weight: 1, kind: "fff", color: "#1b1b1b", accent: FB, tradeable: false }),
  fff("cape_ceremonial", "ceremonial cape", "cape", "cape", { prayer: 3 }, {}, 8000, "A white cape with FFF in brass, worn for the Federation's few ceremonies (a cannon's first firing, mostly).", { weight: 1, kind: "fff", color: "#efede7", accent: FB }),
  // Artisans: what the workshops wear.
  fff("goggles", "artisan's goggles", "head", "mask", { defence: 2 }, {}, 1200, "Copper goggles with verdigris lenses, pushed up on the brow. Worn down, everything looks slightly green and extremely well made.", { weight: 1, accent: FV }),
  fff("apron", "artisan's apron", "body", "body", { defence: 4 }, {}, 1400, "A scorched leather apron with FFF burnt into it by somebody who was testing the brand.", { weight: 1, kind: "tunic", color: "#6b4a2c", accent: FB }),
  fff("tinker_hammer", "tinker's hammer", "weapon", "hammer", { attack: 30, strength: 30 }, { attack: 40 }, 3600, "A copper-headed hammer that is also a weapon, a lever and, with the cap off, a flask.", { speed: 4, weight: 2, accent: FV }),
];

// ---------- Raria's gear: dusk violet, ivory, silver; the Regiment's plate, the Rangers' leathers, the Wise Friend's vestments ----------
const RV = RARIA.color, RI = RARIA.ivory, RS = RARIA.steel, RG = RARIA.gold, RW = RARIA.wine;
const rar = (id: string, name: string, slot: EquipSlot, shape: IconShape, bonuses: Partial<Bonuses>, requires: Partial<Record<Skill, number>>, value: number, examine: string, extra: Partial<GearDef> = {}): GearDef =>
  ({ id, name, slot, shape, color: extra.color ?? RS, accent: extra.accent ?? RV, bonuses, requires, value, examine, ...extra });
export const RARIA_GEAR: readonly GearDef[] = [
  // The Rare Realm Regiment's plate: grey steel, violet enamel, the Wise Friend's eye on the breast. Uniform to the rivet.
  rar("rrr_helm", "RRR helm", "head", "helm", { defence: 24, prayer: 1 }, { defence: 55 }, 5200, "A Regiment helm: grey steel, a violet plume socket, the regimental number stamped inside. They are all the same, and that is the point.", { weight: 2 }),
  rar("rrr_cuirass", "RRR cuirass", "body", "body", { defence: 62, prayer: 1 }, { defence: 55 }, 15000, "Regiment plate with the Wise Friend's closed eye enamelled in violet on the breast. Inspected weekly.", { weight: 7, kind: "plate" }),
  rar("rrr_greaves", "RRR greaves", "legs", "legs", { defence: 36 }, { defence: 55 }, 8600, "Regiment greaves, grey steel, violet at the knee.", { weight: 4 }),
  rar("rrr_gauntlets", "RRR gauntlets", "hands", "gloves", { defence: 11, attack: 2 }, { defence: 55 }, 3400, "Regiment gauntlets. The left one has the oath engraved inside the cuff.", { weight: 1 }),
  rar("rrr_boots", "RRR sabatons", "feet", "boots", { defence: 11 }, { defence: 55 }, 3400, "Regiment sabatons, made for marching in step.", { weight: 1 }),
  rar("rrr_heater", "RRR heater shield", "shield", "shield", { defence: 40, prayer: 1 }, { defence: 55 }, 7600, "A Regiment heater shield: violet field, silver chief, the Wise Friend's closed eye. Every shield in a line matches the next.", { weight: 4, color: RV, accent: RS }),
  rar("rrr_banner", "RRR banner", "cape", "cape", { defence: 2, strength: 2, prayer: 1 }, {}, 4800, "A Regiment banner worn on the back: RRR in silver on dusk violet, the eye above. Carried by the file leader, and by anyone the Regiment has used.", { weight: 1, kind: "rrr", color: RV, accent: RS }),
  // Rarian steel: blessed in the palace chapel before issue, so it counts as a faith arm.
  rar("rarian_sword", "Rarian sword", "weapon", "sword", { attack: 48, strength: 44, prayer: 1 }, { attack: 55 }, 7000, "A straight Rarian sword with a violet grip and a line of the Law etched down the fuller. Blessed before issue.", { speed: 4, weight: 2, holy: true }),
  rar("rarian_greatsword", "Rarian greatsword", "weapon", "greatsword", { attack: 66, strength: 72, prayer: 2 }, { attack: 55, strength: 55 }, 13000, "A Regiment greatsword, two-handed, the Wise Friend's eye in the pommel. Blessed, and heavy with it.", { speed: 6, two: true, weight: 8, holy: true }),
  rar("rarian_spear", "Rarian spear", "weapon", "spear", { attack: 56, strength: 56, prayer: 1 }, { attack: 55 }, 9000, "A Regiment spear with a violet tassel below the head. The Regiment fights in three ranks of these.", { speed: 5, two: true, weight: 5, holy: true }),
  rar("rarian_halberd", "Rarian halberd", "weapon", "spear", { attack: 62, strength: 66, prayer: 1 }, { attack: 55, strength: 50 }, 11000, "A halberd of Rarian steel: axe, spike and hook on a dusk-stained haft. The checkpoint weapon.", { speed: 6, two: true, weight: 7, holy: true, kind: "halberd" }),
  rar("rarian_dagger", "Rarian dagger", "weapon", "dagger", { attack: 36, strength: 30 }, { attack: 55 }, 3800, "A slim dagger with a violet grip, issued to officials who are not supposed to need it.", { speed: 3, weight: 1 }),
  rar("rarian_mace", "Rarian mace", "weapon", "mace", { attack: 46, strength: 48, prayer: 3 }, { attack: 55, prayer: 30 }, 7800, "A mace of the Wise Friend's chapels: a closed eye on every flange. Blessed; the undead dislike it.", { speed: 4, weight: 3, holy: true }),
  rar("rarian_crossbow", "Rarian crossbow", "weapon", "crossbow", { ranged: 62 }, { ranged: 55 }, 9600, "A Regiment crossbow, grey steel limbs on a violet stock, wound with a crank. Fires bolts.", { speed: 5, bow: { range: 7, strength: 32, bolts: true }, weight: 4, color: RV, accent: RS }),
  rar("rarian_bow", "Rarian bow", "weapon", "bow", { ranged: 58 }, { ranged: 55 }, 7200, "A Regiment archer's bow, dusk-stained, with the eye burnt into the grip.", { speed: 4, two: true, bow: { range: 7 }, weight: 2, color: "#4a3560", accent: RS }),
  rar("rarian_staff", "Rarian staff of the Law", "weapon", "staff", { attack: 4, strength: 4, magic: 16, prayer: 4 }, { magic: 55 }, 9600, "A silver-shod staff with a violet stone carved as a closed eye. Rarian magic is a rite with a staff in it.", { speed: 5, staff: true, weight: 2, holy: true, accent: RARIA.duskLight }),
  // The Raria Royal Rangers' leathers: not sold anywhere. Taken from a Ranger, or given by the Crown.
  rar("ranger_royal_hood", "Royal Ranger's hood", "head", "hood", { ranged: 12, defence: 14 }, { ranged: 70, defence: 60 }, 20000, "A dusk-violet hood with a silver edge. The Royal Rangers wear it low; you never see their eyes.", { weight: 1, color: RV, accent: RS, tradeable: false }),
  rar("ranger_royal_coat", "Royal Ranger's coat", "body", "body", { ranged: 24, defence: 32 }, { ranged: 70, defence: 60 }, 48000, "A long violet coat over silver mail: a Royal Ranger's. There is a pocket for a writ of execution. It is empty.", { weight: 3, kind: "shirt", color: RV, accent: RS, tradeable: false }),
  rar("ranger_royal_leggings", "Royal Ranger's leggings", "legs", "legs", { ranged: 16, defence: 20 }, { ranged: 70, defence: 60 }, 30000, "Violet leather leggings, silver at the seams, soled for rooftops.", { weight: 2, color: RV, accent: RS, tradeable: false }),
  rar("rangers_longbow", "Royal Rangers' longbow", "weapon", "warbow", { ranged: 88 }, { ranged: 70 }, 60000, "The Royal Rangers' bow: dusk-black, silver-tipped, and nine tiles is not far enough to be safe from it.", { speed: 5, two: true, bow: { range: 9, strength: 44 }, weight: 2, color: "#2a2238", accent: RS, tradeable: false }),
  // The Wise Friend's vestments: faith armour for the chapels of Raria.
  rar("wise_cowl", "Wise Friend's cowl", "head", "hood", { prayer: 4, defence: 6 }, { prayer: 30 }, 2400, "An ivory cowl with a violet band: the Wise Friend's, worn by the faithful of Raria.", { weight: 1, color: RI, accent: RV }),
  rar("wise_vestment", "Wise Friend's vestment", "body", "body", { prayer: 6, defence: 14 }, { prayer: 30 }, 6000, "Ivory vestments embroidered with the closed eye in violet. Clean. Always clean.", { weight: 2, kind: "robe", color: RI, accent: RV }),
  rar("wise_skirts", "Wise Friend's skirts", "legs", "legs", { prayer: 4, defence: 10 }, { prayer: 30 }, 4000, "Ivory skirts with a violet hem, cut to kneel in.", { weight: 2, color: RI, accent: RV }),
  rar("wise_sandals", "Wise Friend's sandals", "feet", "boots", { prayer: 2, defence: 3 }, { prayer: 30 }, 1200, "Ivory sandals. The chapel floors of Raria are polished every dawn.", { weight: 1, color: RI, accent: RV }),
  rar("wise_pavise", "Wise Friend's pavise", "shield", "aegis", { defence: 32, prayer: 5 }, { defence: 40, prayer: 30 }, 6400, "A tall ivory pavise with the closed eye in violet and the first line of the Law beneath it: OBEY, AND BE WISE.", { weight: 5, color: RI, accent: RV }),
  rar("royal_kite", "Royal kite shield", "shield", "shield", { defence: 44, prayer: 2 }, { defence: 60 }, 24000, "A kite shield in the Crown's ivory and gold, Queen Rara's crowned eye on the field. Given, never sold.", { weight: 4, color: RI, accent: RG, tradeable: false }),
  rar("royal_circlet", "Royal circlet", "head", "crown", { defence: 4, prayer: 3, magic: 2 }, { prayer: 40 }, 18000, "A slim gold circlet in the Rarian style. Worn by the royal household, and by whoever the Queen has chosen to be seen with.", { weight: 1, color: RG, accent: RI, tradeable: false }),
  // Back items: banners, books and scrolls, which Raria wears the way other places wear capes.
  rar("faith_banner", "Faith banner", "cape", "cape", { prayer: 3, defence: 1 }, { prayer: 30 }, 4400, "An ivory banner worn on the back, the closed eye in violet. The chapels' processions carry a hundred of these.", { weight: 1, kind: "eye", color: RI, accent: RV }),
  rar("ritual_scroll_case", "Ritual scroll case", "cape", "satchel", { prayer: 2, magic: 2 }, { prayer: 30 }, 3600, "A violet leather case of ritual scrolls, worn on the back. The rites of the Wise Friend, in order, in full.", { weight: 2, color: RV, accent: RS }),
  rar("sigil_frame", "Sigil frame", "cape", "tablet", { magic: 3, prayer: 2 }, { magic: 40 }, 4000, "A silver frame of Rarian sigils worn between the shoulders. It clicks softly when a rite is cast.", { weight: 2, color: RS, accent: RARIA.duskLight }),
  rar("ceremonial_standard", "Ceremonial standard", "cape", "cape", { prayer: 4, defence: 2 }, { prayer: 40 }, 9000, "The Crown's ceremonial standard, ivory and gold, the crowned eye in the centre. Worn by the palace guard at audiences.", { weight: 2, kind: "eye", color: RI, accent: RG }),
  rar("law_book", "Book of the Law", "cape", "scroll", { prayer: 3, magic: 1 }, { prayer: 20 }, 3000, "The Wise Friend's Law in a violet binding, worn on a strap across the back. Every Rarian owns one; most can quote it.", { weight: 1, color: RV, accent: RS }),
];

// ---------- Things of the west that are not armour: wood, antler, tokens and the papers quests turn on ----------
export const WEST_ITEMS: Item[] = [
  { id: "redwood_logs", name: "Redwood logs", examine: "Red-hearted logs from BarkReach's redwoods. They smell of resin and rain.", value: 520, icon: { shape: "log", color: "#8a3a2a", accent: "#5a2a1e" } },
  { id: "ironbark_logs", name: "Ironbark logs", examine: "Grey, dense logs of BarkReach ironbark. An axe bounces off a standing one.", value: 900, icon: { shape: "log", color: "#6d6b67", accent: "#4a4846" } },
  { id: "stag_antler", name: "Greatstag antler", examine: "A branch of greatstag antler from BarkReach. Fletchers tip arrows with it; the Federation makes other things.", value: 140, icon: { shape: "material", color: "#d8cfb6", accent: "#8a7a62" } },
  { id: "broadhead_arrow", name: "Broadhead arrows", examine: "BarkReach hunters' arrows: antler-tipped, redwood-shafted, for the greatstags.", value: 40, stackable: true, icon: { shape: "arrow", color: "#8a3a2a", accent: "#d8cfb6" }, ammo: { strength: 50, level: 52 } },
  { id: "burnt_token", name: "Burnt token", examine: "A small bronze token, charred past reading. One of the Burned carried it: a number that used to mean something.", value: 600, stackable: true, icon: { shape: "coins", color: "#5a2a24", accent: "#8a3a30" } },
  { id: "ash_heart", name: "Ash heart", examine: "What's left in one of the Burned when it stops: a knot of ash that stays warm for days. The Order of the Ember collects them.", value: 1500, stackable: true, icon: { shape: "orb", color: "#6e2a24", accent: "#ff6a2a" } },
  { id: "writ_of_passage", name: "Writ of passage", examine: "A Rarian writ, stamped with the closed eye: the bearer may pass the Regiment's lines. It has your Friend's number on it. You did not give it to them.", value: 0, tradeable: false, icon: { shape: "scroll", color: "#efe6c8", accent: "#3b2a52" } },
  { id: "sealed_dispatch", name: "Sealed dispatch", examine: "A dispatch under the Office of Conduct's seal. It is not for you to read, and it is heavier than paper should be.", value: 0, tradeable: false, icon: { shape: "scroll", color: "#d8d6e4", accent: "#4a2b3a" } },
  { id: "citizens_ledger", name: "Citizen's ledger", examine: "A page of the Ledger of Names: a Rarian's comings, goings, prayers and purchases, in a careful hand. You are supposed to add to it.", value: 0, tradeable: false, icon: { shape: "scroll", color: "#efe6c8", accent: "#2a2238" } },
  { id: "dusk_reliquary", name: "Dusk reliquary", examine: "A small violet box, locked, that hums when you hold it still. The Order of Dusk lost it in Deep Westmarch and wants it back unopened.", value: 0, tradeable: false, icon: { shape: "stonebox", color: "#2a2238", accent: "#8a6ab0" } },
  { id: "federation_tally", name: "Federation tally", examine: "Your count of the Federation's devices, as the Office of Conduct asked for. The number is wrong on purpose, or it isn't.", value: 0, tradeable: false, icon: { shape: "scroll", color: "#d8d6e4", accent: "#2f7d68" } },
  { id: "cannon_cradle", name: "Cannon cradle", examine: "A copper cradle for a magical cannon, built in the Enchanted Forge. It is warm, and it wants a barrel.", value: 0, tradeable: false, icon: { shape: "material", color: "#b87333", accent: "#4fa58a" } },
  { id: "toaster_bread", name: "Bread for the artifact", examine: "A loaf of bread, for a magical artifact that is not a toaster and would like you to stop calling it one.", value: 0, tradeable: false, icon: { shape: "bread", color: "#d9a93f" } },
  { id: "rrr_dispatch", name: "Regiment dispatch", examine: "A Regiment dispatch taken from a supply wagon: camp positions in Deep Westmarch, in a careful hand. The Federation will want it.", value: 0, tradeable: false, icon: { shape: "scroll", color: "#9ea3ad", accent: "#4a2b3a" } },
  { id: "hollowmere_report", name: "Western report", examine: "Your report for Hollowmere on what stands in Deep Westmarch. It raises more questions than it answers.", value: 0, tradeable: false, icon: { shape: "scroll", color: "#efe3c4", accent: "#8a2f2b" } },
  { id: "heartwood", name: "Ironbark heartwood", examine: "The grey heart of an old ironbark, cut out whole. BarkReach's bowyers would give a lot for it.", value: 2000, icon: { shape: "log", color: "#4a4846", accent: "#8a3a2a" } },
  { id: "hollowmere_cape", name: "Hollowmere cape", examine: "The crimson cape of the Kingdom of Hollowmere, the crown in gold on the back: the Western Watch's thanks for a report nobody at the castle liked.", value: 6000, icon: { shape: "cape", color: "#8a2f2b", accent: "#e2c46a" }, equip: { slot: "cape", bonuses: { defence: 3, attack: 1, strength: 1 } } },
  { id: "woodsmans_bow", name: "Woodsman's bow", examine: "A BarkReach hunting bow of redwood, antler-nocked: the loggers' thanks for the heartwood.", value: 6000, icon: { shape: "bow", color: "#8a3a2a", accent: "#d8cfb6" }, equip: { slot: "weapon", bonuses: { ranged: 76 }, requires: { ranged: 52 }, speed: 4, twoHanded: true, bow: { range: 8, strength: 12 } } },
  { id: "dusk_lantern", name: "Dusk lantern", examine: "A violet-glassed lantern of the Order of Dusk, worn at the belt: its light is dim and does not flicker, and the dead keep further from it than from a torch.", value: 9000, tradeable: false, icon: { shape: "lamp", color: "#2a2238", accent: "#8a6ab0" }, equip: { slot: "belt", bonuses: { prayer: 4, defence: 2 } } },
];

export const factionGear = (): Item[] => [...FFF_GEAR.map(gear), ...RARIA_GEAR.map(gear), ...WEST_ITEMS];

// ---------- Creatures: the Regiment, the Federation's pickets, the Royal Rangers, BarkReach's wild things, the deserters and the Burned ----------
const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
/** The nine builds of villager the Realm draws, and the knights' frame: every kind of Friend that ever walked a village, burned. */
export const BURNED_BUILDS = ["slim", "short", "average", "elder", "parent", "tall", "stout", "broad", "round", "knight"] as const;
export type BurnedBuild = typeof BURNED_BUILDS[number];
const BURNED_NAMES: Record<BurnedBuild, [string, string]> = {
  slim: ["Burned wanderer", "A slim figure in faded red, walking the ash as if it still had somewhere to be."], short: ["Burned child", "Small, faded red, and still holding something that burnt away years ago. Don't."],
  average: ["Burned villager", "A villager of no particular build, faded to the red of old embers, going through the motions of a market day."], elder: ["Burned elder", "Bent, faded red, leaning on a stick that is also burnt. Slow, and stronger than it looks."],
  parent: ["Burned pair", "Two of the Burned, a tall one and a small one, hand in hand. They do not let go, even now."], tall: ["Burned reeve", "Tall and faded red, with the bearing of someone who was once in charge of something."],
  stout: ["Burned smith", "Stout, faded red, swinging arms that remember a hammer."], broad: ["Burned carter", "Broad across the shoulders, faded red, dragging one foot through the ash."],
  round: ["Burned innkeeper", "Round and faded red, still smiling, which is the worst of it."], knight: ["Burned knight", "One of the Order's own, burnt in its plate, faded red through the joints. It kept its sword."],
};
const BURNED_LEVELS: Record<BurnedBuild, number> = { slim: 54, short: 55, average: 57, elder: 58, parent: 60, tall: 62, stout: 64, broad: 66, round: 67, knight: 69 };
/** The Burned: the dead of the villages Ashfall took, every build the Realm has, in faded red. Drops climb with the level. */
export const BURNED: Record<string, MonsterDef> = Object.fromEntries(BURNED_BUILDS.map((build, index) => {
  const level = BURNED_LEVELS[build], t = (level - 54) / 15, [name, examine] = BURNED_NAMES[build];
  return [`burned_${build}`, {
    id: `burned_${build}`, name, examine, level, hp: Math.round(62 + t * 48), attack: Math.round(44 + t * 22), strength: Math.round(44 + t * 24), defence: Math.round(40 + t * 26), magicDef: 10,
    attackBonus: Math.round(22 + t * 18), defenceBonus: Math.round(18 + t * 22), maxHit: Math.round(7 + t * 5), speed: build === "elder" || build === "round" ? 5 : 4, respawn: 50, wander: 4, aggressive: true,
    undead: true, poisonImmune: true, weakness: "water", slayer: 40, slayerXp: Math.round(70 + t * 50), ink: "#6e2a24", art: 160 + index,
    always: [one("bones", 1)],
    drops: [coins(40 + level * 2, 160 + level * 6, 0.75), one("burnt_token", 0.12 + t * 0.2), one("ash_heart", 0.03 + t * 0.09), one("ember_sigil", 0.1 + t * 0.1, 3, 9), one("cinder_core", 0.01 + t * 0.03),
      one("wyrm_scale", 0.01 + t * 0.02), one("ash_logs", 0.06 + t * 0.06, 1, 2), one("scorched_cloak", 0.004 + t * 0.012), one("ashsteel_sword", 0.003 + t * 0.01), one("rough_rosestone", 0.02 + t * 0.03)].filter(drop => drop.chance > 0),
  } satisfies MonsterDef];
}));

export const FACTION_MONSTERS: Record<string, MonsterDef> = {
  // The Rare Realm Regiment: camps and checkpoints in Deep Westmarch and BarkReach. They attack what has no writ.
  admiral_peck: { id: "admiral_peck", name: "Admiral Peck", level: 2, hp: 6, attack: 1, strength: 1, defence: 2, attackBonus: 0, defenceBonus: 0, maxHit: 1, speed: 4, respawn: 30, wander: 3, aggressive: false, ink: "#2f7d68", art: 100, examine: "A chicken in an FFF cape. Rank: admiral. Nobody at the fortress will explain this, and nobody is joking.", always: [one("bones", 1)], drops: [one("feather", 0.8, 2, 6), one("raw_chicken", 0.6), one("fff_cape_artisan", 0.001)] },
  rrr_scout: { id: "rrr_scout", name: "RRR scout", level: 56, hp: 60, attack: 50, strength: 42, defence: 44, magicDef: 20, attackBonus: 30, defenceBonus: 24, maxHit: 8, speed: 4, respawn: 50, wander: 7, aggressive: true, faction: "rrr", ranged: 4, ink: "#4a2b3a", art: 170, slayerXp: 60,
    examine: "A Regiment scout in violet leathers, a short bow and a longer memory. If you can see it, it has already written you down.",
    always: [one("bones", 1)], drops: [coins(40, 200, 0.7), one("rarian_dagger", 0.03), one("rarian_bow", 0.02), one("law_sigil", 0.15, 2, 6), one("rrr_dispatch", 0.0), one("path_sigil", 0.05, 1, 3)].filter(drop => drop.chance > 0) },
  rrr_archer: { id: "rrr_archer", name: "RRR archer", level: 60, hp: 66, attack: 54, strength: 48, defence: 48, magicDef: 22, attackBonus: 34, defenceBonus: 28, maxHit: 9, speed: 4, respawn: 55, wander: 3, aggressive: true, faction: "rrr", ranged: 5, ink: "#4a2b3a", art: 171, slayerXp: 68,
    examine: "A Regiment archer behind a stake fence, loosing in time with the file. They do not miss; they are not allowed to.",
    always: [one("bones", 1)], drops: [coins(50, 240, 0.7), one("rarian_bow", 0.03), one("rarian_crossbow", 0.015), one("law_sigil", 0.15, 2, 6), one("pewter_arrow", 0.3, 8, 20), one("moonsilver_arrow", 0.08, 4, 10), one("rrr_boots", 0.01)] },
  rrr_footman: { id: "rrr_footman", name: "RRR footman", level: 62, hp: 76, attack: 58, strength: 54, defence: 56, magicDef: 24, attackBonus: 36, defenceBonus: 40, maxHit: 9, speed: 4, respawn: 55, wander: 3, aggressive: true, faction: "rrr", ink: "#4a2b3a", art: 172, slayerXp: 74,
    examine: "A footman of the Rare Realm Regiment: grey plate, violet enamel, the closed eye on the breast, and a sword that is exactly as sharp as the regulations require.",
    always: [one("bones", 1)], drops: [coins(60, 280, 0.75), one("rarian_sword", 0.03), one("rrr_helm", 0.012), one("rrr_greaves", 0.01), one("rrr_gauntlets", 0.012), one("law_sigil", 0.12, 2, 5), one("faith_potion", 0.05), one("rrr_heater", 0.008)] },
  rrr_halberdier: { id: "rrr_halberdier", name: "RRR halberdier", level: 68, hp: 90, attack: 62, strength: 64, defence: 60, magicDef: 26, attackBonus: 40, defenceBonus: 44, maxHit: 11, speed: 6, respawn: 60, wander: 2, aggressive: true, faction: "rrr", ink: "#4a2b3a", art: 173, slayerXp: 86,
    examine: "The checkpoint weapon with a soldier attached: a Regiment halberdier, who will ask for your writ exactly once.",
    always: [one("bones", 1)], drops: [coins(80, 320, 0.75), one("rarian_halberd", 0.025), one("rarian_spear", 0.03), one("rrr_cuirass", 0.008), one("rrr_greaves", 0.012), one("law_sigil", 0.15, 3, 7), one("dusk_sigil", 0.04, 1, 2)] },
  rrr_captain: { id: "rrr_captain", name: "RRR captain", level: 78, hp: 120, attack: 72, strength: 70, defence: 70, magicDef: 34, attackBonus: 48, defenceBonus: 54, maxHit: 13, speed: 5, respawn: 90, wander: 1, aggressive: true, faction: "rrr", ink: "#3b2a52", art: 174, slayerXp: 120,
    examine: "A Regiment captain in full plate and a violet plume, with the camp's dispatches in a case at the hip and a greatsword that was blessed this morning.",
    always: [one("bones", 1)], drops: [coins(200, 800, 0.85), one("rarian_greatsword", 0.03), one("rrr_cuirass", 0.02), one("rrr_helm", 0.03), one("rrr_banner", 0.02), one("rrr_dispatch", 0.0), one("law_sigil", 0.3, 4, 10), one("dusk_sigil", 0.08, 1, 3), one("crown_sigil", 0.02, 1, 2)].filter(drop => drop.chance > 0) },
  // The Raria Royal Rangers: the royal family's own, everywhere in the city, extremely high level, and never the first to draw.
  royal_ranger: { id: "royal_ranger", name: "Raria Royal Ranger", level: 162, hp: 420, attack: 130, strength: 120, defence: 140, magicDef: 110, attackBonus: 110, defenceBonus: 120, maxHit: 28, speed: 3, respawn: 200, wander: 1, aggressive: false, ranged: 7, ink: "#2a2238", art: 175, slayerXp: 400,
    examine: "A Raria Royal Ranger: violet coat, silver mail, a dusk-black longbow, and a stillness that makes the street quieter. It is not looking at you. It has already looked.",
    always: [one("bones", 1)], drops: [coins(500, 2500, 0.9), one("rangers_longbow", 0.02), one("ranger_royal_hood", 0.02), one("ranger_royal_coat", 0.012), one("ranger_royal_leggings", 0.015), one("crown_sigil", 0.3, 2, 6), one("dusk_sigil", 0.3, 3, 8), one("law_sigil", 0.5, 6, 14)] },
  // The Federation's pickets in the Free Marches: they watch, and shoot only what shoots first, until the Federation knows your name.
  fff_picket: { id: "fff_picket", name: "FFF picket", level: 58, hp: 64, attack: 50, strength: 46, defence: 48, magicDef: 30, attackBonus: 32, defenceBonus: 28, maxHit: 8, speed: 4, respawn: 60, wander: 4, aggressive: false, faction: "fff", ranged: 5, ink: "#1d4f42", art: 176, slayerXp: 64,
    examine: "A Federation ranger on picket in a green cape with FFF across the back, up a tree or behind a stump, a copper-tipped arrow nocked and not drawn. Yet.",
    always: [one("bones", 1)], drops: [coins(40, 220, 0.7), one("fff_broadheads", 0.3, 6, 16), one("fff_ranger_bracers", 0.012), one("fff_ranger_hood", 0.01), one("storm_sigil", 0.1, 2, 5), one("stag_antler", 0.1)] },
  fff_warden: { id: "fff_warden", name: "FFF warden", level: 70, hp: 96, attack: 60, strength: 58, defence: 62, magicDef: 40, attackBonus: 40, defenceBonus: 46, maxHit: 11, speed: 5, respawn: 80, wander: 2, aggressive: false, faction: "fff", attackStyle: "magic", ink: "#1d4f42", art: 177, slayerXp: 96,
    examine: "A Federation warden: a wizard in reinforced robes and a copper cape, FFF in brass across it, at the gate of the Free Marches. Polite, armed, and visibly doing maths about you.",
    always: [one("bones", 1)], drops: [coins(80, 360, 0.75), one("fff_wand", 0.015), one("fff_spellward", 0.01), one("fff_hood", 0.012), one("storm_sigil", 0.2, 3, 8), one("thought_sigil", 0.3, 4, 10), one("ember_sigil", 0.15, 3, 8)] },
  // BarkReach: what the wood keeps.
  greatstag: { id: "greatstag", name: "Greatstag", level: 40, hp: 70, attack: 34, strength: 40, defence: 36, attackBonus: 20, defenceBonus: 22, maxHit: 8, speed: 4, respawn: 70, wander: 6, aggressive: false, ink: "#8a6a48", art: 178, slayerXp: 44,
    examine: "A greatstag of BarkReach, as tall at the shoulder as a Friend is at the crown, with antlers like a fallen tree. The hunters' prize; it does not go quietly.",
    always: [one("bones", 1), one("stag_antler", 1)], drops: [one("raw_beef", 0.9, 1, 2), one("cowhide", 0.6, 1, 2), one("stag_antler", 0.35), one("broadhead_arrow", 0.1, 4, 10)] },
  bark_lurker: { id: "bark_lurker", name: "Bark lurker", level: 48, hp: 58, attack: 46, strength: 40, defence: 38, magicDef: 20, attackBonus: 30, defenceBonus: 20, maxHit: 8, speed: 4, respawn: 50, wander: 2, aggressive: true, weakness: "fire", poison: { damage: 3, chance: 0.2 }, slayer: 30, slayerXp: 56, ink: "#4a3a2c", art: 179,
    examine: "A thing shaped like a stump until it isn't: bark over something soft, with a bite that festers. BarkReach's rangers burn the real stumps to be sure.",
    always: [one("bones", 1)], drops: [coins(20, 140, 0.5), one("redwood_logs", 0.3, 1, 2), one("ironbark_logs", 0.1), one("bloom_sigil", 0.08, 1, 3), one("marshroot", 0.1), one("stag_antler", 0.05)] },
  timber_thief: { id: "timber_thief", name: "Timber thief", level: 36, hp: 44, attack: 32, strength: 32, defence: 28, attackBonus: 20, defenceBonus: 16, maxHit: 6, speed: 4, respawn: 45, wander: 5, aggressive: true, ink: "#5a4a3a", art: 180, slayerXp: 36,
    examine: "A timber thief with a stolen axe and a cart somewhere in the trees. BarkReach's loggers have a price on the axe, not the thief.",
    always: [one("bones", 1)], drops: [coins(20, 160, 0.7), one("redwood_logs", 0.4, 1, 3), one("blackiron_axe", 0.04), one("oak_logs", 0.3, 1, 4), one("broadhead_arrow", 0.1, 3, 8), one("ironbark_logs", 0.08)] },
  // Deep Westmarch: Hollowmere's deserters, who went west and stopped.
  deserter: { id: "deserter", name: "Hollowmere deserter", level: 45, hp: 52, attack: 42, strength: 40, defence: 36, attackBonus: 26, defenceBonus: 22, maxHit: 7, speed: 4, respawn: 50, wander: 5, aggressive: true, ink: "#5a2f2b", art: 181, slayerXp: 48,
    examine: "A soldier of Hollowmere who marched west, saw what was there, and did not march back. The crimson cape is a rag now. The sword isn't.",
    always: [one("bones", 1)], drops: [coins(30, 180, 0.7), one("blackiron_sword", 0.05), one("crimson_cape", 0.03), one("blackiron_helm", 0.03), one("bread", 0.3), one("hollowmere_report", 0.0), one("path_sigil", 0.04, 1, 2)].filter(drop => drop.chance > 0) },
  ...BURNED,
};
