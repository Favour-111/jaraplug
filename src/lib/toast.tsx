import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string }
const Ctx = createContext<{ toast: (text: string, kind?: Toast['kind']) => void }>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x.slice(-3), { id, kind, text }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200)
  }, [])
  const Icon = { success: CheckCircle2, error: XCircle, info: Info }
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.kind]
          return (
            <div key={t.id} className="pointer-events-auto flex max-w-md animate-slideUp items-center gap-3 rounded-xl border border-line bg-[#1a1a1a] px-4 py-3 text-sm shadow-card">
              <I size={18} className={t.kind === 'success' ? 'text-ok' : t.kind === 'error' ? 'text-red' : 'text-muted'} />
              <span>{t.text}</span>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
