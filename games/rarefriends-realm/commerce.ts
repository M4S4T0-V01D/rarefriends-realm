/**
 * Commerce (FutureExpansions/Skill/Commerce.md): the Realm's economy as a skill. Its home is the Frenderal Exchange at
 * Gullwick (commerceworld.ts): the market board, the company ledgers, the order board, the broker and the five investors.
 *
 * The market: five fictional companies, each with its trade, its town and its risks. Prices are the same for everyone,
 * worked out from the hour (the world's clock, not the player's save): each company's fair value follows its
 * fundamentals (output, debt, demand), which drift from day to day and are moved by events (a strike, a rich seam, a
 * storm); the price walks round the fair value an hour at a time, pulled back towards it, jolted by the events as they
 * happen. Nothing is drawn from the game's random stream, so a price can't be re-rolled by saving and loading, and the
 * clock can't be turned back to trade on prices already seen (the highest hour the market has been looked at is kept).
 * Trading costs a fee each way, so buying and selling back can't make anything; holdings are capped by level, so what
 * reading the reports can earn stays bounded. Everything is in Frens, inside the Realm; nothing here is real money.
 *
 * Training: merchant orders (goods sourced and delivered: the main way, paid a little over what they're worth), research
 * (each company's report, once a day), the investors' questions (answered from the reports, once a day each), and the
 * first trade in each company each day. No XP for the amount of money moved or for trading back and forth.
 *
 * Authoritative in the engine: the game's economy lives in the player's own save (there's no market server), so every
 * check (balances, holdings, fees, quotes, caps, the clock) is made here, and the tests hold it to them.
 */
import { ITEM_LIST, SHOPS, item, type ShopDef } from "./data.ts";
import { addXp, canHold, count, give, level, message, sound, take, type Game } from "./state.ts";

// ---------- The companies ----------
export const COMPANY_IDS = ["zlatna_mining", "emberforge_works", "gullwick_carrying", "house_marigold", "farwake_ventures"] as const;
export type CompanyId = typeof COMPANY_IDS[number];
type EventDef = { id: string; name: string; text: string; shock: number; output?: number; debt?: number; demand?: number; days: number };
export type Company = { id: CompanyId; name: string; trade: string; town: string; about: string; base: number; vol: number; risks: string; events: readonly EventDef[] };
export const COMPANIES: Record<CompanyId, Company> = {
  zlatna_mining: { id: "zlatna_mining", name: "The Zlatna Gora Mining Company", trade: "Mining", town: "Zlatna Gora", base: 40, vol: 0.013,
    about: "Iron, coal and silver out of Zlatna Gora's deep seams, sold down the Bereza. The Freeholds Compact holds the most shares; the princes would like to.",
    risks: "A strike, a flooded level or a heavier tithe; and seams run out.",
    events: [
      { id: "rich_seam", name: "A rich seam", text: "The miners broke into a rich seam on the lower level.", shock: 0.12, output: 0.25, days: 6 },
      { id: "strike", name: "A strike", text: "The miners put their picks down over pay.", shock: -0.1, output: -0.35, days: 4 },
      { id: "flood", name: "A flooded level", text: "Water broke into the lower level; the pumps are working day and night.", shock: -0.14, output: -0.3, debt: 0.2, days: 5 },
      { id: "tithe", name: "A heavier tithe", text: "The princes raised their tithe on the ore that leaves the mountain.", shock: -0.06, demand: -0.15, days: 7 },
    ] },
  emberforge_works: { id: "emberforge_works", name: "Emberforge Works", trade: "Smithing", town: "Emberforge", base: 65, vol: 0.01,
    about: "Bars, blades and fittings from the furnaces under Emberforge, sold to shipwrights, armouries and anyone building anything.",
    risks: "Ore that doesn't come, a furnace that goes out, and orders that dry up in a quiet year.",
    events: [
      { id: "great_order", name: "A great order", text: "The shipwrights of the north ordered a season's fittings.", shock: 0.09, demand: 0.3, days: 6 },
      { id: "furnace_fire", name: "A furnace fire", text: "Fire took the great furnace's roof; it's being rebuilt.", shock: -0.12, output: -0.3, debt: 0.15, days: 5 },
      { id: "ore_short", name: "Short of ore", text: "Ore from the mines is late; the furnaces are banked.", shock: -0.07, output: -0.2, days: 4 },
    ] },
  gullwick_carrying: { id: "gullwick_carrying", name: "The Gullwick Carrying Company", trade: "Shipping", town: "Gullwick", base: 30, vol: 0.015,
    about: "Barges and coasters out of Gullwick, carrying timber, ore, grain and anything else to every port on the open seas.",
    risks: "Storms, losses at sea, and the insurers' bills.",
    events: [
      { id: "new_route", name: "A new route", text: "The company opened a regular run to the northern ports.", shock: 0.1, demand: 0.25, days: 7 },
      { id: "storm", name: "A storm", text: "Two coasters were lost in a storm off the Pale Coast.", shock: -0.13, output: -0.25, debt: 0.15, days: 5 },
      { id: "claim", name: "An insurance claim", text: "A cargo claim went against the company at the Exchange.", shock: -0.06, debt: 0.2, days: 6 },
    ] },
  house_marigold: { id: "house_marigold", name: "House Marigold", trade: "Merchant house", town: "Dyemoor", base: 50, vol: 0.007,
    about: "Dyemoor's oldest merchant house: dyes, cloth and the finished goods, sold by agents in every town with a market.",
    risks: "A fashion that passes, and a dye crop that fails.",
    events: [
      { id: "fair", name: "A great fair", text: "House Marigold's agents sold out at the autumn fair.", shock: 0.06, demand: 0.2, days: 5 },
      { id: "dye_crop", name: "A poor dye crop", text: "The madder crop failed in the Dyemoor fields.", shock: -0.07, output: -0.2, days: 7 },
    ] },
  farwake_ventures: { id: "farwake_ventures", name: "The Farwake Venture Company", trade: "Expeditions", town: "Skarnholm", base: 20, vol: 0.022,
    about: "Charts voyages out past the known coasts, and sells shares in what they bring back. Some come back rich. Some don't come back.",
    risks: "Everything a voyage can meet, and debts taken out against cargoes not yet found.",
    events: [
      { id: "discovery", name: "A discovery", text: "A Farwake voyage came home with charts of an unknown coast and a hold of furs.", shock: 0.2, output: 0.3, demand: 0.2, days: 6 },
      { id: "lost", name: "A voyage lost", text: "A Farwake voyage hasn't come back, and the season's gone.", shock: -0.2, output: -0.3, debt: 0.25, days: 6 },
      { id: "charter", name: "A new charter", text: "The jarls chartered a Farwake voyage at their own expense.", shock: 0.08, demand: 0.15, days: 5 },
    ] },
};

