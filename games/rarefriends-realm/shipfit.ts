/**
 * Fitting out a vessel (A Place to the North, Parts VII and VIII): a ship as an expedition base, not only a way across.
 *
 * - Fit-outs, put in by a shipwright from real materials: supply barrels (the hold marked out in barrels, each with a
 *   job, each drawn on or kept), the resupply lever (a barge's or a longship's: pull it and the barrels fill your pack
 *   to the loadout you've set), a cabin (rest there: back on your feet, your breath back), a galley (cook aboard as at a
 *   range), a repair bench (mend the hull yourself). Room is room: a cabin or a galley takes space the hold had.
 * - Loadouts: named sets of supply rules (an item, how many you want to carry, on or off), one per vessel for a skiff,
 *   three for a barge, six for a longship; the lever works the one you've chosen.
 * - A name of your own for each vessel, and its sails dyed with any of the Dyemoor's dyes (a pot of lye washes them).
 *
 * The lever never makes anything: every item it gives you comes out of a supply barrel, and only as many as fit in your
 * pack; what it couldn't find, and what had no room, it tells you.
 */
import { DYES, item } from "./data.ts";
import { addXp, count, give, level, maxHp, message, sound, take, type Game } from "./state.ts";
import { VESSELS, type Vessel, type VesselKind } from "./seafaring.ts";
import { cleanName } from "./presence.ts";

export type FitoutId = "supply_barrels" | "resupply_lever" | "cabin" | "galley" | "repair_bench";
export type FitoutDef = { id: FitoutId; name: string; level: number; kinds: readonly VesselKind[]; space: number; needs?: FitoutId; cost: readonly (readonly [string, number])[]; xp: number; examine: string };
export const FITOUTS: Record<FitoutId, FitoutDef> = {
  supply_barrels: { id: "supply_barrels", name: "Supply barrels", level: 20, kinds: ["skiff", "barge", "longship"], space: 0, cost: [["pine_planks", 6], ["pewter_rivets", 2]], xp: 120,
    examine: "The hold marked out in barrels and crates, each with a job: what's in the ones you draw on, you can take as supplies." },
  resupply_lever: { id: "resupply_lever", name: "Resupply lever", level: 40, kinds: ["barge", "longship"], space: 0, needs: "supply_barrels", cost: [["oak_planks", 2], ["blackiron_rivets", 2], ["ships_rope", 2]], xp: 300,
    examine: "A lever by the mast and a run of chutes from the barrels: pull it, and they fill your pack to the loadout you've set." },
  cabin: { id: "cabin", name: "Cabin", level: 30, kinds: ["barge", "longship"], space: 4, cost: [["oak_planks", 10], ["blackiron_rivets", 2], ["sailcloth", 1]], xp: 250,
    examine: "A bunk, a sea chest and a door that shuts. Rest in it: back on your feet, and your breath back." },
  galley: { id: "galley", name: "Galley", level: 25, kinds: ["skiff", "barge", "longship"], space: 2, cost: [["oak_planks", 4], ["blackiron_rivets", 3], ["ships_rope", 1]], xp: 180,
    examine: "A sand-bedded hearth and a pot on a chain: cook aboard as you would at a range." },
  repair_bench: { id: "repair_bench", name: "Repair bench", level: 35, kinds: ["barge", "longship"], space: 2, cost: [["oak_planks", 6], ["blackiron_rivets", 2]], xp: 220,
    examine: "A bench and a box of tools: mend the hull yourself, with planks and pewter rivets, wherever she lies." },
};
export const FITOUT_IDS = Object.keys(FITOUTS) as FitoutId[];
/** What each barrel is for (a label you choose: it's how you keep the hold in order). */
export const BARREL_ROLES = ["Provisions", "Remedies", "Ammunition", "Tools", "Materials", "Repairs", "General"] as const;
/** A barrel is this many of the hold's slots. */
export const BARREL_SLOTS = 4;
/** The loadouts a vessel keeps, by name, and how many each kind has room to set out. */
export const LOADOUT_NAMES = ["General travel", "Mining expedition", "Dungeon run", "Fishing trip", "Boss hunt", "Wilderness exploration"] as const;
export const LOADOUTS_BY_KIND: Record<VesselKind, number> = { rowboat: 0, skiff: 1, barge: 3, longship: 6 };
/** How many rules a loadout holds; how many of an item a rule can ask for; how often the lever can be pulled (ticks); how often a cabin rests you. */
export const SUPPLY = { rules: 12, target: 10_000, leverEvery: 4, restEvery: 300 } as const;

