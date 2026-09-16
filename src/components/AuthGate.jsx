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
  const displayName = user.user_metadata?.full_name || user.email
  const avatarUrl = user.user_metadata?.avatar_url

  // profiles.display_name/avatar_url is only seeded once at signup (by the
  // handle_new_user trigger) — if the OAuth provider hadn't populated
  // user_metadata yet at that moment, it's stuck null forever. Re-sync it
  // from the live session on every login so it self-heals.
  useEffect(() => {
    supabase
      .from('profiles')
      .update({ display_name: displayName, avatar_url: avatarUrl || null })
      .eq('user_id', user.id)
      .then(({ error }) => error && console.error(error))
  }, [user.id, displayName, avatarUrl])

  return (
    <App
      data={data}
      userId={user.id}
      headerRight={<AccountMenu displayName={displayName} avatarUrl={avatarUrl} onSignOut={onSignOut} />}
    />
  )
}

function GuestShell() {
  const [promptOpen, setPromptOpen] = useState(false)
  const data = useGuestCoffeeData(() => setPromptOpen(true))

  return (
    <>
      <App
        data={data}
        badge="體驗版"
        onRequireLogin={() => setPromptOpen(true)}
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

  // Google OAuth redirects back with the session in a URL hash; once
  // Supabase has parsed it, strip any leftover fragment (e.g. a bare "#").
  useEffect(() => {
    if (session && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [session])

  if (session === undefined) {
    return (
      <div key="checking" className="fade-in min-h-screen bg-bg flex items-center justify-center text-ink-dim text-sm">
        載入中...
      </div>
    )
  }

  if (!session) {
    return (
      <div key="guest" className="fade-in">
        <GuestShell />
      </div>
    )
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/', { viewTransition: true })
  }

  return (
    <div key="authenticated" className="fade-in">
      <AuthenticatedShell user={session.user} onSignOut={handleSignOut} />
    </div>
  )
}
