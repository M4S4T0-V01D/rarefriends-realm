/**
 * Your Friend has a voice. It reacts to the world now and then, in its family's own manner: a Skeleton is dry, a Colossus
 * blunt, a Hoverer curious, a Mask says little, a Sparkling Friend can't contain itself. Lines are chosen from what's
 * actually going on (where you are, the weather, the hour, what's near, what you're doing) and from what you've lived
 * (first times, old haunts, how you've spent your days), never from a random pool. A cooldown keeps it from chattering;
 * a setting (Friend speech: full, reduced, rare, off) keeps it quiet if you'd rather; the lines that matter still land.
 *
 * Output: a word over your Friend's head and a line in chat as "<name>: …"; on "full", other players nearby hear it too.
 */
import { FAMILY_NAMES, MONSTERS, item, levelForXp } from "./data.ts";
import { addXp, emit, message, type Game, type Player } from "./state.ts";
import { isUnderground, objectAtTile, regionAt } from "./world.ts";
import { playerName, presenceLevel } from "./presence.ts";

export type FriendSpeech = "full" | "reduced" | "rare" | "off";
export type FriendEvent =
  | "region" | "revisit" | "night" | "rain" | "creature" | "creature_again" | "dragon" | "dragon_again" | "undead" | "grave" | "altar" | "statue"
  | "fight" | "hurt" | "rare" | "quest" | "boss" | "death" | "mount" | "fellowship" | "mastery" | "tired" | "mine" | "chop" | "bones" | "underground" | "mountain" | "sea" | "hollow"
  | "mixture" | "outfit" | "friend_near" | "idle";
/** How far apart lines are, by setting (ticks), and which events still speak on "rare". */
const GAP: Record<FriendSpeech, number> = { full: 40, reduced: 120, rare: 400, off: Infinity };
const IMPORTANT = new Set<FriendEvent>(["region", "dragon", "boss", "death", "quest", "mastery", "hollow", "fellowship", "mount"]);
/** Each event's own cooldown (ticks), so the same kind of remark doesn't come round too soon. */
const EVENT_GAP: Partial<Record<FriendEvent, number>> = { creature: 300, creature_again: 600, undead: 400, grave: 900, altar: 900, statue: 900, fight: 200, hurt: 150, tired: 500, mine: 700, chop: 700, bones: 600, mountain: 1500, sea: 1500, idle: 1200, friend_near: 1500, outfit: 600, rain: 800, night: 1600 };

