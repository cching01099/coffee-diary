import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCoffeeData } from '../hooks/useCoffeeData'
import { useGuestCoffeeData } from '../hooks/useGuestCoffeeData'
import App from '../App'
import AccountMenu from './AccountMenu'
import LoginPromptModal from './LoginPromptModal'

function AuthenticatedShell({ user, onSignOut }) {
  const data = useCoffeeData(user.id)
  return <App data={data} headerRight={<AccountMenu email={user.email} onSignOut={onSignOut} />} />
}

function GuestShell() {
  const [promptOpen, setPromptOpen] = useState(false)
  const data = useGuestCoffeeData(() => setPromptOpen(true))

  return (
    <>
      <App
        data={data}
        badge="體驗版"
        headerRight={
          <button
            onClick={() => setPromptOpen(true)}
            className="px-3.5 py-1.5 rounded-full border border-accent text-accent text-sm font-semibold"
          >
            登入
          </button>
        }
      />
      {promptOpen && <LoginPromptModal onClose={() => setPromptOpen(false)} />}
    </>
  )
}

export default function AuthGate() {
  const [session, setSession] = useState(undefined) // undefined = checking, null = signed out
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-ink-dim text-sm">載入中...</div>
  }

  if (!session) {
    return <GuestShell />
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return <AuthenticatedShell user={session.user} onSignOut={handleSignOut} />
}
