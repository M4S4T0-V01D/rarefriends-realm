/**
 * Dressing the world: what each building's front says it is. A bank (any building with a bank booth inside) is built
 * of pale marble under a hipped slate roof, with columns and a gilded pediment on its front; a shop (any building with
 * a shopkeeper inside) has a striped awning over its door and a sign hanging beside it with what it sells painted on;
 * an inn hangs out a tankard. Builders can set a building's facade themselves (Raria's halls of state are "civic").
 *
 * This runs once on the finished world, the first time it is drawn (render.ts), not while it is generated: it needs to know who sells
 * what, and that lives with the NPCs and shops (content.ts, data.ts), which the world's generation can't import.
 */
import { NPCS } from "./content.ts";
import { SHOPS } from "./data.ts";
import { T, W, type Building, type World } from "./world.ts";

/** A bank's slate roof. */
export const BANK_ROOF = "#3d4a5c";
const INN_NAME = /\b(inn|tavern|kettle|hearth|prayer|lantern|sleepy friend|hound)\b/i;
const dressed = new WeakSet<World>();

/** Give every building its front (once per world). */
export function dressWorld(world: World): World {
  if (dressed.has(world)) return world;
  dressed.add(world);
  // Who keeps shop where.
  const keepers = world.spawns.filter(spawn => spawn.kind === "npc" && NPCS[spawn.id]?.shop);
  const facadeOf = (b: Building): Pick<Building, "facade" | "sign"> | null => {
    const inside = (x: number, y: number) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
    for (let y = b.y0 + 1; y < b.y1; y++) for (let x = b.x0 + 1; x < b.x1; x++) {
      const index = world.objectAt[y * W + x];
      if (index >= 0 && world.objects[index].kind === "bank") return { facade: "bank" };
    }
    const keeper = keepers.find(spawn => inside(spawn.x, spawn.y));
    if (keeper) return { facade: "shop", sign: SHOPS[NPCS[keeper.id].shop!]?.stock[0] };
    if (INN_NAME.test(b.name)) return { facade: "inn" };
    return null;
  };
  for (const b of world.buildings) {
    if (b.facade || b.roof === "none" || b.y0 >= 520) continue;
    const front = facadeOf(b);
    if (!front) continue;
    // A building of parts (an L) wears its front on every part.
    const parts = b.complex?.includes("@") ? world.buildings.filter(o => o.complex === b.complex) : [b];
    for (const part of parts) {
      Object.assign(part, front);
      if (front.facade === "bank") Object.assign(part, { walls: "marble", hip: part.roof === "gable" ? true : part.hip, color: BANK_ROOF });
    }
  }
  return world;
}

/** The doorways in a building's outline (open tiles in its wall), each with the way out. */
export function doorwaysOf(world: World, b: Building): { x: number; y: number; nx: number; ny: number }[] {
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  const open = (x: number, y: number) => { const t = world.tiles[y * W + x]; return t !== T.WALL && t !== T.VOID; };
  for (let x = b.x0 + 1; x < b.x1; x++) { if (open(x, b.y0)) out.push({ x, y: b.y0, nx: 0, ny: -1 }); if (open(x, b.y1)) out.push({ x, y: b.y1, nx: 0, ny: 1 }); }
  for (let y = b.y0 + 1; y < b.y1; y++) { if (open(b.x0, y)) out.push({ x: b.x0, y, nx: -1, ny: 0 }); if (open(b.x1, y)) out.push({ x: b.x1, y, nx: 1, ny: 0 }); }
  // (A doorway into another part of the same building isn't a front door.)
  return out.filter(d => !world.buildings.some(o => o !== b && o.roof !== "none" && d.x + d.nx >= o.x0 && d.x + d.nx <= o.x1 && d.y + d.ny >= o.y0 && d.y + d.ny <= o.y1));
}
