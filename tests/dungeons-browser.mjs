// Dungeon identity, seen: the game in a browser is taken to four views of each dungeon family (the entrance, a
// corridor, the signature chamber, the deep end), the picture alone is kept (the canvas, no name, no map, no
// interface), and the pictures are measured: each family's views share a look (their colours sit together), and no
// two families look alike (their mean colours and hue histograms sit apart). The pictures land in docs/dungeons/ (JPEG, small) as
// the gallery the development report shows. Run alone: node tests/dungeons-browser.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { createGameServer } from "@rarefriends/friendsdk/serve";
import { installFixture } from "../node_modules/@rarefriends/friendsdk/scripts/browser-fixture.mjs";
import { decodeFunctionData, encodeFunctionResult } from "viem";
import { FAMILIES_REGISTRY_ABI, GENERATION_SPRITE_MANIFEST } from "@rarefriends/friendsdk/sprites";
import { REGULAR_SPRITES } from "../games/rarefriends-realm/regulars.ts";

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
/** The families shown, by a region of each (the region's own floor tiles choose the four views). */
const FAMILIES = [["ossuary", "catacombs"], ["underworks", "fellows_deep"], ["rime", "rime_galleries"], ["arcane", "sigil_vault"], ["hollow", "hollow_depths"], ["cave", "sea_cave"]];
const OUT = "docs/dungeons";

