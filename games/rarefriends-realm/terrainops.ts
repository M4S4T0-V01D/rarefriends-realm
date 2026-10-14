/**
 * The development editor's terrain and painting operations (overlay.ts applies them; host/editor.tsx makes them).
 * The ground ops work on the land's own floor (`world.base`, per tile), which every corner height is built on
 * (world.ts groundHeights: the relief of the tiles round a corner, plus the average floor under them), so a saved
 * world bakes exactly as it was seen: the floor is baked in steps of 1/64 (bake.ts), and never below 0, so every
 * value written here is quantized to that and kept in [0, FLOOR_MAX]. Nothing here draws from a random stream.
 */
import { H, T, W, regionIndex, type RegionId, type World } from "./world.ts";

export type TerrainMode = "raise" | "lower" | "flatten" | "level" | "smooth" | "roughen";
export type TerrainOp =
  | { op: "terrain"; x: number; y: number; r: number; shape: "circle" | "square"; mode: TerrainMode; amount: number; falloff: number; target?: number; seed?: number }
  | { op: "slope"; x0: number; y0: number; x1: number; y1: number; w: number; h0: number; h1: number };
export type PaintOp =
  | { op: "paint"; x: number; y: number; r: number; shape: "circle" | "square"; t: number }
  | { op: "flood"; x: number; y: number; t: number; limit: number }
  | { op: "line"; x0: number; y0: number; x1: number; y1: number; w: number; t: number }
  | { op: "region"; x0: number; y0: number; x1: number; y1: number; region: string };

/** How far one step of strength moves the ground (world pixels): HEAVE_STEP, a quarter of a storey or so. */
export const TERRAIN_STEP = 16;
/** The floor's range: the bake keeps it in 16 bits of 1/64ths. */
export const FLOOR_MAX = 1000;
export const BRUSH_MAX = 32, LINE_WIDTH_MAX = 15, FLOOD_MAX = 40_000, REGION_TILES_MAX = 250_000;
const quantize = (v: number) => Math.round(Math.max(0, Math.min(FLOOR_MAX, v)) * 64) / 64;
/** Water as the shore reckons it (elevation.ts): water, deep water, bridges over it. (Asked for lazily: T isn't there while modules load.) */
export const isWaterlike = (t: number) => t === T.WATER || t === T.DEEP || t === T.BRIDGE;
/** How far round water the shore lies flat at the water's level (elevation.ts WATER_FLAT): the ground tools leave it alone. */
export const SHORE_FLAT = 2;
/** Whether a tile is water or on its flat shore (within SHORE_FLAT of water, eight ways). */
export function onShore(tiles: Uint8Array, x: number, y: number) {
  for (let dy = -SHORE_FLAT; dy <= SHORE_FLAT; dy++) for (let dx = -SHORE_FLAT; dx <= SHORE_FLAT; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H && isWaterlike(tiles[ny * W + nx])) return true; }
  return false;
}
/**
 * Painted water lies level: every body of water the painted rectangle touches takes the level of the water it was
 * already (the median floor under its tiles outside the rectangle; a new pond, its own), its new tiles and their flat
 * shore set to it, the land easing back beyond. Returns the rectangle of tiles whose floor changed, or null.
 */