// ---------- The rules ----------
export const COMMERCE = {
  /** The fee on every trade, both ways: a share of what changes hands, and never less than the minimum. */
  feeRate: 0.015, feeMin: 5,
  /** The most shares of any one company a player may hold: so much, and so much more each level. */
  sharesBase: 100, sharesPerLevel: 20,
  /** The most shares in one trade. */
  tradeMax: 5000,
  /** Merchant orders: so many on the board at a time, renewed every so many hours. */
  orders: 3, orderHours: 4,
  /** What an order pays over what its goods are worth. */
  orderPremium: 1.3,
  /** Levels: regional prices, the company reports, the investors' questions, the production analysis. */
  pricesLevel: 5, reportsLevel: 10, questionsLevel: 10, analysisLevel: 40,
  /** The trades and reports remembered. */
  historyKeep: 60,
} as const;
/** The hour the market's history begins (every price walks from here): two months before the Exchange opened its doors, so it has a past to read. */
export const MARKET_START = Math.floor(Date.UTC(2026, 7, 15) / 3_600_000);
/** The world's hour (the market's clock): the hour of the real date, the same for everyone. */
export const hourNow = (ms: number = Date.now()) => Math.floor(ms / 3_600_000);
const dayOf = (hour: number) => Math.floor(hour / 24);

