/**
 * Mounts in the Realm's pixel style: horses and unicorns, and the stranger beasts the stables took in later (a cave
 * spider, a dire wolf, a great stag, tigers and little dragons). Side, front and back views, a four-frame walk (and an
 * idle with a swishing tail), coats with socks, blazes, dapples, piebald patches or stars, unicorn horns with rainbow
 * manes, stripes, antlers, wings. Two world pixels per art pixel, like the trees and rocks; the rider sits at the
 * saddle's height, which each kind has its own (`saddleHeight`).
 */
import type { Coat } from "./data.ts";
import { Pixels, pixelArt, shadeHex } from "./pixel.ts";

export type MountView = "side" | "front" | "back";
/** Art sizes, and the saddle's height above the hooves (art pixels), where a horse's rider sits. */
export const MOUNT_SIZE: Record<MountView, { w: number; h: number }> = { side: { w: 34, h: 28 }, front: { w: 20, h: 28 }, back: { w: 20, h: 28 } };
/** A mount's picture size: a spider's front and back are wider (it stands with its legs spread). */
export const mountSize = (coat: Coat, view: MountView) => coat.kind === "spider" && view !== "side" ? { w: SPIDER_W, h: MOUNT_SIZE[view].h } : MOUNT_SIZE[view];
export const SADDLE = 17;
/** Where the rider sits on each kind: a horse's or a stag's back is high, a cat's or a wolf's lower, a spider's abdomen between. */
export const saddleHeight = (coat: Coat) => ({ horse: SADDLE, stag: SADDLE, spider: 13, dragon: 13, tiger: 12, wolf: 12, golem: 19, camel: 22 } as const)[coat.kind ?? "horse"];
const RAINBOW = ["#e7a9b0", "#ebc26b", "#b4d4a0", "#9fc6f0", "#c6bed4"];
const SADDLE_LEATHER = "#7a3b2e", BLANKET = "#9fb4d0", INK = "#161616", WHITE = "#ffffff";
const hash = (a: number, b: number) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 0) % 1000) / 1000; };

/**
 * A mount, `frame` 0–3 of its walk (or −1 standing), with a saddle when ridden or for sale. Facing you, a ridden mount is
 * drawn in two layers around its rider: the `body` under them and the `head` (and neck) over them.
 */
export type MountLayer = "all" | "body" | "head" | "rump";
/** From behind, how far above the saddle's seat the rump layer starts (it covers the rider from there down: their legs, astride). */
export const RUMP_ABOVE_SEAT = 1;
export function mountArt(coat: Coat, view: MountView, frame: number, saddle: boolean, layer: MountLayer = "all"): HTMLCanvasElement {
  const { w, h } = mountSize(coat, view);
  return pixelArt(`mount:${JSON.stringify(coat)}:${view}:${frame}:${saddle}:${layer}`, w, h, p => {
    const kind = coat.kind ?? "horse";
    if (kind === "horse" || kind === "stag") { if (view === "side") side(p, coat, frame, saddle); else if (view === "front") front(p, coat, frame, saddle, layer); else back(p, coat, frame, saddle); markings(p, coat, view); }
    else if (kind === "tiger" || kind === "wolf") { if (view === "side") catSide(p, coat, frame, saddle); else if (view === "front") catFront(p, coat, frame, saddle, layer); else catBack(p, coat, frame, saddle); }
    else if (kind === "spider") { if (view === "side") spiderSide(p, coat, frame, saddle); else if (view === "front") spiderFront(p, coat, frame, saddle, layer); else spiderBack(p, coat, frame, saddle); }
    else if (kind === "dragon") { if (view === "side") dragonSide(p, coat, frame, saddle); else if (view === "front") dragonFront(p, coat, frame, saddle, layer); else dragonBack(p, coat, frame, saddle); }
    else if (kind === "camel") { if (view === "side") camelSide(p, coat, frame, saddle); else if (view === "front") camelFront(p, coat, frame, saddle, layer); else camelBack(p, coat, frame, saddle); }
    else if (kind === "golem") { if (view === "side") golemSide(p, coat, frame, saddle); else if (view === "front") golemFront(p, coat, frame, saddle, layer); else golemBack(p, coat, frame, saddle); }
    p.outline();
    // From behind, ridden: the rows from just above the saddle down, drawn again over the rider so their legs are hidden astride it.
    if (layer === "rump") p.data.fill(0, 0, Math.max(0, h - saddleHeight(coat) - RUMP_ABOVE_SEAT) * w);
  });
}
/** Mane colour along a strand (rainbow for unicorns that have one). */
const maneAt = (coat: Coat, i: number) => coat.rainbow ? RAINBOW[i % RAINBOW.length] : i % 3 === 2 ? shadeHex(coat.mane, -0.08) : coat.mane;
/** The walk: diagonal pairs swing together (standing, all four square), and the body bobs on alternate frames. */
const walk = (frame: number) => ({ swings: frame < 0 ? [0, 0, 0, 0] : [[2, -2, -2, 2], [1, -1, -1, 1], [-2, 2, 2, -2], [-1, 1, 1, -1]][frame & 3], bob: frame < 0 ? 0 : frame % 2, lift: frame < 0 ? [0, 0] : [[1, 0], [0, 0], [0, 1], [0, 0]][frame & 3], swish: frame < 0 ? 0 : [0, 1, 0, -1][frame & 3] });

function leg(p: Pixels, coat: Coat, x: number, top: number, bottom: number, swing: number, far: boolean) {
  // A leg from the body down to its hoof; `swing` moves the hoof forward or back (and lifts it), far legs are darker.
  const color = far ? shadeHex(coat.body, -0.12) : coat.body, lift = Math.abs(swing) > 1 ? 1 : 0, foot = bottom - lift;
  p.line(x, top, x + Math.round(swing / 2), foot - 3, color, 2);
  p.line(x + Math.round(swing / 2), foot - 3, x + swing, foot - 1, color, 2);
  if (coat.socks) p.rect(x + swing - 0.5, foot - 3, 2, 2, far ? shadeHex(coat.socks, -0.1) : coat.socks);
  p.rect(x + swing - 0.5, foot - 1, 2, 1, coat.hoof);
}
/** A horse's saddle and blanket from the side, on the back at `top`. */
function sideSaddle(p: Pixels, x: number, top: number, w: number) {
  p.rect(x, top, w, 4, BLANKET); p.rect(x, top + 3, w, 1, shadeHex(BLANKET, -0.15));
  p.poly([[x, top], [x + 1, top - 2], [x + w - 1, top - 2], [x + w, top]], SADDLE_LEATHER, null);
  p.rect(x + 3, top + 4, 1, 4, SADDLE_LEATHER); p.rect(x + 2, top + 7, 3, 1, "#c9c2b6");
}
/** A stag's antlers: a beam up and back from the head, with tines. */
function antlers(p: Pixels, coat: Coat, x: number, y: number, mirror: 1 | -1, view: MountView) {
  const bone = coat.accent ?? "#e8dcc4", dark = shadeHex(bone, -0.2);
  if (view === "side") {
    // Two beams sweeping up and back from the poll, each with tines forward and up.
    for (const m of [0, 3]) { const c = m ? bone : dark; p.polyline([[x + m, y], [x + m - 3, y - 2], [x + m - 7, y - 3], [x + m - 10, y - 2]], c, 1); p.line(x + m - 2, y - 1, x + m - 1, y - 4, c, 1); p.line(x + m - 5, y - 2, x + m - 5, y - 4, c, 1); p.line(x + m - 8, y - 3, x + m - 9, y - 4, c, 1); }
  } else {
    for (const m of [-1, 1] as const) { const s = m * mirror; p.polyline([[x, y], [x + 2 * s, y - 2], [x + 5 * s, y - 3], [x + 8 * s, y - 2]], bone, 1); p.line(x + 2 * s, y - 2, x + 2 * s, y - 4, dark, 1); p.line(x + 5 * s, y - 3, x + 6 * s, y - 4, dark, 1); p.line(x + 7 * s, y - 2, x + 8 * s, y - 4, bone, 1); }
  }
}

