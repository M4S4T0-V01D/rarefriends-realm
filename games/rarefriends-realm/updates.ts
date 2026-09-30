/**
 * What's new in the Realm, newest first. The game shows this log after an update (on the Updates tab of the daily
 * popup) until you've seen it. Add an entry with the next id for every update players should hear about.
 */
export type Update = { id: number; date: string; title: string; items: readonly string[] };
export const UPDATES: readonly Update[] = [
  { id: 41, date: "2026-09-30", title: "Lanterns up high, and hills that hide what's behind them", items: [
    "Lanterns and chandeliers hang higher, up in the rafters, and one that would sit in front of your Friend's face turns see-through.",
    "Snowy slopes and hills cover whatever stands behind them: Friends, other players, monsters and houses no longer show through the snow around Highcairn (or any other hill).",
  ] },
  { id: 40, date: "2026-09-30", title: "The Stealth update, lamplit rooms, mastery capes and a new fountain", items: [
    "Thieving is now Stealth. Your levels and XP carry over, and pickpocketing and the Oasis stalls are part of it.",
    "Sneak (the hooded button beside your run energy, or C): walk softly past aggressive monsters. Each tick they may notice you (their level against your Stealth, how close you are, whether you're moving). Slip out of reach unseen for Stealth XP. It spends run energy faster than running, less as your Stealth grows.",
    "Get spotted and the monster lunges at once: you take a hit, the sneak ends and the fight is on.",
    "Sneak attacks: strike a monster that hasn't noticed you and your first blow lands harder and truer.",
    "Light feet: from Stealth 50 aggressive monsters notice you from 3 tiles instead of 4, and from 80, only 2.",
    "The Veilweave hood: found very rarely in the shadows while slipping past monsters of level 38 and up (Stealth 60). Wear it from 70 and stand still for five seconds, and you fade almost to nothing; aggressive monsters look straight through you. Other players see you fade too.",
    "Two new achievements: Ghost in the grass and Now you see me.",
    "Every room in the Realm is lamplit: hanging lanterns in the houses and shops, iron chandeliers in the castle's halls, on every storey. Windows glow warm at night.",
    "Mastery capes stand out as capes of accomplishment: a yoke across the shoulders in the skill's second colour, a band above the hem, the skill's emblem on the back in a roundel, and gold edges on trimmed capes. The Grandmaster's carries a gold star.",
    "Hollow Square's fountain is rebuilt: a wide eight-sided stone basin of pixel water with wishing coins, a column and a bowl spilling over its lip, and a jet on top. It glows softly at night.",
    "Fixed: shared fights and dropped items in the Greyhorn Highlands (the far east) now work with other players.",
  ] },
  { id: 39, date: "2026-09-29", title: "Bank tabs fixed, and save codes that stay saved", items: [
    "Bank tabs no longer squash the bank: with several tabs the All items view lists each tab under its own heading and scrolls, and the shop's stock does the same.",
    "Restoring a save code saves it at once. Before, a second tab or window with the game open could quietly overwrite the restored adventure with its own.",
    "One tab saves at a time: when you open the Realm in a newer tab, the older one stops saving and tells you so (reload it to continue there).",
    "Settings says plainly when saves aren't connected, and the page keeps trying to connect them for about a minute instead of ten seconds.",
  ] },
  { id: 38, date: "2026-09-29", title: "Low graphics that look like High, and a roomier town", items: [
    "Low graphics now use High's textures and lighting: the same ground, walls and roofs, the same daylight, dusk and lamplight, and buildings still cast their shadows. Low leaves out the shadows of trees and Friends, the far haze and cloud shadows, and lays its light more coarsely, so it stays quick.",
    "Both settings draw faster: nothing off the screen is drawn, and the hidden sides of flat roofs and walls are skipped.",
    "The Sleepy Friend inn has moved across the east bridge, on its own with a cobbled step up to its door, and the house behind Fletch & Feather has moved back so its door isn't a tile from the next wall.",
  ] },
  { id: 37, date: "2026-09-29", title: "Real clothes, boots and gauntlets, and armour that fits", items: [
    "Ribbon & Rye Clothiers, west of the south end of Market Street: shirts in eight colours, belted tunics, dresses that sweep the floor, trousers and skirts. They're for looks (no combat bonuses), and the townsfolk wear them too.",
    "Boots and gauntlets in every metal, smithed at the anvil (one bar each) and sold beside the helms in the armouries. Dawnplate has them too: boots from The Pilgrim's Road, gauntlets from The Restless Crypt.",
    "Boots, gloves and gauntlets show on your Friend, along with the rest of your armour.",
    "Helms fit your Friend's head, following its outline, and four-legged Friends wear chest plates as barding over the back instead of shoulder plates up by the head.",
  ] },
  { id: 36, date: "2026-09-29", title: "Cleaner world: health bars in fights only, High by default, whole helms", items: [
    "Health bars only show while something is fighting: monsters when they're attacking you, you're attacking them, another player is fighting them or they've just been hit; yours and other players' in combat. (A monster's level is still in its right-click menu.)",
    "Graphics are High by default and never change by themselves; choose Low in Settings if you want it.",
    "Helms are one shell from every side: open at the face with a nose guard from the front, turned with you from the side, and closed with a ridge from behind.",
  ] },
  { id: 35, date: "2026-09-29", title: "Dressed-up townsfolk", items: [
    "Villagers wear their own hats (wizard's points, feathered caps, traveller's hats, hoods), some wear capes in every colour and pattern, a few an amulet, and some carry an axe or a pickaxe. Each keeps their look.",
    "Townsfolk dress for their trades: the old miner and the mountain guide carry pickaxes, Axel and the Fernwick foresters axes, the fisher and the miller wear straw hats, and Tamsin the tailor is the best dressed of all.",
    "More villagers about in Fernwick, the Frostpeak camp and Highcairn.",
  ] },
  { id: 34, date: "2026-09-29", title: "Dawnplate, three Order quests, armour you can see, and smoother graphics", items: [
    "Three new quests for the Order of the Dawn. The Pilgrim's Road (Sister Maren, Faith 35): pray at the Realm's three old altars. The Restless Crypt (Faith 45): lay twelve crypt skeletons to rest with a faith weapon. Dawn Against the Hollow (Grandmaster Aldric, Faith 60, after The Hollow King): destroy five Hollow sentinels with a faith weapon and bring three Hollow essence to seal their gate.",
    "Dawnplate, the Order's gold armour with white trim (Defence 70, Faith 60): greaves, helm and shield, and the cuirass for Dawn Against the Hollow. Each quest's pieces are sold in the Order Armoury once you've earned them.",
    "Armour shows on your Friend: cuirasses as breastplates with shoulder plates, vests and robes, and greaves on your legs. Helms are closed at the back now, and the castle guards and knights of the Dawn wear their armour too.",
    "Your settings are remembered in this browser. High and Low stay as you set them; only Auto adjusts itself, and on a slow high-DPI screen it first draws fewer pixels (keeping the lighting) before it tries Low.",
    "High draws at up to 1.5× on high-DPI screens (the pixel art looks the same, with about half the pixels of 2× to light), and the lighting's hidden passes skip the ink outlines, so laptops run it more smoothly. Cached art is kept least-recently-used, with less of it.",
  ] },
  { id: 33, date: "2026-09-29", title: "The Faith update: the Order of the Dawn", items: [
    "Prayer is now Faith. Your levels, XP and prayers carry over; faith is what your prayers draw on, and altars restore it.",
    "The Order of the Dawn keeps Dawnhold, a chapterhouse on a terrace above the sea east of Highcairn (a cobbled causeway runs there through the ridge): Grandmaster Aldric, Sister Maren the chaplain, Quartermaster Bram and the knights of the Dawn in white and gold.",
    "New quest, The Dawn Vigil (Novice, Faith 10): offer bones on the Dawnhold chapel altar and become a squire of the Order. Reward: a Dawnsteel sword, 1,500 Faith XP and the Order Armoury.",
    "New quest, Light in the Greyhorn (Intermediate, Faith 30): win the shards of the Order's broken relic back from the stone golems of the Greyhorn mine and bless them on the altar. Reward: the Cape of the Dawn, 5,000 Faith XP, 2,000 Defence XP and the Order's finest weapons.",
    "Faith weapons, which need Faith as well as Attack or Magic: the Dawnsteel sword, the Vigil spear, the Radiant greatsword and the Sunforged warhammer, and the Acolyte's staff, the Dawn staff and the Staff of the First Light. Every hit you land with one gives a little Faith XP, and they hurt the undead (skeletons, shades and the Hollow) harder.",
    "More ways to train Faith: use bones on any altar to offer them for twice the XP of burying, or three times on the Dawnhold chapel altar.",
  ] },
  { id: 32, date: "2026-09-29", title: "Capes, hats and amulets, and sharper guards", items: [
    "Threadneedle Tailors on Market Street, across from Heft & Haft: capes in ten solid colours and seven patterns (stripes, halves, a chevron, quarters, a gold border, stars and a pilgrim's cross), wizard hats in six colours, feathered caps and wide-brimmed traveller's hats.",
    "Amulets and pendants show on your Friend now (and on other players), hanging round the neck.",
    "Seen from behind, your weapon or tool is held beside your cape instead of cutting across it.",
    "The castle guards wear helms and red capes and carry battleaxes; Captain Rook carries a greatsword.",
    "Snowy peaks no longer vanish when you turn the camera (the land is drawn back to front at every angle), and the distance haze follows the land, so nearby mountains are never hazed.",
  ] },
  { id: 31, date: "2026-09-29", title: "New lighting: real shadows, sunlight and lamplight", items: [
    "The sun moves across the sky: it rises in the east, crosses the south and sets in the west. Buildings, walls, trees, rocks, characters and mounts cast shadows that follow it, long and golden at dawn and dusk, short at noon, and faint in the moonlight.",
    "Lamps, torches, fires, forges and spells light the ground and everything standing near them instead of glowing over it, and walls, rocks and trees block their light.",
    "Light bounces: a fire's glow spills softly round corners in the colour of the ground, lava lights up everything around it, and dungeons are truly dark away from the flames.",
    "Softer ambient light: corners, alleys, forest floors and the spaces under roofs are darker, and the sky's colour changes through the day. At night the haze and fog turn a dim blue.",
    "On Low graphics a clear day is drawn as before, and nights stay lit, without the shadows.",
  ] },
  { id: 30, date: "2026-09-29", title: "Two-handed weapons, new creatures and sharper skill icons", items: [
    "Two-handed greatswords, battleaxes and war hammers in every metal: a tick slower than a sword and much harder hitting, with no room for a shield. Smith them at an anvil (3 bars), or buy them at Heft & Haft, the new shop at the south end of Market Street.",
    "New creatures: forest spiders in Whisperwood, wild boars in the southern woods, sand scorpions in the Pale Dunes, highland goats on the Greyhorn slopes and stone golems in the Greyhorn mine.",
    "Each has something only it drops: a spider-fang dagger, a two-handed Tusker axe, a Horned helm, a Stinger sabre and a Golem maul. Grumblins now carry the odd Grumblin spear, and moss colossi a Mossy staff or a Mossblade.",
    "The skill icons are redrawn, crisp and shaded like the items and tabs.",
    "Arrow shafts give 8 Fletching XP (up from 5).",
  ] },
  { id: 29, date: "2026-09-29", title: "Highcairn, the Greyhorn Highlands, sheep and string", items: [
    "The Realm is bigger: east of the Pale Dunes and south of Frostpeak the island swells into the Greyhorn Highlands, with a ragged new coast. Snowy peaks, scree slopes and crags, all walkable, a mountain lake, and the Greyhorn mine (glimmer, rarite and moonsilver).",
    "Highcairn, a stone town on a plateau in the middle: a bank, the Highcairn Stores, the Stone Kettle inn, the Highcairn Forge, a mountain shrine and a Rare Market trader. Roads climb to it from the Frostpeak camp and the Oasis.",
    "Sheep! A new pen between the cows and the chickens. Shear them with shears (any general store) for wool; a shorn sheep looks shorn until its fleece grows back.",
    "Spin wool into string at a spinning wheel (the farmhouse, or Tessa's tannery in Friendhollow): Crafting level 1.",
    "Bows need strings now: a knife on logs cuts an unstrung bow (or war bow), and a string finishes it. A string on a cut gem makes an amulet, and the Enchant spells turn moonstone and rosestone amulets into pendants.",
  ] },
  { id: 28, date: "2026-09-29", title: "Clearer panel tabs", items: [
    "The side panel's tabs have new icons, drawn crisp and shaded like the items so each is easy to tell apart: crossed swords (combat), rising bars (skills), a sealed scroll (quests), a backpack (inventory), a knight's helm (equipment), praying hands (prayer), a spellbook (magic), two Friends (friends), a cog (settings) and a waving smile (emotes).",
  ] },
  { id: 27, date: "2026-09-29", title: "The sigil stone box, and steadier early levels", items: [
    "The sigil stone box: carry it and the sigil stones you mine go into it (up to 120), and an altar presses every stone inside. Right-click to check, fill or empty it. The Tower Stores and Runa's Sigils sell them.",
    "At the bank, right-click a sigil stone box or inkcoal satchel in your pack to Fill it straight from the bank (or empty it in), or use the Fill button.",
    "The first levels of gathering and making skills (fishing, cooking, woodcutting, mining and the rest) come a little slower, starting at under a third of the XP and catching up by level 10. Combat is unchanged.",
  ] },
  { id: 26, date: "2026-09-29", title: "Real hoods, kinder cooking and a new trailer", items: [
    "Hoods (hunter's, frosthide and leather) are proper hoods now: closed all round, with your face looking out of the front, a cowl point behind, and a short capelet over your shoulders.",
    "Cooking burns less while you learn: about one in five at a food's own level, easing off fast. Minnows stop burning at 12, chicken and beef at 14, perch at 22 and carp at 32.",
    "A new trailer on the website: under a minute of the Realm as it plays today.",
  ] },
  { id: 25, date: "2026-09-29", title: "Ruins, a taller Wizards' Tower and steadier dragging", items: [
    "Ruins across the Realm: crumbling old houses, broken round towers and runs of ancient wall in Whisperwood, the Ashen Hills, the farms' edge, the Pale Dunes, the Murkmire, below Frostpeak, round Glass Lake, by the Mossy Ruins and on the Pale Coast. Mossy in the woods, sun-bleached in the dunes, snow-capped up north.",
    "The Wizards' Tower stands much taller from outside, under an eight-sided spire, and its round walls no longer lose their sides.",
    "Facing you, your Friend holds its weapon and shield in the right hands (the mirror of the back view).",
    "Chimneys rise out of their roofs instead of sinking through them.",
    "Dragging items in your pack or bank no longer stops the game taking clicks in Chrome.",
  ] },
  { id: 24, date: "2026-09-29", title: "Bank tabs, a coal satchel and a Grumblin head", items: [
    "Bank tabs: drag an item onto + to start a tab, onto a tab to file it there, or onto another item to move it. Each tab shows its first item, the ∞ tab shows everything, and deposits go into the tab you're looking at. Right-click an item to move it without dragging.",
    "The inkcoal satchel: worn on your back (or carried), it holds 120 inkcoal, fills itself as you mine, and the furnace (and Forgeheart) take from it. Right-click it to check, fill or empty it. The Old miner at the Ashen mine sells them, or stitch one from 3 leather at Crafting 28.",
    "Grumblins very rarely drop a Grumblin head (the chief a little more often). Wear it. Everyone will know.",
    "The Millpond, south of the windmill: net fishing for minnows and a bait spot for perch and carp, close to town for new Friends.",
    "Cooking burns much less while you're learning: minnows, chicken and beef stop burning at level 18–20.",
    "Spells fly as pixel sprites: fire is a little torch flame, water a teardrop, wind a spinning whirl, earth a tumbling boulder, and curses a knot of smoke with eyes.",
    "Bank booths are proper counters now, with a glass screen, brass bars, a ledger and a stack of coins. Tools and weapons stay outside your helm or hood as you swing them.",
  ] },
  { id: 23, date: "2026-09-29", title: "Forged gear: six new tiers, levels 50 to 90", items: [
    "Six forged metals above rarite: Frostsilver (50), Gloomsteel (60), Wyrmscale (70), Hollowsteel (75), Cindersteel (80) and Ashenheart (90). Each makes a full set: dagger, sword, sabre, helm, shield, cuirass, greaves, an axe and a pickaxe, plus a staff, crossbow limbs, arrowheads and bolts.",
    "They're smelted from what the Realm's strongest creatures drop: frost shards (Frost yetis), gloom shards (gloom hounds), wyrm scales (drakes), Hollow essence (sentinels and the Hollow King), cinder cores (cinder drakes and Old Cinder) and Colossus embers (the Ashen Colossus). Smelting and smithing them takes Smithing 86 to 99.",
    "Every piece glows in its metal's light: an icy plume on frostsilver, violet on gloomsteel, ember orange on ashenheart. Forged staffs are metal from foot to orb.",
    "Finished pieces sometimes drop straight from those creatures, and Frostpeak Outfitters sells frostsilver (and rarite tools) for those with the coin.",
    "New axes and pickaxes cut and mine faster at every tier. Ashwood crossbow stocks (Fletching 84) hold the top crossbows, and the rarite crossbow now needs Ranged 45.",
  ] },
  { id: 22, date: "2026-09-28", title: "Fernwick, crossbows, war bows and Hazel's quiver", items: [
    "Fernwick, a woodcutters' village in the heart of Whisperwood (take the woods road west from the Ashen mine): Hazel's War Bows, the Timber Yard (the best price for logs, and axes), a bank, cottages, a willow pond and archery butts.",
    "Crossbows in six tiers: metal limbs from the anvil (two bars) on a stock carved from logs, fitted together with Crafting. Pewter on a wooden stock, blackiron and ashsteel on oak, moonsilver on willow, glimmer on maple, rarite on yew. Or buy the first few at Fletch & Feather.",
    "Crossbows fire bolts (a dozen unfeathered bolts from a bar, then feathers), shoot slower than bows and hit harder, and they're one-handed, so you can carry a shield.",
    "War bows: a heavier bow for every wood, from two logs. Slower to draw, harder hitting, and a tile more reach. The plain war bow needs Ranged 5, and only Hazel sells them.",
    "New quest, Hazel's Quiver: win her grandmother's quiver back from the Grumblin chief and she'll mend it for you. Worn on your back, it calls four in five arrows and bolts straight back to your pack.",
    "The Thought altar has moved out of Fernwick's street to a quiet glade north-east of the village, beside the road to Wyrmreach.",
  ] },
  { id: 21, date: "2026-09-28", title: "Softer rain, clearer settings", items: [
    "Rain is now a soft, steady wash of sound that swells and fades with the weather, instead of a ticking hiss that sounded like footsteps.",
    "Settings has pixel sliders for music, effects and zoom (with their values shown), and the Graphics choice (Auto, High, Low) is easy to read.",
  ] },
  { id: 20, date: "2026-09-28", title: "Redrawn food, bones and ores", items: [
    "Every fish has its own look: minnows swim in a little school, perch are striped, carp are golden and scaly, char have red bellies, grayling and sailfish raise their tall fins, the inkshark is a shark and the inkcrab is a crab.",
    "Chicken is a drumstick and beef is a steak with a rim of fat. Cooked food is browned with grill marks, and burnt food is a charred lump with a wisp of smoke.",
    "Bones, large bones, ink bones and drake bones each look different, and every ore shows its own metal: dull pewter, rusty blackiron, glossy inkcoal, silver-veined moonsilver, glimmer and rarite crystals, and soft clay.",
  ] },
  { id: 19, date: "2026-09-28", title: "Signs, banners and a log out button", items: [
    "Every shop and bank has a hanging sign outside its door, painted with what's sold inside (an axe for Axel's, a bow for Fletch & Feather, coins for the banks, a horse for the stables).",
    "Banners of your own Rare Friend fly around the fountain square and at the castle gate.",
    "Save and log out: the ⏻ button by the minimap (or Settings) saves your adventure at once and returns to the title screen, confirming it's safe in this browser.",
    "The early levels are a little slower (about half speed at level 1, full speed from level 30), so each level-up means more. Higher levels are unchanged.",
    "Shields show only on the arm they're worn on: across your body facing one way, tucked behind you facing the other.",
    "The inventory squares are a touch smaller, so all 28 fit without scrolling.",
  ] },
  { id: 18, date: "2026-09-28", title: "Animations in your Friend's hands", items: [
    "Weapons and tools now move in your Friend's own pixels instead of floating beside it: swords wind up, strike and follow through, staffs thrust forward as a spell leaves, and bows flex.",
    "Axes chop, pickaxes strike the rock, hammers ring on the anvil, rods cast with the line running from the rod's tip, and food is held out over the fire, all drawn in the same pixel style as your gear.",
    "Other players' Friends animate the same way.",
  ] },
  { id: 17, date: "2026-09-28", title: "Multiplayer that gets through", items: [
    "Players on networks that block direct browser-to-browser links can now see each other: the game falls back to passing messages through public relays, so nobody is stuck at 1 online.",
    "Direct links are still used when they work (faster, and private messages stay off the relays). Hover the online badge to see how you're connected.",
  ] },
  { id: 16, date: "2026-09-28", title: "First steps, graphics settings and the farm", items: [
    "New Friends get a guided start: seven quick steps (a tree, a fire, a fish, cooking, the horses, King Hollis, the Realm Daily) with a gold arrow showing the way, and 500 coins and a Lamp of insight at the end. Skippable any time.",
    "Settings → Graphics: Auto, High or Low. Low draws plain ground and walls, skips ambient life and fog, and runs several times faster on older devices. Auto switches to Low by itself if the game runs slowly.",
    "The stables have moved beside the Rare Market, facing the path, with the paddock next door.",
    "Hollow Farms: the cows have a new pen out by the windmill, the windmill is rebuilt in stone with lattice sails, there's a new chicken coop, and the miller has a farmhouse.",
  ] },
  { id: 15, date: "2026-09-28", title: "World boss, duels, pets and achievements", items: [
    "The Ashen Colossus rises in Wyrmreach every two hours (on the even UTC hours) for twenty minutes. It takes a crowd, and everyone who wounds it shares the loot.",
    "The Sparring Ring, east of Market Street: step inside and right-click another player to Fight. Duels are safe: nobody dies or loses items, and wins are counted.",
    "Six pets to find while you train: Stumpy (woodcutting), Pebble (mining), Bubbles (fishing), Mote (Sigilcraft), Emberling (dragons) and Cinderkin (the Colossus). Call them from the Friends tab.",
    "Achievements: 32 to earn, on a new tab of this popup, and counted on your adventurer card.",
    "Hiscores in the Friends tab: you ranked with every player you've met.",
    "Level-up fireworks that everyone nearby sees. Hoofbeats, dust and a whinny when you ride. Footprints in snow and sand, splashes in the bog. Rare drops shine with a beam of light and a chime.",
    "When a friend near you emotes, your Friend joins in.",
  ] },
  { id: 14, date: "2026-09-28", title: "Daily streaks and this log", items: [
    "Log in every day for a streak reward on a seven-day cycle, up to a Lamp of insight and 5,000 coins on day 7. Each full week adds 25% to the coins.",
    "Three daily challenges, the same for everyone: gain XP in two skills and defeat some monsters. Finish all three to open the daily chest.",
    "This Updates tab: see what's changed after every update. Reopen it any time with the button by the minimap.",
    "Your adventurer card shows your Friend exactly as in the Realm: helm, cape, shield, weapon, and the mount you're riding.",
    "A one-minute trailer at the top of the website.",
  ] },
  { id: 13, date: "2026-09-27", title: "The Friendhollow stables", items: [
    "Marigold's stables, west of the castle, sell eight mounts for RF: six horses and two unicorns. Horses and a unicorn graze in the paddock.",
    "Riding carries you two or three tiles a tick without using run energy, and every mount has a gift: healing, faster gathering, more coins, Defence, XP or light in the dark.",
    "Ride or dismount with the saddle button by the run orb, or H. Other players see you riding, and ridden towards you, your mount's head is in front of you.",
  ] },
  { id: 12, date: "2026-09-27", title: "Gear you can see", items: [
    "Helms, hats, shields and weapons are painted into your Friend's own pixels and move with you: blades in a ready guard, staffs upright with their orb, bows held by the grip, axes on the shoulder.",
    "Weapons swing free only mid-attack.",
  ] },
  { id: 11, date: "2026-09-27", title: "Trading fixes and referral limits", items: [
    "Trades now work when both players ask at the same moment, when a request is answered late, and with the game open in two tabs.",
    "Referral rewards: up to five a day. Any more are credited on a later day you're both online.",
  ] },
  { id: 10, date: "2026-09-27", title: "Shops, ground and fires", items: [
    "General stores in Emberforge, Frostpeak and the Oasis. Every trader buys back what it sells, and what you sell sits on the shelf to buy back.",
    "Grass, paths, cobbled streets and flagstones in the same pixel style as the buildings.",
    "Furnaces are brick kilns with fire in the mouth. Campfires are small pixel flames on cut logs.",
    "The Rare Market's list scrolls.",
  ] },
  { id: 9, date: "2026-09-27", title: "Weather", items: [
    "Rain, and storms with lightning and thunder, from the real clock, so everyone online shares the same sky.",
    "Ground fog at dawn, darker nights, and light that pools on the ground around lamps, torches and fires.",
  ] },
  { id: 8, date: "2026-09-27", title: "Referral codes and the Friendship cape", items: [
    "Share your code (RF- and your Friend #): a new friend who uses it and you both get 250 coins and +15% XP for an hour of play.",
    "Your first referral earns the Friendship cape, with its own emote.",
    "Fires and torches burn in hand-drawn pixel fire.",
  ] },
  { id: 7, date: "2026-09-27", title: "Spells, hats and the night light", items: [
    "Spells are shaped by their element: flame, wave, whirlwind, boulder and curse.",
    "The hat or helm you wear shows on your Friend. Staffs sit lower in the hand, and your night light is dimmer.",
  ] },
  { id: 6, date: "2026-09-27", title: "Fight together, skill guides", items: [
    "Fight the same monster as other players, with shared HP and each other's health bars.",
    "Click a skill for what it unlocks at every level, and browse the recipe book. Guides for every skill are on the website too.",
  ] },
  { id: 5, date: "2026-09-27", title: "Trading, emotes and save codes", items: [
    "Trade items with other players, old-school style, and pick up what they drop.",
    "Fourteen emotes. Magic glows and lights the dark, and dungeons are truly dark.",
    "Save codes (Settings) keep your whole adventure in one line of text.",
  ] },
  { id: 4, date: "2026-09-27", title: "Play together", items: [
    "See everyone else's Friends in the Realm: public chat, whispers, a friends list, follow, and +5% XP near friends.",
  ] },
  { id: 3, date: "2026-09-27", title: "Magic, crafting and dragons", items: [
    "Fletching and Sigilcraft, the Wizards' Tower and its Archmage, and dragons in Wyrmreach.",
    "Right-click in every interface, pixel-art buildings and redrawn items.",
  ] },
  { id: 2, date: "2026-09-27", title: "Ranged, Slayer and the castle", items: [
    "Ranged and Slayer, mastery capes at 99, a bigger Friendhollow with Market Street, and the Rare Market in five towns.",
    "Friendhollow Castle: three storeys, spiral stairs, King Hollis and the battlements. Day and night, and a clearer minimap.",
  ] },
  { id: 1, date: "2026-09-27", title: "The Realm opens", items: [
    "An old-school adventure starring the Rare Friend you own: skills, quests, a 2.5D world and the Hollow King to end.",
  ] },
];
export const LATEST_UPDATE = UPDATES[0].id;
