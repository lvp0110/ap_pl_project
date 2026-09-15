import type ExcelJS from 'exceljs'
import type { PriceItem } from '../types'

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

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim()
  }
  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('').trim()
  }
  if (typeof value === 'object' && 'result' in value) {
    return cellText(value.result as ExcelJS.CellValue)
  }
  return String(value)
}

export function parsePriceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const n = Number(value.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function formatPriceNumber(value: number): string {
  return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function qtyUnitFromPriceUnit(priceUnit: string): string {
  const compact = priceUnit.toLowerCase().replace(/\s/g, '')
  if (compact.includes('шт')) return 'шт.'
  if (compact.includes('м2') || compact.includes('м²')) return 'м²'
  return priceUnit.trim()
}

export function parsePriceLabel(raw: string): { article: string; name: string } {
  const trimmed = raw.trim()
  const withoutBrand = trimmed.replace(/^Ecophon\s+/i, '').trim()
  const match = withoutBrand.match(/^(\d{4,})\s+(.+)$/)
  if (match) return { article: match[1], name: match[2].trim() }
  return { article: '', name: withoutBrand || trimmed }
}

function isHeaderRow(label: string, price: string, unit: string): boolean {
  const hay = `${label} ${price} ${unit}`.toLowerCase()
  return hay.includes('наименование') || hay.includes('артикул') || hay.includes('стоимость')
}

export function priceNote(item: PriceItem): string {
  return `${formatPriceNumber(item.price)} ${item.priceUnit}`.trim()
}

export function catalogsWithPriceUnits<T extends { units: string[] }>(catalogs: T, price: PriceItem[]): T {
  const extra = [...new Set(price.map((item) => item.qtyUnit).filter(Boolean))]
  if (!extra.length) return catalogs
  return { ...catalogs, units: [...new Set([...catalogs.units, ...extra])] }
}

function toPriceItem(
  index: number,
  label: string,
  price: number,
  priceUnit: string,
): PriceItem {
  const parsed = parsePriceLabel(label)
  return {
    id: `${parsed.article || 'row'}-${index}`,
    article: parsed.article,
    name: parsed.name,
    price,
    priceUnit,
    qtyUnit: qtyUnitFromPriceUnit(priceUnit),
    label,
  }
}

export async function importPriceWorkbook(file: File): Promise<PriceItem[]> {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const sheet = wb.getWorksheet('Прайс-лист') ?? wb.worksheets[0]
  if (!sheet) throw new Error('В файле нет листа прайса')

  const items: PriceItem[] = []
  sheet.eachRow((row, rowNumber) => {
    const label = cellText(row.getCell(1).value)
    const priceRaw = row.getCell(2).value
    const priceUnit = cellText(row.getCell(3).value)
    const price = parsePriceNumber(typeof priceRaw === 'string' || typeof priceRaw === 'number' ? priceRaw : cellText(priceRaw))
    if (!label || price == null) return
    if (rowNumber === 1 || isHeaderRow(label, cellText(priceRaw), priceUnit)) return
    items.push(toPriceItem(rowNumber, label, price, priceUnit || 'руб.'))
  })
  return items
}

export async function exportPriceWorkbook(items: PriceItem[]) {
  const ExcelJS = await loadExcel()
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Akufon / Ecophon CRM'
  const sheet = wb.addWorksheet('Прайс-лист')
  sheet.getRow(1).values = [undefined, 'Ecophon Артикул + полное наименование товара', 'Стоимость', 'Единица измерения']
  sheet.getRow(1).font = { bold: true }
  items.forEach((item, index) => {
    const label = item.label || ['Ecophon', item.article, item.name].filter(Boolean).join(' ')
    sheet.getRow(index + 2).values = [undefined, label, formatPriceNumber(item.price), item.priceUnit]
  })
  sheet.getColumn(1).width = 72
  sheet.getColumn(2).width = 14
  sheet.getColumn(3).width = 22
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBuffer(buffer, `Прайс_лист_компактный_Ecophon_${stamp}.xlsx`)
}
