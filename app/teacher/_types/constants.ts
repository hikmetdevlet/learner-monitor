export const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const STATUS_OPTIONS = [
  { key: 'present', label: 'Present', bg: '#22C55E', light: '#F0FDF4', text: '#15803D' },
  { key: 'late',    label: 'Late',    bg: '#EAB308', light: '#FEFCE8', text: '#A16207' },
  { key: 'absent',  label: 'Absent',  bg: '#EF4444', light: '#FEF2F2', text: '#B91C1C' },
  { key: 'excused', label: 'Excused', bg: '#3B82F6', light: '#EFF6FF', text: '#1D4ED8' },
]

export const INCIDENT_TYPES = [
  { key: 'disruptive', label: 'Disrupting class',   c: '#DC2626', bg: '#FEF2F2' },
  { key: 'disrespect', label: 'Disrespect',          c: '#B45309', bg: '#FFF7ED' },
  { key: 'bullying',   label: 'Bullying',            c: '#7C3AED', bg: '#F5F3FF' },
  { key: 'phone',      label: 'Phone/Device',        c: '#0369A1', bg: '#EFF6FF' },
  { key: 'late',       label: 'Late arrival',        c: '#6B7280', bg: '#F9FAFB' },
  { key: 'homework',   label: 'Not doing homework',  c: '#92400E', bg: '#FFFBEB' },
  { key: 'other',      label: 'Other',               c: '#374151', bg: '#F3F4F6' },
]

export const PRAISE_TYPES = [
  { key: 'outstanding', label: 'Outstanding',  c: '#15803D', bg: '#F0FDF4' },
  { key: 'helpful',     label: 'Helpfulness',  c: '#0369A1', bg: '#EFF6FF' },
  { key: 'improvement', label: 'Improvement',  c: '#7E22CE', bg: '#FDF4FF' },
  { key: 'leadership',  label: 'Leadership',   c: '#B45309', bg: '#FFFBEB' },
  { key: 'creativity',  label: 'Creativity',   c: '#0E7490', bg: '#ECFEFF' },
  { key: 'other',       label: 'Other',        c: '#374151', bg: '#F3F4F6' },
]

export const HW_STATUS_OPTIONS = [
  { key: 'submitted_on_time', label: 'On Time',      bg: '#22C55E', light: '#F0FDF4', text: '#15803D' },
  { key: 'submitted_late',    label: 'Late',         bg: '#EAB308', light: '#FEFCE8', text: '#A16207' },
  { key: 'incomplete',        label: 'Incomplete',   bg: '#F97316', light: '#FFF7ED', text: '#C2410C' },
  { key: 'not_submitted',     label: 'Not Submitted',bg: '#EF4444', light: '#FEF2F2', text: '#B91C1C' },
]

export function fmt(d: string) {
  return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : ''
}
export function fmtFull(d: string) {
  return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}
export function fmtDT(d: string) {
  return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
}
export function isoToday() {
  return new Date().toISOString().split('T')[0]
}
export function weekBounds(offsetWeeks = 0) {
  const now = new Date(); now.setDate(now.getDate() + offsetWeeks * 7)
  const s = new Date(now); s.setDate(now.getDate() - ((now.getDay() + 6) % 7)); s.setHours(0,0,0,0)
  const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999)
  return { ws: s, we: e, wsStr: s.toISOString().split('T')[0], weStr: e.toISOString().split('T')[0] }
}
export function topicStatus(t: any): 'this-week' | 'overdue' | 'upcoming' | 'no-date' {
  if (!t.planned_start) return 'no-date'
  const { ws, we } = weekBounds()
  const s = new Date(t.planned_start), e = t.planned_end ? new Date(t.planned_end) : s
  if (e < ws) return 'overdue'
  if (s <= we && e >= ws) return 'this-week'
  return 'upcoming'
}
export function attStreak(records: Array<{ attendance_date: string; status: string }>): number {
  const today = new Date(); today.setHours(0,0,0,0)
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const ds = d.toISOString().split('T')[0]
    const rec = records.find(a => a.attendance_date === ds)
    if (rec && (rec.status === 'present' || rec.status === 'late')) streak++
    else if (rec) break
  }
  return streak
}
