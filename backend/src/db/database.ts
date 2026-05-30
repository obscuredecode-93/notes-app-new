// Uses Node 22's built-in node:sqlite — no native compilation required.
// DB_PATH is captured once at module load time. Tests must set process.env.DB_PATH
// *before* importing this module (see tests/setup.cjs).
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { CREATE_TABLES } from './schema';

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../../data/notes.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(CREATE_TABLES);
  }
  return db;
}

export function closeDb(): void {
  if (db) { db.close(); db = null; }
}
