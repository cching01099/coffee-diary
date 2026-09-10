import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_BEAN_OPTIONS = ['星巴克', '咖樂迪', '超市', '其他']
const DEFAULT_ART_OPTIONS = ['無', '愛心', '鬱金香', '天鵝', '葉子', '其他']

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isNaN(n) ? null : n
}

function groupEntriesByDate(rows) {
  const map = {}
  for (const row of rows) {
    if (!map[row.date_key]) map[row.date_key] = []
    map[row.date_key].push({
      id: row.id,
      bean: row.bean,
      roast: row.roast,
      art: row.art,
      note: row.note,
      photo: row.photo,
      photoThumb: row.photo_thumb,
      photoPosition: row.photo_position,
      photoZoom: row.photo_zoom,
    })
  }
  return map
}

// Uploads a freshly-picked local photo (a base64 data URL) to Storage and
// returns its public URL. A photo that's already a URL (unchanged from an
// earlier save) or null is passed through untouched — no re-upload.
async function uploadPhotoIfNeeded(photo, userId) {
  if (!photo || !photo.startsWith('data:')) return { url: photo, error: null }
  try {
    const blob = await (await fetch(photo)).blob()
    const path = `${userId}/${crypto.randomUUID()}.jpg`
    const { error } = await supabase.storage.from('coffee-photos').upload(path, blob, { contentType: 'image/jpeg' })
    if (error) return { url: null, error }
    const { data } = supabase.storage.from('coffee-photos').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch (err) {
    return { url: null, error: err }
  }
}

function mapPurchaseRow(r) {
  return {
    id: r.id,
    date: r.date_key,
    beanBrand: r.bean_brand,
    beanWeight: r.bean_weight,
    beanPrice: r.bean_price,
    milkBrand: r.milk_brand,
    milkVolume: r.milk_volume,
    milkPrice: r.milk_price,
  }
}

export function useCoffeeData(userId) {
  const [entries, setEntries] = useState({})
  const [purchases, setPurchases] = useState([])
  const [beanOptions, setBeanOptions] = useState(DEFAULT_BEAN_OPTIONS)
  const [artOptions, setArtOptions] = useState(DEFAULT_ART_OPTIONS)
  const [loading, setLoading] = useState(true) // entries + options only — purchases loads on demand
  const [purchasesLoading, setPurchasesLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const optionsLoaded = useRef(false)
  const purchasesLoaded = useRef(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    optionsLoaded.current = false
    purchasesLoaded.current = false
    setPurchasesLoading(true)

    async function load() {
      setLoading(true)
      try {
        const [entryResult, optionsResult] = await Promise.all([
          supabase.from('entries').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('user_options').select('*').eq('user_id', userId).maybeSingle(),
        ])
        if (cancelled) return
        if (entryResult.error) throw entryResult.error
        if (optionsResult.error) throw optionsResult.error
        setEntries(groupEntriesByDate(entryResult.data || []))
        const options = optionsResult.data
        setBeanOptions(options?.bean_options?.length ? options.bean_options : DEFAULT_BEAN_OPTIONS)
        setArtOptions(options?.art_options?.length ? options.art_options : DEFAULT_ART_OPTIONS)
        optionsLoaded.current = true
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
  }, [userId, retryCount])

  function refetch() {
    setRetryCount((c) => c + 1)
  }

  // Purchases page calls this on mount — no need to fetch it before the
  // calendar (the default landing page) can render.
  async function loadPurchases() {
    if (purchasesLoaded.current || !userId) return
    purchasesLoaded.current = true
    setPurchasesLoading(true)
    try {
      const { data: purchaseRows, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error(error)
        purchasesLoaded.current = false
        return
      }
      setPurchases((purchaseRows || []).map(mapPurchaseRow))
    } catch (err) {
      console.error(err)
      purchasesLoaded.current = false
    } finally {
      setPurchasesLoading(false)
    }
  }

  // persist option-chip changes, but not the initial load that populated them
  useEffect(() => {
    if (!optionsLoaded.current || !userId) return
    supabase
      .from('user_options')
      .update({ bean_options: beanOptions, art_options: artOptions })
      .eq('user_id', userId)
      .then(({ error }) => error && console.error(error))
  }, [beanOptions, artOptions, userId])

  async function addLog(dateKey, data) {
    const [{ url: photoUrl, error: uploadError }, { url: thumbUrl, error: thumbError }] = await Promise.all([
      uploadPhotoIfNeeded(data.photo, userId),
      uploadPhotoIfNeeded(data.photoThumb, userId),
    ])
    if (uploadError) {
      console.error(uploadError)
      return uploadError
    }
    if (thumbError) {
      console.error(thumbError)
      return thumbError
    }
    const { data: row, error } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        date_key: dateKey,
        bean: data.bean,
        roast: data.roast,
        art: data.art,
        note: data.note,
        photo: photoUrl,
        photo_thumb: thumbUrl,
        photo_position: data.photoPosition,
        photo_zoom: data.photoZoom,
      })
      .select()
      .single()
    if (error) {
      console.error(error)
      return error
    }
    setEntries((prev) => {
      const list = prev[dateKey] ? [...prev[dateKey]] : []
      list.push({
        id: row.id,
        bean: row.bean,
        roast: row.roast,
        art: row.art,
        note: row.note,
        photo: row.photo,
        photoThumb: row.photo_thumb,
        photoPosition: row.photo_position,
        photoZoom: row.photo_zoom,
      })
      return { ...prev, [dateKey]: list }
    })
    return null
  }

  async function updateLog(dateKey, idx, data) {
    const existing = entries[dateKey]?.[idx]
    if (!existing) return null
    const [{ url: photoUrl, error: uploadError }, { url: thumbUrl, error: thumbError }] = await Promise.all([
      uploadPhotoIfNeeded(data.photo, userId),
      uploadPhotoIfNeeded(data.photoThumb, userId),
    ])
    if (uploadError) {
      console.error(uploadError)
      return uploadError
    }
    if (thumbError) {
      console.error(thumbError)
      return thumbError
    }
    const newDateKey = data.dateKey || dateKey
    const { error } = await supabase
      .from('entries')
      .update({
        date_key: newDateKey,
        bean: data.bean,
        roast: data.roast,
        art: data.art,
        note: data.note,
        photo: photoUrl,
        photo_thumb: thumbUrl,
        photo_position: data.photoPosition,
        photo_zoom: data.photoZoom,
      })
      .eq('id', existing.id)
    if (error) {
      console.error(error)
      return error
    }
    setEntries((prev) => {
      const updated = {
        id: existing.id,
        bean: data.bean,
        roast: data.roast,
        art: data.art,
        note: data.note,
        photo: photoUrl,
        photoThumb: thumbUrl,
        photoPosition: data.photoPosition,
        photoZoom: data.photoZoom,
      }
      if (newDateKey === dateKey) {
        const list = [...(prev[dateKey] || [])]
        list[idx] = updated
        return { ...prev, [dateKey]: list }
      }
      const oldList = [...(prev[dateKey] || [])]
      oldList.splice(idx, 1)
      const next = { ...prev, [newDateKey]: [...(prev[newDateKey] || []), updated] }
      if (oldList.length === 0) delete next[dateKey]
      else next[dateKey] = oldList
      return next
    })
    return null
  }

  async function deleteLog(dateKey, idx) {
    const existing = entries[dateKey]?.[idx]
    if (!existing) return null
    const { error } = await supabase.from('entries').delete().eq('id', existing.id)
    if (error) {
      console.error(error)
      return error
    }
    setEntries((prev) => {
      const list = [...(prev[dateKey] || [])]
      list.splice(idx, 1)
      const next = { ...prev }
      if (list.length === 0) delete next[dateKey]
      else next[dateKey] = list
      return next
    })
    return null
  }

  async function addPurchase(data) {
    const { data: row, error } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        date_key: data.date,
        bean_brand: data.beanBrand || null,
        bean_weight: numOrNull(data.beanWeight),
        bean_price: numOrNull(data.beanPrice),
        milk_brand: data.milkBrand || null,
        milk_volume: numOrNull(data.milkVolume),
        milk_price: numOrNull(data.milkPrice),
      })
      .select()
      .single()
    if (error) {
      console.error(error)
      return error
    }
    setPurchases((prev) => [...prev, mapPurchaseRow(row)])
    return null
  }

  async function updatePurchase(idx, data) {
    const existing = purchases[idx]
    if (!existing) return null
    const { error } = await supabase
      .from('purchases')
      .update({
        date_key: data.date,
        bean_brand: data.beanBrand || null,
        bean_weight: numOrNull(data.beanWeight),
        bean_price: numOrNull(data.beanPrice),
        milk_brand: data.milkBrand || null,
        milk_volume: numOrNull(data.milkVolume),
        milk_price: numOrNull(data.milkPrice),
      })
      .eq('id', existing.id)
    if (error) {
      console.error(error)
      return error
    }
    setPurchases((prev) => {
      const list = [...prev]
      list[idx] = { ...data, id: existing.id }
      return list
    })
    return null
  }

  async function deletePurchase(idx) {
    const existing = purchases[idx]
    if (!existing) return null
    const { error } = await supabase.from('purchases').delete().eq('id', existing.id)
    if (error) {
      console.error(error)
      return error
    }
    setPurchases((prev) => prev.filter((_, i) => i !== idx))
    return null
  }

  function addBeanOption(name) {
    setBeanOptions((prev) => (prev.includes(name) ? prev : [...prev.filter((b) => b !== '其他'), name, '其他']))
  }

  function addArtOption(name) {
    setArtOptions((prev) => (prev.includes(name) ? prev : [...prev.filter((a) => a !== '其他'), name, '其他']))
  }

  return {
    entries,
    purchases,
    beanOptions,
    artOptions,
    loading,
    purchasesLoading,
    error,
    refetch,
    loadPurchases,
    addLog,
    updateLog,
    deleteLog,
    addPurchase,
    updatePurchase,
    deletePurchase,
    addBeanOption,
    addArtOption,
  }
}
