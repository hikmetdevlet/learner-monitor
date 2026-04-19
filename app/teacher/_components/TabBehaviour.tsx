'use client'
import { useState, useMemo } from 'react'
import { INCIDENT_TYPES, PRAISE_TYPES } from '../_types/constants'

export function TabBehaviour({ data }: any) {
  const { teacher, allLearners, incidents, praises, saveBehaviour, deleteBehaviour } = data
  const [behModal,    setBehModal]    = useState<'incident' | 'praise' | null>(null)
  const [behLearner,  setBehLearner]  = useState('')
  const [behType,     setBehType]     = useState('')
  const [behNote,     setBehNote]     = useState('')
  const [behSaving,   setBehSaving]   = useState(false)
  const [behView,     setBehView]     = useState<'incidents' | 'praise'>('incidents')
  const [behClassFilter, setBehClassFilter] = useState('')

  const behClasses = useMemo(() => [...new Map(allLearners.map((l: any) => [l.class_id, { id: l.class_id, name: l.class_name }])).values()], [allLearners])
  const filtL   = behClassFilter ? allLearners.filter((l: any) => l.class_id === behClassFilter) : allLearners
  const filtInc = behClassFilter ? incidents.filter((i: any) => allLearners.find((l: any) => l.id === i.learner_id && l.class_id === behClassFilter)) : incidents
  const filtPr  = behClassFilter ? praises.filter((p: any) => allLearners.find((l: any) => l.id === p.learner_id && l.class_id === behClassFilter)) : praises

  async function save() {
    if (!behLearner || !behType || !teacher) return
    setBehSaving(true)
    await saveBehaviour(teacher, behLearner, behModal === 'incident' ? 'incident' : 'praise', behType, behNote)
    setBehModal(null); setBehLearner(''); setBehType(''); setBehNote(''); setBehSaving(false)
  }

  const list = behView === 'incidents' ? filtInc : filtPr
  const types = behView === 'incidents' ? INCIDENT_TYPES : PRAISE_TYPES

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div><div className="h1">Behaviour</div><div className="sub">Incidents & praise</div></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setBehModal('praise')} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#15803D', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Praise</button>
          <button onClick={() => setBehModal('incident')} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>+ Incident</button>
        </div>
      </div>

      {/* Filter */}
      {behClasses.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <button className={`fp ${!behClassFilter ? 'on' : ''}`} onClick={() => setBehClassFilter('')}>All Classes</button>
          {behClasses.map((c: any) => <button key={c.id} className={`fp ${behClassFilter === c.id ? 'on' : ''}`} onClick={() => setBehClassFilter(c.id)}>{c.name}</button>)}
        </div>
      )}

      {/* Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button className={`fp ${behView === 'incidents' ? 'on' : ''}`} onClick={() => setBehView('incidents')}>Incidents ({filtInc.length})</button>
        <button className={`fp ${behView === 'praise' ? 'on' : ''}`} onClick={() => setBehView('praise')}>Praise ({filtPr.length})</button>
      </div>

      {list.length === 0
        ? <div className="card"><div className="empty">No {behView} recorded yet</div></div>
        : list.map((b: any) => {
            const typeCfg = types.find((t: any) => t.key === b.category) || { c: '#888', bg: '#F5F5F3', label: b.category }
            return (
              <div key={b.id} style={{ background: '#fff', border: `1px solid ${typeCfg.bg}`, borderLeft: `3px solid ${typeCfg.c}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{b.learners?.full_name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, background: typeCfg.bg, color: typeCfg.c, padding: '2px 7px', borderRadius: 5 }}>{typeCfg.label}</span>
                    {b.description && <span style={{ fontSize: 11, color: '#666' }}>{b.description}</span>}
                    <span style={{ fontSize: 10, color: '#AAA' }}>{b.log_date}</span>
                  </div>
                </div>
                <button onClick={() => deleteBehaviour(b.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #EFEFED', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC', flexShrink: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            )
          })}

      {/* Log modal */}
      {behModal && (
        <div className="modal-over" onClick={e => { if (e.target === e.currentTarget) setBehModal(null) }}>
          <div className="modal">
            <div className="mhead">
              <div className="mtitle" style={{ color: behModal === 'incident' ? '#DC2626' : '#15803D' }}>{behModal === 'incident' ? '⚠ Log Incident' : '★ Log Praise'}</div>
              <button onClick={() => setBehModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="mbody">
              <div className="mfield">
                <label>Learner</label>
                <select className="mfinput" style={{ height: 36 }} value={behLearner} onChange={e => setBehLearner(e.target.value)}>
                  <option value="">— Select learner</option>
                  {filtL.map((l: any) => <option key={l.id} value={l.id}>{l.full_name}{l.class_name ? ` (${l.class_name})` : ''}</option>)}
                </select>
              </div>
              <div className="mfield">
                <label>{behModal === 'incident' ? 'Incident type' : 'Praise category'}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {types.map((t: any) => (
                    <button key={t.key} onClick={() => setBehType(t.key)}
                      style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${behType === t.key ? t.c : '#EFEFED'}`, background: behType === t.key ? t.bg : '#fff', color: behType === t.key ? t.c : '#888', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mfield">
                <label>Note (optional)</label>
                <textarea className="mfinput" rows={3} value={behNote} onChange={e => setBehNote(e.target.value)} placeholder="Any additional context…" />
              </div>
              <button className="msave" style={{ background: behModal === 'incident' ? '#DC2626' : '#15803D' }} onClick={save} disabled={behSaving || !behLearner || !behType}>
                {behSaving ? '…' : `Log ${behModal}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
