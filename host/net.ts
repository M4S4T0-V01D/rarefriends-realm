/**
 * The trusted host's side of playing together. Players meet in one room through Trystero: WebRTC data channels
 * between browsers, introduced over public Nostr relays, so a static site needs no server. Automated tests use a
 * same-origin BroadcastChannel instead (two tabs of one browser), so they never touch public relays.
 *
 * Only the game's presence and chat go out, keyed by Friend ID; wallet addresses never do. Everything that comes
 * in is validated (net.ts), rate-limited and stripped of links before the sandboxed game sees it.
 */
import { cleanAct, cleanChat, cleanId, cleanPresence, NET_ACT_IN, type Act, type ChatIn, type NetState, type NetStatus, type Presence } from "../games/rarefriends-realm/net.ts";

type Handlers = { presence: (data: unknown, peer: string) => void; chat: (data: unknown, peer: string) => void; act: (data: unknown, peer: string) => void; leave: (peer: string) => void; join: (peer: string) => void };
type Transport = { sendPresence(data: Presence): void; sendChat(data: { text: string; to?: number }, peer?: string): void; sendAct(data: Act, peer: string): void; leave(): void };

const APP_ID = "rarefriends-realm-v1", ROOM = "friendhollow";
/** Peers go quiet (closed tab, lost connection) after this long without a presence. */
const STALE_MS = 12_000;

async function trysteroTransport(on: Handlers): Promise<Transport> {
  const { joinRoom } = await import("trystero/nostr");
  const room = joinRoom({ appId: APP_ID }, ROOM);
  const presence = room.makeAction<Presence>("pres"), chat = room.makeAction<{ text: string; to?: number }>("chat"), act = room.makeAction<Act>("act");
  act.onMessage = (data, { peerId }) => on.act(data, peerId);
  presence.onMessage = (data, { peerId }) => on.presence(data, peerId);
  chat.onMessage = (data, { peerId }) => on.chat(data, peerId);
  room.onPeerJoin = peer => on.join(peer);
  room.onPeerLeave = peer => on.leave(peer);
  return {
    sendPresence: data => { void presence.send(data); },
    sendChat: (data, peer) => { void chat.send(data, peer ? { target: peer } : undefined); },
    sendAct: (data, peer) => { void act.send(data, { target: peer }); },
    leave: () => { void room.leave(); },
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

type Peer = { presence: Presence; seen: number; chats: number[]; acts: number[] };
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
  private peers = new Map<string, Peer>(); private social: Social = { friends: [], ignored: [], online: true };
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
    for (const [peer, entry] of this.peers) if (entry.presence.id === target) this.transport.sendAct(act, peer);
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
        if (entry && now - entry.seen < 200) return; // at most five updates a second
        // One avatar per Friend: a newer connection claiming the same Friend replaces the older.
        for (const [other, value] of this.peers) if (other !== peer && value.presence.id === presence.id) this.peers.delete(other);
        this.peers.set(peer, { presence, seen: now, chats: entry?.chats ?? [], acts: entry?.acts ?? [] });
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
        const entry = this.peers.get(peer), now = Date.now();
        if (!entry || this.social.ignored.includes(entry.presence.id)) return;
        entry.acts = entry.acts.filter(at => now - at < 1000);
        if (entry.acts.length >= 12) return; // twelve a second is plenty for a trade
        const act = cleanAct(data);
        if (!act) return;
        entry.acts.push(now);
        this.post({ type: NET_ACT_IN, from: entry.presence.id, act });
      },
      join: () => this.publish(),
      leave: peer => { this.peers.delete(peer); this.publish(); },
    };
    try {
      this.transport = this.local ? localTransport(handlers) : await trysteroTransport(handlers);
      this.status = "online";
    } catch { this.status = "offline"; }
    this.joining = false;
    this.sweep ??= setInterval(() => {
      const now = Date.now(); let changed = false;
      for (const [peer, entry] of this.peers) if (now - entry.seen > STALE_MS) { this.peers.delete(peer); changed = true; }
      if (changed) this.publish();
    }, 2000);
    this.publish(true);
  }
  private disconnect() {
    this.transport?.leave(); this.transport = null; this.peers.clear(); this.status = "offline";
    if (this.sweep) clearInterval(this.sweep); this.sweep = null;
  }
  private save() { if (this.account) try { localStorage.setItem(socialKey(this.account), JSON.stringify(this.social)); } catch { /* play on without saving */ } }
  private publishTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tell the game who's around (at most every 150 ms, or at once when forced). */
  private publish(now = false) {
    const send = () => {
      this.publishTimer = null;
      const peers = [...this.peers.values()].map(entry => entry.presence).filter(presence => !this.social.ignored.includes(presence.id));
      const state: NetState = { status: this.social.online ? this.status : "offline", peers, friends: this.social.friends, ignored: this.social.ignored, players: peers.length + (this.transport ? 1 : 0) };
      const key = JSON.stringify(state);
      if (key === this.lastState) return;
      this.lastState = key; this.post({ type: "rarefriends-realm:net-state", ...state });
    };
    if (now) { if (this.publishTimer) clearTimeout(this.publishTimer); send(); }
    else this.publishTimer ??= setTimeout(send, 150);
  }
}
