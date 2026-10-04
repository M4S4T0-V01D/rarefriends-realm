/** The shareable adventurer card: your Friend, levels and quests on a 1200 × 675 picture (the X card size), in the style you've chosen. */
import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { FAMILY_NAMES, SKILLS, SKILL_NAMES, WARDROBE, levelForXp, mountDef, type Skill } from "./data.ts";
import { SADDLE, mountArt } from "./mountart.ts";
import { MAX_QUEST_POINTS, questPoints } from "./content.ts";
import { ACHIEVEMENTS, achieved } from "./achievements.ts";
import { combatLevel, totalLevel, type Game } from "./state.ts";
import { friendRows } from "./render.ts";
import { figureArt } from "./wardrobe.ts";
import { DEFAULT_FELLOWSHIP_COLORS, cardStyle, drawBanner, drawEmblem, isDarkColor, type FellowshipArt } from "./cardstyle.ts";
import { titleName } from "./presence.ts";

export const CARD: { readonly width: number; readonly height: number } = { width: 1200, height: 675 };
const INK = "#161616", PAPER = "#efede7", BUTTER = "#e2d7ad", GOLD = "#e2c46a";
const FONTS: Record<string, string> = { mono: "ui-monospace, Menlo, Consolas, monospace", serif: "Georgia, 'Times New Roman', serif", sans: "'Trebuchet MS', 'Segoe UI', Helvetica, sans-serif", display: "Impact, 'Arial Black', 'Franklin Gothic Bold', sans-serif" };
const INKS: Record<string, { dark: string; light: string }> = { ink: { dark: INK, light: PAPER }, navy: { dark: "#1d2a52", light: "#c9d4f2" }, wine: { dark: "#5a1f2e", light: "#efc3cd" }, forest: { dark: "#1f4a2e", light: "#c2e2c7" }, gilt: { dark: "#8a6a10", light: GOLD } };
const FRAMES: Record<string, string> = { rose: "#d8b6b4", sage: "#b4c3ab", sky: "#9fc6f0", sunset: "#f0a050", dawn: "#f6efd6", hollow: "#3b2d4f", starry: "#1d2a52", renown: "#e2c46a" };

