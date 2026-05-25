import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config({ override: true });

let _client = null;
let hasLoggedError = false;

export const connectRedis = async () => {
  if (_client) return;
  _client = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });
  _client.on("error", () => {
    if (!hasLoggedError) {
      console.log("Redis unavailable. Continuing without Redis.");
      hasLoggedError = true;
    }
  });
  _client.on("connect", () => {
    console.log("Redis Client Connected");
    hasLoggedError = false;
  });
  try {
    await _client.connect();
  } catch {
    console.log("Redis connection skipped for local development");
  }
};

// Proxy: delegates to the real client once connectRedis() has run;
// returns safe no-ops beforehand so imports don't create open handles.
const redisClient = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_client) {
        if (prop === "isReady") return false;
        if (prop === "keys") return () => Promise.resolve([]);
        if (prop === "del") return () => Promise.resolve(0);
        return () => Promise.resolve(null);
      }
      const val = _client[prop];
      return typeof val === "function" ? val.bind(_client) : val;
    },
  }
);

export default redisClient;
