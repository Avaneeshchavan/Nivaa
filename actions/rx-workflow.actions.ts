'use server'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentDoctor } from './auth.actions'
import { withSafeActionError } from '@/lib/security/action-error'
import { adviceSeed } from '@/lib/rx/advice-seed'

export async function getRxWorkflowSupport() {
 return withSafeActionError('Prescription helpers unavailable. Try again.',async()=>{
  const doctor=await getCurrentDoctor();if(!doctor)throw new Error('Unauthorized')
  const [advice,preferences,instructions,diagnoses]=await Promise.all([
   prisma.adviceSnippet.findMany({where:{doctorId:doctor.id},orderBy:{createdAt:'asc'},take:300}),
   prisma.templatePreference.findMany({where:{doctorId:doctor.id},select:{templateId:true,isFavorite:true,lastUsedAt:true}}),
   prisma.doctorMedicinePref.findMany({where:{doctorId:doctor.id,defaultInstruction:{not:null}},select:{defaultInstruction:true},orderBy:{lastUsedAt:'desc'},take:30}),
   prisma.$queryRaw<{diagnosis:string}[]>`SELECT DISTINCT diagnosis FROM (SELECT diagnosis FROM "Prescription" WHERE "doctorId"=${doctor.id} AND diagnosis IS NOT NULL ORDER BY "createdAt" DESC LIMIT 200) recent WHERE trim(diagnosis)<>'' LIMIT 30`,
  ])
  return{advice,preferences,instructions:[...new Set(instructions.map(row=>row.defaultInstruction).filter((value):value is string=>Boolean(value)))],diagnoses:diagnoses.map(row=>row.diagnosis)}
 })
}
const adviceSchema=z.object({id:z.string().max(100).optional(),language:z.enum(['EN','MR','HI']),text:z.string().trim().min(1).max(1000)})
export async function saveAdviceSnippet(input:z.input<typeof adviceSchema>){
 return withSafeActionError('Advice could not be saved. Try again.',async()=>{
  const doctor=await getCurrentDoctor();if(!doctor)throw new Error('Unauthorized')
  const data=adviceSchema.parse(input)
  if(data.id)return prisma.adviceSnippet.update({where:{id:data.id,doctorId:doctor.id},data:{language:data.language,text:data.text}})
  return prisma.adviceSnippet.create({data:{id:randomUUID(),doctorId:doctor.id,language:data.language,text:data.text}})
 })
}
export async function deleteAdviceSnippet(id:string){
 return withSafeActionError('Advice could not be removed. Try again.',async()=>{
  const doctor=await getCurrentDoctor();if(!doctor)throw new Error('Unauthorized')
  return prisma.adviceSnippet.deleteMany({where:{id:z.string().min(1).max(100).parse(id),doctorId:doctor.id}})
 })
}
export async function rememberTemplate(id:string,favorite?:boolean){
 return withSafeActionError('Template preferences unavailable. Try again.',async()=>{
  const doctor=await getCurrentDoctor();if(!doctor)throw new Error('Unauthorized')
  id=z.string().min(1).max(100).parse(id)
  if(favorite!==undefined)favorite=z.boolean().parse(favorite)
  if(!await prisma.diseaseTemplate.findFirst({where:{id,doctorId:doctor.id},select:{id:true}}))throw new Error('Template unavailable')
  const data=favorite===undefined?{lastUsedAt:new Date()}:{isFavorite:favorite}
  return prisma.templatePreference.upsert({where:{doctorId_templateId:{doctorId:doctor.id,templateId:id}},create:{doctorId:doctor.id,templateId:id,...data},update:data})
 })
}

export async function seedAdviceLibrary(){
 return withSafeActionError('Starter advice unavailable. Try again.',async()=>{
  const doctor=await getCurrentDoctor();if(!doctor)throw new Error('Unauthorized')
  const languages=['EN','MR','HI'] as const
  await prisma.adviceSnippet.createMany({data:adviceSeed.flatMap((texts,index)=>languages.map((language,column)=>({
   id:`advice_${createHash('md5').update(`${doctor.id}:${language}:${index}`).digest('hex')}`,doctorId:doctor.id,language,text:texts[column],
  }))),skipDuplicates:true})
  return prisma.adviceSnippet.findMany({where:{doctorId:doctor.id},orderBy:{createdAt:'asc'},take:300})
 })
}
