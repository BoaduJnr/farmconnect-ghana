import type { Config } from 'tailwindcss';

// Palette lifted from the Figma Make prototype (FarmConnect Ghana.dc.html) for visual
// continuity — see plan section 3. Not a pixel-match requirement, just a shared vocabulary.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1B7A3D',
          dark: '#0F5C2C',
          light: '#A7E8B8',
          surface: '#EAF4EC',
        },
        bg: '#F4F7F2',
        ink: '#16241C',
        muted: '#5C6B61',
        gold: '#F6C453',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        num: ['"Space Grotesk"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
