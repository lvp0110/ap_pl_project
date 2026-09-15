import { useState } from 'react'
import { API_CATALOG_KEYS, CATALOG_REFERENCE_TYPES } from '../lib/api/types'
import type { Catalogs } from '../types'

type Props = {
  catalogs: Catalogs
  loadedFromApi: boolean
  busy: boolean
  onAddReference: (key: keyof Catalogs, name: string) => Promise<void>
  onAddSgManager: (name: string, email: string) => Promise<void>
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

export function CatalogsPage({ catalogs, loadedFromApi, busy, onAddReference, onAddSgManager }: Props) {
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
            Новые пункты пишутся в ConstrTodo через API, не в браузер.
            {!loadedFromApi ? ' Войдите, чтобы добавлять значения.' : ''}
          </p>
        </div>
      </header>

      <section className="catalog-grid">
        {GROUPS.map((group) => {
          const fromApi = API_KEY_SET.has(group.key)
          const values = catalogs[group.key]
          const canAddReference = loadedFromApi && group.key in CATALOG_REFERENCE_TYPES
          const canAddManager = loadedFromApi && group.key === 'managersSG'
          return (
            <article className="panel" key={group.key}>
              <h2>
                {group.title}
                {fromApi ? <em className="api-badge">API</em> : <em className="api-badge">бланк</em>}
              </h2>
              <p className="hint">{group.hint}</p>
              {values.length ? (
                <ul className="catalog-list">
                  {values.map((value, index) => (
                    <li key={`${group.key}-${index}`}>
                      <input value={value} readOnly />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="hint">
                  {fromApi
                    ? loadedFromApi
                      ? 'API вернул пустой список.'
                      : 'Нет данных: войдите в API.'
                    : 'Нет значений.'}
                </p>
              )}
              {canAddReference && (
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
              {canAddManager && (
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
