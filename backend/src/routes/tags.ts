import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

const router = Router();

// GET /tags — returns all unique tags across all notes, with usage counts.
// Sorted by count descending so the most-used tags appear first.
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();

  // Pull every non-empty tags column in one query, then count in JS.
  // Doing this in application code rather than SQL is simpler here because
  // SQLite's json_each() + GROUP BY approach requires a subquery that
  // becomes harder to read; for this data volume JS is fast enough.
  const rows = db.prepare(
    "SELECT tags FROM notes WHERE tags != '[]'"
  ).all() as unknown as { tags: string }[];

  const counts = new Map<string, number>();

  for (const row of rows) {
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(row.tags);
      tags = Array.isArray(parsed) ? parsed : [];
    } catch {
      // Skip malformed tag columns — same defensive pattern as rowToNote
      continue;
    }
    for (const tag of tags) {
      if (typeof tag === 'string') {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
  }

  const result = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  res.json(result);
});

export default router;
