require('tsx/cjs')
const {performance}=require('node:perf_hooks')
const {useRxBuilderStore:store}=require('../stores/rxBuilderStore.ts')
const {rxDraftSchema}=require('../lib/validations/draft.schema.ts')
const {rxSaveReason}=require('../lib/prescriptions/save-state.ts')
const {makeLocalDraft,writeLocalDraft}=require('../lib/rx/local-drafts.ts')
const {quantityForPattern}=require('../lib/rx/dose.ts')
const rows=[]
const disk={data:new Map(),get length(){return this.data.size},key(i){return[...this.data.keys()][i]??null},getItem(k){return this.data.get(k)||null},setItem(k,v){this.data.set(k,v)},removeItem(k){this.data.delete(k)}}
const medicine=i=>({id:`synthetic-${i}`,name:'Synthetic medicine',dosage:'1-0-1 tablet',frequency:'BD',duration:'5 days',pattern:'1-0-1',doseUnit:'tablet',durationDays:5,quantity:10,instructions:''})
for(const count of [4,100]){
 store.getState().hydrate({patientId:'synthetic-p',medicines:Array.from({length:count},(_,i)=>medicine(i))},'synthetic-doctor')
 const timings=[]
 for(let i=0;i<550;i++){
  const start=performance.now()
  store.getState().setNotes(`Synthetic edit ${i}`)
  const state=store.getState(),payload=rxDraftSchema.parse(state)
  writeLocalDraft(disk,makeLocalDraft('synthetic-doctor',payload,'standard',Date.now()))
  rxSaveReason({...state,saving:false,handwritingBusy:false})
  if(i>=50)timings.push(performance.now()-start)
 }
 timings.sort((a,b)=>a-b)
 rows.push({medicines:count,samples:timings.length,editValidateSerializeMemoryWriteP50ms:+timings[250].toFixed(3),p95ms:+timings[475].toFixed(3)})
}
store.getState().hydrate({patientId:'synthetic-p'},'synthetic-doctor');const start=performance.now()
for(let i=0;i<4;i++)store.getState().addMedicine({...medicine(i),quantity:quantityForPattern('1-0-1',5,'BD')})
console.log(JSON.stringify({kind:'Node synthetic core only; excludes React, DOM, real localStorage, network and doctor interaction',results:rows,fourStoreAddsMs:+(performance.now()-start).toFixed(3)},null,2))
