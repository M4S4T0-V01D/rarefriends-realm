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
import { devApi, type Revision } from "./dev.ts";

const WORLD = "main";
type Tool = "inspect" | "tile" | "fill" | "lift" | "remove" | "place" | "building" | "spawn" | "erase" | "teleport";
const TOOLS: [Tool, string][] = [["inspect", "Inspect"], ["tile", "Paint tile"], ["fill", "Fill rect"], ["lift", "Raise ground"], ["place", "Place thing"], ["building", "Building"], ["spawn", "Spawn"], ["remove", "Remove thing"], ["erase", "Erase my op"], ["teleport", "Teleport"]];
const uid = () => `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const frames = () => [...document.querySelectorAll("iframe")].flatMap(frame => frame.contentWindow ? [frame.contentWindow] : []);
const send = (message: unknown) => frames().forEach(frame => frame.postMessage(message, "*"));
const when = (at: number | null) => at ? new Date(at).toLocaleString() : "";

function Editor() {
  const [overlay, setOverlay] = useState<Overlay>({ v: 1, name: "Development world", ops: [] });
  const [version, setVersion] = useState(0), [dirty, setDirty] = useState(false), [status, setStatus] = useState("Loading the development world…");
  const [edit, setEdit] = useState(false), [tool, setTool] = useState<Tool>("inspect"), [catalog, setCatalog] = useState<DevCatalog | null>(null);
  const [pickInfo, setPick] = useState<DevPick | null>(null), [report, setReport] = useState<{ problems: string[]; unreachable: string[]; ops: number } | null>(null);
  const [revisions, setRevisions] = useState<Revision[] | null>(null), [open, setOpen] = useState<"tools" | "world" | "history">("tools");
  // Tool settings.
  const [tile, setTile] = useState(1), [brush, setBrush] = useState(1), [lift, setLift] = useState(1), [kind, setKind] = useState("decor"), [sub, setSub] = useState("bush"), [name, setName] = useState("");
  const [door, setDoor] = useState<"n" | "s" | "e" | "w">("s"), [floor, setFloor] = useState(11), [walls, setWalls] = useState("timber"), [spawnKind, setSpawnKind] = useState<"npc" | "monster">("npc"), [spawnId, setSpawnId] = useState(""), [wander, setWander] = useState(3);
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
    devApi.load(WORLD).then(loaded => { setOverlay(loaded.overlay); setVersion(loaded.version); setStatus(`Loaded v${loaded.version} (${loaded.overlay.ops.length} ops${loaded.updatedAt ? `, saved ${when(loaded.updatedAt)}` : ""}).`); send({ type: DEV_WORLD, overlay: loaded.overlay }); }).catch(error => setStatus(`Couldn't load: ${(error as Error).message}`));
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
  }, [edit, tool, tile, brush, lift, kind, sub, name, door, floor, walls, spawnKind, spawnId, wander, dirty]);

  const toggleEdit = () => { setEdit(value => { send({ type: DEV_MODE, edit: !value }); return !value; }); corner.current = null; };
  /** A click in the game, in edit mode: the tool's operation. The right button inspects whatever the tool. */
  const onPick = (p: DevPick, button: number, shift: boolean) => {
    setPick(p);
    if (button === 2 || tool === "inspect") return;
    const ops = [...current.current.ops], at = (x: number, y: number) => (op: Op) => "x" in op && op.x === x && op.y === y;
    const paint = (x: number, y: number, t: number) => { const i = ops.findIndex(op => op.op === "tile" && op.x === x && op.y === y); if (i >= 0) ops.splice(i, 1); ops.push({ op: "tile", x, y, t }); };
    if (tool === "tile") { const r = brush - 1; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) paint(p.x + dx, p.y + dy, tile); push(ops, `Painted ${brush * brush === 1 ? "a tile" : `${(2 * r + 1) ** 2} tiles`} at ${p.x},${p.y}.`); }
    else if (tool === "fill" || tool === "building") {
      if (!corner.current) { corner.current = { x: p.x, y: p.y }; setStatus(`First corner ${p.x},${p.y}: click the other corner.`); return; }
      const a = corner.current; corner.current = null;
      if (tool === "fill") { ops.push({ op: "fill", x0: a.x, y0: a.y, x1: p.x, y1: p.y, t: tile }); push(ops, `Filled ${a.x},${a.y} to ${p.x},${p.y}.`); }
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
    else if (tool === "erase") { const before = ops.length, kept = ops.filter(op => !(at(p.x, p.y)(op) || (op.op === "fill" && p.x >= Math.min(op.x0, op.x1) && p.x <= Math.max(op.x0, op.x1) && p.y >= Math.min(op.y0, op.y1) && p.y <= Math.max(op.y0, op.y1)) || (op.op === "building" && p.x >= Math.min(op.x0, op.x1) && p.x <= Math.max(op.x0, op.x1) && p.y >= Math.min(op.y0, op.y1) && p.y <= Math.max(op.y0, op.y1)))); if (kept.length !== before) push(kept, `Erased ${before - kept.length} of my ops at ${p.x},${p.y}.`); else setStatus("None of my ops there."); }
    else if (tool === "teleport") send({ type: DEV_TELEPORT, x: p.x, y: p.y });
  };
  const save = async (note?: string) => {
    try { const result = await devApi.save(WORLD, version, current.current, note); setVersion(result.version); setDirty(false); setStatus(`Saved v${result.version} at ${when(result.updatedAt)}.`); }
    catch (error) { setStatus(`Not saved: ${(error as Error).message}`); }
  };
  const loadRevisions = () => devApi.revisions(WORLD).then(r => setRevisions(r.revisions)).catch(error => setStatus(`Couldn't list revisions: ${(error as Error).message}`));
  const take = (loaded: { version: number; overlay: Overlay }, what: string) => { past.current = []; future.current = []; setOverlay(loaded.overlay); setVersion(loaded.version); setDirty(false); send({ type: DEV_WORLD, overlay: loaded.overlay }); setStatus(`${what}: now v${loaded.version}.`); void loadRevisions(); };
  const importFile = (file: File) => { void file.text().then(text => { const raw = JSON.parse(text) as Overlay; if (raw?.v !== 1 || !Array.isArray(raw.ops)) throw new Error("not an overlay"); push(raw.ops, `Imported ${file.name} (${raw.ops.length} ops); save to keep it.`); }).catch(error => setStatus(`Couldn't import: ${(error as Error).message}`)); };
  const subs = kind === "decor" ? catalog?.decor : kind === "tree" ? catalog?.trees : kind === "rock" ? catalog?.rocks : kind === "spot" ? catalog?.spots : null;
  const people = spawnKind === "npc" ? catalog?.npcs ?? [] : (catalog?.monsters ?? []).map(m => ({ id: m.id, name: `${m.name} (${m.level})` }));
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
      <div style={S.row}>{(["tools", "world", "history"] as const).map(tab => <button key={tab} type="button" style={S.btn(open === tab)} onClick={() => { setOpen(tab); if (tab === "history") void loadRevisions(); }}>{tab}</button>)}</div>
      {open === "tools" && <>
        <div style={S.row}>{TOOLS.map(([id, label]) => <button key={id} type="button" style={S.btn(tool === id)} onClick={() => { setTool(id); corner.current = null; }}>{label}</button>)}</div>
        {(tool === "tile" || tool === "fill") && <><h4 style={S.h}>Tile</h4><select style={S.input} value={tile} onChange={e => setTile(Number(e.target.value))}>{Object.entries(catalog?.tiles ?? {}).map(([n, v]) => <option key={n} value={v}>{n.toLowerCase()}</option>)}</select></>}
        {(tool === "tile" || tool === "lift") && <><h4 style={S.h}>Brush</h4><div style={S.row}>{[1, 2, 3, 4].map(b => <button key={b} type="button" style={S.btn(brush === b)} onClick={() => setBrush(b)}>{2 * b - 1}×{2 * b - 1}</button>)}</div></>}
        {tool === "lift" && <><h4 style={S.h}>Raise to (shift-click flattens)</h4><input style={S.input} type="number" min={0} max={8} step={0.25} value={lift} onChange={e => setLift(Number(e.target.value))} /></>}
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
          <select style={S.input} value={spawnId} onChange={e => setSpawnId(e.target.value)}><option value="">—</option>{people.map(p => <option key={p.id} value={p.id}>{p.name} · {p.id}</option>)}</select>
          <h4 style={S.h}>Wander (tiles)</h4><input style={S.input} type="number" min={0} max={40} value={wander} onChange={e => setWander(Number(e.target.value))} />
        </>}
        <h4 style={S.h}>Under the pointer</h4>
        {pickInfo ? <div style={S.muted}>{pickInfo.x},{pickInfo.y} · {pickInfo.region} · tile {Object.entries(catalog?.tiles ?? {}).find(([, v]) => v === pickInfo.tile)?.[0].toLowerCase() ?? pickInfo.tile} · lift {pickInfo.lift.toFixed(2)}{pickInfo.object ? ` · ${pickInfo.object.kind}: ${pickInfo.object.name}${pickInfo.object.uid ? " (mine)" : ""}` : ""}{pickInfo.building ? ` · building: ${pickInfo.building.name || "unnamed"}` : ""}</div> : <div style={S.muted}>Click in the game (edit mode). Right-click inspects with any tool.</div>}
        {report && <><h4 style={S.h}>Report</h4><div style={S.muted}>{report.ops} ops applied.</div>{report.problems.map((p, i) => <div key={`p${i}`} style={{ color: "#f0a050" }}>{p}</div>)}{report.unreachable.map((p, i) => <div key={`u${i}`} style={{ color: "#f0a050" }}>⚠ {p}</div>)}</>}
      </>}
      {open === "world" && <>
        <h4 style={S.h}>Name</h4><input style={S.input} value={overlay.name ?? ""} onChange={e => { const next = { ...current.current, name: e.target.value }; setOverlay(next); setDirty(true); }} />
        <div style={S.row}>
          <a style={S.btn()} href={devApi.exportUrl(WORLD)} download>Export (JSON)</a>
          <label style={S.btn()}>Import… <input type="file" accept="application/json" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} /></label>
          <button type="button" style={S.btn()} onClick={() => { if (confirm("Back to the baseline: an empty overlay? The current one is kept as a revision.")) devApi.reset(WORLD).then(r => take(r, "Reset")).catch(error => setStatus(`Couldn't reset: ${(error as Error).message}`)); }}>Reset to baseline…</button>
        </div>
        <p style={S.muted}>To publish: export, commit the file under games/rarefriends-realm/overlays/ and list it in overlays/index.ts; the change is reviewed and reverted like any other. Nothing reaches players any other way.</p>
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