// ---------- Horses, unicorns and stags ----------
function side(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), light = shadeHex(body, 0.08), oy = 4, stag = coat.kind === "stag", { swings, bob, swish } = walk(frame);
  // Far legs first (behind the body), then the tail.
  leg(p, coat, 10, 16 + oy, 27, swings[1], true); leg(p, coat, 23, 16 + oy, 27, swings[3], true);
  if (stag) { p.rect(5, 10 + oy + bob, 3, 3, coat.belly ?? "#d9c9a8"); p.rect(5, 12 + oy + bob + (swish > 0 ? 1 : 0), 2, 2, coat.mane); }
  else for (let i = 0; i < 9; i++) { const x = 6 - Math.round(i * 0.35) + (i > 4 ? swish : 0), y = 9 + oy + i; p.rect(x - 1, y, 2 + (i > 2 && i < 7 ? 1 : 0), 1, maneAt(coat, i)); }
  // Barrel body, lit along the back and shaded under the belly (a stag's slimmer, its belly pale).
  p.disc(16, 13 + oy + bob, stag ? 9 : 10, stag ? 4.5 : 5, body, null);
  p.rect(8, 9 + oy + bob, 16, 1, light);
  p.line(9, 17 + oy + bob, 22, 17 + oy + bob, stag ? (coat.belly ?? "#d9c9a8") : dark);
  // Neck rising to the head; the head long, with a darker muzzle, a pricked ear and an eye.
  p.poly([[21, 10 + oy + bob], [24, 3 + oy], [28, 2 + oy], [29, 6 + oy], [26, 14 + oy + bob]], body, null);
  p.poly([[25, 2 + oy], [28, 0 + oy], [30, 1 + oy], [33, 6 + oy], [32, 8 + oy], [29, 8 + oy], [27, 5 + oy]], body, null);
  p.rect(31, 6 + oy, 2, 2, shadeHex(body, -0.18)); p.set(32, 7 + oy, INK);
  p.line(26, 1 + oy, 26, -1 + oy, dark, 2);
  p.set(29, 3 + oy, INK); p.set(29, 2 + oy, WHITE);
  if (coat.blaze) p.line(30, 2 + oy, 32, 6 + oy, coat.blaze);
  // Mane down the neck, and a forelock (a stag has a short dark crest and antlers instead).
  if (stag) { for (let i = 0; i < 6; i++) p.rect(24 - Math.round(i * 0.55), 2 + oy + i, 1, 1, coat.mane); antlers(p, coat, 27, 0 + oy, 1, "side"); }
  else { for (let i = 0; i < 8; i++) p.rect(24 - Math.round(i * 0.55), 2 + oy + i, 2, 1, maneAt(coat, i)); p.rect(27, 1 + oy, 2, 1, maneAt(coat, 1)); }
  if (coat.horn) { p.line(29, 0 + oy, 32, -4 + oy, coat.horn, 1); p.line(28, 0 + oy, 31, -4 + oy, coat.horn, 1); p.set(30, -2 + oy, shadeHex(coat.horn, -0.2)); p.set(31, -4 + oy, WHITE); }
  if (coat.barding) bardingSide(p, coat, oy + bob);
  // Near legs.
  leg(p, coat, 12, 16 + oy, 27, swings[0], false); leg(p, coat, 21, 16 + oy, 27, swings[2], false);
  if (saddle) sideSaddle(p, 12, 8 + oy + bob, 9);
}
/** A caparison from the side: cloth over the back, hanging below the belly, its edge scalloped in the trim, the emblem on the flank; and a plate down the face. */
function bardingSide(p: Pixels, coat: Coat, oy: number) {
  const cloth = coat.barding!, trim = coat.trim ?? shadeHex(cloth, -0.25), fold = shadeHex(cloth, -0.1);
  for (let y = 9; y <= 19; y++) {
    const dy = (y - 13) / 5, half = y >= 13 ? 9 : Math.round(10 * Math.sqrt(Math.max(0, 1 - dy * dy)));
    for (let x = 16 - half; x < 16 + half; x++) p.set(x, y + oy, (x - 16 + half) % 5 === 4 ? fold : cloth);
  }
  p.rect(8, 9 + oy, 16, 1, shadeHex(cloth, 0.14));
  for (let x = 7; x < 25; x++) p.set(x, 19 + oy + (x % 3 === 0 ? 1 : 0), trim);
  p.disc(16, 14 + oy, 2, 2, trim, null); p.set(16, 14 + oy, cloth);
  p.line(29, 3 + oy, 32, 6 + oy, trim, 1);
}
function front(p: Pixels, coat: Coat, frame: number, saddle: boolean, layer: MountLayer) {
  const body = coat.body, dark = shadeHex(body, -0.12), stag = coat.kind === "stag", { lift } = walk(frame);
  let oy = 4;
  if (layer !== "head") {
    // Hind legs peeking out behind, then the chest.
    leg(p, coat, 5, 16 + oy, 27 - 1, 0, true); leg(p, coat, 14, 16 + oy, 27 - 1, 0, true);
    p.disc(10, 13 + oy, stag ? 6 : 6.5, 5.5, body, null);
    if (stag) p.rect(8, 15 + oy, 4, 3, coat.belly ?? "#d9c9a8");
    if (saddle) { p.rect(3, 11 + oy, 2, 4, BLANKET); p.rect(15, 11 + oy, 2, 4, BLANKET); p.rect(3, 9 + oy, 14, 2, SADDLE_LEATHER); }
    if (coat.barding) { const trim = coat.trim ?? shadeHex(coat.barding, -0.25); p.rect(3, 12 + oy, 14, 7, coat.barding); p.rect(3, 12 + oy, 14, 1, shadeHex(coat.barding, 0.14)); for (let x = 3; x < 17; x++) p.set(x, 19 + oy + (x % 3 === 0 ? 1 : 0), trim); p.disc(10, 15 + oy, 1.5, 1.5, trim, null); }
    leg(p, coat, 7, 16 + oy, 27 - lift[0], 0, false); leg(p, coat, 12, 16 + oy, 27 - lift[1], 0, false);
  }
  if (layer === "body") return;
  // Ridden, the head carries a little lower and forward (over the chest), so the rider's face shows above it.
  if (layer === "head") oy = 8;
  // The head, facing you: long, a darker muzzle with nostrils, eyes on either side, ears up, a forelock.
  p.poly([[7, 1 + oy], [13, 1 + oy], [14, 6 + oy], [12.5, 13 + oy], [7.5, 13 + oy], [6, 6 + oy]], body, null);
  p.rect(8, 10 + oy, 4, 3, shadeHex(body, -0.18)); p.set(8, 11 + oy, INK); p.set(11, 11 + oy, INK);
  p.set(7, 5 + oy, INK); p.set(12, 5 + oy, INK);
  p.line(7, 0 + oy, 7, -2 + oy, dark, 2); p.line(12, 0 + oy, 12, -2 + oy, dark, 2);
  if (stag) antlers(p, coat, 10, 0 + oy, 1, "front"); else for (let i = 0; i < 4; i++) p.rect(8 + i, 1 + oy, 1, 2 + (i % 2), maneAt(coat, i));
  if (coat.blaze) p.line(10, 4 + oy, 10, 9 + oy, coat.blaze);
  if (coat.horn) { p.rect(9, -4 + oy, 2, 5, coat.horn); p.set(9, -2 + oy, shadeHex(coat.horn, -0.2)); p.set(10, -4 + oy, WHITE); }
}
function back(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), oy = 4, stag = coat.kind === "stag", { lift, swish } = walk(frame);
  // The head beyond the rump, ears up; then the rump, the tail and the hind legs.
  p.poly([[8, 1 + oy], [12, 1 + oy], [12, 7 + oy], [8, 7 + oy]], dark, null);
  p.line(8, 0 + oy, 8, -2 + oy, dark, 2); p.line(12, 0 + oy, 12, -2 + oy, dark, 2);
  if (stag) antlers(p, coat, 10, 0 + oy, -1, "back"); else for (let i = 0; i < 6; i++) p.rect(9, 1 + oy + i, 2, 1, maneAt(coat, i));
  if (coat.horn) { p.rect(9, -4 + oy, 2, 4, coat.horn); }
  leg(p, coat, 7, 16 + oy, 27, 0, true); leg(p, coat, 12, 16 + oy, 27, 0, true);
  p.disc(10, 12 + oy, stag ? 6.5 : 7, 6, body, null);
  p.line(5, 8 + oy, 15, 8 + oy, shadeHex(body, 0.08));
  if (coat.barding) { const trim = coat.trim ?? shadeHex(coat.barding, -0.25); p.rect(3, 8 + oy, 14, 11, coat.barding); p.rect(3, 8 + oy, 14, 1, shadeHex(coat.barding, 0.14)); for (let x = 3; x < 17; x++) p.set(x, 19 + oy + (x % 3 === 0 ? 1 : 0), trim); }
  if (saddle) { p.rect(4, 8 + oy, 12, 3, coat.barding ? shadeHex(coat.barding, -0.12) : BLANKET); p.rect(5, 7 + oy, 10, 2, SADDLE_LEATHER); }
  if (stag) { p.disc(10, 14 + oy, 3, 3, coat.belly ?? "#d9c9a8", null); p.rect(9, 11 + oy + (swish > 0 ? 1 : 0), 2, 3, coat.mane); }
  else for (let i = 0; i < 10; i++) p.rect(9 + (i > 5 ? swish : 0), 11 + oy + i, 2, 1, maneAt(coat, i));
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
    if (coat.pattern === "stars" && r > 0.93) p.set(x, y, r > 0.97 ? WHITE : "#c6d4f0");
  }
}

