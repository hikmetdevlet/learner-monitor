'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

type Department = {
  id: string; name: string; color: string; description: string | null
  is_active: boolean; order_num: number
}
type Activity = {
  id: string; department_id: string | null; academic_year_id: string | null
  title: string; description: string | null; activity_type: string
  planned_date: string | null; end_date: string | null
  is_completed: boolean; completed_at: string | null
  assigned_to: string | null; notes: string | null; is_all_school: boolean
  created_at: string
  departments?: { name: string; color: string } | null
  users?: { full_name: string } | null
  assignee?: { full_name: string } | null
}
type Staff = { id: string; full_name: string; role: string }
type AcademicYear = { id: string; name: string }

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  general:  { label: 'General',     color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
  exam:     { label: 'Exam',        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  meeting:  { label: 'Meeting',     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  event:    { label: 'Event',       color: '#7E22CE', bg: '#FDF4FF', border: '#E9D5FF' },
  report:   { label: 'Report',      color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
  holiday:  { label: 'Holiday',     color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  islamic:  { label: 'Islamic',     color: '#A16207', bg: '#FEFCE8', border: '#FDE68A' },
  boarding: { label: 'Boarding',    color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
  other:    { label: 'Other',       color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}
function fmtMonth(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}
function getWeekLabel(d: string) {
  const date = new Date(d + 'T12:00:00')
  const day  = date.getDay() === 0 ? 7 : date.getDay()
  const mon  = new Date(date); mon.setDate(date.getDate() - day + 1)
  const sun  = new Date(mon);  sun.setDate(mon.getDate() + 6)
  return `${fmtShort(mon.toISOString().split('T')[0])} – ${fmtShort(sun.toISOString().split('T')[0])}`
}
function isoDate(d: Date) { return d.toISOString().split('T')[0] }

export default function DepartmentsPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [departments,  setDepartments]  = useState<Department[]>([])
  const [activities,   setActivities]   = useState<Activity[]>([])
  const [staff,        setStaff]        = useState<Staff[]>([])
  const [years,        setYears]        = useState<AcademicYear[]>([])
  const [activeYear,   setActiveYear]   = useState<AcademicYear | null>(null)
  const [selYear,      setSelYear]      = useState('')

  // Sidebar
  const [selDept, setSelDept] = useState<string>('all')

  // View
  const [view, setView] = useState<'list' | 'table' | 'card'>('list')

  // Filters
  const [typeFilter,   setTypeFilter]   = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [monthFilter,  setMonthFilter]  = useState('all')

  // Modals
  const [showAddDept,     setShowAddDept]     = useState(false)
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [editActivity,    setEditActivity]    = useState<Activity | null>(null)
  const [editDept,        setEditDept]        = useState<Department | null>(null)

  // Forms — Department
  const [dName,  setDName]  = useState('')
  const [dColor, setDColor] = useState('#1D4ED8')
  const [dDesc,  setDDesc]  = useState('')
  const [dSaving, setDSaving] = useState(false)

  // Forms — Activity
  const [aTitle,      setATitle]      = useState('')
  const [aDesc,       setADesc]       = useState('')
  const [aType,       setAType]       = useState('general')
  const [aDept,       setADept]       = useState('')
  const [aStart,      setAStart]      = useState('')
  const [aEnd,        setAEnd]        = useState('')
  const [aAssigned,   setAAssigned]   = useState('')
  const [aAllSchool,  setAAllSchool]  = useState(false)
  const [aNotes,      setANotes]      = useState('')
  const [aSaving,     setASaving]     = useState(false)

  // Print
  const [printMode, setPrintMode] = useState<'week' | 'month' | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('role').eq('auth_id', user.id).single()
    setIsAdmin(u?.role === 'admin')

    const [{ data: depts }, { data: stf }, { data: yrs }] = await Promise.all([
      supabase.from('departments').select('*').eq('is_active', true).order('order_num'),
      supabase.from('users').select('id, full_name, role').in('role', ['admin','teacher','islamic_teacher','etutor']).order('full_name'),
      supabase.from('academic_years').select('id, name').order('start_date', { ascending: false }),
    ])
    setDepartments(depts || [])
    setStaff(stf || [])
    setYears(yrs || [])

    const active = (yrs || []).find((y: any) => true) || null // first year
    const { data: ay } = await supabase.from('academic_years').select('id, name').eq('is_active', true).single()
    if (ay) { setActiveYear(ay); setSelYear(ay.id) }
    else if (yrs?.length) { setActiveYear(yrs[0]); setSelYear(yrs[0].id) }

    await loadActivities((ay || yrs?.[0])?.id || '')
    setLoading(false)
  }

  async function loadActivities(yearId: string) {
    if (!yearId) return
    const { data } = await supabase
      .from('department_activities')
      .select(`
        *,
        departments(name, color),
        users!department_activities_created_by_fkey(full_name),
        assignee:users!department_activities_assigned_to_fkey(full_name)
      `)
      .eq('academic_year_id', yearId)
      .order('planned_date', { ascending: true })
    setActivities((data || []) as any)
  }

  async function saveDepartment() {
    if (!dName.trim()) return
    setDSaving(true)
    if (editDept) {
      await supabase.from('departments').update({ name: dName.trim(), color: dColor, description: dDesc.trim() || null }).eq('id', editDept.id)
      setDepartments(prev => prev.map(d => d.id === editDept.id ? { ...d, name: dName.trim(), color: dColor, description: dDesc.trim() || null } : d))
      setEditDept(null)
    } else {
      const { data } = await supabase.from('departments').insert({ name: dName.trim(), color: dColor, description: dDesc.trim() || null, order_num: departments.length }).select().single()
      if (data) setDepartments(prev => [...prev, data])
    }
    setDName(''); setDColor('#1D4ED8'); setDDesc('')
    setShowAddDept(false); setDSaving(false)
  }

  async function saveActivity() {
    if (!aTitle.trim() || !aStart) return
    setASaving(true)

    const { data: dbUser } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('users').select('id').eq('auth_id', dbUser.user?.id).single()

    const payload = {
      title: aTitle.trim(), description: aDesc.trim() || null,
      activity_type: aType, department_id: aDept || null,
      academic_year_id: selYear || null,
      planned_date: aStart || null, end_date: aEnd || null,
      assigned_to: aAssigned || null, is_all_school: aAllSchool,
      notes: aNotes.trim() || null, created_by: u?.id || null,
    }

    if (editActivity) {
      await supabase.from('department_activities').update(payload).eq('id', editActivity.id)
    } else {
      await supabase.from('department_activities').insert(payload)
    }

    await loadActivities(selYear)
    resetActivityForm()
    setShowAddActivity(false); setEditActivity(null)
    setASaving(false)
  }

  async function toggleComplete(a: Activity) {
    const now = new Date().toISOString()
    const { data: dbUser } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('users').select('id').eq('auth_id', dbUser.user?.id).single()
    await supabase.from('department_activities').update({
      is_completed: !a.is_completed,
      completed_at: !a.is_completed ? now : null,
      completed_by: !a.is_completed ? u?.id : null,
    }).eq('id', a.id)
    setActivities(prev => prev.map(x => x.id === a.id ? { ...x, is_completed: !a.is_completed, completed_at: !a.is_completed ? now : null } : x))
  }

  async function deleteActivity(id: string) {
    if (!confirm('Delete this activity?')) return
    await supabase.from('department_activities').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
  }

  async function deleteDepartment(id: string) {
    if (!confirm('Delete this department and all its activities?')) return
    await supabase.from('departments').delete().eq('id', id)
    setDepartments(prev => prev.filter(d => d.id !== id))
    setActivities(prev => prev.filter(a => a.department_id !== id))
    if (selDept === id) setSelDept('all')
  }

  function resetActivityForm() {
    setATitle(''); setADesc(''); setAType('general'); setADept('')
    setAStart(''); setAEnd(''); setAAssigned(''); setAAllSchool(false); setANotes('')
  }

  function openEditActivity(a: Activity) {
    setATitle(a.title); setADesc(a.description || ''); setAType(a.activity_type)
    setADept(a.department_id || ''); setAStart(a.planned_date || ''); setAEnd(a.end_date || '')
    setAAssigned(a.assigned_to || ''); setAAllSchool(a.is_all_school); setANotes(a.notes || '')
    setEditActivity(a); setShowAddActivity(true)
  }

  function openEditDept(d: Department) {
    setDName(d.name); setDColor(d.color); setDDesc(d.description || '')
    setEditDept(d); setShowAddDept(true)
  }

  // Filtered activities
  const filtered = useMemo(() => {
    let list = activities
    if (selDept !== 'all') {
      if (selDept === 'school') list = list.filter(a => a.is_all_school)
      else list = list.filter(a => a.department_id === selDept)
    }
    if (typeFilter !== 'all')   list = list.filter(a => a.activity_type === typeFilter)
    if (statusFilter === 'done')   list = list.filter(a => a.is_completed)
    if (statusFilter === 'pending') list = list.filter(a => !a.is_completed)
    if (monthFilter !== 'all')  list = list.filter(a => a.planned_date?.startsWith(monthFilter))
    if (search.trim()) list = list.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
    return list
  }, [activities, selDept, typeFilter, statusFilter, monthFilter, search])

  // Group by month for list view
  const groupedByMonth = useMemo(() => {
    const map: Record<string, Activity[]> = {}
    filtered.forEach(a => {
      const key = a.planned_date ? a.planned_date.slice(0, 7) : 'no-date'
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Unique months for filter
  const months = useMemo(() => {
    const set = new Set(activities.map(a => a.planned_date?.slice(0, 7)).filter(Boolean))
    return Array.from(set).sort() as string[]
  }, [activities])

  // Print function
  function doPrint(mode: 'week' | 'month') {
    const now = new Date()
    let printList = filtered

    if (mode === 'week') {
      const day = now.getDay() === 0 ? 7 : now.getDay()
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const monStr = isoDate(mon); const sunStr = isoDate(sun)
      printList = filtered.filter(a => a.planned_date && a.planned_date >= monStr && a.planned_date <= sunStr)
    } else {
      const monthStr = now.toISOString().slice(0, 7)
      printList = filtered.filter(a => a.planned_date?.startsWith(monthStr))
    }

    const dept = selDept === 'all' ? 'All Departments' : selDept === 'school' ? 'Whole School' : departments.find(d => d.id === selDept)?.name || ''
    const yearName = years.find(y => y.id === selYear)?.name || ''

    const rows = printList.map(a => {
      const tc = TYPE_CONFIG[a.activity_type] || TYPE_CONFIG.general
      const assignee = (a as any).assignee?.full_name || '—'
      const dateRange = a.end_date && a.end_date !== a.planned_date
        ? `${fmtDate(a.planned_date)} → ${fmtDate(a.end_date)}`
        : fmtDate(a.planned_date)
      const deptName = (a as any).departments?.name || (a.is_all_school ? 'All School' : '—')
      return `
        <tr>
          <td style="vertical-align:top; padding:10px 12px; border-bottom:1px solid #E8E8E6;">
            <div style="font-weight:600; font-size:13px; color:#1A1A1A; margin-bottom:3px;">${a.title}</div>
            ${a.description ? `<div style="font-size:11px; color:#888; margin-bottom:3px;">${a.description}</div>` : ''}
            <span style="font-size:10px; font-weight:700; padding:1px 7px; border-radius:4px; background:${tc.bg}; color:${tc.color}; border:1px solid ${tc.border};">${tc.label}</span>
          </td>
          <td style="vertical-align:top; padding:10px 12px; border-bottom:1px solid #E8E8E6; font-size:12px; white-space:nowrap; color:#374151;">${dateRange}</td>
          <td style="vertical-align:top; padding:10px 12px; border-bottom:1px solid #E8E8E6; font-size:12px; color:#374151;">${deptName}</td>
          <td style="vertical-align:top; padding:10px 12px; border-bottom:1px solid #E8E8E6; font-size:12px; color:#374151;">${assignee}</td>
          <td style="vertical-align:top; padding:10px 12px; border-bottom:1px solid #E8E8E6; text-align:center;">
            <span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:5px; background:${a.is_completed?'#F0FDF4':'#FFF7ED'}; color:${a.is_completed?'#15803D':'#C2410C'};">
              ${a.is_completed ? '✓ Done' : 'Pending'}
            </span>
          </td>
        </tr>`
    }).join('')

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head>
      <title>Activity Schedule — ${dept}</title>
      <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family: -apple-system, 'Segoe UI', sans-serif; padding:32px 40px; color:#1A1A1A; font-size:13px; }
        h1 { font-size:22px; font-weight:700; color:#1A1A1A; margin-bottom:4px; }
        .meta { font-size:12px; color:#888; margin-bottom:24px; }
        table { width:100%; border-collapse:collapse; }
        th { padding:9px 12px; text-align:left; font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.06em; background:#F8F8F6; border-bottom:2px solid #E8E8E6; }
        .summary { display:flex; gap:20px; margin-bottom:20px; }
        .sum-item { background:#F8F8F6; border-radius:8px; padding:10px 16px; }
        .sum-n { font-size:20px; font-weight:700; color:#1A1A1A; }
        .sum-l { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }
        @media print { body { padding:16px 20px; } }
      </style>
    </head><body>
      <h1>Activity Schedule</h1>
      <div class="meta">
        ${dept} · ${yearName} · ${mode === 'week' ? 'This Week' : 'This Month'} · Printed ${new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' })}
      </div>
      <div class="summary">
        <div class="sum-item"><div class="sum-n">${printList.length}</div><div class="sum-l">Total Activities</div></div>
        <div class="sum-item"><div class="sum-n" style="color:#15803D">${printList.filter(a=>a.is_completed).length}</div><div class="sum-l">Completed</div></div>
        <div class="sum-item"><div class="sum-n" style="color:#C2410C">${printList.filter(a=>!a.is_completed).length}</div><div class="sum-l">Pending</div></div>
      </div>
      <table>
        <thead><tr><th>Activity</th><th>Date</th><th>Department</th><th>Assigned To</th><th>Status</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:32px;color:#CCC;">No activities found</td></tr>'}</tbody>
      </table>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  const selDeptObj = departments.find(d => d.id === selDept)
  const doneCount = filtered.filter(a => a.is_completed).length
  const pendingCount = filtered.filter(a => !a.is_completed).length

  if (loading) return (
    <main style={{ minHeight:'100vh', background:'#F5F4F0', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif", color:'#AAA', fontSize:13 }}>
      Loading...
    </main>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#F5F4F0', fontFamily:"'DM Sans',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }

        /* ── Topbar ── */
        .topbar { background:#fff; border-bottom:1px solid #E8E8E6; height:52px; padding:0 24px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .back-btn { display:flex; align-items:center; gap:5px; font-size:13px; color:#888; background:none; border:none; cursor:pointer; font-family:inherit; padding:5px 9px; border-radius:7px; transition:all 0.15s; }
        .back-btn:hover { background:#F5F5F3; color:#1A1A1A; }
        .topbar-title { font-size:15px; font-weight:600; color:#1A1A1A; }
        .topbar-right { display:flex; align-items:center; gap:8px; }

        /* ── Layout ── */
        .layout { display:grid; grid-template-columns:224px 1fr; min-height:calc(100vh - 52px); }

        /* ── Sidebar ── */
        .sidebar { background:#fff; border-right:1px solid #E8E8E6; display:flex; flex-direction:column; position:sticky; top:52px; height:calc(100vh - 52px); overflow-y:auto; scrollbar-width:none; }
        .sidebar::-webkit-scrollbar { display:none; }
        .sb-section { padding:14px 12px 0; }
        .sb-label { font-size:10px; font-weight:700; color:#CCC; text-transform:uppercase; letter-spacing:0.07em; padding:0 4px; margin-bottom:5px; display:block; }

        .dept-btn { width:100%; display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:9px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:13px; color:#555; font-weight:500; transition:all 0.12s; text-align:left; margin-bottom:2px; }
        .dept-btn:hover { background:#F5F5F3; color:#1A1A1A; }
        .dept-btn.on { background:#F0F0EE; color:#1A1A1A; font-weight:600; }
        .dept-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
        .dept-count { margin-left:auto; font-size:10px; color:#BBB; font-weight:600; background:#F5F5F3; padding:1px 6px; border-radius:6px; }
        .dept-btn.on .dept-count { background:#E8E8E6; color:#888; }

        .add-dept-btn { width:calc(100% - 24px); margin:8px 12px; display:flex; align-items:center; gap:6px; padding:7px 10px; border-radius:9px; border:1.5px dashed #E0E0DC; background:none; cursor:pointer; font-family:inherit; font-size:12px; color:#AAA; transition:all 0.15s; }
        .add-dept-btn:hover { border-color:#CCC; color:#666; background:#FAFAF8; }

        .year-sel-wrap { padding:12px; border-top:1px solid #F0F0EE; margin-top:auto; }
        .year-sel-label { font-size:10px; font-weight:700; color:#CCC; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:5px; display:block; }
        .year-sel { width:100%; height:32px; border:1px solid #E0E0DE; border-radius:8px; padding:0 8px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; cursor:pointer; }

        /* ── Main ── */
        .main { display:flex; flex-direction:column; min-width:0; }

        /* ── Toolbar ── */
        .toolbar { background:#fff; border-bottom:1px solid #E8E8E6; padding:10px 20px; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .view-seg { display:flex; border:1px solid #E8E8E6; border-radius:9px; overflow:hidden; }
        .view-btn { padding:6px 12px; border:none; background:#fff; font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; color:#666; display:flex; align-items:center; gap:5px; transition:all 0.15s; }
        .view-btn:hover { background:#F5F5F3; }
        .view-btn.on { background:#1A1A1A; color:#fff; }
        .tb-sep { width:1px; height:24px; background:#E8E8E6; margin:0 2px; }
        .filter-pill { padding:5px 11px; border-radius:8px; border:1px solid #E8E8E6; background:#fff; font-size:11px; font-weight:500; color:#666; cursor:pointer; font-family:inherit; transition:all 0.12s; white-space:nowrap; }
        .filter-pill:hover { border-color:#CCC; }
        .filter-pill.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .search-wrap { position:relative; }
        .search-wrap svg { position:absolute; left:9px; top:50%; transform:translateY(-50%); color:#CCC; pointer-events:none; }
        .search-input { height:32px; border:1px solid #E8E8E6; border-radius:8px; padding:0 10px 0 29px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; width:180px; }
        .search-input:focus { border-color:#1A1A1A; }
        .search-input::placeholder { color:#CCC; }
        .print-btn { display:flex; align-items:center; gap:5px; padding:5px 11px; border-radius:8px; border:1px solid #E8E8E6; background:#fff; font-size:11px; font-weight:500; color:#555; cursor:pointer; font-family:inherit; transition:all 0.15s; white-space:nowrap; }
        .print-btn:hover { background:#F5F5F3; }
        .add-btn { display:flex; align-items:center; gap:5px; padding:6px 14px; border-radius:8px; border:none; background:#1A1A1A; color:#fff; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; margin-left:auto; transition:background 0.15s; white-space:nowrap; }
        .add-btn:hover { background:#333; }

        /* ── Stats strip ── */
        .stats-strip { display:flex; gap:10px; padding:12px 20px; background:#FAFAF9; border-bottom:1px solid #F0F0EE; }
        .stat-chip { display:flex; align-items:center; gap:6px; font-size:12px; color:#666; }
        .stat-chip strong { font-weight:700; color:#1A1A1A; }
        .stat-dot { width:7px; height:7px; border-radius:50%; }

        /* ── Content ── */
        .content { flex:1; padding:20px; overflow-y:auto; }

        /* ── Month group (list view) ── */
        .month-group { margin-bottom:24px; }
        .month-label { font-size:11px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:10px; display:flex; align-items:center; gap:10px; }
        .month-label::after { content:''; flex:1; height:1px; background:#EFEFED; }

        .act-row { background:#fff; border:1px solid #E8E8E6; border-radius:11px; padding:13px 16px; margin-bottom:7px; display:flex; align-items:flex-start; gap:12px; transition:all 0.15s; }
        .act-row:hover { border-color:#D0D0CC; box-shadow:0 2px 8px rgba(0,0,0,0.04); }
        .act-row.done { opacity:0.65; }

        .act-date-col { min-width:56px; text-align:center; flex-shrink:0; }
        .act-date-day { font-size:20px; font-weight:700; color:#1A1A1A; line-height:1; }
        .act-date-mon { font-size:10px; font-weight:600; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; margin-top:1px; }
        .act-date-end { font-size:10px; color:#CCC; margin-top:3px; }

        .act-divider { width:1px; background:#F0F0EE; align-self:stretch; flex-shrink:0; }

        .act-body { flex:1; min-width:0; }
        .act-title { font-size:13px; font-weight:600; color:#1A1A1A; line-height:1.4; margin-bottom:4px; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .act-title.done-text { text-decoration:line-through; color:#AAA; }
        .act-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:5px; }
        .type-tag { font-size:10px; font-weight:700; padding:2px 8px; border-radius:5px; white-space:nowrap; }
        .dept-tag { font-size:10px; font-weight:600; padding:2px 8px; border-radius:5px; background:#F5F5F3; color:#666; white-space:nowrap; }
        .school-tag { font-size:10px; font-weight:600; padding:2px 8px; border-radius:5px; background:#EFF6FF; color:#1D4ED8; white-space:nowrap; }
        .assignee-tag { font-size:11px; color:#888; display:flex; align-items:center; gap:4px; }
        .act-desc { font-size:12px; color:#888; margin-top:4px; line-height:1.5; }
        .act-notes { font-size:11px; color:#AAA; font-style:italic; margin-top:3px; }

        .act-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .check-btn { width:28px; height:28px; border-radius:7px; border:1.5px solid #E0E0DC; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; flex-shrink:0; }
        .check-btn:hover { border-color:#15803D; background:#F0FDF4; }
        .check-btn.checked { background:#15803D; border-color:#15803D; }
        .icon-btn { width:28px; height:28px; border-radius:7px; border:1px solid #E8E8E6; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#AAA; transition:all 0.15s; }
        .icon-btn:hover { background:#F5F5F3; color:#555; }
        .icon-btn.del:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }

        /* ── Table view ── */
        .tbl { width:100%; border-collapse:collapse; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #E8E8E6; }
        .tbl th { padding:9px 14px; text-align:left; font-size:10px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; background:#FAFAF8; border-bottom:1px solid #EFEFED; white-space:nowrap; }
        .tbl td { padding:11px 14px; border-bottom:1px solid #F5F5F3; font-size:13px; color:#1A1A1A; vertical-align:middle; }
        .tbl tr:last-child td { border-bottom:none; }
        .tbl tr:hover td { background:#FAFAF8; }
        .tbl tr.done-row td { opacity:0.6; }

        /* ── Card view ── */
        .card-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px; }
        .act-card { background:#fff; border:1px solid #E8E8E6; border-radius:13px; padding:16px; display:flex; flex-direction:column; gap:10px; transition:all 0.15s; }
        .act-card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.07); border-color:#D8D8D4; }
        .act-card.done { opacity:0.65; }
        .card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
        .card-title { font-size:13px; font-weight:600; color:#1A1A1A; line-height:1.4; flex:1; }
        .card-date { font-size:11px; color:#888; display:flex; align-items:center; gap:5px; }
        .card-footer { display:flex; align-items:center; justify-content:space-between; }

        /* ── Empty ── */
        .empty { padding:60px 20px; text-align:center; color:#CCC; font-size:13px; }
        .empty-hint { font-size:12px; color:#DDD; margin-top:6px; }

        /* ── Modal ── */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.35); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(3px); }
        .modal { background:#fff; border-radius:16px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.15); }
        .modal-head { padding:18px 22px 14px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; background:#fff; z-index:1; }
        .modal-title { font-size:15px; font-weight:600; color:#1A1A1A; }
        .modal-close { background:none; border:none; cursor:pointer; color:#CCC; padding:3px; border-radius:6px; }
        .modal-close:hover { color:#888; background:#F5F5F3; }
        .modal-body { padding:18px 22px 22px; display:flex; flex-direction:column; gap:13px; }

        .field { display:flex; flex-direction:column; gap:5px; }
        .field-label { font-size:11px; font-weight:600; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .field-input { height:36px; border:1px solid #E8E8E6; border-radius:9px; padding:0 11px; font-size:13px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; width:100%; transition:border-color 0.15s; }
        .field-input:focus { border-color:#1A1A1A; }
        .field-input::placeholder { color:#CCC; }
        .field-select { height:36px; border:1px solid #E8E8E6; border-radius:9px; padding:0 11px; font-size:13px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; width:100%; cursor:pointer; }
        .field-select:focus { border-color:#1A1A1A; }
        .field-textarea { border:1px solid #E8E8E6; border-radius:9px; padding:9px 11px; font-size:13px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; width:100%; resize:vertical; min-height:70px; transition:border-color 0.15s; }
        .field-textarea:focus { border-color:#1A1A1A; }
        .field-textarea::placeholder { color:#CCC; }
        .field-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; background:#F8F7F4; border-radius:9px; padding:9px 13px; }
        .sw { position:relative; width:36px; height:20px; flex-shrink:0; }
        .sw input { opacity:0; width:0; height:0; position:absolute; }
        .sw-track { position:absolute; inset:0; background:#E5E5E3; border-radius:10px; cursor:pointer; transition:background 0.2s; }
        .sw input:checked + .sw-track { background:#1A1A1A; }
        .sw-thumb { position:absolute; top:2px; left:2px; width:16px; height:16px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); transition:transform 0.2s; pointer-events:none; }
        .sw input:checked ~ .sw-thumb { transform:translateX(16px); }

        .save-btn { width:100%; padding:10px; background:#1A1A1A; color:#fff; border:none; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:background 0.15s; }
        .save-btn:hover:not(:disabled) { background:#333; }
        .save-btn:disabled { opacity:0.45; cursor:not-allowed; }
        .color-row { display:flex; gap:7px; flex-wrap:wrap; }
        .color-swatch { width:26px; height:26px; border-radius:7px; border:2px solid transparent; cursor:pointer; transition:all 0.15s; }
        .color-swatch.sel { border-color:#1A1A1A; box-shadow:0 0 0 2px #fff inset; }

        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { width:13px; height:13px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.8s linear infinite; }

        @media (max-width:768px) {
          .layout { grid-template-columns:1fr; }
          .sidebar { display:none; }
          .card-grid { grid-template-columns:1fr; }
        }
      `}</style>

      {/* ── Add/Edit Department Modal ── */}
      {showAddDept && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddDept(false); setEditDept(null); setDName(''); setDColor('#1D4ED8'); setDDesc('') } }}>
          <div className="modal">
            <div className="modal-head">
              <span className="modal-title">{editDept ? 'Edit Department' : 'Add Department'}</span>
              <button className="modal-close" onClick={() => { setShowAddDept(false); setEditDept(null); setDName(''); setDColor('#1D4ED8'); setDDesc('') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="field-label">Department Name *</label>
                <input className="field-input" value={dName} onChange={e => setDName(e.target.value)} placeholder="e.g. Academic, Boarding, Admin..." autoFocus />
              </div>
              <div className="field">
                <label className="field-label">Color</label>
                <div className="color-row">
                  {['#1D4ED8','#7E22CE','#C2410C','#0E7490','#15803D','#DC2626','#A16207','#374151','#BE185D','#0369A1'].map(c => (
                    <div key={c} className={`color-swatch ${dColor === c ? 'sel' : ''}`} style={{ background:c }} onClick={() => setDColor(c)} />
                  ))}
                </div>
                <input type="color" value={dColor} onChange={e => setDColor(e.target.value)} style={{ height:32, border:'1px solid #E8E8E6', borderRadius:8, padding:2, width:60, cursor:'pointer', marginTop:4 }} />
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea className="field-textarea" style={{ minHeight:56 }} value={dDesc} onChange={e => setDDesc(e.target.value)} placeholder="Optional description..." />
              </div>
              <button className="save-btn" onClick={saveDepartment} disabled={!dName.trim() || dSaving}>
                {dSaving ? <><span className="spin" /> Saving...</> : editDept ? 'Update Department' : 'Add Department'}
              </button>
              {editDept && (
                <button style={{ width:'100%', padding:9, background:'none', border:'1px solid #FECACA', borderRadius:10, fontSize:13, color:'#DC2626', cursor:'pointer', fontFamily:'inherit' }}
                  onClick={() => { deleteDepartment(editDept.id); setShowAddDept(false); setEditDept(null) }}>
                  Delete Department
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Activity Modal ── */}
      {showAddActivity && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowAddActivity(false); setEditActivity(null); resetActivityForm() } }}>
          <div className="modal">
            <div className="modal-head">
              <span className="modal-title">{editActivity ? 'Edit Activity' : 'Add Activity'}</span>
              <button className="modal-close" onClick={() => { setShowAddActivity(false); setEditActivity(null); resetActivityForm() }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="field-label">Title *</label>
                <input className="field-input" value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Activity title..." autoFocus />
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea className="field-textarea" value={aDesc} onChange={e => setADesc(e.target.value)} placeholder="Brief description..." />
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="field-label">Type *</label>
                  <select className="field-select" value={aType} onChange={e => setAType(e.target.value)}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Department</label>
                  <select className="field-select" value={aDept} onChange={e => setADept(e.target.value)}>
                    <option value="">— None —</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="field-label">Start Date *</label>
                  <input className="field-input" type="date" value={aStart} onChange={e => setAStart(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">End Date</label>
                  <input className="field-input" type="date" value={aEnd} onChange={e => setAEnd(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Assigned To</label>
                <select className="field-select" value={aAssigned} onChange={e => setAAssigned(e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Notes</label>
                <textarea className="field-textarea" style={{ minHeight:52 }} value={aNotes} onChange={e => setANotes(e.target.value)} placeholder="Additional notes..." />
              </div>
              <div className="toggle-row">
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#1A1A1A' }}>Whole School Activity</div>
                  <div style={{ fontSize:11, color:'#AAA', marginTop:1 }}>Visible to all departments</div>
                </div>
                <label className="sw">
                  <input type="checkbox" checked={aAllSchool} onChange={e => setAAllSchool(e.target.checked)} />
                  <div className="sw-track" /><div className="sw-thumb" />
                </label>
              </div>
              <button className="save-btn" onClick={saveActivity} disabled={!aTitle.trim() || !aStart || aSaving}>
                {aSaving ? <><span className="spin" /> Saving...</> : editActivity ? 'Update Activity' : 'Add Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Topbar ── */}
      <div className="topbar">
        <button className="back-btn" onClick={() => router.push('/admin')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Admin
        </button>
        <span className="topbar-title">Departments & Activities</span>
        <div style={{ width:80 }} />
      </div>

      <div className="layout">

        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="sb-section">
            <span className="sb-label">Departments</span>

            {/* All */}
            <button className={`dept-btn ${selDept==='all' ? 'on' : ''}`} onClick={() => setSelDept('all')}>
              <div className="dept-dot" style={{ background:'#1A1A1A' }} />
              All Activities
              <span className="dept-count">{activities.length}</span>
            </button>

            {/* Whole school */}
            <button className={`dept-btn ${selDept==='school' ? 'on' : ''}`} onClick={() => setSelDept('school')}>
              <div className="dept-dot" style={{ background:'#1D4ED8', outline:'2px dashed #BFDBFE', outlineOffset:1 }} />
              Whole School
              <span className="dept-count">{activities.filter(a=>a.is_all_school).length}</span>
            </button>

            {/* Departments */}
            {departments.map(d => (
              <button key={d.id} className={`dept-btn ${selDept===d.id ? 'on' : ''}`} onClick={() => setSelDept(d.id)}>
                <div className="dept-dot" style={{ background:d.color }} />
                {d.name}
                <span className="dept-count">{activities.filter(a=>a.department_id===d.id).length}</span>
                {isAdmin && (
                  <span style={{ marginLeft:2 }} onClick={e => { e.stopPropagation(); openEditDept(d) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </span>
                )}
              </button>
            ))}

            {isAdmin && (
              <button className="add-dept-btn" onClick={() => { setShowAddDept(true); setEditDept(null); setDName(''); setDColor('#1D4ED8'); setDDesc('') }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Department
              </button>
            )}
          </div>

          {/* Year selector */}
          <div className="year-sel-wrap">
            <span className="year-sel-label">Academic Year</span>
            <select className="year-sel" value={selYear} onChange={e => { setSelYear(e.target.value); loadActivities(e.target.value) }}>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
        </div>

        {/* ── Main ── */}
        <div className="main">

          {/* Toolbar */}
          <div className="toolbar">
            {/* View toggle */}
            <div className="view-seg">
              <button className={`view-btn ${view==='list'?'on':''}`} onClick={() => setView('list')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                List
              </button>
              <button className={`view-btn ${view==='table'?'on':''}`} onClick={() => setView('table')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                Table
              </button>
              <button className={`view-btn ${view==='card'?'on':''}`} onClick={() => setView('card')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Card
              </button>
            </div>

            <div className="tb-sep" />

            {/* Type filter */}
            {['all','exam','meeting','event','holiday','islamic'].map(t => (
              <button key={t} className={`filter-pill ${typeFilter===t?'on':''}`} onClick={() => setTypeFilter(t)}>
                {t === 'all' ? 'All Types' : TYPE_CONFIG[t]?.label || t}
              </button>
            ))}

            <div className="tb-sep" />

            {/* Status */}
            <button className={`filter-pill ${statusFilter==='all'?'on':''}`} onClick={() => setStatusFilter('all')}>All</button>
            <button className={`filter-pill ${statusFilter==='pending'?'on':''}`} onClick={() => setStatusFilter('pending')}>Pending</button>
            <button className={`filter-pill ${statusFilter==='done'?'on':''}`} onClick={() => setStatusFilter('done')}>Done</button>

            <div className="tb-sep" />

            {/* Month */}
            <select style={{ height:32, border:'1px solid #E8E8E6', borderRadius:8, padding:'0 8px', fontSize:12, fontFamily:'inherit', color:'#555', background:'#fff', outline:'none', cursor:'pointer' }}
              value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
              <option value="all">All Months</option>
              {months.map(m => <option key={m} value={m}>{fmtMonth(m+'-01')}</option>)}
            </select>

            {/* Search */}
            <div className="search-wrap">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Print */}
            <button className="print-btn" onClick={() => doPrint('week')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Week
            </button>
            <button className="print-btn" onClick={() => doPrint('month')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Month
            </button>

            {/* Add */}
            {isAdmin && (
              <button className="add-btn" onClick={() => { resetActivityForm(); if (selDept !== 'all' && selDept !== 'school') setADept(selDept); setShowAddActivity(true) }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Activity
              </button>
            )}
          </div>

          {/* Stats strip */}
          <div className="stats-strip">
            <div className="stat-chip"><div className="stat-dot" style={{ background:'#1A1A1A' }} /><span><strong>{filtered.length}</strong> activities</span></div>
            <div className="stat-chip"><div className="stat-dot" style={{ background:'#15803D' }} /><span><strong>{doneCount}</strong> completed</span></div>
            <div className="stat-chip"><div className="stat-dot" style={{ background:'#C2410C' }} /><span><strong>{pendingCount}</strong> pending</span></div>
            {selDeptObj && <div className="stat-chip"><div className="stat-dot" style={{ background:selDeptObj.color }} /><strong>{selDeptObj.name}</strong></div>}
          </div>

          {/* Content */}
          <div className="content">

            {/* ── LIST VIEW ── */}
            {view === 'list' && (
              filtered.length === 0 ? (
                <div className="empty">
                  No activities found.
                  <div className="empty-hint">{isAdmin ? 'Click "Add Activity" to get started.' : 'No activities scheduled.'}</div>
                </div>
              ) : groupedByMonth.map(([monthKey, acts]) => (
                <div key={monthKey} className="month-group">
                  <div className="month-label">
                    {monthKey === 'no-date' ? 'No Date' : fmtMonth(monthKey + '-01')}
                  </div>
                  {acts.map(a => {
                    const tc = TYPE_CONFIG[a.activity_type] || TYPE_CONFIG.general
                    const deptObj = departments.find(d => d.id === a.department_id)
                    const startDate = a.planned_date ? new Date(a.planned_date + 'T12:00:00') : null
                    return (
                      <div key={a.id} className={`act-row ${a.is_completed ? 'done' : ''}`}>
                        {/* Date column */}
                        <div className="act-date-col">
                          {startDate ? (
                            <>
                              <div className="act-date-day">{startDate.getDate()}</div>
                              <div className="act-date-mon">{startDate.toLocaleDateString('en-ZA', { month:'short' })}</div>
                              {a.end_date && a.end_date !== a.planned_date && (
                                <div className="act-date-end">→ {fmtShort(a.end_date)}</div>
                              )}
                            </>
                          ) : <div style={{ fontSize:11, color:'#CCC' }}>TBD</div>}
                        </div>

                        <div className="act-divider" />

                        {/* Body */}
                        <div className="act-body">
                          <div className={`act-title ${a.is_completed ? 'done-text' : ''}`}>
                            {a.title}
                          </div>
                          {a.description && <div className="act-desc">{a.description}</div>}
                          <div className="act-meta">
                            <span className="type-tag" style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>{tc.label}</span>
                            {deptObj && <span className="dept-tag" style={{ background:deptObj.color+'18', color:deptObj.color }}>{deptObj.name}</span>}
                            {a.is_all_school && <span className="school-tag">🏫 All School</span>}
                            {(a as any).assignee?.full_name && (
                              <span className="assignee-tag">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                {(a as any).assignee.full_name}
                              </span>
                            )}
                          </div>
                          {a.notes && <div className="act-notes">"{a.notes}"</div>}
                          {a.is_completed && a.completed_at && (
                            <div style={{ fontSize:11, color:'#15803D', marginTop:4 }}>
                              ✓ Completed {fmtShort(a.completed_at.split('T')[0])}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="act-actions">
                          <button className={`check-btn ${a.is_completed ? 'checked' : ''}`} onClick={() => toggleComplete(a)} title={a.is_completed ? 'Mark as pending' : 'Mark as done'}>
                            {a.is_completed && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                          {isAdmin && (
                            <>
                              <button className="icon-btn" onClick={() => openEditActivity(a)} title="Edit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button className="icon-btn del" onClick={() => deleteActivity(a.id)} title="Delete">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}

            {/* ── TABLE VIEW ── */}
            {view === 'table' && (
              filtered.length === 0 ? <div className="empty">No activities found.</div> : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width:28 }} />
                      <th>Activity</th>
                      <th>Date</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                      {isAdmin && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const tc = TYPE_CONFIG[a.activity_type] || TYPE_CONFIG.general
                      const deptObj = departments.find(d => d.id === a.department_id)
                      return (
                        <tr key={a.id} className={a.is_completed ? 'done-row' : ''}>
                          <td>
                            <button className={`check-btn ${a.is_completed ? 'checked' : ''}`} onClick={() => toggleComplete(a)}>
                              {a.is_completed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                            </button>
                          </td>
                          <td>
                            <div style={{ fontWeight:600, color: a.is_completed ? '#AAA' : '#1A1A1A', textDecoration: a.is_completed ? 'line-through' : 'none' }}>{a.title}</div>
                            {a.description && <div style={{ fontSize:11, color:'#AAA', marginTop:2 }}>{a.description}</div>}
                          </td>
                          <td style={{ fontSize:12, color:'#555', whiteSpace:'nowrap' }}>
                            {fmtDate(a.planned_date)}
                            {a.end_date && a.end_date !== a.planned_date && <><br/><span style={{ color:'#AAA' }}>→ {fmtDate(a.end_date)}</span></>}
                          </td>
                          <td>
                            {deptObj ? <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:5, background:deptObj.color+'18', color:deptObj.color }}>{deptObj.name}</span>
                              : a.is_all_school ? <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:5, background:'#EFF6FF', color:'#1D4ED8' }}>All School</span>
                              : <span style={{ color:'#DDD' }}>—</span>}
                          </td>
                          <td><span className="type-tag" style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>{tc.label}</span></td>
                          <td style={{ fontSize:12, color:'#555' }}>{(a as any).assignee?.full_name || <span style={{ color:'#DDD' }}>—</span>}</td>
                          <td>
                            <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:5, background:a.is_completed?'#F0FDF4':'#FFF7ED', color:a.is_completed?'#15803D':'#C2410C' }}>
                              {a.is_completed ? '✓ Done' : 'Pending'}
                            </span>
                          </td>
                          {isAdmin && (
                            <td>
                              <div style={{ display:'flex', gap:4 }}>
                                <button className="icon-btn" onClick={() => openEditActivity(a)}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                                <button className="icon-btn del" onClick={() => deleteActivity(a.id)}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            )}

            {/* ── CARD VIEW ── */}
            {view === 'card' && (
              filtered.length === 0 ? <div className="empty">No activities found.</div> : (
                <div className="card-grid">
                  {filtered.map(a => {
                    const tc = TYPE_CONFIG[a.activity_type] || TYPE_CONFIG.general
                    const deptObj = departments.find(d => d.id === a.department_id)
                    return (
                      <div key={a.id} className={`act-card ${a.is_completed ? 'done' : ''}`}>
                        <div className="card-top">
                          <div className="card-title" style={{ textDecoration: a.is_completed ? 'line-through' : 'none', color: a.is_completed ? '#AAA' : '#1A1A1A' }}>
                            {a.title}
                          </div>
                          <button className={`check-btn ${a.is_completed ? 'checked' : ''}`} onClick={() => toggleComplete(a)}>
                            {a.is_completed && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        </div>
                        {a.description && <div style={{ fontSize:12, color:'#888', lineHeight:1.5 }}>{a.description}</div>}
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          <span className="type-tag" style={{ background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>{tc.label}</span>
                          {deptObj && <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:5, background:deptObj.color+'18', color:deptObj.color }}>{deptObj.name}</span>}
                        </div>
                        <div className="card-footer">
                          <div className="card-date">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {fmtDate(a.planned_date)}
                            {a.end_date && a.end_date !== a.planned_date && ` → ${fmtShort(a.end_date)}`}
                          </div>
                          {isAdmin && (
                            <div style={{ display:'flex', gap:4 }}>
                              <button className="icon-btn" onClick={() => openEditActivity(a)}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                              <button className="icon-btn del" onClick={() => deleteActivity(a.id)}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
                            </div>
                          )}
                        </div>
                        {(a as any).assignee?.full_name && (
                          <div style={{ fontSize:11, color:'#888', display:'flex', alignItems:'center', gap:5, borderTop:'1px solid #F5F5F3', paddingTop:8 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            {(a as any).assignee.full_name}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            )}

          </div>
        </div>
      </div>
    </main>
  )
}