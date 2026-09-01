import type { Catalogs, Contact, MaterialLine, Project } from '../types'

export const EMPTY_CONTACT: Contact = { organization: '', person: '', contact: '' }

export function emptyMaterial(): MaterialLine {
  return { article: '', name: '', quantity: null, unit: '', color: '', note: '' }
}

export const MATERIAL_ROWS = 10

export const DEFAULT_CATALOGS: Catalogs = {
  sources: [
    'Работа с подрядчиком',
    'Архитектор / проектировщик',
    'Заказчик / инвестор',
    'Входящий запрос',
    'Партнёр / дилер',
    'Продажи',
    'Другое',
  ],
  purposes: [
    'Школа',
    'Детский сад',
    'Колледж / техникум',
    'Университет',
    'Офис',
    'Спортивный объект',
    'Гостиница',
    'Медицинский объект',
    'Театр / концертный зал',
    'Ресторан / кафе',
    'Жилой объект',
    'Промышленный объект',
    'Административное здание',
    'Другое',
  ],
  stages: [
    'Концепция',
    'Проектирование',
    'Тендер / закупка',
    'Строительство',
    'Комплектация',
    'Отгрузка',
  ],
  probabilities: ['10%', '30%', '50%', '70%', '90%'],
  yesNo: ['Да', 'Нет', 'Не требуется'],
  units: ['шт.', 'м²', 'упак.', 'компл.', 'п.м.'],
  reservationStatuses: ['Зарезервировано', 'Отказ', 'На рассмотрении'],
  months: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  years: Array.from({ length: 16 }, (_, i) => String(2020 + i)),
  deliveryYears: Array.from({ length: 11 }, (_, i) => String(2020 + i)),
  days: Array.from({ length: 31 }, (_, i) => String(i + 1)),
  managersAG: [
    'Бабарыкина Ирина',
    'Сохряков Илья',
    'Желебовский Михаил',
    'Масленников Андрей',
    'Климов Александр',
    'Зуева Ольга',
    'Фомишина Анна',
    'Майорова Полина',
    'Барчуков Сергей',
    'Ефременко Евгений',
    'Семина Карина',
    'Ветлин Кирилл',
    'Степанова Дарья',
    'Цупин Александр',
    'Звездилина Ангелина',
    'Екимова Ирина',
    'Кривошеева Евгения',
    'Ребро Андрей',
    'Шагалиев Данис',
    'Газзатова Розалия',
    'Яровая Евгения',
    'Нечаев Виталий',
    'Тархов Сергей',
    'Андреева Юлия',
    'Калини Иван',
    'Хлупин Александр',
    'Даниил Лившиц',
    'Савинова Елена',
  ],
}

export function emptyProject(id = ''): Project {
  return {
    id,
    applicationNumber: '',
    composedDay: '',
    composedMonth: '',
    composedYear: '',
    reservationStatus: '',
    reservationDate: '',
    source: '',
    name: '',
    city: '',
    street: '',
    house: '',
    purpose: '',
    stage: '',
    deliveryMonth: '',
    deliveryYear: '',
    probability: '',
    managerAG: '',
    contacts: {
      customer: { ...EMPTY_CONTACT },
      designer: { ...EMPTY_CONTACT },
      gc: { ...EMPTY_CONTACT },
      sub: { ...EMPTY_CONTACT },
    },
    firstContactDay: '',
    firstContactMonth: '',
    firstContactYear: '',
    presentation: '',
    variantDesign: '',
    installScheme: '',
    specification: '',
    materials: Array.from({ length: MATERIAL_ROWS }, () => emptyMaterial()),
  }
}

export const PARTNER_COMPANY = 'Акустик Групп'

export const CONTACT_ROWS: Array<{
  key: keyof Project['contacts']
  label: string
  required?: boolean
}> = [
  { key: 'customer', label: 'Заказчик / инвестор' },
  { key: 'designer', label: 'Проектировщик / архитектор' },
  { key: 'gc', label: 'Генподрядчик' },
  { key: 'sub', label: 'Субподрядчик' },
]
