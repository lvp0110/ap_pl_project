import type { BlankEnvelope } from '../lib/repo/types'
import type { Project } from '../types'

type Props = {
  remote: BlankEnvelope
  localName: string
  onUseRemote: (project: Project) => void
  onOverwrite: () => void
  onCancel: () => void
}

function formatWhen(iso: string) {
  if (!iso) return 'неизвестно когда'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('ru-RU')
}

export function ConflictDialog({ remote, localName, onUseRemote, onOverwrite, onCancel }: Props) {
  const who = remote.updatedBy || 'кто-то другой'
  const title = remote.project.name || localName || `бланк ${remote.project.id}`

  return (
    <div className="blank-root">
      <button type="button" className="blank-backdrop" aria-label="Закрыть" onClick={onCancel} />
      <div className="conflict-sheet" role="dialog" aria-labelledby="conflict-title">
        <p className="eyebrow">Конфликт файла</p>
        <h2 id="conflict-title">Бланк уже изменён в папке</h2>
        <p>
          «{title}» записали {who} ({formatWhen(remote.updatedAt)}). Если сохранить сейчас, их правки пропадут.
        </p>
        <div className="drawer-actions">
          <button type="button" className="primary" onClick={() => onUseRemote(remote.project)}>
            Взять версию из папки
          </button>
          <button type="button" className="ghost" onClick={onOverwrite}>
            Всё равно перезаписать
          </button>
          <button type="button" className="ghost" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
