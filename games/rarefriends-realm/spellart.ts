/**
 * Spells in flight, drawn as small pixel sprites in the same style as the torch fire: a little flame for fire spells,
 * a curling droplet for water, a spinning whirl for wind, a tumbling boulder for earth, a knot of smoke with eyes for
 * curses, and a twinkling star for anything else. Each sprite points "down" (its front at the bottom, its tail at the
 * top), so the renderer turns it to the direction of flight. Eight frames each, cached.
 */
import { INK, pixelArt, shadeHex, type Pixels } from "./pixel.ts";
import { fireArt } from "./scenery.ts";

export const SPELL_FRAMES = 8;

export function spellArt(element: string, frame: number, core = "#ffffff"): HTMLCanvasElement {
  const f = ((frame % SPELL_FRAMES) + SPELL_FRAMES) % SPELL_FRAMES, key = `spell:${element}:${f}:${core}`;
  switch (element) {
    // A small version of the torch flame: its tongues stream back behind the spell.
    case "fire": return fireArt(f, 9, 12, 5);
    case "water": return pixelArt(key, 11, 15, p => water(p, f));
    case "wind": return pixelArt(key, 13, 13, p => wind(p, f));
    case "earth": return pixelArt(key, 11, 11, p => earth(p, f));
    case "hollow": return pixelArt(key, 11, 15, p => curse(p, f));
    default: return pixelArt(key, 11, 11, p => star(p, f, core));
  }
}

/** A teardrop of water: a round front, a tapering tail that sways, a foam crest along one side, spray behind. */
function water(p: Pixels, f: number) {
  const deep = "#3f73b8", mid = "#5f9be0", light = "#bfe0ff", foam = "#f4faff", sway = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6][f];
  p.poly([[1.4, 10.5], [2.6, 6.5], [4.4 + sway, 2.5], [5.5 + sway * 1.5, 0.5], [6.6 + sway, 3], [8.4, 7], [9.6, 10.5]], mid, null);
  p.disc(5.5, 10.6, 4.1, 3.6, mid, null);
  p.outline();
  p.disc(6.2, 11.6, 2.4, 1.7, deep, null);
  p.polyline([[3, 10], [3.6, 7], [5 + sway, 3.5]], light); p.set(3, 11, foam); p.set(4, 8, foam);
  // Spray drops behind, drifting as the frames turn.
  for (let i = 0; i < 3; i++) { const y = (f + i * 3) % 6, x = [2, 9, 8][i] + Math.round(sway * (i === 1 ? -1 : 1)); if (!p.get(x, y)) p.set(x, y, i % 2 ? foam : light); }
}
/** A whirlwind seen from above: three arms spinning round a pale eye, with streaks behind. */
function wind(p: Pixels, f: number) {
  const c = 6, turn = f * Math.PI / 4;
  for (let arm = 0; arm < 3; arm++) {
    for (let r = 1.5; r <= 5.5; r += 0.35) {
      const a = turn + arm * Math.PI * 2 / 3 + r * 0.55, x = Math.round(c + Math.cos(a) * r), y = Math.round(c + Math.sin(a) * r);
      p.set(x, y, r > 4.5 ? "#bfe4f2" : arm ? "#e6f4fa" : "#ffffff");
    }
  }
  p.set(c, c, "#ffffff"); p.set(c + 1, c, "#ffffff");
  p.outline();
}
/** A boulder tumbling end over end: faceted, cracked, lit on one side. */
function earth(p: Pixels, f: number) {
  const c = 5, turn = f * Math.PI / 4, shape = [[-3.5, -2.5], [-0.5, -4.5], [3.2, -3], [4.4, 0.6], [2, 4], [-2, 4], [-4.2, 1]];
  const at = (x: number, y: number): [number, number] => [c + x * Math.cos(turn) - y * Math.sin(turn), c + x * Math.sin(turn) + y * Math.cos(turn)];
  p.poly(shape.map(([x, y]) => at(x, y)), "#a07a4a", INK);
  p.poly([[-2.5, -2], [-0.5, -3.5], [1.5, -2.5], [0, -0.5], [-2, -0.5]].map(([x, y]) => at(x, y)), "#c8a26e", null);
  p.polyline([at(-0.5, 0), at(1, 1.5), at(0.5, 3)], "#5e4428");
  p.set(Math.round(at(2.5, 0)[0]), Math.round(at(2.5, 0)[1]), shadeHex("#a07a4a", -0.25));
}
/** A curse: a knot of dark smoke with two pale eyes, puffs of smoke shrinking away behind it. */
function curse(p: Pixels, f: number) {
  const writhe = Math.sin(f * Math.PI / 4);
  for (const [x, y, r, c] of [[5.5 + writhe, 6.5, 2.4, "#4a3570"], [4.5 - writhe, 3.5, 1.8, "#3a2a58"], [6 + writhe, 1.2, 1.1, "#2a1f3d"]] as [number, number, number, string][]) p.disc(x, y, r, r, c, null);
  p.disc(5.5, 10.5, 4.3, 3.8, "#2a1f3d", null);
  p.outline();
  p.disc(6, 9.5, 2.4, 1.8, "#4a3570", null);
  const blink = f === 5;
  for (const x of [4, 7]) { p.set(x, 10, blink ? "#4a3570" : "#e9d8ff"); if (!blink) p.set(x, 11, "#b49ae0"); }
  p.set(1, 12, "#8a62c8"); p.set(9, 7, "#8a62c8");
}
/** A four-point star in the spell's colour, its rays pulsing. */
function star(p: Pixels, f: number, core: string) {
  const c = 5, reach = [4, 5, 5, 4, 3, 4, 5, 4][f];
  for (let r = 0; r <= reach; r++) { const color = r < 2 ? "#ffffff" : core; p.set(c + r, c, color); p.set(c - r, c, color); p.set(c, c + r, color); p.set(c, c - r, color); }
  p.rect(c - 1, c - 1, 3, 3, "#ffffff");
  if (f % 2) for (const [dx, dy] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) p.set(c + dx, c + dy, core);
  p.outline();
}
