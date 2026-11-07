require('tsx/cjs')
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
let doctor={id:'a'}, argumentsSeen, fail=false
const rows=new Map()
const prisma={brand:{findFirst:async({where})=>where.id==='brand-a'?{id:'brand-a'}:null},doctorMedicinePref:{upsert:async args=>{
 argumentsSeen=args
 if(fail)throw new Error('Synthetic private preference')
 const {doctorId,brandId}=args.where.doctorId_brandId, key=doctorId+brandId
 const old=rows.get(key)
 rows.set(key,old?{...old,...args.update,useCount:old.useCount+(args.update.useCount?.increment||0)}:{...args.create})
}}}
const actions={}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('actions/brand-preferences.actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:actions,require:name=>name==='@/lib/prisma'?{default:prisma}:name==='./auth.actions'?{getCurrentDoctor:async()=>doctor}:require(name),Date})
;(async()=>{
 const input={brandId:'brand-a',dosage:'Doctor A dose',frequency:'BD',duration:'5 days',instructions:'Doctor A instruction',pattern:'1-0-1',food:'AFTER',durationDays:5}
 await actions.rememberMedicineUse(input);await actions.rememberMedicineUse(input)
 assert.equal(rows.get('abrand-a').useCount,2)
 assert.equal(argumentsSeen.where.doctorId_brandId.doctorId,'a')
 assert.equal(rows.get('abrand-a').defaultPattern,'1-0-1')
 await actions.setMedicineFavorite('brand-a',true)
 doctor={id:'b'};await actions.rememberMedicineUse({...input,dosage:'Doctor B dose'})
 assert.equal(rows.get('abrand-a').defaultDosage,'Doctor A dose')
 assert.equal(rows.get('bbrand-a').defaultDosage,'Doctor B dose')
 assert.equal(rows.get('bbrand-a').isFavorite,undefined)
 await assert.rejects(actions.rememberMedicineUse({...input,brandId:'missing'}))
 await assert.rejects(actions.rememberMedicineUse({...input,durationDays:-1}))
 fail=true
 await assert.rejects(actions.rememberMedicineUse(input),e=>!e.message.includes('Synthetic')&&!e.cause)
 doctor=null
 await assert.rejects(actions.rememberMedicineUse(input),/Unauthorized/)
 await assert.rejects(actions.setMedicineFavorite('brand-a',true),/Unauthorized/)
 console.log('PASS: actual preference actions scope reads/writes to active doctor, increment use, preserve defaults, isolate favorites and sanitize failures')
})().catch(e=>{console.error(e);process.exitCode=1})