// ---------- Cats and wolves: long and low, a round head in front, a tail behind ----------
/** Stripes down the flank (a tiger) or a darker saddle of fur along the back (a wolf). */
function fur(p: Pixels, coat: Coat, x0: number, x1: number, top: number, bottom: number, step: number) {
  if (coat.kind === "tiger") { for (let x = x0; x <= x1; x += step) p.line(x, top, x + 1, bottom, coat.mane, 1); }
  else { p.rect(x0, top, x1 - x0 + 1, 2, coat.mane); p.rect(x0 + 1, top + 2, x1 - x0 - 1, 1, shadeHex(coat.mane, 0.1)); }
}
function catSide(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, light = shadeHex(body, 0.08), belly = coat.belly ?? shadeHex(body, 0.25), eye = coat.eye ?? "#e9b547", wolf = coat.kind === "wolf", oy = 4, { swings, bob, swish } = walk(frame);
  leg(p, coat, 9, 19 + oy, 27, swings[1], true); leg(p, coat, 23, 19 + oy, 27, swings[3], true);
  // The tail: a cat's long and curling up, a wolf's bushy and carried low.
  if (wolf && coat.tails) foxTails(p, coat, [6, 15 + oy + bob], [[1, 5 + oy + swish], [5, 2 + oy], [9, 5 + oy - swish]]);
  else if (wolf) { p.polyline([[5, 17 + oy + bob], [2, 20 + oy + bob + swish], [1, 23 + oy + swish]], body, 3); p.rect(0, 22 + oy + swish, 2, 2, belly); }
  else { p.polyline([[6, 16 + oy + bob], [3, 13 + oy + bob], [1, 9 + oy + swish], [2, 6 + oy + swish]], body, 2); for (let i = 0; i < 3; i++) p.set(1 + (i > 1 ? 1 : 0), 7 + oy + swish + i * 2, coat.mane); }
  // The body: long, low, lit along the back, pale under.
  p.disc(16, 16 + oy + bob, 11, 5, body, null);
  p.rect(7, 12 + oy + bob, 18, 1, light);
  p.rect(8, 19 + oy + bob, 16, 2, belly);
  fur(p, coat, 8, 24, 12 + oy + bob, 17 + oy + bob, 3);
  // The head: round, ears up (round for a cat, pointed for a wolf), a pale muzzle, an eye with a slit.
  p.disc(28, 12 + oy, 4.5, 4, body, null);
  if (wolf) { p.poly([[25, 9 + oy], [26, 5 + oy], [28, 9 + oy]], body, null); p.poly([[29, 9 + oy], [31, 5 + oy], [32, 9 + oy]], body, null); p.poly([[29, 12 + oy], [34, 13 + oy], [31, 16 + oy]], body, null); p.rect(31, 14 + oy, 3, 1, belly); }
  else { p.disc(26, 8 + oy, 1.5, 1.5, body, null); p.disc(31, 8 + oy, 1.5, 1.5, body, null); p.rect(31, 13 + oy, 3, 2, belly); p.line(27, 9 + oy, 28, 11 + oy, coat.mane, 1); p.line(30, 9 + oy, 29, 11 + oy, coat.mane, 1); }
  p.set(33, 13 + oy, INK); p.set(30, 11 + oy, eye); p.set(30, 10 + oy, WHITE);
  if (coat.tails) { p.line(29, 12 + oy, 31, 12 + oy, coat.mane, 1); p.set(27, 7 + oy, coat.mane); }
  leg(p, coat, 12, 19 + oy, 27, swings[0], false); leg(p, coat, 21, 19 + oy, 27, swings[2], false);
  if (saddle) sideSaddle(p, 12, 12 + oy + bob, 9);
}
/** A fox's tails, fanned up from `base` to each tip: thick and soft, the tips in the accent (foxfire). */
function foxTails(p: Pixels, coat: Coat, base: readonly [number, number], tips: readonly (readonly [number, number])[]) {
  const n = Math.min(coat.tails ?? 1, tips.length), tip = coat.accent ?? WHITE;
  for (let k = 0; k < n; k++) {
    const [tx, ty] = tips[k], mid: [number, number] = [Math.round((base[0] + tx) / 2 + (k - 1)), Math.round((base[1] + ty) / 2 + 2)];
    p.polyline([base, mid, [tx, ty]], k % 2 ? shadeHex(coat.body, -0.06) : coat.body, 3);
    p.disc(tx, ty, 1.5, 1.5, tip, null); p.set(tx, ty - 1, shadeHex(tip, 0.3));
  }
}
function catFront(p: Pixels, coat: Coat, frame: number, saddle: boolean, layer: MountLayer) {
  const body = coat.body, belly = coat.belly ?? shadeHex(body, 0.25), eye = coat.eye ?? "#e9b547", wolf = coat.kind === "wolf", { lift } = walk(frame);
  let oy = 4;
  if (layer !== "head" && wolf && coat.tails) foxTails(p, coat, [10, 17 + oy], [[2, 8 + oy], [18, 8 + oy], [16, 5 + oy]]);
  if (layer !== "head") {
    leg(p, coat, 4, 19 + oy, 26, 0, true); leg(p, coat, 15, 19 + oy, 26, 0, true);
    p.disc(10, 17 + oy, 7, 5, body, null); p.rect(7, 19 + oy, 6, 3, belly);
    fur(p, coat, 5, 15, 13 + oy, 17 + oy, 3);
    if (saddle) { p.rect(2, 14 + oy, 2, 4, BLANKET); p.rect(16, 14 + oy, 2, 4, BLANKET); p.rect(2, 12 + oy, 16, 2, SADDLE_LEATHER); }
    leg(p, coat, 6, 19 + oy, 27 - lift[0], 0, false); leg(p, coat, 13, 19 + oy, 27 - lift[1], 0, false);
  }
  if (layer === "body") return;
  if (layer === "head") oy = 10;
  // The head, facing you: round, the ears either side, a pale muzzle, two eyes.
  p.disc(10, 9 + oy, 5.5, 5, body, null);
  if (wolf) { p.poly([[5, 6 + oy], [5, 1 + oy], [8, 5 + oy]], body, null); p.poly([[15, 6 + oy], [15, 1 + oy], [12, 5 + oy]], body, null); p.rect(8, 11 + oy, 4, 3, belly); p.rect(9, 11 + oy, 2, 1, INK); }
  else { p.disc(6, 5 + oy, 1.5, 1.5, body, null); p.disc(14, 5 + oy, 1.5, 1.5, body, null); p.rect(8, 11 + oy, 4, 3, belly); p.set(10, 11 + oy, INK); p.set(9, 11 + oy, INK); for (let i = 0; i < 3; i++) p.line(8 + i * 2, 4 + oy, 8 + i * 2, 6 + oy, coat.mane, 1); }
  p.set(8, 8 + oy, eye); p.set(12, 8 + oy, eye); p.set(8, 9 + oy, INK); p.set(12, 9 + oy, INK);
  if (coat.tails) { p.line(6, 10 + oy, 7, 10 + oy, coat.mane, 1); p.line(13, 10 + oy, 14, 10 + oy, coat.mane, 1); p.set(10, 5 + oy, coat.mane); }
}
function catBack(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, belly = coat.belly ?? shadeHex(body, 0.25), dark = shadeHex(body, -0.12), wolf = coat.kind === "wolf", oy = 4, { lift, swish } = walk(frame);
  // The head beyond the rump (ears up), the rump, the tail, the hind legs.
  p.disc(10, 9 + oy, 4, 3.5, dark, null);
  if (wolf) { p.poly([[6, 7 + oy], [6, 3 + oy], [9, 6 + oy]], dark, null); p.poly([[14, 7 + oy], [14, 3 + oy], [11, 6 + oy]], dark, null); }
  else { p.disc(7, 6 + oy, 1.5, 1.5, dark, null); p.disc(13, 6 + oy, 1.5, 1.5, dark, null); }
  leg(p, coat, 7, 19 + oy, 27, 0, true); leg(p, coat, 13, 19 + oy, 27, 0, true);
  p.disc(10, 16 + oy, 7, 6, body, null);
  p.line(5, 11 + oy, 15, 11 + oy, shadeHex(body, 0.08));
  fur(p, coat, 5, 15, 12 + oy, 16 + oy, 3);
  if (saddle) { p.rect(4, 12 + oy, 12, 3, BLANKET); p.rect(5, 11 + oy, 10, 2, SADDLE_LEATHER); }
  if (wolf && coat.tails) foxTails(p, coat, [10, 18 + oy], [[3, 9 + oy + swish], [17, 9 + oy - swish], [10, 5 + oy]]);
  else if (wolf) { p.rect(9, 18 + oy, 3, 7, body); p.rect(9 + swish, 23 + oy, 3, 3, belly); }
  else { p.polyline([[10, 18 + oy], [10 + swish, 23 + oy], [12 + swish * 2, 26 + oy]], body, 2); p.set(12 + swish * 2, 26 + oy, coat.mane); }
  leg(p, coat, 5, 19 + oy, 27 - lift[0], 0, false); leg(p, coat, 15, 19 + oy, 27 - lift[1], 0, false);
}

