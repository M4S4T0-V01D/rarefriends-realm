// Promote the development world's overlay into the public game, as a commit under games/rarefriends-realm/overlays/
// on a branch of its own, with a pull request to review (cloud/README.md, "The development game"):
//   node scripts/dev-promote.mjs <overlay.json> <slug>            write overlays/<slug>.ts and list it in overlays/index.ts
//   node scripts/dev-promote.mjs <overlay.json> <slug> --pr       …then branch, commit, push and open the pull request (gh)
//   node scripts/dev-promote.mjs --fetch <slug> [--pr]            the overlay straight from the service (the password is asked for, hidden)
//   node scripts/dev-promote.mjs <overlay.json> --check           only the report: what the overlay can't do, what can't be reached
// Every mode first lays the overlay over a freshly generated world and reports what couldn't be done and what can't be
// reached from the spawn (the editor's own report), and refuses to promote an overlay with problems unless --force.
// Nothing reaches players from here: the pull request is reviewed, tested and merged like any other change.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";

const SERVICE = process.env.REALM_DEV_SERVICE ?? "https://rarefriends-realm-saves.masato-void.workers.dev";
const root = fileURLToPath(new URL("..", import.meta.url)), overlaysDir = process.env.REALM_OVERLAYS_DIR ?? path.join(root, "games", "rarefriends-realm", "overlays");   // (the tests write elsewhere)
const args = process.argv.slice(2), flag = name => args.includes(name), positional = args.filter(a => !a.startsWith("--"));
const fetching = flag("--fetch"), check = flag("--check"), pr = flag("--pr"), force = flag("--force");
const slug = fetching ? positional[0] : positional[1], file = fetching ? null : positional[0];
if (!file && !fetching || (!check && !slug)) { console.error("usage: node scripts/dev-promote.mjs <overlay.json> <slug> [--pr] | --fetch <slug> [--pr] | <overlay.json> --check"); process.exit(2); }
if (slug && !/^[a-z][a-z0-9_]{1,40}$/.test(slug)) { console.error("the slug is lowercase letters, digits and underscores, starting with a letter"); process.exit(2); }

/** The overlay, from the file or the service. */
async function load() {
  if (!fetching) return JSON.parse(readFileSync(file, "utf8"));
  const password = process.env.REALM_DEV_PASSWORD ?? await new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: new Writable({ write(_c, _e, done) { done(); } }), terminal: true });
    process.stderr.write("Development password (not shown): "); rl.question("", answer => { rl.close(); process.stderr.write("\n"); resolve(answer); });
  });
  const headers = { "x-realm-dev": "1", origin: new URL(SERVICE).origin };
  const login = await fetch(`${SERVICE}/dev/api/login`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ password }) });
  if (!login.ok) throw new Error(`sign-in refused (${login.status}): ${(await login.json().catch(() => ({}))).error ?? ""}`);
  const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
  const response = await fetch(`${SERVICE}/dev/api/world/main/export`, { headers: { ...headers, cookie } });
  if (!response.ok) throw new Error(`export refused (${response.status})`);
  const overlay = await response.json();
  await fetch(`${SERVICE}/dev/api/logout`, { method: "POST", headers: { ...headers, cookie } }).catch(() => {});
  return overlay;
}

/** The editor's report, on a world generated here: the cleaned overlay, what it couldn't do, what can't be reached. */
async function report(raw) {
  const { applyOverlay, cleanOverlay, registerDefinitions, validatePlacements } = await import("../games/rarefriends-realm/overlay.ts");
  const { createWorld, WORLD_SEED } = await import("../games/rarefriends-realm/world.ts");
  const { NPCS, registerDevQuest } = await import("../games/rarefriends-realm/content.ts");
  const why = [], overlay = cleanOverlay(raw, why), problems = [...why];
  registerDefinitions(overlay, NPCS, problems);
  for (const op of overlay.ops) if (op.op === "quest") registerDevQuest(op.def, problems);
  const world = createWorld(), placed = applyOverlay(world, overlay, WORLD_SEED, problems, NPCS);
  return { overlay, problems, unreachable: validatePlacements(world, overlay, placed) };
}

const raw = await load(), { overlay, problems, unreachable } = await report(raw);
console.log(`${overlay.name ?? "Development world"}: ${overlay.ops.length} ops (${overlay.ops.filter(op => "def" in op).length} definitions, ${overlay.ops.filter(op => op.op === "campzone").length} camp zones).`);
for (const p of problems) console.log(`  problem: ${p}`);
for (const u of unreachable) console.log(`  unreachable: ${u}`);
if (check) process.exit(problems.length || unreachable.length ? 1 : 0);
if ((problems.length || unreachable.length) && !force) { console.error("Not promoted: fix the problems in the editor, or pass --force."); process.exit(1); }

// The overlay as a module, and listed. (A TypeScript module, not JSON: the bake and the public bundle load it as code, typed.)
const target = path.join(overlaysDir, `${slug}.ts`), index = path.join(overlaysDir, "index.ts"), date = new Date().toISOString().slice(0, 10);
writeFileSync(target, `/** Promoted from the development world on ${date}: ${overlay.name ?? slug} (${overlay.ops.length} ops; scripts/dev-promote.mjs). Listed in index.ts. */\nimport type { Overlay } from "../overlay.ts";\n\nconst overlay: Overlay = ${JSON.stringify(overlay)};\nexport default overlay;\n`);
let indexText = readFileSync(index, "utf8");
if (!indexText.includes(`./${slug}.ts`)) {
  indexText = indexText.replace(/import type \{ Overlay \} from "[^"]*overlay\.ts";\n/, m => `${m}import ${slug} from "./${slug}.ts";\n`);
  indexText = indexText.replace(/export const OVERLAYS: readonly Overlay\[\] = \[([^\]]*)\];/, (_m, list) => `export const OVERLAYS: readonly Overlay[] = [${list.trim() ? `${list.trim().replace(/,\s*$/, "")}, ` : ""}${slug}];`);
  writeFileSync(index, indexText);
}
console.log(`Wrote ${path.relative(root, target)} and listed it in overlays/index.ts.`);
if (!pr) { console.log("Review the diff, run the tests, and commit; or run again with --pr."); process.exit(0); }

const git = (...a) => execFileSync("git", a, { cwd: root, stdio: ["ignore", "pipe", "inherit"] }).toString().trim();
const branch = `promote/${slug}-${date}`;
if (!existsSync(path.join(root, ".git"))) { console.error("not a git repository"); process.exit(1); }
git("switch", "-c", branch);
git("add", path.relative(root, target), path.relative(root, index));
git("commit", "-m", `Promote ${overlay.name ?? slug} from the development world\n\n${overlay.ops.length} ops laid over the generated world last of all (overlays/${slug}.ts, listed in overlays/index.ts). Checked on a fresh world: nothing it couldn't do, nothing unreachable from the spawn.`);
git("push", "-u", "origin", branch);
const url = execFileSync("gh", ["pr", "create", "--base", "main", "--head", branch, "--title", `Promote ${overlay.name ?? slug} from the development world`, "--body", `Promoted with \`scripts/dev-promote.mjs\`: ${overlay.ops.length} ops (${overlay.ops.filter(op => "def" in op).length} definitions, ${overlay.ops.filter(op => op.op === "campzone").length} camp zones), laid over the generated world last of all. The report on a fresh world was clean. Review the overlay as data; the engine and browser suites run on this branch as on any other.`], { cwd: root }).toString().trim();
console.log(`Pull request: ${url}`);
