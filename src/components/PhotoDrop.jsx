import { useRef, useState } from 'react'
import { compressImage } from '../lib/utils'

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
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
  const pointersRef = useRef(new Map()) // pointerId -> { x, y }
  const panRef = useRef(null) // single-finger pan in progress
  const pinchRef = useRef(null) // two-finger pinch-zoom in progress
  const hadMultiTouchRef = useRef(false) // this whole gesture ever used 2 fingers
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

  function releaseCapture(e) {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // no-op — capture may already be released
    }
  }

  function startPan(x, y) {
    const rect = containerRef.current.getBoundingClientRect()
    panRef.current = { startX: x, startY: y, startPos: position, rectW: rect.width, rectH: rect.height, moved: false }
  }

  function handlePointerDown(e) {
    if (e.target.closest('button')) return
    if (!photo) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2) {
      hadMultiTouchRef.current = true
      panRef.current = null
      const [p1, p2] = [...pointersRef.current.values()]
      pinchRef.current = { startDist: pointerDistance(p1, p2), startZoom: zoom }
    } else if (pointersRef.current.size === 1) {
      startPan(e.clientX, e.clientY)
    }
  }

  function handlePointerMove(e) {
    if (!pointersRef.current.has(e.pointerId)) return
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointersRef.current.size === 2 && pinchRef.current && onZoomChange) {
      const [p1, p2] = [...pointersRef.current.values()]
      const scale = pointerDistance(p1, p2) / pinchRef.current.startDist
      onZoomChange(clamp(pinchRef.current.startZoom * scale, 1, 3))
      return
    }

    if (!panRef.current || !onPositionChange) return
    const { startX, startY, startPos, rectW, rectH } = panRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panRef.current.moved = true
    if (!panRef.current.moved) return
    setDragging(true)
    onPositionChange({
      x: clamp(startPos.x - (dx / rectW) * 100, 0, 100),
      y: clamp(startPos.y - (dy / rectH) * 100, 0, 100),
    })
  }

  function endPointer(e) {
    releaseCapture(e)
    pointersRef.current.delete(e.pointerId)
    pinchRef.current = null

    if (pointersRef.current.size === 1) {
      // one finger lifted mid-pinch — resume panning fresh from the remaining one
      const [remaining] = pointersRef.current.values()
      startPan(remaining.x, remaining.y)
      return
    }

    if (pointersRef.current.size === 0) {
      const moved = panRef.current?.moved
      const wasMultiTouch = hadMultiTouchRef.current
      panRef.current = null
      hadMultiTouchRef.current = false
      setDragging(false)
      if (!photo || (!moved && !wasMultiTouch)) inputRef.current?.click()
    }
  }

  function handlePointerUp(e) {
    endPointer(e)
  }

  function handlePointerCancel(e) {
    releaseCapture(e)
    pointersRef.current.delete(e.pointerId)
    pinchRef.current = null
    if (pointersRef.current.size === 0) {
      panRef.current = null
      hadMultiTouchRef.current = false
      setDragging(false)
    }
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: 'none' }}
      className={`relative w-full aspect-square rounded-xl border border-dashed border-line flex items-center justify-center overflow-hidden text-ink-dim text-sm mb-5 select-none ${
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
            拖曳調整位置・雙指縮放・點擊更換照片
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
