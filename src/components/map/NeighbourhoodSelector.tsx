// NeighbourhoodSelector.tsx — OWNED BY Map Agent
// Full-screen splash shown before the map loads in demo mode.
// Lets the judge immediately load the pre-computed Van Ness Avenue scenario.
// Calls onSelect() to signal App.tsx to begin loading demo data.

import { useState, KeyboardEvent } from 'react'

interface Props {
  onSelect: (neighbourhood?: string) => void
}

const DEMO_LABEL = 'Van Ness Avenue, San Francisco'
const DEMO_DESCRIPTION = 'Van Ness Complete Streets · $45M · 12-month simulation'

export default function NeighbourhoodSelector({ onSelect }: Props) {
  const [input, setInput] = useState(DEMO_LABEL)
  const [isFocused, setIsFocused] = useState(false)

  const handleLoad = () => {
    onSelect(input.trim() || DEMO_LABEL)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLoad()
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/98 z-50">
      {/* Background gradient decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        {/* Wordmark */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">GOVWORLD</h1>
          <p className="text-slate-400 text-sm mt-1">
            The Living City — Real-Time Policy Simulator
          </p>
        </div>

        {/* Feature bullets */}
        <ul className="text-slate-500 text-xs space-y-1 mb-6">
          {[
            '50 AI citizens with real lives and daily routes',
            '5-agent adversarial policy council',
            '12-month simulation with live map changes',
            'Voice chat with any citizen at any moment',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">›</span>
              {item}
            </li>
          ))}
        </ul>

        {/* Input */}
        <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2 font-medium">
          Neighbourhood
        </label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={[
            'w-full bg-slate-800 border rounded-lg px-4 py-3',
            'text-slate-100 text-sm placeholder-slate-500',
            'focus:outline-none transition-colors mb-4',
            isFocused ? 'border-blue-500' : 'border-slate-600',
          ].join(' ')}
          placeholder="Enter neighbourhood or postcode"
          aria-label="Neighbourhood input"
        />

        {/* CTA */}
        <button
          onClick={handleLoad}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          Load Demo — Van Ness, San Francisco
        </button>

        {/* Demo description */}
        <div className="mt-4 bg-slate-800/60 border border-slate-700/60 rounded-lg px-4 py-3">
          <p className="text-slate-300 text-xs font-medium">{DEMO_LABEL}</p>
          <p className="text-slate-500 text-xs mt-0.5">{DEMO_DESCRIPTION}</p>
        </div>

        <p className="text-slate-600 text-xs text-center mt-4">
          Demo mode — all data pre-computed · zero API calls during judging
        </p>
      </div>
    </div>
  )
}
