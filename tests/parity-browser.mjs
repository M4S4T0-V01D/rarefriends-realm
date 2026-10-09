// Rendering parity: the same scenes, on a frozen clock, drawn by any build of the game in either rendering mode, for
// comparing pictures (Normal against the build before the WebGL merge must match; WebGL may differ in how it looks,
// never in what's there). Writes PARITY_OUT/<scene>.png (the world's canvas, the GPU's picture under it in WebGL).
//   PARITY_DIST=<built dist> PARITY_OUT=<dir> PARITY_MODE=normal|webgl node tests/parity-browser.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createGameServer } from "@rarefriends/friendsdk/serve";
import { createArtworkFixture, installFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";

const dist = process.env.PARITY_DIST, out = process.env.PARITY_OUT, mode = process.env.PARITY_MODE ?? "normal";
await mkdir(out, { recursive: true });
const SCENES = [
  // name, place (world.places key), dx, dy, time of day (0 midnight, 0.5 noon), zoom, pitch, angle
  ["square-noon", "hollow_square", 0, 0, 0.5, 0.8, 0.5, 0],
  ["square-night", "hollow_square", 2, 1, 0.92, 1.0, 0.5, 0],
  ["fernwick-dusk", "fernwick", 0, 2, 0.74, 0.9, 0.55, 0.4],
  ["frostpeak", "frostpeak", 0, 0, 0.45, 0.8, 0.5, 0],
  ["oasis", "oasis", 0, 0, 0.55, 0.8, 0.5, -0.5],
  ["raria", "raria", 0, 3, 0.6, 0.7, 0.5, 0],
  ["emberforge", "emberforge", 0, 0, 0.35, 1.1, 0.55, 0.3],
  ["zoomed-out", "spawn", 0, 0, 0.5, 0.55, 0.42, 0.2],
];
let browser, server;
try {
  server = createGameServer(dist);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1320, height: 900 } });
  page.setDefaultTimeout(60_000);
  await installFixture(page, origin, { artworkCall: await createArtworkFixture() });
  // A virtual clock in the game frame: nothing moves between pictures except what a step moves.
  await page.addInitScript(() => {
    if (window === window.top) return;
    const realPerf = performance.now.bind(performance), realDate = Date.now, realRaf = window.requestAnimationFrame.bind(window);
    let virtual = null; const queue = [];
    performance.now = () => virtual ? virtual.perf : realPerf();
    Date.now = () => virtual ? virtual.date : realDate();
    Math.random = (() => { let seed = 12345; return () => (seed = (seed * 16807) % 2147483647) / 2147483647; })();
    window.requestAnimationFrame = cb => { if (virtual) { queue.push(cb); return queue.length; } return realRaf(cb); };
    window.__clock = { start(date) { virtual = { perf: 100000, date: date ?? Date.UTC(2026, 9, 9, 12) }; }, step(ms) { virtual.perf += ms; virtual.date += ms; for (const cb of queue.splice(0)) cb(virtual.perf); } };
  });
  const game = page.frameLocator("iframe"), frame = () => page.frames().find(entry => entry !== page.mainFrame() && entry.url() !== "about:blank");
  await page.goto(`${origin}/${mode === "webgl" ? "?renderer=webgl" : ""}`);
  await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
  await game.locator('.realm-game[data-phase="title"]').waitFor();
  await game.getByRole("button", { name: "Begin your adventure" }).click();
  { const later = game.getByRole("button", { name: /^Later/ }); if (await later.isVisible({ timeout: 4000 }).catch(() => false)) await later.click(); }
  await game.locator('.realm-game[data-phase="playing"]').waitFor();
  if (mode === "webgl") await page.waitForFunction(() => true);
  const rendering = await frame().evaluate(() => window.__realm.rendering?.() ?? { mode: "normal", gl: false });
  assert.equal(rendering.mode ?? "normal", mode, "the build draws in the mode asked for");
  if (mode === "webgl") assert.equal(rendering.gl, true, "a live GPU renderer in WebGL mode");
  await frame().evaluate(() => { const g = window.__realm.game(); g.friendSpeech = "off"; window.__realm.weather({ rain: 0, storm: false, fog: 0 }); window.__realm.graphics("high"); document.querySelector(".realm-side-toggle")?.click(); window.__clock.start(); });
  for (const [name, place, dx, dy, time, zoom, pitch, angle] of SCENES) {
    await frame().evaluate(([place, dx, dy, time, zoom, pitch, angle]) => {
      const g = window.__realm.game(), p = g.player, at = g.world.places[place];
      p.x = at.x + dx; p.y = at.y + dy; p.prev = { x: p.x, y: p.y }; p.path = []; p.target = null; p.activity = null; p.combat = null;
      for (const m of g.monsters) { m.wander = 0; }
      window.__realm.time(time); window.__realm.view(zoom, pitch, angle); window.__realm.refresh();
    }, [place, dx, dy, time, zoom, pitch, angle]);
    // Let the camera arrive (sixty frames on the frozen clock), then turn a hair and back, so the ground's cache is
    // painted afresh where the camera stands (its path there differs with the frame rate; the picture shouldn't).
    for (let i = 0; i < 60; i++) await frame().evaluate(() => window.__clock.step(1000 / 30));
    await frame().evaluate(([zoom, pitch, angle]) => window.__realm.view(zoom, pitch, angle + 0.002), [zoom, pitch, angle]);
    for (let i = 0; i < 3; i++) await frame().evaluate(() => window.__clock.step(1000 / 30));
    await frame().evaluate(([zoom, pitch, angle]) => window.__realm.view(zoom, pitch, angle), [zoom, pitch, angle]);
    for (let i = 0; i < 12; i++) await frame().evaluate(() => window.__clock.step(1000 / 30));
    const data = await frame().evaluate(() => {
      const gl = document.querySelector(".realm-game canvas.realm-gl"), view = document.querySelector(".realm-game canvas.realm-view"), c = document.createElement("canvas");
      c.width = view.width; c.height = view.height; const x = c.getContext("2d");
      if (gl && gl.style.visibility !== "hidden") x.drawImage(gl, 0, 0, c.width, c.height);
      x.drawImage(view, 0, 0); return c.toDataURL("image/png");
    });
    await writeFile(`${out}/${name}.png`, Buffer.from(data.split(",")[1], "base64"));
  }
  console.log(`parity: ${SCENES.length} scenes in ${mode} → ${out}`);
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
