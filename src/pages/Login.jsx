import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  const panelStyle = {
    minHeight: '100vh', display: 'flex', background: '#fff'
  }
  const leftStyle = {
    width: '420px', flexShrink: 0, background: 'var(--purple)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '48px 40px',
  }
  const rightStyle = {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '48px 40px',
    background: '#f9f9fb',
  }

  return (
    <div style={panelStyle}>
      {/* Left brand panel */}
      <div style={leftStyle}>
        <img src="/fortress_logo.png" alt="Fortress Technology" style={{ width: '200px', filter: 'brightness(0) invert(1)', marginBottom: '40px' }} />
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 600, marginBottom: '10px', letterSpacing: '-0.3px' }}>
            Tradeshow Tracker
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: 1.6 }}>
            Centralized portal for managing tradeshow events, systems, shipping and supplies.
          </p>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
            Need access? Contact your administrator.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={rightStyle}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {mode === 'login' ? (
            <>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Sign in</h1>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '28px' }}>Enter your credentials to continue</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="input-group">
                  <label className="label">Email</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@fortress.com" required autoFocus />
                </div>
                <div className="input-group">
                  <label className="label">Password</label>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
                <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', padding: '10px', marginTop: '4px' }}>
                  {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Sign In'}
                </button>
              </form>
              <button onClick={() => { setMode('reset'); setError('') }} style={{ marginTop: '18px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--purple)', fontSize: '13px', fontWeight: 500, padding: 0 }}>
                Forgot password?
              </button>
              <p style={{ marginTop: '28px', padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6, border: '1px solid var(--border)' }}>
                Don't have access? Contact your system administrator to request an account.
              </p>
            </>
          ) : (
            <>
              <button onClick={() => { setMode('login'); setError(''); setResetSent(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '13px', marginBottom: '20px', padding: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                ← Back to sign in
              </button>
              <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Reset password</h1>
              <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '28px' }}>
                Enter your email and we will send you a reset link.
              </p>
              {resetSent ? (
                <div style={{ padding: '16px', background: 'rgba(81,198,219,0.1)', border: '1px solid rgba(81,198,219,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#1a8fa0', lineHeight: 1.6 }}>
                  Reset link sent to <strong>{email}</strong>. Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="input-group">
                    <label className="label">Email</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@fortress.com" required autoFocus />
                  </div>
                  {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
                  <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center', padding: '10px' }}>
                    {loading ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Send Reset Link'}
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
