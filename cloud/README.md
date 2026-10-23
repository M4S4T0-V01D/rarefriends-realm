# Cloud saves

Players verify their wallet once, then play normally. Their adventure saves automatically and follows the wallet to any device. They no longer need a recovery code; save codes stay available as an optional extra copy.

- **Service:** `https://rarefriends-realm-saves.masato-void.workers.dev`, a Cloudflare Worker (`src/worker.ts`) with one D1 database (`schema.sql`).
- **Host page:** `host/cloud.ts`, the trusted page around the game.
- **Game UI:** `games/rarefriends-realm/cloudui.tsx`.
- **Tests:**
  - `tests/cloud.test.mjs`: the Worker.
  - `tests/cloud-sync.test.mjs`: the host's logic.
  - `tests/cloud-i18n.test.mjs`: every cloud text in every language.
  - `tests/cloud-browser.mjs`: the real game end to end.

## What it is, and what it isn't

- **It stores characters. It is not a game server.** Multiplayer stays peer to peer (`host/net.ts`) and never touches this service. Nothing here runs game rules, moves players or relays messages.
- **The browser save still comes first.** Every save is written to the browser exactly as before. The cloud is a mirror kept in step with it. If the cloud is unreachable, play continues, and uploads resume by themselves (backing off from 15 s to 5 min).
- **The game never sees the network or the wallet.** The sandboxed game asks the trusted host page with `CLOUD_ACTION` and is told what happened with `CLOUD_STATE` (`roster.ts`). The session token lives only in the host page.

## Signing in

1. The game's "Verify wallet" button asks the host page.
2. The host asks the Worker for a challenge, an EIP-4361-style sign-in message. It names:
   - the site and the wallet
   - Robinhood Chain (4663)
   - a single-use nonce
   - a ten-minute expiry
   - the words "It is not a transaction and costs nothing"
3. Before the wallet sees anything, the host checks the message is exactly that text for this site and wallet (`isSignInMessage`). A server sending anything else gets no signature.
4. The wallet signs the message (`personal_sign`). This is the only signature the page ever asks for: no transactions, no typed data (permits), no approvals. `tests/preview-bundle.test.mjs` enforces that in the built preview.
5. The Worker verifies it. It checks that the nonce is unused, unexpired, for this address and origin, and that the message matches word for word. It recovers the signer for plain wallets, and uses ERC-1271/6492 through the chain for contract wallets. It claims the nonce before verifying, so a replay can't race.
6. The Worker issues a random 32-byte session token valid for 30 days, and stores only its SHA-256. "Sign out of cloud saves" deletes it.

A Friend's token ID or a player's name is never a credential. Every save request needs the bearer token, and every write also needs the wallet to own the Friend on chain at that moment.

## Characters and ownership

- **One character per (wallet, Friend).** This matches the browser saves, which were always per wallet and Friend.
- **Writes need current ownership.** The Worker reads `ownerOf(friend)` on the Generations collection (`0x14C4…181D`) and caches the answer for 5 minutes. A Friend that doesn't exist counts as unowned. If the chain can't be read and nothing is cached, the write is refused with "try again", and the browser save holds the progress.
- **Reads are always allowed for your own character.** Even after the Friend has moved to another wallet, you can see and export your own progress. It is never deleted.

### When a Friend changes hands

- **The new owner** starts their own character for that Friend. They never receive the previous owner's progress: nothing transfers silently.
- **The previous owner** keeps their character. They can read it and export it (save code), but can't write to it while they don't own the Friend. If the Friend comes back to them, they carry on where they were.

No one is locked out of progress they made, and no one gets another player's private progress with an NFT. The game shows this as "This wallet doesn't own this Friend now…" and stops cloud saving; the browser save is untouched.

## Never going backwards

