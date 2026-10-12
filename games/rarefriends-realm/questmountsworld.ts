/**
 * Where the wider world's mount quests happen (questmounts.ts): the Order of the Dawn's ostler and the white mare at
 * Dawnhold, by the Grandmaster; Warden Ysmay at the Vesperholm abbey and the three stone watchers on the mountain between
 * it and the Blind Shrine; the white camel hobbled at the dune bandits' tent in Qeshet; Fox-keeper Tamao and the three
 * stone lanterns on the path up to the fox shrine on Morishima. Built in the world's own frame, after the dragons.
 */
import { T, W, WALKABLE, regionAt, worldTools, type GenContext, type RegionId, type World } from "./world.ts";

/** The three stone watchers' clue ids, and the three fox lanterns' (questmounts.ts reads them; this module stays a leaf of world.ts). */
export const WATCHERS = ["dusk_watcher_1", "dusk_watcher_2", "dusk_watcher_3"] as const, LANTERNS = ["fox_lantern_1", "fox_lantern_2", "fox_lantern_3"] as const;

/** Near where each thing should stand: the spot asked for, or the nearest free one in the same region. */
export const QUEST_MOUNT_SPOTS = {
  dawn_ostler: { x: 944, y: 249 }, dawn_mare: { x: 946, y: 251 },
  dusk_warden: { x: 118, y: 68 }, watchers: [{ x: 62, y: 52 }, { x: 82, y: 46 }, { x: 100, y: 58 }],
  hobbled_camel: { x: 126, y: 814 },
  fox_keeper: { x: 1608, y: 410 }, three_tailed_fox: { x: 1614, y: 409 }, lanterns: [{ x: 1600, y: 405 }, { x: 1605, y: 408 }, { x: 1610, y: 409 }],
} as const;

export function buildQuestMounts(ctx: GenContext) {
  const t = worldTools(ctx), { tiles, objectAt, spawns } = ctx;
  const regionOf = (x: number, y: number) => regionAt({ region: ctx.region } as unknown as World, x, y).id;
  const taken = (x: number, y: number) => spawns.some(s => s.x === x && s.y === y);
  /** The nearest walkable, empty tile to (x, y) in the same region (rings outwards). */
  const near = (x: number, y: number, region: RegionId = regionOf(x, y)) => {
    for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = x + dx, ty = y + dy;
      if (!t.inBounds(tx, ty) || !WALKABLE.has(tiles[ty * W + tx]) || tiles[ty * W + tx] === T.BRIDGE || objectAt[ty * W + tx] >= 0 || taken(tx, ty) || regionOf(tx, ty) !== region) continue;
      return { x: tx, y: ty };
    }
    return { x, y };
  };
  const npc = (id: string, at: { x: number; y: number }, wander = 0) => { const p = near(at.x, at.y); t.npc(id, p.x, p.y, wander); return p; };
  const S = QUEST_MOUNT_SPOTS;
  // Dawnhold: the ostler and the white mare, by the Grandmaster.
  npc("dawn_ostler", S.dawn_ostler); npc("dawn_mare", S.dawn_mare, 1);
  // The Silent Peaks: the warden at the abbey, and the three watchers on the mountain.
  npc("dusk_warden", S.dusk_warden);
  S.watchers.forEach((spot, i) => { const p = near(spot.x, spot.y, "silent_peaks"); t.add({ kind: "decor", decor: "wise_friend", x: p.x, y: p.y, blocks: true, name: "A stone watcher", clue: WATCHERS[i] }); });
  // Qeshet: the white camel at the bandits' tent.
  npc("hobbled_camel", S.hobbled_camel);
  // Morishima: the fox-keeper, and the stone lanterns up the path to the shrine.
  npc("fox_keeper", S.fox_keeper); npc("three_tailed_fox", S.three_tailed_fox);
  S.lanterns.forEach((spot, i) => { const p = near(spot.x, spot.y, "morishima"); t.add({ kind: "decor", decor: "stone_lantern", x: p.x, y: p.y, blocks: true, name: "A cold stone lantern", clue: LANTERNS[i] }); });
}
