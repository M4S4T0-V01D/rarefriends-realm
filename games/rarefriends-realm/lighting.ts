/**
 * Lighting: a small light field in world space, rebuilt every frame for the part of the Realm on screen.
 *
 * Every point of the ground is lit by
 *  - the sky: an ambient colour for the time of day, darkened where walls, trees and rocks crowd it (ambient occlusion)
 *    and under roofs, with a little sunlight bounced back up off the ground in the ground's own colour;
 *  - the sun (or the moon): a directional light whose colour, angle and length of shadow follow the day. Its shadows are
 *    drawn in screen space by the renderer (buildings as projected boxes, sprites as sheared silhouettes);
 *  - point lights (lamps, torches, fires, forges, spells, your own light): a physical falloff, with walls, rocks and
 *    trees casting shadows (a ray marched through a height map of the occluders), plus one bounce: a wider, softer lobe
 *    tinted by the ground around the light that wraps around corners, which is what makes light feel like light;
 *  - lava, which glows and lights what's around it.
 *
 * The renderer multiplies the ground by the field before anything stands on it, and tints each object by the light at its
 * own feet, so light lands on things instead of being painted over them.
 */
import { FLOOR_Y, T, W, H, type World } from "./world.ts";

export type RGB = [number, number, number];
export type PointLight = { x: number; y: number; h: number; r: number; rgb: RGB; k: number };
export type Sky = {
  ambient: RGB; sun: RGB;
  /** Where shadows fall: a unit vector on the ground (world tiles), and the rise of the sun (tan of its elevation). */
  dirX: number; dirY: number; tanE: number;
  /** 0 by day, 1 by night: how much point lights and glowing lava matter. */
  night: number;
  underground: boolean;
};

