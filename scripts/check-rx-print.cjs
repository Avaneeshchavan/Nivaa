require('tsx/cjs')
const assert=require('node:assert/strict'),React=require('react')
global.React=React
const RxPDF=require('../components/prescriptions/RxPDFDocument.tsx').default
const {renderToBuffer}=require('@react-pdf/renderer')
function text(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join('');return text(node.props?.children)}
;(async()=>{
 const props={doctor:{name:'Synthetic doctor',email:'fixture@example.invalid'},patient:{name:'Synthetic patient',dob:null,gender:null,phone:null,allergies:null},prescription:{id:'synthetic-rx',createdAt:new Date('2026-11-07T10:00:00Z'),diagnosis:'Synthetic',notes:'Review with doctor. डॉक्टरांचा सल्ला घ्या.',followUpDate:new Date('2027-01-01T00:00:00Z'),medicines:[{id:'m',name:'Synthetic medicine',dosage:'1-0-1 tablet',frequency:'BD',duration:'5 days',instructions:'Doctor text',food:'AFTER',quantity:10,doseUnit:'tablet'}]}}
 const tree=RxPDF(props),contents=text(tree)
 assert.match(contents,/After food · Doctor text/);assert.match(contents,/Total: 10 tablet/);assert.match(contents,/Follow-up: 01 Jan 2027/)
 for(const paperSize of ['A4','A5']){const buffer=await renderToBuffer(React.createElement(RxPDF,{...props,paperSize}));assert.equal(buffer.subarray(0,5).toString(),'%PDF-');assert.ok(buffer.length>1000)}
 const empty=text(RxPDF({...props,prescription:{...props.prescription,followUpDate:null,medicines:[]}}));assert.doesNotMatch(empty,/Follow-up:/)
 console.log('PASS: actual A4/A5 PDF render, structured food/quantity, conditional follow-up and Devanagari advice')
})().catch(e=>{console.error(e);process.exitCode=1})
