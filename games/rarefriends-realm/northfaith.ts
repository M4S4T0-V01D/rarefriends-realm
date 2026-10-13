/**
 * The north's own faiths (A Place to the North): the Last Ember of the Vargskeld and the Hearth and the Bough of the
 * Zoryavik. Neither replaces the Old Friend's light, or Raria's, or the Isles': nobody converts. A traveller asks a
 * blessing at a sacred place, with a gift, as a guest would, and carries it a while (one at a time, from either faith).
 *
 * The Last Ember (the Keepers, at Embermoot): the fire the first ship brought, kept burning; oaths freely sworn; the dead
 * remembered by name; guest-right. Its blessings: Guest-right (food heals more), the Crossing Oath (running tires you
 * less), the Remembered Name (once, a blow that would fell you leaves you standing).
 * The Hearth and the Bough (the Hearth-Fathers' House in Krasnogor; the Circle at the Old Bough): the land borrowed from
 * the grandchildren, the ancestors in the hearth corner, the turning year. Its blessings: Hearth-warmth (hitpoints come
 * back twice as fast), the Ancestors' Watch (a tenth of every blow turned aside), the Bough's Year (now and then a second
 * herb where you pick one).
 *
 * Each faith has its quarrel, and a questline that makes the player part of it:
 * - The Last Ember: coals are going missing from the Last Ember. Eyvind of Ravnsvik carries them to the fisher hearths,
 *   because the first ember was carried, not kept: Thora the fisherwife brought it off the ship in a pot and lit every
 *   hearth on the fjord, and the hall came a century later and recut her runestone. The player decides: the hall keeps
 *   it (its blessings last longer, Eyvind's pot goes out), every hearth carries it (Ravnsvik's pot and the Grey Gull's
 *   hearth bless, and Yrsa won't), or the saga is told as it was and each keeps the part that's theirs.
 * - The Turning Year: the Hearth-Fathers, with the prince's seal, forbade the midsummer fires at the Old Bough. The oldest
 *   liturgy in the Dawn Archive shows the hearth prayer and the oak's fire were one rite, carried between them, until a
 *   prince's decree split it (a prince can tithe a House, not a forest). The player decides where the fire is lit: under
 *   the oak (the Circle blesses, the House won't), at the hearth (the reverse), or carried between them as it was (each
 *   place keeps its own part).
 */
import { addXp, give, has, level, message, sound, take, type Dialogue, type Game } from "./state.ts";
import type { WorldObject } from "./world.ts";
import { chat, completeQuest, data, npcSays, stage, type NpcDef, type QuestDef } from "./content.ts";

// ---------- The blessings ----------
import { BLESSINGS, type BlessingId, type FaithId } from "./northblessings.ts";
export { BLESSINGS, BLESSING_IDS, type Blessing, type BlessingId, type FaithId } from "./northblessings.ts";
/** How long a blessing lasts (ticks: about twenty minutes), and the Faith XP for asking one. */
export const BLESSING_TICKS = 2000, BLESSING_XP = 25;
/** The gift a blessing is asked with: a loaf, as a guest brings to a hearth. */
export const BLESSING_GIFT = "bread";

