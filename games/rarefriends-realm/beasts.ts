/**
 * Beastkeeping (A Place to the North, Part III): bonding with creatures, keeping them, and working beside them.
 *
 * Not a catching game: each species is won its own way. A young ember salamander is fed inkcoal, visit by visit, until
 * it trusts you; a Vargskeld hound is a pup the houndmaster gives a keeper she trusts; a highland goat takes a halter; a
 * boar or a crag bear is beaten to its knees and spared; a snared wolf is freed and its wounds treated; a great stag
 * only comes to someone who's learnt its ways (Pursuance); a foxfire vixen to someone who knows the old rites
 * (Mysteries). Bosses, people and the like are never anyone's.
 *
 * A companion out is a real creature in the world (a Monster with `ally`): it follows you, and when you fight it fights
 * the same thing with the same rolls any creature uses (engine.ts strike); what it attacks turns on it, and what's at
 * you may turn on it instead. Its health is its own, and it heals when fed. A skittish one runs at low health and goes
 * home frightened (a beastkeeper settles it, for a fee); a steady one holds fast to the end only when it's bonded deep
 * and you've told it to; a fierce one never runs. One that falls is gone: it leaves a keepsake, and no one brings it
 * back. Pack animals carry, stags ease the road, a vixen finds herbs. Kept at the beastkeepers, carried by vessels with
 * room for them, through saves and logouts.
 */
import { MONSTERS, item, type MonsterDef } from "./data.ts";
import { addXp, count, dropItem, give, has, level, message, sound, take, type Game, type Monster, type Player, type Slot } from "./state.ts";
import { W, H, isUnderground, realPoint, walkable } from "./world.ts";
import { knows } from "./pursuance.ts";

export type SpeciesId = "salamander" | "hound" | "goat" | "boar" | "wolf" | "stag" | "vixen" | "bear";
export type Role = "combat" | "pack" | "travel" | "gathering";
/** How it takes danger: runs early, holds to a point (to the end when bonded deep and told), or never runs. */
export type Temper = "skittish" | "steady" | "fierce";
export type Bonding = "feeding" | "pup" | "halter" | "spare" | "rescue" | "lore" | "rite";
export type SpeciesDef = {
  id: SpeciesId; name: string; level: number; role: Role; temper: Temper; bonding: Bonding;
  /** The creature it's drawn as and fights as (its stats, scaled), and the wild ones it's won from. */
  base: string; wild: readonly string[];
  /** What it eats (feeding heals it, and builds the bond). */
  diet: readonly string[];
  /** How much room it takes aboard: a skiff carries a small one; a barge or a longship two of any size. */
  small: boolean;
  /** How it's won, said plainly. */
  how: string; examine: string;
};
export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  salamander: { id: "salamander", name: "Ember salamander", level: 1, role: "combat", temper: "skittish", bonding: "feeding", base: "ember_salamander_young", wild: ["ember_salamander_young"], diet: ["inkcoal"], small: true,
    how: "Feed a young one inkcoal, visit after visit, until it trusts you.", examine: "A young ember salamander, warm as a hearthstone. It follows you, and it bites what you fight." },
  hound: { id: "hound", name: "Vargskeld hound", level: 10, role: "combat", temper: "steady", bonding: "pup", base: "wolf", wild: [], diet: ["cooked_meat", "raw_beef", "raw_chicken"], small: true,
    how: "Halla the houndmaster in Skarnholm gives a pup to a keeper she trusts: bring her five cooked meat.", examine: "A grey Vargskeld hound, rough-coated and broad in the chest. It goes where you go and stands where you stand." },
  goat: { id: "goat", name: "Highland goat", level: 15, role: "pack", temper: "skittish", bonding: "halter", base: "highland_goat", wild: ["highland_goat"], diet: ["bread", "wheat"], small: false,
    how: "Put a goat halter on a highland goat (the beastkeepers sell them).", examine: "A highland goat in a halter, panniers on its back. It carries what you load on it." },
  boar: { id: "boar", name: "Boar", level: 20, role: "combat", temper: "fierce", bonding: "spare", base: "boar", wild: ["boar", "mountain_boar"], diet: ["bread", "wheat", "raw_beef"], small: false,
    how: "Beat a boar to its knees and spare it: it respects that.", examine: "A boar that decided you were worth following. It never runs." },
  wolf: { id: "wolf", name: "Wolf", level: 30, role: "combat", temper: "steady", bonding: "rescue", base: "wolf", wild: ["snared_wolf"], diet: ["raw_beef", "raw_chicken", "cooked_meat"], small: false,
    how: "Free a wolf from a hunter's snare and treat it with a healing tonic.", examine: "A wolf you freed from a snare. It remembers, and it fights for you." },
  stag: { id: "stag", name: "Great stag", level: 40, role: "travel", temper: "skittish", bonding: "lore", base: "greatstag", wild: ["greatstag"], diet: ["bread", "wheat"], small: false,
    how: "Know the great stag's habitat and its temper (Pursuance), then feed one bread.", examine: "A great stag that walks with you. The road goes easier beside it: running tires you less." },
  vixen: { id: "vixen", name: "Foxfire vixen", level: 45, role: "gathering", temper: "skittish", bonding: "rite", base: "foxfire_vixen", wild: ["foxfire_vixen"], diet: ["raw_chicken", "cooked_meat"], small: true,
    how: "With Mysteries 30, offer a foxfire vixen raw chicken: she knows who knows the old rites.", examine: "A foxfire vixen, her tail lit at the tip. Where you pick herbs she finds another now and then." },
  bear: { id: "bear", name: "Crag bear", level: 55, role: "combat", temper: "steady", bonding: "spare", base: "crag_bear", wild: ["crag_bear"], diet: ["raw_beef", "cooked_meat", "bread"], small: false,
    how: "Beat a crag bear to its knees and spare it.", examine: "A crag bear that chose to follow you. Heavy, patient, and very hard to stop." },
};
export const SPECIES_IDS = Object.keys(SPECIES) as SpeciesId[];
export type CompanionState = "out" | "kennel" | "aboard" | "fled";
export type Companion = { id: number; species: SpeciesId; name: string; bond: number; hp: number; state: CompanionState;
  /** Told to hold fast (fight to the end), or to hold back (not fight at all). */ order: "fight" | "hold-back"; fast: boolean;
  /** A pack animal's panniers. */ pack: (Slot | null)[]; fledAt?: number; fedAt?: number };
