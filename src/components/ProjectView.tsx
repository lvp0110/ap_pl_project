import type { CrmFormField, CrmProject, CrmProjectAccess } from '../lib/api/projectTypes'
import { readValue } from '../lib/projects/formValues'
import { formatDate } from '../lib/projects/view'
import { ProjectFieldValue } from './ProjectFieldValue'

type Props = {
  project: CrmProject
  fields: CrmFormField[]
  access: CrmProjectAccess | null
  onBack: () => void
  onEdit: () => void
}

export function ProjectView({ project, fields, access, onBack, onEdit }: Props) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">CRM ConstrTodo · проект № {project.id}</p>
          <h1>{project.name || 'Без названия'}</h1>
          <p className="lede">
            Обновлён {formatDate(project.updated_at)}
            {access ? ` · доступ «${access}»` : ''}
          </p>
        </div>
        <div className="project-view-actions">
          <button type="button" className="primary" onClick={onEdit}>
            Редактировать
          </button>
          <button type="button" className="ghost" onClick={onBack}>
            К списку
          </button>
        </div>
      </header>

      <dl className="project-view">
        {fields.map((field) => {
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

    </div>
  )
}
