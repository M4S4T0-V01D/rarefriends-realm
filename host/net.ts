/**
 * The trusted host's side of playing together. Players meet in one room two ways: direct WebRTC data channels through
 * Trystero (introduced over public Nostr relays), and, for networks that won't allow a direct link, signed ephemeral
 * events through the same kind of relays. A static site needs no server either way. Automated tests use a
 * same-origin BroadcastChannel instead (two tabs of one browser), so they never touch public relays.
 *
 * Only the game's presence and chat go out, keyed by Friend ID; wallet addresses never do. Everything that comes
 * in is validated (net.ts), rate-limited and stripped of links before the sandboxed game sees it.
 */
import { cleanAct, cleanChat, cleanId, cleanPresence, NET_ACT_IN, type Act, type ChatIn, type NetState, type NetStatus, type Presence } from "../games/rarefriends-realm/net.ts";

type Handlers = { presence: (data: unknown, peer: string) => void; chat: (data: unknown, peer: string) => void; act: (data: unknown, peer: string) => void; leave: (peer: string) => void; join: (peer: string) => void };
type Transport = { sendPresence(data: Presence): void; sendChat(data: { text: string; to?: number }, peer?: string): void; sendAct(data: Act, peer: string): void; leave(): void; status?(): { relays: number; direct: number } };

const APP_ID = "rarefriends-realm-v1", ROOM = "friendhollow";
/** Peers go quiet (closed tab, lost connection) after this long without a presence. */
const STALE_MS = 12_000;

/**
 * Relays for the fallback path: players whose networks can't open a direct WebRTC link still meet here. Games publish
 * short-lived signed Nostr events (an ephemeral kind, which relays pass on without storing) and read everyone else's.
 */
const RELAYS = ["wss://nostr-relay.corb.net", "wss://nostr.sathoarder.com", "wss://bucket.coracle.social", "wss://nos.lol", "wss://top.testrelay.top", "wss://nostr.data.haus"];
const RELAY_KIND = 25_823, RELAY_TOPIC = `${APP_ID}:${ROOM}`;
/** How often presence goes out over the relays (it goes over direct links every tick). */
const RELAY_PRESENCE_MS = 2000;
/** A direct link counts as live for this long after its last message. */
const LINK_MS = 10_000;
type Kind = "pres" | "chat" | "act" | "bye";
/** Every message carries its sender's hub id and a sequence number, so one arriving by both paths counts once. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Envelope = { h: string; m: number; to?: string; d?: Json };
const hex = (bytes: Uint8Array) => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");

async function relayLink(onContent: (content: string) => void) {
  const { schnorr } = await import("@noble/secp256k1");
  const { secretKey, publicKey } = schnorr.keygen(), pubkey = hex(publicKey), sockets = new Set<WebSocket>();
  let closed = false;
  const open = (url: string, delay = 0) => {
    if (closed) return;
    const socket = new WebSocket(url);
    socket.onopen = () => { sockets.add(socket); delay = 0; socket.send(JSON.stringify(["REQ", "realm", { kinds: [RELAY_KIND], "#t": [RELAY_TOPIC], since: Math.floor(Date.now() / 1000) - 5 }])); };
    socket.onmessage = event => {
      try {
        const [type, , ev] = JSON.parse(String(event.data));
        if (type === "EVENT" && ev && ev.pubkey !== pubkey && typeof ev.content === "string" && ev.content.length < 12_000) onContent(ev.content);
      } catch { /* not ours */ }
    };
    socket.onclose = () => { sockets.delete(socket); if (!closed) setTimeout(() => open(url, Math.min(60_000, (delay || 2000) * 2)), delay || 2000); };
    socket.onerror = () => socket.close();
  };
  for (const url of RELAYS) open(url);
  return {
    get connected() { return sockets.size; },
    async publish(content: string) {
      if (!sockets.size) return;
      const payload = { kind: RELAY_KIND, tags: [["t", RELAY_TOPIC]], created_at: Math.floor(Date.now() / 1000), content, pubkey };
      const id = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([0, payload.pubkey, payload.created_at, payload.kind, payload.tags, payload.content]))));
      const message = JSON.stringify(["EVENT", { ...payload, id: hex(id), sig: hex(await schnorr.signAsync(id, secretKey)) }]);
      for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.send(message);
    },
    close() { closed = true; for (const socket of sockets) socket.close(); sockets.clear(); },
  };
}

