/**
 * The development editor: a panel beside the game frame in the private development game (built only with
 * --dev-tools; served by the Worker behind the owner's login). It keeps the overlay (games/rarefriends-realm/overlay.ts)
 * and its history, sends the whole overlay to the game whenever it changes (the game rebuilds its world from the bake
 * with it), and saves it to the service with its revisions. In edit mode the game reports what was clicked and the
 * current tool makes an operation of it. The game itself is the public build, untouched.
 */
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEV_CATALOG, DEV_MODE, DEV_PICK, DEV_REPORT, DEV_TELEPORT, DEV_WORLD, type DevCatalog, type DevPick } from "../games/rarefriends-realm/roster.ts";
import type { Op, Overlay } from "../games/rarefriends-realm/overlay.ts";
import { northOverlay } from "../games/rarefriends-realm/northframe.ts";
import { devApi, type Revision } from "./dev.ts";

const WORLD = "main";
type Tool = "inspect" | "tile" | "fill" | "lift" | "remove" | "place" | "building" | "spawn" | "campzone" | "erase" | "teleport";
const TOOLS: [Tool, string][] = [["inspect", "Inspect"], ["tile", "Paint tile"], ["fill", "Fill rect"], ["lift", "Raise ground"], ["place", "Place thing"], ["building", "Building"], ["spawn", "Spawn"], ["campzone", "Camp zone"], ["remove", "Remove thing"], ["erase", "Erase my op"], ["teleport", "Teleport"]];
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

