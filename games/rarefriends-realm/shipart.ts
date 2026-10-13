/**
 * Vessels in the Realm's pixel style, drawn like the mounts (mountart.ts): side, front and back views, two world pixels
 * per art pixel, a four-frame stroke while under way (oars dipping, a sail filling, a wake at the bow) and still at
 * rest. The rowboat and the fishing skiff in pine and oak, the Zoryavik river barge with its deckhouse under a red roof,
 * the Vargskeld longship with its dragon prow, its striped sail and its shields along the side.
 *
 * Aboard, a vessel is drawn in two layers around you, as a ridden mount is: the `hull` under you, and the `over` layer
 * (its near side, from the deck down) over you, so you stand in it rather than on it.
 */
import { Pixels, pixelArt, shadeHex } from "./pixel.ts";
import type { VesselKind } from "./seafaring.ts";

export type ShipView = "side" | "front" | "back";
export type ShipLayer = "all" | "hull" | "over";
export const SHIP_SIZE: Record<VesselKind, Record<ShipView, { w: number; h: number }>> = {
  rowboat: { side: { w: 38, h: 16 }, front: { w: 24, h: 16 }, back: { w: 24, h: 16 } },
  skiff: { side: { w: 42, h: 36 }, front: { w: 26, h: 36 }, back: { w: 26, h: 36 } },
  barge: { side: { w: 52, h: 26 }, front: { w: 32, h: 26 }, back: { w: 32, h: 26 } },
  longship: { side: { w: 72, h: 46 }, front: { w: 34, h: 46 }, back: { w: 34, h: 46 } },
};
/** How high the deck stands above the waterline (art pixels): where you stand aboard. */
export const deckHeight = (kind: VesselKind) => ({ rowboat: 6, skiff: 7, barge: 10, longship: 14 } as const)[kind];

const PINE = "#c9a066", OAK = "#9a6a3e", TAR = "#4a3424", DARK = "#6e4528", CANVAS = "#efe6d0", RED = "#b3301f", FOAM = "#eaf6fb";
/** The sail being painted, and its stripes (set for each picture: canvas and red unless dyed). */
let SAIL = CANVAS, STRIPE = RED;
const SHIELDS = ["#b3301f", "#e3b23c", "#2f5f7a", "#efe6d0"];

export function shipArt(kind: VesselKind, view: ShipView, frame: number, layer: ShipLayer = "all", sail: string | null = null): HTMLCanvasElement {
  const { w, h } = SHIP_SIZE[kind][view];
  return pixelArt(`ship:${kind}:${view}:${frame}:${layer}:${sail ?? ""}`, w, h, p => {
    // (A dyed sail: the dye for the canvas, a darker shade of it for the stripes and the patch.)
    SAIL = sail ?? CANVAS; STRIPE = sail ? shadeHex(sail, -0.32) : RED;
    if (view === "side") SIDE[kind](p, frame); else FRONT[kind](p, frame, view === "back");
    p.outline();
    // Aboard: the near side from the deck down, drawn again over you.
    if (layer === "over") p.data.fill(0, 0, Math.max(0, h - deckHeight(kind) - 1) * w);
    // The hull under you: everything (the over layer is drawn on top of it).
  });
}
/** An oar's sweep by frame (0–3), or shipped (still). */
const sweep = (frame: number) => frame < 0 ? 0 : [0, 2, 4, 2][frame & 3];
const wake = (p: Pixels, x: number, y: number, frame: number, dir = 1) => { if (frame < 0) return; for (let k = 0; k < 3; k++) p.set(x + dir * (k + (frame & 1)), y + (k & 1), FOAM); };

