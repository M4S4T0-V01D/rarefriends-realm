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

/**
 * Cloud saves (host/cloud.ts, cloud/src/worker.ts). The host page keeps the wallet, the session and the network; the
 * game only shows where its save is and passes on the player's choices.
 * - The host sends CLOUD_STATE whenever that changes.
 * - The game sends CLOUD_ACTION on the player's click: "verify" (sign in with the wallet: a message, not a
 *   transaction), "sign-out", "import" (put this browser's adventure in the cloud), "skip-import", "keep-cloud" /
 *   "keep-local" (answering a conflict), "retry", "reload" (to load a save that can't replace one in play) and
 *   "flush" (logging out: upload whatever is waiting now).
 * - SAVE_WRITE may carry `important: true` (a milestone: save to the cloud soon) and, after a save code is restored,
 *   `importHash` (so the same code can't be imported twice).
 * - HOST_STATE may carry `replace: true`: a different save chosen on the title screen.
 */
export const CLOUD_STATE = "rarefriends-realm:cloud-state";
export const CLOUD_ACTION = "rarefriends-realm:cloud-action";
export type CloudAction = "verify" | "sign-out" | "import" | "skip-import" | "keep-cloud" | "keep-local" | "retry" | "reload" | "flush" | "mint-card" | "card-status" | "cancel-card" | "held-cards" | "redeem-card";
/**
 * An Adventurer Card (cloud/src/cards.ts) this character has out, as the host reports it: the card's token, where it
 * is in its life (reserved → submitted → active → redeemed; or cancelled), and what the host is doing about it now.
 */