/**
 * Two paths to every player: direct WebRTC links through Trystero (fast and private, when both networks allow one), and
 * the relays (always reachable). The hub sees one peer per player, keyed by the player's hub id, whichever path a message
 * took. Private messages (whispers, trades) use the direct link when there is one and the relays only when there isn't.
 */
async function hybridTransport(on: Handlers): Promise<Transport & { status(): { relays: number; direct: number } }> {
  const self = Math.random().toString(36).slice(2, 14), seen = new Map<string, number>(), links = new Map<string, { peer: string; at: number }>();
  let seq = 0, lastRelayPresence = 0;
  const deliver = (kind: Kind, envelope: Envelope) => {
    if (!envelope || typeof envelope.h !== "string" || envelope.h.length > 24 || envelope.h === self || typeof envelope.m !== "number") return;
    if (envelope.to && envelope.to !== self) return;
    const key = `${envelope.h}:${envelope.m}`, now = Date.now();
    if (seen.has(key)) return;
    seen.set(key, now);
    if (seen.size > 4000) for (const [k, at] of seen) if (now - at > 60_000) seen.delete(k);
    if (kind === "pres") on.presence(envelope.d, envelope.h);
    else if (kind === "chat") on.chat(envelope.d, envelope.h);
    else if (kind === "act") on.act(envelope.d, envelope.h);
    else if (kind === "bye") on.leave(envelope.h);
  };
  const relay = await relayLink(content => {
    try { const { k, ...envelope } = JSON.parse(content) as Envelope & { k: Kind }; if (k === "pres" || k === "chat" || k === "act" || k === "bye") deliver(k, envelope); } catch { /* ignore */ }
  });
  // Direct links (if Trystero can't start here, the relays carry everything).
  type Action = { send: (data: Envelope, options?: { target: string }) => Promise<void> };
  const idle: Action = { send: () => Promise.reject(new Error("no direct links")) };
  let actions: Record<"pres" | "chat" | "act", Action> = { pres: idle, chat: idle, act: idle }, room: { leave: () => unknown } | null = null;
  try {
    const { joinRoom } = await import("trystero/nostr");
    const joined = joinRoom({ appId: APP_ID }, ROOM); room = joined;
    const made = { pres: joined.makeAction<Envelope>("pres"), chat: joined.makeAction<Envelope>("chat"), act: joined.makeAction<Envelope>("act") };
    for (const kind of ["pres", "chat", "act"] as const) made[kind].onMessage = (envelope, { peerId }) => {
      if (envelope && typeof envelope.h === "string") links.set(envelope.h, { peer: peerId, at: Date.now() });
      deliver(kind, envelope);
    };
    joined.onPeerJoin = peer => on.join(peer);
    joined.onPeerLeave = peer => { for (const [hub, link] of links) if (link.peer === peer) links.delete(hub); };
    actions = made;
  } catch { /* relays only */ }
  const wrap = (d: unknown, to?: string): Envelope => ({ h: self, m: ++seq, ...(to ? { to } : {}), d: d as Json });
  const direct = (hub: string) => { const link = links.get(hub); return link && Date.now() - link.at < LINK_MS ? link.peer : null; };
  const toOne = (kind: "chat" | "act", data: unknown, hub: string) => {
    const envelope = wrap(data, hub), peer = direct(hub);
    if (peer) void actions[kind].send(envelope, { target: peer }).catch(() => relay.publish(JSON.stringify({ k: kind, ...envelope })));
    else void relay.publish(JSON.stringify({ k: kind, ...envelope }));
  };
  return {
    sendPresence: data => {
      const envelope = wrap(data);
      void actions.pres.send(envelope).catch(() => {});
      if (Date.now() - lastRelayPresence >= RELAY_PRESENCE_MS) { lastRelayPresence = Date.now(); void relay.publish(JSON.stringify({ k: "pres", ...envelope })); }
    },
    sendChat: (data, peer) => {
      if (peer) { toOne("chat", data, peer); return; }
      const envelope = wrap(data);
      void actions.chat.send(envelope).catch(() => {}); void relay.publish(JSON.stringify({ k: "chat", ...envelope }));
    },
    sendAct: (data, peer) => toOne("act", data, peer),
    leave: () => { void relay.publish(JSON.stringify({ k: "bye", ...wrap(null) })).finally(() => relay.close()); void room?.leave(); },
    status: () => ({ relays: relay.connected, direct: [...links.values()].filter(link => Date.now() - link.at < LINK_MS).length }),
  };
}
function localTransport(on: Handlers): Transport {
  const channel = new BroadcastChannel(`${APP_ID}:${ROOM}`), self = Math.random().toString(36).slice(2);
  channel.onmessage = event => {
    const message = event.data as { kind: string; from: string; to?: string; data: unknown };
    if (!message || message.from === self || (message.to && message.to !== self)) return;
    if (message.kind === "pres") on.presence(message.data, message.from);
    else if (message.kind === "chat") on.chat(message.data, message.from);
    else if (message.kind === "act") on.act(message.data, message.from);
    else if (message.kind === "bye") on.leave(message.from);
  };
  return {
    sendPresence: data => channel.postMessage({ kind: "pres", from: self, data }),
    sendChat: (data, peer) => channel.postMessage({ kind: "chat", from: self, to: peer, data }),
    sendAct: (data, peer) => channel.postMessage({ kind: "act", from: self, to: peer, data }),
    leave: () => { channel.postMessage({ kind: "bye", from: self }); channel.close(); },
  };
}

