/**
 * Cloth patterns for capes: which parts of a cape are in its second colour. Shared by the item icons and the capes worn
 * on Friends, so a cape looks the same in your pack and on your back. `u` runs 0–1 across the cape, `v` 0–1 down it.
 */
export type ClothPattern = "stripes" | "halves" | "chevron" | "quartered" | "border" | "stars" | "cross" | "mantle" | "mantle_t";
/** The patterns the tailors sew. Mastery capes have their own ("mantle": a pointed yoke over the shoulders; "mantle_t" is the trimmed one). */
export const CLOTH_PATTERNS: readonly ClothPattern[] = ["stripes", "halves", "chevron", "quartered", "border", "stars", "cross"];
export const isPattern = (kind: string | undefined): kind is ClothPattern => !!kind && ((CLOTH_PATTERNS as readonly string[]).includes(kind) || kind === "mantle" || kind === "mantle_t");

/** Whether the point (u, v) of a cape (fine pixel x, y, for the scattered stars) is in the pattern's colour. */
export function inPattern(pattern: ClothPattern, u: number, v: number, x: number, y: number) {
  switch (pattern) {
    case "stripes": return Math.floor(u * 5) % 2 === 1;
    case "halves": return u >= 0.5;
    case "chevron": { const c = 0.22 + Math.abs(u - 0.5) * 0.7; return v >= c && v < c + 0.2; }
    case "quartered": return (u < 0.5) !== (v < 0.45);
    case "border": return u < 0.14 || u > 0.86 || v > 0.86;
    case "stars": return v > 0.08 && ((x * 7 + y * 13) % 23 === 0 || (x * 5 + y * 3) % 31 === 0);
    case "cross": return Math.abs(u - 0.5) < 0.1 || Math.abs(v - 0.34) < 0.08;
    // A yoke over the shoulders coming to a point at the middle of the back, and a band above the hem.
    case "mantle": case "mantle_t": return v < 0.13 + (0.5 - Math.abs(u - 0.5)) * 0.34 || (v > 0.8 && v < 0.88);
  }
}
