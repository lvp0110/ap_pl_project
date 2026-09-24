import type {
  CrmFormField,
  CrmProject,
  CrmProjectMaterialValue,
  CrmProjectValues,
} from '../api/projectTypes'

export type ProjectFieldValue = string | string[] | CrmProjectMaterialValue[]
export type ProjectFormValues = Record<string, ProjectFieldValue>

export function asMaterials(value: ProjectFieldValue | undefined): CrmProjectMaterialValue[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is CrmProjectMaterialValue => typeof item === 'object' && item !== null)
}

const EMPLOYEE_ENDPOINT = '/crm/project-options/employees'

export function isEditable(field: CrmFormField): boolean {
  return !field.disabled && field.type !== 'file'
}

export function defaultValues(fields: CrmFormField[]): ProjectFormValues {
  const values: ProjectFormValues = {}
  for (const field of fields) {
    if (!isEditable(field)) continue
    values[field.code] = field.type === 'multiple_list' || field.type === 'materials' ? [] : ''
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

function toCodes(value: ProjectFieldValue | undefined): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function readValue(project: CrmProject, field: CrmFormField): ProjectFieldValue {
  if (field.type === 'materials') {
    return project.materials.map((line) => ({
      material_id: line.material.id,
      quantity: line.quantity,
    }))
  }

  const raw = (project as unknown as Record<string, unknown>)[field.code]
  if (raw === null || raw === undefined) return field.type === 'multiple_list' ? [] : ''
  if (Array.isArray(raw)) return raw.map((item) => String(item))
  if (typeof raw === 'number') return raw === 0 && field.disabled ? '' : String(raw)
  if (typeof raw === 'string') return field.type === 'date' ? dateInputValue(raw) : raw
  return ''
}

export function dateInputValue(value: string): string {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

export function isFormComplete(
  fields: CrmFormField[],
  values: ProjectFormValues,
  fileCount = 0,
): boolean {
  const required = fields.filter((field) => field.required && !field.disabled)
  if (!required.length) {
    return Boolean(values.stage_id && values.segment_id && values.region_id && values.sg_manager_id)
  }

  return required.every((field) => {
    if (field.type === 'file') return fileCount > 0
    const value = values[field.code]
    if (field.type === 'materials') {
      return asMaterials(value).some((line) => line.material_id > 0 && line.quantity > 0)
    }
    if (Array.isArray(value)) return value.length > 0
    return typeof value === 'string' && value.trim() !== ''
  })
}

export function initialValues(fields: CrmFormField[], project: CrmProject): ProjectFormValues {
  const values: ProjectFormValues = {}
  for (const field of fields) {
    if (!isEditable(field)) continue
    values[field.code] = readValue(project, field)
  }
  return values
}

export function toPatch(
  fields: CrmFormField[],
  initial: ProjectFormValues,
  current: ProjectFormValues,
): CrmProjectValues {
  const patch: CrmProjectValues = {}

  for (const field of fields) {
    if (!isEditable(field)) continue
    const before = initial[field.code]
    const after = current[field.code]
    if (JSON.stringify(before ?? '') === JSON.stringify(after ?? '')) continue

    if (field.type === 'materials') {
      patch[field.code] = asMaterials(after)
      continue
    }

    if (field.type === 'multiple_list') {
      patch[field.code] = many(field, toCodes(after))
      continue
    }

    const text = typeof after === 'string' ? after.trim() : ''
    if (!text) {
      patch[field.code] = clearedValue(field)
      continue
    }
    if (field.type === 'number' || field.type === 'quarter') {
      patch[field.code] = Number(text)
      continue
    }
    patch[field.code] = single(field, text)
  }

  return patch
}

function clearedValue(field: CrmFormField): string | number | null {
  if (field.type === 'number' || field.type === 'quarter') return 0
  if (field.type === 'text' || field.type === 'text_area') return ''
  return null
}

export function toPayload(fields: CrmFormField[], values: ProjectFormValues): CrmProjectValues {
  const payload: CrmProjectValues = {}

  for (const field of fields) {
    if (!isEditable(field)) continue
    const raw = values[field.code]

    if (field.type === 'materials') {
      const lines = asMaterials(raw)
      if (lines.length) payload[field.code] = lines
      continue
    }

    if (field.type === 'multiple_list') {
      const list = many(field, toCodes(raw))
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
