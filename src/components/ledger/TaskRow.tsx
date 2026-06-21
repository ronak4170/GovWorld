import type { LedgerTask } from '@/types/ledger'
import ContractorFlag from './ContractorFlag'
import WorkerAssignment from './WorkerAssignment'

interface Props {
  task: LedgerTask
  isExpanded: boolean
  onToggle: () => void
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-slate-800 text-slate-400 border-slate-700' },
  active: { label: 'Active', classes: 'bg-blue-900/40 text-blue-300 border-blue-700/40' },
  delayed: { label: 'Delayed', classes: 'bg-amber-900/40 text-amber-300 border-amber-700/40' },
  flagged: { label: 'Flagged', classes: 'bg-red-900/40 text-red-300 border-red-700/40' },
  complete: { label: 'Complete', classes: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' },
}

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function TaskRow({ task, isExpanded, onToggle }: Props) {
  const statusStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending
  const budgetPercent = Math.min(100, (task.spentToDate / task.budget) * 100)
  const isOverBudget = task.spentToDate > task.budget * 1.15

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        task.status === 'flagged' ? 'border-red-700/50' : 'border-slate-700'
      }`}
    >
      {/* Summary row — clickable header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-3 bg-slate-900 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-slate-100 text-sm font-medium">{task.title}</span>
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusStyle.classes}`}
              >
                {task.status === 'flagged' ? '🚩 ' : ''}
                {statusStyle.label}
              </span>
              {task.delayDays > 0 && (
                <span className="text-[10px] text-amber-400 font-medium">
                  +{task.delayDays}d delay
                </span>
              )}
            </div>
            <div className="text-slate-500 text-xs">{task.contractor}</div>
          </div>

          {/* Progress */}
          <div className="text-right flex-shrink-0">
            <div className="text-slate-300 text-sm font-bold">{task.progressPercent}%</div>
            <div className="w-16 bg-slate-700 rounded-full h-1 mt-1">
              <div
                className={`h-1 rounded-full ${
                  task.status === 'flagged'
                    ? 'bg-red-500'
                    : task.status === 'complete'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${task.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 bg-slate-900 border-t border-slate-700/50 space-y-3 pt-3">
          {/* Flag reason */}
          {task.flagReason && (
            <ContractorFlag reason={task.flagReason} severity="critical" />
          )}

          {/* Dates + budget grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500 mb-0.5">Projected</div>
              <div className="text-slate-300">
                {formatDate(task.projectedStartDate)} → {formatDate(task.projectedEndDate)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Actual</div>
              <div className="text-slate-300">
                {formatDate(task.actualStartDate)} → {formatDate(task.actualEndDate)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">Budget</div>
              <div className="text-slate-300">{formatINR(task.budget)}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-0.5">
                Spent{' '}
                {isOverBudget && <span className="text-red-400">⚠</span>}
              </div>
              <div className={isOverBudget ? 'text-red-400' : 'text-slate-300'}>
                {formatINR(task.spentToDate)}
              </div>
            </div>
          </div>

          {/* Budget spend bar */}
          <div className="w-full bg-slate-700 rounded-full h-1">
            <div
              className={`h-1 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, budgetPercent)}%` }}
            />
          </div>

          {/* Weather impact */}
          {task.weatherImpactDays > 0 && (
            <div className="text-xs text-blue-300 bg-blue-900/20 border border-blue-700/30 rounded p-2">
              🌧 {task.weatherImpactDays} workday{task.weatherImpactDays !== 1 ? 's' : ''} lost to weather
            </div>
          )}

          {/* Assigned workers */}
          <div>
            <div className="text-slate-500 text-xs mb-1.5">Assigned Workers</div>
            <WorkerAssignment workerIds={task.assignedWorkers} />
          </div>

          {/* Contractor history */}
          <div className="text-xs text-slate-500 bg-slate-800 rounded p-2 leading-relaxed">
            {task.contractorHistory}
          </div>
        </div>
      )}
    </div>
  )
}
