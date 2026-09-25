import type { CrmFormField } from '../lib/api/projectTypes'
import { fieldSourcePath } from '../lib/projects/fieldSource'

export function SourcePath({ field, projectId }: { field: CrmFormField; projectId?: number }) {
  const path = fieldSourcePath(field, projectId)
  if (!path) return null
  return <span className="bi-path">{path}</span>
}
