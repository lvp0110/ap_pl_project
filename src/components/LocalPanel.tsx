type Props = {
  operator: string
  onOperatorChange: (name: string) => void
}

export function LocalPanel({ operator, onOperatorChange }: Props) {
  return (
    <section className="sidebar-panel">
      <h3>Этот браузер</h3>
      <p>Бланки хранятся локально. Прайс Excel загружается в таблице материалов бланка.</p>
      <label className="sidebar-field">
        Ваше имя
        <input
          value={operator}
          onChange={(e) => onOperatorChange(e.target.value)}
          placeholder="кто сохранил бланк"
        />
      </label>
    </section>
  )
}
