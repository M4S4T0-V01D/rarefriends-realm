/**
 * The megaliths' pictures (render.ts draws them): a standing stone three times a house's height, weathered and leaning
 * a little, lichen on one face and a carved band near its foot; a dolmen, two uprights and a capstone; and a brazier of
 * black iron, cold, or burning low and blue for whoever lit it (necropolis.ts says who has).
 */
import { INK, pixelArt, shadeHex } from "./pixel.ts";

/** A standing stone (four shapes), its faces shaded from the left, lichen and a worn carving. */
export function menhirArt(variant: number): HTMLCanvasElement {
  const v = ((variant % 4) + 4) % 4, stone = (["#8a8780", "#7d7a74", "#918d85", "#85817a"] as const)[v];
  return pixelArt(`menhir:${v}`, 44, 112, p => {
    const lean = [-3, 2, 0, 3][v], top = [6, 12, 3, 9][v], w = [30, 34, 26, 32][v], x0 = 22 - w / 2, mid = x0 + w * 0.45;
    const L = shadeHex(stone, 0.18), D = shadeHex(stone, -0.22), B = 111;
    // A broad slab, wider at the foot, its top rounded off by weather: a lit face and a shaded one.
    p.poly([[x0, B], [x0 + lean + 3, top + 10], [mid + lean - 2, top], [mid, B]], L, null);
    p.poly([[mid, B], [mid + lean - 2, top], [x0 + w + lean - 5, top + 7], [x0 + w, B]], D, null);
    p.poly([[x0, B], [x0 + lean + 3, top + 10], [mid + lean - 2, top], [x0 + w + lean - 5, top + 7], [x0 + w, B]], null, INK);
    // Cracks, lichen, and a band of worn rings near the foot.
    p.line(mid - 6, top + 30, mid - 9, top + 48, shadeHex(stone, -0.3)); p.line(mid + 5, top + 60, mid + 8, top + 74, shadeHex(stone, -0.4));
    p.dither("#8a9a6a", (x, y) => (x < mid && ((x * 7 + y * 3) % 9 === 0) && y > top + 14 && y < B - 20 ? 0.9 : 0), L);
    for (let k = 0; k < 4; k++) p.disc(x0 + 6 + k * (w - 12) / 3, 92, 1.8, 1.8, shadeHex(stone, -0.35), null);
    p.line(x0 + 3, 98, x0 + w - 3, 98, shadeHex(stone, -0.3));
  });
}
/** A dolmen: two standing stones and a capstone laid across them. */
export function dolmenArt(variant: number): HTMLCanvasElement {
  const v = ((variant % 2) + 2) % 2, stone = v ? "#85817a" : "#8f8a82";
  return pixelArt(`dolmen:${v}`, 52, 40, p => {
    const L = shadeHex(stone, 0.18), D = shadeHex(stone, -0.24);
    p.poly([[8, 39], [9, 14], [16, 13], [17, 39]], D, INK); p.poly([[35, 39], [36, 13], [43, 14], [44, 39]], D, INK);
    p.rect(17, 18, 18, 21, "#2a2826");
    p.poly([[2, 16], [6, 7], [44, 4], [50, 12], [46, 18], [6, 20]], L, INK);
    p.line(8, 9, 44, 7, shadeHex(stone, 0.35));
  });
}
/** A brazier of black iron on three legs: cold (ash), or burning low and blue (by frame). */
export function brazierArt(lit: boolean, frame: number): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4;
  return pixelArt(`brazier:${lit ? 1 : 0}:${lit ? f : 0}`, 20, 30, p => {
    p.line(5, 29, 8, 18, "#2a2a30", 2); p.line(15, 29, 12, 18, "#2a2a30", 2); p.line(10, 29, 10, 19, "#2a2a30", 1);
    p.poly([[2, 14], [18, 14], [15, 20], [5, 20]], "#3a3a42", INK);
    if (!lit) { p.rect(4, 13, 12, 2, "#6a6660"); p.set(7, 12, "#8a8680"); p.set(12, 12, "#8a8680"); return; }
    const h = [9, 11, 8, 10][f];
    p.poly([[4, 14], [7, 14 - h * 0.6], [10, 14 - h], [13, 14 - h * 0.7], [16, 14]], "#5a8ae8", null);
    p.poly([[7, 14], [9, 14 - h * 0.6], [11, 14 - h * 0.75], [13, 14]], "#b8d8ff", null);
    p.set(10, 13 - h * 0.4, "#ffffff");
  });
}
/** A trilithon: two dressed uprights and a lintel across their tops (three shapes). */
export function trilithonArt(variant: number): HTMLCanvasElement {
  const v = ((variant % 3) + 3) % 3, stone = (["#8a8780", "#817e77", "#8f8b83"] as const)[v];
  return pixelArt(`trilithon:${v}`, 64, 120, p => {
    const L = shadeHex(stone, 0.18), D = shadeHex(stone, -0.22), lean = [0, 1, -1][v];
    for (const x0 of [9, 41]) { p.poly([[x0, 119], [x0 + 1 + lean, 30], [x0 + 8 + lean, 30], [x0 + 8, 119]], L, null); p.poly([[x0 + 8, 119], [x0 + 8 + lean, 30], [x0 + 14 + lean, 30], [x0 + 14, 119]], D, null); p.poly([[x0, 119], [x0 + 1 + lean, 30], [x0 + 14 + lean, 30], [x0 + 14, 119]], null, INK); }
    p.poly([[4, 32], [6, 18], [58, 16], [60, 30]], L, INK); p.line(7, 19, 57, 17, shadeHex(stone, 0.35)); p.line(5, 30, 59, 29, D);
    p.line(16, 60, 14, 78, shadeHex(stone, -0.35)); p.line(48, 44, 50, 62, shadeHex(stone, -0.35));
    p.dither("#8a9a6a", (x, y) => ((x * 5 + y * 7) % 11 === 0 && y > 40 && y < 110 && (x < 16 || (x > 41 && x < 48)) ? 0.9 : 0), L);
  });
}
/** A Crown Stone: a trilithon whose lintel has a carved disc that turns to a face (0 Sun, 1 Moon, 2 Star, 3 Crown, 4 Eye). */
export function crownStoneArt(face: number): HTMLCanvasElement {
  const f = ((face % 5) + 5) % 5, stone = "#8c8982";
  return pixelArt(`crown_stone:${f}`, 64, 128, p => {
    const L = shadeHex(stone, 0.2), D = shadeHex(stone, -0.24), G = "#e2c46a", cx = 32, cy = 26;
    for (const x0 of [9, 41]) { p.poly([[x0, 127], [x0 + 1, 40], [x0 + 8, 40], [x0 + 8, 127]], L, null); p.poly([[x0 + 8, 127], [x0 + 8, 40], [x0 + 14, 40], [x0 + 14, 127]], D, null); p.poly([[x0, 127], [x0 + 1, 40], [x0 + 14, 40], [x0 + 14, 127]], null, INK); }
    p.poly([[3, 42], [5, 12], [59, 10], [61, 40]], L, INK); p.line(6, 13, 58, 11, shadeHex(stone, 0.35));
    p.disc(cx, cy, 11, 11, shadeHex(stone, -0.4), INK); p.disc(cx, cy, 9, 9, "#3a3836", null);
    if (f === 0) { p.disc(cx, cy, 4, 4, G, null); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.line(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, G); } }
    else if (f === 1) { p.disc(cx, cy, 6, 6, G, null); p.disc(cx + 3, cy - 2, 5, 5, "#3a3836", null); }
    else if (f === 2) { const pts: [number, number][] = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 3 : 7.5; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } p.poly(pts, G, null); }
    else if (f === 3) { p.poly([[cx - 7, cy + 4], [cx - 7, cy - 5], [cx - 3, cy - 1], [cx, cy - 7], [cx + 3, cy - 1], [cx + 7, cy - 5], [cx + 7, cy + 4]], G, null); p.rect(cx - 7, cy + 4, 15, 2, shadeHex(G, -0.2)); }
    else { p.poly([[cx - 8, cy], [cx - 3, cy - 5], [cx + 3, cy - 5], [cx + 8, cy], [cx + 3, cy + 5], [cx - 3, cy + 5]], G, null); p.disc(cx, cy, 2.5, 2.5, "#3a3836", null); }
    p.line(16, 70, 14, 88, shadeHex(stone, -0.35)); p.line(48, 54, 50, 72, shadeHex(stone, -0.35));
  });
}
/** The altar stone: a great flat slab cut with a crown, or slid aside on a stair going down. */
export function altarStoneArt(open: boolean): HTMLCanvasElement {
  return pixelArt(`altar_stone:${open ? 1 : 0}`, 64, 30, p => {
    const stone = "#8a8780", L = shadeHex(stone, 0.18), D = shadeHex(stone, -0.25);
    if (open) {
      p.poly([[6, 20], [20, 8], [44, 8], [30, 20]], "#161616", INK);
      for (let k = 0; k < 3; k++) p.line(12 + k * 4, 18 - k * 3, 30 + k * 4, 18 - k * 3, "#4a4846");
      p.poly([[30, 26], [44, 14], [62, 14], [62, 20], [48, 29], [30, 29]], D, INK); p.poly([[30, 26], [44, 14], [62, 14], [48, 26]], L, INK);
      return;
    }
    p.poly([[2, 22], [16, 8], [62, 8], [62, 14], [48, 28], [2, 28]], D, INK); p.poly([[2, 22], [16, 8], [62, 8], [48, 22]], L, INK);
    p.poly([[22, 18], [24, 12], [28, 15], [32, 10], [36, 15], [40, 12], [40, 18]], null, shadeHex(stone, -0.4));
  });
}
