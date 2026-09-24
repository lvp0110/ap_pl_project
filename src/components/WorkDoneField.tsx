import { useMemo, useState } from 'react'
import type { CrmOption } from '../lib/api/projectTypes'

type Props = {
  options: CrmOption[]
  value: string[]
  disabled: boolean
  hint: string
  onChange: (value: string[]) => void
}

export function WorkDoneField({ options, value, disabled, hint, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const labels = useMemo(
    () => new Map(options.map((option) => [option.code, option.name])),
    [options],
  )
  const selected = useMemo(() => new Set(value), [value])
  const available = options.filter((option) => !selected.has(option.code))
  const waiting = hint !== 'начните вводить'
  const emptyText = waiting ? hint : 'Отметьте галочку справа'

  function add(code: string) {
    if (disabled || value.includes(code)) return
    onChange([...value, code])
  }

  function remove(code: string) {
    if (disabled) return
    onChange(value.filter((item) => item !== code))
  }

  return (
    <div className="work-pick">
      <div className="work-pick-row">
        <div className="work-pick-values">
          {value.length === 0 ? (
            <span className="work-pick-empty">{emptyText}</span>
          ) : (
            value.map((code) => (
              <span key={code} className="autocomplete-tag">
                {labels.get(code) ?? code}
                <button
                  type="button"
                  className="autocomplete-tag-remove"
                  aria-label={`Убрать ${labels.get(code) ?? code}`}
                  disabled={disabled}
                  onClick={() => remove(code)}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <label className="work-pick-toggle">
          <input
            type="checkbox"
            checked={open}
            disabled={disabled}
            aria-label="Открыть список проделанной работы"
            onChange={(event) => setOpen(event.target.checked)}
          />
        </label>
      </div>
      {open && (
        <ul className="work-pick-list">
          {waiting ? (
            <li className="work-pick-empty">{hint}</li>
          ) : available.length === 0 ? (
            <li className="work-pick-empty">Все пункты уже в поле</li>
          ) : (
            available.map((option) => (
              <li key={option.code}>
                <button type="button" disabled={disabled} onClick={() => add(option.code)}>
                  {option.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
