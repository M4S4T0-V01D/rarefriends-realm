/**
 * The Rare Friends Ring: matches against the Realm's creatures in the arena courtyard, paid in coins and bloodmarks,
 * and Friend Fights (duels in the Ring) paid in laurels. A great Friend built it long ago so the best fighters in the
 * land could meet; its magic puts whoever falls there back on their feet in the lobby.
 */
import { MONSTERS } from "./data.ts";
import { addXp, count, give, giveOrDrop, message, sound, take, type Game, type Monster } from "./state.ts";
import { ARENA, T, W, arenaDistance, inArena, inRingBuilding, objectAtTile } from "./world.ts";
import { presenceXp } from "./presence.ts";

export type MatchDef = { id: string; name: string; level: number; text: string; waves: readonly (readonly [string, number])[]; coins: number; marks: number };
/** The matches the Ringmaster offers, easiest first. `level` is the combat level they're meant for. */
export const MATCHES: readonly MatchDef[] = [
  { id: "rat_pit", name: "The Rat Pit", level: 3, text: "Rats and bats. Everyone starts here.", waves: [["ink_rat", 6], ["cave_bat", 2]], coins: 150, marks: 3 },
  { id: "grumblin_raid", name: "Grumblin Raid", level: 12, text: "A raiding party and its chief.", waves: [["grumblin", 5], ["grumblin_chief", 1]], coins: 400, marks: 6 },
  { id: "wolf_pack", name: "The Wolf Pack", level: 30, text: "Wolves, and the boars they were chasing.", waves: [["wolf", 4], ["boar", 2]], coins: 900, marks: 10 },
  { id: "bone_legion", name: "The Bone Legion", level: 40, text: "Skeletons in ranks, shades at their backs.", waves: [["skeleton", 6], ["shade", 2]], coins: 1500, marks: 16 },
  { id: "highland_host", name: "The Highland Host", level: 55, text: "Golems, wights and yetis down from the Greyhorn.", waves: [["stone_golem", 3], ["cairn_wight", 2], ["frost_yeti", 2]], coins: 3000, marks: 25 },
  { id: "drake_pit", name: "The Drake Pit", level: 75, text: "Drakes and salamanders. Bring a Wyrmward shield.", waves: [["ash_drake", 2], ["ember_salamander", 2], ["cinder_drake", 1]], coins: 6000, marks: 40 },
  { id: "vault_dead", name: "The Vault's Dead", level: 80, text: "Knights and archers from under the stones.", waves: [["vault_knight", 4], ["vault_archer", 3]], coins: 7000, marks: 45 },
  { id: "hollow_court", name: "The Hollow Court", level: 90, text: "Sentinels and weavers of the Hollow.", waves: [["hollow_sentinel", 4], ["hollow_weaver", 2]], coins: 10_000, marks: 60 },
  { id: "the_seven", name: "The Seven", level: 115, text: "The revenant and skeletal knights whose statues ring the courtyard: all seven at once, their king last. The Ring's hardest fight.", waves: [["revenant_warden", 1], ["revenant_lancer", 1], ["revenant_hexer", 1], ["skeletal_champion", 1], ["skeletal_bowmaster", 1], ["bone_juggernaut", 1], ["revenant_king", 1]], coins: 24_000, marks: 150 },
];
export const matchDef = (id: string) => MATCHES.find(match => match.id === id) ?? null;
/** The entry fee: a quarter of the coins a match pays. The bloodmarks make it worth it, if you live. */
export const entryFee = (coins: number) => Math.round(coins * 0.25);
/** Creatures you can choose to face, by kind. */
export const FOE_GROUPS: readonly { name: string; foes: readonly string[] }[] = [
  { name: "Beasts", foes: ["ink_rat", "cave_bat", "boar", "wolf", "highland_goat", "thornback", "grave_moth"] },
  { name: "Raiders and crawlers", foes: ["grumblin", "grumblin_chief", "bandit", "swamp_lurker", "mire_crawler", "marsh_adder", "sand_scorpion"] },
  { name: "The dead", foes: ["skeleton", "shade", "cairn_wight", "drowned_scholar", "ink_wraith", "vault_archer", "vault_knight"] },
  { name: "Giants and stone", foes: ["moss_colossus", "stone_golem", "frost_yeti", "glass_crab", "frost_wisp"] },
  { name: "Fire and scale", foes: ["ember_salamander_young", "ember_salamander", "ash_drake", "cinder_drake"] },
  { name: "The Hollow and the dark", foes: ["gloom_hound", "dune_stalker", "cave_spider", "hollow_sentinel", "hollow_weaver"] },
];
/** How many of a creature make a match, and what it pays: by the creature's level. */
export function customMatch(monsterId: string): MatchDef | null {
  const def = MONSTERS[monsterId];
  if (!def || !FOE_GROUPS.some(group => group.foes.includes(monsterId))) return null;
  const n = def.level < 20 ? 6 : def.level < 50 ? 4 : 3, coins = Math.round(def.level * 12 * n / 10) * 10, marks = Math.max(1, Math.round(def.level * n / 15));
  return { id: `foe:${monsterId}`, name: `${n} × ${def.name.replace(/^The /, "")}`, level: def.level, text: def.examine, waves: [[monsterId, n]], coins, marks };
}
/** What spectators see of your match: each creature's place and health. */
export function arenaFoes(game: Game): { u: number; id: string; x: number; y: number; hp: number }[] {
  if (!game.arena) return [];
  const uids = new Set(game.arena.uids);
  return game.monsters.filter(monster => uids.has(monster.uid) && !monster.dead).slice(0, 12).map(monster => ({ u: monster.uid, id: monster.def.id, x: monster.x, y: monster.y, hp: monster.hp }));
}
/** Laurels a Friend Fight (a duel in the Ring) pays the winner. */
export const LAURELS_PER_WIN = 2;

