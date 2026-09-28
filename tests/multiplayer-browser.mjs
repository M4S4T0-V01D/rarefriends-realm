// Two players at once: two tabs of one browser, each playing a different Friend from the same mock wallet, meet over the
// host's same-origin test channel (never the public relays): they see each other walk, chat in public and in private,
// add each other as friends and earn the party bonus together. Automated test only.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { decodeFunctionData, encodeEventTopics, encodeFunctionResult, padHex, parseAbi, zeroAddress } from "viem";
import { createGameServer } from "@rarefriends/friendsdk/serve";
import { FAMILIES_REGISTRY_ABI, GENERATION_SPRITE_MANIFEST } from "@rarefriends/friendsdk/sprites";
import { installFixture, OWNER } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";
import { REGULAR_SPRITES } from "../games/rarefriends-realm/regulars.ts";

const COLLECTION = "0x14C49e6118F46525dE9ab41a51cBAA3c6EBF181D";
const ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function balanceOf(address account) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
]);
const art = new Map(REGULAR_SPRITES.map(sprites => [sprites.tokenId, sprites]));
const artworkCall = call => {
  assert.equal(call.to.toLowerCase(), GENERATION_SPRITE_MANIFEST.registry.toLowerCase());
  const { functionName, args } = decodeFunctionData({ abi: FAMILIES_REGISTRY_ABI, data: call.data });
  let result;
  if (functionName === "familyOf") result = art.get(args[0]).familyId;
  else if (functionName === "seedOf") result = art.get(args[0]).seed;
  else if (functionName === "frames") result = [...art.values()].find(item => item.familyId === args[0] && item.seed === args[1]).frames;
  else throw new Error(`Unexpected artwork read ${functionName}`);
  return encodeFunctionResult({ abi: FAMILIES_REGISTRY_ABI, functionName, result });
};
const log = tokenId => ({ address: COLLECTION, blockNumber: "0x10", blockHash: padHex("0x10", { size: 32 }), data: "0x", logIndex: `0x${tokenId.toString(16)}`,
  transactionHash: padHex(`0x${tokenId.toString(16)}`, { size: 32 }), transactionIndex: "0x0", removed: false,
  topics: encodeEventTopics({ abi: ABI, eventName: "Transfer", args: { from: zeroAddress, to: OWNER, tokenId } }) });

