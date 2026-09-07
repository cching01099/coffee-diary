// One-off maintenance script — generates photo_thumb for entries that
// already had a photo before the thumbnail feature existed.
//
// Requires the Supabase SERVICE ROLE key (bypasses RLS, so it can touch
// every user's rows). Never commit this key. Run it like:
//
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxx \
//   node scripts/backfill-photo-thumbs.mjs
//
// Safe to re-run: it only looks at rows where photo_thumb is still null.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import crypto from 'node:crypto'
import WebSocket from 'ws'

const THUMB_MAX_DIMENSION = 240
const THUMB_QUALITY = 60

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

// This script never uses realtime — the transport option just skips the
// client's native-WebSocket auto-detection, which throws on Node < 22.
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  realtime: { transport: WebSocket },
})

async function makeThumb(photoUrl) {
  const res = await fetch(photoUrl)
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  return sharp(bytes)
    .resize(THUMB_MAX_DIMENSION, THUMB_MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer()
}

async function main() {
  const { data: rows, error } = await supabase
    .from('entries')
    .select('id, user_id, photo')
    .not('photo', 'is', null)
    .is('photo_thumb', null)

  if (error) {
    console.error('Failed to fetch rows:', error)
    process.exit(1)
  }

  console.log(`Found ${rows.length} entries needing a thumbnail.`)

  let done = 0
  let failed = 0

  for (const row of rows) {
    try {
      const thumbBuffer = await makeThumb(row.photo)
      const path = `${row.user_id}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('coffee-photos')
        .upload(path, thumbBuffer, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('coffee-photos').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('entries')
        .update({ photo_thumb: publicUrlData.publicUrl })
        .eq('id', row.id)
      if (updateError) throw updateError

      done++
      console.log(`[${done + failed}/${rows.length}] ok — entry ${row.id}`)
    } catch (err) {
      failed++
      console.error(`[${done + failed}/${rows.length}] FAILED — entry ${row.id}:`, err.message || err)
    }
  }

  console.log(`\nDone. ${done} succeeded, ${failed} failed out of ${rows.length}.`)
}

main()