// ---------- Deterministic noise: the same numbers for everyone, every time ----------
const hash = (...n: number[]) => { let h = 2166136261; for (const v of n) { h ^= Math.floor(v) & 0xffffffff; h = Math.imul(h, 16777619); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; } return h >>> 0; };
const unit = (...n: number[]) => hash(...n) / 4294967296;
const gauss = (...n: number[]) => { const u = Math.max(1e-9, unit(...n, 1)), v = unit(...n, 2); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const companyIndex = (id: CompanyId) => COMPANY_IDS.indexOf(id);
/** A smooth wander from day to day (anchors a week apart, eased between), round 1. */
const wander = (c: number, which: number, day: number, spread: number) => {
  const w = Math.floor(day / 7), f = (day - w * 7) / 7, s = f * f * (3 - 2 * f);
  const a = unit(c, which, w) * 2 - 1, b = unit(c, which, w + 1) * 2 - 1;
  return 1 + (a + (b - a) * s) * spread;
};

// ---------- Events and fundamentals ----------
export type MarketEvent = { company: CompanyId; event: EventDef; day: number; hour: number };
/** The event a company has on a day, if any (about one day in eight). */
export function eventOn(id: CompanyId, day: number): MarketEvent | null {
  const c = companyIndex(id); if (unit(c, 77, day) >= 0.125) return null;
  const list = COMPANIES[id].events, event = list[Math.floor(unit(c, 78, day) * list.length) % list.length];
  return { company: id, event, day, hour: day * 24 + Math.floor(unit(c, 79, day) * 24) };
}
export type Fundamentals = { output: number; debt: number; demand: number };
/** A company's fundamentals on a day: each round 1 (normal), wandering, and moved by the events of the days before that are still felt. */
export function fundamentals(id: CompanyId, day: number): Fundamentals {
  const c = companyIndex(id), f = { output: wander(c, 1, day, 0.18), debt: wander(c, 2, day, 0.22), demand: wander(c, 3, day, 0.16) };
  for (let d = day - 8; d < day; d++) {
    const e = eventOn(id, d); if (!e || day - d > e.event.days) continue;
    const left = 1 - (day - d - 1) / e.event.days;
    f.output += (e.event.output ?? 0) * left; f.debt += (e.event.debt ?? 0) * left; f.demand += (e.event.demand ?? 0) * left;
  }
  return { output: Math.max(0.3, f.output), debt: Math.max(0.3, f.debt), demand: Math.max(0.3, f.demand) };
}
/** What a share is worth on a day, by its fundamentals. */
export function fairValue(id: CompanyId, day: number) {
  const f = fundamentals(id, day);
  return COMPANIES[id].base * Math.pow(f.output, 0.5) * Math.pow(f.demand, 0.6) / (0.7 + 0.3 * f.debt);
}

// ---------- Prices ----------
/** Every company's log price by hour from the market's opening (kept as it's worked out: a price never changes once it's been). */
const walked = new Map<CompanyId, number[]>();
const PULL = 0.025;
function logPrice(id: CompanyId, hour: number): number {
  const c = companyIndex(id), series = walked.get(id) ?? [Math.log(COMPANIES[id].base)];
  walked.set(id, series);
  const want = Math.max(0, hour - MARKET_START);
  for (let k = series.length; k <= want; k++) {
    const h = MARKET_START + k, day = dayOf(h), prev = series[k - 1], fair = Math.log(fairValue(id, day));
    const e = eventOn(id, day), shock = e && e.hour === h ? e.event.shock : 0;
    series.push(prev + COMPANIES[id].vol * gauss(c, 5, h) + PULL * (fair - prev) + shock);
  }
  return series[want];
}
/** A share's price at an hour (whole Frens, at least 1). Before the market opened, the opening price. */
export const priceAt = (id: CompanyId, hour: number) => Math.max(1, Math.round(Math.exp(logPrice(id, hour))));
/** The news: the events that have happened, newest first, up to an hour (never one still to come). */
export function newsUpTo(hour: number, days = 14, only?: CompanyId): MarketEvent[] {
  const out: MarketEvent[] = [];
  for (let d = dayOf(hour); d > dayOf(hour) - days; d--) for (const id of only ? [only] : COMPANY_IDS) { const e = eventOn(id, d); if (e && e.hour <= hour && d >= dayOf(MARKET_START)) out.push(e); }
  return out.sort((a, b) => b.hour - a.hour);
}

// ---------- The player's side ----------
export type Trade = { h: number; c: CompanyId; n: number; price: number; fee: number };
export type CommerceState = {
  /** Shares held, what they cost (for the average), and the hour each holding began. */
  shares: Partial<Record<CompanyId, number>>; cost: Partial<Record<CompanyId, number>>; since: Partial<Record<CompanyId, number>>;
  history: Trade[];
  /** The highest market hour seen: the clock can't be turned back past it. */
  seen: number;
  /** Today (a market day): what's been done that pays XP once a day. */
  day: number; traded: CompanyId[]; read: CompanyId[]; asked: string[];
  /** The merchant orders done in the current period (a period is COMMERCE.orderHours long). */
  period: number; done: number[];
};
export const newCommerce = (): CommerceState => ({ shares: {}, cost: {}, since: {}, history: [], seen: 0, day: 0, traded: [], read: [], asked: [], period: 0, done: [] });
const isCompany = (v: unknown): v is CompanyId => typeof v === "string" && (COMPANY_IDS as readonly string[]).includes(v);
const int = (v: unknown, lo: number, hi: number, d = 0) => typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d;
/** A save's commerce, checked field by field (anything malformed is dropped). */
export function cleanCommerce(raw: unknown): CommerceState {
  const r = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}, out = newCommerce();
  const map = (v: unknown, hi: number) => Object.fromEntries(Object.entries(v && typeof v === "object" ? v as Record<string, unknown> : {}).filter(([k]) => isCompany(k)).map(([k, n]) => [k, int(n, 0, hi)]).filter(([, n]) => (n as number) > 0));
  out.shares = map(r.shares, 1e6); out.cost = map(r.cost, 1e12); out.since = map(r.since, 1e9);
  out.history = (Array.isArray(r.history) ? r.history : []).filter((t): t is Record<string, unknown> => !!t && typeof t === "object" && isCompany((t as Record<string, unknown>).c))
    .slice(-COMMERCE.historyKeep).map(t => ({ h: int(t.h, 0, 1e9), c: t.c as CompanyId, n: int(t.n, -1e6, 1e6), price: int(t.price, 0, 1e9), fee: int(t.fee, 0, 1e12) }));
  out.seen = int(r.seen, 0, 1e9); out.day = int(r.day, 0, 1e8); out.period = int(r.period, 0, 1e9);
  out.traded = (Array.isArray(r.traded) ? r.traded : []).filter(isCompany); out.read = (Array.isArray(r.read) ? r.read : []).filter(isCompany);
  out.asked = (Array.isArray(r.asked) ? r.asked : []).filter((v): v is string => typeof v === "string" && v.length < 24).slice(0, 10);
  out.done = (Array.isArray(r.done) ? r.done : []).filter((v): v is number => typeof v === "number" && v >= 0 && v < COMMERCE.orders);
  return out;
}
/** The day's once-a-day lists, emptied when the market day turns. */
function today(game: Game, hour: number) {
  const s = game.player.commerce, day = dayOf(hour);
  if (s.day !== day) { s.day = day; s.traded = []; s.read = []; s.asked = []; }
  return s;
}
/** Whether the market can be used at this hour: not before the hour already seen (the clock turned back). Marks the hour seen. */
export function marketProblem(game: Game, hour: number): string | null {
  const s = game.player.commerce;
  if (hour < s.seen) return "The Exchange's clocks say it's later than that. Come back when the hour has caught up.";
  s.seen = hour; return null;
}
export const sharesCap = (game: Game) => COMMERCE.sharesBase + COMMERCE.sharesPerLevel * level(game, "commerce");
export const tradeFee = (gross: number) => Math.max(COMMERCE.feeMin, Math.ceil(gross * COMMERCE.feeRate));
export type Quote = { id: CompanyId; side: "buy" | "sell"; n: number; hour: number; price: number; gross: number; fee: number; total: number; problem: string | null };
/** What a trade would cost or bring, now: shown before it's confirmed (the price, the fee, the total), and why it can't be done if it can't. */
export function quote(game: Game, id: CompanyId, side: "buy" | "sell", n: number, hour: number): Quote {
  const price = priceAt(id, hour), whole = Number.isInteger(n) ? n : 0, gross = price * whole, fee = whole > 0 ? tradeFee(gross) : 0, total = side === "buy" ? gross + fee : gross - fee;
  const held = game.player.commerce.shares[id] ?? 0, s = game.player.commerce;
  let problem: string | null = null;
  if (!isCompany(id)) problem = "No such company.";
  else if (whole < 1 || whole > COMMERCE.tradeMax) problem = `Between 1 and ${COMMERCE.tradeMax.toLocaleString()} shares at a time.`;
  else if (hour < s.seen) problem = "The Exchange's clocks say it's later than that. Come back when the hour has caught up.";
  else if (side === "buy" && held + whole > sharesCap(game)) problem = `You may hold ${sharesCap(game).toLocaleString()} shares of one company at your Commerce level.`;
  else if (side === "buy" && count(game.player, "coins") < total) problem = `That costs ${total.toLocaleString()} Frens, with the fee.`;
  else if (side === "sell" && whole > held) problem = `You hold ${held.toLocaleString()} shares.`;
  else if (side === "sell" && total <= 0) problem = "The fee would take everything.";
  else if (side === "sell" && !canHold(game.player, "coins", total)) problem = "No room in your pack for the Frens.";
  return { id, side, n: whole, hour, price, gross, fee, total, problem };
}
/** Make a trade at the price quoted: refused if the hour has moved since the quote (look again), or if anything's changed that makes it impossible. Frens and shares change hands together, or not at all. */
export function trade(game: Game, id: CompanyId, side: "buy" | "sell", n: number, quotedHour: number, hour: number = hourNow()): string {
  if (hour !== quotedHour) return "The price has moved since you looked: look again.";
  const q = quote(game, id, side, n, hour); if (q.problem) return q.problem;
  const s = game.player.commerce, player = game.player, name = COMPANIES[id].name;
  if (marketProblem(game, hour)) return "The Exchange's clocks say it's later than that.";
  if (side === "buy") {
    if (!take(player, "coins", q.total)) return `That costs ${q.total.toLocaleString()} Frens, with the fee.`;
    if (!s.shares[id]) s.since[id] = hour;
    s.shares[id] = (s.shares[id] ?? 0) + q.n; s.cost[id] = (s.cost[id] ?? 0) + q.total;
  } else {
    const held = s.shares[id] ?? 0, costShare = Math.round((s.cost[id] ?? 0) * q.n / held);
    if (!canHold(player, "coins", q.total) || give(player, "coins", q.total) > 0) return "No room in your pack for the Frens.";
    s.shares[id] = held - q.n; s.cost[id] = Math.max(0, (s.cost[id] ?? 0) - costShare);
    if (!s.shares[id]) { delete s.shares[id]; delete s.cost[id]; delete s.since[id]; }
  }
  s.history.push({ h: hour, c: id, n: side === "buy" ? q.n : -q.n, price: q.price, fee: q.fee }); if (s.history.length > COMMERCE.historyKeep) s.history.splice(0, s.history.length - COMMERCE.historyKeep);
  // XP: the first trade in each company each day, whatever its size (no XP for the money moved, or for trading back and forth).
  const d = today(game, hour);
  if (!d.traded.includes(id)) { d.traded.push(id); addXp(game, "commerce", 10 + 2 * level(game, "commerce"), { raw: true }); }
  sound(game, "coins");
  return side === "buy" ? `You buy ${q.n.toLocaleString()} shares of ${name} at ${q.price.toLocaleString()} Frens, and pay ${q.total.toLocaleString()} Frens with the fee.`
    : `You sell ${q.n.toLocaleString()} shares of ${name} at ${q.price.toLocaleString()} Frens, and take ${q.total.toLocaleString()} Frens after the fee.`;
}
/** A holding's worth now, and what it cost. */
export function holdings(game: Game, hour: number) {
  const s = game.player.commerce;
  return COMPANY_IDS.flatMap(id => { const n = s.shares[id] ?? 0; return n > 0 ? [{ id, n, price: priceAt(id, hour), worth: n * priceAt(id, hour), cost: s.cost[id] ?? 0, since: s.since[id] ?? hour }] : []; });
}

