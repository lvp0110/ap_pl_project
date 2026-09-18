import type { CrmMaterial } from './types'

export type CrmFieldType =
  | 'text'
  | 'text_area'
  | 'number'
  | 'date'
  | 'quarter'
  | 'list'
  | 'multiple_list'
  | 'materials'
  | 'file'

export type CrmProjectMaterialValue = {
  material_id: number
  quantity: number
}

export type CrmFormField = {
  type: CrmFieldType
  name: string
  code: string
  required: boolean
  disabled: boolean
  endpoint?: string
  depends_on?: string
  query?: string
  source?: string
  accept?: string
}

export type CrmProjectAccess = 'editor' | 'head'

export type CrmProjectForm = {
  access: CrmProjectAccess
  fields: CrmFormField[]
}

export type CrmOption = {
  code: string
  name: string
}

export type CrmFilter = {
  code: string
  name: string
  options: CrmOption[]
}

export type CrmProjectFile = {
  id: number
  original_name: string
  download_url: string
  created_at: string
  created_by: string
}

export type CrmProjectMaterial = {
  id: number
  material: CrmMaterial
  unit_price: number
  quantity: number
  line_amount: number
}

export type CrmProject = {
  id: number
  erp_code?: string | null
  information_source_id?: number | null
  information_form_date?: string | null
  name: string
  segment_id?: number | null
  region_id?: number | null
  sg_manager_id?: number | null
  address: string
  ag_manager_id?: string | null
  participant_ids: string[]
  documentation_type_ids: number[]
  status?: string
  stage_id?: number | null
  planned_supply_year?: number | null
  planned_supply_quarter?: number | null
  sale_probability: number
  priority_id?: number | null
  support_status_id?: number | null
  support_date?: string | null
  first_contact_date?: string | null
  planned_shipment_date?: string | null
  competitors?: string
  comment?: string
  materials: CrmProjectMaterial[]
  material_summary: string
  total_area: number
  total_pieces: number
  potential_revenue: number
  files: CrmProjectFile[]
  is_archived?: boolean
  created_at: string
  updated_at: string
}

export type CrmProjectValues = Record<string, unknown>
