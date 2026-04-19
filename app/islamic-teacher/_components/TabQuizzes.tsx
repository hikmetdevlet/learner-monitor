'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { fmt } from '../_types/constants'

export function TabQuizzes({ data }: any) {
  const { quizSessions, quizResults } = data
  const router = useRouter()

  const totalQuizzes = quizSessions.length
  const sentQuizzes  = quizSessions.filter((q: any) => q.status === 'sent').length
  const avgPct = quizResults.length > 0
    ? Math.round(quizResults.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / quizResults.length)
    : null

  // Group sessions by subject for the performance table
  const subjectMap = useMemo(() => {
    const m: Record<string, { name: string; sessions: any[]; results: any[] }> = {}
    quizSessions.forEach((qs: any) => {
      const key = qs.curriculum_topics?.curriculum_subjects?.name || 'General'
      if (!m[key]) m[key] = { name: key, sessions: [], results: [] }
      m[key].sessions.push(qs)
      m[key].results.push(...quizResults.filter((r: any) => r.quiz_session_id === qs.id))
    })
    return m
  }, [quizSessions, quizResults])

  // Colour helpers
  const sc  = (pct: number | null) => pct == null ? '#AAA' : pct >= 70 ? '#15803D' : pct >= 50 ? '#A16207' : '#DC2626'
  const sbg = (pct: number | null) => pct == null ? '#F5F5F3' : pct >= 70 ? '#F0FDF4' : pct >= 50 ? '#FEFCE8' : '#FEF2F2'

  return (
    <div>
      {/* Header */}
      <div className="hrow">
        <div>
          <div className="h1">Quizzes</div>
          <div className="sub">Sessions &amp; performance by subject</div>
        </div>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
          onClick={() => router.push('/teacher/quiz')}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Quiz Builder
        </button>
      </div>

      {/* Overview stats */}
      <div className="s3" style={{ marginBottom: 14 }}>
        <div className="scard">
          <div className="sn">{totalQuizzes}</div>
          <div className="sl">Total Quizzes</div>
        </div>
        <div className="scard">
          <div className="sn" style={{ color: '#15803D' }}>{sentQuizzes}</div>
          <div className="sl">Sent</div>
        </div>
        <div className="scard">
          <div className="sn" style={{ color: sc(avgPct) }}>{avgPct != null ? `${avgPct}%` : '—'}</div>
          <div className="sl">Avg Score</div>
        </div>
      </div>

      {/* Performance by subject */}
      {Object.keys(subjectMap).length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ch"><span className="ct">Performance by Subject</span></div>
          {Object.entries(subjectMap).map(([key, sub]) => {
            const avg  = sub.results.length > 0
              ? Math.round(sub.results.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / sub.results.length)
              : null
            const sent = sub.sessions.filter((s: any) => s.status === 'sent').length
            return (
              <div key={key} className="lr">
                <div>
                  <div className="rn">{sub.name}</div>
                  <div className="rs">{sub.sessions.length} quiz{sub.sessions.length !== 1 ? 'zes' : ''} · {sent} sent</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 55, height: 3, background: '#F0F0EE', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: sc(avg), width: `${avg ?? 0}%` }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc(avg), background: sbg(avg), padding: '2px 8px', borderRadius: 6, minWidth: 38, textAlign: 'center' }}>
                    {avg != null ? `${avg}%` : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Individual sessions */}
      {quizSessions.length > 0 ? (
        <div className="card">
          <div className="ch"><span className="ct">All Sessions</span></div>
          {quizSessions.map((qs: any) => {
            const res = quizResults.filter((r: any) => r.quiz_session_id === qs.id)
            const avg = res.length > 0
              ? Math.round(res.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / res.length)
              : null
            const isSent = qs.status === 'sent'
            return (
              <div key={qs.id} className="lr">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="rn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {qs.title}
                    <span className="bdg" style={{ background: isSent ? '#F0FDF4' : '#F5F5F3', color: isSent ? '#15803D' : '#888' }}>
                      {isSent ? '✓ Sent' : 'Pending'}
                    </span>
                  </div>
                  <div className="rs">
                    {qs.classes?.name}
                    {qs.curriculum_topics?.curriculum_subjects?.name && ` · ${qs.curriculum_topics.curriculum_subjects.name}`}
                    {qs.curriculum_topics?.title && ` · ${qs.curriculum_topics.title}`}
                    {isSent && qs.sent_at && ` · ${fmt(qs.sent_at)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {res.length > 0 && <span style={{ fontSize: 10, color: '#AAA' }}>{res.length} results</span>}
                  <span style={{ fontSize: 12, fontWeight: 700, color: sc(avg), background: sbg(avg), padding: '2px 8px', borderRadius: 6, minWidth: 38, textAlign: 'center' }}>
                    {avg != null ? `${avg}%` : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #EFEFED', borderRadius: 11, padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>No quizzes yet</div>
          <div style={{ fontSize: 10, color: '#AAA', marginBottom: 12 }}>Create your first quiz in the Quiz Builder</div>
          <button
            style={{ background: '#15803D', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
            onClick={() => router.push('/teacher/quiz')}>
            Go to Quiz Builder →
          </button>
        </div>
      )}
    </div>
  )
}
