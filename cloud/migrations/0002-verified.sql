-- Verified progress (cloud/README.md, "Verified progress"). Apply once to a database made before it:
--   npx wrangler d1 execute rarefriends-realm-saves --remote --file migrations/0002-verified.sql
-- Characters already stored are trusted as they stand (the column's default).
ALTER TABLE characters ADD COLUMN save_hash TEXT;
ALTER TABLE characters ADD COLUMN facts TEXT;
ALTER TABLE characters ADD COLUMN trust TEXT NOT NULL DEFAULT 'verified';
ALTER TABLE characters ADD COLUMN trust_note TEXT;
ALTER TABLE characters ADD COLUMN trust_version INTEGER;
ALTER TABLE history ADD COLUMN save_hash TEXT;
