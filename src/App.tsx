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
import {
  archiveReference,
  archiveSgManager,
  catalogsFromCrm,
  createReference,
  createSgManager,
  emptyReferences,
  loadCrmCatalogs,
  loadSession,
  login,
  logout,
  updateReference,
  updateSgManager,
  userDisplayName,
} from './lib/api/crm'
import {
  CATALOG_REFERENCE_TYPES,
  type AuthUser,
  type CrmReferenceType,
  type CrmReferenceValue,
  type CrmSgManager,
} from './lib/api/types'
import type { AppView, Catalogs, Project, ProjectPreset } from './types'

type Draft = { project: Project; isNew: boolean; key: string }

export default function App() {
  const initial = loadState()
  const [view, setView] = useState<AppView>('dashboard')
  const [projects, setProjects] = useState<Project[]>(initial.projects)
  const [catalogs, setCatalogs] = useState(emptyCatalogs)
  const [references, setReferences] = useState(emptyReferences)
  const [sgManagers, setSgManagers] = useState<CrmSgManager[]>([])
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
    setReferences(loaded.references)
    setSgManagers(loaded.sgManagers)
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
      setNotice(err instanceof Error ? err.message : 'Не удалось войти')
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
      setReferences(emptyReferences())
      setSgManagers([])
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

  async function writeToCrm(action: () => Promise<void>, success: string, failure: string) {
    if (!apiUser) return
    setBusy(true)
    setNotice('')
    try {
      await action()
      await pullCrm(apiUser)
      setNotice(success)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : failure)
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleAddReference(key: keyof Catalogs, name: string) {
    const type = CATALOG_REFERENCE_TYPES[key as keyof typeof CATALOG_REFERENCE_TYPES]
    if (!type) return
    await writeToCrm(
      () => createReference(type, name, catalogs[key].length + 1),
      `Значение «${name}» записано в API.`,
      'Не удалось добавить значение',
    )
  }

  async function handleUpdateReference(type: CrmReferenceType, value: CrmReferenceValue, name: string) {
    await writeToCrm(
      () => updateReference(type, value, name),
      `Значение «${value.name}» переименовано в «${name}».`,
      'Не удалось переименовать значение',
    )
  }

  async function handleArchiveReference(type: CrmReferenceType, value: CrmReferenceValue) {
    await writeToCrm(
      () => archiveReference(type, value.id),
      `Значение «${value.name}» убрано из справочника.`,
      'Не удалось убрать значение',
    )
  }

  async function handleAddSgManager(name: string, email: string) {
    await writeToCrm(
      () => createSgManager(name, email),
      `Менеджер СГ «${name}» записан через API.`,
      'Не удалось добавить менеджера СГ',
    )
  }

  async function handleUpdateSgManager(manager: CrmSgManager, name: string, email: string) {
    await writeToCrm(
      () => updateSgManager(manager, name, email),
      `Менеджер СГ «${manager.name}» обновлён.`,
      'Не удалось обновить менеджера СГ',
    )
  }

  async function handleArchiveSgManager(manager: CrmSgManager) {
    await writeToCrm(
      () => archiveSgManager(manager.id),
      `Менеджер СГ «${manager.name}» убран из справочника.`,
      'Не удалось убрать менеджера СГ',
    )
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
            references={references}
            sgManagers={sgManagers}
            loadedFromApi={Boolean(apiUser)}
            busy={busy}
            onAddReference={handleAddReference}
            onUpdateReference={handleUpdateReference}
            onArchiveReference={handleArchiveReference}
            onAddSgManager={handleAddSgManager}
            onUpdateSgManager={handleUpdateSgManager}
            onArchiveSgManager={handleArchiveSgManager}
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
