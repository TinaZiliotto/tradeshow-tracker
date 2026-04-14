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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo on purple bg */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={{ background: 'var(--purple)', borderRadius: 14, padding: '18px 32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="/logo_full.png"
              alt="Fortress Technology"
              style={{ height: 52, width: 'auto', maxWidth: 200, objectFit: 'contain' }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {mode === 'login' ? (
            <>
              <h1 style={{ fontSize: 19, fontWeight: 600, marginBottom: 4 }}>Sign in</h1>
              <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>Tradeshow Tracker — Fortress Technology</p>
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
                style={{ marginTop: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', fontSize: 13, fontWeight: 500, padding: 0 }}>
                Forgot password?
              </button>
              <div style={{ marginTop: 20, padding: '11px 13px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
                Don't have an account? Contact your system administrator to request access.
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setMode('login'); setError(''); setResetSent(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13, marginBottom: 16, padding: 0 }}>
                ← Back to sign in
              </button>
              <h1 style={{ fontSize: 19, fontWeight: 600, marginBottom: 4 }}>Reset password</h1>
              <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>We'll send a reset link to your email.</p>
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
