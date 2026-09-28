/**
 * The RF wardrobe, worn properly. Pieces are painted into your Friend's own sprite frame on a grid twice as fine as the
 * sprite (so a crown can have points and a cape can have folds), fitted to the real head, neck, shoulders and back, and
 * animated: capes and scarves sway as you walk, wings flap, halos bob. The figure then gets one ink edge around the
 * worn pieces and the canonical white halo around everything.
 */
import { WARDROBE, isItem, item, type WardrobeId } from "./data.ts";
import { Pixels, shadeHex } from "./pixel.ts";
import { itemArt } from "./icons.ts";
import type { Facing } from "./state.ts";

export type Mask = readonly string[];
/** Padding around the sprite, in sprite pixels (room for wings, hats and trailing capes). */
const PAD_X = 10, PAD_TOP = 10, PAD_BOTTOM = 1, K = 2;
const INK = "#161616";
const cache = new Map<string, HTMLCanvasElement>();
type Span = { min: number; max: number };
/** Silhouette measurements of a sprite frame (in sprite pixels). */
function measure(rows: Mask) {
  const spans: (Span | null)[] = rows.map(row => { const min = row.indexOf("#"), max = row.lastIndexOf("#"); return min < 0 ? null : { min, max }; });
  const top = Math.max(0, spans.findIndex(Boolean)), bottom = spans.length - 1 - Math.max(0, [...spans].reverse().findIndex(Boolean));
  const body = spans.slice(top, bottom + 1).filter(Boolean) as Span[];
  const left = Math.min(...body.map(span => span.min)), right = Math.max(...body.map(span => span.max));
  let neck = top + Math.round((bottom - top) * 0.4), narrowest = Infinity;
  for (let y = top + 2; y <= top + Math.round((bottom - top) * 0.6); y++) { const span = spans[y]; if (span && span.max - span.min < narrowest) { narrowest = span.max - span.min; neck = y; } }
  const headRows = spans.slice(top, neck + 1).filter(Boolean) as Span[];
  const headLeft = Math.min(...headRows.map(span => span.min)), headRight = Math.max(...headRows.map(span => span.max));
  // Headwear sits on the crown of the head: the centre and width of the top two rows.
  const crownRows = spans.slice(top, top + 2).filter(Boolean) as Span[];
  const crownLeft = Math.min(...crownRows.map(span => span.min)), crownRight = Math.max(...crownRows.map(span => span.max));
  return { spans, top, bottom, left, right, neck, headLeft, headRight, centre: (crownLeft + crownRight + 1) / 2, crownWidth: crownRight - crownLeft + 1 };
}
/**
 * Your Friend's frame with its worn pieces, as a pixel canvas twice the sprite's resolution.
 * `phase` (0–3) animates cloth and wings; pass the walk frame so they sway with the stride.
 */
type Piece = { id: string; kind: string; color: string; trim?: string };
/**
 * Something held and moving (a weapon mid-swing, an axe chopping, a rod cast out, a fish over the fire): the item and its
 * angle from the resting pose, in radians, positive swinging forward (the way you face).
 */
