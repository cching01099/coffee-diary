import { useEffect, useState } from 'react'
import SkeletonImage from './SkeletonImage'

// one request per URL per page load: the feed, detail page and author page
// all render the same posts, and remounts shouldn't refetch
const previewCache = new Map()

function loadPreview(url) {
  if (!previewCache.has(url)) {
    previewCache.set(
      url,
      fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    )
  }
  return previewCache.get(url)
}

export default function LinkPreviewCard({ url, compact }) {
  const [preview, setPreview] = useState(null)
  // Threads/Instagram image URLs are signed and expire; drop the image, keep the card
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPreview(null)
    setImageFailed(false)
    loadPreview(url).then((data) => {
      if (!cancelled) setPreview(data)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  // nothing until there's something to show, so a dead link leaves no gap
  if (!preview) return null

  const showImage = preview.image && !imageFailed

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      onClick={(e) => e.stopPropagation()}
      className={`block overflow-hidden border border-line bg-card2/40 mb-2.5 ${compact ? 'rounded-xl' : 'rounded-2xl'}`}
    >
      {showImage && (
        <div className={`relative w-full ${compact ? 'aspect-[1.91/1]' : 'aspect-[3/2]'}`}>
          <SkeletonImage
            src={preview.image}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        <div className="text-[11px] text-ink-dim truncate">{preview.siteName}</div>
        {preview.title && <div className="text-[13.5px] font-semibold leading-snug line-clamp-2">{preview.title}</div>}
      </div>
    </a>
  )
}
