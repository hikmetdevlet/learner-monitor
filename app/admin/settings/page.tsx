'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Activity = { id: string; name: string; is_salaah: boolean; is_active: boolean }

export default function SettingsPage() {
  const [appName, setAppName] = useState('')
  const [threshold, setThreshold] = useState('70')
  const [activities, setActivities] = useState<Activity[]>([])
  const [newActivity, setNewActivity] = useState('')
  const [newIsSalaah, setNewIsSalaah] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [adding, setAdding] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: settingsData }, { data: actsData }] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('daily_activities').select('*').order('is_salaah', { ascending: false }).order('name'),
    ])
    settingsData?.forEach(s => {
      if (s.key === 'app_name') setAppName(s.value)
      if (s.key === 'at_risk_threshold') setThreshold(s.value)
      if (s.key === 'admin_email') setAdminEmail(s.value || '')
    })
    setActivities(actsData || [])
  }

  async function saveSettings() {
    setSaving(true)
    setSaved(false)
    await Promise.all([
      supabase.from('settings').update({ value: appName, updated_at: new Date().toISOString() }).eq('key', 'app_name'),
      supabase.from('settings').update({ value: threshold, updated_at: new Date().toISOString() }).eq('key', 'at_risk_threshold'),
    ])
    setSaving(false)
    setSaved(true)
  }

  async function saveEmail() {
    await supabase.from('settings').update({ value: adminEmail, updated_at: new Date().toISOString() }).eq('key', 'admin_email')
    setEmailSaved(true)
  }

  async function addActivity() {
    if (!newActivity.trim()) return
    setAdding(true)
    await supabase.from('daily_activities').insert({ name: newActivity.trim(), is_salaah: newIsSalaah, is_active: true })
    setNewActivity('')
    setNewIsSalaah(false)
    loadAll()
    setAdding(false)
  }

  async function toggleActivity(id: string, current: boolean) {
    await supabase.from('daily_activities').update({ is_active: !current }).eq('id', id)
    loadAll()
  }

  async function deleteActivity(id: string) {
    if (!confirm('Delete this activity?')) return
    await supabase.from('daily_activities').delete().eq('id', id)
    loadAll()
  }

  const salaahActs = activities.filter(a => a.is_salaah)
  const customActs = activities.filter(a => !a.is_salaah)
  const activeCustom = customActs.filter(a => a.is_active).length

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
        .wrap { max-width:720px; margin:0 auto; padding:28px 32px; display:flex; flex-direction:column; gap:16px; }
        .section { background:#fff; border:1px solid #EFEFED; border-radius:14px; overflow:hidden; }
        .section-head { padding:16px 20px; border-bottom:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; }
        .section-title { font-size:13px; font-weight:500; color:#1A1A1A; }
        .section-sub { font-size:11px; color:#AAA; margin-top:2px; }
        .section-body { padding:20px; display:flex; flex-direction:column; gap:14px; }
        .field-group { display:flex; flex-direction:column; gap:5px; }
        .field-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .field-hint { font-size:11px; color:#AAA; }
        .field-input { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; width:100%; }
        .field-input:focus { border-color:#1A1A1A; }
        .field-input::placeholder { color:#CCC; }
        .range-row { display:flex; align-items:center; gap:12px; }
        .range-input { flex:1; accent-color:#1A1A1A; }
        .range-value { font-size:22px; font-weight:500; color:#1A1A1A; min-width:52px; text-align:right; }
        .save-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; align-self:flex-start; }
        .save-btn:hover { background:#333; }
        .save-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .save-btn.success { background:#15803D; }

        /* Activities */
        .act-group-label { font-size:11px; font-weight:500; color:#AAA; text-transform:uppercase; letter-spacing:0.05em; padding:12px 20px 8px; display:flex; align-items:center; justify-content:space-between; }
        .act-count { background:#F5F5F3; color:#AAA; font-size:10px; padding:2px 7px; border-radius:8px; }
        .act-row { display:flex; align-items:center; justify-content:space-between; padding:10px 20px; border-top:1px solid #F8F8F6; transition:background 0.15s; }
        .act-row:hover { background:#FAFAF8; }
        .act-left { display:flex; align-items:center; gap:10px; }
        .act-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .act-name { font-size:13px; color:#1A1A1A; font-weight:500; }
        .act-type { font-size:10px; color:#AAA; margin-top:1px; }
        .act-actions { display:flex; align-items:center; gap:6px; }
        .toggle-btn { font-size:11px; padding:4px 10px; border-radius:7px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:500; transition:all 0.15s; }
        .toggle-active { background:#F0FDF4; color:#15803D; }
        .toggle-active:hover { background:#DCFCE7; }
        .toggle-inactive { background:#F5F5F3; color:#AAA; }
        .toggle-inactive:hover { background:#EBEBEB; }
        .del-btn { font-size:11px; padding:4px 9px; border-radius:7px; border:1px solid #EFEFED; background:#fff; color:#CCC; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .del-btn:hover { background:#FEF2F2; color:#DC2626; border-color:#FECACA; }
        .fixed-badge { font-size:10px; color:#CCC; background:#F5F5F3; padding:3px 8px; border-radius:6px; }
        .add-row { padding:16px 20px; border-top:1px solid #F5F5F3; display:flex; gap:8px; align-items:center; }
        .add-input { flex:1; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .add-input:focus { border-color:#1A1A1A; }
        .add-input::placeholder { color:#CCC; }
        .type-toggle { display:flex; border-radius:8px; overflow:hidden; border:1px solid #EFEFED; flex-shrink:0; }
        .type-btn { padding:0 12px; height:38px; font-size:12px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; border:none; transition:all 0.15s; white-space:nowrap; }
        .type-btn.active-type { background:#1A1A1A; color:white; }
        .type-btn:not(.active-type) { background:#fff; color:#AAA; }
        .add-btn { height:38px; background:#1A1A1A; color:white; border:none; border-radius:9px; padding:0 16px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; white-space:nowrap; flex-shrink:0; }
        .add-btn:hover { background:#333; }
        .add-btn:disabled { opacity:0.5; cursor:not-allowed; }

        /* Email */
        .email-row { display:flex; gap:8px; }
        .email-input { flex:1; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .email-input:focus { border-color:#1A1A1A; }
        .email-input::placeholder { color:#CCC; }

        /* Stats row */
        .stats-mini { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:16px 20px; border-bottom:1px solid #F5F5F3; }
        .stat-mini { text-align:center; }
        .stat-mini-n { font-size:20px; font-weight:500; color:#1A1A1A; }
        .stat-mini-l { font-size:10px; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }
        @media (max-width:768px) {
          .wrap { padding:16px; }
          .stats-mini { grid-template-columns:1fr 1fr; }
          .topbar { padding:0 16px; }
        }
      `}</style>

      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => router.push('/admin')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <span className="divider">|</span>
          <span className="page-title">Settings</span>
        </div>
      </div>

      <div className="wrap">

        {/* General */}
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">General</div>
              <div className="section-sub">App name and at-risk configuration</div>
            </div>
          </div>
          <div className="section-body">
            <div className="field-group">
              <label className="field-label">App name</label>
              <input className="field-input" value={appName} onChange={e => { setAppName(e.target.value); setSaved(false) }} placeholder="e.g. Learner Monitor" />
            </div>
            <div className="field-group">
              <label className="field-label">At-risk threshold</label>
              <span className="field-hint">Learners below this attendance percentage will be flagged as at-risk</span>
              <div className="range-row">
                <input
                  type="range" min="50" max="90" value={threshold}
                  onChange={e => { setThreshold(e.target.value); setSaved(false) }}
                  className="range-input"
                />
                <span className="range-value">{threshold}%</span>
              </div>
            </div>
            <button
              className={`save-btn ${saved ? 'success' : ''}`}
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save settings'}
            </button>
          </div>
        </div>

        {/* Daily Activities */}
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">Daily Activities</div>
              <div className="section-sub">Baskan tracks attendance for these activities</div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-mini">
            <div className="stat-mini">
              <div className="stat-mini-n">{salaahActs.length}</div>
              <div className="stat-mini-l">Salaah</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-n">{activeCustom}</div>
              <div className="stat-mini-l">Active custom</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-n">{customActs.length}</div>
              <div className="stat-mini-l">Total custom</div>
            </div>
          </div>

          {/* Salaah */}
          <div className="act-group-label">
            Daily Salaah
            <span className="act-count">{salaahActs.length} fixed</span>
          </div>
          {salaahActs.map(a => (
            <div key={a.id} className="act-row">
              <div className="act-left">
                <div className="act-dot" style={{ background: '#22C55E' }} />
                <div>
                  <div className="act-name">{a.name}</div>
                  <div className="act-type">Salaah · Always active</div>
                </div>
              </div>
              <span className="fixed-badge">Fixed</span>
            </div>
          ))}

          {/* Custom */}
          <div className="act-group-label" style={{ marginTop: 8 }}>
            Custom Activities
            <span className="act-count">{customActs.length}</span>
          </div>
          {customActs.length === 0 ? (
            <div style={{ padding: '16px 20px', fontSize: '13px', color: '#CCC', borderTop: '1px solid #F8F8F6' }}>
              No custom activities yet — add one below.
            </div>
          ) : (
            customActs.map(a => (
              <div key={a.id} className="act-row">
                <div className="act-left">
                  <div className="act-dot" style={{ background: a.is_active ? '#3B82F6' : '#E5E5E5' }} />
                  <div>
                    <div className="act-name" style={{ color: a.is_active ? '#1A1A1A' : '#AAA' }}>{a.name}</div>
                    <div className="act-type">Custom activity</div>
                  </div>
                </div>
                <div className="act-actions">
                  <button
                    className={`toggle-btn ${a.is_active ? 'toggle-active' : 'toggle-inactive'}`}
                    onClick={() => toggleActivity(a.id, a.is_active)}
                  >
                    {a.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button className="del-btn" onClick={() => deleteActivity(a.id)}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Add new */}
          <div className="add-row">
            <input
              className="add-input"
              value={newActivity}
              onChange={e => setNewActivity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addActivity()}
              placeholder="e.g. Breakfast, Study time, Sports..."
            />
            <div className="type-toggle">
              <button
                className={`type-btn ${!newIsSalaah ? 'active-type' : ''}`}
                onClick={() => setNewIsSalaah(false)}
              >
                Custom
              </button>
              <button
                className={`type-btn ${newIsSalaah ? 'active-type' : ''}`}
                onClick={() => setNewIsSalaah(true)}
              >
                Salaah
              </button>
            </div>
            <button className="add-btn" onClick={addActivity} disabled={adding}>
              {adding ? 'Adding...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Admin email */}
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">Alert Email</div>
              <div className="section-sub">At-risk learner alerts will be sent to this address</div>
            </div>
          </div>
          <div className="section-body">
            <div className="field-group">
              <label className="field-label">Admin email</label>
              <div className="email-row">
                <input
                  className="email-input"
                  type="email"
                  value={adminEmail}
                  onChange={e => { setAdminEmail(e.target.value); setEmailSaved(false) }}
                  placeholder="admin@example.com"
                />
                <button
                  className={`save-btn ${emailSaved ? 'success' : ''}`}
                  onClick={saveEmail}
                >
                  {emailSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}