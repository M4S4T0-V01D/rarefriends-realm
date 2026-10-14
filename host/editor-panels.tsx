/**
 * The development dashboard's bigger editors (host/editor.tsx mounts them): conversations (a tree of what someone says,
 * your answers, what each needs and does: overlay.ts OverlayTalk, run by talktree.ts), creatures (any creature's
 * numbers and drop tables: MonsterEdit), and the searchable lists they and the tools pick from. Each edits the overlay
 * through the dashboard's `push`, so undo, save and deploy work on them like on everything else.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { DevCatalog } from "../games/rarefriends-realm/roster.ts";
import type { MonsterEdit, Op, OverlayTalk, TalkAct, TalkNeed, TalkNode, TalkOption } from "../games/rarefriends-realm/overlay.ts";

export type Styles = { row: CSSProperties; btn: (on?: boolean) => CSSProperties; input: CSSProperties; small: CSSProperties; h: CSSProperties; muted: CSSProperties; item: CSSProperties };
type Named = { id: string; name: string };
/** What the panels need from the dashboard. */
export type Kit = {
  S: Styles; warn: string; catalog: DevCatalog | null; ops: Op[]; people: Named[]; wares: Named[];
  push: (ops: Op[], note?: string) => void; say: (text: string) => void; command: (cmd: Record<string, unknown>) => void;
  ask: (question: Record<string, unknown>) => Promise<unknown>; here: { x: number; y: number } | null;
  /** Switch to the Spawn tool with someone (or something) chosen. */
  place: (kind: "npc" | "monster", id: string) => void;
};

/** A list to pick from, with a filter: people, creatures, buildings. */
export function SearchList<T extends { id: string }>({ S, items, label, chosen, onPick, placeholder, height = 220 }: { S: Styles; items: readonly T[]; label: (item: T) => string; chosen?: string; onPick: (item: T) => void; placeholder: string; height?: number }) {
  const [filter, setFilter] = useState(""), q = filter.trim().toLowerCase();
  const shown = (q ? items.filter(item => label(item).toLowerCase().includes(q) || item.id.toLowerCase().includes(q)) : items).slice(0, 400);
  return <div>
    <input style={S.input} placeholder={placeholder} value={filter} onChange={e => setFilter(e.target.value)} />
    <div style={{ maxHeight: height, overflow: "auto", marginTop: 3 }} role="listbox" aria-label={placeholder}>
      {shown.map(item => <button key={item.id} type="button" role="option" aria-selected={item.id === chosen} style={{ ...S.btn(item.id === chosen), display: "block", width: "100%", textAlign: "left", marginBottom: 2 }} onClick={() => onPick(item)}>{label(item)}</button>)}
      {!shown.length && <div style={S.muted}>Nothing matches.</div>}
    </div>
  </div>;
}

