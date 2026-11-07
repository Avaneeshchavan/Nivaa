'use client'

import { uploadSignature } from '@/actions/signature.actions'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates
} from '@/actions/templates.actions'
import { updateDoctorProfile } from '@/actions/auth.actions'
import { Doctor, DiseaseTemplate } from '@/lib/generated/prisma/client'
import type { RxMedicine } from '@/stores/rxBuilderStore'
import { parseRxMedicines } from '@/lib/validations/prescription.schema'
import MedicineAutocomplete from '@/components/prescriptions/MedicineAutocomplete'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Plus, Trash2, Edit, Upload, Sparkles, AlertCircle, HeartPulse, User } from 'lucide-react'

interface SettingsViewProps {
  initialDoctor: Doctor | null
  initialTemplates: DiseaseTemplate[]
  initialTab?: 'profile' | 'templates'
}

export default function SettingsView({ initialDoctor, initialTemplates, initialTab = 'profile' }: SettingsViewProps) {
  const router = useRouter()
  const supabase = createClient()

  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'templates'>(initialTab)

  // Doctor Form State
  const [doctor, setDoctor] = useState<Doctor | null>(initialDoctor)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Doctor profile fields
  const [name, setName] = useState(doctor?.name || '')
  const [license, setLicense] = useState(doctor?.license || '')
  const [clinicName, setClinicName] = useState(doctor?.clinicName || '')
  const [address, setAddress] = useState(doctor?.address || '')
  const [phone, setPhone] = useState(doctor?.phone || '')
  const [logoUrl, setLogoUrl] = useState(doctor?.logoUrl || '')
  const [logoUploading, setLogoUploading] = useState(false)
  const [signatureUploading, setSignatureUploading] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const signatureInput = useRef<HTMLInputElement>(null)

  // Templates State
  const [templates, setTemplates] = useState<DiseaseTemplate[]>(initialTemplates)
  const [seeding, setSeeding] = useState(false)

  // Template Form Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DiseaseTemplate | null>(null)

  const [templateName, setTemplateName] = useState('')
  const [templateDiagnosis, setTemplateDiagnosis] = useState('')
  const [templateMedicines, setTemplateMedicines] = useState<RxMedicine[]>([])

  const [templateSaving, setTemplateSaving] = useState(false)
  const [templateError, setTemplateError] = useState('')
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null)
  // Handle profile update
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      const updated = await updateDoctorProfile({
        name,
        license,
        clinicName,
        address,
        phone,
        logoUrl
      })
      setDoctor(updated)
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' })
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error updating profile'
      setProfileMessage({ type: 'error', text: errorMsg })
    } finally {
      setProfileSaving(false)
    }
  }

  // Handle Clinic Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !doctor) return

    setLogoUploading(true)
    setProfileMessage(null)

    try {
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 1024 * 1024) throw new Error('Choose a PNG/JPEG logo under 1 MB')
      const fileExt = file.type === 'image/png' ? 'png' : 'jpg'
      const filePath = `${doctor.supabaseId}/logo.${fileExt}`

      // Upload to Supabase Storage bucket 'logos'
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded logo')
      }

      setLogoUrl(publicUrlData.publicUrl)

      // Automatically save in database too
      const updated = await updateDoctorProfile({
        logoUrl: publicUrlData.publicUrl
      })
      setDoctor(updated)
      setProfileMessage({ type: 'success', text: 'Logo uploaded and profile updated!' })
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error uploading logo'
      setProfileMessage({ type: 'error', text: errorMsg })
    } finally {
      setLogoUploading(false)
    }
  }

  // Pre-seed Templates
  const handlePreSeed = async () => {
    setSeeding(true)
    try {
      await seedDefaultTemplates()
      const freshTemplates = await getTemplates()
      setTemplates(freshTemplates)
      setProfileMessage({ type: 'success', text: 'Common templates are ready. Review prescribing details before use.' })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to seed templates'
      setProfileMessage({ type: 'error', text: errorMsg })
    } finally {
      setSeeding(false)
    }
  }

  // Open Template Sheet (Create Mode)
  const openCreateSheet = () => {
    setEditingTemplate(null)
    setTemplateName('')
    setTemplateDiagnosis('')
    setTemplateMedicines([])
    setTemplateError('')
    setEditingMedicineId(null)
    setIsSheetOpen(true)
  }

  // Open Template Sheet (Edit Mode)
  const openEditSheet = (t: DiseaseTemplate) => {
    setEditingTemplate(t)
    setTemplateName(t.name)
    setTemplateDiagnosis(t.diagnosis || '')

    try { setTemplateMedicines(parseRxMedicines(t.medicines)) }
    catch { setProfileMessage({ type: 'error', text: 'This saved template has invalid medicine data. Keep the original and contact support.' }); return }
    setTemplateError('')
    setEditingMedicineId(null)
    setIsSheetOpen(true)
  }

  // Save Template Action
  const handleTemplateSave = async () => {
    if (templateSaving) return
    if (!templateName.trim()) {
      setTemplateError('Enter a template title.')
      return
    }

    setTemplateSaving(true)
    setTemplateError('')
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          name: templateName,
          diagnosis: templateDiagnosis,
          medicines: templateMedicines
        })
      } else {
        await createTemplate({
          name: templateName,
          diagnosis: templateDiagnosis,
          medicines: templateMedicines
        })
      }
      const freshTemplates = await getTemplates()
      setTemplates(freshTemplates)
      setIsSheetOpen(false)
      setProfileMessage({ type: 'success', text: 'Template saved.' })
    } catch {
      setTemplateError('Template could not be saved. Check the entries and try again.')
    } finally { setTemplateSaving(false) }
  }

  // Delete Template Action
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      await deleteTemplate(id)
      const freshTemplates = await getTemplates()
      setTemplates(freshTemplates)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error deleting template'
      setProfileMessage({ type: 'error', text: errorMsg })
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <p className="clinic-kicker mb-2">Clinic workspace</p>
        <h1 className="clinic-heading">{activeTab === 'profile' ? 'Clinic settings' : 'Prescription templates'}</h1>
        <p className="mt-2 text-muted-foreground">{activeTab === 'profile' ? 'Manage the clinic details and artwork used on your prescriptions.' : 'Set up reusable diagnoses and medicines for common visits.'}</p>
      </div>
      {profileMessage && (
        <p role={profileMessage.type === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-xl border p-4 ${profileMessage.type === 'error' ? 'border-red-300 bg-red-50 text-red-900' : 'bg-secondary text-secondary-foreground'}`}>
          <AlertCircle aria-hidden="true" className="size-5 shrink-0" />{profileMessage.text}
        </p>
      )}
      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-xl border max-w-md">
        <button
          aria-pressed={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-h-12 py-2 px-2 sm:px-4 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-primary text-primary-foreground shadow'
              : 'text-muted-foreground hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4" />
          Doctor Profile
        </button>
        <button
          aria-pressed={activeTab === 'templates'}
          onClick={() => setActiveTab('templates')}
          className={`flex-1 min-h-12 py-2 px-2 sm:px-4 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === 'templates'
              ? 'bg-primary text-primary-foreground shadow'
              : 'text-muted-foreground hover:bg-gray-50'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Rx Templates
        </button>
      </div>

      {/* Profile Section */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <Card className="clinic-panel lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Prescription branding</CardTitle>
              <CardDescription>PNG or JPEG, up to 1 MB per image.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid size-24 place-items-center overflow-hidden rounded-2xl border bg-muted">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Clinic logo" className="size-full object-contain p-2" />
                ) : <HeartPulse aria-hidden="true" className="size-9 text-primary" />}
              </div>
              <input ref={logoInput} hidden type="file" accept="image/png,image/jpeg" onChange={event => { void handleLogoUpload(event); event.currentTarget.value = '' }} />
              <Button type="button" variant="outline" className="w-full justify-start" onClick={() => logoInput.current?.click()} disabled={logoUploading}>
                <Upload aria-hidden="true" />{logoUploading ? 'Uploading logo…' : logoUrl ? 'Replace clinic logo' : 'Upload clinic logo'}
              </Button>
              <div className="space-y-2 border-t pt-4">
                <p className="font-semibold">Doctor signature</p>
                <p className="text-sm text-muted-foreground">Used on your printed prescriptions and stored privately.</p>
                <input ref={signatureInput} hidden type="file" accept="image/png,image/jpeg" onChange={async event => {
                  const file = event.currentTarget.files?.[0]
                  event.currentTarget.value = ''
                  if (!file || signatureUploading) return
                  const data = new FormData()
                  data.set('signature', file)
                  setSignatureUploading(true)
                  try {
                    await uploadSignature(data)
                    setProfileMessage({ type: 'success', text: 'Signature saved.' })
                    router.refresh()
                  } catch (error) {
                    setProfileMessage({ type: 'error', text: error instanceof Error ? error.message : 'Upload failed' })
                  } finally {
                    setSignatureUploading(false)
                  }
                }} />
                <Button type="button" variant="outline" className="w-full justify-start" disabled={signatureUploading} onClick={() => signatureInput.current?.click()}>
                  <Upload aria-hidden="true" />{signatureUploading ? 'Uploading signature…' : 'Upload signature'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form Card */}
          <Card className="clinic-panel lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Doctor & Clinic Details</CardTitle>
              <CardDescription>These details will automatically populate your generated PDFs.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="settings-name" className="text-sm font-semibold text-foreground">Doctor&apos;s Name</label>
                    <Input
                      id="settings-name" value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="settings-license" className="text-sm font-semibold text-foreground">Medical License / Registration No.</label>
                    <Input
                      id="settings-license" value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      placeholder="e.g. MD-12345"
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="settings-clinicName" className="text-sm font-semibold text-foreground">Clinic Name</label>
                    <Input
                      id="settings-clinicName" value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="e.g. Nivaa Care Clinic"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="settings-phone" className="text-sm font-semibold text-foreground">Clinic Phone Number</label>
                    <Input
                      id="settings-phone" value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 555 1234"
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="settings-address" className="text-sm font-semibold text-foreground">Clinic Address</label>
                  <Textarea
                    id="settings-address" value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Suite 400, Medical Plaza Road..."
                    className="min-h-[80px] text-base"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={profileSaving} className="h-12 px-8 text-base">
                    {profileSaving ? 'Saving Changes...' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates Section */}
      {activeTab === 'templates' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Disease Templates</h2>
              <p className="text-sm text-muted-foreground">Save setups of common disease diagnosis & medicines to load with 1 click.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handlePreSeed}
                disabled={seeding}
                className="h-12 text-sm border-dashed border-primary text-primary hover:bg-primary/5 gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {seeding ? 'Seeding...' : 'Load Default Templates'}
              </Button>

              <Button onClick={openCreateSheet} className="h-12 text-sm gap-2">
                <Plus className="w-4 h-4" />
                New Template
              </Button>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <HeartPulse className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">No Templates Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
                Get started quickly by loading our common disease templates or create your own templates.
              </p>
              <Button onClick={handlePreSeed} disabled={seeding} variant="outline">
                Load Default Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => {
                let meds: RxMedicine[] = []
                try { meds = parseRxMedicines(t.medicines) } catch { /* Keep malformed legacy templates visible for review. */ }
                return (
                  <Card key={t.id} className="border border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg leading-snug">{t.name}</CardTitle>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            aria-label={`Edit ${t.name}`}
                            onClick={() => openEditSheet(t)}
                            className="min-h-11 min-w-11 grid place-items-center text-muted-foreground hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            aria-label={`Delete ${t.name}`}
                            onClick={() => handleDeleteTemplate(t.id)}
                            className="min-h-11 min-w-11 grid place-items-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <CardDescription className="text-xs font-semibold text-primary mt-1">
                        Diagnosis: {t.diagnosis || 'None'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-2 font-medium">{meds.length} Medicine{meds.length !== 1 ? 's' : ''} saved</p>
                      <div className="flex flex-wrap gap-1">
                        {meds.slice(0, 3).map((m: RxMedicine, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-gray-50 border border-gray-100 text-xs text-muted-foreground">
                            {m.name}
                          </span>
                        ))}
                        {meds.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-primary/5 border border-primary/10 text-xs text-primary font-medium">
                            +{meds.length - 3} more
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Sheet open={isSheetOpen} onOpenChange={open => { if (!templateSaving) setIsSheetOpen(open) }}>
        <SheetContent showCloseButton={!templateSaving} className="data-[side=right]:w-full data-[side=right]:sm:max-w-2xl gap-0 overflow-hidden p-0">
          <SheetHeader className="shrink-0 border-b px-5 py-5 pr-16 sm:px-6 sm:pr-16">
            <SheetTitle className="text-xl font-semibold">{editingTemplate ? 'Edit template' : 'Create template'}</SheetTitle>
            <SheetDescription className="mt-1 text-base">Save a diagnosis and medicine setup for repeat visits.</SheetDescription>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => { event.preventDefault(); void handleTemplateSave() }}>
            <fieldset disabled={templateSaving} className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <label htmlFor="settings-templateName" className="block font-semibold">Template title</label>
                <Input id="settings-templateName" value={templateName} onChange={event => setTemplateName(event.target.value)} required maxLength={160} placeholder="Name this template" />
              </div>
              <div className="space-y-2">
                <label htmlFor="settings-templateDiagnosis" className="block font-semibold">Diagnosis</label>
                <Input id="settings-templateDiagnosis" value={templateDiagnosis} onChange={event => setTemplateDiagnosis(event.target.value)} maxLength={4000} placeholder="Enter the diagnosis" />
              </div>
              <section className="space-y-3" aria-labelledby="template-medicines-heading">
                <h3 id="template-medicines-heading" className="font-semibold">Saved medicines <span className="text-muted-foreground">({templateMedicines.length})</span></h3>
                {templateMedicines.length === 0 && <p className="rounded-xl border border-dashed p-4 text-muted-foreground">Add medicines below to build this template.</p>}
                {templateMedicines.map((medicine, index) => <div key={medicine.id} className="space-y-3 rounded-xl border bg-muted/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-semibold">{index + 1}. {medicine.name}</p>
                      <p className="mt-1 break-words text-sm text-muted-foreground">{[medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(' · ')}</p>
                      {medicine.instructions && <p className="mt-2 break-words text-sm text-muted-foreground">{medicine.instructions}</p>}
                    </div>
                    <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${medicine.name}`} className="text-red-800" onClick={() => setTemplateMedicines(items => items.filter(item => item.id !== medicine.id))}><Trash2 aria-hidden="true" /></Button>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setEditingMedicineId(editingMedicineId === medicine.id ? null : medicine.id)}>{editingMedicineId === medicine.id ? 'Done editing' : 'Edit details'}</Button>
                  {editingMedicineId === medicine.id && <div className="grid gap-3 sm:grid-cols-2">
                    {(['dosage', 'frequency', 'duration', 'instructions'] as const).map(field => <label key={field} className="space-y-1 text-sm font-medium capitalize">{field}
                      <Input value={medicine[field]} maxLength={field === 'instructions' ? 1000 : 160} onChange={event => setTemplateMedicines(items => items.map(item => item.id === medicine.id ? { ...item, [field]: event.target.value } : item))} />
                    </label>)}
                  </div>}
                </div>)}
              </section>
              <section className="space-y-3 rounded-xl border p-4" aria-labelledby="template-add-medicine-heading">
                <h3 id="template-add-medicine-heading" className="font-semibold">Add a medicine</h3>
                <MedicineAutocomplete onAdd={medicine => setTemplateMedicines(items => [...items, medicine])} />
              </section>
            </fieldset>
            <div className="shrink-0 space-y-3 border-t bg-card px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              {templateError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-900">{templateError}</p>}
              <div className="flex gap-3">
                <Button type="button" variant="outline" disabled={templateSaving} onClick={() => setIsSheetOpen(false)} className="min-h-12 flex-1">Cancel</Button>
                <Button type="submit" disabled={!templateName.trim() || templateSaving} className="min-h-12 flex-1">{templateSaving ? 'Saving…' : 'Save template'}</Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