/** A blessing's name in the middle of a sentence ("you're given the Crossing Oath"). */
const called = (id: BlessingId) => BLESSINGS[id].name.replace(/^The /, "the ");
const blessing = (game: Game) => { const b = game.player.blessing; return b && game.tick < b.until ? b : null; };
export const blessed = (game: Game, id: BlessingId) => blessing(game)?.id === id;
/** What the blessings do, for the engine: food, running, hitpoints, blows, herbs. */
export const blessingFood = (game: Game) => blessed(game, "guest_right") ? 1.25 : 1;
export const blessingRun = (game: Game) => blessed(game, "crossing_oath") ? 0.75 : 1;
export const blessingRegen = (game: Game) => blessed(game, "hearth_warmth") ? 2 : 1;
export const blessingTaken = (game: Game) => blessed(game, "ancestors_watch") ? 0.1 : 0;
export const blessingHerb = (game: Game) => blessed(game, "boughs_year") && game.rng() < 0.2;
/** The Remembered Name: called as you fall. True if it kept you standing (once a blessing). */
export function rememberedName(game: Game, maxHp: number): boolean {
  const b = blessing(game);
  if (!b || b.id !== "remembered_name" || b.used) return false;
  b.used = true; game.player.hp = Math.max(1, Math.ceil(maxHp / 4));
  message(game, "Someone, somewhere, says your name. You're still standing.", "quest"); sound(game, "quest");
  return true;
}
/** A blessing worn out: said once, then forgotten. */
export function blessingTick(game: Game) {
  const b = game.player.blessing;
  if (b && game.tick >= b.until) { game.player.blessing = null; message(game, `${BLESSINGS[b.id].name} fades.`); }
}
/** A saved blessing, checked: a known one, for no longer than a blessing lasts. */
export function cleanBlessing(raw: unknown, tick: number): Game["player"]["blessing"] {
  const r = raw && typeof raw === "object" ? raw as Record<string, unknown> : null;
  if (!r || typeof r.id !== "string" || !(r.id in BLESSINGS)) return null;
  const left = Math.max(0, Math.min(BLESSING_TICKS * 1.5, Math.floor(Number(r.left) || 0)));
  return left ? { id: r.id as BlessingId, until: tick + left, used: r.used === true } : null;
}
export const saveBlessing = (game: Game) => { const b = blessing(game); return b ? { id: b.id, left: b.until - game.tick, used: !!b.used } : null; };

// ---------- The quests ----------
export const LAST_EMBER = "last_ember", TURNING_YEAR = "turning_year";
/** What was decided (questData.le_choice / ty_choice). */
export const LE_HALL = 1, LE_HEARTHS = 2, LE_SAGA = 3;
export const TY_OAK = 1, TY_HEARTH = 2, TY_CARRIED = 3;
export const LE_ACCOUNTS = [["le_stone", "Read Thora's runestone at Embermoot, the oldest one, recut"], ["le_verse", "Hear the oldest verse from the Embermoot skald"], ["le_brand", "Ask Oathmaster Brand what he makes of it"]] as const;
export const TY_RITES = [["ty_spring", "Draw water at the White Spring below the Old Bough"], ["ty_howe", "Leave bread at the ancestors' howes by Svetloye"], ["ty_ilya", "Ask Hearth-Father Ilya why the fires are forbidden"]] as const;

const flag = (game: Game, key: string) => { game.player.questData[key] = 1; };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const le = (game: Game) => data(game, "le_step"), ty = (game: Game) => data(game, "ty_step");
const leChoice = (game: Game) => data(game, "le_choice"), tyChoice = (game: Game) => data(game, "ty_choice");
const inLe = (game: Game, step: number) => stage(game, LAST_EMBER) === 1 && le(game) === step;
const inTy = (game: Game, step: number) => stage(game, TURNING_YEAR) === 1 && ty(game) === step;