export function levelPaintedWater(world: World, box: { x0: number; y0: number; x1: number; y1: number }): { x0: number; y0: number; x1: number; y1: number } | null {
  const tiles = world.tiles, CAP = 20_000, EASE = 6, base = world.base = world.base ? new Float32Array(world.base) : new Float32Array(W * H);
  const seen = new Set<number>(), inBox = (x: number, y: number) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
  const out = { x0: W, y0: H, x1: -1, y1: -1 };
  for (let y = Math.max(0, box.y0); y <= Math.min(H - 1, box.y1); y++) for (let x = Math.max(0, box.x0); x <= Math.min(W - 1, box.x1); x++) {
    const s = y * W + x; if (seen.has(s) || !isWaterlike(tiles[s])) continue;
    const body = [s], outside: number[] = [], inside: number[] = []; seen.add(s);
    for (let k = 0; k < body.length && body.length < CAP; k++) { const i = body[k], bx = i % W, by = (i - bx) / W; (inBox(bx, by) ? inside : outside).push(base[i]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = bx + dx, ny = by + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen.has(j) && isWaterlike(tiles[j])) { seen.add(j); body.push(j); } } }
    const from = (outside.length ? outside : inside).sort((p, q) => p - q), level = from[from.length >> 1];
    // The body's tiles in the rectangle, then their shore and the slope back, by distance from them.
    const dist = new Map<number, number>(), queue: number[] = [];
    for (const i of body) { const bx = i % W, by = (i - bx) / W; if (inBox(bx, by)) { dist.set(i, 0); queue.push(i); } }
    for (let h = 0; h < queue.length; h++) { const i = queue[h], bx = i % W, by = (i - bx) / W, d = dist.get(i)!; if (d >= SHORE_FLAT + EASE) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = bx + dx, ny = by + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!dist.has(j)) { dist.set(j, d + 1); queue.push(j); } } }
    for (const [i, d] of dist) {
      const bx = i % W, by = (i - bx) / W, t = d <= SHORE_FLAT || isWaterlike(tiles[i]) ? 0 : (() => { const v = (d - SHORE_FLAT) / EASE; return v * v * (3 - 2 * v); })();
      const v = quantize(level + (base[i] - level) * t); if (v === base[i]) continue;
      base[i] = v; out.x0 = Math.min(out.x0, bx); out.y0 = Math.min(out.y0, by); out.x1 = Math.max(out.x1, bx); out.y1 = Math.max(out.y1, by);
    }
  }
  return out.x1 >= 0 ? out : null;
}
/** A number from a tile and a seed, in [0, 1): the same every time. */
export const tileHash = (x: number, y: number, seed: number) => { let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

/** How much of a brush reaches a tile: 1 inside, easing to 0 at its edge over `falloff` of its radius. */
export function brushWeight(dx: number, dy: number, r: number, shape: "circle" | "square", falloff: number) {
  const d = shape === "circle" ? Math.hypot(dx, dy) : Math.max(Math.abs(dx), Math.abs(dy)), edge = r + 0.5;
  if (d > edge) return 0;
  const inner = edge * (1 - Math.max(0, Math.min(1, falloff)));
  if (d <= inner) return 1;
  const t = (edge - d) / Math.max(1e-6, edge - inner);
  return t * t * (3 - 2 * t);
}
/** The tiles a brush covers, with how much it reaches each. */
function brushTiles(x: number, y: number, r: number, shape: "circle" | "square", falloff: number, visit: (tx: number, ty: number, w: number) => void) {
  for (let ty = Math.max(0, y - r); ty <= Math.min(H - 1, y + r); ty++) for (let tx = Math.max(0, x - r); tx <= Math.min(W - 1, x + r); tx++) {
    const w = brushWeight(tx - x, ty - y, r, shape, falloff); if (w > 0) visit(tx, ty, w);
  }
}
/** Tiles within half a width of a segment, and how far along it each is (0 at the start, 1 at the end). */
function segmentTiles(x0: number, y0: number, x1: number, y1: number, width: number, visit: (tx: number, ty: number, along: number, w: number) => void) {
  const half = width / 2, dx = x1 - x0, dy = y1 - y0, length2 = dx * dx + dy * dy || 1;
  for (let ty = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1)); ty <= Math.min(H - 1, Math.ceil(Math.max(y0, y1) + half + 1)); ty++)
    for (let tx = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1)); tx <= Math.min(W - 1, Math.ceil(Math.max(x0, x1) + half + 1)); tx++) {
      const along = Math.max(0, Math.min(1, ((tx - x0) * dx + (ty - y0) * dy) / length2)), d = Math.hypot(tx - (x0 + dx * along), ty - (y0 + dy * along));
      if (d <= half + 0.5) visit(tx, ty, along, d <= half - 0.5 ? 1 : Math.max(0, half + 0.5 - d));
    }
}

/** Paint ops, on the tiles (and the regions) in place; the rectangle changed goes to `touch`. */
export function applyPaint(world: World, op: PaintOp, touch: (x0: number, y0: number, x1: number, y1: number) => void, why: string[]) {
  const tiles = world.tiles;
  if (op.op === "paint") { brushTiles(op.x, op.y, op.r, op.shape, 0, (x, y) => { tiles[y * W + x] = op.t; }); touch(op.x - op.r, op.y - op.r, op.x + op.r, op.y + op.r); }
  else if (op.op === "line") { segmentTiles(op.x0, op.y0, op.x1, op.y1, op.w, (x, y, _a, w) => { if (w >= 0.5) tiles[y * W + x] = op.t; }); const h = Math.ceil(op.w / 2) + 1; touch(op.x0 - h, op.y0 - h, op.x1 + h, op.y1 + h); }
  else if (op.op === "flood") {
    const from = tiles[op.y * W + op.x]; if (from === op.t) return;
    const limit = Math.min(op.limit, FLOOD_MAX), queue = [op.y * W + op.x], box = { x0: op.x, y0: op.y, x1: op.x, y1: op.y }; tiles[queue[0]] = op.t;
    let done = 1;
    for (let head = 0; head < queue.length && done < limit; head++) {
      const i = queue[head], x = i % W, y = (i - x) / W;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || tiles[ny * W + nx] !== from || done >= limit) continue;
        tiles[ny * W + nx] = op.t; queue.push(ny * W + nx); done++;
        box.x0 = Math.min(box.x0, nx); box.y0 = Math.min(box.y0, ny); box.x1 = Math.max(box.x1, nx); box.y1 = Math.max(box.y1, ny);
      }
    }
    if (done >= limit) why.push(`flood at ${op.x},${op.y}: stopped at ${limit} tiles`);
    touch(box.x0, box.y0, box.x1, box.y1);
  }
  else if (op.op === "region") {
    const index = regionIndex(op.region as RegionId); if (index < 0) { why.push(`region ${op.region}: no such region`); return; }
    for (let y = Math.min(op.y0, op.y1); y <= Math.max(op.y0, op.y1); y++) for (let x = Math.min(op.x0, op.x1); x <= Math.max(op.x0, op.x1); x++) world.region[y * W + x] = index;
  }
}

