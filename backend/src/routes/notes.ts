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

// GET /notes — return all notes
router.get('/', (_req: Request, res: Response) => {
  const db   = getDb();
  const rows = db.prepare('SELECT * FROM notes ORDER BY updatedAt DESC')
    .all() as Record<string, unknown>[];
  res.json({ data: rows.map(rowToNote), total: rows.length, page: 1 });
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