type Peer = { presence: Presence; seen: number; chats: number[] };
/** One wallet's social circle, kept in this trusted page. */
type Social = { friends: number[]; ignored: number[]; online: boolean };
const socialKey = (account: string) => `rarefriends-realm:social:v1:${account.toLowerCase()}`;
function readSocial(account: string): Social {
  try {
    const raw = JSON.parse(localStorage.getItem(socialKey(account)) ?? "null") as Partial<Social> | null;
    const ids = (list: unknown) => Array.isArray(list) ? list.map(cleanId).filter((entry): entry is number => entry !== null).slice(0, 200) : [];
    return { friends: ids(raw?.friends), ignored: ids(raw?.ignored), online: raw?.online !== false };
  } catch { return { friends: [], ignored: [], online: true }; }
}

/** Connects this page's player to the others, and keeps the game frame told. */
export class NetHub {
  private transport: Transport | null = null; private joining = false;
  private peers = new Map<string, Peer>();
  /** Every live connection and the Friend it plays, including a second tab of the same Friend (direct messages go to all of them). */
  private claims = new Map<string, { id: number; seen: number; acts: number[] }>();
  private social: Social = { friends: [], ignored: [], online: true };
  private account: string | null = null; private me: number | null = null; private status: NetStatus = "offline";
  private sweep: ReturnType<typeof setInterval> | null = null; private lastState = "";
  constructor(private readonly post: (message: { type: string } & Record<string, unknown>) => void, private readonly local: boolean) {}

  /** A wallet and Friend are playing (or null when disconnected). */
  setPlayer(account: string | null, friend: number | null) {
    if (account !== this.account) { this.account = account; this.social = account ? readSocial(account) : { friends: [], ignored: [], online: true }; }
    this.me = friend;
    if (!account || !friend || !this.social.online) this.disconnect(); else void this.connect();
    this.publish(true);
  }
  setOnline(on: boolean) {
    this.social.online = on; this.save();
    if (on && this.account && this.me) void this.connect(); else this.disconnect();
    this.publish(true);
  }
  /** Friends and ignore lists. */
  changeSocial(op: string, who: number) {
    const s = this.social, drop = (list: number[]) => list.filter(entry => entry !== who);
    if (who === this.me) return;
    if (op === "add" && !s.friends.includes(who) && s.friends.length < 200) s.friends.push(who);
    else if (op === "remove") s.friends = drop(s.friends);
    else if (op === "ignore" && !s.ignored.includes(who)) { s.ignored.push(who); s.friends = drop(s.friends); }
    else if (op === "unignore") s.ignored = drop(s.ignored);
    this.save(); this.publish(true);
  }
  /** Our presence, from the game (sent on as it is, after the same checks we give everyone else's). */
  presence(raw: unknown) {
    const presence = cleanPresence(raw);
    if (!presence || presence.id !== this.me || !this.transport) return;
    this.transport.sendPresence(presence);
  }
  chat(raw: unknown, to: unknown) {
    const text = cleanChat(raw), target = cleanId(to);
    if (!text || !this.transport) return;
    if (target === null) { this.transport.sendChat({ text }); return; }
    // A private message goes only to the peer playing that Friend.
    for (const [peer, entry] of this.peers) if (entry.presence.id === target) this.transport.sendChat({ text, to: target }, peer);
  }
  /** A direct message to the player playing a Friend (trades, taking their drop). */
  act(raw: unknown, to: unknown) {
    const act = cleanAct(raw), target = cleanId(to);
    if (!act || target === null || !this.transport) return;
    const now = Date.now();
    for (const [peer, claim] of this.claims) if (claim.id === target && now - claim.seen < STALE_MS) this.transport.sendAct(act, peer);
  }
  dispose() { this.disconnect(); }