// ---------- Research: the company reports ----------
export type Report = { id: CompanyId; lines: string[]; days: { day: number; output: number; debt: number; demand: number; price: number }[]; news: MarketEvent[]; fair?: [number, number] };
const pct = (v: number) => Math.round(v * 100);
/** A company's report: its profile, its fundamentals for the last week (as far as yesterday: today's aren't in yet), its news, its price; at Commerce 40, an estimate of what a share is worth. */
export function report(game: Game, id: CompanyId, hour: number): Report {
  const c = COMPANIES[id], day = dayOf(hour), days = [];
  for (let d = day - 7; d < day; d++) { const f = fundamentals(id, d); days.push({ day: d, output: pct(f.output), debt: pct(f.debt), demand: pct(f.demand), price: priceAt(id, d * 24 + 23) }); }
  const out: Report = { id, lines: [c.about, `Trade: ${c.trade}. Based at ${c.town}.`, `Risks: ${c.risks}`], days, news: newsUpTo(hour, 14, id) };
  if (level(game, "commerce") >= COMMERCE.analysisLevel) { const fair = fairValue(id, day - 1); out.fair = [Math.round(fair * 0.88), Math.round(fair * 1.12)]; }
  return out;
}
/** Read a company's report (Commerce 10): Commerce XP the first time each day. */
export function readReport(game: Game, id: CompanyId, hour: number = hourNow()): Report | string {
  if (!isCompany(id)) return "No such company.";
  if (level(game, "commerce") < COMMERCE.reportsLevel) return `The company ledgers are open to traders of Commerce ${COMMERCE.reportsLevel}.`;
  const problem = marketProblem(game, hour); if (problem) return problem;
  const d = today(game, hour);
  if (!d.read.includes(id)) { d.read.push(id); addXp(game, "commerce", 20 + 3 * level(game, "commerce"), { raw: true }); }
  return report(game, id, hour);
}