export const FAITH_QUESTS: readonly QuestDef[] = [
  {
    id: LAST_EMBER, name: "The Last Ember", points: 2, difficulty: "Intermediate",
    start: "Talk to Ember-keeper Yrsa at Embermoot.",
    requirements: ["Faith 20 recommended"],
    rewards: ["2 Quest Points", "3,500 Faith XP", "1,500 Mysteries XP", "20 star sigils", "The Last Ember's blessings where your choice leaves them"],
    journal: game => {
      const s = stage(game, LAST_EMBER), at = le(game), c = leChoice(game);
      if (s === 0) return ["Ember-keeper Yrsa at Embermoot keeps the Last Ember, the fire the first ship brought. She looks worried."];
      if (at === 1) return ["Coals are going missing from the Last Ember by night. Yrsa calls it theft from the dead.", mark(!!data(game, "le_hearth"), "Look over the Last Ember's hearth"), "• Find whoever took the coals"];
      if (at === 2) return ["Eyvind of Ravnsvik carries coals from the Last Ember to the fisher hearths. He says the first ember was carried, not kept: Thora the fisherwife brought it off the ship in a pot.", ...LE_ACCOUNTS.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 3) return ["Thora's runestone was recut when the hall was built; the oldest verse names her; Brand says a fire's a fire. Yrsa should hear it, and Eyvind's waiting on what she says.", "• Talk to Ember-keeper Yrsa"];
      return [c === LE_HALL ? "I told Yrsa the hall should keep the Ember. Its blessings are the hall's, and last longer for it; Eyvind's pot is out. QUEST COMPLETE!"
        : c === LE_HEARTHS ? "I told Yrsa the Ember belongs to every hearth, as Thora carried it. Eyvind's pot at Ravnsvik and the Grey Gull's hearth in Skarnholm bless now; Yrsa doesn't, not for me. QUEST COMPLETE!"
          : "I told the saga as it was, and left the keeping to whoever keeps it. The hall keeps the dead's blessing and guest-right; Eyvind's pot keeps guest-right and the crossing. QUEST COMPLETE!"];
    },
  },
  {
    id: TURNING_YEAR, name: "The Turning Year", points: 2, difficulty: "Intermediate",
    start: "Talk to Old Dobromir of the Bough at the Old Bough, north of Krasnogor.",
    requirements: ["A loaf of bread for the howes", "Faith 20 recommended"],
    rewards: ["2 Quest Points", "3,500 Faith XP", "1,500 Mysteries XP", "20 star sigils", "The Hearth and the Bough's blessings where your choice leaves them"],
    journal: game => {
      const s = stage(game, TURNING_YEAR), at = ty(game), c = tyChoice(game);
      if (s === 0) return ["Old Dobromir keeps the grove at the Old Bough. Midsummer is coming, and he isn't happy about it."];
      if (at === 1) return ["The Hearth-Fathers, with the prince's seal, have forbidden the midsummer fires at the Old Bough. Dobromir means to keep the rite anyway, and needs its parts.", ...TY_RITES.map(([key, text]) => mark(!!data(game, key), text))];
      if (at === 2) return ["Ilya says the ancestors live in the hearth corner, not in a tree, and the House has kept the rites since the prince's grandfather. The Dawn Archive keeps older liturgies than the House.", "• Ask Archivist Bozhena at Svetloye for the oldest liturgy"];
      if (at === 3) return ["The oldest liturgy: one rite, the hearth's fire carried to the oak at midsummer and home again. A prince's decree split it, and the House has kept its half since.", "• Tell Old Dobromir, and decide where the fire is lit"];
      return [c === TY_OAK ? "The fires burned under the oak, as the Circle wanted. The Circle blesses at the Old Bough; the House won't, not for me. QUEST COMPLETE!"
        : c === TY_HEARTH ? "The fire stayed in the hearth, as the House wanted. The House blesses in Krasnogor; Dobromir won't, not for me. QUEST COMPLETE!"
          : "The hearth's fire went out to the oak and came home again, as it used to. Each place keeps its own part of the blessings. QUEST COMPLETE!"];
    },
  },
];
function finish(game: Game, id: string, key: string, choice: number) {
  const p = game.player; p.questData[key] = choice;
  addXp(game, "prayer", 3500, { raw: true }); addXp(game, "mysteries", 1500, { raw: true }); give(p, "star_sigil", 20);
  completeQuest(game, id);
}

