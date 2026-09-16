import { useState } from 'react'
import { activeReferences } from '../lib/api/crm'
import {
  API_CATALOG_KEYS,
  CATALOG_REFERENCE_TYPES,
  type CrmReferenceType,
  type CrmReferenceValue,
  type CrmSgManager,
} from '../lib/api/types'
import type { Catalogs } from '../types'

type Props = {
  catalogs: Catalogs
  references: Record<CrmReferenceType, CrmReferenceValue[]>
  sgManagers: CrmSgManager[]
  loadedFromApi: boolean
  busy: boolean
  onAddReference: (key: keyof Catalogs, name: string) => Promise<void>
  onUpdateReference: (type: CrmReferenceType, value: CrmReferenceValue, name: string) => Promise<void>
  onArchiveReference: (type: CrmReferenceType, value: CrmReferenceValue) => Promise<void>
  onAddSgManager: (name: string, email: string) => Promise<void>
  onUpdateSgManager: (manager: CrmSgManager, name: string, email: string) => Promise<void>
  onArchiveSgManager: (manager: CrmSgManager) => Promise<void>
}

const API_KEY_SET = new Set<keyof Catalogs>(API_CATALOG_KEYS)

const GROUPS: Array<{ key: keyof Catalogs; title: string; hint: string }> = [
  { key: 'sources', title: 'Источник', hint: 'POST /crm/references/information_source' },
  { key: 'purposes', title: 'Назначение объекта', hint: 'POST /crm/references/segment' },
  { key: 'stages', title: 'Стадия проекта', hint: 'POST /crm/references/project_stage' },
  { key: 'priorities', title: 'Приоритет', hint: 'POST /crm/references/priority' },
  { key: 'regions', title: 'Регион', hint: 'POST /crm/references/region' },
  { key: 'documentationTypes', title: 'Документация', hint: 'POST /crm/references/documentation_type' },
  { key: 'managersSG', title: 'Менеджеры СГ', hint: 'POST /crm/sg-managers — нужны имя и email' },
  { key: 'managersAG', title: 'Ответственные АГ', hint: 'В API нет отдельного списка менеджеров АГ' },
  { key: 'units', title: 'Ед. измерения', hint: 'Из прайса Excel и CRM-материалов' },
  { key: 'probabilities', title: 'Вероятность поставки', hint: 'Поля бланка, в CRM references нет' },
  { key: 'yesNo', title: 'Да / Нет', hint: 'Поля бланка, в CRM references нет' },
  { key: 'reservationStatuses', title: 'Резервирование', hint: 'Поля бланка, в CRM references нет' },
  { key: 'months', title: 'Месяц', hint: 'Дата составления и поставки' },
  { key: 'years', title: 'Год составления', hint: '2020–2035' },
  { key: 'deliveryYears', title: 'Год поставки / контакта', hint: '2020–2030' },
  { key: 'days', title: 'День', hint: '1–31' },
]

function ReferenceRow({
  value,
  busy,
  onSave,
  onArchive,
}: {
  value: CrmReferenceValue
  busy: boolean
  onSave: (name: string) => Promise<void>
  onArchive: () => Promise<void>
}) {
  const [name, setName] = useState(value.name)
  const trimmed = name.trim()
  const dirty = Boolean(trimmed) && trimmed !== value.name

  return (
    <li className="catalog-row-stack">
      <input value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
      <div className="catalog-row-actions">
        <button
          type="button"
          className="ghost"
          disabled={busy || !dirty}
          onClick={() => void onSave(trimmed).catch(() => setName(value.name))}
        >
          Сохранить
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => {
            if (!confirm(`Убрать «${value.name}» из справочника?`)) return
            void onArchive().catch(() => {})
          }}
        >
          В архив
        </button>
      </div>
    </li>
  )
}

function SgManagerRow({
  manager,
  busy,
  onSave,
  onArchive,
}: {
  manager: CrmSgManager
  busy: boolean
  onSave: (name: string, email: string) => Promise<void>
  onArchive: () => Promise<void>
}) {
  const [name, setName] = useState(manager.name)
  const [email, setEmail] = useState(manager.email)

  function reset() {
    setName(manager.name)
    setEmail(manager.email)
  }

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const dirty =
    Boolean(trimmedName) &&
    Boolean(trimmedEmail) &&
    (trimmedName !== manager.name || trimmedEmail !== manager.email)

  return (
    <li className="catalog-row-stack">
      <input value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
      <input type="email" value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} />
      <div className="catalog-row-actions">
        <button
          type="button"
          className="ghost"
          disabled={busy || !dirty}
          onClick={() => void onSave(trimmedName, trimmedEmail).catch(reset)}
        >
          Сохранить
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => {
            if (!confirm(`Убрать менеджера «${manager.name}» из справочника?`)) return
            void onArchive().catch(() => {})
          }}
        >
          В архив
        </button>
      </div>
    </li>
  )
}

