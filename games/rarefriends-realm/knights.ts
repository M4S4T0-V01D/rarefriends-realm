/**
 * The four knightly Orders and the gods they serve, each god a Rare Friend of legend shaped like the sign of a chain:
 * the Good Friend of the Order of the Diamond, the Squid Friend of the Order of the Ink, the Weird Friend of the Order
 * of the Sol, and the Hood Friend of the Order of the Hood. Each Order keeps a hall with an altar, a statue of its god,
 * a commander who swears in those who prove their faith, and a quartermaster who sells the Order's own armour and
 * weapons in three tiers (Oathbound, Knight, Paladin), all blessed: they count as faith weapons and faith armour, and
 * each Order's gear carries a blessing of its own.
 */
import type { Bonuses, EquipSlot, IconShape, Item, Skill } from "./data.ts";

export type OrderId = "diamond" | "ink" | "sol" | "hood" | "ember" | "dusk";
export type OrderDef = {
  id: OrderId; name: string; short: string; god: string; godName: string; godText: string;
  /** The Order's colours: the field, its light accent and its dark shade. */
  color: string; accent: string; dark: string;
  /** What the body armour looks like, what sits on the head, and what the god's statue is carved as. */
  body: "plate" | "robe" | "tunic" | "shirt"; head: IconShape; statue: `god_${OrderId}`;
  /** The blessing every piece carries, and how it reads. */
  effect: string; each: string;
  /** Where the hall stands (searched for near here) and what the quest to join asks for. */
  near: readonly [number, number]; oath: { item: string; n: number; text: string };
  /** An Order whose hall is built by a city (the Order of Dusk's, in Raria), not found in the open. */
  city?: boolean;
  /** The Order's own names for its tiers and pieces, where they differ from the knights' (the Dusk's cowls and crooks). */
  tiers?: Readonly<Record<OrderTier, string>>; pieces?: Readonly<Partial<Record<string, string>>>;
  /** The quest that must be done before the oath can be sworn, if any. */
  after?: string;
  /** The name of the leader you must meet to unlock the Order's content (its card layout, its cards): the NPC id. */
  leader: string; leaderName: string;
};
export const ORDERS: Record<OrderId, OrderDef> = {
  diamond: { id: "diamond", name: "Order of the Diamond", short: "Diamond", god: "The Good Friend", godName: "the Good Friend", godText: "A Rare Friend of legend shaped like a diamond standing on its point, blue as deep water, who kept every promise it ever made. The Order of the Diamond keeps them still.",
    color: "#627eea", accent: "#ecf0f1", dark: "#3d4f9c", body: "plate", head: "helm", statue: "god_diamond",
    effect: "Steadfast: every piece worn turns 2% of the damage you take aside (a full set with weapon and shield, 16%).", each: "2% less damage taken",
    near: [150, 392], oath: { item: "crystal_shard", n: 5, text: "five crystal shards from the Deepglass Caverns, clear as a promise" }, leader: "diamond_commander", leaderName: "Commander Isolde Vane" },
  ink: { id: "ink", name: "Order of the Ink", short: "Ink", god: "The Squid Friend", godName: "the Squid Friend", godText: "A Rare Friend of legend with a squid's crown of arms, purple as a storm at sea, who wrote the first words anyone in the Realm could read. The Order of the Ink guards what is written.",
    color: "#6b2fbf", accent: "#e6dbff", dark: "#3a1b6e", body: "robe", head: "hood", statue: "god_ink",
    effect: "Written: every piece worn gives a faith spell a 5% chance to keep its sigils (a full set, 40%).", each: "5% chance a faith spell keeps its sigils",
    near: [664, 376], oath: { item: "ink_page", n: 6, text: "six ink-stained pages from the Drowned Archive, for the Order's book" }, leader: "ink_commander", leaderName: "Commander Ottavio Inkwell" },
  sol: { id: "sol", name: "Order of the Sol", short: "Sol", god: "The Weird Friend", godName: "the Weird Friend", godText: "A Rare Friend of legend nobody could describe the same way twice, a sun of every colour at once, who laughed at the Hollow and lived. The Order of the Sol takes its strangeness for a blessing.",
    color: "#14f195", accent: "#9945ff", dark: "#0a7a4c", body: "tunic", head: "crown", statue: "god_sol",
    effect: "Weird luck: every piece worn adds 4% to the Faith XP of holy blows and faith spells, and 1% to the chance a blow lands twice (a full set, 32% and 8%).", each: "+4% Faith XP, +1% double blows",
    near: [446, 436], oath: { item: "star_sigil", n: 12, text: "twelve star sigils, for the sun has to come from somewhere" }, leader: "sol_commander", leaderName: "Commander Sunniva Brightmoor" },
  hood: { id: "hood", name: "Order of the Hood", short: "Hood", god: "The Hood Friend", godName: "the Hood Friend", godText: "A Rare Friend of legend in a deep hood the colour of new leaves in the sun, who took from the Hollow King's hoard and gave it to the villages. The Order of the Hood still keeps its ledgers in favours.",
    color: "#ccff00", accent: "#1b1b1b", dark: "#7a9a00", body: "shirt", head: "hat", statue: "god_hood",
    effect: "The Hood's ledger: every piece worn adds 4% to the coins creatures drop and 2% to your chance at a pocket (a full set, 32% and 16%).", each: "+4% coin drops, +2% pickpocketing",
    near: [556, 376], oath: { item: "coins", n: 2500, text: "two thousand five hundred coins, which will reach the villages by morning" }, leader: "hood_commander", leaderName: "Commander Robyn Greenleaf" },
  ember: { id: "ember", name: "Order of the Ember", short: "Ember", god: "The Ember", godName: "the Ember", godText: "The Order of the Ember serves no god but the fire it keeps burning: the brazier in its fortress at Ashfall has not gone out since the dragons came, and the knights hold the lava moat against them. Their statue is the flame itself.",
    color: "#ff6a2a", accent: "#ffd27a", dark: "#8a2f12", body: "plate", head: "helm", statue: "god_ember",
    effect: "Emberwarded: every piece worn turns 5% of dragonfire aside (a full set with weapon and shield, 40%).", each: "5% less dragonfire",
    near: [72, 96], oath: { item: "wyrm_scale", n: 3, text: "three wyrm scales, taken from the drakes that circle the fortress" }, leader: "ember_commander", leaderName: "Commander Brannoch Ashward" },
  dusk: { id: "dusk", name: "Order of Dusk", short: "Dusk", god: "The Wise Friend", godName: "the Wise Friend", godText: "The Order of Dusk serves the Wise Friend as Raria reads it: a Rare Friend of legend carved seated and blindfolded, a book open on its knees, who gave the Law and closed its eyes so as never to see it broken. The Order keeps the last hour of the day in silence, and its vows in the dark.",
    color: "#2a2238", accent: "#8a6ab0", dark: "#16111f", body: "robe", head: "hood", statue: "god_dusk",
    effect: "The Dusk's quiet: every piece worn makes the commandments of the Law drain 5% slower and the rites of the Wise Friend cost 4% less faith (a full set, 40% and 32%).", each: "−5% commandment drain, −4% rite cost",
    near: [26, 212], oath: { item: "dusk_sigil", n: 8, text: "eight dusk sigils, pressed at the Dusk altar in the last hour of the day (any hour will do; the Prior does not check)" }, city: true, after: "wise_friends_law",
    tiers: { oath: "Novice", knight: "Vesper", paladin: "Nocturne" }, pieces: { helm: "cowl", body: "vestment", legs: "skirts", gloves: "wraps", boots: "sandals", kite: "pavise", aegis: "aegis", mace: "censer-mace", greatmace: "great censer", staff: "crook" },
    leader: "dusk_prior", leaderName: "Prior Vesperine Caul" },
};
/** The Orders' leaders, by Order: the commander of each hall, the Prior of the Dusk. */
export const ORDER_LEADERS: Record<string, OrderId> = Object.fromEntries(Object.values(ORDERS).map(order => [order.leader, order.id])) as Record<string, OrderId>;
export const ORDER_IDS = Object.keys(ORDERS) as OrderId[];
export type OrderTier = "oath" | "knight" | "paladin";
export const ORDER_TIERS: readonly { id: OrderTier; name: string; faith: number; defence: number; scale: number; value: number }[] = [
  { id: "oath", name: "Oathbound", faith: 20, defence: 20, scale: 1, value: 1 }, { id: "knight", name: "Knight", faith: 45, defence: 45, scale: 1.9, value: 4 }, { id: "paladin", name: "Paladin", faith: 70, defence: 70, scale: 3, value: 12 },
];
type PieceDef = { id: string; name: string; slot: EquipSlot; shape: (order: OrderDef) => IconShape; kind?: (order: OrderDef) => string | undefined; bonuses: Partial<Bonuses>; value: number; weight: number; two?: boolean; staff?: boolean; speed?: number };
const PIECES: readonly PieceDef[] = [
  { id: "helm", name: "helm", slot: "head", shape: order => order.head, bonuses: { defence: 9, prayer: 1 }, value: 1200, weight: 2 },
  { id: "body", name: "cuirass", slot: "body", shape: () => "body", kind: order => order.body, bonuses: { defence: 26, prayer: 2 }, value: 3600, weight: 6 },
  { id: "legs", name: "greaves", slot: "legs", shape: () => "legs", bonuses: { defence: 16, prayer: 1 }, value: 2400, weight: 4 },
  { id: "gloves", name: "gauntlets", slot: "hands", shape: () => "gloves", bonuses: { defence: 4, attack: 1, prayer: 1 }, value: 900, weight: 1 },
  { id: "boots", name: "boots", slot: "feet", shape: () => "boots", bonuses: { defence: 4, prayer: 1 }, value: 900, weight: 1 },
  { id: "kite", name: "kite shield", slot: "shield", shape: () => "shield", bonuses: { defence: 17, prayer: 1 }, value: 2400, weight: 4 },
  { id: "aegis", name: "aegis", slot: "shield", shape: () => "aegis", bonuses: { defence: 13, prayer: 3 }, value: 2800, weight: 5 },
  { id: "mace", name: "mace", slot: "weapon", shape: () => "mace", bonuses: { attack: 24, strength: 22, prayer: 2 }, value: 3000, weight: 3, speed: 4 },
  { id: "greatmace", name: "greatmace", slot: "weapon", shape: () => "warhammer", bonuses: { attack: 34, strength: 44, prayer: 3 }, value: 4800, weight: 8, two: true, speed: 6 },
  { id: "staff", name: "staff", slot: "weapon", shape: () => "staff", bonuses: { attack: 4, strength: 5, magic: 12, prayer: 3 }, value: 3600, weight: 2, staff: true, speed: 5 },
];
const shade = (hex: string, amount: number) => { const n = parseInt(hex.slice(1), 16), c = (k: number) => Math.max(0, Math.min(255, Math.round(((n >> k) & 255) * (1 + amount)))); return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0")}`; };
/** Every Order's gear: four Orders × three tiers × ten pieces. Ids read `<order>_<tier>_<piece>`. */
export function orderGear(): Item[] {
  const items: Item[] = [];
  for (const order of ORDER_IDS.map(id => ORDERS[id])) for (const tier of ORDER_TIERS) for (const piece of PIECES) {
    const bonuses: Partial<Bonuses> = {};
    for (const [key, value] of Object.entries(piece.bonuses)) bonuses[key as keyof Bonuses] = Math.round(value * (key === "prayer" ? Math.sqrt(tier.scale) : tier.scale));
    const color = tier.id === "oath" ? shade(order.color, 0.12) : tier.id === "paladin" ? shade(order.color, -0.12) : order.color;
    const requires: Partial<Record<Skill, number>> = { prayer: tier.faith };
    if (piece.slot === "weapon") { if (piece.staff) requires.magic = tier.defence; else requires.attack = tier.defence; } else requires.defence = tier.defence;
    items.push({
      id: `${order.id}_${tier.id}_${piece.id}`, name: `${order.short} ${order.tiers?.[tier.id] ?? tier.name} ${order.pieces?.[piece.id] ?? piece.name}`, value: Math.round(piece.value * tier.value), weight: piece.weight,
      examine: `${order.tiers?.[tier.id] ?? tier.name} ${order.pieces?.[piece.id] ?? piece.name} of the ${order.name}, blessed at its altar. ${order.effect}`,
      icon: { shape: piece.shape(order), color, accent: tier.id === "paladin" ? order.accent : shade(order.accent, -0.1), kind: piece.kind?.(order) },
      equip: { slot: piece.slot, bonuses, requires, holy: true, ...(piece.two ? { twoHanded: true } : {}), ...(piece.staff ? { staff: true } : {}), ...(piece.speed ? { speed: piece.speed } : {}) },
    });
  }
  // Each Order's cape, the commander's gift for the oath.
  for (const order of ORDER_IDS.map(id => ORDERS[id])) items.push({ id: `${order.id}_cape`, name: `${order.short} cape`, examine: `The cape of the ${order.name}, given at the oath. ${order.effect}`, value: 6000, weight: 1, icon: { shape: "cape", color: order.color, accent: order.accent }, equip: { slot: "cape", bonuses: { defence: 4, prayer: 3 }, requires: { prayer: 20 } } });
  return items;
}
/** Whether the player has met an Order's leader (its content, cards and card looks open then): persisted in questData as met_<order>. */
export const metOrder = (questData: Readonly<Record<string, number>>, order: OrderId) => (questData[`met_${order}`] ?? 0) >= 1;
/** The Order an item belongs to, if any. */
export function orderOf(id: string | null | undefined): OrderId | null { if (!id) return null; const head = id.split("_")[0] as OrderId; return ORDER_IDS.includes(head) && (/_(oath|knight|paladin)_/.test(id) || id.endsWith("_cape")) ? head : null; }
/** How many pieces of an Order are worn (armour, shield, weapon and cape alike). */
export function orderPieces(equipment: Record<string, string | null | undefined>, order: OrderId) { let n = 0; for (const id of Object.values(equipment)) if (orderOf(id) === order) n++; return n; }
/** What each Order's quartermaster sells. */
export const orderStock = (order: OrderId) => ORDER_TIERS.flatMap(tier => PIECES.map(piece => `${order}_${tier.id}_${piece.id}`));
