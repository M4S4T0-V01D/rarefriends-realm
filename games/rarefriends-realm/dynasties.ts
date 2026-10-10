/**
 * The Land Before Stone: Kharaveth's heartlands, their people, and three quests.
 *
 * "The Matriarch's Seal": the Grand Matriarch Ushara Khasreth is forty days dead, her seal is missing, and each of her
 * three heirs holds a third of the country and accuses the other two. Her vizier asks an outsider to find it. The heirs
 * each know a piece; the tomb's ledger says the Matriarch took the seal out herself and signed for it with the nomads'
 * mark; the Zuri kept it for "whoever can read what's cut on it". Read it, and bring it to Sefrah.
 *
 * "Salt and Blue Smoke": the Ouresh and the Zuri share the Well of Tahr, and each says the other fouled it. Neither did.
 *
 * "What the Quarry Woke": Tamesh's cutters broke into the Black Stair and knocked out the stones that kept its dead in
 * their measure. Put them back, and put the warden to rest.
 */
import { addXp, giveOrDrop, has, message, sound, take, type Dialogue, type Game } from "./state.ts";
import { chat, completeQuest, data, npcSays, questDone, stage, type NpcDef, type QuestDef } from "./content.ts";
import { discover, glyphState, knows, learnGlyph, readInscription } from "./mysteries.ts";
import type { WorldObject } from "./world.ts";

const art = (family: number, seed: number) => ({ family, seed });
const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(9, seed), ...extra });
const soldier = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to"], art: art(10, seed), ...extra });
const trader = (id: string, name: string, examine: string, seed: number, shop: string): NpcDef => person(id, name, examine, seed, { options: ["Talk-to", "Trade"], shop });
const villager = (id: string, name: string, examine: string, seed: number, extra: [string, number][]): NpcDef => person(id, name, examine, seed, {
  options: ["Talk-to", "Pickpocket"], pickpocket: { level: 34, xp: 52, coins: [20, 110], stun: 4, damage: 2, extra } });

const SEAL = "matriarchs_seal", SALT = "salt_and_smoke", QUARRY = "quarry_woke";
const FOOTHOLD = "foothold_in_the_stone";

export const HEARTLAND_NPCS: Record<string, NpcDef> = {
  // Sefrah: the Gilded Court.
  sefrah_vizier: person("sefrah_vizier", "Vizier Tamun Orrel", "The late Grand Matriarch's vizier: forty years of her letters, her quarrels and her silences. He serves the Gilded Court now, and says, carefully, that he serves the House.", 1420),
  sefrah_seleneh: person("sefrah_seleneh", "Lady Seleneh Khasreth", "The Matriarch's eldest, head of the Gilded Court: Sefrah, its treasury and its river. She has her mother's eyes and, she'd tell you, her mother's patience, which is to say none.", 1421),
  sefrah_priestess: person("sefrah_priestess", "Priestess Anzah", "Keeper of the Temple of the Hidden Sun, in mourning white. She reads Azhurak better than anyone in Sefrah, and admits it to nobody in particular.", 1422),
  sefrah_merchant: trader("sefrah_merchant", "Hadiya", "Keeps the Emporium on the bazaar. Speaks five languages and haggles in all of them.", 1423, "sefrah_bazaar"),
  sefrah_clothier: trader("sefrah_clothier", "Tahmira the tailor", "Dresses the Gilded Court in linen so fine it's mostly light. Her own sleeves are rolled to the elbow.", 1424, "sefrah_clothier"),
  sefrah_innkeeper: trader("sefrah_innkeeper", "Old Ezzar", "Keeps the Lamp and Palm. Has fed three generations of Khasreths and will tell you which of them tipped.", 1425, "sefrah_inn"),
  sefrah_smith: trader("sefrah_smith", "Kerub the smith", "Sefrah's smith: blades for the Gilded guard, hinges for the treasury, and opinions on both.", 1426, "sefrah_forge"),
  sefrah_guard: soldier("sefrah_guard", "Gilded guard", "One of the Gilded Court's guard: white linen, a gilt-hilted sabre, and a stare for anyone from Khetmar.", 1427),
  sefrah_villager: villager("sefrah_villager", "Sefrah citizen", "A citizen of the Gilded City in white linen, on the way to the bazaar, or the temple, or a quarrel about which heir is right.", 1428, [["dates", 0.5], ["flatbread", 0.3]]),
  tomb_keeper: person("tomb_keeper", "Embalmer Isk", "Keeper of the Matriarch's tomb and its ledger. Gentle, unhurried, and smelling of cedar oil and natron.", 1429),
  // Tamesh: the Obsidian Legacy.
  tamesh_meretkhet: person("tamesh_meretkhet", "Warden Meretkhet Khasreth", "The Matriarch's second child, Warden of the Obsidian Legacy: Tamesh, the quarries, and every monument in Kharaveth. Speaks slowly, as if each word had to be cut.", 1430),
  tamesh_mason: person("tamesh_mason", "Old Sarabek", "Tamesh's oldest master mason. He measured the Matriarch's tomb, and her mother's, and still uses the same cubit rod.", 1431),
  tamesh_quarrymaster: person("tamesh_quarrymaster", "Quarry-master Haddrem Vell", "Runs the Black Range quarries for the Legacy. Dust in every line of his face, and a new line since the Black Stair.", 1432),
  tamesh_clothier: trader("tamesh_clothier", "Ketty the weaver", "Weaves the Legacy's black linen and blue thread. If you want another colour, she'll tell you Sefrah is that way.", 1433, "tamesh_clothier"),
  tamesh_stonecutter: person("tamesh_stonecutter", "Tamesh stonecutter", "Grey to the elbows with stone dust, a chisel behind one ear.", 1434),
  tamesh_villager: villager("tamesh_villager", "Tamesh local", "Someone of the quarry town, in the Legacy's black and blue, with the dust of the Range on their sandals.", 1435, [["flatbread", 0.4]]),
  // Khetmar: the Copper Banner.
  khetmar_ardesh: soldier("khetmar_ardesh", "Marshal Ardesh Khasreth", "The Matriarch's youngest, Marshal of the Copper Banner: Khetmar, the roads and the army. He wears a coif instead of a helm, so you can see him frown.", 1440),
  khetmar_captain: soldier("khetmar_captain", "Captain Roshan Vey", "The Marshal's captain of riders. Has ridden the Khetmar Pass to the Rain Country's edge, and won't say what he saw there.", 1441),
  khetmar_outfitter: trader("khetmar_outfitter", "Quartermistress Dalla", "Keeps the Banner's armoury and its accounts, and doesn't like you near either.", 1442, "khetmar_outfitter"),
  khetmar_soldier: soldier("khetmar_soldier", "Copper Banner rider", "A rider of the Copper Banner in a copper-faced coat, saddle-sore, watching the road east.", 1443),
  khetmar_villager: villager("khetmar_villager", "Khetmar local", "Someone who lives in the Banner's shadow and sells it bread.", 1444, [["flatbread", 0.4]]),
  // The nomads.
  zuri_asmeh: person("zuri_asmeh", "Grandmother Asmeh", "Eldest of the Zuri, the Blue Smoke people. She has outlived four Khasreth matriarchs and plans to outlive the three heirs.", 1450),
  zuri_trader: trader("zuri_trader", "Tanu the trader", "Trades the Zuri's indigo cloth for anything that'll fit on a camel.", 1451, "zuri_trader"),
  zuri_ibbu: person("zuri_ibbu", "Ibbu", "Home among the blue fires, and easier for it.", 1411, { present: game => questDone(game, FOOTHOLD) && data(game, "ft_choice") === 1 }),
  zuri_villager: villager("zuri_villager", "Zuri nomad", "One of the Blue Smoke people in indigo and pale shawls, patient as the road.", 1452, [["dates", 0.6]]),
  ouresh_halzir: person("ouresh_halzir", "Rider-Captain Halzir", "Captain of the Ouresh salt riders. Has crossed the Sea of Dunes forty times and lost two camels, both of whom he still talks about.", 1453),
  ouresh_trader: trader("ouresh_trader", "Saltwife Meriam", "Keeps the Ouresh camp's goods and its accounts, which are written in salt.", 1454, "ouresh_trader"),
  ouresh_villager: villager("ouresh_villager", "Ouresh salt rider", "A salt rider in a white turban with a red tail, salt in the seams of everything.", 1455, [["rock_salt", 0.5]]),
};