// ---------- The cave spider: a great abdomen behind, the head-body in front, eight legs ----------
/** A spider's leg from its root: out and up to a knee, then down to the ground; `phase` lifts and swings it. */
function spiderLeg(p: Pixels, coat: Coat, x: number, y: number, dir: number, reach: number, phase: number, far: boolean) {
  // Out and up to a knee, then down to the ground; the legs a shade off the body so they read over it.
  const color = shadeHex(coat.body, far ? -0.22 : 0.2), knee = { x: x + dir * Math.round(reach * 0.55) + phase, y: y - 6 - (phase ? 1 : 0) }, foot = { x: x + dir * reach + phase * 2, y: 27 - (Math.abs(phase) > 1 ? 1 : 0) };
  p.line(x, y, knee.x, knee.y, color, far ? 2 : 3); p.line(knee.x, knee.y, foot.x, foot.y, color, 2);
  p.set(knee.x, knee.y - 1, shadeHex(color, 0.12)); p.rect(foot.x - 0.5, foot.y, 2, 1, coat.hoof);
}
function spiderSide(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, mark = coat.accent ?? shadeHex(body, -0.3), eye = coat.eye ?? "#e0463c", oy = 4, phases = frame < 0 ? [0, 0, 0, 0] : [[2, -2, 2, -2], [1, -1, 1, -1], [-2, 2, -2, 2], [-1, 1, -1, 1]][frame & 3];
  // Far legs (behind): two back under the abdomen, two forward; then the abdomen, the head-body, and the near legs over all.
  spiderLeg(p, coat, 21, 17 + oy, -1, 16, phases[1], true); spiderLeg(p, coat, 22, 17 + oy, -1, 10, phases[3], true);
  spiderLeg(p, coat, 24, 17 + oy, 1, 6, phases[0], true); spiderLeg(p, coat, 25, 17 + oy, 1, 10, phases[2], true);
  p.disc(11, 16 + oy, 7.5, 6.5, body, null);
  p.rect(6, 11 + oy, 11, 1, shadeHex(body, 0.1));
  for (let i = 0; i < 5; i++) p.rect(9 + i, 13 + oy + (i % 2), 1, 2, mark); p.rect(8, 17 + oy, 7, 1, mark);
  for (let y = 0; y < 12; y++) for (let x = 4; x < 19; x += 2) if (hash(x, y + 9) > 0.8) p.set(x + (y % 2), 11 + oy + y, shadeHex(coat.mane, 0.05));
  spiderLeg(p, coat, 20, 19 + oy, -1, 14, phases[2], false); spiderLeg(p, coat, 21, 19 + oy, -1, 8, phases[0], false);
  spiderLeg(p, coat, 25, 19 + oy, 1, 5, phases[3], false); spiderLeg(p, coat, 26, 19 + oy, 1, 9, phases[1], false);
  // The head-body last, over the legs' roots (they grow from under it), so it reads clear of them.
  spiderHeadSide(p, coat, eye, mark, oy);
  if (saddle) { p.rect(7, 10 + oy, 9, 3, BLANKET); p.poly([[7, 10 + oy], [8, 8 + oy], [15, 8 + oy], [16, 10 + oy]], SADDLE_LEATHER, null); p.rect(10, 13 + oy, 1, 3, SADDLE_LEATHER); }
}
/** The head-body from the side, out in front of the abdomen and held up: a carapace with a sheen, the eye cluster, palps and fangs. */
function spiderHeadSide(p: Pixels, coat: Coat, eye: string, mark: string, oy: number) {
  const head = shadeHex(coat.body, -0.08), cy = 15 + oy;
  p.disc(24, cy + 0.5, 7, 5, INK, null); p.disc(24, cy, 6.5, 4.5, head, null);
  p.rect(20, cy - 4, 7, 1, shadeHex(coat.body, 0.16)); p.rect(21, cy - 3, 4, 1, shadeHex(coat.body, 0.08));
  p.rect(22, cy - 1, 3, 1, mark);
  // The eyes, up on the brow at the front: two big ones and the smaller ones round them.
  p.rect(27, cy - 3, 2, 2, eye); p.set(27, cy - 3, WHITE); p.set(29, cy - 1, eye); p.set(26, cy - 4, shadeHex(eye, -0.15)); p.set(29, cy - 3, shadeHex(eye, -0.2));
  // The palps reaching forward, and the fangs hooked under the face.
  p.line(29, cy + 1, 31, cy + 3, shadeHex(coat.body, 0.12), 1); p.set(31, cy + 4, coat.hoof);
  p.line(27, cy + 3, 28, cy + 6, coat.hoof, 2); p.set(29, cy + 6, coat.hoof);
}
/** Facing you or from behind, a spider stands wider than a horse: its pictures are SPIDER_W wide, centred on SX. */
const SPIDER_W = 30, SX = 15;
function spiderFront(p: Pixels, coat: Coat, frame: number, saddle: boolean, layer: MountLayer) {
  const body = coat.body, mark = coat.accent ?? shadeHex(body, -0.3), eye = coat.eye ?? "#e0463c", phases = frame < 0 ? [0, 0] : [[1, -1], [0, 0], [-1, 1], [0, 0]][frame & 3];
  const oy = 4, X = SX - 10;
  if (layer !== "head") {
    // Legs splayed wide to both sides (four each, the front pair reaching furthest), the abdomen rising behind.
    for (const [i, reach] of [[0, 12], [1, 11], [2, 10], [3, 8]] as const) { const ph = phases[i % 2]; spiderLeg(p, coat, SX - 3, 17 + oy - i, -1, reach, ph, i > 1); spiderLeg(p, coat, SX + 3, 17 + oy - i, 1, reach, -ph, i > 1); }
    p.disc(SX, 11 + oy, 7, 6.5, body, null);
    p.rect(X + 5, 6 + oy, 10, 1, shadeHex(body, 0.1));
    for (let i = 0; i < 4; i++) p.rect(X + 8 + (i % 2) * 2, 7 + oy + i * 2, 2, 1, mark);
    if (saddle) { p.rect(X + 5, 8 + oy, 10, 3, BLANKET); p.rect(X + 6, 7 + oy, 8, 2, SADDLE_LEATHER); }
  }
  if (layer === "body") return;
  // The head-body in front, held up off the ground, its eyes facing you and the fangs under.
  const cy = 15 + oy;
  p.disc(SX, cy, 6, 4.5, shadeHex(body, -0.08), null);
  p.rect(X + 7, cy - 4, 6, 1, shadeHex(body, 0.16));
  p.rect(X + 7, cy - 1, 2, 2, eye); p.rect(X + 11, cy - 1, 2, 2, eye); p.set(X + 7, cy - 1, WHITE); p.set(X + 11, cy - 1, WHITE);
  for (const x of [6, 9, 10, 13]) p.set(X + x, cy - 3, shadeHex(eye, -0.15));
  p.line(X + 5, cy + 2, X + 4, cy + 5, shadeHex(body, 0.12), 1); p.line(X + 15, cy + 2, X + 16, cy + 5, shadeHex(body, 0.12), 1);
  p.line(X + 8, cy + 3, X + 7, cy + 6, coat.hoof, 2); p.line(X + 12, cy + 3, X + 13, cy + 6, coat.hoof, 2);
}
function spiderBack(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, mark = coat.accent ?? shadeHex(body, -0.3), oy = 4, X = SX - 10, phases = frame < 0 ? [0, 0] : [[1, -1], [0, 0], [-1, 1], [0, 0]][frame & 3];
  for (const [i, reach] of [[0, 8], [1, 10], [2, 11], [3, 12]] as const) { const ph = phases[i % 2]; spiderLeg(p, coat, SX - 3, 14 + oy + i, -1, reach, ph, i < 2); spiderLeg(p, coat, SX + 3, 14 + oy + i, 1, reach, -ph, i < 2); }
  // The abdomen nearest, big and round, its marking on top; the head-body beyond, mostly hidden.
  p.disc(SX, 8 + oy, 4, 3, shadeHex(body, -0.15), null);
  p.disc(SX, 16 + oy, 8, 7.5, body, null);
  p.rect(X + 4, 10 + oy, 12, 1, shadeHex(body, 0.1));
  p.poly([[SX, 11 + oy], [SX + 3, 15 + oy], [SX, 21 + oy], [SX - 3, 15 + oy]], mark, null);
  for (let y = 0; y < 14; y++) for (let x = 2; x < 18; x += 2) if (hash(x + 30, y) > 0.82) p.set(X + x + (y % 2), 10 + oy + y, shadeHex(coat.mane, 0.05));
  if (saddle) { p.rect(X + 5, 10 + oy, 10, 3, BLANKET); p.rect(X + 6, 9 + oy, 8, 2, SADDLE_LEATHER); }
}

