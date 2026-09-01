import type { Catalogs, Project } from '../../types'
import { canUseFolderPicker, createFolderStore, pickDirectory, queryFolderPermission, writeRegistryFile } from './folder'
import { clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle } from './idb'
import type { DataStore } from './types'

export { canUseFolderPicker }

type FolderSessionState = {
  connected: boolean
  name: string
}

let directory: FileSystemDirectoryHandle | null = null
let pendingHandle: FileSystemDirectoryHandle | null = null
let store: DataStore | null = null

export function getFolderSession(): FolderSessionState & { needsGesture: boolean } {
  return {
    connected: Boolean(directory && store),
    name: directory?.name ?? pendingHandle?.name ?? '',
    needsGesture: Boolean(pendingHandle && !directory),
  }
}

export function isFolderConnected(): boolean {
  return Boolean(directory && store)
}

function attach(handle: FileSystemDirectoryHandle) {
  directory = handle
  pendingHandle = null
  store = createFolderStore(handle)
}

function requireStore(): DataStore {
  if (!store) throw new Error('Общая папка не подключена')
  return store
}

export async function restoreFolderSession() {
  if (!canUseFolderPicker()) return getFolderSession()
  const handle = await loadDirectoryHandle()
  if (!handle) return getFolderSession()
  const allowed = await queryFolderPermission(handle, false)
  if (!allowed) {
    pendingHandle = handle
    return getFolderSession()
  }
  attach(handle)
  return getFolderSession()
}

export async function resumeSharedFolder() {
  const handle = pendingHandle ?? (await loadDirectoryHandle())
  if (!handle) throw new Error('Папка ещё не выбиралась')
  const allowed = await queryFolderPermission(handle, true)
  if (!allowed) throw new Error('Нет доступа на запись в выбранную папку')
  await saveDirectoryHandle(handle)
  attach(handle)
  return store!.load()
}

export async function connectSharedFolder(current: {
  projects: Project[]
  catalogs: Catalogs
}): Promise<{
  name: string
  seeded: boolean
  projects: Project[]
  catalogs: Catalogs | null
}> {
  const handle = await pickDirectory()
  const allowed = await queryFolderPermission(handle, true)
  if (!allowed) throw new Error('Нет доступа на запись в выбранную папку')
  await saveDirectoryHandle(handle)
  attach(handle)
  const loaded = await store!.load()
  const empty = loaded.projects.length === 0 && !loaded.catalogs
  if (empty) {
    await store!.saveAll(current.projects, current.catalogs)
    return { name: handle.name, seeded: true, projects: current.projects, catalogs: current.catalogs }
  }
  return {
    name: handle.name,
    seeded: false,
    projects: loaded.projects,
    catalogs: loaded.catalogs,
  }
}

export async function disconnectSharedFolder() {
  directory = null
  pendingHandle = null
  store = null
  await clearDirectoryHandle()
}

export async function loadSharedFolder() {
  return requireStore().load()
}

export async function saveProjectToFolder(
  project: Project,
  opts?: { overwrite?: boolean; expectedUpdatedAt?: string },
) {
  return requireStore().saveProject(project, opts)
}

export async function deleteProjectFromFolder(id: string) {
  await requireStore().deleteProject(id)
}

export async function saveCatalogsToFolder(catalogs: Catalogs) {
  await requireStore().saveCatalogs(catalogs)
}

export async function writeAllToFolder(projects: Project[], catalogs: Catalogs) {
  await requireStore().saveAll(projects, catalogs)
}

export async function writeExcelSnapshot(projects: Project[], catalogs: Catalogs) {
  if (!directory) throw new Error('Общая папка не подключена')
  await writeRegistryFile(directory, projects, catalogs)
}

export { StoreConflictError } from './types'
