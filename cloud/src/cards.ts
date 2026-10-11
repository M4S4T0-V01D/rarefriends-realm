/**
 * Adventurer Cards: the save service's half of the Realm's collectible cards (contracts/AdventurerCards.sol is the
 * other half). A card is a snapshot of a verified character's progress (its XP, and the items the player put in the
 * card's lockbox), held here in escrow and minted on Robinhood Chain by the player with a voucher this service signs.
 *
 *   POST /v1/cards/prepare { friend, layout, show }   (Bearer) a card for this character: its snapshot, and the voucher to mint it
 *   PUT  /v1/cards/:id/image  image/png                (Bearer) the card's picture, drawn by the game
 *   POST /v1/cards/:id/submitted { txHash }            (Bearer) the player sent the mint; the service checks the chain
 *   POST /v1/cards/:id/confirm                         (Bearer) check the chain again (a receipt that wasn't in yet)
 *   POST /v1/cards/:id/cancel                          (Bearer) give it up before it's minted: the lockbox opens again
 *   GET  /v1/cards/held                                (Bearer) the active cards this wallet holds on chain (any character's)
 *   POST /v1/cards/:id/redeem { txHash, friend }       (Bearer) the holder burned the card: its progress settles onto this character
 *   GET  /v1/characters/:friend/card                   (Bearer) this character's card, if it has one out
 *   GET  /v1/cards/collection                                   the collection's own metadata (OpenSea's contractURI)
 *   GET  /v1/cards/:id                                          a minted card's metadata (the token URI)
 *   GET  /v1/cards/:id/image                                    its picture
 *
 * The lifecycle: prepared → reserved (the voucher is signed; from here the save's lockbox can't change) → submitted
 * (a transaction was sent) → active (the chain shows the mint) → redeemed (the chain shows the burn; settled in the
 * game). A reserved card the player cancels, or whose voucher expires unsent, is cancelled and its lockbox opens.
 *
 * Redemption settles exactly what the card stands for: the redeemer's character gains the snapshot's XP in every skill
 * and its items (into the bank); the original character loses that XP (keeping what it earned since the mint; never
 * below Hitpoints 10) and the lockbox empties. Both settlements are written to the stored saves at once and kept
 * pending for any session still playing an older save: every save that comes in without the card marked as settled
 * has the settlement applied before anything else, until the game carries the mark (`settled` in the save).
 *
 * What's never here: anything of a Friend itself. A card stands for Realm progress only, never a Friend's generation,
 * family or any state on chain. The player's wallet pays the gas and holds the card; this service holds one signing
 * key (MINTER_KEY, a Worker secret), signs vouchers with it, and never holds funds.
 */
import { createPublicClient, getAddress, http, keccak256, parseAbi, parseEventLogs, stringToBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Database, Statement } from "./worker.ts";

