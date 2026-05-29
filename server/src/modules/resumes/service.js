import Resume from "../../database/models/Resume.js";
import SemanticCache from "../../database/models/SemanticCache.js";

/**
 * Upsert a resume for a user.
 * Each user keeps only one stored parsed resume record, 
 * always replacing the previous one with the most recent upload.
 * 
 * @param {string} userId - The ID of the user
 * @param {Object} resumeData - The parsed resume data to save
 * @param {boolean} includeText - Whether to include protected fields in the return (default: false)
 * @returns {Promise<Object>} The saved resume document
 */
export const upsertResume = async (userId, resumeData, includeText = false) => {
  // If the payload specifies an existing resume ID, we update that document
  if (resumeData._id) {
    const query = Resume.findByIdAndUpdate(
      resumeData._id,
      resumeData,
      { new: true, runValidators: true }
    );
    if (includeText) {
      query.select("+resumeText");
    }
    return await query;
  }

  // Otherwise, we are uploading a new resume version.
  // First, deactivate all existing resumes for this user.
  await Resume.updateMany({ user: userId }, { isActive: false });

  const title = resumeData.file?.originalName || "My Resume";

  const newResume = new Resume({
    ...resumeData,
    user: userId,
    title,
    isActive: true,
  });

  await newResume.save();

  const query = Resume.findById(newResume._id);
  if (includeText) {
    query.select("+resumeText");
  } else {
    query.select("-resumeText");
  }

  return await query;
};

/**
 * Fetch the user's latest (and only) parsed resume record.
 * Enforces ownership by filtering by userId and excludes raw resumeText.
 * 
 * @param {string} userId - The ID of the user
 * @param {boolean} includeText - Whether to include the raw resume text (default: false)
 * @returns {Promise<Object|null>} The resume document or null if not found
 */
export const getLatestResume = async (userId, includeText = false) => {
  let query = Resume.findOne({ user: userId, isActive: true });
  
  if (!includeText) {
    query.select("-resumeText");
  } else {
    query.select("+resumeText"); // Explicitly include if it was marked as select: false
  }

  let active = await query.lean();
  if (!active) {
    // Fallback to the latest created resume if none is marked active
    const fallbackQuery = Resume.findOne({ user: userId }).sort({ createdAt: -1 });
    if (!includeText) {
      fallbackQuery.select("-resumeText");
    } else {
      fallbackQuery.select("+resumeText");
    }
    active = await fallbackQuery.lean();
    if (active) {
      // Auto-set the latest one as active in the background
      await Resume.updateOne({ _id: active._id }, { isActive: true });
      active.isActive = true;
    }
  }

  return active;
};

/**
 * Find a cached analysis result by resume and job description hashes.
 * 
 * @param {string} resumeHash - SHA-256 hash of resume text
 * @param {string} jdHash - SHA-256 hash of job description
 * @returns {Promise<Object|null>} The cached document or null
 */
export const findCachedAnalysis = async (resumeHash, jdHash) => {
  return await SemanticCache.findOne({ resumeHash, jdHash }).lean();
};

/**
 * Save an analysis result to semantic cache.
 * 
 * @param {Object} cacheData - The caching payload
 * @returns {Promise<Object>} The saved cache document
 */
export const saveCachedAnalysis = async (cacheData) => {
  return await SemanticCache.findOneAndUpdate(
    { resumeHash: cacheData.resumeHash, jdHash: cacheData.jdHash },
    cacheData,
    { new: true, upsert: true, runValidators: true }
  );
};

/**
 * Validate resume text properties (e.g. word count).
 * Returns true if the resume text is extremely short (potentially a scanned PDF).
 * 
 * @param {string} text - Extracted resume text
 * @returns {boolean} isScannedPdf
 */
export const validateExtractedText = (text) => {
  if (!text) return true;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return wordCount < 20;
};
