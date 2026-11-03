'use client'

import { uploadSignature } from '@/actions/signature.actions'
import { useState } from 'react'
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
import { Doctor, DiseaseTemplate, Medicine } from '@/lib/generated/prisma/client'
import { RxMedicine } from '@/lib/templates/defaultTemplates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useDebouncedCallback } from 'use-debounce'
import { Plus, Trash2, Edit, Upload, Sparkles, AlertCircle, ChevronsUpDown, HeartPulse, User } from 'lucide-react'

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

  // Templates State
  const [templates, setTemplates] = useState<DiseaseTemplate[]>(initialTemplates)
  const [seeding, setSeeding] = useState(false)

  // Template Form Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DiseaseTemplate | null>(null)
  
  const [templateName, setTemplateName] = useState('')
  const [templateDiagnosis, setTemplateDiagnosis] = useState('')
  const [templateMedicines, setTemplateMedicines] = useState<RxMedicine[]>([])

  // Medicine Search State inside template form
  const [medPopoverOpen, setMedPopoverOpen] = useState(false)
  const [medSearch, setMedSearch] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null)

  // Medicine Dosage details inside template form
  const [medDosage, setMedDosage] = useState('')
  const [medFrequency, setMedFrequency] = useState('BD')
  const [medDuration, setMedDuration] = useState('5 Days')
  const [medInstructions, setMedInstructions] = useState('')

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
      alert('Seeded 5 premium templates successfully!')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to seed templates'
      alert(errorMsg)
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
    resetMedicineForm()
    setIsSheetOpen(true)
  }

  // Open Template Sheet (Edit Mode)
  const openEditSheet = (t: DiseaseTemplate) => {
    setEditingTemplate(t)
    setTemplateName(t.name)
    setTemplateDiagnosis(t.diagnosis || '')
    
    const parsedMeds = typeof t.medicines === 'string'
      ? JSON.parse(t.medicines)
      : (t.medicines || [])
    
    setTemplateMedicines(parsedMeds)
    resetMedicineForm()
    setIsSheetOpen(true)
  }

  const resetMedicineForm = () => {
    setSelectedMed(null)
    setMedSearch('')
    setSearchResults([])
    setMedDosage('')
    setMedFrequency('BD')
    setMedDuration('5 Days')
    setMedInstructions('')
  }

  // Search Medicines Debounced
  const fetchMedicines = useDebouncedCallback(async (query: string) => {
    if (!query) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchResults(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSearchLoading(false)
    }
  }, 300)

  const handleMedSearchChange = (val: string) => {
    setMedSearch(val)
    fetchMedicines(val)
  }

  // Add medicine item to template
  const handleAddMedicineToTemplate = () => {
    if (!selectedMed) return
    const newRxMed: RxMedicine = {
      id: crypto.randomUUID(),
      name: selectedMed.name,
      generic: selectedMed.generic || null,
      form: selectedMed.form || null,
      dosage: medDosage,
      frequency: medFrequency,
      duration: medDuration,
      instructions: medInstructions || null
    }

    setTemplateMedicines([...templateMedicines, newRxMed])
    resetMedicineForm()
  }

  // Remove medicine item from template
  const handleRemoveMedicineFromTemplate = (id: string) => {
    setTemplateMedicines(templateMedicines.filter(m => m.id !== id))
  }

  // Save Template Action
  const handleTemplateSave = async () => {
    if (!templateName) {
      alert('Template Name is required')
      return
    }

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
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error saving template'
      alert(errorMsg)
    }
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
      alert(errorMsg)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 max-w-md">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === 'profile'
              ? 'bg-primary text-primary-foreground shadow'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <User className="w-4 h-4" />
          Doctor Profile
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === 'templates'
              ? 'bg-primary text-primary-foreground shadow'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Rx Templates
        </button>
      </div>

      {/* Profile Section */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Logo Upload Card */}
          <Card className="lg:col-span-1 border border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Clinic Logo</CardTitle>
              <CardDescription>Upload clinic branding for the printed prescriptions.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="relative w-32 h-32 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center overflow-hidden group mb-4">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Clinic Logo" className="w-full h-full object-contain" />
                ) : (
                  <HeartPulse className="w-12 h-12 text-gray-300" />
                )}
                
                <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Upload className="w-6 h-6 mb-1" />
                  <span className="text-xs">Upload Logo</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="hidden"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium mt-4">Signature (PNG/JPEG, under 1 MB)
                <input type="file" accept="image/png,image/jpeg" className="block min-h-11 mt-2 max-w-full" onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const data = new FormData(); data.set('signature', file)
                  try { await uploadSignature(data); setProfileMessage({ type: 'success', text: 'Private signature saved.' }); router.refresh() }
                  catch (error) { setProfileMessage({ type: 'error', text: error instanceof Error ? error.message : 'Upload failed' }) }
                  e.target.value = ''
                }} />
              </label>
              {logoUploading && <p className="text-sm text-gray-500 animate-pulse">Uploading branding...</p>}
              {!logoUploading && !logoUrl && <p className="text-sm text-gray-400">No logo uploaded yet.</p>}
              {!logoUploading && logoUrl && <p className="text-sm text-green-600">Logo active</p>}
            </CardContent>
          </Card>

          {/* Profile Form Card */}
          <Card className="lg:col-span-2 border border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Doctor & Clinic Details</CardTitle>
              <CardDescription>These details will automatically populate your generated PDFs.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSave} className="space-y-4">
                {profileMessage && (
                  <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    profileMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {profileMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Doctor&apos;s Name</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      placeholder="e.g. Jane Doe"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Medical License / Registration No.</label>
                    <Input 
                      value={license} 
                      onChange={(e) => setLicense(e.target.value)} 
                      placeholder="e.g. MD-12345"
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Clinic Name</label>
                    <Input 
                      value={clinicName} 
                      onChange={(e) => setClinicName(e.target.value)} 
                      placeholder="e.g. Nivaa Care Clinic"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Clinic Phone Number</label>
                    <Input 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="e.g. +1 555 1234"
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Clinic Address</label>
                  <Textarea 
                    value={address} 
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
              <h2 className="text-xl font-bold text-gray-900">Disease Templates</h2>
              <p className="text-sm text-gray-500">Save setups of common disease diagnosis & medicines to load with 1 click.</p>
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
              <h3 className="font-semibold text-gray-800">No Templates Found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-6">
                Get started quickly by loading our premium default disease templates or design your own bespoke prescription flow.
              </p>
              <Button onClick={handlePreSeed} disabled={seeding} variant="outline">
                Load Default Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => {
                const meds = typeof t.medicines === 'string'
                  ? JSON.parse(t.medicines)
                  : (t.medicines || [])
                return (
                  <Card key={t.id} className="border border-gray-100 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg leading-snug">{t.name}</CardTitle>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditSheet(t)}
                            className="p-2 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(t.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                      <p className="text-sm text-gray-600 mb-2 font-medium">{meds.length} Medicine{meds.length !== 1 ? 's' : ''} saved</p>
                      <div className="flex flex-wrap gap-1">
                        {meds.slice(0, 3).map((m: RxMedicine, idx: number) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-gray-50 border border-gray-100 text-xs text-gray-600">
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

      {/* Slide-over sheet for template addition / editing */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto h-full flex flex-col justify-between">
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle>{editingTemplate ? 'Edit Template' : 'Create Disease Template'}</SheetTitle>
              <SheetDescription>Configure a custom diagnostic profile with standard medicine packages.</SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Template Title</label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. URTI Package, Gastritis Standard..."
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Standard Diagnosis</label>
                <Input
                  value={templateDiagnosis}
                  onChange={(e) => setTemplateDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Gastroenteritis"
                  className="h-12"
                />
              </div>

              {/* Medicine items config in template */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-semibold text-gray-700 block">Saved Medicines Package</label>

                {/* Display added medicines */}
                <div className="space-y-2">
                  {templateMedicines.map((med, idx) => (
                    <div key={med.id} className="p-3 bg-gray-50 border rounded-lg flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{idx + 1}. {med.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{med.dosage} • {med.frequency} • {med.duration}</p>
                        {med.instructions && <p className="text-xs text-gray-400 mt-1">Note: {med.instructions}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveMedicineFromTemplate(med.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Medicine Search Autocomplete inside Sheet */}
                <div className="p-4 border rounded-xl bg-white space-y-4 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Configure Rx Pack Item</p>
                  
                  {!selectedMed ? (
                    <Popover open={medPopoverOpen} onOpenChange={setMedPopoverOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={medPopoverOpen}
                            className="w-full h-12 justify-between font-normal text-gray-500"
                          >
                            Search medicine brand/generic...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        }
                      />
                      <PopoverContent className="w-[calc(100vw-4rem)] sm:w-[480px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Type brand or drug generic..."
                            value={medSearch}
                            onValueChange={handleMedSearchChange}
                            className="h-12"
                          />
                          <CommandList>
                            {searchLoading && <div className="p-4 text-sm text-gray-500 text-center">Searching pharmacy list...</div>}
                            {!searchLoading && medSearch && searchResults.length === 0 && (
                              <CommandEmpty>No medicine matches.</CommandEmpty>
                            )}
                            {!searchLoading && searchResults.length > 0 && (
                              <CommandGroup>
                                {searchResults.map((med) => (
                                  <CommandItem
                                    key={med.id}
                                    value={med.name}
                                    onSelect={() => {
                                      setSelectedMed(med)
                                      setMedPopoverOpen(false)
                                    }}
                                    className="py-3 cursor-pointer"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-800">{med.name}</span>
                                      {med.generic && <span className="text-xs text-gray-500">{med.generic}</span>}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg border border-primary/20">
                        <div>
                          <p className="font-semibold text-primary text-sm">{selectedMed.name}</p>
                          {selectedMed.generic && <p className="text-xs text-gray-500">{selectedMed.generic}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedMed(null)} className="h-8">
                          Change
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500">Dosage</label>
                          <Input
                            placeholder="1 tab / 5ml"
                            value={medDosage}
                            onChange={(e) => setMedDosage(e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500">Frequency</label>
                          <Select value={medFrequency} onValueChange={(val) => { if (val) setMedFrequency(val) }}>
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OD">OD (Once daily)</SelectItem>
                              <SelectItem value="BD">BD (Twice daily)</SelectItem>
                              <SelectItem value="TDS">TDS (Thrice daily)</SelectItem>
                              <SelectItem value="QID">QID (Four times daily)</SelectItem>
                              <SelectItem value="SOS">SOS (As needed)</SelectItem>
                              <SelectItem value="HS">HS (At bedtime)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500">Duration</label>
                          <Input
                            placeholder="5 Days / 1 Month"
                            value={medDuration}
                            onChange={(e) => setMedDuration(e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500">Instructions</label>
                          <Input
                            placeholder="After food"
                            value={medInstructions}
                            onChange={(e) => setMedInstructions(e.target.value)}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleAddMedicineToTemplate}
                        disabled={!medDosage}
                        className="w-full h-10 gap-2 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" /> Add Item
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t mt-8 flex gap-4">
            <Button
              variant="outline"
              onClick={() => setIsSheetOpen(false)}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTemplateSave}
              disabled={!templateName}
              className="flex-1 h-12"
            >
              Save Template
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
