import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  req.id = uuidv4();
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
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
