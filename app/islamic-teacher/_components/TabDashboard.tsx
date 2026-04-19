'use client'
import { useMemo } from 'react'
import { topicStatus, fmt } from '../_types/constants'

export function TabDashboard({ data, setActiveTab }: any) {
  const { attStats, weeklyAtt, currTopics, currProgress, allLearners, myClasses } = data

  const overdue = currTopics.filter((t: any) =>
    topicStatus(t) === 'overdue' && !currProgress.find((p: any) => p.topic_id === t.id && p.is_completed)
  ).length
  const thisWk = currTopics.filter((t: any) => topicStatus(t) === 'this-week').length
  const avgAtt = attStats.length > 0
    ? Math.round(attStats.reduce((a: number, s: any) => a + s.pct, 0) / attStats.length)
    : 0

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="h1">Good morning, {data.teacherName.split(' ')[0]}</div>
        <div className="sub">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div className="s3">
        <div className="scard"><div className="sn" style={{ color: '#15803D' }}>{myClasses.length}</div><div className="sl">Classes</div></div>
        <div className="scard"><div className="sn" style={{ color: '#1D4ED8' }}>{allLearners.length}</div><div className="sl">Learners</div></div>
        <div className="scard">
          <div className="sn" style={{ color: avgAtt < 70 ? '#EF4444' : '#15803D' }}>{avgAtt}%</div>
          <div className="sl">Avg Attendance</div>
        </div>
      </div>

      {overdue > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 9, padding: '9px 13px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{overdue} overdue topic{overdue > 1 ? 's' : ''}</span>
          <button className="go" style={{ marginLeft: 'auto', background: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5' }} onClick={() => setActiveTab('curriculum')}>View →</button>
        </div>
      )}

      {weeklyAtt.length > 0 && (
        <div className="card">
          <div className="ch"><span className="ct">Attendance This Week</span></div>
          <div className="week-chart">
            {weeklyAtt.map((d: any, i: number) => (
              <div key={i} className="wbw">
                <span className="wpct" style={{ color: d.hasData ? (d.pct >= 70 ? '#15803D' : '#EF4444') : '#CCC' }}>{d.hasData ? `${d.pct}%` : '—'}</span>
                <div className="wbt"><div className="wbf" style={{ height: `${d.hasData ? Math.max(d.pct, 4) : 4}%`, background: d.hasData ? (d.pct >= 70 ? '#22C55E' : '#EF4444') : '#E5E5E5' }} /></div>
                <span className="wday">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {thisWk > 0 && (
        <div className="card">
          <div className="ch"><span className="ct">This Week's Topics</span><button className="go" onClick={() => setActiveTab('curriculum')}>All →</button></div>
          {currTopics.filter((t: any) => topicStatus(t) === 'this-week').slice(0, 4).map((t: any) => {
            const p = currProgress.find((x: any) => x.topic_id === t.id)
            return (
              <div key={t.id} className="lr">
                <div>
                  <div className="rn" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {p?.is_completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    {t.title}
                  </div>
                  <div className="rs">{t.curriculum_subjects?.name} · {t.curriculum_subjects?.classes?.name}</div>
                </div>
                <span className="bdg" style={{ background: p?.is_completed ? '#DCFCE7' : '#E0F2FE', color: p?.is_completed ? '#16A34A' : '#0284C7' }}>{p?.is_completed ? '✓' : 'This Week'}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="card">
        <div className="ch">
          <span className="ct">Learner Attendance</span>
          <button className="go" onClick={() => setActiveTab('report')}>Full Report →</button>
        </div>
        {attStats.slice(0, 8).map((s: any) => (
          <div key={`${s.learner.id}-${s.cls.id}`} className="lr">
            <div style={{ minWidth: 110 }}>
              <div className="rn">{s.learner.full_name}</div>
              <div className="rs">{s.cls.name}{s.streak > 0 ? ` · 🔥 ${s.streak}d` : ''}</div>
            </div>
            <div className="pbar">
              <div className="btrack"><div className="bfill" style={{ width: `${s.pct}%`, background: s.pct >= 70 ? '#22C55E' : '#EF4444' }} /></div>
              <span className="pt" style={{ color: s.pct >= 70 ? '#15803D' : '#DC2626' }}>{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