/** The subset of an R2 bucket used here (so tests can supply a Map). */
export type Bucket = {
  put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<unknown>;
};
/** What the chain shows of a mint transaction: not yet in, failed, or the cards it minted. */
export type MintReceipt = { status: "pending" } | { status: "failed" } | { status: "success"; minted: { tokenId: bigint; to: string; character: Hex; snapshot: Hex }[]; redeemed?: { tokenId: bigint; by: string; character: Hex; snapshot: Hex }[] };
export type CardsChain = { receipt(txHash: Hex): Promise<MintReceipt>; ownerOf(tokenId: number): Promise<string | null> };
export type CardsOptions = {
  /** The signing key (a Worker secret). Without it, cards can't be prepared. */
  minterKey: string | null;
  /** The deployed contract and its chain. */
  contract: string | null; chainId: number;
  bucket: Bucket | null; chain: CardsChain | null;
  /** Where the metadata says the pictures and the game are. */
  baseUrl: string; gameUrl: string;
};
export const CARD_LIMITS = { voucherMs: 60 * 60_000, imageBytes: 400_000, maxLockbox: 28, maxShow: 8, layoutPattern: /^[a-z]{2,24}$/ } as const;
export const CARD_STATES = ["prepared", "reserved", "submitted", "active", "redeemed", "cancelled"] as const;
/** States in which the card's lockbox is held: the save can't change it. */
export const HELD_STATES = new Set(["reserved", "submitted", "active"]);
export const CARDS_ABI = parseAbi([
  "event CardMinted(uint256 indexed tokenId, address indexed to, bytes32 indexed character, bytes32 snapshot)",
  "event CardRedeemed(uint256 indexed tokenId, address indexed by, bytes32 indexed character, bytes32 snapshot)",
  "function mint(uint256 tokenId, bytes32 character, bytes32 snapshot, uint256 deadline, bytes signature)",
  "function redeem(uint256 tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);
export const VOUCHER_TYPES = { CardVoucher: [{ name: "to", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "character", type: "bytes32" }, { name: "snapshot", type: "bytes32" }, { name: "deadline", type: "uint256" }] } as const;
export const voucherDomain = (chainId: number, contract: string) => ({ name: "RareFriends Realm Adventurer Cards", version: "1", chainId, verifyingContract: getAddress(contract) }) as const;

/** The key a character has on chain: the wallet and the Friend, hashed. Never the Friend's own identity. */
export const characterKey = (address: string, friend: number): Hex => keccak256(stringToBytes(`${getAddress(address).toLowerCase()}:${friend}`));
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (text: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));

export type LockboxSlot = { id: string; n: number };
/** What a card stands for, read from the stored save when it's prepared; the chain commits to its hash. */
export type Snapshot = {
  v: 1; address: string; friendId: number; version: number; saveHash: string; at: number;
  /** Every skill's XP at the time (the redemption's clawback is exactly this). */
  xp: Record<string, number>;
  /** The items in the card's lockbox (eligibility is the game's: cardescrow.ts). */
  items: LockboxSlot[];
  /** What the picture shows (display only). */
  layout: string; show: string[]; facts: Record<string, unknown>;
};
export type CardRow = { token_id: number; address: string; friend_id: number; character: string; state: string; snapshot: string; snapshot_hash: string; voucher: string | null; deadline: number | null; tx_hash: string | null; holder: string | null; image: number; created_at: number; updated_at: number; redeemed_by: string | null; redeemed_at: number | null };
/** A settlement a character still has to take: XP by skill (signed), items into the bank, the lockbox emptied, and a word to the player. */
export type Settlement = { token: number; xp: Record<string, number>; items: LockboxSlot[]; clearLockbox: boolean; notice: string };
const HITPOINTS_FLOOR = 1154;
/** Apply the settlements a save hasn't taken yet (by its `settled` marks), in place; returns whether anything was applied. */
export function applySettlements(save: Record<string, unknown>, pending: Settlement[]): boolean {
  const done = new Set(Array.isArray(save.settled) ? (save.settled as unknown[]).filter((entry): entry is number => typeof entry === "number") : []);
  let applied = false;
  for (const entry of pending) {
    if (done.has(entry.token)) continue;
    const xp = (save.xp && typeof save.xp === "object" ? save.xp : (save.xp = {})) as Record<string, number>;
    for (const [skill, delta] of Object.entries(entry.xp)) xp[skill] = Math.max(skill === "hitpoints" ? HITPOINTS_FLOOR : 0, Math.round((typeof xp[skill] === "number" ? xp[skill] : 0) + delta));
    if (entry.items.length) {
      const bank = (Array.isArray(save.bank) ? save.bank : (save.bank = [])) as { id: string; n: number; tab?: number }[];
      for (const item of entry.items) { const stack = bank.find(slot => slot && slot.id === item.id); if (stack) stack.n += item.n; else bank.push({ id: item.id, n: item.n }); }
    }
    if (entry.clearLockbox) save.lockbox = [];
    const notices = (Array.isArray(save.notices) ? save.notices : (save.notices = [])) as string[];
    if (entry.notice && notices.length < 20) notices.push(entry.notice);
    done.add(entry.token); applied = true;
  }
  save.settled = [...done].slice(-50);
  return applied;
}
export const parsePending = (text: string | null | undefined): Settlement[] => { if (!text) return []; try { const list = JSON.parse(text); return Array.isArray(list) ? list as Settlement[] : []; } catch { return []; } };

/** The lockbox as a save carries it: plain slots, sorted, so two saves' lockboxes compare by text. */
export function lockboxOf(save: unknown): LockboxSlot[] | null {
  const raw = (save as { lockbox?: unknown } | null)?.lockbox;
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > CARD_LIMITS.maxLockbox) return null;
  const out: LockboxSlot[] = [];
  for (const slot of raw) {
    if (!slot || typeof slot !== "object") return null;
    const { id, n } = slot as Record<string, unknown>;
    if (typeof id !== "string" || !/^[a-z0-9_]{1,48}$/.test(id) || typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 2_000_000_000) return null;
    out.push({ id, n });
  }
  return out.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.n - b.n);
}
export const sameLockbox = (a: LockboxSlot[], b: LockboxSlot[]) => JSON.stringify(a) === JSON.stringify(b);

