import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../lib/utils'

function notificationText(n) {
  if (n.type === 'like') return `${n.actorName} 對你的貼文按了讚`
  if (n.type === 'mention') return `${n.actorName} 在留言中標記了你`
  return `${n.actorName} 回覆了你的貼文`
}

export default function NotificationBell({ notifications, unreadCount, markAsRead, markAllAsRead }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function handleToggle() {
    if (!open) markAllAsRead()
    setOpen((v) => !v)
  }

  function handleClick(n) {
    setOpen(false)
    if (!n.read) markAsRead(n.id)
    navigate(`/community/post/${n.postId}`)
  }

  return (
    <div className="relative">
      <button onClick={handleToggle} className="relative w-8 h-8 rounded-full flex items-center justify-center text-lg">
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-[#d74f3b] text-white text-[10px] flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-card border border-line rounded-xl z-50 shadow-[0_8px_24px_rgba(92,56,38,0.18)] overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-ink-dim">還沒有通知</div>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-3.5 py-3 border-b border-line last:border-b-0 ${!n.read ? 'bg-accent/5' : ''}`}
                  >
                    <div className="text-[13px] text-ink">{notificationText(n)}</div>
                    {n.postSnippet && <div className="text-[12px] text-ink-dim truncate mt-0.5">{n.postSnippet}</div>}
                    <div className="text-[11px] text-ink-dim mt-1">{timeAgo(n.createdAt)}</div>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => {
                setOpen(false)
                navigate('/community/notifications')
              }}
              className="w-full text-center py-2.5 text-sm text-accent font-medium border-t border-line"
            >
              查看全部
            </button>
          </div>
        </>
      )}
    </div>
  )
}
