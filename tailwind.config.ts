import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.{css}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        "deep-navy": "var(--color-deep-navy)",
        "electric-purple": "var(--color-electric-purple)",
        "gold-csk": "var(--color-gold-csk)",
        "neon-pink": "var(--color-neon-pink)",
        "cyber-blue": "var(--color-electric-blue)",
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "4px",
        md: "4px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        "3xl": "4px",
        full: "9999px",
      },
      backgroundImage: {
        "cyber-gradient": "var(--background-image-cyber-gradient)",
        "gold-gradient": "var(--background-image-gold-gradient)",
        "navy-gradient": "var(--background-image-navy-gradient)",
      },
      boxShadow: {
        "neon-purple": "var(--shadow-neon-purple)",
        "neon-pink": "var(--shadow-neon-pink)",
      },
    },
  },
  plugins: [],
};
export default config;
