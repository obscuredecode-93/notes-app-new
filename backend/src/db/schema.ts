export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS notes (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL DEFAULT '',
    content   TEXT NOT NULL DEFAULT '',
    tags      TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`;
