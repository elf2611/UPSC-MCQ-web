import type { Config } from "tailwindcss"
const { fontFamily } = require("tailwindcss/defaultTheme")

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        display: ["var(--font-display)", ...fontFamily.sans],
      },
      colors: {
        border: "rgba(255, 255, 255, 0.06)",
        input: "rgba(255, 255, 255, 0.06)",
        ring: "#FFBF00",
        background: "#0B0B0F",
        foreground: "#EDEDED",
        primary: {
          DEFAULT: "#FFBF00",
          foreground: "#0B0B0F",
        },
        secondary: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          foreground: "#EDEDED",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          foreground: "#A1A1AA",
        },
        accent: {
          DEFAULT: "#FFBF00",
          foreground: "#0B0B0F",
        },
        popover: {
          DEFAULT: "#0E0E12",
          foreground: "#EDEDED",
        },
        card: {
          DEFAULT: "#0E0E12",
          foreground: "#EDEDED",
        },
      },
      boxShadow: {
        'surface': '0 0 0 1px rgba(255, 255, 255, 0.06)',
        'surface-hover': '0 0 0 1px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.2)',
        'surface-glow': '0 0 0 1px rgba(255, 191, 0, 0.3), 0 0 20px rgba(255, 191, 0, 0.08)',
      },
      transitionTimingFunction: {
        'snappy': 'cubic-bezier(.175,.885,.32,1.1)',
        'entrance': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
