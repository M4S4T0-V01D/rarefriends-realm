/**
 * The mounts' places (mounts.ts has the people and quests), in the world's own frame, drawn after the settlements: the
 * poachers' camp at The Wilds' east edge with the tiger's cage of stakes, the tracks that lead there from Tallgrass, and
 * the drakes' nest up by Wyrmreach's lava. (The Friendhollow stables themselves are grown in world.ts, in the mainland's
 * frame, where they were built.)
 */
import { T, W, mainlandToWorld, worldTools, type DecorKind, type GenContext } from "./world.ts";

/** The poachers' camp at The Wilds' east edge (world coordinates), where their kills count (mounts.ts). */
export const POACHER_CAMP = { x0: 586, y0: 423, x1: 602, y1: 435 };

export function buildMountCountry(ctx: GenContext) {
  const t = worldTools(ctx), { tiles } = ctx;
  const idx = (x: number, y: number) => y * W + x;
  const place = (x: number, y: number, kind: DecorKind, blocks = true, name?: string) => { t.clearAt(x, y); t.decor(x, y, kind, blocks, name); };
  const clue = (x: number, y: number, kind: DecorKind, name: string, clueId: string, blocks = true) => { t.clearAt(x, y); t.add({ kind: "decor", decor: kind, x, y, blocks, name, clue: clueId }); };

  // ---------- The poachers' camp: a tent, a cold fire, their takings, and the cage of stakes with the tiger in it ----------
  {
    for (let y = POACHER_CAMP.y0 + 2; y <= POACHER_CAMP.y1 - 2; y++) for (let x = POACHER_CAMP.x0 + 2; x <= POACHER_CAMP.x1 - 2; x++) { if (tiles[idx(x, y)] === T.GRASS || tiles[idx(x, y)] === T.DARK_GRASS) t.clearAt(x, y); }
    place(590, 427, "tent", true, "The poachers' tent"); place(593, 429, "campfire", false, "The poachers' fire"); place(591, 431, "crate", true, "Ropes, snares, and a buyer's letter");
    place(589, 430, "wagon", true, "A cage wagon, its runners worn");
    // The cage: stakes round the tiger, a gap on the camp side that the lock holds.
    for (const [x, y] of [[596, 429], [597, 429], [598, 429], [599, 429], [596, 433], [597, 433], [598, 433], [599, 433], [596, 430], [596, 432], [600, 430], [600, 431], [600, 432]] as const) place(x, y, "stake", true, "The cage's stakes");
    t.clearAt(598, 431); t.npc("caged_tiger", 598, 431, 0);
    t.clearAt(597, 431); t.clearAt(597, 430); t.clearAt(597, 432); t.clearAt(599, 430); t.clearAt(599, 431); t.clearAt(599, 432);
    t.monsters("bandit", POACHER_CAMP.x0 + 1, POACHER_CAMP.y0 + 1, POACHER_CAMP.x1 - 6, POACHER_CAMP.y1 - 1, 3);
    t.clearAt(587, 436); t.add({ kind: "sign", x: 587, y: 436, blocks: true, name: "Signpost", text: "KEEP OUT. Private camp. The cat is spoken for." });
    // The tracks from Tallgrass: a cat's pads and a cage's ruts, going east.
    clue(575, 413, "scuffs", "Tracks in the soft ground", "tiger_tracks", false);
    clue(583, 421, "scuffs", "Tracks in the soft ground", "tiger_tracks", false);
  }

  // ---------- The drakes' nest, up by Wyrmreach's lava ----------
  {
    const [nx, ny] = mainlandToWorld(44, 33);
    clue(nx, ny, "bones", "A drake's nest", "drake_nest");
    for (const [dx, dy] of [[-1, 1], [1, -1], [2, 1]] as const) { t.clearAt(nx + dx, ny + dy); t.decor(nx + dx, ny + dy, "bones", false, "Scorched bones"); }
  }
}
