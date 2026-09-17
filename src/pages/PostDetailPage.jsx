import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { autoGrow, compressImage, timeAgo } from '../lib/utils'
import { uploadPhotoPair } from '../lib/storagePhotos'
import PostCard from '../components/PostCard'
import ConfirmDialog from '../components/ConfirmDialog'
import Avatar from '../components/Avatar'
import PhotoLightbox from '../components/PhotoLightbox'

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
    photo: row.photo || null,
    photoThumb: row.photo_thumb || null,
    createdAt: row.created_at,
    authorName: row.profiles?.display_name || '匿名咖啡愛好者',
    authorAvatar: row.profiles?.avatar_url || null,
  }
}

// mentions are stored inline in reply content as `@[Display Name](user_id)`
// — matches what the notify_on_mention trigger in schema.sql parses, so a
// reply's stored text is the single source of truth for who got tagged
const MENTION_PATTERN =
  /@\[([^\]]+)\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/g

function renderMentionContent(content, onMentionClick) {
  if (!content) return null
  const parts = []
  let lastIndex = 0
  let match
  MENTION_PATTERN.lastIndex = 0
  while ((match = MENTION_PATTERN.exec(content))) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index))
    const [full, name, uid] = match
    parts.push(
      <button
        key={match.index}
        onClick={(e) => {
          e.stopPropagation()
          onMentionClick(uid)
        }}
        className="inline text-accent font-medium"
      >
        @{name}
      </button>,
    )
    lastIndex = match.index + full.length
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex))
  return parts
}

