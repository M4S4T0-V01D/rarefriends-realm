/**
 * The Crownstones' things (crownstones.ts builds the henge on the Greyfields and the Undercroft of Crowns under it): the
 * four regalia stones the Vault door wants, each carried by its own warden; what the Uncrowned King keeps; and the stone
 * that keeps the undercroft. A leaf (types only), so data.ts can list them.
 */
import type { Drop, Item, MonsterDef } from "./data.ts";

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });

/** The four regalia, in the order the chambers go round the gallery: their stone, its colour, and the warden who carries it. */
export const REGALIA = [
  { id: "sceptre", stone: "sceptre_stone", name: "Sceptre stone", color: "#c9a53a", warden: "sceptre_warden", wardenName: "The Warden of the Sceptre" },
  { id: "orb", stone: "orb_stone", name: "Orb stone", color: "#6f8fd0", warden: "orb_warden", wardenName: "The Warden of the Orb" },
  { id: "ring", stone: "ring_stone", name: "Ring stone", color: "#c86a6a", warden: "ring_warden", wardenName: "The Warden of the Ring" },
  { id: "mantle", stone: "mantle_stone", name: "Mantle stone", color: "#7aa86a", warden: "mantle_warden", wardenName: "The Warden of the Mantle" },
] as const;

export const CROWNSTONES_ITEMS: readonly Item[] = [
  ...REGALIA.map((r): Item => ({ id: r.stone, name: r.name, examine: `A palm-sized stone cut with the ${r.id} of the old crown. The Crown Vault's door has a socket shaped for it.`, value: 0, tradeable: false,
    icon: { shape: "gem", color: r.color, accent: "#3a3a40" } })),
  { id: "crown_of_the_greyfields", name: "Crown of the Greyfields", examine: "The old crown of Raria, a ring of grey stone set in gold, and heavier than it looks. Kings were made under the Crownstones in it.", value: 32000,
    icon: { shape: "crown", color: "#c9a53a", accent: "#8a8780" }, equip: { slot: "head", bonuses: { attack: 8, strength: 8, defence: 18, magic: 8, prayer: 6 }, requires: { defence: 70 } } },
  { id: "kingstone_shield", name: "Kingstone shield", examine: "A round shield faced with a slice of the Crownstones' own grey stone, rimmed in gold. Arrows break on it.", value: 28000,
    icon: { shape: "roundshield", color: "#8a8780", accent: "#c9a53a" }, equip: { slot: "shield", bonuses: { defence: 46, ranged: -4 }, requires: { defence: 75 } } },
];

const warden = (r: typeof REGALIA[number]): MonsterDef => ({ id: r.warden, name: r.wardenName, level: 78, hp: 150, attack: 64, strength: 68, defence: 70, magicDef: 44, attackBonus: 34, defenceBonus: 48, maxHit: 12, speed: 6, respawn: 90, wander: 2, aggressive: true, undead: true, poisonImmune: true, size: 2, art: 137, ink: r.color,
  examine: `A crowned king's guard in grey plate, the ${r.id} of the old regalia cut on its breast. It carries the ${r.name.toLowerCase()} and won't give it up alive.`,
  always: [one("large_bones", 1), one(r.stone, 1)], drops: [coins(200, 900, 1), one("rarite_ore", 0.15), one("star_sigil", 0.2, 4, 10)] });

export const CROWNSTONES_MONSTERS: Record<string, MonsterDef> = {
  stone_sentinel: { id: "stone_sentinel", name: "Stone sentinel", level: 58, hp: 90, attack: 46, strength: 50, defence: 62, magicDef: 30, attackBonus: 24, defenceBonus: 50, maxHit: 9, speed: 6, respawn: 45, wander: 3, aggressive: true, poisonImmune: true, weakness: "water", art: 120, ink: "#7d7a74",
    examine: "A standing stone that walks. It keeps the undercroft the way the stones above keep the downs: by being there, and by being heavy.", always: [], drops: [coins(60, 300, 0.7), one("crystal_shard", 0.2, 1, 2), one("rough_moonstone", 0.03)] },
  ...Object.fromEntries(REGALIA.map(r => [r.warden, warden(r)])),
  uncrowned_king: { id: "uncrowned_king", name: "The Uncrowned King", level: 140, hp: 400, attack: 112, strength: 118, defence: 108, magicDef: 70, attackBonus: 60, defenceBonus: 76, maxHit: 20, speed: 6, respawn: 180, wander: 2, aggressive: true, undead: true, poisonImmune: true, enrage: true, size: 3, art: 137, ink: "#c9a53a",
    examine: "The last king crowned under the Crownstones, who went down into the Vault with the crown and never came up: an empty suit of gilded plate, still sitting the throne.", always: [one("large_bones", 1, 2, 4), coins(1800, 5200, 1)],
    drops: [one("crown_of_the_greyfields", 0.05), one("kingstone_shield", 0.05), one("star_sigil", 0.4, 10, 25), one("rarite_bar", 0.3, 1, 3), one("moonstone", 0.2, 1, 2)] },
};
