/**
 * The lie of the land: how high each part of the Realm stands, under the hills (the owner: "the Ashen Hills, the mine,
 * Emberforge and Frostpeak are pretty much at the same elevation as Friendhollow, and it should be going up").
 *
 * The hills (world.ts buildHeights) are relief: noise and raised ground over a floor at height 0, and every town, road
 * and floor sits on that floor. This is the floor itself, tile by tile (`base`, world pixels): each region stands at its
 * own height (sea level on the coasts, the farmland a little above, climbing through the Ashen Hills to Emberforge and
 * up to Frostpeak; the ranges high everywhere), blurred into long slopes, brought down to the sea along every shore that
 * reaches it, with each inland lake lying level. Every building stands on a terrace of its own: its footprint and a
 * margin wider than its roof at one height, easing out into the slope, so walls and roof always stand on the same ground.
 *
 * Built once in generation, after the seaways (so the straits' seas come down to sea level), and baked (bake.ts).
 */
import { OVERWORLD_H, REGIONS, T, W, H, mainlandAt, type Building, type GenContext } from "./world.ts";

/** Each region's height (world pixels). Regions not listed stand at 20 + 10 per point of danger. */
const ALTITUDE: Record<string, number> = {
  // The heartland: the coast and the lowlands, then up north-east to the mountains.
  coast: 0, glass_lake: 4, southshore: 4, saltmarrow: 4, gullwick: 2, saltreach: 2, friends_ring: 14, pale_isles: 6, quillhaven: 6,
  friendhollow: 10, farmland: 12, wizards_tower: 14, murkmire: 8, mossy_ruins: 18, fernwick: 14, gravesend: 16, hollyhock: 16, dyemoor: 14, tallgrass: 16,
  thistle_vale: 20, the_wilds: 24, whisperwood: 26, pale_dunes: 18, oasis: 16,
  ashen_hills: 55, emberforge: 190, greyhorn: 130, highcairn: 160, frostpeak: 200, cragmaw: 90, ironreach: 110, cragmaw_heights: 150,
  deadwood: 40, bonefield: 70, westmarch: 40, deep_westmarch: 55, free_marches: 35, barkreach: 45, raria: 30, raria_march: 40, crownlands: 35, vesperwold: 50,
  silent_peaks: 120, heartwood: 70, greyfields: 50, drakespine: 110, ashfall: 110, wyrmreach: 100,
  // The Mizukai Isles: low islands, a few high ones.
  hinode: 12, kurohama: 6, takamori: 30, kumoyama: 70, old_cedars: 40, whispering_bamboo: 30, tanabe: 14, yumoto: 30, kurokage: 60, shiogama: 8, kibi: 10,
  hanazono: 18, morishima: 30, iwaoka: 90, josaki: 30, torojima: 40, kusabana: 20, ashigane: 80, hakkotsu: 50, three_stones: 10, turtle_rock: 6, smugglers_cove: 4,
  // Kharaveth: steppe and desert, the ranges standing out of them.
  sunteeth: 60, foothold: 30, ochre_steppe: 40, sea_of_dunes: 30, ashar_valley: 25, black_range: 120, khetmar_pass: 100, ochre_spine: 110, sefrah: 20, tamesh: 25,
  khetmar: 70, zuri_camp: 35, ouresh_camp: 35, seven_crowns: 45, first_names: 40, sunken_obelisk: 35, unfinished_pyramid: 30, rain_pass: 90, tirthali: 30,
  ilavati_valley: 30, sarovan: 25, shaila_highlands: 120, shailagarh: 100, parasol_plains: 35, mandapur: 30, golden_shore: 4, suvarnatira: 8, deepgreen: 45,
  kanthar: 40, siruvet_pyramid: 40, qeshet: 35, merrab: 6, tel_ashun: 10, ennus_well: 20,
  // The north (the ridge already stands tall on its own raise).
  vargskeld: 45, skarnholm: 10, ravnsvik: 8, oathsworn_hall: 30, embermoot: 50, redwake_camp: 50, varn_ridge: 90, oathgate_pass: 90, zoryavik: 40, hearthwatch: 80,
  krasnogor: 35, bereslav: 20, zlatna_gora: 80, svetloye: 45, old_bough: 50, grimfell: 90, sokol_hills: 70,
  // The seas.
  outer_sea: 0, mizukai_sea: 0, sunward_strait: 0, vargskeld_sea: 0, zoryavik_coast: 0, skarnholm_bay: 0,
};
/**
 * Places that stand at a height of their own, whatever their region's (mainland coordinates, radius in tiles, height):
 * Frostpeak's town up on its shelf at the top of the switchbacks, and the old camp below it at the foot of the climb.
 */
