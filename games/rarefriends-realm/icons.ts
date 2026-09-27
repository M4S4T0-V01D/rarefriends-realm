/**
 * Pixel-art icons for items, skills, tabs, spells, prayers and orbs, in the Rare Friends style:
 * flat colour, a one-pixel ink edge and a white halo, drawn on small grids and scaled up without smoothing.
 */
import type { Icon, Skill } from "./data.ts";
import { INK, Pixels, pixelArt, shadeHex } from "./pixel.ts";

const G = 26, K = 22 / 32, O = 2;
type Pt = [number, number];
/** Items are designed on a 32-unit square and rasterized onto a 26-pixel grid. */
export function itemArt(icon: Icon): HTMLCanvasElement {
  return pixelArt(`item:${icon.shape}:${icon.color}:${icon.accent ?? ""}`, G, G, px => {
    const m = (v: number) => O + v * K, P = (points: Pt[]) => points.map(([x, y]) => [m(x), m(y)] as const);
    const color = icon.color, accent = icon.accent ?? INK, light = shadeHex(color, 0.12), dark = shadeHex(color, -0.14);
    const p = (points: Pt[], fill: string, stroke: string | null = INK) => px.poly(P(points), fill, stroke);
    const e = (cx: number, cy: number, rx: number, ry: number, fill: string, stroke: string | null = INK) => px.disc(m(cx), m(cy), rx * K, ry * K, fill, stroke);
    const l = (points: Pt[], stroke = INK, width = 2) => px.polyline(P(points), stroke, Math.max(1, Math.round(width * K)));
    const blade = (points: Pt[], width: number) => { l(points, INK, width + 1.6); l(points, color, width); l([[points[0][0] + 1, points[0][1] - 1], [points[points.length - 1][0] - 1, points[points.length - 1][1] + 1]], light, 1); };
    switch (icon.shape) {
      case "coins": e(11, 22, 8, 4, dark); e(19, 18, 8, 4, color); e(14, 13, 8, 4, light); break;
      case "axe": l([[9, 28], [21, 7]], INK, 5); l([[9, 28], [21, 7]], "#9c8672", 3); p([[15, 4], [27, 7], [25, 17], [19, 13]], color); break;
      case "pickaxe": l([[11, 29], [18, 9]], INK, 5); l([[11, 29], [18, 9]], "#9c8672", 3); p([[4, 12], [16, 4], [29, 9], [17, 11]], color); break;
      case "sword": blade([[9, 25], [26, 6]], 3.4); l([[5, 19], [15, 29]], INK, 4); l([[5, 19], [15, 29]], "#c9b77f", 2); l([[6, 27], [9, 24]], "#8a7563", 3); break;
      case "dagger": blade([[11, 23], [23, 11]], 3.4); l([[8, 19], [15, 26]], INK, 4); l([[8, 19], [15, 26]], "#c9b77f", 2); l([[7, 26], [10, 23]], "#8a7563", 3); break;
      case "sabre": l([[9, 25], [13, 15], [19, 9], [27, 6]], INK, 5.6); l([[9, 25], [13, 15], [19, 9], [27, 6]], color, 3.4); l([[5, 20], [13, 28]], INK, 4); l([[5, 20], [13, 28]], "#c9b77f", 2); break;
      case "helm": p([[7, 24], [7, 12], [16, 5], [25, 12], [25, 24]], color); p([[10, 15], [22, 15], [22, 18], [10, 18]], INK, null); l([[16, 6], [16, 13]], light, 2); break;
      case "hood": p([[7, 26], [8, 11], [16, 5], [24, 11], [25, 26], [16, 21]], color); p([[11, 14], [21, 14], [20, 20], [12, 20]], "#3b3a38", null); break;
      case "hat": p([[4, 25], [28, 25], [19, 20], [16, 3], [13, 20]], color); l([[8, 24], [24, 24]], dark, 2); break;
      case "crown": p([[6, 25], [6, 11], [11, 17], [16, 8], [21, 17], [26, 11], [26, 25]], color); if (icon.accent) e(16, 20, 2.5, 2.5, accent, null); break;
      case "body": p([[9, 7], [23, 7], [29, 14], [24, 18], [23, 28], [9, 28], [8, 18], [3, 14]], color); l([[16, 9], [16, 26]], dark, 2); break;
      case "legs": p([[8, 5], [24, 5], [25, 29], [18, 29], [16, 14], [14, 29], [7, 29]], color); l([[8, 8], [24, 8]], dark, 2); break;
      case "shield": p([[7, 6], [25, 6], [25, 17], [16, 29], [7, 17]], color); l([[16, 8], [16, 25]], dark, 2); l([[9, 13], [23, 13]], dark, 2); break;
      case "boots": p([[7, 9], [15, 9], [15, 21], [26, 21], [26, 28], [7, 28]], color); break;
      case "gloves": p([[9, 28], [8, 12], [11, 7], [14, 11], [16, 6], [19, 11], [22, 8], [24, 12], [24, 28]], color); break;
      case "bracer": p([[8, 7], [24, 9], [23, 27], [9, 25]], color); l([[9, 14], [23, 16]], dark, 2); l([[9, 20], [23, 21]], dark, 2); break;
      case "cape": p([[10, 5], [22, 5], [28, 28], [4, 28]], color); if (icon.accent) l([[9, 20], [23, 20]], accent, 2); break;
      case "amulet": l([[8, 6], [8, 13], [16, 20], [24, 13], [24, 6]], "#c9b77f", 2); e(16, 22, 5, 5.5, color); break;
      case "log": p([[9, 11], [25, 8], [28, 15], [26, 22], [9, 25]], color); e(9, 18, 5, 7, "#e8d9c8"); e(9, 18, 2, 3, dark, null); l([[13, 13], [24, 11]], dark, 1); break;
      case "fish": p([[3, 16], [11, 9], [22, 11], [27, 16], [22, 21], [11, 23]], color); p([[23, 16], [31, 9], [31, 23]], color); e(9, 14, 1.4, 1.4, INK, null); l([[14, 12], [14, 20]], dark, 1); break;
      case "ore": p([[5, 23], [8, 11], [17, 5], [26, 11], [28, 23], [17, 29]], "#a39e96"); e(12, 15, 3.5, 3, color); e(20, 21, 3.5, 3, color); e(20, 11, 2.5, 2, color); break;
      case "bar": p([[4, 17], [11, 11], [28, 11], [21, 17]], light); p([[4, 17], [21, 17], [21, 24], [4, 24]], color); p([[21, 17], [28, 11], [28, 18], [21, 24]], dark); break;
      case "bones": l([[8, 24], [24, 8]], INK, 6); l([[8, 24], [24, 8]], color, 3.4); e(6, 22, 3.5, 3.5, color); e(10, 26, 3.5, 3.5, color); e(22, 6, 3.5, 3.5, color); e(26, 10, 3.5, 3.5, color); break;
      case "sigil": p([[7, 9], [16, 4], [25, 9], [25, 23], [16, 28], [7, 23]], "#c8c5be"); e(16, 16, 5.5, 5.5, color); break;
      case "staff": l([[7, 29], [23, 7]], INK, 5); l([[7, 29], [23, 7]], "#9c8672", 3); e(24, 6, 5, 5, icon.accent ?? color); break;
      case "net": for (let i = 0; i < 4; i++) { l([[8 + i * 5, 7], [8 + i * 5, 25]], "#6d6b67", 1.4); l([[5, 9 + i * 5], [26, 9 + i * 5]], "#6d6b67", 1.4); } l([[3, 29], [9, 23]], "#8a7563", 4); break;
      case "rod": l([[5, 29], [27, 3]], INK, 4); l([[5, 29], [27, 3]], color, 2.2); l([[27, 3], [29, 22]], "#6d6b67", 1); e(29, 23, 1.5, 1.5, "#c98f95", null); break;
      case "harpoon": l([[5, 29], [24, 6]], INK, 4.6); l([[5, 29], [24, 6]], color, 2.6); p([[23, 5], [29, 1], [27, 11]], color); break;
      case "pot": p([[8, 11], [24, 11], [26, 22], [21, 28], [11, 28], [6, 22]], color); p([[8, 11], [24, 11], [22, 13], [10, 13]], dark, null); break;
      case "bucket": p([[7, 12], [25, 12], [22, 28], [10, 28]], color); l([[7, 12], [9, 5], [23, 5], [25, 12]], INK, 1.5); l([[8, 17], [24, 17]], dark, 1.5); break;
      case "milk": p([[7, 12], [25, 12], [22, 28], [10, 28]], "#9c8672"); p([[8, 12], [24, 12], [23, 15], [9, 15]], color, null); l([[7, 12], [9, 5], [23, 5], [25, 12]], INK, 1.5); break;
      case "flour": p([[8, 12], [24, 12], [26, 22], [21, 28], [11, 28], [6, 22]], "#b89c86"); e(16, 11, 8, 3.5, color); break;
      case "egg": e(16, 17, 8, 10, color); e(13, 13, 2, 3, "#ffffff", null); break;
      case "wheat": for (let i = -1; i <= 1; i++) { l([[16 + i * 4, 29], [16 + i * 6, 8]], "#8a7563", 1.4); e(16 + i * 6, 9, 3, 6, color); } break;
      case "tinderbox": p([[6, 12], [26, 12], [26, 25], [6, 25]], color); e(21, 18, 3, 3, "#e3a58c"); l([[9, 15], [15, 15]], dark, 1); break;
      case "hammer": l([[9, 29], [18, 10]], INK, 5); l([[9, 29], [18, 10]], "#9c8672", 3); p([[10, 5], [26, 9], [24, 17], [8, 13]], color); break;
      case "knife": l([[7, 27], [14, 20]], INK, 5); l([[7, 27], [14, 20]], "#8a7563", 3); p([[14, 19], [27, 5], [19, 23]], color); break;
      case "needle": l([[7, 27], [25, 7]], INK, 3); l([[7, 27], [25, 7]], color, 1.4); e(24, 8, 2, 2, "#ffffff"); break;
      case "thread": e(16, 16, 9, 9, color); l([[9, 12], [23, 20]], "#6d6b67", 1.4); l([[9, 19], [23, 13]], "#6d6b67", 1.4); break;
      case "chisel": l([[7, 27], [18, 16]], INK, 5); l([[7, 27], [18, 16]], "#8a7563", 3); p([[17, 15], [27, 5], [22, 19]], color); break;
      case "gem": p([[7, 13], [12, 7], [20, 7], [25, 13], [16, 27]], color); l([[7, 13], [25, 13]], INK, 1); l([[12, 8], [14, 12]], "#ffffff", 1); break;
      case "hide": p([[5, 9], [14, 6], [23, 7], [28, 14], [25, 26], [12, 28], [4, 20]], color); e(12, 15, 3.5, 3, accent, null); e(20, 21, 3, 2.5, accent, null); break;
      case "leather": p([[6, 9], [26, 7], [27, 25], [7, 27]], color); l([[9, 12], [23, 11]], dark, 1); break;
      case "meat": e(15, 17, 11, 8, color); l([[23, 11], [29, 5]], INK, 4); l([[23, 11], [29, 5]], "#f2efe8", 2.4); break;
      case "feather": l([[7, 28], [25, 5]], "#8a7563", 1.4); p([[9, 23], [13, 11], [24, 4], [21, 17]], color); break;
      case "bait": for (const [bx, by] of [[10, 13], [19, 11], [14, 21], [23, 20]] as Pt[]) e(bx, by, 4, 2.6, color); break;
      case "cake": p([[5, 18], [16, 11], [27, 18], [27, 25], [16, 31], [5, 25]], color); p([[5, 18], [16, 11], [27, 18], [16, 24]], accent); break;
      case "berries": for (const [bx, by] of [[11, 18], [18, 16], [14, 11], [21, 22], [10, 24], [17, 23]] as Pt[]) e(bx, by, 3.6, 3.6, color); l([[15, 9], [15, 4], [20, 3]], "#8e9887", 1.4); break;
    case "bread": e(16, 18, 12, 8, color); l([[10, 15], [13, 20]], dark, 1.4); l([[16, 14], [19, 19]], dark, 1.4); l([[22, 15], [24, 19]], dark, 1.4); break;
      case "key": e(10, 11, 5.5, 5.5, color); e(10, 11, 2, 2, "#ffffff00", null); l([[13, 15], [26, 28]], INK, 4.6); l([[13, 15], [26, 28]], color, 2.6); l([[21, 23], [25, 19]], color, 2.6); break;
      case "lamp": p([[7, 22], [25, 22], [21, 13], [11, 13]], color); e(16, 10, 3.5, 3.5, "#ffffff"); break;
      case "scroll": p([[8, 7], [24, 7], [24, 26], [8, 26]], color); l([[11, 12], [21, 12]], INK, 1); l([[11, 17], [21, 17]], INK, 1); l([[11, 22], [18, 22]], INK, 1); break;
      case "silk": p([[5, 11], [27, 7], [27, 22], [5, 26]], color); l([[8, 15], [25, 12]], "#ffffff", 1.4); break;
      case "burnt": e(16, 18, 11, 7, color); e(12, 15, 2, 1.5, "#6d6b67", null); break;
      case "orb": e(16, 16, 10, 10, color); e(12, 12, 3.5, 3.5, "#ffffff", null); break;
      case "bow":
        // A recurve limb with its string, and a nocked arrow.
        l([[8, 4], [15, 8], [20, 16], [15, 24], [8, 28]], INK, 5); l([[8, 4], [15, 8], [20, 16], [15, 24], [8, 28]], color, 3);
        l([[8, 4], [8, 28]], "#efede7", 1); if (icon.accent) { e(20, 16, 2.5, 2.5, accent); } else l([[18, 15], [20, 17]], "#c9b77f", 2); break;
      case "arrow":
        for (const dy of [-5, 0, 5]) { l([[5, 27 + dy], [23, 9 + dy]], "#9c8672", 1.6); p([[23, 5 + dy], [28, 4 + dy], [27, 9 + dy]], color); p([[5, 27 + dy], [4, 22 + dy], [8, 25 + dy]], "#efede7", null); }
        break;
      case "tablet": p([[7, 5], [25, 5], [27, 27], [5, 27]], "#c8c5be"); e(16, 16, 6, 6, color); l([[16, 11], [16, 21]], INK, 1); l([[11, 16], [21, 16]], INK, 1); break;
      case "trophy": p([[9, 5], [23, 5], [21, 16], [11, 16]], color); l([[16, 16], [16, 24]], INK, 2.5); p([[9, 24], [23, 24], [23, 29], [9, 29]], color); break;
    }
    px.halo();
  });
}

