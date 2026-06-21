import type { LedgerTask } from '@/types/ledger'
import ContractorFlag from './ContractorFlag'
import WorkerAssignment from './WorkerAssignment'

interface Props {
  task: LedgerTask
  isExpanded: boolean
  onToggle: () => void
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Initializing', color: '#93ccff', bg: 'rgba(0,162,244,0.1)', border: 'rgba(147,204,255,0.2)' },
  active: { label: 'In Progress', color: '#4edea3', bg: 'rgba(78,222,163,0.1)', border: 'rgba(78,222,163,0.2)' },
  delayed: { label: 'Delayed', color: '#ffb4ab', bg: 'rgba(147,0,10,0.2)', border: 'rgba(255,180,171,0.2)' },
  flagged: { label: 'Flagged', color: '#ffb4ab', bg: 'rgba(147,0,10,0.2)', border: 'rgba(255,180,171,0.2)' },
  complete: { label: 'Audited', color: '#4edea3', bg: 'rgba(78,222,163,0.2)', border: 'rgba(78,222,163,0.4)' },
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
  const isFlagged = task.status === 'flagged'
  const progressColor =
    isFlagged || task.status === 'delayed' ? '#ef4444' : task.status === 'complete' ? '#4edea3' : '#f97316'

  return (
    <div
      className={`rounded-lg overflow-hidden transition-all ${isFlagged ? 'flagged-row-glow' : ''}`}
      style={{ border: '1px solid', borderColor: isFlagged ? 'rgba(255,180,171,0.25)' : 'rgba(88,66,55,0.3)' }}
    >
      {/* Summary row — clickable header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-3 transition-colors"
        style={{ backgroundColor: 'rgba(41,29,22,0.6)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(64,50,42,0.4)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(41,29,22,0.6)')}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isFlagged && (
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ffb4ab', fontVariationSettings: "'FILL' 1" }}>
                  flag
                </span>
              )}
              <span className="text-sm font-medium" style={{ color: '#f6ded3' }}>{task.title}</span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border uppercase tracking-wide"
                style={{ color: statusStyle.color, backgroundColor: statusStyle.bg, borderColor: statusStyle.border }}
              >
                {statusStyle.label}
              </span>
              {task.delayDays > 0 && (
                <span className="text-[10px] font-medium" style={{ color: '#ffb690' }}>
                  +{task.delayDays}d delay
                </span>
              )}
            </div>
            <div className="text-xs" style={{ color: '#a78b7d' }}>{task.contractor}</div>
          </div>

          {/* Progress */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold tabular-nums" style={{ color: '#e0c0b1' }}>{task.progressPercent}%</div>
            <div className="w-16 rounded-full h-1.5 mt-1 overflow-hidden" style={{ backgroundColor: 'rgba(64,50,42,0.5)' }}>
              <div className="h-full rounded-full" style={{ width: `${task.progressPercent}%`, backgroundColor: progressColor }} />
            </div>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 pt-3 border-t" style={{ backgroundColor: 'rgba(22,12,6,0.6)', borderColor: 'rgba(88,66,55,0.3)' }}>
          {/* Flag reason */}
          {task.flagReason && <ContractorFlag reason={task.flagReason} severity="critical" />}

          {/* Dates + budget grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Detail label="Projected" value={`${formatDate(task.projectedStartDate)} → ${formatDate(task.projectedEndDate)}`} />
            <Detail label="Actual" value={`${formatDate(task.actualStartDate)} → ${formatDate(task.actualEndDate)}`} />
            <Detail label="Budget" value={formatINR(task.budget)} />
            <div>
              <div className="mb-0.5 flex items-center gap-1" style={{ color: '#a78b7d' }}>
                Spent
                {isOverBudget && (
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#ffb4ab' }}>warning</span>
                )}
              </div>
              <div style={{ color: isOverBudget ? '#ffb4ab' : '#e0c0b1' }}>{formatINR(task.spentToDate)}</div>
            </div>
          </div>

          {/* Budget spend bar */}
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(64,50,42,0.5)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, budgetPercent)}%`, backgroundColor: isOverBudget ? '#ef4444' : '#4edea3' }}
            />
          </div>

          {/* Weather impact */}
          {task.weatherImpactDays > 0 && (
            <div className="text-xs rounded p-2 flex items-center gap-1.5" style={{ color: '#93ccff', backgroundColor: 'rgba(0,162,244,0.1)', border: '1px solid rgba(147,204,255,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>rainy</span>
              {task.weatherImpactDays} workday{task.weatherImpactDays !== 1 ? 's' : ''} lost to weather
            </div>
          )}

          {/* Assigned workers */}
          <div>
            <div className="text-xs mb-1.5 uppercase tracking-wide" style={{ color: '#a78b7d' }}>Assigned Workers</div>
            <WorkerAssignment workerIds={task.assignedWorkers} />
          </div>

          {/* Contractor history */}
          <div className="text-xs rounded p-2 leading-relaxed" style={{ color: '#a78b7d', backgroundColor: 'rgba(64,50,42,0.4)' }}>
            {task.contractorHistory}
          </div>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 uppercase tracking-wide" style={{ color: '#a78b7d' }}>{label}</div>
      <div style={{ color: '#e0c0b1' }}>{value}</div>
    </div>
  )
}
