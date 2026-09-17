import type { CrmFormField, CrmProject } from '../lib/api/projectTypes'
import { readValue } from '../lib/projects/formValues'
import { formatDate, formatMoney } from '../lib/projects/view'
import { OptionValue } from './OptionValue'

type Props = {
  field: CrmFormField
  project: CrmProject
  parentValue: string
}

export function ProjectFieldValue({ field, project, parentValue }: Props) {
  const value = readValue(project, field)

  if (field.type === 'file') {
    if (!project.files.length) return <span className="value-empty">—</span>
    return (
      <span className="value-files">
        {project.files.map((file) => (
          <a key={file.id} href={file.download_url} target="_blank" rel="noreferrer">
            {file.original_name}
          </a>
        ))}
      </span>
    )
  }

  if (field.type === 'list' || field.type === 'multiple_list') {
    return <OptionValue field={field} value={value} parentValue={parentValue} />
  }

  const text = typeof value === 'string' ? value : ''
  if (!text) return <span className="value-empty">—</span>

  switch (field.type) {
    case 'date':
      return <span>{formatDate(text)}</span>
    case 'quarter':
      return <span>{text} квартал</span>
    case 'number':
      return <span>{field.code === 'potential_revenue' ? formatMoney(Number(text)) : text}</span>
    default:
      return <span>{text}</span>
  }
}
