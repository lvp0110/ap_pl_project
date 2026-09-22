import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CONTACT_ROWS, PARTNER_COMPANY } from '../data/defaults'
import { priceNote } from '../lib/excel'
import { collectBlankErrors } from '../lib/validate'
import type { Catalogs, Contact, MaterialLine, PriceItem, Project } from '../types'

type Props = {
  project: Project
  catalogs: Catalogs
  price: PriceItem[]
  busy?: boolean
  isNew: boolean
  onChange: (next: Project) => void
  onSave: () => void
  onClose: () => void
  onDelete?: () => void
  onImportPrice: (file: File) => void
  onExportPrice: () => void
}

function matchPriceItem(price: PriceItem[], article: string, name: string): PriceItem | undefined {
  const art = article.trim().toLowerCase()
  const nm = name.trim().toLowerCase()
  if (art) {
    const byArticle = price.find((item) => item.article.trim().toLowerCase() === art)
    if (byArticle) return byArticle
  }
  if (nm) {
    return price.find(
      (item) => item.name.trim().toLowerCase() === nm || item.label.trim().toLowerCase() === nm,
    )
  }
  return undefined
}

export function BlankForm({
  project,
  catalogs,
  price,
  busy,
  isNew,
  onChange,
  onSave,
  onClose,
  onDelete,
  onImportPrice,
  onExportPrice,
}: Props) {
  const priceRef = useRef<HTMLInputElement>(null)
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

  function setMaterial(index: number, next: MaterialLine, fromCatalog = false) {
    let line = next
    const hit = matchPriceItem(price, next.article, next.name)
    if (hit) {
      line = {
        ...next,
        article: hit.article || next.article,
        name: hit.name || next.name,
        unit: hit.qtyUnit,
        note: next.note || priceNote(hit),
      }
    } else if (fromCatalog) {
      line = { ...next, unit: '' }
    }
    const rows = project.materials.map((current, i) => (i === index ? line : current))
    patch({ materials: rows })
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
        <div className="blank-toolbar">
          <div className={`check-banner ${complete ? 'ok' : 'bad'}`}>
            <strong>{complete ? 'БЛАНК ЗАПОЛНЕН ПОЛНОСТЬЮ' : 'БЛАНК НЕ ЗАПОЛНЕН'}</strong>
            {!complete && <span>{check.messages.join('; ')}</span>}
          </div>
          <div className="price-actions">
            <input
              ref={priceRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onImportPrice(file)
              }}
            />
            <button type="button" className="ghost" disabled={busy} onClick={() => priceRef.current?.click()}>
              Загрузить прайс в бланк
            </button>
            <button type="button" className="ghost" disabled={busy || !price.length} onClick={onExportPrice}>
              Выгрузить прайс
            </button>
            <span className="hint">
              {price.length
                ? `${price.length} позиций. Выберите наименование в таблице материалов.`
                : 'Нужен Excel прайс-лист (наименование, стоимость, единица).'}
            </span>
          </div>
        </div>

        <form
          className="blank-body"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <div className="bi-sheet">
            <header className="bi-head">
              <div className="bi-title">
                <h2 id="blank-title">Информирование о проекте</h2>
                <p className="bi-company">{PARTNER_COMPANY}</p>
                <p className="bi-caption">название компании / подпись руководителя</p>
              </div>
              <table className="bi-date">
                <thead>
                  <tr>
                    <th>Дата составления</th>
                    <th>Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`bi-fill${invalid('composedDay') || invalid('composedMonth') || invalid('composedYear') ? ' cell-invalid' : ''}`}>
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
                    </td>
                    <td className="bi-fill">
                      <input
                        value={project.applicationNumber}
                        onChange={(e) => patch({ applicationNumber: e.target.value })}
                        placeholder="№ заявки / отметка"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </header>

            <section className="bi-block">
              <h3 className="bi-section">Информация о проекте</h3>
              <table className="bi-grid">
                <tbody>
                  <Row label="Источник информации о проекте" invalid={invalid('source')}>
                    <Select
                      value={project.source}
                      options={catalogs.sources}
                      onChange={(source) => patch({ source })}
                    />
                  </Row>
                  <Row label="Название проекта" invalid={invalid('name')}>
                    <input value={project.name} onChange={(e) => patch({ name: e.target.value })} />
                  </Row>
                  <Row
                    label="Адрес объекта строительства"
                    invalid={invalid('city') || invalid('street') || invalid('house')}
                  >
                    <div className="bi-pair">
                      <input
                        className={invalid('city') ? 'control-invalid' : undefined}
                        value={project.city}
                        onChange={(e) => patch({ city: e.target.value })}
                        placeholder="город"
                      />
                      <input
                        className={invalid('street') ? 'control-invalid' : undefined}
                        value={project.street}
                        onChange={(e) => patch({ street: e.target.value })}
                        placeholder="улица"
                      />
                      <input
                        className={invalid('house') ? 'control-invalid' : undefined}
                        value={project.house}
                        onChange={(e) => patch({ house: e.target.value })}
                        placeholder="дом"
                      />
                    </div>
                  </Row>
                  <Row label="Назначение объекта строительства/ помещения" invalid={invalid('purpose')}>
                    <Select
                      value={project.purpose}
                      options={catalogs.purposes}
                      onChange={(purpose) => patch({ purpose })}
                    />
                  </Row>
                  <Row label="Стадия проекта" invalid={invalid('stage')}>
                    <Select value={project.stage} options={catalogs.stages} onChange={(stage) => patch({ stage })} />
                  </Row>
                  <Row
                    label="Предполагаемая дата начала поставки материалов"
                    invalid={invalid('deliveryMonth') || invalid('deliveryYear')}
                  >
                    <div className="bi-pair">
                      <Select
                        value={project.deliveryMonth}
                        options={catalogs.months}
                        placeholder="месяц"
                        onChange={(deliveryMonth) => patch({ deliveryMonth })}
                      />
                      <Select
                        value={project.deliveryYear}
                        options={catalogs.deliveryYears}
                        placeholder="год"
                        onChange={(deliveryYear) => patch({ deliveryYear })}
                      />
                    </div>
                  </Row>
                  <Row label="Вероятность поставки материалов  %." invalid={invalid('probability')}>
                    <Select
                      value={project.probability}
                      options={catalogs.probabilities}
                      onChange={(probability) => patch({ probability })}
                    />
                  </Row>
                </tbody>
              </table>
            </section>

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
                  <tr>
                    <th>Ответственный со стороны компании-партнера</th>
                    <td>{PARTNER_COMPANY}</td>
                    <td className={`bi-fill${invalid('managerAG') ? ' cell-invalid' : ''}`}>
                      <Select
                        value={project.managerAG}
                        options={catalogs.managersAG}
                        onChange={(managerAG) => patch({ managerAG })}
                      />
                    </td>
                    <td className="bi-fill">
                      <input
                        value={project.partnerNote}
                        onChange={(e) => patch({ partnerNote: e.target.value })}
                      />
                    </td>
                  </tr>
                  {CONTACT_ROWS.map((row) => {
                    const c = project.contacts[row.key]
                    return (
                      <tr key={row.key}>
                        <th>{row.label}</th>
                        <td className={`bi-fill${invalid(`contact-${row.key}`) ? ' cell-invalid' : ''}`}>
                          <input
                            value={c.organization}
                            onChange={(e) => setContact(row.key, { ...c, organization: e.target.value })}
                          />
                        </td>
                        <td className="bi-fill">
                          <input
                            value={c.person}
                            onChange={(e) => setContact(row.key, { ...c, person: e.target.value })}
                          />
                        </td>
                        <td className="bi-fill">
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
            </section>

            <section className="bi-block">
              <h3 className="bi-section">Проделанная работа</h3>
              <table className="bi-grid">
                <tbody>
                  <Row
                    label="Дата первого контакта с клиентом"
                    invalid={invalid('firstContactDay') || invalid('firstContactMonth') || invalid('firstContactYear')}
                  >
                    <DateTriple
                      day={project.firstContactDay}
                      month={project.firstContactMonth}
                      year={project.firstContactYear}
                      catalogs={catalogs}
                      years={catalogs.years}
                      invalidDay={invalid('firstContactDay')}
                      invalidMonth={invalid('firstContactMonth')}
                      invalidYear={invalid('firstContactYear')}
                      onChange={(firstContactDay, firstContactMonth, firstContactYear) =>
                        patch({ firstContactDay, firstContactMonth, firstContactYear })
                      }
                    />
                  </Row>
                  <Row label="Проведение презентации, переговоров" invalid={invalid('presentation')}>
                    <Select
                      value={project.presentation}
                      options={catalogs.yesNo}
                      onChange={(presentation) => patch({ presentation })}
                    />
                  </Row>
                  <Row label="Вариантное проектирование" invalid={invalid('variantDesign')}>
                    <Select
                      value={project.variantDesign}
                      options={catalogs.yesNo}
                      onChange={(variantDesign) => patch({ variantDesign })}
                    />
                  </Row>
                  <Row label="Изготовление спецификации" invalid={invalid('specification')}>
                    <Select
                      value={project.specification}
                      options={catalogs.yesNo}
                      onChange={(specification) => patch({ specification })}
                    />
                  </Row>
                </tbody>
              </table>
            </section>

            <section className="bi-block">
              <h3 className="bi-section">Краткая информация о предлагаемых материалах</h3>
              <table className="bi-grid bi-materials-table">
                <thead>
                  <tr>
                    <th>Наименование</th>
                    <th>Ед. измерения</th>
                    <th>Количество</th>
                    <th>Цвет</th>
                    <th>Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {project.materials.map((line, index) => {
                    const priced = matchPriceItem(price, line.article, line.name)
                    return (
                    <tr key={index}>
                      <td className={`bi-fill${invalid(`material-${index}-name`) ? ' cell-invalid' : ''}`}>
                        <input
                          list="price-material-names"
                          value={line.name}
                          onChange={(e) =>
                            setMaterial(index, { ...line, name: e.target.value }, true)
                          }
                        />
                      </td>
                      <td className={priced ? undefined : `bi-fill${invalid(`material-${index}-unit`) ? ' cell-invalid' : ''}`}>
                        {priced ? (
                          priced.qtyUnit
                        ) : (
                          <Select
                            value={line.unit}
                            options={catalogs.units}
                            onChange={(unit) => setMaterial(index, { ...line, unit })}
                          />
                        )}
                      </td>
                      <td className={`bi-fill${invalid(`material-${index}-quantity`) ? ' cell-invalid' : ''}`}>
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
                      <td className="bi-fill">
                        <input
                          value={line.color}
                          onChange={(e) => setMaterial(index, { ...line, color: e.target.value })}
                        />
                      </td>
                      <td className="bi-fill">
                        <input
                          value={line.note}
                          onChange={(e) => setMaterial(index, { ...line, note: e.target.value })}
                        />
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          </div>

          <section className="panel extra-crm">
            <h2>Служебные отметки</h2>
            <p className="hint">Этих строк нет в бумажном бланке, но они нужны для сохранения.</p>
            <div className="project-form-grid">
              <label className="field">
                <span className="field-label">Отметка о резервировании / отказе</span>
                <div className="bi-pair">
                  <Select
                    value={project.reservationStatus}
                    options={catalogs.reservationStatuses}
                    onChange={(reservationStatus) => patch({ reservationStatus })}
                  />
                  <input
                    value={project.reservationDate}
                    onChange={(e) => patch({ reservationDate: e.target.value })}
                    placeholder="дата резервирования"
                  />
                </div>
              </label>
              <label className={`field${invalid('installScheme') ? ' field-invalid' : ''}`}>
                <span className="field-label">Изготовление монтажной схемы</span>
                <Select
                  value={project.installScheme}
                  options={catalogs.yesNo}
                  onChange={(installScheme) => patch({ installScheme })}
                />
              </label>
            </div>
          </section>

          {price.length > 0 ? (
            <datalist id="price-material-names">
              {price.map((item) => (
                <option
                  key={`name-${item.id}`}
                  value={item.name}
                  label={`${item.article || 'без артикула'} · ${priceNote(item)}`}
                />
              ))}
            </datalist>
          ) : null}

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
                К списку
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

function Row({
  label,
  invalid,
  children,
}: {
  label: string
  invalid?: boolean
  children: ReactNode
}) {
  return (
    <tr>
      <th>{label}</th>
      <td className={`bi-fill${invalid ? ' cell-invalid' : ''}`}>{children}</td>
    </tr>
  )
}

function Select({
  value,
  options,
  onChange,
  placeholder = '',
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
}) {
  const extras = value && !options.includes(value) ? [value] : []
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
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
