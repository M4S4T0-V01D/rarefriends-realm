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
  if (process.env.REAL_RELAYS) { console.log("PASS real relays: both players met over Trystero/Nostr"); process.exit(0); }
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

  // A goes offline: B stops seeing #7730.
  await a.game.getByRole("tab", { name: "Settings" }).click();
  await a.game.getByLabel("Online: see and meet other players").click();
  await a.until(() => window.__realm.net() === "offline", "going offline");
  await b.until(() => !window.__realm.peers().some(peer => peer.id === 7730), "#7730 leaving", 25_000);

  assert.deepEqual(errors, [], "browser errors");
  console.log("PASS multiplayer: two players see each other walk, right-click menu, friends list, party bonus, public chat, whispers (links stripped), going offline");
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(outdir, { recursive: true, force: true });
}
