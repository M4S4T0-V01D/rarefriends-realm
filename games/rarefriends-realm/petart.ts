/**
 * Pets in the Realm's pixel style: small sprites with an ink edge, two frames each (a hop, a bob or a flicker).
 * Two world pixels per art pixel, like the trees and rocks.
 */
import { Pixels, pixelArt, shadeHex } from "./pixel.ts";

export function petArt(id: string, frame: number): HTMLCanvasElement {
  return pixelArt(`pet:${id}:${frame & 1}`, 16, 16, p => { (PAINT[id] ?? PAINT.pebble)(p, frame & 1); p.outline(); });
}
const eyes = (p: Pixels, x: number, y: number, gap = 3) => { p.set(x, y, "#161616"); p.set(x + gap, y, "#161616"); p.set(x, y - 1, "#ffffff"); p.set(x + gap, y - 1, "#ffffff"); };
const PAINT: Record<string, (p: Pixels, f: number) => void> = {
  stumpy: (p, f) => {
    // A stump with rings on top, little roots, and a sprouting leaf that bobs.
    const y = f ? 1 : 0, bark = "#8a6a50";
    p.rect(4, 7 + y, 8, 8 - y, bark); p.rect(4, 7 + y, 1, 8 - y, shadeHex(bark, 0.1)); p.rect(11, 7 + y, 1, 8 - y, shadeHex(bark, -0.15));
    p.disc(8, 7 + y, 4, 1.6, "#e2c89c", null); p.set(8, 7 + y, "#b08a60"); p.set(6, 7 + y, "#c9a476");
    p.rect(3, 14, 2, 1, bark); p.rect(11, 14, 2, 1, bark);
    p.line(8, 6 + y, 9, 3 + y, "#6f8a4a"); p.disc(10, 3 + y, 2, 1.3, "#9fc48f", null); p.set(10, 2 + y, "#c6e0b4");
    eyes(p, 6, 11 + y);
  },
  pebble: (p, f) => {
    const y = f ? 1 : 0;
    p.disc(8, 10 + y, 6, 5 - y * 0.5, "#a9a59e", null); p.disc(6, 8 + y, 3, 2, "#c8c5be", null);
    p.set(11, 12 + y, "#8a867f"); p.set(4, 12 + y, "#8a867f");
    p.rect(10, 5 + y, 2, 2, "#9fc6f0"); p.set(10, 5 + y, "#ffffff");
    eyes(p, 6, 10 + y);
  },
  bubbles: (p, f) => {
    // A little fish in a floating bubble.
    const y = f ? 1 : 0;
    p.disc(8, 8 + y, 6.5, 6.5, "#dcebf5", null); p.disc(8, 8 + y, 5.5, 5.5, "#eef6fb", null);
    p.disc(8, 9 + y, 3, 2, "#e9a07a", null); p.poly([[4, 9 + y], [5, 7 + y], [5, 11 + y]], "#d98a5c", null); p.set(10, 8 + y, "#161616");
    p.set(5, 4 + y, "#ffffff"); p.set(6, 3 + y, "#ffffff");
  },
  mote: (p, f) => {
    // A glowing speck of sigil light, with a flicker of sparkles.
    p.disc(8, 8, 5, 5, "#c6bed4", null); p.disc(8, 8, 3.5, 3.5, "#e8e0f5", null); p.disc(8, 8, 1.8, 1.8, "#ffffff", null);
    const sparks = f ? [[2, 3], [13, 12], [13, 2]] : [[3, 13], [12, 3], [2, 8]];
    for (const [x, y] of sparks) p.set(x, y, "#efe2ff");
    eyes(p, 6, 8, 3);
  },
  emberling: (p, f) => {
    // A baby drake: a round red body, a wing that flaps, a tail and a snout.
    const y = f ? 1 : 0, red = "#c65a3a";
    p.disc(8, 10 + y, 4.5, 3.5, red, null); p.disc(11, 6 + y, 3, 2.6, red, null); p.rect(12, 6 + y, 3, 2, shadeHex(red, 0.08));
    p.poly([[4, 10 + y], [1, 12 + y], [2, 9 + y]], red, null);
    p.poly(f ? [[6, 8 + y], [3, 3 + y], [8, 6 + y]] : [[6, 8 + y], [2, 6 + y], [8, 7 + y]], "#e6a24a", null);
    p.rect(6, 13 + y, 1, 2, shadeHex(red, -0.2)); p.rect(10, 13 + y, 1, 2, shadeHex(red, -0.2));
    p.set(10, 5 + y, "#161616"); p.set(10, 4 + y, "#ffffff"); p.set(10, 3 + y, "#e6a24a");
  },
  cinderkin: (p, f) => {
    // A little ash golem with glowing cracks.
    const y = f ? 1 : 0, ash = "#4a4644", glow = f ? "#f0b060" : "#e6843c";
    p.rect(4, 5 + y, 8, 9 - y, ash); p.rect(3, 7 + y, 1, 4, ash); p.rect(12, 7 + y, 1, 4, ash); p.rect(5, 14, 2, 1, ash); p.rect(9, 14, 2, 1, ash);
    p.line(5, 8 + y, 7, 10 + y, glow); p.line(10, 7 + y, 9, 11 + y, glow); p.set(6, 12 + y, glow);
    p.set(6, 7 + y, glow); p.set(9, 7 + y, glow);
  },
};