export const KEEP = {
  /** Companions kept at once (out and kenneled); one out at a time. */ most: 3,
  /** Feeding a wild one: trust it takes, and the gap between feeds (ticks). */ trustNeeded: 3, trustGap: 50,
  /** A creature is spared below this share of its health. */ spareBelow: 0.25,
  /** A skittish one runs below this share; a steady one below this (unless holding fast). */ skittishAt: 0.4, steadyAt: 0.2,
  /** Settling a fled one at a beastkeeper: the fee by its level, and how long it must have been home first (ticks). */ settleFee: 60, settleAfter: 200,
  /** A pack animal's panniers. */ pack: 8,
  /** A turned creature hits your companion instead of you this often, when it stands beside both. */ drawsFire: 0.35,
  /** Bond: by feeding (once in a while), by a kill shared. */ bondFeed: 5, bondKill: 1, feedGap: 100,
  /** Ally uids sit above every other creature's. */ uidBase: 9_000_000,
} as const;
/** The beastkeepers: they keep what you don't have out, settle a frightened one, and sell feed and halters. */
export const BEASTKEEPERS = ["beastkeeper_bramble", "houndmaster_halla", "beastward_mstislav"] as const;

// ---------- The companion's own numbers ----------
const defCache = new Map<string, MonsterDef>();
/** A companion's creature: its base species' numbers, and up to a quarter more with a deep bond. */
export function companionDef(c: Companion): MonsterDef {
  const sp = SPECIES[c.species], base = MONSTERS[sp.base], key = `${c.id}:${c.species}:${c.name}:${Math.floor(c.bond / 25)}`, kept = defCache.get(key);
  if (kept) return kept;
  const k = 1 + Math.floor(c.bond / 25) * 0.0625;
  const def: MonsterDef = { ...base, id: `companion_${c.species}`, name: c.name, hp: Math.round(base.hp * k), attack: Math.round(base.attack * k), strength: Math.round(base.strength * k), defence: Math.round(base.defence * k),
    aggressive: false, boss: false, worldBoss: false, drops: [], always: [], respawn: 1e9 } as MonsterDef;
  defCache.set(key, def);
  return def;
}
export const companionOut = (player: Player) => player.companions.find(c => c.state === "out") ?? null;
export const allyOf = (game: Game) => { const c = companionOut(game.player); return c ? game.monsters.find(m => m.ally === c.id && !m.dead) ?? null : null; };
/** Whether a wild creature is one a keeper can ever bond with (never a boss, a person, a spirit of the dead, a soldier). */
export const speciesOfWild = (monster: Monster): SpeciesDef | null => monster.ally !== undefined || monster.def.boss || monster.def.worldBoss || monster.twinOf !== undefined || monster.arena
  ? null : SPECIES_IDS.map(id => SPECIES[id]).find(sp => sp.wild.includes(monster.def.id)) ?? null;

