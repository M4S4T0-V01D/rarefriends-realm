/**
 * Playing together. The sandboxed game can't reach the network (its frame keeps the SDK's restrictive CSP), so the
 * trusted host page (host/runtime.tsx) connects players peer to peer and relays over postMessage, like saves:
 *
 * - The game sends NET_PRESENCE every tick (where your Friend is, what it wears and does), NET_CHAT (public, or
 *   private with `to`), NET_SOCIAL (friends list and ignore list changes) and NET_ONLINE (go on or offline).
 * - The host answers with NET_STATE (who's around, your friends and ignore lists, connection status) and NET_CHAT_IN.
 *
 * Everything from other players is untrusted: the host validates it with the functions below before the game sees
 * it, rate-limits chat and strips links. Only Friend IDs travel between players, never wallet addresses. Each
 * player's world (monsters, trees, drops) still runs on their own machine: the Realm shares people, not simulation.
 */
import { H, W } from "./world.ts";
export const NET_PRESENCE = "rarefriends-realm:net-presence";
export const NET_CHAT = "rarefriends-realm:net-chat";
export const NET_SOCIAL = "rarefriends-realm:net-social";
export const NET_ONLINE = "rarefriends-realm:net-online";
export const NET_STATE = "rarefriends-realm:net-state";
export const NET_CHAT_IN = "rarefriends-realm:net-chat-in";
/** A direct message between two players' games (trades, taking a dropped item): NET_ACT out, NET_ACT_IN in. */
export const NET_ACT = "rarefriends-realm:net-act";
export const NET_ACT_IN = "rarefriends-realm:net-act-in";
export const ACT_KINDS = ["trade-request", "trade-open", "trade-offer", "trade-accept", "trade-decline", "trade-done", "take", "give", "gone", "duel-hit", "duel-won"] as const;
export type Act = { kind: typeof ACT_KINDS[number]; trade?: string; rev?: number; stage?: number; items?: { id: string; n: number }[]; u?: number; id?: string; n?: number };
/** A shared ground item (something a player dropped from their pack). */
export type Drop = { u: number; id: string; n: number; x: number; y: number };
/** A direct message from another player, cleaned up; null if it isn't one. */
export function cleanAct(raw: unknown): Act | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.kind !== "string" || !(ACT_KINDS as readonly string[]).includes(r.kind)) return null;
  const act: Act = { kind: r.kind as Act["kind"] };
  if (typeof r.trade === "string" && /^[a-z0-9]{4,24}$/.test(r.trade)) act.trade = r.trade;
  const small = int(r.rev, 0, 1e6); if (small !== null) act.rev = small;
  const stage = int(r.stage, 1, 2); if (stage !== null) act.stage = stage;
  if (Array.isArray(r.items)) act.items = r.items.slice(0, 28).flatMap(entry => { const e = entry as Record<string, unknown>, id = word(e?.id, 40), n = int(e?.n, 1, 2_147_483_647); return id && n ? [{ id, n }] : []; });
  const u = int(r.u, 0, 1e12); if (u !== null) act.u = u;
  const itemId = word(r.id, 40); if (itemId) act.id = itemId;
  const n = int(r.n, 1, 2_147_483_647); if (n !== null) act.n = n;
  return act;
}

