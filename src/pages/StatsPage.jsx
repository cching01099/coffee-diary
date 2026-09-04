import { useMemo, useState } from 'react'
import { dateInPeriod, periodDayCount, periodLabelText } from '../lib/utils'

function RankCard({ label, countMap, open, onToggle }) {
  const sorted = useMemo(() => Object.entries(countMap).sort((a, b) => b[1] - a[1]), [countMap])
  const hasData = sorted.length > 0
  const topName = hasData ? sorted[0][0] : '—'

  return (
    <div className="bg-card rounded-2xl border border-line p-4">
      <div
        onClick={hasData ? onToggle : undefined}
        className={`flex justify-between items-center ${hasData ? 'cursor-pointer' : ''}`}
      >
        <div>
          <div className="text-xs text-ink-dim">{label}</div>
          <div className="font-bold text-lg text-accent mt-1">{topName}</div>
        </div>
        {hasData && (
          <span className={`text-ink-dim text-sm transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        )}
      </div>
      {hasData && open && (
        <div className="mt-3 pt-1 border-t border-line">
          {sorted.map(([name, count]) => (
            <div key={name} className="flex justify-between items-center py-2.5">
              <div className="text-sm">{name}</div>
              <div className="font-semibold text-sm text-accent">{count} 杯</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StatsPage({ data }) {
  const { entries } = data
  const [period, setPeriod] = useState('month')
  const [anchor, setAnchor] = useState(new Date())
  const [beanOpen, setBeanOpen] = useState(false)
  const [roastOpen, setRoastOpen] = useState(false)
  const [artOpen, setArtOpen] = useState(false)

  function changePeriod(p) {
    setPeriod(p)
    setAnchor(new Date())
  }
  function changeNav(delta) {
    const d = new Date(anchor)
    if (period === 'week') d.setDate(d.getDate() + delta * 7)
    else if (period === 'month') d.setMonth(d.getMonth() + delta)
    else d.setFullYear(d.getFullYear() + delta)
    setAnchor(d)
  }

  const { cups, avgPerDay, beanCount, roastCount, artCount, photos, busiestDay } = useMemo(() => {
    let cups = 0
    const beanCount = {}
    const roastCount = {}
    const artCount = {}
    const photos = []
    let busiestDay = null
    Object.keys(entries).forEach((key) => {
      if (!dateInPeriod(key, period, anchor)) return
      const dayCount = entries[key].length
      if (dayCount > 0 && (!busiestDay || dayCount > busiestDay.count)) {
        busiestDay = { key, count: dayCount }
      }
      entries[key].forEach((e) => {
        cups++
        beanCount[e.bean] = (beanCount[e.bean] || 0) + 1
        if (e.roast) roastCount[e.roast] = (roastCount[e.roast] || 0) + 1
        artCount[e.art] = (artCount[e.art] || 0) + 1
        if (e.photo) photos.push({ src: e.photo, position: e.photoPosition, zoom: e.photoZoom })
      })
    })
    const avgPerDay = cups / periodDayCount(period, anchor)
    return { cups, avgPerDay, beanCount, roastCount, artCount, photos, busiestDay }
  }, [entries, period, anchor])

  const busiestDayLabel = busiestDay
    ? new Date(busiestDay.key).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
    : null

  const cupsLabel = period === 'week' ? '本週杯數' : period === 'year' ? '本年杯數' : '本月杯數'
  const photosLabel = period === 'week' ? '本週照片' : period === 'year' ? '本年照片' : '本月照片'
  const busiestLabel = period === 'week' ? '本週最多杯數' : period === 'year' ? '本年最多杯數' : '本月最多杯數'

  return (
    <div>
      <h1 className="font-bold text-2xl mb-4">統計</h1>

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

      <div className="bg-card rounded-2xl border border-line p-3.5 mb-4">
        <div className="text-xs text-ink-dim mb-2">{photosLabel}</div>
        <div className="grid grid-cols-8 gap-1.5">
          {photos.length === 0 ? (
            <div className="col-span-8 text-center py-4 text-ink-dim text-sm">這段期間還沒有拍照的記錄</div>
          ) : (
            photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-md overflow-hidden">
                <div className="absolute inset-0 bg-line animate-pulse" />
                <img
                  src={p.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    objectPosition: p.position || '50% 50%',
                    transform: `scale(${p.zoom || 1})`,
                    transformOrigin: p.position || '50% 50%',
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <div className="bg-card rounded-2xl border border-line p-4">
          <div className="text-xs text-ink-dim mb-1.5">{cupsLabel}</div>
          <div className="text-[22px] font-bold text-accent">{cups}</div>
        </div>
        <div className="bg-card rounded-2xl border border-line p-4">
          <div className="text-xs text-ink-dim mb-1.5">平均每天</div>
          <div className="text-[22px] font-bold text-accent">{avgPerDay.toFixed(1)}<span className="text-[13px] text-ink-dim ml-1">杯</span></div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-line p-4 mb-2.5">
        <div className="text-xs text-ink-dim mb-1.5">{busiestLabel}</div>
        {busiestDay ? (
          <div className="flex items-baseline justify-between">
            <div className="text-[22px] font-bold text-accent">{busiestDay.count}<span className="text-[13px] text-ink-dim ml-1">杯</span></div>
            <div className="text-ink-dim text-sm">{busiestDayLabel}</div>
          </div>
        ) : (
          <div className="text-[22px] font-bold text-accent">—</div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <RankCard label="最愛咖啡豆品牌" countMap={beanCount} open={beanOpen} onToggle={() => setBeanOpen((v) => !v)} />
        <RankCard label="最愛烘焙程度" countMap={roastCount} open={roastOpen} onToggle={() => setRoastOpen((v) => !v)} />
        <RankCard label="最常拉花圖案" countMap={artCount} open={artOpen} onToggle={() => setArtOpen((v) => !v)} />
      </div>
    </div>
  )
}
