/**
 * Save codes: your whole adventure as one line of text, so a cleared browser can't take it from you. The save is
 * JSON, deflated and written in URL-safe base64, behind the Friend it belongs to and a checksum:
 *
 *   RFR1-<friend id>-<checksum>-<data>
 *
 * A code only restores onto the Friend it was made for, and the engine validates every field on restore, exactly as
 * it does for browser saves (it is simulated progress, so a player could edit their own; the checks keep it sane).
 */
import { restore, serialize } from "./engine.ts";
import type { Game } from "./state.ts";

const PREFIX = "RFR1";
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}
const toBase64Url = (bytes: Uint8Array) => { let text = ""; for (const byte of bytes) text += String.fromCharCode(byte); return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const fromBase64Url = (text: string) => { const raw = atob(text.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, char => char.charCodeAt(0)); };
/** FNV-1a, enough to catch a mistyped or truncated code. */
function checksum(text: string) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }

export async function makeSaveCode(game: Game): Promise<string> {
  const json = JSON.stringify(serialize(game)), body = toBase64Url(await pipe(new TextEncoder().encode(json), new CompressionStream("deflate-raw")));
  const friend = String(game.player.friendId);
  return `${PREFIX}-${friend}-${checksum(`${friend}.${body}`)}-${body}`;
}
/** Restore a code onto this game. Returns an error to show, or null when it worked. */
export async function restoreSaveCode(game: Game, code: string): Promise<string | null> {
  const match = /^RFR1-([0-9]{1,15})-([0-9a-z]{1,8})-([A-Za-z0-9_-]{8,200000})$/.exec(code.trim().replace(/\s+/g, ""));
  if (!match) return "That doesn't look like a RareFriends Realm save code.";
  const [, friend, sum, body] = match;
  if (checksum(`${friend}.${body}`) !== sum) return "That code is damaged: check it was copied in full.";
  if (Number(friend) !== game.player.friendId) return `That code is for Friend #${friend}. Connect with that Friend to restore it.`;
  let save: unknown;
  try { save = JSON.parse(new TextDecoder().decode(await pipe(fromBase64Url(body), new DecompressionStream("deflate-raw")))); }
  catch { return "That code couldn't be read."; }
  return restore(game, save) ? null : "That code's adventure didn't pass the save checks.";
}
