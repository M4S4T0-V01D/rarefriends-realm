/**
 * The Frenderal Exchange's window (commerce.ts): the market (prices, a company's chart and news, buying and selling with
 * the fee and the total shown before anything's confirmed), your holdings and trades, the company reports, the order
 * board and the regional price lists. Every action goes through commerce.ts, which checks it.
 */
import { useState } from "react";
import { item } from "./data.ts";
import { buyPrice, sellPrice, shopBuys } from "./engine.ts";
import { count, level, type Game } from "./state.ts";
import { COMMERCE, COMPANIES, COMPANY_IDS, fillOrder, holdings, hourNow, marketProblem, newsUpTo, ordersFor, priceAt, quote, readReport, regionalPrices, sharesCap, trade, type CompanyId } from "./commerce.ts";
import { ItemIcon, Modal } from "./panels.tsx";

type Tab = NonNullable<Game["ui"]["exchange"]>;
const TABS: readonly (readonly [Tab, string])[] = [["market", "Market"], ["holdings", "Holdings"], ["reports", "Reports"], ["orders", "Orders"], ["prices", "Prices"]];
const change = (now: number, then: number) => then ? Math.round((now - then) / then * 1000) / 10 : 0;
const signed = (v: number) => `${v > 0 ? "+" : ""}${v}%`;

/** A company's price over the last two days, as a line. */
function Chart({ id, hour }: { id: CompanyId; hour: number }) {
  const points = Array.from({ length: 49 }, (_, k) => priceAt(id, hour - 48 + k)), lo = Math.min(...points), hi = Math.max(...points), span = Math.max(1, hi - lo);
  const path = points.map((p, k) => `${k * 5},${44 - (p - lo) / span * 40}`).join(" ");
  return <svg className="realm-exchange-chart" viewBox="0 0 240 48" role="img" aria-label={`${COMPANIES[id].name}: the last two days, from ${points[0]} to ${points[48]} Frens`}>
    <polyline points={path} fill="none" stroke={points[48] >= points[0] ? "#3f7f4f" : "#a0443c"} strokeWidth="2" />
  </svg>;
}

