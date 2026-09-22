import { isDraftStatus, type CrmFormField, type CrmProject } from '../api/projectTypes'
import type { CrmReferenceType, CrmReferenceValue } from '../api/types'
import { asMaterials, readValue } from './formValues'

export type ReferenceMap = Record<CrmReferenceType, CrmReferenceValue[]>

export function referenceName(
  references: ReferenceMap,
  type: CrmReferenceType,
  id?: number | null,
): string {
  if (!id) return '—'
  return references[type]?.find((value) => value.id === id)?.name ?? '—'
}

export function isIncomplete(project: CrmProject): boolean {
  return !project.stage_id || !project.segment_id || !project.region_id || !project.sg_manager_id
}

export function checkLabel(project: CrmProject, fields: CrmFormField[]): string {
  if (isDraftStatus(project.status)) return 'Черновик'
  if (fields.length) return isBlankComplete(project, fields) ? 'Заполнен' : 'Не заполнен'
  return isIncomplete(project) ? 'Не заполнен' : 'Заполнен'
}

export function isBlankComplete(project: CrmProject, fields: CrmFormField[]): boolean {
  const required = fields.filter((field) => field.required && !field.disabled)
  if (!required.length) return !isIncomplete(project)

  return required.every((field) => {
    if (field.type === 'file') return project.files.length > 0
    const value = readValue(project, field)
    if (field.type === 'materials') {
      return asMaterials(value).some((line) => line.material_id > 0 && line.quantity > 0)
    }
    if (Array.isArray(value)) return value.length > 0
    return typeof value === 'string' && value.trim() !== ''
  })
}

export function formatMoney(value: number): string {
  if (!value) return '—'
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`
}

export function formatAmount(value: number, unit: string): string {
  if (!value) return '—'
  return `${value.toLocaleString('ru-RU')} ${unit}`
}

export function formatProjectCount(count: number): string {
  const tail = count % 100
  const last = count % 10
  if (tail > 10 && tail < 20) return `${count} проектов`
  if (last === 1) return `${count} проект`
  if (last >= 2 && last <= 4) return `${count} проекта`
  return `${count} проектов`
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU')
}