// ---------- 16-pixel UI icons: skills, tabs, orbs ----------
const G16 = 18;
type Painter = (p: Pixels) => void;
function icon16(key: string, paint: Painter) { return pixelArt(`ui:${key}`, G16, G16, p => { paint(p); p.halo(); }); }
const WOOD = "#9c8672", STEEL = "#b9bfc6", GOLD = "#e2d49e", ROSE = "#d8b6b4", SAGE = "#b4c3ab", BLUE = "#9fb4d0", PAPER = "#efede7", FIRE = "#e9a07a";
const SKILL_PAINTERS: Record<Skill, Painter> = {
  attack: p => { p.line(3, 14, 13, 4, INK, 3); p.line(3, 14, 13, 4, STEEL, 1); p.line(2, 10, 7, 15, INK, 2); },
  strength: p => { p.poly([[4, 9], [9, 4], [14, 6], [14, 12], [9, 15], [5, 13]], ROSE); p.line(7, 8, 11, 8, INK); p.line(7, 11, 11, 11, INK); },
  defence: p => { p.poly([[3, 3], [14, 3], [14, 9], [8.5, 15], [3, 9]], STEEL); p.line(8.5, 4, 8.5, 13, INK); },
  hitpoints: p => { p.disc(6, 6.5, 3.5, 3.5, "#cf6e6e"); p.disc(11, 6.5, 3.5, 3.5, "#cf6e6e"); p.poly([[3, 8], [14, 8], [8.5, 15]], "#cf6e6e"); p.set(5, 5, "#ffffff"); },
  magic: p => { p.poly([[8.5, 1], [10.5, 6.5], [16, 8], [10.5, 9.5], [8.5, 16], [6.5, 9.5], [1, 8], [6.5, 6.5]], "#b6c3e0"); },
  prayer: p => { p.rect(7, 2, 3, 13, PAPER); p.rect(3, 6, 11, 3, PAPER); p.poly([[7, 2], [10, 2], [10, 6], [14, 6], [14, 9], [10, 9], [10, 15], [7, 15], [7, 9], [3, 9], [3, 6], [7, 6]], null); },
  woodcutting: p => { p.line(4, 15, 11, 3, INK, 3); p.line(4, 15, 11, 3, WOOD, 1); p.poly([[8, 2], [15, 4], [14, 9], [11, 7]], STEEL); },
  fishing: p => { p.poly([[1, 9], [5, 5], [12, 6], [15, 9], [12, 12], [5, 13]], BLUE); p.poly([[13, 9], [17, 5], [17, 13]], BLUE); p.set(4, 8, INK); },
  cooking: p => { p.disc(7, 10, 6, 4, "#6d6b67"); p.line(12, 9, 16, 6, INK, 2); p.line(5, 4, 5, 6, "#c8c5be"); p.line(8, 3, 8, 6, "#c8c5be"); },
  firemaking: p => { p.poly([[4, 15], [3, 10], [6, 5], [7, 9], [9, 2], [12, 8], [13, 6], [14, 11], [13, 15]], FIRE); p.poly([[7, 15], [7, 11], [9, 8], [11, 12], [11, 15]], GOLD, null); },
  mining: p => { p.line(5, 15, 10, 5, INK, 3); p.line(5, 15, 10, 5, WOOD, 1); p.poly([[2, 6], [9, 2], [16, 5], [10, 6]], STEEL); },
  smithing: p => { p.poly([[2, 8], [15, 8], [13, 11], [11, 11], [11, 14], [6, 14], [6, 11], [4, 11]], "#8b8e92"); p.line(10, 6, 14, 2, INK, 2); p.rect(8, 1, 5, 3, STEEL); },
  crafting: p => { p.line(3, 15, 14, 3, INK, 2); p.line(3, 15, 14, 3, STEEL); p.disc(13, 4, 1.5, 1.5, PAPER); p.line(6, 5, 10, 13, ROSE, 2); },
  thieving: p => { p.poly([[4, 16], [3, 8], [5, 7], [6, 11], [6, 4], [8, 4], [8, 10], [9, 3], [11, 3], [11, 10], [12, 5], [14, 6], [13, 16]], "#e8d4c0"); },
  agility: p => { p.poly([[2, 11], [10, 11], [11, 7], [13, 7], [15, 14], [2, 14]], "#b89c86"); p.line(3, 9, 7, 5, SAGE, 2); p.line(6, 5, 9, 3, SAGE, 2); },
  ranged: p => { p.polyline([[5, 1], [10, 4], [12, 9], [10, 14], [5, 16]], INK, 3); p.polyline([[5, 1], [10, 4], [12, 9], [10, 14], [5, 16]], WOOD); p.line(5, 2, 5, 15, PAPER); p.line(2, 12, 15, 5, INK, 2); p.line(2, 12, 15, 5, "#c8c5be"); p.poly([[14, 3], [17, 3], [16, 7]], STEEL); },
  slayer: p => { p.disc(8.5, 7, 6, 5.5, "#e8e4dc"); p.rect(5, 11, 7, 4, "#e8e4dc"); p.rect(5, 5, 3, 3, INK); p.rect(10, 5, 3, 3, INK); p.rect(8, 9, 1, 2, INK); p.line(6, 14, 11, 14, INK); p.line(1, 16, 16, 1, "#cf6e6e", 1); },
};
export const skillArt = (skill: Skill) => icon16(`skill:${skill}`, SKILL_PAINTERS[skill]);
export type TabIcon = "combat" | "skills" | "quests" | "inventory" | "equipment" | "prayer" | "magic" | "friends" | "settings";
const TAB_PAINTERS: Record<TabIcon, Painter> = {
  combat: p => { p.line(2, 14, 13, 3, INK, 3); p.line(2, 14, 13, 3, STEEL); p.line(15, 14, 4, 3, INK, 3); p.line(15, 14, 4, 3, STEEL); p.rect(3, 12, 3, 3, GOLD); p.rect(12, 12, 3, 3, GOLD); },
  skills: p => { for (let i = 0; i < 3; i++) p.rect(2 + i * 5, 12 - i * 4, 4, 4 + i * 4, [SAGE, BLUE, GOLD][i]); },
  quests: p => { p.poly([[4, 2], [14, 2], [14, 15], [4, 15]], "#efe3c4"); p.line(6, 6, 12, 6, INK); p.line(6, 9, 12, 9, INK); p.line(6, 12, 10, 12, INK); p.rect(2, 1, 14, 2, WOOD); p.rect(2, 15, 14, 2, WOOD); },
  inventory: p => { p.poly([[3, 6], [14, 6], [15, 16], [2, 16]], "#b58b6b"); p.poly([[6, 6], [6, 3], [11, 3], [11, 6]], null); p.rect(7, 9, 3, 2, GOLD); },
  equipment: p => { p.poly([[3, 14], [3, 6], [8.5, 1], [14, 6], [14, 14]], STEEL); p.rect(5, 7, 7, 2, INK); p.line(8.5, 2, 8.5, 6, "#ffffff"); },
  prayer: p => { p.rect(7, 1, 3, 15, PAPER); p.rect(3, 5, 11, 3, PAPER); p.poly([[7, 1], [10, 1], [10, 5], [14, 5], [14, 8], [10, 8], [10, 16], [7, 16], [7, 8], [3, 8], [3, 5], [7, 5]], null); },
  magic: p => { p.line(3, 16, 12, 4, INK, 3); p.line(3, 16, 12, 4, WOOD); p.poly([[12, 0], [13.5, 3.5], [17, 4.5], [13.5, 5.5], [12, 9], [10.5, 5.5], [7, 4.5], [10.5, 3.5]], "#b6c3e0"); },
  friends: p => { p.disc(8.5, 7, 6, 5.5, INK, INK); p.rect(5, 12, 2, 3, INK); p.rect(10, 12, 2, 3, INK); p.rect(6, 6, 2, 2, "#ffffff"); p.rect(10, 6, 2, 2, "#ffffff"); p.rect(4, 3, 2, 2, INK); p.rect(11, 3, 2, 2, INK); },
  settings: p => { p.disc(8.5, 8.5, 6, 6, "#8b8e92"); for (const [x, y] of [[8, 0], [8, 15], [0, 8], [15, 8], [2, 2], [14, 14], [2, 14], [14, 2]] as Pt[]) p.rect(x, y, 2, 2, "#8b8e92"); p.disc(8.5, 8.5, 2.5, 2.5, "#242322"); },
};
export const tabArt = (tab: TabIcon) => icon16(`tab:${tab}`, TAB_PAINTERS[tab]);
export type OrbIcon = "hitpoints" | "prayer" | "run" | "walk" | "map";
const ORB_PAINTERS: Record<OrbIcon, Painter> = {
  hitpoints: SKILL_PAINTERS.hitpoints, prayer: SKILL_PAINTERS.prayer,
  run: p => { p.poly([[3, 12], [9, 12], [10, 8], [13, 7], [15, 13], [15, 15], [3, 15]], GOLD); p.line(4, 10, 8, 6, SAGE, 2); p.line(7, 6, 10, 4, SAGE, 2); },
  walk: p => { p.poly([[3, 12], [9, 12], [10, 8], [13, 7], [15, 13], [15, 15], [3, 15]], "#9a968f"); },
  map: p => { p.poly([[2, 4], [6, 2], [11, 4], [16, 2], [16, 14], [11, 16], [6, 14], [2, 16]], "#efe3c4"); p.line(6, 2, 6, 14, INK); p.line(11, 4, 11, 16, INK); p.disc(9, 9, 1.5, 1.5, "#cf6e6e", null); },
};
export const orbArt = (orb: OrbIcon) => icon16(`orb:${orb}`, ORB_PAINTERS[orb]);

