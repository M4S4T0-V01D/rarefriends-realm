/**
 * Overlays promoted from the development world into the public game (overlay.ts): each a JSON file beside this one,
 * listed here in the order they apply (after everything the generator makes). Promoting content is a commit of one of
 * these files, reviewed like any other change and reverted the same way; nothing reaches players any other way.
 */
import type { Overlay } from "../overlay.ts";

export const OVERLAYS: readonly Overlay[] = [];
