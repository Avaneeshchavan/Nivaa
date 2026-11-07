require('tsx/cjs')
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
let doctor={id:'doctor-a'},calls=0,parameters,fail=false
const api={}
const mocks={
 '@/actions/auth.actions':{getCurrentDoctor:async()=>doctor},
 '@/lib/prisma':{default:{$queryRawUnsafe:async(sql,...values)=>{calls++;parameters=values;if(fail)throw new Error('Synthetic private failure');return[]}}},
}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/medicines/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:api,URL,performance,require:name=>mocks[name]||require(name)})
;(async()=>{
 let res=await api.GET(new Request('https://fixture.invalid/api/medicines?q=Ondem%20MD&system=AYURVEDIC'))
 assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'private, no-store');assert.match(res.headers.get('Server-Timing'),/auth;dur=/)
 assert.deepEqual(parameters,['ondem md','doctor-a','AYUSH'])
 doctor={id:'doctor-b'};await api.GET(new Request('https://fixture.invalid/api/medicines?q='));assert.equal(parameters[1],'doctor-b')
 fail=true;res=await api.GET(new Request('https://fixture.invalid/api/medicines?q=ondem'));assert.equal(res.status,503);assert.doesNotMatch(await res.text(),/Synthetic/)
 doctor=null;const before=calls;res=await api.GET(new Request('https://fixture.invalid/api/medicines?q=ondem'));assert.equal(res.status,401);assert.equal(calls,before)
 console.log('PASS: actual catalog route requires active doctor, binds owner/filter/query, exposes safe timing, disables shared caching and redacts failure')
})().catch(e=>{console.error(e);process.exitCode=1})
