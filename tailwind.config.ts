import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08090c",
          900: "#0c0e13",
          800: "#11141b",
          700: "#181c25",
          600: "#222633",
          500: "#2c3140",
          400: "#3a4055",
          300: "#7c8295",
          200: "#b6bac6",
          100: "#e6e8ee",
          50:  "#f3f4f8",
        },
        accent: {
          DEFAULT: "#8b9cff",
          muted: "#6473d6",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
