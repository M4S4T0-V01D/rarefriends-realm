# ⚔ RareFriends Realm

*An old-school adventure starring the Rare Friend you own: fifteen skills, six quests, a large 2.5D world and a Hollow King to end.*

**▶ Play: https://m4s4t0-v01d.github.io/rarefriends-realm/** · **Preview page: https://m4s4t0-v01d.github.io/rarefriends-realm/preview/**
*(You need a browser wallet on Robinhood mainnet holding a hardwired Rare Friends Generations NFT.)*

![RareFriends Realm: Friendhollow square in greyscale isometric, with Rare Friends, a fountain and the minimap](docs/town.png)

- **Your Friend is the hero.** The Friend you select walks the Realm in its canonical on-chain sprite, and its Generations family gives a perk (Hoverers run longer, Skeletons pray better, Colossi hit harder, and so on).
- **Fifteen skills on the classic curve.** Attack, Strength, Defence, Hitpoints, Magic, Prayer, Woodcutting, Fishing, Cooking, Firemaking, Mining, Smithing, Crafting, Thieving and Agility, from level 1 to 99.
- **Old-school controls.** Left-click does the first option; right-click lists them all (*Chop down Tree*, *Attack Grumblin (level-5)*, *Talk-to*, *Pickpocket*, *Examine*). WASD walks; the arrow keys (or a scroll-wheel drag) turn and tilt the camera, and the compass faces north again. Use items on things. Minimap, run orb, world map. Every monster shows its health and level.
- **A large, living world.** A 240 × 240 tile island with 12 regions and 2 dungeons: towns, farms, forests, a mine, a forge, snowy peaks, a lake with a pier, dunes and an oasis, a swamp, ruins, a crypt and the Hollow Depths. The land rolls in walkable hills (lit by slope, with ink contour lines), and it's alive: cloud shadows, birds, butterflies, falling leaves, snow, blowing dust, fireflies, jumping fish and forge smoke.
- **Pixel art in the Rare Friends style.** Trees, rocks, decor, every item, weapon, skill, spell and prayer icon are pixel art with an ink edge (and the white halo of the canonical sprites), drawn procedurally. Walls are bricked, and skills animate: axes swing and chips fly, pickaxes spark, lines are cast, anvils ring, fires crackle, agility hops.
- **A real spellbook.** Darts, Lances and Bursts in four elements; curses (Muddle, Wilt, Brittle) and Rootsnare; Gilded and Golden Touch, Forgeheart, Far Reach, Bonebloom, two enchantments and six ways to travel, paid in sigils.
- **Six quests** from baking for the Realm Feast to defeating the Hollow King (level 92) in his throne room.
- **A soundtrack for every region.** Sixteen procedural tracks, including a hand-written main theme, plus level-up and quest fanfares, synthesized live in WebAudio. Entering an area unlocks its track ("You have unlocked a new music track"), and the music player replays any you've found.
- **Your other Friends follow you**, adding XP by generation. **Rare Caskets** (simulated $RAREFRIENDS) hold relics and wardrobe pieces. **Progress saves per wallet.** Your **adventurer card** posts to X.

