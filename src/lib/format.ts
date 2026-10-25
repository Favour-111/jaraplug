export const naira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(kobo / 100)

export const dateTime = (d: string | Date) =>
  new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(d))
export const dateOnly = (d: string | Date) =>
  new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(d))
export const timeOnly = (d: string | Date) =>
  new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(d))

/** "10:29" today, "Yesterday", weekday this week, else date. */
export function chatTime(d: string | Date) {
  const date = new Date(d)
  const now = new Date()
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86400000)
  if (days <= 0) return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date)
  if (days === 1) return 'Yesterday'
  if (days < 7) return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

export const duration = (s: number | null) => (s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)

export const pct = (bps: number) => `${bps / 100}%`

/** Lagos-local YYYY-MM-DD for a Date. */
export const lagosYmd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(d)

/** Public customer-care address shown in the footer, support form and legal pages. */
export const SUPPORT_EMAIL = 'jaraplugsupport@gmail.com'

/** In-app credits. Prices are stored in kobo; one credit is worth `unitKobo` (₦100 by default). */
export const DEFAULT_CREDIT_KOBO = 10_000
export const koboToCredits = (kobo: number, unitKobo = DEFAULT_CREDIT_KOBO) => Math.round(kobo / unitKobo)
export const creditsLabel = (n: number) => `${n.toLocaleString('en-NG')} credit${n === 1 ? '' : 's'}`
