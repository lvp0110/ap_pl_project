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

  if (field.type === 'materials') {
    if (!project.materials.length) return <span className="value-empty">—</span>
    return (
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Материал</th>
              <th>Комментарий</th>
              <th>Кол-во</th>
              <th>Ед.</th>
              <th>Цена</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {project.materials.map((line) => (
              <tr key={line.id}>
                <td>{line.material.article || '—'}</td>
                <td className="name-cell">{line.material.name}</td>
                <td>{line.material.comment || '—'}</td>
                <td>{line.quantity}</td>
                <td>{line.material.unit}</td>
                <td>{formatMoney(line.unit_price)}</td>
                <td>{formatMoney(line.line_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (field.type === 'list' || field.type === 'multiple_list') {
    return (
      <OptionValue
        field={field}
        value={typeof value === 'string' ? value : value.filter((item) => typeof item === 'string')}
        parentValue={parentValue}
      />
    )
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