// ---------- Out in the world ----------
const freeBeside = (game: Game, x: number, y: number): { x: number; y: number } | null => {
  for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = x + dx, ny = y + dy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (walkable(game.world, nx, ny) && game.world.objectAt[ny * W + nx] < 0 && !game.monsters.some(m => !m.dead && m.x === nx && m.y === ny)) return { x: nx, y: ny };
  }
  return null;
};
/** Bring the companion that's out into the world beside you (after a load, a rebuild, a teleport, landing). */
export function placeCompanion(game: Game): Monster | null {
  const player = game.player, c = companionOut(player);
  game.monsters = game.monsters.filter(m => m.ally === undefined || (c && m.ally === c.id));
  if (!c) return null;
  if (player.aboard !== null) return null;
  const at = freeBeside(game, player.x, player.y);
  if (!at) return null;
  let m = game.monsters.find(x => x.ally === c.id);
  const def = companionDef(c);
  if (!m) { m = { uid: KEEP.uidBase + c.id, def, x: at.x, y: at.y, prev: { ...at }, spawn: { ...at }, hp: Math.max(1, Math.min(def.hp, c.hp)), heading: { x: 1, y: 1 }, target: false, attackTimer: 2, respawnAt: 0, dead: false, wander: 0, moved: 0, retreat: 0, curses: {}, foe: null, ally: c.id, bornAt: game.tick }; game.monsters.push(m); }
  else { m.def = def; m.x = at.x; m.y = at.y; m.prev = { ...at }; m.dead = false; m.foe = null; }
  return m;
}
type Engine = { strike: (game: Game, a: Monster, b: Monster) => void; step: (game: Game, m: Monster, to: { x: number; y: number }) => void };
/** A companion's turn: fight what you fight (unless held back), keep close otherwise, follow you anywhere you go. */
export function companionTick(game: Game, m: Monster, engine: Engine) {
  const player = game.player, c = player.companions.find(x => x.id === m.ally);
  if (!c || c.state !== "out" || player.aboard !== null) { m.dead = true; return; }
  c.hp = m.hp;
  if (m.attackTimer > 0) m.attackTimer--;
  const sameLayer = isUnderground(m.y) === isUnderground(player.y) && realPoint(game.world, m.x, m.y).level === realPoint(game.world, player.x, player.y).level;
  const far = Math.max(Math.abs(m.x - player.x), Math.abs(m.y - player.y));
  if (!sameLayer || far > 12) { const at = freeBeside(game, player.x, player.y); if (at) { m.x = at.x; m.y = at.y; m.prev = { ...at }; m.foe = null; } return; }
  // Hurt enough to run (skittish early, steady later, never if fierce or told to hold fast and bonded deep).
  const share = m.hp / m.def.hp, sp = SPECIES[c.species];
  const runsAt = sp.temper === "fierce" || (sp.temper === "steady" && c.fast && c.bond >= 80) ? 0 : sp.temper === "skittish" ? KEEP.skittishAt : KEEP.steadyAt;
  if (m.foe != null && share < runsAt) { flee(game, m, c); return; }
  // Fighting: what you're fighting, or what turned on it.
  const yours = player.combat !== null ? game.monsters.find(x => x.uid === player.combat && !x.dead) ?? null : null;
  let foe = m.foe != null ? game.monsters.find(x => x.uid === m.foe && !x.dead) ?? null : null;
  if (c.order === "fight" && sp.role === "combat" && yours && yours.ally === undefined) foe = yours;
  if (foe && Math.max(Math.abs(foe.x - player.x), Math.abs(foe.y - player.y)) > 10) foe = null;
  m.foe = foe ? foe.uid : null;
  if (foe) {
    if (foe === yours) foe.mine = true;   // fighting it together: it's yours whoever lands the last blow
    if (Math.max(Math.abs(foe.x - m.x), Math.abs(foe.y - m.y)) <= 1) {
      if (m.attackTimer <= 0) {
        const before = foe.hp; engine.strike(game, m, foe);
        const dealt = Math.max(0, before - (foe.dead ? 0 : foe.hp));
        if (dealt > 0) addXp(game, "beastkeeping", dealt * 2, { raw: true });
        if (foe.dead || foe.hp <= 0) { c.bond = Math.min(100, c.bond + KEEP.bondKill); m.foe = null; }
      }
    } else engine.step(game, m, foe);
    return;
  }
  // Otherwise keep close.
  if (far > 2) engine.step(game, m, player);
}
/** It ran: home to the beastkeeper, frightened, until one settles it. */
function flee(game: Game, m: Monster, c: Companion) {
  c.state = "fled"; c.fledAt = game.tick; c.hp = Math.max(1, m.hp); m.dead = true; m.foe = null;
  for (const x of game.monsters) if (x.foe === m.uid) x.foe = null;
  message(game, `${c.name} breaks and runs for home. A beastkeeper can settle it.`, "warn"); sound(game, "click");
}
/** It fell (engine.ts strike, when its health is gone): gone for good, a keepsake left. */
export function companionFell(game: Game, m: Monster) {
  const player = game.player, c = player.companions.find(x => x.id === m.ally);
  m.dead = true; m.foe = null; m.hp = 0;
  for (const x of game.monsters) if (x.foe === m.uid) x.foe = null;
  if (!c) return;
  player.companions = player.companions.filter(x => x !== c);
  player.stats.companionsLost = (player.stats.companionsLost ?? 0) + 1;
  if (give(player, "companion_keepsake", 1)) dropItem(game, "companion_keepsake", 1, m.x, m.y, 6000);
  // What it carried falls where it fell.
  for (const slot of c.pack) if (slot) dropItem(game, slot.id, slot.n, m.x, m.y, 6000);
  message(game, `${c.name} has fallen. You keep something to remember it by.`, "quest"); sound(game, "death");
}
/** Should a creature at you turn on your companion instead (it's beside both, and it's fighting)? */
export function drawsFire(game: Game, monster: Monster): Monster | null {
  const m = allyOf(game), c = companionOut(game.player);
  if (!m || !c || c.order !== "fight" || SPECIES[c.species].role !== "combat") return null;
  if (Math.max(Math.abs(m.x - monster.x), Math.abs(m.y - monster.y)) > 1) return null;
  return game.rng() < KEEP.drawsFire ? m : null;
}

