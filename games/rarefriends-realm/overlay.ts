/**
 * World overlays: the editable layer over the generated world. The generator (world.ts and the expansions) is the base,
 * fixed in code; an overlay is a list of operations on top of it (tiles painted, ground raised, things placed or
 * removed, buildings, spawns, definitions of new things), applied in order. The private development game edits one
 * live (editor.tsx) and keeps it in the save service; a finished overlay is promoted into the public game by committing
 * it under overlays/, where generateWorld applies it after everything else, so production stays a build of the code.
 *
 * Every placed thing has a stable id of the overlay's own (`uid`), so it can be edited or removed later whatever else
 * moved. Applying is deterministic and idempotent for a given base; nothing here draws from a random stream. This
 * module has no DOM: the engine, the bake and the tests all load it.
 */
import { ITEM_LIST, MONSTERS, SKILLS, isItem, registerItem, type Drop, type Item, type MonsterDef, type RockKind, type SpotKind, type TreeKind } from "./data.ts";
import { BRUSH_MAX, FLOOD_MAX, LINE_WIDTH_MAX, REGION_TILES_MAX, scatterable, applyPaint, levelPaintedWater, onShore, applyTerrain, tileHash, type PaintOp, type TerrainMode, type TerrainOp } from "./terrainops.ts";
import { DECOR_NAMES, FLOOR_Y, H, OVERWORLD_H, ROOF_COLORS, T, TREE_NAMES, W, WALKABLE, groundHeights, indexBuildings, levelBuildings, indexObjects, type Building, type DecorKind, type ObjectKind, type World, type WorldObject } from "./world.ts";
import { BUILDING_KEYS, FURNISH, PREFAB_MAX, SIDES, buildable, doorway, furnishing, turned, type Furnish, type Prefab, type PrefabBuilding, type Side } from "./overlaybuild.ts";

/** An NPC an overlay defines: who they are, and what they say (plain lines; the game's own people have scripted talk). */
export type OverlayNpc = { id: string; name: string; examine: string; options: readonly string[]; art: { canonical: 7730 | 3412 } | { family: number; seed: number }; lines?: string[] };
/**
 * A quest an overlay defines: an errand, the Realm's commonest shape (content.ts fetchQuest). Someone (`giver`, one of
 * the game's people or the overlay's own) asks for `count` of an item, in their words (`offer`, then `accept`, then
 * `progress` until you have them, then `done`), and pays in coins, XP in a skill and items. Registered by content.ts
 * (registerDevQuest), which has the quest machinery this module can't import.
 */
export type OverlayQuest = { id: string; name: string; giver: string; item: string; count: number; offer: string[]; accept: string; progress: string; done: string[]; points?: number; difficulty?: string; rewards: { coins?: number; xp?: { skill: string; amount: number }; items?: { id: string; n: number }[] } };
/** Where camping is allowed or forbidden regardless of the rules (camping.ts CAMP_RULES.overrides). */
export type CampZone = { x0: number; y0: number; x1: number; y1: number; allow: boolean; why?: string };
/**
 * A conversation an overlay writes for someone (`id`: one of the game's people or the overlay's own): nodes of lines
 * (theirs and yours), each with options that lead to another node or end it. An option can need something (an item, a
 * level, a quest done or at a stage, a note made or not) and do something (give or take items or Frens, XP, make or
 * clear a note, heal, move you); `once` options go once made. `replace` is all they say; `add` hangs it on their own
 * talk as one more option (`label`). Run by talktree.ts; the notes are kept in the save (questData).
 */
export type TalkNeed = { kind: "item" | "level" | "quest" | "flag" | "noflag"; id: string; n?: number };
export type TalkAct = { kind: "give" | "take" | "frens" | "pay" | "xp" | "flag" | "unflag" | "heal" | "teleport"; id?: string; n?: number; x?: number; y?: number };
export type TalkOption = { label: string; to: string; need?: TalkNeed[]; do?: TalkAct[]; once?: boolean };
export type TalkNode = { id: string; lines: { who: "npc" | "player"; text: string }[]; do?: TalkAct[]; options?: TalkOption[] };
export type OverlayTalk = { id: string; mode: "replace" | "add"; label?: string; start: string; nodes: TalkNode[] };
export const TALK_LIMITS = { nodes: 200, lines: 30, options: 10, acts: 10, needs: 6, text: 300, label: 80 } as const;
/** A change to any creature, the game's own included: its name, examine, aggression and numbers, and its drops (the table replaced). */
export const MONSTER_STATS = ["level", "hp", "attack", "strength", "defence", "attackBonus", "defenceBonus", "maxHit", "speed", "respawn", "wander"] as const;
export const STAT_RANGE: Record<(typeof MONSTER_STATS)[number], readonly [number, number]> = { level: [1, 1000], hp: [1, 100_000], attack: [1, 500], strength: [1, 500], defence: [1, 500], attackBonus: [-100, 500], defenceBonus: [-100, 500], maxHit: [0, 1000], speed: [1, 20], respawn: [1, 10_000], wander: [0, 40] };
export type MonsterEdit = { id: string; name?: string; examine?: string; aggressive?: boolean; stats?: Partial<Record<(typeof MONSTER_STATS)[number], number>>; drops?: Drop[]; always?: Drop[] };
export const DROPS_MAX = 40;

export const OVERLAY_VERSION = 1;
export type Op =
  | { op: "tile"; x: number; y: number; t: number }
  | { op: "fill"; x0: number; y0: number; x1: number; y1: number; t: number }
  | { op: "lift"; x: number; y: number; v: number }
  | { op: "remove"; x: number; y: number }
  | { op: "object"; uid: string; kind: ObjectKind; x: number; y: number; name?: string; blocks?: boolean; decor?: DecorKind; tree?: TreeKind; rock?: RockKind; spot?: SpotKind; text?: string; to?: { x: number; y: number }; look?: "stairs" | "gate"; sigil?: string; icon?: string }
  | { op: "building"; uid: string; x0: number; y0: number; x1: number; y1: number; door: Side; floor?: number; name?: string; color?: string; chimney?: boolean; walls?: Building["walls"]; roof?: Building["roof"]; hip?: boolean; round?: boolean; storeys?: number; doors?: Side[]; furnish?: Furnish; facade?: Building["facade"] }
  /** A copy of one of the world's buildings, its top-left corner at x, y, turned `rot` quarters clockwise; its people too if `people`. */
  | { op: "stamp"; uid: string; x: number; y: number; rot: number; prefab: Prefab; people?: boolean }
  | { op: "talk"; def: OverlayTalk }
  | { op: "monsteredit"; def: MonsterEdit }
  | { op: "spawn"; uid: string; kind: "npc" | "monster"; id: string; x: number; y: number; wander?: number }
  | { op: "monster"; def: MonsterDef }
  | { op: "npc"; def: OverlayNpc }
  | { op: "item"; def: (typeof ITEM_LIST)[number] }
  | { op: "quest"; def: OverlayQuest }
  | { op: "campzone"; uid: string; x0: number; y0: number; x1: number; y1: number; allow: boolean; why?: string }
  | TerrainOp | PaintOp
  | { op: "scatter"; uid: string; x: number; y: number; r: number; kind: "tree" | "rock" | "decor"; sub?: string; density: number; seed: number }
  | { op: "clear"; x0: number; y0: number; x1: number; y1: number };
