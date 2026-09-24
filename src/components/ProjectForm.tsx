import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { createProject, loadProjectForm, submitProject, updateProject } from '../lib/api/projects'
import {
  type CrmFormField,
  type CrmProject,
  type CrmProjectFile,
  type CrmProjectMaterial,
} from '../lib/api/projectTypes'
import {
  defaultValues,
  initialValues,
  isFormComplete,
  parentCodes,
  toPatch,
  toPayload,
  type ProjectFormValues,
} from '../lib/projects/formValues'
import { adoptSheetNotes } from '../lib/projects/sheetNotes'
import { ProjectBlankSheet } from './ProjectBlankSheet'

type Props = {
  project?: CrmProject
  onSaved: (project: CrmProject, asDraft?: boolean) => void
  onCancel: () => void
}

const SUPPLY_YEAR = 'planned_supply_year'
const SUPPLY_QUARTER = 'planned_supply_quarter'
const NO_FILES: CrmProjectFile[] = []
const NO_MATERIALS: CrmProjectMaterial[] = []

export function ProjectForm({ project, onSaved, onCancel }: Props) {
  const [fields, setFields] = useState<CrmFormField[]>([])
  const [savedId, setSavedId] = useState<number | undefined>(project?.id)
  const [documents, setDocuments] = useState<File[]>([])
  const [removedFiles, setRemovedFiles] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState('')
  const [initial, setInitial] = useState<ProjectFormValues>({})
  const [confirmLeave, setConfirmLeave] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<ProjectFormValues>({ defaultValues: {} })

  const parents = useMemo(() => parentCodes(fields), [fields])
  const parentValues = useWatch({ control, name: parents })
  const allValues = useWatch({ control })
  const fileCount = (project?.files.length ?? 0) - removedFiles.length + documents.length
  const complete = isFormComplete(
    fields,
    (allValues as ProjectFormValues | undefined) ?? initial,
    fileCount,
  )

  useEffect(() => {
    let active = true
    loadProjectForm()
      .then((form) => {
        if (!active) return
        setFields(form.fields)
        const start = project ? initialValues(form.fields, project) : defaultValues(form.fields)
        setInitial(start)
        reset(start)
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
  }, [reset, project])

  const watched = (allValues as ProjectFormValues | undefined) ?? {}
  const dirty = useMemo(() => {
    if (!fields.length) return false
    if (documents.length > 0 || removedFiles.length > 0) return true
    return Object.keys(toPatch(fields, initial, watched)).length > 0
  }, [fields, documents.length, removedFiles, initial, watched])

  const selected = useMemo(() => {
    const map: Record<string, string> = {}
    parents.forEach((code, index) => {
      const value = parentValues?.[index]
      map[code] = typeof value === 'string' ? value : ''
    })
    return map
  }, [parents, parentValues])

  function draftValues(entered: ProjectFormValues): ProjectFormValues {
    const year = String(entered[SUPPLY_YEAR] ?? '').trim()
    const quarter = String(entered[SUPPLY_QUARTER] ?? '').trim()
    if (Boolean(year) === Boolean(quarter)) return entered
    return { ...entered, [SUPPLY_YEAR]: '', [SUPPLY_QUARTER]: '' }
  }

  async function store(entered: ProjectFormValues, asDraft: boolean) {
    const id = savedId ?? project?.id
    const values = id ? toPatch(fields, initial, entered) : toPayload(fields, entered)
    if (removedFiles.length) values.remove_file_ids = removedFiles
    if (!id && asDraft && (typeof values.name !== 'string' || !String(values.name).trim())) {
      values.name = 'Черновик'
    }

    const nothing = !Object.keys(values).length && !documents.length
    if (nothing) {
      setFailure('Изменений нет.')
      return
    }

    setSaving(true)
    setFailure('')
    try {
      let saved = project
      let nextId = id
      if (!nextId) {
        saved = await createProject(values, documents)
        nextId = saved.id
        setSavedId(nextId)
        adoptSheetNotes(nextId)
      } else if (!nothing) {
        saved = await updateProject(nextId, values, documents)
      }
      if (asDraft) {
        if (saved) onSaved(saved, true)
        return
      }
      const wasSubmitted = project?.document_status?.toLowerCase() === 'submitted'
      if (!wasSubmitted) {
        if (!nextId) return
        saved = await submitProject(nextId)
      }
      if (saved) onSaved(saved)
    } catch (err) {
      setFailure(err instanceof Error ? err.message : asDraft ? 'Не удалось сохранить черновик' : 'Не удалось сохранить проект')
    } finally {
      setSaving(false)
    }
  }

  async function submit(entered: ProjectFormValues) {
    if (!dirty || !complete) return
    const year = String(entered[SUPPLY_YEAR] ?? '').trim()
    const quarter = String(entered[SUPPLY_QUARTER] ?? '').trim()
    if (Boolean(year) !== Boolean(quarter)) {
      const missing = year ? SUPPLY_QUARTER : SUPPLY_YEAR
      setError(missing, { message: 'Квартал и год поставки заполняются вместе' })
      return
    }
    clearErrors([SUPPLY_YEAR, SUPPLY_QUARTER])
    await store(entered, false)
  }

  function persistDraft() {
    if (!dirty) return
    return store(draftValues(getValues()), true)
  }

  function requestLeave() {
    if (!dirty) {
      onCancel()
      return
    }
    setConfirmLeave(true)
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
    <div className="page bi-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Бланк информирования{project ? ` · проект № ${project.id}` : ''}</p>
          <h1>{project ? project.name || 'Без названия' : 'Заполнить бланк'}</h1>
        </div>
      </header>

      {failure && <p className="hint field-invalid">{failure}</p>}

      <form className="project-form" onSubmit={handleSubmit((entered) => submit(entered))}>
        <ProjectBlankSheet
          fields={fields}
          control={control}
          selected={selected}
          errors={errors}
          busy={saving}
          files={documents}
          onFilesChange={setDocuments}
          savedFiles={project?.files ?? NO_FILES}
          savedMaterials={project?.materials ?? NO_MATERIALS}
          removedFiles={removedFiles}
          onRemovedFilesChange={setRemovedFiles}
          notesKey={project?.id ?? 'new'}
        />

        <div className="project-form-actions">
          {confirmLeave && (
            <p className="unsaved-warning">
              Есть несохранённые данные. Закрыть бланк без сохранения?
              <button type="button" className="ghost" onClick={() => setConfirmLeave(false)}>
                Остаться
              </button>
              <button type="button" className="danger" onClick={onCancel}>
                Закрыть
              </button>
            </p>
          )}
          <button type="button" className="ghost" disabled={saving} onClick={requestLeave}>
            К списку
          </button>
          <button
            type="button"
            className={complete ? 'ghost' : 'primary'}
            disabled={!dirty || saving}
            onClick={() => void persistDraft()}
          >
            {saving ? 'Сохраняем…' : 'Сохранить черновик'}
          </button>
          <button type="submit" className={complete ? 'primary' : 'ghost'} disabled={!dirty || !complete || saving}>
            {saving ? 'Сохраняем…' : 'Сохранить бланк'}
          </button>
        </div>
      </form>
    </div>
  )
}