const SIDE: Record<VesselKind, (p: Pixels, frame: number) => void> = {
  rowboat: (p, frame) => {
    p.poly([[2, 7], [6, 9], [32, 9], [36, 6], [34, 11], [29, 14], [9, 14], [4, 11]], PINE);
    p.line(5, 11, 33, 11, shadeHex(PINE, -0.22)); p.line(8, 12.5, 30, 12.5, shadeHex(PINE, -0.3));
    p.line(6, 9, 32, 9, shadeHex(PINE, 0.15));
    if (frame < 0) p.line(9, 8, 29, 8, DARK, 1);
    else { const s = sweep(frame); p.line(19, 9, 12 + s, 15, DARK, 1); p.rect(11 + s, 14, 2, 2, PINE); }
    wake(p, 35, 13, frame);
  },
  skiff: (p, frame) => {
    // The lugsail on its yard, the mast just forward of where you stand, then the hull over the water.
    const fill = frame < 0 ? 0 : frame & 1;
    p.line(27, 3, 27, 28, DARK, 2);
    p.poly([[13, 8], [28, 4], [30 + fill, 24], [12, 25]], SAIL);
    p.line(14, 15, 29, 14, shadeHex(SAIL, -0.12)); p.rect(18, 9, 4, 4, STRIPE);
    p.line(12, 8, 29, 3, TAR, 1);
    p.poly([[2, 26], [6, 28], [36, 28], [40, 23], [38, 30], [32, 34], [9, 34], [4, 30]], OAK);
    p.line(5, 30, 37, 30, shadeHex(OAK, -0.2)); p.line(8, 32, 33, 32, shadeHex(OAK, -0.3)); p.line(6, 28, 36, 28, shadeHex(OAK, 0.18));
    p.line(2, 27, 0, 33, TAR, 1);
    wake(p, 39, 33, frame);
  },
  barge: (p, frame) => {
    // The deckhouse aft under its red roof, crates amidships, a long steering oar, a flat hull.
    p.rect(5, 8, 14, 8, PINE); p.rect(9, 10, 3, 3, "#f3d27a"); p.rect(14, 10, 3, 3, "#f3d27a");
    p.poly([[3, 9], [12, 3], [21, 9]], "#9a3b2c"); p.line(4, 9, 20, 9, shadeHex("#9a3b2c", -0.25));
    p.rect(25, 10, 8, 6, "#a87f56"); p.line(25, 13, 33, 13, shadeHex("#a87f56", -0.25)); p.rect(34, 12, 6, 4, "#b98a56");
    p.poly([[2, 15], [50, 15], [48, 21], [44, 24], [7, 24], [3, 21]], shadeHex(OAK, -0.12));
    p.line(4, 19, 48, 19, shadeHex(OAK, -0.32)); p.line(3, 15, 49, 15, shadeHex(OAK, 0.1));
    p.line(2, 15, frame < 0 ? 0 : 1 - (frame & 1), 25, DARK, 1);
    if (frame >= 0) p.line(44, 12, 47 + (frame & 1) * 2, 25, DARK, 1);
    wake(p, 49, 23, frame);
  },
  longship: (p, frame) => {
    // The striped square sail on its mast amidships, the hull sweeping up to a dragon at the prow and a curl at the stern,
    // shields along the side, oars out when under way.
    const fill = frame < 0 ? 0 : frame & 1;
    p.line(38, 2, 38, 31, TAR, 2);
    p.rect(24, 5 + fill, 28, 20 - fill, SAIL);
    for (let x = 24; x < 52; x += 8) p.rect(x, 5 + fill, 4, 20 - fill, STRIPE);
    p.line(22, 4, 54, 4, TAR, 1);
    p.poly([[1, 22], [6, 31], [62, 31], [68, 21], [66, 30], [60, 38], [11, 38], [4, 32]], OAK);
    p.line(5, 34, 63, 34, shadeHex(OAK, -0.22)); p.line(9, 36, 59, 36, shadeHex(OAK, -0.32)); p.line(6, 31, 62, 31, shadeHex(OAK, 0.18));
    // The dragon: neck up from the prow, a head with an open jaw, an eye. The stern curls back.
    p.poly([[66, 30], [68, 21], [69, 16], [71, 14], [71, 18], [70, 22], [68, 30]], OAK);
    p.poly([[68, 14], [71, 12], [71, 16], [68, 17]], OAK); p.set(70, 14, "#e3b23c");
    p.polyline([[3, 31], [1, 24], [2, 19], [4, 18]], OAK, 2);
    for (let i = 0, x = 12; x <= 58; x += 7, i++) p.disc(x, 31, 2.6, 2.6, SHIELDS[i % SHIELDS.length]);
    if (frame >= 0) { const s = sweep(frame); for (let x = 15; x <= 55; x += 10) p.line(x, 34, x - 3 + s, 45, DARK, 1); }
    wake(p, 67, 37, frame);
  },
};

