// ─── Shared types for Islamic Teacher Dashboard ───────────────────────────

export interface Learner {
  id: string
  full_name: string
}

export interface ClassRecord {
  id: string
  name: string
  class_type: string
}

export interface AttendanceRecord {
  learner_id: string
  status: 'present' | 'late' | 'absent' | 'excused'
  attendance_date: string
  note?: string
}

export interface TopicProgress {
  learner_id: string
  topic_id: string
  completed: boolean
  completed_date: string | null
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

export interface CurriculumProgress {
  id: string
  topic_id: string
  teacher_id: string
  is_completed: boolean
  completed_at?: string
  taught_date?: string
  understanding?: 'good' | 'mixed' | 'difficult'
  feedback_note?: string
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

export interface QuizSession {
  id: string
  title: string
  status: 'pending' | 'sent'
  sent_at?: string
  created_at: string
  class_id?: string
  topic_id?: string
  classes?: { name: string }
  curriculum_topics?: {
    title: string
    curriculum_subjects?: { name: string }
  }
}

export interface QuizResult {
  quiz_session_id: string
  learner_id: string
  score: number
  total: number
  percentage: number
}

export interface ReportRow {
  learner: Learner
  classId: string
  className: string
  attPctCurr: number | null
  attPctPrev: number | null
  attChange: number | null
  topicsThisWeek: number
  topicsLastWeek: number
  topicChange: number
  topicsTotal: number
  topicsPossible: number
  effortScore: number
  overallAtt: number
  streak: number
  consecutiveAbsent: number
  classRank: number
  incidentCount: number
  praiseCount: number
  subBreakdown: SubjectBreakdown[]
}

export interface SubjectBreakdown {
  subjectId: string
  subjectName: string
  completed: number
  total: number
  pct: number
}

export interface SharedTeacherState {
  teacherId: string
  teacherName: string
  activeYearId: string | null
  activeYearName: string | null
  myClasses: ClassRecord[]
  classLearners: Record<string, Learner[]>
  incidents: BehaviourRecord[]
  praises: BehaviourRecord[]
  rawAttData: Record<string, AttendanceRecord[]>
}