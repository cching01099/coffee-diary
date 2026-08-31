import { useState } from 'react'

// Reusable "pick one, or add your own" chip grid — used for 咖啡豆品牌 and 拉花圖案.
export default function OptionGrid({ options, value, onChange, onAddOption, icon }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function confirmAdd() {
    const name = draft.trim()
    if (!name) return
    onAddOption(name)
    onChange(name)
    setDraft('')
    setAdding(false)
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-xl border px-1.5 py-3 min-h-[46px] flex flex-col items-center justify-center text-center text-[13.5px] font-medium ${
              value === opt
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-card text-ink-dim'
            }`}
          >
            {icon && <span className="text-xl mb-1">{icon}</span>}
            {opt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-xl border border-dashed border-line bg-transparent px-1.5 py-3 min-h-[46px] flex items-center justify-center gap-1 text-[13.5px] font-medium text-ink-dim"
        >
          <span className="text-base text-ink-dim">＋</span>
          <span>新增</span>
        </button>
      </div>
      {adding && (
        <div className="flex gap-2 mt-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
            placeholder="輸入名稱"
            className="flex-1 bg-card border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-dim"
          />
          <button
            type="button"
            onClick={confirmAdd}
            className="px-3 py-2 rounded-full border border-line text-sm text-ink-dim"
          >
            新增
          </button>
        </div>
      )}
    </div>
  )
}
