/** Project data is JSON-shaped. Reuse immutable strings, notably embedded image/font bytes. */
export function cloneProject<T>(value:T):T{
  if(Array.isArray(value))return value.map(item=>cloneProject(item)) as T
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,cloneProject(item)])) as T
  return value
}
export function sameProject(a:unknown,b:unknown):boolean{
  if(a===b)return true
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false
  const first=Object.keys(a),second=Object.keys(b);if(first.length!==second.length)return false
  return first.every(key=>Object.hasOwn(b,key)&&sameProject((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key]))
}
