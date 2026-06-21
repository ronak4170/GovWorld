interface Props {
  reason: string
  severity?: 'info' | 'warning' | 'critical'
}

export default function ContractorFlag({ reason, severity = 'warning' }: Props) {
  const styles = {
    info: 'bg-blue-900/20 border-blue-700/40 text-blue-300',
    warning: 'bg-amber-900/20 border-amber-700/40 text-amber-300',
    critical: 'bg-red-900/20 border-red-700/40 text-red-300',
  }
  const icons = { info: 'ℹ', warning: '⚠', critical: '🚩' }

  return (
    <div className={`flex gap-2 items-start text-xs rounded-lg p-2 border ${styles[severity]}`}>
      <span className="flex-shrink-0">{icons[severity]}</span>
      <span>{reason}</span>
    </div>
  )
}
