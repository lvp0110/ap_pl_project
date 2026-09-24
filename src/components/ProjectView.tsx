import type { ReactNode } from 'react'
import { PARTNER_COMPANY } from '../data/defaults'
import type { CrmFormField, CrmProject, CrmProjectAccess } from '../lib/api/projectTypes'
import { blankLabel, planBlankFields } from '../lib/projects/blankLayout'
import { readValue } from '../lib/projects/formValues'
import { loadSheetNotes } from '../lib/projects/sheetNotes'
import { formatDate, isBlankComplete, isSubmittedProject } from '../lib/projects/view'
import { BlankContactsTable } from './BlankContactsTable'
import { ProjectFieldValue } from './ProjectFieldValue'

type Props = {
  project: CrmProject
  fields: CrmFormField[]
  access: CrmProjectAccess | null
  onBack: () => void
  onEdit: () => void
}

export function ProjectView({ project, fields, access, onBack, onEdit }: Props) {
  const plan = planBlankFields(fields)
  const notes = loadSheetNotes(project.id)
  const headerField = plan.note[0]

  function value(field: CrmFormField) {
    const parent = field.depends_on
      ? String(readValue(project, { ...field, code: field.depends_on }) || '')
      : ''
    return <ProjectFieldValue field={field} project={project} parentValue={parent} />
  }

  return (
    <div className="page bi-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Бланк информирования · проект № {project.id}</p>
          <h1>{project.name || 'Без названия'}</h1>
          <p className="lede">
            Обновлён {formatDate(project.updated_at)}
            {access ? ` · доступ «${access}»` : ''}
          </p>
        </div>
        <div className="project-view-actions">
          <button type="button" className="primary" onClick={onEdit}>
            {isSubmittedProject(project) || isBlankComplete(project, fields) ? 'Редактировать' : 'Заполнить бланк'}
          </button>
          <button type="button" className="ghost" onClick={onBack}>
            К списку
          </button>
        </div>
      </header>

      <div className="bi-sheet bi-saved">
        <header className="bi-head">
          <div className="bi-title">
            <h2>Информирование о проекте</h2>
            <p className="bi-company">{PARTNER_COMPANY}</p>
            <p className="bi-caption">название компании / подпись руководителя</p>
          </div>
          <table className="bi-date">
            <thead>
              <tr>
                <th>Дата составления</th>
                <th>Примечание</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="bi-fill">{plan.date[0] ? value(plan.date[0]) : null}</td>
                <td className="bi-fill">
                  {headerField && !headerField.disabled
                    ? value(headerField)
                    : notes.header || (headerField ? value(headerField) : null)}
                </td>
              </tr>
            </tbody>
          </table>
        </header>

        <ViewSection title="Информация о проекте" rows={plan.info} value={value} />
        <BlankContactsTable
          fields={plan.contacts.flat()}
          render={value}
          readOnly
          agNote={notes.ag}
          sgNote={notes.sg}
        />
        <ViewSection title="Проделанная работа" rows={plan.work} value={value} />

        {plan.materials ? (
          <section className="bi-block">
            <h3 className="bi-section">Краткая информация о предлагаемых материалах</h3>
            <div className="bi-materials">{value(plan.materials)}</div>
          </section>
        ) : null}
      </div>

      {plan.extra.length > 0 && (
        <section className="panel extra-crm">
          <h2>Дополнительные поля</h2>
          <p className="hint">Эти поля приходят из CRM и не входят в бланк информирования.</p>
          <dl className="project-view">
            {plan.extra.flat().map((field) => {
              const parent = field.depends_on
                ? String(readValue(project, { ...field, code: field.depends_on }) || '')
                : ''
              const wide =
                field.type === 'text_area' ||
                field.type === 'multiple_list' ||
                field.type === 'materials' ||
                field.type === 'file'
              return (
                <div className={`project-view-row${wide ? ' project-view-wide' : ''}`} key={field.code}>
                  <dt>{field.name}</dt>
                  <dd>
                    <ProjectFieldValue field={field} project={project} parentValue={parent} />
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      )}
    </div>
  )
}

function ViewSection({
  title,
  rows,
  value,
}: {
  title?: string
  rows: CrmFormField[][]
  value: (field: CrmFormField) => ReactNode
}) {
  if (!rows.length) return null
  return (
    <section className="bi-block">
      {title ? <h3 className="bi-section">{title}</h3> : null}
      <table className="bi-grid">
        <tbody>
          {rows.map((row) => (
            <tr key={row.map((field) => field.code).join('+')}>
              <th>{blankLabel(row[0])}</th>
              <td className="bi-fill">
                {row.length === 1 ? (
                  value(row[0])
                ) : (
                  <div className="bi-pair">
                    {row.map((field) => (
                      <div key={field.code}>{value(field)}</div>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
