'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RxMedicine } from '@/stores/rxBuilderStore'
import { doseUnits, foodLabels, frequencyForPattern, parseDosePattern, quantityForPattern } from '@/lib/rx/dose'
export type DoseValues = Pick<RxMedicine,'dosage'|'frequency'|'duration'|'instructions'|'pattern'|'food'|'doseUnit'|'durationDays'|'quantity'>
export const blankDose: DoseValues = { dosage:'', frequency:'', duration:'', instructions:'', pattern:'', doseUnit:'other', durationDays:null, quantity:null }
export default function DoseFields({value,onChange,recentInstructions=[],prefix='rx-med'}:{value:DoseValues;onChange:(value:DoseValues)=>void;recentInstructions?:string[];prefix?:string}) {
  const unit=value.doseUnit||'other'
  const patch=(next:Partial<DoseValues>)=>{
    const updated={...value,...next}
    updated.quantity=updated.doseUnit && updated.doseUnit!=='other'?quantityForPattern(updated.pattern||'',updated.durationDays,updated.frequency):null
    onChange(updated)
  }
  const setPattern=(pattern:string)=>patch({pattern,dosage:`${pattern} ${unit}`,frequency:frequencyForPattern(pattern)})
  const slots=value.pattern?.split('-') || ['0','0','0']
  const presets=[['OD','1-0-0'],['BD','1-0-1'],['TDS','1-1-1'],['QID',''],['HS','0-0-1'],['SOS','']] as const
  return <div className="space-y-4">
    <fieldset className="space-y-2"><legend className="font-semibold">Dose pattern · Morning / Afternoon / Night</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {['Morning','Afternoon','Night'].map((period,index)=><div key={period} className="rounded-xl border bg-muted/40 p-2">
          <p className="mb-2 text-center font-medium">{period}</p>
          <div className="grid grid-cols-2 gap-1">{['0','1/2','1','2'].map(amount=><Button key={amount} type="button" variant={slots[index]===amount?'default':'outline'} aria-pressed={slots[index]===amount} aria-label={`${period}: ${amount}`} onClick={()=>{const next=[...slots];next[index]=amount;setPattern(next.join('-'))}}>{amount==='1/2'?'½':amount}</Button>)}</div>
          <Input className="mt-2" inputMode="decimal" aria-label={`${period} custom amount`} placeholder="Custom" value={slots[index] && !['0','1/2','1','2'].includes(slots[index])?slots[index]:''} onChange={e=>{const next=[...slots];next[index]=e.target.value;setPattern(next.join('-'))}} />
        </div>)}
      </div>
    </fieldset>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Frequency shortcuts">
      {presets.map(([frequency,pattern])=><Button key={frequency} type="button" variant={value.frequency===frequency?'default':'outline'} onClick={()=>pattern?setPattern(pattern):patch({frequency,pattern:'',quantity:null})}>{frequency}{pattern?` · ${pattern}`:''}</Button>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 font-medium" htmlFor={`${prefix}-dosage`}>Dose / free text
        <Input id={`${prefix}-dosage`} value={value.dosage} maxLength={160} placeholder="Choose a pattern or enter dose" onChange={e=>patch({dosage:e.target.value,pattern:'',quantity:null})}/>
      </label>
      <label className="space-y-1 font-medium" htmlFor={`${prefix}-unit`}>Units per dose
        <select id={`${prefix}-unit`} className="min-h-12 w-full rounded-lg border border-input bg-card px-3" value={unit} onChange={e=>patch({doseUnit:e.target.value,...(value.pattern?{dosage:`${value.pattern} ${e.target.value}`}:{})})}>
          {doseUnits.map(item=><option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="space-y-1 font-medium" htmlFor={`${prefix}-frequency`}>Frequency
        <Input id={`${prefix}-frequency`} value={value.frequency} maxLength={160} placeholder="OD, BD, SOS or custom" onChange={e=>patch({frequency:e.target.value,pattern:'',quantity:null})}/>
      </label>
      <label className="space-y-1 font-medium" htmlFor={`${prefix}-duration`}>Duration
        <Input id={`${prefix}-duration`} value={value.duration} maxLength={160} placeholder="Choose days or enter duration" onChange={e=>patch({duration:e.target.value,durationDays:null,quantity:null})}/>
      </label>
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Food instructions">
      {Object.entries(foodLabels).map(([food,label])=><Button key={food} type="button" variant={value.food===food?'default':'outline'} onClick={()=>patch({food:food as DoseValues['food']})}>{label||'No food instruction'}</Button>)}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Duration shortcuts">
      {[3,5,7,10,14,30].map(days=><Button key={days} type="button" variant={value.durationDays===days?'default':'outline'} onClick={()=>patch({duration:`${days} days`,durationDays:days})}>{days===30?'1 month (30 days)':`${days} days`}</Button>)}
      <Button type="button" variant={value.duration==='Continue'?'default':'outline'} onClick={()=>patch({duration:'Continue',durationDays:null,quantity:null})}>Continue</Button>
    </div>
    <p role="status" className="rounded-lg bg-secondary p-3 font-medium">{value.quantity!=null?`Calculated total: ${value.quantity} ${unit}`:'Total not calculated for free text, SOS, QID, unknown units or open-ended duration.'}</p>
    {value.pattern && !parseDosePattern(value.pattern) && <p role="alert" className="text-sm text-red-900">Enter three non-negative amounts with at least one dose, such as 1-0-1.</p>}
    <label className="block space-y-1 font-medium" htmlFor={`${prefix}-instructions`}>Instructions
      <Input id={`${prefix}-instructions`} list={`${prefix}-recent`} value={value.instructions} maxLength={1000} onChange={e=>patch({instructions:e.target.value})} placeholder="Doctor-entered instructions"/>
      <datalist id={`${prefix}-recent`}>{recentInstructions.map(text=><option key={text} value={text}/>)}</datalist>
    </label>
  </div>
}