// ---------- Winning one ----------
const bondWith = (game: Game, sp: SpeciesDef): Companion | null => {
  const player = game.player;
  if (player.companions.length >= KEEP.most) { message(game, `You keep ${KEEP.most} companions at most: leave one with a beastkeeper for good first.`, "warn"); return null; }
  const id = Math.max(0, ...player.companions.map(c => c.id), player.companionSeq ?? 0) + 1; player.companionSeq = id;
  const out = companionOut(player);
  const c: Companion = { id, species: sp.id, name: sp.name, bond: 10, hp: MONSTERS[sp.base].hp, state: out ? "kennel" : "out", order: "fight", fast: false, pack: sp.role === "pack" ? Array(KEEP.pack).fill(null) : [] };
  player.companions.push(c); delete player.trust[sp.id];
  if (!has(player, "companion_whistle")) give(player, "companion_whistle", 1);
  addXp(game, "beastkeeping", 60 + sp.level * 12, { raw: true }); sound(game, "quest");
  message(game, out ? `The ${lowerName(sp)} is yours. It waits at the beastkeepers while ${out.name} is out.` : `The ${lowerName(sp)} is yours, and it follows you now.`, "quest");
  return c;
};
/** A species' name mid-sentence: the proper names keep their capital ("a Vargskeld hound", "an ember salamander"). */
export const lowerName = (sp: SpeciesDef) => sp.id === "hound" ? "Vargskeld hound" : sp.name.toLowerCase();
const levelProblem = (game: Game, sp: SpeciesDef) => level(game, "beastkeeping") < sp.level ? `You need a Beastkeeping level of ${sp.level} to bond with ${/^[aeiou]/i.test(sp.name) ? "an" : "a"} ${lowerName(sp)}.` : null;
/** Using something on a creature: feeding your companion, or the way a wild one is won. Returns false when it's nothing to do with Beastkeeping. */
export function useOnCreature(game: Game, monster: Monster, slotIndex: number): boolean {
  const player = game.player, slot = player.inventory[slotIndex];
  if (!slot) return false;
  // Your own: food heals it and builds the bond.
  if (monster.ally !== undefined) {
    const c = player.companions.find(x => x.id === monster.ally); if (!c) return false;
    const sp = SPECIES[c.species];
    if (sp.role === "pack" && !sp.diet.includes(slot.id)) return loadPack(game, c, slotIndex);
    if (!sp.diet.includes(slot.id)) { message(game, `${c.name} won't eat that.`, "warn"); return true; }
    take(player, slot.id, 1); monster.hp = Math.min(monster.def.hp, monster.hp + Math.max(4, Math.round(monster.def.hp / 4))); c.hp = monster.hp;
    if (game.tick - (c.fedAt ?? -1e9) >= KEEP.feedGap) { c.bond = Math.min(100, c.bond + KEEP.bondFeed); c.fedAt = game.tick; addXp(game, "beastkeeping", 15, { raw: true }); }
    message(game, `${c.name} eats it.`); sound(game, "eat");
    return true;
  }
  const sp = speciesOfWild(monster);
  if (!sp) return false;
  const why = levelProblem(game, sp);
  if (sp.bonding === "feeding" && sp.diet.includes(slot.id)) {
    if (why) { message(game, why, "warn"); return true; }
    const t = player.trust[sp.id] ?? { n: 0, at: -1e9 };
    if (game.tick - t.at < KEEP.trustGap) { message(game, `It watches you. Not again so soon: come back in a while.`, "warn"); return true; }
    take(player, slot.id, 1); t.n++; t.at = game.tick; player.trust[sp.id] = t; addXp(game, "beastkeeping", 20, { raw: true });
    if (t.n >= KEEP.trustNeeded) { monster.dead = true; monster.respawnAt = game.tick + monster.def.respawn; bondWith(game, sp); }
    else message(game, `It takes the ${item(slot.id).name.toLowerCase()} from your hand and doesn't back away. (Trust ${t.n}/${KEEP.trustNeeded}.)`);
    return true;
  }
  if (sp.bonding === "halter" && slot.id === "goat_halter") {
    if (why) { message(game, why, "warn"); return true; }
    take(player, "goat_halter", 1); monster.dead = true; monster.respawnAt = game.tick + monster.def.respawn; bondWith(game, sp); return true;
  }
  if (sp.bonding === "lore" && sp.diet.includes(slot.id)) {
    if (why) { message(game, why, "warn"); return true; }
    if (!knows(game, sp.base, "habitat") || !knows(game, sp.base, "temper")) { message(game, "It lifts its head and is gone before you're close. You don't know its ways well enough yet (Pursuance: its habitat and its temper).", "warn"); return true; }
    take(player, slot.id, 1); monster.dead = true; monster.respawnAt = game.tick + monster.def.respawn; bondWith(game, sp); return true;
  }
  if (sp.bonding === "rite" && sp.diet.includes(slot.id)) {
    if (why) { message(game, why, "warn"); return true; }
    if (level(game, "mysteries") < 30) { message(game, "She looks at you a long moment, and goes. (Mysteries 30: she knows who knows the old rites.)", "warn"); return true; }
    take(player, slot.id, 1); monster.dead = true; monster.respawnAt = game.tick + monster.def.respawn; bondWith(game, sp); return true;
  }
  if (sp.bonding === "rescue" && slot.id === "healing_tonic") return freeSnared(game, monster);
  message(game, sp.how, "info");
  return true;
}
/** Spare a creature you've beaten to its knees (a boar, a crag bear): it follows you. */
export const canSpare = (game: Game, monster: Monster) => { const sp = speciesOfWild(monster); return !!sp && sp.bonding === "spare" && !monster.dead && monster.hp <= monster.def.hp * KEEP.spareBelow; };
export function spare(game: Game, monster: Monster): boolean {
  const sp = speciesOfWild(monster);
  if (!sp || !canSpare(game, monster)) return false;
  const why = levelProblem(game, sp); if (why) { message(game, why, "warn"); return false; }
  if (game.player.combat === monster.uid) game.player.combat = null;
  monster.dead = true; monster.target = false; monster.foe = null; monster.respawnAt = game.tick + monster.def.respawn;
  return !!bondWith(game, sp);
}
/** Free a snared wolf: a healing tonic for its leg, and it's yours. */
export function freeSnared(game: Game, monster: Monster): boolean {
  const sp = speciesOfWild(monster);
  if (!sp || sp.bonding !== "rescue") return false;
  const why = levelProblem(game, sp); if (why) { message(game, why, "warn"); return false; }
  if (!take(game.player, "healing_tonic", 1)) { message(game, "Its leg's torn by the snare: you'll want a healing tonic before you free it.", "warn"); return false; }
  monster.dead = true; monster.respawnAt = game.tick + monster.def.respawn;
  message(game, "You work the snare loose and dress the leg with the tonic. It doesn't bite.");
  return !!bondWith(game, sp);
}

