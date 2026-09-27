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
export const NET_PRESENCE = "rarefriends-realm:net-presence";
export const NET_CHAT = "rarefriends-realm:net-chat";
export const NET_SOCIAL = "rarefriends-realm:net-social";
export const NET_ONLINE = "rarefriends-realm:net-online";
export const NET_STATE = "rarefriends-realm:net-state";
export const NET_CHAT_IN = "rarefriends-realm:net-chat-in";

/** What every player shares about their Friend. */
export type Presence = {
  id: number; family: number; x: number; y: number; hx: number; hy: number; moving: boolean;
  worn: string[]; cape: string | null; weapon: string | null; activity: string | null; combat: number; total: number; region: string;
};
export type NetStatus = "offline" | "connecting" | "online";
export type NetState = { status: NetStatus; peers: Presence[]; friends: number[]; ignored: number[]; players: number };
export type ChatIn = { from: number; text: string; private: boolean };

const id = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value < 1e15 ? value : null;
const int = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : null;
const word = (value: unknown, max = 32) => typeof value === "string" && /^[a-z0-9_]{1,32}$/.test(value) && value.length <= max ? value : null;
/** A presence from another player, cleaned up; null if it isn't one. */
export function cleanPresence(raw: unknown): Presence | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>, who = id(r.id), x = int(r.x, 0, 239), y = int(r.y, 0, 279);
  if (who === null || x === null || y === null) return null;
  const worn = Array.isArray(r.worn) ? r.worn.map(entry => word(entry)).filter((entry): entry is string => !!entry).slice(0, 8) : [];
  return {
    id: who, family: int(r.family, 0, 8) ?? 0, x, y, hx: int(r.hx, -1, 1) ?? 0, hy: int(r.hy, -1, 1) ?? 1, moving: r.moving === true,
    worn, cape: word(r.cape), weapon: word(r.weapon), activity: word(r.activity), combat: int(r.combat, 3, 200) ?? 3, total: int(r.total, 1, 3000) ?? 1,
    region: typeof r.region === "string" ? r.region.slice(0, 32).replace(/[^\w' ]/g, "") : "",
  };
}
/** Chat text from another player: one line, no control characters, no links (anti-scam), at most 80 characters. */
export function cleanChat(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, "")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]").replace(/\b[a-z0-9-]+\.(?:com|io|xyz|net|org|gg|app|link|co|me|to|ly)\b\S*/gi, "[link removed]")
    .trim().slice(0, 80);
  return text ? text : null;
}
export const cleanId = id;
