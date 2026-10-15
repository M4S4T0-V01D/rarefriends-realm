/**
 * The beastkeepers (Beastkeeping, beasts.ts): Bramble on the Friendhollow farm, Halla the houndmaster in Skarnholm and
 * Mstislav the beastward in Krasnogor. They keep the companions you don't have out, settle one that ran home frightened,
 * take one in for good when you need the room, sell feed and halters and whistles, and (Halla) give a hound pup to a
 * keeper she trusts. The Vargskeld keeps hounds and working beasts; the Zoryavik forest creatures and guardians: a
 * matter of what each knows best, not of who may keep what.
 */
import type { Dialogue, Game } from "./state.ts";
import { chat, npcSays, type NpcDef } from "./content.ts";
import { KEEP, SPECIES, SPECIES_IDS, TRAINING, bringOut, hatch, hatched, houndPup, incubate, keepsAt, release, settle, startTraining, type Companion } from "./beasts.ts";

const person = (id: string, name: string, examine: string, seed: number, extra: Partial<NpcDef> = {}): NpcDef => ({ id, name, examine, options: ["Talk-to", "Trade"], art: { family: 9, seed }, shop: "beastkeeper", ...extra });
export const BEAST_NPCS: Record<string, NpcDef> = {
  beastkeeper_bramble: person("beastkeeper_bramble", "Bramble the beastkeeper", "Keeps the farm's beasts and anyone else's that need keeping. Smells of hay and has a scar for every species.", 2141),
  houndmaster_halla: person("houndmaster_halla", "Halla the houndmaster", "Breeds Skarnholm's hounds: grey, rough-coated, and worth more than most of the men who own them.", 2142),
  beastward_mstislav: person("beastward_mstislav", "Mstislav the beastward", "Keeps Krasnogor's guardian beasts and the forest creatures people bring in hurt. Talks to them more than to people.", 2143),
  menagerist_pip: person("menagerist_pip", "Pip Featherstone the menagerist", "Keeps Bellwhistle's menagerie: moths in jars, a pixie in a birdcage (it's let out on Thursdays), and a hen she swears is a wizard.", 2144, { shop: "menagerie" }),
};
const pick = (game: Game, lines: readonly string[]) => lines[Math.floor(game.rng() * lines.length)];
const stateText = (c: Companion) => c.state === "out" ? "out with you" : c.state === "aboard" ? "aboard with you" : c.state === "fled" ? "frightened, home" : "waiting here";