type Voice = Partial<Record<FriendEvent, readonly string[]>>;
/** Every family's manner. {name} is a named thing (region, creature), {n} a count. */
const VOICES: readonly Voice[] = [
  // 0 Skeleton: dry, morbid, a little sarcastic.
  { region: ["{name}. Looks like somewhere people die.", "{name}. I've seen worse. I've been worse."], revisit: ["{name} again. Still standing, both of us."], night: ["Dark. Good. Fewer people staring.", "Night. My favourite colour."], rain: ["At least I don't have to worry about getting wet."],
    creature: ["Is that a {name}? Friends of mine?", "A {name}. It looks hungry. Not my problem."], creature_again: ["Another {name}. We know how this ends."], dragon: ["A dragon. Well. That's a lot of bones."], dragon_again: ["Another one."], undead: ["Friends of mine?", "They've let themselves go."],
    grave: ["Finally. Someone who planned ahead.", "Nice plot. Quiet neighbours."], altar: ["Bones go here. I know how this feels."], statue: ["The beard's a nice touch."], fight: ["Try not to hit anything I'd miss.", "This again."], hurt: ["I've seen worse.", "That's going to show."],
    rare: ["Shiny. Put it somewhere I can see it."], quest: ["Done. Where do they bury the thanks?"], boss: ["It's down. Stay down. I would."], death: ["Well. That's one way to see the place."], mount: ["It has more legs than I have. Fine."], fellowship: ["A company. Mine's a long story."], mastery: ["Ninety-nine. Took us long enough."],
    tired: ["Walking's fine. Walking's dignified."], mine: ["Rocks. Harder than bones. Barely."], chop: ["A tree. It won't feel a thing."], bones: ["These belong somewhere."], underground: ["This feels familiar.", "Home, almost."], mountain: ["Big rock. Old rock."], sea: ["The sea. Wet. No thank you."], hollow: ["…", "Something here knows my name."],
    mixture: ["Marrow. Yes. That's the stuff."], outfit: ["We're really wearing this?"], friend_near: ["Another one of us. Act natural."], idle: ["…", "Hmm.", "Still here."] },
  // 1 Mask: says little, means more.
  { region: ["{name}.", "{name}. New faces."], revisit: ["{name}. We've worn this one before."], night: ["Night suits a mask."], rain: ["…"], creature: ["A {name}. Keep still.", "{name}. It hasn't seen us."], creature_again: ["{name}. Again."], dragon: ["A dragon. Don't blink."], dragon_again: ["…again."], undead: ["They wear faces too. Badly."],
    grave: ["Someone's face is under there."], altar: ["Faces come off here, they say."], statue: ["A face that stayed."], fight: ["Watch its eyes."], hurt: ["…that one got through."], rare: ["Ours now."], quest: ["Done. Say nothing."], boss: ["It had a face. Now it doesn't."], death: ["We were seen."], mount: ["High. Good."], fellowship: ["A company of masks."], mastery: ["Ninety-nine. Nobody saw it coming."],
    tired: ["Slow is quiet."], mine: ["Stone keeps secrets."], chop: ["The trees are listening."], bones: ["…"], underground: ["Dark. Good."], mountain: ["Thin air. Thin faces."], sea: ["The sea has no face."], hollow: ["It's looking for one of us.", "…don't answer it."], mixture: ["Many faces. All mine."], outfit: ["A disguise. Finally."], friend_near: ["A face I know."], idle: ["…", "…", "Hm."] },
  // 2 Family: warm, fussing, talks about home.
  { region: ["{name}! Oh, look at it.", "{name}. Let's find somewhere warm."], revisit: ["{name} again. Feels like coming home."], night: ["Getting dark. Have we eaten?"], rain: ["Rain! We should be indoors with soup."], creature: ["A {name}! Careful, love.", "There's a {name}. Stay close."], creature_again: ["Another {name}. We've managed worse."], dragon: ["A DRAGON. Hold my hand."], dragon_again: ["Another one. Deep breath."], undead: ["Those poor things. Somebody's family."],
    grave: ["Somebody's remembered. That's nice."], altar: ["Say something for the folks at home."], statue: ["He looks like my grandad."], fight: ["Be careful! I mean it!"], hurt: ["Oh! Are you all right?"], rare: ["Look what we found! We're keeping it."], quest: ["We did it. I'm so proud."], boss: ["It's over. Come here."], death: ["We're all right. We're all right."], mount: ["Hello, you lovely thing."], fellowship: ["A family that picked us. Imagine."], mastery: ["Ninety-nine! Wait till I tell everyone."],
    tired: ["Let's just walk. No rush."], mine: ["Mind your fingers."], chop: ["Firewood for later."], bones: ["Bury them nicely."], underground: ["It's damp. Don't catch a chill."], mountain: ["What a view. Mind the edge."], sea: ["Smell that air."], hollow: ["I don't like it here. Let's not stay."], mixture: ["Oh, that's warm. That's lovely."], outfit: ["Very smart. Turn round."], friend_near: ["Another Friend! Say hello."], idle: ["Hmm.", "Are you hungry?", "Nice day for it."] },
  // 3 Cellular: curious, scientific, counts things.
  { region: ["{name}. New sample.", "{name}. Note the flora."], revisit: ["{name}. Same as last time, roughly."], night: ["Light levels dropping. Noted."], rain: ["Precipitation. Good for the fungi."], creature: ["A {name}. Observe it.", "Specimen: {name}."], creature_again: ["{name}, specimen {n}."], dragon: ["A dragon. The size of it. Measure it later."], dragon_again: ["Another. The population's healthy."], undead: ["Dead tissue, still moving. Fascinating. Horrible."],
    grave: ["Decomposition. Nature's own apothecary."], altar: ["Interesting residue."], statue: ["Lichen on the beard. Old."], fight: ["Watch its pattern."], hurt: ["Tissue damage. Regenerating."], rare: ["Rare. One in how many?"], quest: ["Hypothesis confirmed. Reward collected."], boss: ["Big sample. Down."], death: ["Cell death. Temporary."], mount: ["Four legs. Efficient."], fellowship: ["A colony. Good."], mastery: ["Ninety-nine. The curve finally flattens."],
    tired: ["Energy reserves low. Walk."], mine: ["Good ore. Veins run that way."], chop: ["Count the rings."], bones: ["Calcium. Useful."], underground: ["Humid. Things grow here."], mountain: ["Thin air. Tall plants."], sea: ["Salt. Kelp. Pearlweed, if we're lucky."], hollow: ["Nothing grows here. Nothing. That's wrong."], mixture: ["Division. I can feel it splitting."], outfit: ["Protective, presumably."], friend_near: ["Another of us. Compare notes."], idle: ["Hmm.", "Interesting.", "Noted."] },
  // 4 Asymmetry: lopsided, odd, funny by accident.
  { region: ["{name}. It's crooked. I like it.", "{name}. Hm. The left side's better."], revisit: ["{name}, the second time. Or third. I lose count on one side."], night: ["One eye says night. The other disagrees."], rain: ["Rain on the left. Dry on the right. Typical."], creature: ["A {name}. It's looking at my good side."], creature_again: ["{name}. It's leaning. Like me."], dragon: ["A dragon! Which end is the front?"], dragon_again: ["Another one. Still can't tell which end."], undead: ["They're falling apart. Relatable."],
    grave: ["Crooked stone. My kind of stone."], altar: ["It's off-centre. I approve."], statue: ["His beard's longer on the left. Good."], fight: ["Hit it with the heavy side."], hurt: ["Ow. The other side's fine."], rare: ["Ooh. Lopsided luck."], quest: ["Done. Mostly. The good half."], boss: ["It fell over. So do I, sometimes."], death: ["That tipped me over."], mount: ["It walks straighter than I do."], fellowship: ["A company. I'll stand at the odd end."], mastery: ["Ninety-nine. Sideways, but we got there."],
    tired: ["Walk. Lean into it."], mine: ["Rocks are all lumpy. Finally, company."], chop: ["It'll fall left. Trust me."], bones: ["Mine don't match either."], underground: ["It slopes. Everything slopes."], mountain: ["A hill with ideas."], sea: ["The sea's level. Show-off."], hollow: ["Everything here is wrong in the same direction."], mixture: ["Lopsided? More lopsided. Perfect."], outfit: ["Does it come in uneven?"], friend_near: ["Another one! Stand on my good side."], idle: ["Hmm?", "Whoa.", "…what?"] },
  // 5 Hoverer: energetic, curious, always looking further.
  { region: ["{name}! What's over there?", "{name}. Let's see all of it."], revisit: ["{name} again! Did we check the far side last time?"], night: ["It's dark. Everything's an adventure in the dark."], rain: ["Rain! Race you to the next roof."], creature: ["Wait. What's that? A {name}!"], creature_again: ["{name}! Let's go round it. Or over."], dragon: ["Is that a DRAGON?!"], dragon_again: ["Another dragon! Can we keep one?"], undead: ["They're so slow. We could just… float."],
    grave: ["Quiet here. Let's not stay."], altar: ["Ooh. What does it do?"], statue: ["We could get up there."], fight: ["Go go go!"], hurt: ["Ow! Okay. Moving!"], rare: ["Look! LOOK!"], quest: ["Done! What's next? What's NEXT?"], boss: ["We did it! Did you see that?!"], death: ["…okay. Okay. Again."], mount: ["Faster! Yes!"], fellowship: ["A company! More people to show things to."], mastery: ["Ninety-nine! Is there a hundred?"],
    tired: ["Okay… maybe we walk."], mine: ["Boring. What's under it, though?"], chop: ["Timber! Was that right?"], bones: ["Eugh. Carry them anyway."], underground: ["It's dark. I love it. I hate it."], mountain: ["We could get up there. We should get up there."], sea: ["I can see something! Out past the isles!"], hollow: ["I don't want to float here.", "Something's pulling. Downwards."], mixture: ["I'm not touching the ground. I'M NOT TOUCHING THE GROUND."], outfit: ["Ooh. Do I look fast?"], friend_near: ["Hi! HI!"], idle: ["What's over there?", "Hmm!", "Did you hear that?"] },
  // 6 Colossus: slow, blunt, physical.
  { region: ["{name}. Big.", "{name}. Good ground."], revisit: ["{name}. Been here."], night: ["Dark. Fine."], rain: ["Wet."], creature: ["A {name}. I could fight that."], creature_again: ["{name}. Again. Fine."], dragon: ["Dragon. Big. Good."], dragon_again: ["Another one. I could fight that too."], undead: ["Thin. Snap easy."],
    grave: ["Small."], altar: ["Stone. Good stone."], statue: ["Beard. Good."], fight: ["Hit it."], hurt: ["Hm."], rare: ["Now that's a weapon.", "Mine."], quest: ["Done."], boss: ["Down."], death: ["Up."], mount: ["Strong one."], fellowship: ["Good. More hands."], mastery: ["Ninety-nine. Big number."],
    tired: ["Walk, then."], mine: ["Good stone."], chop: ["Big tree. Good."], bones: ["Small bones."], underground: ["Too small."], mountain: ["Big."], sea: ["Big water."], hollow: ["Cold. Don't like cold."], mixture: ["Bigger. Good."], outfit: ["Tight."], friend_near: ["One of us."], idle: ["Hm.", "…", "Good."] },
  // 7 Sparkling: bright, delighted, can't contain itself.
  { region: ["{name}! It's gorgeous!", "{name}! Oh, the light here!"], revisit: ["{name} again! Still sparkly."], night: ["Stars! We should stay up."], rain: ["Rain! Everything shines after!"], creature: ["A {name}! Isn't it something?"], creature_again: ["Another {name}! Hello!"], dragon: ["A dragon! The scales! The SCALES!"], dragon_again: ["Another one! They're all so shiny."], undead: ["They need a bit of sparkle. And sleep."],
    grave: ["Flowers would help here."], altar: ["Candles! Light them all!"], statue: ["He'd look lovely with a bit of gold leaf."], fight: ["Make it dazzling!"], hurt: ["Ow! That's going to bruise. In a pretty colour."], rare: ["It SHINES! Oh, we're keeping that."], quest: ["Done! Fireworks! Where are the fireworks?"], boss: ["We did it! Oh, I'm glowing."], death: ["Even stars fall. Up again."], mount: ["Ribbons! It needs ribbons."], fellowship: ["A company! We'll glitter together."], mastery: ["Ninety-nine! We're brilliant. Literally."],
    tired: ["A stroll, then. Sparkle slowly."], mine: ["Gems! Please let there be gems."], chop: ["Oh, the sawdust catches the light."], bones: ["Not very sparkly, those."], underground: ["Dark! I'll light the way."], mountain: ["Snow! It glitters!"], sea: ["Look at the light on the water!"], hollow: ["It eats the light. I don't like it."], mixture: ["I'm fizzing! I'm actually fizzing!"], outfit: ["Oh, that's fabulous."], friend_near: ["Another Friend! Twinkle at them!"], idle: ["Ooh!", "Whoa.", "Pretty."] },
  // 8 Hollow: quiet, strange, knows things it shouldn't.
  { region: ["{name}. It's thinner here.", "{name}. Something underneath remembers us."], revisit: ["{name}. The echo's still here."], night: ["The dark's closer. Good."], rain: ["It falls through me."], creature: ["A {name}. It can't see what I am."], creature_again: ["{name}. It still can't."], dragon: ["A dragon. Older than me. Just."], dragon_again: ["Another. They don't like what I am."], undead: ["They almost got there. Almost."],
    grave: ["Not empty. They never are."], altar: ["It hums. Can't you hear it?"], statue: ["He's not looking at you. He's looking at me."], fight: ["Let it come."], hurt: ["It went through. Mostly."], rare: ["This was lost. Now it isn't."], quest: ["Finished. Something noticed."], boss: ["It's gone where I came from."], death: ["Not gone. Never gone."], mount: ["It can feel the cold in me. Brave thing."], fellowship: ["A company. They don't know what they've let in."], mastery: ["Ninety-nine. The edge of something."],
    tired: ["Walk. The ground doesn't mind."], mine: ["There's a hollow under the hollow."], chop: ["It screams, a little. You can't hear it."], bones: ["They want to go somewhere. I know the feeling."], underground: ["Closer to home.", "Deeper. Yes."], mountain: ["Thin air. Thinner me."], sea: ["Nothing of mine out there."], hollow: ["I'm home. We shouldn't be.", "It knows me. Keep walking."], mixture: ["The shadows lean in. Let them."], outfit: ["A shape to hold onto."], friend_near: ["One of us. Does it know?"], idle: ["…", "Listen.", "It's quiet. Too quiet."] },
];
/** A fallback manner for anything a family's voice leaves out. */
const PLAIN: Voice = { region: ["{name}."], revisit: ["{name} again."], night: ["Night."], rain: ["Rain."], creature: ["A {name}."], creature_again: ["Another {name}."], dragon: ["A dragon!"], dragon_again: ["Another dragon."], undead: ["Undead."], grave: ["A grave."], altar: ["An altar."], statue: ["A statue."], fight: ["Here we go."], hurt: ["Ow."], rare: ["Look at that."], quest: ["Done."], boss: ["It's down."], death: ["…"], mount: ["Up we get."], fellowship: ["A company."], mastery: ["Ninety-nine."], tired: ["Let's walk."], mine: ["Rock."], chop: ["Wood."], bones: ["Bones."], underground: ["Dark."], mountain: ["High."], sea: ["The sea."], hollow: ["…"], mixture: ["Hm."], outfit: ["Hm."], friend_near: ["Hello."], idle: ["Hmm."] };

