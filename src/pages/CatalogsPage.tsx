import { useMemo } from 'react'
import { CatalogsPage as CatalogsView } from '../components/CatalogsPage'
import { MaterialsPanel } from '../components/MaterialsPanel'
import { useBlanks, useCrm } from '../app/hooks'
import { catalogsWithPriceUnits } from '../lib/excel'

export function CatalogsPage() {
  const crm = useCrm()
  const blanks = useBlanks()
  const catalogs = useMemo(
    () => catalogsWithPriceUnits(crm.catalogs, blanks.price),
    [crm.catalogs, blanks.price],
  )

  return (
    <CatalogsView
      catalogs={catalogs}
      references={crm.references}
      sgManagers={crm.sgManagers}
      loadedFromApi={Boolean(crm.user)}
      busy={crm.busy}
      onAddReference={crm.addReference}
      onUpdateReference={crm.renameReference}
      onArchiveReference={crm.archiveReferenceValue}
      onAddSgManager={crm.addSgManager}
      onUpdateSgManager={crm.renameSgManager}
      onArchiveSgManager={crm.archiveSgManagerValue}
      materials={<MaterialsPanel loadedFromApi={Boolean(crm.user)} />}
    />
  )
}
