/**
 * Return of Raria: the adventurer card's new looks. Backgrounds and backdrops for the far west and every Order, and
 * layouts that change the whole page: where the portrait and skills sit (one of the base geometries), how the skill
 * cells are drawn, and a structure painted under the content and ornaments painted over it. The Orders' and factions'
 * looks are locked in cardstyle.ts until you've met their leader in the world.
 */
import { ORDERS } from "./knights.ts";

type Ctx = CanvasRenderingContext2D;
const W = 1200, H = 675, INK = "#161616";
/** The base geometry each new layout borrows (portrait, skills, header). */
export const LAYOUT_GEOMETRY: Record<string, "classic" | "ledger" | "poster" | "centre" | "banner"> = {
  minimal: "classic", ancient: "ledger", brutalist: "poster", facet: "centre", folio: "ledger", prism: "classic", greenwood: "poster", forge: "classic", vespers: "centre", workshop: "ledger", edict: "classic", garrison: "poster",
};
/** How each layout draws its skill cells (one of the skills-panel styles), overriding the player's pick. */
export const LAYOUT_SKILLS: Record<string, string> = {
  minimal: "outline", ancient: "soft", brutalist: "dark", facet: "gilded", folio: "stripes", prism: "pills", greenwood: "soft", forge: "dark", vespers: "pills", workshop: "boxes", edict: "boxes", garrison: "stripes",
};
/** Whether a layout's ground is dark (light lettering), when it paints its own. */
export const LAYOUT_DARK: Record<string, boolean> = { brutalist: true, forge: true, vespers: true, edict: true, prism: true, workshop: false, folio: false, ancient: false, facet: true, minimal: false, greenwood: true, garrison: true };

const seeded = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const dots = (ctx: Ctx, n: number, seed: number, color: string, size: number, x0 = 0, y0 = 0, w = W, h = H) => { const r = seeded(seed); ctx.fillStyle = color; for (let i = 0; i < n; i++) { const s = size * (0.5 + r()); ctx.fillRect(x0 + r() * w, y0 + r() * h, s, s); } };
/** The closed eye of the Wise Friend: an almond with a lid line and lashes down. */
function closedEye(ctx: Ctx, x: number, y: number, r: number, color: string, width = 4) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y - r * 0.7, x + r, y); ctx.quadraticCurveTo(x, y + r * 0.7, x - r, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - r * 0.8, y + r * 0.05); ctx.quadraticCurveTo(x, y + r * 0.45, x + r * 0.8, y + r * 0.05); ctx.stroke();
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.3, y + r * 0.3); ctx.lineTo(x + i * r * 0.35, y + r * 0.55); ctx.stroke(); }
  ctx.restore();
}
/** FFF in blocky brass letters. */
function fffLetters(ctx: Ctx, x: number, y: number, size: number, color: string) {
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) { const lx = x + i * size * 0.8; ctx.fillRect(lx, y, size * 0.18, size); ctx.fillRect(lx, y, size * 0.6, size * 0.18); ctx.fillRect(lx, y + size * 0.42, size * 0.45, size * 0.16); }
  ctx.restore();
}
function gear(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? r : r * 1.22; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function crown(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.5); ctx.lineTo(x - s, y - s * 0.4); ctx.lineTo(x - s * 0.5, y); ctx.lineTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.5, y); ctx.lineTo(x + s, y - s * 0.4); ctx.lineTo(x + s, y + s * 0.5); ctx.closePath(); ctx.fill(); ctx.restore();
}

