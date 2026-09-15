import type { Catalogs } from '../types'

type Props = {
  catalogs: Catalogs
  lockedKeys?: ReadonlySet<keyof Catalogs>
  onChange: (next: Catalogs) => void
}

const GROUPS: Array<{ key: keyof Catalogs; title: string; hint: string }> = [
  { key: 'sources', title: 'Источник', hint: 'API: information_source' },
  { key: 'purposes', title: 'Назначение объекта', hint: 'API: segment' },
  { key: 'stages', title: 'Стадия проекта', hint: 'API: project_stage' },
  { key: 'priorities', title: 'Приоритет', hint: 'API: priority' },
  { key: 'regions', title: 'Регион', hint: 'API: region' },
  { key: 'documentationTypes', title: 'Документация', hint: 'API: documentation_type' },
  { key: 'managersSG', title: 'Менеджеры СГ', hint: 'API: /crm/sg-managers' },
  { key: 'probabilities', title: 'Вероятность поставки', hint: 'Пока локально, в API нет' },
  { key: 'yesNo', title: 'Да / Нет', hint: 'Пока локально, в API нет' },
  { key: 'units', title: 'Ед. измерения', hint: 'Локально + единицы из CRM-материалов' },
  { key: 'reservationStatuses', title: 'Резервирование', hint: 'Пока локально, в API нет' },
  { key: 'months', title: 'Месяц', hint: 'Дата составления и поставки' },
  { key: 'years', title: 'Год составления', hint: '2020–2035' },
  { key: 'deliveryYears', title: 'Год поставки / контакта', hint: '2020–2030' },
  { key: 'days', title: 'День', hint: '1–31' },
  { key: 'managersAG', title: 'Ответственные АГ', hint: 'Пока локально. API отдаёт менеджеров СГ отдельно' },
]

export function CatalogsPage({ catalogs, lockedKeys, onChange }: Props) {
  function updateList(key: keyof Catalogs, values: string[]) {
    onChange({ ...catalogs, [key]: values })
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Лист «Списки»</p>
          <h1>Справочники</h1>
          <p className="lede">
            Часть значений приходит из CRM API. Пока нет ручек проектов — бланки остаются в браузере и общей папке.
          </p>
        </div>
      </header>

      <section className="catalog-grid">
        {GROUPS.map((group) => {
          const locked = Boolean(lockedKeys?.has(group.key))
          return (
            <article className="panel" key={group.key}>
              <h2>
                {group.title}
                {locked ? <em className="api-badge">API</em> : null}
              </h2>
              <p className="hint">{group.hint}</p>
              <ul className="catalog-list">
                {catalogs[group.key].map((value, index) => (
                  <li key={`${group.key}-${index}`}>
                    <input
                      value={value}
                      readOnly={locked}
                      onChange={(e) => {
                        const next = [...catalogs[group.key]]
                        next[index] = e.target.value
                        updateList(group.key, next)
                      }}
                    />
                    {!locked && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          updateList(
                            group.key,
                            catalogs[group.key].filter((_, i) => i !== index),
                          )
                        }
                      >
                        Удалить
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {!locked && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => updateList(group.key, [...catalogs[group.key], ''])}
                >
                  Добавить значение
                </button>
              )}
            </article>
          )
        })}
      </section>
    </div>
  )
}
