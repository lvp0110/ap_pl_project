import { DEFAULT_CATALOGS, emptyProject, MATERIAL_ROWS, emptyMaterial } from '../data/defaults'
import type { Catalogs, Project } from '../types'

const KEY = 'akufon-ecophon-blank-v1'

type Stored = {
  projects: Project[]
  catalogs: Catalogs
}

function normalize(raw: Partial<Project>, fallbackId: string): Project {
  const base = emptyProject(raw.id || fallbackId)
  const materials = Array.from({ length: MATERIAL_ROWS }, (_, i) => ({
    ...emptyMaterial(),
    ...(raw.materials?.[i] ?? {}),
  }))
  return {
    ...base,
    ...raw,
    id: raw.id || fallbackId,
    contacts: {
      customer: { ...base.contacts.customer, ...raw.contacts?.customer },
      designer: { ...base.contacts.designer, ...raw.contacts?.designer },
      gc: { ...base.contacts.gc, ...raw.contacts?.gc },
      sub: { ...base.contacts.sub, ...raw.contacts?.sub },
    },
    materials,
    probability: raw.probability ?? '',
  }
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { projects: [], catalogs: structuredClone(DEFAULT_CATALOGS) }
    const parsed = JSON.parse(raw) as Partial<Stored>
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects.map((p, i) => normalize(p, String(i + 1)))
      : []
    return {
      projects,
      catalogs: { ...structuredClone(DEFAULT_CATALOGS), ...parsed.catalogs },
    }
  } catch {
    return { projects: [], catalogs: structuredClone(DEFAULT_CATALOGS) }
  }
}

function write(data: Stored) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function loadState(): Stored {
  return read()
}

export function saveProjects(projects: Project[]) {
  write({ ...read(), projects })
}

export function saveCatalogs(catalogs: Catalogs) {
  write({ ...read(), catalogs })
}

export function nextId(projects: Project[]): string {
  const nums = projects
    .map((p) => Number.parseInt(p.id, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return String(max + 1)
}
