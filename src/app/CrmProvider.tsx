import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CrmContext, type CrmState } from './contexts'
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
import { listProjects } from '../lib/api/projects'
import type { CrmProject } from '../lib/api/projectTypes'
import { CATALOG_REFERENCE_TYPES, type AuthUser, type CrmSgManager } from '../lib/api/types'
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
  const [sgManagers, setSgManagers] = useState<CrmSgManager[]>([])
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)

  const pull = useCallback(async () => {
    const [loaded, crm] = await Promise.all([loadCrmCatalogs(), listProjects()])
    setCatalogs(catalogsFromCrm(loaded.catalogs))
    setReferences(loaded.references)
    setSgManagers(loaded.sgManagers)
    setProjects(crm)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const session = await loadSession()
        if (!session) return
        setUser(session)
        onSignedIn(session)
        await pull()
      } catch (err) {
        setNotice(err instanceof Error ? err.message : 'Сессия есть, но данные CRM не загрузились')
      } finally {
        setReady(true)
      }
    })()
  }, [pull, onSignedIn])

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
          setCatalogs(emptyCatalogs())
          setReferences(emptyReferences())
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

      addReference(key, name) {
        const type = CATALOG_REFERENCE_TYPES[key as keyof typeof CATALOG_REFERENCE_TYPES]
        if (!type) return Promise.resolve()
        return write(
          () => createReference(type, name, catalogs[key].length + 1),
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
  }, [user, ready, catalogs, references, sgManagers, projects, busy, notice, pull, onSignedIn])

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>
}
