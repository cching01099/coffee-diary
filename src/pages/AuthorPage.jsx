import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunityData } from '../hooks/useCommunityData'
import PostCard from '../components/PostCard'
import ConfirmDialog from '../components/ConfirmDialog'

export default function AuthorPage({ userId, onRequireLogin }) {
  const { authorId } = useParams()
  const navigate = useNavigate()
  const author = useCommunityData(userId, onRequireLogin, authorId)
  const [profile, setProfile] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', authorId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile(data)
      })
    return () => {
      cancelled = true
    }
  }, [authorId])

  async function handleConfirmDelete() {
    const postId = deleteTargetId
    setDeleteTargetId(null)
    const err = await author.deletePost(postId)
    if (err) alert(`刪除失敗：${err.message}`)
  }

  const displayName = profile?.display_name || author.posts[0]?.authorName || '匿名咖啡愛好者'
  const avatarUrl = profile?.avatar_url || author.posts[0]?.authorAvatar || null

  return (
    <div>
      <button onClick={() => navigate('/community')} className="mb-6 text-ink-dim text-sm">
        ‹ 返回社群
      </button>

      <div className="flex items-center gap-3 pb-5 mb-5 border-b border-line">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold text-lg">
            {(displayName || '?').slice(0, 1)}
          </div>
        )}
        <div>
          <div className="font-bold text-lg">{displayName}</div>
          <div className="text-ink-dim text-[13px]">{author.posts.length} 篇貼文</div>
        </div>
      </div>

      {author.loading ? (
        <div className="text-center py-10 text-ink-dim text-sm">載入中...</div>
      ) : author.error ? (
        <div className="text-center py-10 text-ink-dim text-sm">貼文載入失敗，請重新整理再試一次</div>
      ) : author.posts.length === 0 ? (
        <div className="text-center py-10 text-ink-dim text-sm">還沒有發過貼文</div>
      ) : (
        author.posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            liked={author.likedByMe.has(post.id)}
            likeCount={author.likeCounts[post.id]}
            replyCount={author.replyCounts[post.id]}
            onToggleLike={author.toggleLike}
            onOpen={(id) => navigate(`/community/post/${id}`)}
            onOpenAuthor={(uid) => navigate(`/community/u/${uid}`)}
            canDelete={userId && post.userId === userId}
            onDelete={setDeleteTargetId}
          />
        ))
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="刪除貼文"
        message="確定要刪除此篇貼文？"
        confirmLabel="刪除"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