// ---------- Drop tables ----------
type Drop = { item: string; min: number; max: number; chance: number };
const pct = (chance: number) => Number((chance * 100).toPrecision(6));
const oneIn = (chance: number) => chance >= 1 ? "always" : `1 in ${Math.round(1 / chance).toLocaleString()}`;
/** A drop table: each row an item, how many (min–max) and its own chance (each rolled on its own). */
export function DropTable({ S, drops, onChange, wares, listId, always = false }: { S: Styles; drops: Drop[]; onChange: (drops: Drop[]) => void; wares: Named[]; listId: string; always?: boolean }) {
  const set = (i: number, patch: Partial<Drop>) => onChange(drops.map((d, k) => k === i ? { ...d, ...patch } : d));
  const known = new Set(wares.map(w => w.id)), nameOf = (id: string) => wares.find(w => w.id === id)?.name;
  return <div>
    <datalist id={listId}>{wares.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</datalist>
    <div style={{ display: "grid", gridTemplateColumns: always ? "1fr 56px 56px 24px" : "1fr 56px 56px 84px 24px", gap: 3, alignItems: "center" }}>
      <span style={S.muted}>item</span><span style={S.muted}>min</span><span style={S.muted}>max</span>{!always && <span style={S.muted}>chance %</span>}<span />
      {drops.map((d, i) => [
        <span key={`i${i}`}><input style={{ ...S.input, ...(known.has(d.item) ? {} : { outline: "2px solid #f0a050" }) }} list={listId} value={d.item} onChange={e => set(i, { item: e.target.value.trim() })} title={nameOf(d.item) ?? "no such item"} /><span style={S.muted}>{nameOf(d.item) ?? "?"}{!always ? ` · ${oneIn(d.chance)}` : ""}</span></span>,
        <input key={`a${i}`} style={S.small} type="number" min={1} value={d.min} onChange={e => set(i, { min: Math.max(1, Math.floor(Number(e.target.value) || 1)), max: Math.max(d.max, Math.floor(Number(e.target.value) || 1)) })} />,
        <input key={`b${i}`} style={S.small} type="number" min={d.min} value={d.max} onChange={e => set(i, { max: Math.max(d.min, Math.floor(Number(e.target.value) || d.min)) })} />,
        ...(!always ? [<input key={`c${i}`} style={{ ...S.small, width: 80 }} type="number" min={0.0001} max={100} step="any" value={pct(d.chance)} onChange={e => set(i, { chance: Math.max(0.000001, Math.min(1, (Number(e.target.value) || 0) / 100)) })} />] : []),
        <button key={`x${i}`} type="button" style={S.btn()} title="Take this row out" onClick={() => onChange(drops.filter((_, k) => k !== i))}>✕</button>,
      ])}
    </div>
    <div style={S.row}><button type="button" style={S.btn()} onClick={() => onChange([...drops, { item: "coins", min: 1, max: 10, chance: always ? 1 : 0.5 }])}>+ {always ? "always-drop" : "drop"}</button></div>
  </div>;
}

// ---------- Creatures ----------
const STATS: readonly (readonly [string, string])[] = [["level", "Level"], ["hp", "Hitpoints"], ["attack", "Attack"], ["strength", "Strength"], ["defence", "Defence"], ["attackBonus", "Attack bonus"], ["defenceBonus", "Defence bonus"], ["maxHit", "Max hit"], ["speed", "Ticks a swing"], ["respawn", "Respawn (ticks)"], ["wander", "Wander (tiles)"]];
/** The specials and the hunting, as the form keeps them (text, so empty means "none"). */
const SPECIAL_NUMS: readonly (readonly [string, string, string])[] = [
  ["magicDef", "Magic defence", "its defence unless set"], ["ranged", "Shoots from (tiles)", "an archer"], ["size", "Size (tiles)", "1"], ["slayer", "Slayer level to wound", ""],
  ["breath", "Dragonfire (top hit)", "breathes fire"], ["heals", "Heals itself (a few ticks)", "below half health"], ["poisonDamage", "Poison damage", ""], ["poisonChance", "Poison chance %", ""],
  ["drainFaith", "Drains faith a hit", ""], ["drainEnergy", "Drains energy a hit", ""],
  ["aggroRange", "Notices you from (tiles)", "4"], ["chase", "Chases you (tiles)", "16"], ["leash", "Strays from home (tiles past wander)", "12"],
];
const SPECIAL_FLAGS: readonly (readonly [string, string])[] = [["enrage", "Enrages below a third"], ["undead", "Undead"], ["boss", "A boss"], ["alwaysAggressive", "Attacks whatever your level"]];
type MonsterInfo = { original: Record<string, unknown> & { drops?: Drop[]; always?: Drop[] }; current: Record<string, unknown> & { drops?: Drop[]; always?: Drop[] } };
type MonsterForm = { name: string; examine: string; aggressive: boolean; stats: Record<string, number>; drops: Drop[]; always: Drop[]; weakness: string; attackStyle: string; nums: Record<string, string>; flags: Record<string, boolean> };
const numsOf = (def: Record<string, unknown>): Record<string, string> => {
  const poison = def.poison as { damage: number; chance: number } | undefined, drain = def.drain as { faith?: number; energy?: number } | undefined, s = (v: unknown) => v === undefined || v === null ? "" : String(v);
  return { magicDef: s(def.magicDef), ranged: s(def.ranged), size: s(def.size), slayer: s(def.slayer), breath: s(def.breath), heals: s(def.heals), poisonDamage: s(poison?.damage), poisonChance: poison ? s(Math.round(poison.chance * 100)) : "", drainFaith: s(drain?.faith), drainEnergy: s(drain?.energy), aggroRange: s(def.aggroRange), chase: s(def.chase), leash: s(def.leash) };
};
const formOf = (def: MonsterInfo["current"]): MonsterForm => ({ name: String(def.name ?? ""), examine: String(def.examine ?? ""), aggressive: !!def.aggressive, stats: Object.fromEntries(STATS.map(([k]) => [k, Number(def[k] ?? 0)])), drops: (def.drops ?? []).map(d => ({ ...d })), always: (def.always ?? []).map(d => ({ ...d })),
  weakness: String(def.weakness ?? ""), attackStyle: String(def.attackStyle ?? ""), nums: numsOf(def), flags: Object.fromEntries(SPECIAL_FLAGS.map(([k]) => [k, !!def[k]])) });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** The edit a form makes against the creature as the game made it: only what differs. */
function editOf(id: string, o: MonsterInfo["original"], form: MonsterForm): MonsterEdit {
  const edit: MonsterEdit = { id }, stats: Record<string, number> = {};
  if (form.name.trim() && form.name.trim() !== o.name) edit.name = form.name.trim();
  if (form.examine !== (o.examine ?? "")) edit.examine = form.examine;
  if (form.aggressive !== !!o.aggressive) edit.aggressive = form.aggressive;
  for (const [k] of STATS) if (form.stats[k] !== Number(o[k] ?? 0)) stats[k] = form.stats[k];
  if (Object.keys(stats).length) edit.stats = stats;
  if (!same(form.drops, o.drops ?? [])) edit.drops = form.drops;
  if (!same(form.always, o.always ?? [])) edit.always = form.always;
  const sp: Record<string, unknown> = {}, was = numsOf(o), num = (k: string) => form.nums[k] === "" ? null : Number(form.nums[k]);
  if (form.weakness !== String(o.weakness ?? "")) sp.weakness = form.weakness || null;
  if (form.attackStyle !== String(o.attackStyle ?? "")) sp.attackStyle = form.attackStyle || null;
  for (const k of ["magicDef", "ranged", "size", "slayer", "breath", "heals", "aggroRange", "chase", "leash"]) if (form.nums[k] !== was[k]) sp[k] = num(k);
  if (form.nums.poisonDamage !== was.poisonDamage || form.nums.poisonChance !== was.poisonChance) sp.poison = form.nums.poisonDamage && form.nums.poisonChance ? { damage: Number(form.nums.poisonDamage), chance: Number(form.nums.poisonChance) / 100 } : null;
  if (form.nums.drainFaith !== was.drainFaith || form.nums.drainEnergy !== was.drainEnergy) sp.drain = form.nums.drainFaith || form.nums.drainEnergy ? { ...(form.nums.drainFaith ? { faith: Number(form.nums.drainFaith) } : {}), ...(form.nums.drainEnergy ? { energy: Number(form.nums.drainEnergy) } : {}) } : null;
  for (const [k] of SPECIAL_FLAGS) if (form.flags[k] !== !!o[k]) sp[k] = form.flags[k] ? true : null;
  if (Object.keys(sp).length) edit.specials = sp as MonsterEdit["specials"];
  return edit;
}
const METALS = ["pewter", "blackiron", "ashsteel", "moonsilver", "glimmer", "rarite", "frostsilver", "gloomsteel", "wyrmscale", "hollowsteel", "cindersteel", "ashenheart"];
type SimResult = { error?: string; fights: number; kills: number; deaths: number; timeouts: number; ticks: { mean: number; min: number; max: number }; seconds: number; foodUsed: number; damageTaken: number; xpPerKill: number; killsPerHour: number; drops: { item: string; name: string; times: number; total: number }[] };
/** Any creature, the game's own included: its numbers, specials, hunting and drops (an overlay's change, undone by taking it out), a fight simulator, and groups of it placed in the world. */
export function MonsterEditor({ kit }: { kit: Kit }) {
  const { S } = kit, [chosen, setChosen] = useState(""), [info, setInfo] = useState<MonsterInfo | null>(null), [form, setForm] = useState<MonsterForm | null>(null);
  const [sim, setSim] = useState({ level: 40, metal: "blackiron", style: "melee", food: "inkshark", foodN: 10, fights: 100 }), [result, setResult] = useState<SimResult | null>(null), [running, setRunning] = useState(false);
  const edits = new Map(kit.ops.flatMap(op => op.op === "monsteredit" ? [[op.def.id, op.def] as const] : []));
  const monsters = useMemo(() => {
    const own = kit.ops.flatMap(op => op.op === "monster" ? [{ id: op.def.id, name: op.def.name, level: op.def.level }] : []);
    return [...own, ...(kit.catalog?.monsters ?? []).filter(m => !own.some(o => o.id === m.id))];
  }, [kit.catalog, kit.ops]);
  const load = (id: string) => void kit.ask({ ask: "monster", id }).then(answer => { const a = answer as MonsterInfo | null; if (!a) { kit.say(`The game doesn't know ${id} yet.`); return; } setInfo(a); setForm(formOf(a.current)); });
  useEffect(() => { if (chosen) { load(chosen); setResult(null); } }, [chosen]);
  const apply = () => {
    if (!info || !form) return;
    const edit = editOf(chosen, info.original, form), rest = kit.ops.filter(op => !(op.op === "monsteredit" && op.def.id === chosen));
    if (Object.keys(edit).length === 1) kit.push(rest, `${String(info.original.name)}: back to the game's own.`);
    else kit.push([...rest, { op: "monsteredit", def: edit }], `${String(info.original.name)} changed (${Object.keys(edit).filter(k => k !== "id").join(", ")}); save to keep it.`);
    window.setTimeout(() => load(chosen), 600);
  };
  const reset = () => { kit.push(kit.ops.filter(op => !(op.op === "monsteredit" && op.def.id === chosen)), `${chosen}: back to the game's own.`); window.setTimeout(() => load(chosen), 600); };
  const run = () => { if (!info || !form) return; setRunning(true); setResult(null);
    void kit.ask({ ask: "simulate", id: chosen, edit: editOf(chosen, info.original, form), options: sim }).then(r => { setRunning(false); const res = r as SimResult | null; if (!res) kit.say("The simulator didn't answer."); else if (res.error) kit.say(`Can't simulate: ${res.error}`); else setResult(res); }); };
  const num = (k: string) => form?.nums[k] ?? "", setNum = (k: string, v: string) => form && setForm({ ...form, nums: { ...form.nums, [k]: v.replace(/[^0-9.]/g, "") } });
  const changed = (k: string) => info && form && form.nums[k] !== numsOf(info.original)[k];
  return <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12, height: "100%" }}>
    <div>
      <SearchList S={S} items={monsters} chosen={chosen} placeholder="Find a creature…" height={420} label={m => `${edits.has(m.id) ? "✎ " : ""}${m.name} (${m.level})`} onPick={m => setChosen(m.id)} />
      <p style={S.muted}>✎: changed by this world. Any creature can be changed, the game's own included; taking the change out puts it back as the game made it.</p>
    </div>
    {!form || !info ? <div style={S.muted}>Choose a creature.</div> : <div>
      <div style={S.row}><b>{String(info.original.name)}</b><span style={S.muted}>{chosen}</span>
        <button type="button" style={S.btn(true)} onClick={apply}>Apply</button>
        <button type="button" style={S.btn()} disabled={!edits.has(chosen)} onClick={reset}>Back to the game's</button>
        <button type="button" style={S.btn()} onClick={() => kit.place("monster", chosen)}>Place…</button></div>
      <h4 style={S.h}>Basics</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "4px 10px" }}>
        <label>Name<input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label style={{ gridColumn: "span 2" }}>Examine<input style={S.input} value={form.examine} onChange={e => setForm({ ...form, examine: e.target.value })} /></label>
        {STATS.map(([k, label]) => <label key={k}>{label}{form.stats[k] !== Number(info.original[k] ?? 0) && <span style={{ color: kit.warn }}> (was {String(info.original[k] ?? 0)})</span>}<input style={S.input} type="number" value={form.stats[k]} onChange={e => setForm({ ...form, stats: { ...form.stats, [k]: Number(e.target.value) } })} /></label>)}
      </div>
      <h4 style={S.h}>How it fights</h4>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "4px 10px" }}>
        <label>Attacks with<select style={S.input} value={form.attackStyle} onChange={e => setForm({ ...form, attackStyle: e.target.value })}><option value="">melee</option><option value="magic">magic</option></select></label>
        <label>Weak to<select style={S.input} value={form.weakness} onChange={e => setForm({ ...form, weakness: e.target.value })}><option value="">nothing</option>{["fire", "water", "wind", "earth", "holy"].map(w => <option key={w} value={w}>{w}</option>)}</select></label>
        {SPECIAL_NUMS.map(([k, label, hint]) => <label key={k}>{label}{changed(k) && <span style={{ color: kit.warn }}> ✎</span>}<input style={S.input} placeholder={hint || "none"} value={num(k)} onChange={e => setNum(k, e.target.value)} /></label>)}
      </div>
      <div style={S.row}>
        <label><input type="checkbox" checked={form.aggressive} onChange={e => setForm({ ...form, aggressive: e.target.checked })} /> Aggressive</label>
        {SPECIAL_FLAGS.map(([k, label]) => <label key={k}><input type="checkbox" checked={form.flags[k]} onChange={e => setForm({ ...form, flags: { ...form.flags, [k]: e.target.checked } })} /> {label}</label>)}
      </div>
      <p style={S.muted}>Empty means it hasn't got it. Dragonfire hits up to its number (a Wyrmward shield turns it); poison lands on a hit at its chance; drains take faith or run energy each hit; an enraged creature hits half as hard again, and faster, below a third of its health.</p>
      <h4 style={S.h}>Drops {same(form.drops, info.original.drops ?? []) ? "" : "(changed)"}</h4>
      <p style={S.muted}>Each row rolls on its own when it dies: the chance is per kill.</p>
      <DropTable S={S} drops={form.drops} onChange={drops => setForm({ ...form, drops })} wares={kit.wares} listId="dev-drop-items" />
      <h4 style={S.h}>Always drops {same(form.always, info.original.always ?? []) ? "" : "(changed)"}</h4>
      <DropTable S={S} drops={form.always} onChange={always => setForm({ ...form, always })} wares={kit.wares} listId="dev-drop-items" always />
      <h4 style={S.h}>Fight it (simulator)</h4>
      <p style={S.muted}>Fights the creature as it stands in this form (applied or not) over and over, off-screen, with the game's own combat: a Friend with every skill at the level, the metal's sword and armour (or a staff and the best spell its level allows), eating below half health.</p>
      <div style={S.row}>
        <label>Level <input style={S.small} type="number" min={1} max={99} value={sim.level} onChange={e => setSim({ ...sim, level: Number(e.target.value) })} /></label>
        <label>Gear <select style={{ ...S.small, width: 110 }} value={sim.metal} onChange={e => setSim({ ...sim, metal: e.target.value })}>{METALS.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
        <label>Style <select style={{ ...S.small, width: 80 }} value={sim.style} onChange={e => setSim({ ...sim, style: e.target.value })}><option value="melee">melee</option><option value="magic">magic</option></select></label>
        <label>Food <select style={{ ...S.small, width: 100 }} value={sim.food} onChange={e => setSim({ ...sim, food: e.target.value })}><option value="inkshark">inkshark (20)</option><option value="sailfish">sailfish (14)</option><option value="cake">cake (12)</option></select></label>
        <label>× <input style={{ ...S.small, width: 44 }} type="number" min={0} max={27} value={sim.foodN} onChange={e => setSim({ ...sim, foodN: Number(e.target.value) })} /></label>
        <label>Fights <input style={{ ...S.small, width: 54 }} type="number" min={1} max={300} value={sim.fights} onChange={e => setSim({ ...sim, fights: Number(e.target.value) })} /></label>
        <button type="button" style={S.btn(true)} disabled={running} onClick={run}>{running ? "Fighting…" : "Run"}</button>
      </div>
      {result && <div style={{ border: "1px solid #3a3940", borderRadius: 4, padding: 8 }}>
        <div><b>{result.kills}</b> won, <b style={{ color: result.deaths ? kit.warn : undefined }}>{result.deaths}</b> lost{result.timeouts ? `, ${result.timeouts} ran out of time` : ""} of {result.fights} · a kill takes <b>{result.seconds}s</b> ({result.ticks.mean} ticks; {result.ticks.min}–{result.ticks.max})</div>
        <div style={S.muted}>food {(result.foodUsed / result.fights).toFixed(1)} a fight · damage taken {Math.round(result.damageTaken / result.fights)} a fight · {result.xpPerKill.toLocaleString()} XP a kill · about {result.killsPerHour} kills an hour at one spawn (with its respawn)</div>
        {result.drops.length > 0 && <table style={{ marginTop: 6, borderCollapse: "collapse" }}><tbody>{result.drops.map(d => <tr key={d.item}><td style={{ paddingRight: 12 }}>{d.name}</td><td style={{ paddingRight: 12 }} title="kills it dropped in">{Math.round(d.times / Math.max(1, result.kills) * 100)}%</td><td style={S.muted}>{d.total.toLocaleString()} in all</td></tr>)}</tbody></table>}
      </div>}
    </div>}
  </div>;
}

