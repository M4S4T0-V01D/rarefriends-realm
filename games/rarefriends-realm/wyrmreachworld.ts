/**
 * Wyrmreach moved north-west, up a mountain (the user's wish, 2026-10-12: Fernwick had grown too close to the dragons). The
 * old ash field north of the village is Whisperwood now, the forest stretched north of Fernwick and thinning to dead
 * trees as the ground climbs; at its north-west edge the land rises out of the bay as a mountain ringed with crag, and
 * switchbacks climb it to a plateau of ash and lava where the drakes roost, with the crater at its heart where Old
 * Cinder sleeps, and the drakes' nest on the far side past the lava. The hunters' camp stands at the foot of the pass.
 * Built in the world's own frame, after everything else above ground.
 */
import { REGIONS, T, W, worldTools, type GenContext, type RegionId } from "./world.ts";

/** The mountain: its plateau's ellipse (world coordinates), the crater at its heart, and the foot of the pass in the forest. */
export const WYRM_MOUNTAIN = { x: 596, y: 138, rx: 40, ry: 34, crater: { rx: 13, ry: 10 } } as const;
export const WYRM_PASS = [[646, 180], [641, 176], [635, 173], [640, 169], [634, 166], [628, 163], [623, 160], [619, 156], [615, 151]] as const;
/** The old ash field (the legacy frame's Wyrmreach, in world coordinates), forest now. */
export const OLD_WYRMREACH = { x0: 629, y0: 160, x1: 700, y1: 212 } as const;
/** Where the drakes' nest lies now: the plateau's far north-west, past the lava. */
export const WYRM_NEST = { x: 575, y: 118 } as const;

