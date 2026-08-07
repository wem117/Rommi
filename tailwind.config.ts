import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Brand teal lightened for text over photography — see globals.css.
          "on-dark": "hsl(var(--primary-on-dark))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        "surface-muted": "hsl(var(--surface-muted))",
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))"
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        // Cards previously reached for `rounded-[1.75rem]` as an arbitrary
        // value. Named so the corner radius of a card is a decision recorded in
        // one place rather than a magic number copied between files.
        card: "1.5rem"
      },
      /**
       * Elevation scale.
       *
       * There used to be exactly one shadow — `0 18px 45px rgba(...,0.08)` — and
       * it was applied to everything: resting cards, hovered cards, dropdowns,
       * panels. A single 45px blur at rest is why the surface read as flat-but-
       * blurry rather than layered, and it left no way to say "this is lifted"
       * on hover, so the card fell back to Tailwind's default `shadow-xl`, which
       * is a cool grey unrelated to this palette.
       *
       * Two layers per step: a tight contact shadow that defines the edge, and a
       * wider ambient one that gives depth. Both are warm (matching the cream
       * background's hue rather than neutral black) — a cool grey shadow over a
       * warm surface is the specific thing that reads as "unfinished".
       */
      boxShadow: {
        // Retained: heavily used across the app, now the resting card depth.
        soft: "0 1px 2px rgba(28, 20, 12, 0.04), 0 8px 24px -12px rgba(28, 20, 12, 0.10)",
        // Inputs, chips, and anything that should read as *on* the surface.
        "elev-1": "0 1px 2px rgba(28, 20, 12, 0.05)",
        // Resting cards.
        "elev-2": "0 1px 2px rgba(28, 20, 12, 0.04), 0 8px 24px -12px rgba(28, 20, 12, 0.10)",
        // Hover / focus lift.
        "elev-3": "0 2px 4px rgba(28, 20, 12, 0.05), 0 16px 32px -12px rgba(28, 20, 12, 0.16)",
        // Dropdowns, popovers, sticky bars.
        "elev-4": "0 4px 8px rgba(28, 20, 12, 0.06), 0 24px 48px -16px rgba(28, 20, 12, 0.22)",
        // Modals and dialogs only.
        "elev-5": "0 8px 16px rgba(28, 20, 12, 0.08), 0 40px 72px -24px rgba(28, 20, 12, 0.28)"
      },
      fontFamily: {
        body: ["var(--font-inter)", "Inter", "sans-serif"],
        heading: ["var(--font-manrope)", "Manrope", "sans-serif"]
      },
      /**
       * Display sizes with optical tracking.
       *
       * Tailwind's defaults keep letter-spacing at 0 all the way up, which is
       * correct for body copy and visibly loose for headlines — the reason large
       * type here looked "default" rather than designed. Tightening as size
       * grows (and loosening slightly for small caps-y labels) is the single
       * cheapest typographic upgrade available, and it costs no bytes.
       */
      fontSize: {
        "display-xl": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.032em", fontWeight: "800" }],
        "display-lg": ["2.75rem", { lineHeight: "1.08", letterSpacing: "-0.028em", fontWeight: "800" }],
        "display-md": ["2.125rem", { lineHeight: "1.12", letterSpacing: "-0.024em", fontWeight: "700" }],
        "display-sm": ["1.625rem", { lineHeight: "1.2", letterSpacing: "-0.018em", fontWeight: "700" }],
        // Uppercase metadata labels need the opposite treatment.
        eyebrow: ["0.6875rem", { lineHeight: "1", letterSpacing: "0.08em", fontWeight: "600" }]
      },
      transitionTimingFunction: {
        // One easing for UI motion. Ease-out only: things arrive quickly and
        // settle, which reads as responsive rather than animated.
        ui: "cubic-bezier(0.22, 0.61, 0.36, 1)"
      },
      transitionDuration: {
        // Fast enough to feel instant, slow enough to be perceived as motion.
        ui: "180ms"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
