/**
 * Skill guides and the recipe book, generated from the game's own data so they always match the game. Used by the
 * in-game guide (click a skill) and by the preview site's guide pages. Every entry carries tags (a type, a metal, a slot,
 * an element, a method, a tradition, a boost) that the in-game guide offers as filters down its right-hand side, the way
 * an old-school skill guide lets you look at one kind of thing at a time.
 */
import {
  BOWS, COOKING, CRAFTING, CROSSBOWS, STOCKS, WAR_BOWS, FIREMAKING, FISHING_SPOTS, FLETCH_ARROWS, FLETCH_BOWS, GEM_CUTTING, ITEM_LIST, METALS, MONSTERS, PRAYERS, ROCKS, SIGILCRAFT,
  SKILL_NAMES, SLAYER_SETS, SLAYER_TASKS, COURSES, WAYFARER_REWARDS, FAMILY_NAMES, SMELTING, SPELLS, TREES, SIGIL_STONES, sigilsPerStone, item, type Skill, CARVINGS, type Prayer, type Spell,
} from "./data.ts";
import { ESSENCES, HERBS, MIXTURES, POTIONS } from "./apothecary.ts";
import { NPCS } from "./content.ts";
import { TECHNIQUES } from "./techniques.ts";
import { SEA, SHIPWRIGHTS, VESSELS, VESSEL_KINDS } from "./seafaring.ts";
/** Which quest teaches a tradition's techniques (the common ones need only the level). */
const TAUGHT_BY: Partial<Record<string, string>> = { orashai: " (The Orashai Mysteries)", mizukai: " (The Hidden Road)", inner_measure: " (The Counted Breath)", living_patterns: " (Patterns in the Water)", thresholds: " (The Keepers' Door)", unfinished: " (The Unfinished Page)" };
import { AMULETS, STALLS, amuletRecipe, carvingRecipes, arrowRecipe, boltRecipe, craftingRecipes, crossbowRecipe, spinningRecipes, stringingRecipe, fletchingRecipes, headlessRecipe, smeltingRecipes, smithingRecipes } from "./engine.ts";
import type { Recipe } from "./state.ts";
import { ORDERS, ORDER_TIERS, orderOf, type OrderId } from "./knights.ts";

export type GuideEntry = { level: number; name: string; detail: string; icon?: string; spell?: string; /** Filter tags, "group:id" (guideFilters). */ tags?: string[] };
const byLevel = (entries: GuideEntry[]) => entries.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

