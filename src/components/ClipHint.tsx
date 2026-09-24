import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  text: string
  className?: string
}

export function ClipHint({ text, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [clipped, setClipped] = useState(false)
  const [tip, setTip] = useState<{
    top: number
    left: number
    maxWidth: number
    above: boolean
  } | null>(null)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    function measure() {
      if (!ref.current) return
      setClipped(ref.current.scrollWidth > ref.current.clientWidth + 1)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [text])

  function show() {
    const node = ref.current
    if (!node || !clipped || !text || text === '—') return
    const box = node.getBoundingClientRect()
    const gap = 8
    const maxWidth = Math.min(420, window.innerWidth - 24)
    let left = box.left
    if (left + maxWidth > window.innerWidth - 12) left = Math.max(12, window.innerWidth - maxWidth - 12)
    const below = box.bottom + gap
    const above = below + 140 > window.innerHeight
    const top = above ? Math.max(12, box.top - gap) : below
    setTip({ top, left, maxWidth, above })
  }

  return (
    <>
      <span
        ref={ref}
        className={`cell-clip${className ? ` ${className}` : ''}`}
        onMouseEnter={show}
        onMouseLeave={() => setTip(null)}
      >
        {text}
      </span>
      {tip
        ? createPortal(
            <div
              className="cell-pop"
              style={{
                top: tip.top,
                left: tip.left,
                maxWidth: tip.maxWidth,
                transform: tip.above ? 'translateY(-100%)' : undefined,
              }}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
