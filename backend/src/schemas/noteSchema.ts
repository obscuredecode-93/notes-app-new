import { z } from 'zod';

// ── Tag validation ────────────────────────────────────────────────────────────
// Allow letters, numbers, spaces, hyphens, and underscores.
// This blocks HTML tags, script injection, and special SQL characters in tags.
const tagSchema = z
  .string()
  .max(50, 'Each tag must be 50 characters or fewer')
  .regex(/^[\w\s\-]+$/, 'Tags may only contain letters, numbers, spaces, hyphens, and underscores');

// ── Request body schemas ──────────────────────────────────────────────────────

export const createNoteSchema = z.object({
  title:   z.string().max(200, 'Title must be 200 characters or fewer').optional().default(''),
  // 200 KB limit — prevents unbounded storage and large SQL UPDATE payloads
  content: z.string().max(200_000, 'Note content must be 200,000 characters or fewer').optional().default(''),
  tags:    z.array(tagSchema).max(10, 'A note can have at most 10 tags').optional().default([]),
});

export const updateNoteSchema = z.object({
  title:   z.string().max(200, 'Title must be 200 characters or fewer').optional(),
  content: z.string().max(200_000, 'Note content must be 200,000 characters or fewer').optional(),
  tags:    z.array(tagSchema).max(10, 'A note can have at most 10 tags').optional(),
  // Guard against empty PATCH with no recognised fields
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Request body must contain at least one field to update' }
);

// ── Query parameter schema ────────────────────────────────────────────────────

export const listNotesSchema = z.object({
  // Cap search length to prevent very large LIKE patterns hitting the DB
  search: z.string().max(200).optional(),
  tag:    z.string().max(50).optional(),
  // z.enum enforces the whitelist — sort column is interpolated into SQL
  // so this whitelist is the primary SQL injection defence for that field
  sort:   z.enum(['createdAt', 'updatedAt', 'title']).optional().default('updatedAt'),
  order:  z.enum(['asc', 'desc']).optional().default('desc'),
  page:   z.coerce.number().int().min(1, 'page must be ≥ 1').optional().default(1),
  limit:  z.coerce.number().int().min(1).max(100, 'limit must be between 1 and 100').optional().default(20),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery  = z.infer<typeof listNotesSchema>;
