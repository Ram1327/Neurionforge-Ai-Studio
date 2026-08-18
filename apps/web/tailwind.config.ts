import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--ink)",
        foreground: "var(--paper)",
        ink: "#07090d",
        iron: "#10161f",
        "iron-2": "#1c2634",
        accent: "#4c8dff",
        "accent-2": "#7fb4ff",
        spark: "#9fe0ff",
        steel: "#8a93a3",
        paper: "#eef2f8",
        "paper-dim": "rgba(238, 242, 248, 0.62)",
        live: "#34d399",
        building: "#4c8dff",
        planned: "#8a93a3",
      },
      fontFamily: {
        display: ["var(--font-display)", '"Big Shoulders Display"', '"Arial Narrow"', "sans-serif"],
        sans: ["var(--font-sans)", '"Inter"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", '"IBM Plex Mono"', '"SFMono-Regular"', "monospace"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.35)",
        accent: "0 0 0 1px rgba(76, 141, 255, 0.25), 0 0 26px rgba(76, 141, 255, 0.35), 0 0 56px rgba(76, 141, 255, 0.14)",
      },
    },
  },
  plugins: [],
};
export default config;

