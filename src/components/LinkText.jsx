// stops at whitespace and full-width CJK punctuation, so a link typed right
// before "，" or "。" doesn't swallow the sentence after it
const URL_PATTERN = /https?:\/\/[^\s<>"'，。！？、；：（）「」『』【】]+/gi
// ASCII punctuation that usually ends the sentence rather than the URL
const TRAILING_PUNCTUATION = /[.,!?;:'")\]}]+$/

function matchUrls(text) {
  const matches = []
  for (const m of text.matchAll(URL_PATTERN)) {
    const url = m[0].replace(TRAILING_PUNCTUATION, '')
    if (url.length > 'https://'.length) matches.push({ url, index: m.index })
  }
  return matches
}

export function firstUrl(text) {
  if (!text) return null
  return matchUrls(text)[0]?.url ?? null
}

// share links carry long tracking query strings; show host + path instead
function displayUrl(url) {
  const short = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/[?#].*$/, '')
  return short.length > 40 ? `${short.slice(0, 40)}…` : short
}

// Splits plain text into strings and <a> elements; returns the input
// unchanged when it has no links, so it's safe to run over every text part.
export function linkify(text, keyPrefix = 'l') {
  if (!text) return text
  const matches = matchUrls(text)
  if (matches.length === 0) return text
  const parts = []
  let lastIndex = 0
  for (const { url, index } of matches) {
    if (index > lastIndex) parts.push(text.slice(lastIndex, index))
    parts.push(
      <a
        key={`${keyPrefix}-${index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        title={url}
        // posts open their detail page on click; a link should only open the link
        onClick={(e) => e.stopPropagation()}
        className="text-accent underline underline-offset-2 break-all"
      >
        {displayUrl(url)}
      </a>,
    )
    lastIndex = index + url.length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}