export function shareText(game: Game) {
  const player = game.player, who = player.name ? `${player.name} (#${player.friendId})` : `Rare Friend #${player.friendId}`;
  const text = `My ${who} (${FAMILY_NAMES[player.familyId]}) reached total level ${totalLevel(player)} and combat level ${combatLevel(player)} in RareFriends Realm, with ${questPoints(game)}/${MAX_QUEST_POINTS} quest points. ⚔️ @RareFriendsNFT #RareFriends #RareFriendsRealm`;
  return text.length <= 280 ? text : text.slice(0, 277) + "…";
}
/** A seeded speckle for parchment, stars and embers. */
const dots = (ctx: CanvasRenderingContext2D, count: number, seed: number, color: string, size: number, x0 = 0, y0 = 0, w = CARD.width, h = CARD.height) => {
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) { const sz = size * (0.5 + r()); ctx.fillRect(x0 + r() * w, y0 + r() * h, sz, sz); }
};
function paintBackground(ctx: CanvasRenderingContext2D, bg: string): boolean {
  const W = CARD.width, H = CARD.height;
  switch (bg) {
    case "parchment": ctx.fillStyle = "#e8dcb8"; ctx.fillRect(0, 0, W, H); dots(ctx, 900, 11, "rgba(120,90,40,0.12)", 3); return false;
    case "night": { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#141830"); g.addColorStop(1, "#2a2140"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); dots(ctx, 260, 5, "rgba(255,255,255,0.8)", 2.5); dots(ctx, 40, 9, GOLD, 3); return true; }
    case "rose": ctx.fillStyle = "#f1dcdc"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(120,60,70,0.12)"; for (let x = -H; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); } return false;
    case "deadwood": { ctx.fillStyle = "#2c2f2a"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "rgba(22,22,22,0.7)";
      for (let i = 0; i < 26; i++) { const x = 20 + i * 46, h = 120 + ((i * 37) % 90); ctx.fillRect(x, H - h, 6, h); ctx.fillRect(x - 14, H - h + 30, 16, 4); ctx.fillRect(x + 4, H - h + 50, 18, 4); }
      dots(ctx, 60, 3, "rgba(200,220,255,0.35)", 3); return true; }
    case "ashfall": { const g = ctx.createLinearGradient(0, H, 0, 0); g.addColorStop(0, "#5a2a1e"); g.addColorStop(1, "#2a1816"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); dots(ctx, 180, 7, "#f0a050", 3); dots(ctx, 60, 8, "#ffd27a", 2); return true; }
    case "gold": ctx.fillStyle = "#f2e6c0"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(190,150,50,0.35)"; ctx.lineWidth = 6; for (let x = -H; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); } ctx.lineWidth = 1; return false;
    case "void": { ctx.fillStyle = "#0b0b10"; ctx.fillRect(0, 0, W, H); const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 620); g.addColorStop(0, "rgba(138,98,200,0.45)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); dots(ctx, 120, 13, "rgba(200,180,255,0.6)", 2); return true; }
    default: ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = "rgba(22,22,22,0.06)"; ctx.lineWidth = 1;
      for (let x = -H; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H * 2, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H * 2, 0); ctx.stroke(); }
      return false;
  }
}
function paintFrame(ctx: CanvasRenderingContext2D, frame: string, x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = FRAMES[frame] ?? FRAMES.rose; ctx.fillRect(x, y, w, h);
  if (frame === "sunset") { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, "#f6d27a"); g.addColorStop(0.6, "#f0a050"); g.addColorStop(1, "#7a3b5c"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  if (frame === "dawn") { ctx.strokeStyle = "rgba(226,196,106,0.55)"; ctx.lineWidth = 8; for (let a = 0; a < 12; a++) { ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.35); ctx.lineTo(x + w / 2 + Math.cos(a / 12 * Math.PI * 2) * w, y + h * 0.35 + Math.sin(a / 12 * Math.PI * 2) * w); ctx.stroke(); } ctx.lineWidth = 1; }
  if (frame === "hollow") { ctx.strokeStyle = "rgba(138,98,200,0.8)"; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h * 0.45, w * 0.36, w * 0.36, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; }
  if (frame === "starry") dots(ctx, 90, 21, "rgba(255,255,255,0.85)", 3, x, y, w, h);
  if (frame === "renown") { const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 20, x + w / 2, y + h / 2, w * 0.7); g.addColorStop(0, "#fff2c2"); g.addColorStop(1, GOLD); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
  ctx.restore();
}

export function renderCard(game: Game, friend: GenerationSprites | null, fellowship: FellowshipArt | null = null): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = CARD.width; canvas.height = CARD.height;
  const ctx = canvas.getContext("2d")!, player = game.player, style = cardStyle(game), FONT = FONTS[style.font] ?? FONTS.mono;
  let dark = paintBackground(ctx, style.bg);
  if (style.bgColor) { ctx.fillStyle = style.bgColor; ctx.fillRect(0, 0, CARD.width, CARD.height); dark = isDarkColor(style.bgColor); ctx.strokeStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(22,22,22,0.06)"; ctx.lineWidth = 1; for (let x = -CARD.height; x < CARD.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + CARD.height * 2, CARD.height); ctx.stroke(); } }
  const inks = INKS[style.ink] ?? INKS.ink, TEXT = style.inkColor ?? (dark ? inks.light : inks.dark), MUTED = style.inkColor ? `${style.inkColor}b3` : dark ? "rgba(239,237,231,0.7)" : "#6d6b67";
  const fellow = player.fellowship, colors: [string, string] = fellow?.colors ?? DEFAULT_FELLOWSHIP_COLORS;
  const banner = style.layout === "banner", ledger = style.layout === "ledger", poster = style.layout === "poster";
  // Where things go: the portrait box and the skills block.
  const portrait = banner ? { x: 48, y: 48, w: 300, h: 300 } : ledger ? { x: 732, y: 48, w: 420, h: 520 } : poster ? { x: 48, y: 48, w: 520, h: 520 } : { x: 48, y: 48, w: 420, h: 520 };
  const skills = banner ? { x: 48, y: 372, cols: 7, cellW: 158, maxH: 200 } : ledger ? { x: 60, y: 142, cols: 3, cellW: 206, maxH: 340 } : poster ? { x: 610, y: 142, cols: 3, cellW: 180, maxH: 340 } : { x: 530, y: 142, cols: 3, cellW: 206, maxH: 340 };
  const header = banner ? { x: 380, y: 104 } : ledger ? { x: 60, y: 104 } : poster ? { x: 610, y: 104 } : { x: 530, y: 104 }, bandW = poster ? 540 : 620;
  // Portrait card.
  ctx.fillStyle = INK; ctx.fillRect(portrait.x + 10, portrait.y + 10, portrait.w, portrait.h); ctx.fillStyle = dark ? "#2a2a30" : "#fff"; ctx.fillRect(portrait.x, portrait.y, portrait.w, portrait.h); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(portrait.x, portrait.y, portrait.w, portrait.h);
  const inner = banner ? { x: portrait.x + 18, y: portrait.y + 18, w: portrait.w - 36, h: portrait.h - 36 } : { x: portrait.x + 24, y: portrait.y + 24, w: portrait.w - 48, h: 330 };
  if (style.frameColor) { ctx.fillStyle = style.frameColor; ctx.fillRect(inner.x, inner.y, inner.w, inner.h); } else paintFrame(ctx, style.frame, inner.x, inner.y, inner.w, inner.h);
  ctx.strokeRect(inner.x, inner.y, inner.w, inner.h);
  const cx = inner.x + inner.w / 2;
  if (friend) {
    // Your Friend as it looks in the Realm: wardrobe, helm, cape, amulet, shield and weapon, and on its mount if it's riding one
    // (the mount's body behind, its head in front, as when you ride towards the camera).
    const dressed = [...player.worn, ...(["cape", "head", "shield", "weapon", "neck", "body", "legs", "hands", "feet"] as const).flatMap(slot => player.equipment[slot] ? [player.equipment[slot]!] : [])];
    const art = figureArt(friendRows(friend, "down", false, 0), dressed, "down"), mount = mountDef(player.mount);
    const ratio = 2 * 1.35 / 1.6, lift = mount ? (SADDLE - 4) * ratio : 0, fitW = inner.w - 8, fitH = inner.h - 4;
    const px = Math.max(1, Math.floor(Math.min(fitW / art.width, fitH / (art.height + lift + (mount ? 4 : 0))) * (mount ? 2 : 1)) / (mount ? 2 : 1)), ground = mount ? inner.y + inner.h - 10 : inner.y + inner.h / 2 + art.height * px / 2 + px * 2;
    ctx.imageSmoothingEnabled = false;
    const drawMountLayer = (layer: "body" | "head") => {
      const horse = mountArt(mount!.coat, "front", -1, true, layer), m = px * ratio;
      ctx.drawImage(horse, Math.round(cx - horse.width * m / 2), Math.round(ground + 2 * px - horse.height * m), Math.round(horse.width * m), Math.round(horse.height * m));
    };
    if (mount) drawMountLayer("body");
    ctx.drawImage(art, Math.round(cx - art.width * px / 2), Math.round(ground - lift * px - art.height * px + px * 2), art.width * px, art.height * px);
    if (mount) drawMountLayer("head");
  }
  // Who you are: name (or Friend number), the token id small beside it, your title, family and where you are, and your fellowship.
  const nameX = banner ? 380 : portrait.x + 24, nameY = banner ? 150 : portrait.y + 402, title = titleName(player.title);
  ctx.fillStyle = TEXT; ctx.font = `bold ${banner ? 40 : 34}px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const label = player.name ?? `FRIEND #${player.friendId}`; ctx.fillText(label, nameX, nameY);
  if (player.name) { const w = ctx.measureText(label).width; ctx.font = `${banner ? 20 : 17}px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`(${player.friendId})`, nameX + w + 12, nameY); }
  ctx.font = `${banner ? 22 : 20}px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`${title ? `${title} · ` : ""}${FAMILY_NAMES[player.familyId]}`, nameX, nameY + 32);
  if (fellow) {
    ctx.font = `bold ${banner ? 22 : 19}px ${FONT}`; ctx.fillStyle = dark ? GOLD : "#8a6a10";
    const tagText = `[${fellow.tag}] ${fellow.name}`, logoSize = banner ? 34 : 28;
    if (fellowship?.logo) { ctx.imageSmoothingEnabled = true; ctx.drawImage(fellowship.logo, nameX, nameY + 42, logoSize, logoSize); }
    else drawEmblem(ctx, fellow.logo ?? "shield", nameX, nameY + 42, logoSize, colors);
    ctx.fillText(tagText, nameX + logoSize + 8, nameY + 42 + logoSize * 0.75);
  }
  ctx.fillStyle = TEXT; ctx.font = `bold 22px ${FONT}`;
  const levelsY = banner ? nameY + 112 : portrait.y + 500;
  ctx.fillText(`Combat ${combatLevel(player)}`, nameX, levelsY); ctx.fillText(`Total ${totalLevel(player)}`, nameX + 190, levelsY);
  // Header band: ADVENTURER over the fellowship's banner (the site's picture if it has one, else the banner it chose), its emblem on the right.
  {
    const band = banner ? { x: 380, y: 44, w: 770, h: 60 } : { x: header.x, y: header.y - 48, w: bandW, h: 72 }, hasBand = !!fellow;
    if (hasBand) {
      if (fellowship?.bg) {
        ctx.save(); ctx.beginPath(); ctx.rect(band.x, band.y, band.w, band.h); ctx.clip(); ctx.imageSmoothingEnabled = true;
        const img = fellowship.bg, scale = Math.max(band.w / img.width, band.h / img.height);
        ctx.drawImage(img, band.x + (band.w - img.width * scale) / 2, band.y + (band.h - img.height * scale) / 2, img.width * scale, img.height * scale); ctx.restore();
      } else drawBanner(ctx, fellow.banner ?? "plain", band.x, band.y, band.w, band.h, colors);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(band.x, band.y, band.w, band.h);
      const logoBox = band.h - 8;
      if (fellowship?.logo) { ctx.imageSmoothingEnabled = true; ctx.fillStyle = "#fff"; ctx.fillRect(band.x + band.w - logoBox - 6, band.y + 4, logoBox, logoBox); ctx.drawImage(fellowship.logo, band.x + band.w - logoBox - 4, band.y + 6, logoBox - 4, logoBox - 4); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(band.x + band.w - logoBox - 6, band.y + 4, logoBox, logoBox); }
      else drawEmblem(ctx, fellow.logo ?? "shield", band.x + band.w - logoBox - 6, band.y + 4, logoBox, colors);
    }
    if (!banner) {
      ctx.font = `bold 40px ${FONT}`; ctx.fillStyle = hasBand ? "#fff" : TEXT;
      if (hasBand) { ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.strokeText("ADVENTURER", header.x + 12, header.y); }
      ctx.fillText("ADVENTURER", header.x + (hasBand ? 12 : 0), header.y);
      ctx.fillStyle = style.ink === "gilt" || dark ? GOLD : BUTTER; ctx.fillRect(header.x, header.y + 16, bandW, 8);
    } else if (hasBand) {
      ctx.font = `bold 30px ${FONT}`; ctx.fillStyle = "#fff"; ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.strokeText(`${fellow.name} [${fellow.tag}]`, band.x + 14, band.y + 41); ctx.fillText(`${fellow.name} [${fellow.tag}]`, band.x + 14, band.y + 41);
    }
  }
  // Skills grid, sized so the quest line always sits below the last row.
  const rows = Math.ceil(SKILLS.length / skills.cols), cellH = Math.min(58, Math.floor(skills.maxH / rows)), box = cellH - 8;
  SKILLS.forEach((skill: Skill, index) => {
    const x = skills.x + (index % skills.cols) * skills.cellW, y = skills.y + Math.floor(index / skills.cols) * cellH, level = levelForXp(player.xp[skill]), w = skills.cellW - 12;
    const fill = style.skills === "dark" ? (level >= 99 ? "#3a3220" : INK) : style.skills === "gilded" ? (level >= 99 ? GOLD : "#fff6d6") : level >= 99 ? BUTTER : level >= 10 ? (dark ? "rgba(255,255,255,0.9)" : "#fff") : (dark ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.55)");
    ctx.fillStyle = fill; ctx.strokeStyle = style.skills === "gilded" ? "#8a6a10" : INK; ctx.lineWidth = 2;
    if (style.skills === "pills") { ctx.beginPath(); ctx.roundRect(x, y, w, box, box / 2); ctx.fill(); ctx.stroke(); } else { ctx.fillRect(x, y, w, box); ctx.strokeRect(x, y, w, box); }
    const text = style.skills === "dark" ? PAPER : INK;
    ctx.fillStyle = text; ctx.font = `${skills.cols === 7 ? 13 : 16}px ${FONT}`; ctx.textBaseline = "middle"; ctx.fillText(SKILL_NAMES[skill], x + (style.skills === "pills" ? 16 : 10), y + box / 2 + 1);
    ctx.font = `bold ${skills.cols === 7 ? 18 : 21}px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(String(level), x + w - (style.skills === "pills" ? 16 : 12), y + box / 2 + 1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  });
  const qp = questPoints(game), below = skills.y + rows * cellH + 34;
  ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = TEXT; ctx.fillText(`Quest points ${qp}/${MAX_QUEST_POINTS}`, skills.x, below);
  ctx.font = `18px ${FONT}`; ctx.fillStyle = MUTED;
  const line2 = `${player.kills.toLocaleString()} monster${player.kills === 1 ? "" : "s"} defeated · ${player.wardrobe.length}/${WARDROBE.length} wardrobe pieces`;
  const line3 = `🏆 ${achieved(game)}/${ACHIEVEMENTS.length} achievements · ${player.pets.length} pet${player.pets.length === 1 ? "" : "s"} · ${player.stats.duelsWon ?? 0} duel win${(player.stats.duelsWon ?? 0) === 1 ? "" : "s"} · Presence ${levelForXp(player.xp.presence)}`;
  if (banner) { ctx.fillText(`${line2} · ${line3}`, skills.x + 300, below); } else { ctx.fillText(line2, skills.x, below + 30); ctx.fillText(line3, skills.x, below + 58); }
  // Footer.
  ctx.fillStyle = INK; ctx.fillRect(0, CARD.height - 72, CARD.width, 72);
  ctx.fillStyle = PAPER; ctx.font = `bold 26px ${FONT}`; ctx.fillText("⚔ RareFriends Realm", 40, CARD.height - 26);
  ctx.font = `20px ${FONT}`; ctx.textAlign = "right"; ctx.fillText("@RareFriendsNFT #RareFriends #RareFriendsRealm", CARD.width - 40, CARD.height - 28); ctx.textAlign = "left";
  return canvas;
}
