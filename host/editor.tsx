/**
 * The development dashboard: the private development game's tools, all round the game frame (built only with
 * --dev-tools; served by the Worker behind the owner's login). It keeps the overlay (games/rarefriends-realm/overlay.ts)
 * and its history, sends the whole overlay to the game whenever it changes (the game rebuilds its world from the bake
 * with it), and saves it to the service with its revisions. In edit mode the game reports what was clicked (and, held,
 * every tile dragged over) and the current tool makes an operation of it: terrain (raise, lower, flatten, level, smooth,
 * roughen, slopes), painting (brush, rectangle, flood, lines, regions), things (place, scatter, clear), buildings,
 * spawns and camp zones. Round it: the game's state, a map of the whole world, a search, the player's levels, quests,
 * items and standing, time and weather (devtools.ts; anything that changes the player puts the session in the sandbox,
 * unsaved). The game itself is the public build, untouched.
 */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEV_CATALOG, DEV_COMMAND, DEV_FIND, DEV_MAP, DEV_MODE, DEV_PICK, DEV_REPORT, DEV_STATE, DEV_WORLD, type DevCatalog, type DevPick } from "../games/rarefriends-realm/roster.ts";
import type { Op, Overlay, TerrainMode } from "../games/rarefriends-realm/overlay.ts";
import type { DevFound, DevState } from "../games/rarefriends-realm/devtools.ts";
import { northOverlay } from "../games/rarefriends-realm/northframe.ts";
import { devApi, type Revision } from "./dev.ts";

