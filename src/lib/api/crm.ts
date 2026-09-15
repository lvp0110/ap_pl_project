import { emptyCatalogs } from '../../data/defaults'
import type { Catalogs } from '../../types'
import { apiRequest } from './client'
import {
  CRM_REFERENCE_TYPES,
  type AuthUser,
  type CrmCatalogSnapshot,
  type CrmMaterial,
  type CrmReferenceType,
  type CrmReferenceValue,
  type CrmSgManager,
  type LoginResponse,
} from './types'

export const CRM_BRAND = (import.meta.env.VITE_CRM_BRAND || 'ecophon').trim() || 'ecophon'

function names(values: CrmReferenceValue[]): string[] {
  return values
    .filter((v) => v.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ru'))
    .map((v) => v.name)
    .filter(Boolean)
}

export function userDisplayName(user: AuthUser): string {
  return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim()
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiRequest<LoginResponse | AuthUser>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  if (data && typeof data === 'object' && 'user' in data && data.user) return data.user
  return data as AuthUser
}

export async function loadSession(): Promise<AuthUser | null> {
  try {
    return await apiRequest<AuthUser>('/auth/session')
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } catch {
    /* cookie already gone */
  }
}

export async function listReferences(type: CrmReferenceType): Promise<CrmReferenceValue[]> {
  const data = await apiRequest<CrmReferenceValue[]>(`/crm/references/${type}`)
  return Array.isArray(data) ? data : []
}

export async function listMaterials(brandCode = CRM_BRAND): Promise<CrmMaterial[]> {
  const query = brandCode ? `?brand_code=${encodeURIComponent(brandCode)}` : ''
  const data = await apiRequest<CrmMaterial[]>(`/crm/materials${query}`)
  return Array.isArray(data) ? data : []
}

export async function listSgManagers(): Promise<CrmSgManager[]> {
  const data = await apiRequest<CrmSgManager[]>('/crm/sg-managers')
  return Array.isArray(data) ? data : []
}

export async function createReference(
  type: CrmReferenceType,
  name: string,
  sortOrder: number,
): Promise<void> {
  await apiRequest(`/crm/references/${type}`, {
    method: 'POST',
    body: JSON.stringify({ name, sort_order: sortOrder, is_active: true }),
  })
}

export async function createSgManager(name: string, email: string): Promise<void> {
  await apiRequest('/crm/sg-managers', {
    method: 'POST',
    body: JSON.stringify({ name, email, is_active: true, region_ids: [] }),
  })
}

export async function loadCrmCatalogs(): Promise<{ catalogs: CrmCatalogSnapshot; materials: CrmMaterial[] }> {
  const [refs, materials, managers] = await Promise.all([
    Promise.all(CRM_REFERENCE_TYPES.map((type) => listReferences(type).then((rows) => [type, rows] as const))),
    listMaterials(),
    listSgManagers(),
  ])
  const byType = Object.fromEntries(refs) as Record<CrmReferenceType, CrmReferenceValue[]>
  const units = [...new Set(materials.map((m) => m.unit).filter(Boolean))]
  return {
    materials,
    catalogs: {
      sources: names(byType.information_source ?? []),
      purposes: names(byType.segment ?? []),
      stages: names(byType.project_stage ?? []),
      priorities: names(byType.priority ?? []),
      regions: names(byType.region ?? []),
      documentationTypes: names(byType.documentation_type ?? []),
      managersSG: managers.filter((m) => m.is_active !== false).map((m) => m.name).filter(Boolean),
      units,
    },
  }
}

export function catalogsFromCrm(snapshot: CrmCatalogSnapshot): Catalogs {
  return {
    ...emptyCatalogs(),
    sources: snapshot.sources,
    purposes: snapshot.purposes,
    stages: snapshot.stages,
    priorities: snapshot.priorities,
    regions: snapshot.regions,
    documentationTypes: snapshot.documentationTypes,
    managersSG: snapshot.managersSG,
    units: snapshot.units,
  }
}
