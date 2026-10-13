/**
 * More dragons, in three more places (the user's wish, 2026-10-12): the Bonefield, a scorched meadow in the Deadwood's
 * north-east where the Old One died and its bones lie in a ring, bone drakes roosting among them and the Bone Wyrm at
 * its heart; the Cragmaw Heights, a snow-topped massif raised out of the sea north of Ironreach's coast (Cragmaw's
 * mountains stretched north), frost drakes over it and the Iron Wyrm in a crag bowl on its north-east side, a pass of
 * switchbacks up from the coast; and Qeshet, a ruined city half buried by the Sea of Dunes, courts and colonnades and
 * a necropolis the dune drakes and the desert's other hunters have, with the Sunken Door in its sanctum: a gate down
 * to the Sunken Halls, the old kings' halls under the ruin (built straight into the underground layer, beneath the
 * ruin), where the Sand Mother lies coiled round the only water for forty miles. Built in the world's own frame.
 */
import { REGIONS, T, FRAME_UNDER_Y as UNDER_Y, W, worldTools, type GenContext, type RegionId } from "./world.ts";

/** The Bonefield: an ellipse (world coordinates) over the meadow north of the Deadwood maidens' village. */
export const BONEFIELD = { x: 908, y: 28, rx: 20, ry: 14 } as const;
/** The Cragmaw Heights: the massif's ellipse, and the Iron Wyrm's bowl on its north-east side. */
export const HEIGHTS = { x: 1078, y: 96, rx: 44, ry: 42, lair: { x: 1096, y: 80, rx: 10, ry: 8 } } as const;
/** The pass: switchbacks from Ironreach's north coast up on to the heights. */
export const HEIGHTS_PASS = [[1064, 150], [1058, 144], [1052, 138], [1057, 132], [1063, 126], [1057, 120], [1051, 114]] as const;
/** Qeshet: the ruin's walls (world coordinates), and the Sunken Door in its sanctum's south face. */
export const QESHET = { x0: 118, y0: 760, x1: 182, y1: 820, door: { x: 150, y: 770 } } as const;
/** The Sunken Halls: the dungeon's origin in the underground layer (`dy` rows below UNDER_Y: straight beneath the ruin); the halls are laid out from it. */
export const SUNKEN_HALLS = { x: QESHET.x0, dy: QESHET.y0, w: 66, h: 82, entry: { x: QESHET.x0 + 32, dy: QESHET.y0 + 11 } } as const;

const isWater = (tile: number) => tile === T.WATER || tile === T.DEEP;