  private async connect() {
    if (this.transport || this.joining) return;
    this.joining = true; this.status = "connecting"; this.publish(true);
    const handlers: Handlers = {
      presence: (data, peer) => {
        const presence = cleanPresence(data);
        if (!presence || presence.id === this.me) return;
        const entry = this.peers.get(peer), now = Date.now();
        this.claims.set(peer, { id: presence.id, seen: now, acts: this.claims.get(peer)?.acts ?? [] });
        if (entry && now - entry.seen < 200) return; // at most five updates a second
        // One avatar per Friend: a newer connection claiming the same Friend replaces the older.
        for (const [other, value] of this.peers) if (other !== peer && value.presence.id === presence.id) this.peers.delete(other);
        this.peers.set(peer, { presence, seen: now, chats: entry?.chats ?? [] });
        this.publish();
      },
      chat: (data, peer) => {
        const entry = this.peers.get(peer), now = Date.now();
        if (!entry || this.social.ignored.includes(entry.presence.id)) return;
        entry.chats = entry.chats.filter(at => now - at < 5000);
        if (entry.chats.length >= 3) return; // three lines per five seconds
        const message = data as { text?: unknown; to?: unknown }, text = cleanChat(message?.text), to = cleanId(message?.to);
        if (!text || (to !== null && to !== this.me)) return;
        entry.chats.push(now);
        const chat: ChatIn = { from: entry.presence.id, text, private: to !== null };
        this.post({ type: "rarefriends-realm:net-chat-in", ...chat });
      },
      act: (data, peer) => {
        // From any live connection playing a Friend (its avatar may be drawn from another tab of the same Friend).
        const claim = this.claims.get(peer), now = Date.now();
        if (!claim || now - claim.seen > STALE_MS || this.social.ignored.includes(claim.id)) return;
        claim.acts = claim.acts.filter(at => now - at < 1000);
        if (claim.acts.length >= 12) return; // twelve a second is plenty for a trade
        const act = cleanAct(data);
        if (!act) return;
        claim.acts.push(now);
        this.post({ type: NET_ACT_IN, from: claim.id, act });
      },
      join: () => this.publish(),
      leave: peer => { this.peers.delete(peer); this.claims.delete(peer); this.publish(); },
    };
    try {
      this.transport = this.local ? localTransport(handlers) : await hybridTransport(handlers);
      this.status = "online";
    } catch { this.status = "offline"; }
    this.joining = false;
    this.sweep ??= setInterval(() => {
      const now = Date.now(); let changed = false;
      for (const [peer, entry] of this.peers) if (now - entry.seen > STALE_MS) { this.peers.delete(peer); changed = true; }
      for (const [peer, claim] of this.claims) if (now - claim.seen > STALE_MS) this.claims.delete(peer);
      void changed; this.publish(); // unchanged states aren't re-sent; this keeps the connection info fresh
    }, 2000);
    this.publish(true);
  }
  private disconnect() {
    this.transport?.leave(); this.transport = null; this.peers.clear(); this.claims.clear(); this.status = "offline";
    if (this.sweep) clearInterval(this.sweep); this.sweep = null;
  }
  private save() { if (this.account) try { localStorage.setItem(socialKey(this.account), JSON.stringify(this.social)); } catch { /* play on without saving */ } }
  private publishTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tell the game who's around (at most every 150 ms, or at once when forced). */
  private publish(now = false) {
    const send = () => {
      this.publishTimer = null;
      const peers = [...this.peers.values()].map(entry => entry.presence).filter(presence => !this.social.ignored.includes(presence.id));
      const state: NetState = { status: this.social.online ? this.status : "offline", peers, friends: this.social.friends, ignored: this.social.ignored, players: peers.length + (this.transport ? 1 : 0), paths: this.transport?.status?.() };
      const key = JSON.stringify(state);
      if (key === this.lastState) return;
      this.lastState = key; this.post({ type: "rarefriends-realm:net-state", ...state });
    };
    if (now) { if (this.publishTimer) clearTimeout(this.publishTimer); send(); }
    else this.publishTimer ??= setTimeout(send, 150);
  }
}
