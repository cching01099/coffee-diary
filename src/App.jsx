import { Navigate, Route, Routes } from 'react-router-dom'
import { useCoffeeData } from './hooks/useCoffeeData'
import BottomTabBar from './components/BottomTabBar'
import AccountMenu from './components/AccountMenu'
import CalendarPage from './pages/CalendarPage'
import PurchasesPage from './pages/PurchasesPage'
import StatsPage from './pages/StatsPage'

export default function App({ user, onSignOut }) {
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
          <div className="min-h-[70vh] flex items-center justify-center text-ink-dim text-sm">載入中...</div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<CalendarPage data={data} />} />
            <Route path="/purchases" element={<PurchasesPage data={data} />} />
            <Route path="/stats" element={<StatsPage data={data} />} />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        )}
      </div>
      <BottomTabBar />
    </div>
  )
}
