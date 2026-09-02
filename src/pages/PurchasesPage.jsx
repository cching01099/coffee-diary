import { useEffect, useMemo, useState } from 'react'
import { dateInPeriod, periodLabelText, fmtNum } from '../lib/utils'
import AddPurchaseSheet from '../components/AddPurchaseSheet'

const periodLabels = {
  week: { cost: '本週花費', beans: '本週豆量', milk: '本週奶量' },
  month: { cost: '本月花費', beans: '本月豆量', milk: '本月奶量' },
  year: { cost: '本年花費', beans: '本年豆量', milk: '本年奶量' },
}

export default function PurchasesPage({ data }) {
  const { purchases, purchasesLoading, loadPurchases, addPurchase, updatePurchase, deletePurchase } = data

  // Purchases aren't fetched until this page is actually visited.
  useEffect(() => {
    loadPurchases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [period, setPeriod] = useState('month')
  const [anchor, setAnchor] = useState(new Date())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editIdx, setEditIdx] = useState(null)

  function changePeriod(p) {
    setPeriod(p)
    setAnchor(new Date()) // reset browsing position to now on every granularity switch
  }
  function changeNav(delta) {
    const d = new Date(anchor)
    if (period === 'week') d.setDate(d.getDate() + delta * 7)
    else if (period === 'month') d.setMonth(d.getMonth() + delta)
    else d.setFullYear(d.getFullYear() + delta)
    setAnchor(d)
  }

  const { cost, beans, milk, filtered } = useMemo(() => {
    let cost = 0, beans = 0, milk = 0
    const filtered = []
    purchases.forEach((p, idx) => {
      if (!dateInPeriod(p.date, period, anchor)) return
      cost += Number(p.beanPrice || 0) + Number(p.milkPrice || 0)
      beans += Number(p.beanWeight || 0)
      milk += Number(p.milkVolume || 0)
      filtered.push({ ...p, idx })
    })
    filtered.sort((a, b) => b.date.localeCompare(a.date))
    return { cost, beans, milk, filtered }
  }, [purchases, period, anchor])

  function openNew() {
    setEditIdx(null)
    setSheetOpen(true)
  }
  function openEdit(idx) {
    setEditIdx(idx)
    setSheetOpen(true)
  }
  async function handleSubmit(formData) {
    const error = editIdx !== null ? await updatePurchase(editIdx, formData) : await addPurchase(formData)
    if (error) {
      alert(`保存失敗：${error.message}`)
      return
    }
    setSheetOpen(false)
  }
  async function handleDelete() {
    const error = await deletePurchase(editIdx)
    if (error) {
      alert(`刪除失敗：${error.message}`)
      return
    }
    setSheetOpen(false)
  }

  return (
    <div>
      <h1 className="font-bold text-2xl mb-4">採購</h1>

      <div className="flex gap-2 mb-4">
        {['week', 'month', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => changePeriod(p)}
            className={`px-4 py-1.5 rounded-full border text-sm ${
              period === p ? 'bg-cta border-cta text-bg' : 'border-line text-ink-dim'
            }`}
          >
            {p === 'week' ? '週' : p === 'month' ? '月' : '年'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => changeNav(-1)} className="w-7 h-7 rounded-lg border border-line">‹</button>
        <div className="text-ink-dim text-[13px]">{periodLabelText(period, anchor)}</div>
        <button onClick={() => changeNav(1)} className="w-7 h-7 rounded-lg border border-line">›</button>
      </div>

      <div className="bg-card rounded-2xl border border-line p-4 mb-2.5">
        <div className="text-xs text-ink-dim mb-1.5">{periodLabels[period].cost}</div>
        <div className="text-[22px] font-bold text-accent">${fmtNum(cost)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-card rounded-2xl border border-line p-4">
          <div className="text-xs text-ink-dim mb-1.5">{periodLabels[period].beans}</div>
          <div className="text-[22px] font-bold text-accent">{fmtNum(beans)}<span className="text-[13px] text-ink-dim">g</span></div>
        </div>
        <div className="bg-card rounded-2xl border border-line p-4">
          <div className="text-xs text-ink-dim mb-1.5">{periodLabels[period].milk}</div>
          <div className="text-[22px] font-bold text-accent">{fmtNum(milk)}<span className="text-[13px] text-ink-dim">ml</span></div>
        </div>
      </div>

      <button onClick={openNew} className="w-full py-2.5 bg-cta text-bg rounded-full font-semibold mb-6">
        + 添加一筆
      </button>

      <div className="text-lg font-medium mb-3">購買記錄</div>
      {purchasesLoading ? (
        <div className="text-center py-6 text-ink-dim text-sm">載入中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6 text-ink-dim text-sm">這段期間還沒有購買記錄</div>
      ) : (
        filtered.map((p) => {
          const parts = []
          if (p.beanBrand) parts.push(`☕ ${p.beanBrand} · ${fmtNum(p.beanWeight)}g · $${fmtNum(p.beanPrice)}`)
          if (p.milkBrand) parts.push(`🥛 ${p.milkBrand} · ${fmtNum(p.milkVolume)}ml · $${fmtNum(p.milkPrice)}`)
          return (
            <div
              key={p.idx}
              onClick={() => openEdit(p.idx)}
              className="flex items-center gap-3 bg-card rounded-2xl border border-line p-3 mb-2 cursor-pointer"
            >
              <div className="w-[46px] h-[46px] rounded-lg flex-shrink-0 flex items-center justify-center text-xl bg-card2">🛒</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[14.5px]">
                  {new Date(p.date).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
                </div>
                <div className="text-[11px] text-ink-dim mt-0.5">{parts.join(' · ') || '（未填寫項目）'}</div>
              </div>
            </div>
          )
        })
      )}

      <AddPurchaseSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editPurchase={editIdx !== null ? purchases[editIdx] : null}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  )
}
