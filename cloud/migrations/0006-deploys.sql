-- The dashboard's Deploy button (cloud/src/dev.ts): every deploy of the development world to the public game, and how its check went. Apply once:
--   npx wrangler d1 execute rarefriends-realm-saves --remote --config cloud/wrangler.toml --file cloud/migrations/0006-deploys.sql
CREATE TABLE IF NOT EXISTS dev_deploys (id INTEGER PRIMARY KEY AUTOINCREMENT, world_id TEXT NOT NULL, revision_id INTEGER NOT NULL, version INTEGER NOT NULL, name TEXT, ops INTEGER NOT NULL, sha TEXT NOT NULL, url TEXT NOT NULL, at INTEGER NOT NULL, status TEXT NOT NULL, run_url TEXT);
