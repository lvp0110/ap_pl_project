import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ProjectsPage } from '../components/ProjectsPage'
import { useBlanks, useCrm } from '../app/hooks'
import { listProjects, loadFieldOptions, loadProjectFilters, loadProjectForm } from '../lib/api/projects'
import type { CrmFilter, CrmFormField, CrmOption, CrmProject } from '../lib/api/projectTypes'
import { isServerFilter } from '../lib/projects/listCells'

type Loaded = {
  key: string
  rows: CrmProject[]
  failure: string
}

export function ProjectsListPage() {
  const crm = useCrm()
  const blanks = useBlanks()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState<CrmFilter[]>([])
  const [formFields, setFormFields] = useState<CrmFormField[]>([])
  const [employees, setEmployees] = useState<CrmOption[]>([])
  const [loaded, setLoaded] = useState<Loaded>({ key: '', rows: [], failure: '' })
  const [reloadAt, setReloadAt] = useState(0)

  const selectedKey = useMemo(() => {
    const picked: Record<string, string> = {}
    params.forEach((value, key) => {
      if (value) picked[key] = value
    })
    return JSON.stringify(picked)
  }, [params])

  const selected = useMemo(() => JSON.parse(selectedKey) as Record<string, string>, [selectedKey])
  const serverKey = useMemo(
    () =>
      JSON.stringify(
        Object.fromEntries(Object.entries(selected).filter(([code]) => isServerFilter(code))),
      ),
    [selected],
  )
  const signed = Boolean(crm.user)
  const requestKey = signed ? `${serverKey}|${reloadAt}` : ''
  const ready = Boolean(requestKey) && loaded.key === requestKey

  useEffect(() => {
    if (!requestKey) return
    let active = true
    listProjects(JSON.parse(serverKey) as Record<string, string>)
      .then((rows) => {
        if (active) setLoaded({ key: requestKey, rows, failure: '' })
      })
      .catch((err: unknown) => {
        if (!active) return
        const failure = err instanceof Error ? err.message : 'Не удалось загрузить проекты'
        setLoaded({ key: requestKey, rows: [], failure })
      })
    return () => {
      active = false
    }
  }, [requestKey, serverKey])

  useEffect(() => {
    if (!signed) return
    let active = true
    loadProjectFilters()
      .then((rows) => {
        if (active) setFilters(rows)
      })
      .catch(() => {
        if (active) setFilters([])
      })
    loadProjectForm()
      .then((form) => {
        if (active) setFormFields(form.fields)
      })
      .catch(() => {
        if (active) setFormFields([])
      })
    loadFieldOptions('/crm/project-options/employees')
      .then((rows) => {
        if (active) setEmployees(rows)
      })
      .catch(() => {
        if (active) setEmployees([])
      })
    return () => {
      active = false
    }
  }, [signed, reloadAt])

  const update = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      setParams(next)
    },
    [params, setParams],
  )

  return (
    <>
      <ProjectsPage
        projects={ready ? loaded.rows : []}
        fields={formFields}
        lookups={{
          references: crm.references,
          sgManagers: crm.sgManagers,
          employees,
        }}
        filters={signed ? filters : []}
        selected={selected}
        loadedFromApi={signed}
        busy={crm.busy || (signed && !ready)}
        failure={loaded.failure}
        onFilterChange={(code, value) => update({ [code]: value })}
        onReset={() => setParams({})}
        onCreate={() => {
          if (!signed) {
            blanks.openNewBlank()
            return
          }
          navigate('/projects/new')
        }}
        onOpen={(project) => navigate(`/projects/${project.id}`)}
        onRefresh={() => {
          setReloadAt(Date.now())
          void crm.reload()
        }}
      />
    </>
  )
}
