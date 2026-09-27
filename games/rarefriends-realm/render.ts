/**
 * Canvas renderer: the Realm in greyscale ink with faded accent colours, on a 2.5D isometric grid.
 * Draws in a 960 × 640 logical view; the caller scales the canvas for the device.
 */
import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { ROCKS, item, levelForXp, type Icon } from "./data.ts";
import { NPCS } from "./content.ts";
import { TICK_MS, attackSpeed, type Facing, type Game, type Monster, type Npc, type Projectile } from "./state.ts";
import { npcOverhead, type Pick } from "./engine.ts";
import { REGIONS, T, W, H, cornerHeight, groundHeight, inBounds, objectAtTile, type Building, type World, type WorldObject } from "./world.ts";
import { itemArt } from "./icons.ts";
import { drawPixels } from "./pixel.ts";
import { decorArt, rockArt, treeArt } from "./scenery.ts";
import { drawCloudShadows, drawEffects, playerPose, puff, treeShake, updateEffects, type Pose } from "./effects.ts";
import { drawAuras, drawFigure, figureArt } from "./wardrobe.ts";
import { creatureSprite, friendSprite, type Mask } from "./sprites.ts";

/** The logical view size; the game sets it to match the frame (960 × 640 is the reference). */
export const VIEW = { width: 960, height: 640 };
export const INK = "#161616", PAPER = "#efede7";
export const TILE_W = 64, TILE_H = 32;
const C = {
  rose: "#d8b6b4", sage: "#b4c3ab", blue: "#afbccb", butter: "#e2d7ad", lavender: "#c6bed4", amber: "#e3c9a0", wood: "#9c8672",
  dark: "#3b3a38", mid: "#6d6b67", line: "#bdb9b0", light: "#f7f5f0",
};
const TERRAIN_COLORS: Record<number, string> = {
  [T.GRASS]: "#cdd3c3", [T.DARK_GRASS]: "#bcc4b1", [T.PATH]: "#dcd0b8", [T.COBBLE]: "#d7d4cd", [T.SAND]: "#e8dfc6", [T.WATER]: "#b1c0cf",
  [T.DEEP]: "#95a7bb", [T.SWAMP]: "#adb29c", [T.SNOW]: "#f3f2ee", [T.STONE]: "#c8c5be", [T.WOOD]: "#cdb9a0", [T.GRAVEL]: "#bfb8ad",
  [T.DUNGEON]: "#5d5c63", [T.BRIDGE]: "#ab9278", [T.CLIFF]: "#8f8a83", [T.WALL]: "#a9a59e", [T.FARMLAND]: "#bca787", [T.ICE]: "#dfe7ec", [T.CARPET]: "#c9a3a3",
};
/** Terrain classes for inked edges: a line is drawn where the class changes. */
const EDGE_CLASS: Record<number, number> = {
  [T.GRASS]: 1, [T.DARK_GRASS]: 1, [T.PATH]: 2, [T.COBBLE]: 3, [T.SAND]: 4, [T.WATER]: 5, [T.DEEP]: 5, [T.SWAMP]: 6, [T.SNOW]: 7,
  [T.STONE]: 8, [T.WOOD]: 9, [T.GRAVEL]: 10, [T.DUNGEON]: 11, [T.BRIDGE]: 12, [T.CLIFF]: 13, [T.WALL]: 14, [T.FARMLAND]: 15, [T.ICE]: 16, [T.CARPET]: 17,
};

/** The camera: a point in tiles, zoom, rotation (radians, 0 = the classic view) and pitch (screen squash, 0.5 = classic). */
export type Camera = { x: number; y: number; zoom: number; angle: number; pitch: number; base?: number };
export const PITCH = { min: 0.36, max: 0.74, classic: 0.5 } as const;
export type ClickMarker = { x: number; y: number; at: number; red: boolean };
export type Firework = { at: number; color: string };
export type Scene = {
  game: Game; now: number; tickAt: number; camera: Camera; friend: GenerationSprites | null; follower: GenerationSprites | null;
  canonical: ReadonlyMap<number, GenerationSprites>; hoverTile: { x: number; y: number } | null; marker: ClickMarker | null;
  reducedMotion: boolean; hits: HitSplat[]; fireworks: Firework[]; chat: { text: string; until: number } | null; projectiles: readonly Projectile[];
  /** Plays a sound effect (swing impacts are timed by the animation). */
  sfx?: (name: string, gain?: number) => void;
};
export type HitSplat = { on: "player" | "monster"; uid?: number; damage: number; at: number };
type Hit = { x: number; y: number; w: number; h: number; pick: Pick };

// ---------- Projection ----------
/** Rotate a world offset by the camera angle. */
function rotate(camera: Camera, dx: number, dy: number) {
  const c = Math.cos(camera.angle), s = Math.sin(camera.angle);
  return { rx: dx * c - dy * s, ry: dx * s + dy * c };
}
/** Heights shrink as the camera looks more from above. */
const liftScale = (camera: Camera) => Math.sqrt(1 - camera.pitch * camera.pitch) / Math.sqrt(0.75);
/** The ground under the scene (set each frame), so everything stands on the hills. */
let ground: World | null = null;
export function setGround(world: World | null) { ground = world; }
const groundAt = (x: number, y: number) => ground ? groundHeight(ground, x, y) : 0;
/** World point → screen, standing on the ground (`lift` is extra height above it). */
export function toScreen(camera: Camera, x: number, y: number, lift = 0) {
  const { rx, ry } = rotate(camera, x - camera.x, y - camera.y), half = TILE_W / 2, height = lift + groundAt(x, y) - (camera.base ?? 0);
  return { x: (rx - ry) * half * camera.zoom + VIEW.width / 2, y: ((rx + ry) * half * camera.pitch - height * liftScale(camera)) * camera.zoom + VIEW.height / 2 };
}
/** Screen → the tile under it, allowing for hills (a few refinement steps). */
export function toTile(camera: Camera, sx: number, sy: number) {
  const half = TILE_W / 2, c = Math.cos(-camera.angle), s = Math.sin(-camera.angle);
  let x = camera.x, y = camera.y;
  for (let step = 0; step < 4; step++) {
    const height = step ? groundAt(x, y) - (camera.base ?? 0) : 0;
    const a = (sx - VIEW.width / 2) / (camera.zoom * half), b = (sy - VIEW.height / 2 + height * liftScale(camera) * camera.zoom) / (camera.zoom * half * camera.pitch);
    const rx = (a + b) / 2, ry = (b - a) / 2;
    x = camera.x + rx * c - ry * s; y = camera.y + rx * s + ry * c;
  }
  return { x: Math.round(x), y: Math.round(y) };
}
/** Draw order: further from the camera first. */
export function depthOf(camera: Camera, x: number, y: number) { const { rx, ry } = rotate(camera, x, y); return rx + ry; }
/** The screen facing of a world heading, for sprites. */
export function screenFacing(camera: Camera, heading: { x: number; y: number }): Facing {
  const { rx, ry } = rotate(camera, heading.x, heading.y), sx = rx - ry, sy = rx + ry;
  return Math.abs(sx) >= Math.abs(sy) ? (sx > 0 ? "right" : "left") : (sy > 0 ? "down" : "up");
}
/** Screen angle of world north (for the compass). */
export function northAngle(camera: Camera) { const { rx, ry } = rotate(camera, 0, -1); return Math.atan2((rx + ry) * camera.pitch, rx - ry); }
const hash = (x: number, y: number) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1103515245) >>> 0) % 10000) / 10000; };

// ---------- Sprites ----------
const maskCache = new Map<string, HTMLCanvasElement>();
/** One-bit mask with a one-pixel white halo, at 1 canvas pixel per sprite pixel (scaled up without smoothing). */
function maskCanvas(rows: Mask, ink: string, mirror = false): HTMLCanvasElement {
  const key = `${ink}|${mirror ? 1 : 0}|${rows.join("")}`;
  let canvas = maskCache.get(key);
  if (canvas) return canvas;
  const height = rows.length, width = rows[0]?.length ?? 16;
  canvas = document.createElement("canvas"); canvas.width = width + 2; canvas.height = height + 2;
  const ctx = canvas.getContext("2d")!;
  const on = (x: number, y: number) => y >= 0 && y < height && x >= 0 && x < width && rows[y][mirror ? width - 1 - x : x] === "#";
  ctx.fillStyle = "#fff";
  for (let y = -1; y <= height; y++) for (let x = -1; x <= width; x++) {
    if (on(x, y)) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (on(x + dx, y + dy)) { ctx.fillRect(x + 1, y + 1, 1, 1); dx = 2; dy = 2; }
  }
  ctx.fillStyle = ink;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (on(x, y)) ctx.fillRect(x + 1, y + 1, 1, 1);
  if (maskCache.size > 800) maskCache.delete(maskCache.keys().next().value!);
  maskCache.set(key, canvas);
  return canvas;
}
export function friendRows(sprites: GenerationSprites, facing: Facing, walking: boolean, frame: number): Mask {
  const vertical = sprites.familyId === 6 && (facing === "up" || facing === "down");
  return sprites.clips[walking ? "walk" : "idle"][vertical ? "right" : facing][frame % 8].rows;
}
/** Draw a mask so its feet sit on (x, y). `px` is screen pixels per sprite pixel. */
function drawMask(ctx: CanvasRenderingContext2D, rows: Mask, x: number, y: number, px: number, ink = INK, mirror = false, alpha = 1) {
  const canvas = maskCanvas(rows, ink, mirror), w = canvas.width * px, h = canvas.height * px;
  ctx.globalAlpha = alpha;
  ctx.drawImage(canvas, Math.round(x - w / 2), Math.round(y - h + px), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
  return { x: x - w / 2, y: y - h + px, w, h };
}
const FACES_LEFT = new Set([101, 102, 108]);

// ---------- Primitives ----------
function poly(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], fill: string | null, stroke: string | null = INK, width = 1) {
  ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string | null, stroke: string | null = INK, width = 1) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16), f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
