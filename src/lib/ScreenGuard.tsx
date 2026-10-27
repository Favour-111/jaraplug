import { useEffect } from 'react'

/**
 * Best-effort deterrents against capturing other people's pictures and chats. A web page cannot truly block screenshots
 * or screen recording (the operating system does those), so this only makes casual capture harder:
 *  - pictures, videos and chats are blurred while the window is not in front, and while Cmd/Win+Shift is held
 *    (the start of the usual screenshot shortcuts), and when Print Screen is pressed
 *  - right-click, drag-to-save and long-press-save on pictures and videos are disabled, and printing is blocked
 * The blur itself is the `shielded` class on <html>, styled in index.css.
 */
export function ScreenGuard() {
  useEffect(() => {
    const root = document.documentElement
    let hold: ReturnType<typeof setTimeout> | undefined
    const settle = () => root.classList.toggle('shielded', document.hidden || !document.hasFocus())
    const flash = (ms: number) => { root.classList.add('shielded'); clearTimeout(hold); hold = setTimeout(settle, ms) }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') { flash(2500); void navigator.clipboard?.writeText(' ').catch(() => {}); return }
      if (e.metaKey && e.shiftKey) flash(2500)
    }
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'PrintScreen') void navigator.clipboard?.writeText(' ').catch(() => {}) }
    const media = (t: EventTarget | null) => t instanceof HTMLElement && /^(IMG|VIDEO|CANVAS)$/.test(t.tagName)
    const onContext = (e: Event) => { if (media(e.target)) e.preventDefault() }
    const onDrag = (e: Event) => { if (media(e.target)) e.preventDefault() }
    const beforePrint = () => root.classList.add('shielded')

    settle()
    window.addEventListener('blur', settle); window.addEventListener('focus', settle)
    document.addEventListener('visibilitychange', settle)
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp)
    document.addEventListener('contextmenu', onContext); document.addEventListener('dragstart', onDrag)
    window.addEventListener('beforeprint', beforePrint); window.addEventListener('afterprint', settle)
    return () => {
      clearTimeout(hold)
      window.removeEventListener('blur', settle); window.removeEventListener('focus', settle)
      document.removeEventListener('visibilitychange', settle)
      document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('contextmenu', onContext); document.removeEventListener('dragstart', onDrag)
      window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', settle)
      root.classList.remove('shielded')
    }
  }, [])
  return null
}
