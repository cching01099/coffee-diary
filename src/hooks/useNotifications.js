import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    postId: row.post_id,
    read: row.read,
    createdAt: row.created_at,
    actorName: row.profiles?.display_name || '匿名咖啡愛好者',
    actorAvatar: row.profiles?.avatar_url || null,
    postSnippet: row.posts?.content || null,
  }
}

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*, profiles!notifications_actor_id_fkey(display_name, avatar_url), posts(content)')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!cancelled) {
        if (!error) setNotifications((data || []).map(mapNotification))
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  const unreadCount = notifications.filter((n) => !n.read).length

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
