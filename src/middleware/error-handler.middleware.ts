import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { InvalidLLMResponseError, ProviderFailureError } from '../errors';
import { logger } from '../utils/logger';

/** Stable, human-readable messages for API consumers. No raw provider output or stack. */
const MESSAGES = {
  validationFailed: 'Validation failed',
  invalidLLMResponse: 'Triage could not be completed: model returned invalid response',
  providerFailure: 'Triage service temporarily unavailable',
  internalError: 'Internal server error'
} as const;

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.headers['x-request-id'];

  if (err instanceof ZodError) {
    logger.warn({ requestId, errors: err.issues }, 'Validation error');
    return res.status(400).json({
      error: MESSAGES.validationFailed,
      details: err.issues.map(e => ({ path: e.path, message: e.message }))
    });
  }

  if (err instanceof InvalidLLMResponseError) {
    logger.warn({ requestId }, 'Invalid LLM response');
    return res.status(503).json({
      error: MESSAGES.invalidLLMResponse,
      requestId
    });
  }

  if (err instanceof ProviderFailureError) {
    logger.error({ requestId, error: err.message }, 'Provider failure');
    return res.status(503).json({
      error: MESSAGES.providerFailure,
      requestId
    });
  }

  logger.error({
    requestId,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, 'Unhandled error');

  // Unknown errors: always 500 and a stable message so we never leak SDK or stack details.
  res.status(500).json({
    error: MESSAGES.internalError,
    requestId
  });
};
