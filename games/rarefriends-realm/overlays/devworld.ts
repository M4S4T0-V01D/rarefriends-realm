/** The development world as deployed from the dashboard's Deploy button (cloud/src/dev.ts writes this file on main; CI checks it and publishes). Listed in index.ts. */
import type { Overlay } from "../overlay.ts";

const overlay: Overlay = { v: 1, frame: 2, name: "Development world", ops: [] };
export default overlay;
