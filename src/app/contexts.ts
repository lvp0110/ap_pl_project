import { createContext } from 'react'
import type { CrmProject } from '../lib/api/projectTypes'
import type { AuthUser, CrmReferenceType, CrmReferenceValue, CrmSgManager } from '../lib/api/types'
import type { ReferenceMap } from '../lib/projects/view'
import type { Catalogs, PriceItem, Project } from '../types'

export type Draft = { project: Project; isNew: boolean; key: string }

export type CrmState = {
  user: AuthUser | null
  ready: boolean
  catalogs: Catalogs
  references: ReferenceMap
  sgManagers: CrmSgManager[]
  projects: CrmProject[]
  busy: boolean
  notice: string
  setNotice: (notice: string) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  reload: () => Promise<void>
  rememberProject: (project: CrmProject) => void
  addReference: (key: keyof Catalogs, name: string) => Promise<void>
  renameReference: (type: CrmReferenceType, value: CrmReferenceValue, name: string) => Promise<void>
  archiveReferenceValue: (type: CrmReferenceType, value: CrmReferenceValue) => Promise<void>
  addSgManager: (name: string, email: string) => Promise<void>
  renameSgManager: (manager: CrmSgManager, name: string, email: string) => Promise<void>
  archiveSgManagerValue: (manager: CrmSgManager) => Promise<void>
}

export type BlanksState = {
  projects: Project[]
  price: PriceItem[]
  operator: string
  draft: Draft | null
  setOperator: (name: string) => void
  openBlank: (project: Project) => void
  openNewBlank: () => void
  changeDraft: (project: Project) => void
  saveDraft: () => void
  deleteDraft: () => void
  closeDraft: () => void
  importPrice: (file: File) => Promise<string>
  exportPrice: () => Promise<string>
}

export const CrmContext = createContext<CrmState | null>(null)
export const BlanksContext = createContext<BlanksState | null>(null)
