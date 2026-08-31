export default function BottomTabBar({ activeTab, onChange }) {
  const tabs = [
    { id: 'calendar', icon: '☕' },
    { id: 'purchases', icon: '🛒' },
    { id: 'stats', icon: '📊' },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-line flex justify-center gap-8 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`text-xl px-4 py-1.5 rounded-lg ${
            activeTab === t.id ? 'text-accent bg-accent/10' : 'text-ink-dim'
          }`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  )
}