/** World pixels per tile edge (heights are in world pixels). */
const TILE_PX = 32;
const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (e0: number, e1: number, v: number) => { const t = clamp01((v - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const hexRgb = (hex: string): RGB => { const n = parseInt(hex.slice(1, 7), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export const rgbCss = (c: RGB) => `rgb(${Math.round(clamp01(c[0]) * 255)},${Math.round(clamp01(c[1]) * 255)},${Math.round(clamp01(c[2]) * 255)})`;
const luma = (c: RGB) => c[0] * 0.3 + c[1] * 0.55 + c[2] * 0.15;

// ---------- The sky ----------
const DAY_AMBIENT: RGB = [0.6, 0.64, 0.73], DAY_SUN: RGB = [0.47, 0.44, 0.38];
const GOLD_AMBIENT: RGB = [0.5, 0.43, 0.52], GOLD_SUN: RGB = [0.66, 0.42, 0.22];
const NIGHT_AMBIENT: RGB = [0.12, 0.15, 0.26], MOON: RGB = [0.07, 0.08, 0.11];
const DEEP_AMBIENT: RGB = [0.07, 0.07, 0.095];
/**
 * The sky's light for a time of day (0 midnight, 0.5 noon; null = always noon), the weather, and whether you're
 * underground. The sun rises in the east, crosses the south and sets in the west.
 */
export function skyFor(time: number | null | undefined, weather: { rain: number; storm: boolean } | null, underground: boolean): Sky {
  if (underground) return { ambient: DEEP_AMBIENT, sun: [0, 0, 0], dirX: 0, dirY: 1, tanE: 1, night: 1, underground: true };
  const t = time ?? 0.5, height = -Math.cos(t * Math.PI * 2);
  const day = smooth(-0.2, 0.3, height), golden = clamp01(1 - Math.abs(height - 0.1) / 0.32) * day;
  let ambient = mix(NIGHT_AMBIENT, mix(DAY_AMBIENT, GOLD_AMBIENT, golden), day), sun = mix(MOON, mix(DAY_SUN, GOLD_SUN, golden), day);
  // The sun by day, the moon by night (on the opposite side of the sky), each an arc from east to west.
  const up = day > 0.35, phase = up ? (t - 0.25) / 0.5 : (((t + 0.5) % 1) - 0.25) / 0.5, angle = Math.max(-0.05, Math.min(1.05, phase)) * Math.PI;
  // Shadows fall west at sunrise, north at noon (away from the camera, so the faces you see are the sunny ones), east at dusk.
  const dirX = -Math.cos(angle), dirY = -Math.max(0.12, Math.sin(angle)), length = Math.hypot(dirX, dirY);
  const tanE = up ? Math.max(0.28, 0.9 * Math.sin(Math.max(0, Math.min(1, phase)) * Math.PI)) : 1.1;
  if (weather && weather.rain > 0.01) {
    // Cloud: the sun goes, the sky greys and dims.
    const r = weather.rain, grey = luma(ambient) * 1.08;
    sun = sun.map(v => v * (1 - 0.85 * r)) as RGB;
    ambient = mix(ambient, [grey, grey * 1.01, grey * 1.06], 0.6 * r).map(v => v * (1 - (weather.storm ? 0.3 : 0.16) * r)) as RGB;
  }
  return { ambient, sun, dirX: dirX / length, dirY: dirY / length, tanE, night: 1 - day, underground: false };
}

// ---------- What's in the way: occluders, ambient occlusion, ground colour (built once per world) ----------
type Static = {
  /** Height (world px) and opacity of what stands on each tile: for point lights (walls, trees, rocks, tall things)... */
  occH: Float32Array; occA: Float32Array;
  /** ...and for the sun, which roofs block too. */
  sunH: Float32Array;
  /** Under a roof (0–1), and how open to the sky (ambient occlusion, 0–1). */
  roofed: Float32Array; ao: Float32Array;
  /** The ground's colour, blurred (for bounced light), and lava's glow spread around it. */
  albedo: Float32Array; emit: Float32Array;
};
const statics = new WeakMap<World, Static>();
/** Heights of things that stand on a tile, by kind (world px, and how much light gets through). */
const DECOR_OCCLUDERS: Record<string, [number, number]> = {
  pine: [96, 0.6], palm: [80, 0.35], dead_tree: [70, 0.3], cactus: [30, 0.7], pillar: [64, 1], windmill: [120, 1], tent: [40, 1], ruin_wall: [40, 1],
  statue: [52, 1], snowman: [24, 1], armour: [34, 1], shelf: [38, 1], throne: [30, 1], crate: [16, 1], barrel: [18, 1], hay: [16, 1], logpile: [16, 1],
  bush: [16, 0.6], chest: [12, 1], boulder: [22, 1], grave: [14, 1], fence: [12, 0.4], target: [26, 0.8], boat: [12, 1],
};
const STATION_HEIGHT: Record<string, number> = { furnace: 40, range: 30, anvil: 14, bank: 40, altar: 22, sigil_altar: 26, spinning_wheel: 24, loom: 30, coop: 34 };
function buildStatic(world: World, colors: Record<number, string>): Static {
  const N = W * H, occH = new Float32Array(N), occA = new Float32Array(N), sunH = new Float32Array(N), roofed = new Float32Array(N), ao = new Float32Array(N);
  const albedo = new Float32Array(N * 3), emit = new Float32Array(N * 3), rgb = new Map<number, RGB>();
  for (let i = 0; i < N; i++) {
    const tile = world.tiles[i], owner = world.buildingAt[i], building = owner ? world.buildings[owner - 1] : null;
    let c = rgb.get(tile); if (!c) { c = hexRgb(colors[tile] ?? "#b0b0b0"); rgb.set(tile, c); }
    albedo[i * 3] = c[0]; albedo[i * 3 + 1] = c[1]; albedo[i * 3 + 2] = c[2];
    if (tile === T.WALL) {
      const height = building ? (building.storeys ?? 1) * 42 + (building.tall ?? 0) : 42;
      occH[i] = height; occA[i] = 1; sunH[i] = height + (building && building.roof !== "none" && building.roof !== "flat" ? 24 : 0);
    } else if (tile === T.CLIFF) { occH[i] = sunH[i] = 30; occA[i] = 1; }
    else if (building && building.roof !== "none" && tile !== T.VOID) {
      // Under a roof: the sun can't reach, and the sky only through the doors and windows.
      roofed[i] = 1; sunH[i] = (building.storeys ?? 1) * 42 + 30;
    }
    if (tile === T.LAVA) { emit[i * 3] = 1; emit[i * 3 + 1] = 0.42; emit[i * 3 + 2] = 0.16; }
  }
  for (const object of world.objects) {
    if (object.name === "__removed" || object.y >= FLOOR_Y) continue;
    const i = object.y * W + object.x;
    if (i < 0 || i >= N) continue;
    let h = 0, a = 1;
    if (object.kind === "tree") { h = 88; a = 0.55; }
    else if (object.kind === "rock") { h = 20; a = 1; }
    else if (object.kind === "decor") { const d = DECOR_OCCLUDERS[object.decor ?? ""]; if (d) { h = object.decor === "ruin_wall" ? (object.height ?? d[0]) : d[0]; a = d[1]; } }
    else if (object.kind !== "spot" && object.kind !== "wheat") { h = STATION_HEIGHT[object.kind] ?? (object.blocks ? 22 : 0); a = 0.9; }
    if (h > occH[i]) { occH[i] = h; occA[i] = a; }
    if (h > sunH[i]) sunH[i] = h;
  }
  // Ambient occlusion: how much of the sky each tile's neighbours hide (nearer and taller hide more).
  const K = 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (roofed[i]) { ao[i] = 0.5; continue; }
    let hidden = 0, total = 0;
    for (let dy = -K; dy <= K; dy++) for (let dx = -K; dx <= K; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy, w = 1 / (dx * dx + dy * dy);
      total += w;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx, cover = roofed[j] ? 1 : Math.min(1, occH[j] / 36) * occA[j];
      hidden += cover * w;
    }
    ao[i] = 1 - 0.62 * Math.min(1, hidden / total * 1.6);
  }
  blur3(albedo, W, H, 3); blur3(emit, W, H, 3);
  // Lava's own tiles glow fully; the blur spread a softer glow around them.
  for (let i = 0; i < N; i++) if (world.tiles[i] === T.LAVA) { emit[i * 3] = Math.max(emit[i * 3], 1); emit[i * 3 + 1] = Math.max(emit[i * 3 + 1], 0.45); emit[i * 3 + 2] = Math.max(emit[i * 3 + 2], 0.18); }
  return { occH, occA, sunH, roofed, ao, albedo, emit };
}
/** Box-blur an RGB grid in place (separable, radius r, a couple of passes for a soft falloff). */
function blur3(data: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(data.length), span = 2 * r + 1;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += data[(y * w + Math.max(0, Math.min(w - 1, x))) * 3 + c];
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * 3 + c] = sum / span;
        sum += data[(y * w + Math.min(w - 1, x + r + 1)) * 3 + c] - data[(y * w + Math.max(0, x - r)) * 3 + c];
      }
    }
    for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[(Math.max(0, Math.min(h - 1, y)) * w + x) * 3 + c];
      for (let y = 0; y < h; y++) {
        data[(y * w + x) * 3 + c] = sum / span;
        sum += tmp[(Math.min(h - 1, y + r + 1) * w + x) * 3 + c] - tmp[(Math.max(0, y - r) * w + x) * 3 + c];
      }
    }
  }
}
function staticFor(world: World, colors: Record<number, string>) {
  let s = statics.get(world);
  if (!s) { s = buildStatic(world, colors); statics.set(world, s); }
  return s;
}

