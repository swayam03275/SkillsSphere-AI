// @ts-nocheck

import { useTheme } from "../contexts/ThemeContext";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        fixed top-4 right-4 z-50
        px-4 py-2 rounded-lg
        bg-[var(--surface)] text-[var(--text-main)]
        border border-[var(--border)]
        shadow-[var(--shadow-soft)]
        transition-all duration-300
        hover:bg-[var(--surface-hover)]
      "
    >
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
};

export default ThemeToggle;