export function buildWyrmreach(ctx: GenContext) {
  const t = worldTools(ctx), { tiles, lift, raise, spawns, noise, noise2, random } = ctx, M = WYRM_MOUNTAIN;
  const idx = (x: number, y: number) => y * W + x;
  const place = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => { t.clearAt(x, y); t.decor(x, y, kind, blocks, name); };
  const sign = (x: number, y: number, text: string) => { t.clearAt(x, y); t.add({ kind: "sign", x, y, blocks: true, name: "Signpost", text }); };

  // ---------- The old ash field becomes forest: the ground, the camp and the dragons gone, Whisperwood grown over it ----------
  const O = OLD_WYRMREACH;
  for (let y = O.y0; y <= O.y1; y++) for (let x = O.x0; x <= O.x1; x++) {
    const i = idx(x, y), tile = tiles[i];
    if (tile === T.ASH || tile === T.LAVA || tile === T.CLIFF) { t.clearAt(x, y); tiles[i] = noise2(x * 1.3, y * 1.3) > 0.55 ? T.DARK_GRASS : T.GRASS; lift[i] = 0; raise[i] = 0; }
    if (tile !== T.WATER && tile !== T.DEEP && tile !== T.VOID) t.setRegion(x, y, "whisperwood");
  }
  for (let i = spawns.length - 1; i >= 0; i--) { const s = spawns[i]; if (s.x >= O.x0 && s.x <= O.x1 && s.y >= O.y0 && s.y <= O.y1 && (s.id === "ash_drake" || s.id === "cinder_drake" || s.id === "emberwyrm" || s.id === "drake_hunter")) spawns.splice(i, 1); }
  for (const object of ctx.objects) if (object.x >= O.x0 && object.x <= O.x1 && object.y >= O.y0 && object.y <= O.y1 && (object.kind === "sign" || object.kind === "bank" || (object.kind === "decor" && (object.decor === "tent" || object.decor === "torch" || object.decor === "bones")))) t.clearAt(object.x, object.y);

  // ---------- The mountain: a plateau of ash ringed with crag, rising out of the bay; the crater at its heart ----------
  const dist = (x: number, y: number, rx: number, ry: number) => ((x - M.x) / rx) ** 2 + ((y - M.y) / ry) ** 2;
  for (let y = M.y - M.ry - 6; y <= M.y + M.ry + 6; y++) for (let x = M.x - M.rx - 6; x <= M.x + M.rx + 6; x++) {
    if (!t.inBounds(x, y)) continue;
    const d = dist(x, y, M.rx, M.ry) + (noise(x * 0.9 + 300, y * 0.9) - 0.5) * 0.3 + (noise2(x * 2.1 + 40, y * 2.1) - 0.5) * 0.1, i = idx(x, y);
    if (d > 1.1) continue;
    t.clearAt(x, y); t.setRegion(x, y, "wyrmreach"); lift[i] = 0;
    if (d <= 0.84) { tiles[i] = noise(x * 1.5 + 90, y * 1.5) > 0.72 ? T.LAVA : T.ASH; raise[i] = 3.8; }
    else if (d <= 1.0) { tiles[i] = T.CLIFF; raise[i] = 3.8 - (d - 0.84) / 0.16 * 2.6 + (noise2(x, y) - 0.5) * 0.3; }
    else { tiles[i] = tiles[i] === T.WATER || tiles[i] === T.DEEP ? T.GRAVEL : tiles[i] === T.CLIFF ? T.GRAVEL : tiles[i]; raise[i] = Math.max(raise[i], 0.3); }
  }
  for (let y = M.y - M.crater.ry - 2; y <= M.y + M.crater.ry + 2; y++) for (let x = M.x - M.crater.rx - 2; x <= M.x + M.crater.rx + 2; x++) {
    const d = dist(x, y, M.crater.rx, M.crater.ry) + (noise2(x * 1.7, y * 1.7 + 70) - 0.5) * 0.12, i = idx(x, y), gap = x > M.x + 6 && y >= M.y - 1 && y <= M.y + 2;
    if (d <= 0.78) { tiles[i] = T.ASH; raise[i] = 3.8; }
    else if (d <= 1.02 && !gap) { tiles[i] = T.CLIFF; raise[i] = 4.6; }
  }
  t.blob(M.x - 2, M.y, 3.5, 2.5, T.LAVA, 0.2, tile => tile === T.ASH);
  // The pass: switchbacks up the south-east face from the forest, the path climbing as it goes (the inlet it crosses filled with scree first).
  for (let y = 150; y <= 190; y++) for (let x = 608; x <= 656; x++) {
    const i = idx(x, y); if (tiles[i] !== T.WATER && tiles[i] !== T.DEEP) continue;
    let near = false; for (let k = 0; k + 1 < WYRM_PASS.length && !near; k++) { const [ax, ay] = WYRM_PASS[k], [bx, by] = WYRM_PASS[k + 1], L = (bx - ax) ** 2 + (by - ay) ** 2, u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L)); near = Math.hypot(x - (ax + u * (bx - ax)), y - (ay + u * (by - ay))) <= 4; }
    if (near) { tiles[i] = T.GRAVEL; lift[i] = 0; raise[i] = Math.max(raise[i], 0.3); t.setRegion(x, y, "wyrmreach"); }
  }
  t.road(WYRM_PASS, 2, T.PATH);
  const foot = WYRM_PASS[0][1], top = WYRM_PASS[WYRM_PASS.length - 1][1];
  for (let y = top - 2; y <= foot + 2; y++) for (let x = 608; x <= 652; x++) if (tiles[idx(x, y)] === T.PATH) { raise[idx(x, y)] = 3.8 * Math.max(0, Math.min(1, (foot - y) / (foot - top))); t.setRegion(x, y, "wyrmreach"); }
  for (const [x, y] of [[637, 170], [631, 165], [644, 176]] as const) if (t.free(x, y)) t.rock(x, y, "moonsilver");
  // The dragons: ash drakes over the plateau, cinder drakes by the lava and in the crater, Old Cinder asleep at its heart.
  t.monsters("ash_drake", M.x - 30, M.y - 24, M.x + 30, M.y + 24, 9);
  t.monsters("cinder_drake", M.x - 26, M.y - 20, M.x + 26, M.y + 20, 5);
  t.monsters("cinder_drake", M.x - 8, M.y - 6, M.x + 8, M.y + 6, 2);
  t.monster("emberwyrm", M.x + 1, M.y - 3, 2);
  // The drakes' nest, on the far side past the lava: scorched bone, the egg, and the drakes that roost over it (mounts.ts).
  const N = WYRM_NEST;
  t.clearAt(N.x, N.y); t.add({ kind: "decor", decor: "bones", x: N.x, y: N.y, blocks: true, name: "A drake's nest", clue: "drake_nest" });
  for (const [dx, dy] of [[-1, 1], [1, -1], [2, 1], [-2, -1]] as const) if (t.free(N.x + dx, N.y + dy)) t.decor(N.x + dx, N.y + dy, "bones", false, "Scorched bones");
  t.monsters("ash_drake", N.x - 8, N.y - 6, N.x + 8, N.y + 6, 4);
  sign(621, 158, "Wyrmreach. The plateau, the crater, Old Cinder asleep in it. The nest is on the far side, past the lava.");
  // The hunters' camp at the foot of the pass: Ysolde's tent and fire, the deposit box, the warning.
  place(649, 182, "tent"); place(646, 184, "torch"); t.clearAt(650, 185); t.npc("drake_hunter", 650, 185, 1);
  t.clearAt(652, 182); t.add({ kind: "bank", x: 652, y: 182, blocks: true, name: "Bank deposit box" });
  sign(647, 187, "Wyrmreach. Dragons. Their breath burns through anything but a Wyrmward shield: King Hollis keeps a few.");

  // ---------- Whisperwood, north of Fernwick: the forest over the old field, thinning to dead trees at the mountain's foot ----------
  const forest = (x: number, y: number) => t.free(x, y) && (tiles[idx(x, y)] === T.GRASS || tiles[idx(x, y)] === T.DARK_GRASS) && !(x >= 640 && x <= 656 && y >= 176 && y <= 190);
  t.road([[677, 202], [666, 195], [656, 188], [648, 182]], 2.6, T.GRAVEL);
  t.scatter(O.x0, 190, O.x1, O.y1, 70, (x, y) => t.tree(x, y, random() > 0.4 ? "oak" : random() > 0.5 ? "maple" : "tree"), forest);
  t.scatter(O.x0, 176, O.x1, 190, 30, (x, y) => t.tree(x, y, random() > 0.5 ? "deadwood" : "tree"), forest);
  t.scatter(O.x0, O.y0, O.x1, 176, 38, (x, y) => random() > 0.25 ? t.tree(x, y, "deadwood") : t.decor(x, y, "boulder"), forest);
  sign(668, 198, "North, through the dead trees: the switchbacks up to Wyrmreach. The forest is Fernwick's; the mountain is the dragons'.");
  // The region's label moves with it.
  const entry = REGIONS.find(region => region.id === ("wyrmreach" as RegionId)) as { label: { x: number; y: number }; far?: boolean } | undefined;
  if (entry) { entry.label = { x: M.x, y: M.y - 20 }; entry.far = true; }
}
