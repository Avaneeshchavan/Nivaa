import type { BrandChoice } from './brand'
const cache = new Map<string,{until:number;rows:BrandChoice[]}>()
const key=(doctor:string,query:string,system:string)=>JSON.stringify([doctor,query,system])
export function cachedMedicines(doctor:string|undefined,query:string,system:string,now=Date.now()) {
  if(!doctor)return undefined
  const entry=cache.get(key(doctor,query,system))
  if(!entry||entry.until<now)return undefined
  return entry.rows.map(row=>({...row,defaults:row.defaults?{...row.defaults}:row.defaults}))
}
export function cacheMedicines(doctor:string|undefined,query:string,system:string,rows:BrandChoice[]) {
  if(!doctor)return
  if(cache.size>=60)cache.delete(cache.keys().next().value!)
  cache.set(key(doctor,query,system),{until:Date.now()+30000,rows})
}
export function clearMedicineCache(doctor:string|undefined) {
  if(!doctor)return
  for(const k of cache.keys())if(JSON.parse(k)[0]===doctor)cache.delete(k)
}
