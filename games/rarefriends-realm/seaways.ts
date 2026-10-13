/**
 * The seaways: an ocean all the way round the Realm, and straits from the big inland seas out to it, so a vessel can
 * sail round the whole map and from one coast to another (the owner's wish: "expand the water around the entire map,
 * so that we can actually sail around it").
 *
 * - The Outer Sea: a band of open water along every edge of the overworld, deep outside and shallow nearer the shore,
 *   its coastline wandering. Where land ran into the edge it's cut back into beach. Nothing that matters is drowned:
 *   near a building, a person, a sign or a place the band pulls back, and the land between keeps its way inland.
 * - The straits: short channels from the inland seas to open water (found by the cheapest crossing of land: see the
 *   scratchpad's straits survey), shallow enough for a skiff, and bridged wherever a road crosses.
 *
 * Built last of all in generation (world.ts generateWorld, after the north), in the grown world's coordinates.
 */
import { OVERWORLD_H, T, W, isWater, worldTools, type GenContext, type RegionId } from "./world.ts";

/** How wide the Outer Sea's band is (tiles from the edge), before its coastline wanders. */
export const RING = 12;
/** The straits, as the land they cut (each end lies against water), and how wide. */
export const STRAITS: readonly { name: string; width: number; points: readonly (readonly [number, number])[] }[] = [
  { name: "The Deadwood sea to the Ilm", width: 5, points: [[697, 322], [699, 321], [709, 319], [713, 315], [713, 309], [713, 303], [722, 299], [734, 295], [746, 295], [756, 294], [763, 294]] },
  { name: "The Wyrmreach bay to the Deadwood sea", width: 4, points: [[558, 487], [558, 485], [563, 473], [564, 471]] },
  { name: "The Southshore water to the south sea", width: 4, points: [[731, 714], [733, 714], [744, 713], [756, 713], [770, 716], [785, 719], [800, 721], [814, 722], [816, 722]] },
  { name: "The Vargskeld lake to Skarnholm Bay", width: 4, points: [[242, 223], [242, 221], [242, 181], [242, 179]] },
  { name: "The Grimfell tarn to the Skarn", width: 3, points: [[132, 225], [133, 225], [134, 225], [136, 225]] },
  { name: "Glass Lake to the south sea", width: 4, points: [[819, 700], [819, 702], [819, 708], [819, 710]] },
];

export function openSeas(ctx: GenContext, places: Record<string, unknown>) {
  const t = worldTools(ctx), { get, put, setRegion, clearAt, tileIndex } = t, { lift, raise, objects, objectAt, spawns, buildings, noise2 } = ctx;
  const H = OVERWORLD_H;
  // ---------- What mustn't be drowned: buildings and their doors, people, signs and the like, the named places ----------
  const keep = new Uint8Array(W * H);
  const guard = (x: number, y: number, r: number) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) keep[ny * W + nx] = 1; } };
  for (const b of buildings) if (b.y0 < H) for (let y = b.y0 - 3; y <= b.y1 + 3; y++) for (let x = b.x0 - 3; x <= b.x1 + 3; x++) if (x >= 0 && y >= 0 && x < W && y < H) keep[y * W + x] = 1;
  for (const o of objects) if (o.y < H && o.name !== "__removed" && o.kind !== "tree" && !(o.kind === "decor" && ["boulder", "flowers", "rock", "bush", "rock_spire", "reeds"].includes(o.decor ?? ""))) guard(o.x, o.y, 2);
  for (const s of spawns) if (s.y < H && s.kind === "npc") guard(s.x, s.y, 3);
  for (const p of Object.values(places)) { const at = p as { x?: unknown; y?: unknown }; if (typeof at.x === "number" && typeof at.y === "number" && at.y < H) guard(at.x, at.y, 3); }
  // ---------- The Outer Sea ----------
  // How far in the band reaches at each point along each edge: wandering, and pulled back short of anything kept.
  const sides = [W, H, W, H].map(n => Float32Array.from({ length: n }, (_, p) => RING + (noise2(p * 0.08, p * 0.11) - 0.5) * 7));
  // (side 0 top: along x, depth y; 1 right: along y, depth W-1-x; 2 bottom: along x, depth H-1-y; 3 left: along y, depth x)
  const depthOf = (side: number, x: number, y: number) => side === 0 ? y : side === 1 ? W - 1 - x : side === 2 ? H - 1 - y : x;
  const alongOf = (side: number, x: number, y: number) => side === 0 || side === 2 ? x : y;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!keep[y * W + x]) continue;
    for (let side = 0; side < 4; side++) { const d = depthOf(side, x, y); if (d > RING + 6) continue; const a = alongOf(side, x, y), limit = sides[side];
      for (let p = Math.max(0, a - 6); p <= Math.min(limit.length - 1, a + 6); p++) limit[p] = Math.min(limit[p], d - 3); }
  }
  const outer = "outer_sea" as RegionId, made = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let reach = -1e9;
    for (let side = 0; side < 4; side++) reach = Math.max(reach, sides[side][alongOf(side, x, y)] - depthOf(side, x, y));
    if (reach <= 0) continue;
    const i = tileIndex(x, y), tile = get(x, y);
    if (tile === T.VOID || keep[i]) continue;
    if (!isWater(tile)) { made[i] = 1; clearAt(x, y); for (let k = spawns.length - 1; k >= 0; k--) if (spawns[k].x === x && spawns[k].y === y) spawns.splice(k, 1); }
    put(x, y, reach > 4 ? T.DEEP : T.WATER); lift[i] = 0; raise[i] = 0;
    setRegion(x, y, outer);
  }
  // ---------- The straits ----------
  for (const strait of STRAITS) t.line(strait.points, strait.width, (x, y, tile) => {
    const i = tileIndex(x, y);
    if (tile === T.VOID || tile === T.WALL || keep[i] && !(tile === T.PATH || tile === T.COBBLE || tile === T.BRIDGE)) return;
    if (tile === T.PATH || tile === T.COBBLE || tile === T.BRIDGE) { put(x, y, T.BRIDGE); return; }
    if (!isWater(tile)) { made[i] = 1; clearAt(x, y); }
    put(x, y, T.WATER); lift[i] = 0; raise[i] = 0;
  });
  // ---------- New shores: a beach where grass or snow met the new water, so the coast reads as a coast ----------
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const tile = get(x, y); if ((tile !== T.GRASS && tile !== T.DARK_GRASS && tile !== T.SNOW) || keep[tileIndex(x, y)]) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => made[tileIndex(x + dx, y + dy)])) put(x, y, T.SAND);
  }
}
