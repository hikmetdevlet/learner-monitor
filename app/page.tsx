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
          pointer-events: none;
        }

        .login-left::after {
          content: '';
          position: absolute;
          bottom: -80px;
          right: -80px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          background: #22c55e;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
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
          line-height: 1.6;
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
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .form-subtitle {
          font-size: 14px;
          color: #888;
          margin-bottom: 40px;
          font-weight: 300;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #555;
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }

        .input-field {
          width: 100%;
          height: 48px;
          border: 1.5px solid #e5e5e5;
          border-radius: 10px;
          padding: 0 16px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #1a1a1a;
          background: #ffffff;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-field:focus {
          border-color: #22c55e;
        }

        .input-field::placeholder {
          color: #bbb;
        }

        .error-box {
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: #dc2626;
          margin-bottom: 20px;
        }

        .submit-btn {
          width: 100%;
          height: 50px;
          background: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.02em;
        }

        .submit-btn:hover:not(:disabled) {
          background: #22c55e;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn .arrow {
          transition: transform 0.2s;
        }

        .submit-btn:hover .arrow {
          transform: translateX(3px);
        }

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
          letter-spacing: 0.04em;
        }

        .role-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .role-badge {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          background: #f5f5f5;
          color: #888;
          border: 1px solid #e5e5e5;
        }

        @media (max-width: 768px) {
          .login-left { display: none; }
          .login-right { padding: 32px 24px; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-form-wrap { animation: fadeUp 0.5s ease forwards; }
      `}</style>

      {/* Left panel */}
      <div className="login-left">
        <div>
          <div className="brand-mark">🕌</div>
          <h1 className="brand-name">Learner<br />Monitor</h1>
          <p className="brand-tagline">A comprehensive platform for tracking academic progress, Islamic education, and daily attendance.</p>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">4</div>
            <div className="stat-label">User roles</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">2</div>
            <div className="stat-label">Programs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">5</div>
            <div className="stat-label">Daily Salaah</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">∞</div>
            <div className="stat-label">Topics</div>
          </div>
        </div>

        <p className="bottom-text">Secure · Private · Built for Islamic schools</p>
      </div>

      {/* Right panel */}
      <div className="login-right">
        <div className="login-form-wrap">
          <p className="form-eyebrow">Welcome back</p>
          <h2 className="form-title">Sign in to<br />your account</h2>
          <p className="form-subtitle">Enter your credentials to continue</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
              />
            </div>

            {error && <div className="error-box">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : (
                <>Sign in <span className="arrow">→</span></>
              )}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">ACCESS LEVELS</span>
            <div className="divider-line" />
          </div>

          <div className="role-badges">
            <span className="role-badge">🛡️ Admin</span>
            <span className="role-badge">📚 Teacher</span>
            <span className="role-badge">🕌 Islamic Teacher</span>
            <span className="role-badge">👤 Baskan</span>
          </div>
        </div>
      </div>
    </main>
  )
}