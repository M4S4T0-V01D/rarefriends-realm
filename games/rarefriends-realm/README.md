# RareFriends Realm: full rules

An old-school, tick-based RPG in a 2.5D isometric world. Your verified Rare Friend is your adventurer.

## Controls

| Input | Does |
| --- | --- |
| Left-click | The first option, shown in the top-left (walk, chop, attack, talk…) |
| Right-click / long-press | Every option for what's under the pointer, plus Examine and Cancel |
| WASD / arrow keys | Walk in screen directions |
| R, or the run orb | Toggle run (two tiles a tick, uses run energy) |
| Scroll, or + / − | Zoom |
| M, or the map orb | World map (click a place to walk there) |
| Minimap click | Walk there |
| F1–F9, or I / K / L / O / P / N | Combat, Skills, Quests, Inventory, Equipment, Prayer, Magic, Friends, Settings |
| Enter | Chat (shown over your Friend's head) |
| Space, 1–5 | Continue dialogue, pick an option |
| Esc | Close interfaces |

**Use** an item, then click a target: raw food on a range or fire, tinderbox on logs, needle on leather,
chisel on an uncut gem, grain on the mill hopper, a bucket on the dairy cow, the crypt key on the crypt altar.

## The tick

The Realm runs on a 0.6-second game tick. You walk one tile per tick (two when running); skills roll on their
own timers (every 4 ticks for woodcutting and mining, 5 for fishing); weapons attack every 4–6 ticks.

## Skills (15)

XP follows the classic curve (83 XP for level 2, 13,034,431 for 99), multiplied by the **Realm rate ×3**,
+2% per kept Plain Relic (max 5), +10% with a Golden Relic, and +1–5% for a follower (see Friends).

| Skill | Train by | Notes |
| --- | --- | --- |
| Attack / Strength / Defence | Melee combat (4 XP per damage to your style's skill) | Styles: Accurate, Aggressive, Defensive, Controlled |
| Hitpoints | Any combat (1.33 XP per damage) | Starts at 10; regenerates 1 HP per minute |
| Magic | Combat spells (base XP + 2 per damage), teleports | Staffs autocast; Staff of air gives unlimited air runes |
| Prayer | Burying bones (4.5 / 15 / 50 XP) | Recharge at altars; prayers drain points |
| Woodcutting | Trees 1, Oak 15, Willow 30, Maple 45, Yew 60, Ashwood 70 | Better axes cut faster |
| Firemaking | Light logs (same levels as Woodcutting) | Fires last about a minute; cook on them |
| Fishing | Net 1, Bait 5/10, Lure 20/30, Cage 40, Harpoon 50, Deep 76 | Bait and feathers are used up |
| Cooking | Ranges and fires | Burn chance falls with level, to zero at the stop-burn level |
| Mining | Clay/Copper/Tin 1, Iron 15, Coal 30, Gems 40, Mithril 55, Adamantite 70, Rarite 85 | 1/256 random gem per swing |
| Smithing | Furnace (bronze 1, iron 15 at 50%, steel 30, mithril 50, adamant 70, rarite 85) and anvil | Dagger to platebody, six metals |
| Crafting | Leather (gloves 1 … chaps 18), gems (sapphire 20, emerald 27, ruby 34) | Tessa tans hides for 2 coins each |
| Thieving | Villagers 1, merchant 25, guards 40; stalls 5 / 20 / 42 / 75 | Failing a pickpocket stuns you |
| Agility | Friendhollow course (5 obstacles, +40 XP a lap), stepping stones (20) | Agility restores run energy faster |

## Family perks

Your Friend's Generations family gives one perk: Skeleton (bones +50% Prayer XP), Mask (better Thieving, shorter stuns),
Family (shops 10% cheaper), Cellular (HP regenerates twice as fast), Asymmetry (8% chance of a second resource),
Hoverer (run drains 40% slower), Colossus (+1 melee max hit), Sparkling (gems three times as often), Hollow (+10% magic accuracy,
1 in 5 spells keeps its runes).

## Combat

Old-school accuracy and max-hit formulas: your effective level (with prayer and style) times equipment bonus against the
target's defence roll. Monsters retaliate; aggressive ones attack anyone whose combat level is at most twice their own.
They use simple step-toward pathing, so you can get them stuck behind obstacles. Eating takes a moment and delays your
next attack. **Death is safe:** you wake by the Friendhollow fountain with your items.

| Monster | Level | Where |
| --- | --- | --- |
| Chicken, Cow, Ink rat | 1–2 | Hollow Farms, Friendhollow, Ashen Hills |
| Grumblin, Grumblin chief | 5, 13 | Whisperwood camp |
| Swamp lurker | 16 | Murkmire |
| Dune bandit | 22 | Pale Dunes |
| Crypt skeleton | 25 | Murkmire Crypt |
| Frost wolf, Frost yeti | 32, 55 | Frostpeak |
| Shade, Hollow knight | 38, 64 | Hollow Depths |
| Moss colossus | 42 | Mossy Ruins |
| **The Hollow King** | 92 | The throne room (boss) |

## Quests (9 quest points)

1. **A Friend's Feast** (Cook Mabel, Hollow Hall kitchen): an egg, a pot of flour and a bucket of milk.
2. **Grumblin Trouble** (Captain Rook, Hollow Hall): defeat six Grumblins.
3. **The Cold Forge** (Brann, Emberforge): three bronze bars and two iron bars.
4. **Hollow Whispers** (Brother Ossic, the chapel): find the crypt key and lock the crypt altar.
5. **The Lost Glimmer** (Old Glimmer, by the fountain): three shards: the Grumblin chief, a swamp lurker, the town well.
6. **The Hollow King** (Old Glimmer, after 4 and 5): pass the Hollow gate and defeat the Hollow King.

## The world

A 240 × 240 tile island with 12 overworld regions (Friendhollow, Hollow Farms, Whisperwood, Ashen Hills, Emberforge,
Frostpeak, Glass Lake, Pale Dunes, Oasis, Murkmire, Mossy Ruins and the Pale Coast) and two dungeons
(Murkmire Crypt, Hollow Depths). Banks in Friendhollow, Emberforge, the Oasis, Frostpeak and a deposit box by Glass Lake.
Each region has its own music.

## Rare Caskets: RF costs, odds and rules (simulated)

| Relic | Chance | RF value | Kept bonus | Wardrobe pieces |
| --- | --- | --- | --- | --- |
| Plain Relic | 60% (6,000 bps) | 0.5 RF | +2% XP in every skill per relic (max 5) | Rose cape, Sage scarf, Paper crown |
| Silver Relic | 28% (2,800 bps) | 1 RF | +10% coins from drops and pickpockets per relic (max 3) | Silver halo, Moonblue cape |
| Moonlit Relic | 10% (1,000 bps) | 2 RF | Gather 10% faster per relic (max 3) | Moon wisps, Starlit hood |
| Golden Relic | 2% (200 bps) | 5 RF | +10% XP and a golden aura while kept | Golden aura |

- **Price** 1 RF (`1000000000000000000` base units); buy ×1 or ×5. **Expected value** 0.88 RF per casket; top prize 5 RF.
- **Consumable:** one casket opens into exactly one relic; single settlement, no reroll.
- **Backing:** each purchased or pending casket reserves 5 RF; kept relics keep their fixed RF backing with no expiry. Redeeming removes that relic's bonus.
- **Wardrobe:** every casket also grants an uncollected piece of its tier, drawn on your Friend, or coins for duplicates (250 / 600 / 1,500 / 5,000). Wardrobe pieces carry no RF value and are saved with your adventure.

Caskets use the SDK chance-game client (`buy` / `play` / `settle` / `redeem`) with the runtime's confirmations.
Coins are an earn-only, in-game currency and never convert to RF.

## Saves

Your adventure saves every few seconds through the trusted host page, per wallet and per Friend, on this device.
Loads are checked: unknown items, impossible numbers or a position you can't stand on are cleaned up.
