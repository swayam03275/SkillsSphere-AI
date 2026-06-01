import axios from 'axios';

import logger from "./logger.js";

/**
 * Executes code using the public Piston API.
 * @param {string} language - The programming language (e.g., 'javascript', 'python', 'cpp')
 * @param {string} code - The source code to execute
 * @returns {Promise<{output: string, isError: boolean}>}
 */
export const executeCode = async (language, code) => {
  try {
    // Map common frontend language names to Piston language identifiers
    const languageMap = {
      javascript: { language: 'javascript', version: '18.15.0' }, // Node.js
      python: { language: 'python', version: '3.10.0' },
      cpp: { language: 'c++', version: '10.2.0' },
      html: { language: 'html', version: '0.0.0' }, // Not executed by Piston usually
      css: { language: 'css', version: '0.0.0' }
    };

    const targetLang = languageMap[language] || { language, version: '*' };

    // HTML/CSS doesn't execute in a standard backend terminal way.
    if (language === 'html' || language === 'css') {
      return { 
        output: "HTML and CSS cannot be executed in the backend terminal. Use a browser preview instead.", 
        isError: true 
      };
    }

    const response = await axios.post('https://emacs.piston.rs/api/v2/execute', {
      language: targetLang.language,
      version: targetLang.version,
      files: [
        {
          content: code
        }
      ]
    });

    const data = response.data;
    
    // Piston API returns compile and run results
    if (data.compile && data.compile.code !== 0) {
      return { output: data.compile.output, isError: true };
    }

    if (data.run) {
      return { 
        output: data.run.output, 
        isError: data.run.code !== 0 
      };
    }

    return { output: "No output returned.", isError: false };

  } catch (error) {
    logger.error("Code execution failed:", error.message);
    
    // Fallback if Piston API is down or unreachable
    if (error.code === 'ENOTFOUND' || error.response?.status >= 500) {
      return {
        output: "Execution Service Unavailable: The remote code execution engine (Piston API) could not be reached.",
        isError: true
      };
    }
    
    return {
      output: error.response?.data?.message || error.message || "Failed to execute code.",
      isError: true
    };
  }
};
