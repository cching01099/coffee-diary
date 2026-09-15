import { useRef, useState } from 'react'
import { compressImage } from '../lib/utils'

const MAX_PHOTOS = 5

// grows the textarea to fit its content instead of leaving a fixed-height
// box with empty space below whatever's been typed
function autoGrow(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function PostComposer({ isOpen, onClose, onSubmit }) {
  const [content, setContent] = useState('')
  const [photos, setPhotos] = useState([])
  const [photoThumbs, setPhotoThumbs] = useState([])
  const [compressing, setCompressing] = useState(false)
  const [posting, setPosting] = useState(false)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  if (!isOpen) return null

  function reset() {
    setContent('')
    setPhotos([])
    setPhotoThumbs([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleClose() {
    if (posting) return
    reset()
    onClose()
  }

  async function handleFiles(e) {
    const files = [...e.target.files].slice(0, MAX_PHOTOS - photos.length)
    if (files.length === 0) return
    setCompressing(true)
    try {
      const compressed = await Promise.all(
        files.map((file) =>
          Promise.all([
            compressImage(file, { maxDimension: 1280, quality: 0.8 }),
            compressImage(file, { maxDimension: 480, quality: 0.7 }),
          ]),
        ),
      )
      setPhotos((prev) => [...prev, ...compressed.map(([full]) => full)])
      setPhotoThumbs((prev) => [...prev, ...compressed.map(([, thumb]) => thumb)])
    } catch (err) {
      console.error(err)
      alert('照片處理失敗，請換一張試試')
    } finally {
      setCompressing(false)
      e.target.value = ''
    }
  }

  function removePhoto(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
    setPhotoThumbs((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!content.trim() && photos.length === 0) return
    setPosting(true)
    const error = await onSubmit({ content: content.trim(), photos, photoThumbs })
    setPosting(false)
    if (error) {
      alert(`發布失敗：${error.message}`)
      return
    }
    reset()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-bg rounded-t-[20px] max-h-[88dvh] overflow-y-auto pb-8">
        <div className="sticky top-0 z-10 bg-bg flex justify-between items-center px-5 py-5 border-b border-line">
          <button onClick={handleClose} disabled={posting} className="px-3.5 py-1.5 rounded-full border border-line text-ink-dim text-sm disabled:opacity-50">
            取消
          </button>
          <div className="font-semibold text-base">新貼文</div>
          <button
            onClick={handleSubmit}
            disabled={posting || compressing || (!content.trim() && photos.length === 0)}
            className="px-3.5 py-1.5 rounded-full border border-accent text-accent font-semibold text-sm disabled:opacity-50"
          >
            {posting ? '發布中...' : '發布'}
          </button>
        </div>

        <div className="px-5 pt-5 min-h-[45vh]">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              autoGrow(e.target)
            }}
            rows={1}
            placeholder="分享你的拉花心得，或提出一個問題..."
            className="w-full bg-transparent text-base placeholder:text-ink-dim/60 resize-none outline-none overflow-hidden"
          />
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img src={photoThumbs[i] || photo} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/55 text-white flex items-center justify-center text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={compressing || photos.length >= MAX_PHOTOS}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line text-sm text-ink-dim disabled:opacity-50 mt-2"
          >
            <span>📷</span>
            <span>{compressing ? '處理中...' : '新增照片'}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="absolute w-px h-px opacity-0 overflow-hidden"
          />
        </div>
      </div>
    </div>
  )
}
