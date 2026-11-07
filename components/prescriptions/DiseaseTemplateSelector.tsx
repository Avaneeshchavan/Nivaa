'use client'
import { useState } from 'react'
import type { DiseaseTemplate } from '@/lib/generated/prisma/client'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { rememberTemplate } from '@/actions/rx-workflow.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
type Preference={templateId:string;isFavorite:boolean;lastUsedAt:Date|string|null}
export default function DiseaseTemplateSelector({templates,preferences=[]}:{templates:DiseaseTemplate[];preferences?:Preference[]}){
 const [query,setQuery]=useState(''),[more,setMore]=useState(false),[prefs,setPrefs]=useState(preferences),[error,setError]=useState('')
 const apply=useRxBuilderStore(s=>s.applyTemplate)
 const selectTemplate=(template:DiseaseTemplate)=>{
  const state=useRxBuilderStore.getState()
  if((state.diagnosis||state.medicines.length)&&!window.confirm('Replace diagnosis and medicines with this template? You can undo this change.'))return
  apply(template)
  setPrefs(current=>[...current.filter(item=>item.templateId!==template.id),{templateId:template.id,isFavorite:current.find(item=>item.templateId===template.id)?.isFavorite||false,lastUsedAt:new Date()}])
  void rememberTemplate(template.id).catch(()=>setError('Template applied. Recent preferences could not be saved.'))
 }
 const favorites=templates.filter(t=>prefs.find(p=>p.templateId===t.id)?.isFavorite)
 const recent=[...prefs].filter(p=>p.lastUsedAt).sort((a,b)=>new Date(b.lastUsedAt!).getTime()-new Date(a.lastUsedAt!).getTime()).slice(0,4).map(p=>templates.find(t=>t.id===p.templateId)).filter((t):t is DiseaseTemplate=>Boolean(t))
 const filtered=templates.filter(t=>`${t.name} ${t.diagnosis||''}`.toLowerCase().includes(query.toLowerCase()))
 const row=(template:DiseaseTemplate)=><div key={template.id} className="flex items-stretch gap-1"><Button type="button" variant="outline" className="flex-1 justify-start whitespace-normal text-left" onClick={()=>selectTemplate(template)}>{template.name}</Button><Button type="button" variant="ghost" aria-label={`Favorite ${template.name}`} aria-pressed={Boolean(prefs.find(p=>p.templateId===template.id)?.isFavorite)} onClick={async()=>{const favorite=!prefs.find(p=>p.templateId===template.id)?.isFavorite;try{await rememberTemplate(template.id,favorite);setPrefs(current=>[...current.filter(p=>p.templateId!==template.id),{templateId:template.id,isFavorite:favorite,lastUsedAt:current.find(p=>p.templateId===template.id)?.lastUsedAt||null}])}catch{setError('Favorite could not be saved.')}}}>{prefs.find(p=>p.templateId===template.id)?.isFavorite?'★':'☆'}</Button></div>
 if(!templates.length)return <p className="text-sm text-muted-foreground">No saved templates yet.</p>
 return <div className="space-y-3" aria-label="Prescription templates">
  <Input aria-label="Search prescription templates" placeholder="Search templates" value={query} onChange={e=>setQuery(e.target.value)}/>
  {!query&&favorites.length>0&&<div><p className="mb-2 font-semibold">Favorites</p><div className="grid gap-2 sm:grid-cols-2">{favorites.slice(0,4).map(row)}</div></div>}
  {!query&&recent.length>0&&<div><p className="mb-2 font-semibold">Recent</p><div className="grid gap-2 sm:grid-cols-2">{recent.map(row)}</div></div>}
  <div className="grid gap-2 sm:grid-cols-2">{(more?filtered:filtered.slice(0,8)).map(row)}</div>
  {filtered.length>8&&<Button type="button" variant="outline" onClick={()=>setMore(!more)}>{more?'Show less':`More (${filtered.length-8})`}</Button>}
  {!filtered.length&&<p role="status">No templates match.</p>}{error&&<p role="status" className="text-sm text-red-900">{error}</p>}
 </div>
}