// ---------- Tags: what the guide's filters are made of ----------
/** The filter groups, in the order they're shown, and their names. */
export const GUIDE_GROUPS: readonly { id: string; name: string }[] = [
  { id: "type", name: "Type" }, { id: "metal", name: "Metal" }, { id: "slot", name: "Slot" }, { id: "element", name: "Element" }, { id: "boost", name: "Boost" }, { id: "method", name: "Method" }, { id: "tradition", name: "Tradition" },
];
/** The kinds of thing a guide lists (type tags) and their names on the filter buttons. */
const TYPE_NAMES: Record<string, string> = {
  weapon: "Weapons", armour: "Armour", shield: "Shields", cape: "Capes", tool: "Tools", ammo: "Ammunition", spell: "Spells", prayer: "Prayers", food: "Food", bones: "Bones", bar: "Bars",
  bow: "Bows", crossbow: "Crossbows", arrow: "Arrows", bolt: "Bolts", stock: "Stocks", tree: "Trees", rock: "Rocks", gem: "Gems", herb: "Herbs", essence: "Essences", potion: "Potions", mixture: "Mixtures",
  technique: "Techniques", contract: "Contracts", creature: "Creatures", ability: "Abilities", course: "Courses", reward: "Rewards", title: "Titles", carving: "Carvings", leather: "Leatherwork", amulet: "Amulets",
  stone: "Sigil stones", sigil: "Sigils", pickpocket: "Pickpocketing", stall: "Stalls", camp: "Camping", order: "The Orders", set: "Armour sets", fish: "Fish", meat: "Meat", grain: "Grain", log: "Logs",
  smith: "Smithing", arrowheads: "Arrowheads", vessel: "Vessels", plate: "Plates", holy: "Faith weapons", place: "Places", clothing: "Clothing", lore: "Lore", journal: "The journal",
};
const SLOT_NAMES: Record<string, string> = { head: "Head", cape: "Cape", neck: "Neck", weapon: "Weapon", body: "Body", shield: "Shield", legs: "Legs", hands: "Hands", feet: "Feet", belt: "Belt", ring: "Ring" };
const ELEMENT_NAMES: Record<string, string> = { wind: "Wind", water: "Water", earth: "Earth", fire: "Fire", holy: "Holy", law: "Law", paper: "Paper", dusk: "Dusk", moon: "Moon", hollow: "Hollow", gold: "Gold", stone: "Stone", home: "Home", shadow: "Shadow" };
const BOOST_NAMES: Record<string, string> = { attack: "Attack", strength: "Strength", defence: "Defence", magic: "Magic", protect: "Protection", spirit: "Spirits", purify: "Purity", journey: "Journeys" };
const TRADITION_NAMES: Record<string, string> = { common: "Common", orashai: "Orashai", mizukai: "Hidden Road", inner_measure: "Inner Measure", living_patterns: "Living Patterns", thresholds: "Thresholds", unfinished: "Unfinished Things" };
/** A tag's name on its button. */
export function tagName(tag: string): string {
  const [group, id] = [tag.slice(0, tag.indexOf(":")), tag.slice(tag.indexOf(":") + 1)];
  if (group === "metal") return METALS.find(metal => metal.id === id)?.name ?? id;
  if (group === "slot") return SLOT_NAMES[id] ?? id;
  if (group === "element") return ELEMENT_NAMES[id] ?? id;
  if (group === "boost") return BOOST_NAMES[id] ?? id;
  if (group === "tradition") return TRADITION_NAMES[id] ?? id;
  if (group === "method") return id;
  return TYPE_NAMES[id] ?? id;
}
/** The filters a list of entries offers: each group that two or more of its tags appear in, its tags in order of first appearance with a count each. */
export function guideFilters(entries: readonly GuideEntry[]): { id: string; name: string; tags: { id: string; name: string; count: number }[] }[] {
  const counts = new Map<string, number>();
  for (const entry of entries) for (const tag of new Set(entry.tags ?? [])) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return GUIDE_GROUPS.map(group => ({ ...group, tags: [...counts].filter(([tag]) => tag.startsWith(`${group.id}:`)).map(([id, count]) => ({ id, name: tagName(id), count })) })).filter(group => group.tags.length >= 2);
}
/** The entries that pass a choice of tags: within a group any chosen tag will do, and every group with a choice must be met. */
export function filterGuide(entries: readonly GuideEntry[], chosen: ReadonlySet<string>): GuideEntry[] {
  if (!chosen.size) return [...entries];
  const groups = new Map<string, string[]>();
  for (const tag of chosen) { const group = tag.slice(0, tag.indexOf(":")); groups.set(group, [...(groups.get(group) ?? []), tag]); }
  return entries.filter(entry => [...groups.values()].every(tags => tags.some(tag => entry.tags?.includes(tag))));
}
/** The metal an item is made of, from its id ("blackiron_sword"). */
const metalOf = (id: string) => METALS.find(metal => id.startsWith(`${metal.id}_`))?.id;
/** Tags for a piece of equipment: its kind, slot and metal. */
const gearTags = (id: string, slot: string) => [`type:${slot === "weapon" ? "weapon" : slot === "shield" ? "shield" : slot === "cape" ? "cape" : "armour"}`, `slot:${slot}`, ...(metalOf(id) ? [`metal:${metalOf(id)}`] : [])];
const spellTags = (spell: Spell) => ["type:spell", `element:${spell.element}`];
const prayerTags = (prayer: Prayer) => ["type:prayer", ...Object.keys(prayer.effect).map(key => `boost:${key}`)];

/** Items whose equip requirement names this skill (weapons, armour, tools). In Defence and Faith the Orders' arms are left to orderArms. */
function gear(skill: Skill): GuideEntry[] {
  return ITEM_LIST.flatMap(entry => {
    const needed = entry.equip?.requires?.[skill];
    if (!needed || entry.mastery || ((skill === "defence" || skill === "prayer") && orderOf(entry.id) && entry.id !== "dusk_cape")) return [];
    const bonus = entry.equip!.bonuses, best = Object.entries(bonus).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => `+${v} ${k}`).join(", ");
    return [{ level: needed, name: entry.name, detail: `${entry.equip!.slot === "weapon" ? "Wield" : "Wear"}${best ? ` (${best})` : ""}`, icon: entry.id, tags: gearTags(entry.id, entry.equip!.slot) }];
  });
}
/**
 * The Orders' arms, one entry a tier instead of one a piece: the five Orders of Faith together, since their pieces are the
 * same but for the look and the blessing, and the Order of Dusk on its own, since its pieces have names of their own.
 */
