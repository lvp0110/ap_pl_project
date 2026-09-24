import { useState } from 'react'
import { userDisplayName } from '../lib/api/crm'
import type { AuthUser } from '../lib/api/types'

type Props = {
  user: AuthUser | null
  busy: boolean
  onLogin: (email: string, password: string) => Promise<void>
  onLogout: () => Promise<void>
  onReload: () => Promise<void>
}

export function ApiPanel({ user, busy, onLogin, onLogout, onReload }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const name = user ? userDisplayName(user) : ''

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await onLogin(email, password)
  }

  return (
    <section className="sidebar-panel">
      <h3>API ConstrTodo</h3>
      {user ? (
        <>
          {name ? <p>{name}</p> : null}
          <p>{user.email}</p>
          <div className="sidebar-actions">
            <button type="button" className="ghost" disabled={busy} onClick={() => void onReload()}>
              Обновить из API
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={() => void onLogout()}>
              Выйти
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Войдите учётной записью ConstrTodo (роль manager или admin). Без сессии справочники CRM пустые.</p>
          <form className="sidebar-actions" onSubmit={(e) => void submit(e)}>
            <label className="sidebar-field">
              Email
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="sidebar-field">
              Пароль
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="primary" disabled={busy}>
              Войти и загрузить
            </button>
          </form>
        </>
      )}
    </section>
  )
}
