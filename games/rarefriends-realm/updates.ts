/**
 * What's new in the Realm, newest first. The game shows this log after an update (on the Updates tab of the daily
 * popup) until you've seen it. Add an entry with the next id for every update players should hear about.
 */
export type Update = { id: number; date: string; title: string; items: readonly string[] };
export const UPDATES: readonly Update[] = [
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