// ---------- The investors' questions ----------
export const INVESTORS = ["investor_whale", "investor_wolf", "investor_bull", "investor_bear", "investor_fox"] as const;
export type InvestorId = typeof INVESTORS[number];
export type Question = { investor: InvestorId; text: string; options: { label: string; right: boolean }[] };
/** Each investor's question for the day, answered from the reports (or, the Whale's, from what you hold). The same for everyone. */
export function questionFor(investor: InvestorId, hour: number): Question {
  const day = dayOf(hour), yesterday = day - 1, names = COMPANY_IDS.map(id => COMPANIES[id].name);
  const best = (score: (id: CompanyId) => number) => COMPANY_IDS.reduce((a, b) => score(b) > score(a) ? b : a);
  const pick = (right: CompanyId) => COMPANY_IDS.map((id, k) => ({ label: names[k], right: id === right }));
  switch (investor) {
    case "investor_bear": return { investor, text: "Debt sinks more companies than storms do. Which of the five owed the most yesterday, by its own ledger?", options: pick(best(id => fundamentals(id, yesterday).debt)) };
    case "investor_bull": return { investor, text: "I back what's growing. Whose output rose the most over the last week, to yesterday?", options: pick(best(id => fundamentals(id, yesterday).output / fundamentals(id, yesterday - 6).output)) };
    case "investor_wolf": return { investor, text: "Quick, then. Which share has gained the most since this hour yesterday?", options: pick(best(id => priceAt(id, hour) / priceAt(id, hour - 24))) };
    case "investor_fox": {
      const id = COMPANY_IDS[hash(day, 404) % COMPANY_IDS.length], metric = (["output", "debt", "demand"] as const)[hash(day, 405) % 3], up = hash(day, 406) % 2 === 0;
      const rose = fundamentals(id, yesterday)[metric] > fundamentals(id, yesterday - 6)[metric];
      const text = up ? `I hear things. I hear the ${metric} at ${COMPANIES[id].name} went up over the last week. Is that so, or isn't it?` : `I hear things. I hear the ${metric} at ${COMPANIES[id].name} went down over the last week. Is that so, or isn't it?`;
      return { investor, text, options: [{ label: "It's so.", right: rose === up }, { label: "It isn't.", right: rose !== up }] };
    }
    case "investor_whale": return { investor, text: "Anyone can buy. Holding is the trade. Come back when you've held shares in one company, ten or more, for three days.", options: [{ label: "I have.", right: true }] };
  }
}
/** Answer an investor's question: Commerce XP when it's right, once a day each, right or wrong (no guessing round again). */
export function answer(game: Game, investor: InvestorId, choice: number, hour: number = hourNow()): string {
  if (level(game, "commerce") < COMMERCE.questionsLevel) return "Come back when you've some Commerce about you.";
  const problem = marketProblem(game, hour); if (problem) return problem;
  const d = today(game, hour); if (d.asked.includes(investor)) return "One question a day. Come back tomorrow.";
  const q = questionFor(investor, hour), picked = q.options[choice]; if (!picked) return "That's not an answer.";
  if (investor === "investor_whale") {
    const s = game.player.commerce, held = COMPANY_IDS.some(id => (s.shares[id] ?? 0) >= 10 && (s.since[id] ?? hour) <= hour - 72);
    if (!held) return "Not yet. Ten shares or more, one company, three days. Patience is the whole of it.";
  }
  d.asked.push(investor);
  if (!picked.right) return "No. Read the ledgers again; it's all in there.";
  addXp(game, "commerce", 40 + 4 * level(game, "commerce"), { raw: true }); sound(game, "quest");
  return "Right. You've been reading.";
}