// ---------- The field ----------
/** Samples per tile edge in the ground's light map. */
export type Projector = (x: number, y: number) => { x: number; y: number };
export class LightField {
  sky!: Sky; lights: PointLight[] = [];
  private s!: Static;
  private x0 = 0; private y0 = 0; private gw = 0; private gh = 0; private S = 2;
  private data = new Float32Array(0);
  readonly canvas: HTMLCanvasElement;
  private image: ImageData | null = null;
  private sunCache = new Map<number, number>();
  constructor() { this.canvas = document.createElement("canvas"); }

  /** Rebuild for the tiles x0–x1, y0–y1 with `samples` per tile edge. */
  build(world: World, colors: Record<number, string>, sky: Sky, lights: PointLight[], x0: number, y0: number, x1: number, y1: number, samples: number) {
    this.sky = sky; this.lights = lights; this.s = staticFor(world, colors); this.sunCache.clear();
    const S = this.S = samples; this.x0 = x0; this.y0 = y0;
    const gw = this.gw = (x1 - x0 + 1) * S, gh = this.gh = (y1 - y0 + 1) * S, n = gw * gh;
    if (this.data.length < n * 3) this.data = new Float32Array(n * 3);
    const d = this.data, { ambient, sun } = sky, st = this.s, emitK = 0.3 + 0.7 * sky.night;
    // Sky, bounced sun and lava, sampled bilinearly from the per-tile grids.
    for (let j = 0; j < gh; j++) {
      const wy = y0 - 0.5 + (j + 0.5) / S;
      for (let i = 0; i < gw; i++) {
        const wx = x0 - 0.5 + (i + 0.5) / S, o = (j * gw + i) * 3;
        const ao = this.bilinear(st.ao, wx, wy, 1), roof = this.bilinear(st.roofed, wx, wy, 0);
        const ax = this.albedoAt(wx, wy), open = 1 - roof;
        for (let c = 0; c < 3; c++) {
          d[o + c] = ambient[c] * ao + sun[c] * open * (1 + 0.2 * ax[c] * ao) + this.emitAt(wx, wy, c) * emitK;
        }
      }
    }
    // Point lights: direct (shadowed by what's in the way) and one bounce.
    for (const light of lights) {
      const r = light.r, bounceR = r * 1.6, around = this.albedoAt(light.x, light.y);
      const bounce: RGB = [light.rgb[0] * around[0] * BOUNCE, light.rgb[1] * around[1] * BOUNCE, light.rgb[2] * around[2] * BOUNCE];
      const i0 = Math.max(0, Math.floor((light.x - bounceR - x0 + 0.5) * S)), i1 = Math.min(gw - 1, Math.ceil((light.x + bounceR - x0 + 0.5) * S));
      const j0 = Math.max(0, Math.floor((light.y - bounceR - y0 + 0.5) * S)), j1 = Math.min(gh - 1, Math.ceil((light.y + bounceR - y0 + 0.5) * S));
      for (let j = j0; j <= j1; j++) {
        const wy = y0 - 0.5 + (j + 0.5) / S;
        for (let i = i0; i <= i1; i++) {
          const wx = x0 - 0.5 + (i + 0.5) / S, dx = wx - light.x, dy = wy - light.y, dist2 = dx * dx + dy * dy;
          if (dist2 > bounceR * bounceR) continue;
          const o = (j * gw + i) * 3, direct = falloff(dist2, r, light.h), seen = direct > 0.002 ? this.transmit(light, wx, wy, 0) : 0;
          const soft = (1 - dist2 / (bounceR * bounceR)), b = soft * soft * light.k * (0.3 + 0.7 * Math.sqrt(seen));
          const a = direct * seen * light.k;
          d[o] += light.rgb[0] * a + bounce[0] * b; d[o + 1] += light.rgb[1] * a + bounce[1] * b; d[o + 2] += light.rgb[2] * a + bounce[2] * b;
        }
      }
    }
    // To the canvas, for projecting onto the ground.
    if (this.canvas.width !== gw || this.canvas.height !== gh) { this.canvas.width = gw; this.canvas.height = gh; this.image = null; }
    const ctx = this.canvas.getContext("2d")!;
    if (!this.image) this.image = ctx.createImageData(gw, gh);
    const px = this.image.data;
    for (let k = 0; k < n; k++) {
      px[k * 4] = d[k * 3] * 255; px[k * 4 + 1] = d[k * 3 + 1] * 255; px[k * 4 + 2] = d[k * 3 + 2] * 255; px[k * 4 + 3] = 255;
    }
    ctx.putImageData(this.image, 0, 0);
  }

