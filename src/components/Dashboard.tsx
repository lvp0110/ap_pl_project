import { computeStats } from '../lib/format'
import { validateBlank } from '../lib/validate'
import type { Catalogs, Project } from '../types'

type Props = {
  projects: Project[]
  catalogs: Catalogs
  onOpenProject: (id: string) => void
  onGoProjects: (preset?: 'incomplete' | 'attention') => void
}

export function Dashboard({ projects, catalogs, onOpenProject, onGoProjects }: Props) {
  const stats = computeStats(projects, catalogs)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Ecophon · Акустик Групп</p>
          <h1>Дашборд руководителя</h1>
        </div>
      </header>

      <section className="kpi-grid">
        <Kpi label="Всего бланков" value={String(stats.total)} />
        <Kpi label="Заполнены полностью" value={String(stats.complete)} accent />
        <Kpi label="Не заполнены" value={String(stats.incomplete)} />
        <Kpi label="Тендер / закупка" value={String(stats.tender)} />
        <Kpi label="Вероятность 70–90%" value={String(stats.attention.length)} />
      </section>

      <section className="split">
        <article className="panel">
          <h2>Что смотреть каждую неделю</h2>
          <ol className="weekly">
            <li>
              <button type="button" className="linkish" onClick={() => onGoProjects('attention')}>
                Какие проекты с вероятностью 70–90% требуют личного вмешательства?
              </button>
              <span className="muted">{stats.attention.length} шт.</span>
            </li>
            <li>
              <button type="button" className="linkish" onClick={() => onGoProjects('incomplete')}>
                Где бланк ещё не заполнен полностью?
              </button>
              <span className="muted">{stats.incomplete} шт.</span>
            </li>
          </ol>
        </article>

        <article className="panel">
          <h2>Проекты 70–90%</h2>
          {stats.attention.length === 0 ? (
            <p className="empty-inline">Нет бланков с высокой вероятностью поставки.</p>
          ) : (
            <ul className="attention-list">
              {stats.attention.map((p) => (
                <li key={p.id || p.name}>
                  <button type="button" onClick={() => onOpenProject(p.id)}>
                    <strong>{p.name || 'Без названия'}</strong>
                    <span>
                      {p.stage || 'без стадии'} · {p.probability} · {p.city || 'город не указан'}
                      {validateBlank(p).length ? ' · бланк неполный' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="split">
        <Counts title="Стадии" rows={catalogs.stages.map((s) => [s, stats.byStage[s] ?? 0])} />
        <Counts title="Источники" rows={catalogs.sources.map((s) => [s, stats.bySource[s] ?? 0])} />
      </section>
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className={`kpi${accent ? ' kpi-accent' : ''}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  )
}

function Counts({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const max = Math.max(1, ...rows.map(([, n]) => n))
  return (
    <article className="panel">
      <h2>{title}</h2>
      <ul className="bars">
        {rows.map(([label, count]) => (
          <li key={label}>
            <span>{label}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </span>
            <b>{count}</b>
          </li>
        ))}
      </ul>
    </article>
  )
}
