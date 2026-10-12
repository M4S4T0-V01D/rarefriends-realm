/**
 * RareFriends Realm cloud saves: a Cloudflare Worker over D1.
 *
 * It stores characters; it is not a game server. Multiplayer stays peer to peer and never touches it.
 *
 *   POST /v1/auth/challenge  { address }             → { message, nonce, expiresAt }   a sign-in message (EIP-4361 style)
 *   POST /v1/auth/verify     { message, signature }  → { token, address, expiresAt }  the wallet signed it: a session
 *   POST /v1/auth/logout                              (Bearer) ends the session
 *   GET  /v1/characters                               (Bearer) this wallet's characters
 *   GET  /v1/characters/:friend                       (Bearer) { version, updatedAt, save, owned }
 *   PUT  /v1/characters/:friend  gzip JSON { baseVersion, save, reason, importHash? }
 *                                                     (Bearer) → { version, updatedAt } | 409 { version, updatedAt }
 *   GET  /v1/characters/:friend/history               (Bearer) earlier versions kept for recovery
 *   POST /v1/characters/:friend/restore { version }   (Bearer) bring an earlier version back as the newest
 *   GET  /v1/characters/:friend/attestation           (Bearer) the stored version, vouched for: { version, hash, totalXp, trust, at, sig }
 *   /v1/cards/…                                        Adventurer Cards: see cards.ts
 *
 * Rules: a session is made only from a valid signature over a single-use challenge for this site; a character is the
 * pair (wallet, Friend); writing needs the wallet to own the Friend on chain right now; every write names the version
 * it was based on, so an older save can never overwrite a newer one (409 instead); saves are size- and shape-checked
 * and their progress has to be possible in the time since the last save. A character this service watched grow, save by
 * save, within what honest play allows is "verified"; one that took a save from outside that chain stays "unverified"
 * (kept, playable, but not vouched for). See cloud/README.md for the policies.
 */
import { BaseError, ContractFunctionRevertedError, HttpRequestError, createPublicClient, getAddress, http, isAddress, parseAbi, recoverMessageAddress, zeroAddress, type Hex } from "viem";
import { devRoutes, type DevEnv } from "./dev.ts";
import { applySettlements, cardRoutes, cardsChainFor, heldLockbox, lockboxOf, parsePending, sameLockbox, type Bucket, type CardsOptions, type Settlement } from "./cards.ts";

// ---------- Storage (the subset of D1 used here, so tests can supply SQLite) ----------
export type Statement = { bind(...values: unknown[]): Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<{ meta: { changes: number } }> };
export type Database = { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<{ meta: { changes: number } }[]> };
export type Chain = {
  /** The wallet that owns a Friend now, or null if it can't be read. */
  ownerOf(friend: number): Promise<string | null>;
  /** Whether `signature` is `address` signing `message` (plain wallets, and contract wallets through EIP-1271/6492). */
  verify(address: string, message: string, signature: string): Promise<boolean>;
};
export type Env = { DB: Database; RPC_URL: string; COLLECTION: string; CHAIN_ID: string; ORIGINS: string; ATTEST_KEY?: string;
  /** Adventurer Cards (cards.ts): the pictures' bucket, the signing key (a secret), the contract and its chain, and the game's address for the metadata. */
  CARDS?: Bucket; MINTER_KEY?: string; CARDS_CONTRACT?: string; CARDS_CHAIN_ID?: string; CARDS_RPC_URL?: string; GAME_URL?: string;
  /** The private development game (dev.ts): the owner's password hash (a secret); its site lives in the cards' bucket. */
  DEV_PASSWORD_HASH?: string };

export const LIMITS = {
  /** A save's JSON, at most (today's saves are 20–90 KB). */
  saveBytes: 400_000,
  /** The gzip request body, at most. */
  bodyBytes: 200_000,
  challengeMs: 10 * 60_000,
  sessionMs: 30 * 24 * 3_600_000,
  /** Automatic saves at most this often per character (the client sends every 90 s, sooner after milestones). */
  minWriteGapMs: 8_000,
  /** A copy of the previous version is kept at least this often, and on every import, takeover and restore. */
  historyGapMs: 10 * 60_000,
  historyKeep: 12,
  ownerCacheMs: 5 * 60_000,
  /** The most XP a character can plausibly earn per second of real time between saves (generous: ~10.8M an hour). */
  xpPerSecond: 3_000,
  xpSlack: 2_000_000,
  maxXpPerSkill: 200_000_000,
  /** A game tick; how far play time may run ahead of real time between saves (catch-up ticks, clock drift); and slack. */
  tickMs: 600,
  playRate: 1.25,
  playTickSlack: 3_000,
} as const;
const REASONS = new Set(["auto", "event", "import", "takeover", "exit"]);

