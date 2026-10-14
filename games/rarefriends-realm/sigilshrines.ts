/**
 * The sigil altars' shrines, built in the grown world (after the north and the Exchange): each altar out in the open
 * stands in a little domed shrine of its own, paved, a column at each corner, the stone tinted the sigil's colour
 * (render.ts draws the dome over them); some of the shrines are old, a column broken and stones lying about. The
 * altars for the first sigils stay near Friendhollow; the deeper ones are out across the Realm, each where its sigil
 * belongs: the Ember's by Ashfall's lava, the Shade's in the Deadwood, the Star's up at Svetloye, the Storm's on the
 * Vargskeld coast, the Bloom's in Hanazono's gardens, the Path's out on the Ochre Steppe.
 */
import { OVERWORLD_H, T, WALKABLE, isUnderground, regionIndex, worldTools, type GenContext, type RegionId } from "./world.ts";

/** Where the deeper altars go: the region, and the altar's name. */
export const SHRINE_HOMES: readonly (readonly [sigil: string, name: string, region: RegionId])[] = [
  ["ember_sigil", "Ember altar", "ashfall"], ["shade_sigil", "Shade altar", "deadwood"], ["star_sigil", "Star altar", "svetloye"],
  ["storm_sigil", "Storm altar", "ravnsvik"], ["bloom_sigil", "Bloom altar", "hanazono"], ["path_sigil", "Path altar", "ochre_steppe"],
];
/** How far round an altar its shrine reaches (tiles): paving to 2, the columns at the corners of that. */
export const SHRINE_R = 2;
/** Which shrines are old and broken: by the sigil, the same every time. */
export const shrineBroken = (sigil: string) => ["thought_sigil", "shade_sigil", "path_sigil", "storm_sigil"].includes(sigil);

export function buildSigilShrines(ctx: GenContext) {
  const t = worldTools(ctx), { W, tiles, region, objectAt, objects } = ctx;
  const natural = new Set<number>([T.GRASS, T.DARK_GRASS, T.SAND, T.SNOW, T.ASH, T.GRAVEL, T.SWAMP, T.FARMLAND]);
  const clearSpot = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy; if (!t.inBounds(nx, ny) || ny >= OVERWORLD_H) return false;
      const i = ny * W + nx; if (!natural.has(tiles[i]) || objectAt[i] >= 0 || ctx.buildings.some(b => nx >= b.x0 - 1 && nx <= b.x1 + 1 && ny >= b.y0 - 1 && ny <= b.y1 + 1)) return false;
    }
    return true;
  };
  // The deeper altars, moved out: whatever stood for them near Friendhollow goes, and each is set down in open ground
  // nearest the middle of its region.
  for (const [sigil, name, home] of SHRINE_HOMES) {
    for (const o of objects) if (o.kind === "sigil_altar" && o.sigil === sigil) t.clearAt(o.x, o.y);
    const r = regionIndex(home); if (r < 0) continue;
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < W * OVERWORLD_H; i++) if (region[i] === r) { sx += i % W; sy += Math.floor(i / W); n++; }
    if (!n) continue;
    const cx = Math.round(sx / n), cy = Math.round(sy / n);
    let at: [number, number] | null = null;
    for (let d = 0; d < 60 && !at; d++) for (let dy = -d; dy <= d && !at; dy++) for (let dx = -d; dx <= d && !at; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const x = cx + dx, y = cy + dy; if (region[y * W + x] === r && clearSpot(x, y, SHRINE_R + 1)) at = [x, y];
    }
    if (!at) continue;
    t.add({ kind: "sigil_altar", sigil, x: at[0], y: at[1], blocks: true, name });
  }
  // Every altar out in the open gets its shrine, where there's room for one (an altar in a city square or a cave keeps
  // its own ground).
  for (const altar of objects.filter(o => o.kind === "sigil_altar" && o.name !== "__removed" && !isUnderground(o.y))) {
    const { x, y } = altar, sigil = altar.sigil ?? "";
    let room = true;
    for (let dy = -SHRINE_R; dy <= SHRINE_R && room; dy++) for (let dx = -SHRINE_R; dx <= SHRINE_R && room; dx++) {
      const nx = x + dx, ny = y + dy, i = ny * W + nx;
      if ((dx || dy) && (!t.inBounds(nx, ny) || !WALKABLE.has(tiles[i]) || tiles[i] === T.BRIDGE || ctx.buildings.some(b => nx >= b.x0 && nx <= b.x1 && ny >= b.y0 && ny <= b.y1))) room = false;
    }
    if (!room) continue;
    for (let dy = -SHRINE_R; dy <= SHRINE_R; dy++) for (let dx = -SHRINE_R; dx <= SHRINE_R; dx++) { if (!dx && !dy) continue; t.clearAt(x + dx, y + dy); t.put(x + dx, y + dy, T.STONE); }
    const broken = shrineBroken(sigil);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx2, sy2], k) => {
      const px = x + sx2 * SHRINE_R, py = y + sy2 * SHRINE_R;
      t.add({ kind: "decor", decor: "pillar", x: px, y: py, blocks: true, name: "Pillar", sigil, height: broken && k === 1 ? 22 : 66 });
    });
    // An old shrine: stones of its fallen column lying inside.
    if (broken) for (const [dx, dy] of [[2, 0], [1, -2]] as const) { const nx = x + dx, ny = y + dy; if (objectAt[ny * W + nx] < 0) t.decor(nx, ny, "rubble", false, "Rubble"); }
  }
}
/** Whether an altar stands in a shrine (its four columns in place, in its sigil). */
export function shrineOf(at: (x: number, y: number) => { decor?: string; sigil?: string; kind: string } | null, x: number, y: number, sigil: string | undefined) {
  return !!sigil && [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([dx, dy]) => { const o = at(x + dx * SHRINE_R, y + dy * SHRINE_R); return o?.kind === "decor" && o.decor === "pillar" && o.sigil === sigil; });
}
