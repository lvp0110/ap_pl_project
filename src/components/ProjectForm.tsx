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

  async function store(entered: ProjectFormValues, asDraft: boolean, leaveIfUnchanged = false) {
    const id = savedId ?? project?.id
    const values = id ? toPatch(fields, initial, entered) : toPayload(fields, entered)
    if (removedFiles.length) values.remove_file_ids = removedFiles
    if (!id && asDraft && (typeof values.name !== 'string' || !String(values.name).trim())) {
      values.name = 'Черновик'
    }

    const nothing = !Object.keys(values).length && !documents.length
    if (asDraft && id && nothing) {
      onCancel()
      return
    }
    if (!asDraft && id && nothing && project?.document_status?.toLowerCase() === 'submitted') {
      if (leaveIfUnchanged) onCancel()
      else setFailure('Изменений нет.')
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
      if (wasSubmitted && saved) {
        onSaved(saved)
        return
      }
      onSaved(await submitProject(nextId))
    } catch (err) {
      setFailure(err instanceof Error ? err.message : asDraft ? 'Не удалось сохранить черновик' : 'Не удалось сохранить проект')
    } finally {
      setSaving(false)
    }
  }

  async function submit(entered: ProjectFormValues, leaveIfUnchanged = false) {
    const year = String(entered[SUPPLY_YEAR] ?? '').trim()
    const quarter = String(entered[SUPPLY_QUARTER] ?? '').trim()
    if (Boolean(year) !== Boolean(quarter)) {
      const missing = year ? SUPPLY_QUARTER : SUPPLY_YEAR
      setError(missing, { message: 'Квартал и год поставки заполняются вместе' })
      return
    }
    clearErrors([SUPPLY_YEAR, SUPPLY_QUARTER])
    await store(entered, false, leaveIfUnchanged)
  }

  function persistDraft() {
    return store(draftValues(getValues()), true)
  }

  function leaveToList() {
    if (complete) return submit(getValues(), true)
    return persistDraft()
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
          <button
            type={complete ? 'submit' : 'button'}
            className="primary"
            disabled={saving}
            onClick={complete ? undefined : () => void persistDraft()}
          >
            {saving ? 'Сохраняем…' : complete ? 'Сохранить бланк' : 'Сохранить черновик'}
          </button>
          <button type="button" className="ghost" disabled={saving} onClick={() => void leaveToList()}>
            К списку
          </button>
        </div>
      </form>
    </div>
  )
}