function orderArms(skill: "defence" | "prayer"): GuideEntry[] {
  const faith: OrderId[] = ["diamond", "ink", "sol", "hood", "ember"];
  const out = [faith, ["dusk"] as OrderId[]].flatMap(orders => ORDER_TIERS.map(tier => {
    const pieces = ITEM_LIST.filter(entry => entry.id.startsWith(`${orders[0]}_${tier.id}_`) && (skill === "prayer" || entry.equip?.requires?.defence));
    const bonus = pieces.map(entry => entry.equip!.bonuses[skill] ?? 0), names = pieces.map(entry => entry.name.split(" ").slice(2).join(" "));
    const list = `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`, dusk = orders[0] === "dusk";
    return {
      level: skill === "prayer" ? tier.faith : tier.defence, icon: `${orders[0]}_${tier.id}_body`,
      name: dusk ? `Order of Dusk: ${ORDERS.dusk.tiers![tier.id]}` : `Orders of Faith: ${tier.name} (${orders.map(id => ORDERS[id].short).join(", ")})`,
      detail: `${skill === "prayer" ? "Wear or wield" : "Wear"}: ${list} (+${Math.min(...bonus)} to +${Math.max(...bonus)} ${skill} a piece)${skill === "prayer" ? " · faith arms: Faith XP with every hit, and they hurt the undead more" : ""} · ${dusk ? "sold to those sworn to the Order of Dusk" : "sold by each Order's quartermaster to those sworn to it; every Order's set has its own look and blessing"}`,
      tags: ["type:order", "type:armour"],
    };
  }));
  if (skill === "prayer") out.push({ level: 20, icon: "diamond_cape", name: `Orders of Faith capes (${faith.map(id => ORDERS[id].short).join(", ")})`, detail: "Wear (+4 defence, +3 prayer) · each Order's commander gives its cape for the oath", tags: ["type:order", "type:cape", "slot:cape"] });
  return out;
}
/** Every level-based unlock in a skill, in level order, ending with its mastery cape. */
export function skillGuide(skill: Skill): GuideEntry[] {
  const out: GuideEntry[] = [];
  const add = (level: number, name: string, detail: string, icon?: string, tags?: string[]) => out.push({ level, name, detail, icon, tags });
  const T = (...types: string[]) => types.map(type => `type:${type}`);
  switch (skill) {
    case "attack": out.push(...gear(skill)); break;
    case "defence": out.push(...gear(skill), ...orderArms(skill)); break;
    case "ranged":
      out.push(...gear(skill));
      for (const ammo of ITEM_LIST.filter(entry => entry.ammo)) add(ammo.ammo!.level, ammo.name, `${ammo.ammo!.bolt ? "Fired by any crossbow" : "Fired by any bow"} · +${ammo.ammo!.strength} strength`, ammo.id, [...T("ammo", ammo.ammo!.bolt ? "bolt" : "arrow"), ...(metalOf(ammo.id) ? [`metal:${metalOf(ammo.id)}`] : [])]);
      break;
    case "strength":
      add(1, "Aggressive style", "Train Strength by fighting in the Aggressive style. Every level raises your max hit.", undefined, T("ability"));
      add(1, "Heft", "Greatswords, battleaxes and war hammers swing harder the stronger you are: +1% of the weapon's strength bonus for every two Strength levels.", undefined, T("ability"));
      out.push(...gear("strength")); break;
    case "hitpoints": add(10, "Hitpoints", "Every combat level-up you train raises your hitpoints. You regenerate 1 HP a minute; eat food to heal.", undefined, T("ability"));
      add(10, "The Heartguard", "Red-and-white armour from Mender Hale at the Friendhollow chapel, a piece every ten levels. Each adds a hitpoint and quickens healing 6%; all nine make food heal a quarter more.", "heartguard_helm", T("armour", "set"));
      out.push(...gear("hitpoints")); break;
      for (const food of ITEM_LIST.filter(entry => entry.heal).sort((a, b) => (a.heal ?? 0) - (b.heal ?? 0))) add(1, food.name, `Heals ${food.heal}`, food.id);
      break;
    case "magic": for (const spell of SPELLS) if (spell.skill !== "prayer") out.push({ level: spell.level, name: spell.name, detail: spell.description, spell: spell.id, tags: spellTags(spell) }); out.push(...gear("magic")); add(30, "Sigil satchel", "The Mage's Satchel (Archmage Solenne): a bag that holds 2,000 of every sigil and casts from them", "sigil_satchel", T("tool")); break;
    case "prayer":
      for (const prayer of PRAYERS) add(prayer.level, prayer.name, prayer.description, undefined, prayerTags(prayer));
      for (const spell of SPELLS) if (spell.skill === "prayer") out.push({ level: spell.level, name: `Spell: ${spell.name}`, detail: `${spell.description} (Faith tab of the spellbook)`, spell: spell.id, tags: spellTags(spell) });
      out.push(...gear("prayer"), ...orderArms("prayer"));
      for (const bones of ITEM_LIST.filter(entry => entry.bones)) add(1, `Bury ${bones.name.toLowerCase()}`, `${bones.bones} Faith XP (twice that offered on an altar, three times in the Dawnhold chapel)`, bones.id, T("bones"));
      // The Order of the Dawn's faith weapons: a little Faith XP with each hit, and they hurt the undead more.
      for (const weapon of ITEM_LIST.filter(entry => entry.equip?.holy && !orderOf(entry.id))) add(weapon.equip!.requires?.prayer ?? 1, weapon.name, "Faith weapon: Faith XP with every hit, and it hurts the undead more", weapon.id, [...T("weapon", "holy"), "slot:weapon", ...(metalOf(weapon.id) ? [`metal:${metalOf(weapon.id)}`] : [])]);
      break;
    case "sigilcraft":
      for (const grade of SIGIL_STONES) if (grade.base > 1) add(grade.level, grade.name, `${grade.base} sigils a stone before the level bonus; Mining ${grade.level} to dig it`, grade.item, T("stone"));
      for (const altar of SIGILCRAFT) add(altar.level, `${item(altar.sigil).name}s`, `${altar.xp} XP a stone at the ${item(altar.sigil).name.replace(" sigil", "")} altar; ${sigilsPerStone(altar.level + 11, altar.level)} per stone from level ${altar.level + 11}`, altar.sigil, T("sigil"));
      break;
    case "woodcutting":
      for (const tree of Object.values(TREES)) add(tree.level, tree.name, `${tree.xp} XP a log`, tree.log, T("tree"));
      for (const axe of ITEM_LIST.filter(entry => entry.tool?.kind === "axe")) add(axe.tool!.level, axe.name, "Chops faster", axe.id, [...T("tool"), ...(metalOf(axe.id) ? [`metal:${metalOf(axe.id)}`] : [])]);
      break;
    case "mining":
      for (const [kind, rock] of Object.entries(ROCKS)) add(rock.level, rock.name, `${rock.xp} XP${kind === "sigil" ? " (Wizards' Tower, never runs out)" : kind.startsWith("sigil") ? " (the mines' faces, never runs out)" : ""}`, rock.ore, T(kind.startsWith("sigil") ? "stone" : kind === "gem" ? "gem" : "rock"));
      for (const pick of ITEM_LIST.filter(entry => entry.tool?.kind === "pickaxe")) add(pick.tool!.level, pick.name, "Mines faster", pick.id, [...T("tool"), ...(metalOf(pick.id) ? [`metal:${metalOf(pick.id)}`] : [])]);
      break;
    case "fishing":
      for (const spot of Object.values(FISHING_SPOTS)) for (const fish of spot.catches) add(fish.level, item(fish.fish).name.replace("Raw ", ""), `${fish.xp} XP · ${spot.action} (${item(spot.tool).name.toLowerCase()}${spot.bait ? ` and ${item(spot.bait).name.toLowerCase()}` : ""})`, fish.fish, [...T("fish"), `method:${spot.action}`]);
      break;
    case "cooking": for (const [raw, cook] of Object.entries(COOKING)) add(cook.level, item(cook.cooked).name, `${cook.xp} XP · stops burning at ${cook.stopBurn}`, raw, T("food", raw.startsWith("raw_") && !raw.includes("beef") && !raw.includes("chicken") ? "fish" : raw.startsWith("raw_") ? "meat" : "grain")); break;
    case "firemaking": for (const [log, fire] of Object.entries(FIREMAKING)) add(fire.level, item(log).name, `${fire.xp} XP`, log, T("log")); break;
    case "smithing":
      for (const metal of METALS) {
        const smelt = SMELTING[metal.id];
        add(smelt.level, `${metal.name} bar`, `${smelt.xp} XP · ${Object.entries(smelt.ores).map(([id, n]) => `${n} ${item(id).name.toLowerCase()}`).join(" + ")}`, `${metal.id}_bar`, [...T("bar"), `metal:${metal.id}`]);
        for (const recipe of smithingRecipes(metal.id)) {
          const made = Object.keys(recipe.outputs)[0], equip = item(made).equip, tool = item(made).tool;
          const type = equip ? (equip.slot === "weapon" ? "weapon" : equip.slot === "shield" ? "shield" : "armour") : tool ? "tool" : made.endsWith("arrowheads") ? "arrowheads" : made.endsWith("_bolts") || made.endsWith("_limbs") ? "bolt" : made.includes("plate") ? "plate" : "tool";
          add(recipe.level, recipe.label, `${recipe.xp} XP · ${Object.values(recipe.inputs)[0]} bar${Object.values(recipe.inputs)[0] > 1 ? "s" : ""}`, made, [...T(type), `metal:${metal.id}`, ...(equip ? [`slot:${equip.slot}`] : [])]);
        }
      }
      break;
    case "crafting":
      for (const entry of CRAFTING) add(entry.level, item(entry.product).name, `${entry.xp} XP · ${entry.leather} ${entry.hide ? item(entry.hide).name.toLowerCase() : "leather"}`, entry.product, [...T("leather", "armour"), ...(item(entry.product).equip ? [`slot:${item(entry.product).equip!.slot}`] : [])]);
      for (const [rough, cut] of Object.entries(GEM_CUTTING)) add(cut.level, item(cut.cut).name, `${cut.xp} XP · cut with a chisel`, rough, T("gem"));
      add(1, "String", "5 XP · wool at a spinning wheel (the farmhouse, Tessa's tannery)", "string", T("clothing"));
      add(1, "Dyeing", "14 XP · a pot of dye (the Dyeworks, Dyemoor) on cloth or leather clothing; lye washes it out", "dye_madder", T("clothing"));
      for (const carving of CARVINGS) add(carving.level, carving.name, `${carving.xp} XP · a carving gouge on two ${item(carving.log).name.toLowerCase()}. Set it down: near it, ${carving.text}, for ${Math.round(carving.ticks * 0.6 / 60 * 10) / 10} min`, carving.id, T("carving"));
      for (const entry of AMULETS) add(entry.level, item(entry.amulet).name, `${entry.xp} XP · a string on a cut ${entry.gem}`, entry.amulet, T("amulet", "gem"));
      for (const bow of CROSSBOWS) add(bow.craft, item(`${bow.metal}_crossbow`).name, `${bow.xp} XP · ${item(`${bow.metal}_limbs`).name.toLowerCase()} on ${/^[aeiou]/i.test(item(bow.stock).name) ? "an" : "a"} ${item(bow.stock).name.toLowerCase()}`, `${bow.metal}_crossbow`, [...T("crossbow", "weapon"), `metal:${bow.metal}`]);
      break;
    case "fletching":
      add(1, "Arrow shafts", "8 XP · a knife on any logs makes 15", "arrow_shaft", T("arrow")); add(1, "Headless arrows", "15 XP for 15 · feathers on shafts", "headless_arrow", T("arrow"));
      for (const bow of FLETCH_BOWS) add(bow.level, item(bow.bow).name, `${bow.xp} XP · a knife on ${item(bow.log).name.toLowerCase()}, then a string on the unstrung bow`, bow.bow, T("bow"));
      for (const metal of METALS) add(FLETCH_ARROWS[metal.id].level, `${metal.name} arrows`, `${FLETCH_ARROWS[metal.id].xp} XP each · heads from the anvil`, `${metal.id}_arrow`, [...T("arrow"), `metal:${metal.id}`]);
      for (const bow of WAR_BOWS) add(bow.fletch, bow.name, `${bow.xp} XP · a knife on 2 ${item(bow.log).name.toLowerCase()}, then a string`, bow.id, T("bow"));
      for (const stock of STOCKS) add(stock.level, stock.name, `${stock.xp} XP · a knife on ${item(stock.log).name.toLowerCase()} (for a crossbow)`, stock.id, T("stock", "crossbow"));
      for (const metal of METALS) { const recipe = boltRecipe(metal.id); add(recipe.level, `${metal.name} bolts`, `${recipe.xp / 12} XP each · feathers on unfeathered bolts from the anvil`, `${metal.id}_bolts`, [...T("bolt", "crossbow"), `metal:${metal.id}`]); }
      break;
    case "thieving":
      add(1, "Sneak", "Walk softly past aggressive monsters: XP each time you slip by unseen. Spends run energy; Stealth makes it cheaper and you harder to spot", undefined, T("ability"));
      add(1, "Sneak attack", "Strike a monster that hasn't noticed you: harder and truer, more with Stealth", undefined, T("ability"));
      add(50, "Light-footed", "Aggressive monsters notice you from 3 tiles instead of 4, even when you aren't sneaking", undefined, T("ability"));
      add(80, "Shadow-footed", "They notice you from only 2 tiles", undefined, T("ability"));
      add(60, "Veilweave hood (rare)", "Found in the shadows while slipping past monsters of level 38+; wear it from 70 and stand still to vanish", "veilweave_hood", [...T("armour"), "slot:head"]);
      for (const npc of Object.values(NPCS)) if (npc.pickpocket) add(npc.pickpocket.level, `Pickpocket ${npc.name.toLowerCase()}`, `${npc.pickpocket.xp} XP · ${npc.pickpocket.coins[0]}–${npc.pickpocket.coins[1]} Frens`, undefined, T("pickpocket"));
      for (const [name, stall] of Object.entries(STALLS)) add(stall.level, `${name[0].toUpperCase()}${name.slice(1)} stall`, `${stall.xp} XP · the Oasis market`, undefined, T("stall"));
      break;
    case "agility":
      for (const [id, course] of Object.entries(COURSES)) add(course.level, course.name, `${id === "friendhollow" ? "Five obstacles west of the castle" : id === "dunes" ? "Six obstacles south-east of the Oasis" : "Six obstacles north of the Frostpeak camp"}: +${course.lapXp} XP and ${course.marks} Wayfarer's mark${course.marks > 1 ? "s" : ""} a lap`, undefined, T("course"));
      add(1, "Run energy", "Comes back faster and drains slower with every level (40% slower at 99)", undefined, T("ability"));
      add(1, "Sure footing", "Hard obstacles can be slipped on: a fifth of the time at their level, never twelve levels above it", undefined, T("ability"));
      add(1, "Carrying weight", "Everything worn weighs something (Worn equipment shows it): forty kilograms doubles how fast running drains. Round shields and plate are the heavy things.", undefined, T("ability"));
      add(30, "Packhorse", "A quarter of your load no longer counts against your run energy", undefined, T("ability")); add(60, "Long strides", "Half of it", undefined, T("ability")); add(90, "Light as a Friend", "Three quarters of it", undefined, T("ability"));
      add(20, "Murkmire stepping stones", "A shortcut over the bog river", undefined, T("place"));
      add(15, "Stepping stones by the Zoryavik coast", "A shortcut over the inlet below Krasnogor", undefined, T("place"));
      add(20, "The Ilm stepping stones", "A shortcut over the river Ilm, down from the ridge", undefined, T("place"));
      add(25, "The Bereza log", "A shortcut over the Bereza, by Bereslav", undefined, T("place"));
      add(35, "The Wolfsback climb", "An icy step of crag at the top of the Wolfsback, the goat-track over the Varn Ridge: the way across when the Oathgate's barred", undefined, T("place"));
      add(1, "Trails", "Waymarks stand beside the north's roads. Note every one along a road and you know that trail: Wayfaring XP, and running along it costs half. The West Road, the East Road, the Oathgate Road and the Bough Road.", undefined, T("ability"));
      add(5, "Camping", "With a camp kit (smithed from pewter): a tent and a fire in the wild, where the ground allows and not by a town, a dungeon's door or the dragons. Rest and cook there. Wayfaring XP for pitching one, once in a while.", "pewter_camp_kit", T("camp"));
      add(25, "A camp to wake at", "With a camp lantern carried when the camp is pitched: fall, and you wake by your own fire while it stands", "ashsteel_camp_lantern", T("camp"));
      add(5, "Field altar", "Set beside the tent, it takes bones for one and a half times a burial (an altar gives twice)", "moonsilver_field_altar", T("camp"));
      add(5, "Sleeping and tending", "Sleep at the tent for a full rest and Wayfaring XP once in a while; tend the fire for Firemaking XP. A first camp in a region is a new sky: Wayfaring XP, and the trail log remembers", undefined, T("camp"));
      add(5, "Camp cache", "Frostsilver: set beside the fire, it keeps twelve things while the camp stands (right-click a pack item at the camp: Stash)", "frostsilver_camp_cache", T("camp"));
      add(5, "Camp brazier", "Gloomsteel, carried when the camp is pitched: a fire that burns hot. Nothing cooked on it burns, resting cures poison, and you mend twice as fast beside it", "gloomsteel_camp_brazier", T("camp"));
      add(50, "Waystone", "Wyrmscale, carried when the camp is pitched: Walk-the-way from anywhere above ground, once in a while, and it takes you back to your fire", "wyrmscale_waystone", T("camp"));
      for (const reward of WAYFARER_REWARDS) if (reward.id !== "waybread") add(item(reward.id).equip?.requires?.agility ?? 1, reward.name, `${reward.cost} marks from Coach Skip · ${reward.text.replace(/ \(Wayfaring \d+\)/, "")}`, reward.id, [...T("reward"), ...(item(reward.id).equip ? [`slot:${item(reward.id).equip!.slot}`] : [])]);
      add(1, "Waybread", "1 mark for 3 from Coach Skip · 40 run energy each", "waybread", T("reward", "food"));
      break;
    case "apothecary":
      add(1, "Pick herbs", "Every ecosystem grows its own: forest, swamp, mountain, the Deadwood, Ashfall, coast and desert. Pick (level by herb), then Clean.", undefined, T("ability"));
      for (const herb of HERBS) add(herb.level, herb.name, `${herb.rarity[0].toUpperCase()}${herb.rarity.slice(1)} · ${herb.eco === "deadwood" ? "the Deadwood" : herb.eco === "ashfall" ? "Ashfall" : herb.eco === "mizukai" ? "the Mizukai Isles" : `${herb.eco} regions`} · ${herb.xp} XP a pick`, `clean_${herb.id}`, T("herb"));
      add(10, "Grind", "A pestle and mortar on a clean herb grinds it for the stronger brews.", "mortar", T("tool"));
      for (const essence of ESSENCES) add(essence.level, essence.name, `Distil two ${item(`clean_${essence.herb}`).name.toLowerCase()} at the still in Hollyhock`, essence.id, T("essence"));
      for (const potion of POTIONS) add(potion.level, potion.name, `${potion.examine} (${Object.entries(potion.inputs).filter(([id]) => id !== "vial_of_water").map(([id, n]) => `${n} ${item(id).name.toLowerCase()}`).join(", ")}, in a vial of water)`, potion.id, T("potion"));
      for (const mix of MIXTURES) add(mix.level, mix.name, `For ${FAMILY_NAMES[mix.family]} Friends only: ${mix.effect.toLowerCase()} for ten minutes`, mix.id, T("mixture"));
      break;
    case "mysteries":
      add(1, "Mysteries", "Hidden laws, old inscriptions, true names and the techniques of the old traditions. Not Faith and not Magic: it's trained by finding things out, the first time each, never by repeating them.", undefined, T("lore"));
      add(1, "Discoveries", "Strange places, phenomena, beings and contradictions, each recorded once in your Mysteries journal (the Quest journal's third page): what you saw, what you understood, and what you still don't.", undefined, T("lore"));
      add(1, "Azhurak glyphs", "Kharaveth's oldest letters. First you know a glyph by sight, then by meaning: from a picture cut beside it, from someone who knows, or from working it out.", undefined, T("lore"));
      add(1, "Inscriptions", "An inscription can be read once every glyph in it is understood. Inscribed sherds from the Underway teach glyphs you haven't seen.", "azhurak_sherd", T("lore"));
      add(1, "The Sunteeth", "A breathing crack in a blind canyon, the road beneath it, the counterweight that still works: Kharaveth's north holds the first of them.", undefined, T("place"));
      add(1, "The Hidden Road", "The Mizukai Isles' own Mysteries: Ascetic Kōdō on Iwaoka teaches them, after The Silent Climb. The standing mist, the foxfire, the stone with no echo.", undefined, T("place"));
      // The techniques, in the Combat options tab (techniques.ts).
      for (const technique of TECHNIQUES) add(technique.level, technique.name, `${technique.description}${TAUGHT_BY[technique.tradition] ?? ""}`, undefined, [...T("technique"), `tradition:${technique.tradition}`]);
      break;
    case "seafaring":
      add(1, "Seafaring", "Vessels of your own, built by a shipwright from your materials, sailed over the water the world has, moored where you leave them and found there again. Trained by sailing, by landing somewhere new by sea, and by building and mending.", undefined, T("ability"));
      for (const kind of VESSEL_KINDS) { const v = VESSELS[kind]; add(v.level, v.name, `${v.examine} Speed ${v.speed}, hold ${v.hold}, ${v.waters === "shallow" ? "the shallows, rivers and lakes" : v.waters === "coastal" ? `the shallows and the sea within ${SEA.coastal} of land` : "any water"}${v.beach ? ", beaches anywhere" : ", needs a pier"}. Built by ${Object.entries(SHIPWRIGHTS).filter(([, y]) => y.builds.includes(kind)).map(([id]) => NPCS[id]?.name ?? id).join(" or ")}: ${v.build.map(([id, n]) => `${n} ${item(id).name.toLowerCase()}`).join(", ")}.`, undefined, T("vessel")); }
      add(1, "Going ashore", "Aboard, click the shore: you sail beside it and step off, where the vessel can be beached or there's a pier. The vessel stays moored there, its hold with it.", undefined, T("ability"));
      add(1, "The hold", "Each vessel has a hold: Load from your pack aboard or beside it, take things back from the Hold.", undefined, T("ability"));
      add(1, "Planks", "A shipwright saws logs into planks for a fee: pine, oak and ironbark.", "oak_planks", T("ability"));
      add(SEA.berthLevel, "A berth", "A barge's deckhouse or a longship's awning can be your waking place: if you fall, you wake aboard it, wherever it's moored. One waking place at a time, a camp or a vessel.", undefined, T("ability"));
      add(1, "Hulls", `Deep water wears a hull a point every ${SEA.wearEvery} tiles. A stove-in hull keeps to the shallows until a shipwright mends it with planks and pewter rivets.`, undefined, T("ability"));
      break;
    case "presence":
      add(1, "Presence", "The mark you leave on the world. Earned by discovering regions, finishing quests, felling bosses, rare finds, people met, rumours heard, work orders filled, your Friend, your name and the clothes you're seen in. The slowest skill in the Realm.", undefined, T("ability"));
      add(1, "Title: Newcomer", "Everyone starts somewhere. Titles show when players examine you.", undefined, T("title"));
      add(10, "Title: Wanderer of the Realm", "Your Friend starts remarking on places you come back to.", undefined, T("title"));
      add(20, "People notice you", "Townsfolk you've met greet you with \"Back already?\". The Namekeeper offers A Name Worth Knowing (with a name).", undefined, T("ability"));
      add(20, "Wanderer's cloak", "From A Name Worth Knowing · Presence grows a fifth faster", "wanderers_cloak", [...T("reward", "cape"), "slot:cape"]);
      add(25, "Title: Traveller", "Presence 25.", undefined, T("title"));
      add(30, "Memory moments", "Your Friend recalls firsts: the first dragon, the first death, the first Hollow.", undefined, T("ability"));
      add(40, "Known by name", "Townsfolk greet you by your name. Title: Adventurer. Archivist Perrin offers Known in Every Hall.", undefined, T("ability", "title"));
      add(40, "Chronicler's mantle", "From Known in Every Hall · work orders pay 15% more", "chroniclers_mantle", [...T("reward", "cape"), "slot:cape"]);
      add(40, "Storyteller's hat", "From Known in Every Hall", "storytellers_hat", [...T("reward", "armour"), "slot:head"]);
      add(50, "Personality", "Your Friend's own tendencies show in what it says: explorer, warrior, scholar, collector, socialite.", undefined, T("ability"));
      add(60, "Title: Seasoned Adventurer", "King Hollis offers The Remembered.", undefined, T("title"));
      add(60, "Blade of Renown", "From The Remembered · strength grows with Presence (one for every four levels)", "blade_of_renown", [...T("reward", "weapon"), "slot:weapon"]);
      add(60, "Cape of Renown", "From The Remembered · Presence grows a third faster", "cape_of_renown", [...T("reward", "cape"), "slot:cape"]);
      add(70, "Everyone knows you", "\"Everyone here knows\" your name, in every village you've spent time in.", undefined, T("ability"));
      add(80, "Title: Legend of the Realm", "Presence 80.", undefined, T("title"));
      add(99, "Title: Presence of the Realm", "Presence 99.", undefined, T("title"));
      break;
    case "slayer":
      // Pursuance: knowing the creatures, reading their tracks, the Warden's contracts and what they lead to.
      add(1, "Your Pursuance journal", "Examine a creature, fight it, read its tracks: every fact learnt is written down, and pays once", "slayer_gem", T("journal"));
      add(1, "Reading tracks", "Tracks near you lead to creatures up to 15 levels above your Pursuance: read one for its maker, its way, and a trail on your map", undefined, T("ability"));
      add(1, "Judging by eye", "Examine tells you how a creature fights from a quarter of its level, its guard from half, its weakness from four fifths", undefined, T("ability"));
      add(1, "Mastery", "Familiar (10 put down, weakness known), Seasoned (50, and its guard), Expert (150, and everything): +2%, +4%, +6% accuracy and damage against it", undefined, T("ability"));
      add(1, "The Warden's research", "Everything she knows of a creature you've met, for Pursuance points", undefined, T("journal"));
      add(10, "Track contracts", "Read so many sets of a creature's tracks", undefined, T("contract"));
      add(20, "Study contracts", "Learn how a creature fights, how it guards itself and what it's weak to", undefined, T("contract"));
      add(1, "Marked creatures", "One in a great many comes back stronger, with a hunter's trophy: 6 points from the Warden", "hunters_trophy", T("creature"));
      for (const task of SLAYER_TASKS) add("slayer" in task ? task.slayer : 1, `Contract: ${task.name}`, `From combat level ${task.min}`, undefined, T("contract"));
      for (const monster of Object.values(MONSTERS)) if (monster.slayer) add(monster.slayer, monster.name, "Only a seasoned pursuer can wound it", undefined, T("creature"));
      add(20, "Warden's helm", "150 points · +15% accuracy and damage on contracts", "slayer_helm", [...T("reward", "armour"), "slot:head"]);
      add(30, "Warden's bracers", "250 points · +10% Pursuance XP on contracts", "warden_bracers", [...T("reward", "armour"), "slot:hands"]);
      add(1, "Longer contracts", "100 points · contracts and their points half as big again (switch it off for free)", undefined, T("reward", "contract"));
      for (const set of SLAYER_SETS) add(set.slayer, `${set.name} armour`, `Dropped by ${MONSTERS[set.monster].name.toLowerCase()}s · ${set.effect}`, `${set.id}_${set.pieces[0].suffix}`, T("set", "armour"));
      break;
  }
  add(99, `${SKILL_NAMES[skill]} mastery cape`, "99,000 Frens from the Keeper of Capes (trimmed with two 99s)", `${skill}_cape`, [...T("cape"), "slot:cape"]);
  return byLevel(out);
}

