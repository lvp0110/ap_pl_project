import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useCrm } from '../app/hooks'
import { getProject } from '../lib/api/projects'
import type { CrmProject } from '../lib/api/projectTypes'
import { ProjectForm } from './ProjectForm'

export function ProjectEditorLayer() {
  const crm = useCrm()
  if (!crm.editor || !crm.user) return null
  return (
    <div className="editor-layer">
      <ProjectEditorSession key={String(crm.editor.id)} id={crm.editor.id} />
    </div>
  )
}

function ProjectEditorSession({ id }: { id: number | 'new' }) {
  const crm = useCrm()
  const navigate = useNavigate()
  const [project, setProject] = useState<CrmProject | null>(null)
  const [failure, setFailure] = useState('')
  const [ready, setReady] = useState(id === 'new')

  useEffect(() => {
    if (id === 'new') return
    let active = true
    getProject(id)
      .then((loaded) => {
        if (!active) return
        setProject(loaded)
        setFailure('')
      })
      .catch((err: unknown) => {
        if (!active) return
        setProject(null)
        setFailure(err instanceof Error ? err.message : 'Не удалось загрузить проект')
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [id])

  function close() {
    crm.closeProjectEditor()
    navigate('/projects')
  }

  function saved(next: CrmProject, asDraft?: boolean) {
    crm.rememberProject(next)
    crm.closeProjectEditor()
    crm.setNotice(
      asDraft
        ? `Черновик «${next.name || 'без названия'}» сохранён.`
        : `Бланк «${next.name}» сохранён в статусе «Заполнен».`,
    )
    navigate('/projects')
  }

  if (!ready) {
    return (
      <div className="page">
        <p className="hint">Загружаем проект…</p>
      </div>
    )
  }

  if (id !== 'new' && !project) {
    return (
      <div className="page">
        <p className="hint field-invalid">{failure || 'Проект не найден.'}</p>
        <button type="button" className="ghost" onClick={close}>
          К списку
        </button>
      </div>
    )
  }

  return <ProjectForm project={project ?? undefined} onSaved={saved} onCancel={close} />
}
