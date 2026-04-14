import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SystemPicker({ value = [], onChange }) {
  const [allSystems, setAllSystems] = useState([])
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    supabase.from('systems').select('id, equipment_name, serial_number, part_number, crate_number, location')
      .order('equipment_name').order('serial_number')
      .then(({ data }) => setAllSystems(data || []))
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedIds = new Set(value.map(s => s.id))

  const suggestions = allSystems.filter(s => {
    if (selectedIds.has(s.id)) return false
    if (!query) return true
    const q = query.toLowerCase()
    return s.equipment_name?.toLowerCase().includes(q) || s.serial_number?.toLowerCase().includes(q)
  }).slice(0, 8)

  function addSystem(sys) {
    onChange([...value, sys])
    setQuery('')
    inputRef.current?.focus()
  }

  function removeSystem(id) {
    onChange(value.filter(s => s.id !== id))
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        className={`pill-wrap ${focused ? 'focused' : ''}`}
        onClick={() => { inputRef.current?.focus(); setOpen(true) }}
      >
        {value.map(sys => (
          <span key={sys.id} className="pill">
            {sys.equipment_name}
            <span className="muted" style={{ fontSize: 11 }}>&nbsp;{sys.serial_number}</span>
            <button type="button" onClick={e => { e.stopPropagation(); removeSystem(sys.id) }}>
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="pill-input"
          placeholder={value.length === 0 ? 'Search and select systems…' : ''}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setFocused(true); setOpen(true) }}
        />
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          zIndex: 50, maxHeight: 240, overflowY: 'auto',
        }}>
          {suggestions.map(sys => (
            <div
              key={sys.id}
              onMouseDown={e => { e.preventDefault(); addSystem(sys) }}
              style={{
                padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseOut={e => e.currentTarget.style.background = ''}
            >
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{sys.equipment_name}</span>
                <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>{sys.serial_number}</span>
              </div>
              <span className="badge b-grey" style={{ fontSize: 10 }}>{sys.location}</span>
            </div>
          ))}
        </div>
      )}

      {open && query && suggestions.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
          zIndex: 50, padding: '12px', fontSize: 13, color: 'var(--text-3)',
        }}>
          No systems match "{query}"
        </div>
      )}
    </div>
  )
}
