/**
 * The Crownstones: Raria's great henge on the Greyfields, between the Crownlands' farms and the old fort (built after
 * the north, in the grown world's own coordinates), and the Undercroft of Crowns under it. Kings were made here.
 * - The henge: a bank and a ditch round a ring of trilithons and standing stones, the fort road running through its
 *   north and south gaps, an avenue of paired stones coming in from the west, barrows on the downs outside.
 * - Inside, the five Crown Stones stand in a horseshoe round the altar stone, each with a carved disc that turns to
 *   one of five faces (the Sun, the Moon, the Star, the Crown, the Eye). The four station stones round the ring say how
 *   they were set. Set all five and the altar stone grinds aside on a stair down.
 * - The Undercroft of Crowns: the entry hall, a ring gallery round the Crown Vault kept by stone sentinels, and four
 *   chambers off it for the old regalia (the Sceptre, the Orb, the Ring, the Mantle), each with its warden, who carries
 *   that regalia's stone. The Vault door takes all four (once; it remembers you), and the Uncrowned King sits inside.
 * How each player has set the stones, and whether the Vault knows them, is theirs (questData).
 */
import { REGIONS, T, W, UNDER_Y, worldTools, type GenContext, type RegionId, type World, type WorldObject } from "./world.ts";
import { addXp, has, message, sound, take, type Game } from "./state.ts";
import { REGALIA } from "./crownstonesgear.ts";

/** The henge's centre and its rings: the bank's middle, the stones, the horseshoe (and the altar at its heart). */
export const HENGE = { x: 320, y: 636, bank: 22, ring: 16 } as const;
export const ALTAR = { x: HENGE.x - 6, y: HENGE.y } as const;
/** The undercroft (its rows are UNDER_Y + dy). */
export const UNDERCROFT = { x: 270, dy: 600, w: 104, h: 84 } as const;
/** The faces a Crown Stone turns to, and how the five must be set (the station stones say). */
export const FACES = ["Sun", "Moon", "Star", "Crown", "Eye"] as const;
export const CROWN_SOLUTION = [0, 2, 3, 4, 1] as const;
const ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth"] as const;
const under = (x: number, y: number) => ({ x: UNDERCROFT.x + x, y: UNDER_Y + UNDERCROFT.dy + y });
/** Where the stair comes down, and the Vault door (functions: UNDER_Y isn't set when this module loads). */
export const undercroftEntry = () => under(52, 6), vaultDoor = () => under(52, 56);
/** The ring gallery's middle (the Vault's too). */
const GX = 52, GY = 44;

