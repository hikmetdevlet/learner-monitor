'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

type Year = {
  id: string; name: string; start_date: string; end_date: string
  is_active: boolean; is_archived: boolean; created_at: string
  total_learners?: number; active?: number; transferred?: number
  retained?: number; graduated?: number; withdrawn?: number; completed?: number
}
type Enrollment = {
  id: string; learner_id: string; class_id: string
  enrollment_status: string; year_end_note: string | null
  learner_name: string; class_name: string; class_type: string
}
type Transfer = {
  id: string; learner_id: string; learner_name: string
  transfer_type: string; destination_name: string | null
  destination_city: string | null; notes: string | null
  transfer_date: string; from_class_name: string | null
}

const STATUS_OPTIONS = [
  { key: 'active',      label: 'Aktif',           color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
  { key: 'completed',   label: 'Tamamladı',        color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'retained',    label: 'Sınıfta Kaldı',    color: '#A16207', bg: '#FEFCE8', border: '#FDE68A' },
  { key: 'transferred', label: 'Transfer',         color: '#7E22CE', bg: '#FDF4FF', border: '#E9D5FF' },
  { key: 'graduated',   label: 'Mezun',            color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
  { key: 'withdrawn',   label: 'Ayrıldı',          color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
]
const TRANSFER_TYPES = [
  { key: 'school',    label: 'Başka Okul' },
  { key: 'course',    label: 'Kurs / Vakıf' },
  { key: 'program',   label: 'Başka Program' },
  { key: 'graduated', label: 'Mezun Oldu' },
  { key: 'withdrawn', label: 'Kendi İsteğiyle' },
  { key: 'other',     label: 'Diğer' },
]

// ── SVG Icons ─────────────────────────────────────────────────
const SVG = {
  back: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  search: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  users: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  transfer: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  calendar: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  archive: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  chart: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  overview: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  arrow: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  warn: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  move: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l3 3 3-3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/><path d="M12 2v20"/></svg>,
  person: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  plus: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  info: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
}

function statusCfg(key: string) { return STATUS_OPTIONS.find(s => s.key === key) || STATUS_OPTIONS[0] }
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtShort(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const TAB_LIST = [
  { k: 'overview',  l: 'Genel Bakış',    icon: SVG.overview },
  { k: 'learners',  l: 'Öğrenciler',     icon: SVG.users },
  { k: 'migrate',   l: 'Yıl Nakli',      icon: SVG.move },
  { k: 'transfers', l: 'Transferler',    icon: SVG.transfer },
  { k: 'new-year',  l: 'Yıl Yönetimi',  icon: SVG.calendar },
  { k: 'archive',   l: 'Arşiv',          icon: SVG.archive },
  { k: 'compare',   l: 'Karşılaştır',   icon: SVG.chart },
]

export default function AcademicYearPage() {
  const router = useRouter()

  const [loading, setLoading]           = useState(true)
  const [years, setYears]               = useState<Year[]>([])
  const [activeYear, setActiveYear]     = useState<Year | null>(null)
  const [selectedYear, setSelectedYear] = useState<Year | null>(null)
  const [tab, setTab]                   = useState<string>('overview')

  // Enrollments
  const [enrollments, setEnrollments]     = useState<Enrollment[]>([])
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [statusFilter, setStatusFilter]   = useState('all')
  const [classFilter, setClassFilter]     = useState('all')
  const [searchQuery, setSearchQuery]     = useState('')
  const [bulkMode, setBulkMode]           = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus]       = useState('completed')

  // Transfers
  const [transfers, setTransfers]         = useState<Transfer[]>([])
  const [transfersLoading, setTransfersLoading] = useState(false)
  const [transferModal, setTransferModal] = useState<Enrollment | null>(null)
  const [tType, setTType]   = useState('school')
  const [tDest, setTDest]   = useState('')
  const [tCity, setTCity]   = useState('')
  const [tNote, setTNote]   = useState('')
  const [tDate, setTDate]   = useState(new Date().toISOString().split('T')[0])
  const [tSaving, setTSaving] = useState(false)

  // ── YIL NAKLİ (migrate) ──
  const [migrateFromYear, setMigrateFromYear] = useState('')
  const [migrateToYear, setMigrateToYear]     = useState('')
  const [migrateEnrollments, setMigrateEnrollments] = useState<Enrollment[]>([])
  const [migrateLoading, setMigrateLoading]   = useState(false)
  const [migrateSelected, setMigrateSelected] = useState<Set<string>>(new Set())
  const [migrateStatusFilter, setMigrateStatusFilter] = useState('active')
  const [migrating, setMigrating]             = useState(false)
  const [migrateResult, setMigrateResult]     = useState<string | null>(null)

  // New year
  const [newName, setNewName]   = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd]     = useState('')
  const [archiving, setArchiving]         = useState(false)
  const [archiveResult, setArchiveResult] = useState<string | null>(null)

  // Compare
  const [cmpA, setCmpA]         = useState('')
  const [cmpB, setCmpB]         = useState('')
  const [cmpData, setCmpData]   = useState<any>(null)
  const [cmpLoading, setCmpLoading] = useState(false)

  // Att stats
  const [attStats, setAttStats] = useState<any[]>([])

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: u } = await supabase.from('users').select('role').eq('auth_id', user.id).single()
    if (u?.role !== 'admin') { router.push('/'); return }
    await loadYears()
    setLoading(false)
  }

  async function loadYears() {
    // Try view first
    const { data: vd, error: ve } = await supabase
      .from('vw_year_summary').select('*').order('start_date', { ascending: false })

    if (!ve && vd?.length) {
      setYears(vd)
      const active = vd.find((y: Year) => y.is_active) || null
      setActiveYear(active)
      if (!selectedYear) setSelectedYear(active)
    } else {
      // Fallback: raw table
      const { data: raw } = await supabase
        .from('academic_years').select('*').order('start_date', { ascending: false })
      setYears(raw || [])
      const active = (raw || []).find((y: any) => y.is_active) || null
      setActiveYear(active)
      if (!selectedYear) setSelectedYear(active)
    }
  }

  // ── Data loaders ──────────────────────────────────────────────
  async function loadEnrollments(yearId: string) {
    setEnrollLoading(true)
    const { data } = await supabase
      .from('learner_classes')
      .select('id, learner_id, class_id, enrollment_status, year_end_note, class_type, learners(full_name), classes(name, class_type)')
      .eq('academic_year_id', yearId)
    setEnrollments((data || []).map((r: any) => ({
      id: r.id, learner_id: r.learner_id, class_id: r.class_id,
      enrollment_status: r.enrollment_status || 'active',
      year_end_note: r.year_end_note,
      learner_name: r.learners?.full_name || '—',
      class_name: r.classes?.name || '—',
      class_type: r.classes?.class_type || r.class_type || '',
    })))
    setEnrollLoading(false)
  }

  async function loadTransfers(yearId: string) {
    setTransfersLoading(true)
    const { data } = await supabase
      .from('learner_transfers')
      .select('*, learners(full_name), classes(name)')
      .eq('academic_year_id', yearId)
      .order('transfer_date', { ascending: false })
    setTransfers((data || []).map((r: any) => ({
      id: r.id, learner_id: r.learner_id,
      learner_name: r.learners?.full_name || '—',
      transfer_type: r.transfer_type,
      destination_name: r.destination_name,
      destination_city: r.destination_city,
      notes: r.notes,
      transfer_date: r.transfer_date,
      from_class_name: r.classes?.name || null,
    })))
    setTransfersLoading(false)
  }

  async function loadAttStats(yearId: string) {
    const yr = years.find(y => y.id === yearId)
    if (!yr) return
    const { data } = await supabase
      .from('vw_attendance_by_year').select('*').eq('year_name', yr.name)
    setAttStats(data || [])
  }

  // ── YIL NAKLİ ────────────────────────────────────────────────
  async function loadMigrateEnrollments(yearId: string) {
    if (!yearId) return
    setMigrateLoading(true)
    const { data } = await supabase
      .from('learner_classes')
      .select('id, learner_id, class_id, enrollment_status, class_type, learners(full_name), classes(name)')
      .eq('academic_year_id', yearId)
    setMigrateEnrollments((data || []).map((r: any) => ({
      id: r.id, learner_id: r.learner_id, class_id: r.class_id,
      enrollment_status: r.enrollment_status || 'active',
      year_end_note: null,
      learner_name: r.learners?.full_name || '—',
      class_name: r.classes?.name || '—',
      class_type: r.class_type || '',
    })))
    setMigrateLoading(false)
  }

  async function doMigrate() {
    if (!migrateFromYear || !migrateToYear || migrateSelected.size === 0) return
    setMigrating(true)

    const toMigrate = migrateEnrollments.filter(e => migrateSelected.has(e.id))
    let moved = 0
    let skipped = 0

    for (const e of toMigrate) {
      // Check if already exists in target year
      const { data: exists } = await supabase
        .from('learner_classes')
        .select('id')
        .eq('learner_id', e.learner_id)
        .eq('academic_year_id', migrateToYear)
        .eq('class_id', e.class_id)
        .maybeSingle()

      if (exists) { skipped++; continue }

      const { error } = await supabase.from('learner_classes').insert({
        learner_id: e.learner_id,
        class_id: e.class_id,
        class_type: e.class_type,
        academic_year_id: migrateToYear,
        enrollment_status: 'active',
      })
      if (!error) moved++
    }

    await loadYears()
    setMigrateSelected(new Set())
    setMigrateResult(`${moved} öğrenci nakledildi${skipped > 0 ? `, ${skipped} öğrenci zaten hedef yılda mevcut (atlandı)` : ''}.`)
    setMigrating(false)
  }

  // ── Tab effect ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedYear) return
    if (tab === 'learners') loadEnrollments(selectedYear.id)
    if (tab === 'transfers') loadTransfers(selectedYear.id)
    if (tab === 'overview') {
      loadEnrollments(selectedYear.id)
      loadAttStats(selectedYear.id)
    }
  }, [tab, selectedYear])

  useEffect(() => {
    if (migrateFromYear) loadMigrateEnrollments(migrateFromYear)
  }, [migrateFromYear])

  // ── Status update ─────────────────────────────────────────────
  async function updateStatus(enrollId: string, learnerId: string, status: string) {
    await supabase.rpc('set_learner_year_status', {
      p_learner_id: learnerId, p_year_id: selectedYear?.id, p_status: status
    })
    setEnrollments(prev => prev.map(e => e.id === enrollId ? { ...e, enrollment_status: status } : e))
    if (status === 'transferred') {
      setTransferModal(enrollments.find(e => e.id === enrollId) || null)
    }
  }

  async function applyBulkStatus() {
    for (const enrollId of selected) {
      const e = enrollments.find(x => x.id === enrollId)
      if (!e) continue
      await supabase.rpc('set_learner_year_status', {
        p_learner_id: e.learner_id, p_year_id: selectedYear?.id, p_status: bulkStatus
      })
    }
    setEnrollments(prev => prev.map(e => selected.has(e.id) ? { ...e, enrollment_status: bulkStatus } : e))
    setSelected(new Set()); setBulkMode(false)
  }

  // ── Transfer save ─────────────────────────────────────────────
  async function saveTransfer() {
    if (!transferModal || !selectedYear) return
    setTSaving(true)
    await supabase.from('learner_transfers').insert({
      learner_id: transferModal.learner_id,
      academic_year_id: selectedYear.id,
      from_class_id: transferModal.class_id,
      transfer_type: tType,
      destination_name: tDest.trim() || null,
      destination_city: tCity.trim() || null,
      notes: tNote.trim() || null,
      transfer_date: tDate,
    })
    await updateStatus(transferModal.id, transferModal.learner_id, 'transferred')
    setTransferModal(null); setTDest(''); setTCity(''); setTNote('')
    setTSaving(false)
    if (tab === 'transfers' && selectedYear) loadTransfers(selectedYear.id)
    await loadYears()
  }

  // ── New year ──────────────────────────────────────────────────
  async function createFirstYear() {
    if (!newName.trim() || !newStart || !newEnd) return
    setArchiving(true)
    const { data, error } = await supabase.from('academic_years')
      .insert({ name: newName.trim(), start_date: newStart, end_date: newEnd, is_active: true })
      .select().single()
    if (error) { alert('Hata: ' + error.message); setArchiving(false); return }
    await supabase.from('settings').upsert({ key: 'active_academic_year_id', value: data.id }, { onConflict: 'key' })
    const tables = ['learner_classes','attendance','activity_attendance','curriculum_progress','curriculum_terms','exams','homework_assignments','notes','learner_islamic_progress','learner_topic_progress','learner_surahs','learner_duas','cleaning_assignments','cleaning_logs','sessions']
    for (const t of tables) {
      await supabase.from(t).update({ academic_year_id: data.id }).is('academic_year_id', null)
    }
    setArchiveResult(`"${data.name}" yılı oluşturuldu.`)
    setNewName(''); setNewStart(''); setNewEnd('')
    await loadYears()
    setArchiving(false)
  }

  async function doArchive() {
    if (!activeYear || !newName.trim() || !newStart || !newEnd) return
    setArchiving(true)
    const { data, error } = await supabase.rpc('archive_academic_year', {
      p_year_id: activeYear.id, p_new_year_name: newName.trim(),
      p_new_start: newStart, p_new_end: newEnd,
    })
    if (error) { alert('Hata: ' + error.message); setArchiving(false); return }
    setArchiveResult(data?.message || 'Tamamlandı.')
    setNewName(''); setNewStart(''); setNewEnd('')
    await loadYears()
    setArchiving(false)
  }

  // ── Compare ───────────────────────────────────────────────────
  async function doCompare() {
    if (!cmpA || !cmpB) return
    setCmpLoading(true)
    const nA = years.find(y => y.id === cmpA)?.name || ''
    const nB = years.find(y => y.id === cmpB)?.name || ''
    const [{ data: att }, { data: curr }] = await Promise.all([
      supabase.from('vw_attendance_by_year').select('*').in('year_name', [nA, nB]),
      supabase.from('vw_curriculum_by_year').select('*').in('year_name', [nA, nB]),
    ])
    setCmpData({
      yearA: years.find(y => y.id === cmpA), yearB: years.find(y => y.id === cmpB),
      attendance: att || [], curriculum: curr || [],
    })
    setCmpLoading(false)
  }

  // ── Derived ───────────────────────────────────────────────────
  const uniqueClasses = useMemo(() =>
    [...new Set(enrollments.map(e => e.class_name))].sort(), [enrollments])

  const filteredEnrollments = useMemo(() => {
    let list = enrollments
    if (statusFilter !== 'all') list = list.filter(e => e.enrollment_status === statusFilter)
    if (classFilter !== 'all') list = list.filter(e => e.class_name === classFilter)
    if (searchQuery.trim()) list = list.filter(e => e.learner_name.toLowerCase().includes(searchQuery.toLowerCase()))
    return list
  }, [enrollments, statusFilter, classFilter, searchQuery])

  const filteredMigrate = useMemo(() => {
    if (migrateStatusFilter === 'all') return migrateEnrollments
    return migrateEnrollments.filter(e => e.enrollment_status === migrateStatusFilter)
  }, [migrateEnrollments, migrateStatusFilter])

  const overviewStats = useMemo(() => {
    const y = selectedYear as any
    if (!y) return []
    const enrMap: Record<string, number> = {}
    enrollments.forEach(e => { enrMap[e.enrollment_status] = (enrMap[e.enrollment_status] || 0) + 1 })
    return [
      { label: 'Toplam',        value: y.total_learners ?? enrollments.length,     color: '#1A1A1A' },
      { label: 'Aktif',         value: y.active ?? (enrMap['active'] || 0),        color: '#15803D' },
      { label: 'Tamamladı',     value: y.completed ?? (enrMap['completed'] || 0),  color: '#1D4ED8' },
      { label: 'Transfer',      value: y.transferred ?? (enrMap['transferred'] || 0), color: '#7E22CE' },
      { label: 'Mezun',         value: y.graduated ?? (enrMap['graduated'] || 0),  color: '#0E7490' },
      { label: 'Sınıfta Kaldı', value: y.retained ?? (enrMap['retained'] || 0),   color: '#A16207' },
      { label: 'Ayrıldı',       value: y.withdrawn ?? (enrMap['withdrawn'] || 0),  color: '#DC2626' },
    ]
  }, [selectedYear, enrollments])

  if (loading) return (
    <main style={{ minHeight:'100vh', background:'#F5F4F0', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'-apple-system,sans-serif', color:'#AAA', fontSize:14 }}>
      Yükleniyor...
    </main>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#F5F4F0', fontFamily:'-apple-system,"Segoe UI",sans-serif' }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }

        /* TOPBAR */
        .topbar { background:#fff; border-bottom:1px solid #E8E8E6; padding:0 28px; height:52px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:30; }
        .back-btn { display:flex; align-items:center; gap:5px; font-size:13px; color:#888; background:none; border:none; cursor:pointer; font-family:inherit; padding:5px 8px; border-radius:7px; transition:all 0.15s; }
        .back-btn:hover { background:#F5F5F3; color:#1A1A1A; }
        .topbar-center { font-size:15px; font-weight:600; color:#1A1A1A; }
        .active-badge { display:inline-flex; align-items:center; gap:6px; background:#FFF7ED; border:1px solid #FED7AA; border-radius:7px; padding:4px 11px; font-size:11px; font-weight:600; color:#C2410C; }

        /* LAYOUT */
        .layout { display:grid; grid-template-columns:210px 1fr; min-height:calc(100vh - 52px); }
        .sidebar { background:#fff; border-right:1px solid #E8E8E6; padding:16px 0; position:sticky; top:52px; height:calc(100vh - 52px); overflow-y:auto; }
        .year-sel-wrap { padding:12px 14px; border-bottom:1px solid #F0F0EE; margin-bottom:8px; }
        .year-sel-label { font-size:10px; font-weight:700; color:#CCC; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; display:block; }
        .year-select { width:100%; height:32px; border:1px solid #E0E0DE; border-radius:8px; padding:0 8px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; cursor:pointer; }
        .year-select:focus { border-color:#1A1A1A; }
        .sidebar-label { font-size:10px; font-weight:700; color:#CCC; text-transform:uppercase; letter-spacing:0.06em; padding:0 14px; margin-bottom:4px; display:block; }
        .tab-btn { width:100%; display:flex; align-items:center; gap:9px; padding:9px 14px; border-radius:0; border:none; background:none; cursor:pointer; font-family:inherit; font-size:13px; color:#666; font-weight:500; transition:all 0.12s; text-align:left; }
        .tab-btn:hover { background:#F8F8F6; color:#1A1A1A; }
        .tab-btn.on { background:#F0F0EE; color:#1A1A1A; font-weight:600; border-right:2px solid #1A1A1A; }
        .tab-btn.on svg { stroke:#1A1A1A; }

        /* MAIN */
        .main { padding:28px 32px; }
        .ph { margin-bottom:22px; }
        .ph-title { font-size:21px; font-weight:600; color:#1A1A1A; letter-spacing:-0.4px; }
        .ph-sub { font-size:12px; color:#AAA; margin-top:3px; }

        /* STAT GRID */
        .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; }
        .stat-card { background:#fff; border:1px solid #E8E8E6; border-radius:11px; padding:16px; }
        .stat-val { font-size:28px; font-weight:600; letter-spacing:-0.5px; line-height:1; margin-bottom:4px; }
        .stat-lbl { font-size:10px; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; }

        /* ATT TABLE */
        .data-table { width:100%; border-collapse:collapse; background:#fff; border-radius:11px; overflow:hidden; border:1px solid #E8E8E6; margin-bottom:20px; }
        .data-table th { padding:9px 14px; text-align:left; font-size:10px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; background:#FAFAF8; border-bottom:1px solid #EFEFED; }
        .data-table td { padding:10px 14px; border-bottom:1px solid #F5F5F3; font-size:13px; color:#1A1A1A; }
        .data-table tr:last-child td { border-bottom:none; }
        .pct-wrap { display:flex; align-items:center; gap:8px; }
        .pct-bar { flex:1; height:4px; background:#F0F0EE; border-radius:2px; overflow:hidden; min-width:60px; }
        .pct-fill { height:100%; border-radius:2px; }
        .pct-num { font-size:12px; font-weight:600; min-width:34px; text-align:right; }

        /* FILTERS */
        .filter-row { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
        .fpill { padding:5px 12px; border-radius:8px; border:1px solid #E8E8E6; background:#fff; font-size:11px; font-weight:500; color:#666; cursor:pointer; font-family:inherit; transition:all 0.12s; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; }
        .fpill:hover { border-color:#AAA; }
        .fpill.on { background:#1A1A1A; color:#fff; border-color:#1A1A1A; }
        .search-wrap { position:relative; flex:1; min-width:160px; max-width:260px; }
        .search-wrap svg { position:absolute; left:9px; top:50%; transform:translateY(-50%); color:#CCC; pointer-events:none; }
        .search-input { width:100%; height:34px; border:1px solid #E8E8E6; border-radius:8px; padding:0 10px 0 30px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; }
        .search-input:focus { border-color:#1A1A1A; }
        .search-input::placeholder { color:#CCC; }
        .fsel { height:34px; border:1px solid #E8E8E6; border-radius:8px; padding:0 8px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; cursor:pointer; }

        /* ENROLL TABLE */
        .et-wrap { background:#fff; border:1px solid #E8E8E6; border-radius:11px; overflow:hidden; }
        .et-head { display:grid; grid-template-columns:28px 1fr 130px 150px 90px; padding:8px 16px; background:#FAFAF8; border-bottom:1px solid #EFEFED; gap:8px; align-items:center; }
        .et-lbl { font-size:10px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; }
        .et-row { display:grid; grid-template-columns:28px 1fr 130px 150px 90px; padding:10px 16px; border-bottom:1px solid #F5F5F3; gap:8px; align-items:center; transition:background 0.1s; }
        .et-row:last-child { border-bottom:none; }
        .et-row:hover { background:#FAFAF8; }
        .l-name { font-size:13px; font-weight:500; color:#1A1A1A; }
        .l-class { font-size:10px; color:#AAA; margin-top:1px; }
        .status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .sstat-sel { height:28px; border:1px solid #E8E8E6; border-radius:7px; padding:0 6px; font-size:11px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; cursor:pointer; width:100%; }
        .tlink { font-size:11px; color:#7E22CE; background:none; border:none; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:4px; text-decoration:underline; }
        .empty { padding:40px; text-align:center; color:#CCC; font-size:13px; }

        /* BULK */
        .bulk-bar { display:flex; align-items:center; gap:8px; background:#1A1A1A; color:#fff; padding:10px 16px; border-radius:10px; margin-bottom:12px; flex-wrap:wrap; }
        .bulk-count { font-size:13px; font-weight:600; }
        .bulk-sel { height:30px; border:1px solid rgba(255,255,255,0.2); border-radius:7px; padding:0 8px; font-size:12px; font-family:inherit; color:#fff; background:rgba(255,255,255,0.1); outline:none; cursor:pointer; }
        .bulk-apply { padding:5px 14px; background:#fff; color:#1A1A1A; border:none; border-radius:7px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:5px; }
        .bulk-cancel { padding:5px 10px; background:none; color:rgba(255,255,255,0.5); border:none; font-size:12px; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:4px; }

        /* MIGRATE */
        .migrate-grid { display:grid; grid-template-columns:1fr auto 1fr; gap:16px; align-items:flex-start; margin-bottom:20px; }
        .migrate-year-box { background:#fff; border:1px solid #E8E8E6; border-radius:11px; padding:16px; }
        .migrate-year-title { font-size:12px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; }
        .migrate-year-name { font-size:15px; font-weight:600; color:#1A1A1A; }
        .migrate-arrow { display:flex; align-items:center; justify-content:center; padding-top:40px; }
        .migrate-list { margin-top:14px; max-height:380px; overflow-y:auto; border:1px solid #E8E8E6; border-radius:9px; background:#fff; }
        .migrate-row { display:flex; align-items:center; gap:10px; padding:9px 12px; border-bottom:1px solid #F5F5F3; transition:background 0.1s; cursor:pointer; }
        .migrate-row:last-child { border-bottom:none; }
        .migrate-row:hover { background:#F8F8F6; }
        .migrate-row.sel { background:#EFF6FF; }
        .sel-all-row { display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid #EFEFED; background:#FAFAF8; }
        .result-box { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:14px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px; font-size:13px; color:#15803D; font-weight:500; }

        /* TRANSFER CARDS */
        .tr-card { background:#fff; border:1px solid #E8E8E6; border-radius:11px; padding:14px 16px; margin-bottom:9px; display:flex; align-items:flex-start; gap:12px; }
        .tr-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#F5F5F3; }
        .tr-name { font-size:13px; font-weight:600; color:#1A1A1A; margin-bottom:2px; }
        .tr-dest { font-size:12px; color:#555; margin-bottom:2px; }
        .tr-meta { font-size:11px; color:#AAA; }

        /* FORMS */
        .form-card { background:#fff; border:1px solid #E8E8E6; border-radius:11px; padding:20px; margin-bottom:16px; }
        .form-card-title { font-size:13px; font-weight:600; color:#1A1A1A; margin-bottom:14px; display:flex; align-items:center; gap:7px; }
        .fl { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:5px; display:block; }
        .fi { width:100%; height:36px; border:1px solid #E8E8E6; border-radius:8px; padding:0 10px; font-size:13px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; }
        .fi:focus { border-color:#1A1A1A; }
        .fi::placeholder { color:#CCC; }
        .fr { margin-bottom:14px; }
        .fr2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
        .info-box { background:#FFF7ED; border:1px solid #FED7AA; border-radius:9px; padding:11px 13px; margin-bottom:14px; font-size:12px; color:#92400E; line-height:1.6; display:flex; align-items:flex-start; gap:8px; }
        .warn-box { background:#FEF2F2; border:1px solid #FCA5A5; border-radius:9px; padding:10px 13px; margin-bottom:14px; font-size:12px; color:#DC2626; display:flex; align-items:flex-start; gap:8px; }
        .success-box { background:#F0FDF4; border:1px solid #BBF7D0; border-radius:9px; padding:12px 14px; margin-bottom:14px; }
        .success-title { font-size:13px; font-weight:600; color:#15803D; margin-bottom:3px; display:flex; align-items:center; gap:6px; }
        .success-msg { font-size:12px; color:#166534; }

        /* BUTTONS */
        .btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; border:none; transition:all 0.15s; }
        .btn-primary { background:#1A1A1A; color:#fff; width:100%; justify-content:center; }
        .btn-primary:hover:not(:disabled) { background:#333; }
        .btn-primary:disabled { opacity:0.4; cursor:not-allowed; }
        .btn-danger { background:#DC2626; color:#fff; width:100%; justify-content:center; }
        .btn-danger:hover:not(:disabled) { background:#B91C1C; }
        .btn-danger:disabled { opacity:0.4; cursor:not-allowed; }
        .btn-secondary { background:#fff; color:#555; border:1px solid #E8E8E6 !important; }
        .btn-secondary:hover { background:#F5F5F3; }
        .btn-ghost { background:none; color:#0369A1; border:none; padding:0; font-size:12px; cursor:pointer; font-family:inherit; display:inline-flex; align-items:center; gap:4px; }
        .btn-ghost:hover { text-decoration:underline; }

        /* ARCHIVE CARDS */
        .arc-card { background:#fff; border:1px solid #E8E8E6; border-radius:11px; padding:16px; margin-bottom:10px; }
        .arc-card.is-active { border-color:#FED7AA; background:#FFFBF5; }
        .arc-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:8px; }
        .arc-name { font-size:14px; font-weight:600; color:#1A1A1A; display:flex; align-items:center; gap:8px; }
        .badge-active { font-size:9px; font-weight:700; background:#D97706; color:#fff; padding:2px 7px; border-radius:5px; text-transform:uppercase; }
        .badge-arch   { font-size:9px; font-weight:600; background:#F0F0EE; color:#AAA; padding:2px 7px; border-radius:5px; text-transform:uppercase; }
        .arc-dates { font-size:11px; color:#AAA; }
        .arc-stats { display:flex; gap:7px; flex-wrap:wrap; margin-top:10px; }
        .mini-s { background:#F8F8F6; border-radius:7px; padding:5px 10px; text-align:center; }
        .mini-n { font-size:15px; font-weight:600; }
        .mini-l { font-size:9px; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; }

        /* COMPARE */
        .cmp-sel { display:grid; grid-template-columns:1fr 50px 1fr; gap:10px; align-items:center; margin-bottom:14px; }
        .cmp-vs { font-size:12px; font-weight:700; color:#CCC; text-align:center; }
        .cmp-year-sel { height:36px; border:1px solid #E8E8E6; border-radius:8px; padding:0 10px; font-size:12px; font-family:inherit; color:#1A1A1A; background:#fff; outline:none; width:100%; }
        .cmp-section { margin-bottom:20px; }
        .cmp-sec-title { font-size:10px; font-weight:700; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:8px; }
        .better { color:#15803D; font-weight:700; }
        .worse  { color:#DC2626; }

        /* MODAL */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal { background:#fff; border-radius:16px; padding:24px; width:100%; max-width:440px; max-height:90vh; overflow-y:auto; }
        .modal-title { font-size:15px; font-weight:600; color:#1A1A1A; margin-bottom:2px; }
        .modal-sub { font-size:12px; color:#AAA; margin-bottom:18px; }
        .type-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-bottom:14px; }
        .type-btn { padding:9px 10px; border-radius:9px; border:2px solid #E8E8E6; background:#fff; cursor:pointer; font-size:12px; font-weight:500; font-family:inherit; text-align:left; transition:all 0.15s; }
        .type-btn:hover { border-color:#DDD; }
        .type-btn.sel { border-color:#7E22CE; background:#FDF4FF; color:#7E22CE; }
        .modal-acts { display:flex; gap:8px; justify-content:flex-end; margin-top:18px; }

        /* RESPONSIVE */
        @media (max-width:768px) {
          .layout { grid-template-columns:1fr; }
          .sidebar { display:none; }
          .main { padding:16px; }
          .stat-grid { grid-template-columns:repeat(2,1fr); }
          .et-head, .et-row { grid-template-columns:28px 1fr 110px; }
          .et-head > *:nth-child(3), .et-row > *:nth-child(3) { display:none; }
          .et-head > *:nth-child(5), .et-row > *:nth-child(5) { display:none; }
          .fr2 { grid-template-columns:1fr; }
          .migrate-grid { grid-template-columns:1fr; }
          .migrate-arrow { display:none; }
        }
      `}</style>

      {/* TRANSFER MODAL */}
      {transferModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setTransferModal(null) }}>
          <div className="modal">
            <div className="modal-title">Transfer Kaydı</div>
            <div className="modal-sub">{transferModal.learner_name} — {transferModal.class_name}</div>
            <label className="fl">Transfer Türü *</label>
            <div className="type-grid">
              {TRANSFER_TYPES.map(t => (
                <button key={t.key} className={`type-btn ${tType === t.key ? 'sel' : ''}`} onClick={() => setTType(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="fr2">
              <div><label className="fl">Kurum / Okul</label><input className="fi" value={tDest} onChange={e => setTDest(e.target.value)} placeholder="ör. Hilal İslam Okulu" /></div>
              <div><label className="fl">Şehir</label><input className="fi" value={tCity} onChange={e => setTCity(e.target.value)} placeholder="ör. Johannesburg" /></div>
            </div>
            <div className="fr">
              <label className="fl">Transfer Tarihi</label>
              <input className="fi" type="date" value={tDate} onChange={e => setTDate(e.target.value)} />
            </div>
            <div className="fr">
              <label className="fl">Not</label>
              <input className="fi" value={tNote} onChange={e => setTNote(e.target.value)} placeholder="Sebep veya ek bilgi..." />
            </div>
            <div className="modal-acts">
              <button className="btn btn-secondary" onClick={() => setTransferModal(null)}>İptal</button>
              <button style={{ padding:'8px 20px', border:'none', borderRadius:9, background:'#7E22CE', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}
                onClick={saveTransfer} disabled={tSaving}>
                {SVG.check} {tSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div className="topbar">
        <button className="back-btn" onClick={() => router.push('/admin')}>
          {SVG.back} Admin
        </button>
        <span className="topbar-center">Akademik Yıl</span>
        {activeYear
          ? <span className="active-badge">{SVG.calendar} {activeYear.name} — Aktif</span>
          : <span style={{ fontSize:12, color:'#CCC' }}>Aktif yıl yok</span>}
      </div>

      <div className="layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          {years.length > 0 && (
            <div className="year-sel-wrap">
              <span className="year-sel-label">Görüntülenen Yıl</span>
              <select className="year-select"
                value={selectedYear?.id || ''}
                onChange={e => {
                  const y = years.find(x => x.id === e.target.value) || null
                  setSelectedYear(y)
                }}>
                {years.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.name}{y.is_active ? ' (Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="sidebar-label">Görünüm</span>
          {TAB_LIST.map(t => (
            <button key={t.k} className={`tab-btn ${tab === t.k ? 'on' : ''}`}
              onClick={() => setTab(t.k)}>
              {t.icon} {t.l}
            </button>
          ))}
        </div>

        {/* MAIN */}
        <div className="main">

          {/* ════════ OVERVIEW ════════ */}
          {tab === 'overview' && (
            <div>
              <div className="ph">
                <div className="ph-title">{selectedYear?.name || 'Yıl seçin'}</div>
                <div className="ph-sub">
                  {selectedYear
                    ? `${fmtDate(selectedYear.start_date)} → ${fmtDate(selectedYear.end_date)}`
                    : 'Soldaki menüden bir yıl seçin'}
                </div>
              </div>

              {!selectedYear ? (
                <div style={{ background:'#fff', border:'1px solid #E8E8E6', borderRadius:12, padding:48, textAlign:'center' }}>
                  <div style={{ color:'#CCC', fontSize:13, marginBottom:14 }}>Henüz akademik yıl yok</div>
                  <button className="btn btn-primary" style={{ width:'auto' }} onClick={() => setTab('new-year')}>
                    {SVG.plus} İlk Yılı Oluştur
                  </button>
                </div>
              ) : (
                <>
                  <div className="stat-grid">
                    {overviewStats.map(s => (
                      <div key={s.label} className="stat-card">
                        <div className="stat-val" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-lbl">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {attStats.length > 0 && (
                    <>
                      <div style={{ fontSize:10, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Sınıf Bazlı Yoklama</div>
                      <table className="data-table">
                        <thead><tr><th>Sınıf</th><th>Kayıt</th><th>Mevcut</th><th>Oran</th></tr></thead>
                        <tbody>
                          {attStats.map(s => (
                            <tr key={s.class_name}>
                              <td style={{ fontWeight:500 }}>{s.class_name}</td>
                              <td style={{ color:'#888' }}>{s.total_records}</td>
                              <td style={{ color:'#888' }}>{(s.present_count||0) + (s.late_count||0)}</td>
                              <td>
                                <div className="pct-wrap">
                                  <div className="pct-bar">
                                    <div className="pct-fill" style={{ width:`${s.attendance_pct}%`, background: s.attendance_pct>=75 ? '#22C55E' : s.attendance_pct>=60 ? '#EAB308' : '#EF4444' }} />
                                  </div>
                                  <span className="pct-num" style={{ color: s.attendance_pct>=75 ? '#15803D' : s.attendance_pct>=60 ? '#A16207' : '#DC2626' }}>{s.attendance_pct}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button className="fpill" onClick={() => setTab('learners')}>{SVG.users} Öğrenci Durumlarını Güncelle {SVG.arrow}</button>
                    <button className="fpill" onClick={() => setTab('migrate')}>{SVG.move} Yıl Nakli Yap {SVG.arrow}</button>
                    <button className="fpill" onClick={() => setTab('transfers')}>{SVG.transfer} Transferleri Görüntüle {SVG.arrow}</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════ LEARNERS ════════ */}
          {tab === 'learners' && (
            <div>
              <div className="ph">
                <div className="ph-title">Öğrenci Durumları</div>
                <div className="ph-sub">{selectedYear?.name} · {enrollments.length} öğrenci</div>
              </div>

              {!selectedYear ? <div className="empty">Soldaki menüden yıl seçin</div> : (
                <>
                  <div className="filter-row">
                    <div className="search-wrap">
                      {SVG.search}
                      <input className="search-input" placeholder="Öğrenci ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <select className="fsel" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                      <option value="all">Tüm Sınıflar</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className={`fpill ${bulkMode ? 'on' : ''}`} onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()) }}>
                      {bulkMode ? SVG.check : SVG.plus} Toplu Güncelle
                    </button>
                  </div>

                  <div className="filter-row">
                    <button className={`fpill ${statusFilter==='all' ? 'on' : ''}`} onClick={() => setStatusFilter('all')}>
                      Tümü ({enrollments.length})
                    </button>
                    {STATUS_OPTIONS.map(s => {
                      const n = enrollments.filter(e => e.enrollment_status === s.key).length
                      return (
                        <button key={s.key}
                          className={`fpill ${statusFilter===s.key ? 'on' : ''}`}
                          style={statusFilter===s.key ? { background:s.color, borderColor:s.color } : {}}
                          onClick={() => setStatusFilter(s.key)}>
                          {s.label} {n > 0 ? `(${n})` : ''}
                        </button>
                      )
                    })}
                  </div>

                  {bulkMode && selected.size > 0 && (
                    <div className="bulk-bar">
                      <span className="bulk-count">{selected.size} seçildi</span>
                      <select className="bulk-sel" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                      <button className="bulk-apply" onClick={applyBulkStatus}>{SVG.check} Uygula</button>
                      <button className="bulk-cancel" onClick={() => { setSelected(new Set()); setBulkMode(false) }}>{SVG.x} İptal</button>
                    </div>
                  )}

                  {enrollLoading ? <div className="empty">Yükleniyor...</div>
                    : filteredEnrollments.length === 0 ? <div className="empty">Kayıt bulunamadı</div>
                    : (
                      <div className="et-wrap">
                        <div className="et-head">
                          <div />
                          <div className="et-lbl">Öğrenci</div>
                          <div className="et-lbl">Sınıf</div>
                          <div className="et-lbl">Durum</div>
                          <div className="et-lbl">İşlem</div>
                        </div>
                        {filteredEnrollments.map(e => {
                          const cfg = statusCfg(e.enrollment_status)
                          const isChk = selected.has(e.id)
                          return (
                            <div key={e.id} className="et-row" style={isChk ? { background:'#F0F0FF' } : {}}>
                              <div>
                                {bulkMode
                                  ? <input type="checkbox" checked={isChk} onChange={() => setSelected(prev => { const n = new Set(prev); isChk ? n.delete(e.id) : n.add(e.id); return n })} style={{ cursor:'pointer', accentColor:'#1A1A1A' }} />
                                  : <div className="status-dot" style={{ background:cfg.color }} />}
                              </div>
                              <div>
                                <div className="l-name">{e.learner_name}</div>
                                <div className="l-class">{e.class_name}</div>
                              </div>
                              <div>
                                <span style={{ fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:5, background:'#F5F5F3', color:'#666' }}>
                                  {e.class_name}
                                </span>
                              </div>
                              <div>
                                <select className="sstat-sel" value={e.enrollment_status}
                                  onChange={ev => {
                                    if (ev.target.value === 'transferred') setTransferModal(e)
                                    else updateStatus(e.id, e.learner_id, ev.target.value)
                                  }}>
                                  {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                                </select>
                              </div>
                              <div>
                                {e.enrollment_status === 'transferred'
                                  ? <button className="tlink" onClick={() => setTransferModal(e)}>{SVG.transfer} Detay</button>
                                  : <span style={{ fontSize:11, color:'#E0E0DC' }}>—</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                </>
              )}
            </div>
          )}

          {/* ════════ YIL NAKLİ ════════ */}
          {tab === 'migrate' && (
            <div>
              <div className="ph">
                <div className="ph-title">Yıl Nakli</div>
                <div className="ph-sub">Öğrencileri bir akademik yıldan diğerine taşıyın</div>
              </div>

              {migrateResult && (
                <div className="result-box">
                  {SVG.check} {migrateResult}
                  <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#15803D' }} onClick={() => setMigrateResult(null)}>{SVG.x}</button>
                </div>
              )}

              {years.length < 2 ? (
                <div className="info-box">
                  {SVG.info}
                  <span>Nakil yapabilmek için en az 2 akademik yıl gerekli. Önce <button className="btn-ghost" onClick={() => setTab('new-year')}>yeni yıl oluşturun</button>.</span>
                </div>
              ) : (
                <>
                  {/* Yıl seçimi */}
                  <div className="migrate-grid">
                    <div className="migrate-year-box">
                      <div className="migrate-year-title">Kaynak Yıl</div>
                      <select className="year-select" style={{ marginBottom:12 }} value={migrateFromYear}
                        onChange={e => { setMigrateFromYear(e.target.value); setMigrateSelected(new Set()) }}>
                        <option value="">Seçin...</option>
                        {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (Aktif)' : ''}</option>)}
                      </select>
                      {migrateFromYear && (
                        <div style={{ fontSize:12, color:'#888' }}>
                          {migrateEnrollments.length} öğrenci · {migrateSelected.size} seçildi
                        </div>
                      )}
                    </div>

                    <div className="migrate-arrow">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </div>

                    <div className="migrate-year-box">
                      <div className="migrate-year-title">Hedef Yıl</div>
                      <select className="year-select" style={{ marginBottom:12 }} value={migrateToYear}
                        onChange={e => setMigrateToYear(e.target.value)}>
                        <option value="">Seçin...</option>
                        {years.filter(y => y.id !== migrateFromYear).map(y => (
                          <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (Aktif)' : ''}</option>
                        ))}
                      </select>
                      {migrateToYear && (
                        <div style={{ fontSize:12, color:'#888' }}>
                          {years.find(y => y.id === migrateToYear)?.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filtre + liste */}
                  {migrateFromYear && (
                    <div>
                      <div className="filter-row" style={{ marginBottom:8 }}>
                        <span style={{ fontSize:12, color:'#888', fontWeight:500 }}>Durum filtresi:</span>
                        <button className={`fpill ${migrateStatusFilter==='all' ? 'on' : ''}`} onClick={() => setMigrateStatusFilter('all')}>Tümü</button>
                        {STATUS_OPTIONS.map(s => {
                          const n = migrateEnrollments.filter(e => e.enrollment_status === s.key).length
                          if (!n) return null
                          return (
                            <button key={s.key}
                              className={`fpill ${migrateStatusFilter===s.key ? 'on' : ''}`}
                              style={migrateStatusFilter===s.key ? { background:s.color, borderColor:s.color } : {}}
                              onClick={() => setMigrateStatusFilter(s.key)}>
                              {s.label} ({n})
                            </button>
                          )
                        })}
                      </div>

                      {migrateLoading ? <div className="empty">Yükleniyor...</div> : (
                        <div className="migrate-list">
                          {/* Select all */}
                          <div className="sel-all-row">
                            <input type="checkbox"
                              style={{ cursor:'pointer', accentColor:'#1A1A1A' }}
                              checked={migrateSelected.size === filteredMigrate.length && filteredMigrate.length > 0}
                              onChange={() => {
                                if (migrateSelected.size === filteredMigrate.length) setMigrateSelected(new Set())
                                else setMigrateSelected(new Set(filteredMigrate.map(e => e.id)))
                              }} />
                            <span style={{ fontSize:12, fontWeight:500, color:'#555' }}>
                              Tümünü seç ({filteredMigrate.length} öğrenci)
                            </span>
                          </div>

                          {filteredMigrate.length === 0 ? (
                            <div className="empty">Bu filtrede öğrenci yok</div>
                          ) : filteredMigrate.map(e => {
                            const isSel = migrateSelected.has(e.id)
                            const cfg = statusCfg(e.enrollment_status)
                            return (
                              <div key={e.id}
                                className={`migrate-row ${isSel ? 'sel' : ''}`}
                                onClick={() => setMigrateSelected(prev => { const n = new Set(prev); isSel ? n.delete(e.id) : n.add(e.id); return n })}>
                                <input type="checkbox" checked={isSel} onChange={() => {}} style={{ cursor:'pointer', accentColor:'#1A1A1A', flexShrink:0 }} />
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:13, fontWeight:500, color:'#1A1A1A' }}>{e.learner_name}</div>
                                  <div style={{ fontSize:11, color:'#AAA' }}>{e.class_name}</div>
                                </div>
                                <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:5, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, whiteSpace:'nowrap' }}>
                                  {cfg.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Aksiyon */}
                      {migrateSelected.size > 0 && migrateToYear && (
                        <div style={{ marginTop:16, background:'#fff', border:'1px solid #E8E8E6', borderRadius:11, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A' }}>
                              {migrateSelected.size} öğrenci → {years.find(y => y.id === migrateToYear)?.name}
                            </div>
                            <div style={{ fontSize:11, color:'#AAA', marginTop:2 }}>
                              Zaten hedef yılda olanlar atlanır · Durum "Aktif" olarak ayarlanır
                            </div>
                          </div>
                          <button className="btn btn-primary" style={{ width:'auto', minWidth:140 }}
                            onClick={doMigrate} disabled={migrating}>
                            {SVG.move} {migrating ? 'Naklediliyor...' : `${migrateSelected.size} Öğrenciyi Naklet`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!migrateFromYear && (
                    <div className="info-box">
                      {SVG.info}
                      <span>Kaynak yıl seçin, sonra nakledilecek öğrencileri işaretleyin.</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ════════ TRANSFERS ════════ */}
          {tab === 'transfers' && (
            <div>
              <div className="ph">
                <div className="ph-title">Transfer Kayıtları</div>
                <div className="ph-sub">{selectedYear?.name} · {transfers.length} kayıt</div>
              </div>

              {!selectedYear ? <div className="empty">Soldaki menüden yıl seçin</div>
                : transfersLoading ? <div className="empty">Yükleniyor...</div>
                : transfers.length === 0 ? (
                  <div className="empty">
                    <div style={{ marginBottom:8 }}>Bu yıl için transfer kaydı yok</div>
                    <button className="btn btn-secondary" onClick={() => setTab('learners')} style={{ margin:'0 auto' }}>
                      {SVG.users} Öğrenci Durumlarına Git
                    </button>
                  </div>
                ) : transfers.map(t => {
                  const tCfg = TRANSFER_TYPES.find(x => x.key === t.transfer_type) || TRANSFER_TYPES[5]
                  return (
                    <div key={t.id} className="tr-card">
                      <div className="tr-icon">
                        {SVG.transfer}
                      </div>
                      <div style={{ flex:1 }}>
                        <div className="tr-name">{t.learner_name}</div>
                        <div className="tr-dest">
                          {tCfg.label}
                          {t.destination_name && ` — ${t.destination_name}`}
                          {t.destination_city && `, ${t.destination_city}`}
                        </div>
                        {t.from_class_name && <div className="tr-meta">Sınıf: {t.from_class_name}</div>}
                        {t.notes && <div className="tr-meta" style={{ fontStyle:'italic', marginTop:2 }}>"{t.notes}"</div>}
                      </div>
                      <div style={{ fontSize:11, color:'#AAA', whiteSpace:'nowrap' }}>{fmtShort(t.transfer_date)}</div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* ════════ YIL YÖNETİMİ ════════ */}
          {tab === 'new-year' && (
            <div>
              <div className="ph">
                <div className="ph-title">Yıl Yönetimi</div>
                <div className="ph-sub">Yeni yıl oluştur veya mevcut yılı kapat</div>
              </div>

              {archiveResult ? (
                <div>
                  <div className="success-box">
                    <div className="success-title">{SVG.check} Tamamlandı</div>
                    <div className="success-msg">{archiveResult}</div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => { setArchiveResult(null); setTab('overview') }}>
                    {SVG.back} Genel Bakışa Dön
                  </button>
                </div>
              ) : !activeYear ? (
                <div className="form-card">
                  <div className="form-card-title">{SVG.plus} İlk Akademik Yılı Oluştur</div>
                  <div className="info-box">{SVG.info} <span>Mevcut tüm veriler oluşturulacak yıla bağlanacak.</span></div>
                  <div className="fr"><label className="fl">Yıl Adı *</label><input className="fi" value={newName} onChange={e => setNewName(e.target.value)} placeholder="ör. 2024-2025 veya 1446-1447 H" /></div>
                  <div className="fr2">
                    <div><label className="fl">Başlangıç *</label><input className="fi" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} /></div>
                    <div><label className="fl">Bitiş *</label><input className="fi" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} /></div>
                  </div>
                  <button className="btn btn-primary" disabled={!newName.trim() || !newStart || !newEnd || archiving} onClick={createFirstYear}>
                    {SVG.plus} {archiving ? 'Oluşturuluyor...' : 'Akademik Yıl Oluştur'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Aktif yıl bilgisi */}
                  <div className="form-card">
                    <div className="form-card-title">{SVG.calendar} Mevcut Aktif Yıl</div>
                    <div style={{ background:'#FAFAF8', border:'1px solid #EFEFED', borderRadius:9, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div>
                        <div style={{ fontSize:16, fontWeight:600, color:'#1A1A1A', marginBottom:3 }}>{activeYear.name}</div>
                        <div style={{ fontSize:12, color:'#AAA' }}>{fmtDate(activeYear.start_date)} → {fmtDate(activeYear.end_date)}</div>
                      </div>
                      <span className="badge-active">Aktif</span>
                    </div>
                  </div>

                  {/* Yeni yıl formu */}
                  <div className="form-card">
                    <div className="form-card-title">{SVG.plus} Yeni Yıl Aç</div>
                    <div className="fr"><label className="fl">Yeni Yıl Adı *</label><input className="fi" value={newName} onChange={e => setNewName(e.target.value)} placeholder="ör. 2025-2026" /></div>
                    <div className="fr2">
                      <div><label className="fl">Başlangıç *</label><input className="fi" type="date" value={newStart} onChange={e => setNewStart(e.target.value)} /></div>
                      <div><label className="fl">Bitiş *</label><input className="fi" type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} /></div>
                    </div>

                    {newName && newStart && newEnd && (
                      <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:9, padding:'10px 13px', marginBottom:14, fontSize:12, color:'#166534', lineHeight:1.6 }}>
                        <strong>{activeYear.name}</strong> arşivlenecek → <strong>{newName}</strong> aktif olacak<br/>
                        <span style={{ color:'#86EFAC', fontSize:11 }}>Aktif öğrenciler nakledilir · Transfer/ayrılan taşınmaz · Eski veriler silinmez</span>
                      </div>
                    )}

                    <div className="warn-box">
                      {SVG.warn}
                      <span>Bu işlem geri alınamaz. Önce <button className="btn-ghost" onClick={() => setTab('learners')}>Öğrenciler</button> sekmesinden yıl sonu durumlarını güncelleyin.</span>
                    </div>

                    <button className="btn btn-danger"
                      disabled={!newName.trim() || !newStart || !newEnd || archiving}
                      onClick={doArchive}>
                      {SVG.archive} {archiving ? 'İşleniyor...' : `${activeYear.name} Kapat  →  ${newName || '...'} Aç`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════ ARŞİV ════════ */}
          {tab === 'archive' && (
            <div>
              <div className="ph">
                <div className="ph-title">Arşiv</div>
                <div className="ph-sub">{years.length} akademik yıl</div>
              </div>

              {years.length === 0 ? <div className="empty">Henüz yıl yok</div>
                : years.map(y => (
                  <div key={y.id} className={`arc-card ${y.is_active ? 'is-active' : ''}`}>
                    <div className="arc-head">
                      <div className="arc-name">
                        {SVG.calendar} {y.name}
                        {y.is_active   && <span className="badge-active">Aktif</span>}
                        {y.is_archived && <span className="badge-arch">Arşiv</span>}
                      </div>
                      <span className="arc-dates">{fmtDate(y.start_date)} → {fmtDate(y.end_date)}</span>
                    </div>

                    {y.total_learners !== undefined && (
                      <div className="arc-stats">
                        {[
                          { n: y.total_learners||0, l:'Toplam',   c:'#1A1A1A' },
                          { n: y.active||0,         l:'Aktif',    c:'#15803D' },
                          { n: y.completed||0,      l:'Bitti',    c:'#1D4ED8' },
                          { n: y.transferred||0,    l:'Transfer', c:'#7E22CE' },
                          { n: y.graduated||0,      l:'Mezun',    c:'#0E7490' },
                          { n: y.retained||0,       l:'Kaldı',    c:'#A16207' },
                          { n: y.withdrawn||0,      l:'Ayrıldı',  c:'#DC2626' },
                        ].filter(s => s.n > 0 || s.l === 'Toplam').map(s => (
                          <div key={s.l} className="mini-s">
                            <div className="mini-n" style={{ color:s.c }}>{s.n}</div>
                            <div className="mini-l">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop:10 }}>
                      <button className="fpill" onClick={() => { setSelectedYear(y); setTab('overview') }}>
                        Bu Yılı İncele {SVG.arrow}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ════════ KARŞILAŞTIR ════════ */}
          {tab === 'compare' && (
            <div>
              <div className="ph">
                <div className="ph-title">Yıllar Arası Karşılaştırma</div>
                <div className="ph-sub">Yoklama ve müfredat verilerini karşılaştırın</div>
              </div>

              <div className="form-card">
                <div className="cmp-sel">
                  <div>
                    <label className="fl">Yıl A</label>
                    <select className="cmp-year-sel" value={cmpA} onChange={e => setCmpA(e.target.value)}>
                      <option value="">Seçin...</option>
                      {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                  <div className="cmp-vs">vs</div>
                  <div>
                    <label className="fl">Yıl B</label>
                    <select className="cmp-year-sel" value={cmpB} onChange={e => setCmpB(e.target.value)}>
                      <option value="">Seçin...</option>
                      {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop:4 }}
                  disabled={!cmpA || !cmpB || cmpA===cmpB || cmpLoading}
                  onClick={doCompare}>
                  {SVG.chart} {cmpLoading ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
                </button>
              </div>

              {cmpData && (() => {
                const nA = cmpData.yearA?.name
                const nB = cmpData.yearB?.name
                return (
                  <div>
                    {/* Öğrenci */}
                    <div className="cmp-section">
                      <div className="cmp-sec-title">Öğrenci Durumu</div>
                      <table className="data-table">
                        <thead><tr><th>Durum</th><th>{nA}</th><th>{nB}</th><th>Fark</th></tr></thead>
                        <tbody>
                          {STATUS_OPTIONS.map(s => {
                            const a = (cmpData.yearA as any)?.[s.key] ?? 0
                            const b = (cmpData.yearB as any)?.[s.key] ?? 0
                            const diff = b - a
                            return (
                              <tr key={s.key}>
                                <td><span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:5, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{s.label}</span></td>
                                <td>{a}</td>
                                <td>{b}</td>
                                <td style={{ color: diff===0 ? '#CCC' : diff>0 ? '#15803D' : '#DC2626', fontWeight:600 }}>
                                  {diff>0 ? `+${diff}` : diff===0 ? '—' : diff}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {cmpData.attendance?.length > 0 && (
                      <div className="cmp-section">
                        <div className="cmp-sec-title">Yoklama Oranları</div>
                        <table className="data-table">
                          <thead><tr><th>Sınıf</th><th>{nA}</th><th>{nB}</th><th>Değişim</th></tr></thead>
                          <tbody>
                            {[...new Set(cmpData.attendance.map((r: any) => r.class_name))].map((cls: any) => {
                              const ra = cmpData.attendance.find((r: any) => r.class_name===cls && r.year_name===nA)
                              const rb = cmpData.attendance.find((r: any) => r.class_name===cls && r.year_name===nB)
                              const pA = ra?.attendance_pct ?? null
                              const pB = rb?.attendance_pct ?? null
                              const diff = pA!=null && pB!=null ? +(pB-pA).toFixed(1) : null
                              return (
                                <tr key={cls}>
                                  <td style={{ fontWeight:500 }}>{cls}</td>
                                  <td>{pA!=null ? `${pA}%` : '—'}</td>
                                  <td className={diff!=null ? diff>0?'better':diff<0?'worse':'' : ''}>{pB!=null ? `${pB}%` : '—'}</td>
                                  <td style={{ color: diff==null?'#CCC':diff>0?'#15803D':diff<0?'#DC2626':'#888', fontWeight:600 }}>
                                    {diff==null ? '—' : diff>0 ? `▲ +${diff}%` : diff<0 ? `▼ ${diff}%` : '='}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {cmpData.curriculum?.length > 0 && (
                      <div className="cmp-section">
                        <div className="cmp-sec-title">Müfredat Tamamlanma</div>
                        <table className="data-table">
                          <thead><tr><th>Ders</th><th>{nA}</th><th>{nB}</th><th>Değişim</th></tr></thead>
                          <tbody>
                            {[...new Set(cmpData.curriculum.map((r: any) => r.subject_name))].map((subj: any) => {
                              const ra = cmpData.curriculum.find((r: any) => r.subject_name===subj && r.year_name===nA)
                              const rb = cmpData.curriculum.find((r: any) => r.subject_name===subj && r.year_name===nB)
                              const pA = ra?.completion_pct ?? null
                              const pB = rb?.completion_pct ?? null
                              const diff = pA!=null && pB!=null ? +(pB-pA).toFixed(1) : null
                              return (
                                <tr key={subj}>
                                  <td style={{ fontWeight:500 }}>{subj}</td>
                                  <td>{pA!=null ? `${pA}%` : '—'}</td>
                                  <td className={diff!=null ? diff>0?'better':diff<0?'worse':'' : ''}>{pB!=null ? `${pB}%` : '—'}</td>
                                  <td style={{ color: diff==null?'#CCC':diff>0?'#15803D':diff<0?'#DC2626':'#888', fontWeight:600 }}>
                                    {diff==null ? '—' : diff>0 ? `▲ +${diff}%` : diff<0 ? `▼ ${diff}%` : '='}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!cmpData.attendance?.length && !cmpData.curriculum?.length && (
                      <div className="empty">Karşılaştırılacak veri henüz yok</div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

        </div>
      </div>
    </main>
  )
}