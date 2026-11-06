'use client'

import { useState } from 'react'
import { DiseaseTemplate } from '@/lib/generated/prisma/client'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { BookTemplate } from 'lucide-react'

interface DiseaseTemplateSelectorProps {
  templates: DiseaseTemplate[]
}

export default function DiseaseTemplateSelector({ templates }: DiseaseTemplateSelectorProps) {
  const [openAlert, setOpenAlert] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState<DiseaseTemplate | null>(null)
  
  const { diagnosis, medicines, applyTemplate } = useRxBuilderStore()
  
  const handleSelect = (templateId: string | null) => {
    if (!templateId) return
    const template = templates.find(t => t.id === templateId)
    if (!template) return
    
    // Check if user has existing unsaved work
    if (diagnosis || medicines.length > 0) {
      setPendingTemplate(template)
      setOpenAlert(true)
    } else {
      applyTemplate(template)
    }
  }
  
  const confirmApply = () => {
    if (pendingTemplate) {
      applyTemplate(pendingTemplate)
      setPendingTemplate(null)
    }
    setOpenAlert(false)
  }

  if (templates.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-3" aria-label="Prescription templates">
        {templates.slice(0, 5).map(template => (
          <Button key={template.id} variant="outline" className="min-h-11 max-w-full whitespace-normal text-left" onClick={() => handleSelect(template.id)}>{template.name}</Button>
        ))}
        {templates.length > 5 && <Select onValueChange={handleSelect}>
          <SelectTrigger className="w-fit max-w-full h-12 bg-card text-base">
            <div className="flex items-center gap-2 text-primary">
              <BookTemplate className="w-4 h-4" />
              <SelectValue placeholder="All templates" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id} className="cursor-pointer">
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>}
      </div>

      <AlertDialog open={openAlert} onOpenChange={setOpenAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite current prescription?</AlertDialogTitle>
            <AlertDialogDescription>
              Applying a template will replace your current diagnosis and any medicines you have already added. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApply} className="bg-primary text-white hover:bg-primary/90">
              Apply Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
