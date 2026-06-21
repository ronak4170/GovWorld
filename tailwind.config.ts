import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // NVIDIA design system — single green accent on black/white/gray chrome
        // (dark-chrome interpretation: control surface uses NVIDIA's black nav/footer palette)
        'primary':               '#76b900', // NVIDIA Green — the one accent
        'primary-container':     '#76b900',
        'on-primary':            '#000000',
        'on-primary-container':  '#000000',
        'primary-dark':          '#5a8d00', // pressed state
        'secondary':             '#76b900',
        'secondary-container':   '#5a8d00',
        'on-secondary':          '#000000',
        'tertiary':              '#bff230', // accent green pale — rare highlight
        'tertiary-container':    '#5a8d00',
        'on-tertiary':           '#000000',
        'error':                 '#e52020',
        'error-container':       '#650b0b',
        'on-error-container':    '#ffffff',
        'surface':               '#000000', // black canvas / chrome
        'surface-variant':       '#1a1a1a', // surface-elevated
        'surface-container':     '#0d0d0d',
        'surface-container-low': '#080808',
        'surface-container-high':'#1a1a1a',
        'surface-container-lowest': '#000000',
        'surface-container-highest': '#242424',
        'surface-dim':           '#000000',
        'surface-bright':        '#242424',
        'on-surface':            '#ffffff',
        'on-surface-variant':    '#a7a7a7', // ash — secondary text on dark
        'outline':               '#5e5e5e', // hairline-strong (dividers on dark)
        'outline-variant':       '#333333',
        'inverse-surface':       '#ffffff',
        'inverse-on-surface':    '#000000',
        'inverse-primary':       '#5a8d00',
        // NVIDIA paper-white surfaces (for any light-mode chapters)
        'canvas':                '#ffffff',
        'surface-soft':          '#f7f7f7',
        'hairline':              '#cccccc',
        'ink':                   '#000000',
        'mute':                  '#757575',
        // Override Tailwind's orange + blue ramps -> NVIDIA green (single accent).
        // Catches every stray orange-*/blue-* utility across legacy components.
        orange: {
          50:  '#f4ffd9',
          100: '#e9ffb0',
          200: '#d4f86a',
          300: '#bff230',
          400: '#9fd400',
          500: '#76b900',
          600: '#5a8d00',
          700: '#4a7300',
          800: '#3a5a00',
          900: '#2a4200',
          950: '#1a2900',
        },
        blue: {
          50:  '#f4ffd9',
          100: '#e9ffb0',
          200: '#d4f86a',
          300: '#bff230',
          400: '#9fd400',
          500: '#76b900',
          600: '#5a8d00',
          700: '#4a7300',
          800: '#3a5a00',
          900: '#2a4200',
          950: '#1a2900',
        },
        // Override Tailwind's slate ramp -> NVIDIA neutral grayscale (black -> white).
        // Kills the legacy navy chrome wherever slate-* utilities are used.
        slate: {
          50:  '#f7f7f7',
          100: '#f0f0f0',
          200: '#e0e0e0',
          300: '#cccccc',
          400: '#a7a7a7',
          500: '#757575',
          600: '#5e5e5e',
          700: '#333333',
          800: '#1a1a1a',
          900: '#0a0a0a',
          950: '#000000',
        },
        // Citizen / semantic status colours (aligned to NVIDIA semantic palette)
        citizen: {
          green: '#76b900',
          amber: '#ef9100',
          red: '#e52020',
          grey: '#757575',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        // NVIDIA: aggressively angular — 2px on every interactive element, circles excepted
        none: '0px',
        xs: '1px',
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        '3xl': '2px',
        full: '9999px',
      },
      backgroundImage: {
        'grid-slate': 'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'typewriter': 'typewriter 0.05s steps(1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(59,130,246,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
        'glow-amber': '0 0 20px rgba(245,158,11,0.3)',
        'glow-red': '0 0 20px rgba(239,68,68,0.3)',
      },
    },
  },
  plugins: [],
  // Safelist dynamic citizen status classes
  safelist: [
    'bg-emerald-500',
    'bg-amber-500',
    'bg-red-500',
    'bg-slate-500',
    'text-emerald-400',
    'text-amber-400',
    'text-red-400',
    'text-slate-400',
    'bg-emerald-900/30',
    'bg-amber-900/30',
    'bg-red-900/30',
    'bg-blue-900/30',
    'border-emerald-500',
    'border-amber-500',
    'border-red-500',
    'border-slate-500',
  ],
}

export default config