// ---------- Helpers ----------
const now = () => Date.now();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (text: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
const randomToken = (bytes = 32) => { const b = crypto.getRandomValues(new Uint8Array(bytes)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const iso = (ms: number) => new Date(ms).toISOString();

/** The sign-in message. Everything the server checks is in it, readable by the player in their wallet. */
export function challengeMessage(origin: string, address: string, chainId: number, nonce: string, issued: number, expires: number) {
  return `${new URL(origin).host} wants you to sign in with your Ethereum account:\n${address}\n\n`
    + "Sign in to RareFriends Realm cloud saves. This proves you own this wallet so your adventure can be saved online. It is not a transaction and costs nothing.\n\n"
    + `URI: ${origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${iso(issued)}\nExpiration Time: ${iso(expires)}`;
}
function parseMessage(message: string) {
  const lines = message.split("\n"), field = (name: string) => lines.find(line => line.startsWith(`${name}: `))?.slice(name.length + 2) ?? null;
  return { domain: /^(.+) wants you to sign in with your Ethereum account:$/.exec(lines[0] ?? "")?.[1] ?? null, address: lines[1] ?? null, uri: field("URI"), chainId: field("Chain ID"), nonce: field("Nonce") };
}

/** Every number in an object tree, summed for the XP check. */
const sumXp = (xp: unknown) => !xp || typeof xp !== "object" ? 0 : Object.values(xp as Record<string, unknown>).reduce<number>((sum, value) => sum + (typeof value === "number" && Number.isFinite(value) ? value : 0), 0);
/**
 * The server's check of a save. The game itself re-checks every field when it loads one (engine.ts `restore`), so this
 * keeps out what could hurt storage or other players' expectations: the wrong Friend, wrong shape, oversized or
 * impossible values. It can't make a client-side game cheat-proof, and doesn't pretend to (see README).
 */
export function validateSave(save: unknown, friend: number): { ok: true; totalXp: number; facts: Facts } | { ok: false; reason: string } {
  if (!save || typeof save !== "object" || Array.isArray(save)) return { ok: false, reason: "not a save" };
  const s = save as Record<string, unknown>;
  if (s.v !== 1) return { ok: false, reason: "unknown save version" };
  if (s.friendId !== friend) return { ok: false, reason: "this save is for another Friend" };
  if (!s.xp || typeof s.xp !== "object" || Array.isArray(s.xp)) return { ok: false, reason: "no skills" };
  const xp = Object.entries(s.xp as Record<string, unknown>);
  if (xp.length > 60 || xp.some(([key, value]) => !/^[a-z_]{2,24}$/.test(key) || typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > LIMITS.maxXpPerSkill)) return { ok: false, reason: "impossible skill experience" };
  if (s.inventory !== undefined && (!Array.isArray(s.inventory) || s.inventory.length > 64)) return { ok: false, reason: "impossible inventory" };
  if (s.bank !== undefined && (!Array.isArray(s.bank) || s.bank.length > 5_000)) return { ok: false, reason: "impossible bank" };
  const playTicks = s.playTicks === undefined ? null : s.playTicks;
  if (playTicks !== null && (typeof playTicks !== "number" || !Number.isFinite(playTicks) || playTicks < 0 || playTicks > 1e9)) return { ok: false, reason: "impossible play time" };
  // Shape: plain JSON, sensible keys, no deep or giant structures.
  let nodes = 0;
  const walk = (value: unknown, depth: number): string | null => {
    if (++nodes > 200_000) return "too large";
    if (depth > 8) return "too deeply nested";
    if (typeof value === "string") return value.length > 4_000 ? "text too long" : null;
    if (typeof value === "number") return Number.isFinite(value) ? null : "not a number";
    if (value === null || typeof value === "boolean") return null;
    if (Array.isArray(value)) { if (value.length > 10_000) return "list too long"; for (const entry of value) { const bad = walk(entry, depth + 1); if (bad) return bad; } return null; }
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 10_000) return "too many fields";
      for (const [key, entry] of entries) { if (key.length > 64 || key === "__proto__" || key === "constructor" || key === "prototype") return "bad field name"; const bad = walk(entry, depth + 1); if (bad) return bad; }
      return null;
    }
    return "not plain data";
  };
  const shape = walk(save, 0);
  if (shape) return { ok: false, reason: shape };
  const totalXp = Math.round(sumXp(s.xp));
  return { ok: true, totalXp, facts: { totalXp, xp: Object.fromEntries(xp.map(([skill, value]) => [skill, Math.round(value as number)])), playTicks: playTicks === null ? null : Math.round(playTicks) } };
}
/** What the progress checks compare between saves: XP by skill and in total, and ticks played (null where a save has none). */
export type Facts = { totalXp: number; xp: Record<string, number> | null; playTicks: number | null };
/**
 * Whether `next` could honestly follow `previous` after `elapsedMs` of real time: no skill's XP falls, play time doesn't
 * fall or outrun the clock, and XP outruns neither the clock nor the play time. Null when it could; otherwise why not.
 */
export function implausible(previous: Facts | null, next: Facts, elapsedMs: number): string | null {
  if (!previous) return null;
  const seconds = Math.max(0, elapsedMs / 1000), gained = next.totalXp - previous.totalXp;
  if (previous.xp && next.xp) for (const [skill, xp] of Object.entries(previous.xp)) if ((next.xp[skill] ?? 0) < xp) return `${skill} experience went backwards`;
  if (gained > LIMITS.xpSlack + LIMITS.xpPerSecond * seconds) return "more progress than the time since the last save allows";
  if (previous.playTicks !== null && next.playTicks !== null) {
    const ticks = next.playTicks - previous.playTicks;
    if (ticks < 0) return "play time went backwards";
    if (ticks > LIMITS.playTickSlack + (seconds * 1000 / LIMITS.tickMs) * LIMITS.playRate) return "more play time than the time since the last save allows";
    if (gained > LIMITS.xpSlack + LIMITS.xpPerSecond * ticks * LIMITS.tickMs / 1000) return "more progress than the play time allows";
  }
  return null;
}
/**
 * A stored version, vouched for: the fields the service stands behind, signed with its key (HMAC-SHA256), so a later
 * step that didn't watch the save being stored (a collectible card's snapshot, say) can trust what it's handed.
 */
export async function attest(key: string, claim: { address: string; friend: number; version: number; hash: string; totalXp: number; trust: string; at: number }) {
  const text = ["realm-attestation-1", claim.address, claim.friend, claim.version, claim.hash, claim.totalXp, claim.trust, claim.at].join("\n");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return { ...claim, sig: hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text))) };
}