const outdir = await mkdtemp(join(tmpdir(), "realm-mp-"));
await mkdir("./artifacts", { recursive: true });
let browser, server;
const errors = [];
try {
  execFileSync("node", ["scripts/build.mjs", "--outdir", join(outdir, "dist")], { stdio: "inherit" });
  server = createGameServer(join(outdir, "dist"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1320, height: 900 } });
  /** One player: a tab that connects the mock wallet and begins as the given Friend. */
  const player = async friendId => {
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.on("pageerror", error => errors.push(`#${friendId}: ${error.message}`));
    await installFixture(page, origin, { artworkCall });
    if (process.env.REAL_RELAYS) await page.addInitScript(() => { if (window === window.top) Object.defineProperty(navigator, "webdriver", { get: () => false }); });
    // NO_DIRECT=1: networks that can't open a direct WebRTC link (remote candidates are dropped), so only the relays work.
    if (process.env.NO_DIRECT) await page.addInitScript(() => {
      const setRemote = RTCPeerConnection.prototype.setRemoteDescription;
      RTCPeerConnection.prototype.addIceCandidate = async () => {};
      RTCPeerConnection.prototype.setRemoteDescription = function (description) {
        const sdp = description?.sdp?.split("\r\n").filter(line => !line.startsWith("a=candidate")).join("\r\n");
        return setRemote.call(this, description && sdp !== undefined ? { type: description.type, sdp } : description);
      };
    });
    await page.route("https://rpc.mainnet.chain.robinhood.com/**", async route => {
      const request = route.request().method() === "POST" ? route.request().postDataJSON() : null;
      const reply = result => route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result }, headers: { "access-control-allow-origin": "*" } });
      if (request?.method === "eth_getLogs" && request.params[0].topics?.[2]?.toLowerCase() === padHex(OWNER, { size: 32 })) return reply([log(7730n), log(3412n)]);
      if (request?.method === "eth_call" && request.params[0].to.toLowerCase() === COLLECTION.toLowerCase()) {
        let decoded = null;
        try { decoded = decodeFunctionData({ abi: ABI, data: request.params[0].data }); } catch { return route.fallback(); }
        const { functionName, args } = decoded;
        if (functionName === "balanceOf") return reply(encodeFunctionResult({ abi: ABI, functionName, result: 2n }));
        if (functionName === "ownerOf" && args[0] === 3412n) return reply(encodeFunctionResult({ abi: ABI, functionName, result: OWNER }));
      }
      return route.fallback();
    });
    await page.goto(origin);
    await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
    await page.getByRole("button", { name: new RegExp(`^Friend #${friendId}\\b`) }).click();
    const game = page.frameLocator("iframe");
    await game.locator('.realm-game[data-phase="title"]').waitFor();
    await game.getByRole("button", { name: /Begin your adventure|Continue your adventure/ }).click();
    await game.locator('.realm-game[data-phase="playing"]').waitFor();
    const frame = () => page.frames().find(entry => entry !== page.mainFrame() && entry.url() !== "about:blank");
    const state = fn => frame().evaluate(fn);
    const until = async (fn, what, timeout = 20_000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await state(fn)) return; await page.waitForTimeout(200); } assert.fail(`#${friendId}: timed out waiting for ${what}`); };
    const teleport = (x, y) => frame().evaluate(([x, y]) => { const p = window.__realm.game().player; p.x = x; p.y = y; p.prev = { x, y }; p.path = []; window.__realm.refresh(); }, [x, y]);
    return { page, game, frame, state, until, teleport };
  };
  const a = await player(7730), b = await player(3412);

  // Both come online and see each other.
  await a.until(() => window.__realm.net() === "online", "going online");
  await b.until(() => window.__realm.net() === "online", "going online");
  await a.teleport(121, 123); await b.teleport(123, 124);
  await a.until(() => window.__realm.peers().some(peer => peer.id === 3412 && peer.x === 123), "seeing #3412", process.env.REAL_RELAYS ? 90_000 : 20_000);
  await b.until(() => window.__realm.peers().some(peer => peer.id === 7730 && peer.x === 121), "seeing #7730");
  if (process.env.REAL_RELAYS) {
    // And they can talk: a public line from A reaches B.
    const input = a.game.getByRole("textbox", { name: "Say something" }); await input.click(); await input.fill("hello over the relays"); await input.press("Enter");
    await b.until(() => window.__realm.game().messages.some(m => m.tone === "public" && m.text.includes("hello over the relays")), "public chat over real relays", 60_000);
    await b.page.waitForTimeout(4000);
    assert.equal(await b.state(() => window.__realm.game().messages.filter(m => m.tone === "public" && m.text.includes("hello over the relays")).length), 1, "each line arrives once, whichever path it takes");
    console.log(`PASS real relays${process.env.NO_DIRECT ? " (no direct links: the relay path alone)" : ""}: both players met and chatted`); process.exit(0);
  }
  // B walks; A sees it move.
  await b.frame().evaluate(() => { const g = window.__realm.game(); g.player.path = [{ x: 124, y: 124 }, { x: 125, y: 124 }, { x: 126, y: 124 }]; });
  await a.until(() => window.__realm.peers().some(peer => peer.id === 3412 && peer.x === 126), "#3412 walking");

  // A right-clicks B: the player menu, and Add-friend.
  const at = await a.frame().evaluate(() => { const peer = window.__realm.peers().find(entry => entry.id === 3412); return window.__realm.screenOf(peer.x, peer.y); });
  const box = await a.page.locator("iframe").boundingBox();
  await a.page.waitForTimeout(700);
  await a.page.mouse.click(box.x + at.x, box.y + at.y - 20, { button: "right" });
  await a.game.getByRole("menuitem", { name: /Follow .*#3412/ }).waitFor();
  await a.page.locator(".rf-game-frame").screenshot({ path: "./artifacts/multiplayer-menu.png" });
  await a.game.getByRole("menuitem", { name: /Add-friend .*#3412/ }).click();
  await a.until(() => window.__realm.peers().some(peer => peer.id === 3412 && peer.friend), "#3412 on the friends list");
  await a.until(() => window.__realm.game().player.nearFriends > 0, "the party bonus");

  // Public chat, over A's head and in B's log; then a whisper.
  const say = async (who, text) => { const input = who.game.getByRole("textbox", { name: "Say something" }); await input.click(); await input.fill(text); await input.press("Enter"); };
  await say(a, "hello from the fountain!");
  await b.until(() => window.__realm.game().messages.some(m => m.tone === "public" && m.text.includes("#7730: hello from the fountain!")), "public chat");
  await b.until(() => window.__realm.peers().some(peer => peer.id === 7730 && peer.said === "hello from the fountain!"), "a chat bubble");
  await say(a, "@3412 meet me at the castle https://scam.example.com");
  await b.until(() => window.__realm.game().messages.some(m => m.tone === "private" && m.text.includes("meet me at the castle [link removed]")), "a whisper, link stripped");
  await b.page.waitForTimeout(600);
  await b.page.locator(".rf-game-frame").screenshot({ path: "./artifacts/multiplayer.png" });

  // An emote: A dances, B sees it.
  await a.game.getByRole("tab", { name: "Emotes" }).click();
  await a.game.getByRole("button", { name: "Dance", exact: true }).click();
  await b.until(() => window.__realm.peers().some(peer => peer.id === 7730 && peer.emote === "dance"), "seeing #7730 dance");
  // Emote sync: B waves near A, and A (who has B as a friend, standing idle) joins in.
  await a.until(() => { const g = window.__realm.game(); return !g.player.emote || g.tick >= g.player.emote.until; }, "A's dance ending", 20_000);
  await b.frame().evaluate(() => { const g = window.__realm.game(); g.player.emote = { id: "wave", start: g.tick, until: g.tick + 8 }; });
  await a.until(() => { const g = window.__realm.game(); return g.player.emote?.id === "wave" && g.messages.some(m => m.text.includes("You join in")); }, "A joining B's wave");

  // A drops a sapphire-ish gem; B sees it on the ground and takes it.
  await a.frame().evaluate(() => { const g = window.__realm.game(), p = g.player; p.inventory[6] = { id: "rosestone", n: 1 }; window.__realm.refresh(); });
  await a.game.getByRole("tab", { name: "Inventory" }).click();
  const gem = a.game.getByRole("button", { name: "Rosestone" });
  const gemBox = await gem.boundingBox();
  await a.page.mouse.click(gemBox.x + gemBox.width / 2, gemBox.y + gemBox.height / 2, { button: "right" });
  await a.game.getByRole("menuitem", { name: /^Drop Rosestone/ }).click();
  const seen = await (async () => { const end = Date.now() + 15000; while (Date.now() < end) { const n = await b.frame().evaluate(() => window.__realm.drops().length); if (n) return true; await b.page.waitForTimeout(200); } return false; })();
  assert(seen, "B sees A's drop");
  await b.frame().evaluate(() => { const drop = window.__realm.drops()[0], p = window.__realm.game().player; p.x = drop.x; p.y = drop.y; p.prev = { x: drop.x, y: drop.y }; window.__realm.takeDrop(0); });
  await b.until(() => window.__realm.game().player.inventory.some(slot => slot?.id === "rosestone"), "B picking up A's rosestone");
  await a.until(() => !window.__realm.game().ground.some(entry => entry.id === "rosestone"), "the rosestone leaving A's ground");

  // A trade by real clicks: A offers 250 coins, B offers a yew bow; both accept twice.
  await b.frame().evaluate(() => { const p = window.__realm.game().player; p.inventory[7] = { id: "yew_bow", n: 1 }; window.__realm.refresh(); });
  const coinsA = await a.state(() => window.__realm.game().player.inventory.reduce((n, slot) => n + (slot?.id === "coins" ? slot.n : 0), 0));
  const at2 = await a.frame().evaluate(() => { const peer = window.__realm.peers().find(entry => entry.id === 3412); return window.__realm.screenOf(peer.x, peer.y); });
  await a.page.mouse.click(box.x + at2.x, box.y + at2.y - 20, { button: "right" });
  await a.game.getByRole("menuitem", { name: /Trade with .*#3412/ }).click();
  await b.game.getByRole("button", { name: "Trade", exact: true }).click();
  await a.game.getByRole("dialog", { name: "Trading with Friend #3412" }).waitFor();
  await b.game.getByRole("dialog", { name: "Trading with Friend #7730" }).waitFor();
  const offerCoins = a.game.getByRole("button", { name: "Offer Coins" });
  const coinBox = await offerCoins.boundingBox();
  await a.page.mouse.click(coinBox.x + coinBox.width / 2, coinBox.y + coinBox.height / 2, { button: "right" });
  await a.game.getByRole("menuitem", { name: /^Offer-10 Coins/ }).click();
  await b.game.getByRole("button", { name: "Offer Yew bow" }).click();
  await b.game.getByRole("button", { name: /Remove Coins|Coins × 10/ }).waitFor().catch(() => {});
  await a.game.getByText("Their offer").waitFor();
  await a.page.waitForTimeout(500);
  await a.page.locator(".rf-game-frame").screenshot({ path: "./artifacts/trade.png" });
  await a.game.getByRole("button", { name: "Accept" }).click(); await b.game.getByRole("button", { name: "Accept" }).click();
  await a.game.getByText("Are you sure you want to make this trade?").waitFor();
  await b.game.getByText("Are you sure you want to make this trade?").waitFor();
  await a.game.getByRole("button", { name: "Accept" }).click(); await b.game.getByRole("button", { name: "Accept" }).click();
  await a.until(() => window.__realm.game().player.inventory.some(slot => slot?.id === "yew_bow"), "A receiving the bow");
  await b.until(() => !window.__realm.game().player.inventory.some(slot => slot?.id === "yew_bow"), "B giving the bow");
  assert.equal(await a.state(() => window.__realm.game().player.inventory.reduce((n, slot) => n + (slot?.id === "coins" ? slot.n : 0), 0)), coinsA - 10, "A paid 10 coins");

  // A duel in the sparring ring: A picks Fight on B; B (weakened) goes down, is restored at once, and A takes the win.
  await a.teleport(139, 146); await b.teleport(141, 146);
  await b.frame().evaluate(() => { const p = window.__realm.game().player; p.hp = 2; p.inventory = p.inventory.map(slot => slot?.id === "coins" ? slot : null); window.__realm.refresh(); });
  await a.frame().evaluate(() => { const p = window.__realm.game().player; for (const s of ["attack", "strength"]) p.xp[s] = 200_000; });
  await a.until(() => window.__realm.peers().some(peer => peer.id === 3412 && peer.x === 141 && peer.y === 146), "B in the ring");
  const ringAt = await a.frame().evaluate(() => window.__realm.screenOf(141, 146)), ringBox = await a.page.locator("iframe").boundingBox();
  await a.page.mouse.click(ringBox.x + ringAt.x, ringBox.y + ringAt.y - 20, { button: "right" });
  await a.game.getByRole("menuitem", { name: /^Fight .*#3412/ }).click();
  await a.until(() => (window.__realm.game().player.stats.duelsWon ?? 0) >= 1, "A winning the duel", 40_000);
  await b.until(() => (window.__realm.game().player.stats.duelsLost ?? 0) >= 1 && window.__realm.game().player.hp > 2, "B losing, and back on its feet");
  await a.page.locator(".rf-game-frame").screenshot({ path: "./artifacts/duel.png" });

  // A shared fight: B attacks a cow, and A's copy of the same cow loses HP too; A sees B's health bar data.
  await a.teleport(62, 128); await b.teleport(63, 129);
  const cowUid = await b.frame().evaluate(() => { const g = window.__realm.game(), p = g.player; for (const s of ["attack", "strength"]) p.xp[s] = 30_000;
    const cow = g.monsters.filter(m => m.def.id === "cow" && !m.dead).sort((m1, m2) => Math.hypot(m1.x - p.x, m1.y - p.y) - Math.hypot(m2.x - p.x, m2.y - p.y))[0]; cow.hp = cow.def.hp; p.combat = cow.uid; return cow.uid; });
  await a.until(new Function(`const cow = window.__realm.game().monsters.find(m => m.uid === ${cowUid}); return cow.dead || cow.hp < cow.def.hp;`), "A seeing B's hits on the shared cow", 30_000);
  await a.page.waitForTimeout(400);
  await a.page.locator(".rf-game-frame").screenshot({ path: "./artifacts/shared-fight.png" });

  // A referral: B enters A's code in the Friends tab; A's game rewards A too, since they're online together.
  await b.game.getByRole("tab", { name: "Friends and wardrobe" }).click();
  const code = b.game.getByRole("textbox", { name: "A friend's referral code" });
  await code.fill("RF-7730"); await code.press("Enter");
  await b.until(() => window.__realm.game().player.inventory.some(slot => slot?.id === "friendship_cape"), "B's Friendship cape");
  await a.until(() => window.__realm.game().player.referrals.includes(3412), "A credited for referring #3412");
  await b.page.waitForTimeout(300); await b.page.locator(".rf-game-frame").screenshot({ path: "./artifacts/referral.png" });

  // A goes offline: B stops seeing #7730.
  await a.game.getByRole("tab", { name: "Settings" }).click();
  await a.game.getByLabel("Online: see and meet other players").click();
  await a.until(() => window.__realm.net() === "offline", "going offline");
  await b.until(() => !window.__realm.peers().some(peer => peer.id === 7730), "#7730 leaving", 25_000);

  assert.deepEqual(errors, [], "browser errors");
  console.log("PASS multiplayer: two players see each other walk, right-click menu, friends list, party bonus, public chat, whispers (links stripped), emotes, shared drops, a trade by clicks, emote sync, a duel in the ring, a shared fight, a referral, going offline");
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(outdir, { recursive: true, force: true });
}
