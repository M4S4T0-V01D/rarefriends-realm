// Rendering mode, in the real game: Normal by default; switching to WebGL and back from Settings keeps the same
// character (state, inventory, XP, quests, place) with one draw loop and no GPU left behind, however often; WebGL plays;
// the choice survives a reload; a device without WebGL is told so and stays on Normal; a GPU that's lost mid-game falls
// back to Normal with nothing lost; and the address can choose WebGL for one visit (the old WebGL address does).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { createGameServer } from "@rarefriends/friendsdk/serve";
import { createArtworkFixture, installFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";

const outdir = await mkdtemp(join(tmpdir(), "realm-renderer-"));
await mkdir("./artifacts", { recursive: true });
let browser, server;
const errors = [];
process.on("exit", () => { if (errors.length) console.log("BROWSER ERRORS", errors.slice(0, 5)); });
try {
  execFileSync("node", ["scripts/build.mjs", "--outdir", join(outdir, "dist")], { stdio: "inherit" });
  server = createGameServer(join(outdir, "dist"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const artworkCall = await createArtworkFixture();
  browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

  /** A browser (its own storage), optionally one whose canvas can't make a WebGL2 context. */
  async function open(name, { noWebgl = false, context = null } = {}) {
    const ctx = context ?? await browser.newContext({ viewport: { width: 1320, height: 900 } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(40_000);
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    await installFixture(page, origin, { artworkCall });
    if (noWebgl) await page.addInitScript(() => { const real = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (kind, ...rest) { return kind === "webgl2" || kind === "webgl" ? null : real.call(this, kind, ...rest); }; });
    const game = page.frameLocator("iframe");
    const frame = () => page.frames().find(entry => entry !== page.mainFrame() && entry.url() !== "about:blank");
    const state = (fn, arg) => frame().evaluate(fn, arg);
    const rendering = () => state(() => window.__realm.rendering());
    const until = async (fn, what, timeout = 30_000) => { const end = Date.now() + timeout; while (Date.now() < end) { if (await fn()) return; await page.waitForTimeout(150); } assert.fail(`${name}: timed out waiting for ${what}`); };
    const enter = async (path = "/") => {
      await page.goto(`${origin}${path}`);
      await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
      await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
      await game.locator('.realm-game[data-phase="title"]').waitFor();
    };
    const begin = async () => {
      const go = game.getByRole("button", { name: /^(Begin|Continue) your adventure$/ });
      await go.click();
      const named = game.getByRole("dialog", { name: "Your Friend has arrived" });
      if (await named.isVisible({ timeout: 3000 }).catch(() => false)) { await game.getByLabel("Name").fill("Switcher"); await game.getByRole("button", { name: "Name my Friend" }).click(); }
      await game.locator('.realm-game[data-phase="playing"]').waitFor();
    };
    const openSettings = async () => {
      if (await game.locator(".realm-renderer").isVisible().catch(() => false)) return;
      await page.locator(".rf-game-frame").screenshot({ path: "./artifacts/renderer-debug.png" }).catch(() => undefined);
      await game.locator('[aria-label="Settings"]').first().click({ timeout: 30_000 }); await game.locator(".realm-renderer").waitFor();
    };
    const snapshot = () => state(() => { const g = window.__realm.game(), p = g.player; return JSON.stringify({ name: p.name, x: p.x, y: p.y, xp: p.xp, inv: p.inventory, quests: p.quests, bank: p.bank.length, tick: g.tick > 0 }); });
    return { page, ctx, game, state, rendering, until, enter, begin, openSettings, snapshot, shot: file => page.locator(".rf-game-frame").screenshot({ path: `./artifacts/${file}.png` }) };
  }

  // ---------- Normal by default; switching keeps the same game, one loop, no GPU left behind ----------
  const a = await open("first browser");
  await a.enter();
  let r = await a.rendering();
  assert.deepEqual([r.mode, r.gl, r.loops, r.alpha], ["normal", false, 1, false], "Normal by default: the canvas renderer alone, one loop, an opaque frame");
  await a.begin();
  await a.state(() => { const g = window.__realm.game(), p = g.player; p.xp.woodcutting = 37_224; p.inventory[0] = { id: "logs", n: 1 }; p.inventory[1] = { id: "pewter_axe", n: 1 }; p.quests.friends_feast = 1; window.__realm.refresh(); });
  const before = await a.snapshot();
  await a.openSettings();
  assert.equal(await a.game.getByRole("radio", { name: "Normal" }).getAttribute("aria-checked"), "true");
  await a.shot("renderer-settings-normal");
  await a.game.getByRole("radio", { name: "WebGL" }).click();
  await a.until(async () => (await a.rendering()).gl, "the GPU renderer");
  r = await a.rendering();
  assert.deepEqual([r.mode, r.gl, r.loops, r.alpha], ["webgl", true, 1, true], "WebGL: a GPU renderer, still one loop, a see-through top canvas");
  assert.equal(await a.snapshot(), before, "the same character, inventory, XP, quests and place after switching to WebGL");
  assert.equal(await a.game.getByRole("radio", { name: "WebGL" }).getAttribute("aria-checked"), "true");
  await a.page.waitForTimeout(800); await a.shot("renderer-settings-webgl");
  await a.game.getByRole("radio", { name: "Normal" }).click();
  await a.until(async () => !(await a.rendering()).gl, "the GPU let go");
  r = await a.rendering();
  assert.deepEqual([r.mode, r.gl, r.loops, r.alpha], ["normal", false, 1, false], "back to Normal: no GPU renderer, one loop");
  assert.equal(await a.snapshot(), before, "the same game after switching back");
  // Over and over: still one loop.
  for (let i = 0; i < 10; i++) { await a.state(mode => window.__realm.renderer(mode), i % 2 ? "normal" : "webgl"); await a.page.waitForTimeout(250); }
  await a.page.waitForTimeout(800);
  r = await a.rendering();
  assert.deepEqual([r.mode, r.loops, r.gl], ["normal", 1, false], `ten switches later: one loop, no GPU (${JSON.stringify(r)})`);
  // Two switches before the game has drawn again: the second one is the one that counts.
  await a.state(() => { window.__realm.renderer("webgl"); window.__realm.renderer("normal"); }); await a.page.waitForTimeout(800);
  r = await a.rendering();
  assert.deepEqual([r.mode, r.loops, r.gl], ["normal", 1, false], `a quick switch there and back stays back (${JSON.stringify(r)})`);
  assert.equal(await a.snapshot(), before);

  // ---------- WebGL plays: walking by clicking the world ----------
  await a.state(() => window.__realm.renderer("webgl"));
  await a.until(async () => (await a.rendering()).gl, "WebGL again");
  const start = await a.state(() => { const p = window.__realm.game().player; return { x: p.x, y: p.y }; });
  const box = await a.page.locator("iframe").boundingBox();
  await a.page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.42);
  await a.until(async () => { const p = await a.state(() => { const p = window.__realm.game().player; return { x: p.x, y: p.y }; }); return p.x !== start.x || p.y !== start.y; }, "walking in WebGL");
  await a.page.waitForTimeout(1200); await a.shot("renderer-webgl-playing");

  // ---------- The choice is remembered: a reload comes back in WebGL ----------
  await a.page.waitForTimeout(1500);
  assert.match(await a.page.evaluate(() => localStorage.getItem("rarefriends-realm:settings:v1") ?? ""), /"renderer":"webgl"/, "the host page keeps the setting");
  await a.enter();
  await a.until(async () => (await a.rendering()).mode === "webgl", "WebGL after a reload");
  await a.begin();
  await a.until(async () => (await a.rendering()).gl, "a GPU renderer after the reload");
  assert.equal(JSON.parse(await a.snapshot()).xp.woodcutting, 37_224, "the same character after the reload");

  // ---------- A GPU lost mid-game: back to Normal, nothing lost ----------
  const beforeLoss = await a.snapshot();
  await a.state(() => window.__realm.loseGl());
  await a.game.getByRole("dialog", { name: "WebGL stopped" }).waitFor();
  r = await a.rendering();
  assert.deepEqual([r.mode, r.gl, r.loops], ["normal", false, 1], "after losing the GPU: Normal, one loop");
  assert.equal(await a.snapshot(), beforeLoss);
  await a.shot("renderer-lost");
  await a.game.getByRole("button", { name: "Continue in Normal" }).click();

  // ---------- The address chooses WebGL for one visit (the old WebGL address), without changing the setting ----------
  await a.enter("/?renderer=webgl");
  await a.until(async () => (await a.rendering()).mode === "webgl", "WebGL from the address");
  await a.enter("/");
  await a.until(async () => (await a.rendering()).mode === "normal", "Normal again at the plain address", 15_000);

  // ---------- No WebGL on this device: told so, stays on Normal ----------
  // (The first browser is done: closed, so its title screen isn't drawing alongside the second on a small machine.)
  await a.page.context().close();
  const b = await open("no-WebGL browser", { noWebgl: true });
  await b.enter();
  await b.begin();
  const plain = await b.snapshot();
  await b.state(() => window.__realm.renderer("webgl"));
  await b.game.getByRole("dialog", { name: "WebGL isn't available" }).waitFor();
  r = await b.rendering();
  assert.deepEqual([r.mode, r.gl, r.loops], ["normal", false, 1], "without WebGL2: Normal, one loop");
  assert.equal(await b.snapshot(), plain, "nothing lost");
  await b.shot("renderer-unavailable");
  await b.game.getByRole("button", { name: "Continue in Normal" }).click();
  await b.openSettings();
  assert.equal(await b.game.getByRole("radio", { name: "WebGL" }).isDisabled(), true, "WebGL can't be chosen where it can't run");
  await b.game.getByText("This device doesn't support WebGL2, so the Realm stays on Normal.").waitFor();

  assert.deepEqual(errors, [], "browser errors");
  console.log("PASS rendering modes: Normal by default, switching both ways and ten times (one loop, same game), WebGL plays, remembered across a reload, a lost GPU and a device without WebGL fall back to Normal, the address's ?renderer=webgl");
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(outdir, { recursive: true, force: true });
}
