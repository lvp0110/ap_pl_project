import { useState } from 'react'
import type { MaterialDraft } from '../lib/api/materials'

type Props = {
  brand: string
  busy: boolean
  onCreate: (draft: MaterialDraft) => Promise<void>
}

const EMPTY = { article: '', name: '', price: '', unit: '', comment: '' }

export function MaterialCreateForm({ brand, busy, onCreate }: Props) {
  const [values, setValues] = useState(EMPTY)

  const draft: MaterialDraft = {
    brand_code: brand,
    article: values.article.trim(),
    name: values.name.trim(),
    price: Number(values.price || 0),
    unit: values.unit.trim(),
    comment: values.comment.trim(),
  }

  const valid = Boolean(draft.name) && Boolean(draft.unit) && Number.isFinite(draft.price) && draft.price >= 0

  function change(key: keyof typeof EMPTY, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form
      className="materials-create"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        void onCreate(draft)
          .then(() => setValues(EMPTY))
          .catch(() => {})
      }}
    >
      <input
        value={values.article}
        disabled={busy}
        placeholder="Артикул"
        onChange={(e) => change('article', e.target.value)}
      />
      <input
        value={values.name}
        disabled={busy}
        placeholder="Материал *"
        onChange={(e) => change('name', e.target.value)}
      />
      <input
        type="number"
        step="0.01"
        min="0"
        value={values.price}
        disabled={busy}
        placeholder="Цена"
        onChange={(e) => change('price', e.target.value)}
      />
      <input
        value={values.unit}
        disabled={busy}
        placeholder="Ед. *"
        onChange={(e) => change('unit', e.target.value)}
      />
      <input
        value={values.comment}
        disabled={busy}
        placeholder="Комментарий"
        onChange={(e) => change('comment', e.target.value)}
      />
      <button type="submit" className="ghost" disabled={busy || !valid}>
        Добавить
      </button>
    </form>
  )
}
