/**
 * Achievements: firsts and milestones across the Realm, from your first level to a full stable. Each is checked
 * against your adventure as it stands (so older saves earn the ones they already deserve), and recorded with the UTC day
 * you earned it. Shown on the Achievements tab of the daily popup, and counted on the adventurer card.
 */
import { MOUNTS, PETS, SKILLS, WARDROBE, isItem, item, levelForXp } from "./data.ts";
import { MAX_QUEST_POINTS, questPoints } from "./content.ts";
import { count, message, sound, totalLevel, type Game } from "./state.ts";

export type Achievement = { id: string; name: string; text: string; icon: string; group: string; check: (game: Game) => boolean };
const skillAt = (game: Game, lvl: number) => SKILLS.some(skill => skill !== "hitpoints" && levelForXp(game.player.xp[skill]) >= lvl);
const kills = (game: Game, ...ids: string[]) => ids.reduce((sum, id) => sum + (game.player.killLog[id] ?? 0), 0);
const stat = (game: Game, key: string) => game.player.stats[key] ?? 0;
const owns = (game: Game, test: (id: string) => boolean) => [...game.player.inventory.map(slot => slot?.id), ...game.player.bank.map(slot => slot.id), ...Object.values(game.player.equipment)].some(id => !!id && isItem(id) && test(id));
export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: "first_steps", group: "Skills", icon: "✦", name: "First steps", text: "Reach level 10 in any skill.", check: g => skillAt(g, 10) },
  { id: "seasoned", group: "Skills", icon: "✦", name: "Seasoned", text: "Reach level 50 in any skill.", check: g => skillAt(g, 50) },
  { id: "mastered", group: "Skills", icon: "★", name: "Mastered", text: "Reach level 99 in any skill.", check: g => skillAt(g, 99) },
  { id: "total_250", group: "Skills", icon: "▦", name: "Well rounded", text: "Reach a total level of 250.", check: g => totalLevel(g.player) >= 250 },
  { id: "total_750", group: "Skills", icon: "▦", name: "Jack of all trades", text: "Reach a total level of 750.", check: g => totalLevel(g.player) >= 750 },
  { id: "total_1500", group: "Skills", icon: "▦", name: "Realm legend", text: "Reach a total level of 1,500.", check: g => totalLevel(g.player) >= 1500 },
  { id: "first_blood", group: "Combat", icon: "⚔", name: "First blood", text: "Defeat a monster.", check: g => g.player.kills >= 1 },
  { id: "hunter", group: "Combat", icon: "⚔", name: "Monster hunter", text: "Defeat 100 monsters.", check: g => g.player.kills >= 100 },
  { id: "dragonslayer", group: "Combat", icon: "🜂", name: "Dragonslayer", text: "Slay a drake in Wyrmreach.", check: g => kills(g, "ash_drake", "cinder_drake") >= 1 },
  { id: "old_cinder", group: "Combat", icon: "🜂", name: "Cinder quencher", text: "Defeat Old Cinder.", check: g => kills(g, "emberwyrm") >= 1 },
  { id: "kingslayer", group: "Combat", icon: "♛", name: "Kingslayer", text: "End the Hollow King's reign.", check: g => kills(g, "hollow_king") >= 1 },
  { id: "colossus", group: "Combat", icon: "☠", name: "Colossus toppler", text: "Help bring down the Ashen Colossus.", check: g => kills(g, "ashen_colossus") >= 1 },
  { id: "quester", group: "Quests", icon: "✎", name: "Quest starter", text: "Complete a quest.", check: g => questPoints(g) >= 1 },
  { id: "hero", group: "Quests", icon: "✎", name: "Hero of the Realm", text: "Complete every quest.", check: g => questPoints(g) >= MAX_QUEST_POINTS },
  { id: "saddle_up", group: "Collecting", icon: "♞", name: "Saddle up", text: "Buy a mount at the Friendhollow stables.", check: g => g.player.mounts.length >= 1 },
  { id: "unicorn", group: "Collecting", icon: "♞", name: "Horn of plenty", text: "Own a unicorn.", check: g => g.player.mounts.some(id => id.includes("unicorn")) },
  { id: "stable", group: "Collecting", icon: "♞", name: "Stable master", text: `Own all ${MOUNTS.length} mounts.`, check: g => g.player.mounts.length >= MOUNTS.length },
  { id: "pet", group: "Collecting", icon: "❦", name: "A funny feeling", text: "Find a pet while training.", check: g => g.player.pets.length >= 1 },
  { id: "menagerie", group: "Collecting", icon: "❦", name: "Menagerie", text: `Find all ${PETS.length} pets.`, check: g => g.player.pets.length >= PETS.length },
  { id: "caped", group: "Collecting", icon: "★", name: "Caped crusader", text: "Own a mastery cape.", check: g => owns(g, id => !!item(id).mastery) },
  { id: "fashion", group: "Collecting", icon: "♔", name: "Fashion Friend", text: "Collect 6 wardrobe pieces.", check: g => g.player.wardrobe.length >= 6 },
  { id: "wardrobe", group: "Collecting", icon: "♔", name: "Complete wardrobe", text: `Collect all ${WARDROBE.length} wardrobe pieces.`, check: g => g.player.wardrobe.length >= WARDROBE.length },
  { id: "rich", group: "Collecting", icon: "¤", name: "Coin purse", text: "Hold 100,000 coins between your pack and bank.", check: g => count(g.player, "coins") + (g.player.bank.find(slot => slot.id === "coins")?.n ?? 0) >= 100_000 },
  { id: "social", group: "Together", icon: "☻", name: "Social butterfly", text: "Meet 5 other players online.", check: g => Object.keys(g.player.met).length >= 5 },
  { id: "recruiter", group: "Together", icon: "♥", name: "Recruiter", text: "Bring a friend with your referral code.", check: g => g.player.referrals.length >= 1 },
  { id: "trader", group: "Together", icon: "⇄", name: "Trader", text: "Complete a trade with another player.", check: g => stat(g, "trades") >= 1 },
  { id: "duelist", group: "Together", icon: "⚔", name: "Duelist", text: "Win a duel in the sparring ring.", check: g => stat(g, "duelsWon") >= 1 },
  { id: "champion", group: "Together", icon: "⚔", name: "Ring champion", text: "Win 10 duels.", check: g => stat(g, "duelsWon") >= 10 },
  { id: "streak_3", group: "Daily", icon: "🔥", name: "Three in a row", text: "Keep a 3-day streak.", check: g => g.player.daily.best >= 3 },
  { id: "streak_7", group: "Daily", icon: "🔥", name: "A full week", text: "Keep a 7-day streak.", check: g => g.player.daily.best >= 7 },
  { id: "streak_30", group: "Daily", icon: "🔥", name: "Devoted", text: "Keep a 30-day streak.", check: g => g.player.daily.best >= 30 },
  { id: "challenger", group: "Daily", icon: "🎁", name: "Challenger", text: "Open a daily chest.", check: g => stat(g, "chests") >= 1 },
];
export const achieved = (game: Game) => ACHIEVEMENTS.filter(entry => game.player.achievements[entry.id] !== undefined).length;
/** Record any achievements you've newly earned; returns them (for their celebration). */
export function checkAchievements(game: Game, now: number, quiet = false): Achievement[] {
  const earned: Achievement[] = [], day = Math.floor(now / 86_400_000);
  for (const entry of ACHIEVEMENTS) {
    if (game.player.achievements[entry.id] !== undefined || !entry.check(game)) continue;
    game.player.achievements[entry.id] = day; earned.push(entry);
    if (!quiet) message(game, `Achievement unlocked: ${entry.name}! (${achieved(game)}/${ACHIEVEMENTS.length})`, "quest");
  }
  if (quiet && earned.length) message(game, `You've earned ${earned.length} achievement${earned.length === 1 ? "" : "s"} so far (${achieved(game)}/${ACHIEVEMENTS.length}). See them in the Realm Daily (the 🔥 button).`, "quest");
  else if (earned.length) sound(game, "rare");
  return earned;
}
