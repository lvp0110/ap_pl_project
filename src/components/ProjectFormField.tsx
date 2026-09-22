import { Controller, type Control } from 'react-hook-form'
import type { CrmFormField, CrmProjectFile, CrmProjectMaterial } from '../lib/api/projectTypes'
import { asMaterials, type ProjectFieldValue, type ProjectFormValues } from '../lib/projects/formValues'
import { ProjectListField } from './ProjectListField'
import { ProjectMaterialsField } from './ProjectMaterialsField'

const QUARTERS = ['1', '2', '3', '4']

type Props = {
  field: CrmFormField
  control: Control<ProjectFormValues>
  parentValue: string
  busy: boolean
  error?: string
  files: File[]
  onFilesChange: (files: File[]) => void
  savedFiles: CrmProjectFile[]
  savedMaterials: CrmProjectMaterial[]
  removedFiles: number[]
  onRemovedFilesChange: (ids: number[]) => void
  embed?: boolean
}

export function ProjectFormField({
  field,
  control,
  parentValue,
  busy,
  error,
  files,
  onFilesChange,
  savedFiles,
  savedMaterials,
  removedFiles,
  onRemovedFilesChange,
  embed,
}: Props) {
  if (field.disabled) {
    if (embed) return <input className="bi-input" value="" readOnly />
    return (
      <label className="field field-readonly">
        <span className="field-label">{field.name}</span>
        <input value="—" readOnly />
      </label>
    )
  }

  if (field.type === 'file') {
    const body = (
      <>
        {savedFiles.length > 0 && (
          <ul className="saved-files">
            {savedFiles.map((saved) => {
              const removed = removedFiles.includes(saved.id)
              return (
                <li key={saved.id} className={removed ? 'removed' : ''}>
                  <a href={saved.download_url} target="_blank" rel="noreferrer">
                    {saved.original_name}
                  </a>
                  <button
                    type="button"
                    className="ghost"
                    disabled={busy}
                    onClick={() =>
                      onRemovedFilesChange(
                        removed
                          ? removedFiles.filter((id) => id !== saved.id)
                          : [...removedFiles, saved.id],
                      )
                    }
                  >
                    {removed ? 'Вернуть' : 'Убрать'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <input
          type="file"
          multiple
          accept={field.accept && field.accept !== '*/*' ? field.accept : undefined}
          disabled={busy}
          onChange={(e) => onFilesChange([...(e.target.files ?? [])])}
        />
        {files.length > 0 && <span className="field-hint">{files.map((f) => f.name).join(', ')}</span>}
      </>
    )
    if (embed) return <div className="bi-file">{body}</div>
    return (
      <div className="field field-span">
        <span className="field-label">{field.name}</span>
        {body}
      </div>
    )
  }

  const span = field.type === 'text_area' || field.type === 'multiple_list' || field.type === 'materials'

  if (field.type === 'materials') {
    return (
      <Controller
        control={control}
        name={field.code}
        render={({ field: controlled }) => (
          <div className="field field-span">
            <span className="field-label">{field.name}</span>
            <ProjectMaterialsField
              value={asMaterials(controlled.value)}
              saved={savedMaterials}
              disabled={busy}
              onChange={controlled.onChange}
            />
          </div>
        )}
      />
    )
  }

  return (
    <Controller
      control={control}
      name={field.code}
      rules={{ required: field.required ? `${field.name}: заполните поле` : false }}
      render={({ field: controlled }) =>
        embed ? (
          <div className={`bi-control${error ? ' field-invalid' : ''}`}>
            {renderControl(field, controlled, parentValue, busy)}
            {error && <span className="field-hint">{error}</span>}
          </div>
        ) : (
          <label className={`field${span ? ' field-span' : ''}${error ? ' field-invalid' : ''}`}>
            <span className="field-label">
              {field.name}
              {field.required && ' *'}
            </span>
            {renderControl(field, controlled, parentValue, busy)}
            {error && <span className="field-hint">{error}</span>}
          </label>
        )
      }
    />
  )
}

type ControlledField = {
  value: ProjectFieldValue
  onChange: (value: ProjectFieldValue) => void
  onBlur: () => void
}

function toCodes(value: ProjectFieldValue): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function renderControl(
  field: CrmFormField,
  controlled: ControlledField,
  parentValue: string,
  busy: boolean,
) {
  const text = typeof controlled.value === 'string' ? controlled.value : ''

  switch (field.type) {
    case 'list':
    case 'multiple_list':
      return (
        <ProjectListField
          field={field}
          value={typeof controlled.value === 'string' ? controlled.value : toCodes(controlled.value)}
          parentValue={parentValue}
          disabled={busy}
          onChange={controlled.onChange}
        />
      )
    case 'text_area':
      return (
        <textarea
          rows={3}
          value={text}
          disabled={busy}
          onBlur={controlled.onBlur}
          onChange={(e) => controlled.onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={text}
          disabled={busy}
          onBlur={controlled.onBlur}
          onChange={(e) => controlled.onChange(e.target.value)}
        />
      )
    case 'date':
      return (
        <input
          type="date"
          value={text}
          disabled={busy}
          onBlur={controlled.onBlur}
          onChange={(e) => controlled.onChange(e.target.value)}
        />
      )
    case 'quarter':
      return (
        <select
          value={text}
          disabled={busy}
          onBlur={controlled.onBlur}
          onChange={(e) => controlled.onChange(e.target.value)}
        >
          <option value="" />
          {QUARTERS.map((quarter) => (
            <option key={quarter} value={quarter}>
              {quarter} квартал
            </option>
          ))}
        </select>
      )
    default:
      return (
        <input
          value={text}
          disabled={busy}
          onBlur={controlled.onBlur}
          onChange={(e) => controlled.onChange(e.target.value)}
        />
      )
  }
}