  /** The light falling on something standing at (x, y) (tiles, on the ground), `h` world px up. */
  at(x: number, y: number, h = 16): RGB {
    const st = this.s, { ambient, sun } = this.sky;
    const ao = this.bilinear(st.ao, x, y, 1), roof = this.bilinear(st.roofed, x, y, 0), ax = this.albedoAt(x, y), open = 1 - roof;
    const sunSeen = open > 0.02 && luma(sun) > 0.01 ? this.sunVisible(x, y, h) : 0, emitK = 0.3 + 0.7 * this.sky.night;
    // Upright things are more open to the sky than the ground at their feet (the higher, the more).
    const sky = Math.min(1, 0.25 + ao + h / 80);
    const out: RGB = [0, 0, 0];
    for (let c = 0; c < 3; c++) out[c] = ambient[c] * sky + sun[c] * open * (sunSeen + 0.2 * ax[c] * ao) + this.emitAt(x, y, c) * emitK;
    for (const light of this.lights) {
      const dx = x - light.x, dy = y - light.y, dist2 = dx * dx + dy * dy, bounceR = light.r * 1.6;
      if (dist2 > bounceR * bounceR) continue;
      // An upright face turned to the light catches more of it than the ground does.
      const direct = falloff(dist2, light.r, Math.max(6, light.h - h)) * 1.15, seen = direct > 0.002 ? this.transmit(light, x, y, h) : 0;
      const soft = 1 - dist2 / (bounceR * bounceR), b = soft * soft * light.k * BOUNCE * (0.3 + 0.7 * Math.sqrt(seen)), a = direct * seen * light.k;
      for (let c = 0; c < 3; c++) out[c] += light.rgb[c] * (a + b * ax[c]);
    }
    return out;
  }
  /** The open sky's light, for things up in the air (haze, fog, roofs). */
  skyLight(): RGB { const { ambient, sun } = this.sky; return [ambient[0] + sun[0], ambient[1] + sun[1], ambient[2] + sun[2]]; }

