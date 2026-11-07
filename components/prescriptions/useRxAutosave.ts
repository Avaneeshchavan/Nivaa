'use client'
import { useEffect, useRef, useState } from 'react'
import { getRxPatientContext } from '@/actions/prescriptions.actions'
import { saveRxDraft, deleteRxDraft, getRxDraftEnvelope } from '@/actions/drafts.actions'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { rxDraftSchema, type RxDraft } from '@/lib/validations/draft.schema'
import { cachedPatient, cloudDraftKey, localDraftKey, makeLocalDraft, readLocalDrafts, reconcileDraft, writeLocalDraft, type CloudDraft, type LocalDraft } from '@/lib/rx/local-drafts'
import type { PrescriptionPatient } from '@/lib/prescription-patient'

export function useRxAutosave({doctorId,key,initialPatientId,seed,cloud,patientFor}:{doctorId:string;key:string;initialPatientId?:string;seed:RxDraft;cloud:CloudDraft;patientFor:(id:string|null)=>PrescriptionPatient|undefined}){
 const [status,setStatus]=useState('Preparing draft…'),[ready,setReady]=useState(false),[restoredPatient,setRestoredPatient]=useState<PrescriptionPatient|null>(null)
 const [patientFromDevice,setPatientFromDevice]=useState(false)
 const stopped=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),queue=useRef<Promise<void>>(Promise.resolve()),pending=useRef<LocalDraft|null>(null)
 const revision=useRef(0), localOK=useRef(false)
 const metadata=useRef(patientFor);metadata.current=patientFor
 const initial=useRef({seed,cloud});initial.current={seed,cloud}
 const variant=key.startsWith('duplicate_')?key:'standard'
 const storage=()=>{try{return window.localStorage}catch{return null}}
 const drain=useRef<()=>void>(()=>{})
 useEffect(()=>{
  let cancelled=false,unsubscribe=()=>{}
  stopped.current=false;setReady(false)
  const persist=(entry:LocalDraft)=>{const disk=storage();let ok=false;try{ok=Boolean(disk&&writeLocalDraft(disk,entry))}catch{}localOK.current=ok;if(!ok)setStatus('Device backup unavailable or full. Keep this page open until saved online.');return Boolean(ok)}
  const save=()=>{
   const entry=pending.current
   if(!entry?.payload||stopped.current||!navigator.onLine)return
   pending.current=null
   queue.current=queue.current.then(async()=>{
    if(stopped.current)return
    try{
     await saveRxDraft(cloudDraftKey(entry.patientId,variant),entry.payload!)
     const disk=storage(),latest=disk?readLocalDrafts(disk,doctorId,entry.patientId,variant):null
     if(latest?.updatedAt===entry.updatedAt)persist({...latest,dirty:false})
     if(!cancelled&&!stopped.current&&!pending.current)setStatus('Saved')
    }catch{
     // Never discard failed edits or overwrite a newer queued revision.
     if(!pending.current||pending.current.updatedAt<entry.updatedAt)pending.current=entry
     if(!cancelled&&!stopped.current)setStatus(localOK.current?(navigator.onLine?'Saved on device · cloud sync pending':'Offline — will sync'):'Not backed up. Keep this page open and retry online.')
    }
   })
  }
  drain.current=save
  const changed=()=>{
   if(stopped.current)return
   const state=useRxBuilderStore.getState()
   if(state.ownerId!==doctorId)return
   const parsed=rxDraftSchema.safeParse(state)
   if(!parsed.success){setStatus('Draft exceeds backup limits. Review your entries.');return}
   revision.current=Math.max(Date.now(),revision.current+1)
   const entry=makeLocalDraft(doctorId,parsed.data,variant,revision.current,metadata.current(state.patientId))
   pending.current=entry
   const backedUp=persist(entry)
   if(backedUp)setStatus(navigator.onLine?'Saving…':'Offline — will sync')
   clearTimeout(timer.current);timer.current=setTimeout(save,1500)
  }
  const online=()=>{setStatus('Syncing…');save()}
  const offline=()=>setStatus(localOK.current?'Offline — will sync':'Offline. Device backup unavailable; keep this page open.')
  const flush=()=>{clearTimeout(timer.current);save()}
  const boot=async()=>{
   const disk=storage()
   let local:LocalDraft|null=null
   try{local=disk?readLocalDrafts(disk,doctorId,initialPatientId,variant):null}catch{/* Storage can be blocked in private browsing. Cloud editing still works. */}
   const selected=initialPatientId||local?.patientId||initial.current.cloud?.payload.patientId||initial.current.seed.patientId
   const effective=cloudDraftKey(selected||null,variant)
   let remote=initial.current.cloud
   if(effective!==key){try{remote=await getRxDraftEnvelope(effective)}catch{remote=null}}
   if(cancelled)return
   // An explicit patient route can never restore a different patient's draft.
   if(remote?.payload.patientId!==selected)remote=null
   const chosen=reconcileDraft(local,remote,initial.current.seed)
   let context=local?.patientId===chosen.payload.patientId?cachedPatient(local):null
   let deviceContext=Boolean(context)
   if(selected && !metadata.current(selected)){
    try{
     const fresh=await getRxPatientContext(selected)
     if(!fresh)throw new Error('Patient unavailable')
     context=fresh;deviceContext=false
    }catch{
     if(!context)throw new Error('Patient details unavailable')
    }
   }else if(metadata.current(selected||null)){deviceContext=false}
   if(cancelled)return
   useRxBuilderStore.getState().hydrate(chosen.payload,doctorId)
   setRestoredPatient(context);setPatientFromDevice(deviceContext)
   setStatus(!navigator.onLine?'Offline — will sync':chosen.source==='local'?'Device draft restored':'Saved')
   setReady(true)
   unsubscribe=useRxBuilderStore.subscribe(changed)
   if(chosen.source==='local'&&chosen.local?.dirty){localOK.current=true;pending.current=chosen.local;save()}
  }
  void boot().catch(()=>{if(!cancelled)setStatus('Draft could not be restored. Reload to try again.')})
  window.addEventListener('online',online);window.addEventListener('offline',offline);window.addEventListener('pagehide',flush)
  return()=>{cancelled=true;unsubscribe();clearTimeout(timer.current);save();window.removeEventListener('online',online);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',flush)}
 },[doctorId,key,initialPatientId,variant])
 const complete=async()=>{
  stopped.current=true;clearTimeout(timer.current);pending.current=null
  await queue.current
  const state=useRxBuilderStore.getState(),disk=storage()
  try{if(disk)writeLocalDraft(disk,{version:2,doctorId,patientId:state.patientId,variant,updatedAt:Date.now(),dirty:false,completed:true,payload:null})}catch{/* Cloud deletion must still run when device storage is blocked. */}
  await deleteRxDraft(cloudDraftKey(state.patientId,variant))
  try{if(disk)disk.removeItem(localDraftKey(doctorId,state.patientId,variant))}catch{/* Completion tombstone is safe to retain. */}
 }
 return{status,ready,restoredPatient,patientFromDevice,complete,retry:()=>drain.current()}
}
