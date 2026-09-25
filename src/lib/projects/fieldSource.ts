import type { CrmFormField } from '../api/projectTypes'

const LOCAL_LISTS = new Set(['sale_probability', 'planned_supply_year'])

export function fieldSourcePath(field: CrmFormField, projectId?: number): string {
  const stored = projectId
    ? `GET /crm/projects/${projectId} · ${field.code}`
    : `GET /crm/projects/form · ${field.code}`

  if (field.type === 'materials') {
    const lines = projectId ? `GET /crm/projects/${projectId} · materials` : stored
    return [lines, 'GET /crm/brands', 'GET /crm/materials'].join(' · ')
  }

  if (field.type === 'file') {
    return projectId ? `GET /crm/projects/${projectId} · files` : stored
  }

  if (field.type === 'list' || field.type === 'multiple_list') {
    if (LOCAL_LISTS.has(field.code)) return stored
    const list = optionPath(field)
    return list ? `${stored} · список ${list}` : stored
  }

  return stored
}

function optionPath(field: CrmFormField): string {
  if (!field.endpoint) return ''
  const param = field.query?.trim() || field.depends_on || ''
  return param ? `GET ${field.endpoint}?${param}` : `GET ${field.endpoint}`
}