// ---------- Orders, the whistle, the panniers ----------
type MenuEntry = { verb: string; noun: string; tone: "monster"; run: (game: Game) => void };
/** Right-clicking your companion: food from the pack (if you're using an item on it), its orders, the panniers, home. */
export function companionMenu(game: Game, m: Monster, using: number | null): MenuEntry[] {
  const c = game.player.companions.find(x => x.id === m.ally); if (!c) return [];
  const sp = SPECIES[c.species], noun = c.name, out: MenuEntry[] = [];
  if (using !== null && using >= 0) return [{ verb: `Use ${item(game.player.inventory[using]?.id ?? "coins").name} ->`, noun, tone: "monster", run: g => { useOnCreature(g, m, using); } }];
  if (sp.role === "combat") out.push(c.order === "fight" ? { verb: "Hold-back", noun, tone: "monster", run: g => setOrder(g, c, { order: "hold-back" }) } : { verb: "Fight-beside-me", noun, tone: "monster", run: g => setOrder(g, c, { order: "fight" }) });
  if (sp.temper === "steady") out.push(c.fast ? { verb: "Ease-off", noun, tone: "monster", run: g => setOrder(g, c, { fast: false }) } : { verb: "Hold-fast", noun, tone: "monster", run: g => setOrder(g, c, { fast: true }) });
  if (sp.role === "pack") out.push({ verb: "Unload", noun, tone: "monster", run: g => { unloadPack(g, c); } });
  out.push({ verb: "Send-home", noun, tone: "monster", run: g => { sendHome(g); } });
  out.push({ verb: "Examine", noun, tone: "monster", run: g => message(g, `${sp.examine} Bond ${c.bond}/100. Health ${m.hp}/${m.def.hp}.${sp.temper === "fierce" ? " It never runs." : c.fast ? " It holds fast: if it falls, it's gone." : ""}`) });
  return out;
}
export function setOrder(game: Game, c: Companion, change: Partial<Pick<Companion, "order" | "fast">>) {
  if (change.order) c.order = change.order;
  if (change.fast !== undefined) {
    if (change.fast && SPECIES[c.species].temper === "steady" && c.bond < 80) { message(game, `${c.name} won't hold fast for you yet: it needs a deeper bond (80).`, "warn"); return; }
    c.fast = change.fast;
    if (c.fast) message(game, `${c.name} will hold fast now, to the end if it comes to that. If it falls, it's gone.`, "warn");
  }
  message(game, c.order === "hold-back" ? `${c.name} keeps out of your fights.` : `${c.name} fights beside you.`);
}
/** Send the companion that's out home to the beastkeepers (it's safe there). */
export function sendHome(game: Game): boolean {
  const c = companionOut(game.player);
  if (!c) return false;
  const m = allyOf(game); if (m) { c.hp = m.hp; m.dead = true; }
  c.state = "kennel"; message(game, `${c.name} heads home to the beastkeepers.`); sound(game, "click");
  return true;
}
/** Whistle for the next companion waiting at the beastkeepers (the one out goes home). */
export function callNext(game: Game): boolean {
  const player = game.player, waiting = player.companions.filter(c => c.state === "kennel");
  if (!waiting.length) { message(game, companionOut(player) ? "No one else is waiting at the beastkeepers." : "None of your companions is waiting to come.", "warn"); return false; }
  const out = companionOut(player), next = waiting.find(c => !out || c.id > out.id) ?? waiting[0];
  if (out) sendHome(game);
  if (player.aboard !== null) { message(game, "Not while you're aboard: whistle from the shore.", "warn"); return false; }
  next.state = "out"; next.hp = Math.max(next.hp, 1); placeCompanion(game);
  message(game, `${next.name} comes at your whistle.`); sound(game, "click");
  return true;
}
/** Bring one particular companion out from the beastkeepers (the one out goes home). */
export function bringOut(game: Game, c: Companion): boolean {
  if (c.state !== "kennel") return false;
  if (game.player.aboard !== null) { message(game, "Not while you're aboard.", "warn"); return false; }
  if (companionOut(game.player)) sendHome(game);
  c.state = "out"; placeCompanion(game); message(game, `${c.name} comes out to you.`); sound(game, "click");
  return true;
}
function loadPack(game: Game, c: Companion, slotIndex: number): boolean {
  const player = game.player, slot = player.inventory[slotIndex]; if (!slot) return false;
  const same = item(slot.id).stackable ? c.pack.find(s => s?.id === slot.id) : null;
  if (same) same.n += slot.n; else { const free = c.pack.indexOf(null); if (free < 0) { message(game, `${c.name}'s panniers are full.`, "warn"); return true; } c.pack[free] = { ...slot }; }
  player.inventory[slotIndex] = null; sound(game, "click");
  return true;
}
/** Unload a pack animal: everything back into your pack, as much as fits. */
export function unloadPack(game: Game, c: Companion): number {
  let moved = 0;
  c.pack.forEach((slot, i) => { if (!slot) return; const left = give(game.player, slot.id, slot.n); moved += slot.n - left; if (left > 0) slot.n = left; else c.pack[i] = null; });
  message(game, moved ? `You unload ${c.name}'s panniers.` : "There's nothing in the panniers, or no room in your pack.");
  return moved;
}
/** A stag at your side: running costs a fifth less. */
export const easesTheRoad = (player: Player) => companionOut(player)?.species === "stag";
/** A vixen at your side: now and then another herb where you pick one. */
export const findsHerbs = (game: Game) => companionOut(game.player)?.species === "vixen" && game.rng() < 0.2;

