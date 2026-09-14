import { supabase } from './supabase'

async function upload(path, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob()
  const { error } = await supabase.storage.from('coffee-photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) return { url: null, error }
  const { data } = supabase.storage.from('coffee-photos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

// Uploads a freshly-picked photo + its thumbnail (both base64 data URLs) as
// a pair sharing one id — "<id>.jpg" / "<id>-thumb.jpg" — so they're easy to
// spot as belonging together when browsing the bucket directly. A pair
// that's already a URL (unchanged from an earlier save) is passed through
// untouched — no re-upload.
export async function uploadPhotoPair(photo, photoThumb, userId) {
  if (!photo || !photo.startsWith('data:')) return { photoUrl: photo, thumbUrl: photoThumb, error: null }
  try {
    const id = crypto.randomUUID()
    const full = await upload(`${userId}/${id}.jpg`, photo)
    if (full.error) return { photoUrl: null, thumbUrl: null, error: full.error }
    if (!photoThumb) return { photoUrl: full.url, thumbUrl: null, error: null }
    const thumb = await upload(`${userId}/${id}-thumb.jpg`, photoThumb)
    if (thumb.error) return { photoUrl: null, thumbUrl: null, error: thumb.error }
    return { photoUrl: full.url, thumbUrl: thumb.url, error: null }
  } catch (err) {
    return { photoUrl: null, thumbUrl: null, error: err }
  }
}

// Storage URLs look like ".../object/public/coffee-photos/<user_id>/<file>" —
// pull out everything after the bucket name so it can be passed to remove().
function storagePathFromUrl(url) {
  const marker = '/coffee-photos/'
  const idx = url.indexOf(marker)
  return idx === -1 ? null : url.slice(idx + marker.length)
}

// Best-effort cleanup — the caller's own DB row is already gone either way,
// so failures here are just logged rather than surfaced to the user.
export function removePhotos(urls) {
  const paths = urls.filter(Boolean).map(storagePathFromUrl).filter(Boolean)
  if (paths.length === 0) return
  supabase.storage
    .from('coffee-photos')
    .remove(paths)
    .then(({ error }) => error && console.error(error))
}
