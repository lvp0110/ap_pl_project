export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Envelope<T> = {
  code?: number
  data?: T
  error?: string
}

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

function readCookie(name: string): string {
  const prefix = `${name}=`
  for (const part of document.cookie ? document.cookie.split('; ') : []) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length))
  }
  return ''
}

function isCrossOrigin(): boolean {
  if (!BASE || typeof window === 'undefined') return false
  try {
    return new URL(BASE, window.location.origin).origin !== window.location.origin
  } catch {
    return false
  }
}

let refreshInFlight: Promise<boolean> | null = null

async function parseBody(response: Response): Promise<unknown> {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) return null
  try {
    return await response.json()
  } catch {
    return null
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as Envelope<unknown>).error
    if (err) return err
  }
  return fallback
}

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const csrf = readCookie('csrf_token')
    if (!csrf) return false
    try {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'X-CSRF-Token': csrf,
        },
      })
      return response.ok
    } catch {
      return false
    }
  })()
  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('accept')) headers.set('accept', 'application/json')
  const method = (init.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && !headers.has('X-CSRF-Token')) {
    const csrf = readCookie('csrf_token')
    if (csrf) headers.set('X-CSRF-Token', csrf)
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && !retried && !path.startsWith('/login') && !path.startsWith('/auth/login')) {
    if (await refreshSession()) return apiRequest<T>(path, init, true)
  }

  const body = await parseBody(response)
  if (!response.ok) {
    throw new ApiError(errorMessage(body, `Ошибка API ${response.status}`), response.status)
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return (body as Envelope<T>).data as T
  }
  return body as T
}

export const apiBaseIsCrossOrigin = isCrossOrigin
