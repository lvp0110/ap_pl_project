import type { MaterialLine, Project } from '../types'

export function filledMaterial(line: MaterialLine): boolean {
  return Boolean(
    line.article ||
      line.name ||
      line.unit ||
      line.color ||
      line.note ||
      (line.quantity != null && line.quantity !== 0),
  )
}

export function completeMaterial(line: MaterialLine): boolean {
  return Boolean(line.name.trim().length >= 3 && line.quantity != null && line.quantity > 0 && line.unit)
}

export type BlankCheck = {
  messages: string[]
  keys: Set<string>
}

export function collectBlankErrors(p: Project): BlankCheck {
  const messages: string[] = []
  const keys = new Set<string>()

  function fail(message: string, ...fieldKeys: string[]) {
    messages.push(message)
    for (const key of fieldKeys) keys.add(key)
  }

  if (!p.composedDay || !p.composedMonth || !p.composedYear) {
    const empty = [
      !p.composedDay ? 'composedDay' : '',
      !p.composedMonth ? 'composedMonth' : '',
      !p.composedYear ? 'composedYear' : '',
    ].filter(Boolean)
    fail('Дата составления', ...empty)
  }
  if (!p.source) fail('Источник', 'source')

  const name = p.name.trim()
  if (!name) fail('Название проекта', 'name')
  else if (name.length < 5 || /^\d+$/.test(name)) fail('Проверьте название проекта', 'name')

  if (!p.city.trim()) fail('Город', 'city')
  if (!p.street.trim()) fail('Улица', 'street')
  if (!p.house.trim()) fail('Дом/земельный участок', 'house')
  if (!p.purpose) fail('Назначение объекта', 'purpose')
  if (!p.stage) fail('Стадия', 'stage')
  if (!p.deliveryMonth) fail('Месяц поставки', 'deliveryMonth')
  if (!p.deliveryYear) fail('Год поставки', 'deliveryYear')
  if (!p.probability) fail('Вероятность', 'probability')
  if (!p.managerAG) fail('Ответственный АГ', 'managerAG')

  const orgKeys = ['customer', 'designer', 'gc', 'sub'] as const
  const orgs = orgKeys.map((key) => ({ key, value: p.contacts[key].organization.trim() }))
  if (!orgs.some((o) => o.value)) {
    fail(
      'Название минимум одного внешнего участника',
      ...orgKeys.map((key) => `contact-${key}`),
    )
  }
  const shortOrgs = orgs.filter((o) => o.value && o.value.length < 3)
  if (shortOrgs.length) {
    fail(
      'Проверьте название внешнего участника',
      ...shortOrgs.map((o) => `contact-${o.key}`),
    )
  }

  if (!p.firstContactDay || !p.firstContactMonth || !p.firstContactYear) {
    fail(
      'Дата первого контакта',
      ...[
        !p.firstContactDay ? 'firstContactDay' : '',
        !p.firstContactMonth ? 'firstContactMonth' : '',
        !p.firstContactYear ? 'firstContactYear' : '',
      ].filter(Boolean),
    )
  }
  if (!p.presentation) fail('Переговоры', 'presentation')
  if (!p.variantDesign) fail('Вариантное проектирование', 'variantDesign')
  if (!p.installScheme) fail('Монтажная схема', 'installScheme')
  if (!p.specification) fail('Спецификация', 'specification')

  const lines = p.materials
  const hasComplete = lines.some(completeMaterial)
  if (!hasComplete) {
    fail('Хотя бы одна строка материала: наименование, количество и единица', 'material-0-name', 'material-0-quantity', 'material-0-unit')
  }

  lines.forEach((line, index) => {
    if (filledMaterial(line) && !completeMaterial(line)) {
      if (line.name.trim().length < 3) keys.add(`material-${index}-name`)
      if (!(line.quantity != null && line.quantity > 0)) keys.add(`material-${index}-quantity`)
      if (!line.unit) keys.add(`material-${index}-unit`)
    } else if (line.quantity != null && !(line.quantity > 0)) {
      keys.add(`material-${index}-quantity`)
    }
  })
  if (lines.some((line) => filledMaterial(line) && !completeMaterial(line))) {
    messages.push('Завершите начатые строки материалов')
  }
  if (lines.some((line) => line.quantity != null && !(line.quantity > 0))) {
    if (!messages.includes('Количество должно быть положительным числом')) {
      messages.push('Количество должно быть положительным числом')
    }
  }

  return { messages, keys }
}

export function validateBlank(p: Project): string[] {
  return collectBlankErrors(p).messages
}

export function isHighProbability(p: Project): boolean {
  return p.probability === '70%' || p.probability === '90%'
}
