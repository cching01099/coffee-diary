import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import App from '../App'
import LoginPage from './LoginPage'

export default function AuthGate() {
  const [session, setSession] = useState(undefined) // undefined = checking, null = signed out

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
    return <LoginPage />
  }

  return <App user={session.user} onSignOut={() => supabase.auth.signOut()} />
}
