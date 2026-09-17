import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { createProject, loadProjectForm } from '../lib/api/projects'
import type { CrmFormField, CrmProject, CrmProjectAccess } from '../lib/api/projectTypes'
import { defaultValues, parentCodes, toPayload, type ProjectFormValues } from '../lib/projects/formValues'
import { ProjectFormField } from './ProjectFormField'

type Props = {
  onCreated: (project: CrmProject) => void
  onCancel: () => void
}

const SUPPLY_YEAR = 'planned_supply_year'
const SUPPLY_QUARTER = 'planned_supply_quarter'

export function ProjectForm({ onCreated, onCancel }: Props) {
  const [fields, setFields] = useState<CrmFormField[]>([])
  const [access, setAccess] = useState<CrmProjectAccess | null>(null)
  const [documents, setDocuments] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState('')

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ProjectFormValues>({ defaultValues: {} })

  const parents = useMemo(() => parentCodes(fields), [fields])
  const parentValues = useWatch({ control, name: parents })

  useEffect(() => {
    let active = true
    loadProjectForm()
      .then((form) => {
        if (!active) return
        setFields(form.fields)
        setAccess(form.access)
        reset(defaultValues(form.fields))
      })
      .catch((err: unknown) => {
        if (active) setFailure(err instanceof Error ? err.message : 'Не удалось загрузить форму проекта')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reset])

  const selected = useMemo(() => {
    const map: Record<string, string> = {}
    parents.forEach((code, index) => {
      const value = parentValues?.[index]
      map[code] = typeof value === 'string' ? value : ''
    })
    return map
  }, [parents, parentValues])

  async function submit(entered: ProjectFormValues) {
    const year = String(entered[SUPPLY_YEAR] ?? '').trim()
    const quarter = String(entered[SUPPLY_QUARTER] ?? '').trim()
    if (Boolean(year) !== Boolean(quarter)) {
      const missing = year ? SUPPLY_QUARTER : SUPPLY_YEAR
      setError(missing, { message: 'Квартал и год поставки заполняются вместе' })
      return
    }
    clearErrors([SUPPLY_YEAR, SUPPLY_QUARTER])

    setSaving(true)
    setFailure('')
    try {
      const project = await createProject(toPayload(fields, entered), documents)
      onCreated(project)
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Не удалось создать проект')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="hint">Загружаем форму проекта…</p>
      </div>
    )
  }

  if (!fields.length) {
    return (
      <div className="page">
        <p className="hint">{failure || 'Форма проекта недоступна.'}</p>
        <button type="button" className="ghost" onClick={onCancel}>
          Назад
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">CRM ConstrTodo</p>
          <h1>Новый проект</h1>
          <p className="lede">
            Форма приходит с сервера: {fields.length} полей, уровень доступа «{access}».
          </p>
        </div>
      </header>

      {failure && <p className="hint field-invalid">{failure}</p>}

      <form className="project-form" onSubmit={handleSubmit(submit)}>
        <div className="project-form-grid">
          {fields.map((field) => (
            <ProjectFormField
              key={field.code}
              field={field}
              control={control}
              parentValue={field.depends_on ? (selected[field.depends_on] ?? '') : ''}
              busy={saving}
              error={errors[field.code]?.message}
              files={documents}
              onFilesChange={setDocuments}
            />
          ))}
        </div>

        <div className="project-form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Создать проект'}
          </button>
          <button type="button" className="ghost" disabled={saving} onClick={onCancel}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  )
}
