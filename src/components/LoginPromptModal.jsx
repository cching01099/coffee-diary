import LoginForm from './LoginForm'

export default function LoginPromptModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-card rounded-2xl p-8 border border-line"
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