export type { TerrainMode };
/** `frame: 2`: written in the grown world (after the north); an overlay without it is from before, and is moved down with the world when it's read (northframe.ts). */
export type Overlay = { v: 1; frame?: 2; name?: string; ops: Op[] };
export const emptyOverlay = (name = "Development world"): Overlay => ({ v: 1, frame: 2, name, ops: [] });
export const LIMITS = { ops: 200_000, bytes: 4_000_000, fillTiles: 40_000 } as const;

const NUM = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const TEXT = (v: unknown, max = 80) => typeof v === "string" && v.length <= max;
const UID = (v: unknown) => typeof v === "string" && /^[a-z0-9_-]{1,40}$/i.test(v);
// (Made when first asked for: world.ts imports this module, so T isn't there yet while modules load.)
let tileSet: Set<number> | null = null; const TILES = { has: (t: number) => (tileSet ??= new Set<number>(Object.values(T))).has(t) };
const NODE = (v: unknown) => typeof v === "string" && /^[a-z0-9_-]{1,40}$/i.test(v);
/** A conversation, checked: every node named once, every option leading somewhere real (or "" to end), every need and deed well formed. */
function cleanTalk(raw: unknown): OverlayTalk | string {
  const d = raw as Record<string, unknown> | null; if (!d || typeof d !== "object") return "not a conversation";
  if (!TEXT(d.id, 48) || !d.id) return "whose conversation?";
  if (d.mode !== "replace" && d.mode !== "add") return "replace or add?";
  if (d.mode === "add" && (!TEXT(d.label, TALK_LIMITS.label) || !String(d.label).trim())) return "an added conversation needs its option's words";
  if (!Array.isArray(d.nodes) || !d.nodes.length || d.nodes.length > TALK_LIMITS.nodes) return `1 to ${TALK_LIMITS.nodes} nodes`;
  const ids = new Set<string>(), nodes: TalkNode[] = [];
  const needs = (v: unknown): TalkNeed[] | string => {
    if (v === undefined) return []; if (!Array.isArray(v) || v.length > TALK_LIMITS.needs) return "bad needs";
    const out: TalkNeed[] = [];
    for (const n of v as Record<string, unknown>[]) {
      if (!n || !["item", "level", "quest", "flag", "noflag"].includes(n.kind as string) || !TEXT(n.id, 48) || !n.id) return "bad need";
      if (n.kind === "level" && !SKILLS.includes(n.id as never)) return `no skill ${String(n.id)}`;
      if ((n.kind === "item" || n.kind === "level") && !NUM(n.n, 1, 1_000_000)) return `a ${n.kind} need wants a number`;
      if (n.kind === "quest" && n.n !== undefined && !NUM(n.n, 0, 100)) return "a quest need's stage is a number";
      out.push({ kind: n.kind as TalkNeed["kind"], id: n.id as string, ...(n.n !== undefined ? { n: Math.floor(n.n as number) } : {}) });
    }
    return out;
  };
  const acts = (v: unknown): TalkAct[] | string => {
    if (v === undefined) return []; if (!Array.isArray(v) || v.length > TALK_LIMITS.acts) return "bad deeds";
    const out: TalkAct[] = [];
    for (const a of v as Record<string, unknown>[]) {
      const kind = a?.kind as TalkAct["kind"];
      if (!["give", "take", "frens", "pay", "xp", "flag", "unflag", "heal", "teleport"].includes(kind)) return "bad deed";
      if ((kind === "give" || kind === "take") && (!TEXT(a.id, 48) || !a.id || !NUM(a.n, 1, 1_000_000))) return `${kind}: which item, how many?`;
      if ((kind === "frens" || kind === "pay") && !NUM(a.n, 1, 1_000_000_000)) return `${kind}: how many Frens?`;
      if (kind === "xp" && (!SKILLS.includes(a.id as never) || !NUM(a.n, 1, 1_000_000))) return "xp: which skill, how much?";
      if ((kind === "flag" || kind === "unflag") && (!NODE(a.id))) return `${kind}: a note's name (letters, numbers, _ and -)`;
      if (kind === "teleport" && !(NUM(a.x, 0, W - 1) && NUM(a.y, 0, H - 1))) return "teleport: where?";
      out.push({ kind, ...(a.id !== undefined ? { id: String(a.id) } : {}), ...(a.n !== undefined ? { n: Math.floor(a.n as number) } : {}), ...(kind === "teleport" ? { x: Math.floor(a.x as number), y: Math.floor(a.y as number) } : {}) });
    }
    return out;
  };
  for (const raw of d.nodes as Record<string, unknown>[]) {
    if (!raw || !NODE(raw.id) || ids.has(raw.id as string)) return `node ${String(raw?.id)}: a name of its own`;
    ids.add(raw.id as string);
    if (!Array.isArray(raw.lines) || raw.lines.length > TALK_LIMITS.lines || !(raw.lines as Record<string, unknown>[]).every(l => l && (l.who === "npc" || l.who === "player") && TEXT(l.text, TALK_LIMITS.text) && String(l.text).trim())) return `node ${String(raw.id)}: bad lines`;
    const nodeActs = acts(raw.do); if (typeof nodeActs === "string") return `node ${String(raw.id)}: ${nodeActs}`;
    const options: TalkOption[] = [];
    if (raw.options !== undefined && (!Array.isArray(raw.options) || raw.options.length > TALK_LIMITS.options)) return `node ${String(raw.id)}: up to ${TALK_LIMITS.options} options`;
    for (const o of (raw.options ?? []) as Record<string, unknown>[]) {
      if (!o || !TEXT(o.label, TALK_LIMITS.label) || !String(o.label).trim() || typeof o.to !== "string") return `node ${String(raw.id)}: an option needs words and where it goes`;
      const n = needs(o.need), a = acts(o.do); if (typeof n === "string") return `node ${String(raw.id)}: ${n}`; if (typeof a === "string") return `node ${String(raw.id)}: ${a}`;
      options.push({ label: String(o.label).trim(), to: o.to, ...(n.length ? { need: n } : {}), ...(a.length ? { do: a } : {}), ...(o.once === true ? { once: true } : {}) });
    }
    if (!(raw.lines as unknown[]).length && !options.length) return `node ${String(raw.id)}: says nothing and offers nothing`;
    nodes.push({ id: raw.id as string, lines: (raw.lines as { who: "npc" | "player"; text: string }[]).map(l => ({ who: l.who, text: l.text.trim() })), ...(nodeActs.length ? { do: nodeActs } : {}), ...(options.length ? { options } : {}) });
  }
  for (const node of nodes) for (const o of node.options ?? []) if (o.to && !ids.has(o.to)) return `node ${node.id}: “${o.label}” leads to ${o.to}, which isn't a node`;
  const start = typeof d.start === "string" && ids.has(d.start) ? d.start : nodes[0].id;
  return { id: d.id as string, mode: d.mode, ...(d.mode === "add" ? { label: String(d.label).trim() } : {}), start, nodes };
}
/** Drops, checked: an item, at least one, a chance in (0, 1]. */
const cleanDrops = (v: unknown): Drop[] | null => Array.isArray(v) && v.length <= DROPS_MAX && (v as Record<string, unknown>[]).every(d => d && TEXT(d.item, 48) && d.item && NUM(d.min, 1, 1_000_000) && NUM(d.max, d.min as number, 1_000_000) && NUM(d.chance, 0.000001, 1))
  ? (v as Drop[]).map(d => ({ item: d.item, min: Math.floor(d.min), max: Math.floor(d.max), chance: d.chance })) : null;
