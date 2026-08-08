/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FDF6EC",
        bark: "#2D1F1A",
        "bark-light": "#5C3D2E",
        clay: "#C25B4E",
        "clay-light": "#E8705A",
        "clay-pale": "#F5E0DC",
        sage: "#2D7D4E",
        "sage-pale": "#D4EDDF",
        warm: "#FFFBF7",
      },
      fontFamily: {
        display: ["Lora", "Georgia", "serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out both",
        "fade-in-d2": "fadeIn 0.55s ease-out 0.2s both",
        "fade-in-d3": "fadeIn 0.55s ease-out 0.45s both",
        "slide-up": "slideUp 0.45s ease-out both",
        "slide-up-d1": "slideUp 0.5s ease-out 0.1s both",
        "slide-up-d2": "slideUp 0.5s ease-out 0.22s both",
        "wobble": "wobble 0.6s ease-in-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        float: "float 3.2s ease-in-out infinite",
        "scale-in-d": "scaleIn 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s both",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { transform: "translateY(18px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        wobble: { "0%,100%": { transform: "rotate(0deg)" }, "25%": { transform: "rotate(-4deg)" }, "75%": { transform: "rotate(4deg)" } },
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.7" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-7px)" } },
        scaleIn: {
          from: { transform: "scale(0.88)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
