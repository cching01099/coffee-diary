import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../lib/utils'

function notificationText(n) {
  if (n.type === 'like') return `${n.actorName} 對你的貼文按了讚`
  if (n.type === 'mention') return `${n.actorName} 在留言中標記了你`
  return `${n.actorName} 回覆了你的貼文`
}

export default function NotificationsPage({ notifications, loading, markAsRead, markAllAsRead }) {
  const navigate = useNavigate()

  useEffect(() => {
    markAllAsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClick(n) {
    if (!n.read) markAsRead(n.id)
    navigate(`/community/post/${n.postId}`)
  }

  return (
    <div>
      <button onClick={() => navigate('/community')} className="mb-4 text-ink-dim text-sm">
        ‹ 返回社群
      </button>
      <h1 className="font-bold text-2xl mb-4">通知</h1>

      {loading ? (
        <div className="text-center py-10 text-ink-dim text-sm">載入中...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-10 text-ink-dim text-sm">還沒有通知</div>
      ) : (
        notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={`w-full text-left bg-card rounded-2xl border p-4 mb-2 ${!n.read ? 'border-accent/40' : 'border-line'}`}
          >
            <div className="text-[14px] text-ink">{notificationText(n)}</div>
            {n.postSnippet && <div className="text-[13px] text-ink-dim truncate mt-1">{n.postSnippet}</div>}
            <div className="text-[11px] text-ink-dim mt-1.5">{timeAgo(n.createdAt)}</div>
          </button>
        ))
      )}
    </div>
  )
}
