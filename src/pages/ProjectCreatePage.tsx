import { Navigate, useNavigate } from 'react-router'
import { ProjectForm } from '../components/ProjectForm'
import { useCrm } from '../app/hooks'

export function ProjectCreatePage() {
  const crm = useCrm()
  const navigate = useNavigate()

  if (!crm.ready) {
    return (
      <div className="page">
        <p className="hint">Проверяем сессию ConstrTodo…</p>
      </div>
    )
  }

  if (!crm.user) return <Navigate to="/projects" replace />

  return (
    <ProjectForm
      onSaved={(project, asDraft) => {
        crm.rememberProject(project)
        if (asDraft) {
          crm.setNotice(`Черновик «${project.name || 'без названия'}» сохранён в CRM, № ${project.id}.`)
          navigate('/projects')
          return
        }
        crm.setNotice(`Проект «${project.name}» создан в CRM, № ${project.id}.`)
        navigate('/projects')
      }}
      onCancel={() => navigate('/projects')}
    />
  )
}