- **Every write names the version it was based on.** The Worker updates only if that is still the latest version, inside one D1 transaction. Otherwise it answers 409 with the newer version. An older save can never overwrite a newer one: two devices racing for the same new character get one 200 and one 409.
- **The host decides at start.** It keeps, per wallet and Friend, the last cloud version it agreed with and a hash of that save. When the game starts it compares that with the cloud:

  | Situation | Result |
  |---|---|
  | Nothing in the browser | The cloud's adventure is used. |
  | Browser unchanged since the last sync | The cloud's newer adventure is used. |
  | Played on this device since the last upload, and the cloud hasn't moved | This device's adventure is newer and uploads. |
  | Both changed | The player is asked ("Two versions of this adventure"), with both summaries side by side. |

- **Nothing is thrown away.**
  - Keeping the cloud's copy sets this browser's aside as a backup (`…:backup`). The game swaps saves on the title screen, or reloads if the question came mid-play.
  - Keeping this browser's copy is a "takeover" write. The cloud's previous version goes into its history first.
- **One tab saves at a time.** The existing tab hand-off (`SAVE_ELSEWHERE`) also stops older tabs' cloud uploads.

## Upload rhythm

The game writes to the browser every 5 seconds while something changes. The host uploads:

- every **90 s** while the save changes
- within **12 s** after a milestone (a level, a quest, an achievement)
- **straight away** when the player logs out, and once more when the page closes (`keepalive`)

Bodies are gzipped JSON, typically 2–20 KB. The Worker refuses automatic saves closer together than 8 s per character.

D1's free tier allows about 100,000 written rows a day. A normal save writes one row; a history copy is added at most every 10 minutes. That leaves room for well over a hundred players playing for hours each day.

## Importing existing characters

Characters made before cloud saves were introduced live only in a browser, or in a save code.

- **Browser saves:** after the first sign-in, if the cloud has no character but the browser has one, the game asks "Bring your adventure to the cloud" and shows the save's summary.
  - Nothing is uploaded until the player chooses.
  - On "Import to the cloud", the host keeps a copy aside, uploads the save as an `import`, and clears the copy only once the Worker confirms the stored version.
  - "Not now" leaves the adventure in the browser, with an import button in Settings and a chip in the game.
