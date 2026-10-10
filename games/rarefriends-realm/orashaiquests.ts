/**
 * The Land Before Stone: the Orashai Mysteries, the Keeper of First Names, and the god behind the bag.
 *
 * "The Orashai Mysteries" is an initiation in five stages. The Threshold: Priestess Anzah of the Hidden Sun wants
 * proof you can read (three inscriptions of Azhurak, read whole). The Name at the Door: her token opens the door that
 * sees. The Silence: the Listener in the Antechamber asks three questions that must not be answered. The Descent: three
 * first names scratched out of the Hall of Names must be cut again, and below, the Unnamed must be faced. The Rising:
 * the Keeper of First Names gives you a first name, and the Orashai way.
 *
 * "The God Behind the Bag": a man with a paper bag on his head, a fish drawn on it, says he was asked to leave the
 * ceremony and can't remember which. Kharaveth's gods each remember a question. His name in the Hall of Names was
 * scratched out twice, and it's a question too.
 */
import { addXp, giveOrDrop, has, maxMana, message, setTradition, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { discover, glyphState, learnGlyph, readInscription } from "./mysteries.ts";
import type { WorldObject } from "./world.ts";

const art = (family: number, seed: number) => ({ family, seed });
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(9, seed), ...extra });
const INIT = "orashai_mysteries", BAG = "god_behind_bag";
const SEAL = "matriarchs_seal";
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
/** The three inscriptions Anzah asks the initiate to have read whole. */
const THRESHOLD = ["seven_crowns", "sunken_obelisk", "first_names_door"] as const;
const readAll = (game: Game) => THRESHOLD.every(id => id in game.player.mysteries.read);
/** The three names scratched out of the Hall, and the glyph each wants understood before it can be cut again. */
const RINGS = [["om_r0", "name"], ["om_r1", "first"], ["om_r2", "eye"]] as const;
const ringsCut = (game: Game) => RINGS.every(([key]) => data(game, key));
const SHRINES = [["gb_w", "weigher"], ["gb_g", "gate_mother"], ["gb_s", "salt_twins"], ["gb_z", "smoke"]] as const;
const shrinesAsked = (game: Game) => SHRINES.every(([key]) => data(game, key));

export const ORASHAI_NPCS: Record<string, NpcDef> = {
  orashai_listener: person("orashai_listener", "The Listener", "A veiled figure on a stool in the middle of the Antechamber, head tilted, as if you'd already said something.", 1460),
  keeper_first_names: person("keeper_first_names", "The Keeper of First Names", "A Rare Friend with a long-billed ibis head, ink on its fingers, a reed behind one ear. It has written down the first name of everything that has one, and is not finished.", 1461, { options: ["Talk-to", "Trade"], shop: "keeper_scriptorium" }),
  bag_man: person("bag_man", "The One Who Was Asked to Leave the Ceremony", "A tall figure in a good robe with a paper bag over his head. Somebody has drawn a fish on the bag in charcoal. He seems to be listening to something on the other side of the wall.", 1462),
};

