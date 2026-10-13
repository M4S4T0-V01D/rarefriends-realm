/**
 * The development dashboard's hands inside the game (host/editor.tsx is the dashboard; devlayer.ts lays the overlay).
 * Only a development frame (game.html?dev=1) listens for these, and only from its own parent page (index.tsx).
 *
 * - commands (DEV_COMMAND): teleport, heal, give an item, set a level (one or all), Frens, a quest moved (started,
 *   finished, reset), standing, clear the pack, put down what's near, god mode, walking through anything, the time of
 *   day and the weather;
 * - the game's state, a few times a second (DEV_STATE): where you are, health, the region, the tick, what's near;
 * - a search (DEV_FIND): objects, people, creatures and places by name, with where they are;
 * - the map (DEV_MAP): the whole world one pixel a tile, as the overlay has left it.
 *
 * Anything that changes the player puts the session in the sandbox (devflags.ts): from then on it isn't saved and
 * isn't shown to other players. Building the world (the overlay) doesn't: that changes the map, not the player.
 */
import { ITEM_LIST, MONSTERS, SKILLS, XP_TABLE, isItem, item, type Skill } from "./data.ts";
import { NPCS, QUESTS, completeQuest, finalStage, stage } from "./content.ts";
import { give, maxHp, maxPrayer, message, type Game } from "./state.ts";
import { H, OVERWORLD_H, T, W, cornerHeight, regionAt, type World } from "./world.ts";
import { devFlags } from "./devflags.ts";

export type DevCommand =
  | { cmd: "teleport"; x: number; y: number }
  | { cmd: "heal" }
  | { cmd: "give"; id: string; n: number }
  | { cmd: "level"; skill: string; level: number }
  | { cmd: "levels"; level: number }
  | { cmd: "frens"; n: number }
  | { cmd: "quest"; id: string; to: "start" | "finish" | "reset" }
  | { cmd: "standing"; faction: string; n: number }
  | { cmd: "clear-pack" }
  | { cmd: "clear-near"; r: number }
  | { cmd: "god"; on: boolean }
  | { cmd: "noclip"; on: boolean }
  | { cmd: "time"; hour: number | null }
  | { cmd: "weather"; kind: "clear" | "rain" | "storm" | "fog" | "auto" };

