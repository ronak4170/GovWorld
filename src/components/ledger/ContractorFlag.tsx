interface Props {
  reason: string
  severity?: 'info' | 'warning' | 'critical'
}

const STYLES: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  info: { color: '#76b900', bg: 'rgba(118,185,0,0.12)', border: 'rgba(118,185,0,0.3)', icon: 'info' },
  warning: { color: '#76b900', bg: 'rgba(118,185,0,0.12)', border: 'rgba(118,185,0,0.3)', icon: 'warning' },
  critical: { color: '#e52020', bg: 'rgba(229,32,32,0.2)', border: 'rgba(229,32,32,0.3)', icon: 'flag' },
}

export default function ContractorFlag({ reason, severity = 'warning' }: Props) {
  const s = STYLES[severity]
  return (
    <div
      className="flex gap-2 items-start text-xs rounded-lg p-2 border"
      style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
    >
      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>
        {s.icon}
      </span>
      <span>{reason}</span>
    </div>
  )
}
