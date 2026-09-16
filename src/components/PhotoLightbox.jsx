import { useEffect, useRef, useState } from 'react'

const SWIPE_THRESHOLD = 40
const MAX_SCALE = 4

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export default function PhotoLightbox({ photos, index, onClose, onNavigate }) {
  const imgRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isGesturing, setIsGesturing] = useState(false)

  // gesture math needs to read/write scale & translate synchronously as
  // fingers move, faster than state updates re-render — these refs mirror
  // the state values for that, the state itself only drives the CSS
  const scaleRef = useRef(1)
  const translateRef = useRef({ x: 0, y: 0 })
  const pointers = useRef(new Map()) // pointerId -> {x, y}
  const gesture = useRef({ mode: null })

  useEffect(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
    scaleRef.current = 1
    translateRef.current = { x: 0, y: 0 }
  }, [index])

  useEffect(() => {
    if (index == null) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) onNavigate(index + 1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [index, photos, onClose, onNavigate])

  if (index == null) return null

  // how far the (already-scaled) image can be panned before its edge
  // would leave a gap, in each direction — read from the live rendered
  // box so it accounts for the image's own aspect ratio at any scale
  function getPanBounds() {
    const rect = imgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.max(0, (rect.width - window.innerWidth) / 2),
      y: Math.max(0, (rect.height - window.innerHeight) / 2),
    }
  }

  function applyTranslate(next) {
    const bounds = getPanBounds()
    const clamped = { x: clamp(next.x, -bounds.x, bounds.x), y: clamp(next.y, -bounds.y, bounds.y) }
    translateRef.current = clamped
    setTranslate(clamped)
  }

  function handlePointerDown(e) {
    // browsers can reject capture for a pointer they no longer consider
    // active (e.g. a second touch arriving in the same tick as the
    // first) — that's not fatal, so don't let it abort gesture tracking
    try {
      e.target.setPointerCapture(e.pointerId)
    } catch {}
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    setIsGesturing(true)

    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]
      gesture.current = {
        mode: 'pinch',
        startDistance: distance(p1, p2),
        startScale: scaleRef.current,
      }
    } else if (pointers.current.size === 1) {
      gesture.current = {
        mode: scaleRef.current > 1 ? 'pan' : 'swipe',
        startPoint: { x: e.clientX, y: e.clientY },
        startTranslate: translateRef.current,
      }
    }
  }

  function handlePointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (gesture.current.mode === 'pinch' && pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()]
      const nextScale = clamp(
        gesture.current.startScale * (distance(p1, p2) / gesture.current.startDistance),
        1,
        MAX_SCALE,
      )
      scaleRef.current = nextScale
      setScale(nextScale)
      applyTranslate(translateRef.current)
    } else if (gesture.current.mode === 'pan' && pointers.current.size === 1) {
      const { startPoint, startTranslate } = gesture.current
      applyTranslate({
        x: startTranslate.x + (e.clientX - startPoint.x),
        y: startTranslate.y + (e.clientY - startPoint.y),
      })
    }
  }

  function endGesture(e) {
    pointers.current.delete(e.pointerId)
    setIsGesturing(pointers.current.size > 0)

    if (gesture.current.mode === 'swipe' && pointers.current.size === 0) {
      const delta = e.clientX - gesture.current.startPoint.x
      if (Math.abs(delta) >= SWIPE_THRESHOLD) {
        if (delta < 0 && index < photos.length - 1) onNavigate(index + 1)
        else if (delta > 0 && index > 0) onNavigate(index - 1)
      }
      gesture.current = { mode: null }
      return
    }

    if (pointers.current.size === 1) {
      // one finger lifted out of a pinch — keep panning with the other
      const [remaining] = [...pointers.current.values()]
      gesture.current = { mode: 'pan', startPoint: remaining, startTranslate: translateRef.current }
    } else if (pointers.current.size === 0) {
      if (scaleRef.current < 1.05) {
        scaleRef.current = 1
        translateRef.current = { x: 0, y: 0 }
        setScale(1)
        setTranslate({ x: 0, y: 0 })
      }
      gesture.current = { mode: null }
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-3 right-3 w-10 h-10 text-white text-2xl flex items-center justify-center">
        ✕
      </button>

      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(index - 1)
          }}
          className="absolute left-1 w-12 h-12 text-white text-3xl flex items-center justify-center"
        >
          ‹
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(index + 1)
          }}
          className="absolute right-1 w-12 h-12 text-white text-3xl flex items-center justify-center"
        >
          ›
        </button>
      )}

      <img
        ref={imgRef}
        src={photos[index]}
        alt=""
        draggable={false}
        className="max-w-full max-h-full object-contain"
        style={{
          touchAction: 'none',
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isGesturing ? 'none' : 'transform 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
      />

      {photos.length > 1 && (
        <div className="absolute bottom-4 text-white/80 text-xs">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
