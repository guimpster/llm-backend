import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import pinoHttp from 'pino-http';

const pinoMiddleware = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || uuidv4(),
  customLogLevel: (res, err) => {
    if (res.statusCode && (res.statusCode >= 500 || err)) return 'error';
    if (res.statusCode && res.statusCode >= 400) return 'warn';
    return 'info';
  },
});

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  pinoMiddleware(req, res);
  next();
};
