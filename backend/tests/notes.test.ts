import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb } from '../src/db/database';
import app from '../src/index';

const TEST_DB = path.join(__dirname, '../data/test.db');

// Wipe all rows before every test — faster than recreating the file
// and avoids Windows file-lock issues with SQLite WAL files.
function reset() { getDb().exec('DELETE FROM notes'); }

after(() => {
  closeDb();
  // Clean up the test DB and its WAL sidecar files
  for (const ext of ['', '-wal', '-shm']) {
    const f = TEST_DB + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

// ── GET /notes ────────────────────────────────────────────────────────────────

describe('GET /notes', () => {
  beforeEach(reset);

  it('returns empty array when no notes exist', async () => {
    const res = await request(app).get('/notes');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, []);
    assert.equal(res.body.total, 0);
    assert.equal(res.body.page, 1);
  });

  it('returns all notes', async () => {
    await request(app).post('/notes').send({ title: 'A' });
    await request(app).post('/notes').send({ title: 'B' });
    const res = await request(app).get('/notes');
    assert.equal(res.body.total, 2);
    assert.equal(res.body.data.length, 2);
  });

  it('filters by search query in title', async () => {
    await request(app).post('/notes').send({ title: 'Banana bread recipe' });
    await request(app).post('/notes').send({ title: 'Shopping list' });
    const res = await request(app).get('/notes?search=banana');
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].title, 'Banana bread recipe');
  });

  it('filters by search query in content', async () => {
    await request(app).post('/notes').send({ title: 'Note', content: '<p>secret text</p>' });
    await request(app).post('/notes').send({ title: 'Other', content: '<p>nothing</p>' });
    const res = await request(app).get('/notes?search=secret');
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].title, 'Note');
  });

  it('filters by tag exactly (not substring)', async () => {
    await request(app).post('/notes').send({ title: 'A', tags: ['work', 'important'] });
    await request(app).post('/notes').send({ title: 'B', tags: ['personal'] });
    await request(app).post('/notes').send({ title: 'C', tags: ['network'] }); // contains 'work' as substring
    const res = await request(app).get('/notes?tag=work');
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].title, 'A');
  });

  it('sorts by title ascending', async () => {
    await request(app).post('/notes').send({ title: 'Zebra' });
    await request(app).post('/notes').send({ title: 'Apple' });
    await request(app).post('/notes').send({ title: 'Mango' });
    const res = await request(app).get('/notes?sort=title&order=asc');
    const titles = res.body.data.map((n: { title: string }) => n.title);
    assert.deepEqual(titles, ['Apple', 'Mango', 'Zebra']);
  });

  it('sorts by title descending', async () => {
    await request(app).post('/notes').send({ title: 'Zebra' });
    await request(app).post('/notes').send({ title: 'Apple' });
    const res = await request(app).get('/notes?sort=title&order=desc');
    assert.equal(res.body.data[0].title, 'Zebra');
  });

  it('paginates correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/notes').send({ title: `Note ${i}` });
    }
    const p1 = await request(app).get('/notes?limit=2&page=1');
    assert.equal(p1.body.data.length, 2);
    assert.equal(p1.body.total, 5);
    assert.equal(p1.body.page, 1);

    const p2 = await request(app).get('/notes?limit=2&page=2');
    assert.equal(p2.body.data.length, 2);
    assert.equal(p2.body.page, 2);

    const p3 = await request(app).get('/notes?limit=2&page=3');
    assert.equal(p3.body.data.length, 1); // last page has only 1 note
  });

  it('ignores invalid sort column and falls back to updatedAt', async () => {
    await request(app).post('/notes').send({ title: 'A' });
    // Should not throw even with a malicious sort value
    const res = await request(app).get('/notes?sort=; DROP TABLE notes; --');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
  });
});

// ── POST /notes ───────────────────────────────────────────────────────────────

describe('POST /notes', () => {
  beforeEach(reset);

  it('creates note with all fields', async () => {
    const res = await request(app)
      .post('/notes')
      .send({ title: 'Hello', content: '<p>World</p>', tags: ['test', 'demo'] });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, 'Hello');
    assert.equal(res.body.content, '<p>World</p>');
    assert.deepEqual(res.body.tags, ['test', 'demo']);
  });

  it('creates note with only title — content and tags default', async () => {
    const res = await request(app).post('/notes').send({ title: 'Minimal' });
    assert.equal(res.status, 201);
    assert.equal(res.body.content, '');
    assert.deepEqual(res.body.tags, []);
  });

  it('creates note with empty body — all fields default', async () => {
    const res = await request(app).post('/notes').send({});
    assert.equal(res.status, 201);
    assert.equal(res.body.title, '');
    assert.deepEqual(res.body.tags, []);
  });

  it('sets createdAt and updatedAt automatically', async () => {
    const before = Date.now();
    const res = await request(app).post('/notes').send({ title: 'Time test' });
    const after = Date.now();
    const created = new Date(res.body.createdAt).getTime();
    assert.ok(created >= before && created <= after);
    assert.equal(res.body.createdAt, res.body.updatedAt);
  });

  it('generates a unique id per note', async () => {
    const r1 = await request(app).post('/notes').send({ title: 'A' });
    const r2 = await request(app).post('/notes').send({ title: 'B' });
    assert.notEqual(r1.body.id, r2.body.id);
  });

  it('coerces non-string title to empty string', async () => {
    const res = await request(app).post('/notes').send({ title: 123 });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, '');
  });

  it('coerces non-array tags to empty array', async () => {
    const res = await request(app).post('/notes').send({ tags: 'not-an-array' });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.tags, []);
  });
});