// ---------- Merchant orders ----------
/** The goods an order may ask for, by the Commerce level that opens them. */
const ORDER_GOODS: readonly (readonly [number, readonly string[]])[] = [
  [1, ["logs", "raw_carp", "carp", "bread", "pewter_ore", "clay", "wool", "cowhide"]],
  [10, ["oak_logs", "pewter_bar", "blackiron_ore", "char", "leather", "string"]],
  [20, ["willow_logs", "blackiron_bar", "inkcoal", "grayling", "oak_planks"]],
  [35, ["maple_logs", "ashsteel_bar", "moonsilver_ore", "inkcrab"]],
  [50, ["yew_logs", "moonsilver_bar", "pine_planks", "sailfish", "glimmer_ore"]],
];
export type Order = { slot: number; item: string; n: number; pay: number; xp: number };
const periodOf = (hour: number) => Math.floor(hour / COMMERCE.orderHours);
/** The orders on the board now (renewed every few hours; the same three for anyone of the same level, for the period). Bulk orders (more of a thing, at a better rate) from Commerce 20. */
export function ordersFor(game: Game, hour: number): Order[] {
  // (Goods from the two highest tiers open to you: the orders grow with you.)
  const lv = level(game, "commerce"), period = periodOf(hour), pool = ORDER_GOODS.filter(([need]) => lv >= need).slice(-2).flatMap(([, ids]) => ids).filter(id => ITEM_LIST.some(i => i.id === id));
  return Array.from({ length: COMMERCE.orders }, (_, slot) => {
    const id = pool[hash(period, slot, 31) % pool.length], value = Math.max(1, item(id).value), bulk = lv >= 20 && slot === 2;
    const n = Math.max(3, Math.min(bulk ? 60 : 28, Math.round((bulk ? 900 : 300) / Math.sqrt(value) / 4)));
    const pay = Math.ceil(value * n * (bulk ? COMMERCE.orderPremium + 0.1 : COMMERCE.orderPremium));
    return { slot, item: id, n, pay, xp: Math.round((30 + 6 * lv) * (bulk ? 1.6 : 1)) };
  });
}
/** Hand an order's goods to the broker: taken all together, paid at once, done for the period. */
export function fillOrder(game: Game, slot: number, hour: number = hourNow()): string {
  const problem = marketProblem(game, hour); if (problem) return problem;
  const s = game.player.commerce, period = periodOf(hour);
  if (s.period !== period) { s.period = period; s.done = []; }
  const order = ordersFor(game, hour).find(o => o.slot === slot); if (!order) return "No such order.";
  if (s.done.includes(slot)) return "That order's filled. New ones go up on the board every few hours.";
  if (count(game.player, order.item) < order.n) return `The order wants ${order.n} × ${item(order.item).name}. You have ${count(game.player, order.item)}.`;
  // (Room for the Frens once the goods are gone: a stack of goods handed over in full frees its slot.)
  if (!canHold(game.player, "coins", order.pay) && !(item(order.item).stackable && count(game.player, order.item) === order.n)) return "No room in your pack for the Frens.";
  if (!take(game.player, order.item, order.n)) return "No.";
  give(game.player, "coins", order.pay); s.done.push(slot);
  addXp(game, "commerce", order.xp, { raw: true }); sound(game, "coins");
  return `The broker checks the goods off the order and pays ${order.pay.toLocaleString()} Frens.`;
}

// ---------- Regional prices ----------
/** Where a thing sells and what it fetches, shop by shop (Commerce 5): what each shop that buys it pays, and what each that stocks it asks. */
export function regionalPrices(id: string, sellPrice: (id: string, shop?: string) => number, buyPrice: (id: string) => number, shopBuys: (shop: string, id: string) => boolean) {
  const shops = Object.values(SHOPS) as ShopDef[];
  return {
    buyers: shops.filter(s => shopBuys(s.id, id) && !s.general).map(s => ({ shop: s.name, pays: sellPrice(id, s.id) })).sort((a, b) => b.pays - a.pays).slice(0, 8),
    general: sellPrice(id),
    sellers: shops.filter(s => s.stock.includes(id)).map(s => ({ shop: s.name, asks: buyPrice(id) })).slice(0, 8),
  };
}
/** A message for the log. */
export const say = (game: Game, text: string) => message(game, text, "info");
