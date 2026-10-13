/**
 * Dungeon identity in the world itself (dungeontheme.ts has the look; this has the places): two new underground
 * families, the Rime Galleries under Frostpeak's shelf (cold stone, ice, pale minerals, moonsilver, frost wisps, and
 * at the far end the cold forge Sigrún's grandmother worked) and the Sigil Vault under the Wizards' Tower (dressed
 * stone carved with sigil lines, sigil stone growing in the walls, research cells, a ring hall with its circle, and a
 * sealed room); and a dressing of every other dungeon with the things of its family (burial niches get their bones and
 * candles, mines their props and carts, caves their boulders and crystal, the Hollow its pale obelisks), placed on a
 * random stream of its own, last of all, so the rest of the world stays exactly as it was.
 */
import { FRAME_DUNGEON_Y as DUNGEON_Y, FRAME_FLOOR_Y as FLOOR_Y, T, W, mainlandToWorld, regionIndex, worldTools, type DecorKind, type GenContext, type RegionId } from "./world.ts";

/** A small random stream of this module's own (the world's streams stay as they were). */
function mulberry(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function buildDungeonIdentity(ctx: GenContext, seed: number) {
  const t = worldTools(ctx), random = mulberry(seed + 909), { tiles, region, objectAt } = ctx;
  const idx = (x: number, y: number) => y * W + x;
  const rooms = (id: RegionId, list: readonly (readonly [number, number, number, number])[], floor: number) => {
    for (const [x0, y0, x1, y1] of list) for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) { if (tiles[idx(x, y)] === T.VOID) tiles[idx(x, y)] = T.WALL; region[idx(x, y)] = regionIndex(id); }
    for (const [x0, y0, x1, y1] of list) t.fillRect(x0, y0, x1, y1, floor);
  };
  const place = (x: number, y: number, kind: DecorKind, blocks = true, name?: string) => { if (t.free(x, y)) t.decor(x, y, kind, blocks, name); };
  const P = (x: number, y: number) => { const [wx, wy] = mainlandToWorld(x, y); return { x: wx, y: wy }; };

  // ---------- The Rime Galleries, under Frostpeak's shelf ----------
  // An entry hall with the ladder up to the shelf; a narrow gallery east; the Hall of Icicles, wide and high, moonsilver in its
  // walls and the wisps in its air; a ledge passage; and the deep chamber, where the old cold forge stands.
  rooms("rime_galleries", [[236, 889, 250, 895], [250, 891, 268, 893], [268, 887, 284, 899], [284, 893, 298, 895], [286, 896, 299, 907]], T.DUNGEON);
  {
    const up = P(261, 39), down = P(261, 38);
    t.clearAt(down.x, down.y); t.add({ kind: "ladder", x: down.x, y: down.y, blocks: true, name: "The Rime Galleries", action: "Climb-down", to: { x: 238, y: 892 } });
    t.add({ kind: "ladder", x: 238, y: 891, blocks: true, name: "Ladder up", action: "Climb-up", to: up });
    for (const [x, y] of [[241, 890], [247, 894], [272, 889], [280, 897], [292, 898], [296, 905]] as const) t.rock(x, y, "moonsilver");
    for (const [x, y] of [[276, 892], [290, 904]] as const) t.rock(x, y, "glimmer");
    for (const [x, y] of [[243, 894], [251, 892], [270, 898], [283, 888], [288, 897], [297, 903], [278, 893], [257, 893]] as const) place(x, y, "crystal", true, "Rime crystal");
    for (const [x, y] of [[245, 890], [266, 893], [281, 898], [298, 900]] as const) place(x, y, "boulder", true, "Fallen stone");
    for (const [x, y] of [[237, 889], [249, 889], [269, 887], [283, 899], [287, 896], [299, 907]] as const) place(x, y, "torch");
    // The cold forge: a furnace long out, an anvil furred with frost, the trough, and the chest she left.
    t.add({ kind: "furnace", x: 290, y: 900, blocks: true, name: "The cold forge" }); t.add({ kind: "anvil", x: 293, y: 900, blocks: true, name: "Frosted anvil" });
    place(292, 902, "barrel", true, "An old snowmelt trough, iced over"); place(295, 902, "chest", true, "Frostsmith's old chest"); place(289, 903, "bedroll", true, "A bedroll, stiff with frost");
    t.add({ kind: "sign", x: 287, y: 899, blocks: true, name: "Scratched stone", text: "Scratched into the wall, low down: 'Quench cold. Breathe later.' And a tally of winters, long past counting." });
    t.monsters("frost_wisp", 269, 888, 283, 898, 5); t.monsters("frost_wisp", 287, 897, 298, 906, 2);
  }

  // ---------- The Sigil Vault, under the Wizards' Tower ----------
  // Stairs down from the tower's ground floor to an antechamber; the ring hall, with the circle in its floor and sigil stone
  // growing out of its walls; two research cells; and the sealed room at the end, which the wisps keep.
  rooms("sigil_vault", [[104, 890, 116, 896], [116, 888, 134, 902], [134, 890, 146, 894], [134, 898, 146, 902], [138, 904, 146, 910]], T.DUNGEON);
  {
    const stairs = P(160, 132), landing = P(160, 133);
    t.clearAt(stairs.x, stairs.y); t.add({ kind: "ladder", look: "stairs", x: stairs.x, y: stairs.y, blocks: true, name: "Vault stairs", action: "Climb-down", to: { x: 106, y: 893 } });
    t.add({ kind: "ladder", look: "stairs", x: 106, y: 892, blocks: true, name: "Stairs up", action: "Climb-up", to: landing });
    for (const [x, y] of [[117, 889], [133, 889], [117, 901], [133, 901], [120, 895], [130, 895]] as const) t.rock(x, y, "sigil2");
    for (const [x, y] of [[125, 888], [125, 902]] as const) t.rock(x, y, "sigil3");
    t.decor(125, 895, "rune_circle", false, "The circle");
    for (const [x, y] of [[121, 892], [129, 892], [121, 898], [129, 898]] as const) place(x, y, "pillar", true, "Carved pillar");
    for (const [x, y] of [[136, 891], [144, 891], [136, 901], [144, 901]] as const) place(x, y, "shelf", true, "Sealed jars and notes");
    place(140, 893, "table", true, "A work table, the sigils on it half pressed"); place(140, 899, "obelisk", true, "A standing stone, humming");
    place(142, 905, "chest", true, "The vault's coffer"); place(145, 909, "obelisk", true, "A standing stone, cracked");
    t.add({ kind: "sign", x: 105, y: 891, blocks: true, name: "Warning", text: "THE VAULT. What the Tower could not unmake, it sealed. Touch nothing that hums. — The Archmage, some while ago." });
    for (const [x, y] of [[105, 895], [115, 889], [135, 890], [135, 902], [139, 904], [146, 910]] as const) place(x, y, "torch");
    t.monsters("frost_wisp", 118, 889, 133, 901, 4); t.monsters("frost_wisp", 139, 905, 145, 909, 2);
  }

  // ---------- Dressing the other dungeons with their families' things ----------
  const DRESS: Partial<Record<RegionId, readonly (readonly [DecorKind, number, string | undefined, boolean])[]>> = {
    crypt: [["tomb", 4, "Sarcophagus", true], ["bones", 6, "Bones", false], ["grave", 3, "Burial slab", true], ["torch", 4, undefined, true], ["rubble", 3, "Fallen masonry", false], ["torch", 4, undefined, true]],
    catacombs: [["tomb", 8, "Sarcophagus", true], ["bones", 12, "Bones", false], ["crypt", 3, "Sealed vault", true], ["grave", 5, "Burial slab", true], ["pillar", 6, "Vault pillar", true], ["rubble", 6, "Collapsed masonry", false], ["torch", 14, undefined, true]],
    howling_vault: [["bones", 8, "Gnawed bones", false], ["tomb", 3, "Broken sarcophagus", true], ["rubble", 5, "Fallen masonry", false], ["torch", 6, undefined, true]],
    bone_shrine: [["bones", 8, "Bones, arranged", false], ["grave", 4, "Burial slab", true], ["torch", 6, undefined, true]],
    deep_mine: [["wagon", 5, "Ore cart", true], ["logpile", 6, "Pit props, stacked", true], ["pillar", 8, "Pit prop", true], ["crate", 4, "Crates of inkcoal", true], ["barrel", 3, "Quench water", true], ["torch", 8, undefined, true]],
    wyrm_lair: [["bones", 8, "Charred bones", false], ["rubble", 6, "Scorched rubble", false], ["boulder", 4, "Slag", true]],
    hollow_depths: [["obelisk", 5, "A pale obelisk, cold to the touch", true], ["bones", 4, "Old bones", false], ["rubble", 4, "Fallen stone", false]],
    sea_cave: [["boulder", 8, "Barnacled rock", true], ["reeds", 6, "Sea wrack", false], ["crystal", 3, "Salt crystal", true], ["rubble", 4, "Shingle", false]],
    deepglass: [["crystal", 12, "Lake glass", true], ["boulder", 4, "Glassy boulder", true]],
    kumo_hollow: [["stone_lantern", 4, undefined, true], ["boulder", 5, "Wet rock", true], ["crystal", 3, "Foxfire crystal", true]],
    ashigane_deeps: [["bones", 8, "Gnawed bones", false], ["boulder", 6, "Rock", true], ["crate", 3, "Ogre's plunder", true], ["torch", 3, undefined, true]],
    root_cellars: [["barrel", 6, "Cellar barrel", true], ["crate", 5, "Cellar crate", true], ["logpile", 2, "Roots, cut back", true]],
    mossy_undercroft: [["rubble", 6, "Mossy rubble", false], ["pillar", 4, "Mossy pillar", true], ["bush", 4, "Pale fungus", true]],
    drowned_archive: [["shelf", 6, "Drowned shelves", true], ["pillar", 4, "Archive pillar", true], ["crystal", 2, "A glass ward, still glowing", true]],
    fellows_deep: [["crystal", 2, "A knob of raw moonsilver", true]],
  };
  const floorsOf = new Map<number, number[]>();
  for (let y = DUNGEON_Y; y < FLOOR_Y; y++) for (let x = 0; x < W; x++) { const i = idx(x, y); if (tiles[i] === T.DUNGEON || tiles[i] === T.STONE || tiles[i] === T.ASH || tiles[i] === T.WOOD) { const list = floorsOf.get(region[i]) ?? []; list.push(i); floorsOf.set(region[i], list); } }
  for (const [id, list] of Object.entries(DRESS) as [RegionId, NonNullable<(typeof DRESS)[RegionId]>][]) {
    const floors = floorsOf.get(regionIndex(id)); if (!floors?.length) continue;
    for (const [kind, count, name, blocks] of list) {
      let placed = 0, tries = 0;
      while (placed < count && tries++ < count * 40) {
        const i = floors[Math.floor(random() * floors.length)], x = i % W, y = (i - x) / W;
        // Against a wall for the things that stand against walls; anywhere for bones and rubble; never on a doorway (a floor tile with walls on two opposite sides).
        const wallBeside = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => tiles[idx(x + dx, y + dy)] === T.WALL).length;
        if (objectAt[i] >= 0 || ctx.spawns.some(s => s.x === x && s.y === y)) continue;
        if ((tiles[idx(x + 1, y)] === T.WALL && tiles[idx(x - 1, y)] === T.WALL) || (tiles[idx(x, y + 1)] === T.WALL && tiles[idx(x, y - 1)] === T.WALL)) continue;
        if (blocks && kind !== "bush" && wallBeside === 0 && random() < 0.8) continue;
        t.decor(x, y, kind, blocks, name); placed++;
      }
    }
  }
}
