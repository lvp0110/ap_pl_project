import { useEffect, useMemo, useRef, useState } from 'react'
import { listMaterials } from '../lib/api/materials'
import { loadFieldOptions } from '../lib/api/projects'
import type { CrmOption, CrmProjectMaterial, CrmProjectMaterialValue } from '../lib/api/projectTypes'
import type { CrmMaterial } from '../lib/api/types'
import { formatMoney } from '../lib/projects/view'
import { OptionCombobox } from './OptionCombobox'

const BRANDS_ENDPOINT = '/crm/project-options/brands'

type Row = {
  key: string
  brand: string
  materialId: number
  quantity: number
}

type Props = {
  value: CrmProjectMaterialValue[]
  brand: string
  saved: CrmProjectMaterial[]
  disabled: boolean
  onChange: (value: CrmProjectMaterialValue[]) => void
}

function signature(lines: CrmProjectMaterialValue[]): string {
  return lines.map((line) => `${line.material_id}:${line.quantity}`).join('|')
}

function picked(rows: Row[]): CrmProjectMaterialValue[] {
  return rows
    .filter((row) => row.materialId > 0)
    .map((row) => ({ material_id: row.materialId, quantity: row.quantity }))
}

function seed(value: CrmProjectMaterialValue[], known: Map<number, CrmMaterial>): Row[] {
  return value.map((line) => ({
    key: crypto.randomUUID(),
    brand: known.get(line.material_id)?.brand.code ?? '',
    materialId: line.material_id,
    quantity: line.quantity,
  }))
}

export function ProjectMaterialsField({ value, brand, saved, disabled, onChange }: Props) {
  const known = useMemo(
    () => new Map(saved.map((line) => [line.material.id, line.material])),
    [saved],
  )

  const [rows, setRows] = useState<Row[]>(() => seed(value, known))
  const [synced, setSynced] = useState<string>(() => signature(value))
  const [brands, setBrands] = useState<CrmOption[]>([])
  const [catalog, setCatalog] = useState<Record<string, CrmMaterial[]>>({})
  const requested = useRef(new Set<string>())

  useEffect(() => {
    let active = true
    loadFieldOptions(BRANDS_ENDPOINT)
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
    setRows(seed(value, known))
  }

  function apply(next: Row[]) {
    setRows(next)
    const after = signature(picked(next))
    if (after === signature(picked(rows))) return
    setSynced(after)
    onChange(picked(next))
  }

  function add() {
    setRows([...rows, { key: crypto.randomUUID(), brand, materialId: 0, quantity: 1 }])
  }

  function setBrand(key: string, code: string) {
    apply(rows.map((row) => (row.key === key ? { ...row, brand: code, materialId: 0 } : row)))
  }

  function setMaterial(key: string, code: string) {
    const id = Number(code)
    apply(rows.map((row) => (row.key === key ? { ...row, materialId: id > 0 ? id : 0 } : row)))
  }

  function setQuantity(key: string, quantity: number) {
    apply(rows.map((row) => (row.key === key ? { ...row, quantity } : row)))
  }

  function remove(key: string) {
    apply(rows.filter((row) => row.key !== key))
  }

  function materialOf(row: Row): CrmMaterial | undefined {
    if (!row.materialId) return undefined
    const items = catalog[row.brand] ?? []
    return items.find((item) => item.id === row.materialId) ?? known.get(row.materialId)
  }

  function optionsOf(row: Row): CrmOption[] {
    const taken = new Set(rows.filter((item) => item.key !== row.key).map((item) => item.materialId))
    return (catalog[row.brand] ?? [])
      .filter((item) => !taken.has(item.id))
      .map((item) => ({ code: String(item.id), name: item.name }))
  }

  const total = rows.reduce((sum, row) => {
    const material = materialOf(row)
    return material ? sum + material.price * row.quantity : sum
  }, 0)

  return (
    <div className="project-materials">
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Бренд</th>
                <th>Материал</th>
                <th>Артикул</th>
                <th>Комментарий</th>
                <th>Кол-во</th>
                <th>Ед.</th>
                <th>Цена</th>
                <th>Сумма</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const material = materialOf(row)
                const options = optionsOf(row)
                return (
                  <tr key={row.key}>
                    <td className="cell-brand">
                      <OptionCombobox
                        options={brands}
                        value={row.brand}
                        disabled={disabled}
                        placeholder={brands.length ? 'бренд' : 'загрузка…'}
                        onChange={(code) => setBrand(row.key, code)}
                      />
                    </td>
                    <td className="cell-material">
                      <OptionCombobox
                        options={options}
                        value={row.materialId ? String(row.materialId) : ''}
                        disabled={disabled || !row.brand}
                        placeholder={materialHint(row.brand, catalog[row.brand], options.length)}
                        onChange={(code) => setMaterial(row.key, code)}
                      />
                    </td>
                    <td>{material?.article || '—'}</td>
                    <td>{material?.comment || '—'}</td>
                    <td>
                      <input
                        className="quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.quantity || ''}
                        disabled={disabled}
                        placeholder="кол-во"
                        onChange={(e) => setQuantity(row.key, Number(e.target.value))}
                      />
                    </td>
                    <td>{material?.unit ?? '—'}</td>
                    <td>{material ? formatMoney(material.price) : '—'}</td>
                    <td>{material ? formatMoney(material.price * row.quantity) : '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="ghost"
                        disabled={disabled}
                        onClick={() => remove(row.key)}
                      >
                        Убрать
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>Итого</td>
                <td>{formatMoney(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="project-materials-actions">
        <button type="button" className="ghost" disabled={disabled} onClick={add}>
          Добавить материал
        </button>
      </div>
    </div>
  )
}

function materialHint(brand: string, items: CrmMaterial[] | undefined, count: number): string {
  if (!brand) return 'сначала выберите бренд'
  if (!items) return 'загрузка…'
  if (!items.length) return 'у бренда нет материалов'
  if (!count) return 'всё уже выбрано'
  return 'начните вводить'
}