// ---------- The beastkeepers ----------
/** Settle a frightened one (fled): its fee by its level, once it's had time to calm down. */
export function settle(game: Game, c: Companion): boolean {
  if (c.state !== "fled") return false;
  if (game.tick - (c.fledAt ?? 0) < KEEP.settleAfter) { message(game, `${c.name} is still shaking. Give it a while.`, "warn"); return false; }
  const fee = KEEP.settleFee * SPECIES[c.species].level;
  if (count(game.player, "coins") < fee) { message(game, `Settling ${c.name} costs ${fee.toLocaleString()} Frens.`, "warn"); return false; }
  take(game.player, "coins", fee); c.state = "kennel"; c.hp = companionDef(c).hp; c.bond = Math.max(0, c.bond - 10);
  message(game, `${c.name} is settled, if a little warier of you.`); return true;
}
/** Leave one with the beastkeepers for good (to make room for another). */
export function release(game: Game, c: Companion): boolean {
  const player = game.player;
  if (c.state === "out") sendHome(game);
  player.companions = player.companions.filter(x => x !== c);
  for (const slot of c.pack) if (slot) give(player, slot.id, slot.n);
  message(game, `${c.name} stays with the beastkeepers for good. They'll look after it.`);
  return true;
}
/** Hound pups: Halla gives one for five cooked meat, to a keeper of Beastkeeping 10. */
export function houndPup(game: Game): boolean {
  const sp = SPECIES.hound, why = levelProblem(game, sp);
  if (why) { message(game, why, "warn"); return false; }
  if (count(game.player, "cooked_meat") < 5) { message(game, "Five cooked meat for the litter, and a pup's yours.", "warn"); return false; }
  if (game.player.companions.length >= KEEP.most) { message(game, `You keep ${KEEP.most} companions at most.`, "warn"); return false; }
  take(game.player, "cooked_meat", 5);
  return !!bondWith(game, sp);
}

