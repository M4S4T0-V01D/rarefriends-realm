/**
 * The Land Before Stone: what Kharaveth's north holds, and what lives in it.
 *
 * The Sunteeth's hyenas, skinks and glasswing vultures; the dust walkers, whirls of dust that keep a walking shape
 * (spirit: true, so the rites that answer spirits answer them); under the maze, the Underway's tomb beetles, lamp-eyed
 * bats and the sentinel of dressed stone that keeps its road; on the steppe, jackals and sand scorpions. And the few
 * things you carry out: potsherds with Azhurak marks on them, the expedition's cloak, a glasswing's quill.
 */
import type { Drop, IconShape, Item, MonsterDef, ShopDef } from "./data.ts";

export const KHARAVETH = { sandstone: "#c98a5e", ochre: "#c9a050", umber: "#5f4128", lapis: "#2f3f66", turquoise: "#3b8a8a", gold: "#d9b866", obsidian: "#1e1c22", linen: "#ece2c8" } as const;

const coins = (min: number, max: number, chance: number): Drop => ({ item: "coins", min, max, chance });
const one = (id: string, chance: number, min = 1, max = min): Drop => ({ item: id, min, max, chance });
const item = (id: string, name: string, examine: string, value: number, shape: IconShape, color: string, accent?: string, extra: Partial<Item> = {}): Item => ({ id, name, examine, value, icon: { shape, color, accent }, ...extra });
const K = KHARAVETH;

export const KHARAVETH_ITEMS: readonly Item[] = [
  item("azhurak_sherd", "Inscribed sherd", "A potsherd with marks cut into it before it was fired: a few glyphs of Azhurak, the people before the dynasties. Study it to learn what you can.", 0, "tablet", K.ochre, K.lapis, { stackable: true }),
  item("glasswing_quill", "Glasswing quill", "A flight feather like smoked glass, from a glasswing vulture. Scribes in the south write with nothing else.", 90, "feather", "#9aa6ad", "#3b3a40", { stackable: true }),
  item("hyena_pelt", "Hyena pelt", "A spotted pelt, coarse and strong-smelling. Tanned, it's as good as cowhide and twice as hard-wearing.", 60, "hide", "#b39a6a", "#5f4128", { stackable: true }),
  item("scorpion_stinger", "Scorpion stinger", "The barbed sting of a sand scorpion, still full. Apothecaries pay well for these, and handle them with tongs.", 140, "herb", "#e2cfa0", "#7a3a2a", { stackable: true }),
  item("beetle_shell", "Beetle shell", "A piece of tomb beetle shell, lacquer-black with a band of gold. The Underway's people inlaid boxes with it.", 220, "gem", K.obsidian, K.gold, { stackable: true }),
  item("ochre_chalk", "Stick of ochre chalk", "Red-yellow chalk, worn to a stub. Not the white chalk Hollowmere's mapmakers use. Somebody else marks walls in the Sunteeth.", 0, "ore", "#c9703a", K.ochre, { tradeable: false }),
  item("party_roster", "The supply party's roster", "Hollowmere's list of the missing supply party: Corporal Della Rook, the porters Tamsin and Abe, the hired guide Ibbu, and Biscuit (a mule).", 0, "scroll", K.linen, "#5f5a52", { tradeable: false }),
];

/** The expedition's cloak (the quest's reward): sand-coloured, Hollowmere's grey badge at the shoulder. */
export const KHARAVETH_GEAR: readonly Item[] = [
  { id: "foothold_cloak", name: "Foothold cloak", examine: "Hollowmere's expedition cloak: sand-coloured wool, a grey tower at the shoulder, hemmed short for walking. Keeps the sun off and the night out.", value: 4000,
    icon: { shape: "cape", color: "#cdb58a", accent: "#6f7680", kind: "foothold" }, equip: { slot: "cape", bonuses: { defence: 4, ranged: 2 }, requires: { defence: 25 } } },
];

/**
 * The steppe people's travelling clothes, which Hollowmere's quartermaster buys off them for the expedition: a sand
 * headwrap with a long indigo tail to draw across the face, a layered robe stitched in ochre red, a beaded sash.
 */
export const STEPPE_CLOTHES: readonly Item[] = [
  { id: "steppe_headwrap", name: "Steppe headwrap", examine: "Sand-coloured cloth wound round the head, its long indigo tail drawn across the face when the wind gets up.", value: 160, icon: { shape: "hood", color: "#d6c49a", accent: "#2f3f66" }, equip: { slot: "head", bonuses: { defence: 1 } } },
  { id: "steppe_robe", name: "Steppe robe", examine: "Layers of undyed linen over a darker robe, stitched in ochre red at the hem and the cuffs. Cool by day, warm by night.", value: 320, icon: { shape: "body", color: "#e2d6b8", accent: "#a5443a", kind: "tunic" }, equip: { slot: "body", bonuses: { defence: 2 } } },
  { id: "steppe_sash", name: "Beaded sash", examine: "A leather sash sewn with blue and red beads in a pattern that, the steppe people say, is a map, if you know where you started.", value: 140, icon: { shape: "cape", color: "#7a5636", accent: "#3b8a8a" }, equip: { slot: "cape", bonuses: { defence: 1 } } },
];

export const KHARAVETH_SHOPS: Record<string, ShopDef> = {
  foothold_stores: { id: "foothold_stores", name: "Foothold Camp stores", general: true, buys: ["food", "other"], rate: 0.5,
    stock: ["bread", "cooked_meat", "vial_of_water", "vial", "tinderbox", "hammer", "knife", "steppe_headwrap", "steppe_robe", "steppe_sash", "hollowmere_cape"] },
};

