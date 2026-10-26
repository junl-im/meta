import type { ProjectV4 } from './types.js'

export function recoveryTargetPath(current:Pick<ProjectV4,'id'>, recovered:Pick<ProjectV4,'id'>, path:string|null):string|null {
  return current.id===recovered.id?path:null
}

export interface SaveReconciliation { project: ProjectV4; dirty: boolean; rekeyHistory: boolean }

/** Keep edits made while an async save was in progress, including Save As identity changes. */
export function reconcileProjectAfterSave(latest: ProjectV4, saved: ProjectV4, sourceId: string, sourceRevision: number, latestDirty: boolean): SaveReconciliation {
  if (latest.id !== sourceId) return { project: latest, dirty: latestDirty, rekeyHistory: false }
  if (latest.revision === sourceRevision) return { project: saved, dirty: false, rekeyHistory: saved.id !== sourceId }
  if (saved.id === sourceId) return { project: latest, dirty: true, rekeyHistory: false }
  const pending = structuredClone(latest)
  pending.id = saved.id
  pending.createdAt = saved.createdAt
  pending.revision = Math.max(pending.revision, saved.revision)
  return { project: pending, dirty: true, rekeyHistory: true }
}
