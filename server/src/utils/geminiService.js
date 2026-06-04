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

/**
 * Generates a detailed learning roadmap using the Gemini API.
 * 
 * @param {string} targetRole - The user's target job role.
 * @param {Array} topics - The initial topics/gaps identified from resume analysis.
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const generateDetailedRoadmap = async (targetRole, topics) => {
  try {
    const aiClient = initializeGemini();
    const model = aiClient.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const topicsList = topics.map(t => typeof t === "string" ? t : t.text).join(", ");

    const prompt = `
You are an expert career coach and technical mentor. Create a highly structured, step-by-step learning roadmap for a user whose target role is "${targetRole}".
They have identified the following skill gaps from their resume analysis: ${topicsList}.

Based on these gaps, generate a comprehensive roadmap containing 5 to 10 actionable milestones.
For each milestone, you must determine if it is a "learning" task (e.g., studying a concept) or a "contribution" task (e.g., building a project, contributing to open source).
Also, provide 2 to 3 high-quality study resources (videos, articles, or documentation) to help the user achieve that milestone.

Return the result STRICTLY as a JSON array of objects, matching this exact schema for each object:
{
  "topicName": "String (A clear, concise milestone title)",
  "type": "String ('learning' or 'contribution')",
  "resources": [
    {
      "title": "String (Title of the resource)",
      "url": "String (A generic but relevant URL, e.g., 'https://developer.mozilla.org/...' or 'https://www.youtube.com/results?search_query=...')",
      "type": "String ('video', 'article', or 'documentation')"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      return { success: false, error: "Empty response from Gemini." };
    }

    const parsedData = JSON.parse(text);
    return { success: true, data: parsedData };

  } catch (error) {
    logger.error("Gemini API Error (Roadmap):", error.message || error);
    return { success: false, error: "Failed to generate detailed roadmap." };
  }
};
