/**
 * The Frenderal Exchange (commerce.ts): a marble hall on a square at the top of Gullwick's harbour street, built in the
 * grown world after the north. Inside, the market board, the company ledgers, the order board and the price lists (each
 * a clue: commercetalk.ts opens the Exchange's window on its tab), the broker, and four of the five investors; the Fox
 * keeps to the square, where the rumours are.
 */
import { T, worldTools, type GenContext, type World } from "./world.ts";

/** The square, the hall in it, and Gullwick's harbour street running down from its south side to the quay (x 554). */
export const EXCHANGE = { x0: 536, y0: 781, x1: 572, y1: 797, hall: { x0: 542, y0: 782, x1: 566, y1: 791 } } as const;

export function buildExchange(ctx: GenContext, places: World["places"]) {
  const t = worldTools(ctx), { x0, y0, x1, y1, hall } = EXCHANGE;
  // The square: cobbles, cleared of the trees and stones that stood there, the harbour street run up into it.
  // (Gullwick's: the region runs up to the Exchange.)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { t.clearAt(x, y); t.put(x, y, T.COBBLE); t.setRegion(x, y, "gullwick"); }
  for (let y = y1 + 1; y <= y1 + 3; y++) for (const x of [553, 554, 555]) { t.clearAt(x, y); t.put(x, y, T.COBBLE); }
  // The hall: marble, two storeys, a gilded dome over the trading floor.
  t.building(hall.x0, hall.y0, hall.x1, hall.y1, "s", T.STONE, 554, { name: "The Frenderal Exchange", walls: "marble", roof: "cone", color: "#c9a53a", storeys: 2, keep: { size: 5, storeys: 1, spire: 16, dome: true } });
  const inside = (x: number, y: number, kind: Parameters<typeof t.decor>[2], name: string, clue: string) => { t.clearAt(x, y); t.add({ kind: "decor", decor: kind, x, y, blocks: true, name, clue }); };
  inside(hall.x0 + 3, hall.y0 + 2, "banner", "The market board: every company's price, chalked up by the hour", "exchange_board");
  inside(hall.x0 + 8, hall.y0 + 2, "shelf", "The company ledgers", "exchange_ledgers");
  inside(hall.x1 - 8, hall.y0 + 2, "table", "The order board: what the merchants want, and what they'll pay", "exchange_orders");
  inside(hall.x1 - 3, hall.y0 + 2, "shelf", "The price lists: what the Realm's shops pay, and ask", "exchange_prices");
  for (const x of [hall.x0 + 5, hall.x1 - 5]) for (const y of [hall.y0 + 5, hall.y0 + 7]) t.decor(x, y, "pillar", true, "A marble pillar");
  t.add({ kind: "bank", x: hall.x0 + 2, y: hall.y1 - 2, blocks: true, name: "Bank chest" });
  t.npc("exchange_broker", 554, hall.y0 + 4);
  t.npc("investor_whale", hall.x0 + 4, hall.y0 + 6); t.npc("investor_bear", hall.x0 + 8, hall.y1 - 2);
  t.npc("investor_wolf", hall.x1 - 4, hall.y0 + 6); t.npc("investor_bull", hall.x1 - 8, hall.y1 - 2);
  t.npc("investor_fox", x0 + 4, y1 - 2, 3);
  // The square's furniture: lamps, benches, a fountain's worth of well.
  for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, y1 - 1], [x1 - 1, y1 - 1], [550, y1], [559, y1]] as const) { t.clearAt(x, y); t.decor(x, y, "lamp", true); }
  for (const [x, y] of [[x0 + 3, y0 + 6], [x1 - 3, y0 + 6], [x0 + 3, y0 + 10], [x1 - 3, y0 + 10]] as const) { t.clearAt(x, y); t.decor(x, y, "bench", true); }
  t.clearAt(x1 - 6, y1 - 3); t.add({ kind: "well", x: x1 - 6, y: y1 - 3, blocks: true, name: "The Exchange well" });
  t.clearAt(552, y1); t.add({ kind: "sign", x: 552, y: y1, blocks: true, name: "The Frenderal Exchange", text: "THE FRENDERAL EXCHANGE. Shares, orders and the Realm's prices, chalked up by the hour. Fees posted inside. No credit, no exceptions, no shouting." });
  places.exchange = { x: 554, y: hall.y1 + 2 };
}