const WORLD = "main";
/** The definitions tab: what an overlay can define, and the form for each (overlay.ts). */
type DefKind = "npc" | "monster" | "item" | "quest";
type Field = { key: string; label: string; type?: "text" | "number" | "textarea" | "check" | "select"; options?: readonly (readonly [string, string])[]; hint?: string };
const DEF_FIELDS: Record<DefKind, Field[]> = {
  npc: [{ key: "id", label: "Id (dev_…)" }, { key: "name", label: "Name" }, { key: "examine", label: "Examine" }, { key: "artMode", label: "Drawn as", type: "select", options: [["friend", "a Friend (family and seed)"], ["7730", "Friend #7730"], ["3412", "Friend #3412"]] }, { key: "family", label: "Family (0–9)", type: "number" }, { key: "seed", label: "Seed", type: "number" }, { key: "lines", label: "What they say (a line each, in turn)", type: "textarea" }],
  monster: [{ key: "base", label: "Start from", type: "select" }, { key: "id", label: "Id (dev_…)" }, { key: "name", label: "Name" }, { key: "examine", label: "Examine" }, { key: "level", label: "Level", type: "number" }, { key: "hp", label: "Hitpoints", type: "number" }, { key: "attack", label: "Attack", type: "number" }, { key: "strength", label: "Strength", type: "number" }, { key: "defence", label: "Defence", type: "number" }, { key: "attackBonus", label: "Attack bonus", type: "number" }, { key: "defenceBonus", label: "Defence bonus", type: "number" }, { key: "maxHit", label: "Max hit", type: "number" }, { key: "speed", label: "Speed (ticks a swing)", type: "number" }, { key: "respawn", label: "Respawn (ticks)", type: "number" }, { key: "wander", label: "Wander (tiles)", type: "number" }, { key: "art", label: "Art (the base's, or another's)", type: "number" }, { key: "aggressive", label: "Aggressive", type: "check" }, { key: "drops", label: "Drops (JSON: [{item, min, max, chance}])", type: "textarea" }],
  item: [{ key: "id", label: "Id (dev_…)" }, { key: "name", label: "Name" }, { key: "examine", label: "Examine" }, { key: "value", label: "Value (Frens)", type: "number" }, { key: "shape", label: "Icon shape", hint: "pot, bottle, Frens, log, ore, bar, sword, shield, amulet, orb, fish, egg, flour, bones, sigil, staff, gem, key, book" }, { key: "color", label: "Icon colour", hint: "#8a6a3a" }, { key: "stackable", label: "Stackable", type: "check" }, { key: "tradeable", label: "Tradeable", type: "check" }, { key: "heal", label: "Heals (0: not food)", type: "number" }, { key: "weight", label: "Weight (kg)", type: "number" }],
  quest: [{ key: "id", label: "Id (dev_…)" }, { key: "name", label: "Name" }, { key: "giver", label: "Given by", type: "select" }, { key: "item", label: "Wants", type: "select" }, { key: "count", label: "How many", type: "number" }, { key: "offer", label: "The ask (a line each)", type: "textarea" }, { key: "accept", label: "When you say yes" }, { key: "progress", label: "While you're at it" }, { key: "done", label: "When you deliver (a line each)", type: "textarea" }, { key: "coins", label: "Reward: Frens", type: "number" }, { key: "xpSkill", label: "Reward: skill", type: "select" }, { key: "xpAmount", label: "Reward: XP", type: "number" }, { key: "items", label: "Reward: items (id:n, id:n)" }, { key: "points", label: "Quest points (0–5)", type: "number" }, { key: "difficulty", label: "Difficulty" }],
};
const DEF_DEFAULTS: Record<DefKind, Record<string, string>> = {
  npc: { id: "dev_", artMode: "friend", family: "9", seed: "1", lines: "Hello there." },
  monster: { base: "", id: "dev_", level: "5", hp: "20", attack: "5", strength: "5", defence: "5", attackBonus: "0", defenceBonus: "0", maxHit: "3", speed: "4", respawn: "30", wander: "4", art: "0", drops: "[]" },
  item: { id: "dev_", value: "10", shape: "pot", color: "#8a6a3a", heal: "0", weight: "0" },
  quest: { id: "dev_", count: "5", coins: "100", xpSkill: "", xpAmount: "0", points: "1", difficulty: "Novice" },
};
const slug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 40);
const linesOf = (v: string) => v.split("\n").map(l => l.trim()).filter(Boolean);
/** The form of a definition op, and back. */
function toForm(op: Op): Record<string, string> | null {
  if (op.op === "npc") { const d = op.def; return { id: d.id, name: d.name, examine: d.examine, artMode: "canonical" in d.art ? String(d.art.canonical) : "friend", family: "family" in d.art ? String(d.art.family) : "9", seed: "seed" in d.art ? String(d.art.seed) : "1", lines: (d.lines ?? []).join("\n") }; }
  if (op.op === "monster") { const d = op.def as unknown as Record<string, unknown>; const out: Record<string, string> = { base: "" }; for (const f of DEF_FIELDS.monster) if (f.key !== "base") out[f.key] = f.key === "drops" ? JSON.stringify(d.drops ?? []) : f.type === "check" ? (d[f.key] ? "1" : "") : String(d[f.key] ?? ""); return out; }
  if (op.op === "item") { const d = op.def as unknown as Record<string, unknown>, icon = (d.icon ?? {}) as Record<string, unknown>; return { id: String(d.id), name: String(d.name), examine: String(d.examine), value: String(d.value ?? 0), shape: String(icon.shape ?? "pot"), color: String(icon.color ?? "#8a6a3a"), stackable: d.stackable ? "1" : "", tradeable: d.tradeable !== false ? "1" : "", heal: String(d.heal ?? 0), weight: String(d.weight ?? 0) }; }
  if (op.op === "quest") { const d = op.def; return { id: d.id, name: d.name, giver: d.giver, item: d.item, count: String(d.count), offer: d.offer.join("\n"), accept: d.accept, progress: d.progress, done: d.done.join("\n"), coins: String(d.rewards.coins ?? 0), xpSkill: d.rewards.xp?.skill ?? "", xpAmount: String(d.rewards.xp?.amount ?? 0), items: (d.rewards.items ?? []).map(e => `${e.id}:${e.n}`).join(", "), points: String(d.points ?? 1), difficulty: d.difficulty ?? "Novice" }; }
  return null;
}
function fromForm(kind: DefKind, f: Record<string, string>): { op?: Op; error?: string } {
  const id = slug(f.id ?? ""); if (!id.startsWith("dev_") || id.length < 5) return { error: "The id starts with dev_ and has something after it." };
  const n = (key: string, lo = 0, hi = 1_000_000) => Math.max(lo, Math.min(hi, Number(f[key]) || 0));
  if (!f.name?.trim()) return { error: "A name, please." };
  if (kind === "npc") return { op: { op: "npc", def: { id, name: f.name.trim(), examine: f.examine?.trim() || f.name.trim(), options: ["Talk-to", "Examine"], art: f.artMode === "friend" ? { family: n("family", 0, 9), seed: n("seed", 0, 1_000_000) } : { canonical: Number(f.artMode) as 7730 | 3412 }, lines: linesOf(f.lines ?? "") } } };
  if (kind === "monster") {
    let drops: unknown; try { drops = JSON.parse(f.drops || "[]"); } catch { return { error: "Drops aren't JSON." }; }
    if (!Array.isArray(drops) || !drops.every(d => d && typeof d.item === "string" && typeof d.chance === "number")) return { error: "Drops: a list of {item, min, max, chance}." };
    return { op: { op: "monster", def: { id, name: f.name.trim(), examine: f.examine?.trim() || f.name.trim(), level: n("level", 1, 1000), hp: n("hp", 1, 100000), attack: n("attack", 1, 500), strength: n("strength", 1, 500), defence: n("defence", 1, 500), attackBonus: n("attackBonus", -100, 500), defenceBonus: n("defenceBonus", -100, 500), maxHit: n("maxHit", 0, 1000), speed: n("speed", 1, 20), respawn: n("respawn", 1, 10000), wander: n("wander", 0, 40), art: n("art", 0, 10000), aggressive: !!f.aggressive, drops: drops as never } } };
  }
  if (kind === "item") return { op: { op: "item", def: { id, name: f.name.trim(), examine: f.examine?.trim() || f.name.trim(), value: n("value"), icon: { shape: (f.shape?.trim() || "pot") as never, color: f.color?.trim() || "#8a6a3a" }, ...(f.stackable ? { stackable: true } : {}), tradeable: !!f.tradeable, ...(n("heal") ? { heal: n("heal", 0, 1000) } : {}), ...(n("weight") ? { weight: n("weight", 0, 100) } : {}) } } };
  const items = (f.items ?? "").split(",").map(e => e.trim()).filter(Boolean).map(e => { const [item, count] = e.split(":"); return { id: slug(item), n: Math.max(1, Number(count) || 1) }; });
  if (!f.giver || !f.item) return { error: "Who gives it, and what they want." };
  if (!linesOf(f.offer ?? "").length || !f.accept?.trim() || !f.progress?.trim() || !linesOf(f.done ?? "").length) return { error: "Every line of the talk: the ask, yes, meanwhile, done." };
  return { op: { op: "quest", def: { id, name: f.name.trim(), giver: f.giver, item: f.item, count: n("count", 1, 1000), offer: linesOf(f.offer), accept: f.accept.trim(), progress: f.progress.trim(), done: linesOf(f.done), points: n("points", 0, 5), difficulty: f.difficulty?.trim() || "Novice", rewards: { ...(n("coins") ? { coins: n("coins") } : {}), ...(f.xpSkill && n("xpAmount") ? { xp: { skill: f.xpSkill, amount: n("xpAmount") } } : {}), ...(items.length ? { items } : {}) } } } };
}
const uid = () => `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const frames = () => [...document.querySelectorAll("iframe")].flatMap(frame => frame.contentWindow ? [frame.contentWindow] : []);
const send = (message: unknown) => frames().forEach(frame => frame.postMessage(message, "*"));
const when = (at: number | null) => at ? new Date(at).toLocaleString() : "";

/** The tools, in the palette's groups: what each does on a click in the game (edit mode). */
type Tool = "inspect" | "raise" | "lower" | "flatten" | "level" | "smooth" | "roughen" | "slope" | "height-dropper" | "paint" | "fill" | "flood" | "line" | "region" | "tile-dropper"
  | "place" | "scatter" | "remove" | "clear" | "building" | "spawn" | "campzone" | "erase" | "teleport" | "measure";
const TOOL_GROUPS: readonly (readonly [string, readonly (readonly [Tool, string, string])[]])[] = [
  ["Terrain", [["raise", "Raise", "Raise the ground (shift: lower)"], ["lower", "Lower", "Lower the ground (shift: raise)"], ["flatten", "Flatten", "Flatten to the height clicked"], ["level", "Level to", "Set the ground to a height"],
    ["smooth", "Smooth", "Smooth bumps away"], ["roughen", "Roughen", "Add natural noise"], ["slope", "Slope", "A ramp between two clicks"], ["height-dropper", "Pick height", "Take the height under the pointer"]]],
  ["Paint", [["paint", "Brush", "Paint ground with the brush"], ["fill", "Rectangle", "Fill a rectangle (two clicks)"], ["flood", "Flood", "Fill the connected ground of one kind"], ["line", "Line", "A line of ground (two clicks): roads, rivers"],
    ["region", "Region", "Set the region of a rectangle (two clicks)"], ["tile-dropper", "Pick ground", "Take the ground kind under the pointer"]]],
  ["Things", [["place", "Place", "Place one thing"], ["scatter", "Scatter", "Scatter things in the brush (forests, rocks)"], ["remove", "Remove", "Remove the thing clicked"], ["clear", "Clear area", "Remove every thing in a rectangle"],
    ["building", "Building", "A building (two corners)"], ["spawn", "Spawn", "A person or a creature"], ["campzone", "Camp zone", "Allow or forbid camping (two corners)"]]],
  ["Utility", [["inspect", "Inspect", "Just look"], ["erase", "Erase op", "Take back my ops here"], ["teleport", "Teleport", "Go there"], ["measure", "Measure", "Distance and height between two clicks"]]],
];
const TWO_CLICK: ReadonlySet<Tool> = new Set(["fill", "line", "region", "slope", "clear", "building", "campzone", "measure"]);
const BRUSHED: ReadonlySet<Tool> = new Set(["raise", "lower", "flatten", "level", "smooth", "roughen", "paint", "scatter", "erase"]);
/** Where an op is (its centre), for the ops list, the map and erasing. */
function opAt(op: Op): { x: number; y: number; x0?: number; y0?: number; x1?: number; y1?: number } | null {
  if ("x0" in op && "y0" in op && "x1" in op && "y1" in op) return { x: Math.round((op.x0 + op.x1) / 2), y: Math.round((op.y0 + op.y1) / 2), x0: Math.min(op.x0, op.x1), y0: Math.min(op.y0, op.y1), x1: Math.max(op.x0, op.x1), y1: Math.max(op.y0, op.y1) };
  if ("x" in op && "y" in op) { const r = "r" in op ? op.r : 0; return { x: op.x, y: op.y, x0: op.x - r, y0: op.y - r, x1: op.x + r, y1: op.y + r }; }
  return null;
}
const opLabel = (op: Op) => op.op === "object" ? `object ${op.decor ?? op.tree ?? op.rock ?? op.kind}` : op.op === "spawn" ? `spawn ${op.id}` : op.op === "terrain" ? `terrain ${op.mode}` : op.op === "building" ? `building ${op.name ?? ""}` : "def" in op ? `${op.op} ${op.def.id}` : op.op;

function Editor() {
  const [overlay, setOverlay] = useState<Overlay>({ v: 1, frame: 2, name: "Development world", ops: [] });
  const [version, setVersion] = useState(0), [dirty, setDirty] = useState(false), [status, setStatus] = useState("Loading the development world…");
  const [edit, setEdit] = useState(false), [tool, setTool] = useState<Tool>("inspect"), [catalog, setCatalog] = useState<DevCatalog | null>(null);
  const [pickInfo, setPick] = useState<DevPick | null>(null), [report, setReport] = useState<{ problems: string[]; unreachable: string[]; ops: number } | null>(null);
  const [revisions, setRevisions] = useState<Revision[] | null>(null), [rightTab, setRightTab] = useState<"inspect" | "ops" | "define" | "world" | "history">("inspect");
  const [bottomTab, setBottomTab] = useState<"map" | "player" | "quests" | "items" | "find" | "console" | "keys">("map");
  // Tool settings.
  const [radius, setRadius] = useState(2), [shape, setShape] = useState<"circle" | "square">("circle"), [strength, setStrength] = useState(1), [falloff, setFalloff] = useState(0.6), [target, setTarget] = useState(40);
  const [tile, setTile] = useState(1), [regionId, setRegionId] = useState(""), [lineWidth, setLineWidth] = useState(3), [density, setDensity] = useState(0.25);
  const [kind, setKind] = useState("decor"), [sub, setSub] = useState("bush"), [name, setName] = useState("");
  const [door, setDoor] = useState<"n" | "s" | "e" | "w">("s"), [floor, setFloor] = useState(11), [walls, setWalls] = useState("timber"), [spawnKind, setSpawnKind] = useState<"npc" | "monster">("npc"), [spawnId, setSpawnId] = useState(""), [wander, setWander] = useState(3);
  const [allow, setAllow] = useState(false), [why, setWhy] = useState(""), [defKind, setDefKind] = useState<DefKind>("npc"), [form, setForm] = useState<Record<string, string>>(DEF_DEFAULTS.npc), [defError, setDefError] = useState("");
  // The game's side: its state, the map, a search, the log.
  const [gameState, setGameState] = useState<DevState | null>(null), [mapUrl, setMapUrl] = useState<string | null>(null), [found, setFound] = useState<DevFound[]>([]), [query, setQuery] = useState("");
  const [log, setLog] = useState<string[]>([]), [opFilter, setOpFilter] = useState(""), [giveId, setGiveId] = useState(""), [giveN, setGiveN] = useState(1), [questFilter, setQuestFilter] = useState("");
  const [mapView, setMapView] = useState({ cx: 860, cy: 640, zoom: 1 });
  // The bottom panel starts just under the game (and its links), whatever size the frame comes out at: all the space below is the panel's.
  const [bottomTop, setBottomTop] = useState<number | string>(`calc(100vh - ${BOTTOM}px)`);
  useEffect(() => {
    const place = () => { const frame = document.querySelector("iframe"); if (!frame) return; const below = frame.getBoundingClientRect().bottom + window.scrollY + 34; setBottomTop(Math.max(BAR + 200, Math.min(window.innerHeight - 160, below))); };
    const observer = new ResizeObserver(place), watch = () => { const frame = document.querySelector("iframe"); if (frame) observer.observe(frame); place(); };
    watch(); const timer = window.setInterval(watch, 2000); window.addEventListener("resize", place);
    return () => { observer.disconnect(); clearInterval(timer); window.removeEventListener("resize", place); };
  }, []);
  const corner = useRef<{ x: number; y: number; height: number } | null>(null), past = useRef<Op[][]>([]), future = useRef<Op[][]>([]), timer = useRef<number | null>(null), current = useRef(overlay);
  const lastDrag = useRef(""), mapCanvas = useRef<HTMLCanvasElement | null>(null), mapImg = useRef<HTMLImageElement | null>(null), mapDrag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  current.current = overlay;
  const say = (text: string) => { setStatus(text); setLog(l => [...l.slice(-299), `${new Date().toLocaleTimeString()}  ${text}`]); };
  const command = (cmd: Record<string, unknown>) => send({ type: DEV_COMMAND, command: cmd });

  const push = (ops: Op[], note?: string) => {
    past.current.push(current.current.ops); if (past.current.length > 200) past.current.shift(); future.current = [];
    const next = { ...current.current, ops }; setOverlay(next); setDirty(true); if (note) say(note);
    if (timer.current) clearTimeout(timer.current); timer.current = window.setTimeout(() => send({ type: DEV_WORLD, overlay: next }), 120);
  };
  const undo = () => { const prev = past.current.pop(); if (!prev) return; future.current.push(current.current.ops); const next = { ...current.current, ops: prev }; setOverlay(next); setDirty(true); send({ type: DEV_WORLD, overlay: next }); say("Undone."); };
  const redo = () => { const next = future.current.pop(); if (!next) return; past.current.push(current.current.ops); const o = { ...current.current, ops: next }; setOverlay(o); setDirty(true); send({ type: DEV_WORLD, overlay: o }); say("Redone."); };
  const save = async (note?: string) => {
    try { const result = await devApi.save(WORLD, version, current.current, note); setVersion(result.version); setDirty(false); say(`Saved v${result.version} at ${when(result.updatedAt)}.`); }
    catch (error) { say(`Not saved: ${(error as Error).message}`); }
  };

  // The world, loaded once; the listeners, renewed whenever a setting changes (they close over the settings).
  useEffect(() => {
    devApi.load(WORLD).then(raw => { const loaded = { ...raw, overlay: northOverlay(raw.overlay) }; setOverlay(loaded.overlay); if (raw.overlay.frame !== 2 && raw.overlay.ops.length) setDirty(true); setVersion(loaded.version); say(`Loaded v${loaded.version} (${loaded.overlay.ops.length} ops${loaded.updatedAt ? `, saved ${when(loaded.updatedAt)}` : ""}).`); send({ type: DEV_WORLD, overlay: loaded.overlay }); }).catch(error => say(`Couldn't load: ${(error as Error).message}`));
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!frames().includes(event.source as Window)) return;
      const d = event.data;
      if (d?.type === DEV_CATALOG) { setCatalog(d.catalog as DevCatalog); send({ type: DEV_WORLD, overlay: current.current }); send({ type: DEV_MODE, edit }); send({ type: DEV_MAP }); }
      if (d?.type === DEV_REPORT) { setReport({ problems: d.problems ?? [], unreachable: d.unreachable ?? [], ops: d.ops ?? 0 }); if (bottomTab === "map") send({ type: DEV_MAP }); }
      if (d?.type === DEV_PICK) onPick(d.pick as DevPick, d.button as number, d.shift === true, d.drag === true);
      if (d?.type === DEV_STATE) setGameState(d.state as DevState);
      if (d?.type === DEV_FIND) setFound(d.found as DevFound[]);
      if (d?.type === DEV_MAP && typeof d.url === "string") setMapUrl(d.url);
      if (d?.type === DEV_COMMAND && typeof d.said === "string") say(d.said);
    };
    window.addEventListener("message", receive);
    const keys = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement)?.closest?.("input, textarea, select");
      if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) { event.preventDefault(); undo(); }
      else if ((event.ctrlKey || event.metaKey) && (event.key === "y" || (event.key === "z" && event.shiftKey))) { event.preventDefault(); redo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key === "s") { event.preventDefault(); void save(); }
      else if (event.key === "F2") { event.preventDefault(); toggleEdit(); }
      else if (!typing && event.key === "[") setRadius(r => Math.max(0, r - 1));
      else if (!typing && event.key === "]") setRadius(r => Math.min(16, r + 1));
      else if (!typing && event.key === "Escape") { corner.current = null; say("Cancelled."); }
    };
    window.addEventListener("keydown", keys);
    const leaving = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); } };
    window.addEventListener("beforeunload", leaving);
    return () => { window.removeEventListener("message", receive); window.removeEventListener("keydown", keys); window.removeEventListener("beforeunload", leaving); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, tool, tile, radius, shape, strength, falloff, target, regionId, lineWidth, density, kind, sub, name, door, floor, walls, spawnKind, spawnId, wander, allow, why, dirty, bottomTab, version]);

  const toggleEdit = () => { setEdit(value => { send({ type: DEV_MODE, edit: !value }); return !value; }); corner.current = null; };
  /** A click (or a drag, for the brushes) in the game, in edit mode: the tool's operation. The right button inspects whatever the tool. */
  const onPick = (p: DevPick, button: number, shift: boolean, drag: boolean) => {
    setPick(p);
    if (button === 2 || tool === "inspect") return;
    if (drag) { if (!BRUSHED.has(tool) || tool === "erase") return; const key = `${p.x},${p.y}`; if (key === lastDrag.current) return; lastDrag.current = key; } else lastDrag.current = `${p.x},${p.y}`;
    const ops = [...current.current.ops];
    const terrain = (mode: TerrainMode, extra: Partial<Extract<Op, { op: "terrain" }>> = {}) => { ops.push({ op: "terrain", x: p.x, y: p.y, r: radius, shape, mode, amount: strength, falloff, ...extra }); push(ops, `${mode} at ${p.x},${p.y} (r ${radius}).`); };
    switch (tool) {
      case "raise": return terrain(shift ? "lower" : "raise");
      case "lower": return terrain(shift ? "raise" : "lower");
      case "flatten": return terrain("flatten", { target: p.height });
      case "level": return terrain("level", { target });
      case "smooth": return terrain("smooth");
      case "roughen": return terrain("roughen", { seed: (p.x * 73856093) ^ (p.y * 19349663) });
      case "height-dropper": setTarget(Math.round(p.height * 10) / 10); setTool("level"); say(`Height ${p.height.toFixed(1)}: Level to it.`); return;
      case "tile-dropper": setTile(p.tile); setTool("paint"); say(`Ground: ${tileName(p.tile)}.`); return;
      case "paint": ops.push({ op: "paint", x: p.x, y: p.y, r: radius, shape, t: tile }); push(ops, `Painted ${tileName(tile)} at ${p.x},${p.y}.`); return;
      case "flood": ops.push({ op: "flood", x: p.x, y: p.y, t: tile, limit: 40000 }); push(ops, `Flooded ${tileName(tile)} from ${p.x},${p.y}.`); return;
      case "scatter": ops.push({ op: "scatter", uid: uid(), x: p.x, y: p.y, r: Math.max(1, radius), kind: kind as "decor", ...(sub ? { sub } : {}), density, seed: (Date.now() & 0xffff) }); push(ops, `Scattered ${sub || kind} round ${p.x},${p.y}.`); return;
      case "place": {
        const op: Op = { op: "object", uid: uid(), kind: kind as Op extends { kind: infer K } ? K : never, x: p.x, y: p.y, ...(name ? { name } : {}) };
        if (kind === "decor") Object.assign(op, { decor: sub }); if (kind === "tree") Object.assign(op, { tree: sub }); if (kind === "rock") Object.assign(op, { rock: sub }); if (kind === "spot") Object.assign(op, { spot: sub });
        ops.push(op); push(ops, `Placed ${name || sub || kind} at ${p.x},${p.y}.`); return;
      }
      case "remove": if (p.object?.uid) { const i = ops.findIndex(op => op.op === "object" && op.uid === p.object!.uid); if (i >= 0) ops.splice(i, 1); push(ops, `Took back ${p.object.name}.`); } else if (p.object) { ops.push({ op: "remove", x: p.x, y: p.y }); push(ops, `Removed ${p.object.name} at ${p.x},${p.y}.`); } else say("Nothing there."); return;
      case "spawn": if (!spawnId) { say("Choose who to spawn."); return; } ops.push({ op: "spawn", uid: uid(), kind: spawnKind, id: spawnId, x: p.x, y: p.y, wander }); push(ops, `${spawnKind} ${spawnId} at ${p.x},${p.y}.`); return;
      case "erase": {
        const r = radius, before = ops.length;
        const kept = ops.filter(op => { const at = opAt(op); if (!at || "def" in op) return true; const x0 = at.x0 ?? at.x, x1 = at.x1 ?? at.x, y0 = at.y0 ?? at.y, y1 = at.y1 ?? at.y; return !(p.x + r >= x0 && p.x - r <= x1 && p.y + r >= y0 && p.y - r <= y1); });
        if (kept.length !== before) push(kept, `Erased ${before - kept.length} op${before - kept.length === 1 ? "" : "s"} round ${p.x},${p.y}.`); else say("None of my ops there."); return;
      }
      case "teleport": command({ cmd: "teleport", x: p.x, y: p.y }); return;
    }
    if (TWO_CLICK.has(tool)) {
      if (!corner.current) { corner.current = { x: p.x, y: p.y, height: p.height }; say(`First point ${p.x},${p.y}: click the second (Esc cancels).`); return; }
      const a = corner.current; corner.current = null;
      const r = { x0: Math.min(a.x, p.x), y0: Math.min(a.y, p.y), x1: Math.max(a.x, p.x), y1: Math.max(a.y, p.y) };
      switch (tool) {
        case "fill": ops.push({ op: "fill", x0: a.x, y0: a.y, x1: p.x, y1: p.y, t: tile }); push(ops, `Filled ${a.x},${a.y} to ${p.x},${p.y} with ${tileName(tile)}.`); break;
        case "line": ops.push({ op: "line", x0: a.x, y0: a.y, x1: p.x, y1: p.y, w: lineWidth, t: tile }); push(ops, `A line of ${tileName(tile)}, ${a.x},${a.y} to ${p.x},${p.y}.`); break;
        case "region": if (!regionId) { say("Choose a region."); break; } ops.push({ op: "region", ...r, region: regionId }); push(ops, `Region ${regionId} from ${r.x0},${r.y0} to ${r.x1},${r.y1}.`); break;
        case "slope": ops.push({ op: "slope", x0: a.x, y0: a.y, x1: p.x, y1: p.y, w: lineWidth, h0: a.height, h1: p.height }); push(ops, `A slope from ${a.height.toFixed(1)} to ${p.height.toFixed(1)}.`); break;
        case "clear": ops.push({ op: "clear", ...r }); push(ops, `Cleared ${r.x0},${r.y0} to ${r.x1},${r.y1}.`); break;
        case "campzone": ops.push({ op: "campzone", uid: uid(), ...r, allow, ...(why.trim() ? { why: why.trim() } : {}) }); push(ops, `Camping ${allow ? "allowed" : "forbidden"} from ${r.x0},${r.y0} to ${r.x1},${r.y1}.`); break;
        case "building": ops.push({ op: "building", uid: uid(), x0: a.x, y0: a.y, x1: p.x, y1: p.y, door, floor, walls: walls as "timber", ...(name ? { name } : {}) }); push(ops, `Building ${a.x},${a.y} to ${p.x},${p.y} (door ${door}).`); break;
        case "measure": { const dx = p.x - a.x, dy = p.y - a.y; say(`Measure: ${dx}, ${dy} (${Math.hypot(dx, dy).toFixed(1)} tiles; ${Math.max(Math.abs(dx), Math.abs(dy))} steps), height ${a.height.toFixed(1)} → ${p.height.toFixed(1)} (${(p.height - a.height).toFixed(1)}).`); break; }
      }
    }
  };
  const tileName = (t: number) => Object.entries(catalog?.tiles ?? {}).find(([, v]) => v === t)?.[0].toLowerCase() ?? String(t);
  const loadRevisions = () => devApi.revisions(WORLD).then(r => setRevisions(r.revisions)).catch(error => say(`Couldn't list revisions: ${(error as Error).message}`));
  const take = (raw: { version: number; overlay: Overlay }, what: string) => { const loaded = { ...raw, overlay: northOverlay(raw.overlay) }; past.current = []; future.current = []; setOverlay(loaded.overlay); setVersion(loaded.version); setDirty(false); send({ type: DEV_WORLD, overlay: loaded.overlay }); say(`${what}: now v${loaded.version}.`); void loadRevisions(); };
  const importFile = (file: File) => { void file.text().then(text => { const parsed = JSON.parse(text) as Overlay; if (parsed?.v !== 1 || !Array.isArray(parsed.ops)) throw new Error("not an overlay"); const raw = northOverlay(parsed); push(raw.ops, `Imported ${file.name} (${raw.ops.length} ops); save to keep it.`); }).catch(error => say(`Couldn't import: ${(error as Error).message}`)); };
  /** The definitions tab: an op a definition (npc, monster, item, quest), one of each id; the form fills from one and makes one. */
  const defs = overlay.ops.filter(op => op.op === "npc" || op.op === "monster" || op.op === "item" || op.op === "quest") as Extract<Op, { def: { id: string } }>[];
  const chooseDef = (k: DefKind) => { setDefKind(k); setForm(DEF_DEFAULTS[k]); setDefError(""); };
  const editDef = (op: Op) => { const f = toForm(op); if (f) { setDefKind(op.op as DefKind); setForm(f); setDefError(""); } };
  const commitDef = () => {
    const made = fromForm(defKind, form); if (!made.op) { setDefError(made.error ?? "No."); return; }
    const op = made.op as Extract<Op, { def: { id: string } }>, ops = current.current.ops.filter(entry => !("def" in entry && entry.op === op.op && entry.def.id === op.def.id));
    ops.push(op); setDefError(""); push(ops, `${op.op} ${op.def.id} defined; save to keep it.`);
  };
  const dropDef = (op: Extract<Op, { def: { id: string } }>) => push(current.current.ops.filter(entry => !(entry.op === op.op && "def" in entry && entry.def.id === op.def.id)), `${op.op} ${op.def.id} taken out.`);
  const setField = (key: string, value: string) => setForm(f => {
    const next = { ...f, [key]: value };
    if (key === "base" && value) { const m = catalog?.monsters.find(entry => entry.id === value); if (m) { next.art = String(m.art); next.level = String(m.level); if (!next.name) next.name = m.name; } }
    return next;
  });
  const people = ([...(catalog?.npcs ?? []), ...defs.flatMap(op => op.op === "npc" ? [{ id: op.def.id, name: op.def.name }] : [])]).filter((p, i, all) => all.findIndex(q => q.id === p.id) === i);
  const wares = ([...(catalog?.items ?? []), ...defs.flatMap(op => op.op === "item" ? [{ id: op.def.id, name: op.def.name }] : [])]).filter((p, i, all) => all.findIndex(q => q.id === p.id) === i);
  const optionsFor = (field: Field): readonly (readonly [string, string])[] => field.options ?? (field.key === "base" ? [["", "—"], ...(catalog?.monsters ?? []).map(m => [m.id, `${m.name} (${m.level})`] as const)] : field.key === "giver" ? [["", "—"], ...people.map(p => [p.id, `${p.name} · ${p.id}`] as const)] : field.key === "item" ? [["", "—"], ...wares.map(p => [p.id, `${p.name} · ${p.id}`] as const)] : field.key === "xpSkill" ? [["", "—"], ...(catalog?.skills ?? []).map(sk => [sk, sk] as const)] : []);
  const subs = kind === "decor" ? catalog?.decor : kind === "tree" ? catalog?.trees : kind === "rock" ? catalog?.rocks : kind === "spot" ? catalog?.spots : null;
  const spawnable = spawnKind === "npc" ? people : (catalog?.monsters ?? []).map(m => ({ id: m.id, name: `${m.name} (${m.level})` }));

  // ---------- The map: the whole world, panned and zoomed; a click teleports, the player and my ops marked ----------
  useEffect(() => { if (!mapUrl) return; const img = new Image(); img.onload = () => { mapImg.current = img; drawMap(); }; img.src = mapUrl; }, [mapUrl]);
  useEffect(() => { drawMap(); });
  const drawMap = () => {
    const canvas = mapCanvas.current, img = mapImg.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!, w = canvas.width = canvas.clientWidth, h = canvas.height = canvas.clientHeight, z = mapView.zoom;
    ctx.fillStyle = "#0e0e10"; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = false;
    const ox = w / 2 - mapView.cx * z, oy = h / 2 - mapView.cy * z;
    if (img) ctx.drawImage(img, ox, oy, img.width * z, img.height * z);
    ctx.strokeStyle = "rgba(226,196,106,0.7)"; ctx.lineWidth = 1;
    for (const op of overlay.ops) { const at = opAt(op); if (!at) continue; const x0 = (at.x0 ?? at.x) * z + ox, y0 = (at.y0 ?? at.y) * z + oy; ctx.strokeRect(x0, y0, Math.max(2, ((at.x1 ?? at.x) - (at.x0 ?? at.x) + 1) * z), Math.max(2, ((at.y1 ?? at.y) - (at.y0 ?? at.y) + 1) * z)); }
    if (gameState) { ctx.fillStyle = "#ff4060"; ctx.beginPath(); ctx.arc(gameState.x * z + ox, gameState.y * z + oy, Math.max(3, z * 1.5), 0, Math.PI * 2); ctx.fill(); }
    for (const f of found.slice(0, 60)) { ctx.fillStyle = "#4fd1ff"; ctx.fillRect(f.x * z + ox - 2, f.y * z + oy - 2, 4, 4); }
  };
  const mapToWorld = (event: React.MouseEvent<HTMLCanvasElement>) => { const c = mapCanvas.current!, rect = c.getBoundingClientRect(), z = mapView.zoom; return { x: Math.round((event.clientX - rect.left - c.width / 2) / z + mapView.cx), y: Math.round((event.clientY - rect.top - c.height / 2) / z + mapView.cy) }; };

  // ---------- Styles ----------
  const C = { bg: "#17161a", panel: "#1f1e23", line: "#3a3940", ink: "#efede7", gold: "#e2c46a", dim: "#9a978f", warn: "#f0a050" };
  const S = {
    bar: { position: "fixed", top: 0, left: 0, right: 0, height: BAR, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", background: C.bg, color: C.ink, borderBottom: `1px solid ${C.line}`, font: "12px ui-monospace, Menlo, Consolas, monospace", zIndex: 60, boxSizing: "border-box" } as const,
    left: { position: "fixed", top: BAR, left: 0, bottom: 0, width: LEFT, overflow: "auto", background: C.panel, color: C.ink, borderRight: `1px solid ${C.line}`, font: "12px ui-monospace, Menlo, Consolas, monospace", padding: 10, boxSizing: "border-box", zIndex: 50 } as const,
    right: { position: "fixed", top: BAR, right: 0, bottom: 0, width: RIGHT, overflow: "auto", background: C.panel, color: C.ink, borderLeft: `1px solid ${C.line}`, font: "12px ui-monospace, Menlo, Consolas, monospace", padding: 10, boxSizing: "border-box", zIndex: 50 } as const,
    bottom: { position: "fixed", left: LEFT, right: RIGHT, bottom: 0, top: bottomTop, display: "flex", flexDirection: "column", background: C.panel, color: C.ink, borderTop: `1px solid ${C.line}`, font: "12px ui-monospace, Menlo, Consolas, monospace", zIndex: 50, boxSizing: "border-box" } as const,
    row: { display: "flex", flexWrap: "wrap", gap: 4, margin: "6px 0", alignItems: "center" } as const,
    btn: (on = false) => ({ font: "inherit", padding: "4px 7px", border: `1px solid ${on ? C.gold : C.line}`, background: on ? C.gold : "#2a2930", color: on ? "#161616" : C.ink, cursor: "pointer", borderRadius: 3 }) as const,
    input: { font: "inherit", padding: 3, width: "100%", boxSizing: "border-box", background: "#efede7", color: "#161616", border: 0, borderRadius: 2 } as const,
    small: { font: "inherit", padding: 2, width: 64, background: "#efede7", color: "#161616", border: 0, borderRadius: 2 } as const,
    h: { margin: "12px 0 4px", fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: 1 } as const, muted: { color: C.dim } as const,
    item: { display: "flex", gap: 6, alignItems: "center", padding: "3px 0", borderBottom: `1px solid ${C.line}` } as const,
  };
  const slider = (label: string, value: number, set: (v: number) => void, min: number, max: number, step: number) => <label style={{ display: "block", margin: "4px 0" }}>{label}: <b>{value}</b><input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))} style={{ width: "100%" }} /></label>;
  const toolInfo = TOOL_GROUPS.flatMap(([, tools]) => tools).find(([id]) => id === tool);
  const shownOps = overlay.ops.map((op, i) => ({ op, i })).filter(({ op }) => !opFilter || opLabel(op).includes(opFilter)).slice(-400).reverse();
  const quests = (catalog?.quests ?? []).filter(q => !questFilter || q.name.toLowerCase().includes(questFilter.toLowerCase()) || q.id.includes(questFilter));

  return (<>
    <header style={S.bar} aria-label="Development dashboard">
      <b style={{ color: C.gold }}>Realm dev</b><span style={S.muted}>{overlay.name}</span><span>{dirty ? "● unsaved" : `v${version}`}</span>
      <button type="button" style={S.btn(edit)} onClick={toggleEdit}>{edit ? "Edit mode (F2: play)" : "Play mode (F2: edit)"}</button>
      <button type="button" style={S.btn()} onClick={undo} disabled={!past.current.length}>Undo</button><button type="button" style={S.btn()} onClick={redo} disabled={!future.current.length}>Redo</button>
      <button type="button" style={S.btn(dirty)} onClick={() => void save()}>Save</button>
      <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", marginLeft: 8 }} role="status">{status}</span>
      {gameState?.flags.sandbox && <span style={{ color: C.warn }} title="Something was changed by hand: this session isn't saved, and other players don't see you.">SANDBOX</span>}
      {gameState && <span style={S.muted}>{gameState.x},{gameState.y} · {gameState.region} · h {gameState.height}</span>}
      <input style={{ ...S.input, width: 220 }} placeholder="Find (things, people, places)…" value={query} onChange={e => { setQuery(e.target.value); send({ type: DEV_FIND, query: e.target.value }); setBottomTab("find"); }} />
    </header>

    <aside style={S.left} aria-label="Development editor">
      {TOOL_GROUPS.map(([group, tools]) => <div key={group}><h4 style={S.h}>{group}</h4><div style={S.row}>{tools.map(([id, label, title]) => <button key={id} type="button" title={title} style={S.btn(tool === id)} onClick={() => { setTool(id); corner.current = null; }}>{label}</button>)}</div></div>)}
      <h4 style={S.h}>{toolInfo?.[1] ?? "Tool"}</h4><div style={S.muted}>{toolInfo?.[2]}{TWO_CLICK.has(tool) ? " · two clicks" : ""}{BRUSHED.has(tool) ? " · drag to brush" : ""}</div>
      {BRUSHED.has(tool) && <>
        {slider("Brush radius ([ ])", radius, setRadius, 0, 16, 1)}
        <div style={S.row}>{(["circle", "square"] as const).map(s => <button key={s} type="button" style={S.btn(shape === s)} onClick={() => setShape(s)}>{s}</button>)}</div>
      </>}
      {["raise", "lower", "smooth", "roughen", "flatten", "level"].includes(tool) && <>{slider("Strength (steps)", strength, setStrength, 0.25, 8, 0.25)}{slider("Soft edge", falloff, setFalloff, 0, 1, 0.05)}</>}
      {tool === "level" && <><h4 style={S.h}>Height</h4><input style={S.input} type="number" step={0.5} value={target} onChange={e => setTarget(Number(e.target.value))} /><p style={S.muted}>Pick height takes it off the ground.</p></>}
      {["line", "slope"].includes(tool) && slider("Width", lineWidth, setLineWidth, 1, 15, 1)}
      {["paint", "fill", "flood", "line"].includes(tool) && <><h4 style={S.h}>Ground</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>{Object.entries(catalog?.tiles ?? {}).filter(([n]) => n !== "VOID").map(([n, v]) => <button key={n} type="button" style={S.btn(tile === v)} onClick={() => setTile(v)}>{n.toLowerCase()}</button>)}</div></>}
      {tool === "region" && <><h4 style={S.h}>Region</h4><select style={S.input} value={regionId} onChange={e => setRegionId(e.target.value)}><option value="">—</option>{(catalog?.regions ?? []).map(r => <option key={r.id} value={r.id}>{r.name} · {r.id}</option>)}</select></>}
      {(tool === "place" || tool === "scatter") && <>
        <h4 style={S.h}>Kind</h4><select style={S.input} value={kind} onChange={e => { setKind(e.target.value); setSub(""); }}>{(tool === "scatter" ? ["tree", "rock", "decor"] : catalog?.kinds ?? ["decor"]).map(k => <option key={k} value={k}>{k}</option>)}</select>
        {subs && <><h4 style={S.h}>Which</h4><select style={S.input} value={sub} onChange={e => setSub(e.target.value)}><option value="">—</option>{subs.map(s => <option key={s} value={s}>{s}</option>)}</select></>}
        {tool === "place" && <><h4 style={S.h}>Name (optional)</h4><input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="What Examine calls it" /></>}
        {tool === "scatter" && slider("Density", density, setDensity, 0.02, 1, 0.02)}
      </>}
      {tool === "building" && <>
        <h4 style={S.h}>Door side</h4><div style={S.row}>{(["n", "s", "e", "w"] as const).map(d => <button key={d} type="button" style={S.btn(door === d)} onClick={() => setDoor(d)}>{d}</button>)}</div>
        <h4 style={S.h}>Floor</h4><select style={S.input} value={floor} onChange={e => setFloor(Number(e.target.value))}>{Object.entries(catalog?.tiles ?? {}).filter(([n]) => ["WOOD", "STONE", "CARPET", "COBBLE", "BRICK", "DUNGEON"].includes(n)).map(([n, v]) => <option key={n} value={v}>{n.toLowerCase()}</option>)}</select>
        <h4 style={S.h}>Walls</h4><select style={S.input} value={walls} onChange={e => setWalls(e.target.value)}>{["timber", "stone", "plank", "marble"].map(w => <option key={w} value={w}>{w}</option>)}</select>
        <h4 style={S.h}>Name</h4><input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="The sign over the door" />
      </>}
      {tool === "spawn" && <>
        <div style={S.row}>{(["npc", "monster"] as const).map(k => <button key={k} type="button" style={S.btn(spawnKind === k)} onClick={() => { setSpawnKind(k); setSpawnId(""); }}>{k}</button>)}</div>
        <select style={S.input} value={spawnId} onChange={e => setSpawnId(e.target.value)}><option value="">—</option>{spawnable.map(p => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select>
        {slider("Wander (tiles)", wander, setWander, 0, 40, 1)}
      </>}
      {tool === "campzone" && <>
        <div style={S.row}>{([[true, "Allow camping"], [false, "Forbid camping"]] as const).map(([v, label]) => <button key={label} type="button" style={S.btn(allow === v)} onClick={() => setAllow(v)}>{label}</button>)}</div>
        <h4 style={S.h}>Why (said when forbidden)</h4><input style={S.input} value={why} onChange={e => setWhy(e.target.value)} placeholder="Camping isn't allowed here." />
      </>}
      <p style={S.muted}>Edit mode (F2) turns clicks in the game into the tool; right-click inspects. Terrain changes the land's own floor, so a saved world bakes exactly as you see it; ground can't be dug below its floor.</p>
    </aside>

    <aside style={S.right} aria-label="Development panels">
      <div style={S.row}>{(["inspect", "ops", "define", "world", "history"] as const).map(tab => <button key={tab} type="button" style={S.btn(rightTab === tab)} onClick={() => { setRightTab(tab); if (tab === "history") void loadRevisions(); }}>{tab}</button>)}</div>
      {rightTab === "inspect" && <>
        <h4 style={S.h}>Under the pointer</h4>
        {pickInfo ? <div>
          <div>{pickInfo.x},{pickInfo.y} · {pickInfo.region}</div>
          <div>ground <b>{tileName(pickInfo.tile)}</b> · height <b>{pickInfo.height.toFixed(1)}</b> · floor {pickInfo.base.toFixed(1)}</div>
          {pickInfo.object && <div>{pickInfo.object.kind}: <b>{pickInfo.object.name}</b>{pickInfo.object.uid ? " (mine)" : ""}</div>}
          {pickInfo.building && <div>building: <b>{pickInfo.building.name || "unnamed"}</b></div>}
          <div style={S.row}><button type="button" style={S.btn()} onClick={() => command({ cmd: "teleport", x: pickInfo.x, y: pickInfo.y })}>Go there</button><button type="button" style={S.btn()} onClick={() => { setTarget(Math.round(pickInfo.height * 10) / 10); setTool("level"); }}>Level to this height</button><button type="button" style={S.btn()} onClick={() => { setTile(pickInfo.tile); setTool("paint"); }}>Paint this ground</button></div>
        </div> : <div style={S.muted}>Click in the game in edit mode (right-click with any tool).</div>}
        <h4 style={S.h}>The game</h4>
        {gameState ? <div>
          <div>{gameState.x},{gameState.y} · {gameState.region} · tick {gameState.tick}</div>
          <div>hp {gameState.hp}/{gameState.maxHp} · faith {gameState.faith} · energy {gameState.energy}{gameState.aboard ? " · aboard" : ""}</div>
          <div style={S.muted}>near: {gameState.near.monsters} creatures, {gameState.near.npcs} people, {gameState.near.objects} things</div>
        </div> : <div style={S.muted}>Waiting for the game…</div>}
        {report && <><h4 style={S.h}>Report</h4><div style={S.muted}>{report.ops} ops applied.</div>{report.problems.map((p, i) => <div key={`p${i}`} style={{ color: C.warn }}>{p}</div>)}{report.unreachable.map((p, i) => <div key={`u${i}`} style={{ color: C.warn }}>⚠ {p}</div>)}</>}
      </>}
      {rightTab === "ops" && <>
        <div style={S.row}><input style={{ ...S.input, flex: 1 }} placeholder="Filter (terrain, paint, spawn…)" value={opFilter} onChange={e => setOpFilter(e.target.value)} /></div>
        <div style={S.muted}>{overlay.ops.length} ops{opFilter ? `, ${shownOps.length} shown` : ""} (newest first)</div>
        {opFilter && <div style={S.row}><button type="button" style={S.btn()} onClick={() => { if (confirm(`Remove every op matching “${opFilter}”?`)) push(overlay.ops.filter(op => !opLabel(op).includes(opFilter)), `Removed the ops matching ${opFilter}.`); }}>Remove all shown</button></div>}
        {shownOps.map(({ op, i }) => { const at = opAt(op); return <div key={i} style={S.item}>
          <span style={{ flex: 1 }}>{opLabel(op)} {at && <span style={S.muted}>{at.x},{at.y}</span>}</span>
          {at && <button type="button" style={S.btn()} onClick={() => command({ cmd: "teleport", x: at.x, y: at.y })}>Go</button>}
          <button type="button" style={S.btn()} onClick={() => push(overlay.ops.filter((_, k) => k !== i), `Removed op ${i} (${opLabel(op)}).`)}>✕</button>
        </div>; })}
      </>}
      {rightTab === "define" && <>
        <div style={S.row}>{(["npc", "monster", "item", "quest"] as const).map(k => <button key={k} type="button" style={S.btn(defKind === k)} onClick={() => chooseDef(k)}>{k}</button>)}</div>
        {DEF_FIELDS[defKind].filter(field => defKind !== "npc" || field.key !== "family" && field.key !== "seed" || form.artMode === "friend").map(field => <div key={field.key}>
          <h4 style={S.h}>{field.label}</h4>
          {field.type === "textarea" ? <textarea style={{ ...S.input, minHeight: 56 }} value={form[field.key] ?? ""} onChange={e => setField(field.key, e.target.value)} />
            : field.type === "check" ? <label><input type="checkbox" checked={!!form[field.key]} onChange={e => setField(field.key, e.target.checked ? "1" : "")} /> yes</label>
            : field.type === "select" ? <select style={S.input} value={form[field.key] ?? ""} onChange={e => setField(field.key, e.target.value)}>{optionsFor(field).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
            : <input style={S.input} type={field.type === "number" ? "number" : "text"} value={form[field.key] ?? ""} placeholder={field.hint} onChange={e => setField(field.key, e.target.value)} />}
        </div>)}
        {defError && <p style={{ color: C.warn }}>{defError}</p>}
        <div style={S.row}><button type="button" style={S.btn(true)} onClick={commitDef}>Define {defKind}</button><button type="button" style={S.btn()} onClick={() => chooseDef(defKind)}>Clear</button></div>
        <p style={S.muted}>Defined things are placed with the Spawn tool (people, monsters) or given by quests; a quest hangs on whoever gives it, the game's own people included, until it's done.</p>
        <h4 style={S.h}>Defined ({defs.length})</h4>
        {defs.map(op => <div key={`${op.op}:${op.def.id}`} style={S.item}>
          <span style={{ flex: 1 }}>{op.op} <b>{(op.def as { name?: string }).name ?? op.def.id}</b> <span style={S.muted}>{op.def.id}</span></span>
          <button type="button" style={S.btn()} onClick={() => editDef(op)}>Edit</button><button type="button" style={S.btn()} onClick={() => dropDef(op)}>Remove</button>
        </div>)}
      </>}
      {rightTab === "world" && <>
        <h4 style={S.h}>Name</h4><input style={S.input} value={overlay.name ?? ""} onChange={e => { const next = { ...current.current, name: e.target.value }; setOverlay(next); setDirty(true); }} />
        <div style={S.row}>
          <a style={S.btn()} href={devApi.exportUrl(WORLD)} download>Export (JSON)</a>
          <label style={S.btn()}>Import… <input type="file" accept="application/json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} /></label>
          <button type="button" style={S.btn()} onClick={() => { if (confirm("Back to the baseline: an empty overlay? The current one is kept as a revision.")) devApi.reset(WORLD).then(r => take(r, "Reset")).catch(error => say(`Couldn't reset: ${(error as Error).message}`)); }}>Reset to baseline…</button>
        </div>
        <p style={S.muted}>To publish: save, then <code>node scripts/dev-promote.mjs --fetch &lt;slug&gt; --pr</code> (or export and pass the file) checks the overlay on a fresh world, writes it under games/rarefriends-realm/overlays/ and opens a pull request; the change is reviewed and reverted like any other. Nothing reaches players any other way.</p>
        <div style={S.row}><button type="button" style={S.btn()} onClick={() => void devApi.logout().then(() => location.reload())}>Sign out</button><button type="button" style={S.btn()} onClick={() => { if (confirm("End every session, everywhere?")) void devApi.logoutAll().then(() => location.reload()); }}>Sign out everywhere</button></div>
      </>}
      {rightTab === "history" && <>
        <div style={S.row}><input style={{ ...S.input, width: "auto", flex: 1 }} placeholder="Checkpoint name" value={name} onChange={e => setName(e.target.value)} /><button type="button" style={S.btn()} onClick={() => void save().then(() => devApi.checkpoint(WORLD, name)).then(r => { say(`Checkpoint: ${r.name}.`); void loadRevisions(); })}>Checkpoint</button></div>
        {!revisions && <div style={S.muted}>Loading…</div>}
        {revisions?.map(r => <div key={r.id} style={S.item}>
          <span style={{ flex: 1 }}>{r.name ? <b>{r.name}</b> : <span style={S.muted}>v{r.version}{r.note ? ` · ${r.note}` : ""}</span>} <span style={S.muted}>{when(r.at)} · {(r.size / 1024).toFixed(1)} KB</span></span>
          <button type="button" style={S.btn()} onClick={() => { if (confirm(`Restore ${r.name ?? `v${r.version}`}? The current overlay is kept as a revision.`)) devApi.restore(WORLD, r.id).then(res => take(res, "Restored")).catch(error => say(`Couldn't restore: ${(error as Error).message}`)); }}>Restore</button>
        </div>)}
      </>}
    </aside>

    <section style={S.bottom} aria-label="Development tools">
      <div style={{ ...S.row, margin: 0, padding: "6px 10px", borderBottom: `1px solid ${C.line}` }}>{(["map", "player", "quests", "items", "find", "console", "keys"] as const).map(tab => <button key={tab} type="button" style={S.btn(bottomTab === tab)} onClick={() => { setBottomTab(tab); if (tab === "map") send({ type: DEV_MAP }); }}>{tab}</button>)}</div>
      <div style={{ flex: 1, overflow: "auto", padding: bottomTab === "map" ? 0 : 10, position: "relative" }}>
        {bottomTab === "map" && <>
          <canvas ref={mapCanvas} style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
            onWheel={e => setMapView(v => ({ ...v, zoom: Math.max(0.25, Math.min(12, v.zoom * (e.deltaY < 0 ? 1.25 : 0.8))) }))}
            onMouseDown={e => { mapDrag.current = { x: e.clientX, y: e.clientY, cx: mapView.cx, cy: mapView.cy, moved: false }; }}
            onMouseMove={e => { const d = mapDrag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true; if (d.moved) setMapView(v => ({ ...v, cx: d.cx - dx / v.zoom, cy: d.cy - dy / v.zoom })); }}
            onMouseUp={e => { const d = mapDrag.current; mapDrag.current = null; if (d && !d.moved) { const at = mapToWorld(e); command({ cmd: "teleport", x: at.x, y: at.y }); } }} />
          <div style={{ position: "absolute", top: 6, right: 8, display: "flex", gap: 4 }}>
            <button type="button" style={S.btn()} onClick={() => gameState && setMapView(v => ({ ...v, cx: gameState.x, cy: gameState.y }))}>Centre on me</button>
            <button type="button" style={S.btn()} onClick={() => setMapView({ cx: 860, cy: 1300, zoom: 0.1 })}>Whole world</button>
            <button type="button" style={S.btn()} onClick={() => send({ type: DEV_MAP })}>Refresh</button>
          </div>
          <div style={{ position: "absolute", bottom: 4, left: 8, ...S.muted }}>Wheel: zoom · drag: pan · click: teleport · gold boxes: my ops · red: you · blue: found</div>
        </>}
        {bottomTab === "player" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          <div>
            <h4 style={S.h}>State</h4>
            <div style={S.row}><button type="button" style={S.btn()} onClick={() => command({ cmd: "heal" })}>Heal</button><button type="button" style={S.btn(gameState?.flags.god)} onClick={() => command({ cmd: "god", on: !gameState?.flags.god })}>God mode</button><button type="button" style={S.btn(gameState?.flags.noclip)} onClick={() => command({ cmd: "noclip", on: !gameState?.flags.noclip })}>Walk through anything</button></div>
            <div style={S.row}><button type="button" style={S.btn()} onClick={() => command({ cmd: "clear-near", r: 16 })}>Put down what's near</button><button type="button" style={S.btn()} onClick={() => { if (confirm("Empty the pack?")) command({ cmd: "clear-pack" }); }}>Empty pack</button></div>
            <h4 style={S.h}>Frens ({gameState?.frens.toLocaleString() ?? "?"})</h4>
            <div style={S.row}>{[1000, 100000, 10000000].map(n => <button key={n} type="button" style={S.btn()} onClick={() => command({ cmd: "frens", n })}>+{n.toLocaleString()}</button>)}</div>
            <h4 style={S.h}>Time and weather</h4>
            <div style={S.row}>{[6, 12, 18, 0].map(h => <button key={h} type="button" style={S.btn()} onClick={() => command({ cmd: "time", hour: h })}>{h}:00</button>)}<button type="button" style={S.btn()} onClick={() => command({ cmd: "time", hour: null })}>clock</button></div>
            <div style={S.row}>{(["clear", "rain", "storm", "fog", "auto"] as const).map(k => <button key={k} type="button" style={S.btn()} onClick={() => command({ cmd: "weather", kind: k })}>{k}</button>)}</div>
            <p style={{ color: C.warn }}>Anything here except time and weather puts the session in the sandbox: it stops saving, and other players stop seeing you.</p>
          </div>
          <div>
            <h4 style={S.h}>Levels</h4>
            <div style={S.row}>{[1, 30, 60, 99].map(l => <button key={l} type="button" style={S.btn()} onClick={() => command({ cmd: "levels", level: l })}>all {l}</button>)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>{(catalog?.skills ?? []).map(skill => <label key={skill} style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>{skill}<input style={{ ...S.small, width: 48 }} type="number" min={1} max={99} defaultValue={gameState?.levels[skill] ?? 1} key={`${skill}:${gameState?.levels[skill]}`} onKeyDown={e => { if (e.key === "Enter") command({ cmd: "level", skill, level: Number((e.target as HTMLInputElement).value) }); }} /></label>)}</div>
            <p style={S.muted}>Type a level and press Enter.</p>
          </div>
          <div>
            <h4 style={S.h}>Standing</h4>
            {["oathsworn", "hearthwardens", "farwake", "freeholds"].map(f => <label key={f} style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>{f}<input style={S.small} type="number" min={0} defaultValue={gameState?.standing[f] ?? 0} key={`${f}:${gameState?.standing[f]}`} onKeyDown={e => { if (e.key === "Enter") command({ cmd: "standing", faction: f, n: Number((e.target as HTMLInputElement).value) }); }} /></label>)}
          </div>
        </div>}
        {bottomTab === "quests" && <>
          <div style={S.row}><input style={{ ...S.input, width: 280 }} placeholder="Filter quests" value={questFilter} onChange={e => setQuestFilter(e.target.value)} /><span style={S.muted}>{quests.length} quests</span></div>
          {quests.map(q => { const st = gameState?.quests[q.id] ?? 0; return <div key={q.id} style={S.item}>
            <span style={{ flex: 1 }}>{q.name} <span style={S.muted}>{q.id} · stage {st}</span></span>
            <button type="button" style={S.btn()} onClick={() => command({ cmd: "quest", id: q.id, to: "start" })}>Start</button><button type="button" style={S.btn()} onClick={() => command({ cmd: "quest", id: q.id, to: "finish" })}>Finish</button><button type="button" style={S.btn()} onClick={() => command({ cmd: "quest", id: q.id, to: "reset" })}>Reset</button>
          </div>; })}
        </>}
        {bottomTab === "items" && <>
          <div style={S.row}>
            <input style={{ ...S.input, width: 320 }} list="dev-items" placeholder="Item (name or id)" value={giveId} onChange={e => setGiveId(e.target.value)} />
            <datalist id="dev-items">{wares.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</datalist>
            <input style={S.small} type="number" min={1} value={giveN} onChange={e => setGiveN(Number(e.target.value))} />
            <button type="button" style={S.btn(true)} onClick={() => { const id = wares.find(w => w.id === giveId || w.name.toLowerCase() === giveId.toLowerCase())?.id; if (id) command({ cmd: "give", id, n: giveN }); else say(`No item ${giveId}.`); }}>Give</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 2 }}>{wares.filter(w => !giveId || w.name.toLowerCase().includes(giveId.toLowerCase()) || w.id.includes(giveId.toLowerCase())).slice(0, 300).map(w => <button key={w.id} type="button" style={{ ...S.btn(), textAlign: "left" }} onClick={() => command({ cmd: "give", id: w.id, n: giveN })}>{w.name} <span style={S.muted}>{w.id}</span></button>)}</div>
        </>}
        {bottomTab === "find" && <>
          <div style={S.row}><input style={{ ...S.input, width: 320 }} placeholder="Find…" value={query} onChange={e => { setQuery(e.target.value); send({ type: DEV_FIND, query: e.target.value }); }} /><span style={S.muted}>{found.length} found</span></div>
          {found.map((f, i) => <div key={i} style={S.item}><span style={{ flex: 1 }}><span style={S.muted}>{f.kind}</span> {f.name} {f.id && <span style={S.muted}>{f.id}</span>} <span style={S.muted}>{f.x},{f.y}</span></span>
            <button type="button" style={S.btn()} onClick={() => command({ cmd: "teleport", x: f.x, y: f.y })}>Go</button><button type="button" style={S.btn()} onClick={() => { setMapView(v => ({ ...v, cx: f.x, cy: f.y, zoom: Math.max(v.zoom, 3) })); setBottomTab("map"); }}>Map</button></div>)}
        </>}
        {bottomTab === "console" && <><div style={S.row}><button type="button" style={S.btn()} onClick={() => setLog([])}>Clear</button></div><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{log.slice().reverse().join("\n")}</pre></>}
        {bottomTab === "keys" && <div style={{ columns: 2 }}>
          {[["F2", "edit / play mode"], ["Ctrl+Z / Ctrl+Y", "undo / redo"], ["Ctrl+S", "save"], ["[ ]", "brush smaller / larger"], ["Esc", "cancel a two-click tool"], ["Right-click", "inspect, whatever the tool"], ["Shift+click", "raise ↔ lower"], ["Drag", "keep brushing (terrain, paint, scatter)"], ["Map", "wheel zoom, drag pan, click teleport"]].map(([k, v]) => <div key={k}><b>{k}</b> <span style={S.muted}>{v}</span></div>)}
        </div>}
      </div>
    </section>
  </>);
}

/** The dashboard's frame round the game: a bar along the top, the tools down the left, the panels down the right, more along the bottom. */
const BAR = 40, LEFT = 300, RIGHT = 360, BOTTOM = 300;
/** Mounted by the host page when it's the development build. */
export function mountEditor() {
  const container = document.createElement("div"); document.body.append(container);
  Object.assign(document.body.style, { paddingTop: `${BAR}px`, paddingLeft: `${LEFT}px`, paddingRight: `${RIGHT}px`, paddingBottom: `${BOTTOM}px`, background: "#121114", color: "#efede7", boxSizing: "border-box" });
  createRoot(container).render(<Editor />);
}
