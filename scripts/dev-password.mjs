// The owner's password for the private development game, hashed for the Worker (PBKDF2-SHA256; cloud/src/dev.ts):
//   node scripts/dev-password.mjs            (asks for the password, hidden)
// Then: cd cloud && npx wrangler secret put DEV_PASSWORD_HASH   and paste the line it prints. To rotate, run both again
// and POST /dev/api/logout-all (or press "Sign out everywhere" in the editor) so older sessions end.
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { hashPassword } from "../cloud/src/dev.ts";

const muted = new Writable({ write(_chunk, _encoding, done) { done(); } });
const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
process.stderr.write("Password (not shown): ");
rl.question("", async password => {
  rl.close(); process.stderr.write("\n");
  if (password.length < 12) { console.error("Use at least twelve characters."); process.exit(1); }
  console.log(await hashPassword(password));
});
