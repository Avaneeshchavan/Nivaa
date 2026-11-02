import { getCurrentDoctor } from '@/actions/auth.actions'
import { getTemplates } from '@/actions/templates.actions'
import SettingsView from '@/components/settings/SettingsView'
import HeaderSetter from '@/components/dashboard/HeaderSetter'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const doctor = await getCurrentDoctor()
  const templates = await getTemplates()

  return (
    <>
      <HeaderSetter title="Settings & Templates" />
      <SettingsView initialDoctor={doctor} initialTemplates={templates} />
    </>
  )
}
