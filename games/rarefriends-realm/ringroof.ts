/**
 * The Rare Friends Ring's roof: the concourse (the covered ring between the outer and inner walls) is roofed over in
 * stone, battlemented along both edges, and the roof is a walk you can climb to by the Ring's two staircases: round
 * the whole Ring, behind the parapet, looking down into the pit, with braziers and banners and benches for watching.
 *
 * The roof is the concourse's building: a stack of one-row building records covering the ring (a building record is a
 * rectangle, the ring isn't), all one `complex`, flat-roofed, so from outside it's one battlemented drum and from
 * inside the roof lifts away like any other. The walk is that complex's first storey (a Floor), stored in the storey
 * rows like the castle's.
 */
import { ARENA, FLOOR_Y, T, type Floor, type GenContext, type worldTools } from "./world.ts";

type Tools = ReturnType<typeof worldTools>;
export const RING_COMPLEX = "friends_ring";
/** Where the walk is kept in the storey rows (its left edge; it starts on the first storey row): clear of every other storey. */
const STORE_X = 128;

export function roofRing(ctx: GenContext, t: Tools, floors: Floor[]) {
  const { get, put, add, decor, tileIndex } = t, STORE_Y = FLOOR_Y + 1;
  const { x: cx, y: cy, outer, inner } = ARENA, dist = (x: number, y: number) => Math.hypot(x - cx, y - cy);
  const x0 = cx - outer - 1, y0 = cy - outer - 1, x1 = cx + outer + 1, y1 = cy + outer + 1;
  // Under the roof: the walls and everything between them.
  const under = (x: number, y: number) => { const d = dist(x, y); return d >= inner - 0.8 && d <= outer + 0.8; };
  // The roof, row by row: each run of covered tiles in a row is one building record.
  for (let y = y0; y <= y1; y++) {
    let start: number | null = null;
    for (let x = x0; x <= x1 + 1; x++) {
      const covered = x <= x1 && under(x, y) && (get(x, y) === T.WALL || get(x, y) === T.STONE || get(x, y) === T.CARPET);
      if (covered && start === null) start = x;
      if (!covered && start !== null) {
        ctx.buildings.push({ x0: start, y0: y, x1: x - 1, y1: y, roof: "flat", color: "#7d6f62", chimney: false, name: "The Rare Friends Ring", storeys: 1, complex: RING_COMPLEX, walls: "stone" });
        start = null;
      }
    }
  }
  // The walk on top: a storey covering the Ring's square, stone between the parapets, nothing over the pit or outside.
  const floor: Floor = { complex: RING_COMPLEX, level: 1, x0, y0, x1, y1, dx: STORE_X - x0, dy: STORE_Y - y0 };
  floors.push(floor);
  const up = (x: number, y: number) => ({ x: x + floor.dx, y: y + floor.dy });
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = dist(x, y), at = up(x, y);
    put(at.x, at.y, !under(x, y) ? T.VOID : Math.abs(d - outer) <= 0.8 || Math.abs(d - inner) <= 0.8 ? T.WALL : T.STONE);
    ctx.region[tileIndex(at.x, at.y)] = ctx.region[tileIndex(cx, cy)];
  }
  // Two staircases from the concourse, south-west and south-east of the lobby, against the outer wall.
  const walk = (x: number, y: number) => get(x, y) === T.STONE && ctx.objectAt[tileIndex(x, y)] < 0 && !ctx.spawns.some(s => s.x === x && s.y === y);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 40; k++) {
      // Along the concourse from about 50° off the gate, a step at a time, until there's room for the stairs and a landing.
      const a = Math.PI / 2 + side * (0.85 + k * 0.03), sx = Math.round(cx + Math.cos(a) * (outer - 1.6)), sy = Math.round(cy + Math.sin(a) * (outer - 1.6));
      const lx = Math.round(cx + Math.cos(a) * (outer - 3)), ly = Math.round(cy + Math.sin(a) * (outer - 3));
      if (!walk(sx, sy) || !walk(lx, ly) || (lx === sx && ly === sy) || Math.abs(lx - sx) + Math.abs(ly - sy) > 2) continue;
      const top = up(sx, sy), landing = up(lx, ly);
      if (get(top.x, top.y) !== T.STONE || get(landing.x, landing.y) !== T.STONE) continue;
      add({ kind: "ladder", look: "stairs", x: sx, y: sy, blocks: true, name: "Ring stairs", action: "Climb-up", to: landing });
      add({ kind: "ladder", look: "stairs", x: top.x, y: top.y, blocks: true, name: "Ring stairs", action: "Climb-down", to: { x: lx, y: ly } });
      break;
    }
  }
  // The walk was roofed all the way round once, on pillars, open to the pit. Three stretches of that roof still stand;
  // towards their ends it's fallen in, a slab here and there, rubble and the stumps of pillars where it came down.
  const ARCADES: readonly [number, number][] = [[-2.75, -1.95], [-1.25, -0.45], [0.02, 0.52]];
  const angleOf = (x: number, y: number) => Math.atan2(y - cy, x - cx);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = dist(x, y), at = up(x, y);
    if (get(at.x, at.y) !== T.STONE || d < inner + 0.9 || d > outer - 0.9) continue;
    const a = angleOf(x, y), arcade = ARCADES.find(([from, to]) => a >= from && a <= to);
    if (!arcade) continue;
    // How far into the stretch (0 at its ends, 1 in the middle): near the ends more of it has fallen.
    const depthIn = Math.min(a - arcade[0], arcade[1] - a) / ((arcade[1] - arcade[0]) / 2), roll = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    if (ctx.objectAt[tileIndex(at.x, at.y)] >= 0 || ctx.objects.some(o => o.kind === "ladder" && Math.abs(o.x - at.x) + Math.abs(o.y - at.y) <= 1)) continue;
    const standing = depthIn > 0.45 || (roll % 100) / 100 < depthIn * 1.6;
    // Pillars along both edges of the walk, every few tiles.
    const edge = d < inner + 1.6 || d > outer - 1.6, pillarHere = edge && (Math.round(a * 30) % 3 === 0);
    if (pillarHere) { decor(at.x, at.y, standing ? "pillar" : "ruin_wall", true, standing ? "A pillar of the old roof" : "The stump of a pillar, where the roof came down"); continue; }
    if (standing) decor(at.x, at.y, "canopy", false, "The old roof over the walk, still standing here");
    else if (roll % 3 === 0) decor(at.x, at.y, "rubble", false, "Fallen roofing");
  }
  // On the walk: braziers and banners round the parapet, benches looking into the pit.
  for (let k = 0; k < 32; k++) {
    const a = k / 32 * Math.PI * 2;
    const [ox, oy] = [Math.round(cx + Math.cos(a) * (outer - 1.5)), Math.round(cy + Math.sin(a) * (outer - 1.5))];
    const [ix, iy] = [Math.round(cx + Math.cos(a) * (inner + 1.5)), Math.round(cy + Math.sin(a) * (inner + 1.5))];
    const place = (x: number, y: number, kind: Parameters<typeof decor>[2], blocks: boolean, name?: string) => {
      const at = up(x, y);
      if (get(at.x, at.y) === T.STONE && ctx.objectAt[tileIndex(at.x, at.y)] < 0 && !ctx.objects.some(o => o.kind === "ladder" && Math.abs(o.x - at.x) + Math.abs(o.y - at.y) <= 1)) decor(at.x, at.y, kind, blocks, name);
    };
    if (k % 4 === 0) place(ox, oy, "torch", true);
    else if (k % 4 === 2) place(ox, oy, "banner", true, "The Ring's banner, cracking in the wind up here");
    if (k % 2 === 1) place(ix, iy, "bench", true, "A bench on the Ring's roof: the best seat for a fight, if you don't mind the wind");
  }
}
