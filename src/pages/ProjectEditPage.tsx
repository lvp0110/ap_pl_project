import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { ProjectForm } from '../components/ProjectForm'
import { useCrm } from '../app/hooks'
import { getProject } from '../lib/api/projects'
import type { CrmProject } from '../lib/api/projectTypes'

type Loaded = {
  key: string
  project: CrmProject | null
  failure: string
}

export function ProjectEditPage() {
  const crm = useCrm()
  const navigate = useNavigate()
  const { id } = useParams()
  const [loaded, setLoaded] = useState<Loaded>({ key: '', project: null, failure: '' })

  const key = crm.user && id ? id : ''
  const ready = Boolean(key) && loaded.key === key

  useEffect(() => {
    if (!key) return
    let active = true
    getProject(Number(key))
      .then((project) => {
        if (active) setLoaded({ key, project, failure: '' })
      })
      .catch((err: unknown) => {
        if (!active) return
        const failure = err instanceof Error ? err.message : 'Не удалось загрузить проект'
        setLoaded({ key, project: null, failure })
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
    <ProjectForm
      project={loaded.project}
      onSaved={(project, asDraft) => {
        crm.rememberProject(project)
        if (asDraft) {
          crm.setNotice(`Черновик «${project.name || 'без названия'}» сохранён.`)
          navigate('/projects')
          return
        }
        crm.setNotice(`Бланк «${project.name}» сохранён в статусе «Заполнен».`)
        navigate('/projects')
      }}
      onCancel={() => navigate('/projects')}
    />
  )
}
