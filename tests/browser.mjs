// End-to-end check of RareFriends Realm in its custom runtime page (host/runtime.tsx) with the SDK's mock wallet fixture:
// a wallet holding two Friends (#7730 plays, #3412 follows). Title screen, real mouse and keyboard play, right-click menus,
// dialogue, bank, world map, Rare Caskets through the runtime's confirmations, the adventurer card, per-wallet save and
// restore, and a screenshot tour of every region (./artifacts). Automated test only: public builds always use the real
// wallet and ownership gate.
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

const outdir = await mkdtemp(join(tmpdir(), "realm-host-"));
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
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on("pageerror", error => errors.push(error.message));
  const fixture = await installFixture(page, origin, { artworkCall });
  await page.addInitScript(() => {
    if (window !== window.top) return;
    window.__shared = { opened: [], copied: [] };
    window.open = url => { window.__shared.opened.push(String(url)); return null; };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async items => { window.__shared.copied.push(items.flatMap(item => item.types)); } } });
  });
  // The same wallet also holds #3412: extend the fixture's owner-filtered discovery reads.
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
  const game = page.frameLocator("iframe"), realm = game.locator(".realm-game");
  const frame = () => page.frames().find(entry => entry !== page.mainFrame() && entry.url() !== "about:blank");
  const shot = name => page.locator(".rf-game-frame").screenshot({ path: `./artifacts/${name}.png` });
  const state = fn => frame().evaluate(fn);
  const until = async (fn, timeout = 30_000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await state(fn)) return; await page.waitForTimeout(150); } assert.fail(`Timed out waiting for ${fn}`); };
  const teleport = async (x, y) => { await frame().evaluate(([x, y]) => { const g = window.__realm.game(), p = g.player; p.x = x; p.y = y; p.prev = { x, y }; p.path = []; p.target = null; p.activity = null; p.combat = null; window.__realm.refresh(); }, [x, y]); await page.waitForTimeout(900); };
  /** Page coordinates of a world tile (the hook reports frame coordinates; add the iframe's offset). */
  const screenOf = async (x, y) => {
    const inner = await frame().evaluate(([x, y]) => window.__realm.screenOf(x, y), [x, y]), box = await page.locator("iframe").boundingBox();
    return { x: box.x + inner.x, y: box.y + inner.y };
  };
  const enter = async () => {
    await page.goto(origin);
    await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
    await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
    await game.locator('.realm-game[data-phase="title"]').waitFor();
  };

  // ---------- Title screen ----------
  await enter();
  await game.locator('.realm-game[data-hosted="linked"]').waitFor();
  await game.getByRole("heading", { name: "Friend #7730" }).waitFor();
  await page.waitForTimeout(2500);
  await shot("title");
  await game.getByRole("button", { name: "Begin your adventure" }).click();
  await game.locator('.realm-game[data-phase="playing"]').waitFor();
  await page.waitForTimeout(1200);
  await shot("town");

  // ---------- Real mouse play: left-click a tree to chop it ----------
  const tree = await state(() => { const g = window.__realm.game(), p = g.player; return g.world.objects.filter(o => o.kind === "tree" && o.tree === "tree").sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; });
  // Stand a few tiles away so the tree is in open view (not under the chat box), then walk there by clicking it.
  await teleport(tree.x - 3, tree.y - 3);
  let point = await screenOf(tree.x, tree.y);
  await page.mouse.move(point.x, point.y - 6);
  await game.locator(".realm-hover").filter({ hasText: /^Chop down Tree/ }).waitFor();
  await page.mouse.click(point.x, point.y - 6);
  await until(() => window.__realm.game().player.activity?.kind === "woodcut", 20_000);
  await page.waitForTimeout(1500);
  await shot("woodcutting");
  await until(() => window.__realm.game().player.inventory.some(slot => slot?.id === "logs"), 40_000);

  // ---------- Right-click menu and dialogue with the Realm Guide ----------
  const guide = await state(() => window.__realm.game().npcs.find(npc => npc.id === "guide"));
  await teleport(guide.x + 1, guide.y + 1);
  point = await screenOf(guide.x, guide.y);
  await page.mouse.click(point.x, point.y - 20, { button: "right" });
  await game.getByRole("menu").waitFor();
  await game.getByRole("menuitem", { name: /Examine Realm Guide/ }).waitFor();
  await shot("menu");
  await game.getByRole("menuitem", { name: /Talk-to Realm Guide/ }).click();
  await game.getByText(/Welcome to the Realm, Hoverer/).waitFor();
  await shot("dialogue");
  await page.keyboard.press("Space");
  await game.getByRole("button", { name: /How do I play\?/ }).click();
  await game.getByText(/Left-click does the first option/).waitFor();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Space");
  assert.equal(await state(() => window.__realm.game().dialogue), null, "dialogue ends");

  // ---------- Keyboard: WASD walks ----------
  const before = await state(() => ({ x: window.__realm.game().player.x, y: window.__realm.game().player.y }));
  await page.locator("iframe").focus();
  await game.locator("canvas.realm-view").focus();
  await page.keyboard.down("s"); await page.waitForTimeout(1500); await page.keyboard.up("s");
  const after = await state(() => ({ x: window.__realm.game().player.x, y: window.__realm.game().player.y }));
  assert(after.x + after.y >= before.x + before.y + 2, `S walks down-screen (toward the camera), sliding around obstacles (${JSON.stringify(before)} → ${JSON.stringify(after)})`);

  // ---------- Panels ----------
  await state(() => { const g = window.__realm.game(), p = g.player, table = [0, 0, 83, 174, 276, 388, 512, 650, 801, 969, 1154, 1358, 1584, 1833, 2107, 2411, 2746, 3115, 3523, 3973, 4470, 5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 12031, 13363];
    Object.assign(p.xp, { attack: table[24], strength: table[26], defence: table[21], hitpoints: table[25], woodcutting: table[18], fishing: table[22], mining: table[16], smithing: table[12], cooking: table[20], firemaking: table[15], magic: table[13], prayer: table[9], crafting: table[7], thieving: table[11], agility: table[10] });
    p.hp = 25; p.equipment.weapon = "steel_scimitar"; p.equipment.head = "iron_full_helm"; p.equipment.body = "iron_platebody"; p.equipment.shield = "iron_kiteshield"; p.equipment.cape = "team_cape";
    p.wardrobe.push("rose_cape"); p.worn.push("rose_cape"); p.quests.friends_feast = 2; p.quests.grumblin_trouble = 1; p.questData.grumblins = 4;
    for (const [id, n] of [["lobster", 1], ["lobster", 1], ["lobster", 1], ["swordfish", 1], ["air_rune", 120], ["mind_rune", 80], ["oak_logs", 1], ["iron_ore", 1], ["uncut_sapphire", 1]]) { const i = p.inventory.indexOf(null); if (i >= 0) p.inventory[i] = { id, n }; }
    window.__realm.refresh(); });
  await game.getByRole("tab", { name: "Skills" }).click(); await page.waitForTimeout(300); await shot("skills");
  await game.getByRole("tab", { name: "Quest journal" }).click(); await game.getByRole("button", { name: "Grumblin Trouble" }).click(); await game.getByText(/Grumblins defeated: 4\/6/).waitFor(); await shot("quests");
  await game.getByRole("tab", { name: "Worn equipment" }).click(); await shot("equipment");
  await game.getByRole("tab", { name: "Friends and wardrobe" }).click();
  await game.getByRole("button", { name: /#3412/ }).click();
  assert.equal(await state(() => window.__realm.game().player.follower), 3412, "an owned Friend follows");
  await game.getByRole("tab", { name: "Inventory" }).click();

  // ---------- Combat in Whisperwood (real click) ----------
  const grumblin = await state(() => { const g = window.__realm.game(); return g.monsters.find(m => m.def.id === "grumblin" && !m.dead); });
  await teleport(grumblin.x + 2, grumblin.y + 1);
  const target = await state(() => { const g = window.__realm.game(), p = g.player; return g.monsters.filter(m => m.def.id === "grumblin" && !m.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; });
  point = await screenOf(target.x, target.y);
  await page.mouse.click(point.x, point.y - 18, { button: "right" });
  await game.getByRole("menuitem", { name: /Attack Grumblin/ }).click();
  await until(() => window.__realm.game().player.combat !== null || window.__realm.game().player.target !== null, 10_000);
  await page.waitForTimeout(2600);
  await shot("combat");
  await until(() => window.__realm.game().player.kills > 0, 60_000);
  await page.waitForTimeout(600); await shot("loot");

  // ---------- Bank ----------
  const booth = await state(() => window.__realm.game().world.objects.find(o => o.kind === "bank"));
  await teleport(booth.x, booth.y + 1);
  point = await screenOf(booth.x, booth.y);
  await page.mouse.click(point.x, point.y - 12);
  await game.getByRole("dialog", { name: "Bank of the Realm" }).waitFor();
  await game.getByRole("button", { name: "Deposit inventory" }).click();
  assert.equal(await state(() => window.__realm.game().player.inventory.filter(Boolean).length), 0, "inventory deposited");
  await game.getByRole("button", { name: /^Withdraw Lobster/ }).click();
  await shot("bank");
  await page.keyboard.press("Escape");
  await game.getByRole("button", { name: "Close" }).click().catch(() => {});

  // ---------- World map ----------
  await game.locator("canvas.realm-view").focus();
  await page.keyboard.press("m");
  await game.getByRole("dialog", { name: "World map of the Realm" }).waitFor();
  await page.waitForTimeout(300); await shot("worldmap");
  await game.getByRole("button", { name: "Close" }).click();

  // ---------- Rare Caskets (simulated RF, with the runtime's confirmations) ----------
  await game.getByRole("tab", { name: "Friends and wardrobe" }).click();
  await game.getByRole("button", { name: "Rare Caskets (simulated RF)" }).click();
  await game.getByRole("dialog", { name: "Rare Caskets" }).waitFor();
  await game.getByRole("button", { name: /^Buy 5/ }).click();
  await page.getByRole("button", { name: "Confirm preview", exact: true }).click();
  await game.getByRole("button", { name: /^Open 5 caskets/ }).waitFor();
  await game.getByRole("button", { name: /^Open 5 caskets/ }).click();
  await page.getByRole("button", { name: "Confirm preview", exact: true }).click();
  await game.locator(".realm-reveal > div").nth(4).waitFor();
  await page.waitForTimeout(500);
  await shot("caskets");
  assert((await state(() => window.__realm.game().player.wardrobe.length)) >= 2, "caskets add wardrobe pieces");
  await game.getByRole("button", { name: "Close" }).click();

  // ---------- Adventurer card: Post to X through the host ----------
  await game.getByRole("tab", { name: "Worn equipment" }).click();
  await game.getByRole("button", { name: /Adventurer card/ }).click();
  await game.getByRole("img", { name: /Adventurer card: Friend #7730/ }).waitFor();
  await game.getByRole("button", { name: "Post to X", exact: true }).click();
  await game.getByText(/Picture copied and X opened/).waitFor();
  const shared = await page.evaluate(() => window.__shared);
  const text = new URL(shared.opened[0]).searchParams.get("text");
  for (const tag of ["@RareFriendsNFT", "#RareFriends", "#RareFriendsRealm", "#7730"]) assert.ok(text.includes(tag), `post text includes ${tag}`);
  assert(text.length <= 280);
  await shot("card");
  const card = await game.getByRole("img", { name: /Adventurer card/ }).evaluate(image => {
    const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0); return { width: image.naturalWidth, height: image.naturalHeight, data: canvas.toDataURL("image/png").split(",")[1] };
  });
  assert.deepEqual([card.width, card.height], [1200, 675]);
  (await import("node:fs")).writeFileSync("./artifacts/adventurer-card.png", Buffer.from(card.data, "base64"));
  await game.getByRole("button", { name: "Close" }).click();

  // ---------- A tour of the Realm ----------
  await state(() => { const p = window.__realm.game().player; p.xp.hitpoints = 13_034_431; p.hp = 99; p.xp.defence = 13_034_431; window.__realm.game().autoRetaliate = false; });
  const tour = [
    ["farms", 90, 118], ["whisperwood", 50, 97], ["ashen-mine", 112, 54], ["emberforge", 160, 49], ["frostpeak", 196, 22], ["glass-lake", 178, 154],
    ["oasis", 185, 115], ["dunes", 208, 94], ["murkmire", 42, 182], ["mossy-ruins", 121, 181], ["agility", 94, 101], ["crypt", 44, 222], ["depths", 132, 222], ["throne", 190, 224],
  ];
  for (const [name, x, y] of tour) {
    await teleport(x, y);
    await state(() => { const p = window.__realm.game().player; p.hp = 99; });
    await page.waitForTimeout(1300);
    await shot(`region-${name}`);
  }
  assert.equal(await realm.getAttribute("data-region"), "hollow_depths");

  // ---------- Saved per wallet: reload and continue ----------
  await teleport(121, 123);
  await page.waitForTimeout(6000);
  const key = `rarefriends-realm:save:v1:${OWNER.toLowerCase()}:7730`;
  const saved = JSON.parse(await page.evaluate(name => localStorage.getItem(name), key));
  assert.equal(saved?.v, 1, "the adventure is saved for this wallet and Friend");
  assert.equal(saved.follower, 3412);
  assert(saved.xp.woodcutting > 0);
  await enter();
  await game.getByRole("button", { name: "Continue your adventure" }).waitFor();
  await game.getByText(/Saved adventure: total level/).waitFor();
  await shot("welcome-back");
  await game.getByRole("button", { name: "Continue your adventure" }).click();
  await game.locator('.realm-game[data-phase="playing"]').waitFor();
  assert(Number(await realm.getAttribute("data-total")) > 100, "levels restored");

  assert.deepEqual([...errors, ...fixture.errors], [], "browser errors");
  assert((await page.evaluate(() => window.__friendWalletTest.state.requests)).every(method =>
    ["eth_accounts", "eth_requestAccounts", "eth_chainId", "wallet_switchEthereumChain"].includes(method)), "no signing requests");
  console.log("PASS realm: title, mouse/keyboard play, menus, dialogue, combat, bank, map, caskets, card, followers, region tour, save/restore");
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(outdir, { recursive: true, force: true });
}