// ── GET /notes/:id ────────────────────────────────────────────────────────────

describe('GET /notes/:id', () => {
  beforeEach(reset);

  it('returns the note by id', async () => {
    const { body: created } = await request(app).post('/notes').send({ title: 'Find me' });
    const res = await request(app).get(`/notes/${created.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, created.id);
    assert.equal(res.body.title, 'Find me');
  });

  it('returns 404 with correct error shape for unknown id', async () => {
    const res = await request(app).get('/notes/does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.message);
    assert.ok('details' in res.body.error);
  });
});

// ── PATCH /notes/:id ──────────────────────────────────────────────────────────

describe('PATCH /notes/:id', () => {
  beforeEach(reset);

  it('updates title only', async () => {
    const { body: n } = await request(app).post('/notes').send({ title: 'Old', content: 'keep me' });
    const res = await request(app).patch(`/notes/${n.id}`).send({ title: 'New' });
    assert.equal(res.status, 200);
    assert.equal(res.body.title, 'New');
    assert.equal(res.body.content, 'keep me'); // unchanged
  });

  it('updates content only', async () => {
    const { body: n } = await request(app).post('/notes').send({ title: 'keep me' });
    const res = await request(app).patch(`/notes/${n.id}`).send({ content: '<p>new body</p>' });
    assert.equal(res.body.content, '<p>new body</p>');
    assert.equal(res.body.title, 'keep me'); // unchanged
  });

  it('updates tags only', async () => {
    const { body: n } = await request(app).post('/notes').send({ tags: ['old'] });
    const res = await request(app).patch(`/notes/${n.id}`).send({ tags: ['new', 'tags'] });
    assert.deepEqual(res.body.tags, ['new', 'tags']);
  });

  it('bumps updatedAt but not createdAt', async () => {
    const { body: n } = await request(app).post('/notes').send({ title: 'X' });
    // Small delay to ensure timestamps differ
    await new Promise((r) => setTimeout(r, 10));
    const res = await request(app).patch(`/notes/${n.id}`).send({ title: 'Y' });
    assert.equal(res.body.createdAt, n.createdAt);
    assert.ok(res.body.updatedAt > n.updatedAt);
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).patch('/notes/nope').send({ title: 'x' });
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});

// ── DELETE /notes/:id ─────────────────────────────────────────────────────────

describe('DELETE /notes/:id', () => {
  beforeEach(reset);

  it('deletes note and returns 204', async () => {
    const { body: n } = await request(app).post('/notes').send({ title: 'Gone' });
    const res = await request(app).delete(`/notes/${n.id}`);
    assert.equal(res.status, 204);
  });

  it('note no longer appears in GET /notes after deletion', async () => {
    const { body: n } = await request(app).post('/notes').send({ title: 'Delete me' });
    await request(app).delete(`/notes/${n.id}`);
    const list = await request(app).get('/notes');
    assert.ok(!list.body.data.find((x: { id: string }) => x.id === n.id));
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/notes/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});

// ── GET /tags ─────────────────────────────────────────────────────────────────

describe('GET /tags', () => {
  beforeEach(reset);

  it('returns empty array when no notes exist', async () => {
    const res = await request(app).get('/tags');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
  });

  it('returns unique tags with correct counts', async () => {
    await request(app).post('/notes').send({ tags: ['work', 'important'] });
    await request(app).post('/notes').send({ tags: ['work'] });
    await request(app).post('/notes').send({ tags: ['personal'] });

    const res = await request(app).get('/tags');
    const work     = res.body.find((t: { tag: string; count: number }) => t.tag === 'work');
    const personal = res.body.find((t: { tag: string; count: number }) => t.tag === 'personal');
    const important = res.body.find((t: { tag: string; count: number }) => t.tag === 'important');

    assert.equal(work.count, 2);
    assert.equal(personal.count, 1);
    assert.equal(important.count, 1);
  });

  it('returns tags sorted by count descending', async () => {
    await request(app).post('/notes').send({ tags: ['a'] });
    await request(app).post('/notes').send({ tags: ['b', 'a'] });
    await request(app).post('/notes').send({ tags: ['b', 'a', 'c'] });

    const res = await request(app).get('/tags');
    // 'a' appears 3 times, 'b' twice, 'c' once
    assert.equal(res.body[0].tag, 'a');
    assert.equal(res.body[1].tag, 'b');
    assert.equal(res.body[2].tag, 'c');
  });

  it('does not count tags from notes with no tags', async () => {
    await request(app).post('/notes').send({ title: 'No tags here' });
    const res = await request(app).get('/tags');
    assert.deepEqual(res.body, []);
  });

  it('updates count when a note is deleted', async () => {
    // 'work' should appear twice, then drop to once after one note is deleted
    await request(app).post('/notes').send({ tags: ['work'] });
    const { body: toDelete } = await request(app).post('/notes').send({ tags: ['work'] });

    const before = await request(app).get('/tags');
    assert.equal(before.body.find((t: { tag: string; count: number }) => t.tag === 'work').count, 2);

    await request(app).delete(`/notes/${toDelete.id}`);

    const after = await request(app).get('/tags');
    assert.equal(after.body.find((t: { tag: string; count: number }) => t.tag === 'work').count, 1);
  });
});