export function ExchangeModal({ game, refresh, onClose }: { game: Game; refresh: () => void; onClose: () => void }) {
  const tab = game.ui.exchange ?? "market", hour = hourNow(), [pick, setPick] = useState<CompanyId>("zlatna_mining"), [n, setN] = useState(10), [said, setSaid] = useState("");
  const [goods, setGoods] = useState(""), lv = level(game, "commerce"), closed = hour < game.player.commerce.seen;
  if (!closed) marketProblem(game, hour);
  const setTab = (next: Tab) => { game.ui.exchange = next; setSaid(""); refresh(); };
  const act = (text: string) => { setSaid(text); refresh(); };
  const body = () => {
    if (closed) return <p className="realm-warn">The Exchange's clocks say it's later than that. Come back when the hour has caught up.</p>;
    if (tab === "market") {
      const buy = quote(game, pick, "buy", n, hour), sell = quote(game, pick, "sell", n, hour), held = game.player.commerce.shares[pick] ?? 0;
      return <>
        <table className="realm-exchange-table"><thead><tr><th>Company</th><th>Trade</th><th>Price</th><th>Day</th><th>Held</th></tr></thead><tbody>
          {COMPANY_IDS.map(id => <tr key={id} className={id === pick ? "picked" : ""} onClick={() => setPick(id)}>
            <td><button type="button" className="realm-exchange-pick" onClick={() => setPick(id)}>{COMPANIES[id].name}</button></td><td>{COMPANIES[id].trade}</td>
            <td>{`${priceAt(id, hour).toLocaleString()} Frens`}</td><td className={priceAt(id, hour) >= priceAt(id, hour - 24) ? "up" : "down"}>{signed(change(priceAt(id, hour), priceAt(id, hour - 24)))}</td>
            <td>{(game.player.commerce.shares[id] ?? 0).toLocaleString()}</td></tr>)}
        </tbody></table>
        <h3 className="realm-supply-head">{COMPANIES[pick].name}</h3>
        <Chart id={pick} hour={hour} />
        <p className="realm-muted">{COMPANIES[pick].about}</p>
        <div className="realm-supply-row">
          <label>Shares <input type="number" min={1} max={COMMERCE.tradeMax} value={n} onChange={event => setN(Math.max(0, Math.floor(Number(event.target.value) || 0)))} aria-label="How many shares" /></label>
          <span className="realm-muted">{`You hold ${held.toLocaleString()} of at most ${sharesCap(game).toLocaleString()}. You have ${count(game.player, "coins").toLocaleString()} Frens.`}</span>
        </div>
        <div className="realm-exchange-quotes">
          <div><b>Buy</b><div>{`${buy.n.toLocaleString()} × ${buy.price.toLocaleString()} = ${buy.gross.toLocaleString()} Frens`}</div><div>{`Fee ${buy.fee.toLocaleString()} Frens`}</div><div><b>{`You pay ${buy.total.toLocaleString()} Frens`}</b></div>
            {buy.problem ? <p className="realm-warn">{buy.problem}</p> : <button type="button" onClick={() => act(trade(game, pick, "buy", n, buy.hour))}>Buy</button>}</div>
          <div><b>Sell</b><div>{`${sell.n.toLocaleString()} × ${sell.price.toLocaleString()} = ${sell.gross.toLocaleString()} Frens`}</div><div>{`Fee ${sell.fee.toLocaleString()} Frens`}</div><div><b>{`You take ${sell.total.toLocaleString()} Frens`}</b></div>
            {sell.problem ? <p className="realm-warn">{sell.problem}</p> : <button type="button" onClick={() => act(trade(game, pick, "sell", n, sell.hour))}>Sell</button>}</div>
        </div>
        <p className="realm-muted">{`The fee is ${COMMERCE.feeRate * 100}% of what changes hands, at least ${COMMERCE.feeMin} Frens, both ways. Prices move by the hour; research helps judge a company, it doesn't promise anything.`}</p>
        <h3 className="realm-supply-head">The news</h3>
        {newsUpTo(hour, 7).slice(0, 6).map(e => <p key={`${e.company}${e.hour}`} className="realm-muted">{`${COMPANIES[e.company].name}: ${e.event.text}`}</p>)}
      </>;
    }
    if (tab === "holdings") {
      const list = holdings(game, hour), history = [...game.player.commerce.history].reverse().slice(0, 20);
      return <>
        {!list.length && <p className="realm-muted">You hold no shares.</p>}
        {list.length > 0 && <table className="realm-exchange-table"><thead><tr><th>Company</th><th>Shares</th><th>Cost</th><th>Worth</th><th>Gain</th></tr></thead><tbody>
          {list.map(h => <tr key={h.id}><td>{COMPANIES[h.id].name}</td><td>{h.n.toLocaleString()}</td><td>{`${h.cost.toLocaleString()} Frens`}</td><td>{`${h.worth.toLocaleString()} Frens`}</td><td className={h.worth >= h.cost ? "up" : "down"}>{`${(h.worth - h.cost).toLocaleString()} Frens`}</td></tr>)}
        </tbody></table>}
        <h3 className="realm-supply-head">Your trades</h3>
        {!history.length && <p className="realm-muted">None yet.</p>}
        {history.map((t, k) => <p key={k} className="realm-muted">{`${t.n > 0 ? "Bought" : "Sold"} ${Math.abs(t.n).toLocaleString()} ${COMPANIES[t.c].name} at ${t.price.toLocaleString()} Frens, fee ${t.fee.toLocaleString()} Frens`}</p>)}
      </>;
    }
    if (tab === "reports") {
      if (lv < COMMERCE.reportsLevel) return <p className="realm-warn">{`The company ledgers are open to traders of Commerce ${COMMERCE.reportsLevel}.`}</p>;
      const r = readReport(game, pick, hour);
      return <>
        <div className="realm-supply-row">{COMPANY_IDS.map(id => <button key={id} type="button" className={id === pick ? "on" : ""} onClick={() => { setPick(id); refresh(); }}>{COMPANIES[id].name}</button>)}</div>
        {typeof r === "string" ? <p className="realm-warn">{r}</p> : <>
          {r.lines.map(line => <p key={line}>{line}</p>)}
          <table className="realm-exchange-table"><thead><tr><th>Day</th><th>Output</th><th>Debt</th><th>Demand</th><th>Closing price</th></tr></thead><tbody>
            {r.days.map((d, k) => <tr key={d.day}><td>{k - r.days.length === -1 ? "Yesterday" : `${r.days.length - k} days ago`}</td><td>{`${d.output}%`}</td><td>{`${d.debt}%`}</td><td>{`${d.demand}%`}</td><td>{`${d.price.toLocaleString()} Frens`}</td></tr>)}
          </tbody></table>
          <p className="realm-muted">Output, debt and demand against what's normal for the company (100%). Today's figures aren't in until tomorrow.</p>
          {r.fair && <p><b>{`Production analysis: a share's worth between ${r.fair[0].toLocaleString()} and ${r.fair[1].toLocaleString()} Frens, by yesterday's figures.`}</b></p>}
          <h3 className="realm-supply-head">News</h3>
          {!r.news.length && <p className="realm-muted">Nothing in the last two weeks.</p>}
          {r.news.map(e => <p key={e.hour} className="realm-muted">{`${e.event.name}: ${e.event.text}`}</p>)}
        </>}
      </>;
    }
    if (tab === "orders") {
      const s = game.player.commerce, period = Math.floor(hour / COMMERCE.orderHours), done = s.period === period ? s.done : [];
      return <>
        <p className="realm-muted">{`The merchants' orders, renewed every ${COMMERCE.orderHours} hours. Bring the goods, and the broker pays.`}</p>
        {ordersFor(game, hour).map(o => <div key={o.slot} className="realm-supply-row">
          <ItemIcon slot={{ id: o.item, n: o.n }} size={32} /><span className="realm-supply-name">{`${o.n} × ${item(o.item).name}`}</span>
          <span>{`${o.pay.toLocaleString()} Frens, ${o.xp.toLocaleString()} Commerce XP`}</span>
          <span className="realm-muted">{`You have ${count(game.player, o.item).toLocaleString()}.`}</span>
          {done.includes(o.slot) ? <span className="realm-muted">Filled.</span> : <button type="button" disabled={count(game.player, o.item) < o.n} onClick={() => act(fillOrder(game, o.slot, hour))}>Deliver</button>}
        </div>)}
      </>;
    }
    if (lv < COMMERCE.pricesLevel) return <p className="realm-warn">{`The price lists are open to traders of Commerce ${COMMERCE.pricesLevel}.`}</p>;
    const mine = [...new Set(game.player.inventory.flatMap(slot => slot && slot.id !== "coins" ? [slot.id] : []))], choice = goods || mine[0] || "logs";
    // (What's in your pack, or, with an empty pack, the commonest goods.)
    const options = mine.length ? mine : ["logs", "raw_carp", "pewter_ore", "bread"];
    const prices = regionalPrices(choice, sellPrice, id => buyPrice(game, id), shopBuys);
    return <>
      <label className="realm-supply-row">Goods <select value={choice} onChange={event => setGoods(event.target.value)}>{options.map(id => <option key={id} value={id}>{item(id).name}</option>)}</select></label>
      <p className="realm-muted">{`Any general store pays ${prices.general.toLocaleString()} Frens for ${item(choice).name}.`}</p>
      <h3 className="realm-supply-head">Who pays more</h3>
      {!prices.buyers.length && <p className="realm-muted">No shop pays more than a general store.</p>}
      {prices.buyers.map(b => <p key={b.shop}>{`${b.shop}: ${b.pays.toLocaleString()} Frens`}</p>)}
      <h3 className="realm-supply-head">Who sells it</h3>
      {!prices.sellers.length && <p className="realm-muted">No shop sells it.</p>}
      {prices.sellers.map(b => <p key={b.shop}>{`${b.shop}: ${b.asks.toLocaleString()} Frens`}</p>)}
    </>;
  };
  return <Modal title="The Frenderal Exchange" onClose={onClose} wide>
    <div className="realm-tabs" role="tablist">{TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {said && <p className="realm-exchange-said" role="status">{said}</p>}
    {body()}
  </Modal>;
}