export const ORASHAI_QUESTS: readonly QuestDef[] = [
  {
    id: INIT, name: "The Orashai Mysteries", points: 4, difficulty: "Experienced", start: "Talk to Priestess Anzah in the Temple of the Hidden Sun, Sefrah, once the House is out of mourning.",
    requirements: ["The Matriarch's Seal", "Mysteries: three inscriptions read whole", "Combat 70 recommended"],
    rewards: ["4 Quest Points", "6,000 Faith XP", "6,000 Magic XP", "3,000 Mysteries XP", "A first name, from the Keeper", "Two Mysteries techniques: the Weigher's Counter and the Gate-Mother's Ward", "The Orashai way: the First Script and the Hidden Sun's watchings, and mana to write with", "The Staff of the Hidden Sun"],
    journal: game => {
      const s = stage(game, INIT);
      if (s === 0) return ["The Temple of the Hidden Sun in Sefrah keeps the Orashai Mysteries. While the House mourns, they're shut."];
      if (s === 1) return ["The Threshold: Priestess Anzah will give the Orashai token to someone who can read. She wants three of Azhurak's inscriptions read whole.",
        ...THRESHOLD.map(id => mark(id in game.player.mysteries.read, id === "seven_crowns" ? "The fallen stone of the Seven Crowns" : id === "sunken_obelisk" ? "The Sunken Obelisk" : "The door that sees, in the Ochre Spine")),
        mark(readAll(game), "Then go back to Anzah")];
      if (s === 2) return ["The Name at the Door: with the Orashai token, the door that sees, in the Ochre Spine, will open."];
      if (s === 3) return ["The Silence: the Listener in the Antechamber asks questions. The Orashai say the first thing an initiate learns is when not to answer."];
      if (s === 4) return ["The Descent: in the Hall of Names, three first names have been scratched out of the wall. The lower stair stays shut until they're cut again.",
        `${ringsCut(game) ? "✓" : "•"} Cut the three names again (${RINGS.filter(([key]) => data(game, key)).length}/3; each wants its glyph understood)`,
        mark(!!data(game, "om_unnamed"), "Face the Unnamed, below the lower stair")];
      if (s === 5) return ["The Unnamed is at rest. The Rising: the Keeper of First Names is waiting in the scriptorium."];
      return ["The Keeper of First Names gave me a first name, written in lapis on a tablet nobody else may read, and the Orashai way. QUEST COMPLETE!"];
    },
  },
  {
    id: BAG, name: "The God Behind the Bag", points: 2, difficulty: "Intermediate", start: "Talk to the man with a paper bag on his head, outside Sefrah's north wall.",
    requirements: ["The Orashai Mysteries started", "Mysteries"],
    rewards: ["2 Quest Points", "4,000 Presence XP", "A paper bag with a fish drawn on it"],
    journal: game => {
      const s = stage(game, BAG);
      if (s === 0) return ["Outside Sefrah's north wall stands a man with a paper bag on his head and a fish drawn on the bag."];
      if (s === 1) return ["He was asked to leave the ceremony. He can't remember which ceremony, or why, or who asked. Kharaveth's gods might.",
        ...SHRINES.map(([key, id]) => mark(!!data(game, key), id === "weigher" ? "The Weigher's shrine, at Tamesh" : id === "gate_mother" ? "The Gate-Mother's shrine, outside Khetmar" : id === "salt_twins" ? "The Salt Twins' shrine, at the Ouresh camp" : "The Smoke That Remembers' shrine, at the Zuri tents"))];
      if (s === 2) return ["Every god remembers the same thing: at the First Ceremony, when the Keeper wrote the first names, somebody asked a question. His name should be in the Hall of Names.", "• Find it"];
      if (s === 3) return ["His name is in the Hall, scratched out twice: first by the ceremony, then by himself.", "• Tell him"];
      return ["His name is a question, and he's kept the bag: a question isn't finished by being answered. He goes in to the ceremonies now, and stands at the back. QUEST COMPLETE!"];
    },
  },
];

