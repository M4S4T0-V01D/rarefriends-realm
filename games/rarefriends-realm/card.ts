/** The shareable adventurer card: your Friend, levels and quests on a 1200 × 675 picture (the X card size). */
import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { FAMILY_NAMES, SKILLS, SKILL_NAMES, WARDROBE, levelForXp, type Skill } from "./data.ts";
import { MAX_QUEST_POINTS, questPoints } from "./content.ts";
import { combatLevel, totalLevel, type Game } from "./state.ts";
import { friendRows } from "./render.ts";

export const CARD = { width: 1200, height: 675 } as const;
const INK = "#161616", PAPER = "#efede7", ROSE = "#d8b6b4", BUTTER = "#e2d7ad", MUTED = "#6d6b67";
const FONT = "ui-monospace, Menlo, Consolas, monospace";

export function shareText(game: Game) {
  const player = game.player;
  const text = `My Rare Friend #${player.friendId} (${FAMILY_NAMES[player.familyId]}) reached total level ${totalLevel(player)} and combat level ${combatLevel(player)} in RareFriends Realm, with ${questPoints(game)}/${MAX_QUEST_POINTS} quest points. ⚔️ @RareFriendsNFT #RareFriends #RareFriendsRealm`;
  return text.length <= 280 ? text : text.slice(0, 277) + "…";
}

export function renderCard(game: Game, friend: GenerationSprites | null, region: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = CARD.width; canvas.height = CARD.height;
  const ctx = canvas.getContext("2d")!, player = game.player;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, CARD.width, CARD.height);
  // Soft grid, like the world's tiles.
  ctx.strokeStyle = "rgba(22,22,22,0.06)"; ctx.lineWidth = 1;
  for (let x = -CARD.height; x < CARD.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + CARD.height * 2, CARD.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, CARD.height); ctx.lineTo(x + CARD.height * 2, 0); ctx.stroke(); }
  // Portrait card.
  ctx.fillStyle = INK; ctx.fillRect(58, 58, 420, 520); ctx.fillStyle = "#fff"; ctx.fillRect(48, 48, 420, 520); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(48, 48, 420, 520);
  ctx.fillStyle = ROSE; ctx.fillRect(72, 72, 372, 330); ctx.strokeRect(72, 72, 372, 330);
  const aura = player.worn.map(id => WARDROBE.find(entry => entry.id === id)).find(entry => entry?.kind === "aura");
  if (aura) { ctx.fillStyle = `${aura.color}aa`; ctx.beginPath(); ctx.ellipse(258, 250, 150, 130, 0, 0, Math.PI * 2); ctx.fill(); }
  if (friend) {
    const rows = friendRows(friend, "down", false, 0), px = 17, w = rows[0].length * px, h = rows.length * px, x0 = 258 - w / 2, y0 = 237 - h / 2;
    ctx.fillStyle = "#fff";
    rows.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel === "#") ctx.fillRect(x0 + (x - 1) * px, y0 + (y - 1) * px, px * 3, px * 3); }));
    ctx.fillStyle = INK;
    rows.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel === "#") ctx.fillRect(x0 + x * px, y0 + y * px, px, px); }));
  }
  ctx.fillStyle = INK; ctx.font = `bold 34px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText(`FRIEND #${player.friendId}`, 72, 450);
  ctx.font = `20px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`${FAMILY_NAMES[player.familyId]} · ${region}`, 72, 482);
  ctx.fillStyle = INK; ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(`Combat ${combatLevel(player)}`, 72, 530); ctx.fillText(`Total ${totalLevel(player)}`, 262, 530);
  // Skills grid.
  ctx.font = `bold 40px ${FONT}`; ctx.fillStyle = INK; ctx.fillText("ADVENTURER", 530, 104);
  ctx.fillStyle = BUTTER; ctx.fillRect(530, 120, 620, 8);
  const cols = 3, cellW = 206, cellH = 58;
  SKILLS.forEach((skill: Skill, index) => {
    const x = 530 + (index % cols) * cellW, y = 150 + Math.floor(index / cols) * cellH, level = levelForXp(player.xp[skill]);
    ctx.fillStyle = level >= 10 ? "#fff" : "rgba(255,255,255,0.55)"; ctx.fillRect(x, y, cellW - 12, cellH - 10);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, cellW - 12, cellH - 10);
    ctx.fillStyle = INK; ctx.font = `17px ${FONT}`; ctx.fillText(SKILL_NAMES[skill], x + 10, y + 30);
    ctx.font = `bold 24px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(String(level), x + cellW - 24, y + 32); ctx.textAlign = "left";
  });
  const qp = questPoints(game);
  ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = INK; ctx.fillText(`Quest points ${qp}/${MAX_QUEST_POINTS}`, 530, 480);
  ctx.font = `18px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`${player.kills.toLocaleString()} monster${player.kills === 1 ? "" : "s"} defeated · ${player.wardrobe.length}/${WARDROBE.length} wardrobe pieces`, 530, 510);
  // Footer.
  ctx.fillStyle = INK; ctx.fillRect(0, CARD.height - 72, CARD.width, 72);
  ctx.fillStyle = PAPER; ctx.font = `bold 26px ${FONT}`; ctx.fillText("⚔ RareFriends Realm", 40, CARD.height - 26);
  ctx.font = `20px ${FONT}`; ctx.textAlign = "right"; ctx.fillText("@RareFriendsNFT #RareFriends #RareFriendsRealm", CARD.width - 40, CARD.height - 28); ctx.textAlign = "left";
  return canvas;
}
