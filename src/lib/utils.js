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