export function buildDragons(ctx: GenContext) {
  const t = worldTools(ctx), { tiles, lift, raise, noise, noise2, random } = ctx;
  const idx = (x: number, y: number) => y * W + x;
  const place = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => { if (t.inBounds(x, y) && t.free(x, y)) t.decor(x, y, kind, blocks, name); };
  const sign = (x: number, y: number, text: string) => { if (!t.inBounds(x, y) || isWater(tiles[idx(x, y)]) || tiles[idx(x, y)] === T.VOID) return; t.clearAt(x, y); t.add({ kind: "sign", x, y, blocks: true, name: "Signpost", text }); };
  const dist = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
  const label = (id: RegionId, x: number, y: number) => { const entry = REGIONS.find(region => region.id === id) as { label: { x: number; y: number }; far?: boolean } | undefined; if (entry) { entry.label = { x, y }; entry.far = true; } };

  // ---------- The Bonefield, in the Deadwood's north-east: the Old One's bones in a ring on scorched ground ----------
  {
    const B = BONEFIELD;
    for (let y = B.y - B.ry - 2; y <= B.y + B.ry + 2; y++) for (let x = B.x - B.rx - 2; x <= B.x + B.rx + 2; x++) {
      if (!t.inBounds(x, y)) continue;
      const d = dist(x, y, B.x, B.y, B.rx, B.ry) + (noise(x * 1.1 + 500, y * 1.1) - 0.5) * 0.3, i = idx(x, y), tile = tiles[i];
      if (d > 1 || isWater(tile) || tile === T.VOID || tile === T.SWAMP) continue;
      t.setRegion(x, y, "bonefield");
      if (tile === T.GRASS || tile === T.DARK_GRASS) tiles[i] = d < 0.5 && noise2(x * 1.6, y * 1.6 + 200) > 0.56 ? T.ASH : d < 0.85 && noise2(x * 0.8 + 77, y * 0.8) > 0.62 ? T.GRAVEL : T.DARK_GRASS;
    }
    // The ribs, in an arc round where the heart was; the skull at the west end, jaw open.
    for (let k = 0; k < 12; k++) {
      const a = Math.PI * (0.15 + 0.7 * k / 11), x = Math.round(B.x + 9 * Math.cos(a)), y = Math.round(B.y - 2 - 5 * Math.sin(a)), x2 = Math.round(B.x + 9 * Math.cos(a)), y2 = Math.round(B.y - 2 + 5 * Math.sin(a));
      place(x, y, "bones", true, "A rib, taller than a man"); place(x2, y2, "bones", true, "A rib, taller than a man");
    }
    t.clearAt(B.x - 12, B.y - 2); t.decor(B.x - 12, B.y - 2, "bones", true, "The Old One's skull");
    for (const [dx, dy] of [[-14, -1], [-13, 0], [-11, -4], [12, -1], [13, 1]] as const) place(B.x + dx, B.y + dy, "bones", false, "Old bone, scorched");
    t.scatter(B.x - 18, B.y - 12, B.x + 18, B.y + 12, 10, (x, y) => t.decor(x, y, "bones", false, "Picked bones"), (x, y) => t.free(x, y) && dist(x, y, B.x, B.y, B.rx, B.ry) < 0.8);
    t.scatter(B.x - 23, B.y - 16, B.x + 23, B.y + 16, 18, (x, y) => t.tree(x, y, "deadwood"), (x, y) => { const d = dist(x, y, B.x, B.y, B.rx, B.ry); return t.free(x, y) && d > 0.7 && d < 1.1 && (tiles[idx(x, y)] === T.GRASS || tiles[idx(x, y)] === T.DARK_GRASS); });
    // The drakes that roost among the bones, the skeletons of whatever came to pick them, and the Bone Wyrm at the heart.
    t.monsters("bone_drake", B.x - 16, B.y - 11, B.x + 16, B.y + 11, 7);
    t.monsters("skeleton", B.x - 18, B.y - 12, B.x + 18, B.y + 12, 4);
    t.monster("bone_wyrm", B.x - 1, B.y - 3, 2);
    sign(B.x - 2, B.y + 17, "The Bonefield. The Old One died here before the Deadwood was dead, and its bones never stopped moving. Bone drakes; the Bone Wyrm at the heart. Dragonfire, and no shield but a Wyrmward one against it.");
    label("bonefield", B.x, B.y - 1);
  }

  // ---------- The Cragmaw Heights: a snow-topped massif raised out of the sea north of Ironreach's coast ----------
  {
    const M = HEIGHTS, L = M.lair;
    for (let y = M.y - M.ry - 6; y <= M.y + M.ry + 6; y++) for (let x = M.x - M.rx - 6; x <= M.x + M.rx + 6; x++) {
      if (!t.inBounds(x, y)) continue;
      const d = dist(x, y, M.x, M.y, M.rx, M.ry) + (noise(x * 0.8 + 900, y * 0.8) - 0.5) * 0.3 + (noise2(x * 2.3 + 60, y * 2.3) - 0.5) * 0.1, i = idx(x, y), tile = tiles[i];
      if (d > 1.1) continue;
      if (d <= 0.84) {
        t.clearAt(x, y); t.setRegion(x, y, "cragmaw_heights"); lift[i] = 0;
        tiles[i] = d <= 0.3 || noise(x * 1.4 + 120, y * 1.4) > 0.66 ? T.SNOW : noise2(x * 0.7, y * 0.7 + 30) > 0.6 ? T.DARK_GRASS : T.GRAVEL;
        raise[i] = 3.2 + (0.84 - d) / 0.84 * 1.4;
      } else if (d <= 1.0) {
        t.setRegion(x, y, "cragmaw_heights"); lift[i] = 0;
        raise[i] = 3.2 - (d - 0.84) / 0.16 * 2.4 + (noise2(x, y) - 0.5) * 0.3;
        if (tile !== T.SNOW) { t.clearAt(x, y); tiles[i] = T.CLIFF; }   // the snow that was on the coast stays snow: the crag rises round it
      } else if (isWater(tile)) { tiles[i] = T.GRAVEL; lift[i] = 0; raise[i] = Math.max(raise[i], 0.3); t.setRegion(x, y, "cragmaw_heights"); }
      else raise[i] = Math.max(raise[i], 0.3);
    }
    // The Iron Wyrm's bowl: crag round a floor of scree, open on its west side; the ore it sleeps on.
    for (let y = L.y - L.ry - 2; y <= L.y + L.ry + 2; y++) for (let x = L.x - L.rx - 2; x <= L.x + L.rx + 2; x++) {
      const d = dist(x, y, L.x, L.y, L.rx, L.ry) + (noise2(x * 1.7 + 10, y * 1.7 + 90) - 0.5) * 0.12, i = idx(x, y), gap = x < L.x - 6 && y >= L.y - 1 && y <= L.y + 1;
      if (d <= 0.78) { tiles[i] = T.GRAVEL; raise[i] = 3.6; }
      else if (d <= 1.02 && !gap) { t.clearAt(x, y); tiles[i] = T.CLIFF; raise[i] = 4.8; }
    }
    for (const [x, y, kind] of [[L.x + 5, L.y - 4, "moonsilver"], [L.x + 6, L.y + 3, "glimmer"], [L.x - 3, L.y + 5, "moonsilver"], [L.x + 2, L.y - 5, "glimmer"]] as const) if (t.free(x, y)) t.rock(x, y, kind);
    t.monster("iron_wyrm", L.x, L.y - 1, 2);
    // The pass: switchbacks up the south face from the coast, the sea at their foot filled with scree, the path's lift rising with every row.
    for (let y = 108; y <= 154; y++) for (let x = 1044; x <= 1072; x++) {
      const i = idx(x, y);
      let near = false; for (let k = 0; k + 1 < HEIGHTS_PASS.length && !near; k++) { const [ax, ay] = HEIGHTS_PASS[k], [bx, by] = HEIGHTS_PASS[k + 1], len = (bx - ax) ** 2 + (by - ay) ** 2, u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len)); near = Math.hypot(x - (ax + u * (bx - ax)), y - (ay + u * (by - ay))) <= 3.5; }
      if (!near) continue;
      if (isWater(tiles[i])) { tiles[i] = T.GRAVEL; lift[i] = 0; raise[i] = Math.max(raise[i], 0.3); t.setRegion(x, y, "cragmaw_heights"); }
      if (tiles[i] !== T.VOID && !isWater(tiles[i])) t.clearAt(x, y);
    }
    t.road(HEIGHTS_PASS, 2, T.PATH);
    const foot = HEIGHTS_PASS[0][1], top = HEIGHTS_PASS[HEIGHTS_PASS.length - 1][1];
    for (let y = top - 2; y <= foot + 2; y++) for (let x = 1044; x <= 1072; x++) {
      const i = idx(x, y); if (tiles[i] !== T.PATH) continue;
      t.setRegion(x, y, "cragmaw_heights");
      if (dist(x, y, M.x, M.y, M.rx, M.ry) > 0.84) raise[i] = 3.2 * Math.max(0, Math.min(1, (foot - y) / (foot - top)));
    }
    // Scree and boulders on the heights, the ore Cragmaw's miners never climbed for, the goats, and the frost drakes over it all.
    t.scatter(M.x - 36, M.y - 34, M.x + 36, M.y + 34, 16, (x, y) => t.decor(x, y, "boulder"), (x, y) => t.free(x, y) && dist(x, y, M.x, M.y, M.rx, M.ry) < 0.8);
    t.rockCluster(M.x - 22, M.y + 8, 3, "moonsilver", 4); t.rockCluster(M.x + 14, M.y - 22, 3, "glimmer", 4); t.rockCluster(M.x - 6, M.y - 26, 2, "moonsilver", 3);
    t.monsters("serow", M.x - 30, M.y - 28, M.x + 30, M.y + 28, 3);
    t.monsters("frost_drake", M.x - 36, M.y - 34, M.x + 36, M.y + 34, 9);
    sign(1067, 151, "The Cragmaw Heights. Switchbacks up on to the snow; frost drakes over it, and the Iron Wyrm in its bowl on the far side. Nothing but a Wyrmward shield against their breath.");
    sign(1048, 112, "The heights. The Iron Wyrm's bowl is north-east, past the snow; it sleeps on the ore. Frost burns like fire.");
    label("cragmaw_heights", M.x, M.y - 16);
  }

  // ---------- Qeshet: a ruined city half buried by the Sea of Dunes ----------
  {
    const Q = QESHET, qx = Q.door.x, D = Q.door;
    const sand = (x: number, y: number) => t.inBounds(x, y) && tiles[idx(x, y)] === T.SAND;
    // The pavement under the sand, showing where the wind has cleared it (less and less towards the north, where the dunes have it).
    for (let y = Q.y0 - 5; y <= Q.y1 + 5; y++) for (let x = Q.x0 - 5; x <= Q.x1 + 5; x++) {
      if (!sand(x, y)) continue;
      t.setRegion(x, y, "qeshet");
      const inside = x >= Q.x0 && x <= Q.x1 && y >= Q.y0 && y <= Q.y1, buried = 0.42 + 0.3 * (Q.y1 - y) / (Q.y1 - Q.y0);
      if (inside && noise2(x * 0.9 + 400, y * 0.9) > buried) tiles[idx(x, y)] = T.STONE;
    }
    // The processional way, from the south gate to the sanctum; the colonnade either side of it, half its pillars down.
    t.fillRect(qx - 2, D.y + 1, qx + 2, Q.y1 + 1, T.STONE);
    for (let y = D.y + 4; y <= Q.y1 - 4; y += 4) for (const x of [qx - 4, qx + 4]) { if (random() > 0.35) place(x, y, "pillar", true, "Pillar"); else place(x, y, "rubble", true, "A fallen pillar, in drums"); }
    // The walls: the outer ring and the courts' dividers, broken wherever the sand has had them.
    const wall = (x: number, y: number) => { if (noise(x * 1.3 + 700, y * 1.3) > 0.4 && sand(x, y) || (t.inBounds(x, y) && tiles[idx(x, y)] === T.STONE && noise(x * 1.3 + 700, y * 1.3) > 0.4)) place(x, y, "ruin_wall", true, "Ruined wall"); };
    for (let x = Q.x0; x <= Q.x1; x++) { wall(x, Q.y0); if (x < qx - 2 || x > qx + 2) wall(x, Q.y1); }
    for (let y = Q.y0; y <= Q.y1; y++) { wall(Q.x0, y); wall(Q.x1, y); }
    for (let x = Q.x0 + 1; x < Q.x1; x++) if (x < qx - 3 || x > qx + 3) wall(x, Q.y0 + 22);
    for (let y = Q.y0 + 23; y < Q.y1; y++) { if (y < Q.y0 + 36 || y > Q.y0 + 40) { wall(qx - 16, y); wall(qx + 16, y); } }
    // The sanctum: a block of dressed sandstone at the head of the way, the Sunken Door in its south face.
    t.building(qx - 5, D.y - 6, qx + 5, D.y, "s", T.STONE, qx, { walls: "sandstone", hip: true });
    t.clearAt(D.x, D.y);
    t.add({ kind: "ladder", look: "gate", axis: "ew", x: D.x, y: D.y, blocks: true, name: "The Sunken Door", action: "Enter", to: { x: SUNKEN_HALLS.entry.x, y: UNDER_Y + SUNKEN_HALLS.entry.dy } });
    place(qx - 7, D.y + 1, "statue", true, "A seated king, his face gone"); place(qx + 7, D.y + 1, "statue", true, "A seated king, his face gone");
    for (const [x, y] of [[qx - 14, D.y + 4], [qx + 14, D.y + 4], [qx - 14, Q.y0 + 20], [qx + 14, Q.y0 + 20]] as const) place(x, y, "obelisk", true, "Obelisk, its carving worn to nothing");
    // The west court, a hypostyle hall with its roof gone; the east court, the necropolis; the south-west court, the bandits' camp.
    for (let y = Q.y0 + 26; y <= Q.y0 + 50; y += 6) for (let x = Q.x0 + 6; x <= qx - 20; x += 6) { if (random() > 0.3) place(x, y, "pillar", true, "Pillar"); else place(x, y, "rubble", true, "A fallen pillar, in drums"); }
    for (let y = Q.y0 + 26; y <= Q.y0 + 44; y += 6) for (let x = qx + 20; x <= Q.x1 - 6; x += 7) place(x, y, "tomb", true, "A tomb, its lid shifted");
    place(Q.x0 + 10, Q.y1 - 8, "tent", true, "A bandit's tent"); place(Q.x0 + 13, Q.y1 - 6, "campfire", false, "A camp fire, still warm"); place(Q.x0 + 8, Q.y1 - 5, "crate", true, "Looted goods");
    t.scatter(Q.x0 + 2, Q.y0 + 2, Q.x1 - 2, Q.y1 - 2, 14, (x, y) => t.decor(x, y, "rubble", true, "Rubble"), (x, y) => t.free(x, y) && !(x >= qx - 3 && x <= qx + 3));
    t.scatter(Q.x0 + 2, Q.y0 + 2, Q.x1 - 2, Q.y1 - 2, 10, (x, y) => t.decor(x, y, "bones", false, "Bones, cracked for the marrow"), (x, y) => t.free(x, y) && !(x >= qx - 3 && x <= qx + 3));
    t.scatter(Q.x0 - 5, Q.y0 - 5, Q.x1 + 5, Q.y1 + 5, 8, (x, y) => t.decor(x, y, "cactus"), (x, y) => t.free(x, y) && (x < Q.x0 || x > Q.x1 || y < Q.y0 || y > Q.y1));
    // The drakes over the ruin, and the desert's other hunters: scorpions in the courts, hyenas and jackals at the walls, the bandits at their camp.
    t.monsters("dune_drake", Q.x0 + 2, Q.y0 + 2, Q.x1 - 2, Q.y1 - 2, 7);
    t.monsters("sand_scorpion", Q.x0 + 2, Q.y0 + 24, Q.x1 - 2, Q.y1 - 2, 4);
    t.monsters("sunteeth_hyena", Q.x0 - 5, Q.y0 - 5, Q.x1 + 5, Q.y1 + 5, 3);
    t.monsters("dune_jackal", Q.x0 - 5, Q.y0 - 5, Q.x1 + 5, Q.y1 + 5, 3);
    t.monsters("bandit", Q.x0 + 3, Q.y1 - 12, Q.x0 + 18, Q.y1 - 2, 3);
    // A track from the dunes road, and the signs.
    let fork: [number, number] | null = null;
    for (let x = 200; x <= 320 && !fork; x++) if (tiles[idx(x, 745)] === T.PATH) fork = [x, 745];
    if (fork) { t.road([fork, [205, 768], [qx + 10, Q.y1 + 8], [qx, Q.y1 + 3]], 2, T.GRAVEL); sign(fork[0] - 2, fork[1] + 2, "West, off the road: Qeshet, the city the sand took. Dune drakes over it, and worse under it."); }
    sign(qx + 4, Q.y1 + 2, "Qeshet. The old kings' city, half under the dunes. The sanctum at the head of the way has a door in it that goes down. Dragons; bring a Wyrmward shield.");
    label("qeshet", qx, Q.y0 + 32);
  }

  // ---------- The Sunken Halls, under Qeshet: the old kings' halls, and the Sand Mother round the water ----------
  {
    const S = SUNKEN_HALLS, X = S.x, Y = UNDER_Y + S.dy;
    const at = (x: number, y: number) => idx(X + x, Y + y);
    for (let y = -2; y <= S.h; y++) for (let x = -2; x <= S.w; x++) { tiles[at(x, y)] = T.VOID; t.setRegion(X + x, Y + y, "sunken_halls"); }
    const hall = (ax: number, ay: number, bx: number, by: number, kind: number = T.DUNGEON) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) tiles[at(x, y)] = kind; };
    hall(28, 9, 36, 15);                        // the door hall, under the sanctum
    hall(31, 15, 33, 34);                       // the processional, going south under the way
    hall(12, 34, 52, 50);                       // the Hall of Sand
    hall(10, 41, 12, 43); hall(1, 38, 10, 46);  // west: the Well of Qeshet
    hall(52, 42, 54, 44); hall(54, 38, 64, 48); // east: the kings' crypt
    hall(31, 50, 33, 56);                       // down to
    hall(16, 56, 48, 76);                       // the Sand Mother's vault
    hall(30, 76, 34, 80);                       // and the hoard behind her
    // Sand drifted over the Hall of Sand's floor and the vault's; the well, and the vault's pool, the only water for forty miles.
    for (let y = 34; y <= 50; y++) for (let x = 12; x <= 52; x++) if (noise2((X + x) * 0.7, (Y + y) * 0.7 + 500) > 0.47) tiles[at(x, y)] = T.SAND;
    for (let y = 56; y <= 76; y++) for (let x = 16; x <= 48; x++) if (noise2((X + x) * 0.6 + 80, (Y + y) * 0.6) > 0.38) tiles[at(x, y)] = T.SAND;
    for (let y = 60; y <= 72; y++) for (let x = 24; x <= 40; x++) if (dist(x, y, 32, 66, 6, 3.5) <= 1) tiles[at(x, y)] = dist(x, y, 32, 66, 6, 3.5) < 0.4 ? T.DEEP : T.WATER;
    for (let y = 41; y <= 43; y++) for (let x = 4; x <= 6; x++) tiles[at(x, y)] = T.WATER;
    // Walls round everything that's floor.
    const floor = (tile: number) => tile === T.DUNGEON || tile === T.SAND || tile === T.WATER || tile === T.DEEP;
    for (let y = -1; y <= S.h; y++) for (let x = -1; x <= S.w; x++) {
      if (tiles[at(x, y)] !== T.VOID) continue;
      let beside = false;
      for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) if (floor(tiles[at(x + dx, y + dy)])) beside = true;
      if (beside) tiles[at(x, y)] = T.WALL;
    }
    // The door up, in the hall's north wall.
    t.add({ kind: "ladder", look: "gate", axis: "ew", x: X + 32, y: Y + 9, blocks: true, name: "The Sunken Door", action: "Climb-up", to: { x: QESHET.door.x, y: QESHET.door.y + 1 } });
    const P = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => place(X + x, Y + y, kind, blocks, name);
    // The door hall: torches, and the kings' statues either side of the way.
    for (const [x, y] of [[29, 10], [35, 10], [29, 14], [35, 14]] as const) P(x, y, "torch");
    P(30, 16, "statue", true, "A king of Qeshet, in his crown"); P(34, 16, "statue", true, "A queen of Qeshet, in hers");
    for (const y of [20, 26, 32]) { P(30, y, "torch"); P(34, y, "torch"); }
    // The Hall of Sand: a hypostyle hall, pillars in rows, the sand over half its floor; the drakes roost in it.
    for (const y of [38, 46]) for (const x of [16, 24, 40, 48]) { if (random() > 0.25) P(x, y, "pillar", true, "Pillar, carved with the count of the kings"); else P(x, y, "rubble", true, "A fallen pillar, in drums"); }
    for (const [x, y] of [[13, 35], [51, 35], [13, 49], [51, 49], [32, 35]] as const) P(x, y, "torch");
    t.scatter(X + 13, Y + 35, X + 51, Y + 49, 6, (x, y) => t.decor(x, y, "bones", false, "Bones, cracked for the marrow"));
    // The Well of Qeshet: the water the city was built for, and a coffer the priests kept by it.
    P(2, 39, "torch"); P(2, 45, "torch"); P(8, 39, "chest", true, "The well-priests' coffer"); P(8, 45, "obelisk", true, "The well's stele: a count of dry years");
    t.add({ kind: "sign", x: X + 5, y: Y + 39, blocks: true, name: "Carved stone", text: "Cut into the well's rim, in the old kings' script: 'The mother drinks first.' Under it, later, and in haste: 'She is below.'" });
    // The kings' crypt: tombs in two rows, the coffers of their grave-goods between.
    for (const x of [56, 59, 62]) { P(x, 40, "tomb", true, "A king's tomb, its lid shifted"); P(x, 46, "tomb", true, "A queen's tomb, its lid shifted"); }
    P(57, 43, "chest", true, "Coffer of the grave-goods"); P(61, 43, "chest", true, "Coffer of the grave-goods"); P(55, 39, "torch"); P(63, 47, "torch");
    // The vault: obelisks at its corners, the pool at its heart, the Sand Mother coiled round it, and her hoard behind her.
    for (const [x, y] of [[17, 57], [47, 57], [17, 75], [47, 75]] as const) P(x, y, "obelisk", true, "Obelisk: the Sand Mother's name, forty times");
    for (const [x, y] of [[24, 57], [40, 57], [24, 75], [40, 75], [17, 66], [47, 66]] as const) P(x, y, "torch");
    P(30, 55, "statue", true, "A priest of the well, his hands out"); P(34, 55, "statue", true, "A priest of the well, his hands out");
    P(32, 79, "chest", true, "The Sand Mother's hoard");
    t.add({ kind: "sign", x: X + 28, y: Y + 77, blocks: true, name: "Carved stone", text: "Over the hoard, in the old kings' script: 'What the mother was given.' Everything the city had, by the look of it." });
    // What lives in the halls.
    t.monsters("sand_scorpion", X + 31, Y + 16, X + 33, Y + 33, 2); t.monsters("sand_scorpion", X + 55, Y + 39, X + 63, Y + 47, 2);
    t.monsters("dune_drake", X + 13, Y + 35, X + 51, Y + 49, 5);
    t.monsters("dune_drake", X + 17, Y + 57, X + 47, Y + 75, 2);
    t.monster("sand_wyrm", X + 31, Y + 70, 2);
    label("sunken_halls", X + 32, Y + 45);
  }
}
