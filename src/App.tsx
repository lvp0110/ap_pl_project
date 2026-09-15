import { useEffect, useMemo, useState } from 'react'
import { ApiPanel } from './components/ApiPanel'
import { CatalogsPage } from './components/CatalogsPage'
import { Dashboard } from './components/Dashboard'
import { BlankForm } from './components/BlankForm'
import { LocalPanel } from './components/LocalPanel'
import { ProjectsPage } from './components/ProjectsPage'
import { emptyCatalogs, emptyProject } from './data/defaults'
import { catalogsWithPriceUnits, exportPriceWorkbook, importPriceWorkbook } from './lib/excel'
import { loadOperator, saveOperator } from './lib/repo/operator'
import { loadPriceList, loadState, nextId, savePriceList, saveProjects } from './lib/storage'
import { ApiError } from './lib/api/client'
import {
  catalogsFromCrm,
  createReference,
  createSgManager,
  loadCrmCatalogs,
  loadSession,
  login,
  logout,
  userDisplayName,
} from './lib/api/crm'
import { CATALOG_REFERENCE_TYPES, type AuthUser } from './lib/api/types'
import type { AppView, Catalogs, Project, ProjectPreset } from './types'

type Draft = { project: Project; isNew: boolean; key: string }

export default function App() {
  const initial = loadState()
  const [view, setView] = useState<AppView>('dashboard')
  const [projects, setProjects] = useState<Project[]>(initial.projects)
  const [catalogs, setCatalogs] = useState(emptyCatalogs)
  const [price, setPrice] = useState(loadPriceList)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [preset, setPreset] = useState<ProjectPreset>('all')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [operator, setOperator] = useState(loadOperator)
  const [apiUser, setApiUser] = useState<AuthUser | null>(null)
  const viewCatalogs = useMemo(() => catalogsWithPriceUnits(catalogs, price), [catalogs, price])

  useEffect(() => saveProjects(projects), [projects])
  useEffect(() => savePriceList(price), [price])

  async function pullCrm(user: AuthUser) {
    const loaded = await loadCrmCatalogs()
    setCatalogs(catalogsFromCrm(loaded.catalogs))
    if (!loadOperator()) {
      const name = userDisplayName(user)
      if (name) {
        setOperator(name)
        saveOperator(name)
      }
    }
    setNotice(
      `API: справочники загружены. Прайс для таблицы материалов — из Excel. Бланки проектов пока в этом браузере.`,
    )
  }

  useEffect(() => {
    void (async () => {
      const user = await loadSession()
      if (!user) return
      setApiUser(user)
      try {
        await pullCrm(user)
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Сессия есть, но справочники CRM не загрузились')
      }
    })()
  }, [])

  async function handleApiLogin(email: string, password: string) {
    setBusy(true)
    setNotice('')
    try {
      const user = await login(email, password)
      setApiUser(user)
      await pullCrm(user)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  async function handleApiLogout() {
    setBusy(true)
    try {
      await logout()
    } finally {
      setApiUser(null)
      setCatalogs(emptyCatalogs())
      setBusy(false)
      setNotice('API отключён. Справочники CRM сброшены — они доступны только из API.')
    }
  }

  async function handleApiReload() {
    if (!apiUser) return
    setBusy(true)
    setNotice('')
    try {
      await pullCrm(apiUser)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось обновить данные API')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddReference(key: keyof Catalogs, name: string) {
    const type = CATALOG_REFERENCE_TYPES[key as keyof typeof CATALOG_REFERENCE_TYPES]
    if (!apiUser || !type) return
    setBusy(true)
    setNotice('')
    try {
      await createReference(type, name, catalogs[key].length + 1)
      await pullCrm(apiUser)
      setNotice(`Значение «${name}» записано в API.`)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не удалось добавить значение')
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleAddSgManager(name: string, email: string) {
    if (!apiUser) return
    setBusy(true)
    setNotice('')
    try {
      await createSgManager(name, email)
      await pullCrm(apiUser)
      setNotice(`Менеджер СГ «${name}» записан через API.`)
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Не удалось добавить менеджера СГ')
      throw err
    } finally {
      setBusy(false)
    }
  }

  function applyProject(project: Project, key: string, isNew: boolean) {
    setProjects((prev) => {
      if (isNew && !prev.some((p) => p.id === project.id)) return [...prev, project]
      return prev.map((p) => (p.id === key ? project : p))
    })
  }

  function openNew() {
    const id = nextId(projects)
    setDraft({
      isNew: true,
      key: id,
      project: emptyProject(id),
    })
  }

  function openExisting(project: Project) {
    setView('projects')
    setDraft({ isNew: false, key: project.id, project: { ...project } })
  }

  function saveDraft() {
    if (!draft) return
    const prepared: Project = {
      ...draft.project,
      name: draft.project.name.trim(),
      id: draft.project.id.trim() || nextId(projects),
      updatedAt: new Date().toISOString(),
      updatedBy: operator,
    }
    applyProject(prepared, draft.key, draft.isNew)
    setDraft(null)
    setNotice('')
  }

  function deleteDraft() {
    if (!draft || draft.isNew) return
    setProjects((prev) => prev.filter((p) => p.id !== draft.key))
    setDraft(null)
  }

  async function handleExportPrice() {
    setBusy(true)
    setNotice('')
    try {
      if (!price.length) {
        setNotice('Сначала загрузите прайс Excel')
        return
      }
      await exportPriceWorkbook(price)
      setNotice('Прайс Excel сохранён')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось выгрузить прайс')
    } finally {
      setBusy(false)
    }
  }

  async function handleImportPrice(file: File) {
    setBusy(true)
    setNotice('')
    try {
      const imported = await importPriceWorkbook(file)
      if (!imported.length) {
        setNotice('В файле нет строк прайса')
        return
      }
      setPrice(imported)
      setNotice(`Загружен прайс: ${imported.length} позиций. В бланке можно выбирать строки по артикулу.`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось прочитать прайс Excel')
    } finally {
      setBusy(false)
    }
  }

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
          <button
            type="button"
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            Дашборд
          </button>
          <button
            type="button"
            className={view === 'projects' ? 'active' : ''}
            onClick={() => setView('projects')}
          >
            Проекты
            <em>{projects.length}</em>
          </button>
          <button
            type="button"
            className={view === 'catalogs' ? 'active' : ''}
            onClick={() => setView('catalogs')}
          >
            Справочники
          </button>
        </nav>
        <ApiPanel
          user={apiUser}
          busy={busy}
          onLogin={handleApiLogin}
          onLogout={() => handleApiLogout()}
          onReload={() => handleApiReload()}
        />
        <LocalPanel
          operator={operator}
          onOperatorChange={(name) => {
            setOperator(name)
            saveOperator(name)
          }}
        />
      </aside>

      <div className="main">
        <header className="topbar">
          <p>{notice || 'Бланк менеджера = «Бланк информирования Ecophon». Жёлтые поля обязательны.'}</p>
        </header>

        {view === 'dashboard' && (
          <Dashboard
            projects={projects}
            catalogs={viewCatalogs}
            onOpenProject={(id) => {
              const found = projects.find((p) => p.id === id)
              if (found) openExisting(found)
            }}
            onGoProjects={(next) => {
              setPreset(next ?? 'all')
              setView('projects')
            }}
          />
        )}
        {view === 'projects' && (
          <ProjectsPage
            projects={projects}
            catalogs={viewCatalogs}
            preset={preset}
            onPresetChange={setPreset}
            onCreate={openNew}
            onOpen={openExisting}
          />
        )}
        {view === 'catalogs' && (
          <CatalogsPage
            catalogs={viewCatalogs}
            loadedFromApi={Boolean(apiUser)}
            busy={busy}
            onAddReference={handleAddReference}
            onAddSgManager={handleAddSgManager}
          />
        )}
      </div>

      {draft && (
        <BlankForm
          project={draft.project}
          catalogs={viewCatalogs}
          price={price}
          busy={busy}
          onImportPrice={(file) => void handleImportPrice(file)}
          onExportPrice={() => void handleExportPrice()}
          isNew={draft.isNew}
          onChange={(project) => setDraft({ ...draft, project })}
          onSave={saveDraft}
          onClose={() => setDraft(null)}
          onDelete={draft.isNew ? undefined : deleteDraft}
        />
      )}
    </div>
  )
}
