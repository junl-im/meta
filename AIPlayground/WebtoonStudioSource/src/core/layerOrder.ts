import type { EditorElement, ProjectV4 } from './types.js'

export type LayerMove = 'forward' | 'backward' | 'front' | 'back'

/** Reorder selected elements while keeping their relative order stable. */
export function reorderLayers(project: ProjectV4, selectedIds: string[], move: LayerMove): boolean {
  const selected = new Set(selectedIds.filter(id=>project.elements.some(e=>e.id===id&&!e.locked&&e.visible!==false)))
  if (!selected.size) return false
  const ordered = [...project.elements].sort((a, b) => a.z - b.z || a.id.localeCompare(b.id))
  if (!ordered.some(element => selected.has(element.id))) return false

  let next: EditorElement[]
  if (move === 'front') {
    next = [...ordered.filter(element => !selected.has(element.id)), ...ordered.filter(element => selected.has(element.id))]
  } else if (move === 'back') {
    next = [...ordered.filter(element => selected.has(element.id)), ...ordered.filter(element => !selected.has(element.id))]
  } else {
    next = [...ordered]
    if (move === 'forward') {
      for (let index = next.length - 2; index >= 0; index--) {
        if (selected.has(next[index].id) && !selected.has(next[index + 1].id)) {
          ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
        }
      }
    } else {
      for (let index = 1; index < next.length; index++) {
        if (selected.has(next[index].id) && !selected.has(next[index - 1].id)) {
          ;[next[index], next[index - 1]] = [next[index - 1], next[index]]
        }
      }
    }
  }

  const changed = next.some((element, index) => element.id !== ordered[index].id)
  if (!changed) return false
  next.forEach((element, index) => { element.z = index + 1 })
  project.elements = next
  return true
}