function cleanMonsterEdit(raw: unknown): MonsterEdit | string {
  const d = raw as Record<string, unknown> | null; if (!d || typeof d !== "object" || !TEXT(d.id, 48) || !d.id) return "which creature?";
  const out: MonsterEdit = { id: d.id as string };
  if (d.name !== undefined) { if (!TEXT(d.name, 60) || !String(d.name).trim()) return "bad name"; out.name = String(d.name).trim(); }
  if (d.examine !== undefined) { if (!TEXT(d.examine, 300)) return "bad examine"; out.examine = String(d.examine); }
  if (d.aggressive !== undefined) { if (typeof d.aggressive !== "boolean") return "aggressive: yes or no"; out.aggressive = d.aggressive; }
  if (d.stats !== undefined) {
    const s = d.stats as Record<string, unknown>; if (!s || typeof s !== "object") return "bad numbers"; out.stats = {};
    for (const [key, value] of Object.entries(s)) { const range = STAT_RANGE[key as (typeof MONSTER_STATS)[number]]; if (!range || !NUM(value, range[0], range[1])) return `${key}: ${range ? `${range[0]} to ${range[1]}` : "not a number it has"}`; out.stats[key as (typeof MONSTER_STATS)[number]] = Math.round(value as number); }
  }
  for (const key of ["drops", "always"] as const) if (d[key] !== undefined) { const drops = cleanDrops(d[key]); if (!drops) return `${key}: up to ${DROPS_MAX} of {item, min, max, chance}`; out[key] = drops; }
  return out;
}
/** A prefab, checked: its size, its tiles real ones, its building's keys the known ones, its things and people inside it. */
function cleanPrefab(raw: unknown): Prefab | string {
  const p = raw as Record<string, unknown> | null; if (!p || typeof p !== "object") return "not a building";
  if (!NUM(p.w, 3, PREFAB_MAX) || !NUM(p.h, 3, PREFAB_MAX) || !Number.isInteger(p.w) || !Number.isInteger(p.h)) return `3 to ${PREFAB_MAX} tiles each way`;
  const w = p.w as number, h = p.h as number;
  if (!Array.isArray(p.tiles) || p.tiles.length !== w * h || !(p.tiles as unknown[]).every(t => TILES.has(t as number))) return "bad tiles";
  const b = (p.building ?? {}) as Record<string, unknown>, building: PrefabBuilding = {};
  for (const key of BUILDING_KEYS) if (b[key] !== undefined && b[key] !== null && (typeof b[key] !== "object" || key === "keep") && JSON.stringify(b[key]).length <= 120) (building as Record<string, unknown>)[key] = b[key];
  const inside = (o: Record<string, unknown>) => NUM(o.dx, 0, w - 1) && NUM(o.dy, 0, h - 1);
  if (!Array.isArray(p.objects) || p.objects.length > w * h || !(p.objects as Record<string, unknown>[]).every(o => o && inside(o) && TEXT(o.kind, 24) && TEXT(o.name, 60) && typeof o.blocks === "boolean")) return "bad things";
  if (!Array.isArray(p.people ?? []) || ((p.people ?? []) as Record<string, unknown>[]).some(o => !o || !inside(o) || !TEXT(o.id, 48))) return "bad people";
  const objects = (p.objects as Record<string, unknown>[]).map(o => { const copy: Record<string, unknown> = {}; for (const [k, v] of Object.entries(o)) if (["dx", "dy", "kind", "name", "blocks", "tree", "rock", "spot", "decor", "stall", "text", "big", "look", "axis", "icon", "sigil", "height"].includes(k) && (typeof v !== "string" || v.length <= 300)) copy[k] = v; return copy as Prefab["objects"][number]; });
  return { name: TEXT(p.name, 80) ? String(p.name) : "A building", w, h, tiles: (p.tiles as number[]).slice(), building, objects, people: ((p.people ?? []) as Prefab["people"]).map(o => ({ dx: o.dx, dy: o.dy, id: o.id, ...(NUM(o.wander, 0, 40) ? { wander: o.wander } : {}) })) };
}
/** The ops an overlay may carry, checked one by one; bad ones are dropped (and said why), so a damaged file still loads what it can. */
export function cleanOverlay(raw: unknown, why: string[] = []): Overlay {
  const out = emptyOverlay();
  if (!raw || typeof raw !== "object") { why.push("not an overlay"); return out; }
  const o = raw as Record<string, unknown>;
  if (TEXT(o.name, 80)) out.name = o.name as string;
  if (o.frame !== 2) delete out.frame;
  if (!Array.isArray(o.ops)) { why.push("no ops"); return out; }
  for (const [i, raw] of (o.ops as unknown[]).entries()) {
    if (out.ops.length >= LIMITS.ops) { why.push("too many ops"); break; }
    const op = raw as Record<string, unknown>, bad = (what: string) => { why.push(`op ${i} (${String(op?.op)}): ${what}`); };
    if (!op || typeof op !== "object") { bad("not an op"); continue; }
    const inWorld = NUM(op.x, 0, W - 1) && NUM(op.y, 0, H - 1);
    switch (op.op) {
      case "tile": if (inWorld && TILES.has(op.t as number)) out.ops.push({ op: "tile", x: op.x as number, y: op.y as number, t: op.t as number }); else bad("bad tile"); break;
      case "fill": if (NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && TILES.has(op.t as number) && ((op.x1 as number) - (op.x0 as number) + 1) * ((op.y1 as number) - (op.y0 as number) + 1) <= LIMITS.fillTiles) out.ops.push({ op: "fill", x0: op.x0 as number, y0: op.y0 as number, x1: op.x1 as number, y1: op.y1 as number, t: op.t as number }); else bad("bad fill"); break;
      case "lift": if (inWorld && NUM(op.v, 0, 8)) out.ops.push({ op: "lift", x: op.x as number, y: op.y as number, v: op.v as number }); else bad("bad lift"); break;
      case "remove": if (inWorld) out.ops.push({ op: "remove", x: op.x as number, y: op.y as number }); else bad("bad remove"); break;
      case "object": {
        if (!inWorld || !UID(op.uid) || !TEXT(op.kind, 24)) { bad("bad object"); break; }
        const entry: Extract<Op, { op: "object" }> = { op: "object", uid: op.uid as string, kind: op.kind as ObjectKind, x: op.x as number, y: op.y as number };
        if (TEXT(op.name, 60)) entry.name = op.name as string; if (typeof op.blocks === "boolean") entry.blocks = op.blocks;
        for (const key of ["decor", "tree", "rock", "spot", "look", "sigil", "icon"] as const) if (TEXT(op[key], 32)) (entry as Record<string, unknown>)[key] = op[key];
        if (TEXT(op.text, 300)) entry.text = op.text as string;
        const to = op.to as Record<string, unknown> | undefined; if (to && NUM(to.x, 0, W - 1) && NUM(to.y, 0, H - 1)) entry.to = { x: to.x as number, y: to.y as number };
        out.ops.push(entry); break;
      }
      case "building": {
        if (!UID(op.uid) || !NUM(op.x0, 0, W - 1) || !NUM(op.y0, 0, H - 1) || !NUM(op.x1, 0, W - 1) || !NUM(op.y1, 0, H - 1) || !["n", "s", "e", "w"].includes(op.door as string)) { bad("bad building"); break; }
        const entry: Extract<Op, { op: "building" }> = { op: "building", uid: op.uid as string, x0: op.x0 as number, y0: op.y0 as number, x1: op.x1 as number, y1: op.y1 as number, door: op.door as "n" | "s" | "e" | "w" };
        if (TILES.has(op.floor as number)) entry.floor = op.floor as number; if (TEXT(op.name, 60)) entry.name = op.name as string; if (TEXT(op.color, 9)) entry.color = op.color as string;
        if (typeof op.chimney === "boolean") entry.chimney = op.chimney; if (TEXT(op.walls, 12)) entry.walls = op.walls as Building["walls"]; if (TEXT(op.roof, 8)) entry.roof = op.roof as Building["roof"];
        if (typeof op.hip === "boolean") entry.hip = op.hip; if (typeof op.round === "boolean") entry.round = op.round; if (NUM(op.storeys, 1, 4)) entry.storeys = Math.floor(op.storeys as number);
        if (Array.isArray(op.doors)) entry.doors = [...new Set((op.doors as unknown[]).filter(d => SIDES.includes(d as Side)) as Side[])];
        if (FURNISH.includes(op.furnish as Furnish)) entry.furnish = op.furnish as Furnish; if (["shop", "inn", "bank", "civic"].includes(op.facade as string)) entry.facade = op.facade as Building["facade"];
        out.ops.push(entry); break;
      }
      case "stamp": {
        const prefab = cleanPrefab(op.prefab);
        if (!inWorld || !UID(op.uid) || typeof prefab === "string") { bad(typeof prefab === "string" ? prefab : "bad stamp"); break; }
        out.ops.push({ op: "stamp", uid: op.uid as string, x: op.x as number, y: op.y as number, rot: NUM(op.rot, 0, 3) ? Math.floor(op.rot as number) : 0, prefab, ...(op.people === true ? { people: true } : {}) }); break;
      }
      case "talk": { const def = cleanTalk(op.def); if (typeof def === "string") bad(def); else out.ops.push({ op: "talk", def }); break; }
      case "monsteredit": { const def = cleanMonsterEdit(op.def); if (typeof def === "string") bad(def); else out.ops.push({ op: "monsteredit", def }); break; }
      case "spawn": if (inWorld && UID(op.uid) && (op.kind === "npc" || op.kind === "monster") && TEXT(op.id, 48)) out.ops.push({ op: "spawn", uid: op.uid as string, kind: op.kind, id: op.id as string, x: op.x as number, y: op.y as number, ...(NUM(op.wander, 0, 40) ? { wander: op.wander as number } : {}) }); else bad("bad spawn"); break;
      case "monster": if (op.def && typeof op.def === "object" && UID((op.def as MonsterDef).id)) out.ops.push({ op: "monster", def: op.def as MonsterDef }); else bad("bad monster"); break;
      case "npc": if (op.def && typeof op.def === "object" && UID((op.def as OverlayNpc).id)) out.ops.push({ op: "npc", def: op.def as OverlayNpc }); else bad("bad npc"); break;
      case "item": if (op.def && typeof op.def === "object" && UID((op.def as { id: string }).id)) out.ops.push({ op: "item", def: op.def as (typeof ITEM_LIST)[number] }); else bad("bad item"); break;
      case "quest": {
        const d = op.def as Record<string, unknown> | undefined, lines = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every(l => TEXT(l, 300));
        if (!d || typeof d !== "object" || !UID(d.id) || !TEXT(d.name, 60) || !TEXT(d.giver, 48) || !TEXT(d.item, 48) || !NUM(d.count, 1, 1000) || !lines(d.offer) || !TEXT(d.accept, 300) || !TEXT(d.progress, 300) || !lines(d.done) || !d.rewards || typeof d.rewards !== "object") { bad("bad quest"); break; }
        const r = d.rewards as Record<string, unknown>, rewards: OverlayQuest["rewards"] = {};
        if (NUM(r.coins, 0, 1_000_000)) rewards.coins = Math.floor(r.coins as number);
        const xp = r.xp as Record<string, unknown> | undefined; if (xp && TEXT(xp.skill, 20) && NUM(xp.amount, 0, 1_000_000)) rewards.xp = { skill: xp.skill as string, amount: Math.floor(xp.amount as number) };
        if (Array.isArray(r.items)) rewards.items = (r.items as Record<string, unknown>[]).filter(e => e && TEXT(e.id, 48) && NUM(e.n, 1, 1000)).slice(0, 8).map(e => ({ id: e.id as string, n: Math.floor(e.n as number) }));
        out.ops.push({ op: "quest", def: { id: d.id as string, name: d.name as string, giver: d.giver as string, item: d.item as string, count: Math.floor(d.count as number), offer: d.offer as string[], accept: d.accept as string, progress: d.progress as string, done: d.done as string[], ...(NUM(d.points, 0, 5) ? { points: Math.floor(d.points as number) } : {}), ...(TEXT(d.difficulty, 20) ? { difficulty: d.difficulty as string } : {}), rewards } }); break;
      }
      case "campzone": if (UID(op.uid) && NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && typeof op.allow === "boolean") out.ops.push({ op: "campzone", uid: op.uid as string, x0: Math.min(op.x0 as number, op.x1 as number), y0: Math.min(op.y0 as number, op.y1 as number), x1: Math.max(op.x0 as number, op.x1 as number), y1: Math.max(op.y0 as number, op.y1 as number), allow: op.allow, ...(TEXT(op.why, 120) && op.why ? { why: op.why as string } : {}) }); else bad("bad campzone"); break;
      case "terrain": {
        const modes: readonly string[] = ["raise", "lower", "flatten", "level", "smooth", "roughen"];
        if (!inWorld || !NUM(op.r, 0, BRUSH_MAX) || (op.shape !== "circle" && op.shape !== "square") || !modes.includes(op.mode as string) || !NUM(op.amount, 0, 16) || !NUM(op.falloff, 0, 1) || (op.target !== undefined && !NUM(op.target, -1000, 2000))) { bad("bad terrain"); break; }
        out.ops.push({ op: "terrain", x: op.x as number, y: op.y as number, r: Math.floor(op.r as number), shape: op.shape, mode: op.mode as TerrainMode, amount: op.amount as number, falloff: op.falloff as number, ...(op.target !== undefined ? { target: op.target as number } : {}), ...(NUM(op.seed, -2147483648, 2147483647) ? { seed: Math.floor(op.seed as number) } : {}) }); break;
      }
      case "slope": if (NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && NUM(op.w, 1, LINE_WIDTH_MAX) && NUM(op.h0, -1000, 2000) && NUM(op.h1, -1000, 2000) && Math.hypot((op.x1 as number) - (op.x0 as number), (op.y1 as number) - (op.y0 as number)) <= 400) out.ops.push({ op: "slope", x0: op.x0 as number, y0: op.y0 as number, x1: op.x1 as number, y1: op.y1 as number, w: op.w as number, h0: op.h0 as number, h1: op.h1 as number }); else bad("bad slope"); break;
      case "paint": if (inWorld && NUM(op.r, 0, BRUSH_MAX) && (op.shape === "circle" || op.shape === "square") && TILES.has(op.t as number)) out.ops.push({ op: "paint", x: op.x as number, y: op.y as number, r: Math.floor(op.r as number), shape: op.shape, t: op.t as number }); else bad("bad paint"); break;
      case "flood": if (inWorld && TILES.has(op.t as number) && NUM(op.limit, 1, FLOOD_MAX)) out.ops.push({ op: "flood", x: op.x as number, y: op.y as number, t: op.t as number, limit: Math.floor(op.limit as number) }); else bad("bad flood"); break;
      case "line": if (NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && NUM(op.w, 1, LINE_WIDTH_MAX) && TILES.has(op.t as number) && Math.hypot((op.x1 as number) - (op.x0 as number), (op.y1 as number) - (op.y0 as number)) <= 800) out.ops.push({ op: "line", x0: op.x0 as number, y0: op.y0 as number, x1: op.x1 as number, y1: op.y1 as number, w: op.w as number, t: op.t as number }); else bad("bad line"); break;
      case "region": if (NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && TEXT(op.region, 32) && (Math.abs((op.x1 as number) - (op.x0 as number)) + 1) * (Math.abs((op.y1 as number) - (op.y0 as number)) + 1) <= REGION_TILES_MAX) out.ops.push({ op: "region", x0: op.x0 as number, y0: op.y0 as number, x1: op.x1 as number, y1: op.y1 as number, region: op.region as string }); else bad("bad region"); break;
      case "scatter": if (inWorld && UID(op.uid) && NUM(op.r, 1, BRUSH_MAX) && (op.kind === "tree" || op.kind === "rock" || op.kind === "decor") && (op.sub === undefined || TEXT(op.sub, 32)) && NUM(op.density, 0.01, 1) && NUM(op.seed, 0, 2147483647)) out.ops.push({ op: "scatter", uid: op.uid as string, x: op.x as number, y: op.y as number, r: Math.floor(op.r as number), kind: op.kind, ...(op.sub ? { sub: op.sub as string } : {}), density: op.density as number, seed: Math.floor(op.seed as number) }); else bad("bad scatter"); break;
      case "clear": if (NUM(op.x0, 0, W - 1) && NUM(op.y0, 0, H - 1) && NUM(op.x1, 0, W - 1) && NUM(op.y1, 0, H - 1) && (Math.abs((op.x1 as number) - (op.x0 as number)) + 1) * (Math.abs((op.y1 as number) - (op.y0 as number)) + 1) <= LIMITS.fillTiles) out.ops.push({ op: "clear", x0: Math.min(op.x0 as number, op.x1 as number), y0: Math.min(op.y0 as number, op.y1 as number), x1: Math.max(op.x0 as number, op.x1 as number), y1: Math.max(op.y0 as number, op.y1 as number) }); else bad("bad clear"); break;
      default: bad("unknown op");
    }
  }
  return out;
}

