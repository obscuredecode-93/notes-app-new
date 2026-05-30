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

// Shape of a row as SQLite returns it (tags stored as a JSON string)
interface NoteRow {
  id:        string;
  title:     string;
  content:   string;
  tags:      string;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert a raw SQLite row to the API Note shape.
// Parses tags defensively in case of DB corruption — same pattern as tags.ts.
function rowToNote(row: NoteRow): Note {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags);
    tags = Array.isArray(parsed) ? parsed : [];
  } catch {
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

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /notes — list with search, tag filter, sort, and pagination.
// validateQuery runs listNotesSchema first: coerces page/limit to numbers,
// defaults sort to 'updatedAt' and order to 'desc', rejects unknown sort values.
router.get('/', validateQuery(listNotesSchema), (req: Request, res: Response) => {
  const db = getDb();

  // After Zod validation, req.query holds coerced, typed values
  const { search, tag, sort, order, page, limit } =
    req.query as unknown as ListNotesQuery;
  const offset = (page - 1) * limit;

  const conditions: string[]            = [];
  const params:     (string | number)[] = [];

  if (search) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    // json_each() unnests the tags array; qualify notes.id to avoid ambiguity
    // with json_each's own 'id' column.
    conditions.push(
      `notes.id IN (SELECT notes.id FROM notes, json_each(notes.tags) WHERE json_each.value = ?)`
    );
    params.push(tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const dir   = order === 'asc' ? 'ASC' : 'DESC';

  const { cnt: total } = db.prepare(
    `SELECT COUNT(*) as cnt FROM notes ${where}`
  ).get(...params) as unknown as { cnt: number };

  // `sort` is interpolated directly — safe because listNotesSchema constrains
  // it to z.enum(['createdAt','updatedAt','title']) before this handler runs.
  const rows = db.prepare(
    `SELECT * FROM notes ${where} ORDER BY ${sort} ${dir} LIMIT ? OFFSET ?`
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

// POST /notes — validateBody runs createNoteSchema, which applies defaults
// and ensures title/content are strings and tags is a string array.
router.post('/', validateBody(createNoteSchema), (req: Request, res: Response) => {
  const db  = getDb();
  const now = new Date().toISOString();
  const { title, content, tags } = req.body as CreateNoteInput;

  const note = {
    id:        uuidv4(),
    title,
    content,
    tags:      JSON.stringify(tags),
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO notes (id, title, content, tags, createdAt, updatedAt)
     VALUES (@id, @title, @content, @tags, @createdAt, @updatedAt)`
  ).run(note);

  res.status(201).json(rowToNote(note as unknown as NoteRow));
});

// PATCH /notes/:id — partial update; only supplied fields are changed.
// updateNoteSchema rejects bodies with no valid fields.
router.patch('/:id', validateBody(updateNoteSchema), (req: Request, res: Response): void => {
  const db  = getDb();
  const row = db.prepare('SELECT * FROM notes WHERE id = ?')
    .get(req.params.id) as unknown as NoteRow | undefined;

  if (!row) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Note not found', details: {} },
    });
    return;
  }

  const { title, content, tags } = req.body as UpdateNoteInput;

  // Build SET clause dynamically — only columns present in the request body
  const updates: Record<string, string> = {
    updatedAt: new Date().toISOString(),
  };
  if (title   !== undefined) updates.title   = title;
  if (content !== undefined) updates.content = content;
  if (tags    !== undefined) updates.tags    = JSON.stringify(tags);

  // Column names come from our controlled set above — no injection risk.
  // Values go through named parameterised bindings (@key).
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
