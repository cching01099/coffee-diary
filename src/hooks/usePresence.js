import { useEffect, useState } from 'react'

// Read a motion duration token (e.g. "--panel-close-dur") from :root so the
// JS unmount delay always matches the CSS transition length.
export function cssDurationMs(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  return parseFloat(raw) || fallback
}

// Keeps an overlay mounted through its close transition. `mounted` stays true
// for `closeMs` after `open` turns false; `shown` flips on two frames after
// mount so the open transition has a resting state to animate from.
export default function usePresence(open, closeMs) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      let inner
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), closeMs)
    return () => clearTimeout(t)
  }, [open, closeMs])

  return { mounted, shown }
}
