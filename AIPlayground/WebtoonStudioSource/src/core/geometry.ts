export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export interface ElementBox { x: number; y: number; w: number; h: number }

/** Clamp the whole selection together, preserving the spacing between elements. */
export function moveElementGroup(origins: readonly ElementBox[], dx: number, dy: number): ElementBox[] {
  if (!origins.length) return []
  const deltaX = Math.max(dx, -Math.min(...origins.map(box => box.x)))
  const deltaY = Math.max(dy, -Math.min(...origins.map(box => box.y)))
  return origins.map(box => ({ ...box, x: box.x + deltaX, y: box.y + deltaY }))
}

export function resizeElementBox(origin: ElementBox, handle: ResizeHandle, dx: number, dy: number, minSize = 24): ElementBox {
  const next = { ...origin }
  if (handle.includes('e')) next.w = Math.max(minSize, origin.w + dx)
  if (handle.includes('s')) next.h = Math.max(minSize, origin.h + dy)
  if (handle.includes('w')) {
    const right = origin.x + origin.w
    next.w = Math.max(minSize, Math.min(right, origin.w - dx))
    next.x = Math.max(0, right - next.w)
  }
  if (handle.includes('n')) {
    const bottom = origin.y + origin.h
    next.h = Math.max(minSize, Math.min(bottom, origin.h - dy))
    next.y = Math.max(0, bottom - next.h)
  }
  return next
}
