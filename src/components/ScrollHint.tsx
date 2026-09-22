import { useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from 'react'

type Edges = {
  x: boolean
  y: boolean
  left: boolean
  right: boolean
  top: boolean
  bottom: boolean
}

const NONE: Edges = { x: false, y: false, left: false, right: false, top: false, bottom: false }

function readEdges(el: HTMLDivElement): Edges {
  const x = el.scrollLeft
  const y = el.scrollTop
  return {
    x: el.scrollWidth > el.clientWidth + 2,
    y: el.scrollHeight > el.clientHeight + 2,
    left: x > 2,
    right: x + el.clientWidth < el.scrollWidth - 2,
    top: y > 2,
    bottom: y + el.clientHeight < el.scrollHeight - 2,
  }
}

export function ScrollHint({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<Edges>(NONE)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return

    function measure() {
      if (ref.current) setEdges(readEdges(ref.current))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    return () => observer.disconnect()
  }, [])

  function onScroll(e: UIEvent<HTMLDivElement>) {
    setEdges(readEdges(e.currentTarget))
  }

  return (
    <div className="scroll-hint" data-x={edges.x ? '1' : undefined} data-y={edges.y ? '1' : undefined}>
      <div ref={ref} className="table-wrap" tabIndex={0} aria-label="Список проектов, можно прокручивать" onScroll={onScroll}>
        {children}
      </div>
      {edges.left ? (
        <>
          <span className="scroll-fade scroll-fade-left" aria-hidden="true" />
          <span className="scroll-cue scroll-cue-left" aria-hidden="true">
            ‹
          </span>
        </>
      ) : null}
      {edges.right ? (
        <>
          <span className="scroll-fade scroll-fade-right" aria-hidden="true" />
          <span className="scroll-cue scroll-cue-right" aria-hidden="true">
            ›
          </span>
        </>
      ) : null}
      {edges.y ? (
        <>
          <span className="scroll-fade scroll-fade-top" aria-hidden="true" />
          <span className="scroll-fade scroll-fade-bottom" aria-hidden="true" />
          {edges.top ? (
            <span className="scroll-cue scroll-cue-up" aria-hidden="true">
              ˄
            </span>
          ) : null}
          {edges.bottom ? (
            <span className="scroll-cue scroll-cue-down" aria-hidden="true">
              ⌄
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
