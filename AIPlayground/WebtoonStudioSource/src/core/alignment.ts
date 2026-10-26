import type { ProjectV4 } from './types.js'

export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

export function alignElements(project: ProjectV4, ids: string[], mode: AlignMode) {
  const selected = ids.map(id => project.elements.find(element => element.id === id)).filter((element): element is NonNullable<typeof element> => Boolean(element))
  if (!selected.length) return
  const anchor = selected[0]!
  const canvas = project.canvas
  const target = selected.length === 1
    ? {
        left: 0,
        center: canvas.width / 2,
        right: canvas.width,
        top: 0,
        middle: canvas.height / 2,
        bottom: canvas.height,
      }
    : {
        left: anchor.x,
        center: anchor.x + anchor.w / 2,
        right: anchor.x + anchor.w,
        top: anchor.y,
        middle: anchor.y + anchor.h / 2,
        bottom: anchor.y + anchor.h,
      }

  for (const element of selected) {
    if (element.locked) continue
    if (mode === 'left') element.x = Math.max(0, target.left)
    if (mode === 'center') element.x = Math.max(0, target.center - element.w / 2)
    if (mode === 'right') element.x = Math.max(0, target.right - element.w)
    if (mode === 'top') element.y = Math.max(0, target.top)
    if (mode === 'middle') element.y = Math.max(0, target.middle - element.h / 2)
    if (mode === 'bottom') element.y = Math.max(0, target.bottom - element.h)
  }
}
