import type { CrmFormField } from '../api/projectTypes'

const HEADER_DATE = ['information_form_date']
const HEADER_NOTE = ['comment']

const INFO_CODES = [
  'information_source_id',
  'name',
  'address',
  'segment_id',
  'stage_id',
  'planned_shipment_date',
  'planned_supply_quarter',
  'planned_supply_year',
  'sale_probability',
]

const CONTACT_CODES = ['ag_manager_id', 'sg_manager_id', 'participant_ids']

const WORK_CODES = ['first_contact_date', 'documentation_type_ids']

const WORD_LABELS: Record<string, string> = {
  information_form_date: 'Дата составления',
  comment: 'Примечание',
  information_source_id: 'Источник информации о проекте',
  name: 'Название проекта',
  address: 'Адрес объекта строительства',
  segment_id: 'Назначение объекта строительства/ помещения',
  stage_id: 'Стадия проекта',
  planned_shipment_date: 'Предполагаемая дата начала поставки материалов',
  planned_supply_quarter: 'Предполагаемая дата начала поставки материалов',
  planned_supply_year: 'Год поставки',
  sale_probability: 'Вероятность поставки материалов  %.',
  ag_manager_id: 'Ответственный со стороны компании-партнера',
  sg_manager_id: 'Ответственный SG',
  participant_ids: 'Контактные лица',
  first_contact_date: 'Дата первого контакта с клиентом',
  documentation_type_ids: 'Проделанная работа',
  brand_support_status_id: 'Статус поддержки бренда',
  support_date: 'Дата поддержки',
  brand_code: 'Бренд',
  materials: 'Краткая информация о предлагаемых материалах',
}

const SUPPLY_PAIR = ['planned_supply_quarter', 'planned_supply_year'] as const

export function blankLabel(field: CrmFormField): string {
  return WORD_LABELS[field.code] ?? field.name
}

export type BlankPlan = {
  date: CrmFormField[]
  note: CrmFormField[]
  info: CrmFormField[][]
  contacts: CrmFormField[][]
  work: CrmFormField[][]
  materials: CrmFormField | null
  extra: CrmFormField[][]
}

export function planBlankFields(fields: CrmFormField[]): BlankPlan {
  const byCode = new Map(fields.map((field) => [field.code, field]))
  const used = new Set<string>()

  function takeList(codes: string[]): CrmFormField[] {
    const rows: CrmFormField[] = []
    for (const code of codes) {
      const field = byCode.get(code)
      if (!field || used.has(code)) continue
      used.add(code)
      rows.push(field)
    }
    return rows
  }

  function asRows(list: CrmFormField[]): CrmFormField[][] {
    const rows: CrmFormField[][] = []
    const pending = [...list]
    while (pending.length) {
      const field = pending.shift()
      if (!field) break
      if (field.code === SUPPLY_PAIR[0]) {
        const year = pending.find((item) => item.code === SUPPLY_PAIR[1])
        if (year) {
          pending.splice(pending.indexOf(year), 1)
          rows.push([field, year])
          continue
        }
      }
      if (field.code === SUPPLY_PAIR[1]) {
        const quarter = pending.find((item) => item.code === SUPPLY_PAIR[0])
        if (quarter) {
          pending.splice(pending.indexOf(quarter), 1)
          rows.push([quarter, field])
          continue
        }
      }
      rows.push([field])
    }
    return rows
  }

  const date = takeList(HEADER_DATE)
  const note = takeList(HEADER_NOTE)
  const info = asRows(takeList(INFO_CODES))
  const contacts = asRows(takeList(CONTACT_CODES))
  const work = asRows(takeList(WORK_CODES))
  const materials = takeList(['materials'])[0] ?? null
  const extra = asRows(fields.filter((field) => !used.has(field.code)))

  return { date, note, info, contacts, work, materials, extra }
}
