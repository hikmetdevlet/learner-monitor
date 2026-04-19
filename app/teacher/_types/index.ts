// ─── Secular Teacher Types ─────────────────────────────────────────────────

export interface Teacher {
  id: string
  full_name: string
  display_name?: string
  role: string
  class_id?: string
}

export interface ClassRecord {
  id: string
  name: string
  class_type: string
}

export interface Learner {
  id: string
  full_name: string
}

export interface AttendanceRecord {
  learner_id: string
  status: 'present' | 'late' | 'absent' | 'excused'
  attendance_date: string
  note?: string
}

export interface BehaviourRecord {
  id: string
  learner_id: string
  teacher_id: string
  class_id?: string
  type: 'incident' | 'praise'
  category: string
  description?: string
  log_date: string
  created_at: string
  learners?: { full_name: string }
}

export interface CurriculumTopic {
  id: string
  title: string
  description?: string
  planned_start?: string
  planned_end?: string
  order_num: number
  track_per_learner: boolean
  parent_topic_id?: string
  subject_id: string
  curriculum_subjects?: {
    id: string
    name: string
    class_id: string
    classes?: { id: string; name: string }
  }
}

export interface LessonPlan {
  id: string
  topic_id: string
  teacher_id: string
  class_id?: string
  academic_year_id?: string
  plan_date?: string
  objectives?: string
  activities?: string
  resources?: string
  assessment?: string
  notes?: string
  status: 'draft' | 'submitted'
  submitted_at?: string
  created_at: string
}

export interface HomeworkAssignment {
  id: string
  title: string
  description?: string
  due_date: string
  class_id: string
  timetable_id?: string
  learner_id?: string
  teacher_id: string
  max_marks: number
  created_at: string
  classes?: { name: string }
  timetable?: { name: string }
  learners?: { full_name: string }
}

export interface HomeworkSubmission {
  id: string
  assignment_id: string
  learner_id: string
  status: 'not_submitted' | 'submitted_on_time' | 'submitted_late' | 'incomplete'
  marks?: number
  feedback?: string
  marked_at?: string
  learners?: { id: string; full_name: string }
}

export interface QuizSession {
  id: string
  title: string
  status: string
  sent_at?: string
  question_ids?: string[]
  class_id?: string
  curriculum_topics?: { title: string }
  classes?: { name: string }
  users?: { full_name: string }
}

export interface Exam {
  id: string
  title: string
  exam_date: string
  class_id: string
  description?: string
  max_marks?: number
  teacher_id: string
  classes?: { name: string }
}

export interface CalEvent {
  id: string
  title: string
  event_date: string
  end_date?: string
  event_type: string
  description?: string
  is_all_school: boolean
}

// Learner report data
export interface LearnerReportRow {
  learner: Learner
  classId: string
  className: string
  attPct: number | null
  attPresent: number
  attTotal: number
  hwCompleted: number
  hwTotal: number
  hwPct: number | null
  avgMarks: number | null
  incidentCount: number
  praiseCount: number
  streak: number
}
