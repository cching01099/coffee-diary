import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { uploadPhotoPair, removePhotos } from '../lib/storagePhotos'

const PAGE_SIZE = 30

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

// authorId scopes the feed to one person's posts (e.g. their profile page)
// instead of the global feed — everything else (likes, replies, actions)
// works the same either way.
export function useCommunityData(userId, onRequireLogin, authorId = null) {
  const [posts, setPosts] = useState([])
  const [likeCounts, setLikeCounts] = useState({})
  const [replyCounts, setReplyCounts] = useState({})
  const [likedByMe, setLikedByMe] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        let query = supabase
          .from('posts')
          .select('*, profiles(display_name, avatar_url)')
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)
        if (authorId) query = query.eq('user_id', authorId)
        const { data: postRows, error: postsError } = await query
        if (postsError) throw postsError
        if (cancelled) return

        const ids = (postRows || []).map((r) => r.id)
        const [likesResult, repliesResult] = await Promise.all([
          ids.length
            ? supabase.from('post_likes').select('post_id, user_id').in('post_id', ids)
            : Promise.resolve({ data: [], error: null }),
          ids.length
            ? supabase.from('post_replies').select('post_id').in('post_id', ids)
            : Promise.resolve({ data: [], error: null }),
        ])
        if (likesResult.error) throw likesResult.error
        if (repliesResult.error) throw repliesResult.error
        if (cancelled) return

        const nextLikeCounts = {}
        const nextLikedByMe = new Set()
        for (const like of likesResult.data || []) {
          nextLikeCounts[like.post_id] = (nextLikeCounts[like.post_id] || 0) + 1
          if (like.user_id === userId) nextLikedByMe.add(like.post_id)
        }
        const nextReplyCounts = {}
        for (const reply of repliesResult.data || []) {
          nextReplyCounts[reply.post_id] = (nextReplyCounts[reply.post_id] || 0) + 1
        }

        setPosts((postRows || []).map(mapPost))
        setLikeCounts(nextLikeCounts)
        setReplyCounts(nextReplyCounts)
        setLikedByMe(nextLikedByMe)
        setError(null)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorId])

  async function addPost({ content, photos, photoThumbs }) {
    if (!userId) return onRequireLogin()
    const uploaded = await Promise.all(
      (photos || []).map((photo, i) => uploadPhotoPair(photo, photoThumbs?.[i], userId)),
    )
    const uploadError = uploaded.map((u) => u.error).find(Boolean)
    if (uploadError) return uploadError

    const { data: row, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content: content || null,
        photos: uploaded.map((u) => u.photoUrl),
        photo_thumbs: uploaded.map((u) => u.thumbUrl),
      })
      .select('*, profiles(display_name, avatar_url)')
      .single()
    if (error) return error
    setPosts((prev) => [mapPost(row), ...prev])
    return null
  }

  // knownPost lets a caller pass the post it already has locally (e.g. a
  // detail page reached via direct link, whose post may not be in this
  // hook's own `posts` list) so its photos still get cleaned up.
  async function deletePost(postId, knownPost) {
    if (!userId) return onRequireLogin()
    const post = knownPost || posts.find((p) => p.id === postId)
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) return error
    setPosts((prev) => prev.filter((p) => p.id !== postId))
    removePhotos([...(post?.photos || []), ...(post?.photoThumbs || [])])
    return null
  }

  async function toggleLike(postId) {
    if (!userId) return onRequireLogin()
    const currentlyLiked = likedByMe.has(postId)

    setLikedByMe((prev) => {
      const next = new Set(prev)
      currentlyLiked ? next.delete(postId) : next.add(postId)
      return next
    })
    setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + (currentlyLiked ? -1 : 1) }))

    const { error } = currentlyLiked
      ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      : await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })

    if (error) {
      // roll back the optimistic update
      setLikedByMe((prev) => {
        const next = new Set(prev)
        currentlyLiked ? next.add(postId) : next.delete(postId)
        return next
      })
      setLikeCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + (currentlyLiked ? 1 : -1) }))
      console.error(error)
    }
  }

  function bumpReplyCount(postId, delta) {
    setReplyCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + delta) }))
  }

  // used by realtime subscriptions to reflect other people's likes without
  // a refetch — the viewer's own likes go through toggleLike's optimistic
  // update instead, so this is only ever called for someone else's action
  function bumpLikeCount(postId, delta) {
    setLikeCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + delta) }))
  }

  return {
    posts,
    likeCounts,
    replyCounts,
    likedByMe,
    loading,
    error,
    addPost,
    deletePost,
    toggleLike,
    bumpReplyCount,
    bumpLikeCount,
  }
}
