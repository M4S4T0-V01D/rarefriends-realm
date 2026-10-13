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
  // ---------- Every inland lake lies level, at its lowest shore's height (a river, mostly narrow, keeps the slope) ----------
  const seen = new Uint8Array(W * R);
  for (let s = 0; s < W * R; s++) {
    if (seen[s] || sea[s] || !isWet(tiles[s])) continue;
    const body: number[] = [s]; seen[s] = 1; let low = Infinity, wide = 0;
    for (let k = 0; k < body.length; k++) { const i = body[k], x = i % W, y = (i - x) / W; low = Math.min(low, base[i]); wide += open[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= R) continue; const j = ny * W + nx; if (!seen[j] && !sea[j] && isWet(tiles[j])) { seen[j] = 1; body.push(j); } } }
    if (wide * 2 >= body.length) for (const i of body) base[i] = low;
  }
  // ---------- A terrace for every building: level over it and round it, easing out into the slope ----------
  // Buildings whose terraces would touch share one (a town's square is level), at their mean height; each tile takes the
  // nearest terrace's. (A castle on a shore stands on its own sea cliff: Dawnhold.)
  const list = buildings.filter(b => b.y0 < R), parent = list.map((_, k) => k), find = (k: number): number => parent[k] === k ? k : (parent[k] = find(parent[k]));
  const gap = 2 * TERRACE + 2;
  for (let a = 0; a < list.length; a++) for (let c = a + 1; c < list.length; c++) {
    const A = list[a], C = list[c];
    if (A.x0 - gap <= C.x1 && C.x0 - gap <= A.x1 && A.y0 - gap <= C.y1 && C.y0 - gap <= A.y1) parent[find(a)] = find(c);
  }
  const sums = new Map<number, { total: number; n: number }>();
  list.forEach((b, k) => { const cx = Math.round((b.x0 + b.x1) / 2), cy = Math.min(R - 1, Math.round((b.y0 + b.y1) / 2)), root = find(k), e = sums.get(root) ?? { total: 0, n: 0 }; e.total += base[cy * W + cx]; e.n++; sums.set(root, e); });
  const nearest = new Float32Array(W * R).fill(Infinity), levelAt = new Float32Array(W * R), reach = TERRACE + TERRACE_EASE;
  list.forEach((b, k) => { const e = sums.get(find(k))!, level = e.total / e.n;
    for (let y = Math.max(0, b.y0 - reach); y <= Math.min(R - 1, b.y1 + reach); y++) for (let x = Math.max(0, b.x0 - reach); x <= Math.min(W - 1, b.x1 + reach); x++) {
      const i = y * W + x, d = Math.max(b.x0 - x, x - b.x1, b.y0 - y, y - b.y1, 0);
      if (d < nearest[i]) { nearest[i] = d; levelAt[i] = level; } } });
  for (let i = 0; i < W * R; i++) if (nearest[i] !== Infinity && !sea[i]) { const t = smoothstep((nearest[i] - TERRACE) / TERRACE_EASE); base[i] = levelAt[i] + (base[i] - levelAt[i]) * t; }
  // (Kept to the bake's steps, so the baked world's heights come out exactly the same.)
  for (let i = 0; i < W * R; i++) base[i] = Math.round(Math.max(0, base[i]) * 64) / 64;
  return base;
}
