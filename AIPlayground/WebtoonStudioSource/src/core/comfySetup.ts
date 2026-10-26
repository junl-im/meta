export interface ComfySetupStatus{stage:'idle'|'checking'|'download'|'extracting'|'reuse'|'starting'|'ready'|'error';busy:boolean;percent:number|null;detail:string}
