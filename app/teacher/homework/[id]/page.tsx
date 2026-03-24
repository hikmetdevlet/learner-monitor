'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const STATUS_OPTIONS = [
  { key: 'submitted_on_time', label: 'On time', color: 'bg-green-500' },
  { key: 'submitted_late', label: 'Late', color: 'bg-yellow-500' },
  { key: 'incomplete', label: 'Incomplete', color: 'bg-orange-500' },
  { key: 'not_submitted', label: 'Not submitted', color: 'bg-red-500' },
]

export default function MarkHomework() {
  const [assignment, setAssignment] = useState<any>(null)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const id = params.id as string

    const { data: assignData } = await supabase
      .from('homework_assignments')
      .select('*, classes(name), timetable(name), learners(full_name)')
      .eq('id', id)
      .single()
    setAssignment(assignData)

    const { data: subData } = await supabase
      .from('homework_submissions')
      .select('*, learners(id, full_name)')
      .eq('assignment_id', id)
      .order('learners(full_name)')
    setSubmissions(subData || [])
  }

  function updateSubmission(submissionId: string, field: string, value: any) {
    setSubmissions(prev => prev.map(s =>
      s.id === submissionId ? { ...s, [field]: value } : s
    ))
    setSaved(false)
  }

  async function saveAll() {
    setSaving(true)
    for (const sub of submissions) {
      await supabase.from('homework_submissions').update({
        status: sub.status,
        marks: sub.marks || null,
        feedback: sub.feedback || null,
        marked_at: new Date().toISOString(),
      }).eq('id', sub.id)
    }
    setSaving(false)
    setSaved(true)
  }

  function getStats() {
    const total = submissions.length
    const onTime = submissions.filter(s => s.status === 'submitted_on_time').length
    const late = submissions.filter(s => s.status === 'submitted_late').length
    const notSubmitted = submissions.filter(s => s.status === 'not_submitted').length
    const incomplete = submissions.filter(s => s.status === 'incomplete').length
    const avgMarks = submissions.filter(s => s.marks).length > 0
      ? Math.round(submissions.filter(s => s.marks).reduce((a, s) => a + s.marks, 0) / submissions.filter(s => s.marks).length)
      : null
    return { total, onTime, late, notSubmitted, incomplete, avgMarks }
  }

  if (!assignment) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </main>
  )

  const stats = getStats()
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = assignment.due_date < today

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/teacher/homework')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <div>
            <h1 className="text-lg font-medium text-gray-900">{assignment.title}</h1>
            <p className="text-xs text-gray-400">{assignment.classes?.name} · Due: {assignment.due_date} {isOverdue && '· Overdue'}</p>
          </div>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save all'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Assignment info */}
        {assignment.description && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
            <p className="text-sm text-gray-600">{assignment.description}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700' },
            { label: 'On time', value: stats.onTime, color: 'text-green-600' },
            { label: 'Late', value: stats.late, color: 'text-yellow-500' },
            { label: 'Incomplete', value: stats.incomplete, color: 'text-orange-500' },
            { label: 'Not submitted', value: stats.notSubmitted, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className={`text-2xl font-medium ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Submissions */}
        <div className="flex flex-col gap-3">
          {submissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-sm text-gray-400">No submissions yet.</p>
            </div>
          ) : (
            submissions.map(sub => (
              <div key={sub.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-gray-800">{sub.learners?.full_name}</p>
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map(status => (
                      <button
                        key={status.key}
                        onClick={() => updateSubmission(sub.id, 'status', status.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                          sub.status === status.key
                            ? `${status.color} text-white`
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Marks</label>
                    <input
                      type="number"
                      value={sub.marks || ''}
                      onChange={e => updateSubmission(sub.id, 'marks', parseInt(e.target.value) || null)}
                      placeholder={`/ ${assignment.max_marks}`}
                      min="0"
                      max={assignment.max_marks}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <span className="text-xs text-gray-400">/ {assignment.max_marks}</span>
                  </div>
                  <input
                    value={sub.feedback || ''}
                    onChange={e => updateSubmission(sub.id, 'feedback', e.target.value)}
                    placeholder="Feedback for this learner..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}