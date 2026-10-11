-- Adventurer Cards (cloud/README.md, "Adventurer Cards"). Apply once to a database made before them:
--   npx wrangler d1 execute rarefriends-realm-saves --remote --file migrations/0003-cards.sql
CREATE TABLE IF NOT EXISTS cards (
  token_id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  friend_id INTEGER NOT NULL,
  character TEXT NOT NULL,
  state TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  voucher TEXT,
  deadline INTEGER,
  tx_hash TEXT,
  holder TEXT,
  image INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  redeemed_by TEXT,
  redeemed_at INTEGER
);
CREATE INDEX IF NOT EXISTS cards_by_character ON cards (address, friend_id, state);
