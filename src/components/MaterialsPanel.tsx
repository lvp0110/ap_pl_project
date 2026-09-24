import { useEffect, useRef, useState } from 'react'
import { listBrands } from '../lib/api/brands'
import { ApiError } from '../lib/api/client'
import {
  archiveMaterial,
  createMaterial,
  importMaterials,
  listMaterials,
  updateMaterial,
  type MaterialDraft,
} from '../lib/api/materials'
import type { CrmOption } from '../lib/api/projectTypes'
import type { CrmMaterial } from '../lib/api/types'
import { MaterialCreateForm } from './MaterialCreateForm'
import { MaterialRow } from './MaterialRow'
import { OptionCombobox } from './OptionCombobox'

const COLUMNS = '«Артикул», «Материал», «Стоимость», «Единица измерения», «Комментарий»'

function describeWrite(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : ''
  if (message.includes('already exists')) return 'Материал с таким названием уже есть у этого бренда.'
  return message || fallback
}

function matchesQuery(item: CrmMaterial, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  const hay = [item.article ?? '', item.name, String(item.price), item.unit, item.comment ?? '']
    .join(' ')
    .toLowerCase()
  return tokens.every((token) => hay.includes(token))
}

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
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loadedFromApi) return
    let active = true
    listBrands()
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
    setQuery('')
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

  async function add(draft: MaterialDraft) {
    setBusy(true)
    setNotice('')
    setFailure('')
    try {
      await createMaterial(draft)
      setNotice(`Материал «${draft.name}» добавлен.`)
      await refresh()
    } catch (err) {
      setFailure(describeWrite(err, 'Не удалось добавить материал'))
      throw err
    } finally {
      setBusy(false)
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
      setFailure(describeWrite(err, 'Не удалось сохранить материал'))
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

  const visible = materials.filter((item) => matchesQuery(item, query))

  return (
    <section className="panel materials-panel">
      <h2>Материалы бренда</h2>
      <p className="hint">
        Прайс загружается файлом Excel и хранится в CRM: колонки {COLUMNS}.
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
          className="materials-search"
          type="search"
          value={query}
          disabled={busy || !brand}
          placeholder="Поиск по прайсу"
          onChange={(e) => setQuery(e.target.value)}
        />
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
        <>
          <div className="table-wrap">
            <table className="grid">
            <colgroup>
              <col className="col-article" />
              <col className="col-material" />
              <col className="col-price" />
              <col className="col-unit" />
              <col className="col-comment" />
              <col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Артикул</th>
                <th>Материал</th>
                <th>Цена</th>
                <th>Ед.</th>
                <th>Комментарий</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 || visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {materials.length === 0
                      ? busy
                        ? 'Загружаем материалы…'
                        : 'У бренда нет материалов. Загрузите прайс Excel.'
                      : 'Ничего не найдено.'}
                  </td>
                </tr>
              ) : (
                visible.map((material) => (
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
          <MaterialCreateForm brand={brand} busy={busy} onCreate={add} />
        </>
      )}
    </section>
  )
}
