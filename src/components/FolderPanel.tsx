import { useRef } from 'react'

type Props = {
  supported: boolean
  connected: boolean
  needsGesture: boolean
  folderName: string
  operator: string
  busy: boolean
  onOperatorChange: (name: string) => void
  onPickFolder: () => void
  onResume: () => void
  onReload: () => void
  onWriteAll: () => void
  onWriteExcel: () => void
  onDisconnect: () => void
  onDownloadJson: () => void
  onImportJson: (files: FileList) => void
}

export function FolderPanel({
  supported,
  connected,
  needsGesture,
  folderName,
  operator,
  busy,
  onOperatorChange,
  onPickFolder,
  onResume,
  onReload,
  onWriteAll,
  onWriteExcel,
  onDisconnect,
  onDownloadJson,
  onImportJson,
}: Props) {
  const jsonRef = useRef<HTMLInputElement>(null)

  return (
    <section className="folder-panel">
      <h3>Общая папка</h3>
      <p>
        {connected
          ? `Запись в «${folderName}». JSON — источник, registry.xlsx — снимок для Excel.`
          : supported
            ? 'Выберите папку на диске, в Google Drive, Яндекс.Диске или SharePoint (синхронизированную на компьютер).'
            : 'Этот браузер не пишет в папку. Нужны Chrome или Edge. JSON можно скачать и положить в папку вручную.'}
      </p>
      <label className="folder-operator">
        Ваше имя
        <input
          value={operator}
          onChange={(e) => onOperatorChange(e.target.value)}
          placeholder="чтобы видеть, кто сохранил"
        />
      </label>
      {connected ? (
        <div className="folder-actions">
          <button type="button" className="ghost" disabled={busy} onClick={onReload}>
            Прочитать папку
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={onWriteAll}>
            Записать всё
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={onWriteExcel}>
            Обновить Excel
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={onDisconnect}>
            Отключить
          </button>
        </div>
      ) : (
        <div className="folder-actions">
          {needsGesture && (
            <button type="button" className="primary" disabled={busy} onClick={onResume}>
              Открыть «{folderName}»
            </button>
          )}
          {supported && (
            <button type="button" className={needsGesture ? 'ghost' : 'primary'} disabled={busy} onClick={onPickFolder}>
              {needsGesture ? 'Выбрать другую' : 'Выбрать папку'}
            </button>
          )}
        </div>
      )}
      <div className="folder-actions">
        <input
          ref={jsonRef}
          type="file"
          accept="application/json,.json"
          multiple
          hidden
          onChange={(e) => {
            const files = e.target.files
            e.target.value = ''
            if (files?.length) onImportJson(files)
          }}
        />
        <button type="button" className="ghost" disabled={busy} onClick={onDownloadJson}>
          Скачать JSON
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => jsonRef.current?.click()}>
          Загрузить JSON
        </button>
      </div>
    </section>
  )
}
