import { useEffect, useState } from 'react'
import { fmtKey } from '../lib/utils'

const blank = { date: '', beanBrand: '', beanWeight: '', beanPrice: '', milkBrand: '', milkVolume: '', milkPrice: '' }

const inputClass = 'w-full bg-card border border-line rounded-lg px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim'

function UnitInput({ unit, ...props }) {
  return (
    <div className="relative">
      <input className={`${inputClass} pr-9`} {...props} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-dim pointer-events-none">
        {unit}
      </span>
    </div>
  )
}

export default function AddPurchaseSheet({ isOpen, onClose, editPurchase, onSubmit, onDelete }) {
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(editPurchase ? { ...editPurchase } : { ...blank, date: fmtKey(new Date()) })
  }, [isOpen, editPurchase])

  if (!isOpen) return null

  function field(key) {
    return {
      value: form[key],
      onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    }
  }

  async function handleSubmit() {
    setSaving(true)
    await onSubmit({ ...form })
    setSaving(false)
  }

  async function handleDeleteClick() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="w-full max-w-md bg-bg rounded-t-[20px] max-h-[88dvh] overflow-y-auto pb-8">
        <div className="sticky top-0 z-10 bg-bg flex justify-between items-center px-5 py-5 border-b border-line">
          <button
            onClick={onClose}
            disabled={saving || deleting}
            className="px-3.5 py-1.5 rounded-full border border-line text-ink-dim text-sm disabled:opacity-50"
          >
            取消
          </button>
          <div className="font-semibold text-base">{editPurchase ? '編輯採購' : '新增採購'}</div>
          <button
            onClick={handleSubmit}
            disabled={saving || deleting}
            className="px-3.5 py-1.5 rounded-full border border-accent text-accent font-semibold text-sm disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>

        <div className="px-5 pt-5">
          {editPurchase && (
            <div className="mb-5">
              <button
                onClick={handleDeleteClick}
                disabled={saving || deleting}
                className="w-full text-center py-2.5 rounded-lg border border-[#8C3A2E] text-[#8C3A2E] disabled:opacity-50"
              >
                {deleting ? '刪除中...' : '刪除這筆採購'}
              </button>
            </div>
          )}

          <div className="mb-5">
            <div className="text-xs text-ink-dim mb-2">日期</div>
            <input type="date" className={`${inputClass} text-[15px] font-medium appearance-none`} {...field('date')} />
          </div>

          <div className="mb-5">
            <div className="text-xs text-ink-dim mb-2">咖啡豆（選填）</div>
            <div className="flex flex-col gap-2">
              <input placeholder="品牌，例如：吉本屋" className={inputClass} {...field('beanBrand')} />
              <UnitInput type="number" placeholder="重量" inputMode="numeric" unit="g" {...field('beanWeight')} />
              <UnitInput type="number" placeholder="花費" inputMode="numeric" unit="元" {...field('beanPrice')} />
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-ink-dim mb-2">牛奶（選填）</div>
            <div className="flex flex-col gap-2">
              <input placeholder="品牌，例如：光泉全脂" className={inputClass} {...field('milkBrand')} />
              <UnitInput type="number" placeholder="容量" inputMode="numeric" unit="ml" {...field('milkVolume')} />
              <UnitInput type="number" placeholder="花費" inputMode="numeric" unit="元" {...field('milkPrice')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
