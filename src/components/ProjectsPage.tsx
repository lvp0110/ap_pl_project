import type { CrmFilter, CrmProject } from '../lib/api/projectTypes'
import {
  formatAmount,
  formatDate,
  formatMoney,
  formatProjectCount,
  isIncomplete,
  referenceName,
  type ReferenceMap,
} from '../lib/projects/view'

type Props = {
  projects: CrmProject[]
  references: ReferenceMap
  filters: CrmFilter[]
  selected: Record<string, string>
  loadedFromApi: boolean
  busy: boolean
  failure: string
  onFilterChange: (code: string, value: string) => void
  onReset: () => void
  onCreate: () => void
  onRefresh: () => void
}

export function ProjectsPage({
  projects,
  references,
  filters,
  selected,
  loadedFromApi,
  busy,
  failure,
  onFilterChange,
  onReset,
  onCreate,
  onRefresh,
}: Props) {
  const applied = Object.keys(selected).length

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Бланк информирования Ecophon</p>
          <h1>Проекты</h1>
          <p className="lede">
            Проекты приходят из CRM ConstrTodo. Менеджер заполняет бланк: проект, сроки, объёмы и материалы.
          </p>
        </div>
        <button type="button" className="primary" onClick={onCreate}>
          Заполнить бланк
        </button>
      </header>

      <div className="filters">
        {filters.map((filter) => (
          <select
            key={filter.code}
            value={selected[filter.code] ?? ''}
            disabled={busy}
            onChange={(e) => onFilterChange(filter.code, e.target.value)}
          >
            <option value="">{filter.name}: все</option>
            {filter.options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        ))}
        <div className="chips">
          {applied > 0 && (
            <button type="button" className="chip" onClick={onReset}>
              Сбросить фильтры ({applied})
            </button>
          )}
          <button type="button" className="chip" disabled={busy || !loadedFromApi} onClick={onRefresh}>
            Обновить
          </button>
        </div>
      </div>

      {failure && <p className="hint field-invalid">{failure}</p>}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>№</th>
              <th>Проект</th>
              <th>Бренд</th>
              <th>Регион</th>
              <th>Стадия</th>
              <th>%</th>
              <th>Объём</th>
              <th>Выручка</th>
              <th>Обновлён</th>
              <th>Проверка</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-cell">
                  {!loadedFromApi
                    ? 'Войдите в API ConstrTodo, чтобы увидеть проекты.'
                    : busy
                      ? 'Загружаем проекты…'
                      : applied
                        ? 'Нет проектов по выбранным фильтрам.'
                        : 'Пока нет проектов. Нажмите «Заполнить бланк».'}
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.erp_code || p.id}</td>
                  <td className="name-cell">{p.name || 'Без названия'}</td>
                  <td>{p.brand.name}</td>
                  <td>{referenceName(references, 'region', p.region_id)}</td>
                  <td>
                    {p.stage_id ? (
                      <span className="badge">{referenceName(references, 'project_stage', p.stage_id)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{p.sale_probability ? `${p.sale_probability}%` : '—'}</td>
                  <td>{formatAmount(p.total_area, 'м²')}</td>
                  <td>{formatMoney(p.potential_revenue)}</td>
                  <td>{formatDate(p.updated_at)}</td>
                  <td>
                    <span className="prio" data-p={isIncomplete(p) ? 'Высокий' : 'Низкий'}>
                      {isIncomplete(p) ? 'Не заполнен' : 'Заполнен'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="hint">
        {formatProjectCount(projects.length)}
        {applied > 0 ? ` · фильтров: ${applied}` : ''}
      </p>
    </div>
  )
}