export const KHARAVETH_MONSTERS: Record<string, MonsterDef> = {
  dune_jackal: { id: "dune_jackal", name: "Dune jackal", level: 22, hp: 30, attack: 18, strength: 16, defence: 14, attackBonus: 6, defenceBonus: 8, maxHit: 3, speed: 4, respawn: 30, wander: 8, art: 238, ink: "#c9a46a",
    examine: "Lean, long-legged, all ears. It trots after caravans at a polite distance, and waits.", always: [one("bones", 1)], drops: [one("raw_beef", 0.4), coins(4, 30, 0.3), one("azhurak_sherd", 0.01)] },
  rock_skink: { id: "rock_skink", name: "Rock skink", level: 28, hp: 34, attack: 22, strength: 18, defence: 24, attackBonus: 8, defenceBonus: 16, maxHit: 3, speed: 4, respawn: 30, wander: 4, art: 231, ink: "#b9774f",
    examine: "A long flat lizard banded like the sandstone it suns on. You notice it when it moves, and not before.", always: [one("bones", 1)], drops: [coins(6, 40, 0.4), one("azhurak_sherd", 0.02)] },
  lamp_bat: { id: "lamp_bat", name: "Lamp-eyed bat", level: 32, hp: 36, attack: 26, strength: 22, defence: 20, attackBonus: 12, defenceBonus: 12, maxHit: 4, speed: 3, respawn: 30, wander: 6, aggressive: true, art: 235, ink: "#5a4a5e",
    examine: "A long-eared cave bat whose eyes give back light like two small lamps. The Underway's people thought they were the dead keeping watch.", always: [one("bones", 1)], drops: [coins(8, 50, 0.4), one("azhurak_sherd", 0.04)] },
  sunteeth_hyena: { id: "sunteeth_hyena", name: "Sunteeth hyena", level: 36, hp: 46, attack: 30, strength: 30, defence: 24, attackBonus: 16, defenceBonus: 14, maxHit: 5, speed: 4, respawn: 35, wander: 6, aggressive: true, art: 230, ink: "#a68a5a",
    examine: "High in the shoulder, low in the hip, laughing. The packs follow the canyons the way water would, and know them better than the expedition does.", always: [one("bones", 1)], drops: [one("hyena_pelt", 0.6), one("raw_beef", 0.5), coins(10, 70, 0.5), one("azhurak_sherd", 0.03)] },
  glasswing_vulture: { id: "glasswing_vulture", name: "Glasswing vulture", level: 40, hp: 50, attack: 32, strength: 28, defence: 30, attackBonus: 18, defenceBonus: 18, maxHit: 5, speed: 4, respawn: 35, wander: 8, art: 232, ink: "#6f7680",
    examine: "A bald-headed vulture whose wings are dark and clear at once, like smoked glass. It has seen everything die out here, and is patient about you.", always: [one("bones", 1)], drops: [one("glasswing_quill", 0.5, 1, 3), one("feather", 0.6, 5, 15), coins(10, 80, 0.4)] },
  tomb_beetle: { id: "tomb_beetle", name: "Tomb beetle", level: 42, hp: 56, attack: 30, strength: 32, defence: 44, attackBonus: 14, defenceBonus: 34, maxHit: 5, speed: 5, respawn: 35, wander: 4, aggressive: true, weakness: "fire", art: 234, ink: "#1e1c22",
    examine: "A scarab the size of a dog, its shell lacquer-black with a band of old gold. It rolls nothing. It eats what was left in the Underway, and that was a great deal.", always: [one("bones", 1)], drops: [one("beetle_shell", 0.3), coins(12, 90, 0.5), one("azhurak_sherd", 0.06)] },
  sand_scorpion: { id: "sand_scorpion", name: "Sand scorpion", level: 44, hp: 54, attack: 36, strength: 34, defence: 34, attackBonus: 20, defenceBonus: 22, maxHit: 6, speed: 4, respawn: 35, wander: 5, aggressive: true, poison: { damage: 4, chance: 0.25 }, art: 237, ink: "#e2cfa0",
    examine: "Pale as the dunes, tail up and over, pincers wide. It doesn't want you. It doesn't want you close, either.", always: [], drops: [one("scorpion_stinger", 0.4), coins(14, 100, 0.5)] },
  dust_walker: { id: "dust_walker", spirit: true, name: "Dust walker", level: 46, hp: 50, attack: 34, strength: 30, defence: 30, magicDef: 38, attackBonus: 20, defenceBonus: 20, maxHit: 6, speed: 4, respawn: 40, wander: 3, aggressive: true, weakness: "water", attackStyle: "magic", art: 233, ink: "#c9a46a",
    examine: "A whirl of dust that keeps the shape of a man walking, and walks. The nomads say it's somebody who lost the road and is still looking. It comes apart where you strike it, and comes back.", always: [], drops: [coins(16, 120, 0.6), one("azhurak_sherd", 0.08)] },
  underway_sentinel: { id: "underway_sentinel", name: "Underway sentinel", level: 58, hp: 90, attack: 46, strength: 44, defence: 56, magicDef: 30, attackBonus: 30, defenceBonus: 40, maxHit: 9, speed: 5, respawn: 60, wander: 2, aggressive: true, poisonImmune: true, weakness: "water", art: 236, ink: "#a39e96",
    examine: "A figure of dressed stone with a bronze staff, standing where the road has a shrine. Its face is an eye cut in the stone and nothing else. It has kept this road for longer than there have been names for it.", always: [], drops: [coins(40, 260, 0.8), one("azhurak_sherd", 0.5, 1, 2), one("beetle_shell", 0.2)] },
};
