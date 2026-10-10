/**
 * The Land Before Stone: under the Ochre Spine, the Hall of First Names; across Kharaveth, the shrines of its gods.
 *
 * The door that sees opens for the Orashai's token-bearers (orashaiquests.ts). Behind it: the Antechamber, where the
 * Listener asks questions that are not to be answered; the Hall of Names, its walls ringed with the first names of
 * everything Azhurak named, three of them scratched out and one of them scratched out by a god; the Keeper of First
 * Names' scriptorium; and down the lower stair, the chamber of the Unnamed, who lost its name and wants yours.
 *
 * The gods: the Weigher (Tamesh), the Gate-Mother (Khetmar), the Salt Twins (the Ouresh), the Smoke That Remembers (the
 * Zuri), the Hidden Sun (Sefrah's temple), and one nobody keeps a shrine for, who wanders with a paper bag on his head.
 */
import { DUNGEON_Y, T, type GenContext, type World, type worldTools } from "./world.ts";
import { KHETMAR, OURESH, SITES, TAMESH, ZURI, type SouthKit } from "./heartlands.ts";

type Tools = ReturnType<typeof worldTools>;

/** The Hall of First Names' halls (dungeon rows; columns 0–160 of them no other dungeon uses). */
export const FIRST_HALL = { x0: 20, x1: 150, row0: 4, row1: 50 } as const;

