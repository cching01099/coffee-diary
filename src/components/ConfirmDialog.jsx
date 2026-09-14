export default function ConfirmDialog({ open, title, message, confirmLabel = '確定', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-10" onClick={onCancel}>
      <div
        className="w-full max-w-[280px] bg-card rounded-2xl overflow-hidden border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center px-4 pt-5 pb-4">
          {title && <h2 className="text-base font-semibold text-ink mb-1">{title}</h2>}
          {message && <p className="text-sm text-ink-dim">{message}</p>}
        </div>
        <div className="flex border-t border-line">
          <button onClick={onCancel} className="flex-1 py-3 text-sm text-ink border-r border-line">
            取消
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 text-sm font-semibold text-[#d74f3b]">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