export type CardState = {
  tokenId: number; state: "prepared" | "reserved" | "submitted" | "active" | "redeemed" | "cancelled";
  txHash?: string | null; holder?: string | null; contract?: string | null; chainId?: number; deadline?: number | null;
  /** What the host is doing: making the snapshot, sending the picture, waiting for the wallet, waiting for the chain. */
  step?: "preparing" | "uploading" | "wallet" | "waiting" | null;
  /** Why the last step stopped: "cancelled" (the wallet), "unverified", "held", or the server's reason. */
  error?: string;
};
export type CloudConflict = {
  cloud: Record<string, unknown>; cloudAt: number; cloudVersion: number;
  local: Record<string, unknown> | null; localAt: number | null;
  /** Found when the game started (it can still swap saves) or during play (taking the cloud's reloads the game). */
  where: "start" | "play";
};
export type CloudState = {
  status: "off" | "unverified" | "signing" | "loading" | "saved" | "saving" | "offline" | "conflict" | "import" | "local-only" | "not-owner" | "error";
  address?: string; version?: number; savedAt?: number;
  /** Why it isn't signed in, or what went wrong: "cancelled", "failed", "expired", "no-wallet", or the server's reason. */
  error?: string;
  conflict?: CloudConflict;
  importable?: Record<string, unknown>;
  /** The cloud had no save even though this browser had synced one (it was reset): offered back as an import. */
  lost?: boolean; imported?: boolean; duplicate?: boolean;
  /** This character's Adventurer Card, if it has one out (null: none; absent: not known yet). */
  card?: CardState | null;
  /** The active cards this wallet holds on chain, when asked for (`held-cards`), and what a redemption is doing. */
  held?: HeldCard[]; redeeming?: { tokenId: number; step: "wallet" | "waiting" | "settling" | null; error?: string; done?: boolean };
};
/** A card held in the wallet: whose progress it stands for, and how much. */
export type HeldCard = { tokenId: number; from: { friend: number; name: string | null }; totalXp: number; items: number; layout: string };
const CLOUD_STATUSES = new Set<CloudState["status"]>(["off", "unverified", "signing", "loading", "saved", "saving", "offline", "conflict", "import", "local-only", "not-owner", "error"]);
const CARD_STATES = new Set(["prepared", "reserved", "submitted", "active", "redeemed", "cancelled"]), CARD_STEPS = new Set(["preparing", "uploading", "wallet", "waiting"]);
export function parseCardState(raw: unknown): CardState | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.tokenId !== "number" || !Number.isSafeInteger(c.tokenId) || !CARD_STATES.has(c.state as string)) return null;
  const text = (value: unknown, max = 120) => typeof value === "string" ? value.slice(0, max) : null;
  return { tokenId: c.tokenId, state: c.state as CardState["state"], txHash: text(c.txHash), holder: text(c.holder), contract: text(c.contract), chainId: typeof c.chainId === "number" ? c.chainId : undefined,
    deadline: typeof c.deadline === "number" ? c.deadline : null, step: CARD_STEPS.has(c.step as string) ? c.step as CardState["step"] : null, error: text(c.error, 200) ?? undefined };
}
export function parseHeldCard(raw: unknown): HeldCard | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>, from = (c.from && typeof c.from === "object" ? c.from : {}) as Record<string, unknown>;
  if (typeof c.tokenId !== "number" || !Number.isSafeInteger(c.tokenId)) return null;
  return { tokenId: c.tokenId, from: { friend: typeof from.friend === "number" ? from.friend : 0, name: typeof from.name === "string" ? from.name.slice(0, 40) : null }, totalXp: typeof c.totalXp === "number" ? c.totalXp : 0, items: Array.isArray(c.items) ? c.items.length : typeof c.items === "number" ? c.items : 0, layout: typeof c.layout === "string" ? c.layout.slice(0, 24) : "" };
}
const parseRedeeming = (r: Record<string, unknown>): NonNullable<CloudState["redeeming"]> => ({ tokenId: typeof r.tokenId === "number" ? r.tokenId : 0, step: r.step === "wallet" || r.step === "waiting" || r.step === "settling" ? r.step : null, error: typeof r.error === "string" ? r.error.slice(0, 200) : undefined, done: r.done === true });
/** Check a CLOUD_STATE from the host before showing it. */
export function parseCloudState(raw: unknown): CloudState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (!CLOUD_STATUSES.has(s.status as CloudState["status"])) return null;
  const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
  const save = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const conflict = s.conflict && typeof s.conflict === "object" ? s.conflict as Record<string, unknown> : null;
  return {
    status: s.status as CloudState["status"],
    address: typeof s.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(s.address) ? s.address : undefined,
    version: num(s.version), savedAt: num(s.savedAt), error: typeof s.error === "string" ? s.error.slice(0, 200) : undefined,
    conflict: conflict && save(conflict.cloud) ? { cloud: save(conflict.cloud)!, cloudAt: num(conflict.cloudAt) ?? 0, cloudVersion: num(conflict.cloudVersion) ?? 0, local: save(conflict.local) ?? null, localAt: num(conflict.localAt) ?? null, where: conflict.where === "play" ? "play" : "start" } : undefined,
    importable: save(s.importable), lost: s.lost === true, imported: s.imported === true, duplicate: s.duplicate === true,
    ...(s.card === null ? { card: null } : parseCardState(s.card) ? { card: parseCardState(s.card)! } : {}),
    ...(Array.isArray(s.held) ? { held: (s.held as unknown[]).map(parseHeldCard).filter((entry): entry is HeldCard => !!entry).slice(0, 50) } : {}),
    ...(s.redeeming && typeof s.redeeming === "object" ? { redeeming: parseRedeeming(s.redeeming as Record<string, unknown>) } : {}),
  };
}

/**
 * Settings, kept by the host page (the sandbox has no storage of its own): the game sends SETTINGS_WRITE when they
 * change; on HOST_HELLO the host answers SETTINGS_STATE with what it kept for this browser, and `renderer` when the
 * page's address chose one for this visit (`?renderer=webgl` or `normal`, as the old WebGL address does). The game
 * checks every field before using it.
 */
export const SETTINGS_WRITE = "rarefriends-realm:settings";
export const SETTINGS_STATE = "rarefriends-realm:settings-state";
export type RendererMode = "normal" | "webgl";
export const parseRenderer = (value: unknown): RendererMode | null => value === "normal" || value === "webgl" ? value : null;

