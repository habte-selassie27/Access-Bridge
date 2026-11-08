/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        ethiopic: ["var(--font-ethiopic)", "system-ui", "sans-serif"],
      },
      colors: {
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          foreground: "var(--accent-foreground)",
        },
        background: "var(--background)",
        surface: {
          DEFAULT: "var(--surface)",
          muted: "var(--surface-muted)",
        },
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        border: "var(--border)",
        ring: "var(--focus)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
      },
      spacing: {
        0: "0px",
        1: "2px",
        2: "4px",
        3: "6px",
        4: "8px",
        5: "10px",
        6: "12px",
        8: "16px",
        10: "20px",
        12: "24px",
        16: "32px",
        20: "40px",
        24: "48px",
        32: "64px",
        40: "80px",
        48: "96px",
        56: "112px",
        64: "128px",
      },
      borderRadius: {
        card: "16px",
        md: "8px",
        lg: "12px",
        full: "9999px",
      },
      fontSize: {
        base: ["18px", { lineHeight: "1.6" }],
        sm: ["16px", { lineHeight: "1.5" }],
        lg: ["20px", { lineHeight: "1.6" }],
        xl: ["24px", { lineHeight: "1.5" }],
        "2xl": ["30px", { lineHeight: "1.4" }],
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
      animation: {
        none: "none",
      },
    },
  },
  plugins: [],
}
