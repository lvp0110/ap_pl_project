import { Combobox } from '@base-ui-components/react/combobox'
import { useMemo } from 'react'
import type { CrmOption } from '../lib/api/projectTypes'

type Props = {
  options: CrmOption[]
  value: string[]
  disabled: boolean
  placeholder: string
  onChange: (value: string[]) => void
}

export function OptionAutocomplete({ options, value, disabled, placeholder, onChange }: Props) {
  const codes = useMemo(() => options.map((option) => option.code), [options])
  const labels = useMemo(
    () => new Map(options.map((option) => [option.code, option.name])),
    [options],
  )
  const label = (code: string) => labels.get(code) ?? code

  return (
    <Combobox.Root
      items={codes}
      multiple
      value={value}
      disabled={disabled}
      itemToStringLabel={label}
      onValueChange={onChange}
    >
      <Combobox.Chips className={`autocomplete-control${disabled ? ' disabled' : ''}`}>
        {value.map((code) => (
          <Combobox.Chip key={code} className="autocomplete-tag">
            {label(code)}
            <span
              role="button"
              tabIndex={-1}
              className="autocomplete-tag-remove"
              aria-label={`Убрать ${label(code)}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation()
                if (!disabled) onChange(value.filter((item) => item !== code))
              }}
            >
              ×
            </span>
          </Combobox.Chip>
        ))}
        <Combobox.Input placeholder={value.length ? '' : placeholder} className="autocomplete-input" />
      </Combobox.Chips>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="autocomplete-positioner">
          <Combobox.Popup className="autocomplete-listbox">
            <Combobox.Empty className="autocomplete-empty">Ничего не найдено</Combobox.Empty>
            <Combobox.List>
              {(code: string) => (
                <Combobox.Item key={code} value={code} className="autocomplete-option">
                  {label(code)}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
