/**
 * The creature designer's fight simulator (the development dashboard asks it through devlayer.ts): a creature fought
 * over and over by a Friend of chosen levels in a chosen metal's gear, with food, on a game of its own (nothing of it
 * touches the real game), the real engine running the fights tick by tick. What comes back: how long a kill takes, how
 * often the Friend falls, how much food goes, the XP, and what dropped, so a creature can be tuned before it's placed.
 */
import { MONSTERS, SKILLS, SPELLS, XP_TABLE, isItem, item, type MonsterDef } from "./data.ts";
import { createGame, give, count, maxHp, type Game, type Monster } from "./state.ts";
import { eat, tick } from "./engine.ts";
import { devFlags } from "./devflags.ts";
import { W, WALKABLE } from "./world.ts";

export type SimOptions = { level: number; metal: string; style: "melee" | "magic"; food: string; foodN: number; fights: number; maxTicks?: number };
export type SimResult = {
  fights: number; kills: number; deaths: number; timeouts: number;
  ticks: { mean: number; min: number; max: number }; seconds: number; foodUsed: number; damageTaken: number; xpPerKill: number;
  drops: { item: string; name: string; times: number; total: number }[]; killsPerHour: number;
};
export const SIM_LIMITS = { fights: 300, ticks: 2000 } as const;
const TICK_SECONDS = 0.6;

/** A Friend for the fights: every skill at `level`, the metal's sword, helm, cuirass, greaves and shield (or a staff for magic), food in the pack. */
function fighter(game: Game, o: SimOptions) {
  const p = game.player;
  // (Every skill at the level: some creatures need a Slayer level, or a skill's perk, to be fought at all.)
  for (const skill of SKILLS) p.xp[skill] = XP_TABLE[Math.max(o.level, skill === "hitpoints" ? 10 : 1)] ?? 0;
  p.hp = maxHp(p); p.inventory.fill(null); p.equipment = {} as typeof p.equipment;
  const piece = (slot: string, id: string) => { if (isItem(id)) (p.equipment as Record<string, string>)[slot] = id; };
  if (o.style === "magic") piece("weapon", "ember_staff");
  else piece("weapon", `${o.metal}_sword`);
  for (const [slot, part] of [["head", "helm"], ["body", "cuirass"], ["legs", "greaves"], ["shield", "shield"], ["hands", "gauntlets"], ["feet", "boots"]] as const) piece(slot, `${o.metal}_${part}`);
  // A caster autocasts the strongest damaging spell its level allows, with sigils enough for any fight.
  p.autocast = null;
  if (o.style === "magic") {
    const spell = SPELLS.filter(s => s.target === "monster" && (s.maxHit ?? 0) > 0 && s.level <= o.level).sort((a, b) => b.level - a.level)[0];
    if (spell) { p.autocast = spell.id; for (const [sigil] of Object.entries(spell.sigils ?? {})) if (isItem(sigil)) give(p, sigil, 1_000_000); }
  }
  if (isItem(o.food)) for (let k = 0; k < o.foodN; k++) give(p, o.food, 1);
}
/** An open tile with an open tile beside it, near the spawn, for the fights. */
function arena(game: Game) {
  const s = game.world.places.spawn, open = (x: number, y: number) => WALKABLE.has(game.world.tiles[y * W + x]) && game.world.objectAt[y * W + x] < 0 && !game.world.buildingAt[y * W + x];
  for (let r = 0; r < 40; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = s.x + dx, y = s.y + dy; if (open(x, y) && open(x + 1, y) && open(x + 2, y)) return { x, y }; }
  return s;
}

export const simulate = (id: string, o: SimOptions): SimResult | null => MONSTERS[id] ? simulateDef(MONSTERS[id], o) : null;
/** The fights against a definition as given (the designer's, not yet applied). */
export function simulateDef(def: MonsterDef, o: SimOptions): SimResult {
  const fights = Math.max(1, Math.min(SIM_LIMITS.fights, Math.floor(o.fights))), maxTicks = Math.min(SIM_LIMITS.ticks, o.maxTicks ?? SIM_LIMITS.ticks);
  // (God mode is the development frame's own: a simulated Friend can fall.)
  const god = devFlags.god; devFlags.god = false;
  const drops = new Map<string, { times: number; total: number }>(), times: number[] = [];
  let kills = 0, deaths = 0, timeouts = 0, foodUsed = 0, damage = 0, xp = 0;
  try {
    const game = createGame({ familyId: 0, friendId: 7730 }), at = arena(game);
    for (let f = 0; f < fights; f++) {
      fighter(game, o);
      const p = game.player; p.x = at.x; p.y = at.y; p.prev = { ...at }; p.path = []; p.target = null;
      const spot = { x: at.x + 1, y: at.y }, uid = game.nextUid++;
      const m: Monster = { uid, def, x: spot.x, y: spot.y, prev: { ...spot }, spawn: { ...spot }, hp: def.hp, heading: { x: -1, y: 0 }, target: true, attackTimer: 0, respawnAt: Number.MAX_SAFE_INTEGER, dead: false, wander: 0, moved: 0, retreat: 0, curses: {} };
      game.monsters = [m]; game.npcs = []; game.ground = []; game.messages = [];
      p.combat = uid; p.lastHitBy = null;
      const xp0 = Object.values(p.xp).reduce((a, b) => a + b, 0), deaths0 = p.deaths, food0 = count(p, o.food);
      let hp = p.hp, t = 0;
      for (; t < maxTicks; t++) {
        // Eat below half health (as a player would), once the last bite has gone down.
        if (p.hp < maxHp(p) / 2 && p.eatTimer <= 0) { const slot = p.inventory.findIndex(s => s?.id === o.food); if (slot >= 0) eat(game, slot); }
        tick(game);
        if (p.hp < hp) damage += hp - p.hp; hp = p.hp;
        if (p.deaths > deaths0) { deaths++; break; }
        if (m.dead) { kills++; times.push(t + 1); break; }
        if (p.combat !== uid && !m.dead) p.combat = uid;
      }
      if (t >= maxTicks) timeouts++;
      foodUsed += food0 - count(p, o.food);
      xp += Object.values(p.xp).reduce((a, b) => a + b, 0) - xp0;
      // (What a kill left: each item once a kill however many heaps it fell in. A fight lost drops nothing of the creature's.)
      if (m.dead) { const seen = new Map<string, number>(); for (const g of game.ground) seen.set(g.id, (seen.get(g.id) ?? 0) + g.n); for (const [id, n] of seen) { const e = drops.get(id) ?? { times: 0, total: 0 }; e.times++; e.total += n; drops.set(id, e); } }
    }
  } finally { devFlags.god = god; }
  const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  return {
    fights, kills, deaths, timeouts, ticks: { mean: Math.round(mean * 10) / 10, min: times.length ? Math.min(...times) : 0, max: times.length ? Math.max(...times) : 0 },
    seconds: Math.round(mean * TICK_SECONDS * 10) / 10, foodUsed, damageTaken: damage, xpPerKill: kills ? Math.round(xp / kills) : 0,
    // (One spawn: a kill, then its respawn, round and round.)
    killsPerHour: mean ? Math.round(3600 / ((mean + def.respawn) * TICK_SECONDS)) : 0,
    drops: [...drops].map(([id, e]) => ({ item: id, name: isItem(id) ? item(id).name : id, times: e.times, total: e.total })).sort((a, b) => b.times - a.times),
  };
}