const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const flag = (game: Game, key: string) => { if (!data(game, key)) game.player.questData[key] = 1; };
const say = (game: Game, text: string) => { message(game, text, "quest"); sound(game, "quest"); };
const mark = (done: boolean, text: string) => `${done ? "✓" : "•"} ${text}`;
const heirsHeard = (game: Game) => !!(data(game, "ms_seleneh") && data(game, "ms_ardesh") && data(game, "ms_meret"));
const wardsSet = (game: Game) => !!(data(game, "qw_n0") && data(game, "qw_n1") && data(game, "qw_n2"));
const sealRead = (game: Game) => "khasreth_seal" in game.player.mysteries.read;

export const HEARTLAND_QUESTS: readonly QuestDef[] = [
  {
    id: SEAL, name: "The Matriarch's Seal", points: 3, difficulty: "Intermediate", start: "Talk to Vizier Tamun Orrel in the Palace of the Gilded Court, Sefrah.",
    requirements: ["A Foothold in the Stone", "Mysteries: you'll have to read Azhurak glyphs"],
    rewards: ["3 Quest Points", "6,000 Presence XP", "3,000 Wayfaring XP", "5,000 coins", "The Sash of the Three Suns", "The heirs' Council of Three"],
    journal: game => {
      const s = stage(game, SEAL);
      if (s === 0) return ["The Grand Matriarch of House Khasreth is forty days dead, and her seal is missing. Her vizier in Sefrah wants somebody with no stake in it to look."];
      if (s === 1) return ["Without the seal, no heir is named, and each of the Matriarch's three children holds a third of Kharaveth. Vizier Orrel asked me to find it.",
        mark(!!data(game, "ms_seleneh"), "Hear Lady Seleneh, of the Gilded Court, in Sefrah's palace"),
        mark(!!data(game, "ms_ardesh"), "Hear Marshal Ardesh, of the Copper Banner, at Khetmar"),
        mark(!!data(game, "ms_meret"), "Hear Warden Meretkhet, of the Obsidian Legacy, at Tamesh"),
        mark(!!data(game, "ms_ledger"), "Read the ledger at the Matriarch's tomb, outside Sefrah's east gate")];
      if (s === 2) return ["The tomb's ledger says the Matriarch took the seal out herself, three days before she died, and signed for it with a ring with a point in it: the nomads' mark.",
        "• Ask the Zuri, at the tents with the blue smoke, north of the Ochre Spine"];
      if (s === 3) return ["Grandmother Asmeh of the Zuri kept the seal for the Matriarch: for whoever can read what's cut on it. The falcon has been cut off it, and glyphs cut in its place.",
        mark(sealRead(game), "Study the seal until I can read it all (Asmeh taught me some; Tamesh's masons know the glyph for measure)")];
      if (s === 4) return ["I can read the seal: By measure, to the many names, given.", "• Bring it to Vizier Orrel in Sefrah"];
      return ["I read the Matriarch's seal to her three heirs in Sefrah: she named none of them, and all of them. They've agreed to sit as a Council of Three, for a year, and to argue about it every day. QUEST COMPLETE!"];
    },
  },
  {
    id: SALT, name: "Salt and Blue Smoke", points: 1, difficulty: "Novice", start: "Talk to Rider-Captain Halzir at the Ouresh salt camp, in the Sea of Dunes.",
    requirements: ["A Foothold in the Stone", "Combat 45 recommended"],
    rewards: ["1 Quest Point", "2,500 Pursuance XP", "1,500 Presence XP", "1,500 coins", "A Blue Smoke turban and a salt rider's turban"],
    journal: game => {
      const s = stage(game, SALT);
      if (s === 0) return ["The Ouresh salt riders camp in the Sea of Dunes. Their captain looks like a man with a grievance."];
      if (s === 1) return ["The Ouresh and the Zuri share the Well of Tahr, the oasis between their grazing. It's fouled, and each says the other did it.",
        mark(!!data(game, "ss_asmeh"), "Hear the Zuri's side from Grandmother Asmeh"),
        mark(!!data(game, "ss_well"), "Look at the Well of Tahr myself"),
        mark(!!data(game, "ss_den"), "Deal with whatever is really fouling it")];
      if (s === 2) return ["It was neither of them: a hyena pack, dragging its kills into the well, led by an old matriarch the riders call Old Bitter-Laugh. She's dead.",
        mark(!!data(game, "ss_told_h"), "Tell Rider-Captain Halzir"), mark(!!data(game, "ss_told_a"), "Tell Grandmother Asmeh")];
      return ["The Ouresh and the Zuri share the Well of Tahr again: salt for the Zuri, smoke for the Ouresh, a cup at the well for whoever's thirsty. QUEST COMPLETE!"];
    },
  },
  {
    id: QUARRY, name: "What the Quarry Woke", points: 2, difficulty: "Intermediate", start: "Talk to Quarry-master Haddrem Vell at the Tamesh quarry.",
    requirements: ["A Foothold in the Stone", "Mining 30", "Combat 60 recommended"],
    rewards: ["2 Quest Points", "5,000 Mining XP", "3,500 Pursuance XP", "2,500 coins", "The obsidian mattock"],
    journal: game => {
      const s = stage(game, QUARRY);
      if (s === 0) return ["Tamesh's quarry-master looks like he hasn't slept since something happened at the Black Stair."];
      if (s === 1) return ["Tamesh's cutters broke through into steps going down under the Black Range: the Black Stair. Since then, dust walkers on the quarry road, and something below that walks.",
        mark(has(game.player, "ward_stone") || !!(data(game, "qw_s0") || data(game, "qw_s1") || data(game, "qw_s2")), "Find out what the cutters disturbed (the Stair is in the Range, east of Tamesh)"),
        mark(wardsSet(game), `Set the fallen ward stones back in their niches (${["qw_n0", "qw_n1", "qw_n2"].filter(key => data(game, key)).length}/3)`)];
      if (s === 2) return ["The wards are back in their niches. The warden of the Black Stair can be laid to rest now, if I'm strong enough.", mark(!!data(game, "qw_warden"), "Lay the Stair Warden to rest")];
      if (s === 3) return ["The Stair Warden fell, and stayed down. The Black Stair is in its measure again.", "• Tell Quarry-master Vell"];
      return ["The Black Stair is quiet, its wards set and its warden at rest, and Tamesh has walled the breach with a door and a lintel that says why. QUEST COMPLETE!"];
    },
  },
];

