import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// LINE's web login signs ID tokens with HS256 (using the channel secret),
// even though LINE's own OIDC discovery document claims ES256 — a known
// mismatch that breaks strict OIDC clients (including Supabase's built-in
// custom-provider support). So this endpoint does the OAuth exchange and
// token verification itself, then hands the user a Supabase session via
// the admin API instead of going through Supabase's OIDC flow.
export default async function handler(req, res) {
  const origin = `https://${req.headers.host}`
  const redirectUri = `${origin}/api/line-auth-callback`

  const { code, error: lineError } = req.query
  if (lineError || !code) {
    res.redirect(302, `${origin}/?error=line_login_failed`)
    return
  }

  try {
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINE_CHANNEL_ID,
        client_secret: process.env.LINE_CHANNEL_SECRET,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenData.error_description || 'LINE token exchange failed')

    const payload = jwt.verify(tokenData.id_token, process.env.LINE_CHANNEL_SECRET, {
      algorithms: ['HS256'],
      audience: process.env.LINE_CHANNEL_ID,
      issuer: 'https://access.line.me',
    })
    const { sub, name, picture } = payload

    const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const syntheticEmail = `line-${sub}@line.coffeediary.local`

    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('line_identities')
      .select('user_id')
      .eq('line_sub', sub)
      .maybeSingle()
    if (mappingError) throw mappingError

    if (!mapping) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: { full_name: name, avatar_url: picture, line_sub: sub },
      })
      if (createError) throw createError

      const { error: insertError } = await supabaseAdmin
        .from('line_identities')
        .insert({ line_sub: sub, user_id: created.user.id })
      if (insertError) throw insertError
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: syntheticEmail,
      options: { redirectTo: origin },
    })
    if (linkError) throw linkError

    res.redirect(302, linkData.properties.action_link)
  } catch (err) {
    console.error('LINE login failed:', err)
    res.redirect(302, `${origin}/?error=line_login_failed`)
  }
}