// ---------- Where each blessing is given ----------
export type FaithSite = "ember_hearth" | "ember_pot" | "gull_hearth" | "house_hearth" | "bough_post";
const SITE_FAITH: Record<FaithSite, FaithId> = { ember_hearth: "ember", ember_pot: "ember", gull_hearth: "ember", house_hearth: "bough", bough_post: "bough" };
/** The blessings a sacred place gives this player (what the quests decided), and a word on why not, when it gives none. */
export function siteBlessings(game: Game, site: FaithSite): { give: BlessingId[]; why?: string } {
  if (SITE_FAITH[site] === "ember") {
    const c = leChoice(game);
    if (!c) return site === "ember_hearth" ? { give: ["guest_right"] } : { give: [], why: site === "ember_pot" ? "Eyvind's pot. He'd give you a coal from it, but it isn't his to bless with. Not yet." : "The Grey Gull's hearth. A good fire; not a sacred one." };
    if (c === LE_HALL) return site === "ember_hearth" ? { give: ["guest_right", "crossing_oath", "remembered_name"] } : { give: [], why: "The pot's cold. The hall keeps the Ember now." };
    if (c === LE_HEARTHS) return site === "ember_hearth" ? { give: [], why: "Yrsa won't bless you at her hearth. \"You gave it to the fish-wives.\"" } : { give: ["guest_right", "crossing_oath", "remembered_name"] };
    return site === "ember_hearth" ? { give: ["guest_right", "remembered_name"] } : site === "ember_pot" ? { give: ["guest_right", "crossing_oath"] } : { give: [], why: "The Grey Gull's hearth. A good fire; not a sacred one." };
  }
  const c = tyChoice(game);
  if (!c) return { give: ["hearth_warmth"] };
  if (c === TY_OAK) return site === "bough_post" ? { give: ["hearth_warmth", "ancestors_watch", "boughs_year"] } : { give: [], why: "Hearth-Father Ilya won't bless you. \"You took it to the tree.\"" };
  if (c === TY_HEARTH) return site === "house_hearth" ? { give: ["hearth_warmth", "ancestors_watch", "boughs_year"] } : { give: [], why: "Dobromir turns away. \"You left it in their House.\"" };
  return site === "house_hearth" ? { give: ["hearth_warmth", "ancestors_watch"] } : { give: ["hearth_warmth", "boughs_year"] };
}
/** How long a blessing from this place lasts: the hall's half as long again, if the hall keeps the Ember. */
const lasts = (game: Game, site: FaithSite) => site === "ember_hearth" && leChoice(game) === LE_HALL ? BLESSING_TICKS * 1.5 : BLESSING_TICKS;
/** Ask a blessing: the level for it, a loaf for the gift; one at a time (a new one takes the old one's place). */
export function askBlessing(game: Game, site: FaithSite, id: BlessingId): boolean {
  const def = BLESSINGS[id], player = game.player;
  if (!siteBlessings(game, site).give.includes(id)) return false;
  if (level(game, "prayer") < def.level) { message(game, `You need a Faith level of ${def.level} to be given ${called(id)}.`, "warn"); return false; }
  if (!take(player, BLESSING_GIFT, 1)) { message(game, "A blessing is asked with a gift: a loaf of bread, as a guest brings to a hearth.", "warn"); return false; }
  const before = blessing(game);
  player.blessing = { id, until: game.tick + lasts(game, site), used: false };
  addXp(game, "prayer", BLESSING_XP);
  message(game, `${before && before.id !== id ? `${BLESSINGS[before.id].name} gives way. ` : ""}You're given ${called(id)}. ${def.text}`, "quest"); sound(game, "quest");
  return true;
}
function blessingDialogue(game: Game, site: FaithSite, name: string): Dialogue {
  const { give: list, why } = siteBlessings(game, site);
  if (!list.length) return chat(name, npcSays(name, why ?? "Nothing here for you."));
  const b = blessing(game);
  return chat(name, npcSays(name, `${b ? `You carry ${called(b.id)} now. ` : ""}A blessing is asked with a gift: a loaf of bread. Which?`), [
    ...list.map(id => ({ label: `${BLESSINGS[id].name} (Faith ${BLESSINGS[id].level}): ${BLESSINGS[id].text}`, then: () => { askBlessing(game, site, id); return null; } })),
    { label: "Not now.", then: () => null },
  ]);
}

