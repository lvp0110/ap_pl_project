import { Combobox } from '@base-ui-components/react/combobox'
import { useMemo, useRef } from 'react'
import type { CrmOption } from '../lib/api/projectTypes'

type Props = {
  options: CrmOption[]
  value: string
  disabled: boolean
  placeholder: string
  onChange: (value: string) => void
}

export function OptionCombobox({ options, value, disabled, placeholder, onChange }: Props) {
  const codes = useMemo(() => options.map((option) => option.code), [options])
  const labels = useMemo(
    () => new Map(options.map((option) => [option.code, option.name])),
    [options],
  )
  const anchorRef = useRef<HTMLDivElement>(null)

  return (
    <Combobox.Root
      items={codes}
      value={value}
      disabled={disabled}
      itemToStringLabel={(code: string) => labels.get(code) ?? code}
      onValueChange={(next: string | null) => onChange(next ?? '')}
    >
      <div ref={anchorRef} className={`autocomplete-control${disabled ? ' disabled' : ''}`}>
        <Combobox.Input placeholder={placeholder} className="autocomplete-input" />
        {value && (
          <Combobox.Clear className="autocomplete-tag-remove" aria-label="Очистить">
            ×
          </Combobox.Clear>
        )}
      </div>

      <Combobox.Portal>
        <Combobox.Positioner
          anchor={anchorRef}
          side="bottom"
          align="start"
          sideOffset={2}
          collisionPadding={8}
          className="dropdown-positioner"
        >
          <Combobox.Popup className="dropdown-listbox">
            <Combobox.Empty className="dropdown-empty">Ничего не найдено</Combobox.Empty>
            <Combobox.List>
              {(code: string) => (
                <Combobox.Item key={code} value={code} className="dropdown-option">
                  {labels.get(code) ?? code}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
