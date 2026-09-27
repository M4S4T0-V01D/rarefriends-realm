/**
 * Trusted runtime page for RareFriends Realm.
 *
 * This is the SDK's own GameHost: wallet connection, owned-Friend picker, fresh eligibility check,
 * simulated ledger, confirmations and the sandboxed frame. It adds three things for the game:
 *  1. A read-only discovery of the connected account's eligible Friends with the SDK's `readOwnedFriends`,
 *     so your other owned Friends can follow you in the Realm.
 *  2. Per-wallet saves. The sandbox has no storage, so this trusted page keeps each wallet's adventure
 *     in its own localStorage, keyed by wallet address and Friend.
 *  3. Playing together (host/net.ts): other players' Friends, chat and a friends list, peer to peer. Only Friend IDs
 *     travel, and everything received is validated before the game sees it.
 *  4. Sharing the adventurer card. On the player's click, it uses the share sheet, clipboard, a download or an
 *     X post link. The sandbox has none of these powers.
 * All of them reach the sandboxed game only over postMessage, when it asks. The watcher session only uses
 * `eth_accounts`: no signing and no extra prompts. GameHost still owns connection and selection.
 */
import { useEffect, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { GameHost } from "@rarefriends/friendsdk/runtime";
import { parseChanceGame } from "@rarefriends/friendsdk/game";
import { readOwnedFriends } from "@rarefriends/friendsdk/owned";
import { createFriendPublicClient, createFriendWalletSession } from "@rarefriends/friendsdk/wallet";
import {
  HOST_HELLO, HOST_STATE, SAVE_EXPORT, SAVE_EXPORT_RESULT, SAVE_WRITE, SHARE_REQUEST, SHARE_RESULT, type ShareAction, type ShareOutcome,
} from "../games/rarefriends-realm/roster.ts";
import { NET_ACT, NET_CHAT, NET_ONLINE, NET_PRESENCE, NET_SOCIAL } from "../games/rarefriends-realm/net.ts";
import { NetHub } from "./net.ts";
import gameJson from "../games/rarefriends-realm/game.json";
import "@rarefriends/friendsdk/frame.css";
import "@rarefriends/friendsdk/runtime.css";

const definition = parseChanceGame(gameJson);
/** One save per wallet and Friend: each of your Friends has its own adventure. */
const saveKey = (account: string, friend: string) => `rarefriends-realm:save:v1:${account.toLowerCase()}:${friend}`;
function readSave(account: string, friend: string | null): unknown {
  if (!friend) return null;
  try { const raw = localStorage.getItem(saveKey(account, friend)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeSave(account: string, friend: string, save: unknown) {
  try { const raw = JSON.stringify(save); if (raw.length < 200_000) localStorage.setItem(saveKey(account, friend), raw); } catch { /* Storage full or blocked: play continues unsaved. */ }
}

function download(image: Blob, filename: string) {
  const url = URL.createObjectURL(image), link = document.createElement("a");
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
async function copyImage(image: Blob) {
  try { await navigator.clipboard.write([new ClipboardItem({ "image/png": image })]); return true; } catch { return false; }
}
/** Runs inside the click's user activation, which the browser passes up from the game frame. */
async function share(action: ShareAction, text: string, image: Blob, filename: string): Promise<ShareOutcome> {
  if (action === "copy") return await copyImage(image) ? "copied" : "failed";
  if (action === "save") { download(image, filename); return "saved"; }
  // Phones: the share sheet can send the picture and the text straight to the X app.
  const file = new File([image], filename, { type: "image/png" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file], text })) {
    try { await navigator.share({ files: [file], text }); return "shared"; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return "cancelled"; }
  }
  // Desktop: X post links can't carry images, so copy the picture (or save it), then open the prefilled post.
  const copied = await copyImage(image);
  if (!copied) download(image, filename);
  window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  return copied ? "copied-and-opened" : "saved-and-opened";
}

function RealmHost() {
  useEffect(() => {
    const session = createFriendWalletSession(), client = createFriendPublicClient();
    let account: string | null = null, controller: AbortController | null = null, roster: string[] | null = null, friend: string | null = null;
    const frames = () => [...document.querySelectorAll("iframe")].flatMap(frame => frame.contentWindow ? [frame.contentWindow] : []);
    // Nothing is sent until this wallet's roster is known, so the game can match it to its verified manager.
    const owns = (id: unknown) => !!roster?.some(entry => entry.split(":")[0] === String(id));
    const send = (target: Window) => { if (account && roster) target.postMessage({ type: HOST_STATE, ids: roster, save: owns(friend) ? readSave(account, friend) : null }, "*"); };
    const broadcast = () => frames().forEach(send);
    // Playing together: tests (navigator.webdriver) meet over a same-origin channel, everyone else peer to peer.
    const hub = new NetHub(message => frames().forEach(target => target.postMessage(message, "*")), navigator.webdriver);
    const sync = () => hub.setPlayer(account, account && roster && owns(friend) ? Number(friend) : null);
    const check = () => {
      const snapshot = session.getSnapshot();
      const next = snapshot.status === "connected" ? snapshot.account : null;
      if (next === account) return;
      account = next; controller?.abort(); roster = null; sync();
      if (!next) return;
      const current = controller = new AbortController();
      // Discovery can hit public-RPC rate limits, so retry a few times before giving up (the game then plays unsaved).
      const discover = (attempt: number): void => {
        void readOwnedFriends(client, next, { signal: current.signal })
          .then(result => { if (!current.signal.aborted) { roster = result.friends.map(owned => `${owned.id}:${owned.generation}`); broadcast(); sync(); } })
          .catch(() => { if (!current.signal.aborted && attempt < 3) setTimeout(() => discover(attempt + 1), 1500 * (attempt + 1)); });
      };
      discover(0);
    };
    // Only the game frame we host may ask or save. Saves are accepted only for a Friend in this wallet's roster.
    const receive = (event: MessageEvent) => {
      if (!event.source || !frames().includes(event.source as Window)) return;
      if (event.data?.type === HOST_HELLO) { friend = /^[0-9]{1,15}$/.test(String(event.data.friend)) ? String(event.data.friend) : null; send(event.source as Window); sync(); }
      else if (event.data?.type === NET_PRESENCE) hub.presence(event.data.presence);
      else if (event.data?.type === NET_CHAT) hub.chat(event.data.text, event.data.to);
      else if (event.data?.type === NET_ACT) hub.act(event.data.act, event.data.to);
      else if (event.data?.type === NET_SOCIAL && typeof event.data.op === "string" && typeof event.data.id === "number") hub.changeSocial(event.data.op, event.data.id);
      else if (event.data?.type === NET_ONLINE) hub.setOnline(event.data.on === true);
      else if (event.data?.type === SAVE_EXPORT && (event.data.action === "copy" || event.data.action === "download") && typeof event.data.text === "string"
        && /^RFR1-[0-9]{1,15}-[0-9a-z]{1,8}-[A-Za-z0-9_-]{8,200000}$/.test(event.data.text)) {
        // Your save code, copied or downloaded on your click (the sandbox can do neither).
        const source = event.source as Window, text = event.data.text as string, friendId = text.split("-")[1];
        const done = (result: string) => source.postMessage({ type: SAVE_EXPORT_RESULT, result }, "*");
        if (event.data.action === "download") { download(new Blob([text], { type: "text/plain" }), `rarefriends-realm-friend-${friendId}-save.txt`); done("saved"); }
        else void navigator.clipboard.writeText(text).then(() => done("copied"), () => { download(new Blob([text], { type: "text/plain" }), `rarefriends-realm-friend-${friendId}-save.txt`); done("saved"); });
      }
      else if (event.data?.type === SAVE_WRITE && account && owns(event.data.friend)) writeSave(account, String(event.data.friend), event.data.save);
      else if (event.data?.type === SHARE_REQUEST && ["post", "copy", "save"].includes(event.data.action) && event.data.image instanceof Blob
        && event.data.image.type === "image/png" && event.data.image.size < 5_000_000 && typeof event.data.text === "string" && event.data.text.length <= 1000) {
        const source = event.source as Window, action = event.data.action as ShareAction;
        const filename = /^[a-z0-9-]{1,60}\.png$/.test(event.data.filename) ? event.data.filename : "rarefriends-realm-card.png";
        void share(action, event.data.text, event.data.image, filename).catch((): ShareOutcome => "failed")
          .then(result => source.postMessage({ type: SHARE_RESULT, action, result }, "*"));
      }
    };
    window.addEventListener("message", receive);
    const unsubscribe = session.subscribe(check); check();
    // Pick up a connection made through GameHost even if the wallet emits no accountsChanged event.
    const poll = setInterval(() => { if (session.getSnapshot().status !== "connected") void session.refresh(); }, 2500);
    const bye = () => hub.dispose();
    window.addEventListener("pagehide", bye);
    return () => { clearInterval(poll); unsubscribe(); window.removeEventListener("message", receive); window.removeEventListener("pagehide", bye); hub.dispose(); controller?.abort(); session.dispose(); };
  }, []);
  // The same wide layout as games/rarefriends-realm/host.css, set on the wrapper as HOST_INTEGRATION.md describes.
  return <div style={{ "--rf-game-max-width": "1280px", "--rf-game-aspect-ratio": "16 / 9" } as CSSProperties}><GameHost definition={definition} frameUrl="./game.html" /></div>;
}

createRoot(document.getElementById("root")!).render(<RealmHost />);
