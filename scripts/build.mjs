// Build (or, with --dev, watch and serve) RareFriends Realm: the SDK CLI builds the sandboxed game and its
// runtime page, then host/runtime.tsx replaces the runtime page's script with the save- and roster-aware host.
import { context } from "esbuild";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildGame } from "@rarefriends/friendsdk/build";
import { createGameServer } from "@rarefriends/friendsdk/serve";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const game = path.join(root, "games/rarefriends-realm");
const args = process.argv.slice(2), option = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
// --dev-tools: the private development game's site (cloud/dev-site, served by the Worker behind the owner's login): the same
// game build, with the host page carrying the editor (host/editor.tsx). The public build never carries it.
const dev = args.includes("--dev"), devTools = args.includes("--dev-tools"), outdir = path.resolve(option("--outdir") ?? (devTools ? path.join(root, "cloud/dev-site") : path.join(game, ".friendsdk")));

const build = await buildGame(game, { outdir, watch: dev });
// The world, baked in front of the game's script, so players don't wait for it to be generated (games/rarefriends-realm/
// bake.ts). The dev server rebuilds the script as you edit, so it generates the world instead.
if (!dev) {
  const { generateWorld, WORLD_SEED } = await import(pathToFileURL(path.join(game, "world.ts")).href);
  const { bakeWorld } = await import(pathToFileURL(path.join(game, "bake.ts")).href);
  // (The development site bakes the world without the deployed overlay: its editor lays the whole development world over it, so it would land twice.)
  const { world, lift, raise } = generateWorld(WORLD_SEED, { overlays: !devTools }), script = path.join(outdir, "game.js");
  // (In single quotes: JSON is full of double quotes, and escaping each one would add a sixth to the download.)
  const literal = bakeWorld(world, lift, WORLD_SEED, raise).replace(/[\\']/g, ch => `\\${ch}`).replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  await writeFile(script, `globalThis.__REALM_WORLD__='${literal}';\n${await readFile(script, "utf8")}`);
}
const host = await context({
  entryPoints: [path.join(root, "host/runtime.tsx")], outfile: path.join(outdir, "runtime.js"),
  bundle: true, format: "iife", platform: "browser", target: "es2022", jsx: "automatic", minify: true, logLevel: "warning",
  // A preview build, like the SDK's own: the runtime's live RF transfers, approvals and signing compile out (FriendSDK v0.1.4).
  define: { "process.env.NODE_ENV": '"production"', "globalThis.__FRIENDSDK_LIVE__": "false", "globalThis.__REALM_DEV__": devTools ? "true" : "false" },
  alias: { react: path.dirname(require.resolve("react/package.json")), "react-dom": path.dirname(require.resolve("react-dom/package.json")) },
});
await host.rebuild();
if (!dev) {
  await host.dispose();
  console.log(`Built ${outdir}`);
} else {
  await host.watch();
  const port = Number(option("--port") ?? 4173), hostname = option("--host") ?? "127.0.0.1";
  const server = createGameServer(outdir);
  server.listen(port, hostname, () => console.log(`RareFriends Realm: http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}  (Ctrl+C to stop)`));
  const stop = async () => { server.close(); await host.dispose(); await build.close(); process.exit(0); };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
}
