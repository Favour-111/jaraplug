import { useEffect } from 'react'
import { SITE_URL } from './seoText'

export { SITE_NAME, SITE_URL, snippet } from './seoText'
const DEFAULT_TITLE = 'JaraPlug | Discover Verified Profiles & Exclusive Content Near You'
const DEFAULT_DESCRIPTION = 'JaraPlug: discover verified profiles near you, connect privately and unlock exclusive content — wherever you are. Adults only (18+).'

export interface Seo {
  /** Full document title. */
  title?: string
  description?: string
  /** Path of this page (e.g. "/discover"). Indexable pages get a self-referencing canonical on SITE_URL. */
  path?: string
  noindex?: boolean
  /** Page-specific JSON-LD (the site-wide Organization/WebSite graph lives in index.html). */
  jsonLd?: object
}

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content === null) return el?.remove()
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.content = content
}

function setLink(rel: string, href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (href === null) return el?.remove()
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
  el.href = href
}

function setJsonLd(data: object | undefined) {
  let el = document.getElementById('page-jsonld')
  if (!data) return el?.remove()
  if (!el) { el = document.createElement('script'); el.id = 'page-jsonld'; el.setAttribute('type', 'application/ld+json'); document.head.appendChild(el) }
  el.textContent = JSON.stringify(data)
}

function apply({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, path, noindex, jsonLd }: Seo) {
  const url = !noindex && path !== undefined ? SITE_URL + path : null
  document.title = title
  setMeta('name', 'description', description)
  setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
  setLink('canonical', url)
  setMeta('property', 'og:title', title)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('name', 'twitter:title', title)
  setMeta('name', 'twitter:description', description)
  setJsonLd(noindex ? undefined : jsonLd)
}

/** Sets title, description, robots, canonical, Open Graph/Twitter tags and JSON-LD for the current page; restores site defaults on unmount. */
export function useSeo(seo: Seo) {
  const key = JSON.stringify(seo)
  useEffect(() => {
    apply(JSON.parse(key) as Seo)
    return () => apply({})
  }, [key])
}