/** A free tile of the arena floor to summon onto: well in from the walls, off the fountain, not on top of you. */
function arenaTile(game: Game, taken: Set<number>): { x: number; y: number } | null {
  for (let tries = 0; tries < 200; tries++) {
    const a = game.rng() * Math.PI * 2, r = 4 + game.rng() * (ARENA.inner - 6), x = Math.round(ARENA.x + Math.cos(a) * r), y = Math.round(ARENA.y + Math.sin(a) * r), i = y * W + x;
    const tile = game.world.tiles[i];
    if (taken.has(i) || !inArena(x, y) || arenaDistance(x, y) < 3 || tile === T.LAVA || tile === T.CLIFF || tile === T.WALL || tile === T.WATER) continue;
    const object = objectAtTile(game.world, x, y);
    if (object && object.blocks) continue;
    if (Math.abs(x - game.player.x) + Math.abs(y - game.player.y) < 3) continue;
    taken.add(i);
    return { x, y };
  }
  return null;
}
/** Start a match: the creatures appear around the courtyard and come for you. */
export function startMatch(game: Game, id: string): boolean {
  const match = id.startsWith("foe:") ? customMatch(id.slice(4)) : matchDef(id);
  if (!match) return false;
  if (game.arena) { message(game, "A match is already under way. Finish it, or walk out of the Ring to give it up.", "warn"); return false; }
  if (!inRingBuilding(game.player.x, game.player.y)) { message(game, "Matches are fought in the Ring.", "warn"); return false; }
  const fee = entryFee(match.coins);
  if (count(game.player, "coins") < fee) { message(game, `The Ringmaster wants ${fee.toLocaleString()} coins to open the gate for ${match.name} (a quarter of the purse).`, "warn"); return false; }
  take(game.player, "coins", fee);
  const taken = new Set<number>(), uids: number[] = [];
  for (const [monsterId, n] of match.waves) for (let k = 0; k < n; k++) {
    const def = MONSTERS[monsterId], at = arenaTile(game, taken);
    if (!def || !at) continue;
    const uid = game.nextUid++;
    const monster: Monster = { uid, def, x: at.x, y: at.y, prev: { ...at }, spawn: { ...at }, hp: def.hp, heading: { x: 1, y: 1 }, target: true, attackTimer: 2, respawnAt: Infinity, dead: false, wander: ARENA.inner, moved: 0, retreat: 0, curses: {}, arena: true };
    game.monsters.push(monster); uids.push(uid);
  }
  game.arena = { match: id, name: match.name, uids, startedAt: game.tick, coins: match.coins, marks: match.marks, level: match.level };
  message(game, `${match.name}! ${fee.toLocaleString()} coins paid; ${uids.length} creature${uids.length === 1 ? "" : "s"} enter the Ring. Fight!`, "quest"); sound(game, "quest");
  return true;
}
/** Take the summoned creatures out of the world (the match is over, won or given up). */
function clearArena(game: Game) {
  if (!game.arena) return;
  const uids = new Set(game.arena.uids);
  game.monsters = game.monsters.filter(monster => !uids.has(monster.uid));
  if (game.player.combat !== null && uids.has(game.player.combat)) game.player.combat = null;
  game.arena = null;
}
/** Every tick: a match is won when its last creature falls, and given up if you leave the Ring. */
export function arenaTick(game: Game) {
  const arena = game.arena;
  if (!arena) return;
  if (!inRingBuilding(game.player.x, game.player.y)) { clearArena(game); message(game, "You walk out of the Ring and the match is forfeit. The creatures fade.", "warn"); return; }
  const uids = new Set(arena.uids), alive = game.monsters.some(monster => uids.has(monster.uid) && !monster.dead);
  if (alive) return;
  const { name, coins, marks, level } = arena;
  clearArena(game);
  give(game.player, "coins", coins); giveOrDrop(game, "bloodmark", marks);
  game.player.stats.matches = (game.player.stats.matches ?? 0) + 1;
  addXp(game, "hitpoints", 20 * level, { raw: true }); presenceXp(game, 10 + level / 4);
  message(game, `${name} is won! The Ringmaster pays ${coins.toLocaleString()} coins and ${marks} bloodmarks.`, "quest"); sound(game, "rare");
}
/** You fell in the Ring: its magic stands you up in the lobby, and whatever you were fighting is gone. */
export function arenaRevive(game: Game) {
  clearArena(game);
  const player = game.player, lobby = ARENA.lobby;
  player.prev = { ...lobby }; player.x = lobby.x; player.y = lobby.y;
  message(game, "The Ring's magic knits you back together, and you wake in the lobby. Nothing lost but the match.", "info");
}
