export interface CodexUsageWindow{usedPercent:number;remainingPercent:number;windowDurationMins:number;resetsAt:number|null}
export interface CodexUsageSnapshot{state:'ready'|'partial'|'unavailable';source:'app_server';planType:string|null;ordinaryUsageAllowed:boolean|null;fiveHour:CodexUsageWindow|null;weekly:CodexUsageWindow|null;fetchedAt:string;stale:boolean;detail:string}
export type UsageEngine='codex'|'claude'|'gemini'|'ollama'
export interface EngineUsage{engine:UsageEngine;state:'ready'|'partial'|'unavailable';label:string;detail:string;fetchedAt:string;stale:boolean;plan:string|null;allowed:boolean|null;metrics:Array<{label:string;remainingPercent:number|null;resetsAt:number|null}>}
