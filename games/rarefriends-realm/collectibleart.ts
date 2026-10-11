/** The collectible card, drawn (collectible.ts has the layouts, the choices and the facts). */
import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { EQUIP_SLOTS, SKILLS, SKILL_NAMES } from "./data.ts";
import type { Game } from "./state.ts";
import { friendRows } from "./render.ts";
import { figureArt } from "./wardrobe.ts";
import { CARDS } from "./codex.ts";
import { COLLECTIBLE, COLLECTIBLE_LAYOUTS, collectibleChoice, collectibleFacts, type CollectibleChoice, type CollectibleFacts } from "./collectible.ts";

const FONT = "Georgia, 'Times New Roman', serif", MONO = "ui-monospace, Menlo, Consolas, monospace";
/** The card, drawn: the layout's version is what it looks like, the facts are what it says. */
export function renderCollectible(game: Game, friend: GenerationSprites | null, facts: CollectibleFacts = collectibleFacts(game), choice: CollectibleChoice = collectibleChoice(game)): HTMLCanvasElement {
  const canvas = document.createElement("canvas"); canvas.width = COLLECTIBLE.width; canvas.height = COLLECTIBLE.height;
  const ctx = canvas.getContext("2d")!, W = COLLECTIBLE.width, H = COLLECTIBLE.height, player = game.player;
  const layout = COLLECTIBLE_LAYOUTS.find(entry => entry.id === choice.layout) ?? COLLECTIBLE_LAYOUTS[0], show = new Set(choice.show);
  const { dark, paper, trim, accent } = layout, TEXT = dark ? paper === "#15151a" ? "#efede7" : "#f4f6fa" : trim, MUTED = dark ? "rgba(255,255,255,0.65)" : "rgba(22,22,22,0.6)";
  const minimal = layout.id === "minimalist", legendary = layout.id === "legendary", skillmaster = layout.id === "skillmaster", champion = layout.id === "champion", collector = layout.id === "collector";
  // The card: its paper, a faint grid, and the frame (double for the collector's edition, a hairline for the minimalist).
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  if (!minimal) { ctx.strokeStyle = dark ? "rgba(255,255,255,0.05)" : "rgba(22,22,22,0.05)"; ctx.lineWidth = 1; for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
  ctx.strokeStyle = trim; ctx.lineWidth = minimal ? 2 : 8; ctx.strokeRect(18, 18, W - 36, H - 36);
  if (collector || legendary) { ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(30, 30, W - 60, H - 60); }
  // The portrait: the Friend as it looks in the Realm, in the frame, on the layout's backdrop.
  const portrait = minimal ? { x: 95, y: 150, w: 560, h: 500 } : { x: 70, y: 110, w: 610, h: 440 };
  ctx.fillStyle = dark ? "rgba(255,255,255,0.08)" : "#fff"; ctx.fillRect(portrait.x, portrait.y, portrait.w, portrait.h);
  if (!minimal) { const g = ctx.createLinearGradient(0, portrait.y, 0, portrait.y + portrait.h); g.addColorStop(0, dark ? "#2a2a38" : "#dfe8f2"); g.addColorStop(1, dark ? "#15151a" : "#f6f1e3"); ctx.fillStyle = g; ctx.fillRect(portrait.x + 12, portrait.y + 12, portrait.w - 24, portrait.h - 24); }
  ctx.strokeStyle = trim; ctx.lineWidth = minimal ? 1 : 3; ctx.strokeRect(portrait.x, portrait.y, portrait.w, portrait.h);
  if (friend) {
    const dressed = [...player.worn, ...EQUIP_SLOTS.flatMap(slot => player.equipment[slot] ? [player.equipment[slot]!] : [])];
    const art = figureArt(friendRows(friend, "down", false, 0), dressed, "down"), fitW = portrait.w - 60, fitH = portrait.h - 60;
    const px = Math.max(1, Math.floor(Math.min(fitW / art.width, fitH / art.height)));
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art, Math.round(portrait.x + portrait.w / 2 - art.width * px / 2), Math.round(portrait.y + portrait.h - 30 - art.height * px), art.width * px, art.height * px);
  }
  // The header: the layout's title over the portrait, the Friend's number in the corner.
  ctx.fillStyle = TEXT; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  if (!minimal) { ctx.font = `bold 30px ${FONT}`; ctx.fillText(layout.name.toUpperCase(), 70, 82); ctx.fillStyle = accent; ctx.fillRect(70, 90, 610, 6); }
  ctx.textAlign = "right"; ctx.font = `18px ${MONO}`; ctx.fillStyle = MUTED; ctx.fillText(`#${facts.friendId}${show.has("generation") && facts.generation !== null ? ` · GEN ${facts.generation}` : ""}`, W - 70, minimal ? 82 : 60); ctx.textAlign = "left";
  // Who: the name (or the Friend), the title and family, and the levels.
  const nameY = portrait.y + portrait.h + 50;
  ctx.fillStyle = TEXT; ctx.font = `bold ${minimal ? 40 : 36}px ${FONT}`; ctx.fillText(facts.name ?? `Friend #${facts.friendId}`, 70, nameY);
  ctx.font = `20px ${FONT}`; ctx.fillStyle = MUTED; ctx.fillText(`${facts.title ? `${facts.title} · ` : ""}${facts.family}`, 70, nameY + 30);
  if (show.has("combat") || minimal) { ctx.font = `bold 22px ${MONO}`; ctx.fillStyle = TEXT; ctx.fillText(`Combat ${facts.combat}   Total ${facts.total}`, 70, nameY + 66); }
  if (minimal) return canvas;
  // The panel: what the layout leads with, then what's asked for, in the space below the name.
  let y = nameY + 100;
  const line = (text: string, size = 18, color = TEXT, font = MONO) => { ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.fillText(text, 70, y); y += size + 10; };
  if (show.has("skills") && (skillmaster || layout.id === "classic" || legendary)) {
    const cols = skillmaster ? 3 : 4, cellW = 610 / cols, cellH = skillmaster ? 40 : 30, best = new Set([...SKILLS].sort((a, b) => facts.skills[b] - facts.skills[a]).slice(0, 3));
    SKILLS.forEach((skill, index) => {
      const x = 70 + (index % cols) * cellW, cy = y + Math.floor(index / cols) * cellH, gold = skillmaster && best.has(skill);
      ctx.fillStyle = gold ? accent : MUTED; ctx.font = `${skillmaster ? 16 : 13}px ${MONO}`; ctx.fillText(SKILL_NAMES[skill], x, cy);
      ctx.fillStyle = gold ? accent : TEXT; ctx.font = `bold ${skillmaster ? 20 : 15}px ${MONO}`; ctx.textAlign = "right"; ctx.fillText(String(facts.skills[skill]), x + cellW - 16, cy); ctx.textAlign = "left";
    });
    y += Math.ceil(SKILLS.length / cols) * cellH + 12;
  }
  if (show.has("gear") && facts.gear.length) { line("GEAR", 14, accent, FONT); for (const name of facts.gear.slice(0, legendary ? 9 : 5)) line(name, 17); y += 6; }
  if (show.has("quests")) line(`Quest points ${facts.questPoints}/${facts.maxQuestPoints}`, champion ? 24 : 18, champion ? accent : TEXT);
  if (show.has("achievements")) line(`Achievements ${facts.achievements}/${facts.maxAchievements}`, collector ? 22 : 18, collector ? accent : TEXT);
  if (collector) line(`Cards found ${facts.cardsFound}/${CARDS.length} · ${facts.pets} pet${facts.pets === 1 ? "" : "s"}`, 18);
  if (champion || legendary) line(`${facts.kills.toLocaleString()} monster${facts.kills === 1 ? "" : "s"} defeated`, 16, MUTED);
  // The foot: the Realm, the layout's version, and the day.
  ctx.fillStyle = trim; ctx.fillRect(18, H - 76, W - 36, 58);
  ctx.fillStyle = dark && paper !== "#15151a" ? paper : dark ? trim === "#e2c46a" ? "#15151a" : paper : paper; ctx.font = `bold 22px ${FONT}`; ctx.fillText("⚔ RareFriends Realm", 40, H - 40);
  ctx.textAlign = "right"; ctx.font = `14px ${MONO}`; ctx.fillText(`${layout.id} v${layout.version} · ${new Date(facts.at).toISOString().slice(0, 10)}`, W - 40, H - 40); ctx.textAlign = "left";
  return canvas;
}
