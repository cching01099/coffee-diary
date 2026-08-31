import { useState } from 'react'
import { useCoffeeData } from './hooks/useCoffeeData'
import BottomTabBar from './components/BottomTabBar'
import AccountMenu from './components/AccountMenu'
import CalendarPage from './pages/CalendarPage'
import PurchasesPage from './pages/PurchasesPage'
import StatsPage from './pages/StatsPage'

export default function App({ user, onSignOut }) {
  const [activeTab, setActiveTab] = useState('calendar')
  const data = useCoffeeData(user.id)

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-line">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
          <h1 className="text-lg font-semibold">☕ 咖啡日記</h1>
          <AccountMenu email={user.email} onSignOut={onSignOut} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 pb-24">
        {data.loading ? (
          <div className="text-center py-20 text-ink-dim text-sm">載入中...</div>
        ) : (
          <>
            {activeTab === 'calendar' && <CalendarPage data={data} />}
            {activeTab === 'purchases' && <PurchasesPage data={data} />}
            {activeTab === 'stats' && <StatsPage data={data} />}
          </>
        )}
      </div>
      <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