export type SupplyRule = { item: string; target: number; on: boolean };
export type Loadout = { rules: SupplyRule[] };
export type Barrel = { role: number; supply: boolean };

export const hasFitout = (v: Vessel, id: FitoutId) => !!v.fitouts?.includes(id);
/** The hold's size with the fit-outs that take its room. */
export const holdSize = (v: Vessel) => VESSELS[v.kind].hold - (v.fitouts ?? []).reduce((n, id) => n + (FITOUTS[id]?.space ?? 0), 0);
/** A vessel's barrels (with supply barrels fitted): one for every BARREL_SLOTS slots of its hold. */
export function barrelsOf(v: Vessel): Barrel[] {
  const n = Math.ceil(v.hold.length / BARREL_SLOTS), kept = v.barrels ?? [];
  return Array.from({ length: n }, (_, k) => ({ role: Number.isInteger(kept[k]?.role) && kept[k].role >= 0 && kept[k].role < BARREL_ROLES.length ? kept[k].role : k % BARREL_ROLES.length, supply: kept[k]?.supply ?? true }));
}
export const loadoutCount = (v: Vessel) => hasFitout(v, "supply_barrels") ? LOADOUTS_BY_KIND[v.kind] : 0;
export function loadoutsOf(v: Vessel): Loadout[] { const n = loadoutCount(v); return Array.from({ length: n }, (_, k) => ({ rules: (v.loadouts?.[k]?.rules ?? []).slice(0, SUPPLY.rules) })); }
export const activeLoadout = (v: Vessel) => Math.max(0, Math.min(loadoutCount(v) - 1, v.loadout ?? 0));

// ---------- Fitting out, at a shipwright's ----------
export function fitoutProblem(game: Game, v: Vessel, id: FitoutId): string | null {
  const def = FITOUTS[id], player = game.player;
  if (!def.kinds.includes(v.kind)) return `A ${VESSELS[v.kind].name.toLowerCase()} hasn't the room for that.`;
  if (hasFitout(v, id)) return "She has one already.";
  if (def.needs && !hasFitout(v, def.needs)) return `That needs ${FITOUTS[def.needs].name.toLowerCase()} first.`;
  if (level(game, "seafaring") < def.level) return `You need a Seafaring level of ${def.level} for that.`;
  if (v.hold.filter(slot => !slot).length < def.space) return `Clear ${def.space} spaces in the hold first: it takes their room.`;
  for (const [id2, n] of def.cost) if (count(player, id2) < n) return `I'll need ${def.cost.map(([c, k]) => `${k} × ${item(c).name}`).join(", ")} for that.`;
  return null;
}
export function fitOut(game: Game, v: Vessel, id: FitoutId): boolean {
  const why = fitoutProblem(game, v, id), def = FITOUTS[id];
  if (why) { message(game, why, "warn"); return false; }
  for (const [c, n] of def.cost) take(game.player, c, n);
  // The room it takes comes out of the hold's empty spaces, the last ones first (so what's in each barrel stays in its
  // barrel; nothing's lost).
  if (def.space) { let left = def.space; for (let i = v.hold.length - 1; i >= 0 && left > 0; i--) if (!v.hold[i]) { v.hold.splice(i, 1); left--; } }
  v.fitouts = [...(v.fitouts ?? []), id];
  addXp(game, "seafaring", def.xp, { raw: true }); sound(game, "quest");
  message(game, `${def.name}: fitted. ${def.examine}`);
  return true;
}
/** Take a fit-out out again (its room goes back to the hold; what it was made of doesn't come back). */
export function removeFitout(game: Game, v: Vessel, id: FitoutId): boolean {
  if (!hasFitout(v, id)) return false;
  const gone = id === "supply_barrels" && hasFitout(v, "resupply_lever") ? ["supply_barrels", "resupply_lever"] : [id];
  v.fitouts = (v.fitouts ?? []).filter(f => !gone.includes(f));
  const space = gone.reduce((n, f) => n + (FITOUTS[f as FitoutId]?.space ?? 0), 0);
  v.hold = [...v.hold, ...Array(space).fill(null)];
  for (const f of gone) message(game, `${FITOUTS[f as FitoutId].name}: taken out.`); sound(game, "click");
  return true;
}

