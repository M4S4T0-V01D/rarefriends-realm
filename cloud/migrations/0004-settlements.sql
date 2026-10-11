-- Adventurer Card redemptions (cloud/README.md, "Adventurer Cards"). Apply once to a database made before them:
--   npx wrangler d1 execute rarefriends-realm-saves --remote --config cloud/wrangler.toml --file cloud/migrations/0004-settlements.sql
ALTER TABLE characters ADD COLUMN pending TEXT;
