import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function BottomTabBar() {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    function handleScroll() {
      const y = window.scrollY
      const delta = y - lastY.current
      // ignore tiny jitters (e.g. iOS rubber-band overscroll) — only react
      // once the user has clearly scrolled a bit
      if (Math.abs(delta) < 6) return
      setVisible(delta < 0 || y < 40) // scrolling up, or still near the top
      lastY.current = y
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const tabs = [
    { path: '/calendar', icon: '☕' },
    { path: '/purchases', icon: '🛒' },
    { path: '/stats', icon: '📊' },
    { path: '/community', icon: '💬' },
  ]

  return (
    <div
      className={`fixed left-0 right-0 flex justify-center transition-transform duration-300 ease-out motion-reduce:transition-none ${
        visible ? 'translate-y-0' : 'translate-y-24'
      }`}
      style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-bg/70 backdrop-blur-xl shadow-[0_8px_24px_rgba(92,56,38,0.18)] border border-line/25">
        {tabs.map((t) => (
          <NavLink
            key={t.path}
            to={t.path}
            viewTransition
            className={({ isActive }) =>
              `text-xl w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                isActive ? 'bg-accent/15' : ''
              }`
            }
          >
            {t.icon}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
