'use client'
import { useState } from 'react'
import { INCIDENT_TYPES, PRAISE_TYPES, fmtDT } from '../_types/constants'

export function TabBehaviour({ data }: any) {
  const { myClasses, classLearners, incidents, praises, learnerClassMap, addBehaviourRecord, deleteBehaviourRecord } = data

  const [tab, setTab]           = useState<'incidents' | 'praise'>('incidents')
  const [clsFilter, setClsFilter] = useState<string | null>(null)
  const [modal, setModal]       = useState<'incident' | 'praise' | null>(null)
  const [learner, setLearner]   = useState('')
  const [type, setType]         = useState('')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  const filtInc = clsFilter
    ? incidents.filter((i: any) => (classLearners[clsFilter] || []).some((l: any) => l.id === i.learner_id))
    : incidents
  const filtPr = clsFilter
    ? praises.filter((i: any) => (classLearners[clsFilter] || []).some((l: any) => l.id === i.learner_id))
    : praises

  async function save() {
    if (!learner || !type || !modal) return
    setSaving(true)
    await addBehaviourRecord(modal, learner, type, note)
    setModal(null); setLearner(''); setType(''); setNote(''); setSaving(false)
  }

  function closeModal() { setModal(null); setLearner(''); setType(''); setNote('') }

  return (
    <div>
      {/* Modal */}
      {modal && (
        <div className="mov" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="mo">
            <div className="mtit">{modal === 'incident' ? 'Discipline Record' : 'Praise Record'}</div>
            <div className="msub">{modal === 'incident' ? 'Log negative behaviour' : 'Log positive behaviour'}</div>
            <div className="mlbl">Learner</div>
            <select className="msel" value={learner} onChange={e => setLearner(e.target.value)}>
              <option value="">— Select learner —</option>
              {myClasses.map((c: any) => (
                <optgroup key={c.id} label={c.name}>
                  {(classLearners[c.id] || []).map((l: any) => (
                    <option key={l.id} value={l.id}>{l.full_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="mlbl">Category</div>
            <div className="tgrid">
              {(modal === 'incident' ? INCIDENT_TYPES : PRAISE_TYPES).map(t => (
                <button key={t.key}
                  className={`tpill ${type === t.key ? 'sel' : ''}`}
                  style={type === t.key ? { background: t.bg, borderColor: t.c, color: t.c } : {}}
                  onClick={() => setType(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mlbl" style={{ marginBottom: 5 }}>Note</div>
            <textarea className="mta"
              placeholder={modal === 'incident' ? 'What happened?' : 'Why praised?'}
              value={note} onChange={e => setNote(e.target.value)} rows={2} />
            <div className="macts">
              <button className="mcan" onClick={closeModal}>Cancel</button>
              <button className="msave"
                style={{ background: modal === 'incident' ? '#DC2626' : '#15803D' }}
                onClick={save} disabled={saving || !learner || !type}>
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="hrow" style={{ marginBottom: 12 }}>
        <div><div className="h1">Behaviour</div><div className="sub">Incidents &amp; praise</div></div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="bab" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
            onClick={() => { setModal('incident'); setType('') }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Incident
          </button>
          <button className="bab" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
            onClick={() => { setModal('praise'); setType('') }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Praise
          </button>
        </div>
      </div>

      {/* Segment */}
      <div className="bseg">
        <button className={`bseg-btn ${tab === 'incidents' ? 'on' : ''}`} onClick={() => setTab('incidents')}>Incidents ({filtInc.length})</button>
        <button className={`bseg-btn ${tab === 'praise' ? 'on' : ''}`} onClick={() => setTab('praise')}>Praise ({filtPr.length})</button>
      </div>

      {/* Class filter */}
      {myClasses.length > 1 && (
        <div className="bcf">
          <button className={`fp ${!clsFilter ? 'on' : ''}`} onClick={() => setClsFilter(null)}>All</button>
          {myClasses.map((c: any) => (
            <button key={c.id} className={`fp ${clsFilter === c.id ? 'on' : ''}`} onClick={() => setClsFilter(c.id)}>{c.name}</button>
          ))}
        </div>
      )}

      {/* Records */}
      {(tab === 'incidents' ? filtInc : filtPr).length === 0 ? (
        <div className="card"><div className="empty">No {tab === 'incidents' ? 'incident' : 'praise'} records</div></div>
      ) : (tab === 'incidents' ? filtInc : filtPr).map((i: any) => {
        const types = tab === 'incidents' ? INCIDENT_TYPES : PRAISE_TYPES
        const cfg   = types.find(t => t.key === i.category) || types[types.length - 1]
        return (
          <div key={i.id} className="brec" style={{ borderLeft: `3px solid ${cfg.c}` }}>
            <div className="brh">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <div className="blrn">{i.learners?.full_name}</div>
                  {learnerClassMap[i.learner_id] && <span className="bctag">{learnerClassMap[i.learner_id]}</span>}
                </div>
                <span className="btyp" style={{ background: cfg.bg, color: cfg.c }}>{cfg.label}</span>
              </div>
              <button className="delb" onClick={() => deleteBehaviourRecord(i.id)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
            {i.description && <div className="bnote">{i.description}</div>}
            <div className="btime">{fmtDT(i.created_at)}</div>
          </div>
        )
      })}
    </div>
  )
}
