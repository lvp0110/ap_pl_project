import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BlanksContext, type BlanksState, type Draft } from './contexts'
import { emptyProject } from '../data/defaults'
import { exportPriceWorkbook, importPriceWorkbook } from '../lib/excel'
import { loadOperator, saveOperator } from '../lib/repo/operator'
import { loadPriceList, loadState, nextId, savePriceList, saveProjects } from '../lib/storage'
import type { Project } from '../types'

export function BlanksProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => loadState().projects)
  const [price, setPrice] = useState(loadPriceList)
  const [operator, setOperatorState] = useState(loadOperator)
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => saveProjects(projects), [projects])
  useEffect(() => savePriceList(price), [price])

  const setOperator = useCallback((name: string) => {
    setOperatorState(name)
    saveOperator(name)
  }, [])

  const value = useMemo<BlanksState>(
    () => ({
      projects,
      price,
      operator,
      draft,
      setOperator,

      openBlank(project) {
        const copy = structuredClone(project)
        setDraft({ isNew: false, key: project.id, project: copy, origin: structuredClone(copy) })
      },

      openNewBlank() {
        const id = nextId(projects)
        const project = emptyProject(id)
        setDraft({ isNew: true, key: id, project, origin: structuredClone(project) })
      },

      changeDraft(project) {
        setDraft((prev) => (prev ? { ...prev, project } : prev))
      },

      saveDraft() {
        if (!draft) return
        const prepared: Project = {
          ...draft.project,
          name: draft.project.name.trim(),
          id: draft.project.id.trim() || nextId(projects),
          updatedAt: new Date().toISOString(),
          updatedBy: operator,
        }
        setProjects((prev) => {
          if (draft.isNew && !prev.some((p) => p.id === prepared.id)) return [...prev, prepared]
          return prev.map((p) => (p.id === draft.key ? prepared : p))
        })
        setDraft(null)
      },

      deleteDraft() {
        if (!draft || draft.isNew) return
        setProjects((prev) => prev.filter((p) => p.id !== draft.key))
        setDraft(null)
      },

      closeDraft() {
        setDraft(null)
      },

      async importPrice(file) {
        const imported = await importPriceWorkbook(file)
        if (!imported.length) return 'В файле нет строк прайса'
        setPrice(imported)
        return `Загружен прайс: ${imported.length} позиций. В бланке можно выбирать строки по артикулу.`
      },

      async exportPrice() {
        if (!price.length) return 'Сначала загрузите прайс Excel'
        await exportPriceWorkbook(price)
        return 'Прайс Excel сохранён'
      },
    }),
    [projects, price, operator, draft, setOperator],
  )

  return <BlanksContext.Provider value={value}>{children}</BlanksContext.Provider>
}
