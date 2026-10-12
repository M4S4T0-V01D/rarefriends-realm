/**
 * The private development game: the Worker serves the same built game behind the owner's login, and keeps the
 * development world's overlay (games/rarefriends-realm/overlay.ts) with its revisions. Nothing here is linked from the
 * public site, and nothing here is reachable without a session made from the owner's password.
 *
 *   GET  /dev/                                   the login page, or (signed in) the development game (the built site, from the R2 bucket under dev-site/)
 *   POST /dev/api/login { password }             a session cookie (HttpOnly, Secure, SameSite=Strict, 12 h, sliding); 5 tries, then a wait
 *   POST /dev/api/logout                         ends this session;  POST /dev/api/logout-all  ends every session (rotate after a password change)
 *   GET  /dev/api/me                             { ok, expiresAt }
 *   GET  /dev/api/world/:id                      { overlay, version, updatedAt, revisions: n }
 *   PUT  /dev/api/world/:id { baseVersion, overlay, note? }   → { version } | 409 { version }   (a save; every save is also kept as a revision)
 *   GET  /dev/api/world/:id/revisions            the revisions, newest first (number, name, note, size, at)
 *   POST /dev/api/world/:id/revisions { name }   a named checkpoint of the current overlay
 *   POST /dev/api/world/:id/restore { revision } the overlay of that revision becomes the current one (the current one is kept as a revision first)
 *   POST /dev/api/world/:id/reset                back to the baseline: an empty overlay (the current one kept as a revision first)
 *   GET  /dev/api/world/:id/export               the overlay as a file, to commit under overlays/ (how content reaches the public game)
 *   GET  /dev/api/audit                          what was done, newest first
 *
 * Authorization is the session cookie; writes also need the `x-realm-dev: 1` header (a cross-site form can't send it,
 * and the cookie is SameSite=Strict besides). The password is never stored: PBKDF2-SHA256 (scripts/dev-password.mjs
 * makes the hash; `npx wrangler secret put DEV_PASSWORD_HASH`). Secrets never reach the browser.
 */
import type { Database } from "./worker.ts";
import type { Bucket } from "./cards.ts";

/** The built site lives in the bucket (scripts/dev-upload.mjs puts it there): a Worker's own assets are capped at 25 MiB a file, and the game is bigger. */
export type DevEnv = { DB: Database; DEV_PASSWORD_HASH?: string; bucket?: Bucket | null };
const TYPES: Record<string, string> = { html: "text/html; charset=utf-8", js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", json: "application/json", png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml", webm: "video/webm", mp4: "video/mp4", wasm: "application/wasm", ico: "image/x-icon" };
export const DEV_LIMITS = { sessionMs: 12 * 3_600_000, tries: 5, lockoutMs: 15 * 60_000, overlayBytes: 4_000_000, revisionsKeep: 200 } as const;
const COOKIE = "realm_dev";

const hex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
const unhex = (text: string) => new Uint8Array(text.match(/../g)!.map(h => parseInt(h, 16)));
const sha256 = async (text: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
/** PBKDF2-SHA256 of a password with a salt: the stored form is `pbkdf2$<iterations>$<salt hex>$<hash hex>`. */
/** (100,000 iterations: the most a Worker's WebCrypto allows for PBKDF2.) */
export async function hashPassword(password: string, saltHex = hex(crypto.getRandomValues(new Uint8Array(16))), iterations = 100_000) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(saltHex), iterations }, key, 256);
  return `pbkdf2$${iterations}$${saltHex}$${hex(bits)}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [kind, iterations, salt, hash] = stored.split("$");
  if (kind !== "pbkdf2" || !iterations || !salt || !hash) return false;
  const made = (await hashPassword(password, salt, Number(iterations))).split("$")[3];
  if (made.length !== hash.length) return false;
  let same = 0; for (let i = 0; i < made.length; i++) same |= made.charCodeAt(i) ^ hash.charCodeAt(i);
  return same === 0;
}

class HttpError extends Error { status: number; extra: Record<string, unknown>; constructor(status: number, message: string, extra: Record<string, unknown> = {}) { super(message); this.status = status; this.extra = extra; } }
const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", ...headers } });
const cookieOf = (request: Request) => request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? null;
const setCookie = (token: string, maxAge: number) => `${COOKIE}=${token}; Path=/dev; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const WORLD_ID = /^[a-z0-9-]{1,32}$/;