/**
 * Definitions an overlay adds (monsters, items; NPCs through `npcs`, the game's table, which this module can't import),
 * registered where the game looks them up. Overlay-made things are prefixed, so they can't shadow the game's own.
 */
export const DEV_PREFIX = "dev_";
/** The conversations the overlays write, by whose they are (talktree.ts runs them; content.ts asks here first). */
export const OVERLAY_TALK = new Map<string, OverlayTalk>();
/** The creatures an overlay changed, as they were (so a change taken out of the development world is undone). */
const ORIGINAL_MONSTERS = new Map<string, MonsterDef>();
/** A creature as the game made it, before any overlay changed it. */
export const originalMonster = (id: string): MonsterDef | undefined => { const kept = ORIGINAL_MONSTERS.get(id); return kept ? { ...kept } : MONSTERS[id] ? { ...MONSTERS[id] } : undefined; };
/** Back to the game's own creatures and no overlay conversations: the development frame does this before laying its overlay. */
export function resetOverrides() {
  for (const [id, original] of ORIGINAL_MONSTERS) { const def = MONSTERS[id] as unknown as Record<string, unknown>; for (const key of Object.keys(def)) delete def[key]; Object.assign(def, original); }
  OVERLAY_TALK.clear();
}
export function registerDefinitions(overlay: Overlay, npcs: Record<string, unknown> | null, why: string[] = []) {
  // The overlay's own people, creatures and things first; then its changes and conversations (which may be about them).
  for (const op of overlay.ops) {
    if (op.op === "monster") { if (!op.def.id.startsWith(DEV_PREFIX)) { why.push(`monster ${op.def.id}: ids of the overlay's own start with ${DEV_PREFIX}`); continue; } ORIGINAL_MONSTERS.delete(op.def.id); (MONSTERS as Record<string, MonsterDef>)[op.def.id] = { ...op.def }; }
    if (op.op === "npc") { if (!op.def.id.startsWith(DEV_PREFIX)) { why.push(`npc ${op.def.id}: ids of the overlay's own start with ${DEV_PREFIX}`); continue; } if (npcs) npcs[op.def.id] = { ...op.def, dev: true }; }
    if (op.op === "item") { if (!op.def.id.startsWith(DEV_PREFIX)) { why.push(`item ${op.def.id}: ids of the overlay's own start with ${DEV_PREFIX}`); continue; } registerItem(op.def as unknown as Item); }
  }
  for (const op of overlay.ops) {
    // A change to a creature: made on its own definition (so everything holding it sees it), the original kept to undo it.
    if (op.op === "monsteredit") {
      const def = MONSTERS[op.def.id] as MonsterDef | undefined; if (!def) { why.push(`monster edit ${op.def.id}: no creature called that`); continue; }
      const unknown = [...(op.def.drops ?? []), ...(op.def.always ?? [])].filter(d => !isItem(d.item)); if (unknown.length) { why.push(`monster edit ${op.def.id}: no item called ${unknown.map(d => d.item).join(", ")}`); continue; }
      if (!ORIGINAL_MONSTERS.has(op.def.id)) ORIGINAL_MONSTERS.set(op.def.id, { ...def });
      Object.assign(def, op.def.stats ?? {}, op.def.name ? { name: op.def.name } : {}, op.def.examine !== undefined ? { examine: op.def.examine } : {}, op.def.aggressive !== undefined ? { aggressive: op.def.aggressive } : {}, op.def.drops ? { drops: op.def.drops } : {}, op.def.always ? { always: op.def.always } : {});
    }
    if (op.op === "talk") { if (npcs && !npcs[op.def.id] && !overlay.ops.some(entry => entry.op === "npc" && entry.def.id === op.def.id)) why.push(`talk ${op.def.id}: no one called that`); else OVERLAY_TALK.set(op.def.id, op.def); }
  }
}

