import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router'
import { ApiPanel } from '../components/ApiPanel'
import { BlankForm } from '../components/BlankForm'
import { ProjectEditorLayer } from '../components/ProjectEditorLayer'
import { catalogsWithPriceUnits } from '../lib/excel'
import { useBlanks, useCrm } from './hooks'

export function Layout() {
  const crm = useCrm()

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">AP</span>
          <div>
            <strong>Akufon Project</strong>
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
      </aside>

      <div className="main">
        {crm.notice && <p className="hint api-notice">{crm.notice}</p>}
        <Outlet />
        <OpenBlank />
        <ProjectEditorLayer />
      </div>
    </div>
  )
}

function OpenBlank() {
  const crm = useCrm()
  const blanks = useBlanks()
  const catalogs = useMemo(
    () => catalogsWithPriceUnits(crm.catalogs, blanks.price),
    [crm.catalogs, blanks.price],
  )
  if (!blanks.draft) return null
  return (
    <BlankForm
      project={blanks.draft.project}
      origin={blanks.draft.origin}
      catalogs={catalogs}
      price={blanks.price}
      busy={crm.busy}
      isNew={blanks.draft.isNew}
      onImportPrice={(file) => {
        void blanks.importPrice(file).then(crm.setNotice).catch(() => crm.setNotice('Не удалось прочитать прайс Excel'))
      }}
      onExportPrice={() => {
        void blanks.exportPrice().then(crm.setNotice).catch(() => crm.setNotice('Не удалось выгрузить прайс'))
      }}
      onChange={blanks.changeDraft}
      onSave={blanks.saveDraft}
      onClose={blanks.closeDraft}
      onDelete={blanks.draft.isNew ? undefined : blanks.deleteDraft}
    />
  )
}