const LOGIN_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>RareFriends Realm · development</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#161616;color:#efede7;font:15px ui-monospace,Menlo,Consolas,monospace}form{display:grid;gap:10px;width:min(360px,90vw);padding:24px;border:2px solid #efede7;background:#1c1b1f}input,button{font:inherit;padding:8px 10px}input{background:#efede7;color:#161616;border:0}button{background:#e2c46a;color:#161616;border:0;cursor:pointer;font-weight:700}p{margin:0;opacity:.7}#why{color:#f0a050;min-height:1.2em}</style></head>
<body><form id="f"><b>RareFriends Realm · the development game</b><p>The owner's password. Nothing public lives here.</p><input id="p" type="password" autocomplete="current-password" placeholder="Password" required autofocus><button type="submit">Enter</button><span id="why"></span></form>
<script>document.getElementById("f").addEventListener("submit",async e=>{e.preventDefault();const why=document.getElementById("why");why.textContent="…";try{const r=await fetch("/dev/api/login",{method:"POST",headers:{"content-type":"application/json","x-realm-dev":"1"},body:JSON.stringify({password:document.getElementById("p").value})});const b=await r.json().catch(()=>({}));if(r.ok)location.reload();else why.textContent=b.error||("refused ("+r.status+")")}catch{why.textContent="couldn't reach the service"}});</script></body></html>`;

export function devRoutes(db: Database, env: DevEnv, clock: () => number) {
  const audit = (action: string, detail: string) => db.prepare("INSERT INTO dev_audit (at, action, detail) VALUES (?, ?, ?)").bind(clock(), action, detail.slice(0, 500)).run();
  async function session(request: Request): Promise<{ token: string; expiresAt: number }> {
    const token = cookieOf(request);
    if (!token || !/^[0-9a-f]{64}$/.test(token)) throw new HttpError(401, "sign in");
    const row = await db.prepare("SELECT expires_at FROM dev_sessions WHERE token_hash = ?").bind(await sha256(token)).first<{ expires_at: number }>();
    if (!row || row.expires_at < clock()) throw new HttpError(401, "sign in again");
    // Sliding: a session in use stays alive; one left alone ends.
    if (row.expires_at - clock() < DEV_LIMITS.sessionMs / 2) await db.prepare("UPDATE dev_sessions SET expires_at = ? WHERE token_hash = ?").bind(clock() + DEV_LIMITS.sessionMs, await sha256(token)).run();
    return { token, expiresAt: row.expires_at };
  }
  const writing = (request: Request) => { if (request.headers.get("x-realm-dev") !== "1") throw new HttpError(403, "not from the development game"); };
  const worldOf = (text: string) => { if (!WORLD_ID.test(text)) throw new HttpError(400, "bad world"); return text; };
  const current = (id: string) => db.prepare("SELECT overlay, version, updated_at FROM dev_worlds WHERE id = ?").bind(id).first<{ overlay: string; version: number; updated_at: number }>();
  const keepRevision = (id: string, version: number, overlay: string, name: string | null, note: string | null) => db.batch([
    db.prepare("INSERT INTO dev_revisions (world_id, version, name, note, overlay, size, at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, version, name, note, overlay, overlay.length, clock()),
    db.prepare("DELETE FROM dev_revisions WHERE world_id = ? AND name IS NULL AND id NOT IN (SELECT id FROM dev_revisions WHERE world_id = ? AND name IS NULL ORDER BY id DESC LIMIT ?)").bind(id, id, DEV_LIMITS.revisionsKeep),
  ]);
  const overlayText = (raw: unknown) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw) || (raw as { v?: unknown }).v !== 1 || !Array.isArray((raw as { ops?: unknown }).ops)) throw new HttpError(422, "not an overlay");
    const text = JSON.stringify(raw); if (text.length > DEV_LIMITS.overlayBytes) throw new HttpError(413, "the overlay is too large");
    return text;
  };

  async function route(request: Request, url: URL): Promise<Response | null> {
    const path = url.pathname, method = request.method;
    if (!path.startsWith("/dev")) return null;
    try {
      // ---------- Signing in ----------
      if (path === "/dev/api/login" && method === "POST") {
        writing(request);
        if (!env.DEV_PASSWORD_HASH) throw new HttpError(503, "the development game isn't set up (DEV_PASSWORD_HASH)");
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown", at = clock();
        const tries = await db.prepare("SELECT failures, until FROM dev_logins WHERE ip = ?").bind(ip).first<{ failures: number; until: number }>();
        if (tries && tries.until > at) throw new HttpError(429, "too many tries: wait a while", { retryAfterMs: tries.until - at });
        const body = await request.json().catch(() => null) as { password?: unknown } | null;
        const password = typeof body?.password === "string" && body.password.length <= 200 ? body.password : "";
        if (!password || !await verifyPassword(password, env.DEV_PASSWORD_HASH)) {
          const failures = (tries && tries.until > at - DEV_LIMITS.lockoutMs ? tries.failures : 0) + 1, until = failures >= DEV_LIMITS.tries ? at + DEV_LIMITS.lockoutMs : at;
          await db.prepare("INSERT INTO dev_logins (ip, failures, until) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET failures = excluded.failures, until = excluded.until").bind(ip, failures, until).run();
          await audit("login-failed", ip);
          throw new HttpError(401, failures >= DEV_LIMITS.tries ? "too many tries: wait a while" : "that isn't the password");
        }
        const token = randomToken();
        await db.batch([
          db.prepare("DELETE FROM dev_logins WHERE ip = ?").bind(ip),
          db.prepare("DELETE FROM dev_sessions WHERE expires_at < ?").bind(at),
          db.prepare("INSERT INTO dev_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), at, at + DEV_LIMITS.sessionMs),
        ]);
        await audit("login", ip);
        return json(200, { ok: true, expiresAt: at + DEV_LIMITS.sessionMs }, { "set-cookie": setCookie(token, DEV_LIMITS.sessionMs / 1000) });
      }
      if (path === "/dev/api/logout" && method === "POST") { writing(request); const { token } = await session(request); await db.prepare("DELETE FROM dev_sessions WHERE token_hash = ?").bind(await sha256(token)).run(); await audit("logout", ""); return json(200, { ok: true }, { "set-cookie": setCookie("", 0) }); }
      if (path === "/dev/api/logout-all" && method === "POST") { writing(request); await session(request); await db.prepare("DELETE FROM dev_sessions").bind().run(); await audit("logout-all", ""); return json(200, { ok: true }, { "set-cookie": setCookie("", 0) }); }
      if (path === "/dev/api/me" && method === "GET") { const { expiresAt } = await session(request); return json(200, { ok: true, expiresAt }); }
      if (path === "/dev/api/audit" && method === "GET") {
        await session(request);
        const rows = await db.prepare("SELECT at, action, detail FROM dev_audit ORDER BY id DESC LIMIT 200").bind().all<{ at: number; action: string; detail: string }>();
        return json(200, { audit: rows.results });
      }
      // ---------- The development world ----------
      const world = /^\/dev\/api\/world\/([^/]+)(\/revisions|\/restore|\/reset|\/export)?$/.exec(path);
      if (world) {
        await session(request);
        const id = worldOf(world[1]), part = world[2] ?? "";
        if (part === "" && method === "GET") {
          const row = await current(id), count = await db.prepare("SELECT COUNT(*) AS n FROM dev_revisions WHERE world_id = ?").bind(id).first<{ n: number }>();
          return json(200, { overlay: row ? JSON.parse(row.overlay) : { v: 1, name: "Development world", ops: [] }, version: row?.version ?? 0, updatedAt: row?.updated_at ?? null, revisions: count?.n ?? 0 });
        }
        if (part === "" && method === "PUT") {
          writing(request);
          const body = await request.json().catch(() => null) as { baseVersion?: unknown; overlay?: unknown; note?: unknown } | null;
          if (!body || typeof body.baseVersion !== "number") throw new HttpError(400, "bad save");
          const text = overlayText(body.overlay), note = typeof body.note === "string" ? body.note.slice(0, 200) : null, row = await current(id), at = clock();
          if ((row?.version ?? 0) !== body.baseVersion) throw new HttpError(409, "the development world moved on: load it again", { version: row?.version ?? 0 });
          const version = body.baseVersion + 1;
          const results = await db.batch([
            row ? db.prepare("UPDATE dev_worlds SET overlay = ?, version = ?, updated_at = ? WHERE id = ? AND version = ?").bind(text, version, at, id, body.baseVersion)
              : db.prepare("INSERT INTO dev_worlds (id, overlay, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(id, text, version, at, at),
          ]);
          if (!results[0]?.meta.changes) throw new HttpError(409, "the development world moved on: load it again", { version: (await current(id))?.version ?? 0 });
          await keepRevision(id, version, text, null, note);
          await audit("save", `${id} v${version} ${text.length} bytes${note ? ` · ${note}` : ""}`);
          return json(200, { version, updatedAt: at });
        }
        if (part === "/revisions" && method === "GET") {
          const rows = await db.prepare("SELECT id, version, name, note, size, at FROM dev_revisions WHERE world_id = ? ORDER BY id DESC LIMIT 300").bind(id).all<{ id: number; version: number; name: string | null; note: string | null; size: number; at: number }>();
          return json(200, { revisions: rows.results });
        }
        if (part === "/revisions" && method === "POST") {
          writing(request);
          const body = await request.json().catch(() => null) as { name?: unknown } | null, row = await current(id);
          if (!row) throw new HttpError(404, "nothing saved yet");
          const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : `Checkpoint ${new Date(clock()).toISOString().slice(0, 16)}`;
          await keepRevision(id, row.version, row.overlay, name, null); await audit("checkpoint", `${id} v${row.version} ${name}`);
          return json(200, { ok: true, name });
        }
        if ((part === "/restore" || part === "/reset") && method === "POST") {
          writing(request);
          const row = await current(id), at = clock();
          let text = JSON.stringify({ v: 1, name: "Development world", ops: [] }), what = "reset";
          if (part === "/restore") {
            const body = await request.json().catch(() => null) as { revision?: unknown } | null;
            if (!body || typeof body.revision !== "number") throw new HttpError(400, "bad revision");
            const old = await db.prepare("SELECT overlay, version, name FROM dev_revisions WHERE id = ? AND world_id = ?").bind(body.revision, id).first<{ overlay: string; version: number; name: string | null }>();
            if (!old) throw new HttpError(404, "no such revision");
            text = old.overlay; what = `restore revision ${body.revision} (v${old.version}${old.name ? ` ${old.name}` : ""})`;
          }
          const version = (row?.version ?? 0) + 1;
          if (row) await keepRevision(id, row.version, row.overlay, `Before ${what}`, null);
          await db.prepare(row ? "UPDATE dev_worlds SET overlay = ?, version = ?, updated_at = ? WHERE id = ?" : "INSERT INTO dev_worlds (overlay, version, updated_at, id, created_at) VALUES (?, ?, ?, ?, ?)").bind(...(row ? [text, version, at, id] : [text, version, at, id, at])).run();
          await audit(part.slice(1), `${id} v${version} ${what}`);
          return json(200, { version, overlay: JSON.parse(text) });
        }
        if (part === "/export" && method === "GET") {
          const row = await current(id); if (!row) throw new HttpError(404, "nothing saved yet");
          await audit("export", `${id} v${row.version}`);
          return new Response(row.overlay, { status: 200, headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${id}.overlay.json"`, "cache-control": "no-store" } });
        }
      }
      if (path.startsWith("/dev/api/")) throw new HttpError(404, "not found");
      // ---------- The game itself: the built site, behind the login ----------
      try { await session(request); }
      catch { return path === "/dev" || path === "/dev/" || path === "/dev/index.html" ? new Response(LOGIN_PAGE, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } }) : json(401, { error: "sign in" }); }
      if (!env.bucket) throw new HttpError(503, "the development game isn't uploaded (scripts/dev-upload.mjs)");
      const file = (path === "/dev" || path === "/dev/" ? "index.html" : path.slice(5)).replace(/^\/+/, "");
      if (!/^[A-Za-z0-9._-]+$/.test(file)) throw new HttpError(404, "not found");
      const object = await env.bucket.get(`dev-site/${file}`);
      if (!object) throw new HttpError(404, "not found");
      const type = object.httpMetadata?.contentType ?? TYPES[file.split(".").pop() ?? ""] ?? "application/octet-stream";
      return new Response(await object.arrayBuffer(), { status: 200, headers: { "content-type": type, "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message, ...error.extra });
      console.error(error); return json(500, { error: "the development service had a problem" });
    }
  }
  return route;
}