const ANCHORS: readonly { x: number; y: number; r: number; height: number }[] = [
  { x: 252, y: 31, r: 20, height: 235 },   // Frostpeak, on its shelf
  { x: 195, y: 30, r: 16, height: 95 },    // the old camp and the lower lodge
];
/** How far inland from the sea low land takes to climb to its region's height (tiles; high land, less). */
const SHORE = 18;
/** How far round a building its terrace is level, and how far it eases out from there (tiles). */
export const TERRACE = 3, TERRACE_EASE = 5;
/** How far round the water the shore lies flat at the water's level (tiles), and how far the land can take to come back to its own height. */
export const WATER_FLAT = 2, SHORE_REACH = 32;
/** How far a river's floor falls before it's a new reach, a fall below the last (world pixels). */
export const FALL = 30;   // (world.ts FALL_STEP is the same)

const isWet = (t: number) => t === T.WATER || t === T.DEEP || t === T.BRIDGE;
const smoothstep = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };

/** The floor of the land, per tile (zero below the overworld). */
export function buildElevation(ctx: GenContext, buildings: readonly Building[]): Float32Array {
  const { tiles, region } = ctx, R = OVERWORLD_H, base = new Float32Array(W * H);
  // ---------- Each region's height ----------
  const alt = REGIONS.map(r => ALTITUDE[r.id] ?? 20 + 10 * r.danger);
  let field = new Float32Array(W * R);
  for (let i = 0; i < W * R; i++) field[i] = alt[region[i]] ?? 20;
  // ---------- Long slopes: three passes of a wide box blur, along the rows then down the columns ----------
  const blur = (src: Float32Array, r: number) => {
    const out = new Float32Array(src.length), tmp = new Float32Array(src.length);
    for (let y = 0; y < R; y++) { let sum = 0; const row = y * W; for (let x = -r; x <= r; x++) sum += src[row + Math.max(0, Math.min(W - 1, x))];
      for (let x = 0; x < W; x++) { tmp[row + x] = sum / (2 * r + 1); sum += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; } }
    for (let x = 0; x < W; x++) { let sum = 0; for (let y = -r; y <= r; y++) sum += tmp[Math.max(0, Math.min(R - 1, y)) * W + x];
      for (let y = 0; y < R; y++) { out[y * W + x] = sum / (2 * r + 1); sum += tmp[Math.min(R - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; } }
    return out;
  };
  for (let pass = 0; pass < 3; pass++) field = blur(field, 10);
  // ---------- Down to the sea: the open water joined to the map's edge is the sea, and the land climbs from it ----------
  // (Open water: most of the tiles round it are water too. A river is narrower, so a river isn't the sea: it runs down the
  // land's own slope instead of cutting a sea-level gorge up into the hills.)
  const open = new Uint8Array(W * R);
  for (let y = 2; y < R - 2; y++) for (let x = 2; x < W - 2; x++) { if (!isWet(tiles[y * W + x])) continue; let n = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isWet(tiles[(y + dy) * W + x + dx])) n++; if (n >= 19) open[y * W + x] = 1; }
  for (let i = 0; i < W * R; i++) { const x = i % W, y = (i - x) / W; if ((x < 2 || y < 2 || x >= W - 2 || y >= R - 2) && isWet(tiles[i])) open[i] = 1; }
  const sea = new Uint8Array(W * R), dist = new Uint16Array(W * R).fill(0xffff), queue = new Int32Array(W * R);
  let head = 0, tail = 0;
  for (let x = 0; x < W; x++) for (const y of [0, R - 1]) { const i = y * W + x; if (open[i] && !sea[i]) { sea[i] = 1; queue[tail++] = i; } }
  for (let y = 0; y < R; y++) for (const x of [0, W - 1]) { const i = y * W + x; if (open[i] && !sea[i]) { sea[i] = 1; queue[tail++] = i; } }
  while (head < tail) { const i = queue[head++], x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= R) continue; const k = ny * W + nx; if (!sea[k] && open[k]) { sea[k] = 1; queue[tail++] = k; } } }
  // (The sea's own narrow edges, a tile or two of shallows between its open water and the beach, are the sea too.)
  for (let pass = 0; pass < 2; pass++) { const add: number[] = []; for (let i = 0; i < W * R; i++) { if (sea[i] || !isWet(tiles[i])) continue; const x = i % W, y = (i - x) / W; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < W && ny < R && sea[ny * W + nx]; })) add.push(i); } for (const i of add) sea[i] = 1; }
  head = tail = 0;
  for (let i = 0; i < W * R; i++) if (sea[i]) { dist[i] = 0; queue[tail++] = i; }
  while (head < tail) { const i = queue[head++], x = i % W, y = (i - x) / W, d = dist[i]; if (d >= SHORE) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= R) continue; const k = ny * W + nx; if (dist[k] > d + 1) { dist[k] = d + 1; queue[tail++] = k; } } }
  // (High ground meets the sea in cliffs, low ground in long shores: the climb from the water is shorter the higher the land.)
  for (let i = 0; i < W * R; i++) { const reach = Math.max(6, SHORE * (1 - field[i] / 300)); base[i] = sea[i] ? 0 : field[i] * smoothstep(dist[i] === 0xffff ? 1 : dist[i] / reach); }
  // ---------- The places with heights of their own ----------
  for (const a of ANCHORS) { const at = mainlandAt(a.x, a.y);
    for (let y = Math.max(0, at.y - a.r); y <= Math.min(R - 1, at.y + a.r); y++) for (let x = Math.max(0, at.x - a.r); x <= Math.min(W - 1, at.x + a.r); x++) {
      const i = y * W + x, d = Math.hypot(x - at.x, y - at.y); if (d > a.r || sea[i]) continue; const t = smoothstep(1 - d / a.r) ; base[i] += (a.height - base[i]) * t; } }
  // ---------- Every body of water lies level: the sea and the low water joined to it at sea level; a mountain river in
  // level reaches, a fall between each and the next ----------
  // (A body: water joined by water and bridges, eight ways (water touching at a corner shares that corner). A reach:
  // a body's water whose floor lies in the same FALL step, joined, open water (a lake, the sea) never split; the sea's reach is at 0, any other at its middle
  // height, the median of the floor under it, so the land comes down to some of it and up to the rest.)
  const connOf = new Int32Array(W * R).fill(-1), around = (x: number, y: number, visit: (j: number) => void) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= R) continue; visit(ny * W + nx); } };
  let bodies = 0;
  for (let s = 0; s < W * R; s++) {
    if (connOf[s] >= 0 || !isWet(tiles[s])) continue;
    const id = bodies++, list = [s]; connOf[s] = id;
    for (let k = 0; k < list.length; k++) { const i = list[k], x = i % W; around(x, (i - x) / W, j => { if (connOf[j] < 0 && isWet(tiles[j])) { connOf[j] = id; list.push(j); } }); }
  }
  const step = (i: number) => sea[i] ? 0 : Math.floor(base[i] / FALL);
  const bodyOf = new Int32Array(W * R).fill(-1), levels: number[] = [], sizes: number[] = [], conn: number[] = [], members: number[][] = [], seaReach: boolean[] = [];
  for (let s = 0; s < W * R; s++) {
    if (bodyOf[s] >= 0 || connOf[s] < 0) continue;
    const id = levels.length, reach = [s], st = step(s); bodyOf[s] = id; let isSea = false;
    for (let k = 0; k < reach.length; k++) { const i = reach[k], x = i % W; if (sea[i]) isSea = true; around(x, (i - x) / W, j => { if (bodyOf[j] < 0 && connOf[j] >= 0 && (step(j) === st || open[i] || open[j])) { bodyOf[j] = id; reach.push(j); } }); }
    if (isSea) levels.push(0); else { const under = reach.map(i => base[i]).sort((p, q) => p - q); levels.push(under[under.length >> 1]); }
    sizes.push(isSea ? Infinity : reach.length); conn.push(connOf[s]); members.push(reach); seaReach.push(isSea);
  }
  const join = levels.map((_, k) => k), top = (k: number): number => join[k] === k ? k : (join[k] = top(join[k]));
  const unite = (p: number, q: number) => { p = top(p); q = top(q); if (p === q) return; const keep = sizes[p] >= sizes[q] ? p : q, gone = keep === p ? q : p; join[gone] = keep; sizes[keep] += sizes[gone]; seaReach[keep] ||= seaReach[gone]; };
  // (A reach of a few tiles isn't a reach: it lies with the biggest reach beside it.)
  for (let k = 0; k < members.length; k++) if (sizes[k] < 12) { let best = -1; for (const i of members[k]) { const x = i % W; around(x, (i - x) / W, j => { const r = bodyOf[j]; if (r >= 0 && top(r) !== top(k) && (best < 0 || sizes[top(r)] > sizes[top(best)])) best = r; }); } if (best >= 0) unite(best, k); }
  // (Two waters with a single tile of land between them would share its corners: they lie at one level, the bigger one's, the sea's above all.)
  for (let i = 0; i < W * R; i++) {
    if (connOf[i] >= 0) continue;
    const x = i % W; let first = -1;
    around(x, (i - x) / W, j => { const r = bodyOf[j]; if (r < 0) return; if (first < 0) first = r; else if (conn[r] !== conn[first]) unite(first, r); });
  }
  // ---------- The towns: buildings whose terraces would touch share one level (a town's square is level), their mean
  // height; a town at the sea comes down to it, and water in a town (a moat, a canal, a pond by a house) lies at the
  // town's level, so walls, quays and water all meet ----------
  const list = buildings.filter(b => b.y0 < R), parent = list.map((_, k) => k), find = (k: number): number => parent[k] === k ? k : (parent[k] = find(parent[k]));
  const gap = 2 * TERRACE + 2;
  for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) {
    const A = list[a], C = list[c];
    if (A.x0 - gap <= C.x1 && C.x0 - gap <= A.x1 && A.y0 - gap <= C.y1 && C.y0 - gap <= A.y1) parent[find(a)] = find(c);
  }
  // The water each building stands beside (its reaches), and each town's mean height.
  const besides = list.map(b => { const at = new Set<number>(); for (let y = Math.max(0, b.y0 - 1); y <= Math.min(R - 1, b.y1 + 1); y++) for (let x = Math.max(0, b.x0 - 1); x <= Math.min(W - 1, b.x1 + 1); x++) { const r = bodyOf[y * W + x]; if (r >= 0) at.add(top(r)); } return [...at]; });
  const means = new Map<number, { total: number; n: number }>();
  list.forEach((b, k) => { const cx = Math.round((b.x0 + b.x1) / 2), cy = Math.min(R - 1, Math.round((b.y0 + b.y1) / 2)), e = means.get(find(k)) ?? { total: 0, n: 0 }; e.total += base[cy * W + cx]; e.n++; means.set(find(k), e); });
  const townLevel = new Map<number, number>(); for (const [root, e] of means) townLevel.set(root, e.total / e.n);
  // A low town by the sea comes down to it (its quays meet the water); a high one keeps its height and stands over the
  // sea on a bank (the renderers draw the bank). Any other water by a town lies at the town's level: a moat, a canal.
  const rootLevel = levels.map((_, k) => levels[top(k)]);
  list.forEach((_, k) => { if (besides[k].some(t => seaReach[t]) && townLevel.get(find(k))! <= FALL) townLevel.set(find(k), 0); });
  list.forEach((_, k) => { for (const t of besides[k]) if (!seaReach[t]) rootLevel[t] = townLevel.get(find(k))!; });
  for (let k = 0; k < levels.length; k++) levels[k] = rootLevel[top(k)];
  // How far every tile is from the water (tiles, eight ways, up to SHORE_REACH) and which body is nearest.
  const near = new Uint8Array(W * R).fill(255), nearBody = new Int32Array(W * R).fill(-1);
  head = tail = 0;
  for (let i = 0; i < W * R; i++) if (bodyOf[i] >= 0) { near[i] = 0; nearBody[i] = bodyOf[i]; queue[tail++] = i; }
  while (head < tail) { const i = queue[head++], x = i % W, y = (i - x) / W, d = near[i]; if (d >= SHORE_REACH) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= R) continue; const k = ny * W + nx; if (near[k] > d + 1) { near[k] = d + 1; nearBody[k] = nearBody[i]; queue[tail++] = k; } } }
  // The water and its shore (WATER_FLAT tiles) at the water's level; beyond, the land eases back to its own height.
  const toWater = (i: number) => {
    if (nearBody[i] < 0) return;
    const level = levels[nearBody[i]], d = near[i];
    if (d <= WATER_FLAT) { base[i] = level; return; }
    // (As at the sea: low land comes down to the water in a long shore, high land in a steep one, a cliff, Dawnhold's way.)
    const span = Math.max(3, SHORE * (1 - Math.min(1, Math.abs(base[i] - level) / 300))), t = smoothstep((d - WATER_FLAT) / span);
    base[i] = level + (base[i] - level) * t;
  };
  for (let i = 0; i < W * R; i++) toWater(i);
  // (Where the shores of two waters overlap, a tile beside water stands at that water's level, the higher of two: the
  // corners round every water tile are then all at its level, and a strip of land between a tarn and the sea drops
  // from the one to the other.)
  for (let i = 0; i < W * R; i++) {
    if (bodyOf[i] >= 0 || near[i] > WATER_FLAT) continue;
    const x = i % W, y = (i - x) / W; let beside = -Infinity, within = -Infinity;
    for (let dy = -WATER_FLAT; dy <= WATER_FLAT; dy++) for (let dx = -WATER_FLAT; dx <= WATER_FLAT; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= R) continue; const body = bodyOf[ny * W + nx]; if (body < 0) continue;
      if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) beside = Math.max(beside, levels[body]); else within = Math.max(within, levels[body]);
    }
    base[i] = beside !== -Infinity ? beside : within;
  }
  // ---------- A terrace for every building: level over it and round it at its town's level, easing out into the slope
  // (neither the water nor its flat shore moved; a castle on a shore stands on its own sea cliff: Dawnhold) ----------
  const nearest = new Float32Array(W * R).fill(Infinity), levelAt = new Float32Array(W * R), reach = TERRACE + TERRACE_EASE;
  list.forEach((b, k) => { const level = townLevel.get(find(k))!;
    for (let y = Math.max(0, b.y0 - reach); y <= Math.min(R - 1, b.y1 + reach); y++) for (let x = Math.max(0, b.x0 - reach); x <= Math.min(W - 1, b.x1 + reach); x++) {
      const i = y * W + x, d = Math.max(b.x0 - x, x - b.x1, b.y0 - y, y - b.y1, 0);
      if (d < nearest[i]) { nearest[i] = d; levelAt[i] = level; } } });
  for (let i = 0; i < W * R; i++) if (nearest[i] !== Infinity && !sea[i] && near[i] > WATER_FLAT) { const t = smoothstep((nearest[i] - TERRACE) / TERRACE_EASE); base[i] = levelAt[i] + (base[i] - levelAt[i]) * t; }
  // (Kept to the bake's steps, so the baked world's heights come out exactly the same.)
  for (let i = 0; i < W * R; i++) base[i] = Math.round(Math.max(0, base[i]) * 64) / 64;
  return base;
}