/** The Orashai's clues (merged after the heartlands' in kharaveth.ts CLUES, so the door that sees is this one). */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const doorOpen = (game: Game) => stage(game, INIT) >= 3 || (stage(game, INIT) === 2 && has(game.player, "orashai_token"));
export const ORASHAI_CLUES: Record<string, Clue> = {
  first_names_door: {
    options: game => doorOpen(game) ? ["Enter", "Read"] : ["Read", "Knock"],
    examine: game => doorOpen(game) ? "The door that sees. It has seen you: there's a line of light down its middle." : "A door cut into the living rock, an eye carved over it. It has no handle, no lock and no hinge you can see.",
    use: (game, object, option) => {
      discover(game, "first_names_door");
      if (option === "Enter" && doorOpen(game)) {
        if (stage(game, INIT) === 2) { take(game.player, "orashai_token", 1); game.player.quests[INIT] = 3; say(game, "The door that sees opens. Behind it, a room with one person in it, waiting to be spoken to."); }
        return { to: object.to!, text: "The door folds inwards along a line that wasn't there, and you step through into lamplight without smoke." };
      }
      if (option === "Knock") return { text: "You knock. The sound goes a long way in, further than the cliff is deep. Nothing answers. Not yet, something in you says." };
      return { text: `Glyphs round the eye. ${readInscription(game, "first_names_door")}` };
    },
  },
  ...Object.fromEntries(RINGS.map(([key, glyph], k): [string, Clue] => [`name_ring_${k}`, {
    options: game => data(game, key) ? ["Read"] : ["Cut-again", "Read"],
    examine: game => data(game, key) ? "A first name, cut again, the stone round it pale and new." : "A ring cut in the wall, and inside it, a first name scratched out with something sharp and angry.",
    use: (game, _object, option) => {
      if (data(game, key)) return { text: "A first name, cut again. You can read it, and you won't say it aloud." };
      if (option === "Read") return { text: "Scratched out. Under the scratches, a glyph you can still make out." };
      if (stage(game, INIT) !== 4) return { text: "The Keeper's names aren't yours to cut. Not yet." };
      if (glyphState(game, glyph) < 2) return { text: "You'd need to understand the glyph under the scratches to cut it again truly. A name cut wrongly is worse than none." };
      flag(game, key); addXp(game, "magic", 600, { raw: true });
      if (ringsCut(game)) say(game, "The third name is cut. Down the hall, the lower stair's stone sighs, and stands open.");
      return { text: "You cut the name again, stroke by stroke, the way the glyphs go. The stone takes it like it remembered." };
    },
  }])),
  lower_stair: {
    options: () => ["Open"], examine: game => ringsCut(game) || stage(game, INIT) >= 5 ? "The lower stair, open. It goes down a long way, and cold." : "A stone stair down, shut with a slab cut with a bar on a point. It's out of its measure.",
    use: (game, object) => {
      if (!(ringsCut(game) || stage(game, INIT) >= 5)) return { text: "The slab won't move. Three names are missing from the hall above, and the stair is kept by measure." };
      const down = game.player.y < object.y;
      return { to: { x: object.x, y: object.y + (down ? 1 : -1) }, text: down ? "You go down the lower stair, into the cold." : "You come back up the lower stair." };
    },
  },
  bag_ring: {
    options: () => ["Read"], examine: () => "A ring in the wall, low down where nobody looks. Its name has been scratched out, and the scratches scratched out.",
    use: game => {
      if (stage(game, BAG) === 2) { game.player.quests[BAG] = 3; learnGlyph(game, "name", true); discover(game, "the_asked_god"); say(game, "You've found his name. Tell him."); }
      return { text: "Scratched out twice: once in a careful hand, once in a careless one. Under both, not a glyph at all. A mark the Keeper uses when it doesn't know: a hook over a point. A question." };
    },
  },
  ...Object.fromEntries(SHRINES.map(([key, id]): [string, Clue] => [`shrine_${id}`, {
    options: () => ["Pay-respects"],
    examine: () => SHRINE_TEXT[id][0],
    use: game => {
      discover(game, `god_${id}`);
      if (stage(game, BAG) === 1 && !data(game, key)) {
        flag(game, key);
        if (shrinesAsked(game)) { game.player.quests[BAG] = 2; say(game, "Every god remembers a question asked at the First Ceremony. His name should be in the Hall of First Names."); }
        return { text: SHRINE_TEXT[id][2] };
      }
      return { text: SHRINE_TEXT[id][1] };
    },
  }])),
};
/** Each god's shrine: what you see, what you feel paying your respects, and what it remembers of the ceremony. */
const SHRINE_TEXT: Record<string, readonly [string, string, string]> = {
  weigher: ["A figure holding a bar balanced on a point, a bowl hung from each end. Tamesh's masons leave chips of stone in the bowls.", "You set a chip of stone in one bowl. The bar doesn't move. Everything here is already in its measure.",
    "The bar dips, once, toward the side nobody has put anything on, and you remember (it isn't your memory) a voice at the First Ceremony asking how much a name weighs."],
  gate_mother: ["A woman of sandstone standing in an arch, one hand on each side of it. The Banner's riders touch the arch going out.", "You pass through the arch. Something counts you.",
    "In the arch, for a moment, the sound of a door being shut on someone who was still talking. The question was: what's on the other side of the door?"],
  salt_twins: ["Two pillars of rock salt, licked smooth by camels and by Ouresh children who were told not to.", "You touch the salt. Your fingers taste of the far flats for an hour.",
    "The twins remember everything twice. Twice, at the First Ceremony, somebody asked why the salt had to be two."],
  smoke: ["A clay brazier where the Zuri's blue resin burns day and night. The smoke goes straight up, even in wind.", "You stand in the smoke. It smells of somewhere you've never been.",
    "The smoke leans toward you and you see, in it, a hall, a crowd, and one tall shape at the back with its hand up. It never got an answer."],
};

