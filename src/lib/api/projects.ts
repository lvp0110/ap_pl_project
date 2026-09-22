import { apiRequest, asList } from './client'
import {
  PROJECT_STATUS_DRAFT,
  type CrmFilter,
  type CrmOption,
  type CrmProject,
  type CrmProjectForm,
  type CrmProjectValues,
} from './projectTypes'
import type { CrmReferenceValue, CrmSgManager } from './types'

export async function loadProjectForm(params: Record<string, string> = {}): Promise<CrmProjectForm> {
  const query = new URLSearchParams(params).toString()
  return apiRequest<CrmProjectForm>(`/crm/projects/form${query ? `?${query}` : ''}`)
}

export async function loadFieldOptions(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<CrmOption[]> {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
  ).toString()
  const data = await apiRequest<unknown>(`${endpoint}${query ? `?${query}` : ''}`)
  return asList(data).map(toOption).filter((option) => option.code !== '')
}

function toOption(row: unknown): CrmOption {
  const item = row as Partial<CrmOption> & Partial<CrmReferenceValue> & Partial<CrmSgManager> & { label?: string }
  const code = item.code ?? (item.id === undefined ? '' : String(item.id))
  return { code: String(code), name: item.name || item.label || '' }
}

export async function loadProjectFilters(): Promise<CrmFilter[]> {
  const data = await apiRequest<unknown>('/crm/projects/filters')
  return asList(data).filter((row): row is CrmFilter => Boolean(row) && typeof row === 'object' && Array.isArray((row as CrmFilter).options) && (row as CrmFilter).options.length > 0)
}

export async function draftStatusCode(): Promise<string> {
  try {
    const status = (await loadProjectFilters()).find((filter) => filter.code === 'status')
    const match = status?.options.find(
      (option) => option.code.toLowerCase() === PROJECT_STATUS_DRAFT || /черновик/i.test(option.name),
    )
    if (match) return match.code
  } catch {
    /* фильтры недоступны — оставляем swagger/ContentStatus */
  }
  return PROJECT_STATUS_DRAFT
}

export async function listProjects(params: Record<string, string> = {}): Promise<CrmProject[]> {
  const query = new URLSearchParams(params).toString()
  const data = await apiRequest<unknown>(`/crm/projects${query ? `?${query}` : ''}`)
  return asList(data).filter((row): row is CrmProject => Boolean(row) && typeof row === 'object')
}

export async function getProject(id: number): Promise<CrmProject> {
  return apiRequest<CrmProject>(`/crm/projects/${id}`)
}

export async function createProject(values: CrmProjectValues, files: File[] = []): Promise<CrmProject> {
  return apiRequest<CrmProject>('/crm/projects', {
    method: 'POST',
    ...payload(values, files),
  })
}

export async function updateProject(
  id: number,
  values: CrmProjectValues,
  files: File[] = [],
): Promise<CrmProject> {
  return apiRequest<CrmProject>(`/crm/projects/${id}`, {
    method: 'PUT',
    ...payload(values, files),
  })
}

function payload(values: CrmProjectValues, files: File[]): RequestInit {
  if (!files.length) return { body: JSON.stringify(values) }
  const form = new FormData()
  form.append('payload', JSON.stringify(values))
  for (const file of files) form.append('documents', file)
  return { body: form }
}
