-- RareFriends Realm cloud saves (Cloudflare D1). Apply with:
--   npx wrangler d1 execute rarefriends-realm-saves --remote --file cloud/schema.sql --config cloud/wrangler.toml

-- Sign-in challenges: single use, ten minutes.
CREATE TABLE IF NOT EXISTS nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  origin TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
-- Sessions: only a SHA-256 of the bearer token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_by_address ON sessions (address);
-- One character per wallet and Friend (a Friend's new owner starts their own; see cloud/README.md).
CREATE TABLE IF NOT EXISTS characters (
  address TEXT NOT NULL,
  friend_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  save TEXT NOT NULL,
  size INTEGER NOT NULL,
  total_xp INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  imported_at INTEGER,
  -- Verified progress (README "Verified progress"): the stored save's SHA-256, the facts the progress checks compare
  -- (XP by skill, ticks played), and whether the service vouches for the character ('verified' or 'unverified', why, and since which version).
  save_hash TEXT,
  facts TEXT,
  trust TEXT NOT NULL DEFAULT 'verified',
  trust_note TEXT,
  trust_version INTEGER,
  -- Redemptions settled into this character but not yet carried by every session's save (cards.ts Settlement[]).
  pending TEXT,
  PRIMARY KEY (address, friend_id)
);
-- Earlier versions, kept for recovery (the latest few per character).
CREATE TABLE IF NOT EXISTS history (
  address TEXT NOT NULL,
  friend_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  save TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  reason TEXT NOT NULL,
  save_hash TEXT,
  PRIMARY KEY (address, friend_id, version)
);
-- Imports already made (a hash of the imported save), so the same import can't be applied twice.
CREATE TABLE IF NOT EXISTS imports (
  address TEXT NOT NULL,
  friend_id INTEGER NOT NULL,
  hash TEXT NOT NULL,
  version INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (address, friend_id, hash)
);
-- A short-lived cache of on-chain owners.
CREATE TABLE IF NOT EXISTS owners (
  friend_id INTEGER PRIMARY KEY,
  address TEXT NOT NULL,
  checked_at INTEGER NOT NULL
);
-- Adventurer Cards (src/cards.ts): one row per card, from prepared to active or redeemed. The snapshot is what the
-- card stands for (XP, lockbox items); its hash is what the chain commits to. token_id is the card's token on chain.
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
-- The private development game (src/dev.ts): the owner's sessions (only a SHA-256 of the cookie's token), login tries by
-- address, the development worlds' overlays with their revisions, and what was done.
CREATE TABLE IF NOT EXISTS dev_sessions (token_hash TEXT PRIMARY KEY, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dev_logins (ip TEXT PRIMARY KEY, failures INTEGER NOT NULL, until INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dev_worlds (id TEXT PRIMARY KEY, overlay TEXT NOT NULL, version INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dev_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, world_id TEXT NOT NULL, version INTEGER NOT NULL, name TEXT, note TEXT, overlay TEXT NOT NULL, size INTEGER NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS dev_revisions_by_world ON dev_revisions (world_id, id);
CREATE TABLE IF NOT EXISTS dev_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dev_deploys (id INTEGER PRIMARY KEY AUTOINCREMENT, world_id TEXT NOT NULL, revision_id INTEGER NOT NULL, version INTEGER NOT NULL, name TEXT, ops INTEGER NOT NULL, sha TEXT NOT NULL, url TEXT NOT NULL, at INTEGER NOT NULL, status TEXT NOT NULL, run_url TEXT);
