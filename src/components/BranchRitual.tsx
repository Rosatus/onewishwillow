import { useEffect, useRef, useState } from 'react'

interface BranchRitualProps {
  canBreak: boolean
  onReject: () => void
  onSnap: () => void
}

const HOLD_DURATION = 1600

export default function BranchRitual({ canBreak, onReject, onSnap }: BranchRitualProps) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const [snapped, setSnapped] = useState(false)
  const frameRef = useRef(0)
  const startRef = useRef(0)
  const snappedRef = useRef(false)
  const holdingRef = useRef(false)

  const cancel = () => {
    cancelAnimationFrame(frameRef.current)
    holdingRef.current = false
    if (!snappedRef.current) {
      setHolding(false)
      setProgress(0)
    }
  }

  const start = () => {
    if (snappedRef.current || holdingRef.current) return
    if (!canBreak) {
      onReject()
      return
    }
    setHolding(true)
    holdingRef.current = true
    startRef.current = performance.now()
    const tick = (now: number) => {
      const next = Math.min(1, (now - startRef.current) / HOLD_DURATION)
      setProgress(next)
      if (next >= 1) {
        snappedRef.current = true
        holdingRef.current = false
        setHolding(false)
        setSnapped(true)
        onSnap()
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  return (
    <button
      type="button"
      className={`branch-ritual ${holding ? 'is-holding' : ''} ${snapped ? 'is-snapped' : ''}`}
      style={{ '--bend': progress } as React.CSSProperties}
      aria-label="按住折枝，许下愿望"
      aria-disabled={snapped}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        start()
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onBlur={cancel}
      onKeyDown={(event) => {
        if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
          event.preventDefault()
          start()
        }
      }}
      onKeyUp={(event) => {
        if (event.code === 'Space' || event.code === 'Enter') cancel()
      }}
    >
      <div className="branch-ritual__topline">
        <span>02 / 折下柳枝</span>
        <span>{Math.round(progress * 100).toString().padStart(2, '0')}%</span>
      </div>
      <div className="branch-photo" aria-hidden="true">
        <img className="branch-photo__intact branch-photo__intact--left" src="./assets/images/willow-branch.png" alt="" draggable="false" />
        <img className="branch-photo__intact branch-photo__intact--right" src="./assets/images/willow-branch.png" alt="" draggable="false" />
        <span className="branch-photo__stress" />
        <img className="branch-photo__broken branch-photo__broken--left" src="./assets/images/broken-left.png" alt="" draggable="false" />
        <img className="branch-photo__broken branch-photo__broken--right" src="./assets/images/broken-right.png" alt="" draggable="false" />
      </div>
      <div className="branch-ritual__label">
        <span className="hold-ring"><i style={{ transform: `scale(${Math.max(0.06, progress)})` }} /></span>
        <div>
          <strong>{snapped ? '枝条断了' : holding ? '继续按住…' : '按住柳枝，直到折断'}</strong>
          <small>{canBreak ? '约 2 秒 · 松手可取消' : '先写下你的愿望'}</small>
        </div>
      </div>
      <div className="branch-progress"><i style={{ width: `${progress * 100}%` }} /></div>
    </button>
  )
}
