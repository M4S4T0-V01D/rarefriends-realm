/**
 * Cloud saves for the trusted host page (cloud/src/worker.ts is the other side).
 *
 * The sandboxed game never sees a wallet, a token or the network: it asks this page (CLOUD_ACTION) and is told what
 * happened (CLOUD_STATE). This page keeps the browser save exactly as before and, once the wallet has signed in once,
 * mirrors it to the cloud: loaded when the game starts, uploaded every 90 seconds while it changes, sooner after a
 * milestone, and once more when the page closes. Every upload names the cloud version it builds on, so an older copy
 * can never overwrite a newer one: the player is asked instead. When the cloud can't be reached, the browser save
 * carries on and uploads resume by themselves.
 */
import { encodeFunctionData, parseAbi, stringToHex } from "viem";
import type { CardState, CloudConflict, CloudState, HeldCard } from "../games/rarefriends-realm/roster.ts";

/**
 * Adventurer Cards (cloud/src/cards.ts): the one transaction this page ever sends is the card's mint, to the contract
 * the service names, with the voucher the service signed; the wallet shows it and the player pays its gas. Nothing
 * here approves, transfers or signs typed data.
 */
const MINT_ABI = parseAbi(["function mint(uint256 tokenId, bytes32 character, bytes32 snapshot, uint256 deadline, bytes signature)", "function redeem(uint256 tokenId)"]);
/** The one way this page sends a transaction: to the cards contract the service named, from the player's wallet. */
const sendTransaction = (provider: Provider, from: string, to: string, data: string) => provider.request({ method: "eth_sendTransaction", params: [{ from, to, data }] });
type Voucher = { tokenId: number; to: string; character: string; snapshot: string; deadline: number; signature: string; contract: string; chainId: number };
/** The chains a card may live on, as a wallet is told to add them. */
const CHAIN_PARAMS: Record<number, { chainId: string; chainName: string; rpcUrls: string[]; nativeCurrency: { name: string; symbol: string; decimals: number }; blockExplorerUrls?: string[] }> = {
  46630: { chainId: "0xb626", chainName: "Robinhood Chain Testnet", rpcUrls: ["https://rpc.testnet.chain.robinhood.com"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, blockExplorerUrls: ["https://explorer.testnet.chain.robinhood.com"] },
  4663: { chainId: "0x1237", chainName: "Robinhood Chain", rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } },
};
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const cardFrom = (raw: unknown): CardState => {
  const c = (raw ?? {}) as Record<string, unknown>;
  return { tokenId: Number(c.tokenId ?? 0), state: String(c.state ?? "cancelled") as CardState["state"], txHash: typeof c.txHash === "string" ? c.txHash : null, holder: typeof c.holder === "string" ? c.holder : null,
    contract: typeof c.contract === "string" ? c.contract : null, chainId: typeof c.chainId === "number" ? c.chainId : undefined, deadline: typeof c.deadline === "number" ? c.deadline : null };
};

export const CLOUD_URL = "https://rarefriends-realm-saves.masato-void.workers.dev";
type Provider = { request(args: { method: string; params?: readonly unknown[] }): Promise<unknown> };
type Session = { token: string; address: string; expiresAt: number };
/** What this browser last agreed with the cloud: the version, and the save it was (by hash). */
type Meta = { cloudVersion: number; syncedHash: string; at: number };
type Save = Record<string, unknown>;

const SESSION_KEY = (account: string) => `rarefriends-realm:cloud:v1:session:${account.toLowerCase()}`;
const META_KEY = (account: string, friend: string) => `rarefriends-realm:save:v1:${account.toLowerCase()}:${friend}:cloud`;
const BACKUP_KEY = (account: string, friend: string) => `rarefriends-realm:save:v1:${account.toLowerCase()}:${friend}:backup`;
const AUTO_MS = 90_000, EVENT_MS = 12_000, LOAD_TIMEOUT_MS = 7_000;

