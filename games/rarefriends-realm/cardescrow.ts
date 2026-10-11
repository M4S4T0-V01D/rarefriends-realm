/**
 * The Adventurer Card's lockbox: the items a card stands for, set aside from the rest of your things. What's in it
 * is out of your inventory and bank (it can't be worn, used, traded, dropped or made into anything, because it isn't
 * anywhere those things happen), and while a card is out (cloud/src/cards.ts holds it) it can't change at all: the save
 * service refuses a save whose lockbox differs from the card's snapshot. Redeeming the card gives its contents to the
 * redeemer and takes them from here.
 *
 * Eligibility is explicit: an item goes in only if it's tradeable and not on the bound list. Nothing is eligible by
 * default just because it's an item; a card can never carry a Friend's own state, only Realm progress.
 */
import { ITEM_LIST, item } from "./data.ts";
import { bankAdd, count, take, type Game, type Slot } from "./state.ts";

export const LOCKBOX_SIZE = 28;
/** Never in a card: quest keys and relics are untradeable already; these are the bound things that happen to be tradeable. */
const BOUND = new Set<string>(["coins"]);
export function cardEligible(id: string): boolean {
  const definition = ITEM_LIST.find(entry => entry.id === id);
  return !!definition && definition.tradeable !== false && !BOUND.has(id);
}
/** The lockbox as a save carries it: known items, whole counts, at most the box's size. */
export function cleanLockbox(raw: unknown): Slot[] {
  if (!Array.isArray(raw)) return [];
  const out: Slot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { id, n } = entry as Record<string, unknown>;
    if (typeof id !== "string" || typeof n !== "number" || !Number.isInteger(n) || n < 1 || !cardEligible(id) || out.some(slot => slot.id === id)) continue;
    out.push({ id, n: Math.min(n, 2_000_000_000) });
    if (out.length >= LOCKBOX_SIZE) break;
  }
  return out;
}
/** Put `n` of an inventory slot's item in the lockbox. Why not, when not. */
export function toLockbox(game: Game, slotIndex: number, n = Infinity): string | null {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot) return null;
  if (game.cardHeld) return "A card is out: its lockbox can't change until the card is redeemed or given up.";
  if (!cardEligible(slot.id)) return `${item(slot.id).name} can't go in a card.`;
  const existing = player.lockbox.find(entry => entry.id === slot.id);
  if (!existing && player.lockbox.length >= LOCKBOX_SIZE) return "The lockbox is full.";
  const moving = Math.min(n, count(player, slot.id));
  take(player, slot.id, moving);
  if (existing) existing.n += moving; else player.lockbox.push({ id: slot.id, n: moving });
  return null;
}
/** Take `n` of an item out of the lockbox, into the bank. Why not, when not. */
export function fromLockbox(game: Game, id: string, n = Infinity): string | null {
  const player = game.player, entry = player.lockbox.find(slot => slot.id === id);
  if (!entry) return null;
  if (game.cardHeld) return "A card is out: its lockbox can't change until the card is redeemed or given up.";
  const moving = Math.min(n, entry.n);
  bankAdd(player, id, moving); entry.n -= moving;
  if (entry.n <= 0) player.lockbox.splice(player.lockbox.indexOf(entry), 1);
  return null;
}
