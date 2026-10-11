/**
 * The Land Before Stone: the south of the world (rows GEN_OVERWORLD_H to OVERWORLD_H, made by `growSouth` in world.ts).
 * Kharaveth, the desert continent under the mainland, and (later) Meghavan east of it. Built after everything older, in
 * the grown world's own coordinates.
 *
 * The only way in from the mainland on foot is the Sunteeth: a spit of shingle off the coast between Hollyhock and
 * Dyemoor, then a maze of sandstone towers, most of its ways blind, a few of them through. Hollowmere's expedition has
 * dug in at Foothold Camp at its southern mouth. Under the maze runs the Underway, an Azhurak road older than anyone's
 * name for it: a crack in the rock on the maze's west side, a shaft behind the camp on the far side.
 *
 * (Module-level constants are literals: world.ts imports this module, so its values aren't ready while this one loads.)
 */
import { DUNGEON_Y, OVERWORLD_H, T, W, isWater, type DecorKind, type Floor, type GenContext, type RegionId, type World, type WorldObject, type worldTools } from "./world.ts";

import { ASHAR, SPINE, buildHeartlands } from "./heartlands.ts";
import { buildFirstNames } from "./firstnames.ts";
import { buildMeghavan } from "./meghavan.ts";

type Tools = ReturnType<typeof worldTools>;

/** Kharaveth's bounds (the coast wanders inside them). */
export const KHARAVETH = { x0: 48, x1: 1100, y0: 532, y1: 874 } as const;
/**
 * The Sunteeth: a massif of wind-cut sandstone rising out of the strait (its outline a few overlapping lobes, ragged),
 * split by slot canyons. Its north mouth faces the shingle spit from the mainland, its south mouth Foothold Camp.
 */
export const SUNTEETH = { box: { x0: 540, y0: 486, x1: 742, y1: 604 }, north: { x: 619, y: 492 }, south: { x: 636, y: 598 },
  lobes: [[640, 550, 92, 44], [620, 516, 50, 28], [596, 566, 46, 30], [690, 540, 44, 36]] as readonly (readonly [number, number, number, number])[] } as const;
/** Foothold Camp: Hollowmere's palisade at the maze's southern mouth. */
export const FOOTHOLD = { x0: 606, y0: 604, x1: 664, y1: 632, gate: { x: 634, y: 632 } } as const;
/** The Underway's rows and columns in the dungeon strip (rows from DUNGEON_Y). */
export const UNDERWAY = { x0: 300, x1: 456, row0: 4, row1: 56 } as const;

