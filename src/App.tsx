import { useEffect, useRef, useState } from 'react'
import { CatalogsPage } from './components/CatalogsPage'
import { ConflictDialog } from './components/ConflictDialog'
import { Dashboard } from './components/Dashboard'
import { BlankForm } from './components/BlankForm'
import { FolderPanel } from './components/FolderPanel'
import { ProjectsPage } from './components/ProjectsPage'
import { emptyProject } from './data/defaults'
import { exportWorkbook, importWorkbook } from './lib/excel'
import { downloadJsonBundle, importJsonFiles } from './lib/repo/download'
import { loadOperator, saveOperator } from './lib/repo/operator'
import {
  canUseFolderPicker,
  connectSharedFolder,
  deleteProjectFromFolder,
  disconnectSharedFolder,
  getFolderSession,
  isFolderConnected,
  loadSharedFolder,
  restoreFolderSession,
  resumeSharedFolder,
  saveCatalogsToFolder,
  saveProjectToFolder,
  StoreConflictError,
  writeAllToFolder,
  writeExcelSnapshot,
} from './lib/repo/session'
import { loadState, nextId, saveCatalogs, saveProjects } from './lib/storage'
import type { BlankEnvelope } from './lib/repo/types'
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
  const [operator, setOperator] = useState(loadOperator)
  const [folder, setFolder] = useState(getFolderSession)
  const [folderReady, setFolderReady] = useState(false)
  const [conflict, setConflict] = useState<{ pending: Project; remote: BlankEnvelope } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveProjects(projects), [projects])
  useEffect(() => saveCatalogs(catalogs), [catalogs])

  useEffect(() => {
    void (async () => {
      try {
        const session = await restoreFolderSession()
        setFolder(session)
        if (session.connected) {
          const loaded = await loadSharedFolder()
          setProjects(loaded.projects)
          if (loaded.catalogs) setCatalogs(loaded.catalogs)
          setNotice(
            loaded.projects.length
              ? `Загружено из папки «${session.name}»: ${loaded.projects.length}`
              : `Папка «${session.name}» подключена`,
          )
        }
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Не удалось открыть папку')
      } finally {
        setFolderReady(true)
        setFolder(getFolderSession())
      }
    })()
  }, [])

  useEffect(() => {
    if (!folderReady || !folder.connected) return
    const timer = window.setTimeout(() => {
      void saveCatalogsToFolder(catalogs).catch((err) => {
        setNotice(err instanceof Error ? err.message : 'Не удалось записать справочники в папку')
      })
    }, 900)
    return () => window.clearTimeout(timer)
  }, [catalogs, folder.connected, folderReady])

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

  async function commitProject(project: Project, key: string, isNew: boolean, overwrite = false) {
    const prepared: Project = {
      ...project,
      name: project.name.trim(),
      id: project.id.trim() || nextId(projects),
    }

    if (isFolderConnected()) {
      const saved = await saveProjectToFolder(prepared, {
        overwrite,
        expectedUpdatedAt: project.updatedAt,
      })
      applyProject(saved, key, isNew)
      return saved
    }

    const local: Project = {
      ...prepared,
      updatedAt: new Date().toISOString(),
      updatedBy: operator,
    }
    applyProject(local, key, isNew)
    return local
  }

  async function saveDraft(overwrite = false) {
    if (!draft) return
    setNotice('')
    try {
      await commitProject(draft.project, draft.key, draft.isNew, overwrite)
      setConflict(null)
      setDraft(null)
      if (isFolderConnected()) setNotice('Бланк записан в общую папку')
    } catch (err) {
      if (err instanceof StoreConflictError) {
        setConflict({ pending: draft.project, remote: err.existing })
        return
      }
      applyProject(
        {
          ...draft.project,
          name: draft.project.name.trim(),
          updatedAt: new Date().toISOString(),
          updatedBy: operator,
        },
        draft.key,
        draft.isNew,
      )
      setDraft(null)
      setNotice(err instanceof Error ? `${err.message}. Сохранено в браузере.` : 'Сохранено только в браузере')
    }
  }

  async function deleteDraft() {
    if (!draft || draft.isNew) return
    setProjects((prev) => prev.filter((p) => p.id !== draft.key))
    setDraft(null)
    if (isFolderConnected()) {
      try {
        await deleteProjectFromFolder(draft.key)
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Не удалось удалить файл в папке')
      }
    }
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

  async function handlePickFolder() {
    setBusy(true)
    setNotice('')
    try {
      const result = await connectSharedFolder({ projects, catalogs })
      setFolder(getFolderSession())
      setProjects(result.projects)
      if (result.catalogs) setCatalogs(result.catalogs)
      setNotice(
        result.seeded
          ? `Папка «${result.name}» была пустой — записали текущие бланки`
          : `Загружено из папки «${result.name}»: ${result.projects.length}`,
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setNotice(err instanceof Error ? err.message : 'Не удалось подключить папку')
    } finally {
      setBusy(false)
      setFolder(getFolderSession())
    }
  }

  async function handleResumeFolder() {
    setBusy(true)
    setNotice('')
    try {
      const loaded = await resumeSharedFolder()
      setFolder(getFolderSession())
      setProjects(loaded.projects)
      if (loaded.catalogs) setCatalogs(loaded.catalogs)
      setNotice(`Папка «${getFolderSession().name}» открыта, бланков: ${loaded.projects.length}`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось открыть папку')
    } finally {
      setBusy(false)
      setFolder(getFolderSession())
    }
  }

  async function handleReloadFolder() {
    setBusy(true)
    setNotice('')
    try {
      const loaded = await loadSharedFolder()
      setProjects(loaded.projects)
      if (loaded.catalogs) setCatalogs(loaded.catalogs)
      setNotice(`Прочитано из папки: ${loaded.projects.length}`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось прочитать папку')
    } finally {
      setBusy(false)
    }
  }

  async function handleWriteAll() {
    setBusy(true)
    setNotice('')
    try {
      await writeAllToFolder(projects, catalogs)
      setNotice('Все бланки, справочники и registry.xlsx записаны в папку')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось записать папку')
    } finally {
      setBusy(false)
    }
  }

  async function handleWriteExcel() {
    setBusy(true)
    setNotice('')
    try {
      await writeExcelSnapshot(projects, catalogs)
      setNotice('registry.xlsx обновлён в папке')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось записать Excel')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    await disconnectSharedFolder()
    setFolder(getFolderSession())
    setNotice('Папка отключена. Копия остаётся в этом браузере.')
  }

  async function handleImportJson(files: FileList) {
    setBusy(true)
    setNotice('')
    try {
      const imported = await importJsonFiles(files)
      if (!imported.projects.length && !imported.catalogs) {
        setNotice('В JSON нет бланков')
        return
      }
      if (imported.projects.length) {
        setProjects((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]))
          for (const project of imported.projects) map.set(project.id, project)
          return [...map.values()]
        })
      }
      if (imported.catalogs) setCatalogs(imported.catalogs)
      setView('projects')
      setNotice(`Загружено из JSON: ${imported.projects.length}`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Не удалось прочитать JSON')
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
        <FolderPanel
          supported={canUseFolderPicker()}
          connected={folder.connected}
          needsGesture={folder.needsGesture}
          folderName={folder.name}
          operator={operator}
          busy={busy}
          onOperatorChange={(name) => {
            setOperator(name)
            saveOperator(name)
          }}
          onPickFolder={() => void handlePickFolder()}
          onResume={() => void handleResumeFolder()}
          onReload={() => void handleReloadFolder()}
          onWriteAll={() => void handleWriteAll()}
          onWriteExcel={() => void handleWriteExcel()}
          onDisconnect={() => void handleDisconnect()}
          onDownloadJson={() => downloadJsonBundle(projects, catalogs)}
          onImportJson={(files) => void handleImportJson(files)}
        />
      </aside>

      <div className="main">
        <header className="topbar">
          <p>
            {notice ||
              (folder.connected
                ? `Общая папка: ${folder.name}. Жёлтые поля обязательны.`
                : 'Бланк менеджера = «Бланк информирования Ecophon». Жёлтые поля обязательны.')}
          </p>
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
          onSave={() => void saveDraft(false)}
          onClose={() => setDraft(null)}
          onDelete={draft.isNew ? undefined : () => void deleteDraft()}
        />
      )}

      {conflict && (
        <ConflictDialog
          remote={conflict.remote}
          localName={conflict.pending.name}
          onUseRemote={(project) => {
            setProjects((prev) => {
              if (prev.some((p) => p.id === project.id)) {
                return prev.map((p) => (p.id === project.id ? project : p))
              }
              return [...prev, project]
            })
            setDraft((current) =>
              current && (current.key === project.id || current.project.id === project.id)
                ? { ...current, isNew: false, key: project.id, project }
                : current,
            )
            setConflict(null)
            setNotice('Открыта версия из папки')
          }}
          onOverwrite={() => void saveDraft(true)}
          onCancel={() => setConflict(null)}
        />
      )}
    </div>
  )
}
