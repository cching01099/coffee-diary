import { Link, Navigate, Route, Routes } from 'react-router-dom'
import BottomTabBar from './components/BottomTabBar'
import CalendarPage from './pages/CalendarPage'
import PurchasesPage from './pages/PurchasesPage'
import StatsPage from './pages/StatsPage'
import CommunityPage from './pages/CommunityPage'
import PostDetailPage from './pages/PostDetailPage'
import AuthorPage from './pages/AuthorPage'
import NotificationsPage from './pages/NotificationsPage'
import NotificationBell from './components/NotificationBell'
import { useCommunityData } from './hooks/useCommunityData'
import { useNotifications } from './hooks/useNotifications'

export default function App({ data, headerRight, badge, userId = null, onRequireLogin = () => {} }) {
  const community = useCommunityData(userId, onRequireLogin)
  const notifications = useNotifications(userId)
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-line">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              <Link to="/calendar" viewTransition className="flex items-center gap-1.5">
                <img src="/logo.png" alt="" className="h-8 w-8" />
                Pourista
              </Link>
            </h1>
            {badge && (
              <span className="text-[10px] text-ink-dim border border-line rounded-full px-2 py-0.5">
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userId && (
              <NotificationBell
                notifications={notifications.notifications}
                unreadCount={notifications.unreadCount}
                markAsRead={notifications.markAsRead}
                markAllAsRead={notifications.markAllAsRead}
              />
            )}
            {headerRight}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 pb-24">
        {data.loading ? (
          <div className="min-h-[70vh] flex items-center justify-center text-ink-dim text-sm">載入中...</div>
        ) : data.error ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-ink-dim text-sm">
            <p>資料載入失敗，請檢查網路連線</p>
            <button
              onClick={data.refetch}
              className="px-4 py-1.5 rounded-full border border-accent text-accent text-sm font-semibold"
            >
              重試
            </button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<CalendarPage data={data} />} />
            <Route path="/purchases" element={<PurchasesPage data={data} />} />
            <Route path="/stats" element={<StatsPage data={data} />} />
            <Route path="/community" element={<CommunityPage community={community} userId={userId} />} />
            <Route
              path="/community/post/:postId"
              element={<PostDetailPage community={community} userId={userId} onRequireLogin={onRequireLogin} />}
            />
            <Route
              path="/community/u/:authorId"
              element={<AuthorPage userId={userId} onRequireLogin={onRequireLogin} />}
            />
            <Route
              path="/community/notifications"
              element={
                <NotificationsPage
                  notifications={notifications.notifications}
                  loading={notifications.loading}
                  markAsRead={notifications.markAsRead}
                  markAllAsRead={notifications.markAllAsRead}
                />
              }
            />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        )}
      </div>
      <BottomTabBar />
    </div>
  )
}
