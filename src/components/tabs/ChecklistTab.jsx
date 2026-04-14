import { useEffect, useState, useRef } from 'react'
import { Plus, X, CheckSquare } from 'lucide-react'
import { useRefreshTick } from '../../context/RefreshContext'
import { supabase, logAudit } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function ChecklistTab({ showId }) {
  const tick = useRefreshTick()
  const [items, setItems] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [submittedBy, setSubmittedBy] = useState('')
  const [submittedAt, setSubmittedAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const { isAdmin, user } = useAuth()
  // Track whether a DB row exists yet
  const hasRow = useRef(false)

  useEffect(() => { init() }, [showId, tick])

  async function init() {
    const { data: cl } = await supabase.from('show_checklists')
      .select('*').eq('tradeshow_id', showId).maybeSingle()

    if (cl) {
      hasRow.current = true
      setItems(cl.items || [])
      setSubmitted(cl.submitted || false)
      setSubmittedBy(cl.submitted_by || '')
      setSubmittedAt(cl.submitted_at || '')
    } else {
      hasRow.current = false
      const { data: defaults } = await supabase.from('dropdown_options')
        .select('value').eq('category', 'checklist_item').order('sort_order')
      const seeded = (defaults || []).map((d, i) => ({
        id: crypto.randomUUID(), label: d.value, checked: false, sort_order: i
      }))
      setItems(seeded)
    }
    setLoading(false)
  }

  // Persist current items to DB immediately — called after any structural change
  async function persistItems(newItems) {
    const now = new Date().toISOString()
    const payload = {
      tradeshow_id: showId,
      items: newItems,
      submitted,
      submitted_by: submittedBy,
      submitted_at: submittedAt || null,
      updated_at: now,
    }
    if (hasRow.current) {
      await supabase.from('show_checklists').update(payload).eq('tradeshow_id', showId)
    } else {
      const { error } = await supabase.from('show_checklists').insert(payload)
      if (!error) hasRow.current = true
    }
  }

  async function saveChecklist(submitNow = false) {
    setSaving(true)
    const now = new Date().toISOString()
    const payload = {
      tradeshow_id: showId,
      items,
      submitted: submitNow ? true : submitted,
      submitted_by: submitNow ? user.email : submittedBy,
      submitted_at: submitNow ? now : (submittedAt || null),
      updated_at: now,
    }
    if (hasRow.current) {
      await supabase.from('show_checklists').update(payload).eq('tradeshow_id', showId)
    } else {
      await supabase.from('show_checklists').insert(payload)
      hasRow.current = true
    }
    if (submitNow) {
      setSubmitted(true)
      setSubmittedBy(user.email)
      setSubmittedAt(now)
      await logAudit({ action: 'update', entityType: 'checklist', entityId: showId, entityLabel: 'Checklist submitted', newValue: { submitted_by: user.email } })
    } else {
      setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2000)
    }
    setSaving(false)
  }

  function toggleItem(id) {
    if (submitted) return
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item))
  }

  async function addItem(e) {
    e.preventDefault()
    if (!newLabel.trim()) return
    const newItem = { id: crypto.randomUUID(), label: newLabel.trim(), checked: false, sort_order: items.length }
    const updated = [...items, newItem]
    setItems(updated)
    setNewLabel('')
    // Immediately persist so navigation away does not lose the new item
    await persistItems(updated)
  }

  async function removeItem(id) {
    const updated = items.filter(item => item.id !== id)
    setItems(updated)
    // Immediately persist
    await persistItems(updated)
  }

  const total = items.length
  const checked = items.filter(i => i.checked).length
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spin" /></div>

  return (
    <div>
      {/* Progress bar */}
      <div className="card card-bd" style={{ marginBottom: 16 }}>
        <div className="row-sb" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{checked} of {total} items complete</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: pct === 100 ? 'var(--green)' : 'var(--text-2)' }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--green)' : 'var(--purple)', borderRadius: 3, transition: 'width 300ms ease' }} />
        </div>
      </div>

      {/* Checklist items */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-hd"><h3 className="card-title">Operational Checklist</h3></div>
        <div className="card-bd" style={{ padding: '12px 20px' }}>
          {items.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>No checklist items. Add items below or configure defaults in Settings.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                    background: item.checked ? 'rgba(26,122,80,0.05)' : 'var(--surface-2)',
                    border: `1px solid ${item.checked ? 'rgba(26,122,80,0.15)' : 'var(--border)'}`,
                    cursor: submitted ? 'default' : 'pointer',
                    transition: 'all var(--ease)',
                    opacity: submitted && !item.checked ? 0.6 : 1,
                  }}
                  onClick={() => toggleItem(item.id)}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${item.checked ? 'var(--green)' : 'var(--border)'}`,
                    background: item.checked ? 'var(--green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all var(--ease)',
                  }}>
                    {item.checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, flex: 1, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--text-3)' : 'var(--text-1)' }}>
                    {item.label}
                  </span>
                  {isAdmin && !submitted && (
                    <button
                      className="btn btn-ghost btn-sm danger"
                      onClick={e => { e.stopPropagation(); removeItem(item.id) }}
                      style={{ opacity: 0.5 }}
                      onMouseOver={e => e.currentTarget.style.opacity = '1'}
                      onMouseOut={e => e.currentTarget.style.opacity = '0.5'}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAdmin && !submitted && (
            <form onSubmit={addItem} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input
                className="input"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Add checklist item…"
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={!newLabel.trim()} style={{ flexShrink: 0 }}>
                <Plus size={13} /> Add
              </button>
            </form>
          )}
        </div>
      </div>

      {submitted ? (
        <div style={{ padding: '14px 16px', background: 'rgba(26,122,80,0.07)', border: '1px solid rgba(26,122,80,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckSquare size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--green)', margin: 0 }}>Checklist submitted</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, marginTop: 2 }}>
              By {submittedBy} · {submittedAt ? new Date(submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => saveChecklist(false)} disabled={saving}>
            {saving ? <span className="spin" /> : 'Save Progress'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!confirm('Submit the checklist? This cannot be undone — the checklist will be locked.')) return
              saveChecklist(true)
            }}
            disabled={saving || items.length === 0}
          >
            {saving ? <span className="spin spin-white" /> : 'Save & Submit'}
          </button>
          {saveMsg && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>✓ {saveMsg}</span>}
        </div>
      )}
    </div>
  )
}
