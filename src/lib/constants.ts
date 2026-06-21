// Van Ness Avenue midpoint — San Francisco Complete Streets corridor
export const VAN_NESS_COORDS = {
  lat: 37.7790,
  lng: -122.4193,
  name: 'Van Ness Avenue, San Francisco',
}

// Van Ness Avenue, San Francisco — Market St to Jackson St (N-S corridor)
export const VAN_NESS_ROUTE: [number, number][] = [
  [37.7749, -122.4194],  // Market St / Van Ness — south end
  [37.7765, -122.4199],
  [37.7780, -122.4205],
  [37.7797, -122.4211],
  [37.7814, -122.4217],  // Civic Center / City Hall area
  [37.7831, -122.4223],
  [37.7848, -122.4229],
  [37.7866, -122.4235],
  [37.7883, -122.4241],
  [37.7900, -122.4247],  // Jackson St / Van Ness — north end
]

export const FEATURED_CITIZEN_IDS = ['C001', 'C002', 'C003', 'C004', 'C005', 'C006'] as const

export const STATUS_COLORS = {
  green: { bg: 'bg-emerald-500', text: 'text-emerald-400', bgMuted: 'bg-emerald-900/30', hex: '#76b900' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-400', bgMuted: 'bg-amber-900/30', hex: '#f59e0b' },
  red:   { bg: 'bg-red-500',   text: 'text-red-400',   bgMuted: 'bg-red-900/30',   hex: '#ef4444' },
  grey:  { bg: 'bg-slate-500', text: 'text-slate-400', bgMuted: 'bg-slate-900/30', hex: '#757575' },
} as const

export const COUNCIL_MEMBER_IDS = ['economist', 'advocate', 'engineer', 'watchdog', 'climate'] as const

export const CONSTRUCTION_COLORS: Record<number, string> = {
  1: '#76b900', 2: '#76b900', 3: '#76b900',
  4: '#f59e0b', 5: '#f59e0b', 6: '#f59e0b', 7: '#f59e0b', 8: '#f59e0b',
  9: '#eab308', 10: '#eab308', 11: '#eab308',
  12: '#ffffff',
}

export const SEVERITY_COLORS = {
  info: 'text-blue-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
} as const

// Time frame options for the simulation selector
export const TIME_FRAMES = [
  { label: '30 days',  days: 30,   tick: 1  },
  { label: '60 days',  days: 60,   tick: 2  },
  { label: '90 days',  days: 90,   tick: 3  },
  { label: '6 months', days: 180,  tick: 6  },
  { label: '1 year',   days: 365,  tick: 12 },
  { label: '2 years',  days: 730,  tick: 12 },
  { label: '5 years',  days: 1825, tick: 12 },
] as const

export type TimeFrameLabel = typeof TIME_FRAMES[number]['label']

export const TICK_INTERVAL_MS = 3000
export const VOICE_SILENCE_THRESHOLD_MS = 1500
export const CITIZEN_ROUTE_CYCLE_MS = 60000
export const FEATURED_CITIZEN_DOT_SIZE = 14  // radius px (larger than before)
export const BACKGROUND_CITIZEN_DOT_SIZE = 8  // radius px

export const DEMO_NEIGHBOURHOOD = 'vanness'
export const DEMO_POLICY_BUDGET = 45000000
export const DEMO_TOTAL_MONTHS = 12
export const DEMO_ROAD_NAME = 'Van Ness Avenue'
export const DEMO_ROAD_LENGTH_KM = 2.3

export const PANEL_IDS = {
  COUNCIL: 'council',
  CITIZEN: 'citizen',
  LEDGER: 'ledger',
  VOICE: 'voice',
  POLICY: 'policy',
  EDGE_CASES: 'edge_cases',
  UPDATES: 'updates',
} as const

export const TOAST_DURATION_MS = 4000

export const STATUS_NARRATIVES: Record<string, string> = {
  green: 'Thriving — minimal impact from construction',
  amber: 'Stressed — moderate disruption to daily life',
  red: 'Crisis — severe impact requiring immediate attention',
  grey: 'Displaced or isolated — cut off from normal routine',
}

// Dissatisfaction thresholds for notification triggers
export const DISSATISFACTION_WARN_THRESHOLD = 3   // ≥3 red citizens → warning
export const DISSATISFACTION_CRIT_THRESHOLD = 5   // ≥5 red citizens → critical
