import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { BlankForm } from '../components/BlankForm'
import { ProjectsPage } from '../components/ProjectsPage'
import { useBlanks, useCrm } from '../app/hooks'
import { catalogsWithPriceUnits } from '../lib/excel'
import { listProjects, loadProjectFilters } from '../lib/api/projects'
import type { CrmFilter, CrmProject } from '../lib/api/projectTypes'

const SERVER_FILTERS = new Set([
  'region_id',
  'stage_id',
  'segment_id',
  'sg_manager_id',
  'ag_manager_id',
  'information_source_id',
  'status',
  'priority_id',
  'support_status_id',
])

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
  const [loaded, setLoaded] = useState<Loaded>({ key: '', rows: [], failure: '' })
  const [reloadAt, setReloadAt] = useState(0)

  const selectedKey = useMemo(() => {
    const picked: Record<string, string> = {}
    params.forEach((value, key) => {
      if (SERVER_FILTERS.has(key) && value) picked[key] = value
    })
    return JSON.stringify(picked)
  }, [params])

  const selected = useMemo(() => JSON.parse(selectedKey) as Record<string, string>, [selectedKey])
  const signed = Boolean(crm.user)
  const requestKey = signed ? `${selectedKey}|${reloadAt}` : ''
  const ready = Boolean(requestKey) && loaded.key === requestKey
  const catalogs = useMemo(
    () => catalogsWithPriceUnits(crm.catalogs, blanks.price),
    [crm.catalogs, blanks.price],
  )

  useEffect(() => {
    if (!requestKey) return
    let active = true
    listProjects(JSON.parse(selectedKey) as Record<string, string>)
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
  }, [requestKey, selectedKey])

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
        references={crm.references}
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

      {blanks.draft && (
        <BlankForm
          project={blanks.draft.project}
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
      )}
    </>
  )
}
