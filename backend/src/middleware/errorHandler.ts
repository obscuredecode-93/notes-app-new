import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err);
  res.status(500).json({
    error: {
      code:    'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
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
