/**
 * Overlays promoted from the development world into the public game (overlay.ts): each a module beside this one
 * (written by scripts/dev-promote.mjs), listed here in the order they apply (after everything the generator makes).
 * devworld.ts is the development world as deployed from the dashboard's Deploy button (cloud/src/dev.ts commits it):
 * like any change to main, it reaches players only once CI's checks pass (the engine test "Deployed world" among them).
 */
import type { Overlay } from "../overlay.ts";
import devworld from "./devworld.ts";

export const OVERLAYS: readonly Overlay[] = [devworld];
