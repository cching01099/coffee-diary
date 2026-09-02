import { useState } from 'react'
import { fmtKey } from '../lib/utils'
import heartSimple from '../assets/demo/heart-simple.jpg'
import heartRosette from '../assets/demo/heart-rosette.jpg'
import tulip from '../assets/demo/tulip.jpg'

const DEFAULT_BEAN_OPTIONS = ['星巴克', '咖樂迪', '超市', '其他']
const DEFAULT_ART_OPTIONS = ['無', '愛心', '鬱金香', '天鵝', '葉子', '其他']

// Clamp so seed dates never spill into the previous month, no matter what
// day of the month "today" happens to be.
function clampToThisMonth(daysAgo) {
  const maxDaysAgo = new Date().getDate() - 1 // days since the 1st
  return Math.min(daysAgo, maxDaysAgo)
}

function seedEntries() {
  const entries = {}
  let n = 0
  const add = (daysAgo, bean, roast, art, note, photo = null) => {
    const d = new Date()
    d.setDate(d.getDate() - clampToThisMonth(daysAgo))
    const key = fmtKey(d)
    if (!entries[key]) entries[key] = []
    entries[key].push({ id: `demo-entry-${n++}`, bean, roast, art, note, photo, photoPosition: null })
  }
  add(0, '超市', '中焙', '愛心', '今天狀態最好的一杯！', heartSimple)
  add(1, '咖樂迪', '中深焙', '天鵝', '奶泡收得比昨天穩。')
  add(2, '星巴克', '深焙', '鬱金香', '層次數對了，但整體歪一邊。', tulip)
  add(2, '星巴克', '中焙', '愛心', '下午加碼一杯。', heartRosette)
  add(5, '超市', '淺焙', '其他', '練習中。')
  return entries
}

function seedPurchases() {
  const purchases = []
  const add = (daysAgo, beanBrand, beanWeight, beanPrice, milkBrand, milkVolume, milkPrice) => {
    const d = new Date()
    d.setDate(d.getDate() - clampToThisMonth(daysAgo))
    purchases.push({
      id: `demo-purchase-${purchases.length}`,
      date: fmtKey(d),
      beanBrand,
      beanWeight,
      beanPrice,
      milkBrand,
      milkVolume,
      milkPrice,
    })
  }
  add(0, '吉本屋', 227, 380, '光泉全脂', 2000, 130)
  add(1, '吉本屋', 227, 380, '瑞穗全脂', 1892, 145)
  return purchases
}

// Read-only sample data for people who haven't logged in yet — same shape as
// useCoffeeData, so pages don't need to know they're looking at a demo.
// Every action that would change data just asks to log in instead.
export function useGuestCoffeeData(onRequireLogin) {
  const [entries] = useState(seedEntries)
  const [purchases] = useState(seedPurchases)
  const [beanOptions] = useState(DEFAULT_BEAN_OPTIONS)
  const [artOptions] = useState(DEFAULT_ART_OPTIONS)

  async function addLog() {
    onRequireLogin()
    return null
  }
  async function updateLog() {
    onRequireLogin()
    return null
  }
  async function deleteLog() {
    onRequireLogin()
    return null
  }
  async function addPurchase() {
    onRequireLogin()
    return null
  }
  async function updatePurchase() {
    onRequireLogin()
    return null
  }
  async function deletePurchase() {
    onRequireLogin()
    return null
  }
  function addBeanOption() {
    onRequireLogin()
  }
  function addArtOption() {
    onRequireLogin()
  }

  return {
    entries,
    purchases,
    beanOptions,
    artOptions,
    loading: false,
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