// ---------- Little dragons: a lizard's body, a long neck, folded wings, a tail with a point ----------
function wing(p: Pixels, coat: Coat, x: number, y: number, dir: number, spread: number) {
  // A bat's wing from the shoulder: the membrane a triangle with its fingers drawn over it.
  const skin = coat.mane, bone = shadeHex(coat.body, -0.2);
  p.poly([[x, y], [x + dir * (6 + spread), y - 6 - spread], [x + dir * (10 + spread * 2), y - 2], [x + dir * 7, y + 2]], skin, null);
  p.line(x, y, x + dir * (6 + spread), y - 6 - spread, bone, 1); p.line(x + dir * (6 + spread), y - 6 - spread, x + dir * (10 + spread * 2), y - 2, bone, 1); p.line(x + dir * (6 + spread), y - 6 - spread, x + dir * 7, y + 2, bone, 1);
}
function dragonSide(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, light = shadeHex(body, 0.08), belly = coat.belly ?? shadeHex(body, 0.3), horn = coat.accent ?? "#e8d98a", eye = coat.eye ?? "#f4e27a", oy = 4, { swings, bob, swish } = walk(frame);
  leg(p, coat, 10, 18 + oy, 27, swings[1], true); leg(p, coat, 22, 18 + oy, 27, swings[3], true);
  // The tail, long, carried out behind with a point on the end; the far wing.
  p.polyline([[7, 16 + oy + bob], [3, 18 + oy + swish], [0, 16 + oy + swish * 2]], body, 2); p.poly([[0, 14 + oy + swish * 2], [2, 16 + oy + swish * 2], [0, 18 + oy + swish * 2]], horn, null);
  wing(p, coat, 15, 12 + oy + bob, -1, frame < 0 ? 0 : 1);
  // The body, pale under, scales along the back.
  p.disc(16, 16 + oy + bob, 9, 5, body, null);
  p.rect(9, 12 + oy + bob, 14, 1, light);
  p.rect(9, 19 + oy + bob, 14, 2, belly); for (let x = 9; x < 23; x += 2) p.set(x, 21 + oy + bob, shadeHex(belly, -0.1));
  for (let x = 8; x < 23; x += 3) p.set(x, 11 + oy + bob, horn);
  // The neck rising to the head: long, a jaw, horns swept back, an eye.
  p.poly([[20, 13 + oy + bob], [23, 6 + oy], [27, 5 + oy], [26, 15 + oy + bob]], body, null);
  p.poly([[24, 5 + oy], [28, 3 + oy], [33, 6 + oy], [33, 8 + oy], [29, 9 + oy], [26, 8 + oy]], body, null);
  p.rect(30, 8 + oy, 3, 1, belly); p.set(33, 7 + oy, INK);
  p.line(26, 4 + oy, 23, 1 + oy, horn, 1); p.line(27, 3 + oy, 25, 0 + oy, horn, 1);
  p.set(29, 5 + oy, eye); p.set(29, 4 + oy, WHITE);
  leg(p, coat, 12, 18 + oy, 27, swings[0], false); leg(p, coat, 20, 18 + oy, 27, swings[2], false);
  // The near wing, folded along the back (and lifted when it walks); the saddle in front of it.
  wing(p, coat, 17, 11 + oy + bob, -1, frame < 0 ? 0 : 1);
  if (saddle) sideSaddle(p, 11, 12 + oy + bob, 7);
}
function dragonFront(p: Pixels, coat: Coat, frame: number, saddle: boolean, layer: MountLayer) {
  const body = coat.body, belly = coat.belly ?? shadeHex(body, 0.3), horn = coat.accent ?? "#e8d98a", eye = coat.eye ?? "#f4e27a", { lift } = walk(frame), spread = frame < 0 ? 1 : 2;
  let oy = 4;
  if (layer !== "head") {
    // Wings out to both sides, hind legs behind, the chest.
    wing(p, coat, 6, 14 + oy, -1, spread); wing(p, coat, 14, 14 + oy, 1, spread);
    leg(p, coat, 5, 18 + oy, 26, 0, true); leg(p, coat, 15, 18 + oy, 26, 0, true);
    p.disc(10, 17 + oy, 6.5, 5, body, null); p.rect(7, 17 + oy, 6, 5, belly);
    if (saddle) { p.rect(3, 13 + oy, 2, 4, BLANKET); p.rect(15, 13 + oy, 2, 4, BLANKET); p.rect(3, 11 + oy, 14, 2, SADDLE_LEATHER); }
    leg(p, coat, 7, 18 + oy, 27 - lift[0], 0, false); leg(p, coat, 13, 18 + oy, 27 - lift[1], 0, false);
  }
  if (layer === "body") return;
  if (layer === "head") oy = 9;
  // The neck and head facing you: a narrow snout, horns up and back, two eyes.
  p.poly([[8, 12 + oy], [12, 12 + oy], [12, 4 + oy], [8, 4 + oy]], body, null);
  p.poly([[6, 2 + oy], [14, 2 + oy], [13, 8 + oy], [11, 10 + oy], [9, 10 + oy], [7, 8 + oy]], body, null);
  p.rect(9, 8 + oy, 2, 2, belly); p.set(9, 9 + oy, INK); p.set(10, 9 + oy, INK);
  p.line(7, 2 + oy, 6, -1 + oy, horn, 1); p.line(13, 2 + oy, 14, -1 + oy, horn, 1);
  p.set(8, 5 + oy, eye); p.set(12, 5 + oy, eye);
}
function dragonBack(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), horn = coat.accent ?? "#e8d98a", oy = 4, { lift, swish } = walk(frame), spread = frame < 0 ? 1 : 2;
  // The neck and head beyond, horns up; the wings; the rump, the tail down and back, the hind legs.
  p.poly([[8, 2 + oy], [12, 2 + oy], [12, 10 + oy], [8, 10 + oy]], dark, null);
  p.line(7, 2 + oy, 6, -1 + oy, horn, 1); p.line(13, 2 + oy, 14, -1 + oy, horn, 1);
  wing(p, coat, 6, 12 + oy, -1, spread); wing(p, coat, 14, 12 + oy, 1, spread);
  leg(p, coat, 7, 18 + oy, 27, 0, true); leg(p, coat, 13, 18 + oy, 27, 0, true);
  p.disc(10, 15 + oy, 7, 6, body, null);
  p.line(5, 10 + oy, 15, 10 + oy, shadeHex(body, 0.08));
  for (let y = 9; y < 15; y += 2) p.set(10, y + oy, horn);
  if (saddle) { p.rect(4, 11 + oy, 12, 3, BLANKET); p.rect(5, 10 + oy, 10, 2, SADDLE_LEATHER); }
  p.polyline([[10, 19 + oy], [10 + swish, 23 + oy], [11 + swish * 2, 26 + oy]], body, 2); p.poly([[9 + swish * 2, 25 + oy], [13 + swish * 2, 25 + oy], [11 + swish * 2, 27 + oy]], horn, null);
  leg(p, coat, 5, 18 + oy, 27 - lift[0], 0, false); leg(p, coat, 15, 18 + oy, 27 - lift[1], 0, false);
}