/** The heartlands' clues (things in the world to look into: see kharaveth.ts CLUES). */
type ClueOutcome = { to?: { x: number; y: number }; text?: string } | null;
type Clue = { options: (game: Game, object: WorldObject) => readonly string[]; examine: (game: Game, object: WorldObject) => string; use: (game: Game, object: WorldObject, option: string) => ClueOutcome };
const readClue = (lines: (game: Game, object: WorldObject) => string, effect?: (game: Game, object: WorldObject) => void): Clue => ({
  options: () => ["Read"], examine: lines, use: (game, object) => { const text = lines(game, object); effect?.(game, object); return { text }; },
});
const NICHE_KEYS = ["qw_n0", "qw_n1", "qw_n2"] as const, STONE_KEYS = ["qw_s0", "qw_s1", "qw_s2"] as const;
export const HEARTLAND_CLUES: Record<string, Clue> = {
  seven_crowns: readClue(game => `The fallen stone in the middle of the ring. On each standing stone round it, a figure with a crown, and over each, the same glyph. ${readInscription(game, "seven_crowns")}`, game => {
    learnGlyph(game, "crown", true); readInscription(game, "seven_crowns"); discover(game, "seven_crowns");
  }),
  first_names_door: {
    options: () => ["Read", "Knock"], examine: () => "A door cut into the living rock, an eye carved over it. It has no handle, no lock and no hinge you can see.",
    use: (game, _object, option) => {
      discover(game, "first_names_door");
      if (option === "Knock") return { text: "You knock. The sound goes a long way in, further than the cliff is deep. Nothing answers. Not yet, something in you says." };
      return { text: `Glyphs round the eye. ${readInscription(game, "first_names_door")}` };
    },
  },
  sunken_obelisk: readClue(game => `An obelisk sunk to its chest in the sand, the glyphs on its upper half clean of drift. ${readInscription(game, "sunken_obelisk")}`, game => discover(game, "sunken_obelisk")),
  pyramid_marks: readClue(game => `A tally cut in the casing stones, a stroke a day, rows of them. The last stroke stops halfway. Beside it, a block crumbling to grit, and a glyph under it: a line broken into dots. ${readInscription(game, "pyramid_marks")}`, game => {
    learnGlyph(game, "dust", true); readInscription(game, "pyramid_marks"); discover(game, "unfinished_pyramid");
  }),
  black_stair_lintel: readClue(game => `A lintel of black stone over the warden's chamber. ${readInscription(game, "black_stair_lintel")}`),
  black_stair_down: {
    options: () => ["Climb-down"], examine: () => "Steps cut down into the Black Range, under the quarry's spoil. Cold air comes up them.",
    use: (game, object) => ({ to: object.to!, text: stage(game, QUARRY) === 1 ? "You go down the Black Stair, past the cutters' dropped lamps, into the dark." : "You go down the Black Stair, into the dark under the Range." }),
  },
  ...Object.fromEntries([0, 1, 2].map((k): [string, Clue] => [`ward_stone_${k}`, {
    options: game => data(game, STONE_KEYS[k]) ? [] : ["Lift"],
    examine: game => data(game, STONE_KEYS[k]) ? "Where a ward stone lay." : "A stone the size of a loaf, cut with an eye and a bar on a point, lying where it fell. It's warm.",
    use: game => {
      if (data(game, STONE_KEYS[k])) return { text: "You've taken that one already." };
      if (stage(game, QUARRY) !== 1) return { text: "A warm stone, cut with an eye and a bar on a point. It's somebody's business where it goes, and not yet yours." };
      flag(game, STONE_KEYS[k]); giveOrDrop(game, "ward_stone"); learnGlyph(game, "eye", false); learnGlyph(game, "measure", false);
      return { text: "You lift the ward stone. It's warmer than it should be, and heavier on one side, as if it knew which way it ought to go." };
    },
  }])),
  ...Object.fromEntries([0, 1, 2].map((k): [string, Clue] => [`ward_niche_${k}`, {
    options: game => data(game, NICHE_KEYS[k]) ? [] : ["Set-stone"],
    examine: game => data(game, NICHE_KEYS[k]) ? "A ward niche with its stone set back in it, the eye facing out." : "An empty niche in the wall, the shape of a loaf, its back cut with an eye.",
    use: game => {
      if (data(game, NICHE_KEYS[k])) return { text: "Its stone is in. The niche is cool now." };
      if (stage(game, QUARRY) !== 1 || !has(game.player, "ward_stone")) return { text: "An empty niche. Something that was meant to be here isn't." };
      take(game.player, "ward_stone", 1); flag(game, NICHE_KEYS[k]); addXp(game, "mining", 800, { raw: true });
      if (wardsSet(game)) { game.player.quests[QUARRY] = 2; discover(game, "black_stair_wards"); say(game, "The three wards are set. Below, something heavy stops walking, and turns."); }
      return { text: "You set the stone in the niche. It goes in the last inch on its own, and the warmth goes out of it." };
    },
  }])),
  tomb_ledger: readClue(game => stage(game, SEAL) >= 1
    ? "The embalmers' ledger, every coming and going at the tomb. Forty-three days ago, in the Matriarch's own hand: the seal of the House, withdrawn from the tomb's keeping, for safekeeping elsewhere. Signed not with her name but with a ring with a point in it."
    : "The embalmers' ledger, every coming and going at the tomb, in a careful hand.", game => {
    if (stage(game, SEAL) === 1 && !data(game, "ms_ledger")) { flag(game, "ms_ledger"); learnGlyph(game, "name", false); if (heirsHeard(game)) advanceSeal(game); else say(game, "The Matriarch signed with the nomads' mark. Hear the heirs out, then ask the Zuri."); }
  }),
  well_tahr: {
    options: () => ["Inspect"], examine: () => "The Well of Tahr: a stone-lipped well in the oasis between the dunes and the Spine. It smells wrong.",
    use: game => {
      if (stage(game, SALT) !== 1) return { text: questDone(game, SALT) ? "Clean water, a cup on a string, and salt and blue cloth tied to the well-post." : "The water smells of carrion. Nobody's drawing from it." };
      flag(game, "ss_well");
      return { text: "Bones in the water, gnawed. Tracks all round the lip: not boots, not camels. Paws, a whole pack, coming and going from the south-west, towards the end of the Spine. And the well rope's been chewed through, not cut." };
    },
  },
};
function advanceSeal(game: Game) {
  game.player.quests[SEAL] = 2; say(game, "The heirs each blame the others. The Matriarch's own hand points to the nomads.");
}

