import { useLayoutEffect, useRef, useState } from 'react'
import { ClipHint } from './ClipHint'
import { ScrollHint } from './ScrollHint'
import type { CrmFilter, CrmFormField, CrmOption, CrmProject } from '../lib/api/projectTypes'
import {
  CHECK_FILTER,
  filledListColumns,
  formatBlankCell,
  listBlankFields,
  matchesListFilters,
  ROW_ID_FILTER,
  uniqueCellOptions,
  uniqueIdOptions,
  type ListLookups,
} from '../lib/projects/listCells'
import { checkLabel, formatProjectCount } from '../lib/projects/view'

type Props = {
  projects: CrmProject[]
  fields: CrmFormField[]
  lookups: ListLookups
  filters: CrmFilter[]
  selected: Record<string, string>
  loadedFromApi: boolean
  busy: boolean
  failure: string
  onFilterChange: (code: string, value: string) => void
  onReset: () => void
  onCreate: () => void
  onOpen: (project: CrmProject) => void
  onRefresh: () => void
}

type FilterItem = {
  code: string
  label: string
  options: CrmOption[]
  column: boolean
}

const SHORT_LABEL: Record<string, string> = {
  [ROW_ID_FILTER]: '№',
  [CHECK_FILTER]: 'Проверка',
  information_form_date: 'Дата',
  comment: 'Примечание',
  information_source_id: 'Источник',
  name: 'Проект',
  address: 'Адрес',
  segment_id: 'Назначение',
  stage_id: 'Стадия',
  planned_shipment_date: 'Дата поставки',
  planned_supply_quarter: 'Квартал',
  planned_supply_year: 'Год',
  sale_probability: 'Вероятность',
  ag_manager_id: 'Ответственный АГ',
  sg_manager_id: 'Ответственный SG',
  participant_ids: 'Контактные лица',
  first_contact_date: 'Первый контакт',
  documentation_type_ids: 'Работа',
  materials: 'Материалы',
  region_id: 'Регион',
  status: 'Статус',
  priority_id: 'Приоритет',
  support_status_id: 'Поддержка',
}

