'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, PatientFormData } from '@/lib/validations/patient.schema'
import { createPatient, updatePatient } from '@/actions/patients.actions'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PatientFormProps {
  initialData?: PatientFormData & { id?: string }
}

export default function PatientForm({ initialData }: PatientFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      gender: (initialData?.gender as "MALE" | "FEMALE" | "OTHER" | undefined | null) || undefined,
      dob: initialData?.dob || '',
      address: initialData?.address || '',
      allergies: initialData?.allergies || '',
    },
  })

  const gender = watch('gender')

  const name = watch('name')
  const phone = watch('phone')
  const [duplicates, setDuplicates] = useState<{ id: string; name: string; phone: string | null }[]>([])
  const [duplicateError, setDuplicateError] = useState('')
  useEffect(() => {
    setDuplicates([])
    setDuplicateError('')
    if (initialData?.id || name.trim().length < 2 || !phone || phone.replace(/[^0-9]/g, '').length < 7) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/patients/duplicates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }), signal: controller.signal, cache: 'no-store', redirect: 'error' })
        if (!response.ok) throw new Error('Duplicate check unavailable. You can still save.')
        const data = await response.json()
        if (!controller.signal.aborted) setDuplicates(data)
      } catch {
        if (!controller.signal.aborted) setDuplicateError('Duplicate check unavailable. You can still save.')
      }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [name, phone, initialData?.id])

  const onSubmit = async (data: PatientFormData) => {
    setIsLoading(true)
    setError(null)
    try {
      if (initialData?.id) {
        await updatePatient(initialData.id, data)
        router.push(`/patients/${initialData.id}`)
      } else {
        const newPatient = await createPatient(data)
        router.push(`/patients/${newPatient.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 clinic-panel p-5 sm:p-7">
      {duplicates.length > 0 && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium">Possible duplicate patient. You can still save.</p>
          {duplicates.map(patient => <Link key={patient.id} href={`/patients/${patient.id}`} className="flex min-h-11 items-center underline">{patient.name} · {patient.phone} — Open existing record</Link>)}
        </div>
      )}
      {duplicateError && <p role="status" className="text-sm text-amber-700">{duplicateError}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-base">Full Name *</Label>
        <Input
          id="name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          placeholder="John Doe"
          className="h-12 text-base"
          disabled={isLoading}
          {...register('name')}
        />
        {errors.name && <p id="name-error" className="text-base text-red-800">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base">Phone Number</Label>
          <Input
            id="phone"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
            type="tel"
            placeholder="+1234567890"
            className="h-12 text-base"
            disabled={isLoading}
            {...register('phone')}
          />
          {errors.phone && <p id="phone-error" className="text-base text-red-800">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob" className="text-base">Date of Birth</Label>
          <Input
            id="dob"
          aria-invalid={Boolean(errors.dob)}
          aria-describedby={errors.dob ? 'dob-error' : undefined}
            type="date"
            className="h-12 text-base"
            disabled={isLoading}
            {...register('dob')}
          />
          {errors.dob && <p id="dob-error" className="text-base text-red-800">{errors.dob.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender" className="text-base">Gender</Label>
          <Select 
            disabled={isLoading} 
            value={gender || undefined} 
            onValueChange={(val) => setValue('gender', val as "MALE" | "FEMALE" | "OTHER")}
          >
            <SelectTrigger id="gender" className="w-full h-12 text-base">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-base text-red-800">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-base">Address</Label>
        <Input
          id="address"
          aria-invalid={Boolean(errors.address)}
          aria-describedby={errors.address ? 'address-error' : undefined}
          placeholder="123 Main St..."
          className="h-12 text-base"
          disabled={isLoading}
          {...register('address')}
        />
        {errors.address && <p id="address-error" className="text-base text-red-800">{errors.address.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergies" className="text-base">Allergies</Label>
        <Textarea
          id="allergies"
          aria-invalid={Boolean(errors.allergies)}
          aria-describedby={errors.allergies ? 'allergies-error' : undefined}
          maxLength={2000}
          placeholder="e.g. Penicillin, Peanuts"
          className="h-12 text-base"
          disabled={isLoading}
          {...register('allergies')}
        />
        {errors.allergies && <p id="allergies-error" className="text-base text-red-800">{errors.allergies.message}</p>}
      </div>

      <div className="pt-4 flex flex-wrap items-center justify-end gap-3 border-t">
        <Button
          type="button"
          variant="outline"
          className="h-12 px-6"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" className="h-12 px-8" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData?.id ? 'Update Patient' : 'Create Patient'}
        </Button>
      </div>
    </form>
  )
}
