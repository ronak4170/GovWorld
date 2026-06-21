/**
 * NVIDIA's signature ornamental motif: a small solid-green square anchored to
 * one corner of a card. Size and colour are constant per the design system;
 * only the corner position varies. Requires a `position: relative` parent.
 */
interface CornerSquareProps {
  /** Which corner to anchor to. Default top-left, per NVIDIA resource cards. */
  position?: 'tl' | 'tr' | 'bl' | 'br'
  /** Square edge length in px. 12 on standard cards, 16 on hero callouts. */
  size?: number
}

const POSITION: Record<NonNullable<CornerSquareProps['position']>, string> = {
  tl: 'top-0 left-0',
  tr: 'top-0 right-0',
  bl: 'bottom-0 left-0',
  br: 'bottom-0 right-0',
}

export default function CornerSquare({ position = 'tl', size = 12 }: CornerSquareProps) {
  return (
    <span
      aria-hidden
      className={`absolute ${POSITION[position]} z-10 pointer-events-none`}
      style={{ width: size, height: size, backgroundColor: '#76b900' }}
    />
  )
}