  /**
   * Project the light map onto the ground on `ctx` (source-over, so it replaces what's there): in patches small enough
   * that each is flat, following the hills (`project` is world → screen on the ground). `coarse` lays big patches
   * without following the hills, for Low.
   */
  drawGround(ctx: CanvasRenderingContext2D, project: Projector, heights: (i: number, j: number) => number, coarse = false) {
    const S = this.S, tw = this.gw / S, th = this.gh / S, base = ctx.getTransform();
    ctx.imageSmoothingEnabled = true;
    const patch = (ti: number, tj: number, size: number) => {
      const tx0 = this.x0 + ti, ty0 = this.y0 + tj, n = Math.min(size, tw - ti), m = Math.min(size, th - tj);
      // Flat enough to draw as one parallelogram? (The fourth corner's height is predicted by the other three.)
      if (size > 1 && !coarse) {
        const a = heights(tx0, ty0), b = heights(tx0 + n, ty0), c = heights(tx0, ty0 + m), d = heights(tx0 + n, ty0 + m);
        let flat = Math.abs(a + d - b - c) < 1.5;
        if (flat) for (let k = 1; k < Math.max(n, m) && flat; k++) {
          const u = Math.min(k, n), v = Math.min(k, m);
          if (Math.abs(heights(tx0 + u, ty0 + v) - (a + (b - a) * u / n + (c - a) * v / m)) > 1.5) flat = false;
        }
        if (!flat) { const half = size / 2; for (let v = 0; v < m; v += half) for (let u = 0; u < n; u += half) patch(ti + u, tj + v, half); return; }
      }
      // World corner (tile edges) → screen, and the map's pixels for those tiles, with a little overlap to hide seams.
      const wx0 = tx0 - 0.5, wy0 = ty0 - 0.5, p0 = project(wx0, wy0), px = project(wx0 + n, wy0), py = project(wx0, wy0 + m);
      const u0 = ti * S, v0 = tj * S, du = n * S, dv = m * S, e = 0.6;
      const a = (px.x - p0.x) / du, b = (px.y - p0.y) / du, c = (py.x - p0.x) / dv, d = (py.y - p0.y) / dv;
      const ox = p0.x - a * u0 - c * v0, oy = p0.y - b * u0 - d * v0;
      ctx.setTransform(base.a * a + base.c * b, base.b * a + base.d * b, base.a * c + base.c * d, base.b * c + base.d * d, base.a * ox + base.c * oy + base.e, base.b * ox + base.d * oy + base.f);
      const su = Math.max(0, u0 - e), sv = Math.max(0, v0 - e), eu = Math.min(this.gw, u0 + du + e), ev = Math.min(this.gh, v0 + dv + e);
      ctx.drawImage(this.canvas, su, sv, eu - su, ev - sv, su, sv, eu - su, ev - sv);
    };
    const SIZE = coarse ? 16 : 8;
    for (let tj = 0; tj < th; tj += SIZE) for (let ti = 0; ti < tw; ti += SIZE) patch(ti, tj, SIZE);
    ctx.setTransform(base);
  }

