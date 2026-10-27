import type {ProjectV4} from '@core/types'
const DB='webtoon-studio-web',STORE='drafts'
// Keep writes and clears in request order, even when opening IndexedDB takes different amounts of time.
let pending:Promise<void>=Promise.resolve()
const enqueue=(operation:()=>Promise<void>)=>{const result=pending.then(operation);pending=result.catch(()=>{});return result}
const open=()=>new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
export function saveDraft(project:ProjectV4){return enqueue(async()=>{const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('임시저장이 중단됐습니다.'))})}finally{db.close()}})}
export async function loadDraft():Promise<ProjectV4|null>{const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get('current');request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error)})}finally{db.close()}}
export function clearDraft(){return enqueue(async()=>{const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete('current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('임시 원고 삭제가 중단됐습니다.'))})}finally{db.close()}})}