/** What every player shares about their Friend. */
export type Presence = {
  id: number; family: number; x: number; y: number; hx: number; hy: number; moving: boolean;
  worn: string[]; cape: string | null; weapon: string | null; activity: string | null; combat: number; total: number; region: string;
  emote: string | null;
  /** Items this player dropped from their pack, which anyone may pick up. */
  drops: Drop[];
  /** Their hitpoints, and the monster they're fighting (shared fights). */
  /** Their equipped headgear (a helm, hood, hat or crown), shown on their Friend. */
  head: string | null;
  /** Their equipped shield. */
  shield: string | null;
  /** The amulet or pendant round their neck, and their body and leg armour (older clients don't send these). */
  neck?: string | null; body?: string | null; legs?: string | null;
  /** The mount they're riding. */
  mount: string | null;
  /** A level-up they're celebrating (`skill_level`), for its fireworks. */
  celebrate: string | null;
  /** The pet following them. */
  pet: string | null;
  /** The Friend whose referral code this player used (so that Friend's game can reward them). */
  referredBy: number | null;
  hp: number; maxHp: number; fight: { u: number; id: string; hp: number; x: number; y: number } | null;
};
export type NetStatus = "offline" | "connecting" | "online";
export type NetState = { status: NetStatus; peers: Presence[]; friends: number[]; ignored: number[]; players: number;
  /** How we're connected: relays open, and players on a direct link (the rest reach us through the relays). */
  paths?: { relays: number; direct: number } };
export type ChatIn = { from: number; text: string; private: boolean };

const id = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value < 1e15 ? value : null;
const int = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : null;
const word = (value: unknown, max = 32) => typeof value === "string" && /^[a-z0-9_]{1,32}$/.test(value) && value.length <= max ? value : null;
/** A presence from another player, cleaned up; null if it isn't one. */
export function cleanPresence(raw: unknown): Presence | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>, who = id(r.id), x = int(r.x, 0, W - 1), y = int(r.y, 0, H - 1);
  if (who === null || x === null || y === null) return null;
  const worn = Array.isArray(r.worn) ? r.worn.map(entry => word(entry)).filter((entry): entry is string => !!entry).slice(0, 8) : [];
  return {
    id: who, family: int(r.family, 0, 8) ?? 0, x, y, hx: int(r.hx, -1, 1) ?? 0, hy: int(r.hy, -1, 1) ?? 1, moving: r.moving === true,
    worn, cape: word(r.cape), weapon: word(r.weapon), activity: word(r.activity), combat: int(r.combat, 3, 200) ?? 3, total: int(r.total, 1, 3000) ?? 1,
    region: typeof r.region === "string" ? r.region.slice(0, 32).replace(/[^\w' ]/g, "") : "",
    emote: word(r.emote),
    head: word(r.head, 40), shield: word(r.shield, 40), neck: word(r.neck, 40), body: word(r.body, 40), legs: word(r.legs, 40), mount: word(r.mount, 40), celebrate: word(r.celebrate, 24), pet: word(r.pet, 24), referredBy: id(r.referredBy),
    hp: int(r.hp, 0, 99) ?? 10, maxHp: int(r.maxHp, 1, 99) ?? 10,
    fight: (() => { const f = r.fight as Record<string, unknown> | null; if (!f || typeof f !== "object") return null; const u = int(f.u, 0, 1e9), fid = word(f.id, 40), fhp = int(f.hp, 0, 10_000), fx = int(f.x, 0, 239), fy = int(f.y, 0, 279);
      return u !== null && fid && fhp !== null && fx !== null && fy !== null ? { u, id: fid, hp: fhp, x: fx, y: fy } : null; })(),
    drops: Array.isArray(r.drops) ? r.drops.slice(0, 16).flatMap(entry => { const e = entry as Record<string, unknown>, u = int(e?.u, 0, 1e12), id = word(e?.id, 40), n = int(e?.n, 1, 2_147_483_647), dx = int(e?.x, 0, 239), dy = int(e?.y, 0, 279);
      return u !== null && id && n && dx !== null && dy !== null ? [{ u, id, n, x: dx, y: dy }] : []; }) : [],
  };
}
/** Chat text from another player: one line, no control characters, no links (anti-scam), at most 80 characters. */
export function cleanChat(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e]/g, "")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]").replace(/\b[a-z0-9-]+\.(?:com|io|xyz|net|org|gg|app|link|co|me|to|ly)\b\S*/gi, "[link removed]")
    .trim().slice(0, 80);
  return text ? text : null;
}
export const cleanId = id;
