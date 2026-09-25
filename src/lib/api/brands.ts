import { apiRequest, asList } from './client'
import type { CrmOption } from './projectTypes'
import type { CrmBrand } from './types'

export async function listBrands(): Promise<CrmOption[]> {
  const data = await apiRequest<unknown>('/crm/brands')
  return asList(data)
    .map((row) => {
      const item = row as Partial<CrmBrand>
      return { code: String(item.code ?? ''), name: item.name ?? '' }
    })
    .filter((option) => option.code !== '')
}
