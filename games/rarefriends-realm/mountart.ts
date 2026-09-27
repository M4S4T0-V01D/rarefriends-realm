/**
 * Horses and unicorns in the Realm's pixel style: side, front and back views, a four-frame walk (and an idle with a
 * swishing tail), coats with socks, blazes, dapples, piebald patches or stars, and unicorn horns with rainbow manes.
 * Two world pixels per art pixel, like the trees and rocks; the rider sits at `SADDLE`.
 */
import type { Coat } from "./data.ts";
import { Pixels, pixelArt, shadeHex } from "./pixel.ts";

export type MountView = "side" | "front" | "back";
/** Art sizes, and the saddle's height above the hooves (art pixels), where the rider sits. */
export const MOUNT_SIZE: Record<MountView, { w: number; h: number }> = { side: { w: 34, h: 28 }, front: { w: 20, h: 28 }, back: { w: 20, h: 28 } };
export const SADDLE = 17;
const RAINBOW = ["#e7a9b0", "#ebc26b", "#b4d4a0", "#9fc6f0", "#c6bed4"];
const SADDLE_LEATHER = "#7a3b2e", BLANKET = "#9fb4d0";
const hash = (a: number, b: number) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 0) % 1000) / 1000; };

/**
 * A mount, `frame` 0–3 of its walk (or −1 standing), with a saddle when ridden or for sale. Facing you, a ridden mount is
 * drawn in two layers around its rider: the `body` under them and the `head` (and neck) over them.
 */
export type MountLayer = "all" | "body" | "head";
export function mountArt(coat: Coat, view: MountView, frame: number, saddle: boolean, layer: MountLayer = "all"): HTMLCanvasElement {
  const { w, h } = MOUNT_SIZE[view];
  return pixelArt(`mount:${JSON.stringify(coat)}:${view}:${frame}:${saddle}:${layer}`, w, h, p => {
    if (view === "side") side(p, coat, frame, saddle); else if (view === "front") front(p, coat, frame, saddle, layer); else back(p, coat, frame, saddle);
    markings(p, coat, view);
    p.outline();
  });
}
/** Mane colour along a strand (rainbow for unicorns that have one). */
const maneAt = (coat: Coat, i: number) => coat.rainbow ? RAINBOW[i % RAINBOW.length] : i % 3 === 2 ? shadeHex(coat.mane, -0.08) : coat.mane;

function leg(p: Pixels, coat: Coat, x: number, top: number, bottom: number, swing: number, far: boolean) {
  // A leg from the body down to its hoof; `swing` moves the hoof forward or back (and lifts it), far legs are darker.
  const color = far ? shadeHex(coat.body, -0.12) : coat.body, lift = Math.abs(swing) > 1 ? 1 : 0, foot = bottom - lift;
  p.line(x, top, x + Math.round(swing / 2), foot - 3, color, 2);
  p.line(x + Math.round(swing / 2), foot - 3, x + swing, foot - 1, color, 2);
  if (coat.socks) p.rect(x + swing - 0.5, foot - 3, 2, 2, far ? shadeHex(coat.socks, -0.1) : coat.socks);
  p.rect(x + swing - 0.5, foot - 1, 2, 1, coat.hoof);
}

