import { useRef } from 'react'

// Draggable light-to-dark slider with discrete snap points — used for 烘焙程度.
export default function RoastSlider({ options, value, onChange }) {
  const trackRef = useRef(null)
  const draggingRef = useRef(false)

  const index = Math.max(0, options.indexOf(value))
  const percent = (index / (options.length - 1)) * 100

  function updateFromClientX(clientX) {
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const nearest = Math.round(ratio * (options.length - 1))
    if (options[nearest] !== value) onChange(options[nearest])
  }

  function handlePointerDown(e) {
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromClientX(e.clientX)
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return
    updateFromClientX(e.clientX)
  }

  function handlePointerUp() {
    draggingRef.current = false
  }

  return (
    <div className="px-2.5 py-1">
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none', background: 'linear-gradient(to right, #EFE3D3, #5C3826)' }}
        className="relative h-2 rounded-full cursor-pointer select-none"
      >
        {options.map((_, i) => (
          <span
            key={i}
            className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-bg pointer-events-none"
            style={{ left: `${(i / (options.length - 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
          />
        ))}
        <div
          className="absolute top-1/2 w-5 h-5 rounded-full bg-card border-2 border-accent shadow pointer-events-none"
          style={{ left: `${percent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex justify-between mt-3">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`text-[11px] ${opt === value ? 'text-accent font-semibold' : 'text-ink-dim'}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
