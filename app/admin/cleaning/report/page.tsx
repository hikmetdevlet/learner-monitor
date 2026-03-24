'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function CleaningReport() {
  const [locations, setLocations] = useState<any[]>([])
  const [report, setReport] = useState<any[]>([])
  const [weekReport, setWeekReport] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today')
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadReport() }, [])

  async function loadReport() {
    setLoading(true)
    const { data: locs } = await supabase
      .from('cleaning_locations').select('*').eq('is_active', true).order('floor').order('name')
    setLocations(locs || [])

    // Today's report
    const todayReport = []
    for (const loc of locs || []) {
      const { data: items } = await supabase
        .from('cleaning_checklist_items').select('*')
        .or(`location_id.eq.${loc.id},is_global.eq.true`).eq('is_active', true)

      const { data: logs } = await supabase
        .from('cleaning_logs').select('*, users(full_name)')
        .eq('location_id', loc.id).eq('log_date', today)

      const { data: assigns } = await supabase
        .from('cleaning_assignments').select('*, learners(full_name)')
        .eq('location_id', loc.id).eq('is_active', true)

      const total = items?.length || 0
      const done = logs?.filter(l => l.status === 'done').length || 0
      const partial = logs?.filter(l => l.status === 'partial').length || 0
      const notDone = logs?.filter(l => l.status === 'not_done').length || 0
      const unchecked = total - (logs?.length || 0)
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const marked = (logs?.length || 0) > 0
      const markedBy = logs?.[0]?.users?.full_name || null

      todayReport.push({
        location: loc, items: items || [], logs: logs || [],
        assigns: assigns || [], total, done, partial, notDone, unchecked, pct, marked, markedBy
      })
    }
    setReport(todayReport)

    // Weekly report — last 7 days
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })

      const dayData = []
      for (const loc of locs || []) {
        const { data: items } = await supabase
          .from('cleaning_checklist_items').select('id')
          .or(`location_id.eq.${loc.id},is_global.eq.true`).eq('is_active', true)

        const { data: logs } = await supabase
          .from('cleaning_logs').select('status')
          .eq('location_id', loc.id).eq('log_date', dateStr)

        const total = items?.length || 0
        const done = logs?.filter(l => l.status === 'done').length || 0
        dayData.push({ location: loc, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0, marked: (logs?.length || 0) > 0 })
      }
      days.push({ date: dateStr, day: dayName, locations: dayData })
    }
    setWeekReport(days)
    setLoading(false)
  }

  const floors = [...new Set(locations.map(l => l.floor || 'No floor assigned'))].sort()

  const todayDone = report.filter(r => r.marked && r.pct === 100).length
  const todayPartial = report.filter(r => r.marked && r.pct < 100 && r.pct > 0).length
  const todayUnchecked = report.filter(r => !r.marked).length

  return (
    <main style={{ minHeight: '100vh', background: '#F8F7F4', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; }
        .topbar { background:#fff; border-bottom:1px solid #EFEFED; padding:0 32px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:10; }
        .topbar-left { display:flex; align-items:center; gap:12px; }
        .back-btn { display:flex; align-items:center; gap:6px; font-size:13px; color:#999; background:none; border:none; cursor:pointer; padding:6px 10px; border-radius:8px; transition:all 0.15s; font-family:'DM Sans',sans-serif; }
        .back-btn:hover { background:#F5F5F3; color:#333; }
        .page-title { font-size:15px; font-weight:500; color:#1A1A1A; }
        .divider { color:#DDD; }
        .wrap { max-width:900px; margin:0 auto; padding:28px 32px; }
        .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:24px; }
        .sum-card { background:#fff; border:1px solid #EFEFED; border-radius:14px; padding:18px; text-align:center; }
        .sum-n { font-size:32px; font-weight:500; line-height:1; }
        .sum-l { font-size:11px; color:#AAA; margin-top:5px; text-transform:uppercase; letter-spacing:0.05em; }
        .tab-row { display:flex; gap:6px; margin-bottom:20px; }
        .tab-btn { padding:8px 18px; border-radius:9px; border:1px solid #EFEFED; background:#fff; font-size:13px; color:#666; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; }
        .tab-btn.active { background:#1A1A1A; color:white; border-color:#1A1A1A; }
        .floor-group { margin-bottom:20px; }
        .floor-label { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.06em; padding:8px 0; border-bottom:1px solid #EFEFED; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
        .loc-report-card { background:#fff; border:1px solid #EFEFED; border-radius:12px; padding:16px 20px; margin-bottom:8px; }
        .loc-report-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .loc-report-name { font-size:14px; font-weight:500; color:#1A1A1A; }
        .loc-report-sub { font-size:11px; color:#AAA; margin-top:2px; }
        .status-pill { font-size:11px; font-weight:500; padding:4px 10px; border-radius:20px; }
        .progress-bar { width:100%; height:6px; background:#F0F0EE; border-radius:3px; overflow:hidden; margin-bottom:10px; }
        .progress-fill { height:100%; border-radius:3px; transition:width 0.4s; }
        .detail-row { display:flex; gap:16px; flex-wrap:wrap; }
        .detail-item { font-size:12px; color:#888; display:flex; align-items:center; gap:4px; }
        .detail-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .items-breakdown { margin-top:10px; border-top:1px solid #F5F5F3; padding-top:10px; }
        .item-row { display:flex; align-items:center; justify-content:space-between; padding:5px 0; border-bottom:1px solid #FAFAF8; }
        .item-row:last-child { border-bottom:none; }
        .item-q { font-size:12px; color:#555; flex:1; }
        .item-note { font-size:11px; color:#AAA; font-style:italic; margin-left:8px; }
        .item-status { font-size:10px; font-weight:500; padding:2px 7px; border-radius:6px; flex-shrink:0; }
        .assignees { display:flex; flex-wrap:wrap; gap:4px; margin-top:8px; }
        .assignee-chip { font-size:10px; background:#F0F9FF; color:#0369A1; border:1px solid #BFDBFE; padding:2px 8px; border-radius:6px; }
        .not-checked-card { background:#FAFAF8; border:1px solid #EFEFED; border-radius:12px; padding:14px 20px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; }
        .week-table-wrap { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; }
        .week-table { width:100%; border-collapse:collapse; }
        .week-table th { padding:10px 14px; font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; background:#FAFAF8; border-bottom:1px solid #EFEFED; text-align:left; }
        .week-table td { padding:10px 14px; font-size:13px; border-bottom:1px solid #F8F8F6; }
        .week-table tr:last-child td { border-bottom:none; }
        .week-cell { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:2px; }
        .week-pct { font-size:12px; font-weight:500; }
        .week-bar { width:36px; height:4px; background:#F0F0EE; border-radius:2px; overflow:hidden; margin-top:2px; }
        .week-bar-fill { height:100%; border-radius:2px; }
        .empty-state { padding:48px; text-align:center; color:#CCC; font-size:13px; }
      `}</style>

      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin/cleaning')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span className="page-title">Cleaning Report</span>
        </div>
        <button onClick={loadReport} style={{ fontSize: 13, color: '#0369A1', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>

      <div className="wrap">
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : (
          <>
            {/* Summary */}
            <div className="summary-grid">
              <div className="sum-card">
                <div className="sum-n" style={{ color: '#15803D' }}>{todayDone}</div>
                <div className="sum-l">Fully done today</div>
              </div>
              <div className="sum-card">
                <div className="sum-n" style={{ color: '#EAB308' }}>{todayPartial}</div>
                <div className="sum-l">Partially done</div>
              </div>
              <div className="sum-card">
                <div className="sum-n" style={{ color: '#AAA' }}>{todayUnchecked}</div>
                <div className="sum-l">Not checked</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tab-row">
              <button className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`} onClick={() => setActiveTab('today')}>Today's detail</button>
              <button className={`tab-btn ${activeTab === 'week' ? 'active' : ''}`} onClick={() => setActiveTab('week')}>Weekly overview</button>
            </div>

            {/* TODAY */}
            {activeTab === 'today' && (
              <div>
                {floors.map(floor => {
                  const floorReport = report.filter(r => (r.location.floor || 'No floor assigned') === floor)
                  return (
                    <div key={floor} className="floor-group">
                      <div className="floor-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                        {floor}
                      </div>
                      {floorReport.map(r => (
                        !r.marked ? (
                          <div key={r.location.id} className="not-checked-card">
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>{r.location.name}</div>
                              {r.assigns.length > 0 && (
                                <div className="assignees">
                                  {r.assigns.map((a: any) => <span key={a.id} className="assignee-chip">{a.learners?.full_name}</span>)}
                                </div>
                              )}
                            </div>
                            <span className="status-pill" style={{ background: '#FEF2F2', color: '#DC2626' }}>Not checked today</span>
                          </div>
                        ) : (
                          <div key={r.location.id} className="loc-report-card">
                            <div className="loc-report-header">
                              <div>
                                <div className="loc-report-name">{r.location.name}</div>
                                <div className="loc-report-sub">
                                  {r.markedBy && `Checked by ${r.markedBy} · `}{r.done}/{r.total} tasks done
                                </div>
                              </div>
                              {r.pct === 100 ? (
                                <span className="status-pill" style={{ background: '#F0FDF4', color: '#15803D' }}>✓ All done</span>
                              ) : r.pct >= 50 ? (
                                <span className="status-pill" style={{ background: '#FEFCE8', color: '#A16207' }}>{r.pct}% done</span>
                              ) : (
                                <span className="status-pill" style={{ background: '#FEF2F2', color: '#DC2626' }}>{r.pct}% done</span>
                              )}
                            </div>

                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${r.pct}%`, background: r.pct === 100 ? '#22C55E' : r.pct >= 50 ? '#EAB308' : '#EF4444' }} />
                            </div>

                            <div className="detail-row">
                              <div className="detail-item">
                                <div className="detail-dot" style={{ background: '#22C55E' }} />
                                {r.done} done
                              </div>
                              {r.partial > 0 && <div className="detail-item">
                                <div className="detail-dot" style={{ background: '#EAB308' }} />
                                {r.partial} partial
                              </div>}
                              {r.notDone > 0 && <div className="detail-item">
                                <div className="detail-dot" style={{ background: '#EF4444' }} />
                                {r.notDone} not done
                              </div>}
                              {r.unchecked > 0 && <div className="detail-item">
                                <div className="detail-dot" style={{ background: '#CCC' }} />
                                {r.unchecked} unchecked
                              </div>}
                            </div>

                            {r.assigns.length > 0 && (
                              <div className="assignees">
                                {r.assigns.map((a: any) => <span key={a.id} className="assignee-chip">{a.learners?.full_name}</span>)}
                              </div>
                            )}

                            {/* Item breakdown — show problematic items */}
                            {r.logs.filter((l: any) => l.status !== 'done').length > 0 && (
                              <div className="items-breakdown">
                                <div style={{ fontSize: 11, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Issues</div>
                                {r.logs.filter((l: any) => l.status !== 'done').map((log: any) => {
                                  const item = r.items.find((i: any) => i.id === log.checklist_item_id)
                                  return (
                                    <div key={log.id} className="item-row">
                                      <span className="item-q">{item?.question}</span>
                                      {log.note && <span className="item-note">"{log.note}"</span>}
                                      <span className="item-status" style={{
                                        background: log.status === 'partial' ? '#FEFCE8' : '#FEF2F2',
                                        color: log.status === 'partial' ? '#A16207' : '#DC2626',
                                      }}>
                                        {log.status === 'partial' ? 'Partial' : 'Not done'}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* WEEKLY */}
            {activeTab === 'week' && (
              <div className="week-table-wrap">
                <table className="week-table">
                  <thead>
                    <tr>
                      <th>Location</th>
                      {weekReport.map(d => (
                        <th key={d.date} style={{ textAlign: 'center', minWidth: 70 }}>
                          {d.day}
                          <div style={{ fontSize: 10, color: '#CCC', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                            {new Date(d.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map(loc => (
                      <tr key={loc.id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13, color: '#1A1A1A' }}>{loc.name}</div>
                          {loc.floor && <div style={{ fontSize: 11, color: '#AAA' }}>{loc.floor}</div>}
                        </td>
                        {weekReport.map(d => {
                          const locDay = d.locations.find((l: any) => l.location.id === loc.id)
                          return (
                            <td key={d.date}>
                              {!locDay?.marked ? (
                                <div className="week-cell">
                                  <span style={{ fontSize: 11, color: '#CCC' }}>—</span>
                                </div>
                              ) : (
                                <div className="week-cell">
                                  <span className="week-pct" style={{ color: locDay.pct === 100 ? '#15803D' : locDay.pct >= 50 ? '#A16207' : '#DC2626' }}>
                                    {locDay.pct}%
                                  </span>
                                  <div className="week-bar">
                                    <div className="week-bar-fill" style={{
                                      width: `${locDay.pct}%`,
                                      background: locDay.pct === 100 ? '#22C55E' : locDay.pct >= 50 ? '#EAB308' : '#EF4444',
                                    }} />
                                  </div>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}