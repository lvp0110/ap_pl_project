import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CrmContext, type CrmState, type OpenEditor } from './contexts'
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
} from '../lib/api/crm'
import { keepSession } from '../lib/api/client'
import { listProjects } from '../lib/api/projects'
import type { CrmProject } from '../lib/api/projectTypes'
import { CATALOG_REFERENCE_TYPES, type AuthUser, type CrmReferenceTypeInfo, type CrmSgManager } from '../lib/api/types'
import { emptyCatalogs } from '../data/defaults'
import type { ReferenceMap } from '../lib/projects/view'

export function CrmProvider({
  onSignedIn,
  children,
}: {
  onSignedIn: (user: AuthUser) => void
  children: ReactNode
}) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [catalogs, setCatalogs] = useState(emptyCatalogs)
  const [references, setReferences] = useState<ReferenceMap>(emptyReferences)
  const [referenceTypes, setReferenceTypes] = useState<CrmReferenceTypeInfo[]>([])
  const [sgManagers, setSgManagers] = useState<CrmSgManager[]>([])
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)
  const [editor, setEditor] = useState<OpenEditor | null>(null)

  const openProjectEditor = useCallback((id: number | 'new') => {
    setEditor((current) => (current?.id === id ? current : { id }))
  }, [])

  const closeProjectEditor = useCallback(() => {
    setEditor(null)
  }, [])

  const pull = useCallback(async () => {
    const loaded = await loadCrmCatalogs()
    setCatalogs(catalogsFromCrm(loaded.catalogs, loaded.referenceTypes))
    setReferences(loaded.references)
    setReferenceTypes(loaded.referenceTypes)
    setSgManagers(loaded.sgManagers)
    try {
      setProjects(await listProjects())
    } catch {
      setProjects([])
    }
  }, [])

  const onSignedInRef = useRef(onSignedIn)
  onSignedInRef.current = onSignedIn

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const session = await loadSession()
        if (!active || !session) return
        setUser(session)
        onSignedInRef.current(session)
        await pull()
      } catch (err) {
        if (active) setNotice(err instanceof Error ? err.message : 'Сессия есть, но данные CRM не загрузились')
      } finally {
        if (active) setReady(true)
      }
    })()
    return () => {
      active = false
    }
  }, [pull])

  useEffect(() => {
    if (!user) return
    let stopped = false
    const touch = () => {
      if (stopped || document.visibilityState === 'hidden') return
      void keepSession().then((ok) => {
        if (stopped || ok) return
        setNotice('Сессия истекла. Войдите снова: открытый бланк сохранится в этой вкладке.')
      })
    }
    touch()
    const timer = window.setInterval(touch, 60_000)
    document.addEventListener('visibilitychange', touch)
    return () => {
      stopped = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', touch)
    }
  }, [user])

  const value = useMemo<CrmState>(() => {
    async function write(action: () => Promise<void>, success: string, failure: string) {
      if (!user) return
      setBusy(true)
      setNotice('')
      try {
        await action()
        await pull()
        setNotice(success)
      } catch (err) {
        setNotice(err instanceof Error ? err.message : failure)
        throw err
      } finally {
        setBusy(false)
      }
    }

    return {
      user,
      ready,
      catalogs,
      references,
      referenceTypes,
      sgManagers,
      projects,
      busy,
      notice,
      setNotice,

      async signIn(email, password) {
        setBusy(true)
        setNotice('')
        try {
          const signed = await login(email, password)
          setUser(signed)
          onSignedIn(signed)
          await pull()
        } catch (err) {
          setNotice(err instanceof Error ? err.message : 'Не удалось войти')
        } finally {
          setBusy(false)
        }
      },

      async signOut() {
        setBusy(true)
        try {
          await logout()
        } finally {
          setUser(null)
          setEditor(null)
          setCatalogs(emptyCatalogs())
          setReferences(emptyReferences())
          setReferenceTypes([])
          setSgManagers([])
          setProjects([])
          setBusy(false)
          setNotice('API отключён. Данные CRM доступны только из API.')
        }
      },

      async reload() {
        if (!user) return
        setBusy(true)
        setNotice('')
        try {
          await pull()
        } catch (err) {
          setNotice(err instanceof Error ? err.message : 'Не удалось обновить данные API')
        } finally {
          setBusy(false)
        }
      },

      rememberProject(project) {
        setProjects((prev) => [project, ...prev.filter((item) => item.id !== project.id)])
      },

      editor,
      openProjectEditor,
      closeProjectEditor,

      addReference(key, name) {
        const type = CATALOG_REFERENCE_TYPES[key]
        if (!type) return Promise.resolve()
        return write(
          () => createReference(type, name, catalogs[key].length + 1),
          `Значение «${name}» записано в API.`,
          'Не удалось добавить значение',
        )
      },

      addReferenceType(type, name) {
        return write(
          () => createReference(type, name, (references[type]?.length ?? 0) + 1),
          `Значение «${name}» записано в API.`,
          'Не удалось добавить значение',
        )
      },

      renameReference(type, value, name) {
        return write(
          () => updateReference(type, value, name),
          `Значение «${value.name}» переименовано в «${name}».`,
          'Не удалось переименовать значение',
        )
      },

      archiveReferenceValue(type, value) {
        return write(
          () => archiveReference(type, value.id),
          `Значение «${value.name}» убрано из справочника.`,
          'Не удалось убрать значение',
        )
      },

      addSgManager(name, email) {
        return write(
          () => createSgManager(name, email),
          `Менеджер СГ «${name}» записан через API.`,
          'Не удалось добавить менеджера СГ',
        )
      },

      renameSgManager(manager, name, email) {
        return write(
          () => updateSgManager(manager, name, email),
          `Менеджер СГ «${manager.name}» обновлён.`,
          'Не удалось обновить менеджера СГ',
        )
      },

      archiveSgManagerValue(manager) {
        return write(
          () => archiveSgManager(manager.id),
          `Менеджер СГ «${manager.name}» убран из справочника.`,
          'Не удалось убрать менеджера СГ',
        )
      },
    }
  }, [user, ready, catalogs, references, referenceTypes, sgManagers, projects, busy, notice, editor, openProjectEditor, closeProjectEditor, pull, onSignedIn])

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>
}
