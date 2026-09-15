import { emptyProject, MATERIAL_ROWS, emptyMaterial } from '../data/defaults'
import type { PriceItem, Project } from '../types'

const KEY = 'akufon-ecophon-blank-v1'
const PRICE_KEY = 'akufon-ecophon-price-v1'

type Stored = {
  projects: Project[]
}

export function normalizeProject(raw: Partial<Project>, fallbackId: string): Project {
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
    updatedAt: raw.updatedAt ?? '',
    updatedBy: raw.updatedBy ?? '',
  }
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { projects: [] }
    const parsed = JSON.parse(raw) as Partial<Stored>
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects.map((p, i) => normalizeProject(p, String(i + 1)))
      : []
    return { projects }
  } catch {
    return { projects: [] }
  }
}

function write(data: Stored) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function loadState(): Stored {
  return read()
}

export function saveProjects(projects: Project[]) {
  write({ projects })
}

export function loadPriceList(): PriceItem[] {
  try {
    const raw = localStorage.getItem(PRICE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isPriceItem) : []
  } catch {
    return []
  }
}

export function savePriceList(items: PriceItem[]) {
  localStorage.setItem(PRICE_KEY, JSON.stringify(items))
}

function isPriceItem(value: unknown): value is PriceItem {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<PriceItem>
  return typeof row.name === 'string' && typeof row.price === 'number'
}

export function nextId(projects: Project[]): string {
  const nums = projects
    .map((p) => Number.parseInt(p.id, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return String(max + 1)
}