// ---------- The recipe book ----------
export type BookRecipe = Recipe & { where: string };
/** Everything you can make, by skill. */
export function recipeBook(): BookRecipe[] {
  const at = (where: string) => (recipe: Recipe): BookRecipe => ({ ...recipe, where });
  return [
    ...smeltingRecipes().map(at("Furnace")),
    ...METALS.flatMap(metal => smithingRecipes(metal.id)).map(at("Anvil (hammer)")),
    ...Object.entries(COOKING).map(([raw, cook]): BookRecipe => ({ skill: "cooking", label: item(cook.cooked).name, level: cook.level, xp: cook.xp, ticks: 3, inputs: { [raw]: 1 }, outputs: { [cook.cooked]: 1 }, where: "Range or fire" })),
    ...craftingRecipes().map(at("Anywhere (needle and thread)")),
    ...CARVINGS.flatMap(carving => carvingRecipes(carving.log)).map(at("Anywhere (carving gouge on logs)")),
    ...Object.entries(GEM_CUTTING).map(([rough, cut]): BookRecipe => ({ skill: "crafting", label: item(cut.cut).name, level: cut.level, xp: cut.xp, ticks: 2, inputs: { [rough]: 1 }, outputs: { [cut.cut]: 1 }, tools: ["chisel"], where: "Anywhere (chisel)" })),
    ...fletchingRecipes("logs").slice(0, 1).map(at("Anywhere (knife on logs)")),
    ...FLETCH_BOWS.map(bow => fletchingRecipes(bow.log)[1]).map(at("Anywhere (knife on logs)")),
    at("Anywhere")(headlessRecipe()),
    ...METALS.map(metal => arrowRecipe(metal.id)).map(at("Anywhere")),
    ...FLETCH_BOWS.flatMap(bow => fletchingRecipes(bow.log).slice(2)).map(at("Anywhere (knife on logs)")),
    ...METALS.map(metal => boltRecipe(metal.id)).map(at("Anywhere (feathers on bolts)")),
    ...CROSSBOWS.map(bow => crossbowRecipe(bow.metal)).map(at("Anywhere (limbs on a stock)")),
    ...spinningRecipes().map(at("Spinning wheel")),
    ...[...FLETCH_BOWS.map(bow => bow.bow), ...WAR_BOWS.map(bow => bow.id)].map(id => stringingRecipe(`${id}_u`)!).map(at("Anywhere (string on the bow)")),
    ...AMULETS.map(entry => amuletRecipe(entry.gem)).map(at("Anywhere (string on the gem)")),
    ...SIGILCRAFT.map((altar): BookRecipe => ({ skill: "sigilcraft", label: item(altar.sigil).name, level: altar.level, xp: altar.xp, ticks: 1, inputs: { sigil_stone: 1 }, outputs: { [altar.sigil]: 1 }, where: `${item(altar.sigil).name.replace(" sigil", "")} altar` })),
  ];
}
/** The bows and arrows each Ranged level unlocks (for the guide's summary). */
export const rangedSummary = () => BOWS.map(bow => `${bow.name} (${bow.level})`).join(", ");
