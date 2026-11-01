// Framework-free SEO helpers shared by the React app (lib/seo.ts) and the Vercel link-preview function (api/profile-meta.ts).

export const SITE_URL = 'https://www.jara-plug.com'
export const SITE_NAME = 'JaraPlug'

/** Trims text to a meta-description-sized snippet on a word boundary. */
export function snippet(text: string, max = 155) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.lastIndexOf(' ', max - 1)
  return t.slice(0, cut > 0 ? cut : max - 1).replace(/[,.;:\s]+$/, '') + '…'
}

/** The subset of the public `GET /api/providers/:username` response used for metadata. */
export interface ProfileSeoInput {
  username: string | null
  displayName: string
  city: string
  area: string | null
  biography: string
  verified: boolean
  memberSince?: string
  /** Owner opted in to search engines and the profile is public/verified/active (decided by the API). */
  indexable?: boolean
}

export function profileSeo(p: ProfileSeoInput) {
  const where = [p.area, p.city].filter(Boolean).join(', ')
  const path = `/profile/${encodeURIComponent(p.username ?? '')}`
  const title = p.username ? `${p.displayName} (@${p.username}) · ${p.city} | ${SITE_NAME}` : `${p.displayName} | ${SITE_NAME}`
  const description = snippet(
    p.biography ||
      `${p.displayName} is a ${p.verified ? 'verified ' : ''}profile in ${where} on JaraPlug. View photos and availability, message privately or request a booking. Adults only (18+).`,
  )
  const indexable = !!p.indexable && !!p.username
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: SITE_URL + path,
    ...(p.memberSince ? { dateCreated: p.memberSince } : {}),
    mainEntity: { '@type': 'Person', name: p.displayName, ...(p.username ? { alternateName: `@${p.username}` } : {}), ...(p.biography ? { description: snippet(p.biography, 300) } : {}) },
  }
  return { title, description, path, url: SITE_URL + path, indexable, jsonLd }
}
