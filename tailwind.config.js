/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#080808',
        surface: '#111111',
        card: '#171717',
        line: '#292929',
        red: { DEFAULT: '#FF1744', dark: '#D90429', soft: 'rgba(255,23,68,0.12)' },
        muted: '#A1A1AA',
        ok: '#22C55E',
      },
      // Tighter type scale than Tailwind's default (every text-* class in the app picks this up).
      fontSize: {
        xs: ['0.71875rem', { lineHeight: '1rem' }],      // 11.5px
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],    // 13px
        base: ['0.90625rem', { lineHeight: '1.4rem' }],  // 14.5px
        lg: ['1rem', { lineHeight: '1.5rem' }],          // 16px
        xl: ['1.0625rem', { lineHeight: '1.55rem' }],    // 17px
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
        '3xl': ['1.5rem', { lineHeight: '1.9rem' }],     // 24px
        '4xl': ['1.75rem', { lineHeight: '2.15rem' }],   // 28px
        '5xl': ['2.125rem', { lineHeight: '1.15' }],     // 34px
        '6xl': ['2.625rem', { lineHeight: '1.1' }],      // 42px
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        glow: '0 10px 30px -10px rgba(255,23,68,0.55)',
        card: '0 8px 24px -12px rgba(0,0,0,0.8)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pop: { '0%': { transform: 'scale(.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        enterRight: { '0%': { transform: 'translateX(48px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        enterLeft: { '0%': { transform: 'translateX(-48px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        exitLeft: { '0%': { transform: 'translateX(0)', opacity: '1' }, '100%': { transform: 'translateX(-48px)', opacity: '0' } },
        exitRight: { '0%': { transform: 'translateX(0)', opacity: '1' }, '100%': { transform: 'translateX(48px)', opacity: '0' } },
      },
      animation: {
        pop: 'pop .18s ease-out', slideUp: 'slideUp .22s ease-out',
        enterRight: 'enterRight .28s cubic-bezier(.22,.8,.3,1) both', enterLeft: 'enterLeft .28s cubic-bezier(.22,.8,.3,1) both',
        exitLeft: 'exitLeft .22s ease-in both', exitRight: 'exitRight .22s ease-in both',
      },
    },
  },
  plugins: [],
}