/** An isometric box on a tile footprint (w, d in tiles) and height h (world px). */
function box(ctx: CanvasRenderingContext2D, camera: Camera, x: number, y: number, w: number, d: number, h: number, top: string, left: string, right: string, lift = 0, stroke: string | null = INK, pattern: "brick" | "plank" | "window" | null = null) {
  const p = (px: number, py: number, z: number) => { const s = toScreen(camera, px, py, z); return [s.x, s.y] as const; };
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y - d / 2, y1 = y + d / 2;
  // The four sides with their outward normals; draw the ones facing the camera, shaded by which way they face on screen.
  const sides: [number, number, number, number, number, number][] = [[x0, y1, x1, y1, 0, 1], [x1, y1, x1, y0, 1, 0], [x1, y0, x0, y0, 0, -1], [x0, y0, x0, y1, -1, 0]];
  for (const [ax, ay, bx, by, nx, ny] of sides) {
    const { rx, ry } = rotate(camera, nx, ny);
    if (rx + ry <= 0.001) continue;
    poly(ctx, [p(ax, ay, lift), p(bx, by, lift), p(bx, by, lift + h), p(ax, ay, lift + h)], rx - ry < 0 ? left : right, stroke);
    if (pattern) {
      // Courses of brick (staggered joints) or planks along the face.
      ctx.strokeStyle = "rgba(22,22,22,0.28)"; ctx.lineWidth = 1; ctx.beginPath();
      const rows = pattern === "plank" ? Math.max(2, Math.round(h / 5)) : Math.max(2, Math.round(h / 7));
      for (let r = 1; r < rows; r++) { const z0 = lift + h * r / rows, a0 = p(ax, ay, z0), b0 = p(bx, by, z0); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]); }
      if (pattern !== "plank") for (let r = 0; r < rows; r++) for (const t of r % 2 ? [0.25, 0.75] : [0.5]) {
        const mx = ax + (bx - ax) * t, my = ay + (by - ay) * t, a0 = p(mx, my, lift + h * r / rows), b0 = p(mx, my, lift + h * (r + 1) / rows); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]);
      }
      ctx.stroke();
      if (pattern === "window" && h > 30) {
        // A small leaded window in the middle of the face.
        const q = (t: number, z0: number) => p(ax + (bx - ax) * t, ay + (by - ay) * t, lift + z0);
        poly(ctx, [q(0.3, 13), q(0.7, 13), q(0.7, 29), q(0.3, 29)], "#3b3a38", INK, 1.2);
        poly(ctx, [q(0.34, 15), q(0.66, 15), q(0.66, 27), q(0.34, 27)], "#5d6f84", null);
        const m0 = q(0.5, 15), m1 = q(0.5, 27), h0 = q(0.34, 21), h1 = q(0.66, 21);
        ctx.strokeStyle = PAPER; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]); ctx.stroke();
      }
    }
  }
  poly(ctx, [p(x0, y0, lift + h), p(x1, y0, lift + h), p(x1, y1, lift + h), p(x0, y1, lift + h)], top, stroke);
}

// ---------- Terrain ----------
const CONTOUR = 10;
const isWaterTerrain = (terrain: number) => terrain === T.WATER || terrain === T.DEEP;
function drawTerrain(ctx: CanvasRenderingContext2D, scene: Scene, x0: number, y0: number, x1: number, y1: number) {
  const { camera, game, now } = scene, world = game.world, z = camera.zoom, hw = TILE_W / 2 * z, hh = hw * camera.pitch;
  const t = scene.reducedMotion ? 0 : now / 1000;
  // Screen offsets of half a tile along world x and y: tile corners are centre ± ex ± ey at any camera angle.
  const flat = (dx: number, dy: number) => { const { rx, ry } = rotate(camera, dx, dy); return { x: (rx - ry) * TILE_W / 2 * z, y: (rx + ry) * TILE_W / 2 * camera.pitch * z }; };
  const o = { x: 0, y: 0 }, px = flat(0.5, 0), py = flat(0, 0.5);
  const ex = { x: px.x - o.x, y: px.y - o.y }, ey = { x: py.x - o.x, y: py.y - o.y }, ls = liftScale(camera);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inBounds(x, y)) continue;
    const terrain = world.tiles[y * W + x];
    if (terrain === T.VOID) continue;
    const { x: sx, y: sy } = toScreen(camera, x, y);
    if (sx < -hw * 2 || sx > VIEW.width + hw * 2 || sy < -hh * 2 || sy > VIEW.height + hh * 4) continue;
    // Corner heights lift each corner off the tile centre; slopes facing the north-west light are brighter.
    const hA = cornerHeight(world, x, y), hB = cornerHeight(world, x + 1, y), hC = cornerHeight(world, x + 1, y + 1), hD = cornerHeight(world, x, y + 1), hMid = (hA + hB + hC + hD) / 4;
    const slope = Math.max(-0.22, Math.min(0.22, ((hA + hD) - (hB + hC) + (hA + hB) - (hD + hC)) * 0.011));
    const variation = (hash(x, y) - 0.5) * 0.035 + slope, lifted = ls * z;
    const ax = sx - ex.x - ey.x, ay = sy - ex.y - ey.y - (hA - hMid) * lifted, bx = sx + ex.x - ey.x, by = sy + ex.y - ey.y - (hB - hMid) * lifted;
    const cx = sx + ex.x + ey.x, cy = sy + ex.y + ey.y - (hC - hMid) * lifted, dx = sx - ex.x + ey.x, dy = sy - ex.y + ey.y - (hD - hMid) * lifted;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy); ctx.closePath();
    ctx.fillStyle = shade(TERRAIN_COLORS[terrain] ?? "#cccccc", variation); ctx.fill();
    // Texture details.
    const h = hash(y, x);
    ctx.strokeStyle = "rgba(22,22,22,0.22)"; ctx.fillStyle = "rgba(22,22,22,0.18)"; ctx.lineWidth = Math.max(0.6, z * 0.8);
    switch (terrain) {
      case T.GRASS: case T.DARK_GRASS:
        if (h < (terrain === T.DARK_GRASS ? 0.55 : 0.3)) {
          const ox = (h - 0.25) * hw * 1.4, oy = (hash(x + 3, y) - 0.5) * hh;
          ctx.beginPath(); ctx.moveTo(sx + ox - 2 * z, sy + oy); ctx.lineTo(sx + ox - 1 * z, sy + oy - 4 * z); ctx.moveTo(sx + ox + 1 * z, sy + oy); ctx.lineTo(sx + ox + 2 * z, sy + oy - 5 * z); ctx.stroke();
        }
        break;
      case T.PATH: case T.SAND: case T.GRAVEL: case T.SNOW:
        if (h < 0.6) { ctx.fillRect(sx + (h - 0.3) * hw, sy + (hash(x, y + 5) - 0.5) * hh, 1.5 * z, 1.5 * z); ctx.fillRect(sx - (h - 0.2) * hw * 0.8, sy - (hash(x + 9, y) - 0.5) * hh * 0.8, 1.2 * z, 1.2 * z); }
        break;
      case T.COBBLE: case T.STONE:
        ctx.beginPath(); ctx.moveTo(sx - hw / 2, sy - hh / 2); ctx.lineTo(sx + hw / 2, sy + hh / 2); ctx.moveTo(sx + hw / 2, sy - hh / 2); ctx.lineTo(sx - hw / 2, sy + hh / 2); ctx.stroke();
        break;
      case T.WOOD: case T.BRIDGE:
        ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(sx - hw / 2 + i * hw / 3, sy - hh / 2 - i * hh / 3 + hh / 6); ctx.lineTo(sx + hw / 2 + i * hw / 3, sy + hh / 2 - i * hh / 3 - hh / 6); } ctx.stroke();
        break;
      case T.FARMLAND:
        ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(sx - hw * 0.6 + i * hw * 0.35, sy + i * hh * 0.35 - hh * 0.3); ctx.lineTo(sx + hw * 0.1 + i * hw * 0.35, sy + i * hh * 0.35 + hh * 0.3); } ctx.stroke();
        break;
      case T.WATER: case T.DEEP: {
        ctx.strokeStyle = terrain === T.DEEP ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.45)";
        const phase = Math.sin(t * 1.6 + x * 0.9 + y * 0.6) * 3 * z;
        if (h < 0.5) { ctx.beginPath(); ctx.moveTo(sx - 8 * z + phase, sy - 2 * z); ctx.quadraticCurveTo(sx + phase, sy - 5 * z, sx + 8 * z + phase, sy - 2 * z); ctx.stroke(); }
        break;
      }
      case T.SWAMP: if (h < 0.35) ellipse(ctx, sx + (h - 0.2) * hw, sy, 5 * z, 2.5 * z, "rgba(60,70,50,0.18)", null); break;
      case T.DUNGEON: if (h < 0.25) { ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.moveTo(sx - 6 * z, sy); ctx.lineTo(sx, sy + 2 * z); ctx.lineTo(sx + 4 * z, sy - 1 * z); ctx.stroke(); } break;
      case T.CARPET: ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(sx, sy - hh * 0.6); ctx.lineTo(sx + hw * 0.6, sy); ctx.lineTo(sx, sy + hh * 0.6); ctx.lineTo(sx - hw * 0.6, sy); ctx.closePath(); ctx.stroke(); break;
    }
    // Inked edges where the terrain class changes.
    const mine = EDGE_CLASS[terrain];
    ctx.strokeStyle = "rgba(22,22,22,0.55)"; ctx.lineWidth = Math.max(0.8, z);
    const edge = (nx: number, ny: number, ax: number, ay: number, bx: number, by: number) => {
      const other = inBounds(nx, ny) ? world.tiles[ny * W + nx] : T.VOID;
      if (other === T.VOID || EDGE_CLASS[other] === mine || other === T.WALL || other === T.CLIFF) return;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    };
    edge(x, y - 1, ax, ay, bx, by);
    edge(x + 1, y, bx, by, cx, cy);
    edge(x, y + 1, cx, cy, dx, dy);
    edge(x - 1, y, dx, dy, ax, ay);
    // Contour lines every CONTOUR pixels of height (marching squares on the tile), like a topographic map.
    if (!isWaterTerrain(terrain)) {
      const levels = [hA, hB, hC, hD].map(h => Math.floor(h / CONTOUR)), lo = Math.min(...levels), hi = Math.max(...levels);
      if (hi > lo) {
        const pts: [number, number][] = [[ax, ay], [bx, by], [cx, cy], [dx, dy]], hs = [hA, hB, hC, hD];
        ctx.strokeStyle = "rgba(22,22,22,0.16)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let level = lo + 1; level <= hi; level++) {
          const at = level * CONTOUR, cross: [number, number][] = [];
          for (let e = 0; e < 4; e++) {
            const h0 = hs[e], h1 = hs[(e + 1) % 4];
            if ((h0 < at) !== (h1 < at)) { const t = (at - h0) / (h1 - h0), [x0, y0] = pts[e], [x1, y1] = pts[(e + 1) % 4]; cross.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); }
          }
          for (let k = 0; k + 1 < cross.length; k += 2) { ctx.moveTo(cross[k][0], cross[k][1]); ctx.lineTo(cross[k + 1][0], cross[k + 1][1]); }
        }
        ctx.stroke();
      }
    }
  }
}

