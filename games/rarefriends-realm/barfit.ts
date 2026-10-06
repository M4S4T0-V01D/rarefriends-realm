/**
 * Fitting out the Realm's bars (their people and their board are in bars.ts): found by name once the world is built,
 * cleared of the old furniture (anything fixed, like a kitchen range, stays), and laid out from the door: the bar
 * counter across the room with the barkeep in the gap of it and barrels and bottles behind; the job board by the door;
 * the quiet trader at the corner table; tables for everyone else where there's room. Everything is placed so the whole
 * floor can still be walked from the door.
 */
import { T, type Building, type GenContext, type worldTools } from "./world.ts";

type Tools = ReturnType<typeof worldTools>;
/** Each bar: its building's name, its barkeep and its quiet trader (bars.ts `BARS` must agree: a test checks). */
export const BAR_SITES: readonly { bar: string; building: string; keeper: string; fence: string }[] = [
  { bar: "sleepy", building: "The Sleepy Friend", keeper: "innkeeper", fence: "fence_sleepy" },
  { bar: "prayer", building: "The Seventh Prayer", keeper: "raria_innkeeper", fence: "fence_prayer" },
  { bar: "vat", building: "The Crooked Vat", keeper: "vat_keeper", fence: "fence_vat" },
  { bar: "hound", building: "The Obedient Hound", keeper: "lawgate_innkeeper", fence: "fence_hound" },
  { bar: "kettle", building: "The Stone Kettle", keeper: "kettle_keeper", fence: "fence_kettle" },
  { bar: "freepour", building: "The Free Pour", keeper: "freepour_keeper", fence: "fence_freepour" },
];

export function fitBars(ctx: GenContext, t: Tools) {
  for (const site of BAR_SITES) {
    const b = ctx.buildings.find(entry => entry.name === site.building);
    if (b) fitBar(ctx, t, b, site);
  }
}

