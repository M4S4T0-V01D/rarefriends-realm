/**
 * Other players, as the game sees them: avatars that glide between the positions their hosts send (one per tick),
 * their chat bubbles, and what we tell them about ourselves. The host (host/net.ts) has already validated everything.
 */
import { FAMILY_NAMES } from "./data.ts";
import type { NetState, Presence } from "./net.ts";
import { TICK_MS, combatLevel, maxHp, totalLevel, type Game } from "./state.ts";
import { currentFight } from "./engine.ts";
import { isUnderground, realPoint, regionAt } from "./world.ts";

export type Avatar = { p: Presence; fromX: number; fromY: number; at: number; emoteAt: number };
/** An avatar where it should be drawn right now. */
export type PeerView = { p: Presence; x: number; y: number; moving: boolean; friend: boolean; said: string | null; emoteT: number };

export class Players {
  state: NetState = { status: "offline", peers: [], friends: [], ignored: [], players: 0 };
  private avatars = new Map<number, Avatar>();
  private bubbles = new Map<number, { text: string; until: number }>();
  /** A new snapshot from the host. */
  update(state: NetState, now: number) {
    this.state = state;
    const seen = new Set<number>();
    for (const p of state.peers) {
      seen.add(p.id);
      const avatar = this.avatars.get(p.id);
      if (!avatar) { this.avatars.set(p.id, { p, fromX: p.x, fromY: p.y, at: now, emoteAt: now }); continue; }
      if (p.emote !== avatar.p.emote) avatar.emoteAt = now;
      if (avatar.p.x !== p.x || avatar.p.y !== p.y) {
        // Glide on from wherever it's drawn now (tile jumps like stairs and teleports snap).
        const here = this.position(avatar, now), jump = Math.max(Math.abs(p.x - avatar.p.x), Math.abs(p.y - avatar.p.y)) > 3;
        avatar.fromX = jump ? p.x : here.x; avatar.fromY = jump ? p.y : here.y; avatar.at = now;
      }
      avatar.p = p;
    }
    for (const id of [...this.avatars.keys()]) if (!seen.has(id)) this.avatars.delete(id);
  }
  /** Everything other players have dropped from their packs, where anyone may pick it up. */
  drops() { return [...this.avatars.values()].flatMap(avatar => avatar.p.drops.map(drop => ({ ...drop, owner: avatar.p.id, key: `${avatar.p.id}:${drop.u}` }))); }
  say(id: number, text: string, now: number) { this.bubbles.set(id, { text, until: now + 4000 }); }
  isFriend(id: number) { return this.state.friends.includes(id); }
  get(id: number) { return this.avatars.get(id)?.p ?? null; }
  name(id: number) { const p = this.get(id); return p ? `${FAMILY_NAMES[p.family] ?? "Friend"} #${id}` : `Friend #${id}`; }
  private position(avatar: Avatar, now: number) {
    const k = Math.min(1, (now - avatar.at) / TICK_MS);
    return { x: avatar.fromX + (avatar.p.x - avatar.fromX) * k, y: avatar.fromY + (avatar.p.y - avatar.fromY) * k, moving: k < 1 };
  }
  /** Everyone to draw this frame. */
  view(now: number): PeerView[] {
    return [...this.avatars.values()].map(avatar => {
      const at = this.position(avatar, now), bubble = this.bubbles.get(avatar.p.id);
      return { p: avatar.p, x: at.x, y: at.y, moving: at.moving || avatar.p.moving, friend: this.isFriend(avatar.p.id), said: bubble && bubble.until > now ? bubble.text : null, emoteT: (now - avatar.emoteAt) / 1000 };
    });
  }
  /** Friends near you (same storey or dungeon, within 12 tiles): playing together earns a little more XP. */
  nearFriends(game: Game) {
    const me = realPoint(game.world, game.player.x, game.player.y);
    return [...this.avatars.values()].filter(avatar => {
      if (!this.isFriend(avatar.p.id)) return false;
      const them = realPoint(game.world, avatar.p.x, avatar.p.y);
      return them.level === me.level && isUnderground(game.player.y) === isUnderground(avatar.p.y) && Math.max(Math.abs(them.x - me.x), Math.abs(them.y - me.y)) <= 12;
    }).length;
  }
}
/** What we share about our own Friend each tick. */
export function presenceOf(game: Game): Presence {
  const player = game.player;
  return {
    id: player.friendId, family: player.familyId, x: player.x, y: player.y, hx: Math.sign(player.heading.x), hy: Math.sign(player.heading.y), moving: player.moved === game.tick,
    worn: [...player.worn], cape: player.equipment.cape ?? null, weapon: player.equipment.weapon ?? null,
    activity: player.activity?.kind ?? (player.combat !== null ? "combat" : null), combat: combatLevel(player), total: totalLevel(player),
    region: regionAt(game.world, player.x, player.y).name,
    emote: player.emote && game.tick < player.emote.until ? player.emote.id : null,
    hp: player.hp, maxHp: maxHp(player), fight: currentFight(game),
    drops: game.ground.filter(entry => entry.shared).slice(-16).map(entry => ({ u: entry.uid, id: entry.id, n: entry.n, x: entry.x, y: entry.y })),
  };
}
