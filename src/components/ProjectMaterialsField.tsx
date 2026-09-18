import { useEffect, useState } from 'react'
import { listMaterials } from '../lib/api/materials'
import type { CrmProjectMaterialValue } from '../lib/api/projectTypes'
import type { CrmMaterial } from '../lib/api/types'
import { formatMoney } from '../lib/projects/view'
import { OptionCombobox } from './OptionCombobox'

type Props = {
  value: CrmProjectMaterialValue[]
  brand: string
  disabled: boolean
  onChange: (value: CrmProjectMaterialValue[]) => void
}

type Loaded = {
  brand: string
  materials: CrmMaterial[]
}

export function ProjectMaterialsField({ value, brand, disabled, onChange }: Props) {
  const [loaded, setLoaded] = useState<Loaded>({ brand: '', materials: [] })
  const ready = Boolean(brand) && loaded.brand === brand
  const catalog = ready ? loaded.materials : []

  useEffect(() => {
    if (!brand) return
    let active = true
    listMaterials(brand)
      .then((rows) => {
        if (active) setLoaded({ brand, materials: rows })
      })
      .catch(() => {
        if (active) setLoaded({ brand, materials: [] })
      })
    return () => {
      active = false
    }
  }, [brand])

  useEffect(() => {
    if (!ready || !value.length) return
    const known = new Set(loaded.materials.map((material) => material.id))
    const kept = value.filter((line) => known.has(line.material_id))
    if (kept.length !== value.length) onChange(kept)
  }, [ready, loaded, value, onChange])

  const picked = new Set(value.map((line) => line.material_id))
  const options = catalog
    .filter((material) => !picked.has(material.id))
    .map((material) => ({ code: String(material.id), name: material.name }))

  function add(code: string) {
    const id = Number(code)
    if (!id || picked.has(id)) return
    onChange([...value, { material_id: id, quantity: 0 }])
  }

  function setQuantity(id: number, quantity: number) {
    onChange(value.map((line) => (line.material_id === id ? { ...line, quantity } : line)))
  }

  function remove(id: number) {
    onChange(value.filter((line) => line.material_id !== id))
  }

  return (
    <div className="project-materials">
      <OptionCombobox
        options={options}
        value=""
        disabled={disabled || !brand}
        placeholder={placeholder(brand, ready, options.length)}
        onChange={add}
      />

      {value.length > 0 && (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Ед. измерения</th>
                <th>Количество</th>
                <th>Цвет</th>
                <th>Примечание</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {value.map((line) => {
                const material = catalog.find((item) => item.id === line.material_id)
                return (
                  <tr key={line.material_id}>
                    <td className="name-cell">{material?.name ?? `Материал № ${line.material_id}`}</td>
                    <td>{material?.unit ?? ''}</td>
                    <td className="bi-fill">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity || ''}
                        disabled={disabled}
                        onChange={(e) => setQuantity(line.material_id, Number(e.target.value))}
                      />
                    </td>
                    <td />
                    <td>
                      {[material?.article, material?.comment, material ? formatMoney(material.price) : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ghost"
                        disabled={disabled}
                        onClick={() => remove(line.material_id)}
                      >
                        Убрать
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function placeholder(brand: string, ready: boolean, count: number): string {
  if (!brand) return 'сначала выберите бренд'
  if (!ready) return 'загрузка…'
  if (!count) return 'у бренда нет материалов'
  return 'начните вводить'
}