const FRONT: Record<VesselKind, (p: Pixels, frame: number, back: boolean) => void> = {
  rowboat: (p, frame, back) => {
    const s = sweep(frame);
    if (frame >= 0) { p.line(5, 9, 0, 12 + s / 2, DARK, 1); p.line(18, 9, 23, 12 + s / 2, DARK, 1); }
    if (back) p.poly([[4, 7], [20, 7], [19, 13], [5, 13]], PINE); else p.poly([[4, 7], [20, 7], [18, 12], [12, 15], [6, 12]], PINE);
    p.rect(6, 7, 12, 2, shadeHex(PINE, -0.35)); p.line(4, 7, 20, 7, shadeHex(PINE, 0.15));
    if (back) p.line(12, 9, 12, 15, DARK, 1); else wake(p, 11, 15, frame);
  },
  skiff: (p, frame, back) => {
    const fill = frame < 0 ? 0 : frame & 1;
    p.line(13, 3, 13, 28, DARK, 2);
    p.poly([[8 - fill, 6], [18 + fill, 5], [19 + fill, 24], [7 - fill, 25]], SAIL); p.rect(11, 9, 4, 4, STRIPE);
    if (back) p.poly([[3, 27], [23, 27], [22, 34], [4, 34]], OAK); else p.poly([[3, 27], [23, 27], [20, 32], [13, 35], [6, 32]], OAK);
    p.rect(5, 27, 16, 2, shadeHex(OAK, -0.35)); p.line(3, 27, 23, 27, shadeHex(OAK, 0.18));
    if (back) p.line(13, 29, 13, 35, TAR, 1); else wake(p, 12, 35, frame);
  },
  barge: (p, frame, back) => {
    // From ahead the deckhouse shows over the bow; from astern it's right there.
    p.rect(9, 7, 14, 8, PINE); p.rect(14, 10, 4, 3, "#f3d27a");
    p.poly([[7, 8], [16, 2], [25, 8]], "#9a3b2c");
    p.poly([[2, 15], [30, 15], [29, 22], [26, 25], [6, 25], [3, 22]], shadeHex(OAK, -0.12));
    p.rect(4, 15, 24, 2, shadeHex(OAK, -0.35)); p.line(2, 15, 30, 15, shadeHex(OAK, 0.1));
    if (back) p.line(16, 17, 16 + (frame < 0 ? 0 : (frame & 1) * 2 - 1), 25, DARK, 1); else wake(p, 15, 25, frame);
  },
  longship: (p, frame, back) => {
    const fill = frame < 0 ? 0 : frame & 1;
    p.line(17, 2, 17, 30, TAR, 2);
    p.rect(3, 5 + fill, 28, 19 - fill, SAIL); for (let x = 3; x < 31; x += 8) p.rect(x, 5 + fill, 4, 19 - fill, STRIPE);
    p.line(2, 4, 32, 4, TAR, 1);
    if (frame >= 0) { const s = sweep(frame); p.line(6, 33, 0, 40 + s / 2, DARK, 1); p.line(28, 33, 33, 40 + s / 2, DARK, 1); }
    p.poly([[5, 30], [29, 30], [27, 37], [17, 42], [7, 37]], OAK);
    p.rect(7, 30, 20, 2, shadeHex(OAK, -0.35)); p.line(5, 30, 29, 30, shadeHex(OAK, 0.18));
    p.disc(5, 31, 2.4, 2.4, SHIELDS[0]); p.disc(29, 31, 2.4, 2.4, SHIELDS[1]);
    // The dragon's neck at the prow (or the curled stern from behind), rising over the bow.
    if (back) p.polyline([[17, 42], [17, 34], [19, 31], [21, 32]], OAK, 2);
    else { p.poly([[16, 42], [18, 42], [18, 30], [19, 26], [17, 24], [15, 26], [16, 30]], OAK); p.set(16, 26, "#e3b23c"); p.set(18, 26, "#e3b23c"); wake(p, 16, 43, frame); }
  },
};
/** A sign's or a menu's little vessel: the side view, still. */
export const shipIcon = (kind: VesselKind) => shipArt(kind, "side", -1);
