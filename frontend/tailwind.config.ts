import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f7ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c6fb",
          400: "#7ac484",
          500: "#5aae69",
          600: "#4a9e59",
          700: "#3d9e52",
          DEFAULT: "#5aae69",
        },
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["var(--font-inter)", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