export function CatalogsPage({
  catalogs,
  references,
  sgManagers,
  loadedFromApi,
  busy,
  onAddReference,
  onUpdateReference,
  onArchiveReference,
  onAddSgManager,
  onUpdateSgManager,
  onArchiveSgManager,
}: Props) {
  const [drafts, setDrafts] = useState<Partial<Record<keyof Catalogs, string>>>({})
  const [managerEmail, setManagerEmail] = useState('')

  function draft(key: keyof Catalogs) {
    return drafts[key] ?? ''
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Лист «Списки»</p>
          <h1>Справочники</h1>
          <p className="lede">
            Значения справочников CRM правятся и убираются через API, не в браузере.
            {!loadedFromApi ? ' Войдите, чтобы их менять.' : ''}
          </p>
        </div>
      </header>

      <section className="catalog-grid">
        {GROUPS.map((group) => {
          const fromApi = API_KEY_SET.has(group.key)
          const referenceType = CATALOG_REFERENCE_TYPES[group.key as keyof typeof CATALOG_REFERENCE_TYPES]
          const editable = loadedFromApi && Boolean(referenceType)
          const editableManagers = loadedFromApi && group.key === 'managersSG'
          const values = editable && referenceType ? activeReferences(references[referenceType] ?? []) : []
          const plain = catalogs[group.key]
          const count = editable ? values.length : editableManagers ? sgManagers.length : plain.length
          return (
            <article className="panel" key={group.key}>
              <h2>
                {group.title}
                {fromApi ? <em className="api-badge">API</em> : <em className="api-badge">бланк</em>}
              </h2>
              <p className="hint">{group.hint}</p>
              {!count ? (
                <p className="hint">
                  {fromApi
                    ? loadedFromApi
                      ? 'API вернул пустой список.'
                      : 'Нет данных: войдите в API.'
                    : 'Нет значений.'}
                </p>
              ) : (
                <ul className="catalog-list">
                  {editable && referenceType
                    ? values.map((value) => (
                        <ReferenceRow
                          key={`${value.id}:${value.name}`}
                          value={value}
                          busy={busy}
                          onSave={(name) => onUpdateReference(referenceType, value, name)}
                          onArchive={() => onArchiveReference(referenceType, value)}
                        />
                      ))
                    : editableManagers
                      ? sgManagers.map((manager) => (
                          <SgManagerRow
                            key={`${manager.id}:${manager.name}:${manager.email}`}
                            manager={manager}
                            busy={busy}
                            onSave={(name, email) => onUpdateSgManager(manager, name, email)}
                            onArchive={() => onArchiveSgManager(manager)}
                          />
                        ))
                      : plain.map((value, index) => (
                          <li key={`${group.key}-${index}`}>
                            <input value={value} readOnly />
                          </li>
                        ))}
                </ul>
              )}
              {editable && (
                <form
                  className="catalog-add"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const name = draft(group.key).trim()
                    if (!name) return
                    void onAddReference(group.key, name)
                      .then(() => {
                        setDrafts((prev) => ({ ...prev, [group.key]: '' }))
                      })
                      .catch(() => {})
                  }}
                >
                  <input
                    value={draft(group.key)}
                    disabled={busy}
                    placeholder="Новое значение"
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [group.key]: e.target.value }))}
                  />
                  <button type="submit" className="ghost" disabled={busy || !draft(group.key).trim()}>
                    Добавить в API
                  </button>
                </form>
              )}
              {editableManagers && (
                <form
                  className="catalog-add catalog-add-stack"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const name = draft('managersSG').trim()
                    const email = managerEmail.trim()
                    if (!name || !email) return
                    void onAddSgManager(name, email)
                      .then(() => {
                        setDrafts((prev) => ({ ...prev, managersSG: '' }))
                        setManagerEmail('')
                      })
                      .catch(() => {})
                  }}
                >
                  <input
                    value={draft('managersSG')}
                    disabled={busy}
                    placeholder="Имя менеджера СГ"
                    onChange={(e) => setDrafts((prev) => ({ ...prev, managersSG: e.target.value }))}
                  />
                  <input
                    type="email"
                    value={managerEmail}
                    disabled={busy}
                    placeholder="email"
                    onChange={(e) => setManagerEmail(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="ghost"
                    disabled={busy || !draft('managersSG').trim() || !managerEmail.trim()}
                  >
                    Добавить в API
                  </button>
                </form>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
