/** The shareable adventurer card: your Friend, levels and quests on a 1200 × 675 picture (the X card size). */
import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { FAMILY_NAMES, SKILLS, SKILL_NAMES, WARDROBE, levelForXp, type Skill } from "./data.ts";
import { MAX_QUEST_POINTS, questPoints } from "./content.ts";
import { combatLevel, totalLevel, type Game } from "./state.ts";
import { friendRows } from "./render.ts";
import { figureArt } from "./wardrobe.ts";

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
    // Your Friend as it looks in the Realm, wardrobe and all.
    const art = figureArt(friendRows(friend, "down", false, 0), [...player.worn, ...(player.equipment.cape ? [player.equipment.cape] : []), ...(player.equipment.head ? [player.equipment.head] : [])], "down"), px = Math.floor(Math.min(340 / art.width, 300 / art.height));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, Math.round(258 - art.width * px / 2), Math.round(237 - art.height * px / 2 + px * 2), art.width * px, art.height * px);
  }
  ctx.fillStyle = INK; ctx.font = `bold 34px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText(`FRIEND #${player.friendId}`, 72, 450);
  ctx.font = `20px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`${FAMILY_NAMES[player.familyId]} · ${region}`, 72, 482);
  ctx.fillStyle = INK; ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(`Combat ${combatLevel(player)}`, 72, 530); ctx.fillText(`Total ${totalLevel(player)}`, 262, 530);
  // Skills grid.
  ctx.font = `bold 40px ${FONT}`; ctx.fillStyle = INK; ctx.fillText("ADVENTURER", 530, 104);
  ctx.fillStyle = BUTTER; ctx.fillRect(530, 120, 620, 8);
  // Every skill in three columns, sized so the quest line always sits below the last row.
  const cols = 3, cellW = 206, rows = Math.ceil(SKILLS.length / cols), cellH = Math.min(58, Math.floor(340 / rows)), top = 142;
  SKILLS.forEach((skill: Skill, index) => {
    const x = 530 + (index % cols) * cellW, y = top + Math.floor(index / cols) * cellH, level = levelForXp(player.xp[skill]), box = cellH - 8;
    ctx.fillStyle = level >= 99 ? BUTTER : level >= 10 ? "#fff" : "rgba(255,255,255,0.55)"; ctx.fillRect(x, y, cellW - 12, box);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, cellW - 12, box);
    ctx.fillStyle = INK; ctx.font = `16px ${FONT}`; ctx.textBaseline = "middle"; ctx.fillText(SKILL_NAMES[skill], x + 10, y + box / 2 + 1);
    ctx.font = `bold 21px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(String(level), x + cellW - 24, y + box / 2 + 1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  });
  const qp = questPoints(game), below = top + rows * cellH + 34;
  ctx.font = `bold 22px ${FONT}`; ctx.fillStyle = INK; ctx.fillText(`Quest points ${qp}/${MAX_QUEST_POINTS}`, 530, below);
  ctx.font = `18px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`${player.kills.toLocaleString()} monster${player.kills === 1 ? "" : "s"} defeated · ${player.wardrobe.length}/${WARDROBE.length} wardrobe pieces`, 530, below + 30);
  // Footer.
  ctx.fillStyle = INK; ctx.fillRect(0, CARD.height - 72, CARD.width, 72);
  ctx.fillStyle = PAPER; ctx.font = `bold 26px ${FONT}`; ctx.fillText("⚔ RareFriends Realm", 40, CARD.height - 26);
  ctx.font = `20px ${FONT}`; ctx.textAlign = "right"; ctx.fillText("@RareFriendsNFT #RareFriends #RareFriendsRealm", CARD.width - 40, CARD.height - 28); ctx.textAlign = "left";
  return canvas;
}
