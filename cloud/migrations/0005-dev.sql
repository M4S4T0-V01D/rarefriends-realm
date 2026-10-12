-- The private development game (cloud/README.md, "The development game"). Apply once to a database made before it:
--   npx wrangler d1 execute rarefriends-realm-saves --remote --config cloud/wrangler.toml --file cloud/migrations/0005-dev.sql
CREATE TABLE IF NOT EXISTS dev_sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dev_logins (ip TEXT PRIMARY KEY, failures INTEGER NOT NULL, until INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dev_worlds (id TEXT PRIMARY KEY, overlay TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dev_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, world_id TEXT NOT NULL, version INTEGER NOT NULL, name TEXT, note TEXT, overlay TEXT NOT NULL, size INTEGER NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS dev_revisions_by_world ON dev_revisions (world_id, id);
CREATE TABLE IF NOT EXISTS dev_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
