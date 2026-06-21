import AuditLog from "../database/models/AuditLog.js";
import logger from "../utils/logger.js";

/**
 * Middleware to log user actions into the AuditLog collection
 * @param {string} action - The action type (e.g., 'LOGIN', 'RESUME_UPLOAD')
 * @param {Function} [extractMetadata] - Optional function to extract metadata from req/res
 */
export const logAction = (action, extractMetadata = null) => {
  return (req, res, next) => {
    // We want to log the action *after* the response has been sent to avoid blocking
    // and to ensure we can capture response data if needed
    res.on("finish", async () => {
      // Only log successful actions or specific tracking
      // if (res.statusCode >= 400) return; 

      try {
        const userId = req.user ? req.user._id : null;
        let metadata = {};
        
        if (extractMetadata && typeof extractMetadata === 'function') {
          try {
            metadata = extractMetadata(req, res);
          } catch (e) {
            logger.warn(`Failed to extract metadata for audit log ${action}: ${e.message}`);
          }
        }

        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        await AuditLog.create({
          userId,
          action,
          resource: req.originalUrl,
          metadata,
          ipAddress
        });
      } catch (error) {
        logger.error(`Error saving audit log for ${action}:`, error);
      }
    });

    next();
  };
};
