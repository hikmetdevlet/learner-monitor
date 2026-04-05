'use client'
import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Activity = { id: string; name: string; is_salaah: boolean; is_active: boolean }

const AI_PROVIDERS = [
  {
    key: 'anthropic',
    label: 'Anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'],
    placeholder: 'sk-ant-api03-...',
    hint: 'console.anthropic.com → API Keys',
  },
  {
    key: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    placeholder: 'sk-proj-...',
    hint: 'platform.openai.com → API Keys',
  },
  {
    key: 'google',
    label: 'Google',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    placeholder: 'AIza...',
    hint: 'aistudio.google.com → Get API Key',
  },
]

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

  // AI state
  const [aiEnabled, setAiEnabled]         = useState(true)
  const [aiProvider, setAiProvider]       = useState('anthropic')
  const [aiModel, setAiModel]             = useState('claude-sonnet-4-20250514')
  const [aiApiKey, setAiApiKey]           = useState('')
  const [aiQuestionCount, setAiQuestionCount] = useState('5')
  const [showKey, setShowKey]             = useState(false)
  const [aiSaving, setAiSaving]           = useState(false)
  const [aiSaved, setAiSaved]             = useState(false)
  const [testLoading, setTestLoading]     = useState(false)
  const [testResult, setTestResult]       = useState<{ ok: boolean; msg: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: settingsData }, { data: actsData }] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('daily_activities').select('*').order('is_salaah', { ascending: false }).order('name'),
    ])
    settingsData?.forEach(s => {
      if (s.key === 'app_name')           setAppName(s.value)
      if (s.key === 'at_risk_threshold')  setThreshold(s.value)
      if (s.key === 'admin_email')        setAdminEmail(s.value || '')
      if (s.key === 'ai_enabled')         setAiEnabled(s.value !== 'false')
      if (s.key === 'ai_provider')        setAiProvider(s.value || 'anthropic')
      if (s.key === 'ai_model')           setAiModel(s.value || 'claude-sonnet-4-20250514')
      if (s.key === 'ai_api_key')         setAiApiKey(s.value || '')
      if (s.key === 'ai_question_count')  setAiQuestionCount(s.value || '5')
    })
    setActivities(actsData || [])
  }

  async function saveSettings() {
    setSaving(true); setSaved(false)
    await Promise.all([
      supabase.from('settings').update({ value: appName, updated_at: new Date().toISOString() }).eq('key', 'app_name'),
      supabase.from('settings').update({ value: threshold, updated_at: new Date().toISOString() }).eq('key', 'at_risk_threshold'),
    ])
    setSaving(false); setSaved(true)
  }

  async function saveEmail() {
    await supabase.from('settings').update({ value: adminEmail, updated_at: new Date().toISOString() }).eq('key', 'admin_email')
    setEmailSaved(true)
  }

  async function saveAI() {
    setAiSaving(true); setAiSaved(false); setTestResult(null)
    await Promise.all([
      supabase.from('settings').upsert({ key: 'ai_enabled',        value: aiEnabled ? 'true' : 'false' }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'ai_provider',       value: aiProvider },                   { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'ai_model',          value: aiModel },                      { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'ai_api_key',        value: aiApiKey.trim() },              { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'ai_question_count', value: aiQuestionCount },              { onConflict: 'key' }),
    ])
    setAiSaving(false); setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2500)
  }

  async function testConnection() {
    setTestLoading(true); setTestResult(null)
    try {
      const res = await fetch('/api/quiz/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aiProvider, model: aiModel, apiKey: aiApiKey }),
      })
      const data = await res.json()
      setTestResult(res.ok
        ? { ok: true,  msg: 'Connection successful — AI is ready.' }
        : { ok: false, msg: data.error || 'Connection failed.' }
      )
    } catch {
      setTestResult({ ok: false, msg: 'Network error — could not reach the API.' })
    }
    setTestLoading(false)
  }

  function handleProviderChange(p: string) {
    setAiProvider(p)
    const prov = AI_PROVIDERS.find(x => x.key === p)
    if (prov) setAiModel(prov.models[0])
    setTestResult(null)
  }

  async function addActivity() {
    if (!newActivity.trim()) return
    setAdding(true)
    await supabase.from('daily_activities').insert({ name: newActivity.trim(), is_salaah: newIsSalaah, is_active: true })
    setNewActivity(''); setNewIsSalaah(false)
    loadAll(); setAdding(false)
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

  const salaahActs   = activities.filter(a => a.is_salaah)
  const customActs   = activities.filter(a => !a.is_salaah)
  const activeCustom = customActs.filter(a => a.is_active).length
  const currentProv  = AI_PROVIDERS.find(p => p.key === aiProvider) || AI_PROVIDERS[0]

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
        .section-footer { padding:14px 20px; border-top:1px solid #F5F5F3; display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .field-group { display:flex; flex-direction:column; gap:5px; }
        .field-label { font-size:11px; font-weight:500; color:#888; text-transform:uppercase; letter-spacing:0.04em; }
        .field-hint { font-size:11px; color:#AAA; }
        .field-input { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; width:100%; }
        .field-input:focus { border-color:#1A1A1A; }
        .field-input::placeholder { color:#CCC; }
        .range-row { display:flex; align-items:center; gap:12px; }
        .range-input { flex:1; accent-color:#1A1A1A; }
        .range-value { font-size:22px; font-weight:500; color:#1A1A1A; min-width:52px; text-align:right; }
        .save-btn { background:#1A1A1A; color:white; border:none; border-radius:9px; padding:9px 20px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; align-self:flex-start; white-space:nowrap; }
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
        .email-row { display:flex; gap:8px; }
        .email-input { flex:1; height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; transition:border-color 0.15s; }
        .email-input:focus { border-color:#1A1A1A; }
        .email-input::placeholder { color:#CCC; }
        .stats-mini { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; padding:16px 20px; border-bottom:1px solid #F5F5F3; }
        .stat-mini { text-align:center; }
        .stat-mini-n { font-size:20px; font-weight:500; color:#1A1A1A; }
        .stat-mini-l { font-size:10px; color:#AAA; text-transform:uppercase; letter-spacing:0.04em; margin-top:2px; }

        /* ── AI Section ── */
        .sep { height:1px; background:#F5F5F3; }
        .provider-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .prov-btn { border:1.5px solid #EFEFED; border-radius:10px; padding:10px 12px; background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; text-align:left; transition:all 0.15s; }
        .prov-btn:hover { border-color:#DDD; background:#FAFAF8; }
        .prov-btn.prov-on { border-color:#1A1A1A; background:#1A1A1A; }
        .prov-name { font-size:12px; font-weight:600; color:#333; }
        .prov-btn.prov-on .prov-name { color:#fff; }
        .prov-sub { font-size:10px; color:#AAA; margin-top:2px; }
        .prov-btn.prov-on .prov-sub { color:rgba(255,255,255,0.55); }
        .model-sel { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 12px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A1A; background:#fff; outline:none; width:100%; cursor:pointer; transition:border-color 0.15s; }
        .model-sel:focus { border-color:#1A1A1A; }
        .key-wrap { position:relative; }
        .key-input { height:38px; border:1px solid #EFEFED; border-radius:9px; padding:0 38px 0 12px; font-size:12px; font-family:'SF Mono','Fira Code',monospace; color:#1A1A1A; background:#fff; outline:none; width:100%; transition:border-color 0.15s; letter-spacing:0.02em; }
        .key-input:focus { border-color:#1A1A1A; }
        .key-input::placeholder { color:#CCC; font-family:'DM Sans',sans-serif; font-size:13px; letter-spacing:0; }
        .key-eye { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#BBB; padding:4px; display:flex; align-items:center; transition:color 0.15s; }
        .key-eye:hover { color:#666; }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; }
        .toggle-info { display:flex; flex-direction:column; gap:2px; }
        .toggle-label { font-size:13px; font-weight:500; color:#1A1A1A; }
        .toggle-sub { font-size:11px; color:#AAA; }
        .sw { position:relative; width:40px; height:22px; flex-shrink:0; }
        .sw input { opacity:0; width:0; height:0; position:absolute; }
        .sw-track { position:absolute; inset:0; background:#E5E5E3; border-radius:11px; cursor:pointer; transition:background 0.2s; }
        .sw input:checked + .sw-track { background:#1A1A1A; }
        .sw-thumb { position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.2); transition:transform 0.2s; pointer-events:none; }
        .sw input:checked ~ .sw-thumb { transform:translateX(18px); }
        .stepper { display:flex; align-items:center; border:1px solid #EFEFED; border-radius:9px; overflow:hidden; width:fit-content; }
        .step-btn { width:34px; height:38px; background:#FAFAF8; border:none; cursor:pointer; font-size:16px; color:#666; display:flex; align-items:center; justify-content:center; transition:background 0.15s; font-family:'DM Sans',sans-serif; }
        .step-btn:hover { background:#F0F0EE; }
        .step-val { width:46px; height:38px; text-align:center; font-size:14px; font-weight:600; color:#1A1A1A; border:none; border-left:1px solid #EFEFED; border-right:1px solid #EFEFED; font-family:'DM Sans',sans-serif; outline:none; background:#fff; }
        .test-btn { display:flex; align-items:center; gap:6px; background:#F0F9FF; color:#1D4ED8; border:1px solid #BFDBFE; border-radius:9px; padding:8px 14px; font-size:13px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; white-space:nowrap; }
        .test-btn:hover { background:#DBEAFE; }
        .test-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .test-ok { font-size:12px; color:#15803D; background:#F0FDF4; border:1px solid #BBF7D0; padding:9px 12px; border-radius:9px; display:flex; align-items:center; gap:7px; }
        .test-fail { font-size:12px; color:#DC2626; background:#FEF2F2; border:1px solid #FECACA; padding:9px 12px; border-radius:9px; display:flex; align-items:center; gap:7px; }
        .info-box { background:#F0F9FF; border:1px solid #BFDBFE; border-radius:10px; padding:11px 14px; font-size:12px; color:#1D4ED8; display:flex; align-items:flex-start; gap:8px; line-height:1.6; }
        .saved-msg { font-size:12px; color:#15803D; background:#F0FDF4; padding:6px 12px; border-radius:8px; display:flex; align-items:center; gap:5px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spin { width:12px; height:12px; border:2px solid #93C5FD; border-top-color:#1D4ED8; border-radius:50%; animation:spin 0.8s linear infinite; display:inline-block; }

        @media (max-width:768px) {
          .wrap { padding:16px; }
          .stats-mini { grid-template-columns:1fr 1fr; }
          .topbar { padding:0 16px; }
          .provider-grid { grid-template-columns:1fr 1fr 1fr; }
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

        {/* ── General ── */}
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
                <input type="range" min="50" max="90" value={threshold} onChange={e => { setThreshold(e.target.value); setSaved(false) }} className="range-input" />
                <span className="range-value">{threshold}%</span>
              </div>
            </div>
            <button className={`save-btn ${saved ? 'success' : ''}`} onClick={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save settings'}
            </button>
          </div>
        </div>

        {/* ── AI Question Generator ── */}
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">AI Question Generator</div>
              <div className="section-sub">Provider and API key used to generate quiz questions</div>
            </div>
          </div>

          <div className="section-body">

            {/* Enable toggle */}
            <div className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label">Enable AI Generation</span>
                <span className="toggle-sub">Teachers can generate questions using AI</span>
              </div>
              <label className="sw">
                <input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} />
                <div className="sw-track" />
                <div className="sw-thumb" />
              </label>
            </div>

            {aiEnabled && (
              <>
                <div className="sep" />

                {/* Provider */}
                <div className="field-group">
                  <label className="field-label">Provider</label>
                  <div className="provider-grid">
                    {AI_PROVIDERS.map(p => (
                      <button key={p.key} className={`prov-btn ${aiProvider === p.key ? 'prov-on' : ''}`} onClick={() => handleProviderChange(p.key)}>
                        <div className="prov-name">{p.label}</div>
                        <div className="prov-sub">{p.models.length} models</div>
                      </button>
                    ))}
                  </div>
                  <span className="field-hint">When a provider's limit runs out, switch here and enter a new key — no code changes needed</span>
                </div>

                {/* Model */}
                <div className="field-group">
                  <label className="field-label">Model</label>
                  <select className="model-sel" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                    {currentProv.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* API Key */}
                <div className="field-group">
                  <label className="field-label">{currentProv.label} API Key</label>
                  <div className="key-wrap">
                    <input
                      className="key-input"
                      type={showKey ? 'text' : 'password'}
                      value={aiApiKey}
                      onChange={e => { setAiApiKey(e.target.value); setTestResult(null) }}
                      placeholder={currentProv.placeholder}
                    />
                    <button className="key-eye" onClick={() => setShowKey(v => !v)}>
                      {showKey
                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  <span className="field-hint">{currentProv.hint}</span>
                </div>

                {/* Test result */}
                {testResult && (
                  <div className={testResult.ok ? 'test-ok' : 'test-fail'}>
                    {testResult.ok
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    }
                    {testResult.msg}
                  </div>
                )}

                <div className="sep" />

                {/* Question count */}
                <div className="field-group">
                  <label className="field-label">Questions per quiz</label>
                  <div className="stepper">
                    <button className="step-btn" onClick={() => setAiQuestionCount(v => String(Math.max(3, parseInt(v) - 1)))}>−</button>
                    <input className="step-val" type="number" value={aiQuestionCount} onChange={e => setAiQuestionCount(e.target.value)} min={3} max={20} />
                    <button className="step-btn" onClick={() => setAiQuestionCount(v => String(Math.min(20, parseInt(v) + 1)))}>+</button>
                  </div>
                  <span className="field-hint">Default number of questions generated per topic</span>
                </div>

                {/* Info */}
                <div className="info-box">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>API keys are stored in your database. Limit bitti mi? Provider değiştir → yeni key gir → Save. Kod değişikliği veya deployment gerekmez.</span>
                </div>
              </>
            )}
          </div>

          <div className="section-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {aiSaved && (
                <span className="saved-msg">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved
                </span>
              )}
              {aiEnabled && (
                <button className="test-btn" onClick={testConnection} disabled={testLoading || !aiApiKey.trim()}>
                  {testLoading ? <><span className="spin" /> Testing...</> : <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Test Connection
                  </>}
                </button>
              )}
            </div>
            <button className="save-btn" onClick={saveAI} disabled={aiSaving}>
              {aiSaving ? 'Saving...' : 'Save AI settings'}
            </button>
          </div>
        </div>

        {/* ── Daily Activities ── */}
        <div className="section">
          <div className="section-head">
            <div>
              <div className="section-title">Daily Activities</div>
              <div className="section-sub">Baskan tracks attendance for these activities</div>
            </div>
          </div>
          <div className="stats-mini">
            <div className="stat-mini"><div className="stat-mini-n">{salaahActs.length}</div><div className="stat-mini-l">Salaah</div></div>
            <div className="stat-mini"><div className="stat-mini-n">{activeCustom}</div><div className="stat-mini-l">Active custom</div></div>
            <div className="stat-mini"><div className="stat-mini-n">{customActs.length}</div><div className="stat-mini-l">Total custom</div></div>
          </div>
          <div className="act-group-label">Daily Salaah <span className="act-count">{salaahActs.length} fixed</span></div>
          {salaahActs.map(a => (
            <div key={a.id} className="act-row">
              <div className="act-left">
                <div className="act-dot" style={{ background: '#22C55E' }} />
                <div><div className="act-name">{a.name}</div><div className="act-type">Salaah · Always active</div></div>
              </div>
              <span className="fixed-badge">Fixed</span>
            </div>
          ))}
          <div className="act-group-label" style={{ marginTop: 8 }}>Custom Activities <span className="act-count">{customActs.length}</span></div>
          {customActs.length === 0 ? (
            <div style={{ padding: '16px 20px', fontSize: '13px', color: '#CCC', borderTop: '1px solid #F8F8F6' }}>No custom activities yet — add one below.</div>
          ) : customActs.map(a => (
            <div key={a.id} className="act-row">
              <div className="act-left">
                <div className="act-dot" style={{ background: a.is_active ? '#3B82F6' : '#E5E5E5' }} />
                <div>
                  <div className="act-name" style={{ color: a.is_active ? '#1A1A1A' : '#AAA' }}>{a.name}</div>
                  <div className="act-type">Custom activity</div>
                </div>
              </div>
              <div className="act-actions">
                <button className={`toggle-btn ${a.is_active ? 'toggle-active' : 'toggle-inactive'}`} onClick={() => toggleActivity(a.id, a.is_active)}>
                  {a.is_active ? 'Active' : 'Inactive'}
                </button>
                <button className="del-btn" onClick={() => deleteActivity(a.id)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>
          ))}
          <div className="add-row">
            <input className="add-input" value={newActivity} onChange={e => setNewActivity(e.target.value)} onKeyDown={e => e.key === 'Enter' && addActivity()} placeholder="e.g. Breakfast, Study time, Sports..." />
            <div className="type-toggle">
              <button className={`type-btn ${!newIsSalaah ? 'active-type' : ''}`} onClick={() => setNewIsSalaah(false)}>Custom</button>
              <button className={`type-btn ${newIsSalaah ? 'active-type' : ''}`} onClick={() => setNewIsSalaah(true)}>Salaah</button>
            </div>
            <button className="add-btn" onClick={addActivity} disabled={adding}>{adding ? 'Adding...' : '+ Add'}</button>
          </div>
        </div>

        {/* ── Alert Email ── */}
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
                <input className="email-input" type="email" value={adminEmail} onChange={e => { setAdminEmail(e.target.value); setEmailSaved(false) }} placeholder="admin@example.com" />
                <button className={`save-btn ${emailSaved ? 'success' : ''}`} onClick={saveEmail}>{emailSaved ? '✓ Saved' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}