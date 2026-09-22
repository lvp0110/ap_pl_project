import type { ReactNode } from 'react'
import { useState } from 'react'
import type { Control, FieldErrors } from 'react-hook-form'
import { PARTNER_COMPANY } from '../data/defaults'
import { blankLabel, planBlankFields } from '../lib/projects/blankLayout'
import type { CrmFormField, CrmProjectFile, CrmProjectMaterial } from '../lib/api/projectTypes'
import type { ProjectFormValues } from '../lib/projects/formValues'
import { loadSheetNotes, saveSheetNotes } from '../lib/projects/sheetNotes'
import { BlankContactsTable } from './BlankContactsTable'
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
  notesKey: number | string
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
  notesKey,
}: Props) {
  const plan = planBlankFields(fields)
  const [liveRevenue, setLiveRevenue] = useState(() =>
    savedMaterials.reduce((sum, line) => sum + line.line_amount, 0),
  )
  const [notes, setNotes] = useState(() => loadSheetNotes(notesKey))
  const headerField = plan.note[0]
  const crmHeader = Boolean(headerField && !headerField.disabled)

  function patchNotes(partial: Partial<typeof notes>) {
    const stored = loadSheetNotes(notesKey)
    const next = { ...stored, ...notes, ...partial }
    if (!partial.materials) next.materials = stored.materials
    setNotes(next)
    saveSheetNotes(notesKey, next)
  }

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
        onMaterialsTotal={field.type === 'materials' ? setLiveRevenue : undefined}
        notesKey={field.type === 'materials' ? notesKey : undefined}
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
                <td className="bi-fill">{plan.date[0] ? cell(plan.date[0]) : null}</td>
                <td className="bi-fill">
                  {headerField && crmHeader ? (
                    cell(headerField)
                  ) : (
                    <input
                      value={notes.header}
                      disabled={busy}
                      aria-label="Примечание"
                      onChange={(e) => patchNotes({ header: e.target.value })}
                    />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </header>

        <Section title="Информация о проекте" rows={plan.info} cell={cell} />
        <BlankContactsTable
          fields={plan.contacts.flat()}
          render={cell}
          agNote={notes.ag}
          sgNote={notes.sg}
          onAgNote={(ag) => patchNotes({ ag })}
          onSgNote={(sg) => patchNotes({ sg })}
          busy={busy}
        />
        <Section title="Проделанная работа" rows={plan.work} cell={cell} />

        {plan.materials ? (
          <section className="bi-block">
            <h3 className="bi-section">Краткая информация о предлагаемых материалах</h3>
            <div className="bi-materials">{cell(plan.materials)}</div>
          </section>
        ) : null}
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
                displayValue={field.code === 'potential_revenue' ? liveRevenue : undefined}
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
