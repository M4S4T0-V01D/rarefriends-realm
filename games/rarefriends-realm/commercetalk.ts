/**
 * The Frenderal Exchange's people and furniture (commerce.ts, commerceworld.ts): the broker, the five investors, and the
 * market board, the company ledgers, the order board and the price lists, each opening the Exchange's window on its tab.
 */
import { level, sound, type Dialogue, type Game } from "./state.ts";
import type { WorldObject } from "./world.ts";
import { chat, npcSays, type NpcDef } from "./content.ts";
import { COMMERCE, INVESTORS, answer, hourNow, questionFor, type InvestorId } from "./commerce.ts";

const person = (id: string, name: string, examine: string, seed: number, options: readonly string[] = ["Talk-to"]): NpcDef => ({ id, name, examine, options: [...options], art: { family: 9, seed } });
export const COMMERCE_NPCS: Record<string, NpcDef> = {
  exchange_broker: person("exchange_broker", "Broker Wenna Pell", "The Exchange's broker: she chalks up the prices, keeps the order board, and takes a fee on everything, cheerfully.", 2201, ["Talk-to", "Trade"]),
  investor_whale: person("investor_whale", "Old Hesper, the Whale", "She owns a little of everything and sells almost nothing. They call her the Whale; she says she's only patient.", 2202),
  investor_wolf: person("investor_wolf", "Ivo Rask, the Wolf", "Quick eyes, quicker trades. The Wolf buys what's falling and sells what's rising, and is right more often than he's wrong. Just.", 2203),
  investor_bull: person("investor_bull", "Bram Oakhart, the Bull", "Backs new ventures, new routes, new seams. Every year is the year everything grows, to the Bull.", 2204),
  investor_bear: person("investor_bear", "Margit Thorne, the Bear", "Reads a company's debts before its boasts. The Bear has never lost much, and never made much, and thinks that's the point.", 2205),
  investor_fox: person("investor_fox", "Lisette Vane, the Fox", "Knows somebody who knows somebody. Half of what the Fox hears is true; the trick, she says, is knowing which half.", 2206),
};
/** What each investor's about, before their question. */
const CREED: Record<InvestorId, string> = {
  investor_whale: "Buy what you understand, hold it longer than you can bear, and never be the one in a hurry.",
  investor_wolf: "The price is what it is this hour. Next hour it's something else. I'm in the space between.",
  investor_bull: "Find what's growing, and grow with it. Output up, demand up: that's a company going somewhere.",
  investor_bear: "Everyone asks what a company makes. Ask what it owes. Debt's the storm nobody sees coming.",
  investor_fox: "I hear things. Some of them are even so. Check them in the ledgers before you trust them, and you'll do well by me.",
};

/** The Exchange's people. Null when the NPC isn't one of them. */
export function talkCommerce(game: Game, npcId: string, name: string): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  if (npcId === "exchange_broker") {
    return chat(name, npcSays(name, "The Frenderal Exchange. Shares in five companies, an order board for anyone with goods to sell, and every shop's prices in the Realm, if you want to know where to sell. A fee on every trade, posted on the wall."), [
      { label: "Show me the market.", then: () => { game.ui.exchange = "market"; return null; } },
      { label: "What's on the order board?", then: () => { game.ui.exchange = "orders"; return null; } },
      { label: "How does it work?", then: () => says("Buy shares at the market board, sell them back when you like; prices move by the hour with each company's fortunes, and you pay a fee each way, so trading back and forth only feeds me.", `Fill orders from the board for more than the goods would fetch in a shop. At Commerce ${COMMERCE.reportsLevel} the ledgers are open to you, and the investors start asking you things. Read the ledgers before you answer them.`) },
      { label: "Goodbye.", then: () => null }]);
  }
  if ((INVESTORS as readonly string[]).includes(npcId)) {
    const investor = npcId as InvestorId;
    const lv = level(game, "commerce");
    if (lv < COMMERCE.questionsLevel) return says(CREED[investor], `Come back with some Commerce about you: Commerce ${COMMERCE.questionsLevel}, and I'll have a question for you.`);
    const q = questionFor(investor, hourNow());
    return chat(name, npcSays(name, CREED[investor]), [
      { label: "Have you a question for me?", then: () => chat(name, npcSays(name, q.text), [
        ...q.options.map((o, k) => ({ label: o.label, then: () => says(answer(game, investor, k)) })),
        { label: "Let me check the ledgers first.", then: () => null }]) },
      { label: "Goodbye.", then: () => null }]);
  }
  return null;
}

/** The Exchange's furniture: each opens the window on its tab. */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const opens = (tab: NonNullable<Game["ui"]["exchange"]>, verb: string, examine: string): Clue => ({
  options: () => [verb, "Examine"], examine: () => examine,
  use: game => { game.ui.exchange = tab; sound(game, "click"); return null; },
});
export const COMMERCE_CLUES: Record<string, Clue> = {
  exchange_board: opens("market", "Trade", "Every company's share price, chalked up by the hour, and the change since yesterday."),
  exchange_ledgers: opens("reports", "Read", `The companies' ledgers: output, debt, demand and news. Open to traders of Commerce ${COMMERCE.reportsLevel}.`),
  exchange_orders: opens("orders", "Read", "The merchants' orders: goods wanted, and what they'll pay for them."),
  exchange_prices: opens("prices", "Read", `What the Realm's shops pay and ask, shop by shop. Open to traders of Commerce ${COMMERCE.pricesLevel}.`),
};
