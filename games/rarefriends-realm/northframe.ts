/**
 * The world grew north (A Place to the North): everything before it is generated in a frame NORTH_DY rows shorter at the
 * top (and as much shorter at the top of the underground), and moved down once it's built. This module is the arithmetic
 * of that move on its own, small enough for the development host's editor to import (world.ts takes its constants from
 * here, and checks them against its own).
 */
export const NORTH_DY = 360;
/** The first underground row of the frame (world.ts: GEN_H + SOUTH_DY). */
export const FRAME_UNDER_Y = 1000;
/** A row of the frame in the grown world: everything above the underground moves NORTH_DY down, the underground twice that. */
export const northShift = (y: number) => y < FRAME_UNDER_Y ? y + NORTH_DY : y + 2 * NORTH_DY;
/** The inverse: a row of the grown world in the frame (the north's own rows have none: they come back negative). */
export const northUnshift = (y: number) => y < FRAME_UNDER_Y + NORTH_DY ? y - NORTH_DY : y - 2 * NORTH_DY;

type Framed = { frame?: 2; ops: readonly unknown[] };
/**
 * An overlay in the grown world. Overlays written before the north (no `frame`) have every point (x, y; x0, y0 to x1,
 * y1; a ladder's `to`) moved down with the world; one already marked `frame: 2` comes back as it is. (Strip coordinates
 * from before the dungeons settled are world.ts's movedOverlay's business: the editor never wrote any.)
 */
export function northOverlay<O extends Framed>(overlay: O): O & { frame: 2 } {
  if (overlay.frame === 2) return overlay as O & { frame: 2 };
  const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  const ops = overlay.ops.map(raw => {
    if (!raw || typeof raw !== "object") return raw;
    const op = { ...(raw as Record<string, unknown>) };
    if (num(op.y)) op.y = northShift(op.y);
    if (num(op.y0) && num(op.y1)) { op.y0 = northShift(op.y0); op.y1 = northShift(op.y1); }
    if (op.to && typeof op.to === "object" && num((op.to as Record<string, unknown>).y)) op.to = { ...(op.to as Record<string, unknown>), y: northShift((op.to as Record<string, unknown>).y as number) };
    return op;
  });
  return { ...overlay, ops, frame: 2 };
}
