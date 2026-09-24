import { useEffect } from 'react'
import { Navigate } from 'react-router'
import { useCrm } from '../app/hooks'

export function ProjectCreatePage() {
  const crm = useCrm()

  useEffect(() => {
    if (crm.user) crm.openProjectEditor('new')
  }, [crm.user, crm.openProjectEditor])

  if (crm.ready && !crm.user) return <Navigate to="/projects" replace />
  return null
}
