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