/** Memories: lines that only exist because of what you've lived. Checked before the family's own, at Presence 30 and up. */
function memoryLine(game: Game, event: FriendEvent, name: string | null): string | null {
  const p = game.player, level = presenceLevel(p), f = p.firsts;
  if (level < 30) return null;
  if (event === "dragon_again" && f.first_dragon && game.rng() < 0.5) return "That was our first dragon, once. We used to be afraid of these.";
  if (event === "revisit" && name && p.quests.hazels_quiver === 2 && name === "Fernwick" && game.rng() < 0.6) return "Fernwick again. Hazel still owes us those arrows.";
  if (event === "revisit" && name === "Highcairn" && (p.quests.dawn_vigil ?? 0) >= 2 && game.rng() < 0.5) return "Dawnhold's over the ridge. We kept the vigil there.";
  if (event === "underground" && f.first_death && game.rng() < 0.3) return "Last time somewhere like this, we didn't come back the first try.";
  if (event === "boss" && f.first_boss && game.rng() < 0.5) return "Remember the first one? We shook for an hour.";
  if (event === "region" && level >= 50) {
    const t = tendencies(game);
    if (t.explorer >= 20 && game.rng() < 0.4) return "We've never been down this road. Good.";
  }
  return null;
}
/** Invisible leanings from how you've spent your days, for the odd remark at Presence 50 and up. */
export function tendencies(game: Game) {
  const p = game.player;
  return {
    explorer: Object.keys(p.visited).length, warrior: Math.floor(p.kills / 50), scholar: Math.floor((levelForXp(p.xp.magic) + levelForXp(p.xp.sigilcraft)) / 10),
    collector: Math.floor(Object.keys(p.outfits).length / 5), crafter: Math.floor((levelForXp(p.xp.smithing) + levelForXp(p.xp.crafting) + levelForXp(p.xp.apothecary)) / 15), faithful: Math.floor(levelForXp(p.xp.prayer) / 10),
  };
}
function tendencyLine(game: Game): string | null {
  if (presenceLevel(game.player) < 50) return null;
  const t = tendencies(game), best = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 5 || game.rng() > 0.3) return null;
  return { explorer: "What's beyond that hill?", warrior: "Something's nearby. I can feel it.", scholar: "There's a sigil in that pattern, if you look.", collector: "We don't have one of those yet.", crafter: "That would make a fine handle.", faithful: "We should light the altar before we leave." }[best[0]] ?? null;
}

