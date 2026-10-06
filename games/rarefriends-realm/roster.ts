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
/**
 * One tab saves at a time. A newer tab for the same wallet and Friend (opened, or restoring a save code) takes over, and
 * the host tells older tabs with SAVE_ELSEWHERE; they stop saving, so a stale adventure can't overwrite the newer one.
 */
export const SAVE_ELSEWHERE = "rarefriends-realm:save-elsewhere";

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
/** Full screen: on a click the game asks the trusted host to put the game frame into (or out of) full screen, and the host reports the state. */
/** A fellowship invitation from the page's ?join= link, handed to the game once it says hello; and copying a short text on the player's click. */
export const JOIN_INVITE = "rarefriends-realm:join";
export const TEXT_COPY = "rarefriends-realm:copy-text";
export const TEXT_COPY_RESULT = "rarefriends-realm:copy-text-result";
export const FULLSCREEN_REQUEST = "rarefriends-realm:fullscreen";
export const FULLSCREEN_STATE = "rarefriends-realm:fullscreen-state";
export const SHARE_REQUEST = "rarefriends-realm:share";
/** Player feedback: on a click the game sends FEEDBACK_REQUEST (which to open, the X post text, a GitHub issue's title and body); the host opens them and replies with FEEDBACK_RESULT. */
export const FEEDBACK_REQUEST = "rarefriends-realm:feedback";
export const FEEDBACK_RESULT = "rarefriends-realm:feedback-result";
export type FeedbackTarget = "both" | "github" | "x";
/** What opened: both, one, the issue but not the post (a browser that allows one new tab per click), or nothing. */
export type FeedbackOutcome = "both" | "github" | "x" | "x-blocked" | "failed";
export const SHARE_RESULT = "rarefriends-realm:share-result";
export type ShareAction = "post" | "copy" | "save";
/**
 * Save codes: on a click, the game sends SAVE_EXPORT with the code (copy it, or download it as a text file) and the
 * host does it, replying with SAVE_EXPORT_RESULT ("copied", "saved" or "failed").
 */
export const SAVE_EXPORT = "rarefriends-realm:save-export";
export const SAVE_EXPORT_RESULT = "rarefriends-realm:save-export-result";
export type ShareOutcome = "shared" | "copied-and-opened" | "saved-and-opened" | "copied" | "saved" | "cancelled" | "failed";
