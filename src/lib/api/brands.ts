import { apiRequest } from './client'
import type { CrmOption } from './projectTypes'

type BrandReference = {
  code?: string
  name?: string
}

export async function listBrands(): Promise<CrmOption[]> {
  const data = await apiRequest<BrandReference[]>('/content/references/brand?limit=500')
  if (!Array.isArray(data)) return []
  return data
    .map((row) => ({ code: String(row.code ?? ''), name: row.name ?? '' }))
    .filter((option) => option.code !== '')
}
