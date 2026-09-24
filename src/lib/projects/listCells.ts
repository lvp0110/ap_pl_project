import type { CrmFilter, CrmFormField, CrmOption, CrmProject } from '../api/projectTypes'
import type { CrmReferenceType, CrmSgManager } from '../api/types'
import { blankLabel, planBlankFields } from './blankLayout'
import { readValue } from './formValues'
import { checkLabel, formatDate, type ReferenceMap } from './view'

export type ListLookups = {
  references: ReferenceMap
  sgManagers: CrmSgManager[]
  employees: CrmOption[]
  filters?: CrmFilter[]
}

const FIELD_REFERENCE: Partial<Record<string, CrmReferenceType>> = {
  information_source_id: 'information_source',
  segment_id: 'segment',
  stage_id: 'project_stage',
  region_id: 'region',
  priority_id: 'priority',
  documentation_type_ids: 'documentation_type',
  brand_support_status_id: 'support_status',
  support_status_id: 'support_status',
}

const FALLBACK_FIELDS: CrmFormField[] = [
  field('date', 'information_form_date', 'Дата составления'),
  field('text', 'comment', 'Примечание'),
  field('list', 'information_source_id', 'Источник информации о проекте'),
  field('text', 'name', 'Название проекта'),
  field('text', 'address', 'Адрес объекта строительства'),
  field('list', 'segment_id', 'Назначение объекта строительства/ помещения'),
  field('list', 'stage_id', 'Стадия проекта'),
  field('date', 'planned_shipment_date', 'Предполагаемая дата начала поставки материалов'),
  field('quarter', 'planned_supply_quarter', 'Квартал поставки'),
  field('number', 'planned_supply_year', 'Год поставки'),
  field('number', 'sale_probability', 'Вероятность поставки материалов  %.'),
  field('list', 'ag_manager_id', 'Ответственный со стороны компании-партнера'),
  field('list', 'sg_manager_id', 'Ответственный SG'),
  field('multiple_list', 'participant_ids', 'Контактные лица'),
  field('date', 'first_contact_date', 'Дата первого контакта с клиентом'),
  field('multiple_list', 'documentation_type_ids', 'Проделанная работа'),
  field('materials', 'materials', 'Краткая информация о предлагаемых материалах'),
]

function field(type: CrmFormField['type'], code: string, name: string): CrmFormField {
  return { type, code, name, required: false, disabled: false }
}

export function listBlankFields(formFields: CrmFormField[]): CrmFormField[] {
  const plan = planBlankFields(formFields)
  const sheet = [
    ...plan.date,
    ...plan.note,
    ...plan.info.flat(),
    ...plan.contacts.flat(),
    ...plan.work.flat(),
    ...(plan.materials ? [plan.materials] : []),
  ].filter((item) => !item.disabled)
  const extra = plan.extra.flat()
  const fromForm = [...sheet, ...extra]
  return fromForm.length ? fromForm : FALLBACK_FIELDS
}

export function filledListColumns(fields: CrmFormField[], projects: CrmProject[], lookups: ListLookups) {
  const labels = columnLabels(fields)
  return fields
    .map((item, index) => ({ field: item, label: labels[index] }))
    .filter(({ field }) => projects.some((project) => formatBlankCell(project, field, lookups)))
}

function columnLabels(fields: CrmFormField[]): string[] {
  return fields.map((item) => item.name.trim() || blankLabel(item))
}

export function formatBlankCell(project: CrmProject, field: CrmFormField, lookups: ListLookups): string {
  if (field.type === 'materials') {
    if (!project.materials.length) return ''
    return project.materials
      .map((line) => {
        const title = [line.material.brand?.name, line.material.name].filter(Boolean).join(' · ')
        const qty = line.quantity ? `${line.quantity} ${line.material.unit}`.trim() : ''
        return qty ? `${title} — ${qty}` : title
      })
      .filter(Boolean)
      .join('; ')
  }

  if (field.type === 'file') {
    return project.files.map((file) => file.original_name).filter(Boolean).join('; ')
  }

  const raw = readValue(project, field)
  if (Array.isArray(raw)) {
    return raw.map((code) => lookupName(field, String(code), lookups)).filter(Boolean).join(', ')
  }

  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text || text === '0') return ''

  if (field.type === 'date') return formatDate(text)
  if (field.type === 'quarter') return `${text} квартал`
  if (field.code === 'sale_probability') return `${text}%`
  if (field.type === 'list') return lookupName(field, text, lookups)
  return filterOptionName(field.code, text, lookups) || text
}

function lookupName(field: CrmFormField, code: string, lookups: ListLookups): string {
  if (!code) return ''
  if (field.code === 'sg_manager_id') {
    return lookups.sgManagers.find((manager) => String(manager.id) === code)?.name ?? code
  }
  if (field.code === 'ag_manager_id' || field.code === 'participant_ids') {
    return lookups.employees.find((option) => option.code === code)?.name ?? code
  }
  const type = FIELD_REFERENCE[field.code]
  if (type) {
    const hit = lookups.references[type]?.find((item) => String(item.id) === code)
    if (hit) return hit.name
  }
  const employee = lookups.employees.find((option) => option.code === code)
  if (employee) return employee.name
  return filterOptionName(field.code, code, lookups) || code
}

function filterOptionName(fieldCode: string, code: string, lookups: ListLookups): string {
  const filter = lookups.filters?.find((item) => item.code === fieldCode)
  return filter?.options.find((option) => option.code === code)?.name ?? ''
}

export const ROW_ID_FILTER = '_id'
export const CHECK_FILTER = '_check'

const SERVER_FILTERS = new Set([
  'region_id',
  'stage_id',
  'segment_id',
  'sg_manager_id',
  'ag_manager_id',
  'information_source_id',
  'status',
  'priority_id',
  'support_status_id',
])

export function isServerFilter(code: string): boolean {
  return SERVER_FILTERS.has(code)
}

export function uniqueCellOptions(
  projects: CrmProject[],
  field: CrmFormField,
  lookups: ListLookups,
): CrmOption[] {
  const values = new Set<string>()
  for (const project of projects) {
    const text = formatBlankCell(project, field, lookups)
    if (!text) continue
    if (field.type === 'materials') {
      for (const part of text.split('; ')) if (part) values.add(part)
    } else if (field.type === 'multiple_list') {
      for (const part of text.split(', ')) if (part) values.add(part)
    } else {
      values.add(text)
    }
  }
  return [...values]
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map((name) => ({ code: name, name }))
}

export function uniqueIdOptions(projects: CrmProject[]): CrmOption[] {
  return projects
    .map((project) => String(project.erp_code || project.id))
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
    .map((name) => ({ code: name, name }))
}

export function matchesListFilters(
  project: CrmProject,
  selected: Record<string, string>,
  fields: CrmFormField[],
  lookups: ListLookups,
  columns: Array<{ field: CrmFormField }>,
): boolean {
  for (const [code, value] of Object.entries(selected)) {
    if (!value || isServerFilter(code)) continue
    if (code === ROW_ID_FILTER) {
      if (String(project.erp_code || project.id) !== value) return false
      continue
    }
    if (code === CHECK_FILTER) {
      if (checkLabel(project, fields) !== value) return false
      continue
    }
    const column = columns.find((item) => item.field.code === code)
    if (!column) continue
    const text = formatBlankCell(project, column.field, lookups)
    if (column.field.type === 'materials' || column.field.type === 'multiple_list') {
      if (!text.split(/; |, /).includes(value) && !text.includes(value)) return false
    } else if (text !== value) return false
  }
  return true
}
