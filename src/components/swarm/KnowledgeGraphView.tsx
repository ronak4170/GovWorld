import { useMemo, useState } from 'react'
import type { KnowledgeGraph, GraphNode } from '@/types/swarm'

const TYPE_COLORS: Record<string, string> = {
  CivicOfficial: '#60a5fa',
  Contractor: '#f59e0b',
  NGO: '#34d399',
  MediaOutlet: '#a78bfa',
  Commuter: '#38bdf8',
  Shopkeeper: '#fb923c',
  Resident: '#f87171',
  TransportWorker: '#22d3ee',
  Person: '#94a3b8',
  Organization: '#cbd5e1',
}

function colorFor(type: string): string {
  return TYPE_COLORS[type] ?? '#94a3b8'
}

export default function KnowledgeGraphView({ graph }: { graph: KnowledgeGraph }) {
  const [hover, setHover] = useState<GraphNode | null>(null)

  const nodeById = useMemo(() => {
    const m = new Map<string, GraphNode>()
    for (const n of graph.nodes) m.set(n.id, n)
    return m
  }, [graph])

  const types = useMemo(() => {
    const s = new Set(graph.nodes.map((n) => n.type))
    return [...s]
  }, [graph])

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <svg viewBox="0 0 1000 720" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* edges */}
        {graph.edges.map((e) => {
          const s = nodeById.get(e.source)
          const t = nodeById.get(e.target)
          if (!s || !t || s.x == null || t.x == null) return null
          return (
            <line
              key={e.id}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              stroke="#334155"
              strokeWidth={0.8}
              strokeOpacity={0.5}
            />
          )
        })}
        {/* nodes */}
        {graph.nodes.map((n) => {
          if (n.x == null || n.y == null) return null
          const isPolicy = n.id === 'POLICY'
          const r = isPolicy ? 16 : n.citizenId ? 7 : 11
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
            >
              <circle
                r={r}
                fill={colorFor(n.type)}
                stroke={isPolicy ? '#f8fafc' : '#0f172a'}
                strokeWidth={isPolicy ? 2 : 1}
                opacity={hover && hover.id !== n.id ? 0.55 : 1}
              />
              {(isPolicy || !n.citizenId) && (
                <text
                  x={0}
                  y={r + 11}
                  textAnchor="middle"
                  className="pointer-events-none"
                  fill="#cbd5e1"
                  fontSize={isPolicy ? 13 : 9}
                  fontWeight={isPolicy ? 700 : 500}
                >
                  {n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* legend */}
      <div className="absolute left-3 top-3 rounded-lg border border-slate-700 bg-slate-900/80 p-2 backdrop-blur">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Entity types</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {types.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(t) }} />
              <span className="text-[10px] text-slate-300">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* stats */}
      <div className="absolute right-3 top-3 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-right backdrop-blur">
        <div className="text-lg font-bold text-blue-300">{graph.nodes.length}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">entities</div>
        <div className="mt-1 text-lg font-bold text-emerald-300">{graph.edges.length}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-400">relationships</div>
      </div>

      {/* hover card */}
      {hover && (
        <div className="absolute bottom-3 left-3 max-w-sm rounded-lg border border-slate-600 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(hover.type) }} />
            <span className="font-semibold text-slate-100">{hover.label}</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">{hover.type}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{hover.summary}</p>
        </div>
      )}
    </div>
  )
}
