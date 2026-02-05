import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'];

  if (err instanceof ZodError) {
    logger.warn({ requestId, errors: err.issues }, 'Validation error');
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map(e => ({ path: e.path, message: e.message }))
    });
  }

  logger.error({ 
    requestId, 
    error: err.message, 
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  }, 'Unhandled error');

  const statusCode = (err as any).status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: message,
    requestId
  });
};
