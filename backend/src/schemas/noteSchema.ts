import { z } from 'zod';

// ── Request body schemas ──────────────────────────────────────────────────────

export const createNoteSchema = z.object({
  title:   z.string().max(200, 'Title must be 200 characters or fewer').optional().default(''),
  content: z.string().optional().default(''),
  // Each tag capped at 50 chars; max 10 tags per note
  tags:    z.array(z.string().max(50, 'Each tag must be 50 characters or fewer'))
             .max(10, 'A note can have at most 10 tags')
             .optional()
             .default([]),
});

export const updateNoteSchema = z.object({
  title:   z.string().max(200, 'Title must be 200 characters or fewer').optional(),
  content: z.string().optional(),
  tags:    z.array(z.string().max(50, 'Each tag must be 50 characters or fewer'))
             .max(10, 'A note can have at most 10 tags')
             .optional(),
  // Guard against empty PATCH with no recognised fields
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Request body must contain at least one field to update' }
);

// ── Query parameter schema ────────────────────────────────────────────────────

export const listNotesSchema = z.object({
  search: z.string().optional(),
  tag:    z.string().optional(),
  // z.enum enforces the whitelist; .default() means omitting the param is fine
  sort:   z.enum(['createdAt', 'updatedAt', 'title']).optional().default('updatedAt'),
  order:  z.enum(['asc', 'desc']).optional().default('desc'),
  // z.coerce.number() converts the raw string from the query string to a number
  page:   z.coerce.number().int().min(1, 'page must be ≥ 1').optional().default(1),
  limit:  z.coerce.number().int().min(1).max(100, 'limit must be between 1 and 100').optional().default(20),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery  = z.infer<typeof listNotesSchema>;
