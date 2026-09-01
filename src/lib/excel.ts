import type ExcelJS from 'exceljs'
import { emptyProject, MATERIAL_ROWS } from '../data/defaults'
import { validateBlank } from './validate'
import type { Catalogs, Project } from '../types'

async function loadExcel() {
  const mod = await import('exceljs')
  return mod.default
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function writeCatalogColumn(
  sheet: ExcelJS.Worksheet,
  col: number,
  title: string,
  values: Array<string | number>,
) {
  sheet.getCell(1, col).value = title
  sheet.getCell(1, col).font = { bold: true }
  values.forEach((v, i) => {
    sheet.getCell(i + 2, col).value = v
  })
  sheet.getColumn(col).width = 22
}

function materialsSummary(p: Project): string {
  return p.materials
    .filter((m) => m.name)
    .map((m) =>
      [m.article, m.name, m.quantity, m.unit, m.color].filter((x) => x != null && x !== '').join(' '),
    )
    .join('; ')
}

export async function exportWorkbook(projects: Project[], catalogs: Catalogs) {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Akufon / Ecophon CRM'

  const lists = wb.addWorksheet('Списки')
  writeCatalogColumn(lists, 1, 'Источник', catalogs.sources)
  writeCatalogColumn(lists, 2, 'Назначение объекта / помещения', catalogs.purposes)
  writeCatalogColumn(lists, 3, 'Стадия', catalogs.stages)
  writeCatalogColumn(lists, 4, 'Вероятность', catalogs.probabilities)
  writeCatalogColumn(lists, 5, 'Да / Нет', catalogs.yesNo)
  writeCatalogColumn(lists, 6, 'Ед. измерения', catalogs.units)
  writeCatalogColumn(lists, 7, 'Резервирование', [])
  writeCatalogColumn(lists, 8, 'Служебный статус', catalogs.reservationStatuses)
  writeCatalogColumn(lists, 9, 'Месяц', catalogs.months)
  writeCatalogColumn(lists, 10, 'Год', catalogs.years)
  writeCatalogColumn(lists, 11, 'День', catalogs.days)
  writeCatalogColumn(lists, 12, 'Ответственные АГ', catalogs.managersAG)

  const sheet = wb.addWorksheet('Реестр бланков')
  const headers = [
    'ID',
    '№ заявки',
    'Дата составления',
    'Источник',
    'Название проекта',
    'Город',
    'Улица',
    'Дом',
    'Назначение',
    'Стадия',
    'Поставка',
    'Вероятность',
    'Ответственный АГ',
    'Заказчик',
    'Проектировщик',
    'Генподрядчик',
    'Субподрядчик',
    'Первый контакт',
    'Переговоры',
    'Вариантное проектирование',
    'Монтажная схема',
    'Спецификация',
    'Материалы',
    'Проверка',
    'Резервирование',
  ]
  headers.forEach((h, i) => {
    const cell = sheet.getCell(1, i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
  })

  projects.forEach((p, idx) => {
    const issues = validateBlank(p)
    sheet.getRow(idx + 2).values = [
      undefined,
      p.id,
      p.applicationNumber,
      [p.composedDay, p.composedMonth, p.composedYear].filter(Boolean).join(' '),
      p.source,
      p.name,
      p.city,
      p.street,
      p.house,
      p.purpose,
      p.stage,
      [p.deliveryMonth, p.deliveryYear].filter(Boolean).join(' '),
      p.probability,
      p.managerAG,
      p.contacts.customer.organization,
      p.contacts.designer.organization,
      p.contacts.gc.organization,
      p.contacts.sub.organization,
      [p.firstContactDay, p.firstContactMonth, p.firstContactYear].filter(Boolean).join(' '),
      p.presentation,
      p.variantDesign,
      p.installScheme,
      p.specification,
      materialsSummary(p),
      issues.length === 0 ? 'Заполнен полностью' : issues.join('; '),
      p.reservationStatus,
    ]
  })
  sheet.columns.forEach((col) => {
    col.width = 18
  })
  sheet.getColumn(5).width = 32
  sheet.getColumn(23).width = 40
  sheet.getColumn(24).width = 36

  const buffer = await wb.xlsx.writeBuffer()
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBuffer(buffer as ArrayBuffer, `Бланки_информирования_Ecophon_${stamp}.xlsx`)
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim()
  }
  if (typeof value === 'object' && 'result' in value) {
    return cellText(value.result as ExcelJS.CellValue)
  }
  return String(value)
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function readContact(
  sheet: ExcelJS.Worksheet,
  row: number,
): { organization: string; person: string; contact: string } {
  return {
    organization: cellText(sheet.getCell(row, 4).value),
    person: cellText(sheet.getCell(row, 8).value),
    contact: cellText(sheet.getCell(row, 12).value),
  }
}

function importEcophonSheet(sheet: ExcelJS.Worksheet, id: string): Project | null {
  const project = emptyProject(id)
  project.applicationNumber = cellText(sheet.getCell('H3').value)
  project.composedDay = cellText(sheet.getCell('J3').value)
  project.composedMonth = cellText(sheet.getCell('K3').value)
  project.composedYear = cellText(sheet.getCell('J4').value)
  project.reservationStatus = cellText(sheet.getCell('L3').value)
  project.reservationDate = cellText(sheet.getCell('N3').value)
  project.source = cellText(sheet.getCell('G9').value)
  project.name = cellText(sheet.getCell('G10').value)
  project.city = cellText(sheet.getCell('G12').value)
  project.street = cellText(sheet.getCell('J12').value)
  project.house = cellText(sheet.getCell('M12').value)
  project.purpose = cellText(sheet.getCell('G13').value)
  project.stage = cellText(sheet.getCell('G14').value)
  project.deliveryMonth = cellText(sheet.getCell('I15').value)
  project.deliveryYear = cellText(sheet.getCell('M15').value)
  project.probability = cellText(sheet.getCell('G16').value)
  project.managerAG = cellText(sheet.getCell('H20').value)
  project.contacts.customer = readContact(sheet, 21)
  project.contacts.designer = readContact(sheet, 22)
  project.contacts.gc = readContact(sheet, 23)
  project.contacts.sub = readContact(sheet, 24)
  project.firstContactDay = cellText(sheet.getCell('G27').value)
  project.firstContactMonth = cellText(sheet.getCell('J27').value)
  project.firstContactYear = cellText(sheet.getCell('M27').value)
  project.presentation = cellText(sheet.getCell('G28').value)
  project.variantDesign = cellText(sheet.getCell('G29').value)
  project.installScheme = cellText(sheet.getCell('G30').value)
  project.specification = cellText(sheet.getCell('G31').value)

  for (let i = 0; i < MATERIAL_ROWS; i += 1) {
    const r = 35 + i
    project.materials[i] = {
      article: cellText(sheet.getCell(r, 1).value),
      name: cellText(sheet.getCell(r, 3).value),
      quantity: cellNumber(sheet.getCell(r, 7).value),
      unit: cellText(sheet.getCell(r, 9).value),
      color: cellText(sheet.getCell(r, 11).value),
      note: cellText(sheet.getCell(r, 13).value),
    }
  }

  if (!project.name && !project.city && !project.source) return null
  return project
}

export async function importWorkbook(file: File): Promise<Project[]> {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const blank = wb.getWorksheet('Бланк информирования')
  if (blank) {
    const imported = importEcophonSheet(blank, '1')
    return imported ? [imported] : []
  }

  const registry = wb.getWorksheet('Реестр бланков')
  if (registry) {
    const projects: Project[] = []
    registry.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const name = cellText(row.getCell(5).value)
      const id = cellText(row.getCell(1).value)
      if (!name && !id) return
      const p = emptyProject(id || String(projects.length + 1))
      p.applicationNumber = cellText(row.getCell(2).value)
      p.source = cellText(row.getCell(4).value)
      p.name = name
      p.city = cellText(row.getCell(6).value)
      p.street = cellText(row.getCell(7).value)
      p.house = cellText(row.getCell(8).value)
      p.purpose = cellText(row.getCell(9).value)
      p.stage = cellText(row.getCell(10).value)
      p.probability = cellText(row.getCell(12).value)
      p.managerAG = cellText(row.getCell(13).value)
      projects.push(p)
    })
    return projects
  }

  return []
}
