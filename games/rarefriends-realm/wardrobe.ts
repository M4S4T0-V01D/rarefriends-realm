/**
 * The RF wardrobe, worn properly: pieces are painted into your Friend's own sprite frame, pixel for pixel.
 * Hats sit on the real top of the head, capes hang from the real shoulders (and show from behind), scarves wrap the
 * real neck, wings spread from the back. The whole figure then gets one ink edge and one white halo, like the canonical art.
 */
import { WARDROBE, type WardrobeId } from "./data.ts";
import type { Facing } from "./state.ts";

export type Mask = readonly string[];
const PAD_X = 6, PAD_TOP = 7, PAD_BOTTOM = 1;
const INK = "#161616", WHITE = "#ffffff";
const cache = new Map<string, HTMLCanvasElement>();
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1, 7), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}
type Grid = (string | null)[][];
/** Silhouette measurements of a sprite frame (in sprite pixels). */
function measure(rows: Mask) {
  const spans: ({ min: number; max: number } | null)[] = rows.map(row => { const min = row.indexOf("#"), max = row.lastIndexOf("#"); return min < 0 ? null : { min, max }; });
  const top = spans.findIndex(Boolean), bottom = spans.length - 1 - [...spans].reverse().findIndex(Boolean);
  const head = spans[top] ?? { min: 6, max: 9 }, body = spans.slice(top, bottom + 1).filter(Boolean) as { min: number; max: number }[];
  const left = Math.min(...body.map(span => span.min)), right = Math.max(...body.map(span => span.max));
  // The neck: the narrowest row in the upper half (below the head), else 40% down.
  let neck = top + Math.round((bottom - top) * 0.4), narrowest = Infinity;
  for (let y = top + 2; y <= top + Math.round((bottom - top) * 0.6); y++) { const span = spans[y]; if (span && span.max - span.min < narrowest) { narrowest = span.max - span.min; neck = y; } }
  // The head spans rows top..neck; its width is the widest row there.
  const headRows = spans.slice(top, neck + 1).filter(Boolean) as { min: number; max: number }[];
  const headLeft = Math.min(...headRows.map(span => span.min)), headRight = Math.max(...headRows.map(span => span.max));
  return { spans, top, bottom, left, right, neck, head, headLeft, headRight, centre: (headLeft + headRight) / 2 };
}
/** Your Friend's frame with worn pieces, as a pixel canvas (drawn with its feet on the anchor, like the plain sprite). */
export function figureArt(rows: Mask, worn: readonly string[], facing: Facing, ink = INK): HTMLCanvasElement {
  const pieces = WARDROBE.filter(piece => worn.includes(piece.id) && piece.kind !== "aura" && piece.kind !== "lantern");
  const key = `${ink}|${facing}|${pieces.map(piece => piece.id).join(",")}|${rows.join("")}`;
  let canvas = cache.get(key);
  if (canvas) return canvas;
  const height = rows.length, width = rows[0]?.length ?? 16, W = width + PAD_X * 2, H = height + PAD_TOP + PAD_BOTTOM;
  const grid: Grid = Array.from({ length: H }, () => Array(W).fill(null));
  const put = (x: number, y: number, color: string) => { const gx = Math.round(x) + PAD_X, gy = Math.round(y) + PAD_TOP; if (gx >= 0 && gy >= 0 && gx < W && gy < H) grid[gy][gx] = color; };
  const m = measure(rows), back = facing === "up", side = facing === "left" ? -1 : facing === "right" ? 1 : 0;
  const cape = pieces.find(piece => piece.kind === "cape"), wings = pieces.find(piece => piece.kind === "wings");
  // Behind the body.
  if (wings) {
    const y0 = m.neck, span = m.spans[m.neck] ?? m.head, dark = shade(wings.color, -0.1);
    for (let i = 0; i < 6; i++) for (let j = 0; j <= i && j < 5; j++) {
      const y = y0 + j - Math.floor(i / 2) + 1, c = (i + j) % 2 ? wings.color : dark;
      if (side <= 0) put(span.min - 1 - i, y, c);
      if (side >= 0) put(span.max + 1 + i, y, c);
    }
  }
  if (cape && !back) {
    const shoulder = m.neck + 1, dark = shade(cape.color, -0.12);
    for (let y = shoulder; y < m.bottom; y++) {
      const span = m.spans[y] ?? { min: m.left, max: m.right }, flare = Math.min(2, Math.floor((y - shoulder) / 3));
      const from = span.min - 1 - flare + (side > 0 ? -1 : 0), to = span.max + 1 + flare + (side < 0 ? 1 : 0);
      for (let x = from; x <= to; x++) put(x, y, (x + y) % 3 === 0 ? dark : cape.color);
    }
  }
  // The Friend itself.
  rows.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel === "#") put(x, y, ink); }));
  // In front of the body.
  if (cape && back) {
    const shoulder = m.neck, dark = shade(cape.color, -0.12);
    for (let y = shoulder; y < m.bottom; y++) {
      const span = m.spans[y] ?? { min: m.left, max: m.right }, flare = Math.min(2, Math.floor((y - shoulder) / 3));
      for (let x = span.min - flare; x <= span.max + flare; x++) put(x, y, x % 2 ? cape.color : dark);
    }
  }
  for (const piece of pieces) {
    const c = m.centre, top = m.top, halfHead = Math.max(3, Math.ceil((m.headRight - m.headLeft + 1) / 2));
    if (piece.kind === "scarf" || piece.kind === "bow") {
      const span = m.spans[m.neck] ?? m.head;
      if (piece.kind === "scarf") {
        for (let x = span.min - 1; x <= span.max + 1; x++) { put(x, m.neck, piece.color); put(x, m.neck + 1, x % 2 ? piece.color : shade(piece.color, -0.12)); }
        const tail = side > 0 ? span.min - 1 : side < 0 ? span.max + 1 : span.max;
        for (let y = m.neck + 2; y < m.neck + 5; y++) put(tail + (side > 0 ? -((y - m.neck) >> 1) : side < 0 ? (y - m.neck) >> 1 : 0), y, piece.color);
      } else if (!back) {
        put(c - 2, m.neck, piece.color); put(c - 1, m.neck, piece.color); put(c, m.neck, shade(piece.color, -0.2)); put(c + 1, m.neck, piece.color); put(c + 2, m.neck, piece.color);
        put(c - 2, m.neck + 1, piece.color); put(c + 2, m.neck + 1, piece.color);
      }
    }
    if (piece.kind === "hat") {
      if (piece.id === "starlit_hood") {
        // A peaked hood: a cap over the crown of the head, with side flaps that frame the face.
        for (let y = top - 3; y <= top; y++) {
          const half = halfHead + 1 - (top - y);
          for (let x = Math.floor(c - half); x <= Math.ceil(c + half); x++) put(x, y, (x + y) % 4 === 0 ? shade(piece.color, 0.12) : piece.color);
        }
        for (let y = top + 1; y <= Math.min(m.neck, top + 4); y++) { const span = m.spans[y] ?? m.head; put(span.min - 1, y, piece.color); put(span.max + 1, y, piece.color); if (back) for (let x = span.min; x <= span.max; x++) put(x, y, piece.color); }
        put(Math.round(c), top - 4, piece.color); put(Math.round(c) + 1, top - 5, "#e2d49e");
      } else {
        // Crowns: a band with three points.
        const gold = piece.color, left = Math.floor(c - halfHead + 1), right = Math.ceil(c + halfHead - 1);
        for (let x = left; x <= right; x++) { put(x, top - 1, gold); put(x, top - 2, (x - left) % 2 ? shade(gold, -0.15) : gold); }
        for (const x of [left, Math.round(c), right]) { put(x, top - 3, gold); put(x, top - 4, gold); }
        if (piece.id === "paper_crown") put(Math.round(c), top - 2, "#d8b6b4");
        if (piece.id === "rarite_crown") { put(Math.round(c), top - 2, "#9fb4d0"); put(left, top - 5, "#ffffff"); }
      }
    }
    if (piece.kind === "halo") {
      const y = top - 4, half = halfHead;
      for (let x = Math.floor(c - half); x <= Math.ceil(c + half); x++) { if (x === Math.floor(c - half) || x === Math.ceil(c + half)) put(x, y + 1, piece.color); else { put(x, y, piece.color); put(x, y + 2, piece.color); } }
    }
  }
  // Ink edge around the worn colours (not around the Friend, which is ink already), then a white halo around it all.
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] !== null;
  const colour = (x: number, y: number) => filled(x, y) && grid[y][x] !== ink;
  const edged = grid.map(row => row.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!grid[y][x] && (colour(x + 1, y) || colour(x - 1, y) || colour(x, y + 1) || colour(x, y - 1))) edged[y][x] = ink;
  canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = WHITE;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (edged[y][x]) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && y + dy >= 0 && x + dx >= 0 && y + dy < H && x + dx < W && edged[y + dy][x + dx]) { near = true; break; }
    if (near) ctx.fillRect(x, y, 1, 1);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (edged[y][x]) { ctx.fillStyle = edged[y][x]!; ctx.fillRect(x, y, 1, 1); }
  if (cache.size > 600) cache.delete(cache.keys().next().value!);
  cache.set(key, canvas);
  return canvas;
}
/** Draw a figure with its feet on (x, y); `px` screen pixels per sprite pixel. Returns the drawn box. */
export function drawFigure(ctx: CanvasRenderingContext2D, art: HTMLCanvasElement, x: number, y: number, px: number, alpha = 1) {
  const w = art.width * px, h = art.height * px;
  ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, Math.round(x - w / 2), Math.round(y - h + (1 + PAD_BOTTOM) * px), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
  return { x: x - w / 2, y: y - h + (1 + PAD_BOTTOM) * px, w, h };
}
/** Aura glow and sparkles, and the lantern familiar, drawn around the figure (not part of the frame). */
export function drawAuras(ctx: CanvasRenderingContext2D, worn: readonly string[], x: number, y: number, px: number, now: number, reduced: boolean, layer: "back" | "front") {
  for (const id of worn) {
    const piece = WARDROBE.find(entry => entry.id === id);
    if (!piece) continue;
    if (piece.kind === "aura" && layer === "back") {
      const pulse = reduced ? 1 : 1 + Math.sin(now / 600) * 0.06;
      ctx.fillStyle = `${piece.color}40`; ctx.beginPath(); ctx.ellipse(x, y - 8 * px, 11 * px * pulse, 9 * px * pulse, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `${piece.color}30`; ctx.beginPath(); ctx.ellipse(x, y - 1 * px, 10 * px, 3 * px, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (piece.kind === "aura" && layer === "front" && !reduced) {
      for (let i = 0; i < 5; i++) {
        const a = now / 1100 + i * (Math.PI * 2 / 5), sx = x + Math.cos(a) * 10 * px, sy = y - 8 * px + Math.sin(a) * 3 * px - ((now / 30 + i * 40) % 60) / 60 * 6 * px;
        const s = Math.max(1, Math.round(px)); ctx.fillStyle = "#161616"; ctx.fillRect(Math.round(sx) - s, Math.round(sy) - s, s * 3, s * 3); ctx.fillStyle = piece.color; ctx.fillRect(Math.round(sx), Math.round(sy), s, s);
      }
    }
    if (piece.kind === "lantern" && layer === "front") {
      const bob = reduced ? 0 : Math.sin(now / 420) * 2 * px, lx = x + 9 * px, ly = y - 17 * px + bob, s = Math.max(1, px);
      ctx.fillStyle = "rgba(242,220,160,0.22)"; ctx.beginPath(); ctx.arc(lx, ly, 7 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(lx - 3 * s), Math.round(ly - 4 * s), Math.round(6 * s), Math.round(8 * s));
      ctx.fillStyle = "#161616"; ctx.fillRect(Math.round(lx - 2 * s), Math.round(ly - 3 * s), Math.round(4 * s), Math.round(6 * s)); ctx.fillRect(Math.round(lx - 1 * s), Math.round(ly - 6 * s), Math.round(2 * s), Math.round(2 * s));
      ctx.fillStyle = piece.color; ctx.fillRect(Math.round(lx - 1 * s), Math.round(ly - 2 * s), Math.round(2 * s), Math.round(4 * s));
    }
  }
}
export const wardrobePiece = (id: string) => WARDROBE.find(entry => entry.id === id as WardrobeId);