// ---------- Aboard ----------
/** A vessel's room for companions: a skiff a small one, a barge or a longship two. */
export const companionRoom = (kind: string) => ({ rowboat: 0, skiff: 1, barge: 2, longship: 2 } as Record<string, number>)[kind] ?? 0;
/** Boarding: the companion comes aboard if there's room for it, or goes home. */
export function boardWith(game: Game, kind: string) {
  const c = companionOut(game.player); if (!c) return;
  const m = allyOf(game); if (m) { c.hp = m.hp; m.dead = true; }
  const room = companionRoom(kind), fits = room >= 2 || (room === 1 && SPECIES[c.species].small);
  if (fits) { c.state = "aboard"; message(game, `${c.name} comes aboard with you.`); }
  else { c.state = "kennel"; message(game, `There's no room aboard for ${c.name}: it goes home to the beastkeepers.`, "info"); }
}
/** Landing: whoever came aboard comes ashore with you. */
export function landWith(game: Game) {
  const c = game.player.companions.find(x => x.state === "aboard"); if (!c) return;
  c.state = "out"; placeCompanion(game);
}
/** Falling in battle: whoever's out goes home (it doesn't die with you). */
export function homeOnDeath(game: Game) { for (const c of game.player.companions) if (c.state === "out" || c.state === "aboard") { const m = game.monsters.find(x => x.ally === c.id); if (m) { c.hp = m.hp; m.dead = true; } c.state = "kennel"; } }

