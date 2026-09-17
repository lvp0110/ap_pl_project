import { useEffect, useState } from 'react'
import { loadFieldOptions } from '../lib/api/projects'
import type { CrmFormField, CrmOption } from '../lib/api/projectTypes'

type Props = {
  field: CrmFormField
  value: string | string[]
  parentValue: string
}

type Loaded = {
  key: string
  options: CrmOption[]
}

export function OptionValue({ field, value, parentValue }: Props) {
  const codes = Array.isArray(value) ? value : value ? [value] : []
  const key = field.endpoint ? `${field.endpoint}|${field.depends_on ?? ''}=${parentValue}` : ''
  const [loaded, setLoaded] = useState<Loaded>({ key: '', options: [] })
  const ready = Boolean(key) && loaded.key === key

  useEffect(() => {
    if (!key || !field.endpoint || !codes.length) return
    let active = true
    const params = field.depends_on && parentValue ? { [field.depends_on]: parentValue } : {}
    loadFieldOptions(field.endpoint, params)
      .then((rows) => {
        if (active) setLoaded({ key, options: rows })
      })
      .catch(() => {
        if (active) setLoaded({ key, options: [] })
      })
    return () => {
      active = false
    }
  }, [key, field.endpoint, field.depends_on, parentValue, codes.length])

  if (!codes.length) return <span className="value-empty">—</span>
  if (!ready) return <span className="value-empty">загрузка…</span>

  const names = codes.map((code) => loaded.options.find((option) => option.code === code)?.name ?? code)

  if (field.type === 'multiple_list') {
    return (
      <span className="value-tags">
        {names.map((name, index) => (
          <span className="autocomplete-tag" key={`${codes[index]}-${name}`}>
            {name}
          </span>
        ))}
      </span>
    )
  }

  return <span>{names[0]}</span>
}
