import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PostCard from '../components/PostCard'
import PostComposer from '../components/PostComposer'
import ConfirmDialog from '../components/ConfirmDialog'

export default function CommunityPage({ community, userId }) {
  const { posts, likeCounts, replyCounts, likedByMe, loading, error, addPost, deletePost, toggleLike } = community
  const navigate = useNavigate()
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [composerOpen, setComposerOpen] = useState(false)

  async function handleConfirmDelete() {
    const postId = deleteTargetId
    setDeleteTargetId(null)
    const err = await deletePost(postId)
    if (err) alert(`刪除失敗：${err.message}`)
  }

  return (
    <div>
      <h1 className="font-bold text-2xl mb-4">社群</h1>

      <button
        onClick={() => setComposerOpen(true)}
        className="w-full flex items-center gap-2.5 bg-card rounded-2xl border border-line p-4 mb-4 text-left text-ink-dim text-sm"
      >
        <span className="text-lg">📷</span>
        <span>分享你的拉花心得，或提出一個問題...</span>
      </button>

      <PostComposer isOpen={composerOpen} onClose={() => setComposerOpen(false)} onSubmit={addPost} />

      {loading ? (
        <div className="text-center py-10 text-ink-dim text-sm">載入中...</div>
      ) : error ? (
        <div className="text-center py-10 text-ink-dim text-sm">貼文載入失敗，請重新整理再試一次</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-ink-dim text-sm">還沒有人分享，來當第一個吧！</div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            liked={likedByMe.has(post.id)}
            likeCount={likeCounts[post.id]}
            replyCount={replyCounts[post.id]}
            onToggleLike={toggleLike}
            onOpen={(id) => navigate(`/community/post/${id}`, { state: { fromApp: true } })}
            onOpenAuthor={(uid) => navigate(`/community/u/${uid}`, { state: { fromApp: true } })}
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
