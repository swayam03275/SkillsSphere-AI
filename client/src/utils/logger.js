/* eslint-disable no-console */
const isDev = import.meta.env.DEV;

const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
  error: (...args) => {
    if (isDev) console.error(...args);
  },
};

export const suppressReactScriptTagWarning = () => {
  if (!isDev || typeof window === "undefined") return;

  const originalError = console.error;
  console.error = (...args) => {
    const firstArg = args[0];
    if (
      typeof firstArg === "string" &&
      firstArg.includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError(...args);
  };
};

export default logger;
