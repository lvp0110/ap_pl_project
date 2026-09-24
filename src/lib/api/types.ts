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

/** Код из `GET /crm/references`. Набор не фиксирован: его отдаёт API. */
export type CrmReferenceType = string

export type CrmReferenceTypeInfo = {
  code: CrmReferenceType
  name: string
}

export type CrmReferenceValue = {
  id: number
  type: CrmReferenceType
  name: string
  sort_order: number
  is_active: boolean
  brand_codes?: string[]
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

export type CrmSnapshot = {
  catalogs: CrmCatalogSnapshot
  materials: CrmMaterial[]
  references: Record<string, CrmReferenceValue[]>
  referenceTypes: CrmReferenceTypeInfo[]
  sgManagers: CrmSgManager[]
}

export type CrmCatalogSnapshot = {
  sources: string[]
  purposes: string[]
  stages: string[]
  priorities: string[]
  regions: string[]
  documentationTypes: string[]
  managersSG: string[]
  managersAG: string[]
  units: string[]
  probabilities: string[]
  reservationStatuses: string[]
}

/** Запасной список, если `GET /crm/references` недоступен. Совпадает с enum `CRMReferenceType` в swagger. */
export const CRM_REFERENCE_TYPES: CrmReferenceType[] = [
  'information_source',
  'segment',
  'project_stage',
  'priority',
  'documentation_type',
  'region',
  'support_status',
  'probability',
  'reserve',
]

export const API_CATALOG_KEYS = [
  'sources',
  'purposes',
  'stages',
  'priorities',
  'regions',
  'documentationTypes',
  'managersSG',
  'managersAG',
  'units',
] as const

export const CATALOG_REFERENCE_TYPES: Partial<Record<string, CrmReferenceType>> = {
  sources: 'information_source',
  purposes: 'segment',
  stages: 'project_stage',
  priorities: 'priority',
  regions: 'region',
  documentationTypes: 'documentation_type',
  probabilities: 'probability',
  reservationStatuses: 'reserve',
}
