import { useContext } from 'react'
import { BlanksContext, CrmContext, type BlanksState, type CrmState } from './contexts'

export function useCrm(): CrmState {
  const value = useContext(CrmContext)
  if (!value) throw new Error('useCrm вызван вне CrmProvider')
  return value
}

export function useBlanks(): BlanksState {
  const value = useContext(BlanksContext)
  if (!value) throw new Error('useBlanks вызван вне BlanksProvider')
  return value
}
