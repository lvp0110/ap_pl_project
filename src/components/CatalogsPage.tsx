import type { Catalogs } from '../types'

type Props = {
  catalogs: Catalogs
  onChange: (next: Catalogs) => void
}

const GROUPS: Array<{ key: keyof Catalogs; title: string; hint: string }> = [
  { key: 'sources', title: 'Источник', hint: 'Откуда узнали о проекте' },
  { key: 'purposes', title: 'Назначение объекта', hint: 'Школа, офис, спорт…' },
  { key: 'stages', title: 'Стадия проекта', hint: 'Концепция → отгрузка' },
  { key: 'probabilities', title: 'Вероятность поставки', hint: '10% … 90%' },
  { key: 'yesNo', title: 'Да / Нет', hint: 'Проделанная работа' },
  { key: 'units', title: 'Ед. измерения', hint: 'Материалы Ecophon' },
  { key: 'reservationStatuses', title: 'Резервирование', hint: 'Служебная отметка' },
  { key: 'months', title: 'Месяц', hint: 'Дата составления и поставки' },
  { key: 'years', title: 'Год составления', hint: '2020–2035' },
  { key: 'deliveryYears', title: 'Год поставки / контакта', hint: '2020–2030' },
  { key: 'days', title: 'День', hint: '1–31' },
  { key: 'managersAG', title: 'Ответственные АГ', hint: 'Менеджеры Акустик Групп' },
]

export function CatalogsPage({ catalogs, onChange }: Props) {
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
            Значения из бланка информирования Ecophon. Они же питают выпадающие списки в форме.
          </p>
        </div>
      </header>

      <section className="catalog-grid">
        {GROUPS.map((group) => (
          <article className="panel" key={group.key}>
            <h2>{group.title}</h2>
            <p className="hint">{group.hint}</p>
            <ul className="catalog-list">
              {catalogs[group.key].map((value, index) => (
                <li key={`${group.key}-${index}`}>
                  <input
                    value={value}
                    onChange={(e) => {
                      const next = [...catalogs[group.key]]
                      next[index] = e.target.value
                      updateList(group.key, next)
                    }}
                  />
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
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="ghost"
              onClick={() => updateList(group.key, [...catalogs[group.key], ''])}
            >
              Добавить значение
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
