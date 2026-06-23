import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { sanitizeValue } from '../utils/logSanitizer.js';

export const requestLogger = (req, res, next) => {
  req.id = uuidv4();
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: sanitizeValue(req.originalUrl),
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: sanitizeValue(req.ip),
      userAgent: sanitizeValue(req.get('user-agent'))
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', { reqId: req.id, userId: req.user?._id, ...logData });
    } else if (res.statusCode >= 400) {
      logger.warn('Request client error', { reqId: req.id, userId: req.user?._id, ...logData });
    } else {
      logger.info('Request completed', { reqId: req.id, userId: req.user?._id, ...logData });
    }
  });

  next();
};
