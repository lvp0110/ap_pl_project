const KEY = 'akufon-operator-name'

export function loadOperator(): string {
  try {
    return localStorage.getItem(KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function saveOperator(name: string) {
  localStorage.setItem(KEY, name.trim())
}
