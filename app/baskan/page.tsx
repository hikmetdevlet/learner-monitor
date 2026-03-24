'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase'
import { useRouter } from 'next/navigation'

type Activity = { id: string; name: string; is_salaah: boolean; is_active: boolean }
type Learner = { id: string; full_name: string }
type StatusMap = Record<string, 'present' | 'absent'>
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Supper']

export default function BaskanPage() {
  const [baskanName, setBaskanName] = useState('')
  const [baskanId, setBaskanId] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [learners, setLearners] = useState<Learner[]>([])
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [statusMap, setStatusMap] = useState<StatusMap>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [todaySummary, setTodaySummary] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [cleaningItems, setCleaningItems] = useState<any[]>([])
  const [cleaningAssignees, setCleaningAssignees] = useState<any[]>([])
  const [cleaningStatus, setCleaningStatus] = useState<Record<string, 'done' | 'partial' | 'not_done'>>({})
  const [cleaningNotes, setCleaningNotes] = useState<Record<string, string>>({})
  const [cleaningSaving, setCleaningSaving] = useState(false)
  const [cleaningSaved, setCleaningSaved] = useState(false)
  const [cleaningSummary, setCleaningSummary] = useState<any[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const todayFormatted = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('auth_id', user.id).single()
    if (!userData || userData.role !== 'baskan') { router.push('/'); return }
    setBaskanName(userData.full_name)
    setBaskanId(userData.id)
    const [acts, lrns] = await Promise.all([loadActivities(), loadLearners(), loadLocations()])
    loadDashboard(acts, lrns)
  }

  async function loadActivities() {
    const { data } = await supabase.from('daily_activities').select('*').eq('is_active', true).order('order_num').order('name')
    setActivities(data || [])
    return data || []
  }

  async function loadLearners() {
    const { data } = await supabase.from('learners').select('id, full_name').eq('is_active', true).order('full_name')
    setLearners(data || [])
    return data || []
  }

  async function loadLocations() {
    const { data } = await supabase.from('cleaning_locations').select('*').eq('is_active', true).order('floor').order('name')
    setLocations(data || [])
    await loadCleaningSummary(data || [])
  }

  async function loadCleaningSummary(locs: any[]) {
    const summary = await Promise.all(locs.map(async loc => {
      const [{ data: items }, { data: logs }] = await Promise.all([
        supabase.from('cleaning_checklist_items').select('id').or(`location_id.eq.${loc.id},is_global.eq.true`).eq('is_active', true),
        supabase.from('cleaning_logs').select('status').eq('location_id', loc.id).eq('log_date', today),
      ])
      const total = items?.length || 0
      const done = logs?.filter(l => l.status === 'done').length || 0
      return { location: loc, total, done, marked: logs?.length || 0, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
    }))
    setCleaningSummary(summary)
  }

  async function loadDashboard(acts: any[], lrns: any[]) {
    const salaahActs = acts.filter((a: any) => a.is_salaah)
    const total = lrns.length
    const [summary, days] = await Promise.all([
      Promise.all(salaahActs.map(async act => {
        const { data } = await supabase.from('activity_attendance').select('status').eq('activity_id', act.id).eq('activity_date', today)
        const present = data?.filter(d => d.status === 'present').length || 0
        return { name: act.name, id: act.id, present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0, marked: (data?.length || 0) > 0 }
      })),
      Promise.all(Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return { dateStr: d.toISOString().split('T')[0], day: d.toLocaleDateString('en-US', { weekday: 'short' }) }
      }).map(async ({ dateStr, day }) => {
        const results = await Promise.all(salaahActs.map(act =>
          supabase.from('activity_attendance').select('status').eq('activity_id', act.id).eq('activity_date', dateStr)
        ))
        const totalP = results.reduce((a, r) => a + (r.data?.filter(d => d.status === 'present').length || 0), 0)
        const totalR = results.reduce((a, r) => a + (r.data?.length || 0), 0)
        return { day, pct: totalR > 0 ? Math.round((totalP / totalR) * 100) : 0, hasData: totalR > 0 }
      }))
    ])
    setTodaySummary(summary)
    setWeeklyData(days)
  }

  async function selectActivity(activity: Activity) {
    setSelectedActivity(activity)
    setSaved(false)
    const { data } = await supabase.from('activity_attendance').select('*').eq('activity_id', activity.id).eq('activity_date', today)
    const map: StatusMap = {}
    learners.forEach(l => { map[l.id] = 'absent' })
    data?.forEach((a: any) => { map[a.learner_id] = a.status })
    setStatusMap(map)
  }

  async function saveAttendance() {
    if (!selectedActivity) return
    setSaving(true)
    await Promise.all(learners.map(l =>
      supabase.from('activity_attendance').upsert({
        activity_id: selectedActivity.id, learner_id: l.id, activity_date: today,
        status: statusMap[l.id] || 'absent', marked_by: baskanId,
      }, { onConflict: 'activity_id,learner_id,activity_date' })
    ))
    setSaving(false); setSaved(true)
    loadActivities().then(acts => loadDashboard(acts, learners))
  }

  async function selectLocation(loc: any) {
    setSelectedLocation(loc)
    setCleaningSaved(false)
    const [{ data: globalItems }, { data: locItems }, { data: assigns }, { data: logs }] = await Promise.all([
      supabase.from('cleaning_checklist_items').select('*').eq('is_global', true).eq('is_active', true).order('order_num'),
      supabase.from('cleaning_checklist_items').select('*').eq('location_id', loc.id).eq('is_active', true).order('order_num'),
      supabase.from('cleaning_assignments').select('*, learners(id, full_name)').eq('location_id', loc.id).eq('is_active', true),
      supabase.from('cleaning_logs').select('*').eq('location_id', loc.id).eq('log_date', today),
    ])
    const seen = new Set<string>()
    const allItems = [...(globalItems || []), ...(locItems || [])].filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    setCleaningItems(allItems)
    setCleaningAssignees(assigns?.map((a: any) => a.learners).filter(Boolean) || [])
    const statusInit: Record<string, 'done' | 'partial' | 'not_done'> = {}
    const notesInit: Record<string, string> = {}
    allItems.forEach(item => { statusInit[item.id] = 'not_done' })
    logs?.forEach((log: any) => { statusInit[log.checklist_item_id] = log.status; if (log.note) notesInit[log.checklist_item_id] = log.note })
    setCleaningStatus(statusInit)
    setCleaningNotes(notesInit)
  }

  async function saveCleaning() {
    if (!selectedLocation) return
    setCleaningSaving(true)
    await Promise.all(cleaningItems.map(item =>
      supabase.from('cleaning_logs').upsert({
        checklist_item_id: item.id, location_id: selectedLocation.id, log_date: today,
        status: cleaningStatus[item.id] || 'not_done',
        note: cleaningNotes[item.id] || null, marked_by: baskanId,
      }, { onConflict: 'checklist_item_id,location_id,log_date' })
    ))
    setCleaningSaving(false); setCleaningSaved(true)
    loadLocations()
  }

  const presentCount = learners.filter(l => statusMap[l.id] === 'present').length
  const absentCount = learners.length - presentCount
  const salaahActs = activities.filter(a => a.is_salaah)
  const mealActs = activities.filter(a => !a.is_salaah && MEALS.some(m => a.name.toLowerCase().includes(m.toLowerCase())))
  const otherActs = activities.filter(a => !a.is_salaah && !MEALS.some(m => a.name.toLowerCase().includes(m.toLowerCase())))
  const floors = [...new Set(locations.map(l => l.floor || 'General'))].sort()
  const CS = [
    { key: 'done', label: 'Done', bg: '#10B981', light: '#ECFDF5', text: '#065F46', icon: '✓' },
    { key: 'partial', label: 'Partial', bg: '#F59E0B', light: '#FFFBEB', text: '#92400E', icon: '◐' },
    { key: 'not_done', label: 'Not done', bg: '#EF4444', light: '#FEF2F2', text: '#991B1B', icon: '✗' },
  ]

  const cleaningDone = cleaningSummary.filter(s => s.marked > 0 && s.pct === 100).length
  const cleaningPending = cleaningSummary.filter(s => s.marked === 0).length
  const salaahMarkedToday = todaySummary.filter(s => s.marked).length

  const filteredLearners = searchQuery
    ? learners.filter(l => l.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : learners

  const tabs = [
    { key: 'dashboard', label: 'Home', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    )},
    { key: 'attendance', label: 'Attendance', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
    )},
    { key: 'cleaning', label: 'Cleaning', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3z"/><path d="M3 7l2 14h14l2-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
    )},
  ]

  function navigateTab(key: string) {
    setActiveTab(key)
    setSelectedActivity(null)
    setSelectedLocation(null)
    setMobileMenuOpen(false)
    setSearchQuery('')
  }

  const initials = baskanName ? baskanName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''

  return (
    <main style={{ minHeight: '100vh', background: '#F7F6F3', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #F7F6F3;
          --surface: #FFFFFF;
          --surface-raised: #FAFAF8;
          --border: #ECEAE5;
          --border-light: #F3F1ED;
          --text-primary: #1B1B18;
          --text-secondary: #6B6B63;
          --text-muted: #A3A39B;
          --green: #10B981;
          --green-soft: #ECFDF5;
          --green-text: #065F46;
          --red: #EF4444;
          --red-soft: #FEF2F2;
          --red-text: #991B1B;
          --amber: #F59E0B;
          --amber-soft: #FFFBEB;
          --amber-text: #92400E;
          --blue: #3B82F6;
          --blue-soft: #EFF6FF;
          --blue-text: #1E40AF;
          --purple: #8B5CF6;
          --purple-soft: #F5F3FF;
          --purple-text: #5B21B6;
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
          --shadow-md: 0 2px 8px rgba(0,0,0,0.06);
          --shadow-lg: 0 4px 16px rgba(0,0,0,0.08);
          --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ── Topbar ── */
        .topbar {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          position: sticky;
          top: 0;
          z-index: 30;
          backdrop-filter: blur(12px);
          background: rgba(255,255,255,0.92);
        }
        .brand {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: -0.3px;
          font-family: 'Playfair Display', serif;
        }
        .brand-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--text-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: transform var(--transition);
        }
        .avatar:hover { transform: scale(1.05); }
        .date-chip {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--surface-raised);
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid var(--border-light);
          display: none;
        }
        .logout-btn {
          font-size: 12px;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          transition: all var(--transition);
        }
        .logout-btn:hover { background: var(--red-soft); color: var(--red); }
        .hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          color: var(--text-primary);
        }

        /* ── Layout ── */
        .shell { display: flex; min-height: calc(100vh - 56px); }

        /* ── Sidebar (desktop) ── */
        .sidebar {
          width: 220px;
          flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border);
          padding: 20px 14px;
          position: sticky;
          top: 56px;
          height: calc(100vh - 56px);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sidebar-date {
          font-size: 12px;
          color: var(--text-muted);
          padding: 6px 12px 16px;
          line-height: 1.6;
          border-bottom: 1px solid var(--border-light);
          margin-bottom: 12px;
        }
        .sidebar-date strong {
          display: block;
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          background: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all var(--transition);
          text-align: left;
        }
        .nav-btn:hover { background: var(--surface-raised); color: var(--text-primary); }
        .nav-btn.active {
          background: var(--text-primary);
          color: white;
          box-shadow: var(--shadow-md);
        }
        .nav-btn.active svg { stroke: white; }

        /* ── Mobile bottom nav ── */
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 40;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid var(--border);
          padding: 6px 8px calc(env(safe-area-inset-bottom, 8px) + 6px);
          display: none;
        }
        .bottom-nav-inner {
          display: flex;
          justify-content: space-around;
          align-items: center;
          max-width: 400px;
          margin: 0 auto;
        }
        .bnav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 16px;
          border: none;
          background: none;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          border-radius: var(--radius-md);
          transition: all var(--transition);
          position: relative;
        }
        .bnav-btn.active { color: var(--green); }
        .bnav-btn.active::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: var(--green);
          border-radius: 0 0 3px 3px;
        }

        /* ── Content area ── */
        .content {
          flex: 1;
          padding: 24px 28px 32px;
          max-width: 920px;
        }

        /* ── Section header ── */
        .section-head { margin-bottom: 20px; }
        .section-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
          font-family: 'Playfair Display', serif;
        }
        .section-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

        /* ── Stats row ── */
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 18px 20px;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition), box-shadow var(--transition);
        }
        .stat-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
        .stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-n {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1;
          letter-spacing: -1px;
          font-family: 'Outfit', sans-serif;
        }
        .stat-n span { font-size: 15px; color: var(--text-muted); font-weight: 400; }
        .stat-l {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
        }

        /* ── Dashboard grid ── */
        .dash-grid { display: grid; grid-template-columns: 1fr 320px; gap: 16px; }

        /* ── Card ── */
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 14px;
          box-shadow: var(--shadow-sm);
        }
        .card:last-child { margin-bottom: 0; }
        .card-head {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .card-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .card-link {
          font-size: 12px;
          color: var(--green);
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          padding: 4px 0;
          transition: opacity var(--transition);
        }
        .card-link:hover { opacity: 0.7; }

        /* ── Prayer pills ── */
        .prayer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
          padding: 16px;
        }
        .prayer-pill {
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px 10px;
          text-align: center;
          cursor: pointer;
          transition: all var(--transition);
          background: var(--surface-raised);
          position: relative;
          overflow: hidden;
        }
        .prayer-pill:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .prayer-pill.marked { border-color: #A7F3D0; background: var(--green-soft); }
        .prayer-pill.marked::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--green);
        }
        .prayer-name {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }
        .prayer-pct { font-size: 22px; font-weight: 700; line-height: 1; font-family: 'Outfit', sans-serif; }
        .prayer-sub { font-size: 10px; color: var(--text-muted); margin-top: 5px; font-weight: 500; }

        /* ── Weekly chart ── */
        .week-chart { display: flex; align-items: flex-end; gap: 8px; padding: 20px; height: 120px; }
        .week-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          height: 100%;
          justify-content: flex-end;
        }
        .week-track {
          width: 100%;
          flex: 1;
          background: var(--border-light);
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .week-fill { width: 100%; border-radius: 6px; transition: height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .week-day { font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
        .week-pct { font-size: 10px; font-weight: 700; }

        /* ── Location rows ── */
        .loc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: background var(--transition);
        }
        .loc-row:last-child { border-bottom: none; }
        .loc-row:hover { background: var(--surface-raised); }
        .loc-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .loc-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .status-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          letter-spacing: 0.02em;
        }
        .floor-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 20px 0 10px;
        }
        .floor-label:first-child { margin-top: 0; }

        /* ── Activity picker ── */
        .act-section-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 20px 0 10px;
        }
        .act-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .act-pill {
          padding: 10px 20px;
          border-radius: 24px;
          border: 1.5px solid var(--border);
          background: var(--surface);
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all var(--transition);
          box-shadow: var(--shadow-sm);
        }
        .act-pill:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
        .act-pill.salaah { background: var(--green-soft); color: var(--green-text); border-color: #A7F3D0; }
        .act-pill.salaah:hover { background: #D1FAE5; }
        .act-pill.meal { background: var(--blue-soft); color: var(--blue-text); border-color: #BFDBFE; }
        .act-pill.meal:hover { background: #DBEAFE; }
        .act-pill.other { background: var(--purple-soft); color: var(--purple-text); border-color: #DDD6FE; }
        .act-pill.other:hover { background: #EDE9FE; }

        /* ── Attendance marking ── */
        .att-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 12px;
        }
        .att-back {
          font-size: 13px;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 0;
          font-weight: 500;
          transition: color var(--transition);
        }
        .att-back:hover { color: var(--text-primary); }
        .att-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
          margin-top: 4px;
          font-family: 'Playfair Display', serif;
        }
        .save-btn {
          background: var(--text-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all var(--transition);
          box-shadow: var(--shadow-md);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: var(--shadow-lg); }
        .save-btn:active:not(:disabled) { transform: translateY(0); }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-btn.saved { background: var(--green); }

        .att-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .att-stat {
          border-radius: var(--radius-md);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .att-stat-n { font-size: 24px; font-weight: 700; line-height: 1; font-family: 'Outfit', sans-serif; }
        .att-stat-l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; font-weight: 600; }

        /* ── Search input ── */
        .search-wrap {
          position: relative;
          margin-bottom: 14px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .search-input {
          width: 100%;
          height: 42px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0 14px 0 40px;
          font-size: 14px;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          background: var(--surface);
          outline: none;
          transition: border-color var(--transition), box-shadow var(--transition);
        }
        .search-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
        .search-input::placeholder { color: var(--text-muted); }

        .mark-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .mark-label { font-size: 12px; color: var(--text-muted); font-weight: 600; }
        .mark-btn {
          font-size: 12px;
          padding: 7px 16px;
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
          transition: all var(--transition);
        }
        .mark-btn:hover { transform: translateY(-1px); }

        .learner-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .learner-item {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.15s;
          user-select: none;
          gap: 8px;
        }
        .learner-item:hover { border-color: #D5D3CE; }
        .learner-item.present { border-color: #6EE7B7; background: var(--green-soft); }
        .learner-name-text {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          flex: 1;
          line-height: 1.3;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .learner-item.present .learner-name-text { color: var(--green-text); }
        .learner-toggle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--border);
          cursor: pointer;
          font-size: 0;
          flex-shrink: 0;
          transition: all var(--transition);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .learner-toggle.present {
          background: var(--green);
          border-color: var(--green);
        }
        .learner-toggle.present::after {
          content: '';
          width: 10px;
          height: 6px;
          border-left: 2px solid white;
          border-bottom: 2px solid white;
          transform: rotate(-45deg) translateY(-1px);
        }

        /* ── Cleaning checklist ── */
        .cleaning-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 12px;
        }
        .clean-summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .clean-sum-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px;
          text-align: center;
          box-shadow: var(--shadow-sm);
        }
        .clean-sum-n { font-size: 22px; font-weight: 700; font-family: 'Outfit', sans-serif; }
        .clean-sum-l { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; font-weight: 600; }
        .assignee-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; align-items: center; }
        .assignee-chip {
          font-size: 12px;
          background: var(--blue-soft);
          color: var(--blue-text);
          border: 1px solid #BFDBFE;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 500;
        }
        .mark-all-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: var(--surface-raised);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          flex-wrap: wrap;
        }
        .clean-item {
          background: var(--surface);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px 18px;
          margin-bottom: 8px;
          transition: border-color var(--transition), box-shadow var(--transition);
        }
        .clean-item.done { border-color: #6EE7B7; background: var(--green-soft); }
        .clean-item.partial { border-color: #FCD34D; background: var(--amber-soft); }
        .clean-item-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .clean-item-q { font-size: 14px; font-weight: 500; color: var(--text-primary); flex: 1; line-height: 1.4; }
        .clean-btns { display: flex; gap: 5px; flex-shrink: 0; }
        .clean-btn {
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border: 1.5px solid transparent;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          transition: all 0.15s;
        }
        .clean-btn:hover { transform: translateY(-1px); }
        .note-input {
          width: 100%;
          height: 36px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 0 12px;
          font-size: 13px;
          font-family: 'Outfit', sans-serif;
          color: var(--text-secondary);
          background: var(--surface-raised);
          outline: none;
          margin-top: 12px;
          transition: all var(--transition);
        }
        .note-input:focus { border-color: var(--text-primary); background: var(--surface); box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
        .note-input::placeholder { color: var(--text-muted); }

        .empty {
          padding: 40px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
        }

        /* ── RESPONSIVE ── */
        @media (min-width: 769px) {
          .date-chip { display: block; }
          .bottom-nav { display: none !important; }
        }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .hamburger { display: block; }
          .date-chip { display: none; }
          .bottom-nav { display: block; }
          .content {
            padding: 16px 16px 100px;
            max-width: 100%;
          }
          .dash-grid { grid-template-columns: 1fr; }
          .learner-grid { grid-template-columns: 1fr 1fr; }
          .stats-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .stat-card { padding: 14px; }
          .stat-n { font-size: 22px; }
          .stat-l { font-size: 9px; }
          .stat-icon { width: 30px; height: 30px; }
          .section-title { font-size: 20px; }
          .att-title { font-size: 20px; }
          .prayer-grid { grid-template-columns: repeat(auto-fill, minmax(85px, 1fr)); gap: 8px; padding: 12px; }
          .prayer-pill { padding: 12px 8px; }
          .prayer-pct { font-size: 18px; }
          .week-chart { height: 100px; padding: 14px; }
          .att-stats { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .att-stat { padding: 10px 12px; }
          .att-stat-n { font-size: 20px; }
          .clean-summary-row { gap: 8px; }
          .clean-sum-card { padding: 10px; }
          .clean-sum-n { font-size: 18px; }
          .clean-btns { gap: 4px; }
          .clean-btn { padding: 5px 9px; font-size: 10px; }
          .clean-item { padding: 12px 14px; }
          .act-pill { padding: 8px 16px; font-size: 13px; }
          .save-btn { padding: 10px 18px; font-size: 13px; }
          .topbar { padding: 0 16px; }
          .mark-all-row { padding: 10px 12px; gap: 6px; }
          .loc-row { padding: 12px 16px; }
        }

        @media (max-width: 480px) {
          .learner-grid { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
          .stat-card { padding: 12px 10px; }
          .stat-n { font-size: 20px; }
          .stat-icon { width: 28px; height: 28px; }
          .att-stats { gap: 6px; }
          .att-stat { padding: 8px 10px; flex-direction: column; align-items: flex-start; gap: 4px; }
          .att-stat svg { display: none; }
          .att-stat-n { font-size: 18px; }
          .clean-item-row { flex-direction: column; align-items: stretch; gap: 10px; }
          .clean-btns { justify-content: stretch; }
          .clean-btn { flex: 1; text-align: center; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">B</div>
          Baskan
        </div>
        <div className="topbar-right">
          <span className="date-chip">{todayFormatted}</span>
          <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Sign out</button>
          <div className="avatar" title={baskanName}>{initials}</div>
        </div>
      </div>

      <div className="shell">
        {/* Sidebar (desktop) */}
        <aside className="sidebar">
          <div className="sidebar-date">
            <strong>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</strong>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          {tabs.map(tab => (
            <button key={tab.key} className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => navigateTab(tab.key)}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="content">

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="section-head">
                <div className="section-title">Overview</div>
                <div className="section-sub">Today&rsquo;s activity summary</div>
              </div>

              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon" style={{ background: 'var(--green-soft)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                  </div>
                  <div className="stat-n">{learners.length}</div>
                  <div className="stat-l">Learners</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon" style={{ background: 'var(--amber-soft)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                  </div>
                  <div className="stat-n">{salaahMarkedToday}<span>/{salaahActs.length}</span></div>
                  <div className="stat-l">Prayers marked</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon" style={{ background: 'var(--blue-soft)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                  <div className="stat-n">{cleaningDone}<span>/{cleaningSummary.length}</span></div>
                  <div className="stat-l">Cleaning done</div>
                </div>
              </div>

              <div className="dash-grid">
                <div>
                  <div className="card">
                    <div className="card-head">
                      <span className="card-title">Today&rsquo;s Prayers</span>
                      <button className="card-link" onClick={() => navigateTab('attendance')}>Mark attendance &rarr;</button>
                    </div>
                    {salaahActs.length === 0 ? (
                      <div className="empty">No prayer activities configured</div>
                    ) : (
                      <div className="prayer-grid">
                        {(todaySummary.length > 0 ? todaySummary : salaahActs.map(a => ({ name: a.name, id: a.id, pct: 0, present: 0, total: learners.length, marked: false }))).map(s => (
                          <div key={s.id} className={`prayer-pill ${s.marked ? 'marked' : ''}`}
                            onClick={() => { const a = activities.find(x => x.id === s.id); if (a) { setActiveTab('attendance'); selectActivity(a) } }}>
                            <div className="prayer-name">{s.name}</div>
                            <div className="prayer-pct" style={{ color: s.marked ? (s.pct >= 70 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)' }}>
                              {s.marked ? `${s.pct}%` : '—'}
                            </div>
                            <div className="prayer-sub">{s.marked ? `${s.present}/${s.total}` : 'Not marked'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <div className="card-head"><span className="card-title">7-Day Prayer Attendance</span></div>
                    <div className="week-chart">
                      {weeklyData.map((d, i) => (
                        <div key={i} className="week-col">
                          <span className="week-pct" style={{ color: d.hasData ? (d.pct >= 70 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)' }}>
                            {d.hasData ? `${d.pct}%` : '—'}
                          </span>
                          <div className="week-track">
                            <div className="week-fill" style={{ height: `${d.hasData ? Math.max(d.pct, 5) : 5}%`, background: d.hasData ? (d.pct >= 70 ? 'var(--green)' : 'var(--red)') : 'var(--border)' }} />
                          </div>
                          <span className="week-day">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="card">
                    <div className="card-head">
                      <span className="card-title">Today&rsquo;s Cleaning</span>
                      <button className="card-link" onClick={() => navigateTab('cleaning')}>Go to cleaning &rarr;</button>
                    </div>
                    {cleaningSummary.length === 0 ? (
                      <div className="empty">No locations added</div>
                    ) : (
                      cleaningSummary.map(s => (
                        <div key={s.location.id} className="loc-row" onClick={() => { setActiveTab('cleaning'); selectLocation(s.location) }}>
                          <div>
                            <div className="loc-name">{s.location.name}</div>
                            <div className="loc-meta">{s.total} tasks</div>
                          </div>
                          {s.marked === 0
                            ? <span className="status-pill" style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Pending</span>
                            : s.pct === 100
                              ? <span className="status-pill" style={{ background: 'var(--green-soft)', color: 'var(--green-text)' }}>✓ Done</span>
                              : <span className="status-pill" style={{ background: 'var(--amber-soft)', color: 'var(--amber-text)' }}>{s.done}/{s.total}</span>
                          }
                        </div>
                      ))
                    )}
                  </div>

                  {(mealActs.length > 0 || otherActs.length > 0) && (
                    <div className="card">
                      <div className="card-head"><span className="card-title">Other Activities</span></div>
                      <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {[...mealActs, ...otherActs].map(a => (
                          <button key={a.id} className={`act-pill ${mealActs.includes(a) ? 'meal' : 'other'}`}
                            onClick={() => { setActiveTab('attendance'); selectActivity(a) }}
                            style={{ fontSize: 12, padding: '7px 14px' }}>
                            {a.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ATTENDANCE (picker) ── */}
          {activeTab === 'attendance' && !selectedActivity && (
            <div>
              <div className="section-head">
                <div className="section-title">Attendance</div>
                <div className="section-sub">Select an activity to mark attendance</div>
              </div>

              {salaahActs.length > 0 && (
                <>
                  <div className="act-section-label">Prayers</div>
                  <div className="act-pills">
                    {salaahActs.map(a => <button key={a.id} className="act-pill salaah" onClick={() => selectActivity(a)}>{a.name}</button>)}
                  </div>
                </>
              )}
              {mealActs.length > 0 && (
                <>
                  <div className="act-section-label">Meals</div>
                  <div className="act-pills">
                    {mealActs.map(a => <button key={a.id} className="act-pill meal" onClick={() => selectActivity(a)}>{a.name}</button>)}
                  </div>
                </>
              )}
              {otherActs.length > 0 && (
                <>
                  <div className="act-section-label">Other</div>
                  <div className="act-pills">
                    {otherActs.map(a => <button key={a.id} className="act-pill other" onClick={() => selectActivity(a)}>{a.name}</button>)}
                  </div>
                </>
              )}
              {activities.length === 0 && <div className="empty">No activities configured</div>}
            </div>
          )}

          {/* ── ATTENDANCE (marking) ── */}
          {activeTab === 'attendance' && selectedActivity && (
            <div>
              <div className="att-header">
                <div>
                  <button className="att-back" onClick={() => { setSelectedActivity(null); setSaved(false); setSearchQuery('') }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                  </button>
                  <div className="att-title">{selectedActivity.name}</div>
                </div>
                <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={saveAttendance} disabled={saving}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
                </button>
              </div>

              <div className="att-stats">
                <div className="att-stat" style={{ background: 'var(--green-soft)' }}>
                  <div>
                    <div className="att-stat-n" style={{ color: 'var(--green-text)' }}>{presentCount}</div>
                    <div className="att-stat-l" style={{ color: 'var(--green-text)' }}>Present</div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="att-stat" style={{ background: 'var(--red-soft)' }}>
                  <div>
                    <div className="att-stat-n" style={{ color: 'var(--red-text)' }}>{absentCount}</div>
                    <div className="att-stat-l" style={{ color: 'var(--red-text)' }}>Absent</div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <div className="att-stat" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="att-stat-n" style={{ color: 'var(--text-secondary)' }}>{learners.length}</div>
                    <div className="att-stat-l" style={{ color: 'var(--text-muted)' }}>Total</div>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
              </div>

              <div className="mark-row">
                <span className="mark-label">Mark all:</span>
                <button className="mark-btn" style={{ background: 'var(--green-soft)', color: 'var(--green-text)' }}
                  onClick={() => { const m: StatusMap = {}; learners.forEach(l => { m[l.id] = 'present' }); setStatusMap(m); setSaved(false) }}>
                  All Present
                </button>
                <button className="mark-btn" style={{ background: 'var(--red-soft)', color: 'var(--red-text)' }}
                  onClick={() => { const m: StatusMap = {}; learners.forEach(l => { m[l.id] = 'absent' }); setStatusMap(m); setSaved(false) }}>
                  All Absent
                </button>
              </div>

              <div className="search-wrap">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input className="search-input" placeholder="Search learners..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)} />
              </div>

              <div className="learner-grid">
                {filteredLearners.map(l => {
                  const isPresent = statusMap[l.id] === 'present'
                  return (
                    <div key={l.id} className={`learner-item ${isPresent ? 'present' : 'absent'}`}
                      onClick={() => { setStatusMap(prev => ({ ...prev, [l.id]: isPresent ? 'absent' : 'present' })); setSaved(false) }}>
                      <span className="learner-name-text">{l.full_name}</span>
                      <div className={`learner-toggle ${isPresent ? 'present' : 'absent'}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── CLEANING (location list) ── */}
          {activeTab === 'cleaning' && !selectedLocation && (
            <div>
              <div className="section-head">
                <div className="section-title">Cleaning</div>
                <div className="section-sub">Select a location to log today&rsquo;s cleaning</div>
              </div>

              {cleaningSummary.length > 0 && (
                <div className="clean-summary-row">
                  <div className="clean-sum-card">
                    <div className="clean-sum-n" style={{ color: 'var(--green)' }}>{cleaningDone}</div>
                    <div className="clean-sum-l">Completed</div>
                  </div>
                  <div className="clean-sum-card">
                    <div className="clean-sum-n" style={{ color: 'var(--amber)' }}>{cleaningSummary.filter(s => s.marked > 0 && s.pct < 100).length}</div>
                    <div className="clean-sum-l">Partial</div>
                  </div>
                  <div className="clean-sum-card">
                    <div className="clean-sum-n" style={{ color: 'var(--text-muted)' }}>{cleaningPending}</div>
                    <div className="clean-sum-l">Pending</div>
                  </div>
                </div>
              )}

              {locations.length === 0 ? (
                <div className="empty">No locations added</div>
              ) : (
                floors.map(floor => (
                  <div key={floor}>
                    <div className="floor-label">{floor}</div>
                    <div className="card" style={{ marginBottom: 14 }}>
                      {locations.filter(l => (l.floor || 'General') === floor).map(loc => {
                        const s = cleaningSummary.find(x => x.location.id === loc.id)
                        return (
                          <div key={loc.id} className="loc-row" onClick={() => selectLocation(loc)}>
                            <div>
                              <div className="loc-name">{loc.name}</div>
                              <div className="loc-meta">{s ? `${s.total} tasks` : ''}{s?.marked ? ` · ${s.done} done` : ' · Not checked'}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {!s || s.marked === 0
                                ? <span className="status-pill" style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Pending</span>
                                : s.pct === 100
                                  ? <span className="status-pill" style={{ background: 'var(--green-soft)', color: 'var(--green-text)' }}>✓ Done</span>
                                  : <span className="status-pill" style={{ background: 'var(--amber-soft)', color: 'var(--amber-text)' }}>{s.pct}%</span>
                              }
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── CLEANING (checklist) ── */}
          {activeTab === 'cleaning' && selectedLocation && (
            <div>
              <div className="cleaning-head">
                <div>
                  <button className="att-back" onClick={() => { setSelectedLocation(null); setCleaningSaved(false) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                  </button>
                  <div className="att-title">{selectedLocation.name}</div>
                </div>
                <button className={`save-btn ${cleaningSaved ? 'saved' : ''}`} onClick={saveCleaning} disabled={cleaningSaving}>
                  {cleaningSaving ? 'Saving...' : cleaningSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>

              {cleaningAssignees.length > 0 && (
                <div className="assignee-row">
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Assigned:</span>
                  {cleaningAssignees.map((l: any) => (
                    <span key={l.id} className="assignee-chip">{l.full_name}</span>
                  ))}
                </div>
              )}

              <div className="mark-all-row">
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Mark all:</span>
                {CS.map(s => (
                  <button key={s.key} className="mark-btn"
                    style={{ background: s.light, color: s.text }}
                    onClick={() => { const m: any = {}; cleaningItems.forEach(i => { m[i.id] = s.key }); setCleaningStatus(m); setCleaningSaved(false) }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {cleaningItems.length === 0 ? (
                <div className="empty">No tasks for this location</div>
              ) : (
                cleaningItems.map(item => {
                  const status = cleaningStatus[item.id] || 'not_done'
                  return (
                    <div key={item.id} className={`clean-item ${status}`}>
                      <div className="clean-item-row">
                        <div className="clean-item-q">{item.question}</div>
                        <div className="clean-btns">
                          {CS.map(s => (
                            <button key={s.key} className="clean-btn"
                              onClick={() => { setCleaningStatus(prev => ({ ...prev, [item.id]: s.key as any })); setCleaningSaved(false) }}
                              style={{ background: status === s.key ? s.bg : 'var(--surface-raised)', color: status === s.key ? 'white' : 'var(--text-muted)', borderColor: status === s.key ? s.bg : 'var(--border)' }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input className="note-input" value={cleaningNotes[item.id] || ''}
                        onChange={e => { setCleaningNotes(prev => ({ ...prev, [item.id]: e.target.value })); setCleaningSaved(false) }}
                        placeholder="Add a note..." />
                    </div>
                  )
                })
              )}
            </div>
          )}

        </div>
      </div>

      {/* Mobile bottom navigation */}
      <div className="bottom-nav">
        <div className="bottom-nav-inner">
          {tabs.map(tab => (
            <button key={tab.key} className={`bnav-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => navigateTab(tab.key)}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}