/** The camping overrides some overlays carry, in order (camping.ts lays them over its rules). */
export const campZones = (overlays: readonly Overlay[]): CampZone[] => overlays.flatMap(overlay => overlay.ops.flatMap(op => op.op === "campzone" ? [{ x0: op.x0, y0: op.y0, x1: op.x1, y1: op.y1, allow: op.allow, ...(op.why ? { why: op.why } : {}) }] : []));

/** Where the overlay's placed things are in a world, by uid: object index, building index or spawn index. */
export type Placed = { objects: Map<string, number>; buildings: Map<string, number>; spawns: Map<string, number> };

/**
 * Apply an overlay to a live world, in place: tiles, lifts, removals, objects, buildings, spawns, then the indexes and
 * the heights rebuilt. Returns where things landed, and a list of what couldn't be done (an object on an occupied
 * tile, a building off the overworld). The world's `lift`/`raise`/`base` (kept from generation or the bake) make the
 * heights; a `lift` op raises the land's own floor by so many steps (HEAVE_STEP each), softened two tiles round.
 */
/** How far one step of a `lift` op raises the ground (world pixels): a step a quarter of a storey or so. */
export const HEAVE_STEP = 16;
export function applyOverlay(world: World, overlay: Overlay, seed: number, why: string[] = [], npcs: Record<string, unknown> | null = null): Placed {
  const placed: Placed = { objects: new Map(), buildings: new Map(), spawns: new Map() };
  const index = (x: number, y: number) => y * W + x, lift = world.lift ?? (world.lift = new Float32Array(W * H)), raise = world.raise ?? (world.raise = new Float32Array(W * H));
  let tilesChanged = false, objectsChanged = false, buildingsChanged = false;
  // The rectangle of tiles changed (so the development frame rebuilds just the ground round it), and the raises by tile.
  const box = { x0: W, y0: H, x1: -1, y1: -1 }, touch = (x0: number, y0: number, x1: number, y1: number) => { box.x0 = Math.min(box.x0, x0, x1); box.y0 = Math.min(box.y0, y0, y1); box.x1 = Math.max(box.x1, x0, x1); box.y1 = Math.max(box.y1, y0, y1); };
  const heave = new Map<number, number>(), terrain: TerrainOp[] = [], painted = { x0: W, y0: H, x1: -1, y1: -1 };
  const removeAt = (x: number, y: number) => {
    const id = world.objectAt[index(x, y)];
    if (id >= 0) { world.objects[id] = { ...world.objects[id], kind: "decor", decor: "flowers", blocks: false, name: "__removed" }; world.objectAt[index(x, y)] = -1; objectsChanged = true; }
  };
  for (const op of overlay.ops) {
    if (op.op === "tile") { world.tiles[index(op.x, op.y)] = op.t; tilesChanged = true; touch(op.x, op.y, op.x, op.y); }
    else if (op.op === "fill") { for (let y = Math.min(op.y0, op.y1); y <= Math.max(op.y0, op.y1); y++) for (let x = Math.min(op.x0, op.x1); x <= Math.max(op.x0, op.x1); x++) world.tiles[index(x, y)] = op.t; tilesChanged = true; touch(op.x0, op.y0, op.x1, op.y1); }
    else if (op.op === "lift") { if (op.v > 0) heave.set(index(op.x, op.y), op.v); else heave.delete(index(op.x, op.y)); tilesChanged = true; touch(op.x - 2, op.y - 2, op.x + 2, op.y + 2); }
    else if (op.op === "remove") removeAt(op.x, op.y);
    else if (op.op === "paint" || op.op === "flood" || op.op === "line" || op.op === "region") {
      applyPaint(world, op, (x0, y0, x1, y1) => { touch(x0, y0, x1, y1); painted.x0 = Math.min(painted.x0, x0, x1); painted.y0 = Math.min(painted.y0, y0, y1); painted.x1 = Math.max(painted.x1, x0, x1); painted.y1 = Math.max(painted.y1, y0, y1); }, why);
      if (op.op !== "region") tilesChanged = true;
    }
    else if (op.op === "terrain" || op.op === "slope") terrain.push(op);
    else if (op.op === "clear") { for (let y = op.y0; y <= op.y1; y++) for (let x = op.x0; x <= op.x1; x++) removeAt(x, y); }
    else if (op.op === "scatter") {
      // Things scattered on open ground in the brush, one tile in so many (the same ones every time, from the seed); none on a taken tile.
      const kinds = op.kind === "tree" ? Object.keys(TREE_NAMES) : op.kind === "decor" ? SCATTER_DECOR : SCATTER_ROCKS, at = (n: number) => kinds[Math.floor(n * kinds.length) % kinds.length];
      for (let y = Math.max(0, op.y - op.r); y <= Math.min(H - 1, op.y + op.r); y++) for (let x = Math.max(0, op.x - op.r); x <= Math.min(W - 1, op.x + op.r); x++) {
        if (Math.hypot(x - op.x, y - op.y) > op.r + 0.5 || tileHash(x, y, op.seed) >= op.density || !scatterable(world.tiles[index(x, y)]) || world.objectAt[index(x, y)] >= 0 || world.buildingAt[index(x, y)]) continue;
        const sub = op.sub ?? at(tileHash(y, x, op.seed + 1)), name = op.kind === "decor" ? DECOR_NAMES[sub as DecorKind] ?? "Thing" : op.kind === "tree" ? TREE_NAMES[sub as TreeKind] ?? "Tree" : "Rocks";
        const object: WorldObject = { id: world.objects.length, kind: op.kind, x, y, name, blocks: !(op.kind === "decor" && (sub === "flowers" || sub === "lily" || sub === "reeds")), [op.kind]: sub } as WorldObject;
        world.objects.push(object); world.objectAt[index(x, y)] = object.id; objectsChanged = true;
      }
    }
    else if (op.op === "object") {
      if (world.objectAt[index(op.x, op.y)] >= 0) { why.push(`${op.uid}: the tile ${op.x},${op.y} is taken`); continue; }
      const name = op.name ?? (op.kind === "decor" && op.decor ? DECOR_NAMES[op.decor] : op.kind === "tree" && op.tree ? TREE_NAMES[op.tree as TreeKind] : op.kind === "rock" ? "Rocks" : op.kind[0].toUpperCase() + op.kind.slice(1));
      const object: WorldObject = { id: world.objects.length, kind: op.kind, x: op.x, y: op.y, name, blocks: op.blocks ?? (op.kind !== "spot" && op.kind !== "ladder" && !(op.kind === "decor" && (op.decor === "flowers" || op.decor === "lily" || op.decor === "reeds"))) };
      for (const key of ["decor", "tree", "rock", "spot", "text", "to", "look", "sigil", "icon"] as const) if (op[key] !== undefined) (object as Record<string, unknown>)[key] = op[key];
      world.objects.push(object); world.objectAt[index(op.x, op.y)] = object.id; placed.objects.set(op.uid, object.id); objectsChanged = true;
    }
    else if (op.op === "building") {
      const x0 = Math.min(op.x0, op.x1), x1 = Math.max(op.x0, op.x1), y0 = Math.min(op.y0, op.y1), y1 = Math.max(op.y0, op.y1), floor = op.floor ?? T.WOOD;
      if (x1 - x0 < 2 || y1 - y0 < 2) { why.push(`${op.uid}: a building needs three tiles each way`); continue; }
      if (y1 >= OVERWORLD_H && y0 < OVERWORLD_H) { why.push(`${op.uid}: a building can't straddle the overworld's edge`); continue; }
      const building: Building = { x0, y0, x1, y1, roof: op.roof ?? "gable", color: op.color ?? ROOF_COLORS[world.buildings.length % ROOF_COLORS.length], chimney: op.chimney ?? false, name: op.name ?? "", walls: op.walls ?? (floor === T.STONE ? "stone" : "timber"),
        ...(op.hip ? { hip: true } : {}), ...(op.round ? { round: true } : {}), ...(op.storeys && op.storeys > 1 ? { storeys: op.storeys } : {}), ...(op.facade ? { facade: op.facade } : {}) };
      world.buildings.push(building); placed.buildings.set(op.uid, world.buildings.length - 1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { world.tiles[index(x, y)] = x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : floor; removeAt(x, y); }
      // The doorways: the main one, and any more asked for.
      const doors = [op.door, ...(op.doors ?? []).filter(d => d !== op.door)];
      for (const side of doors) for (const [x, y] of doorway(side, x0, y0, x1, y1)) world.tiles[index(x, y)] = floor;
      if (op.furnish) for (const thing of furnishing(op.furnish, x0, y0, x1, y1, doors)) { const object = { ...thing, id: world.objects.length } as WorldObject; world.objects.push(object); world.objectAt[index(object.x, object.y)] = object.id; objectsChanged = true; }
      tilesChanged = true; buildingsChanged = true; touch(x0, y0, x1, y1);
    }
    else if (op.op === "stamp") {
      // A copy of a building: its tiles, the building as drawn, its things and (if asked) its people, turned as placed.
      const p = turned(op.prefab, op.rot), x0 = op.x, y0 = op.y, x1 = op.x + p.w - 1, y1 = op.y + p.h - 1;
      if (!buildable(x0, y0, x1, y1)) { why.push(`${op.uid}: ${p.name} doesn't fit at ${x0},${y0}`); continue; }
      for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) { world.tiles[index(x0 + dx, y0 + dy)] = p.tiles[dy * p.w + dx]; removeAt(x0 + dx, y0 + dy); }
      const building: Building = { roof: "gable", color: ROOF_COLORS[world.buildings.length % ROOF_COLORS.length], chimney: false, name: "", ...p.building, x0, y0, x1, y1 };
      world.buildings.push(building); placed.buildings.set(op.uid, world.buildings.length - 1);
      for (const o of p.objects) { const { dx, dy, ...rest } = o, object = { ...rest, id: world.objects.length, x: x0 + dx, y: y0 + dy } as WorldObject; world.objects.push(object); world.objectAt[index(object.x, object.y)] = object.id; objectsChanged = true; }
      if (op.people) for (const person of p.people) { if (npcs && !npcs[person.id]) { why.push(`${op.uid}: no one called ${person.id}`); continue; } world.spawns.push({ kind: "npc", id: person.id, x: x0 + person.dx, y: y0 + person.dy, ...(person.wander ? { wander: person.wander } : {}) }); }
      tilesChanged = true; buildingsChanged = true; touch(x0, y0, x1, y1);
    }
    else if (op.op === "spawn") {
      const known = op.kind === "npc" ? (npcs ? !!npcs[op.id] : true) : !!MONSTERS[op.id];
      if (!known) { why.push(`${op.uid}: no ${op.kind} called ${op.id}`); continue; }
      world.spawns.push({ kind: op.kind, id: op.id, x: op.x, y: op.y, ...(op.wander ? { wander: op.wander } : {}) }); placed.spawns.set(op.uid, world.spawns.length - 1);
    }
  }
  if (objectsChanged) world.objectAt = indexObjects(world.objects);
  if (buildingsChanged) world.buildingAt = indexBuildings(world.buildings);
  // Painted water lies level with the water it joins (its shore flat, the land easing back).
  if (painted.x1 >= 0) { const moved = levelPaintedWater(world, { x0: Math.max(0, painted.x0), y0: Math.max(0, painted.y0), x1: Math.min(W - 1, painted.x1), y1: Math.min(H - 1, painted.y1) }); if (moved) touch(moved.x0, moved.y0, moved.x1, moved.y1); }
  // Raised ground: the steps, softened over the five by five round each tile, on the land's own floor (never water or its shore).
  if (heave.size) {
    const floor = world.base = world.base ? new Float32Array(world.base) : new Float32Array(W * H);
    for (let y = Math.max(0, box.y0); y <= Math.min(H - 1, box.y1); y++) for (let x = Math.max(0, box.x0); x <= Math.min(W - 1, box.x1); x++) {
      let total = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) total += heave.get(index(x + dx, y + dy)) ?? 0;
      if (total && !onShore(world.tiles, x, y)) floor[index(x, y)] += total / 25 * HEAVE_STEP;
    }
  }
  const clip = (b: { x0: number; y0: number; x1: number; y1: number }) => ({ x0: Math.max(0, b.x0), y0: Math.max(0, b.y0), x1: Math.min(W - 1, b.x1), y1: Math.min(H - 1, b.y1) });
  if (tilesChanged || terrain.length) {
    // (The development frame keeps the ground before the buildings were levelled: only the corners round the change are worked out again.)
    let ground = world.ground && box.x1 >= 0 ? groundHeights(world.tiles, seed, lift, raise, world.base, clip(box), new Float32Array(world.ground))
      : world.ground ? new Float32Array(world.ground) : groundHeights(world.tiles, seed, lift, raise, world.base);
    // The ground ops move the floor; the corners over it are worked out again the same way the bake will (so it bakes as it's seen).
    const moved = applyTerrain(world, ground, terrain);
    if (moved) ground = groundHeights(world.tiles, seed, lift, raise, world.base, clip(moved), ground);
    if (world.ground) world.ground = ground;
    world.heights = world.ground ? new Float32Array(ground) : ground; levelBuildings(world.heights, world.buildings, world.tiles);
  }
  return placed;
}

