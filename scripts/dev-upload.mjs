// Put the development site (cloud/dev-site, from npm run build:dev) in the Worker's bucket under dev-site/, where
// cloud/src/dev.ts serves it behind the owner's login. (A Worker's own assets are capped at 25 MiB a file; the game is bigger.)
//   npm run dev:upload
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)), site = path.join(root, "cloud", "dev-site");
const TYPES = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml" };
for (const file of readdirSync(site)) {
  const full = path.join(site, file); if (!statSync(full).isFile()) continue;
  const type = TYPES[file.split(".").pop()] ?? "application/octet-stream";
  execFileSync("npx", ["wrangler", "r2", "object", "put", `rarefriends-realm-nft/dev-site/${file}`, "--file", full, "--content-type", type, "--remote", "--config", path.join(root, "cloud", "wrangler.toml")], { stdio: "inherit" });
  console.log("uploaded", file, statSync(full).size, "bytes");
}