export type Held = { id: string; angle: number };
/** Where the held item's tip ended up (fine pixels in the art), for a fishing line. */
export const heldTip = (art: HTMLCanvasElement) => (art as HTMLCanvasElement & { tip?: { x: number; y: number } }).tip ?? null;
/** Fine pixels per sprite pixel in figure art (for turning a tip into screen space). */
export const FIGURE_K = K;
export function figureArt(rows: Mask, worn: readonly string[], facing: Facing, phase = 0, ink = INK, held: Held | null = null): HTMLCanvasElement {
  // An equipped cape (a mastery cape, the Cape of the Hollow…) is worn over any wardrobe cape, with its trim.
  const gear: Piece[] = worn.filter(id => isItem(id) && item(id).equip?.slot === "cape").map(id => ({ id, kind: "cape", color: item(id).icon.color, trim: item(id).icon.accent }));
  // Headgear you wear (a helm, hood, hat or crown) shows too, unless a wardrobe hat is on top.
  const wardrobeHat = WARDROBE.some(piece => worn.includes(piece.id) && piece.kind === "hat");
  const headgear: Piece[] = wardrobeHat ? [] : worn.filter(id => isItem(id) && item(id).equip?.slot === "head").slice(0, 1).map(id => {
    const icon = item(id).icon; return { id, kind: `gear_${icon.shape}`, color: icon.color, trim: icon.accent };
  });
  // A shield on the off arm.
  const shield: Piece | undefined = worn.filter(id => isItem(id) && item(id).equip?.slot === "shield").slice(0, 1).map(id => ({ id, kind: "shield", color: item(id).icon.color, trim: item(id).icon.accent }))[0];
  // A weapon in the hand (swords, daggers, sabres, axes, pickaxes, staffs and bows), when it isn't mid-swing.
  const weapon: Piece | undefined = (held && isItem(held.id) ? [held.id] : worn.filter(id => isItem(id) && item(id).equip?.slot === "weapon")).slice(0, 1).map(id => ({ id, kind: `weapon_${item(id).icon.shape}`, color: item(id).icon.color, trim: item(id).icon.accent }))[0];
  // Angles snap to steps (pixel art turns in steps anyway, and it keeps the cache small).
  const turn = held ? Math.round(held.angle / 0.14) * 0.14 : 0;
  const pieces: Piece[] = [...WARDROBE.filter(piece => worn.includes(piece.id) && piece.kind !== "aura" && piece.kind !== "lantern" && !(gear.length && piece.kind === "cape")), ...gear.slice(0, 1), ...headgear, ...(shield ? [shield] : []), ...(weapon ? [weapon] : [])];
  const key = `${ink}|${facing}|${phase & 3}|${pieces.map(piece => piece.id).join(",")}|${turn.toFixed(2)}|${rows.join("")}`;
  let canvas = cache.get(key);
  if (canvas) return canvas;
  const width = rows[0]?.length ?? 16, height = rows.length, W = (width + PAD_X * 2) * K, H = (height + PAD_TOP + PAD_BOTTOM) * K;
  const p = new Pixels(W, H), m = measure(rows), back = facing === "up", side = facing === "left" ? -1 : facing === "right" ? 1 : 0;
  // Fine-grid coordinates: sprite pixel (x, y) covers fine pixels [X(x), X(x)+1] × [Y(y), Y(y)+1].
  const X = (x: number) => (x + PAD_X) * K, Y = (y: number) => (y + PAD_TOP) * K, sway = [0, 1, 0, -1][phase & 3];
  const cx = X(m.centre) - 0.5, headTop = Y(m.top), neckY = Y(m.neck) + 1, feet = Y(m.bottom) + 1;
  const headHalf = Math.max(4, Math.min(7, m.crownWidth * K / 2 + 1));
  const bodySpan = (y: number) => m.spans[y] ?? { min: m.left, max: m.right };
  const cape = pieces.find(piece => piece.kind === "cape"), wings = pieces.find(piece => piece.kind === "wings");

  // ---------- Behind the body ----------
  if (wings) {
    const shoulderL = X(bodySpan(m.neck + 1).min) - 1, shoulderR = X(bodySpan(m.neck + 1).max) + 2, y0 = neckY + 1, flap = [0, -2, -3, -1][phase & 3];
    const light = shadeHex(wings.color, 0.18), dark = shadeHex(wings.color, -0.08);
    const wing = (dir: 1 | -1, root: number) => {
      // Three layered feather rows, longest at the top, flapping at the tips.
      for (let row = 0; row < 3; row++) {
        const reach = 11 - row * 2, y = y0 + row * 3;
        p.poly([[root, y], [root + dir * reach, y - 4 + flap + row], [root + dir * (reach + 1), y - 1 + flap + row], [root + dir * (reach - 2), y + 2 + row], [root, y + 4]], row % 2 ? dark : wings.color, null);
        p.line(root + dir * 2, y + 1, root + dir * (reach - 1), y - 2 + flap + row, light);
      }
    };
    if (side <= 0) wing(-1, shoulderL);
    if (side >= 0) wing(1, shoulderR);
  }
  if (cape && !back) {
    const dark = shadeHex(cape.color, -0.12), trail = side ? -side * 5 : 0;
    const top = bodySpan(m.neck + 1), shoulders = [X(top.min) - 1, X(top.max) + 2] as const;
    const hemL = X(m.left) - 3 + trail + sway, hemR = X(m.right) + 4 + trail + sway;
    p.poly([[shoulders[0], neckY], [shoulders[1], neckY], [hemR, feet - 1], [hemL, feet - 1]], cape.color, null);
    for (let fold = 1; fold < 4; fold++) { const t = fold / 4; p.line(shoulders[0] + (shoulders[1] - shoulders[0]) * t, neckY + 2, hemL + (hemR - hemL) * t, feet - 2, dark); }
    p.line(hemL, feet - 1, hemR, feet - 1, cape.trim ?? dark);
    if (cape.trim) p.line(hemL, feet - 2, hemR, feet - 2, cape.trim);
  }
  if (pieces.some(piece => piece.kind === "scarf") && side) {
    // The scarf's long tail streams out behind you.
    const scarf = pieces.find(piece => piece.kind === "scarf")!, from = side > 0 ? X(bodySpan(m.neck).min) - 1 : X(bodySpan(m.neck).max) + 2;
    for (let i = 0; i < 7; i++) { const x = from - side * i, y = neckY + 1 + Math.round(Math.sin((i + phase) * 1.1) * 1.2) + (i >> 2); p.rect(x, y, 1, 3, i % 3 ? scarf.color : shadeHex(scarf.color, -0.14)); }
  }

  const waist = Math.round((neckY + feet) / 2), waistSpan = bodySpan(Math.round((m.neck + m.bottom) / 2));
  // The weapon hand: at your right side facing the camera or away, in front facing right, beyond your chest facing left
  // (that arm is on the far side, so the weapon is drawn behind you there).
  const handRow = Math.round(m.neck + (m.bottom - m.neck) * 0.45), handSpan = bodySpan(handRow), dir = side < 0 ? -1 : 1;
  const hand = { x: side < 0 ? X(handSpan.min) - 1 : X(handSpan.max) + 2, y: Y(handRow) + 1 + ([0, 1, 0, 1][phase & 3]) };
  let tip: { x: number; y: number } | null = null;
  // Facing right, the shield arm is the far one: the shield hangs behind you (just its rim and wooden back peek out).
  if (shield && side > 0) drawShield(p, shield, X(waistSpan.min) + 3, waist, true);
  // (Facing left the weapon hand is on the far side, behind you; but a tool at work or a weapon mid-swing comes round in front.)
  if (weapon && side < 0 && !held) tip = drawHeld(p, weapon, hand.x, hand.y, dir, sway, turn);

  // ---------- The Friend ----------
  const inkValue = (() => { const probe = new Pixels(1, 1); probe.set(0, 0, ink); return probe.data[0]; })();
  rows.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel === "#") p.rect(X(x), Y(y), K, K, ink); }));

  // ---------- In front ----------
  if (cape && back) {
    const dark = shadeHex(cape.color, -0.12), top = bodySpan(m.neck), shoulders = [X(top.min) - 1, X(top.max) + 2] as const;
    const hemL = X(m.left) - 3 + sway, hemR = X(m.right) + 4 + sway;
    p.poly([[shoulders[0], neckY - 1], [shoulders[1], neckY - 1], [hemR, feet - 1], [hemL, feet - 1]], cape.color, null);
    for (let fold = 1; fold < 5; fold++) { const t = fold / 5; p.line(shoulders[0] + (shoulders[1] - shoulders[0]) * t, neckY + 1, hemL + (hemR - hemL) * t, feet - 2, dark); }
    p.rect(shoulders[0], neckY - 1, shoulders[1] - shoulders[0], 2, shadeHex(cape.color, 0.08));
    if (cape.trim) {
      // Trimmed edges, and the emblem on the back.
      p.line(hemL, feet - 1, hemR, feet - 1, cape.trim); p.line(hemL, feet - 2, hemR, feet - 2, cape.trim);
      p.line(shoulders[0], neckY - 1, hemL, feet - 1, cape.trim); p.line(shoulders[1] - 1, neckY - 1, hemR - 1, feet - 1, cape.trim);
      const ex = Math.round((hemL + hemR) / 2), ey = Math.round((neckY + feet) / 2) - 1;
      p.disc(ex, ey, 2.4, 2.4, cape.trim, null); p.set(ex, ey, cape.color);
    }
  }
  for (const piece of pieces) {
    const color = piece.color, dark = shadeHex(color, -0.15), light = shadeHex(color, 0.14);
    if (piece.kind === "scarf") {
      const span = bodySpan(m.neck), l = X(span.min) - 2, r = X(span.max) + 3;
      p.rect(l, neckY - 1, r - l, 3, color); p.line(l, neckY + 1, r - 1, neckY + 1, dark);
      if (!side && !back) { const knot = X(span.max) - 1; p.rect(knot, neckY + 2, 3, 2, color); p.rect(knot + 1, neckY + 4, 2, 3, dark); }
    }
    if (piece.kind === "bow") {
      // A big bow on the side of the head.
      const bx = Math.round(cx + headHalf * 0.55) + (side < 0 ? -Math.round(headHalf) : 0), by = headTop - 1;
      p.poly([[bx, by], [bx - 5, by - 4], [bx - 6, by + 2]], color, null); p.poly([[bx, by], [bx + 5, by - 4], [bx + 6, by + 2]], color, null);
      p.line(bx - 4, by - 2, bx - 2, by, dark); p.line(bx + 4, by - 2, bx + 2, by, dark);
      p.rect(bx - 1, by - 1, 3, 3, dark); p.set(bx, by - 1, light);
    }
    if (piece.kind === "halo") {
      const hy = headTop - 7 + [0, -1, -1, 0][phase & 3], hx = Math.round(cx);
      for (let a = 0; a < 40; a++) { const t = a / 40 * Math.PI * 2, x = hx + Math.cos(t) * (headHalf + 1), y = hy + Math.sin(t) * 2.2; p.set(x, y, Math.sin(t) > 0.3 ? dark : color); }
      p.set(hx + headHalf - 1, hy - 2, "#ffffff"); p.set(hx + headHalf - 1, hy - 3, "#ffffff"); p.set(hx + headHalf, hy - 2, "#ffffff");
    }
    if (piece.kind === "hat" && piece.id === "starlit_hood") {
      // A starry pointed hat: a wide brim and a cone whose tip bends with your stride.
      const brimY = headTop + 2, tipX = Math.round(cx) + 3 + sway * 2 - side * 2;
      p.disc(cx, brimY, headHalf + 4, 2.4, dark, null);
      p.poly([[cx - headHalf + 1, brimY], [cx + headHalf - 1, brimY], [cx + 3, brimY - 9], [tipX + 1, brimY - 15], [cx - 1, brimY - 9]], color, null);
      p.line(cx - headHalf + 2, brimY - 1, cx + headHalf - 2, brimY - 1, "#e2d49e");
      for (const [sx, sy] of [[-2, -5], [2, -8], [0, -3]] as const) { p.set(cx + sx, brimY + sy, "#f2e28f"); }
      p.set(tipX + 1, brimY - 16, "#f2e28f");
    }
    if (piece.kind === "hat" && piece.id !== "starlit_hood") {
      // Crowns: a slim band and separate spikes; the paper one is folded cream, the rarite one rose metal with gems.
      const rarite = piece.id === "rarite_crown", band = headTop, l = Math.round(cx - headHalf) + 1, r = Math.round(cx + headHalf) - 1;
      p.rect(l, band - 2, r - l, 2, color); p.line(l, band - 1, r - 1, band - 1, dark);
      const points = rarite ? 3 : 4, step = (r - l) / points;
      for (let i = 0; i < points; i++) {
        const mid = l + step * (i + 0.5), half = Math.max(1, step * 0.32), tall = rarite ? (i === Math.floor(points / 2) ? 6 : 4) : 4;
        p.poly([[mid - half, band - 2], [mid, band - 2 - tall], [mid + half, band - 2]], i % 2 && !rarite ? light : color, null);
        p.set(mid - 0.5, band - 1 - tall, light);
        if (rarite) p.rect(mid - 0.5, band - 3 - tall, 1, 1, i === 1 ? "#9fb4d0" : "#e2d49e");
      }
      if (rarite) { p.set(Math.round(cx), band - 2, "#9fb4d0"); if ((phase & 3) === 1) { p.set(r, band - 8, "#ffffff"); p.set(r + 1, band - 9, "#ffffff"); } }
      else p.set(Math.round(cx), band - 2, "#d8b6b4");
    }
  }

  if (weapon && side >= 0 && !held) tip = drawHeld(p, weapon, hand.x, hand.y, dir, sway, turn);
  // The shield on the off arm: across your body facing left (that arm is towards you), at your side facing the camera
  // or away. (Facing right it's behind you, drawn before your Friend above.)
  if (shield && side <= 0) drawShield(p, shield, side < 0 ? Math.round(cx) + 1 : X(waistSpan.min) - 1, waist, back);
  // A tool at work or a weapon mid-swing goes over everything, so the motion reads.
  if (weapon && held) tip = drawHeld(p, weapon, hand.x, hand.y, dir, sway, turn);

  // ---------- Equipped headgear ----------
  for (const piece of pieces.filter(entry => entry.kind.startsWith("gear_"))) {
    const color = piece.color, dark = shadeHex(color, -0.18), light = shadeHex(color, 0.16), l = Math.round(cx - headHalf) - 1, r = Math.round(cx + headHalf) + 1, top = headTop;
    switch (piece.kind) {
      case "gear_helm": {
        // A metal cap over the brow, cheek guards and a nose guard; a crest if it has one.
        p.poly([[l, top + 5], [l, top], [l + 2, top - 3], [r - 2, top - 3], [r, top], [r, top + 5], [r - 2, top + 5], [r - 2, top + 2], [l + 2, top + 2], [l + 2, top + 5]], color, null);
        p.line(l + 1, top - 1, r - 2, top - 1, light); p.line(l, top + 2, r - 1, top + 2, dark);
        p.rect(Math.round(cx) - 1, top + 2, 2, 3, color);
        if (piece.trim) p.poly([[cx - 1, top - 3], [cx + 1, top - 3], [cx + 2, top - 8], [cx - 2, top - 7]], piece.trim, null);
        break;
      }
      case "gear_hood": {
        // A hood drawn over the head and down to the shoulders, face open.
        p.poly([[l - 1, neckY + 2], [l - 1, top + 1], [l + 2, top - 3], [r - 2, top - 3], [r + 1, top + 1], [r + 1, neckY + 2], [r - 2, neckY], [r - 2, top + 2], [l + 2, top + 2], [l + 2, neckY]], color, null);
        p.line(l + 1, top - 2, r - 2, top - 2, light); p.line(l + 2, top + 2, r - 2, top + 2, dark);
        break;
      }
      case "gear_hat": {
        // A pointed wizard's hat with a brim and a band.
        const brimY = top + 1, tipX = Math.round(cx) + 3 + sway * 2 - side * 2;
        p.disc(cx, brimY, headHalf + 4, 2.2, dark, null);
        p.poly([[cx - headHalf + 1, brimY], [cx + headHalf - 1, brimY], [cx + 2, brimY - 8], [tipX + 1, brimY - 14], [cx - 2, brimY - 8]], color, null);
        p.line(cx - headHalf + 2, brimY - 1, cx + headHalf - 2, brimY - 1, piece.trim ?? "#e2d49e");
        break;
      }
      case "gear_crown": {
        const band = top, points = 3, step = (r - l - 2) / points;
        p.rect(l + 1, band - 2, r - l - 2, 3, color); p.line(l + 1, band, r - 2, band, dark);
        for (let i = 0; i < points; i++) { const mid = l + 1 + step * (i + 0.5); p.poly([[mid - 1.5, band - 2], [mid, band - 6], [mid + 1.5, band - 2]], color, null); }
        p.set(Math.round(cx), band - 1, piece.trim ?? "#cf6e6e");
        break;
      }
    }
  }

  // ---------- Edges: ink around the worn colours, then the white halo around everything (one sprite pixel) ----------
  const data = p.data, filled = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && data[y * W + x] !== 0;
  const coloured = (x: number, y: number) => filled(x, y) && data[y * W + x] !== inkValue;
  const edged = data.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!data[y * W + x] && (coloured(x + 1, y) || coloured(x - 1, y) || coloured(x, y + 1) || coloured(x, y - 1))) edged[y * W + x] = inkValue;
  data.set(edged);
  p.halo(); p.halo();
  canvas = p.toCanvas();
  if (tip) (canvas as HTMLCanvasElement & { tip?: { x: number; y: number } }).tip = tip;
  if (cache.size > 800) cache.delete(cache.keys().next().value!);
  cache.set(key, canvas);
  return canvas;
}
/**
 * Paint a held item at the hand, turned `angle` radians forward about the hand: drawn upright into a scratch buffer, then
 * rotated into the figure pixel by pixel (nearest neighbour, so it stays crisp). Returns where its tip landed.
 */
