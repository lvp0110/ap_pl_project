const PREFIX = 'crm-blank-notes:'
const NEW_KEY = 'new'

export type SheetNotes = {
  header: string
  ag: string
  sg: string
  materials: Record<string, string>
}

const EMPTY: SheetNotes = { header: '', ag: '', sg: '', materials: {} }

function storageKey(id: number | string): string {
  return `${PREFIX}${id}`
}

export function loadSheetNotes(id: number | string | undefined): SheetNotes {
  if (id === undefined || id === '') return { ...EMPTY, materials: {} }
  try {
    const raw = localStorage.getItem(storageKey(id))
    if (!raw) return { ...EMPTY, materials: {} }
    const parsed = JSON.parse(raw) as Partial<SheetNotes>
    return {
      header: typeof parsed.header === 'string' ? parsed.header : '',
      ag: typeof parsed.ag === 'string' ? parsed.ag : '',
      sg: typeof parsed.sg === 'string' ? parsed.sg : '',
      materials:
        parsed.materials && typeof parsed.materials === 'object' && !Array.isArray(parsed.materials)
          ? { ...parsed.materials }
          : {},
    }
  } catch {
    return { ...EMPTY, materials: {} }
  }
}

export function saveSheetNotes(id: number | string, notes: SheetNotes) {
  localStorage.setItem(storageKey(id), JSON.stringify(notes))
}

export function adoptSheetNotes(to: number, from: number | string = NEW_KEY) {
  if (String(from) === String(to)) return
  const notes = loadSheetNotes(from)
  saveSheetNotes(to, notes)
  localStorage.removeItem(storageKey(from))
}

export function materialNote(
  notes: Record<string, string>,
  materialId: number | string | undefined,
  fallback = '',
): string {
  if (materialId === undefined || materialId === '' || materialId === 0) return fallback
  const key = String(materialId)
  return Object.prototype.hasOwnProperty.call(notes, key) ? notes[key] : fallback
}