async function gunzipJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > LIMITS.bodyBytes) throw new HttpError(413, "too large");
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.byteLength > LIMITS.bodyBytes) throw new HttpError(413, "too large");
  const gzipped = request.headers.get("content-encoding") === "gzip" || request.headers.get("content-type") === "application/x-realm-save";
  let text: string;
  if (gzipped) {
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("gzip")), reader = stream.getReader(), parts: Uint8Array[] = [];
    let total = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > LIMITS.saveBytes + 10_000) throw new HttpError(413, "too large"); parts.push(value); }
    const all = new Uint8Array(total); let at = 0; for (const part of parts) { all.set(part, at); at += part.byteLength; }
    text = new TextDecoder().decode(all);
  } else text = new TextDecoder().decode(raw);
  try { return JSON.parse(text); } catch { throw new HttpError(400, "not JSON"); }
}
class HttpError extends Error {
  status: number; extra: Record<string, unknown>;
  constructor(status: number, message: string, extra: Record<string, unknown> = {}) { super(message); this.status = status; this.extra = extra; }
}

// ---------- The app ----------
export function createApp({ db, chain, clock = now, origins, chainId, attestKey = null, cards = null, dev = null }: { db: Database; chain: Chain; clock?: () => number; origins: string[]; chainId: number; attestKey?: string | null; cards?: CardsOptions | null; dev?: DevEnv | null }) {
  const cors = (origin: string | null): Record<string, string> => origin && origins.includes(origin)
    ? { "access-control-allow-origin": origin, "access-control-allow-methods": "GET,POST,PUT,OPTIONS", "access-control-allow-headers": "authorization,content-type,content-encoding", "access-control-max-age": "600", vary: "origin" } : { vary: "origin" };
  const json = (origin: string | null, status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...cors(origin), ...headers } });

  async function session(request: Request) {
    const token = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(request.headers.get("authorization") ?? "")?.[1];
    if (!token) throw new HttpError(401, "sign in");
    const row = await db.prepare("SELECT address, expires_at FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first<{ address: string; expires_at: number }>();
    if (!row || row.expires_at < clock()) throw new HttpError(401, "sign in again");
    return { address: row.address, token };
  }
  async function owns(address: string, friend: number) {
    const cached = await db.prepare("SELECT address, checked_at FROM owners WHERE friend_id = ?").bind(friend).first<{ address: string; checked_at: number }>();
    if (cached && clock() - cached.checked_at < LIMITS.ownerCacheMs) return cached.address === address;
    const owner = await chain.ownerOf(friend);
    if (!owner) { if (cached) return cached.address === address; throw new HttpError(503, "the chain couldn't be read; your save is kept on this device", { retry: true }); }
    const normal = getAddress(owner);
    await db.prepare("INSERT INTO owners (friend_id, address, checked_at) VALUES (?, ?, ?) ON CONFLICT(friend_id) DO UPDATE SET address = excluded.address, checked_at = excluded.checked_at").bind(friend, normal, clock()).run();
    return normal === address;
  }
  const characterOf = (address: string, friend: number) => db.prepare("SELECT version, save, save_hash, trust FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ version: number; save: string; save_hash: string | null; trust: string }>();
  /** A redemption's settlement, written into a stored character now and left pending for sessions still on an older save. */
  const settle = async (address: string, friend: number, settlement: Settlement) => {
    const current = await db.prepare("SELECT version, save, pending FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ version: number; save: string; pending: string | null }>();
    if (!current) return false;
    const save = JSON.parse(current.save) as Record<string, unknown>;
    applySettlements(save, [settlement]);
    const checked = validateSave(save, friend);
    if (!checked.ok) return false;
    const text = JSON.stringify(save), at = clock(), version = current.version + 1, pending = JSON.stringify([...parsePending(current.pending), settlement].slice(-20));
    const results = await db.batch([
      db.prepare("INSERT OR REPLACE INTO history (address, friend_id, version, save, saved_at, reason, save_hash) SELECT address, friend_id, version, save, ?, 'settlement', save_hash FROM characters WHERE address = ? AND friend_id = ? AND version = ?").bind(at, address, friend, current.version),
      db.prepare("UPDATE characters SET version = ?, save = ?, size = ?, total_xp = ?, updated_at = ?, save_hash = ?, facts = ?, pending = ? WHERE address = ? AND friend_id = ? AND version = ?")
        .bind(version, text, text.length, checked.totalXp, at, await sha256(text), JSON.stringify(checked.facts), pending, address, friend, current.version),
    ]);
    return !!results[1]?.meta.changes;
  };
  const cardsRoute = cards ? cardRoutes(db, cards, { clock, session, owns, json, characterOf, settle }) : null;
  const devRoute = dev ? devRoutes(db, dev, clock) : null;
  const friendOf = (text: string) => { const id = Number(text); if (!/^[0-9]{1,15}$/.test(text) || !Number.isSafeInteger(id)) throw new HttpError(400, "bad Friend"); return id; };

  async function route(request: Request, url: URL, origin: string | null): Promise<Response> {
    const path = url.pathname, method = request.method;
    if (path === "/v1/health") return json(origin, 200, { ok: true });
    // ---------- Sign in ----------
    if (path === "/v1/auth/challenge" && method === "POST") {
      if (!origin || !origins.includes(origin)) throw new HttpError(403, "this site can't sign in here");
      const body = await request.json().catch(() => null) as { address?: unknown } | null;
      if (!body || typeof body.address !== "string" || !isAddress(body.address)) throw new HttpError(400, "bad address");
      const address = getAddress(body.address), nonce = randomToken(16).replace(/[^A-Za-z0-9]/g, "").slice(0, 17).padEnd(17, "0"), issued = clock(), expires = issued + LIMITS.challengeMs;
      await db.batch([
        db.prepare("DELETE FROM nonces WHERE expires_at < ?").bind(issued),
        db.prepare("INSERT INTO nonces (nonce, address, origin, expires_at) VALUES (?, ?, ?, ?)").bind(nonce, address, origin, expires),
      ]);
      return json(origin, 200, { message: challengeMessage(origin, address, chainId, nonce, issued, expires), nonce, expiresAt: expires });
    }
    if (path === "/v1/auth/verify" && method === "POST") {
      if (!origin || !origins.includes(origin)) throw new HttpError(403, "this site can't sign in here");
      const body = await request.json().catch(() => null) as { message?: unknown; signature?: unknown } | null;
      if (!body || typeof body.message !== "string" || body.message.length > 2_000 || typeof body.signature !== "string" || !/^0x[0-9a-fA-F]{130,20000}$/.test(body.signature)) throw new HttpError(400, "bad sign-in");
      const parsed = parseMessage(body.message);
      if (!parsed.nonce || !parsed.address || !isAddress(parsed.address)) throw new HttpError(400, "bad sign-in");
      const address = getAddress(parsed.address);
      const row = await db.prepare("SELECT address, origin, expires_at, used FROM nonces WHERE nonce = ?").bind(parsed.nonce).first<{ address: string; origin: string; expires_at: number; used: number }>();
      if (!row || row.used || row.expires_at < clock() || row.address !== address || row.origin !== origin) throw new HttpError(401, "that sign-in has expired: try again");
      // The message must be exactly the one issued (nothing added, nothing changed).
      const issuedAt = Date.parse(/Issued At: (.+)/.exec(body.message)?.[1] ?? "");
      if (body.message !== challengeMessage(origin, address, chainId, parsed.nonce, issuedAt, row.expires_at)) throw new HttpError(401, "that sign-in doesn't match");
      // Single use: claim the nonce before anything else, so a replay loses even if it races.
      const claimed = await db.prepare("UPDATE nonces SET used = 1 WHERE nonce = ? AND used = 0").bind(parsed.nonce).run();
      if (!claimed.meta.changes) throw new HttpError(401, "that sign-in was already used");
      if (!await chain.verify(address, body.message, body.signature)) throw new HttpError(401, "the signature doesn't match this wallet");
      const token = randomToken(32), at = clock(), expires = at + LIMITS.sessionMs;
      await db.batch([
        db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(at),
        db.prepare("INSERT INTO sessions (token_hash, address, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), address, at, expires),
      ]);
      return json(origin, 200, { token, address, expiresAt: expires });
    }
    if (path === "/v1/auth/logout" && method === "POST") {
      const { token } = await session(request);
      await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
      return json(origin, 200, { ok: true });
    }
    // ---------- Characters ----------
    if (path === "/v1/characters" && method === "GET") {
      const { address } = await session(request);
      const rows = await db.prepare("SELECT friend_id, version, updated_at, total_xp, trust FROM characters WHERE address = ? ORDER BY updated_at DESC").bind(address).all<{ friend_id: number; version: number; updated_at: number; total_xp: number; trust: string }>();
      return json(origin, 200, { characters: rows.results.map(row => ({ friend: row.friend_id, version: row.version, updatedAt: row.updated_at, totalXp: row.total_xp, trust: row.trust })) });
    }
    const match = /^\/v1\/characters\/([^/]+)(\/history|\/restore|\/attestation)?$/.exec(path);
    if (match) {
      const friend = friendOf(match[1]), { address } = await session(request), part = match[2] ?? "";
      if (part === "" && method === "GET") {
        const row = await db.prepare("SELECT version, save, updated_at, imported_at, trust, trust_note FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ version: number; save: string; updated_at: number; imported_at: number | null; trust: string; trust_note: string | null }>();
        if (!row) return json(origin, 404, { error: "no cloud save yet", version: 0 });
        // Your own character is always yours to read and export, even after the Friend has moved to another wallet.
        let owned: boolean | null = null; try { owned = await owns(address, friend); } catch { owned = null; }
        return json(origin, 200, { version: row.version, updatedAt: row.updated_at, importedAt: row.imported_at, save: JSON.parse(row.save), owned, trust: row.trust, trustNote: row.trust_note });
      }
      if (part === "" && method === "PUT") {
        const body = await gunzipJson(request) as { baseVersion?: unknown; save?: unknown; reason?: unknown; importHash?: unknown };
        const baseVersion = body?.baseVersion, reason = typeof body?.reason === "string" && REASONS.has(body.reason) ? body.reason : "auto";
        if (typeof baseVersion !== "number" || !Number.isSafeInteger(baseVersion) || baseVersion < 0) throw new HttpError(400, "bad version");
        const importHash = reason === "import" && typeof body.importHash === "string" && /^[0-9a-f]{64}$/.test(body.importHash) ? body.importHash : null;
        if (reason === "import" && !importHash) throw new HttpError(400, "an import needs its hash");
        let checked = validateSave(body.save, friend);
        if (!checked.ok) throw new HttpError(422, `save rejected: ${checked.reason}`);
        // A redemption this session hasn't taken yet (it's playing an older save) is settled into the save first, so the
        // stored progress stays settled whatever the session knew; the game carries the marks once it loads the settled save.
        const settlements = await db.prepare("SELECT pending FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ pending: string | null }>();
        const pendingList = parsePending(settlements?.pending), drop = reason !== "import";
        if (pendingList.length && applySettlements(body.save as Record<string, unknown>, pendingList)) { checked = validateSave(body.save, friend); if (!checked.ok) throw new HttpError(422, `save rejected: ${checked.reason}`); }
        const text = JSON.stringify(body.save);
        if (text.length > LIMITS.saveBytes) throw new HttpError(413, "save too large");
        if (!await owns(address, friend)) throw new HttpError(403, "this wallet doesn't own this Friend now, so it can't save over it");
        // A card out (cards.ts) holds its lockbox: the save must keep exactly what the card stands for.
        const held = cards ? await heldLockbox(db, address, friend) : null;
        if (held) { const box = lockboxOf(body.save); if (!box || !sameLockbox(box, held)) throw new HttpError(422, "save rejected: the lockbox holds what your card stands for, and can't change while the card is out"); }
        const at = clock();
        const current = await db.prepare("SELECT version, updated_at, total_xp, facts, trust, trust_note, trust_version FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend)
          .first<{ version: number; updated_at: number; total_xp: number; facts: string | null; trust: string; trust_note: string | null; trust_version: number | null }>();
        if (importHash) {
          const done = await db.prepare("SELECT version FROM imports WHERE address = ? AND friend_id = ? AND hash = ?").bind(address, friend, importHash).first<{ version: number }>();
          if (done) return json(origin, 200, { version: current?.version ?? done.version, updatedAt: current?.updated_at ?? at, duplicate: true });
        }
        if ((current?.version ?? 0) !== baseVersion) throw new HttpError(409, "a newer save exists", { version: current?.version ?? 0, updatedAt: current?.updated_at ?? null });
        if (current && reason === "auto" && at - current.updated_at < LIMITS.minWriteGapMs) throw new HttpError(429, "saving too often", { retryAfterMs: LIMITS.minWriteGapMs - (at - current.updated_at) });
        // Progress has to be possible in the time since the last save. An automatic save that isn't is refused; an import or a
        // takeover is the player's explicit choice, so it's kept, but the character stops being verified.
        const previous: Facts | null = current ? (current.facts ? JSON.parse(current.facts) as Facts : { totalXp: current.total_xp, xp: null, playTicks: null }) : null;
        const problem = current ? implausible(previous, checked.facts, at - current.updated_at) : null;
        if (problem && reason !== "import" && reason !== "takeover") throw new HttpError(422, `save rejected: ${problem}`);
        // Trust. Verified progress is progress this service watched grow, save by save, within what honest play allows; a
        // character that was here before trust was recorded is trusted as it stands, and so is the first import of a
        // character the cloud has never seen (the adventure brought in from a browser). It stops being verified, for good,
        // when a save comes from outside that chain: an import of something this service never stored, an import or a
        // takeover beyond what play allows, an earlier version brought back, or a new character that didn't start from nothing.
        let trust = current?.trust ?? "verified", note = current?.trust_note ?? null;
        const distrust = (why: string) => { if (trust === "verified") { trust = "unverified"; note = why; } };
        if (!current && reason !== "import" && checked.totalXp > LIMITS.xpSlack) distrust("a new character that didn't start from nothing");
        if (problem) distrust(`${reason}: ${problem}`);
        if (importHash && current) {
          const ours = await db.prepare("SELECT 1 AS ok FROM characters WHERE address = ? AND friend_id = ? AND save_hash = ? UNION SELECT 1 FROM history WHERE address = ? AND friend_id = ? AND save_hash = ?").bind(address, friend, importHash, address, friend, importHash).first();
          if (!ours) distrust("imported from outside the cloud");
        }
        const version = baseVersion + 1, statements: Statement[] = [], hash = await sha256(text), facts = JSON.stringify(checked.facts);
        const trustVersion = current && trust === current.trust ? current.trust_version : version;
        if (!current) statements.push(db.prepare("INSERT INTO characters (address, friend_id, version, save, size, total_xp, created_at, updated_at, imported_at, save_hash, facts, trust, trust_note, trust_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(address, friend, version, text, text.length, checked.totalXp, at, at, importHash ? at : null, hash, facts, trust, note, version));
        else {
          // Keep the version being replaced (every so often, and always before an import or takeover).
          const last = await db.prepare("SELECT MAX(saved_at) AS at FROM history WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ at: number | null }>();
          if (reason === "import" || reason === "takeover" || !last?.at || at - last.at >= LIMITS.historyGapMs) {
            statements.push(db.prepare("INSERT OR REPLACE INTO history (address, friend_id, version, save, saved_at, reason, save_hash) SELECT address, friend_id, version, save, ?, ?, save_hash FROM characters WHERE address = ? AND friend_id = ? AND version = ?").bind(at, reason, address, friend, baseVersion));
            statements.push(db.prepare("DELETE FROM history WHERE address = ? AND friend_id = ? AND version NOT IN (SELECT version FROM history WHERE address = ? AND friend_id = ? ORDER BY version DESC LIMIT ?)").bind(address, friend, address, friend, LIMITS.historyKeep));
          }
          // Settlements the save now carries are done with; the rest stay pending for other sessions.
          const carried = new Set(Array.isArray((body.save as { settled?: unknown }).settled) ? (body.save as { settled: unknown[] }).settled : []), stillPending = pendingList.filter(entry => !carried.has(entry.token));
          statements.push(db.prepare(`UPDATE characters SET version = ?, save = ?, size = ?, total_xp = ?, updated_at = ?, save_hash = ?, facts = ?, trust = ?, trust_note = ?, trust_version = ?, pending = ?${importHash ? ", imported_at = ?" : ""} WHERE address = ? AND friend_id = ? AND version = ?`)
            .bind(...[version, text, text.length, checked.totalXp, at, hash, facts, trust, note, trustVersion, drop && stillPending.length === 0 ? null : JSON.stringify(stillPending), ...(importHash ? [at] : []), address, friend, baseVersion]));
        }
        // The import is recorded only if the write itself landed (same transaction, after it).
        if (importHash) statements.push(db.prepare("INSERT OR IGNORE INTO imports (address, friend_id, hash, version, at) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM characters WHERE address = ? AND friend_id = ? AND version = ? AND updated_at = ?)")
          .bind(address, friend, importHash, version, at, address, friend, version, at));
        let results: { meta: { changes: number } }[];
        try { results = await db.batch(statements); }
        catch { const now2 = await db.prepare("SELECT version, updated_at FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ version: number; updated_at: number }>(); throw new HttpError(409, "a newer save exists", { version: now2?.version ?? 0, updatedAt: now2?.updated_at ?? null }); }
        const write = results[current ? statements.length - (importHash ? 2 : 1) : 0];
        if (!write?.meta.changes) { const now2 = await db.prepare("SELECT version, updated_at FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ version: number; updated_at: number }>(); throw new HttpError(409, "a newer save exists", { version: now2?.version ?? 0, updatedAt: now2?.updated_at ?? null }); }
        return json(origin, 200, { version, updatedAt: at, trust });
      }
      if (part === "/attestation" && method === "GET") {
        if (!attestKey) throw new HttpError(503, "attestations aren't available");
        const row = await db.prepare("SELECT version, save, updated_at, total_xp, save_hash, trust, trust_note FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend)
          .first<{ version: number; save: string; updated_at: number; total_xp: number; save_hash: string | null; trust: string; trust_note: string | null }>();
        if (!row) throw new HttpError(404, "no cloud save yet");
        const claim = await attest(attestKey, { address, friend, version: row.version, hash: row.save_hash ?? await sha256(row.save), totalXp: row.total_xp, trust: row.trust, at: row.updated_at });
        return json(origin, 200, { ...claim, trustNote: row.trust_note });
      }
      if (part === "/history" && method === "GET") {
        const rows = await db.prepare("SELECT version, saved_at, reason, LENGTH(save) AS size FROM history WHERE address = ? AND friend_id = ? ORDER BY version DESC").bind(address, friend).all<{ version: number; saved_at: number; reason: string; size: number }>();
        return json(origin, 200, { versions: rows.results.map(row => ({ version: row.version, savedAt: row.saved_at, reason: row.reason, size: row.size })) });
      }
      if (part === "/restore" && method === "POST") {
        const body = await request.json().catch(() => null) as { version?: unknown } | null;
        if (!body || typeof body.version !== "number") throw new HttpError(400, "bad version");
        if (!await owns(address, friend)) throw new HttpError(403, "this wallet doesn't own this Friend now");
        const old = await db.prepare("SELECT save, save_hash FROM history WHERE address = ? AND friend_id = ? AND version = ?").bind(address, friend, body.version).first<{ save: string; save_hash: string | null }>();
        const current = await db.prepare("SELECT version, save, save_hash FROM characters WHERE address = ? AND friend_id = ?").bind(address, friend).first<{ version: number; save: string; save_hash: string | null }>();
        if (!old || !current) throw new HttpError(404, "no such version");
        const at = clock(), version = current.version + 1, checked = validateSave(JSON.parse(old.save), friend);
        if (!checked.ok) throw new HttpError(422, "that version can't be restored");
        // An earlier version brought back is the player's choice, not progress the service watched: the character stays, unverified.
        await db.batch([
          db.prepare("INSERT OR REPLACE INTO history (address, friend_id, version, save, saved_at, reason, save_hash) VALUES (?, ?, ?, ?, ?, 'restore', ?)").bind(address, friend, current.version, current.save, at, current.save_hash),
          db.prepare("UPDATE characters SET version = ?, save = ?, size = ?, total_xp = ?, updated_at = ?, save_hash = ?, facts = ?, trust = 'unverified', trust_note = ?, trust_version = ? WHERE address = ? AND friend_id = ? AND version = ?")
            .bind(version, old.save, old.save.length, checked.totalXp, at, old.save_hash ?? await sha256(old.save), JSON.stringify(checked.facts), `restored version ${body.version}`, version, address, friend, current.version),
        ]);
        return json(origin, 200, { version, updatedAt: at, trust: "unverified" });
      }
    }
    if (cardsRoute) { const response = await cardsRoute(request, url, origin); if (response) return response; }
    throw new HttpError(404, "not found");
  }

  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url), origin = request.headers.get("origin");
      // The private development game lives on this Worker's own origin, behind its own login (dev.ts).
      if (devRoute && url.pathname.startsWith("/dev")) { if (origin && origin !== url.origin) return json(null, 403, { error: "not from the development game" }); const response = await devRoute(request, url); if (response) return response; }
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
      // Browsers only: a request from a page that isn't the Realm's is refused outright.
      if (origin && !origins.includes(origin)) return json(origin, 403, { error: "this site can't use Realm cloud saves" });
      try { return await route(request, url, origin); }
      catch (error) {
        if (error instanceof HttpError || (error instanceof Error && typeof (error as { status?: unknown }).status === "number")) { const e = error as HttpError; return json(origin, e.status, { error: e.message, ...(e.extra ?? {}) }); }
        console.error(error);
        return json(origin, 500, { error: "the save service had a problem; your save is kept on this device", retry: true });
      }
    },
  };
}

// ---------- The chain: ownership reads and signature checks on Robinhood Chain ----------
export function chainFor(env: Pick<Env, "RPC_URL" | "COLLECTION">): Chain {
  const client = createPublicClient({ transport: http(env.RPC_URL, { timeout: 8_000, retryCount: 3, retryDelay: 400 }) });
  const abi = parseAbi(["function ownerOf(uint256 tokenId) view returns (address)"]);
  return {
    async ownerOf(friend) {
      try { return await client.readContract({ address: env.COLLECTION as `0x${string}`, abi, functionName: "ownerOf", args: [BigInt(friend)] }); }
      catch (error) {
        // A Friend that doesn't exist reverts: nobody owns it. Anything else is the chain being unreachable.
        if (error instanceof BaseError && error.walk(e => e instanceof ContractFunctionRevertedError)) return zeroAddress;
        const http = error instanceof BaseError ? error.walk(e => e instanceof HttpRequestError) as HttpRequestError | null : null;
        console.warn("ownerOf failed", friend, http ? `status ${http.status} ${String(http.details).slice(0, 200)}` : error instanceof Error ? error.message.slice(0, 300) : error);
        return null;
      }
    },
    async verify(address, message, signature) {
      try { if (getAddress(await recoverMessageAddress({ message, signature: signature as Hex })) === getAddress(address)) return true; } catch { /* not a plain signature: try contract wallets */ }
      try { return await client.verifyMessage({ address: address as `0x${string}`, message, signature: signature as Hex }); } catch { return false; }
    },
  };
}

export default {
  fetch(request: Request, env: Env) {
    const cards: CardsOptions = { minterKey: env.MINTER_KEY ?? null, contract: env.CARDS_CONTRACT || null, chainId: Number(env.CARDS_CHAIN_ID ?? 46630), bucket: env.CARDS ?? null,
      chain: env.CARDS_CONTRACT && env.CARDS_RPC_URL ? cardsChainFor(env.CARDS_RPC_URL, env.CARDS_CONTRACT) : null, baseUrl: new URL(request.url).origin, gameUrl: env.GAME_URL ?? "https://m4s4t0-v01d.github.io/rarefriends-realm/" };
    return createApp({ db: env.DB, chain: chainFor(env), origins: env.ORIGINS.split(",").map(origin => origin.trim()), chainId: Number(env.CHAIN_ID), attestKey: env.ATTEST_KEY ?? null, cards, dev: { DB: env.DB, DEV_PASSWORD_HASH: env.DEV_PASSWORD_HASH, bucket: env.CARDS ?? null } }).fetch(request);
  },
};