// ---------- From a save ----------
export function cleanCompanions(raw: unknown, isItem: (id: string) => boolean): Companion[] {
  if (!Array.isArray(raw)) return [];
  const out: Companion[] = [];
  for (const entry of raw.slice(0, KEEP.most)) {
    const r = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const species = r.species as SpeciesId;
    if (!SPECIES[species] || typeof r.id !== "number" || !Number.isInteger(r.id) || out.some(o => o.id === r.id)) continue;
    const name = typeof r.name === "string" && r.name.length <= 24 ? r.name : SPECIES[species].name;
    const state = (["out", "kennel", "aboard", "fled"] as const).includes(r.state as CompanionState) ? r.state as CompanionState : "kennel";
    const pack = SPECIES[species].role === "pack" ? Array.from({ length: KEEP.pack }, (_, i) => { const s = Array.isArray(r.pack) ? r.pack[i] as Record<string, unknown> | null : null; return s && typeof s.id === "string" && isItem(s.id) && typeof s.n === "number" && s.n > 0 ? { id: s.id, n: Math.floor(s.n) } : null; }) : [];
    out.push({ id: r.id, species, name, bond: Math.max(0, Math.min(100, Math.floor(Number(r.bond) || 0))), hp: Math.max(1, Math.floor(Number(r.hp) || 1)), state: state === "out" && out.some(o => o.state === "out") ? "kennel" : state,
      order: r.order === "hold-back" ? "hold-back" : "fight", fast: r.fast === true, pack, fledAt: typeof r.fledAt === "number" ? r.fledAt : undefined });
  }
  return out;
}
export const cleanTrust = (raw: unknown): Record<string, { n: number; at: number }> => Object.fromEntries(Object.entries(raw && typeof raw === "object" ? raw as Record<string, unknown> : {})
  .filter(([id, v]) => SPECIES[id as SpeciesId] && v && typeof v === "object").map(([id, v]) => [id, { n: Math.max(0, Math.min(KEEP.trustNeeded, Math.floor(Number((v as { n: unknown }).n) || 0))), at: -1e9 }]));