// ---------- Conversations ----------
type DraftNode = Omit<TalkNode, "lines"> & { text: string };
type Draft = { id: string; mode: "replace" | "add"; label: string; start: string; nodes: DraftNode[] };
/** Lines as typed: one a line, "> " in front of what you say. */
const toText = (lines: TalkNode["lines"]) => lines.map(l => `${l.who === "player" ? "> " : ""}${l.text}`).join("\n");
const fromText = (text: string): TalkNode["lines"] => text.split("\n").map(l => l.trim()).filter(Boolean).map(l => l.startsWith(">") ? { who: "player" as const, text: l.slice(1).trim() } : { who: "npc" as const, text: l }).filter(l => l.text);
const draftOf = (talk: OverlayTalk): Draft => ({ id: talk.id, mode: talk.mode, label: talk.label ?? "", start: talk.start, nodes: talk.nodes.map(({ lines, ...rest }) => ({ ...rest, text: toText(lines) })) });
const freshDraft = (id: string): Draft => ({ id, mode: "replace", label: "", start: "start", nodes: [
  { id: "start", text: "Hello there, traveller.", options: [{ label: "Who are you?", to: "who" }, { label: "Goodbye.", to: "" }] },
  { id: "who", text: "> Who are you?\nJust someone who lives here.", options: [{ label: "Goodbye.", to: "" }] },
] });
const NEED_KINDS: readonly (readonly [TalkNeed["kind"], string])[] = [["item", "has an item"], ["level", "a skill at least"], ["quest", "a quest (done, or at a stage)"], ["flag", "a note made"], ["noflag", "a note not made"]];
const ACT_KINDS: readonly (readonly [TalkAct["kind"], string])[] = [["give", "give an item"], ["take", "take an item"], ["frens", "give Frens"], ["pay", "take Frens"], ["xp", "give XP"], ["flag", "make a note"], ["unflag", "clear a note"], ["heal", "heal"], ["teleport", "move them"]];