function fitBar(ctx: GenContext, t: Tools, b: Building, site: typeof BAR_SITES[number]) {
  const { get, tileIndex, decor, add, npc, clearAt } = t;
  // The door: the first open tile in the outline, and which wall it's in.
  let door: "n" | "s" | "e" | "w" | null = null;
  const doorTiles: [number, number][] = [];
  for (let x = b.x0 + 1; x < b.x1; x++) { if (get(x, b.y0) !== T.WALL) { door ??= "n"; doorTiles.push([x, b.y0]); } if (get(x, b.y1) !== T.WALL) { door ??= "s"; doorTiles.push([x, b.y1]); } }
  for (let y = b.y0 + 1; y < b.y1; y++) { if (get(b.x0, y) !== T.WALL) { door ??= "w"; doorTiles.push([b.x0, y]); } if (get(b.x1, y) !== T.WALL) { door ??= "e"; doorTiles.push([b.x1, y]); } }
  if (!door) return;
  // Local coordinates: u along the far wall (1 … umax), v in from it (1 … vmax, vmax by the door).
  const alongX = door === "n" || door === "s", umax = (alongX ? b.x1 - b.x0 : b.y1 - b.y0) - 1, vmax = (alongX ? b.y1 - b.y0 : b.x1 - b.x0) - 1;
  if (umax < 4 || vmax < 4) return;
  const at = (u: number, v: number): [number, number] => door === "s" ? [b.x0 + u, b.y0 + v] : door === "n" ? [b.x0 + u, b.y1 - v] : door === "e" ? [b.x0 + v, b.y0 + u] : [b.x1 - v, b.y0 + u];
  const doorU = doorTiles.filter(([x, y]) => (alongX ? y === (door === "n" ? b.y0 : b.y1) : x === (door === "w" ? b.x0 : b.x1))).map(([x, y]) => alongX ? x - b.x0 : y - b.y0);
  const nearDoor = (u: number, v: number) => v >= vmax - 1 && doorU.some(du => Math.abs(du - u) <= 0);
  // Clear the old furniture and the people (the barkeep comes back to the counter); fixed things stay.
  for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) {
    const o = ctx.objectAt[tileIndex(x, y)];
    if (o >= 0 && ctx.objects[o].kind === "decor") clearAt(x, y);
  }
  for (let i = ctx.spawns.length - 1; i >= 0; i--) { const s = ctx.spawns[i]; if (s.x > b.x0 && s.x < b.x1 && s.y > b.y0 && s.y < b.y1) ctx.spawns.splice(i, 1); }
  const free = (u: number, v: number) => { const [x, y] = at(u, v); return get(x, y) !== T.WALL && ctx.objectAt[tileIndex(x, y)] < 0; };
  const put = (u: number, v: number, kind: Parameters<typeof decor>[2], name?: string) => { if (!free(u, v)) return false; const [x, y] = at(u, v); decor(x, y, kind, true, name); return true; };
  // The counter, the barkeep in the gap of it, barrels and bottles behind.
  const mid = Math.round((1 + umax) / 2);
  for (let u = 1; u <= umax; u++) if (u !== mid) put(u, 2, "table", "The bar, ringed from a thousand tankards");
  put(1, 1, "barrel", "A cask of the house's own"); put(umax, 1, "barrel", "A cask of ale");
  if (umax >= 5) { put(mid - 1, 1, "shelf", "Bottles behind the bar"); put(mid + 1, 1, "shelf", "Bottles behind the bar, the good ones at the top"); }
  { const [x, y] = at(mid, 2); npc(site.keeper, x, y); }
  // The quiet trader's table in the corner away from the door, the job board by the door on the other side.
  const doorMid = doorU.length ? doorU.reduce((sum, u) => sum + u, 0) / doorU.length : mid, side = doorMid <= mid ? umax : 1, other = side === 1 ? umax : 1;
  put(side, vmax, "table", "A corner table. Nobody else sits here.");
  { const [x, y] = at(side, vmax - 1); if (free(side, vmax - 1)) npc(site.fence, x, y); }
  { const v = nearDoor(other, vmax) ? vmax - 1 : vmax, [x, y] = at(other, v); if (free(other, v)) add({ kind: "board", x, y, blocks: true, name: "Job board", text: site.bar }); }
  // Tables for everyone else, where there's room (taken back out if they'd shut anything off).
  const extras: [number, number][] = [];
  for (let v = 4; v <= vmax - 2; v += 2) for (const u of [mid - 2, mid + 2]) if (u >= 2 && u <= umax - 1 && !nearDoor(u, v) && put(u, v, "table", "A table, sticky")) extras.push(at(u, v));
  if (!reachable(ctx, t, b)) for (const [x, y] of extras) clearAt(x, y);
  b.facade = "inn";
}

/** Whether every open tile and everyone inside a building can be walked to from its doors. */
function reachable(ctx: GenContext, t: Tools, b: Building): boolean {
  const { get, tileIndex } = t, open = (x: number, y: number) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && get(x, y) !== T.WALL && !(ctx.objectAt[tileIndex(x, y)] >= 0 && ctx.objects[ctx.objectAt[tileIndex(x, y)]].blocks);
  const seen = new Set<number>(), queue: [number, number][] = [];
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if ((x === b.x0 || x === b.x1 || y === b.y0 || y === b.y1) && open(x, y)) { seen.add(tileIndex(x, y)); queue.push([x, y]); }
  while (queue.length) { const [x, y] = queue.pop()!; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = tileIndex(x + dx, y + dy); if (!seen.has(k) && open(x + dx, y + dy)) { seen.add(k); queue.push([x + dx, y + dy]); } } }
  for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) {
    if (open(x, y) && !seen.has(tileIndex(x, y))) return false;
    const o = ctx.objectAt[tileIndex(x, y)];
    if (o >= 0 && ctx.objects[o].blocks && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(tileIndex(x + dx, y + dy)))) return false;
  }
  return ctx.spawns.every(s => s.x <= b.x0 || s.x >= b.x1 || s.y <= b.y0 || s.y >= b.y1 || [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(tileIndex(s.x + dx, s.y + dy))));
}
