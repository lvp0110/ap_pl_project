import { useMemo, useState } from 'react'
import type { Catalogs, Project, ProjectPreset } from '../types'
import { formatDateParts } from '../lib/format'
import { isHighProbability, validateBlank } from '../lib/validate'

type Props = {
  projects: Project[]
  catalogs: Catalogs
  preset: ProjectPreset
  onPresetChange: (preset: ProjectPreset) => void
  onCreate: () => void
  onOpen: (project: Project) => void
}

export function ProjectsPage({
  projects,
  catalogs,
  preset,
  onPresetChange,
  onCreate,
  onOpen,
}: Props) {
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('')
  const [source, setSource] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      const issues = validateBlank(p)
      if (preset === 'incomplete' && issues.length === 0) return false
      if (preset === 'attention' && !isHighProbability(p)) return false
      if (stage && p.stage !== stage) return false
      if (source && p.source !== source) return false
      if (!q) return true
      const blob = [p.id, p.name, p.city, p.street, p.managerAG, p.purpose]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [projects, query, stage, source, preset])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Бланк информирования Ecophon</p>
          <h1>Проекты</h1>
          <p className="lede">
            Менеджер заполняет бланк: проект, контакты, проделанная работа и материалы. Жёлтые поля — обязательные.
          </p>
        </div>
        <button type="button" className="primary" onClick={onCreate}>
          Заполнить бланк
        </button>
      </header>

      <div className="filters">
        <input
          className="search"
          placeholder="Поиск по названию, городу, менеджеру…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">Все стадии</option>
          {catalogs.stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Все источники</option>
          {catalogs.sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="chip-row">
          <button
            type="button"
            className={preset === 'all' ? 'chip active' : 'chip'}
            onClick={() => onPresetChange('all')}
          >
            Все
          </button>
          <button
            type="button"
            className={preset === 'incomplete' ? 'chip active' : 'chip'}
            onClick={() => onPresetChange('incomplete')}
          >
            Не заполнены
          </button>
          <button
            type="button"
            className={preset === 'attention' ? 'chip active' : 'chip'}
            onClick={() => onPresetChange('attention')}
          >
            70–90%
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>ID</th>
              <th>Проект</th>
              <th>Город</th>
              <th>Источник</th>
              <th>Стадия</th>
              <th>%</th>
              <th>Ответственный АГ</th>
              <th>Поставка</th>
              <th>Проверка</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  {projects.length === 0
                    ? 'Пока нет заполненных бланков. Нажмите «Заполнить бланк» или загрузите Excel.'
                    : 'Нет строк по текущим фильтрам.'}
                </td>
              </tr>
            ) : (
              filtered.map((p, index) => {
                const issues = validateBlank(p)
                return (
                  <tr key={p.id ? `id-${p.id}` : `row-${index}`} onClick={() => onOpen(p)}>
                    <td>{p.id || '—'}</td>
                    <td className="name-cell">{p.name || 'Без названия'}</td>
                    <td>{p.city || '—'}</td>
                    <td>{p.source || '—'}</td>
                    <td>{p.stage ? <span className="badge">{p.stage}</span> : '—'}</td>
                    <td>{p.probability || '—'}</td>
                    <td>{p.managerAG || '—'}</td>
                    <td>{formatDateParts('', p.deliveryMonth, p.deliveryYear)}</td>
                    <td>
                      {issues.length === 0 ? (
                        <span className="prio" data-p="Низкий">
                          Заполнен
                        </span>
                      ) : (
                        <span className="prio" data-p="Высокий">
                          Не заполнен
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="hint">
        {filtered.length} из {projects.length} бланков
      </p>
    </div>
  )
}