export function talkBeastkeepers(game: Game, npcId: string, name: string): Dialogue | null {
  if (!BEAST_NPCS[npcId]) return null;
  const player = game.player, says = (...lines: string[]) => chat(name, npcSays(name, ...lines));
  const opening = npcId === "houndmaster_halla" ? pick(game, ["A hound's not a weapon. It's a friend that happens to have teeth. Treat it like the first and it'll show you the second when you need them.", "Every pup in this yard knows its name by the third day. The ones that don't, I keep."])
    : npcId === "beastward_mstislav" ? pick(game, ["They bring me what's hurt in the forest. Most go back. Some stay, and choose someone. It's never the one who wanted them most.", "A stag won't come to anyone who doesn't know where it sleeps. A fox won't come to anyone who doesn't know what she is."])
    : npcId === "menagerist_pip" ? pick(game, ["That hen is a wizard. Was. Is. She turned herself into a hen to get out of a faculty meeting, and liked it. Lays beautifully.", "Wisps come to whoever can speak their light. Pixies come to whoever makes them laugh. Golems come to whoever knocks them over. Very simple creatures, golems.", "Brush them! Nobody brushes them. Brush a moth and see what it does for you."])
    : pick(game, ["Feed it, mind it, don't ask it for more than it has. That's all keeping beasts is. The rest is patience.", "A salamander will eat coal out of your hand, if you come back often enough. Most people don't come back."]);
  const learn = (): Dialogue => chat(name, npcSays(name, "Every kind is won its own way. None of them by luck."), [
    ...SPECIES_IDS.map(id => ({ label: `${SPECIES[id].name} (Beastkeeping ${SPECIES[id].level})`, then: () => says(SPECIES[id].how) })),
    { label: "What happens if one falls?", then: () => says("Then it's gone. You'll have what it wore, and what you remember. A skittish one runs before it comes to that; a steady one holds fast to the end only if you've told it to and it trusts you that far. A boar never runs at all. Think before you take one where you'd not go yourself.") },
    { label: "Thanks.", then: () => null },
  ]);
  const train = (c: Companion): Dialogue => {
    const next = TRAINING[c.trained ?? 0];
    if (c.training) { const tier = TRAINING[c.training.tier - 1]; return says(`${c.name} is ${c.training.got} of ${tier.need} deeds into its training. Keep working with it: fights won together, what it brings in, brushing it down, the road.`); }
    if (!next) return says(`${c.name} has learnt everything anyone can teach it. It could teach me a thing or two.`);
    return chat(name, npcSays(name, `${c.trained ? `${c.name}'s training so far: ${TRAINING[c.trained - 1].name.toLowerCase()}.` : `${c.name} is untrained.`} Next it'd be ${next.name.toLowerCase()}: Beastkeeping ${next.level}, ${next.fee.toLocaleString()} Frens for my time, and ${next.need} deeds done together out there. I set it; you do it.`), [
      { label: "Set it its training.", then: () => { startTraining(game, c); return null; } }, { label: "Not now.", then: () => null }]);
  };
  const egg = (): Dialogue => player.hatchery
    ? hatched(game) ? chat(name, npcSays(name, "It's moving. It's cracking. Quick, be the first thing it sees!"), [{ label: "I'm here.", then: () => { hatch(game); return null; } }, { label: "Not yet.", then: () => null }])
      : says("Still warm, still ticking. Come back in a while. You'll want to be here when it goes.")
    : chat(name, npcSays(name, `A speckled drake egg? Bring me one and ${KEEP.hatchFee.toLocaleString()} Frens for the coal, and I'll keep it warm half an hour. Be here when it hatches: whoever it sees first is its mother. Beastkeeping ${SPECIES.drake.level}, mind: I won't hatch one for someone it'll eat.`), [
      { label: "Here's the egg.", then: () => { incubate(game); return null; } }, { label: "Later.", then: () => null }]);
  const mine = (): Dialogue => chat(name, npcSays(name, `You keep ${player.companions.length} of the ${keepsAt(game)} you can. Which?`), [
    ...player.companions.map(c => ({ label: `${c.name}: ${stateText(c)}, bond ${c.bond}`, then: (): Dialogue => chat(name, npcSays(name, `${c.name}. ${SPECIES[c.species].examine}`), [
      ...(c.state === "kennel" ? [{ label: "Bring it out.", then: () => { bringOut(game, c); return null; } }] : []),
      ...(c.state === "fled" ? [{ label: `Settle it (${(KEEP.settleFee * SPECIES[c.species].level).toLocaleString()} Frens).`, then: () => { settle(game, c); return null; } }] : []),
      ...(c.state !== "fled" ? [{ label: "Its training.", then: () => train(c) }] : []),
      { label: "Keep it here for good.", then: () => chat(name, npcSays(name, "For good? It'll be looked after. But it won't be yours."), [
        { label: "Yes, for good.", then: () => { release(game, c); return null; } }, { label: "No.", then: () => null }]) },
      { label: "Never mind.", then: () => null },
    ]) })),
    { label: "Never mind.", then: () => null },
  ]);
  return chat(name, npcSays(name, opening), [
    { label: "Tell me about keeping beasts.", then: learn },
    ...(player.companions.length ? [{ label: "My companions.", then: mine }] : []),
    { label: "A drake egg.", then: egg },
    ...(npcId === "houndmaster_halla" ? [{ label: "A hound pup.", then: () => chat(name, npcSays(name, `Five cooked meat for the litter, and Beastkeeping ${SPECIES.hound.level}, and one's yours.`), [{ label: "Here's the meat.", then: () => { houndPup(game); return null; } }, { label: "Later.", then: () => null }]) }] : []),
    { label: "Show me your stores.", then: () => { game.ui.shop = BEAST_NPCS[npcId].shop ?? "beastkeeper"; return null; } },
    { label: "Goodbye.", then: () => null },
  ]);
}
