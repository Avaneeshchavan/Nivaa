import { parseRxMedicines } from '@/lib/validations/prescription.schema'
import type { DiseaseTemplate } from '@/lib/generated/prisma/client'
import { emptyHandwriting, type Handwriting } from '@/lib/validations/handwriting.schema'
import { create } from 'zustand'
import { emptyVisitForm, type VisitFormValues } from '@/lib/validations/visit.schema'
import type { Food } from '@/lib/rx/dose'
export interface RxMedicine {
  brandId?: string; manufacturer?: string | null; strengthText?: string | null; composition?: string
  pattern?: string; food?: Food; doseUnit?: string; durationDays?: number | null; quantity?: number | null
  id: string; name: string; generic?: string | null; form?: string | null
  dosage: string; frequency: string; duration: string; instructions: string
}
interface Content {
  visit: VisitFormValues; diagnosis: string; medicines: RxMedicine[]; notes: string
  handwriting: Handwriting; templateId: string | null; followUpDate: string
}
interface RxBuilderState extends Content {
  patientId: string | null; ownerId: string | null
  past: Content[]; future: Content[]; lastEditKey: string; lastEditAt: number
  hydrate: (data: Partial<Content> & { patientId?: string | null }, ownerId: string) => void
  setVisit: (value: VisitFormValues) => void
  setPatientId: (id: string | null) => void
  setDiagnosis: (value: string) => void
  setNotes: (value: string) => void
  setFollowUpDate: (value: string) => void
  setHandwriting: (value: Handwriting) => void
  addMedicine: (value: RxMedicine) => void
  updateMedicine: (id: string, value: Partial<RxMedicine>) => void
  removeMedicine: (id: string) => void
  moveMedicine: (id: string, target: number) => void
  applyTemplate: (value: Pick<DiseaseTemplate,'id'|'diagnosis'|'medicines'>) => void
  replaceContent: (value: Partial<Content>) => void
  undo: () => void; redo: () => void; reset: () => void
}
const initial: Content = { visit: emptyVisitForm, diagnosis: '', medicines: [], notes: '', handwriting: emptyHandwriting, templateId: null, followUpDate: '' }
const snapshot = (state: Content): Content => ({visit:state.visit,diagnosis:state.diagnosis,medicines:state.medicines,notes:state.notes,handwriting:state.handwriting,templateId:state.templateId,followUpDate:state.followUpDate})
const history = {past:[] as Content[],future:[] as Content[],lastEditKey:'',lastEditAt:0}
export const useRxBuilderStore = create<RxBuilderState>((set) => {
  const change = (patch: Partial<Content> | ((s: RxBuilderState) => Partial<Content>), key='') => set(state => {
    const now=Date.now(), coalesce=Boolean(key && key===state.lastEditKey && now-state.lastEditAt<700 && state.past.length)
    return {...(typeof patch==='function'?patch(state):patch),past:coalesce?state.past:[...state.past,snapshot(state)].slice(-20),future:[],lastEditKey:key,lastEditAt:now}
  })
  return {
    ...initial,...history,patientId:null,ownerId:null,
    hydrate:(data,ownerId)=>set({...initial,...data,patientId:data.patientId??null,followUpDate:data.followUpDate||'',ownerId,...history}),
    setVisit:value=>change({visit:value},'visit'),
    setDiagnosis:value=>change({diagnosis:value},'diagnosis'),
    setNotes:value=>change({notes:value},'notes'),
    setFollowUpDate:value=>change({followUpDate:value}),
    setHandwriting:value=>change({handwriting:value},'handwriting'),
    setPatientId:id=>set(state=>state.patientId && id!==state.patientId?{...initial,patientId:id,...history}:{patientId:id,...history}),
    addMedicine:value=>change(state=>({medicines:[...state.medicines,value]})),
    updateMedicine:(id,value)=>change(state=>({medicines:state.medicines.map(m=>m.id!==id?m:{...m,
      ...(value.name!==undefined && value.name!==m.name?{brandId:undefined,manufacturer:undefined,strengthText:undefined,composition:undefined,generic:undefined,form:undefined}:{}),...value})}),`medicine:${id}:${Object.keys(value).sort().join(',')}`),
    removeMedicine:id=>change(state=>({medicines:state.medicines.filter(m=>m.id!==id)})),
    moveMedicine:(id,target)=>change(state=>{
      const medicines=[...state.medicines], source=medicines.findIndex(m=>m.id===id)
      if(source<0)return{}
      const [medicine]=medicines.splice(source,1)
      medicines.splice(Math.max(0,Math.min(target,medicines.length)),0,medicine)
      return{medicines}
    }),
    applyTemplate:template=>change({diagnosis:template.diagnosis||'',medicines:parseRxMedicines(template.medicines).map(m=>({...m,id:crypto.randomUUID()})),templateId:template.id}),
    replaceContent:value=>change(value),
    undo:()=>set(state=>state.past.length?{...state.past[state.past.length-1],past:state.past.slice(0,-1),future:[snapshot(state),...state.future].slice(0,20),lastEditKey:''}:{}),
    redo:()=>set(state=>state.future.length?{...state.future[0],past:[...state.past,snapshot(state)].slice(-20),future:state.future.slice(1),lastEditKey:''}:{}),
    reset:()=>set({...initial,...history,patientId:null,ownerId:null}),
  }
})