export default function PostDetailPage({ community, userId, onRequireLogin }) {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { posts, likeCounts, replyCounts, likedByMe, toggleLike, deletePost, bumpReplyCount, bumpLikeCount, isOwnLikeAction } = community

  const [post, setPost] = useState(() => posts.find((p) => p.id === postId) || null)
  const [replies, setReplies] = useState([])
  const [likers, setLikers] = useState([])
  const [loading, setLoading] = useState(!post)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // @mention composing state: mentionQuery is the text typed after the "@"
  // that triggered the dropdown (null when not composing one), mentionStart
  // is that "@"'s index in replyText, and activeMentions records the
  // {name, userId} pairs picked so far so handleSendReply can turn the
  // plain "@Name" text the user sees into the storable markup
  const [mentionQuery, setMentionQuery] = useState(null)
  const [mentionStart, setMentionStart] = useState(null)
  const [activeMentions, setActiveMentions] = useState([])
  const textareaRef = useRef(null)

  // reply photo — a single attachment, unlike posts' up-to-5 (replies are
  // meant to stay lightweight)
  const [replyPhoto, setReplyPhoto] = useState(null)
  const [replyPhotoThumb, setReplyPhotoThumb] = useState(null)
  const [compressingReplyPhoto, setCompressingReplyPhoto] = useState(false)
  const replyPhotoInputRef = useRef(null)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  // reply ids this tab itself just submitted — lets the realtime INSERT
  // echo for that exact reply be skipped by id instead of by author, so
  // the same account's other open tabs/devices still pick it up (see
  // ownLikeActionRef in useCommunityData for the same problem with likes)
  const ownReplyIdsRef = useRef(new Set())

  // who can be @mentioned: anyone who's replied or liked this post, since
  // they're already part of the conversation — not the whole user base
  const mentionCandidates = useMemo(() => {
    const byId = new Map()
    for (const r of replies) {
      if (r.userId !== userId) byId.set(r.userId, { userId: r.userId, name: r.authorName, avatar: r.authorAvatar })
    }
    for (const l of likers) {
      if (l.userId !== userId) byId.set(l.userId, l)
    }
    return [...byId.values()]
  }, [replies, likers, userId])

  const filteredMentionCandidates = useMemo(() => {
    if (mentionQuery == null) return []
    const q = mentionQuery.toLowerCase()
    return mentionCandidates.filter((c) => c.name.toLowerCase().includes(q))
  }, [mentionCandidates, mentionQuery])

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

      // post_likes.user_id references auth.users directly (not profiles),
      // so PostgREST can't embed profile info in one query here — fetch
      // the liker ids, then their profiles, separately
      const { data: likeRows } = await supabase.from('post_likes').select('user_id').eq('post_id', postId)
      const likerIds = [...new Set((likeRows || []).map((r) => r.user_id))]
      if (likerIds.length && !cancelled) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', likerIds)
        if (!cancelled) {
          setLikers(
            (profileRows || []).map((p) => ({
              userId: p.user_id,
              name: p.display_name || '匿名咖啡愛好者',
              avatar: p.avatar_url || null,
            })),
          )
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  // live updates for likes/replies while this page is open — the exact
  // action this tab itself just took is filtered out (tracked by id/postId
  // above) since it's already reflected via its own optimistic update;
  // everything else, including the same account's other tabs, gets applied
  useEffect(() => {
    const channel = supabase
      .channel(`post-${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        () => {
          if (isOwnLikeAction(postId)) return
          bumpLikeCount(postId, 1)
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        () => {
          if (isOwnLikeAction(postId)) return
          bumpLikeCount(postId, -1)
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_replies', filter: `post_id=eq.${postId}` },
        async (payload) => {
          if (ownReplyIdsRef.current.has(payload.new.id)) return
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
    let text = replyText.trim()
    if (!text && !replyPhoto) return
    // turn the plain "@Name" text the user sees into the `@[Name](uuid)`
    // markup that gets stored and parsed by both the renderer and the
    // notify_on_mention trigger
    for (const { name, userId: mentionedId } of activeMentions) {
      text = text.split(`@${name}`).join(`@[${name}](${mentionedId})`)
    }
    setSending(true)

    let photoUrl = null
    let photoThumbUrl = null
    if (replyPhoto) {
      const uploaded = await uploadPhotoPair(replyPhoto, replyPhotoThumb, userId)
      if (uploaded.error) {
        setSending(false)
        alert(`照片上傳失敗：${uploaded.error.message}`)
        return
      }
      photoUrl = uploaded.photoUrl
      photoThumbUrl = uploaded.thumbUrl
    }

    // generated up front (rather than reading the id supabase would
    // otherwise assign) so it's already in ownReplyIdsRef before the
    // realtime echo of this insert can possibly arrive
    const id = crypto.randomUUID()
    ownReplyIdsRef.current.add(id)
    const { data, error } = await supabase
      .from('post_replies')
      .insert({ id, post_id: postId, user_id: userId, content: text || null, photo: photoUrl, photo_thumb: photoThumbUrl })
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
    setActiveMentions([])
    setReplyPhoto(null)
    setReplyPhotoThumb(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  async function handleReplyPhotoChange(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setCompressingReplyPhoto(true)
    try {
      const [full, thumb] = await Promise.all([
        compressImage(file, { maxDimension: 1280, quality: 0.8 }),
        compressImage(file, { maxDimension: 480, quality: 0.7 }),
      ])
      setReplyPhoto(full)
      setReplyPhotoThumb(thumb)
    } catch (err) {
      console.error(err)
      alert('照片處理失敗，請換一張試試')
    } finally {
      setCompressingReplyPhoto(false)
    }
  }

  function removeReplyPhoto() {
    setReplyPhoto(null)
    setReplyPhotoThumb(null)
  }

  function handleReplyTextChange(e) {
    const value = e.target.value
    setReplyText(value)
    autoGrow(e.target)
    const cursor = e.target.selectionStart
    const atMatch = value.slice(0, cursor).match(/(?:^|\s)@([^\s@]*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionStart(cursor - atMatch[1].length - 1)
    } else {
      setMentionQuery(null)
      setMentionStart(null)
    }
  }

  function insertMention(candidate) {
    const el = textareaRef.current
    if (mentionStart == null || !el) return
    const cursor = el.selectionStart
    const before = replyText.slice(0, mentionStart)
    const after = replyText.slice(cursor)
    const inserted = `@${candidate.name} `
    setReplyText(before + inserted + after)
    setActiveMentions((prev) => (prev.some((m) => m.name === candidate.name) ? prev : [...prev, { name: candidate.name, userId: candidate.userId }]))
    setMentionQuery(null)
    setMentionStart(null)
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length
      el.focus()
      el.setSelectionRange(pos, pos)
      autoGrow(el)
    })
  }

  async function handleConfirmDelete() {
    setConfirmingDelete(false)
    const err = await deletePost(post.id, post)
    if (err) {
      alert(`刪除失敗：${err.message}`)
      return
    }
    navigate('/community', { viewTransition: true })
  }

  if (loading) return <div className="text-center py-10 text-ink-dim text-sm">載入中...</div>
  if (!post) return <div className="text-center py-10 text-ink-dim text-sm">找不到這篇貼文</div>

  return (
    <div>
      <button onClick={() => navigate('/community', { viewTransition: true })} className="mb-4 text-ink-dim text-sm">
        ‹ 返回社群
      </button>

      <PostCard
        post={post}
        liked={likedByMe.has(post.id)}
        likeCount={likeCounts[post.id]}
        replyCount={replyCounts[post.id]}
        onToggleLike={toggleLike}
        onOpen={() => {}}
        onOpenAuthor={(uid) => navigate(`/community/u/${uid}`, { viewTransition: true })}
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
                onClick={() => navigate(`/community/u/${r.userId}`, { viewTransition: true })}
                className="flex items-start gap-2.5 min-w-0 w-full text-left mb-1.5"
              >
                <Avatar name={r.authorName} url={r.authorAvatar} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px] truncate">{r.authorName}</div>
                  <div className="text-[11px] text-ink-dim">{timeAgo(r.createdAt)}</div>
                </div>
              </button>
              {r.content && (
                <p className="text-[14px] whitespace-pre-wrap">
                  {renderMentionContent(r.content, (uid) => navigate(`/community/u/${uid}`, { viewTransition: true }))}
                </p>
              )}
              {r.photoThumb && (
                <img
                  src={r.photoThumb}
                  alt=""
                  loading="lazy"
                  onClick={() => setLightboxPhoto(r.photo || r.photoThumb)}
                  className={`max-h-48 rounded-lg cursor-pointer ${r.content ? 'mt-2' : ''}`}
                />
              )}
            </div>
          ))
        )}

        <div className="relative p-3 border-t border-line">
          {filteredMentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-card border border-line rounded-xl shadow-lg max-h-48 overflow-y-auto z-10">
              {filteredMentionCandidates.map((c) => (
                <button
                  key={c.userId}
                  onClick={() => insertMention(c)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-ink/5"
                >
                  <Avatar name={c.name} url={c.avatar} />
                  <span className="text-[13px] font-medium">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          {replyPhoto && (
            <div className="relative inline-block mb-2">
              <img src={replyPhotoThumb || replyPhoto} alt="" className="w-16 h-16 object-cover rounded-lg" />
              <button
                onClick={removeReplyPhoto}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/55 text-white flex items-center justify-center text-[10px]"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={() => replyPhotoInputRef.current?.click()}
              disabled={sending || compressingReplyPhoto || !!replyPhoto}
              className="w-8 h-8 flex-shrink-0 rounded-full border border-line text-ink-dim flex items-center justify-center text-sm disabled:opacity-50"
            >
              📷
            </button>
            <input
              ref={replyPhotoInputRef}
              type="file"
              accept="image/*"
              onChange={handleReplyPhotoChange}
              className="absolute w-px h-px opacity-0 overflow-hidden"
            />
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={handleReplyTextChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (mentionQuery == null) handleSendReply()
                }
              }}
              placeholder="新增回覆..."
              rows={1}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-ink-dim/60 resize-none py-1.5 max-h-24 overflow-y-auto"
            />
            <button
              onClick={handleSendReply}
              disabled={sending || compressingReplyPhoto || (!replyText.trim() && !replyPhoto)}
              className="px-3.5 py-1.5 bg-cta text-bg rounded-full font-semibold text-sm disabled:opacity-50"
            >
              送出
            </button>
          </div>
        </div>
      </div>

      <PhotoLightbox
        photos={lightboxPhoto ? [lightboxPhoto] : []}
        index={lightboxPhoto ? 0 : null}
        onClose={() => setLightboxPhoto(null)}
        onNavigate={() => {}}
      />
    </div>
  )
}
