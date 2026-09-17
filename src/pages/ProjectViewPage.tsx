import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ProjectView } from '../components/ProjectView'
import { useCrm } from '../app/hooks'
import { ApiError } from '../lib/api/client'
import { getProject, loadProjectForm } from '../lib/api/projects'
import type { CrmFormField, CrmProject, CrmProjectAccess } from '../lib/api/projectTypes'

type Loaded = {
  key: string
  project: CrmProject | null
  fields: CrmFormField[]
  access: CrmProjectAccess | null
  failure: string
}

const EMPTY: Loaded = { key: '', project: null, fields: [], access: null, failure: '' }

function describe(err: unknown, id: string): string {
  if (err instanceof ApiError && err.status === 404) return `Проект № ${id} не найден.`
  if (err instanceof ApiError && err.status === 403) return 'Нет доступа к проектам CRM.'
  return err instanceof Error ? err.message : 'Не удалось загрузить проект'
}

export function ProjectViewPage() {
  const crm = useCrm()
  const navigate = useNavigate()
  const { id } = useParams()
  const [loaded, setLoaded] = useState<Loaded>(EMPTY)

  const key = crm.user && id ? id : ''
  const ready = Boolean(key) && loaded.key === key

  useEffect(() => {
    if (!key) return
    let active = true
    Promise.all([getProject(Number(key)), loadProjectForm()])
      .then(([project, form]) => {
        if (active) {
          setLoaded({ key, project, fields: form.fields, access: form.access, failure: '' })
        }
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoaded({ ...EMPTY, key, failure: describe(err, key) })
      })
    return () => {
      active = false
    }
  }, [key])

  if (crm.ready && !crm.user) return <Navigate to="/projects" replace />

  if (!ready) {
    return (
      <div className="page">
        <p className="hint">Загружаем проект…</p>
      </div>
    )
  }

  if (!loaded.project) {
    return (
      <div className="page">
        <p className="hint field-invalid">{loaded.failure || 'Проект не найден.'}</p>
        <button type="button" className="ghost" onClick={() => navigate('/projects')}>
          К списку
        </button>
      </div>
    )
  }

  return (
    <ProjectView
      project={loaded.project}
      fields={loaded.fields}
      access={loaded.access}
      onBack={() => navigate('/projects')}
      onEdit={() => navigate(`/projects/${loaded.project?.id ?? ''}/edit`)}
    />
  )
}
