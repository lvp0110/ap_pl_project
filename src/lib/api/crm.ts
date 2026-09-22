import { emptyCatalogs } from '../../data/defaults'
import type { Catalogs } from '../../types'
import { apiRequest, asList, ApiError } from './client'
import { listMaterials } from './materials'
import {
  CRM_REFERENCE_TYPES,
  type AuthUser,
  type CrmCatalogSnapshot,
  type CrmMaterial,
  type CrmReferenceType,
  type CrmReferenceValue,
  type CrmSgManager,
  type CrmSnapshot,
  type LoginResponse,
} from './types'

export const CRM_BRAND = (import.meta.env.VITE_CRM_BRAND || 'ecophon').trim() || 'ecophon'

export function emptyReferences(): Record<CrmReferenceType, CrmReferenceValue[]> {
  return {
    information_source: [],
    segment: [],
    project_stage: [],
    priority: [],
    documentation_type: [],
    region: [],
    brand_support_status: [],
  }
}

export function activeReferences(values: CrmReferenceValue[]): CrmReferenceValue[] {
  return values
    .filter((v) => v.is_active !== false && v.name)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ru'))
}

function names(values: CrmReferenceValue[]): string[] {
  return activeReferences(values).map((v) => v.name)
}

export function userDisplayName(user: AuthUser): string {
  return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim()
}

async function readUser(data: unknown): Promise<AuthUser> {
  if (data && typeof data === 'object' && 'user' in data) {
    const nested = (data as LoginResponse).user
    if (nested) return nested
  }
  return data as AuthUser
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const body = JSON.stringify({ email, password })
  try {
    return await readUser(await apiRequest<LoginResponse | AuthUser>('/auth/login', { method: 'POST', body }))
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      return await readUser(await apiRequest<LoginResponse | AuthUser>('/login', { method: 'POST', body }))
    }
    throw err
  }
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

export async function listReferences(
  type: CrmReferenceType,
  brandCode?: string,
): Promise<CrmReferenceValue[]> {
  const params = new URLSearchParams()
  const brand = type === 'brand_support_status' ? brandCode || CRM_BRAND : brandCode
  if (brand) params.set('brand_code', brand)
  const query = params.toString()
  const data = await apiRequest<unknown>(`/crm/references/${type}${query ? `?${query}` : ''}`)
  return asList(data).filter((row): row is CrmReferenceValue => Boolean(row) && typeof row === 'object')
}

export async function listSgManagers(): Promise<CrmSgManager[]> {
  const data = await apiRequest<unknown>('/crm/sg-managers')
  return asList(data).filter((row): row is CrmSgManager => Boolean(row) && typeof row === 'object')
}

export async function createReference(
  type: CrmReferenceType,
  name: string,
  sortOrder: number,
): Promise<void> {
  const payload: Record<string, unknown> = { name, sort_order: sortOrder, is_active: true }
  if (type === 'brand_support_status') payload.brand_codes = [CRM_BRAND]
  await apiRequest(`/crm/references/${type}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateReference(type: CrmReferenceType, value: CrmReferenceValue, name: string): Promise<void> {
  await apiRequest(`/crm/references/${type}/${value.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, sort_order: value.sort_order, is_active: true }),
  })
}

export async function archiveReference(type: CrmReferenceType, id: number): Promise<void> {
  await apiRequest(`/crm/references/${type}/${id}`, { method: 'DELETE' })
}

export async function createSgManager(name: string, email: string): Promise<void> {
  await apiRequest('/crm/sg-managers', {
    method: 'POST',
    body: JSON.stringify({ name, email, is_active: true, region_ids: [] }),
  })
}

export async function updateSgManager(manager: CrmSgManager, name: string, email: string): Promise<void> {
  await apiRequest(`/crm/sg-managers/${manager.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name,
      email,
      is_active: true,
      region_ids: manager.regions.map((r) => r.id),
    }),
  })
}

export async function archiveSgManager(id: number): Promise<void> {
  await apiRequest(`/crm/sg-managers/${id}`, { method: 'DELETE' })
}

export async function loadCrmCatalogs(): Promise<CrmSnapshot> {
  let referenceFailures = 0
  const settled = await Promise.allSettled([
    Promise.all(
      CRM_REFERENCE_TYPES.map((type) =>
        listReferences(type)
          .catch(() => {
            referenceFailures += 1
            return [] as CrmReferenceValue[]
          })
          .then((rows) => [type, rows] as const),
      ),
    ),
    listMaterials(CRM_BRAND).catch(() => [] as CrmMaterial[]),
    listSgManagers().catch(() => [] as CrmSgManager[]),
    import('./projects').then((mod) => mod.loadFieldOptions('/crm/project-options/employees').catch(() => [])),
  ])

  const refs =
    settled[0].status === 'fulfilled' ? settled[0].value : CRM_REFERENCE_TYPES.map((type) => [type, []] as const)
  const materials = settled[1].status === 'fulfilled' ? settled[1].value : []
  const managers = settled[2].status === 'fulfilled' ? settled[2].value : []
  const employees = settled[3].status === 'fulfilled' ? settled[3].value : []

  if (referenceFailures === CRM_REFERENCE_TYPES.length) {
    throw new Error('Не удалось загрузить справочники CRM. Проверьте сессию и GET /crm/references/{type}.')
  }

  const byType = { ...emptyReferences(), ...Object.fromEntries(refs) }
  const units = [...new Set(materials.map((m) => m.unit).filter(Boolean))]
  const activeManagers = managers.filter((m) => m.is_active !== false)
  return {
    materials,
    references: byType,
    sgManagers: activeManagers,
    catalogs: {
      sources: names(byType.information_source ?? []),
      purposes: names(byType.segment ?? []),
      stages: names(byType.project_stage ?? []),
      priorities: names(byType.priority ?? []),
      regions: names(byType.region ?? []),
      documentationTypes: names(byType.documentation_type ?? []),
      managersSG: activeManagers.map((m) => m.name).filter(Boolean),
      managersAG: employees.map((item) => item.name).filter(Boolean),
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
    managersAG: snapshot.managersAG,
    units: snapshot.units,
  }
}
