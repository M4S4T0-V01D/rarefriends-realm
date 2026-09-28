/**
 * Trading between players, old-school style: a request, an offer screen where both sides put items up (any change
 * clears both accepts), a second screen to check the deal, and the swap once both have accepted it.
 *
 * There's no server, so each game keeps its own inventory; the protocol makes the swap agree on both sides. A
 * second-screen accept carries the offer it accepts, a game swaps only when it holds both sides' second accepts for
 * the same offers, and it keeps re-sending its accept for a while so a lost message can't leave half a trade.
 * Offered items stay in your pack until the swap and are checked again then.
 */
import { item, isItem } from "./data.ts";
import type { Act } from "./net.ts";
import { count, freeSlots, giveOrDrop, message, sound, take, type Game, type Slot } from "./state.ts";

export type TradeView = {
  id: string; partner: number; stage: 1 | 2; mine: Slot[]; theirs: Slot[];
  myAccept: boolean; theirAccept: boolean; note: string;
};
/** An accept, for the offers as they were (each side's revision; on the wire `rev` is the sender's and `u` the other's). */
type Accept = { stage: 1 | 2; mine: number; theirs: number; items?: Slot[] };

const tradeable = (id: string) => isItem(id) && item(id).tradeable !== false;
const same = (a: Slot[], b: Slot[]) => a.length === b.length && a.every((slot, i) => slot.id === b[i].id && slot.n === b[i].n);
const newId = () => Math.random().toString(36).slice(2, 12);

export class Trades {
  /** The open trade, if any. */
  open: { id: string; partner: number; stage: 1 | 2; mine: Slot[]; theirs: Slot[]; myRev: number; theirRev: number; myAccept: Accept | null; theirAccept: Accept | null; note: string } | null = null;
  /** Trade requests sent to us (and when), and the one we sent. */
  incoming = new Map<number, { trade: string; at: number }>(); outgoing: { to: number; trade: string; at: number } | null = null;
  /** Finished trades still re-sending their last accept, in case it was lost. */
  private finishing: { to: number; act: Act; until: number }[] = [];
  private lastResend = 0;
  private readonly send: (to: number, act: Act) => void;
  constructor(send: (to: number, act: Act) => void) { this.send = send; }

