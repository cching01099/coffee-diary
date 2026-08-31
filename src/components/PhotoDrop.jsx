import { useRef, useState } from 'react'

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export default function PhotoDrop({ photo, onChange, position = { x: 50, y: 50 }, onPositionChange }) {
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const dragState = useRef(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleRemove(e) {
    e.stopPropagation()
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handlePointerDown(e) {
    if (e.target.closest('button')) return
    if (!photo) return
    const rect = containerRef.current.getBoundingClientRect()
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPos: position,
      rectW: rect.width,
      rectH: rect.height,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!dragState.current || !onPositionChange) return
    const { startX, startY, startPos, rectW, rectH } = dragState.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragState.current.moved = true
    if (!dragState.current.moved) return
    setDragging(true)
    onPositionChange({
      x: clamp(startPos.x - (dx / rectW) * 100, 0, 100),
      y: clamp(startPos.y - (dy / rectH) * 100, 0, 100),
    })
  }

  function handlePointerUp() {
    if (!dragState.current) {
      if (!photo) inputRef.current?.click()
      return
    }
    const moved = dragState.current.moved
    dragState.current = null
    setDragging(false)
    if (!moved) inputRef.current?.click()
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none' }}
      className={`relative w-full aspect-[1.6] rounded-xl border border-dashed border-line flex items-center justify-center overflow-hidden text-ink-dim text-sm mb-5 select-none ${
        photo ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
      }`}
    >
      {!photo && <span>拍照或選擇相簿 📷</span>}
      {photo && (
        <>
          <img
            src={photo}
            alt=""
            draggable={false}
            className="w-full h-full object-cover pointer-events-none"
            style={{ objectPosition: `${position.x}% ${position.y}%` }}
          />
          <div className="absolute bottom-0 left-0 right-0 py-1.5 text-center bg-black/45 text-white text-[11.5px]">
            拖曳調整位置・點擊更換照片
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-[26px] h-[26px] rounded-full bg-black/55 text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}
