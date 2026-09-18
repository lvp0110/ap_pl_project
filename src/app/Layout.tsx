import { NavLink, Outlet } from 'react-router'
import { ApiPanel } from '../components/ApiPanel'
import { LocalPanel } from '../components/LocalPanel'
import { useBlanks, useCrm } from './hooks'

export function Layout() {
  const crm = useCrm()
  const blanks = useBlanks()

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">AP</span>
          <div>
            <strong>Akufon Proline</strong>
            <span>Проекты</span>
          </div>
        </div>
        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
            Дашборд
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => (isActive ? 'active' : '')}>
            Проекты
            <em>{crm.projects.length}</em>
          </NavLink>
          <NavLink to="/catalogs" className={({ isActive }) => (isActive ? 'active' : '')}>
            Справочники
          </NavLink>
        </nav>
        <ApiPanel
          user={crm.user}
          busy={crm.busy}
          onLogin={crm.signIn}
          onLogout={() => crm.signOut()}
          onReload={() => crm.reload()}
        />
        <LocalPanel operator={blanks.operator} onOperatorChange={blanks.setOperator} />
      </aside>

      <div className="main">
        {crm.notice && <p className="hint api-notice">{crm.notice}</p>}
        <Outlet />
      </div>
    </div>
  )
}