function side(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), light = shadeHex(body, 0.08), oy = 4;
  // Walk: diagonal pairs swing together; standing, all four square.
  const swings = frame < 0 ? [0, 0, 0, 0] : [[2, -2, -2, 2], [1, -1, -1, 1], [-2, 2, 2, -2], [-1, 1, 1, -1]][frame & 3];
  const bob = frame < 0 ? 0 : frame % 2;
  // Far legs first (behind the body), then the tail.
  leg(p, coat, 10, 16 + oy, 27, swings[1], true); leg(p, coat, 23, 16 + oy, 27, swings[3], true);
  const swish = frame < 0 ? 0 : [0, 1, 0, -1][frame & 3];
  for (let i = 0; i < 9; i++) { const x = 6 - Math.round(i * 0.35) + (i > 4 ? swish : 0), y = 9 + oy + i; p.rect(x - 1, y, 2 + (i > 2 && i < 7 ? 1 : 0), 1, maneAt(coat, i)); }
  // Barrel body, lit along the back and shaded under the belly.
  p.disc(16, 13 + oy + bob, 10, 5, body, null);
  p.rect(8, 9 + oy + bob, 16, 1, light);
  p.line(9, 17 + oy + bob, 22, 17 + oy + bob, dark);
  // Neck rising to the head; the head long, with a darker muzzle, a pricked ear and an eye.
  p.poly([[21, 10 + oy + bob], [24, 3 + oy], [28, 2 + oy], [29, 6 + oy], [26, 14 + oy + bob]], body, null);
  p.poly([[25, 2 + oy], [28, 0 + oy], [30, 1 + oy], [33, 6 + oy], [32, 8 + oy], [29, 8 + oy], [27, 5 + oy]], body, null);
  p.rect(31, 6 + oy, 2, 2, shadeHex(body, -0.18)); p.set(32, 7 + oy, "#161616");
  p.line(26, 1 + oy, 26, -1 + oy, dark, 2);
  p.set(29, 3 + oy, "#161616"); p.set(29, 2 + oy, "#ffffff");
  if (coat.blaze) p.line(30, 2 + oy, 32, 6 + oy, coat.blaze);
  // Mane down the neck, and a forelock.
  for (let i = 0; i < 8; i++) p.rect(24 - Math.round(i * 0.55), 2 + oy + i, 2, 1, maneAt(coat, i));
  p.rect(27, 1 + oy, 2, 1, maneAt(coat, 1));
  if (coat.horn) { p.line(29, 0 + oy, 32, -4 + oy, coat.horn, 1); p.line(28, 0 + oy, 31, -4 + oy, coat.horn, 1); p.set(30, -2 + oy, shadeHex(coat.horn, -0.2)); p.set(31, -4 + oy, "#ffffff"); }
  // Near legs.
  leg(p, coat, 12, 16 + oy, 27, swings[0], false); leg(p, coat, 21, 16 + oy, 27, swings[2], false);
  if (saddle) {
    p.rect(12, 8 + oy + bob, 9, 4, BLANKET); p.rect(12, 11 + oy + bob, 9, 1, shadeHex(BLANKET, -0.15));
    p.poly([[12, 8 + oy + bob], [13, 6 + oy + bob], [20, 6 + oy + bob], [21, 8 + oy + bob]], SADDLE_LEATHER, null);
    p.rect(15, 12 + oy + bob, 1, 4, SADDLE_LEATHER); p.rect(14, 15 + oy + bob, 3, 1, "#c9c2b6");
  }
}
function front(p: Pixels, coat: Coat, frame: number, saddle: boolean, layer: MountLayer) {
  const body = coat.body, dark = shadeHex(body, -0.12), lift = frame < 0 ? [0, 0] : [[1, 0], [0, 0], [0, 1], [0, 0]][frame & 3];
  let oy = 4;
  if (layer !== "head") {
    // Hind legs peeking out behind, then the chest.
    leg(p, coat, 5, 16 + oy, 27 - 1, 0, true); leg(p, coat, 14, 16 + oy, 27 - 1, 0, true);
    p.disc(10, 13 + oy, 6.5, 5.5, body, null);
    if (saddle) { p.rect(3, 11 + oy, 2, 4, BLANKET); p.rect(15, 11 + oy, 2, 4, BLANKET); p.rect(3, 9 + oy, 14, 2, SADDLE_LEATHER); }
    leg(p, coat, 7, 16 + oy, 27 - lift[0], 0, false); leg(p, coat, 12, 16 + oy, 27 - lift[1], 0, false);
  }
  if (layer === "body") return;
  // Ridden, the head carries a little lower and forward (over the chest), so the rider's face shows above it.
  if (layer === "head") oy = 8;
  // The head, facing you: long, a darker muzzle with nostrils, eyes on either side, ears up, a forelock.
  p.poly([[7, 1 + oy], [13, 1 + oy], [14, 6 + oy], [12.5, 13 + oy], [7.5, 13 + oy], [6, 6 + oy]], body, null);
  p.rect(8, 10 + oy, 4, 3, shadeHex(body, -0.18)); p.set(8, 11 + oy, "#161616"); p.set(11, 11 + oy, "#161616");
  p.set(7, 5 + oy, "#161616"); p.set(12, 5 + oy, "#161616");
  p.line(7, 0 + oy, 7, -2 + oy, dark, 2); p.line(12, 0 + oy, 12, -2 + oy, dark, 2);
  for (let i = 0; i < 4; i++) p.rect(8 + i, 1 + oy, 1, 2 + (i % 2), maneAt(coat, i));
  if (coat.blaze) p.line(10, 4 + oy, 10, 9 + oy, coat.blaze);
  if (coat.horn) { p.rect(9, -4 + oy, 2, 5, coat.horn); p.set(9, -2 + oy, shadeHex(coat.horn, -0.2)); p.set(10, -4 + oy, "#ffffff"); }
}
function back(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), oy = 4, lift = frame < 0 ? [0, 0] : [[1, 0], [0, 0], [0, 1], [0, 0]][frame & 3];
  // The head beyond the rump, ears up; then the rump, the tail and the hind legs.
  p.poly([[8, 1 + oy], [12, 1 + oy], [12, 7 + oy], [8, 7 + oy]], dark, null);
  p.line(8, 0 + oy, 8, -2 + oy, dark, 2); p.line(12, 0 + oy, 12, -2 + oy, dark, 2);
  for (let i = 0; i < 6; i++) p.rect(9, 1 + oy + i, 2, 1, maneAt(coat, i));
  if (coat.horn) { p.rect(9, -4 + oy, 2, 4, coat.horn); }
  leg(p, coat, 7, 16 + oy, 27, 0, true); leg(p, coat, 12, 16 + oy, 27, 0, true);
  p.disc(10, 12 + oy, 7, 6, body, null);
  p.line(5, 8 + oy, 15, 8 + oy, shadeHex(body, 0.08));
  if (saddle) { p.rect(4, 8 + oy, 12, 3, BLANKET); p.rect(5, 7 + oy, 10, 2, SADDLE_LEATHER); }
  const swish = frame < 0 ? 0 : [0, 1, 0, -1][frame & 3];
  for (let i = 0; i < 10; i++) p.rect(9 + (i > 5 ? swish : 0), 11 + oy + i, 2, 1, maneAt(coat, i));
  leg(p, coat, 5, 16 + oy, 27 - lift[0], 0, false); leg(p, coat, 14, 16 + oy, 27 - lift[1], 0, false);
}
/** Dapples, piebald patches or stars over the coat (only on body-coloured pixels). */
function markings(p: Pixels, coat: Coat, view: MountView) {
  if (!coat.pattern) return;
  const probe = new Pixels(1, 1); probe.set(0, 0, coat.body); const bodyValue = probe.data[0];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.get(x, y) !== bodyValue) continue;
    const r = hash(x + (view === "side" ? 0 : 50), y);
    if (coat.pattern === "dapple" && (x + y * 2) % 4 === 0 && r > 0.35) p.set(x, y, shadeHex(coat.body, r > 0.7 ? -0.1 : 0.06));
    if (coat.pattern === "piebald" && hash(Math.floor(x / 5), Math.floor(y / 4) + 7) > 0.55) p.set(x, y, "#5a4a3e");
    if (coat.pattern === "stars" && r > 0.93) p.set(x, y, r > 0.97 ? "#ffffff" : "#c6d4f0");
  }
}
