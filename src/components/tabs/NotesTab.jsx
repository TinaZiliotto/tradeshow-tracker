import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRefreshTick } from '../../context/RefreshContext'

export default function NotesTab({ showId, isEditor }) {
  const tick = useRefreshTick()
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('show_notes').select('notes').eq('tradeshow_id', showId).maybeSingle()
      .then(({ data }) => { setNotes(data?.notes || ''); setLoading(false) })
  }, [showId, tick])

  async function handleSave() {
    setSaving(true)
    const { data: existing } = await supabase.from('show_notes')
      .select('id').eq('tradeshow_id', showId).maybeSingle()
    if (existing) {
      await supabase.from('show_notes').update({ notes, updated_at: new Date().toISOString() }).eq('tradeshow_id', showId)
    } else {
      await supabase.from('show_notes').insert({ tradeshow_id: showId, notes })
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><span className="spin" /></div>

  return (
    <div>
      <div className="card card-bd">
        <div className="field">
          <label className="lbl" style={{ marginBottom: 6 }}>Show Notes</label>
          <textarea
            className="ta"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            readOnly={!isEditor}
            rows={12}
            placeholder={isEditor ? 'Add notes for this show…' : 'No notes yet.'}
            style={{ minHeight: 220, fontSize: 14, lineHeight: 1.7 }}
          />
        </div>
        {isEditor && (
          <div className="row gap-3 mt-3" style={{ alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <span className="spin spin-white" /> : 'Save Notes'}
            </button>
            {saved && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>✓ Saved</span>}
          </div>
        )}
      </div>
    </div>
  )
}
