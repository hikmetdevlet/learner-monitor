'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function LearnerProfile() {
  const [learner, setLearner] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [homework, setHomework] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [salaahAttendance, setSalaahAttendance] = useState<any[]>([])
  const [family, setFamily] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [docTypes, setDocTypes] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [learnerClasses, setLearnerClasses] = useState<any[]>([])
  const [atRiskThreshold, setAtRiskThreshold] = useState(70)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingFamily, setEditingFamily] = useState<any>(null)
  const [savingFamily, setSavingFamily] = useState(false)
  const [savingDoc, setSavingDoc] = useState('')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const id = params.id as string

    const { data: learnerData } = await supabase
      .from('learners').select('*, classes(name)').eq('id', id).single()
    setLearner(learnerData)

    const { data: classesData } = await supabase.from('classes').select('*').order('name')
    setClasses(classesData || [])

    const { data: lcData } = await supabase
      .from('learner_classes')
      .select('*, classes(name, class_type)')
      .eq('learner_id', id)
    setLearnerClasses(lcData || [])

    const { data: attData } = await supabase
      .from('attendance')
      .select('*, timetable(name, start_time)')
      .eq('learner_id', id)
      .order('attendance_date', { ascending: false })
    setAttendance(attData || [])

    const { data: hwData } = await supabase
      .from('homework')
      .select('*, timetable(name)')
      .eq('learner_id', id)
    setHomework(hwData || [])

    const { data: notesData } = await supabase
      .from('notes')
      .select('*, timetable(name), users(full_name)')
      .eq('learner_id', id)
      .order('created_at', { ascending: false })
    setNotes(notesData || [])

    const { data: salaahData } = await supabase
      .from('activity_attendance').select('*, daily_activities(name, is_salaah)')
      .eq('learner_id', id)
    setSalaahAttendance(salaahData?.filter((a: any) => a.daily_activities?.is_salaah) || [])

    const { data: familyData } = await supabase
      .from('learner_family').select('*').eq('learner_id', id)
    setFamily(familyData || [])

    const { data: docTypesData } = await supabase
      .from('document_types').select('*').eq('is_active', true).order('name')
    setDocTypes(docTypesData || [])

    const { data: docsData } = await supabase
      .from('learner_documents').select('*, document_types(name)')
      .eq('learner_id', id)
    setDocuments(docsData || [])

    const { data: settingsData } = await supabase
      .from('settings').select('value').eq('key', 'at_risk_threshold').single()
    if (settingsData) setAtRiskThreshold(parseInt(settingsData.value))
  }

  async function saveFamily(relation: string, data: any) {
    setSavingFamily(true)
    const existing = family.find(f => f.relation === relation)
    if (existing) {
      await supabase.from('learner_family').update(data).eq('id', existing.id)
    } else {
      await supabase.from('learner_family').insert({ ...data, learner_id: params.id, relation })
    }
    setEditingFamily(null)
    setSavingFamily(false)
    loadProfile()
  }

  async function toggleDocument(docTypeId: string, current: any) {
    const id = params.id as string
    setSavingDoc(docTypeId)
    if (current) {
      await supabase.from('learner_documents').update({
        submitted: !current.submitted,
        submitted_date: !current.submitted ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', current.id)
    } else {
      await supabase.from('learner_documents').insert({
        learner_id: id,
        document_type_id: docTypeId,
        submitted: true,
        submitted_date: new Date().toISOString().split('T')[0],
      })
    }
    setSavingDoc('')
    loadProfile()
  }

  async function uploadDocument(docTypeId: string, file: File) {
    const id = params.id as string
    setSavingDoc(docTypeId)
    const path = `${id}/${docTypeId}/${file.name}`
    await supabase.storage.from('learner-documents').upload(path, file, { upsert: true })
    const { data: urlData } = supabase.storage.from('learner-documents').getPublicUrl(path)
    const existing = documents.find(d => d.document_type_id === docTypeId)
    if (existing) {
      await supabase.from('learner_documents').update({
        file_url: urlData.publicUrl, submitted: true,
        submitted_date: new Date().toISOString().split('T')[0],
      }).eq('id', existing.id)
    } else {
      await supabase.from('learner_documents').insert({
        learner_id: id, document_type_id: docTypeId,
        submitted: true, submitted_date: new Date().toISOString().split('T')[0],
        file_url: urlData.publicUrl,
      })
    }
    setSavingDoc('')
    loadProfile()
  }

  if (!learner) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </main>
  )

  const totalSessions = attendance.length
  const presentCount = attendance.filter(a => a.status === 'present' || a.status === 'late').length
  const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0
  const totalHw = homework.length
  const submittedHw = homework.filter(h => h.submitted).length
  const hwPct = totalHw > 0 ? Math.round((submittedHw / totalHw) * 100) : 0
  const totalSalaah = salaahAttendance.length
  const presentSalaah = salaahAttendance.filter(s => s.status === 'present').length
  const salaahPct = totalSalaah > 0 ? Math.round((presentSalaah / totalSalaah) * 100) : 0
  const isAtRisk = attendancePct < atRiskThreshold && totalSessions > 0
  const isSalaahAtRisk = salaahPct < atRiskThreshold && totalSalaah > 0
  const docsSubmitted = documents.filter(d => d.submitted).length
  const tabs = ['overview', 'family', 'documents', 'attendance', 'notes']

  function getFamilyMember(relation: string) {
    return family.find(f => f.relation === relation)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-lg font-medium text-gray-900">Learner Profile</h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Profile header */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-medium">
              {learner.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-medium text-gray-900">{learner.full_name}</h2>
                {isAtRisk && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">⚠ At Risk</span>}
                {isSalaahAtRisk && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">🕌 Salaah Alert</span>}
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {learnerClasses.map((lc: any) => (
                  <span key={lc.id} className={`text-xs px-2 py-1 rounded-full ${lc.classes?.class_type === 'islamic' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {lc.classes?.class_type === 'islamic' ? '🕌' : '🏫'} {lc.classes?.name}
                  </span>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                {learner.student_id && <span>ID: {learner.student_id}</span>}
                {learner.date_of_birth && <span>DOB: {learner.date_of_birth}</span>}
                {learner.phone && <span>📞 {learner.phone}</span>}
                {learner.home_language && <span>🗣 {learner.home_language}</span>}
                {learner.join_date && <span>Joined: {learner.join_date}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Attendance', value: attendancePct, color: attendancePct < atRiskThreshold ? 'text-red-500' : 'text-green-600' },
            { label: 'Homework', value: hwPct, color: hwPct < 50 ? 'text-yellow-500' : 'text-green-600' },
            { label: 'Salaah', value: salaahPct, color: salaahPct < atRiskThreshold ? 'text-orange-500' : 'text-green-600' },
            { label: 'Documents', value: `${docsSubmitted}/${docTypes.length}`, color: 'text-blue-600', isText: true },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className={`text-2xl font-medium ${s.color}`}>{(s as any).isText ? s.value : `${s.value}%`}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <OverviewCard
            learner={learner}
            classes={classes}
            learnerClasses={learnerClasses}
            onSave={async (data: any) => {
              await supabase.from('learners').update(data).eq('id', params.id)
              loadProfile()
            }}
            onUpdateClasses={async (islamicId: string, secularId: string) => {
              const id = params.id as string
              await supabase.from('learner_classes').delete().eq('learner_id', id)
              const inserts = []
              if (islamicId) inserts.push({ learner_id: id, class_id: islamicId, class_type: 'islamic' })
              if (secularId) inserts.push({ learner_id: id, class_id: secularId, class_type: 'secular' })
              if (inserts.length > 0) await supabase.from('learner_classes').insert(inserts)
              loadProfile()
            }}
          />
        )}

        {/* Family tab */}
        {activeTab === 'family' && (
          <div className="flex flex-col gap-4">
            {(['father', 'mother', 'guardian'] as const).map(relation => (
              <FamilyCard
                key={relation}
                relation={relation}
                member={getFamilyMember(relation)}
                isEditing={editingFamily === relation}
                onEdit={() => setEditingFamily(editingFamily === relation ? null : relation)}
                onSave={(data: any) => saveFamily(relation, data)}
                saving={savingFamily}
              />
            ))}
          </div>
        )}

        {/* Documents tab */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Documents ({docsSubmitted}/{docTypes.length})</h3>
            </div>
            {docTypes.map(dt => {
              const doc = documents.find(d => d.document_type_id === dt.id)
              const isSaving = savingDoc === dt.id
              return (
                <div key={dt.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span>{doc?.submitted ? '✅' : '⬜'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{dt.name}</p>
                      {doc?.submitted_date && <p className="text-xs text-gray-400">Submitted: {doc.submitted_date}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc?.file_url && (
                      <a href={doc.file_url} target="_blank" className="text-xs text-blue-500 hover:text-blue-700">View file</a>
                    )}
                    <button
                      onClick={() => toggleDocument(dt.id, doc)}
                      disabled={isSaving}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        doc?.submitted ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {isSaving ? '...' : doc?.submitted ? 'Unmark' : 'Mark received'}
                    </button>
                    <input
                      type="file"
                      ref={el => { fileRefs.current[dt.id] = el }}
                      onChange={e => e.target.files?.[0] && uploadDocument(dt.id, e.target.files[0])}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileRefs.current[dt.id]?.click()}
                      className="text-xs px-3 py-1 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100"
                    >
                      Upload
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Attendance tab */}
        {activeTab === 'attendance' && (
          <div className="flex flex-col gap-4">
            {/* Session attendance */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Session Attendance ({attendance.length} records)</h3>
              </div>
              {attendance.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No attendance records yet.</p>
              ) : (
                attendance.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.timetable?.name}</p>
                      <p className="text-xs text-gray-400">{a.attendance_date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      a.status === 'present' ? 'bg-green-100 text-green-600'
                      : a.status === 'late' ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-red-100 text-red-600'
                    }`}>{a.status}</span>
                  </div>
                ))
              )}
            </div>

            {/* Salaah attendance */}
            {salaahAttendance.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700">🕌 Salaah Attendance ({salaahAttendance.length} records)</h3>
                </div>
                {salaahAttendance.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.daily_activities?.name}</p>
                      <p className="text-xs text-gray-400">{a.activity_date}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      a.status === 'present' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Teacher Notes</h3>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No notes yet.</p>
            ) : (
              notes.map((n: any) => (
                <div key={n.id} className="px-5 py-3 border-b border-gray-50 last:border-0">
                  <p className="text-sm text-gray-800">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.users?.full_name} · {n.timetable?.name}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function FamilyCard({ relation, member, isEditing, onEdit, onSave, saving }: any) {
  const [fd, setFd] = useState<any>(member || {})
  useEffect(() => { setFd(member || {}) }, [member, isEditing])

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 capitalize">{relation}</h3>
        <button onClick={onEdit} className="text-xs text-blue-500 hover:text-blue-700">
          {isEditing ? 'Cancel' : member ? 'Edit' : '+ Add'}
        </button>
      </div>
      {isEditing ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Full name', key: 'full_name', placeholder: 'Full name' },
            { label: 'ID number', key: 'id_number', placeholder: 'ID number' },
            { label: 'Phone', key: 'phone', placeholder: 'Phone number' },
            { label: 'Email', key: 'email', placeholder: 'Email address' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input
                value={fd[f.key] || ''}
                onChange={e => setFd((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Address</label>
            <input
              value={fd.address || ''}
              onChange={e => setFd((prev: any) => ({ ...prev, address: e.target.value }))}
              placeholder="Address"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <button
            onClick={() => onSave(fd)}
            disabled={saving}
            className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      ) : member ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Full name', value: member.full_name },
            { label: 'ID number', value: member.id_number },
            { label: 'Phone', value: member.phone },
            { label: 'Email', value: member.email },
            { label: 'Address', value: member.address },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-gray-800 font-medium">{item.value || '—'}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No {relation} information added yet.</p>
      )}
    </div>
  )
}

function OverviewCard({ learner, classes, onSave, onUpdateClasses, learnerClasses }: any) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const [islamicClassId, setIslamicClassId] = useState('')
  const [secularClassId, setSecularClassId] = useState('')

  useEffect(() => {
    setForm({
      full_name: learner.full_name || '',
      student_id: learner.student_id || '',
      date_of_birth: learner.date_of_birth || '',
      join_date: learner.join_date || '',
      phone: learner.phone || '',
      home_language: learner.home_language || '',
      previous_school: learner.previous_school || '',
      address: learner.address || '',
      medical_notes: learner.medical_notes || '',
    })
    const islamic = learnerClasses?.find((lc: any) => lc.classes?.class_type === 'islamic')
    const secular = learnerClasses?.find((lc: any) => lc.classes?.class_type === 'secular')
    setIslamicClassId(islamic?.class_id || '')
    setSecularClassId(secular?.class_id || '')
  }, [learner, learnerClasses])

  async function handleSave() {
    setSaving(true)
    await onSave(form)
    await onUpdateClasses(islamicClassId, secularClassId)
    setSaving(false)
    setEditing(false)
  }

  const islamicClasses = classes.filter((c: any) => c.class_type === 'islamic')
  const secularClasses = classes.filter((c: any) => c.class_type === 'secular')
  const currentIslamic = learnerClasses?.find((lc: any) => lc.classes?.class_type === 'islamic')
  const currentSecular = learnerClasses?.find((lc: any) => lc.classes?.class_type === 'secular')

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Personal Information</h3>
        <button onClick={() => setEditing(!editing)} className="text-xs text-blue-500 hover:text-blue-700">
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      {editing ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Full name', key: 'full_name', placeholder: 'Full name' },
            { label: 'Student ID', key: 'student_id', placeholder: 'e.g. STU001' },
            { label: 'Date of birth', key: 'date_of_birth', placeholder: '', type: 'date' },
            { label: 'Join date', key: 'join_date', placeholder: '', type: 'date' },
            { label: 'Phone', key: 'phone', placeholder: 'Phone number' },
            { label: 'Home language', key: 'home_language', placeholder: 'e.g. Zulu' },
            { label: 'Previous school', key: 'previous_school', placeholder: 'Previous school' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={form[f.key] || ''}
                onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Address</label>
            <input
              value={form.address || ''}
              onChange={e => setForm((prev: any) => ({ ...prev, address: e.target.value }))}
              placeholder="Home address"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Medical notes</label>
            <input
              value={form.medical_notes || ''}
              onChange={e => setForm((prev: any) => ({ ...prev, medical_notes: e.target.value }))}
              placeholder="Allergies, conditions..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">🕌 Islamic class</label>
            <select
              value={islamicClassId}
              onChange={e => setIslamicClassId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">— None —</option>
              {islamicClasses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">🏫 Secular class</label>
            <select
              value={secularClassId}
              onChange={e => setSecularClassId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">— None —</option>
              {secularClasses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Full name', value: learner.full_name },
            { label: 'Student ID', value: learner.student_id },
            { label: 'Date of birth', value: learner.date_of_birth },
            { label: 'Join date', value: learner.join_date },
            { label: 'Phone', value: learner.phone },
            { label: 'Home language', value: learner.home_language },
            { label: 'Previous school', value: learner.previous_school },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-gray-800 font-medium">{item.value || '—'}</p>
            </div>
          ))}
          {learner.address && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Address</p>
              <p className="text-gray-800 font-medium">{learner.address}</p>
            </div>
          )}
          {learner.medical_notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400">Medical notes</p>
              <p className="text-gray-800 font-medium">{learner.medical_notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">🕌 Islamic class</p>
            <p className="text-gray-800 font-medium">{currentIslamic?.classes?.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">🏫 Secular class</p>
            <p className="text-gray-800 font-medium">{currentSecular?.classes?.name || '—'}</p>
          </div>
        </div>
      )}
    </div>
  )
}