export function buildCrownstones(ctx: GenContext, labels: World["labels"]) {
  const t = worldTools(ctx), { tiles, lift, raise, noise2 } = ctx, H = HENGE;
  const idx = (x: number, y: number) => y * W + x;
  const label = (id: RegionId, x: number, y: number) => { const entry = REGIONS.find(region => region.id === id) as { label: { x: number; y: number } } | undefined; if (entry) { entry.label = { x, y }; labels[id] = { x, y }; } };
  const clueAt = (o: WorldObject | null, clue: string, extra: Partial<WorldObject> = {}) => { if (o) ctx.objects[o.id] = { ...o, clue, ...extra }; };
  const put = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => { t.clearAt(x, y); return t.decor(x, y, kind, blocks, name); };
  const roadX = H.x;   // (the fort road runs north–south through the henge's two gaps)

  // ---------- The ground: downs cleared of fields, the bank and the ditch ----------
  for (let y = H.y - H.bank - 4; y <= H.y + H.bank + 4; y++) for (let x = H.x - H.bank - 4; x <= H.x + H.bank + 4; x++) {
    const r = Math.hypot(x - H.x, y - H.y), i = idx(x, y);
    if (r > H.bank + 3.5 || tiles[i] === T.WALL || tiles[i] === T.VOID) continue;
    t.clearAt(x, y); t.setRegion(x, y, "crownstones"); raise[i] = 6 / 64;
    const bank = Math.max(0, 1 - Math.abs(r - H.bank) / 1.6), ditch = Math.max(0, 1 - Math.abs(r - (H.bank - 2.6)) / 1.1);
    lift[i] = Math.round((0.3 + bank * 0.9 - ditch * 0.25) * 64) / 64;   // (on the bake's own steps, so it bakes exactly)
    tiles[i] = ditch > 0.3 ? T.DARK_GRASS : noise2(x * 0.25, y * 0.25 + 30) > 0.62 ? T.DARK_GRASS : T.GRASS;
  }
  // The avenue's ground, west from the gap, and the downs either side of it.
  for (let x = H.x - 52; x < H.x - H.bank; x++) for (let y = H.y - 5; y <= H.y + 5; y++) { const i = idx(x, y); if (tiles[i] === T.WALL || tiles[i] === T.VOID) continue; t.clearAt(x, y); t.setRegion(x, y, "crownstones"); tiles[i] = Math.abs(y - H.y) <= 1 ? T.GRAVEL : T.GRASS; }
  for (let x = H.x - H.bank - 2; x <= H.x - H.bank + 4; x++) for (let y = H.y - 1; y <= H.y + 1; y++) tiles[idx(x, y)] = T.GRAVEL;
  // The fort road, through the north and south gaps, joined to what's left of it either side.
  for (let y = H.y - H.bank - 4; y <= H.y + H.bank + 4; y++) for (let x = roadX - 1; x <= roadX + 1; x++) tiles[idx(x, y)] = T.GRAVEL;
  const join = (from: [number, number], y0: number, y1: number) => {
    let best: [number, number] | null = null, bestD = 1e9;
    for (let y = y0; y <= y1; y++) for (let x = from[0] - 16; x <= from[0] + 16; x++) if (tiles[idx(x, y)] === T.GRAVEL || tiles[idx(x, y)] === T.PATH) { const d = Math.hypot(x - from[0], y - from[1]); if (d < bestD) { bestD = d; best = [x, y]; } }
    if (best) t.road([from, best], 2.6, T.GRAVEL);
  };
  join([roadX, H.y - H.bank - 5], H.y - H.bank - 30, H.y - H.bank - 6);
  join([roadX, H.y + H.bank + 5], H.y + H.bank + 6, H.y + H.bank + 34);
  for (const y of [H.y - H.bank - 5, H.y + H.bank + 5]) { t.clearAt(roadX, y); t.clearAt(roadX - 1, y); t.clearAt(roadX + 1, y); }
  const gap = (x: number, y: number, at: [number, number], r: number) => Math.hypot(x - at[0], y - at[1]) < r;

  // ---------- The ring: trilithons and standing stones, the fort road and the avenue through it ----------
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2, x = Math.round(H.x + Math.cos(a) * H.ring), y = Math.round(H.y + Math.sin(a) * H.ring);
    if (Math.abs(x - roadX) <= 2 || gap(x, y, [H.x - H.ring, H.y], 3)) continue;
    put(x, y, k % 2 ? "menhir" : "trilithon", true, k % 2 ? "A standing stone of the great ring" : "A trilithon of the great ring");
  }
  // The five Crown Stones in their horseshoe round the altar, open to the east.
  for (let k = 0; k < 5; k++) {
    const a = Math.PI / 2 + (k / 4) * Math.PI, x = Math.round(ALTAR.x + Math.cos(a) * 5), y = Math.round(ALTAR.y - Math.sin(a) * 5);
    clueAt(put(x, y, "crown_stone", true, `The ${ORDINALS[k]} Crown Stone`), `cs_crown_${k + 1}`);
  }
  for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const) { t.clearAt(ALTAR.x + dx, ALTAR.y + dy); tiles[idx(ALTAR.x + dx, ALTAR.y + dy)] = T.STONE; }
  tiles[idx(ALTAR.x, ALTAR.y)] = T.STONE;
  clueAt(put(ALTAR.x, ALTAR.y, "altar_stone", true, "The Altar Stone"), "cs_altar", { to: undercroftEntry() });
  // The four station stones, where the ring's diagonals cross the inner downs; the Heel Stone out on the avenue.
  ([["nw", -1, -1], ["ne", 1, -1], ["se", 1, 1], ["sw", -1, 1]] as const).forEach(([which, sx, sy]) => {
    const x = Math.round(H.x + sx * 8.5), y = Math.round(H.y + sy * 8.5);
    clueAt(put(Math.abs(x - roadX) <= 2 ? x + sx * 2 : x, y, "menhir", true, "A station stone"), `cs_station_${which}`);
  });
  clueAt(put(H.x - H.bank - 6, H.y - 3, "menhir", true, "The Heel Stone"), "cs_heel");
  for (let x = H.x - H.bank - 10; x >= H.x - 50; x -= 5) { put(x, H.y - 3, "menhir", true, "A stone of the avenue"); put(x, H.y + 3, "menhir", true, "A stone of the avenue"); }
  t.clearAt(H.x - 54, H.y - 2); t.add({ kind: "sign", x: H.x - 54, y: H.y - 2, blocks: true, name: "The Crownstones", text: "THE CROWNSTONES. Here the kings of Raria were crowned, and here the old crown went down into the ground with the last of them. Mind the stones. Don't turn them." });
  t.clearAt(roadX + 3, H.y - H.bank - 6); t.add({ kind: "sign", x: roadX + 3, y: H.y - H.bank - 6, blocks: true, name: "The Crownstones", text: "THE CROWNSTONES. The fort road runs through the ring: keep to it, and leave the stones as you found them." });
  // Barrows on the downs outside, sheep grazing among the stones, and the odd thorn tree.
  for (const [x, y] of [[H.x + 26, H.y - 10], [H.x + 27, H.y + 6], [H.x - 26, H.y + 11], [H.x - 24, H.y - 13], [H.x + 12, H.y + 26]] as const) if (tiles[idx(x, y)] !== T.WATER && tiles[idx(x, y)] !== T.WALL) put(x, y, "dolmen", true, "A barrow's door-stones");
  t.monsters("sheep", H.x - H.ring + 2, H.y - H.ring + 2, H.x + H.ring - 2, H.y + H.ring - 2, 6);

  // ---------- The Undercroft of Crowns ----------
  const U = UNDERCROFT, X = U.x, Y = UNDER_Y + U.dy, at = (x: number, y: number) => idx(X + x, Y + y);
  for (let y = -2; y <= U.h + 1; y++) for (let x = -2; x <= U.w + 1; x++) { tiles[at(x, y)] = T.VOID; t.setRegion(X + x, Y + y, "crownstones_undercroft"); }
  const hall = (ax: number, ay: number, bx: number, by: number, kind: number = T.DUNGEON) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) tiles[at(x, y)] = kind; };
  hall(45, 2, 59, 10);                                     // the entry hall, under the altar
  hall(51, 10, 53, 16);                                    // down to the gallery
  // The ring gallery round the Vault (three tiles wide), and the Vault in its middle.
  for (let y = 0; y < U.h; y++) for (let x = 0; x < U.w; x++) { const r = Math.hypot(x - GX, y - GY); if (r >= 25.5 && r <= 28.6) tiles[at(x, y)] = T.DUNGEON; if (r <= 11.5) tiles[at(x, y)] = T.DUNGEON; }
  hall(51, 56, 53, 70);                                    // the Vault's south spur (its door at 52, 56)
  // The regalia's four chambers off the gallery's diagonals, with their passages.
  const CHAMBERS = [[27, 19], [77, 19], [77, 69], [27, 69]] as const;
  CHAMBERS.forEach(([cx, cy]) => {
    hall(cx - 6, cy - 5, cx + 6, cy + 5);
    const sx = Math.sign(GX - cx), sy = Math.sign(GY - cy);
    for (let k = 0; k <= 2; k++) hall(cx + sx * (4 + k) - 1, cy + sy * (4 + k) - 1, cx + sx * (4 + k) + 1, cy + sy * (4 + k) + 1);
  });
  // Walls round every floor.
  const floor = (tile: number) => tile === T.DUNGEON || tile === T.STONE;
  for (let y = -1; y <= U.h; y++) for (let x = -1; x <= U.w; x++) {
    if (tiles[at(x, y)] !== T.VOID) continue;
    let beside = false;
    for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) if (floor(tiles[at(x + dx, y + dy)])) beside = true;
    if (beside) tiles[at(x, y)] = T.WALL;
  }
  // The Vault's wall is whole but for its door.
  for (let y = 0; y < U.h; y++) for (let x = 0; x < U.w; x++) { const r = Math.hypot(x - GX, y - GY); if (r > 11.5 && r <= 13 && tiles[at(x, y)] === T.DUNGEON && !(x >= 51 && x <= 53 && y > GY)) tiles[at(x, y)] = T.WALL; }
  for (let x = 51; x <= 53; x++) tiles[at(x, 56)] = T.WALL;
  const DOOR = vaultDoor(); tiles[idx(DOOR.x, DOOR.y)] = T.DUNGEON;
  const P = (x: number, y: number, kind: Parameters<typeof t.decor>[2], blocks = true, name?: string) => put(X + x, Y + y, kind, blocks, name);
  // The stair up beside the altar, and the Vault door (cs_vault_door: the four regalia stones, set in its sockets).
  t.add({ kind: "ladder", x: X + 52, y: Y + 3, blocks: true, name: "Stair up to the Crownstones", action: "Climb-up", to: { x: ALTAR.x + 2, y: ALTAR.y } });
  t.add({ kind: "ladder", look: "gate", axis: "ns", x: DOOR.x, y: DOOR.y, blocks: true, name: "The Crown Vault's door", action: "Open", to: { x: DOOR.x, y: DOOR.y - 1 }, clue: "cs_vault_door" });
  for (const [x, y] of [[46, 3], [58, 3], [46, 9], [58, 9]] as const) P(x, y, "torch");
  P(49, 5, "statue", true, "A crowned king, in grey stone"); P(55, 5, "statue", true, "A crowned queen, in grey stone");
  // The gallery: kings in their niches, torches, and the sentinels that walk it.
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, x = Math.round(GX + Math.cos(a) * 28.6), y = Math.round(GY + Math.sin(a) * 28.6);
    if (tiles[at(x, y)] === T.DUNGEON && !CHAMBERS.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 14) && Math.abs(x - GX) > 2) P(x, y, k % 2 ? "torch" : "statue", true, k % 2 ? undefined : "A king of Raria, crowned, in a niche");
  }
  // The chambers: each its warden, its coffers, its own king's tomb.
  CHAMBERS.forEach(([cx, cy], k) => {
    const r = REGALIA[k];
    P(cx, cy + (cy < GY ? -4 : 4), "tomb", true, `A king's tomb, its lid carved with the ${r.id}`);
    P(cx - 5, cy - 4, "chest", true, "Crownstones coffer"); P(cx + 5, cy + 4, "chest", true, "Crownstones coffer");
    P(cx - 5, cy + 4, "torch"); P(cx + 5, cy - 4, "torch");
    t.monster(r.warden, X + cx, Y + cy, 2);
  });
  const inGallery = (x: number, y: number) => { const r = Math.hypot(x - X - GX, y - Y - GY); return r >= 25.5 && r <= 28.6 && t.free(x, y) && tiles[idx(x, y)] === T.DUNGEON; };
  t.scatter(X + 20, Y + 12, X + 84, Y + 76, 10, (x, y) => t.monster("stone_sentinel", x, y, 3), inGallery);
  t.scatter(X + 20, Y + 12, X + 84, Y + 76, 6, (x, y) => t.monster("cairn_wight", x, y, 3), inGallery);
  // The Crown Vault: the empty throne that isn't empty, and the hoard.
  P(GX, GY - 8, "throne", true, "The Throne of Crowns"); P(GX + 4, GY - 8, "chest", true, "The Uncrowned King's hoard");
  for (const [x, y] of [[GX - 7, GY - 6], [GX + 7, GY - 6], [GX - 7, GY + 6], [GX + 7, GY + 6]] as const) P(x, y, "obelisk", true, "A pillar carved with crowns");
  for (const [x, y] of [[GX - 10, GY], [GX + 10, GY], [GX - 4, GY - 10], [GX + 4, GY - 10]] as const) P(x, y, "torch");
  t.monster("uncrowned_king", X + GX, Y + GY - 2, 2);

  label("crownstones", H.x, H.y - H.bank - 3); label("crownstones_undercroft", X + GX, Y + GY);
}

