import { useState } from 'react'
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await onLogin(email, password)
  }

  return (
    <section className="folder-panel">
      <h3>API ConstrTodo</h3>
      {user ? (
        <>
          <p>
            Сессия: {user.email}
            {user.role_type ? ` · ${user.role_type}` : ''}
          </p>
          <p>Этап 1: справочники, материалы Ecophon и менеджеры СГ. Бланки пока в браузере / папке.</p>
          <div className="folder-actions">
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
          <p>Войдите учётной записью ConstrTodo (роль manager или admin), чтобы подтянуть справочники CRM.</p>
          <form className="folder-actions" onSubmit={(e) => void submit(e)}>
            <label className="folder-operator">
              Email
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="folder-operator">
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
