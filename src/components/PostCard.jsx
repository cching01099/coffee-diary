import { useState } from 'react'
import { timeAgo } from '../lib/utils'
import Avatar from './Avatar'
import PhotoLightbox from './PhotoLightbox'

function PhotoCarousel({ photos, compact, onOpenLightbox }) {
  if (!photos || photos.length === 0) return null

  if (photos.length === 1) {
    return (
      <img
        src={photos[0]}
        alt=""
        loading="lazy"
        onClick={(e) => {
          e.stopPropagation()
          onOpenLightbox(0)
        }}
        className={`max-w-full ${compact ? 'max-h-64' : 'max-h-[32rem]'} rounded-xl mb-2.5 cursor-pointer`}
      />
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-xl mb-2.5 -mx-1 px-1 no-scrollbar">
      {photos.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          loading="lazy"
          onClick={(e) => {
            e.stopPropagation()
            onOpenLightbox(i)
          }}
          className={`${compact ? 'h-64' : 'h-96'} w-auto max-w-[85%] flex-shrink-0 snap-center rounded-xl cursor-pointer object-contain`}
        />
      ))}
    </div>
  )
}

export default function PostCard({
  post,
  liked,
  likeCount,
  replyCount,
  onToggleLike,
  onOpen,
  onOpenAuthor,
  canDelete,
  onDelete,
  hideAuthor,
  compact = true,
}) {
  const [copied, setCopied] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  async function handleShare(e) {
    e.stopPropagation()
    const url = `${window.location.origin}/community/post/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      prompt('複製這個連結：', url)
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // feed views show the (smaller, faster-loading) thumbnails; the detail
  // view shows full-resolution photos. The lightbox always opens full-res,
  // regardless of which one is on screen.
  const displayPhotos = compact
    ? post.photoThumbs?.length
      ? post.photoThumbs
      : post.photos
    : post.photos?.length
      ? post.photos
      : post.photoThumbs
  const fullPhotos = post.photos?.length ? post.photos : post.photoThumbs

  return (
    <div className="bg-card rounded-2xl border border-line p-4 mb-3">
      <div className="flex items-start gap-2.5 mb-2.5">
        {hideAuthor ? (
          <div className="text-[11px] text-ink-dim flex-1">{timeAgo(post.createdAt)}</div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpenAuthor?.(post.userId)
            }}
            className="flex items-start gap-2.5 min-w-0 flex-1 text-left"
          >
            <Avatar name={post.authorName} url={post.authorAvatar} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-[14px] truncate">{post.authorName}</div>
              <div className="text-[11px] text-ink-dim">{timeAgo(post.createdAt)}</div>
            </div>
          </button>
        )}
        {canDelete && (
          <button onClick={() => onDelete(post.id)} className="text-ink-dim text-xs px-1">
            刪除
          </button>
        )}
      </div>

      <div onClick={() => onOpen(post.id)} className="cursor-pointer">
        {post.content && <p className="text-[14.5px] whitespace-pre-wrap mb-2.5">{post.content}</p>}
        <PhotoCarousel photos={displayPhotos} compact={compact} onOpenLightbox={setLightboxIndex} />
      </div>

      <div className="flex items-center gap-5 text-ink-dim text-[13px]">
        <button onClick={() => onToggleLike(post.id)} className={`flex items-center gap-1.5 ${liked ? 'text-accent' : ''}`}>
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likeCount || 0}</span>
        </button>
        <button onClick={() => onOpen(post.id)} className="flex items-center gap-1.5">
          <span>💬</span>
          <span>{replyCount || 0}</span>
        </button>
        <button onClick={handleShare} className="flex items-center gap-1.5 ml-auto">
          <span>🔗</span>
          <span>{copied ? '已複製連結' : '分享'}</span>
        </button>
      </div>

      <PhotoLightbox
        photos={fullPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  )
}
