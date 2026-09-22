import { apiRequest, asList } from './client'
import type { CrmOption } from './projectTypes'

type BrandReference = {
  code?: string
  name?: string
}

export async function listBrands(): Promise<CrmOption[]> {
  const data = await apiRequest<unknown>('/content/references/brand?limit=500')
  return asList(data)
    .map((row) => {
      const item = row as BrandReference
      return { code: String(item.code ?? ''), name: item.name ?? '' }
    })
    .filter((option) => option.code !== '')
}