| | |
| --- | --- |
| **Builder** | M4S4T0 · [@M4S4T0-V01D](https://github.com/M4S4T0-V01D) |
| **Category** | Character Spotlight (primary) · Economy Potential · Token Activity |
| **Stack** | [FriendSDK v0.1.2](https://github.com/spokesz/friendsdk/tree/v0.1.2) · React 19 · Canvas 2D · WebAudio · TypeScript |
| **Economy** | Simulated. Caskets use the SDK's preview RF ledger; no contracts or transactions. |
| **Wallet / network** | Browser wallet on **Robinhood mainnet (chain 4663)** holding a hardwired Generations NFT (generation ≥ 1) |

## Screenshots

| Title screen | Right-click menus | Talking to the Realm Guide |
| --- | --- | --- |
| ![Title screen](docs/title.png) | ![Right-click menu](docs/menu.png) | ![Dialogue](docs/dialogue.png) |
| **Woodcutting** | **Fighting Grumblins** | **Skills** |
| ![Woodcutting](docs/woodcutting.png) | ![Combat](docs/combat.png) | ![Skills tab](docs/skills.png) |
| **Emberforge** | **Frostpeak** | **Glass Lake** |
| ![Emberforge](docs/region-emberforge.png) | ![Frostpeak](docs/region-frostpeak.png) | ![Glass Lake](docs/region-glass-lake.png) |
| **The Oasis** | **Murkmire Crypt** | **The Hollow King** |
| ![Oasis](docs/region-oasis.png) | ![Crypt](docs/region-crypt.png) | ![The Hollow King](docs/region-throne.png) |
| **Bank** | **World map** | **Rare Caskets** |
| ![Bank](docs/bank.png) | ![World map](docs/worldmap.png) | ![Caskets](docs/caskets.png) |
| **Smelting at Emberforge** | **Level up!** | **Quest complete** |
| ![Smelting menu](docs/smelting.png) | ![Level-up message](docs/level-up.png) | ![Quest complete](docs/quest-complete.png) |
| **Camera turned and tilted** | **Health bars on every monster** | **The spellbook** |
| ![Camera turned](docs/camera-turned.png) | ![Grumblins with health bars](docs/combat.png) | ![Spellbook](docs/magic.png) |
| **Chat over your head** | **Prayers** | **Music unlocks** |
| ![Chat](docs/chat.png) | ![Prayers](docs/prayer.png) | ![Music player](docs/music.png) |
| **A shop** | **On a phone (landscape)** | **Quest journal** |
| ![Shop](docs/shop.png) | ![Phone layout](docs/phone.png) | ![Quest journal](docs/quests.png) |

**The adventurer card, ready to post on X:**

![Adventurer card](docs/adventurer-card.png)

## How it plays

1. **Connect, pick your Friend, press Begin.** The main theme plays over a flight across Friendhollow; your saved adventure is listed if you have one.
2. **Click to act.** The top-left text shows what a left-click does. Right-click (or long-press) anything for every option. WASD walks; ← → turn the camera and ↑ ↓ tilt it (or hold the scroll wheel and drag); click the compass to face north. R toggles run; M opens the world map.
3. **Gather and make.** Chop trees and light the logs, fish at Glass Lake and cook on a range or your own fire, mine in the Ashen Hills and smith at Emberforge, tan hides and craft armour, cut gems.
4. **Fight.** Pick a style (Accurate, Aggressive, Defensive, Controlled), eat when you're hurt, pray at altars. Monsters retaliate, some attack on sight, and all drop loot. Magic uses sigils, and staffs autocast.
5. **Quest.** Yellow markers float over quest givers. The quest journal tracks every step.
6. **Train your Friends.** Owned Friends can follow you from the Friends tab. The Relic keeper in the Hollow Hall sells Rare Caskets.
7. **Share.** The adventurer card (Worn equipment tab) shows your Friend, levels and quest points. **Post to X**, copy or save it.

Full rules, levels, monsters, quests, odds and controls: [games/rarefriends-realm/README.md](games/rarefriends-realm/README.md).

## How it uses Rare Friends and $RAREFRIENDS

**Character Spotlight.** The verified Generations NFT is the star: it's the hero on screen, drawn from its
**canonical on-chain sprite** with walk cycles in four directions, and in dialogue, the title screen and the adventurer card.
Its **family sets a perk** that changes how you play. The SDK's sample Friends appear as characters too: **Old Glimmer
(#7730)** and **Brother Ossic (#3412)** give two of the quests. Owning more Friends matters: each one can **follow you**,
drawn with its own canonical art, and adds XP by generation (Gen 1 +5% … Gen 5+ +1%).

**Token Activity / Economy Potential.** Every RF action goes through the SDK's reviewed chance-game client, **simulated and clearly labelled**:

- **RF sink:** a Rare Casket costs 1 RF and returns 0.88 RF in expected value; 12% of each purchase stays with the game as prize stake. Buying ×5 is supported.
- **Keep or redeem:** relics keep a fixed RF value with no expiry, but only boost you while kept (+2% XP, +10% coins, 10% faster gathering, or +10% XP with a golden aura). Each casket reserves 5 RF, so redemptions stay funded.
- **Wardrobe:** each casket also grants one of 8 RF-exclusive pieces (capes, hats, a halo, auras) drawn on your Friend. They carry no RF value, so they need no prize reserve. Duplicates become coins.
- **Two currencies:** coins are earned in the world and never convert to RF, so the game is complete without spending. RF gives bonuses and looks. It's a boost, not a paywall.

**Future integrations** (not in the SDK v0.1.2 API):

| Idea | Needs |
| --- | --- |
| Cloud saves across devices | A save/persistence API (today: per-device local storage) |
| Trading between holders (a Grand Exchange for Friends) | Cross-player actions and transfers |
| RF-priced cosmetic wardrobe with part burned | A cosmetic purchase action with RF burn |
| Live caskets with Dice RNG | The existing live chance-game contract flow, after Rare Friends review |
| Boss kill leaderboards and seasonal events | A shared score service |

## Run it

Needs **Node.js 22+**, npm and Git. On Windows, use WSL2 Ubuntu, as the FriendSDK README describes.

```sh
git clone https://github.com/M4S4T0-V01D/rarefriends-realm.git
cd rarefriends-realm
npm ci
npm run dev            # http://localhost:4173   ·   npm run dev:lan to play from a phone on the same Wi-Fi
npm run build          # static site → games/rarefriends-realm/.friendsdk/
```

On a phone, open the Pages link in a wallet app's in-app browser (for example MetaMask Mobile) and play in landscape:
tap to act, long-press for the options menu. FriendSDK is vendored as `vendor/rarefriends-friendsdk-0.1.2.tgz`, packed
from the official `v0.1.2` tag (see [NOTICE.md](NOTICE.md)). `.github/workflows/pages.yml` runs every check below and
deploys to GitHub Pages on each push to `main`.

## Checks

```sh
npm run typecheck      # tsc strict (game, host and preview page)
npm test               # engine tests: XP curve, world generation and reachability of every landmark, pathfinding,
                       # WASD, right-click menus, woodcutting/firemaking/cooking, fishing, mining/smelting/smithing,
                       # combat and loot, aggression and safe death, two quests end to end, thieving, an agility lap,
                       # magic (combat, curses, Rootsnare, Gilded Touch, Forgeheart, enchanting, Far Reach, Bonebloom, glides),
                       # prayer, shops and the bank, saves (round trip, tampering, pre-rename ids), caskets, followers, music unlocks
npm run check          # friendsdk check
npm run test:browser   # SDK mock-wallet browser runs of the custom host (a two-Friend wallet):
                       #  • title screen, real mouse clicks (chop a tree), right-click menu, dialogue, WASD walking, chat over your head
                       #  • camera: arrow keys turn and tilt, middle-drag turns, WASD follows the angle, the compass resets
                       #  • a level-up, smelting at the furnace, a shop, finishing A Friend's Feast (quest-complete scroll)
                       #  • combat by right-click, bank deposit/withdraw, world map, 5 caskets via the runtime's confirmations
                       #  • adventurer card → Post to X (prefilled post + picture copied), a follower, a 14-region tour
                       #  • save written for the wallet and Friend, reload → "Continue your adventure"
                       #  • a phone in landscape (844 × 390, touch): tap to walk
                       #  • preview page: the main theme and a jukebox track play audibly on desktop and phone
```

The mock wallet exists only in tests. `dev` and public builds always use the real ownership gate.

## How the host extends the SDK

The runtime page is the SDK's own **`GameHost`**: wallet connection, owned-Friend picker, fresh
`readGenerationEligibility` check, simulated ledger, confirmations and the `allow-scripts` sandbox.
`host/runtime.tsx` adds three things the SDK doesn't supply:

1. **Owned-Friend roster.** A read-only watcher (`eth_accounts` only) runs the SDK's account-filtered `readOwnedFriends` (with retries for public-RPC rate limits). It never scans the collection.
2. **Per-wallet saves** in the trusted page's `localStorage` (the sandbox has no storage), keyed by wallet address and Friend, so each of your Friends has its own adventure.
3. **Sharing the adventurer card.** On your click, the page uses the share sheet (phones) or copies the picture and opens a prefilled X post (desktop). Nothing posts without you pressing Post.

The game receives the roster and save only over `postMessage` from its parent window, and uses them only if the
roster contains the Friend the runtime just verified. Saves are validated on load. There are no signatures,
transactions or extra wallet prompts. Under the plain SDK CLI (`npx friendsdk dev` / `test`), the game runs without these extras.

## Known issues and limitations

- Saves live in this browser on this device, keyed by wallet address and Friend. They are client-side, so a determined player could edit their own (simulated) progress.
- Caskets' RF balance and kept relics live in the SDK's session ledger and reset on reload; wardrobe pieces are saved.
- The world is single-player: other players and trading need cross-player APIs the SDK doesn't have yet.
- Audio is synthesized in the browser and starts on your first tap. On iPhones before iOS 17, silent mode may keep it quiet.
- Wallet support is the SDK's (injected / EIP-6963; no WalletConnect). Phones need a wallet with an in-app browser.
- The browser tests use the SDK's mocked wallet. A real-wallet playtest on Robinhood mainnet is still needed; the build environment can't reach mainnet.

## Credits

Built for the Rare Friends Vibeathon by **M4S4T0** ([@M4S4T0-V01D](https://github.com/M4S4T0-V01D)) with an AI coding agent.
FriendSDK and the Rare Friends artwork are by Rare Friends; see [NOTICE.md](NOTICE.md). The world, creatures,
townsfolk, item art, music and sound effects are original procedural code. Gameplay inspired by classic browser RPGs such
as *Old School RuneScape*; the Realm's places, metals, gems, sigils, spells, prayers and items all have their own names, and
no assets or code from it are used.
