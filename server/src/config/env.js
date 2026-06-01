/**
 * Centralized Environment Configuration
 * 
 * Ensures critical URLs are parsed strictly in production to prevent 
 * fallback to localhost from breaking deployments.
 */
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

export const getFrontendUrl = () => {
  const url = process.env.FRONTEND_URL;
  if (!url && isProduction) {
    logger.warn("WARNING: FRONTEND_URL is not set in production. CORS and OAuth redirects may fail.");
  }
  return url || "http://localhost:5174";
};

export const getBackendUrl = () => {
  const url = process.env.BACKEND_URL;
  if (!url && isProduction) {
    logger.warn("WARNING: BACKEND_URL is not set in production. Resource URLs may be incorrect.");
  }
  return url || `http://localhost:${process.env.PORT || 5000}`;
};

export const getCorsOrigins = () => {
  if (isProduction && !process.env.FRONTEND_URL) {
    logger.warn("WARNING: Missing FRONTEND_URL in production, CORS might block legitimate requests.");
  }
  const frontendUrl = getFrontendUrl();
  return [
    frontendUrl,
    "http://localhost:5173", // Secondary dev server
  ];
};
