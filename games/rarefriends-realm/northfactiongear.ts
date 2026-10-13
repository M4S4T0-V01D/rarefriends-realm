/**
 * A Place to the North: the factions' gear (Oathsworn Hall, the Hearthwardens: given for standing, northfactions.ts)
 * and the north's own creatures: draugr in the Vargskeld barrows, fjord trolls on the northern coast, rusalki on the
 * Krasna's banks, leshies in the deep Zoryavik forest, and the Likho in the felled wood of the Cut. A leaf (types only),
 * so data.ts can list them.
 */
import type { Drop, Item, MonsterDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });

export const NORTH_FACTION_ITEMS: readonly Item[] = [
  { id: "grave_ring", name: "Grave-ring", examine: "A draugr's ring, black silver, cold even in the hand. The Oathsworn's oldest trial: bring one up out of the barrows.", value: 0, icon: { shape: "ring", color: "#3a3a44", accent: "#9fb4c8" }, tradeable: false },
  { id: "likho_eye", name: "The Likho's eye", examine: "A single eye the size of a fist, clouded and still. Misfortune, the Zoryavik say, looks out of it. Captain Milena will want to see it.", value: 0, icon: { shape: "orb", color: "#cfd6c8", accent: "#3a3a2a" }, tradeable: false },
  { id: "oathsworn_shield", name: "Oathsworn shield", examine: "A round shield of limewood and iron, painted by its bearer, as every Oathsworn shield is. Given by the Hall for standing.", value: 16000, tradeable: false,
    icon: { shape: "roundshield", color: "#6b3a2a", accent: "#e2c46a" }, equip: { slot: "shield", bonuses: { defence: 96, strength: 4, magic: -9 }, requires: { defence: 40, strength: 45 } } },
  { id: "oath_helm", name: "Oath-helm", examine: "An iron helm with spectacle guards, its brow-band cut with the words its wearer swore. Given by the Hall for long standing.", value: 9000, tradeable: false,
    icon: { shape: "helm", color: "#6a6a72", accent: "#e2c46a" }, equip: { slot: "head", bonuses: { defence: 30, strength: 3, magic: -4 }, requires: { defence: 45 } } },
  { id: "hearthwarden_spear", name: "Hearthwarden spear", examine: "A long ash spear with a winged head, the Hearthwardens' own: it keeps a wolf, or a man, at the length it should be kept. Given for standing.", value: 15000, tradeable: false,
    icon: { shape: "spear", color: "#8a6a42", accent: "#c9d2d8" }, equip: { slot: "weapon", bonuses: { attack: 58, strength: 52, defence: 6 }, requires: { attack: 50 } } },
  { id: "hearthwarden_cloak", name: "Hearthwarden cloak", examine: "A heavy green wool cloak, lined with fox fur, the hearth-and-pass badge at its throat. Given by the Hearthwardens for long standing.", value: 8000, tradeable: false,
    icon: { shape: "cape", color: "#3e5a3a", accent: "#d9b866" }, equip: { slot: "cape", bonuses: { defence: 8, prayer: 3 }, requires: { defence: 40 } } },
];

export const NORTH_FACTION_MONSTERS: Record<string, MonsterDef> = {
  draugr: { id: "draugr", name: "Draugr", level: 46, hp: 64, attack: 40, strength: 42, defence: 40, magicDef: 18, attackBonus: 24, defenceBonus: 30, maxHit: 7, speed: 5, respawn: 40, wander: 4, aggressive: true, undead: true, poisonImmune: true, art: 123, ink: "#7a8a9a",
    examine: "A dead Vargskeld warrior who wouldn't stay in his howe: blue-grey, swollen, still wearing his rings. The barrows are full of them, and of what they guard.", always: [one("bones", 1)], drops: [coins(20, 160, 0.6), one("blackiron_ore", 0.15, 1, 2)] },
  fjord_troll: { id: "fjord_troll", name: "Fjord troll", level: 58, hp: 96, attack: 46, strength: 54, defence: 48, attackBonus: 24, defenceBonus: 34, maxHit: 10, speed: 6, respawn: 60, wander: 3, aggressive: true, size: 2, art: 214, ink: "#5a6a5a",
    examine: "A troll of the sea cliffs, lichen in its hair and barnacles on its knuckles. It throws rocks at boats, and at you.", always: [one("bones", 1)], drops: [coins(40, 260, 0.8), one("blackiron_ore", 0.25, 1, 2)] },
  rusalka: { id: "rusalka", name: "Rusalka", level: 40, hp: 46, attack: 34, strength: 30, defence: 28, magicDef: 30, attackBonus: 22, defenceBonus: 18, maxHit: 6, speed: 4, respawn: 40, wander: 3, aggressive: true, undead: true, art: 149, ink: "#8fb4a8",
    examine: "A drowned girl with river-weed in her hair, sitting on the bank, combing it. She'd like you to come a little closer to the water.", always: [], drops: [coins(16, 120, 0.5), one("vial_of_water", 0.2)] },
  leshy: { id: "leshy", name: "Leshy", level: 66, hp: 120, attack: 50, strength: 56, defence: 58, magicDef: 24, attackBonus: 28, defenceBonus: 44, maxHit: 10, speed: 6, respawn: 80, wander: 4, size: 2, weakness: "fire", art: 179, ink: "#4a5a32",
    examine: "The forest's own keeper, as tall as the pines when it wants to be, and bark where its face should be. It leaves the respectful alone.", always: [], drops: [coins(40, 300, 0.8), one("logs", 0.5, 2, 5)] },
  likho: { id: "likho", name: "Likho One-Eye", level: 74, hp: 160, attack: 58, strength: 64, defence: 54, magicDef: 30, attackBonus: 32, defenceBonus: 40, maxHit: 12, speed: 6, respawn: 600, wander: 3, aggressive: true, size: 2, art: 214, ink: "#2e2a26",
    examine: "Misfortune, walking: a grey, one-eyed giant from the old firs. The Zoryavik say it follows whoever wakes it, and someone has.", always: [one("bones", 1)], drops: [coins(200, 900, 1)] },
};
