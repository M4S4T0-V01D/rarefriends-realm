/**
 * Messages between the sandboxed game and its trusted host page (host/runtime.tsx).
 *
 * - The game asks with HOST_HELLO. The host answers with HOST_STATE: the connected account's eligible Friend IDs
 *   (from the SDK's `readOwnedFriends`) and that wallet's saved adventure from the host page's localStorage.
 * - The game sends SAVE_WRITE with its progress; the host stores it under the connected wallet address.
 *
 * The game accepts HOST_STATE only from its parent window, and only when the roster contains the runtime-verified
 * Friend, so roster and save belong to the same wallet. It writes saves only after such a confirmation.
 */
export const HOST_HELLO = "rarefriends-realm:hello";
export const HOST_STATE = "rarefriends-realm:state";
export const SAVE_WRITE = "rarefriends-realm:save";

/** One roster entry per owned Friend: `"<token id>:<generation>"`. */
export type RosterFriend = { id: number; generation: number | null };
/** Parse the host's roster, or null when it doesn't belong to the verified Friend's wallet. */
export function parseRoster(ids: unknown, friendId: bigint, limit = 60): { self: number | null; others: RosterFriend[] } | null {
  if (!Array.isArray(ids)) return null;
  const seen = new Set<number>(), friends: RosterFriend[] = [];
  for (const entry of ids) {
    const match = typeof entry === "string" ? /^([0-9]{1,15})(?::([0-9]{1,3}))?$/.exec(entry) : null;
    if (!match) continue;
    const id = Number(match[1]), generation = match[2] === undefined ? null : Number(match[2]);
    if (!Number.isSafeInteger(id) || id < 1 || seen.has(id)) continue;
    seen.add(id); friends.push({ id, generation: generation !== null && generation >= 1 && generation <= 255 ? generation : null });
  }
  const self = friends.find(friend => friend.id === Number(friendId));
  if (!self) return null;
  return { self: self.generation, others: friends.filter(friend => friend !== self).slice(0, limit) };
}

/**
 * Sharing the adventurer card. The sandbox can't copy, download or open tabs, so on a click the game sends
 * SHARE_REQUEST (action, post text, PNG blob) and the trusted host performs it, replying with SHARE_RESULT.
 */
export const SHARE_REQUEST = "rarefriends-realm:share";
export const SHARE_RESULT = "rarefriends-realm:share-result";
export type ShareAction = "post" | "copy" | "save";
/**
 * Save codes: on a click, the game sends SAVE_EXPORT with the code (copy it, or download it as a text file) and the
 * host does it, replying with SAVE_EXPORT_RESULT ("copied", "saved" or "failed").
 */
export const SAVE_EXPORT = "rarefriends-realm:save-export";
export const SAVE_EXPORT_RESULT = "rarefriends-realm:save-export-result";
export type ShareOutcome = "shared" | "copied-and-opened" | "saved-and-opened" | "copied" | "saved" | "cancelled" | "failed";
