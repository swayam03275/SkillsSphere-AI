/* eslint-disable no-console */
import { sanitizeValue } from './logSanitizer.js';

const isDev = process.env.NODE_ENV !== "production";

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args.map(sanitizeValue));
  },
  info: (...args) => {
    if (isDev) console.info(...args.map(sanitizeValue));
  },
  warn: (...args) => {
    console.warn(...args.map(sanitizeValue));
  },
  error: (...args) => {
    console.error(...args.map(sanitizeValue));
  },
  debug: (...args) => {
    if (isDev) console.debug(...args.map(sanitizeValue));
  }
};

export default logger;