/** Say something, if it's time. Returns the line said, or null. */
export function friendSays(game: Game, event: FriendEvent, name: string | null = null, n = 0): string | null {
  const p = game.player, mode = game.friendSpeech;
  if (mode === "off") return null;
  if (mode === "rare" && !IMPORTANT.has(event)) return null;
  if (game.tick - p.friendLast < GAP[mode] && !IMPORTANT.has(event)) return null;
  const gap = EVENT_GAP[event]; if (gap && game.tick - (p.friendEventAt[event] ?? -1e9) < gap) return null;
  const voice = VOICES[p.familyId] ?? PLAIN;
  let line = memoryLine(game, event, name) ?? (event === "idle" ? tendencyLine(game) : null);
  if (!line) { const pool = voice[event] ?? PLAIN[event] ?? []; if (!pool.length) return null; line = pool[Math.floor(game.rng() * pool.length)]; }
  line = line.replace("{name}", name ?? "").replace("{n}", String(n)).replace("  ", " ").trim();
  p.friendLast = game.tick; p.friendEventAt[event] = game.tick;
  message(game, `${playerName(p)}: ${line}`, "public");
  emit(game, { type: "friend", text: line, share: mode === "full", tick: game.tick });
  return line;
}
/** A first time, remembered forever (the day it happened); the first of some things is worth Presence. */
export function remember(game: Game, key: string) {
  const p = game.player;
  if (p.firsts[key]) return false;
  p.firsts[key] = Math.floor(Date.now() / 86_400_000);
  addXp(game, "presence", 20, { raw: true });
  return true;
}