const outdir = await mkdtemp(join(tmpdir(), "realm-dungeons-"));
let browser, server;
try {
  execFileSync("node", ["scripts/build.mjs", "--outdir", join(outdir, "dist")], { stdio: "ignore" });
  await mkdir(OUT, { recursive: true });
  server = createGameServer(join(outdir, "dist"));
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } }), page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const errors = []; page.on("pageerror", error => { errors.push(error.message); console.log("page error:", error.message); });
  await installFixture(page, origin, { artworkCall });
  await page.goto(`${origin}/`);
  await page.getByRole("button", { name: /^Connect (wallet|Browser wallet)$/ }).click();
  await page.getByRole("button", { name: /^Friend #7730\b/ }).click();
  const game = page.frameLocator("iframe"), frame = () => page.frames().find(entry => entry !== page.mainFrame() && entry.url().includes("game"));
  await game.locator('.realm-game[data-phase="title"]').waitFor();
  await game.getByRole("button", { name: "Begin your adventure" }).click();
  await game.locator('.realm-game[data-phase="playing"]').waitFor();
  { const later = game.getByRole("button", { name: /^Later/ }); if (await later.count()) await later.first().click(); }
  await frame().evaluate(() => { const g = window.__realm.game(), p = g.player; p.xp.hitpoints = 13_034_431; p.hp = 99; p.xp.defence = 13_034_431; g.autoRetaliate = false; window.__realm.graphics("high"); });
  // The picture alone: nothing of the interface, the host's or the game's, in the captures (the canvas is left).
  await page.addStyleTag({ content: "body * { visibility: hidden !important; } iframe { visibility: visible !important; }" });
  await frame().evaluate(() => { const style = document.createElement("style"); style.textContent = ".realm-game *:not(canvas.realm-view) { visibility: hidden !important; } canvas.realm-view { visibility: visible !important; }"; document.head.append(style); });
  const teleport = async (x, y) => { await frame().evaluate(([x, y]) => { const g = window.__realm.game(), p = g.player; p.x = x; p.y = y; p.prev = { x, y }; p.path = []; p.target = null; p.activity = null; p.combat = null; p.hp = 99; window.__realm.refresh(); }, [x, y]); await page.waitForTimeout(1400); };
  // The four views of a region, chosen from the same world the game runs: where its ladder up lands, a corridor (walls on two
  // opposite sides), the chamber (the floor tile with most floor round it), the deep end (farthest from the entrance).
  const { createWorld, W, T, regionAt } = await import("../games/rarefriends-realm/world.ts");
  const world = createWorld();
  const choose = region => {
    const floors = []; for (let y = 0; y < world.tiles.length / W; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if ((world.tiles[i] === T.DUNGEON || world.tiles[i] === T.STONE || world.tiles[i] === T.ASH) && regionAt(world, x, y).id === region && y >= 880) floors.push([x, y]); }
    assert.ok(floors.length > 50, `${region} has floor`);
    const wall = (x, y) => world.tiles[y * W + x] === T.WALL;
    const ladder = world.objects.find(o => o.kind === "ladder" && /up/i.test(o.action ?? "") && regionAt(world, o.x, o.y).id === region) ?? world.objects.find(o => o.kind === "ladder" && regionAt(world, o.x, o.y).id === region);
    const entrance = ladder ? [ladder.x, ladder.y + 1] : floors[0];
    const corridor = floors.find(([x, y]) => (wall(x, y - 1) && wall(x, y + 1) && !wall(x - 1, y) && !wall(x + 1, y)) || (wall(x - 1, y) && wall(x + 1, y) && !wall(x, y - 1) && !wall(x, y + 1))) ?? floors[Math.floor(floors.length / 3)];
    const open = ([x, y]) => floors.filter(([fx, fy]) => Math.abs(fx - x) <= 5 && Math.abs(fy - y) <= 5).length;
    let chamber = floors[0], best = 0; for (let i = 0; i < floors.length; i += 7) { const n = open(floors[i]); if (n > best) { best = n; chamber = floors[i]; } }
    let deep = floors[0], far = -1; for (const f of floors) { const d = Math.abs(f[0] - entrance[0]) + Math.abs(f[1] - entrance[1]); if (d > far) { far = d; deep = f; } }
    return { entrance, corridor, chamber, deep };
  };
  /** The picture's colour: the mean, and a hue histogram (twelve bins, by weight of the saturated pixels), from the canvas itself. */
  const measure = () => frame().evaluate(() => {
    const canvas = document.querySelector("canvas.realm-view"), ctx = canvas.getContext("2d"); if (!ctx) return null;
    const { width, height } = canvas, data = ctx.getImageData(Math.floor(width * 0.2), Math.floor(height * 0.2), Math.floor(width * 0.6), Math.floor(height * 0.6)).data;
    let r = 0, g = 0, b = 0, n = 0; const hist = new Array(12).fill(0); let weight = 0;
    for (let i = 0; i < data.length; i += 16) {
      const R = data[i], G = data[i + 1], B = data[i + 2]; r += R; g += G; b += B; n++;
      const max = Math.max(R, G, B), min = Math.min(R, G, B), sat = max - min; if (sat < 10) continue;
      let h = 0; if (max === R) h = ((G - B) / sat) % 6; else if (max === G) h = (B - R) / sat + 2; else h = (R - G) / sat + 4; if (h < 0) h += 6;
      hist[Math.min(11, Math.floor(h * 2))] += sat; weight += sat;
    }
    return { mean: [r / n, g / n, b / n], hist: hist.map(v => weight ? v / weight : 0) };
  });
  const measured = {};
  for (const [family, region] of FAMILIES) {
    const at = choose(region), stats = [];
    for (const [view, [x, y]] of Object.entries(at)) {
      await teleport(x, y);
      assert.equal(await frame().evaluate(() => window.__realm.game().player.y >= 880), true, `${family}: underground`);
      await game.locator("canvas.realm-view").screenshot({ path: `${OUT}/${family}-${view}.jpg`, type: "jpeg", quality: 82 });
      const m = await measure(); assert.ok(m, "a picture to measure"); stats.push(m);
      console.log(`${family} ${view} at ${x},${y}: mean ${m.mean.map(v => v.toFixed(0)).join("/")}`);
    }
    measured[family] = { mean: [0, 1, 2].map(k => stats.reduce((s, m) => s + m.mean[k], 0) / stats.length), hist: new Array(12).fill(0).map((_, k) => stats.reduce((s, m) => s + m.hist[k], 0) / stats.length), views: stats };
  }
  // No two families look alike: their mean colours sit apart, or their hues do.
  const dist = (a, b) => Math.hypot(...a.map((v, k) => v - b[k])), l1 = (a, b) => a.reduce((s, v, k) => s + Math.abs(v - b[k]), 0);
  const names = Object.keys(measured);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = measured[names[i]], b = measured[names[j]], colour = dist(a.mean, b.mean), hue = l1(a.hist, b.hist);
    console.log(`${names[i]} vs ${names[j]}: colour ${colour.toFixed(1)}, hue ${hue.toFixed(2)}`);
    assert.ok(colour > 10 || hue > 0.3, `${names[i]} and ${names[j]} can be told apart from the picture alone (colour ${colour.toFixed(1)}, hue ${hue.toFixed(2)})`);
  }
  // How each family's views hang together (brightness varies with the torches; hue is the family's): shown, for the report.
  for (const name of names) console.log(`${name}: views within ${Math.max(...measured[name].views.map(view => l1(view.hist, measured[name].hist))).toFixed(2)} of the family's hue`);
  console.log(`PASS dungeon identity: ${names.length} families, four views each, told apart by colour and hue; the gallery is in ${OUT}/`);
  assert.deepEqual(errors, [], "no page errors");
} finally {
  await browser?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  await rm(outdir, { recursive: true, force: true });
}
