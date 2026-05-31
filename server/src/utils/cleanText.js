/**
 * Cleans and normalizes Job Description text.
 * - Removes excessive whitespace and newlines.
 * - Normalizes bullets and list characters.
 * - Trims the final result.
 * 
 * @param {string} text - The raw JD text.
 * @returns {string} - The cleaned text.
 */
export const cleanJDText = (text = "") => {
  if (typeof text !== "string") return "";

  return text
    .replace(/[•\-*]/g, "")        // Remove bullet points first
    .replace(/[\r\n]+/g, " ")      // Replace newlines with spaces
    .replace(/\s+/g, " ")           // Collapse multiple spaces to single space
    .trim();
};
