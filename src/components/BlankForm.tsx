import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CONTACT_ROWS, PARTNER_COMPANY } from '../data/defaults'
import { collectBlankErrors } from '../lib/validate'
import type { Catalogs, Contact, MaterialLine, Project } from '../types'

type Props = {
  project: Project
  catalogs: Catalogs
  isNew: boolean
  onChange: (next: Project) => void
  onSave: () => void
  onClose: () => void
  onDelete?: () => void
}

export function BlankForm({
  project,
  catalogs,
  isNew,
  onChange,
  onSave,
  onClose,
  onDelete,
}: Props) {
  const [showErrors, setShowErrors] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const check = useMemo(() => collectBlankErrors(project), [project])
  const complete = check.messages.length === 0

  function invalid(key: string) {
    return showErrors && check.keys.has(key)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function patch(partial: Partial<Project>) {
    onChange({ ...project, ...partial })
  }

  function setContact(key: keyof Project['contacts'], next: Contact) {
    patch({ contacts: { ...project.contacts, [key]: next } })
  }

  function setMaterial(index: number, next: MaterialLine) {
    const materials = project.materials.map((line, i) => (i === index ? next : line))
    patch({ materials })
  }

  function handleSubmit() {
    if (check.messages.length > 0) {
      setShowErrors(true)
      requestAnimationFrame(() => {
        sheetRef.current
          ?.querySelector('.field-invalid, .cell-invalid, .control-invalid')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }
    onSave()
  }

  return (
    <div className="blank-root">
      <button type="button" className="blank-backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="blank-sheet" ref={sheetRef} role="dialog" aria-labelledby="blank-title">
        <header className="blank-head">
          <div>
            <p className="eyebrow">Saint-Gobain Construction Products RUS · ECOPHON</p>
            <h2 id="blank-title">Бланк информирования</h2>
            <p className="lede">
              Информирование о работе по проекту от компании Акустик Групп. Жёлтые графы заполняет менеджер.
              Поля со * обязательны.
            </p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            К списку
          </button>
        </header>

        <div className={`check-banner ${complete ? 'ok' : 'bad'}`}>
          <strong>{complete ? 'БЛАНК ЗАПОЛНЕН ПОЛНОСТЬЮ' : 'БЛАНК НЕ ЗАПОЛНЕН'}</strong>
          {!complete && <span>{check.messages.join('; ')}</span>}
        </div>

        <form
          className="blank-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <fieldset>
            <legend>Служебные отметки</legend>
            <Field label="№ заявки на резервирование">
              <input
                value={project.applicationNumber}
                onChange={(e) => patch({ applicationNumber: e.target.value })}
              />
            </Field>
            <Field label="Дата составления *" yellow>
              <DateTriple
                day={project.composedDay}
                month={project.composedMonth}
                year={project.composedYear}
                catalogs={catalogs}
                years={catalogs.years}
                invalidDay={invalid('composedDay')}
                invalidMonth={invalid('composedMonth')}
                invalidYear={invalid('composedYear')}
                onChange={(composedDay, composedMonth, composedYear) =>
                  patch({ composedDay, composedMonth, composedYear })
                }
              />
            </Field>
            <Field label="Отметка о резервировании / отказе">
              <Select
                value={project.reservationStatus}
                options={catalogs.reservationStatuses}
                onChange={(reservationStatus) => patch({ reservationStatus })}
              />
            </Field>
            <Field label="Дата резервирования / отказа">
              <input
                value={project.reservationDate}
                onChange={(e) => patch({ reservationDate: e.target.value })}
                placeholder="день / месяц / год"
              />
            </Field>
          </fieldset>

          <fieldset>
            <legend>Информация о проекте</legend>
            <Field label="Источник информации о проекте *" yellow span invalid={invalid('source')}>
              <Select
                value={project.source}
                options={catalogs.sources}
                onChange={(source) => patch({ source })}
              />
            </Field>
            <Field label="Название проекта *" yellow span invalid={invalid('name')}>
              <input
                value={project.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field label="Город / населённый пункт *" yellow invalid={invalid('city')}>
              <input value={project.city} onChange={(e) => patch({ city: e.target.value })} />
            </Field>
            <Field label="Улица *" yellow invalid={invalid('street')}>
              <input value={project.street} onChange={(e) => patch({ street: e.target.value })} />
            </Field>
            <Field label="Дом / земельный участок *" yellow invalid={invalid('house')}>
              <input value={project.house} onChange={(e) => patch({ house: e.target.value })} />
            </Field>
            <Field label="Назначение объекта строительства / помещения *" yellow span invalid={invalid('purpose')}>
              <Select
                value={project.purpose}
                options={catalogs.purposes}
                onChange={(purpose) => patch({ purpose })}
              />
            </Field>
            <Field label="Стадия проекта *" yellow invalid={invalid('stage')}>
              <Select
                value={project.stage}
                options={catalogs.stages}
                onChange={(stage) => patch({ stage })}
              />
            </Field>
            <Field label="Вероятность поставки, % *" yellow invalid={invalid('probability')}>
              <Select
                value={project.probability}
                options={catalogs.probabilities}
                onChange={(probability) => patch({ probability })}
              />
            </Field>
            <Field
              label="Предполагаемая дата начала поставки *"
              yellow
              span
            >
              <div className="date-triple">
                <label className={invalid('deliveryMonth') ? 'control-invalid' : undefined}>
                  Месяц
                  <Select
                    value={project.deliveryMonth}
                    options={catalogs.months}
                    onChange={(deliveryMonth) => patch({ deliveryMonth })}
                  />
                </label>
                <label className={invalid('deliveryYear') ? 'control-invalid' : undefined}>
                  Год
                  <Select
                    value={project.deliveryYear}
                    options={catalogs.deliveryYears}
                    onChange={(deliveryYear) => patch({ deliveryYear })}
                  />
                </label>
              </div>
            </Field>
          </fieldset>

          <fieldset className="contacts-set">
            <legend>Контактные лица — укажите название минимум одного внешнего участника</legend>
            <div className="blank-table-wrap">
              <table className="blank-table">
                <thead>
                  <tr>
                    <th>Роль</th>
                    <th>Название организации</th>
                    <th>ФИО / должность</th>
                    <th>Контактная информация</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ответственный компании-партнёра *</td>
                    <td>{PARTNER_COMPANY}</td>
                    <td className={invalid('managerAG') ? 'cell-invalid' : undefined}>
                      <Select
                        value={project.managerAG}
                        options={catalogs.managersAG}
                        onChange={(managerAG) => patch({ managerAG })}
                      />
                    </td>
                    <td className="muted">Не требуется</td>
                  </tr>
                  {CONTACT_ROWS.map((row) => {
                    const c = project.contacts[row.key]
                    return (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td className={invalid(`contact-${row.key}`) ? 'cell-invalid' : undefined}>
                          <input
                            value={c.organization}
                            onChange={(e) => setContact(row.key, { ...c, organization: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={c.person}
                            onChange={(e) => setContact(row.key, { ...c, person: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            value={c.contact}
                            onChange={(e) => setContact(row.key, { ...c, contact: e.target.value })}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </fieldset>

          <fieldset>
            <legend>Проделанная работа</legend>
            <Field
              label="Дата первого контакта *"
              yellow
              span
            >
              <DateTriple
                day={project.firstContactDay}
                month={project.firstContactMonth}
                year={project.firstContactYear}
                catalogs={catalogs}
                years={catalogs.deliveryYears}
                invalidDay={invalid('firstContactDay')}
                invalidMonth={invalid('firstContactMonth')}
                invalidYear={invalid('firstContactYear')}
                onChange={(firstContactDay, firstContactMonth, firstContactYear) =>
                  patch({ firstContactDay, firstContactMonth, firstContactYear })
                }
              />
            </Field>
            <Field label="Проведение презентации / переговоров *" yellow invalid={invalid('presentation')}>
              <Select
                value={project.presentation}
                options={catalogs.yesNo}
                onChange={(presentation) => patch({ presentation })}
              />
            </Field>
            <Field label="Вариантное проектирование *" yellow invalid={invalid('variantDesign')}>
              <Select
                value={project.variantDesign}
                options={catalogs.yesNo}
                onChange={(variantDesign) => patch({ variantDesign })}
              />
            </Field>
            <Field label="Изготовление монтажной схемы *" yellow invalid={invalid('installScheme')}>
              <Select
                value={project.installScheme}
                options={catalogs.yesNo}
                onChange={(installScheme) => patch({ installScheme })}
              />
            </Field>
            <Field label="Изготовление спецификации *" yellow invalid={invalid('specification')}>
              <Select
                value={project.specification}
                options={catalogs.yesNo}
                onChange={(specification) => patch({ specification })}
              />
            </Field>
          </fieldset>

          <fieldset className="contacts-set">
            <legend>
              Краткая информация о предлагаемых материалах Ecophon — заполните минимум одну строку
            </legend>
            <div className="blank-table-wrap">
              <table className="blank-table">
                <thead>
                  <tr>
                    <th>Артикул</th>
                    <th>Наименование *</th>
                    <th>Количество *</th>
                    <th>Ед. измерения *</th>
                    <th>Цвет</th>
                    <th>Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {project.materials.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          value={line.article}
                          onChange={(e) => setMaterial(index, { ...line, article: e.target.value })}
                        />
                      </td>
                      <td className={invalid(`material-${index}-name`) ? 'cell-invalid' : undefined}>
                        <input
                          value={line.name}
                          onChange={(e) => setMaterial(index, { ...line, name: e.target.value })}
                        />
                      </td>
                      <td className={invalid(`material-${index}-quantity`) ? 'cell-invalid' : undefined}>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={line.quantity ?? ''}
                          onChange={(e) =>
                            setMaterial(index, {
                              ...line,
                              quantity: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className={invalid(`material-${index}-unit`) ? 'cell-invalid' : undefined}>
                        <Select
                          value={line.unit}
                          options={catalogs.units}
                          onChange={(unit) => setMaterial(index, { ...line, unit })}
                        />
                      </td>
                      <td>
                        <input
                          value={line.color}
                          onChange={(e) => setMaterial(index, { ...line, color: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={line.note}
                          onChange={(e) => setMaterial(index, { ...line, note: e.target.value })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>

          <footer className="blank-foot">
            {!isNew && onDelete ? (
              <button type="button" className="danger" onClick={onDelete}>
                Удалить
              </button>
            ) : (
              <span className="hint">
                {showErrors && !complete
                  ? 'Красным выделены пустые обязательные поля. Черновик можно сохранить без них.'
                  : 'Черновик сохраняется с пустыми полями. «Сохранить бланк» — только полностью заполненный.'}
              </span>
            )}
            <div className="drawer-actions">
              <button type="button" className="ghost" onClick={onClose}>
                Отмена
              </button>
              <button type="button" className="ghost" onClick={onSave}>
                Сохранить черновик
              </button>
              <button type="submit" className="primary">
                Сохранить бланк
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  yellow,
  span,
  invalid,
  children,
}: {
  label: string
  yellow?: boolean
  span?: boolean
  invalid?: boolean
  children: ReactNode
}) {
  return (
    <label
      className={`field${span ? ' field-span' : ''}${yellow ? ' field-yellow' : ''}${invalid ? ' field-invalid' : ''}`}
    >
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  const extras = value && !options.includes(value) ? [value] : []
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {[...extras, ...options.filter(Boolean)].map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

function DateTriple({
  day,
  month,
  year,
  catalogs,
  years,
  invalidDay,
  invalidMonth,
  invalidYear,
  onChange,
}: {
  day: string
  month: string
  year: string
  catalogs: Catalogs
  years: string[]
  invalidDay?: boolean
  invalidMonth?: boolean
  invalidYear?: boolean
  onChange: (day: string, month: string, year: string) => void
}) {
  return (
    <div className="date-triple">
      <span className={invalidDay ? 'control-invalid' : undefined}>
        <Select value={day} options={catalogs.days} onChange={(d) => onChange(d, month, year)} />
      </span>
      <span className={invalidMonth ? 'control-invalid' : undefined}>
        <Select value={month} options={catalogs.months} onChange={(m) => onChange(day, m, year)} />
      </span>
      <span className={invalidYear ? 'control-invalid' : undefined}>
        <Select value={year} options={years} onChange={(y) => onChange(day, month, y)} />
      </span>
    </div>
  )
}
