import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left — brand panel */}
      <div style={{
        width: 420, flexShrink: 0, background: 'var(--purple)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 40px',
      }}>
        <img
          src="/fortress_full_logo.png"
          alt="Fortress Technology"
          style={{ width: 220, height: 'auto', objectFit: 'contain', marginBottom: 36 }}
        />
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, textAlign: 'center', marginBottom: 10, letterSpacing: -0.3 }}>
          Tradeshow Tracker
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, textAlign: 'center', lineHeight: 1.7 }}>
          Centralized portal for managing tradeshow events, systems, shipping and supplies.
        </p>
        <div style={{ marginTop: 'auto', paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            Need access? Contact your administrator.
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, background: 'var(--bg)',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {mode === 'login' ? (
            <>
              <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 5 }}>Sign in</h1>
              <p className="muted" style={{ fontSize: 13, marginBottom: 26 }}>Enter your credentials to continue</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div className="field">
                  <label className="lbl">Email</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@fortress.com" required autoFocus />
                </div>
                <div className="field">
                  <label className="lbl">Password</label>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
                <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', padding: '10px 14px', marginTop: 2 }}>
                  {loading ? <span className="spin spin-white" /> : 'Sign In'}
                </button>
              </form>
              <button onClick={() => { setMode('reset'); setError('') }}
                style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', fontSize: 13, fontWeight: 500, padding: 0 }}>
                Forgot password?
              </button>
              <div style={{ marginTop: 24, padding: '13px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, boxShadow: 'var(--shadow)' }}>
                Don't have an account? Contact your system administrator to request access.
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setMode('login'); setError(''); setResetSent(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, marginBottom: 20, padding: 0 }}>
                ← Back to sign in
              </button>
              <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 5 }}>Reset password</h1>
              <p className="muted" style={{ fontSize: 13, marginBottom: 26 }}>We'll send a reset link to your email.</p>
              {resetSent ? (
                <div className="info-box">Reset link sent to <strong>{email}</strong>. Check your inbox.</div>
              ) : (
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div className="field">
                    <label className="lbl">Email</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@fortress.com" required autoFocus />
                  </div>
                  {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
                  <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', padding: '10px 14px' }}>
                    {loading ? <span className="spin spin-white" /> : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
