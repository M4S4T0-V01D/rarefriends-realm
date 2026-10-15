/**
 * Sorrowmere's things (necropolis.ts builds the necropolis east of the Deadwood): the seal its Gravewarden carries, the
 * key the Regent's door wants, what the Bone Regent was buried with, and the dead that keep the place. A leaf (types
 * only), so data.ts can list them.
 */
import type { Drop, Item, MonsterDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });

export const NECROPOLIS_ITEMS: readonly Item[] = [
  { id: "sorrowmere_seal", name: "Sorrowmere seal", examine: "A disc of black stone the size of a palm, cut with a closed eye. The Great Barrow's door knows it.", value: 0, tradeable: false,
    icon: { shape: "amulet", color: "#2a2a30", accent: "#c9c3b2" } },
  { id: "sorrowmere_key", name: "Ossuary key", examine: "A key of yellowed bone, notched like a jaw. It opens the Regent's door, once, and breaks in the lock.", value: 0, stackable: true, tradeable: false,
    icon: { shape: "key", color: "#e2d9c0", accent: "#7a6a52" } },
  { id: "regent_circlet", name: "Regent's circlet", examine: "A thin crown of tarnished silver set with a single black pearl. The Bone Regent wore it four hundred years.", value: 26000,
    icon: { shape: "crown", color: "#9aa0a8", accent: "#2a2430" }, equip: { slot: "head", bonuses: { magic: 14, prayer: 8, defence: 10 }, requires: { magic: 70, prayer: 50 } } },
  { id: "ossuary_flail", name: "Ossuary flail", examine: "A flail of black iron, its head a cluster of fused bone. It hits the dead harder than the living.", value: 30000,
    icon: { shape: "flail", color: "#3a3a40", accent: "#e2d9c0" }, equip: { slot: "weapon", bonuses: { attack: 70, strength: 82 }, requires: { attack: 70, strength: 70 }, holy: true } },
];

export const NECROPOLIS_MONSTERS: Record<string, MonsterDef> = {
  barrow_shade: { id: "barrow_shade", name: "Barrow shade", level: 66, hp: 82, attack: 52, strength: 50, defence: 50, magicDef: 46, attackBonus: 28, defenceBonus: 34, maxHit: 9, speed: 4, respawn: 40, wander: 4, aggressive: true, undead: true, poisonImmune: true, art: 111, ink: "#5a5a6a",
    examine: "Something that was buried here and didn't stay buried, now mostly shadow and grudge.", always: [one("bones", 1)], drops: [coins(40, 260, 0.6), one("shade_sigil", 0.2, 3, 8), one("grave_dust", 0.2, 1, 2)] },
  ossuary_ghoul: { id: "ossuary_ghoul", name: "Ossuary ghoul", level: 74, hp: 104, attack: 60, strength: 64, defence: 54, magicDef: 30, attackBonus: 32, defenceBonus: 38, maxHit: 11, speed: 5, respawn: 45, wander: 3, aggressive: true, undead: true, poisonImmune: true, art: 123, ink: "#6a6250",
    examine: "A grey, long-armed thing that lives on what the catacombs keep. It has been sorting the bones.", always: [one("large_bones", 1)], drops: [coins(60, 340, 0.7), one("sorrowmere_key", 0.08), one("grave_dust", 0.3, 1, 3)] },
  sorrow_knight: { id: "sorrow_knight", name: "Sorrow knight", level: 82, hp: 120, attack: 68, strength: 70, defence: 72, magicDef: 40, attackBonus: 36, defenceBonus: 50, maxHit: 12, speed: 6, respawn: 60, wander: 3, aggressive: true, undead: true, poisonImmune: true, size: 2, art: 137, ink: "#4a4a58",
    examine: "A knight of the old kings' guard in armour gone black, still keeping the watch he was buried for.", always: [one("large_bones", 1)], drops: [coins(100, 500, 0.8), one("sorrowmere_key", 0.12), one("rarite_ore", 0.1)] },
  gravewarden: { id: "gravewarden", name: "The Gravewarden", level: 96, hp: 260, attack: 82, strength: 86, defence: 84, magicDef: 56, attackBonus: 42, defenceBonus: 60, maxHit: 15, speed: 6, respawn: 120, wander: 3, aggressive: true, undead: true, poisonImmune: true, enrage: true, size: 2, art: 137, ink: "#2a2a34",
    examine: "The necropolis's warden, three times a man's height in plate the colour of a moonless night, a black seal on a chain at its throat.", always: [one("large_bones", 1, 2, 3), one("sorrowmere_seal", 1)], drops: [coins(400, 1600, 1), one("sorrowmere_key", 0.3)] },
  bone_regent: { id: "bone_regent", name: "The Bone Regent", level: 150, hp: 420, attack: 120, strength: 124, defence: 110, magicDef: 80, attackBonus: 64, defenceBonus: 80, maxHit: 22, speed: 6, respawn: 200, wander: 2, aggressive: true, undead: true, poisonImmune: true, enrage: true, heals: 6, size: 3, art: 113, ink: "#e2d9c0",
    examine: "The last of the old kings, who would not lie down: a crowned skeleton the size of a cart, on a throne of everyone else's bones.", always: [one("large_bones", 1, 3, 5), coins(2000, 6000, 1)], drops: [one("regent_circlet", 0.05), one("ossuary_flail", 0.05), one("star_sigil", 0.4, 10, 25), one("rarite_bar", 0.3, 1, 3)] },
};
