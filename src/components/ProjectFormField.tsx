import { Controller, type Control } from 'react-hook-form'
import type { CrmFormField } from '../lib/api/projectTypes'
import type { ProjectFormValues } from '../lib/projects/formValues'
import { ProjectListField } from './ProjectListField'

const QUARTERS = ['1', '2', '3', '4']

type Props = {
  field: CrmFormField
  control: Control<ProjectFormValues>
  parentValue: string
  busy: boolean
  error?: string
  files: File[]
  onFilesChange: (files: File[]) => void
}

export function ProjectFormField({
  field,
  control,
  parentValue,
  busy,
  error,
  files,
  onFilesChange,
}: Props) {
  if (field.disabled) {
    return (
      <label className="field field-readonly">
        <span className="field-label">{field.name}</span>
        <input value="—" readOnly />
      </label>
    )
  }

  if (field.type === 'file') {
    return (
      <label className="field field-span">
        <span className="field-label">{field.name}</span>
        <input
          type="file"
          multiple
          accept={field.accept && field.accept !== '*/*' ? field.accept : undefined}
          disabled={busy}
          onChange={(e) => onFilesChange([...(e.target.files ?? [])])}
        />
        {files.length > 0 && <span className="field-hint">{files.map((f) => f.name).join(', ')}</span>}
      </label>
    )
  }

  const span = field.type === 'text_area' || field.type === 'multiple_list'

  return (
    <Controller
      control={control}
      name={field.code}
      rules={{ required: field.required ? `${field.name}: заполните поле` : false }}
      render={({ field: controlled }) => (
        <label className={`field${span ? ' field-span' : ''}${error ? ' field-invalid' : ''}`}>
          <span className="field-label">
            {field.name}
            {field.required && ' *'}
          </span>
          {renderControl(field, controlled, parentValue, busy)}
          {error && <span className="field-hint">{error}</span>}
        </label>
      )}
    />
  )
}

type ControlledField = {
  value: string | string[]
  onChange: (value: string | string[]) => void
  onBlur: () => void
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
          value={controlled.value}
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
          <option value="">—</option>
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