class HttpError extends Error { status: number; extra: Record<string, unknown>; constructor(status: number, message: string, extra: Record<string, unknown> = {}) { super(message); this.status = status; this.extra = extra; } }

/** The chain, for real: receipts of mint transactions on Robinhood Chain. */
export function cardsChainFor(rpcUrl: string, contract: string): CardsChain {
  const client = createPublicClient({ transport: http(rpcUrl, { timeout: 8_000, retryCount: 2, retryDelay: 400 }) });
  return {
    async receipt(txHash) {
      let receipt;
      try { receipt = await client.getTransactionReceipt({ hash: txHash }); } catch { return { status: "pending" }; }
      if (receipt.status !== "success") return { status: "failed" };
      const ours = receipt.logs.filter(log => log.address.toLowerCase() === contract.toLowerCase());
      const minted = parseEventLogs({ abi: CARDS_ABI, eventName: "CardMinted", logs: ours }), redeemed = parseEventLogs({ abi: CARDS_ABI, eventName: "CardRedeemed", logs: ours });
      return { status: "success", minted: minted.map(log => ({ tokenId: log.args.tokenId, to: log.args.to, character: log.args.character, snapshot: log.args.snapshot })), redeemed: redeemed.map(log => ({ tokenId: log.args.tokenId, by: log.args.by, character: log.args.character, snapshot: log.args.snapshot })) };
    },
    async ownerOf(tokenId) {
      try { return await client.readContract({ address: contract as Hex, abi: CARDS_ABI, functionName: "ownerOf", args: [BigInt(tokenId)] }); } catch { return null; }
    },
  };
}

/**
 * The card routes. `session`, `owns` and `json` are the Worker's own (worker.ts); `characterOf` reads the stored
 * character. Returns a Response, or null when the path isn't a card route.
 */
