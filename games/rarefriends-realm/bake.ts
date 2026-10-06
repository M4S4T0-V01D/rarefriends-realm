/**
 * The world, baked. Generating it (`createWorld`) takes a second or two of the main thread, every time the game
 * starts; the build bakes it once and puts it in front of the game's script (scripts/build.mjs), and the game unbakes
 * it in a fraction of the time (`realmWorld` in state.ts). Without a bake (the dev server, the SDK's own build, the
 * tests) the game generates the world as it always has.
 *
 * What's baked: the tiles, the regions and the hill lift (to 1/64, as Uint16 steps along the rows; the heights are
 * rebuilt from them, and only drawing uses them), and the objects, spawns, places, buildings, storeys and ramparts as
 * JSON. The tile → object and tile → building maps are rebuilt from the lists.
 */
import { H, W, buildHeights, indexBuildings, indexObjects, type World } from "./world.ts";

export const BAKE_VERSION = 1;
const LIFT_STEPS = 64;
type Baked = { v: number; seed: number; w: number; h: number; tiles: string; region: string; lift: string; data: Pick<World, "objects" | "spawns" | "places" | "buildings" | "floors" | "ramparts"> };

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromBase64 = (text: string) => { const binary = atob(text), bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; };

/** The world as one string (for the build). */
export function bakeWorld(world: World, lift: Float32Array, seed: number): string {
  const steps = new Uint16Array(lift.length);
  let previous = 0;
  for (let i = 0; i < lift.length; i++) {
    if (!(lift[i] >= 0 && lift[i] < 65535 / LIFT_STEPS)) throw new Error(`bakeWorld: lift ${lift[i]} at ${i} is out of range`);
    const value = Math.round(lift[i] * LIFT_STEPS);
    steps[i] = (value - previous) & 0xffff; previous = value;
  }
  const baked: Baked = {
    v: BAKE_VERSION, seed, w: W, h: H, tiles: toBase64(world.tiles), region: toBase64(world.region), lift: toBase64(new Uint8Array(steps.buffer)),
    data: { objects: world.objects, spawns: world.spawns, places: world.places, buildings: world.buildings, floors: world.floors, ramparts: world.ramparts },
  };
  return JSON.stringify(baked);
}

/** The world from its bake, or null when the bake is for another version or another size of world. */
export function unbakeWorld(text: string): World | null {
  const baked = JSON.parse(text) as Baked;
  if (baked.v !== BAKE_VERSION || baked.w !== W || baked.h !== H) return null;
  const tiles = fromBase64(baked.tiles), region = fromBase64(baked.region), stepBytes = fromBase64(baked.lift);
  const steps = new Uint16Array(stepBytes.buffer, stepBytes.byteOffset, stepBytes.byteLength / 2), lift = new Float32Array(steps.length);
  let value = 0;
  for (let i = 0; i < steps.length; i++) { value = (value + steps[i]) & 0xffff; lift[i] = value / LIFT_STEPS; }
  const { objects, spawns, places, buildings, floors, ramparts } = baked.data;
  return { tiles, region, objects, objectAt: indexObjects(objects), spawns, places, heights: buildHeights(tiles, baked.seed, lift), buildings, buildingAt: indexBuildings(buildings), floors, ramparts };
}