/** Study the Matriarch's seal: see its glyphs, read what you can; reading it all moves the quest on. */
export function studySeal(game: Game): string {
  const text = readInscription(game, "khasreth_seal");
  if (sealRead(game)) {
    discover(game, "three_suns");
    if (stage(game, SEAL) === 3) { game.player.quests[SEAL] = 4; say(game, "You can read the Matriarch's seal. Take it to Vizier Orrel."); }
  }
  return `The seal of House Khasreth, the falcon cut away. ${text}`;
}

export function talkHeartlands(game: Game, npcId: string, name: string): Dialogue | null {
  const player = game.player, s = stage(game, SEAL);
  switch (npcId) {
    // ---------- Sefrah ----------
    case "sefrah_vizier": {
      if (!questDone(game, FOOTHOLD)) return chat(name, npcSays(name, "Hollowmere's people are welcome in Sefrah. Hollowmere's questions will have to wait: the House is in mourning."));
      if (s === 0) return chat(name, npcSays(name, "You're the one who walked Foothold's missing people out from under the Sunteeth. The steppe talks about you, and so the bazaar does.", "The Grand Matriarch is forty days dead. By the House's law her seal goes to the heir she chose, and the seal has gone. Without it, Seleneh holds Sefrah, Meretkhet holds Tamesh, Ardesh holds Khetmar, and each of them holds a knife."), [
        { label: "I'll find the seal.", then: () => chat(name, npcSays(name, "An outsider, with no stake in it. That's what I hoped. Hear the heirs: Seleneh is here in the palace, Meretkhet at Tamesh, Ardesh at Khetmar. And the tomb's ledger is kept outside the east gate. Embalmer Isk keeps a careful book."), undefined, () => { player.quests[SEAL] = 1; say(game, "Quest started: The Matriarch's Seal."); }) },
        { label: "What's the seal?", then: () => chat(name, npcSays(name, "A cylinder of black stone, the falcon of House Khasreth cut in it. Rolled across wet clay, it makes an order the whole country obeys. Rolled across nothing, it's a stone. At the moment it's a stone nobody can find."), [{ label: "I'll look for it.", then: () => null }]) },
        { label: "Not now.", then: () => null },
      ]);
      if (s >= 1 && s <= 3) return chat(name, npcSays(name, pick(game, ["The heirs dine together on feast days, and taste each other's wine first. It's lovely to see family close.", "The seal, when you find it, comes to me. Not to an heir. To me, and then to all three.", "She knew she was dying. She planned everything. She'd have planned this."])));
      if (s === 4) return chat(name, npcSays(name, "You have it. And you can read it? Read it to me."), [
        { label: "\"By measure, to the many names, given.\"", then: () => chat(name, npcSays(name, "To the many names. Not one. She had the falcon cut off it so none of them could seal alone.", "I'll call the three of them to the palace. You'll read it to them, as you read it to me. They'll believe a stranger who can read Azhurak sooner than a vizier who can read them."), [
          { label: "Read it to the heirs.", then: () => chat(name, npcSays(name, "Seleneh laughed. Meretkhet nodded, as if he'd known. Ardesh asked for it read again, slower. Then they agreed, all three, to sit as a Council of Three for a year, and to roll the seal together or not at all.", "It won't last. It'll last a year. A year is a great deal, in Kharaveth. Take this, from the three of them, and the House's thanks."), undefined, () => finishSeal(game)) },
        ]) },
      ]);
      return chat(name, npcSays(name, pick(game, ["The Council of Three meets every morning and agrees on nothing until noon. That's progress.", "The Matriarch would have liked you. She liked anyone who read before they spoke.", "Hollowmere's commander has written asking for a treaty. The Council will answer. Eventually. In three hands."])));
    }
    case "sefrah_seleneh": {
      if (s === 1 && !data(game, "ms_seleneh")) return chat(name, npcSays(name, "The vizier sent you. Good: an outsider can't be bought, only rented.", "Mother's last visitor, the week she died, was a nomad woman with blue cloth on her head. My brother's riders stopped her caravan on the Khetmar road and searched it. Ask Ardesh what they found, and why he never told me."), undefined, () => { flag(game, "ms_seleneh"); if (heirsHeard(game) && data(game, "ms_ledger")) advanceSeal(game); });
      if (questDone(game, SEAL)) return chat(name, npcSays(name, pick(game, ["A council. Mother always did like an audience.", "I chair the Council on the days ending in a vowel. We're still arguing about which those are."])));
      return chat(name, npcSays(name, pick(game, ["Sefrah is the Gilded City because we pay for things. Tamesh is the oldest because it says so. Khetmar is the strongest because it hasn't been tested.", "My mother ruled forty years and never raised her voice. She had other people do it."])));
    }
    case "sefrah_priestess": {
      // She knows the eye, and what's first: the temple's own words.
      const taught = glyphState(game, "eye") < 2 || glyphState(game, "first") < 2;
      if (taught) return chat(name, npcSays(name, "You read the old letters? Then learn two the temple keeps. An almond with a point in it is the eye: seeing, keeping. One stroke with a cap is first: before anything else.", "The Hidden Sun's mysteries are closed while the House mourns. When they open again, come back. You'll want to have read a great deal by then."), undefined, () => { learnGlyph(game, "eye", true); learnGlyph(game, "first", true); });
      return chat(name, npcSays(name, pick(game, ["The temple is in mourning. The Hidden Sun doesn't mind; it's hidden.", "The obelisk behind me is older than the temple, and the temple is older than the city. We built round what was already here. Everyone in Kharaveth does.", "There's a hall in the Spine where the first names are kept. The door doesn't open for priests. I've tried."])));
    }
    case "tomb_keeper": return chat(name, npcSays(name, s === 1 && !data(game, "ms_ledger") ? "The ledger's on the table inside, every coming and going. Read it; it's what it's for. Mind the casing stones, they're numbered."
      : pick(game, ["The Matriarch rests well. The casing will be finished by spring, if the Legacy sends the stone and the Court sends the gold.", "Three suns on the lid, she asked for. No falcon. I cut what I'm asked."])));
    case "sefrah_guard": return chat(name, npcSays(name, pick(game, ["Move along. Sefrah's peaceful, and we're paid to keep it so.", "Banner riders come in by the east gate in threes. We count them going out.", "The Treasury is on your left. Your purse is on your right. Keep them apart."])));
    case "sefrah_villager": return chat(name, npcSays(name, pick(game, ["The Lady will win. She has the gold.", "The Warden will win. He has the stone, and the stone remembers.", "The Marshal will win. He has the spears. Everybody has spears, though.", "Dates! You must try the dates. Everyone says that, I know. Try them anyway."])));
    case "sefrah_merchant": return chat(name, npcSays(name, pick(game, ["Rope, rosewater, rock salt. If it's sold in Kharaveth, it's sold here, dearer.", "Hollowmere coin? I take it. At Hollowmere's rate, which is my rate."])));
    case "sefrah_clothier": return chat(name, npcSays(name, "Gilded linen: white, whiter, and the white the Court wears. Try a headcloth. You'll stop squinting."));
    case "sefrah_innkeeper": return chat(name, npcSays(name, pick(game, ["Sit. Eat. The lamb's been on since dawn.", "The Matriarch ate here as a girl, before anyone called her anything. Paid, too."])));
    case "sefrah_smith": return chat(name, npcSays(name, "Blackiron for the guard, gilt for the guard's pride. Buy the first; the second costs extra."));
    // ---------- Tamesh ----------
    case "tamesh_meretkhet": {
      if (s === 1 && !data(game, "ms_meret")) return chat(name, npcSays(name, "The seal. Yes. At the end, Mother had it recut. My masons saw: the falcon taken off, glyphs put on. She didn't tell me what they said. She told me I'd have to read it, like anyone.", "Do you read? The filled square is stone, a built thing. Start there. Everything in Kharaveth starts there."), undefined, () => {
        flag(game, "ms_meret"); learnGlyph(game, "stone", true); if (heirsHeard(game) && data(game, "ms_ledger")) advanceSeal(game);
      });
      if (stage(game, QUARRY) === 1) return chat(name, npcSays(name, "The quarry broke into something old. The Legacy keeps every monument in Kharaveth, and so the Legacy will put it right. Quietly. Vell will tell you what's needed."));
      return chat(name, npcSays(name, pick(game, questDone(game, SEAL) ? ["A council. Mother cut it in stone, and stone is what we keep.", "My sister thinks gold lasts. My brother thinks spears do. Stone does."]
        : ["Every stone in Sefrah's walls was cut here. Seleneh forgets it twice a year, at tax time.", "The Legacy keeps the monuments. We didn't build all of them. We keep them anyway."])));
    }
    case "tamesh_mason": {
      // The masons' glyph: a bar on a point is measure, what is owed.
      if (glyphState(game, "measure") < 2) return chat(name, npcSays(name, "The bar on a point? That's the masons' own glyph: measure. What is owed: so many cubits, so many days, so much stone. Azhurak cut it on every block they dressed, and so do we.", "If a thing's in its measure, it stays. If it isn't, it moves. Stone or people."), undefined, () => learnGlyph(game, "measure", true));
      return chat(name, npcSays(name, pick(game, ["I measured the Matriarch's tomb. A cubit short on the east face. She asked for it. Wouldn't say why.", "The Unfinished Pyramid? The tally stops mid-stroke. Builders don't stop mid-stroke. Not for rain, not for war.", "Same rod for sixty years. It's the cubits that have changed."])));
    }
    case "tamesh_quarrymaster": {
      const q = stage(game, QUARRY);
      if (q === 0) return chat(name, npcSays(name, "We cut into the Range east of town for the Matriarch's casing stone, and the rock gave way under the cutters: steps, going down. Black steps. They went down with lamps and came up without them, running.", "Since then, dust walkers on the quarry road, and at night, from the hole, something walking. Slowly. As if it were counting."), [
        { label: "I'll go down the Black Stair.", then: () => chat(name, npcSays(name, "The cutters say they knocked things over in the dark: stones, set in the walls, the size of a loaf. If you'd put back what we knocked out, the Legacy would remember you. I would."), undefined, () => { player.quests[QUARRY] = 1; say(game, "Quest started: What the Quarry Woke."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (q === 1) return chat(name, npcSays(name, "East into the Range from the quarry, a little south. The cutters' tools are still where they dropped them. Find the stones; find where they go."));
      if (q === 2) return chat(name, npcSays(name, "The dust walkers went still on the road an hour ago, all at once. But the hole's still breathing. Whatever walks down there is still walking."));
      if (q === 3) return chat(name, npcSays(name, "It's quiet. The hole's quiet. The cutters are back at the face, and nobody's going near the Stair again.", "The Warden says the Legacy will build a door there, with a lintel that says why. Here. The Warden's own mattock, from the Legacy. He said you'd earned it."), undefined, () => finishQuarry(game));
      return chat(name, npcSays(name, pick(game, ["The Black Stair has a door now. It's a good door. I don't open it.", "Casing stone for the tomb, on time, for once."])));
    }
    case "tamesh_stonecutter": return chat(name, npcSays(name, pick(game, stage(game, QUARRY) === 1 ? ["I was down there. I dropped my lamp. I'm not going back for it.", "The stones in the walls were warm. Warm, in the dark."] : ["Black stone's the hardest to cut and the best to keep. Like the Warden.", "Mind the face. It talks before it falls, if you listen."])));
    case "tamesh_villager": return chat(name, npcSays(name, pick(game, ["The Warden will win. He's patient, and the others aren't.", "Tamesh cut every stone in Sefrah. Sefrah forgets.", "Don't drink from the quarry well at noon. Don't ask why. Just don't."])));
    case "tamesh_clothier": return chat(name, npcSays(name, "Black and blue. The Legacy's colours, and the only ones I weave. Sefrah's that way, if you want white."));
    // ---------- Khetmar ----------
    case "khetmar_ardesh": {
      if (s === 1 && !data(game, "ms_ardesh")) return chat(name, npcSays(name, "My riders stopped a Zuri caravan on the road the day Mother died. They searched it. They found nothing, because there was nothing to find: the old woman had already gone home.", "If my sister wants to know what I know, she can ride here and ask me. And ask the Zuri. Mother trusted the nomads more than she trusted any of us. That's not a complaint. It's a plan."), undefined, () => { flag(game, "ms_ardesh"); if (heirsHeard(game) && data(game, "ms_ledger")) advanceSeal(game); });
      return chat(name, npcSays(name, pick(game, questDone(game, SEAL) ? ["A Council of Three. I've agreed to it. I'm keeping my riders on the road, too.", "Mother cut the falcon off her seal. She cut the claws off all of us."]
        : ["The Banner holds the east. The east is where the trouble will come from. It always is.", "My sister counts gold and my brother counts stones. I count spears, and I come up short."])));
    }
    case "khetmar_captain": return chat(name, npcSays(name, pick(game, ["The pass goes east into green country. Rain, every afternoon, like a bell. They call it the Rain Country, the caravans. They call it something else themselves.", "Don't ride east alone. Ride east with a caravan, and ride back with it.", "The Marshal's a good soldier. He'd be a better one if he'd stop being a son."])));
    case "khetmar_soldier": return chat(name, npcSays(name, pick(game, ["Copper Banner. We hold the road. You're on it.", "Gilded guards in Sefrah, all linen and gilt. A real wind would take them.", "The Rain Country sends traders through the pass. Spices, cloth, and stories we're not supposed to repeat."])));
    case "khetmar_villager": return chat(name, npcSays(name, pick(game, ["The Marshal will win. Who else can stop him?", "Bread for the Banner, morning and night. Nobody asks if the baker's tired."])));
    case "khetmar_outfitter": return chat(name, npcSays(name, "Banner coats, coifs, boots. Pay first. The Banner doesn't give credit; it's a fortress, not a friend."));
    // ---------- The nomads ----------
    case "zuri_asmeh": {
      const salt = stage(game, SALT);
      if (salt === 1 && !data(game, "ss_asmeh")) return chat(name, npcSays(name, "The Ouresh say we fouled the well? The Ouresh say the wind is their cousin. We've drunk from Tahr since before the Khasreths had a falcon. Why would we foul it?", "Go and look at it, if you want to know. Not at us. At it."), undefined, () => flag(game, "ss_asmeh"));
      if (salt === 2 && !data(game, "ss_told_a")) return chat(name, npcSays(name, "Hyenas. Of course. Old Bitter-Laugh. She's older than my grandson and smarter than the Ouresh captain.", "Tell Halzir the Zuri will bring smoke to the well, and he can bring his salt, and we'll see whose cup is cleaner."), undefined, () => { flag(game, "ss_told_a"); finishSaltIfDone(game); });
      if (s === 2) return chat(name, npcSays(name, "The ring with a point in it. Our mark for the road below, and for what's kept. You followed it here. Good.", "Ushara came to my fire the month before she died, and gave me her seal, and said: for whoever can read what's cut on it. Not for her children. For whoever reads."), [
        { label: "Can I see it?", then: () => chat(name, npcSays(name, "Take it. You'll need to read it. I'll give you what I know: the open ring is a name. Three points in a row are many. An open hand is giving.", "The bar on a point, the masons in Tamesh call measure. Ask them. They like being asked."), undefined, () => {
          giveOrDrop(game, "khasreth_seal"); learnGlyph(game, "name", true); learnGlyph(game, "many", true); learnGlyph(game, "hand", true);
          player.quests[SEAL] = 3; say(game, "Grandmother Asmeh gave you the Matriarch's seal. Study it.");
        }) },
      ]);
      if (s === 3 && !has(player, "khasreth_seal")) return chat(name, npcSays(name, "Lost it? Ushara would laugh. Here: I had a second made. In clay. It's the same, except it isn't."), undefined, () => giveOrDrop(game, "khasreth_seal"));
      if (questDone(game, FOOTHOLD) && data(game, "ft_choice") === 2 && !data(game, "zr_ibbu")) return chat(name, npcSays(name, "Ibbu sent word with a salt caravan: a stranger who keeps a road. Sit at our fire whenever you like."), undefined, () => flag(game, "zr_ibbu"));
      return chat(name, npcSays(name, pick(game, ["We were here before the Khasreths had a name. We'll be here after they've finished arguing about it.", "The blue smoke is resin from the Spine, and a thing we add that I won't tell you. It's so our people can find us, and others can't.", "The dynasties build in stone so they'll be remembered. We build in smoke so we won't be followed."])));
    }
    case "zuri_ibbu": return chat(name, npcSays(name, pick(game, ["You found the blue fires. Good. Sit; there's tea, and it's terrible.", "The road below goes further than the Sunteeth. Grandmother knows where. She'll tell you when you've read enough."])));
    case "zuri_trader": return chat(name, npcSays(name, "Indigo cloth, dates, water, a good rope. Things for the road. Things that fit on a camel."));
    case "zuri_villager": return chat(name, npcSays(name, pick(game, ["Grandmother Asmeh decides where we go. Grandmother decides most things.", "The Ouresh? Good riders. Bad cooks. Worse neighbours.", "Follow the blue smoke, and you'll find us. Unless we don't want you to."])));
    case "ouresh_halzir": {
      const salt = stage(game, SALT);
      if (!questDone(game, FOOTHOLD)) return chat(name, npcSays(name, "Hollowmere? Hollowmere's camp is behind its fence. Come back when they've let you out."));
      if (salt === 0) return chat(name, npcSays(name, "The Well of Tahr is fouled. Rotten. My camels won't drink, and a camel that won't drink is a very expensive rug.", "The Zuri did it. They want the oasis for their goats and their smoke. I'd ride over and say so, but the last time we said so it took a year to stop saying so."), [
        { label: "I'll find out who fouled the well.", then: () => chat(name, npcSays(name, "Find out it's the Zuri, you mean. Fine. Talk to their grandmother, if she'll talk. The well's south-east of here, in the oasis between the dunes and the Spine."), undefined, () => { player.quests[SALT] = 1; say(game, "Quest started: Salt and Blue Smoke."); }) },
        { label: "Not now.", then: () => null },
      ]);
      if (salt === 1) return chat(name, npcSays(name, "Well? Was it the Zuri? It was the Zuri."));
      if (salt === 2 && !data(game, "ss_told_h")) return chat(name, npcSays(name, "Hyenas. Bitter-Laugh. That old thief stole a camel calf from me two summers ago, and I blamed the Zuri for that too.", "Tell the grandmother... no. I'll tell her. I'll take her salt. That's how we say it."), undefined, () => { flag(game, "ss_told_h"); finishSaltIfDone(game); });
      return chat(name, npcSays(name, pick(game, ["Salt from the flats past the dunes, to Sefrah, to Khetmar, to anyone who pays. The Sea of Dunes is a road if you know it, and a grave if you don't.", "Forty crossings. Two camels lost. Hamra and Little Hamra. Good camels."])));
    }
    case "ouresh_trader": return chat(name, npcSays(name, "Salt, dates, water. The three things worth carrying across the dunes. Four, if you count the trader."));
    case "ouresh_villager": return chat(name, npcSays(name, pick(game, ["Salt in your boots means you've been somewhere.", "The Zuri? We don't speak. Well. We speak. We don't listen.", "Don't cross the dunes at noon. Don't cross them at night either. Cross them in the morning, quickly."])));
  }
  return null;
}

function finishSeal(game: Game) {
  take(game.player, "khasreth_seal", 1);
  giveOrDrop(game, "coins", 5000); giveOrDrop(game, "three_suns_sash");
  addXp(game, "presence", 6000, { raw: true }); addXp(game, "agility", 3000, { raw: true });
  completeQuest(game, SEAL);
}
function finishSaltIfDone(game: Game) {
  if (!data(game, "ss_told_h") || !data(game, "ss_told_a") || questDone(game, SALT)) return;
  giveOrDrop(game, "coins", 1500); giveOrDrop(game, "blue_smoke_turban"); giveOrDrop(game, "salt_turban");
  addXp(game, "slayer", 2500, { raw: true }); addXp(game, "presence", 1500, { raw: true });
  completeQuest(game, SALT);
}
function finishQuarry(game: Game) {
  giveOrDrop(game, "coins", 2500); giveOrDrop(game, "obsidian_mattock");
  addXp(game, "mining", 5000, { raw: true }); addXp(game, "slayer", 3500, { raw: true });
  completeQuest(game, QUARRY);
}

export function onHeartlandsKill(game: Game, monsterId: string) {
  if (monsterId === "tahr_matriarch" && stage(game, SALT) === 1 && data(game, "ss_well") && !data(game, "ss_den")) {
    flag(game, "ss_den"); game.player.quests[SALT] = 2; say(game, "Old Bitter-Laugh is dead. Tell the Ouresh captain and the Zuri grandmother what was really in their well.");
  }
  if (monsterId === "stair_warden") {
    discover(game, "warden_ring");
    if (stage(game, QUARRY) === 2) { flag(game, "qw_warden"); game.player.quests[QUARRY] = 3; say(game, "The Stair Warden falls, and this time it stays down. Tell the quarry-master."); }
    else if (stage(game, QUARRY) === 1) message(game, "The Warden falls to dust, and the dust gathers itself back up. While its wards lie scattered, it won't stay down.", "warn");
  }
}
void knows;
