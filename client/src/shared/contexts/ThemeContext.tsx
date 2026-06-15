// @ts-nocheck

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const canUseStorage = () => typeof window !== "undefined";

const readStoredTheme = () => {
  if (!canUseStorage()) return "light";

  try {
    return localStorage.getItem("skillssphere.theme") || "light";
  } catch {
    return "light";
  }
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return readStoredTheme();
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.dataset.theme = theme;
    if (canUseStorage()) {
      try {
        localStorage.setItem("skillssphere.theme", theme);
      } catch {
        // Ignore storage failures; theme still applies in memory.
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
