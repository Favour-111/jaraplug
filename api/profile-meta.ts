/**
 * Link-preview HTML for /profile/:username.
 *
 * WhatsApp, Facebook, X, Telegram, etc. don't run JavaScript, so the SPA shell only shows them the site-wide tags.
 * vercel.json routes those crawlers (matched by User-Agent) here instead; everyone else, including Googlebot (which
 * renders JS), gets the normal SPA. We take the built index.html and swap in the profile's title/description/robots.
 *
 * Only the anonymous public API is used, so a crawler sees exactly what a signed-out visitor can see; non-public
 * profiles get a 404. The profile photo and canonical/indexable tags are only added when the owner opted in to search.
 */
import { profileSeo, SITE_NAME, SITE_URL, type ProfileSeoInput } from '../src/lib/seoText'

export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

const API_BASE = (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'https://jaraplugserver.onrender.com').replace(/\/$/, '')
const API_TIMEOUT_MS = 4000

type Profile = ProfileSeoInput & { avatarUrl: string | null }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inject(shell: string, tags: { title: string; description: string; robots: string; url?: string; image?: string; imageAlt?: string; largeImage?: boolean; type: string; jsonLd?: object }) {
  const head = [
    `<title>${esc(tags.title)}</title>`,
    `<meta name="description" content="${esc(tags.description)}" />`,
    `<meta name="robots" content="${tags.robots}" />`,
    `<meta name="rating" content="adult" />`,
    tags.url && tags.robots.startsWith('index') ? `<link rel="canonical" href="${esc(tags.url)}" />` : '',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${tags.type}" />`,
    `<meta property="og:title" content="${esc(tags.title)}" />`,
    `<meta property="og:description" content="${esc(tags.description)}" />`,
    tags.url ? `<meta property="og:url" content="${esc(tags.url)}" />` : '',
    tags.image ? `<meta property="og:image" content="${esc(tags.image)}" />` : '',
    tags.image && tags.imageAlt ? `<meta property="og:image:alt" content="${esc(tags.imageAlt)}" />` : '',
    `<meta name="twitter:card" content="${tags.largeImage ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(tags.title)}" />`,
    `<meta name="twitter:description" content="${esc(tags.description)}" />`,
    tags.image ? `<meta name="twitter:image" content="${esc(tags.image)}" />` : '',
    // JSON.stringify can't close the script tag once "<" is escaped
    tags.jsonLd ? `<script type="application/ld+json">${JSON.stringify(tags.jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).join('\n    ')

  return shell
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    // drop the shell's site-wide defaults that we're replacing (keeps charset, viewport, icons, verification, site JSON-LD)
    .replace(/<meta\s+(?:name|property)="(?:description|robots|rating|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/g, '')
    .replace('</head>', `    ${head}\n  </head>`)
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const username = url.searchParams.get('username') ?? decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '')
  const shellRes = await fetch(new URL('/index.html', url.origin))
  const shell = await shellRes.text()
  const html = (body: string, status: number, extra: Record<string, string> = {}) =>
    new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...extra } })

  if (!/^[A-Za-z0-9_.-]{1,40}$/.test(username)) {
    return html(inject(shell, { title: `Profile not found | ${SITE_NAME}`, description: 'This profile does not exist.', robots: 'noindex, nofollow', type: 'website' }), 404, { 'X-Robots-Tag': 'noindex' })
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/providers/${encodeURIComponent(username)}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(API_TIMEOUT_MS) })
  } catch {
    // API asleep or unreachable: fall back to the plain shell (generic preview) and don't let the CDN keep it.
    return html(shell, 200, { 'Cache-Control': 'no-store' })
  }

  if (res.status === 404) {
    return html(
      inject(shell, { title: `Profile not found | ${SITE_NAME}`, description: 'This profile may have been removed, hidden or made private.', robots: 'noindex, nofollow', type: 'website' }),
      404,
      { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, s-maxage=300' },
    )
  }
  if (!res.ok) return html(shell, 200, { 'Cache-Control': 'no-store' })

  const p = (await res.json()) as Profile
  const m = profileSeo(p)
  // The photo is only used in previews when the owner opted in to discovery; otherwise the site logo stays.
  const photo = m.indexable && p.avatarUrl ? p.avatarUrl : null
  const body = inject(shell, {
    title: m.title,
    description: m.description,
    robots: m.indexable ? 'index, follow' : 'noindex, nofollow',
    url: m.url,
    type: 'profile',
    image: photo ?? `${SITE_URL}/logo-mark.png`,
    imageAlt: photo ? `Profile photo of ${p.displayName}` : `${SITE_NAME} logo`,
    largeImage: !!photo,
    jsonLd: m.indexable ? m.jsonLd : undefined,
  })
  // Short CDN cache: profile photo links are signed and expire after an hour.
  return html(body, 200, { 'Cache-Control': 'public, s-maxage=600', ...(m.indexable ? {} : { 'X-Robots-Tag': 'noindex' }) })
}
