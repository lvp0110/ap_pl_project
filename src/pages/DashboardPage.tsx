import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { BlankForm } from '../components/BlankForm'
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