// ---------- Objects ----------
/** Pixel art scale: two world pixels per art pixel. */
const ART = 2;
function drawTree(ctx: CanvasRenderingContext2D, camera: Camera, object: WorldObject, depleted: boolean, alpha: number, shake: number) {
  const z = camera.zoom, { x: sx, y: sy } = toScreen(camera, object.x, object.y), variant = Math.floor(hash(object.x, object.y) * 4);
  ellipse(ctx, sx, sy + 1 * z, (depleted ? 9 : 17) * z, (depleted ? 4 : 7) * z, "rgba(22,22,22,0.14)", null);
  return drawPixels(ctx, treeArt(object.tree!, variant, depleted), sx + shake * z, sy + 3 * z, ART * z, alpha);
}
function drawRock(ctx: CanvasRenderingContext2D, camera: Camera, object: WorldObject, depleted: boolean) {
  const z = camera.zoom, { x: sx, y: sy } = toScreen(camera, object.x, object.y), rock = ROCKS[object.rock!];
  ellipse(ctx, sx, sy + 2 * z, 18 * z, 6 * z, "rgba(22,22,22,0.14)", null);
  return drawPixels(ctx, rockArt(rock.color, Math.floor(hash(object.x, object.y) * 3), depleted), sx, sy + 5 * z, ART * z);
}
function drawSpot(ctx: CanvasRenderingContext2D, camera: Camera, object: WorldObject, now: number, reduced: boolean) {
  const z = camera.zoom, { x: sx, y: sy } = toScreen(camera, object.x, object.y), t = reduced ? 0.5 : (now / 1400 + hash(object.x, object.y)) % 1;
  ellipse(ctx, sx, sy, 20 * z, 9 * z, object.spot === "deep" ? "rgba(40,60,90,0.35)" : "rgba(60,90,120,0.22)", null);
  for (const phase of [t, (t + 0.33) % 1, (t + 0.66) % 1]) {
    ctx.globalAlpha = 1 - phase; ctx.beginPath(); ctx.ellipse(sx, sy, (4 + phase * 18) * z, (2 + phase * 9) * z, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(22,22,22,0.35)"; ctx.lineWidth = 2.6 * z; ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.4 * z; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!reduced && Math.sin(now / 500 + object.x * 7) > 0.75) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.arc(sx + 4 * z, sy + 2 * z, 6 * z, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  if (!reduced) for (let i = 0; i < 3; i++) { const b = (now / 600 + i / 3) % 1; ellipse(ctx, sx + (i - 1) * 5 * z, sy - b * 10 * z, 1.5 * z, 1.5 * z, "rgba(255,255,255,0.8)", null); }
  return { x: sx - 18 * z, y: sy - 12 * z, w: 36 * z, h: 22 * z };
}
function drawStation(ctx: CanvasRenderingContext2D, scene: Scene, object: WorldObject): { x: number; y: number; w: number; h: number } {
  const { camera, now, game } = scene, z = camera.zoom, { x: sx, y: sy } = toScreen(camera, object.x, object.y), ox = object.x, oy = object.y;
  const flicker = scene.reducedMotion ? 0.5 : (Math.sin(now / 90 + ox) + 1) / 2;
  const hit = (h: number, w = 40) => ({ x: sx - w / 2 * z, y: sy - h * z, w: w * z, h: (h + 12) * z });
  switch (object.kind) {
    case "range": box(ctx, camera, ox, oy, 0.8, 0.7, 20, "#57555a", "#6d6b67", "#5a5856"); ellipse(ctx, sx, sy - 22 * z, 6 * z, 3 * z, `rgba(227,165,140,${0.6 + flicker * 0.4})`, INK); return hit(30);
    case "furnace": box(ctx, camera, ox, oy, 0.9, 0.9, 34, "#8f8a83", "#a39e96", "#8a857e");
      poly(ctx, [[sx - 8 * z, sy - 4 * z], [sx - 8 * z, sy - 16 * z], [sx, sy - 12 * z], [sx, sy]], `rgba(227,150,110,${0.7 + flicker * 0.3})`); return hit(44);
    case "anvil": box(ctx, camera, ox, oy, 0.3, 0.3, 12, "#6d6b67", "#57555a", "#4a4846"); box(ctx, camera, ox, oy, 0.7, 0.35, 6, "#8b8e92", "#6d6b67", "#5a5856", 12); return hit(24);
    case "bank": box(ctx, camera, ox, oy, 0.9, 0.6, 18, "#e2d7ad", "#b89c86", "#a88f74"); box(ctx, camera, ox, oy, 0.9, 0.1, 14, C.rose, shade(C.rose, -0.1), shade(C.rose, -0.15), 18); return hit(36);
    case "altar": box(ctx, camera, ox, oy, 0.9, 0.6, 16, PAPER, "#d6d3cc", "#c8c5be"); box(ctx, camera, ox, oy, 0.4, 0.62, 2, C.rose, C.rose, shade(C.rose, -0.1), 16);
      ellipse(ctx, sx, sy - 26 * z, 3 * z, 3 * z, `rgba(226,215,173,${0.5 + flicker * 0.5})`, null); return hit(30);
    case "ladder": {
      const down = object.action?.includes("down");
      if (down) { ellipse(ctx, sx, sy, 20 * z, 10 * z, "#161616", INK); ctx.strokeStyle = "#9c8672"; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(sx - 5 * z, sy + 2 * z); ctx.lineTo(sx - 5 * z, sy - 14 * z); ctx.moveTo(sx + 5 * z, sy + 2 * z); ctx.lineTo(sx + 5 * z, sy - 14 * z); for (let i = 0; i < 4; i++) { ctx.moveTo(sx - 5 * z, sy - i * 4 * z); ctx.lineTo(sx + 5 * z, sy - i * 4 * z); } ctx.stroke(); return hit(20, 44); }
      ctx.strokeStyle = "#8a7563"; ctx.lineWidth = 2.5 * z; ctx.beginPath(); ctx.moveTo(sx - 7 * z, sy); ctx.lineTo(sx - 5 * z, sy - 50 * z); ctx.moveTo(sx + 7 * z, sy); ctx.lineTo(sx + 5 * z, sy - 50 * z);
      for (let i = 1; i < 7; i++) { ctx.moveTo(sx - 7 * z, sy - i * 7 * z); ctx.lineTo(sx + 7 * z, sy - i * 7 * z); } ctx.stroke(); return hit(54, 24);
    }
    case "stall": {
      const color = { bakery: C.amber, silk: C.lavender, gem: C.blue, fish: C.sage }[object.stall!] ?? C.rose, empty = game.depleted.has(object.id);
      box(ctx, camera, ox, oy, 0.9, 0.7, 14, "#cdb9a0", "#9c8672", "#8a7563");
      if (!empty) for (let i = 0; i < 3; i++) ellipse(ctx, sx + (i - 1) * 8 * z, sy - 16 * z, 3.5 * z, 2.5 * z, shade(color, -0.1), INK, 0.8);
      for (const px of [-14, 14]) { ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.moveTo(sx + px * z, sy - 14 * z); ctx.lineTo(sx + px * z, sy - 38 * z); ctx.stroke(); }
      poly(ctx, [[sx - 22 * z, sy - 36 * z], [sx, sy - 48 * z], [sx + 22 * z, sy - 36 * z], [sx, sy - 26 * z]], color);
      for (let i = -1; i <= 1; i += 2) poly(ctx, [[sx + i * 4 * z, sy - 44 * z], [sx + i * 14 * z, sy - 38 * z], [sx + i * 10 * z, sy - 33 * z]], PAPER, null);
      return hit(50, 48);
    }
    case "obstacle": {
      const to = object.to!, a = toScreen(camera, ox, oy), b = toScreen(camera, to.x - Math.sign(to.x - ox) * 0.5, to.y - Math.sign(to.y - oy) * 0.5);
      if (object.name === "Log balance" || object.name === "Balance beam") {
        ctx.strokeStyle = INK; ctx.lineWidth = (object.name === "Log balance" ? 9 : 5) * z; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(a.x, a.y - 3 * z); ctx.lineTo(b.x, b.y - 3 * z); ctx.stroke();
        ctx.strokeStyle = object.name === "Log balance" ? "#9c8672" : "#c8c5be"; ctx.lineWidth = (object.name === "Log balance" ? 7 : 3) * z; ctx.stroke(); ctx.lineCap = "butt";
      } else if (object.name === "Obstacle net") {
        box(ctx, camera, ox + 1, oy, 0.1, 1, 34, "#9c8672", "#8a7563", "#8a7563");
        ctx.strokeStyle = "rgba(22,22,22,0.6)"; ctx.lineWidth = 1; const n = toScreen(camera, ox + 1, oy);
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(n.x - 14 * z, n.y - i * 7 * z - 4 * z); ctx.lineTo(n.x + 14 * z, n.y - i * 7 * z + 4 * z); ctx.stroke(); }
      } else if (object.name === "Rope swing") {
        box(ctx, camera, ox, oy, 0.2, 0.2, 60, "#9c8672", "#8a7563", "#7a6553");
        const top = toScreen(camera, ox + 1.5, oy, 60), swing = Math.sin(now / 500) * 10 * z;
        ctx.strokeStyle = "#8a7563"; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(top.x + swing, top.y + 44 * z); ctx.stroke();
      } else if (object.name === "Low wall") box(ctx, camera, ox + 1, oy, 0.4, 1, 14, "#c8c5be", "#a9a59e", "#9a968f");
      else if (object.name === "Stepping stone") ellipse(ctx, sx, sy, 16 * z, 8 * z, "#a39e96", INK);
      if (object.name !== "Stepping stone") box(ctx, camera, ox, oy, 0.5, 0.5, 3, "#c8c5be", "#a9a59e", "#9a968f");
      return hit(36, 48);
    }
    case "fountain": {
      const master = objectAtTile(game.world, ox - 1, oy)?.kind !== "fountain" && objectAtTile(game.world, ox, oy - 1)?.kind !== "fountain";
      if (!master) return hit(0, 0);
      const c = toScreen(camera, ox + 0.5, oy + 0.5);
      box(ctx, camera, ox + 0.5, oy + 0.5, 1.8, 1.8, 10, "#b1c0cf", "#c8c5be", "#b9b5ae");
      box(ctx, camera, ox + 0.5, oy + 0.5, 0.4, 0.4, 26, "#d7d4cd", "#c8c5be", "#b9b5ae", 10);
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5 * z;
      for (let i = 0; i < 6; i++) { const a2 = i / 6 * Math.PI * 2 + now / 800; ctx.beginPath(); ctx.moveTo(c.x, c.y - 36 * z); ctx.quadraticCurveTo(c.x + Math.cos(a2) * 16 * z, c.y - 46 * z, c.x + Math.cos(a2) * 22 * z, c.y - 10 * z + Math.sin(a2) * 6 * z); ctx.stroke(); }
      return { x: c.x - 50 * z, y: c.y - 50 * z, w: 100 * z, h: 70 * z };
    }
    case "mill": box(ctx, camera, ox, oy, 0.7, 0.7, 12, "#cdb9a0", "#9c8672", "#8a7563"); poly(ctx, [[sx - 12 * z, sy - 30 * z], [sx + 12 * z, sy - 30 * z], [sx + 4 * z, sy - 14 * z], [sx - 4 * z, sy - 14 * z]], "#b89c86"); return hit(34);
    case "dairy_cow": {
      const cow = creatureSprite(101), frame = Math.floor(now / 1200 + ox) % 2 ? cow.step : cow.idle;
      drawMask(ctx, frame, sx, sy + 2 * z, 3 * z, INK, false); ellipse(ctx, sx - 12 * z, sy - 18 * z, 2.5 * z, 2.5 * z, C.butter);
      return { x: sx - 26 * z, y: sy - 40 * z, w: 52 * z, h: 44 * z };
    }
    case "wheat": {
      if (game.depleted.has(object.id)) { ctx.strokeStyle = "#8a7563"; ctx.lineWidth = 1; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(sx + i * 5 * z, sy); ctx.lineTo(sx + i * 5 * z, sy - 4 * z); ctx.stroke(); } return hit(8); }
      for (let i = -2; i <= 2; i++) { const sway = Math.sin(now / 700 + i + ox) * 2 * z; ctx.strokeStyle = "#b89c6a"; ctx.lineWidth = 1.2 * z; ctx.beginPath(); ctx.moveTo(sx + i * 4 * z, sy + (i % 2) * 2 * z); ctx.lineTo(sx + i * 4 * z + sway, sy - 18 * z); ctx.stroke(); ellipse(ctx, sx + i * 4 * z + sway, sy - 20 * z, 1.8 * z, 4 * z, C.butter, INK, 0.6); }
      return hit(26, 26);
    }
    case "coop": box(ctx, camera, ox, oy, 0.8, 0.8, 16, "#cdb9a0", "#b89c86", "#a88f74"); poly(ctx, [[sx - 26 * z, sy - 16 * z], [sx, sy - 34 * z], [sx + 26 * z, sy - 16 * z], [sx, sy - 4 * z]], C.rose); return hit(36);
    case "gate": {
      box(ctx, camera, ox, oy, 0.25, 1, 50, "#3b3a38", "#2c2b2a", "#222");
      ctx.fillStyle = `rgba(20,20,30,${0.4 + flicker * 0.25})`; const g = toScreen(camera, ox, oy); ctx.fillRect(g.x - 4 * z, g.y - 50 * z, 8 * z, 50 * z);
      return hit(56, 36);
    }
    case "casket": box(ctx, camera, ox, oy, 0.8, 0.5, 14, C.rose, shade(C.rose, -0.08), shade(C.rose, -0.14)); box(ctx, camera, ox, oy, 0.8, 0.5, 6, C.butter, shade(C.butter, -0.1), shade(C.butter, -0.15), 14);
      ellipse(ctx, sx, sy - 30 * z - flicker * 3 * z, 2.5 * z, 2.5 * z, "#fff", null); return hit(30);
    case "sign": ctx.strokeStyle = INK; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 28 * z); ctx.stroke();
      poly(ctx, [[sx - 14 * z, sy - 30 * z], [sx + 14 * z, sy - 26 * z], [sx + 14 * z, sy - 16 * z], [sx - 14 * z, sy - 20 * z]], "#e2d7ad"); return hit(34, 30);
    case "tanning": ctx.strokeStyle = "#8a7563"; ctx.lineWidth = 2 * z; ctx.strokeRect(sx - 12 * z, sy - 30 * z, 24 * z, 26 * z); poly(ctx, [[sx - 9 * z, sy - 27 * z], [sx + 9 * z, sy - 27 * z], [sx + 7 * z, sy - 8 * z], [sx - 7 * z, sy - 8 * z]], "#e8d9c8"); return hit(32, 30);
    case "well": box(ctx, camera, ox, oy, 0.9, 0.9, 12, "#3b3a38", "#c8c5be", "#b9b5ae");
      for (const px of [-12, 12]) { ctx.strokeStyle = "#8a7563"; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(sx + px * z, sy - 12 * z); ctx.lineTo(sx + px * z, sy - 36 * z); ctx.stroke(); }
      poly(ctx, [[sx - 18 * z, sy - 34 * z], [sx, sy - 46 * z], [sx + 18 * z, sy - 34 * z], [sx, sy - 26 * z]], "#9c8672"); return hit(48);
    default: return hit(20);
  }
}
function drawDecor(ctx: CanvasRenderingContext2D, scene: Scene, object: WorldObject, alpha: number) {
  const { camera, now } = scene, z = camera.zoom, { x: sx, y: sy } = toScreen(camera, object.x, object.y), ox = object.x, oy = object.y, h = hash(ox, oy);
  const hit = (height: number, w = 36) => ({ x: sx - w / 2 * z, y: sy - height * z, w: w * z, h: (height + 10) * z });
  const frame = object.decor === "torch" ? Math.floor(now / 160 + ox) % 2 : object.decor === "reeds" ? Math.floor(now / 900 + ox) % 2 : 0;
  const art = scene.reducedMotion || object.decor !== "torch" ? decorArt(object.decor!, Math.floor(h * 3), frame) : decorArt("torch", 0, frame);
  if (art) {
    if (object.decor === "torch" || object.decor === "lamp") ellipse(ctx, sx, sy - (object.decor === "lamp" ? 54 : 36) * z, 16 * z, 11 * z, `rgba(242,220,160,${0.16 + Math.sin(now / 300 + ox) * 0.04})`, null);
    else ellipse(ctx, sx, sy + 1 * z, art.width * z * 0.8, 4 * z, "rgba(22,22,22,0.12)", null);
    return drawPixels(ctx, art, sx, sy + 2 * z, ART * z, alpha);
  }
  ctx.globalAlpha = alpha;
  try {
    switch (object.decor) {
      case "flowers": for (let i = 0; i < 4; i++) { const fx = sx + (hash(ox + i, oy) - 0.5) * 30 * z, fy = sy + (hash(ox, oy + i) - 0.5) * 12 * z; ctx.strokeStyle = "#8e9887"; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 5 * z); ctx.stroke(); ellipse(ctx, fx, fy - 6 * z, 2.2 * z, 2.2 * z, [C.rose, C.butter, C.lavender, PAPER][(i + Math.floor(h * 4)) % 4], INK, 0.6); } return hit(10);
      case "bush": ellipse(ctx, sx, sy - 7 * z, 13 * z, 9 * z, "#aab69f"); ellipse(ctx, sx + 5 * z, sy - 11 * z, 7 * z, 5 * z, "#b9c5ae"); return hit(18);
      case "boulder": poly(ctx, [[sx - 12 * z, sy + 2 * z], [sx - 9 * z, sy - 10 * z], [sx + 3 * z, sy - 14 * z], [sx + 12 * z, sy - 4 * z], [sx + 8 * z, sy + 4 * z]], "#b3aea6"); return hit(16);
      case "lamp": ctx.strokeStyle = INK; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 42 * z); ctx.stroke(); box(ctx, camera, ox, oy, 0.2, 0.2, 10, "#e2d7ad", "#f4ecc8", "#e8dcae", 40);
        ellipse(ctx, sx, sy - 46 * z, 14 * z, 10 * z, `rgba(242,230,180,${0.18 + Math.sin(now / 400 + ox) * 0.05})`, null); return hit(54, 20);
      case "bench": box(ctx, camera, ox, oy, 0.9, 0.35, 8, "#b89c86", "#9c8672", "#8a7563"); return hit(14);
      case "crate": box(ctx, camera, ox, oy, 0.55, 0.55, 18, "#cdb9a0", "#b89c86", "#a88f74"); return hit(26);
      case "barrel": ellipse(ctx, sx, sy - 18 * z, 9 * z, 4 * z, "#b89c86"); ctx.fillStyle = "#a88f74"; ctx.fillRect(sx - 9 * z, sy - 18 * z, 18 * z, 18 * z); ctx.strokeStyle = INK; ctx.strokeRect(sx - 9 * z, sy - 18 * z, 18 * z, 18 * z); ellipse(ctx, sx, sy - 18 * z, 9 * z, 4 * z, "#b89c86"); return hit(26, 22);
      case "tent": poly(ctx, [[sx - 30 * z, sy + 4 * z], [sx, sy - 34 * z], [sx + 30 * z, sy + 4 * z], [sx, sy + 12 * z]], "#bfb49c"); poly(ctx, [[sx - 5 * z, sy + 10 * z], [sx, sy - 10 * z], [sx + 5 * z, sy + 10 * z]], "#3b3a38"); return hit(38, 60);
      case "cactus": ctx.fillStyle = "#a9b59c"; ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.fillRect(sx - 4 * z, sy - 30 * z, 8 * z, 30 * z); ctx.strokeRect(sx - 4 * z, sy - 30 * z, 8 * z, 30 * z); ctx.fillRect(sx + 4 * z, sy - 20 * z, 7 * z, 4 * z); ctx.fillRect(sx + 8 * z, sy - 28 * z, 4 * z, 10 * z); ctx.strokeRect(sx + 8 * z, sy - 28 * z, 4 * z, 10 * z); return hit(34, 24);
      case "pine": for (let i = 0; i < 3; i++) poly(ctx, [[sx, sy - (58 - i * 14) * z], [sx + (18 - i) * z, sy - (22 - i * 14) * z + 6 * z], [sx - (18 - i) * z, sy - (22 - i * 14) * z + 6 * z]], i === 0 ? "#f3f2ee" : shade("#9aa594", i * 0.04)); return hit(60, 36);
      case "dead_tree": ctx.strokeStyle = "#3b3a38"; ctx.lineWidth = 3 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 34 * z); ctx.moveTo(sx, sy - 22 * z); ctx.lineTo(sx - 12 * z, sy - 34 * z); ctx.moveTo(sx, sy - 28 * z); ctx.lineTo(sx + 10 * z, sy - 40 * z); ctx.stroke(); return hit(42, 30);
      case "statue": box(ctx, camera, ox, oy, 0.8, 0.8, 12, "#d7d4cd", "#c8c5be", "#b9b5ae");
        if (scene.friend) drawMask(ctx, friendRows(scene.friend, "down", false, 0), sx, sy - 12 * z, 3.4 * z, "#8f8a83"); return hit(70, 50);
      case "grave": box(ctx, camera, ox, oy, 0.3, 0.6, 18, "#c8c5be", "#a9a59e", "#9a968f"); return hit(24, 24);
      case "fence": {
        const world = scene.game.world, same = (dx: number, dy: number) => objectAtTile(world, ox + dx, oy + dy)?.decor === "fence";
        ctx.strokeStyle = "#8a7563"; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 14 * z);
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) if (same(dx, dy)) { const n = toScreen(camera, ox + dx, oy + dy); for (const lift of [5, 11]) { ctx.moveTo(sx, sy - lift * z); ctx.lineTo(n.x, n.y - lift * z); } }
        ctx.stroke(); return hit(16, 20);
      }
      case "reeds": ctx.strokeStyle = "#8e9887"; ctx.lineWidth = 1.2 * z; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(sx + i * 3 * z, sy); ctx.lineTo(sx + i * 4 * z + Math.sin(now / 600 + i) * 2 * z, sy - (12 + (i % 2) * 4) * z); } ctx.stroke(); return hit(16, 20);
      case "table": box(ctx, camera, ox, oy, 0.8, 0.6, 12, "#cdb9a0", "#9c8672", "#8a7563"); return hit(18);
      case "shelf": box(ctx, camera, ox, oy, 0.8, 0.25, 34, "#b89c86", "#9c8672", "#8a7563"); for (let i = 0; i < 3; i++) ellipse(ctx, sx + (i - 1) * 7 * z, sy - (12 + i * 8) * z, 2.5 * z, 3 * z, [C.rose, C.blue, C.butter][i]); return hit(40);
      case "pillar": box(ctx, camera, ox, oy, 0.45, 0.45, 50, "#d7d4cd", "#c8c5be", "#b9b5ae"); return hit(56, 26);
      case "rubble": for (let i = 0; i < 3; i++) box(ctx, camera, ox + (hash(ox + i, oy) - 0.5) * 0.5, oy + (hash(ox, oy + i) - 0.5) * 0.5, 0.25, 0.25, 6, "#c8c5be", "#a9a59e", "#9a968f"); return hit(12);
      case "snowman": ellipse(ctx, sx, sy - 9 * z, 11 * z, 9 * z, "#fff"); ellipse(ctx, sx, sy - 24 * z, 8 * z, 7 * z, "#fff"); ellipse(ctx, sx - 3 * z, sy - 25 * z, 1.2 * z, 1.2 * z, INK, null); ellipse(ctx, sx + 3 * z, sy - 25 * z, 1.2 * z, 1.2 * z, INK, null); return hit(34, 26);
      case "lily": ellipse(ctx, sx, sy, 7 * z, 3.5 * z, "#a9b59c"); ellipse(ctx, sx + 2 * z, sy - 1 * z, 2 * z, 1.5 * z, C.rose, null); return hit(6, 16);
      case "banner": ctx.strokeStyle = INK; ctx.lineWidth = 2 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 50 * z); ctx.stroke(); poly(ctx, [[sx, sy - 50 * z], [sx + 16 * z, sy - 46 * z], [sx + 16 * z, sy - 24 * z], [sx + 8 * z, sy - 30 * z], [sx, sy - 26 * z]], C.rose); return hit(54, 30);
      case "torch": { ctx.strokeStyle = "#8a7563"; ctx.lineWidth = 2.5 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 22 * z); ctx.stroke(); const f = scene.reducedMotion ? 0 : Math.sin(now / 80 + ox * 3) * 2 * z;
        ellipse(ctx, sx, sy - 34 * z, 18 * z, 12 * z, "rgba(240,200,150,0.15)", null); poly(ctx, [[sx - 5 * z, sy - 22 * z], [sx + f * 0.5, sy - 36 * z - f], [sx + 5 * z, sy - 22 * z]], "#e9b48f"); return hit(38, 20); }
      case "palm": ctx.strokeStyle = "#9c8672"; ctx.lineWidth = 4 * z; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 6 * z, sy - 24 * z, sx + 2 * z, sy - 46 * z); ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + Math.sin(now / 900) * 0.06, tipX = sx + 2 * z + Math.cos(a) * 26 * z, tipY = sy - 44 * z + Math.sin(a) * 10 * z + 8 * z;
          const midX = sx + 2 * z + Math.cos(a) * 14 * z, midY = sy - 50 * z + Math.sin(a) * 6 * z, nx = -Math.sin(a) * 5 * z, ny = Math.cos(a) * 2 * z;
          poly(ctx, [[sx + 2 * z, sy - 46 * z], [midX + nx, midY + ny], [tipX, tipY], [midX - nx, midY - ny]], i % 2 ? "#a9b59c" : "#b4c3ab");
        }
        return hit(56, 40);
      case "hay": box(ctx, camera, ox, oy, 0.7, 0.5, 14, "#e2d7ad", "#d6c58f", "#c9b77f"); return hit(20);
      case "windmill": {
        box(ctx, camera, ox, oy, 1.4, 1.4, 70, "#d7d4cd", "#c8c5be", "#b9b5ae"); poly(ctx, [[sx - 34 * z, sy - 68 * z], [sx, sy - 110 * z], [sx + 34 * z, sy - 68 * z], [sx, sy - 52 * z]], "#9c8672");
        const hub = toScreen(camera, ox + 0.7, oy + 0.7, 64), spin = scene.reducedMotion ? 0.3 : now / 1800;
        for (let i = 0; i < 4; i++) { const a = spin + i * Math.PI / 2; poly(ctx, [[hub.x, hub.y], [hub.x + Math.cos(a) * 56 * z, hub.y + Math.sin(a) * 56 * z], [hub.x + Math.cos(a + 0.18) * 56 * z, hub.y + Math.sin(a + 0.18) * 56 * z]], PAPER); }
        ellipse(ctx, hub.x, hub.y, 4 * z, 4 * z, INK, null); return { x: sx - 60 * z, y: sy - 130 * z, w: 120 * z, h: 140 * z };
      }
      case "boat": poly(ctx, [[sx - 22 * z, sy - 4 * z], [sx + 22 * z, sy - 4 * z], [sx + 14 * z, sy + 6 * z], [sx - 14 * z, sy + 6 * z]], "#9c8672"); return hit(12, 44);
      case "chest": box(ctx, camera, ox, oy, 0.6, 0.45, 14, "#9c8672", "#8a7563", "#7a6553"); return hit(20);
      case "bed": box(ctx, camera, ox, oy, 0.6, 1, 8, PAPER, "#d6d3cc", "#c8c5be"); return hit(14);
      default: return hit(10);
    }
  } finally { ctx.globalAlpha = 1; }
}
function drawIcon(ctx: CanvasRenderingContext2D, icon: Icon, x: number, y: number, size: number) {
  drawPixels(ctx, itemArt(icon), x, y + size / 2, size / 26);
}

