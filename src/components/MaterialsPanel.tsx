import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api/client'
import { loadFieldOptions } from '../lib/api/projects'
import {
  archiveMaterial,
  importMaterials,
  listMaterials,
  updateMaterial,
  type MaterialDraft,
} from '../lib/api/materials'
import type { CrmOption } from '../lib/api/projectTypes'
import type { CrmMaterial } from '../lib/api/types'
import { MaterialRow } from './MaterialRow'
import { OptionCombobox } from './OptionCombobox'

const BRANDS_ENDPOINT = '/crm/project-options/brands'
const COLUMNS = '«Материал / решение», «Артикул», «Цена», «Единица измерения», «Комментарий»'

function describeImport(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : 'Не удалось загрузить прайс'
  }
  const rows = err.message.match(/(\d+) error\(s\)/)
  if (rows) return `Файл не принят: ошибок в строках — ${rows[1]}. Проверьте колонки ${COLUMNS} и значения цен.`
  if (err.status === 422) return `Файл не принят. Нужен .xlsx с колонками ${COLUMNS}.`
  return err.message
}

export function MaterialsPanel({ loadedFromApi }: { loadedFromApi: boolean }) {
  const [brands, setBrands] = useState<CrmOption[]>([])
  const [brand, setBrand] = useState('')
  const [materials, setMaterials] = useState<CrmMaterial[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loadedFromApi) return
    let active = true
    loadFieldOptions(BRANDS_ENDPOINT)
      .then((rows) => {
        if (active) setBrands(rows)
      })
      .catch(() => {
        if (active) setBrands([])
      })
    return () => {
      active = false
    }
  }, [loadedFromApi])

  async function refresh(code = brand) {
    if (!code) {
      setMaterials([])
      return
    }
    setBusy(true)
    setFailure('')
    try {
      setMaterials(await listMaterials(code))
    } catch (err) {
      setMaterials([])
      setFailure(err instanceof Error ? err.message : 'Не удалось загрузить материалы')
    } finally {
      setBusy(false)
    }
  }

  async function pickBrand(code: string) {
    setBrand(code)
    setNotice('')
    await refresh(code)
  }

  async function upload(file: File) {
    setBusy(true)
    setNotice('')
    setFailure('')
    try {
      const result = await importMaterials(brand, file)
      setNotice(
        `Загружено из «${file.name}»: создано ${result.created}, обновлено ${result.updated}, без изменений ${result.unchanged}.`,
      )
      await refresh()
    } catch (err) {
      setFailure(describeImport(err))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function save(material: CrmMaterial, draft: MaterialDraft) {
    setBusy(true)
    setNotice('')
    setFailure('')
    try {
      await updateMaterial(material.id, draft)
      setNotice(`Материал «${draft.name}» сохранён.`)
      await refresh()
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Не удалось сохранить материал')
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function archive(material: CrmMaterial) {
    setBusy(true)
    setNotice('')
    setFailure('')
    try {
      await archiveMaterial(material.id)
      setNotice(`Материал «${material.name}» убран.`)
      await refresh()
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Не удалось убрать материал')
    } finally {
      setBusy(false)
    }
  }

  if (!loadedFromApi) return null

  return (
    <section className="panel materials-panel">
      <h2>Материалы бренда</h2>
      <p className="hint">
        Прайс загружается файлом Excel и хранится в CRM: колонки «Материал / решение», «Артикул», «Цена»,
        «Единица измерения», «Комментарий».
      </p>

      <div className="materials-toolbar">
        <div className="materials-brand">
          <OptionCombobox
            options={brands}
            value={brand}
            disabled={busy}
            placeholder={brands.length ? 'Выберите бренд' : 'загрузка…'}
            onChange={(code) => void pickBrand(code)}
          />
        </div>
        <button
          type="button"
          className="primary"
          disabled={busy || !brand}
          onClick={() => fileInput.current?.click()}
        >
          Загрузить excel
        </button>
        <button type="button" className="ghost" disabled={busy || !brand} onClick={() => void refresh()}>
          Обновить
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
          }}
        />
      </div>

      {notice && <p className="hint">{notice}</p>}
      {failure && <p className="hint field-invalid">{failure}</p>}

      {!brand ? (
        <p className="hint">Выберите бренд, чтобы увидеть его материалы.</p>
      ) : (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Артикул</th>
                <th>Материал / решение</th>
                <th>Цена</th>
                <th>Ед.</th>
                <th>Комментарий</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {busy ? 'Загружаем материалы…' : 'У бренда нет материалов. Загрузите прайс Excel.'}
                  </td>
                </tr>
              ) : (
                materials.map((material) => (
                  <MaterialRow
                    key={`${material.id}:${material.name}:${material.price}`}
                    material={material}
                    brand={brand}
                    busy={busy}
                    onSave={save}
                    onArchive={archive}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
