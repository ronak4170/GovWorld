interface Props {
  reason: string
  severity?: 'info' | 'warning' | 'critical'
}

const STYLES: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  info: { color: '#93ccff', bg: 'rgba(0,162,244,0.12)', border: 'rgba(147,204,255,0.3)', icon: 'info' },
  warning: { color: '#ffb690', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', icon: 'warning' },
  critical: { color: '#ffb4ab', bg: 'rgba(147,0,10,0.2)', border: 'rgba(255,180,171,0.3)', icon: 'flag' },
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
