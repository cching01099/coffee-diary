import usePresence, { cssDurationMs } from '../hooks/usePresence'

export default function ConfirmDialog({ open, title, message, confirmLabel = '確定', onConfirm, onCancel }) {
  const { mounted, shown } = usePresence(open, cssDurationMs('--modal-close-dur', 150))
  if (!mounted) return null
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[60] px-10 ${open ? '' : 'pointer-events-none'}`}
      onClick={onCancel}
    >
      <div className="modal-backdrop absolute inset-0 bg-black/50" data-open={shown} />
      <div
        className={`t-modal ${shown ? 'is-open' : !open ? 'is-closing' : ''} relative w-full max-w-[280px] bg-card rounded-2xl overflow-hidden border border-line`}
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