// ---------- The camel: long knobbly legs, a hump with the saddle on it, a neck that dips and rises to a small proud head ----------
/** A camel's rug over the hump: the accent, fringed, with the saddle's two posts standing up from it. */
function camelRug(p: Pixels, coat: Coat, x: number, y: number, w: number, posts: readonly number[]) {
  const rug = coat.accent ?? "#a5443a", fringe = coat.trim ?? "#e8c26a";
  p.rect(x, y, w, 5, rug); p.rect(x, y + 1, w, 1, shadeHex(rug, 0.15));
  for (let i = 0; i < w; i += 2) p.rect(x + i, y + 3, 1, 1, fringe);
  for (let i = 0; i < w; i++) p.set(x + i, y + 5 + (i % 2), fringe);
  for (const px of posts) { p.rect(px, y - 3, 1, 3, "#7a5534"); p.set(px, y - 4, fringe); }
  p.rect(x + 2, y - 1, w - 4, 2, SADDLE_LEATHER);
}
function camelSide(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), light = shadeHex(body, 0.08), { swings, bob, swish } = walk(frame);
  leg(p, coat, 10, 15, 27, swings[1], true); leg(p, coat, 21, 15, 27, swings[3], true);
  p.line(6, 10 + bob, 5 + swish, 17 + bob, dark, 1); p.rect(4 + swish, 17 + bob, 2, 2, coat.mane);
  // The body, and the hump high on it, lit along the top.
  p.disc(15, 12 + bob, 9.5, 4.5, body, null);
  p.disc(14, 7 + bob, 5.5, 4, body, null);
  p.line(10, 4 + bob, 17, 4 + bob, light); p.line(8, 16 + bob, 22, 16 + bob, dark);
  for (let i = 0; i < 4; i++) p.rect(11 + i * 2, 6 + bob + (i % 2), 1, 1, coat.mane);
  // The neck: forward and down from the chest, then up to the head.
  p.polyline([[22, 10 + bob], [26, 14 + bob], [29, 9], [30, 4]], body, 3);
  p.line(24, 12 + bob, 27, 15 + bob, dark, 1);
  // The head: long and small, a heavy-lidded eye, a soft drooping lip, small ears.
  p.disc(30.5, 3.5, 3, 2, body, null); p.rect(31, 3, 3, 3, body); p.rect(32, 5, 2, 1, shadeHex(body, -0.2));
  p.set(30, 2, INK); p.set(29, 2, dark); p.set(33, 4, INK); p.set(28, 1, dark);
  // Knees: the knobbly joints a camel kneels on.
  leg(p, coat, 13, 15, 27, swings[0], false); leg(p, coat, 19, 15, 27, swings[2], false);
  for (const x of [13, 19]) p.rect(x - 0.5, 21, 2, 1, dark);
  if (saddle) camelRug(p, coat, 9, 4 + bob, 10, [10, 17]);
}
function camelFront(p: Pixels, coat: Coat, frame: number, saddle: boolean, layer: MountLayer) {
  const body = coat.body, dark = shadeHex(body, -0.12), { lift } = walk(frame);
  if (layer !== "head") {
    leg(p, coat, 6, 15, 26, 0, true); leg(p, coat, 13, 15, 26, 0, true);
    p.disc(10, 12, 6, 5, body, null);
    p.disc(10, 7, 4.5, 3.5, body, null);
    if (saddle) camelRug(p, coat, 4, 5, 12, [5, 14]);
    leg(p, coat, 7, 15, 27 - lift[0], 0, false); leg(p, coat, 12, 15, 27 - lift[1], 0, false);
    for (const x of [7, 12]) p.rect(x - 0.5, 21, 2, 1, dark);
  }
  if (layer === "body") return;
  // The neck rising in front of the chest, the head on top of it, looking down its nose at you.
  p.rect(8, 10, 4, 8, body); p.rect(8, 10, 1, 8, shadeHex(body, 0.08));
  p.disc(10, 6.5, 3.5, 3, body, null); p.rect(8, 8, 4, 3, shadeHex(body, -0.16)); p.set(8, 9, INK); p.set(11, 9, INK); p.rect(9, 10, 2, 1, shadeHex(body, -0.28));
  p.set(7, 5, INK); p.set(13, 5, INK); p.set(7, 4, WHITE); p.set(13, 4, WHITE); p.rect(6, 3, 1, 2, dark); p.rect(14, 3, 1, 2, dark);
}
function camelBack(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), { lift, swish } = walk(frame);
  p.disc(10, 3, 2.5, 2, dark, null); p.set(8, 2, dark); p.set(12, 2, dark);
  leg(p, coat, 7, 15, 27, 0, true); leg(p, coat, 12, 15, 27, 0, true);
  p.disc(10, 12, 6.5, 5, body, null);
  p.disc(10, 7, 4.5, 3.5, body, null);
  if (saddle) camelRug(p, coat, 4, 5, 12, [5, 14]);
  p.rect(9 + swish, 13, 2, 5, dark); p.rect(9 + swish, 18, 2, 2, coat.mane);
  leg(p, coat, 5, 15, 27 - lift[0], 0, false); leg(p, coat, 14, 15, 27 - lift[1], 0, false);
}

