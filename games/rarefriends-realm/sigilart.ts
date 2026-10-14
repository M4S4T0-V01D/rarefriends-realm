/**
 * The sigil altars' art (render.ts draws the altars and their shrines): the orb that floats over each altar, a ball of
 * the sigil's light in pixels the way the spells are drawn, turning, with a bright heart, a rim of light and motes
 * circling it; and each sigil's emblem, cut into the altar's face and glowing in its colour.
 */
import { INK, pixelArt, shadeHex } from "./pixel.ts";

export const ORB_FRAMES = 8;
/** The orb, frame by frame: a sphere shaded from a lit upper left, a swirl of brighter light turning inside it, a white heart, a ring of its colour round it and two motes orbiting. */
export function orbArt(color: string, frame: number): HTMLCanvasElement {
  const f = ((frame % ORB_FRAMES) + ORB_FRAMES) % ORB_FRAMES;
  return pixelArt(`orb:${color}:${f}`, 21, 21, p => {
    const c = 10, light = shadeHex(color, 0.35), deep = shadeHex(color, -0.25), turn = f / ORB_FRAMES * Math.PI * 2;
    // The halo: a dithered ring of light just outside the sphere.
    p.dither(shadeHex(color, 0.15), (x, y) => { const d = Math.hypot(x - c, y - c); return d > 6.6 && d < 9.6 ? 0.35 * (1 - Math.abs(d - 8) / 1.6) : 0; });
    p.disc(c, c, 6, 6, color, null, deep);
    p.dither(light, (x, y) => Math.max(0, 1 - Math.hypot(x - c + 2, y - c + 2) / 4.2) * 0.9, color);
    // The swirl: two arms of brighter light turning round the heart.
    for (let k = 0; k < 2; k++) for (let s = 0; s < 6; s++) { const a = turn + k * Math.PI + s * 0.45, r = 1.4 + s * 0.7; p.set(c + Math.cos(a) * r, c + Math.sin(a) * r * 0.85, s < 3 ? "#ffffff" : light); }
    p.disc(c, c, 1.6, 1.6, "#ffffff", null);
    p.set(c - 3, c - 3, "#ffffff"); p.set(c - 2, c - 4, "#ffffff");
    // Two motes orbiting, one behind, one in front.
    for (let k = 0; k < 2; k++) { const a = turn * 1.5 + k * Math.PI, x = c + Math.cos(a) * 9, y = c + Math.sin(a) * 3.2; p.set(x, y, k ? light : "#ffffff"); p.set(x + 1, y, shadeHex(color, 0.2)); }
  });
}

/** Each sigil's mark, nine by nine (# lit, + its colour). */
const EMBLEMS: Record<string, readonly string[]> = {
  breeze_sigil: ["..####...", ".#....#..", "......#..", "...###...", "..#......", ".#...###.", ".#..#...#", "..##..##.", "........."],
  thought_sigil: [".........", "..#####..", ".#.....#.", "#..+++..#", "#..+#+..#", "#..+++..#", ".#.....#.", "..#####..", "........."],
  tide_sigil: [".........", ".##...##.", "#..#.#..#", ".........", ".##...##.", "#..#.#..#", ".........", ".#######.", "........."],
  stone_sigil: ["....#....", "...#+#...", "..#+++#..", "..#+++#..", ".#++#++#.", ".#+#.#+#.", "#+#...#+#", "#########", "........."],
  ember_sigil: ["....#....", "...##....", "...#+#...", "..#++#.#.", "..#+++##.", ".#++#++#.", ".#+###+#.", "..#####..", "........."],
  shade_sigil: ["...###...", ".##......", "#........", "#........", "#........", "#........", ".##......", "...###...", "........."],
  star_sigil: ["....#....", "....#....", "...#+#...", "#########", ".#+++++#.", "..#+++#..", ".#+#.#+#.", "#.#...#.#", "........."],
  storm_sigil: [".....###.", "....##...", "...##....", "..######.", ".....##..", "....##...", "...##....", "..#......", "........."],
  bloom_sigil: ["...#.#...", "..#+#+#..", ".#+#+#+#.", "..#+#+#..", "...#.#...", "....#....", "..#.#.#..", "...###...", "........."],
  path_sigil: ["#........", ".#.......", "..##.....", "....#....", "....##...", "......#..", ".......#.", "......###", "........."],
  hollow_sigil: ["..#####..", ".#.....#.", "#..###..#", "#.#...#.#", "#.#...#.#", "#..###..#", ".#.....#.", "..#####..", "........."],
  law_sigil: ["....#....", "#########", "....#....", "#...#...#", "##..#..##", "+#..#..#+", "....#....", "..#####..", "........."],
  dusk_sigil: ["#.......#", ".#.....#.", "..#####..", ".........", "..#.#.#..", ".........", "...+++...", "..+++++..", "........."],
  crown_sigil: [".........", "#...#...#", "##.###.##", "#+#+#+#+#", "#+++++++#", "#########", "#.#.#.#.#", "#########", "........."],
};
/** A sigil's emblem as it's cut into an altar: the mark in the sigil's colour, lit, on a dark inset. */
export function emblemArt(sigil: string, color: string): HTMLCanvasElement {
  const rows = EMBLEMS[sigil] ?? EMBLEMS.thought_sigil;
  return pixelArt(`emblem:${sigil}:${color}`, 13, 13, p => {
    p.rect(1, 1, 11, 11, "#2a2630"); p.rect(1, 1, 11, 1, "#4a4450");
    const lit = shadeHex(color, 0.35), mid = color;
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") p.set(x + 2, y + 2, lit); else if (ch === "+") p.set(x + 2, y + 2, mid); }));
    p.outline(INK);
  });
}
