import { useState } from 'react'
import { useLedgerStore } from '@/store/ledgerStore'
import TaskRow from './TaskRow'
import ContractorFlag from './ContractorFlag'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

export default function AccountabilityLedger() {
  const { tasks, summary, isLoaded, getFlaggedTasks } = useLedgerStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const flaggedTasks = getFlaggedTasks()

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#a78b7d' }}>
        Loading ledger…
      </div>
    )
  }

  const efficiency = summary && summary.totalBudget > 0
    ? Math.max(0, Math.round((1 - summary.totalSpent / summary.totalBudget) * 100 + 50))
    : 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b flex-shrink-0" style={{ borderColor: 'rgba(88,66,55,0.2)' }}>
        <div className="flex items-center gap-2 mb-1" style={{ color: '#ffb690' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>account_balance_wallet</span>
          <span className="text-[10px] tracking-[0.12em] uppercase font-semibold">Financial Audit Cluster</span>
        </div>
        <h2 className="text-lg font-semibold tracking-tight" style={{ color: '#f6ded3' }}>Accountability Ledger</h2>
        <p className="text-xs mt-0.5" style={{ color: '#a78b7d' }}>
          Real-time oversight of infrastructure tasks and fiscal allocation.
        </p>
      </div>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Contractor-level flags */}
        {summary?.contractorFlags && summary.contractorFlags.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: '#a78b7d' }}>Contractor Flags</div>
            {summary.contractorFlags.map((flag, i) => (
              <ContractorFlag
                key={i}
                reason={`${flag.contractor}: ${flag.reason}`}
                severity={flag.severity as 'info' | 'warning' | 'critical'}
              />
            ))}
          </div>
        )}

        {/* Active flags quick-list */}
        {flaggedTasks.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-[0.1em] font-semibold" style={{ color: '#ffb4ab' }}>
              Active Flags ({flaggedTasks.length})
            </div>
            {flaggedTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className="w-full text-left text-xs rounded-lg px-3 py-2 transition-colors flex items-center gap-2"
                style={{ color: '#ffb4ab', backgroundColor: 'rgba(147,0,10,0.12)', border: '1px solid rgba(255,180,171,0.2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>flag</span>
                {t.title} — {t.flagReason ?? 'See details'}
              </button>
            ))}
          </div>
        )}

        {/* Full task list */}
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: '#a78b7d' }}>
            All Tasks ({tasks.length})
          </div>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isExpanded={expandedId === task.id}
              onToggle={() => setExpandedId(expandedId === task.id ? null : task.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer summary stats */}
      {summary && (
        <div className="flex-shrink-0 border-t px-4 py-3 grid grid-cols-3 gap-2" style={{ borderColor: 'rgba(88,66,55,0.2)', backgroundColor: 'rgba(37,25,19,0.6)' }}>
          <Stat label="Expenditure" value={formatINR(summary.totalSpent)} color="#ffb690" />
          <Stat label="Efficiency" value={`${efficiency}%`} color="#4edea3" />
          <Stat
            label="Open Flags"
            value={String(summary.flaggedTasks).padStart(2, '0')}
            color={summary.flaggedTasks > 0 ? '#ffb4ab' : '#a78b7d'}
          />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <span className="block mb-1 text-[9px] uppercase tracking-[0.1em]" style={{ color: '#a78b7d' }}>{label}</span>
      <span className="block text-base font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
