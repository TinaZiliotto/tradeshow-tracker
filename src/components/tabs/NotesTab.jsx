import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NotesTab({ showId, isEditor }) {
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [loading, setLoading] = useState(true)

  // isDirty: user has typed something that has not been saved yet
  const isDirty    = useRef(false)
  // savedNotes: last value that came from the DB — used to detect external changes
  const savedNotes = useRef('')

  useEffect(() => {
    // Initial load
    supabase.from('show_notes').select('notes').eq('tradeshow_id', showId).maybeSingle()
      .then(({ data }) => {
        const val = data?.notes || ''
        setNotes(val)
        savedNotes.current = val
        setLoading(false)
      })

    // Realtime subscription — only update if user has no unsaved changes
    const channel = supabase
      .channel(`show_notes:${showId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'show_notes',
        filter: `tradeshow_id=eq.${showId}`,
      }, payload => {
        const incoming = payload.new?.notes ?? ''
        // Only apply if user has not started typing unsaved content
        if (!isDirty.current) {
          setNotes(incoming)
          savedNotes.current = incoming
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [showId])

  function handleChange(e) {
    isDirty.current = true
    setNotes(e.target.value)
  }

  async function handleSave() {
    setSaving(true)
    const { data: existing } = await supabase.from('show_notes')
      .select('id').eq('tradeshow_id', showId).maybeSingle()
    if (existing) {
      await supabase.from('show_notes').update({ notes, updated_at: new Date().toISOString() }).eq('tradeshow_id', showId)
    } else {
      await supabase.from('show_notes').insert({ tradeshow_id: showId, notes })
    }
    savedNotes.current = notes
    isDirty.current = false
    setSaving(false)
    setSaved(true)
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
            onChange={handleChange}
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
            {isDirty.current && !saving && (
              <span style={{ fontSize: 12, color: 'var(--amber)' }}>Unsaved changes</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
