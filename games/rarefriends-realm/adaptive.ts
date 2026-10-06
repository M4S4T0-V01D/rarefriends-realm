/**
 * Adaptive resolution on High. High draws at up to HIGH_SCALE canvas pixels per CSS pixel on a high-DPI screen, and
 * every full-screen pass (the light, the haze) scales with the pixel count: on a machine that can't keep up, High
 * drops to one pixel per CSS pixel (about half the pixels at 1.5×) before anything looks different, and comes back
 * up when there's plenty of headroom (at most twice: a machine that keeps falling back stays at 1×).
 */
export const HIGH_SCALE = 1.5;
/** Frames slower than this (ms, about 48 fps) are too slow; faster than QUICK_MS with a cheap draw is headroom. */
const SLOW_MS = 21, QUICK_MS = 17.6, CHEAP_DRAW_MS = 7;
export type Adaptive = { cap: number; slow: number; quick: number; drops: number; held: number };
export function newAdaptive(): Adaptive { return { cap: HIGH_SCALE, slow: 0, quick: 0, drops: 0, held: 0 }; }
/**
 * Called about once a second with the smoothed frame interval and draw cost (ms) and the screen's pixel ratio. Returns
 * the new cap on canvas pixels per CSS pixel when it changes, or null.
 */
export function adapt(state: Adaptive, interval: number, drawMs: number, dpr: number): number | null {
  if (dpr <= 1) return null;
  // After a change, the averages need a few seconds to settle at the new size.
  if (state.held > 0) { state.held--; return null; }
  if (state.cap > 1) {
    state.slow = interval > SLOW_MS ? state.slow + 1 : 0;
    if (state.slow >= 3) { state.cap = 1; state.slow = 0; state.drops++; state.held = 5; return 1; }
  } else if (state.drops < 2) {
    state.quick = interval < QUICK_MS && drawMs < CHEAP_DRAW_MS ? state.quick + 1 : 0;
    if (state.quick >= 15) { state.cap = HIGH_SCALE; state.quick = 0; state.held = 5; return HIGH_SCALE; }
  }
  return null;
}
