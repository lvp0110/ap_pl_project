import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router'
import { useCrm } from '../app/hooks'

export function ProjectEditPage() {
  const crm = useCrm()
  const { id } = useParams()
  const projectId = Number(id)

  useEffect(() => {
    if (!crm.user || !Number.isFinite(projectId)) return
    crm.openProjectEditor(projectId)
  }, [crm.user, crm.openProjectEditor, projectId])

  if (crm.ready && !crm.user) return <Navigate to="/projects" replace />
  return null
}
