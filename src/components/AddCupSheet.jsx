import { useEffect, useState } from 'react'
import OptionGrid from './OptionGrid'
import PhotoDrop from './PhotoDrop'

function parsePosition(str) {
  if (!str) return { x: 50, y: 50 }
  const [x, y] = str.split(' ').map((v) => parseFloat(v))
  return { x: Number.isFinite(x) ? x : 50, y: Number.isFinite(y) ? y : 50 }
}

export default function AddCupSheet({
  isOpen,
  onClose,
  dateKey,
  editEntry, // null when adding new, otherwise the existing entry object
  beanOptions,
  artOptions,
  onAddBeanOption,
  onAddArtOption,
  onSubmit,
  onDelete,
}) {
  const [bean, setBean] = useState('')
  const [art, setArt] = useState('')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPosition, setPhotoPosition] = useState({ x: 50, y: 50 })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (editEntry) {
      setBean(editEntry.bean)
      setArt(editEntry.art)
      setNote(editEntry.note || '')
      setPhoto(editEntry.photo || null)
      setPhotoPosition(parsePosition(editEntry.photoPosition))
    } else {
      setBean('')
      setArt('')
      setNote('')
      setPhoto(null)
      setPhotoPosition({ x: 50, y: 50 })
    }
  }, [isOpen, editEntry])

  if (!isOpen) return null

  const dateLabel = dateKey
    ? new Date(dateKey).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })
    : ''

  function handlePhotoChange(next) {
    setPhoto(next)
    if (!next) setPhotoPosition({ x: 50, y: 50 })
  }

  async function handleSubmit() {
    setSaving(true)
    await onSubmit({
      bean: bean || '未命名豆子',
      art: art || '其他',
      note,
      photo,
      photoPosition: photo ? `${photoPosition.x}% ${photoPosition.y}%` : null,
    })
    setSaving(false)
  }

  async function handleDeleteClick() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-bg rounded-t-[20px] max-h-[88vh] overflow-y-auto pb-8">
        <div className="sticky top-0 z-10 bg-bg flex justify-between items-center px-5 py-5 border-b border-line">
          <button
            onClick={onClose}
            disabled={saving || deleting}
            className="px-3.5 py-1.5 rounded-full border border-line text-ink-dim text-sm disabled:opacity-50"
          >
            取消
          </button>
          <div className="font-semibold text-base">{editEntry ? '編輯這一杯' : '添加一杯'}</div>
          <button
            onClick={handleSubmit}
            disabled={saving || deleting}
            className="px-3.5 py-1.5 rounded-full border border-accent text-accent font-semibold text-sm disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>

        <div className="px-5 pt-5">
          <PhotoDrop
            photo={photo}
            onChange={handlePhotoChange}
            position={photoPosition}
            onPositionChange={setPhotoPosition}
          />

          {editEntry && (
            <div className="mb-5">
              <button
                onClick={handleDeleteClick}
                disabled={saving || deleting}
                className="w-full text-center py-2.5 rounded-lg border border-[#8C3A2E] text-[#8C3A2E] disabled:opacity-50"
              >
                {deleting ? '刪除中...' : '刪除這筆記錄'}
              </button>
            </div>
          )}

          <div className="mb-5">
            <div className="text-xs text-ink-dim mb-2">日期</div>
            <div className="flex items-center gap-2 text-[15px] font-medium">
              <span>{dateLabel}</span>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-xs text-ink-dim mb-2">咖啡豆品牌</div>
            <OptionGrid options={beanOptions} value={bean} onChange={setBean} onAddOption={onAddBeanOption} />
          </div>

          <div className="mb-5">
            <div className="text-xs text-ink-dim mb-2">拉花圖案</div>
            <OptionGrid options={artOptions} value={art} onChange={setArt} onAddOption={onAddArtOption} />
          </div>

          <div className="mb-2">
            <div className="text-xs text-ink-dim mb-2">心得筆記（選填）</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="奶泡打太粗了..."
              className="w-full min-h-[50px] bg-card border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
