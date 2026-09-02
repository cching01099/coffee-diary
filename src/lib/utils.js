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

const AUTH_ERROR_MESSAGES = {
  'Invalid login credentials': '帳號或密碼錯誤，或此信箱尚未註冊過',
  'Email not confirmed': '信箱尚未完成驗證，請查看收件匣並點擊驗證連結',
  'User already registered': '此信箱已註冊，請直接登入',
  'Password should be at least 6 characters': '密碼至少需要 6 個字元',
  'Unable to validate email address: invalid format': '請輸入正確格式的 Email',
  'signup requires a valid password': '請輸入密碼',
}

export function translateAuthError(message) {
  if (!message) return message
  if (AUTH_ERROR_MESSAGES[message]) return AUTH_ERROR_MESSAGES[message]
  if (/security purposes.*only request this/i.test(message)) {
    return '操作過於頻繁，請稍後再試一次'
  }
  return message
}
