export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000'

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public details?: { path: string; message: string }[]) {
    super(message)
  }
}

type TokenGetter = () => Promise<string | null>
let getToken: TokenGetter = async () => null
export const setTokenGetter = (fn: TokenGetter) => { getToken = fn }
export const currentToken = () => getToken()

async function request<T>(method: string, path: string, body?: unknown, query?: Record<string, unknown>): Promise<T> {
  const url = new URL(API_BASE + '/api' + path)
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '' && v !== null) url.searchParams.set(k, String(v))
  const headers: Record<string, string> = {}
  const token = await getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong', data.code, data.details)
  return data as T
}

export const api = {
  get: <T>(path: string, query?: Record<string, unknown>) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
}

/** multipart upload with progress (fetch can't report upload progress). */
export async function upload<T>(path: string, form: FormData, onProgress?: (pct: number) => void): Promise<T> {
  const token = await getToken()
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api${path}`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let data: any = {}
      try { data = JSON.parse(xhr.responseText) } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new ApiError(xhr.status, data.error ?? 'Upload failed', data.code, data.details))
    }
    xhr.onerror = () => reject(new ApiError(0, 'Network error — check your connection'))
    xhr.send(form)
  })
}

export const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong')
