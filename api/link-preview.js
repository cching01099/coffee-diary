import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'

// Fetches a page's Open Graph title and image so community posts can show a
// link card. Browsers can't read other sites' HTML (CORS), so this runs
// server-side — which also makes it a way to reach URLs the caller picks, so
// every hop is checked against private/internal address ranges.
//
// Written against plain Node req/res (no Vercel helpers) so vite.config.js
// can mount the same handler on the dev server.

const MAX_URL_LENGTH = 2048
const MAX_REDIRECTS = 4
const TIMEOUT_MS = 6000
// OG tags live in <head>; stop reading well before a full page arrives
const MAX_BYTES = 512 * 1024
const USER_AGENT = 'Mozilla/5.0 (compatible; PouristaLinkPreview/1.0)'

const blocked = new net.BlockList()
for (const [prefix, bits] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // includes cloud metadata endpoints
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 3], // multicast + reserved
]) {
  blocked.addSubnet(prefix, bits, 'ipv4')
}
for (const [prefix, bits] of [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
]) {
  blocked.addSubnet(prefix, bits, 'ipv6')
}

function isBlockedAddress(address) {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) return blocked.check(mapped[1], 'ipv4')
  return blocked.check(address, net.isIPv6(address) ? 'ipv6' : 'ipv4')
}

// Checked at connect time rather than before the request, so a hostname
// can't resolve to a public address for the check and a private one for
// the actual connection.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err)
    if (addresses.length === 0 || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(new Error('blocked address'))
    }
    if (options.all) callback(null, addresses)
    else callback(null, addresses[0].address, addresses[0].family)
  })
}

function parseTarget(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  if (url.port && url.port !== '80' && url.port !== '443') return null
  // IP literals skip the lookup hook entirely, so check them here
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host) && isBlockedAddress(host)) return null
  return url
}

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const req = client.get(
      url,
      {
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          // no compressed bodies: nothing to decompress, no decoder to exploit
          'Accept-Encoding': 'identity',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          resolve({ redirect: new URL(res.headers.location, url) })
          return
        }
        const type = res.headers['content-type'] || ''
        if (res.statusCode !== 200 || !/html/i.test(type)) {
          res.resume()
          reject(new Error(`unusable response: ${res.statusCode} ${type}`))
          return
        }
        const chunks = []
        let size = 0
        res.on('data', (chunk) => {
          chunks.push(chunk)
          size += chunk.length
          if (size >= MAX_BYTES || chunk.includes('</head>')) res.destroy()
        })
        const finish = () => resolve({ html: Buffer.concat(chunks).toString('utf8'), finalUrl: url })
        res.on('end', finish)
        res.on('close', finish)
      },
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
  })
}

async function fetchHtml(startUrl) {
  let url = startUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const result = await requestOnce(url)
    if (!result.redirect) return result
    url = parseTarget(result.redirect.href)
    if (!url) throw new Error('blocked redirect')
  }
  throw new Error('too many redirects')
}

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function extractPreview(html, pageUrl) {
  const meta = {}
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {}
    for (const [, name, , dq, sq] of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      attrs[name.toLowerCase()] = dq ?? sq
    }
    const key = (attrs.property || attrs.name || '').toLowerCase()
    // first occurrence wins, matching how link unfurlers read duplicates
    if (key && attrs.content != null && !(key in meta)) meta[key] = decodeEntities(attrs.content).trim()
  }

  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
  const title = meta['og:title'] || meta['twitter:title'] || (titleTag && decodeEntities(titleTag).trim()) || null

  let image = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || null
  if (image) {
    try {
      const resolved = new URL(image, pageUrl)
      image = resolved.protocol === 'https:' || resolved.protocol === 'http:' ? resolved.href : null
    } catch {
      image = null
    }
  }

  const siteName = meta['og:site_name'] || pageUrl.hostname.replace(/^www\./, '')
  return { title, image, siteName }
}

function send(res, status, body, cacheControl) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cacheControl)
  res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  const raw = new URL(req.url, 'http://localhost').searchParams.get('url') || ''
  const target = raw.length <= MAX_URL_LENGTH ? parseTarget(raw) : null
  if (!target) {
    send(res, 400, { error: 'invalid url' }, 'public, max-age=86400')
    return
  }

  try {
    const { html, finalUrl } = await fetchHtml(target)
    const preview = extractPreview(html, finalUrl)
    if (!preview.title && !preview.image) {
      send(res, 404, { error: 'no preview' }, 'public, max-age=3600, s-maxage=3600')
      return
    }
    // a day at the CDN keeps signed image URLs (Threads/Instagram expire
    // theirs) reasonably fresh without refetching the page on every view
    send(res, 200, { url: target.href, ...preview }, 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400')
  } catch {
    send(res, 502, { error: 'fetch failed' }, 'public, max-age=600, s-maxage=600')
  }
}