  view(): TradeView | null {
    const t = this.open;
    return t && { id: t.id, partner: t.partner, stage: t.stage, mine: t.mine, theirs: t.theirs, myAccept: !!t.myAccept && t.myAccept.stage === t.stage, theirAccept: !!t.theirAccept && t.theirAccept.stage === t.stage, note: t.note };
  }
  /** Ask another player to trade (or accept their request, if they asked first). */
  request(game: Game, partner: number, now: number) {
    if (this.open) { message(game, "You're already trading.", "warn"); return; }
    const theirs = this.incoming.get(partner);
    if (theirs) { this.start(theirs.trade, partner); this.send(partner, { kind: "trade-open", trade: theirs.trade }); this.incoming.delete(partner); return; }
    this.outgoing = { to: partner, trade: newId(), at: now };
    this.send(partner, { kind: "trade-request", trade: this.outgoing.trade });
    message(game, `Sending a trade offer to Friend #${partner}…`);
  }
  decline(game: Game) {
    if (this.open) { this.send(this.open.partner, { kind: "trade-decline", trade: this.open.id }); message(game, "You declined the trade."); }
    this.open = null;
  }
  /** Put up (or take back, with a negative n) some of an item from your pack. */
  offer(game: Game, id: string, n: number) {
    const t = this.open;
    if (!t || t.stage !== 1) return;
    if (!tradeable(id)) { message(game, "You can't trade that item.", "warn"); return; }
    const offered = t.mine.find(slot => slot.id === id)?.n ?? 0, available = count(game.player, id);
    const next = Math.max(0, Math.min(available, offered + n));
    if (next === offered) return;
    t.mine = next ? (offered ? t.mine.map(slot => slot.id === id ? { id, n: next } : slot) : [...t.mine, { id, n: next }]) : t.mine.filter(slot => slot.id !== id);
    if (t.mine.length > 28) { t.mine.pop(); return; }
    t.myRev++; t.myAccept = null; t.theirAccept = null; t.note = "";
    this.send(t.partner, { kind: "trade-offer", trade: t.id, rev: t.myRev, items: t.mine });
  }
  accept(game: Game) {
    const t = this.open;
    if (!t) return;
    if (t.stage === 2) { const problem = this.roomProblem(game); if (problem) { t.note = problem; message(game, problem, "warn"); return; } }
    t.myAccept = { stage: t.stage, mine: t.myRev, theirs: t.theirRev, items: t.stage === 2 ? t.mine : undefined };
    this.send(t.partner, { kind: "trade-accept", trade: t.id, stage: t.stage, rev: t.myRev, u: t.theirRev, items: t.stage === 2 ? t.mine : undefined });
    this.advance(game);
  }
  /** A message from another player's game. */
  receive(game: Game, from: number, act: Act, now: number) {
    const t = this.open;
    switch (act.kind) {
      case "trade-request":
        if (!act.trade) return;
        if (this.outgoing?.to === from && !this.open) {
          // We both asked at once: both sides settle on the same trade (the lower id), so every later message matches.
          const id = [this.outgoing.trade, act.trade].sort()[0];
          this.start(id, from); this.send(from, { kind: "trade-open", trade: id }); this.outgoing = null; return;
        }
        this.incoming.set(from, { trade: act.trade, at: now });
        message(game, `Friend #${from} wishes to trade with you.`, "private");
        return;
      case "trade-open":
        if (this.outgoing?.to === from && act.trade === this.outgoing.trade && !this.open) { this.start(act.trade, from); this.outgoing = null; }
        // A crossed request: if they opened the other id before our requests met, follow theirs while nothing's offered yet.
        else if (t && t.partner === from && act.trade && act.trade !== t.id && t.stage === 1 && !t.mine.length && !t.theirs.length && act.trade < t.id) t.id = act.trade;
        return;
      case "trade-decline":
        if (t && t.partner === from && act.trade === t.id) { this.open = null; message(game, "The other player declined the trade.", "warn"); }
        if (this.outgoing?.to === from) this.outgoing = null;
        this.incoming.delete(from);
        return;
      case "trade-offer":
        if (!t || t.partner !== from || act.trade !== t.id || t.stage !== 1 || act.rev === undefined || act.rev <= t.theirRev) return;
        t.theirs = (act.items ?? []).filter(slot => tradeable(slot.id)).map(slot => ({ id: slot.id, n: item(slot.id).stackable ? slot.n : Math.min(28, slot.n) }));
        t.theirRev = act.rev; t.myAccept = null; t.theirAccept = null; t.note = "";
        return;
      case "trade-accept": {
        if (!t || t.partner !== from || act.trade !== t.id || !act.stage || act.rev !== t.theirRev || act.u !== t.myRev) return;
        if (act.stage === 2 && !same(act.items ?? [], t.theirs)) { this.decline(game); message(game, "The offers didn't match, so the trade was cancelled.", "warn"); return; }
        t.theirAccept = { stage: act.stage as 1 | 2, mine: act.u, theirs: act.rev, items: act.items };
        if (act.stage === 1 && t.stage === 1) t.note = "Other player has accepted.";
        this.advance(game);
        return;
      }
      default: return;
    }
  }
  /** Re-send finished trades' accepts for a while, and forget stale requests. */
  tick(now: number) {
    // A request we sent outlives the prompt it shows the other player, so a late "Trade" click still opens on both sides.
    for (const [from, entry] of this.incoming) if (now - entry.at > 90_000) this.incoming.delete(from);
    if (this.outgoing && now - this.outgoing.at > 120_000) this.outgoing = null;
    this.finishing = this.finishing.filter(entry => entry.until > now);
    if (now - this.lastResend > 1000) { this.lastResend = now; for (const entry of this.finishing) this.send(entry.to, entry.act); }
  }

  private start(id: string, partner: number) {
    this.open = { id, partner, stage: 1, mine: [], theirs: [], myRev: 0, theirRev: 0, myAccept: null, theirAccept: null, note: "" };
  }
  private advance(game: Game) {
    const t = this.open;
    if (!t || !t.myAccept || !t.theirAccept || t.myAccept.stage !== t.stage || t.theirAccept.stage !== t.stage) return;
    if (t.stage === 1) { t.stage = 2; t.myAccept = null; t.theirAccept = null; t.note = "Check the offers carefully, then accept."; return; }
    // Both accepted the second screen for the same offers: swap.
    for (const slot of t.mine) if (count(game.player, slot.id) < slot.n) { this.decline(game); message(game, "You no longer have what you offered.", "warn"); return; }
    for (const slot of t.mine) take(game.player, slot.id, slot.n);
    for (const slot of t.theirs) giveOrDrop(game, slot.id, slot.n);
    this.finishing.push({ to: t.partner, act: { kind: "trade-accept", trade: t.id, stage: 2, rev: t.myRev, u: t.theirRev, items: t.mine }, until: performanceNow() + 10_000 });
    this.send(t.partner, { kind: "trade-done", trade: t.id });
    message(game, `Accepted trade with Friend #${t.partner}.`, "info"); sound(game, "coins");
    game.player.stats.trades = (game.player.stats.trades ?? 0) + 1;
    this.open = null;
  }
  /** Room in your pack for what you'd receive, after what you'd give away. */
  private roomProblem(game: Game) {
    const t = this.open!, player = game.player;
    let freed = 0;
    for (const slot of t.mine) {
      if (item(slot.id).stackable) { if (count(player, slot.id) === slot.n) freed++; }
      else freed += slot.n;
    }
    let needed = 0;
    for (const slot of t.theirs) needed += item(slot.id).stackable ? (count(player, slot.id) > 0 && !t.mine.some(mine => mine.id === slot.id && count(player, slot.id) === mine.n) ? 0 : 1) : slot.n;
    return needed > freeSlots(player) + freed ? "You don't have enough inventory space for this trade." : null;
  }
}
const performanceNow = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
