/**
 * Work orders: the Realm's craftsfolk pay well above market for what you can make at your level. Each patron has one
 * order a day for you alone (rolled from the day and your token), asks for the best thing you can make, and pays
 * coins, skill XP and a little Presence when you bring it. Shops buy at 40% of value; a patron pays 150% and a fee.
 */
import { BOWS, COOKING, CRAFTING, FISHING_SPOTS, FLETCH_BOWS, METALS, ROCKS, SIGILCRAFT, SKILL_NAMES, TREES, WAR_BOWS, isItem, item, smithLevel, type Skill } from "./data.ts";
import { POTIONS } from "./apothecary.ts";
import { dayNumber, hash } from "./daily.ts";
import { addXp, count, giveOrDrop, level, message, sound, take, type Game, type WorkOrder } from "./state.ts";
import { presenceXp } from "./presence.ts";

export type Patron = { skill: Skill; ask: string; thanks: string; items: () => { id: string; level: number }[] };
const SMITH_ORDER_PIECES = ["dagger", "axe", "sword", "helm", "shield", "sabre"] as const;
/** Who gives work, what they want made, and how they ask. {n} and {item} are filled in. */
export const PATRONS: Record<string, Patron> = {
  hazel: { skill: "fletching", ask: "I've a standing order for {n} {item} and both hands full of war bows.", thanks: "Good work. These'll draw true.",
    items: () => [...FLETCH_BOWS.map(entry => ({ id: entry.bow, level: entry.level })), ...WAR_BOWS.map(entry => ({ id: entry.id, level: entry.fletch })), ...BOWS.filter(bow => bow.id === "shortbow").map(bow => ({ id: bow.id, level: 1 }))] },
  smith: { skill: "smithing", ask: "The forge is hot but my arms are old. {n} {item}, if you can.", thanks: "Clean work. The Emberforge mark on every one.",
    items: () => METALS.flatMap(metal => SMITH_ORDER_PIECES.map(piece => ({ id: `${metal.id}_${piece}`, level: smithLevel(metal.id, piece) }))) },
  cook: { skill: "cooking", ask: "The castle eats like a siege. {n} {item}, and quickly.", thanks: "Oh, bless you. The King will never know how close it was.",
    items: () => Object.values(COOKING).map(entry => ({ id: entry.cooked, level: entry.level })) },
  rowan: { skill: "woodcutting", ask: "The yard's low. {n} {item}, and I'll pay yard rate and then some.", thanks: "Stacked and tallied. Fernwick thanks you.",
    items: () => Object.values(TREES).map(entry => ({ id: entry.log, level: entry.level })) },
  fisher: { skill: "fishing", ask: "My knees are gone and the pier's not getting shorter. {n} {item}?", thanks: "Fresh as the tide. Here, coin for your trouble.",
    items: () => Object.values(FISHING_SPOTS).flatMap(spot => spot.catches.map(entry => ({ id: entry.fish, level: entry.level }))) },
  saltmarrow_fishmonger: { skill: "fishing", ask: "The boats came in light. {n} {item} and I'll pay better than the boats do.", thanks: "That's the stall filled. Brine owes you a drink.",
    items: () => Object.values(FISHING_SPOTS).flatMap(spot => spot.catches.map(entry => ({ id: entry.fish, level: entry.level }))) },
  hollyhock_apothecary: { skill: "apothecary", ask: "Half the vale has a cough. {n} {item}, dear, if your hands are steady.", thanks: "Steady hands. Mind they stay that way.",
    items: () => POTIONS.map(potion => ({ id: potion.id, level: potion.level })) },
  dyemoor_tailor: { skill: "crafting", ask: "An order from the castle and no hands to fill it. {n} {item}.", thanks: "Fine stitching. I'll say they're mine, you understand.",
    items: () => CRAFTING.map(entry => ({ id: entry.product, level: entry.level })) },
  cragmaw_ore: { skill: "mining", ask: "Seam's flooded. {n} {item}, and I'll pay the dry-day rate.", thanks: "Weighed honest, for once. Here.",
    items: () => Object.values(ROCKS).filter(rock => rock.ore !== "sigil_stone").map(rock => ({ id: rock.ore, level: rock.level })) },
  quillhaven_scribe: { skill: "sigilcraft", ask: "A book of sigils half-copied and the press cold. {n} {item}.", thanks: "Pressed clean. The book's a page nearer done.",
    items: () => SIGILCRAFT.map(entry => ({ id: entry.sigil, level: entry.level })) },
};
export const PATRON_IDS = Object.keys(PATRONS);

