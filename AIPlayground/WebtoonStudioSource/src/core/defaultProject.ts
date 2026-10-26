import type { ProjectV4 } from './types.js'

const id = (prefix = 'p') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export function createDefaultProject(title = '새 웹툰', episode = '1화'): ProjectV4 {
  const now = new Date().toISOString()
  return {
    version: '0.4',
    schemaVersion: 4,
    id: id('project'),
    title,
    episode,
    createdAt: now,
    updatedAt: now,
    revision: 0,
    canvas: { width: 900, height: 7000, background: '#ffffff' },
    scenes: [{ id: 'scene_root', name: '장면 1', startY: 0, collapsed: false }],
    elements: [],
    assets: [],
    events: [],
    settings: { snap: true, guides: true, gridSize: 10, smartSnapDistance: 8 },
    selectedId: null,
    selectedIds: [],
    zoom: 0.7
  }
}
