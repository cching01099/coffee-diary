import { useMemo, useState } from 'react'
import { fmtKey, fmtNum, CAFFEINE_DOSE_G, CAFFEINE_MG_PER_G } from '../lib/utils'
import AddCupSheet from '../components/AddCupSheet'

const today = new Date()
const todayKey = fmtKey(today)

export default function CalendarPage({ data }) {
  const { entries, beanOptions, artOptions, addLog, updateLog, deleteLog, addBeanOption, addArtOption } = data

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editIdx, setEditIdx] = useState(null)

  function changeMonth(delta) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  const calendarCells = useMemo(() => {
    let firstDay = new Date(viewYear, viewMonth, 1).getDay()
    firstDay = (firstDay + 6) % 7 // Monday-start
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells = Array(firstDay).fill(null)
    for (let day = 1; day <= daysInMonth; day++) {
      const key = fmtKey(new Date(viewYear, viewMonth, day))
      cells.push({ day, key })
    }
    return cells
  }, [viewYear, viewMonth])

  const dayEntries = entries[selectedKey] || []
  const isToday = selectedKey === todayKey
  const dayLabel = isToday
    ? '今日'
    : new Date(selectedKey).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })

  const mg = dayEntries.length * CAFFEINE_DOSE_G * CAFFEINE_MG_PER_G
  const pct = Math.min(100, (mg / 400) * 100)

  function openNewSheet() {
    setEditIdx(null)
    setSheetOpen(true)
  }
  function openEditSheet(idx) {
    setEditIdx(idx)
    setSheetOpen(true)
  }

  async function handleSubmit(data_) {
    const error = editIdx !== null ? await updateLog(selectedKey, editIdx, data_) : await addLog(selectedKey, data_)
    if (error) {
      alert(`保存失敗：${error.message}`)
      return
    }
    setSheetOpen(false)
  }
  async function handleDelete() {
    const error = await deleteLog(selectedKey, editIdx)
    if (error) {
      alert(`刪除失敗：${error.message}`)
      return
    }
    setSheetOpen(false)
  }

  return (
    <div>
      <h1 className="font-bold text-2xl mb-4">{viewMonth + 1}月</h1>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => changeMonth(-1)} className="w-7 h-7 rounded-lg border border-line">‹</button>
        <div className="text-ink-dim text-[13px]">{viewYear} 年 {viewMonth + 1} 月</div>
        <button onClick={() => changeMonth(1)} className="w-7 h-7 rounded-lg border border-line">›</button>
      </div>

      <div className="bg-card rounded-2xl border border-line p-3">
        <div className="grid grid-cols-7 mb-1.5 text-center text-[11px] text-ink-dim">
          {['一', '二', '三', '四', '五', '六', '日'].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((cell, i) => {
            if (!cell) return <div key={i} />
            const dayList = entries[cell.key] || []
            const hasEntry = dayList.length > 0
            const photoEntry = [...dayList].reverse().find((e) => e.photo)
            const isSelected = cell.key === selectedKey
            const isTodayCell = cell.key === todayKey
            return (
              <button
                key={cell.key}
                onClick={() => setSelectedKey(cell.key)}
                className={`aspect-square rounded-lg text-[13px] flex items-center justify-center relative overflow-hidden ${
                  isSelected ? 'ring-2 ring-accent' : ''
                } ${!hasEntry && isTodayCell ? 'text-accent bg-accent/10' : ''} ${
                  !hasEntry ? 'bg-ink/5 text-ink-dim' : ''
                }`}
              >
                {hasEntry ? (
                  photoEntry ? (
                    <>
                      <div className="absolute inset-0 bg-line animate-pulse" />
                      <img
                        src={photoEntry.photoThumb || photoEntry.photo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover rounded-lg"
                        style={{
                          objectPosition: photoEntry.photoPosition || '50% 50%',
                          transform: `scale(${photoEntry.photoZoom || 1})`,
                          transformOrigin: photoEntry.photoPosition || '50% 50%',
                        }}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full rounded-lg bg-gradient-to-br from-[#8A5A38] via-[#5C3826] to-[#3E2519] flex items-center justify-center">☕</div>
                  )
                ) : (
                  cell.day
                )}
              </button>
            )
          })}
        </div>
      </div>

      <button
        onClick={openNewSheet}
        className="w-full mt-4 py-2.5 bg-cta text-bg rounded-full font-semibold"
      >
        + 添加一杯
      </button>

      <div className="mt-6 mb-3 text-lg font-medium">{dayLabel}</div>
      <div className="bg-card rounded-2xl border border-line p-4 mb-2.5">
        <div className="text-[12.5px] text-ink-dim mb-2">已記錄</div>
        <div className="text-[22px] font-bold mb-3">{dayEntries.length} 杯</div>
        <div className="text-[12.5px] text-ink-dim mb-2">咖啡因估計（以 18g 萃取，每杯約 180mg）</div>
        <div className="h-2 bg-ink/10 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-xs">
          <span className="text-accent">{fmtNum(mg)} mg</span>
          <span className="text-ink-dim">建議上限 400 mg</span>
        </div>
      </div>

      {dayEntries.length === 0 ? (
        <div className="text-center py-6 text-ink-dim text-sm">這天還沒有記錄</div>
      ) : (
        dayEntries.map((e, idx) => (
          <div
            key={idx}
            onClick={() => openEditSheet(idx)}
            className="flex items-center gap-3 bg-card rounded-2xl border border-line p-3 mb-2 cursor-pointer"
          >
            <div className="relative w-[46px] h-[46px] rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-xl">
              {e.photo ? (
                <>
                  <div className="absolute inset-0 bg-line animate-pulse" />
                  <img
                    src={e.photoThumb || e.photo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: e.photoPosition || '50% 50%',
                      transform: `scale(${e.photoZoom || 1})`,
                      transformOrigin: e.photoPosition || '50% 50%',
                    }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#8A5A38] via-[#5C3826] to-[#3E2519] flex items-center justify-center">☕</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14.5px]">{e.bean}</div>
              <div className="text-[11px] text-ink-dim mt-0.5">
                {e.roast ? `${e.roast} · ${e.art}` : e.art}
              </div>
            </div>
          </div>
        ))
      )}

      <AddCupSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        dateKey={selectedKey}
        editEntry={editIdx !== null ? dayEntries[editIdx] : null}
        beanOptions={beanOptions}
        artOptions={artOptions}
        onAddBeanOption={addBeanOption}
        onAddArtOption={addArtOption}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </div>
  )
}
