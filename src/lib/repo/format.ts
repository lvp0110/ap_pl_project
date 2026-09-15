import { normalizeProject } from '../storage'
import type { Catalogs, Project } from '../../types'
import {
  BLANK_SCHEMA,
  BUNDLE_SCHEMA,
  FORMAT_VERSION,
  type BlankEnvelope,
  type BundleEnvelope,
} from './types'

export function toBlankEnvelope(project: Project, updatedBy: string, updatedAt = new Date().toISOString()): BlankEnvelope {
  const stamped: Project = { ...project, updatedAt, updatedBy }
  return {
    schema: BLANK_SCHEMA,
    version: FORMAT_VERSION,
    updatedAt,
    updatedBy,
    project: stamped,
  }
}

export function toBundleEnvelope(projects: Project[], catalogs: Catalogs): BundleEnvelope {
  return {
    schema: BUNDLE_SCHEMA,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    catalogs,
    projects,
  }
}

export function stringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseBlankText(text: string, fallbackId: string): BlankEnvelope | null {
  try {
    const raw = JSON.parse(text) as unknown
    if (!isRecord(raw)) return null

    if (raw.schema === BLANK_SCHEMA && isRecord(raw.project)) {
      const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : ''
      const updatedBy = typeof raw.updatedBy === 'string' ? raw.updatedBy : ''
      const project = normalizeProject(raw.project as Partial<Project>, fallbackId)
      return {
        schema: BLANK_SCHEMA,
        version: typeof raw.version === 'number' ? raw.version : FORMAT_VERSION,
        updatedAt: updatedAt || project.updatedAt,
        updatedBy: updatedBy || project.updatedBy,
        project: {
          ...project,
          updatedAt: updatedAt || project.updatedAt,
          updatedBy: updatedBy || project.updatedBy,
        },
      }
    }

    if ('name' in raw || 'id' in raw || 'materials' in raw) {
      const project = normalizeProject(raw as Partial<Project>, fallbackId)
      return toBlankEnvelope(project, project.updatedBy, project.updatedAt || new Date().toISOString())
    }
  } catch {
    return null
  }
  return null
}

export function parseImportedJson(text: string): { projects: Project[] } {
  const raw = JSON.parse(text) as unknown
  if (!isRecord(raw)) return { projects: [] }

  if (raw.schema === BUNDLE_SCHEMA && Array.isArray(raw.projects)) {
    const projects = (raw.projects as Partial<Project>[]).map((p, i) => normalizeProject(p, String(i + 1)))
    return { projects }
  }

  const blank = parseBlankText(text, '1')
  if (blank) return { projects: [blank.project] }

  return { projects: [] }
}
