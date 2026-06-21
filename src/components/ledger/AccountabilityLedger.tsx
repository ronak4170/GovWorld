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
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        Loading ledger...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Header */}
      <div>
        <div className="text-slate-100 font-semibold text-sm mb-1">Accountability Ledger</div>
        <div className="text-slate-400 text-xs">
          All construction tasks, contractors, and flags
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-slate-400">Total Budget</div>
            <div className="text-slate-100 font-bold text-base mt-0.5">
              {formatINR(summary.totalBudget)}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-slate-400">Spent to Date</div>
            <div className="text-slate-100 font-bold text-base mt-0.5">
              {formatINR(summary.totalSpent)}
            </div>
          </div>
          <div
            className={`border rounded-lg p-3 ${
              summary.flaggedTasks > 0
                ? 'bg-red-900/20 border-red-700/40'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <div className="text-slate-400">Flagged Tasks</div>
            <div
              className={`font-bold text-base mt-0.5 ${
                summary.flaggedTasks > 0 ? 'text-red-400' : 'text-slate-100'
              }`}
            >
              {summary.flaggedTasks > 0 ? `🚩 ${summary.flaggedTasks}` : summary.flaggedTasks}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-slate-400">Total Delay</div>
            <div
              className={`font-bold text-base mt-0.5 ${
                summary.totalDelayDays > 0 ? 'text-amber-400' : 'text-slate-100'
              }`}
            >
              {summary.totalDelayDays}d
            </div>
          </div>
        </div>
      )}

      {/* Contractor-level flags */}
      {summary?.contractorFlags && summary.contractorFlags.length > 0 && (
        <div className="space-y-2">
          <div className="text-slate-400 text-xs uppercase tracking-wider">Contractor Flags</div>
          {summary.contractorFlags.map((flag, i) => (
            <ContractorFlag
              key={i}
              reason={`${flag.contractor}: ${flag.reason}`}
              severity={flag.severity as 'info' | 'warning' | 'critical'}
            />
          ))}
        </div>
      )}

      {/* Flagged tasks quick-list (if any, shown at top as alerts) */}
      {flaggedTasks.length > 0 && (
        <div className="space-y-1">
          <div className="text-red-400 text-xs uppercase tracking-wider font-semibold">
            Active Flags ({flaggedTasks.length})
          </div>
          {flaggedTasks.map((t) => (
            <button
              key={t.id}
              onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              className="w-full text-left text-xs text-red-300 bg-red-900/10 border border-red-700/30 rounded-lg px-3 py-2 hover:bg-red-900/20 transition-colors"
            >
              🚩 {t.title} — {t.flagReason ?? 'See details'}
            </button>
          ))}
        </div>
      )}

      {/* Full task list */}
      <div className="space-y-2">
        <div className="text-slate-400 text-xs uppercase tracking-wider">
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
  )
}
