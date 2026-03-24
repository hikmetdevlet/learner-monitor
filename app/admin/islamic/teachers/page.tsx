'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function IslamicTeacherAssignment() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: teacherData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'islamic_teacher')
      .order('full_name')
    setTeachers(teacherData || [])

    const { data: classData } = await supabase
      .from('classes')
      .select('*')
      .eq('class_type', 'islamic')
      .order('name')
    setClasses(classData || [])

    const { data: assignData } = await supabase
      .from('islamic_teacher_classes')
      .select('*, users(full_name), classes(name)')
    setAssignments(assignData || [])
  }

  async function toggleAssignment(teacherId: string, classId: string) {
    setSaving(true)
    const existing = assignments.find(
      a => a.teacher_id === teacherId && a.class_id === classId
    )
    if (existing) {
      await supabase.from('islamic_teacher_classes').delete().eq('id', existing.id)
    } else {
      await supabase.from('islamic_teacher_classes').insert({
        teacher_id: teacherId,
        class_id: classId,
      })
    }
    loadData()
    setSaving(false)
  }

  function isAssigned(teacherId: string, classId: string) {
    return assignments.some(a => a.teacher_id === teacherId && a.class_id === classId)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin/islamic')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-lg font-medium text-gray-900">🕌 Islamic Teacher — Class Assignment</h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {teachers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Henüz Islamic Teacher yok.</p>
            <button
              onClick={() => router.push('/admin/teachers')}
              className="mt-3 text-sm text-blue-500 hover:text-blue-700"
            >
              Manage Staff sayfasından ekle →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {teachers.map(teacher => (
              <div key={teacher.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">🕌 {teacher.full_name}</p>
                  <p className="text-xs text-gray-400">{teacher.email}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-400 mb-3">Atanacak sınıfları seç:</p>
                  {classes.length === 0 ? (
                    <p className="text-sm text-gray-400">İslami sınıf yok.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {classes.map(cls => {
                        const assigned = isAssigned(teacher.id, cls.id)
                        return (
                          <div key={cls.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{cls.name}</span>
                            <button
                              onClick={() => toggleAssignment(teacher.id, cls.id)}
                              disabled={saving}
                              className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                                assigned
                                  ? 'bg-green-100 text-green-600 hover:bg-red-50 hover:text-red-500'
                                  : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                              }`}
                            >
                              {assigned ? '✓ Atandı' : '+ Ata'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}