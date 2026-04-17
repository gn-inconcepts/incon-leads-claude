import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#003C96",
          "primary-hover": "#002E73",
          accent: "#FFCD0E",
          "accent-hover": "#E6B900",
          ink: "#1a1a1a",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      boxShadow: {
        brand: "0 20px 60px -20px rgba(0, 60, 150, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
