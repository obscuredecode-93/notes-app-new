import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';

const router = Router();

function rowToNote(row: Record<string, unknown>) {
  return {
    id:        row.id,
    title:     row.title,
    content:   row.content,
    tags:      JSON.parse(row.tags as string),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// GET /notes — list notes with optional search, tag filter, sort, and pagination
router.get('/', (req: Request, res: Response) => {
  const db = getDb();

  const search = (req.query.search as string) ?? '';
  const tag    = (req.query.tag    as string) ?? '';
  const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  // Whitelist sort column to prevent SQL injection before Zod is added in commit 6
  const ALLOWED_SORT = ['createdAt', 'updatedAt', 'title'] as const;
  type SortCol = typeof ALLOWED_SORT[number];
  const sortRaw = req.query.sort as string;
  const sort: SortCol = (ALLOWED_SORT as readonly string[]).includes(sortRaw)
    ? sortRaw as SortCol
    : 'updatedAt';

  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause dynamically based on which filters are present
  const conditions: string[]              = [];
  const params:     (string | number)[]   = [];

  if (search) {
    // LIKE search across title and content — case-insensitive in SQLite by default for ASCII
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    // Tags stored as a JSON array string e.g. '["work","personal"]'.
    // json_each() unnests the array into rows so we can match individual values exactly.
    // Must qualify notes.id because json_each also exposes a column named id.
    conditions.push(`notes.id IN (SELECT notes.id FROM notes, json_each(notes.tags) WHERE json_each.value = ?)`);
    params.push(tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Run count query first for pagination metadata
  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM notes ${where}`)
    .get(...params) as { cnt: number }).cnt;

  const rows = db.prepare(
    `SELECT * FROM notes ${where} ORDER BY ${sort} ${order} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];

  res.json({ data: rows.map(rowToNote), total, page });
});

// GET /notes/:id
router.get('/:id', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;

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
    title:     req.body.title   ?? '',
    content:   req.body.content ?? '',
    tags:      JSON.stringify(req.body.tags ?? []),
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO notes (id, title, content, tags, createdAt, updatedAt)
     VALUES (@id, @title, @content, @tags, @createdAt, @updatedAt)`
  ).run(note);

  res.status(201).json(rowToNote({ ...note }));
});

// PATCH /notes/:id
router.patch('/:id', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Note not found', details: {} },
    });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (req.body.title   !== undefined) updates.title   = req.body.title;
  if (req.body.content !== undefined) updates.content = req.body.content;
  if (req.body.tags    !== undefined) updates.tags    = JSON.stringify(req.body.tags);

  const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE notes SET ${setClauses} WHERE id = @id`)
    .run({ ...updates, id: req.params.id });

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as Record<string, unknown>;
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
