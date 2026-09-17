import { useState } from 'react'
import type { MaterialDraft } from '../lib/api/materials'
import type { CrmMaterial } from '../lib/api/types'

type Props = {
  material: CrmMaterial
  brand: string
  busy: boolean
  onSave: (material: CrmMaterial, draft: MaterialDraft) => Promise<void>
  onArchive: (material: CrmMaterial) => Promise<void>
}

export function MaterialRow({ material, brand, busy, onSave, onArchive }: Props) {
  const [article, setArticle] = useState(material.article ?? '')
  const [name, setName] = useState(material.name)
  const [price, setPrice] = useState(String(material.price))
  const [unit, setUnit] = useState(material.unit)
  const [comment, setComment] = useState(material.comment ?? '')

  const draft: MaterialDraft = {
    brand_code: brand,
    article: article.trim(),
    name: name.trim(),
    price: Number(price),
    unit: unit.trim(),
    comment: comment.trim(),
  }

  const valid = Boolean(draft.name) && Boolean(draft.unit) && Number.isFinite(draft.price) && draft.price >= 0
  const dirty =
    draft.article !== (material.article ?? '') ||
    draft.name !== material.name ||
    draft.price !== material.price ||
    draft.unit !== material.unit ||
    draft.comment !== (material.comment ?? '')

  function reset() {
    setArticle(material.article ?? '')
    setName(material.name)
    setPrice(String(material.price))
    setUnit(material.unit)
    setComment(material.comment ?? '')
  }

  return (
    <tr>
      <td>
        <input value={article} disabled={busy} onChange={(e) => setArticle(e.target.value)} />
      </td>
      <td>
        <input value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          disabled={busy}
          onChange={(e) => setPrice(e.target.value)}
        />
      </td>
      <td>
        <input value={unit} disabled={busy} onChange={(e) => setUnit(e.target.value)} />
      </td>
      <td>
        <input value={comment} disabled={busy} onChange={(e) => setComment(e.target.value)} />
      </td>
      <td className="materials-actions">
        <button
          type="button"
          className="ghost"
          disabled={busy || !dirty || !valid}
          onClick={() => void onSave(material, draft).catch(reset)}
        >
          Сохранить
        </button>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => {
            if (!confirm(`Убрать материал «${material.name}»?`)) return
            void onArchive(material)
          }}
        >
          Убрать
        </button>
      </td>
    </tr>
  )
}