/** New card backgrounds. Returns whether the lettering should go light, or null if this isn't one of them. */
export function paintNewBackground(ctx: Ctx, bg: string): boolean | null {
  switch (bg) {
    case "stone": { ctx.fillStyle = "#a9a59e"; ctx.fillRect(0, 0, W, H); dots(ctx, 1400, 31, "rgba(60,58,54,0.18)", 3); ctx.strokeStyle = "rgba(60,58,54,0.35)"; ctx.lineWidth = 2;
      const r = seeded(7); for (let i = 0; i < 9; i++) { ctx.beginPath(); let x = r() * W, y = r() * H; ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 140; y += r() * 60; ctx.lineTo(x, y); } ctx.stroke(); } return false; }
    case "brutal": ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#2a2a2a"; for (let i = 0; i < 6; i++) ctx.fillRect(i * 220 - 40, (i % 2) * 120, 180, H); ctx.fillStyle = "#efede7"; ctx.fillRect(0, 590, W, 6); return true;
    case "glyphs": { ctx.fillStyle = "#231a33"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(198,190,212,0.25)"; ctx.lineWidth = 2;
      for (const [cx, cy, rr] of [[200, 160, 140], [1000, 520, 180], [640, 340, 300]] as const) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, rr * 0.8, 0, Math.PI * 2); ctx.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.strokeRect(cx + Math.cos(a) * rr * 0.9 - 5, cy + Math.sin(a) * rr * 0.9 - 5, 10, 10); } }
      dots(ctx, 120, 41, "rgba(200,180,255,0.6)", 2); return true; }
    case "copper": { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#b87333"); g.addColorStop(1, "#7a4a24"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      dots(ctx, 300, 51, "rgba(79,165,138,0.55)", 6); for (const [x, y, r] of [[1080, 100, 60], [120, 560, 44], [980, 600, 30]] as const) gear(ctx, x, y, r, "rgba(29,79,66,0.4)"); return true; }
    case "violet": { const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 760); g.addColorStop(0, "#4a3560"); g.addColorStop(1, "#1e1629"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.12; closedEye(ctx, W / 2, H / 2 - 20, 300, "#d8d6e4", 14); ctx.globalAlpha = 1; dots(ctx, 50, 61, "rgba(216,214,228,0.5)", 2); return true; }
    case "crimson": ctx.fillStyle = "#6a2422"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "rgba(226,196,106,0.18)"; for (let x = 0; x < W; x += 120) crown(ctx, x + 60, 80 + (x / 120 % 2) * 40, 22, "rgba(226,196,106,0.18)"); return true;
    default: {
      const order = ({ facets: "diamond", pages: "ink", prism: "sol", greenwood: "hood", forge: "ember", vespers: "dusk" } as Record<string, keyof typeof ORDERS>)[bg];
      if (!order) return null;
      const o = ORDERS[order];
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.dark); g.addColorStop(1, order === "dusk" ? "#0b0810" : "#1b1b1b"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (order === "diamond") { ctx.strokeStyle = "rgba(236,240,241,0.12)"; ctx.lineWidth = 2; for (let x = -H; x < W + H; x += 70) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + H, 0); ctx.lineTo(x, H); ctx.stroke(); } }
      if (order === "ink") { ctx.fillStyle = "#e6dbff"; ctx.globalAlpha = 0.12; for (let y = 40; y < H; y += 28) ctx.fillRect(60, y, W - 120 - ((y * 37) % 300), 3); ctx.globalAlpha = 1; dots(ctx, 30, 71, "rgba(20,10,40,0.6)", 18); }
      if (order === "sol") { const rays = ["#ff5f5f", "#ffb347", "#f7f06d", "#14f195", "#4fc3f7", "#9945ff", "#ff7ad9"]; ctx.globalAlpha = 0.22; for (let i = 0; i < 28; i++) { ctx.fillStyle = rays[i % rays.length]; ctx.beginPath(); ctx.moveTo(W / 2, H + 80); const a = Math.PI + i / 28 * Math.PI; ctx.lineTo(W / 2 + Math.cos(a) * 1400, H + 80 + Math.sin(a) * 1400); ctx.lineTo(W / 2 + Math.cos(a + 0.06) * 1400, H + 80 + Math.sin(a + 0.06) * 1400); ctx.fill(); } ctx.globalAlpha = 1; }
      if (order === "hood") { ctx.fillStyle = "rgba(204,255,0,0.12)"; const r = seeded(81); for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 18, 8, r() * Math.PI, 0, Math.PI * 2); ctx.fill(); } }
      if (order === "ember") { dots(ctx, 220, 91, "#ff6a2a", 4); dots(ctx, 80, 92, "#ffd27a", 3); ctx.fillStyle = "rgba(255,106,42,0.18)"; ctx.fillRect(0, H - 90, W, 90); }
      if (order === "dusk") { ctx.fillStyle = "rgba(138,106,176,0.14)"; for (let x = 0; x < W; x += 160) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 80, 260, x + 30, H); ctx.lineTo(x + 70, H); ctx.quadraticCurveTo(x + 120, 260, x + 60, 0); ctx.fill(); } dots(ctx, 40, 93, "rgba(255,236,200,0.7)", 3); }
      return true;
    }
  }
}
/**
 * The Dawn backdrop: Dawnhold at sunrise, a world rather than a wash of colour. Night going out of the top of the sky,
 * the last stars, the Frostpeak range pale violet with snow catching the first light, the sun half over the horizon with
 * its glow and long rays, Dawnhold's keep, towers and chapel spire on their ridge with the Order's banners and lit
 * windows, mist in the valley, nearer hills rimmed in gold, the pilgrims' road winding up, pines at the edges, birds.
 */
