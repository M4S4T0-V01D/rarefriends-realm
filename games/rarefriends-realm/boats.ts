/**
 * Boats between the Palian Isles (What Rises in the East): a boatman at every landing sells passage to every other
 * landing you know of, for coins, and rows you there.
 *
 * Where you can go: the mainland ferry, Kurohama, Tanabe's landing and Shiogama from the start; the islands that want
 * visitors once you've been presented at the Hall (Landfall at Kurohama); the fishers' secret rocks once a fisher has
 * shown you; and the dangerous islands only when a quest sends you (Josaki, Ashigane, the cove, Hakkotsu). Once a
 * landing is open it stays open.
 *
 * What it costs: a fare by distance, more for the dangerous islands (the boatman's risk), a tenth off once you're known
 * on the docks (Presence 40). The fare is shown before you board; you pay once, when you board, and arrive at once:
 * paying and moving happen in the same step of the game, so a second click, a reload or a disconnect can't charge you
 * twice or land you without paying. (The crossing you see is only the picture of it.)
 */
import { DOCKS } from "./isles.ts";
import { REGIONS, type World, type WorldObject } from "./world.ts";
import { count, level, type Game } from "./state.ts";
import { data, questDone, stage } from "./content.ts";

export type DockId = typeof DOCKS[number]["id"];
export type Route = { id: string; name: string; text: string; fare: number; open: boolean; why: string | null; here: boolean };

/** What each landing is like, for the list (one line each). */
export const DOCK_TEXT: Record<string, string> = {
  eastport: "The mainland's eastern pier, by Quillhaven. Home, or what passes for it.",
  kurohama: "Hinode's harbour city: the market, the forge, the Bureau of Seals, the road to the castle.",
  tanabe: "Hinode's southern landing, below the rice terraces.",
  shiogama: "A fishing island of three huts and a great many nets.",
  kibi: "The tea island: terraced bushes and the tea-master's house.",
  hanazono: "The blossom island, where the trees flower all year.",
  morishima: "The fox shrine, up a thousand gates through the wood.",
  iwaoka: "The monks' mountain, and the Hall of Silence.",
  josaki: "The burned fortress of the Josaki clan. Closed by the lord's order.",
  torojima: "The Lantern Isle: a lantern for every name the sea took.",
  kusabana: "The herb island, and the herbalist who keeps it.",
  ashigane: "The ogres' island and the copper mine they took.",
  smugglers_cove: "A ring of land round a lagoon. Not on any chart.",
  three_stones: "Three rocks in a row and a watch-post nobody remembers.",
  turtle_rock: "A wish shrine on a rock shaped like a turtle.",
  hakkotsu: "The white island. The bones are not driftwood.",
};

/** The dock objects of a world, by dock id (where you stand to board each, and where you arrive). */
const dockCache = new WeakMap<World, Map<string, WorldObject>>();
export function docksOf(world: World): Map<string, WorldObject> {
  let docks = dockCache.get(world);
  if (!docks) { docks = new Map(); for (const object of world.objects) if (object.kind === "dock" && object.dock && object.name !== "__removed") docks.set(object.dock, object); dockCache.set(world, docks); }
  return docks;
}
/** Why you can't sail to a landing yet (null when you can). */
export function dockLocked(game: Game, id: string): string | null {
  switch (id) {
    case "eastport": case "kurohama": case "tanabe": case "shiogama": return null;
    case "kibi": case "hanazono": case "morishima": case "iwaoka": case "kusabana": case "torojima":
      return questDone(game, "landfall") ? null : "Not until you've been presented at the Hall of Takamori (the harbourmaster in Kurohama will explain).";
    case "turtle_rock": case "three_stones":
      return data(game, `dock_${id}`) ? null : "Only the fishers know the way. Shiogama's net-mender, or Kurohama's harbourmaster, might show you.";
    case "josaki": return stage(game, "josaki_truce") >= 1 ? null : "Closed by the lord of Takamori's order. Captain Ise in the Hall decides who goes.";
    case "ashigane": return stage(game, "red_ogre") >= 1 ? null : "No boat goes to Ashigane without the captain's bounty in your pocket.";
    case "smugglers_cove": return data(game, "cv_jiro") ? null : "There's no such place. (Ask the dockhand in Kurohama, if you must.)";
    case "hakkotsu": return stage(game, "sea_gave_back") >= 1 ? null : "Nobody sails to the white island. The Lantern Keeper on Torojima might tell you why.";
  }
  return "No boat goes there.";
}
const DANGER = (id: string) => REGIONS.find(region => region.id === DOCKS.find(dock => dock.id === id)?.region)?.danger ?? 0;
/** The fare between two landings: by distance, more for the dangerous islands, a tenth off for the well known. */
export function fare(game: Game, from: string, to: string): number {
  const docks = docksOf(game.world), a = docks.get(from), b = docks.get(to);
  if (!a || !b) return 0;
  const distance = Math.hypot(a.x - b.x, a.y - b.y), risk = 1 + 0.25 * Math.max(DANGER(from), DANGER(to));
  const known = level(game, "presence") >= 40 ? 0.9 : 1;
  return Math.max(10, Math.round((12 + distance * 0.8) * risk * known / 5) * 5);
}
/** Every landing, from where you're boarding: its fare and whether you can go. */
export function routesFrom(game: Game, from: string): Route[] {
  return DOCKS.map(dock => {
    const why = dock.id === from ? null : dockLocked(game, dock.id);
    return { id: dock.id, name: dock.name, text: DOCK_TEXT[dock.id] ?? "", fare: dock.id === from ? 0 : fare(game, from, dock.id), open: dock.id !== from && !why, why, here: dock.id === from };
  });
}
/** The landing you're standing at (by its boat or its boatman), within a few tiles, or null. */
export function dockHere(game: Game): string | null {
  const p = game.player;
  for (const [id, object] of docksOf(game.world)) {
    const stand = object.to ?? object;
    if (Math.max(Math.abs(stand.x - p.x), Math.abs(stand.y - p.y)) <= 10) return id;
  }
  return null;
}
/** A crossing just made (for the picture of it: the sea, the boat, the sea's music). */
export type Voyage = { from: string; to: string; tick: number };
export const VOYAGE_TICKS = 6;

/**
 * Whether you can buy passage from `from` to `to` right now: you must be at `from`'s landing, `to` must be open, and
 * you must be able to pay. Gives the fare and where you'll land, or what's wrong. (The engine's `sailTo` pays and moves
 * you in one step.)
 */
export function passage(game: Game, from: string, to: string): { cost: number; arrive: { x: number; y: number }; name: string } | { problem: string } {
  const player = game.player, there = docksOf(game.world).get(to);
  if (from === to) return { problem: "You're already here." };
  if (dockHere(game) !== from) return { problem: "The boat's gone without you: you have to be at the landing to board." };
  if (!there?.to) return { problem: "No boat goes there." };
  const locked = dockLocked(game, to); if (locked) return { problem: locked };
  if (game.arena) return { problem: "Not in the middle of a match." };
  if (player.combat !== null) return { problem: "Not with a fight on your hands." };
  const cost = fare(game, from, to);
  if (count(player, "coins") < cost) return { problem: `The fare is ${cost.toLocaleString()} coins, and you have ${count(player, "coins").toLocaleString()}.` };
  return { cost, arrive: { x: there.to.x, y: there.to.y }, name: DOCKS.find(dock => dock.id === to)?.name ?? to };
}
/** Whether a voyage is still being shown. */
export const atSea = (game: Game) => !!game.voyage && game.tick - game.voyage.tick < VOYAGE_TICKS;
