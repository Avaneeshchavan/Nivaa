import { z } from 'zod'
import { rxDraftSchema, type RxDraft } from '../validations/draft.schema'
import type { PrescriptionPatient } from '../prescription-patient'
const prefix='nivaa:rx:v2:'
const maxEntry=512*1024,maxTotal=4*1024*1024,ttl=7*86400000
const patientSchema=z.object({id:z.string().max(100),name:z.string().max(160),dob:z.iso.datetime().nullable(),gender:z.string().max(30).nullable(),phone:z.string().max(40).nullable(),allergies:z.string().max(2000).nullable()})
const envelopeSchema=z.object({version:z.literal(2),doctorId:z.string().min(1).max(100),patientId:z.string().max(100).nullable(),variant:z.string().min(1).max(160),updatedAt:z.number().finite().positive(),dirty:z.boolean(),completed:z.boolean().default(false),payload:rxDraftSchema.nullable(),patient:patientSchema.optional()})
export type LocalDraft=z.output<typeof envelopeSchema>
export type CloudDraft={payload:RxDraft;updatedAt:string}|null
export function localDraftKey(doctorId:string,patientId:string|null,variant='standard') {return prefix+JSON.stringify([doctorId,patientId,variant])}
export function cloudDraftKey(patientId:string|null,variant:string) {return variant==='standard'?(patientId?`patient_${patientId}`:'new'):variant}
export function readLocalDrafts(storage:Storage,doctorId:string,patientId:string|null|undefined,variant='standard',now=Date.now()):LocalDraft|null{
 const found:LocalDraft[]=[]
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);if(!key?.startsWith(prefix))continue
  try{
   const row=envelopeSchema.safeParse(JSON.parse(storage.getItem(key)||'null'))
   if(!row.success)continue
   const value=row.data
   if(value.doctorId!==doctorId || value.variant!==variant || (patientId!==undefined && value.patientId!==patientId) || (!value.dirty && now-value.updatedAt>ttl) || (patientId===undefined && value.completed))continue
   if(key!==localDraftKey(doctorId,value.patientId,variant) || (value.payload && value.payload.patientId!==value.patientId) || (value.patient && value.patient.id!==value.patientId))continue
   found.push(value)
  }catch{/* Ignore malformed local values; never log clinical contents. */}
 }
 return found.sort((a,b)=>b.updatedAt-a.updatedAt)[0]||null
}
export function writeLocalDraft(storage:Storage,value:LocalDraft,now=Date.now()):boolean{
 const parsed=envelopeSchema.safeParse(value)
 if(!parsed.success)return false
 const text=JSON.stringify(parsed.data),key=localDraftKey(value.doctorId,value.patientId,value.variant)
 if(text.length*2>maxEntry)return false
 let total=text.length*2
 const removable:string[]=[]
 for(let i=0;i<storage.length;i++){
  const other=storage.key(i);if(!other?.startsWith(prefix)||other===key)continue
  const raw=storage.getItem(other)||''
  try{const row=envelopeSchema.parse(JSON.parse(raw));if(now-row.updatedAt>ttl&&!row.dirty){removable.push(other);continue}}catch{/* Keep unrelated/malformed values untouched. */}
  total+=raw.length*2
 }
 if(total>maxTotal)return false
 try{for(const old of removable)storage.removeItem(old);storage.setItem(key,text);return true}catch{return false}
}
export function makeLocalDraft(doctorId:string,payload:RxDraft,variant:string,updatedAt:number,patient?:PrescriptionPatient):LocalDraft{
 return{version:2,doctorId,patientId:payload.patientId,variant,updatedAt,dirty:true,completed:false,payload,
  ...(patient?.id===payload.patientId?{patient:{...patient,dob:patient.dob?new Date(patient.dob).toISOString():null}}:{})}
}
export function cachedPatient(value:LocalDraft|null):PrescriptionPatient|null{
 return value?.patient?{...value.patient,dob:value.patient.dob?new Date(value.patient.dob):null}:null
}
export function reconcileDraft(local:LocalDraft|null,cloud:CloudDraft,seed:RxDraft){
 if(local?.completed && (!cloud||local.updatedAt>=Date.parse(cloud.updatedAt)))return{payload:seed,source:'completed' as const,local:null}
 if(local?.payload && (!cloud || (local.dirty && local.updatedAt>Date.parse(cloud.updatedAt))))return{payload:local.payload,source:'local' as const,local}
 if(cloud)return{payload:cloud.payload,source:'cloud' as const,local:null}
 return{payload:seed,source:'seed' as const,local:null}
}
