# RareFriends Realm: full rules

An old-school, tick-based RPG in a 2.5D isometric world. Your verified Rare Friend is your adventurer.

## Controls

| Input | Does |
| --- | --- |
| Left-click | The first option, shown in the top-left (walk, chop, attack, talk…) |
| Right-click / long-press | Every option for what's under the pointer, plus Examine and Cancel |
| WASD | Walk in screen directions (at any camera angle) |
| ← → / ↑ ↓ | Turn / tilt the camera (from overhead down to almost ground level; you can see about 50 tiles before the land fades into haze) |
| Hold the scroll wheel and drag | Turn and tilt the camera |
| Compass (by the minimap) | Turn so north is at the top of the screen (the tilt and zoom stay as they are) |
| R, or the run orb | Toggle run (two tiles a tick, uses run energy) |
| Scroll, or + / − | Zoom (0.55× to 3×, close enough to watch every axe swing) |
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
| Magic | Spells paid in sigils (damage spells: base XP + 2 per damage) | Staffs autocast damage spells; the Breeze staff gives unlimited breeze sigils |
| Prayer | Burying bones (4.5 / 15 / 50 XP) | Recharge at altars; prayers drain points |
| Woodcutting | Trees 1, Oak 15, Willow 30, Maple 45, Yew 60, Ashwood 70 | Better axes cut faster |
| Firemaking | Light logs (same levels as Woodcutting) | Fires last about a minute; cook on them |
| Fishing | Net 1 (minnows), Bait 5/10 (perch, carp), Lure 20/30 (char, grayling), Cage 40 (inkcrab), Harpoon 50 (sailfish), Deep 76 (inkshark) | Bait and feathers are used up |
| Cooking | Ranges and fires | Burn chance falls with level, to zero at the stop-burn level |
| Mining | Clay/Pewter 1, Blackiron 15, Inkcoal 30, Gems 40, Moonsilver 55, Glimmer 70, Rarite 85 | 1/256 random gem per swing |
| Smithing | Furnace (pewter 1, blackiron 15 at 60%, ashsteel 30, moonsilver 50, glimmer 70, rarite 85; the higher metals add 1–4 inkcoal) and anvil | Dagger, axe, sword, pickaxe, helm, sabre, greaves, shield, cuirass in six metals |
| Crafting | Leather (gloves 1 … leggings 18), gems (moonstone 20, sagestone 27, rosestone 34) | Tessa tans hides for 2 coins each |
| Thieving | Villagers 1, merchant 25, guards 40; stalls 5 / 20 / 42 / 75 | Failing a pickpocket stuns you |
| Agility | Friendhollow course (5 obstacles, +40 XP a lap), stepping stones (20) | Agility restores run energy faster |

## The spellbook

| Level | Spell | Kind |
| --- | --- | --- |
| 1 | Homeward | Free, slow teleport to Friendhollow (not in combat) |
| 1 / 5 / 9 / 13 | Breeze, Tide, Stone and Ember Dart | Damage (max 2 / 4 / 6 / 8) |
| 3 / 11 / 27 | Muddle, Wilt, Brittle | Curses: −10% accuracy, −10% strength, −12% defence for a minute |
| 7 / 49 | Enchant Moonstone / Rosestone | Cut gem → moonstone or rosestone pendant |
| 15 | Bonebloom | Every bone in your pack → sweetberries |
| 17 / 23 / 35 | Breeze, Tide and Ember Lance | Damage (max 9 / 10 / 12) |
| 20 | Rootsnare | Roots a monster in place for ten seconds |
| 21 / 55 | Gilded Touch / Golden Touch | An item → 40% / 60% of its value in coins |
| 25 / 31 / 37 / 45 / 48 | Glide to Friendhollow, Emberforge, the Oasis, Frostpeak, the Pier | Teleports |
| 33 | Far Reach | Take a ground item from up to eight tiles away |
| 41 / 59 | Breeze and Ember Burst | Damage (max 13 / 16) |
| 43 | Forgeheart | Smelt ore into a bar in your hands (trains Smithing) |

Prayers: Paper Shield, Warm Heart, Clear Ink, Quiet Mind, Stone Shield, Bright Heart, Sharp Ink, Deep Mind, Mountain Shield,
Burning Heart, Perfect Ink and Friend's Ward (blocks most melee damage).

## Family perks

Your Friend's Generations family gives one perk: Skeleton (bones +50% Prayer XP), Mask (better Thieving, shorter stuns),
Family (shops 10% cheaper), Cellular (HP regenerates twice as fast), Asymmetry (8% chance of a second resource),
Hoverer (run drains 40% slower), Colossus (+1 melee max hit), Sparkling (gems three times as often), Hollow (+10% magic accuracy,
1 in 5 spells keeps its sigils).

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
| Shade, Hollow sentinel | 38, 64 | Hollow Depths |
| Moss colossus | 42 | Mossy Ruins |
| **The Hollow King** | 92 | The throne room (boss) |