// ---------- Buildings ----------
const WALL_H = 42;
const roofAlpha = new Map<number, number>();
type RoofVertex = [number, number, number];
/** The roof's corners (with an overhang) and its ridge, in world coordinates and height. */
function roofGeometry(building: Building) {
  const o = 0.3, X0 = building.x0 - 0.5 - o, X1 = building.x1 + 0.5 + o, Y0 = building.y0 - 0.5 - o, Y1 = building.y1 + 0.5 + o;
  const alongX = X1 - X0 >= Y1 - Y0, half = (alongX ? Y1 - Y0 : X1 - X0) / 2, rise = Math.max(20, Math.min(48, half * 11));
  const base = WALL_H, top = base + rise, mid = alongX ? (Y0 + Y1) / 2 : (X0 + X1) / 2;
  const A: RoofVertex = [X0, Y0, base], B: RoofVertex = [X1, Y0, base], C: RoofVertex = [X1, Y1, base], D: RoofVertex = [X0, Y1, base];
  const R0: RoofVertex = alongX ? [X0, mid, top] : [mid, Y0, top], R1: RoofVertex = alongX ? [X1, mid, top] : [mid, Y1, top];
  return { A, B, C, D, R0, R1, alongX, base, top, X0, X1, Y0, Y1 };
}
function roofHull(camera: Camera, building: Building) {
  const g = roofGeometry(building), points = building.roof === "flat" ? [g.A, g.B, g.C, g.D].map(([x, y]) => [x, y, g.base + 12] as RoofVertex).concat([g.A, g.B, g.C, g.D]) : [g.A, g.B, g.C, g.D, g.R0, g.R1];
  const screen = points.map(([x, y, h]) => { const s = toScreen(camera, x, y, h); return [s.x, s.y] as [number, number]; });
  // Convex hull (monotone chain).
  screen.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const point of screen) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop(); lower.push(point); }
  for (const point of [...screen].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop(); upper.push(point); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function pointInPolygon(x: number, y: number, polygon: readonly [number, number][]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function drawRoof(ctx: CanvasRenderingContext2D, camera: Camera, building: Building, alpha: number, now: number, reduced: boolean) {
  const g = roofGeometry(building), P = ([x, y, h]: RoofVertex) => { const s = toScreen(camera, x, y, h); return [s.x, s.y] as const; };
  ctx.globalAlpha = alpha;
  if (building.roof === "flat") {
    // A flat roof with battlements.
    const cx = (g.X0 + g.X1) / 2, cy = (g.Y0 + g.Y1) / 2;
    box(ctx, camera, cx, cy, g.X1 - g.X0, g.Y1 - g.Y0, 5, shade(building.color, 0.08), shade(building.color, -0.06), shade(building.color, -0.14), g.base);
    const merlon = (x: number, y: number) => box(ctx, camera, x, y, 0.42, 0.42, 8, shade(building.color, 0.12), shade(building.color, -0.04), shade(building.color, -0.12), g.base + 5);
    const sides: [number, number][] = [];
    for (let x = g.X0 + 0.3; x <= g.X1 - 0.2; x += 1.2) sides.push([x, g.Y0 + 0.25], [x, g.Y1 - 0.25]);
    for (let y = g.Y0 + 1.5; y <= g.Y1 - 1.3; y += 1.2) sides.push([g.X0 + 0.25, y], [g.X1 - 0.25, y]);
    sides.sort((a, b) => depthOf(camera, a[0], a[1]) - depthOf(camera, b[0], b[1])).forEach(([x, y]) => merlon(x, y));
    ctx.globalAlpha = 1;
    return;
  }
  const color = building.color, gable = "#cdb9a0";
  const faces: { points: RoofVertex[]; fill: string; slope?: [RoofVertex, RoofVertex, RoofVertex, RoofVertex] }[] = g.alongX
    ? [{ points: [g.A, g.B, g.R1, g.R0], fill: shade(color, 0.07), slope: [g.A, g.B, g.R1, g.R0] }, { points: [g.D, g.C, g.R1, g.R0], fill: shade(color, -0.07), slope: [g.D, g.C, g.R1, g.R0] },
      { points: [g.A, g.D, g.R0], fill: gable }, { points: [g.B, g.C, g.R1], fill: shade(gable, -0.08) }]
    : [{ points: [g.A, g.D, g.R1, g.R0], fill: shade(color, 0.07), slope: [g.A, g.D, g.R1, g.R0] }, { points: [g.B, g.C, g.R1, g.R0], fill: shade(color, -0.07), slope: [g.B, g.C, g.R1, g.R0] },
      { points: [g.A, g.B, g.R0], fill: gable }, { points: [g.D, g.C, g.R1], fill: shade(gable, -0.08) }];
  const centre = (points: RoofVertex[]) => depthOf(camera, points.reduce((sum, v) => sum + v[0], 0) / points.length, points.reduce((sum, v) => sum + v[1], 0) / points.length);
  faces.sort((a, b) => centre(a.points) - centre(b.points));
  for (const face of faces) {
    poly(ctx, face.points.map(P), face.fill, INK, 1.2);
    if (face.slope) {
      // Shingle courses parallel to the ridge.
      const [e0, e1, r1, r0] = face.slope;
      ctx.strokeStyle = "rgba(22,22,22,0.22)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 1; k < 5; k++) {
        const t = k / 5, a: RoofVertex = [e0[0] + (r0[0] - e0[0]) * t, e0[1] + (r0[1] - e0[1]) * t, e0[2] + (r0[2] - e0[2]) * t], b: RoofVertex = [e1[0] + (r1[0] - e1[0]) * t, e1[1] + (r1[1] - e1[1]) * t, e1[2] + (r1[2] - e1[2]) * t];
        const [ax, ay] = P(a), [bx, by] = P(b); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }
  }
  const [rx0, ry0] = P(g.R0), [rx1, ry1] = P(g.R1);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.lineTo(rx1, ry1); ctx.stroke();
  if (building.chimney) {
    const cx = g.alongX ? g.X1 - 1.4 : (g.X0 + g.X1) / 2 + 0.6, cy = g.alongX ? (g.Y0 + g.Y1) / 2 + 0.6 : g.Y1 - 1.4;
    box(ctx, camera, cx, cy, 0.55, 0.55, g.top - g.base + 6, "#8f8a83", "#a39e96", "#7c7771", g.base, INK, "brick");
    if (!reduced && Math.random() < 0.06) puff(cx, cy, g.top + 8);
  }
  ctx.globalAlpha = 1;
  void now;
}

// ---------- Characters ----------
function interpolate(entity: { x: number; y: number; prev: { x: number; y: number }; moved: number }, game: Game, alpha: number) {
  if (entity.moved !== game.tick) return { x: entity.x, y: entity.y, moving: false };
  return { x: entity.prev.x + (entity.x - entity.prev.x) * alpha, y: entity.prev.y + (entity.y - entity.prev.y) * alpha, moving: alpha < 1 };
}
/** A health bar: green over red, ink outline. `label` (a level) sits to its left. */
function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, fraction: number, z: number, width = 30, label?: string) {
  const w = width * z, h = 4.5 * Math.max(0.85, z), left = x - w / 2;
  ctx.fillStyle = "#cf6e6e"; ctx.fillRect(left, y, w, h);
  ctx.fillStyle = "#86c47f"; ctx.fillRect(left, y, w * Math.max(0, Math.min(1, fraction)), h);
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(left, y, w, h);
  if (label) {
    ctx.font = `bold ${Math.round(9 * Math.max(0.9, z))}px ui-monospace, Menlo, Consolas, monospace`; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeText(label, left - 3, y + h / 2); ctx.fillStyle = "#f2e28f"; ctx.fillText(label, left - 3, y + h / 2);
  }
}
function splat(ctx: CanvasRenderingContext2D, x: number, y: number, damage: number, z: number, age: number) {
  const r = 9 * Math.max(0.8, z), rise = age * 10 * z;
  ellipse(ctx, x, y - rise, r, r * 0.9, damage > 0 ? "#c98f95" : "#9fb4d0", INK, 1.4);
  ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(11 * Math.max(0.85, z))}px ui-monospace, Menlo, Consolas, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.strokeText(String(Math.max(0, damage)), x, y - rise + 0.5); ctx.fillText(String(Math.max(0, damage)), x, y - rise + 0.5);
}
function overheadText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = "#f2e28f") {
  ctx.font = "bold 13px ui-monospace, Menlo, Consolas, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}
// ---------- Scene ----------
type Drawable = { depth: number; draw: () => void };
let lastHits: Hit[] = [];
/** Picks under a point, topmost first, from the last frame. */
export function pickAt(x: number, y: number): Pick[] {
  const out: Pick[] = [];
  for (let i = lastHits.length - 1; i >= 0; i--) {
    const hit = lastHits[i];
    if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h && !out.some(p => p.kind === hit.pick.kind && p.id === hit.pick.id)) out.push(hit.pick);
  }
  return out;
}
let lastFrame = 0;
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { game, camera, now } = scene, world = game.world, z = camera.zoom;
  const alpha = Math.max(0, Math.min(1, (now - scene.tickAt) / TICK_MS));
  const underground = game.player.y >= 200;
  setGround(world); camera.base = groundHeight(world, camera.x, camera.y);
  const dt = Math.min(0.05, Math.max(0, (now - (lastFrame || now)) / 1000)); lastFrame = now;
  const project = (x: number, y: number, lift = 0) => toScreen(camera, x, y, lift);
  updateEffects(game, camera, dt, scene.reducedMotion, 34 / Math.max(0.5, z));
  ctx.fillStyle = underground ? "#0e0e10" : "#8fa1b5"; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Visible tile bounds.
  const corners = [toTile(camera, 0, 0), toTile(camera, VIEW.width, 0), toTile(camera, 0, VIEW.height), toTile(camera, VIEW.width, VIEW.height)];
  const x0 = Math.min(...corners.map(c => c.x)) - 2, x1 = Math.max(...corners.map(c => c.x)) + 3, y0 = Math.min(...corners.map(c => c.y)) - 2, y1 = Math.max(...corners.map(c => c.y)) + 3;
  drawTerrain(ctx, scene, x0, y0, x1, y1);
  drawCloudShadows(ctx, project, camera, now, z, underground, scene.reducedMotion);
  const hits: Hit[] = [], drawables: Drawable[] = [];
  const player = game.player, pp = interpolate(player, game, alpha), playerDepth = depthOf(camera, pp.x, pp.y), depth = (x: number, y: number) => depthOf(camera, x, y);
  const insideBuilding = inBounds(player.x, player.y) ? world.buildingAt[player.y * W + player.x] : 0;
  const playerFacing = screenFacing(camera, player.heading);
  // Hover highlight and click marker.
  const tileOutline = (tx: number, ty: number, color: string) => { const c = (dx: number, dy: number) => { const s = toScreen(camera, tx + dx, ty + dy); return [s.x, s.y] as const; }; poly(ctx, [c(-0.5, -0.5), c(0.5, -0.5), c(0.5, 0.5), c(-0.5, 0.5)], null, color, 1.5); };
  if (scene.hoverTile) tileOutline(scene.hoverTile.x, scene.hoverTile.y, "rgba(22,22,22,0.35)");
  // Static objects, walls and cliffs.
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inBounds(x, y)) continue;
    const terrain = world.tiles[y * W + x];
    if (terrain === T.WALL || terrain === T.CLIFF) {
      const d = depth(x, y), owner = world.buildingAt[y * W + x], cut = owner !== 0 && owner === insideBuilding && d > playerDepth - 0.5;
      const near = !cut && Math.abs(x - pp.x) + Math.abs(y - pp.y) < 7 && d > playerDepth + 0.5;
      drawables.push({ depth: d, draw: () => {
        // Inside a building, the walls between you and the camera drop to a low cutaway.
        const height = terrain === T.WALL ? (y >= 200 ? 34 : cut ? 9 : WALL_H) : 22;
        ctx.globalAlpha = near ? 0.3 : 1;
        if (terrain === T.WALL) box(ctx, camera, x, y, 1, 1, height, y >= 200 ? "#4a4950" : "#b9b4ab", y >= 200 ? "#3a3940" : "#a39e95", y >= 200 ? "#2f2e35" : "#8f8a82", 0, INK, owner && !cut && hash(x, y) < 0.34 ? "window" : "brick");
        else box(ctx, camera, x, y, 1, 1, height + hash(x, y) * 10, "#a39e96", "#8f8a83", "#7c7771");
        ctx.globalAlpha = 1;
      } });
    }
    const object = objectAtTile(world, x, y);
    if (!object || object.name === "__removed") continue;
    const d = depth(x, y) + (object.kind === "wheat" || object.kind === "spot" ? -0.4 : 0);
    drawables.push({ depth: d, draw: () => {
      let rect: { x: number; y: number; w: number; h: number };
      const tall = object.kind === "tree" || (object.kind === "decor" && ["pine", "windmill", "palm", "pillar", "tent"].includes(object.decor!));
      const fade = tall && d > playerDepth + 0.5 && Math.abs(x - pp.x) + Math.abs(y - pp.y) < 4 ? 0.4 : 1;
      if (object.kind === "tree") rect = drawTree(ctx, camera, object, game.depleted.has(object.id), fade, scene.reducedMotion ? 0 : treeShake(game, object.id, now));
      else if (object.kind === "rock") rect = drawRock(ctx, camera, object, game.depleted.has(object.id));
      else if (object.kind === "spot") rect = drawSpot(ctx, camera, object, now, scene.reducedMotion);
      else if (object.kind === "decor") rect = drawDecor(ctx, scene, object, fade);
      else rect = drawStation(ctx, scene, object);
      if (object.kind !== "decor" || object.decor === "chest") hits.push({ ...rect, pick: { kind: "object", id: object.id } });
    } });
  }
  // Fires.
  for (const fire of game.fires) {
    if (fire.x < x0 || fire.x > x1 || fire.y < y0 || fire.y > y1) continue;
    drawables.push({ depth: depth(fire.x, fire.y), draw: () => {
      const s = toScreen(camera, fire.x, fire.y), f = scene.reducedMotion ? 0 : Math.sin(now / 70 + fire.uid) * 3 * z;
      for (const [dx, dy] of [[-6, 0], [6, 0], [0, 3]]) { ctx.strokeStyle = INK; ctx.lineWidth = 4 * z; ctx.beginPath(); ctx.moveTo(s.x + dx * z - 6 * z, s.y + dy * z); ctx.lineTo(s.x + dx * z + 6 * z, s.y + dy * z - 3 * z); ctx.stroke(); }
      ellipse(ctx, s.x, s.y - 10 * z, 22 * z, 16 * z, "rgba(240,190,140,0.18)", null);
      poly(ctx, [[s.x - 9 * z, s.y], [s.x - 4 * z + f, s.y - 26 * z], [s.x + 1 * z, s.y - 12 * z], [s.x + 5 * z - f, s.y - 30 * z], [s.x + 9 * z, s.y]], "#e9b48f");
      poly(ctx, [[s.x - 4 * z, s.y], [s.x + f * 0.5, s.y - 16 * z], [s.x + 4 * z, s.y]], "#f4dca0", null);
      hits.push({ x: s.x - 14 * z, y: s.y - 32 * z, w: 28 * z, h: 36 * z, pick: { kind: "fire", id: fire.uid } });
    } });
  }
  // Ground items.
  const groundTiles = new Map<string, typeof game.ground>();
  for (const entry of game.ground) {
    if (entry.x < x0 || entry.x > x1 || entry.y < y0 || entry.y > y1) continue;
    const key = `${entry.x},${entry.y}`; const list = groundTiles.get(key) ?? []; list.push(entry); groundTiles.set(key, list);
  }
  for (const list of groundTiles.values()) {
    drawables.push({ depth: depth(list[0].x, list[0].y) - 0.3, draw: () => {
      list.slice(0, 4).forEach((entry, index) => {
        const s = toScreen(camera, entry.x, entry.y), ox = (index % 2 ? 7 : -7) * z, oy = (index > 1 ? 4 : -2) * z, size = 22 * z;
        drawIcon(ctx, item(entry.id).icon, s.x + ox, s.y + oy - 4 * z, size);
        hits.push({ x: s.x + ox - size / 2, y: s.y + oy - 4 * z - size / 2, w: size, h: size, pick: { kind: "ground", id: entry.uid } });
      });
    } });
  }
  // NPCs.
  for (const npc of game.npcs) {
    if (npc.x < x0 || npc.x > x1 || npc.y < y0 || npc.y > y1) continue;
    const at = interpolate(npc, game, alpha);
    drawables.push({ depth: depth(at.x, at.y) + 0.1, draw: () => drawNpc(ctx, scene, npc, at, hits) });
  }
  // Monsters.
  for (const monster of game.monsters) {
    if (monster.dead || monster.x < x0 - 2 || monster.x > x1 || monster.y < y0 - 2 || monster.y > y1) continue;
    const at = interpolate(monster, game, alpha), size = monster.def.size ?? 1;
    drawables.push({ depth: depth(at.x + (size - 1) / 2, at.y + (size - 1) / 2) + (size - 1) / 2 + 0.1, draw: () => drawMonster(ctx, scene, monster, at, hits) });
  }
  // Your follower: an owned Friend walking the tiles you leave behind, animated like any NPC.
  if (scene.follower && game.pet) {
    const pet = game.pet, at = interpolate(pet, game, alpha);
    drawables.push({ depth: depth(at.x, at.y) + 0.05, draw: () => {
      const s = toScreen(camera, at.x, at.y), facing = screenFacing(camera, pet.heading);
      ellipse(ctx, s.x, s.y, 11 * z, 4.5 * z, "rgba(22,22,22,0.16)", null);
      drawMask(ctx, friendRows(scene.follower!, facing, at.moving, at.moving ? Math.floor(now / 90) % 8 : 0), s.x, s.y + 2 * z, 2.6 * z);
    } });
  }
  // The player.
  const pose = playerPose(game, now, project, scene.reducedMotion, scene.sfx);
  // Roofs: every building's roof, fading out when you walk in or when it would hide you.
  if (!underground) world.buildings.forEach((building, index) => {
    if (building.roof === "none" || building.x1 < x0 - 4 || building.x0 > x1 + 4 || building.y1 < y0 - 4 || building.y0 > y1 + 4) return;
    const front = Math.max(depth(building.x0, building.y0), depth(building.x1, building.y0), depth(building.x0, building.y1), depth(building.x1, building.y1)) + 0.5;
    drawables.push({ depth: front, draw: () => {
      const hull = roofHull(camera, building), me = toScreen(camera, pp.x, pp.y, 20);
      const target = insideBuilding === index + 1 ? 0 : playerDepth < front && pointInPolygon(me.x, me.y, hull) ? 0.22 : 1;
      const current = roofAlpha.get(index) ?? target, next = scene.reducedMotion ? target : current + (target - current) * Math.min(1, dt * 9);
      roofAlpha.set(index, next);
      if (next > 0.02) drawRoof(ctx, camera, building, next, now, scene.reducedMotion);
    } });
  });
  drawables.push({ depth: playerDepth + 0.15, draw: () => {
    // Agility: glide from the start to the landing with a hop.
    let at = pp;
    if (player.activity?.kind === "obstacle") { const a = player.activity, total = world.objects[a.objectId].obstacle?.ticks ?? 3, k = Math.max(0, Math.min(1, 1 - (a.timer - alpha) / total)); at = { x: a.from.x + (a.to.x - a.from.x) * k, y: a.from.y + (a.to.y - a.from.y) * k, moving: true }; }
    const s = toScreen(camera, at.x, at.y, pose.hop), feet = toScreen(camera, at.x, at.y), px = 3.2 * z, walking = at.moving || (!!player.path.length && alpha < 1);
    const facing: Facing = pose.target ? (pose.side < 0 ? "left" : "right") : playerFacing;
    ellipse(ctx, feet.x, feet.y, 15 * z, 6 * z, "rgba(22,22,22,0.2)", "rgba(255,255,255,0.75)", 1.5);
    const bodyY = s.y - pose.bob * z;
    // Your Friend with its worn pieces composited into the same pixel frame.
    drawAuras(ctx, player.worn, s.x, bodyY, px, now, scene.reducedMotion, "back");
    if (scene.friend) drawFigure(ctx, figureArt(friendRows(scene.friend, facing, walking, walking ? Math.floor(now / 80) % 8 : 0), player.worn, facing), s.x, bodyY + 2 * z, px, pose.alpha);
    else ellipse(ctx, s.x, bodyY - 20 * z, 12 * z, 16 * z, INK);
    drawAuras(ctx, player.worn, s.x, bodyY, px, now, scene.reducedMotion, "front");
    drawHeld(ctx, scene, pose, s.x, bodyY, px, facing, project);
    if (player.hp < maxHpOf(game) || game.monsters.some(monster => monster.target && !monster.dead)) hpBar(ctx, s.x, s.y - 62 * z, player.hp / maxHpOf(game), z);
    for (const hit of scene.hits.filter(entry => entry.on === "player" && now - entry.at < 1100)) splat(ctx, s.x, s.y - 30 * z, hit.damage, z, (now - hit.at) / 1100);
    if (scene.chat && scene.chat.until > now) overheadText(ctx, scene.chat.text, s.x, s.y - 66 * z);
    if (player.stunned > 0) for (let i = 0; i < 3; i++) { const a = now / 200 + i * 2.1; ellipse(ctx, s.x + Math.cos(a) * 12 * z, s.y - 56 * z + Math.sin(a) * 3 * z, 2 * z, 2 * z, C.butter); }
    for (const firework of scene.fireworks) {
      const age = (now - firework.at) / 2200;
      if (age < 0 || age > 1) continue;
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = age * 60 * z; ellipse(ctx, s.x + Math.cos(a) * r, s.y - 40 * z + Math.sin(a) * r * 0.7 - age * 20 * z, 2.5 * z * (1 - age), 2.5 * z * (1 - age), [C.rose, C.butter, C.blue, C.sage][i % 4], null); }
    }
  } });
  drawables.sort((a, b) => a.depth - b.depth);
  for (const drawable of drawables) drawable.draw();
  // Projectiles.
  for (const projectile of scene.projectiles) {
    const progress = (game.tick - projectile.start + alpha) / Math.max(1, projectile.end - projectile.start + 1);
    if (progress < 0 || progress > 1) continue;
    const a = toScreen(camera, projectile.from.x, projectile.from.y, 28), b = toScreen(camera, projectile.to.x, projectile.to.y, 24);
    const px = a.x + (b.x - a.x) * progress, py = a.y + (b.y - a.y) * progress - Math.sin(progress * Math.PI) * 20 * z;
    ellipse(ctx, px, py, 8 * z, 8 * z, `${projectile.color}88`, null); ellipse(ctx, px, py, 4 * z, 4 * z, projectile.color, INK);
  }
  drawEffects(ctx, project, world, now, z);
  // Click marker: an old-school cross, yellow for walking, red for actions.
  if (scene.marker && now - scene.marker.at < 450) {
    const s = toScreen(camera, scene.marker.x, scene.marker.y), k = 1 - (now - scene.marker.at) / 450, r = 8 * z * (0.6 + k * 0.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x - r, s.y - r / 2); ctx.lineTo(s.x + r, s.y + r / 2); ctx.moveTo(s.x + r, s.y - r / 2); ctx.lineTo(s.x - r, s.y + r / 2); ctx.stroke();
    ctx.strokeStyle = scene.marker.red ? "#e07a7a" : "#f2e28f"; ctx.lineWidth = 2; ctx.stroke();
  }
  // Underground vignette.
  if (underground) {
    const gradient = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, 120, VIEW.width / 2, VIEW.height / 2, 520);
    gradient.addColorStop(0, "rgba(0,0,0,0)"); gradient.addColorStop(1, "rgba(0,0,0,0.65)"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  lastHits = hits;
}
const maxHpOf = (game: Game) => levelForXp(game.player.xp.hitpoints);
/** What the player holds: a skilling tool mid-swing, a fishing line, or their weapon (swinging when they attack). */
function drawHeld(ctx: CanvasRenderingContext2D, scene: Scene, pose: Pose, x: number, y: number, px: number, facing: Facing, project: (x: number, y: number, lift?: number) => { x: number; y: number }) {
  const player = scene.game.player, side = facing === "left" ? -1 : 1, alpha = Math.max(0, Math.min(1, (scene.now - scene.tickAt) / TICK_MS));
  let id = pose.tool, angle = pose.angle;
  if (!id && player.equipment.weapon) {
    id = player.equipment.weapon;
    const attacking = player.combat !== null && player.attackTimer === attackSpeed(player);
    angle = attacking && !scene.reducedMotion ? -1.4 + Math.min(1, alpha * 1.6) * 2.3 : 0.25;
  }
  if (!id) return;
  const art = itemArt(item(id).icon), size = 12 * px, hx = x + side * (6 + pose.reach * 6) * px, hy = y - 7 * px;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(side, 1); ctx.rotate(angle + 0.5); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, -size * 0.25, -size * 0.78, size, size);
  ctx.restore();
  if (pose.line && pose.target) {
    // Rod tip (the art's top-right, rotated with the rod) to a bobber on the spot.
    const turn = angle + 0.5, tipX = hx + side * (Math.cos(turn) * size * 0.55 + Math.sin(turn) * size * 0.55), tipY = hy + (Math.sin(turn) * size * 0.55 - Math.cos(turn) * size * 0.55);
    const spot = project(pose.target.x, pose.target.y), bob = scene.reducedMotion ? 0 : Math.sin(scene.now / 300) * 1.5;
    ctx.strokeStyle = "rgba(22,22,22,0.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo((tipX + spot.x) / 2, Math.max(tipY, spot.y) + 10, spot.x, spot.y - 2 + bob); ctx.stroke();
    ctx.fillStyle = "#cf6e6e"; ctx.fillRect(spot.x - 1.5, spot.y - 4 + bob, 3, 3); ctx.fillStyle = "#ffffff"; ctx.fillRect(spot.x - 1.5, spot.y - 5 + bob, 3, 1);
  }
}
function drawNpc(ctx: CanvasRenderingContext2D, scene: Scene, npc: Npc, at: { x: number; y: number; moving: boolean }, hits: Hit[]) {
  const { camera, now, game } = scene, z = camera.zoom, s = toScreen(camera, at.x, at.y), def = NPCS[npc.id];
  ellipse(ctx, s.x, s.y, 12 * z, 4.5 * z, "rgba(22,22,22,0.16)", null);
  let rect;
  if ("canonical" in def.art) {
    const sprites = scene.canonical.get(def.art.canonical);
    rect = sprites ? drawMask(ctx, friendRows(sprites, screenFacing(camera, npc.heading), at.moving, at.moving ? Math.floor(now / 90) % 8 : 0), s.x, s.y + 2 * z, 2.8 * z) : drawMask(ctx, friendSprite(5, 1).idle, s.x, s.y + 2 * z, 2.8 * z);
  } else {
    const set = friendSprite(def.art.family, def.art.seed + (npc.id === "villager" || npc.id === "banker" || npc.id === "guard" ? npc.uid : 0));
    const frame = at.moving && Math.floor(now / 160) % 2 ? set.step : set.idle, bob = !scene.reducedMotion && def.art.family === 5 ? Math.sin(now / 400 + npc.uid) * 2 * z : 0;
    rect = drawMask(ctx, frame, s.x, s.y + 2 * z - bob, 2.6 * z, INK, screenFacing(camera, npc.heading) === "left");
  }
  hits.push({ ...rect, pick: { kind: "npc", id: npc.uid } });
  const questMarker = questMarkerFor(game, npc.id);
  if (questMarker) { const bob = scene.reducedMotion ? 0 : Math.sin(now / 300) * 2 * z; poly(ctx, [[s.x - 5 * z, s.y - 58 * z + bob], [s.x + 5 * z, s.y - 58 * z + bob], [s.x, s.y - 50 * z + bob]], questMarker); }
  const said = npcOverhead(game, npc.uid);
  if (said) overheadText(ctx, said, s.x, s.y - 50 * z, "#f2e28f");
}
function questMarkerFor(game: Game, npcId: string): string | null {
  const q = game.player.quests;
  const starts: Record<string, string> = { cook: "friends_feast", captain: "grumblin_trouble", smith: "cold_forge", priest: "hollow_whispers", glimmer: "lost_glimmer" };
  const quest = starts[npcId];
  if (quest && !q[quest]) return C.butter;
  if (npcId === "glimmer" && (q.lost_glimmer ?? 0) >= 2 && (q.hollow_whispers ?? 0) >= 4 && !q.hollow_king) return C.rose;
  return null;
}
function drawMonster(ctx: CanvasRenderingContext2D, scene: Scene, monster: Monster, at: { x: number; y: number; moving: boolean }, hits: Hit[]) {
  const { camera, now, game } = scene, z = camera.zoom, size = monster.def.size ?? 1, center = { x: at.x + (size - 1) / 2, y: at.y + (size - 1) / 2 };
  const s = toScreen(camera, center.x, center.y), px = (size === 1 ? 2.6 : size === 2 ? 4.4 : 6.2) * z * (monster.def.id === "chicken" || monster.def.id === "ink_rat" ? 0.75 : 1);
  ellipse(ctx, s.x, s.y, 12 * z * size, 4.5 * z * size, "rgba(22,22,22,0.18)", null);
  const set = creatureSprite(monster.def.art), frame = at.moving && Math.floor(now / 150) % 2 ? set.step : set.idle;
  const facing = screenFacing(camera, monster.heading), faceLeft = FACES_LEFT.has(monster.def.art), mirror = faceLeft ? facing === "right" || facing === "down" : facing === "left" || facing === "up";
  if (monster.def.boss && !scene.reducedMotion) { const pulse = 1 + Math.sin(now / 300) * 0.08; ellipse(ctx, s.x, s.y - 40 * z, 48 * z * pulse, 36 * z * pulse, "rgba(20,20,30,0.25)", null); }
  const hover = monster.def.id === "shade" || monster.def.id === "hollow_king" ? Math.sin(now / 350 + monster.uid) * 3 * z : 0;
  const rect = drawMask(ctx, frame, s.x, s.y + 2 * z - hover, px, monster.def.ink ?? INK, mirror);
  hits.push({ ...rect, pick: { kind: "monster", id: monster.uid } });
  const recent = scene.hits.filter(entry => entry.on === "monster" && entry.uid === monster.uid && now - entry.at < 1100);
  // Every monster shows its health and level, like a nameplate.
  hpBar(ctx, s.x, rect.y - 8 * z, monster.hp / monster.def.hp, z, 24 + 10 * size, `${monster.def.level}`);
  for (const hit of recent) splat(ctx, s.x, s.y - rect.h / 2, hit.damage, z, (now - hit.at) / 1100);
  void game;
}

