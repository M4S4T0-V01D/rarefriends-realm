/**
 * Player feedback: the in-game button writes up what a player tells us twice, as an X post tagging the Realm and its
 * maker, and as a GitHub issue on the Realm's repository with the details we need to act on it (where they were,
 * their levels, the update they're on). The sandbox can't open tabs; the host page does, on the player's click.
 */
import { REGIONS } from "./world.ts";
import { combatLevel, totalLevel, type Game } from "./state.ts";
import { LATEST_UPDATE } from "./updates.ts";
import { MAX_QUEST_POINTS, questPoints } from "./content.ts";
import { regionAt } from "./world.ts";

export const FEEDBACK_REPO = "M4S4T0-V01D/rarefriends-realm";
export const FEEDBACK_KINDS = ["Bug", "Idea", "Balance", "Something else"] as const;
export type FeedbackKind = typeof FEEDBACK_KINDS[number];
export const FEEDBACK_MAX = 600;
const TAGS = "@M4S4T0_V01D @RareFriendsNFT #RareFriends #RareFriendsRealm";
const ICON: Record<FeedbackKind, string> = { Bug: "🐞", Idea: "💡", Balance: "⚖️", "Something else": "💬" };
/** X counts every character as one except emoji and links; keep a margin for the emoji. */
export function feedbackPost(kind: FeedbackKind, text: string): string {
  const head = `${ICON[kind]} RareFriends Realm feedback (${kind.toLowerCase()}): `, tail = `\n\n${TAGS}`, room = 276 - head.length - tail.length;
  const said = text.trim().replace(/\s+/g, " ");
  return head + (said.length > room ? `${said.slice(0, room - 1).trimEnd()}…` : said) + tail;
}
/** The issue's title and body: what they said, and (if they agree) where and who they were. */
export function feedbackIssue(game: Game, kind: FeedbackKind, text: string, details: boolean, posted: boolean): { title: string; body: string } {
  const said = text.trim(), first = said.split(/\n/)[0].replace(/\s+/g, " "), p = game.player;
  const title = `[${kind}] ${first.length > 72 ? `${first.slice(0, 71).trimEnd()}…` : first || "Player feedback"}`;
  const lines = [`### ${kind === "Bug" ? "What happened" : kind === "Idea" ? "The idea" : kind === "Balance" ? "What feels off" : "Feedback"}`, "", said || "(no text)", ""];
  if (details) {
    const region = regionAt(game.world, p.x, p.y);
    lines.push("### Where and who", "", `- Friend: #${p.friendId}${p.name ? ` (${p.name})` : ""}`, `- Region: ${region.name} (${p.x}, ${p.y})`, `- Combat ${combatLevel(p)} · total level ${totalLevel(p)} · quest points ${questPoints(game)}/${MAX_QUEST_POINTS}`,
      `- Update: ${LATEST_UPDATE}`, `- Regions found: ${Object.keys(p.visited).length}/${REGIONS.length - 1}`, ...(typeof navigator !== "undefined" ? [`- Browser: ${navigator.userAgent.slice(0, 160)}`] : []), "");
  }
  lines.push(`_Sent from the in-game feedback button${posted ? ", and posted on X" : ""}._`);
  return { title, body: lines.join("\n") };
}