/** Whether a tile can be walked on in a world (terrain and blocking objects; no creatures). */
/** What a scatter of rocks or decorations picks from when it isn't told which. */
const SCATTER_ROCKS = ["pewter", "clay", "blackiron"], SCATTER_DECOR = ["bush", "flowers", "reeds", "stump", "boulder"];
export const walkableAt = (world: World, x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && WALKABLE.has(world.tiles[y * W + x]) && (world.objectAt[y * W + x] < 0 || !world.objects[world.objectAt[y * W + x]].blocks);
/** Every tile on foot from a start (no corner cutting), as a bitmap; the editor's reachability check. */
export function reachableFrom(world: World, sx: number, sy: number): Uint8Array {
  const seen = new Uint8Array(W * H), queue = [sy * W + sx]; if (!walkableAt(world, sx, sy)) return seen; seen[queue[0]] = 1;
  while (queue.length) {
    const i = queue.pop()!, x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !walkableAt(world, nx, ny)) continue;
      if (dx && dy && (!walkableAt(world, x + dx, y) || !walkableAt(world, x, y + dy))) continue;
      seen[ny * W + nx] = 1; queue.push(ny * W + nx);
    }
  }
  return seen;
}
/** What's wrong with an overlay's placements in a world: things nobody can reach on foot from the spawn (ladders link levels, so each level is checked from its first reachable tile). */
export function validatePlacements(world: World, overlay: Overlay, placed: Placed): string[] {
  const out: string[] = [], from = reachableFrom(world, world.places.spawn.x, world.places.spawn.y);
  const near = (x: number, y: number) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && from[(y + dy) * W + x + dx]);
  for (const op of overlay.ops) {
    if (op.op === "object" && placed.objects.has(op.uid) && op.y < FLOOR_Y && !near(op.x, op.y)) out.push(`${op.name ?? op.kind} at ${op.x},${op.y} (${op.uid}) can't be reached from the spawn`);
    if (op.op === "spawn" && placed.spawns.has(op.uid) && !near(op.x, op.y)) out.push(`${op.kind} ${op.id} at ${op.x},${op.y} (${op.uid}) can't be reached from the spawn`);
    if ((op.op === "building" || op.op === "stamp") && placed.buildings.has(op.uid)) { const b = world.buildings[placed.buildings.get(op.uid)!]; let door = false; for (let y = b.y0; y <= b.y1 && !door; y++) for (let x = b.x0; x <= b.x1; x++) if ((x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1) && walkableAt(world, x, y) && near(x, y)) { door = true; break; } if (!door) out.push(`building ${(op.op === "building" ? op.name : op.prefab.name) ?? op.uid}: its door can't be reached from the spawn`); }
  }
  return out;
}
