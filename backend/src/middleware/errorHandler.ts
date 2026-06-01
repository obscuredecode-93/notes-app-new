import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Always log the full error server-side for debugging
  console.error(err);

  // Never expose stack traces or internal details to clients in production.
  // In development the message is surfaced to speed up debugging.
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: {
      code:    'INTERNAL_ERROR',
      message: isProd ? 'An unexpected error occurred' : String(err),
      details: {},
    },
  });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code:    'NOT_FOUND',
      message: 'Route not found',
      details: {},
    },
  });
}
