import type { ReactNode } from 'react'
import type { Control, FieldErrors } from 'react-hook-form'
import { PARTNER_COMPANY } from '../data/defaults'
import { blankLabel, planBlankFields } from '../lib/projects/blankLayout'
import type { CrmFormField, CrmProjectFile, CrmProjectMaterial } from '../lib/api/projectTypes'
import type { ProjectFormValues } from '../lib/projects/formValues'
import { ProjectFormField } from './ProjectFormField'

type Props = {
  fields: CrmFormField[]
  control: Control<ProjectFormValues>
  selected: Record<string, string>
  errors: FieldErrors<ProjectFormValues>
  busy: boolean
  files: File[]
  onFilesChange: (files: File[]) => void
  savedFiles: CrmProjectFile[]
  savedMaterials: CrmProjectMaterial[]
  removedFiles: number[]
  onRemovedFilesChange: (ids: number[]) => void
}

export function ProjectBlankSheet({
  fields,
  control,
  selected,
  errors,
  busy,
  files,
  onFilesChange,
  savedFiles,
  savedMaterials,
  removedFiles,
  onRemovedFilesChange,
}: Props) {
  const plan = planBlankFields(fields)

  function cell(field: CrmFormField) {
    return (
      <ProjectFormField
        field={field}
        control={control}
        parentValue={field.depends_on ? (selected[field.depends_on] ?? '') : ''}
        busy={busy}
        error={errors[field.code]?.message}
        files={files}
        onFilesChange={onFilesChange}
        savedFiles={savedFiles}
        savedMaterials={savedMaterials}
        removedFiles={removedFiles}
        onRemovedFilesChange={onRemovedFilesChange}
        embed
      />
    )
  }

  const extraFields = plan.extra.flat()

  return (
    <>
      <div className="bi-sheet">
        <header className="bi-head">
          <div className="bi-title">
            <h2 id="blank-title">Информирование о проекте</h2>
            <p className="bi-company">_________{PARTNER_COMPANY}______________</p>
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
                <td className="bi-fill">{plan.date[0] ? cell(plan.date[0]) : null}</td>
                <td className="bi-fill">{plan.note[0] ? cell(plan.note[0]) : null}</td>
              </tr>
            </tbody>
          </table>
        </header>

        <Section title="Информация о проекте" rows={plan.info} cell={cell} />
        <Section title="Контактные лица" rows={plan.contacts} cell={cell} />
        <Section title="Проделанная работа" rows={plan.work} cell={cell} />

        <h3 className="bi-section">Краткая информация о предлагаемых материалах</h3>
        {plan.materialsLead.length > 0 && (
          <Section rows={plan.materialsLead.map((field) => [field])} cell={cell} />
        )}
        {plan.materials ? <div className="bi-materials">{cell(plan.materials)}</div> : null}
      </div>

      {extraFields.length > 0 && (
        <section className="panel extra-crm">
          <h2>Дополнительные поля</h2>
          <p className="hint">Эти поля приходят из CRM и не входят в бланк информирования.</p>
          <div className="project-form-grid">
            {extraFields.map((field) => (
              <ProjectFormField
                key={field.code}
                field={field}
                control={control}
                parentValue={field.depends_on ? (selected[field.depends_on] ?? '') : ''}
                busy={busy}
                error={errors[field.code]?.message}
                files={files}
                onFilesChange={onFilesChange}
                savedFiles={savedFiles}
                savedMaterials={savedMaterials}
                removedFiles={removedFiles}
                onRemovedFilesChange={onRemovedFilesChange}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function Section({
  title,
  rows,
  cell,
}: {
  title?: string
  rows: import('../lib/api/projectTypes').CrmFormField[][]
  cell: (field: import('../lib/api/projectTypes').CrmFormField) => ReactNode
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
              <td className="bi-fill" colSpan={1}>
                {row.length === 1 ? (
                  cell(row[0])
                ) : (
                  <div className="bi-pair">
                    {row.map((field) => (
                      <div key={field.code}>{cell(field)}</div>
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
