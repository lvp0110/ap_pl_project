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
