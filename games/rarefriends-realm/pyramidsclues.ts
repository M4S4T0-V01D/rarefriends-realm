/**
 * The Land Before Stone: what there is to look into at the two pyramids by the south coast (pyramids.ts), and what
 * finding it out teaches (mysteries.ts).
 *
 * The Unfinished Pyramid's ground floor has a casing block set into the floor of the shaft room, cut with marks like
 * the builders' tally on the hall wall. Read the tally first (the builders' last count) and you know the block for what
 * it is: the lid on a shaft, and a count that carries on underneath. Under it, in the Uncounted Deep, the ward hall's
 * empty niches say what the tally was counting, and the lintel over the king's hall says whose count it was. Queen
 * Siruvet's pyramid has its stair under the offering hall's floor, and at the top of the pyramid, over her sarcophagus,
 * the measure that was made.
 *
 * Both deeps are in Kharaveth, past Foothold's south gate: nobody goes down them before A Foothold in the Stone is done.
 */
import { type Game } from "./state.ts";
import { questDone } from "./content.ts";
import { discover, knows, readInscription } from "./mysteries.ts";
import type { WorldObject } from "./world.ts";

type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const FOOTHOLD = "foothold_in_the_stone";
const readClue = (lines: (game: Game, object: WorldObject) => string, effect?: (game: Game, object: WorldObject) => void): Clue => ({
  options: () => ["Read"], examine: lines, use: (game, object) => { const text = lines(game, object); effect?.(game, object); return { text }; },
});
/** You see the shaft for what it is once you've read the builders' count on the hall wall. */
const seesShaft = (game: Game) => knows(game, "unfinished_pyramid") && questDone(game, FOOTHOLD);

export const PYRAMID_CLUES: Record<string, Clue> = {
  uncounted_shaft: {
    options: game => seesShaft(game) ? ["Climb-down"] : ["Search"],
    examine: game => seesShaft(game) ? "A casing block set into the floor, the builders' tally cut on it, its last stroke half made. Under it, a shaft, and rungs going down."
      : "A casing block set into the floor, cut with marks. Cold air comes up round its edges.",
    use: (game, object, option) => {
      if (option === "Climb-down" && seesShaft(game)) return { to: object.to!, text: "You lever the block aside and climb down. On its underside the tally goes on, stroke after stroke, long after the one on the wall stopped." };
      return { text: "Marks on the block: strokes in rows, like a tally. Somebody was counting something. Read the count on the hall wall, and you'd know what these are." };
    },
  },
  siruvet_stair: {
    options: game => questDone(game, FOOTHOLD) ? ["Climb-down"] : [],
    examine: () => "A stair under the offering hall's floor, its steps worn hollow in the middle by people carrying things down.",
    use: (game, object) => questDone(game, FOOTHOLD) ? { to: object.to!, text: "You go down the queen's stair, into lamplight. Somebody has kept the lamps lit." } : { text: "The stair is dark, and Kharaveth is not yet yours to wander." },
  },
  siruvet_measure: readClue(game => `Over the queen's sarcophagus, a row of glyphs round her name ring, every stroke of the tally under it whole. ${readInscription(game, "siruvet_measure")}`, game => discover(game, "siruvet_measure")),
  uncounted_wards: readClue(game => `Over the empty niches, a tally like the builders', cut in the same hand, and stopping at the same half stroke. ${readInscription(game, "uncounted_wards")}`, game => discover(game, "uncounted_measure")),
  uncounted_lintel: readClue(game => `A lintel over the king's hall, a crown cut in the middle of it and a name ring with nothing in it. ${readInscription(game, "uncounted_lintel")}`),
};

/** Finding yourself in the Uncounted Deep is a discovery. */
export function onPyramidsTick(game: Game, regionId: string) {
  if (regionId === "uncounted_deep") discover(game, "uncounted_deep");
}
/** The Uncounted King laid down is another. */
export function onPyramidsKill(game: Game, monsterId: string) {
  if (monsterId === "uncounted_king") discover(game, "uncounted_king");
}
