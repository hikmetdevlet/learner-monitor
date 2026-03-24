'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function TeacherHomework() {
  const [teacherId, setTeacherId] = useState('')
  const [assignments, setAssignments] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [learners, setLearners] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('assignments')

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [classId, setClassId] = useState('')
  const [timetableId, setTimetableId] = useState('')
  const [learnerId, setLearnerId] = useState('')
  const [maxMarks, setMaxMarks] = useState('10')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadTeacher() }, [])

  async function loadTeacher() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    const { data: userData } = await supabase
      .from('users').select('*').eq('auth_id', user.id).single()
    if (!userData || userData.role !== 'teacher') { router.push('/'); return }
    setTeacherId(userData.id)
    loadAssignments(userData.id)
    loadSessions(userData.id)
    loadClasses()
  }

  async function loadAssignments(tId: string) {
    const { data } = await supabase
      .from('homework_assignments')
      .select('*, classes(name), timetable(name), learners(full_name)')
      .eq('teacher_id', tId)
      .order('due_date', { ascending: false })
    setAssignments(data || [])
  }

  async function loadSessions(tId: string) {
    const { data } = await supabase
      .from('timetable')
      .select('*, classes(name)')
      .eq('teacher_id', tId)
      .order('name')
    setSessions(data || [])
  }

  async function loadClasses() {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('class_type', 'secular')
      .order('name')
    setClasses(data || [])
    if (data && data.length > 0) setClassId(data[0].id)
  }

  async function loadLearners(cId: string) {
    const { data } = await supabase
      .from('learner_classes')
      .select('*, learners(id, full_name)')
      .eq('class_id', cId)
    setLearners(data?.map((lc: any) => lc.learners).filter(Boolean) || [])
  }

  async function createAssignment() {
    if (!title.trim() || !dueDate || !classId) return
    setLoading(true)

    const { data: assignment, error } = await supabase
      .from('homework_assignments')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate,
        class_id: classId,
        timetable_id: timetableId || null,
        learner_id: learnerId || null,
        teacher_id: teacherId,
        max_marks: parseInt(maxMarks) || 10,
      })
      .select()
      .single()

    if (!error && assignment) {
      // Create submission records for all learners in class
      const targetLearners = learnerId
        ? [{ id: learnerId }]
        : learners

      if (targetLearners.length > 0) {
        await supabase.from('homework_submissions').insert(
          targetLearners.map((l: any) => ({
            assignment_id: assignment.id,
            learner_id: l.id,
            status: 'not_submitted',
          }))
        )
      }

      setTitle(''); setDescription(''); setDueDate('')
      setTimetableId(''); setLearnerId(''); setMaxMarks('10')
      setShowForm(false)
      loadAssignments(teacherId)
    }
    setLoading(false)
  }

  async function deleteAssignment(id: string) {
    if (!confirm('Delete this assignment?')) return
    await supabase.from('homework_assignments').delete().eq('id', id)
    loadAssignments(teacherId)
  }

  const today = new Date().toISOString().split('T')[0]
  const overdue = assignments.filter(a => a.due_date < today)
  const upcoming = assignments.filter(a => a.due_date >= today)

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/teacher')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-lg font-medium text-gray-900">Homework</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ New Assignment'}
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">New Homework Assignment</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 3 exercises"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Details about the assignment..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Class *</label>
                  <select
                    value={classId}
                    onChange={e => { setClassId(e.target.value); setLearnerId(''); loadLearners(e.target.value) }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="">— Select class —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Session / Subject</label>
                  <select
                    value={timetableId}
                    onChange={e => setTimetableId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="">— All sessions —</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Due date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Max marks</label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={e => setMaxMarks(e.target.value)}
                    min="1"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Assign to specific learner (optional)</label>
                <select
                  value={learnerId}
                  onChange={e => setLearnerId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  <option value="">— Whole class —</option>
                  {learners.map((l: any) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
              </div>
              <button
                onClick={createAssignment}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'assignments', label: `All (${assignments.length})` },
            { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { key: 'overdue', label: `Overdue (${overdue.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assignment list */}
        <div className="flex flex-col gap-3">
          {(activeTab === 'assignments' ? assignments : activeTab === 'upcoming' ? upcoming : overdue).length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-sm text-gray-400">No assignments yet.</p>
            </div>
          ) : (
            (activeTab === 'assignments' ? assignments : activeTab === 'upcoming' ? upcoming : overdue).map((a: any) => (
              <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{a.title}</p>
                    {a.description && <p className="text-xs text-gray-400 mt-1">{a.description}</p>}
                    <div className="flex gap-3 mt-2 flex-wrap">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🏫 {a.classes?.name}</span>
                      {a.timetable && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">📚 {a.timetable?.name}</span>}
                      {a.learners && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">👤 {a.learners?.full_name}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.due_date < today ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                      }`}>
                        Due: {a.due_date}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Max: {a.max_marks} marks</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/teacher/homework/${a.id}`)}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                    >
                      Mark →
                    </button>
                    <button
                      onClick={() => deleteAssignment(a.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}