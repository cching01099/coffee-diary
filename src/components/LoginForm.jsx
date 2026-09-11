import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { translateAuthError } from '../lib/utils'

// Google login control, shared by the full sign-in flow and the
// "log in to save" prompt shown to guests.
export default function LoginForm() {
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(translateAuthError(error.message))
  }

  function handleLineLogin() {
    setError('')
    // Stored so api/line-auth-callback.js can confirm the browser completing
    // the flow is the same one that started it — otherwise someone could
    // hand another person a link containing their own auth code and get
    // that person silently logged into the attacker's account (login CSRF).
    const state = crypto.randomUUID()
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `line_oauth_state=${state}; path=/; max-age=600; samesite=lax${secure}`

    // Must exactly match the fixed origin api/line-auth-callback.js uses —
    // LINE requires the redirect_uri at token exchange to match the one
    // used here at authorize time, so this can't be window.location.origin.
    const redirectUri = 'https://pourista-ruddy.vercel.app/api/line-auth-callback'
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: import.meta.env.VITE_LINE_CHANNEL_ID,
      redirect_uri: redirectUri,
      state,
      scope: 'openid profile',
    })
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-2 rounded-full border border-line bg-white/70 py-2.5 text-sm font-medium text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
          <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 27 35.6 24 35.6c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 39.5 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.6C41.6 36 44 30.6 44 24c0-1.2-.1-2.4-.4-3.5z"/>
        </svg>
        使用 Google 登入
      </button>

      <button
        type="button"
        onClick={handleLineLogin}
        className="w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-white mt-2.5"
        style={{ backgroundColor: '#06C755' }}
      >
        使用 LINE 登入
      </button>

      {error && <p className="text-xs text-[#d74f3b] mt-3">{error}</p>}
    </>
  )
}
