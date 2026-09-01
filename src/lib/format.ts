import { isHighProbability, validateBlank } from './validate'
import type { Catalogs, Project } from '../types'

export function formatDateParts(day: string, month: string, year: string): string {
  if (!day && !month && !year) return '—'
  return [day, month, year].filter(Boolean).join(' ')
}

export type DashboardStats = {
  total: number
  complete: number
  incomplete: number
  byStage: Record<string, number>
  bySource: Record<string, number>
  attention: Project[]
  tender: number
}

export function computeStats(projects: Project[], catalogs: Catalogs): DashboardStats {
  const byStage: Record<string, number> = {}
  for (const s of catalogs.stages) byStage[s] = 0
  const bySource: Record<string, number> = {}
  for (const s of catalogs.sources) bySource[s] = 0

  let complete = 0
  let tender = 0
  for (const p of projects) {
    if (p.stage) byStage[p.stage] = (byStage[p.stage] ?? 0) + 1
    if (p.source) bySource[p.source] = (bySource[p.source] ?? 0) + 1
    if (validateBlank(p).length === 0) complete += 1
    if (p.stage === 'Тендер / закупка') tender += 1
  }

  return {
    total: projects.length,
    complete,
    incomplete: projects.length - complete,
    byStage,
    bySource,
    tender,
    attention: projects.filter(isHighProbability),
  }
}
