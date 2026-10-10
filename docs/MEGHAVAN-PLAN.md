# The Land Before Stone, stage 5: Meghavan (the Rain Country)

Stages 1–4 are on `main`: Kharaveth (south.ts, heartlands.ts, dynasties.ts, firstnames.ts, orashai*.ts), the Mysteries
skill (mysteries.ts), techniques (techniques.ts) and the Hidden Road (hiddenroad.ts). Stage 5 is Meghavan: an original
India-inspired country joined to Kharaveth's east. Kharaveth traders call it "the Rain Country". Spec: the user's
"EASTERN CONTINENTAL EXPANSION" brief (sections 2–19). Build it in sub-stages, each shipped (tests, push, CI, live check).

## Rules (standing)
- Push to origin `main` only. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- New lands never alter the mainland or older dungeons. Every new region gets quests and regionally dressed villagers.
- Every new UI/dialogue string goes into all 12 dictionaries (ja ko zh-CN zh-TW vi id th tr es pt-BR ru uk), in
  `games/rarefriends-realm/lang/*.ts` (add `lang/meghavan1.ts`, `meghavan2.ts`, register like heartlands1/2). Use the
  existing spellings: Kharaveth = カラヴェス/卡拉维斯/Харавет, Khetmar = ケトマル/克特马尔/Кетмар, Mysteries = 神秘/奥秘/Тайны.
- Tests are gentle: one file at a time (`scripts/gentle-test.sh tests/<file>`), browser suites one at a time.
- Never name things after RuneScape bosses or places. No snow removal. Not a stereotype: governments, workers,
  scholars, disagreements; no country made only of temples, elephants and spice.
- Security: a player name and NFT token ID are identifiers, not authentication credentials. Never embed server secrets.

## Geography (world coordinates)
The sea east of Kharaveth is empty: x 1110–1719, y 540–879 (the Mizukai Isles end around y 520; keep a strait).
Kharaveth's coast has a bay right at Khetmar's east wall (south.ts BAYS `[1080, 690, 40, 46]`); Khetmar's east gate is
at (1064, 700). Fill that bay from x ≥ 1066 (only sea tiles) so the gate opens on the road east.

New module `meghavan.ts`, `buildMeghavan(ctx, t, places, kit)`, called in south.ts after `buildFirstNames` (same
SouthKit). Only turn sea (T.WATER/T.DEEP) into land; redo the shallows ring for its coast. Land = union of ellipses
(cx, cy, rx, ry), noise-wobbled like south.ts BODY: `[1110,705,60,40]` (the bridge), `[1400,720,270,140]` (body),
`[1560,640,130,80]` (north-east), `[1300,820,180,55]` (south). North coast ≥ 570.

Regions (add to world.ts `RegionId` and `REGIONS` with `far: true, south: true`; places to the `places` Record):

| id | name | where | danger | notes |
|---|---|---|---|---|
| rain_pass | The Gate of Rains | x 1066–1180, y 660–760 | 4 | dry hills greening; a stone gateway (two pillars, plaque) across the road |
| tirthali | Tirthali | (1215, 722) | 0 | ford town, mixed Kharaveth/Meghavan houses, caravanserai |
| ilavati_valley | The Ilavati Valley | centre-west | 2 | farmland, river Ilavati, tanks (reservoir lakes) |
| sarovan | Sarovan | (1300, 690) | 0 | capital of Ilavarta: palace (marble, dome keep), the Great Tank with stone ghats, the Great Stepwell |
| shaila_highlands | The Shaila Highlands | x 1380–1600, y 580–660 | 6 | cliffs, stone, snow on the peaks, pines, mines (blackiron, moonsilver, glimmer rocks) |
| shailagarh | Shailagarh | (1470, 640) | 0 | hill fortress-state (rampart), holds the passes and the mines |
| parasol_plains | The Parasol Plains | centre-south | 3 | grass and dry fields, scattered trees |
| mandapur | Mandapur | (1430, 770) | 0 | the League's council town: an open hall ringed by seven `canopy` parasols |
| golden_shore | The Golden Shore | x > 1560 | 1 | beaches, palms |
| suvarnatira | Suvarnatira | (1630, 730) | 0 | free port and scholars' city: docks, market, the Archive (big library) |
| deepgreen | The Deepgreen | x 1150–1340, y > 780 | 5 | monsoon forest: dark grass, swamp pockets, dense trees (bamboo, willow, palm, maple until a banyan/teak tree kind exists) |
| kanthar | Kanthar | (1250, 830) | 0 | the Kanthari's village of timber stilt houses |

