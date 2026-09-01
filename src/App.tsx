import { useEffect, useRef, useState } from 'react'
import { CatalogsPage } from './components/CatalogsPage'
import { Dashboard } from './components/Dashboard'
import { BlankForm } from './components/BlankForm'
import { ProjectsPage } from './components/ProjectsPage'
import { emptyProject } from './data/defaults'
import { exportWorkbook, importWorkbook } from './lib/excel'
import { loadState, nextId, saveCatalogs, saveProjects } from './lib/storage'
import type { AppView, Catalogs, Project, ProjectPreset } from './types'

type Draft = { project: Project; isNew: boolean; key: string }

export default function App() {
  const initial = loadState()
  const [view, setView] = useState<AppView>('dashboard')
  const [projects, setProjects] = useState<Project[]>(initial.projects)
  const [catalogs, setCatalogs] = useState<Catalogs>(initial.catalogs)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [preset, setPreset] = useState<ProjectPreset>('all')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveProjects(projects), [projects])
  useEffect(() => saveCatalogs(catalogs), [catalogs])

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
    const project = {
      ...draft.project,
      name: draft.project.name.trim(),
      id: draft.project.id.trim() || nextId(projects),
    }

    setProjects((prev) => {
      if (draft.isNew) return [...prev, project]
      return prev.map((p) => (p.id === draft.key ? project : p))
    })
    setDraft(null)
  }

  function deleteDraft() {
    if (!draft || draft.isNew) return
    setProjects((prev) => prev.filter((p) => p.id !== draft.key))
    setDraft(null)
  }

  async function handleExport() {
    setBusy(true)
    setNotice('')
    try {
      await exportWorkbook(projects, catalogs)
      setNotice('Файл Excel сохранён')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось выгрузить Excel')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File) {
    setBusy(true)
    setNotice('')
    try {
      const imported = await importWorkbook(file)
      if (!imported.length) {
        setNotice('В файле нет строк проектов')
        return
      }
      setProjects(imported)
      setView('projects')
      setNotice(`Загружено проектов: ${imported.length}`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось прочитать Excel')
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
      </aside>

      <div className="main">
        <header className="topbar">
          <p>{notice || 'Бланк менеджера = «Бланк информирования Ecophon». Жёлтые поля обязательны.'}</p>
          <div className="topbar-actions">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void handleImport(file)
              }}
            />
            <button type="button" className="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
              Загрузить Excel
            </button>
            <button type="button" className="primary" disabled={busy} onClick={() => void handleExport()}>
              Выгрузить всё в Excel
            </button>
          </div>
        </header>

        {view === 'dashboard' && (
          <Dashboard
            projects={projects}
            catalogs={catalogs}
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
            catalogs={catalogs}
            preset={preset}
            onPresetChange={setPreset}
            onCreate={openNew}
            onOpen={openExisting}
          />
        )}
        {view === 'catalogs' && (
          <CatalogsPage catalogs={catalogs} onChange={setCatalogs} />
        )}
      </div>

      {draft && (
        <BlankForm
          project={draft.project}
          catalogs={catalogs}
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
