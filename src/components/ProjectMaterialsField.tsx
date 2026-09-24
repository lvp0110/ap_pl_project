import { useEffect, useMemo, useRef, useState } from 'react'
import { listBrands } from '../lib/api/brands'
import { listMaterials } from '../lib/api/materials'
import type { CrmOption, CrmProjectMaterial, CrmProjectMaterialValue } from '../lib/api/projectTypes'
import type { CrmMaterial } from '../lib/api/types'
import { loadSheetNotes, materialNote, saveSheetNotes } from '../lib/projects/sheetNotes'
import { Dropdown } from './Dropdown'

type Row = {
  key: string
  brand: string
  materialId: number
  quantity: number
  note: string
}

type Props = {
  value: CrmProjectMaterialValue[]
  saved: CrmProjectMaterial[]
  disabled: boolean
  onChange: (value: CrmProjectMaterialValue[]) => void
  onTotalsChange?: (value: number) => void
  notesKey?: number | string
}

const EMPTY_ROWS = 1

function signature(lines: CrmProjectMaterialValue[]): string {
  return lines.map((line) => `${line.material_id}:${line.quantity}`).join('|')
}

function emptyRow(): Row {
  return { key: crypto.randomUUID(), brand: '', materialId: 0, quantity: 0, note: '' }
}

function picked(rows: Row[]): CrmProjectMaterialValue[] {
  return rows
    .filter((row) => row.materialId > 0)
    .map((row) => ({ material_id: row.materialId, quantity: row.quantity }))
}

function seed(
  value: CrmProjectMaterialValue[],
  known: Map<number, CrmMaterial>,
  stored: Record<string, string>,
): Row[] {
  const rows: Row[] = value.map((line) => {
    const material = known.get(line.material_id)
    return {
      key: crypto.randomUUID(),
      brand: material?.brand.code ?? '',
      materialId: line.material_id,
      quantity: line.quantity,
      note: materialNote(stored, line.material_id, material?.comment ?? ''),
    }
  })
  while (rows.length < EMPTY_ROWS) rows.push(emptyRow())
  return rows
}

