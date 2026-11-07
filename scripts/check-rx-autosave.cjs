require('tsx/cjs')
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),React=require('react')
const {useRxBuilderStore:store}=require('../stores/rxBuilderStore.ts')
const local=require('../lib/rx/local-drafts.ts')
class Disk {data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,v)}removeItem(k){this.data.delete(k)}}
const draft={patientId:'p',diagnosis:'Synthetic',notes:'',medicines:[],templateId:null,visit:{weightKg:'',bloodPressure:'',temperatureC:'',spo2:''},handwriting:{strokes:[],photoId:null}}
const tick=()=>new Promise(setImmediate)
function mount({disk=new Disk(),online=true,cloud=null,fail=false,gate=null}={}){
 const states=[],refs=[],effects=[],events={},timers=new Map(),saved=[],deleted=[]
 let stateIndex=0,refIndex=0,seq=0,rejectSaves=fail
 const navigator={onLine:online}
 const window={get localStorage(){return disk},addEventListener:(name,fn)=>{events[name]=fn},removeEventListener:name=>delete events[name]}
 const hooks={...React,useState:init=>{const i=stateIndex++;if(!(i in states))states[i]=init;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useRef:init=>{const i=refIndex++;return refs[i]||=( {current:init})},useEffect:fn=>effects.push(fn)}
 const actions={saveRxDraft:async(key,payload)=>{saved.push({key,payload});if(gate)await gate;if(rejectSaves)throw new Error('offline')},deleteRxDraft:async key=>deleted.push(key),getRxDraftEnvelope:async()=>cloud}
 const exported={}
 const mocks={react:hooks,'@/actions/drafts.actions':actions,'@/actions/prescriptions.actions':{getRxPatientContext:async()=>({id:'p',name:'Synthetic patient',dob:null,gender:null,phone:null,allergies:null})},'@/stores/rxBuilderStore':{useRxBuilderStore:store},'@/lib/validations/draft.schema':require('../lib/validations/draft.schema.ts'),'@/lib/rx/local-drafts':local}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/prescriptions/useRxAutosave.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported,require:name=>mocks[name]||require(name),window,navigator,setTimeout:fn=>{const id=++seq;timers.set(id,fn);return id},clearTimeout:id=>timers.delete(id),Date})
 const config={doctorId:'a',key:'patient_p',initialPatientId:'p',seed:draft,cloud,patientFor:()=>undefined}
 const render=()=>{stateIndex=refIndex=0;return exported.useRxAutosave(config)}
 render();const cleanup=effects[0]()
 return {disk,saved,deleted,events,navigator,render,cleanup,setFail:value=>rejectSaves=value,flush:()=>{const list=[...timers.values()];timers.clear();list.forEach(fn=>fn())}}
}
;(async()=>{
 const first=mount({online:false});await tick();assert.equal(first.render().ready,true)
 store.getState().setNotes('Unsent synthetic edit');assert.equal(first.saved.length,0)
 assert.equal(local.readLocalDrafts(first.disk,'a','p').payload.notes,'Unsent synthetic edit')
 first.cleanup()
 const refresh=mount({disk:first.disk,online:false});await tick();assert.equal(store.getState().notes,'Unsent synthetic edit','refresh restores offline changes')
 refresh.navigator.onLine=true;refresh.events.online();await tick();await tick();assert.equal(refresh.saved.at(-1).payload.notes,'Unsent synthetic edit')
 assert.equal(local.readLocalDrafts(refresh.disk,'a','p').dirty,false)
 refresh.setFail(true);store.getState().setNotes('Retry synthetic edit');refresh.flush();await tick();assert.match(refresh.render().status,/sync pending/)
 refresh.setFail(false);refresh.events.online();await tick();await tick();assert.equal(refresh.saved.at(-1).payload.notes,'Retry synthetic edit')
 await refresh.render().complete();assert.deepEqual(refresh.deleted,['patient_p']);assert.equal(local.readLocalDrafts(refresh.disk,'a','p'),null)
 refresh.cleanup()
 let release
 const gate=new Promise(resolve=>{release=resolve})
 const racing=mount({gate});await tick()
 store.getState().setNotes('Earlier queued revision');racing.flush();await tick()
 store.getState().setNotes('Newer unsent revision')
 release();await tick();await tick()
 assert.equal(local.readLocalDrafts(racing.disk,'a','p').dirty,true,'late response cannot clear newer unsent revision')
 assert.equal(local.readLocalDrafts(racing.disk,'a','p').payload.notes,'Newer unsent revision')
 racing.flush();await tick();await tick();assert.equal(local.readLocalDrafts(racing.disk,'a','p').dirty,false)
 racing.cleanup()
 const blocked=new Disk();Object.defineProperty(blocked,'length',{get(){throw new Error('Storage blocked')}})
 const unavailable=mount({disk:blocked});await tick();assert.equal(unavailable.render().ready,true,'blocked local storage cannot prevent cloud editing')
 store.getState().setNotes('Online without device storage');unavailable.flush();await tick();assert.equal(unavailable.saved.length,1)
 await unavailable.render().complete();assert.equal(unavailable.deleted.length,1);unavailable.cleanup()
 console.log('PASS: actual autosave hook restores offline after remount, retries online/failed saves, clears only synced revisions, completes and tolerates blocked storage')
})().catch(e=>{console.error(e);process.exitCode=1})