/** Looking around: what's near, where we are, what the sky's doing. Called every few ticks. */
export function friendTick(game: Game) {
  const p = game.player, here = regionAt(game.world, p.x, p.y), region = here.id;
  // Regions: the first time, and coming back.
  if (p.friendRegion !== region) {
    const was = p.friendRegion; p.friendRegion = region;
    if (was !== null && region !== "coast") {
      if (region === "hollow_depths") { remember(game, "first_hollow"); friendSays(game, "hollow"); }
      else if ((p.visited[region] ?? 0) >= game.tick - 10) friendSays(game, "region", here.name);
      else if (presenceLevel(p) >= 10) friendSays(game, "revisit", here.name);
      else if (isUnderground(p.y)) friendSays(game, "underground");
      else if (["ironreach", "drakespine", "greyhorn", "frostpeak"].includes(region)) friendSays(game, "mountain");
      else if (["saltmarrow", "pale_isles"].includes(region)) friendSays(game, "sea");
    }
  }
  // The sky.
  if (game.ambient.night !== p.friendNight) { p.friendNight = game.ambient.night; if (p.friendNight && !isUnderground(p.y)) friendSays(game, "night"); }
  if (game.ambient.rain !== p.friendRain) { p.friendRain = game.ambient.rain; if (p.friendRain && !isUnderground(p.y)) friendSays(game, "rain"); }
  // What's near: the nearest aggressive creature in view, met for the first time or for the hundredth.
  if (game.tick % 10 === 0 && p.combat === null) {
    let best: { id: string; d: number } | null = null;
    for (const monster of game.monsters) {
      if (monster.dead || !monster.def.aggressive) continue;
      const d = Math.max(Math.abs(monster.x - p.x), Math.abs(monster.y - p.y));
      if (d <= 6 && (!best || d < best.d)) best = { id: monster.def.id, d };
    }
    if (best && best.id !== p.friendSeen) {
      p.friendSeen = best.id;
      const def = MONSTERS[best.id], kills = p.killLog[best.id] ?? 0, name = def.name.toLowerCase();
      if (def.breath) { if (remember(game, "first_dragon") || kills < 3) friendSays(game, "dragon"); else friendSays(game, "dragon_again"); }
      else if (def.undead) friendSays(game, "undead");
      else if (kills >= 50) friendSays(game, "creature_again", name, kills);
      else if (!p.friendKinds[best.id]) { p.friendKinds[best.id] = 1; friendSays(game, "creature", name); }
    }
    // Graves, altars and the Old Friend, when you stand by them.
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [0, -2], [0, 2], [-2, 0], [2, 0]] as const) {
      const object = objectNear(game, p.x + dx, p.y + dy);
      if (!object) continue;
      if (object.kind === "altar") { friendSays(game, "altar"); break; }
      if (object.kind === "decor" && object.decor === "grave") { friendSays(game, "grave"); break; }
      if (object.kind === "decor" && object.decor === "old_friend") { friendSays(game, "statue"); break; }
    }
  }
  // Another Friend walking with you.
  if (p.follower !== null && game.tick % 500 === 0) friendSays(game, "friend_near");
  // Nothing much happening: now and then, a thought.
  if (game.tick % 400 === 0 && p.combat === null && !p.activity && game.rng() < 0.25) friendSays(game, "idle");
}
const objectNear = (game: Game, x: number, y: number) => objectAtTile(game.world, x, y);
/** The Friend's family, for NPCs who notice. */
export const familyOf = (player: Player) => FAMILY_NAMES[player.familyId];
export const familyName = (family: number) => FAMILY_NAMES[family];
/** Which equipment counts as a strange outfit worth a remark: a regional set from somewhere far, or a mask of a monster. */
export function outfitRemark(game: Game, id: string) {
  const def = item(id);
  if (def.icon.shape === "mask" || id === "grumblin_head" || id.startsWith("drakehide_hood")) friendSays(game, "outfit");
}
