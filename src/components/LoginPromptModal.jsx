import LoginForm from './LoginForm'
import usePresence, { cssDurationMs } from '../hooks/usePresence'

export default function LoginPromptModal({ open, onClose }) {
  const { mounted, shown } = usePresence(open, cssDurationMs('--modal-close-dur', 150))
  if (!mounted) return null
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[60] px-4 ${open ? '' : 'pointer-events-none'}`}
      onClick={onClose}
    >
      <div className="modal-backdrop absolute inset-0 bg-black/50" data-open={shown} />
      <div
        className={`t-modal ${shown ? 'is-open' : !open ? 'is-closing' : ''} relative w-full max-w-sm bg-card rounded-2xl p-8 border border-line`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-ink-dim text-sm">✕</button>
        <h2 className="text-lg font-semibold text-ink mb-1 pr-6">☕ 開啟屬於你的咖啡之旅</h2>
        <p className="text-sm text-ink-dim mb-5">目前顯示為範例資料，登入即可擁有專屬咖啡日記</p>
        <LoginForm />
      </div>
    </div>
  )
}