export function ProjectsPage({
  projects,
  fields,
  lookups,
  filters,
  selected,
  loadedFromApi,
  busy,
  failure,
  onFilterChange,
  onReset,
  onCreate,
  onOpen,
  onRefresh,
}: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [hiddenCols, setHiddenCols] = useState<string[]>([])
  const allBox = useRef<HTMLInputElement>(null)
  const applied = Object.keys(selected).length
  const columns = filledListColumns(listBlankFields(fields), projects, lookups)
  const shown = columns.filter((column) => !hiddenCols.includes(column.field.code))
  const showId = !hiddenCols.includes(ROW_ID_FILTER)
  const showCheck = !hiddenCols.includes(CHECK_FILTER)
  const visible = projects.filter((project) => matchesListFilters(project, selected, fields, lookups, columns))
  const colSpan = Math.max(1, (showId ? 1 : 0) + shown.length + (showCheck ? 1 : 0))
  const board = filterBoard(columns, filters, projects, fields, lookups)
  const columnCodes = board.filter((item) => item.column).map((item) => item.code)
  const allColumnsOn = columnCodes.length > 0 && columnCodes.every((code) => !hiddenCols.includes(code))
  const someColumnsOn = columnCodes.some((code) => !hiddenCols.includes(code))

  useLayoutEffect(() => {
    if (allBox.current) allBox.current.indeterminate = !allColumnsOn && someColumnsOn
  }, [allColumnsOn, someColumnsOn])

  function toggleColumn(code: string) {
    setHiddenCols((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  function toggleAllColumns() {
    setHiddenCols(allColumnsOn ? columnCodes : [])
  }

  return (
    <div className="page projects-page">
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

      <div className="filter-bar">
        <div className="chips">
          <button
            type="button"
            className={`chip${filtersOpen ? ' active' : ''}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? 'Скрыть фильтры' : applied ? `Фильтры (${applied})` : 'Фильтры'}
          </button>
          {applied > 0 && (
            <button type="button" className="chip" onClick={onReset}>
              Сбросить
            </button>
          )}
          <button type="button" className="chip" disabled={busy || !loadedFromApi} onClick={onRefresh}>
            Обновить
          </button>
          {filtersOpen ? (
            <label className="filter-all">
              <input
                ref={allBox}
                type="checkbox"
                checked={allColumnsOn}
                onChange={toggleAllColumns}
              />
              Все столбцы
            </label>
          ) : null}
        </div>
        {filtersOpen ? (
          <div className="filters">
            {board.map((item) => {
              const open = item.column && !hiddenCols.includes(item.code)
              return (
                <div className="filter-field" key={item.code}>
                  <span className="filter-name" title={item.label}>
                    {item.label}
                  </span>
                  {item.column ? (
                    <button
                      type="button"
                      className={`col-toggle${open ? ' on' : ''}`}
                      aria-pressed={open}
                      aria-label={open ? `Скрыть столбец «${item.label}»` : `Показать столбец «${item.label}»`}
                      onClick={() => toggleColumn(item.code)}
                    >
                      {open ? '✓' : ''}
                    </button>
                  ) : (
                    <span className="col-toggle col-toggle-off" aria-hidden="true" />
                  )}
                  <select
                    value={selected[item.code] ?? ''}
                    disabled={busy || !item.options.length}
                    aria-label={item.label}
                    onChange={(e) => onFilterChange(item.code, e.target.value)}
                  >
                    <option value="">все</option>
                    {item.options.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {failure && <p className="hint field-invalid">{failure}</p>}

      <ScrollHint>
        <table className="grid projects-grid">
          <thead>
            <tr>
              {showId ? <th>№</th> : null}
              {shown.map((column) => (
                <th key={column.field.code}>{column.label}</th>
              ))}
              {showCheck ? <th>Проверка</th> : null}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="empty-cell">
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
              visible.map((p) => (
                <tr key={p.id} onClick={() => onOpen(p)}>
                  {showId ? <td>{p.erp_code || p.id}</td> : null}
                  {shown.map((column) => {
                    const text = formatBlankCell(p, column.field, lookups)
                    return (
                      <td key={column.field.code} className={column.field.code === 'name' ? 'name-cell' : undefined}>
                        <ClipHint text={text || '—'} />
                      </td>
                    )
                  })}
                  {showCheck ? (
                    <td>
                      <span className="prio" data-p={checkLabel(p, fields) === 'Заполнен' ? 'Низкий' : 'Высокий'}>
                        {checkLabel(p, fields)}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollHint>
      <p className="hint">
        {formatProjectCount(visible.length)}
        {applied > 0 ? ` · фильтров: ${applied}` : ''}
      </p>
    </div>
  )
}

function filterBoard(
  columns: ReturnType<typeof filledListColumns>,
  filters: CrmFilter[],
  projects: CrmProject[],
  fields: CrmFormField[],
  lookups: ListLookups,
): FilterItem[] {
  const columnItems: FilterItem[] = [
    { code: ROW_ID_FILTER, label: SHORT_LABEL[ROW_ID_FILTER], options: uniqueIdOptions(projects), column: true },
    ...columns.map((column) => {
      const api = filters.find((filter) => filter.code === column.field.code)
      return {
        code: column.field.code,
        label: SHORT_LABEL[column.field.code] ?? column.label,
        options: api?.options ?? uniqueCellOptions(projects, column.field, lookups),
        column: true,
      }
    }),
    {
      code: CHECK_FILTER,
      label: SHORT_LABEL[CHECK_FILTER],
      options: [...new Set(projects.map((project) => checkLabel(project, fields)))].map((name) => ({
        code: name,
        name,
      })),
      column: true,
    },
  ]
  const taken = new Set(columnItems.map((item) => item.code))
  const extras = filters
    .filter((filter) => !taken.has(filter.code))
    .map((filter) => ({
      code: filter.code,
      label: SHORT_LABEL[filter.code] ?? filter.name,
      options: filter.options,
      column: false,
    }))
  return [...extras, ...columnItems]
}