  // ---------- Internals ----------
  private bilinear(grid: Float32Array, x: number, y: number, outside: number) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const g = (u: number, v: number) => u < 0 || v < 0 || u >= W || v >= H ? outside : grid[v * W + u];
    return (g(i, j) * (1 - fx) + g(i + 1, j) * fx) * (1 - fy) + (g(i, j + 1) * (1 - fx) + g(i + 1, j + 1) * fx) * fy;
  }
  private albedoAt(x: number, y: number): RGB {
    const i = Math.max(0, Math.min(W - 1, Math.round(x))), j = Math.max(0, Math.min(H - 1, Math.round(y))), o = (j * W + i) * 3, a = this.s.albedo;
    return [a[o], a[o + 1], a[o + 2]];
  }
  private emitAt(x: number, y: number, c: number) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, e = this.s.emit;
    const g = (u: number, v: number) => u < 0 || v < 0 || u >= W || v >= H ? 0 : e[(v * W + u) * 3 + c];
    return (g(i, j) * (1 - fx) + g(i + 1, j) * fx) * (1 - fy) + (g(i, j + 1) * (1 - fx) + g(i + 1, j + 1) * fx) * fy;
  }
  /** How much of a point light gets to (x, y) at height h: march from there to the light through the occluders. */
  private transmit(light: PointLight, x: number, y: number, h: number) {
    const dx = light.x - x, dy = light.y - y, dist = Math.hypot(dx, dy);
    if (dist < 0.75) return 1;
    const steps = Math.ceil(dist * 2), st = this.s, sx = Math.round(x), sy = Math.round(y), lx = Math.round(light.x), ly = Math.round(light.y);
    let through = 1;
    for (let k = 1; k < steps; k++) {
      const t = k / steps, px = Math.round(x + dx * t), py = Math.round(y + dy * t);
      if ((px === sx && py === sy) || (px === lx && py === ly) || px < 0 || py < 0 || px >= W || py >= H) continue;
      const i = py * W + px, top = st.occH[i];
      if (top > 0 && top > h + (light.h - h) * t) { through *= 1 - st.occA[i]; if (through < 0.03) return 0; }
    }
    return through;
  }
  /** How much sun reaches (x, y) at height h: march towards the sun over what stands in the way (cached per tile). */
  private sunVisible(x: number, y: number, h: number) {
    const tx = Math.round(x), ty = Math.round(y), key = ty * W + tx;
    const cached = this.sunCache.get(key);
    if (cached !== undefined) return cached;
    const { dirX, dirY, tanE } = this.sky, st = this.s;
    let through = 1;
    for (let s = 0.75; s < 16; s += 0.5) {
      const rise = h + s * TILE_PX * tanE;
      if (rise > 170) break;
      const px = Math.round(x - dirX * s), py = Math.round(y - dirY * s);
      if ((px === tx && py === ty) || px < 0 || py < 0 || px >= W || py >= H) continue;
      const i = py * W + px;
      if (st.sunH[i] > rise) { through *= 1 - (st.roofed[i] ? 1 : st.occA[i] || 1); if (through < 0.03) { through = 0; break; } }
    }
    this.sunCache.set(key, through);
    return through;
  }
}
/** How much of a point light comes back off the ground around it, in the ground's colour. */
const BOUNCE = 0.22;
/**
 * A point light's reach on the ground at squared distance d2 (tiles): roughly inverse-square from a bright core, lit
 * from above at height h (so it falls off at a grazing angle), windowed to nothing at r.
 */
function falloff(d2: number, r: number, h: number) {
  const r2 = r * r;
  if (d2 >= r2) return 0;
  const window = 1 - d2 / r2, lift = h / TILE_PX, near = 1 / (1 + d2 * 14 / r2);
  return window * window * (0.12 + 0.88 * near) * Math.sqrt(lift / Math.sqrt(d2 + lift * lift)) * 0.85;
}
