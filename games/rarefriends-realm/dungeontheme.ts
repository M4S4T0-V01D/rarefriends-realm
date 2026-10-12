/**
 * Dungeon themes: what makes one underground family look like itself and no other, at a glance, without its name
 * (the Skill overhaul's dungeon identity). A theme is a wall (its stone, its colours), a floor, the dark's own colour
 * (the ambient light under that ground), the colour its fires burn, and what drifts in its air; the renderer reads it
 * at every underground wall, floor and light (render.ts), the textures paint its stone (dungeontextures.ts), and
 * effects.ts fills its air. Every underground region has one; new dungeons pick a family and inherit it.
 *
 * The families (and who belongs):
 *  - ossuary: dark masonry with burial niches, bone and candlelight — the Murkmire Crypt, the Deadwood Catacombs, the Bone Shrine, the Howling Vault.
 *  - underworks: volcanic rock shored with timber, ore in the walls, ember light — the Cragmaw Deep Mine, the Fellows' Deep, the Ashen Shaft; the Wyrm's Lair, hotter.
 *  - rime: cold grey stone crusted with frost, icicles, pale minerals, blue dark — the Rime Galleries; the Deepglass Caverns, in crystal.
 *  - arcane: dressed stone carved with sigil lines that glow, violet dark — the Sigil Vault; the Drowned Archive, in teal.
 *  - hollow: black stone cracked with pale veins, a cold blue fire — the Hollow Depths.
 *  - cave: rough natural rock, warm or wet — the Saltmarrow Sea Cave, the Hollow under Kumo, the Ashigane Deeps.
 *  - cellar and mossy: timber and roots, moss on old stone — the Root Cellars, the Mossy Undercroft.
 *  - sandstone and tomb: Kharaveth's cut stone, the Underway, the Black Stair, the Hall of First Names; the royal deeps under the pyramids; Meghavan's stepwell.
 */
import type { RGB } from "./lighting.ts";
import { isUnderground, regionAt, type RegionId, type World } from "./world.ts";

export type ThemeWall = "ossuary" | "scorched" | "rime" | "arcane" | "hollow" | "cave" | "plank" | "sandstone" | "dungeon";
export type ThemeFloor = "ossuary" | "mine" | "rime" | "sigil" | "cave" | "mossy" | "flag" | "dungeon" | "plank";
export type Motes = { kind: "dust" | "ember" | "frost" | "spark" | "glow" | "spore"; color: string; rate: number };
export type DungeonTheme = {
  id: string; family: string;
  /** The wall's three faces (top, left, right) and the stone they're painted in. */
  wall: { top: string; left: string; right: string; style: ThemeWall };
  /** The floor's colour and detail where the floor is the dungeon's own (DUNGEON tiles; other terrains keep theirs, tinted). */
  floor: { color: string; style: ThemeFloor };
  /** The dark's own colour: the ambient light under this ground (a little brighter than the plain dungeon dark, so the stone can be seen for what it is). */
  ambient: RGB;
  /** What this place's torches and braziers burn like. */
  torch: string;
  motes: Motes;
};

const theme = (id: string, family: string, wall: [string, string, string, ThemeWall], floor: [string, ThemeFloor], ambient: RGB, torch: string, motes: Motes): DungeonTheme =>
  ({ id, family, wall: { top: wall[0], left: wall[1], right: wall[2], style: wall[3] }, floor: { color: floor[0], style: floor[1] }, ambient, torch, motes });

