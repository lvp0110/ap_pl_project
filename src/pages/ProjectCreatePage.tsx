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
      onCreated={(project) => {
        crm.rememberProject(project)
        crm.setNotice(`Проект «${project.name}» создан в CRM, № ${project.id}.`)
        navigate('/projects')
      }}
      onCancel={() => navigate('/projects')}
    />
  )
}