// ---------- Minimap and world map ----------
const MAP_COLORS: Record<number, [number, number, number]> = {
  [T.VOID]: [14, 14, 16], [T.GRASS]: [200, 208, 190], [T.DARK_GRASS]: [180, 190, 170], [T.PATH]: [222, 208, 180], [T.COBBLE]: [214, 211, 204], [T.SAND]: [232, 223, 198],
  [T.WATER]: [160, 180, 200], [T.DEEP]: [130, 150, 175], [T.SWAMP]: [165, 170, 150], [T.SNOW]: [246, 245, 241], [T.STONE]: [196, 193, 186], [T.WOOD]: [205, 185, 160],
  [T.GRAVEL]: [190, 183, 172], [T.DUNGEON]: [90, 89, 96], [T.BRIDGE]: [170, 145, 120], [T.CLIFF]: [120, 115, 108], [T.WALL]: [70, 68, 66], [T.FARMLAND]: [188, 167, 135],
  [T.ICE]: [222, 231, 236], [T.CARPET]: [201, 163, 163],
};
let mapImage: HTMLCanvasElement | null = null;
/** The whole world, one pixel per tile (built once). */
export function worldImage(world: World): HTMLCanvasElement {
  if (mapImage) return mapImage;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!, image = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    let [r, g, b] = MAP_COLORS[world.tiles[i]] ?? [128, 128, 128];
    const object = world.objects[world.objectAt[i]];
    if (object?.kind === "tree") [r, g, b] = [150, 165, 140];
    else if (object?.kind === "rock") [r, g, b] = [150, 140, 130];
    image.data.set([r, g, b, 255], i * 4);
  }
  ctx.putImageData(image, 0, 0);
  return mapImage = canvas;
}
export type MapIcon = { x: number; y: number; glyph: string; label: string };
export function mapIcons(world: World): MapIcon[] {
  const icons: MapIcon[] = [], seen = new Set<string>();
  const add = (x: number, y: number, glyph: string, label: string, spacing = 6) => {
    const key = `${glyph}:${Math.round(x / spacing)}:${Math.round(y / spacing)}`;
    if (seen.has(key)) return; seen.add(key); icons.push({ x, y, glyph, label });
  };
  for (const object of world.objects) {
    if (object.kind === "bank") add(object.x, object.y, "$", "Bank");
    else if (object.kind === "furnace") add(object.x, object.y, "▲", "Furnace");
    else if (object.kind === "anvil") add(object.x, object.y, "⚒", "Anvil");
    else if (object.kind === "range") add(object.x, object.y, "♨", "Cooking range");
    else if (object.kind === "altar") add(object.x, object.y, "✚", "Altar");
    else if (object.kind === "spot") add(object.x, object.y, "≈", "Fishing", 10);
    else if (object.kind === "rock") add(object.x, object.y, "⛏", "Mining", 14);
    else if (object.kind === "ladder" || object.kind === "gate") add(object.x, object.y, "▼", object.name);
    else if (object.kind === "stall") add(object.x, object.y, "✋", "Market stalls");
    else if (object.kind === "obstacle" && object.obstacle?.course === "friendhollow") add(object.x, object.y, "➶", "Agility course", 30);
    else if (object.kind === "casket") add(object.x, object.y, "◆", "Rare Caskets");
  }
  for (const spawn of world.spawns) {
    const def = spawn.kind === "npc" ? NPCS[spawn.id] : null;
    if (def?.shop) add(spawn.x, spawn.y, "¤", def.name);
    if (spawn.kind === "npc" && ["cook", "captain", "smith", "priest", "glimmer"].includes(spawn.id)) add(spawn.x, spawn.y, "!", `Quest: ${def!.name}`);
  }
  return icons;
}
/** The minimap: the world turned to match the camera (45° plus its rotation), centred on the player. */
export function renderMinimap(ctx: CanvasRenderingContext2D, game: Game, size: number, scale: number, angle: number) {
  const world = game.world, image = worldImage(world), player = game.player;
  ctx.save(); ctx.clearRect(0, 0, size, size);
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#0e0e10"; ctx.fillRect(0, 0, size, size);
  const turn = Math.PI / 4 + angle, cos = Math.cos(turn), sin = Math.sin(turn);
  ctx.translate(size / 2, size / 2); ctx.rotate(turn); ctx.scale(scale, scale); ctx.translate(-player.x - 0.5, -player.y - 0.5);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0);
  const dot = (x: number, y: number, color: string, r = 0.9) => { ctx.fillStyle = color; ctx.fillRect(x + 0.5 - r / 2, y + 0.5 - r / 2, r, r); };
  for (const entry of game.ground) if (Math.abs(entry.x - player.x) < 40 && Math.abs(entry.y - player.y) < 40) dot(entry.x, entry.y, "#d65b5b", 0.8);
  for (const npc of game.npcs) if (Math.abs(npc.x - player.x) < 40 && Math.abs(npc.y - player.y) < 40) dot(npc.x, npc.y, "#e8d57a");
  for (const monster of game.monsters) if (!monster.dead && Math.abs(monster.x - player.x) < 40 && Math.abs(monster.y - player.y) < 40) dot(monster.x, monster.y, "#e8d57a");
  ctx.restore();
  // Map icons, drawn upright.
  ctx.save(); ctx.font = "bold 10px ui-monospace, Menlo, Consolas, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const icon of iconsCache ??= mapIcons(world)) {
    const dx = icon.x - player.x, dy = icon.y - player.y, rx = (dx * cos - dy * sin) * scale, ry = (dx * sin + dy * cos) * scale;
    if (Math.hypot(rx, ry) > size / 2 - 8) continue;
    ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(size / 2 + rx, size / 2 + ry, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText(icon.glyph, size / 2 + rx, size / 2 + ry + 0.5);
  }
  // You: a white arrow facing your direction.
  ctx.fillStyle = "#fff"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/** Minimap click → world tile (the inverse of the minimap's turn). */
