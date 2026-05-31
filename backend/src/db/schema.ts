export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS notes (
    id        TEXT    PRIMARY KEY,
    title     TEXT    NOT NULL DEFAULT '',
    content   TEXT    NOT NULL DEFAULT '',
    tags      TEXT    NOT NULL DEFAULT '[]',
    deleted   INTEGER NOT NULL DEFAULT 0,
    deletedAt TEXT,
    createdAt TEXT    NOT NULL,
    updatedAt TEXT    NOT NULL
  );
`;

// Idempotent migration — adds soft-delete columns to DBs created before they
// were part of the schema. Runs every startup; the EXISTS guard makes it safe.
export const MIGRATIONS = `
  ALTER TABLE notes ADD COLUMN deleted   INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE notes ADD COLUMN deletedAt TEXT;
`;