const store = {
  get<T>(key: string): T | null { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; } },
  set(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } },
  remove(key: string) { try { localStorage.removeItem(key); } catch { /* blocked */ } },
};
export async function hashSave(save: unknown) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(save)));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function gzip(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * The only message this page will ever ask a wallet to sign: the Realm's sign-in, for this site and this wallet, word
 * for word (cloud/src/worker.ts `challengeMessage`). Anything else from the server is refused before the wallet sees it.
 */
export function isSignInMessage(message: string, origin: string, account: string) {
  const lines = message.split("\n"), host = new URL(origin).host, time = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
  return lines.length === 11 && lines[0] === `${host} wants you to sign in with your Ethereum account:` && lines[1].toLowerCase() === account.toLowerCase() && lines[2] === ""
    && lines[3] === "Sign in to RareFriends Realm cloud saves. This proves you own this wallet so your adventure can be saved online. It is not a transaction and costs nothing."
    && lines[4] === "" && lines[5] === `URI: ${origin}` && lines[6] === "Version: 1" && lines[7] === "Chain ID: 4663" && /^Nonce: [A-Za-z0-9]{8,32}$/.test(lines[8])
    && time.test(lines[9].replace(/^Issued At: /, "")) && lines[9].startsWith("Issued At: ") && time.test(lines[10].replace(/^Expiration Time: /, "")) && lines[10].startsWith("Expiration Time: ");
}

type Io = {
  readSave(): Save | null;
  writeSave(save: Save): void;
  /** Tell the game what the save is (at start), or replace it (a conflict resolved on the title screen). */
  deliver(save: Save | null, replace: boolean): void;
  state(state: CloudState): void;
  provider(): Provider | null;
  /** This page's origin (the sign-in message names it). */
  origin(): string;
  reload(): void;
};

/** One wallet and Friend's cloud sync. Made fresh whenever the wallet or Friend changes. */
export class CloudSync {
  private session: Session | null;
  private meta: Meta | null;
  private status: CloudState = { status: "off" };
  private pending: { save: Save; important: boolean; claim: string | null } | null = null;
  private lastUpload = 0; private timer: ReturnType<typeof setTimeout> | null = null; private backoff = 0;
  private uploading = false; private paused = false; private disposed = false; private delivered = false;
  private conflict: CloudConflict | null = null;
  /** This character's Adventurer Card (null: none; undefined: not asked yet). */
  private card: CardState | null | undefined = undefined;
  private held: HeldCard[] | undefined = undefined; private redeeming: CloudState["redeeming"] = undefined;
  readonly account: string; readonly friend: string; private readonly io: Io; private readonly base: string; private readonly http: typeof fetch;
  constructor(account: string, friend: string, io: Io, base = CLOUD_URL, http: typeof fetch = (...args) => fetch(...args)) {
    this.account = account; this.friend = friend; this.io = io; this.base = base; this.http = http;
    const session = store.get<Session>(SESSION_KEY(account));
    this.session = session && session.expiresAt > Date.now() + 60_000 && session.address.toLowerCase() === account.toLowerCase() ? session : null;
    this.meta = store.get<Meta>(META_KEY(account, friend));
  }
  dispose() { this.disposed = true; if (this.timer) clearTimeout(this.timer); }
  /** Whether the game has been given its starting save yet. */
  started() { return this.delivered; }
  current() { return this.status; }
  private set(state: CloudState) { this.status = { ...state, address: this.session?.address ?? this.account, ...(this.card !== undefined ? { card: this.card } : {}), ...(this.held !== undefined ? { held: this.held } : {}), ...(this.redeeming ? { redeeming: this.redeeming } : {}) }; if (!this.disposed) this.io.state(this.status); }
  private setCard(card: CardState | null) { this.card = card; this.set(this.status); }
  private give(save: Save | null, replace = false) { if (!this.delivered || replace) { this.delivered = true; this.io.deliver(save, replace); } if (this.session && this.card === undefined) void this.cardStatus(); }

  private async api(method: string, path: string, init: { body?: BodyInit; type?: string; keepalive?: boolean; json?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { ...(init.headers ?? {}) };
    if (this.session) headers.authorization = `Bearer ${this.session.token}`;
    let body = init.body;
    if (init.json !== undefined) { body = JSON.stringify(init.json); headers["content-type"] = "application/json"; }
    else if (init.type) headers["content-type"] = init.type;
    const response = await this.http(`${this.base}${path}`, { method, headers, body, keepalive: init.keepalive, cache: "no-store" });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    return { status: response.status, data };
  }

  /** Start: decide which save the game gets (cloud, browser or a question for the player). */
  async open() {
    const local = this.io.readSave();
    if (!this.session) { this.set({ status: "unverified" }); this.give(local); return; }
    this.set({ status: "loading" });
    let result: Awaited<ReturnType<CloudSync["api"]>> | null = null;
    try { result = await Promise.race([this.api("GET", `/v1/characters/${this.friend}`), new Promise<null>(resolve => setTimeout(() => resolve(null), LOAD_TIMEOUT_MS))]); }
    catch { result = null; }
    if (this.disposed) return;
    if (!result || result.status >= 500) { this.set({ status: "offline" }); this.give(local); this.retryOpen(); return; }
    if (result.status === 401) { this.forget(); this.set({ status: "unverified", error: "expired" }); this.give(local); return; }
    if (result.status === 404) {
      // Nothing in the cloud yet. A browser save made before cloud saves (or before signing in) is offered for import;
      // with no browser save either, this is a new character and its first save creates it.
      if (local && !this.meta) { this.set({ status: "import", importable: local }); this.paused = true; }
      else if (local && this.meta) { this.set({ status: "import", importable: local, lost: true }); this.paused = true; }
      else this.set({ status: "saved", version: 0 });
      this.give(local); return;
    }
    if (result.status !== 200) { this.set({ status: "offline" }); this.give(local); this.retryOpen(); return; }
    const cloud = result.data.save as Save, version = Number(result.data.version), updatedAt = Number(result.data.updatedAt), owned = result.data.owned !== false;
    const cloudHash = await hashSave(cloud);
    if (!local) { this.adopt(cloud, version, cloudHash); this.set({ status: owned ? "saved" : "not-owner", version, savedAt: updatedAt }); this.give(cloud); return; }
    const localHash = await hashSave(local), dirty = !this.meta || localHash !== this.meta.syncedHash;
    if (localHash === cloudHash) { this.adopt(cloud, version, cloudHash); this.set({ status: owned ? "saved" : "not-owner", version, savedAt: updatedAt }); this.give(local); return; }
    if (this.meta && this.meta.cloudVersion === version && dirty) {
      // Played on this device since the last upload (offline, or closed before it went): this device's is newer.
      this.set({ status: owned ? "saving" : "not-owner", version, savedAt: updatedAt }); this.give(local);
      if (owned) this.queue(local, true, null); return;
    }
    if (this.meta && this.meta.cloudVersion <= version && !dirty) { this.adopt(cloud, version, cloudHash); this.set({ status: owned ? "saved" : "not-owner", version, savedAt: updatedAt }); this.give(cloud); return; }
    // Both changed (or this browser's save predates cloud saves): ask, keeping both.
    this.conflict = { cloud, cloudAt: updatedAt, cloudVersion: version, local, localAt: this.meta?.at ?? null, where: "start" };
    this.paused = true; this.set({ status: "conflict", conflict: this.conflict }); this.give(local);
  }
  private retryOpen() { this.schedule(() => { if (!this.delivered || this.status.status === "offline") void this.reconnect(); }, 30_000); }
  /** Back online after starting offline: check the cloud didn't move on meanwhile, then upload. */
  private async reconnect() {
    try {
      const result = await this.api("GET", `/v1/characters/${this.friend}`);
      if (result.status === 401) { this.forget(); this.set({ status: "unverified", error: "expired" }); return; }
      if (result.status >= 500) { this.retryOpen(); return; }
      const version = result.status === 404 ? 0 : Number(result.data.version);
      if (result.status === 404 && !this.meta) { const local = this.io.readSave(); if (local) { this.paused = true; this.set({ status: "import", importable: local }); return; } }
      if ((this.meta?.cloudVersion ?? 0) !== version) { await this.conflictFrom(result.status === 404 ? null : result.data, "play"); return; }
      this.set({ status: "saving", version }); const local = this.io.readSave(); if (local) this.queue(local, true, null);
    } catch { this.retryOpen(); }
  }
  private adopt(save: Save, version: number, hash: string) {
    this.io.writeSave(save); this.meta = { cloudVersion: version, syncedHash: hash, at: Date.now() }; store.set(META_KEY(this.account, this.friend), this.meta);
  }
  private forget() { this.session = null; store.remove(SESSION_KEY(this.account)); }

  // ---------- Adventurer Cards ----------
  /** This character's card, from the service (none, or where it is in its life). */
  async cardStatus() {
    if (!this.session) return;
    try { const result = await this.api("GET", `/v1/characters/${this.friend}/card`); if (result.status === 200) { const card = result.data.card ? cardFrom(result.data.card) : null; if (card?.contract) { this.cardContract = card.contract; this.cardChainId = card.chainId ?? null; } this.setCard(card); } }
    catch { /* asked again next time */ }
  }
  /** Give up a card that was never minted: its lockbox opens again. */
  async cancelCard() {
    const card = this.card;
    if (!this.session || !card) return;
    const result = await this.api("POST", `/v1/cards/${card.tokenId}/cancel`).catch(() => null);
    if (result?.status === 200) await this.cardStatus(); else this.setCard({ ...card, error: String(result?.data.error ?? "failed") });
  }
  /**
   * Mint: the save goes up, the service makes the snapshot and signs the voucher, the picture goes up, the wallet
   * sends the one transaction (switching to the card's chain first), and the service watches the chain for the mint.
   */
  async mintCard(input: { layout: string; show: string[]; facts: Record<string, unknown>; image: Blob }) {
    const provider = this.io.provider();
    if (!this.session || !provider) { this.setCard({ tokenId: 0, state: "cancelled", error: "sign in to cloud saves first" }); return; }
    await this.flush().catch(() => { /* the snapshot is of what the service has */ });
    let card: CardState | null = this.card ?? null, voucher: Voucher | null = null;
    try {
      // A card reserved earlier (the wallet closed, say) is sent again with its voucher rather than made anew.
      if (card && card.state === "reserved") {
        const result = await this.api("GET", `/v1/characters/${this.friend}/card`);
        const found = result.status === 200 && result.data.card ? result.data.card as Record<string, unknown> : null;
        voucher = found?.voucher ? found.voucher as Voucher : null; card = found ? cardFrom(found) : null;
      }
      if (!voucher) {
        this.setCard({ tokenId: card?.tokenId ?? 0, state: "prepared", step: "preparing" });
        const made = await this.api("POST", "/v1/cards/prepare", { json: { friend: Number(this.friend), layout: input.layout, show: input.show } });
        if (made.status !== 200) { this.setCard({ tokenId: 0, state: "cancelled", error: made.data.trust === "unverified" ? "unverified" : String(made.data.error ?? "failed") }); return; }
        card = cardFrom(made.data.card); voucher = made.data.voucher as Voucher;
      }
      this.setCard({ ...card!, step: "uploading" });
      await this.api("PUT", `/v1/cards/${card!.tokenId}/image`, { body: await input.image.arrayBuffer(), type: "image/png", headers: { "x-card-facts": JSON.stringify(input.facts).slice(0, 3_900) } });
      this.setCard({ ...card!, step: "wallet" });
      await switchChain(provider, voucher.chainId);
      const data = encodeFunctionData({ abi: MINT_ABI, functionName: "mint", args: [BigInt(voucher.tokenId), voucher.character as `0x${string}`, voucher.snapshot as `0x${string}`, BigInt(voucher.deadline), voucher.signature as `0x${string}`] });
      const txHash = String(await sendTransaction(provider, this.account, voucher.contract, data));
      this.setCard({ ...card!, state: "submitted", txHash, step: "waiting" });
      const sent = await this.api("POST", `/v1/cards/${card!.tokenId}/submitted`, { json: { txHash } });
      if (sent.status === 200) card = cardFrom(sent.data.card);
      for (let i = 0; i < 36 && card!.state === "submitted" && !this.disposed; i++) { await wait(5_000); const result = await this.api("POST", `/v1/cards/${card!.tokenId}/confirm`); if (result.status === 200) card = cardFrom(result.data.card); }
      this.setCard({ ...card!, step: card!.state === "submitted" ? "waiting" : null });
    } catch (error) {
      const rejected = typeof error === "object" && error !== null && (error as { code?: unknown }).code === 4001;
      this.setCard({ ...(card ?? { tokenId: 0, state: "cancelled" as const }), step: null, error: rejected ? "cancelled" : "failed" });
    }
  }
  /** The active cards this wallet holds on chain (any character's), from the service. */
  async heldCards() {
    if (!this.session) return;
    try { const result = await this.api("GET", "/v1/cards/held"); if (result.status === 200 && Array.isArray(result.data.held)) { const first = result.data.held[0] as { contract?: unknown; chainId?: unknown } | undefined; if (typeof first?.contract === "string") { this.cardContract = first.contract; this.cardChainId = typeof first.chainId === "number" ? first.chainId : null; } this.held = result.data.held as HeldCard[]; this.set(this.status); } }
    catch { /* asked again next time */ }
  }
  /** Redeem a held card onto this character: the wallet burns it (one transaction), the service settles its progress. */
  async redeemCard(tokenId: number) {
    const provider = this.io.provider(), card = this.held?.find(entry => entry.tokenId === tokenId);
    if (!this.session || !provider || !card || !this.card?.contract && !this.cardContract) { this.redeeming = { tokenId, step: null, error: "not held" }; this.set(this.status); return; }
    const contract = this.card?.contract ?? this.cardContract!, chainId = this.card?.chainId ?? this.cardChainId ?? 46630;
    try {
      this.redeeming = { tokenId, step: "wallet" }; this.set(this.status);
      await switchChain(provider, chainId);
      const txHash = String(await sendTransaction(provider, this.account, contract, encodeFunctionData({ abi: MINT_ABI, functionName: "redeem", args: [BigInt(tokenId)] })));
      this.redeeming = { tokenId, step: "waiting" }; this.set(this.status);
      let result = await this.api("POST", `/v1/cards/${tokenId}/redeem`, { json: { txHash, friend: Number(this.friend) } });
      for (let i = 0; i < 36 && result.status === 202 && !this.disposed; i++) { await wait(5_000); result = await this.api("POST", `/v1/cards/${tokenId}/redeem`, { json: { txHash, friend: Number(this.friend) } }); }
      if (result.status !== 200) throw new Error(String(result.data.error ?? `status ${result.status}`));
      this.redeeming = { tokenId, step: "settling" }; this.set(this.status);
      // The settled save is the cloud's now: this session's next upload would be older, so take the cloud's (the game reloads with it).
      await this.takeCloud();
      this.redeeming = { tokenId, step: null, done: true }; this.held = (this.held ?? []).filter(entry => entry.tokenId !== tokenId); this.set(this.status);
      await this.cardStatus();
    } catch (error) {
      const rejected = typeof error === "object" && error !== null && (error as { code?: unknown }).code === 4001;
      this.redeeming = { tokenId, step: null, error: rejected ? "cancelled" : error instanceof Error ? error.message : "failed" }; this.set(this.status);
    }
  }
  /** Take the cloud's save as this browser's, whatever this session has (a settlement the service made): the game reloads with it. */
  private async takeCloud() {
    const result = await this.api("GET", `/v1/characters/${this.friend}`);
    if (result.status !== 200 || !result.data.save) return;
    const save = result.data.save as Save, version = Number(result.data.version), hash = await hashSave(save);
    this.pending = null; this.adopt(save, version, hash); this.set({ status: "saved", version, savedAt: Number(result.data.updatedAt) }); this.give(save, true);
  }
  /** Where the cards live, learned from the service's answers (a held card's redeem needs it even with no card of our own out). */
  private cardContract: string | null = null; private cardChainId: number | null = null;
  /** Sign in: the server's message, signed by the wallet (no transaction), for a session token. */
  async signIn() {
    const provider = this.io.provider();
    if (!provider) { this.set({ status: "unverified", error: "no-wallet" }); return; }
    this.set({ status: "signing" });
    try {
      const challenge = await this.api("POST", "/v1/auth/challenge", { json: { address: this.account } });
      if (challenge.status !== 200 || typeof challenge.data.message !== "string") throw new Error("challenge");
      if (!isSignInMessage(challenge.data.message, this.io.origin(), this.account)) throw new Error("unexpected message");
      const signature = await provider.request({ method: "personal_sign", params: [stringToHex(challenge.data.message), this.account] });
      const verified = await this.api("POST", "/v1/auth/verify", { json: { message: challenge.data.message, signature } });
      if (verified.status !== 200 || typeof verified.data.token !== "string") throw new Error("verify");
      this.session = { token: verified.data.token, address: String(verified.data.address), expiresAt: Number(verified.data.expiresAt) };
      store.set(SESSION_KEY(this.account), this.session);
      this.delivered = true; // the game is already running: what's loaded now arrives as a resolution, not a start
      await this.reopenAfterSignIn();
    } catch (error) {
      const rejected = typeof error === "object" && error !== null && (error as { code?: unknown }).code === 4001;
      this.set({ status: "unverified", error: rejected ? "cancelled" : "failed" });
    }
  }
  private async reopenAfterSignIn() {
    const result = await this.api("GET", `/v1/characters/${this.friend}`).catch(() => null);
    if (!result || result.status >= 500) { this.set({ status: "offline" }); this.retryOpen(); return; }
    const local = this.io.readSave();
    if (result.status === 404) {
      if (local) { this.paused = true; this.set({ status: "import", importable: local }); }
      else this.set({ status: "saved", version: 0 });
      return;
    }
    const cloud = result.data.save as Save, version = Number(result.data.version), hash = await hashSave(cloud);
    if (!local || hash === await hashSave(local)) { this.adopt(cloud, version, hash); this.set({ status: "saved", version, savedAt: Number(result.data.updatedAt) }); if (!local) this.give(cloud, true); return; }
    await this.conflictFrom(result.data, "start");
  }
  private async conflictFrom(data: Record<string, unknown> | null, where: "start" | "play") {
    const local = this.io.readSave();
    if (!data) { if (local) { this.paused = true; this.set({ status: "import", importable: local, lost: true }); } return; }
    this.conflict = { cloud: data.save as Save, cloudAt: Number(data.updatedAt), cloudVersion: Number(data.version), local, localAt: this.meta?.at ?? null, where };
    this.paused = true; this.set({ status: "conflict", conflict: this.conflict });
  }
  signOut() {
    const token = this.session?.token;
    if (token) void this.api("POST", "/v1/auth/logout").catch(() => undefined);
    this.forget(); this.paused = false; this.set({ status: "unverified" });
  }

  // ---------- The player's answers ----------
  /** Bring this browser's adventure up to the cloud (the first time, or replacing the cloud's after a question). */
  async importLocal(replacing = false) {
    const local = this.io.readSave();
    if (!local) return;
    // Keep a copy aside until the cloud confirms it has it.
    store.set(BACKUP_KEY(this.account, this.friend), { save: local, at: Date.now() });
    const hash = await hashSave(local), base = replacing ? (this.conflict?.cloudVersion ?? this.meta?.cloudVersion ?? 0) : 0;
    this.set({ status: "saving" });
    const result = await this.put(local, base, "import", hash);
    if (result === "ok") { store.remove(BACKUP_KEY(this.account, this.friend)); this.paused = false; this.conflict = null; this.set({ ...this.status, status: "saved", imported: true }); }
  }
  /** Keep the cloud's adventure: this browser's goes aside as a backup, and the game loads the cloud's. */
  keepCloud() {
    const conflict = this.conflict;
    if (!conflict) return;
    const local = this.io.readSave();
    if (local) store.set(BACKUP_KEY(this.account, this.friend), { save: local, at: Date.now() });
    void hashSave(conflict.cloud).then(hash => {
      this.adopt(conflict.cloud, conflict.cloudVersion, hash); this.conflict = null; this.paused = false;
      this.set({ status: "saved", version: conflict.cloudVersion, savedAt: conflict.cloudAt });
      if (conflict.where === "start") this.give(conflict.cloud, true); else this.io.reload();
    });
  }
  /** Keep this browser's adventure: it replaces the cloud's (which the server keeps in its history). */
  async keepLocal() {
    const conflict = this.conflict, local = this.io.readSave();
    if (!conflict || !local) return;
    this.set({ status: "saving" });
    const result = await this.put(local, conflict.cloudVersion, "takeover", null);
    if (result === "ok") { this.conflict = null; this.paused = false; }
  }
  skipImport() { this.set({ status: "local-only" }); }
  retry() { this.paused = this.status.status === "conflict" || this.status.status === "import"; if (this.status.status === "offline" || this.status.status === "error") { this.backoff = 0; void this.reconnect(); } }

  // ---------- Saving ----------
  /** A save from the game (already in the browser). `important` after a milestone; `claim` the hash of a restored save code. */
  queue(save: Save, important: boolean, claim: string | null) {
    this.pending = { save, important: important || !!claim || this.pending?.important === true, claim: claim ?? this.pending?.claim ?? null };
    if (!this.session || this.disposed) return;
    if (claim) { void this.flush(); return; }
    if (this.paused || this.uploading) return;
    const wait = Math.max(0, (this.pending.important ? EVENT_MS : AUTO_MS) - (Date.now() - this.lastUpload));
    this.schedule(() => void this.flush(), Math.max(wait, this.backoff));
  }
  private schedule(run: () => void, ms: number) { if (this.timer) clearTimeout(this.timer); this.timer = setTimeout(() => { this.timer = null; if (!this.disposed) run(); }, ms); }
  async flush(exit = false) {
    const pending = this.pending;
    if (!pending || !this.session || this.uploading) return;
    if (this.paused && !pending.claim) return;
    // Claimed before hashing: a timer firing meanwhile (the first save's waits nothing) must not send it twice.
    this.uploading = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    let hash: string;
    try { hash = await hashSave(pending.save); } catch (e) { this.uploading = false; throw e; }
    if (!pending.claim && this.meta?.syncedHash === hash) { this.uploading = false; this.pending = null; return; }
    this.pending = null;
    const base = pending.claim ? (this.conflict?.cloudVersion ?? this.meta?.cloudVersion ?? 0) : (this.meta?.cloudVersion ?? 0);
    await this.put(pending.save, base, pending.claim ? "import" : exit ? "exit" : pending.important ? "event" : "auto", pending.claim, exit, hash);
  }
  private async put(save: Save, baseVersion: number, reason: string, importHash: string | null, exit = false, hash?: string): Promise<"ok" | "failed"> {
    this.uploading = true; this.lastUpload = Date.now();
    const saveHash = hash ?? await hashSave(save);
    try {
      const body = await gzip(JSON.stringify({ baseVersion, save, reason, ...(importHash ? { importHash } : {}) }));
      if (!exit) this.set({ ...this.status, status: "saving" });
      const result = await this.api("PUT", `/v1/characters/${this.friend}`, { body: body as BodyInit, type: "application/x-realm-save", keepalive: exit && body.byteLength < 60_000 });
      if (result.status === 200) {
        this.backoff = 0;
        this.meta = { cloudVersion: Number(result.data.version), syncedHash: saveHash, at: Date.now() }; store.set(META_KEY(this.account, this.friend), this.meta);
        this.set({ status: "saved", version: this.meta.cloudVersion, savedAt: Number(result.data.updatedAt), ...(result.data.duplicate ? { duplicate: true } : {}) });
        return "ok";
      }
      if (result.status === 401) { this.forget(); this.set({ status: "unverified", error: "expired" }); return "failed"; }
      if (result.status === 403) { this.paused = true; this.set({ status: "not-owner" }); return "failed"; }
      if (result.status === 409) { const latest = await this.api("GET", `/v1/characters/${this.friend}`).catch(() => null); if (latest?.status === 200 && await hashSave(latest.data.save) === saveHash) { this.adopt(save, Number(latest.data.version), saveHash); this.set({ status: "saved", version: Number(latest.data.version), savedAt: Number(latest.data.updatedAt) }); return "ok"; } await this.conflictFrom(latest?.status === 200 ? latest.data : null, "play"); return "failed"; }
      if (result.status === 429) { this.pending ??= { save, important: false, claim: importHash }; this.schedule(() => void this.flush(), Number(result.data.retryAfterMs ?? 10_000) + 500); return "failed"; }
      if (result.status === 422 || result.status === 413) { this.set({ status: "error", error: String(result.data.error ?? "rejected") }); return "failed"; }
      throw new Error(`status ${result.status}`);
    } catch {
      // Offline or the service is down: the browser save is safe; try again, waiting longer each time (up to 5 minutes).
      this.pending ??= { save, important: false, claim: importHash };
      this.backoff = Math.min(300_000, this.backoff ? this.backoff * 2 : 15_000);
      this.set({ status: "offline" }); this.schedule(() => void this.flush(), this.backoff);
      return "failed";
    } finally { this.uploading = false; }
  }
}

/** Put the wallet on the card's chain (adding it if the wallet doesn't know it). */
async function switchChain(provider: Provider, chainId: number) {
  const hex = `0x${chainId.toString(16)}`;
  try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] }); }
  catch (error) {
    const unknown = typeof error === "object" && error !== null && (error as { code?: unknown }).code === 4902;
    if (!unknown || !CHAIN_PARAMS[chainId]) throw error;
    await provider.request({ method: "wallet_addEthereumChain", params: [CHAIN_PARAMS[chainId]] });
  }
}