function drawHeld(p: Pixels, piece: Piece, x: number, y: number, dir: number, sway: number, angle: number) {
  if (Math.abs(angle) < 0.01) return drawWeapon(p, piece, x, y, dir, sway);
  const scratch = new Pixels(p.w, p.h), tip = drawWeapon(scratch, piece, x, y, dir, sway);
  const a = angle * dir, c = Math.cos(a), s = Math.sin(a), R = 30;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const sx = Math.round(x + dx * c + dy * s), sy = Math.round(y - dx * s + dy * c), value = scratch.get(sx, sy);
    if (value) p.set(x + dx, y + dy, value);
  }
  const tx = tip.x - x, ty = tip.y - y;
  return { x: x + tx * c - ty * s, y: y + tx * s + ty * c };
}
/** An item without a drawing of its own, held by its icon (a fish, a tinderbox, a log…), shrunk into the hand. */
function drawIconHeld(p: Pixels, id: string, x: number, y: number) {
  const art = itemArt(item(id).icon), ctx = art.getContext("2d");
  if (!ctx) return;
  const data = new Uint32Array(ctx.getImageData(0, 0, art.width, art.height).data.buffer), size = 11, step = art.width / size;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const value = data[Math.floor(j * step + step / 2) * art.width + Math.floor(i * step + step / 2)];
    if (value >>> 24 > 128) p.set(x - size / 2 + i, y - size + 2 + j, value);
  }
}
/**
 * A weapon held in the hand at (x, y), fine pixels, `dir` the way it points: blades up and forward in a ready guard, axes and
 * pickaxes shouldered, staffs upright with their head above you, bows held up by the grip. `sway` rocks it with your step.
 */
