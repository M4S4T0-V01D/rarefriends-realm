/**
 * The conversations an overlay writes (overlay.ts OverlayTalk), run as the game's own talk: a node's lines, then its
 * options (those whose needs hold, and whose payments can be made), each doing its deeds and going on to the next node
 * or ending it. A note made by a conversation is kept in the save's questData as `talk_<note>`; a `once` option makes
 * its own note when it's chosen, and isn't offered again.
 */
import { SKILLS, XP_TABLE, isItem, type Skill } from "./data.ts";
import { addXp, canHold, count, give, maxHp, maxPrayer, take, type Dialogue, type DialogueLine, type Game } from "./state.ts";
import type { OverlayTalk, TalkAct, TalkNeed, TalkOption } from "./overlay.ts";
import { H, W } from "./world.ts";

const note = (id: string) => `talk_${id}`;
const onceNote = (talk: OverlayTalk, node: string, k: number) => `talk_once_${talk.id}_${node}_${k}`;
const xpLevel = (xp: number) => { let l = 1; while (l < 99 && XP_TABLE[l + 1] <= xp) l++; return l; };

/** Whether a need holds (`quest`: done, or at least at stage n). `done` says whether a quest is done (content.ts knows its last stage). */
function holds(game: Game, need: TalkNeed, done: (quest: string) => boolean): boolean {
  const p = game.player;
  switch (need.kind) {
    case "item": return count(p, need.id) >= (need.n ?? 1);
    case "level": return SKILLS.includes(need.id as Skill) && xpLevel(p.xp[need.id as Skill] ?? 0) >= (need.n ?? 1);
    case "quest": return need.n === undefined ? done(need.id) : (p.quests[need.id] ?? 0) >= need.n;
    case "flag": return !!p.questData[note(need.id)];
    case "noflag": return !p.questData[note(need.id)];
  }
}
/** Whether the deeds can be done: what's taken is there, what's given fits. */
function affordable(game: Game, acts: readonly TalkAct[]): boolean {
  const p = game.player;
  for (const a of acts) {
    if (a.kind === "take" && count(p, a.id!) < (a.n ?? 1)) return false;
    if (a.kind === "pay" && count(p, "coins") < (a.n ?? 1)) return false;
    if (a.kind === "give" && (!isItem(a.id!) || !canHold(p, a.id!, a.n ?? 1))) return false;
    if (a.kind === "frens" && !canHold(p, "coins", 1)) return false;
  }
  return true;
}
function act(game: Game, acts: readonly TalkAct[]) {
  const p = game.player;
  for (const a of acts) switch (a.kind) {
    case "give": give(p, a.id!, a.n ?? 1); break;
    case "take": take(p, a.id!, a.n ?? 1); break;
    case "frens": give(p, "coins", a.n ?? 1); break;
    case "pay": take(p, "coins", a.n ?? 1); break;
    case "xp": addXp(game, a.id as Skill, a.n ?? 1, { raw: true }); break;
    case "flag": p.questData[note(a.id!)] = 1; break;
    case "unflag": delete p.questData[note(a.id!)]; break;
    case "heal": p.hp = maxHp(p); p.prayer = maxPrayer(p); p.poison = null; break;
    case "teleport": if (a.x !== undefined && a.y !== undefined && a.x >= 0 && a.y >= 0 && a.x < W && a.y < H) { p.x = a.x; p.y = a.y; p.prev = { x: a.x, y: a.y }; p.path = []; p.target = null; } break;
  }
}
/** What's on offer at a node: the options whose needs hold and whose deeds can be done, `once` ones not yet chosen. */
export function offered(game: Game, talk: OverlayTalk, nodeId: string, done: (quest: string) => boolean): { option: TalkOption; k: number }[] {
  const node = talk.nodes.find(n => n.id === nodeId); if (!node) return [];
  return (node.options ?? []).map((option, k) => ({ option, k })).filter(({ option, k }) => !(option.once && game.player.questData[onceNote(talk, node.id, k)]) && (option.need ?? []).every(n => holds(game, n, done)) && affordable(game, option.do ?? []));
}
/** A node as the game's dialogue: its deeds done as it's reached, its lines, its options (or a goodbye when none hold). */
export function runTalk(game: Game, talk: OverlayTalk, npcId: string, name: string, nodeId: string, done: (quest: string) => boolean, depth = 0): Dialogue | null {
  const node = talk.nodes.find(n => n.id === nodeId); if (!node || depth > 50) return null;
  if (node.do?.length && affordable(game, node.do)) act(game, node.do);
  const lines: DialogueLine[] = node.lines.map(l => l.who === "npc" ? { who: "npc", text: l.text, npc: name } : { who: "player", text: l.text });
  const choices = offered(game, talk, node.id, done);
  // (A node with nothing to say but options goes straight to them.)
  if (!lines.length) lines.push({ who: "npc", text: "…", npc: name });
  if (!choices.length) return { npc: npcId, lines, index: 0 };
  return { npc: npcId, lines, index: 0, options: choices.map(({ option, k }) => ({ label: option.label, then: () => {
    // (Checked again when chosen: the pack may have changed while the menu was open.)
    if (!(option.need ?? []).every(n => holds(game, n, done)) || !affordable(game, option.do ?? [])) return null;
    if (option.once) game.player.questData[onceNote(talk, node.id, k)] = 1;
    act(game, option.do ?? []);
    return option.to ? runTalk(game, talk, npcId, name, option.to, done, depth + 1) : null;
  } })) };
}
