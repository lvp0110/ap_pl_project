import type { Catalogs, Project } from '../../types'

export const BLANK_SCHEMA = 'akufon-blank'
export const CATALOGS_SCHEMA = 'akufon-catalogs'
export const BUNDLE_SCHEMA = 'akufon-crm-bundle'
export const FORMAT_VERSION = 1

export type BlankEnvelope = {
  schema: typeof BLANK_SCHEMA
  version: number
  updatedAt: string
  updatedBy: string
  project: Project
}

export type CatalogsEnvelope = {
  schema: typeof CATALOGS_SCHEMA
  version: number
  updatedAt: string
  catalogs: Catalogs
}

export type BundleEnvelope = {
  schema: typeof BUNDLE_SCHEMA
  version: number
  exportedAt: string
  catalogs: Catalogs
  projects: Project[]
}

/**
 * Контракт хранилища. Сейчас — файлы в выбранной папке.
 * Позже тот же контракт закрывает свой бэкенд, форма бланка не меняется.
 *
 * HTTP-набросок:
 *   GET    /api/blanks
 *   GET    /api/blanks/:id
 *   PUT    /api/blanks/:id     If-Match: updatedAt → 409 при конфликте
 *   DELETE /api/blanks/:id
 *   GET    /api/catalogs
 *   PUT    /api/catalogs
 */
export type DataStore = {
  kind: 'folder' | 'http'
  load(): Promise<{ projects: Project[]; catalogs: Catalogs | null }>
  saveProject(project: Project, opts?: { overwrite?: boolean; expectedUpdatedAt?: string }): Promise<Project>
  deleteProject(id: string): Promise<void>
  saveCatalogs(catalogs: Catalogs): Promise<void>
  saveAll(projects: Project[], catalogs: Catalogs): Promise<void>
}

export class StoreConflictError extends Error {
  readonly existing: BlankEnvelope

  constructor(existing: BlankEnvelope) {
    super('Файл бланка уже изменён в хранилище')
    this.name = 'StoreConflictError'
    this.existing = existing
  }
}
