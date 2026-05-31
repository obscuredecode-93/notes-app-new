import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/database';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  createNoteSchema,
  updateNoteSchema,
  listNotesSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
  type ListNotesQuery,
} from '../schemas/noteSchema';

const router = Router();

// ── Types ────────────────────────────────────────────────────────────────────

interface NoteRow {
  id:        string;
  title:     string;
  content:   string;
  tags:      string;
  deleted:   number;  // 0 = active, 1 = soft-deleted
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id:        string;
  title:     string;
  content:   string;
  tags:      string[];
  deleted:   boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToNote(row: NoteRow): Note {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags);
    tags = Array.isArray(parsed) ? parsed : [];
  } catch { tags = []; }
  return {
    id:        row.id,
    title:     row.title,
    content:   row.content,
    tags,
    deleted:   Boolean(row.deleted),
    deletedAt: row.deletedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /notes — active notes only (deleted = 0)
router.get('/', validateQuery(listNotesSchema), (req: Request, res: Response) => {
  const db = getDb();
  const { search, tag, sort, order, page, limit } =
    req.query as unknown as ListNotesQuery;
  const offset = (page - 1) * limit;

  const conditions: string[]            = ['deleted = 0'];
  const params:     (string | number)[] = [];

  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tag) {
    conditions.push(
      `notes.id IN (SELECT notes.id FROM notes, json_each(notes.tags) WHERE json_each.value = ?)`
    );
    params.push(tag);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const dir   = order === 'asc' ? 'ASC' : 'DESC';

  const { cnt: total } = db.prepare(
    `SELECT COUNT(*) as cnt FROM notes ${where}`
  ).get(...params) as unknown as { cnt: number };

  // `sort` safe: constrained to z.enum(['createdAt','updatedAt','title'])
  const rows = db.prepare(
    `SELECT * FROM notes ${where} ORDER BY ${sort} ${dir} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as unknown as NoteRow[];

  res.json({ data: rows.map(rowToNote), total, page });
});

// GET /notes/trash — soft-deleted notes
// MUST be registered before /:id so Express doesn't match "trash" as an id.
router.get('/trash', (_req: Request, res: Response) => {
  const db  = getDb();
  const rows = db.prepare(
    'SELECT * FROM notes WHERE deleted = 1 ORDER BY deletedAt DESC'
  ).all() as unknown as NoteRow[];
  res.json({ data: rows.map(rowToNote) });
});

// GET /notes/:id — active note only
router.get('/:id', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ? AND deleted = 0')
    .get(req.params.id) as unknown as NoteRow | undefined;
  if (!row) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found', details: {} } });
    return;
  }
  res.json(rowToNote(row));
});

// POST /notes
router.post('/', validateBody(createNoteSchema), (req: Request, res: Response) => {
  const db  = getDb();
  const now = new Date().toISOString();
  const { title, content, tags } = req.body as CreateNoteInput;

  const note = {
    id:        uuidv4(),
    title,
    content,
    tags:      JSON.stringify(tags),
    deleted:   0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO notes (id, title, content, tags, deleted, deletedAt, createdAt, updatedAt)
     VALUES (@id, @title, @content, @tags, @deleted, @deletedAt, @createdAt, @updatedAt)`
  ).run(note);

  res.status(201).json(rowToNote(note as unknown as NoteRow));
});

// PATCH /notes/:id — partial update (active notes only)
router.patch('/:id', validateBody(updateNoteSchema), (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ? AND deleted = 0')
    .get(req.params.id) as unknown as NoteRow | undefined;
  if (!row) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found', details: {} } });
    return;
  }

  const { title, content, tags } = req.body as UpdateNoteInput;
  const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (title   !== undefined) updates.title   = title;
  if (content !== undefined) updates.content = content;
  if (tags    !== undefined) updates.tags    = JSON.stringify(tags);

  // Column names are controlled — no injection risk
  const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE notes SET ${setClauses} WHERE id = @id`).run({ ...updates, id: req.params.id });

  const updated = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as unknown as NoteRow;
  res.json(rowToNote(updated));
});

// DELETE /notes/:id — soft delete (move to trash)
router.delete('/:id', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT id FROM notes WHERE id = ? AND deleted = 0')
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found', details: {} } });
    return;
  }
  db.prepare('UPDATE notes SET deleted = 1, deletedAt = ? WHERE id = ?')
    .run(new Date().toISOString(), req.params.id);
  res.status(204).send();
});

// POST /notes/:id/restore — move back from trash
router.post('/:id/restore', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT id FROM notes WHERE id = ? AND deleted = 1')
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found in trash', details: {} } });
    return;
  }
  db.prepare('UPDATE notes SET deleted = 0, deletedAt = NULL, updatedAt = ? WHERE id = ?')
    .run(new Date().toISOString(), req.params.id);
  const restored = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as unknown as NoteRow;
  res.json(rowToNote(restored));
});

// DELETE /notes/:id/permanent — hard delete (from trash only)
router.delete('/:id/permanent', (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT id FROM notes WHERE id = ? AND deleted = 1')
    .get(req.params.id);
  if (!row) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Note not found in trash', details: {} } });
    return;
  }
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
