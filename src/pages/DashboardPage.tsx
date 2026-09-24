import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Dashboard } from '../components/Dashboard'
import { useBlanks, useCrm } from '../app/hooks'
import { catalogsWithPriceUnits } from '../lib/excel'

export function DashboardPage() {
  const crm = useCrm()
  const blanks = useBlanks()
  const navigate = useNavigate()
  const catalogs = useMemo(
    () => catalogsWithPriceUnits(crm.catalogs, blanks.price),
    [crm.catalogs, blanks.price],
  )

  return (
    <>
      <Dashboard
        projects={blanks.projects}
        catalogs={catalogs}
        onOpenProject={(id) => {
          const found = blanks.projects.find((p) => p.id === id)
          if (found) blanks.openBlank(found)
        }}
        onGoProjects={() => navigate('/projects')}
      />
    </>
  )
}
