import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { timeAgo } from '../lib/utils'
import PostCard from '../components/PostCard'
import ConfirmDialog from '../components/ConfirmDialog'
import Avatar from '../components/Avatar'

function mapPost(row) {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    photos: row.photos || [],
    photoThumbs: row.photo_thumbs || [],
    createdAt: row.created_at,
    authorName: row.profiles?.display_name || '匿名咖啡愛好者',
    authorAvatar: row.profiles?.avatar_url || null,
  }
}

function mapReply(row) {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name || '匿名咖啡愛好者',
    authorAvatar: row.profiles?.avatar_url || null,
  }
}

export default function PostDetailPage({ community, userId, onRequireLogin }) {
  const { postId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { posts, likeCounts, replyCounts, likedByMe, toggleLike, deletePost, bumpReplyCount, bumpLikeCount } = community

  const [post, setPost] = useState(() => posts.find((p) => p.id === postId) || null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(!post)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!post) {
        setLoading(true)
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles(display_name, avatar_url)')
          .eq('id', postId)
          .maybeSingle()
        if (!cancelled) {
          if (error || !data) {
            setLoading(false)
            return
          }
          setPost(mapPost(data))
        }
      }
      const { data: replyRows, error: replyError } = await supabase
        .from('post_replies')
        .select('*, profiles(display_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (!cancelled) {
        if (!replyError) setReplies((replyRows || []).map(mapReply))
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  // live updates for likes/replies made by other people while this page is
  // open — our own actions are already reflected via optimistic updates, so
  // those are filtered out here to avoid double-counting
  useEffect(() => {
    const channel = supabase
      .channel(`post-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        (payload) => {
          if (payload.new.user_id === userId) return
          bumpLikeCount(postId, 1)
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        (payload) => {
          if (payload.old.user_id === userId) return
          bumpLikeCount(postId, -1)
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_replies', filter: `post_id=eq.${postId}` },
        async (payload) => {
          if (payload.new.user_id === userId) return
          const { data } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .maybeSingle()
          const reply = mapReply({ ...payload.new, profiles: data })
          setReplies((prev) => (prev.some((r) => r.id === reply.id) ? prev : [...prev, reply]))
          bumpReplyCount(postId, 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, userId])

  async function handleSendReply() {
    if (!userId) return onRequireLogin()
    const text = replyText.trim()
    if (!text) return
    setSending(true)
    const { data, error } = await supabase
      .from('post_replies')
      .insert({ post_id: postId, user_id: userId, content: text })
      .select('*, profiles(display_name, avatar_url)')
      .single()
    setSending(false)
    if (error) {
      alert(`回覆失敗：${error.message}`)
      return
    }
    setReplies((prev) => [...prev, mapReply(data)])
    bumpReplyCount(postId, 1)
    setReplyText('')
  }

  async function handleConfirmDelete() {
    setConfirmingDelete(false)
    const err = await deletePost(post.id, post)
    if (err) {
      alert(`刪除失敗：${err.message}`)
      return
    }
    navigate('/community')
  }

  if (loading) return <div className="text-center py-10 text-ink-dim text-sm">載入中...</div>
  if (!post) return <div className="text-center py-10 text-ink-dim text-sm">找不到這篇貼文</div>

  function handleBack() {
    if (location.state?.fromApp) navigate(-1)
    else navigate('/community')
  }

  return (
    <div>
      <button onClick={handleBack} className="mb-4 text-ink-dim text-sm">
        ‹ 返回
      </button>

      <PostCard
        post={post}
        liked={likedByMe.has(post.id)}
        likeCount={likeCounts[post.id]}
        replyCount={replyCounts[post.id]}
        onToggleLike={toggleLike}
        onOpen={() => {}}
        onOpenAuthor={(uid) => navigate(`/community/u/${uid}`, { state: { fromApp: true } })}
        canDelete={userId && post.userId === userId}
        onDelete={() => setConfirmingDelete(true)}
        compact={false}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title="刪除貼文"
        message="確定要刪除此篇貼文？"
        confirmLabel="刪除"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />

      <div className="bg-card rounded-2xl border border-line overflow-hidden">
        <div className="px-4 py-3 text-sm font-medium text-ink-dim border-b border-line">回覆</div>
        {replies.length === 0 ? (
          <div className="text-center py-6 text-ink-dim text-sm">還沒有回覆，第一個留言吧</div>
        ) : (
          replies.map((r, i) => (
            <div key={r.id} className={`p-3.5 ${i !== replies.length - 1 ? 'border-b border-line' : ''}`}>
              <button
                onClick={() => navigate(`/community/u/${r.userId}`, { state: { fromApp: true } })}
                className="flex items-start gap-2.5 min-w-0 w-full text-left mb-1.5"
              >
                <Avatar name={r.authorName} url={r.authorAvatar} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px] truncate">{r.authorName}</div>
                  <div className="text-[11px] text-ink-dim">{timeAgo(r.createdAt)}</div>
                </div>
              </button>
              <p className="text-[14px] whitespace-pre-wrap">{r.content}</p>
            </div>
          ))
        )}

        <div className="p-3 border-t border-line flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendReply()
              }
            }}
            placeholder="留下你的回覆..."
            rows={1}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-ink-dim/60 resize-none py-1.5 max-h-24 overflow-y-auto"
          />
          <button
            onClick={handleSendReply}
            disabled={sending || !replyText.trim()}
            className="px-3.5 py-1.5 bg-cta text-bg rounded-full font-semibold text-sm disabled:opacity-50"
          >
            送出
          </button>
        </div>
      </div>
    </div>
  )
}