// ---------- The barrels and the loadouts (the Supplies window sets them) ----------
export function setBarrel(v: Vessel, k: number, change: Partial<Barrel>) {
  const all = barrelsOf(v); if (!all[k]) return;
  all[k] = { role: change.role !== undefined && Number.isInteger(change.role) && change.role >= 0 && change.role < BARREL_ROLES.length ? change.role : all[k].role, supply: change.supply ?? all[k].supply };
  v.barrels = all;
}
export function setLoadout(v: Vessel, k: number) { if (k >= 0 && k < loadoutCount(v)) v.loadout = k; }
/** Change the active loadout's rules: an item and how many (a rule for an item already there is updated), on or off, removed, or moved up. */
export function setRule(v: Vessel, change: { item: string; target?: number; on?: boolean; remove?: boolean; up?: boolean }) {
  const all = loadoutsOf(v), k = activeLoadout(v), rules = all[k]?.rules; if (!rules) return;
  const at = rules.findIndex(r => r.item === change.item);
  if (change.remove) { if (at >= 0) rules.splice(at, 1); }
  else if (change.up) { if (at > 0) [rules[at - 1], rules[at]] = [rules[at], rules[at - 1]]; }
  else if (at >= 0) { if (change.target !== undefined) rules[at].target = Math.max(0, Math.min(SUPPLY.target, Math.floor(change.target) || 0)); if (change.on !== undefined) rules[at].on = change.on; }
  else if (rules.length < SUPPLY.rules) rules.push({ item: change.item, target: Math.max(0, Math.min(SUPPLY.target, Math.floor(change.target ?? 1) || 0)), on: change.on ?? true });
  v.loadouts = all;
}
/** How many of an item the barrels you draw on hold. */
export function inSupply(v: Vessel, id: string): number {
  const barrels = barrelsOf(v); let n = 0;
  v.hold.forEach((slot, i) => { if (slot?.id === id && barrels[Math.floor(i / BARREL_SLOTS)]?.supply) n += slot.n; });
  return n;
}

// ---------- The lever ----------
export type ResupplyReport = { loadout: string; given: [string, number][]; short: [string, number, number][]; noRoom: [string, number][] };
/**
 * Pull the lever (or, on a skiff, draw the supplies by hand): for each rule of the active loadout that's on, in order,
 * the barrels you draw on top your pack up to the number it wants. Only what's in those barrels, only what fits.
 */
export function resupply(game: Game, v: Vessel): ResupplyReport | null {
  const player = game.player, lever = hasFitout(v, "resupply_lever");
  if (!hasFitout(v, "supply_barrels")) { message(game, "She has no supply barrels.", "warn"); return null; }
  if (!lever && LOADOUTS_BY_KIND[v.kind] > 1) { message(game, "A resupply lever does that: a shipwright can fit one.", "warn"); return null; }
  if (game.tick - (v.leverAt ?? -1e9) < SUPPLY.leverEvery) return null;   // (one pull at a time: a second before the first's done does nothing)
  v.leverAt = game.tick;
  const k = activeLoadout(v), rules = loadoutsOf(v)[k]?.rules.filter(r => r.on && r.target > 0) ?? [];
  const report: ResupplyReport = { loadout: LOADOUT_NAMES[k], given: [], short: [], noRoom: [] };
  const barrels = barrelsOf(v);
  for (const rule of rules) {
    const want = rule.target - count(player, rule.item);
    if (want <= 0) continue;
    const there = inSupply(v, rule.item), move = Math.min(want, there);
    if (move < want) report.short.push([rule.item, want - move, there]);
    if (move <= 0) continue;
    // What fits in the pack, and exactly that much out of the barrels: nothing made, nothing lost.
    const left = give(player, rule.item, move), moved = move - left;
    if (left > 0) report.noRoom.push([rule.item, left]);
    let owed = moved;
    v.hold.forEach((slot, i) => { if (owed <= 0 || slot?.id !== rule.item || !barrels[Math.floor(i / BARREL_SLOTS)]?.supply) return; const n = Math.min(owed, slot.n); slot.n -= n; owed -= n; if (slot.n <= 0) v.hold[i] = null; });
    if (moved > 0) report.given.push([rule.item, moved]);
  }
  sound(game, lever ? "anvil" : "click");
  message(game, lever ? `The lever clanks over: the ${report.loadout.toLowerCase()} loadout.` : `You draw supplies from the barrels: the ${report.loadout.toLowerCase()} loadout.`, "info");
  if (!rules.length) message(game, "That loadout asks for nothing yet: set it in the Supplies window.", "warn");
  else if (!report.given.length && !report.short.length) message(game, "Nothing to supply: you're already carrying what the loadout asks for.");
  for (const [id, n] of report.given) message(game, `Supplied: ${n.toLocaleString()} × ${item(id).name}.`);
  for (const [id, n, there] of report.short) message(game, there ? `Short of ${item(id).name}: the barrels had ${there.toLocaleString()}, ${n.toLocaleString()} fewer than the loadout wants.` : `Short of ${item(id).name}: there's none in the barrels.`, "warn");
  for (const [id, n] of report.noRoom) message(game, `No room in your pack for ${n.toLocaleString()} × ${item(id).name}.`, "warn");
  return report;
}