export const FAMILIES: Record<string, DungeonTheme> = {
  ossuary: theme("ossuary", "ossuary", ["#4a4745", "#3b3836", "#2f2c2b", "ossuary"], ["#4e4a46", "ossuary"], [0.13, 0.122, 0.16], "#e9c87a", { kind: "dust", color: "#9a968f", rate: 0.25 }),
  underworks: theme("underworks", "underworks", ["#4a3f3a", "#3a302c", "#2e2522", "scorched"], ["#4b413c", "mine"], [0.16, 0.112, 0.088], "#ff9a3c", { kind: "ember", color: "#ff8a3c", rate: 0.3 }),
  wyrm: theme("wyrm", "underworks", ["#3f3230", "#30241f", "#261b18", "scorched"], ["#46393a", "mine"], [0.192, 0.096, 0.064], "#ff7a2a", { kind: "ember", color: "#ff6a2a", rate: 0.45 }),
  rime: theme("rime", "rime", ["#7f8c99", "#66727f", "#525c68", "rime"], ["#8a95a2", "rime"], [0.128, 0.16, 0.224], "#ffb870", { kind: "frost", color: "#ffffff", rate: 0.35 }),
  crystal: theme("crystal", "rime", ["#6f8a92", "#577279", "#465d64", "rime"], ["#6c8089", "rime"], [0.112, 0.16, 0.176], "#9fe0e8", { kind: "spark", color: "#bff4ff", rate: 0.2 }),
  arcane: theme("arcane", "arcane", ["#4d4663", "#3d3752", "#312c44", "arcane"], ["#4a4460", "sigil"], [0.12, 0.104, 0.192], "#a48cf0", { kind: "spark", color: "#c9b6ff", rate: 0.3 }),
  archive: theme("archive", "arcane", ["#3f4f58", "#33414a", "#29353c", "arcane"], ["#3e4c54", "sigil"], [0.096, 0.128, 0.144], "#8fd0d8", { kind: "spark", color: "#9fe0e8", rate: 0.2 }),
  hollow: theme("hollow", "hollow", ["#262529", "#1d1c20", "#161518", "hollow"], ["#2a2930", "cave"], [0.08, 0.08, 0.128], "#8fb0ff", { kind: "glow", color: "#b8c8ff", rate: 0.2 }),
  cave: theme("cave", "cave", ["#5b5650", "#4a453f", "#3c3833", "cave"], ["#55504a", "cave"], [0.128, 0.128, 0.136], "#e89a4f", { kind: "dust", color: "#9a968f", rate: 0.2 }),
  seacave: theme("seacave", "cave", ["#4f6160", "#3f4f4e", "#33403f", "cave"], ["#4a5a58", "cave"], [0.096, 0.136, 0.144], "#e8b060", { kind: "glow", color: "#9fe0e8", rate: 0.15 }),
  ogre: theme("ogre", "cave", ["#5a4c42", "#4a3d35", "#3b3029", "cave"], ["#4f443b", "cave"], [0.136, 0.112, 0.096], "#ff9a3c", { kind: "dust", color: "#a08a70", rate: 0.2 }),
  foxfire: theme("foxfire", "cave", ["#4a5560", "#3b454f", "#303840", "cave"], ["#44505a", "cave"], [0.096, 0.112, 0.144], "#9fd0ff", { kind: "glow", color: "#bfe8ff", rate: 0.25 }),
  cellar: theme("cellar", "cellar", ["#6b5c4a", "#56493a", "#463b2e", "plank"], ["#5c4f40", "plank"], [0.144, 0.128, 0.096], "#f0b060", { kind: "dust", color: "#b8a080", rate: 0.15 }),
  mossy: theme("mossy", "cellar", ["#4f5a48", "#404a3a", "#34402f", "cave"], ["#4c5546", "mossy"], [0.096, 0.128, 0.096], "#e8c070", { kind: "spore", color: "#c8e080", rate: 0.25 }),
  sandstone: theme("sandstone", "sandstone", ["#8a6f4e", "#75603f", "#5f4d32", "sandstone"], ["#7a6a52", "flag"], [0.16, 0.136, 0.096], "#ffb860", { kind: "dust", color: "#d9c9a3", rate: 0.2 }),
  tomb: theme("tomb", "sandstone", ["#7a6648", "#64533a", "#4f4230", "sandstone"], ["#6e5f48", "flag"], [0.136, 0.112, 0.08], "#ffcf7a", { kind: "dust", color: "#e2c46a", rate: 0.1 }),
  stepwell: theme("stepwell", "sandstone", ["#6f6a5c", "#5c574b", "#4a463c", "sandstone"], ["#66604f", "flag"], [0.128, 0.136, 0.128], "#ffd080", { kind: "glow", color: "#cfe8ff", rate: 0.15 }),
};

/** Every underground region's theme. A region without one gets the plain dungeon look it always had. */
export const DUNGEON_THEMES: Partial<Record<RegionId, DungeonTheme>> = {
  crypt: FAMILIES.ossuary, catacombs: FAMILIES.ossuary, ashworth_vault: FAMILIES.ossuary, bone_shrine: FAMILIES.ossuary, howling_vault: FAMILIES.ossuary,
  deep_mine: FAMILIES.underworks, fellows_deep: FAMILIES.underworks, ashen_shaft: FAMILIES.underworks, wyrm_lair: FAMILIES.wyrm,
  rime_galleries: FAMILIES.rime, deepglass: FAMILIES.crystal,
  sigil_vault: FAMILIES.arcane, drowned_archive: FAMILIES.archive,
  hollow_depths: FAMILIES.hollow,
  sea_cave: FAMILIES.seacave, kumo_hollow: FAMILIES.foxfire, ashigane_deeps: FAMILIES.ogre,
  root_cellars: FAMILIES.cellar, mossy_undercroft: FAMILIES.mossy,
  underway: FAMILIES.sandstone, black_stair: FAMILIES.sandstone, first_names_hall: FAMILIES.sandstone, uncounted_deep: FAMILIES.tomb, measured_vault: FAMILIES.tomb, great_stepwell: FAMILIES.stepwell,
  sunken_halls: FAMILIES.tomb,
};

/** The theme under a tile, or null above ground and where none is set. */
export function dungeonTheme(world: World, x: number, y: number): DungeonTheme | null {
  if (!isUnderground(y)) return null;
  return DUNGEON_THEMES[regionAt(world, Math.round(x), Math.round(y)).id] ?? null;
}
/** The theme's own floor where the floor is the dungeon's (DUNGEON tiles); other floors (stone, wood, ash, carpet) keep their own look. */
export const themedFloor = (theme: DungeonTheme | null, terrain: number, dungeonTerrain: number) => theme && terrain === dungeonTerrain ? theme.floor : null;
