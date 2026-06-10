import winston from 'winston';
import 'winston-daily-rotate-file';
import { sanitizeValue } from './logSanitizer.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for the console
const consoleFormat = printf(({ level, message, timestamp, stack, reqId, userId, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  if (reqId) msg += ` [ReqID: ${reqId}]`;
  if (userId) msg += ` [User: ${userId}]`;
  msg += `: ${stack || message}`;
  
  if (Object.keys(metadata).length > 0) {
    const sanitizedMeta = sanitizeValue(metadata);
    msg += ` ${JSON.stringify(sanitizedMeta)}`;
  }
  return msg;
});

// Configure the Winston Logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    // Rotate error logs daily
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
    }),
    // Rotate combined logs daily
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    })
  ]
});

// If not in production, log to the `console` with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }));
}

export default logger;