function Needs({ kit, needs, onChange }: { kit: Kit; needs: TalkNeed[]; onChange: (needs: TalkNeed[]) => void }) {
  const { S } = kit, set = (i: number, patch: Partial<TalkNeed>) => onChange(needs.map((n, k) => k === i ? { ...n, ...patch } : n));
  return <div>
    {needs.map((n, i) => <div key={i} style={S.row}>
      <span style={S.muted}>needs</span>
      <select style={{ ...S.small, width: 170 }} value={n.kind} onChange={e => set(i, { kind: e.target.value as TalkNeed["kind"], id: "", n: e.target.value === "item" || e.target.value === "level" ? 1 : undefined })}>{NEED_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
      {n.kind === "level" ? <select style={{ ...S.small, width: 120 }} value={n.id} onChange={e => set(i, { id: e.target.value })}><option value="">skill…</option>{(kit.catalog?.skills ?? []).map(s => <option key={s} value={s}>{s}</option>)}</select>
        : <input style={{ ...S.small, width: 150 }} list={n.kind === "item" ? "dev-talk-items" : n.kind === "quest" ? "dev-talk-quests" : undefined} placeholder={n.kind === "item" ? "item id" : n.kind === "quest" ? "quest id" : "note name"} value={n.id} onChange={e => set(i, { id: e.target.value.trim() })} />}
      {(n.kind === "item" || n.kind === "level") && <input style={{ ...S.small, width: 56 }} type="number" min={1} value={n.n ?? 1} onChange={e => set(i, { n: Math.max(1, Number(e.target.value) || 1) })} />}
      {n.kind === "quest" && <input style={{ ...S.small, width: 70 }} type="number" min={0} placeholder="done" value={n.n ?? ""} onChange={e => set(i, { n: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })} title="Empty: the quest done. A number: at least that stage." />}
      <button type="button" style={S.btn()} onClick={() => onChange(needs.filter((_, k) => k !== i))}>✕</button>
    </div>)}
    <button type="button" style={S.btn()} onClick={() => onChange([...needs, { kind: "item", id: "", n: 1 }])}>+ needs</button>
  </div>;
}
function Deeds({ kit, acts, onChange, what = "does" }: { kit: Kit; acts: TalkAct[]; onChange: (acts: TalkAct[]) => void; what?: string }) {
  const { S } = kit, set = (i: number, patch: Partial<TalkAct>) => onChange(acts.map((a, k) => k === i ? { ...a, ...patch } : a));
  return <div>
    {acts.map((a, i) => <div key={i} style={S.row}>
      <span style={S.muted}>{what}</span>
      <select style={{ ...S.small, width: 130 }} value={a.kind} onChange={e => { const kind = e.target.value as TalkAct["kind"]; set(i, { kind, id: kind === "heal" || kind === "teleport" || kind === "frens" || kind === "pay" ? undefined : "", n: kind === "heal" || kind === "teleport" || kind === "flag" || kind === "unflag" ? undefined : 1, ...(kind === "teleport" ? { x: kit.here?.x ?? 0, y: kit.here?.y ?? 0 } : { x: undefined, y: undefined }) }); }}>{ACT_KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
      {(a.kind === "give" || a.kind === "take") && <input style={{ ...S.small, width: 150 }} list="dev-talk-items" placeholder="item id" value={a.id ?? ""} onChange={e => set(i, { id: e.target.value.trim() })} />}
      {a.kind === "xp" && <select style={{ ...S.small, width: 120 }} value={a.id ?? ""} onChange={e => set(i, { id: e.target.value })}><option value="">skill…</option>{(kit.catalog?.skills ?? []).map(s => <option key={s} value={s}>{s}</option>)}</select>}
      {(a.kind === "flag" || a.kind === "unflag") && <input style={{ ...S.small, width: 150 }} placeholder="note name" value={a.id ?? ""} onChange={e => set(i, { id: e.target.value.trim().replace(/[^a-z0-9_-]/gi, "_") })} />}
      {["give", "take", "frens", "pay", "xp"].includes(a.kind) && <input style={{ ...S.small, width: 80 }} type="number" min={1} value={a.n ?? 1} onChange={e => set(i, { n: Math.max(1, Number(e.target.value) || 1) })} />}
      {a.kind === "teleport" && <><input style={{ ...S.small, width: 56 }} type="number" value={a.x ?? 0} onChange={e => set(i, { x: Number(e.target.value) })} /><input style={{ ...S.small, width: 56 }} type="number" value={a.y ?? 0} onChange={e => set(i, { y: Number(e.target.value) })} /><button type="button" style={S.btn()} onClick={() => kit.here && set(i, { x: kit.here.x, y: kit.here.y })}>here</button></>}
      <button type="button" style={S.btn()} onClick={() => onChange(acts.filter((_, k) => k !== i))}>✕</button>
    </div>)}
    <button type="button" style={S.btn()} onClick={() => onChange([...acts, { kind: "give", id: "", n: 1 }])}>+ {what}</button>
  </div>;
}
/** What's wrong with a draft before it's sent (the game checks it again, and says in the report). */
function draftProblems(d: Draft): string[] {
  const out: string[] = [], ids = new Set<string>();
  if (d.mode === "add" && !d.label.trim()) out.push("An added conversation needs the words of the option that opens it.");
  for (const n of d.nodes) { if (!/^[a-z0-9_-]{1,40}$/i.test(n.id)) out.push(`“${n.id}”: a node's name is letters, numbers, _ and -.`); if (ids.has(n.id)) out.push(`Two nodes called ${n.id}.`); ids.add(n.id); }
  for (const n of d.nodes) {
    if (!fromText(n.text).length && !(n.options ?? []).length) out.push(`${n.id} says nothing and offers nothing.`);
    for (const o of n.options ?? []) { if (!o.label.trim()) out.push(`${n.id}: an option without words.`); if (o.to && !ids.has(o.to)) out.push(`${n.id}: “${o.label}” goes to ${o.to}, which isn't a node.`); }
    for (const a of [...(n.do ?? []), ...(n.options ?? []).flatMap(o => o.do ?? [])]) if ((a.kind === "give" || a.kind === "take" || a.kind === "xp" || a.kind === "flag" || a.kind === "unflag") && !a.id) out.push(`${n.id}: “${ACT_KINDS.find(([k]) => k === a.kind)?.[1]}” needs to say what.`);
    for (const need of (n.options ?? []).flatMap(o => o.need ?? [])) if (!need.id) out.push(`${n.id}: a need that doesn't say what.`);
  }
  return out;
}
/** Conversations: whose, all they say or one more thing to ask them, and the tree itself. */
export function TalkEditor({ kit, initial }: { kit: Kit; initial?: string }) {
  const { S } = kit, [who, setWho] = useState(initial ?? ""), [draft, setDraft] = useState<Draft | null>(null);
  const existing = (id: string) => kit.ops.find(op => op.op === "talk" && op.def.id === id) as Extract<Op, { op: "talk" }> | undefined;
  const talked = new Set(kit.ops.flatMap(op => op.op === "talk" ? [op.def.id] : []));
  useEffect(() => { if (initial) setWho(initial); }, [initial]);
  useEffect(() => { if (!who) { setDraft(null); return; } const op = existing(who); setDraft(op ? draftOf(op.def) : freshDraft(who)); }, [who]);
  const problems = draft ? draftProblems(draft) : [];
  const setNode = (i: number, patch: Partial<DraftNode>) => draft && setDraft({ ...draft, nodes: draft.nodes.map((n, k) => k === i ? { ...n, ...patch } : n) });
  const setOption = (i: number, j: number, patch: Partial<TalkOption>) => draft && setNode(i, { options: (draft.nodes[i].options ?? []).map((o, k) => k === j ? { ...o, ...patch } : o) });
  const rename = (i: number, to: string) => {
    if (!draft) return; const from = draft.nodes[i].id;
    setDraft({ ...draft, start: draft.start === from ? to : draft.start, nodes: draft.nodes.map((n, k) => ({ ...(k === i ? { ...n, id: to } : n), options: (n.options ?? []).map(o => o.to === from ? { ...o, to } : o) })) });
  };
  const addNode = (fromNode?: number, fromOption?: number) => {
    if (!draft) return; let k = draft.nodes.length + 1; while (draft.nodes.some(n => n.id === `node${k}`)) k++;
    const id = `node${k}`, nodes = [...draft.nodes, { id, text: "", options: [{ label: "Goodbye.", to: "" }] }];
    if (fromNode !== undefined && fromOption !== undefined) nodes[fromNode] = { ...nodes[fromNode], options: (nodes[fromNode].options ?? []).map((o, j) => j === fromOption ? { ...o, to: id } : o) };
    setDraft({ ...draft, nodes });
  };
  const talkOp = (d: Draft): Op => ({ op: "talk", def: { id: d.id, mode: d.mode, ...(d.mode === "add" ? { label: d.label.trim() } : {}), start: d.nodes.some(n => n.id === d.start) ? d.start : d.nodes[0].id, nodes: d.nodes.map(({ text, ...n }) => ({ ...n, lines: fromText(text), ...(n.do?.length ? { do: n.do } : { do: undefined }), options: (n.options ?? []).map(o => ({ ...o, label: o.label.trim(), ...(o.need?.length ? {} : { need: undefined }), ...(o.do?.length ? {} : { do: undefined }) })) })) } } as Op);
  const save = (thenTry = false) => {
    if (!draft) return; if (problems.length) { kit.say(`Not yet: ${problems[0]}`); return; }
    kit.push([...kit.ops.filter(op => !(op.op === "talk" && op.def.id === draft.id)), talkOp(draft)], `Conversation for ${draft.id} written; save to keep it.`);
    if (thenTry) window.setTimeout(() => kit.command({ cmd: "talk", id: draft.id }), 700);
  };
  const remove = () => { if (!draft || !confirm(`Take ${draft.id}'s conversation out?`)) return; kit.push(kit.ops.filter(op => !(op.op === "talk" && op.def.id === draft.id)), `${draft.id}'s conversation taken out.`); setDraft(freshDraft(draft.id)); };
  const nodeIds = draft?.nodes.map(n => n.id) ?? [];
  return <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12 }}>
    <datalist id="dev-talk-items">{kit.wares.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</datalist>
    <datalist id="dev-talk-quests">{(kit.catalog?.quests ?? []).map(q => <option key={q.id} value={q.id}>{q.name}</option>)}</datalist>
    <div>
      <SearchList S={S} items={kit.people} chosen={who} placeholder="Find a person…" height={420} label={p => `${talked.has(p.id) ? "💬 " : ""}${p.name}`} onPick={p => setWho(p.id)} />
      <p style={S.muted}>💬: has a conversation in this world. Anyone can have one: the game's own people too (all they say, or one more thing to ask them).</p>
    </div>
    {!draft ? <div style={S.muted}>Choose who's talking.</div> : <div>
      <div style={S.row}>
        <b>{kit.people.find(p => p.id === draft.id)?.name ?? draft.id}</b>
        <button type="button" style={S.btn(draft.mode === "replace")} onClick={() => setDraft({ ...draft, mode: "replace" })}>All they say</button>
        <button type="button" style={S.btn(draft.mode === "add")} onClick={() => setDraft({ ...draft, mode: "add" })}>One more thing to ask</button>
        {draft.mode === "add" && <input style={{ ...S.input, width: 220 }} placeholder="The option's words (Ask about the well.)" value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} />}
      </div>
      <div style={S.row}>
        <button type="button" style={S.btn(true)} onClick={() => save()}>Write it</button>
        <button type="button" style={S.btn()} onClick={() => save(true)}>Write it and try it</button>
        <button type="button" style={S.btn()} disabled={!existing(draft.id)} onClick={remove}>Take it out</button>
        <button type="button" style={S.btn()} onClick={() => addNode()}>+ node</button>
        {draft.id.startsWith("dev_") && <button type="button" style={S.btn()} onClick={() => kit.place("npc", draft.id)}>Place them…</button>}
      </div>
      {problems.map((p, i) => <div key={i} style={{ color: kit.warn }}>{p}</div>)}
      <p style={S.muted}>A node is what they say (one line each; start a line with “&gt; ” for what you say), then your options. Each option goes to another node, or ends the talk. Needs hide an option until they hold; deeds happen when it's chosen (taking items or Frens also needs them). “Once” options go once chosen. Notes are remembered in the player's save, for needs later. Someone with an errand to give offers it first, until it's done.</p>
      {draft.nodes.map((n, i) => <div key={i} style={{ border: `1px solid ${n.id === draft.start ? "#e2c46a" : "#3a3940"}`, borderRadius: 4, padding: 8, margin: "8px 0" }}>
        <div style={S.row}>
          <input style={{ ...S.small, width: 140 }} value={n.id} aria-label="Node name" onChange={e => rename(i, e.target.value.trim())} />
          <button type="button" style={S.btn(n.id === draft.start)} onClick={() => setDraft({ ...draft, start: n.id })}>{n.id === draft.start ? "starts here" : "start here"}</button>
          <span style={{ flex: 1 }} />
          <button type="button" style={S.btn()} disabled={draft.nodes.length < 2} onClick={() => setDraft({ ...draft, nodes: draft.nodes.filter((_, k) => k !== i).map(m => ({ ...m, options: (m.options ?? []).map(o => o.to === n.id ? { ...o, to: "" } : o) })) })}>✕ node</button>
        </div>
        <textarea style={{ ...S.input, minHeight: 60 }} aria-label={`What's said at ${n.id}`} value={n.text} onChange={e => setNode(i, { text: e.target.value })} placeholder={"What they say, a line each.\n> What you say."} />
        <Deeds kit={kit} acts={n.do ?? []} onChange={acts => setNode(i, { do: acts })} what="on arriving" />
        <h4 style={S.h}>Options</h4>
        {(n.options ?? []).map((o, j) => <div key={j} style={{ borderLeft: "2px solid #3a3940", paddingLeft: 8, margin: "4px 0" }}>
          <div style={S.row}>
            <input style={{ ...S.input, width: 240 }} aria-label="Option words" value={o.label} onChange={e => setOption(i, j, { label: e.target.value })} />
            <span style={S.muted}>→</span>
            <select style={{ ...S.small, width: 130 }} aria-label="Goes to" value={o.to} onChange={e => e.target.value === "__new" ? addNode(i, j) : setOption(i, j, { to: e.target.value })}><option value="">(ends)</option>{nodeIds.map(id => <option key={id} value={id}>{id}</option>)}<option value="__new">+ a new node</option></select>
            <label><input type="checkbox" checked={!!o.once} onChange={e => setOption(i, j, { once: e.target.checked || undefined })} /> once</label>
            <button type="button" style={S.btn()} onClick={() => setNode(i, { options: (n.options ?? []).filter((_, k) => k !== j) })}>✕</button>
          </div>
          <Needs kit={kit} needs={o.need ?? []} onChange={need => setOption(i, j, { need })} />
          <Deeds kit={kit} acts={o.do ?? []} onChange={acts => setOption(i, j, { do: acts })} />
        </div>)}
        <button type="button" style={S.btn()} disabled={(n.options ?? []).length >= 10} onClick={() => setNode(i, { options: [...(n.options ?? []), { label: "", to: "" }] })}>+ option</button>
      </div>)}
    </div>}
  </div>;
}
