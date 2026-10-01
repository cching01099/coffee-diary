import { useState } from 'react'

// A photo that pulses a placeholder until it has loaded, then cross-fades in
// (transitions.dev skeleton reveal, see .t-skel in index.css). It covers its
// positioned parent, which sets the size, rounding and overflow clipping.
export default function SkeletonImage({ src, className = '', ...imgProps }) {
  // track which src finished loading so a new src starts from the skeleton again
  const [loadedSrc, setLoadedSrc] = useState(null)

  return (
    // absolute wrapper rather than h-full: several parents only get their
    // height from aspect-ratio, which Safari doesn't treat as definite for %
    <div className="absolute inset-0">
      {/* keyed by src so a swapped photo gets a fresh skeleton instead of
          animating the reveal in reverse */}
      <div key={src} className={`t-skel isolate w-full h-full ${loadedSrc === src ? 'is-revealed' : ''}`}>
        {/* pulse until the photo arrives rather than the recipe's single pulse */}
        <div className="t-skel-skeleton is-pulsing" style={{ '--pulse-count': 'infinite' }}>
          <div className="w-full h-full bg-line" />
        </div>
        <div className="t-skel-content">
          <img
            src={src}
            alt=""
            {...imgProps}
            onLoad={() => setLoadedSrc(src)}
            ref={(img) => {
              // already in the browser cache: load may have fired before React listened
              if (img?.complete && img.naturalWidth) setLoadedSrc(src)
            }}
            className={`w-full h-full object-cover ${className}`}
          />
        </div>
      </div>
    </div>
  )
}
