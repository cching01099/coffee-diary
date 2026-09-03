import { useRef, useState } from 'react'
import { compressImage } from '../lib/utils'

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export default function PhotoDrop({
  photo,
  onChange,
  position = { x: 50, y: 50 },
  onPositionChange,
  zoom = 1,
  onZoomChange,
}) {
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const dragState = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [compressing, setCompressing] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setCompressing(true)
    try {
      onChange(await compressImage(file))
    } catch (err) {
      console.error(err)
      alert('照片處理失敗，請換一張試試')
    } finally {
      setCompressing(false)
      e.target.value = ''
    }
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

  function releaseCapture(e) {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // no-op — capture may already be released
    }
  }

  function handlePointerUp(e) {
    releaseCapture(e)
    if (!dragState.current) {
      if (!photo) inputRef.current?.click()
      return
    }
    const moved = dragState.current.moved
    dragState.current = null
    setDragging(false)
    if (!moved) inputRef.current?.click()
  }

  function handlePointerCancel(e) {
    releaseCapture(e)
    dragState.current = null
    setDragging(false)
  }

  return (
    <div className="mb-5">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: 'none' }}
        className={`relative w-full aspect-square rounded-xl border border-dashed border-line flex items-center justify-center overflow-hidden text-ink-dim text-sm select-none ${
          photo ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
        }`}
      >
        {!photo && <span>{compressing ? '照片處理中...' : '拍照或選擇相簿 📷'}</span>}
        {photo && (
          <>
            <img
              src={photo}
              alt=""
              draggable={false}
              className="w-full h-full object-cover pointer-events-none"
              style={{
                objectPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `${position.x}% ${position.y}%`,
              }}
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

      {photo && onZoomChange && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-ink-dim shrink-0">縮小</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
          <span className="text-xs text-ink-dim shrink-0">放大</span>
        </div>
      )}
    </div>
  )
}
