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
    { key: 'done', label: 'Done', bg: '#22C55E', light: '#F0FDF4', text: '#15803D' },
    { key: 'partial', label: 'Partial', bg: '#EAB308', light: '#FEFCE8', text: '#A16207' },
    { key: 'not_done', label: 'Not done', bg: '#EF4444', light: '#FEF2F2', text: '#B91C1C' },
  ]

  const cleaningDone = cleaningSummary.filter(s => s.marked > 0 && s.pct === 100).length
  const cleaningPending = cleaningSummary.filter(s => s.marked === 0).length
  const salaahMarkedToday = todaySummary.filter(s => s.marked).length

  const tabs = [
    {
      key: 'dashboard', label: 'Dashboard',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
    },
    {
      key: 'attendance', label: 'Attendance',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
    },
    {
      key: 'cleaning', label: 'Cleaning',
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v4H3z"/><path d="M3 7l2 14h14l2-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
    },
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#F4F3F0', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }

        /* ── Topbar ── */
        .topbar {
          background: #fff;
          border-bottom: 1px solid #EBEBEA;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .brand { font-size: 14px; font-weight: 600; color: #1A1A1A; display: flex; align-items: center; gap: 8px; letter-spacing: -0.2px; }
        .brand-dot { width: 7px; height: 7px; background: #22C55E; border-radius: 50%; }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .user-chip { font-size: 12px; color: #666; background: #F5F5F3; padding: 5px 12px; border-radius: 20px; }
        .logout-btn { font-size: 12px; color: #999; background: none; border: none; cursor: pointer; padding: 5px 10px; border-radius: 8px; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .logout-btn:hover { background: #FEE2E2; color: #DC2626; }

        /* ── Layout ── */
        .shell { display: flex; min-height: calc(100vh - 52px); }

        /* ── Sidebar ── */
        .sidebar {
          width: 200px;
          flex-shrink: 0;
          background: #fff;
          border-right: 1px solid #EBEBEA;
          padding: 20px 12px;
          position: sticky;
          top: 52px;
          height: calc(100vh - 52px);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sidebar-date {
          font-size: 11px;
          color: #AAA;
          padding: 4px 10px 14px;
          line-height: 1.5;
          border-bottom: 1px solid #F0F0EE;
          margin-bottom: 10px;
        }
        .sidebar-date strong { display: block; font-size: 13px; color: #555; font-weight: 500; }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 9px 10px;
          border: none;
          background: none;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: #777;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
          text-align: left;
        }
        .nav-btn:hover { background: #F5F5F3; color: #333; }
        .nav-btn.active { background: #1A1A1A; color: #fff; }
        .nav-btn.active svg { stroke: #fff; }

        /* ── Content area ── */
        .content { flex: 1; padding: 24px 28px; max-width: 900px; }

        /* ── Section header ── */
        .section-head { margin-bottom: 18px; }
        .section-title { font-size: 17px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.3px; }
        .section-sub { font-size: 12px; color: #AAA; margin-top: 3px; }

        /* ── Stats row ── */
        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .stat-card { background: #fff; border: 1px solid #EBEBEA; border-radius: 12px; padding: 16px 18px; }
        .stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .stat-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .stat-n { font-size: 26px; font-weight: 600; color: #1A1A1A; line-height: 1; letter-spacing: -1px; }
        .stat-l { font-size: 11px; color: #AAA; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }

        /* ── Dashboard grid ── */
        .dash-grid { display: grid; grid-template-columns: 1fr 300px; gap: 14px; }

        /* ── Card ── */
        .card { background: #fff; border: 1px solid #EBEBEA; border-radius: 13px; overflow: hidden; margin-bottom: 12px; }
        .card:last-child { margin-bottom: 0; }
        .card-head { padding: 13px 18px; border-bottom: 1px solid #F5F5F3; display: flex; align-items: center; justify-content: space-between; }
        .card-title { font-size: 13px; font-weight: 600; color: #1A1A1A; }
        .card-link { font-size: 11px; color: #0369A1; background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; padding: 0; }
        .card-link:hover { text-decoration: underline; }

        /* ── Prayer pills ── */
        .prayer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; padding: 14px; }
        .prayer-pill {
          border: 1.5px solid #EBEBEA;
          border-radius: 11px;
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
          background: #FAFAF8;
        }
        .prayer-pill:hover { background: #F0F0EE; }
        .prayer-pill.marked { border-color: #BBF7D0; background: #F0FDF4; }
        .prayer-pill.unmarked { border-color: #EBEBEA; }
        .prayer-name { font-size: 10px; color: #AAA; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .prayer-pct { font-size: 20px; font-weight: 600; line-height: 1; }
        .prayer-sub { font-size: 10px; color: #AAA; margin-top: 4px; }

        /* ── Weekly chart ── */
        .week-chart { display: flex; align-items: flex-end; gap: 6px; padding: 16px 18px; height: 100px; }
        .week-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
        .week-track { width: 100%; flex: 1; background: #F0F0EE; border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; }
        .week-fill { width: 100%; border-radius: 4px; transition: height 0.3s; }
        .week-day { font-size: 9px; color: #AAA; text-transform: uppercase; }
        .week-pct { font-size: 9px; font-weight: 600; }

        /* ── Cleaning location cards ── */
        .loc-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 18px; border-bottom: 1px solid #F8F8F6; cursor: pointer; transition: background 0.1s; }
        .loc-row:last-child { border-bottom: none; }
        .loc-row:hover { background: #FAFAF8; }
        .loc-name { font-size: 13px; font-weight: 500; color: #1A1A1A; }
        .loc-meta { font-size: 11px; color: #AAA; margin-top: 2px; }
        .status-pill { font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 10px; letter-spacing: 0.02em; }
        .floor-label { font-size: 10px; font-weight: 600; color: #AAA; text-transform: uppercase; letter-spacing: 0.07em; margin: 16px 0 8px; }
        .floor-label:first-child { margin-top: 0; }

        /* ── Activity picker ── */
        .act-section-label { font-size: 10px; font-weight: 600; color: #AAA; text-transform: uppercase; letter-spacing: 0.07em; margin: 16px 0 8px; }
        .act-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .act-pill {
          padding: 9px 18px;
          border-radius: 22px;
          border: 1.5px solid #EBEBEA;
          background: #fff;
          font-size: 13px;
          font-weight: 500;
          color: #1A1A1A;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
        }
        .act-pill:hover { background: #F5F5F3; border-color: #DDD; }
        .act-pill.salaah { background: #F0FDF4; color: #15803D; border-color: #BBF7D0; }
        .act-pill.salaah:hover { background: #DCFCE7; }
        .act-pill.meal { background: #EFF6FF; color: #1D4ED8; border-color: #BFDBFE; }
        .act-pill.meal:hover { background: #DBEAFE; }
        .act-pill.other { background: #FDF4FF; color: #7E22CE; border-color: #E9D5FF; }
        .act-pill.other:hover { background: #F3E8FF; }

        /* ── Attendance marking ── */
        .att-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .att-back { font-size: 13px; color: #999; background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 5px; padding: 6px 0; }
        .att-back:hover { color: #333; }
        .att-title { font-size: 18px; font-weight: 600; color: #1A1A1A; letter-spacing: -0.3px; margin-top: 2px; }
        .save-btn { background: #1A1A1A; color: white; border: none; border-radius: 9px; padding: 9px 20px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .save-btn:hover:not(:disabled) { background: #333; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .save-btn.saved { background: #15803D; }

        .att-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
        .att-stat { border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; }
        .att-stat-n { font-size: 22px; font-weight: 600; line-height: 1; }
        .att-stat-l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; font-weight: 500; }

        .mark-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .mark-label { font-size: 11px; color: #AAA; font-weight: 500; }
        .mark-btn { font-size: 11px; padding: 6px 13px; border-radius: 8px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-weight: 600; transition: all 0.15s; }

        .learner-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; }
        .learner-item {
          background: #fff;
          border: 1.5px solid #EBEBEA;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.1s;
          user-select: none;
        }
        .learner-item:hover { border-color: #DDD; background: #FAFAF8; }
        .learner-item.present { border-color: #86EFAC; background: #F0FDF4; }
        .learner-name-text { font-size: 12px; font-weight: 500; color: #1A1A1A; flex: 1; line-height: 1.3; }
        .learner-item.present .learner-name-text { color: #15803D; }
        .learner-toggle {
          width: 56px;
          height: 26px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          font-size: 10px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          flex-shrink: 0;
          margin-left: 8px;
          transition: all 0.15s;
        }
        .learner-toggle.present { background: #22C55E; color: white; }
        .learner-toggle.absent { background: #F0F0EE; color: #AAA; }

        /* ── Cleaning checklist ── */
        .cleaning-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
        .clean-summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
        .clean-sum-card { background: #fff; border: 1px solid #EBEBEA; border-radius: 10px; padding: 12px; text-align: center; }
        .clean-sum-n { font-size: 20px; font-weight: 600; }
        .clean-sum-l { font-size: 9px; color: #AAA; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 3px; }
        .assignee-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
        .assignee-chip { font-size: 11px; background: #EFF6FF; color: #0369A1; border: 1px solid #BFDBFE; padding: 3px 9px; border-radius: 8px; font-weight: 500; }
        .mark-all-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 10px 14px; background: #F8F8F6; border-radius: 10px; }
        .clean-item { background: #fff; border: 1.5px solid #EBEBEA; border-radius: 11px; padding: 14px 16px; margin-bottom: 7px; transition: border-color 0.15s; }
        .clean-item.done { border-color: #86EFAC; }
        .clean-item.partial { border-color: #FDE68A; }
        .clean-item-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .clean-item-q { font-size: 13px; font-weight: 500; color: #1A1A1A; flex: 1; }
        .clean-btns { display: flex; gap: 5px; flex-shrink: 0; }
        .clean-btn { padding: 6px 11px; border-radius: 8px; border: 1.5px solid transparent; cursor: pointer; font-size: 11px; font-weight: 600; font-family: 'DM Sans', sans-serif; transition: all 0.1s; }
        .note-input { width: 100%; height: 32px; border: 1px solid #EBEBEA; border-radius: 8px; padding: 0 10px; font-size: 12px; font-family: 'DM Sans', sans-serif; color: #555; background: #FAFAF8; outline: none; margin-top: 10px; }
        .note-input:focus { border-color: #1A1A1A; background: #fff; }
        .note-input::placeholder { color: #CCC; }

        .empty { padding: 36px; text-align: center; color: #CCC; font-size: 13px; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .content { padding: 16px; }
          .dash-grid { grid-template-columns: 1fr; }
          .learner-grid { grid-template-columns: 1fr 1fr; }
          .stats-row { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="brand">
          <div className="brand-dot" />
          Baskan · {baskanName.split(' ')[0]}
        </div>
        <div className="topbar-right">
          <span className="user-chip">{todayFormatted}</span>
          <button className="logout-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>Sign out</button>
        </div>
      </div>

      <div className="shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-date">
            <strong>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</strong>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`nav-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.key); setSelectedActivity(null); setSelectedLocation(null) }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <div className="content">

          {/* ── DASHBOARD ─────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="section-head">
                <div className="section-title">Overview</div>
                <div className="section-sub">Today's activity summary</div>
              </div>

              {/* Top stats */}
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon" style={{ background: '#F0FDF4' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    </div>
                  </div>
                  <div className="stat-n">{learners.length}</div>
                  <div className="stat-l">Learners</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon" style={{ background: '#FFF7ED' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                  </div>
                  <div className="stat-n">{salaahMarkedToday}<span style={{ fontSize: 14, color: '#AAA', fontWeight: 400 }}>/{salaahActs.length}</span></div>
                  <div className="stat-l">Prayers marked</div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <div className="stat-icon" style={{ background: '#EFF6FF' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  </div>
                  <div className="stat-n">{cleaningDone}<span style={{ fontSize: 14, color: '#AAA', fontWeight: 400 }}>/{cleaningSummary.length}</span></div>
                  <div className="stat-l">Cleaning done</div>
                </div>
              </div>

              {/* Two-column grid */}
              <div className="dash-grid">
                {/* Left column */}
                <div>
                  {/* Prayer attendance */}
                  <div className="card">
                    <div className="card-head">
                      <span className="card-title">Today's Prayers</span>
                      <button className="card-link" onClick={() => { setActiveTab('attendance'); setSelectedActivity(null) }}>Mark attendance →</button>
                    </div>
                    {salaahActs.length === 0 ? (
                      <div className="empty">No prayer activities configured</div>
                    ) : (
                      <div className="prayer-grid">
                        {(todaySummary.length > 0 ? todaySummary : salaahActs.map(a => ({ name: a.name, id: a.id, pct: 0, present: 0, total: learners.length, marked: false }))).map(s => (
                          <div
                            key={s.id}
                            className={`prayer-pill ${s.marked ? 'marked' : 'unmarked'}`}
                            onClick={() => { const a = activities.find(x => x.id === s.id); if (a) { setActiveTab('attendance'); selectActivity(a) } }}
                          >
                            <div className="prayer-name">{s.name}</div>
                            <div className="prayer-pct" style={{ color: s.marked ? (s.pct >= 70 ? '#15803D' : '#DC2626') : '#CCC' }}>
                              {s.marked ? `${s.pct}%` : '—'}
                            </div>
                            <div className="prayer-sub">{s.marked ? `${s.present}/${s.total}` : 'Not marked'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Weekly chart */}
                  <div className="card">
                    <div className="card-head"><span className="card-title">7-Day Prayer Attendance</span></div>
                    <div className="week-chart">
                      {weeklyData.map((d, i) => (
                        <div key={i} className="week-col">
                          <span className="week-pct" style={{ color: d.hasData ? (d.pct >= 70 ? '#15803D' : '#EF4444') : '#CCC' }}>
                            {d.hasData ? `${d.pct}%` : '—'}
                          </span>
                          <div className="week-track">
                            <div className="week-fill" style={{ height: `${d.hasData ? Math.max(d.pct, 5) : 5}%`, background: d.hasData ? (d.pct >= 70 ? '#22C55E' : '#EF4444') : '#E5E5E5' }} />
                          </div>
                          <span className="week-day">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right column */}
                <div>
                  {/* Cleaning summary */}
                  <div className="card">
                    <div className="card-head">
                      <span className="card-title">Today's Cleaning</span>
                      <button className="card-link" onClick={() => { setActiveTab('cleaning'); setSelectedLocation(null) }}>Go to cleaning →</button>
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
                            ? <span className="status-pill" style={{ background: '#F5F5F3', color: '#AAA' }}>Pending</span>
                            : s.pct === 100
                              ? <span className="status-pill" style={{ background: '#F0FDF4', color: '#15803D' }}>✓ Done</span>
                              : <span className="status-pill" style={{ background: '#FFFBEB', color: '#D97706' }}>{s.done}/{s.total}</span>
                          }
                        </div>
                      ))
                    )}
                  </div>

                  {/* Meals / other quick actions */}
                  {(mealActs.length > 0 || otherActs.length > 0) && (
                    <div className="card">
                      <div className="card-head"><span className="card-title">Other Activities</span></div>
                      <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {[...mealActs, ...otherActs].map(a => (
                          <button key={a.id} className={`act-pill ${mealActs.includes(a) ? 'meal' : 'other'}`}
                            onClick={() => { setActiveTab('attendance'); selectActivity(a) }} style={{ fontSize: 12, padding: '6px 13px' }}>
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

          {/* ── ATTENDANCE (picker) ─────────────────────── */}
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
                    {salaahActs.map(a => (
                      <button key={a.id} className="act-pill salaah" onClick={() => selectActivity(a)}>{a.name}</button>
                    ))}
                  </div>
                </>
              )}
              {mealActs.length > 0 && (
                <>
                  <div className="act-section-label">Meals</div>
                  <div className="act-pills">
                    {mealActs.map(a => (
                      <button key={a.id} className="act-pill meal" onClick={() => selectActivity(a)}>{a.name}</button>
                    ))}
                  </div>
                </>
              )}
              {otherActs.length > 0 && (
                <>
                  <div className="act-section-label">Other</div>
                  <div className="act-pills">
                    {otherActs.map(a => (
                      <button key={a.id} className="act-pill other" onClick={() => selectActivity(a)}>{a.name}</button>
                    ))}
                  </div>
                </>
              )}
              {activities.length === 0 && <div className="empty">No activities configured</div>}
            </div>
          )}

          {/* ── ATTENDANCE (marking) ────────────────────── */}
          {activeTab === 'attendance' && selectedActivity && (
            <div>
              <div className="att-header">
                <div>
                  <button className="att-back" onClick={() => { setSelectedActivity(null); setSaved(false) }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                  </button>
                  <div className="att-title">{selectedActivity.name}</div>
                </div>
                <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={saveAttendance} disabled={saving}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save'}
                </button>
              </div>

              <div className="att-stats">
                <div className="att-stat" style={{ background: '#F0FDF4' }}>
                  <div>
                    <div className="att-stat-n" style={{ color: '#15803D' }}>{presentCount}</div>
                    <div className="att-stat-l" style={{ color: '#15803D' }}>Present</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="att-stat" style={{ background: '#FEF2F2' }}>
                  <div>
                    <div className="att-stat-n" style={{ color: '#B91C1C' }}>{absentCount}</div>
                    <div className="att-stat-l" style={{ color: '#B91C1C' }}>Absent</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <div className="att-stat" style={{ background: '#F5F5F3' }}>
                  <div>
                    <div className="att-stat-n" style={{ color: '#555' }}>{learners.length}</div>
                    <div className="att-stat-l" style={{ color: '#888' }}>Total</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
              </div>

              <div className="mark-row">
                <span className="mark-label">Mark all:</span>
                <button className="mark-btn" style={{ background: '#F0FDF4', color: '#15803D' }}
                  onClick={() => { const m: StatusMap = {}; learners.forEach(l => { m[l.id] = 'present' }); setStatusMap(m); setSaved(false) }}>
                  All Present
                </button>
                <button className="mark-btn" style={{ background: '#FEF2F2', color: '#B91C1C' }}
                  onClick={() => { const m: StatusMap = {}; learners.forEach(l => { m[l.id] = 'absent' }); setStatusMap(m); setSaved(false) }}>
                  All Absent
                </button>
              </div>

              <div className="learner-grid">
                {learners.map(l => {
                  const isPresent = statusMap[l.id] === 'present'
                  return (
                    <div key={l.id} className={`learner-item ${isPresent ? 'present' : 'absent'}`}
                      onClick={() => { setStatusMap(prev => ({ ...prev, [l.id]: isPresent ? 'absent' : 'present' })); setSaved(false) }}>
                      <span className="learner-name-text">{l.full_name}</span>
                      <button className={`learner-toggle ${isPresent ? 'present' : 'absent'}`}>
                        {isPresent ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── CLEANING (location list) ─────────────────── */}
          {activeTab === 'cleaning' && !selectedLocation && (
            <div>
              <div className="section-head">
                <div className="section-title">Cleaning</div>
                <div className="section-sub">Select a location to log today's cleaning</div>
              </div>

              {cleaningSummary.length > 0 && (
                <div className="clean-summary-row">
                  <div className="clean-sum-card">
                    <div className="clean-sum-n" style={{ color: '#15803D' }}>{cleaningDone}</div>
                    <div className="clean-sum-l">Completed</div>
                  </div>
                  <div className="clean-sum-card">
                    <div className="clean-sum-n" style={{ color: '#D97706' }}>{cleaningSummary.filter(s => s.marked > 0 && s.pct < 100).length}</div>
                    <div className="clean-sum-l">Partial</div>
                  </div>
                  <div className="clean-sum-card">
                    <div className="clean-sum-n" style={{ color: '#AAA' }}>{cleaningPending}</div>
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
                    <div className="card" style={{ marginBottom: 12 }}>
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
                                ? <span className="status-pill" style={{ background: '#F5F5F3', color: '#AAA' }}>Pending</span>
                                : s.pct === 100
                                  ? <span className="status-pill" style={{ background: '#F0FDF4', color: '#15803D' }}>✓ Done</span>
                                  : <span className="status-pill" style={{ background: '#FFFBEB', color: '#D97706' }}>{s.pct}%</span>
                              }
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
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

          {/* ── CLEANING (checklist) ─────────────────────── */}
          {activeTab === 'cleaning' && selectedLocation && (
            <div>
              <div className="cleaning-head">
                <div>
                  <button className="att-back" onClick={() => { setSelectedLocation(null); setCleaningSaved(false) }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
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
                  <span style={{ fontSize: 11, color: '#AAA', fontWeight: 500 }}>Assigned:</span>
                  {cleaningAssignees.map((l: any) => (
                    <span key={l.id} className="assignee-chip">{l.full_name}</span>
                  ))}
                </div>
              )}

              <div className="mark-all-row">
                <span style={{ fontSize: 11, color: '#AAA', fontWeight: 500 }}>Mark all:</span>
                {CS.map(s => (
                  <button key={s.key} className="mark-btn"
                    style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 600, background: s.light, color: s.text }}
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
                              style={{ background: status === s.key ? s.bg : '#F5F5F3', color: status === s.key ? 'white' : '#AAA', borderColor: status === s.key ? s.bg : 'transparent' }}>
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
    </main>
  )
}
