import { useState, type ReactNode } from 'react'
import { CONTACT_ROWS, PARTNER_COMPANY } from '../data/defaults'
import type { CrmFormField } from '../lib/api/projectTypes'

type Props = {
  fields: CrmFormField[]
  render: (field: CrmFormField) => ReactNode
  readOnly?: boolean
  busy?: boolean
  agNote?: string
  sgNote?: string
  onAgNote?: (value: string) => void
  onSgNote?: (value: string) => void
}

type ContactEntry = {
  id: number
  type: string
  label: string
  value: string
  contact: string
  note: string
}

export function BlankContactsTable({
  fields,
  render,
  readOnly,
  busy,
  agNote = '',
  sgNote = '',
  onAgNote,
  onSgNote,
}: Props) {
  const byCode = new Map(fields.map((field) => [field.code, field]))
  const ag = byCode.get('ag_manager_id')
  const sg = byCode.get('sg_manager_id')
  const people = byCode.get('participant_ids')
  const [entries, setEntries] = useState<ContactEntry[]>([])

  if (!ag && !sg && !people) return null

  function addType(type: string) {
    const row = CONTACT_ROWS.find((item) => item.key === type)
    if (!row) return
    setEntries((current) => [
      ...current,
      {
        id: current.length ? current[current.length - 1].id + 1 : 1,
        type: row.key,
        label: row.label,
        value: '',
        contact: '',
        note: '',
      },
    ])
  }

  function setValue(id: number, value: string) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, value } : entry)))
  }

  function setContact(id: number, contact: string) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, contact } : entry)))
  }

  function setNote(id: number, note: string) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, note } : entry)))
  }

  function removeType(id: number) {
    setEntries((current) => current.filter((entry) => entry.id !== id))
  }

  return (
    <section className="bi-block">
      <h3 className="bi-section">Контактные лица</h3>
      <table className="bi-grid bi-contacts">
        <thead>
          <tr>
            <th />
            <th>ФИО</th>
            <th>Контактная информация</th>
            <th>Примечание</th>
          </tr>
        </thead>
        <tbody>
          {ag ? (
            <tr>
              <th>Ответственный со стороны компании-партнера</th>
              <td>{PARTNER_COMPANY}</td>
              <td className="bi-fill">{render(ag)}</td>
              <td className="bi-fill">
                <NoteCell
                  value={agNote}
                  readOnly={readOnly}
                  disabled={busy}
                  label="Примечание: ответственный партнера"
                  onChange={onAgNote}
                />
              </td>
            </tr>
          ) : null}
          {sg ? (
            <tr>
              <th>Ответственный SG</th>
              <td className="bi-fill">{render(sg)}</td>
              <td />
              <td className="bi-fill">
                <NoteCell
                  value={sgNote}
                  readOnly={readOnly}
                  disabled={busy}
                  label="Примечание: ответственный SG"
                  onChange={onSgNote}
                />
              </td>
            </tr>
          ) : null}
          {people && readOnly ? (
            <tr>
              <th>Контактные лица</th>
              <td className="bi-fill" colSpan={3}>
                {render(people)}
              </td>
            </tr>
          ) : null}
          {people && !readOnly ? (
            <>
              <tr>
                <td className="bi-fill">
                  <ContactRoleSelect onPick={addType} />
                </td>
                <td />
                <td />
                <td />
              </tr>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <th>{entry.label}</th>
                  <td className="bi-fill">
                    <div className="bi-mat-name">
                      <input
                        value={entry.value}
                        aria-label={entry.label}
                        onChange={(e) => setValue(entry.id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="bi-mat-remove"
                        aria-label={`Убрать ${entry.label}`}
                        onClick={() => removeType(entry.id)}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                  <td className="bi-fill">
                    <input
                      value={entry.contact}
                      aria-label={`Контактная информация: ${entry.label}`}
                      onChange={(e) => setContact(entry.id, e.target.value)}
                    />
                  </td>
                  <td className="bi-fill">
                    <NoteCell
                      value={entry.note}
                      label={`Примечание: ${entry.label}`}
                      onChange={(note) => setNote(entry.id, note)}
                    />
                  </td>
                </tr>
              ))}
            </>
          ) : null}
        </tbody>
      </table>
    </section>
  )
}

function NoteCell({
  value,
  onChange,
  readOnly,
  disabled,
  label,
}: {
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  disabled?: boolean
  label: string
}) {
  if (readOnly) return value ? <span>{value}</span> : null
  return (
    <input
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

function ContactRoleSelect({ onPick }: { onPick: (type: string) => void }) {
  return (
    <select
      value=""
      aria-label="Тип контактного лица"
      className="bi-empty"
      onChange={(e) => {
        const type = e.target.value
        if (type) onPick(type)
      }}
    >
      <option value="">Контактные лица</option>
      {CONTACT_ROWS.map((row) => (
        <option key={row.key} value={row.key}>
          {row.label}
        </option>
      ))}
    </select>
  )
}