// ---------- Spell and prayer icons (generated from their element) ----------
const ELEMENT_COLORS: Record<string, string> = { wind: "#e6ecef", water: "#8fa3c9", earth: "#a89479", fire: "#e9a07a", hollow: "#6d6b67", moon: "#c6bed4", gold: "#e2d49e", home: "#e8d4c0" };
/** Spell icon: an element orb with a shape by kind (bolt, strike, blast, curse, teleport, alchemy, utility). */
export function spellArt(id: string, element: string, kind: string): HTMLCanvasElement {
  const color = ELEMENT_COLORS[element] ?? "#c7d3dc";
  return pixelArt(`spell:${id}`, 20, 20, p => {
    switch (kind) {
      case "strike": p.disc(10, 10, 5, 5, color, INK, shadeHex(color, -0.15)); p.line(3, 15, 7, 11, color, 2); break;
      case "bolt": p.poly([[11, 1], [5, 11], [9, 11], [7, 19], [15, 8], [11, 8], [13, 1]], color); break;
      case "blast": p.poly([[10, 1], [12, 7], [18, 5], [13, 10], [18, 15], [12, 13], [10, 19], [8, 13], [2, 15], [7, 10], [2, 5], [8, 7]], color); break;
      case "curse": p.disc(10, 10, 7, 7, "#3b3a38", INK); p.disc(10, 10, 3, 3, color, null); p.line(4, 4, 16, 16, color, 1); break;
      case "bind": p.disc(10, 10, 7, 7, SAGE, INK); p.line(3, 8, 17, 12, "#6d8a64", 2); p.line(3, 12, 17, 8, "#6d8a64", 2); break;
      case "teleport": p.disc(10, 12, 7, 4, color, INK); p.poly([[10, 1], [13, 9], [7, 9]], "#ffffff"); p.line(10, 3, 10, 12, INK); break;
      case "alchemy": p.poly([[7, 2], [13, 2], [12, 7], [17, 16], [3, 16], [8, 7]], "#ffffff"); p.poly([[5, 12], [15, 12], [17, 16], [3, 16]], GOLD, null); p.line(7, 2, 13, 2, INK); break;
      case "superheat": p.rect(4, 11, 12, 5, "#8b8e92"); p.poly([[5, 11], [7, 4], [9, 8], [11, 2], [13, 7], [15, 11]], FIRE); break;
      case "grab": p.poly([[4, 18], [3, 9], [5, 8], [6, 12], [6, 4], [8, 4], [8, 10], [9, 3], [11, 3], [11, 10], [12, 5], [14, 6], [13, 18]], "#e8d4c0"); p.disc(15, 4, 2.5, 2.5, GOLD); break;
      case "enchant": p.disc(10, 12, 5, 5.5, "#8fa3c9"); p.poly([[10, 1], [11, 4], [14, 5], [11, 6], [10, 9], [9, 6], [6, 5], [9, 4]], "#ffffff"); break;
      case "bloom": for (const [bx, by] of [[7, 12], [12, 11], [10, 7], [14, 15], [6, 16]]) p.disc(bx, by, 2.6, 2.6, "#c6bed4"); p.line(10, 3, 10, 7, "#8e9887"); p.line(10, 3, 13, 2, "#8e9887"); break;
      default: p.disc(10, 10, 6, 6, color);
    }
    p.halo();
  });
}
const PRAYER_KIND: Record<string, [string, string]> = {
  paper_shield: ["skin", "#c8c5be"], stone_shield: ["skin", "#a39e96"], mountain_shield: ["skin", "#8b8e92"],
  warm_heart: ["strength", ROSE], bright_heart: ["strength", "#cf8e8e"], burning_heart: ["strength", "#cf6e6e"],
  clear_ink: ["eye", "#c7d3dc"], sharp_ink: ["eye", "#afbccb"], perfect_ink: ["eye", "#8fa3c9"],
  quiet_mind: ["star", "#c6bed4"], deep_mind: ["star", "#b3a6d0"], friends_ward: ["protect", GOLD],
};
export function prayerArt(id: string): HTMLCanvasElement {
  const [kind, color] = PRAYER_KIND[id] ?? ["star", PAPER];
  return pixelArt(`prayer:${id}`, 18, 18, p => {
    if (kind === "skin") p.poly([[3, 3], [15, 3], [15, 9], [9, 16], [3, 9]], color);
    else if (kind === "strength") { p.poly([[4, 9], [9, 4], [14, 6], [14, 12], [9, 15], [5, 13]], color); p.line(7, 8, 11, 8, INK); }
    else if (kind === "eye") { p.disc(9, 9, 7, 4, "#ffffff"); p.disc(9, 9, 2.5, 2.5, color); p.set(9, 9, INK); }
    else if (kind === "protect") { p.poly([[3, 3], [15, 3], [15, 9], [9, 16], [3, 9]], color); p.line(5, 12, 13, 4, INK, 2); p.line(5, 4, 13, 12, INK, 2); }
    else p.poly([[9, 1], [11, 7], [17, 9], [11, 11], [9, 17], [7, 11], [1, 9], [7, 7]], color);
    p.halo();
  });
}
/** A canvas's data URL, cached (for <img> in React panels). */
const urls = new WeakMap<HTMLCanvasElement, string>();
export function artUrl(canvas: HTMLCanvasElement) { let url = urls.get(canvas); if (!url) urls.set(canvas, url = canvas.toDataURL()); return url; }