function mulberry(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(seed: number, scale: number) {
  const r = mulberry(seed), size = 64, grid = Array.from({ length: size * size }, () => r());
  const at = (x: number, y: number) => grid[((y % size + size) % size) * size + ((x % size + size) % size)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = smooth(fx - x0), ty = smooth(fy - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
}

export function buildSouth(ctx: GenContext, t: Tools, places: World["places"], floors: Floor[]) {
  void floors;
  const { get, put, add, decor, setRegion, tileIndex, inBounds, npc, monster } = t, lift = ctx.lift, random = mulberry(20261010);
  const n1 = makeNoise(5101, 30), n2 = makeNoise(5102, 9), n3 = makeNoise(5103, 4), rn = makeNoise(5104, 18);
  const ridge = (x: number, y: number) => 1 - Math.abs(rn(x, y) * 2 - 1);
  const occupied = (x: number, y: number) => ctx.objectAt[tileIndex(x, y)] >= 0 || ctx.spawns.some(spawn => spawn.x === x && spawn.y === y);
  const open = (tt: number) => tt === T.SAND || tt === T.GRAVEL || tt === T.STONE || tt === T.PATH || tt === T.GRASS || tt === T.DARK_GRASS || tt === T.DUNGEON || tt === T.ASH || tt === T.WOOD || tt === T.COBBLE;
  const nearFree = (x: number, y: number, limit = 6): [number, number] => {
    for (let r = 0; r <= limit; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy; if (inBounds(nx, ny) && open(get(nx, ny)) && !occupied(nx, ny)) return [nx, ny];
    }
    return [x, y];
  };
  const npcAt = (id: string, x: number, y: number, wander = 0) => { const [nx, ny] = nearFree(x, y, 4); npc(id, nx, ny, wander); };
  const monsterAt = (id: string, x: number, y: number, wander?: number) => { const [nx, ny] = nearFree(x, y, 4); monster(id, nx, ny, wander); };
  const put2 = (x: number, y: number, kind: DecorKind, name?: string, blocks = true) => { const [dx, dy] = nearFree(x, y, 3); return decor(dx, dy, kind, blocks, name); };
  const clue = (x: number, y: number, object: Omit<WorldObject, "id" | "x" | "y">) => { const [cx, cy] = nearFree(x, y, 3); return add({ ...object, x: cx, y: cy }); };
  const sea = (tt: number) => tt === T.DEEP || tt === T.WATER;

  // ---------- 1. Kharaveth's land: a broad continent, its north coast across the strait from the mainland ----------
  // The coast: a great body with capes and bays, the north shore under the maze, nothing square about it.
  const BODY: readonly (readonly [number, number, number, number])[] = [
    [575, 712, 470, 150], [250, 690, 190, 140], [880, 700, 200, 150], [640, 600, 150, 60], [170, 790, 120, 70], [990, 790, 110, 70], [430, 820, 170, 50], [760, 830, 160, 40],
  ];
  const BAYS: readonly (readonly [number, number, number, number])[] = [[400, 548, 70, 26], [860, 560, 60, 30], [80, 640, 40, 50], [1080, 690, 40, 46], [590, 880, 70, 30]];
  const land = (x: number, y: number) => {
    if (x < KHARAVETH.x0 - 20 || x > KHARAVETH.x1 + 20 || y < 520 || y > KHARAVETH.y1) return false;
    const wob = (n1(x, y) - 0.5) * 0.55 + (n3(x, y) - 0.5) * 0.1;
    if (BAYS.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + wob)) return false;
    return BODY.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + wob) && y <= KHARAVETH.y1 - 4 + (n1(x, 7) - 0.5) * 6;
  };
  for (let y = 516; y < OVERWORLD_H; y++) for (let x = 0; x < W; x++) {
    if (!sea(get(x, y)) && get(x, y) !== T.VOID) continue;
    if (land(x, y)) { put(x, y, T.SAND); setRegion(x, y, "ochre_steppe"); }
    else if (y >= 518) setRegion(x, y, "sunward_strait");
  }
  // Shallows round the coast; the open strait deep.
  for (let y = 516; y < OVERWORLD_H; y++) for (let x = 0; x < W; x++) {
    if (!sea(get(x, y))) continue;
    let near = false;
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3 && !near; dx++) { const tt = get(x + dx, y + dy); if (!sea(tt) && tt !== T.VOID) near = true; }
    put(x, y, near ? T.WATER : T.DEEP);
  }
  // The ground in broad country, not speckle: the Sea of Dunes in the west, gravel plains (the reg) in the middle and
  // east, bare stone pavements (the hamada), sandstone mesas, the Ochre Spine winding south-west to north-east, the
  // Black Range in the south-east, and the Sunteeth's broken foothills round the maze.
  const big = makeNoise(5105, 70), mid = makeNoise(5106, 26), warp = makeNoise(5107, 40);
  const toSpine = (x: number, y: number) => {
    const wx = x + (warp(x, y) - 0.5) * 50, wy = y + (warp(y + 500, x) - 0.5) * 30;
    let best = Infinity;
    for (let k = 0; k + 1 < SPINE.length; k++) {
      const [ax, ay] = SPINE[k], [bx, by] = SPINE[k + 1], dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((wx - ax) * dx + (wy - ay) * dy) / (dx * dx + dy * dy)));
      best = Math.min(best, Math.hypot(wx - ax - dx * u, wy - ay - dy * u));
    }
    return best;
  };
  for (let y = 516; y < OVERWORLD_H; y++) for (let x = 0; x < W; x++) {
    if (get(x, y) !== T.SAND || !land(x, y)) continue;
    const i = tileIndex(x, y), n = n3(x, y), m = ridge(x * 0.8, y * 0.8), b = big(x, y), md = mid(x, y);
    const ergWest = Math.max(0, Math.min(1, (420 - x - (b - 0.5) * 160) / 90));
    const spine = Math.max(0, 1 - toSpine(x, y) / 22);
    const black = Math.max(0, 1 - Math.hypot((x - 900 + (warp(x, y) - 0.5) * 60) / 120, (y - 790 + (warp(y, x) - 0.5) * 30) / 56));
    const foothills = Math.max(0, 1 - Math.hypot((x - 640) / 120, (y - 560) / 50)) * (md > 0.5 ? 1 : 0.4);
    const dunes = ergWest * Math.max(0, m - 0.3) * 1.6 + (1 - ergWest) * (b > 0.68 ? Math.max(0, m - 0.45) * 1.1 : 0);
    lift[i] = spine * 2.3 + black * 2.5 + dunes + foothills * 0.8 + Math.max(0, md - 0.7) * 0.9;
    if (black > 0.35) put(x, y, black > 0.62 && n > 0.45 ? T.CLIFF : n > 0.4 ? T.ASH : T.STONE);
    else if (spine > 0.55 && n > 0.48) put(x, y, T.CLIFF);
    else if (spine > 0.25) put(x, y, n > 0.5 ? T.STONE : T.GRAVEL);
    else if (foothills > 0.3 && md > 0.62 && n > 0.45) put(x, y, T.CLIFF);
    else if (ergWest > 0.5) continue;                                              // the dunes stay sand
    else if (b < 0.36 && md > 0.45) put(x, y, n > 0.35 ? T.STONE : T.GRAVEL);        // the hamada: bare stone pavements
    else if (b > 0.45 && b < 0.68 && md > 0.4) put(x, y, n > 0.25 ? T.GRAVEL : T.SAND); // the reg: gravel plains
    else if (md > 0.76 && m > 0.6) put(x, y, T.CLIFF);                              // a mesa's cliffs
  }
  // The Ashar, the one river: out of the Black Range's foothills, north-west across the steppe, into the strait. Green along it.
  const river = ASHAR;
  for (let i = 0; i + 1 < river.length; i++) {
    const [ax, ay] = river[i], [bx, by] = river[i + 1], steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    for (let s = 0; s <= steps; s++) {
      const cx = ax + (bx - ax) * s / steps, cy = ay + (by - ay) * s / steps;
      for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
        const x = Math.round(cx + dx), y = Math.round(cy + dy), d = Math.hypot(dx, dy); if (!inBounds(x, y) || !land(x, y)) continue;
        const tt = get(x, y); if (tt === T.CLIFF) continue;
        if (d <= 1.8) { put(x, y, T.WATER); lift[tileIndex(x, y)] = 0; }
        else if (d <= 5 && tt !== T.WATER) { put(x, y, n3(x, y) > 0.55 ? T.DARK_GRASS : T.GRASS); lift[tileIndex(x, y)] = Math.min(lift[tileIndex(x, y)], 0.2); }
        else if (d <= 8.5 && tt === T.SAND && n2(x, y) > 0.45) put(x, y, T.GRASS);
      }
    }
  }
  // Oases in the dunes and on the steppe: a pool, a green ring, palms.
  for (const [ox, oy, r] of [[220, 640, 6], [330, 760, 5], [470, 820, 5], [980, 640, 6], [640, 760, 4]] as const) {
    for (let y = oy - r - 4; y <= oy + r + 4; y++) for (let x = ox - r - 4; x <= ox + r + 4; x++) {
      if (!land(x, y)) continue;
      const d = Math.hypot(x - ox, y - oy) + (n3(x, y) - 0.5) * 2;
      if (d <= r * 0.55) put(x, y, T.WATER); else if (d <= r + 2) put(x, y, T.GRASS);
      if (d <= r + 2) lift[tileIndex(x, y)] = 0;
    }
    for (let k = 0; k < 7; k++) { const a = random() * Math.PI * 2, rr = r * 0.7 + random() * 3, [px, py] = [Math.round(ox + Math.cos(a) * rr), Math.round(oy + Math.sin(a) * rr)]; if (get(px, py) === T.GRASS && !occupied(px, py)) t.tree(px, py, "palm"); }
  }
  // The desert's own things: cacti and dead trees on the steppe, boulders, a few bones.
  t.scatter(KHARAVETH.x0, 620, KHARAVETH.x1, KHARAVETH.y1, 220, (x, y) => { const r = random(); if (r < 0.55) decor(x, y, "cactus"); else if (r < 0.8) decor(x, y, "boulder"); else t.tree(x, y, "deadwood"); }, (x, y) => get(x, y) === T.SAND || get(x, y) === T.GRAVEL ? !occupied(x, y) && land(x, y) : false);

  // ---------- 2. The Sunteeth: the shingle spit, then a massif of sandstone split by slot canyons ----------
  const B = SUNTEETH.box, BW = B.x1 - B.x0 + 1, BH = B.y1 - B.y0 + 1, local = (x: number, y: number) => (y - B.y0) * BW + (x - B.x0);
  const inBox = (x: number, y: number) => x >= B.x0 && x <= B.x1 && y >= B.y0 && y <= B.y1;
  const lobeNoise = makeNoise(5201, 16), canyonA = makeNoise(5202, 15), canyonB = makeNoise(5203, 10), towers = makeNoise(5204, 3);
  // The massif's outline: its lobes, ragged; and how deep inside it each tile is (its rim stays rock, but at the mouths).
  const massif = (x: number, y: number) => SUNTEETH.lobes.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + (lobeNoise(x, y) - 0.5) * 0.7);
  const inside = new Uint8Array(BW * BH), depth = new Uint8Array(BW * BH);
  for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (massif(x, y)) inside[local(x, y)] = 1;
  {
    const q: number[] = [];
    for (let i = 0; i < BW * BH; i++) { const x = i % BW, y = (i - x) / BW; if (inside[i] && (x === 0 || y === 0 || x === BW - 1 || y === BH - 1 || !inside[i - 1] || !inside[i + 1] || !inside[i - BW] || !inside[i + BW])) { depth[i] = 1; q.push(i); } }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % BW; for (const j of [x > 0 ? i - 1 : -1, x < BW - 1 ? i + 1 : -1, i - BW, i + BW]) if (j >= 0 && j < BW * BH && inside[j] && !depth[j]) { depth[j] = depth[i] + 1; q.push(j); } }
  }
  // The canyons: where either of two fields of noise crosses its middle, the rock is split (winding, forking, meeting,
  // ending blind, as water and wind would cut it). Nothing is cut within three tiles of the rim.
  const pass = new Uint8Array(BW * BH);
  for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) {
    const i = local(x, y); if (!inside[i] || depth[i] <= 3) continue;
    if (Math.abs(canyonA(x, y) - 0.5) < 0.05 || Math.abs(canyonB(x + 300, y) - 0.5) < 0.042) pass[i] = 1;
  }
  // Widened a little where they run (a slot canyon is two or three wide, now and then a hollow).
  { const grown = pass.slice(); for (let i = 0; i < BW * BH; i++) if (pass[i]) { const x = i % BW; for (const j of [x < BW - 1 ? i + 1 : -1, i + BW]) if (j >= 0 && j < BW * BH && inside[j] && depth[j] > 3) grown[j] = 1; } pass.set(grown); }
  // The ways through: from the north mouth to the south, three of them, each finding its own line (cheapest through the
  // canyons already there, and dearer through rock, with each route's own idea of which rock is dearest).
  const carveRoute = (seed: number) => {
    const cost = makeNoise(seed, 8), dist = new Float32Array(BW * BH).fill(Infinity), from = new Int32Array(BW * BH).fill(-1), done = new Uint8Array(BW * BH);
    const start = local(SUNTEETH.north.x, SUNTEETH.north.y), goal = local(SUNTEETH.south.x, SUNTEETH.south.y), open: number[] = [start]; dist[start] = 0;
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
      const i = open[bi]; open[bi] = open[open.length - 1]; open.pop(); if (done[i]) continue; done[i] = 1; if (i === goal) break;
      const x = i % BW;
      for (const j of [x > 0 ? i - 1 : -1, x < BW - 1 ? i + 1 : -1, i - BW, i + BW]) {
        if (j < 0 || j >= BW * BH || done[j] || !inside[j]) continue;
        const jx = j % BW, jy = (j - jx) / BW, rim = depth[j] <= 3 && j !== goal && j !== start;
        const c = dist[i] + (pass[j] ? 1 : 4 + cost(jx + B.x0, jy + B.y0) * 14) + (rim ? 60 : 0);
        if (c < dist[j]) { dist[j] = c; from[j] = i; open.push(j); }
      }
    }
    for (let i = goal; i >= 0; i = from[i]) { const x = i % BW; for (const j of [i, x < BW - 1 ? i + 1 : i, i + BW < BW * BH ? i + BW : i]) if (inside[j]) pass[j] = 1; if (i === start) break; }
  };
  carveRoute(5301); carveRoute(5302); carveRoute(5303);
  // Pockets the canyons left cut off from the north mouth are filled back in (rock).
  const reach = new Int32Array(BW * BH).fill(-1);
  { const s0 = local(SUNTEETH.north.x, SUNTEETH.north.y), q = [s0]; reach[s0] = 0;
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % BW; for (const j of [x > 0 ? i - 1 : -1, x < BW - 1 ? i + 1 : -1, i - BW, i + BW]) if (j >= 0 && j < BW * BH && pass[j] && reach[j] < 0) { reach[j] = reach[i] + 1; q.push(j); } } }
  // The rock, the canyon floors, the towers.
  for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) {
    const i = local(x, y); if (!inside[i]) continue;
    const ti = tileIndex(x, y); t.clearAt(x, y); setRegion(x, y, "sunteeth");
    if (pass[i] && reach[i] >= 0) { put(x, y, n2(x, y) > 0.66 ? T.GRAVEL : T.SAND); lift[ti] = 0.05; }
    else { put(x, y, T.CLIFF); lift[ti] = 0.9 + Math.min(1.4, depth[i] * 0.12) + n3(x, y) * 0.6; }
  }
  for (let y = B.y0 + 1; y < B.y1; y++) for (let x = B.x0 + 1; x < B.x1; x++) {
    const i = local(x, y); if (!inside[i] || pass[i] && reach[i] >= 0 || towers(x, y) < 0.72) continue;
    const besideCanyon = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inBox(x + dx, y + dy) && pass[local(x + dx, y + dy)] && reach[local(x + dx, y + dy)] >= 0);
    if (besideCanyon || random() < 0.08) decor(x, y, "rock_spire", true, "Sandstone tower");
  }
  // The spit: shingle laid on the sea from the mainland's shore down to the north mouth (never on the mainland's land).
  for (let y = 466; y <= SUNTEETH.north.y; y++) for (let x = SUNTEETH.north.x - 9; x <= SUNTEETH.north.x + 9; x++) {
    const half = 3.5 + (n3(x, y) - 0.5) * 2.5 + Math.max(0, (y - 480) / 7), mid = SUNTEETH.north.x + 1 + Math.sin(y / 6) * 2.5;
    if (Math.abs(x - mid) <= half && (sea(get(x, y)) || inBox(x, y) && get(x, y) === T.CLIFF && y <= SUNTEETH.north.y + 1)) { put(x, y, n3(x, y) > 0.5 ? T.GRAVEL : T.SAND); setRegion(x, y, "sunteeth"); lift[tileIndex(x, y)] = 0; }
  }
  // The south mouth opens onto the camp's ground.
  for (let y = SUNTEETH.south.y - 1; y <= FOOTHOLD.y0 + 1; y++) for (let x = SUNTEETH.south.x - 1; x <= SUNTEETH.south.x + 2; x++) { put(x, y, T.SAND); lift[tileIndex(x, y)] = 0.05; setRegion(x, y, "sunteeth"); }
  const southX = SUNTEETH.south.x - 1, MY1 = SUNTEETH.south.y;
  // Tiles of the canyons by their distance from the north mouth; the true way (shortest, back from the south mouth);
  // the blind ends (a canyon tile with only one canyon neighbour, far along).
  const canyon = (x: number, y: number) => inBox(x, y) && reach[local(x, y)] >= 0;
  const way: [number, number][] = [];
  for (let at: [number, number] | null = [SUNTEETH.south.x, SUNTEETH.south.y]; at;) {
    way.unshift(at); const [ax, ay]: [number, number] = at, here: number = reach[local(ax, ay)]; if (here <= 0) break;
    at = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [ax + dx, ay + dy] as [number, number]).find(([nx, ny]): boolean => canyon(nx, ny) && reach[local(nx, ny)] === here - 1) ?? null;
  }
  const onWay = new Set(way.map(([x, y]) => local(x, y)));
  const awayFromWay = (x: number, y: number) => { let best = Infinity; for (const [wx, wy] of way) best = Math.min(best, Math.abs(wx - x) + Math.abs(wy - y)); return best; };
  const deadEnds: [number, number][] = [];
  for (let y = B.y0 + 1; y < B.y1; y++) for (let x = B.x0 + 1; x < B.x1; x++) {
    if (!canyon(x, y) || onWay.has(local(x, y))) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => canyon(x + dx, y + dy)).length;
    if (n === 1 && awayFromWay(x, y) > 8) deadEnds.push([x, y]);
  }
  const centre = (at: readonly [number, number]) => at;

  // The things in it. Hollowmere's chalk arrows along the true way (some smudged and redrawn in ochre, wrong); the last
  // camp the supply party made; their trail; the stele in the blind canyon the ochre arrows lead to; the crack beside it.
  const along = (k: number) => way[Math.min(way.length - 1, Math.max(0, Math.round(k * (way.length - 1))))];
  for (const k of [0.12, 0.3, 0.55, 0.8]) { const [x, y] = along(k); clue(x, y, { kind: "sign", blocks: true, name: "Chalk arrow", clue: "chalk_white", text: "" }); }
  const [campX, campY] = along(0.42);
  clue(campX, campY, { kind: "decor", decor: "campfire_cold", blocks: false, name: "Cold campfire", clue: "last_camp" });
  put2(campX + 1, campY + 1, "crate", "Abandoned crate", true);
  // The blind canyon farthest west, well away from the true way: the stele, and the crack in its end wall.
  const westDead = deadEnds.filter(([x]) => x < SUNTEETH.north.x - 20).sort((a, b) => (awayFromWay(b[0], b[1]) - awayFromWay(a[0], a[1])) || a[0] - b[0])[0] ?? deadEnds[0] ?? along(0.5);
  const [stX, stY] = westDead;
  // The crack: a rock tile at the blind end, faced from the canyon.
  const crackAt = ([[-1, 0], [0, 1], [0, -1], [1, 0]] as const).map(([dx, dy]) => [stX + dx, stY + dy] as const).find(([x, y]) => get(x, y) === T.CLIFF) ?? [stX - 1, stY] as const;
  const crack = { x: crackAt[0], y: crackAt[1] };
  t.clearAt(crack.x, crack.y); put(crack.x, crack.y, T.STONE); lift[tileIndex(crack.x, crack.y)] = 0.6;
  const underTop = DUNGEON_Y + UNDERWAY.row0;
  add({ kind: "ladder", x: crack.x, y: crack.y, blocks: true, name: "Cracked rock face", action: "Squeeze-into", to: { x: UNDERWAY.x0 + 6, y: underTop + 4 }, clue: "sunteeth_crack" });
  // The stele a step back from the crack, in the canyon.
  const stepBack = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).map(([dx, dy]) => [stX + dx, stY + dy] as const).find(([x, y]) => canyon(x, y)) ?? [stX, stY] as const;
  clue(stepBack[0], stepBack[1], { kind: "sign", blocks: true, name: "Weathered stele", clue: "sunteeth_stele", text: "" });
  // The ochre arrows: along the canyons from the camp towards the stele (the walk there, sampled).
  const toStele: [number, number][] = [];
  {
    const prev = new Int32Array(BW * BH).fill(-1), s0 = local(campX, campY), g0 = local(stX, stY), q = [s0]; prev[s0] = s0;
    for (let h = 0; h < q.length && prev[g0] < 0; h++) { const i = q[h], x = i % BW; for (const j of [x > 0 ? i - 1 : -1, x < BW - 1 ? i + 1 : -1, i - BW, i + BW]) if (j >= 0 && j < BW * BH && reach[j] >= 0 && prev[j] < 0) { prev[j] = i; q.push(j); } }
    for (let i = g0; prev[i] >= 0 && i !== s0; i = prev[i]) { const x = i % BW; toStele.unshift([x + B.x0, (i - x) / BW + B.y0]); }
  }
  const pathAt = (k: number) => toStele[Math.min(toStele.length - 1, Math.max(0, Math.round(k * (toStele.length - 1))))] ?? [campX, campY];
  for (const k of [0.25, 0.6]) { const [x, y] = pathAt(k); clue(x, y, { kind: "sign", blocks: true, name: "Chalk arrow", clue: "chalk_ochre", text: "" }); }
  // The party's trail on the way to the stele: dropped and trodden things, read in order.
  ["trail_sand", "trail_tin", "trail_shoe", "trail_blood"].forEach((id, k) => { const [x, y] = pathAt(0.12 + k * 0.22); clue(x, y, { kind: "decor", decor: "scuffs", blocks: false, name: ["Disturbed sand", "Dented ration tin", "Mule shoe", "Dark stain on the rock"][k], clue: id }); });
  // Landmarks: you learn the canyons by them (and by the towers).
  const landmark = (index: number, kind: DecorKind, name: string) => { const d = deadEnds[(index * 7) % Math.max(1, deadEnds.length)]; if (!d) return; put2(d[0], d[1], kind, name); };
  landmark(1, "bones", "A great jawbone, bleached white");
  landmark(3, "rubble", "Travellers' cairn");
  landmark(5, "boulder", "The Balanced Stone");
  landmark(8, "obelisk", "A sun-gnomon, its shadow long");
  // Its creatures: hyenas in packs, vultures, the skinks, and a dust-devil that walks like a man.
  const canyonTiles: [number, number][] = [];
  for (let y = B.y0; y <= B.y1; y++) for (let x = B.x0; x <= B.x1; x++) if (canyon(x, y) && reach[local(x, y)] > 20) canyonTiles.push([x, y]);
  for (let k = 0; k < 18 && canyonTiles.length; k++) { const [x, y] = canyonTiles[Math.floor(random() * canyonTiles.length)]; monsterAt(k % 3 === 0 ? "sunteeth_hyena" : k % 3 === 1 ? "rock_skink" : "glasswing_vulture", x, y, 3); }
  for (const d of deadEnds.slice(0, 3)) monsterAt("dust_walker", d[0], d[1], 1);
  void centre;

  // ---------- 3. Foothold Camp: Hollowmere's palisade at the maze's south mouth ----------
  const F = FOOTHOLD;
  for (let y = F.y0 - 2; y <= F.y1 + 2; y++) for (let x = F.x0 - 2; x <= F.x1 + 2; x++) {
    if (!inBounds(x, y) || get(x, y) === T.CLIFF && y < MY1 + 2) continue;
    put(x, y, y >= F.y0 && y <= F.y1 && x >= F.x0 && x <= F.x1 ? (n2(x, y) > 0.55 ? T.GRAVEL : T.SAND) : get(x, y) === T.CLIFF ? T.SAND : get(x, y));
    lift[tileIndex(x, y)] = Math.min(lift[tileIndex(x, y)], 0.1); setRegion(x, y, "foothold"); t.clearAt(x, y);
  }
  // The palisade: stakes round, gates north (to the maze) and south (to Kharaveth).
  // (Every tile: the stakes are lashed together, so there's no slipping between them.)
  for (let x: number = F.x0; x <= F.x1; x++) { if (x < southX - 1 || x > southX + 2) decor(x, F.y0, "stake"); if (x !== F.gate.x) decor(x, F.y1, "stake"); }
  for (let y = F.y0 + 1; y < F.y1; y++) for (const x of [F.x0, F.x1]) decor(x, y, "stake");
  // Between the massif's foot and the palisade's north wall the rock comes down to meet it, so the maze's south mouth
  // opens into the camp and nowhere else.
  for (let y = 572; y < F.y0; y++) for (let x = F.x0 - 5; x <= F.x1 + 5; x++) {
    if (inBox(x, y) && inside[local(x, y)]) continue;
    if (x >= southX - 1 && x <= southX + 2 && y >= SUNTEETH.south.y - 1) continue;
    if (get(x, y) !== T.WATER) { put(x, y, T.CLIFF); setRegion(x, y, "sunteeth"); lift[tileIndex(x, y)] = Math.max(lift[tileIndex(x, y)], 1.1); t.clearAt(x, y); }
  }
  add({ kind: "gate", x: F.gate.x, y: F.gate.y, blocks: true, name: "Foothold south gate", action: "Open", to: { x: F.gate.x, y: F.gate.y + 1 }, clue: "foothold_gate" });
  t.road([[southX + 2, MY1 + 1], [southX + 2, F.y0 + 4], [F.gate.x, F.y1 - 4], [F.gate.x, F.y1 + 6]], 2.2, T.PATH);
  // Tents, the command tent, the stores, the watchtower, the banner, the horse lines, the well they dug.
  const tents: [number, number][] = [[F.x0 + 5, F.y0 + 5], [F.x0 + 5, F.y0 + 12], [F.x0 + 5, F.y0 + 19], [F.x1 - 6, F.y0 + 5], [F.x1 - 6, F.y0 + 12], [F.x1 - 13, F.y0 + 19]];
  for (const [x, y] of tents) decor(x, y, "tent");
  t.building(F.x0 + 13, F.y0 + 6, F.x0 + 22, F.y0 + 13, "s", T.WOOD, undefined, { name: "The command tent", roof: "flat", walls: "plank", color: "#8f8a6e" });
  t.building(F.x1 - 22, F.y0 + 16, F.x1 - 14, F.y0 + 22, "w", T.WOOD, undefined, { name: "The stores", roof: "flat", walls: "plank", color: "#9c8672" });
  put2(F.x0 + 3, F.y0 + 2, "watchtower", "Foothold watchtower");
  put2(F.x0 + 26, F.y0 + 4, "banner_hollowmere");
  put2(F.x0 + 30, F.y0 + 14, "campfire", "Camp fire (warm)", false);
  put2(F.x1 - 4, F.y1 - 4, "wagon", "Supply wagon");
  put2(F.x1 - 8, F.y1 - 3, "crate"); put2(F.x1 - 9, F.y1 - 4, "crate"); put2(F.x1 - 3, F.y0 + 22, "barrel");
  t.add({ kind: "well", x: F.x0 + 34, y: F.y0 + 20, blocks: true, name: "The camp well" });
  t.add({ kind: "bank", x: F.x1 - 18, y: F.y0 + 18, blocks: true, name: "Expedition strongbox" });
  // The people: the commander in her tent, her officers who disagree, the stores, the soldiers on the walls.
  npcAt("fh_commander", F.x0 + 17, F.y0 + 9);
  npcAt("fh_lieutenant", F.x0 + 28, F.y0 + 10, 2);
  npcAt("fh_cartographer", F.x0 + 9, F.y0 + 16, 1);
  npcAt("fh_scholar", F.x0 + 33, F.y0 + 22, 1);
  npcAt("fh_quartermaster", F.x1 - 19, F.y0 + 20);
  npcAt("fh_sergeant", F.gate.x - 3, F.y1 - 3, 1);
  npcAt("fh_soldier", southX + 2, F.y0 + 2, 1); npcAt("fh_soldier", F.x1 - 5, F.y0 + 3, 2); npcAt("fh_soldier", F.x0 + 20, F.y1 - 3, 2);
  // The supply party, once they're back (they're in the Underway until then).
  npcAt("fh_rook", F.x0 + 30, F.y0 + 17); npcAt("fh_ibbu", F.x0 + 38, F.y0 + 12);
  places.foothold = { x: F.x0 + 25, y: F.y0 + 16 };

  // ---------- 4. The Underway: an Azhurak road under the maze, from the crack to a shaft behind the camp ----------
  const U = UNDERWAY, uy0 = DUNGEON_Y + U.row0, uy1 = DUNGEON_Y + U.row1;
  for (let y = uy0 - 2; y <= uy1 + 2; y++) for (let x = U.x0 - 2; x <= U.x1 + 2; x++) { put(x, y, T.VOID); setRegion(x, y, "underway"); }
  const hall = (x0: number, y0: number, x1: number, y1: number, kind: number = T.DUNGEON) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { put(x, y, kind); setRegion(x, y, "underway"); } };
  // The road itself, three wide, dog-legging east; side chambers off it; the party's refuge; the counterweight hall; the shaft.
  hall(U.x0 + 3, uy0 + 2, U.x0 + 12, uy0 + 8, T.STONE);                 // under the crack: a landing, scree from above
  hall(U.x0 + 10, uy0 + 4, U.x0 + 60, uy0 + 6, T.STONE);                // the road west to east
  hall(U.x0 + 58, uy0 + 4, U.x0 + 60, uy0 + 30, T.STONE);               // it turns south
  hall(U.x0 + 60, uy0 + 28, U.x0 + 120, uy0 + 30, T.STONE);             // and east again
  hall(U.x0 + 118, uy0 + 12, U.x0 + 120, uy0 + 30, T.STONE);            // north to the shaft
  hall(U.x0 + 112, uy0 + 6, U.x0 + 128, uy0 + 13, T.STONE);             // the shaft hall
  hall(U.x0 + 24, uy0 + 9, U.x0 + 38, uy0 + 20);                         // the refuge, off the road (where the party sheltered)
  hall(U.x0 + 30, uy0 + 7, U.x0 + 32, uy0 + 9);
  hall(U.x0 + 66, uy0 + 34, U.x0 + 92, uy0 + 46);                        // the counterweight hall, under the road
  hall(U.x0 + 78, uy0 + 31, U.x0 + 80, uy0 + 34);
  hall(U.x0 + 70, uy0 + 12, U.x0 + 92, uy0 + 24);                        // the glyph hall, the road's shrine
  hall(U.x0 + 80, uy0 + 25, U.x0 + 82, uy0 + 28);
  hall(U.x0 + 132, uy0 + 34, U.x0 + 150, uy0 + 50);                      // the beetles' gallery, a dead end east
  hall(U.x0 + 120, uy0 + 40, U.x0 + 132, uy0 + 42); hall(U.x0 + 118, uy0 + 30, U.x0 + 120, uy0 + 42);
  // Walls of dressed stone round every hall and passage (the dark beyond them is solid rock).
  for (let y = uy0 - 1; y <= uy1 + 1; y++) for (let x = U.x0 - 1; x <= U.x1 + 1; x++) {
    if (get(x, y) !== T.VOID) continue;
    let beside = false;
    for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) { const tt = get(x + dx, y + dy); if (tt === T.STONE || tt === T.DUNGEON) beside = true; }
    if (beside) put(x, y, T.WALL);
  }
  // Its stones: inscriptions on the road (three), the refuge, the counterweight, the shaft out.
  clue(U.x0 + 34, uy0 + 5, { kind: "sign", blocks: true, name: "Carved lintel", clue: "underway_lintel", text: "" });
  clue(U.x0 + 81, uy0 + 13, { kind: "sign", blocks: true, name: "Glyph wall", clue: "underway_glyphs", text: "" });
  clue(U.x0 + 119, uy0 + 29, { kind: "sign", blocks: true, name: "Road marker", clue: "underway_marker", text: "" });
  clue(U.x0 + 31, uy0 + 15, { kind: "decor", decor: "bedroll", blocks: false, name: "The supply party's camp", clue: "underway_refuge" });
  npcAt("fh_rook_lost", U.x0 + 28, uy0 + 14); npcAt("fh_ibbu_lost", U.x0 + 34, uy0 + 17);
  clue(U.x0 + 79, uy0 + 44, { kind: "decor", decor: "counterweight", blocks: true, name: "Stone counterweight", clue: "underway_counterweight" });
  // The way back up: from the crack's landing, and the shaft behind the camp (opened by the counterweight, both ways).
  add({ kind: "ladder", x: U.x0 + 5, y: uy0 + 3, blocks: true, name: "Scree slope", action: "Climb-up", to: { x: stepBack[0], y: stepBack[1] } });
  const shaftTop = { x: F.x1 - 5, y: F.y0 + 4 };                        // inside the palisade, behind the stores
  put(shaftTop.x, shaftTop.y, T.STONE); for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) if (get(shaftTop.x + dx, shaftTop.y + dy) === T.CLIFF) put(shaftTop.x + dx, shaftTop.y + dy, T.SAND);
  add({ kind: "ladder", x: U.x0 + 120, y: uy0 + 8, blocks: true, name: "Old shaft", action: "Climb-up", to: { x: shaftTop.x, y: shaftTop.y + 1 }, clue: "underway_shaft_up" });
  add({ kind: "ladder", x: shaftTop.x, y: shaftTop.y, blocks: true, name: "Sand-choked shaft", action: "Climb-down", to: { x: U.x0 + 120, y: uy0 + 10 }, clue: "underway_shaft_down" });
  // Torch brackets along the road, every dozen paces, and in each hall: the road's keepers kept it lit.
  const torches: [number, number][] = [[U.x0 + 8, uy0 + 3], [U.x0 + 31, uy0 + 12], [U.x0 + 30, uy0 + 19], [U.x0 + 75, uy0 + 14], [U.x0 + 87, uy0 + 14], [U.x0 + 70, uy0 + 36], [U.x0 + 88, uy0 + 44], [U.x0 + 116, uy0 + 8], [U.x0 + 140, uy0 + 36]];
  for (let x = U.x0 + 16; x < U.x0 + 58; x += 12) torches.push([x, uy0 + 4]);
  for (let y = uy0 + 10; y < uy0 + 28; y += 12) torches.push([U.x0 + 58, y]);
  for (let x = U.x0 + 64; x < U.x0 + 118; x += 12) torches.push([x, uy0 + 28]);
  for (let y = uy0 + 14; y < uy0 + 28; y += 12) torches.push([U.x0 + 120, y]);
  for (const [x, y] of torches) put2(x, y, "torch", "Old torch bracket", false);
  // Its creatures: tomb beetles, lamp-eyed bats, and the road's sentinel at the glyph hall.
  for (const [id, x0, y0, x1, y1, n] of [["tomb_beetle", U.x0 + 132, uy0 + 34, U.x0 + 150, uy0 + 50, 6], ["lamp_bat", U.x0 + 10, uy0 + 4, U.x0 + 120, uy0 + 30, 6], ["tomb_beetle", U.x0 + 66, uy0 + 34, U.x0 + 92, uy0 + 46, 3]] as const) {
    t.monsters(id, x0, y0, x1, y1, n);
  }
  monsterAt("underway_sentinel", U.x0 + 82, uy0 + 18, 2);
  // A cache the sentinel guards.
  put2(U.x0 + 148, uy0 + 48, "chest", "Azhurak coffer");

  // ---------- 5. Beyond the camp: the heartlands (heartlands.ts) ----------
  const kit = { land, random, nearFree, occupied, open, npcAt, monsterAt, put2, clue };
  buildHeartlands(ctx, t, places, kit);
  buildFirstNames(ctx, t, places, kit);
  // ---------- 6. East over Khetmar's bay: Meghavan, the Rain Country (meghavan.ts) ----------
  buildMeghavan(ctx, t, places, kit);
  void ([] as RegionId[]); void isWater;
}
