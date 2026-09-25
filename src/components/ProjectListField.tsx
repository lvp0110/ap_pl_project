import { useEffect, useState } from 'react'
import { loadFieldOptions } from '../lib/api/projects'
import type { CrmFormField, CrmOption } from '../lib/api/projectTypes'
import { fieldSourcePath } from '../lib/projects/fieldSource'
import { OptionAutocomplete } from './OptionAutocomplete'
import { OptionCombobox } from './OptionCombobox'
import { WorkDoneField } from './WorkDoneField'

type Props = {
  field: CrmFormField
  value: string | string[]
  parentValue: string
  disabled: boolean
  invalid?: boolean
  error?: string
  onChange: (value: string | string[]) => void
  projectId?: number
}

type Loaded = {
  key: string
  options: CrmOption[]
  failed: boolean
}

const EMPTY: Loaded = { key: '', options: [], failed: false }

export function ProjectListField({ field, value, parentValue, disabled, invalid, error, onChange, projectId }: Props) {
  const blocked = Boolean(field.depends_on) && !parentValue
  const key = !field.endpoint || blocked ? '' : `${field.endpoint}|${field.depends_on ?? ''}=${parentValue}`

  const [loaded, setLoaded] = useState<Loaded>(EMPTY)
  const ready = Boolean(key) && loaded.key === key
  const loading = Boolean(key) && !ready
  const options = ready ? loaded.options : []

  useEffect(() => {
    if (!key || !field.endpoint) return
    let active = true
    const paramKey = field.query?.trim() || field.depends_on
    const params = paramKey && parentValue ? { [paramKey]: parentValue } : {}
    loadFieldOptions(field.endpoint, params)
      .then((rows) => {
        if (active) setLoaded({ key, options: rows, failed: false })
      })
      .catch(() => {
        if (active) setLoaded({ key, options: [], failed: true })
      })
    return () => {
      active = false
    }
  }, [key, field.endpoint, field.depends_on, field.query, parentValue])

  useEffect(() => {
    if (blocked) {
      if (Array.isArray(value) ? value.length : value) onChange(Array.isArray(value) ? [] : '')
      return
    }
    if (!ready) return
    const codes = new Set(loaded.options.map((option) => option.code))
    if (Array.isArray(value)) {
      const kept = value.filter((item) => codes.has(item))
      if (kept.length !== value.length) onChange(kept)
      return
    }
    if (value && !codes.has(value)) onChange('')
  }, [blocked, ready, loaded, value, onChange])

  const hint = placeholder(blocked, loading, loaded.failed && ready, options.length)

  if (field.code === 'documentation_type_ids') {
    return (
      <WorkDoneField
        label={field.name.trim() || field.code}
        options={options}
        value={Array.isArray(value) ? value : []}
        disabled={disabled || blocked}
        hint={hint}
        invalid={invalid}
        error={error}
        onChange={onChange}
        sourcePath={fieldSourcePath(field, projectId)}
      />
    )
  }

  if (field.type === 'multiple_list') {
    return (
      <OptionAutocomplete
        options={options}
        value={Array.isArray(value) ? value : []}
        disabled={disabled || blocked}
        placeholder={hint}
        onChange={onChange}
      />
    )
  }

  return (
    <OptionCombobox
      options={options}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled || blocked}
      placeholder={hint}
      onChange={onChange}
    />
  )
}

function placeholder(blocked: boolean, loading: boolean, failed: boolean, count: number): string {
  if (blocked) return 'сначала выберите значение выше'
  if (loading) return 'загрузка…'
  if (failed) return 'список не загрузился'
  if (!count) return 'пусто'
  return 'начните вводить'
}
