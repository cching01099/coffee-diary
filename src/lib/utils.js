export function fmtKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US')
}

export function getWeekRange(d) {
  const day = (d.getDay() + 6) % 7 // Monday = 0
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return [start, end]
}

export function dateInPeriod(dateStr, period, anchor) {
  const d = new Date(dateStr)
  if (period === 'week') {
    const [start, end] = getWeekRange(anchor)
    return d >= start && d <= end
  } else if (period === 'month') {
    return d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth()
  } else {
    return d.getFullYear() === anchor.getFullYear()
  }
}

export function periodDayCount(period, anchor) {
  if (period === 'week') return 7
  if (period === 'month') return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
  const y = anchor.getFullYear()
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365
}

export function periodLabelText(period, anchor) {
  if (period === 'week') {
    const [start, end] = getWeekRange(anchor)
    const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`
    return `${start.getFullYear()} · ${fmt(start)} - ${fmt(end)}`
  } else if (period === 'month') {
    return `${anchor.getFullYear()} 年 ${anchor.getMonth() + 1} 月`
  }
  return `${anchor.getFullYear()} 年`
}

export const CAFFEINE_DOSE_G = 18
export const CAFFEINE_MG_PER_G = 10

// Photos are only ever shown as small squares in this app, so there's no
// reason to store a phone camera's full-resolution original — resize it
// down before it ever gets base64-encoded into the database.
export function compressImage(file, { maxDimension = 1280, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('圖片讀取失敗'))
    }
    img.src = objectUrl
  })
}

export function translateAuthError(message) {
  if (!message) return message
  if (/security purposes.*only request this/i.test(message)) {
    return '操作過於頻繁，請稍後再試一次'
  }
  return message
}
