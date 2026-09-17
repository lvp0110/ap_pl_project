import { apiRequest } from './client'
import type { CrmMaterial } from './types'

export type MaterialImportResult = {
  created: number
  updated: number
  unchanged: number
}

export type MaterialImportRowError = {
  row: number
  column?: string
  message: string
}

export type MaterialDraft = {
  brand_code: string
  article: string
  name: string
  price: number
  unit: string
  comment: string
}

export async function listMaterials(brandCode: string, includeArchived = false): Promise<CrmMaterial[]> {
  const params = new URLSearchParams()
  if (brandCode) params.set('brand_code', brandCode)
  if (includeArchived) params.set('include_archived', 'true')
  const query = params.toString()
  const data = await apiRequest<CrmMaterial[]>(`/crm/materials${query ? `?${query}` : ''}`)
  return Array.isArray(data) ? data : []
}

export async function updateMaterial(id: number, draft: MaterialDraft): Promise<CrmMaterial> {
  return apiRequest<CrmMaterial>(`/crm/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...draft, article: draft.article || null, is_active: true }),
  })
}

export async function archiveMaterial(id: number): Promise<void> {
  await apiRequest(`/crm/materials/${id}`, { method: 'DELETE' })
}

export async function importMaterials(brandCode: string, file: File): Promise<MaterialImportResult> {
  const form = new FormData()
  form.append('brand_code', brandCode)
  form.append('file', file)
  return apiRequest<MaterialImportResult>('/crm/material-imports', { method: 'POST', body: form })
}
