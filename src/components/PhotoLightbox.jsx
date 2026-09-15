import { useEffect, useRef } from 'react'

const SWIPE_THRESHOLD = 40

export default function PhotoLightbox({ photos, index, onClose, onNavigate }) {
  const dragStartX = useRef(null)

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
        src={photos[index]}
        alt=""
        draggable={false}
        className="max-w-full max-h-full object-contain"
        style={{ touchAction: 'pan-y' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          dragStartX.current = e.clientX
        }}
        onPointerUp={(e) => {
          if (dragStartX.current == null) return
          const delta = e.clientX - dragStartX.current
          dragStartX.current = null
          if (Math.abs(delta) < SWIPE_THRESHOLD) return
          if (delta < 0 && index < photos.length - 1) onNavigate(index + 1)
          else if (delta > 0 && index > 0) onNavigate(index - 1)
        }}
      />

      {photos.length > 1 && (
        <div className="absolute bottom-4 text-white/80 text-xs">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