// ---------- The people ----------
export const FAITH_NPCS: Record<string, NpcDef> = {
  ember_carrier_eyvind: { id: "ember_carrier_eyvind", name: "Eyvind the ember-carrier", examine: "A Ravnsvik fisherman with a clay pot of coals on a cord round his neck. Says it's warmer than a cloak.", options: ["Talk-to"], art: { family: 9, seed: 2144 } },
};

/** The faiths' people. Null when there's nothing of the faiths to say (and the north's own talk runs). */
export function talkNorthFaith(game: Game, npcId: string, name: string, usual: () => Dialogue | null): Dialogue | null {
  const says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const more = (lines: string[], options: Dialogue["options"] = []) => chat(name, npcSays(name, ...lines), [...(options ?? []), { label: "Something else.", then: () => usual() }]);
  const ask = (lines: string[], label: string, reply: string[], key: string, after: () => void) => more(lines, [{ label, then: () => { flag(game, key); after(); return says(...reply); } }]);
  const sl = stage(game, LAST_EMBER), al = le(game), cl = leChoice(game), st = stage(game, TURNING_YEAR), at = ty(game), ct = tyChoice(game);
  switch (npcId) {
    case "ember_keeper_yrsa": {
      if (sl === 0) return more(["Someone has been taking coals from the Last Ember. At night, a few at a time, as if that made it smaller. It's the dead's fire. Every name we keep is kept by it."], [
        { label: "I'll find out who.", then: () => chat(name, npcSays(name, "Look at the hearth first. Whoever it is, they're not careful; just quiet."), undefined, () => {
          game.player.quests[LAST_EMBER] = 1; game.player.questData.le_step = 1; say(game, "Quest started: The Last Ember.");
        }) },
        { label: "Not now.", then: () => null }]);
      if (sl === 1 && al <= 2) return more([al === 1 ? "The hearth first. Then whoever it led you to." : "Eyvind. Of course it's Eyvind. And you've let him tell you a story, I can see it."]);
      if (sl === 1 && al === 3) return chat(name, npcSays(name, "Thora's stone, recut. The old verse. And Brand saying a fire's a fire, as he would.", "Eyvind's outside. He came up from Ravnsvik with his pot, to hear what you'll tell me. So. Who keeps the Ember?"), [
        { label: "The hall. Someone has to keep it whole.", then: () => chat(name, npcSays(name, "Then it stays whole, and here. Eyvind's pot goes into the Ember, and the hall's blessings are given longer, for the ones who come to it."), undefined, () => { finish(game, LAST_EMBER, "le_choice", LE_HALL); say(game, "The hall keeps the Ember. Eyvind's pot is cold."); }) },
        { label: "Every hearth. Thora carried it; let it be carried.", then: () => chat(name, npcSays(name, "Then carry it. Eyvind will be glad. Don't ask me to bless you at this hearth: you've given it away."), undefined, () => { finish(game, LAST_EMBER, "le_choice", LE_HEARTHS); say(game, "The Ember goes to the hearths: Eyvind's pot at Ravnsvik and the Grey Gull's hearth in Skarnholm bless now."); }) },
        { label: "Tell the saga as it was. Let each keep their part.", then: () => chat(name, npcSays(name, "Thora's name goes back on her stone, then, as it was cut first. The hall keeps the dead; Eyvind keeps the road. I can live with that. I'll even say so."), undefined, () => { finish(game, LAST_EMBER, "le_choice", LE_SAGA); say(game, "The saga's told as it was. The hall and Eyvind's pot each keep their part of the blessings."); }) },
        { label: "Not yet.", then: () => null }]);
      if (sl >= 2) return cl === LE_HEARTHS ? says("The hearths have it now. I keep the names; that's work enough.") : more([cl === LE_HALL ? "The Ember's whole, and the hall keeps it. Come and ask its blessing when you need one." : "Thora's name is back on her stone. The skald sings her first now."]);
      return null;
    }
    case "ember_carrier_eyvind": {
      if (sl === 1 && al === 1 && data(game, "le_hearth")) return chat(name, npcSays(name, "Yes, I took the coals. A few at a time, and every one of them lit a hearth on this shore that the hall never would.",
        "The first ember wasn't kept in a hall. Thora the fisherwife carried it off the first ship in a pot, like this one, and lit every hearth on the fjord. The hall came a hundred years after, and recut her stone to say the hall kept it all along.",
        "Don't take my word. Read her stone at Embermoot, the oldest one. Ask the skald for the oldest verse. Ask Brand, at the Hall, who believes in nothing but oaths."), undefined, () => { game.player.questData.le_step = 2; say(game, "Eyvind carries the Ember to the fisher hearths, and says Thora did first. Time to find out."); });
      if (sl === 1 && al === 2) return more(["Thora's stone, the oldest verse, and Brand. Then tell Yrsa what you think. I'll be there."]);
      if (sl === 1 && al === 3) return says("I'm going up to Embermoot. Yrsa's waiting on you, and so am I.");
      if (sl >= 2) return says(cl === LE_HALL ? "The pot's cold. I gave the coals back. I still think Thora would have laughed at us." : cl === LE_HEARTHS ? "Every hearth on the shore has a coal of it now. Ask the pot's blessing whenever you come by." : "Thora's name back on her stone. I'd have settled for less. Ask the pot's blessing whenever you come by.");
      return says("A coal from the pot? It's warmer than a cloak, and cheaper.");
    }
    case "ember_skald":
      if (inLe(game, 2) && !data(game, "le_verse")) return ask(["Ask me for a name and I'll tell you the life that goes with it."], "Tell me the oldest verse about the Ember.",
        ["\"Thora bore it from the keel in clay, and gave the fjord its fire; the hall was raised to hold the names, and took the ember higher.\"", "My teacher sang it \"the hall was raised to hold the flame.\" Her teacher sang \"the names.\" I sing what I was taught, and I know which is older."], "le_verse", () => checkAccounts(game));
      return null;
    case "oathmaster_brand":
      if (inLe(game, 2) && !data(game, "le_brand")) return ask(["Oaths are kept by the people who swore them. Ask me about one."], "What do you make of the Last Ember?",
        ["A fire's a fire. I've seen it go out twice and be lit again from a tinderbox, and Yrsa said nothing, because the names didn't go out with it.", "Keep a promise and you don't need a priest to warm it for you. That said: if the Ember helps someone keep theirs, I won't kick it over."], "le_brand", () => checkAccounts(game));
      return null;
    case "old_bough_keeper": {
      if (st === 0) return more(["Midsummer, and the Hearth-Fathers have sent word with the prince's seal on it: no fires at the oak this year. Disorder, they call it. My grandmother called it the year turning."], [
        { label: "Can I help keep the rite?", then: () => chat(name, npcSays(name, "Water from the White Spring below the grove. Bread at the ancestors' howes by Svetloye: they're owed it. And go and ask Ilya why. To his face. I'd like to know what he says."), undefined, () => {
          game.player.quests[TURNING_YEAR] = 1; game.player.questData.ty_step = 1; say(game, "Quest started: The Turning Year.");
        }) },
        { label: "Not now.", then: () => null }]);
      if (st === 1 && at === 1) return more(["The spring, the howes, and Ilya. Then come back."]);
      if (st === 1 && at === 2) return more(["The House says it kept the rites. The Archive at Svetloye keeps older books than the House. Ask Bozhena."]);
      if (st === 1 && at === 3) return chat(name, npcSays(name, "One rite. The hearth's fire to the oak and home again. My grandmother never said; perhaps she didn't know. Perhaps nobody wanted to.", "It's midsummer night. Where do we light it?"), [
        { label: "Under the oak, as the Circle always has.", then: () => chat(name, npcSays(name, "Under the oak, then, seal or no seal. The House will sulk; let it."), undefined, () => { finish(game, TURNING_YEAR, "ty_choice", TY_OAK); say(game, "The fires burn under the oak. The Circle blesses at the Old Bough now; the House won't."); }) },
        { label: "At the hearth. The House has kept it; let it keep it.", then: () => chat(name, npcSays(name, "In their House. Well. It's warm there. I won't bless you for it, and I won't curse you either."), undefined, () => { finish(game, TURNING_YEAR, "ty_choice", TY_HEARTH); say(game, "The fire stays in the hearth. The House blesses in Krasnogor now; the Circle won't."); }) },
        { label: "Carry the hearth's fire to the oak, and home again.", then: () => chat(name, npcSays(name, "As it was. Ilya will walk it here himself, if you ask him in front of enough people. Each place keeps what's its own, after."), undefined, () => { finish(game, TURNING_YEAR, "ty_choice", TY_CARRIED); say(game, "The fire goes to the oak and home again. Each place keeps its own part of the blessings."); }) },
        { label: "Not yet.", then: () => null }]);
      if (st >= 2) return ct === TY_HEARTH ? says("You chose their House. The oak's still here.") : more([ct === TY_OAK ? "The grove remembers the fires. Ask its blessing at the posts." : "Ilya carried the fire here himself. I didn't think I'd live to see it."]);
      return null;
    }
    case "hearth_father_ilya":
      if (inTy(game, 1) && !data(game, "ty_ilya")) return ask(["The House keeps the hearth, and the hearth keeps the ancestors. Ask."], "Why forbid the fires at the oak?",
        ["The ancestors live in the hearth corner, where they were laid to sleep in the old days, not in a tree. The House has kept their rites since the prince's grandfather gave it his seal.", "Fires in a forest are disorder, and disorder is how the land gets burned. I would rather people prayed at home. Is that so cruel?"], "ty_ilya", () => checkRites(game));
      if (st >= 2) return ct === TY_OAK ? says("You took it to the tree. The House's door is open, but I won't bless you.") : more([ct === TY_HEARTH ? "The hearth kept it. Ask the House's blessing when you need one." : "I walked the fire to the oak myself, in front of half of Krasnogor. My grandfather's seal didn't fall off the wall."]);
      return null;
    case "archivist_bozhena":
      if (inTy(game, 2)) return more(["The Archive keeps the House's books, and the books the House would rather it didn't."], [{ label: "Show me the oldest liturgy.", then: () => chat(name, npcSays(name, "Here. Before the decree. \"At midsummer the hearth's fire is carried to the oak, and the oak's ash home to the hearth.\" One rite, two places.",
        "The decree's here too: the prince's grandfather gave the House the hearth and called the oak disorder. A prince can tithe a House. He can't tithe a forest."), undefined, () => { game.player.questData.ty_step = 3; say(game, "One rite, split by a prince's decree. Tell Old Dobromir."); }) }]);
      return null;
  }
  return null;
}
function checkAccounts(game: Game) {
  if (!inLe(game, 2) || !LE_ACCOUNTS.every(([key]) => data(game, key))) return;
  game.player.questData.le_step = 3; say(game, "Thora's stone, the oldest verse and Brand's word. Yrsa should hear it.");
}
function checkRites(game: Game) {
  if (!inTy(game, 1) || !TY_RITES.every(([key]) => data(game, key))) return;
  game.player.questData.ty_step = 2; say(game, "The rite's parts gathered, and Ilya's reasons. The Dawn Archive keeps older books than the House.");
}

