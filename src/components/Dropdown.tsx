import { Select } from '@base-ui-components/react/select'
import { useMemo } from 'react'

export type DropdownOption = {
  value: string
  label: string
}

type Props = {
  value: string
  options: readonly DropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  onBlur?: () => void
}

export function Dropdown({
  value,
  options,
  onChange,
  placeholder = '',
  disabled = false,
  label,
  onBlur,
}: Props) {
  const items = useMemo(() => {
    const list = options.filter((option) => option.value !== '')
    if (value && !list.some((option) => option.value === value)) {
      list.unshift({ value, label: value })
    }
    return list
  }, [options, value])
  const labels = useMemo(() => new Map(items.map((option) => [option.value, option.label])), [items])

  return (
    <Select.Root
      value={value}
      disabled={disabled}
      modal={false}
      onValueChange={(next) => onChange(next ?? '')}
      onOpenChange={(open) => {
        if (!open) onBlur?.()
      }}
    >
      <Select.Trigger
        className={`dropdown-trigger${value ? '' : ' bi-empty'}`}
        aria-label={label}
        disabled={disabled}
      >
        <span className="dropdown-value">{value ? (labels.get(value) ?? value) : placeholder}</span>
        <Select.Icon className="dropdown-icon" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="dropdown-positioner"
          side="bottom"
          align="start"
          alignItemWithTrigger={false}
          sideOffset={2}
          collisionPadding={8}
        >
          <Select.Popup className="dropdown-listbox">
            <Select.List>
              <Select.Item value="" className="dropdown-option dropdown-option-muted">
                {placeholder || ' '}
              </Select.Item>
              {items.map((option) => (
                <Select.Item key={option.value} value={option.value} className="dropdown-option">
                  {option.label}
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
