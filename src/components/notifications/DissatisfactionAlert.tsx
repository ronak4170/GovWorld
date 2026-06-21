import { useEffect, useRef, useState } from 'react'
import { useCitizenStore } from '@/store/citizenStore'
import { useWorldStore } from '@/store/worldStore'

interface AlertState {
  level: 'warning' | 'critical'
  count: number
  names: string[]
}

export default function DissatisfactionAlert() {
  const citizens = useCitizenStore((s) => s.citizens)
  const currentMonth = useWorldStore((s) => s.currentMonth)

  const alertedMonths = useRef<Set<number>>(new Set())
  const notificationPermission = useRef<NotificationPermission>('default')
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [alert, setAlert] = useState<AlertState | null>(null)
  const [visible, setVisible] = useState(false)

  // Request notification permission on first alert
  const requestPermission = async () => {
    if ('Notification' in window && notificationPermission.current === 'default') {
      const permission = await Notification.requestPermission()
      notificationPermission.current = permission
    }
  }

  const fireNotification = (title: string, body: string) => {
    if ('Notification' in window && notificationPermission.current === 'granted') {
      new Notification(title, { body, icon: '/assets/icons/favicon.ico' })
    }
  }

  const dismissAlert = () => {
    setVisible(false)
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current)
      dismissTimer.current = null
    }
  }

  useEffect(() => {
    // Only fire when month changes and citizens are loaded
    if (citizens.length === 0) return
    if (alertedMonths.current.has(currentMonth)) return

    const redCitizens = citizens.filter((c) => c.statusColor === 'red')
    const count = redCitizens.length

    if (count < 3) return

    // Mark this month as alerted
    alertedMonths.current.add(currentMonth)

    const level: 'warning' | 'critical' = count >= 5 ? 'critical' : 'warning'
    const names = redCitizens.map((c) => c.name.split(' ')[0]).slice(0, 8)

    const newAlert: AlertState = { level, count, names }
    setAlert(newAlert)
    setVisible(true)

    // Request browser permission and fire notification
    requestPermission().then(() => {
      if (level === 'critical') {
        fireNotification(
          `⚠️ GOVWORLD Critical Alert — Month ${currentMonth}`,
          `${count} citizens are in crisis: ${names.join(', ')}`
        )
      } else {
        fireNotification(
          `⚡ GOVWORLD Alert — Month ${currentMonth}`,
          `${count} citizens severely impacted: ${names.join(', ')}`
        )
      }
    })

    // Auto-dismiss after 8 seconds
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => {
      setVisible(false)
    }, 8000)

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [currentMonth, citizens])

  if (!visible || !alert) return null

  const isCritical = alert.level === 'critical'

  return (
    <div
      className={`relative mx-3 mt-3 mb-1 rounded-xl border px-4 py-3 flex items-start gap-3 shadow-lg transition-all ${
        isCritical
          ? 'bg-red-900/40 border-red-600 text-red-100'
          : 'bg-amber-900/40 border-amber-600 text-amber-100'
      }`}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <span className="text-lg leading-none mt-0.5 flex-shrink-0">
        {isCritical ? '⚠️' : '⚡'}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug">
          {isCritical
            ? `Critical: ${alert.count} citizens in crisis this month`
            : `Alert: ${alert.count} citizens severely impacted`}
        </p>
        <p className={`text-xs mt-0.5 ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>
          {alert.names.join(', ')}
          {alert.count > 8 ? ` +${alert.count - 8} more` : ''}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismissAlert}
        aria-label="Dismiss alert"
        className={`flex-shrink-0 text-sm leading-none hover:opacity-70 transition-opacity mt-0.5 ${
          isCritical ? 'text-red-300' : 'text-amber-300'
        }`}
      >
        ✕
      </button>
    </div>
  )
}