// ---------- The puzzle, the altar, the Vault (kharaveth.ts lists these clues) ----------
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
export const crownstonesOpen = (game: Game) => !!game.player.questData.cs_open;
/** The face a Crown Stone shows this player (render.ts draws it): 1 to 5 by its clue. */
export const crownFace = (game: Game, stone: number) => (game.player.questData[`cs_face_${stone}`] ?? 0) % FACES.length;
const crownStone = (k: number): Clue => ({
  options: game => crownstonesOpen(game) ? ["Inspect"] : ["Turn", "Inspect"],
  examine: game => `A trilithon of grey stone with a disc carved in its lintel. It shows the ${FACES[crownFace(game, k)]}.`,
  use: (game, _object, option) => {
    const p = game.player, face = crownFace(game, k);
    if (option !== "Turn" || crownstonesOpen(game)) return { text: crownstonesOpen(game) ? `The disc shows the ${FACES[face]}. It won't turn now: the stones are set.` : `The disc shows the ${FACES[face]}.` };
    const next = (face + 1) % FACES.length; p.questData[`cs_face_${k}`] = next; sound(game, "click");
    if (CROWN_SOLUTION.every((want, i) => crownFace(game, i + 1) === want)) {
      p.questData.cs_open = 1; addXp(game, "mysteries", 1500, { raw: true }); sound(game, "quest");
      message(game, "The fifth disc settles, and somewhere under your feet stone grinds on stone. The altar stone is sliding aside.", "quest");
    }
    return { text: `You lean on the stone and the disc turns, grinding. It shows the ${FACES[next]} now.` };
  },
});
const station = (line: string): Clue => ({ options: () => ["Read"], examine: () => "A squat station stone with a line cut round it.", use: () => ({ text: line }) });
export const CROWNSTONES_CLUES: Record<string, Clue> = {
  cs_heel: { options: () => ["Read"], examine: () => "The Heel Stone, leaning, out on the avenue. Words are cut down its face.",
    use: () => ({ text: "Cut in the Heel Stone: \"Five stones crown the king, and each wears a face. The four that stand at the corners of the ring say which. Set them, and the stone at the heart will let you down to the crown.\"" }) },
  cs_station_nw: station("Cut round the station stone: \"The First stone wakes with the Sun.\""),
  cs_station_ne: station("Cut round the station stone: \"The Fifth stone sleeps under the Moon.\""),
  cs_station_se: station("Cut round the station stone: \"The Crown sits in the middle, as a crown should.\""),
  cs_station_sw: station("Cut round the station stone: \"The Star keeps close by the Sun, and the Eye keeps close by the Moon.\""),
  ...Object.fromEntries([1, 2, 3, 4, 5].map(k => [`cs_crown_${k}`, crownStone(k)])),
  cs_altar: {
    options: game => crownstonesOpen(game) ? ["Climb-down"] : ["Inspect"],
    examine: game => crownstonesOpen(game) ? "The altar stone, slid aside on a stair going down into the dark." : "A great flat stone at the heart of the horseshoe, a crown cut in it. It doesn't move.",
    use: (game, object) => crownstonesOpen(game) ? { to: object.to, text: "You go down the stair under the altar stone." }
      : { text: "The altar stone won't move. Round its edge: \"When the crown is set, the stone will let you down.\" The five Crown Stones round it have carved discs that turn." },
  },
  cs_vault_door: {
    options: () => ["Open"], examine: () => "The Crown Vault's door: one slab of grey stone with four sockets in it, each cut to a shape: a sceptre, an orb, a ring, a mantle.",
    use: () => ({ text: "The door has four sockets: a sceptre, an orb, a ring, a mantle." }),
  },
};
/** The Vault door (the engine calls this before the clue): the four regalia stones, set once, and it knows you after. */
export function crownstonesDoor(game: Game, object: WorldObject, travel: (game: Game, to: { x: number; y: number }, text: string) => void): boolean {
  if (object.clue !== "cs_vault_door") return false;
  const p = game.player;
  if (p.y < object.y) { travel(game, { x: object.x, y: object.y + 1 }, "You go back out through the Crown Vault's door."); return true; }
  if (p.questData.cs_vault) { travel(game, object.to!, "The door knows you, and opens."); return true; }
  const missing = REGALIA.filter(r => !has(p, r.stone));
  if (missing.length) { message(game, `The door has four sockets: a sceptre, an orb, a ring, a mantle. You're missing the ${missing.map(r => r.name.toLowerCase()).join(", ")}. The regalia's wardens carry them.`, "warn"); return true; }
  for (const r of REGALIA) take(p, r.stone, 1);
  p.questData.cs_vault = 1; addXp(game, "mysteries", 2500, { raw: true }); sound(game, "quest");
  travel(game, object.to!, "You set the four stones in their sockets. The door sinks into the floor, and the Crown Vault opens.");
  return true;
}
