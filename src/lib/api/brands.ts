
import type { CrmOption } from './projectTypes'

type BrandReference = {
  code?: string
  name?: string
}

export async function listBrands(): Promise<CrmOption[]> {

    .filter((option) => option.code !== '')
}