export function minimapTile(game: Game, dx: number, dy: number, scale: number, angle: number) {
  const turn = -(Math.PI / 4 + angle), cos = Math.cos(turn), sin = Math.sin(turn), x = dx / scale, y = dy / scale;
  return { x: Math.round(game.player.x + x * cos - y * sin), y: Math.round(game.player.y + x * sin + y * cos) };
}
let iconsCache: MapIcon[] | null = null;
/** The world map: the whole Realm turned to match the camera, with labels. Returns the transform for clicks. */
export function renderWorldMap(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, focus: { x: number; y: number; zoom: number }, underground: boolean) {
  const world = game.world, image = worldImage(world), player = game.player;
  ctx.save(); ctx.fillStyle = "#1a1a1d"; ctx.fillRect(0, 0, width, height);
  ctx.translate(width / 2, height / 2); ctx.rotate(Math.PI / 4); ctx.scale(focus.zoom, focus.zoom); ctx.translate(-focus.x, -focus.y);
  ctx.imageSmoothingEnabled = false;
  if (underground) ctx.drawImage(image, 0, 200, W, 40, 0, 200, W, 40); else ctx.drawImage(image, 0, 0, W, 200, 0, 0, W, 200);
  ctx.fillStyle = "#fff"; ctx.strokeStyle = INK; ctx.lineWidth = 1 / focus.zoom;
  ctx.beginPath(); ctx.arc(player.x + 0.5, player.y + 0.5, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  const toMap = (x: number, y: number) => {
    const dx = (x - focus.x) * focus.zoom, dy = (y - focus.y) * focus.zoom;
    return { x: width / 2 + (dx - dy) * Math.SQRT1_2, y: height / 2 + (dx + dy) * Math.SQRT1_2 };
  };
  ctx.save(); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const icon of iconsCache ??= mapIcons(world)) {
    if ((icon.y >= 200) !== underground) continue;
    const p = toMap(icon.x, icon.y);
    ctx.font = "bold 11px ui-monospace, Menlo, Consolas, monospace"; ctx.fillStyle = PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.fillText(icon.glyph, p.x, p.y + 0.5);
  }
  for (const region of REGIONS) {
    if (!!region.underground !== underground || region.id === "coast") continue;
    const p = toMap(region.label.x, region.label.y);
    ctx.font = "bold 15px ui-monospace, Menlo, Consolas, monospace"; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeText(region.name, p.x, p.y - 14); ctx.fillStyle = "#f2e28f"; ctx.fillText(region.name, p.x, p.y - 14);
  }
  const you = toMap(player.x + 0.5, player.y + 0.5);
  ctx.font = "bold 12px ui-monospace, Menlo, Consolas, monospace"; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeText("You", you.x, you.y - 12); ctx.fillStyle = "#fff"; ctx.fillText("You", you.x, you.y - 12);
  ctx.restore();
  return (sx: number, sy: number) => {
    const rx = (sx - width / 2) / focus.zoom, ry = (sy - height / 2) / focus.zoom;
    return { x: Math.round(focus.x + (rx + ry) * Math.SQRT1_2 - 0.5), y: Math.round(focus.y + (ry - rx) * Math.SQRT1_2 - 0.5) };
  };
}