// ---------- The sacred places ----------
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const site = (id: FaithSite, examine: string, name: string, extra?: (game: Game) => ClueOutcome): Clue => ({
  options: () => ["Ask-blessing", "Examine"], examine: () => examine,
  use: (game, _object, option) => { if (option === "Examine") return { text: examine }; const quest = extra?.(game); if (quest) return quest; game.dialogue = blessingDialogue(game, id, name); sound(game, "click"); return null; },
});
export const FAITH_CLUES: Record<string, Clue> = {
  ember_hearth: {
    ...site("ember_hearth", "The Last Ember: a fire that has not gone out since the first ship came. The Keepers feed it with driftwood and names.", "The Last Ember"),
    options: game => inLe(game, 1) && !data(game, "le_hearth") ? ["Search", "Ask-blessing", "Examine"] : ["Ask-blessing", "Examine"],
    use: (game, object, option) => {
      if (option === "Search" && inLe(game, 1) && !data(game, "le_hearth")) { flag(game, "le_hearth"); addXp(game, "mysteries", 200, { raw: true }); say(game, "A Ravnsvik fisher's mark. Ravnsvik is west, on the outer coast."); return { text: "Soot on the hearthstone, and a sooty handprint on the kerb, small and broad. Beside it, a shard of a clay pot with a fisher's mark scratched in: the mark they use at Ravnsvik." }; }
      return site("ember_hearth", "The Last Ember: a fire that has not gone out since the first ship came. The Keepers feed it with driftwood and names.", "The Last Ember").use(game, object, option);
    },
  },
  ember_stone: {
    options: () => ["Read", "Examine"], examine: () => "The oldest runestone at Embermoot, its runes recut by a newer hand.",
    use: game => {
      if (inLe(game, 2) && !data(game, "le_stone")) { flag(game, "le_stone"); addXp(game, "mysteries", 300, { raw: true }); checkAccounts(game); }
      return { text: "The newer runes say: \"The hall kept the fire from the first ship.\" Under them, where the light catches the older cuts: \"Thora carried the fire from the ship. The hall keeps her name.\"" };
    },
  },
  ember_pot: site("ember_pot", "Eyvind's pot of coals from the Last Ember, on a flat stone by the nets.", "Eyvind's pot"),
  gull_hearth: site("gull_hearth", "The Grey Gull's long hearth, banked with peat.", "The Grey Gull's hearth"),
  house_hearth: site("house_hearth", "The House's hearth, and the ancestors' corner beside it: a carved shelf, bread and a candle on it.", "The House's hearth"),
  bough_post: site("bough_post", "A carved post round the Old Bough: a face in the wood, eyes closed. Ribbons and bread at its foot.", "The Old Bough"),
  white_spring: {
    options: game => inTy(game, 1) && !data(game, "ty_spring") ? ["Draw-water", "Examine"] : ["Examine"], examine: () => "The White Spring: cold, clear, and older than the grove, they say.",
    use: game => {
      if (!inTy(game, 1) || data(game, "ty_spring")) return { text: "Cold, clear water, coming up through white stones." };
      flag(game, "ty_spring"); checkRites(game); return { text: "You draw a flask of the spring's water, for the rite. It's colder than snow." };
    },
  },
  ancestors_howe: {
    options: game => inTy(game, 1) && !data(game, "ty_howe") ? ["Leave-bread", "Examine"] : ["Examine"], examine: () => "An ancestors' howe: a grassy mound, a carved post at its head, crumbs on the stone.",
    use: game => {
      if (!inTy(game, 1) || data(game, "ty_howe")) return { text: "A grassy howe. Someone has left bread on the stone." };
      if (!has(game.player, "bread")) return { text: "The ancestors are owed bread. You haven't any." };
      take(game.player, "bread", 1); flag(game, "ty_howe"); addXp(game, "prayer", 100, { raw: true }); checkRites(game);
      return { text: "You leave the bread on the stone at the howe's head, as the Circle does. A crow watches, and waits for you to go." };
    },
  },
};
