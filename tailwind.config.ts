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
        // Stitch / mission-control color tokens
        'primary':               '#ffb690',
        'primary-container':     '#f97316',
        'on-primary':            '#552100',
        'on-primary-container':  '#582200',
        'secondary':             '#4edea3',
        'secondary-container':   '#00a572',
        'on-secondary':          '#003824',
        'tertiary':              '#93ccff',
        'tertiary-container':    '#00a2f4',
        'on-tertiary':           '#003351',
        'error':                 '#ffb4ab',
        'error-container':       '#93000a',
        'on-error-container':    '#ffdad6',
        'surface':               '#1c110b',
        'surface-variant':       '#40322a',
        'surface-container':     '#291d16',
        'surface-container-low': '#251913',
        'surface-container-high':'#352720',
        'surface-container-lowest': '#160c06',
        'surface-container-highest': '#40322a',
        'surface-dim':           '#1c110b',
        'surface-bright':        '#45362f',
        'on-surface':            '#f6ded3',
        'on-surface-variant':    '#e0c0b1',
        'outline':               '#a78b7d',
        'outline-variant':       '#584237',
        'inverse-surface':       '#f6ded3',
        'inverse-on-surface':    '#3c2d26',
        'inverse-primary':       '#9d4300',
        // Citizen status colours
        citizen: {
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          grey: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
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