function drawWeapon(p: Pixels, piece: Piece, x: number, y: number, dir: number, sway: number): { x: number; y: number } {
  let tip = { x, y: y - 10 };
  const metal = piece.color, light = shadeHex(metal, 0.22), dark = shadeHex(metal, -0.22), wood = "#7a5a40", woodLight = "#9c7a58", gold = piece.trim ?? "#c9a24a";
  const shape = piece.kind.slice("weapon_".length), lean = sway * 0.5;
  const blade = (length: number, curve = 0) => {
    // Grip and pommel below the hand, a crossguard at it, and the blade rising forward, lit along one edge.
    p.line(x - dir, y + 1, x - dir * 2, y + 3, "#5a4030", 2); p.set(x - dir * 2, y + 4, gold);
    const end = { x: x + dir * (length * 0.42 + lean), y: y - length }; tip = end;
    const at = (t: number) => ({ x: x + (end.x - x) * t + dir * curve * Math.sin(t * Math.PI), y: y + (end.y - y) * t });
    const points: [number, number][] = []; for (let i = 0; i <= 8; i++) { const q = at(i / 8); points.push([q.x, q.y]); }
    p.polyline(points, metal, 2);
    p.polyline(points.map(([px, py]) => [px - dir * 0.6, py] as [number, number]).slice(1, -1), light);
    p.set(Math.round(end.x), Math.round(end.y) - 1, light);
    p.line(x - 3, y + 1 - dir * 0.5, x + 3, y - 1 + dir * 0.5, gold, 1); p.line(x - 3, y + 2 - dir * 0.5, x + 3, y + dir * 0.5, shadeHex(gold, -0.2), 1);
    p.set(x, y, dark);
  };
  switch (shape) {
    case "sword": blade(15); break;
    case "dagger": blade(8); break;
    case "sabre": blade(14, 2.4); break;
    case "axe": case "pickaxe": {
      // A haft over the shoulder, the head at its top.
      const top = { x: x + dir * (3 + lean), y: y - 13 };
      p.line(x - dir, y + 4, top.x, top.y, wood, 2); p.line(x - dir, y + 3, top.x - dir, top.y + 1, woodLight);
      if (shape === "axe") { p.poly([[top.x, top.y - 1], [top.x + dir * 5, top.y - 3], [top.x + dir * 6, top.y + 3], [top.x + dir, top.y + 3]], metal, null); p.line(top.x + dir * 5, top.y - 2, top.x + dir * 6, top.y + 2, light); }
      else { p.polyline([[top.x - dir * 6, top.y + 3], [top.x - dir * 3, top.y], [top.x, top.y - 1], [top.x + dir * 3, top.y], [top.x + dir * 6, top.y + 3]], metal, 2); p.line(top.x - dir * 2, top.y - 1, top.x + dir * 2, top.y - 1, light); }
      break;
    }
    case "staff": {
      // Upright in the hand, foot by your feet, the head (a claw holding an orb of its element) above you.
      const top = { x: x + dir * (1 + lean), y: y - 20 };
      p.line(x, y + 11, top.x, top.y + 3, wood, 2); p.line(x - 1, y + 10, top.x - 1, top.y + 4, woodLight);
      const orb = piece.id === "staff" ? "#e2d49e" : metal;
      p.line(top.x - 2, top.y + 3, top.x - 2, top.y, wood); p.line(top.x + 2, top.y + 3, top.x + 2, top.y, wood);
      p.disc(top.x, top.y, 2.2, 2.2, orb, null); p.set(top.x - 1, top.y - 1, "#ffffff");
      break;
    }
    case "bow": {
      // Held up by the grip: limbs bowing forward, the string straight behind them.
      const limb: [number, number][] = []; for (let i = 0; i <= 10; i++) { const t = i / 10; limb.push([x + dir * (Math.sin(t * Math.PI) * 4 + lean), y - 12 + t * 22]); }
      p.line(x, y - 12, x, y + 10, "#e8e4da");
      p.polyline(limb, metal, 2); p.polyline(limb.slice(2, 5).map(([px, py]) => [px + dir * 0.6, py] as [number, number]), shadeHex(metal, 0.18));
      p.rect(x + dir * 3 + lean - 1, y - 2, 2, 3, "#5a4030");
      break;
    }
    case "hammer": {
      // A short haft and a block head.
      const top = { x: x + dir * (2 + lean), y: y - 9 }; tip = top;
      p.line(x - dir, y + 3, top.x, top.y, wood, 2); p.line(x - dir, y + 2, top.x - dir, top.y + 1, woodLight);
      p.rect(Math.min(top.x - dir * 2, top.x + dir * 4), top.y - 2, 6, 4, metal); p.line(top.x - dir * 2, top.y - 2, top.x + dir * 3, top.y - 2, light);
      break;
    }
    case "rod": case "harpoon": {
      // A long rod (or a barbed harpoon) held up and forward; the line leaves from the tip.
      const long = shape === "rod" ? 24 : 20, top = { x: x + dir * (6 + lean), y: y - long }; tip = top;
      p.line(x - dir, y + 4, top.x, top.y, shape === "rod" ? "#8a6a50" : wood, shape === "rod" ? 1 : 2);
      p.line(x - dir, y + 4, x, y, "#3b2a22", 2);
      if (shape === "rod") { p.disc(x + dir * 2, y - 1, 1.6, 1.6, "#c9c2b6", null); p.set(top.x, top.y, "#e8e4da"); }
      else { p.poly([[top.x, top.y - 3], [top.x + dir * 2, top.y + 1], [top.x - dir * 1, top.y + 1]], metal, null); p.set(top.x + dir * 2, top.y + 3, metal); }
      break;
    }
    case "net": {
      // A hoop net on a handle.
      const top = { x: x + dir * (4 + lean), y: y - 11 }; tip = top;
      p.line(x - dir, y + 3, top.x, top.y + 3, wood, 2);
      p.disc(top.x, top.y, 4, 3.2, "#e8e4da", null); p.disc(top.x, top.y, 3, 2.3, "#00000000", null);
      for (let i = -2; i <= 2; i += 2) { p.line(top.x + i, top.y - 2, top.x + i, top.y + 2, "#d6d0c2"); p.line(top.x - 2, top.y + i / 1.5, top.x + 2, top.y + i / 1.5, "#d6d0c2"); }
      break;
    }
    case "knife": case "chisel": case "needle": {
      const long = shape === "needle" ? 5 : 7, top = { x: x + dir * (2 + lean), y: y - long }; tip = top;
      if (shape !== "needle") p.line(x, y + 2, x, y, "#5a4030", 2);
      p.line(x, y, top.x, top.y, shape === "needle" ? "#e8e4da" : metal, shape === "chisel" ? 2 : 1); p.set(top.x, top.y, light);
      break;
    }
    default: drawIconHeld(p, piece.id, x, y); tip = { x, y: y - 8 };
  }
  if (shape === "axe" || shape === "pickaxe") tip = { x: x + dir * (3 + lean), y: y - 13 };
  else if (shape === "staff") tip = { x: x + dir * (1 + lean), y: y - 20 };
  else if (shape === "bow") tip = { x: x + dir * lean, y: y - 12 };
  return tip;
}
/** A heater shield centred on (x, y) in fine pixels: rim, boss and cross in its accent; from behind, its wooden back and strap. */
function drawShield(p: Pixels, piece: Piece, x: number, y: number, rear: boolean) {
  const color = piece.color, dark = shadeHex(color, -0.2), light = shadeHex(color, 0.18), hw = rear ? 3 : 5;
  const outline: [number, number][] = [[x - hw, y - 6], [x + hw, y - 6], [x + hw, y + 1], [x, y + 7], [x - hw, y + 1]];
  if (rear) { p.poly(outline, "#7a5b40", null); p.line(x - hw + 1, y - 2, x + hw - 1, y - 2, "#4a3a2e"); p.line(x - hw, y - 6, x + hw, y - 6, dark); return; }
  p.poly(outline, color, null);
  p.line(x - hw, y - 6, x + hw, y - 6, light); p.line(x - hw, y - 6, x - hw, y + 1, light);
  p.line(x + hw, y - 5, x + hw, y + 1, dark); p.line(x + hw, y + 1, x, y + 7, dark);
  const trim = piece.trim ?? dark;
  p.line(x, y - 5, x, y + 5, trim); p.line(x - hw + 1, y - 2, x + hw - 1, y - 2, trim);
  p.rect(x - 1, y - 3, 2, 2, light);
}
/** Draw a figure with its feet on (x, y); `px` screen pixels per sprite pixel. Returns the drawn box. */
export function drawFigure(ctx: CanvasRenderingContext2D, art: HTMLCanvasElement, x: number, y: number, px: number, alpha = 1) {
  const w = art.width * px / K, h = art.height * px / K;
  ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, Math.round(x - w / 2), Math.round(y - h + (1 + PAD_BOTTOM) * px), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
  return { x: x - w / 2, y: y - h + (1 + PAD_BOTTOM) * px, w, h };
}
/** Auras and the lantern familiar, drawn around the figure (not part of the frame). */
export function drawAuras(ctx: CanvasRenderingContext2D, worn: readonly string[], x: number, y: number, px: number, now: number, reduced: boolean, layer: "back" | "front") {
  const t = reduced ? 0 : now / 1000, s = Math.max(1, Math.round(px / 2));
  const dot = (dx: number, dy: number, color: string, size = 1) => { const q = s * size; ctx.fillStyle = INK; ctx.fillRect(Math.round(dx) - q, Math.round(dy) - q, q * 3, q * 3); ctx.fillStyle = color; ctx.fillRect(Math.round(dx), Math.round(dy), q, q); };
  for (const id of worn) {
    const piece = WARDROBE.find(entry => entry.id === id);
    if (!piece) continue;
    if (piece.id === "golden_aura") {
      if (layer === "back") {
        // Slowly turning rays and a warm glow.
        ctx.save(); ctx.translate(x, y - 8 * px); ctx.rotate(t * 0.4);
        for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = i % 2 ? "rgba(226,212,158,0.22)" : "rgba(226,212,158,0.12)"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2.2 * px, -15 * px); ctx.lineTo(2.2 * px, -15 * px); ctx.closePath(); ctx.fill(); }
        ctx.restore();
        const glow = ctx.createRadialGradient(x, y - 8 * px, 0, x, y - 8 * px, 12 * px); glow.addColorStop(0, "rgba(242,226,143,0.45)"); glow.addColorStop(1, "rgba(242,226,143,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y - 8 * px, 12 * px, 0, Math.PI * 2); ctx.fill();
      } else if (!reduced) for (let i = 0; i < 4; i++) { const k = (t * 0.6 + i / 4) % 1; dot(x + Math.sin(i * 2.3 + t) * 8 * px, y - k * 18 * px, "#f2e28f"); }
    }
    if (piece.id === "moon_wisps") {
      if (layer === "back") { ctx.fillStyle = "rgba(175,188,203,0.25)"; ctx.beginPath(); ctx.ellipse(x, y, 11 * px, 3.5 * px, 0, 0, Math.PI * 2); ctx.fill(); }
      for (let i = 0; i < 3; i++) {
        const a = t * 1.3 + i * (Math.PI * 2 / 3), wx = x + Math.cos(a) * 10 * px, wy = y - 7 * px + Math.sin(a) * 3.5 * px, front = Math.sin(a) > 0;
        if (front !== (layer === "front")) continue;
        for (let k = 3; k >= 1; k--) { const ta = a - k * 0.18; ctx.fillStyle = `rgba(175,188,203,${0.18 * (4 - k)})`; ctx.fillRect(Math.round(x + Math.cos(ta) * 10 * px) - s, Math.round(y - 7 * px + Math.sin(ta) * 3.5 * px) - s, s * 2, s * 2); }
        dot(wx, wy, "#dfe7f2", 1.5);
      }
    }
    if (piece.kind === "lantern" && layer === "front") {
      // A little lantern familiar: it bobs beside you, flickers, and has a face.
      const bob = reduced ? 0 : Math.sin(now / 420) * 2 * px, lx = Math.round(x + 10 * px), ly = Math.round(y - 16 * px + bob), flicker = reduced ? 1 : 0.8 + Math.sin(now / 90) * 0.2;
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 9 * px); glow.addColorStop(0, `rgba(242,220,160,${0.4 * flicker})`); glow.addColorStop(1, "rgba(242,220,160,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lx, ly, 9 * px, 0, Math.PI * 2); ctx.fill();
      const q = s;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(lx - 4 * q, ly - 6 * q, 8 * q, 11 * q);
      ctx.fillStyle = INK; ctx.fillRect(lx - 3 * q, ly - 5 * q, 6 * q, 9 * q); ctx.fillRect(lx - 1 * q, ly - 8 * q, 2 * q, 3 * q); ctx.fillRect(lx - 3 * q, ly - 6 * q, 6 * q, 1 * q);
      ctx.fillStyle = piece.color; ctx.fillRect(lx - 2 * q, ly - 4 * q, 4 * q, 6 * q);
      ctx.fillStyle = INK; ctx.fillRect(lx - 1 * q, ly - 2 * q, q, q); ctx.fillRect(lx + 1 * q, ly - 2 * q, q, q);
    }
  }
}
export const wardrobePiece = (id: string) => WARDROBE.find(entry => entry.id === id as WardrobeId);
