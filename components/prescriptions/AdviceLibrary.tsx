'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { deleteAdviceSnippet, saveAdviceSnippet, seedAdviceLibrary } from '@/actions/rx-workflow.actions'
import type { AdviceSnippet } from '@/lib/generated/prisma/client'
import { clinicToday, followUpAfter } from '@/lib/rx/dose'
export default function AdviceLibrary({initial}:{initial:AdviceSnippet[]}){
 const [items,setItems]=useState(initial),[language,setLanguage]=useState<'EN'|'MR'|'HI'>('EN')
 const [query,setQuery]=useState(''),[manage,setManage]=useState(false),[editing,setEditing]=useState<string|undefined>(),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const notes=useRxBuilderStore(s=>s.notes),followUpDate=useRxBuilderStore(s=>s.followUpDate)
 const setNotes=useRxBuilderStore(s=>s.setNotes),setFollowUp=useRxBuilderStore(s=>s.setFollowUpDate)
 const operation=async(task:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await task()}catch{setError('Advice library could not be updated. Try again.')}finally{setBusy(false)}}
 return <section className="clinic-panel space-y-4 p-4 sm:p-5">
  <label htmlFor="rx-notes" className="block text-lg font-semibold">Notes and advice</label>
  <Textarea id="rx-notes" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={8000} placeholder="Instructions or follow-up advice" className="min-h-24"/>
  <details><summary className="min-h-11 cursor-pointer py-3 font-semibold">Advice snippets</summary>
   <p className="my-2 text-sm text-muted-foreground">Starter text needs your review. Select only advice appropriate for this patient.</p>
   <div className="flex flex-wrap gap-2">{(['EN','MR','HI'] as const).map(lang=><Button type="button" key={lang} variant={language===lang?'default':'outline'} onClick={()=>setLanguage(lang)}>{({EN:'English',MR:'मराठी',HI:'हिन्दी'})[lang]}</Button>)}</div>
   <Input className="my-3" aria-label="Search advice" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find advice"/>
   <div className="max-h-80 space-y-2 overflow-y-auto">{items.filter(item=>item.language===language&&item.text.toLowerCase().includes(query.toLowerCase())).map(item=><div key={item.id} className="flex flex-wrap gap-2">
    <Button type="button" variant="outline" className="flex-1 justify-start whitespace-normal text-left" onClick={()=>setNotes([notes.trim(),item.text].filter(Boolean).join('\n'))}>{item.text}</Button>
    {manage&&<><Button type="button" variant="outline" onClick={()=>{setEditing(item.id);setLanguage(item.language);setText(item.text)}}>Edit</Button><Button type="button" variant="ghost" disabled={busy} onClick={()=>operation(async()=>{await deleteAdviceSnippet(item.id);setItems(items.filter(row=>row.id!==item.id))})}>Delete</Button></>}
   </div>)}</div>
   {!items.length&&<Button type="button" disabled={busy} onClick={()=>operation(async()=>setItems(await seedAdviceLibrary()))}>Add starter advice</Button>}
   <Button type="button" className="mt-3" variant="outline" onClick={()=>setManage(!manage)}>{manage?'Close library editor':'Manage advice'}</Button>
   {manage&&<div className="mt-3 space-y-2"><Textarea aria-label="Advice snippet text" maxLength={1000} value={text} onChange={e=>setText(e.target.value)}/><div className="flex gap-2"><Button type="button" disabled={busy||!text.trim()} onClick={()=>operation(async()=>{const saved=await saveAdviceSnippet({id:editing,language,text});setItems([...items.filter(item=>item.id!==saved.id),saved]);setEditing(undefined);setText('')})}>{editing?'Save changes':'Add snippet'}</Button>{editing&&<Button type="button" variant="outline" onClick={()=>{setEditing(undefined);setText('')}}>Cancel edit</Button>}</div></div>}
   {error&&<p role="alert" className="text-red-900">{error}</p>}
  </details>
  <label className="block font-semibold" htmlFor="rx-follow-up">Follow-up date</label>
  <Input id="rx-follow-up" type="date" min={clinicToday()} value={followUpDate} onChange={e=>setFollowUp(e.target.value)}/>
  <div className="flex flex-wrap gap-2">{[3,5,7,14,30].map(days=><Button type="button" key={days} variant="outline" onClick={()=>setFollowUp(followUpAfter(days))}>After {days} days</Button>)}<Button type="button" variant="ghost" onClick={()=>setFollowUp('')}>Clear date</Button></div>
 </section>
}