export function cardRoutes(db: Database, options: CardsOptions, helpers: {
  clock: () => number;
  session(request: Request): Promise<{ address: string }>;
  owns(address: string, friend: number): Promise<boolean>;
  json(origin: string | null, status: number, body: unknown, headers?: Record<string, string>): Response;
  characterOf(address: string, friend: number): Promise<{ version: number; save: string; save_hash: string | null; trust: string } | null>;
  /** Write a settlement into a stored character: its save changed (a new version, the old kept), and the settlement left pending for sessions on older saves. */
  settle(address: string, friend: number, settlement: Settlement): Promise<boolean>;
}) {
  const { clock, session, owns, json, characterOf, settle } = helpers;
  const row = (id: number) => db.prepare("SELECT * FROM cards WHERE token_id = ?").bind(id).first<CardRow>();
  const outstanding = (address: string, friend: number) => db.prepare("SELECT * FROM cards WHERE address = ? AND friend_id = ? AND state IN ('prepared', 'reserved', 'submitted', 'active') ORDER BY token_id DESC").bind(address, friend).first<CardRow>();
  const setState = (id: number, state: string, extra: Record<string, unknown> = {}) => {
    const keys = Object.keys(extra);
    return db.prepare(`UPDATE cards SET state = ?, updated_at = ?${keys.map(key => `, ${key} = ?`).join("")} WHERE token_id = ?`).bind(state, clock(), ...keys.map(key => extra[key]), id);
  };
  const publicCard = (card: CardRow) => ({ tokenId: card.token_id, state: card.state, snapshotHash: card.snapshot_hash, txHash: card.tx_hash, holder: card.holder, deadline: card.deadline, createdAt: card.created_at, updatedAt: card.updated_at, image: !!card.image, contract: options.contract, chainId: options.chainId });
  const tokenId = (text: string) => { const id = Number(text); if (!/^[0-9]{1,12}$/.test(text) || !Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "bad card"); return id; };
  /** Look at the chain for a submitted card's mint, and settle what it shows. */
  const reconcile = async (card: CardRow): Promise<CardRow> => {
    if (card.state !== "submitted" || !card.tx_hash || !options.chain) return card;
    const receipt = await options.chain.receipt(card.tx_hash as Hex);
    if (receipt.status === "pending") return card;
    if (receipt.status === "failed") { await setState(card.token_id, "reserved", { tx_hash: null }).run(); return (await row(card.token_id))!; }
    const mine = receipt.minted.find(entry => Number(entry.tokenId) === card.token_id && entry.snapshot.toLowerCase() === card.snapshot_hash.toLowerCase());
    if (!mine) { await setState(card.token_id, "reserved", { tx_hash: null }).run(); return (await row(card.token_id))!; }
    await setState(card.token_id, "active", { holder: getAddress(mine.to) }).run();
    return (await row(card.token_id))!;
  };

  return async function route(request: Request, url: URL, origin: string | null): Promise<Response | null> {
    const path = url.pathname, method = request.method;
    // ---------- Public: the collection's and a card's metadata, and its picture ----------
    if (path === "/v1/cards/collection" && method === "GET") {
      return json(origin, 200, { name: "RareFriends Realm", description: "Adventurer Cards from RareFriends Realm: each a one-of-one snapshot of a Realm character's progress, held in the Realm until the card is redeemed.", image: `${options.gameUrl}preview/realm-card.png`, external_link: options.gameUrl }, { "cache-control": "public, max-age=3600" });
    }
    const pub = /^\/v1\/cards\/([0-9]+)(\/image)?$/.exec(path);
    if (pub && method === "GET") {
      const card = await row(tokenId(pub[1]));
      if (!card || (card.state !== "active" && card.state !== "redeemed")) throw new HttpError(404, "no such card");
      if (pub[2]) {
        const object = options.bucket ? await options.bucket.get(`cards/${card.token_id}.png`) : null;
        if (!object) throw new HttpError(404, "no picture");
        return new Response(await object.arrayBuffer(), { status: 200, headers: { "content-type": object.httpMetadata?.contentType ?? "image/png", "cache-control": "public, max-age=86400", "access-control-allow-origin": "*" } });
      }
      const snapshot = JSON.parse(card.snapshot) as Snapshot, facts = snapshot.facts as Record<string, unknown>;
      const attributes = [
        { trait_type: "Layout", value: snapshot.layout }, { trait_type: "Family", value: String(facts.family ?? "") }, { trait_type: "Combat level", value: Number(facts.combat ?? 0) },
        { trait_type: "Total level", value: Number(facts.total ?? 0) }, { trait_type: "Quest points", value: Number(facts.questPoints ?? 0) }, { trait_type: "Items", value: snapshot.items.length },
        { trait_type: "Redeemed", value: card.state === "redeemed" ? "Yes" : "No" },
      ];
      return json(origin, 200, { name: `Adventurer Card #${card.token_id}`, description: `A RareFriends Realm Adventurer Card: a snapshot of ${facts.name ?? `Friend #${snapshot.friendId}`}'s progress, held in the Realm until the card is redeemed. Snapshot ${card.snapshot_hash}.`,
        image: `${options.baseUrl}/v1/cards/${card.token_id}/image`, external_url: options.gameUrl, attributes }, { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" });
    }
    // ---------- Signed in: the cards this wallet holds, and redeeming one ----------
    if (path === "/v1/cards/held" && method === "GET") {
      const { address } = await session(request);
      const active = await db.prepare("SELECT * FROM cards WHERE state = 'active' ORDER BY token_id DESC LIMIT 200").bind().all<CardRow>();
      const held: Record<string, unknown>[] = [];
      for (const card of active.results) {
        // The chain's word on who holds it (cards change hands); the stored holder is refreshed as it's read.
        const owner = options.chain ? await options.chain.ownerOf(card.token_id) : null;
        if (owner && getAddress(owner) !== card.holder) await db.prepare("UPDATE cards SET holder = ? WHERE token_id = ?").bind(getAddress(owner), card.token_id).run();
        const holder = owner ? getAddress(owner) : card.holder;
        if (holder !== address) continue;
        const snapshot = JSON.parse(card.snapshot) as Snapshot;
        held.push({ ...publicCard(card), holder, from: { friend: snapshot.friendId, name: (snapshot.facts as { name?: unknown }).name ?? null }, totalXp: Object.values(snapshot.xp).reduce((sum, value) => sum + value, 0), xp: snapshot.xp, items: snapshot.items, facts: snapshot.facts, layout: snapshot.layout });
      }
      return json(origin, 200, { held });
    }
    const redeem = /^\/v1\/cards\/([0-9]+)\/redeem$/.exec(path);
    if (redeem && method === "POST") {
      const { address } = await session(request), id = tokenId(redeem[1]);
      const body = await request.json().catch(() => null) as { txHash?: unknown; friend?: unknown } | null;
      if (!body || typeof body.txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.txHash) || typeof body.friend !== "number" || !Number.isSafeInteger(body.friend) || body.friend < 0) throw new HttpError(400, "bad redemption");
      const card = await row(id);
      if (!card || card.state !== "active") throw new HttpError(404, "no such card out");
      if (!options.chain) throw new HttpError(503, "the chain can't be read");
      if (!await owns(address, body.friend)) throw new HttpError(403, "this wallet doesn't own this Friend now");
      const to = await characterOf(address, body.friend);
      if (!to) throw new HttpError(404, "no cloud save for this character yet: play and save first");
      const receipt = await options.chain.receipt(body.txHash as Hex);
      if (receipt.status === "pending") return json(origin, 202, { card: publicCard(card), pending: true });
      if (receipt.status === "failed") throw new HttpError(422, "that transaction failed");
      const burn = (receipt.redeemed ?? []).find(entry => Number(entry.tokenId) === id && getAddress(entry.by) === address && entry.snapshot.toLowerCase() === card.snapshot_hash.toLowerCase());
      if (!burn) throw new HttpError(422, "that transaction didn't redeem this card from this wallet");
      // Settle: the whole snapshot onto the redeemer, the same off the original (which keeps what it earned since).
      const snapshot = JSON.parse(card.snapshot) as Snapshot, at = clock(), same = card.address === address && card.friend_id === body.friend;
      const gain: Record<string, number> = {}, loss: Record<string, number> = {};
      for (const [skill, xp] of Object.entries(snapshot.xp)) { gain[skill] = xp; loss[skill] = -xp; }
      const what = `${snapshot.items.length ? `${snapshot.items.length} kind${snapshot.items.length === 1 ? "" : "s"} of item and ` : ""}${Object.values(snapshot.xp).reduce((sum, value) => sum + value, 0).toLocaleString()} XP`;
      if (same) await settle(address, body.friend, { token: id, xp: {}, items: snapshot.items, clearLockbox: true, notice: `You redeemed your own Adventurer Card #${id}: its items are back in your bank.` });
      else {
        await settle(address, body.friend, { token: id, xp: gain, items: snapshot.items, clearLockbox: false, notice: `You redeemed Adventurer Card #${id}: ${what} are yours now (items in your bank).` });
        await settle(card.address, card.friend_id, { token: id, xp: loss, items: [], clearLockbox: true, notice: `Your Adventurer Card #${id} was redeemed: ${what} left you with it. What you earned since the mint is still yours.` });
      }
      await db.prepare("UPDATE cards SET state = 'redeemed', redeemed_by = ?, redeemed_at = ?, holder = ?, updated_at = ? WHERE token_id = ?").bind(address, at, address, at, id).run();
      return json(origin, 200, { card: publicCard((await row(id))!), settled: true });
    }
    // ---------- Signed in: the character's card, and making one ----------
    const mine = /^\/v1\/characters\/([0-9]{1,15})\/card$/.exec(path);
    if (mine && method === "GET") {
      const { address } = await session(request), friend = Number(mine[1]);
      let card = await outstanding(address, friend);
      if (card) card = await reconcile(card);
      // The owner's view carries the voucher too, so a mint the wallet turned down can be sent again.
      return json(origin, 200, { card: card ? { ...publicCard(card), voucher: card.voucher && card.state === "reserved" ? JSON.parse(card.voucher) : null } : null });
    }
    if (path === "/v1/cards/prepare" && method === "POST") {
      const { address } = await session(request);
      if (!options.minterKey || !options.contract) throw new HttpError(503, "cards aren't open yet");
      const body = await request.json().catch(() => null) as { friend?: unknown; layout?: unknown; show?: unknown } | null;
      const friend = typeof body?.friend === "number" && Number.isSafeInteger(body.friend) && body.friend >= 0 ? body.friend : null;
      const layout = typeof body?.layout === "string" && CARD_LIMITS.layoutPattern.test(body.layout) ? body.layout : null;
      const show = Array.isArray(body?.show) && body.show.length <= CARD_LIMITS.maxShow && body.show.every(entry => typeof entry === "string" && CARD_LIMITS.layoutPattern.test(entry)) ? body.show as string[] : null;
      if (friend === null || !layout || !show) throw new HttpError(400, "bad card");
      if (!await owns(address, friend)) throw new HttpError(403, "this wallet doesn't own this Friend now");
      const character = await characterOf(address, friend);
      if (!character) throw new HttpError(404, "no cloud save yet");
      if (character.trust !== "verified") throw new HttpError(403, "only verified progress can be made into a card", { trust: character.trust });
      if (await outstanding(address, friend)) throw new HttpError(409, "this character has a card out already");
      const save = JSON.parse(character.save) as { xp?: Record<string, number>; name?: string | null; familyId?: number }, items = lockboxOf(save);
      if (!items) throw new HttpError(422, "the lockbox can't be read");
      const at = clock(), snapshot: Snapshot = { v: 1, address, friendId: friend, version: character.version, saveHash: character.save_hash ?? await sha256(character.save), at, xp: { ...(save.xp ?? {}) }, items, layout, show,
        facts: { name: save.name ?? null, family: null, combat: null, total: null, questPoints: null } };
      // The game sends the facts it drew the card with (display only) along with the picture; the snapshot's XP and items are read here.
      const text = JSON.stringify(snapshot), snapshotHash = `0x${await sha256(text)}` as Hex, key = characterKey(address, friend);
      const inserted = await db.prepare("INSERT INTO cards (address, friend_id, character, state, snapshot, snapshot_hash, created_at, updated_at, image) VALUES (?, ?, ?, 'prepared', ?, ?, ?, ?, 0)").bind(address, friend, key, text, snapshotHash, at, at).run();
      if (!inserted.meta.changes) throw new HttpError(500, "the card couldn't be made");
      const made = await db.prepare("SELECT * FROM cards WHERE address = ? AND friend_id = ? AND state = 'prepared' ORDER BY token_id DESC").bind(address, friend).first<CardRow>();
      if (!made) throw new HttpError(500, "the card couldn't be made");
      const deadline = Math.floor((at + CARD_LIMITS.voucherMs) / 1000), account = privateKeyToAccount(options.minterKey as Hex);
      const signature = await account.signTypedData({ domain: voucherDomain(options.chainId, options.contract), types: VOUCHER_TYPES, primaryType: "CardVoucher", message: { to: getAddress(address), tokenId: BigInt(made.token_id), character: key, snapshot: snapshotHash, deadline: BigInt(deadline) } });
      const voucher = { tokenId: made.token_id, to: getAddress(address), character: key, snapshot: snapshotHash, deadline, signature, contract: getAddress(options.contract), chainId: options.chainId, minter: account.address };
      await setState(made.token_id, "reserved", { voucher: JSON.stringify(voucher), deadline: deadline * 1000 }).run();
      return json(origin, 200, { card: publicCard((await row(made.token_id))!), voucher, snapshot });
    }
    const act = /^\/v1\/cards\/([0-9]+)\/(image|submitted|confirm|cancel)$/.exec(path);
    if (act && (method === "PUT" || method === "POST")) {
      const { address } = await session(request), id = tokenId(act[1]), what = act[2];
      let card = await row(id);
      if (!card || card.address !== address) throw new HttpError(404, "no such card");
      if (what === "image" && method === "PUT") {
        if (!options.bucket) throw new HttpError(503, "pictures can't be kept yet");
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (bytes.byteLength > CARD_LIMITS.imageBytes || bytes.byteLength < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) throw new HttpError(413, "the picture must be a PNG of at most 400 KB");
        if (card.state === "cancelled" || card.state === "redeemed") throw new HttpError(409, "that card is finished");
        // The facts the picture shows travel with it (display only; the snapshot's XP and items were read from the save).
        const facts = request.headers.get("x-card-facts");
        if (facts && facts.length < 4_000) { try { const snapshot = JSON.parse(card.snapshot) as Snapshot; snapshot.facts = JSON.parse(facts) as Record<string, unknown>; await db.prepare("UPDATE cards SET snapshot = ? WHERE token_id = ?").bind(JSON.stringify(snapshot), id).run(); } catch { /* the picture still goes up */ } }
        await options.bucket.put(`cards/${id}.png`, bytes, { httpMetadata: { contentType: "image/png" } });
        await db.prepare("UPDATE cards SET image = 1, updated_at = ? WHERE token_id = ?").bind(clock(), id).run();
        return json(origin, 200, { ok: true });
      }
      if (what === "submitted" && method === "POST") {
        const body = await request.json().catch(() => null) as { txHash?: unknown } | null;
        if (!body || typeof body.txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.txHash)) throw new HttpError(400, "bad transaction");
        if (card.state !== "reserved" && card.state !== "submitted") throw new HttpError(409, `that card is ${card.state}`);
        await setState(id, "submitted", { tx_hash: body.txHash.toLowerCase() }).run();
        card = await reconcile((await row(id))!);
        return json(origin, 200, { card: publicCard(card) });
      }
      if (what === "confirm" && method === "POST") {
        if (card.state === "reserved" && card.deadline && clock() > card.deadline) { await setState(id, "cancelled").run(); card = (await row(id))!; }
        else card = await reconcile(card);
        return json(origin, 200, { card: publicCard(card) });
      }
      if (what === "cancel" && method === "POST") {
        if (card.state !== "prepared" && card.state !== "reserved") throw new HttpError(409, `that card is ${card.state}`);
        await setState(id, "cancelled").run();
        return json(origin, 200, { card: publicCard((await row(id))!) });
      }
    }
    return null;
  };
}

/** The lockbox a save must keep while this character has a card out: null when it has none. */
export async function heldLockbox(db: Database, address: string, friend: number): Promise<LockboxSlot[] | null> {
  const card = await db.prepare("SELECT snapshot FROM cards WHERE address = ? AND friend_id = ? AND state IN ('reserved', 'submitted', 'active') ORDER BY token_id DESC").bind(address, friend).first<{ snapshot: string }>();
  return card ? (JSON.parse(card.snapshot) as Snapshot).items : null;
}
export { HttpError as CardHttpError };
export type { Statement };