// ---------- The forge golem: a stone body on short thick legs, a furnace and an anvil built into its back ----------
/** Cracks and mortar lines over a stone hide. */
function stonework(p: Pixels, coat: Coat, x0: number, y0: number, w: number, h: number, salt: number) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (hash(x + salt, y) > 0.86) p.set(x0 + x, y0 + y, shadeHex(coat.body, hash(x, y + salt) > 0.5 ? -0.14 : 0.08));
}
/** The furnace on the golem's back: a brick box with a glowing mouth and a chimney, the anvil beside it. */
function forge(p: Pixels, coat: Coat, x: number, y: number, w: number, mouth: boolean) {
  const brick = coat.mane, glow = coat.accent ?? "#f0a040", iron = coat.hoof;
  p.rect(x, y, w, 5, brick); p.rect(x, y, w, 1, shadeHex(brick, 0.12));
  if (mouth) { p.rect(x + 1, y + 2, w - 2, 2, glow); p.rect(x + 2, y + 2, w - 4, 1, shadeHex(glow, 0.2)); }
  p.rect(x + w - 3, y - 4, 2, 4, brick); p.set(x + w - 3, y - 5, shadeHex(brick, -0.2)); p.set(x + w - 2, y - 6, "#8e8a86");
  p.rect(x - 3, y + 2, 3, 2, iron); p.rect(x - 4, y + 1, 5, 1, iron);
}
function golemLeg(p: Pixels, coat: Coat, x: number, top: number, swing: number, far: boolean) {
  const color = far ? shadeHex(coat.body, -0.14) : coat.body, lift = Math.abs(swing) > 1 ? 1 : 0;
  p.rect(x + Math.round(swing / 2) - 1, top, 4, 27 - lift - top - 1, color); p.rect(x + swing - 1, 25 - lift, 4, 2, coat.hoof);
}
function golemSide(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), eye = coat.eye ?? "#f6d36b", oy = 4, { swings, bob } = walk(frame);
  golemLeg(p, coat, 10, 18 + oy, swings[1], true); golemLeg(p, coat, 22, 18 + oy, swings[3], true);
  // A squat stone torso, the furnace and anvil set into its back, a low head thrust forward with a lit eye.
  p.poly([[5, 12 + oy + bob], [8, 8 + oy + bob], [26, 8 + oy + bob], [28, 12 + oy + bob], [27, 21 + oy + bob], [6, 21 + oy + bob]], body, null);
  stonework(p, coat, 6, 9 + oy + bob, 21, 12, 3);
  p.rect(7, 9 + oy + bob, 19, 1, shadeHex(body, 0.1)); p.rect(7, 20 + oy + bob, 19, 1, dark);
  p.poly([[26, 11 + oy + bob], [31, 10 + oy + bob], [34, 13 + oy + bob], [33, 17 + oy + bob], [27, 17 + oy + bob]], dark, null);
  p.rect(31, 13 + oy + bob, 2, 1, eye); p.set(32, 13 + oy + bob, "#ffffff");
  p.rect(28, 16 + oy + bob, 5, 1, shadeHex(dark, -0.2));
  golemLeg(p, coat, 12, 18 + oy, swings[0], false); golemLeg(p, coat, 20, 18 + oy, swings[2], false);
  forge(p, coat, 14, 2 + oy + bob, 10, frame >= 0 || true);
  if (saddle) { p.rect(6, 7 + oy + bob, 7, 2, BLANKET); p.rect(7, 6 + oy + bob, 5, 1, SADDLE_LEATHER); }
}
function golemFront(p: Pixels, coat: Coat, frame: number, saddle: boolean, layer: MountLayer) {
  const body = coat.body, dark = shadeHex(body, -0.12), eye = coat.eye ?? "#f6d36b", { lift } = walk(frame);
  let oy = 4;
  if (layer !== "head") {
    // The furnace's chimney and the anvil's horn showing over the shoulders, the torso, the legs.
    p.rect(13, -1 + oy, 2, 6, coat.mane); p.set(13, -2 + oy, "#8e8a86"); p.rect(3, 3 + oy, 4, 2, coat.hoof);
    p.poly([[2, 8 + oy], [18, 8 + oy], [19, 20 + oy], [1, 20 + oy]], body, null);
    stonework(p, coat, 2, 9 + oy, 16, 11, 11);
    p.rect(3, 9 + oy, 14, 1, shadeHex(body, 0.1));
    if (saddle) { p.rect(3, 6 + oy, 14, 2, SADDLE_LEATHER); p.rect(4, 8 + oy, 12, 1, BLANKET); }
    p.rect(3, 20 + oy, 5, 7 - lift[0], dark); p.rect(12, 20 + oy, 5, 7 - lift[1], dark); p.rect(3, 25 + oy - lift[0], 5, 2, coat.hoof); p.rect(12, 25 + oy - lift[1], 5, 2, coat.hoof);
  }
  if (layer === "body") return;
  if (layer === "head") oy = 10;
  // The head: a stone block low on the chest, one lit eye slit.
  p.poly([[6, 10 + oy], [14, 10 + oy], [15, 17 + oy], [5, 17 + oy]], dark, null);
  p.rect(7, 13 + oy, 6, 1, eye); p.set(10, 13 + oy, "#ffffff"); p.rect(7, 15 + oy, 6, 1, shadeHex(dark, -0.2));
}
function golemBack(p: Pixels, coat: Coat, frame: number, saddle: boolean) {
  const body = coat.body, dark = shadeHex(body, -0.12), oy = 4, { lift } = walk(frame);
  // The head beyond, then the back with the furnace mouth glowing and the anvil beside the chimney.
  p.rect(6, 6 + oy, 8, 5, dark);
  p.poly([[2, 9 + oy], [18, 9 + oy], [19, 21 + oy], [1, 21 + oy]], body, null);
  stonework(p, coat, 2, 10 + oy, 16, 11, 23);
  p.rect(3, 10 + oy, 14, 1, shadeHex(body, 0.1));
  forge(p, coat, 7, 11 + oy, 9, true);
  if (saddle) { p.rect(3, 18 + oy, 14, 2, BLANKET); p.rect(4, 17 + oy, 12, 1, SADDLE_LEATHER); }
  p.rect(3, 21 + oy, 5, 6 - lift[0], dark); p.rect(12, 21 + oy, 5, 6 - lift[1], dark); p.rect(3, 25 + oy - lift[0], 5, 2, coat.hoof); p.rect(12, 25 + oy - lift[1], 5, 2, coat.hoof);
}