function paintDawn(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const X = (f: number) => x + w * f, Y = (f: number) => y + h * f, horizon = 0.6;
  const sky = ctx.createLinearGradient(0, y, 0, Y(horizon)); sky.addColorStop(0, "#2a2a52"); sky.addColorStop(0.35, "#7a5a8a"); sky.addColorStop(0.7, "#e8a07a"); sky.addColorStop(1, "#f8d890");
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  dots(ctx, 26, 211, "rgba(255,255,255,0.75)", 2, x, y, w, h * 0.22);
  // The sun, half over the horizon, its glow and long rays.
  const sunX = X(0.62), sunY = Y(horizon - 0.02), glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, w * 0.6);
  glow.addColorStop(0, "rgba(255,244,200,0.95)"); glow.addColorStop(0.15, "rgba(255,214,140,0.6)"); glow.addColorStop(1, "rgba(255,180,120,0)"); ctx.fillStyle = glow; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = "#fff4c8";
  for (let i = 0; i < 9; i++) { const a = Math.PI + 0.2 + i * 0.33; ctx.beginPath(); ctx.moveTo(sunX, sunY); ctx.lineTo(sunX + Math.cos(a - 0.05) * w * 1.3, sunY + Math.sin(a - 0.05) * w * 1.3); ctx.lineTo(sunX + Math.cos(a + 0.05) * w * 1.3, sunY + Math.sin(a + 0.05) * w * 1.3); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = "#fff6d8"; ctx.beginPath(); ctx.arc(sunX, sunY, w * 0.07, Math.PI, 0); ctx.fill();
  // Far mountains: pale violet, snow on the peaks catching the light from the sun's side.
  const range = (base: number, peaks: readonly [number, number][], color: string, snow: string | null) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, Y(base));
    for (const [fx, fy] of peaks) ctx.lineTo(X(fx), Y(fy));
    ctx.lineTo(x + w, Y(base)); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.fill();
    if (snow) { ctx.fillStyle = snow; for (let i = 1; i < peaks.length - 1; i++) { const [fx, fy] = peaks[i], [px, py] = peaks[i - 1], [nx, ny] = peaks[i + 1]; if (fy > peaks.reduce((m, p) => Math.min(m, p[1]), 1) + 0.08) continue;
      ctx.beginPath(); ctx.moveTo(X(fx), Y(fy)); ctx.lineTo(X(fx + (nx - fx) * 0.3), Y(fy + (ny - fy) * 0.3)); ctx.lineTo(X(fx), Y(fy + 0.05)); ctx.lineTo(X(fx + (px - fx) * 0.25), Y(fy + (py - fy) * 0.25)); ctx.fill(); } }
  };
  range(0.56, [[0, 0.5], [0.08, 0.36], [0.16, 0.44], [0.26, 0.3], [0.36, 0.42], [0.44, 0.38], [0.52, 0.47], [0.7, 0.4], [0.8, 0.33], [0.9, 0.42], [1, 0.38]], "#9a86b0", "#f4e6f0");
  range(0.6, [[0, 0.55], [0.12, 0.47], [0.24, 0.52], [0.34, 0.46], [0.5, 0.53], [0.66, 0.5], [0.78, 0.45], [0.9, 0.51], [1, 0.48]], "#7a6890", null);
  // Mist in the valley.
  for (let i = 0; i < 3; i++) { const m = ctx.createLinearGradient(0, Y(0.56 + i * 0.04), 0, Y(0.62 + i * 0.04)); m.addColorStop(0, "rgba(255,236,220,0)"); m.addColorStop(0.5, `rgba(255,236,220,${0.35 - i * 0.08})`); m.addColorStop(1, "rgba(255,236,220,0)"); ctx.fillStyle = m; ctx.fillRect(x, Y(0.56 + i * 0.04), w, h * 0.06); }
  // Dawnhold's ridge, and the castle on it: curtain wall, keep, two round towers, the chapel and its spire, banners, lit windows.
  ctx.fillStyle = "#4a5a52"; ctx.beginPath(); ctx.moveTo(x, Y(0.7)); ctx.quadraticCurveTo(X(0.2), Y(0.6), X(0.4), Y(0.6)); ctx.quadraticCurveTo(X(0.6), Y(0.6), X(0.75), Y(0.66)); ctx.quadraticCurveTo(X(0.9), Y(0.71), x + w, Y(0.68)); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  ctx.strokeStyle = "rgba(255,214,140,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0.32), Y(0.605)); ctx.quadraticCurveTo(X(0.55), Y(0.595), X(0.72), Y(0.65)); ctx.stroke();
  const stone = "#3a3550", lit = "#ffd27a", base = Y(0.605);
  ctx.fillStyle = stone; ctx.fillRect(X(0.24), base - h * 0.06, w * 0.3, h * 0.06);
  for (let i = 0; i < 9; i++) ctx.fillRect(X(0.24) + i * w * 0.034, base - h * 0.075, w * 0.018, h * 0.016);
  ctx.fillRect(X(0.34), base - h * 0.16, w * 0.09, h * 0.16); for (let i = 0; i < 4; i++) ctx.fillRect(X(0.34) + i * w * 0.024, base - h * 0.175, w * 0.014, h * 0.016);
  for (const fx of [0.24, 0.52]) { ctx.fillRect(X(fx) - w * 0.018, base - h * 0.12, w * 0.036, h * 0.12); ctx.beginPath(); ctx.moveTo(X(fx) - w * 0.024, base - h * 0.12); ctx.lineTo(X(fx), base - h * 0.17); ctx.lineTo(X(fx) + w * 0.024, base - h * 0.12); ctx.fill(); }
  ctx.fillRect(X(0.45), base - h * 0.1, w * 0.05, h * 0.1); ctx.beginPath(); ctx.moveTo(X(0.455), base - h * 0.1); ctx.lineTo(X(0.475), base - h * 0.2); ctx.lineTo(X(0.495), base - h * 0.1); ctx.fill();
  ctx.strokeStyle = stone; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(0.475), base - h * 0.2); ctx.lineTo(X(0.475), base - h * 0.23); ctx.moveTo(X(0.468), base - h * 0.217); ctx.lineTo(X(0.482), base - h * 0.217); ctx.stroke();
  for (const [fx, fy] of [[0.36, 0.1], [0.4, 0.1], [0.38, 0.05], [0.24, 0.07], [0.52, 0.07], [0.47, 0.05], [0.29, 0.03], [0.32, 0.03]] as const) { ctx.fillStyle = lit; ctx.fillRect(X(fx), base - h * fy, Math.max(2, w * 0.008), Math.max(3, h * 0.014)); }
  for (const fx of [0.385, 0.24, 0.52]) { ctx.strokeStyle = stone; ctx.lineWidth = 1.5; const top = fx === 0.385 ? base - h * 0.175 : base - h * 0.17; ctx.beginPath(); ctx.moveTo(X(fx), top); ctx.lineTo(X(fx), top - h * 0.05); ctx.stroke();
    ctx.fillStyle = "#efe9d8"; ctx.beginPath(); ctx.moveTo(X(fx), top - h * 0.05); ctx.lineTo(X(fx) + w * 0.035, top - h * 0.04); ctx.lineTo(X(fx), top - h * 0.03); ctx.fill(); ctx.fillStyle = "#e2c46a"; ctx.beginPath(); ctx.arc(X(fx) + w * 0.012, top - h * 0.04, 1.6, 0, Math.PI * 2); ctx.fill(); }
  // Nearer hills, rimmed in gold, and the pilgrims' road winding up to the gate.
  ctx.fillStyle = "#56704a"; ctx.beginPath(); ctx.moveTo(x, Y(0.78)); ctx.quadraticCurveTo(X(0.3), Y(0.7), X(0.55), Y(0.76)); ctx.quadraticCurveTo(X(0.8), Y(0.82), x + w, Y(0.74)); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  ctx.strokeStyle = "rgba(255,214,140,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, Y(0.78)); ctx.quadraticCurveTo(X(0.3), Y(0.7), X(0.55), Y(0.76)); ctx.stroke();
  ctx.fillStyle = "#3e5636"; ctx.beginPath(); ctx.moveTo(x, Y(0.88)); ctx.quadraticCurveTo(X(0.5), Y(0.8), x + w, Y(0.9)); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  ctx.strokeStyle = "#d8c49a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(0.42), y + h); ctx.bezierCurveTo(X(0.6), Y(0.88), X(0.28), Y(0.78), X(0.38), base); ctx.stroke();
  // Pines at the edges, birds over the valley.
  const pine = (fx: number, fy: number, s: number) => { ctx.fillStyle = "#24331f"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(X(fx), Y(fy) - s * (1.2 - i * 0.35)); ctx.lineTo(X(fx) + s * (0.35 + i * 0.12), Y(fy) - s * (0.55 - i * 0.3)); ctx.lineTo(X(fx) - s * (0.35 + i * 0.12), Y(fy) - s * (0.55 - i * 0.3)); ctx.fill(); } ctx.fillRect(X(fx) - s * 0.05, Y(fy) - s * 0.25, s * 0.1, s * 0.25); };
  for (const [fx, fy, s] of [[0.04, 0.96, 70], [0.12, 1, 90], [0.9, 0.98, 80], [0.97, 0.94, 60], [0.82, 1.02, 70]] as const) pine(fx, fy, s * w / 400);
  ctx.strokeStyle = "#3a3550"; ctx.lineWidth = 1.5; for (const [fx, fy] of [[0.7, 0.2], [0.74, 0.17], [0.78, 0.22], [0.2, 0.26]] as const) { ctx.beginPath(); ctx.moveTo(X(fx) - 5, Y(fy)); ctx.quadraticCurveTo(X(fx) - 2, Y(fy) - 3, X(fx), Y(fy)); ctx.quadraticCurveTo(X(fx) + 2, Y(fy) - 3, X(fx) + 5, Y(fy)); ctx.stroke(); }
  // A low warm haze over the whole, so the Friend standing in front reads against it.
  const haze = ctx.createLinearGradient(0, Y(0.7), 0, y + h); haze.addColorStop(0, "rgba(255,226,170,0)"); haze.addColorStop(1, "rgba(255,226,170,0.18)"); ctx.fillStyle = haze; ctx.fillRect(x, Y(0.7), w, h * 0.3);
}
/** New backdrops behind your Friend. Returns true if drawn. */
export function paintNewFrame(ctx: Ctx, frame: string, x: number, y: number, w: number, h: number): boolean {
  const order = ({ diamond_hall: "diamond", ink_hall: "ink", sol_hall: "sol", hood_hall: "hood", ember_hall: "ember", dusk_hall: "dusk" } as Record<string, keyof typeof ORDERS>)[frame];
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (frame === "dawn") paintDawn(ctx, x, y, w, h);
  else if (frame === "palace") {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#3b2a52"); g.addColorStop(1, "#1e1629"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#d8d6e4"; for (const px of [0.12, 0.88]) { ctx.fillRect(x + w * px - 14, y + h * 0.12, 28, h); ctx.fillRect(x + w * px - 22, y + h * 0.1, 44, 12); }
    ctx.fillStyle = "#c9a84a"; ctx.fillRect(x + w * 0.3, y + h * 0.82, w * 0.4, 8); closedEye(ctx, x + w / 2, y + h * 0.18, w * 0.16, "#c9a84a", 5);
    ctx.fillStyle = "rgba(74,43,58,0.9)"; ctx.fillRect(x + w * 0.42, y + h * 0.84, w * 0.16, h * 0.16);
  } else if (frame === "fortress") {
    ctx.fillStyle = "#2f7d68"; ctx.fillRect(x, y, w, h); ctx.fillStyle = "#1d4f42"; ctx.fillRect(x, y + h * 0.75, w, h * 0.25);
    for (const [fx, fy, r] of [[0.15, 0.2, 26], [0.85, 0.3, 34], [0.2, 0.7, 20], [0.82, 0.78, 24]] as const) gear(ctx, x + w * fx, y + h * fy, r, "rgba(184,115,51,0.55)");
    ctx.strokeStyle = "#b87333"; ctx.lineWidth = 3; for (const fx of [0.3, 0.5, 0.7]) { ctx.beginPath(); ctx.moveTo(x + w * fx, y); ctx.lineTo(x + w * fx, y + h * 0.12); ctx.stroke(); ctx.fillStyle = "#cfd3d8"; ctx.fillRect(x + w * fx - 3, y + h * 0.12, 6, h * 0.18); }
    ctx.strokeStyle = "rgba(207,110,110,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.05, y + h * 0.4); ctx.lineTo(x + w * 0.3, y + h * 0.55); ctx.lineTo(x + w * 0.6, y + h * 0.35); ctx.lineTo(x + w * 0.95, y + h * 0.6); ctx.stroke();
    fffLetters(ctx, x + w * 0.36, y + h * 0.86, 26, "#d9a93f");
  } else if (frame === "hollowmere") {
    ctx.fillStyle = "#c8c5be"; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "#a9a59e"; ctx.lineWidth = 2;
    for (let row = 0; row * 24 < h; row++) { ctx.beginPath(); ctx.moveTo(x, y + row * 24); ctx.lineTo(x + w, y + row * 24); ctx.stroke(); for (let col = 0; col * 48 < w; col++) { const bx = x + col * 48 + (row % 2) * 24; ctx.beginPath(); ctx.moveTo(bx, y + row * 24); ctx.lineTo(bx, y + row * 24 + 24); ctx.stroke(); } }
    for (const fx of [0.18, 0.82]) { ctx.fillStyle = "#8a2f2b"; ctx.fillRect(x + w * fx - 26, y + 10, 52, h * 0.55); crown(ctx, x + w * fx, y + h * 0.25, 16, "#e2c46a"); }
  } else if (order) {
    const o = ORDERS[order]; ctx.fillStyle = o.dark; ctx.fillRect(x, y, w, h);
    const glow = ctx.createRadialGradient(x + w / 2, y + h * 0.6, 10, x + w / 2, y + h * 0.6, w * 0.7); glow.addColorStop(0, `${o.color}aa`); glow.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = glow; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(x + w * 0.15, y + h * 0.82, w * 0.7, 10); ctx.fillRect(x + w * 0.1, y + h * 0.88, w * 0.8, h);
    for (const fx of [0.1, 0.9]) { ctx.fillStyle = o.color; ctx.beginPath(); ctx.moveTo(x + w * fx - 18, y); ctx.lineTo(x + w * fx + 18, y); ctx.lineTo(x + w * fx + 18, y + h * 0.5); ctx.lineTo(x + w * fx, y + h * 0.44); ctx.lineTo(x + w * fx - 18, y + h * 0.5); ctx.fill(); ctx.fillStyle = o.accent; ctx.fillRect(x + w * fx - 6, y + h * 0.15, 12, 12); }
    if (order === "ember") { dots(ctx, 50, 97, "#ffd27a", 4, x, y, w, h); }
    if (order === "dusk") { for (const fx of [0.3, 0.7]) { ctx.fillStyle = "#f4ecc8"; ctx.fillRect(x + w * fx - 3, y + h * 0.74, 6, 14); ctx.fillStyle = "rgba(255,236,160,0.35)"; ctx.beginPath(); ctx.arc(x + w * fx, y + h * 0.73, 14, 0, Math.PI * 2); ctx.fill(); } closedEye(ctx, x + w / 2, y + h * 0.16, w * 0.12, o.accent, 4); }
  } else { ctx.restore(); return false; }
  ctx.restore(); return true;
}
/** A layout's structure under the content (big shapes the portrait and skills sit on). */
export function layoutUnder(ctx: Ctx, layout: string) {
  switch (layout) {
    case "minimal": ctx.fillStyle = "#f7f5f0"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "#161616"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(500, 40); ctx.lineTo(500, 590); ctx.stroke(); return;
    case "ancient": { ctx.fillStyle = "#b9b5ae"; ctx.fillRect(24, 24, W - 48, H - 120); ctx.fillStyle = "#8f8a83"; ctx.fillRect(24, H - 104, W - 48, 8);
      ctx.strokeStyle = "#8f8a83"; ctx.lineWidth = 3; ctx.strokeRect(40, 40, W - 80, H - 152); dots(ctx, 700, 101, "rgba(60,58,54,0.16)", 3, 24, 24, W - 48, H - 120);
      ctx.fillStyle = "#efede7"; ctx.beginPath(); ctx.moveTo(W - 24, 24); ctx.lineTo(W - 90, 24); ctx.lineTo(W - 24, 110); ctx.fill(); return; }
    case "brutalist": ctx.fillStyle = "#1b1b1b"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#efede7"; ctx.fillRect(590, 0, 6, H - 72); ctx.fillStyle = "#2a2a2a"; ctx.fillRect(610, 120, 560, 470); return;
    case "forge": { ctx.fillStyle = "#2d2622"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#3e3530"; for (let y = 0; y < H; y += 110) for (let x = (y / 110 % 2) * 100; x < W; x += 200) { ctx.fillRect(x + 4, y + 4, 192, 102); }
      ctx.fillStyle = "#6b5b4d"; for (let y = 0; y < H; y += 110) for (let x = (y / 110 % 2) * 100; x < W; x += 200) for (const [dx, dy] of [[12, 12], [184, 12], [12, 94], [184, 94]] as const) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 4, 0, Math.PI * 2); ctx.fill(); }
      dots(ctx, 120, 111, "#ff6a2a", 4); return; }
    case "vespers": { ctx.fillStyle = "#16111f"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#2a2238"; ctx.beginPath(); ctx.moveTo(360, H); ctx.lineTo(360, 160); ctx.quadraticCurveTo(600, -40, 840, 160); ctx.lineTo(840, H); ctx.fill();
      for (const x of [40, 1100]) { ctx.fillStyle = "#3b2a52"; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 40, 300, x + 10, H); ctx.lineTo(x + 60, H); ctx.quadraticCurveTo(x + 90, 300, x + 60, 0); ctx.fill(); } return; }
    case "workshop": { ctx.fillStyle = "#b87333"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#9a5f2a"; for (let y = 0; y < H; y += 90) ctx.fillRect(0, y, W, 4);
      for (const [x, y, r] of [[600, 610, 70], [40, 120, 50], [1160, 620, 60]] as const) gear(ctx, x, y, r, "rgba(29,79,66,0.5)"); return; }
    case "edict": { ctx.fillStyle = "#2a2238"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#3b2a52"; for (let y = 0; y < H; y += 56) ctx.fillRect(0, y, W, 28); ctx.fillStyle = "#d8d6e4"; ctx.fillRect(0, 0, W, 8); ctx.fillRect(0, H - 80, W, 8); return; }
    case "garrison": { ctx.fillStyle = "#3a3f4a"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2;
      for (let row = 0; row * 40 < H; row++) for (let col = 0; col * 80 < W + 80; col++) ctx.strokeRect(col * 80 - (row % 2) * 40, row * 40, 80, 40);
      for (let x = 0; x < W; x += 60) { ctx.fillStyle = "#3a3f4a"; ctx.fillRect(x, 0, 36, 20); } return; }
    case "prism": { const rays = ["#ff5f5f", "#ffb347", "#f7f06d", "#14f195", "#4fc3f7", "#9945ff", "#ff7ad9"]; ctx.fillStyle = "#0a2a1e"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(600, 340); ctx.rotate(-0.25 + i * 0.07); ctx.fillStyle = `${rays[i]}33`; ctx.fillRect(-700, -40 + i * 12, 1400, 30); ctx.restore(); } return; }
    case "greenwood": { ctx.fillStyle = "#1e2a12"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#2e3d18"; for (let x = -40; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 45, 60 + (x * 7) % 120); ctx.lineTo(x + 90, H); ctx.fill(); }
      ctx.fillStyle = "rgba(204,255,0,0.25)"; ctx.beginPath(); ctx.moveTo(1040, 40); ctx.lineTo(1130, 150); ctx.lineTo(1130, 300); ctx.lineTo(950, 300); ctx.lineTo(950, 150); ctx.fill(); return; }
    case "folio": { ctx.fillStyle = "#efe6d0"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(107,47,191,0.18)"; ctx.lineWidth = 1; for (let y = 60; y < H - 80; y += 26) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(107,47,191,0.4)"; ctx.beginPath(); ctx.moveTo(700, 30); ctx.lineTo(700, H - 80); ctx.stroke(); return; }
    case "facet": { ctx.fillStyle = "#1c2448"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(98,126,234,0.35)"; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(600, 40 + i * 20); ctx.lineTo(1000 - i * 30, 340); ctx.lineTo(600, 640 - i * 20); ctx.lineTo(200 + i * 30, 340); ctx.closePath(); ctx.stroke(); } return; }
    default: return;
  }
}
/** A layout's ornaments over the content (corners, seals, letters, borders). */
export function layoutOver(ctx: Ctx, layout: string) {
  switch (layout) {
    case "facet": { ctx.fillStyle = "#e2c46a"; for (const [x, y, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H - 72, 1, -1], [W, H - 72, -1, -1]] as const) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sx * 90, y); ctx.lineTo(x + sx * 90, y + sy * 14); ctx.lineTo(x + sx * 14, y + sy * 14); ctx.lineTo(x + sx * 14, y + sy * 90); ctx.lineTo(x, y + sy * 90); ctx.fill(); }
      ctx.fillStyle = "#627eea"; ctx.beginPath(); ctx.moveTo(600, 6); ctx.lineTo(618, 26); ctx.lineTo(600, 46); ctx.lineTo(582, 26); ctx.fill(); return; }
    case "folio": { ctx.fillStyle = "#6b2fbf"; ctx.beginPath(); ctx.arc(W - 80, H - 130, 34, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#e6dbff"; ctx.font = "bold 30px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("✒", W - 80, H - 120); ctx.textAlign = "left"; return; }
    case "forge": ctx.strokeStyle = "#6b5b4d"; ctx.lineWidth = 12; ctx.strokeRect(6, 6, W - 12, H - 84); return;
    case "vespers": { closedEye(ctx, 600, 40, 40, "#8a6ab0", 4); for (const x of [380, 820]) { ctx.fillStyle = "#f4ecc8"; ctx.fillRect(x - 4, 520, 8, 40); ctx.fillStyle = "rgba(255,236,160,0.5)"; ctx.beginPath(); ctx.arc(x, 512, 12, 0, Math.PI * 2); ctx.fill(); } return; }
    case "workshop": { fffLetters(ctx, 560, 530, 36, "#1d4f42"); ctx.strokeStyle = "rgba(207,110,110,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 30); ctx.lineTo(300, 60); ctx.lineTo(700, 20); ctx.lineTo(W, 70); ctx.stroke(); return; }
    case "edict": { ctx.fillStyle = "#c9a84a"; ctx.beginPath(); ctx.arc(462, 560, 40, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#8a6a10"; ctx.lineWidth = 3; ctx.stroke(); closedEye(ctx, 462, 560, 24, "#3b2a52", 4); ctx.fillStyle = "#d8d6e4"; ctx.font = "bold 18px ui-monospace, monospace"; ctx.fillText("BY ORDER OF THE CROWN · RRR", 40, H - 92); return; }
    case "garrison": { for (const x of [W - 70, W - 140]) { ctx.fillStyle = "#8a2f2b"; ctx.beginPath(); ctx.moveTo(x - 24, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x + 24, 150); ctx.lineTo(x, 130); ctx.lineTo(x - 24, 150); ctx.fill(); crown(ctx, x, 60, 14, "#e2c46a"); } return; }
    case "ancient": ctx.strokeStyle = "#6d6b67"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, 180); ctx.lineTo(44, 240); ctx.lineTo(30, 300); ctx.lineTo(48, 360); ctx.stroke(); return;
    case "brutalist": ctx.fillStyle = "#efede7"; ctx.fillRect(40, 600 - 30, 520, 6); return;
    case "greenwood": { ctx.fillStyle = "rgba(204,255,0,0.6)"; const r = seeded(121); for (let i = 0; i < 26; i++) { const x = r() < 0.5 ? r() * 60 : W - r() * 60, y = r() * (H - 80); ctx.beginPath(); ctx.ellipse(x, y, 12, 5, r() * Math.PI, 0, Math.PI * 2); ctx.fill(); } return; }
    case "prism": ctx.strokeStyle = "#9945ff"; ctx.lineWidth = 6; ctx.save(); ctx.translate(600, 300); ctx.rotate(-0.02); ctx.strokeRect(-580, -280, 1160, 560); ctx.restore(); return;
    case "minimal": return;
    default: return;
  }
}