- **Save codes:** restoring a code in Settings, as before, now also imports it into the cloud (replacing the cloud's version, which goes to history first).
- **No duplicates:** every import carries a SHA-256 of what was imported, and the Worker records it. The same import again changes nothing (`duplicate: true`), so repeated imports can't duplicate or keep overwriting a character. An import that fails isn't recorded as done.

Old saves are never discarded. A browser save that never reached the cloud stays in the browser until the player imports it.

## What the server checks, and what it can't

The game is client-authoritative. It runs in the player's browser, so a determined player can change their own save. Server storage alone doesn't change that, and this service doesn't pretend it does. What it does:

- **Shape and size:**
  - JSON only, at most 400 KB
  - save version `v: 1`
  - the Friend in the save must be the Friend in the URL
  - sensible field names (no `__proto__` and similar)
  - limited depth and lengths, finite numbers
  - an inventory of at most 64 slots
- **Impossible values:** at most 200,000,000 XP per skill (the game's own cap).
- **Plausible progress:** between saves, no skill's XP may fall, play time (the save's ticks) may neither fall nor run more than a quarter ahead of real time (plus half an hour's slack), and total XP may grow by at most 2,000,000 plus 3,000 XP per second of real time (about 10.8 million an hour, far beyond honest play), and no more than that per second of play time either. An automatic save that fails is refused, and the player keeps their browser save. Imports and takeovers are the player's explicit choice: they are kept, but the character stops being verified (below).
- **The client still validates:** every field of a loaded save is checked again by the game (`engine.ts` `restore`), exactly as for browser saves, so a tampered save can't break the game.

Currency, items and achievements are not treated as authoritative for anything shared: the Realm's economy is simulated and per player. If shared stakes ever arrive, such as real rewards or a global leaderboard, they will need server-side rules for those specific actions, not just stored saves.

## Verified progress

For anything with shared stakes, the service keeps, per character, whether it can vouch for the progress: `trust` is `verified` or `unverified`, with a note saying why and the version it changed at. It is sent back with every save and load, and listed with the characters.

- **Verified** progress is progress the service watched grow, save by save, within the checks above. Characters stored before trust was recorded are trusted as they stand (the migration's default), and so is the **first import** of a character the cloud has never seen: the adventure brought in from a browser is trusted once.
- A character becomes **unverified**, for good, when a save comes from outside that chain:
  - an import of a save the service never stored (a save code from elsewhere; re-importing a save the cloud itself stored, by its hash, is fine)
  - an import or a takeover with more progress than the time allows
  - an earlier version brought back with `restore`
  - a new character that didn't start from nothing (its first save already past the slack)
- Nothing else changes: an unverified character saves, loads and plays exactly as before. Only what needs the service's word (a collectible card's snapshot, prizes) asks for `verified`.
- **Attestations:** `GET /v1/characters/:friend/attestation` returns the stored version vouched for: `{ address, friend, version, hash, totalXp, trust, at, sig }`, where `hash` is the SHA-256 of the stored save and `sig` an HMAC-SHA256 over those fields with the service's `ATTEST_KEY`. A step that didn't watch the save being stored (a mint) can check the signature instead of trusting its caller. Without the secret the route answers 503.

## Adventurer Cards

`src/cards.ts` is the service's half of the Realm's collectible cards; `contracts/AdventurerCards.sol` (an ERC-721 on Robinhood Chain, one collection) is the other. A card is a **snapshot** of a verified character's progress: every skill's XP, and the items the player set aside in the card's **lockbox** (the bank's 🂠 tab in the game; `cardescrow.ts`). The service holds the snapshot and keeps the lockbox exactly as it was while the card is out: a save that changes it is refused. Minting is by **voucher**: the service signs (EIP-712, `MINTER_KEY`) that this wallet may mint this token for this character with this snapshot hash; the player's wallet sends the one transaction and pays its gas. Nothing on chain concerns a Friend itself: a card carries Realm progress only, never a Friend's generation, family or any state on chain.

- **Lifecycle:** prepared → reserved (voucher signed, lockbox held) → submitted (transaction sent) → active (the chain shows the mint; `holder` set) → redeemed (the chain shows the burn; settled in the game). A reserved card the player gives up, or whose voucher expires unsent (an hour), is cancelled and its lockbox opens. A failed transaction puts the card back to reserved.
- **One card out per character** at a time; no lifetime cap.
- **Redemption:** the holder burns the card from the game (`redeem(tokenId)`, the second and last transaction the host can send), then `POST /v1/cards/:id/redeem { txHash, friend }`; the chain's `CardRedeemed` event (this token, this wallet) is the proof. The service settles **exactly the snapshot**: the redeemer's character gains every skill's XP and the items (into its bank); the original loses that XP (keeping what it earned since the mint, never below Hitpoints 10) and its lockbox empties. Both stored saves are rewritten at once (the old versions kept in history, reason `settlement`), and the settlement stays `pending` for any session still playing an older save: every save that comes in without the card in its `settled` marks is settled on the way in, until the game loads the settled save and carries the mark. Redeeming your own card gives its items back and leaves XP as it is. `GET /v1/cards/held` lists the active cards the wallet holds now, by the chain's `ownerOf`.
- **Only verified progress** (above) can be made into a card.
- **Routes:** `POST /v1/cards/prepare`, `PUT /v1/cards/:id/image` (a PNG, at most 400 KB, with the facts it shows in `x-card-facts`), `POST /v1/cards/:id/submitted|confirm|cancel`, `GET /v1/characters/:friend/card` (the owner's view, with the voucher while reserved); public: `GET /v1/cards/collection` (OpenSea's contract-level metadata), `GET /v1/cards/:id` (a minted card's token metadata), `GET /v1/cards/:id/image` (its picture, from the R2 bucket `rarefriends-realm-nft`, which stays private: the Worker serves it).
- **The host page** (`host/cloud.ts` `mintCard`) does the whole flow on the game's `mint-card`; the game only asks and shows where the card is (`CLOUD_STATE.card`). `tests/preview-bundle.test.mjs` allows exactly one `eth_sendTransaction` in the host, the card's mint.
- **Contract:** `npm run cards:compile`, then `DEPLOYER_KEY=… MINTER=<the MINTER_KEY's address> npm run cards:deploy` (testnet by default; mainnet needs `CHAIN=mainnet CONFIRM_MAINNET=yes`, set on purpose). Put the address in `CARDS_CONTRACT` and redeploy the Worker. Roles: the admin (the deployer unless `ADMIN`) sets the base URI and royalties; the minter is the service's key; royalties (ERC-2981, `ROYALTY_BPS`, default 5%) go to `TREASURY`.

## The development game

A private, playable copy of the Realm for building it: the **same built game** (the public `game.js`, its world baked without the deployed development world, which the editor lays over it whole), served by this Worker under `/dev/` behind the owner's login, with an **overlay** laid over the world (`games/rarefriends-realm/overlay.ts`): tiles painted, ground raised, things placed or removed, buildings, spawns, new definitions. The host page there carries the editor (`host/editor.tsx`, built only with `npm run build:dev`); the game reports clicks and rebuilds its world from the bake plus the overlay on every change, so editing is always the bake plus one layer, never edits on edits. Nothing links to `/dev/` from the public site, it answers `noindex`, and a secret URL is not the lock: every request there needs a session.

- **Access:** `POST /dev/api/login { password }` checks the password against `DEV_PASSWORD_HASH` (PBKDF2-SHA256; make it with `node scripts/dev-password.mjs`, set it with `npx wrangler secret put DEV_PASSWORD_HASH`), five tries then a fifteen-minute wait per address, and sets an `HttpOnly; Secure; SameSite=None` cookie scoped to `/dev` for twelve hours (sliding; None rather than Strict because the game's sandboxed frame has an opaque origin and its own loads of the bundle must carry the session). Only a SHA-256 of the token is stored. Writes also need the `x-realm-dev: 1` header, and requests from any other origin are refused. `POST /dev/api/logout`, `/dev/api/logout-all` (after a password change). Every save, checkpoint, restore, reset, export and sign-in is in `GET /dev/api/audit`.
- **Persistence:** `dev_worlds` holds the overlay with a version; `PUT /dev/api/world/main { baseVersion, overlay }` saves (409 if it moved on) and keeps a revision; `POST …/revisions { name }` names a checkpoint; `…/restore { revision }` and `…/reset` bring one back or go to the empty baseline, keeping the current overlay as a revision first; `GET …/export` downloads it.
- **Promotion to production, by pull request:** `node scripts/dev-promote.mjs --fetch <slug> --pr` takes the overlay from the service (the password asked for, hidden), lays it over a freshly generated world and reports what it couldn't do and what can't be reached (refusing to go on with problems, unless `--force`), writes it as `games/rarefriends-realm/overlays/<slug>.ts`, lists it in `overlays/index.ts`, and on a branch of its own commits, pushes and opens the pull request with `gh`. Without `--pr` it only writes the files; with an exported file instead of `--fetch` it works offline; `--check` only reports. `generateWorld` applies the listed overlays last of all, the bake carries the result, and the change is reviewed, tested and reverted like any other commit. Saving in the editor never touches the public game.
- **What an overlay can hold** (`overlay.ts`): tiles, fills, ground raised, things removed, things placed, buildings, spawns, **camp zones** (rectangles where camping is allowed or forbidden whatever the rules, with the reason the player is told; `camping.ts` lays them over `CAMP_RULES`), and definitions: **people** (name, examine, how they're drawn, what they say in turn), **monsters** (every number, the art, the drops), **items** (icon, value, food, weight) and **quests** (an errand: who asks, for how many of what, every line of the talk, and the coins, XP and items it pays; `content.ts registerDevQuest` puts it in the log, the points and the saves like any other). The editor's *define* tab makes them; ids of the overlay's own start with `dev_`, so they can't shadow the game's.
- **Deploying the world, from the dashboard:** the **Deploy…** button beside Save lists the saves (every save and checkpoint is a revision); choosing one, and confirming, calls `POST /dev/api/world/main/deploy { revision }`. The Worker commits that overlay on `main` as `games/rarefriends-realm/overlays/devworld.ts` (always listed in `overlays/index.ts`, so each deploy replaces the last, and deploying an older save rolls back), through GitHub's API with the token in the secret `DEV_DEPLOY_TOKEN`, which never leaves the Worker. CI then runs every check, the engine test "Deployed world" among them (the overlay must apply to a fresh world with no problems and nothing out of reach), and publishes only if they all pass; Pages publishes one at a time, the newest last. `GET …/deploys` lists the deploys with their checks' progress (deploying, live, failed, replaced, was live), read back from GitHub. One deploy a minute; each is audited. Migration: `migrations/0006-deploys.sql`.
  - **Setting it up (once):** on GitHub, Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate: repository access *only* `M4S4T0-V01D/rarefriends-realm`; permissions *Contents: Read and write* and *Actions: Read-only* (nothing else); an expiry you'll remember. Then `npx wrangler secret put DEV_DEPLOY_TOKEN --config cloud/wrangler.toml` and paste it. Revoke it on GitHub to turn deploying off; until it's set, the list says deploying isn't set up and the service refuses.
- **Deploying the site:** `npm run build:dev` builds into `cloud/dev-site/` (ignored by git), and `npx wrangler deploy` uploads it as the Worker's assets (`run_worker_first`, so nothing is served without the session). Migration: `migrations/0005-dev.sql`.

## Backups and recovery

- **The cloud keeps earlier versions:** the last 12 per character. A copy is taken at most every 10 minutes, and always before an import, a takeover or a restore. `GET /v1/characters/:friend/history` lists them, and `POST /v1/characters/:friend/restore { version }` brings one back as the newest version (keeping the replaced one too).
- **The browser keeps:**
  - its own save
  - a `…:backup` copy whenever the cloud's adventure replaced it, or while an import is unconfirmed
- **Save codes** still work as an extra copy on any device.

## Operating it

From `cloud/`, with Wrangler logged in to the account:

```sh
npx wrangler d1 create rarefriends-realm-saves          # once; put the id in wrangler.toml
npx wrangler d1 execute rarefriends-realm-saves --remote --file schema.sql
npx wrangler d1 execute rarefriends-realm-saves --remote --file migrations/0002-verified.sql   # once, for a database made before verified progress
npx wrangler secret put ATTEST_KEY                      # a long random string; attestations are signed with it
npx wrangler d1 execute rarefriends-realm-saves --remote --file migrations/0003-cards.sql      # once, for a database made before Adventurer Cards
npx wrangler d1 execute rarefriends-realm-saves --remote --file migrations/0004-settlements.sql  # once, for a database made before redemptions
npx wrangler secret put MINTER_KEY                      # the cards' signing key (0x…64 hex); its address is the contract's MINTER
npx wrangler r2 bucket create rarefriends-realm-nft     # once; the cards' pictures (bound as CARDS in wrangler.toml)
npx wrangler deploy
npx wrangler tail                                       # live logs
```

Configuration is in `wrangler.toml` `[vars]`:

- `ORIGINS`: the pages allowed to sign in: `https://m4s4t0-v01d.github.io` and the organisation copy's `https://rare-friends-realm.github.io` (both renderers share each), and the Android app's `https://realm.localhost`.
- `RPC_URL`, `CHAIN_ID`, `COLLECTION`
- `CARDS_CONTRACT`, `CARDS_CHAIN_ID`, `CARDS_RPC_URL`, `GAME_URL`: the Adventurer Cards contract and its chain (testnet 46630 while it's being tried); an empty contract keeps cards closed

The secrets are `ATTEST_KEY`, which signs attestations, and `MINTER_KEY`, which signs card vouchers; neither leaves the Worker, and nothing in the game or the host page holds them. The Worker holds no funds: the player's wallet pays a mint's gas. Sessions are random tokens, and chain reads are public.

Known limits:

- **The public Robinhood RPC sometimes refuses requests from Cloudflare.** Ownership reads retry three times and are cached for 5 minutes. When they still fail, the client keeps the save and retries.
- **Ownership caching:** after a Friend changes hands, the previous owner can keep writing for up to 5 minutes, until the ownership cache expires.
