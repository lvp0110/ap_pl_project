import type { CrmFormField, CrmProjectValues } from '../api/projectTypes'
import type { CrmReferenceType, CrmReferenceValue, CrmSgManager } from '../api/types'
import type { ReferenceMap } from './view'

export type DraftContext = {
  references: ReferenceMap
  sgManagers: CrmSgManager[]
  userId?: string
}

const REF_BY_CODE: Partial<Record<string, CrmReferenceType>> = {
  information_source_id: 'information_source',
  segment_id: 'segment',
  stage_id: 'project_stage',
  region_id: 'region',
  priority_id: 'priority',
  brand_support_status_id: 'brand_support_status',
  support_status_id: 'brand_support_status',
}

function firstId(values: CrmReferenceValue[] | undefined): number | undefined {
  return values?.find((value) => value.is_active !== false)?.id ?? values?.[0]?.id
}

function missing(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  return Array.isArray(value) && value.length === 0
}

/** Подставляет обязательные поля, без которых POST /crm/projects отвечает 422. */
export function fillDraftPayload(
  fields: CrmFormField[],
  payload: CrmProjectValues,
  ctx: DraftContext,
): CrmProjectValues {
  const next: CrmProjectValues = { ...payload }
  if (!String(next.name ?? '').trim()) next.name = 'Черновик'

  const today = new Date().toISOString().slice(0, 10)

  for (const field of fields) {
    if (!field.required || field.disabled || field.type === 'file' || field.type === 'materials') continue
    if (!missing(next[field.code])) continue

    if (field.code === 'ag_manager_id' && ctx.userId) {
      next[field.code] = ctx.userId
      continue
    }
    if (field.code === 'sg_manager_id' && ctx.sgManagers[0]) {
      next[field.code] = ctx.sgManagers[0].id
      continue
    }

    const refType = REF_BY_CODE[field.code]
    if (refType) {
      const id = firstId(ctx.references[refType])
      if (id !== undefined) next[field.code] = id
      continue
    }

    if (field.code === 'documentation_type_ids' || field.code === 'participant_ids') {
      if (field.code === 'documentation_type_ids') {
        const id = firstId(ctx.references.documentation_type)
        if (id !== undefined) next[field.code] = [id]
      }
      continue
    }

    if (field.type === 'date') {
      next[field.code] = today
      continue
    }
    if (field.code === 'sale_probability') {
      next[field.code] = 10
      continue
    }
    if (field.type === 'text' || field.type === 'text_area') {
      next[field.code] = field.code === 'name' ? 'Черновик' : '—'
    }
  }

  return next
}
