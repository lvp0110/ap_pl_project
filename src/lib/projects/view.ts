import type { CrmProject } from '../api/projectTypes'
import type { CrmReferenceType, CrmReferenceValue } from '../api/types'

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

