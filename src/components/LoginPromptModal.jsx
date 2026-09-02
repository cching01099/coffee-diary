import LoginForm from './LoginForm'

export default function LoginPromptModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-2xl p-6 border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-lg font-semibold text-ink">☕ 登入保存紀錄</h2>
          <button onClick={onClose} className="text-ink-dim text-sm px-1">✕</button>
        </div>
        <p className="text-sm text-ink-dim mb-5">目前顯示為範例資料，登入即可擁有專屬咖啡日記。</p>
        <LoginForm />
      </div>
    </div>
  )
}
