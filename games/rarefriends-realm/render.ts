/**
 * Canvas renderer: the Realm in greyscale ink with faded accent colours, on a 2.5D isometric grid.
 * Draws in a 960 × 640 logical view; the caller scales the canvas for the device.
 */
import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { ROCKS, isItem, item, levelForXp, type Icon } from "./data.ts";
import { NPCS } from "./content.ts";
import { TICK_MS, attackSpeed, type Facing, type Game, type Monster, type Npc, type Projectile } from "./state.ts";
import { npcOverhead, type Pick } from "./engine.ts";
import { FLOOR_Y, REGIONS, STOREY, T, W, H, complexAt, cornerHeight, floorAt, groundHeight, inBounds, isUnderground, objectAtTile, onLevel, realPoint, type Building, type Floor, type World, type WorldObject } from "./world.ts";
import { itemArt } from "./icons.ts";
import type { PeerView } from "./social.ts";
import { emoteMotion, emoteParticles, type Motion } from "./emotes.ts";
import { drawPixels, shadeHex } from "./pixel.ts";
import { TEX_PER_HEIGHT, TEX_PER_TILE, beginTextures, shingleTexture, texturedQuad, texturedTriangle, wallTexture, type WallStyle } from "./textures.ts";
import { decorArt, rockArt, treeArt } from "./scenery.ts";
import { burst, drawCloudShadows, drawEffects, playerPose, puff, treeShake, updateEffects, type Pose } from "./effects.ts";
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
  [T.ASH]: "#8e8a86", [T.LAVA]: "#d98a5c",
};
/** Terrain classes for inked edges: a line is drawn where the class changes. */
const EDGE_CLASS: Record<number, number> = {
  [T.GRASS]: 1, [T.DARK_GRASS]: 1, [T.PATH]: 2, [T.COBBLE]: 3, [T.SAND]: 4, [T.WATER]: 5, [T.DEEP]: 5, [T.SWAMP]: 6, [T.SNOW]: 7,
  [T.STONE]: 8, [T.WOOD]: 9, [T.GRAVEL]: 10, [T.DUNGEON]: 11, [T.BRIDGE]: 12, [T.CLIFF]: 13, [T.WALL]: 14, [T.FARMLAND]: 15, [T.ICE]: 16, [T.CARPET]: 17, [T.ASH]: 18, [T.LAVA]: 19,
};

