import { STATUS_COLORS } from '@/lib/constants'
import type { CitizenStatus } from '@/types/citizen'

const STATUS_LABELS: Record<CitizenStatus, string> = {
  green: 'Thriving',
  amber: 'Stressed',
  red: 'Crisis',
  grey: 'Displaced',
}

interface Props {
  status: CitizenStatus
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function CitizenStatus({ status, showLabel = false, size = 'md' }: Props) {
  const colors = STATUS_COLORS[status]
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`${dotSize} rounded-full flex-shrink-0`}
        style={{ backgroundColor: colors.hex }}
        aria-label={STATUS_LABELS[status]}
      />
      {showLabel && (
        <span className={`text-xs font-medium ${colors.text}`}>{STATUS_LABELS[status]}</span>
      )}
    </div>
  )
}
