import type { ProjectEvent, ProjectV4 } from './types.js'

export function appendEvent(project: ProjectV4, type: string, detail = ''): ProjectV4 {
  const event: ProjectEvent = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
    at: new Date().toISOString(),
    type,
    detail
  }
  return { ...project, events: [...project.events, event].slice(-500), updatedAt: event.at, revision: project.revision + 1 }
}