export function ProjectMaterialsField({ value, saved, disabled, onChange, onTotalsChange, notesKey }: Props) {
  const known = useMemo(
    () => new Map(saved.map((line) => [line.material.id, line.material])),
    [saved],
  )
  const [rows, setRows] = useState<Row[]>(() =>
    seed(value, known, notesKey === undefined ? {} : loadSheetNotes(notesKey).materials),
  )
  const [synced, setSynced] = useState<string>(() => signature(value))
  const [brands, setBrands] = useState<CrmOption[]>([])
  const [catalog, setCatalog] = useState<Record<string, CrmMaterial[]>>({})
  const requested = useRef(new Set<string>())

  useEffect(() => {
    let active = true
    listBrands()
      .then((options) => {
        if (active) setBrands(options)
      })
      .catch(() => {
        if (active) setBrands([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    for (const code of new Set(rows.map((row) => row.brand).filter(Boolean))) {
      if (requested.current.has(code)) continue
      requested.current.add(code)
      listMaterials(code)
        .then((items) => setCatalog((prev) => ({ ...prev, [code]: items })))
        .catch(() => setCatalog((prev) => ({ ...prev, [code]: [] })))
    }
  }, [rows])

  const incoming = signature(value)
  if (incoming !== synced) {
    setSynced(incoming)
    setRows(seed(value, known, notesKey === undefined ? {} : loadSheetNotes(notesKey).materials))
  }

  function persistNotes(next: Row[]) {
    if (notesKey === undefined) return
    const stored = loadSheetNotes(notesKey)
    const materials = { ...stored.materials }
    for (const row of next) {
      if (!row.materialId) continue
      materials[String(row.materialId)] = row.note
    }
    saveSheetNotes(notesKey, { ...stored, materials })
  }

  function apply(next: Row[]) {
    setRows(next)
    persistNotes(next)
    const after = signature(picked(next))
    if (after === signature(picked(rows))) return
    setSynced(after)
    onChange(picked(next))
  }

  function add() {
    setRows([...rows, emptyRow()])
  }

  function setGroupBrand(key: string, code: string) {
    const start = rows.findIndex((row) => row.key === key)
    if (start < 0) return
    const old = rows[start].brand
    let inGroup = true
    apply(
      rows.map((row, index) => {
        if (index < start) return row
        if (index > start && row.brand !== old) inGroup = false
        if (!inGroup) return row
        return { ...row, brand: code, materialId: 0, note: '' }
      }),
    )
  }

  function setMaterial(key: string, code: string) {
    const id = Number(code)
    apply(
      rows.map((row) => {
        if (row.key !== key) return row
        if (!(id > 0)) return { ...row, materialId: 0, note: '' }
        const material =
          (catalog[row.brand] ?? []).find((item) => item.id === id) ?? known.get(id)
        const stored = notesKey === undefined ? {} : loadSheetNotes(notesKey).materials
        return {
          ...row,
          materialId: id,
          note: row.note.trim() ? row.note : materialNote(stored, id, material?.comment ?? ''),
        }
      }),
    )
  }

  function setNote(key: string, note: string) {
    apply(rows.map((row) => (row.key === key ? { ...row, note } : row)))
  }

  function setQuantity(key: string, quantity: number) {
    apply(rows.map((row) => (row.key === key ? { ...row, quantity } : row)))
  }

  function remove(key: string) {
    const next = rows.filter((row) => row.key !== key)
    apply(next.length ? next : [emptyRow()])
  }

  function materialOf(row: Row): CrmMaterial | undefined {
    if (!row.materialId) return undefined
    const items = catalog[row.brand] ?? []
    const fromBrand = items.find((item) => item.id === row.materialId)
    if (fromBrand) return fromBrand
    const saved = known.get(row.materialId)
    if (saved) return saved
    for (const list of Object.values(catalog)) {
      const found = list.find((item) => item.id === row.materialId)
      if (found) return found
    }
    return undefined
  }

  useEffect(() => {
    if (!onTotalsChange) return
    let total = 0
    for (const row of rows) {
      if (!row.materialId || !row.quantity) continue
      const fromBrand = (catalog[row.brand] ?? []).find((item) => item.id === row.materialId)
      const savedLine = saved.find((line) => line.material.id === row.materialId)
      const price = fromBrand?.price ?? savedLine?.material.price ?? savedLine?.unit_price ?? 0
      total += price * row.quantity
    }
    onTotalsChange(total)
  }, [rows, catalog, saved, onTotalsChange])

  function optionsOf(row: Row): CrmOption[] {
    const taken = new Set(rows.filter((item) => item.key !== row.key).map((item) => item.materialId))
    const options = (catalog[row.brand] ?? [])
      .filter((item) => !taken.has(item.id))
      .map((item) => ({ code: String(item.id), name: item.name }))
    const current = materialOf(row)
    if (current && !options.some((option) => option.code === String(current.id))) {
      options.unshift({ code: String(current.id), name: current.name })
    }
    return options
  }

  return (
    <div className="project-materials">
      <table className="bi-grid bi-materials-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Ед. измерения</th>
            <th>Количество</th>
            <th>Цвет</th>
            <th>Примечание</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const material = materialOf(row)
            const options = optionsOf(row)
            const groupStart = index === 0 || row.brand !== rows[index - 1].brand
            return (
              <MaterialBlock
                key={row.key}
                row={row}
                brands={brands}
                material={material}
                options={options}
                catalog={catalog[row.brand]}
                disabled={disabled}
                groupStart={groupStart}
                onBrand={(code) => setGroupBrand(row.key, code)}
                onMaterial={(code) => setMaterial(row.key, code)}
                onQuantity={(quantity) => setQuantity(row.key, quantity)}
                onNote={(note) => setNote(row.key, note)}
                onRemove={() => remove(row.key)}
              />
            )
          })}
        </tbody>
      </table>

      <div className="project-materials-actions">
        <button type="button" className="ghost" disabled={disabled} onClick={add}>
          Добавить материал
        </button>
      </div>
    </div>
  )
}

function MaterialBlock({
  row,
  brands,
  material,
  options,
  catalog,
  disabled,
  groupStart,
  onBrand,
  onMaterial,
  onQuantity,
  onNote,
  onRemove,
}: {
  row: Row
  brands: CrmOption[]
  material: CrmMaterial | undefined
  options: CrmOption[]
  catalog: CrmMaterial[] | undefined
  disabled: boolean
  groupStart: boolean
  onBrand: (code: string) => void
  onMaterial: (code: string) => void
  onQuantity: (quantity: number) => void
  onNote: (note: string) => void
  onRemove: () => void
}) {
  return (
    <>
      {groupStart ? (
        <tr className="bi-mat-group">
          <td className="bi-fill cell-brand">
            <Dropdown
              value={row.brand}
              disabled={disabled}
              label="Бренд"
              placeholder={brands.length ? '' : 'загрузка…'}
              options={brandChoices(brands, row.brand).map((option) => ({
                value: option.code,
                label: option.name,
              }))}
              onChange={onBrand}
            />
          </td>
          <td />
          <td />
          <td />
          <td />
        </tr>
      ) : null}
      <tr>
        <td className="bi-fill cell-material">
          <div className="bi-mat-name">
            <Dropdown
              value={row.materialId ? String(row.materialId) : ''}
              disabled={disabled || !row.brand}
              label="Материал"
              placeholder={materialHint(row.brand, catalog, options.length)}
              options={options.map((option) => ({ value: option.code, label: option.name }))}
              onChange={onMaterial}
            />
            <button type="button" className="bi-mat-remove" disabled={disabled} onClick={onRemove} aria-label="Убрать">
              ×
            </button>
          </div>
        </td>
        <td>{material?.unit ?? ''}</td>
        <td className="bi-fill cell-qty">
          <input
            className="quantity"
            type="number"
            min="0"
            step="0.01"
            value={row.quantity || ''}
            disabled={disabled}
            onChange={(e) => onQuantity(Number(e.target.value))}
          />
        </td>
        <td className="bi-fill" />
        <td className="bi-fill">
          <input
            value={row.note}
            disabled={disabled}
            aria-label="Примечание"
            onChange={(e) => onNote(e.target.value)}
          />
        </td>
      </tr>
    </>
  )
}

function brandChoices(brands: CrmOption[], current: string): CrmOption[] {
  if (!current || brands.some((option) => option.code === current)) return brands
  return [{ code: current, name: current }, ...brands]
}

function materialHint(brand: string, items: CrmMaterial[] | undefined, count: number): string {
  if (!brand) return ''
  if (!items) return 'загрузка…'
  if (!items.length) return 'нет материалов'
  if (!count) return 'всё выбрано'
  return ''
}
