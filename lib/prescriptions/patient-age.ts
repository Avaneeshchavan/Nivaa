// DOB is a calendar date; the clinic's current day follows India time.
export function patientAge(dob?: Date | string | null, now = new Date()): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(now.getTime())) return null
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(now)
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value)
  const year = value('year'), month = value('month'), day = value('day')
  const birthYear = birth.getUTCFullYear(), birthMonth = birth.getUTCMonth() + 1, birthDay = birth.getUTCDate()
  const age = year - birthYear - Number(month < birthMonth || (month === birthMonth && day < birthDay))
  return age < 0 ? null : age
}
