import { Fragment } from 'react'
import type { CrmFormField, CrmProject, CrmProjectMaterial } from '../lib/api/projectTypes'
import { readValue } from '../lib/projects/formValues'
import { loadSheetNotes, materialNote } from '../lib/projects/sheetNotes'
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
    const groups = groupMaterials(project.materials)
    const notes = loadSheetNotes(project.id).materials
    return (
      <table className="bi-grid bi-materials-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Ед. измерения</th>
            <th>Количество</th>
            <th>Цвет</th>
            <th>Примечание</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              {group.brand ? (
                <tr className="bi-mat-group">
                  <td>{group.brand}</td>
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              ) : null}
              {group.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.material.name}</td>
                  <td>{line.material.unit}</td>
                  <td>{line.quantity || ''}</td>
                  <td />
                  <td>{materialNote(notes, line.material.id, line.material.comment || '')}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
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
      if (field.code === 'sale_probability') return <span>{text}%</span>
      return <span>{field.code === 'potential_revenue' ? formatMoney(Number(text)) : text}</span>
    default:
      return <span>{text}</span>
  }
}

function groupMaterials(lines: CrmProjectMaterial[]) {
  const groups: { key: string; brand: string; lines: CrmProjectMaterial[] }[] = []
  for (const line of lines) {
    const brand = line.material.brand?.name || ''
    const last = groups.at(-1)
    if (!last || last.brand !== brand) {
      groups.push({ key: `${brand}:${line.id}`, brand, lines: [line] })
    } else {
      last.lines.push(line)
    }
  }
  return groups
}
