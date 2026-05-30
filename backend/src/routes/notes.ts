import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

const router = Router();

// ── Types ────────────────────────────────────────────────────────────────────

// Shape of a row as SQLite returns it (tags is a raw JSON string)
interface NoteRow {
  id:        string;
  title:     string;
  content:   string;
  tags:      string; // JSON array string e.g. '["work","personal"]'
  createdAt: string;
  updatedAt: string;
}

// Shape returned to API consumers
export interface Note {
  id:        string;
  title:     string;
  content:   string;
  tags:      string[];
  createdAt: string;
  updatedAt: string;
}

// Whitelist for the sort column — validated here and again by Zod in commit 6.
// Kept at module level so it isn't re-created on every request.
const ALLOWED_SORT = ['createdAt', 'updatedAt', 'title'] as const;
type SortCol = typeof ALLOWED_SORT[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert a raw SQLite row to the API Note shape.
// Tags are stored as a JSON string; we parse defensively in case of corruption.
function rowToNote(row: NoteRow): Note {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags);
    // Only accept an actual array; reject any other JSON value
    tags = Array.isArray(parsed) ? parsed : [];
  } catch {
    // Malformed JSON in the tags column — default to empty rather than crashing
    tags = [];
  }
  return {
    id:        row.id,
    title:     row.title,
    content:   row.content,
    tags,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Safely coerce body fields to the expected types.
// Full Zod validation arrives in commit 6; these guards prevent bad data in the DB now.
function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  // Keep only string elements; silently drop anything else
  return value.filter((t): t is string => typeof t === 'string');
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /notes — list notes with optional search, tag filter, sort, and pagination
router.get('/', (req: Request, res: Response) => {
  const db = getDb();

  const search = safeString(req.query.search);
  const tag    = safeString(req.query.tag);
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const sortRaw = req.query.sort as string;
  const sort: SortCol = (ALLOWED_SORT as readonly string[]).includes(sortRaw)
    ? (sortRaw as SortCol)
    : 'updatedAt';

  // Only two valid order values — anything else defaults to DESC
  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause incrementally; use parameterised values throughout
  const conditions: string[]            = [];
  const params:     (string | number)[] = [];

  if (search) {
    // LIKE is case-insensitive for ASCII in SQLite by default
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    // json_each() unnests the tags array into individual rows for exact matching.
    // Must qualify notes.id because json_each also exposes a column named id.
    conditions.push(
      `notes.id IN (SELECT notes.id FROM notes, json_each(notes.tags) WHERE json_each.value = ?)`
    );
    params.push(tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Separate COUNT query for pagination metadata — SQLite is fast enough that
  // running two queries is simpler than a window function for this scale.
  // Cast through unknown: node:sqlite returns Record<string, SQLOutputValue>
  // which TypeScript won't directly narrow to our NoteRow shape.
  const { cnt: total } = db.prepare(
    `SELECT COUNT(*) as cnt FROM notes ${where}`
  ).get(...params) as unknown as { cnt: number };

  const rows = db.prepare(
    `SELECT * FROM notes ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as unknown as NoteRow[];

  res.json({ data: rows.map(rowToNote), total, page });
});

// GET /notes/:id
router.get('/:id', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as unknown as NoteRow | undefined;

  if (!row) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Note not found', details: {} },
    });
    return;
  }
  res.json(rowToNote(row));
});

// POST /notes
router.post('/', (req: Request, res: Response) => {
  const db  = getDb();
  const now = new Date().toISOString();

  const note = {
    id:        uuidv4(),
    title:     safeString(req.body.title),
    content:   safeString(req.body.content),
    tags:      JSON.stringify(safeTags(req.body.tags)),
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO notes (id, title, content, tags, createdAt, updatedAt)
     VALUES (@id, @title, @content, @tags, @createdAt, @updatedAt)`
  ).run(note);

  // Return the note in its API shape (parse tags back out of the JSON string)
  res.status(201).json(rowToNote(note as unknown as NoteRow));
});

// PATCH /notes/:id — partial update, only supplied fields are changed
router.patch('/:id', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as unknown as NoteRow | undefined;

  if (!row) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Note not found', details: {} },
    });
    return;
  }

  // Only update fields that were explicitly provided in the request body
  const updates: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  };
  if (req.body.title   !== undefined) updates.title   = safeString(req.body.title);
  if (req.body.content !== undefined) updates.content = safeString(req.body.content);
  if (req.body.tags    !== undefined) updates.tags    = JSON.stringify(safeTags(req.body.tags));

  // Build SET clause from the keys collected above — column names are controlled,
  // values go through parameterised named bindings (@key), so no injection risk.
  const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE notes SET ${setClauses} WHERE id = @id`)
    .run({ ...updates, id: req.params.id });

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as unknown as NoteRow;
  res.json(rowToNote(updated));
});

// DELETE /notes/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT id FROM notes WHERE id = ?')
    .get(req.params.id);

  if (!row) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Note not found', details: {} },
    });
    return;
  }

  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
