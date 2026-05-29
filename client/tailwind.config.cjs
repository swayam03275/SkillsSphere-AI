/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.25rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '3rem',
          '2xl': '4rem',
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        heading: ["Outfit", "Inter", "system-ui"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        primary: "#4F46E5",
        "primary-hover": "#4338CA",
        secondary: "#10B981",
        "dark-bg": "#0B0F19",
        surface: "#131B2C",
        "surface-hover": "#1A243A",
        "text-main": "#F3F4F6",
        "text-muted": "#9CA3AF",
        border: "#1F2937",
      },
      keyframes: {
        scaleIn: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        slideFadeIn: {
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        spin: "spin 0.75s linear infinite",
        scaleIn: "scaleIn 0.3s ease-out forwards",
        slideFadeIn: "slideFadeIn 0.5s ease forwards",
        fadeIn: "fadeIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

