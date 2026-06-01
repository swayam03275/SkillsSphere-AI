import { GoogleGenerativeAI } from "@google/generative-ai";

import logger from "./logger.js";

/**
 * Service to interact with the Gemini API for text generation tasks.
 */

// Initialize the Google Generative AI client
// We initialize it lazily to avoid crashing on startup if the key is missing,
// allowing other non-AI features to work normally.
let genAI = null;

const initializeGemini = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables.");
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Generates a cover letter using the Gemini API.
 * 
 * @param {string} prompt - The prompt containing the JD and resume details.
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
export const generateCoverLetter = async (prompt) => {
  if (!prompt || typeof prompt !== "string") {
    return {
      success: false,
      error: "Invalid or empty prompt provided.",
    };
  }

  try {
    const aiClient = initializeGemini();
    // Using gemini-2.5-flash as it is the standard supported model for this API key
    const model = aiClient.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      return {
        success: false,
        error: "Gemini API returned an empty response.",
      };
    }

    return {
      success: true,
      text: text.trim(),
    };
  } catch (error) {
    logger.error("Gemini API Error:", error.message || error);

    let errorMessage = "Failed to generate cover letter due to an API error.";

    if (error.message && error.message.includes("GEMINI_API_KEY is missing")) {
      errorMessage = "Gemini API key is not configured on the server.";
    } else if (error.status === 429 || (error.message && error.message.includes("quota"))) {
      errorMessage = "Gemini API rate limit or quota exceeded. Please try again later.";
    } else if (error.message && (error.message.includes("fetch failed") || error.message.includes("timeout"))) {
      errorMessage = "Network error or timeout while contacting the Gemini API.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};
