export interface HistoryEntry<T> { label: string; at: string; value: T }

export class CommandHistory<T> {
  private past: HistoryEntry<T>[] = []
  private future: HistoryEntry<T>[] = []
  private mergeKey:string|null=null
  private mergeAt=0
  constructor(private readonly clone: (value: T) => T, private readonly limit = 150) {}

  commit(label: string, before: T, mergeKey?:string) {
    const now=Date.now()
    if(mergeKey&&mergeKey===this.mergeKey&&now-this.mergeAt<1500&&this.future.length===0){this.mergeAt=now;return}
    this.mergeKey=mergeKey??null;this.mergeAt=now
    this.past.push({ label, at: new Date().toISOString(), value: this.clone(before) })
    if (this.past.length > this.limit) this.past.shift()
    this.future = []
  }

  undo(current: T): { label: string; value: T } | null {
    this.endBatch()
    const entry = this.past.pop()
    if (!entry) return null
    this.future.push({ label: entry.label, at: new Date().toISOString(), value: this.clone(current) })
    return { label: entry.label, value: this.clone(entry.value) }
  }

  redo(current: T): { label: string; value: T } | null {
    this.endBatch()
    const entry = this.future.pop()
    if (!entry) return null
    this.past.push({ label: entry.label, at: new Date().toISOString(), value: this.clone(current) })
    return { label: entry.label, value: this.clone(entry.value) }
  }

  getStatus() { return { undo: this.past.length, redo: this.future.length, last: this.past.at(-1)?.label ?? null } }
  remapValues(mapper: (value: T) => T) {
    this.past = this.past.map(entry => ({ ...entry, value: this.clone(mapper(entry.value)) }))
    this.future = this.future.map(entry => ({ ...entry, value: this.clone(mapper(entry.value)) }))
  }
  endBatch(){this.mergeKey=null;this.mergeAt=0}
  clear() { this.past = []; this.future = [];this.endBatch() }
}
