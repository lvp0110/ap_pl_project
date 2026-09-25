import { Popover } from '@base-ui-components/react/popover'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadFieldOptions } from '../lib/api/projects'
import type { CrmFormField, CrmOption } from '../lib/api/projectTypes'

const PICK_LABEL = 'Выбрать'

type Props = {
  label: string
  options: CrmOption[]
  value: string[]
  disabled: boolean
  hint: string
  invalid?: boolean
  error?: string
  onChange: (value: string[]) => void
}

export function WorkDoneField({ label, options, value, disabled, hint, invalid, error, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const cellRef = useRef<HTMLTableCellElement>(null)
  const labels = useMemo(
    () => new Map(options.map((option) => [option.code, option.name])),
    [options],
  )
  const selected = useMemo(() => new Set(value), [value])
  const waiting = hint !== 'начните вводить'
  const prompt = waiting || !options.length ? hint : PICK_LABEL

  function toggle(code: string) {
    if (disabled) return
    if (selected.has(code)) onChange(value.filter((item) => item !== code))
    else onChange([...value, code])
  }

  const pick = (
    <td ref={cellRef} className={`bi-fill${invalid ? ' cell-invalid' : ''}`}>
      <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
        <Popover.Trigger className="dropdown-trigger bi-empty" disabled={disabled || waiting || !options.length} aria-label={prompt}>
          <span className="dropdown-value">{prompt}</span>
          <span className="dropdown-icon" aria-hidden="true">
            ▼
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            anchor={cellRef}
            className="dropdown-positioner"
            side="bottom"
            align="start"
            sideOffset={2}
            collisionPadding={8}
          >
            <Popover.Popup className="dropdown-listbox" initialFocus={false} finalFocus={false}>
              {waiting || options.length === 0 ? (
                <div className="dropdown-empty">{hint}</div>
              ) : (
                options.map((option) => (
                  <label key={option.code} className="dropdown-option dropdown-check">
                    <input
                      type="checkbox"
                      checked={selected.has(option.code)}
                      disabled={disabled}
                      onChange={() => toggle(option.code)}
                    />
                    <span>{option.name}</span>
                  </label>
                ))
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {error ? <span className="field-hint">{error}</span> : null}
    </td>
  )

  if (!value.length) {
    return (
      <tr>
        <th>{label}</th>
        {pick}
      </tr>
    )
  }

  return (
    <>
      <tr>
        <th className="work-done-label" rowSpan={value.length + 1}>
          {label}
        </th>
        <td className="bi-fill">{labels.get(value[0]) ?? value[0]}</td>
      </tr>
      {value.slice(1).map((code) => (
        <tr key={code}>
          <td className="bi-fill">{labels.get(code) ?? code}</td>
        </tr>
      ))}
      <tr>{pick}</tr>
    </>
  )
}

export function WorkDoneRowsView({ field, value }: { field: CrmFormField; value: string[] }) {
  const key = field.endpoint ? field.endpoint : ''
  const [options, setOptions] = useState<CrmOption[]>([])

  useEffect(() => {
    if (!key || !value.length) return
    let active = true
    loadFieldOptions(key, {})
      .then((rows) => {
        if (active) setOptions(rows)
      })
      .catch(() => {
        if (active) setOptions([])
      })
    return () => {
      active = false
    }
  }, [key, value.length])

  const labels = useMemo(() => new Map(options.map((option) => [option.code, option.name])), [options])
  if (!value.length) return null

  return (
    <>
      <tr>
        <th className="work-done-label" rowSpan={value.length}>
          {field.name.trim() || field.code}
        </th>
        <td className="bi-fill">{labels.get(value[0]) ?? value[0]}</td>
      </tr>
      {value.slice(1).map((code) => (
        <tr key={code}>
          <td className="bi-fill">{labels.get(code) ?? code}</td>
        </tr>
      ))}
    </>
  )
}
