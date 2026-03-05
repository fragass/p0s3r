import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f14",
        panel: "#10151c",
        panel2: "#151a21",
        border: "rgba(255,255,255,.08)",
        text: "#e6edf3",
        muted: "#9da7b3",
        primary: "#58a6ff",
        danger: "#ff7b72"
      }
    }
  },
  plugins: []
} satisfies Config;
