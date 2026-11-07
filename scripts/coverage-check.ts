import { readFile } from 'node:fs/promises'
import { Client } from 'pg'
import { loadEnvConfig } from '@next/env'
import { databaseConnection } from '../lib/database-connection'
import { parseCatalog, normalizeBrandSearch } from '../lib/medicines/brand-preflight'
import { brandSearchSql, searchArguments } from '../lib/medicines/search'
async function main() {
  const file=process.argv[2]; let doctorId=process.argv[3]
  if(!file) throw new Error('Usage: coverage-check.ts <brands.csv with name header> [doctor-id]')
  const rows=parseCatalog(await readFile(file,'utf8'),',')
  if(rows.length>10000 || rows.some(row=>!row.name?.trim() || row.name.length>100)) throw new Error('Invalid brand coverage rows')
  loadEnvConfig(process.cwd(),false,{info(){},error(){}})
  const db=new Client({...databaseConnection(process.env.DIRECT_URL),connectionTimeoutMillis:10000})
  await db.connect()
  try {
    if(!doctorId) { doctorId=(await db.query('SELECT id FROM \"Doctor\" WHERE active ORDER BY id LIMIT 1')).rows[0]?.id; console.log('Using the first active doctor for preference ranking; pass an optional doctor-id to choose another.') }
    if(!doctorId) throw new Error('No active doctor')
    if(!(await db.query('SELECT 1 FROM "Doctor" WHERE id=$1 AND active',[doctorId])).rowCount) throw new Error('Active doctor required')
    let hits=0
    for(const row of rows) {
      const found=await db.query(brandSearchSql,searchArguments(row.name,doctorId))
      const tokens=normalizeBrandSearch(row.name).split(' ')
      const hit=found.rows.slice(0,3).some(item=>tokens.every(token=>normalizeBrandSearch(item.name).split(' ').includes(token)))
      hits+=Number(hit)
      console.log(`${hit?'HIT':'MISS'} | ${row.name} | ${found.rows[0]?.name || 'No match'}`)
    }
    console.log(`${hits}/${rows.length} top-three lexical hits. Review exact strength/form/company; HIT does not establish clinical equivalence.`)
  } finally {await db.end()}
}
main().catch(()=>{console.error('Coverage check failed. Verify local CSV, active doctor ID and database access. No patient data was queried.');process.exitCode=1})