// ---------- The cabin, the bench ----------
export function restInCabin(game: Game, v: Vessel): boolean {
  const player = game.player;
  if (!hasFitout(v, "cabin")) return false;
  if (game.tick - (v.restAt ?? -1e9) < SUPPLY.restEvery) { message(game, "You've only just got up. The bunk'll keep.", "warn"); return false; }
  v.restAt = game.tick; player.hp = maxHp(player); player.energy = 100; sound(game, "click");
  message(game, "You rest in the cabin a while. You're back on your feet, and your breath's back.");
  return true;
}

// ---------- A name, and the colour of her sails ----------
export function nameVessel(game: Game, v: Vessel, raw: string): boolean {
  const name = cleanName(raw);
  if (!name || name.length > 20) { message(game, "A vessel's name: 3 to 20 letters, numbers, spaces, hyphens or apostrophes.", "warn"); return false; }
  v.name = name; sound(game, "click");
  message(game, `You paint her name on the bow: ${name}.`);
  return true;
}
/** Dye a vessel's sails (a dye from the inventory, used on her), or wash them back with lye. */
export function dyeSails(game: Game, v: Vessel, dyeItem: string): boolean {
  if (v.kind === "rowboat" || v.kind === "barge") { message(game, `A ${VESSELS[v.kind].name.toLowerCase()} has no sail to dye.`, "warn"); return false; }
  const dye = dyeItem === "dye_lye" ? null : DYES.find(d => `dye_${d.id}` === dyeItem);
  if (dyeItem !== "dye_lye" && !dye) return false;
  if (!take(game.player, dyeItem, 1)) return false;
  v.sail = dye ? dye.id : null; sound(game, "click");
  message(game, dye ? `Her sails take the ${dye.name.toLowerCase()}.` : "The lye washes her sails back to the canvas they were.");
  return true;
}
/** A sail colour (a hex) for drawing, or null for the canvas. */
export const sailColor = (sail: string | null | undefined) => sail ? DYES.find(d => d.id === sail)?.color ?? null : null;

// ---------- From a save ----------
export function cleanFitting(raw: Record<string, unknown>, kind: VesselKind) {
  const fitouts = Array.isArray(raw.fitouts) ? [...new Set(raw.fitouts.filter((f): f is FitoutId => typeof f === "string" && FITOUT_IDS.includes(f as FitoutId) && FITOUTS[f as FitoutId].kinds.includes(kind)))] : [];
  if (fitouts.includes("resupply_lever") && !fitouts.includes("supply_barrels")) fitouts.splice(fitouts.indexOf("resupply_lever"), 1);
  const barrels = Array.isArray(raw.barrels) ? raw.barrels.slice(0, 32).map(b => { const r = b && typeof b === "object" ? b as Record<string, unknown> : {}; return { role: Number.isInteger(r.role) && Number(r.role) >= 0 && Number(r.role) < BARREL_ROLES.length ? Number(r.role) : 0, supply: r.supply !== false }; }) : undefined;
  const loadouts = Array.isArray(raw.loadouts) ? raw.loadouts.slice(0, LOADOUT_NAMES.length).map(l => { const r = l && typeof l === "object" ? l as Record<string, unknown> : {};
    return { rules: (Array.isArray(r.rules) ? r.rules : []).slice(0, SUPPLY.rules).flatMap(x => { const q = x && typeof x === "object" ? x as Record<string, unknown> : {}; return typeof q.item === "string" && q.item.length < 60 ? [{ item: q.item, target: Math.max(0, Math.min(SUPPLY.target, Math.floor(Number(q.target)) || 0)), on: q.on !== false }] : []; }) }; }) : undefined;
  const sail = typeof raw.sail === "string" && DYES.some(d => d.id === raw.sail) ? raw.sail : null;
  const loadout = Number.isInteger(raw.loadout) ? Math.max(0, Math.min(LOADOUT_NAMES.length - 1, Number(raw.loadout))) : 0;
  return { fitouts, barrels, loadouts, sail, loadout };
}