export function talkOrashai(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, s = stage(game, INIT);
  switch (npcId) {
    case "sefrah_priestess": {
      if (!questDone(game, SEAL)) return null;
      if (s === 0) return chat(name, npcSays(name, "The House has a Council, and the temple has its doors open again. You read the Matriarch's seal to her children. Do you want to read more than seals?", "The Orashai keep the Hidden Sun's Mysteries: five thresholds, and at the end, the Keeper of First Names. The first threshold is reading. Read three of Azhurak's inscriptions whole, the Seven Crowns, the Sunken Obelisk and the door that sees, and come back."), [
        { label: "I'll read them.", then: () => chat(name, npcSays(name, "Whole, mind. A glyph you only recognise is a glyph you haven't read."), undefined, () => { player.quests[INIT] = 1; say(game, "Quest started: The Orashai Mysteries."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (s === 1 && !readAll(game)) return chat(name, npcSays(name, "Three inscriptions, read whole: the fallen stone of the Seven Crowns, the Sunken Obelisk, and the door that sees. If a glyph won't give, ask: the masons, the Zuri, me."));
      if (s === 1) return chat(name, npcSays(name, "You've read them. Not recognised: read.", "Take this. The door that sees will see it, and open. Behind it is a room with someone in it. Remember what I said about reading, and remember this too: not everything asked is a question."), undefined, () => {
        giveOrDrop(game, "orashai_token"); player.quests[INIT] = 2; say(game, "Anzah gave you the Orashai token. Take it to the door that sees, in the Ochre Spine.");
      });
      if (s >= 2 && s < 6) return chat(name, npcSays(name, pick(game, ["The Keeper doesn't hurry. Neither should you.", "The temple sells ink to the initiated, and to the curious, at different prices.", "Below the Hall is something that lost its name. Don't give it yours."])));
      return chat(name, npcSays(name, pick(game, ["Initiate. The temple is yours as much as mine, now. Mind the lamps.", "Write carefully. A glyph written truly is a thing done, and a thing done can't be undone by writing it again."])));
    }
    case "orashai_listener": {
      if (s !== 3) return chat(name, npcSays(name, s > 3 ? "..." : "Who sent you? No: don't answer that."));
      // Three questions. The only right reply to each is none.
      const fail = () => chat(name, npcSays(name, "The Listener turns its head away, and waits for someone who can be quiet."));
      const ask = (question: string, then: () => Dialogue | null) => chat(name, npcSays(name, question), [
        { label: "Answer it.", then: fail },
        { label: "(Say nothing.)", then },
      ]);
      return ask("What is your name?", () => ask("Why have you come?", () => ask("What will you give for a first name?", () => chat(name, npcSays(name, "Good.", "The Listener stands and moves its stool aside. Behind it, the way into the Hall of Names."), undefined, () => {
        player.quests[INIT] = 4; discover(game, "the_silence"); say(game, "The Silence: passed. In the Hall of Names, three first names have been scratched out.");
      }))));
    }
    case "keeper_first_names": {
      if (s === 5) return chat(name, npcSays(name, "You cut three names again, and you went down to the Unnamed and came up yourself. Sit. This is the part where I write.", "There. A first name. It's on the tablet and in you, and nobody reads it but us two. Don't say it to the Unnamed's kind; don't say it to anyone, really. It's not for saying, it's for being.", "The Orashai way is yours, if you'll keep it: the First Script in your hand, the Hidden Sun's watchings in place of the old prayers, and mana to write with. And take this staff. It was made for someone who could be quiet."), [
        { label: "Keep the Orashai way.", then: () => chat(name, npcSays(name, "Then write well."), undefined, () => { finishInit(game); setTradition(game, "orashai"); }) },
        { label: "Not yet: I'll keep my own way for now.", then: () => chat(name, npcSays(name, "Change it at the top of your book, whenever you like. A name doesn't go away."), undefined, () => finishInit(game)) },
      ]);
      if (s === 4) return chat(name, npcSays(name, "Three names, scratched out of my wall. I know whose; I want them back. Each wants its glyph understood: the open ring, the capped stroke, the almond with a point. Then the stair will open, and you'll meet what scratched them."));
      if (stage(game, BAG) === 2 || stage(game, BAG) === 3) return chat(name, npcSays(name, "Him. The one in the bag. Yes. At the First Ceremony, when I was writing the first names, he put his hand up. Nobody had ever done that. I didn't know what it was. Neither did anyone else. They asked him to leave.", "I scratched his name out because I was embarrassed. He scratched it out again because he was. It's low on the wall, by the stair. Go and read it."));
      return chat(name, npcSays(name, pick(game, ["Ink and reeds, and the ibis mask, if you want to copy names the way my scribes do.", "Everything has a first name. Some things have only that.", "I am not finished. I'll never be finished. That's what keeping is.", ...(questDone(game, INIT) ? ["The Weigher's counter is a measure, not a prayer: wait for the blow, and answer it with its own weight. The Gate-Mother's ward is a doorway you stand in. Neither asks you to believe anything."] : [])])));
    }
    case "bag_man": {
      const b = stage(game, BAG);
      if (b === 0) return chat(name, npcSays(name, "Oh. Hello. You can see me? Most people see the bag and look politely at the wall.", "I was asked to leave the ceremony. I don't remember which ceremony, or why, or who asked. I've been standing here ever since, listening. It's been a while. The fish was already on the bag."), [
        { label: "I'll find out what happened.", then: () => chat(name, npcSays(name, "Would you? Ask the others. The gods, I mean. They were there. They're always there."), undefined, () => { player.quests[BAG] = 1; say(game, "Quest started: The God Behind the Bag."); }) },
        { label: "Why the fish?", then: () => chat(name, npcSays(name, "I don't know. I didn't draw it. I like it, though. It looks surprised.")) },
        { label: "Not now.", then: () => null },
      ]);
      if (b === 1) return chat(name, npcSays(name, "The Weigher, the Gate-Mother, the Twins, the Smoke. Ask them what they remember. They'll remember something; they're like that."));
      if (b === 2) return chat(name, npcSays(name, "A question? I asked a question? What a thing to do at a ceremony. No wonder. If my name's anywhere, it's in the Keeper's hall. Low down. I'd have been embarrassed."));
      if (b === 3) return chat(name, npcSays(name, "You found it? What does it say?"), [
        { label: "It isn't a glyph. It's a question mark.", then: () => chat(name, npcSays(name, "Ha!", "Ha. Of course it is. I'm the one who asks. Every ceremony since, somebody's had a question they didn't ask, because I was outside with it.", "I'll go in. I'll stand at the back. I'm keeping the bag: a question isn't finished by being answered. Here: the spare. Everyone should have one."), undefined, () => finishBag(game)) },
      ]);
      return chat(name, npcSays(name, pick(game, ["Why do you suppose the fish looks surprised? I've been wondering.", "I go to every ceremony now. I stand at the back. Nobody's asked me to leave. I haven't asked anything yet, either. Pacing myself.", "Do you ever wonder what's on the other side of a door? Then you're a little bit mine."])));
    }
  }
  return null;
}
function finishInit(game: Game) {
  if (questDone(game, INIT)) return;
  discover(game, "orashai_initiation");
  giveOrDrop(game, "hidden_sun_staff");
  addXp(game, "prayer", 6000, { raw: true }); addXp(game, "magic", 6000, { raw: true }); addXp(game, "mysteries", 3000, { raw: true });
  game.player.mana = maxMana(game.player);
  completeQuest(game, INIT);
  say(game, "The Weigher's Counter and the Gate-Mother's Ward are yours: Mysteries techniques, in your Combat options.");
}
function finishBag(game: Game) {
  giveOrDrop(game, "fish_bag"); addXp(game, "presence", 4000, { raw: true });
  completeQuest(game, BAG);
}

export function onOrashaiKill(game: Game, monsterId: string) {
  if (monsterId === "the_unnamed") {
    discover(game, "the_unnamed");
    if (stage(game, INIT) === 4 && ringsCut(game) && !data(game, "om_unnamed")) { flag(game, "om_unnamed"); game.player.quests[INIT] = 5; say(game, "The Unnamed comes apart into a name, and the name goes up the stair without you. The Keeper is waiting."); }
  }
}
