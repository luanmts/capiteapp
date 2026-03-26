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
        primary: "#02BC17",
        background: "#0d0f17",
        card: "#13161f",
        "text-tint": "#6b7280",
        "gray-medium": "#1e2130",
        "gray-dark": "#161820",
        "primary-yellow": "#f59e0b",
        "primary-red": "#e23838",
      },
      borderColor: {
        border: "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
