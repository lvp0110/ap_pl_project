import type { CrmFormField, CrmProjectValues } from '../api/projectTypes'

export type ProjectFormValues = Record<string, string | string[]>

const EMPLOYEE_ENDPOINT = '/crm/project-options/employees'

export function isEditable(field: CrmFormField): boolean {
  return !field.disabled && field.type !== 'file'
}

export function defaultValues(fields: CrmFormField[]): ProjectFormValues {
  const values: ProjectFormValues = {}
  for (const field of fields) {
    if (!isEditable(field)) continue
    values[field.code] = field.type === 'multiple_list' ? [] : ''
  }
  return values
}

export function parentCodes(fields: CrmFormField[]): string[] {
  const codes = fields.map((field) => field.depends_on).filter((code): code is string => Boolean(code))
  return [...new Set(codes)]
}

function holdsUuid(field: CrmFormField): boolean {
  return field.endpoint === EMPLOYEE_ENDPOINT
}

function holdsNumericId(field: CrmFormField): boolean {
  return !holdsUuid(field) && (field.code.endsWith('_id') || field.code.endsWith('_ids'))
}

function single(field: CrmFormField, raw: string): string | number | null {
  if (!raw) return null
  if (holdsNumericId(field)) return Number(raw)
  return raw
}

function many(field: CrmFormField, raw: string[]): Array<string | number> {
  return raw.filter(Boolean).map((item) => (holdsNumericId(field) ? Number(item) : item))
}

export function toPayload(fields: CrmFormField[], values: ProjectFormValues): CrmProjectValues {
  const payload: CrmProjectValues = {}

  for (const field of fields) {
    if (!isEditable(field)) continue
    const raw = values[field.code]

    if (field.type === 'multiple_list') {
      const list = many(field, Array.isArray(raw) ? raw : [])
      if (list.length) payload[field.code] = list
      continue
    }

    const text = typeof raw === 'string' ? raw.trim() : ''
    if (!text) continue

    if (field.type === 'number' || field.type === 'quarter') {
      payload[field.code] = Number(text)
      continue
    }
    payload[field.code] = single(field, text)
  }

  return payload
}
