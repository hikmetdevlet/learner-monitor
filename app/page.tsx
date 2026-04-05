'use client'
import { useState } from 'react'
import { createClient } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Invalid email or password'); setLoading(false); return }

    const { data: userData } = await supabase
      .from('users').select('role').eq('auth_id', data.user.id).single()

    if (userData?.role === 'admin') router.push('/admin')
    else if (userData?.role === 'teacher') router.push('/teacher')
    else if (userData?.role === 'baskan') router.push('/baskan')
    else if (userData?.role === 'islamic_teacher') router.push('/islamic-teacher')
    else if (userData?.role === 'etutor') router.push('/etutor')
    else setError('User role not found. Contact admin.')

    setLoading(false)
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: "'DM Sans', sans-serif",
      background: '#f8f7f4',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Serif+Display&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-left {
          width: 420px;
          min-height: 100vh;
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: -100px;
          left: -100px;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%);
        }

        .login-left::after {
          content: '';
          position: absolute;
          bottom: -80px;
          right: -80px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%);
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          background: #22c55e;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          color: #ffffff;
          line-height: 1.2;
          margin-top: 48px;
        }

        .brand-tagline {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin-top: 12px;
          line-height: 1.6;
          font-weight: 300;
        }

        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 48px;
        }

        .stat-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 500;
          color: #22c55e;
        }

        .stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          margin-top: 4px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .bottom-text {
          font-size: 12px;
          color: rgba(255,255,255,0.2);
        }

        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .login-form-wrap {
          width: 100%;
          max-width: 380px;
        }

        .form-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #22c55e;
          margin-bottom: 8px;
        }

        .form-title {
          font-family: 'DM Serif Display', serif;
          font-size: 32px;
          color: #1a1a1a;
          margin-bottom: 8px;
        }

        .form-subtitle {
          font-size: 14px;
          color: #888;
          margin-bottom: 40px;
          font-weight: 300;
        }

        .input-group { margin-bottom: 20px; }

        .input-label {
          font-size: 12px;
          font-weight: 500;
          color: #555;
          margin-bottom: 8px;
          display: block;
        }

        .input-field {
          width: 100%;
          height: 48px;
          border: 1.5px solid #e5e5e5;
          border-radius: 10px;
          padding: 0 16px;
        }

        .input-field:focus {
          border-color: #22c55e;
          outline: none;
        }

        .error-box {
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px;
          color: #dc2626;
          margin-bottom: 20px;
        }

        .submit-btn {
          width: 100%;
          height: 50px;
          background: #1a1a1a;
          color: white;
          border-radius: 10px;
          cursor: pointer;
          border: none;
        }

        .submit-btn:hover { background: #22c55e; }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 28px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #e5e5e5;
        }

        .divider-text {
          font-size: 11px;
          color: #bbb;
        }

        .role-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .role-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          background: #f5f5f5;
          border: 1px solid #e5e5e5;
        }

        @media (max-width: 768px) {
          .login-left { display: none; }
        }
      `}</style>

      {/* LEFT */}
      <div className="login-left">
        <div>
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="1.5"/>
              <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>

          <h1 className="brand-name">Learner<br />Monitor</h1>

          <p className="brand-tagline">
            A comprehensive platform for tracking academic progress, holistic education, and daily attendance.
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat-card"><div className="stat-value">4</div><div className="stat-label">User roles</div></div>
          <div className="stat-card"><div className="stat-value">2</div><div className="stat-label">Programs</div></div>
          <div className="stat-card"><div className="stat-value">5</div><div className="stat-label">Daily Sessions</div></div>
          <div className="stat-card"><div className="stat-value">∞</div><div className="stat-label">Topics</div></div>
        </div>

        <p className="bottom-text">
          Secure · Private · Built for modern learning environments
        </p>
      </div>

      {/* RIGHT */}
      <div className="login-right">
        <div className="login-form-wrap">
          <p className="form-eyebrow">Welcome back</p>
          <h2 className="form-title">Sign in to<br />your account</h2>
          <p className="form-subtitle">Enter your credentials to continue</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required />
            </div>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">ACCESS LEVELS</span>
            <div className="divider-line" />
          </div>

          <div className="role-badges">
            <span className="role-badge">Admin</span>
            <span className="role-badge">Teacher</span>
            <span className="role-badge">Holistic Teacher</span>
            <span className="role-badge">Baskan</span>
            <span className="role-badge">E-Tutor</span>
          </div>
        </div>
      </div>
    </main>
  )
}