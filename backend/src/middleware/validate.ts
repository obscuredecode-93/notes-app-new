import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ── Shared error serialiser ───────────────────────────────────────────────────

function zodErrorResponse(res: Response, err: ZodError): void {
  res.status(400).json({
    error: {
      code:    'VALIDATION_ERROR',
      // Surface the first human-readable message for easy display
      message: err.errors[0]?.message ?? 'Validation failed',
      // Full field-level breakdown for clients that want it
      details: err.flatten(),
    },
  });
}

// ── Middleware factories ───────────────────────────────────────────────────────

// Validates and coerces req.body against a Zod schema.
// On success, req.body is replaced with the parsed (and default-filled) value.
// On failure, returns 400 with a consistent VALIDATION_ERROR shape.
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      zodErrorResponse(res, result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

// Validates and coerces req.query against a Zod schema.
// Useful for applying defaults and type coercion (e.g. string → number).
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      zodErrorResponse(res, result.error);
      return;
    }
    // Cast needed: Express types req.query as ParsedQs, but Zod gives us
    // a fully typed object — the values are correct at runtime.
    req.query = result.data as typeof req.query;
    next();
  };
}