/**
 * The ground ops, in order, on the floor; `ground` is the corner heights as they stand before them (the buildings not
 * yet levelled). Each op reads the ground as the ops before it left it (a corner is its relief, which the floor doesn't
 * change, plus the average floor round it). Returns the rectangle of tiles whose floor changed, or null.
 */
export function applyTerrain(world: World, ground: Float32Array, ops: readonly TerrainOp[]): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!ops.length) return null;
  const CW = W + 1, start = world.base ?? new Float32Array(W * H), base = world.base = new Float32Array(start);
  const floorAt = (b: Float32Array, i: number, j: number) => { let total = 0, n = 0; for (let k = 0; k < 4; k++) { const tx = k & 1 ? i : i - 1, ty = k & 2 ? j : j - 1; if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue; total += b[ty * W + tx]; n++; } return n ? total / n : 0; };
  const corner = (i: number, j: number) => ground[j * CW + i] - floorAt(start, i, j) + floorAt(base, i, j);
  /** A tile's height now: the average of its four corners. */
  const height = (x: number, y: number) => (corner(x, y) + corner(x + 1, y) + corner(x, y + 1) + corner(x + 1, y + 1)) / 4;
  const box = { x0: W, y0: H, x1: -1, y1: -1 };
  // (Water and its flat shore aren't the ground tools' to move: water lies level.)
  const set = (x: number, y: number, v: number) => { if (onShore(world.tiles, x, y)) return; base[y * W + x] = quantize(v); box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y); box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y); };
  for (const op of ops) {
    if (op.op === "slope") {
      const changes: [number, number, number][] = [];
      segmentTiles(op.x0, op.y0, op.x1, op.y1, op.w, (x, y, along, w) => { const want = op.h0 + (op.h1 - op.h0) * along; changes.push([x, y, base[y * W + x] + (want - height(x, y)) * w]); });
      for (const [x, y, v] of changes) set(x, y, v);
      continue;
    }
    // (Every tile's change is worked out from the ground before this op, then written: a brush doesn't chase its own changes.)
    const changes: [number, number, number][] = [], step = op.amount * TERRAIN_STEP, rate = Math.min(1, op.amount / 2);
    brushTiles(op.x, op.y, op.r, op.shape, op.falloff, (x, y, w) => {
      const b = base[y * W + x];
      switch (op.mode) {
        case "raise": changes.push([x, y, b + step * w]); break;
        case "lower": changes.push([x, y, b - step * w]); break;
        case "flatten": case "level": changes.push([x, y, b + ((op.target ?? height(op.x, op.y)) - height(x, y)) * w]); break;
        case "smooth": {
          let total = 0, n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) { total += height(nx, ny); n++; } }
          changes.push([x, y, b + (total / n - height(x, y)) * w * rate]); break;
        }
        case "roughen": changes.push([x, y, b + (tileHash(x, y, op.seed ?? 0) - 0.5) * step * w]); break;
      }
    });
    for (const [x, y, v] of changes) set(x, y, v);
  }
  return box.x1 >= 0 ? box : null;
}

/** The tiles a thing may be scattered on: open ground (no water, walls, floors of buildings or bridges). (Made when first asked for: world.ts imports overlay.ts, which imports this, so T isn't there yet while modules load.) */
let scatterGround: Set<number> | null = null;
export const scatterable = (t: number) => (scatterGround ??= new Set<number>([T.GRASS, T.DARK_GRASS, T.SAND, T.SNOW, T.GRAVEL, T.SWAMP, T.ASH, T.FARMLAND, T.PATH])).has(t);