export function buildFirstNames(ctx: GenContext, t: Tools, places: World["places"], kit: SouthKit) {
  const { get, put, add, setRegion } = t, { clue, npcAt, monsterAt, put2 } = kit;
  const H = FIRST_HALL, y0 = DUNGEON_Y + H.row0, y1 = DUNGEON_Y + H.row1, X = H.x0;
  for (let y = y0 - 2; y <= y1 + 2; y++) for (let x = H.x0 - 2; x <= H.x1 + 2; x++) { put(x, y, T.VOID); setRegion(x, y, "first_names_hall"); }
  const hall = (ax: number, ay: number, bx: number, by: number, kind: number = T.DUNGEON) => { for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) put(x, y, kind); };
  hall(X + 4, y0 + 3, X + 20, y0 + 12, T.STONE);          // the Antechamber
  hall(X + 20, y0 + 7, X + 24, y0 + 8, T.STONE);          // through to
  hall(X + 24, y0 + 2, X + 60, y0 + 20);                  // the Hall of Names
  hall(X + 60, y0 + 9, X + 64, y0 + 10, T.STONE);
  hall(X + 64, y0 + 4, X + 86, y0 + 16, T.WOOD);          // the Keeper's scriptorium
  hall(X + 41, y0 + 20, X + 43, y0 + 32, T.STONE);        // the lower stair
  hall(X + 28, y0 + 32, X + 70, y0 + 46);                 // the chamber of the Unnamed
  for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = H.x0 - 1; x <= H.x1 + 1; x++) {
    if (get(x, y) !== T.VOID) continue;
    let beside = false;
    for (let dy = -1; dy <= 1 && !beside; dy++) for (let dx = -1; dx <= 1 && !beside; dx++) { const tt = get(x + dx, y + dy); if (tt === T.STONE || tt === T.DUNGEON || tt === T.WOOD) beside = true; }
    if (beside) put(x, y, T.WALL);
  }
  // In and out: the door that sees (its clue opens it for the initiated), and the way back up.
  const door = ctx.objects.find(object => object.clue === "first_names_door");
  if (door) door.to = { x: X + 6, y: y0 + 7 };
  add({ kind: "ladder", x: X + 5, y: y0 + 4, blocks: true, name: "The door that sees", action: "Climb-up", to: { x: SITES.first_names.x, y: SITES.first_names.y - 2 }, look: "gate", axis: "ew" });
  // The Antechamber: the Listener, and nothing else (it's the nothing that matters).
  npcAt("orashai_listener", X + 14, y0 + 7);
  for (const [x, y] of [[X + 6, y0 + 4], [X + 18, y0 + 4], [X + 6, y0 + 11], [X + 18, y0 + 11]] as const) put2(x, y, "torch", "A lamp burning without smoke", false);
  // The Hall of Names: rings cut in the walls, three scratched names, the god's, and the pillars between.
  for (const [k, x] of [[0, X + 30], [1, X + 40], [2, X + 50]] as const) clue(x, y0 + 3, { kind: "sign", blocks: true, name: "A scratched name", clue: `name_ring_${k}`, text: "" });
  clue(X + 56, y0 + 19, { kind: "sign", blocks: true, name: "A name scratched out twice", clue: "bag_ring", text: "" });
  for (let x = X + 28; x <= X + 58; x += 6) { put2(x, y0 + 8, "pillar", "A pillar ringed with names, every ring full"); put2(x, y0 + 15, "pillar", "A pillar ringed with names, every ring full"); }
  for (const [x, y] of [[X + 26, y0 + 3], [X + 35, y0 + 3], [X + 45, y0 + 3], [X + 58, y0 + 3], [X + 26, y0 + 19], [X + 36, y0 + 19], [X + 46, y0 + 19], [X + 53, y0 + 19]] as const) put2(x, y, "torch", "A lamp burning without smoke", false);
  // The scriptorium: the Keeper, desks of reed and ink, shelves of names.
  npcAt("keeper_first_names", X + 76, y0 + 9);
  for (const [x, y, kind, name] of [[X + 66, y0 + 5, "shelf", "Shelves of clay tablets, a first name on each"], [X + 84, y0 + 5, "shelf", "Shelves of clay tablets, a first name on each"],
    [X + 70, y0 + 14, "table", "A scribe's desk: reed pens, ochre, lapis, and a tablet half written"], [X + 80, y0 + 14, "table", "A scribe's desk: a tablet with your shape on it, and no name yet"]] as const) put2(x, y, kind, name);
  for (const [x, y] of [[X + 65, y0 + 10], [X + 85, y0 + 10]] as const) put2(x, y, "torch", "A lamp burning without smoke", false);
  // The lower stair, shut by its measure until the three names are cut again; the Unnamed below.
  add({ kind: "gate", x: X + 42, y: y0 + 21, blocks: true, name: "The lower stair", action: "Open", to: { x: X + 42, y: y0 + 22 }, clue: "lower_stair" });
  monsterAt("the_unnamed", X + 49, y0 + 40, 2);
  for (let k = 0; k < 4; k++) monsterAt("nameless_shade", X + 34 + k * 10, y0 + 36, 3);
  for (const [x, y] of [[X + 30, y0 + 33], [X + 41, y0 + 33], [X + 57, y0 + 33], [X + 68, y0 + 33], [X + 29, y0 + 39], [X + 69, y0 + 39], [X + 30, y0 + 45], [X + 41, y0 + 45], [X + 57, y0 + 45], [X + 68, y0 + 45]] as const) put2(x, y, "torch", "A lamp, guttering", false);

  // ---------- The gods' shrines, across the heartlands ----------
  const shrine = (x: number, y: number, id: string, name: string) => clue(x, y, { kind: "decor", decor: "statue", blocks: true, name, clue: `shrine_${id}` });
  shrine(TAMESH.x0 - 4, TAMESH.y0 + 6, "weigher", "Shrine of the Weigher");
  shrine(KHETMAR.x0 - 5, KHETMAR.y0 + 4, "gate_mother", "Shrine of the Gate-Mother");
  shrine(OURESH.x - 9, OURESH.y - 6, "salt_twins", "Shrine of the Salt Twins");
  shrine(ZURI.x - 11, ZURI.y - 8, "smoke", "Shrine of the Smoke That Remembers");
  // The man in the bag: just outside Sefrah's north wall, where the temple's ceremonies can be heard and not seen.
  npcAt("bag_man", 808, 640, 2);
  places.first_names = { x: X + 10, y: y0 + 7 };
}
