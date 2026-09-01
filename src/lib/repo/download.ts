import type { Catalogs, Project } from '../../types'
import { parseImportedJson, stringify, toBundleEnvelope } from './format'

export function downloadJsonBundle(projects: Project[], catalogs: Catalogs) {
  const blob = new Blob([stringify(toBundleEnvelope(projects, catalogs))], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `akufon-crm-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importJsonFiles(files: FileList | File[]): Promise<{
  projects: Project[]
  catalogs?: Catalogs
}> {
  const projects: Project[] = []
  let catalogs: Catalogs | undefined
  for (const file of Array.from(files)) {
    const parsed = parseImportedJson(await file.text())
    projects.push(...parsed.projects)
    if (parsed.catalogs) catalogs = parsed.catalogs
  }
  const byId = new Map<string, Project>()
  for (const project of projects) byId.set(project.id, project)
  return { projects: [...byId.values()], catalogs }
}
