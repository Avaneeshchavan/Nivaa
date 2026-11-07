require('tsx/cjs')
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
let doctor={id:'a'},fail=false,saved,whereSeen
const advice=new Map(),preferences=new Map()
const prisma={
 adviceSnippet:{findMany:async({where})=>[...advice.values()].filter(row=>row.doctorId===where.doctorId),create:async({data})=>{if(fail)throw new Error('SYNTHETIC_PRIVATE');advice.set(data.id,data);return data},update:async({where,data})=>{const row=advice.get(where.id);if(row?.doctorId!==where.doctorId)throw new Error('SYNTHETIC_PRIVATE');const next={...row,...data};advice.set(row.id,next);return next},deleteMany:async({where})=>{if(advice.get(where.id)?.doctorId===where.doctorId)advice.delete(where.id)},createMany:async({data})=>{for(const row of data)if(!advice.has(row.id))advice.set(row.id,row)}},
 diseaseTemplate:{findFirst:async({where})=>where.id===`template-${where.doctorId}`?{id:where.id}:null},
 templatePreference:{findMany:async({where})=>[...preferences.values()].filter(p=>p.doctorId===where.doctorId),upsert:async({where,create,update})=>{const key=JSON.stringify(where.doctorId_templateId);const next=preferences.has(key)?{...preferences.get(key),...update}:create;preferences.set(key,next);return next}},
 doctorMedicinePref:{findMany:async({where,take})=>{assert.equal(where.doctorId,doctor.id);assert.equal(take,30);return[{defaultInstruction:'Synthetic'},{defaultInstruction:'Synthetic'}]}},
 $queryRaw:async(strings,...values)=>{assert.equal(values[0],doctor.id);assert.match(strings.join('?'),/LIMIT 200/);return[{diagnosis:'Synthetic diagnosis'}]},
 patient:{findFirst:async({where})=>where.id===`patient-${where.doctorId}`?{id:where.id}:null},
 prescription:{findFirst:async({where,orderBy})=>{whereSeen=where;assert.equal(where.patient.doctorId,doctor.id);assert.ok(orderBy || where.id);return where.patientId===`patient-${where.doctorId}`?{id:'rx',patientId:where.patientId,diagnosis:'Synthetic',notes:'Synthetic advice',medicines:[]}:null}},
 visit:{create:async({data})=>{saved=data;return{prescriptions:[{id:'new-rx'}]}}},
};prisma.$transaction=fn=>fn(prisma)
function load(file){const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exported,require:name=>name==='@/lib/prisma'?{default:prisma}:name==='./auth.actions'?{getCurrentDoctor:async()=>doctor}:name==='next/cache'?{revalidatePath(){}}:name==='@/lib/security/audit'?{recordAudit:async()=>{}}:require(name),Date});return exported}
const actions=load('actions/rx-workflow.actions.ts'),rx=load('actions/prescriptions.actions.ts')
;(async()=>{
 await actions.seedAdviceLibrary();assert.equal(advice.size,60)
 const first=[...advice.values()][0]
 await actions.saveAdviceSnippet({id:first.id,language:'EN',text:'Doctor edited'});await actions.seedAdviceLibrary();assert.equal(advice.get(first.id).text,'Doctor edited')
 const second=[...advice.values()][1];await actions.deleteAdviceSnippet(second.id);await actions.getRxWorkflowSupport();assert.equal(advice.has(second.id),false,'ordinary reads never resurrect deleted snippets')
 const support=await actions.getRxWorkflowSupport();assert.equal(support.instructions.length,1)
 await actions.rememberTemplate('template-a',true);await actions.rememberTemplate('template-a');assert.equal([...preferences.values()][0].isFavorite,true)
 doctor={id:'b'}
 await assert.rejects(actions.saveAdviceSnippet({id:first.id,language:'EN',text:'Foreign change'}),e=>!e.message.includes('SYNTHETIC'))
 await actions.deleteAdviceSnippet(first.id);assert.equal(advice.has(first.id),true)
 await assert.rejects(actions.rememberTemplate('template-a',true))
 await actions.seedAdviceLibrary();assert.equal((await actions.getRxWorkflowSupport()).advice.length,60)
 assert.equal(await rx.getLastPrescriptionForRepeat('patient-a'),null)
 assert.equal((await rx.getLastPrescriptionForRepeat('patient-b')).notes,'Synthetic advice');assert.equal(whereSeen.doctorId,'b')
 const input={patientId:'patient-b',diagnosis:'Synthetic',notes:'',followUpDate:'2027-01-01',medicines:[{id:'m',name:'Synthetic',dosage:'1-0-1 tablet',frequency:'BD',duration:'5 days',pattern:'1-0-1',doseUnit:'tablet',durationDays:5,quantity:999}]}
 await rx.createPrescription(input);assert.equal(saved.prescriptions.create.medicines[0].quantity,10,'server recomputes client quantity')
 assert.equal(saved.prescriptions.create.followUpDate.toISOString(),'2027-01-01T00:00:00.000Z')
 await assert.rejects(rx.createPrescription({...input,patientId:'patient-a'}))
 await assert.rejects(rx.createPrescription({...input,medicines:[{...input.medicines[0],pattern:'1/0-0-1'}]}))
 for(const data of [{language:'XX',text:'bad'},{language:'EN',text:''},{language:'EN',text:'x'.repeat(1001)}]) await assert.rejects(actions.saveAdviceSnippet(data))
 fail=true;await assert.rejects(actions.saveAdviceSnippet({language:'EN',text:'Synthetic'}),e=>!e.message.includes('SYNTHETIC'))
 doctor=null
 for(const operation of [()=>actions.getRxWorkflowSupport(),()=>actions.saveAdviceSnippet({language:'EN',text:'Synthetic'}),()=>actions.deleteAdviceSnippet('id'),()=>actions.rememberTemplate('id'),()=>actions.seedAdviceLibrary(),()=>rx.getLastPrescriptionForRepeat('patient-b'),()=>rx.getRxPatientContext('patient-b')])await assert.rejects(operation(),/Unauthorized/)
 console.log('PASS: advice CRUD/seed stability, template ownership, repeat isolation, bounded helpers, anonymous denial, sanitized errors, server quantity and follow-up save')
})().catch(e=>{console.error(e);process.exitCode=1})