/** How many of a thing an order asks for: more of cheap things, a few of dear ones. */
export const orderCount = (value: number) => Math.max(3, Math.min(15, Math.round(1500 / Math.max(30, value))));
/** What an order pays: half as much again as the thing is worth, plus a fee that grows with your level. */
export const orderPay = (n: number, value: number, skillLevel: number) => Math.round(n * value * 1.5 + 150 + 12 * skillLevel);
/** Today's order from a patron (rolled on first asking; yours alone), or null when you can't make anything they'd want yet. */
export function currentOrder(game: Game, npc: string, now = Date.now()): WorkOrder | null {
  const patron = PATRONS[npc]; if (!patron) return null;
  const player = game.player, day = dayNumber(now), existing = player.orders[npc];
  if (existing && existing.day === day) return existing;
  const lvl = level(game, patron.skill), pool = patron.items().filter(entry => isItem(entry.id) && entry.level <= lvl).sort((a, b) => b.level - a.level || a.id.localeCompare(b.id)).slice(0, 4);
  if (!pool.length) { delete player.orders[npc]; return null; }
  const pick = pool[Math.floor(hash(day * 1_000_003 + player.friendId % 1_000_003, PATRON_IDS.indexOf(npc) * 7 + 3) * pool.length)];
  const value = Math.max(1, item(pick.id).value), n = orderCount(value);
  const order: WorkOrder = { day, item: pick.id, n, pay: orderPay(n, value, lvl), xp: n * (lvl * 4 + 20), done: 0 };
  player.orders[npc] = order;
  return order;
}
export const orderText = (order: WorkOrder) => `${order.n} × ${item(order.item).name.toLowerCase()}`;
export const askText = (npc: string, order: WorkOrder) => PATRONS[npc].ask.replace("{n}", String(order.n)).replace("{item}", `${item(order.item).name.toLowerCase()}${order.n > 1 && !item(order.item).name.endsWith("s") ? "s" : ""}`);
/** Hand over today's order: coins (15% more in a Chronicler's mantle), XP in the patron's skill, and a little Presence. */
export function fillOrder(game: Game, npc: string, now = Date.now()): boolean {
  const order = currentOrder(game, npc, now), player = game.player, patron = PATRONS[npc];
  if (!order || order.done || count(player, order.item) < order.n) return false;
  take(player, order.item, order.n);
  const pay = Math.round(order.pay * (player.equipment.body === "chroniclers_mantle" ? 1.15 : 1));
  giveOrDrop(game, "coins", pay); addXp(game, patron.skill, order.xp, { raw: true }); presenceXp(game, 40);
  order.done = 1; player.stats.orders = (player.stats.orders ?? 0) + 1;
  message(game, `Work order filled: ${orderText(order)}. ${pay.toLocaleString()} coins and ${order.xp.toLocaleString()} ${SKILL_NAMES[patron.skill]} XP.`, "quest"); sound(game, "coins");
  return true;
}
/** Orders from a save, checked. */
export function cleanOrders(raw: unknown): Record<string, WorkOrder> {
  const out: Record<string, WorkOrder> = {};
  if (!raw || typeof raw !== "object") return out;
  const int = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : null;
  for (const [npc, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!PATRONS[npc] || !value || typeof value !== "object") continue;
    const e = value as Record<string, unknown>, day = int(e.day, 0, 1e7), n = int(e.n, 1, 100), pay = int(e.pay, 0, 1e7), xp = int(e.xp, 0, 1e7);
    if (day === null || n === null || pay === null || xp === null || typeof e.item !== "string" || !isItem(e.item)) continue;
    out[npc] = { day, item: e.item, n, pay, xp, done: e.done === 1 ? 1 : 0 };
  }
  return out;
}
