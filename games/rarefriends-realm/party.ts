/**
 * Parties: a few Friends who've agreed to go about together. Invite anyone online (fellows are the natural choice),
 * they accept, and the inviter sends everyone the roster. Party members within thirty tiles of you give +10% XP;
 * fellowship members within twelve give +5% (both stack with the friends-list bonus). "/p" talks to the party.
 * Nothing here is authoritative: every client keeps its own list and the roster messages keep them in step.
 */
import type { Act } from "./net.ts";
import { message, sound, type Game } from "./state.ts";
import { isUnderground, realPoint } from "./world.ts";

export const PARTY_MAX = 6, PARTY_RANGE = 30, FELLOW_RANGE = 12, PARTY_XP = 0.1, FELLOW_XP = 0.05;
export class Party {
  /** The other players in the party. */
  members = new Set<number>();
  /** Invitations waiting on you (from → when), and ones you've sent (to → when). */
  invites = new Map<number, number>(); pending = new Map<number, number>();
  private send: (to: number, act: Act) => void; private name: (id: number) => string;
  constructor(send: (to: number, act: Act) => void, name: (id: number) => string = id => `Friend #${id}`) { this.send = send; this.name = name; }
  invite(game: Game, to: number, now: number) {
    if (this.members.has(to)) { message(game, `${this.name(to)} is in your party already.`); return false; }
    if (this.members.size + 1 >= PARTY_MAX) { message(game, `A party holds ${PARTY_MAX}.`, "warn"); return false; }
    this.pending.set(to, now); this.send(to, { kind: "party-invite" });
    message(game, `You invite ${this.name(to)} to your party.`); return true;
  }
  accept(game: Game, from: number) {
    if (!this.invites.has(from)) return false;
    this.invites.delete(from); this.members.add(from); this.send(from, { kind: "party-accept" });
    message(game, `You join ${this.name(from)}'s party.`, "quest"); sound(game, "quest"); return true;
  }
  decline(from: number) { if (this.invites.delete(from)) this.send(from, { kind: "party-decline" }); }
  leave(game: Game) {
    if (!this.members.size) return;
    for (const id of this.members) this.send(id, { kind: "party-leave" });
    this.members.clear(); message(game, "You leave the party.");
  }
  /** Everyone gets the same list (the sender's members plus the sender). */
  private roster(me: number) { const ids = [...this.members, me]; for (const id of this.members) this.send(id, { kind: "party-roster", ids: ids.filter(entry => entry !== id) }); }
  receive(game: Game, from: number, act: Act, now: number) {
    const me = game.player.friendId;
    switch (act.kind) {
      case "party-invite": if (!this.members.has(from)) { this.invites.set(from, now); message(game, `${this.name(from)} invites you to a party.`, "quest"); sound(game, "quest"); } break;
      case "party-accept": if (this.pending.delete(from)) { if (this.members.size + 1 < PARTY_MAX) { this.members.add(from); message(game, `${this.name(from)} joins your party.`, "quest"); sound(game, "quest"); this.roster(me); } } break;
      case "party-decline": if (this.pending.delete(from)) message(game, `${this.name(from)} declines.`); break;
      case "party-leave": if (this.members.delete(from)) message(game, `${this.name(from)} leaves the party.`); break;
      case "party-roster": if (this.members.has(from) || this.pending.has(from)) { this.pending.delete(from); this.members = new Set((act.ids ?? []).filter(id => id !== me).slice(0, PARTY_MAX - 1)); this.members.add(from); } break;
    }
  }
  /** Prune invitations older than a minute. */
  tidy(now: number) { for (const [id, at] of this.invites) if (now - at > 60_000) this.invites.delete(id); for (const [id, at] of this.pending) if (now - at > 60_000) this.pending.delete(id); }
}
/** Players within `range` tiles of you on your level: party members, or fellows wearing your tag. */
export function nearby(game: Game, peers: readonly { id: number; x: number; y: number; tag?: string | null }[], pick: (peer: { id: number; tag?: string | null }) => boolean, range: number) {
  const me = realPoint(game.world, game.player.x, game.player.y);
  return peers.filter(peer => {
    if (!pick(peer)) return false;
    const them = realPoint(game.world, peer.x, peer.y);
    return them.level === me.level && isUnderground(game.player.y) === isUnderground(peer.y) && Math.max(Math.abs(them.x - me.x), Math.abs(them.y - me.y)) <= range;
  }).length;
}
