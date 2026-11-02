import { getCurrentDoctor } from '@/actions/auth.actions'
import { getTemplates } from '@/actions/templates.actions'
import HeaderSetter from '@/components/dashboard/HeaderSetter'
import SettingsView from '@/components/settings/SettingsView'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const doctor = await getCurrentDoctor()
  const templates = await getTemplates()

  return (
    <>
      <HeaderSetter title="Templates" />
      <SettingsView initialDoctor={doctor} initialTemplates={templates} initialTab="templates" />
    </>
  )
}