function Editor() {
  const [overlay, setOverlay] = useState<Overlay>({ v: 1, frame: 2, name: "Development world", ops: [] });
  const [version, setVersion] = useState(0), [dirty, setDirty] = useState(false), [status, setStatus] = useState("Loading the development world…");
  const [edit, setEdit] = useState(false), [tool, setTool] = useState<Tool>("inspect"), [catalog, setCatalog] = useState<DevCatalog | null>(null);
  const [pickInfo, setPick] = useState<DevPick | null>(null), [report, setReport] = useState<{ problems: string[]; unreachable: string[]; ops: number } | null>(null);
  const [revisions, setRevisions] = useState<Revision[] | null>(null), [open, setOpen] = useState<"tools" | "define" | "world" | "history">("tools");
  // Tool settings.
  const [tile, setTile] = useState(1), [brush, setBrush] = useState(1), [lift, setLift] = useState(1), [kind, setKind] = useState("decor"), [sub, setSub] = useState("bush"), [name, setName] = useState("");
  const [door, setDoor] = useState<"n" | "s" | "e" | "w">("s"), [floor, setFloor] = useState(11), [walls, setWalls] = useState("timber"), [spawnKind, setSpawnKind] = useState<"npc" | "monster">("npc"), [spawnId, setSpawnId] = useState(""), [wander, setWander] = useState(3);
  const [allow, setAllow] = useState(false), [why, setWhy] = useState(""), [defKind, setDefKind] = useState<DefKind>("npc"), [form, setForm] = useState<Record<string, string>>(DEF_DEFAULTS.npc), [defError, setDefError] = useState("");
  const corner = useRef<{ x: number; y: number } | null>(null), past = useRef<Op[][]>([]), future = useRef<Op[][]>([]), timer = useRef<number | null>(null), current = useRef(overlay);
  current.current = overlay;

  const push = (ops: Op[], note?: string) => {
    past.current.push(current.current.ops); if (past.current.length > 100) past.current.shift(); future.current = [];
    const next = { ...current.current, ops }; setOverlay(next); setDirty(true); if (note) setStatus(note);
    if (timer.current) clearTimeout(timer.current); timer.current = window.setTimeout(() => send({ type: DEV_WORLD, overlay: next }), 120);
  };
  const undo = () => { const prev = past.current.pop(); if (!prev) return; future.current.push(current.current.ops); const next = { ...current.current, ops: prev }; setOverlay(next); setDirty(true); send({ type: DEV_WORLD, overlay: next }); setStatus("Undone."); };
  const redo = () => { const next = future.current.pop(); if (!next) return; past.current.push(current.current.ops); const o = { ...current.current, ops: next }; setOverlay(o); setDirty(true); send({ type: DEV_WORLD, overlay: o }); setStatus("Redone."); };

  // The world, loaded once; the listeners, renewed whenever a tool setting changes (they close over the settings).
  useEffect(() => {
    devApi.load(WORLD).then(raw => { const loaded = { ...raw, overlay: northOverlay(raw.overlay) }; setOverlay(loaded.overlay); if (raw.overlay.frame !== 2 && raw.overlay.ops.length) setDirty(true); setVersion(loaded.version); setStatus(`Loaded v${loaded.version} (${loaded.overlay.ops.length} ops${loaded.updatedAt ? `, saved ${when(loaded.updatedAt)}` : ""}).`); send({ type: DEV_WORLD, overlay: loaded.overlay }); }).catch(error => setStatus(`Couldn't load: ${(error as Error).message}`));
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (!frames().includes(event.source as Window)) return;
      if (event.data?.type === DEV_CATALOG) { setCatalog(event.data.catalog as DevCatalog); send({ type: DEV_WORLD, overlay: current.current }); send({ type: DEV_MODE, edit }); }
      if (event.data?.type === DEV_REPORT) setReport({ problems: event.data.problems ?? [], unreachable: event.data.unreachable ?? [], ops: event.data.ops ?? 0 });
      if (event.data?.type === DEV_PICK) onPick(event.data.pick as DevPick, event.data.button as number, event.data.shift === true);
    };
    window.addEventListener("message", receive);
    const keys = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) { event.preventDefault(); undo(); } else if ((event.ctrlKey || event.metaKey) && (event.key === "y" || (event.key === "z" && event.shiftKey))) { event.preventDefault(); redo(); } else if (event.key === "F2") { event.preventDefault(); toggleEdit(); } };
    window.addEventListener("keydown", keys);
    const leaving = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); } };
    window.addEventListener("beforeunload", leaving);
    return () => { window.removeEventListener("message", receive); window.removeEventListener("keydown", keys); window.removeEventListener("beforeunload", leaving); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, tool, tile, brush, lift, kind, sub, name, door, floor, walls, spawnKind, spawnId, wander, allow, why, dirty]);

  const toggleEdit = () => { setEdit(value => { send({ type: DEV_MODE, edit: !value }); return !value; }); corner.current = null; };
  /** A click in the game, in edit mode: the tool's operation. The right button inspects whatever the tool. */
  const onPick = (p: DevPick, button: number, shift: boolean) => {
    setPick(p);
    if (button === 2 || tool === "inspect") return;
    const ops = [...current.current.ops], at = (x: number, y: number) => (op: Op) => "x" in op && op.x === x && op.y === y;
    const paint = (x: number, y: number, t: number) => { const i = ops.findIndex(op => op.op === "tile" && op.x === x && op.y === y); if (i >= 0) ops.splice(i, 1); ops.push({ op: "tile", x, y, t }); };
    if (tool === "tile") { const r = brush - 1; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) paint(p.x + dx, p.y + dy, tile); push(ops, `Painted ${brush * brush === 1 ? "a tile" : `${(2 * r + 1) ** 2} tiles`} at ${p.x},${p.y}.`); }
    else if (tool === "fill" || tool === "building" || tool === "campzone") {
      if (!corner.current) { corner.current = { x: p.x, y: p.y }; setStatus(`First corner ${p.x},${p.y}: click the other corner.`); return; }
      const a = corner.current; corner.current = null;
      if (tool === "fill") { ops.push({ op: "fill", x0: a.x, y0: a.y, x1: p.x, y1: p.y, t: tile }); push(ops, `Filled ${a.x},${a.y} to ${p.x},${p.y}.`); }
      else if (tool === "campzone") { ops.push({ op: "campzone", uid: uid(), x0: Math.min(a.x, p.x), y0: Math.min(a.y, p.y), x1: Math.max(a.x, p.x), y1: Math.max(a.y, p.y), allow, ...(why.trim() ? { why: why.trim() } : {}) }); push(ops, `Camping ${allow ? "allowed" : "forbidden"} from ${a.x},${a.y} to ${p.x},${p.y}.`); }
      else { ops.push({ op: "building", uid: uid(), x0: a.x, y0: a.y, x1: p.x, y1: p.y, door, floor, walls: walls as "timber", ...(name ? { name } : {}) }); push(ops, `Building ${a.x},${a.y} to ${p.x},${p.y} (door ${door}).`); }
    }
    else if (tool === "lift") { const r = brush - 1; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const i = ops.findIndex(op => op.op === "lift" && op.x === p.x + dx && op.y === p.y + dy); if (i >= 0) ops.splice(i, 1); ops.push({ op: "lift", x: p.x + dx, y: p.y + dy, v: shift ? 0 : lift }); } push(ops, `${shift ? "Flattened" : `Raised (${lift})`} at ${p.x},${p.y}.`); }
    else if (tool === "remove") { if (p.object?.uid) { const i = ops.findIndex(op => op.op === "object" && op.uid === p.object!.uid); if (i >= 0) ops.splice(i, 1); push(ops, `Took back ${p.object.name}.`); } else if (p.object) { ops.push({ op: "remove", x: p.x, y: p.y }); push(ops, `Removed ${p.object.name} at ${p.x},${p.y}.`); } else setStatus("Nothing there."); }
    else if (tool === "place") {
      const op: Op = { op: "object", uid: uid(), kind: kind as Op extends { kind: infer K } ? K : never, x: p.x, y: p.y, ...(name ? { name } : {}) };
      if (kind === "decor") Object.assign(op, { decor: sub }); if (kind === "tree") Object.assign(op, { tree: sub }); if (kind === "rock") Object.assign(op, { rock: sub }); if (kind === "spot") Object.assign(op, { spot: sub });
      ops.push(op); push(ops, `Placed ${name || sub || kind} at ${p.x},${p.y}.`);
    }
    else if (tool === "spawn") { if (!spawnId) { setStatus("Choose who to spawn."); return; } ops.push({ op: "spawn", uid: uid(), kind: spawnKind, id: spawnId, x: p.x, y: p.y, wander }); push(ops, `${spawnKind} ${spawnId} at ${p.x},${p.y}.`); }
    else if (tool === "erase") { const before = ops.length, kept = ops.filter(op => !(at(p.x, p.y)(op) || (op.op === "fill" && p.x >= Math.min(op.x0, op.x1) && p.x <= Math.max(op.x0, op.x1) && p.y >= Math.min(op.y0, op.y1) && p.y <= Math.max(op.y0, op.y1)) || ((op.op === "building" || op.op === "campzone") && p.x >= Math.min(op.x0, op.x1) && p.x <= Math.max(op.x0, op.x1) && p.y >= Math.min(op.y0, op.y1) && p.y <= Math.max(op.y0, op.y1)))); if (kept.length !== before) push(kept, `Erased ${before - kept.length} of my ops at ${p.x},${p.y}.`); else setStatus("None of my ops there."); }
    else if (tool === "teleport") send({ type: DEV_TELEPORT, x: p.x, y: p.y });
  };
  const save = async (note?: string) => {
    try { const result = await devApi.save(WORLD, version, current.current, note); setVersion(result.version); setDirty(false); setStatus(`Saved v${result.version} at ${when(result.updatedAt)}.`); }
    catch (error) { setStatus(`Not saved: ${(error as Error).message}`); }
  };
  const loadRevisions = () => devApi.revisions(WORLD).then(r => setRevisions(r.revisions)).catch(error => setStatus(`Couldn't list revisions: ${(error as Error).message}`));
  const take = (raw: { version: number; overlay: Overlay }, what: string) => { const loaded = { ...raw, overlay: northOverlay(raw.overlay) }; past.current = []; future.current = []; setOverlay(loaded.overlay); setVersion(loaded.version); setDirty(false); send({ type: DEV_WORLD, overlay: loaded.overlay }); setStatus(`${what}: now v${loaded.version}.`); void loadRevisions(); };
  const importFile = (file: File) => { void file.text().then(text => { const parsed = JSON.parse(text) as Overlay; if (parsed?.v !== 1 || !Array.isArray(parsed.ops)) throw new Error("not an overlay"); const raw = northOverlay(parsed); push(raw.ops, `Imported ${file.name} (${raw.ops.length} ops); save to keep it.`); }).catch(error => setStatus(`Couldn't import: ${(error as Error).message}`)); };
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
  const S = { panel: { position: "fixed", top: 0, right: 0, width: 340, height: "100vh", overflow: "auto", background: "#1c1b1f", color: "#efede7", font: "12px ui-monospace, Menlo, Consolas, monospace", borderLeft: "2px solid #efede7", padding: 10, boxSizing: "border-box", zIndex: 50 } as const,
    row: { display: "flex", flexWrap: "wrap", gap: 4, margin: "6px 0" } as const, btn: (on = false) => ({ font: "inherit", padding: "4px 7px", border: "1px solid #efede7", background: on ? "#e2c46a" : "#2a2a30", color: on ? "#161616" : "#efede7", cursor: "pointer" }) as const,
    input: { font: "inherit", padding: 3, width: "100%", boxSizing: "border-box", background: "#efede7", color: "#161616", border: 0 } as const, h: { margin: "10px 0 4px", fontSize: 12, color: "#e2c46a" } as const, muted: { opacity: 0.7 } as const };
  return (
    <aside style={S.panel} aria-label="Development editor">
      <div style={S.row}><b>Development game</b><span style={{ marginLeft: "auto" }}>{dirty ? "● unsaved" : `v${version}`}</span></div>
      <div style={S.row}>
        <button type="button" style={S.btn(edit)} onClick={toggleEdit}>{edit ? "Edit mode (F2: play)" : "Play mode (F2: edit)"}</button>
        <button type="button" style={S.btn()} onClick={undo} disabled={!past.current.length}>Undo</button><button type="button" style={S.btn()} onClick={redo} disabled={!future.current.length}>Redo</button>
        <button type="button" style={S.btn(dirty)} onClick={() => void save()}>Save</button>
      </div>
      <p style={{ margin: "4px 0", minHeight: "2.4em" }} role="status">{status}</p>
      <div style={S.row}>{(["tools", "define", "world", "history"] as const).map(tab => <button key={tab} type="button" style={S.btn(open === tab)} onClick={() => { setOpen(tab); if (tab === "history") void loadRevisions(); }}>{tab}</button>)}</div>
      {open === "tools" && <>
        <div style={S.row}>{TOOLS.map(([id, label]) => <button key={id} type="button" style={S.btn(tool === id)} onClick={() => { setTool(id); corner.current = null; }}>{label}</button>)}</div>
        {(tool === "tile" || tool === "fill") && <><h4 style={S.h}>Tile</h4><select style={S.input} value={tile} onChange={e => setTile(Number(e.target.value))}>{Object.entries(catalog?.tiles ?? {}).map(([n, v]) => <option key={n} value={v}>{n.toLowerCase()}</option>)}</select></>}
        {(tool === "tile" || tool === "lift") && <><h4 style={S.h}>Brush</h4><div style={S.row}>{[1, 2, 3, 4].map(b => <button key={b} type="button" style={S.btn(brush === b)} onClick={() => setBrush(b)}>{2 * b - 1}×{2 * b - 1}</button>)}</div></>}
        {tool === "lift" && <><h4 style={S.h}>Raise by, in steps (shift-click takes it back)</h4><input style={S.input} type="number" min={0} max={8} step={0.25} value={lift} onChange={e => setLift(Number(e.target.value))} /></>}
        {tool === "place" && <>
          <h4 style={S.h}>Kind</h4><select style={S.input} value={kind} onChange={e => { setKind(e.target.value); setSub(""); }}>{(catalog?.kinds ?? ["decor"]).map(k => <option key={k} value={k}>{k}</option>)}</select>
          {subs && <><h4 style={S.h}>Which</h4><select style={S.input} value={sub} onChange={e => setSub(e.target.value)}><option value="">—</option>{subs.map(s => <option key={s} value={s}>{s}</option>)}</select></>}
          <h4 style={S.h}>Name (optional)</h4><input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="What Examine calls it" />
        </>}
        {tool === "building" && <>
          <h4 style={S.h}>Door side</h4><div style={S.row}>{(["n", "s", "e", "w"] as const).map(d => <button key={d} type="button" style={S.btn(door === d)} onClick={() => setDoor(d)}>{d}</button>)}</div>
          <h4 style={S.h}>Floor</h4><select style={S.input} value={floor} onChange={e => setFloor(Number(e.target.value))}>{Object.entries(catalog?.tiles ?? {}).filter(([n]) => ["WOOD", "STONE", "CARPET", "COBBLE", "BRICK", "DUNGEON"].includes(n)).map(([n, v]) => <option key={n} value={v}>{n.toLowerCase()}</option>)}</select>
          <h4 style={S.h}>Walls</h4><select style={S.input} value={walls} onChange={e => setWalls(e.target.value)}>{["timber", "stone", "plank", "marble"].map(w => <option key={w} value={w}>{w}</option>)}</select>
          <h4 style={S.h}>Name</h4><input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="The sign over the door" />
          <p style={S.muted}>Click one corner, then the opposite one (three tiles each way at least).</p>
        </>}
        {tool === "spawn" && <>
          <div style={S.row}>{(["npc", "monster"] as const).map(k => <button key={k} type="button" style={S.btn(spawnKind === k)} onClick={() => { setSpawnKind(k); setSpawnId(""); }}>{k}</button>)}</div>
          <select style={S.input} value={spawnId} onChange={e => setSpawnId(e.target.value)}><option value="">—</option>{spawnable.map(p => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select>
          <h4 style={S.h}>Wander (tiles)</h4><input style={S.input} type="number" min={0} max={40} value={wander} onChange={e => setWander(Number(e.target.value))} />
        </>}
        {tool === "campzone" && <>
          <div style={S.row}>{([[true, "Allow camping"], [false, "Forbid camping"]] as const).map(([v, label]) => <button key={label} type="button" style={S.btn(allow === v)} onClick={() => setAllow(v)}>{label}</button>)}</div>
          <h4 style={S.h}>Why (said to the player when forbidden)</h4><input style={S.input} value={why} onChange={e => setWhy(e.target.value)} placeholder="Camping isn't allowed here." />
          <p style={S.muted}>Click one corner, then the opposite one. Zones override the camping rules (camping.ts CAMP_RULES) in this rectangle, the earliest zone first.</p>
        </>}
        <h4 style={S.h}>Under the pointer</h4>
        {pickInfo ? <div style={S.muted}>{pickInfo.x},{pickInfo.y} · {pickInfo.region} · tile {Object.entries(catalog?.tiles ?? {}).find(([, v]) => v === pickInfo.tile)?.[0].toLowerCase() ?? pickInfo.tile} · lift {pickInfo.lift.toFixed(2)}{pickInfo.object ? ` · ${pickInfo.object.kind}: ${pickInfo.object.name}${pickInfo.object.uid ? " (mine)" : ""}` : ""}{pickInfo.building ? ` · building: ${pickInfo.building.name || "unnamed"}` : ""}</div> : <div style={S.muted}>Click in the game (edit mode). Right-click inspects with any tool.</div>}
        {report && <><h4 style={S.h}>Report</h4><div style={S.muted}>{report.ops} ops applied.</div>{report.problems.map((p, i) => <div key={`p${i}`} style={{ color: "#f0a050" }}>{p}</div>)}{report.unreachable.map((p, i) => <div key={`u${i}`} style={{ color: "#f0a050" }}>⚠ {p}</div>)}</>}
      </>}
      {open === "define" && <>
        <div style={S.row}>{(["npc", "monster", "item", "quest"] as const).map(k => <button key={k} type="button" style={S.btn(defKind === k)} onClick={() => chooseDef(k)}>{k}</button>)}</div>
        {DEF_FIELDS[defKind].filter(field => defKind !== "npc" || field.key !== "family" && field.key !== "seed" || form.artMode === "friend").map(field => <div key={field.key}>
          <h4 style={S.h}>{field.label}</h4>
          {field.type === "textarea" ? <textarea style={{ ...S.input, minHeight: 56 }} value={form[field.key] ?? ""} onChange={e => setField(field.key, e.target.value)} />
            : field.type === "check" ? <label><input type="checkbox" checked={!!form[field.key]} onChange={e => setField(field.key, e.target.checked ? "1" : "")} /> yes</label>
            : field.type === "select" ? <select style={S.input} value={form[field.key] ?? ""} onChange={e => setField(field.key, e.target.value)}>{optionsFor(field).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
            : <input style={S.input} type={field.type === "number" ? "number" : "text"} value={form[field.key] ?? ""} placeholder={field.hint} onChange={e => setField(field.key, e.target.value)} />}
        </div>)}
        {defError && <p style={{ color: "#f0a050" }}>{defError}</p>}
        <div style={S.row}><button type="button" style={S.btn(true)} onClick={commitDef}>Define {defKind}</button><button type="button" style={S.btn()} onClick={() => chooseDef(defKind)}>Clear</button></div>
        <p style={S.muted}>Defined things are placed with the Spawn tool (people, monsters) or given by quests; a quest hangs on whoever gives it, the game's own people included, until it's done.</p>
        <h4 style={S.h}>Defined ({defs.length})</h4>
        {defs.map(op => <div key={`${op.op}:${op.def.id}`} style={{ display: "flex", gap: 6, alignItems: "center", padding: "2px 0", borderBottom: "1px solid #333" }}>
          <span style={{ flex: 1 }}>{op.op} <b>{(op.def as { name?: string }).name ?? op.def.id}</b> <span style={S.muted}>{op.def.id}</span></span>
          <button type="button" style={S.btn()} onClick={() => editDef(op)}>Edit</button><button type="button" style={S.btn()} onClick={() => dropDef(op)}>Remove</button>
        </div>)}
      </>}
      {open === "world" && <>
        <h4 style={S.h}>Name</h4><input style={S.input} value={overlay.name ?? ""} onChange={e => { const next = { ...current.current, name: e.target.value }; setOverlay(next); setDirty(true); }} />
        <div style={S.row}>
          <a style={S.btn()} href={devApi.exportUrl(WORLD)} download>Export (JSON)</a>
          <label style={S.btn()}>Import… <input type="file" accept="application/json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} /></label>
          <button type="button" style={S.btn()} onClick={() => { if (confirm("Back to the baseline: an empty overlay? The current one is kept as a revision.")) devApi.reset(WORLD).then(r => take(r, "Reset")).catch(error => setStatus(`Couldn't reset: ${(error as Error).message}`)); }}>Reset to baseline…</button>
        </div>
        <p style={S.muted}>To publish: save, then <code>node scripts/dev-promote.mjs --fetch &lt;slug&gt; --pr</code> (or export and pass the file) checks the overlay on a fresh world, writes it under games/rarefriends-realm/overlays/ and opens a pull request; the change is reviewed and reverted like any other. Nothing reaches players any other way.</p>
        <div style={S.row}><button type="button" style={S.btn()} onClick={() => void devApi.logout().then(() => location.reload())}>Sign out</button><button type="button" style={S.btn()} onClick={() => { if (confirm("End every session, everywhere?")) void devApi.logoutAll().then(() => location.reload()); }}>Sign out everywhere</button></div>
      </>}
      {open === "history" && <>
        <div style={S.row}><input style={{ ...S.input, width: "auto", flex: 1 }} placeholder="Checkpoint name" value={name} onChange={e => setName(e.target.value)} /><button type="button" style={S.btn()} onClick={() => void save().then(() => devApi.checkpoint(WORLD, name)).then(r => { setStatus(`Checkpoint: ${r.name}.`); void loadRevisions(); })}>Checkpoint</button></div>
        {!revisions && <div style={S.muted}>Loading…</div>}
        {revisions?.map(r => <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center", padding: "2px 0", borderBottom: "1px solid #333" }}>
          <span style={{ flex: 1 }}>{r.name ? <b>{r.name}</b> : <span style={S.muted}>v{r.version}{r.note ? ` · ${r.note}` : ""}</span>} <span style={S.muted}>{when(r.at)} · {(r.size / 1024).toFixed(1)} KB</span></span>
          <button type="button" style={S.btn()} onClick={() => { if (confirm(`Restore ${r.name ?? `v${r.version}`}? The current overlay is kept as a revision.`)) devApi.restore(WORLD, r.id).then(res => take(res, "Restored")).catch(error => setStatus(`Couldn't restore: ${(error as Error).message}`)); }}>Restore</button>
        </div>)}
      </>}
    </aside>
  );
}

/** Mounted by the host page when it's the development build. */
export function mountEditor() {
  const container = document.createElement("div"); document.body.append(container);
  document.body.style.paddingRight = "340px";
  createRoot(container).render(<Editor />);
}
