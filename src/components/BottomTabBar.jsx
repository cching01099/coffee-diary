import { NavLink } from 'react-router-dom'

export default function BottomTabBar() {
  const tabs = [
    { path: '/calendar', icon: '☕' },
    { path: '/purchases', icon: '🛒' },
    { path: '/stats', icon: '📊' },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-line flex justify-center gap-8 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      {tabs.map((t) => (
        <NavLink
          key={t.path}
          to={t.path}
          className={({ isActive }) =>
            `text-xl px-4 py-1.5 rounded-lg ${isActive ? 'text-accent bg-accent/10' : 'text-ink-dim'}`
          }
        >
          {t.icon}
        </NavLink>
      ))}
    </div>
  )
}
