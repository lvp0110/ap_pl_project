import { useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { BlanksProvider } from './app/BlanksProvider'
import { CrmProvider } from './app/CrmProvider'
import { Layout } from './app/Layout'
import { useBlanks } from './app/hooks'
import { userDisplayName } from './lib/api/crm'
import { loadOperator } from './lib/repo/operator'
import { CatalogsPage } from './pages/CatalogsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectCreatePage } from './pages/ProjectCreatePage'
import { ProjectEditPage } from './pages/ProjectEditPage'
import { ProjectsListPage } from './pages/ProjectsListPage'
import { ProjectViewPage } from './pages/ProjectViewPage'
import type { AuthUser } from './lib/api/types'

export default function App() {
  return (
    <BlanksProvider>
      <AppRoutes />
    </BlanksProvider>
  )
}

function AppRoutes() {
  const blanks = useBlanks()

  const adoptOperator = useCallback(
    (user: AuthUser) => {
      if (loadOperator()) return
      const name = userDisplayName(user)
      if (name) blanks.setOperator(name)
    },
    [blanks],
  )

  return (
    <CrmProvider onSignedIn={adoptOperator}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="projects/new" element={<ProjectCreatePage />} />
          <Route path="projects/:id" element={<ProjectViewPage />} />
          <Route path="projects/:id/edit" element={<ProjectEditPage />} />
          <Route path="catalogs" element={<CatalogsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </CrmProvider>
  )
}
