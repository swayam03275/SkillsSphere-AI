import { useEffect } from 'react';

/**
 * A custom hook to dynamically update the document title.
 * @param {string} title - The title of the current page.
 */
export const useDocumentTitle = (title) => {
  useEffect(() => {
    // Save the original title
    const originalTitle = document.title;
    
    // Update the title
    if (title) {
      document.title = `${title} | SkillSphere AI`;
    } else {
      document.title = 'SkillSphere AI';
    }

    // Revert to original title on unmount (optional, but good practice)
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
};
