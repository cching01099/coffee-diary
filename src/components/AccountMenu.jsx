import { useState } from 'react'

export default function AccountMenu({ displayName, avatarUrl, onSignOut }) {
  const [open, setOpen] = useState(false)
  const initial = (displayName || '?')[0].toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-cta text-bg flex items-center justify-center text-sm font-semibold overflow-hidden"
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initial}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-52 bg-card border border-line rounded-xl overflow-hidden z-50 shadow-[0_8px_24px_rgba(92,56,38,0.18)]">
            <div className="px-3.5 py-3 text-xs text-ink-dim truncate border-b border-line">{displayName}</div>
            <button
              onClick={onSignOut}
              className="w-full text-left px-3.5 py-2.5 text-sm text-[#8C3A2E]"
            >
              登出
            </button>
          </div>
        </>
      )}
    </div>
  )
}
