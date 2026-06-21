import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  open: boolean
}

/** Renders full-screen overlays on document.body above Leaflet (z-index 1000) */
export default function FullScreenOverlay({ children, open }: Props) {
  useEffect(() => {
    if (open) {
      document.body.classList.add('debate-open')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.classList.remove('debate-open')
      document.body.style.overflow = ''
    }
    return () => {
      document.body.classList.remove('debate-open')
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[10000] isolate bg-slate-950">{children}</div>,
    document.body,
  )
}
