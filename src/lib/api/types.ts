export type AuthUser = {
  user_id: string
  first_name: string
  middle_name: string
  last_name: string
  email: string
  role_type: string
}

export type LoginResponse = {
  user: AuthUser
}

export type CrmReferenceType =
  | 'project_stage'
  | 'priority'
  | 'segment'
  | 'information_source'
  | 'documentation_type'
  | 'region'

export type CrmReferenceValue = {
  id: number
  type: CrmReferenceType
  name: string
  sort_order: number
  is_active: boolean
}

export type CrmBrand = {
  id: number
  code: string
  name: string
}

export type CrmMaterial = {
  id: number
  brand: CrmBrand
  article?: string | null
  name: string
  price: number
  unit: string
  comment: string
  is_active: boolean
}

export type CrmSgManager = {
  id: number
  name: string
  email: string
  regions: CrmReferenceValue[]
  is_active: boolean
}

export type CrmCatalogSnapshot = {
  sources: string[]
  purposes: string[]
  stages: string[]
  priorities: string[]
  regions: string[]
  documentationTypes: string[]
  managersSG: string[]
  units: string[]
}

export const CRM_REFERENCE_TYPES: CrmReferenceType[] = [
  'information_source',
  'segment',
  'project_stage',
  'priority',
  'documentation_type',
  'region',
]

export const API_LOCKED_CATALOG_KEYS = [
  'sources',
  'purposes',
  'stages',
  'priorities',
  'regions',
  'documentationTypes',
  'managersSG',
] as const