## Quests (9 quest points)

1. **A Friend's Feast** (Cook Mabel, the castle kitchen): an egg, a pot of flour and a bucket of milk.
2. **Grumblin Trouble** (Captain Rook, the castle's great hall): defeat six Grumblins.
3. **The Cold Forge** (Brann, Emberforge): three pewter bars and two blackiron bars.
4. **Hollow Whispers** (Brother Ossic, the chapel): find the crypt key and lock the crypt altar.
5. **The Lost Glimmer** (Old Glimmer, by the fountain): three shards: the Grumblin chief, a swamp lurker, the town well.
6. **The Hollow King** (Old Glimmer, after 4 and 5): pass the Hollow gate and defeat the Hollow King.

## The world

A 240 × 240 tile island with 12 overworld regions (Friendhollow, Hollow Farms, Whisperwood, Ashen Hills, Emberforge,
Frostpeak, Glass Lake, Pale Dunes, Oasis, Murkmire, Mossy Ruins and the Pale Coast) and two dungeons
(Murkmire Crypt, Hollow Depths). Banks in Friendhollow (and up in the castle's south-west tower), Emberforge, the Oasis, Frostpeak and a deposit box by Glass Lake.

**Friendhollow Castle**, north of the fountain, has three storeys. Spiral staircases in the north-west and north-east towers
(click them: *Climb-up*, *Climb-down*) lead from the ground floor (kitchen, great hall, the Relic keeper, guard towers) to
King Hollis's floor (throne room, royal library, bedchamber, banquet gallery, the tower bank), and the north-east stair
carries on to the battlements. Upstairs, the storey you're on is drawn over the one below it, the rooms above you and
the roofs lift away, and the minimap keeps showing the ground. King Hollis has a welcome gift for first-time visitors.
Each region has its own music, unlocked the first time you arrive. The music player in Settings replays any track you've unlocked (turn Auto back on to follow the areas again).

## Rare Caskets: RF costs, odds and rules (simulated)

| Relic | Chance | RF value | Kept bonus | Wardrobe pieces |
| --- | --- | --- | --- | --- |
| Plain Relic | 60% (6,000 bps) | 0.5 RF | +2% XP in every skill per relic (max 5) | Rose cape, Sage scarf, Paper crown, Butter bow |
| Silver Relic | 28% (2,800 bps) | 1 RF | +10% coins from drops and pickpockets per relic (max 3) | Silver halo, Moonblue cape, Lantern familiar |
| Moonlit Relic | 10% (1,000 bps) | 2 RF | Gather 10% faster per relic (max 3) | Moon wisps, Starlit hood, Ink wings |
| Golden Relic | 2% (200 bps) | 5 RF | +10% XP and a golden aura while kept | Golden aura, Rarite crown |

- **Price** 1 RF (`1000000000000000000` base units); buy ×1 or ×5. **Expected value** 0.88 RF per casket; top prize 5 RF.
- **Consumable:** one casket opens into exactly one relic; single settlement, no reroll.
- **Backing:** each purchased or pending casket reserves 5 RF; kept relics keep their fixed RF backing with no expiry. Redeeming removes that relic's bonus.
- **Wardrobe:** every casket also grants an uncollected piece of its tier, drawn on your Friend, or coins for duplicates (250 / 600 / 1,500 / 5,000). Wardrobe pieces carry no RF value and are saved with your adventure.

Caskets use the SDK chance-game client (`buy` / `play` / `settle` / `redeem`) with the runtime's confirmations.
Coins are an earn-only, in-game currency and never convert to RF.

## Your Friend, dressed and followed

Wardrobe pieces are painted into your Friend's own sprite frame, pixel for pixel: hats and hoods sit on the real top of
the head, capes hang from the shoulders (and cover your back when you walk away), scarves and bows wrap the neck, wings
spread from the back, halos float above, and the figure shares one ink edge and white halo. Auras glow and the lantern
familiar bobs beside you. A follower (one of your other owned Friends) walks the tiles you leave behind, one step back.

## Sound

Every weapon swings with its own sound (slash, stab, crush, punch); every creature has a voice for attacking, being hurt,
dying, spotting you and idling nearby (clucks, moos, squeaks, grumbles, rattles, gurgles, growls, whispers, clanks, roars,
and the Hollow King). Axes and pickaxes hit on the beat of the swing, NPCs talk in soft blips, footsteps change with the
ground, fires crackle, forges roar, water laps, and each region has its own wildlife: birdsong, gulls, frogs, wind, drips.

## Saves

Your adventure saves every few seconds through the trusted host page, per wallet and per Friend, on this device.
Loads are checked: unknown items, impossible numbers or a position you can't stand on are cleaned up.
