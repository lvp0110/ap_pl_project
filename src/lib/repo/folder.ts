import { buildWorkbookBuffer } from '../excel'
import { blankFilename, isBlankFilename, parseBlankText, parseCatalogsText, stringify, toBlankEnvelope, toCatalogsEnvelope } from './format'
import { loadOperator } from './operator'
import { StoreConflictError, type DataStore } from './types'
import type { Catalogs, Project } from '../../types'

type FsWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: 'desktop' | 'documents' | 'downloads'
  }) => Promise<FileSystemDirectoryHandle>
}

const CATALOGS_FILE = 'catalogs.json'
const REGISTRY_FILE = 'registry.xlsx'

export function canUseFolderPicker(): boolean {
  return typeof window !== 'undefined' && typeof (window as FsWindow).showDirectoryPicker === 'function'
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  const picker = (window as FsWindow).showDirectoryPicker
  if (!picker) throw new Error('Этот браузер не умеет писать в папку. Откройте Chrome или Edge.')
  return picker({ id: 'akufon-blanks', mode: 'readwrite', startIn: 'documents' })
}

export async function queryFolderPermission(
  handle: FileSystemDirectoryHandle,
  interactive: boolean,
): Promise<boolean> {
  const opts = { mode: 'readwrite' as const }
  const current = await handle.queryPermission(opts)
  if (current === 'granted') return true
  if (!interactive) return false
  const next = await handle.requestPermission(opts)
  return next === 'granted'
}

async function writeText(dir: FileSystemDirectoryHandle, name: string, text: string) {
  const file = await dir.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(text)
  await writable.close()
}

async function writeBytes(dir: FileSystemDirectoryHandle, name: string, data: ArrayBuffer) {
  const file = await dir.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(data)
  await writable.close()
}

async function readText(dir: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    const file = await dir.getFileHandle(name)
    return (await file.getFile()).text()
  } catch {
    return null
  }
}

async function listEntries(dir: FileSystemDirectoryHandle): Promise<FileSystemHandle[]> {
  const entries: FileSystemHandle[] = []
  const iterable = dir as FileSystemDirectoryHandle & {
    values?: () => AsyncIterable<FileSystemHandle>
  }
  if (!iterable.values) return entries
  for await (const entry of iterable.values()) entries.push(entry)
  return entries
}

export function createFolderStore(dir: FileSystemDirectoryHandle): DataStore {
  return {
    kind: 'folder',

    async load() {
      const entries = await listEntries(dir)
      const projects: Project[] = []
      for (const entry of entries) {
        if (entry.kind !== 'file' || !isBlankFilename(entry.name)) continue
        const text = await readText(dir, entry.name)
        if (!text) continue
        const idGuess = entry.name.replace(/^blank-/i, '').replace(/\.json$/i, '')
        const parsed = parseBlankText(text, idGuess)
        if (parsed) projects.push(parsed.project)
      }
      projects.sort((a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10) || a.id.localeCompare(b.id))

      const catalogsText = await readText(dir, CATALOGS_FILE)
      const catalogs = catalogsText ? parseCatalogsText(catalogsText) : null
      return { projects, catalogs }
    },

    async saveProject(project, opts) {
      const name = blankFilename(project.id)
      const existingText = await readText(dir, name)
      if (existingText && !opts?.overwrite) {
        const existing = parseBlankText(existingText, project.id)
        const expected = opts?.expectedUpdatedAt ?? ''
        if (existing && existing.updatedAt && existing.updatedAt !== expected) {
          throw new StoreConflictError(existing)
        }
      }
      const updatedAt = new Date().toISOString()
      const updatedBy = loadOperator()
      const envelope = toBlankEnvelope(project, updatedBy, updatedAt)
      await writeText(dir, name, stringify(envelope))
      return envelope.project
    },

    async deleteProject(id) {
      try {
        await dir.removeEntry(blankFilename(id))
      } catch {
        // файла могло не быть
      }
    },

    async saveCatalogs(catalogs) {
      await writeText(dir, CATALOGS_FILE, stringify(toCatalogsEnvelope(catalogs)))
    },

    async saveAll(projects, catalogs) {
      await this.saveCatalogs(catalogs)
      const keep = new Set(projects.map((p) => blankFilename(p.id)))
      for (const project of projects) {
        const updatedAt = project.updatedAt || new Date().toISOString()
        const updatedBy = project.updatedBy || loadOperator()
        await writeText(dir, blankFilename(project.id), stringify(toBlankEnvelope(project, updatedBy, updatedAt)))
      }
      const entries = await listEntries(dir)
      for (const entry of entries) {
        if (entry.kind === 'file' && isBlankFilename(entry.name) && !keep.has(entry.name)) {
          await dir.removeEntry(entry.name)
        }
      }
      const xlsx = await buildWorkbookBuffer(projects, catalogs)
      await writeBytes(dir, REGISTRY_FILE, xlsx)
    },
  }
}

export async function writeRegistryFile(
  dir: FileSystemDirectoryHandle,
  projects: Project[],
  catalogs: Catalogs,
) {
  const xlsx = await buildWorkbookBuffer(projects, catalogs)
  await writeBytes(dir, REGISTRY_FILE, xlsx)
}
