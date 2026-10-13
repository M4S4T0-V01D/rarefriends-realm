/**
 * The world, baked. Generating it (`createWorld`) takes a second or two of the main thread, every time the game
 * starts; the build bakes it once and puts it in front of the game's script (scripts/build.mjs), and the game unbakes
 * it in a fraction of the time (`realmWorld` in state.ts). Without a bake (the dev server, the SDK's own build, the
 * tests) the game generates the world as it always has.
 *
 * What's baked: the tiles, the regions, the hill lift and the raise (to 1/64, as Uint16 steps along the rows; the heights are
 * rebuilt from them, and only drawing uses them), and the objects, spawns, places, buildings, storeys and ramparts as
 * JSON. The tile → object and tile → building maps are rebuilt from the lists.
 */
import { H, W, buildHeights, indexBuildings, indexObjects, relabelRegions, type World } from "./world.ts";

export const BAKE_VERSION = 6;
const LIFT_STEPS = 64;
type Baked = { v: number; seed: number; w: number; h: number; tiles: string; region: string; lift: string; raise: string; base: string; data: Pick<World, "under" | "labels" | "objects" | "spawns" | "places" | "buildings" | "floors" | "ramparts"> };

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromBase64 = (text: string) => { const binary = atob(text), bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; };

/** The world as one string (for the build). */
const bakeSteps = (values: Float32Array, what: string) => {
  const steps = new Uint16Array(values.length);
  let previous = 0;
  for (let i = 0; i < values.length; i++) {
    if (!(values[i] >= 0 && values[i] < 65535 / LIFT_STEPS)) throw new Error(`bakeWorld: ${what} ${values[i]} at ${i} is out of range`);
    const value = Math.round(values[i] * LIFT_STEPS);
    steps[i] = (value - previous) & 0xffff; previous = value;
  }
  return toBase64(new Uint8Array(steps.buffer));
};
const unbakeSteps = (text: string) => {
  const stepBytes = fromBase64(text), steps = new Uint16Array(stepBytes.buffer, stepBytes.byteOffset, stepBytes.byteLength / 2), values = new Float32Array(steps.length);
  let value = 0;
  for (let i = 0; i < steps.length; i++) { value = (value + steps[i]) & 0xffff; values[i] = value / LIFT_STEPS; }
  return values;
};
export function bakeWorld(world: World, lift: Float32Array, seed: number, raise = new Float32Array(lift.length)): string {
  const baked: Baked = {
    v: BAKE_VERSION, seed, w: W, h: H, tiles: toBase64(world.tiles), region: toBase64(world.region), lift: bakeSteps(lift, "lift"), raise: bakeSteps(raise, "raise"), base: bakeSteps(world.base ?? new Float32Array(lift.length), "base"),
    data: { objects: world.objects, spawns: world.spawns, places: world.places, buildings: world.buildings, floors: world.floors, ramparts: world.ramparts, under: world.under, labels: world.labels },
  };
  return JSON.stringify(baked);
}

/** The world from its bake, or null when the bake is for another version or another size of world. */
export function unbakeWorld(text: string): World | null {
  const baked = JSON.parse(text) as Baked;
  if (baked.v !== BAKE_VERSION || baked.w !== W || baked.h !== H) return null;
  const tiles = fromBase64(baked.tiles), region = fromBase64(baked.region), lift = unbakeSteps(baked.lift), raise = unbakeSteps(baked.raise), base = unbakeSteps(baked.base);
  const { objects, spawns, places, buildings, floors, ramparts, under, labels } = baked.data;
  relabelRegions(labels ?? {});
  return { tiles, region, objects, objectAt: indexObjects(objects), spawns, places, heights: buildHeights(tiles, baked.seed, lift, raise, base, buildings), buildings, buildingAt: indexBuildings(buildings), floors, ramparts, lift, raise, base, under: under ?? [], labels: labels ?? {} };
}