/** The camera: a point in tiles, zoom, rotation (radians, 0 = the classic view) and pitch (screen squash, 0.5 = classic). */
export type Camera = { x: number; y: number; zoom: number; angle: number; pitch: number; base?: number };
export const PITCH = { min: 0.13, max: 0.74, classic: 0.5 } as const;
export const ZOOM = { min: 0.55, max: 3, classic: 0.8 } as const;
/** How far the land is drawn, and where the haze begins (tiles from the camera). */
const DRAW_DISTANCE = 72, HAZE_START = 48;
/** Decorations too small to matter in the far distance. */
const SMALL_DECOR = new Set(["flowers", "reeds", "lily", "rubble", "bush", "hay", "crate", "barrel"]);
export type ClickMarker = { x: number; y: number; at: number; red: boolean };
export type Firework = { at: number; color: string };
export type Scene = {
  game: Game; now: number; tickAt: number; camera: Camera; friend: GenerationSprites | null; follower: GenerationSprites | null;
  canonical: ReadonlyMap<number, GenerationSprites>; hoverTile: { x: number; y: number } | null; marker: ClickMarker | null;
  reducedMotion: boolean; hits: HitSplat[]; fireworks: Firework[]; chat: { text: string; until: number } | null; projectiles: readonly Projectile[];
  /** Plays a sound effect (swing impacts are timed by the animation). */
  sfx?: (name: string, gain?: number) => void;
  /** Time of day, 0–1 (0 midnight, 0.5 noon), or null for always day. */
  time?: number | null;
  /** Other players, and their Friends' art once it has loaded. */
  peers?: readonly PeerView[]; peerSprites?: (id: number) => GenerationSprites | null;
  /** Items other players dropped from their packs (anyone may take them). */
  peerDrops?: readonly { owner: number; u: number; id: string; n: number; x: number; y: number }[];
};
/** How dark it is (0 day … 1 deep night) and how warm the light is (dawn and dusk), for a time of day. */
export function daylight(time: number | null | undefined) {
  if (time === null || time === undefined) return { dark: 0, warm: 0, label: "Day" };
  const sun = -Math.cos(time * Math.PI * 2), dark = Math.max(0, Math.min(1, (0.25 - sun) / 0.75)), warm = Math.max(0, 1 - Math.abs(sun - 0.08) / 0.32);
  return { dark, warm, label: sun > 0.3 ? "Day" : sun < -0.3 ? "Night" : time < 0.5 ? "Dawn" : "Dusk" };
}
type Light = { x: number; y: number; r: number; color?: string; strength?: number };
/** A hex colour at an alpha, for gradients. */
const hexA = (hex: string, alpha: number) => { const n = parseInt(hex.slice(1, 7), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`; };
let nightCanvas: HTMLCanvasElement | null = null;
/** Night: a blue dark over everything, with holes burnt through it by lamps, torches, fires and your own lantern. */
function drawNight(ctx: CanvasRenderingContext2D, dark: number, warm: number, lights: readonly Light[], tint = "16,20,48") {
  if (warm > 0.01) { ctx.fillStyle = `rgba(232,150,96,${(warm * 0.16).toFixed(3)})`; ctx.fillRect(0, 0, VIEW.width, VIEW.height); }
  if (dark < 0.01) return;
  const canvas = nightCanvas ??= document.createElement("canvas");
  if (canvas.width !== VIEW.width) { canvas.width = VIEW.width; canvas.height = VIEW.height; }
  const n = canvas.getContext("2d")!;
  n.globalCompositeOperation = "source-over"; n.clearRect(0, 0, VIEW.width, VIEW.height);
  n.fillStyle = `rgba(${tint},${(0.64 * dark).toFixed(3)})`; n.fillRect(0, 0, VIEW.width, VIEW.height);
  n.globalCompositeOperation = "destination-out";
  for (const light of lights) {
    const glow = n.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r);
    const k = light.strength ?? 1;
    glow.addColorStop(0, `rgba(0,0,0,${(0.92 * k).toFixed(3)})`); glow.addColorStop(0.55, `rgba(0,0,0,${(0.5 * k).toFixed(3)})`); glow.addColorStop(1, "rgba(0,0,0,0)");
    n.fillStyle = glow; n.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
  }
  ctx.drawImage(canvas, 0, 0, VIEW.width, VIEW.height);
  // A warm glow around each flame.
  ctx.globalCompositeOperation = "lighter";
  for (const light of lights) {
    const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r * 0.6);
    const k = light.strength ?? 1;
    glow.addColorStop(0, light.color ? hexA(light.color, 0.4 * dark * k) : `rgba(120,80,30,${(0.35 * dark * k).toFixed(3)})`); glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.fillRect(light.x - light.r, light.y - light.r, light.r * 2, light.r * 2);
  }
  ctx.globalCompositeOperation = "source-over";
}
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
/** The storey you're on (set each frame): clicks land on its floor. */
let viewFloor: Floor | null = null;
/** World point → screen, standing on the ground (`lift` is extra height above it). Stored upper-storey tiles are drawn on their building, a storey up per level. */
export function toScreen(camera: Camera, x: number, y: number, lift = 0) {
  if (y >= FLOOR_Y - 0.5 && ground) { const floor = floorAt(ground, x, y); if (floor) { x -= floor.dx; y -= floor.dy; lift += floor.level * STOREY; } }
  const { rx, ry } = rotate(camera, x - camera.x, y - camera.y), half = TILE_W / 2, height = lift + groundAt(x, y) - (camera.base ?? 0);
  return { x: (rx - ry) * half * camera.zoom + VIEW.width / 2, y: ((rx + ry) * half * camera.pitch - height * liftScale(camera)) * camera.zoom + VIEW.height / 2 };
}
/** Screen → the tile under it, allowing for hills (a few refinement steps). Upstairs, it's the floor you're on where it covers. */
export function toTile(camera: Camera, sx: number, sy: number, floors = true) {
  const half = TILE_W / 2, c = Math.cos(-camera.angle), s = Math.sin(-camera.angle);
  const solve = (lift: number) => {
    let x = camera.x, y = camera.y;
    for (let step = 0; step < 4; step++) {
      const height = step ? groundAt(x, y) + lift - (camera.base ?? 0) : 0;
      const a = (sx - VIEW.width / 2) / (camera.zoom * half), b = (sy - VIEW.height / 2 + height * liftScale(camera) * camera.zoom) / (camera.zoom * half * camera.pitch);
      const rx = (a + b) / 2, ry = (b - a) / 2;
      x = camera.x + rx * c - ry * s; y = camera.y + rx * s + ry * c;
    }
    return { x: Math.round(x), y: Math.round(y) };
  };
  if (floors && viewFloor && ground) {
    const up = solve(viewFloor.level * STOREY), stored = onLevel(ground, up.x, up.y, viewFloor.level, viewFloor.complex);
    if (stored.x !== up.x || stored.y !== up.y) return stored;
  }
  return solve(0);
}
/** Draw order: further from the camera first. */
export function depthOf(camera: Camera, x: number, y: number) {
  let level = 0;
  if (y >= FLOOR_Y - 0.5 && ground) { const floor = floorAt(ground, x, y); if (floor) { x -= floor.dx; y -= floor.dy; level = floor.level; } }
  const { rx, ry } = rotate(camera, x, y); return rx + ry + level * 0.002;
}
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
/** Textures are drawn when they're big enough to see (zoomed out, flat colours are the same at a fraction of the cost). */
let texturesOn = true;
/** An isometric box on a tile footprint (w, d in tiles) and height h (world px). With a `pattern`, its faces are pixel-art textured. */
function box(ctx: CanvasRenderingContext2D, camera: Camera, x: number, y: number, w: number, d: number, h: number, top: string, left: string, right: string, lift = 0, stroke: string | null = INK, pattern: WallStyle | null = null, hidden?: (nx: number, ny: number) => boolean) {
  const p = (px: number, py: number, z: number) => { const s = toScreen(camera, px, py, z); return [s.x, s.y] as const; };
  const q = (px: number, py: number, z: number) => toScreen(camera, px, py, z);
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y - d / 2, y1 = y + d / 2, variant = Math.abs(Math.floor(x * 7 + y * 13)) % 4;
  // The four sides with their outward normals; draw the ones facing the camera, shaded by which way they face on screen.
  const sides: [number, number, number, number, number, number][] = [[x0, y1, x1, y1, 0, 1], [x1, y1, x1, y0, 1, 0], [x1, y0, x0, y0, 0, -1], [x0, y0, x0, y1, -1, 0]];
  for (const [ax, ay, bx, by, nx, ny] of sides) {
    const { rx, ry } = rotate(camera, nx, ny);
    if (rx + ry <= 0.001 || hidden?.(nx, ny)) continue;
    const fill = rx - ry < 0 ? left : right, corners = [p(ax, ay, lift), p(bx, by, lift), p(bx, by, lift + h), p(ax, ay, lift + h)] as const;
    if (pattern && texturesOn && fill.startsWith("#") && Math.abs(corners[1][0] - corners[0][0]) + Math.abs(corners[3][1] - corners[0][1]) > 10) {
      const length = Math.hypot(bx - ax, by - ay);
      texturedQuad(ctx, wallTexture(pattern, fill, variant), q(ax, ay, lift + h), q(bx, by, lift + h), q(ax, ay, lift), length * TEX_PER_TILE, h * TEX_PER_HEIGHT);
      poly(ctx, corners, null, stroke);
    } else poly(ctx, corners, fill, stroke);
  }
  const lid = [p(x0, y0, lift + h), p(x1, y0, lift + h), p(x1, y1, lift + h), p(x0, y1, lift + h)] as const;
  if (pattern && texturesOn && pattern === "cap" && top.startsWith("#")) { texturedQuad(ctx, wallTexture("cap", top, variant), q(x0, y0, lift + h), q(x1, y0, lift + h), q(x0, y1, lift + h), w * TEX_PER_TILE, d * TEX_PER_TILE); poly(ctx, lid, null, stroke); }
  else poly(ctx, lid, top, stroke);
}

// ---------- Terrain ----------
const CONTOUR = 10;
/** Shaded terrain fills, cached (the same few hundred colours every frame). */
const fillCache = new Map<number, string>();
const terrainFill = (terrain: number, variation: number) => {
  const key = terrain * 1000 + Math.round((variation + 0.5) * 400);
  let fill = fillCache.get(key);
  if (!fill) { fill = shade(TERRAIN_COLORS[terrain] ?? "#cccccc", variation); fillCache.set(key, fill); }
  return fill;
};
const isWaterTerrain = (terrain: number) => terrain === T.WATER || terrain === T.DEEP;
function drawTerrain(ctx: CanvasRenderingContext2D, scene: Scene, x0: number, y0: number, x1: number, y1: number) {
  const { camera, game, now } = scene, world = game.world, z = camera.zoom, hw = TILE_W / 2 * z, hh = hw * camera.pitch;
  const t = scene.reducedMotion ? 0 : now / 1000;
  // Screen offsets of half a tile along world x and y: tile corners are centre ± ex ± ey at any camera angle.
  const flat = (dx: number, dy: number) => { const { rx, ry } = rotate(camera, dx, dy); return { x: (rx - ry) * TILE_W / 2 * z, y: (rx + ry) * TILE_W / 2 * camera.pitch * z }; };
  const o = { x: 0, y: 0 }, px = flat(0.5, 0), py = flat(0, 0.5);
  const ex = { x: px.x - o.x, y: px.y - o.y }, ey = { x: py.x - o.x, y: py.y - o.y }, ls = liftScale(camera);
  // Inked edges and contour lines go into two paths, stroked once. Texture is left off tiles too small or far to show it.
  const edges = new Path2D(), contours = new Path2D(), small = hh < 5, near = 34;
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
    ctx.fillStyle = terrainFill(terrain, variation); ctx.fill();
    // Texture details.
    const h = hash(y, x), detailed = !small && Math.abs(x - camera.x) + Math.abs(y - camera.y) < near;
    if (detailed) {
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
        case T.LAVA: {
        const glowing = 0.5 + Math.sin(t * 2 + x * 1.3 + y * 0.7) * 0.5;
        ctx.fillStyle = `rgba(250,${200 + Math.round(glowing * 40)},120,${0.25 + glowing * 0.35})`; ctx.beginPath(); ctx.ellipse(sx + (h - 0.5) * hw * 0.6, sy, 7 * z, 3 * z, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case T.ASH: if (h < 0.4) { ctx.fillStyle = "rgba(22,22,22,0.22)"; ctx.fillRect(sx + (h - 0.2) * hw, sy + (hash(x + 2, y) - 0.5) * hh, 2 * z, 1.5 * z); } break;
      case T.SWAMP: if (h < 0.35) ellipse(ctx, sx + (h - 0.2) * hw, sy, 5 * z, 2.5 * z, "rgba(60,70,50,0.18)", null); break;
        case T.DUNGEON: if (h < 0.25) { ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.moveTo(sx - 6 * z, sy); ctx.lineTo(sx, sy + 2 * z); ctx.lineTo(sx + 4 * z, sy - 1 * z); ctx.stroke(); } break;
        case T.CARPET: ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(sx, sy - hh * 0.6); ctx.lineTo(sx + hw * 0.6, sy); ctx.lineTo(sx, sy + hh * 0.6); ctx.lineTo(sx - hw * 0.6, sy); ctx.closePath(); ctx.stroke(); break;
      }
    }
    // Inked edges where the terrain class changes.
    const mine = EDGE_CLASS[terrain];
    const edge = (nx: number, ny: number, ax: number, ay: number, bx: number, by: number) => {
      const other = inBounds(nx, ny) ? world.tiles[ny * W + nx] : T.VOID;
      if (other === T.VOID || EDGE_CLASS[other] === mine || other === T.WALL || other === T.CLIFF) return;
      edges.moveTo(ax, ay); edges.lineTo(bx, by);
    };
    edge(x, y - 1, ax, ay, bx, by);
    edge(x + 1, y, bx, by, cx, cy);
    edge(x, y + 1, cx, cy, dx, dy);
    edge(x - 1, y, dx, dy, ax, ay);
    // Contour lines every CONTOUR pixels of height (marching squares on the tile), like a topographic map.
    if (!isWaterTerrain(terrain) && !small) {
      const lo = Math.floor(Math.min(hA, hB, hC, hD) / CONTOUR), hi = Math.floor(Math.max(hA, hB, hC, hD) / CONTOUR);
      if (hi > lo) {
        const pts: [number, number][] = [[ax, ay], [bx, by], [cx, cy], [dx, dy]], hs = [hA, hB, hC, hD];
        for (let level = lo + 1; level <= hi; level++) {
          const at = level * CONTOUR, cross: [number, number][] = [];
          for (let e = 0; e < 4; e++) {
            const h0 = hs[e], h1 = hs[(e + 1) % 4];
            if ((h0 < at) !== (h1 < at)) { const t = (at - h0) / (h1 - h0), [x0, y0] = pts[e], [x1, y1] = pts[(e + 1) % 4]; cross.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); }
          }
          for (let k = 0; k + 1 < cross.length; k += 2) { contours.moveTo(cross[k][0], cross[k][1]); contours.lineTo(cross[k + 1][0], cross[k + 1][1]); }
        }
      }
    }
  }
  ctx.strokeStyle = "rgba(22,22,22,0.16)"; ctx.lineWidth = 1; ctx.stroke(contours);
  ctx.strokeStyle = "rgba(22,22,22,0.55)"; ctx.lineWidth = Math.max(0.8, z); ctx.stroke(edges);
}

// ---------- Objects ----------
/** Pixel art scale: two world pixels per art pixel. */
const ART = 2;
function drawTree(ctx: CanvasRenderingContext2D, camera: Camera, object: WorldObject, depleted: boolean, alpha: number, shake: number) {
  const z = camera.zoom, { x: sx, y: sy } = toScreen(camera, object.x, object.y), variant = Math.floor(hash(object.x, object.y) * 4);
  if (Math.abs(object.x - camera.x) + Math.abs(object.y - camera.y) < HAZE_START) ellipse(ctx, sx, sy + 1 * z, (depleted ? 9 : 17) * z, (depleted ? 4 : 7) * z, "rgba(22,22,22,0.14)", null);
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
      if (object.look === "stairs") {
        // A spiral stair round a newel post: steps rising, or a stairwell going down.
        const c = (dx: number, dy: number, lift = 0) => { const p = toScreen(camera, ox + dx, oy + dy, lift); return [p.x, p.y] as const; };
        if (down) poly(ctx, [c(-0.42, -0.42), c(0.42, -0.42), c(0.42, 0.42), c(-0.42, 0.42)], "#2b2a2e", INK, 1.2);
        const steps = Array.from({ length: down ? 3 : 7 }, (_, i) => { const a = (down ? Math.PI : 0) + i * 0.8, r = 0.24; return { i, x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r }; });
        steps.sort((a, b) => depthOf(camera, a.x, a.y) - depthOf(camera, b.x, b.y));
        const post = () => box(ctx, camera, ox, oy, 0.14, 0.14, down ? 14 : 52, "#b89c86", "#9c8672", "#8a7563");
        let posted = false;
        for (const step of steps) {
          if (!posted && depthOf(camera, step.x, step.y) > depthOf(camera, ox, oy)) { post(); posted = true; }
          box(ctx, camera, step.x, step.y, 0.4, 0.4, down ? 3 : 6, "#d7d4cd", "#c8c5be", "#b3aea6", down ? 0 : step.i * 6);
        }
        if (!posted) post();
        return hit(down ? 22 : 54, 46);
      }
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
      drawMask(ctx, frame, sx, sy + 2 * z, 2.2 * z, INK, false); ellipse(ctx, sx - 9 * z, sy - 13 * z, 2 * z, 2 * z, C.butter);
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
    case "sigil_altar": {
      // A stone plinth ringed by standing stones, with the sigil's orb floating over it.
      const color = object.sigil ? item(object.sigil).icon.color : "#c7d3dc", bob = scene.reducedMotion ? 0 : Math.sin(now / 500 + ox) * 3 * z;
      const stones = [0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 + Math.PI / 4; return { x: ox + Math.cos(a) * 0.36, y: oy + Math.sin(a) * 0.36 }; }).sort((a, b) => depthOf(camera, a.x, a.y) - depthOf(camera, b.x, b.y));
      ellipse(ctx, sx, sy, 22 * z, 10 * z, `${color}55`, null);
      for (const stone of stones.slice(0, 2)) box(ctx, camera, stone.x, stone.y, 0.14, 0.14, 22, "#b3aea6", "#9a958e", "#86817a");
      box(ctx, camera, ox, oy, 0.5, 0.5, 10, "#c8c5be", "#a9a59e", "#9a968f");
      ellipse(ctx, sx, sy - 30 * z + bob, 13 * z, 13 * z, `${color}44`, null); ellipse(ctx, sx, sy - 30 * z + bob, 6 * z, 6 * z, color, INK, 1.2); ellipse(ctx, sx - 2 * z, sy - 32 * z + bob, 1.6 * z, 1.6 * z, "#ffffff", null);
      for (const stone of stones.slice(2)) box(ctx, camera, stone.x, stone.y, 0.14, 0.14, 22, "#b3aea6", "#9a958e", "#86817a");
      return hit(44, 44);
    }
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
      case "bed": box(ctx, camera, ox, oy, 0.7, 0.9, 10, "#9c8672", "#8a7563", "#7a6553"); box(ctx, camera, ox, oy + 0.08, 0.64, 0.66, 3, C.lavender, shade(C.lavender, -0.08), shade(C.lavender, -0.14), 10);
        box(ctx, camera, ox, oy - 0.3, 0.5, 0.2, 3, PAPER, "#d6d3cc", "#c8c5be", 10); box(ctx, camera, ox, oy - 0.42, 0.7, 0.08, 26, "#9c8672", "#8a7563", "#7a6553"); return hit(26);
      case "throne": {
        // Carved and gilded, with a tall rose back on the north side of its tile.
        const parts = [{ x: ox, y: oy - 0.3, draw: () => { box(ctx, camera, ox, oy - 0.3, 0.72, 0.14, 50, C.rose, shade(C.rose, -0.08), shade(C.rose, -0.14)); box(ctx, camera, ox, oy - 0.3, 0.8, 0.18, 5, C.butter, shade(C.butter, -0.1), shade(C.butter, -0.16), 50); } },
          { x: ox, y: oy + 0.05, draw: () => { box(ctx, camera, ox, oy + 0.05, 0.72, 0.6, 14, "#b8964f", "#a3843f", "#8f7334"); box(ctx, camera, ox, oy + 0.05, 0.62, 0.52, 4, C.rose, shade(C.rose, -0.08), shade(C.rose, -0.14), 14); } }];
        parts.sort((a, b) => depthOf(camera, a.x, a.y) - depthOf(camera, b.x, b.y)).forEach(part => part.draw());
        const top = toScreen(camera, ox, oy - 0.3, 58); poly(ctx, [[top.x - 6 * z, top.y + 4 * z], [top.x - 6 * z, top.y - 3 * z], [top.x - 3 * z, top.y], [top.x, top.y - 5 * z], [top.x + 3 * z, top.y], [top.x + 6 * z, top.y - 3 * z], [top.x + 6 * z, top.y + 4 * z]], C.butter, INK, 1);
        return hit(64, 40);
      }
      case "armour":
        box(ctx, camera, ox, oy, 0.4, 0.4, 3, "#8a7563", "#7a6553", "#6a5543");
        box(ctx, camera, ox, oy, 0.3, 0.16, 18, "#9fa2a6", "#8b8e92", "#76797d", 3); box(ctx, camera, ox, oy, 0.42, 0.24, 18, "#c9c2b6", "#b3ac9f", "#9d968a", 21);
        ellipse(ctx, sx, sy - 46 * z, 7 * z, 7.5 * z, "#c9c2b6"); ctx.fillStyle = INK; ctx.fillRect(sx - 4 * z, sy - 47 * z, 8 * z, 1.8 * z);
        poly(ctx, [[sx, sy - 54 * z], [sx + 3 * z, sy - 62 * z], [sx + 5 * z, sy - 53 * z]], C.rose, INK, 0.8); return hit(62, 26);
      default: return hit(10);
    }
  } finally { ctx.globalAlpha = 1; }
}
function drawIcon(ctx: CanvasRenderingContext2D, icon: Icon, x: number, y: number, size: number) {
  const art = itemArt(icon); drawPixels(ctx, art, x, y + size / 2, size / art.width);
}

// ---------- Distance haze ----------
/** A soft sky haze over the far distance (visible when the camera looks low across the land). */
function drawHaze(ctx: CanvasRenderingContext2D, camera: Camera) {
  // "Away from the camera" in the world is screen-up; find where the haze starts and where the land ends on screen.
  const c = Math.cos(-camera.angle), s = Math.sin(-camera.angle), ux = (-1 * c - -1 * s) * Math.SQRT1_2, uy = (-1 * s + -1 * c) * Math.SQRT1_2;
  const start = toScreen(camera, camera.x + ux * HAZE_START, camera.y + uy * HAZE_START).y, end = toScreen(camera, camera.x + ux * (DRAW_DISTANCE - 4), camera.y + uy * (DRAW_DISTANCE - 4)).y;
  if (start <= 0 || !(start > end)) return;
  const haze = ctx.createLinearGradient(0, Math.max(-VIEW.height, end), 0, start);
  haze.addColorStop(0, "rgba(207,215,220,0.97)"); haze.addColorStop(1, "rgba(215,220,222,0)");
  ctx.fillStyle = haze; ctx.fillRect(0, 0, VIEW.width, Math.min(VIEW.height, start));
}

// ---------- Buildings ----------
const WALL_H = 42;
const roofAlpha = new Map<number, number>();
type RoofVertex = [number, number, number];
/** The roof's corners (with an overhang) and its ridge, in world coordinates and height. */
function roofGeometry(building: Building) {
  const o = 0.3, X0 = building.x0 - 0.5 - o, X1 = building.x1 + 0.5 + o, Y0 = building.y0 - 0.5 - o, Y1 = building.y1 + 0.5 + o;
  const alongX = X1 - X0 >= Y1 - Y0, half = (alongX ? Y1 - Y0 : X1 - X0) / 2, rise = building.roof === "cone" ? 118 : Math.max(20, Math.min(48, half * 11));
  const base = WALL_H * (building.storeys ?? 1), top = base + rise, mid = alongX ? (Y0 + Y1) / 2 : (X0 + X1) / 2;
  const A: RoofVertex = [X0, Y0, base], B: RoofVertex = [X1, Y0, base], C: RoofVertex = [X1, Y1, base], D: RoofVertex = [X0, Y1, base];
  const R0: RoofVertex = alongX ? [X0, mid, top] : [mid, Y0, top], R1: RoofVertex = alongX ? [X1, mid, top] : [mid, Y1, top];
  const apex: RoofVertex = [(X0 + X1) / 2, (Y0 + Y1) / 2, top];
  return { A, B, C, D, R0, R1, apex, alongX, base, top, X0, X1, Y0, Y1 };
}
/** Whether a roof slope (eave e0–e1, rising to r0) faces the light, so it can be drawn a shade lighter. */
function rotateLit(camera: Camera, e0: RoofVertex, r0: RoofVertex) {
  // The slope's outward normal on the ground plane points from the ridge towards the eave.
  const { rx, ry } = rotate(camera, e0[0] - r0[0], e0[1] - r0[1]);
  return rx - ry < 0;
}
function roofHull(camera: Camera, building: Building) {
  const g = roofGeometry(building), points = building.roof === "flat" ? [g.A, g.B, g.C, g.D].map(([x, y]) => [x, y, g.base + 12] as RoofVertex).concat([g.A, g.B, g.C, g.D])
    : building.roof === "cone" ? [g.A, g.B, g.C, g.D, [g.apex[0], g.apex[1], g.top + 22] as RoofVertex] : [g.A, g.B, g.C, g.D, g.R0, g.R1];
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
/** One tile of a flat roof: a slab at the top of the walls, with a merlon on every other edge tile. */
function flatRoofTile(ctx: CanvasRenderingContext2D, camera: Camera, building: Building, x: number, y: number, edge: boolean, alpha: number) {
  const base = WALL_H * (building.storeys ?? 1), color = building.color;
  ctx.globalAlpha = alpha;
  box(ctx, camera, x, y, 1, 1, 5, shadeHex(color, 0.08), shadeHex(color, -0.06), shadeHex(color, -0.14), base, "rgba(22,22,22,0.35)", "cap");
  if (edge) box(ctx, camera, x, y, 1, 1, 4, shadeHex(color, 0.12), shadeHex(color, -0.04), shadeHex(color, -0.12), base + 5, INK, "brick");
  if (edge && (x + y) % 2 === 0) box(ctx, camera, x, y, 0.6, 0.6, 8, shadeHex(color, 0.14), shadeHex(color, -0.04), shadeHex(color, -0.12), base + 9, INK, "brick");
  ctx.globalAlpha = 1;
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
  if (building.roof === "cone") {
    // A pointed tower roof: four slates to a peak, with a pennant.
    // Lit faces are lighter; each is tiled in shingles.
    const faces = [[g.A, g.B], [g.B, g.C], [g.C, g.D], [g.D, g.A]].map(([a, b]) => {
      const { rx, ry } = rotate(camera, (a[1] - b[1]), (b[0] - a[0])), lit = rx - ry < 0;
      return { points: [a, b, g.apex], fill: shadeHex(building.color, lit ? 0.06 : -0.08) };
    });
    const centre = (points: RoofVertex[]) => depthOf(camera, (points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2);
    faces.sort((a, b) => centre(a.points) - centre(b.points));
    const side = g.X1 - g.X0, slant = Math.hypot(side * TEX_PER_TILE / 2, (g.top - g.base) * TEX_PER_HEIGHT);
    for (const face of faces) {
      const [a, b, c] = face.points.map(P).map(([x, y]) => ({ x, y }));
      if (texturesOn) texturedTriangle(ctx, shingleTexture(face.fill, Math.round(side * TEX_PER_TILE), Math.round(slant)), a, b, c, side * TEX_PER_TILE, slant);
      poly(ctx, face.points.map(P), texturesOn ? null : face.fill, INK, 1.2);
    }
    const [px, py] = P(g.apex), [qx, qy] = P([g.apex[0], g.apex[1], g.top + 20]), wave = reduced ? 0 : Math.sin(now / 260 + g.X0) * 2;
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
    poly(ctx, [[qx, qy], [qx + 14 * camera.zoom, qy + 3 * camera.zoom + wave], [qx, qy + 7 * camera.zoom]], C.butter, INK, 1);
    ctx.globalAlpha = 1;
    return;
  }
  const color = building.color, gable = building.walls === "stone" ? "#b9b4ab" : "#e6dcc6";
  const faces: { points: RoofVertex[]; fill: string; slope?: [RoofVertex, RoofVertex, RoofVertex, RoofVertex] }[] = g.alongX
    ? [{ points: [g.A, g.B, g.R1, g.R0], fill: shade(color, 0.07), slope: [g.A, g.B, g.R1, g.R0] }, { points: [g.D, g.C, g.R1, g.R0], fill: shade(color, -0.07), slope: [g.D, g.C, g.R1, g.R0] },
      { points: [g.A, g.D, g.R0], fill: gable }, { points: [g.B, g.C, g.R1], fill: shade(gable, -0.08) }]
    : [{ points: [g.A, g.D, g.R1, g.R0], fill: shade(color, 0.07), slope: [g.A, g.D, g.R1, g.R0] }, { points: [g.B, g.C, g.R1, g.R0], fill: shade(color, -0.07), slope: [g.B, g.C, g.R1, g.R0] },
      { points: [g.A, g.B, g.R0], fill: gable }, { points: [g.D, g.C, g.R1], fill: shade(gable, -0.08) }];
  const span = g.alongX ? g.X1 - g.X0 : g.Y1 - g.Y0, across = g.alongX ? g.Y1 - g.Y0 : g.X1 - g.X0, slopeRows = Math.hypot(across * TEX_PER_TILE / 2, (g.top - g.base) * TEX_PER_HEIGHT);
  const centre = (points: RoofVertex[]) => depthOf(camera, points.reduce((sum, v) => sum + v[0], 0) / points.length, points.reduce((sum, v) => sum + v[1], 0) / points.length);
  faces.sort((a, b) => centre(a.points) - centre(b.points));
  const at = (v: RoofVertex) => { const [x, y] = P(v); return { x, y }; };
  for (const face of faces) {
    if (!texturesOn) { poly(ctx, face.points.map(P), face.fill, INK, 1.2); continue; }
    if (face.slope) {
      // Shingles run along the ridge, from the ridge down to the eave.
      const [e0, , r1, r0] = face.slope;
      texturedQuad(ctx, shingleTexture(shadeHex(color, rotateLit(camera, e0, r0) ? 0.06 : -0.08), Math.round(span * TEX_PER_TILE), Math.round(slopeRows)), at(r0), at(r1), at(e0), span * TEX_PER_TILE, slopeRows);
    } else {
      const [a, b, c] = face.points.map(at);
      texturedTriangle(ctx, wallTexture(building.walls === "stone" ? "brick" : building.walls === "plank" ? "plank" : "timber", face.fill.startsWith("#") ? face.fill : gable), a, b, c, across * TEX_PER_TILE, (g.top - g.base) * TEX_PER_HEIGHT);
    }
    poly(ctx, face.points.map(P), null, INK, 1.2);
  }
  const [rx0, ry0] = P(g.R0), [rx1, ry1] = P(g.R1);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.lineTo(rx1, ry1); ctx.stroke();
  if (building.chimney) {
    const cx = g.alongX ? g.X1 - 1.4 : (g.X0 + g.X1) / 2 + 0.6, cy = g.alongX ? (g.Y0 + g.Y1) / 2 + 0.6 : g.Y1 - 1.4;
    box(ctx, camera, cx, cy, 0.55, 0.55, g.top - g.base + 6, "#8f8a83", "#a39e96", "#7c7771", g.base, INK, "brick");
    if (!reduced && Math.random() < 0.06) puff(cx, cy, g.top + 8);
  }
  ctx.globalAlpha = 1;
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
/** A tile of an upper floor: flagstones, boards or carpet, lifted to its storey. */
function floorTile(ctx: CanvasRenderingContext2D, camera: Camera, x: number, y: number, terrain: number) {
  const c = (dx: number, dy: number) => { const s = toScreen(camera, x + dx, y + dy); return [s.x, s.y] as const; };
  const color = shade(TERRAIN_COLORS[terrain] ?? "#c4c1ba", (hash(x, y) - 0.5) * 0.035);
  poly(ctx, [c(-0.5, -0.5), c(0.5, -0.5), c(0.5, 0.5), c(-0.5, 0.5)], color, "rgba(22,22,22,0.16)", 1);
  ctx.strokeStyle = terrain === T.CARPET ? "rgba(255,255,255,0.35)" : "rgba(22,22,22,0.14)"; ctx.lineWidth = 1; ctx.beginPath();
  if (terrain === T.WOOD) for (const t of [-0.17, 0.17]) { const [ax, ay] = c(-0.5, t), [bx, by] = c(0.5, t); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  else if (terrain === T.CARPET) { const [ax, ay] = c(0, -0.32), [bx, by] = c(0.32, 0), [cx, cy] = c(0, 0.32), [dx, dy] = c(-0.32, 0); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy); ctx.closePath(); }
  else { const [ax, ay] = c(-0.5, 0), [bx, by] = c(0.5, 0); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); }
  ctx.stroke();
}
/** Eased height of the storey you're on, so the camera rises with you up the stairs. */
let liftNow = 0;
export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { game, camera, now } = scene, world = game.world, z = camera.zoom;
  const alpha = Math.max(0, Math.min(1, (now - scene.tickAt) / TICK_MS));
  const underground = isUnderground(game.player.y);
  const dt = Math.min(0.05, Math.max(0, (now - (lastFrame || now)) / 1000)); lastFrame = now;
  // Where you really are: the storey (level) and the building complex you're in, if any.
  const here = realPoint(world, game.player.x, game.player.y), floor = floorAt(world, game.player.x, game.player.y), level = here.level;
  const inside = floor ? floor.complex : complexAt(world, here.x, here.y);
  const liftGoal = level * STOREY; liftNow = scene.reducedMotion || Math.abs(liftGoal - liftNow) > STOREY * 2 ? liftGoal : liftNow + (liftGoal - liftNow) * Math.min(1, dt * 8);
  setGround(world); viewFloor = floor; camera.base = groundHeight(world, camera.x, camera.y) + liftNow;
  texturesOn = z >= 0.7; beginTextures(ctx);
  const project = (x: number, y: number, lift = 0) => toScreen(camera, x, y, lift);
  updateEffects(game, camera, dt, scene.reducedMotion, 34 / Math.max(0.5, z));
  if (underground) { ctx.fillStyle = "#0e0e10"; ctx.fillRect(0, 0, VIEW.width, VIEW.height); }
  else { const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height); sky.addColorStop(0, "#b9c7d6"); sky.addColorStop(1, "#dcdfda"); ctx.fillStyle = sky; ctx.fillRect(0, 0, VIEW.width, VIEW.height); }
  // Visible tile bounds.
  const corners = [toTile(camera, 0, 0, false), toTile(camera, VIEW.width, 0, false), toTile(camera, 0, VIEW.height, false), toTile(camera, VIEW.width, VIEW.height, false)];
  // Low camera angles see a long way: draw out to DRAW_DISTANCE and let the haze take the rest.
  const cx = Math.round(camera.x), cy = Math.round(camera.y);
  const x0 = Math.max(cx - DRAW_DISTANCE, Math.min(...corners.map(c => c.x)) - 2), x1 = Math.min(cx + DRAW_DISTANCE, Math.max(...corners.map(c => c.x)) + 3);
  const y0 = Math.max(cy - DRAW_DISTANCE, Math.min(...corners.map(c => c.y)) - 2), y1 = Math.min(cy + DRAW_DISTANCE, Math.max(...corners.map(c => c.y)) + 3);
  drawTerrain(ctx, scene, x0, y0, x1, y1);
  drawCloudShadows(ctx, project, camera, now, z, underground, scene.reducedMotion);
  const hits: Hit[] = [], drawables: Drawable[] = [], light = underground ? { dark: 0.95, warm: 0, label: "Dark" } : daylight(scene.time), lights: Light[] = [];
  const glow = (x: number, y: number, lift: number, radius: number, color?: string, strength = 1) => { if (light.dark > 0.01) { const at = toScreen(camera, x, y, lift); if (at.x > -200 && at.x < VIEW.width + 200 && at.y > -200 && at.y < VIEW.height + 200) lights.push({ x: at.x, y: at.y, r: radius * z, color, strength }); } };
  const player = game.player, pp = interpolate(player, game, alpha), playerDepth = depthOf(camera, pp.x, pp.y), depth = (x: number, y: number) => depthOf(camera, x, y);
  const me = toScreen(camera, pp.x, pp.y), meTop = me.y - 60 * z;
  const coversPlayer = (x: number, y: number) => { const at = toScreen(camera, x, y); return Math.abs(at.x - me.x) < 34 * z && at.y > meTop && at.y - 95 * z < me.y; };
  const playerFacing = screenFacing(camera, player.heading);
  /** Ground tiles under the storey you stand on are covered: nothing there is drawn but the outer walls. */
  const covered = (x: number, y: number) => level > 0 && inside !== null && complexAt(world, x, y) === inside;
  /** An outer wall of your building (it shows on every storey below you). */
  const outerWall = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => complexAt(world, x + dx, y + dy) !== inside);
  /** Whether something standing on a tile is drawn: your storey only, and nothing under it. */
  const shown = (x: number, y: number, margin = 0) => {
    if (y >= FLOOR_Y - 0.5) { const on = floorAt(world, x, y); return !!on && !!floor && on.complex === floor.complex && on.level === level; }
    return x >= x0 - margin && x <= x1 && y >= y0 - margin && y <= y1 && !covered(Math.round(x), Math.round(y));
  };
  // Hover highlight and click marker.
  const tileOutline = (tx: number, ty: number, color: string) => { const c = (dx: number, dy: number) => { const s = toScreen(camera, tx + dx, ty + dy); return [s.x, s.y] as const; }; poly(ctx, [c(-0.5, -0.5), c(0.5, -0.5), c(0.5, 0.5), c(-0.5, 0.5)], null, color, 1.5); };
  if (scene.hoverTile && !floor) tileOutline(scene.hoverTile.x, scene.hoverTile.y, "rgba(22,22,22,0.35)");
  /** A wall tile: storeys of brick (with windows on buildings), cut low when it stands between you and the camera inside. */
  const wall = (x: number, y: number, storeys: number, cut: boolean, near: boolean, windows: boolean, battlement = false, style: Building["walls"] = "stone") => {
    const d = depth(x, y), dungeon = isUnderground(y), timber = style === "timber";
    // Under a roof you can see, a wall's inward faces can't be seen: skip them (they're half the work).
    const owner = !dungeon && inBounds(x, y) ? world.buildingAt[y * W + x] : 0, roofed = owner > 0 && (roofAlpha.get(owner - 1) ?? 0) > 0.95 && !cut;
    const hidden = roofed ? (nx: number, ny: number) => { const tx = x + nx, ty = y + ny; return inBounds(tx, ty) && world.buildingAt[ty * W + tx] === owner && world.tiles[ty * W + tx] !== T.WALL; } : undefined;
    drawables.push({ depth: d, draw: () => {
      ctx.globalAlpha = near ? 0.3 : 1;
      const [top, left, right] = dungeon ? ["#4a4950", "#3a3940", "#2f2e35"] : timber ? ["#8a6a50", "#e6dcc6", "#cfc4ab"] : style === "plank" ? ["#8a6a50", "#b89c7e", "#9c8266"] : ["#b9b4ab", "#a39e95", "#8f8a82"];
      const plain: WallStyle = dungeon ? "dungeon" : timber ? "timber" : style === "plank" ? "plank" : "brick", glazed: WallStyle = timber ? "timber_window" : "window";
      if (dungeon) box(ctx, camera, x, y, 1, 1, 34, top, left, right, 0, INK, "dungeon");
      else if (cut) box(ctx, camera, x, y, 1, 1, 9, top, left, right, 0, INK, plain);
      else if (battlement) { box(ctx, camera, x, y, 1, 1, 12, top, left, right, 0, INK, "brick"); if ((Math.round(x) + Math.round(y)) % 2 === 0) box(ctx, camera, x, y, 0.62, 0.62, 10, top, left, right, 12, INK, "brick"); }
      else for (let k = 0; k < storeys; k++) box(ctx, camera, x, y, 1, 1, WALL_H, top, left, right, k * WALL_H, INK, windows && hash(x, y + k * 7) < 0.34 ? glazed : plain, hidden);
      ctx.globalAlpha = 1;
    } });
  };
  /** A world object on a tile (trees, rocks, stations, decor). Out in the haze, the smallest decorations are left off. */
  const object = (x: number, y: number) => {
    const object = objectAtTile(world, x, y);
    if (!object || object.name === "__removed") return;
    if (object.kind === "decor" && SMALL_DECOR.has(object.decor!) && Math.abs(x - camera.x) + Math.abs(y - camera.y) > HAZE_START) return;
    if (object.decor === "lamp") glow(x, y, 48, 150); else if (object.decor === "torch") glow(x, y, 32, 120);
    else if (object.kind === "furnace" || object.kind === "range") glow(x, y, 16, 110); else if (object.kind === "altar") glow(x, y, 26, 70); else if (object.kind === "sigil_altar") glow(x, y, 30, 90);
    const d = depth(x, y) + (object.kind === "wheat" || object.kind === "spot" ? -0.4 : 0);
    drawables.push({ depth: d, draw: () => {
      let rect: { x: number; y: number; w: number; h: number };
      const tall = object.kind === "tree" || (object.kind === "decor" && ["pine", "windmill", "palm", "pillar", "tent"].includes(object.decor!));
      // Anything tall in front of your Friend that covers it on screen turns see-through (works at any angle and zoom).
      const fade = tall && d > playerDepth + 0.3 && coversPlayer(x, y) ? 0.35 : 1;
      if (object.kind === "tree") rect = drawTree(ctx, camera, object, game.depleted.has(object.id), fade, scene.reducedMotion ? 0 : treeShake(game, object.id, now));
      else if (object.kind === "rock") rect = drawRock(ctx, camera, object, game.depleted.has(object.id));
      else if (object.kind === "spot") rect = drawSpot(ctx, camera, object, now, scene.reducedMotion);
      else if (object.kind === "decor") rect = drawDecor(ctx, scene, object, fade);
      else rect = drawStation(ctx, scene, object);
      if (object.kind !== "decor" || object.decor === "chest") hits.push({ ...rect, pick: { kind: "object", id: object.id } });
    } });
  };
  // Static objects, walls and cliffs on the ground.
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inBounds(x, y)) continue;
    const terrain = world.tiles[y * W + x];
    if (terrain === T.WALL) {
      const owner = world.buildingAt[y * W + x], building = owner ? world.buildings[owner - 1] : null, mine = inside !== null && complexAt(world, x, y) === inside;
      if (mine && level > 0 && !outerWall(x, y)) continue;
      const d = depth(x, y), cut = mine && level === 0 && d > playerDepth - 0.5;
      const near = !mine && Math.abs(x - pp.x) + Math.abs(y - pp.y) < 7 && d > playerDepth + 0.5 && !floor;
      // Tall buildings show every storey from outside; inside, only the storey you're on (and the ones below).
      wall(x, y, mine ? 1 : building?.storeys ?? 1, cut, near, !!owner && !cut, false, building?.walls ?? "stone");
    } else if (terrain === T.CLIFF) drawables.push({ depth: depth(x, y), draw: () => box(ctx, camera, x, y, 1, 1, 22 + hash(x, y) * 10, "#a39e96", "#8f8a83", "#7c7771") });
    if (!covered(x, y)) object(x, y);
  }
  // The storeys you've climbed: outer walls of the ones below, and the floor you stand on with its walls and furniture.
  if (floor) for (const storey of world.floors) {
    if (storey.complex !== floor.complex || storey.level > level) continue;
    for (let ry = storey.y0; ry <= storey.y1; ry++) for (let rx = storey.x0; rx <= storey.x1; rx++) {
      const x = rx + storey.dx, y = ry + storey.dy, terrain = world.tiles[y * W + x];
      if (terrain === T.VOID) continue;
      const owner = world.buildingAt[ry * W + rx], building = owner ? world.buildings[owner - 1] : null;
      if (terrain === T.WALL) {
        if (storey.level < level && !outerWall(rx, ry)) continue;
        // On the roof, the keep's walls are battlements; the towers carry on up. Walls of the part you're in (the keep, or a
        // tower you've stepped into) drop to a cutaway between you and the camera.
        const battlement = (building?.storeys ?? 1) <= storey.level, yours = !!building && here.x >= building.x0 && here.x <= building.x1 && here.y >= building.y0 && here.y <= building.y1;
        wall(x, y, 1, storey.level === level && !battlement && yours && depth(x, y) > playerDepth - 0.5, false, !!owner, battlement, building?.walls ?? "stone");
        continue;
      }
      if (storey.level !== level) continue;
      drawables.push({ depth: depth(x, y) - 0.45, draw: () => floorTile(ctx, camera, x, y, terrain) });
      object(x, y);
    }
  }
  // Fires.
  for (const fire of game.fires) {
    if (!shown(fire.x, fire.y)) continue;
    glow(fire.x, fire.y, 10, 170);
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
    if (!shown(entry.x, entry.y)) continue;
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
  // Other players' drops, drawn like your own; "pground" picks index into scene.peerDrops.
  (scene.peerDrops ?? []).forEach((drop, index) => {
    if (!shown(drop.x, drop.y) || !isItem(drop.id)) return;
    drawables.push({ depth: depth(drop.x, drop.y) - 0.29, draw: () => {
      const s = toScreen(camera, drop.x, drop.y), size = 22 * z, ox = ((index % 3) - 1) * 5 * z;
      drawIcon(ctx, item(drop.id).icon, s.x + ox, s.y - 3 * z, size);
      hits.push({ x: s.x + ox - size / 2, y: s.y - 3 * z - size / 2, w: size, h: size, pick: { kind: "pground", id: index } });
    } });
  });
  // NPCs.
  for (const npc of game.npcs) {
    if (!shown(npc.x, npc.y)) continue;
    const at = interpolate(npc, game, alpha);
    drawables.push({ depth: depth(at.x, at.y) + 0.1, draw: () => drawNpc(ctx, scene, npc, at, hits) });
  }
  // Monsters.
  for (const monster of game.monsters) {
    if (monster.dead || !shown(monster.x, monster.y, 2)) continue;
    const at = interpolate(monster, game, alpha), size = monster.def.size ?? 1;
    drawables.push({ depth: depth(at.x + (size - 1) / 2, at.y + (size - 1) / 2) + (size - 1) / 2 + 0.1, draw: () => drawMonster(ctx, scene, monster, at, hits) });
  }
  // Other players, walking their own adventures through yours.
  for (const peer of scene.peers ?? []) {
    if (!shown(peer.x, peer.y)) continue;
    drawables.push({ depth: depth(peer.x, peer.y) + 0.12, draw: () => drawPeer(ctx, scene, peer, hits) });
  }
  // Your follower: an owned Friend walking the tiles you leave behind, animated like any NPC.
  if (scene.follower && game.pet && (shown(game.pet.x, game.pet.y) || realPoint(world, game.pet.x, game.pet.y).level === level)) {
    const pet = game.pet, at = interpolate(pet, game, alpha);
    drawables.push({ depth: depth(at.x, at.y) + 0.05, draw: () => {
      const s = toScreen(camera, at.x, at.y), facing = screenFacing(camera, pet.heading);
      ellipse(ctx, s.x, s.y, 11 * z, 4.5 * z, "rgba(22,22,22,0.16)", null);
      drawMask(ctx, friendRows(scene.follower!, facing, at.moving, at.moving ? Math.floor(now / 90) % 8 : 0), s.x, s.y + 2 * z, 2.6 * z);
    } });
  }
  if (scene.hoverTile && floor) { const hover = scene.hoverTile; drawables.push({ depth: depth(hover.x, hover.y) - 0.4, draw: () => tileOutline(hover.x, hover.y, "rgba(22,22,22,0.35)") }); }
  // The player.
  const pose = playerPose(game, now, project, scene.reducedMotion, scene.sfx);
  // Roofs: every building's roof, fading out when you walk in or when it would hide you. In a castle, the only roofs
  // left are the towers' above the storey you stand on, from outside them.
  if (!underground) world.buildings.forEach((building, index) => {
    if (building.roof === "none" || building.x1 < x0 - 4 || building.x0 > x1 + 4 || building.y1 < y0 - 4 || building.y0 > y1 + 4) return;
    const front = Math.max(depth(building.x0, building.y0), depth(building.x1, building.y0), depth(building.x0, building.y1), depth(building.x1, building.y1)) + 0.5;
    const complex = building.complex ?? `#${index + 1}`, within = here.x >= building.x0 && here.x <= building.x1 && here.y >= building.y0 && here.y <= building.y1;
    const shows = complex !== inside || (level > 0 && level === (building.storeys ?? 1) - 1 && !within);
    const fade = () => {
      const hull = roofHull(camera, building), me = toScreen(camera, pp.x, pp.y, 20);
      const target = !shows ? 0 : playerDepth < front && pointInPolygon(me.x, me.y, hull) ? 0.22 : 1;
      const current = roofAlpha.get(index) ?? target, next = scene.reducedMotion ? target : current + (target - current) * Math.min(1, dt * 9);
      roofAlpha.set(index, next);
      return next;
    };
    if (building.roof === "flat") {
      // Flat roofs are laid tile by tile, sorted with the walls, and only over this building's own tiles (so a keep's
      // battlements never cut across its towers).
      const alphaNow = fade();
      if (alphaNow <= 0.02) return;
      const own = (x: number, y: number) => inBounds(x, y) && world.buildingAt[y * W + x] === index + 1;
      for (let y = building.y0; y <= building.y1; y++) for (let x = building.x0; x <= building.x1; x++) {
        if (!own(x, y)) continue;
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !own(x + dx, y + dy) && complexAt(world, x + dx, y + dy) !== complex);
        drawables.push({ depth: depth(x, y) + 0.45, draw: () => flatRoofTile(ctx, camera, building, x, y, edge, alphaNow) });
      }
      return;
    }
    drawables.push({ depth: front, draw: () => { const next = fade(); if (next > 0.02) drawRoof(ctx, camera, building, next, now, scene.reducedMotion); } });
  });
  drawables.push({ depth: playerDepth + 0.15, draw: () => {
    // Agility: glide from the start to the landing with a hop.
    let at = pp;
    if (player.activity?.kind === "obstacle") { const a = player.activity, total = world.objects[a.objectId].obstacle?.ticks ?? 3, k = Math.max(0, Math.min(1, 1 - (a.timer - alpha) / total)); at = { x: a.from.x + (a.to.x - a.from.x) * k, y: a.from.y + (a.to.y - a.from.y) * k, moving: true }; }
    const emote = player.emote && game.tick < player.emote.until ? player.emote : null, emoteT = emote ? (game.tick - emote.start + alpha) * TICK_MS / 1000 : 0;
    const motion = emote ? emoteMotion(emote.id, emoteT, playerFacing, scene.reducedMotion) : null;
    const s = toScreen(camera, at.x, at.y, pose.hop + (motion?.hop ?? 0)), feet = toScreen(camera, at.x, at.y), px = 3.2 * z, walking = at.moving || (!!player.path.length && alpha < 1);
    const facing: Facing = motion?.facing ?? (pose.target ? (pose.side < 0 ? "left" : "right") : playerFacing);
    if (emote) { const capeColor = player.equipment.cape && isItem(player.equipment.cape) ? item(player.equipment.cape).icon.color : undefined; emoteParticles(emote.id, emoteT, at.x, at.y, scene.reducedMotion, capeColor); if (emote.id === "skillcape") skillcapeRays(ctx, feet.x, feet.y - 30 * z, z, now, capeColor ?? "#e2d49e", scene.reducedMotion); }
    ellipse(ctx, feet.x, feet.y, 15 * z, 6 * z, "rgba(22,22,22,0.2)", "rgba(255,255,255,0.75)", 1.5);
    const bodyY = s.y - pose.bob * z;
    // Your Friend with its worn pieces composited into the same pixel frame (leaning and squashing for emotes).
    const restoreMotion = applyMotion(ctx, motion, s.x, s.y);
    drawAuras(ctx, player.worn, s.x, bodyY, px, now, scene.reducedMotion, "back");
    const stride = walking ? Math.floor(now / 80) % 8 : 0, cloth = scene.reducedMotion ? 0 : walking ? stride % 4 : Math.floor(now / 520) % 4;
    const dressed = [...player.worn, ...(player.equipment.cape ? [player.equipment.cape] : []), ...(player.equipment.head ? [player.equipment.head] : [])];
    if (scene.friend) drawFigure(ctx, figureArt(friendRows(scene.friend, facing, walking, stride), dressed, facing, cloth), s.x, bodyY + 2 * z, px, pose.alpha);
    else ellipse(ctx, s.x, bodyY - 20 * z, 12 * z, 16 * z, INK);
    drawAuras(ctx, player.worn, s.x, bodyY, px, now, scene.reducedMotion, "front");
    drawHeld(ctx, scene, pose, s.x, bodyY, px, facing, project);
    restoreMotion();
    if (motion?.text) overheadText(ctx, motion.text, s.x, s.y - 74 * z, "#ffffff");
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
  // Projectiles: spells fly as glowing comets with sparks (by element), arrows turn in flight, dragonfire roars; all of
  // them light the ground in the dark.
  for (const projectile of scene.projectiles) {
    // Spells take a little longer in the air than a tick, so the comet is seen crossing.
    const span = Math.max(projectile.style === "magic" ? 1.5 : 1, projectile.end - projectile.start + 1), progress = (game.tick - projectile.start + alpha) / span;
    if (progress < 0 || progress > 1) continue;
    const lift0 = projectile.style === "fire" ? 34 : 28, lift1 = 24, arc = projectile.style === "arrow" ? 14 : projectile.style === "fire" ? 6 : 20;
    const at = (t: number) => { const a = toScreen(camera, projectile.from.x, projectile.from.y, lift0), b = toScreen(camera, projectile.to.x, projectile.to.y, lift1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * arc * z }; };
    const head = at(progress), wx = projectile.from.x + (projectile.to.x - projectile.from.x) * progress, wy = projectile.from.y + (projectile.to.y - projectile.from.y) * progress;
    const look = MAGIC_LOOKS[projectile.element ?? ""] ?? { core: "#ffffff", glow: projectile.color, spark: projectile.color };
    if (!castFlashed.has(projectile) && projectile.style !== "arrow") {
      castFlashed.add(projectile);
      if (!scene.reducedMotion) burst("spark", projectile.from.x, projectile.from.y, lift0, 8, projectile.style === "fire" ? "#ffd27a" : look.spark, { speed: 0.6, up: 30, life: 0.5, size: 2 });
    }
    if (progress > 0.94 && !impacted.has(projectile)) {
      impacted.add(projectile);
      if (!scene.reducedMotion && projectile.style !== "arrow") {
        burst("spark", projectile.to.x, projectile.to.y, lift1, 16, projectile.style === "fire" ? "#ffb060" : look.spark, { speed: 1.3, up: 50, life: 0.7, size: 2.5 });
        burst("ring", projectile.to.x, projectile.to.y, 2, 1, projectile.style === "fire" ? "#f08a4b" : look.glow, { speed: 0, up: 0, life: 0.6, size: 2 });
      }
    }
    if (projectile.style === "arrow") {
      // A shaft pointed along its flight, head first.
      const next = at(Math.min(1, progress + 0.04)), angle = Math.atan2(next.y - head.y, next.x - head.x), len = 13 * z;
      ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(angle);
      ctx.strokeStyle = INK; ctx.lineWidth = 3.4 * Math.max(0.8, z); ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len * 0.4, 0); ctx.stroke();
      ctx.strokeStyle = "#9c7a5c"; ctx.lineWidth = 1.6 * Math.max(0.8, z); ctx.stroke();
      poly(ctx, [[len * 0.4, -3 * z], [len * 0.9, 0], [len * 0.4, 3 * z]], projectile.color, INK, 1);
      poly(ctx, [[-len, 0], [-len - 3 * z, -3 * z], [-len + 4 * z, 0], [-len - 3 * z, 3 * z]], "#f7f5f0", INK, 1);
      ctx.restore();
      continue;
    }
    ctx.globalCompositeOperation = "lighter";
    if (projectile.style === "fire") {
      // Dragonfire: a rolling ball of flame with a smoky tail.
      for (let k = 7; k >= 0; k--) {
        const t = progress - k * 0.045;
        if (t < 0) continue;
        const p = at(t), flick = scene.reducedMotion ? 0 : Math.sin(now / 45 + k * 1.7) * 2 * z, r = (13 - k * 1.2) * z + flick;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.6);
        g.addColorStop(0, `rgba(255,236,160,${0.7 - k * 0.07})`); g.addColorStop(0.45, `rgba(240,130,60,${0.55 - k * 0.06})`); g.addColorStop(1, "rgba(120,40,20,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      if (!scene.reducedMotion && Math.random() < 0.7) burst("spark", wx, wy, lift0, 1, Math.random() < 0.5 ? "#ffd27a" : "#f08a4b", { speed: 0.25, up: 20, life: 0.5, size: 2 });
      glow(wx, wy, lift0, 180, "#f08a4b");
      continue;
    }
    // A spell, shaped by its element: a flame, a wave, a whirlwind, a boulder, a curse's smoke, or a star.
    const ahead = at(Math.min(1, progress + 0.05)), angle = Math.atan2(ahead.y - head.y, ahead.x - head.x);
    ctx.globalCompositeOperation = "source-over";
    drawSpell(ctx, projectile.element ?? "", look, head, angle, at, progress, z, scene.reducedMotion ? 0 : now);
    if (!scene.reducedMotion) {
      const trail = SPELL_TRAILS[projectile.element ?? ""] ?? SPELL_TRAILS.moon;
      if (Math.random() < trail.chance) burst(trail.kind, wx, wy, 24 + Math.random() * 6, 1, Math.random() < 0.5 ? look.spark : look.glow, { speed: trail.speed, up: trail.up, life: trail.life, size: trail.size, gravity: trail.gravity });
    }
    glow(wx, wy, 26, 140, look.glow);
  }
  drawEffects(ctx, project, world, now, z);
  if (!underground) drawHaze(ctx, camera);
  // Night falls over the land (your Friend carries a small light; a lantern familiar a bigger one).
  // Your own light is faint: enough to see your feet by (a lantern familiar does better).
  if (light.dark > 0.01 || light.warm > 0.01) { const lantern = player.worn.includes("lantern_familiar"); glow(pp.x, pp.y, 24, lantern ? 120 : underground ? 70 : 55, undefined, lantern ? 0.6 : 0.3); drawNight(ctx, light.dark, light.warm, lights, underground ? "6,6,10" : undefined); }
  // Click marker: an old-school cross, yellow for walking, red for actions.
  if (scene.marker && now - scene.marker.at < 450) {
    const s = toScreen(camera, scene.marker.x, scene.marker.y), k = 1 - (now - scene.marker.at) / 450, r = 8 * z * (0.6 + k * 0.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s.x - r, s.y - r / 2); ctx.lineTo(s.x + r, s.y + r / 2); ctx.moveTo(s.x + r, s.y - r / 2); ctx.lineTo(s.x - r, s.y + r / 2); ctx.stroke();
    ctx.strokeStyle = scene.marker.red ? "#e07a7a" : "#f2e28f"; ctx.lineWidth = 2; ctx.stroke();
  }
  lastHits = hits;
}
/** Items held upright rather than swung: staffs (art drawn on a diagonal) and bows (art already upright). */
function uprightHold(id: string): "staff" | "bow" | null {
  const equip = isItem(id) ? item(id).equip : undefined;
  return equip?.staff ? "staff" : equip?.bow ? "bow" : null;
}
/** Draw a staff standing on its foot in the hand, or a bow held up by its grip. */
function drawUpright(ctx: CanvasRenderingContext2D, art: HTMLCanvasElement, hx: number, hy: number, px: number, side: number, kind: "staff" | "bow", tilt = 0) {
  const size = (kind === "staff" ? 15 : 12) * px;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(side, 1); ctx.imageSmoothingEnabled = false;
  if (kind === "staff") { ctx.rotate(-0.68 + tilt); ctx.drawImage(art, -size * 0.16, -size * 0.72, size, size); }
  else { ctx.rotate(-0.08 - tilt); ctx.drawImage(art, -size * 0.55, -size * 0.62, size, size); }
  ctx.restore();
}
/** How each element's spells look in flight. */
const MAGIC_LOOKS: Record<string, { core: string; glow: string; spark: string }> = {
  wind: { core: "#ffffff", glow: "#bfe4f2", spark: "#ffffff" }, water: { core: "#e6f2ff", glow: "#5f9be0", spark: "#bfe0ff" },
  earth: { core: "#f0dcae", glow: "#b08850", spark: "#d8c49a" }, fire: { core: "#fff2b0", glow: "#f08a4b", spark: "#ffd27a" },
  hollow: { core: "#efe2ff", glow: "#8a62c8", spark: "#c7a8f0" }, moon: { core: "#ffffff", glow: "#c6bed4", spark: "#efe2ff" }, gold: { core: "#fff6c8", glow: "#e2c46a", spark: "#fff0a0" },
};
const castFlashed = new WeakSet<object>(), impacted = new WeakSet<object>();
/** What each element leaves behind it in the air. */
const SPELL_TRAILS: Record<string, { kind: "spark" | "puff" | "drop" | "dust" | "glow"; chance: number; speed: number; up: number; life: number; size: number; gravity?: number }> = {
  fire: { kind: "spark", chance: 0.95, speed: 0.25, up: 30, life: 0.5, size: 2.5, gravity: -20 }, water: { kind: "drop", chance: 0.8, speed: 0.3, up: 25, life: 0.45, size: 2 },
  wind: { kind: "dust", chance: 0.6, speed: 0.5, up: 5, life: 0.4, size: 1.5 }, earth: { kind: "dust", chance: 0.9, speed: 0.3, up: 4, life: 0.6, size: 2.5 },
  hollow: { kind: "puff", chance: 0.5, speed: 0.1, up: 8, life: 0.6, size: 3 }, moon: { kind: "spark", chance: 0.7, speed: 0.3, up: 10, life: 0.5, size: 2 },
};
type Screen = { x: number; y: number };
/** Draw a spell's body at `head`, flying along `angle` (radians on screen). `now` is 0 with reduced motion. */
function drawSpell(ctx: CanvasRenderingContext2D, element: string, look: { core: string; glow: string; spark: string }, head: Screen, angle: number, at: (t: number) => Screen, progress: number, z: number, now: number) {
  const aura = (radius: number, alpha: number) => { const r = radius * 1.4, g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, r); g.addColorStop(0, hexA(look.glow, alpha)); g.addColorStop(1, hexA(look.glow, 0));
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head.x, head.y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  const local = (draw: () => void, rotate = angle) => { ctx.save(); ctx.translate(head.x, head.y); ctx.rotate(rotate); ctx.scale(z * 1.5, z * 1.5); draw(); ctx.restore(); };
  const shape = (points: [number, number][], fill: string, stroke: string | null = INK, width = 1.2) => { ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width / (z * 1.5) * 1.4; ctx.stroke(); } };
  const flick = (k: number) => Math.sin(now / 55 + k * 2.1);
  switch (element) {
    case "fire": {
      // A flame bolt: a tongue of fire streaming back from a white-hot tip, flickering.
      aura(26 * z, 0.5);
      local(() => {
        shape([[9, 0], [2, -7 - flick(1) * 2], [-6, -9 + flick(2) * 2], [-4, -4], [-16 - flick(3) * 3, -6], [-10, -1], [-22 - flick(4) * 4, 1], [-10, 3], [-15 - flick(5) * 3, 8], [-4, 5], [2, 7 + flick(6) * 2]], "#e8662f");
        shape([[8, 0], [1, -4], [-8, -3 + flick(7)], [-13 - flick(8) * 2, 0], [-8, 3], [1, 4]], "#f4a64a", null);
        shape([[7, 0], [2, -2], [-4, -1], [-7, 0], [-4, 1.5], [2, 2]], "#fff2b0", null);
      });
      break;
    }
    case "water": {
      // A curling wave: a blue body, a white foam crest breaking forward, and bubbles.
      aura(22 * z, 0.45);
      local(() => {
        shape([[9, 2], [6, -5], [0, -8], [-7, -7], [-14, -3], [-18, 2 + flick(1)], [-12, 5], [-4, 6], [4, 6]], "#4f8fd8");
        shape([[9, 2], [7, -4], [2, -7], [-2, -6], [3, -4], [5, -1], [4, 2]], "#e8f4ff", null);
        ctx.strokeStyle = "#bfe0ff"; ctx.lineWidth = 1.2 / z; ctx.beginPath(); ctx.moveTo(-15, 1); ctx.quadraticCurveTo(-8, -2, -1, 1); ctx.stroke();
        for (const [bx, by, r] of [[-20, -2, 1.6], [-24, 3, 1.2], [-17, 6, 1]] as const) { ctx.fillStyle = "#e8f4ff"; ctx.beginPath(); ctx.arc(bx + flick(bx) , by, r, 0, Math.PI * 2); ctx.fill(); }
      });
      break;
    }
    case "wind": {
      // A whirlwind: three spinning gusts around a pale eye, with streaks behind.
      aura(20 * z, 0.35);
      const spin = now / 70;
      local(() => {
        ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) {
          const a = spin + i * Math.PI * 2 / 3;
          ctx.strokeStyle = INK; ctx.lineWidth = 3.4 / z * z; ctx.beginPath(); ctx.arc(0, 0, 7, a, a + 2.1); ctx.stroke();
          ctx.strokeStyle = i ? "#e6f4fa" : "#ffffff"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, 0, 7, a, a + 2.1); ctx.stroke();
        }
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = "butt";
      }, 0);
      local(() => { ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.beginPath();
        for (const [y, l] of [[-4, 14], [0, 20], [4, 12]] as const) { ctx.moveTo(-9, y); ctx.lineTo(-9 - l, y + flick(y) * 0.8); } ctx.stroke(); ctx.lineCap = "butt"; });
      break;
    }
    case "earth": {
      // A boulder tumbling end over end, cracked, shedding grit.
      aura(16 * z, 0.25);
      local(() => {
        shape([[-7, -5], [-1, -8], [6, -6], [8, 1], [4, 7], [-4, 7], [-8, 2]], "#a07a4a", INK, 1.5);
        shape([[-5, -4], [-1, -6], [3, -5], [0, -2], [-4, -1]], "#c8a26e", null);
        ctx.strokeStyle = "#5e4428"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(2, 2); ctx.lineTo(1, 6); ctx.moveTo(2, 2); ctx.lineTo(6, 1); ctx.stroke();
      }, now / 110);
      break;
    }
    case "hollow": {
      // A curse: a knot of dark smoke with two pale eyes, trailing wisps.
      aura(22 * z, 0.4);
      local(() => {
        for (let i = 0; i < 4; i++) { const a = now / 120 + i * 1.6; ctx.fillStyle = hexA(i % 2 ? "#2a1f3d" : "#4a3570", 0.85); ctx.beginPath(); ctx.arc(Math.cos(a) * 3 - i * 3, Math.sin(a) * 3, 7 - i, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#e9d8ff"; ctx.fillRect(-1, -3, 2.2, 2.2); ctx.fillRect(3, -3, 2.2, 2.2);
        ctx.strokeStyle = hexA("#8a62c8", 0.8); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-8, 3); ctx.quadraticCurveTo(-14, 7 + flick(1) * 2, -20, 3); ctx.moveTo(-8, -3); ctx.quadraticCurveTo(-15, -7 + flick(2) * 2, -19, -2); ctx.stroke();
      });
      break;
    }
    default: {
      // Anything else: a turning four-point star.
      aura(20 * z, 0.45);
      local(() => { shape([[0, -9], [2, -2], [9, 0], [2, 2], [0, 9], [-2, 2], [-9, 0], [-2, -2]], look.core); shape([[0, -4], [1, -1], [4, 0], [1, 1], [0, 4], [-1, 1], [-4, 0], [-1, -1]], "#ffffff", null); }, now / 200);
    }
  }
  void at; void progress;
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
  const upright = uprightHold(id);
  if (upright && !pose.tool) {
    // Staffs stand upright in the hand (raised as a spell leaves them); bows are held up, string towards you.
    const casting = player.combat !== null && player.attackTimer >= attackSpeed(player) - 1 && !scene.reducedMotion ? Math.sin(Math.min(1, alpha * 1.4) * Math.PI) : 0;
    drawUpright(ctx, art, x + side * 7 * px, y - 3 * px - casting * 4 * px, px, side, upright, casting * 0.35);
    return;
  }
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
    const regalia = ROYAL_WEAR[npc.id];
    // The King wears his crown and cape, composited into the sprite like your own wardrobe.
    if (regalia) rect = drawFigure(ctx, figureArt(frame, regalia, screenFacing(camera, npc.heading), scene.reducedMotion ? 0 : Math.floor(now / 520) % 4), s.x, s.y + 2 * z - bob, 2.6 * z);
    else rect = drawMask(ctx, frame, s.x, s.y + 2 * z - bob, 2.6 * z, INK, screenFacing(camera, npc.heading) === "left");
  }
  hits.push({ ...rect, pick: { kind: "npc", id: npc.uid } });
  const questMarker = questMarkerFor(game, npc.id);
  if (questMarker) { const bob = scene.reducedMotion ? 0 : Math.sin(now / 300) * 2 * z; poly(ctx, [[s.x - 5 * z, s.y - 58 * z + bob], [s.x + 5 * z, s.y - 58 * z + bob], [s.x, s.y - 50 * z + bob]], questMarker); }
  const said = npcOverhead(game, npc.uid);
  if (said) overheadText(ctx, said, s.x, s.y - 50 * z, "#f2e28f");
}
const ROYAL_WEAR: Record<string, readonly string[]> = { king: ["paper_crown", "blue_cape"] };
/** Another player: their Friend (canonical art once loaded, family art until then), wardrobe, cape and weapon, a name tag (green for friends) and their chat. */
function drawPeer(ctx: CanvasRenderingContext2D, scene: Scene, peer: PeerView, hits: Hit[]) {
  const { camera, now } = scene, z = camera.zoom, turned = screenFacing(camera, { x: peer.p.hx, y: peer.p.hy || 1 });
  const motion = peer.p.emote ? emoteMotion(peer.p.emote, peer.emoteT, turned, scene.reducedMotion) : null, s = toScreen(camera, peer.x, peer.y, motion?.hop ?? 0), facing = motion?.facing ?? turned;
  if (peer.p.emote) emoteParticles(peer.p.emote, peer.emoteT, peer.x, peer.y, scene.reducedMotion, peer.p.cape && isItem(peer.p.cape) ? item(peer.p.cape).icon.color : undefined);
  const sprites = scene.peerSprites?.(peer.p.id) ?? null, stride = peer.moving ? Math.floor(now / 80) % 8 : 0;
  const rows = sprites ? friendRows(sprites, facing, peer.moving, stride) : peer.moving && Math.floor(now / 160) % 2 ? friendSprite(peer.p.family, peer.p.id).step : friendSprite(peer.p.family, peer.p.id).idle;
  const px = 3.2 * z, worn = [...peer.p.worn, ...(peer.p.cape ? [peer.p.cape] : []), ...(peer.p.head ? [peer.p.head] : [])], cloth = scene.reducedMotion ? 0 : peer.moving ? stride % 4 : Math.floor(now / 520) % 4;
  ellipse(ctx, s.x, s.y, 15 * z, 6 * z, "rgba(22,22,22,0.18)", peer.friend ? "rgba(159,224,168,0.9)" : "rgba(255,255,255,0.6)", 1.5);
  const restoreMotion = applyMotion(ctx, motion, s.x, s.y);
  drawAuras(ctx, worn, s.x, s.y, px, now, scene.reducedMotion, "back");
  const rect = drawFigure(ctx, figureArt(rows, worn, facing, cloth), s.x, s.y + 2 * z, px);
  drawAuras(ctx, worn, s.x, s.y, px, now, scene.reducedMotion, "front");
  restoreMotion();
  if (peer.p.weapon && isItem(peer.p.weapon) && uprightHold(peer.p.weapon)) drawUpright(ctx, itemArt(item(peer.p.weapon).icon), s.x + (facing === "left" ? -1 : 1) * 7 * px, s.y - 3 * px, px, facing === "left" ? -1 : 1, uprightHold(peer.p.weapon)!);
  else if (peer.p.weapon && isItem(peer.p.weapon)) {
    const art = itemArt(item(peer.p.weapon).icon), size = 12 * px, side = facing === "left" ? -1 : 1, swing = peer.p.activity && !scene.reducedMotion ? Math.sin(now / 180) * 0.6 : 0;
    ctx.save(); ctx.translate(s.x + side * 6 * px, s.y - 7 * px); ctx.scale(side, 1); ctx.rotate(0.75 + swing); ctx.imageSmoothingEnabled = false; ctx.drawImage(art, -size * 0.25, -size * 0.78, size, size); ctx.restore();
  }
  hits.push({ ...rect, pick: { kind: "peer", id: peer.p.id } });
  if (peer.p.hp < peer.p.maxHp || peer.p.fight) hpBar(ctx, s.x, rect.y - 22, peer.p.hp / Math.max(1, peer.p.maxHp), z);
  ctx.font = `bold ${Math.round(11 * Math.max(0.9, Math.min(1.4, z)))}px ui-monospace, Menlo, Consolas, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  const tag = `#${peer.p.id} (level-${peer.p.combat})`, tagY = rect.y - (peer.p.hp < peer.p.maxHp || peer.p.fight ? 26 : 2);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeText(tag, s.x, tagY); ctx.fillStyle = peer.friend ? "#9fe0a8" : "#ffffff"; ctx.fillText(tag, s.x, tagY);
  if (peer.said) overheadText(ctx, peer.said, s.x, tagY - 14);
  else if (motion?.text) overheadText(ctx, motion.text, s.x, tagY - 14, "#ffffff");
}
/** Lean and squash a figure about its feet for an emote; returns the undo. */
function applyMotion(ctx: CanvasRenderingContext2D, motion: Motion | null, x: number, feetY: number) {
  if (!motion || (motion.lean === 0 && motion.squash === 1)) return () => {};
  ctx.save(); ctx.translate(x, feetY); ctx.rotate(motion.lean); ctx.scale(1 + (1 - motion.squash) * 0.4, motion.squash); ctx.translate(-x, -feetY);
  return () => ctx.restore();
}
/** The skillcape emote: rays of the cape's colour turning behind you. */
function skillcapeRays(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, now: number, color: string, reduced: boolean) {
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const turn = reduced ? 0 : now / 900;
  for (let i = 0; i < 10; i++) {
    const a = turn + i * Math.PI / 5, r = 70 * z;
    ctx.fillStyle = hexA(color, 0.28); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - 0.1) * r, y + Math.sin(a - 0.1) * r * 0.8); ctx.lineTo(x + Math.cos(a + 0.1) * r, y + Math.sin(a + 0.1) * r * 0.8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
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
  const s = toScreen(camera, center.x, center.y), px = (size === 1 ? 2.6 : size === 2 ? 4.4 : 6.2) * z * (monster.def.id === "chicken" || monster.def.id === "ink_rat" ? 0.75 : monster.def.id === "cow" ? 0.85 : 1);
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
/** Map colours: clearer than the land's pastels, so roads, water, walls and floors read at a glance. */
const MAP_COLORS: Record<number, [number, number, number]> = {
  [T.VOID]: [14, 14, 16], [T.GRASS]: [150, 178, 122], [T.DARK_GRASS]: [118, 150, 98], [T.PATH]: [214, 186, 136], [T.COBBLE]: [196, 190, 178], [T.SAND]: [232, 212, 158],
  [T.WATER]: [96, 142, 196], [T.DEEP]: [66, 108, 170], [T.SWAMP]: [118, 130, 94], [T.SNOW]: [246, 246, 242], [T.STONE]: [176, 172, 164], [T.WOOD]: [184, 146, 104],
  [T.GRAVEL]: [168, 158, 142], [T.DUNGEON]: [84, 82, 92], [T.BRIDGE]: [150, 108, 70], [T.CLIFF]: [96, 90, 82], [T.WALL]: [34, 32, 30], [T.FARMLAND]: [176, 142, 90],
  [T.ICE]: [204, 224, 238], [T.CARPET]: [196, 118, 118], [T.ASH]: [112, 106, 102], [T.LAVA]: [226, 112, 64],
};
let mapImage: HTMLCanvasElement | null = null;
/** The whole world, one pixel per tile (built once). */
export function worldImage(world: World): HTMLCanvasElement {
  if (mapImage) return mapImage;
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!, image = ctx.createImageData(W, H);
  // Upper storeys aren't on the map: it shows the ground.
  for (let i = 0; i < W * H; i++) {
    if (i >= W * FLOOR_Y) { image.data.set([...MAP_COLORS[T.VOID], 255], i * 4); continue; }
    let [r, g, b] = MAP_COLORS[world.tiles[i]] ?? [128, 128, 128];
    const object = world.objects[world.objectAt[i]];
    if (object?.kind === "tree") [r, g, b] = [78, 116, 70];
    else if (object?.kind === "rock") [r, g, b] = [128, 112, 98];
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
    else if (object.y >= FLOOR_Y) continue;
    else if (object.look === "stairs") add(object.x, object.y, "♜", "Friendhollow Castle", 12);
    else if (object.kind === "ladder" || object.kind === "gate") add(object.x, object.y, "▼", object.name);
    else if (object.kind === "stall") add(object.x, object.y, "✋", "Market stalls");
    else if (object.kind === "obstacle" && object.obstacle?.course === "friendhollow") add(object.x, object.y, "➶", "Agility course", 30);
    else if (object.kind === "casket") add(object.x, object.y, "◆", "Rare Caskets");
    else if (object.kind === "sigil_altar") add(object.x, object.y, "◈", object.name);
  }
  for (const spawn of world.spawns) {
    if (spawn.y >= FLOOR_Y) continue;
    const def = spawn.kind === "npc" ? NPCS[spawn.id] : null;
    if (def?.shop) add(spawn.x, spawn.y, "¤", def.name);
    if (spawn.kind === "npc" && ["cook", "captain", "smith", "priest", "glimmer"].includes(spawn.id)) add(spawn.x, spawn.y, "!", `Quest: ${def!.name}`);
  }
  return icons;
}
/** The minimap: the world turned to match the camera (45° plus its rotation), centred on the player. */
export function renderMinimap(ctx: CanvasRenderingContext2D, game: Game, size: number, scale: number, angle: number, peers: readonly PeerView[] = []) {
  const world = game.world, image = worldImage(world), player = realPoint(world, game.player.x, game.player.y);
  ctx.save(); ctx.clearRect(0, 0, size, size);
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#0e0e10"; ctx.fillRect(0, 0, size, size);
  const turn = Math.PI / 4 + angle, cos = Math.cos(turn), sin = Math.sin(turn);
  ctx.translate(size / 2, size / 2); ctx.rotate(turn); ctx.scale(scale, scale); ctx.translate(-player.x - 0.5, -player.y - 0.5);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(image, 0, 0);
  // Dots for what's on your storey.
  const dot = (sx: number, sy: number, color: string, r = 0.9) => {
    const { x, y, level } = realPoint(world, sx, sy);
    if (level !== player.level || Math.abs(x - player.x) >= 40 || Math.abs(y - player.y) >= 40) return;
    ctx.fillStyle = "#161616"; ctx.fillRect(x + 0.5 - r / 2 - 0.25, y + 0.5 - r / 2 - 0.25, r + 0.5, r + 0.5);
    ctx.fillStyle = color; ctx.fillRect(x + 0.5 - r / 2, y + 0.5 - r / 2, r, r);
  };
  for (const entry of game.ground) dot(entry.x, entry.y, "#e0463c", 1);
  for (const npc of game.npcs) dot(npc.x, npc.y, "#f5e04a", 1.3);
  for (const monster of game.monsters) if (!monster.dead) dot(monster.x, monster.y, "#f5e04a", 1.3);
  if (game.pet) dot(game.pet.x, game.pet.y, "#ffffff", 1.3);
  // Other players: white, friends green.
  for (const peer of peers) dot(Math.round(peer.x), Math.round(peer.y), peer.friend ? "#7fe08f" : "#ffffff", 1.6);
  ctx.restore();
  // Map icons, drawn upright.
  ctx.save(); ctx.font = "bold 11px ui-monospace, Menlo, Consolas, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const icon of iconsCache ??= mapIcons(world)) {
    const dx = icon.x - player.x, dy = icon.y - player.y, rx = (dx * cos - dy * sin) * scale, ry = (dx * sin + dy * cos) * scale;
    if (Math.hypot(rx, ry) > size / 2 - 9) continue;
    ctx.fillStyle = ICON_FILLS[icon.glyph] ?? PAPER; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(size / 2 + rx, size / 2 + ry, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.fillText(icon.glyph, size / 2 + rx, size / 2 + ry + 0.5);
  }
  // You: a white arrow facing your direction.
  ctx.fillStyle = "#fff"; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/** Minimap click → world tile (the inverse of the minimap's turn). */
export function minimapTile(game: Game, dx: number, dy: number, scale: number, angle: number) {
  const turn = -(Math.PI / 4 + angle), cos = Math.cos(turn), sin = Math.sin(turn), x = dx / scale, y = dy / scale, here = realPoint(game.world, game.player.x, game.player.y);
  return onLevel(game.world, Math.round(here.x + x * cos - y * sin), Math.round(here.y + x * sin + y * cos), here.level);
}
let iconsCache: MapIcon[] | null = null;
/** Icon backgrounds by kind, so a bank or a quest stands out from a shop. */
const ICON_FILLS: Record<string, string> = { "◈": "#c6bed4", "$": "#f2d56b", "!": "#f5e04a", "¤": "#ffffff", "◆": "#e7a9b0", "♜": "#c6bed4", "▼": "#b7b2aa", "⛏": "#d8c4a8", "≈": "#9fc1e6", "♨": "#f0b48a", "▲": "#f0b48a", "⚒": "#c8c5be", "✚": "#ffffff", "✋": "#e8d4c0", "➶": "#b4d3a0" };
/** The world map: the whole Realm turned to match the camera, with labels. Returns the transform for clicks. */
export function renderWorldMap(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, focus: { x: number; y: number; zoom: number }, underground: boolean) {
  const world = game.world, image = worldImage(world), player = realPoint(world, game.player.x, game.player.y);
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
    return onLevel(world, Math.round(focus.x + (rx + ry) * Math.SQRT1_2 - 0.5), Math.round(focus.y + (ry - rx) * Math.SQRT1_2 - 0.5), player.level);
  };
}