/** What a command changed that the page outside the engine has to know (the time of day, the weather). */
export type DevSideEffect = { time?: number | null; weather?: "clear" | "rain" | "storm" | "fog" | "auto" };
const int = (v: unknown, lo: number, hi: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null;
const sandbox = (game: Game) => { if (!devFlags.sandbox) { devFlags.sandbox = true; message(game, "Development sandbox: this session is no longer saved, and other players don't see you.", "warn"); } };

/** Do a command (checked: anything malformed is ignored). Returns a line for the dashboard's log, and any side effect. */
export function devCommand(game: Game, raw: unknown): { said: string; effect?: DevSideEffect } {
  const c = raw && typeof raw === "object" ? raw as Record<string, unknown> : {}, p = game.player;
  switch (c.cmd) {
    case "teleport": {
      const x = int(c.x, 0, W - 1), y = int(c.y, 0, H - 1); if (x === null || y === null) return { said: "Teleport: where?" };
      p.x = x; p.y = y; p.prev = { x, y }; p.path = []; p.activity = null; return { said: `Teleported to ${x},${y}.` };
    }
    case "heal": { p.hp = maxHp(p); p.prayer = maxPrayer(p); p.energy = 100; p.poison = null; return { said: "Healed: hitpoints, faith and energy full." }; }
    case "give": {
      const id = String(c.id ?? ""), n = int(c.n, 1, 1_000_000) ?? 1; if (!isItem(id)) return { said: `No item called ${id}.` };
      sandbox(game); give(p, id, n); return { said: `Given ${n} × ${item(id).name}.` };
    }
    case "level": {
      const skill = String(c.skill ?? "") as Skill, level = int(c.level, 1, 99); if (!SKILLS.includes(skill) || level === null) return { said: "Level: which skill, what level?" };
      sandbox(game); p.xp[skill] = XP_TABLE[level] ?? 0; if (skill === "hitpoints") p.hp = maxHp(p); if (skill === "prayer") p.prayer = maxPrayer(p);
      return { said: `${skill} set to ${level}.` };
    }
    case "levels": {
      const level = int(c.level, 1, 99); if (level === null) return { said: "Levels: what level?" };
      sandbox(game); for (const skill of SKILLS) p.xp[skill] = XP_TABLE[skill === "hitpoints" ? Math.max(10, level) : level] ?? 0; p.hp = maxHp(p); p.prayer = maxPrayer(p);
      return { said: `Every skill set to ${level}.` };
    }
    case "frens": { const n = int(c.n, 1, 1_000_000_000); if (n === null) return { said: "Frens: how many?" }; sandbox(game); give(p, "coins", n); return { said: `Given ${n.toLocaleString()} Frens.` }; }
    case "quest": {
      const id = String(c.id ?? ""), quest = QUESTS.find(q => q.id === id); if (!quest) return { said: `No quest called ${id}.` };
      sandbox(game);
      if (c.to === "finish") { if (stage(game, id) < finalStage(id)) completeQuest(game, id); return { said: `${quest.name}: finished.` }; }
      if (c.to === "reset") { delete p.quests[id]; return { said: `${quest.name}: reset (its notes in questData are kept).` }; }
      if (!p.quests[id]) p.quests[id] = 1; return { said: `${quest.name}: started.` };
    }
    case "standing": { const faction = String(c.faction ?? ""), n = int(c.n, 0, 1_000_000); if (!faction || n === null) return { said: "Standing: which, how much?" }; sandbox(game); p.standing[faction] = n; return { said: `Standing with ${faction}: ${n}.` }; }
    case "clear-pack": { sandbox(game); p.inventory.fill(null); return { said: "Pack emptied." }; }
    case "clear-near": {
      const r = int(c.r, 1, 60) ?? 12; let n = 0; sandbox(game);
      for (const m of game.monsters) if (!m.dead && m.ally === undefined && Math.max(Math.abs(m.x - p.x), Math.abs(m.y - p.y)) <= r) { m.dead = true; m.respawnAt = game.tick + m.def.respawn; n++; }
      p.combat = null; return { said: `Put down ${n} creature${n === 1 ? "" : "s"} within ${r}.` };
    }
    case "god": { devFlags.god = c.on === true; if (devFlags.god) sandbox(game); return { said: `God mode ${devFlags.god ? "on" : "off"}.` }; }
    case "noclip": { devFlags.noclip = c.on === true; if (devFlags.noclip) sandbox(game); return { said: `Walk through anything: ${devFlags.noclip ? "on" : "off"}.` }; }
    case "time": { const hour = c.hour === null ? null : int(c.hour, 0, 23); return { said: hour === null ? "Time of day: the real clock." : `Time of day: ${hour}:00.`, effect: { time: hour === null ? null : hour / 24 } }; }
    case "weather": { const kind = ["clear", "rain", "storm", "fog", "auto"].includes(String(c.kind)) ? c.kind as DevSideEffect["weather"] : "auto"; return { said: `Weather: ${kind}.`, effect: { weather: kind } }; }
  }
  return { said: "Unknown command." };
}

/** The game as the dashboard shows it. */
export type DevState = {
  x: number; y: number; region: string; tick: number; hp: number; maxHp: number; faith: number; energy: number; combat: number | null; aboard: boolean;
  height: number; tile: number; flags: { god: boolean; noclip: boolean; sandbox: boolean }; near: { monsters: number; npcs: number; objects: number };
  levels: Record<string, number>; quests: Record<string, number>; frens: number; standing: Record<string, number>;
};
export function devState(game: Game): DevState {
  const p = game.player, w = game.world, near = (o: { x: number; y: number }) => Math.max(Math.abs(o.x - p.x), Math.abs(o.y - p.y)) <= 16;
  const levels: Record<string, number> = {}; for (const skill of SKILLS) { const xp = p.xp[skill] ?? 0; let l = 1; while (l < 99 && XP_TABLE[l + 1] <= xp) l++; levels[skill] = l; }
  return {
    x: p.x, y: p.y, region: regionAt(w, p.x, p.y).name, tick: game.tick, hp: p.hp, maxHp: maxHp(p), faith: Math.round(p.prayer), energy: Math.round(p.energy), combat: p.combat, aboard: p.aboard !== null,
    height: Math.round(cornerHeight(w, p.x, p.y) * 10) / 10, tile: w.tiles[p.y * W + p.x], flags: { ...devFlags },
    near: { monsters: game.monsters.filter(m => !m.dead && near(m)).length, npcs: game.npcs.filter(near).length, objects: w.objects.filter(o => o.name !== "__removed" && near(o)).length },
    levels, quests: { ...p.quests }, frens: p.inventory.reduce((s, slot) => s + (slot?.id === "coins" ? slot.n : 0), 0), standing: { ...p.standing },
  };
}

/** A search through the world: things, people, creatures and places whose name (or id) has the words in it. */
export type DevFound = { kind: "object" | "npc" | "monster" | "place" | "building"; name: string; id?: string; x: number; y: number };
export function devFind(game: Game, query: string, limit = 120): DevFound[] {
  const q = query.trim().toLowerCase(); if (q.length < 2) return [];
  const has = (...s: (string | undefined)[]) => s.some(v => v?.toLowerCase().includes(q)), out: DevFound[] = [], w = game.world;
  for (const [id, at] of Object.entries(w.places)) if (has(id)) out.push({ kind: "place", name: id, x: at.x, y: at.y });
  for (const n of game.npcs) { const def = NPCS[n.id]; if (has(def?.name, n.id)) out.push({ kind: "npc", name: def?.name ?? n.id, id: n.id, x: n.x, y: n.y }); }
  for (const m of game.monsters) if (has(m.def.name, m.def.id)) out.push({ kind: "monster", name: `${m.def.name} (${m.def.level})`, id: m.def.id, x: m.x, y: m.y });
  for (const b of w.buildings) if (b.name && has(b.name)) out.push({ kind: "building", name: b.name, x: (b.x0 + b.x1) >> 1, y: (b.y0 + b.y1) >> 1 });
  for (const o of w.objects) if (o.name !== "__removed" && has(o.name, o.clue)) out.push({ kind: "object", name: o.name, id: o.clue, x: o.x, y: o.y });
  return out.slice(0, limit);
}

/** The whole world, a pixel a tile, as it is now (the overlay included): a PNG for the dashboard's map. */
export function devMapImage(world: World, colors: Record<number, readonly [number, number, number]>): string {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!, image = ctx.createImageData(W, H), data = image.data;
  for (let i = 0; i < W * H; i++) {
    const c = colors[world.tiles[i]] ?? [255, 0, 255], k = i * 4;
    // A little relief: higher ground lighter (overworld only).
    const y = Math.floor(i / W), lift = y < OVERWORLD_H ? Math.max(-24, Math.min(36, (cornerHeight(world, i % W, y) - 20) * 0.15)) : 0;
    data[k] = Math.max(0, Math.min(255, c[0] + lift)); data[k + 1] = Math.max(0, Math.min(255, c[1] + lift)); data[k + 2] = Math.max(0, Math.min(255, c[2] + lift)); data[k + 3] = 255;
  }
  for (const o of world.objects) { if (o.name === "__removed") continue; const k = (o.y * W + o.x) * 4; if (o.kind === "tree") { data[k] = 54; data[k + 1] = 92; data[k + 2] = 48; } else if (o.kind !== "decor") { data[k] = 240; data[k + 1] = 200; data[k + 2] = 60; } }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Quests, items and monsters for the dashboard's lists (with the catalogue the game already sends). */
export const devLists = () => ({
  quests: QUESTS.map(q => ({ id: q.id, name: q.name, final: finalStage(q.id) })),
  items: ITEM_LIST.map(i => ({ id: i.id, name: i.name })),
  monsters: Object.values(MONSTERS).map(m => ({ id: m.id, name: m.name, level: m.level })),
  tiles: Object.entries(T).map(([name, id]) => ({ name, id })),
});
