# RareFriends Realm: full rules

An old-school, tick-based RPG in a 2.5D isometric world. Your verified Rare Friend is your adventurer.

## Controls

| Input | Does |
| --- | --- |
| Left-click | The first option, shown in the top-left (walk, chop, attack, talk…) |
| Right-click / long-press | Every option for what's under the pointer, plus Examine and Cancel. Works in every interface too: inventory, bank (Withdraw/Deposit 1, 5, 10, All), shops (Value, Buy/Sell 1–50), equipment (Remove), spells (Cast, Autocast), prayers, production (Make 1–All), skills, quests, followers, wardrobe, music, the orbs, the compass (Look North/East/South/West) and the minimap (Walk here) |
| WASD | Walk in screen directions (at any camera angle) |
| ← → / ↑ ↓ | Turn / tilt the camera (from overhead down to almost ground level; you can see about 50 tiles before the land fades into haze) |
| Hold the scroll wheel and drag | Turn and tilt the camera |
| Compass (by the minimap) | Turn so north is at the top of the screen (the tilt and zoom stay as they are) |
| R, or the run orb | Toggle run (two tiles a tick, uses run energy) |
| Scroll, or + / − | Zoom (0.55× to 3×, close enough to watch every axe swing) |
| M, or the map orb | World map (click a place to walk there) |
| Minimap click | Walk there |
| F1–F10, or I / K / L / O / P / N | Combat, Skills, Quests, Inventory, Equipment, Faith, Magic, Friends, Settings, Emotes |
| Click a skill | Its guide: everything it unlocks, level by level (Recipe book button for every recipe) |
| Enter | Chat (shown over your Friend's head) |
| Space, 1–5 | Continue dialogue, pick an option |
| Esc | Close interfaces |

**Use** an item, then click a target: raw food on a range or fire, tinderbox on logs, needle on leather,
chisel on an uncut gem, grain on the mill hopper, a bucket on the dairy cow, the crypt key on the crypt altar.

## The tick

The Realm runs on a 0.6-second game tick. You walk one tile per tick (two when running); skills roll on their
own timers (every 4 ticks for woodcutting and mining, 5 for fishing); weapons attack every 4–6 ticks.

## Skills (19)

XP follows the classic curve (83 XP for level 2, 13,034,431 for 99), multiplied by the **Realm rate ×3**,
+2% per kept Plain Relic (max 5), +10% with a Golden Relic, and +1–5% for a follower (see Friends).

| Skill | Train by | Notes |
| --- | --- | --- |
| Attack / Strength / Defence | Melee combat (4 XP per damage to your style's skill) | Styles: Accurate, Aggressive, Defensive, Controlled |
| Ranged | Bows and crossbows (4 XP per damage; Longrange splits it with Defence) | Bows by wood (Shortbow 1, Oak 5, Willow 20, Maple 30, Yew 40, Ashwood 50, Gloomfang 60) fire the best arrows in your pack (pewter 1 … rarite 40, frostsilver 50 … ashenheart 90). War bows (War bow 5, Oak 10, Willow 25, Maple 35, Yew 45, Ashwood 55) draw a tick slower, add strength to every arrow and reach 8 tiles. Crossbows (pewter 1, blackiron 10, ashsteel 20, moonsilver 30, glimmer 40, rarite 45, then frostsilver 50 … ashenheart 90) fire bolts only, a tick slower and harder hitting, and are one-handed, so a shield fits. Hazel's quiver (worn on the back) returns four in five shots to your pack. Styles: Accurate, Rapid (a tick faster), Longrange (+2 tiles). Most arrows can be picked up again |
| Hitpoints | Any combat (1.33 XP per damage) | Starts at 10; regenerates 1 HP per minute |
| Magic | Spells paid in sigils (damage spells: base XP + 2 per damage) | Staffs autocast damage spells; breeze, tide, stone and ember staffs give unlimited sigils of their element. Basic sigils cost about 3 coins |
| Sigilcraft | Press sigil stones at an altar: Breeze 1, Thought 2, Tide 5, Stone 9, Ember 14, Shade 20, Star 27, Storm 35, Bloom 44, Path 54, Hollow 65 | Sigil stones are mined (endlessly) in the Wizards' Tower; one more sigil per stone for every 11 levels past the altar's |
| Faith | Burying bones (4.5 / 15 / 50 XP), offering them on an altar (×2, ×3 in the Dawnhold chapel), hits with a faith weapon | Pray at altars to restore faith; prayers drain it |
| Woodcutting | Trees 1, Oak 15, Willow 30, Maple 45, Yew 60, Ashwood 70 | Better axes cut faster |
| Firemaking | Light logs (same levels as Woodcutting) | Fires last about a minute; cook on them |
| Fletching | A knife on logs: 15 arrow shafts (8 XP), a bow (Shortbow 5, Oak 20, Willow 35, Maple 50, Yew 65, Ashwood 80), a war bow from two logs (10, 25, 40, 55, 70, 85) or a crossbow stock (wooden 9, oak 24, willow 39, maple 54, yew 69, ashwood 84); feathers on shafts; arrowheads on headless arrows (pewter 1 … rarite 75); feathers on unfeathered bolts (pewter 5 … rarite 79) | Arrowheads (15 a bar), unfeathered bolts (12 a bar) and crossbow limbs (2 bars) are smithed at the anvil. Limbs on their stock make a crossbow with Crafting (pewter 8, blackiron 18, ashsteel 28, moonsilver 42, glimmer 56, rarite 70) |
| Fishing | Net 1 (minnows), Bait 5/10 (perch, carp), Lure 20/30 (char, grayling), Cage 40 (inkcrab), Harpoon 50 (sailfish), Deep 76 (inkshark) | Bait and feathers are used up |
| Cooking | Ranges and fires | About one in five burn at the food's own level (a touch more on a fire), easing off fast to none at its stop-burn level (minnows 12, chicken and beef 14, perch 22, carp 32) |
| Mining | Clay/Pewter 1, Blackiron 15, Inkcoal 30, Gems 40, Moonsilver 55, Glimmer 70, Rarite 85 | 1/256 random gem per swing |
| Smithing | Furnace (pewter 1, blackiron 15 at 60%, ashsteel 30, moonsilver 50, glimmer 70, rarite 85; the higher metals add 1–4 inkcoal), then the forged metals from monster materials (frostsilver 86, gloomsteel 88, wyrmscale 90, hollowsteel 92, cindersteel 94, ashenheart 96, with 4–6 inkcoal); and the anvil | Dagger, axe, sword, pickaxe, helm, sabre, greaves, shield, cuirass in twelve metals; the forged metals also make a staff |
| Crafting | Leather (gloves 1 … leggings 18), gems (moonstone 20, sagestone 27, rosestone 34) | Tessa tans hides for 2 coins each |
| Thieving | Villagers 1, merchant 25, guards 40; stalls 5 / 20 / 42 / 75 | Failing a pickpocket stuns you |
| Agility | Friendhollow course (5 obstacles, +40 XP a lap), stepping stones (20) | Agility restores run energy faster |
| Slayer | Tasks from Warden Thistle (Market Street): XP equal to each creature's hitpoints | 10 points a task (50 every tenth). Mire crawlers need Slayer 10, frost wisps 30, gloom hounds 50 |

**Mastery capes.** Reach 99 in a skill and the Keeper of Capes (Friendhollow Castle's great hall) sells its cape for
99,000 coins. Master two skills and every cape you buy comes trimmed; master all seventeen for the Grandmaster's cape.
Capes are worn on your Friend's sprite, trim and emblem included.

**Slayer rewards** (points): cancel a task (30), a Lamp of insight (100), the Warden's helm (150: +15% accuracy and
damage on task), the Gloomfang bow (600).

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

Your Friend's Generations family gives one perk: Skeleton (bones +50% Faith XP), Mask (better Thieving, shorter stuns),
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
| Mire crawler (Slayer 10), Frost wisp (Slayer 30), Gloom hound (Slayer 50) | 18, 36, 58 | Murkmire, Frostpeak, Hollow Depths |
| Ash drake, Cinder drake (dragonfire) | 68, 86 | Wyrmreach |
| **Old Cinder** (dragonfire) | 148 | Wyrmreach's crater (boss) |

**Dragonfire.** A third of a dragon's attacks are breath (up to 32, 45 or 65 damage), which the Friend's Ward prayer doesn't stop.
A **Wyrmward shield** (free from King Hollis: "I'm going after dragons") turns it into a few points. Dragons drop drake
bones (72 Faith XP), drakehide (Crafting 57–63: bracers, chaps and a vest for archers) and, from Old Cinder, a Wyrm heart.
| **The Hollow King** | 92 | The throne room (boss) |

## Forged gear (levels 50–90)

Above rarite (level 40) are six forged metals. They aren't mined: each is smelted, one bar per material plus inkcoal,
from what the strongest creatures drop, then smithed at any anvil at Smithing 86–99 into the full set (dagger, sword,
sabre, helm, shield, cuirass, greaves, axe, pickaxe), a staff, crossbow limbs, arrowheads and bolts. Finished pieces
also drop now and then, and Frostpeak Outfitters sells frostsilver.

| Metal | Level | Material | Dropped by |
| --- | --- | --- | --- |
| Frostsilver | 50 | Frost shard | Frost yetis (30%), frost wisps, frost wolves |
| Gloomsteel | 60 | Gloom shard | Gloom hounds (30%), Hollow sentinels, shades |
| Wyrmscale | 70 | Wyrm scale | Ash drakes (30%), cinder drakes (35%) |
| Hollowsteel | 75 | Hollow essence | Hollow sentinels (20%), the Hollow King (3–5, always) |
| Cindersteel | 80 | Cinder core | Old Cinder (1–3, always), cinder drakes (8%) |
| Ashenheart | 90 | Colossus ember | The Ashen Colossus (2–4 for everyone who wounds it), Old Cinder (10%) |

Weapons need that Attack level, armour that Defence level, staffs that Magic level, crossbows that Ranged level, and
axes and pickaxes that Woodcutting or Mining level to cut and mine (faster at every tier).

## Quests (19 quest points)

1. **A Friend's Feast** (Cook Mabel, the castle kitchen): an egg, a pot of flour and a bucket of milk.
2. **Grumblin Trouble** (Captain Rook, the castle's great hall): defeat six Grumblins.
3. **The Cold Forge** (Brann, Emberforge): three pewter bars and two blackiron bars.
4. **Hollow Whispers** (Brother Ossic, the chapel): find the crypt key and lock the crypt altar.
5. **The Lost Glimmer** (Old Glimmer, by the fountain): three shards: the Grumblin chief, a swamp lurker, the town well.
6. **The Hollow King** (Old Glimmer, after 4 and 5): pass the Hollow gate and defeat the Hollow King.
7. **Hazel's Quiver** (Hazel, Fernwick): win her grandmother's quiver back from the Grumblin chief, and bring 2 leather, 15 feathers and 5 oak logs to mend it. The reward, worn on your back, returns four in five arrows and bolts to your pack.
8. **The Dawn Vigil** (Grandmaster Aldric, Dawnhold, east of Highcairn; Faith 10): offer eight bones on the Dawnhold chapel altar. Reward: a Dawnsteel sword, 1,500 Faith XP and the Order Armoury (Quartermaster Bram).
9. **Light in the Greyhorn** (Grandmaster Aldric, after The Dawn Vigil; Faith 30): take three Dawnstone shards from the stone golems of the Greyhorn mine, bless them on the chapel altar and bring back the Dawnstone. Reward: the Cape of the Dawn, 5,000 Faith XP, 2,000 Defence XP and the armoury's finest faith weapons.
10. **The Pilgrim's Road** (Sister Maren, Dawnhold, after The Dawn Vigil; Faith 35): pray at the Friendhollow chapel altar, the Highcairn mountain shrine and the Murkmire crypt altar. Reward: Dawnplate greaves, 4,000 Faith XP.
11. **The Restless Crypt** (Sister Maren, after Light in the Greyhorn and The Pilgrim's Road; Faith 45): lay twelve crypt skeletons to rest with a faith weapon (other kills don't count). Reward: Dawnplate helm and shield, 7,000 Faith XP.
12. **Dawn Against the Hollow** (Grandmaster Aldric, after The Restless Crypt and The Hollow King; Faith 60): destroy five Hollow sentinels with a faith weapon and bring three Hollow essence. Reward: the Dawnplate cuirass, 15,000 Faith XP, 5,000 Defence XP.

## The world

A 350-wide island with 17 overworld regions (Friendhollow, Hollow Farms, Whisperwood, Fernwick, Ashen Hills, the Greyhorn Highlands, Highcairn, Emberforge,
Frostpeak, Glass Lake, Pale Dunes, Oasis, Murkmire, Mossy Ruins, the Wizards' Tower, Wyrmreach and the Pale Coast) and two dungeons
(Murkmire Crypt, Hollow Depths). Banks in Friendhollow (and up in the castle's south-west tower), Emberforge, the Oasis, Frostpeak, Fernwick and a deposit box by Glass Lake.

**Fernwick**, a woodcutters' village in the heart of Whisperwood (the woods road west from the Ashen mine, or north from
the Grumblin camp), has Hazel's War Bows (the only shop selling war bows; also bolts, stocks and a moonsilver crossbow),
Rowan's Timber Yard (axes, and the best price for logs, 75%) and a bank in the lodge, with oaks and maples all round,
willows by the pond and archery butts behind Hazel's.

**Friendhollow** has grown: south of the fountain, **Market Street** has Hollis Armoury (helms to shields, pewter to
moonsilver), Edge & Hilt (daggers, swords, sabres), Fletch & Feather (bows, arrows, the first three crossbows and their bolts, hunter's hides) and the Warden's
Lodge (Slayer). The Sleepy Friend inn (food, and a range) is east of the square, and the Rare Market is west.

**The Greyhorn Highlands**, east of the Pale Dunes and south of Frostpeak, climb into walkable mountains: grassy
shoulders, scree, snow on the peaks, broken crags (the roads cut passes), Greyhorn Tarn (char and grayling for a rod) and
the Greyhorn mine (glimmer, rarite, moonsilver, inkcoal). Wolves and yetis roam the snow, gloom hounds the southern slopes.
**Highcairn**, a stone town on a plateau in the middle, has a bank, the Highcairn Stores (a general store), the Stone
Kettle inn (with a range), the Highcairn Forge (a furnace and anvil, and a smith selling pickaxes and bars), a mountain
shrine and a Rare Market trader, with roads to the Frostpeak camp and the Oasis.

**Two-handed weapons.** Greatswords, battleaxes and war hammers in all twelve metals (3 bars at the anvil): a tick slower
than a sword, much harder hitting, and they take both hands. Heft & Haft, at the south end of Market Street, sells them in
pewter to moonsilver (and a glimmer greatsword).

**Creatures and their drops.** Forest spiders (level 12, Whisperwood: a Spider-fang dagger, fast), wild boars (16, the
southern woods: the two-handed Tusker axe), highland goats (22, the Greyhorn slopes: a Horned helm, and wool), sand
scorpions (30, the Pale Dunes: the Stinger sabre) and stone golems (45, the Greyhorn mine: the two-handed Golem maul, and
ore). Grumblins sometimes carry a Grumblin spear, and moss colossi a Mossy staff or a Mossblade.

**Sheep, wool and string.** The sheep pen sits between the cows and the chickens at Hollow Farms. Shear a sheep with shears
(sold in general stores) for wool; it looks shorn until its fleece grows back. Spin wool into string at a spinning wheel
(the farmhouse, or Tessa's tannery) for 5 Crafting XP from level 1. Bows are cut unstrung (a knife on logs) and finished
with a string; a string on a cut gem makes an amulet (moonstone 16, sagestone 23, rosestone 31), and Enchant Moonstone and
Enchant Rosestone turn those amulets into pendants.

**Ruins** stand out in the wild: crumbling old houses with a doorway and flagstones, broken round towers (tall on one side,
fallen to rubble on the other) and runs of ancient wall, in Whisperwood, the Ashen Hills, past the Millpond, the Pale Dunes,
the Murkmire, below Frostpeak, round Glass Lake, by the Mossy Ruins and on the Pale Coast.

**The Wizards' Tower**, across the river east of town, rises high under an eight-sided spire, and has three storeys inside: sigil stones and Apprentice Pell's stores
(sigils, elemental staffs, robes) on the ground floor, a library with a Rare trader above, and Archmage Solenne at the
top. Your first visit to her gets you scholar's robes, a staff and 480 sigils.

**Wyrmreach**, north-west past the deep woods, is ash and lava: a hunters' camp (a deposit box, a Rare trader and
Ysolde, who knows about dragons) at the pass, drakes on the slopes, and Old Cinder's crater.

**Selling.** Merchants pay more for their own trade than the 40% most shops pay: Pike (fish, 60%), Axel (logs, 60%),
Emberforge Arms (ore, bars, arms, 55%), Runa and the Tower stores (sigils and magic, 60%), Tessa (hides and leather, 60%),
Mort the bone collector (bones and hides, 65%), Rowan's Timber Yard in Fernwick (logs, 75%), the Oasis bazaar (gems, jewellery, food, 70%), Fletch & Feather
(bows, arrows, logs, 60%), the armoury and the weaponsmith (55%), and the inn (fish and food, 55%). Right-click an item
in a shop for its *Value*. Every trader buys back what it sells, and general stores (Friendhollow, and now Emberforge,
Frostpeak and the Oasis) buy almost anything. What you sell goes on the shop's shelves with its count, so you can buy it
back. The Rare Market's bundle list scrolls in a compact box.

**First steps.** A new Friend gets a short guided start: chop a tree, light a fire, catch and cook a fish, stroke the
horses at the stables, climb the castle to meet King Hollis, and open the Realm Daily. A card in the corner shows the
step, a gold arrow (and a star on the minimap) points the way, and each step completes itself from what you do. The last
one pays 500 coins and a Lamp of insight. Skip it any time; older saves never see it.

**Getting through to other players.** Direct WebRTC links need both networks to allow them, and there's no TURN server,
so strict networks (some routers, mobile data, office Wi-Fi) used to leave players unable to see each other. Every
message now also goes out as a signed, short-lived (ephemeral) Nostr event through public relays, which any network can
reach. Each player sees one copy of every message, whichever path it took. Presence goes over the relays every two seconds
(and over direct links every tick). Whispers and trades use the direct link when there is one, and the relays only when
there isn't. Hovering the online badge shows how many relays are connected and how many players are on a direct link.
`NO_DIRECT=1 REAL_RELAYS=1 node tests/multiplayer-browser.mjs` checks two players meet and chat with direct links blocked.

**The viewport.** The game plays on a fixed 960 × 640 stage inside the SDK's own frame (its default 3:2 viewport),
scaled to fit the page and centred. The world is far larger and scrolls under a camera, and every menu, panel and HUD
element stays inside the stage.

**The bank.** Click to withdraw or deposit (right-click for amounts). Drag an item onto another to move it, onto a tab
to file it there, or onto + to open a new tab (up to nine; each shows its first item). The ∞ tab shows everything, deposits
go into the tab you're looking at, and a tab closes when it's emptied. Right-click an item to move it between tabs without
dragging.

**The inkcoal satchel.** Worn on your back (or carried), it holds 120 inkcoal: inkcoal you mine goes into it while there's
room, and the furnace and Forgeheart take from it first. Right-click it to check, fill or empty it; use inkcoal on it to fill
it. The Old miner at the Ashen mine sells them, or stitch one from 3 leather and thread at Crafting 28.

**The sigil stone box.** Carried in your pack, it holds 120 sigil stones: stones you mine go into it while there's room,
and an altar presses everything in it along with your pack. Right-click it to check, fill or empty it; use stones on it to
fill it. The Tower Stores and Runa's Sigils sell it. At the bank, right-click the box (or the inkcoal satchel) in your pack
to Fill it straight from the bank or empty it back in, or press the Fill button.

**The Millpond**, south of the Hollow Farms windmill, has two net spots (minnows) and a bait spot (perch, carp) for new
Friends. **The Grumblin head** is a very rare drop (1 in 500 from Grumblins, 1 in 50 from the chief), worn on your head.

**Signs, banners and logging out.** Every shop and bank has a hanging sign outside its door, painted with what's sold
inside (coins for banks, a horse for the stables). Banners of your own Friend, in the scenery's pixel style, fly around the
fountain square and at the castle gate. The ⏻ button by the minimap (or Settings → Save and log out) saves at once and
returns to the title screen with a confirmation that the adventure is safe in this browser.

**Early levels.** XP in a skill is scaled by your level in it: about half speed at level 1, three-quarters at 15, and the
full Realm rate from level 30 up, so the first levels mean something. Fixed rewards (lamps, challenges) pay in full.

**Graphics and performance.** Settings → Graphics offers High (the default) and Low; they never change by themselves,
and settings are kept in the browser. Low turns off the pixel textures, ambient life, cloud shadows, cast shadows,
footprints and fog, leaves a clear day unlit, lightens the rain, shortens the view and draws at 1× on high-DPI screens.
High draws at up to 1.5× on high-DPI screens. The browser
test measures frame cost at three busy scenes on every run. Headless, without a GPU (measured before the new lighting,
which adds its shadows and light passes to High):

| Scene | High | Low |
|---|---|---|
| Friendhollow (castle and Market Street) | 41 ms | 7 ms |
| Whisperwood (dense forest) | 35 ms | 8 ms |
| A stormy night in town | 18 ms | 8 ms |

On a desktop GPU (an RTX 2060), High takes about 22 ms in the busiest view.

**The world boss.** The Ashen Colossus (level 210, 1,500 HP) rises in Wyrmreach every two hours, on the even UTC
hours, and stays twenty minutes. Everyone's game raises it at the same tile with the same id, and its HP is shared
through the shared-fight reports. When it falls, **everyone who wounded it** gets the kill and the loot: 4,000–12,000
coins, rarite bars and a rare table, plus a 1 in 6 chance of the Cinderkin pet. The Realm Daily shows when it's next
due, and a chat line announces it.

**The Sparring Ring.** A fenced sand ring east of Market Street. Inside it, right-click another player (also inside)
and choose *Fight*. Your game rolls your hits and sends them; theirs applies them only while both of you stand in the
ring, at most one every two ticks, capped at 40. At 0 HP the loser is back at full health straight away, nothing is
lost, and the win and loss are recorded (shown on the adventurer card). Players retaliate when auto-retaliate is on.

**Pets.** Six companions, found by chance on a successful action. You're up to three times luckier at level 99.

| Pet | Found by | Base odds |
|---|---|---|
| Stumpy | Woodcutting | 1 in 700 |
| Pebble | Mining | 1 in 700 |
| Bubbles | Fishing | 1 in 700 |
| Mote | Sigilcraft | 1 in 250 |
| Emberling | Dragons | 1 in 60 |
| Cinderkin | The Ashen Colossus | 1 in 6 |

A pet follows you instead of a Friend follower (call or send it home from the Friends tab). Other players see it
trotting behind you.

**Early levels.** Below level 30 every skill pays a little less XP (about half at level 1, full from 30). Gathering and
making skills start lower still, at 30% at level 1, catching up with combat by level 10.

**Achievements and hiscores.** 32 achievements (skills, combat, quests, collecting, together, daily) are checked
against your adventure every few seconds; older saves earn the ones they already deserve in one quiet catch-up. Each
unlock gets a chime and golden fireworks. They're on the Achievements tab of the Realm Daily and counted on the
adventurer card. The Friends tab's hiscores rank you against every player you've met online (up to 150, with the levels
they last showed).

**Little things.** Level-ups set off fireworks in the skill's colours, which players near you see too. Riding clip-clops
(three times a tick on a unicorn) and kicks up dust, and mounting gets a whinny. Snow and sand keep footprints (hoofprints
when riding) for a while, and the bog splashes. Rare or valuable drops stand in a pulsing beam of gold light with a
chime and a chat line. When a friend near you emotes while you're idle, your Friend joins in.

**The Realm Daily.** A popup greets you when you enter the Realm. The Daily streak tab pays a reward for every
day you log in, on a seven-day cycle: 500 coins, 5 cakes, 1,000 coins, 10 inksharks, 2,000 coins, 100 each of four
elemental sigils, then a Lamp of insight and 5,000 coins. Each full week you keep up adds 25% to the coins, up to +100%.
Miss a day and it starts again at day 1. It also lists three challenges, the same for everyone that day (UTC):
gain XP in two skills (scaled to your level) and defeat some monsters. Each pays coins and bonus XP, and all three
open the daily chest (1,500 coins and a Lamp of insight). The Updates tab lists what's new in every update. It opens
by itself after an update (or right after you claim your daily), and the 🔥 button on the minimap reopens the
popup, with a red dot when something's waiting.

**Mounts.** Marigold runs the Friendhollow stables, beside the Rare Market on the path west of the square, with a paddock where a chestnut, a dapple grey
and a unicorn graze (right-click to *Stroke* them). She sells eight mounts for simulated RF. Like the Rare Market, RF
buys Rare Caskets and the mount comes with them. Every mount gallops two tiles a tick without using run energy, and
unicorns go three. Each also has a gift:

| Mount | Caskets | Gift |
|---|---|---|
| Chestnut horse | 2 | none |
| Piebald pony | 2 | heals 1 HP every 12 s |
| Bay horse | 3 | gather 5% faster |
| Dapple grey | 3 | +10% coins from drops and pickpockets |
| Palomino | 4 | +5% XP |
| Black warhorse | 4 | +8 Defence |
| Unicorn | 6 | +10% XP, heals 1 HP every 6 s |
| Moonlit unicorn | 8 | +10% XP, gather 10% faster, lights the dark |

Ride or dismount with the saddle button by the run orb (right-click it to pick a mount) or **H**. You go on foot
underground and upstairs. Other players see you riding.

**The look of the land.** Ground tiles share the buildings' pixel textures: grass tufts with the odd flower, pebbled dirt
paths, cobbled streets in staggered setts, flagstones, wind-rippled sand and snow, boards, furrows and dungeon flags. Only
tiles near you and at normal zoom are textured, so it stays quick. Furnaces are brick kilns with a fire in an arched mouth
and a smoking chimney. Campfires are small pixel flames on a pile of cut logs. Equipped shields show on your Friend's
off arm, and weapons are painted into your Friend's own pixels too: swords, daggers and sabres held in a ready guard,
axes and pickaxes over the shoulder, staffs upright with an orb of their element, bows held up by the grip. They rock with
your step and sit behind you when that arm is on the far side. They animate in the same pixels too: swords wind up,
strike and follow through, staffs thrust as a spell leaves, bows flex, axes chop, pickaxes strike, hammers ring on the
anvil, rods cast (the line runs from the rod's tip) and food is held over the fire. Other players see all of it.

**Day and night.** A Realm day lasts 24 minutes. Dusk turns the light warm, and at night the land goes blue-dark
except around lamps, torches, fires, forges, altars and your own small light (a lantern familiar carries a bigger one).
The badge under the minimap shows the time of day; Settings can turn the cycle off. The minimap uses clearer colours:
green land, blue water, black walls, yellow dots for NPCs and monsters, red for items, white for your follower.

**Lighting.** A light field is rebuilt every frame for the land on screen (lighting.ts). Each point of the ground gets the
sky's ambient colour for the time of day (darker where walls, trees and rocks crowd it, and under roofs), sunlight or
moonlight, point lights (lamps, torches, fires, forges, altars, spells and your own light) with physical falloff and
shadows marched through a height map of what's in the way, one bounce of each light off the ground in the ground's
colour, and lava's glow. The sun rises in the east, crosses the south and sets in the west: buildings, walls and cliffs
cast projected shadows, and trees, rocks, characters and decor cast sheared silhouettes of their own sprites. The ground
is lit before anything stands on it, and every object takes the light at its own feet, cut to its exact outline, so light
lands on things instead of glowing over them. Health bars, names and speech are never dimmed. On Low, a clear day is
drawn unlit and nights get the light without the shadows.

**Weather.** Torches and fires flicker. The sky comes from the real clock in four-minute spells, so every player sees the
same weather at the same moment: clear, rain, or a storm with lightning (thunder follows the flash) and a darker sky.
Deserts and the frozen peaks stay dry, dawn brings ground fog, and the Murkmire is always misty. Settings can turn
weather off.

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

**The Rare Market.** Rare traders in Friendhollow, Emberforge, the Oasis, Frostpeak, Pike's Pier, the Wizards' Tower
and the Wyrmreach camp (each next to a casket chest) sell bundles. RF buys one thing in the SDK's simulated economy, the Rare Casket, so every bundle buys
caskets (opened as usual) and adds guaranteed goods on top:

| Bundle | RF (caskets) | Adds |
| --- | --- | --- |
| Traveller's satchel | 1 | Two of each Realm tablet (break to travel to Friendhollow, Emberforge, the Oasis, Frostpeak, the Pier) |
| Hero's hamper | 1 | 10 inksharks, 5 cakes |
| Lamp of insight | 2 | Rub for 100 × your level in XP, in a skill you choose |
| Slayer's contract | 2 | 40 Slayer points |
| Archer's quiver | 2 | A maple bow and 300 moonsilver arrows |
| Tailor's pick | 3 | Any wardrobe piece up to Moonlit tier, your choice |
| Sigil sack | 1 | 300 each of breeze, tide, stone, ember and thought sigils, and 30 hollow |
| Fletcher's crate | 1 | 600 arrow shafts, 600 feathers, 300 ashsteel arrowheads |
| Dragonslayer's kit | 3 | A Wyrmward shield, a drakehide vest, 20 inksharks, 200 rarite arrows |

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

## Playing together

Everyone online shares the Realm: other players' Friends walk around in their wardrobes, capes and weapons, with a
name tag (green for friends) and their chat over their heads. Their dots show on the minimap (white, friends green),
and the badge by the minimap shows how many are online.

| Do | How |
| --- | --- |
| Talk | Type in the chat box (everyone sees it); `@1234 hello` whispers to Friend #1234 (Private tab) |
| Player menu | Right-click a player: *Follow*, *Add-friend* / *Remove-friend*, *Message*, *Wave*, *Ignore*, *Examine* |
| Friends list | Friends tab: who's online, where and at what level; message or remove; add by Friend # |
| Fight together | Attack the same monster as another player: both of your hits count, it walks to where they're fighting it, and you see each other's health bars. The last hit in your game gets the loot |
| Referrals | Friends tab: your code is RF-<your Friend #>. A friend who enters it and you each get 250 coins, the Friendship cape and +15% XP for an hour of play (you, the next time you're both online; once per friend, at most five in any 24 hours, with the rest credited later). Wear the cape for the Friendship emote |
| Party bonus | +5% XP while a friend is within 12 tiles on your storey |
| Trade | Right-click a player → *Trade with* (they accept from the prompt). Click or right-click items to offer (*Offer-1/5/10/All*), both press Accept, check the second screen, and Accept again. Any change clears both accepts. Untradeable items (quest items, capes) can't be offered |
| Dropped items | Things you drop from your pack show on other players' screens; *Take* one and it's yours if you're first |
| Emotes | Emotes tab (F10), or right-click → *Perform*: Wave, Bow, Dance, Cheer, Clap, Laugh, Cry, Think, Jump for joy, Yes, No, Spin, Flex, and Skillcape (wearing a mastery cape). Walking ends one; others see them |
| Go offline | Settings → *Online* |

Links are stripped from chat, chat is rate-limited, and ignored players disappear. Monsters, trees and drops are
still your own (each player's world runs on their own machine).

## Save codes

Browser saves can be lost (cleared site data, a new device). Settings → **Copy save code** or **Download save file**
gives you `RFR1-<Friend #>-<checksum>-<data>`: your whole adventure, deflated into one line. Paste it into **Restore
from a code** on any browser, connected with the same Friend, to get everything back. A code only restores onto its
own Friend, a checksum catches a damaged copy, and every field is validated like a browser save.

## Saves

Your adventure saves every few seconds through the trusted host page, per wallet and per Friend, on this device.
Loads are checked: unknown items, impossible numbers or a position you can't stand on are cleaned up.
