import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a rapidly changing value (like keystrokes).
 * It waits for the specified delay to pass without any new updates 
 * before actually changing the returned value.
 *
 * @param {any} value - The state value to debounce (e.g., search term)
 * @param {number} delay - The delay in milliseconds (default: 500ms)
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes BEFORE the delay finishes.
    // This is the core magic that prevents the API call on every keystroke.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}