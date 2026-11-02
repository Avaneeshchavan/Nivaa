'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { patientSchema, PatientFormData } from '@/lib/validations/patient.schema'
import { createPatient, updatePatient } from '@/actions/patients.actions'
import { Input } from '@/components/ui/input'
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-4 md:p-6 rounded-lg shadow-sm border">
      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-base">Full Name *</Label>
        <Input
          id="name"
          placeholder="John Doe"
          className="h-12 text-base"
          disabled={isLoading}
          {...register('name')}
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            className="h-12 text-base"
            disabled={isLoading}
            {...register('phone')}
          />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob" className="text-base">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            className="h-12 text-base"
            disabled={isLoading}
            {...register('dob')}
          />
          {errors.dob && <p className="text-sm text-red-500">{errors.dob.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-base">Gender</Label>
          <Select 
            disabled={isLoading} 
            value={gender || undefined} 
            onValueChange={(val) => setValue('gender', val as "MALE" | "FEMALE" | "OTHER")}
          >
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-sm text-red-500">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address" className="text-base">Address</Label>
        <Input
          id="address"
          placeholder="123 Main St..."
          className="h-12 text-base"
          disabled={isLoading}
          {...register('address')}
        />
        {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergies" className="text-base">Allergies / Medical Notes</Label>
        <Input
          id="allergies"
          placeholder="e.g. Penicillin, Peanuts"
          className="h-12 text-base"
          disabled={isLoading}
          {...register('allergies')}
        />
        {errors.allergies && <p className="text-sm text-red-500">{errors.allergies.message}</p>}
      </div>

      <div className="pt-4 flex items-center justify-end gap-4 border-t">
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