River Ilavati: `[[1450,610],[1380,660],[1300,700],[1240,740],[1250,800],[1300,840],[1320,872]]`, water 2–3 wide, green
banks (copy south.ts's Ashar loop). Roads: Khetmar east gate → gateway (1150,705) → Tirthali → ford → Sarovan →
Shailagarh; Sarovan → Mandapur → Suvarnatira; Tirthali → Kanthar. Building styles: `walls: "marble"` + dome keep for
Sarovan's palace (see heartlands.ts Sefrah palace), "stone" in the highlands, "timber"/"plank" in the forest; tile
roofs in terracotta `#b5563a`.

## Powers (distinct, none simply good or bad)
- **Ilavarta**, the river kingdom (Sarovan). Its rule rests on keeping the tanks and canals; Queen Saumitra, "Keeper of
  the Tanks". Internal fight: royal engineers vs the temple treasurers over who pays for desilting. Trades with the
  Gilded Court, which is manipulating grain prices.
- **The League of Seven Parasols** (Mandapur): regional rulers whose authority is negotiated, a Speaker chosen by turn.
  Disputes over tolls and river water with Ilavarta.
- **Shailagarh**, the highland state (Lord Varanjit): passes and mines; hires Copper Banner companies, which Ilavarta
  calls foreign interference. Shares metallurgy with the Obsidian Legacy.
- **Suvarnatira**, the free city (Provost Lalitha and the Assembly of Ink and Coin): scholars and merchants; the Archive
  disputes an Azhurak star chart with the Obsidian Legacy.
- **The Kanthari** (Grandmother Sukesh, Kanthar): forest communities resisting incorporation; highland loggers.
- **Tirthali**: ferrywarden Amul; mixed community, smugglers, illicit antiquities.

## Sub-stages
**5a. The land.** meghavan.ts (land, terrain, river, regions, roads, towns, gateway, rocks/trees/fishing spots, monster
spawns, villagers), `meghavangear.ts` (items, regional clothing sets in data.ts REGIONAL_CLOTHING for tirthali, sarovan,
shailagarh, mandapur, suvarnatira, kanthar, with a clothier shop each; foods: rice and lentil stew, mango, flatbread,
spiced tea; general store, inn and forge per big town; weapons: curved Ilavati sabre, push-dagger, Shaila mail),
`meghavanpeople.ts` (NPCs incl. `<region>_villager`, leaders with flavour talk). Creatures: new 16×16 masks in
sprites.ts `CREATURES[245+]` (format: see `CREATURES[230]`, the hyena), `soldier()` for humanoids (dacoits, corsairs,
highland deserters). Ideas: rock langur, jewelled peafowl, Deepgreen tiger, monsoon leech, hooded serpent, giant rain
frog, crag bear, wild gaur, vine strangler; boss later. Music: 4–5 pieces in audio.ts (drone + plucked lead + bamboo
flute + double reed + hand drums, raga-like scales such as bhairav, yaman, kafi; each needs its own voice set like the
Kharaveth pieces), region→piece map, jukebox test count. NPC_WEAR in render.ts for leaders. Update 100.

**5b. Quests (one per power + entry):** "Caravan of the Rains" (entry: Khetmar → Tirthali with a caravan),
"The Silted Tank" (Ilavarta), "Seven Parasols, One Shade" (League), "The Pass Toll" (Shailagarh + Copper Banner
deserters), "The Missing Folio" (Suvarnatira vs Obsidian Legacy), "What the Forest Keeps" (Kanthari). Register like
dynasties.ts/orashaiquests.ts (NPCs, QuestDef with journal, talk handler, kill hook, `finalStage` in content.ts,
QUESTS/MAX_QUEST_POINTS counts in tests/engine.test.mjs). Dungeon: the Great Stepwell under Sarovan, dungeon-row
columns 1520–1700 (free; 20–150, 160–270, 300–456 and 460–1500 are taken), boss "the Monsoon Serpent".

**5c. Mysteries schools** (each: mentor, initiation quest, 1–2 techniques via techniques.ts; extend
`Technique.tradition` and `techniqueLocked`; discoveries in mysteries.ts; Mysteries XP from discoveries once each):
- Discipline of Inner Measure (Shailagarh): breath and timed counters, resistance to a defined effect.
- School of Living Patterns (Sarovan observatory): reveal a creature's weakness/conditions, read anomalies.
- Keepers of Thresholds (Tirthali): markings on eligible enemies, ward at places (distinct from Mizukai spirit work).
- Archive of Unfinished Things (Suvarnatira): research quests, prepared answers against a researched boss, unreadable
  records becoming readable. Eastern scholars read Azhurak glyphs differently from the Orashai.

## Verify each sub-stage
`npx tsc -p tsconfig.json`; gentle tests: i18n, engine (add world/quest/technique tests), pursuance, then the five
browser suites one at a time; screenshots in both renderers (Normal and `?renderer=webgl`); scan new strings for
missing translations; push; watch CI; check the live site. When stage 5 is done: the expansion video (The Land Before
Stone + updates since the last video) on the preview site, and an X post (teasers repo POSTS.md).

## Known since stage 4
- render.ts: decor objects are clickable only with a clue (or a chest). Give every interactive Meghavan object a `clue`
  or a non-decor kind.
- Dungeons are dark (deep ambient 0.07): light rooms with torches/lamps every ~10 tiles.
