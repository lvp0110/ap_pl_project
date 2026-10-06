import { Combobox } from '@base-ui-components/react/combobox'
import { useEffect, useMemo, useRef, useState } from 'react'
import { activeReferences, listReferences, listSgManagers } from '../lib/api/crm'

type Employee = {
  id: string
  regionId: string
  name: string
}

type RegionGroup = {
  regionId: string
  value: string
  items: Employee[]
}

type Props = {
  value: string
  regionId: string
  disabled: boolean
  onChange: (managerId: string, regionId: string) => void
}

type LoadState = {
  status: 'loading' | 'ready' | 'failed'
  groups: RegionGroup[]
}

const EMPTY: LoadState = { status: 'loading', groups: [] }

export function SgManagerPicker({ value, regionId, disabled, onChange }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState<LoadState>(EMPTY)

  useEffect(() => {
    let active = true
    listReferences('region')
      .then(async (regions) => {
        const groups = await Promise.all(
          activeReferences(regions).map(async (region) => {
            const managers = await listSgManagers(region.id).catch(() => [])
            const seen = new Set<string>()
            const items: Employee[] = []
            for (const manager of managers) {
              if (manager.is_active === false || !manager.name) continue
              const id = String(manager.id)
              if (seen.has(id)) continue
              seen.add(id)
              items.push({ id, regionId: String(region.id), name: manager.name })
            }
            items.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
            return { regionId: String(region.id), value: region.name, items }
          }),
        )
        if (active) setLoaded({ status: 'ready', groups })
      })
      .catch(() => {
        if (active) setLoaded({ status: 'failed', groups: [] })
      })
    return () => {
      active = false
    }
  }, [])

  const groups = loaded.groups
  const selected = useMemo(() => {
    if (!value) return null
    const matches = groups.flatMap((group) => group.items).filter((item) => item.id === value)
    return matches.find((item) => item.regionId === regionId) ?? matches[0] ?? null
  }, [groups, regionId, value])

  const placeholder =
    loaded.status === 'loading'
      ? 'загрузка…'
      : loaded.status === 'failed'
        ? 'список не загрузился'
        : 'выбрать из списка'
  const locked = disabled || loaded.status !== 'ready'

  return (
    <Combobox.Root
      items={groups}
      value={selected as Employee | undefined}
      disabled={locked}
      itemToStringLabel={(item: Employee) => item.name}
      isItemEqualToValue={(item: Employee, current: Employee) =>
        item.id === current.id && item.regionId === current.regionId
      }
      onValueChange={(next: Employee | null) => onChange(next?.id ?? '', next?.regionId ?? '')}
    >
      <div ref={anchorRef} className={`autocomplete-control sg-manager-control${locked ? ' disabled' : ''}`}>
        <Combobox.Input placeholder={placeholder} className="autocomplete-input" />
        {value ? (
          <Combobox.Clear className="autocomplete-tag-remove" aria-label="Очистить">
            ×
          </Combobox.Clear>
        ) : null}
        <Combobox.Trigger className="dropdown-icon-button" disabled={locked} aria-label="Открыть список">
          <Combobox.Icon className="dropdown-icon" />
        </Combobox.Trigger>
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
              {(group: RegionGroup) => (
                <Combobox.Group key={group.regionId} items={group.items} className="dropdown-group">
                  <Combobox.GroupLabel className="dropdown-group-label">{group.value}</Combobox.GroupLabel>
                  <Combobox.Collection>
                    {(employee: Employee) => (
                      <Combobox.Item
                        key={`${group.regionId}-${employee.id}`}
                        value={employee}
                        className="dropdown-option dropdown-option-nested"
                      >
                        {employee.name}
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
