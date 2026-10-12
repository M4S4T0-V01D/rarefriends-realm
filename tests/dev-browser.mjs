// The private development game, end to end in a browser: the development site (npm run build:dev) is the public game
// with the editor beside it; the editor's overlay reaches the game, which rebuilds its world with it; edit mode turns a
// click into a report instead of an action; and the public build carries none of it. The Worker's login is tested in
// tests/cloud.test.mjs; here the site is served plainly, as the Worker serves it to a signed-in owner.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { createGameServer } from "@rarefriends/friendsdk/serve";
import { installFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";
import { decodeFunctionData, encodeFunctionResult } from "viem";
import { FAMILIES_REGISTRY_ABI, GENERATION_SPRITE_MANIFEST } from "@rarefriends/friendsdk/sprites";
import { REGULAR_SPRITES } from "../games/rarefriends-realm/regulars.ts";

// The Friend's art, as the other browser suites answer it.
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

const outdir = await mkdtemp(join(tmpdir(), "realm-dev-"));
let browser, server;
try {
  execFileSync("node", ["scripts/build.mjs", "--dev-tools", "--outdir", join(outdir, "dist")], { stdio: "ignore" });
  const runtime = await readFile(join(outdir, "dist", "runtime.js"), "utf8");
  assert.ok(runtime.includes("Development editor") && runtime.includes("/dev/api"), "the development host carries the editor");
  server = createGameServer(join(outdir, "dist"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1320, height: 900 } }), page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await installFixture(page, origin, { artworkCall });
  // The editor's service calls are answered here (the Worker isn't running): an empty world to load, saves accepted.
  // (Registered after the fixture's routes, so it's asked first.)
  let saved = null;
  await page.route(/\/dev\/api\//, async route => {
    const url = new URL(route.request().url()), method = route.request().method();
    if (url.pathname.endsWith("/world/main") && method === "GET") return route.fulfill({ json: { overlay: { v: 1, name: "Test", ops: [] }, version: 3, updatedAt: null, revisions: 0 } });
    if (url.pathname.endsWith("/world/main") && method === "PUT") { saved = route.request().postDataJSON(); return route.fulfill({ json: { version: saved.baseVersion + 1, updatedAt: Date.now() } }); }
    if (url.pathname.endsWith("/revisions")) return route.fulfill({ json: { revisions: [] } });
    console.log("unexpected development call", method, url.pathname); return route.fulfill({ status: 404, json: { error: "not found" } });
  });
  await page.goto(`${origin}/`);
  await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
  const game = page.frameLocator("iframe");
  await game.locator('.realm-game[data-phase="title"]').waitFor();
  const editor = page.getByRole("complementary", { name: "Development editor" });
  await editor.waitFor();
  await editor.getByText(/Loaded v3/).waitFor();
  const frame = () => page.frames().find(entry => entry !== page.mainFrame() && entry.url().includes("dev=1"));
  assert.ok(frame(), "the frame is opened as a development frame");
  await game.getByRole("button", { name: "Begin your adventure" }).click();
  await game.locator('.realm-game[data-phase="playing"]').waitFor();
  { const later = game.getByRole("button", { name: /^Later/ }); if (await later.count()) await later.first().click(); }
  // An overlay from the editor reaches the game: an oak beside the spawn, and the world rebuilt with it.
  const spawn = await frame().evaluate(() => window.__realm.game().world.places.spawn);
  const before = await frame().evaluate(() => window.__realm.game().world.objects.length);
  await page.evaluate(([x, y]) => { for (const fr of document.querySelectorAll("iframe")) fr.contentWindow.postMessage({ type: "rarefriends-realm:dev-world", overlay: { v: 1, ops: [{ op: "object", uid: "oak1", kind: "tree", tree: "oak", x, y }] } }, "*"); }, [spawn.x + 3, spawn.y]);
  await frame().waitForFunction(([x, y]) => { const g = window.__realm?.game(); return !!g && g.world.objects.some(o => o.x === x && o.y === y && o.tree === "oak"); }, [spawn.x + 3, spawn.y]);
  const after = await frame().evaluate(() => window.__realm.game().world.objects.length);
  assert.ok(after >= before, "the world was rebuilt from the bake with the overlay");
  await editor.getByText(/1 ops applied/).waitFor();
  // Edit mode: a click on the canvas reports what's under it instead of walking; play mode again walks.
  await editor.getByRole("button", { name: /Play mode \(F2: edit\)/ }).click();
  await editor.getByRole("button", { name: /Edit mode \(F2: play\)/ }).waitFor();
  const box = await game.locator("canvas.realm-view").boundingBox();
  await page.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20);
  await editor.getByText(/tile \w+ · lift/).waitFor();
  // The place tool: an oak where the click lands, then saved with the version the world was loaded at.
  await editor.getByRole("button", { name: "Place thing" }).click();
  await editor.getByRole("combobox").first().selectOption("tree");
  await editor.getByRole("combobox").nth(1).selectOption("oak");
  await page.mouse.click(box.x + box.width / 2 - 60, box.y + box.height / 2 + 40);
  await editor.getByText(/Placed oak at/).waitFor();
  await editor.getByRole("button", { name: "Save" }).click();
  await editor.getByText(/Saved v4/).waitFor();
  assert.equal(saved.baseVersion, 3); assert.ok(saved.overlay.ops.some(op => op.op === "object" && op.tree === "oak"), "the placed oak is in the saved overlay");
  // Undo takes it back (the game rebuilds again).
  await editor.getByRole("button", { name: "Undo" }).click();
  await editor.getByText(/Undone/).waitFor();
  console.log("PASS development game: the editor beside the public build, overlays applied and saved, edit mode picking, undo");
  assert.deepEqual(errors, [], "no page errors");
  // The public build: nothing of the editor in it.
  execFileSync("node", ["scripts/build.mjs", "--outdir", join(outdir, "public")], { stdio: "ignore" });
  const publicRuntime = await readFile(join(outdir, "public", "runtime.js"), "utf8");
  for (const marker of ["Development editor", "/dev/api", "game.html?dev=1"]) assert.ok(!publicRuntime.includes(marker), `the public host has no ${marker}`);
  console.log("PASS the public host carries nothing of the development game");
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(outdir, { recursive: true, force: true });
}
